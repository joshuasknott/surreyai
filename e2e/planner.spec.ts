import { expect, test, type BrowserContext, type Page, type Locator } from '@playwright/test';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { convexToJson, jsonToConvex, v } from 'convex/values';
import { internalAction } from '../convex/_generated/server';
import { mkdir } from 'node:fs/promises';
import { api } from '../convex/_generated/api';
import schema from '../convex/schema';
import type { Activity } from '../convex/plannerModel';
import { londonToday } from '../apps/ai/src/lib/programme';
import { HACK_CHECKLIST_TEMPLATE, HACK_CHECKLIST_GROUPS } from '../convex/plannerHackTemplate';

const origin = process.env.PLANNER_TEST_ORIGIN || 'http://127.0.0.1:4321';
// Browser fixtures exercise real planner functions; delivery is covered by the
// backend/relay tests and must never send live emails from browser fixtures.
const modules = { './_generated/server.js': () => import('../convex/_generated/server.js'), './planner.ts': () => import('../convex/planner'), './plannerSignIn.ts': () => import('../convex/plannerSignIn'), './users.ts': () => import('../convex/users'), './http.ts': () => import('../convex/http'), './plannerFiles.ts': () => import('../convex/plannerFiles'), './plannerEmail.ts': async () => ({ deliver: internalAction({ args: { id: v.id('plannerNotifications') }, returns: v.null(), handler: async () => null }) }) };
const gateSecret = 'fixture-only-sign-in-gateway-secret';
const future = new Date(`${londonToday()}T12:00:00Z`); future.setUTCDate(future.getUTCDate() + 7);
const activity: Activity = { title: 'Build your first AI agent', kind: 'event', category: 'Workshop', description: 'A hands-on introduction. No experience needed.', date: future.toISOString().slice(0, 10), startTime: '18:00', endTime: '20:00', location: 'Stag Hill campus', registrationUrl: 'https://example.test/book' };

/** Browser transport uses Clerk fixtures; the actual Convex functions run in convex-test.
 * Nothing is inserted into a hosted database and no production auth bypass exists. */
