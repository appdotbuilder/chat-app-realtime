import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roomsTable, usersTable, rolesTable, roomParticipantsTable } from '../db/schema';
import { getRooms } from '../handlers/get_rooms';
import { eq } from 'drizzle-orm';

describe('getRooms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test prerequisites
  const createTestData = async () => {
    // Create default role first
    const [role] = await db.insert(rolesTable)
      .values({
        name: 'user',
        permissions: ['chat'],
        is_default: true
      })
      .returning()
      .execute();

    // Create test users
    const [user1, user2] = await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'user1@test.com',
          password_hash: 'hash1',
          role_id: role.id
        },
        {
          username: 'testuser2',
          email: 'user2@test.com',
          password_hash: 'hash2',
          role_id: role.id
        }
      ])
      .returning()
      .execute();

    // Create test rooms of different types
    const [publicRoom, privateRoom, premiumRoom, inactiveRoom] = await db.insert(roomsTable)
      .values([
        {
          name: 'Public Chat',
          description: 'Everyone can see this',
          room_type: 'public',
          owner_id: user1.id
        },
        {
          name: 'Private Chat',
          description: 'Only participants can see this',
          room_type: 'private',
          owner_id: user1.id
        },
        {
          name: 'Premium Lounge',
          description: 'Premium room with gold cost',
          room_type: 'premium',
          gold_cost: 10,
          max_participants: 50,
          owner_id: user1.id
        },
        {
          name: 'Inactive Room',
          description: 'This room is inactive',
          room_type: 'public',
          owner_id: user1.id,
          is_active: false
        }
      ])
      .returning()
      .execute();

    // Add user2 as participant to private room
    await db.insert(roomParticipantsTable)
      .values({
        room_id: privateRoom.id,
        user_id: user2.id,
        participant_role: 'member'
      })
      .execute();

    return { user1, user2, publicRoom, privateRoom, premiumRoom, inactiveRoom, role };
  };

  it('should return public rooms for unauthenticated users', async () => {
    const { publicRoom, privateRoom, premiumRoom } = await createTestData();

    const result = await getRooms();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(publicRoom.id);
    expect(result[0].name).toBe('Public Chat');
    expect(result[0].room_type).toBe('public');
    
    // Should not include private or premium rooms
    const roomIds = result.map(r => r.id);
    expect(roomIds).not.toContain(privateRoom.id);
    expect(roomIds).not.toContain(premiumRoom.id);
  });

  it('should return public and premium rooms for authenticated users', async () => {
    const { user1, publicRoom, premiumRoom, privateRoom } = await createTestData();

    const result = await getRooms(user1.id);

    expect(result).toHaveLength(2);
    
    const roomTypes = result.map(r => r.room_type);
    expect(roomTypes).toContain('public');
    expect(roomTypes).toContain('premium');
    expect(roomTypes).not.toContain('private');

    // Verify specific rooms
    const roomIds = result.map(r => r.id);
    expect(roomIds).toContain(publicRoom.id);
    expect(roomIds).toContain(premiumRoom.id);
    expect(roomIds).not.toContain(privateRoom.id);
  });

  it('should include private rooms where user is participant', async () => {
    const { user2, publicRoom, privateRoom, premiumRoom } = await createTestData();

    const result = await getRooms(user2.id);

    expect(result).toHaveLength(3);
    
    const roomTypes = result.map(r => r.room_type);
    expect(roomTypes).toContain('public');
    expect(roomTypes).toContain('premium');
    expect(roomTypes).toContain('private');

    // Verify all expected rooms are present
    const roomIds = result.map(r => r.id);
    expect(roomIds).toContain(publicRoom.id);
    expect(roomIds).toContain(premiumRoom.id);
    expect(roomIds).toContain(privateRoom.id);
  });

  it('should exclude inactive rooms', async () => {
    const { user1, inactiveRoom } = await createTestData();

    const result = await getRooms(user1.id);

    const roomIds = result.map(r => r.id);
    expect(roomIds).not.toContain(inactiveRoom.id);

    // Verify all returned rooms are active
    result.forEach(room => {
      expect(room.is_active).toBe(true);
    });
  });

  it('should handle user with no room participations', async () => {
    const { user1, publicRoom, premiumRoom, privateRoom } = await createTestData();

    const result = await getRooms(user1.id);

    // Should get public and premium, but not private (not a participant)
    expect(result).toHaveLength(2);
    
    const roomIds = result.map(r => r.id);
    expect(roomIds).toContain(publicRoom.id);
    expect(roomIds).toContain(premiumRoom.id);
    expect(roomIds).not.toContain(privateRoom.id);
  });

  it('should return correct room data structure', async () => {
    const { publicRoom } = await createTestData();

    const result = await getRooms();

    expect(result).toHaveLength(1);
    const room = result[0];

    // Verify all required fields are present
    expect(room.id).toBeDefined();
    expect(room.name).toBe('Public Chat');
    expect(room.description).toBe('Everyone can see this');
    expect(room.room_type).toBe('public');
    expect(room.max_participants).toBe(null);
    expect(room.gold_cost).toBe(null);
    expect(room.owner_id).toBeDefined();
    expect(room.is_active).toBe(true);
    expect(room.created_at).toBeInstanceOf(Date);
    expect(room.updated_at).toBeInstanceOf(Date);
  });

  it('should verify rooms are saved correctly in database', async () => {
    const { publicRoom } = await createTestData();

    // Query database directly to verify room exists
    const dbRooms = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, publicRoom.id))
      .execute();

    expect(dbRooms).toHaveLength(1);
    expect(dbRooms[0].name).toBe('Public Chat');
    expect(dbRooms[0].room_type).toBe('public');
    expect(dbRooms[0].is_active).toBe(true);
  });

  it('should handle empty database gracefully', async () => {
    const result = await getRooms();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle nonexistent user ID', async () => {
    await createTestData();

    const result = await getRooms(999999);

    // Should still show public and premium rooms
    expect(result).toHaveLength(2);
    const roomTypes = result.map(r => r.room_type);
    expect(roomTypes).toContain('public');
    expect(roomTypes).toContain('premium');
  });
});