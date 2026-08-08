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
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import {
  User, Building2, Globe, ShieldCheck,
  Eye, EyeOff, Check, Loader2, Camera,
  AlertCircle,
} from "lucide-react";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PageHeader } from "@/components/PageHeader";
import {
  formatStoreAddress,
  isValidCoords,
  resolveStoreCoords,
  saveStoreLocationLocal,
} from "@/lib/store-location";
import { mergeCachedUser } from "@/lib/api-fallback";
import { StoreLocationPicker } from "@/components/StoreLocationPicker";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { C } from "./dashboard-tokens";

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
  if (!res.ok) throw new Error((data as { message?: string }).message ?? i18n.t("common.error"));
  return data;
}

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
  const inputClass = "linqi-settings-input" + (error ? " !border-rose-500/55" : "");

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-bold uppercase tracking-[0.08em] linqi-page-muted"
        style={{ fontFamily: "Vazirmatn, sans-serif" }}
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
            className={inputClass}
            style={{
              resize:    "vertical",
              minHeight: 80,
              ...(readOnly ? { opacity: 0.55, cursor: "not-allowed" } : {}),
            }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            className={inputClass}
            style={{
              ...(readOnly   ? { opacity: 0.55, cursor: "not-allowed" } : {}),
              ...(suffix     ? { paddingInlineEnd: 44 } : {}),
            }}
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
          style={{ color: "var(--shell-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
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
function SaveButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
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
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{loadingLabel}</>
        : label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   SECTION HEADING  (module-level)
───────────────────────────────────────────────────────────────────── */
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pb-4 mb-2 linqi-page-divider border-b">
      <h2 className="text-[15px] font-black linqi-page-heading" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{title}</h2>
      {sub && <p className="text-[12px] mt-0.5 linqi-page-muted" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROFILE TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

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
    if (!form.name.trim())     e.name     = t("settings.profile.nameRequired");
    if (!form.username.trim()) e.username = t("settings.profile.usernameRequired");
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
      toast({ title: "✅ " + t("settings.profile.savedToast") });
    } catch (err: unknown) {
      toast({
        title:   "❌ " + (err instanceof Error ? err.message : t("common.error")),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title={t("settings.profile.title")} sub={t("settings.profile.subtitle")} />

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
          <p className="text-[13px] font-bold linqi-page-heading" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            {form.name || "—"}
          </p>
          <p className="text-[11px] mt-0.5 linqi-page-muted" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            @{form.username || "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label={t("settings.profile.name")}
          value={form.name}
          onChange={setField("name")}
          placeholder={t("settings.profile.namePlaceholder")}
          error={errors.name}
        />
        <Field
          label={t("settings.profile.username")}
          value={form.username}
          onChange={setField("username")}
          placeholder={t("settings.profile.usernamePlaceholder")}
          error={errors.username}
        />
        <Field
          label={t("settings.profile.email")}
          value={form.email}
          onChange={setField("email")}
          type="email"
          placeholder="you@example.com"
        />
        <Field
          label={t("settings.profile.phone")}
          value={form.phone}
          onChange={setField("phone")}
          type="tel"
          placeholder="+964 7XX XXX XXXX"
        />
      </div>
      <Field
        label={t("settings.profile.avatarUrl")}
        value={form.avatarUrl}
        onChange={setField("avatarUrl")}
        placeholder="https://example.com/avatar.jpg"
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label={t("settings.profile.save")} loadingLabel={t("settings.saveLoading")} />
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
  const { t } = useTranslation();

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
      toast({ title: "✅ " + t("settings.company.savedToast") });
    } catch (err: unknown) {
      if (user?.id) {
        saveStoreLocationLocal(user.id, storeLat, storeLng, storeAddress);
      }
      if (token && user) {
        const merged = mergeCachedUser({ ...user, ...payload, storeAddress });
        loginWithToken(token, merged);
      }
      toast({
        title: "✅ " + t("settings.company.savedLocal"),
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title={t("settings.company.title")} sub={t("settings.company.subtitle")} />

      <Field
        label={t("settings.company.storeName")}
        value={form.storeName}
        onChange={setField("storeName")}
        placeholder={t("settings.company.storeNamePlaceholder")}
      />
      {user?.sectorKey && (
        <Field
          label={t("settings.company.sector")}
          value={user.sectorKey}
          readOnly
        />
      )}

      <div className="flex flex-col gap-2">
        <label
          className="text-[11px] font-bold uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Vazirmatn, sans-serif" }}
        >
          {t("settings.company.mapLabel")}
        </label>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {t("settings.company.mapHint")}
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
        label={t("settings.company.storeAddress")}
        value={form.storeAddress}
        onChange={setField("storeAddress")}
        placeholder={t("settings.company.addressPlaceholder")}
        rows={3}
      />
      <Field
        label={t("settings.company.taxNumber")}
        value={form.taxNumber}
        onChange={setField("taxNumber")}
        placeholder="TRN-XXXXXXXX"
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label={t("settings.company.save")} loadingLabel={t("settings.saveLoading")} />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PREFERENCES TAB  (module-level)
═══════════════════════════════════════════════════════════════════ */
function PreferencesTab() {
  const { colors, applyPreset, presets } = useTheme();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8">
      <SectionHead title={t("settings.preferences.title")} sub={t("settings.preferences.subtitle")} />

      {/* Light / Dark mode */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-bold linqi-page-heading" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{t("settings.preferences.themeMode")}</p>
          <p className="text-[11px] mt-0.5 linqi-page-muted" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            {t("settings.preferences.themeModeDesc")}
          </p>
        </div>
        <ThemeModeToggle variant="sidebar" className="max-w-xs" />
      </section>

      {/* Language */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-bold linqi-page-heading" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{t("settings.preferences.language")}</p>
          <p className="text-[11px] mt-0.5 linqi-page-muted" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            {t("settings.preferences.languageDesc")}
          </p>
        </div>
        <div className="flex">
          <LanguageSwitcher variant="header" align="start" />
        </div>
      </section>

      {/* Theme */}
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-bold linqi-page-heading" style={{ fontFamily: "Vazirmatn, sans-serif" }}>{t("settings.preferences.theme")}</p>
          <p className="text-[11px] mt-0.5 linqi-page-muted" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
            {t("settings.preferences.themeDesc")}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {presets.map(preset => {
            const active = colors.accent === preset.colors.accent && colors.bg === preset.colors.bg;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.name)}
                className="flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all duration-150"
                style={{
                  background: active ? C.glassHover : C.glass,
                  border:     active ? `1.5px solid ${preset.colors.accent}` : `1.5px solid ${C.border}`,
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
                    color:      active ? preset.colors.accent : C.muted,
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
  const { t } = useTranslation();

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
    if (!form.current)            e.current = t("settings.security.currentRequired");
    if (form.next.length < 6)     e.next    = t("settings.security.minLength");
    if (form.next !== form.confirm) e.confirm = t("settings.security.mismatch");
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
      toast({ title: "✅ " + t("settings.security.changed") });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err: unknown) {
      toast({
        title:   "❌ " + (err instanceof Error ? err.message : t("common.error")),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <SectionHead title={t("settings.security.title")} sub={t("settings.security.subtitle")} />

      {/* Info banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)" }}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#60a5fa" }} />
        <p className="text-[12px] leading-relaxed linqi-page-subtitle" style={{ fontFamily: "Vazirmatn, sans-serif" }}>
          {t("settings.security.infoBanner")}
        </p>
      </div>

      {/*
        PwdField is a MODULE-LEVEL component — NOT defined here.
        Passing show/toggle as props keeps it stable across re-renders.
      */}
      <PwdField
        label={t("settings.security.currentPassword")}
        value={form.current}
        onChange={setField("current")}
        show={show.current}
        onToggle={() => toggleShow("current")}
        error={errors.current}
      />
      <PwdField
        label={t("settings.security.newPassword")}
        value={form.next}
        onChange={setField("next")}
        show={show.next}
        onToggle={() => toggleShow("next")}
        error={errors.next}
      />
      <PwdField
        label={t("settings.security.confirmPassword")}
        value={form.confirm}
        onChange={setField("confirm")}
        show={show.confirm}
        onToggle={() => toggleShow("confirm")}
        error={errors.confirm}
      />

      <div className="flex justify-end pt-2">
        <SaveButton loading={saving} label={t("settings.security.change")} loadingLabel={t("settings.saveLoading")} />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TABS CONFIG
═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "profile",     Icon: User,        labelKey: "settings.tabs.profile" },
  { id: "company",     Icon: Building2,   labelKey: "settings.tabs.company" },
  { id: "preferences", Icon: Globe,       labelKey: "settings.tabs.preferences" },
  { id: "security",    Icon: ShieldCheck, labelKey: "settings.tabs.security" },
] as const;

type TabId = typeof TABS[number]["id"];

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS PAGE  (main export — module-level)
═══════════════════════════════════════════════════════════════════ */
export default function Settings() {
  const [active, setActive] = useState<TabId>("profile");
  const { t } = useTranslation();
  const { dir } = useLocaleDir();

  return (
    <div
      dir={dir}
      className="min-h-full w-full"
      style={{
        background: "linear-gradient(135deg, var(--terminal-bg,#0b0f17) 0%, color-mix(in srgb, var(--terminal-bg,#0b0f17) 85%, var(--terminal-accent,#1A6AFF)) 100%)",
        fontFamily: "Vazirmatn, sans-serif",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">

        {/* Page header */}
        <div className="mb-8">
          <PageHeader
            id="settings"
            titleClassName="text-2xl font-black text-slate-900 dark:text-slate-100 linqi-page-title"
            subtitleClassName="text-[13px] mt-1 linqi-page-muted"
          />
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 mb-6 rounded-2xl linqi-page-card"
        >
          {TABS.map(({ id, Icon, labelKey }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl transition-all duration-150 text-[11.5px] font-bold"
                style={{
                  background: isActive ? C.glassHover : "transparent",
                  color:      isActive ? "var(--shell-text-primary)" : C.muted,
                  border:     isActive ? `1px solid ${C.border}` : "1px solid transparent",
                  boxShadow:  isActive ? "var(--shell-shadow)" : "none",
                  fontFamily: "Vazirmatn, sans-serif",
                  cursor:     "pointer",
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t(labelKey)}</span>
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
            <div className="linqi-settings-card p-6 sm:p-8">
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
