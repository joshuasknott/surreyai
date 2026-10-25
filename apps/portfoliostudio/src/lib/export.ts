import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import portfolioCss from "../portfolio/portfolio.css?raw";
import { PortfolioRenderer } from "../portfolio/PortfolioRenderer";
import {
  portfolioSchema,
  type PortfolioDocument,
} from "../../shared/portfolio";
import { publicPortfolioDocument } from "../../shared/public-portfolio";
import { studentCategories } from "../../shared/student";

const fontFiles = [
  {
    family: "Inter",
    url: "/fonts/inter.woff2",
    filename: "inter.woff2",
    weight: "100 900",
  },
  {
    family: "Fraunces",
    url: "/fonts/fraunces.woff2",
    filename: "fraunces.woff2",
    weight: "100 900",
  },
  {
    family: "Space Grotesk",
    url: "/fonts/space-grotesk.woff2",
    filename: "space-grotesk.woff2",
    weight: "300 700",
  },
  {
    family: "IBM Plex Mono",
    url: "/fonts/plex-mono.woff2",
    filename: "plex-mono.woff2",
    weight: "400",
  },
] as const;

const MAX_ARCHIVE_IMAGE_BYTES = 12_000_000;
const MAX_INLINE_IMAGE_BYTES = 400_000;
const MAX_PORTFOLIO_IMAGES = 64;
const DOWNLOAD_TIMEOUT_MS = 20_000;

const fontLicense = `===== Inter =====
Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) Inter-Italic[opsz,wght].ttf: Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

===== Fraunces =====
Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces) Fraunces-Italic[SOFT,WONK,opsz,wght].ttf: Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

===== Space Grotesk =====
Copyright 2020 The Space Grotesk Project Authors (https://github.com/floriankarsten/space-grotesk)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.

===== IBM Plex Mono =====
Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-ThinItalic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-ExtraLight.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-ExtraLightItalic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-Light.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-LightItalic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-Regular.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-Italic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-Medium.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-MediumItalic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-SemiBold.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-SemiBoldItalic.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-Bold.ttf: Copyright 2017 IBM Corp. All rights reserved. IBMPlexMono-BoldItalic.ttf: Copyright 2017 IBM Corp. All rights reserved.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.`;

type ImageFile = {
  original: string;
  path: string;
  data: Blob;
  inlineDataUrl: string | null;
};

type AssetNote = { url: string; reason: string };

const extensionFor = (type: string) => {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
};

const safeFileStem = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "portfolio";

function replaceAll(source: string, values: Map<string, string>) {
  let result = source;
  values.forEach((replacement, original) => {
    result = result.split(original).join(replacement);
  });
  return result;
}

function isPrivateAsset(url: string) {
  try {
    const parsed = new URL(url, "https://portfolio-studio.invalid");
    return parsed.pathname.startsWith("/api/assets/");
  } catch {
    return url.startsWith("/api/assets/");
  }
}

function fallbackUrl(url: string) {
  if (url.startsWith("/") && typeof window !== "undefined") {
    return new URL(url, window.location.origin).href;
  }
  return url;
}

async function blobToDataUrl(blob: Blob, type: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  const encoded = typeof btoa === "function" ? btoa(binary) : "";
  return `data:${type};base64,${encoded}`;
}

