import { db } from '../db';
import { goldTransactionsTable, usersTable } from '../db/schema';
import { type PurchaseGoldInput, type GoldTransaction } from '../schema';
import { eq } from 'drizzle-orm';

export const purchaseGold = async (input: PurchaseGoldInput, userId: number): Promise<GoldTransaction> => {
  try {
    // Verify user exists before processing transaction
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResults.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    const user = userResults[0];

    // Generate reference ID if not provided
    const referenceId = input.payment_reference || `purchase_${Date.now()}_${userId}`;
    
    // Create transaction record
    const transactionResult = await db.insert(goldTransactionsTable)
      .values({
        user_id: userId,
        amount: input.amount,
        transaction_type: 'purchase',
        description: `Gold purchase: ${input.amount} credits`,
        reference_id: referenceId
      })
      .returning()
      .execute();

    // Update user's gold balance
    await db.update(usersTable)
      .set({ 
        gold_credits: user.gold_credits + input.amount,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    return transactionResult[0];
  } catch (error) {
    console.error('Gold purchase failed:', error);
    throw error;
  }
};