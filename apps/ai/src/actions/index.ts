import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { requireAdmin, requireAdminRole } from '@surreysocieties/admin/actionGuard';

export const server = {
  admin: {
    deleteEvent: defineAction({
      accept: 'form',
      input: z.object({
        id: z.string().min(1, 'Event ID is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug } = requireAdmin(context);
        await client.mutation('events:remove', {
          societySlug,
          eventId: input.id,
        });
        return { success: true };
      },
    }),

    deleteCommitteeMember: defineAction({
      accept: 'form',
      input: z.object({
        id: z.string().min(1, 'Member ID is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug } = requireAdmin(context);
        await client.mutation('committee:remove', {
          societySlug,
          memberId: input.id,
        });
        return { success: true };
      },
    }),

    removeAdmin: defineAction({
      accept: 'form',
      input: z.object({
        userId: z.string().min(1, 'User ID is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug } = requireAdminRole(context);
        await client.mutation('memberships:removeMember', {
          societySlug,
          targetUserId: input.userId,
        });
        return { success: true };
      },
    }),

    revokeInvite: defineAction({
      accept: 'form',
      input: z.object({
        invitationId: z.string().min(1, 'Invitation ID is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug } = requireAdminRole(context);
        await client.mutation('memberships:revokeInvitation', {
          societySlug,
          invitationId: input.invitationId,
        });
        return { success: true };
      },
    }),
  },
};
