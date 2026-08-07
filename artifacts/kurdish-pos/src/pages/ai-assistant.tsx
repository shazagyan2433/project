import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Lightbulb, TrendingUp, FileText, Zap, Brain,
  Send, Sparkles, BarChart3, Package, Users, RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSectorLabel } from "@/hooks/useSectorScope";

/* ─────────────────────────────────────────────────────────────────── */
/*  DESIGN TOKENS                                                       */
/* ─────────────────────────────────────────────────────────────────── */
const PURPLE = "#8b5cf6";
const CYAN   = "#06b6d4";
const GREEN  = "#10b981";
const BLUE   = "#3b82f6";
const TEXT   = "#f1f5f9";
const MUTED  = "#64748b";
const SUB    = "#94a3b8";

const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background:           "rgba(255,255,255,0.03)",
  backdropFilter:       "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border:               "1px solid rgba(255,255,255,0.06)",
  borderRadius:         "16px",
  ...extra,
});

/* ─────────────────────────────────────────────────────────────────── */
/*  LANGUAGE DETECTION                                                  */
/* ─────────────────────────────────────────────────────────────────── */
type Lang = "ku" | "ar" | "en";

/**
 * Kurdish Sorani has unique chars that don't appear in standard Arabic:
 * ڕ ڵ ۆ ێ گ پ چ ژ ک (U+06A9 ARABIC LETTER KEHEH is used in Sorani)
 * We detect Kurdish by presence of these distinctive characters.
 */
function detectLang(text: string): Lang {
  const kuPattern  = /[\u06A9\u06AF\u06BE\u0695\u06B5\u0648\u06CC\u06CE\u067E\u0686\u0698]/;
  const latinPat   = /[a-zA-Z]/;
  const arabicPat  = /[\u0600-\u06FF]/;

  const hasKu    = kuPattern.test(text);
  const hasLatin = latinPat.test(text);
  const hasAr    = arabicPat.test(text);

  if (hasLatin && !hasAr)  return "en";
  if (hasKu)               return "ku";
  if (hasAr)               return "ar";
  if (hasLatin)            return "en";
  return "ku";
}

