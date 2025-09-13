import { db } from '../db';
import { roomsTable, roomParticipantsTable, usersTable, goldTransactionsTable } from '../db/schema';
import { type CreateRoomInput, type Room } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createRoom = async (input: CreateRoomInput, userId: number): Promise<Room> => {
  try {
    // Start a database transaction for consistency
    const result = await db.transaction(async (tx) => {
      // Verify user exists
      const user = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      if (user.length === 0) {
        throw new Error('User not found');
      }

      const userData = user[0];

      // Check if user has enough gold credits for premium rooms
      if (input.room_type === 'premium' && input.gold_cost !== undefined && input.gold_cost !== null) {
        if (userData.gold_credits < input.gold_cost) {
          throw new Error('Insufficient gold credits');
        }

        // Only deduct gold credits and record transaction if cost > 0
        if (input.gold_cost > 0) {
          // Deduct gold credits from user
          await tx.update(usersTable)
            .set({ 
              gold_credits: sql`${usersTable.gold_credits} - ${input.gold_cost}`,
              updated_at: new Date()
            })
            .where(eq(usersTable.id, userId))
            .execute();

          // Record gold transaction
          await tx.insert(goldTransactionsTable)
            .values({
              user_id: userId,
              amount: -input.gold_cost,
              transaction_type: 'spend',
              description: `Room creation: ${input.name}`,
              reference_id: null
            })
            .execute();
        }
      }

      // Create the room
      const roomResult = await tx.insert(roomsTable)
        .values({
          name: input.name,
          description: input.description || null,
          room_type: input.room_type,
          max_participants: input.max_participants || null,
          gold_cost: input.gold_cost !== undefined ? input.gold_cost : null,
          owner_id: userId
        })
        .returning()
        .execute();

      const newRoom = roomResult[0];

      // Add creator as admin participant
      await tx.insert(roomParticipantsTable)
        .values({
          room_id: newRoom.id,
          user_id: userId,
          participant_role: 'admin'
        })
        .execute();

      return newRoom;
    });

    return result;
  } catch (error) {
    console.error('Room creation failed:', error);
    throw error;
  }
};