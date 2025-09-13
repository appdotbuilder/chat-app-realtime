import { db } from '../db';
import { emailTemplatesTable } from '../db/schema';
import { type EmailTemplate } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export interface GetEmailTemplatesFilters {
  language?: string;
  is_active?: boolean;
  template_key?: string;
}

export const getEmailTemplates = async (filters?: GetEmailTemplatesFilters): Promise<EmailTemplate[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters?.language) {
      conditions.push(eq(emailTemplatesTable.language, filters.language));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(emailTemplatesTable.is_active, filters.is_active));
    }

    if (filters?.template_key) {
      conditions.push(eq(emailTemplatesTable.template_key, filters.template_key));
    }

    // Build and execute query
    const query = conditions.length > 0
      ? db.select()
          .from(emailTemplatesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : db.select().from(emailTemplatesTable);

    const results = await query.execute();
    return results;
  } catch (error) {
    console.error('Failed to fetch email templates:', error);
    throw error;
  }
};