/* ─────────────────────────────────────────────────────────────────── */
/*  RESPONSE BANKS — three languages, multiple variants per topic      */
/* ─────────────────────────────────────────────────────────────────── */
const BANKS: Record<Lang, Record<string, string[]>> = {

  /* ════ KURDISH SORANI ════════════════════════════════════════════ */
  ku: {
    greeting: [
      "سڵاو! من یارمەتیدەری زیرەکی LinQiـم. چۆن دەتوانم ئەمڕۆ لە بەڕێوەبردنی کارەکەتدا یارمەتیت بدەم؟",
    ],
    sales: [
      "زۆر باشە. فرۆشی مانگی حوزەیران بە شێوەیەکی باش پێشکەوتووە — کۆی فرۆشەکان گەیشتووەتە ٤٨.٧ ملیۆن د.ع، ئەمەش ١٢.٤٪ زیاترە لە مانگی پێشوو.\n\nباشترین بەرهەمی فرۆشراو ئەم هەفتەیە روونی زەیتوون بووە، پاشانیش ماکارۆنی ئیتالی و شەکری سپی. پێشبینیم ئەوەیە کە مانگی داهاتوو گەشەی ١٠–١٤٪ هەبێت بە مەرجی ئەوەی ئەنبارەکانت پربمێننەوە.\n\nدەتەوێت شیکارییەکی قووڵتری بۆ بەرهەمێکی دیاری بکەم؟",
      "بێگومان، دەتوانم شیکاری زیاترت بۆ بکەم. ئەم هەفتەیە ٦ مامەڵەی نوێ تۆمارکراوە، کۆی ئەوانەش ١٢.٣ ملیۆن د.ع دەبێت.\n\nئاوێنەیەکی باشی کار نیشان دەدات ئەم مانگە. ئایا دەتەوێت بزانیت کام کڕیارت زیاتر فرۆشی کردووە؟",
    ],
    inventory: [
      "بێگومان، ئەنبارەکانت لەگەڵ دووی دەبێت چاودێریان بکرێت. ٣ بەرهەمت هەیە کە زۆر نزیک دایە بۆ ئاستی تەخشیر:\n\nروونی زەیتوون ٣٢ دەبەی مایەوە — ئاستی ئەمنیت ٥٠ دەبەیە. دانەی قاوە ١٨ کیلۆی مایەوە، پێویستی فوری هەیە. سابوونی ماشینیش ٦٤ کارتۆن لە ئاستی هۆشداریدایە.\n\nپیشنیارم ئەوەیە کە ئیمڕۆ داواکاری B2B بنێریت بۆ شیرکەتی ئەڵفا. دەتەوێت ئەمەی بۆت دروست بکەم؟",
      "ستۆکی ئەنبارت بە گشتی باشە، بەڵام دوو بەرهەم هەیە کە دەبێت ئێستا چارەسەریان بکەیت — روونی زەیتوون و دانەی قاوە هەر دوووکیان لە ئاستی کریتیکالدان.\n\nئایا دەتەوێت خودکار داواکاری بنێرم بۆ دابینکەرانت؟",
    ],
    strategy: [
      "زۆر باشە. لەسەر بنیادی دیتای مانگانەی کارەکەت، یەکەم شتی کە چاوم لێ دەکەوێت ئەوەیە کە ٦٨٪ لە فرۆشەکانت نەقدی بوو — ئەمە باشە بۆ گەردشی پارە، بەڵام فرصەتێکی گەورەی B2B هەیتە کە هێشتا تەواو نەیخۆشکراوەتەوە.\n\nئەگەر ٣–٤ کۆمپانیای نوێی مامەڵەکار بخەیتە ناو شبەکەیەتدا، دەتوانیت فرۆشی مانگانە ٢٠–٢٥٪ بەرزبکەیتەوە. بازاڕی دهۆک و کرکوکیش تاوەکو ئێستا بێ هەریمدە مانەوەتەوە بۆ بریکارانت.\n\nئایا دەتەوێت پلانی گسترینەوە بۆ ئەو ناوچانە ئامادە بکەم؟",
    ],
    report: [
      "بێگومان، ڕاپۆرتی مانگی حوزەیران ئامادەم کردووە:\n\nکۆی فرۆش ٤٨.٧ ملیۆن د.ع — گەشەی ١٢.٤٪ لە مانگی پێشوو. داواکارییەکانیش لە ٤٣ گەیشتووەتە ٥٧، کڕیارانی نوێ ٨ بووە. ئاستی جێبەجێکردن ٩٤٪ بووە کە ٥٪ باشترە لە مانگی پێشوو.\n\nبەگشتی مانگێکی بەهێزی کاری بووە. ئایا دەتەوێت ئەم ڕاپۆرتە بۆ Excel هەناردم بکەم؟",
    ],
    market: [
      "زۆر باشە. بازاڕی B2B لە هەرێمی کوردستان لەماوەی ئەمساڵدا ١٤٪ گەشەی کردووە. داوای دیجیتاڵی بازرگانی ٢٧٪ لە هەموو کڕینەکانی B2B تەواو دەکات.\n\nدوو فرصەتی گەورە دەبینم بۆ کارەکەت: بازاڕی کرکوک تاوەکو ئێستا ناخۆشکراوەتەوە — بریکاری تازە لەوێ دەتوانیت ٢٣٪ گەشەی نوێت بدات. هەروەها گەیاندنی خێرای ٤٨ کاتژمێر کانالێکی جیاوازی B2Bیە کە کۆمپانیاکان زیاتر باوەڕیان پێیدایە.\n\nدەتەوێت پلانی دەستپێکردن ئامادە بکەم؟",
    ],
    personal: [
      "بێگومان. لەسەر بنیادی مێژووی کارەکانت، کێشەی سەرەکی کارەکەت ئەوەیە کە فرۆشی وەرزی (seasonal) زیاد هەیەتە. مانگانی گەرما هەمیشە باشترن.\n\nپیشنیار دەکەم ئامادەکاری ئەنبار بکەیت پێش مانگی تەموز — بەتایبەتی بۆ خواردنەوەکان و مەوادی ناوماڵ. بریکارانت خۆشتر دەبێت ئەگەر نرخی تایبەتی وەرزی پیشکەشیان بکەیت.\n\nئایا دەتەوێت پلانی ئامادەکاری وەرزی بۆت دروست بکەم؟",
    ],
    fallback: [
      "زۆر باشە، بۆ ئەم جۆرە پرسیارانە دەتوانم شیکاری زیاترت بۆ بکەم. دەتوانیت وردترم بڵێیت مەبەستت چیە — فرۆش، ئەنبار، ڕاپۆرت، یان پلانی کار؟",
      "بێگومان، دەتوانم یارمەتیت بدەم. کام بابەتی کاری زیاتر گرنگتە بۆت — شیکاری فرۆش، بەڕێوەبردنی ئەنبار، یان ستراتیژی بازاڕ؟",
    ],
  },

  /* ════ ARABIC ════════════════════════════════════════════════════ */
  ar: {
    greeting: [
      "أهلاً وسهلاً! أنا مساعد LinQi الذكي. كيف يمكنني مساعدتك في إدارة أعمالك اليوم؟",
    ],
    sales: [
      "بالتأكيد، يمكنني مساعدتك في تحليل المبيعات. إجمالي مبيعات شهر حزيران بلغ ٤٨.٧ مليون دينار عراقي — بزيادة ١٢.٤٪ عن الشهر الماضي.\n\nأفضل المنتجات مبيعاً كانت زيت الزيتون والمعكرونة الإيطالية والسكر الأبيض. التوقعات تشير إلى نمو بين ١٠–١٤٪ الشهر القادم شريطة توفر المخزون الكافي.\n\nهل تريد تحليلاً أعمق لمنتج معين؟",
      "بالطبع، لديّ بيانات المبيعات جاهزة. سُجّلت ٦ صفقات جديدة هذا الأسبوع بإجمالي ١٢.٣ مليون دينار. هل تريد معرفة أي العملاء حقق أعلى المبيعات؟",
    ],
    inventory: [
      "بالتأكيد، سأراجع مستوى مخزونك. هناك ٣ منتجات وصلت إلى مستوى تحذيري:\n\nزيت الزيتون: ٣٢ علبة متبقية — الحد الأدنى الآمن ٥٠ علبة. حبوب القهوة: ١٨ كيلوغرام فقط — يحتاج طلباً عاجلاً. صابون الغسيل: ٦٤ كرتون في منطقة التحذير.\n\nهل تريد أن أُرسل طلب توريد B2B تلقائياً؟",
    ],
    strategy: [
      "بالتأكيد، إليك توصياتي الاستراتيجية بناءً على بيانات أعمالك:\n\nأولاً، ٦٨٪ من مبيعاتك نقدية — هذا جيد لتدفق السيولة، لكن هناك فرصة B2B لم تستغلها بالكامل بعد. إضافة ٣–٤ شركاء تجاريين جدد قد يرفع مبيعاتك الشهرية بنسبة ٢٠–٢٥٪.\n\nثانياً، أسواق دهوك وكركوك لا تزال غير مستثمرة من قِبل موزعيك — فرصة نمو تصل إلى ٢٣٪.\n\nهل تريد إعداد خطة توسع لتلك المناطق؟",
    ],
    report: [
      "بالتأكيد، إليك تقرير شهر حزيران:\n\nإجمالي المبيعات ٤٨.٧ مليون دينار — نمو ١٢.٤٪. الطلبات ارتفعت من ٤٣ إلى ٥٧. عملاء جدد ٨. نسبة تنفيذ الطلبات ٩٤٪ — أفضل بـ٥٪ من الشهر الماضي.\n\nبشكل عام، كان شهراً ممتازاً. هل تريد تصدير هذا التقرير إلى Excel؟",
    ],
    market: [
      "بالتأكيد، سأحلل السوق لك. نما سوق B2B في إقليم كردستان بنسبة ١٤٪ هذا العام، والتجارة الرقمية تمثل الآن ٢٧٪ من إجمالي صفقات B2B.\n\nأرى فرصتين كبيرتين: السوق في كركوك غير مستغل بالكامل — موزع جديد هناك قد يضيف ٢٣٪ نمواً. كذلك التوصيل السريع خلال ٤٨ ساعة أصبح ميزة تنافسية مهمة.\n\nهل تريد إعداد خطة الانطلاق؟",
    ],
    personal: [
      "بالتأكيد. بناءً على سجل أعمالك، الأنماط الموسمية واضحة — أشهر الصيف دائماً الأقوى أداءً.\n\nأنصح بتحضير المخزون قبل شهر تموز، خاصةً المشروبات والمواد الغذائية. تقديم أسعار موسمية خاصة للموزعين سيعزز ولاءهم أيضاً.\n\nهل تريد إعداد خطة التحضير الموسمي؟",
    ],
    fallback: [
      "بالتأكيد، يمكنني مساعدتك. هل يمكنك توضيح ما تحتاجه بشكل أكثر تفصيلاً؟ هل الأمر يتعلق بالمبيعات أم المخزون أم التقارير؟",
      "أهلاً! سؤالك وصلني. للإجابة بشكل دقيق، هل يمكنك تحديد الجانب الذي يهمك أكثر — المبيعات، المخزون، أم استراتيجية السوق؟",
    ],
  },

  /* ════ ENGLISH ═══════════════════════════════════════════════════ */
  en: {
    greeting: [
      "Hello! I'm the LinQi AI Business Assistant. How can I help you manage your operations today?",
    ],
    sales: [
      "Absolutely! Here's your sales overview: June revenue reached 48.7M IQD — that's a 12.4% increase over last month.\n\nTop performers were olive oil (5L), Italian pasta, and white sugar. Forecast for next month is 10–14% growth, provided your inventory stays stocked.\n\nWould you like a deeper breakdown by product or customer?",
      "Great question. This week you've logged 6 new transactions totaling 12.3M IQD. Your sales pipeline looks healthy. Want to know which customer drove the highest revenue?",
    ],
    inventory: [
      "Sure, let me check your stock levels. You currently have 3 products approaching critical thresholds:\n\nOlive oil: 32 units left — safety stock is 50. Coffee beans: 18 kg remaining — urgent reorder needed. Laundry detergent: 64 cartons in the warning zone.\n\nShould I automatically generate a B2B purchase order to your verified suppliers?",
    ],
    strategy: [
      "Great, here are my strategic recommendations based on your data:\n\nFirst, 68% of your sales are cash transactions — while good for liquidity, there's an untapped B2B opportunity. Adding 3–4 corporate accounts could grow monthly revenue by 20–25%.\n\nSecond, the Duhok and Kirkuk markets remain uncovered by your distributors — that's a potential 23% growth opportunity.\n\nWould you like me to draft an expansion plan for those regions?",
    ],
    report: [
      "Absolutely! Here's your June business report:\n\nTotal sales: 48.7M IQD — up 12.4%. Orders increased from 43 to 57. New customers: 8. Order fulfillment rate: 94% — 5% better than last month.\n\nOverall, an excellent month. Would you like me to export this as an Excel file?",
    ],
    market: [
      "Of course! B2B market in Kurdistan Region grew 14% this year, with digital commerce now accounting for 27% of all B2B transactions.\n\nI see two major opportunities for your business: the Kirkuk market remains largely untapped — a new distributor there could add 23% growth. Also, 48-hour fast delivery has become a key differentiator that corporate buyers increasingly value.\n\nShould I prepare a go-to-market plan?",
    ],
    personal: [
      "Sure! Based on your business history, there's a clear seasonal pattern — summer months consistently outperform the rest of the year.\n\nI'd recommend preparing inventory before July, especially beverages and household goods. Offering seasonal pricing to distributors will also help lock in their loyalty.\n\nWould you like me to build a seasonal preparation plan?",
    ],
    fallback: [
      "I'd be happy to help! Could you tell me a bit more about what you're looking for? I can assist with sales analysis, inventory management, business reports, or market strategy.",
      "Sure, I can dig into that for you. To give you the most accurate insights, could you clarify which area matters most — sales, inventory, reporting, or market trends?",
    ],
  },
};

