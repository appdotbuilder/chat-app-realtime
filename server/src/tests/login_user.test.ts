import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Helper function to hash passwords
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login a valid user', async () => {
    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    const role = roleResult[0];

    // Create a test user
    const passwordHash = hashPassword('password123');
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: passwordHash,
        display_name: 'Test User',
        gold_credits: 100,
        role_id: role.id,
        language: 'en',
        theme: 'dark',
        is_active: true,
        is_verified: true
      })
      .returning()
      .execute();

    const user = userResult[0];

    const input: LoginUserInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await loginUser(input);

    // Verify user data
    expect(result.id).toEqual(user.id);
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.display_name).toEqual('Test User');
    expect(result.gold_credits).toEqual(100);
    expect(result.role_id).toEqual(role.id);
    expect(result.language).toEqual('en');
    expect(result.theme).toEqual('dark');
    expect(result.is_active).toEqual(true);
    expect(result.is_verified).toEqual(true);
    expect(result.last_login_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update last_login_at timestamp', async () => {
    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    const role = roleResult[0];

    // Create a test user
    const passwordHash = hashPassword('password123');
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: passwordHash,
        display_name: 'Test User',
        gold_credits: 100,
        role_id: role.id,
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true,
        last_login_at: null
      })
      .returning()
      .execute();

    const user = userResult[0];
    expect(user.last_login_at).toBeNull();

    const input: LoginUserInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await loginUser(input);

    // Verify last_login_at was updated
    expect(result.last_login_at).toBeInstanceOf(Date);

    // Verify the timestamp was actually saved to database
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers[0].last_login_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    const input: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    const role = roleResult[0];

    // Create a test user
    const passwordHash = hashPassword('correct_password');
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: passwordHash,
        display_name: 'Test User',
        gold_credits: 100,
        role_id: role.id,
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true
      })
      .returning()
      .execute();

    const input: LoginUserInput = {
      email: 'test@example.com',
      password: 'wrong_password'
    };

    await expect(loginUser(input)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user account', async () => {
    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    const role = roleResult[0];

    // Create an inactive test user
    const passwordHash = hashPassword('password123');
    await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password_hash: passwordHash,
        display_name: 'Inactive User',
        gold_credits: 0,
        role_id: role.id,
        language: 'en',
        theme: 'light',
        is_active: false,
        is_verified: true
      })
      .returning()
      .execute();

    const input: LoginUserInput = {
      email: 'inactive@example.com',
      password: 'password123'
    };

    await expect(loginUser(input)).rejects.toThrow(/account is deactivated/i);
  });

  it('should handle user with null optional fields', async () => {
    // Create a default role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();

    const role = roleResult[0];

    // Create a test user with minimal data
    const passwordHash = hashPassword('password123');
    const userResult = await db.insert(usersTable)
      .values({
        username: 'minimaluser',
        email: 'minimal@example.com',
        password_hash: passwordHash,
        display_name: null,
        avatar_url: null,
        gold_credits: 0,
        role_id: role.id,
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: false,
        last_login_at: null
      })
      .returning()
      .execute();

    const user = userResult[0];

    const input: LoginUserInput = {
      email: 'minimal@example.com',
      password: 'password123'
    };

    const result = await loginUser(input);

    // Verify nullable fields are handled correctly
    expect(result.display_name).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.is_verified).toEqual(false);
    expect(result.gold_credits).toEqual(0);
    expect(result.last_login_at).toBeInstanceOf(Date);
  });
});