async function fixture(context: BrowserContext, mode: 'admin' | 'owner' | 'outsider' | 'signed-out' = 'admin') {
  process.env.PLANNER_SIGN_IN_SECRET = gateSecret;
  process.env.CONVEX_SITE_URL = 'https://fixture.convex.site';
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
  await context.route('https://fixture.convex.site/planner/files**', async route => {
    const request = route.request(); const url = new URL(request.url()); const bytes = request.postDataBuffer();
    const response = await actor.fetch(`${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), ...(bytes ? { body: new Uint8Array(bytes) } : {}) });
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
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

test('delete confirmation survives an archive API failure and can be retried', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const title = 'Delete retry card';
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title }, internalOnly: true, stage: 'planning' });
  let failArchive = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/mutation$/, async route => {
    const request = route.request();
    if (failArchive && request.method() === 'POST' && request.postDataJSON()?.path === 'planner:move') {
      const args = jsonToConvex(request.postDataJSON().args[0]) as { id: string; stage?: string };
      if (args.id === id && args.stage === 'archived') {
        failArchive = false;
        await route.fulfill({ json: { status: 'error', errorMessage: 'Archive temporarily unavailable' }, headers: { 'Access-Control-Allow-Origin': origin } });
        return;
      }
    }
    await route.fallback();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page); await editCard(page, title);
  await page.getByRole('button', { name: 'Delete card', exact: true }).click();
  const deleteDialog = page.locator('#delete-card-dialog');
  await deleteDialog.getByRole('button', { name: 'Yes, delete', exact: true }).click();
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText('Archive temporarily unavailable');
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete card', exact: true })).toBeVisible();
  await expect(deleteDialog.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();

  await deleteDialog.getByRole('button', { name: 'Yes, delete', exact: true }).click();
  await expect(deleteDialog).not.toBeVisible();
  await expect(page.locator('#card-dialog')).not.toBeVisible();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('archived');
});

async function ready(page: Page) { await page.goto(`${origin}/committee/planner`); await expect(page.locator('#workspace')).toBeVisible(); }

for (const width of [1440, 390]) test(`mention email preference persists and remains usable at ${width}px`, async ({ page, context }) => {
  const f = await fixture(context);
  await page.setViewportSize({ width, height: 900 }); await ready(page);
  await page.locator('#open-notifications').click();
  const toggle = page.getByRole('checkbox', { name: 'Email me when I’m mentioned' });
  await expect(toggle).toBeEnabled(); await expect(toggle).toBeChecked();
  await toggle.uncheck(); await expect(page.locator('#mention-email-status')).toContainText('emails are off');
  expect(await f.admin.query(api.planner.emailPreference, {})).toBe(false);
  await page.getByRole('button', { name: 'Close notifications', exact: true }).click();
  await page.reload(); await expect(page.locator('#workspace')).toBeVisible(); await page.locator('#open-notifications').click();
  await expect(toggle).toBeEnabled(); await expect(toggle).not.toBeChecked(); await noOverflow(page);
  await screenshot(page, `mention-email-${width}`);
  await toggle.check(); await expect(page.locator('#mention-email-status')).toContainText('emails are on');
});

test('email link survives sign-in and opens an older comment on an archived card', async ({ page, context }) => {
  const f = await fixture(context, 'signed-out');
  const id = await f.owner.mutation(api.planner.create, { activity: { ...activity, title: 'Email link target' } });
  const commentId = await f.owner.mutation(api.planner.addComment, { id, text: '@committee@example.test please review this', requestId: '00000000-0000-4000-8000-000000000001' });
  for (let i = 2; i < 35; i++) await f.owner.mutation(api.planner.addComment, { id, text: `Later discussion ${i}`, requestId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` });
  await f.owner.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  await page.goto(`${origin}/committee/planner?item=${id}&comment=${commentId}`);
  await page.locator('#sign-in-email').fill('committee@example.test'); await page.locator('#send-code').click();
  await page.locator('#sign-in-code').fill('123456'); await page.locator('#verify-code').click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('.comment-highlight')).toContainText('please review this');
  await expect(page).toHaveURL(`${origin}/committee/planner`);
  await screenshot(page, 'mention-email-linked-comment');
});
async function navigate(page: Page, name: string) {
  if ((page.viewportSize()?.width || 1440) <= 720 && !await page.locator('body').evaluate(body => body.classList.contains('sidebar-mobile-open'))) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  const role = ['Board', 'Events', 'Outreach', 'Surrey AI Hack 2027', 'Calendar', 'Archive'].includes(name) ? 'link' : 'button';
  await page.getByRole(role, { name: name === 'Board' ? 'Events' : name, exact: true }).click();
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
  if ((page.viewportSize()?.width || 1440) <= 720 && await page.locator('#board').isVisible()) {
    const column = page.locator('#board .board-column').filter({ has: page.getByRole('button', { name: `View ${title}`, exact: true, includeHidden: true }) });
    const stage = await column.getAttribute('data-stage');
    await page.locator(`#stage-tab-${stage}`).click();
  }
  await page.getByRole('button', { name: `View ${title}`, exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('#card-dialog [name=title]')).toHaveValue(title);
}
async function closeActivity(page: Page) {
  if (await page.locator('#item-dialog').isVisible()) await page.getByRole('button', { name: 'Close activity', exact: true }).click();
  if (await page.locator('#card-dialog').isVisible()) await page.getByRole('button', { name: 'Close card', exact: true }).click();
}
async function saveActivity(page: Page, name: string) {
  if (await page.locator('#card-dialog').isVisible()) {
    await page.locator('#item-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  } else { await page.getByRole('button', { name, exact: true }).click(); await expect(page.locator('#item-message')).toContainText('Draft saved'); }
}
async function cardAction(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByLabel('Card options', { exact: true }).click();
  await button.click();
}

for (const width of [1440, 390]) {
  test(`card panels dismiss outside without losing edits at ${width}px`, async ({ page, context }) => {
    const { admin } = await fixture(context);
    const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Dismissible card panels' }, stage: 'ready' });
    await page.setViewportSize({ width, height: 900 }); await ready(page); await editCard(page, 'Dismissible card panels');
    const outsidePanel = page.locator('.card-preview-top');
    const dismissPanel = () => outsidePanel.click({ position: { x: 3, y: 3 } });
    await page.getByLabel('Choose teams', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Events & Socials', exact: true }).check();
    await expect(page.locator('#team-picker-menu')).toHaveJSProperty('open', true);
    await screenshot(page, `dismiss-teams-${width}`);
    await dismissPanel(); await expect(page.locator('#team-picker-menu')).toHaveJSProperty('open', false);
    await expect(page.locator('#card-dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
    await page.getByLabel('Link', { exact: true }).fill('https://example.test/brief');
    await page.getByLabel('Name', { exact: true }).fill('Workshop brief');
    await expect(page.locator('#attachment-editor')).toBeVisible();
    await screenshot(page, `dismiss-attachments-${width}`);
    await dismissPanel(); await expect(page.locator('#attachment-editor')).toBeHidden();
    await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
    await expect(page.getByLabel('Link', { exact: true })).toHaveValue('https://example.test/brief');
    await page.keyboard.press('Escape');
    await expect(page.locator('#attachment-editor')).toBeHidden(); await expect(page.locator('#add-attachment')).toBeFocused();
    await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
    await page.getByRole('button', { name: 'Add link', exact: true }).click();
    await expect(page.locator('#attachment-list')).toContainText('Workshop brief');

    await page.locator('#activity-details > summary').click();
    await page.getByLabel('Room or location', { exact: true }).fill('Lecture Theatre A');
    await expect(page.locator('#activity-details')).toHaveJSProperty('open', true);
    await dismissPanel(); await expect(page.locator('#activity-details')).toHaveJSProperty('open', false);
    await cardAction(page, 'Set waiting status');
    await page.getByLabel('Waiting on (optional)', { exact: true }).fill('Speaker confirmation');
    await page.getByLabel('Notes', { exact: true }).fill('Keep these private notes');
    await dismissPanel();
    await expect(page.locator('#private-options')).toHaveJSProperty('open', false);
    await expect(page.locator('#waiting-details')).toHaveJSProperty('open', false);
    await cardAction(page, 'Notes & collaborators');
    await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep these private notes');
    await page.keyboard.press('Escape'); await expect(page.getByLabel('Card options', { exact: true })).toBeFocused();
    await cardAction(page, 'Review website details');
    await page.locator('#publication-help').click(); await expect(page.locator('#editor-preview')).toBeVisible();
    await dismissPanel(); await expect(page.locator('#editor-preview')).toBeHidden();
    await page.getByLabel('Card options', { exact: true }).click();
    await dismissPanel(); await expect(page.locator('#card-actions')).toHaveJSProperty('open', false);
    await cardAction(page, 'Worked on by'); await expect(page.locator('#card-people-dialog')).toBeVisible();
    await page.mouse.click(2, 2); await expect(page.locator('#card-people-dialog')).toBeHidden();
    await expect(page.locator('#card-dialog')).toBeVisible();

    // A drag which starts inside the dialog must not count as a backdrop click.
    const header = await outsidePanel.boundingBox(); if (!header) throw new Error('Card header missing');
    await page.mouse.move(header.x + 5, header.y + 5); await page.mouse.down(); await page.mouse.move(2, 2); await page.mouse.up();
    await expect(page.locator('#card-dialog')).toBeVisible();
    await page.getByLabel('Title', { exact: true }).fill('Saved by outside dismissal');
    // On mobile the card dialog intentionally fills the viewport, so (2, 2)
    // is inside the dialog. Keep the backdrop assertion on desktop and use
    // the accessible close control for the full-viewport layout.
    if (width <= 720) await page.getByRole('button', { name: 'Close card', exact: true }).click();
    else await page.mouse.click(2, 2);
    await expect(page.locator('#card-dialog')).toBeHidden();
    const saved = await admin.query(api.planner.get, { id });
    expect(saved).toMatchObject({ title: 'Saved by outside dismissal', teams: ['events'], location: 'Lecture Theatre A', waitingOn: 'Speaker confirmation', notes: 'Keep these private notes', attachments: [{ name: 'Workshop brief', url: 'https://example.test/brief' }] });
    await noOverflow(page);
  });

  test(`description grows and shrinks with content within a height limit at ${width}px`, async ({ page, context }) => {
    const { admin } = await fixture(context);
    const medium = ['AI Careers Launchpad', 'Explore roles in AI.', 'Invite Surrey alumni.', 'Share portfolio ideas.', 'Run a CV session.', 'Collect useful links.'].join('\n');
    const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Adaptive description', description: medium }, internalOnly: true });
    await page.setViewportSize({ width, height: 900 }); await ready(page); await editCard(page, 'Adaptive description');
    const description = page.getByLabel('Description', { exact: true });
    const size = () => description.evaluate(node => ({ height: node.getBoundingClientRect().height, scroll: node.scrollHeight, client: node.clientHeight }));
    const opened = await size(); expect(opened.scroll - opened.client).toBeLessThanOrEqual(1); expect(opened.height).toBeGreaterThan(100);
    await screenshot(page, `adaptive-description-${width}`);
    await description.fill('One short idea.'); const short = await size(); expect(short.height).toBeLessThan(opened.height);
    await description.fill(Array.from({ length: 60 }, (_, i) => `Idea ${i + 1}: make AI accessible to Surrey students.`).join('\n'));
    const long = await size(); expect(long.height).toBeLessThanOrEqual(width <= 720 ? 200 : 280); expect(long.scroll).toBeGreaterThan(long.client);
    await description.evaluate(node => { node.scrollTop = node.scrollHeight; }); expect(await description.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await screenshot(page, `adaptive-description-capped-${width}`);
    await description.fill(medium); const restored = await size(); expect(restored.height).toBeLessThan(long.height); expect(restored.scroll - restored.client).toBeLessThanOrEqual(1);
    // The mobile dialog covers the entire viewport; close it through its
    // control while retaining the desktop backdrop dismissal coverage.
    if (width <= 720) await page.getByRole('button', { name: 'Close card', exact: true }).click();
    else await page.mouse.click(2, 2);
    await expect(page.locator('#card-dialog')).toBeHidden();
    expect((await admin.query(api.planner.get, { id }))?.description).toBe(medium);
    await editCard(page, 'Adaptive description'); expect((await size()).scroll - (await size()).client).toBeLessThanOrEqual(1);
    await noOverflow(page);
  });
}

test('outside card dismissal keeps failed saves and active uploads open', async ({ page, context }) => {
  const { admin } = await fixture(context);
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Protected outside dismissal' }, internalOnly: true });
  await ready(page); await editCard(page, 'Protected outside dismissal');
  let failSave = true;
  await context.route('**/api/mutation', async route => {
    if (failSave && route.request().method() === 'POST' && route.request().postDataJSON().path === 'planner:save') return route.fulfill({ json: { status: 'error', errorMessage: 'Connection interrupted. Please retry.' }, headers: { 'Access-Control-Allow-Origin': origin } });
    await route.fallback();
  });
  await page.getByLabel('Description', { exact: true }).fill('Do not lose this draft.');
  await page.mouse.click(2, 2);
  await expect(page.locator('#card-save-status')).toContainText('Connection interrupted'); await expect(page.locator('#card-dialog')).toBeVisible();
  failSave = false; await page.locator('#retry-card-save').click(); await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  let releaseUpload!: () => void; const uploadGate = new Promise<void>(resolve => { releaseUpload = resolve; }); let uploading = false;
  await context.route('https://fixture.convex.site/planner/files**', async route => {
    if (route.request().method() === 'POST') { uploading = true; await uploadGate; }
    await route.fallback();
  });
  await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
  await page.locator('#attachment-file').setInputFiles({ name: 'Brief.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nbrief\n%%EOF') });
  await expect.poll(() => uploading).toBe(true);
  try {
    await page.mouse.click(2, 2); await expect(page.locator('#card-dialog')).toBeVisible();
    await expect(page.locator('#file-upload-status')).toContainText('Upload in progress');
  } finally { releaseUpload(); }
  await expect(page.locator('.file-attachment-row')).toHaveCount(1);
  await expect(page.locator('#cancel-file-upload')).toBeHidden();
  await page.mouse.click(2, 2); await expect(page.locator('#card-dialog')).toBeHidden();
});

test('compact board keeps six cards per list visible and retains full details when opened', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const titles = [
    'Computer Vision Workshop with Neurotech', 'Draft the NVIDIA workshop partnership proposal',
    'Confirm speakers and rooms for the autumn programme', 'Plan a joint society social and beginner-friendly activities',
    'Prepare the workshop slides, starter project and registration details', 'Share the latest AI internships and graduate opportunities',
  ];
  let firstId = '';
  for (const stage of ['ideas', 'planning', 'ready'] as const) {
    for (const [index, title] of titles.entries()) {
      const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: `${title} · ${stage}` }, stage, teams: ['industry', 'learning'], lead: 'Ibrahim Haque', waitingOn: index % 2 ? '' : 'Room confirmation', tasks: [{ text: 'Confirm the programme', done: true }, { text: 'Share the full workshop outline', done: false }] });
      if (stage === 'ideas' && index === 0) firstId = id;
      if (stage === 'ready' && index === 0) await admin.mutation(api.planner.publish, { id, revision: 1 });
    }
  }
  await page.setViewportSize({ width: 1366, height: 900 }); await ready(page);
  await expect(page.locator('#board .planner-card')).toHaveCount(18);
  await expect(page.locator('#board .card-created-by, #board .card-next-action, #board .card-unassigned')).toHaveCount(0);
  for (const width of [1366, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const column of await page.locator('#board .board-column').all()) {
      const cards = column.locator('.planner-card');
      await expect(cards).toHaveCount(6); await expect(cards.last()).toBeInViewport({ ratio: 1 });
      const bounds = await cards.first().boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(300); expect(bounds?.height).toBeLessThanOrEqual(104);
    }
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 1366, height: 900 }); await screenshot(page, 'compact-six-per-list-desktop');
  const first = page.locator(`.planner-card[data-item="${firstId}"]`);
  await expect(first.locator('.card-open')).toHaveAttribute('aria-label', `View ${titles[0]} · ideas`);
  await expect(first.locator('.card-open')).toHaveAttribute('title', `${titles[0]} · ideas`);
  await expect(first.locator('.card-open')).toHaveAttribute('aria-description', /Industry & Partnerships.*Workshops & Learning.*Room confirmation.*Ibrahim Haque/);
  const nameBounds = await first.locator('.card-lead-name').boundingBox();
  expect(nameBounds?.width).toBeLessThanOrEqual(1); expect(nameBounds?.height).toBeLessThanOrEqual(1);
  const menu = first.locator('.card-menu > summary');
  const menuBounds = await menu.boundingBox(); expect(menuBounds?.width).toBeGreaterThanOrEqual(44); expect(menuBounds?.height).toBeGreaterThanOrEqual(44);
  await menu.focus(); await page.keyboard.press('Enter'); await expect(first.locator('.card-menu')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape'); await expect(menu).toBeFocused();
  await first.locator('.card-open').focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(`${titles[0]} · ideas`);
  await expect(page.getByRole('textbox', { name: 'Checklist item 2', exact: true })).toHaveValue('Share the full workshop outline');
  await expect(page.locator('#card-created-by')).toContainText('Committee');
  await closeActivity(page);
  for (const width of [834, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    if (width <= 720) {
      await page.getByRole('tab', { name: 'In progress 6', exact: true }).click();
      const tabs = await page.locator('#board-stage-tabs').boundingBox();
      const lastTab = await page.locator('#board-stage-tabs .board-stage-tab').last().boundingBox();
      expect((tabs!.x + tabs!.width) - (lastTab!.x + lastTab!.width)).toBeLessThanOrEqual(20);
      expect(await page.locator('#board').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    }
    for (const preview of await page.locator('.board-column:visible .card-open').all()) expect(await preview.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await noOverflow(page);
    if (width === 390) await screenshot(page, 'compact-six-per-list-mobile');
  }
});

test('board home combines owner, team, due and waiting filters and keeps cards modal on mobile', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await owner.mutation(api.planner.setDisplayName, { name: 'Josh' });
  const workshop = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Computer Vision Workshop w/ Neurotech' }, internalOnly: true, stage: 'planning', teams: ['learning'], lead: 'Ibrahim Haque', tasks: [{ text: 'Confirm workshop topic', done: true }, { text: 'Review workshop outline', done: false }] });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Inter-society social', date: '' }, internalOnly: true, teams: ['events'], lead: 'Fatima Waheed' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Sponsorship outreach', date: '' }, internalOnly: true, teams: ['industry'], lead: 'Ibrahim Haque' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Equipment request' }, internalOnly: true, stage: 'planning', lead: 'Vinayak Manojkumar Vadhera', waitingOn: 'Budget approval' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Instagram artwork', date: londonToday() }, internalOnly: true, stage: 'planning', teams: ['events'], lead: 'Joshua Knott' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Welcome week handover', date: londonToday() }, internalOnly: true, stage: 'done', lead: 'Joshua Knott' });
  const event = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI x Neurotech Meet & Greet' }, stage: 'ready', teams: ['events'], lead: 'Poppy Holmes' });
  await admin.mutation(api.planner.publish, { id: event, revision: 1 });
  await ready(page);
  await expect(page.locator('#board')).toBeVisible(); await expect(page.locator('#board .planner-card')).toHaveCount(6);
  const workshopCard = page.locator('.planner-card').filter({ hasText: 'Computer Vision Workshop w/ Neurotech' });
  await expect(workshopCard.locator('.card-lead')).toHaveAttribute('title', 'Lead: Ibrahim Haque');
  await expect(workshopCard.locator('.card-lead .person-avatar')).toHaveText('IH');
  await expect(workshopCard.locator('.card-stat')).toHaveText('1/2');
  await expect(workshopCard.locator('.avatar-group')).toHaveCount(0);
  await screenshot(page, 'board-first-desktop');
  await page.getByRole('button', { name: 'My work', exact: true }).click();
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await expect(workshopCard).toHaveCount(0); // Creating a card does not make you its lead.
  await page.getByLabel('Filter by team', { exact: true }).selectOption('learning');
  await expect(page.locator('#board .planner-card')).toHaveCount(0);
  await expect(page.locator('#board')).toContainText('No cards assigned to you here.');
  await page.getByLabel('Filter by team', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  await page.getByLabel('More board filters', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Due this week', exact: true }).check();
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await expect(page.locator('#board')).toContainText('Instagram artwork');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Waiting on someone', exact: true }).check();
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await expect(page.locator('#board .card-waiting')).toHaveAttribute('title', 'Waiting: Budget approval');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('More board filters', { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'In progress 3', exact: true }).click();
  await expect(page.locator('#board .board-column:visible')).toHaveCount(1);
  await screenshot(page, 'board-first-mobile'); await noOverflow(page);
  expect(await page.locator('#board').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await editCard(page, 'Computer Vision Workshop w/ Neurotech');
  await expect(page.getByRole('textbox', { name: 'Checklist item 2', exact: true })).toHaveValue('Review workshop outline');
  expect(await page.locator('#card-dialog').evaluate(node => node.matches(':modal'))).toBe(true);
  expect(await page.getByLabel('Title', { exact: true }).evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
  await screenshot(page, 'board-first-mobile-modal');
  await cardAction(page, 'Set waiting status');
  await page.getByLabel('Waiting on (optional)', { exact: true }).fill('Speaker confirmation');
  await expect.poll(async () => (await owner.query(api.planner.get, { id: workshop }))?.waitingOn).toBe('Speaker confirmation');
  await closeActivity(page);
  await expect(workshopCard.locator('.card-waiting')).toHaveAttribute('title', 'Waiting: Speaker confirmation');
  await page.reload(); await page.getByRole('tab', { name: 'In progress 3', exact: true }).click();
  await expect(workshopCard.locator('.card-waiting')).toHaveAttribute('title', 'Waiting: Speaker confirmation');
  await page.getByRole('button', { name: 'My work', exact: true }).click();
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('planning');
  await expect(page.getByRole('combobox', { name: 'Lead', exact: true })).toHaveValue('Joshua Knott');
  await closeActivity(page);
  await page.getByRole('button', { name: 'Everyone', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await expect(page.getByRole('tab', { name: 'In progress 3', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 1024 });
  await expect(page.locator('#board .board-column:visible')).toHaveCount(3);
  await noOverflow(page); expect(errors).toEqual([]);
});

for (const width of [1440, 390]) test(`card edits save with Enter and on blur without a save button at ${width}px`, async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Save edits as you go' }, internalOnly: true });
  await page.clock.install();
  await page.setViewportSize({ width, height: 900 }); await ready(page); await editCard(page, 'Save edits as you go');
  // Pause debounce timers so Enter and blur must each flush the save themselves.
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
  const description = page.getByLabel('Description', { exact: true });
  await description.fill('Confirm the workshop room.');
  await description.press('Home'); await description.press('Enter');
  await expect(description).toHaveValue('Confirm the workshop room.');
  await expect(description).toBeFocused();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.description).toBe('Confirm the workshop room.');
  await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  await description.press('End'); await description.press('Shift+Enter'); await description.pressSequentially('Then share the booking link.');
  await expect(description).toHaveValue('Confirm the workshop room.\nThen share the booking link.');
  // Composing Enter and modified Enter must retain native text-editing behavior.
  await description.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await description.dispatchEvent('keydown', { key: 'Enter', ctrlKey: true });
  expect((await admin.query(api.planner.get, { id }))?.description).toBe('Confirm the workshop room.');
  await description.press('Tab');
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.description).toBe('Confirm the workshop room.\nThen share the booking link.');
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Saved without a button'); await title.press('Enter');
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.title).toBe('Saved without a button');
  await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  await page.getByLabel('Card options', { exact: true }).click();
  await expect(page.getByRole('button', { name: /^Save (card|idea|draft|changes)$/, exact: true })).toHaveCount(0);
  await page.getByLabel('Card options', { exact: true }).click();
  await noOverflow(page); await screenshot(page, `enter-autosave-${width}`);
  await page.clock.resume();
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.reload(); await expect(page.locator('#workspace')).toBeVisible(); await editCard(page, 'Saved without a button');
  await expect(description).toHaveValue('Confirm the workshop room.\nThen share the booking link.');
});

test('compact cards autosave in place, retain newer edits and keep discussion beside the fields', async ({ page, context }) => {
  const { admin, owner, t } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'NVIDIA workshop partnership', description: 'Explore a practical NVIDIA workshop for Surrey students. Confirm a speaker, agree the format and outline what support we can offer.' }, internalOnly: true, stage: 'planning', teams: ['industry', 'learning'], lead: 'Ibrahim Haque', tasks: [{ text: 'Draft the proposal', done: true }, { text: 'Find the right contact', done: false }, { text: 'Agree workshop format', done: false }], attachments: [{ name: 'Partnership proposal.pdf', url: 'https://example.test/proposal.pdf' }] });
  await admin.mutation(api.planner.addComment, { id, text: 'Happy to help with the sponsor proposal.', requestId: '00000000-0000-4000-8000-000000000001' });
  await owner.mutation(api.planner.addComment, { id, text: 'We can shape the workshop around practical GPU skills.', requestId: '00000000-0000-4000-8000-000000000002' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 1000 }); await ready(page); await editCard(page, 'NVIDIA workshop partnership');
  await expect(page.locator('#comment-list .comment')).toHaveCount(2);
  await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  await page.locator('.card-header-context > span').click();
  await screenshot(page, 'compact-card-desktop');
  expect(await page.locator('#card-dialog').evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
  expect(await page.locator('#card-editor-slot').evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('textbox', { name: 'Checklist item 3', exact: true })).toBeInViewport();
  await screenshot(page, 'compact-card-desktop');
  let release: (() => void) | undefined; let intercepted = false;
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.locator('#card-editor-slot').evaluate(node => node.scrollHeight - node.clientHeight)).toBeLessThanOrEqual(1);
  await screenshot(page, 'compact-card-laptop');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await context.route('**/api/mutation', async route => {
    if (route.request().method() === 'POST' && route.request().postDataJSON().path === 'planner:save' && !intercepted) { intercepted = true; await new Promise<void>(resolve => { release = resolve; }); }
    await route.fallback();
  });
  await page.getByLabel('Description', { exact: true }).fill('First edit while saving.');
  await expect.poll(() => intercepted).toBe(true);
  await page.getByLabel('Description', { exact: true }).fill('The latest edit must survive a save already in progress.');
  release?.();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.description).toBe('The latest edit must survive a save already in progress.');
  await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  await page.getByRole('checkbox', { name: 'Complete Find the right contact', exact: true }).check();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.tasks[1].done).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await expect(page.getByLabel('Title', { exact: true })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: 'Checklist item 3', exact: true })).toBeInViewport();
  await screenshot(page, 'compact-card-mobile');
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Post comment', exact: true })).toBeInViewport();
  await screenshot(page, 'compact-discussion-mobile');
  await page.getByRole('tab', { name: 'Card', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Saved when closing');
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await expect(page.locator('#card-dialog')).not.toBeVisible();
  expect((await admin.query(api.planner.get, { id }))?.title).toBe('Saved when closing');
  expect(await t.query(api.planner.listPublished, {})).toEqual([]); expect(errors).toEqual([]);
});

