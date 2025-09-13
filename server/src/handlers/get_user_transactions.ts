import { db } from '../db';
import { goldTransactionsTable } from '../db/schema';
import { type GoldTransaction } from '../schema';
import { eq, desc, and, gte, lte, SQL } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for filtering and pagination
export const getUserTransactionsInputSchema = z.object({
  user_id: z.number(),
  transaction_type: z.enum(['purchase', 'spend', 'refund', 'bonus']).optional(),
  from_date: z.coerce.date().optional(),
  to_date: z.coerce.date().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetUserTransactionsInput = z.infer<typeof getUserTransactionsInputSchema>;

// Internal function that handles the full input object
const _getUserTransactions = async (input: GetUserTransactionsInput): Promise<GoldTransaction[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(goldTransactionsTable.user_id, input.user_id)
    ];

    // Add optional filters
    if (input.transaction_type) {
      conditions.push(eq(goldTransactionsTable.transaction_type, input.transaction_type));
    }

    if (input.from_date) {
      conditions.push(gte(goldTransactionsTable.created_at, input.from_date));
    }

    if (input.to_date) {
      conditions.push(lte(goldTransactionsTable.created_at, input.to_date));
    }

    // Build query with conditions
    const results = await db.select()
      .from(goldTransactionsTable)
      .where(and(...conditions))
      .orderBy(desc(goldTransactionsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user transactions:', error);
    throw error;
  }
};

// Public function that accepts either a number (user_id) or full input object for backward compatibility
export const getUserTransactions = async (input: GetUserTransactionsInput | number): Promise<GoldTransaction[]> => {
  if (typeof input === 'number') {
    // Backward compatibility: if called with just user_id
    return _getUserTransactions({
      user_id: input,
      limit: 50,
      offset: 0
    });
  }
  
  // New functionality: called with full input object
  return _getUserTransactions(input);
};

// Export internal function for testing
export const getUserTransactionsWithInput = _getUserTransactions;