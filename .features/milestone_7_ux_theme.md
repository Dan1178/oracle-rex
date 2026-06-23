# Milestone 7 — UX & Visual Theme: "Imperial Command Console"

## Status

Complete (2026-06-22). Build steps 1-10 implemented and green (73/73 frontend
tests, clean build + lint). A live visual check of the running app is the only
remaining manual step.

Step 9 notes: feature-specific loading copy already existed (each panel defines
its own `LOADING_MESSAGE`). Added: a landing CTA band in `App.tsx` (Try Demo
Scenario / Open Rules Advisor / Open Battle Calculator / Use Live AI Mode, each
switching tabs); idle empty-state placeholders for Strategy and Move (Rules and
Battle already had them); and next-step hints on `ErrorState` (`CREDENTIAL_HINT`
/ `RETRY_HINT`) wired into every panel's credential/job/sim error.

Step 10 notes:
- Reduced motion: only two CSS files animate (`LoadingState`, `AdvisorCard`);
  both carry `prefers-reduced-motion: reduce` guards, and `Starfield` guards drift
  / twinkle / shooting stars in JS. Coverage is complete.
- Contrast: phosphor `#cfe9fb` and primary text on the near-black screens are
  high-contrast; muted `#7d93a6` on the console surface is ~5.9:1, above AA.
- Copy: removed em-dashes from all user-facing strings (per the user's
  preference that they read as AI-written). Remaining em-dashes are in code
  comments and test fixtures only; a comment sweep is optional and not yet done.

Disposable design preview: [`.features/mockups/m7_command_console.html`](mockups/m7_command_console.html)
— a standalone, browser-openable mockup of the full theme using the real project
fonts. Not part of the build; kept as the reference artifact.

## Objective

Make Oracle Rex feel like a coherent sci-fi **command dashboard** rather than a
collection of forms (Milestone 7 in `oracle_rex_upgrade_plan.md`). The AI output
boxes become glowing **screens**; the app sits in a dark console shell over an
animated starfield.

Constraint from the plan: *avoid excessive visual noise, prioritize readability*;
non-goal: *overly complex visual redesign*. The theme is turned up, but every
animation degrades under `prefers-reduced-motion` and text contrast holds at AA.

## Locked design decisions (2026-06-22)

- **Primary accent:** cyan / ice-blue HUD. **Secondary:** amber — reserved for
  meaning (Live-AI / cost warnings, demo chips, error states), never decorative.
- **Chrome level:** full command-console — corner brackets, scanline overlays,
  blinking cursor, pulsing status LEDs, animated status readouts.
- **Starfield:** ambient slow-drift + twinkle, with a shooting star every few
  seconds.

## Design tokens (CSS custom properties, defined in `:root` in `index.css`)

| Token | Value | Role |
|---|---|---|
| `--void` | `#05070d` | page background (`<body>`), behind the starfield |
| `--console-surface` | `rgba(10,14,20,0.82)` | shell panel — translucent so stars bleed at edges |
| `--console-border` | `rgba(95,208,255,0.28)` | shell border + corner brackets |
| `--screen-bg` | `#02060c` | AI output **screens** (AdvisorCard, chat, results) |
| `--phosphor` | `#cfe9fb` | light body text on screens (AA on `--screen-bg`) |
| `--accent-cyan` | `#5fd0ff` | primary HUD glow, active tab, focus rings, status strips |
| `--accent-cyan-dim` | `#2a8fc0` | dim/idle accent, inactive borders, section labels |
| `--accent-amber` | `#ffb347` | secondary — alerts, Live-AI/cost, demo chips, errors |
| `--text-primary` | `#d7e6f2` | general UI text on the console shell |
| `--text-muted` | `#7d93a6` | taglines, labels, hints |
| `--scanline` | `rgba(95,208,255,0.05)` | scanline overlay on screens |

## Typography roles (fonts already shipped under `/static/fonts/`)

- **Azonix** → app title + screen status labels (with cyan text-shadow glow)
- **Orbitron-ExtraBold** → tab labels, section headers
- **Orbitron** → buttons, h3/h4, uppercase field labels
- **OCR-A** → body + all on-screen text + inputs (terminal feel on dark surface)

## Component treatments → files

| File | Treatment |
|---|---|
| `frontend/src/index.css` | `:root` token block; `<body>` → `--void` + light default text |
| `frontend/src/components/Starfield/` (new) | canvas starfield, mounted once behind the shell |
| `frontend/src/App.tsx` / `App.module.css` | console shell (translucent, glow border, HUD corner brackets); Azonix-cyan title; muted tagline; mount Starfield |
| `frontend/src/components/TabNav/TabNav.module.css` | dark toggles; active = cyan underline + glow (drop `#007bff` fill) |
| `frontend/src/components/AdvisorCard/AdvisorCard.*` | **the hero screen**: `--screen-bg`, phosphor text, inset cyan border, inner glow, scanline overlay, `◉ ORACLE // …` status strip + pulsing LED |
| `frontend/src/components/LoadingState/*` | screen-styled, cyan; feature-specific copy |
| `frontend/src/components/ErrorState/*` | screen-styled, amber; next-step actions |
| `frontend/src/components/DemoLabel/*` | amber chip |
| Feature panel CSS (settings, battle calc, fleet, rules, strategy, move) | dark inputs, cyan focus-glow, console buttons |

A shared "screen" treatment (status strip + scanlines + glow) should be factored
so AdvisorCard, Loading, and Error reuse it rather than duplicating CSS.

## Motion & accessibility (non-negotiable)

- `prefers-reduced-motion: reduce` freezes star drift, shooting stars, cursor
  blink, scan animation, and LED pulse — everything stays, just static.
- Contrast at AA: phosphor `#cfe9fb` on `#02060c`; cyan reserved for accents/large
  text; focus rings always visible (cyan), never removed.
- Starfield is `pointer-events: none` and sits behind all interactive content.

## Beyond paint — M7 UX acceptance items

The milestone also requires (fold in after the theme lands):

- **Empty states** per tab: what it does, what input it needs, how to try the sample.
- **Feature-specific loading copy**: "Analyzing board state…", "Evaluating tactical
  options…", "Calculating combat odds…", "Consulting rules advisor…".
- **Error next-steps**: retry / switch to demo / add API key.
- **Landing/intro** with CTA buttons: Try Demo Scenario, Open Rules Advisor, Open
  Battle Calculator, Use Live AI Mode.
- Sample/demo entry point visible on every tab.

## Build order

1. Tokens + dark body (`index.css`).
2. `Starfield` component, mounted in `App`.
3. Console shell: `App.module.css` (container, title, tagline, corner brackets).
4. Shared screen treatment + `AdvisorCard` (the hero).
5. `TabNav` toggles.
6. `LoadingState` / `ErrorState` screen variants.
7. Inputs / buttons (global + per-panel CSS).
8. `DemoLabel` amber chip.
9. UX acceptance items (empty states, loading copy, landing CTAs).
10. Reduced-motion + contrast pass; run frontend tests + `npm run build`.

## Acceptance criteria (from the plan)

- App has a coherent visual identity.
- A new visitor understands the app within 30 seconds.
- All tabs have sample/demo entry points.
- AI responses are easy to scan.
