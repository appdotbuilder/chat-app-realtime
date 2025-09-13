import { type EmailTemplate } from '../schema';

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all email templates,
    // validate admin privileges, support filtering by language and status,
    // and provide template management capabilities
    return Promise.resolve([
        {
            id: 1,
            template_key: 'welcome_email',
            subject: 'Welcome to ChatApp!',
            body: 'Hello {{username}}, welcome to our chat platform!',
            language: 'en',
            is_active: true,
            created_at: new Date(Date.now() - 86400000),
            updated_at: new Date(Date.now() - 86400000)
        },
        {
            id: 2,
            template_key: 'password_reset',
            subject: 'Password Reset Request',
            body: 'Click here to reset your password: {{reset_link}}',
            language: 'en',
            is_active: true,
            created_at: new Date(Date.now() - 86400000),
            updated_at: new Date(Date.now() - 86400000)
        },
        {
            id: 3,
            template_key: 'welcome_email',
            subject: 'Bienvenue sur ChatApp!',
            body: 'Bonjour {{username}}, bienvenue sur notre plateforme de chat!',
            language: 'fr',
            is_active: true,
            created_at: new Date(Date.now() - 86400000),
            updated_at: new Date(Date.now() - 86400000)
        }
    ] as EmailTemplate[]);
}