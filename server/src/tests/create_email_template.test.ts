import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { emailTemplatesTable } from '../db/schema';
import { type CreateEmailTemplateInput } from '../schema';
import { createEmailTemplate } from '../handlers/create_email_template';
import { eq } from 'drizzle-orm';

// Complete test input with all required fields
const testInput: CreateEmailTemplateInput = {
  template_key: 'welcome_email',
  subject: 'Welcome to Chat App',
  body: 'Hello {{username}}, welcome to our chat application! We are excited to have you on board.',
  language: 'en',
  is_active: true
};

describe('createEmailTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an email template with all fields', async () => {
    const result = await createEmailTemplate(testInput);

    // Validate all returned fields
    expect(result.template_key).toEqual('welcome_email');
    expect(result.subject).toEqual('Welcome to Chat App');
    expect(result.body).toEqual(testInput.body);
    expect(result.language).toEqual('en');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save email template to database', async () => {
    const result = await createEmailTemplate(testInput);

    // Query the database to verify template was saved
    const templates = await db.select()
      .from(emailTemplatesTable)
      .where(eq(emailTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    const savedTemplate = templates[0];
    expect(savedTemplate.template_key).toEqual('welcome_email');
    expect(savedTemplate.subject).toEqual('Welcome to Chat App');
    expect(savedTemplate.body).toEqual(testInput.body);
    expect(savedTemplate.language).toEqual('en');
    expect(savedTemplate.is_active).toEqual(true);
    expect(savedTemplate.created_at).toBeInstanceOf(Date);
    expect(savedTemplate.updated_at).toBeInstanceOf(Date);
  });

  it('should use default is_active value when not provided', async () => {
    const inputWithoutActive: CreateEmailTemplateInput = {
      template_key: 'password_reset',
      subject: 'Reset Your Password',
      body: 'Click here to reset your password: {{reset_link}}',
      language: 'en'
    };

    const result = await createEmailTemplate(inputWithoutActive);

    expect(result.is_active).toEqual(true);
    expect(result.template_key).toEqual('password_reset');
    expect(result.subject).toEqual('Reset Your Password');
    expect(result.language).toEqual('en');
  });

  it('should create template with is_active false when explicitly set', async () => {
    const inactiveInput: CreateEmailTemplateInput = {
      template_key: 'inactive_template',
      subject: 'Inactive Template',
      body: 'This template is inactive',
      language: 'en',
      is_active: false
    };

    const result = await createEmailTemplate(inactiveInput);

    expect(result.is_active).toEqual(false);
    expect(result.template_key).toEqual('inactive_template');
  });

  it('should support different languages', async () => {
    const spanishInput: CreateEmailTemplateInput = {
      template_key: 'bienvenida',
      subject: 'Bienvenido a Chat App',
      body: 'Hola {{username}}, ¡bienvenido a nuestra aplicación de chat!',
      language: 'es',
      is_active: true
    };

    const result = await createEmailTemplate(spanishInput);

    expect(result.language).toEqual('es');
    expect(result.subject).toEqual('Bienvenido a Chat App');
    expect(result.body).toEqual('Hola {{username}}, ¡bienvenido a nuestra aplicación de chat!');
  });

  it('should handle template with long body content', async () => {
    const longBodyInput: CreateEmailTemplateInput = {
      template_key: 'newsletter',
      subject: 'Monthly Newsletter',
      body: `
        <html>
          <body>
            <h1>Welcome to our newsletter</h1>
            <p>This is a longer email template with HTML content and multiple lines.</p>
            <ul>
              <li>Feature 1: New chat rooms</li>
              <li>Feature 2: Enhanced messaging</li>
              <li>Feature 3: Gold credit system</li>
            </ul>
            <p>Thank you for being part of our community, {{username}}!</p>
          </body>
        </html>
      `.trim(),
      language: 'en',
      is_active: true
    };

    const result = await createEmailTemplate(longBodyInput);

    expect(result.template_key).toEqual('newsletter');
    expect(result.body).toContain('<html>');
    expect(result.body).toContain('{{username}}');
    expect(result.body.length).toBeGreaterThan(100);
  });

  it('should handle template keys with special characters', async () => {
    const specialKeyInput: CreateEmailTemplateInput = {
      template_key: 'user_verification_v2',
      subject: 'Verify Your Account - Version 2',
      body: 'Please verify your account by clicking: {{verification_link}}',
      language: 'en',
      is_active: true
    };

    const result = await createEmailTemplate(specialKeyInput);

    expect(result.template_key).toEqual('user_verification_v2');
    expect(result.subject).toEqual('Verify Your Account - Version 2');
  });

  it('should allow same template key with different languages', async () => {
    // Create English template
    const englishTemplate = await createEmailTemplate(testInput);

    // Create Spanish template with same key
    const spanishInput: CreateEmailTemplateInput = {
      template_key: 'welcome_email', // Same key as testInput
      subject: 'Bienvenido a Chat App',
      body: 'Hola {{username}}, ¡bienvenido!',
      language: 'es',
      is_active: true
    };

    const spanishTemplate = await createEmailTemplate(spanishInput);

    // Both templates should exist with different IDs
    expect(englishTemplate.id).not.toEqual(spanishTemplate.id);
    expect(englishTemplate.template_key).toEqual(spanishTemplate.template_key);
    expect(englishTemplate.language).toEqual('en');
    expect(spanishTemplate.language).toEqual('es');
  });

  it('should allow duplicate template keys (no unique constraint)', async () => {
    // Create first template
    const firstTemplate = await createEmailTemplate(testInput);

    // Create second template with same key and language
    const secondTemplate = await createEmailTemplate(testInput);

    // Both should succeed and have different IDs
    expect(firstTemplate.id).not.toEqual(secondTemplate.id);
    expect(firstTemplate.template_key).toEqual(secondTemplate.template_key);
    expect(firstTemplate.language).toEqual(secondTemplate.language);
  });
});