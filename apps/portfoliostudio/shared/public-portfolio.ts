import type { PortfolioDocument } from "./portfolio";

/**
 * Return the document that may be rendered or returned outside the editor.
 * Canonical CV facts stay private, and hidden editor sections are not public.
 */
export function publicPortfolioDocument(document: PortfolioDocument) {
  const { student: _student, sections, ...publicDocument } = document;
  return {
    ...publicDocument,
    sections: sections.filter((section) => section.visible),
  };
}
