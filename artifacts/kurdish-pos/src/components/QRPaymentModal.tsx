import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Smartphone, Wifi, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface QRPaymentModalProps {
  open: boolean;
  totalIQD: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function QRCodeSVG() {
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1,0,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1],
    [0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0,0],
    [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,1,1],
    [0,1,0,1,0,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0],
    [1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,1,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,1,0,1,1],
  ];

  const cells = pattern.length;
  const size = 210;
  const cellSize = size / cells;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" rx="4" />
      {pattern.map((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
      <rect x={size/2 - 22} y={size/2 - 22} width={44} height={44} fill="white" rx="6" />
      <text x={size/2} y={size/2 + 6} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1A6AFF" fontFamily="sans-serif">L</text>
    </svg>
  );
}

const BANKS = [
  { name: "FIB", color: "#003580", text: "FIB" },
  { name: "ZainCash", color: "#8B2FC9", text: "ZC" },
  { name: "Fastpay", color: "#FF6B35", text: "FP" },
  { name: "NassPay", color: "#0EA5E9", text: "NP" },
];

export function QRPaymentModal({ open, totalIQD, onConfirm, onCancel }: QRPaymentModalProps) {
  const { t } = useTranslation();

  const formatted = totalIQD.toLocaleString("en-US") + " IQD";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-extrabold text-base leading-none">LinQi Pay</h2>
                  <p className="text-blue-300 text-[11px] mt-0.5 font-medium">{t("qr.scanToPay")}</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-6 pt-5 pb-2 text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">{t("qr.totalDue")}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{formatted}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-semibold">{t("qr.securePayment")}</span>
              </div>
            </div>

            <div className="flex justify-center py-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="p-3 bg-white rounded-2xl shadow-lg border border-slate-100"
              >
                <QRCodeSVG />
              </motion.div>
            </div>

            <div className="px-6 pb-3">
              <p className="text-center text-xs text-slate-400 font-medium mb-3">{t("qr.supportedBanks")}</p>
              <div className="flex justify-center gap-2">
                {BANKS.map((bank) => (
                  <div
                    key={bank.name}
                    className="flex items-center justify-center w-12 h-8 rounded-lg font-black text-white text-[11px] shadow-sm"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 mx-4 mb-2 bg-amber-50 border border-amber-100 rounded-xl">
              <Wifi className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">{t("qr.waitInstruction")}</p>
            </div>

            <div className="p-4 space-y-2.5">
              <button
                onClick={onConfirm}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-extrabold text-white text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
                style={{ background: "linear-gradient(135deg, #1A6AFF, #0047e1)" }}
              >
                <CheckCircle2 className="w-5 h-5" />
                {t("qr.confirmPayment")}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-sm transition-all"
              >
                {t("common.cancel")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
