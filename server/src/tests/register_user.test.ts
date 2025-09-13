import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'securepassword123',
  display_name: 'Test User',
  language: 'en',
  theme: 'dark'
};

// Minimal test input
const minimalInput: RegisterUserInput = {
  username: 'minimal',
  email: 'minimal@example.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create a default role for testing
    await db.insert(rolesTable)
      .values({
        name: 'user',
        permissions: ['read', 'write'],
        is_default: true
      })
      .execute();
  });
  
  afterEach(resetDB);

  it('should register a user with all fields provided', async () => {
    const result = await registerUser(testInput);

    // Verify basic fields
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.display_name).toEqual('Test User');
    expect(result.language).toEqual('en');
    expect(result.theme).toEqual('dark');
    
    // Verify defaults and computed fields
    expect(result.gold_credits).toEqual(100);
    expect(result.is_active).toBe(true);
    expect(result.is_verified).toBe(false);
    expect(result.avatar_url).toBeNull();
    expect(result.last_login_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.role_id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed (not plain text)
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('securepassword123');
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should register a user with minimal input and apply defaults', async () => {
    const result = await registerUser(minimalInput);

    expect(result.username).toEqual('minimal');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.display_name).toBeNull();
    expect(result.language).toEqual('en'); // Default
    expect(result.theme).toEqual('light'); // Default
    expect(result.gold_credits).toEqual(100);
    expect(result.is_active).toBe(true);
    expect(result.is_verified).toBe(false);
  });

  it('should assign the default role to new user', async () => {
    const result = await registerUser(testInput);

    // Verify user was assigned the default role
    const defaultRoles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.is_default, true))
      .execute();

    expect(defaultRoles.length).toEqual(1);
    expect(result.role_id).toEqual(defaultRoles[0].id);
  });

  it('should save user to database correctly', async () => {
    const result = await registerUser(testInput);

    // Query the database to verify the user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.display_name).toEqual('Test User');
    expect(savedUser.language).toEqual('en');
    expect(savedUser.theme).toEqual('dark');
    expect(savedUser.gold_credits).toEqual(100);
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.is_verified).toBe(false);
    expect(savedUser.created_at).toBeInstanceOf(Date);
  });

  it('should hash the password properly', async () => {
    const result = await registerUser(testInput);

    // Verify password was hashed
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual(testInput.password);

    // Verify the password can be verified with Bun's password utility
    const isValid = await Bun.password.verify(testInput.password, result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isWrongValid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isWrongValid).toBe(false);
  });

  it('should throw error when no default role exists', async () => {
    // Remove the default role
    await db.delete(rolesTable).execute();

    await expect(registerUser(testInput)).rejects.toThrow(/no default role configured/i);
  });

  it('should handle database constraint violations', async () => {
    // Register first user
    await registerUser(testInput);

    // Try to register with same username
    const duplicateUsername = { ...testInput, email: 'different@example.com' };
    await expect(registerUser(duplicateUsername)).rejects.toThrow();

    // Try to register with same email
    const duplicateEmail = { ...testInput, username: 'different' };
    await expect(registerUser(duplicateEmail)).rejects.toThrow();
  });

  it('should handle multiple default roles by using the first one', async () => {
    // Add another default role
    await db.insert(rolesTable)
      .values({
        name: 'admin',
        permissions: ['read', 'write', 'admin'],
        is_default: true
      })
      .execute();

    const result = await registerUser(testInput);

    // Should use the first default role found
    expect(result.role_id).toBeDefined();
    expect(typeof result.role_id).toBe('number');
  });

  it('should handle optional fields correctly', async () => {
    const inputWithNullDisplay: RegisterUserInput = {
      username: 'nulldisplay',
      email: 'nulldisplay@example.com',
      password: 'password123',
      display_name: null
    };

    const result = await registerUser(inputWithNullDisplay);
    expect(result.display_name).toBeNull();
  });
});