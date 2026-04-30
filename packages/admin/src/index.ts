// Main entry point for @surreysocieties/admin
export * from './types.js';
export * from './config.js';
export { getDb, closeDb, runMigrations, seedDatabase } from './db/index.js';
export {
  login, logout, getSession,
  canAccessSociety, canManageAdmins, canEditContent,
  cleanupSessions, SESSION_COOKIE_NAME,
  hashPassword, verifyPassword,
} from './auth/index.js';
export {
  getEvents, getPublishedEvents, getFeaturedEvents, getEventById,
  createEvent, updateEvent, deleteEvent,
  getCommittee, getActiveCommittee, getCommitteeMemberById,
  createCommitteeMember, updateCommitteeMember, deleteCommitteeMember,
  getAdmins, getAdminById, getInvitations,
  inviteAdmin, revokeInvitation, acceptInvitation,
  removeAdminAccess, getInvitationByToken,
} from './services/index.js';
export { validateEventInput } from './validation/events.js';
export { validateCommitteeInput } from './validation/committee.js';
export { validateInviteInput } from './validation/admins.js';
