/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it, vi } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';
import type { Activity } from './plannerModel';
import { plannerToday, personInitials } from './plannerModel';
import { mentionTokens } from './lib/plannerMentions';
import { HACK_CHECKLIST_TEMPLATE } from './plannerHackTemplate';

const modules = import.meta.glob('./**/*.ts');
const activity: Activity = { title: 'AI workshop', kind: 'event', category: 'Workshop', description: 'A beginner workshop.', date: '2026-10-29', startTime: '18:00', endTime: '20:00', location: 'Stag Hill', registrationUrl: 'https://example.test/signup' };

describe('mention email delivery', () => {
  async function mentioned() {
    const fixture = await setup();
    const id = await fixture.owner.mutation(api.planner.create, { activity });
    const commentArgs = { id, text: '@admin@example.test please review', requestId: '00000000-0000-4000-8000-000000000001' };
    const commentId = await fixture.owner.mutation(api.planner.addComment, commentArgs);
    const notification = (await fixture.t.run(ctx => ctx.db.query('plannerNotifications').first()))!;
    await fixture.t.run(ctx => ctx.db.patch(notification._id, { emailDelivery: { status: 'pending', attempts: 0, nextAttemptAt: 0 } }));
    return { ...fixture, id, commentArgs, commentId, notificationId: notification._id };
  }
  it('queues new mentions once, excludes self/unknown mentions and does not replay historic alerts', async () => {
    const { t, owner, admin, id, commentArgs, commentId, notificationId } = await mentioned();
    await owner.mutation(api.planner.addComment, commentArgs);
    await owner.mutation(api.planner.editComment, { id: commentId, revision: 0, text: '@admin@example.test updated' });
    await owner.mutation(api.planner.addComment, { id, text: '@joshhknott@gmail.com @unknown@example.test', requestId: '00000000-0000-4000-8000-000000000002' });
    expect(await t.run(ctx => ctx.db.query('plannerNotifications').take(10))).toHaveLength(1);
    expect(await admin.query(api.planner.emailPreference, {})).toBe(true);
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toMatchObject({ attempt: 1, payload: { recipientEmail: 'admin@example.test', excerpt: '@Admin updated' } });
    await t.run(ctx => ctx.db.patch(notificationId, { emailDelivery: undefined }));
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
  });
  it.each(['disabled', 'revoked', 'deleted', 'removed'] as const)('does not send when %s before delivery', async state => {
    const { t, owner, admin, grantId, commentId, notificationId } = await mentioned();
    if (state === 'disabled') await admin.mutation(api.planner.setEmailPreference, { enabled: false });
    if (state === 'revoked') await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    if (state === 'deleted') await owner.mutation(api.planner.deleteComment, { id: commentId });
    if (state === 'removed') await owner.mutation(api.planner.editComment, { id: commentId, revision: 0, text: 'No longer needed' });
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
  });
  it('leases attempts, freezes retries after edits, and stops after confirmation', async () => {
    const { t, owner, commentId, notificationId } = await mentioned();
    const first = (await t.mutation(internal.plannerEmail.prepare, { id: notificationId }))!;
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
    await owner.mutation(api.planner.editComment, { id: commentId, revision: 0, text: '@admin@example.test edited later' });
    await t.mutation(internal.plannerEmail.finish, { id: notificationId, attempt: 1, result: 'retry' });
    await t.run(async ctx => { const row = (await ctx.db.get(notificationId))!; await ctx.db.patch(notificationId, { emailDelivery: { ...row.emailDelivery!, nextAttemptAt: 0 } }); });
    const second = (await t.mutation(internal.plannerEmail.prepare, { id: notificationId }))!;
    expect(second.attempt).toBe(2); expect(second.payload).toEqual(first.payload);
    await t.mutation(internal.plannerEmail.finish, { id: notificationId, attempt: 1, result: 'sent' });
    expect((await t.run(ctx => ctx.db.get(notificationId)))?.emailDelivery?.status).toBe('pending');
    await t.mutation(internal.plannerEmail.finish, { id: notificationId, attempt: 2, result: 'sent' });
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
  });
  it('protects preferences with verified committee access and recipient-scoped settings', async () => {
    const { t, owner, admin } = await setup();
    await expect(t.mutation(api.planner.setEmailPreference, { enabled: false })).rejects.toThrow('Committee access');
    await admin.mutation(api.planner.setEmailPreference, { enabled: false });
    expect(await admin.query(api.planner.emailPreference, {})).toBe(false);
    expect(await owner.query(api.planner.emailPreference, {})).toBe(true);
  });
  it('executes signed background delivery and retries temporary failures before marking sent', async () => {
    const { t, notificationId } = await mentioned();
    vi.stubEnv('PLANNER_EMAIL_SECRET', 'local-test-only-email-relay-secret-1234');
    const relay = vi.fn().mockResolvedValueOnce(new Response(null, { status: 502 })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', relay);
    try {
      await t.action(internal.plannerEmail.deliver, { id: notificationId });
      expect((await t.run(ctx => ctx.db.get(notificationId)))?.emailDelivery).toMatchObject({ status: 'pending', attempts: 1 });
      await t.run(async ctx => { const row = (await ctx.db.get(notificationId))!; await ctx.db.patch(notificationId, { emailDelivery: { ...row.emailDelivery!, nextAttemptAt: 0 } }); });
      await t.action(internal.plannerEmail.deliver, { id: notificationId });
      expect((await t.run(ctx => ctx.db.get(notificationId)))?.emailDelivery).toMatchObject({ status: 'sent', attempts: 2 });
      expect(relay).toHaveBeenCalledTimes(2);
      const first = relay.mock.calls[0];
      expect(first[0]).toBe('https://surreyaisociety.org/api/planner-mention-email');
      expect(first[1].headers['X-Planner-Signature']).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.parse(relay.mock.calls[1][1].body).message).toEqual(JSON.parse(first[1].body).message);
      await t.action(internal.plannerEmail.deliver, { id: notificationId });
      expect(relay).toHaveBeenCalledTimes(2);
    } finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it('stops retrying after six unsuccessful attempts', async () => {
    const { t, notificationId } = await mentioned();
    for (let attempt = 1; attempt <= 6; attempt++) {
      await t.run(async ctx => { const row = (await ctx.db.get(notificationId))!; await ctx.db.patch(notificationId, { emailDelivery: { ...row.emailDelivery!, nextAttemptAt: 0 } }); });
      expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toMatchObject({ attempt });
      await t.mutation(internal.plannerEmail.finish, { id: notificationId, attempt, result: 'retry' });
    }
    expect((await t.run(ctx => ctx.db.get(notificationId)))?.emailDelivery?.status).toBe('failed');
    expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
  });
  it('expires uncertain delivery before the provider idempotency window ends', async () => {
    const { t, notificationId } = await mentioned();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 60 * 60 * 1000);
    try {
      expect(await t.mutation(internal.plannerEmail.prepare, { id: notificationId })).toBeNull();
      expect((await t.run(ctx => ctx.db.get(notificationId)))?.emailDelivery?.status).toBe('failed');
    } finally { clock.mockRestore(); }
  });
});

describe('team board workflow', () => {
  it('saves and clears a private waiting status without leaking it into publication', async () => {
    const { admin, t } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready', waitingOn: '  Budget approval  ' });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ waitingOn: 'Budget approval' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    await admin.mutation(api.planner.save, { id, revision: 2, activity, notes: '', owner: '', tasks: [] });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ waitingOn: 'Budget approval' });
    await expect(admin.mutation(api.planner.save, { id, revision: 3, activity, waitingOn: 'x'.repeat(161), notes: '', owner: '', tasks: [] })).rejects.toThrow('160 characters');
    await admin.mutation(api.planner.save, { id, revision: 3, activity, waitingOn: '', notes: '', owner: '', tasks: [] });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ waitingOn: '' });
    await expect(admin.mutation(api.planner.create, { activity, waitingOn: 'x'.repeat(161) })).rejects.toThrow('160 characters');
  });

  it('uses planner-only display names for previous activity, mentions and notifications', async () => {
    const { admin, owner, t } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
    const commentId = await admin.mutation(api.planner.addComment, { id, text: '@joshhknott@gmail.com please review', requestId: '00000000-0000-4000-8000-000000000001' });
    await admin.mutation(api.planner.setDisplayName, { name: 'Samuel Young' });
    await admin.mutation(api.planner.setDisplayName, { name: 'Sam' });
    expect(await admin.query(api.planner.access, {})).toMatchObject({ name: 'Sam' });
    expect((await owner.query(api.planner.get, { id }))?.createdBy).toMatchObject({ name: 'Sam', initials: 'S' });
    expect((await owner.query(api.planner.list, {}))[0].contributors?.[0].name).toBe('Sam');
    expect((await owner.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: null } })).page[0]).toMatchObject({ _id: commentId, author: { name: 'Sam' } });
    expect((await owner.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).page[0].author.name).toBe('Sam');
    expect((await owner.query(api.planner.mentionPeople, {})).find(person => person.email === 'admin@example.test')?.name).toBe('Sam');
    expect(await owner.query(api.planner.profiles, {})).toContainEqual(expect.objectContaining({ name: 'Sam', rosterName: 'Samuel Young' }));
    expect((await t.run(ctx => ctx.db.query('users').withIndex('by_email', q => q.eq('email', 'admin@example.test')).unique()))?.name).toBe('Admin');
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    await expect(t.mutation(api.planner.setDisplayName, { name: 'Imposter' })).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.setDisplayName, { name: ' '.repeat(4) })).rejects.toThrow('between 1 and 80');
    await expect(admin.mutation(api.planner.setDisplayName, { name: 'x'.repeat(81) })).rejects.toThrow('between 1 and 80');
  });

  it('uploads and downloads private PDFs and images, retries idempotently, and deletes stored files', async () => {
    const { admin, t, grantId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const pdf = new TextEncoder().encode('%PDF-1.4\nprivate committee document\n%%EOF');
    const upload = (requestId: string, body: Uint8Array = pdf, type = 'application/pdf', filename = 'Proposal.pdf') => admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers: { 'Content-Type': type, 'X-File-Name': encodeURIComponent(filename), 'X-Request-Id': requestId, Origin: 'https://surreyaisociety.org' }, body });
    const requestId = '00000000-0000-4000-8000-000000000001';
    const response = await upload(requestId); expect(response.status).toBe(200);
    const { fileId } = await response.json();
    expect((await upload(requestId)).status).toBe(200);
    expect(await admin.query(api.planner.listFiles, { id })).toHaveLength(1);
    expect((await admin.query(api.planner.listFiles, { id }))[0]).toMatchObject({ name: 'Proposal.pdf', uploadedBy: { name: 'Admin', initials: 'A' }, _creationTime: expect.any(Number) });
    expect(await t.run(ctx => ctx.db.system.query('_storage').take(20))).toHaveLength(1);
    const download = await admin.fetch(`/planner/files?fileId=${fileId}`);
    expect(download.status).toBe(200); expect(new Uint8Array(await download.arrayBuffer())).toEqual(pdf);
    expect(download.headers.get('cache-control')).toContain('no-store'); expect(download.headers.get('content-disposition')).toContain('attachment');
    expect((await t.fetch(`/planner/files?fileId=${fileId}`)).status).toBe(401);
    const gif = new TextEncoder().encode('GIF89a test image');
    expect((await upload('00000000-0000-4000-8000-000000000002', gif, 'image/gif', 'Photo.gif')).status).toBe(200);
    expect((await upload('00000000-0000-4000-8000-000000000003', new TextEncoder().encode('<html>unsafe</html>'), 'image/png', 'not-an-image.png')).status).toBe(415);
    expect((await upload('00000000-0000-4000-8000-000000000004', pdf, 'text/html', 'bad.html')).status).toBe(415);
    expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers: { Origin: 'https://unrelated.test' }, body: pdf })).status).toBe(403);
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    expect((await admin.fetch(`/planner/files?fileId=${fileId}`)).status).toBe(403);
    await expect(admin.mutation(api.planner.removeFile, { id: fileId })).rejects.toThrow('Committee access required');
    await t.run(ctx => ctx.db.patch(grantId, { active: true }));
    await admin.mutation(api.planner.removeFile, { id: fileId });
    expect((await admin.fetch(`/planner/files?fileId=${fileId}`)).status).toBe(403);
    expect(await t.run(ctx => ctx.db.system.query('_storage').take(20))).toHaveLength(1);
  });

  it('enforces file size, card scope and file counts without leaving rejected uploads in storage', async () => {
    const { admin, t, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const headers = { 'Content-Type': 'application/pdf', 'X-File-Name': 'Test.pdf', 'X-Request-Id': '00000000-0000-4000-8000-000000000001' };
    const body = new TextEncoder().encode('%PDF-1.4\ntest\n%%EOF');
    expect((await t.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers, body })).status).toBe(401);
    expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers: { ...headers, 'Content-Length': String(10 * 1024 * 1024 + 1) }, body })).status).toBe(413);
    await t.run(ctx => ctx.db.patch(id, { societyId: otherId }));
    expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers, body })).status).toBe(403);
    const ai = await t.run(ctx => ctx.db.query('societies').withIndex('by_slug', q => q.eq('slug', 'ai')).unique());
    await t.run(ctx => ctx.db.patch(id, { societyId: ai!._id }));
    for (let index = 0; index < 10; index++) expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers: { ...headers, 'X-Request-Id': `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }, body })).status).toBe(200);
    expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers: { ...headers, 'X-Request-Id': '00000000-0000-4000-8000-000000000099' }, body })).status).toBe(403);
    expect((await admin.fetch(`/planner/files?itemId=${id}`, { method: 'POST', headers, body })).status).toBe(200);
    expect(await t.run(ctx => ctx.db.system.query('_storage').take(20))).toHaveLength(10);
  });
  it('keeps attachment links private and rejects unsafe or excessive links', async () => {
    const { admin, t } = await setup();
    const attachments = [{ name: 'Proposal.pdf', url: 'https://example.test/proposal.pdf' }];
    const id = await admin.mutation(api.planner.create, { activity, attachments, stage: 'ready' });
    expect((await admin.query(api.planner.get, { id }))?.attachments).toEqual(attachments);
    await expect(admin.mutation(api.planner.save, { id, revision: 1, activity, notes: '', owner: '', tasks: [], attachments: [{ name: 'Unsafe', url: 'javascript:alert(1)' }] })).rejects.toThrow('https://');
    await expect(admin.mutation(api.planner.create, { activity, attachments: Array.from({ length: 11 }, () => attachments[0]) })).rejects.toThrow('up to 10');
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    await admin.mutation(api.planner.save, { id, revision: 2, activity, notes: '', owner: '', tasks: [], attachments: [] });
    expect((await admin.query(api.planner.get, { id }))?.attachments).toEqual([]);
  });
  it('shares list order with the committee and rejects stale or unauthorised changes', async () => {
    const { admin, t, societyId } = await setup();
    const original = ['ideas', 'planning', 'ready'] as const;
    const changed = ['ready', 'ideas', 'planning'] as const;
    expect(await admin.query(api.planner.boardLayout, {})).toEqual({ order: original, revision: 0 });
    await t.run(ctx => ctx.db.insert('plannerBoardLayouts', { societyId, order: ['done', 'ready', 'ideas', 'planning'], revision: 4 }));
    await t.run(async ctx => {
      for (let revision = 0; revision < 25; revision++) {
        await ctx.db.insert('plannerBoardLayouts', { societyId, workspace: 'hack2027', order: ['ideas', 'planning', 'ready'], revision });
      }
    });
    expect(await admin.query(api.planner.boardLayout, {})).toEqual({ order: ['ready', 'ideas', 'planning'], revision: 4 });
    await expect(t.query(api.planner.boardLayout, {})).rejects.toThrow('Committee access');
    await expect(t.mutation(api.planner.reorderBoard, { order: [...changed], revision: 0 })).rejects.toThrow('Committee access');
    await expect(admin.mutation(api.planner.reorderBoard, { order: ['ideas', 'ideas', 'ready'], revision: 0 })).rejects.toThrow('exactly once');
    expect(await admin.mutation(api.planner.reorderBoard, { order: [...changed], revision: 4 })).toBe(5);
    expect(await admin.query(api.planner.boardLayout, {})).toEqual({ order: changed, revision: 5 });
    await expect(admin.mutation(api.planner.reorderBoard, { order: [...original], revision: 0 })).rejects.toThrow('Someone else reordered');
    expect(await admin.query(api.planner.boardLayout, {})).toEqual({ order: changed, revision: 5 });
  });

  it('keeps Events, Outreach, and Hack workspaces isolated while defaulting legacy rows to Events', async () => {
    const { admin, t } = await setup();
    const outreach = await admin.mutation(api.planner.create, {
      activity: { ...activity, title: 'Partner conversations' }, workspace: 'outreach',
      outreachKind: 'Sponsor', nextAction: 'Send the brief',
    });
    const hack = await admin.mutation(api.planner.create, {
      activity: { ...activity, title: 'Hack venue shortlist' }, workspace: 'hack2027',
      checklistGroup: 'Venue', checklistDone: false,
    });
    const hackWithDone = await admin.mutation(api.planner.create, {
      activity: { ...activity, title: 'Completed Hack decision' }, workspace: 'hack2027',
      checklistGroup: 'Programme', checklistDone: true,
    });
    const legacy = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Legacy event' } });
    await t.run(ctx => ctx.db.patch(legacy, { workspace: undefined }));
    expect((await admin.query(api.planner.list, { workspace: 'events' })).map(item => item._id)).toContain(legacy);
    expect((await admin.query(api.planner.list, { workspace: 'events' })).map(item => item._id)).not.toContain(outreach);
    expect((await admin.query(api.planner.list, { workspace: 'outreach' })).map(item => item._id)).toEqual([outreach]);
    expect((await admin.query(api.planner.list, { workspace: 'hack2027' })).map(item => item._id)).toEqual(expect.arrayContaining([hack, hackWithDone]));
    expect(await admin.query(api.planner.get, { id: legacy })).toMatchObject({ workspace: 'events' });
    expect(await admin.query(api.planner.get, { id: outreach })).toMatchObject({ internalOnly: true, outreachKind: 'Sponsor', nextAction: 'Send the brief' });
    await expect(admin.mutation(api.planner.publish, { id: outreach, revision: 1 })).rejects.toThrow('Only Events');
    await expect(admin.mutation(api.planner.setChecklistDone, { id: outreach, revision: 1, done: true })).rejects.toThrow('Hack 2027');
    await admin.mutation(api.planner.save, {
      id: outreach, revision: 1, activity: { ...activity, title: 'Partner conversations' }, workspace: 'events',
      internalOnly: false, notes: '', owner: '', tasks: [],
    });
    expect(await admin.query(api.planner.get, { id: outreach })).toMatchObject({ workspace: 'events' });
    expect(await admin.query(api.planner.get, { id: outreach })).not.toHaveProperty('outreachKind');
    expect(await admin.query(api.planner.get, { id: outreach })).not.toHaveProperty('nextAction');
    await admin.mutation(api.planner.save, {
      id: hackWithDone, revision: 1, activity: { ...activity, title: 'Completed Hack decision' }, workspace: 'events',
      internalOnly: false, notes: '', owner: '', tasks: [],
    });
    expect(await admin.query(api.planner.get, { id: hackWithDone })).toMatchObject({ workspace: 'events' });
    expect(await admin.query(api.planner.get, { id: hackWithDone })).not.toHaveProperty('checklistGroup');
    expect(await admin.query(api.planner.get, { id: hackWithDone })).not.toHaveProperty('checklistDone');
    await expect(admin.mutation(api.planner.publish, { id: hack, revision: 1 })).rejects.toThrow('Only Events');
    expect(await admin.query(api.planner.boardLayout, { workspace: 'events' })).toMatchObject({ revision: 0 });
    expect(await admin.query(api.planner.boardLayout, { workspace: 'outreach' })).toMatchObject({ revision: 0 });
    await admin.mutation(api.planner.reorderBoard, { workspace: 'outreach', order: ['ready', 'ideas', 'planning'], revision: 0 });
    expect(await admin.query(api.planner.boardLayout, { workspace: 'events' })).toMatchObject({ order: ['ideas', 'planning', 'ready'], revision: 0 });
    expect(await admin.query(api.planner.boardLayout, { workspace: 'outreach' })).toMatchObject({ order: ['ready', 'ideas', 'planning'], revision: 1 });
  });

  it('keeps legacy Events visible when more than 200 newer non-Events cards share a stage', async () => {
    const { admin, t, societyId } = await setup();
    const legacy = await t.run(ctx => ctx.db.insert('plannerItems', {
      ...activity, societyId, stage: 'ideas', notes: '', owner: '', tasks: [], revision: 1, updatedAt: 1,
    }));
    await t.run(async ctx => {
      for (let index = 0; index < 205; index++) {
        await ctx.db.insert('plannerItems', {
          ...activity, title: `Outreach ${index}`, societyId, workspace: 'outreach', internalOnly: true,
          stage: 'ideas', notes: '', owner: '', tasks: [], revision: 1, updatedAt: index + 2,
        });
      }
    });
    const events = await admin.query(api.planner.list, { workspace: 'events' });
    expect(events.map(item => item._id)).toContain(legacy);
    expect(events).toHaveLength(1);
  });

  it('seeds the Hack checklist once, leaves cards unassigned, and requires committee access', async () => {
    const { admin, t } = await setup();
    await expect(t.mutation(api.planner.seedHackChecklist, {})).rejects.toThrow('Committee access');
    const first = await admin.mutation(api.planner.seedHackChecklist, {});
    expect(first).toEqual({ created: HACK_CHECKLIST_TEMPLATE.length, alreadySeeded: false });
    const seeded = await admin.query(api.planner.list, { workspace: 'hack2027' });
    expect(seeded).toHaveLength(HACK_CHECKLIST_TEMPLATE.length);
    expect(seeded.every(item => item.owner === '' && item.internalOnly && item.date === '' && item.checklistDone === false)).toBe(true);
    expect(seeded.every(item => item.tasks.every(task => task.done === false))).toBe(true);
    const firstCard = seeded[0];
    expect(await admin.mutation(api.planner.setChecklistDone, { id: firstCard._id, revision: firstCard.revision, done: true })).toBe(firstCard.revision + 1);
    expect(await admin.query(api.planner.get, { id: firstCard._id })).toMatchObject({ checklistDone: true, revision: firstCard.revision + 1 });
    await expect(admin.mutation(api.planner.setChecklistDone, { id: firstCard._id, revision: firstCard.revision, done: false })).rejects.toThrow('Someone else updated');
    const second = await admin.mutation(api.planner.seedHackChecklist, {});
    expect(second).toEqual({ created: 0, alreadySeeded: true });
    expect(await admin.query(api.planner.list, { workspace: 'hack2027' })).toHaveLength(HACK_CHECKLIST_TEMPLATE.length);
    const markerRows = await t.run(ctx => ctx.db.query('plannerSetups').take(10));
    expect(markerRows).toHaveLength(1);
  });
  it('persists and clears teams, keeps internal work private and preserves overdue tasks', async () => {
    const { admin, t } = await setup();
    const id = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Sponsor proposal', date: '2020-01-01' }, team: 'industry', internalOnly: true, stage: 'ready' });
    const item = (await admin.query(api.planner.get, { id }))!;
    expect(item).toMatchObject({ team: 'industry', internalOnly: true, kind: 'project' });
    await expect(admin.mutation(api.planner.publish, { id, revision: 1 })).rejects.toThrow('Internal cards');
    await t.mutation(internal.planner.archivePastEvents, {});
    expect((await admin.query(api.planner.get, { id }))?.stage).toBe('ready');
    await admin.mutation(api.planner.save, { id, revision: 1, activity, team: null, stage: 'done', notes: '', owner: '', tasks: [] });
    expect(await admin.query(api.planner.list, {})).not.toContainEqual(expect.objectContaining({ _id: id }));
    expect(await admin.query(api.planner.list, { archived: true })).toContainEqual(expect.objectContaining({ _id: id, team: null, stage: 'archived', internalOnly: true }));
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  });

  it('assigns multiple teams and a roster lead while preserving private metadata', async () => {
    const { admin, t } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, teams: ['industry', 'events'], lead: 'Ibrahim Haque', stage: 'ready' });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ teams: ['industry', 'events'], lead: 'Ibrahim Haque', team: null });
    expect((await admin.query(api.planner.calendar, { month: '2026-10' })).items).toContainEqual(expect.objectContaining({ _id: id, teams: ['industry', 'events'] }));
    await expect(admin.mutation(api.planner.save, { id, revision: 1, activity, teams: ['events', 'events'], notes: '', owner: '', tasks: [] })).rejects.toThrow('only once');
    await expect(admin.mutation(api.planner.save, { id, revision: 1, activity, lead: 'Someone Else', notes: '', owner: '', tasks: [] })).rejects.toThrow('committee board');
    await admin.mutation(api.planner.save, { id, revision: 1, activity, teams: ['learning'], lead: 'Poppy Holmes', notes: '', owner: '', tasks: [] });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ teams: ['learning'], lead: 'Poppy Holmes' });
    await admin.mutation(api.planner.publish, { id, revision: 2 });
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    expect(JSON.stringify(await t.query(api.planner.listPublished, {}))).not.toContain('Poppy Holmes');
  });

  it('moves published cards without changing public content and still supports explicit unpublish', async () => {
    const { admin, t } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, team: 'learning', stage: 'ready' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    await admin.mutation(api.planner.moveOnBoard, { id, revision: 2, stage: 'done' });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ stage: 'archived' });
    expect(await t.query(api.planner.getPublished, { id })).toBeNull();
    expect(JSON.stringify(await t.query(api.planner.listPublished, {}))).not.toContain('learning');
    await expect(admin.mutation(api.planner.moveOnBoard, { id, revision: 2, stage: 'ideas' })).rejects.toThrow('Someone else updated');
    await expect(t.mutation(api.planner.moveOnBoard, { id, revision: 3, stage: 'ideas' })).rejects.toThrow('Committee access');
    await expect(admin.mutation(api.planner.save, { id, revision: 3, activity, internalOnly: true, notes: '', owner: '', tasks: [] })).rejects.toThrow('Unpublish');
    await admin.mutation(api.planner.move, { id, revision: 3, stage: 'ready' });
    expect(await t.query(api.planner.getPublished, { id })).toBeNull();
  });
});
async function setup(role: 'admin' | 'member' = 'admin', slug = 'ai') {
  const t = convexTest(schema, modules);
  const tokenIdentifier = 'https://planner.test|admin';
  const ids = await t.run(async ctx => {
    const societyId = await ctx.db.insert('societies', { name: 'AI Society', shortName: 'AI', slug: 'ai', domain: 'example.test' });
    const otherId = await ctx.db.insert('societies', { name: 'Business', shortName: 'Business', slug: 'business', domain: 'business.test' });
    const userId = await ctx.db.insert('users', { email: 'admin@example.test', name: 'Admin', clerkId: tokenIdentifier });
    const membershipId = await ctx.db.insert('memberships', { userId, societyId: slug === 'ai' ? societyId : otherId, role, status: 'active' });
    const grantId = await ctx.db.insert('plannerAccess', { societyId, email: 'admin@example.test', active: role === 'admin' && slug === 'ai' });
    return { societyId, otherId, membershipId, grantId };
  });
  const admin = t.withIdentity({ subject: 'admin', issuer: 'https://planner.test', tokenIdentifier, email: 'admin@example.test' });
  const owner = t.withIdentity({ subject: 'owner', issuer: 'https://planner.test', tokenIdentifier: 'https://planner.test|owner', email: 'joshhknott@gmail.com', emailVerified: true });
  return { t, admin, owner, ...ids };
}

describe('committee planner access', () => {
  it('rejects anonymous users, ordinary members and another society’s admins', async () => {
    const { t } = await setup();
    expect(await t.query(api.planner.access, {})).toBeNull();
    await expect(t.query(api.planner.list, {})).rejects.toThrow('Committee access required');
    await expect(t.mutation(api.planner.create, { activity })).rejects.toThrow('Committee access required');
    for (const [role, slug] of [['member', 'ai'], ['admin', 'business']] as const) {
      const { admin } = await setup(role, slug);
      expect(await admin.query(api.planner.access, {})).toBeNull();
      await expect(admin.query(api.planner.list, {})).rejects.toThrow('Committee access required');
    }
  });

  it('requires an explicit committee grant and immediately honours revocation', async () => {
    const { t, owner } = await setup();
    const committee = t.withIdentity({ subject: 'committee', issuer: 'https://planner.test', tokenIdentifier: 'https://planner.test|committee', email: 'person@example.test' });
    expect(await committee.query(api.planner.access, {})).toBeNull();
    await owner.mutation(api.planner.setAccess, { email: ' PERSON@example.test ', active: true });
    expect(await committee.query(api.planner.access, {})).toMatchObject({ canManageAccess: false });
    await committee.mutation(api.planner.create, { activity });
    await expect(committee.query(api.planner.listAccess, {})).rejects.toThrow('Only the planner owner');
    await expect(committee.mutation(api.planner.setAccess, { email: 'stranger@example.test', active: true })).rejects.toThrow('Only the planner owner');
    await owner.mutation(api.planner.setAccess, { email: 'person@example.test', active: false });
    await expect(committee.query(api.planner.list, {})).rejects.toThrow('Committee access required');
    await expect(committee.mutation(api.planner.create, { activity })).rejects.toThrow('Committee access required');
  });

  it('requires manually granted email access even for active society admins', async () => {
    const { t, admin, grantId } = await setup();
    expect(await admin.query(api.planner.access, {})).toMatchObject({ canManageAccess: false });
    await expect(admin.query(api.planner.listAccess, {})).rejects.toThrow('Only the planner owner');
    await expect(admin.mutation(api.planner.setAccess, { email: 'stranger@example.test', active: true })).rejects.toThrow('Only the planner owner');
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    expect(await admin.query(api.planner.access, {})).toBeNull();
  });

  it('bootstraps the owner from the authenticated email without a society membership', async () => {
    const { owner } = await setup();
    expect(await owner.query(api.planner.access, {})).toMatchObject({ email: 'joshhknott@gmail.com', canManageAccess: true });
    await owner.mutation(api.planner.setAccess, { email: 'committee@example.test', active: true });
    expect(await owner.query(api.planner.listAccess, {})).toContainEqual({ email: 'committee@example.test', active: true });
    await expect(owner.mutation(api.planner.setAccess, { email: 'JOSHHKNOTT@gmail.com', active: false })).rejects.toThrow('always has access');
  });

  it('does not trust an unverified email or a stored profile email for owner access', async () => {
    const { t } = await setup();
    const tokenIdentifier = 'https://planner.test|impostor';
    await t.run(ctx => ctx.db.insert('users', { email: 'joshhknott@gmail.com', name: 'Impostor', clerkId: tokenIdentifier }));
    for (const claims of [{}, { email: 'joshhknott@gmail.com', emailVerified: false }, { email: 'other@example.test', emailVerified: true }]) {
      const actor = t.withIdentity({ subject: 'impostor', issuer: 'https://planner.test', tokenIdentifier, ...claims });
      expect(await actor.query(api.planner.access, {})).toBeNull();
      await expect(actor.mutation(api.planner.setAccess, { email: 'stranger@example.test', active: true })).rejects.toThrow('Committee access required');
    }
  });
});

describe('explicit publication and privacy', () => {
  it('accepts a simple idea without logistics, keeping optional collaborators private', async () => {
    const { t, admin } = await setup();
    const idea = { ...activity, description: '', date: '', startTime: '', endTime: '', location: '', registrationUrl: '' };
    const id = await admin.mutation(api.planner.create, { activity: idea, owner: 'Josh, Mosie' });
    expect(await admin.query(api.planner.list, {})).toContainEqual(expect.objectContaining({ _id: id, stage: 'ideas', owner: 'Josh, Mosie' }));
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
  });

  it('publishes events and hackathons without booking links but still requires a public description', async () => {
    const { t, admin } = await setup();
    for (const kind of ['event', 'hackathon'] as const) {
      const withoutBookingLink = { ...activity, kind, registrationUrl: '' };
      const id = await admin.mutation(api.planner.create, { activity: withoutBookingLink, stage: 'ready' });
      await admin.mutation(api.planner.publish, { id, revision: 1 });
      expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...withoutBookingLink });
    }

    const missingDescription = await admin.mutation(api.planner.create, {
      activity: { ...activity, description: '', registrationUrl: '' }, stage: 'ready',
    });
    await expect(admin.mutation(api.planner.publish, { id: missingDescription, revision: 1 })).rejects.toThrow('public description');
    expect(await t.query(api.planner.getPublished, { id: missingDescription })).toBeNull();
  });
  it('keeps Ideas, Planning and Ready private, including direct activity requests', async () => {
    const { t, admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, notes: 'Private contact details', owner: 'Committee', tasks: [{ text: 'Private preparation', done: false }] });
    await expect(admin.mutation(api.planner.publish, { id, revision: 1 })).rejects.toThrow('Ready');
    await admin.mutation(api.planner.move, { id, revision: 1, stage: 'planning' });
    await admin.mutation(api.planner.move, { id, revision: 2, stage: 'ready' });
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
    expect(await t.query(api.planner.getPublished, { id })).toBeNull();
    await admin.mutation(api.planner.publish, { id, revision: 3 });
    const [published] = await t.query(api.planner.listPublished, {});
    expect(published).toEqual({ id, ...activity });
    const direct = await t.query(api.planner.getPublished, { id });
    expect(direct).toEqual(published);
    for (const key of ['notes', 'tasks', 'owner', 'societyId', 'revision', 'publishedAt', 'stage']) expect(published).not.toHaveProperty(key);
  });

  it('holds published edits as drafts until republishing, then removes content when unpublished', async () => {
    const { t, admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    const edited = { ...activity, title: 'Revised workshop' };
    await admin.mutation(api.planner.save, { id, revision: 2, activity: edited, notes: 'New private note', owner: '', tasks: [] });
    expect((await t.query(api.planner.listPublished, {}))[0].title).toBe(activity.title);
    await admin.mutation(api.planner.publish, { id, revision: 3 });
    expect((await t.query(api.planner.listPublished, {}))[0].title).toBe('Revised workshop');
    await admin.mutation(api.planner.move, { id, revision: 4, stage: 'ready' });
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
    expect(await t.query(api.planner.getPublished, { id })).toBeNull();
    const [privateItem] = await admin.query(api.planner.list, {});
    expect(privateItem.notes).toBe('New private note');
    expect(privateItem.published).toBeUndefined();
  });

  it('checks validation and revision conflicts, and supports undated projects', async () => {
    const { t, admin } = await setup();
    await expect(admin.mutation(api.planner.create, { activity: { ...activity, registrationUrl: 'javascript:alert(1)' } })).rejects.toThrow('https://');
    await expect(admin.mutation(api.planner.create, { activity: { ...activity, date: '2026-02-30' } })).rejects.toThrow('valid date');
    const id = await admin.mutation(api.planner.create, { activity: { ...activity, date: '' }, stage: 'ready' });
    await expect(admin.mutation(api.planner.publish, { id, revision: 1 })).rejects.toThrow('date, start time');
    await admin.mutation(api.planner.move, { id, revision: 1, stage: 'planning' });
    await expect(admin.mutation(api.planner.move, { id, revision: 1, stage: 'ready' })).rejects.toThrow('Someone else updated');
    const projectId = await admin.mutation(api.planner.create, { activity: { ...activity, kind: 'project', date: '', startTime: '', endTime: '', location: '' }, stage: 'ready' });
    await admin.mutation(api.planner.publish, { id: projectId, revision: 1 });
    expect((await t.query(api.planner.listPublished, {}))[0].kind).toBe('project');
  });

  it('archives without deleting and never exposes cross-society records', async () => {
    const { t, admin, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    await admin.mutation(api.planner.move, { id, revision: 2, stage: 'archived' });
    expect(await t.query(api.planner.listPublished, {})).toEqual([]);
    expect(await admin.query(api.planner.list, {})).toEqual([]);
    expect(await admin.query(api.planner.list, { archived: true })).toHaveLength(1);
    await admin.mutation(api.planner.move, { id, revision: 3, stage: 'ideas' });
    const other = await t.run(ctx => ctx.db.insert('plannerItems', { ...activity, societyId: otherId, stage: 'published', published: activity, notes: 'Private', owner: '', tasks: [], revision: 1, updatedAt: Date.now() }));
    expect(await t.query(api.planner.getPublished, { id: other })).toBeNull();
    await expect(admin.mutation(api.planner.publish, { id: other, revision: 1 })).rejects.toThrow('Activity not found');
  });
});

describe('private card activity', () => {
  it('returns card authors and stage changes, omits no-op saves, and paginates', async () => {
    const { admin, owner } = await setup();
    await owner.mutation(api.planner.setDisplayName, { name: 'Maya Patel' });
    const id = await admin.mutation(api.planner.create, { activity });
    await owner.mutation(api.planner.save, { id, revision: 1, activity, notes: '', owner: '', tasks: [] });
    await owner.mutation(api.planner.move, { id, revision: 2, stage: 'planning' });
    await owner.mutation(api.planner.move, { id, revision: 3, stage: 'ready' });
    await owner.mutation(api.planner.move, { id, revision: 4, stage: 'done' });
    const first = await admin.query(api.planner.listActivity, { id, paginationOpts: { numItems: 2, cursor: null } });
    expect(first.page).toHaveLength(2);
    expect(first.page[0]).toMatchObject({ author: { name: 'Maya Patel' }, text: expect.stringContaining('Done') });
    expect(first.isDone).toBe(false);
    const second = await admin.query(api.planner.listActivity, { id, paginationOpts: { numItems: 30, cursor: first.continueCursor } });
    const all = [...first.page, ...second.page];
    expect(all).toHaveLength(4);
    expect(all.map(row => row.text).join(' ')).not.toContain('Updated this card');
    expect(all.map(row => row.text).join(' ')).toContain('Created this card');
  });

  it('records meaningful edits and keeps activity private to the card society', async () => {
    const { t, admin, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const edited = { ...activity, date: '2026-11-02' };
    await admin.mutation(api.planner.save, { id, revision: 1, activity: edited, notes: '', owner: '', tasks: [] });
    const activityRows = await admin.query(api.planner.listActivity, { id, paginationOpts: { numItems: 30, cursor: null } });
    expect(activityRows.page[0].text).toContain('due date');
    const other = await t.run(ctx => ctx.db.insert('plannerItems', { ...activity, societyId: otherId, stage: 'ideas', notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now() }));
    await expect(admin.query(api.planner.listActivity, { id: other, paginationOpts: { numItems: 30, cursor: null } })).rejects.toThrow('Activity not found');
  });

  it('normalizes frontend null defaults without inventing lead or team changes', async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    await admin.mutation(api.planner.save, {
      id, revision: 1, activity, lead: null, team: null, internalOnly: false,
      notes: '', owner: '', tasks: [{ text: 'Confirm the room', done: true }],
    });
    const rows = await admin.query(api.planner.listActivity, { id, paginationOpts: { numItems: 30, cursor: null } });
    expect(rows.page[0].text).toContain('checklist');
    expect(rows.page[0].text).not.toContain('lead');
    expect(rows.page[0].text).not.toContain('teams');
  });

  it('keeps attribution and updated time stable for a true no-op save', async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const before = await admin.query(api.planner.get, { id });
    await admin.mutation(api.planner.save, { id, revision: 1, activity, notes: '', owner: '', tasks: [] });
    const after = await admin.query(api.planner.get, { id });
    expect(after?.updatedAt).toBe(before?.updatedAt);
    expect(after?.contributors).toEqual(before?.contributors);
    expect(after?.revision).toBe(2);
  });
});

it('limits AI drafting by the authenticated identity', async () => {
  const { admin, t } = await setup();
  await expect(t.mutation(api.planner.reserveDraft, {})).rejects.toThrow('Committee access required');
  for (let i = 0; i < 10; i++) expect(await admin.mutation(api.planner.reserveDraft, {})).toBe(true);
  expect(await admin.mutation(api.planner.reserveDraft, {})).toBe(false);
});

describe('calendar history and automatic archiving', () => {
  it('archives an active published card when its due date is edited into the past', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
      const { admin, t } = await setup();
      const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
      await admin.mutation(api.planner.publish, { id, revision: 1 });
      await admin.mutation(api.planner.save, { id, revision: 2, activity: { ...activity, date: '2026-10-20' }, workflowStage: 'ready', notes: 'Keep the event history', owner: '', tasks: [] });
      const saved = await t.run(ctx => ctx.db.get(id));
      expect(saved).toMatchObject({ stage: 'archived', date: '2026-10-20', revision: 3, notes: 'Keep the event history' });
      expect(saved?.published).toBeUndefined(); expect(saved?.workflowStage).toBeUndefined();
      expect(await admin.query(api.planner.list, {})).toEqual([]);
      expect(await admin.query(api.planner.list, { archived: true })).toContainEqual(expect.objectContaining({ _id: id }));
      expect((await admin.query(api.planner.calendar, { month: '2026-10' })).items).toContainEqual(expect.objectContaining({ _id: id, stage: 'archived' }));
    } finally { vi.useRealTimers(); }
  });

  it('clears a projected published archive snapshot when rescheduling back to the board', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-29T19:59:00Z'));
      const { admin, t } = await setup();
      const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
      await admin.mutation(api.planner.publish, { id, revision: 1 });
      vi.setSystemTime(new Date('2026-10-29T20:01:00Z'));
      expect(await admin.query(api.planner.get, { id })).toMatchObject({ stage: 'archived', revision: 2 });
      await admin.mutation(api.planner.save, { id, revision: 2, activity: { ...activity, date: '2026-11-02' }, stage: 'planning', notes: '', owner: '', tasks: [] });
      const saved = await t.run(ctx => ctx.db.get(id));
      expect(saved).toMatchObject({ stage: 'planning', date: '2026-11-02', revision: 3 });
      expect(saved?.published).toBeUndefined(); expect(saved?.publishedAt).toBeUndefined(); expect(saved?.workflowStage).toBeUndefined();
      expect(await t.query(api.planner.listPublished, {})).toEqual([]);
    } finally { vi.useRealTimers(); }
  });

  it('projects a timed due card into archive before the cron runs and keeps the upcoming card active', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-29T20:01:00Z'));
      const { admin, t } = await setup();
      const now = new Date('2026-10-29T20:01:00Z').getTime();
      const due = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
      const upcoming = await admin.mutation(api.planner.create, { activity: { ...activity, title: 'Later workshop', endTime: '21:00' }, stage: 'ready' });
      expect((await admin.query(api.planner.list, { now })).map(item => item._id)).toContain(upcoming);
      expect((await admin.query(api.planner.list, { now })).map(item => item._id)).not.toContain(due);
      expect(await admin.query(api.planner.get, { id: due, now })).toMatchObject({ _id: due, stage: 'archived', revision: 1 });
      expect(await admin.query(api.planner.get, { id: upcoming, now })).toMatchObject({ _id: upcoming, stage: 'ready' });
      expect(await admin.query(api.planner.list, { archived: true, now })).toContainEqual(expect.objectContaining({ _id: due, stage: 'archived' }));
      expect((await admin.query(api.planner.calendar, { month: '2026-10', now })).items).toContainEqual(expect.objectContaining({ _id: due, stage: 'archived' }));
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(1);
    } finally { vi.useRealTimers(); }
  });

  it('reschedules a projected archived card before restoring it to the board', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-29T20:01:00Z'));
      const { admin, t } = await setup();
      const id = await admin.mutation(api.planner.create, { activity: { ...activity, date: '2026-10-01' }, stage: 'ready' });
      await t.mutation(internal.planner.archivePastEvents, {});
      await expect(admin.mutation(api.planner.move, { id, revision: 2, stage: 'ideas' })).rejects.toThrow('future date');
      await admin.mutation(api.planner.save, { id, revision: 2, activity: { ...activity, date: '2026-11-02' }, stage: 'planning', notes: '', owner: '', tasks: [] });
      expect(await admin.query(api.planner.get, { id })).toMatchObject({ stage: 'planning', date: '2026-11-02', revision: 3 });
      expect(await admin.query(api.planner.list, {})).toContainEqual(expect.objectContaining({ _id: id, stage: 'planning' }));
    } finally { vi.useRealTimers(); }
  });

  it('archives a finished timed event immediately and preserves its calendar entry', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-14T22:59:59Z'));
      const { t, admin } = await setup();
      const id = await admin.mutation(api.planner.create, { activity: { ...activity, date: '2026-07-14' }, stage: 'ready', notes: 'Keep these notes', owner: 'Josh, Mosie', tasks: [{ text: 'Prepare room', done: true }] });
      await admin.mutation(api.planner.publish, { id, revision: 1 });
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(1);
      vi.setSystemTime(new Date('2026-07-14T23:00:01Z'));
      expect(plannerToday()).toBe('2026-07-15');
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(0);
      expect(await admin.query(api.planner.list, {})).toEqual([]);
      expect(await admin.query(api.planner.list, { archived: true })).toContainEqual(expect.objectContaining({ _id: id, date: '2026-07-14', stage: 'archived', notes: 'Keep these notes', owner: 'Josh, Mosie', tasks: [{ text: 'Prepare room', done: true }], revision: 3 }));
      expect((await admin.query(api.planner.calendar, { month: '2026-07' })).items).toContainEqual(expect.objectContaining({ _id: id, date: '2026-07-14', stage: 'archived' }));
      expect(await t.query(api.planner.listPublished, {})).toEqual([]);
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(0);
      expect(plannerToday(new Date('2026-10-25T23:59:59Z'))).toBe('2026-10-25');
      expect(plannerToday(new Date('2026-10-26T00:00:00Z'))).toBe('2026-10-26');
    } finally { vi.useRealTimers(); }
  });

  it('archives in bounded batches while keeping today, future dates, undated ideas, projects and other societies active', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-15T11:00:00Z'));
      const { t, admin, societyId, otherId } = await setup();
      const kept = await t.run(async ctx => {
        for (let i = 0; i < 105; i++) await ctx.db.insert('plannerItems', { ...activity, date: '2026-10-14', kind: i % 2 ? 'hackathon' : 'event', stage: (['ideas', 'planning', 'ready', 'published'] as const)[i % 4], societyId, notes: 'Retained', owner: '', tasks: [], revision: 1, updatedAt: Date.now() });
        const ids = [];
        for (const [date, kind] of [['2026-10-15', 'event'], ['2026-10-16', 'hackathon'], ['', 'event'], ['2026-01-01', 'project']] as const) ids.push(await ctx.db.insert('plannerItems', { ...activity, date, kind, stage: 'ideas', societyId, notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now() }));
        ids.push(await ctx.db.insert('plannerItems', { ...activity, date: '2026-01-01', stage: 'ideas', societyId: otherId, notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now() }));
        return ids;
      });
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(100);
      await t.finishAllScheduledFunctions(() => { vi.runAllTimers(); });
      expect(await admin.query(api.planner.list, { archived: true })).toHaveLength(105);
      expect(await t.run(async ctx => Promise.all(kept.map(async id => (await ctx.db.get(id))?.stage)))).toEqual(Array(5).fill('ideas'));
      expect(await t.mutation(internal.planner.archivePastEvents, {})).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it('loads older calendar months independently of the archive list limit and enforces committee isolation', async () => {
    const { t, admin, societyId, otherId } = await setup();
    const [old, other] = await t.run(async ctx => {
      const old = await ctx.db.insert('plannerItems', { ...activity, date: '2025-12-31', stage: 'archived', societyId, notes: 'Private history', owner: '', tasks: [], revision: 1, updatedAt: Date.now() });
      for (let i = 0; i < 205; i++) await ctx.db.insert('plannerItems', { ...activity, date: '2026-01-01', stage: 'archived', societyId, notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now() });
      const other = await ctx.db.insert('plannerItems', { ...activity, date: '2025-12-31', stage: 'archived', societyId: otherId, notes: 'Another society', owner: '', tasks: [], revision: 1, updatedAt: Date.now() });
      return [old, other];
    });
    expect((await admin.query(api.planner.list, { archived: true })).some(item => item._id === old)).toBe(false);
    const result = await admin.query(api.planner.calendar, { month: '2025-12' });
    expect(result.hasMore).toBe(false); expect(result.items).toHaveLength(1); expect(result.items[0]._id).toBe(old);
    expect(result.items[0]).not.toHaveProperty('notes');
    expect((await admin.query(api.planner.calendar, { month: '2026-01' })).hasMore).toBe(true);
    expect(await admin.query(api.planner.get, { id: other })).toBeNull();
    await expect(t.query(api.planner.calendar, { month: '2025-12' })).rejects.toThrow('Committee access required');
    await expect(t.query(api.planner.get, { id: old })).rejects.toThrow('Committee access required');
    await expect(admin.query(api.planner.calendar, { month: '2026-13' })).rejects.toThrow('valid calendar month');
  });

  it('keeps an archived event editable and moves its calendar entry when rescheduled', async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'planning' });
    await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
    await admin.mutation(api.planner.save, { id, revision: 2, activity, notes: 'Historical notes', owner: '', tasks: [] });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ stage: 'archived', notes: 'Historical notes' });
    await admin.mutation(api.planner.save, { id, revision: 3, activity: { ...activity, date: '2026-11-02' }, stage: 'planning', notes: 'Historical notes', owner: '', tasks: [] });
    expect((await admin.query(api.planner.calendar, { month: '2026-10' })).items).toEqual([]);
    expect((await admin.query(api.planner.calendar, { month: '2026-11' })).items).toContainEqual(expect.objectContaining({ _id: id, stage: 'planning', date: '2026-11-02' }));
  });
});

describe('card attribution and private discussion', () => {
  const requestId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

  it('derives initials from names or email addresses', () => {
    expect(personInitials('Joshua Knott', 'joshhknott@gmail.com')).toBe('JK');
    expect(personInitials('', 'joshhknott@gmail.com')).toBe('J');
    expect(personInitials('', 'mosie.patel@example.test')).toBe('MP');
  });

  it('keeps the creator and unique editors attached using the authenticated account', async () => {
    const { t, admin, owner } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, owner: 'Untrusted collaborator name' });
    const created = await admin.query(api.planner.get, { id });
    expect(created?.createdBy).toMatchObject({ name: 'Admin', email: 'admin@example.test', initials: 'A' });
    expect(created?.contributors).toHaveLength(1);
    await owner.mutation(api.planner.save, { id, revision: 1, activity, notes: '', owner: '', tasks: [] });
    await owner.mutation(api.planner.move, { id, revision: 2, stage: 'ready' });
    await owner.mutation(api.planner.publish, { id, revision: 3 });
    const edited = await admin.query(api.planner.get, { id });
    expect(edited?.createdBy).toEqual(created?.createdBy);
    expect(edited?.contributors?.map(person => person.email)).toEqual(['admin@example.test', 'joshhknott@gmail.com']);
    const published = await t.query(api.planner.getPublished, { id });
    for (const key of ['createdBy', 'contributors', 'commentCount']) expect(published).not.toHaveProperty(key);
  });

  it('posts comments with server-derived authors and retries without duplicating or revising the card', async () => {
    const { t, admin, owner } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    const first = await owner.mutation(api.planner.addComment, { id, text: '  Can we book the larger room?  ', requestId: requestId(1) });
    expect(await owner.mutation(api.planner.addComment, { id, text: 'Can we book the larger room?', requestId: requestId(1) })).toBe(first);
    await expect(admin.mutation(api.planner.addComment, { id, text: 'Can we book the larger room?', requestId: requestId(1) })).rejects.toThrow('try posting');
    const item = await admin.query(api.planner.get, { id });
    expect(item).toMatchObject({ revision: 2, commentCount: 1 }); expect(item?.contributors).toHaveLength(1);
    const comments = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 20, cursor: null } });
    expect(comments.page).toHaveLength(1);
    expect(comments.page[0]).toMatchObject({ text: 'Can we book the larger room?', author: { email: 'joshhknott@gmail.com', initials: 'J' } });
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    expect(await t.query(api.planner.listPublished, {})).not.toContainEqual(expect.objectContaining({ commentCount: 1 }));
    await admin.mutation(api.planner.move, { id, revision: 2, stage: 'archived' });
    expect((await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 20, cursor: null } })).page).toHaveLength(1);
  });

  it('enforces access, society isolation and comment length without accepting forged authors', async () => {
    const { t, admin, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const other = await t.run(ctx => ctx.db.insert('plannerItems', { ...activity, societyId: otherId, stage: 'ideas', notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now() }));
    await expect(t.mutation(api.planner.addComment, { id, text: 'Hello', requestId: requestId(1) })).rejects.toThrow('Committee access required');
    await expect(t.query(api.planner.listComments, { id, paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.addComment, { id: other, text: 'Hello', requestId: requestId(1) })).rejects.toThrow('Activity not found');
    await expect(admin.query(api.planner.listComments, { id: other, paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow('Activity not found');
    for (const text of [' ', 'x'.repeat(2001)]) await expect(admin.mutation(api.planner.addComment, { id, text, requestId: requestId(1) })).rejects.toThrow('2,000');
    await expect(admin.mutation(api.planner.addComment, { id, text: 'Hello', requestId: 'bad' })).rejects.toThrow('try posting');
    const forged = { id, text: 'Forged author', requestId: requestId(9), author: { email: 'joshhknott@gmail.com' } };
    await expect(admin.mutation(api.planner.addComment, forged)).rejects.toThrow('author');
    await admin.mutation(api.planner.addComment, { id, text: '<script>alert(1)</script>', requestId: requestId(1) });
    expect((await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 20, cursor: null } })).page[0].author.email).toBe('admin@example.test');
    await t.run(async ctx => { const grant = await ctx.db.query('plannerAccess').first(); await ctx.db.patch(grant!._id, { active: false }); });
    await expect(admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 20, cursor: null } })).rejects.toThrow('Committee access required');
  });

  it('paginates discussion independently from card revisions', async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    for (let i = 0; i < 35; i++) await admin.mutation(api.planner.addComment, { id, text: `Comment ${i}`, requestId: requestId(i) });
    const first = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 1000, cursor: null } });
    expect(first.page).toHaveLength(30); expect(first.isDone).toBe(false);
    const second = await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: first.continueCursor } });
    expect(second.page).toHaveLength(5); expect(second.isDone).toBe(true);
    expect(new Set([...first.page, ...second.page].map(comment => comment._id)).size).toBe(35);
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ revision: 1, commentCount: 35 });
  });

  it('lets only the author edit or delete comments, including for the planner owner', async () => {
    const { t, admin, owner } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const commentId = await admin.mutation(api.planner.addComment, { id, text: 'Original comment', requestId: requestId(1) });
    const args = { id: commentId, text: 'Changed comment', revision: 0 };
    await expect(owner.mutation(api.planner.editComment, args)).rejects.toThrow('only change your own');
    await expect(owner.mutation(api.planner.deleteComment, { id: commentId })).rejects.toThrow('only change your own');
    await expect(t.mutation(api.planner.editComment, args)).rejects.toThrow('Committee access required');
    await expect(t.mutation(api.planner.deleteComment, { id: commentId })).rejects.toThrow('Committee access required');
    const updated = await admin.mutation(api.planner.editComment, { ...args, text: '  Changed comment  ' });
    expect(updated).toMatchObject({ text: 'Changed comment', revision: 1, author: { email: 'admin@example.test' } });
    expect(updated.editedAt).toEqual(expect.any(Number));
    expect(await admin.query(api.planner.access, {})).toMatchObject({ userId: updated.author.userId });
    expect(await admin.mutation(api.planner.deleteComment, { id: commentId })).toBeNull();
    expect(await t.run(ctx => ctx.db.get(commentId))).toBeNull();
    expect(await admin.query(api.planner.listComments, { id, paginationOpts: { numItems: 30, cursor: null } })).toMatchObject({ page: [] });
  });

  it('checks edit validation and conflicting tabs while making response-loss retries safe', async () => {
    const { admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const commentId = await admin.mutation(api.planner.addComment, { id, text: 'Original', requestId: requestId(1) });
    for (const text of [' ', 'x'.repeat(2001)]) await expect(admin.mutation(api.planner.editComment, { id: commentId, text, revision: 0 })).rejects.toThrow('2,000');
    const updated = await admin.mutation(api.planner.editComment, { id: commentId, text: 'Updated', revision: 0 });
    expect(await admin.mutation(api.planner.editComment, { id: commentId, text: 'Updated', revision: 0 })).toEqual(updated);
    await expect(admin.mutation(api.planner.editComment, { id: commentId, text: 'Stale tab overwrite', revision: 0 })).rejects.toThrow('comment changed');
    await admin.mutation(api.planner.editComment, { id: commentId, text: 'Latest edit', revision: 1 });
    await admin.mutation(api.planner.deleteComment, { id: commentId });
    await admin.mutation(api.planner.deleteComment, { id: commentId });
    await expect(admin.mutation(api.planner.editComment, { id: commentId, text: 'Restore', revision: 2 })).rejects.toThrow('Comment not found');
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ commentCount: 0, revision: 1 });
  });

  it('keeps discussion edits separate from card content, publication and archived history', async () => {
    const { t, admin } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, stage: 'ready' });
    await admin.mutation(api.planner.publish, { id, revision: 1 });
    const commentId = await admin.mutation(api.planner.addComment, { id, text: 'Original', requestId: requestId(1) });
    const before = await admin.query(api.planner.get, { id });
    await admin.mutation(api.planner.editComment, { id: commentId, text: 'Updated', revision: 0 });
    expect(await admin.query(api.planner.get, { id })).toEqual(before);
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    await admin.mutation(api.planner.move, { id, revision: 2, stage: 'archived' });
    const archived = await admin.query(api.planner.get, { id });
    await admin.mutation(api.planner.editComment, { id: commentId, text: 'Archived update', revision: 1 });
    await admin.mutation(api.planner.deleteComment, { id: commentId });
    expect(await admin.query(api.planner.get, { id })).toEqual({ ...archived, commentCount: 0 });
  });

  it('rejects revoked access and comments or parent cards belonging to another society', async () => {
    const { t, admin, owner, grantId, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    const commentId = await admin.mutation(api.planner.addComment, { id, text: 'Private', requestId: requestId(1) });
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    await expect(admin.mutation(api.planner.editComment, { id: commentId, text: 'Changed', revision: 0 })).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.deleteComment, { id: commentId })).rejects.toThrow('Committee access required');
    for (const target of ['comment', 'parent'] as const) {
      await t.run(async ctx => {
        const item = await ctx.db.get(id);
        await ctx.db.patch(target === 'comment' ? commentId : id, { societyId: otherId });
        if (target === 'parent') await ctx.db.patch(commentId, { societyId: item!.societyId });
      });
      await expect(owner.mutation(api.planner.editComment, { id: commentId, text: 'Changed', revision: 0 })).rejects.toThrow('Comment not found');
      await expect(owner.mutation(api.planner.deleteComment, { id: commentId })).rejects.toThrow('Comment not found');
    }
  });

  it('recovers legacy ownership from audit history without inventing attribution or changing revisions', async () => {
    const { t, admin, owner, societyId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity });
    await owner.mutation(api.planner.save, { id, revision: 1, activity, notes: '', owner: '', tasks: [] });
    const unknown = await t.run(async ctx => {
      await ctx.db.patch(id, { createdBy: undefined, contributors: undefined });
      return ctx.db.insert('plannerItems', { ...activity, societyId, stage: 'ideas', notes: '', owner: 'Josh', tasks: [], revision: 1, updatedAt: Date.now() });
    });
    expect(await t.mutation(internal.planner.backfillAttribution, {})).toBe(1);
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ createdBy: { email: 'admin@example.test' }, revision: 2 });
    expect((await admin.query(api.planner.get, { id }))?.contributors).toHaveLength(2);
    expect((await admin.query(api.planner.get, { id: unknown }))?.createdBy).toBeUndefined();
    expect(await t.mutation(internal.planner.backfillAttribution, {})).toBe(0);
  });
});

describe('private committee mentions and notifications', () => {
  const requestId = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const page = { paginationOpts: { numItems: 30, cursor: null } };

  it('parses canonical email mentions with punctuation and offsets without treating ordinary emails as mentions', () => {
    const text = 'Hi (@ADMIN@example.test), ask @joshhknott@gmail.com. Normal admin@example.test.';
    const tokens = mentionTokens(text);
    expect(tokens.map(token => token.email)).toEqual(['admin@example.test', 'joshhknott@gmail.com']);
    expect(tokens.map(token => text.slice(token.start, token.end))).toEqual(['@ADMIN@example.test', '@joshhknott@gmail.com']);
    expect(mentionTokens('@admin@example.test.evil-')).toEqual([]);
  });

  it('persists one notification per recipient, suppresses self mentions and keeps retries idempotent', async () => {
    const { t, admin, owner } = await setup();
    const id = await owner.mutation(api.planner.create, { activity, stage: 'ready' });
    await owner.mutation(api.planner.publish, { id, revision: 1 });
    const text = 'Can @ADMIN@example.test help? Thanks @admin@example.test and @joshhknott@gmail.com.';
    const commentId = await owner.mutation(api.planner.addComment, { id, text, requestId: requestId(1) });
    expect(await owner.mutation(api.planner.addComment, { id, text, requestId: requestId(1) })).toBe(commentId);
    const inbox = await admin.query(api.planner.notifications, page);
    expect(inbox.unreadCount).toBe(1); expect(inbox.page).toHaveLength(1);
    expect(inbox.page[0]).toMatchObject({ itemId: id, commentId, read: false, title: activity.title, author: { email: 'joshhknott@gmail.com' } });
    expect((await owner.query(api.planner.notifications, page)).page).toEqual([]);
    expect((await admin.query(api.planner.listComments, { id, ...page })).page[0].mentions?.map(person => person.email)).toEqual(['admin@example.test', 'joshhknott@gmail.com']);
    expect(await t.query(api.planner.getPublished, { id })).toEqual({ id, ...activity });
    expect(await admin.query(api.planner.get, { id })).toMatchObject({ revision: 2, commentCount: 1 });
  });

  it('only offers active AI committee emails and can notify someone before their first sign-in', async () => {
    const { t, admin, owner, otherId } = await setup();
    await owner.mutation(api.planner.setAccess, { email: 'pending@example.test', active: true });
    await owner.mutation(api.planner.setAccess, { email: 'revoked@example.test', active: false });
    await t.run(ctx => ctx.db.insert('plannerAccess', { societyId: otherId, email: 'business@example.test', active: true }));
    expect((await admin.query(api.planner.mentionPeople, {})).map(person => person.email).sort()).toEqual(['admin@example.test', 'joshhknott@gmail.com', 'pending@example.test']);
    const id = await admin.mutation(api.planner.create, { activity });
    await admin.mutation(api.planner.addComment, { id, text: '@pending@example.test @revoked@example.test @business@example.test @unknown@example.test', requestId: requestId(1) });
    const pending = t.withIdentity({ subject: 'pending', issuer: 'https://planner.test', email: 'pending@example.test', emailVerified: true });
    const inbox = await pending.query(api.planner.notifications, page);
    expect(inbox.unreadCount).toBe(1); expect(inbox.page[0].mentions?.map(person => person.email)).toEqual(['pending@example.test']);
    const invalid = t.withIdentity({ subject: 'unverified', issuer: 'https://planner.test', email: 'pending@example.test', emailVerified: false });
    await expect(invalid.query(api.planner.notifications, page)).rejects.toThrow('Committee access required');
  });

  it('adds only new recipients on edit, preserves read status, and retracts removed or deleted mentions', async () => {
    const { t, admin, owner } = await setup();
    await owner.mutation(api.planner.setAccess, { email: 'pending@example.test', active: true });
    const pending = t.withIdentity({ subject: 'pending', issuer: 'https://planner.test', email: 'pending@example.test', emailVerified: true });
    const id = await owner.mutation(api.planner.create, { activity });
    const commentId = await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test first draft', requestId: requestId(1) });
    const first = (await admin.query(api.planner.notifications, page)).page[0];
    await admin.mutation(api.planner.markNotificationRead, { id: first._id });
    const secondText = '@admin@example.test updated draft, @pending@example.test can you help?';
    await owner.mutation(api.planner.editComment, { id: commentId, text: secondText, revision: 0 });
    await owner.mutation(api.planner.editComment, { id: commentId, text: secondText, revision: 0 });
    expect(await admin.query(api.planner.notifications, page)).toMatchObject({ unreadCount: 0, page: [{ _id: first._id, read: true, text: secondText }] });
    expect((await pending.query(api.planner.notifications, page)).unreadCount).toBe(1);
    await owner.mutation(api.planner.editComment, { id: commentId, text: '@pending@example.test final draft', revision: 1 });
    expect((await admin.query(api.planner.notifications, page)).page).toEqual([]);
    expect((await pending.query(api.planner.notifications, page)).page).toHaveLength(1);
    await owner.mutation(api.planner.deleteComment, { id: commentId });
    expect((await pending.query(api.planner.notifications, page))).toMatchObject({ page: [], unreadCount: 0 });
    expect(await t.run(ctx => ctx.db.query('plannerNotifications').take(10))).toEqual([]);
  });

  it('restricts inbox reads and read receipts to the recipient and immediately honours revocation', async () => {
    const { t, admin, owner, grantId, otherId, societyId } = await setup();
    const id = await owner.mutation(api.planner.create, { activity });
    const commentId = await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test private', requestId: requestId(1) });
    const notification = (await admin.query(api.planner.notifications, page)).page[0];
    await expect(owner.mutation(api.planner.markNotificationRead, { id: notification._id })).rejects.toThrow('Notification not found');
    expect((await owner.query(api.planner.notifications, page)).page).toEqual([]);
    const otherNotification = await t.run(ctx => ctx.db.insert('plannerNotifications', { societyId: otherId, itemId: id, commentId, recipientEmail: 'admin@example.test', read: false }));
    await expect(admin.mutation(api.planner.markNotificationRead, { id: otherNotification })).rejects.toThrow('Notification not found');
    expect((await admin.query(api.planner.notifications, page)).page).toHaveLength(1);
    await expect(t.query(api.planner.mentionPeople, {})).rejects.toThrow('Committee access required');
    await expect(t.query(api.planner.notifications, page)).rejects.toThrow('Committee access required');
    await expect(t.mutation(api.planner.markNotificationRead, { id: notification._id })).rejects.toThrow('Committee access required');
    await expect(t.mutation(api.planner.markAllNotificationsRead, {})).rejects.toThrow('Committee access required');
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    await expect(admin.query(api.planner.notifications, page)).rejects.toThrow('Committee access required');
    await expect(admin.query(api.planner.mentionPeople, {})).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.markNotificationRead, { id: notification._id })).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.markAllNotificationsRead, {})).rejects.toThrow('Committee access required');
    await t.run(async ctx => { await ctx.db.patch(grantId, { active: true }); await ctx.db.patch(id, { societyId: otherId }); });
    expect((await admin.query(api.planner.notifications, page)).page).toEqual([]);
    await t.run(ctx => ctx.db.patch(id, { societyId }));
  });

  it('paginates notifications, caps unread badges, and marks all read in bounded recipient-only batches', async () => {
    const { admin, owner } = await setup();
    const id = await owner.mutation(api.planner.create, { activity });
    for (let index = 0; index < 105; index++) await owner.mutation(api.planner.addComment, { id, text: `@admin@example.test Update ${index}`, requestId: requestId(index) });
    await admin.mutation(api.planner.addComment, { id, text: '@joshhknott@gmail.com another recipient', requestId: requestId(106) });
    const first = await admin.query(api.planner.notifications, { paginationOpts: { numItems: 1000, cursor: null } });
    expect(first.page).toHaveLength(30); expect(first.isDone).toBe(false); expect(first.unreadCount).toBe(100);
    const second = await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: first.continueCursor } });
    expect(new Set([...first.page, ...second.page].map(row => row._id)).size).toBe(60);
    expect(await admin.mutation(api.planner.markAllNotificationsRead, {})).toEqual({ hasMore: true });
    expect((await admin.query(api.planner.notifications, page)).unreadCount).toBe(5);
    expect(await admin.mutation(api.planner.markAllNotificationsRead, {})).toEqual({ hasMore: false });
    expect((await admin.query(api.planner.notifications, page)).unreadCount).toBe(0);
    expect((await owner.query(api.planner.notifications, page)).unreadCount).toBe(1);
  });

  it('retains mention navigation on archived cards and bounds mention fanout', async () => {
    const { admin, owner } = await setup();
    const id = await owner.mutation(api.planner.create, { activity });
    await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test help with follow-up', requestId: requestId(1) });
    await owner.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
    expect((await admin.query(api.planner.notifications, page)).page[0].itemId).toBe(id);
    await expect(owner.mutation(api.planner.addComment, { id, text: Array.from({ length: 11 }, (_, index) => `@person${index}@example.test`).join(' '), requestId: requestId(2) })).rejects.toThrow('up to 10');
    expect(await owner.query(api.planner.get, { id })).toMatchObject({ commentCount: 1, revision: 2 });
  });

  it('signals every inbox change atomically and leaves retries and other recipients unchanged', async () => {
    const { admin, owner } = await setup();
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(0);
    const id = await owner.mutation(api.planner.create, { activity });
    const args = { id, text: '@admin@example.test please review', requestId: requestId(1) };
    const commentId = await owner.mutation(api.planner.addComment, args);
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(1);
    await owner.mutation(api.planner.addComment, args);
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(1);
    await owner.mutation(api.planner.editComment, { id: commentId, text: '@admin@example.test updated', revision: 0 });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(2);
    await owner.mutation(api.planner.editComment, { id: commentId, text: '@admin@example.test updated', revision: 0 });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(2);
    const notification = (await admin.query(api.planner.notifications, page)).page[0];
    await admin.mutation(api.planner.markNotificationRead, { id: notification._id });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(3);
    await admin.mutation(api.planner.markNotificationRead, { id: notification._id });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(3);
    await owner.mutation(api.planner.deleteComment, { id: commentId });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(4);
    await owner.mutation(api.planner.deleteComment, { id: commentId });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(4);
    expect(await owner.query(api.planner.notificationChanges, {})).toBe(0);
  });

  it('signals changed older notifications and read-all batches without requiring a backfill', async () => {
    const { t, admin, owner } = await setup();
    const id = await owner.mutation(api.planner.create, { activity });
    const commentId = await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test first mention', requestId: requestId(1) });
    await t.run(async ctx => { const state = await ctx.db.query('plannerNotificationState').first(); await ctx.db.delete(state!._id); });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(0);
    for (let index = 2; index <= 35; index++) await owner.mutation(api.planner.addComment, { id, text: `@admin@example.test newer mention ${index}`, requestId: requestId(index) });
    const before = await admin.query(api.planner.notificationChanges, {});
    expect((await admin.query(api.planner.notifications, page)).page.map(row => row.commentId)).not.toContain(commentId);
    await owner.mutation(api.planner.editComment, { id: commentId, text: '@admin@example.test older edited mention', revision: 0 });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(before + 1);
    await admin.mutation(api.planner.markAllNotificationsRead, {});
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(before + 2);
    await admin.mutation(api.planner.markAllNotificationsRead, {});
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(before + 2);
    await owner.mutation(api.planner.editComment, { id: commentId, text: 'Mention removed', revision: 1 });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(before + 3);
  });

  it('protects reactive state with the same authenticated recipient and current committee access', async () => {
    const { t, admin, owner, grantId } = await setup();
    await expect(t.query(api.planner.notificationChanges, {})).rejects.toThrow('Committee access required');
    const id = await owner.mutation(api.planner.create, { activity });
    await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test private', requestId: requestId(1) });
    const forged = { recipientEmail: 'admin@example.test' };
    await expect(owner.query(api.planner.notificationChanges, forged)).rejects.toThrow('recipientEmail');
    expect(await owner.query(api.planner.notificationChanges, {})).toBe(0);
    await t.run(ctx => ctx.db.patch(grantId, { active: false }));
    await expect(admin.query(api.planner.notificationChanges, {})).rejects.toThrow('Committee access required');
  });
});

describe('archived card deletion', () => {
  it('requires committee access, an archived card and the current revision', async () => {
    const { t, admin, otherId } = await setup();
    const id = await admin.mutation(api.planner.create, { activity, internalOnly: true });
    await expect(t.mutation(api.planner.deleteArchived, { id, revision: 1 })).rejects.toThrow('Committee access required');
    await expect(admin.mutation(api.planner.deleteArchived, { id, revision: 1 })).rejects.toThrow('Archive this card');
    await expect(admin.mutation(api.planner.deleteArchived, { id, revision: 0 })).rejects.toThrow('Someone else updated');
    await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
    await expect(admin.mutation(api.planner.deleteArchived, { id, revision: 1 })).rejects.toThrow('Someone else updated');
    await admin.mutation(api.planner.move, { id, revision: 2, stage: 'ready' });
    await expect(admin.mutation(api.planner.deleteArchived, { id, revision: 2 })).rejects.toThrow('Someone else updated');

    const foreign = await t.run(ctx => ctx.db.insert('plannerItems', {
      ...activity, societyId: otherId, stage: 'archived', notes: '', owner: '', tasks: [], revision: 1, updatedAt: Date.now(),
    }));
    await expect(admin.mutation(api.planner.deleteArchived, { id: foreign, revision: 1 })).rejects.toThrow('Activity not found');

    const overdue = await admin.mutation(api.planner.create, { activity: { ...activity, date: '2020-01-01' } });
    await admin.mutation(api.planner.deleteArchived, { id: overdue, revision: 1 });
    expect(await t.run(ctx => ctx.db.get(overdue))).toBeNull();
  });

  it('removes the card, private files, comments, notifications and activity, and invalidates the inbox', async () => {
    const { t, admin, owner, societyId } = await setup();
    const id = await owner.mutation(api.planner.create, { activity, internalOnly: true });
    const commentId = await owner.mutation(api.planner.addComment, { id, text: '@admin@example.test please review', requestId: '00000000-0000-4000-8000-000000000901' });
    const notification = (await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).page.find(row => row.commentId === commentId);
    if (!notification) throw new Error('Notification fixture missing');
    const storageId = await t.run(async ctx => {
      const user = (await ctx.db.query('users').withIndex('by_email', q => q.eq('email', 'joshhknott@gmail.com')).unique())!;
      const stored = await ctx.storage.store(new Blob(['private planner file'], { type: 'text/plain' }));
      await ctx.db.insert('plannerFiles', { societyId, itemId: id, storageId: stored, name: 'private.txt', contentType: 'text/plain', size: 20, uploadedBy: user._id, requestId: '00000000-0000-4000-8000-000000000902' });
      await ctx.db.insert('auditLogs', { societyId, userId: user._id, action: 'move_planner_item', targetId: id, targetType: 'plannerItem', details: 'Private activity row' });
      return stored;
    });
    await owner.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(1);
    await admin.mutation(api.planner.deleteArchived, { id, revision: 2 });

    expect(await t.run(ctx => ctx.db.get(id))).toBeNull();
    expect(await t.run(ctx => ctx.db.system.get('_storage', storageId))).toBeNull();
    expect(await t.run(ctx => ctx.db.query('plannerFiles').withIndex('by_itemId', q => q.eq('itemId', id)).take(10))).toHaveLength(0);
    expect(await t.run(ctx => ctx.db.query('plannerComments').withIndex('by_itemId', q => q.eq('itemId', id)).take(10))).toHaveLength(0);
    expect(await t.run(ctx => ctx.db.query('plannerNotifications').withIndex('by_itemId', q => q.eq('itemId', id)).take(10))).toHaveLength(0);
    expect(await t.run(ctx => ctx.db.query('auditLogs').withIndex('by_societyId_and_targetId', q => q.eq('societyId', societyId).eq('targetId', id)).take(10))).toHaveLength(0);
    expect(await admin.query(api.planner.notificationChanges, {})).toBe(2);
    expect(await admin.query(api.planner.notifications, { paginationOpts: { numItems: 30, cursor: null } })).toMatchObject({ page: [], unreadCount: 0 });
    expect(await t.run(ctx => ctx.db.get(notification._id))).toBeNull();
  });

  it('drains scheduled cleanup batches for unbounded children and invalidates the recipient state', async () => {
    vi.useFakeTimers();
    try {
      const { t, admin, societyId } = await setup();
      const id = await admin.mutation(api.planner.create, { activity, internalOnly: true });
      await t.run(async ctx => {
        const item = await ctx.db.get(id);
        if (!item?.createdBy) throw new Error('Card attribution fixture missing');
        for (let index = 0; index < 101; index++) {
          const suffix = String(index).padStart(12, '0');
          const commentId = await ctx.db.insert('plannerComments', {
            societyId, itemId: id, author: item.createdBy, text: `Bulk comment ${index}`,
            requestId: `00000000-0000-4000-8000-${suffix}`,
          });
          await ctx.db.insert('plannerNotifications', { societyId, itemId: id, commentId, recipientEmail: 'admin@example.test', read: false });
          await ctx.db.insert('auditLogs', { societyId, userId: item.createdBy.userId, action: 'move_planner_item', targetId: id, targetType: 'plannerItem', details: `Bulk activity ${index}` });
        }
      });
      await admin.mutation(api.planner.move, { id, revision: 1, stage: 'archived' });
      await admin.mutation(api.planner.deleteArchived, { id, revision: 2 });
      await t.finishAllScheduledFunctions(() => vi.runAllTimers());

      expect(await t.run(ctx => ctx.db.query('plannerComments').withIndex('by_itemId', q => q.eq('itemId', id)).take(10))).toHaveLength(0);
      expect(await t.run(ctx => ctx.db.query('plannerNotifications').withIndex('by_itemId', q => q.eq('itemId', id)).take(10))).toHaveLength(0);
      expect(await t.run(ctx => ctx.db.query('auditLogs').withIndex('by_societyId_and_targetId', q => q.eq('societyId', societyId).eq('targetId', id)).take(10))).toHaveLength(0);
      expect(await admin.query(api.planner.notificationChanges, {})).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
