import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable, roomsTable, messagesTable, roomParticipantsTable } from '../db/schema';
import { getRoomMessages } from '../handlers/get_room_messages';

describe('getRoomMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let defaultRole: any;
  let testUser: any;
  let otherUser: any;
  let publicRoom: any;
  let privateRoom: any;

  beforeEach(async () => {
    // Create default role
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'user',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();
    defaultRole = roleResult[0];

    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashed',
          role_id: defaultRole.id
        },
        {
          username: 'otheruser',
          email: 'other@example.com',
          password_hash: 'hashed',
          role_id: defaultRole.id
        }
      ])
      .returning()
      .execute();
    testUser = userResults[0];
    otherUser = userResults[1];

    // Create test rooms
    const roomResults = await db.insert(roomsTable)
      .values([
        {
          name: 'Public Room',
          room_type: 'public',
          owner_id: testUser.id
        },
        {
          name: 'Private Room',
          room_type: 'private',
          owner_id: testUser.id
        }
      ])
      .returning()
      .execute();
    publicRoom = roomResults[0];
    privateRoom = roomResults[1];

    // Add test user as participant in private room
    await db.insert(roomParticipantsTable)
      .values({
        room_id: privateRoom.id,
        user_id: testUser.id,
        participant_role: 'admin'
      })
      .execute();
  });

  it('should fetch messages from public room for any user', async () => {
    // Create test messages
    await db.insert(messagesTable)
      .values([
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'First message',
          message_type: 'text'
        },
        {
          room_id: publicRoom.id,
          user_id: otherUser.id,
          content: 'Second message',
          message_type: 'text'
        }
      ])
      .execute();

    const result = await getRoomMessages(publicRoom.id, otherUser.id);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[0].room_id).toEqual(publicRoom.id);
    expect(result[0].is_deleted).toBe(false);
  });

  it('should fetch messages from private room for participant', async () => {
    // Create test messages
    await db.insert(messagesTable)
      .values([
        {
          room_id: privateRoom.id,
          user_id: testUser.id,
          content: 'Private message',
          message_type: 'text'
        }
      ])
      .execute();

    const result = await getRoomMessages(privateRoom.id, testUser.id);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Private message');
    expect(result[0].room_id).toEqual(privateRoom.id);
  });

  it('should deny access to private room for non-participants', async () => {
    // Create test message
    await db.insert(messagesTable)
      .values({
        room_id: privateRoom.id,
        user_id: testUser.id,
        content: 'Private message',
        message_type: 'text'
      })
      .execute();

    await expect(getRoomMessages(privateRoom.id, otherUser.id))
      .rejects.toThrow(/Access denied.*not a member.*private room/i);
  });

  it('should throw error for non-existent room', async () => {
    await expect(getRoomMessages(99999, testUser.id))
      .rejects.toThrow(/Room not found/i);
  });

  it('should exclude deleted messages', async () => {
    // Create messages (one deleted)
    await db.insert(messagesTable)
      .values([
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'Active message',
          message_type: 'text',
          is_deleted: false
        },
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'Deleted message',
          message_type: 'text',
          is_deleted: true
        }
      ])
      .execute();

    const result = await getRoomMessages(publicRoom.id, testUser.id);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Active message');
    expect(result[0].is_deleted).toBe(false);
  });

  it('should apply pagination correctly', async () => {
    // Create multiple messages
    const messageValues = [];
    for (let i = 1; i <= 5; i++) {
      messageValues.push({
        room_id: publicRoom.id,
        user_id: testUser.id,
        content: `Message ${i}`,
        message_type: 'text' as const
      });
    }
    await db.insert(messagesTable)
      .values(messageValues)
      .execute();

    // Test limit
    const limitedResult = await getRoomMessages(publicRoom.id, testUser.id, 3, 0);
    expect(limitedResult).toHaveLength(3);

    // Test offset
    const offsetResult = await getRoomMessages(publicRoom.id, testUser.id, 2, 2);
    expect(offsetResult).toHaveLength(2);

    // Verify we get different messages with offset
    expect(limitedResult[0].content).not.toEqual(offsetResult[0].content);
  });

  it('should return messages in chronological order', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    // Insert messages with specific timestamps (simulated by insertion order)
    await db.insert(messagesTable)
      .values([
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'Older message',
          message_type: 'text'
        },
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'Newer message',
          message_type: 'text'
        }
      ])
      .execute();

    const result = await getRoomMessages(publicRoom.id, testUser.id);

    expect(result).toHaveLength(2);
    // Should be in chronological order (oldest first for chat display)
    expect(result[0].content).toEqual('Older message');
    expect(result[1].content).toEqual('Newer message');
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should handle different message types', async () => {
    // Create messages of different types
    await db.insert(messagesTable)
      .values([
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'Text message',
          message_type: 'text'
        },
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'System message',
          message_type: 'system'
        },
        {
          room_id: publicRoom.id,
          user_id: testUser.id,
          content: 'image.jpg',
          message_type: 'image'
        }
      ])
      .execute();

    const result = await getRoomMessages(publicRoom.id, testUser.id);

    expect(result).toHaveLength(3);
    expect(result.some(m => m.message_type === 'text')).toBe(true);
    expect(result.some(m => m.message_type === 'system')).toBe(true);
    expect(result.some(m => m.message_type === 'image')).toBe(true);
  });

  it('should handle empty room correctly', async () => {
    const result = await getRoomMessages(publicRoom.id, testUser.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});