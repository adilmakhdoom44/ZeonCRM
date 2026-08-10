/**
 * Tag colours are derived from the name rather than chosen. Nobody wants a
 * colour picker for a label, but every tag looking identical makes a row of
 * them unreadable — so the same name always lands on the same colour.
 */
const PALETTE = ["slate", "brand", "emerald", "amber", "violet", "sky", "red"] as const;

export type TagColor = (typeof PALETTE)[number];

const CHIP_CLASSES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  red: "bg-red-50 text-red-600 ring-red-200",
};

export function colorForTag(name: string): TagColor {
  let hash = 0;
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100_000;
  }
  return PALETTE[hash % PALETTE.length];
}

export function tagChipClass(color: string) {
  return CHIP_CLASSES[color] ?? CHIP_CLASSES.slate;
}
