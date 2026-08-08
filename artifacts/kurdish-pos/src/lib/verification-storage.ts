/**
 * Shared verification queue — localStorage (`pending_verifications`) + `/api/verifications`.
 */

import type { VerificationRecord } from "@/lib/admin-types";

export const PENDING_VERIFICATIONS_KEY = "pending_verifications";
export const PENDING_REVIEW_KEY = "pos_pending_review";

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "more_docs_needed";

export interface StoredVerification {
  id: number;
  sectorKey: string;
  sectorGroup: string;
  businessName: string;
  email?: string;
  mobile: string;
  governorate?: string;
  city?: string;
  address?: string;
  extraData?: Record<string, unknown>;
  status: VerificationStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Marks rows created offline before API id assignment */
  localOnly?: boolean;
}

export interface VerificationSubmitPayload {
  sectorKey: string;
  sectorGroup: string;
  businessName: string;
  email?: string;
  mobile?: string;
  governorate?: string;
  city?: string;
  address?: string;
  extraData?: Record<string, unknown>;
  username?: string;
  password?: string;
  name?: string;
}

export interface PendingReviewSession {
  sectorKey: string;
  businessName: string;
  verificationId?: number;
  storeLat?: number;
  storeLng?: number;
  address?: string;
}

export const VERIFICATIONS_UPDATED_EVENT = "linqi-verifications-updated";

function notifyVerificationsUpdated() {
  window.dispatchEvent(new Event(VERIFICATIONS_UPDATED_EVENT));
}

function parseJsonArray(raw: string | null): StoredVerification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredVerification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLocalVerifications(): StoredVerification[] {
  return parseJsonArray(localStorage.getItem(PENDING_VERIFICATIONS_KEY));
}

export function setLocalVerifications(list: StoredVerification[]) {
  localStorage.setItem(PENDING_VERIFICATIONS_KEY, JSON.stringify(list));
  notifyVerificationsUpdated();
}

export function findLocalVerification(id: number): StoredVerification | undefined {
  return getLocalVerifications().find(v => v.id === id);
}

export function addLocalVerification(entry: StoredVerification) {
  const list = getLocalVerifications();
  if (list.some(v => v.id === entry.id)) {
    setLocalVerifications(list.map(v => (v.id === entry.id ? entry : v)));
    return;
  }
  setLocalVerifications([entry, ...list]);
}

export function replaceLocalVerificationId(oldId: number, newId: number, patch: Partial<StoredVerification> = {}) {
  const list = getLocalVerifications();
  setLocalVerifications(
    list.map(v =>
      v.id === oldId
        ? { ...v, ...patch, id: newId, localOnly: false }
        : v,
    ),
  );
}

export function updateLocalVerificationStatus(
  id: number,
  status: VerificationStatus,
  rejectionReason?: string,
  trustBadge?: string,
) {
  const list = getLocalVerifications();
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) return undefined;

  const existing = list[idx];
  const extra = { ...(existing.extraData ?? {}) };
  if (trustBadge) extra.trustBadge = trustBadge;

  const updated: StoredVerification = {
    ...existing,
    status,
    rejectionReason: rejectionReason ?? existing.rejectionReason,
    extraData: extra,
    reviewedAt: new Date().toISOString(),
    reviewedBy: "admin",
  };

  const next = [...list];
  next[idx] = updated;
  setLocalVerifications(next);
  return updated;
}

/** Migrate legacy single-object `pos_pending_review` into the shared queue */
export function migrateLegacyPendingReview() {
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY);
    if (!raw) return;
    const session = JSON.parse(raw) as PendingReviewSession;
    if (!session?.businessName) return;

    const list = getLocalVerifications();
    const exists = session.verificationId
      ? list.some(v => v.id === session.verificationId)
      : list.some(v => v.businessName === session.businessName && v.status === "pending");

    if (!exists) {
      const id = session.verificationId ?? Date.now();
      addLocalVerification({
        id,
        sectorKey: session.sectorKey,
        sectorGroup: "standard",
        businessName: session.businessName,
        mobile: "",
        address: session.address,
        status: "pending",
        submittedAt: new Date().toISOString(),
        extraData: {
          storeLat: session.storeLat,
          storeLng: session.storeLng,
        },
        localOnly: true,
      });
    }
  } catch {
    /* ignore */
  }
}

