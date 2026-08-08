import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus, Edit2, Trash2, Shield, User, X, Loader2, KeyRound,
  Eye, Trash, PackageOpen, BarChart3, Settings2, CheckCircle2, Search, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useLocaleDir } from "@/lib/use-locale-dir";
import { adminSectionTitle, adminSubheader } from "@/lib/admin-nav-styles";
import { PAGE_BADGE_SUCCESS, PAGE_MODAL, PAGE_MODAL_FOOTER, PAGE_BTN_GHOST, PAGE_BTN_SUCCESS } from "@/lib/page-theme";
import {
  fetchWithSafeJson,
  getCachedUsers,
  setCachedUsers,
  addCachedUser,
  updateCachedUser,
  removeCachedUser,
  shouldUseUsersFallback,
  type CachedAppUser,
} from "@/lib/api-fallback";

interface AppUser extends CachedAppUser {}

interface UserFormState {
  name: string;
  username: string;
  password: string;
  role: "admin" | "staff";
}

const emptyForm: UserFormState = { name: "", username: "", password: "", role: "staff" };

type DisplayRole = "admin" | "staff" | "supplier" | "buyer" | "driver" | "merchant";

const ROLE_BADGE: Record<
  DisplayRole,
  { badge: string; avatar: string; icon: React.ElementType }
> = {
  admin: {
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    avatar: "bg-gradient-to-br from-cyan-500 to-blue-600",
    icon: Shield,
  },
  staff: {
    badge: "bg-slate-500/20 text-slate-200 border-slate-500/40",
    avatar: "bg-gradient-to-br from-slate-500 to-slate-700",
    icon: User,
  },
  supplier: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
    avatar: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    icon: User,
  },
  merchant: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
    avatar: "bg-gradient-to-br from-emerald-500 to-emerald-700",
    icon: User,
  },
  buyer: {
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/40",
    avatar: "bg-gradient-to-br from-violet-500 to-violet-700",
    icon: User,
  },
  driver: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    avatar: "bg-gradient-to-br from-amber-500 to-orange-600",
    icon: User,
  },
};

function normalizeRole(role: string): DisplayRole {
  if (role === "merchant") return "merchant";
  if (role in ROLE_BADGE) return role as DisplayRole;
  return "staff";
}

function RoleBadge({ role, t }: { role: string; t: (key: string) => string }) {
  const key = normalizeRole(role);
  const cfg = ROLE_BADGE[key];
  const Icon = cfg.icon;
  const labelKey =
    key === "merchant" || key === "supplier"
      ? "users.merchant"
      : `role.${key}`;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", cfg.badge)}>
      <Icon className="w-3 h-3 shrink-0" />
      {t(labelKey)}
    </span>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80",
        "text-slate-300 bg-slate-800/40 transition-all duration-200",
        "hover:bg-slate-800 hover:text-cyan-400 hover:border-slate-600",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-300",
      )}
    >
      {children}
    </button>
  );
}

interface PermissionConfig {
  key: keyof Pick<AppUser, "canViewProfit" | "canDeleteData" | "canEditStock" | "canAccessReports">;
  labelKey: string;
  sublabel: string;
  descKey: string;
  icon: React.ElementType;
  onColor: string;
  ringColor: string;
  iconOn: string;
  iconOff: string;
  bgOn: string;
}

const PERMISSIONS: PermissionConfig[] = [
  {
    key: "canViewProfit",
    labelKey: "users.permViewProfit",
    sublabel: "View Profit",
    descKey: "users.permViewProfitDesc",
    icon: Eye,
    onColor: "bg-emerald-500",
    ringColor: "ring-emerald-200",
    iconOn: "text-emerald-600",
    iconOff: "text-slate-400",
    bgOn: "bg-emerald-50 border-emerald-200",
  },
  {
    key: "canDeleteData",
    labelKey: "users.permDeleteData",
    sublabel: "Delete Data",
    descKey: "users.permDeleteDataDesc",
    icon: Trash,
    onColor: "bg-rose-500",
    ringColor: "ring-rose-200",
    iconOn: "text-rose-600",
    iconOff: "text-slate-400",
    bgOn: "bg-rose-50 border-rose-200",
  },
  {
    key: "canEditStock",
    labelKey: "users.permEditStock",
    sublabel: "Edit Prices & Stock",
    descKey: "users.permEditStockDesc",
    icon: PackageOpen,
    onColor: "bg-blue-500",
    ringColor: "ring-blue-200",
    iconOn: "text-blue-600",
    iconOff: "text-slate-400",
    bgOn: "bg-blue-50 border-blue-200",
  },
  {
    key: "canAccessReports",
    labelKey: "users.permReports",
    sublabel: "View Reports",
    descKey: "users.permReportsDesc",
    icon: BarChart3,
    onColor: "bg-violet-500",
    ringColor: "ring-violet-200",
    iconOn: "text-violet-600",
    iconOff: "text-slate-400",
    bgOn: "bg-violet-50 border-violet-200",
  },
];

