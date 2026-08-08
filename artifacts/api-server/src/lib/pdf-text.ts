import pdfParse from "pdf-parse/lib/pdf-parse.js";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 40;

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error("فایلی PDF زۆر گەورەیە (زیاتر لە 10MB)");
  }
  const data = await pdfParse(buffer, { max: MAX_PDF_PAGES });
  const text = (data.text ?? "").trim();
  if (!text || text.length < 10) {
    throw new Error("نەتوانرا دەقی بەردەست لە PDF دەرهێنرێت. فایلی سکان کراو یان بەتاڵە.");
  }
  return { text, pages: data.numpages ?? 1 };
}

export function extractTextFromPlain(buffer: Buffer): string {
  const text = buffer.toString("utf8").trim();
  if (!text) throw new Error("فایلەکە بەتاڵە");
  return text;
}
