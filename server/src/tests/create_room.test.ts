import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rolesTable, usersTable, roomsTable, roomParticipantsTable, goldTransactionsTable } from '../db/schema';
import { type CreateRoomInput } from '../schema';
import { createRoom } from '../handlers/create_room';
import { eq } from 'drizzle-orm';

// Test data
const testRole = {
  name: 'user',
  permissions: ['chat'],
  is_default: true
};

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  display_name: 'Test User',
  gold_credits: 500,
  role_id: 1, // Will be set after role creation
  language: 'en',
  theme: 'light'
};

const testRoomInput: CreateRoomInput = {
  name: 'Test Room',
  description: 'A room for testing',
  room_type: 'public',
  max_participants: 50,
  gold_cost: undefined
};

const testPremiumRoomInput: CreateRoomInput = {
  name: 'Premium Room',
  description: 'A premium room for testing',
  room_type: 'premium',
  max_participants: 20,
  gold_cost: 100
};

describe('createRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testRoleId: number;

  beforeEach(async () => {
    // Create test role
    const roleResult = await db.insert(rolesTable)
      .values(testRole)
      .returning()
      .execute();
    testRoleId = roleResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({ ...testUser, role_id: testRoleId })
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  it('should create a public room', async () => {
    const result = await createRoom(testRoomInput, testUserId);

    // Basic field validation
    expect(result.name).toEqual('Test Room');
    expect(result.description).toEqual('A room for testing');
    expect(result.room_type).toEqual('public');
    expect(result.max_participants).toEqual(50);
    expect(result.gold_cost).toBeNull();
    expect(result.owner_id).toEqual(testUserId);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save room to database', async () => {
    const result = await createRoom(testRoomInput, testUserId);

    const rooms = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, result.id))
      .execute();

    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toEqual('Test Room');
    expect(rooms[0].description).toEqual('A room for testing');
    expect(rooms[0].room_type).toEqual('public');
    expect(rooms[0].owner_id).toEqual(testUserId);
    expect(rooms[0].is_active).toBe(true);
  });

  it('should add creator as admin participant', async () => {
    const result = await createRoom(testRoomInput, testUserId);

    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(eq(roomParticipantsTable.room_id, result.id))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].user_id).toEqual(testUserId);
    expect(participants[0].participant_role).toEqual('admin');
    expect(participants[0].joined_at).toBeInstanceOf(Date);
  });

  it('should create a private room', async () => {
    const privateRoomInput: CreateRoomInput = {
      name: 'Private Room',
      room_type: 'private',
      max_participants: 10
    };

    const result = await createRoom(privateRoomInput, testUserId);

    expect(result.name).toEqual('Private Room');
    expect(result.room_type).toEqual('private');
    expect(result.max_participants).toEqual(10);
    expect(result.description).toBeNull();
    expect(result.gold_cost).toBeNull();
  });

  it('should create a premium room and deduct gold credits', async () => {
    const result = await createRoom(testPremiumRoomInput, testUserId);

    expect(result.name).toEqual('Premium Room');
    expect(result.room_type).toEqual('premium');
    expect(result.gold_cost).toEqual(100);

    // Check user's gold credits were deducted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(400); // 500 - 100
  });

  it('should record gold transaction for premium room', async () => {
    await createRoom(testPremiumRoomInput, testUserId);

    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, testUserId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toEqual(-100);
    expect(transactions[0].transaction_type).toEqual('spend');
    expect(transactions[0].description).toEqual('Room creation: Premium Room');
    expect(transactions[0].reference_id).toBeNull();
  });

  it('should throw error when user has insufficient gold credits', async () => {
    const expensiveRoomInput: CreateRoomInput = {
      name: 'Expensive Room',
      room_type: 'premium',
      gold_cost: 1000 // More than user's 500 credits
    };

    await expect(createRoom(expensiveRoomInput, testUserId))
      .rejects.toThrow(/insufficient gold credits/i);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(createRoom(testRoomInput, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should handle room with minimal data', async () => {
    const minimalRoomInput: CreateRoomInput = {
      name: 'Minimal Room',
      room_type: 'public'
    };

    const result = await createRoom(minimalRoomInput, testUserId);

    expect(result.name).toEqual('Minimal Room');
    expect(result.room_type).toEqual('public');
    expect(result.description).toBeNull();
    expect(result.max_participants).toBeNull();
    expect(result.gold_cost).toBeNull();
  });

  it('should not deduct gold credits for non-premium rooms', async () => {
    const publicRoomWithCost: CreateRoomInput = {
      name: 'Public Room',
      room_type: 'public',
      gold_cost: 50 // Should be ignored for non-premium rooms
    };

    await createRoom(publicRoomWithCost, testUserId);

    // Check user's gold credits were not deducted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(500); // Unchanged

    // Check no gold transaction was recorded
    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, testUserId))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should handle premium room with zero gold cost', async () => {
    const freeRoomInput: CreateRoomInput = {
      name: 'Free Premium Room',
      room_type: 'premium',
      gold_cost: 0
    };

    const result = await createRoom(freeRoomInput, testUserId);

    expect(result.room_type).toEqual('premium');
    expect(result.gold_cost).toEqual(0);

    // Check user's gold credits were not deducted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(500); // Unchanged
  });
});