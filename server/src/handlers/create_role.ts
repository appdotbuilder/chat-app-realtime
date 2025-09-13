import { db } from '../db';
import { rolesTable } from '../db/schema';
import { type CreateRoleInput, type Role } from '../schema';
import { eq } from 'drizzle-orm';

export const createRole = async (input: CreateRoleInput): Promise<Role> => {
  try {
    // Check if role name already exists
    const existingRoles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.name, input.name))
      .execute();

    if (existingRoles.length > 0) {
      throw new Error(`Role with name '${input.name}' already exists`);
    }

    // If this role is set as default, unset any existing default role
    if (input.is_default) {
      await db.update(rolesTable)
        .set({ is_default: false })
        .where(eq(rolesTable.is_default, true))
        .execute();
    }

    // Insert new role
    const result = await db.insert(rolesTable)
      .values({
        name: input.name,
        permissions: input.permissions,
        is_default: input.is_default || false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Role creation failed:', error);
    throw error;
  }
};