import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const loginUser = async (input: LoginUserInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password using crypto.scrypt for password hashing
    const [salt, storedHash] = user.password_hash.split(':');
    const hash = crypto.scryptSync(input.password, salt, 64).toString('hex');
    if (hash !== storedHash) {
      throw new Error('Invalid email or password');
    }

    // Update last login timestamp
    const updatedUsers = await db.update(usersTable)
      .set({ 
        last_login_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, user.id))
      .returning()
      .execute();

    const updatedUser = updatedUsers[0];

    return {
      ...updatedUser,
      last_login_at: updatedUser.last_login_at || null,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};