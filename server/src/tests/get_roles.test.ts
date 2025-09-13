import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rolesTable } from '../db/schema';
import { type CreateRoleInput } from '../schema';
import { getRoles } from '../handlers/get_roles';
import { eq } from 'drizzle-orm';

// Test role data
const testRoles: CreateRoleInput[] = [
  {
    name: 'Administrator',
    permissions: ['manage_users', 'manage_roles', 'manage_rooms', 'manage_settings'],
    is_default: false
  },
  {
    name: 'User',
    permissions: ['create_room', 'join_room', 'send_message'],
    is_default: true
  },
  {
    name: 'Moderator',
    permissions: ['create_room', 'join_room', 'send_message', 'moderate_rooms'],
    is_default: false
  }
];

describe('getRoles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no roles exist', async () => {
    const result = await getRoles();

    expect(result).toEqual([]);
  });

  it('should return all roles from database', async () => {
    // Create test roles
    for (const roleData of testRoles) {
      await db.insert(rolesTable)
        .values({
          name: roleData.name,
          permissions: roleData.permissions,
          is_default: roleData.is_default || false
        })
        .execute();
    }

    const result = await getRoles();

    expect(result).toHaveLength(3);
    
    // Verify all roles are present
    const roleNames = result.map(r => r.name).sort();
    expect(roleNames).toEqual(['Administrator', 'Moderator', 'User']);

    // Verify role data structure
    result.forEach(role => {
      expect(role.id).toBeDefined();
      expect(typeof role.name).toBe('string');
      expect(Array.isArray(role.permissions)).toBe(true);
      expect(typeof role.is_default).toBe('boolean');
      expect(role.created_at).toBeInstanceOf(Date);
      expect(role.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return roles ordered by creation date (newest first)', async () => {
    // Create roles in specific order with delays to ensure different timestamps
    await db.insert(rolesTable)
      .values({
        name: 'First Role',
        permissions: ['permission1'],
        is_default: false
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(rolesTable)
      .values({
        name: 'Second Role',
        permissions: ['permission2'],
        is_default: false
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(rolesTable)
      .values({
        name: 'Third Role',
        permissions: ['permission3'],
        is_default: false
      })
      .execute();

    const result = await getRoles();

    expect(result).toHaveLength(3);
    
    // Should be ordered newest first
    expect(result[0].name).toBe('Third Role');
    expect(result[1].name).toBe('Second Role');
    expect(result[2].name).toBe('First Role');

    // Verify timestamps are in descending order
    expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThanOrEqual(result[2].created_at.getTime());
  });

  it('should correctly handle role permissions array', async () => {
    const complexPermissions = [
      'manage_users',
      'manage_roles',
      'manage_rooms',
      'moderate_content',
      'view_analytics',
      'system_admin'
    ];

    await db.insert(rolesTable)
      .values({
        name: 'Super Admin',
        permissions: complexPermissions,
        is_default: false
      })
      .execute();

    const result = await getRoles();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Super Admin');
    expect(result[0].permissions).toEqual(complexPermissions);
    expect(Array.isArray(result[0].permissions)).toBe(true);
  });

  it('should handle default role flags correctly', async () => {
    // Create one default role and one non-default role
    await db.insert(rolesTable)
      .values({
        name: 'Default User',
        permissions: ['basic_access'],
        is_default: true
      })
      .execute();

    await db.insert(rolesTable)
      .values({
        name: 'Premium User',
        permissions: ['basic_access', 'premium_features'],
        is_default: false
      })
      .execute();

    const result = await getRoles();

    expect(result).toHaveLength(2);
    
    const defaultRole = result.find(r => r.name === 'Default User');
    const premiumRole = result.find(r => r.name === 'Premium User');

    expect(defaultRole?.is_default).toBe(true);
    expect(premiumRole?.is_default).toBe(false);
  });

  it('should verify roles exist in database after retrieval', async () => {
    // Create a role
    await db.insert(rolesTable)
      .values({
        name: 'Test Role',
        permissions: ['test_permission'],
        is_default: false
      })
      .execute();

    const result = await getRoles();
    const testRole = result[0];

    // Verify the role exists in database by querying directly
    const dbRoles = await db.select()
      .from(rolesTable)
      .where(eq(rolesTable.id, testRole.id))
      .execute();

    expect(dbRoles).toHaveLength(1);
    expect(dbRoles[0].name).toBe('Test Role');
    expect(dbRoles[0].permissions).toEqual(['test_permission']);
    expect(dbRoles[0].is_default).toBe(false);
  });
});