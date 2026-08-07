/**
 * Settings page — /settings
 * Four tabs: Profile, Company/Store, Preferences, Security
 *
 * IMPORTANT: all sub-components (Field, PwdField, SaveButton, tab panels) are
 * declared at **module level** — never inside another component. Defining
 * components inside a render function creates a new identity on every render,
 * causing React to unmount/remount them constantly, which breaks controlled
 * inputs (they lose focus after every keystroke).
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, PRESETS } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  User, Building2, Globe, ShieldCheck,
  Eye, EyeOff, Check, Loader2, Camera,
  AlertCircle,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  formatStoreAddress,
  isValidCoords,
  resolveStoreCoords,
  saveStoreLocationLocal,
} from "@/lib/store-location";
import { mergeCachedUser } from "@/lib/api-fallback";
import { StoreLocationPicker } from "@/components/StoreLocationPicker";

/* ─────────────────────────────────────────────────────────────────────
   AUTH HELPER — reuse the same localStorage key as AuthContext
───────────────────────────────────────────────────────────────────── */
const TOKEN_KEY = "pos_auth_token";

async function patchApi(path: string, body: object) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? "هەڵەیەک ڕوویدا");
  return data;
}

/* ─────────────────────────────────────────────────────────────────────
   SHARED STYLES
───────────────────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background:   "rgba(255,255,255,0.045)",
  border:       "1px solid rgba(255,255,255,0.10)",
  color:        "rgba(255,255,255,0.88)",
  fontFamily:   "Vazirmatn, sans-serif",
  borderRadius: 10,
  padding:      "10px 14px",
  width:        "100%",
  outline:      "none",
  fontSize:     13,
  transition:   "border-color 0.15s, box-shadow 0.15s",
};

const cardStyle: React.CSSProperties = {
  background:           "rgba(255,255,255,0.025)",
  backdropFilter:       "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border:               "1px solid rgba(255,255,255,0.07)",
  boxShadow:            "0 8px 48px rgba(0,0,0,0.40)",
  borderRadius:         20,
};

/* ─────────────────────────────────────────────────────────────────────
   FIELD  (module-level — never nest inside another component)
───────────────────────────────────────────────────────────────────── */
interface FieldProps {
  label:       string;
  value:       string;
  onChange?:   (v: string) => void;
  type?:       string;
  placeholder?: string;
  readOnly?:   boolean;
  error?:      string;
  suffix?:     React.ReactNode;
  rows?:       number;
}

function Field({ label, value, onChange, type = "text", placeholder = "", readOnly = false, error, suffix, rows }: FieldProps) {
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (readOnly) return;
    e.currentTarget.style.borderColor = "rgba(59,130,246,0.55)";
    e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(59,130,246,0.10)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = error ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.10)";
    e.currentTarget.style.boxShadow   = "none";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-bold uppercase tracking-[0.08em]"
        style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Vazirmatn, sans-serif" }}
      >
        {label}
      </label>
      <div className="relative">
        {rows ? (
          <textarea
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            rows={rows}
            placeholder={placeholder}
            style={{
              ...inputStyle,
              resize:    "vertical",
              minHeight: 80,
              ...(error ? { borderColor: "rgba(239,68,68,0.55)" } : {}),
            }}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            style={{
              ...inputStyle,
              ...(readOnly   ? { opacity: 0.55, cursor: "not-allowed" } : {}),
              ...(suffix     ? { paddingInlineEnd: 44 } : {}),
              ...(error      ? { borderColor: "rgba(239,68,68,0.55)" } : {}),
            }}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )}
        {suffix && (
          <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
            <div className="pointer-events-auto">{suffix}</div>
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px]" style={{ color: "#f87171", fontFamily: "Vazirmatn, sans-serif" }}>
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   PWD FIELD  (module-level — needed by SecurityTab)
   Props include state setters from parent so it never manages its own
   show/hide state; parent keeps the single source of truth.
───────────────────────────────────────────────────────────────────── */
interface PwdFieldProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  show:     boolean;
  onToggle: () => void;
  error?:   string;
}