test('committee members upload PDFs and images alongside links and can download or remove them', async ({ page, context }) => {
  const { owner } = await fixture(context, 'owner');
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Files and links' }, internalOnly: true, attachments: [{ name: 'Reference link', url: 'https://example.test/reference' }] });
  await page.setViewportSize({ width: 1600, height: 1000 }); await ready(page); await editCard(page, 'Files and links');
  await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
  await screenshot(page, 'attachment-picker-desktop');
  const pdf = Buffer.from('%PDF-1.4\nprivate committee document\n%%EOF');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jq1sAAAAASUVORK5CYII=', 'base64');
  await page.locator('#attachment-file').setInputFiles([{ name: 'Speaker brief.pdf', mimeType: 'application/pdf', buffer: pdf }, { name: 'Workshop photo.png', mimeType: 'image/png', buffer: png }]);
  await expect(page.locator('#file-upload-status')).toHaveText('Files attached');
  await expect(page.locator('.file-attachment-row')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /Reference link/ })).toBeVisible();
  await screenshot(page, 'uploaded-files-desktop');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Speaker brief.pdf', exact: true }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toBe('Speaker brief.pdf');
  expect((await owner.query(api.planner.listFiles, { id })).map(file => file.name)).toEqual(['Speaker brief.pdf', 'Workshop photo.png']);
  await page.setViewportSize({ width: 390, height: 844 }); await screenshot(page, 'uploaded-files-mobile'); await noOverflow(page);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove file: Workshop photo.png', exact: true }).click();
  await expect(page.locator('.file-attachment-row')).toHaveCount(1);
  await closeActivity(page); await page.reload(); await editCard(page, 'Files and links');
  await expect(page.getByRole('button', { name: 'Download Speaker brief.pdf', exact: true })).toBeVisible();
});

