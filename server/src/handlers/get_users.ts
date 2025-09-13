import { type User } from '../schema';

export async function getUsers(): Promise<User[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all system users,
    // validate admin privileges, implement pagination,
    // include role information, and provide user search/filtering
    return Promise.resolve([
        {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            password_hash: 'hashed_password_placeholder',
            display_name: 'System Administrator',
            avatar_url: null,
            gold_credits: 1000,
            role_id: 1,
            language: 'en',
            theme: 'dark',
            is_active: true,
            is_verified: true,
            last_login_at: new Date(),
            created_at: new Date(Date.now() - 172800000),
            updated_at: new Date()
        },
        {
            id: 2,
            username: 'user1',
            email: 'user1@example.com',
            password_hash: 'hashed_password_placeholder',
            display_name: 'Regular User',
            avatar_url: null,
            gold_credits: 150,
            role_id: 2,
            language: 'en',
            theme: 'light',
            is_active: true,
            is_verified: true,
            last_login_at: new Date(Date.now() - 3600000),
            created_at: new Date(Date.now() - 86400000),
            updated_at: new Date(Date.now() - 3600000)
        }
    ] as User[]);
}