import type { Activity } from '../../../../convex/plannerModel';

export type PublicActivity = Activity & { id: string };
export const blankActivity = (): Activity => ({ title: '', kind: 'event', category: 'Workshop', description: '', date: '', startTime: '', endTime: '', location: '', registrationUrl: '' });
export function activityDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  return date ? new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : 'No date yet';
}
export function activityKind(item: Pick<Activity, 'kind' | 'category'>): string {
  return item.kind === 'project' ? 'Project' : item.kind === 'hackathon' ? 'Hackathon' : item.category || 'Event';
}
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function upcomingActivities(items: PublicActivity[], today = londonToday()): PublicActivity[] {
  return items.filter(item => item.kind !== 'project' && item.date >= today)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}
