import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type AssignUserRoleInput } from '../schema';
import { assignUserRole } from '../handlers/assign_user_role';
import { eq } from 'drizzle-orm';

describe('assignUserRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should assign a role to a user', async () => {
    // Create a role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const role = roleResult[0];

    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        avatar_url: null,
        gold_credits: 100,
        role_id: role.id, // Initial role assignment
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true,
        last_login_at: null
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create another role to assign
    const newRoleResult = await db.insert(rolesTable)
      .values({
        name: 'Moderator',
        permissions: ['read', 'write'],
        is_default: false
      })
      .returning()
      .execute();
    const newRole = newRoleResult[0];

    const input: AssignUserRoleInput = {
      user_id: user.id,
      role_id: newRole.id
    };

    const result = await assignUserRole(input);

    // Verify the returned user has the new role
    expect(result.id).toEqual(user.id);
    expect(result.role_id).toEqual(newRole.id);
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save role assignment to database', async () => {
    // Create a role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const role = roleResult[0];

    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        avatar_url: null,
        gold_credits: 100,
        role_id: role.id, // Initial role assignment
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true,
        last_login_at: null
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create another role to assign
    const newRoleResult = await db.insert(rolesTable)
      .values({
        name: 'Moderator',
        permissions: ['read', 'write'],
        is_default: false
      })
      .returning()
      .execute();
    const newRole = newRoleResult[0];

    const input: AssignUserRoleInput = {
      user_id: user.id,
      role_id: newRole.id
    };

    await assignUserRole(input);

    // Verify the assignment was saved to the database
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].role_id).toEqual(newRole.id);
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when role does not exist', async () => {
    // Create a user first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const role = roleResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        avatar_url: null,
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

    const input: AssignUserRoleInput = {
      user_id: user.id,
      role_id: 999 // Non-existent role ID
    };

    await expect(assignUserRole(input)).rejects.toThrow(/Role with id 999 does not exist/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create a role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const role = roleResult[0];

    const input: AssignUserRoleInput = {
      user_id: 999, // Non-existent user ID
      role_id: role.id
    };

    await expect(assignUserRole(input)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should handle multiple role assignments correctly', async () => {
    // Create multiple roles
    const adminRoleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const adminRole = adminRoleResult[0];

    const moderatorRoleResult = await db.insert(rolesTable)
      .values({
        name: 'Moderator',
        permissions: ['read', 'write'],
        is_default: false
      })
      .returning()
      .execute();
    const moderatorRole = moderatorRoleResult[0];

    const userRoleResult = await db.insert(rolesTable)
      .values({
        name: 'User',
        permissions: ['read'],
        is_default: true
      })
      .returning()
      .execute();
    const userRole = userRoleResult[0];

    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        avatar_url: null,
        gold_credits: 100,
        role_id: userRole.id, // Start as regular user
        language: 'en',
        theme: 'light',
        is_active: true,
        is_verified: true,
        last_login_at: null
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Assign moderator role
    await assignUserRole({
      user_id: user.id,
      role_id: moderatorRole.id
    });

    // Verify moderator role assignment
    let updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    expect(updatedUser[0].role_id).toEqual(moderatorRole.id);

    // Assign admin role
    await assignUserRole({
      user_id: user.id,
      role_id: adminRole.id
    });

    // Verify admin role assignment
    updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    expect(updatedUser[0].role_id).toEqual(adminRole.id);
  });

  it('should update the updated_at timestamp', async () => {
    // Create a role first
    const roleResult = await db.insert(rolesTable)
      .values({
        name: 'Admin',
        permissions: ['read', 'write', 'delete'],
        is_default: false
      })
      .returning()
      .execute();
    const role = roleResult[0];

    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        display_name: 'Test User',
        avatar_url: null,
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
    const originalUpdatedAt = user.updated_at;

    // Create another role to assign
    const newRoleResult = await db.insert(rolesTable)
      .values({
        name: 'Moderator',
        permissions: ['read', 'write'],
        is_default: false
      })
      .returning()
      .execute();
    const newRole = newRoleResult[0];

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await assignUserRole({
      user_id: user.id,
      role_id: newRole.id
    });

    // Verify updated_at timestamp was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});