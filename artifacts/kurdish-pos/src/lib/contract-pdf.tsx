import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { AdminContract } from "@/lib/admin-types";
import { buildStructuredContractDocument, isAdminRtl } from "@/lib/contract-templates";
import { ContractPrintDocument } from "@/components/admin/ContractPrintDocument";

const A4_WIDTH_PX = 794; // ~210mm at 96dpi
const PRINTABLE_CONTRACT_ID = "printable-contract";
const RTL_FONT_STACK = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const RTL_CLONE_FONT = "Tahoma, Arial, sans-serif";
const LTR_FONT_STACK = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

type ContentLang = "ku" | "ar" | "en";

function sanitizeFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function resetPrintableContractStyles(element: HTMLElement, rtl: boolean): void {
  const fontStack = rtl ? RTL_FONT_STACK : LTR_FONT_STACK;

  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_WIDTH_PX}px`;
  element.style.background = "#ffffff";
  element.style.color = "#0f172a";
  element.style.border = "none";
  element.style.boxShadow = "none";
  element.style.setProperty("font-family", fontStack, "important");
  element.style.setProperty("letter-spacing", "normal", "important");
  element.style.setProperty("word-spacing", "normal", "important");
  element.style.setProperty("font-kerning", "normal", "important");
  element.style.textTransform = "none";
  element.style.setProperty("text-transform", "none", "important");

  if (rtl) {
    element.style.setProperty("direction", "rtl", "important");
    element.style.setProperty("text-align", "right", "important");
  } else {
    element.style.setProperty("direction", "ltr", "important");
    element.style.setProperty("text-align", "left", "important");
  }

  element.querySelectorAll("*").forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    node.style.setProperty("font-family", fontStack, "important");
    node.style.setProperty("letter-spacing", "normal", "important");
    node.style.setProperty("word-spacing", "normal", "important");
    node.style.setProperty("font-kerning", "normal", "important");
    node.style.textTransform = "none";
    node.style.setProperty("text-transform", "none", "important");
    if (rtl) {
      node.style.setProperty("direction", "rtl", "important");
    }
  });
}

function applyCloneRtlReset(clonedDoc: Document, rtl: boolean): void {
  const element = clonedDoc.getElementById(PRINTABLE_CONTRACT_ID);
  if (!element) return;

  element.style.fontFamily = rtl ? RTL_CLONE_FONT : LTR_FONT_STACK;
  if (rtl) {
    element.style.direction = "rtl";
    element.style.textAlign = "right";
  } else {
    element.style.direction = "ltr";
    element.style.textAlign = "left";
  }
  element.style.letterSpacing = "normal";
  element.style.wordSpacing = "normal";
  element.style.textTransform = "none";
  element.style.setProperty("font-kerning", "normal");
  element.style.background = "#ffffff";
  element.style.color = "#0f172a";
  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_WIDTH_PX}px`;

  element.querySelectorAll("*").forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    node.style.fontFamily = rtl ? RTL_CLONE_FONT : LTR_FONT_STACK;
    node.style.letterSpacing = "normal";
    node.style.wordSpacing = "normal";
    node.style.textTransform = "none";
    node.style.setProperty("font-kerning", "normal");
    if (rtl) node.style.direction = "rtl";
  });
}

async function waitForLayoutSettle(rtl: boolean): Promise<void> {
  await new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await new Promise<void>(resolve => setTimeout(resolve, rtl ? 250 : 100));
}

async function capturePrintableContractToPdf(filename: string, rtl: boolean): Promise<void> {
  const contractElement = document.getElementById(PRINTABLE_CONTRACT_ID);
  if (!contractElement) throw new Error("Contract preview not found");

  resetPrintableContractStyles(contractElement, rtl);
  await waitForLayoutSettle(rtl);

  const canvas = await html2canvas(contractElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    letterRendering: true,
    backgroundColor: "#ffffff",
    windowWidth: A4_WIDTH_PX,
    width: A4_WIDTH_PX,
    onclone: clonedDoc => applyCloneRtlReset(clonedDoc, rtl),
  } as Parameters<typeof html2canvas>[1] & { letterRendering?: boolean });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/png", 1.0);
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

/** Download PDF from the preview modal's rendered contract element */
export async function downloadContractPdfFromPreview(
  contractId: string,
  lang: ContentLang = "ku",
): Promise<void> {
  const filename = `LinQi_Contract_${sanitizeFilename(contractId)}.pdf`;
  await capturePrintableContractToPdf(filename, isAdminRtl(lang));
}

/** Render contract off-screen and download as PDF (table row download) */
export async function downloadContractAsPdf(
  contract: AdminContract,
  lang: ContentLang,
): Promise<void> {
  const structured = buildStructuredContractDocument(contract, lang);
  const rtl = isAdminRtl(lang);

  const host = document.createElement("div");
  host.id = "contract-pdf-export-host";
  host.setAttribute("dir", rtl ? "rtl" : "ltr");
  host.style.cssText = `position:fixed;left:-12000px;top:0;width:${A4_WIDTH_PX}px;background:#ffffff;z-index:-1`;

  const mount = document.createElement("div");
  host.appendChild(mount);
  document.body.appendChild(host);

  const root = createRoot(mount);
  root.render(<ContractPrintDocument doc={structured} lang={lang} />);

  await waitForLayoutSettle(rtl);

  try {
    const filename = `LinQi_Contract_${sanitizeFilename(contract.id)}.pdf`;
    await capturePrintableContractToPdf(filename, rtl);
  } finally {
    root.unmount();
    host.remove();
  }
}
