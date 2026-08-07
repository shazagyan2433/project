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
