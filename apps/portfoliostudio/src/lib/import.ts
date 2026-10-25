export type PdfTextItemLike = {
  str?: unknown;
  hasEOL?: unknown;
  transform?: unknown;
  width?: unknown;
  height?: unknown;
};

function pdfCoordinate(item: PdfTextItemLike, index: number): number | null {
  if (!Array.isArray(item.transform)) return null;
  const value = item.transform[index];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pdfNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function prioritizePdfHeader(
  items: readonly PdfTextItemLike[],
): readonly PdfTextItemLike[] {
  const textItems = items.filter(
    (item) => typeof item.str === "string" && item.str.trim(),
  );
  const firstY = textItems
    .map((item) => pdfCoordinate(item, 5))
    .find((value): value is number => value !== null);
  const yValues = textItems
    .map((item) => pdfCoordinate(item, 5))
    .filter((value): value is number => value !== null);
  const maxY = yValues.length ? Math.max(...yValues) : null;
  // Some browser-generated PDFs expose body columns first and append the
  // header text last. Move only a clear top-of-page band to the front, keeping
  // item order inside and outside that band so columns are not re-sorted.
  if (firstY === undefined || maxY === null || maxY - firstY <= 80)
    return items;
  const cutoff = maxY - 80;
  const header: PdfTextItemLike[] = [];
  const body: PdfTextItemLike[] = [];
  for (const item of items) {
    const y = pdfCoordinate(item, 5);
    if (y !== null && y >= cutoff) header.push(item);
    else body.push(item);
  }
  return header.length && body.length ? [...header, ...body] : items;
}

/**
 * Rebuilds readable lines from PDF.js text items. PDF.js exposes line
 * boundaries through hasEOL on some PDFs and through the baseline in transform
 * on others. Item order is retained within the source columns; only a clear
 * top-of-page header band is promoted when a browser PDF appends it last.
 */
export function pdfTextItemsToText(
  items: readonly PdfTextItemLike[],
): string {
  const lines: string[] = [];
  let line = "";
  let lineY: number | null = null;
  let lineHeight = 0;
  let lineEndX: number | null = null;
  let previousY: number | null = null;
  let previousHeight = 0;

  const flush = () => {
    if (line || lines.length === 0) lines.push(line.trimEnd());
    line = "";
    lineY = null;
    lineHeight = 0;
    lineEndX = null;
  };
  const addLineGap = (y: number | null, height: number) => {
    if (y === null || previousY === null || lines.length === 0) return;
    const gap = Math.abs(y - previousY);
    const threshold = Math.max(24, Math.max(previousHeight, height) * 2);
    if (gap > threshold && lines[lines.length - 1] !== "") lines.push("");
  };

  for (const item of prioritizePdfHeader(items)) {
    const value = typeof item.str === "string" ? item.str : "";
    const y = pdfCoordinate(item, 5);
    const x = pdfCoordinate(item, 4);
    const width = pdfNumber(item.width);
    const height = pdfNumber(item.height) ?? 0;
    const lineChanged =
      line &&
      y !== null &&
      lineY !== null &&
      Math.abs(y - lineY) > Math.max(2, Math.max(lineHeight, height) * 0.25);

    if (lineChanged) {
      flush();
      addLineGap(y, height);
      if (y !== null) {
        previousY = y;
        previousHeight = height;
      }
    } else if (!line) {
      addLineGap(y, height);
      if (y !== null) {
        previousY = y;
        previousHeight = height;
      }
    }

    if (value) {
      if (lineY === null) lineY = y;
      const separatedByPosition =
        x !== null && lineEndX !== null && x - lineEndX > 1;
      const separatedWithoutPosition = x === null || lineEndX === null;
      if (
        line &&
        !/[\s\u00a0]$/.test(line) &&
        !/^[\s\u00a0]/.test(value) &&
        (separatedByPosition || separatedWithoutPosition)
      )
        line += " ";
      line += value;
      if (x !== null && width !== null) lineEndX = x + width;
      else lineEndX = null;
      lineHeight = Math.max(lineHeight, height);
    }

    if (item.hasEOL === true) {
      if (line) flush();
      if (y !== null) previousY = y;
      previousHeight = height;
    }
  }
  if (line) flush();
  return lines.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

export async function readCv(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a CV smaller than 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt") return (await file.text()).slice(0, 40000);
  if (extension === "docx") {
    const mammoth = await import("mammoth");
    return (
      await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    ).value.slice(0, 40000);
  }
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await task.promise;
    try {
      const pages: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(
          pdfTextItemsToText(content.items as unknown as PdfTextItemLike[]),
        );
      }
      const text = pages.join("\n\n");
      if (!text.trim())
        throw new Error(
          "This PDF looks like a scan. Paste your CV text or enter your details instead.",
        );
      return text.slice(0, 40000);
    } finally {
      await task.destroy();
    }
  }
  throw new Error("Choose a PDF, Word document (.docx) or plain text file.");
}
export async function readImage(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPG, PNG, WebP or GIF image.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose an image smaller than 15 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.84;
  let data = canvas.toDataURL("image/webp", quality);
  while (data.length > 240000 && quality > 0.45) {
    quality -= 0.1;
    data = canvas.toDataURL("image/webp", quality);
  }
  if (data.length > 530000)
    throw new Error(
      "This image is too detailed to store. Try a smaller image.",
    );
  return data;
}
