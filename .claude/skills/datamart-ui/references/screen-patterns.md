# Screen Patterns — Datamart Central Hub

Full page layout templates. Each pattern is a complete shell — insert components
from `components.md` into the marked slots.

---

## Table of Contents

1. [Auth — Login Split](#1-auth--login-split)
2. [Dashboard — Product Selection](#2-dashboard--product-selection)
3. [Table List View (UserManager style)](#3-table-list-view-usermanager-style)
4. [Card List View (KeyShield style)](#4-card-list-view-keyshield-style)
5. [Form / Detail View (long-scroll)](#5-form--detail-view)
6. [Modal Pattern](#6-modal-pattern)

---

## 1. Auth — Login Split

1280×720px. Two-column layout: form left (white), decorative panel right (gradient).

```
┌────────────────────────────┬────────────────────────────┐
│  Logo                      │                            │
│                            │   Gradient panel           │
│  Heading                   │   (pink→orange→lilac)      │
│  Subtitle                  │                            │
│                            │   Lifestyle photos         │
│  [Form inputs]             │   collaged on gradient     │
│  [CTA button]              │                            │
│  [Forgot password link]    │                            │
│                            │                            │
│  ─── ó ───                 │                            │
│  [Google OAuth button]     │                            │
│                            │                            │
├────────────────────────────┴────────────────────────────┤
│  Footer: support email (left) | copyright (right)       │
└─────────────────────────────────────────────────────────┘
```

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Mona+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Mona Sans','Inter',system-ui,sans-serif; }
    body { background:#fff; width:1280px; height:720px; overflow:hidden; }
  </style>
</head>
<body>
<div style="display:flex;flex-direction:column;width:1280px;height:720px;">

  <!-- Main split area -->
  <div style="display:flex;flex:1;overflow:hidden;">

    <!-- LEFT: Form area -->
    <div style="width:540px;flex-shrink:0;padding:48px 48px 0;display:flex;flex-direction:column;">
      <!-- Logo -->
      <div style="margin-bottom:48px;">
        <!-- Insert Logo component here -->
        <span style="font-size:20px;font-weight:700;color:#230C65;">⬛ Datamart</span>
      </div>

      <!-- Heading -->
      <div style="margin-bottom:32px;">
        <h1 style="font-size:48px;font-weight:700;color:#230C65;line-height:1.1;margin-bottom:8px;">
          Bienvenido
        </h1>
        <p style="font-size:18px;color:#6B7280;font-weight:400;">a tu central de datos</p>
      </div>

      <!-- Form container: max 300px wide -->
      <div style="width:300px;">
        <!-- Email field (static display) -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;
          font-size:14px;color:#050015;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
            <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
          </svg>
          azubizarreta@empresa.cl
        </div>

        <!-- Password input -->
        <div style="position:relative;margin-bottom:12px;">
          <input type="password" value="PasswordExample_" style="
            width:260px;height:40px;padding:0 40px 0 12px;
            border:1.5px solid #703EFF;border-radius:10px;
            font-size:14px;color:#050015;outline:none;background:#fff;
          "/>
          <button style="position:absolute;right:10px;top:50%;transform:translateY(-50%);
            background:transparent;border:none;cursor:pointer;color:#9CA3AF;">
            👁
          </button>
        </div>

        <!-- CTA button -->
        <button style="
          width:130px;height:40px;
          background:linear-gradient(to right,#EE2EFF,#FF814B);
          color:#fff;border:none;border-radius:9999px;
          font-size:14px;font-weight:600;cursor:pointer;
          margin-bottom:12px;
        ">Iniciar sesión</button>

        <!-- Forgot password link -->
        <a style="display:block;font-size:13px;color:#703EFF;font-weight:500;
          text-decoration:none;margin-bottom:20px;">
          Olvidé mi contraseña
        </a>

        <!-- Divider -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="flex:1;height:1px;background:#E5E7EB;"></div>
          <span style="font-size:13px;color:#9CA3AF;">ó</span>
          <div style="flex:1;height:1px;background:#E5E7EB;"></div>
        </div>

        <!-- Google OAuth button -->
        <button style="
          width:260px;height:40px;
          background:#fff;border:1px solid #E5E7EB;border-radius:9999px;
          font-size:14px;color:#050015;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
        ">
          <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="G"/>
          Inicia sesión con Google
        </button>
      </div>
    </div>

    <!-- RIGHT: Gradient decorative panel -->
    <div style="
      flex:1;
      background:linear-gradient(135deg,#EE2EFF 0%,#FF814B 55%,#C4B5FD 100%);
      position:relative;overflow:hidden;
    ">
      <!-- Vertical glass lines (subtle) -->
      <div style="position:absolute;inset:0;opacity:0.15;">
        <!-- Replicate with thin vertical divs if needed -->
      </div>
      <!-- Photos: collage of 2 lifestyle images (use placeholder colors) -->
      <div style="position:absolute;top:60px;left:80px;width:240px;height:300px;
        border-radius:16px;background:rgba(255,255,255,0.25);overflow:hidden;">
        <!-- img tag for actual photo -->
      </div>
      <div style="position:absolute;top:40px;right:40px;width:180px;height:200px;
        border-radius:16px;background:rgba(255,255,255,0.2);">
      </div>
      <div style="position:absolute;bottom:80px;right:40px;width:180px;height:200px;
        border-radius:16px;background:rgba(255,255,255,0.2);">
      </div>
    </div>
  </div>

  <!-- Footer bar -->
  <div style="
    height:44px;background:#FAF9FB;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 112px;border-top:1px solid #E5E7EB;
    font-size:12px;color:#9CA3AF;
  ">
    <span>¿Tienes dudas? Contáctanos a <a href="mailto:soporte@datamart.cl"
      style="color:#703EFF;text-decoration:none;">soporte@datamart.cl</a></span>
    <span>Datamart | 2025 - Todos los derechos reservados</span>
  </div>
</div>
</body>
</html>
```

---

## 2. Dashboard — Product Selection

Minimal white screen. User greeting + product card grid.

```
┌─────────────────────────────────────────────────────────┐
│  [Navbar]                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Hola                                                  │
│   Mauricio                            ← 32px bold       │
│                                                         │
│   ¿Qué deseas gestionar?              ← 16px            │
│                                                         │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│   │ 🟣 User...   │ │ 🛡 Key...    │ │ 🔒 Ethical   │  │
│   │ Gestión...   │ │ Gestión...   │ │ Gestión...   │  │
│   └──────────────┘ └──────────────┘ └──────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

```html
<!-- After Navbar -->
<div style="padding:48px 24px;">
  <div style="max-width:1232px;margin:0 auto;">
    <!-- Greeting -->
    <div style="margin-bottom:32px;">
      <p style="font-size:18px;color:#6B7280;font-weight:400;margin-bottom:4px;">Hola</p>
      <h1 style="font-size:32px;font-weight:700;color:#050015;margin-bottom:0;">Mauricio</h1>
    </div>
    <p style="font-size:16px;color:#050015;margin-bottom:24px;">¿Qué deseas gestionar?</p>

    <!-- Product cards grid -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <!-- Insert Product Card components here (see components.md §13) -->
    </div>
  </div>
</div>
```

---

## 3. Table List View (UserManager style)

Standard list with tabs, search bar, row cards.

```
┌─────────────────────────────────────────────────────────┐
│  [Navbar]                                               │
├─────────────────────────────────────────────────────────┤
│  Usuarios │ Grupos                    [Invitar usuarios]│
│  ─────────                                              │
│  [Search input]                                         │
│                                                         │
│  Usuario          Último acceso   Clientes   Estado     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [Avatar] Name / Email  │ Date │ Chips │ Badge │ > │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ...                                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

```html
<!-- After Navbar -->
<div style="max-width:1280px;margin:0 auto;">

  <!-- Page header: tabs + CTA -->
  <div style="
    display:flex;align-items:flex-end;justify-content:space-between;
    padding:0 24px;border-bottom:1px solid #E5E7EB;
  ">
    <!-- Tabs -->
    <div style="display:flex;gap:0;">
      <button style="padding:16px 4px;margin-right:24px;background:transparent;border:none;
        border-bottom:2px solid #703EFF;color:#703EFF;font-size:14px;font-weight:600;cursor:pointer;">
        Usuarios
      </button>
      <button style="padding:16px 4px;background:transparent;border:none;
        border-bottom:2px solid transparent;color:#6B7280;font-size:14px;cursor:pointer;">
        Grupos
      </button>
    </div>
    <!-- CTA -->
    <div style="padding-bottom:12px;">
      <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);
        color:#fff;border:none;border-radius:9999px;padding:10px 20px;
        font-size:14px;font-weight:600;cursor:pointer;">
        Invitar usuarios
      </button>
    </div>
  </div>

  <!-- Search bar -->
  <div style="padding:16px 24px;">
    <div style="position:relative;display:inline-flex;align-items:center;">
      <input type="text" placeholder="Buscar por correo electrónico" style="
        width:280px;height:38px;padding:0 40px 0 14px;
        border:1px solid #E5E7EB;border-radius:9999px;
        background:#fff;font-size:13px;color:#050015;outline:none;
      "/>
      <svg style="position:absolute;right:12px;color:#9CA3AF;" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </div>
  </div>

  <!-- Table header row (not a real <table>, just a flex row) -->
  <div style="
    display:flex;padding:8px 20px;margin:0 24px;
    font-size:12px;font-weight:500;color:#9CA3AF;letter-spacing:0.02em;
  ">
    <div style="width:260px;flex-shrink:0;">Usuario</div>
    <div style="width:180px;flex-shrink:0;">Último acceso</div>
    <div style="flex:1;">Clientes y grupos</div>
    <div style="width:140px;flex-shrink:0;">Estado</div>
    <div style="width:180px;flex-shrink:0;"></div>
  </div>

  <!-- Table rows -->
  <div style="padding:0 24px;display:flex;flex-direction:column;gap:8px;">
    <!-- Insert Table Row Card components here (see components.md §11) -->
  </div>
</div>
```

---

## 4. Card List View (KeyShield style)

Breadcrumb navigation + search filters + expanded detail cards (no table grid).

```
┌─────────────────────────────────────────────────────────┐
│  [Navbar]                                               │
├─────────────────────────────────────────────────────────┤
│  ← Keyshield › Solicitudes             [Nueva solicitud]│
│  [Search input]  [Tipo de solicitud ▾]                  │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🔑 Solicitud-001  ● Pendiente  [DTE]               │ │
│  │  📍 País: Perú   🗝 KeyAlias: ...   🎫 Ticket: ... │ │
│  │  👤 Usuario: ...  📅 Creación: ...  ⏰ Expiración  │ │
│  │  Justificación: ...                                 │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ...                                                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

```html
<!-- After Navbar -->
<div style="max-width:1280px;margin:0 auto;">

  <!-- Breadcrumb + CTA -->
  <div style="
    display:flex;align-items:center;justify-content:space-between;
    padding:16px 24px;
  ">
    <div style="display:flex;align-items:center;gap:12px;">
      <!-- Back button -->
      <button style="width:32px;height:32px;border:1px solid #E5E7EB;background:#fff;
        border-radius:8px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:#6B7280;">←</button>
      <!-- Breadcrumb text -->
      <div style="display:flex;align-items:center;gap:6px;font-size:14px;">
        <span style="color:#703EFF;font-weight:500;cursor:pointer;">Keyshield</span>
        <span style="color:#9CA3AF;">›</span>
        <span style="color:#050015;font-weight:500;">Solicitudes</span>
      </div>
    </div>
    <!-- CTA -->
    <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);
      color:#fff;border:none;border-radius:9999px;padding:10px 20px;
      font-size:14px;font-weight:600;cursor:pointer;">
      Nueva solicitud
    </button>
  </div>

  <!-- Filters row -->
  <div style="padding:0 24px 16px;display:flex;gap:10px;align-items:center;">
    <!-- Search -->
    <div style="position:relative;display:inline-flex;align-items:center;">
      <input type="text" placeholder="Buscar por KeyAlias o Ticket" style="
        width:240px;height:38px;padding:0 40px 0 14px;
        border:1px solid #E5E7EB;border-radius:9999px;
        font-size:13px;outline:none;
      "/>
      <svg style="position:absolute;right:12px;color:#9CA3AF;" width="16" height="16"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </div>
    <!-- Dropdown filter -->
    <button style="display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;
      border:1px solid #E5E7EB;border-radius:9999px;background:#fff;
      font-size:13px;color:#050015;cursor:pointer;">
      Tipo de solicitud
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>
  </div>

  <!-- Card list -->
  <div style="padding:0 24px;display:flex;flex-direction:column;gap:12px;">
    <!-- Insert Detail Card components here (see components.md §12) -->
  </div>
</div>
```

---

## 5. Form / Detail View

Long-scroll form. Used in EH request editing, KeyShield new requests.
Breadcrumb + scrollable content area. Content width: 800px max, centered.

```html
<!-- After Navbar + Breadcrumb -->
<div style="max-width:880px;margin:0 auto;padding:24px;">

  <!-- Form sections -->
  <div style="background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:32px;margin-bottom:24px;">
    <h3 style="font-size:18px;font-weight:600;color:#050015;margin-bottom:20px;">
      Información general
    </h3>
    <div style="display:flex;flex-direction:column;gap:16px;">
      <!-- Insert Input components (see components.md §16) -->
    </div>
  </div>

  <!-- Action buttons (sticky bottom or end of form) -->
  <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:8px;">
    <button style="background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;
      border-radius:9999px;padding:10px 24px;font-size:14px;cursor:pointer;">
      Cancelar
    </button>
    <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);
      color:#fff;border:none;border-radius:9999px;padding:10px 24px;
      font-size:14px;font-weight:600;cursor:pointer;">
      Enviar solicitud
    </button>
  </div>
</div>
```

---

## 6. Modal Pattern

Reusable overlay. See `components.md §14` for full shell.

**Sizing guidelines:**
| Modal size | Width | Use case |
|-----------|-------|---------|
| Small | 400px | Confirmation dialogs ("¿Eliminar?"), simple alerts |
| Standard | 500px | Form modals, selection lists (Asignar grupo) |
| Large | 640px | Rich forms with multiple sections |

**Structure always:**
1. Overlay `rgba(0,0,0,0.4)`
2. Panel (white, `border-radius:20px`, `box-shadow` heavy)
3. Close button `×` top-right
4. Header: title (H2) + subtitle (muted)
5. [Optional] Context row: user avatar + entity chip
6. Content area (scrollable if needed, `background:#FAF9FB`)
7. Footer: secondary button + primary button (right-aligned)

**Confirmation modal (destructive):**
```html
<!-- Smaller modal, red accent on primary button -->
<div style="...modal-shell... width:440px;">
  <h2 style="...">Desactivar usuario</h2>
  <p style="font-size:14px;color:#6B7280;margin:12px 0 20px;">
    Perderá el acceso inmediato a todos los productos y funcionalidades asignadas.
  </p>
  <!-- Warning notice -->
  <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;
    padding:12px 16px;font-size:13px;color:#DC2626;margin-bottom:20px;">
    Esta acción no se puede deshacer.
  </div>
  <div style="display:flex;justify-content:flex-end;gap:10px;">
    <button style="...outlined...">Cancelar</button>
    <button style="background:#EF4444;color:#fff;border:none;
      border-radius:9999px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;">
      Desactivar
    </button>
  </div>
</div>
```

---

## 7. Multi-Section Form (EH Nueva Solicitud style)

Long-scroll page with multiple Form Section Cards. Breadcrumb navigation + sticky footer.

```
┌─────────────────────────────────────────────────────────┐
│  [Navbar]                                               │
├─────────────────────────────────────────────────────────┤
│  ← Module › Sub › Nueva solicitud                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Section title                                    │  │
│  │ Section subtitle                                 │  │
│  │  [Select]    [Select]                            │  │
│  │  [Select]    [Date input]                        │  │
│  │  □ Checkbox label                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Section 2                                        │  │
│  │  [Input + trash]                                 │  │
│  │  [+ Agregar] button                              │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Section 3 — Textarea                             │  │
│  │  [File upload inline]                            │  │
│  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  [Cancelar]  [Guardar borrador]  [Crear solicitud ▶]   │
└─────────────────────────────────────────────────────────┘
```

Key layout rules:
- Content max-width: ~760px, centered with `margin: 0 auto`
- Each section is a separate white card (see components §18)
- Form grid: `grid-template-columns: 1fr 1fr` for most fields
- Full-width fields: textareas, single text inputs spanning both columns
- `grid-column: 1 / -1` for full-width fields in the grid
- Footer is sticky bottom (see components §21)

---

## 8. Detail View with Sidebar (EH Solicitud detail)

Two-column: main scrollable content left (~65%) + sticky Historial sidebar right (~32%).

```
┌─────────────────────────────────────────────────────────┐
│  [Navbar]                                               │
├─────────────────────────────────────────────────────────┤
│  ← EH 1 › Solicitudes › EH-2026-005   [Actions bar]   │
│                                                         │
│  ┌────────────────────────────┐  ┌──────────────────┐  │
│  │ EH-2026-005  [Badges]      │  │ Historial      ^ │  │
│  │ Connect                    │  │                  │  │
│  │ 👤 Augusto  🏢 GlobalPay   │  │ ○ Event 1        │  │
│  │                            │  │   user pill      │  │
│  │ Producto  | Cliente        │  │   date           │  │
│  │ Ambiente  | Cuenta AWS     │  │   tag            │  │
│  │                            │  │                  │  │
│  │ 🔗 URLs                    │  │ ○ Event 2        │  │
│  │ [chip] [chip]              │  │   mini-table     │  │
│  │                            │  │                  │  │
│  │ Descripción...             │  │ ○ Event 3        │  │
│  │ [attachment chip]          │  │                  │  │
│  │                            │  └──────────────────┘  │
│  │ Usuarios de prueba:        │                         │
│  │ [user rows]                │                         │
│  │                            │                         │
│  │ Información del ejecutor   │                         │
│  └────────────────────────────┘                         │
│                                                         │
│  [Retests accordion section]                            │
└─────────────────────────────────────────────────────────┘
```

```html
<!-- After Navbar + Action Bar -->
<div style="display:flex;gap:20px;padding:16px 24px;align-items:flex-start;max-width:1280px;margin:0 auto;">

  <!-- Main content -->
  <div style="flex:1;min-width:0;">
    <!-- Detail card -->
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:24px;margin-bottom:20px;">

      <!-- Header: ID + badges -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:13px;color:#9CA3AF;font-weight:500;">EH-2026-005</span>
        <!-- Status badge inline -->
        <span style="padding:3px 10px;border-radius:9999px;background:#FFF7ED;border:1px solid #FED7AA;
          color:#C2410C;font-size:11px;font-weight:500;">Programada</span>
        <!-- Type tag -->
        <span style="padding:3px 8px;border-radius:6px;background:#F9FAFB;border:1px solid #E5E7EB;
          color:#6B7280;font-size:11px;">EH: Externo</span>
      </div>

      <!-- Product name (H2) -->
      <h2 style="font-size:24px;font-weight:700;color:#050015;margin:0 0 8px;">Connect</h2>

      <!-- Meta row: assignee + company -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;font-size:13px;color:#6B7280;">
        <span>👤 Augusto Caraballo</span>
        <span>🏢 Global Payments Perú</span>
      </div>

      <div style="border-top:1px solid #F3F4F6;padding-top:16px;">
        <!-- 2-col metadata grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;margin-bottom:16px;">
          <div>
            <div style="font-size:12px;color:#9CA3AF;margin-bottom:3px;">Producto</div>
            <div style="font-size:14px;font-weight:600;color:#050015;">Connect</div>
          </div>
          <div>
            <div style="font-size:12px;color:#9CA3AF;margin-bottom:3px;">Cliente</div>
            <div style="font-size:14px;font-weight:600;color:#050015;">Global Payments Perú</div>
          </div>
        </div>
      </div>

      <!-- URLs section -->
      <div style="border-top:1px solid #F3F4F6;padding:16px 0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;font-size:12px;color:#9CA3AF;">
          🔗 URLs
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <!-- Insert URL/Repo chips here (components §33) -->
        </div>
      </div>
    </div>

    <!-- Retests section -->
    <div style="margin-top:4px;">
      <h3 style="font-size:15px;font-weight:700;color:#050015;margin-bottom:12px;
        display:flex;align-items:center;gap:8px;">
        🔄 Retests (2)
      </h3>
      <!-- Insert Accordion components here (components §24) -->
    </div>
  </div>

  <!-- Historial sidebar — sticky -->
  <!-- Insert Activity Timeline component here (components §25) -->

</div>
```

---

## 9. Type Selector with Progressive Disclosure

Single card containing option selector at top + conditional form below.

```html
<div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;
  padding:24px;max-width:800px;margin:16px auto;">

  <h2 style="font-size:18px;font-weight:700;color:#050015;margin:0 0 6px;">Nueva solicitud</h2>
  <p style="font-size:13px;color:#6B7280;margin:0 0 20px;">Elige el tipo de acción que deseas ejecutar</p>

  <!-- Type selector cards (components §28) -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <!-- option cards -->
  </div>

  <!-- Conditional form fields (revealed after selection) -->
  <!-- border-top separator + 2-col grid below -->

  <!-- Footer -->
  <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:16px;
    border-top:1px solid #F3F4F6;margin-top:8px;">
    <button style="background:#fff;color:#050015;border:1.5px solid #E5E7EB;
      border-radius:9999px;padding:10px 20px;font-size:14px;cursor:pointer;">Cancelar</button>
    <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);color:#fff;
      border:none;border-radius:9999px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">
      Crear solicitud
    </button>
  </div>
</div>
```
