import { serial, text, pgTable, timestamp, integer, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for type safety
export const roomTypeEnum = pgEnum('room_type', ['public', 'private', 'premium']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file', 'system']);
export const participantRoleEnum = pgEnum('participant_role', ['member', 'moderator', 'admin']);
export const settingTypeEnum = pgEnum('setting_type', ['string', 'number', 'boolean', 'json']);
export const transactionTypeEnum = pgEnum('transaction_type', ['purchase', 'spend', 'refund', 'bonus']);

// Roles table for access control
export const rolesTable = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  permissions: json('permissions').$type<string[]>().notNull(),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users table with authentication and profile information
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  gold_credits: integer('gold_credits').notNull().default(0),
  role_id: integer('role_id').notNull().references(() => rolesTable.id),
  language: text('language').notNull().default('en'),
  theme: text('theme').notNull().default('light'),
  is_active: boolean('is_active').notNull().default(true),
  is_verified: boolean('is_verified').notNull().default(false),
  last_login_at: timestamp('last_login_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Chat rooms table
export const roomsTable = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  room_type: roomTypeEnum('room_type').notNull().default('public'),
  max_participants: integer('max_participants'),
  gold_cost: integer('gold_cost'),
  owner_id: integer('owner_id').notNull().references(() => usersTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table for real-time messaging
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  room_id: integer('room_id').notNull().references(() => roomsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  content: text('content').notNull(),
  message_type: messageTypeEnum('message_type').notNull().default('text'),
  is_edited: boolean('is_edited').notNull().default(false),
  is_deleted: boolean('is_deleted').notNull().default(false),
  reply_to_id: integer('reply_to_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Room participants table for managing room members
export const roomParticipantsTable = pgTable('room_participants', {
  id: serial('id').primaryKey(),
  room_id: integer('room_id').notNull().references(() => roomsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  participant_role: participantRoleEnum('participant_role').notNull().default('member'),
  joined_at: timestamp('joined_at').defaultNow().notNull(),
  last_seen_at: timestamp('last_seen_at'),
});

// Email templates table for system communications
export const emailTemplatesTable = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  template_key: text('template_key').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  language: text('language').notNull().default('en'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Site settings table for configuration management
export const siteSettingsTable = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  setting_key: text('setting_key').notNull().unique(),
  setting_value: text('setting_value').notNull(),
  setting_type: settingTypeEnum('setting_type').notNull().default('string'),
  description: text('description'),
  is_public: boolean('is_public').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Gold transactions table for credit system
export const goldTransactionsTable = pgTable('gold_transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount: integer('amount').notNull(),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  description: text('description').notNull(),
  reference_id: text('reference_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations for proper query building
export const rolesRelations = relations(rolesTable, ({ many }) => ({
  users: many(usersTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  role: one(rolesTable, {
    fields: [usersTable.role_id],
    references: [rolesTable.id],
  }),
  ownedRooms: many(roomsTable),
  messages: many(messagesTable),
  roomParticipants: many(roomParticipantsTable),
  goldTransactions: many(goldTransactionsTable),
}));

export const roomsRelations = relations(roomsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [roomsTable.owner_id],
    references: [usersTable.id],
  }),
  messages: many(messagesTable),
  participants: many(roomParticipantsTable),
}));

export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
  room: one(roomsTable, {
    fields: [messagesTable.room_id],
    references: [roomsTable.id],
  }),
  user: one(usersTable, {
    fields: [messagesTable.user_id],
    references: [usersTable.id],
  }),
  replyTo: one(messagesTable, {
    fields: [messagesTable.reply_to_id],
    references: [messagesTable.id],
    relationName: 'messageReply'
  }),
  replies: many(messagesTable, {
    relationName: 'messageReply'
  }),
}));

export const roomParticipantsRelations = relations(roomParticipantsTable, ({ one }) => ({
  room: one(roomsTable, {
    fields: [roomParticipantsTable.room_id],
    references: [roomsTable.id],
  }),
  user: one(usersTable, {
    fields: [roomParticipantsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const goldTransactionsRelations = relations(goldTransactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [goldTransactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Role = typeof rolesTable.$inferSelect;
export type NewRole = typeof rolesTable.$inferInsert;
export type Room = typeof roomsTable.$inferSelect;
export type NewRoom = typeof roomsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type RoomParticipant = typeof roomParticipantsTable.$inferSelect;
export type NewRoomParticipant = typeof roomParticipantsTable.$inferInsert;
export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
export type NewEmailTemplate = typeof emailTemplatesTable.$inferInsert;
export type SiteSetting = typeof siteSettingsTable.$inferSelect;
export type NewSiteSetting = typeof siteSettingsTable.$inferInsert;
export type GoldTransaction = typeof goldTransactionsTable.$inferSelect;
export type NewGoldTransaction = typeof goldTransactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  roles: rolesTable,
  users: usersTable,
  rooms: roomsTable,
  messages: messagesTable,
  roomParticipants: roomParticipantsTable,
  emailTemplates: emailTemplatesTable,
  siteSettings: siteSettingsTable,
  goldTransactions: goldTransactionsTable,
};

export const tableRelations = {
  rolesRelations,
  usersRelations,
  roomsRelations,
  messagesRelations,
  roomParticipantsRelations,
  goldTransactionsRelations,
};