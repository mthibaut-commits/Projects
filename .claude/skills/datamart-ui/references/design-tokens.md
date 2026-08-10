# Design Tokens — Datamart Central Hub

Derived from Figma file `KfCBTxMrniPXKJXsMVlHGJ` (Datamart Central Hub).
Last verified: April 2026.

---

## Color Palette

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Purple | `#703EFF` | Primary accent, active states, icons, avatar backgrounds, selected borders |
| Orange | `#FF814B` | Gradient endpoint (CTA, right panel) |
| Pink | `#EE2EFF` | Gradient startpoint (CTA, right panel) |
| Navy | `#230C65` | Logo wordmark, primary headings, dark text |
| Black | `#050015` | Body text |
| White | `#FFFFFF` | Primary background, card background, modal background |
| Neutral BG | `#FAF9FB` | Page background on non-white sections, modal list areas |
| Soft Lilac | `#F1ECFF` | Chip/pill backgrounds for product labels, hover states |
| Separator | `#ADA8BD` | Navbar vertical separator (co-branding), muted dividers |

### Semantic Colors

| Status | Text | Background | Border | Icon |
|--------|------|------------|--------|------|
| Activado / Finalizada | `#16A34A` | `#F0FDF4` | `#BBF7D0` | ✓ checkmark |
| Pendiente | `#2563EB` | `#EFF6FF` | `#BFDBFE` | ● dot |
| Desactivado / Con error | `#DC2626` | `#FEF2F2` | `#FECACA` | ▲ triangle / ⬤ |
| Programada / Expirada | `#C2410C` | `#FFF7ED` | `#FED7AA` | ● dot |
| En Remediación / Creada | `#7C3AED` | `#F5F3FF` | `#DDD6FE` | — |
| Borrador / Cancelada | `#6B7280` | `#F9FAFB` | `#E5E7EB` | — |
| Con error (filled) | `#FFFFFF` | `#EF4444` | `#EF4444` | ▲ triangle |

### UI Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Border default | `#E5E7EB` | Input borders, card outlines, dividers |
| Muted text | `#6B7280` | Subtitles, placeholder text, metadata |
| Input background | `#F9FAFB` | Text input field backgrounds |
| Table header text | `#9CA3AF` | Column header labels |

---

## Gradients

```css
/* Primary CTA — buttons "Invitar usuarios", "Nueva solicitud", "Asignar" */
background: linear-gradient(to right, #EE2EFF, #FF814B);

/* Login right decorative panel */
background: linear-gradient(135deg, #EE2EFF 0%, #FF814B 55%, #C4B5FD 100%);

/* Purple CTA variant — "Asignar" button in modals */
background: #703EFF;
/* (some modal CTAs use flat purple, not gradient — use gradient for top-level page CTAs only) */
```

---

## Typography

Font: **Mona Sans** (open source, available via Google Fonts or GitHub).
Fallback stack: `'Inter', 'system-ui', -apple-system, sans-serif`

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Hero | 48px | 700 Bold | 1.1 | Login "Bienvenido" |
| H1 | 32px | 700 Bold | 1.2 | Dashboard name "Mauricio" |
| H2 | 24px | 600 SemiBold | 1.3 | Modal titles "Asignar grupo" |
| H3 | 18px | 600 SemiBold | 1.3 | Section titles, card headers |
| H4 | 16px | 600 SemiBold | 1.4 | Table row names, item titles |
| Body | 14px | 400 Regular | 1.5 | Form labels, descriptions, cell content |
| Small | 13px | 400 Regular | 1.4 | Chip text, badge labels, metadata values |
| Caption | 12px | 400 Regular | 1.4 | Timestamps, secondary metadata |
| Micro | 11px | 500 Medium | 1.3 | Tag labels, overlines |

### Color Usage

- Headings: `#230C65` (navy)
- Body text: `#050015` (near-black)
- Muted / descriptions: `#6B7280`
- Links: `#703EFF` (purple, no underline by default)
- Placeholder: `#9CA3AF`
- White text (on dark/gradient): `#FFFFFF`

---

## Spacing System

Base unit: **4px**. All spacing is multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| 2xs | 4px | Icon internal padding |
| xs | 8px | Compact chip padding, icon gaps |
| sm | 12px | Badge padding, input internal padding |
| md | 16px | Card padding default, gap between elements |
| lg | 20px | Card padding generous, section gap |
| xl | 24px | Modal padding, content padding |
| 2xl | 32px | Section vertical rhythm |
| 3xl | 48px | Page top padding |

---

## Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Small badges, tags |
| md | 10px | Inputs, small cards, avatar squares |
| lg | 14px | Standard cards (table rows) |
| xl | 20px | Modals, large cards (KeyShield detail cards) |
| pill | 9999px | All buttons, status badges with text, search inputs |
| icon-square | 8px | Avatar squares, product icon squares (48×48) |

---

## Elevation / Shadow

```css
/* Card (table rows, product cards) */
box-shadow: 0 1px 3px rgba(0,0,0,0.08);
border: 1px solid #E5E7EB;

/* Card hover */
box-shadow: 0 4px 12px rgba(0,0,0,0.10);
border-color: #D1D5DB;

/* Modal overlay */
box-shadow: 0 20px 60px rgba(0,0,0,0.18);

/* Dropdown / tooltip */
box-shadow: 0 8px 24px rgba(0,0,0,0.12);
border: 1px solid #E5E7EB;
```

---

## Iconography

The portal uses **Heroicons** exclusively:
- Default set: `heroicons-outline` (24×24 stroke icons)
- Small contexts: `heroicons-mini` (20×20) or `heroicons-micro` (16×16)
- Filled icons: only for status dot indicators (not UI icons)

CDN import for prototypes:
```html
<!-- Use inline SVG from heroicons.com, or load via npm @heroicons/react -->
```

Common icons used:
| Icon | Usage |
|------|-------|
| `magnifying-glass` | Search inputs |
| `chevron-down` | Dropdown triggers |
| `chevron-right` | Row navigation arrow |
| `x-mark` | Modal close, dismiss |
| `ellipsis-vertical` | Kebab menu (⋮) |
| `arrow-left` | Back button in breadcrumb |
| `cog-6-tooth` | Navbar settings |
| `user` | User metadata |
| `map-pin` | Country field |
| `key` | KeyShield credential |
| `calendar` | Date fields |
| `clock` | Time/expiry fields |
| `document-duplicate` | Copy action |
| `ticket` | Support ticket |
| `shield-check` | Security/KeyShield product icon |
| `user-group` | Groups / UserManager icon |
| `trash` | Delete action |
| `pencil-square` | Edit action |
| `check-circle` | Activado / Finalizada |
| `exclamation-triangle` | Warning / Desactivado |

---

## Layout Grid

- Viewport: **1280px** wide (standard desktop)
- Navbar height: **80px**
- Content area: 1280px × 640px (below navbar)
- Inner content padding: `24px` horizontal
- Max content width inside pages: `1232px` (1280 − 2×24px)
- Modal max-width: `500px`, centered with overlay

### Responsive behavior
Portal is desktop-only. No mobile breakpoints documented. Prototype at 1280px.