async function downloadAsset(
  url: string,
  index: number,
): Promise<ImageFile | null> {
  if (!url || url.startsWith("data:")) return null;
  const source =
    url.startsWith("/") && typeof window !== "undefined"
      ? new URL(url, window.location.origin).href
      : url;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    DOWNLOAD_TIMEOUT_MS,
  );
  try {
    const response = await fetch(source, {
      mode: "cors",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    const type = (response.headers.get("content-type") || blob.type || "")
      .split(";", 1)[0]
      .toLowerCase();
    if (!type.startsWith("image/") || blob.size > MAX_ARCHIVE_IMAGE_BYTES)
      return null;
    const inlineDataUrl =
      blob.size <= MAX_INLINE_IMAGE_BYTES
        ? await blobToDataUrl(blob, type)
        : null;
    return {
      original: url,
      path: `images/image-${index + 1}.${extensionFor(type)}`,
      data: blob,
      inlineDataUrl:
        inlineDataUrl && inlineDataUrl.length <= 600_000 ? inlineDataUrl : null,
    };
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function replaceImageFields(
  document: PortfolioDocument,
  original: string,
  replacement: string,
): PortfolioDocument {
  return {
    ...document,
    ...(document.student
      ? {
          student: {
            ...document.student,
            photo:
              document.student.photo === original
                ? replacement
                : document.student.photo,
            ...Object.fromEntries(
              studentCategories.map((category) => [
                category,
                document.student![category].map((item) => ({
                  ...item,
                  image: item.image === original ? replacement : item.image,
                })),
              ]),
            ),
          },
        }
      : {}),
    profile: {
      ...document.profile,
      photo:
        document.profile.photo === original
          ? replacement
          : document.profile.photo,
    },
    sections: document.sections.map((section) => ({
      ...section,
      image: section.image === original ? replacement : section.image,
      items: section.items.map((item) => ({
        ...item,
        image: item.image === original ? replacement : item.image,
      })),
    })),
  };
}

async function collectImages(portfolioDocument: PortfolioDocument) {
  const urls = [
    ...new Set(
      [
        portfolioDocument.profile.photo,
        ...(portfolioDocument.student
          ? [
              portfolioDocument.student.photo,
              ...studentCategories.flatMap((category) =>
                portfolioDocument.student![category].map((item) => item.image),
              ),
            ]
          : []),
        ...portfolioDocument.sections.flatMap((section) => [
          section.image,
          ...section.items.map((item) => item.image),
        ]),
      ].filter(
        (value): value is string =>
          Boolean(value) && !value.startsWith("data:"),
      ),
    ),
  ];
  if (urls.length > MAX_PORTFOLIO_IMAGES)
    throw new Error(
      `This portfolio has more than ${MAX_PORTFOLIO_IMAGES} images. Export fewer images at a time.`,
    );
  const files: ImageFile[] = [];
  const notes: AssetNote[] = [];
  let portableDocument = portfolioDocument;
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const file = await downloadAsset(url, index);
    if (!file) {
      if (isPrivateAsset(url))
        throw new Error(
          `The uploaded image ${url} could not be copied for export. Try again while online.`,
        );
      notes.push({
        url,
        reason:
          "The source blocked the browser download or was unavailable; the original URL remains as an online fallback.",
      });
      continue;
    }
    files.push(file);
    if (file.inlineDataUrl)
      portableDocument = replaceImageFields(
        portableDocument,
        url,
        file.inlineDataUrl,
      );
    else if (isPrivateAsset(url))
      throw new Error(
        `The uploaded image ${url} is too large to include in the portable document.`,
      );
    else
      notes.push({
        url,
        reason:
          "The image was copied into the website archive but is too large to inline in the editable document.",
      });
  }
  return { files, notes, urls, document: portableDocument };
}

async function collectFonts() {
  const files: Array<{ path: string; data: Blob }> = [];
  for (const font of fontFiles) {
    let response: Response;
    try {
      response = await fetch(font.url);
    } catch {
      throw new Error(`Could not download the ${font.family} font for export.`);
    }
    if (!response.ok)
      throw new Error(`Could not download the ${font.family} font for export.`);
    files.push({ path: `fonts/${font.filename}`, data: await response.blob() });
  }
  const css = fontFiles
    .map(
      (font) =>
        `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};font-display:swap;src:url('./fonts/${font.filename}') format('woff2');}`,
    )
    .join("\n");
  return { files, css };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character,
  );
}

function staticHtml(
  portfolioDocument: PortfolioDocument,
  images: Array<{ original: string; path: string }>,
  fallbacks: Map<string, string>,
) {
  const rendered = renderToStaticMarkup(
    React.createElement(PortfolioRenderer, {
      document: portfolioDocument,
      preview: true,
    }),
  );
  const imageMap = new Map(
    images.flatMap((image) => [
      [image.original, image.path],
      [escapeHtml(image.original), image.path],
    ]),
  );
  fallbacks.forEach((replacement, original) => {
    imageMap.set(original, replacement);
    imageMap.set(escapeHtml(original), replacement);
  });
  const html = replaceAll(rendered, imageMap);
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${escapeHtml(portfolioDocument.seo.description)}"><title>${escapeHtml(portfolioDocument.seo.title)}</title><link rel="stylesheet" href="fonts/fonts.css"><link rel="stylesheet" href="assets/portfolio.css"></head><body>${html}</body></html>`;
}

function readme(
  portfolioDocument: PortfolioDocument,
  source: boolean,
  notes: AssetNote[] = [],
) {
  const warning = notes.length
    ? `\n\n## Asset notes\n\n${notes.map((note) => `- ${note.url}: ${note.reason}`).join("\n")}\n`
    : "";
  return `# ${portfolioDocument.name}\n\nThis is an exported portfolio from Portfolio Studio. ${source ? "The editable portfolio document is included as portfolio.json so you can continue editing or migrate it to another tool." : "Open index.html in a browser to view the portfolio."}\n\n## Included\n\n- index.html — the standalone published page\n- assets/portfolio.css — the editable visual styles\n- fonts/ — bundled font files and font notices\n- images/ — local copies of downloadable portfolio images\n- portfolio.json — the editable Portfolio Studio document\n- export-manifest.json — asset copy results and any documented fallbacks\n\nThe export contains no account credentials, API keys or server configuration.${warning}\n`;
}

async function buildExport(
  portfolioDocument: PortfolioDocument,
  source: boolean,
): Promise<Blob> {
  const exportDocument = source
    ? portfolioDocument
    : publicPortfolioDocument(portfolioDocument);
  const [imageResult, fonts] = await Promise.all([
    collectImages(exportDocument),
    collectFonts(),
  ]);
  const imageRefs = imageResult.files.map(({ original, path }) => ({
    original,
    path: `./${path}`,
  }));
  const localOriginals = new Set(
    imageResult.files.map((file) => file.original),
  );
  const fallbacks = new Map(
    imageResult.notes
      .filter((note) => !localOriginals.has(note.url))
      .map((note) => [note.url, fallbackUrl(note.url)]),
  );
  const html = staticHtml(
    publicPortfolioDocument(exportDocument),
    imageRefs,
    fallbacks,
  );
  const zip = new JSZip();
  zip.file("index.html", html);
  zip.file("assets/portfolio.css", portfolioCss);
  zip.file("fonts/fonts.css", fonts.css.replaceAll("./fonts/", "./"));
  zip.file("portfolio.json", JSON.stringify(imageResult.document, null, 2));
  imageResult.files.forEach((image) => zip.file(image.path, image.data));
  fonts.files.forEach((font) => zip.file(font.path, font.data));
  zip.file("fonts/OFL.txt", fontLicense);
  zip.file(
    "export-manifest.json",
    JSON.stringify(
      {
        format: "portfolio-studio-export",
        version: 2,
        images: imageResult.urls.map((url) => ({
          url,
          localPath:
            imageResult.files.find((file) => file.original === url)?.path ||
            null,
          embeddedInDocument:
            imageResult.files.find((file) => file.original === url)
              ?.inlineDataUrl !== null &&
            imageResult.files.some(
              (file) => file.original === url && file.inlineDataUrl !== null,
            ),
          note:
            imageResult.notes.find((note) => note.url === url)?.reason || null,
        })),
        missingImages: imageResult.notes.map((note) => note.url),
        assetNotes: imageResult.notes,
        fonts: fontFiles.map((font) => `fonts/${font.filename}`),
      },
      null,
      2,
    ),
  );
  zip.file(
    "README.md",
    readme(imageResult.document, source, imageResult.notes) +
      (source
        ? "\n## Private editing backup\n\nThis source archive includes your saved student information and hidden sections. Keep it private. Use the website export when uploading to public hosting.\n"
        : ""),
  );
  if (source)
    zip.file(
      "studio-export.json",
      JSON.stringify(
        {
          format: "portfolio-studio-source",
          version: 2,
          document: imageResult.document,
        },
        null,
        2,
      ),
    );
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function exportPortfolioSite(portfolioDocument: PortfolioDocument) {
  return buildExport(portfolioDocument, false);
}
export function exportPortfolioSource(portfolioDocument: PortfolioDocument) {
  return buildExport(portfolioDocument, true);
}
export function downloadExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportFilename(
  portfolioDocument: PortfolioDocument,
  source = false,
) {
  return `${safeFileStem(portfolioDocument.name)}-${source ? "source" : "website"}.zip`;
}
export function parsePortfolioJson(value: string): PortfolioDocument {
  return portfolioSchema.parse(JSON.parse(value));
}
