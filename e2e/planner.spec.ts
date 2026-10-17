import { expect, test, type BrowserContext, type Page, type Locator } from '@playwright/test';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { convexToJson, jsonToConvex } from 'convex/values';
import { mkdir } from 'node:fs/promises';
import { api } from '../convex/_generated/api';
import schema from '../convex/schema';
import type { Activity } from '../convex/plannerModel';
import { londonToday } from '../apps/ai/src/lib/programme';

const origin = process.env.PLANNER_TEST_ORIGIN || 'http://127.0.0.1:4321';
const modules = { './_generated/server.js': () => import('../convex/_generated/server.js'), './planner.ts': () => import('../convex/planner'), './plannerSignIn.ts': () => import('../convex/plannerSignIn'), './users.ts': () => import('../convex/users') };
const gateSecret = 'fixture-only-sign-in-gateway-secret';
const future = new Date(`${londonToday()}T12:00:00Z`); future.setUTCDate(future.getUTCDate() + 7);
const activity: Activity = { title: 'Build your first AI agent', kind: 'event', category: 'Workshop', description: 'A hands-on introduction. No experience needed.', date: future.toISOString().slice(0, 10), startTime: '18:00', endTime: '20:00', location: 'Stag Hill campus', registrationUrl: 'https://example.test/book' };

/** Browser transport uses Clerk fixtures; the actual Convex functions run in convex-test.
 * Nothing is inserted into a hosted database and no production auth bypass exists. */