test('planner display names update existing activity and other open tabs without changing public user data', async ({ page, context }) => {
  const { owner, t } = await fixture(context, 'owner');
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Display name card' }, internalOnly: true, lead: 'Joshua Knott' });
  await owner.mutation(api.planner.addComment, { id, text: 'A comment written before the name change.', requestId: '00000000-0000-4000-8000-000000000001' });
  await ready(page); const other = await context.newPage(); await ready(other); await editCard(other, 'Display name card');
  await page.getByRole('button', { name: 'Edit your planner name', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Josh'); await screenshot(page, 'planner-profile-desktop');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.locator('#planner-profile-dialog')).not.toBeVisible(); await expect(page.locator('#account-name')).toHaveText('Josh');
  await expect(other.locator('#account-name')).toHaveText('Josh');
  await expect(other.locator('#comment-list .comment-heading strong')).toHaveText('Josh');
  await expect(other.locator('#comment-list .person-avatar')).toHaveText('J');
  await expect(other.getByRole('combobox', { name: 'Lead', exact: true }).locator('option:checked')).toHaveText('Josh');
  await page.getByRole('button', { name: 'View committee members', exact: true }).click();
  await expect(page.locator('#team-members')).toContainText('Josh'); await page.getByRole('button', { name: 'Close members', exact: true }).click();
  expect((await t.run(ctx => ctx.db.query('users').withIndex('by_email', q => q.eq('email', 'joshhknott@gmail.com')).unique()))?.name).toBe('Joshua Knott');
  await page.reload(); await expect(page.locator('#account-name')).toHaveText('Josh');
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Edit your planner name', exact: true }).click();
  await screenshot(page, 'planner-profile-mobile'); await noOverflow(page);
});

test('failed file uploads can be retried without losing the selected file or creating duplicates', async ({ page, context }) => {
  const { owner } = await fixture(context, 'owner');
  const id = await owner.mutation(api.planner.create, { activity: { ...activity, title: 'Retry file upload' }, internalOnly: true });
  await ready(page); await editCard(page, 'Retry file upload');
  let fail = true;
  await context.route('https://fixture.convex.site/planner/files**', async route => {
    if (fail && route.request().method() === 'POST') return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': origin }, json: { error: 'Upload connection interrupted' } });
    await route.fallback();
  });
  await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
  await page.locator('#attachment-file').setInputFiles({ name: 'Retry.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nretry\n%%EOF') });
  await expect(page.locator('#file-upload-status')).toHaveText('Upload connection interrupted');
  fail = false; await page.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download Retry.pdf', exact: true })).toBeVisible();
  expect(await owner.query(api.planner.listFiles, { id })).toHaveLength(1);
});

test('autosave failures retain drafts, retry safely and leave the published version unchanged', async ({ page, context }) => {
  const { admin, t } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
  await admin.mutation(api.planner.publish, { id, revision: 1 });
  await ready(page); await editCard(page, activity.title);
  let fail = true;
  await context.route('**/api/mutation', async route => {
    if (fail && route.request().method() === 'POST' && route.request().postDataJSON().path === 'planner:save') return route.fulfill({ json: { status: 'error', errorMessage: 'Connection interrupted. Please retry.' }, headers: { 'Access-Control-Allow-Origin': origin } });
    await route.fallback();
  });
  await page.getByLabel('Description', { exact: true }).fill('A private draft with more detail.');
  await expect(page.locator('#card-save-status')).toContainText('Connection interrupted');
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('A private draft with more detail.');
  fail = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#card-save-status')).toHaveText('All changes saved');
  expect((await admin.query(api.planner.get, { id }))?.description).toBe('A private draft with more detail.');
  expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
  await page.getByRole('button', { name: 'Add attachment', exact: true }).click();
  await page.getByLabel('Link', { exact: true }).fill('https://example.test/brief.pdf');
  await page.getByLabel('Name', { exact: true }).fill('Workshop brief.pdf');
  await page.getByRole('button', { name: 'Add link', exact: true }).click();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.attachments?.[0]?.name).toBe('Workshop brief.pdf');
  await cardAction(page, 'Notes & collaborators');
  await page.getByLabel('Notes', { exact: true }).fill('Private speaker notes');
  await page.getByRole('button', { name: 'Close private details', exact: true }).click();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.notes).toBe('Private speaker notes');
  await page.locator('#activity-details > summary').click();
  await expect(page.getByLabel('Room or location', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close activity details', exact: true }).click();
  await closeActivity(page);
});

test('team board supports internal work, shared filters, members and collapsible navigation', async ({ page, context }) => {
  const { admin, t } = await fixture(context, 'owner');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const samples = [
    ['Joint society bar crawl', 'events', 'ideas'], ['Approach NVIDIA for sponsorship', 'industry', 'ideas'],
    ['Weekend AI build challenge', 'projects', 'ideas'], ['AI internship roundup', 'careers', 'ideas'],
    ['Intro to Python workshop', 'learning', 'planning'], ['Autumn sponsor deck', 'industry', 'planning'],
    ['Hackathon project shortlist', 'projects', 'planning'], ['Workshop announcement post', 'learning', 'ready'],
    ['Welcome social', 'events', 'ready'], ['Share graduate opportunities', 'careers', 'ready'],
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
  await page.getByLabel('Filter by team', { exact: true }).selectOption('industry');
  await expect(page.locator('#board .planner-card')).toHaveCount(2);
  await expect(page.locator('#board .team-badge')).toHaveCount(0);
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  await page.getByLabel('Choose teams', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Industry & Partnerships', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Events & Socials', exact: true }).check();
  await page.getByRole('combobox', { name: 'Lead', exact: true }).selectOption('Ibrahim Haque');
  await page.locator('#team-picker-summary').click();
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
  await page.getByLabel('Filter by team', { exact: true }).selectOption('industry');
  await expect(page.locator('#board .planner-card')).toHaveCount(3);
  await page.getByLabel('Filter by team', { exact: true }).selectOption('events');
  await expect(page.locator('#board')).toContainText('Draft sponsor email');
  await page.getByRole('button', { name: 'View Draft sponsor email', exact: true }).click();
  await expect(page.locator('#card-dialog').getByRole('combobox', { name: 'Lead', exact: true })).toHaveValue('Ibrahim Haque');
  await page.getByLabel('Choose teams', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Industry & Partnerships', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Events & Socials', exact: true })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Lead', exact: true })).toHaveValue('Ibrahim Haque');
  await page.locator('#team-picker-summary').click();
  await closeActivity(page);
  await page.getByLabel('Filter by team', { exact: true }).selectOption('industry');
  const card = page.locator('.planner-card').filter({ hasText: 'Draft sponsor email' });
  await card.locator('summary').click(); await card.getByRole('button', { name: 'Move to In progress', exact: true }).click();
  await expect(page.locator('.board-column[data-stage=planning]')).toContainText('Draft sponsor email');
  expect((await t.query(api.planner.listPublished, {})).map(row => row.id)).toEqual([live]);
  await page.getByRole('button', { name: 'Search cards', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('email');
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Search cards', exact: true }).click();
  await page.getByLabel('Filter by team', { exact: true }).selectOption('all');
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
  expect(await order()).toEqual(['ideas', 'planning', 'ready']);
  await page.getByRole('button', { name: 'Reorder Ideas list' }).dragTo(page.locator('.board-column[data-stage=ready]'), { targetPosition: { x: 400, y: 30 } });
  await expect.poll(order).toEqual(['planning', 'ready', 'ideas']);
  await expect(page.locator('.board-column[data-stage=ideas]')).toContainText('Keep this idea');
  await page.reload(); await expect.poll(order).toEqual(['planning', 'ready', 'ideas']);
  await page.getByRole('button', { name: 'Reorder Ideas list' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(order).toEqual(['planning', 'ideas', 'ready']);
  await page.reload(); await expect.poll(order).toEqual(['planning', 'ideas', 'ready']);
  await screenshot(page, 'reordered-lists-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await screenshot(page, 'reordered-lists-mobile');
});

test.describe('mobile board stages', () => {
  test.use({ hasTouch: true });

  test('switches stages with touch controls and keyboard without sideways scrolling', async ({ page, context }) => {
    await fixture(context, 'owner');
    await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
    await page.getByRole('tab', { name: 'In progress 0', exact: true }).tap();
    await expect(page.locator('#board .board-column:visible')).toHaveCount(1);
    await expect(page.locator('#board .board-column:visible')).toHaveAttribute('data-stage', 'planning');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Ready 0', exact: true })).toBeFocused();
    await expect(page.locator('#board .board-column:visible')).toHaveAttribute('data-stage', 'ready');
    await page.keyboard.press('Home');
    await expect(page.locator('#board .board-column:visible')).toHaveAttribute('data-stage', 'ideas');
    expect(await page.locator('#board').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await noOverflow(page);
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
  await expect(page.getByLabel('Booking or project link (optional)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish to website', exact: true })).toBeDisabled();
  await expect(page.locator('#publication-missing')).toContainText('description');
  await expect(page.locator('#publication-missing')).not.toContainText('booking link');
  await page.getByLabel('Description', { exact: true }).fill('Open to every degree.');
  await expect(page.getByRole('button', { name: 'Publish to website', exact: true })).toBeEnabled();
  await page.locator('#private-options > summary').click();
  await page.getByLabel('Notes', { exact: true }).fill('PRIVATE_ONLY_COMMITTEE_NOTES');
  await saveActivity(page, 'Save draft');
  expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  const publicPage = await context.newPage(); await publicPage.goto(`${origin}/#programme`, { waitUntil: 'domcontentloaded' });
  await expect(publicPage.locator('#programme')).not.toContainText('Committee integration workshop');
  await cardAction(page, 'Publish to website');
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Committee integration workshop');
  await expect(publicPage.locator('body')).not.toContainText('PRIVATE_ONLY_COMMITTEE_NOTES');
  const [published] = await t.query(api.planner.listPublished, {});
  expect(published.registrationUrl).toBe('');
  await editCard(page, 'Committee integration workshop');
  await page.locator('#activity-details > summary').click();
  await page.getByLabel('Booking or project link (optional)', { exact: true }).fill('https://example.test/book');
  await page.getByLabel('Title', { exact: true }).fill('Revised committee workshop');
  await saveActivity(page, 'Save draft');
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Committee integration workshop');
  await expect(publicPage.locator('#programme')).not.toContainText('Revised committee workshop');
  expect((await t.query(api.planner.getPublished, { id: published.id }))?.registrationUrl).toBe('');
  await cardAction(page, 'Publish changes');
  await expect(page.locator('#item-dialog')).not.toBeVisible();
  await publicPage.reload(); await expect(publicPage.locator('#programme')).toContainText('Revised committee workshop');
  expect((await t.query(api.planner.getPublished, { id: published.id }))?.registrationUrl).toBe('https://example.test/book');
  await editCard(page, 'Revised committee workshop');
  page.once('dialog', dialog => dialog.accept());
  await cardAction(page, 'Unpublish and move to Ready');
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
  await cardAction(page, 'Publish to website');
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
  await cardAction(page, 'Notes & collaborators');
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
  await saveActivity(page, 'Save idea');
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
  await expect(page.getByRole('button', { name: 'Publish to website', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Booking or project link (optional)', { exact: true })).toBeVisible();
  await expect(page.locator('#publication-missing')).not.toContainText('booking link');
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('ideas');
  await saveActivity(page, 'Save idea');
  expect((await admin.query(api.planner.list, {}))[0]).toMatchObject({ location: '03AC01', registrationUrl: '', stage: 'ideas', owner: 'Josh, Mosie' });
  await closeActivity(page);
  await expect(page.locator('[data-stage=ideas]')).not.toContainText('No date yet');
});

test('finished events and legacy Done cards appear in Archive and stay on the calendar', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const yesterday = new Date(`${londonToday()}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);
  await page.clock.setFixedTime(new Date(`${date}T22:00:00Z`));
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Finished committee workshop', date }, stage: 'planning', notes: 'Keep the event history' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Completed committee preparation', date: '' }, stage: 'done', internalOnly: true });
  const published = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Legacy completed public event' }, stage: 'ready' });
  await admin.mutation(api.planner.publish, { id: published, revision: 1 });
  await admin.mutation(api.planner.moveOnBoard, { id: published, revision: 2, stage: 'done' });
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Upcoming committee workshop' }, stage: 'planning' });
  await ready(page);
  await expect(page.locator('.column-heading h2')).toHaveText(['Ideas', 'In progress', 'Ready']);
  await expect(page.locator('#board .planner-card')).toHaveCount(1);
  await expect(page.locator('#board')).toContainText('Upcoming committee workshop');
  await navigate(page, 'Archive');
  await expect(page.locator('#archive .archive-row')).toHaveCount(3);
  await expect(page.locator('#archive')).toContainText('Finished committee workshop');
  await expect(page.locator('#archive')).toContainText('Completed committee preparation');
  await expect(page.locator('#archive')).toContainText('Legacy completed public event');
  await noOverflow(page); await screenshot(page, 'archive-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'archive-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.locator('.archive-open').filter({ hasText: 'Completed committee preparation' }).click();
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('archived');
  await closeActivity(page);
  await navigate(page, 'Calendar');
  const historicalEvent = page.locator('.calendar-event').filter({ hasText: 'Finished committee workshop' });
  await expect(historicalEvent).toBeVisible();
  await expect(historicalEvent).toHaveAttribute('data-stage', 'archived');
  await historicalEvent.click();
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('archived');
  await cardAction(page, 'Notes & collaborators');
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep the event history');
});

test('editing an event date into the past archives it and rescheduling refreshes the same editor', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Rescheduled committee workshop' }, stage: 'planning' });
  const yesterday = new Date(`${londonToday()}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await ready(page); await editCard(page, 'Rescheduled committee workshop');
  await page.getByLabel('Due date (optional)', { exact: true }).fill(yesterday.toISOString().slice(0, 10));
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('archived');
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('archived');
  await closeActivity(page); await navigate(page, 'Archive');
  await page.locator('.archive-row').filter({ hasText: 'Rescheduled committee workshop' }).getByRole('button', { name: 'Reschedule', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await page.getByLabel('Due date (optional)', { exact: true }).fill(activity.date);
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('planning');
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('planning');
  await expect(page.locator('#stage-field option[value=archived]')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('planning');
  await closeActivity(page);
  await expect(page.locator('#archive')).not.toContainText('Rescheduled committee workshop');
  await navigate(page, 'Board');
  await expect(page.locator('.board-column[data-stage=planning]')).toContainText('Rescheduled committee workshop');
});

test('Archive preloads and opens cached cards while a board refresh is still pending', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Cached archived workshop' } });
  await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  let archiveQueries = 0; let boardQueries = 0; let blockBoard = false; let boardBlocked = false;
  let releaseBoard = () => {};
  const boardGate = new Promise<void>(resolve => { releaseBoard = resolve; });
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    const body = route.request().postDataJSON();
    if (body.path === 'planner:list') {
      if ((jsonToConvex(body.args[0]) as { archived?: boolean }).archived) archiveQueries++;
      else { boardQueries++; if (blockBoard) { boardBlocked = true; await boardGate; } }
    }
    return route.fallback();
  });
  try {
    await ready(page);
    await expect(page.locator('#archive[aria-busy=false]')).toContainText('Cached archived workshop');
    expect(archiveQueries).toBe(1);
    blockBoard = true;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => boardBlocked).toBe(true);
    await expect(page.locator('#archive')).toHaveAttribute('aria-busy', 'false');
    const archiveQueriesBefore = archiveQueries; const boardQueriesBefore = boardQueries;
    await navigate(page, 'Archive');
    await expect(page.locator('#archive .archive-row')).toBeVisible();
    await expect(page.locator('#archive .archive-feedback')).toHaveCount(0);
    expect(archiveQueries).toBe(archiveQueriesBefore);
    expect(boardQueries).toBe(boardQueriesBefore);
    await noOverflow(page);
  } finally { releaseBoard(); }
});

test('Archive distinguishes loading and failure from an empty result and retries independently', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Recovered archived workshop' } });
  await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  let fail = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    const body = route.request().postDataJSON();
    if (body.path === 'planner:list' && (jsonToConvex(body.args[0]) as { archived?: boolean }).archived && fail) return route.fulfill({ json: { status: 'error', errorMessage: 'Archive temporarily unavailable' }, headers: { 'Access-Control-Allow-Origin': origin } });
    return route.fallback();
  });
  await ready(page); await navigate(page, 'Archive');
  await expect(page.locator('#archive .archive-feedback')).toContainText('Could not load archived cards');
  await expect(page.locator('#archive')).not.toContainText('No archived cards');
  fail = false;
  await page.locator('#archive').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#archive[aria-busy=false]')).toContainText('Recovered archived workshop');
  await expect(page.locator('#archive .archive-feedback')).toHaveCount(0);
});

test('a denied board refresh clears prefetched private archive data', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'PRIVATE_REVOKED_ARCHIVE_CARD' } });
  await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  let deny = false;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (deny && route.request().postDataJSON().path === 'planner:boardLayout') return route.fulfill({ json: { status: 'error', errorMessage: 'Committee access required' }, headers: { 'Access-Control-Allow-Origin': origin } });
    return route.fallback();
  });
  await ready(page);
  await expect(page.locator('#archive')).toContainText('PRIVATE_REVOKED_ARCHIVE_CARD');
  deny = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#access-message')).toContainText('Committee access is no longer available');
  await expect(page.locator('#workspace')).toBeHidden();
  await expect(page.locator('#archive')).toBeEmpty();
  await expect(page.locator('#board')).toBeEmpty();
});

