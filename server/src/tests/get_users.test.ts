import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rolesTable } from '../db/schema';
import { type GetUsersInput, getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test roles
  const createTestRole = async (name: string, permissions: string[], isDefault: boolean = false) => {
    const result = await db.insert(rolesTable)
      .values({
        name,
        permissions,
        is_default: isDefault
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test users
  const createTestUser = async (userData: {
    username: string;
    email: string;
    role_id: number;
    display_name?: string | null;
    is_active?: boolean;
    is_verified?: boolean;
    gold_credits?: number;
  }) => {
    const passwordHash = 'hashed_password_placeholder'; // Simplified for testing
    const result = await db.insert(usersTable)
      .values({
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        display_name: userData.display_name || null,
        role_id: userData.role_id,
        is_active: userData.is_active ?? true,
        is_verified: userData.is_verified ?? true,
        gold_credits: userData.gold_credits ?? 0
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should fetch all users with default pagination', async () => {
    // Create test roles
    const adminRole = await createTestRole('admin', ['read', 'write', 'admin']);
    const userRole = await createTestRole('user', ['read']);

    // Create test users
    await createTestUser({
      username: 'admin',
      email: 'admin@example.com',
      role_id: adminRole.id,
      display_name: 'Administrator',
      gold_credits: 1000
    });

    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      role_id: userRole.id,
      display_name: 'Test User',
      gold_credits: 150
    });

    const result = await getUsers({});

    expect(result).toHaveLength(2);
    expect(result[0].username).toBeDefined();
    expect(result[0].email).toBeDefined();
    expect(result[0].role_id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Should be ordered by created_at desc by default
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should filter users by active status', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create active and inactive users
    await createTestUser({
      username: 'activeuser',
      email: 'active@example.com',
      role_id: userRole.id,
      is_active: true
    });

    await createTestUser({
      username: 'inactiveuser',
      email: 'inactive@example.com',
      role_id: userRole.id,
      is_active: false
    });

    // Test filtering for active users
    const activeResult = await getUsers({ is_active: true });
    expect(activeResult).toHaveLength(1);
    expect(activeResult[0].username).toBe('activeuser');
    expect(activeResult[0].is_active).toBe(true);

    // Test filtering for inactive users
    const inactiveResult = await getUsers({ is_active: false });
    expect(inactiveResult).toHaveLength(1);
    expect(inactiveResult[0].username).toBe('inactiveuser');
    expect(inactiveResult[0].is_active).toBe(false);
  });

  it('should filter users by verification status', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create verified and unverified users
    await createTestUser({
      username: 'verifieduser',
      email: 'verified@example.com',
      role_id: userRole.id,
      is_verified: true
    });

    await createTestUser({
      username: 'unverifieduser',
      email: 'unverified@example.com',
      role_id: userRole.id,
      is_verified: false
    });

    // Test filtering for verified users
    const verifiedResult = await getUsers({ is_verified: true });
    expect(verifiedResult).toHaveLength(1);
    expect(verifiedResult[0].username).toBe('verifieduser');
    expect(verifiedResult[0].is_verified).toBe(true);

    // Test filtering for unverified users
    const unverifiedResult = await getUsers({ is_verified: false });
    expect(unverifiedResult).toHaveLength(1);
    expect(unverifiedResult[0].username).toBe('unverifieduser');
    expect(unverifiedResult[0].is_verified).toBe(false);
  });

  it('should filter users by role', async () => {
    // Create test roles
    const adminRole = await createTestRole('admin', ['read', 'write', 'admin']);
    const userRole = await createTestRole('user', ['read']);

    // Create users with different roles
    await createTestUser({
      username: 'admin',
      email: 'admin@example.com',
      role_id: adminRole.id
    });

    await createTestUser({
      username: 'user1',
      email: 'user1@example.com',
      role_id: userRole.id
    });

    await createTestUser({
      username: 'user2',
      email: 'user2@example.com',
      role_id: userRole.id
    });

    // Test filtering by admin role
    const adminResult = await getUsers({ role_id: adminRole.id });
    expect(adminResult).toHaveLength(1);
    expect(adminResult[0].username).toBe('admin');
    expect(adminResult[0].role_id).toBe(adminRole.id);

    // Test filtering by user role
    const userResult = await getUsers({ role_id: userRole.id });
    expect(userResult).toHaveLength(2);
    userResult.forEach(user => {
      expect(user.role_id).toBe(userRole.id);
    });
  });

  it('should search users by username, email, or display name', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create users with different searchable fields
    await createTestUser({
      username: 'johnsmith',
      email: 'john@example.com',
      role_id: userRole.id,
      display_name: 'John Smith'
    });

    await createTestUser({
      username: 'janedoe',
      email: 'jane.doe@company.com',
      role_id: userRole.id,
      display_name: 'Jane Doe'
    });

    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      role_id: userRole.id,
      display_name: 'Test Account'
    });

    // Search by username
    const usernameResult = await getUsers({ search: 'john' });
    expect(usernameResult).toHaveLength(1);
    expect(usernameResult[0].username).toBe('johnsmith');

    // Search by email domain
    const emailResult = await getUsers({ search: 'company' });
    expect(emailResult).toHaveLength(1);
    expect(emailResult[0].email).toBe('jane.doe@company.com');

    // Search by display name
    const displayNameResult = await getUsers({ search: 'Test Account' });
    expect(displayNameResult).toHaveLength(1);
    expect(displayNameResult[0].display_name).toBe('Test Account');

    // Case insensitive search
    const caseInsensitiveResult = await getUsers({ search: 'JANE' });
    expect(caseInsensitiveResult).toHaveLength(1);
    expect(caseInsensitiveResult[0].username).toBe('janedoe');
  });

  it('should apply pagination correctly', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create multiple users
    for (let i = 1; i <= 5; i++) {
      await createTestUser({
        username: `user${i}`,
        email: `user${i}@example.com`,
        role_id: userRole.id
      });
    }

    // Test first page with limit 2
    const page1 = await getUsers({ limit: 2, offset: 0 });
    expect(page1).toHaveLength(2);

    // Test second page with limit 2
    const page2 = await getUsers({ limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);

    // Test third page with limit 2
    const page3 = await getUsers({ limit: 2, offset: 4 });
    expect(page3).toHaveLength(1);

    // Ensure no overlap between pages
    const page1Ids = page1.map(u => u.id);
    const page2Ids = page2.map(u => u.id);
    const page3Ids = page3.map(u => u.id);

    expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    expect(page1Ids.some(id => page3Ids.includes(id))).toBe(false);
    expect(page2Ids.some(id => page3Ids.includes(id))).toBe(false);
  });

  it('should order users correctly', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create users with different usernames and gold credits
    await createTestUser({
      username: 'alpha',
      email: 'alpha@example.com',
      role_id: userRole.id,
      gold_credits: 100
    });

    await createTestUser({
      username: 'beta',
      email: 'beta@example.com',
      role_id: userRole.id,
      gold_credits: 300
    });

    await createTestUser({
      username: 'gamma',
      email: 'gamma@example.com',
      role_id: userRole.id,
      gold_credits: 200
    });

    // Test ordering by username ascending
    const usernameAsc = await getUsers({ 
      order_by: 'username', 
      order_direction: 'asc' 
    });
    expect(usernameAsc[0].username).toBe('alpha');
    expect(usernameAsc[1].username).toBe('beta');
    expect(usernameAsc[2].username).toBe('gamma');

    // Test ordering by gold_credits descending
    const goldDesc = await getUsers({ 
      order_by: 'gold_credits', 
      order_direction: 'desc' 
    });
    expect(goldDesc[0].gold_credits).toBe(300);
    expect(goldDesc[1].gold_credits).toBe(200);
    expect(goldDesc[2].gold_credits).toBe(100);
  });

  it('should combine multiple filters correctly', async () => {
    // Create test roles
    const adminRole = await createTestRole('admin', ['read', 'write', 'admin']);
    const userRole = await createTestRole('user', ['read']);

    // Create users with various attributes
    await createTestUser({
      username: 'activeadmin',
      email: 'admin@example.com',
      role_id: adminRole.id,
      is_active: true,
      is_verified: true,
      gold_credits: 1000
    });

    await createTestUser({
      username: 'inactiveadmin',
      email: 'inactive.admin@example.com',
      role_id: adminRole.id,
      is_active: false,
      is_verified: true
    });

    await createTestUser({
      username: 'activeuser',
      email: 'user@example.com',
      role_id: userRole.id,
      is_active: true,
      is_verified: false
    });

    // Test combining role and active filters
    const activeAdmins = await getUsers({
      role_id: adminRole.id,
      is_active: true
    });
    expect(activeAdmins).toHaveLength(1);
    expect(activeAdmins[0].username).toBe('activeadmin');
    expect(activeAdmins[0].role_id).toBe(adminRole.id);
    expect(activeAdmins[0].is_active).toBe(true);

    // Test combining multiple filters with search
    const searchAndFilter = await getUsers({
      search: 'admin',
      is_active: true,
      is_verified: true
    });
    expect(searchAndFilter).toHaveLength(1);
    expect(searchAndFilter[0].username).toBe('activeadmin');
  });

  it('should return empty array when no users match filters', async () => {
    // Create test roles
    const userRole = await createTestRole('user', ['read']);

    // Create a user
    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      role_id: userRole.id,
      is_active: true
    });

    // Search for non-existent user
    const result = await getUsers({ search: 'nonexistent' });
    expect(result).toHaveLength(0);

    // Filter for non-existent role
    const roleResult = await getUsers({ role_id: 999 });
    expect(roleResult).toHaveLength(0);
  });
});