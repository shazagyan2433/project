const MAX_PAGES = 40;

export async function extractTextFromPdfFile(
  file: File,
  onProgress?: (progress: number, label: string) => void,
): Promise<{ text: string; pages: number }> {
  onProgress?.(8, "بارکردنی PDF");

  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  GlobalWorkerOptions.workerSrc = workerModule.default;

  const data = await file.arrayBuffer();
  onProgress?.(18, "کردنەوەی فایل");

  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const totalPages = pdf.numPages;
  const pagesToRead = Math.min(totalPages, MAX_PAGES);
  const chunks: string[] = [];

  for (let i = 1; i <= pagesToRead; i++) {
    const pct = 18 + Math.round((i / pagesToRead) * 65);
    onProgress?.(pct, `دەرهێنانی دەق · پەڕەی ${i}/${pagesToRead}`);

    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (typeof item === "object" && item !== null && "str" in item ? String(item.str) : ""))
      .join(" ");
    if (pageText.trim()) chunks.push(pageText);
    page.cleanup();
  }

  const text = chunks.join("\n").trim();
  if (!text || text.length < 5) {
    throw new Error(
      "نەتوانرا دەقی بەردەست لە PDF دەرهێنرێت. فایلەکە سکان کراوە، بەتاڵە، یان فاتورە/لیستی کاڵا نییە.",
    );
  }

  onProgress?.(88, "دەق ئامادە");
  return { text, pages: totalPages };
}
