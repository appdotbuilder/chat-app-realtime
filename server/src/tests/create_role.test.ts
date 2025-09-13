import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rolesTable } from '../db/schema';
import { type CreateRoleInput } from '../schema';
import { createRole } from '../handlers/create_role';
import { eq } from 'drizzle-orm';

// Test input for basic role
const testInput: CreateRoleInput = {
  name: 'Test Role',
  permissions: ['read:messages', 'write:messages', 'join:rooms'],
  is_default: false
};

// Test input for admin role
const adminInput: CreateRoleInput = {
  name: 'Admin Role',
  permissions: ['admin:all', 'manage:users', 'manage:rooms', 'manage:settings'],
  is_default: false
};

// Test input for default role
const defaultRoleInput: CreateRoleInput = {
  name: 'Default User',
  permissions: ['read:messages', 'write:messages'],
  is_default: true
};

describe('createRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a role successfully', async () => {
    const result = await createRole(testInput);

    // Verify returned role data
    expect(result.name).toEqual('Test Role');
    expect(result.permissions).toEqual(['read:messages', 'write:messages', 'join:rooms']);
    expect(result.is_default).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save role to database', async () => {
    const result = await createRole(testInput);

    // Verify role is saved in database
    const roles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.id, result.id))
      .execute();

    expect(roles).toHaveLength(1);
    expect(roles[0].name).toEqual('Test Role');
    expect(roles[0].permissions).toEqual(['read:messages', 'write:messages', 'join:rooms']);
    expect(roles[0].is_default).toEqual(false);
    expect(roles[0].created_at).toBeInstanceOf(Date);
    expect(roles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle role with admin permissions', async () => {
    const result = await createRole(adminInput);

    expect(result.name).toEqual('Admin Role');
    expect(result.permissions).toEqual(['admin:all', 'manage:users', 'manage:rooms', 'manage:settings']);
    expect(result.is_default).toEqual(false);
  });

  it('should create default role and unset existing default', async () => {
    // First create a default role
    const firstDefault = await createRole({
      name: 'First Default',
      permissions: ['basic:access'],
      is_default: true
    });

    expect(firstDefault.is_default).toEqual(true);

    // Create another default role - should unset the first one
    const secondDefault = await createRole(defaultRoleInput);

    expect(secondDefault.is_default).toEqual(true);

    // Verify first default role is no longer default
    const firstRoleUpdated = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.id, firstDefault.id))
      .execute();

    expect(firstRoleUpdated[0].is_default).toEqual(false);

    // Verify second role is default
    const secondRoleCheck = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.id, secondDefault.id))
      .execute();

    expect(secondRoleCheck[0].is_default).toEqual(true);
  });

  it('should create role when is_default is not provided', async () => {
    const inputWithoutDefault: CreateRoleInput = {
      name: 'No Default Role',
      permissions: ['read:basic']
    };

    const result = await createRole(inputWithoutDefault);

    expect(result.is_default).toEqual(false);
  });

  it('should throw error for duplicate role names', async () => {
    // Create first role
    await createRole(testInput);

    // Attempt to create role with same name
    await expect(createRole(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle empty permissions array', async () => {
    const emptyPermissionsInput: CreateRoleInput = {
      name: 'Empty Permissions Role',
      permissions: [],
      is_default: false
    };

    const result = await createRole(emptyPermissionsInput);

    expect(result.name).toEqual('Empty Permissions Role');
    expect(result.permissions).toEqual([]);
    expect(result.is_default).toEqual(false);
  });

  it('should handle role names with special characters', async () => {
    const specialNameInput: CreateRoleInput = {
      name: 'Super-Admin_2024!',
      permissions: ['admin:all'],
      is_default: false
    };

    const result = await createRole(specialNameInput);

    expect(result.name).toEqual('Super-Admin_2024!');
  });

  it('should verify only one default role exists after multiple operations', async () => {
    // Create multiple non-default roles
    await createRole({
      name: 'Role 1',
      permissions: ['perm1'],
      is_default: false
    });

    await createRole({
      name: 'Role 2', 
      permissions: ['perm2'],
      is_default: false
    });

    // Create a default role
    await createRole({
      name: 'Default Role',
      permissions: ['default'],
      is_default: true
    });

    // Verify only one default role exists
    const defaultRoles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.is_default, true))
      .execute();

    expect(defaultRoles).toHaveLength(1);
    expect(defaultRoles[0].name).toEqual('Default Role');
  });
});