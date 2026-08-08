/**
 * Fast heuristic document parser — optimized for large catalogs.
 */

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

export interface ParseDocumentResult {
  items: ImportProductDraft[];
  warnings: string[];
  supplierHint: string | null;
  linesScanned: number;
  parseMs: number;
}

const DEFAULT_UNIT = "دانە";
const MAX_LINES = 2500;
const MAX_ITEMS = 500;

/** Shown when no invoice / product rows are detected */
export const EMPTY_IMPORT_MESSAGE =
  "هیچ کاڵایەک یان فاکتەرێک لەم فایلەدا نەدۆزرایەوە. تکایە فاتورە یان لیستی کاڵا بەکاربهێنە.";

const UNIT_ALIASES: Record<string, string> = {
  pcs: "دانە", pc: "دانە", piece: "دانە", unit: "دانە", qty: "دانە",
  kg: "کیلۆ", kilo: "کیلۆ", liter: "لیتر", litre: "لیتر", l: "لیتر",
  carton: "کارتۆن", box: "بۆکس", pack: "پاکەت", bag: "کیسە", meter: "مەتر", gram: "گرام",
  دانە: "دانە", کیلۆ: "کیلۆ", لیتر: "لیتر", کارتۆن: "کارتۆن", بۆکس: "بۆکس",
  پاکەت: "پاکەت", دەبە: "دەبە", کیسە: "کیسە", مەتر: "مەتر", گرام: "گرام",
};

const HEADER_HINT_SET = new Set([
  "description", "product", "item", "name", "barcode", "sku", "qty", "quantity",
  "price", "cost", "total", "subtotal", "invoice", "amount", "unit", "stock",
  "ناو", "کاڵا", "بارکۆد", "بڕ", "نرخ", "کۆی", "فاتورة", "وەسڵ", "ژمارە",
]);

const PAGE_LINE_RE = /^page\s+\d+/i;
const DATE_LINE_RE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;

function normalizeNumber(raw: string): number {
  const s = raw.trim().replace(/[^\d.,]/g, "");
  if (!s) return 0;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, "")) || 0;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function normalizeUnit(raw: string | undefined): string {
  if (!raw) return DEFAULT_UNIT;
  return UNIT_ALIASES[raw.trim().toLowerCase()] ?? raw.trim();
}

function isHeaderOrNoise(line: string): boolean {
  if (line.length < 2) return true;
  if (PAGE_LINE_RE.test(line)) return true;
  if (DATE_LINE_RE.test(line)) return true;
  const lower = line.toLowerCase();
  if (/^(tel|phone|email|www\.|http)/i.test(lower)) return true;
  let hits = 0;
  for (const h of HEADER_HINT_SET) {
    if (lower.includes(h)) hits++;
    if (hits >= 2 && line.length < 100) return true;
  }
  if (hits >= 1 && line.length < 35 && !/\d{4,}/.test(line)) return true;
  return false;
}

function extractSupplierHint(lines: string[]): string | null {
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (line.length < 4 || line.length > 80 || /\d{5,}/.test(line) || isHeaderOrNoise(line)) continue;
    if (/company|supplier|vendor|فرۆشیار|دابینکەر/i.test(line)) {
      const cleaned = line.replace(/^(supplier|vendor|company|فرۆشیار|دابینکەر)\s*[:：]\s*/i, "").trim();
      if (cleaned.length >= 3) return cleaned;
    }
    if (!line.includes(":") && line.split(/\s+/).length <= 6) return line;
  }
  return null;
}

function extractBarcode(line: string): string | null {
  const m = line.match(/\b(\d{8,14})\b/);
  return m ? m[1] : null;
}

function stripBarcode(line: string, barcode: string | null): string {
  return barcode ? line.replace(barcode, "").replace(/\s+/g, " ").trim() : line;
}

function buildDraft(
  fields: Partial<ImportProductDraft> & { name: string },
  confidence: number,
  note?: string,
): ImportProductDraft {
  return {
    name: fields.name.trim(),
    category: fields.category ?? null,
    costPrice: Math.max(0, fields.costPrice ?? 0),
    price: Math.max(0, fields.price ?? 0),
    stock: Math.max(0, Math.round(fields.stock ?? 0)),
    unit: normalizeUnit(fields.unit ?? DEFAULT_UNIT),
    barcode: fields.barcode ?? null,
    supplier: fields.supplier ?? null,
    confidence,
    parseNote: note,
  };
}

