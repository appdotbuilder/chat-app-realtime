import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailTemplatesTable } from '../db/schema';
import { getEmailTemplates, type GetEmailTemplatesFilters } from '../handlers/get_email_templates';

describe('getEmailTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const createTestTemplates = async () => {
    await db.insert(emailTemplatesTable).values([
      {
        template_key: 'welcome_email',
        subject: 'Welcome to ChatApp!',
        body: 'Hello {{username}}, welcome to our platform!',
        language: 'en',
        is_active: true
      },
      {
        template_key: 'password_reset',
        subject: 'Password Reset Request',
        body: 'Click here to reset: {{reset_link}}',
        language: 'en',
        is_active: true
      },
      {
        template_key: 'welcome_email',
        subject: 'Bienvenue sur ChatApp!',
        body: 'Bonjour {{username}}, bienvenue!',
        language: 'fr',
        is_active: true
      },
      {
        template_key: 'inactive_template',
        subject: 'Inactive Template',
        body: 'This template is inactive',
        language: 'en',
        is_active: false
      }
    ]).execute();
  };

  it('should fetch all email templates when no filters provided', async () => {
    await createTestTemplates();

    const result = await getEmailTemplates();

    expect(result).toHaveLength(4);
    expect(result[0].template_key).toBeDefined();
    expect(result[0].subject).toBeDefined();
    expect(result[0].body).toBeDefined();
    expect(result[0].language).toBeDefined();
    expect(typeof result[0].is_active).toBe('boolean');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter templates by language', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      language: 'fr'
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('fr');
    expect(result[0].template_key).toBe('welcome_email');
    expect(result[0].subject).toBe('Bienvenue sur ChatApp!');
  });

  it('should filter templates by active status', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      is_active: false
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].is_active).toBe(false);
    expect(result[0].template_key).toBe('inactive_template');
  });

  it('should filter templates by template_key', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      template_key: 'password_reset'
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].template_key).toBe('password_reset');
    expect(result[0].subject).toBe('Password Reset Request');
  });

  it('should apply multiple filters together', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      language: 'en',
      is_active: true
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(2);
    result.forEach(template => {
      expect(template.language).toBe('en');
      expect(template.is_active).toBe(true);
    });

    const templateKeys = result.map(t => t.template_key);
    expect(templateKeys).toContain('welcome_email');
    expect(templateKeys).toContain('password_reset');
  });

  it('should apply all filters together', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      template_key: 'welcome_email',
      language: 'fr',
      is_active: true
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(1);
    expect(result[0].template_key).toBe('welcome_email');
    expect(result[0].language).toBe('fr');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no templates match filters', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      language: 'es' // Spanish templates don't exist
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no templates exist', async () => {
    // Don't create any test templates

    const result = await getEmailTemplates();

    expect(result).toHaveLength(0);
  });

  it('should handle filtering for active templates only', async () => {
    await createTestTemplates();

    const filters: GetEmailTemplatesFilters = {
      is_active: true
    };

    const result = await getEmailTemplates(filters);

    expect(result).toHaveLength(3);
    result.forEach(template => {
      expect(template.is_active).toBe(true);
    });
  });

  it('should preserve all template fields in results', async () => {
    await db.insert(emailTemplatesTable).values({
      template_key: 'test_template',
      subject: 'Test Subject',
      body: 'Test body with {{variable}}',
      language: 'en',
      is_active: true
    }).execute();

    const result = await getEmailTemplates();

    expect(result).toHaveLength(1);
    const template = result[0];
    
    expect(template.id).toBeDefined();
    expect(template.template_key).toBe('test_template');
    expect(template.subject).toBe('Test Subject');
    expect(template.body).toBe('Test body with {{variable}}');
    expect(template.language).toBe('en');
    expect(template.is_active).toBe(true);
    expect(template.created_at).toBeInstanceOf(Date);
    expect(template.updated_at).toBeInstanceOf(Date);
  });
});