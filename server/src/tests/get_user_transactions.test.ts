import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable, goldTransactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, getUserTransactionsWithInput, getUserTransactions } from '../handlers/get_user_transactions';

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create a test role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Test Role',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    // Create test users
    const userResults = await db.insert(usersTable)
      .values([
        {
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hash',
          role_id: roleResult[0].id
        },
        {
          username: 'otheruser',
          email: 'other@example.com',
          password_hash: 'hash',
          role_id: roleResult[0].id
        }
      ])
      .returning()
      .execute();

    testUserId = userResults[0].id;
    otherUserId = userResults[1].id;

    // Create test transactions with clear time separation
    const baseTime = new Date('2024-01-15T12:00:00Z');
    const now = baseTime;
    const yesterday = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(baseTime.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(goldTransactionsTable)
      .values([
        {
          user_id: testUserId,
          amount: 100,
          transaction_type: 'bonus',
          description: 'Welcome bonus',
          reference_id: 'welcome_bonus',
          created_at: twoDaysAgo
        },
        {
          user_id: testUserId,
          amount: 50,
          transaction_type: 'purchase',
          description: 'Gold purchase: 50 credits',
          reference_id: 'purchase_123',
          created_at: yesterday
        },
        {
          user_id: testUserId,
          amount: -20,
          transaction_type: 'spend',
          description: 'Room access fee',
          reference_id: 'room_access_456',
          created_at: now
        },
        {
          user_id: otherUserId,
          amount: 75,
          transaction_type: 'purchase',
          description: 'Other user purchase',
          reference_id: 'other_purchase',
          created_at: now
        }
      ])
      .execute();
  });

  it('should fetch all transactions for a user', async () => {
    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by most recent first
    expect(result[0].transaction_type).toEqual('spend');
    expect(result[0].amount).toEqual(-20);
    expect(result[1].transaction_type).toEqual('purchase');
    expect(result[1].amount).toEqual(50);
    expect(result[2].transaction_type).toEqual('bonus');
    expect(result[2].amount).toEqual(100);

    // All should belong to test user
    result.forEach(transaction => {
      expect(transaction.user_id).toEqual(testUserId);
    });
  });

  it('should filter by transaction type', async () => {
    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      transaction_type: 'purchase',
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_type).toEqual('purchase');
    expect(result[0].amount).toEqual(50);
  });

  it('should filter by date range', async () => {
    // Use the same base times as in the setup
    const baseTime = new Date('2024-01-15T12:00:00Z');
    const yesterday = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
    const now = baseTime;

    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      from_date: yesterday,
      to_date: now,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    // Should include purchase (yesterday) and spend (now) transactions
    // but not bonus (two days ago)
    expect(result).toHaveLength(2);
    expect(result.some(t => t.transaction_type === 'purchase')).toBe(true);
    expect(result.some(t => t.transaction_type === 'spend')).toBe(true);
    expect(result.every(t => t.transaction_type !== 'bonus')).toBe(true);
    
    result.forEach(transaction => {
      expect(transaction.created_at >= yesterday).toBe(true);
      expect(transaction.created_at <= now).toBe(true);
    });
  });

  it('should apply pagination correctly', async () => {
    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      limit: 2,
      offset: 0
    };

    const firstPage = await getUserTransactions(input);
    expect(firstPage).toHaveLength(2);

    const secondPageInput: GetUserTransactionsInput = {
      user_id: testUserId,
      limit: 2,
      offset: 2
    };

    const secondPage = await getUserTransactions(secondPageInput);
    expect(secondPage).toHaveLength(1);

    // Ensure no overlap between pages
    const firstPageIds = firstPage.map(t => t.id);
    const secondPageIds = secondPage.map(t => t.id);
    const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('should return empty array for user with no transactions', async () => {
    // Create another user without transactions
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Empty Role',
        permissions: ['read']
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        username: 'emptyuser',
        email: 'empty@example.com',
        password_hash: 'hash',
        role_id: roleResult[0].id
      })
      .returning()
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: userResult[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);
    expect(result).toHaveLength(0);
  });

  it('should not return transactions from other users', async () => {
    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    // Should not include the other user's transaction
    const otherUserTransactions = result.filter(t => t.user_id === otherUserId);
    expect(otherUserTransactions).toHaveLength(0);
  });

  it('should handle combined filters correctly', async () => {
    const baseTime = new Date('2024-01-15T12:00:00Z');
    const yesterday = new Date(baseTime.getTime() - 24 * 60 * 60 * 1000);
    const now = baseTime;

    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      transaction_type: 'spend',
      from_date: yesterday,
      to_date: now,
      limit: 10,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_type).toEqual('spend');
    expect(result[0].user_id).toEqual(testUserId);
    expect(result[0].created_at >= yesterday).toBe(true);
    expect(result[0].created_at <= now).toBe(true);
  });

  it('should validate required fields are present', async () => {
    const input: GetUserTransactionsInput = {
      user_id: testUserId,
      limit: 50,
      offset: 0
    };

    const result = await getUserTransactionsWithInput(input);

    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.user_id).toBeDefined();
      expect(transaction.amount).toBeDefined();
      expect(transaction.transaction_type).toBeDefined();
      expect(transaction.description).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(typeof transaction.amount).toBe('number');
    });
  });

  it('should support backward compatibility with user_id only', async () => {
    const result = await getUserTransactions(testUserId);

    expect(result).toHaveLength(3);
    
    // Should be ordered by most recent first
    expect(result[0].transaction_type).toEqual('spend');
    expect(result[1].transaction_type).toEqual('purchase');
    expect(result[2].transaction_type).toEqual('bonus');

    // All should belong to test user
    result.forEach(transaction => {
      expect(transaction.user_id).toEqual(testUserId);
    });
  });
});