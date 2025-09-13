import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserProfile = async (input: UpdateUserProfileInput, userId: number): Promise<User> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.display_name !== undefined) {
      updateData.display_name = input.display_name;
    }

    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    if (input.language !== undefined) {
      updateData.language = input.language;
    }

    if (input.theme !== undefined) {
      updateData.theme = input.theme;
    }

    // Update user profile
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return result[0];
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};