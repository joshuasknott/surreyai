import { ConvexClient, ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import type { Activity, PlannerCalendarItem, PlannerPerson, PlannerMention, PlannerNotification, PlannerProfile, PlannerFile, PlannerActivity, PlannerWorkspace } from '../../../../convex/plannerModel';
import { HACK_CHECKLIST_GROUPS } from '../../../../convex/plannerHackTemplate';
import { activityDate, activityKind, blankActivity, londonToday } from '../lib/programme';
import { createPlannerSignIn, type ClerkSDK, type ClerkSession } from './plannerSignIn';
import { appendMentionText, createMentionPicker } from './plannerMentions';
import { plannerTeams, type PlannerTeam } from '../../../../convex/plannerTeams';
import { SOCIETIES } from '@surreysocieties/admin/config';

type Item = Doc<'plannerItems'>;
type Stage = 'ideas' | 'planning' | 'ready';
type Access = { name: string; email: string; userId: Id<'users'> | null; canManageAccess: boolean };
declare global { interface Window { Clerk?: ClerkSDK } }

const root = document.querySelector<HTMLElement>('[data-planner]');
if (root) void start(root);

async function start(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const form = $<HTMLFormElement>('item-form');
  const editor = $<HTMLDialogElement>('item-dialog');
  const settingsDialog = $<HTMLDialogElement>('settings-dialog');
  const cardDialog = $<HTMLDialogElement>('card-dialog');
  const deleteCardDialog = $<HTMLDialogElement>('delete-card-dialog');
  const notificationsDialog = $<HTMLDialogElement>('notifications-dialog');
  const commentForm = $<HTMLFormElement>('comment-form');
  const commentText = $<HTMLTextAreaElement>('comment-text');
  const stages = ['ideas', 'planning', 'ready'] as const;
  const stageMime = 'application/x-planner-stage';
  const cardMime = 'application/x-planner-card';
  const labels = { ideas: 'Ideas', planning: 'In progress', ready: 'Ready', done: 'Archived', published: 'Ready', archived: 'Archived' };
  const workspaceNames = { events: 'Events', outreach: 'Outreach', hack2027: 'Surrey AI Hack 2027' };
  const workspaceFromUrl = (): PlannerWorkspace => {
    const part = window.location.pathname.split('/').filter(Boolean).at(-1);
    return part === 'outreach' || part === 'hack2027' ? part : 'events';
  };
  let workspace = workspaceFromUrl();
  let lastPlannerUrl = window.location.href;
  let workspaceVersion = 0;
  let hackInitialized = false;
  const itemWorkspace = (item: Item) => item.workspace || 'events';
  const stageLabel = (stage: keyof typeof labels, item?: Item) => {
    const area = item ? itemWorkspace(item) : workspace;
    return area === 'outreach' && stage === 'ideas' ? 'To approach' : area === 'outreach' && stage === 'planning' ? 'Waiting for reply' : area === 'outreach' && stage === 'ready' ? 'In conversation' : labels[stage];
  };
  const collapsedHackGroups = new Set<string>(HACK_CHECKLIST_GROUPS.slice(3).map(group => group.id));
  const checklistSaving = new Set<string>();
  const boardStage = (item: Item) => item.stage === 'done' || item.stage === 'published' && item.workflowStage === 'done' ? 'archived' : item.stage === 'published' ? item.workflowStage || 'ready' : item.stage;
  const activeOrder = (order: Item['stage'][]) => order.filter((stage): stage is Stage => stages.includes(stage as Stage));
  const timeBucket = () => Math.floor(Date.now() / 60000) * 60000;
  let selectedTeam: PlannerTeam | 'all' = 'all';
  let search = '';
  let workScope: 'everyone' | 'mine' = 'everyone';
  let mobileStage: Stage = 'ideas';
  let dueThisWeek = false;
  let waitingOnly = false;
  const assignedTeams = (item: { team?: PlannerTeam | null; teams?: PlannerTeam[] }) => item.teams ?? (item.team ? [item.team] : []);
  const matches = (item: { title: string; team?: PlannerTeam | null; teams?: PlannerTeam[]; nextAction?: string; outreachKind?: string }) => (selectedTeam === 'all' || assignedTeams(item).includes(selectedTeam)) && `${item.title} ${item.nextAction || ''} ${item.outreachKind || ''}`.toLowerCase().includes(search);
  const membersDialog = $<HTMLDialogElement>('members-dialog');
  let client: ConvexHttpClient;
  let clerk: ClerkSDK;
  let access: Access | null = null;
  let items: Item[] = [];
  let boardOrder: Stage[] = [...stages];
  let boardRevision = 0;
  let boardOrderSaving = false;
  let draggedStage: Stage | null = null;
  let archived: Item[] = [];
  let archiveLoadedAt = 0;
  let archiveLoading = false;
  let archiveError = '';
  let archiveVersion = 0;
  let archiveRequest: Promise<void> | null = null;
  let current: Item | null = null;
  let tasks: Item['tasks'] = [];
  let attachments: NonNullable<Item['attachments']> = [];
  let files: PlannerFile[] = [];
  let profiles: PlannerProfile[] = [];
  let profileRefreshPending = false;
  let fileUploadBusy = false;
  let fileAbort: AbortController | null = null;
  let pendingUploads: { file: File; requestId: string }[] = [];
  const downloadUrls = new Set<string>();
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  let autosavePromise: Promise<boolean> | null = null;
  let cardReviewOpen = false;
  let deleteRequest: { item: Item; permanent: boolean } | null = null;
  let deleteBusy = false;
  let deleteAttempt = 0;
  let baseline = '';
  let busy = false;
  let view: 'board' | 'calendar' | 'archive' = new URLSearchParams(window.location.search).get('view') === 'calendar' ? 'calendar' : new URLSearchParams(window.location.search).get('view') === 'archive' ? 'archive' : 'board';
  let calendarMonth = new Date(`${londonToday().slice(0, 7)}-01T12:00:00Z`);
  let calendarItems: PlannerCalendarItem[] = [];
  let calendarLoadedMonth = '';
  let calendarHasMore = false;
  let calendarLoading = false;
  let calendarError = '';
  let calendarVersion = 0;
  let sessionId: string | null = null;
  let refreshing = false;
  let refreshPending = false;
  let aiVersion = 0;
  let aiBusy = false;
  let aiRequest: AbortController | null = null;
  let suggestedDescription = '';
  let previewItem: Item | null = null;
  let previewVersion = 0;
  let comments: Doc<'plannerComments'>[] = [];
  let commentsCursor: string | null = null;
  let commentsDone = true;
  let commentsLoading = false;
  let commentsError = false;
  let commentPages = 1;
  let activity: PlannerActivity[] = [];
  let activityCursor: string | null = null;
  let activityDone = true;
  let activityLoading = false;
  let activityRefreshPending = false;
  let activityPages = 1;
  let activityFilter: 'all' | 'comments' = 'all';
  let commentBusy = false;
  let commentRequest: { text: string; id: string } | null = null;
  let commentEdit: { id: Id<'plannerComments'>; text: string; original: string; revision: number } | null = null;
  let commentDelete: Id<'plannerComments'> | null = null;
  let mentionPeople: PlannerMention[] = [];
  let notifications: PlannerNotification[] = [];
  let notificationsVersion = 0;
  let notificationsLoading = false;
  let notificationsBusy = false;
  let notificationsCursor: string | null = null;
  let notificationsPages = 1;
  let notificationsDone = true;
  let unreadNotifications = 0;
  let notificationStream: ConvexClient | null = null;
  let stopNotificationStream: (() => void) | null = null;
  let notificationRefreshPending = false;
  let notificationRetry: ReturnType<typeof setTimeout> | null = null;
  let notificationRetryDelay = 1000;
  let highlightedComment: Id<'plannerComments'> | null = null;
  let pendingEmailLink = new URLSearchParams(window.location.search);
  const commentMentionPicker = createMentionPicker(commentText, () => mentionPeople);
  let editMentionPicker: ReturnType<typeof createMentionPicker> | null = null;
  const commentDrafts = new Map<string, string>();

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;
  };
  const icon = (name: string) => ($<HTMLTemplateElement>(`${name}-icon`).content.cloneNode(true));
  const status = (message = '') => { $('planner-status').textContent = message; };
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const inCard = () => form.parentElement?.id === 'card-editor-slot';
  // Reuse the existing controls so collapsing outreach details never drops data.
  const outreachFields = {
    description: form.querySelector<HTMLElement>('.description-field')!,
    nextAction: field('nextAction').closest('label')!,
    relationship: field('outreachKind').closest('label')!,
    teams: form.querySelector<HTMLElement>('.team-picker')!,
    lead: form.querySelector<HTMLElement>('.lead-field')!,
    followUp: $('internal-due-label'),
    collaborators: $('collaborators-field'),
    privateOptions: $('private-options'),
    checklist: $('card-checklist'),
    attachments: $('card-attachments'),
    attribution: $('card-attribution'),
  };
  const outreachHomes = new Map<HTMLElement, Comment>();
  for (const node of Object.values(outreachFields)) {
    const home = document.createComment('editor field position');
    node.before(home); outreachHomes.set(node, home);
  }
  $('item-heading').after($('outreach-stage-slot'));

  function syncOutreachLayout() {
    const outreach = field('workspace').value === 'outreach';
    const compact = inCard();
    form.dataset.workspace = field('workspace').value;
    editor.dataset.workspace = form.dataset.workspace;
    cardDialog.dataset.workspace = form.dataset.workspace;
    for (const id of ['outreach-primary-fields', 'outreach-assignments', 'outreach-more-details']) $(id).hidden = !outreach;
    $('outreach-stage-slot').hidden = !outreach || compact;
    $('outreach-create-footer').hidden = !outreach || compact;
    if (outreach) {
      $('outreach-primary-fields').append(outreachFields.description, outreachFields.nextAction);
      $('outreach-lead-slot').append(outreachFields.lead);
      $('outreach-follow-up-slot').append(outreachFields.followUp);
      $('outreach-details-content').append(outreachFields.relationship, outreachFields.teams, outreachFields.collaborators, outreachFields.privateOptions, outreachFields.checklist, outreachFields.attachments, outreachFields.attribution);
      if (!compact) $('outreach-stage-slot').append($('stage-field'));
    } else {
      for (const id of ['outreach-more-details', 'outreach-lead-picker', 'outreach-follow-up-picker']) $<HTMLDetailsElement>(id).open = false;
      for (const [node, home] of outreachHomes) home.after(node);
      // Existing cards keep collaborators in their private details panel.
      if (compact) $('card-collaborators-slot').append(outreachFields.collaborators);
    }
    if (!compact && !outreach) form.querySelector('.editor-stage-bar')!.prepend($('stage-field'));
    (outreach && !compact ? $('outreach-save-slot') : $('editor-action-buttons')).prepend($('save-item'));
    outreachFields.privateOptions.classList.toggle('card-detail-panel', !outreach);
    $<HTMLDetailsElement>('private-options').open = outreach;
    form.querySelector('.card-title-field')!.firstChild!.textContent = outreach ? 'Company' : 'Title';
    field('title').setAttribute('placeholder', outreach ? 'Company name' : '');
    outreachFields.followUp.firstChild!.textContent = outreach ? 'Follow-up' : 'Due';
    field('dueDate').setAttribute('aria-label', outreach ? 'Follow-up date (optional)' : 'Due date (optional)');
    field('description').setAttribute('placeholder', outreach ? 'A little context about the company or conversation…' : 'What’s the idea?');
    field('nextAction').setAttribute('placeholder', outreach ? 'What happens next?' : 'What should happen next?');
    $('editor-back-label').textContent = outreach ? 'Outreach' : compact ? 'Card' : 'Planner';
    if (!current) $('item-heading').textContent = outreach ? 'New company' : 'New card';
    $('help-description').hidden = outreach || root.dataset.ai !== 'true';
  }

  function syncOutreachAssignments() {
    $('outreach-lead-label').textContent = field('lead').value ? plannerName(field('lead').value) : 'Assign lead';
    $('outreach-follow-up-label').textContent = field('dueDate').value ? activityDate(field('dueDate').value, { day: 'numeric', month: 'short' }) : 'Add follow-up';
  }
  for (const id of ['outreach-lead-picker', 'outreach-follow-up-picker']) {
    const picker = $<HTMLDetailsElement>(id);
    picker.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !picker.open) return;
      event.preventDefault(); event.stopPropagation(); picker.open = false; picker.querySelector('summary')!.focus();
    });
  }
  document.addEventListener('click', event => {
    if (!(event.target instanceof Node)) return;
    for (const id of ['outreach-lead-picker', 'outreach-follow-up-picker']) {
      const picker = $<HTMLDetailsElement>(id);
      if (!picker.contains(event.target)) picker.open = false;
    }
  });
  const readActivity = (): Activity => {
    const result = blankActivity();
    for (const name of Object.keys(result) as (keyof Activity)[]) (result[name] as string) = field(name).value.trim();
    if (field('purpose').value === 'internal') {
      result.kind = 'project'; result.category = ''; result.date = field('dueDate').value;
      result.startTime = ''; result.endTime = ''; result.location = ''; result.registrationUrl = '';
    }
    if (inCard() && field('purpose').value !== 'internal') result.date = field('dueDate').value;
    return result;
  };
  const selectedTeams = () => [...form.querySelectorAll<HTMLInputElement>('input[name="teams"]:checked')].map(input => input.value as PlannerTeam);
  const signature = () => JSON.stringify({ activity: readActivity(), stage: field('stage').value, workspace: field('workspace').value, outreachKind: field('outreachKind').value, nextAction: field('nextAction').value, checklistGroup: field('checklistGroup').value, checklistDone: (field('checklistDone') as HTMLInputElement).checked, teams: selectedTeams(), lead: field('lead').value, waitingOn: field('waitingOn').value, purpose: field('purpose').value, notes: field('notes').value, owner: field('owner').value, tasks, attachments });
  const dirty = () => (editor.open || cardDialog.open) && signature() !== baseline;
  const closeEditor = () => { if (busy || (dirty() && !window.confirm('Discard your unsaved changes?'))) return; editor.close(); };

  async function authenticated() {
    const token = await clerk.session?.getToken({ template: 'convex' });
    if (!token) throw new Error('Your session has expired. Sign in again.');
    client.setAuth(token); return token;
  }
  function clearPrivateData() {
    fileAbort?.abort(); fileAbort = null; pendingUploads = []; fileUploadBusy = false; files = []; profiles = []; profileRefreshPending = false;
    for (const url of downloadUrls) URL.revokeObjectURL(url); downloadUrls.clear();
    $<HTMLInputElement>('attachment-file').value = ''; $<HTMLFormElement>('planner-profile-form').reset(); $('planner-profile-message').textContent = '';
    stopLiveNotifications();
    access = null; items = []; archived = []; boardOrder = [...stages]; boardRevision = 0; boardOrderSaving = false;
    hackInitialized = false; checklistSaving.clear();
    archiveVersion++; archiveLoadedAt = 0; archiveLoading = false; archiveError = ''; archiveRequest = null;
    notificationsVersion++; notifications = []; mentionPeople = []; notificationsLoading = false; notificationsBusy = false; notificationsCursor = null; notificationsPages = 1; notificationsDone = true; unreadNotifications = 0; highlightedComment = null;
    commentMentionPicker.close(); editMentionPicker?.destroy(); editMentionPicker = null;
    $('open-notifications').hidden = true; $('notification-count').hidden = true; $('open-notifications').setAttribute('aria-label', 'Notifications');
    for (const id of ['notification-list', 'notifications-status', 'notification-count']) $(id).replaceChildren();
    previewVersion++; previewItem = null; comments = []; activity = []; activityCursor = null; activityDone = true; activityLoading = false; activityRefreshPending = false; commentDrafts.clear(); commentsCursor = null; commentBusy = false; commentRequest = null; commentEdit = null; commentDelete = null; commentsLoading = false; commentsError = false; commentForm.reset(); commentText.disabled = false; $<HTMLButtonElement>('post-comment').disabled = false;
    calendarVersion++; calendarItems = []; calendarLoadedMonth = ''; calendarError = ''; calendarLoading = false;
    $('workspace').hidden = true;
    for (const id of ['workspace-nav', 'open-members', 'sidebar-account']) $(id).hidden = true;
    $('open-members').replaceChildren(); $('team-members').replaceChildren(); $('account-name').textContent = '';
    selectedTeam = 'all'; search = ''; workScope = 'everyone'; mobileStage = 'ideas'; dueThisWeek = false; waitingOnly = false; $<HTMLInputElement>('card-search').value = ''; syncTeamFilters(); syncBoardFilters(); $('board-stage-tabs').replaceChildren();
    $('open-settings').hidden = true; $('committee-settings').hidden = true; $('settings-account').textContent = '';
    clearTimeout(autosaveTimer);
    for (const id of ['board', 'hack-checklist', 'calendar', 'archive', 'access-list', 'public-preview', 'task-list', 'card-people', 'card-attribution', 'attachment-list', 'comment-list', 'comments-status', 'activity-status', 'comment-message', 'comment-count', 'comment-author', 'account-avatar']) $(id).replaceChildren();
    $('account-avatar').hidden = true;
    deleteRequest = null; deleteAttempt++;
    if (deleteBusy) setBusy(false);
    deleteBusy = false;
    for (const id of ['confirm-delete-card', 'cancel-delete-card', 'close-delete-card']) $<HTMLButtonElement>(id).disabled = false;
    for (const dialog of [deleteCardDialog, editor, settingsDialog, cardDialog, notificationsDialog, membersDialog, $<HTMLDialogElement>('card-people-dialog'), $<HTMLDialogElement>('planner-profile-dialog')]) if (dialog.open) dialog.close();
    resetDescriptionHelp(); form.reset(); $<HTMLFormElement>('access-form').reset();
    $('item-heading').textContent = 'New activity'; $('item-state').textContent = ''; $('item-message').textContent = '';
    tasks = []; attachments = []; current = null;
  }
  function showAccess(message: string) {
    clearPrivateData(); $('access-state').hidden = false; $('sign-in').hidden = true; $('access-message').textContent = message;
  }
  function showError(error: unknown, target = 'planner-status') {
    const message = error instanceof Error ? error.message : 'Something went wrong. Try again.';
    // Convex includes request metadata in errors; only show the actual actionable message.
    $(target).textContent = message.split('Uncaught Error: ').pop()?.split('\n')[0] || 'Could not save. Try again.';
  }
  async function refresh() {
    if (!clerk?.session) return;
    if (refreshing || busy) { refreshPending = true; return; }
    const requestSession = sessionId;
    const requestWorkspace = workspace; const requestWorkspaceVersion = workspaceVersion;
    refreshing = true; refreshPending = false; profileRefreshPending = false;
    try {
      await authenticated();
      const latestAccess = await client.query(api.planner.access, {});
      if (requestSession !== sessionId) return;
      access = latestAccess;
      if (!access) { showAccess('This board is for the AI Society committee. Ask Josh to add your sign-in email.'); return; }
      void loadArchive(true);
      if (requestWorkspace === 'hack2027' && !hackInitialized) {
        await client.mutation(api.planner.seedHackChecklist, {});
        if (requestSession !== sessionId) return;
        hackInitialized = true;
      }
      const [latestItems, layout, latestProfiles] = await Promise.all([client.query(api.planner.list, { now: timeBucket(), workspace: requestWorkspace }), client.query(api.planner.boardLayout, { workspace: requestWorkspace }), client.query(api.planner.profiles, {})]);
      if (requestSession !== sessionId || requestWorkspaceVersion !== workspaceVersion || !access) return;
      profiles = latestProfiles; syncProfileLabels();
      items = latestItems;
      if (!boardOrderSaving) { boardOrder = activeOrder(layout.order); boardRevision = layout.revision; }
      $('access-state').hidden = true; $('workspace').hidden = false;
      $('workspace-nav').hidden = false; $('sidebar-account').hidden = false; $('account-name').textContent = access.name || access.email;
      renderMembers();
      $('open-settings').hidden = false; $('committee-settings').hidden = !access.canManageAccess;
      $('open-notifications').hidden = false;
      $('settings-account').textContent = `Signed in as ${access.email}`;
      {
        const initials = nameInitials(access.name || access.email);
        const person = { userId: access.userId, name: access.name, email: access.email, initials };
        if (person.userId) $('comment-author').replaceChildren(avatar({ ...person, userId: person.userId }, access.name));
        $('account-avatar').textContent = initials; $('account-avatar').hidden = false;
      }
      $('help-description').hidden = field('workspace').value === 'outreach' || root.dataset.ai !== 'true';
      render();
      if (view === 'calendar') await loadCalendar(true);
      if (cardDialog.open && previewItem && !commentBusy) await refreshCard();
      startLiveNotifications(); await loadMentionPeople();
      if (pendingEmailLink.has('item')) {
        const link = pendingEmailLink; pendingEmailLink = new URLSearchParams();
        const version = notificationsVersion;
        try {
          if (![link.get('item'), link.get('comment') || 'unused'].every(value => value && /^[a-zA-Z0-9_-]{1,100}$/.test(value))) throw new Error('Invalid comment link');
          const item = await client.query(api.planner.get, { id: link.get('item') as Id<'plannerItems'>, now: timeBucket() });
          if (version !== notificationsVersion || !access) return;
          if (!item) throw new Error('This card is no longer available.');
          await openPreview(item, link.get('comment') as Id<'plannerComments'> || undefined);
          const url = new URL(window.location.href); url.searchParams.delete('item'); url.searchParams.delete('comment');
          window.history.replaceState(null, '', url);
        } catch { status('This linked comment is no longer available. You can still browse the board.'); }
      }
    } catch (error) {
      if (requestSession !== sessionId) return;
      if (error instanceof Error && error.message.includes('Committee access required')) { showAccess('Committee access is no longer available. Ask Josh to check your email access.'); return; }
      if (!access) showAccess('Could not check committee access. Try again, or sign out and back in.');
      showError(error);
      $('retry-access').hidden = false;
    } finally { refreshing = false; if (!busy && ((profileRefreshPending || refreshPending) && access || (requestSession !== sessionId || requestWorkspaceVersion !== workspaceVersion) && clerk.session)) void refresh(); }
  }

  function stopLiveNotifications() {
    stopNotificationStream?.(); stopNotificationStream = null;
    const stream = notificationStream; notificationStream = null;
    if (stream) void stream.close().catch(() => {});
    if (notificationRetry) clearTimeout(notificationRetry); notificationRetry = null; notificationRetryDelay = 1000; notificationRefreshPending = false;
  }
  function startLiveNotifications() {
    if (notificationStream || !access || !clerk.session) return;
    const version = notificationsVersion; const session = clerk.session;
    const stream = new ConvexClient(root.dataset.convex!, { expectAuth: true, unsavedChangesWarning: false }); notificationStream = stream;
    const active = () => version === notificationsVersion && notificationStream === stream && clerk.session?.id === session.id && !!access;
    stream.setAuth(async ({ forceRefreshToken }) => {
      if (!active()) return null;
      try { const token = await session.getToken({ template: 'convex', skipCache: forceRefreshToken }); return active() ? token : null; }
      catch { return null; }
    }, authenticated => { if (!authenticated && active()) showAccess('Your session has expired. Sign out and sign in again.'); });
    const stopInbox = stream.onUpdate(api.planner.notificationChanges, {}, () => {
      if (active()) { notificationRefreshPending = true; void flushNotificationChanges(); }
    }, error => {
      if (!active()) return;
      if (error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else { showError(error, 'notifications-status'); stopLiveNotifications(); }
    });
    let profileSignature = JSON.stringify(profiles);
    const stopProfiles = stream.onUpdate(api.planner.profiles, {}, latest => {
      if (!active() || JSON.stringify(latest) === profileSignature) return;
      profileSignature = JSON.stringify(latest); profiles = latest; syncProfileLabels(); renderMembers();
      profileRefreshPending = true; void refresh(); void loadNotifications('refresh');
    }, error => { if (active() && error.message.includes('Committee access required')) showAccess('Committee access is no longer available.'); });
    stopNotificationStream = () => { stopInbox(); stopProfiles(); };
  }
  async function flushNotificationChanges() {
    if (!notificationRefreshPending || notificationsLoading || notificationsBusy || !access) return;
    await loadNotifications('refresh');
  }

  async function loadMentionPeople() {
    const version = notificationsVersion;
    try {
      const people = await client.query(api.planner.mentionPeople, {});
      if (version === notificationsVersion && access) { mentionPeople = people; commentMentionPicker.refresh(); editMentionPicker?.refresh(); }
    } catch (error) {
      if (version === notificationsVersion && error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
    }
  }
  function renderNotifications() {
    const badge = $('notification-count'); badge.textContent = unreadNotifications >= 100 ? '99+' : String(unreadNotifications); badge.hidden = unreadNotifications === 0;
    $('open-notifications').setAttribute('aria-label', unreadNotifications ? `Notifications, ${unreadNotifications >= 100 ? '99+' : unreadNotifications} unread` : 'Notifications');
    const list = $('notification-list'); const focused = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('[data-notification]')?.dataset.notification : null; list.replaceChildren();
    for (const notification of notifications) {
      const row = el('li', undefined, `notification${notification.read ? '' : ' notification-unread'}`); row.dataset.notification = notification._id;
      const button = el('button', undefined, 'notification-open'); button.type = 'button'; button.disabled = notificationsBusy;
      button.append(avatar(notification.author, notification.author.name));
      const content = el('div', undefined, 'notification-content'); const heading = el('span', undefined, 'notification-heading');
      heading.append(el('strong', notification.author.name), document.createTextNode(' mentioned you')); if (!notification.read) heading.append(el('span', 'Unread', 'notification-unread-label'));
      const snippet = el('span', undefined, 'notification-snippet'); appendMentionText(snippet, notification.text, notification.mentions);
      const time = el('time', new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(notification._creationTime))); time.dateTime = new Date(notification._creationTime).toISOString();
      content.append(heading, el('strong', notification.title, 'notification-title'), snippet, time); button.append(content); button.onclick = () => void openNotification(notification); row.append(button); list.append(row);
    }
    if (focused && !notificationsBusy) list.querySelector<HTMLButtonElement>(`[data-notification="${focused}"] button`)?.focus({ preventScroll: true });
    $('notifications-status').textContent = notifications.length ? '' : 'No mentions yet. You’ll see them here when someone mentions you in a comment.';
    $('older-notifications').hidden = notificationsDone; $<HTMLButtonElement>('older-notifications').disabled = notificationsLoading || notificationsBusy;
    $('read-all-notifications').hidden = !unreadNotifications; $<HTMLButtonElement>('read-all-notifications').disabled = notificationsLoading || notificationsBusy;
  }
  async function loadNotifications(mode: 'refresh' | 'older') {
    if (!access || notificationsLoading || notificationsBusy) return;
    const version = notificationsVersion; notificationsLoading = true;
    if (mode === 'refresh') notificationRefreshPending = false;
    if (notificationRetry) clearTimeout(notificationRetry); notificationRetry = null;
    $('notifications-status').textContent = notifications.length ? '' : 'Loading notifications…';
    $<HTMLButtonElement>('older-notifications').disabled = true; $<HTMLButtonElement>('read-all-notifications').disabled = true;
    try {
      await authenticated();
      if (version !== notificationsVersion || !access) return;
      let cursor = mode === 'older' ? notificationsCursor : null; let pages = 0; let done = true; const loaded: PlannerNotification[] = []; let unread = 0;
      do {
        const result = await client.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor } });
        if (version !== notificationsVersion || !access) return;
        loaded.push(...result.page); cursor = result.continueCursor; done = result.isDone; unread = result.unreadCount; pages++;
      } while (mode === 'refresh' && !done && pages < notificationsPages);
      const merged = new Map((mode === 'older' ? notifications : []).map(row => [row._id, row])); for (const row of loaded) merged.set(row._id, row);
      notifications = [...merged.values()].sort((a, b) => b._creationTime - a._creationTime || b._id.localeCompare(a._id));
      notificationsCursor = cursor; notificationsDone = done; notificationsPages = mode === 'older' ? notificationsPages + 1 : pages; unreadNotifications = unread; renderNotifications();
      notificationRetryDelay = 1000;
    } catch (error) { if (version === notificationsVersion) {
      if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else {
        $('notifications-status').textContent = 'Could not load notifications. '; const retry = el('button', 'Try again', 'quiet-button'); retry.onclick = () => void loadNotifications('refresh'); $('notifications-status').append(retry);
        notificationRetry = setTimeout(() => { notificationRetry = null; if (version === notificationsVersion && access) { notificationRefreshPending = true; void flushNotificationChanges(); } }, notificationRetryDelay);
        notificationRetryDelay = Math.min(30000, notificationRetryDelay * 2);
      }
    } } finally { if (version === notificationsVersion) { notificationsLoading = false; $<HTMLButtonElement>('older-notifications').disabled = notificationsBusy; $<HTMLButtonElement>('read-all-notifications').disabled = notificationsBusy; void flushNotificationChanges(); } }
  }
  $('open-notifications').onclick = () => {
    notificationsDialog.showModal(); void loadNotifications('refresh');
    const version = notificationsVersion; const toggle = $<HTMLInputElement>('mention-email-enabled'); toggle.disabled = true;
    $('mention-email-status').textContent = '';
    void (async () => {
      try { await authenticated(); const enabled = await client.query(api.planner.emailPreference, {}); if (version === notificationsVersion && access) { toggle.checked = enabled; toggle.disabled = false; } }
      catch { if (version === notificationsVersion && access) $('mention-email-status').textContent = 'Could not load email settings. Reopen notifications to retry.'; }
    })();
  };
  $<HTMLInputElement>('mention-email-enabled').onchange = () => {
    const toggle = $<HTMLInputElement>('mention-email-enabled'); const enabled = toggle.checked; const version = notificationsVersion; toggle.disabled = true;
    void (async () => {
      try { await authenticated(); await client.mutation(api.planner.setEmailPreference, { enabled }); if (version === notificationsVersion && access) $('mention-email-status').textContent = enabled ? 'Mention emails are on.' : 'Mention emails are off. Your planner inbox stays on.'; }
      catch (error) { if (version === notificationsVersion && access) { toggle.checked = !enabled; showError(error, 'mention-email-status'); } }
      finally { if (version === notificationsVersion && access) toggle.disabled = false; }
    })();
  };
  $('older-notifications').onclick = () => void loadNotifications('older');
  $('read-all-notifications').onclick = () => void (async () => {
    if (notificationsBusy || notificationsLoading) return; const version = notificationsVersion; notificationsBusy = true; renderNotifications();
    let failure: unknown;
    try {
      await authenticated(); let more = true;
      while (more && version === notificationsVersion && access) more = (await client.mutation(api.planner.markAllNotificationsRead, {})).hasMore;
    } catch (error) { if (version === notificationsVersion) {
      if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else failure = error;
    } } finally { if (version === notificationsVersion) { notificationsBusy = false; await loadNotifications('refresh'); if (failure && version === notificationsVersion) showError(failure, 'notifications-status'); } }
  })();
  async function openNotification(notification: PlannerNotification) {
    if (notificationsBusy) return; const version = notificationsVersion; notificationsBusy = true; renderNotifications();
    try {
      await authenticated(); const item = await client.query(api.planner.get, { id: notification.itemId, now: timeBucket() });
      if (version !== notificationsVersion || !access) return;
      if (!item) throw new Error('This activity is no longer available.');
      notificationsDialog.close(); await openPreview(item, notification.commentId);
      if (version !== notificationsVersion || !access) return;
      await client.mutation(api.planner.markNotificationRead, { id: notification._id });
    } catch (error) { if (version === notificationsVersion) {
      if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else if (notificationsDialog.open) showError(error, 'notifications-status');
      else showError(error, 'comment-message');
    } } finally { if (version === notificationsVersion) { notificationsBusy = false; await loadNotifications('refresh'); } }
  }

  function clearColumnDrop() {
    document.querySelectorAll('.board-column').forEach(column => column.classList.remove('column-drop-before', 'column-drop-after'));
  }

  async function reorderColumn(source: Stage, target: Stage, after: boolean, focus = false) {
    if (!access || boardOrderSaving || source === target) return;
    const next = boardOrder.filter(stage => stage !== source);
    next.splice(next.indexOf(target) + Number(after), 0, source);
    if (next.every((stage, index) => stage === boardOrder[index])) return;
    boardOrderSaving = true; boardOrder = next; render();
    if (focus) document.querySelector<HTMLElement>(`.board-column[data-stage="${source}"] .column-drag-handle`)?.focus();
    try {
      await authenticated();
      boardRevision = await client.mutation(api.planner.reorderBoard, { order: next, revision: boardRevision, workspace });
      status('List order saved for the committee.');
    } catch (error) {
      try { const layout = await client.query(api.planner.boardLayout, { workspace }); boardOrder = activeOrder(layout.order); boardRevision = layout.revision; }
      catch { boardOrder = [...stages]; boardRevision = 0; }
      render(); showError(error);
    } finally { boardOrderSaving = false; }
  }

  function myLeadName() {
    const currentAccess = access;
    if (!currentAccess) return '';
    const profile = profiles.find(person => person.userId === currentAccess.userId || person.email.toLowerCase() === currentAccess.email.toLowerCase());
    if (profile?.rosterName) return profile.rosterName;
    const name = (profile?.name || currentAccess.name).trim().toLocaleLowerCase();
    return [...(field('lead') as HTMLSelectElement).options].find(option => option.value.toLocaleLowerCase() === name)?.value || '';
  }
  function isMyWork(item: Item) {
    return !!item.lead && item.lead === myLeadName();
  }
  function boardMatches(item: Item) {
    if (!matches(item) || (workScope === 'mine' && !isMyWork(item)) || (waitingOnly && !item.waitingOn)) return false;
    if (!dueThisWeek) return true;
    const today = londonToday();
    const end = new Date(`${today}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + (7 - (end.getUTCDay() || 7)));
    return !!item.date && item.date >= today && item.date <= end.toISOString().slice(0, 10);
  }
  function syncMobileBoard() {
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    $('board-stage-tabs').hidden = view !== 'board' || workspace === 'hack2027';
    for (const stage of boardOrder) {
      const column = document.getElementById(`board-stage-${stage}`);
      if (!column) continue;
      column.hidden = mobile && stage !== mobileStage;
      if (mobile) { column.setAttribute('role', 'tabpanel'); column.setAttribute('aria-labelledby', `stage-tab-${stage}`); }
      else { column.removeAttribute('role'); column.removeAttribute('aria-labelledby'); }
      const tab = $(`stage-tab-${stage}`); tab.setAttribute('aria-selected', String(stage === mobileStage)); tab.tabIndex = stage === mobileStage ? 0 : -1;
    }
  }
  function renderStageTabs() {
    const focused = document.activeElement?.id;
    const tabs = $('board-stage-tabs'); tabs.replaceChildren();
    for (const stage of boardOrder) {
      const tab = el('button', undefined, 'board-stage-tab'); tab.type = 'button'; tab.id = `stage-tab-${stage}`;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `board-stage-${stage}`);
      tab.append(el('span', stageLabel(stage)), el('span', String(items.filter(item => boardStage(item) === stage && boardMatches(item)).length), 'stage-count'));
      tab.onclick = () => { mobileStage = stage; syncMobileBoard(); };
      tab.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = boardOrder.indexOf(stage);
        mobileStage = event.key === 'Home' ? boardOrder[0] : event.key === 'End' ? boardOrder.at(-1)! : boardOrder[(index + (event.key === 'ArrowRight' ? 1 : -1) + boardOrder.length) % boardOrder.length];
        syncMobileBoard(); $(`stage-tab-${mobileStage}`).focus();
      };
      tabs.append(tab);
    }
    syncMobileBoard();
    if (focused?.startsWith('stage-tab-')) document.getElementById(focused)?.focus({ preventScroll: true });
  }

  function render() {
    syncWorkspaceView();
    if (workspace === 'hack2027' && view === 'board') { renderHackChecklist(); renderCalendar(); renderArchive(); return; }
    const board = $('board'); board.replaceChildren();
    for (const stage of boardOrder) {
      const column = el('section', undefined, 'board-column'); column.id = `board-stage-${stage}`; column.dataset.stage = stage; column.setAttribute('aria-label', stageLabel(stage));
      const cards = items.filter(item => boardStage(item) === stage && boardMatches(item)).sort((a, b) => b.updatedAt - a.updatedAt);
      const heading = el('div', undefined, 'column-heading'); const title = el('h2', stageLabel(stage)); heading.append(title, el('span', String(cards.length), 'column-count'));
      const handle = el('button', undefined, 'column-drag-handle'); handle.type = 'button'; handle.draggable = true;
      handle.title = 'Drag to reorder lists; use Left or Right arrow keys';
      handle.setAttribute('aria-label', `Reorder ${stageLabel(stage)} list`); handle.append(icon('drag'));
      handle.addEventListener('dragstart', event => { draggedStage = stage; event.dataTransfer?.setData(stageMime, stage); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'; });
      handle.addEventListener('dragend', () => { draggedStage = null; clearColumnDrop(); });
      handle.addEventListener('keydown', event => {
        const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        if (!offset) return;
        event.preventDefault(); const target = boardOrder[boardOrder.indexOf(stage) + offset];
        if (target) void reorderColumn(stage, target, offset > 0, true);
      });
      let touchDragging = false;
      handle.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') { touchDragging = true; board.style.scrollSnapType = 'none'; handle.setPointerCapture(event.pointerId); } });
      handle.addEventListener('pointermove', event => {
        if (!touchDragging) return;
        const bounds = board.getBoundingClientRect();
        if (event.clientX < bounds.left + 36) board.scrollLeft -= 24;
        if (event.clientX > bounds.right - 36) board.scrollLeft += 24;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.board-column');
        clearColumnDrop();
        if (target && target.dataset.stage !== stage) target.classList.add(event.clientX >= target.getBoundingClientRect().left + target.clientWidth / 2 ? 'column-drop-after' : 'column-drop-before');
      });
      handle.addEventListener('pointerup', event => {
        if (!touchDragging) return; touchDragging = false; board.style.scrollSnapType = '';
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.board-column'); clearColumnDrop();
        if (target && target.dataset.stage !== stage) void reorderColumn(stage, target.dataset.stage as Stage, event.clientX >= target.getBoundingClientRect().left + target.clientWidth / 2);
      });
      handle.addEventListener('pointercancel', () => { touchDragging = false; board.style.scrollSnapType = ''; clearColumnDrop(); });
      heading.append(handle);
      column.append(heading);
      for (const item of cards) column.append(workspace === 'outreach' ? outreachCard(item) : card(item));
      if (!cards.length) column.append(el('p', workScope === 'mine' ? 'No cards assigned to you here.' : selectedTeam !== 'all' || search || dueThisWeek || waitingOnly ? 'No cards match these filters.' : 'No cards here yet.', 'column-empty'));
      const add = el('button', 'Add card', 'column-add'); add.prepend(icon('plus')); add.onclick = () => openEditor(null, stage); column.append(add);
      column.addEventListener('dragover', event => {
        if (event.dataTransfer?.types.includes(stageMime)) {
          event.preventDefault(); column.classList.remove('drag-over'); clearColumnDrop();
          if (draggedStage !== stage) column.classList.add(event.clientX >= column.getBoundingClientRect().left + column.clientWidth / 2 ? 'column-drop-after' : 'column-drop-before');
        } else if (event.dataTransfer?.types.includes(cardMime)) { event.preventDefault(); column.classList.add('drag-over'); }
      });
      column.addEventListener('dragleave', event => { if (!column.contains(event.relatedTarget as Node)) column.classList.remove('drag-over', 'column-drop-before', 'column-drop-after'); });
      column.addEventListener('drop', event => {
        event.preventDefault(); column.classList.remove('drag-over'); clearColumnDrop();
        const source = event.dataTransfer?.getData(stageMime) as Stage | undefined;
        if (source && stages.includes(source)) { void reorderColumn(source, stage, event.clientX >= column.getBoundingClientRect().left + column.clientWidth / 2); return; }
        const item = items.find(row => row._id === event.dataTransfer?.getData('text/plain'));
        if (!item || boardStage(item) === stage) return;
        void move(item, stage);
      });
      board.append(column);
    }
    if (items.filter(item => item.stage === 'ideas').length >= 100 || stages.some(stage => items.filter(item => item.stage === stage).length >= 100)) {
      status('Showing the latest 100 activities per stage. Archive finished items to keep the board manageable.');
    }
    renderStageTabs(); renderCalendar(); renderArchive();
  }

  function syncWorkspaceView() {
    root.dataset.workspace = workspace;
    $('workspace-title').textContent = view === 'board' ? workspaceNames[workspace] : view === 'calendar' ? 'Calendar' : 'Archive';
    document.title = `${view === 'board' ? workspaceNames[workspace] : view === 'calendar' ? 'Calendar' : 'Archive'} | Committee planner`;
    document.querySelectorAll<HTMLElement>('[data-view]').forEach(link => {
      const selected = link.dataset.view === view && (view !== 'board' || link.dataset.workspace === workspace);
      if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    $('board').hidden = view !== 'board' || workspace === 'hack2027';
    $('hack-checklist').hidden = view !== 'board' || workspace !== 'hack2027';
    $('calendar').hidden = view !== 'calendar'; $('archive').hidden = view !== 'archive';
    $('board-scope').hidden = view !== 'board';
    $('board-filters').hidden = view !== 'board';
    $('board-stage-tabs').hidden = view !== 'board' || workspace === 'hack2027';
  }

  function ownerMark(item: Item) {
    if (!item.lead) return el('span', 'Unassigned', 'hack-unassigned');
    const name = plannerName(item.lead);
    const mark = el('span', nameInitials(name), 'person-avatar'); mark.title = `Lead: ${name}`; mark.setAttribute('aria-label', mark.title);
    return mark;
  }

  function outreachCard(item: Item) {
    const node = card(item); node.classList.add('outreach-card');
    const open = node.querySelector<HTMLButtonElement>('.card-open')!;
    open.replaceChildren(el('strong', item.title));
    if (item.outreachKind) open.append(el('span', item.outreachKind, 'outreach-kind'));
    if (item.nextAction) { const action = el('span', undefined, 'outreach-next-action'); action.append(icon('attachment'), el('span', item.nextAction)); open.append(action); }
    const footer = el('span', undefined, 'outreach-footer'); footer.append(ownerMark(item));
    if (item.date) { const due = el('span', activityDate(item.date, { day: 'numeric', month: 'short' }), 'card-date'); due.prepend(icon('calendar')); footer.append(due); }
    open.append(footer); return node;
  }

  async function toggleChecklist(item: Item, done: boolean) {
    if (checklistSaving.has(item._id)) return;
    const requestSession = sessionId; checklistSaving.add(item._id); renderHackChecklist();
    try {
      await authenticated();
      const revision = await client.mutation(api.planner.setChecklistDone, { id: item._id, revision: item.revision, done });
      if (sessionId !== requestSession || !access) return;
      item.checklistDone = done; item.revision = revision;
      const latest = items.find(candidate => candidate._id === item._id);
      if (latest && latest.revision <= revision) { latest.checklistDone = done; latest.revision = revision; }
      status(done ? 'Task completed.' : 'Task reopened.');
    } catch (error) { if (sessionId === requestSession && access) { showError(error); void refresh(); } }
    finally {
      checklistSaving.delete(item._id);
      if (sessionId === requestSession && access && workspace === 'hack2027' && view === 'board') {
        renderHackChecklist(); $('hack-checklist').querySelector<HTMLInputElement>(`[data-item="${item._id}"] input[type=checkbox]`)?.focus({ preventScroll: true });
      }
    }
  }

  function renderHackChecklist() {
    const container = $('hack-checklist'); container.replaceChildren();
    const visible = items.filter(boardMatches);
    const completed = items.filter(item => item.checklistDone).length;
    const heading = el('div', undefined, 'hack-checklist-heading');
    const intro = el('div'); intro.append(el('h2', 'Hackathon readiness'), el('p', 'Plan the essentials, delivery and follow-up together.'));
    heading.append(intro, el('p', `${completed} of ${items.length} complete`, 'hack-total'));
    const controls = el('div', undefined, 'hack-list-controls');
    for (const [text, collapse] of [['Expand all', false], ['Collapse all', true]] as const) {
      const control = el('button', text, 'quiet-button'); control.type = 'button';
      control.onclick = () => { for (const group of HACK_CHECKLIST_GROUPS) { if (collapse) collapsedHackGroups.add(group.id); else collapsedHackGroups.delete(group.id); } renderHackChecklist(); };
      controls.append(control);
    }
    container.append(heading, controls);
    if (!visible.length) container.append(el('p', workScope === 'mine' ? 'No hackathon tasks are assigned to you yet. Open a task to choose a lead.' : 'No tasks match these filters.', 'hack-empty'));
    const groups = [...HACK_CHECKLIST_GROUPS, { id: 'other', title: 'Other tasks', description: '' }];
    for (const group of groups) {
      const groupItems = visible.filter(item => (HACK_CHECKLIST_GROUPS.some(known => known.id === item.checklistGroup) ? item.checklistGroup : 'other') === group.id).sort((a, b) => a._creationTime - b._creationTime || a._id.localeCompare(b._id));
      if (!groupItems.length) continue;
      const section = el('details', undefined, 'hack-group'); section.dataset.group = group.id;
      section.open = !!search || !collapsedHackGroups.has(group.id);
      section.ontoggle = () => { if (section.open) collapsedHackGroups.delete(group.id); else collapsedHackGroups.add(group.id); };
      const summary = el('summary'); summary.append(el('h3', group.title), el('span', `${groupItems.filter(item => item.checklistDone).length}/${groupItems.length}`, 'hack-group-count'), icon('disclosure'));
      section.append(summary);
      const rows = el('div', undefined, 'hack-group-rows');
      for (const item of groupItems) {
        const row = el('div', undefined, 'hack-task-row'); row.dataset.item = item._id; row.classList.toggle('is-complete', !!item.checklistDone);
        const check = el('input'); check.type = 'checkbox'; check.checked = !!item.checklistDone; check.disabled = checklistSaving.has(item._id);
        check.setAttribute('aria-label', `Complete ${item.title}`); check.onchange = () => void toggleChecklist(item, check.checked);
        const title = el('button', item.title, 'hack-task-open'); title.type = 'button'; title.setAttribute('aria-label', `View ${item.title}`); title.onclick = () => void openPreview(item);
        const taskStage = boardStage(item);
        const state = item.checklistDone ? 'Complete' : taskStage === 'planning' ? 'In progress' : taskStage === 'ready' ? 'Ready for review' : 'To do';
        const badge = el('span', state, 'hack-task-status'); badge.dataset.state = item.checklistDone ? 'complete' : taskStage;
        const due = el('span', undefined, 'hack-task-due');
        if (item.date) { due.append(icon('calendar'), document.createTextNode(activityDate(item.date, { day: 'numeric', month: 'short' }))); }
        const more = el('button', undefined, 'icon-button hack-task-more'); more.type = 'button'; more.setAttribute('aria-label', `Edit ${item.title}`); more.append(icon('more')); more.onclick = () => void openPreview(item);
        row.append(check, title, badge, ownerMark(item), due, more); rows.append(row);
      }
      const add = el('button', 'Add task', 'column-add'); add.prepend(icon('plus')); add.onclick = () => { openEditor(null); field('checklistGroup').value = group.id; };
      rows.append(add); section.append(rows); container.append(section);
    }
  }

  function renderMembers() {
    const officers = SOCIETIES.ai.signatories;
    const members = [...officers.map(officer => officer.name), ...plannerTeams.flatMap(team => [...team.members])].map(plannerName);
    const stack = $('open-members'); stack.replaceChildren(); stack.hidden = false;
    const memberAvatar = (name: string) => {
      const node = el('span', nameInitials(name), 'person-avatar');
      node.title = name; node.setAttribute('aria-hidden', 'true'); return node;
    };
    for (const name of members.slice(0, 3)) stack.append(memberAvatar(name));
    stack.append(el('span', `+${members.length - 3}`, 'person-avatar avatar-more'));
    const list = $('team-members'); list.replaceChildren();
    const officerSection = el('section', undefined, 'member-team'); officerSection.append(el('h3', 'Signatories'));
    for (const { name, role } of officers) {
      const row = el('div', undefined, 'member-row');
      const displayName = plannerName(name);
      const details = el('span', undefined, 'member-details'); details.append(el('span', displayName), el('small', role, 'member-role'));
      row.append(memberAvatar(displayName), details); officerSection.append(row);
    }
    list.append(officerSection);
    for (const team of plannerTeams) {
      const section = el('section', undefined, 'member-team'); section.append(el('h3', team.name));
      for (const name of team.members) { const displayName = plannerName(name); const row = el('div', undefined, 'member-row'); row.append(memberAvatar(displayName), el('span', displayName)); section.append(row); }
      list.append(section);
    }
  }
  function plannerName(name: string) { return profiles.find(profile => profile.rosterName === name)?.name || name; }
  function nameInitials(name: string) { const words = name.trim().split(/\s+/).filter(Boolean); return `${[...(words[0] || '?')][0]}${words.length > 1 ? [...words.at(-1)!][0] : ''}`.toUpperCase(); }
  function syncProfileLabels() {
    for (const option of (field('lead') as HTMLSelectElement).options) if (option.value) option.textContent = plannerName(option.value);
    updateLeadAvatar();
  }
  function updateLeadAvatar() {
    const name = plannerName(field('lead').value);
    $('lead-avatar').textContent = name ? nameInitials(name) : '—';
  }

  function avatar(person: PlannerPerson, title: string) {
    const node = el('span', person.initials, 'person-avatar');
    node.dataset.tone = String([...person.userId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 6);
    node.title = title; node.setAttribute('role', 'img'); node.setAttribute('aria-label', title); return node;
  }
  function fillPeople(container: HTMLElement, item: Item) {
    container.replaceChildren(); const people = new Map<string, PlannerPerson>();
    if (item.createdBy) people.set(item.createdBy.userId, item.createdBy);
    for (const person of item.contributors || []) people.set(person.userId, person);
    const rows = [...people.values()];
    for (const person of rows.slice(0, 6)) {
      const chip = el('span', undefined, 'person-chip');
      chip.append(avatar(person, `${person.userId === item.createdBy?.userId ? 'Created' : 'Edited'} by ${person.name}`), el('span', person.name, 'person-name'));
      container.append(chip);
    }
    if (rows.length > 6) { const more = el('span', `+${rows.length - 6}`, 'person-avatar avatar-more'); more.title = rows.slice(6).map(person => person.name).join(', '); more.setAttribute('aria-label', `${rows.length - 6} more contributors: ${more.title}`); container.append(more); }
  }
  function renderCardPreview() {
    if (!previewItem) return;
    fillPeople($('card-people'), previewItem);
    $('comment-count').textContent = String(previewItem.commentCount ?? comments.length);
    $('item-heading').textContent = previewItem.title;
    renderAttribution(previewItem);
  }
  function cardTime(value: number) {
    const node = el('time', new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(value)));
    node.dateTime = new Date(value).toISOString(); node.title = `${node.textContent} (Europe/London)`;
    return node;
  }
  function renderAttribution(item: Item | null) {
    const container = $('card-attribution'); container.replaceChildren(); container.hidden = !item;
    if (!item) return;
    const created = el('span', undefined, 'card-created-by'); created.id = 'card-created-by';
    created.append(document.createTextNode(item.createdBy ? `Created by ${item.createdBy.name} · ` : 'Created '), cardTime(item._creationTime));
    const updated = el('span', undefined, 'card-updated-at'); updated.id = 'card-updated-at';
    updated.append(document.createTextNode('Updated '), cardTime(item.updatedAt));
    container.append(created, updated);
  }
  async function openPreview(item: Item, targetComment?: Id<'plannerComments'>) {
    if (workspace !== itemWorkspace(item)) {
      workspaceVersion++; workspace = itemWorkspace(item); items = []; boardOrder = [...stages]; boardRevision = 0;
      if (view === 'board') { window.history.replaceState(null, '', `/committee/planner/${workspace}`); lastPlannerUrl = window.location.href; }
      syncWorkspaceView(); void refresh();
    }
    previewVersion++; previewItem = item; comments = []; commentsCursor = null; commentsDone = true; commentsLoading = false; commentsError = false; commentPages = 1; commentRequest = null; commentEdit = null; commentDelete = null;
    activity = []; activityCursor = null; activityDone = true; activityLoading = false; activityRefreshPending = false; activityPages = 1; activityFilter = 'all'; syncActivityFilter();
    commentForm.reset(); commentText.value = commentDrafts.get(item._id) || ''; $('comment-message').textContent = ''; $('comments-status').textContent = 'Loading comments…';
    highlightedComment = targetComment || null; commentMentionPicker.close();
    $('comment-list').replaceChildren(); $('older-comments').hidden = true; $('older-activity').hidden = true; $('activity-status').textContent = ''; renderCardPreview();
    $('card-editor-slot').append(form); $('card-stage-slot').append($('stage-field')); $('card-actions-slot').append($('editor-action-buttons'));
    $('editor-action-buttons').append($('unpublish-item'));
    $('card-collaborators-slot').append($('collaborators-field'));
    cardReviewOpen = false; cardDialog.dataset.panel = targetComment ? 'discussion' : 'card'; syncCardTabs();
    openEditor(item, 'ideas', '', true); setSaveStatus('All changes saved'); cardDialog.showModal(); resizeEditorFields();
    void loadFiles(item._id);
    void loadActivity('initial');
    const version = previewVersion;
    if (!await loadComments('initial')) return;
    while (targetComment && version === previewVersion && !comments.some(comment => comment._id === targetComment) && !commentsDone) {
      $('comments-status').textContent = 'Finding the mentioned comment…'; if (!await loadComments('older')) break;
    }
    if (targetComment && version === previewVersion) {
      const target = $('comment-list').querySelector<HTMLElement>(`[data-comment="${targetComment}"]`);
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center' }); }
      else $('comments-status').textContent = 'This comment is no longer available.';
    }
  }
  async function closeCard() {
    if (fileUploadBusy) { $('file-upload-status').textContent = 'Upload in progress. Finish or cancel the upload before closing.'; return false; }
    if (commentBusy || busy || (commentEdit && commentEdit.text !== commentEdit.original && !window.confirm('Discard your unsaved comment changes?'))) return false;
    clearTimeout(autosaveTimer);
    do { if (!await saveCardNow()) return false; } while (dirty());
    cardDialog.close(); return true;
  }
  cardDialog.addEventListener('cancel', event => { event.preventDefault(); closeCard(); });
  cardDialog.addEventListener('close', () => {
    if (cardDialog.open) return;
    if (previewItem && access) { if (commentText.value.trim()) commentDrafts.set(previewItem._id, commentText.value); else commentDrafts.delete(previewItem._id); }
    previewVersion++; previewItem = null; comments = []; activity = []; activityLoading = false; activityRefreshPending = false; commentsLoading = false; commentsError = false; commentEdit = null; commentDelete = null; commentText.value = '';
    highlightedComment = null; commentMentionPicker.close(); editMentionPicker?.destroy(); editMentionPicker = null;
    clearTimeout(autosaveTimer); editor.append(form); form.querySelector('.editor-stage-bar')!.prepend($('stage-field')); form.querySelector('.editor-actions')!.append($('editor-action-buttons'));
    $('collaborators-home').append($('collaborators-field'));
    $('editor-preview').append($('unpublish-item'));
    resetDescriptionHelp(); current = null; cardReviewOpen = false; files = []; pendingUploads = [];
    for (const id of ['card-people', 'card-attribution', 'attachment-list', 'comment-list', 'comments-status', 'activity-status', 'comment-message', 'comment-count']) $(id).replaceChildren();
  });
  async function refreshCard() {
    if (!previewItem || !cardDialog.open) return;
    const id = previewItem._id; const version = previewVersion;
    await authenticated(); const item = await client.query(api.planner.get, { id, now: timeBucket() });
    if (version !== previewVersion || !access || !cardDialog.open) return;
    if (!item) { closeCard(); return; } previewItem = item; renderCardPreview();
    await loadFiles(id);
    if (!commentEdit && !commentDelete) await loadComments('refresh');
    if (!commentEdit && !commentDelete) await loadActivity('refresh');
  }
  function commentControls() {
    const blocked = commentBusy || commentsLoading;
    commentText.disabled = commentBusy;
    $<HTMLButtonElement>('mention-person').disabled = blocked || !!commentEdit || !!commentDelete;
    $<HTMLButtonElement>('post-comment').disabled = blocked || !!commentEdit || !!commentDelete;
    $<HTMLButtonElement>('older-comments').disabled = blocked || !!commentEdit || !!commentDelete;
    for (const button of $('comment-list').querySelectorAll<HTMLButtonElement>('button')) {
      button.disabled = blocked || ((!!commentEdit || !!commentDelete) && button.dataset.commentAction === 'open');
    }
    for (const input of $('comment-list').querySelectorAll<HTMLTextAreaElement>('textarea')) input.disabled = commentBusy;
    for (const summary of $('comment-list').querySelectorAll<HTMLElement>('summary')) summary.setAttribute('aria-disabled', String(blocked || !!commentEdit || !!commentDelete));
    for (const button of $('card-activity-filter').querySelectorAll<HTMLButtonElement>('button')) button.disabled = commentBusy || !!commentEdit || !!commentDelete;
  }
  function renderComments() {
    editMentionPicker?.destroy(); editMentionPicker = null;
    const list = $('comment-list'); list.replaceChildren();
    const entries = [
      ...comments.map(value => ({ kind: 'comment' as const, value })),
      ...(activityFilter === 'all' ? activity.map(value => ({ kind: 'activity' as const, value })) : []),
    ].sort((a, b) => b.value._creationTime - a.value._creationTime || b.value._id.localeCompare(a.value._id));
    let lastDay = '';
    const today = londonDateKey(Date.now()); const yesterday = new Date(`${today}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    for (const entry of entries) {
      const day = londonDateKey(entry.value._creationTime);
      if (day !== lastDay) {
        const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(entry.value._creationTime));
        const heading = el('li', undefined, 'card-activity-day'); heading.append(el('span', `${day === today ? 'Today · ' : day === yesterdayKey ? 'Yesterday · ' : ''}${date}`)); list.append(heading); lastDay = day;
      }
      if (entry.kind === 'activity') {
        const event = entry.value; const row = el('li', undefined, 'card-activity-entry'); row.dataset.activity = event._id;
        const message = event.text.charAt(0).toLowerCase() + event.text.slice(1);
        const marker = el('span', undefined, 'card-activity-marker'); marker.setAttribute('aria-hidden', 'true'); marker.append(icon(message.startsWith('created') ? 'plus' : message.startsWith('moved') ? 'external' : 'waiting'));
        const content = el('div', undefined, 'card-activity-content'); const text = el('div'); text.append(el('strong', event.author.name), document.createTextNode(` ${message}`)); content.append(text, cardTime(event._creationTime)); row.append(marker, content); list.append(row); continue;
      }
      const comment = entry.value;
      const row = el('li', undefined, 'comment'); row.dataset.comment = comment._id; row.append(avatar(comment.author, comment.author.name));
      if (comment._id === highlightedComment) row.classList.add('comment-highlight');
      const content = el('div', undefined, 'comment-content'); const heading = el('div', undefined, 'comment-heading');
      heading.append(el('strong', comment.author.name), cardTime(comment._creationTime));
      if (comment.editedAt) { const edited = el('span', 'Edited', 'comment-edited'); edited.title = `Edited ${new Date(comment.editedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}`; heading.append(edited); }
      content.append(heading);
      if (commentEdit?.id === comment._id) {
        const edit = el('form', undefined, 'comment-edit-form');
        const input = el('textarea'); input.value = commentEdit.text; input.required = true; input.maxLength = 2000; input.rows = 3; input.setAttribute('aria-label', 'Edit your comment');
        input.oninput = () => { if (commentEdit?.id === comment._id) commentEdit.text = input.value; };
        const actions = el('div', undefined, 'comment-edit-actions'); const cancel = el('button', 'Cancel', 'quiet-button'); cancel.type = 'button'; cancel.setAttribute('aria-label', 'Cancel editing comment');
        cancel.onclick = async () => { commentEdit = null; renderComments(); await loadComments('refresh'); rowFocus(comment._id, 'Edit comment'); };
        const save = el('button', 'Save changes', 'secondary-button'); save.type = 'submit'; actions.append(cancel, save); edit.append(input, actions);
        edit.onsubmit = event => { event.preventDefault(); if (commentEdit?.text.trim()) void changeComment(comment, 'edit'); }; content.append(edit); editMentionPicker = createMentionPicker(input, () => mentionPeople);
      } else {
        const text = el('p'); appendMentionText(text, comment.text, comment.mentions); content.append(text);
        if (comment.author.userId === access?.userId) {
          const actions = el('div', undefined, 'comment-tools');
          if (commentDelete === comment._id) {
            actions.classList.add('comment-delete-confirm'); actions.append(el('span', 'Delete this comment?'));
            const cancel = el('button', 'Keep comment', 'quiet-button'); cancel.type = 'button'; cancel.onclick = () => { commentDelete = null; renderComments(); rowFocus(comment._id, 'Delete comment'); };
            const remove = el('button', 'Delete comment', 'quiet-button comment-delete'); remove.type = 'button'; remove.setAttribute('aria-label', 'Confirm delete comment'); remove.onclick = () => void changeComment(comment, 'delete'); actions.append(cancel, remove);
          } else {
            const edit = el('button', 'Edit', 'quiet-button'); edit.type = 'button'; edit.setAttribute('aria-label', 'Edit comment'); edit.dataset.commentAction = 'open';
            edit.onclick = () => { if (commentBusy || commentsLoading || commentEdit || commentDelete) return; commentEdit = { id: comment._id, text: comment.text, original: comment.text, revision: comment.revision ?? 0 }; $('comment-message').textContent = ''; renderComments(); $('comment-list').querySelector<HTMLTextAreaElement>('textarea')?.focus(); };
            const remove = el('button', 'Delete', 'quiet-button comment-delete'); remove.type = 'button'; remove.setAttribute('aria-label', 'Delete comment'); remove.dataset.commentAction = 'open';
            remove.onclick = () => { if (commentBusy || commentsLoading || commentEdit || commentDelete) return; commentDelete = comment._id; $('comment-message').textContent = ''; renderComments(); rowFocus(comment._id, 'Keep comment'); };
            const menu = el('details', undefined, 'comment-menu');
            const toggle = el('summary'); toggle.setAttribute('aria-label', 'Comment actions'); toggle.title = 'Comment actions'; toggle.append(icon('more'));
            toggle.onclick = event => { if (commentBusy || commentsLoading || commentEdit || commentDelete) event.preventDefault(); };
            actions.append(edit, remove); menu.append(toggle, actions); content.append(menu);
          }
          if (commentDelete === comment._id) content.append(actions);
        }
      }
      row.append(content); list.append(row);
    }
    renderCommentStatus();
    $('older-comments').hidden = commentsDone; commentControls();
    $('older-activity').hidden = activityFilter === 'comments' || activityDone;
    $<HTMLButtonElement>('older-activity').disabled = activityLoading || !!commentEdit || !!commentDelete || commentBusy;
  }
  function renderCommentStatus() {
    if (commentsError) return;
    $('comments-status').textContent = comments.length || (activityFilter === 'all' && activity.length) ? '' : commentsLoading ? 'Loading comments…' : activityFilter === 'comments' ? 'No comments yet.' : activityLoading || $('activity-status').textContent ? '' : 'No activity yet.';
  }
  function rowFocus(id: Id<'plannerComments'>, label: string) {
    const row = $('comment-list').querySelector<HTMLElement>(`[data-comment="${id}"]`);
    const target = row?.querySelector<HTMLElement>(`button[aria-label="${label}"]`);
    const menu = target?.closest('details');
    (menu && !menu.open ? menu.querySelector('summary') : target || row?.querySelector<HTMLElement>('summary, button'))?.focus();
  }
  async function changeComment(comment: Doc<'plannerComments'>, action: 'edit' | 'delete') {
    if (!previewItem || commentBusy || commentsLoading) return;
    const version = previewVersion; commentBusy = true; commentControls(); $('comment-message').textContent = '';
    try {
      await authenticated();
      if (version !== previewVersion || !access) return;
      if (action === 'edit' && commentEdit) {
        const updated = await client.mutation(api.planner.editComment, { id: comment._id, text: commentEdit.text, revision: commentEdit.revision });
        if (version !== previewVersion || !access) return;
        comments = comments.map(row => row._id === updated._id ? updated : row);
      } else if (action === 'delete') {
        await client.mutation(api.planner.deleteComment, { id: comment._id });
        if (version !== previewVersion || !access) return;
        comments = comments.filter(row => row._id !== comment._id);
      }
      commentEdit = null; commentDelete = null; renderComments(); await refreshCard(); await refresh();
      if (version === previewVersion) $('comment-message').textContent = action === 'edit' ? 'Comment updated.' : 'Comment deleted.';
    } catch (error) { if (version === previewVersion) {
      if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else showError(error, 'comment-message');
    } } finally { if (version === previewVersion) { commentBusy = false; renderComments(); } }
  }
  async function loadComments(mode: 'initial' | 'older' | 'refresh') {
    if (!previewItem || commentsLoading || commentEdit || commentDelete) return false;
    const id = previewItem._id; const version = previewVersion; commentsLoading = true; commentsError = false;
    renderCommentStatus();
    commentControls();
    try {
      await authenticated();
      // Refresh every loaded page so edits and deletions in another session reach older comments too.
      let cursor = mode === 'older' ? commentsCursor : null; let done = true; let pages = 0; const loaded: Doc<'plannerComments'>[] = [];
      do {
        const result = await client.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor } });
        if (version !== previewVersion || !access || !cardDialog.open) return false;
        loaded.push(...result.page); cursor = result.continueCursor; done = result.isDone; pages++;
      } while (mode === 'refresh' && !done && pages < commentPages);
      const merged = new Map((mode === 'older' ? comments : []).map(comment => [comment._id, comment])); for (const comment of loaded) merged.set(comment._id, comment);
      comments = [...merged.values()].sort((a, b) => a._creationTime - b._creationTime || a._id.localeCompare(b._id));
      commentsCursor = cursor; commentsDone = done; commentPages = mode === 'older' ? commentPages + 1 : pages;
      renderComments();
      return true;
    } catch (error) {
      if (version === previewVersion) { commentsError = true; $('comments-status').textContent = 'Could not load comments. '; const retry = el('button', 'Try again', 'quiet-button'); retry.onclick = () => void loadComments(mode); $('comments-status').append(retry); }
      return false;
    } finally { if (version === previewVersion) { commentsLoading = false; commentControls(); renderCommentStatus(); } }
  }
  $('older-comments').onclick = () => void loadComments('older');
  async function loadActivity(mode: 'initial' | 'older' | 'refresh') {
    if (!previewItem || commentEdit || commentDelete) return;
    if (activityLoading) { if (mode === 'refresh') activityRefreshPending = true; return; }
    const id = previewItem._id; const version = previewVersion; activityLoading = true;
    $<HTMLButtonElement>('older-activity').disabled = true;
    if (mode === 'initial') $('activity-status').textContent = 'Loading activity…';
    try {
      await authenticated();
      let cursor = mode === 'older' ? activityCursor : null; let done = true; let pages = 0;
      const loaded: PlannerActivity[] = [];
      do {
        const result = await client.query(api.planner.listActivity, { id, paginationOpts: { numItems: 30, cursor } });
        if (version !== previewVersion || !access || !cardDialog.open) return;
        loaded.push(...result.page); cursor = result.continueCursor; done = result.isDone; pages++;
      } while (!done && ((loaded.length === 0 && pages < 6) || (mode === 'refresh' && pages < activityPages)));
      const merged = new Map((mode === 'older' ? activity : []).map(entry => [entry._id, entry]));
      for (const entry of loaded) merged.set(entry._id, entry);
      activity = [...merged.values()]; activityCursor = cursor; activityDone = done;
      activityPages = mode === 'older' ? activityPages + pages : pages;
      $('activity-status').textContent = '';
      if (!commentEdit && !commentDelete) renderComments();
    } catch (error) {
      if (version === previewVersion && access) {
        if (error instanceof Error && error.message.includes('Committee access required')) { showAccess('Committee access is no longer available.'); return; }
        $('activity-status').textContent = 'Could not load card activity. ';
        const retry = el('button', 'Try again', 'quiet-button'); retry.type = 'button'; retry.onclick = () => void loadActivity(mode); $('activity-status').append(retry);
      }
    } finally {
      if (version === previewVersion) {
        activityLoading = false; $<HTMLButtonElement>('older-activity').disabled = commentBusy || !!commentEdit || !!commentDelete;
        renderCommentStatus();
        if (activityRefreshPending) { activityRefreshPending = false; void loadActivity('refresh'); }
      }
    }
  }
  function londonDateKey(timestamp: number) {
    const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/London' }).formatToParts(timestamp);
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
  }
  function syncActivityFilter() {
    for (const button of $('card-activity-filter').querySelectorAll<HTMLButtonElement>('button')) button.setAttribute('aria-pressed', String(button.dataset.activityFilter === activityFilter));
    $('activity-status').hidden = activityFilter === 'comments';
  }
  for (const button of $('card-activity-filter').querySelectorAll<HTMLButtonElement>('button')) button.onclick = () => { activityFilter = button.dataset.activityFilter as typeof activityFilter; syncActivityFilter(); renderComments(); };
  $('older-activity').onclick = () => void loadActivity('older');
  $('attach-comment-file').onclick = () => { $('card-tab').click(); $('add-attachment').click(); };
  commentForm.onsubmit = event => { event.preventDefault(); void (async () => {
    if (!previewItem || commentBusy || commentsLoading || commentEdit || commentDelete || !commentText.value.trim()) return;
    const id = previewItem._id; const version = previewVersion; const text = commentText.value.trim();
    if (!commentRequest || commentRequest.text !== text) commentRequest = { text, id: crypto.randomUUID() };
    commentBusy = true; commentControls(); $('comment-message').textContent = '';
    try {
      await authenticated(); await client.mutation(api.planner.addComment, { id, text, requestId: commentRequest.id });
      if (version !== previewVersion || !access) return;
      commentText.value = ''; commentDrafts.delete(id); commentRequest = null; await refreshCard(); await refresh();
    } catch (error) { if (version === previewVersion) {
      if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else showError(error, 'comment-message');
    } } finally { if (version === previewVersion) { commentBusy = false; renderComments(); } }
  })(); };

  $('mention-person').onclick = () => {
    if (commentText.disabled) return;
    const start = commentText.selectionStart;
    if (!/(?:^|\s)@[^\s]*$/.test(commentText.value.slice(0, start))) {
      const prefix = start > 0 && !/\s/.test(commentText.value[start - 1]) ? ' @' : '@';
      commentText.setRangeText(prefix, start, commentText.selectionEnd, 'end');
    }
    commentText.focus(); commentText.dispatchEvent(new Event('input', { bubbles: true }));
  };
  // Capture before a trigger opens its panel, so the opening click only dismisses older panels.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Node) || (!cardDialog.open && !editor.open)) return;
    const target = event.target;
    for (const menu of form.querySelectorAll<HTMLDetailsElement>('#team-picker-menu[open]')) {
      if (!menu.contains(target)) menu.open = false;
    }
    for (const panel of cardDialog.querySelectorAll<HTMLDetailsElement>('.card-detail-panel[open], #card-actions[open], .comment-menu[open]')) {
      if (!panel.contains(target)) {
        panel.open = false;
        panel.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(details => { details.open = false; });
      }
    }
    const attachments = $('attachment-editor');
    if (!attachments.contains(target)) attachments.hidden = true;
    if (cardReviewOpen && !$('editor-preview').contains(target)) { cardReviewOpen = false; updatePreview(); }
  }, true);
  cardDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('attachment-editor').hidden) { event.preventDefault(); event.stopPropagation(); $('attachment-editor').hidden = true; $('add-attachment').focus(); return; }
    const panel = cardDialog.querySelector<HTMLDetailsElement>('.card-detail-panel[open], #team-picker-menu[open], #card-actions[open]');
    if (event.key === 'Escape' && panel) {
      event.preventDefault(); event.stopPropagation(); panel.open = false;
      panel.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(details => { details.open = false; });
      (panel.id === 'private-options' ? $('card-actions').querySelector('summary') : panel.querySelector('summary'))?.focus();
      return;
    }
    if (event.key === 'Escape' && cardReviewOpen) { event.preventDefault(); event.stopPropagation(); cardReviewOpen = false; updatePreview(); return; }
    const menu = cardDialog.querySelector<HTMLDetailsElement>('.comment-menu[open]');
    if (event.key === 'Escape' && menu) {
      event.preventDefault(); event.stopPropagation(); menu.open = false; menu.querySelector('summary')?.focus();
    }
  });

  function card(item: Item) {
    const node = el('article', undefined, 'planner-card'); node.draggable = true; node.dataset.item = item._id;
    node.addEventListener('dragstart', event => { event.dataTransfer?.setData(cardMime, item._id); event.dataTransfer?.setData('text/plain', item._id); });
    const open = el('button', undefined, 'card-open'); open.setAttribute('aria-label', `View ${item.title}`); open.title = item.title;
    open.append(el('strong', item.title));
    const footer = el('span', undefined, 'card-footer');
    const summary: string[] = [];
    const teams = assignedTeams(item);
    const teamNames = teams.map(id => plannerTeams.find(team => team.id === id)?.name).filter(Boolean).join(', ');
    if (teamNames) summary.push(teamNames);
    if (selectedTeam === 'all') {
      const team = teams[0];
      if (team) {
        const names: Record<PlannerTeam, string> = { learning: 'Learning', events: 'Events', industry: 'Industry', projects: 'Projects', careers: 'Careers' };
        const badge = el('span', `${names[team]}${teams.length > 1 ? ` +${teams.length - 1}` : ''}`, 'team-badge');
        badge.dataset.team = team; badge.title = teamNames; footer.append(badge);
      }
    }
    if (item.date) {
      const fullDate = `Due ${activityDate(item.date, { weekday: 'long', day: 'numeric', month: 'long' })}`;
      const date = el('span', activityDate(item.date, { day: 'numeric', month: 'short' }), 'card-date'); date.title = fullDate; date.prepend(icon('calendar')); footer.append(date); summary.push(fullDate);
    }
    if (item.tasks.length) {
      const complete = item.tasks.filter(task => task.done).length;
      const progress = el('span', `${complete}/${item.tasks.length}`, 'card-stat'); progress.title = `${complete} of ${item.tasks.length} checklist items complete`; progress.prepend(icon('checklist')); footer.append(progress); summary.push(progress.title);
    }
    if (item.waitingOn) {
      const waiting = el('span', undefined, 'card-waiting'); waiting.title = `Waiting: ${item.waitingOn}`; waiting.append(icon('waiting'), el('span', waiting.title, 'sr-only')); footer.append(waiting); summary.push(waiting.title);
    }
    if (item.published) {
      const live = el('span', undefined, 'card-live'); live.title = 'Live on website'; live.append(icon('external'), el('span', live.title, 'sr-only')); footer.append(live); summary.push(live.title);
    }
    if (item.lead) {
      const lead = el('span', undefined, 'card-lead');
      const name = plannerName(item.lead); const initials = el('span', nameInitials(name), 'person-avatar'); initials.setAttribute('aria-hidden', 'true');
      lead.append(initials, el('span', name, 'card-lead-name sr-only')); lead.title = `Lead: ${name}`; lead.setAttribute('aria-label', lead.title); footer.append(lead); summary.push(lead.title);
    } else summary.push('No lead assigned');
    if (footer.childElementCount) open.append(footer);
    open.setAttribute('aria-description', summary.join('. '));
    open.onclick = () => openPreview(item); node.append(open);
    const menu = el('details', undefined, 'card-menu'); const trigger = el('summary'); trigger.setAttribute('aria-label', `Actions for ${item.title}`); trigger.append(icon('more'));
    const actions = el('div', undefined, 'card-menu-actions');
    for (const stage of stages.filter(stage => stage !== boardStage(item))) {
      const button = el('button', `Move to ${stageLabel(stage, item)}`); button.type = 'button'; button.onclick = () => { menu.open = false; void move(item, stage); }; actions.append(button);
    }
    menu.addEventListener('toggle', () => { if (menu.open) document.querySelectorAll<HTMLDetailsElement>('.card-menu[open]').forEach(other => { if (other !== menu) other.open = false; }); });
    menu.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); event.stopPropagation(); menu.open = false; trigger.focus(); } });
    menu.append(trigger, actions); node.append(menu);
    return node;
  }

  async function move(item: Item, stage: Stage | 'archived') {
    if (busy) return;
    try { busy = true; await authenticated();
      if (stage === 'archived' || item.stage === 'archived') await client.mutation(api.planner.move, { id: item._id, revision: item.revision, stage });
      else await client.mutation(api.planner.moveOnBoard, { id: item._id, revision: item.revision, stage });
      status(stage === 'archived' ? 'Card archived.' : 'Card moved.'); }
    catch (error) { showError(error); }
    finally { busy = false; await refresh(); }
  }

  async function loadCalendar(force = false) {
    const month = calendarMonth.toISOString().slice(0, 7);
    const version = ++calendarVersion;
    if (!force && calendarLoadedMonth === month) { calendarLoading = false; calendarError = ''; renderCalendar(); return; }
    calendarLoading = true; calendarError = ''; renderCalendar();
    try {
      await authenticated();
      const result = await client.query(api.planner.calendar, { month, now: timeBucket() });
      if (version !== calendarVersion || !access) return;
      calendarItems = result.items; calendarHasMore = result.hasMore; calendarLoadedMonth = month;
    } catch (error) {
      if (version === calendarVersion) calendarError = 'Could not load this month. Please try again.';
    } finally {
      if (version === calendarVersion) { calendarLoading = false; renderCalendar(); }
    }
  }

  async function openCalendarItem(item: PlannerCalendarItem) {
    const requestSession = sessionId;
    try { await authenticated(); const fullItem = await client.query(api.planner.get, { id: item._id, now: timeBucket() });
      if (requestSession !== sessionId || !access) return;
      if (!fullItem) throw new Error('This activity is no longer available.');
      openPreview(fullItem);
    } catch (error) { showError(error); }
  }

  function renderCalendar() {
    const container = $('calendar');
    const focused = container.contains(document.activeElement) ? (document.activeElement as HTMLElement)?.id : '';
    container.replaceChildren(); container.setAttribute('aria-busy', String(calendarLoading));
    const month = calendarMonth.toISOString().slice(0, 7);
    const monthItems = calendarLoadedMonth === month ? calendarItems.filter(matches).sort((a, b) =>
      `${a.date} ${a.startTime || '99:99'}`.localeCompare(`${b.date} ${b.startTime || '99:99'}`) || a.title.localeCompare(b.title)) : [];
    const toolbar = el('div', undefined, 'calendar-toolbar');
    const heading = el('div'); const title = el('h2', new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(calendarMonth));
    title.id = 'calendar-month'; title.setAttribute('aria-live', 'polite');
    heading.append(title, el('p', 'Europe/London · includes archived events', 'calendar-caption'));
    const controls = el('div', undefined, 'calendar-controls');
    const prev = el('button', '‹', 'calendar-nav'); prev.id = 'calendar-prev'; prev.setAttribute('aria-label', 'Previous month');
    const next = el('button', '›', 'calendar-nav'); next.id = 'calendar-next'; next.setAttribute('aria-label', 'Next month');
    prev.disabled = month === '1000-01'; next.disabled = month === '9999-12';
    prev.onclick = () => { calendarMonth.setUTCMonth(calendarMonth.getUTCMonth() - 1); void loadCalendar(); };
    next.onclick = () => { calendarMonth.setUTCMonth(calendarMonth.getUTCMonth() + 1); void loadCalendar(); };
    const today = el('button', 'Today', 'calendar-today'); today.id = 'calendar-today';
    today.onclick = () => { calendarMonth = new Date(`${londonToday().slice(0, 7)}-01T12:00:00Z`); void loadCalendar(); };
    controls.append(prev, today, next); toolbar.append(heading, controls); container.append(toolbar);
    if (calendarLoading || calendarError) {
      const feedback = el('div', calendarError || 'Loading this month…', 'calendar-feedback'); feedback.setAttribute('role', 'status');
      if (calendarError) { const retry = el('button', 'Try again', 'quiet-button'); retry.onclick = () => void loadCalendar(true); feedback.append(retry); }
      container.append(feedback);
    }
    if (!calendarLoading && !calendarError && calendarLoadedMonth === month && !monthItems.length) {
      const empty = el('div', undefined, 'calendar-empty'); empty.append(el('strong', 'No activities scheduled this month.'), el('p', 'Choose a day to start planning, or add an event below.'));
      const add = el('button', 'Plan an event', 'secondary-button'); add.onclick = () => openEditor(null, 'planning', month === londonToday().slice(0, 7) ? londonToday() : `${month}-01`); empty.append(add); container.append(empty);
    }
    if (calendarLoadedMonth === month && calendarHasMore) container.append(el('p', 'Showing the first 200 scheduled activities this month.', 'form-message'));
    const grid = el('div', undefined, 'calendar-grid'); grid.setAttribute('aria-label', title.textContent || 'Calendar');
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) grid.append(el('div', day, 'calendar-weekday'));
    const offset = (calendarMonth.getUTCDay() + 6) % 7;
    const pad = () => { const cell = el('div', undefined, 'calendar-pad'); cell.setAttribute('aria-hidden', 'true'); grid.append(cell); };
    for (let i = 0; i < offset; i++) pad();
    const end = new Date(Date.UTC(calendarMonth.getUTCFullYear(), calendarMonth.getUTCMonth() + 1, 0)).getUTCDate();
    for (let day = 1; day <= end; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const dayItems = monthItems.filter(item => item.date === date);
      const cell = el('section', undefined, `calendar-day${date === londonToday() ? ' today' : ''}${dayItems.length ? ' has-events' : ''}`); cell.dataset.date = date;
      const add = el('button', undefined, 'calendar-date'); add.id = `calendar-date-${date}`;
      add.setAttribute('aria-label', `Plan an event on ${activityDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`);
      const time = el('time'); time.dateTime = date; time.append(el('span', String(day), 'calendar-day-number'), el('span', activityDate(date, { weekday: 'long', day: 'numeric', month: 'short' }), 'calendar-agenda-date'));
      add.append(time); add.onclick = () => openEditor(null, 'planning', date); cell.append(add);
      for (const item of dayItems) {
        const button = el('button', undefined, 'calendar-event'); button.dataset.stage = item.stage;
        button.append(el('span', item.title, 'calendar-event-title'));
        const meta = el('span', undefined, 'calendar-event-meta');
        const calendarStage = item.stage === 'published' ? 'Live on website' : labels[item.stage];
        const timeLabel = item.internalOnly ? 'Due' : item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : 'Time to confirm';
        meta.append(el('span', timeLabel), el('span', calendarStage, 'calendar-event-stage')); button.append(meta);
        if (item.location) button.append(el('span', item.location, 'calendar-event-location'));
        button.setAttribute('aria-label', `${item.title}, ${timeLabel}, ${calendarStage}`);
        button.onclick = () => void openCalendarItem(item); cell.append(button);
      }
      grid.append(cell);
    }
    for (let i = 0; i < (7 - (offset + end) % 7) % 7; i++) pad();
    container.append(grid);
    const undated = items.filter(item => !item.date && matches(item));
    if (undated.length) {
      const details = el('details', undefined, 'calendar-undated'); details.append(el('summary', `Without a date · ${undated.length}`));
      const list = el('div', undefined, 'calendar-undated-list');
      for (const item of undated) { const open = el('button'); open.append(el('strong', item.title), el('span', labels[boardStage(item)])); open.onclick = () => openPreview(item); list.append(open); }
      details.append(list); container.append(details);
    }
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  }

  async function loadArchive(force = false): Promise<void> {
    if (!access) return;
    if (!force && archiveRequest) return archiveRequest;
    if (!force && archiveLoadedAt && Date.now() - archiveLoadedAt < 30000) { renderArchive(); return; }
    const version = ++archiveVersion;
    archiveLoading = true; archiveError = ''; renderArchive();
    archiveRequest = (async () => {
      try {
        await authenticated();
        if (version !== archiveVersion || !access) return;
        const latest = await client.query(api.planner.list, { archived: true, now: timeBucket() });
        if (version !== archiveVersion || !access) return;
        archived = latest; archiveLoadedAt = Date.now();
      } catch (error) {
        if (version !== archiveVersion || !access) return;
        if (error instanceof Error && error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
        else archiveError = 'Could not load archived cards. Please try again.';
      } finally {
        if (version === archiveVersion) { archiveLoading = false; archiveRequest = null; renderArchive(); }
      }
    })();
    return archiveRequest;
  }

  function renderArchive() {
    const container = $('archive'); container.replaceChildren();
    container.setAttribute('aria-busy', String(archiveLoading));
    if (archiveLoading || archiveError) {
      const feedback = el('p', archiveError || 'Loading archived cards…', 'archive-feedback muted'); feedback.setAttribute('role', 'status');
      if (archiveError) { const retry = el('button', 'Try again', 'quiet-button'); retry.onclick = () => void loadArchive(true); feedback.append(retry); }
      container.append(feedback);
    }
    if (archiveLoadedAt && !archiveLoading && !archiveError && !archived.some(matches)) container.append(el('p', 'No archived cards in this view.', 'muted'));
    for (const item of archived.filter(matches)) {
      const row = el('div', undefined, 'archive-row'); const open = el('button', undefined, 'archive-open'); open.append(el('strong', item.title), el('span', `${item.internalOnly ? 'Internal work' : activityKind(item)}${item.date ? ` · ${activityDate(item.date)}` : ''}`)); open.onclick = () => openPreview(item); row.append(open);
      const needsNewDate = !item.internalOnly && item.kind !== 'project' && !!item.date && item.date <= londonToday();
      const restore = el('button', needsNewDate ? 'Reschedule' : 'Restore to Ideas', 'quiet-button');
      restore.onclick = () => { if (needsNewDate) { void openPreview(item); field('dueDate').focus(); } else void move(item, 'ideas'); };
      const remove = el('button', undefined, 'icon-button danger'); remove.type = 'button'; remove.append(icon('delete')); remove.setAttribute('aria-label', `Permanently delete ${item.title}`); remove.title = 'Permanently delete card';
      remove.onclick = () => requestCardDeletion(item, true);
      const actions = el('div', undefined, 'archive-row-actions'); actions.append(restore, remove);
      row.append(actions); container.append(row);
    }
  }

  function openEditor(item: Item | null, stage: Stage = 'ideas', date = '', fromCard = false) {
    $('editor-back-label').textContent = fromCard ? 'Card' : 'Planner';
    resetDescriptionHelp(); current = item; form.reset();
    for (const id of ['private-options', 'activity-details', 'team-picker-menu', 'card-actions', 'waiting-details', 'outreach-more-details', 'outreach-lead-picker', 'outreach-follow-up-picker']) $<HTMLDetailsElement>(id).open = false;
    $('attachment-editor').hidden = true;
    const activity = item || { ...blankActivity(), date };
    for (const name of Object.keys(blankActivity())) field(name).value = activity[name as keyof Activity];
    field('notes').value = item?.notes || ''; field('owner').value = item?.owner || '';
    field('workspace').value = item ? itemWorkspace(item) : view === 'calendar' ? 'events' : workspace;
    field('workspace').disabled = !!item?.published;
    field('outreachKind').value = item?.outreachKind || '';
    field('nextAction').value = item?.nextAction || '';
    field('checklistGroup').value = item?.checklistGroup || HACK_CHECKLIST_GROUPS[0].id;
    (field('checklistDone') as HTMLInputElement).checked = !!item?.checklistDone;
    const teams = item ? assignedTeams(item) : selectedTeam === 'all' ? [] : [selectedTeam];
    form.querySelectorAll<HTMLInputElement>('input[name="teams"]').forEach(input => { input.checked = teams.includes(input.value as PlannerTeam); });
    field('lead').value = item ? item.lead || '' : workScope === 'mine' && view === 'board' ? myLeadName() : '';
    field('waitingOn').value = item?.waitingOn || '';
    field('purpose').value = item ? item.internalOnly ? 'internal' : 'activity' : date ? 'activity' : 'internal';
    field('purpose').disabled = !!item?.published;
    syncWorkspaceFields();
    field('dueDate').value = item?.date || date;
    const stageField = field('stage') as HTMLSelectElement;
    for (const value of ['published', 'archived']) stageField.querySelector(`[value=${value}]`)?.remove();
    if (item?.stage === 'archived') { const option = el('option', labels[item.stage]); option.value = item.stage; stageField.append(option); }
    stageField.value = item ? boardStage(item) : stage; stageField.disabled = false;
    tasks = structuredClone(item?.tasks || []);
    attachments = structuredClone(item?.attachments || []);
    files = []; pendingUploads = []; $('file-upload-status').hidden = true; $('retry-file-upload').hidden = true; $('cancel-file-upload').hidden = true;
    $('item-heading').textContent = item ? item.title : field('workspace').value === 'outreach' ? 'New company' : 'New card';
    renderAttribution(item);
    $('item-state').textContent = `${stageLabel(item ? boardStage(item) : stage, item || undefined)} · ${item?.published ? 'Public version is live' : 'Private'}`;
    $('delete-card').hidden = !item || item.stage === 'archived'; $('unpublish-item').hidden = item?.stage !== 'published';
    $('item-message').textContent = '';
    renderTasks(); renderAttachments(); updatePreview(); baseline = signature(); if (!fromCard) { editor.showModal(); resizeEditorFields(); field('title').focus(); }
  }

  function syncWorkspaceFields() {
    const area = field('workspace').value as PlannerWorkspace;
    $('outreach-fields').hidden = area !== 'outreach'; $('hack-fields').hidden = area !== 'hack2027';
    $('card-workspace-label').textContent = workspaceNames[area];
    if (area !== 'events') field('purpose').value = 'internal';
    field('purpose').disabled = area !== 'events' || !!current?.published;
    syncOutreachLayout();
    const stageField = field('stage') as HTMLSelectElement;
    for (const option of stageField.options) {
      const stage = option.value as keyof typeof labels;
      option.textContent = area === 'outreach' && stage === 'ideas' ? 'To approach' : area === 'outreach' && stage === 'planning' ? 'Waiting for reply' : area === 'outreach' && stage === 'ready' ? 'In conversation' : labels[stage];
    }
  }

  function renderTasks() {
    const list = $('task-list'); list.replaceChildren();
    tasks.forEach((task, index) => {
      const row = el('div', undefined, 'checklist-row'); const label = el('label');
      const check = el('input'); check.type = 'checkbox'; check.checked = task.done; check.setAttribute('aria-label', `Complete ${task.text}`); check.onchange = () => { task.done = check.checked; updateTaskProgress(); scheduleAutosave(); };
      const text = el('input'); text.value = task.text; text.maxLength = 300; text.setAttribute('aria-label', `Checklist item ${index + 1}`); text.oninput = () => { task.text = text.value; scheduleAutosave(); };
      label.append(check, text); const remove = el('button', undefined, 'quiet-button'); remove.append(icon('close')); remove.type = 'button'; remove.setAttribute('aria-label', `Remove task: ${task.text}`); remove.onclick = () => { tasks.splice(index, 1); renderTasks(); scheduleAutosave(); };
      row.append(label, remove); list.append(row);
    });
    updateTaskProgress();
  }

  function updateTaskProgress() {
    const completed = tasks.filter(task => task.done).length;
    $('task-progress').textContent = tasks.length ? `${completed} / ${tasks.length}` : '';
    const progress = $<HTMLProgressElement>('task-progress-bar'); progress.hidden = !tasks.length; progress.max = tasks.length || 1; progress.value = completed;
  }

  function renderAttachments() {
    const list = $('attachment-list'); list.replaceChildren();
    for (const file of files) {
      const row = el('div', undefined, 'attachment-row file-attachment-row'); const download = el('button', undefined, 'attachment-download'); download.type = 'button'; download.setAttribute('aria-label', `Download ${file.name}`);
      const text = el('span'); text.append(el('strong', file.name));
      const details = el('small', `${file.contentType === 'application/pdf' ? 'PDF' : 'Image'} · ${formatFileSize(file.size)}`);
      if (file.uploadedBy) { const credit = el('small', `Added by ${file.uploadedBy.name} · `); credit.append(cardTime(file._creationTime)); text.append(credit, details); } else text.append(details);
      download.append(icon(file.contentType.startsWith('image/') ? 'image-attachment' : 'attachment'), text);
      download.onclick = () => void downloadFile(file, download);
      const remove = el('button', undefined, 'icon-button'); remove.type = 'button'; remove.append(icon('close')); remove.setAttribute('aria-label', `Remove file: ${file.name}`);
      remove.onclick = () => void (async () => { if (!window.confirm(`Remove ${file.name} from this card? The uploaded file will be deleted.`)) return; remove.disabled = true; try { await authenticated(); await client.mutation(api.planner.removeFile, { id: file._id }); files = files.filter(value => value._id !== file._id); renderAttachments(); await refreshCard(); } catch (error) { fileStatus(error instanceof Error ? error.message : 'Could not remove file'); remove.disabled = false; } })();
      row.append(download, remove); list.append(row);
    }
    for (const [index, attachment] of attachments.entries()) {
      const row = el('div', undefined, 'attachment-row'); const link = el('a'); link.href = attachment.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const text = el('span'); text.append(el('strong', attachment.name), el('small', new URL(attachment.url).hostname)); link.append(icon('attachment'), text);
      const remove = el('button', undefined, 'icon-button'); remove.type = 'button'; remove.append(icon('close')); remove.setAttribute('aria-label', `Remove attachment: ${attachment.name}`); remove.onclick = () => { attachments.splice(index, 1); renderAttachments(); scheduleAutosave(); };
      row.append(link, remove); list.append(row);
    }
    if (!attachments.length && !files.length) { const add = el('button', 'Attach a file or link', 'attachment-empty'); add.type = 'button'; add.onclick = () => $('add-attachment').click(); list.append(add); }
  }

  function formatFileSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }
  function fileStatus(message: string) { $('file-upload-status').hidden = !message; $('file-upload-status').textContent = message; }
  async function loadFiles(id: Id<'plannerItems'>) {
    const version = previewVersion;
    try {
      await authenticated(); const latest = await client.query(api.planner.listFiles, { id });
      if (version === previewVersion && current?._id === id && access) { files = latest; renderAttachments(); }
    } catch (error) { if (version === previewVersion && access) fileStatus(error instanceof Error ? error.message : 'Could not load attachments'); }
  }
  async function downloadFile(file: PlannerFile, button: HTMLButtonElement) {
    button.disabled = true;
    try {
      const token = await authenticated(); const service = await client.query(api.planner.fileService, {});
      const response = await fetch(`${service}?fileId=${encodeURIComponent(file._id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Could not download attachment'); }
      const blob = await response.blob(); if (!access) return;
      const url = URL.createObjectURL(blob); downloadUrls.add(url); const anchor = el('a'); anchor.href = url; anchor.download = file.name; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url); }, 30000);
    } catch (error) { if (access) fileStatus(error instanceof Error ? error.message : 'Could not download attachment'); }
    finally { button.disabled = false; }
  }
  async function uploadFiles() {
    if (fileUploadBusy || !current || !pendingUploads.length) return;
    const id = current._id; const version = previewVersion;
    fileUploadBusy = true; fileAbort = new AbortController(); $('retry-file-upload').hidden = true; $('cancel-file-upload').hidden = false; updatePreview();
    try {
      const token = await authenticated(); const service = await client.query(api.planner.fileService, {});
      while (pendingUploads.length) {
        const entry = pendingUploads[0]; fileStatus(`Uploading ${entry.file.name}…`);
        const response = await fetch(`${service}?itemId=${encodeURIComponent(id)}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': entry.file.type, 'X-File-Name': encodeURIComponent(entry.file.name), 'X-Request-Id': entry.requestId }, body: entry.file, signal: AbortSignal.any([fileAbort.signal, AbortSignal.timeout(120000)]) });
        const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Upload failed. Try again');
        pendingUploads.shift();
        if (version !== previewVersion || !access) return;
        await loadFiles(id);
      }
      fileStatus('Files attached'); $('attachment-editor').hidden = true; await refresh(); await refreshCard();
    } catch (error) {
      if (version === previewVersion && access) { fileStatus(fileAbort?.signal.aborted ? 'Upload cancelled' : error instanceof Error ? error.message : 'Upload failed. Try again'); $('retry-file-upload').hidden = !pendingUploads.length || !!fileAbort?.signal.aborted; }
    } finally {
      fileUploadBusy = false; fileAbort = null; $('cancel-file-upload').hidden = true; $<HTMLInputElement>('attachment-file').value = ''; updatePreview();
    }
  }

  function updatePreview() {
    const stage = field('stage').value;
    const internal = field('purpose').value === 'internal';
    const idea = stage === 'ideas'; const review = !internal && (stage === 'ready' || !!current?.published);
    const compact = inCard();
    const outreach = field('workspace').value === 'outreach';
    $('outreach-stage-slot').dataset.outreachStage = stage;
    $('save-item').hidden = compact;
    field('description').title = compact ? 'Enter to save. Shift+Enter for a new line.' : '';
    $('waiting-details').querySelector('summary span')!.textContent = field('waitingOn').value.trim() ? `Waiting: ${field('waitingOn').value.trim()}` : 'Set waiting status';
    resizeEditorFields();
    editor.classList.toggle('has-preview', review);
    $('activity-details').hidden = internal || (!compact && idea); $('private-options').hidden = !compact && !internal && idea; $('editor-preview').hidden = compact ? !cardReviewOpen : !review;
    if (!compact) $<HTMLDetailsElement>('activity-details').open = !idea;
    $('card-checklist').hidden = !compact && idea; $('card-attachments').hidden = !compact && idea;
    if (outreach) {
      $('private-options').hidden = false;
      $('card-checklist').hidden = false; $('card-attachments').hidden = false;
    }
    $('internal-due-label').hidden = !compact && !internal;
    for (const id of ['card-review', 'card-notes', 'card-waiting-toggle', 'card-people-toggle']) $(id).hidden = !compact;
    $('card-area').hidden = !compact || !!current?.published;
    $('card-review').hidden = !compact || internal;
    syncTeamPicker();
    updateLeadAvatar();
    syncOutreachAssignments();
    $<HTMLInputElement>('attachment-file').disabled = !current || fileUploadBusy;
    $('file-upload-help').hidden = !!current;
    $('stage-help').textContent = idea ? 'Start with a title and a few words. Work out the details later.' : field('stage').value === 'archived' ? 'Archived events stay on the calendar. To reschedule, choose a future date and move it to In progress.' : review ? 'Check the public details here. Ready is still private.' : 'Add the practical details as they are confirmed.';
    $('save-item').textContent = idea ? 'Save idea' : field('stage').value === 'archived' ? 'Save changes' : 'Save draft';
    if (internal) { $('stage-help').textContent = 'Internal work stays on the committee board.'; $('save-item').textContent = 'Save card'; }
    if (outreach && !compact) $('save-item').textContent = current ? 'Save card' : 'Create card';
    const activity = readActivity(); const preview = $('public-preview'); preview.replaceChildren();
    preview.append(el('p', activity.date ? activityDate(activity.date) : activity.kind === 'project' ? 'Ongoing project' : 'Date to confirm', 'preview-date'), el('h4', activity.title || 'Your activity title'));
    preview.append(el('p', [activity.startTime ? `${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ''}` : '', activity.location].filter(Boolean).join(' · ')));
    preview.append(el('p', activity.description || 'Your public description will appear here.'));
    preview.append(el('span', activity.kind === 'project' ? 'Explore project' : 'View details', 'preview-cta'));
    const missing = [!activity.title && 'Title', !activity.description && 'Description', activity.kind !== 'project' && !activity.date && 'Date', activity.kind !== 'project' && !activity.startTime && 'Start time', activity.kind !== 'project' && !activity.location && 'Room or location'].filter((value): value is string => !!value);
    const list = $('publication-missing'); list.replaceChildren();
    for (const detail of missing) list.append(el('li', `Add ${detail.toLowerCase()}`));
    list.hidden = !missing.length;
    $('publish-item').hidden = !review;
    $<HTMLButtonElement>('publish-item').disabled = busy || missing.length > 0;
    $('publish-item').textContent = current?.stage === 'published' ? 'Publish changes' : 'Publish to website';
    $('publication-help').textContent = current?.stage === 'published' ? 'Saved edits stay private until you publish changes. This preview shows your current draft.' : 'Ready stays private. Publish when the public details are confirmed.';
  }

  async function persist(silent = false) {
    if (!(silent ? form.checkValidity() : form.reportValidity())) return false;
    const savedSignature = signature(); const savingItem = current; const version = previewVersion;
    const area = field('workspace').value as PlannerWorkspace;
    const payload = structuredClone({ activity: readActivity(), workspace: area,
      ...(area === 'outreach' ? { outreachKind: field('outreachKind').value, nextAction: field('nextAction').value } : {}),
      ...(area === 'hack2027' ? { checklistGroup: field('checklistGroup').value, checklistDone: (field('checklistDone') as HTMLInputElement).checked } : {}),
      teams: selectedTeams(), lead: field('lead').value || null, waitingOn: field('waitingOn').value, internalOnly: field('purpose').value === 'internal', notes: field('notes').value, owner: field('owner').value, tasks, attachments });
    const stage = field('stage').value;
    await authenticated();
    let id: Id<'plannerItems'>;
    if (savingItem) {
      id = savingItem._id;
      await client.mutation(api.planner.save, { id, revision: savingItem.revision, ...payload, ...(savingItem.stage === 'published' ? { workflowStage: stage as Stage } : stage !== 'archived' ? { stage: stage as Stage } : {}) });
    } else id = await client.mutation(api.planner.create, { ...payload, stage: stage as Stage });
    const [savedItems, savedItem] = await Promise.all([client.query(api.planner.list, { now: timeBucket(), workspace }), client.query(api.planner.get, { id, now: timeBucket() })]);
    if (!access || version !== previewVersion) return false;
    items = savedItems; current = savedItem;
    if (!current) throw new Error('Activity saved but could not be reloaded. Close and reopen the board.');
    baseline = savedSignature;
    if (signature() === savedSignature) {
      const stageField = field('stage') as HTMLSelectElement;
      const archivedOption = stageField.querySelector('[value=archived]');
      if (current.stage !== 'archived') archivedOption?.remove();
      else if (!archivedOption) { const option = el('option', labels.archived); option.value = 'archived'; stageField.append(option); }
      stageField.value = boardStage(current); baseline = signature();
    }
    if (cardDialog.open) { previewItem = current; renderCardPreview(); void loadActivity('refresh'); }
    $('delete-card').hidden = current.stage === 'archived';
    $('item-state').textContent = `${stageLabel(boardStage(current), current)} · ${current.published ? 'Public version is live' : 'Private'}`;
    updatePreview(); render(); void loadArchive(true); if (view === 'calendar') void loadCalendar(true); return true;
  }

  function setBusy(value: boolean) { busy = value; form.inert = value; field('stage').disabled = value; for (const id of ['save-item', 'publish-item', 'delete-card', 'unpublish-item']) $<HTMLButtonElement>(id).disabled = value; $<HTMLButtonElement>('help-description').disabled = value || aiBusy; updatePreview(); if (!value && (profileRefreshPending || refreshPending) && access) void refresh(); }
  function syncTeamPicker() {
    const summary = $('team-picker-summary'); summary.replaceChildren();
    for (const id of selectedTeams()) { const team = plannerTeams.find(team => team.id === id)!; const badge = el('span', team.name, 'team-badge'); badge.dataset.team = team.id; summary.append(badge); }
    if (!summary.childElementCount) summary.append(el('span', 'Unassigned', 'unassigned-team'));
    summary.append(icon('plus'));
  }
  function setSaveStatus(message: string, error = false) {
    $('card-save-status').textContent = message; $('card-save-status').title = message;
    $('card-save-status').parentElement!.classList.toggle('save-error', error); $('retry-card-save').hidden = !error;
  }
  function scheduleAutosave() {
    if (!cardDialog.open || !current) return;
    clearTimeout(autosaveTimer);
    setSaveStatus(dirty() ? 'Unsaved changes' : 'All changes saved');
    autosaveTimer = setTimeout(() => void saveCardNow(), 700);
  }
  async function saveCardNow(): Promise<boolean> {
    clearTimeout(autosaveTimer);
    if (!cardDialog.open || !current) return true;
    if (autosavePromise) { if (!await autosavePromise) return false; return saveCardNow(); }
    if (!dirty()) return true;
    if (busy) return false;
    if (!form.checkValidity()) { setSaveStatus('Add a title and check the highlighted fields', true); return false; }
    const version = previewVersion;
    autosavePromise = (async () => {
      setSaveStatus('Saving…');
      try {
        if (!await persist(true)) return false;
        if (version === previewVersion) { setSaveStatus(dirty() ? 'Unsaved changes' : 'All changes saved'); }
        return true;
      } catch (error) {
        if (version === previewVersion) { setSaveStatus(error instanceof Error ? error.message.replace(/\[.*?\]\s*/g, '') : 'Could not save changes', true); }
        return false;
      } finally { autosavePromise = null; }
    })();
    const saved = await autosavePromise;
    if (saved && version === previewVersion && dirty()) { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(() => void saveCardNow(), 150); }
    return saved;
  }
  $('retry-card-save').onclick = () => void saveCardNow();
  function syncCardTabs() {
    $('card-tab').setAttribute('aria-selected', String(cardDialog.dataset.panel !== 'discussion'));
    $('discussion-tab').setAttribute('aria-selected', String(cardDialog.dataset.panel === 'discussion'));
    $('card-tab').tabIndex = cardDialog.dataset.panel === 'discussion' ? -1 : 0;
    $('discussion-tab').tabIndex = cardDialog.dataset.panel === 'discussion' ? 0 : -1;
  }
  function resizeEditorFields() {
    const title = field('title') as HTMLTextAreaElement;
    if (!title.offsetWidth) return;
    title.style.height = 'auto'; title.style.height = `${title.scrollHeight + 2}px`;
    const description = field('description') as HTMLTextAreaElement;
    const scroll = description.scrollTop;
    description.style.height = '0px'; description.style.height = `${description.scrollHeight + 2}px`;
    description.scrollTop = scroll;
  }
  window.addEventListener('resize', resizeEditorFields);
  for (const [id, panel] of [['card-tab', 'card'], ['discussion-tab', 'discussion']]) $(id).onclick = () => { cardDialog.dataset.panel = panel; syncCardTabs(); resizeEditorFields(); };
  for (const id of ['card-tab', 'discussion-tab']) $(id).onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const target = event.key === 'Home' ? 'card-tab' : event.key === 'End' ? 'discussion-tab' : id === 'card-tab' ? 'discussion-tab' : 'card-tab'; $(target).click(); $(target).focus(); } };
  function closeCardOptions() { $<HTMLDetailsElement>('card-actions').open = false; }
  function revealOutreachDetails() { if (field('workspace').value === 'outreach') $<HTMLDetailsElement>('outreach-more-details').open = true; }
  $('card-notes').onclick = () => { closeCardOptions(); revealOutreachDetails(); $<HTMLDetailsElement>('private-options').open = true; field('notes').focus(); };
  $('card-area').onclick = () => { closeCardOptions(); revealOutreachDetails(); $<HTMLDetailsElement>('private-options').open = true; field('workspace').focus(); };
  $('card-waiting-toggle').onclick = () => { closeCardOptions(); revealOutreachDetails(); $<HTMLDetailsElement>('private-options').open = true; $<HTMLDetailsElement>('waiting-details').open = true; field('waitingOn').focus(); };
  $('card-review').onclick = () => { closeCardOptions(); cardReviewOpen = !cardReviewOpen; updatePreview(); };
  $('card-people-toggle').onclick = () => { closeCardOptions(); $<HTMLDialogElement>('card-people-dialog').showModal(); };
  document.querySelectorAll<HTMLButtonElement>('.close-card-panel').forEach(button => button.onclick = () => { const details = button.closest('details'); if (details) details.open = false; });
  $('add-attachment').onclick = () => { revealOutreachDetails(); $('attachment-editor').hidden = false; $('attachment-error').textContent = ''; $('attachment-url').focus(); };
  $<HTMLInputElement>('attachment-file').onchange = () => {
    if (fileUploadBusy || !current) return;
    const selected = [...($<HTMLInputElement>('attachment-file').files || [])];
    const types: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };
    if (files.length + selected.length > 10) { fileStatus('Attach up to 10 files per card'); return; }
    for (const file of selected) {
      const type = file.type || types[file.name.split('.').pop()?.toLowerCase() || ''];
      if (!Object.values(types).includes(type)) { fileStatus('Choose PDFs or PNG, JPEG, GIF, WebP or AVIF images'); return; }
      if (!file.size || file.size > 10 * 1024 * 1024) { fileStatus('Choose files up to 10 MB each'); return; }
      if (file.name.length > 160) { fileStatus('Use file names up to 160 characters'); return; }
    }
    pendingUploads = selected.map(file => ({ file: file.type ? file : new File([file], file.name, { type: types[file.name.split('.').pop()!.toLowerCase()] }), requestId: crypto.randomUUID() }));
    void uploadFiles();
  };
  $('retry-file-upload').onclick = () => void uploadFiles();
  $('cancel-file-upload').onclick = () => { fileAbort?.abort(); pendingUploads = []; };
  $('cancel-attachment').onclick = () => { $('attachment-editor').hidden = true; $<HTMLInputElement>('attachment-url').value = ''; $<HTMLInputElement>('attachment-name').value = ''; };
  $('save-attachment').onclick = () => {
    const url = $<HTMLInputElement>('attachment-url').value.trim(); const name = $<HTMLInputElement>('attachment-name').value.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || url.length > 1500) throw new Error('Use a complete https:// link');
      if (!name || name.length > 160) throw new Error('Add a name for this attachment');
      if (attachments.length >= 10) throw new Error('Attach up to 10 links per card');
      attachments.push({ name, url }); renderAttachments(); $('attachment-editor').hidden = true; $<HTMLInputElement>('attachment-url').value = ''; $<HTMLInputElement>('attachment-name').value = ''; scheduleAutosave();
    } catch (error) { $('attachment-error').textContent = error instanceof Error ? error.message : 'Check the attachment link'; }
  };
  const changed = (event: Event) => { if (event.target === field('date') && inCard()) field('dueDate').value = field('date').value; updatePreview(); scheduleAutosave(); };
  form.addEventListener('input', changed); form.addEventListener('change', changed);
  form.addEventListener('focusout', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) void saveCardNow();
  });
  form.addEventListener('keydown', event => {
    if (!inCard() || event.defaultPrevented || event.isComposing || event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || (event.target !== field('description') && event.target !== field('title'))) return;
    event.preventDefault(); void saveCardNow();
  });
  $('stage-field').addEventListener('change', () => { updatePreview(); scheduleAutosave(); });
  form.addEventListener('submit', event => { event.preventDefault(); void (async () => {
    if (inCard()) { await saveCardNow(); return; }
    if (busy) return; setBusy(true); try {
      if (await persist()) {
        if (field('workspace').value === 'outreach') { editor.close(); status('Company card saved.'); }
        else $('item-message').textContent = 'Draft saved. Public content is unchanged.';
      }
    } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); }
  })(); });
  $('publish-item').onclick = () => void (async () => {
    clearTimeout(autosaveTimer); if (autosavePromise) await autosavePromise;
    if (busy) return; setBusy(true); try {
      if (!await persist() || !current) return;
      await client.mutation(api.planner.publish, { id: current._id, revision: current.revision }); if (cardDialog.open) cardDialog.close(); else editor.close(); status('Published. This activity is now on the main website.');
    } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); await refresh(); }
  })();
  $('unpublish-item').onclick = () => void (async () => { clearTimeout(autosaveTimer); if (inCard() && !await saveCardNow()) return; if (!current || !window.confirm('Remove this activity from the public website? Your draft and committee notes will stay on the private board.')) return;
    setBusy(true); try { await authenticated(); await client.mutation(api.planner.move, { id: current._id, revision: current.revision, stage: 'ready' }); if (cardDialog.open) cardDialog.close(); else editor.close(); status('Unpublished. The activity is private in Ready.'); } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); await refresh(); }
  })();
  function requestCardDeletion(item: Item, permanent = false) {
    if (busy || deleteBusy) return;
    if (fileUploadBusy) { fileStatus('Finish or cancel the upload before deleting this card.'); return; }
    deleteRequest = { item, permanent }; closeCardOptions();
    $('delete-card-heading').textContent = permanent ? 'Permanently delete card?' : 'Delete card?';
    $('delete-card-title').textContent = item.title;
    $('delete-card-description').textContent = permanent
      ? 'This will permanently delete this card, its comments and uploaded files. This cannot be undone.'
      : `This card will move to Archive. You can restore it from there.${item.published ? ' It will also be removed from the public website.' : ''}`;
    $('confirm-delete-card').textContent = permanent ? 'Delete permanently' : 'Yes, delete';
    $('delete-card-message').textContent = ''; deleteCardDialog.showModal();
  }
  const dismissDeleteCard = () => { if (!deleteBusy) deleteCardDialog.close(); };
  $('delete-card').onclick = () => { if (current) requestCardDeletion(current); };
  $('cancel-delete-card').onclick = dismissDeleteCard; $('close-delete-card').onclick = dismissDeleteCard;
  deleteCardDialog.addEventListener('cancel', event => { if (deleteBusy) event.preventDefault(); });
  deleteCardDialog.addEventListener('close', () => { if (!deleteCardDialog.open) deleteRequest = null; });
  $('confirm-delete-card').onclick = () => void (async () => {
    const request = deleteRequest; if (!request || deleteBusy || busy) return;
    const requestSession = sessionId; const attempt = ++deleteAttempt; deleteBusy = true;
    for (const id of ['confirm-delete-card', 'cancel-delete-card', 'close-delete-card']) $<HTMLButtonElement>(id).disabled = true;
    $('delete-card-message').textContent = request.permanent ? 'Deleting card…' : 'Moving card to Archive…';
    try {
      let item = request.item;
      if (cardDialog.open && current?._id === item._id) {
        if (!await saveCardNow()) throw new Error('Could not save your latest edits. Close this confirmation and retry the save.');
        item = current!;
      }
      if (deleteRequest !== request || sessionId !== requestSession || !access) return;
      setBusy(true); await authenticated();
      if (deleteRequest !== request || sessionId !== requestSession || !access) return;
      if (request.permanent) await client.mutation(api.planner.deleteArchived, { id: item._id, revision: item.revision });
      else await client.mutation(api.planner.move, { id: item._id, revision: item.revision, stage: 'archived' });
      if (deleteRequest !== request || sessionId !== requestSession || !access) return;
      if (previewItem?._id === item._id) cardDialog.close();
      if (request.permanent) commentDrafts.delete(item._id);
      deleteCardDialog.close(); archiveLoadedAt = 0;
      items = items.filter(value => value._id !== item._id); archived = archived.filter(value => value._id !== item._id); render();
      status(request.permanent ? 'Card permanently deleted.' : 'Card moved to Archive. You can restore it there.');
    } catch (error) { if (deleteRequest === request && sessionId === requestSession && access) showError(error, 'delete-card-message'); }
    finally {
      if (attempt === deleteAttempt) {
        deleteBusy = false; setBusy(false);
        for (const id of ['confirm-delete-card', 'cancel-delete-card', 'close-delete-card']) $<HTMLButtonElement>(id).disabled = false;
        if (sessionId === requestSession && access) await refresh();
      }
    }
  })();
  $('add-task').onclick = () => { const input = $<HTMLInputElement>('task-text'); if (!input.value.trim() || tasks.length >= 30) return; tasks.push({ text: input.value.trim(), done: false }); input.value = ''; renderTasks(); scheduleAutosave(); };
  $('task-text').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); $('add-task').click(); } };
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.onclick = () => { const dialog = button.closest('dialog'); if (dialog === editor) closeEditor(); else if (dialog === cardDialog) closeCard(); else dialog?.close(); });
  function dismissOnBackdrop(dialog: HTMLDialogElement, close: () => unknown) {
    const outside = (event: MouseEvent) => {
      const bounds = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    };
    let pressedOutside = false;
    dialog.addEventListener('pointerdown', event => { pressedOutside = event.button === 0 && outside(event); });
    dialog.addEventListener('pointercancel', () => { pressedOutside = false; });
    dialog.addEventListener('click', event => { const dismiss = pressedOutside && outside(event); pressedOutside = false; if (dismiss) close(); });
  }
  dismissOnBackdrop(cardDialog, closeCard);
  dismissOnBackdrop(deleteCardDialog, dismissDeleteCard);
  const peopleDialog = $<HTMLDialogElement>('card-people-dialog');
  dismissOnBackdrop(peopleDialog, () => peopleDialog.close());
  editor.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  editor.addEventListener('close', resetDescriptionHelp);
  window.addEventListener('beforeunload', event => { if (dirty()) event.preventDefault(); });
  $('new-item').onclick = () => openEditor(null, view === 'board' && mobileNav() ? mobileStage : 'ideas');
  $('open-members').onclick = () => membersDialog.showModal();
  $('sidebar-account').onclick = () => {
    if (!access) return;
    const profileForm = $<HTMLFormElement>('planner-profile-form'); (profileForm.elements.namedItem('displayName') as HTMLInputElement).value = access.name;
    $('planner-profile-message').textContent = ''; $<HTMLDialogElement>('planner-profile-dialog').showModal();
  };
  $<HTMLFormElement>('planner-profile-form').onsubmit = event => { event.preventDefault(); void (async () => {
    const profileForm = $<HTMLFormElement>('planner-profile-form'); const input = profileForm.elements.namedItem('displayName') as HTMLInputElement; const button = profileForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    if (!profileForm.reportValidity()) return; button.disabled = true; $('planner-profile-message').textContent = '';
    try { await authenticated(); await client.mutation(api.planner.setDisplayName, { name: input.value }); await refresh(); await loadNotifications('refresh'); $<HTMLDialogElement>('planner-profile-dialog').close(); }
    catch (error) { showError(error, 'planner-profile-message'); }
    finally { button.disabled = false; }
  })(); };
  document.addEventListener('click', event => { if (!(event.target instanceof Element) || event.target.closest('.card-menu')) return; document.querySelectorAll<HTMLDetailsElement>('.card-menu[open]').forEach(menu => { menu.open = false; }); });
  function syncTeamFilters() { $<HTMLSelectElement>('team-filter').value = selectedTeam; }
  $<HTMLSelectElement>('team-filter').onchange = () => { selectedTeam = $<HTMLSelectElement>('team-filter').value as typeof selectedTeam; render(); };
  function syncBoardFilters() {
    document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scope === workScope)));
    $<HTMLInputElement>('filter-due').checked = dueThisWeek; $<HTMLInputElement>('filter-waiting').checked = waitingOnly;
    const count = Number(dueThisWeek) + Number(waitingOnly); $('active-filter-count').textContent = String(count); $('active-filter-count').hidden = !count;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(button => button.onclick = () => { workScope = button.dataset.scope as typeof workScope; syncBoardFilters(); render(); });
  $('filter-due').onchange = () => { dueThisWeek = $<HTMLInputElement>('filter-due').checked; syncBoardFilters(); render(); };
  $('filter-waiting').onchange = () => { waitingOnly = $<HTMLInputElement>('filter-waiting').checked; syncBoardFilters(); render(); };
  $('clear-board-filters').onclick = () => { dueThisWeek = false; waitingOnly = false; syncBoardFilters(); render(); };
  document.addEventListener('click', event => { if (event.target instanceof Node && !$('board-filters').contains(event.target)) $<HTMLDetailsElement>('board-filters').open = false; });
  $('board-filters').onkeydown = event => { if (event.key === 'Escape') { event.stopPropagation(); $<HTMLDetailsElement>('board-filters').open = false; $('board-filters').querySelector('summary')?.focus(); } };
  $('toggle-search').onclick = () => { const open = $('board-search').hidden; $('board-search').hidden = !open; $('toggle-search').setAttribute('aria-expanded', String(open)); if (open) $('card-search').focus(); else { search = ''; $<HTMLInputElement>('card-search').value = ''; render(); } };
  $('card-search').oninput = () => { search = $<HTMLInputElement>('card-search').value.trim().toLowerCase(); render(); };
  const mobileNav = () => window.matchMedia('(max-width: 720px)').matches;
  function setSidebar(collapsed: boolean, remember = false) {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    document.body.classList.toggle('sidebar-mobile-open', !collapsed && mobileNav());
    $('collapse-sidebar').setAttribute('aria-expanded', String(!collapsed));
    $('toggle-sidebar').setAttribute('aria-expanded', String(!collapsed));
    $('sidebar-scrim').hidden = collapsed || !mobileNav();
    $('planner-sidebar').inert = mobileNav() && collapsed;
    root.inert = mobileNav() && !collapsed;
    if (remember && !mobileNav()) try { localStorage.setItem('ai-planner-sidebar', collapsed ? 'collapsed' : 'expanded'); } catch { /* Storage may be unavailable. */ }
  }
  let desktopCollapsed = false; try { desktopCollapsed = localStorage.getItem('ai-planner-sidebar') === 'collapsed'; } catch { /* Use expanded navigation. */ }
  setSidebar(mobileNav() || desktopCollapsed);
  $('collapse-sidebar').onclick = () => { setSidebar(true, true); $('toggle-sidebar').focus(); };
  $('toggle-sidebar').onclick = () => { setSidebar(false, true); if (mobileNav()) $('collapse-sidebar').focus(); };
  $('sidebar-scrim').onclick = () => { setSidebar(true); $('toggle-sidebar').focus(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('sidebar-mobile-open')) { setSidebar(true); $('toggle-sidebar').focus(); } });
  window.matchMedia('(max-width: 720px)').addEventListener('change', () => { let collapsed = false; try { collapsed = localStorage.getItem('ai-planner-sidebar') === 'collapsed'; } catch {} setSidebar(mobileNav() || collapsed); syncMobileBoard(); resizeEditorFields(); });
  async function navigatePlanner(area: PlannerWorkspace, nextView: typeof view, targetUrl?: string) {
    if (boardOrderSaving) return false;
    if (cardDialog.open && !await closeCard()) return false;
    if (editor.open) { closeEditor(); if (editor.open) return false; }
    if (targetUrl) window.history.pushState(null, '', targetUrl);
    lastPlannerUrl = window.location.href;
    workspaceVersion++; workspace = area; view = nextView; items = []; boardOrder = [...stages]; boardRevision = 0;
    $<HTMLDetailsElement>('board-filters').open = false;
    syncWorkspaceView(); render(); syncMobileBoard();
    if (mobileNav()) { setSidebar(true); $('toggle-sidebar').focus(); }
    if (view === 'archive') { renderArchive(); void loadArchive(); }
    void refresh();
    return true;
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(link => link.onclick = event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (boardOrderSaving) return;
    void navigatePlanner((link.dataset.workspace as PlannerWorkspace) || workspace, link.dataset.view as typeof view, link.href);
  });
  window.addEventListener('popstate', () => {
    const next = new URLSearchParams(window.location.search).get('view');
    void navigatePlanner(workspaceFromUrl(), next === 'calendar' || next === 'archive' ? next : 'board').then(changed => { if (!changed) window.history.pushState(null, '', lastPlannerUrl); });
  });
  field('workspace').addEventListener('change', () => { syncWorkspaceFields(); updatePreview(); scheduleAutosave(); });
  syncWorkspaceView();
  function resetDescriptionHelp() {
    aiVersion++; aiRequest?.abort(); aiRequest = null; aiBusy = false; suggestedDescription = '';
    $('description-suggestion').hidden = true; $('suggested-description').textContent = ''; $('description-ai-message').textContent = '';
    const button = $<HTMLButtonElement>('help-description'); button.disabled = busy; button.setAttribute('aria-busy', 'false');
  }
  $('help-description').onclick = () => { if (busy || aiBusy) return;
    if (!field('title').value.trim() && !field('description').value.trim()) { $('description-ai-message').textContent = 'Add a title or a few words first.'; return; }
    const version = ++aiVersion; aiRequest = new AbortController(); aiBusy = true;
    const signal = aiRequest.signal; const button = $<HTMLButtonElement>('help-description'); button.disabled = true; button.setAttribute('aria-busy', 'true');
    $('description-ai-message').textContent = 'Suggesting a description…'; $('description-suggestion').hidden = true;
    void (async () => {
    try {
      const token = await authenticated();
      const prompt = `Title: ${field('title').value}\nCurrent description: ${field('description').value.slice(0, 1500)}\nType: ${field('kind').value}`;
      const response = await fetch('/api/planner/draft', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ prompt, focus: 'description' }), signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not draft this activity. Try again.');
      if (version !== aiVersion || (!editor.open && !cardDialog.open)) return;
      if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 4000) throw new Error('Could not suggest a usable description. Try again.');
      suggestedDescription = body.description.trim(); $('suggested-description').textContent = suggestedDescription;
      $('description-suggestion').hidden = false; $('description-ai-message').textContent = '';
    } catch (error) { if (version === aiVersion && !signal.aborted) showError(error, 'description-ai-message'); }
    finally { if (version === aiVersion) { aiBusy = false; aiRequest = null; button.disabled = busy; button.setAttribute('aria-busy', 'false'); } }
  })(); };
  $('use-description').onclick = () => { if (!suggestedDescription || busy) return; field('description').value = suggestedDescription; resetDescriptionHelp(); updatePreview(); scheduleAutosave(); };
  $('dismiss-description').onclick = resetDescriptionHelp;
  async function refreshAccess() {
    await authenticated(); const rows = await client.query(api.planner.listAccess, {}); const list = $('access-list'); list.replaceChildren();
    for (const row of rows.filter(row => row.active)) {
      const line = el('div', undefined, 'access-row'); line.append(el('span', row.email)); const revoke = el('button', 'Revoke', 'quiet-button danger');
      revoke.onclick = () => void (async () => { if (!window.confirm(`Revoke planner access for ${row.email}?`)) return; try { await authenticated(); await client.mutation(api.planner.setAccess, { email: row.email, active: false }); await refreshAccess(); } catch (error) { showError(error, 'access-feedback'); } })();
      line.append(revoke); list.append(line);
    }
    if (!list.childElementCount) list.append(el('p', 'No committee emails added yet.', 'field-help'));
  }
  $('open-settings').onclick = () => { $('access-feedback').textContent = ''; settingsDialog.showModal(); if (access?.canManageAccess) void refreshAccess().catch(error => showError(error, 'access-feedback')); };
  $<HTMLFormElement>('access-form').onsubmit = event => { event.preventDefault(); void (async () => {
    const accessForm = $<HTMLFormElement>('access-form'); const button = accessForm.querySelector('button')!; button.disabled = true;
    try {
      const token = await authenticated(); const email = (accessForm.elements.namedItem('email') as HTMLInputElement).value;
      const response = await fetch('/api/planner/access', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email }), signal: AbortSignal.timeout(20000) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not add this email. Try again.');
      accessForm.reset(); $('access-feedback').textContent = 'Email added. They can now sign in using the planner link.'; await refreshAccess();
    } catch (error) { showError(error, 'access-feedback'); } finally { button.disabled = false; }
  })(); };
  $('retry-access').onclick = () => window.location.reload();
  $('sign-out').onclick = () => { clearPrivateData(); void clerk.signOut().then(() => window.location.reload()); };

  try {
    if (!root.dataset.key?.startsWith('pk_') || !root.dataset.convex) throw new Error('Committee sign-in is not configured yet. Please contact the society.');
    client = new ConvexHttpClient(root.dataset.convex);
    const domain = atob(root.dataset.key.split('_')[2]).replace(/\$$/, '');
    if (!/^[a-z\d.-]+$/i.test(domain)) throw new Error('Committee sign-in configuration is invalid.');
    async function script(url: string, key?: string) {
      await new Promise<void>((resolve, reject) => {
        const node = document.createElement('script'); node.src = url; node.async = true; node.crossOrigin = 'anonymous';
        if (key) node.dataset.clerkPublishableKey = key;
        const timer = window.setTimeout(() => reject(new Error('Sign-in is taking too long. Please try again.')), 20000);
        node.onload = () => { clearTimeout(timer); resolve(); }; node.onerror = () => { clearTimeout(timer); reject(new Error('Could not load secure sign-in. Check your connection and try again.')); };
        document.head.append(node);
      });
    }
    await script(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, root.dataset.key);
    if (!window.Clerk) throw new Error('Sign-in could not start. Try again.');
    clerk = window.Clerk;
    await clerk.load();
    const signIn = createPlannerSignIn(clerk, () => sessionChanged(clerk.session));
    async function sessionChanged(session: ClerkSession | null) {
      const nextId = session?.id || '';
      if (sessionId === nextId) return; sessionId = nextId;
      if (!session) { client.clearAuth(); showAccess('Sign in with your committee email. We’ll email you a code.'); $('sign-out').hidden = true; signIn.show(); return; }
      showAccess('Checking your committee access…');
      signIn.hide(); $('sign-out').hidden = false; await refresh();
    }
    clerk.addListener(({ session }) => void sessionChanged(session));
    await sessionChanged(clerk.session);
    window.addEventListener('pagehide', stopLiveNotifications);
    window.addEventListener('pageshow', startLiveNotifications);
    window.addEventListener('focus', () => void refresh());
    window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
  } catch (error) { showAccess(error instanceof Error ? error.message : 'Could not load committee sign-in.'); $('retry-access').hidden = false; }
}