async function fixture(context: BrowserContext, mode: 'admin' | 'owner' | 'outsider' | 'signed-out' = 'admin') {
  process.env.PLANNER_SIGN_IN_SECRET = gateSecret;
  const t = convexTest(schema, modules);
  await t.run(async ctx => {
    const societyId = await ctx.db.insert('societies', { name: 'Surrey AI Society', shortName: 'AI', slug: 'ai', domain: 'surreyaisociety.org' });
    const userId = await ctx.db.insert('users', { email: 'committee@example.test', name: 'Committee', clerkId: 'https://fixture.test|committee' });
    await ctx.db.insert('memberships', { societyId, userId, role: 'admin', status: 'active' });
    await ctx.db.insert('plannerAccess', { societyId, email: 'committee@example.test', active: true });
  });
  const admin = t.withIdentity({ subject: 'committee', issuer: 'https://fixture.test', tokenIdentifier: 'https://fixture.test|committee', email: 'committee@example.test' });
  const owner = t.withIdentity({ subject: 'owner', issuer: 'https://fixture.test', tokenIdentifier: 'https://fixture.test|owner', name: 'Joshua Knott', email: 'joshhknott@gmail.com', emailVerified: true });
  const actor = mode === 'owner' ? owner : mode === 'admin' || mode === 'signed-out' ? admin : t.withIdentity({ subject: 'outsider', issuer: 'https://fixture.test', tokenIdentifier: 'https://fixture.test|outsider', email: 'outsider@example.test' });
  const issuedAt = Math.floor(Date.now() / 1000);
  const fixtureToken = `${Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ iat: issuedAt, exp: issuedAt + 3600 })).toString('base64url')}.fixture-signature`;
  const streams = new Set<{ subscribed: boolean; push(): Promise<void>; disconnect(): Promise<void> }>();
  let streamTimestamp = 0n; let connections = 0;
  const encodedTimestamp = (value: bigint) => { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(value); return bytes.toString('base64'); };
  await context.routeWebSocket(/wss:\/\/[^/]+\.convex\.cloud\/api\/.*\/sync/, ws => {
    connections++; let closed = false; let authenticated = false; let querySet = 0; let identity = 0;
    let version = { querySet: 0, identity: 0, ts: encodedTimestamp(0n) };
    const queries = new Map<number, { path: string; args: Record<string, never>; last?: string }>();
    let serial = Promise.resolve();
    async function emit() {
      if (closed) return;
      stream.subscribed = authenticated && queries.size > 0;
      const modifications: unknown[] = [];
      if (authenticated) for (const [queryId, query] of queries) {
        let modification;
        try { const value = await actor.query(makeFunctionReference<'query'>(query.path), query.args); modification = { type: 'QueryUpdated', queryId, value: convexToJson(value), logLines: [], journal: null }; }
        catch (error) { modification = { type: 'QueryFailed', queryId, errorMessage: error instanceof Error ? error.message : 'Failed', errorData: null, logLines: [], journal: null }; }
        const signature = JSON.stringify(modification); if (signature !== query.last) { query.last = signature; modifications.push(modification); }
      }
      if (closed) return;
      const next = { querySet, identity, ts: encodedTimestamp(++streamTimestamp) };
      ws.send(JSON.stringify({ type: 'Transition', startVersion: version, endVersion: next, modifications })); version = next;
    }
    const enqueue = (operation: () => Promise<void>) => { serial = serial.then(operation); return serial; };
    const stream = { subscribed: false, push: () => enqueue(emit), disconnect: async () => { closed = true; streams.delete(stream); await ws.close({ code: 1012, reason: 'Fixture reconnect' }); } };
    streams.add(stream);
    ws.onClose(() => { closed = true; streams.delete(stream); });
    ws.onMessage(raw => void enqueue(async () => {
      const message = JSON.parse(String(raw));
      if (message.type === 'Authenticate') {
        authenticated = message.tokenType === 'User' && message.value === fixtureToken; identity = message.baseVersion + 1;
      } else if (message.type === 'ModifyQuerySet') {
        querySet = message.newVersion;
        for (const change of message.modifications) {
          if (change.type === 'Add') queries.set(change.queryId, { path: change.udfPath, args: jsonToConvex(change.args[0]) as Record<string, never> });
          else queries.delete(change.queryId);
        }
      } else return;
      await emit();
    }));
  });
  const pushNotifications = async () => { await Promise.all([...streams].map(stream => stream.push())); };
  await context.route('**/npm/@clerk/**', async route => {
    const body = `
      window.fixtureTokenOptions=[];
      const session={id:"fixture-session",getToken:async options=>{window.fixtureTokenOptions.push(options);return ${JSON.stringify(fixtureToken)};}}; const listeners=[];
      window.fixtureAuthCalls={create:0,send:0,verify:0};
      window.Clerk={session:sessionStorage.getItem("fixture-signed-out")?null:${mode === 'signed-out' ? '(sessionStorage.getItem("fixture-signed-in")?session:null)' : 'session'},load:async()=>{},
        client:{signIn:{
          create:async()=>{window.fixtureAuthCalls.create++;return {supportedFirstFactors:[{strategy:"email_code",emailAddressId:"fixture-email"}]};},
          prepareFirstFactor:async()=>{window.fixtureAuthCalls.send++;listeners.forEach(fn=>fn({session:window.Clerk.session}));},
          attemptFirstFactor:async({code})=>{window.fixtureAuthCalls.verify++;if(code!=="123456")throw {errors:[{code:code==="999999"?"verification_expired":"form_code_incorrect"}]};return {status:"complete",createdSessionId:session.id};}
        }},
        setActive:async()=>{sessionStorage.removeItem("fixture-signed-out");sessionStorage.setItem("fixture-signed-in","yes");window.Clerk.session=session;listeners.forEach(fn=>fn({session}));},
        addListener:fn=>{listeners.push(fn);return()=>{};},
        signOut:async()=>{sessionStorage.setItem("fixture-signed-out","yes");sessionStorage.removeItem("fixture-signed-in");window.Clerk.session=null;listeners.forEach(fn=>fn({session:null}));}
      };
    `;
    await route.fulfill({ body, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/(query|mutation)$/, async route => {
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = route.request().postDataJSON();
    try {
      const args = jsonToConvex(body.args[0]) as Record<string, never>;
      const value = route.request().url().endsWith('/mutation')
        ? await actor.mutation(makeFunctionReference<'mutation'>(body.path), args)
        : await actor.query(makeFunctionReference<'query'>(body.path), args);
      if (route.request().url().endsWith('/mutation')) await pushNotifications();
      await route.fulfill({ json: { status: 'success', value: convexToJson(value), logLines: [] }, headers });
    } catch (error) { await route.fulfill({ json: { status: 'error', errorMessage: error instanceof Error ? error.message : 'Failed' }, headers }); }
  });
  await context.route('**/api/programme', async route => route.fulfill({ json: await t.query(api.planner.listPublished, {}), headers: { 'Cache-Control': 'no-store' } }));
  await context.route('**/api/planner/sign-in', async route => {
    const { email } = route.request().postDataJSON();
    const result = await t.mutation(api.plannerSignIn.requestCode, { email, requester: 'a'.repeat(64), secret: gateSecret });
    await route.fulfill(result === 'allowed' ? { json: { allowed: true } } : { status: result === 'limited' ? 429 : 403, json: { error: 'This email has not been granted committee access. Ask Josh to add it.' } });
  });
  await context.route('**/api/planner/access', async route => {
    const { email } = route.request().postDataJSON();
    try { await actor.mutation(api.planner.setAccess, { email, active: true }); await route.fulfill({ json: { success: true } }); }
    catch { await route.fulfill({ status: 403, json: { error: 'Only the planner owner can add committee emails.' } }); }
  });
  return { t, admin, owner, pushNotifications, disconnectNotifications: async () => { await Promise.all([...streams].map(stream => stream.disconnect())); }, connections: () => connections, activeConnections: () => streams.size, readyConnections: () => [...streams].filter(stream => stream.subscribed).length };
}
async function ready(page: Page) { await page.goto(`${origin}/committee/planner`); await expect(page.locator('#workspace')).toBeVisible(); }
async function navigate(page: Page, name: string) {
  if ((page.viewportSize()?.width || 1440) <= 720 && !await page.locator('body').evaluate(body => body.classList.contains('sidebar-mobile-open'))) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1); }
async function commentAction(scope: Page | Locator, name: 'Edit comment' | 'Delete comment') {
  const button = scope.getByRole('button', { name, exact: true, includeHidden: true });
  if (!await button.isVisible()) await button.locator('..').locator('..').locator('summary').click();
  await button.click();
}
async function screenshot(page: Page, name: string) { await mkdir('output/planner', { recursive: true }); await page.screenshot({ path: `output/planner/${name}.png` }); }
async function editCard(page: Page, title: string) {
  if (await page.locator('#card-dialog').isVisible()) await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.getByRole('button', { name: `View ${title}`, exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('#card-dialog').getByLabel('Title', { exact: true })).toHaveValue(title);
}
async function closeActivity(page: Page) {
  if (await page.locator('#item-dialog').isVisible()) await page.getByRole('button', { name: 'Close activity', exact: true }).click();
  if (await page.locator('#card-dialog').isVisible()) await page.getByRole('button', { name: 'Close card', exact: true }).click();
}

test('team board supports internal work, shared filters, members and collapsible navigation', async ({ page, context }) => {
  const { admin, t } = await fixture(context, 'owner');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const samples = [
    ['Joint society bar crawl', 'events', 'ideas'], ['Approach NVIDIA for sponsorship', 'industry', 'ideas'],
    ['Weekend AI build challenge', 'projects', 'ideas'], ['AI internship roundup', 'careers', 'ideas'],
    ['Intro to Python workshop', 'learning', 'planning'], ['Autumn sponsor deck', 'industry', 'planning'],
    ['Hackathon project shortlist', 'projects', 'planning'], ['Workshop announcement post', 'learning', 'ready'],
    ['Welcome social', 'events', 'done'], ['Share graduate opportunities', 'careers', 'done'],
  ] as const;
  for (const [title, team, stage] of samples) await admin.mutation(api.planner.create, { activity: { ...activity, title, date: '', location: '' }, team, stage, internalOnly: true });
  const live = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI x Neurotech Meet & Greet' }, team: 'events', stage: 'ready' });
  await admin.mutation(api.planner.publish, { id: live, revision: 1 });
  await page.setViewportSize({ width: 1756, height: 896 }); await ready(page);
  await expect(page.locator('.planner-context')).toHaveCount(0);
  await expect(page.locator('#board .planner-card')).toHaveCount(11);
  await noOverflow(page); await screenshot(page, 'team-board-desktop');
  await page.getByRole('button', { name: 'View committee members', exact: true }).click();
  await expect(page.locator('#team-members .member-row')).toHaveCount(14);
  await expect(page.locator('#team-members')).toContainText("Amanda Lages O'Connor");
  await expect(page.locator('#team-members')).toContainText('Miguel Antonio');
  await screenshot(page, 'committee-members-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await screenshot(page, 'committee-members-mobile');
  await page.setViewportSize({ width: 1756, height: 896 });
  await page.getByRole('button', { name: 'Close members', exact: true }).click();
  await page.getByRole('button', { name: 'Industry & Partnerships', exact: true }).click();
  await expect(page.locator('#board .planner-card')).toHaveCount(2);
  await expect(page.locator('#board .team-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Industry & Partnerships', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Events & Socials', exact: true }).check();
  await page.getByRole('combobox', { name: 'Lead', exact: true }).selectOption('Ibrahim Haque');
  await screenshot(page, 'team-assignment-editor-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await screenshot(page, 'team-assignment-editor-mobile');
  await page.setViewportSize({ width: 1756, height: 896 });
  await expect(page.getByRole('combobox', { name: 'Card purpose', exact: true })).toHaveValue('internal');
  await page.getByLabel('Title', { exact: true }).fill('Draft sponsor email');
  await page.getByLabel('Due date (optional)', { exact: true }).fill(activity.date);
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('ready');
  await expect(page.locator('#editor-preview')).not.toBeVisible();
  await expect(page.locator('#publish-item')).not.toBeVisible();
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.locator('#item-message')).toContainText('Draft saved');
  await closeActivity(page);
  await page.reload(); await expect(page.locator('#board .planner-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Industry & Partnerships', exact: true }).click();
  await expect(page.locator('#board .planner-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Events & Socials', exact: true }).click();
  await expect(page.locator('#board')).toContainText('Draft sponsor email');
  await page.getByRole('button', { name: 'View Draft sponsor email', exact: true }).click();
  await expect(page.locator('#card-dialog').getByRole('combobox', { name: 'Lead', exact: true })).toHaveValue('Ibrahim Haque');
  await expect(page.getByRole('checkbox', { name: 'Industry & Partnerships', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Events & Socials', exact: true })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Lead', exact: true })).toHaveValue('Ibrahim Haque');
  await closeActivity(page);
  await page.getByRole('button', { name: 'Industry & Partnerships', exact: true }).click();
  const card = page.locator('.planner-card').filter({ hasText: 'Draft sponsor email' });
  await card.locator('summary').click(); await card.getByRole('button', { name: 'Move to Done', exact: true }).click();
  await expect(page.locator('.board-column[data-stage=done]')).toContainText('Draft sponsor email');
  expect((await t.query(api.planner.listPublished, {})).map(row => row.id)).toEqual([live]);
  await page.getByRole('button', { name: 'Search cards', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('email');
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Search cards', exact: true }).click();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
  await page.reload(); await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'team-board-mobile');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await navigate(page, 'Calendar');
  await expect(page.locator('#calendar')).toBeVisible(); await noOverflow(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await navigate(page, 'Board');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await screenshot(page, 'team-board-small'); expect(errors).toEqual([]);
});

test('list drag handles reorder the shared board without moving cards', async ({ page, context }) => {
  const { admin } = await fixture(context, 'owner');
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Keep this idea' }, stage: 'ideas', internalOnly: true });
  await page.setViewportSize({ width: 1756, height: 896 });
  await ready(page);
  const order = () => page.locator('#board .board-column').evaluateAll(columns => columns.map(column => (column as HTMLElement).dataset.stage));
  expect(await order()).toEqual(['ideas', 'planning', 'ready', 'done']);
  await page.getByRole('button', { name: 'Reorder Ideas list' }).dragTo(page.locator('.board-column[data-stage=done]'), { targetPosition: { x: 260, y: 30 } });
  await expect.poll(order).toEqual(['planning', 'ready', 'done', 'ideas']);
  await expect(page.locator('.board-column[data-stage=ideas]')).toContainText('Keep this idea');
  await page.reload(); await expect.poll(order).toEqual(['planning', 'ready', 'done', 'ideas']);
  await page.getByRole('button', { name: 'Reorder Ideas list' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(order).toEqual(['planning', 'ready', 'ideas', 'done']);
  await page.reload(); await expect.poll(order).toEqual(['planning', 'ready', 'ideas', 'done']);
  await screenshot(page, 'reordered-lists-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await screenshot(page, 'reordered-lists-mobile');
});

test.describe('touch list controls', () => {
  test.use({ hasTouch: true });

  test('can drag a list across the mobile board', async ({ page, context }) => {
    await fixture(context, 'owner');
    await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
    const handle = await page.getByRole('button', { name: 'Reorder Ideas list' }).boundingBox();
    expect(handle).not.toBeNull();
    const session = await context.newCDPSession(page);
    const y = handle!.y + handle!.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: handle!.x + handle!.width / 2, y }] });
    for (let step = 0; step < 12; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 370 + step % 2, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 250, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.locator('#board .board-column').evaluateAll(columns => columns.map(column => (column as HTMLElement).dataset.stage))).toEqual(['planning', 'ideas', 'ready', 'done']);
    await page.reload();
    await expect(page.locator('#board .board-column').first()).toHaveAttribute('data-stage', 'planning');
  });
});

test('committee can prepare, publish, revise and unpublish without exposing private notes', async ({ page, context }) => {
  const { t } = await fixture(context);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.getByRole('combobox', { name: 'Card purpose', exact: true }).selectOption('activity');
  await page.getByLabel('Title', { exact: true }).fill('Committee integration workshop');
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('ready');
  await page.getByLabel('Date', { exact: true }).fill(activity.date);
  await page.getByLabel('Start time', { exact: true }).fill('18:00');
  await page.getByLabel('End time', { exact: true }).fill('20:00');
  await page.getByLabel('Room or location', { exact: true }).fill('Stag Hill');
  await page.getByLabel('Booking or project link', { exact: true }).fill('https://example.test/book');
  await page.getByLabel('Description', { exact: true }).fill('Open to every degree.');
  await page.locator('#private-options > summary').click();
  await page.getByLabel('Notes', { exact: true }).fill('PRIVATE_ONLY_COMMITTEE_NOTES');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#item-message')).toContainText('Draft saved');
  expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  const publicPage = await context.newPage(); await publicPage.goto(`${origin}/#programme`);
  await expect(publicPage.locator('#programme')).not.toContainText('Committee integration workshop');
  await page.getByRole('button', { name: 'Publish to website', exact: true }).click();
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Committee integration workshop');
  await expect(publicPage.locator('body')).not.toContainText('PRIVATE_ONLY_COMMITTEE_NOTES');
  await editCard(page, 'Committee integration workshop');
  await page.getByLabel('Title', { exact: true }).fill('Revised committee workshop');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#item-message')).toContainText('Draft saved');
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Committee integration workshop');
  await expect(publicPage.locator('#programme')).not.toContainText('Revised committee workshop');
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Revised committee workshop');
  await editCard(page, 'Revised committee workshop');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Unpublish and move to Ready', exact: true }).click();
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await publicPage.reload(); await expect(publicPage.locator('#programme')).not.toContainText('Revised committee workshop');
  expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  expect(errors).toEqual([]);
});

test('private board and publication review match the minimal layout on desktop and phone', async ({ page, context }) => {
  const { admin } = await fixture(context);
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI & creativity night', date: '', startTime: '', endTime: '', category: 'Social' } });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Surrey AI Mini Hack', kind: 'hackathon' }, stage: 'planning' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Build night & project teams', category: 'Project session' }, stage: 'ready' });
  const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' }); await admin.mutation(api.planner.publish, { id, revision: 1 });
  const project = await admin.mutation(api.planner.create, { activity: { ...activity, kind: 'project', title: 'Campus study assistant', date: '', startTime: '', endTime: '', location: '', description: 'Help build a useful study assistant for Surrey students.' }, stage: 'ready' }); await admin.mutation(api.planner.publish, { id: project, revision: 1 });
  await ready(page); await noOverflow(page); await screenshot(page, 'board-desktop');
  await editCard(page, 'Build night & project teams');
  await expect(page.locator('#card-dialog')).toBeVisible(); await screenshot(page, 'publication-desktop');
  await closeActivity(page);
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'board-mobile');
  await editCard(page, 'Build night & project teams');
  await expect(page.locator('#card-dialog')).toBeVisible(); await noOverflow(page); await screenshot(page, 'publication-mobile');
  await closeActivity(page);
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await navigate(page, 'Calendar'); await expect(page.locator('#calendar')).toBeVisible(); await noOverflow(page);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await navigate(page, 'Board');
  await editCard(page, 'Build night & project teams');
  await page.getByRole('button', { name: 'Publish to website', exact: true }).click();
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  const homepage = await context.newPage(); await homepage.goto(`${origin}/#programme`);
  await expect(homepage.locator('#programme')).toContainText('Build night & project teams');
  await homepage.locator('#programme').screenshot({ path: 'output/planner/homepage-programme-desktop.png' });
  await homepage.setViewportSize({ width: 390, height: 844 }); await noOverflow(homepage);
  await homepage.locator('#programme').screenshot({ path: 'output/planner/homepage-programme-mobile.png' });
});

test('non-committee accounts and signed-out visitors cannot see the board', async ({ page, context }) => {
  await fixture(context, 'outsider'); await page.goto(`${origin}/committee/planner`);
  await expect(page.locator('#access-message')).toContainText('Ask Josh');
  await expect(page.locator('#workspace')).not.toBeVisible(); await expect(page.locator('#board')).toBeEmpty();
});

test('signed-out state is private and public detail links do not reveal drafts', async ({ page, context, request }) => {
  await fixture(context, 'signed-out'); await page.goto(`${origin}/committee/planner`);
  await expect(page.locator('#access-message')).toContainText('Sign in with your committee email');
  await expect(page.locator('#workspace')).not.toBeVisible();
  await expect(page.getByLabel('Committee email', { exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Secured by'); await expect(page.locator('body')).not.toContainText('Development mode');
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  const icon = await page.locator('#access-state > svg').boundingBox(); const panel = await page.locator('#sign-in').boundingBox();
  expect(Math.abs((icon!.x + icon!.width / 2) - (panel!.x + panel!.width / 2))).toBeLessThanOrEqual(1);
  await screenshot(page, 'sign-in-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'sign-in-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  const response = await request.get(`${origin}/activities/not-a-real-id`); expect(response.status()).toBe(404);
  const draft = await request.post(`${origin}/api/planner/draft`, { data: { prompt: 'Make a workshop' } }); expect(draft.status()).toBe(401);
});

test('only the owner manages emails in Settings and AI suggestions remain unsaved drafts', async ({ page, context }) => {
  const { t } = await fixture(context, 'owner'); await ready(page);
  await navigate(page, 'Settings');
  await expect(page.locator('#committee-settings')).toBeVisible();
  await expect(page.locator('#settings-account')).toContainText('joshhknott@gmail.com');
  await page.locator('#access-form').getByLabel('Committee email', { exact: true }).fill('new-committee@example.test');
  await page.getByRole('button', { name: 'Add email', exact: true }).click();
  await expect(page.locator('#access-list')).toContainText('new-committee@example.test');
  await screenshot(page, 'owner-settings-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'owner-settings-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.access-row').filter({ hasText: 'new-committee@example.test' }).getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(page.locator('#access-list')).not.toContainText('new-committee@example.test');
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  if (await page.locator('[data-planner]').getAttribute('data-ai') === 'true') {
    await context.route('**/api/planner/draft', async route => { expect(route.request().postDataJSON()).toMatchObject({ focus: 'description' }); await route.fulfill({ json: { description: 'A welcoming beginner workshop.' } }); });
    await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.getByRole('combobox', { name: 'Card purpose', exact: true }).selectOption('activity');
    await page.getByLabel('Title', { exact: true }).fill('My workshop idea');
    await page.getByLabel('Description', { exact: true }).fill('My rough notes');
    await page.getByLabel('Collaborators (optional)', { exact: true }).fill('Josh, Mosie');
    await page.getByRole('button', { name: 'Help write this', exact: true }).click();
    await expect(page.locator('#description-suggestion')).toBeVisible();
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue('My rough notes');
    await page.getByRole('button', { name: 'Use description', exact: true }).click();
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue('A welcoming beginner workshop.');
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('My workshop idea');
    await expect(page.getByLabel('Collaborators (optional)', { exact: true })).toHaveValue('Josh, Mosie');
    await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('ideas');
    await expect(page.locator('#draft-ai, #ai-dialog')).toHaveCount(0);
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
    expect(await t.run(ctx => ctx.db.query('plannerItems').take(1))).toEqual([]);
  }
});

test('ordinary committee accounts have no email access controls in Settings', async ({ page, context }) => {
  await fixture(context); await ready(page);
  await navigate(page, 'Settings');
  await expect(page.locator('#settings-account')).toContainText('committee@example.test');
  await expect(page.locator('#committee-settings')).not.toBeVisible();
  await expect(page.locator('#access-form').getByLabel('Committee email', { exact: true })).not.toBeVisible();
  await expect(page.locator('#access-list')).toBeEmpty();
});

test('revoking committee access clears already-loaded private content', async ({ page, context }) => {
  const { admin, t } = await fixture(context);
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Private committee planning' }, stage: 'planning', notes: 'PRIVATE_REVOCATION_NOTES', tasks: [{ text: 'PRIVATE_PREPARATION_TASK', done: false }] });
  await ready(page); await editCard(page, 'Private committee planning');
  await page.locator('#private-options > summary').click();
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('PRIVATE_REVOCATION_NOTES');
  await t.run(async ctx => { const row = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(row!._id, { active: false }); });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#workspace')).not.toBeVisible();
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await expect(page.locator('#board')).toBeEmpty(); await expect(page.locator('#task-list')).toBeEmpty();
  await expect(page.locator('[name=notes]')).toHaveValue('');
});

test('an unlisted email cannot trigger a code request', async ({ page, context }) => {
  await fixture(context, 'signed-out'); await page.goto(`${origin}/committee/planner`);
  await page.locator('#sign-in-email').fill('outsider@example.test');
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.locator('#sign-in-feedback')).toContainText('not been granted');
  await expect(page.locator('#code-sign-in')).not.toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { fixtureAuthCalls: unknown }).fixtureAuthCalls)).toMatchObject({ create: 0, send: 0, verify: 0 });
});

test('email codes handle retry, expiry and resend, then restore sign-in after reload', async ({ page, context }) => {
  await fixture(context, 'signed-out'); await page.clock.install(); await page.goto(`${origin}/committee/planner`);
  await page.locator('#sign-in-email').fill('committee@example.test');
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.locator('#code-sign-in')).toBeVisible();
  await expect(page.locator('#code-destination')).toContainText('committee@example.test');
  await expect(page.locator('#resend-code')).toBeDisabled();
  await page.locator('#sign-in-code').fill('000000');
  await page.getByRole('button', { name: 'Verify and sign in', exact: true }).click();
  await expect(page.locator('#sign-in-feedback')).toContainText('incorrect');
  await page.locator('#sign-in-code').fill('999999');
  await page.getByRole('button', { name: 'Verify and sign in', exact: true }).click();
  await expect(page.locator('#sign-in-feedback')).toContainText('expired');
  await page.clock.fastForward(61000);
  await page.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect(page.locator('#sign-in-code')).toHaveValue('');
  await expect(page.locator('#sign-in-feedback')).toBeEmpty();
  expect(await page.evaluate(() => (window as unknown as { fixtureAuthCalls: { send: number } }).fixtureAuthCalls.send)).toBe(2);
  await screenshot(page, 'sign-in-code-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'sign-in-code-mobile');
  await page.getByRole('button', { name: 'Use another email', exact: true }).click();
  await expect(page.locator('#email-sign-in')).toBeVisible();
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.locator('#code-sign-in')).toBeVisible();
  await page.locator('#sign-in-code').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in', exact: true }).click();
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#sign-in-code')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#sign-in')).not.toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { fixtureAuthCalls: { send: number } }).fixtureAuthCalls.send)).toBe(0);
  await navigate(page, 'Sign out');
  await expect(page.locator('#email-sign-in')).toBeVisible(); await expect(page.locator('#workspace')).not.toBeVisible();
});

test('revocation between receiving a code and signing in still prevents board access', async ({ page, context }) => {
  const { t } = await fixture(context, 'signed-out'); await page.goto(`${origin}/committee/planner`);
  await page.locator('#sign-in-email').fill('committee@example.test');
  await page.getByRole('button', { name: 'Send sign-in code', exact: true }).click();
  await expect(page.locator('#code-sign-in')).toBeVisible();
  await t.run(async ctx => { const grant = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(grant!._id, { active: false }); });
  await page.locator('#sign-in-code').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in', exact: true }).click();
  await expect(page.locator('#access-message')).toContainText('Ask Josh');
  await expect(page.locator('#workspace')).not.toBeVisible(); await expect(page.locator('#board')).toBeEmpty();
});

test('Ideas needs only a title, description and optional collaborators; details appear later', async ({ page, context }) => {
  const { admin, t } = await fixture(context); await ready(page);
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.getByRole('combobox', { name: 'Card purpose', exact: true }).selectOption('activity');
  await page.getByLabel('Title', { exact: true }).fill('AI film night');
  await page.getByLabel('Description', { exact: true }).fill('A film and a discussion about AI.');
  await page.getByLabel('Collaborators (optional)', { exact: true }).fill('Josh, Mosie');
  await expect(page.locator('#activity-details')).not.toBeVisible(); await expect(page.locator('#private-options')).not.toBeVisible(); await expect(page.locator('#editor-preview')).not.toBeVisible();
  await expect(page.locator('#item-form input:visible:not([name="teams"]), #item-form textarea:visible')).toHaveCount(3);
  await screenshot(page, 'simple-idea-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'simple-idea-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Save idea', exact: true }).click(); await expect(page.locator('#item-message')).toContainText('Draft saved');
  const [idea] = await admin.query(api.planner.list, {});
  expect(idea).toMatchObject({ title: 'AI film night', owner: 'Josh, Mosie', stage: 'ideas', date: '', location: '', registrationUrl: '' });
  expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('planning');
  await expect(page.locator('#activity-details')).toBeVisible(); await expect(page.locator('#editor-preview')).not.toBeVisible();
  await page.getByLabel('Date', { exact: true }).fill(activity.date);
  await page.getByLabel('Room or location', { exact: true }).fill('03AC01');
  await page.getByLabel('Start time', { exact: true }).fill('18:00');
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('ready');
  await expect(page.locator('#editor-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish to website', exact: true })).toBeDisabled();
  await expect(page.locator('#publication-missing')).toContainText('booking link');
  await page.getByLabel('Booking or project link', { exact: true }).fill('https://example.test/book');
  await expect(page.getByRole('button', { name: 'Publish to website', exact: true })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('ideas');
  await page.getByRole('button', { name: 'Save idea', exact: true }).click(); await expect(page.locator('#item-message')).toContainText('Draft saved');
  expect((await admin.query(api.planner.list, {}))[0]).toMatchObject({ location: '03AC01', registrationUrl: 'https://example.test/book', stage: 'ideas', owner: 'Josh, Mosie' });
  await closeActivity(page);
  await expect(page.locator('[data-stage=ideas]')).not.toContainText('No date yet');
});

test('calendar retains archived events, orders times and uses a compact mobile agenda', async ({ page, context }) => {
  const { admin } = await fixture(context);
  await page.clock.setFixedTime(new Date('2026-10-15T11:00:00Z'));
  const past = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Committee welcome night', date: '2026-10-14' }, stage: 'planning', notes: 'Keep the room notes' });
  await admin.mutation(api.planner.move, { id: past, revision: 1, stage: 'archived' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Evening builder night', date: '2026-10-15', startTime: '19:00', endTime: '21:00', location: '03AC01' }, stage: 'planning' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'First workshop', date: '2026-10-15', startTime: '18:00', endTime: '19:00' }, stage: 'ready' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Next month talk', date: '2026-11-02' }, stage: 'planning' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Undated idea', date: '', startTime: '', endTime: '' } });
  await ready(page);
  await expect(page.locator('#board')).not.toContainText('Committee welcome night');
  await navigate(page, 'Calendar');
  await expect(page.locator('#calendar[aria-busy=false] .calendar-event')).toHaveCount(3);
  await expect(page.locator('#calendar-month')).toHaveText('October 2026');
  await expect(page.locator('.calendar-day[data-date]')).toHaveCount(31);
  await expect(page.locator('.calendar-pad')).toHaveCount(4);
  expect(await page.locator('[data-date="2026-10-15"] .calendar-event-title').allTextContents()).toEqual(['First workshop', 'Evening builder night']);
  await expect(page.locator('[data-date="2026-10-15"]')).toHaveClass(/today/);
  await expect(page.locator('[data-date="2026-10-14"] .calendar-event')).toHaveAttribute('data-stage', 'archived');
  await page.locator('[data-date="2026-10-14"] .calendar-event').click();
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('archived');
  await page.locator('#private-options > summary').click();
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep the room notes');
  await page.getByLabel('Notes', { exact: true }).fill('Updated historical room notes');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#item-message')).toContainText('Draft saved');
  expect(await admin.query(api.planner.get, { id: past })).toMatchObject({ stage: 'archived', date: '2026-10-14', notes: 'Updated historical room notes' });
  await closeActivity(page);
  await page.locator('[data-date="2026-10-21"] .calendar-date').click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-21');
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('planning');
  await page.getByLabel('Title', { exact: true }).fill('Calendar planning draft');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#item-message')).toContainText('Draft saved');
  await closeActivity(page);
  await expect(page.locator('[data-date="2026-10-21"]')).toContainText('Calendar planning draft');
  await noOverflow(page); await screenshot(page, 'calendar-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await expect(page.locator('.calendar-day:visible')).toHaveCount(3);
  await expect(page.locator('.calendar-day:not(.has-events):visible')).toHaveCount(0);
  await screenshot(page, 'calendar-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('November 2026');
  await expect(page.locator('#calendar[aria-busy=false]')).toContainText('Next month talk');
  await expect(page.getByRole('button', { name: 'Next month', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar[aria-busy=false] .calendar-empty')).toBeVisible();
  await screenshot(page, 'calendar-empty-mobile');
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('January 2027');
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('December 2026');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('October 2026');
  await expect(page.locator('#calendar[aria-busy=false]')).toContainText('Committee welcome night');
  await navigate(page, 'Archive');
  await expect(page.locator('#archive')).toContainText('Committee welcome night');
});

test('calendar can retry failures and ignores an older month response after navigation', async ({ page, context }) => {
  await fixture(context); await page.clock.setFixedTime(new Date('2026-10-15T11:00:00Z'));
  let fail = true; let releaseNovember: (() => void) | undefined;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    if (body.path !== 'planner:calendar') return route.fallback();
    if (fail) { fail = false; return route.fulfill({ json: { status: 'error', errorMessage: 'Calendar unavailable' }, headers: { 'Access-Control-Allow-Origin': origin } }); }
    if (body.args[0].month === '2026-11') await new Promise<void>(resolve => { releaseNovember = resolve; });
    return route.fallback();
  });
  await ready(page); await navigate(page, 'Calendar');
  await expect(page.locator('.calendar-feedback')).toContainText('Could not load');
  await page.locator('.calendar-feedback').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#calendar[aria-busy=false] .calendar-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar-month')).toHaveText('November 2026');
  await expect.poll(() => !!releaseNovember).toBe(true);
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar[aria-busy=false] #calendar-month')).toHaveText('December 2026');
  releaseNovember!();
  await expect(page.locator('#calendar-month')).toHaveText('December 2026');
  await expect(page.locator('#calendar[aria-busy=false] .calendar-empty')).toBeVisible();
  releaseNovember = undefined;
  await page.getByRole('button', { name: 'Previous month', exact: true }).click();
  await expect.poll(() => !!releaseNovember).toBe(true);
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.locator('#calendar[aria-busy=false] #calendar-month')).toHaveText('December 2026');
  releaseNovember!();
  await expect(page.locator('#calendar[aria-busy=false] #calendar-month')).toHaveText('December 2026');
});

test('board cards omit stage dropdowns and move by drag and drop without publishing automatically', async ({ page, context }) => {
  const { admin, t } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI × Business × CompSci × Neurotech bar crawl', date: '', startTime: '', endTime: '', location: '', description: 'A relaxed evening with the four societies.' }, owner: 'Josh, Mosie' });
  const published = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI × Neurotech Meet & Greet', location: '03AC01' }, stage: 'ready' });
  await admin.mutation(api.planner.publish, { id: published, revision: 1 });
  await ready(page);
  await expect(page.locator('#board select')).toHaveCount(0);
  await expect(page.locator(`.planner-card[data-item="${id}"] .card-footer`)).toHaveCount(1);
  await expect(page.locator('.column-heading h2')).toHaveText(['Ideas', 'In progress', 'Ready', 'Done']);
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=planning]'));
  await expect(page.locator(`.board-column[data-stage=planning] [data-item="${id}"]`)).toBeVisible();
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=ready]'));
  await expect(page.locator(`.board-column[data-stage=ready] [data-item="${id}"]`)).toBeVisible();
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=done]'));
  await expect(page.locator(`.board-column[data-stage=done] [data-item="${id}"]`)).toBeVisible();
  expect((await t.query(api.planner.listPublished, {})).map(item => item.id)).toEqual([published]);
  await page.locator(`.planner-card[data-item="${published}"]`).dragTo(page.locator('.board-column[data-stage=done]'));
  await expect(page.locator(`.board-column[data-stage=done] [data-item="${published}"]`)).toBeVisible();
  expect((await t.query(api.planner.listPublished, {})).map(item => item.id)).toEqual([published]);
  await noOverflow(page); await screenshot(page, 'cards-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'cards-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
});

test('approved board and opened card keep details inside and make comment actions accessible', async ({ page, context }) => {
  const { t, admin, owner } = await fixture(context, 'owner');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await t.run(async ctx => {
    const society = (await ctx.db.query('societies').first())!;
    const committee = (await ctx.db.query('users').first())!;
    await ctx.db.patch(committee._id, { name: 'Sam' });
    for (const name of ['Maya', 'Alex']) {
      const subject = name.toLowerCase(); const email = `${subject}@example.test`;
      const userId = await ctx.db.insert('users', { name, email, clerkId: `https://fixture.test|${subject}` });
      await ctx.db.insert('memberships', { societyId: society._id, userId, role: 'admin', status: 'active' });
      await ctx.db.insert('plannerAccess', { societyId: society._id, email, active: true });
    }
  });
  const person = (name: string) => t.withIdentity({ subject: name.toLowerCase(), issuer: 'https://fixture.test', tokenIdentifier: `https://fixture.test|${name.toLowerCase()}`, name, email: `${name.toLowerCase()}@example.test`, emailVerified: true });
  const maya = person('Maya'); const alex = person('Alex');
  const workshop: Activity = { ...activity, description: 'A hands-on workshop to build a simple AI agent. No experience needed — just bring your laptop.', date: '2026-10-22' };
  const cards = [
    { title: 'Intro to machine learning', stage: 'published', people: [alex] },
    { title: 'Welcome to Surrey AI', stage: 'published', people: [owner] },
    { title: 'Society launch social', stage: 'ready', people: [admin, maya] },
    { title: 'AI × Neurotech meet & greet', stage: 'planning', people: [maya, alex] },
    { title: 'Build your first AI agent', stage: 'planning', people: [owner, admin] },
    { title: 'Beginner Python café', stage: 'ideas', people: [alex] },
    { title: 'AI film night', stage: 'ideas', people: [admin] },
    { title: 'AI & creativity night', stage: 'ideas', people: [owner, maya] },
  ] as const;
  let workshopId;
  for (const card of cards) {
    const details = { ...workshop, title: card.title };
    const stage = card.stage === 'published' ? 'ready' : card.stage;
    const id = await card.people[0].mutation(api.planner.create, { activity: details, stage });
    if (card.people.length > 1) await card.people[1].mutation(api.planner.save, { id, revision: 1, activity: details, notes: '', owner: '', tasks: [] });
    if (card.stage === 'published') await card.people[0].mutation(api.planner.publish, { id, revision: 1 });
    if (card.title === 'Build your first AI agent') workshopId = id;
  }
  if (!workshopId) throw new Error('Workshop fixture missing');
  await admin.mutation(api.planner.addComment, { id: workshopId, text: 'Room is booked. Shall we keep it beginner-friendly?', requestId: '00000000-0000-4000-8000-000000000001' });
  const own = await owner.mutation(api.planner.addComment, { id: workshopId, text: "Definitely. @committee@example.test I'll put together a starter project.", requestId: '00000000-0000-4000-8000-000000000002' });
  await admin.mutation(api.planner.addComment, { id: workshopId, text: "Perfect — I'll sort the slides.", requestId: '00000000-0000-4000-8000-000000000003' });
  await ready(page);
  await expect(page.locator('.column-count')).toHaveText(['3', '2', '3', '0']);
  await expect(page.locator('#board .planner-card')).toHaveCount(8);
  await expect(page.locator('#board .card-kind, #board .card-description, #board .card-details, #board .card-comment-count, #board select, #board a')).toHaveCount(0);
  await expect(page.locator('#board')).not.toContainText(workshop.description);
  await expect(page.locator('#board')).not.toContainText(workshop.location);
  const card = page.locator(`.planner-card[data-item="${workshopId}"]`);
  await expect(card.locator('.person-name')).toHaveText(['Joshua Knott', 'Sam']);
  await expect(card.getByRole('button', { name: /^View / })).toHaveAccessibleDescription(/Joshua Knott.*Sam/);
  await noOverflow(page); await screenshot(page, 'approved-board-desktop');
  await card.getByRole('button', { name: /^View / }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#card-dialog').getByLabel('Description', { exact: true })).toHaveValue(workshop.description);
  await expect(page.locator('#card-dialog').getByLabel('Date', { exact: true })).toHaveValue(workshop.date);
  await expect(page.locator('#card-dialog').getByLabel('Room or location', { exact: true })).toHaveValue(workshop.location);
  await expect(page.locator('#comment-list .comment')).toHaveCount(3);
  await expect(page.locator('.comment-composer')).toContainText('Mention someone');
  const ownRow = page.locator(`[data-comment="${own}"]`);
  await expect(ownRow.getByRole('button', { name: 'Edit comment', exact: true })).not.toBeVisible();
  const menu = ownRow.getByLabel('Comment actions', { exact: true });
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(ownRow.getByRole('button', { name: 'Edit comment', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(ownRow.getByRole('button', { name: 'Edit comment', exact: true })).not.toBeVisible();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await noOverflow(page); await screenshot(page, 'approved-card-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'approved-card-mobile');
  await page.locator('.comment-composer').scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Post comment', exact: true })).toBeInViewport();
  expect(await page.locator('#card-dialog').evaluate(dialog => dialog.scrollWidth - dialog.clientWidth)).toBeLessThanOrEqual(1);
  await screenshot(page, 'approved-composer-mobile');
  await page.getByRole('button', { name: 'Mention a committee member', exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Mention a committee member', exact: true })).toBeVisible();
  await page.getByLabel('Add a comment', { exact: true }).press('Escape');
  await page.getByLabel('Add a comment', { exact: true }).fill('');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'approved-board-mobile');
  await page.setViewportSize({ width: 834, height: 1194 }); await noOverflow(page); await screenshot(page, 'approved-board-tablet');
  expect(errors).toEqual([]);
});

test('cards open fully editable beside comments and track the creator and editors as initials', async ({ page, context }) => {
  const { admin } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI & creativity night', description: 'An evening of small creative experiments with AI.', date: '', startTime: '', endTime: '', location: '' } });
  await admin.mutation(api.planner.addComment, { id, text: 'Could we include a music activity?', requestId: '00000000-0000-4000-8000-000000000001' });
  await ready(page);
  await expect(page.locator(`[data-item="${id}"] .person-avatar`)).toHaveText(['C']);
  await page.getByRole('button', { name: 'View AI & creativity night', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible(); await expect(page.locator('#item-dialog')).not.toBeVisible();
  await expect(page.locator('#card-dialog').getByLabel('Description', { exact: true })).toHaveValue(/small creative experiments/);
  await expect(page.locator('#comment-list')).toContainText('music activity');
  await page.getByLabel('Add a comment', { exact: true }).fill('I can help with the creative coding session.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(2);
  await expect(page.locator('#comment-text')).toHaveValue('');
  await expect(page.locator('#comment-count')).toHaveText('2');
  await expect(page.getByRole('button', { name: 'Edit comment', exact: true, includeHidden: true })).toHaveCount(1);
  expect((await admin.query(api.planner.get, { id }))?.contributors).toHaveLength(1);
  await page.getByLabel('Add a comment', { exact: true }).fill('Unposted comment draft');
  await page.getByLabel('Description', { exact: true }).fill('Bring your ideas for music, art and creative coding.');
  await page.getByRole('button', { name: 'Save idea', exact: true }).click(); await expect(page.locator('#item-message')).toContainText('Draft saved');
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Bring your ideas for music, art and creative coding.');
  await expect(page.locator('#comment-text')).toHaveValue('Unposted comment draft');
  await expect(page.locator(`[data-item="${id}"] .person-avatar`)).toHaveText(['C', 'JK']);
  await page.getByLabel('Title', { exact: true }).fill('Unsaved card title');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('AI & creativity night');
  await page.getByLabel('Add a comment', { exact: true }).fill('');
  await noOverflow(page); await screenshot(page, 'card-preview-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'card-preview-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await expect(page.locator(`[data-item="${id}"] .person-avatar`)).toHaveText(['C', 'JK']);
  await expect(page.locator('#board select')).toHaveCount(0);
});

test('comment history paginates, failed delivery retries safely and revocation clears the thread', async ({ page, context }) => {
  const { admin, t } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Committee discussion' } });
  for (let i = 0; i < 33; i++) await admin.mutation(api.planner.addComment, { id, text: `Earlier comment ${i}`, requestId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` });
  let releaseComments: (() => void) | undefined;
  let firstLoad = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    if (body.path === 'planner:listComments' && firstLoad) { firstLoad = false; await new Promise<void>(resolve => { releaseComments = resolve; }); }
    return route.fallback();
  });
  let fail = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/mutation$/, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    if (body.path !== 'planner:addComment' || !fail) return route.fallback();
    fail = false;
    await admin.mutation(api.planner.addComment, jsonToConvex(body.args[0]) as { id: typeof id; text: string; requestId: string });
    await route.abort('failed');
  });
  await ready(page); await page.getByRole('button', { name: 'View Committee discussion', exact: true }).click();
  await expect.poll(() => !!releaseComments).toBe(true);
  await expect(page.getByRole('button', { name: 'Post comment', exact: true })).toBeDisabled();
  releaseComments!();
  await expect(page.locator('#comment-list .comment')).toHaveCount(30);
  await page.getByRole('button', { name: 'Load earlier comments', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(33);
  const history = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: null } });
  const earlier = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: history.continueCursor } });
  const old = earlier.page.find(comment => comment.text === 'Earlier comment 0')!;
  await admin.mutation(api.planner.editComment, { id: old._id, text: 'Updated from another session', revision: 0 });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator(`#comment-list [data-comment="${old._id}"]`)).toContainText('Updated from another session');
  await admin.mutation(api.planner.deleteComment, { id: old._id });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#comment-list .comment')).toHaveCount(32);
  await expect(page.locator('#comment-count')).toHaveText('32');
  await page.getByLabel('Add a comment', { exact: true }).fill('<script>PRIVATE_COMMENT_TEXT</script>');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('#comment-message')).not.toBeEmpty();
  await expect(page.locator('#comment-text')).toHaveValue('<script>PRIVATE_COMMENT_TEXT</script>');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('#comment-count')).toHaveText('33');
  await expect(page.locator('#comment-list .comment')).toHaveCount(33);
  await expect(page.locator('#comment-list')).toContainText('<script>PRIVATE_COMMENT_TEXT</script>');
  await expect(page.locator('#comment-list script')).toHaveCount(0);
  expect((await admin.query(api.planner.get, { id }))?.commentCount).toBe(33);
  await t.run(async ctx => { const grant = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(grant!._id, { active: false }); });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#workspace')).not.toBeVisible(); await expect(page.locator('#card-dialog')).not.toBeVisible();
  await expect(page.locator('#comment-list')).toBeEmpty(); await expect(page.locator('#comment-text')).toHaveValue('');
  await expect(page.locator('#card-people')).toBeEmpty();
});

test('authors edit comments inline and confirm deletion while other comments stay read-only', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Creative AI evening', description: 'Bring an idea, try something new, and build together.', date: '', startTime: '', endTime: '', location: '' } });
  const other = await admin.mutation(api.planner.addComment, { id, text: 'Could we include a music activity?', requestId: '00000000-0000-4000-8000-000000000001' });
  const own = await owner.mutation(api.planner.addComment, { id, text: 'I can help with the creative coding session.', requestId: '00000000-0000-4000-8000-000000000002' });
  await ready(page); await page.getByRole('button', { name: 'View Creative AI evening', exact: true }).click();
  const otherRow = page.locator(`#comment-list [data-comment="${other}"]`);
  const ownRow = page.locator(`#comment-list [data-comment="${own}"]`);
  await expect(ownRow.getByRole('button', { name: 'Edit comment', exact: true, includeHidden: true })).toBeEnabled();
  await expect(otherRow.getByRole('button')).toHaveCount(0);
  await page.getByLabel('Add a comment', { exact: true }).fill('Keep this unposted draft.');
  await commentAction(ownRow, 'Edit comment');
  await page.getByLabel('Edit your comment', { exact: true }).fill('A cancelled edit');
  await page.getByRole('button', { name: 'Cancel editing comment', exact: true }).click();
  await expect(ownRow.locator('p')).toHaveText('I can help with the creative coding session.');
  await commentAction(ownRow, 'Edit comment');
  await page.getByLabel('Edit your comment', { exact: true }).fill('I can run a creative coding session and help with setup.');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Edit your comment', { exact: true })).toHaveValue('I can run a creative coding session and help with setup.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(ownRow.locator('p')).toHaveText('I can run a creative coding session and help with setup.');
  await expect(ownRow.locator('.comment-edited')).toHaveText('Edited');
  await expect(page.locator('#comment-message')).toHaveText('Comment updated.');
  await expect(page.locator('#comment-count')).toHaveText('2');
  await expect(page.locator('#comment-text')).toHaveValue('Keep this unposted draft.');
  expect(await admin.query(api.planner.get, { id })).toMatchObject({ revision: 1, commentCount: 2 });
  await noOverflow(page); await screenshot(page, 'comment-controls-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await commentAction(ownRow, 'Edit comment');
  await noOverflow(page); await screenshot(page, 'comment-edit-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Cancel editing comment', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await commentAction(ownRow, 'Delete comment');
  await expect(ownRow).toContainText('Delete this comment?');
  await screenshot(page, 'comment-delete-mobile');
  await page.getByRole('button', { name: 'Keep comment', exact: true }).click();
  await expect(ownRow.locator('p')).toContainText('creative coding session');
  await commentAction(ownRow, 'Delete comment');
  await page.getByRole('button', { name: 'Confirm delete comment', exact: true }).click();
  await expect(ownRow).toHaveCount(0); await expect(otherRow).toBeVisible();
  await expect(page.locator('#comment-count')).toHaveText('1');
  await expect(page.locator('#comment-message')).toHaveText('Comment deleted.');
  await expect(page.locator('#comment-text')).toHaveValue('Keep this unposted draft.');
  await page.reload(); await page.getByRole('button', { name: 'View Creative AI evening', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(1); await expect(otherRow).toBeVisible();
});

test('failed comment changes retain the draft and retries do not repeat edits or deletions', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Comment recovery' } });
  const commentId = await admin.mutation(api.planner.addComment, { id, text: 'Initial update', requestId: '00000000-0000-4000-8000-000000000001' });
  const failed = new Set<string>();
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/mutation$/, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    if (!['planner:editComment', 'planner:deleteComment'].includes(body.path) || failed.has(body.path)) return route.fallback();
    failed.add(body.path);
    if (body.path === 'planner:editComment') await admin.mutation(api.planner.editComment, jsonToConvex(body.args[0]) as { id: typeof commentId; text: string; revision: number });
    else await admin.mutation(api.planner.deleteComment, { id: commentId });
    await route.abort('failed');
  });
  await ready(page); await page.getByRole('button', { name: 'View Comment recovery', exact: true }).click();
  await commentAction(page, 'Edit comment');
  await page.getByLabel('Edit your comment', { exact: true }).fill('<script>Updated safely</script>');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#comment-message')).not.toBeEmpty();
  await expect(page.getByLabel('Edit your comment', { exact: true })).toHaveValue('<script>Updated safely</script>');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#comment-list p')).toHaveText('<script>Updated safely</script>');
  await expect(page.locator('#comment-list script')).toHaveCount(0);
  const changed = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: null } });
  expect(changed.page[0].revision).toBe(1);
  await commentAction(page, 'Delete comment');
  await page.getByRole('button', { name: 'Confirm delete comment', exact: true }).click();
  await expect(page.locator('#comment-message')).not.toBeEmpty();
  await expect(page.getByRole('button', { name: 'Confirm delete comment', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm delete comment', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(0);
  await expect(page.locator('#comment-count')).toHaveText('0');
  await expect(page.locator('#comments-status')).toHaveText('No comments yet.');
  expect(await admin.query(api.planner.get, { id })).toMatchObject({ revision: 1, commentCount: 0 });
});

test('committee can pick mentions with the keyboard and edit them without duplicate notifications', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Creative AI night', description: 'An evening to build, experiment and share ideas.', date: '', startTime: '', endTime: '', location: '', registrationUrl: '' } });
  await ready(page); await page.getByRole('button', { name: 'View Creative AI night', exact: true }).click();
  const compose = page.getByLabel('Add a comment', { exact: true });
  await page.getByRole('button', { name: 'Mention a committee member', exact: true }).click();
  await expect(compose).toHaveValue('@');
  const picker = page.getByRole('listbox', { name: 'Mention a committee member', exact: true });
  await expect(picker.getByRole('option')).toHaveCount(2);
  await compose.press('ArrowDown'); await expect(picker.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await compose.press('ArrowUp'); await expect(picker.getByRole('option').nth(0)).toHaveAttribute('aria-selected', 'true');
  await compose.fill('Could @comm');
  await expect(picker.getByRole('option')).toHaveCount(1);
  await expect(picker).toContainText('committee@example.test');
  await noOverflow(page); await screenshot(page, 'mention-picker-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'mention-picker-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page); await page.setViewportSize({ width: 1440, height: 1024 });
  await compose.press('Escape'); await expect(picker).not.toBeVisible(); await expect(page.locator('#card-dialog')).toBeVisible();
  await compose.fill('Could @comm'); await expect(picker.getByRole('option')).toHaveCount(1); await compose.press('Enter');
  await expect(compose).toHaveValue('Could @committee@example.test ');
  await compose.fill('Could @committee@example.test help with setup?');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('#comment-list .comment-mention')).toHaveText('@Committee');
  expect((await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).unreadCount).toBe(1);
  await commentAction(page, 'Edit comment');
  const edit = page.getByLabel('Edit your comment', { exact: true });
  await edit.fill('Thanks @comm'); await expect(picker.getByRole('option')).toHaveCount(1);
  await edit.press('Tab'); await expect(edit).toHaveValue('Thanks @committee@example.test ');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#comment-list .comment-edited')).toHaveText('Edited');
  expect((await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).page).toHaveLength(1);
  await commentAction(page, 'Edit comment');
  await edit.fill('Thanks everyone!'); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('#comment-list .comment-mention')).toHaveCount(0);
  expect((await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).page).toEqual([]);
});

test('mention inbox persists unread state and opens the exact comment on an archived card', async ({ page, context }) => {
  const { admin, owner } = await fixture(context);
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Creative AI evening', description: 'Try something new and build together.' } });
  const target = await owner.mutation(api.planner.addComment, { id, text: '@committee@example.test could you check the room booking?', requestId: '00000000-0000-4000-8000-000000000001' });
  for (let i = 2; i < 37; i++) await owner.mutation(api.planner.addComment, { id, text: `Follow-up ${i}`, requestId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` });
  await owner.mutation(api.planner.addComment, { id, text: '@committee@example.test please review the plan.', requestId: '00000000-0000-4000-8000-000000000037' });
  await owner.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  await ready(page); await expect(page.locator('#notification-count')).toHaveText('2');
  await page.reload(); await expect(page.locator('#notification-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Notifications, 2 unread', exact: true }).click();
  await expect(page.locator('#notification-list .notification')).toHaveCount(2);
  await expect(page.locator('#notification-list .notification-unread')).toHaveCount(2);
  await noOverflow(page); await screenshot(page, 'notifications-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'notifications-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.notification-open').filter({ hasText: 'room booking?' }).click();
  await expect(page.locator('#notifications-dialog')).not.toBeVisible();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('#card-state')).toContainText('Archived');
  const mentioned = page.locator(`[data-comment="${target}"]`);
  await expect(mentioned).toBeVisible(); await expect(mentioned).toBeFocused();
  await expect(mentioned).toHaveClass(/comment-highlight/); await expect(mentioned).toContainText('check the room booking');
  await expect(page.locator('#notification-count')).toHaveText('1');
  await noOverflow(page); await screenshot(page, 'mention-jump-mobile');
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(page.locator('#notification-count')).not.toBeVisible();
  await expect(page.locator('#notification-list .notification-unread')).toHaveCount(0);
  expect((await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).unreadCount).toBe(0);
  await page.reload(); await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  await expect(page.locator('#notification-count')).not.toBeVisible();
});

test('inbox failures retry and revoked sessions clear notifications and mention suggestions', async ({ page, context }) => {
  const { t, owner } = await fixture(context);
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Private notification' } });
  await owner.mutation(api.planner.addComment, { id, text: '@committee@example.test private notification text', requestId: '00000000-0000-4000-8000-000000000001' });
  let fail = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST' || route.request().postDataJSON().path !== 'planner:notifications' || !fail) return route.fallback();
    return route.abort('failed');
  });
  await ready(page); await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.locator('#notifications-status')).toContainText('Could not load notifications');
  fail = false; await page.locator('#notifications-status').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#notification-count')).toHaveText('1');
  await expect(page.locator('#notification-list')).toContainText('private notification text');
  await t.run(async ctx => { const grant = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(grant!._id, { active: false }); });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#workspace')).not.toBeVisible(); await expect(page.locator('#notifications-dialog')).not.toBeVisible();
  await expect(page.locator('#notification-list')).toBeEmpty(); await expect(page.locator('#notification-count')).not.toBeVisible();
  await expect(page.locator('#open-notifications')).not.toBeVisible(); await expect(page.locator('.mention-picker')).not.toBeVisible();
  await expect(page.locator('.mention-picker')).toBeEmpty();
});

test('mentions and read receipts update in two open tabs without a poll, reload or focus change', async ({ page, context }) => {
  const f = await fixture(context);
  const id = await f.owner.mutation(api.planner.create, { activity: { ...activity, title: 'Live committee discussion' } });
  const requests: string[] = []; context.on('request', request => { if (request.url().endsWith('/api/query')) requests.push(request.postDataJSON()?.path); });
  const other = await context.newPage(); await ready(page); await ready(other);
  await expect.poll(f.readyConnections).toBe(2);
  const boardReads = requests.filter(path => path === 'planner:list').length;
  const commentId = await f.owner.mutation(api.planner.addComment, { id, text: '@committee@example.test could you help with setup?', requestId: '00000000-0000-4000-8000-000000000001' });
  await f.pushNotifications();
  await expect(page.locator('#notification-count')).toHaveText('1', { timeout: 4000 });
  await expect(other.locator('#notification-count')).toHaveText('1', { timeout: 4000 });
  expect(requests.filter(path => path === 'planner:list')).toHaveLength(boardReads);
  await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
  await other.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
  await f.owner.mutation(api.planner.editComment, { id: commentId, text: '@committee@example.test please check the room booking.', revision: 0 });
  await f.pushNotifications();
  await expect(page.locator('#notification-list')).toContainText('check the room booking', { timeout: 4000 });
  await expect(other.locator('#notification-list')).toContainText('check the room booking', { timeout: 4000 });
  await screenshot(page, 'notifications-realtime-desktop');
  await other.setViewportSize({ width: 390, height: 844 }); await noOverflow(other); await screenshot(other, 'notifications-realtime-mobile');
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click();
  await expect(page.locator('#notification-count')).not.toBeVisible(); await expect(other.locator('#notification-count')).not.toBeVisible({ timeout: 4000 });
  await expect(other.locator('.notification-unread')).toHaveCount(0);
  await f.owner.mutation(api.planner.editComment, { id: commentId, text: 'Mention removed', revision: 1 }); await f.pushNotifications();
  await expect(page.locator('#notification-list')).toBeEmpty(); await expect(other.locator('#notification-list')).toBeEmpty();
  expect(await page.evaluate(() => (window as unknown as { fixtureTokenOptions: { template: string; skipCache?: boolean }[] }).fixtureTokenOptions.some(options => options.template === 'convex' && options.skipCache === true))).toBe(true);
  await f.t.run(async ctx => { const grant = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(grant!._id, { active: false }); });
  await f.pushNotifications();
  await expect(page.locator('#workspace')).not.toBeVisible({ timeout: 4000 }); await expect(other.locator('#workspace')).not.toBeVisible({ timeout: 4000 });
  await expect(page.locator('#notification-list')).toBeEmpty(); await expect(other.locator('#notification-list')).toBeEmpty();
  await expect.poll(f.activeConnections).toBe(0);
});

test('real-time inbox reconnects, retries failed refreshes and keeps updates received during a pending load', async ({ page, context }) => {
  const f = await fixture(context);
  const id = await f.owner.mutation(api.planner.create, { activity: { ...activity, title: 'Connection recovery' } });
  const mention = (index: number) => f.owner.mutation(api.planner.addComment, { id, text: `@committee@example.test update ${index}`, requestId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` });
  await ready(page); await expect.poll(f.readyConnections).toBe(1);
  await f.disconnectNotifications(); await mention(1);
  await expect.poll(f.connections).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#notification-count')).toHaveText('1', { timeout: 5000 });
  let fail = true; let hold = false; let release: (() => Promise<void>) | undefined;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST' || route.request().postDataJSON().path !== 'planner:notifications') return route.fallback();
    if (fail) { fail = false; return route.abort('failed'); }
    if (!hold) return route.fallback(); hold = false;
    const value = await f.admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } });
    release = async () => { await route.fulfill({ json: { status: 'success', value: convexToJson(value), logLines: [] }, headers: { 'Access-Control-Allow-Origin': origin } }); };
  });
  await mention(2); await f.pushNotifications();
  await expect(page.locator('#notification-count')).toHaveText('2', { timeout: 6000 });
  hold = true; await mention(3); await f.pushNotifications(); await expect.poll(() => !!release).toBe(true);
  await mention(4); await f.pushNotifications(); await release!(); release = undefined;
  await expect(page.locator('#notification-count')).toHaveText('4', { timeout: 4000 });
  await expect(page.locator('#notification-list .notification')).toHaveCount(4);
  hold = true; await mention(5); await f.pushNotifications(); await expect.poll(() => !!release).toBe(true);
  // A session-ended event can arrive from Clerk without navigating away. The
  // previous inbox response must stay discarded even though its page survives.
  await page.evaluate(async () => { await (window as unknown as { Clerk: { signOut(): Promise<void> } }).Clerk.signOut(); });
  await expect(page.locator('#sign-in-email')).toBeVisible(); await expect.poll(f.activeConnections).toBe(0);
  const response = page.waitForResponse(response => response.url().endsWith('/api/query') && response.request().postDataJSON()?.path === 'planner:notifications');
  await release!(); await response; await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect(page.locator('#notification-list')).toBeEmpty(); await expect(page.locator('#notification-count')).not.toBeVisible();
  await expect(page.locator('#open-notifications')).not.toBeVisible();
});

test('real-time updates refresh edited and removed notifications on loaded older history pages', async ({ page, context }) => {
  const f = await fixture(context);
  const id = await f.owner.mutation(api.planner.create, { activity: { ...activity, title: 'Notification history' } });
  const older = await f.owner.mutation(api.planner.addComment, { id, text: '@committee@example.test older mention', requestId: '00000000-0000-4000-8000-000000000001' });
  for (let i = 2; i <= 35; i++) await f.owner.mutation(api.planner.addComment, { id, text: `@committee@example.test newer mention ${i}`, requestId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` });
  await f.admin.mutation(api.planner.markAllNotificationsRead, {});
  await ready(page); await expect.poll(f.readyConnections).toBe(1);
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.locator('#notification-list .notification')).toHaveCount(30);
  await page.getByRole('button', { name: 'Load earlier notifications', exact: true }).click();
  await expect(page.locator('#notification-list .notification')).toHaveCount(35);
  await f.owner.mutation(api.planner.editComment, { id: older, text: '@committee@example.test edited older history', revision: 0 }); await f.pushNotifications();
  await expect(page.locator('#notification-list')).toContainText('edited older history', { timeout: 4000 });
  await f.owner.mutation(api.planner.deleteComment, { id: older }); await f.pushNotifications();
  await expect(page.locator('#notification-list .notification')).toHaveCount(34, { timeout: 4000 });
  await expect(page.locator('#notification-list')).not.toContainText('older history');
  await expect(page.locator('#notification-count')).not.toBeVisible();
});
