export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  const url = new URL(value, window.location.origin);
  if (url.pathname === "/login" || url.pathname === "/register") return "/";
  if (url.searchParams.get("mock") === "session-expired") url.searchParams.delete("mock");
  return url.pathname + url.search + url.hash;
}

export function authSearch(search: Record<string, unknown>) {
  return { returnTo: safeReturnTo(search.returnTo), expired: search.expired === true || search.expired === "true" };
}
