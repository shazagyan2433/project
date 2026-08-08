export async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("pos_auth_token");
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

/** GET list endpoints: never throw — empty DB, 404, or offline → `[]`. */
export async function fetchJsonArray<T>(path: string): Promise<T[]> {
  try {
    const res = await authedFetch(path);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Supplier directory — fail loudly; never substitute demo rows. */
export async function fetchSuppliersArray<T>(): Promise<T[]> {
  const res = await authedFetch("/api/suppliers");
  if (!res.ok) {
    throw new Error(`Failed to load suppliers (${res.status})`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid suppliers response");
  }
  return data as T[];
}