test('a delayed archive response cannot restore private cards after sign-out', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'PRIVATE_ARCHIVE_CARD' } });
  await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
  let release: (() => Promise<void>) | undefined;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    const body = route.request().postDataJSON();
    if (body.path !== 'planner:list' || !(jsonToConvex(body.args[0]) as { archived?: boolean }).archived) return route.fallback();
    const snapshot = await admin.query(api.planner.list, { archived: true });
    release = async () => { await route.fulfill({ json: { status: 'success', value: convexToJson(snapshot), logLines: [] }, headers: { 'Access-Control-Allow-Origin': origin } }); };
  });
  await ready(page); await navigate(page, 'Archive');
  await expect.poll(() => !!release).toBe(true);
  await expect(page.locator('#archive')).toContainText('Loading archived cards');
  await expect(page.locator('#archive')).not.toContainText('No archived cards');
  await page.evaluate(() => (window as unknown as { Clerk: { signOut(): Promise<void> } }).Clerk.signOut());
  await expect(page.locator('#workspace')).toBeHidden();
  const response = page.waitForResponse(response => response.url().endsWith('/api/query') && response.request().postDataJSON().path === 'planner:list');
  await release!();
  await response;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect(page.locator('#archive')).toBeEmpty();
  await expect(page.locator('body')).not.toContainText('PRIVATE_ARCHIVE_CARD');
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
  await cardAction(page, 'Notes & collaborators');
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep the room notes');
  await page.getByLabel('Notes', { exact: true }).fill('Updated historical room notes');
  await saveActivity(page, 'Save changes');
  expect(await admin.query(api.planner.get, { id: past })).toMatchObject({ stage: 'archived', date: '2026-10-14', notes: 'Updated historical room notes' });
  await closeActivity(page);
  await page.locator('[data-date="2026-10-21"] .calendar-date').click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-21');
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('planning');
  await page.getByLabel('Title', { exact: true }).fill('Calendar planning draft');
  await saveActivity(page, 'Save draft');
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
  await expect(page.locator(`.planner-card[data-item="${id}"] .card-footer`)).toHaveCount(0);
  await expect(page.locator(`.planner-card[data-item="${published}"] .card-footer`)).toHaveCount(1);
  await expect(page.locator('.column-heading h2')).toHaveText(['Ideas', 'In progress', 'Ready']);
  await expect(page.locator('#stage-field option[value=done]')).toHaveCount(0);
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=planning]'));
  await expect(page.locator(`.board-column[data-stage=planning] [data-item="${id}"]`)).toBeVisible();
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=ready]'));
  await expect(page.locator(`.board-column[data-stage=ready] [data-item="${id}"]`)).toBeVisible();
  await page.locator(`.planner-card[data-item="${id}"]`).dragTo(page.locator('.board-column[data-stage=ideas]'));
  await expect(page.locator(`.board-column[data-stage=ideas] [data-item="${id}"]`)).toBeVisible();
  expect((await t.query(api.planner.listPublished, {})).map(item => item.id)).toEqual([published]);
  await page.locator(`.planner-card[data-item="${published}"]`).dragTo(page.locator('.board-column[data-stage=planning]'));
  await expect(page.locator(`.board-column[data-stage=planning] [data-item="${published}"]`)).toBeVisible();
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
  const workshop: Activity = { ...activity, description: 'A hands-on workshop to build a simple AI agent. No experience needed — just bring your laptop.' };
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
    if (card.people.length > 1) await card.people[1].mutation(api.planner.save, { id, revision: 1, activity: details, notes: 'Reviewed the room and workshop details.', owner: '', tasks: [] });
    if (card.stage === 'published') await card.people[0].mutation(api.planner.publish, { id, revision: 1 });
    if (card.title === 'Build your first AI agent') workshopId = id;
  }
  if (!workshopId) throw new Error('Workshop fixture missing');
  await admin.mutation(api.planner.addComment, { id: workshopId, text: 'Room is booked. Shall we keep it beginner-friendly?', requestId: '00000000-0000-4000-8000-000000000001' });
  const own = await owner.mutation(api.planner.addComment, { id: workshopId, text: "Definitely. @committee@example.test I'll put together a starter project.", requestId: '00000000-0000-4000-8000-000000000002' });
  await admin.mutation(api.planner.addComment, { id: workshopId, text: "Perfect — I'll sort the slides.", requestId: '00000000-0000-4000-8000-000000000003' });
  await ready(page);
  await expect(page.locator('.column-count')).toHaveText(['3', '2', '3']);
  await expect(page.locator('#board .planner-card')).toHaveCount(8);
  await expect(page.locator('#board .card-kind, #board .card-description, #board .card-details, #board .card-comment-count, #board select, #board a')).toHaveCount(0);
  await expect(page.locator('#board')).not.toContainText(workshop.description);
  await expect(page.locator('#board')).not.toContainText(workshop.location);
  const card = page.locator(`.planner-card[data-item="${workshopId}"]`);
  await expect(card.locator('.card-lead')).toHaveCount(0);
  await expect(card.locator('.person-name')).toHaveCount(0);
  await noOverflow(page); await screenshot(page, 'approved-board-desktop');
  await card.getByRole('button', { name: /^View / }).focus(); await page.keyboard.press('Enter');
  await cardAction(page, 'Worked on by');
  await expect(page.locator('#card-people .person-name')).toHaveText(['Joshua Knott', 'Sam']);
  await page.getByRole('button', { name: 'Close contributors', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
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

test('cards open fully editable beside comments and keep creator and editor history inside the modal', async ({ page, context }) => {
  const { admin } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'AI & creativity night', description: 'An evening of small creative experiments with AI.', date: '', startTime: '', endTime: '', location: '' } });
  await admin.mutation(api.planner.addComment, { id, text: 'Could we include a music activity?', requestId: '00000000-0000-4000-8000-000000000001' });
  await ready(page);
  await expect(page.locator(`[data-item="${id}"] .card-lead`)).toHaveCount(0);
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
  await saveActivity(page, 'Save idea');
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Bring your ideas for music, art and creative coding.');
  await expect(page.locator('#comment-text')).toHaveValue('Unposted comment draft');
  await expect(page.locator(`[data-item="${id}"] .card-lead`)).toHaveCount(0);
  await cardAction(page, 'Worked on by');
  await expect(page.locator('#card-people .person-avatar')).toHaveText(['C', 'JK']);
  await page.getByRole('button', { name: 'Close contributors', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Unsaved card title');
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await expect(page.locator('#card-dialog')).not.toBeVisible();
  await editCard(page, 'Unsaved card title');
  await page.getByLabel('Title', { exact: true }).fill('AI & creativity night');
  await saveActivity(page, 'Save idea');
  await page.getByLabel('Add a comment', { exact: true }).fill('');
  await noOverflow(page); await screenshot(page, 'card-preview-desktop');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page); await screenshot(page, 'card-preview-mobile');
  await page.setViewportSize({ width: 320, height: 760 }); await noOverflow(page);
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await expect(page.locator(`[data-item="${id}"] .card-lead`)).toHaveCount(0);
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
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
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
  await page.getByRole('button', { name: 'Comments', exact: true }).click();
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
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click(); await compose.fill('Could @comm');
  await screenshot(page, 'mention-picker-mobile');
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
  await expect(page.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('archived');
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

test('Trello card dialog exposes creator attribution, exact timestamps and filterable activity', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  const id = await admin.mutation(api.planner.create, {
    activity: { ...activity, title: 'Trello activity review', description: 'Review the card history with the committee.' },
    internalOnly: true,
    stage: 'ideas',
    tasks: [{ text: 'Confirm the room', done: false }],
  });
  const firstCommentId = await admin.mutation(api.planner.addComment, {
    id,
    text: 'Room booking is ready for review.',
    requestId: '00000000-0000-4000-8000-000000000001',
  });
  // A second actor moves the card so the activity timeline proves who changed its stage.
  await owner.mutation(api.planner.moveOnBoard, { id, revision: 1, stage: 'planning' });

  const activityQuery = makeFunctionReference<'query'>('planner:listActivity');
  const history = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
  expect(history.page.length).toBeGreaterThanOrEqual(2);
  expect(history.page.some(entry => /created this card/i.test(entry.text))).toBe(true);
  expect(history.page.some(entry => /moved this card/i.test(entry.text))).toBe(true);
  expect(history.page.every(entry => entry.author && entry.text && entry._creationTime > 0)).toBe(true);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await ready(page);
  const card = page.locator(`.planner-card[data-item="${id}"]`);
  await expect(card.locator('.card-created-by')).toHaveCount(0);
  await card.getByRole('button', { name: `View Trello activity review`, exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('#card-created-by')).toContainText('Created by');
  await expect(page.locator('#card-updated-at')).toContainText('Updated');
  await expect(page.locator('#comment-list .comment')).toHaveCount(1);
  await expect(page.locator('#comment-list .card-activity-entry')).toHaveCount(history.page.length);

  const firstComment = (await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: null } })).page.find(comment => comment._id === firstCommentId);
  if (!firstComment) throw new Error('Comment fixture missing');
  const expectedCommentTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(firstComment._creationTime));
  const firstCommentTime = page.locator(`#comment-list [data-comment="${firstCommentId}"] time`);
  await expect(firstCommentTime).toContainText(expectedCommentTime);
  expect(await firstCommentTime.evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(12);

  const timestamps = page.locator('#comment-list time');
  await expect(timestamps).not.toHaveCount(0);
  for (let index = 0; index < await timestamps.count(); index++) {
    await expect(timestamps.nth(index)).toHaveText(/\d{1,2}.*\d{2}/);
  }

  const allActivity = page.getByRole('button', { name: 'All activity', exact: true });
  const commentsOnly = page.getByRole('button', { name: 'Comments', exact: true });
  await expect(allActivity).toBeVisible();
  await expect(commentsOnly).toBeVisible();
  await commentsOnly.click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(1);
  for (let index = 0; index < await page.locator('#comment-list .card-activity-entry').count(); index++) {
    await expect(page.locator('#comment-list .card-activity-entry').nth(index)).toBeHidden();
  }
  await allActivity.click();
  await expect(page.locator('#comment-list .card-activity-entry').first()).toBeVisible();

  // Posting a comment keeps the composer usable and does not duplicate the activity stream.
  const activityCount = await page.locator('#comment-list .card-activity-entry').count();
  await page.getByLabel('Add a comment', { exact: true }).fill('I can take the next action.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(2);
  await expect(page.locator('#comment-list .card-activity-entry')).toHaveCount(activityCount);
  await expect(page.locator('#comment-list time').last()).toHaveText(/\d{1,2}.*\d{2}/);
  await noOverflow(page);
  await screenshot(page, 'trello-card-desktop');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await noOverflow(page);
  await expect(page.locator('.comment-composer')).toBeVisible();
  await screenshot(page, 'trello-card-mobile');
});

test('checklist autosave records activity and own comment controls survive the comments filter', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  await owner.mutation(api.planner.setDisplayName, { name: 'Maya Patel' });
  const id = await owner.mutation(api.planner.create, {
    activity: { ...activity, title: 'Checklist history card', date: '', startTime: '', endTime: '', location: '' },
    internalOnly: true,
    stage: 'planning',
    tasks: [{ text: 'Confirm the room', done: false }, { text: 'Prepare artwork', done: false }],
  });
  const ownComment = await owner.mutation(api.planner.addComment, { id, text: 'I will take the next action.', requestId: '00000000-0000-4000-8000-000000000001' });
  const activityQuery = makeFunctionReference<'query'>('planner:listActivity');

  await ready(page);
  await page.getByRole('button', { name: 'View Checklist history card', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Comments', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(1);
  await expect(page.locator('#comment-list .card-activity-entry')).toHaveCount(0);

  const ownRow = page.locator(`#comment-list [data-comment="${ownComment}"]`);
  await commentAction(page, 'Edit comment');
  await page.getByLabel('Edit your comment', { exact: true }).fill('I will take the room booking action.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(ownRow.locator('p')).toHaveText('I will take the room booking action.');
  await commentAction(page, 'Delete comment');
  await page.getByRole('button', { name: 'Confirm delete comment', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toHaveCount(0);

  await page.getByRole('button', { name: 'All activity', exact: true }).click();
  const checklist = page.locator('#task-list input[type="checkbox"]').first();
  await checklist.check();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.tasks[0]?.done).toBe(true);
  await expect.poll(async () => {
    const result = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
    return result.page.some(entry => /checklist/i.test(entry.text));
  }).toBe(true);
  await expect(page.locator('#comment-list .card-activity-entry').filter({ hasText: 'checklist' })).toHaveCount(1);
});

test('card activity shows a retry state and does not leak a delayed response after switching cards', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const first = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Activity retry card' }, internalOnly: true });
  const second = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Second private card' }, internalOnly: true });
  let failOnce = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST' || route.request().postDataJSON()?.path !== 'planner:listActivity' || !failOnce) return route.fallback();
    failOnce = false;
    await route.abort('failed');
  });
  await ready(page);
  await page.getByRole('button', { name: 'View Activity retry card', exact: true }).click();
  await expect(page.locator('#activity-status')).toContainText('Could not load card activity');
  await page.locator('#activity-status').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#activity-status')).toHaveText('');
  await expect(page.locator('#comment-list .card-activity-entry')).toContainText('created this card');

  let release: (() => Promise<void>) | undefined;
  let held = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    if (route.request().method() !== 'POST' || route.request().postDataJSON()?.path !== 'planner:listActivity' || !held) return route.fallback();
    const args = jsonToConvex(route.request().postDataJSON().args[0]) as { id: string };
    if (args.id !== first) return route.fallback();
    held = false;
    release = async () => { await route.fallback(); };
  });
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.getByRole('button', { name: 'View Activity retry card', exact: true }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('button', { name: 'Close card', exact: true }).click();
  await page.getByRole('button', { name: 'View Second private card', exact: true }).click();
  await page.evaluate(async () => { await (window as unknown as { Clerk: { signOut(): Promise<void> } }).Clerk.signOut(); });
  await expect(page.locator('#sign-in-email')).toBeVisible();
  await expect(page.locator('#card-dialog')).not.toBeVisible();
  await release!();
  await expect(page.locator('#comment-list')).toBeEmpty();
});

