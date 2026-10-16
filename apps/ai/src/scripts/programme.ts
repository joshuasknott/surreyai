import { activityDate, activityKind, upcomingActivities, type PublicActivity } from '../lib/programme';

const section = document.querySelector<HTMLElement>('[data-programme]');
if (section) {
  // Refresh only the public whitelist. This also updates an already-open homepage after unpublishing.
  const refresh = async () => {
    try {
      const response = await fetch('/api/programme', { cache: 'no-store' });
      if (!response.ok) return;
      const activities: PublicActivity[] = await response.json();
      const events = upcomingActivities(activities).slice(0, 4);
      const eventList = section.querySelector<HTMLElement>('[data-programme-events]')!;
      const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
      eventList.replaceChildren();
      for (const item of events) {
        const row = el('article', '', 'programme-event'); const date = el('time', '', 'programme-date'); date.dateTime = item.date;
        date.append(el('span', activityDate(item.date, { weekday: 'short' })), el('strong', activityDate(item.date, { day: 'numeric' })), el('span', activityDate(item.date, { month: 'short' })));
        const content = el('div', ''); content.append(el('h3', item.title), el('p', [activityKind(item), `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}`, item.location].filter(Boolean).join(' · '), 'programme-meta'), el('p', item.description, 'programme-summary'));
        const link = el('a', item.kind === 'hackathon' ? 'View hackathon' : 'View event', 'programme-link'); link.href = `/activities/${item.id}`; content.append(link); row.append(date, content); eventList.append(row);
      }
      if (!events.length) {
        const empty = el('div', '', 'programme-empty'); empty.append(el('h3', 'The next date is taking shape.'), el('p', 'We’ll post confirmed workshops, talks and hackathons here. Join our WhatsApp for society updates.'));
        const link = el('a', 'Join the WhatsApp', 'programme-link'); link.href = 'https://chat.whatsapp.com/HUQ8KayHBwXJsFYaRFk9Ge'; link.target = '_blank'; link.rel = 'noopener noreferrer'; empty.append(link); eventList.append(empty);
      }
    } catch { /* Keep the server-rendered public content when the network is unavailable. */ }
  };
  void refresh(); window.addEventListener('focus', () => void refresh());
  window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
}