function parseColumns(parts: string[], supplier: string | null): ImportProductDraft | null {
  if (parts.length < 2) return null;
  const name = (parts.find((p) => !/^[\d.,]+$/.test(p.replace(/\s/g, ""))) ?? parts[0]).trim();
  if (name.length < 2) return null;

  const barcode = extractBarcode(parts.join(" "));
  const numbers = parts.map((p) => normalizeNumber(p)).filter((n) => n > 0);

  let stock = 0;
  let costPrice = 0;
  let price = 0;

  if (numbers.length >= 3) {
    stock = Math.round(numbers[numbers.length - 3]);
    costPrice = numbers[numbers.length - 2];
    price = numbers[numbers.length - 1];
  } else if (numbers.length === 2) {
    stock = Math.round(numbers[0]);
    price = numbers[1];
  } else if (numbers.length === 1) {
    price = numbers[0];
    stock = Math.round(numbers[0]) < 1000 ? Math.round(numbers[0]) : 0;
  }

  if (price <= 0 && costPrice > 0) price = costPrice;

  return buildDraft(
    { name, stock, costPrice, price, barcode, supplier },
    numbers.length >= 2 ? 0.85 : 0.55,
    "ستونی جیاکراوە",
  );
}

function parseFreeformLine(line: string, supplier: string | null): ImportProductDraft | null {
  const barcode = extractBarcode(line);
  const work = stripBarcode(line, barcode);

  const threeTail = work.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/);
  if (threeTail) {
    return buildDraft({
      name: threeTail[1],
      stock: Math.round(normalizeNumber(threeTail[2])),
      costPrice: normalizeNumber(threeTail[3]),
      price: normalizeNumber(threeTail[4]),
      barcode,
      supplier,
    }, 0.9, "qty + cost + price");
  }

  const twoTail = work.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/);
  if (twoTail) {
    const a = normalizeNumber(twoTail[2]);
    const b = normalizeNumber(twoTail[3]);
    return buildDraft({
      name: twoTail[1],
      stock: Math.round(a) <= 9999 ? Math.round(a) : 0,
      price: b > 0 ? b : a,
      barcode,
      supplier,
    }, 0.75, "qty + price");
  }

  const priceOnly = work.match(/^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*$/);
  if (priceOnly && normalizeNumber(priceOnly[2]) > 0) {
    return buildDraft({
      name: priceOnly[1],
      price: normalizeNumber(priceOnly[2]),
      stock: 0,
      barcode,
      supplier,
    }, 0.5, "تەنها ناو — تکایە دەستکاری بکە");
  }

  if (work.length >= 3 && !/^(total|subtotal|کۆی)/i.test(work)) {
    return buildDraft({ name: work, price: 0, stock: 0, barcode, supplier }, 0.35, "تەنها ناو");
  }

  return null;
}

function dedupeItems(items: ImportProductDraft[]): ImportProductDraft[] {
  const seen = new Set<string>();
  const out: ImportProductDraft[] = [];
  for (const item of items) {
    const key = `${item.name.toLowerCase()}|${item.barcode ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Split text into lines once — caps volume for speed */
function splitLines(text: string): string[] {
  const lines: string[] = [];
  let start = 0;
  let count = 0;
  for (let i = 0; i < text.length && count < MAX_LINES; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      let line = text.slice(start, i).replace(/\s+/g, " ").trim();
      if (line.length > 2) {
        lines.push(line);
        count++;
      }
      start = i + 1;
    }
  }
  if (start < text.length && count < MAX_LINES) {
    const line = text.slice(start).replace(/\s+/g, " ").trim();
    if (line.length > 2) lines.push(line);
  }
  return lines;
}

export function parseDocumentText(text: string): ParseDocumentResult {
  const start = Date.now();
  const warnings: string[] = [];
  const rawLines = splitLines(text);
  const supplierHint = extractSupplierHint(rawLines);
  const items: ImportProductDraft[] = [];

  for (const line of rawLines) {
    if (items.length >= MAX_ITEMS) {
      warnings.push(`زیاتر لە ${MAX_ITEMS} کاڵا نەناسراو — پێشتر وەستان.`);
      break;
    }
    if (isHeaderOrNoise(line)) continue;

    let parsed: ImportProductDraft | null = null;
    const tabIdx = line.search(/[\t|]/);
    if (tabIdx >= 0) {
      const sep = line[tabIdx];
      const parts = line.split(sep === "\t" ? "\t" : "|").map((p) => p.trim()).filter(Boolean);
      parsed = parseColumns(parts, supplierHint);
    } else if (line.includes(",") && line.split(",").length >= 3) {
      parsed = parseColumns(line.split(",").map((p) => p.trim()), supplierHint);
    } else {
      parsed = parseFreeformLine(line, supplierHint);
    }

    if (parsed && parsed.name.length >= 2) {
      if (!parsed.supplier && supplierHint) parsed.supplier = supplierHint;
      items.push(parsed);
    }
  }

  const deduped = dedupeItems(items);
  const qualityItems = deduped.filter(
    (i) => i.confidence >= 0.55 || i.price > 0 || i.costPrice > 0,
  );

  if (qualityItems.length === 0) {
    warnings.push(EMPTY_IMPORT_MESSAGE);
  } else if (qualityItems.some((i) => i.confidence < 0.6)) {
    warnings.push("هەندێک ڕیز بە دڵنیایی نزم پارس کراون — پێش پاشەکەوتکردن پشکنینیان بکە.");
  }

  return {
    items: qualityItems,
    warnings,
    supplierHint,
    linesScanned: rawLines.length,
    parseMs: Date.now() - start,
  };
}
