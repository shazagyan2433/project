export async function extractTextFromFile(
  file: File,
  onProgress?: (progress: number, label: string) => void,
): Promise<{ text: string; pages: number; extractMs: number }> {
  const start = performance.now();
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";

  if (isPdf) {
    const { extractTextFromPdfFile } = await import("./pdf-client-extract");
    const result = await extractTextFromPdfFile(file, onProgress);
    return { ...result, extractMs: Math.round(performance.now() - start) };
  }

  onProgress?.(25, "خوێندنەوەی فایل");
  const text = await file.text();
  if (!text.trim()) throw new Error("فایلەکە بەتاڵە");

  onProgress?.(85, "دەق ئامادە");
  return { text, pages: 0, extractMs: Math.round(performance.now() - start) };
}
