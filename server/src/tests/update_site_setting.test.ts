import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { siteSettingsTable } from '../db/schema';
import { type UpdateSiteSettingInput } from '../schema';
import { updateSiteSetting } from '../handlers/update_site_setting';
import { eq } from 'drizzle-orm';

// Test input for creating/updating a string setting
const testStringInput: UpdateSiteSettingInput = {
  setting_key: 'site_name',
  setting_value: 'My Chat Platform',
  setting_type: 'string',
  description: 'The main site name',
  is_public: true
};

// Test input for creating a number setting
const testNumberInput: UpdateSiteSettingInput = {
  setting_key: 'max_users',
  setting_value: '1000',
  setting_type: 'number',
  description: 'Maximum number of users',
  is_public: false
};

// Test input for creating a boolean setting
const testBooleanInput: UpdateSiteSettingInput = {
  setting_key: 'maintenance_mode',
  setting_value: 'true',
  setting_type: 'boolean',
  description: 'Whether site is in maintenance mode',
  is_public: true
};

// Test input for creating a JSON setting
const testJsonInput: UpdateSiteSettingInput = {
  setting_key: 'feature_flags',
  setting_value: '{"chat_enabled":true,"file_upload":false}',
  setting_type: 'json',
  description: 'Feature flags configuration'
};

