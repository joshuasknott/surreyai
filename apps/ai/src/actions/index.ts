import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro:schema';
import { requireAdmin, requireAdminRole } from '@surreysocieties/admin/actionGuard';
import { verifyCsrfToken } from '@surreysocieties/admin/csrf';
import { fetchUnionCommitteeOfficers, getSocietyById } from '@surreysocieties/admin';

function assertValidCsrf(token: string, userId: string) {
  if (!verifyCsrfToken(token, userId)) {
    throw new ActionError({
      code: 'FORBIDDEN',
      message: 'Invalid or expired form submission. Please try again.',
    });
  }
}

export const server = {
  admin: {
    deleteEvent: defineAction({
      accept: 'form',
      input: z.object({
        id: z.string().min(1, 'Event ID is required'),
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdmin(context);
        assertValidCsrf(input._csrf, user._id);
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
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdmin(context);
        assertValidCsrf(input._csrf, user._id);
        await client.mutation('committee:remove', {
          societySlug,
          memberId: input.id,
        });
        return { success: true };
      },
    }),

    syncCommitteeFromUnion: defineAction({
      accept: 'form',
      input: z.object({
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdminRole(context);
        assertValidCsrf(input._csrf, user._id);
        const society = getSocietyById(societySlug);
        if (!society) {
          throw new ActionError({ code: 'BAD_REQUEST', message: 'Society configuration is missing.' });
        }

        try {
          const officers = await fetchUnionCommitteeOfficers(society.studentsUnionUrl);
          await client.mutation('committee:syncOfficers', { societySlug, officers });
          return { success: true, officers };
        } catch (error) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: error instanceof Error ? error.message : "Unable to refresh the Students' Union committee.",
          });
        }
      },
    }),

    deletePastCommitteeMember: defineAction({
      accept: 'form',
      input: z.object({
        id: z.string().min(1, 'Past committee member ID is required'),
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdmin(context);
        assertValidCsrf(input._csrf, user._id);
        await client.mutation('committee:removePast', {
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
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdminRole(context);
        assertValidCsrf(input._csrf, user._id);
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
        _csrf: z.string().min(1, 'CSRF token is required'),
      }),
      handler: async (input, context) => {
        const { client, societySlug, user } = requireAdminRole(context);
        assertValidCsrf(input._csrf, user._id);
        await client.mutation('memberships:revokeInvitation', {
          societySlug,
          invitationId: input.invitationId,
        });
        return { success: true };
      },
    }),
  },
};
