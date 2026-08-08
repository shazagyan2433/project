import { Printer } from "lucide-react";
import { formatMoneyIqd } from "@/lib/currency-format";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}

interface PrintReceiptProps {
  saleId: number;
  items: ReceiptItem[];
  totalAmount: number;
  paymentType: "cash" | "debt";
  customerName?: string | null;
}

function formatReceiptAmount(amount: number) {
  return formatMoneyIqd(amount, { lang: document.documentElement.lang?.slice(0, 2) || "ku" });
}

export function PrintReceipt({
  saleId,
  items,
  totalAmount,
  paymentType,
  customerName,
}: PrintReceiptProps) {
  const handlePrint = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ku-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("ku-IQ", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding:5px 4px;border-bottom:1px dashed #ccc;text-align:right">${item.name}</td>
          <td style="padding:5px 4px;border-bottom:1px dashed #ccc;text-align:center">${item.quantity} ${item.unit}</td>
          <td style="padding:5px 4px;border-bottom:1px dashed #ccc;text-align:center">${formatReceiptAmount(item.unitPrice)}</td>
          <td style="padding:5px 4px;border-bottom:1px dashed #ccc;text-align:left;font-weight:700">${formatReceiptAmount(item.total)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>پسوولە #${saleId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', 'Tahoma', sans-serif;
      direction: rtl;
      background: #fff;
      color: #111;
      width: 80mm;
      margin: 0 auto;
      padding: 10px 8px 20px;
      font-size: 13px;
    }
    .store-name {
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #e86c00;
      margin-bottom: 2px;
    }
    .store-sub {
      text-align: center;
      font-size: 11px;
      color: #777;
      margin-bottom: 10px;
    }
    .divider {
      border: none;
      border-top: 2px dashed #ccc;
      margin: 8px 0;
    }
    .divider-solid {
      border: none;
      border-top: 2px solid #222;
      margin: 8px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #444;
      margin: 3px 0;
    }
    .info-row span:last-child { font-weight: 600; color: #111; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 12px;
    }
    thead tr {
      background: #f4f4f4;
    }
    thead th {
      padding: 5px 4px;
      font-weight: 700;
      font-size: 11px;
      color: #555;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
    }
    .total-label { font-size: 15px; font-weight: 700; }
    .total-value { font-size: 19px; font-weight: 800; color: #e86c00; }
    .payment-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-cash { background: #d1fae5; color: #065f46; }
    .badge-debt { background: #fee2e2; color: #991b1b; }
    .footer {
      text-align: center;
      margin-top: 14px;
      font-size: 12px;
      color: #888;
    }
    .footer strong { display: block; font-size: 13px; color: #333; margin-bottom: 3px; }
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="store-name">🍊 Orange Tech</div>
  <div class="store-sub">سیستەمی فرۆشتن و قەرزەکان</div>
  <hr class="divider-solid" />

  <div class="info-row"><span>ژمارەی پسوولە</span><span>#${saleId}</span></div>
  <div class="info-row"><span>بەروار</span><span>${dateStr}</span></div>
  <div class="info-row"><span>کاتژمێر</span><span>${timeStr}</span></div>
  ${customerName ? `<div class="info-row"><span>کڕیار</span><span>${customerName}</span></div>` : ""}

  <hr class="divider" />

  <table>
    <thead>
      <tr>
        <th style="text-align:right">کاڵا</th>
        <th style="text-align:center">بڕ</th>
        <th style="text-align:center">نرخ</th>
        <th style="text-align:left">کۆ</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <hr class="divider-solid" />

  <div class="total-row">
    <span class="total-label">کۆی گشتی</span>
    <span class="total-value">${formatReceiptAmount(totalAmount)}</span>
  </div>

  <div style="text-align:center;margin-top:6px">
    <span class="payment-badge ${paymentType === "cash" ? "badge-cash" : "badge-debt"}">
      ${paymentType === "cash" ? "💵 نەختینە" : "📋 قەرز"}
    </span>
  </div>

  <hr class="divider" />

  <div class="footer">
    <strong>سوپاس بۆ کڕینتان! 🙏</strong>
    Orange Tech — خزمەتگوزاری باش
  </div>

  <script>
    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
  </script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="mt-3 w-full flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-primary hover:text-primary text-slate-600 py-3 rounded-xl font-bold transition-all hover:bg-primary/5"
    >
      <Printer className="w-4 h-4" />
      چاپکردنی پسوولە
    </button>
  );
}