function PermissionDots({ user }: { user: AppUser }) {
  if (user.role === "admin") return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      {PERMISSIONS.map(p => {
        const active = user[p.key];
        return (
          <span
            key={p.key}
            title={p.sublabel}
            className={cn("w-2 h-2 rounded-full", active ? p.onColor : "bg-slate-600")}
          />
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange, disabled, onColor }: {
  checked: boolean; onChange: (val: boolean) => void; disabled?: boolean; onColor: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2
        ${checked ? onColor : "bg-slate-200"}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}
    >
      <span className={`absolute top-0.5 start-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? "translate-x-7" : "translate-x-0"}`} />
    </button>
  );
}

function PermissionsModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshUser, user: me } = useAuth();
  const isAdminUser = user.role === "admin";

  const [perms, setPerms] = useState({
    canViewProfit: user.canViewProfit,
    canDeleteData: user.canDeleteData,
    canEditStock: user.canEditStock,
    canAccessReports: user.canAccessReports,
  });

  const permMutation = useMutation({
    mutationFn: async (data: typeof perms) => {
      const result = await fetchWithSafeJson<AppUser>(
        `/api/users/${user.id}/permissions`,
        { method: "PUT", body: JSON.stringify(data) },
      );
      if (result.ok) {
        if (result.data) updateCachedUser(user.id, result.data);
        else updateCachedUser(user.id, data);
        return result.data ?? { ...user, ...data };
      }
      if (shouldUseUsersFallback(result)) {
        return updateCachedUser(user.id, data) ?? { ...user, ...data };
      }
      throw new Error(result.message ?? "Error");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (me?.id === user.id) refreshUser();
      toast({ title: t("users.permissionsSaved") });
      onClose();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn("w-full max-w-lg overflow-hidden", PAGE_MODAL)}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow ${user.role === "admin" ? "bg-gradient-to-br from-primary to-blue-700" : "bg-gradient-to-br from-slate-400 to-slate-600"}`}>
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminUser && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
                {t("role.admin")}
              </span>
            )}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-600">
              {isAdminUser ? t("users.allPermissions") : t("users.editPermissions")}
            </p>
          </div>

          {PERMISSIONS.map((perm) => {
            const Icon = perm.icon;
            const active = isAdminUser ? true : perms[perm.key];
            return (
              <div
                key={perm.key}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${active ? perm.bgOn : "bg-white border-slate-100"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-white shadow-sm" : "bg-slate-100"}`}>
                    <Icon className={`w-5 h-5 ${active ? perm.iconOn : perm.iconOff}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">{t(perm.labelKey)}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{perm.sublabel}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{t(perm.descKey)}</p>
                  </div>
                </div>
                {isAdminUser ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Toggle checked={perms[perm.key]} onChange={(val) => setPerms((prev) => ({ ...prev, [perm.key]: val }))} disabled={permMutation.isPending} onColor={perm.onColor} />
                )}
              </div>
            );
          })}
        </div>

        {!isAdminUser && (
          <div className={cn(PAGE_MODAL_FOOTER, "justify-end")}>
            <button type="button" onClick={onClose} className={PAGE_BTN_GHOST}>
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={() => permMutation.mutate(perms)}
              disabled={permMutation.isPending}
              className={cn(PAGE_BTN_SUCCESS, "px-6 py-2.5 disabled:opacity-60")}
            >
              {permMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("users.save")}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function UserFormModal({ editingId, form, setForm, formError, isPending, onSubmit, onClose }: {
  editingId: number | null;
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  formError: string;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const labelClass = "block text-sm font-extrabold text-slate-900 mb-1.5";
  const inputClass =
    "w-full border-2 border-slate-300 rounded-xl px-4 py-2.5 outline-none " +
    "focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all text-sm " +
    "text-slate-900 placeholder:text-slate-400 bg-white";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn("w-full max-w-md overflow-hidden", PAGE_MODAL)}
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(26,106,255,0.08)" }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-blue-700">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {editingId ? t("users.editUser") : t("users.newUser")}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col max-h-[min(80vh,640px)]">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className={labelClass}>{t("users.fullName")}</label>
            <input ref={nameRef} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={inputClass} placeholder={t("users.fullNamePlaceholder")} />
          </div>
          <div>
            <label className={labelClass}>{t("users.username")}</label>
            <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required className={inputClass + " font-mono"} placeholder="username" dir="ltr" />
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-slate-600" />
                {t("users.password")}
                {editingId && <span className="text-slate-400 font-normal text-xs">({t("users.passwordHint")})</span>}
              </span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editingId}
              className={inputClass}
              placeholder={editingId ? t("users.leaveBlank") : t("users.minPassword")}
            />
          </div>
          <div>
            <label className={labelClass}>{t("users.role")}</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "admin" | "staff" }))}
              className={inputClass + " cursor-pointer"}
              style={{ appearance: "auto" }}
            >
              <option value="staff">{t("role.staff")}</option>
              <option value="admin">{t("role.admin")}</option>
            </select>
          </div>

          {formError && (
            <div className="bg-rose-50 border-2 border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl font-semibold">{formError}</div>
          )}
          </div>

          <div className={cn(PAGE_MODAL_FOOTER, "justify-end")}>
            <button type="button" onClick={onClose} className={PAGE_BTN_GHOST}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(PAGE_BTN_SUCCESS, "px-6 py-2.5 disabled:opacity-60")}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? t("users.save") : t("users.add")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const { dir } = useLocaleDir();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [permissionsUser, setPermissionsUser] = useState<AppUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff">("all");

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const result = await fetchWithSafeJson<AppUser[]>("/api/users");
      if (result.ok && Array.isArray(result.data)) {
        setCachedUsers(result.data);
        return result.data;
      }
      return getCachedUsers();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormState) => {
      const result = await fetchWithSafeJson<AppUser>("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (result.ok) {
        if (result.data) {
          const cached = getCachedUsers();
          if (!cached.some(u => u.id === result.data!.id)) {
            setCachedUsers([...cached, result.data]);
          }
          return result.data;
        }
        return addCachedUser({ name: data.name, username: data.username, role: data.role });
      }
      if (shouldUseUsersFallback(result)) {
        return addCachedUser({ name: data.name, username: data.username, role: data.role });
      }
      throw new Error(result.message ?? "Error");
    },
    onSuccess: (user) => {
      queryClient.setQueryData<AppUser[]>(["/api/users"], (old = []) =>
        old.some(u => u.id === user.id) ? old : [...old, user],
      );
      closeUserModal();
      toast({ title: t("users.added") });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormState> }) => {
      const result = await fetchWithSafeJson<AppUser>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (result.ok) {
        if (result.data) {
          updateCachedUser(id, result.data);
          return result.data;
        }
        const patch: Partial<AppUser> = {
          name: data.name,
          username: data.username,
          role: data.role,
        };
        return updateCachedUser(id, patch) ?? { ...getCachedUsers().find(u => u.id === id)!, ...patch };
      }
      if (shouldUseUsersFallback(result)) {
        const patch: Partial<AppUser> = {
          name: data.name,
          username: data.username,
          role: data.role,
        };
        return updateCachedUser(id, patch) ?? addCachedUser({
          id,
          name: data.name ?? "",
          username: data.username ?? "",
          role: data.role ?? "staff",
        });
      }
      throw new Error(result.message ?? "Error");
    },
    onSuccess: (user) => {
      queryClient.setQueryData<AppUser[]>(["/api/users"], (old = []) =>
        old.map(u => u.id === user.id ? user : u),
      );
      closeUserModal();
      toast({ title: t("users.updated") });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await fetchWithSafeJson<{ message?: string }>(`/api/users/${id}`, { method: "DELETE" });
      if (result.ok) {
        removeCachedUser(id);
        return;
      }
      if (shouldUseUsersFallback(result)) {
        removeCachedUser(id);
        return;
      }
      throw new Error(result.message ?? "Error");
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppUser[]>(["/api/users"], (old = []) => old.filter(u => u.id !== id));
      toast({ title: t("users.deleted") });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setFormError(""); setIsUserModalOpen(true); };
  const openEdit = (u: AppUser) => {
    setEditingId(u.id);
    setForm({ name: u.name, username: u.username, password: "", role: u.role });
    setFormError("");
    setIsUserModalOpen(true);
  };
  const closeUserModal = () => { setIsUserModalOpen(false); setEditingId(null); setForm(emptyForm); setFormError(""); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (editingId) {
      const data: Partial<UserFormState> = { name: form.name, username: form.username, role: form.role };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editingId, data });
    } else {
      if (!form.password) return setFormError(t("users.passwordRequired"));
      createMutation.mutate(form);
    }
  };

  const handleDelete = (u: AppUser) => {
    if (u.id === me?.id) {
      toast({ title: t("users.cannotDeleteSelf"), variant: "destructive" });
      return;
    }
    if (confirm(t("users.deleteConfirm", { name: u.name }))) deleteMutation.mutate(u.id);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredUsers = users.filter(u => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5" dir={dir}>
      <div>
        <h1 className={adminSectionTitle}>{t("users.title")}</h1>
        <p className={adminSubheader}>{t("users.subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-slate-900/60 backdrop-blur border border-slate-800 text-white placeholder:text-slate-500 text-sm outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div className="relative shrink-0">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as "all" | "admin" | "staff")}
            className="appearance-none w-full sm:w-44 ps-4 pe-9 py-2.5 rounded-xl text-sm font-semibold outline-none cursor-pointer transition-all linqi-shell-select text-slate-900 dark:text-white bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="all">{t("users.filterAllRoles")}</option>
            <option value="admin">{t("role.admin")}</option>
            <option value="staff">{t("role.staff")}</option>
          </select>
          <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shrink-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(34,211,238,0.45)]"
          style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
            boxShadow: "0 4px 20px rgba(6,182,212,0.35)",
          }}
        >
          <UserPlus className="w-4 h-4" />
          {t("users.addUser")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-start px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t("users.colUser")}
                  </th>
                  <th className="text-start px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t("users.colRole")}
                  </th>
                  <th className="text-start px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t("users.colStatus")}
                  </th>
                  <th className="text-start px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t("users.colJoined")}
                  </th>
                  <th className="text-end px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t("users.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const roleKey = normalizeRole(u.role);
                  const avatarCls = ROLE_BADGE[roleKey].avatar;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0",
                              avatarCls,
                            )}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-white truncate">{u.name}</p>
                              {u.id === me?.id && (
                                <span className="text-[10px] bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-500/30">
                                  {t("users.myAccount")}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm font-mono truncate">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} t={t} />
                        <PermissionDots user={u} />
                      </td>
                      <td className="px-5 py-4">
                        <span className={PAGE_BADGE_SUCCESS}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                          {t("users.statusActive")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-300">{formatDate(u.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionBtn onClick={() => setPermissionsUser(u)} title={t("users.permissions")}>
                            <Settings2 className="w-4 h-4" />
                          </ActionBtn>
                          <ActionBtn onClick={() => openEdit(u)} title={t("common.edit")}>
                            <Edit2 className="w-4 h-4" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => handleDelete(u)}
                            disabled={u.id === me?.id}
                            title={t("common.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionBtn>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">
              {t("users.noResults")}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {permissionsUser && (
          <PermissionsModal key={permissionsUser.id} user={permissionsUser} onClose={() => setPermissionsUser(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUserModalOpen && (
          <UserFormModal editingId={editingId} form={form} setForm={setForm} formError={formError} isPending={isPending} onSubmit={handleSubmit} onClose={closeUserModal} />
        )}
      </AnimatePresence>
    </div>
  );
}
