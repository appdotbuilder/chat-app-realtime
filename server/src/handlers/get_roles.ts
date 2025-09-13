import { db } from '../db';
import { rolesTable } from '../db/schema';
import { type Role } from '../schema';
import { desc } from 'drizzle-orm';

export const getRoles = async (): Promise<Role[]> => {
  try {
    // Fetch all roles ordered by creation date (newest first)
    const results = await db.select()
      .from(rolesTable)
      .orderBy(desc(rolesTable.created_at))
      .execute();

    // Return roles with proper type mapping
    return results.map(role => ({
      ...role,
      // permissions is already a JSON array type from the database
      permissions: role.permissions
    }));
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    throw error;
  }
};