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
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
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
