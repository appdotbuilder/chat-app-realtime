import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { getSiteSettings } from '../handlers/get_site_settings';

describe('getSiteSettings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test settings
  const createTestSettings = async () => {
    await db.insert(siteSettingsTable)
      .values([
        {
          setting_key: 'site_name',
          setting_value: 'ChatApp',
          setting_type: 'string',
          description: 'The name of the chat application',
          is_public: true
        },
        {
          setting_key: 'max_message_length',
          setting_value: '1000',
          setting_type: 'number',
          description: 'Maximum allowed characters in a message',
          is_public: true
        },
        {
          setting_key: 'registration_enabled',
          setting_value: 'true',
          setting_type: 'boolean',
          description: 'Whether new user registration is allowed',
          is_public: false
        },
        {
          setting_key: 'supported_languages',
          setting_value: '["en", "fr", "es", "de"]',
          setting_type: 'json',
          description: 'List of supported interface languages',
          is_public: true
        },
        {
          setting_key: 'secret_key',
          setting_value: 'top-secret-value',
          setting_type: 'string',
          description: 'Private configuration value',
          is_public: false
        }
      ])
      .execute();
  };

  it('should fetch all site settings when publicOnly is false', async () => {
    await createTestSettings();

    const result = await getSiteSettings(false);

    expect(result).toHaveLength(5);
    
    // Verify we get both public and private settings
    const publicSettings = result.filter(s => s.is_public);
    const privateSettings = result.filter(s => !s.is_public);
    
    expect(publicSettings).toHaveLength(3);
    expect(privateSettings).toHaveLength(2);

    // Verify specific settings exist
    const siteNameSetting = result.find(s => s.setting_key === 'site_name');
    expect(siteNameSetting).toBeDefined();
    expect(siteNameSetting?.setting_value).toEqual('ChatApp');
    expect(siteNameSetting?.setting_type).toEqual('string');
    expect(siteNameSetting?.is_public).toBe(true);

    const secretSetting = result.find(s => s.setting_key === 'secret_key');
    expect(secretSetting).toBeDefined();
    expect(secretSetting?.is_public).toBe(false);
  });

  it('should fetch only public settings when publicOnly is true', async () => {
    await createTestSettings();

    const result = await getSiteSettings(true);

    expect(result).toHaveLength(3);
    
    // Verify all returned settings are public
    result.forEach(setting => {
      expect(setting.is_public).toBe(true);
    });

    // Verify specific public settings exist
    const publicKeys = result.map(s => s.setting_key);
    expect(publicKeys).toContain('site_name');
    expect(publicKeys).toContain('max_message_length');
    expect(publicKeys).toContain('supported_languages');

    // Verify private settings are excluded
    expect(publicKeys).not.toContain('registration_enabled');
    expect(publicKeys).not.toContain('secret_key');
  });

  it('should return empty array when no settings exist', async () => {
    const result = await getSiteSettings();

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no public settings exist', async () => {
    // Create only private settings
    await db.insert(siteSettingsTable)
      .values([
        {
          setting_key: 'private_setting_1',
          setting_value: 'value1',
          setting_type: 'string',
          is_public: false
        },
        {
          setting_key: 'private_setting_2',
          setting_value: 'value2',
          setting_type: 'string',
          is_public: false
        }
      ])
      .execute();

    const result = await getSiteSettings(true);

    expect(result).toHaveLength(0);
  });

  it('should handle different setting types correctly', async () => {
    await db.insert(siteSettingsTable)
      .values([
        {
          setting_key: 'string_setting',
          setting_value: 'test_value',
          setting_type: 'string',
          is_public: true
        },
        {
          setting_key: 'number_setting',
          setting_value: '42',
          setting_type: 'number',
          is_public: true
        },
        {
          setting_key: 'boolean_setting',
          setting_value: 'false',
          setting_type: 'boolean',
          is_public: true
        },
        {
          setting_key: 'json_setting',
          setting_value: '{"key": "value", "array": [1, 2, 3]}',
          setting_type: 'json',
          is_public: true
        }
      ])
      .execute();

    const result = await getSiteSettings();

    expect(result).toHaveLength(4);

    const stringSettings = result.filter(s => s.setting_type === 'string');
    const numberSettings = result.filter(s => s.setting_type === 'number');
    const booleanSettings = result.filter(s => s.setting_type === 'boolean');
    const jsonSettings = result.filter(s => s.setting_type === 'json');

    expect(stringSettings).toHaveLength(1);
    expect(numberSettings).toHaveLength(1);
    expect(booleanSettings).toHaveLength(1);
    expect(jsonSettings).toHaveLength(1);

    // Verify the actual values are preserved as strings (as expected from DB)
    expect(stringSettings[0].setting_value).toEqual('test_value');
    expect(numberSettings[0].setting_value).toEqual('42');
    expect(booleanSettings[0].setting_value).toEqual('false');
    expect(jsonSettings[0].setting_value).toEqual('{"key": "value", "array": [1, 2, 3]}');
  });

  it('should include all database fields in response', async () => {
    await db.insert(siteSettingsTable)
      .values([
        {
          setting_key: 'test_setting',
          setting_value: 'test_value',
          setting_type: 'string',
          description: 'Test setting for validation',
          is_public: true
        }
      ])
      .execute();

    const result = await getSiteSettings();

    expect(result).toHaveLength(1);
    const setting = result[0];

    // Verify all expected fields are present
    expect(setting.id).toBeDefined();
    expect(typeof setting.id).toBe('number');
    expect(setting.setting_key).toEqual('test_setting');
    expect(setting.setting_value).toEqual('test_value');
    expect(setting.setting_type).toEqual('string');
    expect(setting.description).toEqual('Test setting for validation');
    expect(setting.is_public).toBe(true);
    expect(setting.created_at).toBeInstanceOf(Date);
    expect(setting.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null descriptions correctly', async () => {
    await db.insert(siteSettingsTable)
      .values([
        {
          setting_key: 'no_description_setting',
          setting_value: 'some_value',
          setting_type: 'string',
          description: null,
          is_public: true
        }
      ])
      .execute();

    const result = await getSiteSettings();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(null);
    expect(result[0].setting_key).toEqual('no_description_setting');
  });

  it('should default publicOnly parameter correctly', async () => {
    await createTestSettings();

    // Call without parameter (should default to false)
    const resultDefault = await getSiteSettings();
    
    // Call with explicit false
    const resultExplicitFalse = await getSiteSettings(false);

    expect(resultDefault).toHaveLength(5);
    expect(resultExplicitFalse).toHaveLength(5);
    expect(resultDefault.length).toEqual(resultExplicitFalse.length);

    // Both should include private settings
    expect(resultDefault.some(s => !s.is_public)).toBe(true);
    expect(resultExplicitFalse.some(s => !s.is_public)).toBe(true);
  });
});