test('reference card state keeps the selected Trello composition legible on desktop and mobile', async ({ page, context }) => {
  const { admin, owner } = await fixture(context, 'owner');
  await owner.mutation(api.planner.setDisplayName, { name: 'Maya Patel' });
  await admin.mutation(api.planner.setDisplayName, { name: 'Samira Khan' });
  const id = await owner.mutation(api.planner.create, {
    activity: { ...activity, title: 'Intro to AI workshop', description: 'A practical introduction to building with AI for Surrey students.', date: '2026-10-24', startTime: '', endTime: '', location: '' },
    internalOnly: true,
    stage: 'planning',
    teams: ['learning'],
    lead: 'Ibrahim Haque',
    tasks: [{ text: 'Confirm the room', done: true }, { text: 'Prepare event artwork', done: true }, { text: 'Finish workshop outline', done: false }],
    attachments: [{ name: 'Workshop outline.pdf', url: 'https://fixture.test/workshop-outline.pdf' }],
  });
  await admin.mutation(api.planner.addComment, { id, text: 'Room confirmed for Saturday. Booking details are attached.', requestId: '00000000-0000-4000-8000-000000000001' });
  await owner.mutation(api.planner.addComment, { id, text: '@committee@example.test can you share the workshop outline?', requestId: '00000000-0000-4000-8000-000000000002' });

  await page.setViewportSize({ width: 1600, height: 1000 });
  await ready(page);
  await page.getByRole('button', { name: 'View Intro to AI workshop', exact: true }).click();
  await expect(page.locator('#card-dialog')).toBeVisible();
  await expect(page.locator('#card-created-by')).toContainText('Maya Patel');
  await expect(page.locator('#task-list input[type="checkbox"]:checked')).toHaveCount(2);
  await expect(page.locator('#attachment-list')).toContainText('Workshop outline.pdf');
  await noOverflow(page);
  await screenshot(page, 'trello-reference-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Card', exact: true }).click();
  await noOverflow(page); await screenshot(page, 'trello-reference-mobile-card');
  await page.getByRole('tab', { name: 'Discussion', exact: true }).click();
  await noOverflow(page); await screenshot(page, 'trello-reference-mobile-discussion');
});