function PwdField({ label, value, onChange, show, onToggle, error }: PwdFieldProps) {
  return (
    <Field
      label={label}
      value={value}
      onChange={onChange}
      type={show ? "text" : "password"}
      placeholder="••••••••"
      error={error}
      suffix={
        <button
          type="button"
          onClick={onToggle}
          style={{ color: "rgba(255,255,255,0.40)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SAVE BUTTON  (module-level)
───────────────────────────────────────────────────────────────────── */
function SaveButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-150"
      style={{
        background: loading
          ? "rgba(59,130,246,0.35)"
          : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
        color:      loading ? "rgba(255,255,255,0.45)" : "#fff",
        border:     "1px solid rgba(99,179,255,0.30)",
        boxShadow:  loading ? "none" : "0 4px 18px rgba(37,99,235,0.35)",
        fontFamily: "Vazirmatn, sans-serif",
        cursor:     loading ? "not-allowed" : "pointer",
      }}
    >
      {loading
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />چاوەڕوان بە...</>
        : label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION HEADING  (module-level)
───────────────────────────────────────────────────────────────────── */
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pb-4 mb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <h2 className="text-[15px] font-black text-white" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{title}</h2>
      {sub && <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Vazirmatn, sans-serif" }}>{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILE TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name:      user?.name      ?? "",
    username:  user?.username  ?? "",
    email:     user?.email     ?? "",
    phone:     user?.phone     ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  });
  const [errors, setErrors]   = useState<Partial<typeof form>>({});
  const [saving, setSaving]   = useState(false);

  function setField<K extends keyof typeof form>(k: K) {
    return (v: string) => {
      setForm(f => ({ ...f, [k]: v }));
      if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
    };
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim())     e.name     = "ناو پێویستە";
    if (!form.username.trim()) e.username = "ناوی بەکارهێنەر پێویستە";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await patchApi("/api/auth/me", form);
      refreshUser();
      toast({ title: "✅ زانیارییەکان بە سەرکەوتوویی پاشەکەوت کران" });
    } catch (err: unknown) {
      toast({
        title:   "❌ " + (err instanceof Error ? err.message : "هەڵەیەک ڕوویدا"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title="ڕێکخستنی پرۆفایل" sub="ناو، ئیمەیڵ، و زانیاری کەسی" />

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--terminal-accent,#1A6AFF) 0%, color-mix(in srgb, var(--terminal-accent,#1A6AFF) 60%, #000) 100%)" }}
        >
          {form.avatarUrl ? (
            <img
              src={form.avatarUrl}
              alt="avatar"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <span className="text-2xl font-black text-white select-none">
              {(form.name || user?.name || "L").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <p className="text-[13px] font-bold text-white" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            {form.name || "—"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Vazirmatn, sans-serif" }}>
            @{form.username || "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="ناوی تەواو"
          value={form.name}
          onChange={setField("name")}
          placeholder="ناوی تەواوت بنووسە"
          error={errors.name}
        />
        <Field
          label="ناوی بەکارهێنەر"
          value={form.username}
          onChange={setField("username")}
          placeholder="username"
          error={errors.username}
        />
        <Field
          label="ئیمەیڵ"
          value={form.email}
          onChange={setField("email")}
          type="email"
          placeholder="you@example.com"
        />
        <Field
          label="ژمارەی مۆبایل"
          value={form.phone}
          onChange={setField("phone")}
          type="tel"
          placeholder="+964 7XX XXX XXXX"
        />
      </div>
      <Field
        label="بەستەری وێنەی پرۆفایل (URL)"
        value={form.avatarUrl}
        onChange={setField("avatarUrl")}
        placeholder="https://example.com/avatar.jpg"
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label="پاشەکەوتکردنی پرۆفایل" />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPANY TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function CompanyTab() {
  const { user, refreshUser, loginWithToken, token } = useAuth();
  const { toast } = useToast();

  const initialCoords = resolveStoreCoords(user ?? undefined);

  const [form, setForm] = useState({
    storeName:    user?.storeName    ?? "",
    storeAddress: user?.storeAddress ?? "",
    taxNumber:    user?.taxNumber    ?? "",
  });
  const [storeLat, setStoreLat] = useState(initialCoords.lat);
  const [storeLng, setStoreLng] = useState(initialCoords.lng);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof typeof form>(k: K) {
    return (v: string) => setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);

    const storeAddress = isValidCoords(storeLat, storeLng)
      ? formatStoreAddress(storeLat, storeLng, form.storeAddress)
      : form.storeAddress;

    const payload = {
      ...form,
      storeAddress,
      storeLat,
      storeLng,
    };

    try {
      const data = await patchApi("/api/auth/me", payload);
      if (user?.id) {
        saveStoreLocationLocal(user.id, storeLat, storeLng, storeAddress);
      }
      if (data && token && user) {
        loginWithToken(token, { ...user, ...data });
      } else {
        refreshUser();
      }
      toast({ title: "✅ زانیارییەکان بە سەرکەوتوویی پاشەکەوت کران" });
    } catch (err: unknown) {
      if (user?.id) {
        saveStoreLocationLocal(user.id, storeLat, storeLng, storeAddress);
      }
      if (token && user) {
        const merged = mergeCachedUser({ ...user, ...payload, storeAddress });
        loginWithToken(token, merged);
      }
      toast({
        title: "✅ لە ناوخۆیی پاشەکەوت کرا (API بەردەست نییە)",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title="ڕێکخستنی دووکان / کۆمپانیا" sub="ناو، ناونیشان، شوێنی GPS، و ژمارەی تۆمارکردن" />

      <Field
        label="ناوی دووکان / کۆمپانیا"
        value={form.storeName}
        onChange={setField("storeName")}
        placeholder="ناوی دووکانەکەت بنووسە"
      />
      {user?.sectorKey && (
        <Field
          label="بواری کار"
          value={user.sectorKey}
          readOnly
        />
      )}

      <div className="flex flex-col gap-2">
        <label
          className="text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Vazirmatn, sans-serif" }}
        >
          شوێنی دووکان لەسەر نەخشە
        </label>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          کلیک بکە یان مارکەرەکە ڕاکێشە بۆ دیاریکردنی شوێنی ڕاستەقینەی دووکانەکەت
        </p>
        <StoreLocationPicker
          lat={storeLat}
          lng={storeLng}
          onChange={(lat, lng) => {
            setStoreLat(lat);
            setStoreLng(lng);
          }}
          label={form.storeName || user?.storeName}
          height={280}
          interactive
        />
        <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }} dir="ltr">
          {storeLat.toFixed(5)}, {storeLng.toFixed(5)}
        </p>
      </div>

      <Field
        label="ناونیشانی دووکان"
        value={form.storeAddress}
        onChange={setField("storeAddress")}
        placeholder="ناونیشانی تەواوی دووکانەکەت"
        rows={3}
      />
      <Field
        label="ژمارەی تۆمارکردنی باج"
        value={form.taxNumber}
        onChange={setField("taxNumber")}
        placeholder="TRN-XXXXXXXX"
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label="پاشەکەوتکردنی زانیاری دووکان" />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PREFERENCES TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function PreferencesTab() {
  const { colors, applyPreset } = useTheme();

  return (
    <div className="flex flex-col gap-8">
      <SectionHead title="پەسەندکراوەکان" sub="زمان و ڕووکاری ئەپ" />

      {/* Language */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-bold text-white" style={{ fontFamily: "Vazirmatn, sans-serif" }}>زمان</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Vazirmatn, sans-serif" }}>
            زمانی پیشاندانی ئەپەکە هەڵبژێرە. دەستکاری دەرەکیش دەگۆڕێت.
          </p>
        </div>
        <div className="flex">
          <LanguageSwitcher variant="header" align="start" />
        </div>
      </section>

      {/* Theme */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-bold text-white" style={{ fontFamily: "Vazirmatn, sans-serif" }}>ڕووکاری ئەپ</p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Vazirmatn, sans-serif" }}>
            ڕەنگ و ستایلی ئەپەکە هەڵبژێرە. دەستکاری ئۆتۆماتیکی پاشەکەوت دەکرێت.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESETS.map(preset => {
            const active = colors.accent === preset.colors.accent && colors.bg === preset.colors.bg;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.name)}
                className="flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all duration-150"
                style={{
                  background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border:     active ? `1.5px solid ${preset.colors.accent}` : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow:  active ? `0 0 18px ${preset.colors.accent}30` : "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.bg} 0%, ${preset.colors.accent} 100%)`,
                    border:     `2px solid ${preset.colors.accent}60`,
                  }}
                />
                <span
                  className="text-[10.5px] font-bold text-center leading-snug"
                  style={{
                    color:      active ? preset.colors.accent : "rgba(255,255,255,0.50)",
                    fontFamily: "Vazirmatn, sans-serif",
                  }}
                >
                  {preset.label}
                </span>
                {active && (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: preset.colors.accent }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECURITY TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function SecurityTab() {
  const { toast } = useToast();

  const [form, setForm]     = useState({ current: "", next: "", confirm: "" });
  const [show, setShow]     = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof typeof form>(k: K) {
    return (v: string) => {
      setForm(f => ({ ...f, [k]: v }));
      if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }));
    };
  }

  function toggleShow(k: keyof typeof show) {
    setShow(s => ({ ...s, [k]: !s[k] }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.current)            e.current = "وشەی نهێنی ئێستا پێویستە";
    if (form.next.length < 6)     e.next    = "لانیکەم ٦ پیت پێویستە";
    if (form.next !== form.confirm) e.confirm = "وشەی نهێنیەکان یەکسان نین";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await patchApi("/api/auth/me/password", {
        currentPassword: form.current,
        newPassword:     form.next,
      });
      toast({ title: "✅ وشەی نهێنی بە سەرکەوتوویی گۆڕدرا" });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err: unknown) {
      toast({
        title:   "❌ " + (err instanceof Error ? err.message : "هەڵەیەک ڕوویدا"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title="ئاسایش" sub="گۆڕینی وشەی نهێنی" />

      {/* Info banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#60a5fa" }} />
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Vazirmatn, sans-serif" }}>
          بۆ گۆڕینی وشەی نهێنی، پێویستە وشەی نهێنی ئێستاکەت بزانیت. وشەی نهێنی نوێ دەبێت لانیکەم ٦ پیت بێت.
        </p>
      </div>

      {/*
        PwdField is a MODULE-LEVEL component — NOT defined here.
        Passing show/toggle as props keeps it stable across re-renders.
      */}
      <PwdField
        label="وشەی نهێنی ئێستا"
        value={form.current}
        onChange={setField("current")}
        show={show.current}
        onToggle={() => toggleShow("current")}
        error={errors.current}
      />
      <PwdField
        label="وشەی نهێنی نوێ"
        value={form.next}
        onChange={setField("next")}
        show={show.next}
        onToggle={() => toggleShow("next")}
        error={errors.next}
      />
      <PwdField
        label="دووپاتکردنەوەی وشەی نهێنی نوێ"
        value={form.confirm}
        onChange={setField("confirm")}
        show={show.confirm}
        onToggle={() => toggleShow("confirm")}
        error={errors.confirm}
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label="گۆڕینی وشەی نهێنی" />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TABS CONFIG
═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "profile",     Icon: User,        label: "پرۆفایل"        },
  { id: "company",     Icon: Building2,   label: "دووکان"         },
  { id: "preferences", Icon: Globe,       label: "پەسەندکراوەکان" },
  { id: "security",    Icon: ShieldCheck, label: "ئاسایش"         },
] as const;

type TabId = typeof TABS[number]["id"];

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS PAGE  (main export — module-level)
═══════════════════════════════════════════════════════════════════ */
export default function Settings() {
  const [active, setActive] = useState<TabId>("profile");

  return (
    <div
      className="min-h-full w-full"
      style={{
        background: "linear-gradient(135deg, var(--terminal-bg,#0b0f17) 0%, color-mix(in srgb, var(--terminal-bg,#0b0f17) 85%, var(--terminal-accent,#1A6AFF)) 100%)",
        fontFamily: "Vazirmatn, sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            ڕێکخستنەکان
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Vazirmatn, sans-serif" }}>
            بەڕێوەبردنی پرۆفایل، دووکان، پەسەندکراوەکان، و ئاسایش
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 mb-6 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {TABS.map(({ id, Icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition-all duration-150 text-[11.5px] font-bold"
                style={{
                  background: isActive ? "rgba(255,255,255,0.09)" : "transparent",
                  color:      isActive ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.38)",
                  border:     isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                  boxShadow:  isActive ? "0 2px 12px rgba(0,0,0,0.30)" : "none",
                  fontFamily: "Vazirmatn, sans-serif",
                  cursor:     "pointer",
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div style={cardStyle} className="p-6 sm:p-8">
              {active === "profile"     && <ProfileTab />}
              {active === "company"     && <CompanyTab />}
              {active === "preferences" && <PreferencesTab />}
              {active === "security"    && <SecurityTab />}
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
