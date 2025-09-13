import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rolesTable, usersTable, roomsTable, roomParticipantsTable, goldTransactionsTable } from '../db/schema';
import { type JoinRoomInput } from '../schema';
import { joinRoom } from '../handlers/join_room';
import { eq, and, count } from 'drizzle-orm';

// Test data setup
const createTestRole = async () => {
  const result = await db.insert(rolesTable)
    .values({
      name: 'user',
      permissions: ['read'],
      is_default: true
    })
    .returning()
    .execute();
  return result[0];
};

const createTestUser = async (roleId: number, goldCredits: number = 0, suffix: string = '') => {
  const timestamp = Date.now() + Math.random();
  const result = await db.insert(usersTable)
    .values({
      username: `testuser${suffix}_${timestamp}`,
      email: `test${suffix}_${timestamp}@example.com`,
      password_hash: 'hashedpassword',
      gold_credits: goldCredits,
      role_id: roleId,
      language: 'en',
      theme: 'light',
      is_active: true,
      is_verified: true
    })
    .returning()
    .execute();
  return result[0];
};

const createTestOwner = async (roleId: number) => {
  const timestamp = Date.now() + Math.random();
  const result = await db.insert(usersTable)
    .values({
      username: `roomowner_${timestamp}`,
      email: `owner_${timestamp}@example.com`,
      password_hash: 'hashedpassword',
      role_id: roleId,
      language: 'en',
      theme: 'light',
      is_active: true,
      is_verified: true
    })
    .returning()
    .execute();
  return result[0];
};

const createTestRoom = async (ownerId: number, roomType: 'public' | 'private' | 'premium' = 'public', goldCost?: number, maxParticipants?: number) => {
  const result = await db.insert(roomsTable)
    .values({
      name: 'Test Room',
      description: 'A test room',
      room_type: roomType,
      max_participants: maxParticipants || null,
      gold_cost: goldCost || null,
      owner_id: ownerId,
      is_active: true
    })
    .returning()
    .execute();
  return result[0];
};

describe('joinRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully join a public room', async () => {
    // Setup test data
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id);
    const room = await createTestRoom(owner.id, 'public');

    const input: JoinRoomInput = {
      room_id: room.id
    };

    const result = await joinRoom(input, user.id);

    // Verify result
    expect(result.room_id).toEqual(room.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.participant_role).toEqual('member');
    expect(result.id).toBeDefined();
    expect(result.joined_at).toBeInstanceOf(Date);
  });

  it('should save participant to database', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id);
    const room = await createTestRoom(owner.id, 'public');

    const input: JoinRoomInput = {
      room_id: room.id
    };

    const result = await joinRoom(input, user.id);

    // Verify database record
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(eq(roomParticipantsTable.id, result.id))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].room_id).toEqual(room.id);
    expect(participants[0].user_id).toEqual(user.id);
    expect(participants[0].participant_role).toEqual('member');
  });

  it('should handle premium room with sufficient gold credits', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id, 100); // User with 100 gold credits
    const room = await createTestRoom(owner.id, 'premium', 50); // Room costs 50 gold

    const input: JoinRoomInput = {
      room_id: room.id
    };

    const result = await joinRoom(input, user.id);

    // Verify successful join
    expect(result.room_id).toEqual(room.id);
    expect(result.user_id).toEqual(user.id);

    // Verify gold was deducted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    
    expect(updatedUser[0].gold_credits).toEqual(50);

    // Verify transaction was recorded
    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, user.id))
      .execute();
    
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toEqual(-50);
    expect(transactions[0].transaction_type).toEqual('spend');
    expect(transactions[0].description).toContain('premium room');
  });

  it('should reject joining premium room with insufficient gold credits', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id, 25); // User with only 25 gold credits
    const room = await createTestRoom(owner.id, 'premium', 50); // Room costs 50 gold

    const input: JoinRoomInput = {
      room_id: room.id
    };

    await expect(joinRoom(input, user.id)).rejects.toThrow(/insufficient gold credits/i);
  });

  it('should reject joining room at maximum capacity', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user1 = await createTestUser(role.id, 0, '1');
    const user2 = await createTestUser(role.id, 0, '2');
    const room = await createTestRoom(owner.id, 'public', undefined, 1); // Max 1 participant

    // First user joins successfully
    await db.insert(roomParticipantsTable)
      .values({
        room_id: room.id,
        user_id: user1.id,
        participant_role: 'member'
      })
      .execute();

    const input: JoinRoomInput = {
      room_id: room.id
    };

    // Second user should be rejected
    await expect(joinRoom(input, user2.id)).rejects.toThrow(/maximum participant limit/i);
  });

  it('should reject joining non-existent room', async () => {
    const role = await createTestRole();
    const user = await createTestUser(role.id);

    const input: JoinRoomInput = {
      room_id: 999999 // Non-existent room ID
    };

    await expect(joinRoom(input, user.id)).rejects.toThrow(/room not found/i);
  });

  it('should reject joining inactive room', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id);
    const room = await createTestRoom(owner.id, 'public');

    // Deactivate the room
    await db.update(roomsTable)
      .set({ is_active: false })
      .where(eq(roomsTable.id, room.id))
      .execute();

    const input: JoinRoomInput = {
      room_id: room.id
    };

    await expect(joinRoom(input, user.id)).rejects.toThrow(/room is not active/i);
  });

  it('should reject user already in room', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id);
    const room = await createTestRoom(owner.id, 'public');

    // User already in room
    await db.insert(roomParticipantsTable)
      .values({
        room_id: room.id,
        user_id: user.id,
        participant_role: 'member'
      })
      .execute();

    const input: JoinRoomInput = {
      room_id: room.id
    };

    await expect(joinRoom(input, user.id)).rejects.toThrow(/already a participant/i);
  });

  it('should handle premium room with no gold cost', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id, 0); // User with no gold
    const room = await createTestRoom(owner.id, 'premium', 0); // Premium room but free

    const input: JoinRoomInput = {
      room_id: room.id
    };

    const result = await joinRoom(input, user.id);

    // Should join successfully without gold deduction
    expect(result.room_id).toEqual(room.id);
    expect(result.user_id).toEqual(user.id);

    // Verify no gold transaction was created
    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, user.id))
      .execute();
    
    expect(transactions).toHaveLength(0);
  });

  it('should handle room without max participants limit', async () => {
    const role = await createTestRole();
    const owner = await createTestOwner(role.id);
    const user = await createTestUser(role.id);
    const room = await createTestRoom(owner.id, 'public'); // No max participants

    // Add multiple participants to verify no limit is enforced
    for (let i = 0; i < 5; i++) {
      const timestamp = Date.now() + Math.random() + i;
      const extraUser = await db.insert(usersTable)
        .values({
          username: `user${i}_${timestamp}`,
          email: `user${i}_${timestamp}@example.com`,
          password_hash: 'hashedpassword',
          role_id: role.id,
          language: 'en',
          theme: 'light',
          is_active: true,
          is_verified: true
        })
        .returning()
        .execute();

      await db.insert(roomParticipantsTable)
        .values({
          room_id: room.id,
          user_id: extraUser[0].id,
          participant_role: 'member'
        })
        .execute();
    }

    const input: JoinRoomInput = {
      room_id: room.id
    };

    const result = await joinRoom(input, user.id);

    // Should join successfully despite many existing participants
    expect(result.room_id).toEqual(room.id);
    expect(result.user_id).toEqual(user.id);
  });
});