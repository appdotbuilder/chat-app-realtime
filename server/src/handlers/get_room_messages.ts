import { db } from '../db';
import { messagesTable, roomParticipantsTable, roomsTable } from '../db/schema';
import { type Message } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getRoomMessages(roomId: number, userId: number, limit: number = 50, offset: number = 0): Promise<Message[]> {
  try {
    // First, verify that the user has access to this room
    // Check if user is a participant in the room or if it's a public room
    const roomAccess = await db.select({
      room_type: roomsTable.room_type,
      participant_id: roomParticipantsTable.id
    })
      .from(roomsTable)
      .leftJoin(roomParticipantsTable, and(
        eq(roomParticipantsTable.room_id, roomsTable.id),
        eq(roomParticipantsTable.user_id, userId)
      ))
      .where(eq(roomsTable.id, roomId))
      .execute();

    if (roomAccess.length === 0) {
      throw new Error('Room not found');
    }

    const roomData = roomAccess[0];
    
    // Check access permissions
    if (roomData.room_type === 'private' && !roomData.participant_id) {
      throw new Error('Access denied: User is not a member of this private room');
    }

    // Build the query to fetch messages
    const conditions: SQL<unknown>[] = [];
    conditions.push(eq(messagesTable.room_id, roomId));
    conditions.push(eq(messagesTable.is_deleted, false));

    const results = await db.select()
      .from(messagesTable)
      .where(and(...conditions))
      .orderBy(messagesTable.created_at) // Oldest first (chronological order)
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch room messages:', error);
    throw error;
  }
}