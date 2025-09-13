import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable, goldTransactionsTable } from '../db/schema';
import { type PurchaseGoldInput } from '../schema';
import { purchaseGold } from '../handlers/purchase_gold';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: PurchaseGoldInput = {
  amount: 100,
  payment_reference: 'payment_ref_123'
};

describe('purchaseGold', () => {
  let testUserId: number;
  let testRoleId: number;

  beforeEach(async () => {
    await createDB();

    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'user',
        permissions: ['read'],
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
        password_hash: 'hashedpassword',
        role_id: testRoleId,
        gold_credits: 50 // Starting with 50 credits
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should successfully purchase gold credits', async () => {
    const result = await purchaseGold(testInput, testUserId);

    // Verify transaction record
    expect(result.user_id).toEqual(testUserId);
    expect(result.amount).toEqual(100);
    expect(result.transaction_type).toEqual('purchase');
    expect(result.description).toEqual('Gold purchase: 100 credits');
    expect(result.reference_id).toEqual('payment_ref_123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user gold balance correctly', async () => {
    await purchaseGold(testInput, testUserId);

    // Check updated user balance
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(150); // 50 + 100
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create transaction record in database', async () => {
    const result = await purchaseGold(testInput, testUserId);

    // Verify transaction exists in database
    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(transactions[0].amount).toEqual(100);
    expect(transactions[0].transaction_type).toEqual('purchase');
    expect(transactions[0].reference_id).toEqual('payment_ref_123');
  });

  it('should generate reference ID when not provided', async () => {
    const inputWithoutRef: PurchaseGoldInput = {
      amount: 200
    };

    const result = await purchaseGold(inputWithoutRef, testUserId);

    // Verify generated reference ID format
    expect(result.reference_id).toMatch(/^purchase_\d+_\d+$/);
    expect(result.reference_id).toContain(`_${testUserId}`);
  });

  it('should handle multiple purchases correctly', async () => {
    // First purchase
    await purchaseGold({ amount: 100 }, testUserId);
    
    // Second purchase
    await purchaseGold({ amount: 200 }, testUserId);

    // Check final balance
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(350); // 50 + 100 + 200

    // Check transaction count
    const transactions = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, testUserId))
      .execute();

    expect(transactions).toHaveLength(2);
  });

  it('should handle large purchase amounts', async () => {
    const largePurchase: PurchaseGoldInput = {
      amount: 10000,
      payment_reference: 'large_purchase_ref'
    };

    const result = await purchaseGold(largePurchase, testUserId);

    expect(result.amount).toEqual(10000);

    // Check updated balance
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(updatedUser[0].gold_credits).toEqual(10050); // 50 + 10000
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(
      purchaseGold(testInput, nonExistentUserId)
    ).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should maintain data integrity on error', async () => {
    // Get initial state
    const initialUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const initialTransactionCount = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, testUserId))
      .execute();

    // Attempt invalid operation
    try {
      await purchaseGold(testInput, 99999);
    } catch {
      // Expected to fail
    }

    // Verify no changes occurred
    const finalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const finalTransactionCount = await db.select()
      .from(goldTransactionsTable)
      .where(eq(goldTransactionsTable.user_id, testUserId))
      .execute();

    expect(finalUser[0].gold_credits).toEqual(initialUser[0].gold_credits);
    expect(finalTransactionCount).toHaveLength(initialTransactionCount.length);
  });
});