describe('updateSiteSetting', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new string setting', async () => {
    const result = await updateSiteSetting(testStringInput);

    expect(result.setting_key).toEqual('site_name');
    expect(result.setting_value).toEqual('My Chat Platform');
    expect(result.setting_type).toEqual('string');
    expect(result.description).toEqual('The main site name');
    expect(result.is_public).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a new number setting', async () => {
    const result = await updateSiteSetting(testNumberInput);

    expect(result.setting_key).toEqual('max_users');
    expect(result.setting_value).toEqual('1000');
    expect(result.setting_type).toEqual('number');
    expect(result.description).toEqual('Maximum number of users');
    expect(result.is_public).toBe(false);
    expect(result.id).toBeDefined();
  });

  it('should create a new boolean setting', async () => {
    const result = await updateSiteSetting(testBooleanInput);

    expect(result.setting_key).toEqual('maintenance_mode');
    expect(result.setting_value).toEqual('true');
    expect(result.setting_type).toEqual('boolean');
    expect(result.description).toEqual('Whether site is in maintenance mode');
    expect(result.is_public).toBe(true);
  });

  it('should create a new JSON setting', async () => {
    const result = await updateSiteSetting(testJsonInput);

    expect(result.setting_key).toEqual('feature_flags');
    expect(result.setting_value).toEqual('{"chat_enabled":true,"file_upload":false}');
    expect(result.setting_type).toEqual('json');
    expect(result.description).toEqual('Feature flags configuration');
    expect(result.is_public).toBe(false); // Default value when not specified
  });

  it('should update an existing setting', async () => {
    // Create initial setting
    const initialResult = await updateSiteSetting(testStringInput);
    expect(initialResult.setting_value).toEqual('My Chat Platform');

    // Update the setting
    const updateInput: UpdateSiteSettingInput = {
      setting_key: 'site_name',
      setting_value: 'Updated Chat Platform',
      description: 'Updated description'
    };

    const updatedResult = await updateSiteSetting(updateInput);

    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.setting_key).toEqual('site_name');
    expect(updatedResult.setting_value).toEqual('Updated Chat Platform');
    expect(updatedResult.setting_type).toEqual('string'); // Should preserve original type
    expect(updatedResult.description).toEqual('Updated description');
    expect(updatedResult.is_public).toBe(true); // Should preserve original is_public
    expect(updatedResult.updated_at > initialResult.updated_at).toBe(true);
  });

  it('should preserve existing fields when updating partially', async () => {
    // Create initial setting
    const initialResult = await updateSiteSetting(testNumberInput);

    // Update only the value
    const partialUpdateInput: UpdateSiteSettingInput = {
      setting_key: 'max_users',
      setting_value: '2000'
    };

    const updatedResult = await updateSiteSetting(partialUpdateInput);

    expect(updatedResult.id).toEqual(initialResult.id);
    expect(updatedResult.setting_value).toEqual('2000');
    expect(updatedResult.setting_type).toEqual('number'); // Should preserve
    expect(updatedResult.description).toEqual('Maximum number of users'); // Should preserve
    expect(updatedResult.is_public).toBe(false); // Should preserve
  });

  it('should save setting to database', async () => {
    const result = await updateSiteSetting(testStringInput);

    const settingsInDb = await db.select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.id, result.id))
      .execute();

    expect(settingsInDb).toHaveLength(1);
    expect(settingsInDb[0].setting_key).toEqual('site_name');
    expect(settingsInDb[0].setting_value).toEqual('My Chat Platform');
    expect(settingsInDb[0].setting_type).toEqual('string');
    expect(settingsInDb[0].is_public).toBe(true);
  });

  it('should default to string type when not specified', async () => {
    const inputWithoutType: UpdateSiteSettingInput = {
      setting_key: 'default_type_test',
      setting_value: 'some value'
    };

    const result = await updateSiteSetting(inputWithoutType);

    expect(result.setting_type).toEqual('string');
    expect(result.description).toBeNull();
    expect(result.is_public).toBe(false);
  });

  it('should validate number setting values', async () => {
    const invalidNumberInput: UpdateSiteSettingInput = {
      setting_key: 'invalid_number',
      setting_value: 'not_a_number',
      setting_type: 'number'
    };

    expect(updateSiteSetting(invalidNumberInput)).rejects.toThrow(/invalid value format for setting type 'number'/i);
  });

  it('should validate boolean setting values', async () => {
    const invalidBooleanInput: UpdateSiteSettingInput = {
      setting_key: 'invalid_boolean',
      setting_value: 'maybe',
      setting_type: 'boolean'
    };

    expect(updateSiteSetting(invalidBooleanInput)).rejects.toThrow(/invalid value format for setting type 'boolean'/i);
  });

  it('should validate JSON setting values', async () => {
    const invalidJsonInput: UpdateSiteSettingInput = {
      setting_key: 'invalid_json',
      setting_value: '{"incomplete": json',
      setting_type: 'json'
    };

    expect(updateSiteSetting(invalidJsonInput)).rejects.toThrow(/invalid value format for setting type 'json'/i);
  });

  it('should accept valid boolean values', async () => {
    const trueBoolInput: UpdateSiteSettingInput = {
      setting_key: 'bool_true',
      setting_value: 'true',
      setting_type: 'boolean'
    };

    const falseBoolInput: UpdateSiteSettingInput = {
      setting_key: 'bool_false',
      setting_value: 'false',
      setting_type: 'boolean'
    };

    const trueResult = await updateSiteSetting(trueBoolInput);
    const falseResult = await updateSiteSetting(falseBoolInput);

    expect(trueResult.setting_value).toEqual('true');
    expect(falseResult.setting_value).toEqual('false');
  });

  it('should accept valid number values including decimals', async () => {
    const integerInput: UpdateSiteSettingInput = {
      setting_key: 'integer_val',
      setting_value: '42',
      setting_type: 'number'
    };

    const decimalInput: UpdateSiteSettingInput = {
      setting_key: 'decimal_val',
      setting_value: '3.14159',
      setting_type: 'number'
    };

    const integerResult = await updateSiteSetting(integerInput);
    const decimalResult = await updateSiteSetting(decimalInput);

    expect(integerResult.setting_value).toEqual('42');
    expect(decimalResult.setting_value).toEqual('3.14159');
  });

  it('should accept valid JSON objects and arrays', async () => {
    const objectInput: UpdateSiteSettingInput = {
      setting_key: 'json_object',
      setting_value: '{"name":"test","active":true,"count":5}',
      setting_type: 'json'
    };

    const arrayInput: UpdateSiteSettingInput = {
      setting_key: 'json_array',
      setting_value: '[1,2,3,"test",true]',
      setting_type: 'json'
    };

    const objectResult = await updateSiteSetting(objectInput);
    const arrayResult = await updateSiteSetting(arrayInput);

    expect(objectResult.setting_value).toEqual('{"name":"test","active":true,"count":5}');
    expect(arrayResult.setting_value).toEqual('[1,2,3,"test",true]');
  });
});