import { db } from '../db';
import { messagesTable, roomsTable, roomParticipantsTable, usersTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function sendMessage(input: SendMessageInput, userId: number): Promise<Message> {
  try {
    // Validate that the room exists and is active
    const room = await db.select()
      .from(roomsTable)
      .where(and(
        eq(roomsTable.id, input.room_id),
        eq(roomsTable.is_active, true)
      ))
      .limit(1)
      .execute();

    if (room.length === 0) {
      throw new Error('Room not found or inactive');
    }

    // Validate that the user is a participant in the room
    const participation = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.room_id),
        eq(roomParticipantsTable.user_id, userId)
      ))
      .limit(1)
      .execute();

    if (participation.length === 0) {
      throw new Error('User is not a participant in this room');
    }

    // If replying to a message, validate that the replied message exists and is in the same room
    if (input.reply_to_id) {
      const replyToMessage = await db.select()
        .from(messagesTable)
        .where(and(
          eq(messagesTable.id, input.reply_to_id),
          eq(messagesTable.room_id, input.room_id),
          eq(messagesTable.is_deleted, false)
        ))
        .limit(1)
        .execute();

      if (replyToMessage.length === 0) {
        throw new Error('Reply target message not found or deleted');
      }
    }

    // Insert the new message
    const result = await db.insert(messagesTable)
      .values({
        room_id: input.room_id,
        user_id: userId,
        content: input.content,
        message_type: input.message_type || 'text',
        reply_to_id: input.reply_to_id || null
      })
      .returning()
      .execute();

    const message = result[0];

    // Update user's last_seen_at in room participation
    await db.update(roomParticipantsTable)
      .set({
        last_seen_at: new Date()
      })
      .where(and(
        eq(roomParticipantsTable.room_id, input.room_id),
        eq(roomParticipantsTable.user_id, userId)
      ))
      .execute();

    return message;
  } catch (error) {
    console.error('Message sending failed:', error);
    throw error;
  }
}