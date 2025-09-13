import { db } from '../db';
import { emailTemplatesTable } from '../db/schema';
import { type CreateEmailTemplateInput, type EmailTemplate } from '../schema';

export const createEmailTemplate = async (input: CreateEmailTemplateInput): Promise<EmailTemplate> => {
  try {
    // Insert email template record
    const result = await db.insert(emailTemplatesTable)
      .values({
        template_key: input.template_key,
        subject: input.subject,
        body: input.body,
        language: input.language,
        is_active: input.is_active ?? true // Use default if not provided
      })
      .returning()
      .execute();

    const emailTemplate = result[0];
    return emailTemplate;
  } catch (error) {
    console.error('Email template creation failed:', error);
    throw error;
  }
};