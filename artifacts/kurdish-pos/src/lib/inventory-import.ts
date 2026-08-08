import {
  authHeaders,
  fetchImportJson,
  ImportApiError,
  probeImportApiHealth,
  truncateImportText,
} from "./import-api";

export interface ImportProductDraft {
  name: string;
  category: string | null;
  costPrice: number;
  price: number;
  stock: number;
  unit: string;
  barcode: string | null;
  supplier: string | null;
  confidence: number;
  parseNote?: string;
}

export interface ImportPreviewRow {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  price: number;
  stock: number;
  unit: string;
  barcode: string;
  supplier: string;
  confidence: number;
  parseNote?: string;
  errors: ImportValidationCode[];
}

export interface ParseImportResponse {
  items: ImportProductDraft[];
  warnings: string[];
  empty?: boolean;
  message?: string;
  meta: {
    fileName: string;
    mimeType: string;
    pages: number;
    linesScanned: number;
    supplierHint: string | null;
    parseMs?: number;
    extractMs?: number;
  };
}

export interface BulkCreateResponse {
  count: number;
  products: unknown[];
}

export type ParseProgressCallback = (progress: number, label: string) => void;

export const EMPTY_IMPORT_MESSAGE =
  "هیچ کاڵایەک یان فاکتەرێک لەم فایلەدا نەدۆزرایەوە. تکایە فاتورە یان لیستی کاڵا بەکاربهێنە.";

export { ImportApiError };

export type ImportValidationCode = "name" | "price" | "stock" | "unit" | "cost";

export function validateImportRow(row: Pick<ImportPreviewRow, "name" | "price" | "stock" | "unit" | "costPrice">): ImportValidationCode[] {
  const errors: ImportValidationCode[] = [];
  if (!row.name?.trim()) errors.push("name");
  if (!row.price || row.price <= 0) errors.push("price");
  if (row.stock < 0 || !Number.isInteger(row.stock)) errors.push("stock");
  if (!row.unit?.trim()) errors.push("unit");
  if (row.costPrice < 0) errors.push("cost");
  return errors;
}

export function toPreviewRow(item: ImportProductDraft, id?: string): ImportPreviewRow {
  const row: ImportPreviewRow = {
    ...item,
    id: id ?? crypto.randomUUID(),
    name: item.name?.trim() ?? "",
    category: item.category ?? "",
    costPrice: item.costPrice ?? 0,
    price: item.price ?? 0,
    stock: item.stock ?? 0,
    unit: item.unit || "",
    barcode: item.barcode ?? "",
    supplier: item.supplier ?? "",
    errors: [],
  };
  row.errors = validateImportRow(row);
  return row;
}

function assertParseResult(result: ParseImportResponse): ParseImportResponse {
  if (result.empty || result.items.length === 0) {
    throw new ImportApiError(
      result.message ?? result.warnings[0] ?? EMPTY_IMPORT_MESSAGE,
      "empty",
    );
  }
  return result;
}

async function parseViaTextEndpoint(
  file: File,
  text: string,
  pages: number,
  extractMs: number,
  onProgress?: ParseProgressCallback,
): Promise<ParseImportResponse> {
  onProgress?.(90, "ناسینەوەی کاڵاکان");

  const payload = truncateImportText(text);
  const data = await fetchImportJson<ParseImportResponse>("/products/import/parse-text", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text: payload, fileName: file.name }),
    timeoutMs: 60_000,
  });

  onProgress?.(100, "تەواو");

  return assertParseResult({
    ...data,
    meta: {
      ...data.meta,
      pages: pages || data.meta.pages,
      extractMs,
    },
  });
}

async function parseViaMultipartUpload(
  file: File,
  onProgress?: ParseProgressCallback,
): Promise<ParseImportResponse> {
  onProgress?.(40, "ناردنی فایل بۆ سێرڤەر…");

  const form = new FormData();
  form.append("file", file);

  const data = await fetchImportJson<ParseImportResponse>("/products/import/parse", {
    method: "POST",
    headers: authHeaders(),
    body: form,
    timeoutMs: 120_000,
  });

  onProgress?.(100, "تەواو");
  return assertParseResult(data);
}

function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof DOMException && err.name === "AbortError");
}

/** Extract text in-browser, then fast JSON parse on server (multipart fallback on network errors) */
export async function parseInventoryDocument(
  file: File,
  onProgress?: ParseProgressCallback,
): Promise<ParseImportResponse> {
  onProgress?.(2, "وەرگرتنی فایل");

  const apiUp = await probeImportApiHealth();
  if (!apiUp) {
    throw new ImportApiError(
      "سێرڤەری API بەردەست نییە. دڵنیابە کە `pnpm dev` کارا دەبێت و دووبارە هەوڵ بدەرەوە.",
      "network",
    );
  }

  try {
    const { extractTextFromFile } = await import("./file-text-extract");
    const { text, pages, extractMs } = await extractTextFromFile(file, (pct, label) => {
      onProgress?.(5 + Math.round(pct * 0.8), label);
    });

    try {
      return await parseViaTextEndpoint(file, text, pages, extractMs, onProgress);
    } catch (err) {
      if (err instanceof ImportApiError && err.kind === "network") {
        onProgress?.(85, "هەوڵدان بە ڕێگای پاشگر…");
        return await parseViaMultipartUpload(file, onProgress);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof ImportApiError) throw err;

    const message = err instanceof Error ? err.message : "پارسکردنی فایل سەرکەوتوو نەبوو";
    if (message.includes("fetch") || isNetworkFailure(err)) {
      onProgress?.(85, "هەوڵدان بە ڕێگای پاشگر…");
      try {
        return await parseViaMultipartUpload(file, onProgress);
      } catch (fallbackErr) {
        if (fallbackErr instanceof ImportApiError) throw fallbackErr;
        throw new ImportApiError(
          "ناتوانرێت پەیوەندی بە سێرڤەرەوە بکرێت. دڵنیابە کە سێرڤەر کارا دەبێت.",
          "network",
        );
      }
    }

    throw new ImportApiError(message, "validation");
  }
}

export async function bulkCreateProducts(
  products: Array<{
    name: string;
    price: number;
    costPrice?: number;
    stock: number;
    unit: string;
    category?: string | null;
    barcode?: string | null;
    supplier?: string | null;
    image?: string | null;
  }>,
): Promise<BulkCreateResponse> {
  const payload = products.map((p) => ({
    name: p.name.trim(),
    price: p.price,
    costPrice: p.costPrice ?? 0,
    stock: p.stock,
    unit: p.unit,
    category: p.category?.trim() ? p.category.trim() : null,
    barcode: p.barcode?.trim() ? p.barcode.trim() : null,
    supplier: p.supplier?.trim() ? p.supplier.trim() : null,
    image: p.image ?? null,
  }));

  return fetchImportJson<BulkCreateResponse>("/products/bulk", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ products: payload }),
    timeoutMs: 60_000,
  });
}
