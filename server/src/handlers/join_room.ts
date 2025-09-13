import { db } from '../db';
import { roomsTable, roomParticipantsTable, usersTable, goldTransactionsTable } from '../db/schema';
import { type JoinRoomInput, type RoomParticipant } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export async function joinRoom(input: JoinRoomInput, userId: number): Promise<RoomParticipant> {
  try {
    // Check if room exists and get room details
    const rooms = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, input.room_id))
      .execute();

    if (rooms.length === 0) {
      throw new Error('Room not found');
    }

    const room = rooms[0];

    // Check if room is active
    if (!room.is_active) {
      throw new Error('Room is not active');
    }

    // Check if user is already a participant
    const existingParticipants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.room_id),
        eq(roomParticipantsTable.user_id, userId)
      ))
      .execute();

    if (existingParticipants.length > 0) {
      throw new Error('User is already a participant in this room');
    }

    // Check max participants limit if set
    if (room.max_participants !== null) {
      const participantCount = await db.select({ count: count() })
        .from(roomParticipantsTable)
        .where(eq(roomParticipantsTable.room_id, input.room_id))
        .execute();

      if (participantCount[0].count >= room.max_participants) {
        throw new Error('Room has reached maximum participant limit');
      }
    }

    // Handle gold cost for premium rooms
    if (room.room_type === 'premium' && room.gold_cost !== null && room.gold_cost > 0) {
      // Get user's current gold credits
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];

      if (user.gold_credits < room.gold_cost) {
        throw new Error('Insufficient gold credits');
      }

      // Deduct gold credits from user
      await db.update(usersTable)
        .set({ 
          gold_credits: user.gold_credits - room.gold_cost,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, userId))
        .execute();

      // Record gold transaction
      await db.insert(goldTransactionsTable)
        .values({
          user_id: userId,
          amount: -room.gold_cost,
          transaction_type: 'spend',
          description: `Joined premium room: ${room.name}`,
          reference_id: `room_join_${room.id}`
        })
        .execute();
    }

    // Add user as participant
    const result = await db.insert(roomParticipantsTable)
      .values({
        room_id: input.room_id,
        user_id: userId,
        participant_role: 'member'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Join room failed:', error);
    throw error;
  }
}