/** Merge local storage and API rows — API wins on id conflicts */
export function mergeVerificationLists(
  mocks: StoredVerification[],
  local: StoredVerification[],
  api: StoredVerification[],
): StoredVerification[] {
  const byId = new Map<number, StoredVerification>();

  for (const m of mocks) byId.set(m.id, m);
  for (const l of local) byId.set(l.id, l);
  for (const a of api) byId.set(a.id, a);

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export function getMergedVerifications(apiRows: StoredVerification[] = []): StoredVerification[] {
  migrateLegacyPendingReview();
  const local = getLocalVerifications();
  return mergeVerificationLists([], local, apiRows);
}

export async function fetchVerificationsFromApi(token?: string): Promise<StoredVerification[]> {
  const auth = token ?? localStorage.getItem("pos_auth_token") ?? "";
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;

  try {
    const res = await fetch("/api/verifications", { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as StoredVerification[];
    }
  } catch {
    /* offline */
  }

  try {
    const res = await fetch("/api/admin/registrations", { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data as StoredVerification[];
    }
  } catch {
    /* offline */
  }

  return [];
}

export async function submitVerificationApplication(
  payload: VerificationSubmitPayload,
): Promise<StoredVerification> {
  const localId = Date.now();
  const entry: StoredVerification = {
    id: localId,
    sectorKey: payload.sectorKey,
    sectorGroup: payload.sectorGroup,
    businessName: payload.businessName,
    email: payload.email,
    mobile: payload.mobile ?? "",
    governorate: payload.governorate,
    city: payload.city,
    address: payload.address,
    extraData: {
      ...payload.extraData,
      username: payload.username,
      name: payload.name,
      /** Never persist password in localStorage — API only */
    },
    status: "approved",
    submittedAt: new Date().toISOString(),
    localOnly: true,
  };

  addLocalVerification(entry);

  const body = {
    sectorKey: payload.sectorKey,
    sectorGroup: payload.sectorGroup,
    businessName: payload.businessName,
    email: payload.email,
    mobile: payload.mobile,
    governorate: payload.governorate,
    city: payload.city,
    address: payload.address,
    extraData: payload.extraData,
    username: payload.username,
    password: payload.password,
    name: payload.name,
  };

  try {
    const res = await fetch("/api/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = (await res.json()) as StoredVerification;
      replaceLocalVerificationId(localId, saved.id, saved);
      return saved;
    }
  } catch {
    /* keep local */
  }

  try {
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectorKey: payload.sectorKey,
        sectorGroup: payload.sectorGroup,
        businessName: payload.businessName,
        email: payload.email,
        mobile: payload.mobile,
        governorate: payload.governorate,
        city: payload.city,
        address: payload.address,
        extraData: payload.extraData,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as StoredVerification;
      replaceLocalVerificationId(localId, saved.id, saved);
      return saved;
    }
  } catch {
    /* keep local */
  }

  return findLocalVerification(localId) ?? entry;
}

export async function patchVerificationStatus(
  id: number,
  status: VerificationStatus,
  rejectionReason?: string,
  trustBadge?: string,
  token?: string,
): Promise<StoredVerification | undefined> {
  const auth = token ?? localStorage.getItem("pos_auth_token") ?? "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const body = JSON.stringify({
    status,
    rejectionReason,
    trustBadge,
  });

  try {
    const res = await fetch(`/api/verifications/${id}/status`, {
      method: "PATCH",
      headers,
      body,
    });
    if (res.ok) {
      const saved = (await res.json()) as StoredVerification;
      const list = getLocalVerifications();
      if (list.some(v => v.id === saved.id)) {
        setLocalVerifications(list.map(v => (v.id === saved.id ? saved : v)));
      }
      return saved;
    }
  } catch {
    /* fallback local */
  }

  try {
    const res = await fetch(`/api/admin/registrations/${id}/status`, {
      method: "PATCH",
      headers,
      body,
    });
    if (res.ok) {
      const saved = (await res.json()) as StoredVerification;
      const list = getLocalVerifications();
      if (list.some(v => v.id === saved.id)) {
        setLocalVerifications(list.map(v => (v.id === saved.id ? saved : v)));
      }
      return saved;
    }
  } catch {
    /* fallback local */
  }

  return updateLocalVerificationStatus(id, status, rejectionReason, trustBadge);
}

export function savePendingReviewSession(session: PendingReviewSession) {
  localStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(session));
}

export function getPendingReviewSession(): PendingReviewSession | null {
  try {
    const raw = localStorage.getItem(PENDING_REVIEW_KEY);
    return raw ? (JSON.parse(raw) as PendingReviewSession) : null;
  } catch {
    return null;
  }
}

export function clearPendingReviewSession() {
  localStorage.removeItem(PENDING_REVIEW_KEY);
}
