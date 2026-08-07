import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

const SCANNER_ID = "barcode-scanner-region";

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export default function BarcodeScannerModal({ open, onClose, onScanned }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const scannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
      }
      scannerRef.current = null;
    }
    scannedRef.current = false;
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const startScanner = useCallback(async () => {
    setStatus("starting");
    setErrorMsg("");
    scannedRef.current = false;

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setStatus("error");
        setErrorMsg("کامێرایەک نەدۆزرایەوە. تکایە مۆڵەتی کامێراکە بدە.");
        return;
      }

      const cameraId = cameras[cameras.length - 1].id;

      scannerRef.current = new Html5Qrcode(SCANNER_ID, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });

      await scannerRef.current.start(
        { deviceId: { exact: cameraId } },
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onScanned(decodedText);
          stopScanner();
          onClose();
        },
        () => {},
      );

      setStatus("scanning");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setErrorMsg("مۆڵەتی کامێرا نەدراوە. تکایە لە ڕێکخستنەکانی براوزەرەکەت مۆڵەتی کامێرا بدە.");
      } else {
        setErrorMsg("کامێراکە نەکرایەوە. تکایە دووبارە هەوڵبدە.");
      }
    }
  }, [onScanned, onClose, stopScanner]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => startScanner(), 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      return undefined;
    }
  }, [open, startScanner, stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base">بارکۆد بخوێنەوە</h2>
                  <p className="text-slate-400 text-xs">بارکۆدی کاڵاکە پێش کامێراکە بگرە</p>
                </div>
              </div>
              <button
                onClick={() => { stopScanner(); onClose(); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner area */}
            <div className="bg-slate-950 relative">
              <div id={SCANNER_ID} className="w-full" style={{ minHeight: "240px" }} />

              {/* Scanning overlay guide */}
              {status === "scanning" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="border-2 border-primary/80 rounded-xl w-[260px] h-[160px] relative shadow-lg shadow-primary/20">
                    <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-0.5 bg-primary/60 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Status overlays */}
              {status === "starting" && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-slate-300 text-sm">کامێراکە بار دەکرێت...</p>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                  </div>
                  <p className="text-slate-300 text-sm text-center leading-relaxed">{errorMsg}</p>
                  <button
                    onClick={startScanner}
                    className="mt-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    دووبارە هەوڵبدەوە
                  </button>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-xs">
                بارکۆدی کاڵاکە ببە بەرامبەر کامێراکە بۆ ئەوەی بە خۆکارەوە زیاد بکرێت بۆ پسوولەکە
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
