import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  rolesTable, 
  roomsTable, 
  messagesTable, 
  roomParticipantsTable 
} from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';

describe('sendMessage', () => {
  let testUserId: number;
  let testRoomId: number;
  let testRoleId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test role
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'test_user',
        permissions: ['send_message'],
        is_default: true
      })
      .returning()
      .execute();
    testRoleId = roleResult[0].id;

    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role_id: testRoleId,
        display_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create a test room
    const roomResult = await db.insert(roomsTable)
      .values({
        name: 'Test Room',
        description: 'A room for testing',
        room_type: 'public',
        owner_id: testUserId
      })
      .returning()
      .execute();
    testRoomId = roomResult[0].id;

    // Add user as participant in the room
    await db.insert(roomParticipantsTable)
      .values({
        room_id: testRoomId,
        user_id: testUserId,
        participant_role: 'member'
      })
      .execute();
  });

  afterEach(resetDB);

  it('should send a message successfully', async () => {
    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Hello, world!',
      message_type: 'text'
    };

    const result = await sendMessage(input, testUserId);

    expect(result.id).toBeDefined();
    expect(result.room_id).toEqual(testRoomId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.content).toEqual('Hello, world!');
    expect(result.message_type).toEqual('text');
    expect(result.is_edited).toEqual(false);
    expect(result.is_deleted).toEqual(false);
    expect(result.reply_to_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Test message content'
    };

    const result = await sendMessage(input, testUserId);

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Test message content');
    expect(messages[0].user_id).toEqual(testUserId);
    expect(messages[0].room_id).toEqual(testRoomId);
    expect(messages[0].message_type).toEqual('text'); // Default value
  });

  it('should use default message_type when not provided', async () => {
    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Message without type'
    };

    const result = await sendMessage(input, testUserId);

    expect(result.message_type).toEqual('text');
  });

  it('should handle reply to existing message', async () => {
    // First, create an original message
    const originalInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'Original message'
    };
    const originalMessage = await sendMessage(originalInput, testUserId);

    // Now reply to it
    const replyInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'Reply message',
      reply_to_id: originalMessage.id
    };

    const result = await sendMessage(replyInput, testUserId);

    expect(result.reply_to_id).toEqual(originalMessage.id);
    expect(result.content).toEqual('Reply message');
  });

  it('should update user last_seen_at when sending message', async () => {
    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Test message'
    };

    const beforeTime = new Date();
    await sendMessage(input, testUserId);

    const participation = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, testRoomId),
        eq(roomParticipantsTable.user_id, testUserId)
      ))
      .execute();

    expect(participation).toHaveLength(1);
    expect(participation[0].last_seen_at).toBeInstanceOf(Date);
    expect(participation[0].last_seen_at!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
  });

  it('should reject message for non-existent room', async () => {
    const input: SendMessageInput = {
      room_id: 99999,
      content: 'Message to nowhere'
    };

    await expect(sendMessage(input, testUserId))
      .rejects
      .toThrow(/room not found or inactive/i);
  });

  it('should reject message for inactive room', async () => {
    // Deactivate the room
    await db.update(roomsTable)
      .set({ is_active: false })
      .where(eq(roomsTable.id, testRoomId))
      .execute();

    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Message to inactive room'
    };

    await expect(sendMessage(input, testUserId))
      .rejects
      .toThrow(/room not found or inactive/i);
  });

  it('should reject message from non-participant', async () => {
    // Create another user who is not a participant
    const nonParticipantResult = await db.insert(usersTable)
      .values({
        username: 'nonparticipant',
        email: 'nonparticipant@example.com',
        password_hash: 'hashed_password',
        role_id: testRoleId
      })
      .returning()
      .execute();

    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Unauthorized message'
    };

    await expect(sendMessage(input, nonParticipantResult[0].id))
      .rejects
      .toThrow(/user is not a participant/i);
  });

  it('should reject reply to non-existent message', async () => {
    const input: SendMessageInput = {
      room_id: testRoomId,
      content: 'Reply to nothing',
      reply_to_id: 99999
    };

    await expect(sendMessage(input, testUserId))
      .rejects
      .toThrow(/reply target message not found/i);
  });

  it('should reject reply to deleted message', async () => {
    // Create and then delete a message
    const originalInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'Message to be deleted'
    };
    const originalMessage = await sendMessage(originalInput, testUserId);

    // Mark the message as deleted
    await db.update(messagesTable)
      .set({ is_deleted: true })
      .where(eq(messagesTable.id, originalMessage.id))
      .execute();

    const replyInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'Reply to deleted message',
      reply_to_id: originalMessage.id
    };

    await expect(sendMessage(replyInput, testUserId))
      .rejects
      .toThrow(/reply target message not found/i);
  });

  it('should reject reply to message from different room', async () => {
    // Create another room and user
    const anotherRoomResult = await db.insert(roomsTable)
      .values({
        name: 'Another Room',
        room_type: 'public',
        owner_id: testUserId
      })
      .returning()
      .execute();

    const anotherRoomId = anotherRoomResult[0].id;

    // Add user as participant in the other room
    await db.insert(roomParticipantsTable)
      .values({
        room_id: anotherRoomId,
        user_id: testUserId,
        participant_role: 'member'
      })
      .execute();

    // Create message in the other room
    const otherRoomMessage = await sendMessage({
      room_id: anotherRoomId,
      content: 'Message in other room'
    }, testUserId);

    // Try to reply from the original room
    const replyInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'Cross-room reply',
      reply_to_id: otherRoomMessage.id
    };

    await expect(sendMessage(replyInput, testUserId))
      .rejects
      .toThrow(/reply target message not found/i);
  });

  it('should handle different message types', async () => {
    const imageInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'image_url.jpg',
      message_type: 'image'
    };

    const result = await sendMessage(imageInput, testUserId);
    expect(result.message_type).toEqual('image');

    const fileInput: SendMessageInput = {
      room_id: testRoomId,
      content: 'document.pdf',
      message_type: 'file'
    };

    const fileResult = await sendMessage(fileInput, testUserId);
    expect(fileResult.message_type).toEqual('file');
  });
});