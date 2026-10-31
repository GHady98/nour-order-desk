export async function apiRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  // A successful DELETE has no JSON body.
  const payload =
    response.status === 204
      ? undefined
      : await response.json().catch(() => {
          throw new Error(
            "The server returned an unreadable response. Please try again.",
          );
        });
  if (!response.ok)
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "The request failed. Please try again.",
    );
  return payload as T;
}
export const requestError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Could not connect. Please try again.";
