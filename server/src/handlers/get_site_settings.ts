import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { type SiteSetting } from '../schema';
import { eq } from 'drizzle-orm';

export const getSiteSettings = async (publicOnly: boolean = false): Promise<SiteSetting[]> => {
  try {
    // Build query with conditional filter
    if (publicOnly) {
      const results = await db.select()
        .from(siteSettingsTable)
        .where(eq(siteSettingsTable.is_public, true))
        .execute();
      
      return results;
    } else {
      const results = await db.select()
        .from(siteSettingsTable)
        .execute();
      
      return results;
    }
  } catch (error) {
    console.error('Site settings fetch failed:', error);
    throw error;
  }
};