/* Rotate variants per topic+lang to avoid repetition */
const counters: Record<string, number> = {};
function pick(lang: Lang, topic: string): string {
  const pool = BANKS[lang][topic] ?? BANKS[lang].fallback;
  const key  = `${lang}.${topic}`;
  const idx  = (counters[key] ?? 0) % pool.length;
  counters[key] = idx + 1;
  return pool[idx];
}

function route(text: string, lang: Lang): string {
  const q = text.toLowerCase();
  /* greeting */
  if (/^(hello|hi|hey|سڵاو|مرحبا|أهلا|اهلا|باشی)/.test(q))
    return pick(lang, "greeting");
  /* sales */
  if (/(sales|revenue|فرۆش|داهات|مامەڵە|مبيعات|إيرادات|تحليل مبيعات)/.test(q))
    return pick(lang, "sales");
  /* inventory */
  if (/(inventor|stock|ئەنبار|ستۆک|کاڵا|مخزون|مستودع|بضاعة)/.test(q))
    return pick(lang, "inventory");
  /* strategy */
  if (/(strateg|ستراتیژ|پێشنیار|بەهێزکردن|استراتيج|توصية|تحسين)/.test(q))
    return pick(lang, "strategy");
  /* report */
  if (/(report|ڕاپۆرت|دروستکردن|تقرير|تحليل|ارسال)/.test(q))
    return pick(lang, "report");
  /* market */
  if (/(market|بازاڕ|فرصەت|تووێژ|سوق|فرصة|توقعات)/.test(q))
    return pick(lang, "market");
  /* personal / history */
  if (/(personal|history|مێژوو|تایبەتی|فێربوون|شخصي|سجل)/.test(q))
    return pick(lang, "personal");
  return pick(lang, "fallback");
}