test('queued activity refresh replaces a stale initial response after an autosaved checklist edit', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, {
    activity: { ...activity, title: 'Queued activity refresh', date: '', startTime: '', endTime: '', location: '' },
    internalOnly: true,
    stage: 'planning',
    tasks: [{ text: 'Confirm the room', done: false }],
  });
  const activityQuery = makeFunctionReference<'query'>('planner:listActivity');
  const stale = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
  let releaseInitial: (() => Promise<void>) | undefined;
  let heldInitial = true;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    const request = route.request();
    if (request.method() !== 'POST' || request.postDataJSON()?.path !== 'planner:listActivity' || !heldInitial) return route.fallback();
    const args = jsonToConvex(request.postDataJSON().args[0]) as { id: string };
    if (args.id !== id) return route.fallback();
    heldInitial = false;
    releaseInitial = async () => {
      await route.fulfill({ json: { status: 'success', value: convexToJson(stale), logLines: [] }, headers: { 'Access-Control-Allow-Origin': origin } });
    };
  });

  await ready(page);
  await page.getByRole('button', { name: 'View Queued activity refresh', exact: true }).click();
  await expect.poll(() => !!releaseInitial).toBe(true);
  await page.locator('#task-list input[type="checkbox"]').first().check();
  await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.tasks[0]?.done).toBe(true);
  await expect.poll(async () => {
    const current = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
    return current.page.some(entry => /checklist/i.test(entry.text));
  }).toBe(true);
  await releaseInitial!();
  await expect(page.locator('#comment-list .card-activity-entry').filter({ hasText: 'checklist' })).toHaveCount(1);
  await expect(page.locator('#activity-status')).toHaveText('');
});

test('initial activity loading skips excluded comment and no-op audit pages to retain card creation', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, {
    activity: { ...activity, title: 'Paginated activity history', date: '', startTime: '', endTime: '', location: '' },
    internalOnly: true,
    stage: 'planning',
  });
  for (let index = 0; index < 20; index++) {
    await admin.mutation(api.planner.addComment, { id, text: `Excluded comment ${index}`, requestId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` });
  }
  for (let index = 0; index < 20; index++) {
    const current = await admin.query(api.planner.get, { id });
    if (!current) throw new Error('Paginated card fixture missing');
    const cardActivity = { title: current.title, kind: current.kind, category: current.category, description: current.description, date: current.date, startTime: current.startTime, endTime: current.endTime, location: current.location, registrationUrl: current.registrationUrl };
    await admin.mutation(api.planner.save, { id, revision: current.revision, activity: cardActivity, notes: current.notes, owner: current.owner, tasks: current.tasks });
  }
  const activityQuery = makeFunctionReference<'query'>('planner:listActivity');
  const firstPage = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
  expect(firstPage.page).toHaveLength(0);
  expect(firstPage.isDone).toBe(false);
  const secondPage = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: firstPage.continueCursor } });
  expect(secondPage.page.some(entry => /created this card/i.test(entry.text))).toBe(true);

  await ready(page);
  await page.getByRole('button', { name: 'View Paginated activity history', exact: true }).click();
  await expect(page.locator('#activity-status')).toHaveText('');
  await expect(page.locator('#comment-list .card-activity-entry')).toContainText('created this card');
  await expect(page.locator('#comment-list .comment')).toHaveCount(20);
});

test('comment retry state survives activity completion and filter changes', async ({ page, context }) => {
  const { admin } = await fixture(context);
  const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Comment retry race' }, internalOnly: true, stage: 'planning' });
  await admin.mutation(api.planner.addComment, { id, text: 'Existing committee comment.', requestId: '00000000-0000-4000-8000-000000000001' });
  const activityQuery = makeFunctionReference<'query'>('planner:listActivity');
  const activitySnapshot = await admin.query(activityQuery, { id, paginationOpts: { numItems: 30, cursor: null } });
  let failComments = true;
  let holdActivity = true;
  let releaseActivity: (() => Promise<void>) | undefined;
  await context.route(/https:\/\/[^/]+\.convex\.cloud\/api\/query$/, async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const body = request.postDataJSON();
    if (body.path === 'planner:listComments' && failComments) {
      failComments = false;
      await route.abort('failed');
      return;
    }
    if (body.path === 'planner:listActivity' && holdActivity) {
      const args = jsonToConvex(body.args[0]) as { id: string };
      if (args.id === id) {
        holdActivity = false;
        releaseActivity = async () => {
          await route.fulfill({ json: { status: 'success', value: convexToJson(activitySnapshot), logLines: [] }, headers: { 'Access-Control-Allow-Origin': origin } });
        };
        return;
      }
    }
    await route.fallback();
  });

  await ready(page);
  await page.getByRole('button', { name: 'View Comment retry race', exact: true }).click();
  await expect(page.locator('#comments-status')).toContainText('Could not load comments');
  await expect.poll(() => !!releaseActivity).toBe(true);
  await releaseActivity!();
  await expect(page.locator('#comment-list .card-activity-entry')).toContainText('created this card');
  await expect(page.locator('#comments-status')).toContainText('Could not load comments');

  await page.getByRole('button', { name: 'Comments', exact: true }).click();
  await expect(page.locator('#comments-status')).toContainText('Could not load comments');
  await expect(page.locator('#comment-list .card-activity-entry')).toHaveCount(0);
  await page.getByRole('button', { name: 'All activity', exact: true }).click();
  await expect(page.locator('#comments-status')).toContainText('Could not load comments');
  await expect(page.locator('#comment-list .card-activity-entry')).toContainText('created this card');

  await page.locator('#comments-status').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('#comment-list .comment')).toContainText('Existing committee comment.');
  await expect(page.locator('#comments-status')).toHaveText('');
});

for (const width of [1440, 390]) {
  test(`card delete flow archives first and permanently deletes from Archive at ${width}px`, async ({ page, context }) => {
    const { admin } = await fixture(context);
    const title = `Delete flow ${width}`;
    const id = await admin.mutation(api.planner.create, {
      activity: { ...activity, title, description: 'A card that can be archived safely.' },
      internalOnly: true,
      stage: 'planning',
    });

    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await editCard(page, title);

    // Existing cards save as you edit; the header only exposes the destructive action.
    await expect(page.locator('#card-dialog').getByRole('button', { name: 'Save card', exact: true })).toHaveCount(0);
    await expect(page.locator('#card-dialog').getByRole('button', { name: 'Archive', exact: true })).toHaveCount(0);
    const description = page.getByLabel('Description', { exact: true });
    await description.fill('The latest notes must survive archiving.');
    await description.press('Enter');
    await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.description).toBe('The latest notes must survive archiving.');

    await page.getByRole('button', { name: 'Delete card', exact: true }).click();
    const deleteDialog = page.locator('#delete-card-dialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await expect(deleteDialog).toContainText(/Archive/i);
    await screenshot(page, `delete-flow-confirm-${width}`);
    await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(deleteDialog).not.toBeVisible();
    await expect(page.locator('#card-dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Delete card', exact: true }).click();
    await deleteDialog.getByRole('button', { name: 'Yes, delete', exact: true }).click();
    await expect(page.locator('#card-dialog')).not.toBeVisible();
    await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('archived');
    expect((await admin.query(api.planner.get, { id }))?.description).toBe('The latest notes must survive archiving.');

    await navigate(page, 'Archive');
    const row = page.locator('.archive-row').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: /Permanently delete/i })).toBeVisible();
    await screenshot(page, `delete-flow-populated-archive-${width}`);

    // Restore from Archive, then re-archive through the same confirmation flow.
    await row.getByRole('button', { name: 'Restore to Ideas', exact: true }).click();
    await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('ideas');
    await expect(page.locator('.archive-row').filter({ hasText: title })).toHaveCount(0);
    await navigate(page, 'Board');
    await editCard(page, title);
    await page.getByRole('button', { name: 'Delete card', exact: true }).click();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Yes, delete', exact: true }).click();
    await expect.poll(async () => (await admin.query(api.planner.get, { id }))?.stage).toBe('archived');
    await navigate(page, 'Archive');
    const restoredRow = page.locator('.archive-row').filter({ hasText: title });
    await expect(restoredRow).toBeVisible();

    await restoredRow.getByRole('button', { name: /Permanently delete/i }).click();
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await expect(deleteDialog).toContainText(/Permanently delete/i);
    await screenshot(page, `delete-flow-permanent-confirm-${width}`);
    await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(restoredRow).toBeVisible();

    await restoredRow.getByRole('button', { name: /Permanently delete/i }).click();
    await deleteDialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => await admin.query(api.planner.get, { id })).toBeNull();
    await noOverflow(page);
    await screenshot(page, `delete-flow-archive-${width}`);
  });
}

test('planning areas keep Events and Outreach separate and save relationship details', async ({ page, context }) => {
  const { admin } = await fixture(context);
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Existing society event' }, internalOnly: true });
  const outreachId = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Guest speaker conversation', date: '' }, workspace: 'outreach', outreachKind: 'Speakers', nextAction: 'Send a workshop brief' });
  await page.goto(`${origin}/committee/planner/outreach`);
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#workspace-title')).toHaveText('Outreach');
  await expect(page.locator('#board')).toContainText('Send a workshop brief');
  await expect(page.locator('#board')).not.toContainText('Existing society event');
  await expect(page.getByRole('heading', { name: 'To approach', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for reply', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'In conversation', exact: true })).toBeVisible();
  await editCard(page, 'Guest speaker conversation');
  await page.getByLabel('Next action', { exact: true }).fill('Arrange a short call');
  await page.getByRole('combobox', { name: 'Stage', exact: true }).selectOption('planning');
  await closeActivity(page);
  await expect.poll(async () => (await admin.query(api.planner.get, { id: outreachId }))?.nextAction).toBe('Arrange a short call');
  await expect(page.locator('#board-stage-planning')).toContainText('Guest speaker conversation');
  await page.reload();
  await expect(page.locator('#board-stage-planning')).toContainText('Arrange a short call');
  await screenshot(page, 'segmented-outreach-desktop');
  await navigate(page, 'Events');
  await expect(page).toHaveURL(`${origin}/committee/planner/events`);
  await expect(page.locator('#board')).toContainText('Existing society event');
  await expect(page.locator('#board')).not.toContainText('Guest speaker conversation');
  await page.goBack();
  await expect(page.locator('#workspace-title')).toHaveText('Outreach');
  await expect(page.locator('#board')).toContainText('Guest speaker conversation');
});

test('outreach company cards keep the create surface focused while preserving optional details', async ({ page, context }) => {
  const { admin } = await fixture(context);
  await page.goto(`${origin}/committee/planner/outreach`);
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#workspace-title')).toHaveText('Outreach');

  await page.getByRole('button', { name: 'New card', exact: true }).click();
  const editor = page.locator('#item-dialog');
  await expect(editor).toBeVisible();
  await expect(editor.getByRole('heading', { name: 'New company', exact: true })).toBeVisible();
  await expect(editor.getByRole('combobox', { name: 'Stage', exact: true })).toHaveValue('ideas');
  await expect(editor).toContainText('To approach');
  await expect(editor.locator('[name=title]')).toBeVisible();
  await expect(editor.locator('[name=description]')).toBeVisible();
  await expect(editor.locator('[name=nextAction]')).toBeVisible();
  await expect(editor.locator('[name=title]')).toBeFocused();
  await page.setViewportSize({ width: 1314, height: 1197 });
  await noOverflow(page); await screenshot(page, 'outreach-new-company-1314');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 760 : 844 });
    await noOverflow(page); await screenshot(page, `outreach-new-company-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1024 });

  // Outreach keeps relationship, team, collaborators and notes behind the
  // secondary disclosure. The details must start collapsed for a new card.
  const details = editor.locator('#outreach-more-details');
  const detailsSummary = details.locator(':scope > summary');
  await expect(detailsSummary).toContainText(/More details/i);
  await expect(details).not.toHaveAttribute('open', '');
  await detailsSummary.click();
  await expect(details).toHaveAttribute('open', '');

  const title = 'Northstar Robotics';
  await editor.locator('[name=title]').fill(title);
  await editor.locator('[name=description]').fill('Potential workshop partner for the spring programme.');
  await editor.locator('[name=nextAction]').fill('Send the partnership brief');

  const lead = editor.locator('[name=lead]');
  if (!await lead.isVisible()) {
    await editor.locator('#outreach-lead-picker > summary').click();
  }
  await lead.selectOption({ label: 'Joshua Knott' });

  const dueDate = editor.locator('[name=dueDate]');
  if (!await dueDate.isVisible()) {
    await editor.locator('#outreach-follow-up-picker > summary').click();
  }
  await dueDate.fill('2026-11-15');
  await editor.locator('[name=outreachKind]').selectOption({ label: 'Sponsorship' });
  await editor.locator('#team-picker-summary').click();
  await editor.locator('input[name=teams][value=industry]').check();
  await editor.locator('[name=owner]').fill('Josh and Mosie');
  await editor.locator('[name=notes]').fill('Ask about student workshop support and equipment loan.');

  // Changing planning area reuses the same controls without clearing the draft.
  await editor.locator('[name=workspace]').selectOption('events');
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue(title);
  await editor.locator('#private-options > summary').click();
  await editor.locator('[name=workspace]').selectOption('outreach');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(editor.getByLabel('Company', { exact: true })).toHaveValue(title);
  await expect(editor.locator('[name=description]')).toHaveValue('Potential workshop partner for the spring programme.');
  await expect(editor.locator('[name=outreachKind]')).toHaveValue('Sponsorship');
  await expect(editor.locator('[name=notes]')).toHaveValue('Ask about student workshop support and equipment loan.');

  await editor.getByRole('button', { name: /Create card|Save card|Save draft/i }).click();
  await expect(editor).not.toBeVisible();
  await expect(page.locator('#board')).toContainText(title);

  const created = (await admin.query(api.planner.list, { workspace: 'outreach' })).find(item => item.title === title);
  expect(created).toBeDefined();
  expect(created).toMatchObject({
    title,
    description: 'Potential workshop partner for the spring programme.',
    nextAction: 'Send the partnership brief',
    lead: 'Joshua Knott',
    date: '2026-11-15',
    outreachKind: 'Sponsorship',
    owner: 'Josh and Mosie',
    notes: 'Ask about student workshop support and equipment loan.',
  });
  expect(created?.teams).toContain('industry');

  await admin.mutation(api.planner.addComment, { id: created!._id, text: 'Existing committee note.', requestId: '00000000-0000-4000-8000-000000000017' });
  await editCard(page, title);
  const card = page.locator('#card-dialog');
  await expect(card).toBeVisible();
  await expect(card.locator('[name=title]')).toHaveValue(title);
  await expect(card.locator('[name=description]')).toHaveValue('Potential workshop partner for the spring programme.');
  await expect(card.locator('[name=nextAction]')).toHaveValue('Send the partnership brief');
  await expect(card.locator('[name=lead]')).toHaveValue('Joshua Knott');
  await expect(card.locator('[name=dueDate]')).toHaveValue('2026-11-15');
  await expect(card.locator('#comment-list .comment')).toContainText('Existing committee note.');
  await expect(card.locator('#card-save-status')).toHaveText('All changes saved');

  await card.locator('[name=description]').fill('Updated outreach context.');
  await card.locator('[name=description]').press('Tab');
  await expect.poll(async () => (await admin.query(api.planner.get, { id: created!._id }))?.description).toBe('Updated outreach context.');
  await closeActivity(page);

  // The outreach-only controls must not leak into the ordinary Events editor.
  await navigate(page, 'Events');
  await page.getByRole('button', { name: 'New card', exact: true }).click();
  const eventEditor = page.locator('#item-dialog');
  await expect(eventEditor).toBeVisible();
  await expect(eventEditor.getByRole('heading', { name: 'New company', exact: true })).toHaveCount(0);
  await expect(eventEditor.locator('[name=nextAction]')).toBeHidden();
  await expect(eventEditor.locator('#outreach-fields')).toBeHidden();
  await expect(eventEditor.locator('#outreach-assignments')).toBeHidden();
  await closeActivity(page);
});

