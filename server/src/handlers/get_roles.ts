import { type Role } from '../schema';

export async function getRoles(): Promise<Role[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all system roles,
    // validate admin access permissions, and return role configurations
    // for administrative interface
    return Promise.resolve([
        {
            id: 1,
            name: 'Administrator',
            permissions: ['manage_users', 'manage_roles', 'manage_rooms', 'manage_settings'],
            is_default: false,
            created_at: new Date(Date.now() - 172800000), // 2 days ago
            updated_at: new Date(Date.now() - 172800000)
        },
        {
            id: 2,
            name: 'User',
            permissions: ['create_room', 'join_room', 'send_message'],
            is_default: true,
            created_at: new Date(Date.now() - 172800000),
            updated_at: new Date(Date.now() - 172800000)
        },
        {
            id: 3,
            name: 'Moderator',
            permissions: ['create_room', 'join_room', 'send_message', 'moderate_rooms', 'manage_participants'],
            is_default: false,
            created_at: new Date(Date.now() - 86400000), // 1 day ago
            updated_at: new Date(Date.now() - 86400000)
        }
    ] as Role[]);
}