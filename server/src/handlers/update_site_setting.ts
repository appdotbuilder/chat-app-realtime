import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { type UpdateSiteSettingInput, type SiteSetting } from '../schema';
import { eq, sql } from 'drizzle-orm';

// Validate setting value format based on setting type
const validateSettingValue = (value: string, type: string): boolean => {
  switch (type) {
    case 'string':
      return true; // Any string is valid
    case 'number':
      return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
    case 'boolean':
      return value === 'true' || value === 'false';
    case 'json':
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    default:
      return false;
  }
};

export const updateSiteSetting = async (input: UpdateSiteSettingInput): Promise<SiteSetting> => {
  try {
    // Check if setting exists
    const existingSettings = await db.select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.setting_key, input.setting_key))
      .execute();

    const existingSetting = existingSettings[0];

    // Determine the setting type to use for validation
    const settingType = input.setting_type || (existingSetting?.setting_type) || 'string';

    // Validate setting value format
    if (!validateSettingValue(input.setting_value, settingType)) {
      throw new Error(`Invalid value format for setting type '${settingType}'. Value: '${input.setting_value}'`);
    }

    let result;

    if (existingSetting) {
      // Update existing setting
      const updateResult = await db.update(siteSettingsTable)
        .set({
          setting_value: input.setting_value,
          setting_type: settingType,
          description: input.description !== undefined ? input.description : existingSetting.description,
          is_public: input.is_public !== undefined ? input.is_public : existingSetting.is_public,
          updated_at: sql`now()`
        })
        .where(eq(siteSettingsTable.setting_key, input.setting_key))
        .returning()
        .execute();

      result = updateResult[0];
    } else {
      // Create new setting
      const insertResult = await db.insert(siteSettingsTable)
        .values({
          setting_key: input.setting_key,
          setting_value: input.setting_value,
          setting_type: settingType,
          description: input.description || null,
          is_public: input.is_public !== undefined ? input.is_public : false
        })
        .returning()
        .execute();

      result = insertResult[0];
    }

    return result;
  } catch (error) {
    console.error('Site setting update failed:', error);
    throw error;
  }
};