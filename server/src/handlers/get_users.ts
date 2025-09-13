import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type User } from '../schema';
import { eq, ilike, and, or, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for filtering and pagination
export const getUsersInputSchema = z.object({
  search: z.string().optional(), // Search in username, email, or display_name
  is_active: z.boolean().optional(), // Filter by active status
  is_verified: z.boolean().optional(), // Filter by verification status
  role_id: z.number().optional(), // Filter by role
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
  order_by: z.enum(['created_at', 'username', 'last_login_at', 'gold_credits']).default('created_at'),
  order_direction: z.enum(['asc', 'desc']).default('desc')
});

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;

export const getUsers = async (rawInput: Partial<GetUsersInput> = {}): Promise<User[]> => {
  // Parse and apply defaults using Zod
  const input = getUsersInputSchema.parse(rawInput);
  
  try {
    // Build the base query
    const baseQuery = db.select()
      .from(usersTable)
      .innerJoin(rolesTable, eq(usersTable.role_id, rolesTable.id));

    // Build where conditions
    const whereConditions = [];

    // Search filter - matches username, email, or display_name
    if (input.search) {
      const searchPattern = `%${input.search}%`;
      whereConditions.push(
        or(
          ilike(usersTable.username, searchPattern),
          ilike(usersTable.email, searchPattern),
          ilike(usersTable.display_name, searchPattern)
        )
      );
    }

    // Active status filter
    if (input.is_active !== undefined) {
      whereConditions.push(eq(usersTable.is_active, input.is_active));
    }

    // Verification status filter
    if (input.is_verified !== undefined) {
      whereConditions.push(eq(usersTable.is_verified, input.is_verified));
    }

    // Role filter
    if (input.role_id !== undefined) {
      whereConditions.push(eq(usersTable.role_id, input.role_id));
    }

    // Apply where conditions
    let queryWithWhere = whereConditions.length > 0 
      ? baseQuery.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions))
      : baseQuery;

    // Apply ordering
    const orderColumn = usersTable[input.order_by];
    const queryWithOrder = input.order_direction === 'desc' 
      ? queryWithWhere.orderBy(desc(orderColumn))
      : queryWithWhere.orderBy(asc(orderColumn));

    // Apply pagination and execute
    const results = await queryWithOrder.limit(input.limit).offset(input.offset);

    // Transform results - after join, data is nested
    const users = results.map(result => ({
      ...result.users,
      // Convert timestamps to Date objects if they're not already
      created_at: new Date(result.users.created_at),
      updated_at: new Date(result.users.updated_at),
      last_login_at: result.users.last_login_at ? new Date(result.users.last_login_at) : null,
    }));

    return users;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};