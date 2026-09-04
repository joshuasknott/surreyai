export const UNION_OFFICER_ROLES = [
  'President',
  'Vice President',
  'Treasurer',
] as const;

export type UnionOfficerRole = (typeof UNION_OFFICER_ROLES)[number];

export type UnionCommitteeOfficer = {
  name: string;
  role: UnionOfficerRole;
};

const OFFICER_CARD_PATTERN =
  /<h4\b[^>]*class=["'][^"']*\bline-clamp-2\b[^"']*["'][^>]*>([\s\S]*?)<\/h4>[\s\S]{0,240}?<h5\b[^>]*>\s*(President|Vice[\s-]+President|Treasurer)\s*<\/h5>/gi;

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRole(value: string): UnionOfficerRole {
  const normalized = value.replace(/[\s-]+/g, ' ').trim().toLowerCase();
  if (normalized === 'president') return 'President';
  if (normalized === 'vice president') return 'Vice President';
  return 'Treasurer';
}

export function parseUnionCommitteeOfficers(html: string): UnionCommitteeOfficer[] {
  const byRole = new Map<UnionOfficerRole, UnionCommitteeOfficer>();

  for (const match of html.matchAll(OFFICER_CARD_PATTERN)) {
    const name = decodeHtmlText(match[1] ?? '');
    const role = normalizeRole(match[2] ?? '');
    if (!name || byRole.has(role)) continue;
    byRole.set(role, { name, role });
  }

  const missingRoles = UNION_OFFICER_ROLES.filter((role) => !byRole.has(role));
  if (missingRoles.length > 0) {
    throw new Error(
      `Students' Union page did not expose a complete officer roster. Missing: ${missingRoles.join(', ')}`,
    );
  }

  return UNION_OFFICER_ROLES.map((role) => byRole.get(role)!);
}

export async function fetchUnionCommitteeOfficers(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UnionCommitteeOfficer[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'SurreySocieties committee sync/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Students' Union page returned HTTP ${response.status}`);
    }

    const html = await response.text();
    if (html.length > 2_000_000) {
      throw new Error("Students' Union page was unexpectedly large");
    }

    return parseUnionCommitteeOfficers(html);
  } finally {
    clearTimeout(timeout);
  }
}
