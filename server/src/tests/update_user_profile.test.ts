import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type UpdateUserProfileInput } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

// Test data
const testRole = {
  name: 'user',
  permissions: ['read'],
  is_default: true
};

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashedpassword123',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  gold_credits: 100,
  role_id: 1, // Will be set after role creation
  language: 'en',
  theme: 'light',
  is_active: true,
  is_verified: true
};

const fullUpdateInput: UpdateUserProfileInput = {
  display_name: 'Updated Display Name',
  avatar_url: 'https://example.com/new-avatar.jpg',
  language: 'es',
  theme: 'dark'
};

describe('updateUserProfile', () => {
  let userId: number;
  
  beforeEach(async () => {
    await createDB();
    
    // Create role first
    const roleResult = await db.insert(rolesTable)
      .values(testRole)
      .returning()
      .execute();
    
    // Create user
    const userResult = await db.insert(usersTable)
      .values({ ...testUser, role_id: roleResult[0].id })
      .returning()
      .execute();
    
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should update all profile fields', async () => {
    const result = await updateUserProfile(fullUpdateInput, userId);

    expect(result.id).toBe(userId);
    expect(result.display_name).toBe('Updated Display Name');
    expect(result.avatar_url).toBe('https://example.com/new-avatar.jpg');
    expect(result.language).toBe('es');
    expect(result.theme).toBe('dark');
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Ensure other fields remain unchanged
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
    expect(result.gold_credits).toBe(100);
    expect(result.is_active).toBe(true);
  });

  it('should update only provided fields', async () => {
    const partialInput: UpdateUserProfileInput = {
      display_name: 'Partial Update',
      theme: 'dark'
    };

    const result = await updateUserProfile(partialInput, userId);

    expect(result.display_name).toBe('Partial Update');
    expect(result.theme).toBe('dark');
    
    // These should remain unchanged
    expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
    expect(result.language).toBe('en');
  });

  it('should handle null values correctly', async () => {
    const nullInput: UpdateUserProfileInput = {
      display_name: null,
      avatar_url: null
    };

    const result = await updateUserProfile(nullInput, userId);

    expect(result.display_name).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.language).toBe('en'); // Should remain unchanged
    expect(result.theme).toBe('light'); // Should remain unchanged
  });

  it('should update database record', async () => {
    await updateUserProfile(fullUpdateInput, userId);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].display_name).toBe('Updated Display Name');
    expect(users[0].avatar_url).toBe('https://example.com/new-avatar.jpg');
    expect(users[0].language).toBe('es');
    expect(users[0].theme).toBe('dark');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await updateUserProfile({ display_name: 'New Name' }, userId);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle empty input object', async () => {
    const emptyInput: UpdateUserProfileInput = {};

    const result = await updateUserProfile(emptyInput, userId);

    // All original values should be preserved
    expect(result.display_name).toBe('Test User');
    expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
    expect(result.language).toBe('en');
    expect(result.theme).toBe('light');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(updateUserProfile(fullUpdateInput, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should handle various language codes', async () => {
    const languageInput: UpdateUserProfileInput = {
      language: 'fr-CA'
    };

    const result = await updateUserProfile(languageInput, userId);

    expect(result.language).toBe('fr-CA');
  });

  it('should handle various theme values', async () => {
    const themeInput: UpdateUserProfileInput = {
      theme: 'system'
    };

    const result = await updateUserProfile(themeInput, userId);

    expect(result.theme).toBe('system');
  });
});