/* ─────────────────────────────────────────────────────────────────── */
/*  QUICK-ACTION BUTTONS                                                */
/* ─────────────────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: BarChart3,   color: CYAN,     label: "چاتی کارەبایی",     sub: "شیکاری فرۆشی ئەمسەر",   prompt: "دەمەوێت شیکارییەک بۆ فرۆشی ئەمسەر بکەم"          },
  { icon: Lightbulb,   color: PURPLE,   label: "پێشنیازی ستراتیژی", sub: "بۆ گەشەکردنی کارەکانت", prompt: "پێشنیازی ستراتیژیی بدەم بۆ بەهێزکردنی کارەکانم"   },
  { icon: FileText,    color: GREEN,    label: "دروستکردنی ڕاپۆرت", sub: "ڕاپۆرتی پڕۆفیشناڵ",     prompt: "ڕاپۆرتی کاری مانگانەم بۆ حوزەیران دروست بکە"      },
  { icon: Package,     color: "#f97316",label: "شیکاری ئەنبار",    sub: "ستۆک و کەمبوونەکان",     prompt: "ئاستی ئەنبارم شیبکەرەوە و پێشنیارم بدە"          },
  { icon: TrendingUp,  color: BLUE,     label: "پیشبینیی بازاڕ",   sub: "تووێژ و فرصەتەکان",     prompt: "شیکاری بازاڕی B2B و فرصەتەکانم پیشانم بدە"       },
  { icon: Brain,       color: "#ec4899",label: "فێربوونی تایبەتی", sub: "پیشنیاز لەسەر کارەکانت", prompt: "لەسەر بنیادی مێژووی کارەکانم چی پێشنیاز دەکەی؟"  },
];

/* ─────────────────────────────────────────────────────────────────── */
/*  TYPES                                                               */
/* ─────────────────────────────────────────────────────────────────── */
type MsgState = "thinking" | "typing" | "done";

