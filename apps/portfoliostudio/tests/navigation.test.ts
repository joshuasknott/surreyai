import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioRenderer } from "../src/portfolio/PortfolioRenderer";
import { createPersonalizedPortfolio } from "../src/data/personalize";
import { studentProfileSchema } from "../shared/student";

describe("portfolio navigation labels", () => {
  it("labels volunteering source sections separately from experience", () => {
    const profile = studentProfileSchema.parse({
      version: 1,
      name: "Sam Rivera",
      headline: "Computing student",
      volunteering: [
        {
          id: "volunteer-1",
          title: "Computing mentor",
          description: "Helping beginners learn to code.",
        },
      ],
    });
    const document = createPersonalizedPortfolio("signal-v2", profile);
    const volunteering = document.sections.find(
      (section) => section.sourceCategory === "volunteering",
    );
    expect(volunteering?.type).toBe("experience");

    const markup = renderToStaticMarkup(
      React.createElement(PortfolioRenderer, { document }),
    );
    expect(markup).toContain(">Volunteering</a>");
    expect(markup).not.toContain(">Experience</a>");

    // AI-created and older documents may name this section without source metadata.
    const legacy = structuredClone(document);
    const legacyVolunteering = legacy.sections.find(
      (section) => section.sourceCategory === "volunteering",
    )!;
    delete legacyVolunteering.sourceCategory;
    legacyVolunteering.title = "Volunteering";
    const legacyMarkup = renderToStaticMarkup(
      React.createElement(PortfolioRenderer, { document: legacy }),
    );
    expect(legacyMarkup).toContain(">Volunteering</a>");
    expect(legacyMarkup).not.toContain(">Experience</a>");
  });
});
