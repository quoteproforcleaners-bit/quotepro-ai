const getBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return "";
  }
  return "";
};

export async function apiRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Response> {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${getBaseUrl()}${url}`, opts);

  if (!res.ok) {
    const text = await res.text();
    let message: string;
    let data: Record<string, unknown> | null = null;
    try {
      const json = JSON.parse(text);
      data = json;
      message = json.message || json.error || `Request failed (${res.status})`;
    } catch {
      message = text || `Request failed (${res.status})`;
    }
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return res;
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await apiRequest("POST", url, body);
  return res.json();
}

export async function apiPut<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await apiRequest("PUT", url, body);
  return res.json();
}

export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await apiRequest("PATCH", url, body);
  return res.json();
}

export async function apiDelete(url: string): Promise<void> {
  await apiRequest("DELETE", url);
}
