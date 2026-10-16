# Brand Search OS · Paper & Stickers

2026-10-16. Slush Style Reference supplied by the user, adapted for a Korean analytics workspace. Implementation: `app/globals.css`, `app/brand-orbit.tsx`, and the page shell in `app/page.tsx`.

## What changes

The former low-contrast gray/teal UI is replaced by pastel paper surfaces, black hairline outlines, pill controls, larger Korean type, and original blue ribbon artwork. The sidebar remains because the product has 19 named destinations (15 core menus plus 4 operations views). At 760px and below a native grouped menu selector provides every destination by name, including logout. Tables retain their own horizontal scroll instead of widening the entire page.

This adapts the reference's visual language, not Slush's marketing page or wordmark. The oversized marketing typography, marquee and full-screen navigation are intentionally scaled for a tool people read and operate repeatedly. The ribbon is an original flat SVG sticker, not a copied 3D asset. No licensed font or image is downloaded. UI uses local Apple SD Gothic Neo / Malgun Gothic / Arial fallbacks. Korean headings retain 1.17–1.45 line height; body text uses 1.6–1.95.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--carbon` | #000000 | Text, 1px outlines, primary action |
| `--paper` | #ffffff | Data cards, forms, sidebar |
| `--sky` | #dceeff | Canvas, explanatory panels |
| `--concrete` / `--mist` | #cccccc / #e9e9e9 | Separators, disabled and neutral surfaces |
| `--blue` | #4da2ff | Brand illustration, icons, SEO ring |
| `--lavender` | #e9ccff | AEO summary, strategy and introduction cards |
| `--mint` | #55db9c | Next-action card and decorative icon fills; not success semantics |
| `--ember` / `--sun` | #fb4903 / #ffd731 | Reserved warm accent / decorative star; no text background |
| `--violet` | #5c4ade | AEO ring, focus outline, primary hover |
| `--muted` | #525962 | Readable secondary copy on light surfaces |
| `--positive` / `--negative` / `--warning` | #226040 / #9f291b / #885012 | Semantic text with explicit labels or icons |

Spacing follows 4px increments (`--space-1` through `--space-12`). Card radii 24px, large panels 32px, inputs 12px, pills 1600px. Mobile cards use 20px, large panels 24px. UI font scale is 12/13/14/16/20px, with a limited 8–11px scale only for decorative captions, short metadata or compact navigation. No UI gradients or shadows. Meter rings use SVG strokes with actual bounded values and keep missing values as a dash.

## Component rules

| Component | Default / selected | Interaction and accessibility |
|---|---|---|
| Primary button | Black / white text | Violet hover; disabled gray; 42px minimum, 44px mobile |
| Secondary button | White / black outline | Lavender hover; visible focus ring |
| Navigation | Named icon + text | Black selected pill, `aria-current=page`; independently scrollable desktop navigation |
| Mobile menu | Native select with grouped options | All destinations, keyboard and native screen-reader support; separate logout |
| Tabs | White outlined pill | Black selected pill, existing `aria-pressed` state retained |
| Fields | White, black outline, persistent label | Violet focus; readable placeholder; native required validation retained |
| Brand dialog | White outlined native `<dialog>` | `showModal()` traps focus, Escape cancels, close returns focus to the trigger; accessible title |
| Table | White body, gray header | Readable numbers, row hover, contained horizontal scrolling |
| Status / priority | Semantic text + label | Distinct warning/error colors; pastel brand colors never encode success |
| Metrics | Bold tabular numbers | Real data only; missing remains `—`; meter has an accessible value label |
| Empty/loading | Text and icon | No synthetic metrics; reduced-motion honors system preference |

`본문으로 바로가기` skips navigation. Decorative artwork is `aria-hidden`. The reference's conflicting primary-CTA examples are resolved to black primary / white secondary, following its component and do/don't rules.

## Scope and validation

Authentication, measurement definitions, provider limitations, Supabase queries, cron schedules and collected records are unchanged. First-audit copy now says comparison history is accumulating when an actual result already exists.

Production build and all 19 existing tests passed after styling. Native dialog and mobile controls are included in browser QA. Screenshot and deployment verification is recorded in `docs/VALIDATION.md`.
