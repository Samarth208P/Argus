// ============================================================
// Design Token Constants — re-exported for use in recharts,
// inline styles, and JS-driven animations where Tailwind
// utility classes cannot reach.
// Source: DESIGN.md
// ============================================================

export const COLORS = {
  softIndigo: "#6798ff",
  pureBlack: "#000000",
  carbon: "#0a0a0a",
  graphite: "#141414",
  iron: "#1e1e1e",
  slateEdge: "#313131",
  smoke: "#454545",
  mist: "#7c7c7c",
  ash: "#a7a7a7",
  bone: "#ffffff",
} as const;

// Chart series colors — multi-color is ONLY used in data viz
export const CHART_COLORS = {
  series1: "#6798ff", // soft-indigo (accent)
  series2: "#ff6b9d", // muted rose
  series3: "#ffa64d", // muted amber
  series4: "#4dffb0", // muted emerald
} as const;

export const FONT = {
  inter: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
  jetbrainsMono:
    "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;

export const RADIUS = {
  tag: 4,
  card: 8,
  input: 8,
  button: 8,
  pill: 9999,
} as const;

export const SPACING = {
  unit: 8,
  s8: 8,
  s16: 16,
  s24: 24,
  s32: 32,
  s40: 40,
  s64: 64,
  s96: 96,
  s200: 200,
} as const;

export const PAGE_MAX_WIDTH = 1200;
export const SECTION_GAP = 80;

// Score color thresholds for badge rendering
export function scoreColor(score: number): string {
  if (score >= 80) return COLORS.softIndigo;
  if (score >= 50) return "#ffa64d";
  return "#ff6b6b";
}

// Easing curves from emil-design-eng skill
export const EASING = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;
