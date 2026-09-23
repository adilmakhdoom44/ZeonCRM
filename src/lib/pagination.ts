export const PAGE_SIZE = 25;

/** Clamps whatever arrived in the URL to a real page number. */
export function pageFrom(value: string | undefined, total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const asked = Number(value);
  if (!Number.isFinite(asked) || asked < 1) return 1;
  return Math.min(Math.trunc(asked), pages);
}
