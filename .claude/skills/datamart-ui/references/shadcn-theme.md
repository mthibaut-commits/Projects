# shadcn/Luma + Datamart Theme

Bridge between shadcn/ui Luma style and Datamart brand palette.
**Load this file on every prototype request.**

---

## Table of Contents

1. [What Luma Is](#1-what-luma-is)
2. [Complete CSS (OKLCH) — Track B globals.css](#2-complete-css-oklch--track-b-globalscss)
3. [Track A: HTML Artifact Boilerplate](#3-track-a-html-artifact-boilerplate)
4. [Color Reference](#4-color-reference)
5. [shadcn Component Map](#5-shadcn-component-map)
6. [Gradient & Special Utilities](#6-gradient--special-utilities)
7. [Luma QA Patterns](#7-luma-qa-patterns)
8. [Luma Geometry Reference](#8-luma-geometry-reference)

---

## 1. What Luma Is

Luma is a shadcn/ui style preset defining a distinct visual geometry:
- **Rounder corners**: `--radius: 0.625rem` base (xl cards = ~14px, modals = ~18px)
- **Softer shadows**: low-opacity, single-layer elevation
- **Generous padding**: components breathe more than Default/New York
- **Floating inputs**: no fill on inputs by default, subtle purple border on focus
- **Sidebar token**: dedicated `--sidebar` for dark navy sidebar surfaces
- **Semantic status tokens**: `--success`, `--warning`, `--info`, `--destructive` built-in

These characteristics align naturally with the Datamart portal aesthetic.

---

## 2. Complete CSS (OKLCH) — Track B globals.css

Write into your project's global CSS file (usually `app/globals.css`). Preserve any existing `@import` lines at the top. Replace only the `:root`, `.dark`, `@theme inline`, `@layer base`, and `@utility` blocks.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-bg: var(--success-bg);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-bg: var(--warning-bg);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-bg: var(--info-bg);
  --color-highlight: var(--highlight);
  --color-highlight-foreground: var(--highlight-foreground);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-pill: 9999px;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.103 0.057 292.703);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.103 0.057 292.703);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.103 0.057 292.703);
  --primary: oklch(0.55 0.262 285.854);         /* #703EFF */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.953 0.026 297.934);       /* #F1ECFF */
  --secondary-foreground: oklch(0.266 0.14 283.362); /* #230C65 */
  --muted: oklch(0.983 0.003 308.429);           /* #FAF9FB */
  --muted-foreground: oklch(0.551 0.023 264.364); /* #6B7280 */
  --accent: oklch(0.953 0.026 297.934);
  --accent-foreground: oklch(0.266 0.14 283.362);
  --destructive: oklch(0.637 0.208 25.331);      /* #EF4444 */
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.928 0.006 264.531);          /* #E5E7EB */
  --input: oklch(0.928 0.006 264.531);
  --ring: oklch(0.55 0.262 285.854);
  --radius: 0.625rem;
  --chart-1: oklch(0.55 0.262 285.854);
  --chart-2: oklch(0.738 0.168 42.651);
  --chart-3: oklch(0.689 0.3 324.304);
  --chart-4: oklch(0.723 0.192 149.579);
  --chart-5: oklch(0.623 0.188 259.815);
  --sidebar: oklch(0.266 0.14 283.362);          /* #230C65 */
  --sidebar-foreground: oklch(1 0 0);
  --sidebar-primary: oklch(0.55 0.262 285.854);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.953 0.026 297.934);
  --sidebar-accent-foreground: oklch(0.266 0.14 283.362);
  --sidebar-border: oklch(0.928 0.006 264.531);
  --sidebar-ring: oklch(0.55 0.262 285.854);
  --success: oklch(0.723 0.192 149.579);         /* #22C55E */
  --success-foreground: oklch(1 0 0);
  --success-bg: oklch(0.982 0.018 155.826);      /* #F0FDF4 */
  --warning: oklch(0.705 0.187 47.604);          /* #F97316 */
  --warning-foreground: oklch(1 0 0);
  --warning-bg: oklch(0.98 0.016 73.684);        /* #FFF7ED */
  --info: oklch(0.623 0.188 259.815);            /* #3B82F6 */
  --info-foreground: oklch(1 0 0);
  --info-bg: oklch(0.97 0.014 254.604);          /* #EFF6FF */
  --highlight: oklch(0.738 0.168 42.651);        /* #FF814B */
  --highlight-foreground: oklch(1 0 0);
}

.dark {
  --background: oklch(0.13 0.028 285);
  --foreground: oklch(0.95 0.006 286);
  --card: oklch(0.19 0.035 285);
  --card-foreground: oklch(0.95 0.006 286);
  --popover: oklch(0.19 0.035 285);
  --popover-foreground: oklch(0.95 0.006 286);
  --primary: oklch(0.75 0.12 285);
  --primary-foreground: oklch(0.13 0.028 285);
  --secondary: oklch(0.22 0.04 285);
  --secondary-foreground: oklch(0.9 0.01 286);
  --muted: oklch(0.19 0.035 285);
  --muted-foreground: oklch(0.65 0.02 286);
  --accent: oklch(0.22 0.04 285);
  --accent-foreground: oklch(0.9 0.01 286);
  --destructive: oklch(0.637 0.208 25.331);
  --border: oklch(1 0 0 / 15%);
  --input: oklch(1 0 0 / 18%);
  --ring: oklch(0.65 0.18 285);
  --chart-1: oklch(0.65 0.2 285);
  --chart-2: oklch(0.738 0.168 42.651);
  --chart-3: oklch(0.689 0.3 324.304);
  --chart-4: oklch(0.723 0.192 149.579);
  --chart-5: oklch(0.623 0.188 259.815);
  --sidebar: oklch(0.11 0.03 285);
  --sidebar-foreground: oklch(0.92 0.008 286);
  --sidebar-primary: oklch(0.65 0.18 285);
  --sidebar-primary-foreground: oklch(0.95 0.006 286);
  --sidebar-accent: oklch(0.22 0.04 285);
  --sidebar-accent-foreground: oklch(0.9 0.01 286);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: oklch(0.65 0.18 285);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}

@utility bg-gradient-cta {
  background: linear-gradient(to right, #EE2EFF, #FF814B);
}

@utility bg-gradient-panel {
  background: linear-gradient(135deg, #EE2EFF 0%, #FF814B 55%, #C4B5FD 100%);
}
```

---

## 3. Track A: HTML Artifact Boilerplate

Full shell for every HTML artifact. Uses HSL values (required for Tailwind v3 CDN). Copy verbatim — do not strip any section.

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=1280"/>
<title>Datamart — [Screen Name]</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: { DEFAULT: 'hsl(var(--sidebar))', foreground: 'hsl(var(--sidebar-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))', bg: 'hsl(var(--success-bg))' },
        warning: { DEFAULT: 'hsl(var(--warning))', bg: 'hsl(var(--warning-bg))' },
        info: { DEFAULT: 'hsl(var(--info))', bg: 'hsl(var(--info-bg))' },
      },
      borderRadius: {
        sm: 'calc(var(--radius) * 0.6)',
        md: 'calc(var(--radius) * 0.8)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.4)',
        '2xl': 'calc(var(--radius) * 1.8)',
        pill: '9999px',
      },
    },
  },
}
</script>
<style>
  :root {
    --background: 0 0% 100%;
    --foreground: 247 96% 5%;
    --card: 0 0% 100%;
    --card-foreground: 247 96% 5%;
    --popover: 0 0% 100%;
    --popover-foreground: 247 96% 5%;
    --primary: 262 100% 62%;
    --primary-foreground: 0 0% 100%;
    --secondary: 262 100% 96%;
    --secondary-foreground: 262 80% 22%;
    --muted: 280 14% 98%;
    --muted-foreground: 220 9% 46%;
    --accent: 262 100% 96%;
    --accent-foreground: 262 80% 22%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 262 100% 62%;
    --radius: 0.625rem;
    --sidebar: 262 80% 22%;
    --sidebar-foreground: 0 0% 100%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --success-bg: 138 76% 97%;
    --warning: 25 95% 53%;
    --warning-bg: 48 96% 89%;
    --info: 217 91% 60%;
    --info-bg: 214 100% 97%;
    --color-navy: #230C65;
    --color-orange: #FF814B;
    --color-pink: #EE2EFF;
    --color-separator: #ADA8BD;
    --color-lilac: #F1ECFF;
    --color-lilac-border: #DDD6FE;
  }
  .dark {
    --background: 247 55% 8%;
    --foreground: 247 10% 95%;
    --card: 247 45% 12%;
    --card-foreground: 247 10% 95%;
    --primary: 262 60% 75%;
    --primary-foreground: 247 55% 8%;
    --secondary: 247 30% 16%;
    --secondary-foreground: 247 10% 90%;
    --muted: 247 45% 12%;
    --muted-foreground: 247 10% 65%;
    --border: 0 0% 100% / 0.15;
    --input: 0 0% 100% / 0.18;
    --ring: 262 60% 65%;
    --sidebar: 247 60% 7%;
    --sidebar-foreground: 247 10% 92%;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Geist', 'Inter', system-ui, sans-serif;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    -webkit-font-smoothing: antialiased;
    min-width: 1280px;
  }
  button, input, select, textarea { font-family: inherit; }
  .bg-gradient-cta { background: linear-gradient(to right, #EE2EFF, #FF814B); }
  .bg-gradient-panel { background: linear-gradient(135deg, #EE2EFF 0%, #FF814B 55%, #C4B5FD 100%); }
  .dm-card {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: calc(var(--radius) * 1.4);
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
  }
  .dm-input {
    width: 100%; height: 40px; padding: 0 12px;
    border: 1.5px solid hsl(var(--border));
    border-radius: calc(var(--radius) * 1.2);
    background: hsl(var(--background));
    font-size: 14px; color: hsl(var(--foreground)); outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .dm-input:focus {
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 3px hsl(var(--ring) / 0.12);
  }
  .dm-input::placeholder { color: hsl(var(--muted-foreground)); }
  .skeleton {
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--border)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: calc(var(--radius) * 0.8);
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
</style>
</head>
<body>
  <!-- Content here -->
</body>
</html>
```

---

## 4. Color Reference

| Color | Hex | Tailwind (Track B) | Usage |
|---|---|---|---|
| Purple | `#703EFF` | `bg-primary` | Buttons, focus rings, active states |
| Navy | `#230C65` | `bg-sidebar` | Sidebar background, logo text |
| Lilac | `#F1ECFF` | `bg-secondary` | Secondary buttons, chip backgrounds |
| Neutral | `#FAF9FB` | `bg-muted` | Page backgrounds, muted sections |
| Orange | `#FF814B` | `bg-highlight` | Gradient endpoint, accent highlights |
| Gradient | `#EE2EFF→#FF814B` | `bg-gradient-cta` | Primary CTA buttons (1 per page max) |
| Success | `#22C55E` | `bg-success` | Activado, Finalizada states |
| Warning | `#F97316` | `bg-warning` | Programada, Expirada states |
| Danger | `#EF4444` | `bg-destructive` | Desactivado, Con error, delete CTAs |
| Info | `#3B82F6` | `bg-info` | Pendiente states |
| Border | `#E5E7EB` | `border-border` | Card borders, dividers |
| Muted text | `#6B7280` | `text-muted-foreground` | Secondary text, captions |

### Status Badge Quick Reference

| Status | Text color | BG | Border |
|---|---|---|---|
| Activado / Finalizada | `#16A34A` | `#F0FDF4` | `#BBF7D0` |
| Pendiente | `#2563EB` | `#EFF6FF` | `#BFDBFE` |
| Desactivado | `#DC2626` | `#FEF2F2` | `#FECACA` |
| En Remediación / Creada | `#7C3AED` | `#F5F3FF` | `#DDD6FE` |
| Programada / Expirada | `#C2410C` | `#FFF7ED` | `#FED7AA` |
| Borrador / Cancelada | `#6B7280` | `#F9FAFB` | `#E5E7EB` |
| Con error (filled) | `#FFFFFF` | `#EF4444` | `#EF4444` |

Pill shape (both tracks): `border-radius: 9999px; padding: 3px 10px; font-size: 11px; font-weight: 500`

---

## 5. shadcn Component Map

| shadcn | Datamart Pattern | Key detail |
|---|---|---|
| `<Button>` default | Gradient CTA | `bg-gradient-cta rounded-pill` — 1 per page max |
| `<Button variant="outline">` | Secondary action | Default ring → purple |
| `<Button variant="destructive">` | Delete/deactivate | Always pair with `<AlertDialog>` |
| `<Button variant="ghost">` | Cancel / text link | Default |
| `<Badge>` | Status badge | Apply colors from §4 table |
| `<Card>` | Table row / detail card | Add `shadow-sm` on white bg (see P8) |
| `<Dialog>` | Modal shell | Default radius + shadow correct |
| `<AlertDialog>` | Destructive confirm | Always — never delete on single click |
| `<Input>` | Text input | Focus ring → purple auto |
| `<Tabs>` | Usuarios/Grupos nav | Active tab → `--primary` auto |
| `<Switch>` | Notification toggles | Wrap in `<Field orientation="horizontal">` (P2) |
| `<Checkbox>` | Form checkbox | Wrap in `<Field orientation="horizontal">` (P2) |
| `<Avatar>` | User avatar pill | `bg-primary text-primary-foreground` |
| `<Breadcrumb>` | Level 3+ navigation | Active items `text-primary` |
| `<Sheet>` | Contextual detail | No navigation — stays on page |
| `<Alert variant="destructive">` | Inline error banner | Not for form validation (use `<FieldError>`) |
| `<Skeleton>` | Loading state | Shape MUST match final content layout |
| `<Empty>` | No data state | Icon + message + primary CTA — never blank |
| `<TooltipProvider>` | Required wrapper | See P1 — crashes silently without it |

---

## 6. Gradient & Special Utilities

### Primary CTA Button
```html
<!-- Track A -->
<button class="bg-gradient-cta text-white border-none rounded-pill px-5 py-2.5 text-sm font-semibold cursor-pointer inline-flex items-center gap-1.5">
  Nueva solicitud
</button>
```
```tsx
// Track B
<Button className="bg-gradient-cta rounded-pill text-white hover:opacity-90">
  Nueva solicitud
</Button>
```

### Green semantic CTA (finalize / confirm positive)
```tsx
// Track B
<Button className="bg-success text-success-foreground rounded-pill hover:bg-success/90">
  <ShieldCheckIcon className="size-4" />
  Finalizar solicitud
</Button>
```

### URL / Repo chips (lilac)
```html
<!-- Track A -->
<span style="padding:4px 12px;background:var(--color-lilac);border:1px solid var(--color-lilac-border);border-radius:9999px;font-size:12px;color:hsl(var(--primary))">
  https://api.empresa.com/v1
</span>
```

### Skeleton loader (Track A)
```html
<div class="skeleton" style="height:14px;width:140px;margin-bottom:6px"></div>
<div class="skeleton" style="height:10px;width:100px"></div>
```

### Empty state (Track A)
```html
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 24px;text-align:center">
  <svg style="color:hsl(var(--muted-foreground));margin-bottom:14px" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
  </svg>
  <p style="font-size:15px;font-weight:600;color:hsl(var(--foreground));margin-bottom:4px">Sin solicitudes</p>
  <p style="font-size:13px;color:hsl(var(--muted-foreground));margin-bottom:16px">No hay resultados para los filtros aplicados.</p>
  <button class="bg-gradient-cta text-white border-none rounded-pill px-5 py-2 text-sm font-semibold cursor-pointer">
    Nueva solicitud
  </button>
</div>
```

### Datamart logo SVG
```html
<div style="display:flex;align-items:center;gap:7px">
  <svg width="20" height="28" viewBox="0 0 20 28">
    <defs><linearGradient id="dm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EE2EFF"/><stop offset="100%" stop-color="#FF814B"/>
    </linearGradient></defs>
    <rect x="0" y="4" width="5" height="20" rx="2.5" fill="url(#dm)"/>
    <rect x="7.5" y="0" width="5" height="28" rx="2.5" fill="url(#dm)"/>
    <rect x="15" y="6" width="5" height="16" rx="2.5" fill="url(#dm)"/>
  </svg>
  <span style="font-size:18px;font-weight:700;color:var(--color-navy);letter-spacing:-0.3px">Datamart</span>
</div>
```

---

## 7. Luma QA Patterns

Discovered through QA testing of 59 Luma component pages. Apply to avoid silent failures.

### P1 — TooltipProvider (Track B, critical)
Any page using `<Tooltip>`, `<Kbd>`, `<InputGroup>` with tooltip, or `<Sidebar collapsible="icon">` MUST wrap in `<TooltipProvider>`. Crashes silently without it.
```tsx
import { TooltipProvider } from "@/components/ui/tooltip"
export default function Page() {
  return <TooltipProvider>{/* content */}</TooltipProvider>
}
```

### P2 — Field horizontal for Checkbox / Radio / Switch (Track B)
```tsx
<Field orientation="horizontal">
  <Checkbox id="external" />
  <FieldContent>
    <FieldLabel htmlFor="external">¿Requerida por cliente externo?</FieldLabel>
    <FieldDescription>Marcar si la solicitud proviene de fuera de Datamart.</FieldDescription>
  </FieldContent>
</Field>

<Field orientation="horizontal">
  <FieldContent>
    <FieldTitle>Solicitudes de descifrado</FieldTitle>
    <FieldDescription>Notificar cuando se genera una nueva solicitud.</FieldDescription>
  </FieldContent>
  <Switch id="notif-desc" />
</Field>
```

### P3 — Carousel card padding (Track B)
Each `<Card>` inside `<CarouselItem>` MUST be wrapped with `<div className="p-2.5">`.
```tsx
<CarouselItem key={i}>
  <div className="p-2.5"><Card>...</Card></div>
</CarouselItem>
```

### P4 — Charts in Card with header + footer (Track B)
```tsx
<Card className="w-full">
  <CardHeader>
    <CardTitle>Solicitudes por mes</CardTitle>
    <CardDescription>Últimos 6 meses</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <Bar dataKey="total" fill="var(--color-primary)" />
        <ChartTooltip content={<ChartTooltipContent />} />
      </BarChart>
    </ChartContainer>
  </CardContent>
  <CardFooter className="text-sm text-muted-foreground">Enero – Junio 2026</CardFooter>
</Card>
```

### P5 — Sidebar demo isolation (Track B)
```tsx
<div className="h-[600px] w-full overflow-hidden rounded-xl border" style={{ willChange: "transform" }}>
  <SidebarProvider defaultOpen
    style={{ "--sidebar-width": "14rem", "--sidebar-width-icon": "3rem", minHeight: "unset", height: "100%" } as React.CSSProperties}>
    <AppSidebar />
    <main className="flex-1 overflow-auto">{/* content */}</main>
  </SidebarProvider>
</div>
```

### P6 — Navigation Menu dropdowns (Track B)
Use `rounded-md` (not `rounded-2xl`). Place `<NavigationMenu>` at `items-start`.
```tsx
<NavigationMenuContent>
  <ul className="grid w-[500px] gap-1 md:grid-cols-2">
    {items.map(item => <ListItem key={item.title} title={item.title} href={item.href} />)}
  </ul>
</NavigationMenuContent>
```

### P7 — Table with inline Select (Track B)
```tsx
<TableCell>
  <Select defaultValue={row.role}>
    <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="admin">Administrador</SelectItem>
      <SelectItem value="viewer">Visualizador</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
```

### P8 — Cards on white backgrounds (both tracks)
`border-border` is very light (`#E5E7EB`). Add `shadow-sm` + use `bg-muted` as container for visibility.
```tsx
// Track B
<div className="bg-muted p-5">
  <Card className="shadow-sm">...</Card>
</div>
```
```html
<!-- Track A -->
<div style="background:hsl(var(--muted));padding:20px">
  <div class="dm-card" style="padding:20px">...</div>
</div>
```

---

## 8. Luma Geometry Reference

| Token | Value | Computed | Usage |
|---|---|---|---|
| `--radius` | `0.625rem` | `10px` | All radii derived from this |
| `--radius-xl` | `×1.4` | `~14px` | Standard card radius |
| `--radius-2xl` | `×1.8` | `~18px` | Modal, large card radius |
| `--radius-pill` | `9999px` | — | All buttons and badges |
| Button padding | `px-5 py-2.5` | `20px/10px` | Slightly more spacious than Default |
| Input height | `h-10` | `40px` | Matches Datamart portal inputs |
| Card padding | `p-6` | `24px` | Generous — matches portal cards |
| Focus ring | `ring-2 ring-ring/20` | — | Auto purple glow via `--ring` |
