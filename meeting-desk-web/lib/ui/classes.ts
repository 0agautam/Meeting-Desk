/**
 * Shared Tailwind class strings — one source of truth for the look of the app
 * (same idea as Trinity's SITE_* constants, but in one shared file).
 * Colours come from the tokens in app/globals.css.
 * Use these instead of re-typing long class lists in each component.
 */

// Layout
export const PAGE_BODY = "mx-auto flex w-full max-w-[1280px] flex-1 gap-6 px-8 py-6 max-md:flex-col max-md:px-4";
export const PANEL = "min-w-0 flex-1 rounded-panel border border-line bg-card px-7 py-6 max-md:px-4";
/** Left column of the two-pane screens: its own scroll on wide screens. */
export const SIDEBAR = "flex w-[340px] shrink-0 flex-col gap-2.5 max-lg:w-full lg:min-h-0 lg:overflow-y-auto";
/**
 * The desk and the host's requests are app-style screens: on wide screens (lg and up) the page itself doesn't scroll
 * (everything below the 3.5rem header is the screen) and each column scrolls on its own; narrower screens stack and scroll normally.
 */
export const APP_SHELL = "flex flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-none lg:overflow-hidden";
export const SHELL_BODY = "flex w-full flex-1 gap-5 px-6 pb-5 max-lg:flex-col max-lg:px-4 lg:min-h-0";
export const CARD = "block rounded-card border border-line bg-card px-3.5 py-3 text-body no-underline hover:border-accent";
/** The request that is open: tinted, accent border with a matching ring, so it stands out in the list. Not combined with CARD (their border colours would clash). */
export const CARD_SELECTED = "block rounded-card border border-accent bg-accent-soft px-3.5 py-3 text-body no-underline ring-2 ring-inset ring-accent";

// Type
export const PAGE_TITLE = "m-0 font-serif text-[26px] font-semibold text-ink";
export const PAGE_LEDE = "mt-1 text-muted";
export const SECTION_TITLE = "m-0 text-base font-semibold text-ink";
export const CARD_TITLE = "font-semibold text-ink";
export const META = "text-xs text-muted";

// Forms
export const FIELD_LABEL = "mb-1.5 block text-xs font-semibold tracking-[0.02em] text-ink";
export const FIELD_INPUT =
  "box-border h-10 w-full rounded-field border border-field-line bg-field px-3 text-ink placeholder:text-muted";
export const FIELD_SELECT = FIELD_INPUT;
export const FIELD_TEXTAREA =
  "box-border w-full flex-1 min-h-[120px] resize-none rounded-field border border-field-line bg-field px-3 py-2.5 text-ink placeholder:text-muted";
// A field the host has edited since the request was last submitted (wireframe 2:
// "changes are highlighted for the coordinator").
export const FIELD_INPUT_CHANGED = `${FIELD_INPUT} border-accent bg-accent-soft`;

// Controls (min 44px touch targets for buttons — CLAUDE.md accessibility rule)
export const BTN =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-field border border-field-line bg-card px-[18px] font-semibold text-ink no-underline hover:bg-ground";
export const BTN_PRIMARY = `${BTN} border-ink bg-ink text-white hover:bg-nav-active hover:text-white`;
export const BTN_GHOST = `${BTN} border-transparent bg-transparent text-muted hover:bg-ground`;

export const CHIP =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-field-line bg-card px-3 text-[13px] font-medium text-ink";
export const CHIP_ACTIVE = `${CHIP} border-ink bg-ink text-white`;
export const CHIP_DASHED = `${CHIP} border-dashed text-muted`;
// Selected + changed from the original value (wireframe 2's edited duration chip).
export const CHIP_ACTIVE_ACCENT = `${CHIP} border-accent bg-accent text-white`;
export const CHIP_ACCENT = `${CHIP} text-accent hover:bg-accent-soft`;
export const CHIP_REMOVE = "ml-0.5 text-muted hover:text-ink";

export const BADGE = "inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-semibold";

// The dashed "not submitted yet" draft card in the requests sidebar (wireframe 1).
export const CARD_DRAFT = "block rounded-card border-2 border-dashed border-accent bg-accent-soft px-3.5 py-3";
