import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema validation
import {
  registerUserInputSchema,
  loginUserInputSchema,
  createRoomInputSchema,
  sendMessageInputSchema,
  joinRoomInputSchema,
  updateUserProfileInputSchema,
  createRoleInputSchema,
  assignUserRoleInputSchema,
  createEmailTemplateInputSchema,
  updateSiteSettingInputSchema,
  purchaseGoldInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createRoom } from './handlers/create_room';
import { getRooms } from './handlers/get_rooms';
import { joinRoom } from './handlers/join_room';
import { sendMessage } from './handlers/send_message';
import { getRoomMessages } from './handlers/get_room_messages';
import { updateUserProfile } from './handlers/update_user_profile';
import { purchaseGold } from './handlers/purchase_gold';
import { getUserTransactions } from './handlers/get_user_transactions';
import { createRole } from './handlers/create_role';
import { getRoles } from './handlers/get_roles';
import { assignUserRole } from './handlers/assign_user_role';
import { getUsers } from './handlers/get_users';
import { createEmailTemplate } from './handlers/create_email_template';
import { getEmailTemplates } from './handlers/get_email_templates';
import { updateSiteSetting } from './handlers/update_site_setting';
import { getSiteSettings } from './handlers/get_site_settings';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User profile management
  updateUserProfile: publicProcedure
    .input(updateUserProfileInputSchema)
    .mutation(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return updateUserProfile(input, userId);
    }),

  // Room management
  createRoom: publicProcedure
    .input(createRoomInputSchema)
    .mutation(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return createRoom(input, userId);
    }),

  getRooms: publicProcedure
    .query(() => {
      // In real implementation, get userId from authentication context if needed
      const userId = 1; // Placeholder
      return getRooms(userId);
    }),

  joinRoom: publicProcedure
    .input(joinRoomInputSchema)
    .mutation(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return joinRoom(input, userId);
    }),

  // Messaging
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return sendMessage(input, userId);
    }),

  getRoomMessages: publicProcedure
    .input(z.object({
      roomId: z.number(),
      limit: z.number().optional(),
      offset: z.number().optional()
    }))
    .query(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return getRoomMessages(input.roomId, userId, input.limit, input.offset);
    }),

  // Gold/Credit system
  purchaseGold: publicProcedure
    .input(purchaseGoldInputSchema)
    .mutation(({ input }) => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return purchaseGold(input, userId);
    }),

  getUserTransactions: publicProcedure
    .query(() => {
      // In real implementation, get userId from authentication context
      const userId = 1; // Placeholder
      return getUserTransactions(userId);
    }),

  // Administrative routes (role management)
  createRole: publicProcedure
    .input(createRoleInputSchema)
    .mutation(({ input }) => createRole(input)),

  getRoles: publicProcedure
    .query(() => getRoles()),

  assignUserRole: publicProcedure
    .input(assignUserRoleInputSchema)
    .mutation(({ input }) => assignUserRole(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  // Email template management
  createEmailTemplate: publicProcedure
    .input(createEmailTemplateInputSchema)
    .mutation(({ input }) => createEmailTemplate(input)),

  getEmailTemplates: publicProcedure
    .query(() => getEmailTemplates()),

  // Site settings management
  updateSiteSetting: publicProcedure
    .input(updateSiteSettingInputSchema)
    .mutation(({ input }) => updateSiteSetting(input)),

  getSiteSettings: publicProcedure
    .input(z.object({
      publicOnly: z.boolean().optional()
    }))
    .query(({ input }) => getSiteSettings(input?.publicOnly)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- Authentication: registerUser, loginUser');
  console.log('- User Management: updateUserProfile, getUsers, assignUserRole');
  console.log('- Room Management: createRoom, getRooms, joinRoom');
  console.log('- Messaging: sendMessage, getRoomMessages');
  console.log('- Gold System: purchaseGold, getUserTransactions');
  console.log('- Administration: createRole, getRoles, createEmailTemplate, getEmailTemplates');
  console.log('- Site Settings: updateSiteSetting, getSiteSettings');
}

start();