interface Message {
  id:       string;
  role:     "user" | "assistant";
  fullText: string;
  state:    MsgState;
  lang:     Lang;
  ts:       Date;
}

/* ─────────────────────────────────────────────────────────────────── */
/*  TYPING DOTS                                                         */
/* ─────────────────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="w-2 h-2 rounded-full"
          style={{ background: PURPLE, display: "inline-block" }}
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.14 }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  TYPEWRITER — streams text character by character                   */
/* ─────────────────────────────────────────────────────────────────── */
function TypewriterText({ fullText, lang, onDone }: { fullText: string; lang: Lang; onDone: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(id);
        if (!doneRef.current) { doneRef.current = true; onDone(); }
        return;
      }
      setDisplayed(fullText.slice(0, i + 1));
      i++;
    }, 16);
    return () => clearInterval(id);
  }, [fullText]); // eslint-disable-line react-hooks/exhaustive-deps

  return <RichText text={displayed} lang={lang} streaming />;
}

/* ─────────────────────────────────────────────────────────────────── */
/*  RICH TEXT — bold + newlines + cursor, direction-aware              */
/* ─────────────────────────────────────────────────────────────────── */
function RichText({ text, lang, streaming }: { text: string; lang: Lang; streaming?: boolean }) {
  const isRTL = lang !== "en";
  const lines  = text.split("\n");
  return (
    <div dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "Vazirmatn,sans-serif", lineHeight: "1.78", fontSize: "13px",
        color: SUB, textAlign: isRTL ? "right" : "left" }}>
      {lines.map((line, li) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={li} style={{ marginBottom: li < lines.length - 1 ? "4px" : 0 }}>
            {parts.map((part, pi) =>
              pi % 2 === 1
                ? <strong key={pi} style={{ color: TEXT, fontWeight: 800 }}>{part}</strong>
                : <span key={pi}>{part}</span>
            )}
            {streaming && li === lines.length - 1 && (
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.65, repeat: Infinity }}
                style={{ display: "inline-block", width: "2px", height: "14px",
                  background: PURPLE, marginInlineStart: "2px", verticalAlign: "text-bottom",
                  borderRadius: "1px" }} />
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  MAIN PAGE                                                           */
/* ─────────────────────────────────────────────────────────────────── */
const WELCOME: Message = {
  id: "welcome", role: "assistant", state: "done", lang: "ku", ts: new Date(),
  fullText: "سڵاو! من یارمەتیدەری زیرەکی LinQiـم. چۆن دەتوانم ئەمڕۆ لە بەڕێوەبردنی کارەکەتدا یارمەتیت بدەم؟",
};

const LANG_LABEL: Record<Lang, string> = { ku: "کوردی", ar: "عربی", en: "English" };

export default function AIAssistant() {
  const { t } = useTranslation("common");
  const sectorLabel = useSectorLabel();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input,    setInput]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const taRef                   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markDone = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, state: "done" as MsgState } : m));
    setBusy(false);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);

    const lang = detectLang(text.trim());

    const userMsg: Message = {
      id: `u-${Date.now()}`, role: "user",
      fullText: text.trim(), state: "done", lang, ts: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const aiId = `a-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: aiId, role: "assistant", fullText: "", state: "thinking", lang, ts: new Date() },
    ]);

    /* Think: 700–1 300 ms */
    await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

    const fullText = route(text.trim(), lang);
    setMessages(prev =>
      prev.map(m => m.id === aiId ? { ...m, fullText, state: "typing" } : m)
    );
  }, [busy]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const reset = () => {
    setBusy(false);
    setInput("");
    setMessages([{ ...WELCOME, id: `w-${Date.now()}`, ts: new Date() }]);
  };

  const fmtTime = (d: Date) => d.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  /* Detect language of input as user types (for input bubble alignment) */
  const inputLang = input.trim() ? detectLang(input) : "ku";

  return (
    <div dir="rtl" style={{ minHeight: "100%", display: "flex", flexDirection: "column", gap: "18px" }}>

      {/* ══ HEADER ══════════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: `linear-gradient(135deg,${PURPLE}18 0%,rgba(8,13,30,.97) 60%)`,
          border: `1px solid ${PURPLE}30`, boxShadow: `0 8px 48px ${PURPLE}14` }}>
        <div style={{ position:"absolute",top:"-30px",insetInlineEnd:"-20px",width:"150px",height:"150px",
          borderRadius:"50%",background:`radial-gradient(circle,${PURPLE}22,transparent 70%)`,
          filter:"blur(24px)",pointerEvents:"none" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background:`${PURPLE}22`,border:`1.5px solid ${PURPLE}45`,boxShadow:`0 0 24px ${PURPLE}28` }}>
            <Bot className="w-6 h-6" style={{ color:"#c4b5fd" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-extrabold" style={{ color:TEXT,fontFamily:"Vazirmatn,sans-serif" }}>
                {t("pageTitles.aiAssistant", { sector: sectorLabel })}
              </h1>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full"
                style={{ background:`${PURPLE}20`,color:"#c4b5fd",border:`1px solid ${PURPLE}45` }}>
                AI · B2B
              </span>
            </div>
            <p className="text-[11px]" style={{ color:"rgba(255,255,255,.45)",fontFamily:"Vazirmatn,sans-serif" }}>
              {t("pageTitles.aiAssistantSubtitle", { sector: sectorLabel })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {/* Live dot */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background:"rgba(16,185,129,.10)",border:"1px solid rgba(16,185,129,.2)" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background:GREEN }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background:GREEN }} />
              </span>
              <span className="text-[10px] font-bold" style={{ color:"#34d399" }}>ئۆنلاینە</span>
            </div>
            {/* Active language pill */}
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background:"rgba(6,182,212,.12)",color:CYAN,border:`1px solid ${CYAN}30` }}>
              {LANG_LABEL[inputLang]}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ══ QUICK-ACTION GRID ═══════════════════════════════════════ */}
      <div>
        <p className="text-[10px] font-bold mb-3 flex items-center gap-1.5"
          style={{ color:MUTED,fontFamily:"Vazirmatn,sans-serif" }}>
          <Zap className="w-3 h-3" />
          دوگمەکانی خێرا — کلیک بکە بۆ دەستپێکردن
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <motion.button key={qa.label}
                initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }}
                transition={{ delay: i*0.04 }}
                onClick={() => send(qa.prompt)}
                disabled={busy}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl text-start"
                style={{ ...glass(), cursor: busy ? "not-allowed":"pointer", opacity: busy ? 0.45:1, transition:"all 0.17s" }}
                onMouseEnter={e => { if (!busy) { const el = e.currentTarget as HTMLElement;
                  el.style.background="rgba(255,255,255,.055)"; el.style.borderColor=`${qa.color}38`;
                  el.style.transform="translateY(-2px)"; el.style.boxShadow=`0 8px 24px rgba(0,0,0,.3),0 0 0 1px ${qa.color}20`;
                }}}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement;
                  el.style.background="rgba(255,255,255,.03)"; el.style.borderColor="rgba(255,255,255,.06)";
                  el.style.transform="translateY(0)"; el.style.boxShadow="none";
                }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`${qa.color}16`,border:`1.5px solid ${qa.color}30` }}>
                  <Icon className="w-4 h-4" style={{ color:qa.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-extrabold leading-snug"
                    style={{ color:TEXT,fontFamily:"Vazirmatn,sans-serif" }}>{qa.label}</p>
                  <p className="text-[9px] mt-0.5"
                    style={{ color:MUTED,fontFamily:"Vazirmatn,sans-serif" }}>{qa.sub}</p>
                </div>
                <ChevronRight className="w-3 h-3 self-end" style={{ color:qa.color,opacity:.55 }} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ══ CHAT WINDOW ═════════════════════════════════════════════ */}
      <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.22 }}
        className="flex flex-col"
        style={{ ...glass(), flex:1, minHeight:"360px", overflow:"hidden" }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom:"1px solid rgba(255,255,255,.055)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color:PURPLE }} />
            <span className="text-[12px] font-bold" style={{ color:TEXT,fontFamily:"Vazirmatn,sans-serif" }}>
              کۆنسۆڵی LinQi AI
            </span>
            {busy && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                style={{ background:`${PURPLE}15`,color:"#c4b5fd",border:`1px solid ${PURPLE}30` }}>
                دەنووسێت…
              </span>
            )}
          </div>
          <button onClick={reset}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{ background:"rgba(255,255,255,.04)",color:MUTED,border:"1px solid rgba(255,255,255,.06)" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${PURPLE}35`;(e.currentTarget as HTMLElement).style.color="#c4b5fd";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.06)";(e.currentTarget as HTMLElement).style.color=MUTED;}}>
            <RefreshCw className="w-3 h-3" />نوێکردنەوە
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight:"400px" }}>
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const isRTL = msg.lang !== "en";
              return (
                <motion.div key={msg.id}
                  initial={{ opacity:0,y:10,scale:.97 }} animate={{ opacity:1,y:0,scale:1 }}
                  transition={{ duration:0.18 }}
                  className={`flex gap-3 ${msg.role==="user" ? "flex-row-reverse" : "flex-row"}`}>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={msg.role==="assistant"
                      ? { background:`${PURPLE}20`,border:`1.5px solid ${PURPLE}40` }
                      : { background:"rgba(6,182,212,.18)",border:`1.5px solid ${CYAN}40` }}>
                    {msg.role==="assistant"
                      ? <Bot className="w-4 h-4" style={{ color:"#c4b5fd" }} />
                      : <Users className="w-4 h-4" style={{ color:CYAN }} />}
                  </div>

                  {/* Bubble */}
                  <div style={{ flex:1, maxWidth:"82%" }}>
                    <div className="rounded-2xl px-4 py-3"
                      style={msg.role==="assistant"
                        ? { background:"rgba(139,92,246,.07)",border:`1px solid ${PURPLE}20`,
                            borderStartStartRadius:"4px" }
                        : { background:"rgba(6,182,212,.09)",border:`1px solid ${CYAN}20`,
                            borderStartEndRadius:"4px" }}>
                      {msg.role === "assistant" ? (
                        msg.state === "thinking" ? (
                          <TypingDots />
                        ) : msg.state === "typing" ? (
                          <TypewriterText fullText={msg.fullText} lang={msg.lang}
                            onDone={() => markDone(msg.id)} />
                        ) : (
                          <RichText text={msg.fullText} lang={msg.lang} />
                        )
                      ) : (
                        /* User bubble — direction matches their language */
                        <p dir={isRTL ? "rtl" : "ltr"}
                          style={{ fontFamily:"Vazirmatn,sans-serif",fontSize:"13px",color:TEXT,
                            textAlign: isRTL ? "right" : "left" }}>
                          {msg.fullText}
                        </p>
                      )}
                    </div>
                    {/* Time + lang tag */}
                    <div className={`flex items-center gap-1.5 mt-1 px-1 ${msg.role==="user" ? "justify-end" : ""}`}>
                      <span className="text-[9px]" style={{ color:"rgba(100,116,139,.6)" }}>
                        {fmtTime(msg.ts)}
                      </span>
                      {msg.role === "assistant" && (
                        <span className="text-[8px] font-bold px-1.5 py-px rounded-full"
                          style={{ background:"rgba(255,255,255,.05)",color:"rgba(100,116,139,.7)" }}>
                          {LANG_LABEL[msg.lang]}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="px-4 pb-4 pt-3" style={{ borderTop:"1px solid rgba(255,255,255,.05)" }}>
          {/* Live lang indicator above input */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px]" style={{ color:MUTED,fontFamily:"Vazirmatn,sans-serif" }}>
              زمانی ئێستا:
            </span>
            <span className="text-[9px] font-bold px-1.5 py-px rounded-full"
              style={{ background:"rgba(6,182,212,.12)",color:CYAN,border:`1px solid ${CYAN}25` }}>
              {LANG_LABEL[inputLang]}
            </span>
          </div>
          <div className="flex items-end gap-3 rounded-2xl p-2"
            style={{ background:"rgba(255,255,255,.04)",
              border:`1px solid ${busy ? `${PURPLE}35`:"rgba(255,255,255,.08)"}`,
              transition:"border-color 0.2s,box-shadow 0.2s",
              boxShadow: busy ? `0 0 0 3px ${PURPLE}12`:"none" }}>
            <textarea ref={taRef}
              value={input} rows={1}
              dir={inputLang === "en" ? "ltr" : "rtl"}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              placeholder="لێرە پرسیارەکەت بنووسە… / Type your question…"
              className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed"
              style={{ color:TEXT,fontFamily:"Vazirmatn,sans-serif",
                maxHeight:"110px",minHeight:"24px",paddingInlineStart:"6px",
                textAlign: inputLang === "en" ? "left" : "right" }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height="auto";
                el.style.height=Math.min(el.scrollHeight,110)+"px";
              }} />
            <button onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={input.trim() && !busy
                ? { background:`linear-gradient(135deg,${PURPLE},${BLUE})`,boxShadow:`0 4px 16px ${PURPLE}40`,cursor:"pointer" }
                : { background:"rgba(255,255,255,.06)",cursor:"not-allowed",opacity:.4 }}>
              {busy
                ? <motion.div animate={{ rotate:360 }} transition={{ duration:1,repeat:Infinity,ease:"linear" }}>
                    <RefreshCw className="w-3.5 h-3.5" style={{ color:"#c4b5fd" }} />
                  </motion.div>
                : <Send className="w-3.5 h-3.5" style={{ color: input.trim() ? TEXT : MUTED }} />}
            </button>
          </div>
          <p className="text-[9px] mt-1.5 text-center"
            style={{ color:"rgba(100,116,139,.4)",fontFamily:"Vazirmatn,sans-serif" }}>
            Enter · ناردن &nbsp;|&nbsp; Shift+Enter · هێڵی نوێ
          </p>
        </div>
      </motion.div>
    </div>
  );
}
