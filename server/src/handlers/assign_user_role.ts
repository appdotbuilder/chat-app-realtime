import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type AssignUserRoleInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const assignUserRole = async (input: AssignUserRoleInput): Promise<User> => {
  try {
    // Verify that the role exists
    const roleExists = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.id, input.role_id))
      .execute();

    if (roleExists.length === 0) {
      throw new Error(`Role with id ${input.role_id} does not exist`);
    }

    // Verify that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Update the user's role
    const result = await db.update(usersTable)
      .set({
        role_id: input.role_id,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Role assignment failed:', error);
    throw error;
  }
};