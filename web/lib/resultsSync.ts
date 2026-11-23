export function postGreResult(payload: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  try {
    fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // ignore when offline
  }
}
