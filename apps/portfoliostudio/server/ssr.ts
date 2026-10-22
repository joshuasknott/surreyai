import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PortfolioDocument } from "../shared/portfolio";
import { PortfolioRenderer } from "../src/portfolio/PortfolioRenderer";
import portfolioCss from "../src/portfolio/portfolio.css?raw";

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );

/** Render the exact same React portfolio renderer used by the editor/exporter. */
export function renderPublicPortfolio(
  document: PortfolioDocument,
  canonicalUrl: string,
): string {
  const markup = renderToStaticMarkup(
    createElement(PortfolioRenderer, { document, preview: true }),
  );
  const title = document.seo.title || document.name;
  const description =
    document.seo.description || document.profile.headline || document.name;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><link rel="stylesheet" href="/portfolio-fonts.css"><style>${portfolioCss}</style></head><body>${markup}</body></html>`;
}

export const publicSecurityHeaders = {
  "Content-Type": "text/html; charset=UTF-8",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline' 'self'; img-src https: http: data:; font-src 'self' https: data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; script-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};
