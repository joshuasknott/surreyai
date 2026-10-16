/** Canonical @email tokens keep plain-text editing unambiguous, even for duplicate names. */
export function mentionTokens(text: string) {
  const pattern = /(^|[^a-z0-9_@])@([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,})(?=$|[\s,;:!?)}\]"']|\.(?=$|[\s,;:!?)}\]"']))/gi;
  return [...text.matchAll(pattern)].map(match => ({
    email: match[2].toLowerCase(), start: match.index! + match[1].length,
    end: match.index! + match[0].length,
  }));
}
