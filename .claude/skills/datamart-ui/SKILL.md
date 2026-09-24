---
name: datamart-ui
description: >
  Creates high-fidelity UI prototypes with Datamart's look & feel: shadcn/ui (Luma style)
  + Datamart brand colors + Geist font. Use this skill whenever the user asks to: prototype
  a new screen, design a new feature, mock up a UI for Datamart, build a backoffice view,
  create a demo or wireframe for any Datamart product (Connect, Getdata, KeyShield, Accord,
  Ethical Hacking, UserManager, NEX), or reproduce any pattern from the Central Hub portal.
  Also triggers on: "hazlo con el estilo del portal", "que se vea como Datamart",
  "prototipo Datamart", "mock del backoffice", "cómo se vería en el portal", or any
  UI request in a Datamart product context.
---

# Datamart UI Skill

Produces high-fidelity prototypes of Datamart's Central Hub portal.
Visual specs derived from Figma file `KfCBTxMrniPXKJXsMVlHGJ` + QA-validated Luma component patterns.

---

## Output Tracks

Two tracks, same visual result — shadcn/Luma geometry with Datamart color palette:

### Track A — HTML Artifact (default)
Use when: prototyping in chat, quick iteration, no React project context.
- Single self-contained HTML file
- Tailwind CDN v3 + CSS custom properties in `:root` (HSL format)
- shadcn Luma component patterns simulated with Tailwind classes + custom CSS
- Geist font via Google Fonts CDN
- Light + dark mode via `.dark` class toggle on `<html>`

### Track B — React/JSX (VSCode / NEX project)
Use when: user mentions Next.js, `.tsx`, VSCode, component files, or NEX Backoffice.
- Real `shadcn/ui` imports from `@/components/ui/*`
- Tailwind utility classes only — no inline styles
- Assumes Luma preset + Datamart `globals.css` already configured
- Semantic tokens only: `bg-primary`, `text-muted-foreground` — never hex in JSX
- Geist configured in layout via `next/font/google`

**Default: Track A** unless React/project context is evident.

---

## Design Principles

- **Enterprise SaaS** — clean, white-dominant, purple (`#703EFF`) as primary accent
- **Gradient CTA sparingly** — gradient only for the single main action per screen
- **Left-aligned content** — no centered full-page text blocks
- **Semantic tokens only** (Track B) — `bg-primary`, never hardcoded hex in JSX
- **Heroicons outline** for all iconography — filled only for status dot indicators
- **One primary CTA per screen** — the rest use outline, ghost, or secondary variants
- **Progressive disclosure** — show only what's needed; details behind click/expand
- **4 data states always** — Empty, Loading, Error, Populated (see `ux-principles.md`)
- **Don't invent a primitive** — if the pattern is a menu, overlay, table, calendar or sidebar,
  it's already specced in `components-extended.md` (§34–§49). Check there before writing raw HTML.

---

## Font

**Geist Sans** — shadcn/Luma default. Open source by Vercel.

### Track A
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Track B
Configured automatically by `npx shadcn@latest init --preset luma`. No action needed.

> Note: Mona Sans is Datamart's brand font for print/marketing. For interactive UI prototypes use Geist — better screen rendering, natural fit with Luma geometry.

---

## Reference Files

| File | When to load |
|------|-------------|
| `references/shadcn-theme.md` | **Always** — full CSS (light+dark), Tailwind boilerplate, Luma patterns |
| `references/ux-principles.md` | Planning layout, navigation, data states, information density |
| `references/design-tokens.md` | Verifying exact Datamart color/spacing values |
| `references/components.md` | Building Datamart-specific patterns (badges, detail cards, timeline) — §1–§33 |
| `references/screen-patterns.md` | Building a full page layout |
| `references/components-extended.md` | Menus, overlays, tables, sidebar — shadcn primitives with no base pattern (§34–§49) |

---

## Screen Types

| Screen | Layout | Key reference |
|--------|--------|---------------|
| Login / Auth | Split (form left + gradient panel right) | `screen-patterns.md` §Auth |
| Product Selection | Full white + centered card grid | `screen-patterns.md` §Dashboard |
| Table List | Navbar + tabs + search + row cards | `screen-patterns.md` §TableList |
| Card List | Navbar + breadcrumb + search + detail cards | `screen-patterns.md` §CardList |
| Form / Detail | Navbar + breadcrumb + multi-section form | `screen-patterns.md` §FormDetail |
| Detail + Sidebar | Two-column: main content + sticky timeline | `screen-patterns.md` §DetailSidebar |
| Modal | Overlay + centered white panel | `screen-patterns.md` §Modal |
| Settings | Sidebar nav + content area | `screen-patterns.md` §Settings |

---

## Output Checklist

**Track A (HTML Artifact):**
- [ ] Geist font loaded via Google Fonts CDN
- [ ] Tailwind CDN + config extension included
- [ ] Full CSS vars in `:root` (HSL) — light + dark mode vars
- [ ] `bg-gradient-cta` / `bg-gradient-panel` utilities defined
- [ ] Navbar: 64-80px, left separator (`#ADA8BD`), gear icon, avatar pill
- [ ] Primary CTA: gradient pill (pink→orange), one per page max
- [ ] Status badges: correct semantic color per status
- [ ] Cards: `border-radius: var(--radius)`, subtle border + shadow-sm
- [ ] Content: left-aligned, max-width container, scrollable
- [ ] All 4 data states handled (Empty, Skeleton, Error, Populated)
- [ ] Destructive actions: confirmation dialog — never single-click delete
- [ ] Breadcrumb on level 3+ screens
- [ ] Kebab button (§6) always paired with its menu panel (§34) — never a dead trigger
- [ ] Lists past ~9 rows: pagination (§47) or command search (§38) — never an endless scroll
- [ ] Spinner (§43) inline or in-button only; page-level loading uses Skeleton
- [ ] Bulk-action bar (§48) appears only when rows are selected

**Track B (React):**
- [ ] Only `@/components/ui/*` imports — no raw HTML where shadcn components exist
- [ ] No inline styles — Tailwind classes only
- [ ] No hex colors in JSX — semantic tokens only (`bg-primary`, not `#703EFF`)
- [ ] `cn()` for conditional classes
- [ ] `<TooltipProvider>` wrapping when using Tooltip, Kbd, or Sidebar `collapsible="icon"`
- [ ] `<Field>` + `<FieldLabel>` for Checkbox/Radio/Switch (not plain `<Label>`)
- [ ] All 4 data states: `<Empty>`, `<Skeleton>`, `<Alert variant="destructive">`, populated
- [ ] `<AlertDialog>` for any destructive confirmation
- [ ] `toast` (Sonner) for success — not `<Alert>`
- [ ] `<FieldError>` for form validation — not toast
- [ ] `<Sheet>` for contextual detail; a new route + `<Breadcrumb>` when the detail deserves a URL
- [ ] `<Switch>` for instant-apply settings; `<Checkbox>` when a Save button commits the change
- [ ] `<Progress>` thresholds: primary → warning over 80% → destructive over 95%
