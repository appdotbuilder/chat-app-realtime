import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { type Room } from '../schema';
import { eq, and, or, inArray } from 'drizzle-orm';

export const getRooms = async (userId?: number): Promise<Room[]> => {
  try {
    if (userId) {
      // For authenticated users: get rooms they can access
      
      // First, get room IDs where user is a participant
      const participantRooms = await db.select({ room_id: roomParticipantsTable.room_id })
        .from(roomParticipantsTable)
        .where(eq(roomParticipantsTable.user_id, userId))
        .execute();
      
      const participantRoomIds = participantRooms.map(p => p.room_id);

      if (participantRoomIds.length > 0) {
        // Show public, premium rooms AND private rooms user participates in
        const results = await db.select()
          .from(roomsTable)
          .where(
            and(
              eq(roomsTable.is_active, true),
              or(
                eq(roomsTable.room_type, 'public'),
                eq(roomsTable.room_type, 'premium'),
                and(
                  eq(roomsTable.room_type, 'private'),
                  inArray(roomsTable.id, participantRoomIds)
                )
              )
            )
          )
          .execute();

        return results;
      } else {
        // User doesn't participate in any private rooms, show only public and premium
        const results = await db.select()
          .from(roomsTable)
          .where(
            and(
              eq(roomsTable.is_active, true),
              or(
                eq(roomsTable.room_type, 'public'),
                eq(roomsTable.room_type, 'premium')
              )
            )
          )
          .execute();

        return results;
      }
    } else {
      // For unauthenticated users: show only public rooms
      const results = await db.select()
        .from(roomsTable)
        .where(
          and(
            eq(roomsTable.is_active, true),
            eq(roomsTable.room_type, 'public')
          )
        )
        .execute();

      return results;
    }

  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    throw error;
  }
};