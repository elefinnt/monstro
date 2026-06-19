/** Client-side configuration derived from Vite env (with sensible defaults). */

const env = import.meta.env as Record<string, string | undefined>;

/** Colyseus server endpoint. Defaults to the dev server on the current host. */
export const SERVER_URL =
  env.VITE_SERVER_URL ?? `ws://${location.hostname}:2567`;

/** A casual MVP username (no real auth yet). */
export function resolveUsername(): string {
  const stored = localStorage.getItem("monstro:username");
  if (stored) return stored;
  const generated = `Trainer-${Math.floor(Math.random() * 9000 + 1000)}`;
  localStorage.setItem("monstro:username", generated);
  return generated;
}
