import { z } from 'zod';

// User schema with authentication and profile information
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  gold_credits: z.number().int().nonnegative(),
  role_id: z.number(),
  language: z.string(),
  theme: z.string(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  last_login_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Role schema for access control
export const roleSchema = z.object({
  id: z.number(),
  name: z.string(),
  permissions: z.array(z.string()),
  is_default: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Role = z.infer<typeof roleSchema>;

// Chat room schema
export const roomSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  room_type: z.enum(['public', 'private', 'premium']),
  max_participants: z.number().int().nullable(),
  gold_cost: z.number().int().nonnegative().nullable(),
  owner_id: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Room = z.infer<typeof roomSchema>;

// Message schema for real-time messaging
export const messageSchema = z.object({
  id: z.number(),
  room_id: z.number(),
  user_id: z.number(),
  content: z.string(),
  message_type: z.enum(['text', 'image', 'file', 'system']),
  is_edited: z.boolean(),
  is_deleted: z.boolean(),
  reply_to_id: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Room participant schema for managing room members
export const roomParticipantSchema = z.object({
  id: z.number(),
  room_id: z.number(),
  user_id: z.number(),
  participant_role: z.enum(['member', 'moderator', 'admin']),
  joined_at: z.coerce.date(),
  last_seen_at: z.coerce.date().nullable()
});

export type RoomParticipant = z.infer<typeof roomParticipantSchema>;

// Email template schema for system communications
export const emailTemplateSchema = z.object({
  id: z.number(),
  template_key: z.string(),
  subject: z.string(),
  body: z.string(),
  language: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

// Site settings schema for configuration management
export const siteSettingSchema = z.object({
  id: z.number(),
  setting_key: z.string(),
  setting_value: z.string(),
  setting_type: z.enum(['string', 'number', 'boolean', 'json']),
  description: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SiteSetting = z.infer<typeof siteSettingSchema>;

// Gold transaction schema for credit system
export const goldTransactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number().int(),
  transaction_type: z.enum(['purchase', 'spend', 'refund', 'bonus']),
  description: z.string(),
  reference_id: z.string().nullable(),
  created_at: z.coerce.date()
});

export type GoldTransaction = z.infer<typeof goldTransactionSchema>;

// Input schemas for user registration
export const registerUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().nullable().optional(),
  language: z.string().optional(),
  theme: z.string().optional()
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Input schemas for user login
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Input schemas for room creation
export const createRoomInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  room_type: z.enum(['public', 'private', 'premium']),
  max_participants: z.number().int().positive().optional(),
  gold_cost: z.number().int().nonnegative().optional()
});

export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;

// Input schemas for sending messages
export const sendMessageInputSchema = z.object({
  room_id: z.number(),
  content: z.string().min(1),
  message_type: z.enum(['text', 'image', 'file']).optional(),
  reply_to_id: z.number().optional()
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Input schemas for joining rooms
export const joinRoomInputSchema = z.object({
  room_id: z.number()
});

export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>;

// Input schemas for updating user profile
export const updateUserProfileInputSchema = z.object({
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  language: z.string().optional(),
  theme: z.string().optional()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

// Input schemas for role management (admin only)
export const createRoleInputSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()),
  is_default: z.boolean().optional()
});

export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

// Input schemas for user role assignment (admin only)
export const assignUserRoleInputSchema = z.object({
  user_id: z.number(),
  role_id: z.number()
});

export type AssignUserRoleInput = z.infer<typeof assignUserRoleInputSchema>;

// Input schemas for email template management
export const createEmailTemplateInputSchema = z.object({
  template_key: z.string(),
  subject: z.string(),
  body: z.string(),
  language: z.string(),
  is_active: z.boolean().optional()
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateInputSchema>;

// Input schemas for site settings management
export const updateSiteSettingInputSchema = z.object({
  setting_key: z.string(),
  setting_value: z.string(),
  setting_type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  description: z.string().nullable().optional(),
  is_public: z.boolean().optional()
});

export type UpdateSiteSettingInput = z.infer<typeof updateSiteSettingInputSchema>;

// Input schemas for gold transactions
export const purchaseGoldInputSchema = z.object({
  amount: z.number().int().positive(),
  payment_reference: z.string().optional()
});

export type PurchaseGoldInput = z.infer<typeof purchaseGoldInputSchema>;