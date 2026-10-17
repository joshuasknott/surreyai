import { ConvexClient, ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import type { Activity, PlannerCalendarItem, PlannerPerson, PlannerMention, PlannerNotification } from '../../../../convex/plannerModel';
import { activityDate, activityKind, blankActivity, londonToday } from '../lib/programme';
import { createPlannerSignIn, type ClerkSDK, type ClerkSession } from './plannerSignIn';
import { appendMentionText, createMentionPicker } from './plannerMentions';
import { plannerTeams, type PlannerTeam } from '../../../../convex/plannerTeams';
import { SOCIETIES } from '@surreysocieties/admin/config';

type Item = Doc<'plannerItems'>;
type Stage = 'ideas' | 'planning' | 'ready' | 'done';
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
  const notificationsDialog = $<HTMLDialogElement>('notifications-dialog');
  const commentForm = $<HTMLFormElement>('comment-form');
  const commentText = $<HTMLTextAreaElement>('comment-text');
  const stages = ['ideas', 'planning', 'ready', 'done'] as const;
  const stageMime = 'application/x-planner-stage';
  const cardMime = 'application/x-planner-card';
  const labels = { ideas: 'Ideas', planning: 'In progress', ready: 'Ready', done: 'Done', published: 'Ready', archived: 'Archived' };
  const boardStage = (item: Item) => item.stage === 'published' ? item.workflowStage || 'ready' : item.stage;
  let selectedTeam: PlannerTeam | 'all' = 'all';
  let search = '';
  const assignedTeams = (item: { team?: PlannerTeam | null; teams?: PlannerTeam[] }) => item.teams ?? (item.team ? [item.team] : []);
  const matches = (item: { title: string; team?: PlannerTeam | null; teams?: PlannerTeam[] }) => (selectedTeam === 'all' || assignedTeams(item).includes(selectedTeam)) && item.title.toLowerCase().includes(search);
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
  let current: Item | null = null;
  let tasks: Item['tasks'] = [];
  let baseline = '';
  let busy = false;
  let view: 'board' | 'calendar' | 'archive' = 'board';
  let calendarMonth = new Date(`${londonToday().slice(0, 7)}-01T12:00:00Z`);
  let calendarItems: PlannerCalendarItem[] = [];
  let calendarLoadedMonth = '';
  let calendarHasMore = false;
  let calendarLoading = false;
  let calendarError = '';
  let calendarVersion = 0;
  let sessionId: string | null = null;
  let refreshing = false;
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
  let commentPages = 1;
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
  const commentMentionPicker = createMentionPicker(commentText, () => mentionPeople);
  let editMentionPicker: ReturnType<typeof createMentionPicker> | null = null;
  const commentDrafts = new Map<string, string>();

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;
  };
  const icon = (name: string) => ($<HTMLTemplateElement>(`${name}-icon`).content.cloneNode(true));
  const status = (message = '') => { $('planner-status').textContent = message; };
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const readActivity = (): Activity => {
    const result = blankActivity();
    for (const name of Object.keys(result) as (keyof Activity)[]) (result[name] as string) = field(name).value.trim();
    if (field('purpose').value === 'internal') {
      result.kind = 'project'; result.category = ''; result.date = field('dueDate').value;
      result.startTime = ''; result.endTime = ''; result.location = ''; result.registrationUrl = '';
    }
    return result;
  };
  const selectedTeams = () => [...form.querySelectorAll<HTMLInputElement>('input[name="teams"]:checked')].map(input => input.value as PlannerTeam);
  const signature = () => JSON.stringify({ activity: readActivity(), stage: field('stage').value, teams: selectedTeams(), lead: field('lead').value, purpose: field('purpose').value, notes: field('notes').value, owner: field('owner').value, tasks });
  const dirty = () => (editor.open || cardDialog.open) && signature() !== baseline;
  const closeEditor = () => { if (busy || (dirty() && !window.confirm('Discard your unsaved changes?'))) return; editor.close(); };

  async function authenticated() {
    const token = await clerk.session?.getToken({ template: 'convex' });
    if (!token) throw new Error('Your session has expired. Sign in again.');
    client.setAuth(token); return token;
  }
  function clearPrivateData() {
    stopLiveNotifications();
    access = null; items = []; archived = []; boardOrder = [...stages]; boardRevision = 0; boardOrderSaving = false;
    notificationsVersion++; notifications = []; mentionPeople = []; notificationsLoading = false; notificationsBusy = false; notificationsCursor = null; notificationsPages = 1; notificationsDone = true; unreadNotifications = 0; highlightedComment = null;
    commentMentionPicker.close(); editMentionPicker?.destroy(); editMentionPicker = null;
    $('open-notifications').hidden = true; $('notification-count').hidden = true; $('open-notifications').setAttribute('aria-label', 'Notifications');
    for (const id of ['notification-list', 'notifications-status', 'notification-count']) $(id).replaceChildren();
    previewVersion++; previewItem = null; comments = []; commentDrafts.clear(); commentsCursor = null; commentBusy = false; commentRequest = null; commentEdit = null; commentDelete = null; commentsLoading = false; commentForm.reset(); commentText.disabled = false; $<HTMLButtonElement>('post-comment').disabled = false;
    calendarVersion++; calendarItems = []; calendarLoadedMonth = ''; calendarError = ''; calendarLoading = false;
    $('workspace').hidden = true;
    for (const id of ['workspace-nav', 'open-members', 'sidebar-account']) $(id).hidden = true;
    $('open-members').replaceChildren(); $('team-members').replaceChildren(); $('account-name').textContent = '';
    selectedTeam = 'all'; search = ''; $<HTMLInputElement>('card-search').value = ''; syncTeamFilters();
    $('open-settings').hidden = true; $('committee-settings').hidden = true; $('settings-account').textContent = '';
    for (const id of ['board', 'calendar', 'archive', 'access-list', 'public-preview', 'task-list', 'card-title', 'card-description', 'card-people', 'card-facts', 'comment-list', 'comments-status', 'comment-message', 'card-state', 'comment-count', 'comment-author', 'account-avatar']) $(id).replaceChildren();
    $('account-avatar').hidden = true;
    for (const dialog of [editor, settingsDialog, cardDialog, notificationsDialog, membersDialog]) if (dialog.open) dialog.close();
    resetDescriptionHelp(); form.reset(); $<HTMLFormElement>('access-form').reset();
    $('item-heading').textContent = 'New activity'; $('item-state').textContent = ''; $('item-message').textContent = '';
    tasks = []; current = null;
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
    if (!clerk?.session || refreshing || busy) return;
    refreshing = true;
    try {
      await authenticated();
      access = await client.query(api.planner.access, {});
      if (!access) { showAccess('This board is for the AI Society committee. Ask Josh to add your sign-in email.'); return; }
      const [latestItems, layout] = await Promise.all([client.query(api.planner.list, {}), client.query(api.planner.boardLayout, {})]);
      items = latestItems;
      if (!boardOrderSaving) { boardOrder = layout.order; boardRevision = layout.revision; }
      if (view === 'archive') archived = await client.query(api.planner.list, { archived: true });
      $('access-state').hidden = true; $('workspace').hidden = false;
      $('workspace-nav').hidden = false; $('sidebar-account').hidden = false; $('account-name').textContent = access.name || access.email;
      renderMembers();
      $('open-settings').hidden = false; $('committee-settings').hidden = !access.canManageAccess;
      $('open-notifications').hidden = false;
      $('settings-account').textContent = `Signed in as ${access.email}`;
      {
        const initials = (access.name || access.email).trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
        const person = { userId: access.userId, name: access.name, email: access.email, initials };
        if (person.userId) $('comment-author').replaceChildren(avatar({ ...person, userId: person.userId }, access.name));
        $('account-avatar').textContent = initials; $('account-avatar').hidden = false;
      }
      $('help-description').hidden = root.dataset.ai !== 'true';
      render();
      if (view === 'calendar') await loadCalendar(true);
      if (cardDialog.open && previewItem && !commentBusy) await refreshCard();
      startLiveNotifications(); await loadMentionPeople();
    } catch (error) {
      if (!access) showAccess('Could not check committee access. Try again, or sign out and back in.');
      showError(error);
      $('retry-access').hidden = false;
    } finally { refreshing = false; }
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
    stopNotificationStream = stream.onUpdate(api.planner.notificationChanges, {}, () => {
      if (active()) { notificationRefreshPending = true; void flushNotificationChanges(); }
    }, error => {
      if (!active()) return;
      if (error.message.includes('Committee access required')) showAccess('Committee access is no longer available. Ask Josh to check your email access.');
      else { showError(error, 'notifications-status'); stopLiveNotifications(); }
    });
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
  $('open-notifications').onclick = () => { notificationsDialog.showModal(); void loadNotifications('refresh'); };
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
      await authenticated(); const item = await client.query(api.planner.get, { id: notification.itemId });
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
      boardRevision = await client.mutation(api.planner.reorderBoard, { order: next, revision: boardRevision });
      status('List order saved for the committee.');
    } catch (error) {
      try { const layout = await client.query(api.planner.boardLayout, {}); boardOrder = layout.order; boardRevision = layout.revision; }
      catch { boardOrder = [...stages]; boardRevision = 0; }
      render(); showError(error);
    } finally { boardOrderSaving = false; }
  }

  function render() {
    const board = $('board'); board.replaceChildren();
    for (const stage of boardOrder) {
      const column = el('section', undefined, 'board-column'); column.dataset.stage = stage; column.setAttribute('aria-label', labels[stage]);
      const cards = items.filter(item => boardStage(item) === stage && matches(item)).sort((a, b) => b.updatedAt - a.updatedAt);
      const heading = el('div', undefined, 'column-heading'); const title = el('h2', labels[stage]); heading.append(title, el('span', String(cards.length), 'column-count'));
      const handle = el('button', undefined, 'column-drag-handle'); handle.type = 'button'; handle.draggable = true;
      handle.title = 'Drag to reorder lists; use Left or Right arrow keys';
      handle.setAttribute('aria-label', `Reorder ${labels[stage]} list`); handle.append(icon('drag'));
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
      for (const item of cards) column.append(card(item));
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
    renderCalendar(); renderArchive();
  }

  function renderMembers() {
    const officers = SOCIETIES.ai.signatories;
    const members = [...officers.map(officer => officer.name), ...plannerTeams.flatMap(team => [...team.members])];
    const stack = $('open-members'); stack.replaceChildren(); stack.hidden = false;
    const memberAvatar = (name: string) => {
      const words = name.split(/\s+/); const node = el('span', `${words[0][0]}${words.at(-1)![0]}`, 'person-avatar');
      node.title = name; node.setAttribute('aria-hidden', 'true'); return node;
    };
    for (const name of members.slice(0, 3)) stack.append(memberAvatar(name));
    stack.append(el('span', `+${members.length - 3}`, 'person-avatar avatar-more'));
    const list = $('team-members'); list.replaceChildren();
    const officerSection = el('section', undefined, 'member-team'); officerSection.append(el('h3', 'Signatories'));
    for (const { name, role } of officers) {
      const row = el('div', undefined, 'member-row');
      const details = el('span', undefined, 'member-details'); details.append(el('span', name), el('small', role, 'member-role'));
      row.append(memberAvatar(name), details); officerSection.append(row);
    }
    list.append(officerSection);
    for (const team of plannerTeams) {
      const section = el('section', undefined, 'member-team'); section.append(el('h3', team.name));
      for (const name of team.members) { const row = el('div', undefined, 'member-row'); row.append(memberAvatar(name), el('span', name)); section.append(row); }
      list.append(section);
    }
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
    if (!previewItem) return; const item = previewItem;
    $('card-title').textContent = item.title;
    const state = $('card-state'); state.replaceChildren(); state.dataset.stage = item.stage;
    const stage = el('span', labels[boardStage(item)], 'card-state-label'); stage.prepend(icon('stage'));
    const visibility = el('span', item.stage === 'published' ? 'Live on website' : 'Private', 'card-visibility');
    if (item.stage !== 'published') visibility.prepend(icon('lock'));
    state.append(stage, visibility);
    for (const id of assignedTeams(item)) {
      const team = plannerTeams.find(team => team.id === id);
      if (team) state.append(el('span', team.name, 'card-team'));
    }
    $('card-description').textContent = item.description || 'No description yet.'; fillPeople($('card-people'), item);
    $('card-contributors').hidden = !$('card-people').childElementCount;
    const facts = $('card-facts'); facts.replaceChildren();
    for (const [iconName, text] of [
      ['calendar', [item.date ? activityDate(item.date) : '', item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : ''].filter(Boolean).join(' · ')],
      ['location', item.location], ['collaborators', item.lead ? `Lead: ${item.lead}` : ''], ['collaborators', item.owner ? `Collaborators: ${item.owner}` : ''],
    ]) { if (text) { const row = el('span', undefined, 'card-fact'); row.append(icon(iconName), el('span', text)); facts.append(row); } }
    if (item.registrationUrl) { const link = el('a', item.kind === 'project' ? 'Project link' : 'Booking link'); link.href = item.registrationUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(icon('external')); facts.append(link); }
    if (item.stage === 'published') { const link = el('a', 'View on website'); link.href = `/activities/${item._id}`; link.target = '_blank'; link.rel = 'noopener'; link.append(icon('external')); facts.append(link); }
    $('comment-count').textContent = String(item.commentCount ?? comments.length);
  }
  async function openPreview(item: Item, targetComment?: Id<'plannerComments'>) {
    previewVersion++; previewItem = item; comments = []; commentsCursor = null; commentsDone = true; commentsLoading = false; commentPages = 1; commentRequest = null; commentEdit = null; commentDelete = null;
    commentForm.reset(); commentText.value = commentDrafts.get(item._id) || ''; $('comment-message').textContent = ''; $('comments-status').textContent = 'Loading comments…';
    highlightedComment = targetComment || null; commentMentionPicker.close();
    $('comment-list').replaceChildren(); $('older-comments').hidden = true; renderCardPreview();
    $('card-editor-slot').append(form); openEditor(item, 'ideas', '', true); cardDialog.showModal();
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
  function closeCard() {
    if (commentBusy || busy || (dirty() && !window.confirm('Discard your unsaved card changes?')) || (commentEdit && commentEdit.text !== commentEdit.original && !window.confirm('Discard your unsaved comment changes?'))) return false;
    cardDialog.close(); return true;
  }
  cardDialog.addEventListener('cancel', event => { event.preventDefault(); closeCard(); });
  cardDialog.addEventListener('close', () => {
    if (cardDialog.open) return;
    if (previewItem && access) { if (commentText.value.trim()) commentDrafts.set(previewItem._id, commentText.value); else commentDrafts.delete(previewItem._id); }
    previewVersion++; previewItem = null; comments = []; commentsLoading = false; commentEdit = null; commentDelete = null; commentText.value = '';
    highlightedComment = null; commentMentionPicker.close(); editMentionPicker?.destroy(); editMentionPicker = null;
    editor.append(form); resetDescriptionHelp(); current = null;
    for (const id of ['card-title', 'card-description', 'card-people', 'card-facts', 'comment-list', 'comments-status', 'comment-message', 'card-state', 'comment-count']) $(id).replaceChildren();
  });
  async function refreshCard() {
    if (!previewItem || !cardDialog.open) return;
    const id = previewItem._id; const version = previewVersion;
    await authenticated(); const item = await client.query(api.planner.get, { id });
    if (version !== previewVersion || !access || !cardDialog.open) return;
    if (!item) { closeCard(); return; } previewItem = item; renderCardPreview();
    if (!commentEdit && !commentDelete) await loadComments('refresh');
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
  }
  function renderComments() {
    editMentionPicker?.destroy(); editMentionPicker = null;
    const list = $('comment-list'); list.replaceChildren();
    for (const comment of comments) {
      const row = el('li', undefined, 'comment'); row.dataset.comment = comment._id; row.append(avatar(comment.author, comment.author.name));
      if (comment._id === highlightedComment) row.classList.add('comment-highlight');
      const content = el('div', undefined, 'comment-content'); const heading = el('div', undefined, 'comment-heading');
      const time = el('time', new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(comment._creationTime)));
      time.dateTime = new Date(comment._creationTime).toISOString(); heading.append(el('strong', comment.author.name), time);
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
    $('comments-status').textContent = comments.length ? '' : 'No comments yet.';
    $('older-comments').hidden = commentsDone; commentControls();
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
    const id = previewItem._id; const version = previewVersion; commentsLoading = true;
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
      if (version === previewVersion) { $('comments-status').textContent = 'Could not load comments. '; const retry = el('button', 'Try again', 'quiet-button'); retry.onclick = () => void loadComments(mode); $('comments-status').append(retry); }
      return false;
    } finally { if (version === previewVersion) { commentsLoading = false; commentControls(); } }
  }
  $('older-comments').onclick = () => void loadComments('older');
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
  cardDialog.addEventListener('click', event => {
    for (const menu of cardDialog.querySelectorAll<HTMLDetailsElement>('.comment-menu[open]')) {
      if (!menu.contains(event.target as Node)) menu.open = false;
    }
  });
  cardDialog.addEventListener('keydown', event => {
    const menu = cardDialog.querySelector<HTMLDetailsElement>('.comment-menu[open]');
    if (event.key === 'Escape' && menu) {
      event.preventDefault(); event.stopPropagation(); menu.open = false; menu.querySelector('summary')?.focus();
    }
  });

  function card(item: Item) {
    const node = el('article', undefined, 'planner-card'); node.draggable = true; node.dataset.item = item._id;
    node.addEventListener('dragstart', event => { event.dataTransfer?.setData(cardMime, item._id); event.dataTransfer?.setData('text/plain', item._id); });
    const open = el('button', undefined, 'card-open'); open.setAttribute('aria-label', `View ${item.title}`);
    open.append(el('strong', item.title));
    if (selectedTeam === 'all') {
      const teams = assignedTeams(item);
      for (const id of teams.slice(0, 2)) {
        const team = plannerTeams.find(team => team.id === id);
        if (team) { const badge = el('span', team.name, 'team-badge'); badge.dataset.team = team.id; open.append(badge); }
      }
      if (teams.length > 2) { const more = el('span', `+${teams.length - 2} teams`, 'team-badge'); more.title = teams.slice(2).map(id => plannerTeams.find(team => team.id === id)?.name).filter(Boolean).join(', '); open.append(more); }
    }
    const footer = el('span', undefined, 'card-footer');
    if (item.date) footer.append(el('span', activityDate(item.date, { day: 'numeric', month: 'short' }), 'card-date'));
    if (item.published) footer.append(el('span', 'Live on website', 'card-live'));
    if (item.tasks.length) { const progress = el('span', `${item.tasks.filter(task => task.done).length}/${item.tasks.length}`, 'card-stat'); progress.prepend(icon('checklist')); footer.append(progress); }
    if (item.commentCount) { const count = el('span', String(item.commentCount), 'card-stat'); count.prepend(icon('comments')); footer.append(count); }
    const people = el('span', undefined, 'avatar-group'); fillPeople(people, item);
    if (people.childElementCount) { people.id = `contributors-${item._id}`; open.setAttribute('aria-describedby', people.id); footer.append(people); }
    if (footer.childElementCount) open.append(footer);
    open.onclick = () => openPreview(item); node.append(open);
    const menu = el('details', undefined, 'card-menu'); const trigger = el('summary'); trigger.setAttribute('aria-label', `Actions for ${item.title}`); trigger.append(icon('more'));
    const actions = el('div', undefined, 'card-menu-actions');
    for (const stage of stages.filter(stage => stage !== boardStage(item))) {
      const button = el('button', `Move to ${labels[stage]}`); button.type = 'button'; button.onclick = () => { menu.open = false; void move(item, stage); }; actions.append(button);
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
      const result = await client.query(api.planner.calendar, { month });
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
    try { await authenticated(); const fullItem = await client.query(api.planner.get, { id: item._id });
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

  function renderArchive() {
    const container = $('archive'); container.replaceChildren();
    if (!archived.some(matches)) container.append(el('p', 'No archived cards in this view.', 'muted'));
    for (const item of archived.filter(matches)) {
      const row = el('div', undefined, 'archive-row'); const open = el('button', undefined, 'archive-open'); open.append(el('strong', item.title), el('span', `${item.internalOnly ? 'Internal work' : activityKind(item)}${item.date ? ` · ${activityDate(item.date)}` : ''}`)); open.onclick = () => openPreview(item); row.append(open);
      const restore = el('button', 'Restore to Ideas', 'quiet-button'); restore.onclick = () => void move(item, 'ideas'); row.append(restore); container.append(row);
    }
  }

  function openEditor(item: Item | null, stage: Stage = 'ideas', date = '', fromCard = false) {
    $('editor-back-label').textContent = fromCard ? 'Card' : 'Planner';
    resetDescriptionHelp(); current = item; form.reset(); $<HTMLDetailsElement>('private-options').open = false;
    const activity = item || { ...blankActivity(), date };
    for (const name of Object.keys(blankActivity())) field(name).value = activity[name as keyof Activity];
    field('notes').value = item?.notes || ''; field('owner').value = item?.owner || '';
    const teams = item ? assignedTeams(item) : selectedTeam === 'all' ? [] : [selectedTeam];
    form.querySelectorAll<HTMLInputElement>('input[name="teams"]').forEach(input => { input.checked = teams.includes(input.value as PlannerTeam); });
    field('lead').value = item?.lead || '';
    field('purpose').value = item ? item.internalOnly ? 'internal' : 'activity' : date ? 'activity' : 'internal';
    field('purpose').disabled = !!item?.published;
    field('dueDate').value = item?.internalOnly ? item.date : '';
    const stageField = field('stage') as HTMLSelectElement;
    for (const value of ['published', 'archived']) stageField.querySelector(`[value=${value}]`)?.remove();
    if (item?.stage === 'archived') { const option = el('option', labels[item.stage]); option.value = item.stage; stageField.append(option); }
    stageField.value = item ? boardStage(item) : stage; stageField.disabled = false;
    tasks = structuredClone(item?.tasks || []);
    $('item-heading').textContent = item ? item.title : 'New card';
    $('item-state').textContent = `${labels[item ? boardStage(item) : stage]} · ${item?.published ? 'Public version is live' : 'Private'}`;
    $('archive-item').hidden = !item || item.stage === 'archived'; $('unpublish-item').hidden = item?.stage !== 'published';
    $('item-message').textContent = '';
    renderTasks(); updatePreview(); baseline = signature(); if (!fromCard) { editor.showModal(); field('title').focus(); }
  }

  function renderTasks() {
    const list = $('task-list'); list.replaceChildren();
    tasks.forEach((task, index) => {
      const row = el('div', undefined, 'checklist-row'); const label = el('label');
      const check = el('input'); check.type = 'checkbox'; check.checked = task.done; check.onchange = () => { task.done = check.checked; };
      label.append(check, el('span', task.text)); const remove = el('button', 'Remove', 'quiet-button'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove task: ${task.text}`); remove.onclick = () => { tasks.splice(index, 1); renderTasks(); };
      row.append(label, remove); list.append(row);
    });
  }

  function updatePreview() {
    const stage = field('stage').value;
    const internal = field('purpose').value === 'internal';
    const idea = stage === 'ideas'; const review = !internal && (stage === 'ready' || !!current?.published);
    editor.classList.toggle('has-preview', review);
    $('activity-details').hidden = internal || idea; $('private-options').hidden = !internal && idea; $('editor-preview').hidden = !review;
    $('internal-due-label').hidden = !internal;
    $('stage-help').textContent = idea ? 'Start with a title and a few words. Work out the details later.' : field('stage').value === 'archived' ? 'Archived events stay on the calendar. To reschedule, choose a future date and move it to Planning.' : review ? 'Check the public details here. Ready is still private.' : 'Add the practical details as they are confirmed.';
    $('save-item').textContent = idea ? 'Save idea' : field('stage').value === 'archived' ? 'Save changes' : 'Save draft';
    if (internal) { $('stage-help').textContent = 'Internal work stays on the committee board.'; $('save-item').textContent = 'Save card'; }
    const activity = readActivity(); const preview = $('public-preview'); preview.replaceChildren();
    preview.append(el('p', activity.date ? activityDate(activity.date) : activity.kind === 'project' ? 'Ongoing project' : 'Date to confirm', 'preview-date'), el('h4', activity.title || 'Your activity title'));
    preview.append(el('p', [activity.startTime ? `${activity.startTime}${activity.endTime ? `–${activity.endTime}` : ''}` : '', activity.location].filter(Boolean).join(' · ')));
    preview.append(el('p', activity.description || 'Your public description will appear here.'));
    preview.append(el('span', activity.kind === 'project' ? 'Explore project' : 'View details', 'preview-cta'));
    const missing = [!activity.title && 'Title', !activity.description && 'Description', activity.kind !== 'project' && !activity.date && 'Date', activity.kind !== 'project' && !activity.startTime && 'Start time', activity.kind !== 'project' && !activity.location && 'Room or location', activity.kind !== 'project' && !activity.registrationUrl && 'Booking link'].filter((value): value is string => !!value);
    const list = $('publication-missing'); list.replaceChildren();
    for (const detail of missing) list.append(el('li', `Add ${detail.toLowerCase()}`));
    list.hidden = !missing.length;
    $('publish-item').hidden = !review;
    $<HTMLButtonElement>('publish-item').disabled = busy || missing.length > 0;
    $('publish-item').textContent = current?.stage === 'published' ? 'Publish changes' : 'Publish to website';
    $('publication-help').textContent = current?.stage === 'published' ? 'Saved edits stay private until you publish changes. This preview shows your current draft.' : 'Ready stays private. Publish when the public details are confirmed.';
  }

  async function persist() {
    if (!form.reportValidity()) return false;
    await authenticated();
    const payload = { activity: readActivity(), teams: selectedTeams(), lead: field('lead').value || null, internalOnly: field('purpose').value === 'internal', notes: field('notes').value, owner: field('owner').value, tasks };
    let id: Id<'plannerItems'>;
    if (current) {
      id = current._id;
      await client.mutation(api.planner.save, { id, revision: current.revision, ...payload, ...(current.stage === 'published' ? { workflowStage: field('stage').value as Stage } : field('stage').value !== 'archived' ? { stage: field('stage').value as Stage } : {}) });
    } else id = await client.mutation(api.planner.create, { ...payload, stage: field('stage').value as Stage });
    items = await client.query(api.planner.list, {}); current = await client.query(api.planner.get, { id });
    if (!current) throw new Error('Activity saved but could not be reloaded. Close and reopen the board.');
    if (cardDialog.open) { previewItem = current; renderCardPreview(); }
    baseline = signature(); $('archive-item').hidden = current.stage === 'archived';
    $('item-state').textContent = `${labels[boardStage(current)]} · ${current.published ? 'Public version is live' : 'Private'}`;
    updatePreview(); render(); if (view === 'calendar') void loadCalendar(true); return true;
  }

  function setBusy(value: boolean) { busy = value; for (const id of ['save-item', 'publish-item', 'archive-item', 'unpublish-item']) $<HTMLButtonElement>(id).disabled = value; $<HTMLButtonElement>('help-description').disabled = value || aiBusy; updatePreview(); }
  form.addEventListener('input', updatePreview); form.addEventListener('change', updatePreview);
  form.addEventListener('submit', event => { event.preventDefault(); void (async () => {
    if (busy) return; setBusy(true); try { if (await persist()) $('item-message').textContent = 'Draft saved. Public content is unchanged.'; } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); }
  })(); });
  $('publish-item').onclick = () => void (async () => {
    if (busy) return; setBusy(true); try {
      if (!await persist() || !current) return;
      await client.mutation(api.planner.publish, { id: current._id, revision: current.revision }); if (cardDialog.open) cardDialog.close(); else editor.close(); status('Published. This activity is now on the main website.');
    } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); await refresh(); }
  })();
  $('unpublish-item').onclick = () => void (async () => { if (!current || !window.confirm('Remove this activity from the public website? Your draft and committee notes will stay on the private board.')) return;
    setBusy(true); try { await authenticated(); await client.mutation(api.planner.move, { id: current._id, revision: current.revision, stage: 'ready' }); if (cardDialog.open) cardDialog.close(); else editor.close(); status('Unpublished. The activity is private in Ready.'); } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); await refresh(); }
  })();
  $('archive-item').onclick = () => void (async () => { if (!current || !window.confirm('Archive this activity? It will be removed from the public website if published. Unsaved edits will be discarded.')) return;
    setBusy(true); try { await authenticated(); await client.mutation(api.planner.move, { id: current._id, revision: current.revision, stage: 'archived' }); if (cardDialog.open) cardDialog.close(); else editor.close(); status('Activity archived.'); } catch (error) { showError(error, 'item-message'); } finally { setBusy(false); await refresh(); }
  })();
  $('add-task').onclick = () => { const input = $<HTMLInputElement>('task-text'); if (!input.value.trim() || tasks.length >= 30) return; tasks.push({ text: input.value.trim(), done: false }); input.value = ''; renderTasks(); };
  $('task-text').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); $('add-task').click(); } };
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.onclick = () => { const dialog = button.closest('dialog'); if (dialog === editor) closeEditor(); else if (dialog === cardDialog) closeCard(); else dialog?.close(); });
  editor.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  editor.addEventListener('close', resetDescriptionHelp);
  window.addEventListener('beforeunload', event => { if (dirty()) event.preventDefault(); });
  $('new-item').onclick = () => openEditor(null);
  $('open-members').onclick = () => membersDialog.showModal();
  document.addEventListener('click', event => { if (!(event.target instanceof Element) || event.target.closest('.card-menu')) return; document.querySelectorAll<HTMLDetailsElement>('.card-menu[open]').forEach(menu => { menu.open = false; }); });
  function syncTeamFilters() { document.querySelectorAll<HTMLButtonElement>('[data-team]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.team === selectedTeam))); }
  document.querySelectorAll<HTMLButtonElement>('button[data-team]').forEach(button => button.onclick = () => { selectedTeam = button.dataset.team as typeof selectedTeam; syncTeamFilters(); render(); });
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
  window.matchMedia('(max-width: 720px)').addEventListener('change', () => { let collapsed = false; try { collapsed = localStorage.getItem('ai-planner-sidebar') === 'collapsed'; } catch {} setSidebar(mobileNav() || collapsed); });
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.onclick = () => { view = button.dataset.view as typeof view;
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    for (const name of ['board', 'calendar', 'archive']) $(name).hidden = name !== view;
    $('workspace-title').textContent = view === 'board' ? 'Committee board' : view === 'calendar' ? 'Calendar' : 'Archive';
    if (mobileNav()) { setSidebar(true); $('toggle-sidebar').focus(); }
    void refresh();
  });
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
  $('use-description').onclick = () => { if (!suggestedDescription || busy) return; field('description').value = suggestedDescription; resetDescriptionHelp(); updatePreview(); };
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