test('Hack checklist seeds once, supports completion and retains editable task details', async ({ page, context }) => {
  const count = HACK_CHECKLIST_TEMPLATE.length;
  const { admin } = await fixture(context);
  await page.goto(`${origin}/committee/planner/hack2027`);
  await expect(page.locator('#hack-checklist')).toBeVisible();
  await expect(page.locator('.hack-task-row')).toHaveCount(count);
  await expect(page.locator('.hack-total')).toHaveText(`0 of ${count} complete`);
  const title = 'Define the event purpose and audience';
  await page.getByRole('checkbox', { name: `Complete ${title}`, exact: true }).check();
  await expect(page.locator('.hack-total')).toHaveText(`1 of ${count} complete`);
  const items = await admin.query(api.planner.list, { workspace: 'hack2027' });
  const seeded = items.find(item => item.title === title)!;
  expect(seeded.checklistDone).toBe(true);
  expect(items.every(item => !item.lead && !item.date)).toBe(true);
  await editCard(page, title);
  await expect(page.locator('#task-list input[type=checkbox]')).toHaveCount(4);
  await expect(page.locator('#item-form select[name=purpose]')).toBeDisabled();
  await page.getByLabel('Description', { exact: true }).fill('Reviewed by the committee for the local preview.');
  await closeActivity(page);
  await expect.poll(async () => (await admin.query(api.planner.get, { id: seeded._id }))?.description).toBe('Reviewed by the committee for the local preview.');
  await page.reload();
  await expect(page.locator('.hack-task-row')).toHaveCount(count);
  await expect(page.locator('.hack-total')).toHaveText(`1 of ${count} complete`);
  await screenshot(page, 'segmented-hack-desktop');
  const latest = (await admin.query(api.planner.get, { id: seeded._id }))!;
  await admin.mutation(api.planner.move, { id: latest._id, revision: latest.revision, stage: 'archived' });
  await page.reload();
  await expect(page.locator('.hack-task-row')).toHaveCount(count - 1);
  await expect(page.locator('.hack-total')).toHaveText(`0 of ${count - 1} complete`);
  expect(await admin.mutation(api.planner.seedHackChecklist, {})).toEqual({ created: 0, alreadySeeded: true });
});

test('segmented planning pages support search, mobile navigation and responsive checklist rows', async ({ page, context }) => {
  const count = HACK_CHECKLIST_TEMPLATE.length;
  const { admin } = await fixture(context);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Alumni speaker network', date: '' }, workspace: 'outreach', outreachKind: 'Speakers', nextAction: 'Ask for introductions' });
  await page.goto(`${origin}/committee/planner/hack2027`);
  await expect(page.locator('.hack-task-row')).toHaveCount(count);
  await page.getByRole('button', { name: 'Search cards', exact: true }).click();
  await page.getByRole('searchbox').fill('catering');
  await expect(page.locator('.hack-task-row')).not.toHaveCount(count);
  await expect(page.locator('.hack-task-row')).not.toHaveCount(0);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await expect(page.locator('.hack-group[open]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(page.locator('.hack-group[open]')).toHaveCount(HACK_CHECKLIST_GROUPS.length);
  for (const width of [320, 390, 834, 1485]) {
    await page.setViewportSize({ width, height: width < 721 ? 844 : 1059 });
    await noOverflow(page);
    await screenshot(page, `segmented-hack-${width}`);
    await navigate(page, 'Outreach');
    await expect(page.locator('#workspace-title')).toHaveText('Outreach');
    await expect(page.locator('#board')).toContainText('Ask for introductions');
    await noOverflow(page);
    await screenshot(page, `segmented-outreach-${width}`);
    await navigate(page, 'Surrey AI Hack 2027');
    await expect(page.locator('#hack-checklist')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
