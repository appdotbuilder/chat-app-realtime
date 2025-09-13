import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Hash the password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Find the default role
    const defaultRoles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.is_default, true))
      .execute();

    if (defaultRoles.length === 0) {
      throw new Error('No default role configured');
    }

    const defaultRole = defaultRoles[0];

    // Insert the new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        display_name: input.display_name || null,
        role_id: defaultRole.id,
        language: input.language || 'en',
        theme: input.theme || 'light',
        gold_credits: 100, // Welcome bonus
        is_active: true,
        is_verified: false,
        avatar_url: null,
        last_login_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};