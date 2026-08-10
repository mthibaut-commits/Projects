# Components — Datamart Central Hub

Detailed HTML specs for every reusable component. All derived from Figma file
`KfCBTxMrniPXKJXsMVlHGJ`. Use these as copy-paste building blocks.

---

## Table of Contents

1. [Navbar](#1-navbar)
2. [Breadcrumb + Back Button](#2-breadcrumb--back-button)
3. [Tab Navigation](#3-tab-navigation)
4. [Search Input](#4-search-input)
5. [Dropdown Filter](#5-dropdown-filter)
6. [Buttons](#6-buttons)
7. [Avatar](#7-avatar)
8. [Status Badges](#8-status-badges)
9. [Country + Client Chip](#9-country--client-chip)
10. [Count Chip (+N)](#10-count-chip-n)
11. [Table Row Card](#11-table-row-card)
12. [Detail Card (KeyShield style)](#12-detail-card-keyshield-style)
13. [Product Card (Dashboard)](#13-product-card-dashboard)
14. [Modal Shell](#14-modal-shell)
15. [Selection Item (Modal List)](#15-selection-item-modal-list)
16. [Inputs](#16-inputs)
17. [Notification / Alert Banner](#17-notification--alert-banner)
18. [Form Section Card](#18-form-section-card)
19. [Dynamic List Input (+ Agregar)](#19-dynamic-list-input--agregar)
20. [Drag & Drop Upload Zone](#20-drag--drop-upload-zone)
21. [Form Footer (3-action)](#21-form-footer-3-action)
22. [Download Attachment Chip](#22-download-attachment-chip)
23. [Test Users Row](#23-test-users-row)
24. [Accordion / Collapsible Row](#24-accordion--collapsible-row)
25. [Activity Timeline (Historial Sidebar)](#25-activity-timeline-historial-sidebar)
26. [Confirmation Modal (Centered Icon)](#26-confirmation-modal-centered-icon)
27. [Action Bar (Breadcrumb + CTAs)](#27-action-bar-breadcrumb--ctas)
28. [Type Selector Cards](#28-type-selector-cards)
29. [Inline Alert Banner](#29-inline-alert-banner)
30. [Text Confirmation Input](#30-text-confirmation-input)
31. [Empty State](#31-empty-state)
32. [Active Filter + Clear Button](#32-active-filter--clear-button)
33. [URL / Repo Chip (Lilac)](#33-url--repo-chip-lilac)

---

## 1. Navbar

```html
<nav style="
  height: 80px; background: #fff;
  border-bottom: 1px solid #E5E7EB;
  display: flex; align-items: center;
  padding: 0 24px; gap: 0;
  position: sticky; top: 0; z-index: 100;
">
  <!-- Logo zone: 232px wide, right border separator -->
  <div style="
    display: flex; align-items: center; gap: 10px;
    width: 232px; padding-right: 20px;
    border-right: 1px solid #E5E7EB;
    margin-right: 20px; flex-shrink: 0;
  ">
    <!-- Grid dots icon (apps menu) -->
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="3" cy="3" r="1.5" fill="#9CA3AF"/>
      <circle cx="9" cy="3" r="1.5" fill="#9CA3AF"/>
      <circle cx="15" cy="3" r="1.5" fill="#9CA3AF"/>
      <circle cx="3" cy="9" r="1.5" fill="#9CA3AF"/>
      <circle cx="9" cy="9" r="1.5" fill="#9CA3AF"/>
      <circle cx="15" cy="9" r="1.5" fill="#9CA3AF"/>
      <circle cx="3" cy="15" r="1.5" fill="#9CA3AF"/>
      <circle cx="9" cy="15" r="1.5" fill="#9CA3AF"/>
      <circle cx="15" cy="15" r="1.5" fill="#9CA3AF"/>
    </svg>
    <!-- Datamart logo: render as text+symbol for prototypes -->
    <div style="display:flex; align-items:center; gap:6px;">
      <svg width="20" height="28" viewBox="0 0 20 28">
        <!-- gradient symbol — simplified vertical bars -->
        <defs>
          <linearGradient id="dm-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EE2EFF"/>
            <stop offset="100%" stop-color="#FF814B"/>
          </linearGradient>
        </defs>
        <rect x="0" y="4" width="5" height="20" rx="2.5" fill="url(#dm-grad)"/>
        <rect x="7.5" y="0" width="5" height="28" rx="2.5" fill="url(#dm-grad)"/>
        <rect x="15" y="6" width="5" height="16" rx="2.5" fill="url(#dm-grad)"/>
      </svg>
      <span style="font-size:18px; font-weight:700; color:#230C65; letter-spacing:-0.3px;">
        Datamart
      </span>
    </div>
  </div>

  <!-- Spacer -->
  <div style="flex: 1;"></div>

  <!-- Right actions -->
  <div style="display:flex; align-items:center; gap:12px;">
    <!-- Gear icon -->
    <button style="width:36px;height:36px;background:transparent;border:none;cursor:pointer;
      display:flex;align-items:center;justify-content:center;border-radius:8px;color:#6B7280;"
      onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/>
        <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
      </svg>
    </button>
    <!-- Avatar -->
    <div style="width:36px;height:36px;border-radius:8px;background:#703EFF;
      color:#fff;font-size:13px;font-weight:600;
      display:flex;align-items:center;justify-content:center;cursor:pointer;">
      AA
    </div>
  </div>
</nav>
```

---

## 2. Breadcrumb + Back Button

Used in module screens (EH, KeyShield). Not present in UserManager root.

```html
<div style="display:flex; align-items:center; gap:12px; padding:16px 24px 0;">
  <!-- Back button -->
  <button style="
    width:32px; height:32px; border:1px solid #E5E7EB; background:#fff;
    border-radius:8px; display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#6B7280;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
    </svg>
  </button>
  <!-- Breadcrumb text -->
  <div style="display:flex; align-items:center; gap:6px; font-size:14px;">
    <span style="color:#703EFF; font-weight:500; cursor:pointer;">Ethical Hacking</span>
    <span style="color:#9CA3AF;">›</span>
    <span style="color:#050015; font-weight:500;">Solicitudes</span>
  </div>
</div>
```

---

## 3. Tab Navigation

Horizontal tabs with underline indicator. Used in UserManager (Usuarios / Grupos).

```html
<div style="display:flex; gap:0; border-bottom:1px solid #E5E7EB; margin:16px 24px 0;">
  <!-- Active tab -->
  <button style="
    padding:10px 4px; margin-right:24px;
    background:transparent; border:none; border-bottom:2px solid #703EFF;
    color:#703EFF; font-size:14px; font-weight:600; cursor:pointer;
  ">Usuarios</button>
  <!-- Inactive tab -->
  <button style="
    padding:10px 4px; margin-right:24px;
    background:transparent; border:none; border-bottom:2px solid transparent;
    color:#6B7280; font-size:14px; font-weight:400; cursor:pointer;
  ">Grupos</button>
</div>
```

---

## 4. Search Input

Pill-shaped, gray border, search icon on right.

```html
<div style="position:relative; display:inline-flex; align-items:center;">
  <input
    type="text"
    placeholder="Buscar por correo electrónico"
    style="
      width:260px; height:38px; padding:0 40px 0 14px;
      border:1px solid #E5E7EB; border-radius:9999px;
      background:#fff; font-size:13px; color:#050015;
      outline:none;
    "
  />
  <svg style="position:absolute;right:12px;color:#9CA3AF;" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
</div>
```

---

## 5. Dropdown Filter

```html
<button style="
  display:inline-flex; align-items:center; gap:8px;
  height:38px; padding:0 14px;
  border:1px solid #E5E7EB; border-radius:9999px;
  background:#fff; font-size:13px; color:#050015; cursor:pointer;
">
  Estado de solicitud
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
    <path d="m6 9 6 6 6-6"/>
  </svg>
</button>
```

---

## 6. Buttons

### Primary — Gradient Pill (top-level CTA)
```html
<button style="
  background: linear-gradient(to right, #EE2EFF, #FF814B);
  color: #fff; border: none; border-radius: 9999px;
  padding: 10px 20px; font-size: 14px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
">Nueva solicitud</button>
```

### Primary — Flat Purple (modal CTA)
```html
<button style="
  background: #703EFF; color: #fff; border: none;
  border-radius: 9999px; padding: 10px 24px;
  font-size: 14px; font-weight: 600; cursor: pointer;
">Asignar</button>
```

### Secondary — Outlined (cancel/back)
```html
<button style="
  background: #fff; color: #050015;
  border: 1.5px solid #E5E7EB; border-radius: 9999px;
  padding: 10px 24px; font-size: 14px; font-weight: 500; cursor: pointer;
">Volver</button>
```

### Ghost — Text link (inline action)
```html
<a style="color:#703EFF; font-size:13px; font-weight:500; cursor:pointer; text-decoration:none;">
  Olvidé mi contraseña
</a>
```

### Kebab / Icon button
```html
<button style="
  width:32px; height:32px; background:transparent;
  border:1px solid #E5E7EB; border-radius:9999px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:#6B7280; font-size:18px;
">⋮</button>
```

### Outlined text action (table row)
```html
<button style="
  background:#fff; color:#050015;
  border:1px solid #E5E7EB; border-radius:9999px;
  padding:8px 16px; font-size:13px; font-weight:500;
  cursor:pointer; white-space:nowrap;
">Reenviar invitación</button>
```

---

## 7. Avatar

Square with rounded corners, initials. Background varies by user (use purple `#703EFF` as default).

```html
<!-- Standard size: 36×36 -->
<div style="
  width:36px; height:36px; border-radius:8px;
  background:#703EFF; color:#fff;
  font-size:13px; font-weight:600;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
">AA</div>

<!-- Large size: 48×48 (modal context rows) -->
<div style="
  width:48px; height:48px; border-radius:10px;
  background:#703EFF; color:#fff;
  font-size:15px; font-weight:600;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
">AA</div>
```

---

## 8. Status Badges

```html
<!-- Activado / Finalizada -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#F0FDF4;border:1px solid #BBF7D0;
  color:#16A34A;font-size:12px;font-weight:500;">
  ✓ Activado
</span>

<!-- Pendiente -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#EFF6FF;border:1px solid #BFDBFE;
  color:#2563EB;font-size:12px;font-weight:500;">
  ● Pendiente
</span>

<!-- Desactivado -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#FEF2F2;border:1px solid #FECACA;
  color:#DC2626;font-size:12px;font-weight:500;">
  ▲ Desactivado
</span>

<!-- En Remediación / Creada -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#F5F3FF;border:1px solid #DDD6FE;
  color:#7C3AED;font-size:12px;font-weight:500;">
  En Remediación
</span>

<!-- Programada / Expirada -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#FFF7ED;border:1px solid #FED7AA;
  color:#C2410C;font-size:12px;font-weight:500;">
  Programada
</span>

<!-- Borrador / Cancelada -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#F9FAFB;border:1px solid #E5E7EB;
  color:#6B7280;font-size:12px;font-weight:500;">
  Borrador
</span>

<!-- Con error (filled red) -->
<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  border-radius:9999px;background:#EF4444;border:1px solid #EF4444;
  color:#fff;font-size:12px;font-weight:500;">
  ▲ Con error
</span>
```

---

## 9. Country + Client Chip

Flag emoji + company name. Used in table rows for "Clientes y grupos" column.

```html
<div style="
  display:inline-flex; align-items:center; gap:6px;
  padding:4px 10px; border:1px solid #E5E7EB; border-radius:9999px;
  background:#fff; font-size:12px; color:#050015; white-space:nowrap;
">
  🇵🇪 Global Payments
</div>
```

---

## 10. Count Chip (+N)

```html
<div style="
  display:inline-flex; align-items:center; justify-content:center;
  width:28px; height:22px;
  border:1px solid #E5E7EB; border-radius:9999px;
  background:#fff; font-size:11px; font-weight:600; color:#6B7280;
">+2</div>
```

---

## 11. Table Row Card

Full-width white card with subtle border. Used in UserManager list views.

```html
<div style="
  display:flex; align-items:center; gap:16px;
  padding:14px 20px; background:#fff;
  border:1px solid #E5E7EB; border-radius:14px; margin-bottom:8px;
">
  <!-- Avatar -->
  <div style="width:36px;height:36px;border-radius:8px;background:#703EFF;color:#fff;
    font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    AA
  </div>

  <!-- User info: 200px -->
  <div style="width:200px;flex-shrink:0;">
    <div style="font-size:14px;font-weight:600;color:#050015;">Ricardo Restrepo</div>
    <div style="font-size:12px;color:#6B7280;">rrestrepo@fintech.cl</div>
  </div>

  <!-- Last access: 180px -->
  <div style="width:180px;flex-shrink:0;font-size:13px;color:#6B7280;">
    Sin actividad
    <!-- OR: date + time bold/light -->
  </div>

  <!-- Clients & groups chips -->
  <div style="flex:1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
    <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;
      border:1px solid #E5E7EB;border-radius:9999px;font-size:12px;">
      🇵🇪 Global Payments
    </div>
    <div style="display:inline-flex;align-items:center;justify-content:center;
      width:28px;height:22px;border:1px solid #E5E7EB;border-radius:9999px;
      font-size:11px;font-weight:600;color:#6B7280;">+2</div>
  </div>

  <!-- Status badge -->
  <div style="width:120px;flex-shrink:0;">
    <!-- Insert badge here -->
  </div>

  <!-- Action (button or kebab) -->
  <div style="flex-shrink:0;">
    <!-- "Reenviar invitación" button OR ⋮ kebab -->
  </div>
</div>
```

---

## 12. Detail Card (KeyShield style)

Expanded card format for complex entities with many metadata fields.

```html
<div style="
  background:#fff; border:1px solid #E5E7EB; border-radius:20px;
  padding:20px; margin-bottom:12px;
">
  <!-- Card header row -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
    <!-- Product icon square -->
    <div style="width:40px;height:40px;border-radius:10px;background:#703EFF;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      🔑 <!-- or SVG icon in white -->
    </div>
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:15px;font-weight:700;color:#050015;">Solicitud-descifrado-001</span>
        <!-- Status badge inline -->
        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;
          border-radius:9999px;background:#EFF6FF;border:1px solid #BFDBFE;
          color:#2563EB;font-size:11px;font-weight:500;">● Pendiente</span>
        <!-- Type tag -->
        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;
          border-radius:6px;background:#F9FAFB;border:1px solid #E5E7EB;
          color:#6B7280;font-size:11px;">
          📄 DTE
        </span>
      </div>
    </div>
  </div>

  <!-- Metadata grid: 3 columns -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 24px;margin-bottom:14px;">
    <!-- Each field: icon + label + value inline -->
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">📍</span>
      <span style="color:#6B7280;">País:</span>
      <span style="color:#050015;font-weight:500;">🇵🇪 Perú</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">🗝</span>
      <span style="color:#6B7280;">KeyAlias:</span>
      <span style="color:#050015;font-weight:500;">COL-PROV-12345</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">🎫</span>
      <span style="color:#6B7280;">Ticket de soporte:</span>
      <span style="color:#050015;font-weight:500;">TICK-2024-001</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">👤</span>
      <span style="color:#6B7280;">Usuario final:</span>
      <span style="color:#050015;font-weight:500;">seguridad@datamart.co</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">📅</span>
      <span style="color:#6B7280;">Fecha de creación:</span>
      <span style="color:#050015;font-weight:500;">20/01/2026 10:30</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">⏰</span>
      <span style="color:#6B7280;">Fecha de expiración:</span>
      <span style="color:#050015;font-weight:500;">25/01/2026 10:30</span>
    </div>
    <!-- Pending values show colored text -->
    <div style="display:flex;align-items:center;gap:6px;font-size:13px;">
      <span style="color:#9CA3AF;">🔓</span>
      <span style="color:#6B7280;">Fecha de descifrado:</span>
      <span style="color:#703EFF;font-weight:500;">En espera</span>
      <!-- Use #C2410C for "Sin descifrar" (warning orange) -->
    </div>
  </div>

  <!-- Justification footer -->
  <div style="border-top:1px solid #E5E7EB;padding-top:12px;font-size:13px;color:#6B7280;">
    <span style="font-weight:500;color:#050015;">Justificación:</span>
    Validación de credenciales para proveedor con problemas de acceso
  </div>
</div>
```

---

## 13. Product Card (Dashboard)

Used in product selection screen.

```html
<div style="
  display:flex; align-items:flex-start; gap:14px;
  padding:20px; background:#fff;
  border:1.5px solid #E5E7EB; border-radius:14px;
  cursor:pointer; min-width:200px; max-width:260px;
  transition: box-shadow 0.15s;
" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.10)'"
   onmouseout="this.style.boxShadow='none'">
  <!-- Product icon -->
  <div style="width:40px;height:40px;border-radius:10px;background:#F5F3FF;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#703EFF" stroke-width="2">
      <!-- user-group icon -->
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
    </svg>
  </div>
  <div>
    <div style="font-size:15px;font-weight:700;color:#050015;margin-bottom:4px;">UserManager</div>
    <div style="font-size:13px;color:#6B7280;line-height:1.4;">Gestión de usuarios y permisos</div>
  </div>
</div>
```

---

## 14. Modal Shell

500px wide, centered, overlay backdrop.

```html
<!-- Overlay -->
<div style="
  position:fixed;inset:0;background:rgba(0,0,0,0.4);
  display:flex;align-items:center;justify-content:center;z-index:1000;
">
  <!-- Modal panel -->
  <div style="
    width:500px;background:#fff;border-radius:20px;
    box-shadow:0 20px 60px rgba(0,0,0,0.18);
    padding:32px;position:relative;max-height:90vh;overflow:hidden;
    display:flex;flex-direction:column;
  ">
    <!-- Close button -->
    <button style="
      position:absolute;top:20px;right:20px;
      width:32px;height:32px;background:transparent;border:none;
      cursor:pointer;color:#9CA3AF;font-size:20px;
      display:flex;align-items:center;justify-content:center;border-radius:6px;
    ">✕</button>

    <!-- Header -->
    <div style="margin-bottom:20px;">
      <h2 style="font-size:24px;font-weight:700;color:#050015;margin:0 0 6px;">
        Asignar grupo
      </h2>
      <p style="font-size:14px;color:#6B7280;margin:0;">
        Selecciona al grupo que quieres asignar
      </p>
    </div>

    <!-- Context row (user + entity) -->
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;">
      <!-- User info -->
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:48px;height:48px;border-radius:10px;background:#703EFF;color:#fff;
          font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;">
          AA
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#050015;">Ricardo Restrepo</div>
          <div style="font-size:12px;color:#6B7280;">rrestrepo@fintech.cl</div>
        </div>
      </div>
      <!-- Company info -->
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:40px;height:40px;border-radius:8px;border:1px solid #E5E7EB;
          display:flex;align-items:center;justify-content:center;font-size:22px;">
          🇲🇽
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:#050015;">Global Payments</div>
          <div style="font-size:12px;color:#6B7280;">PNA1504108Y2</div>
        </div>
      </div>
    </div>

    <!-- Scrollable list area -->
    <div style="
      flex:1;overflow-y:auto;background:#FAF9FB;
      border-radius:12px;padding:12px;
      display:flex;flex-direction:column;gap:8px;
      margin-bottom:20px;
    ">
      <!-- Insert Selection Items here -->
    </div>

    <!-- Footer actions -->
    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button style="background:#fff;color:#050015;border:1.5px solid #E5E7EB;
        border-radius:9999px;padding:10px 24px;font-size:14px;font-weight:500;cursor:pointer;">
        Volver
      </button>
      <button style="background:#703EFF;color:#fff;border:none;
        border-radius:9999px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;">
        Asignar
      </button>
    </div>
  </div>
</div>
```

---

## 15. Selection Item (Modal List)

Selectable cards inside modal scrollable area.

```html
<!-- Selected state -->
<div style="
  display:flex;align-items:center;gap:14px;padding:14px 16px;
  background:#fff;border:2px solid #703EFF;border-radius:12px;cursor:pointer;
">
  <div style="width:40px;height:40px;border-radius:10px;background:#703EFF;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><!-- user-group --></svg>
  </div>
  <div style="flex:1;">
    <div style="font-size:14px;font-weight:600;color:#050015;">Administrador Accord</div>
    <div style="font-size:12px;color:#6B7280;">Acceso completo y administrativo a todas las funcionalides del producto Accord.</div>
  </div>
  <!-- Checkmark -->
  <div style="width:22px;height:22px;border-radius:9999px;background:#703EFF;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
      <path d="M4.5 12.75l6 6 9-13.5" stroke="white" stroke-width="2.5" fill="none"/>
    </svg>
  </div>
</div>

<!-- Unselected state -->
<div style="
  display:flex;align-items:center;gap:14px;padding:14px 16px;
  background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;cursor:pointer;
">
  <!-- same structure, no checkmark, lighter bg -->
</div>
```

---

## 16. Inputs

### Text Input
```html
<div style="display:flex;flex-direction:column;gap:6px;">
  <label style="font-size:13px;font-weight:500;color:#374151;">Correo electrónico</label>
  <input type="text" style="
    width:260px;height:40px;padding:0 12px;
    border:1px solid #E5E7EB;border-radius:10px;
    background:#fff;font-size:14px;color:#050015;outline:none;
  " placeholder="azubizarreta@empresa.cl"/>
</div>
```

### Focus state: `border-color: #703EFF; box-shadow: 0 0 0 3px rgba(112,62,255,0.1);`

### Select / Dropdown
```html
<div style="position:relative;display:inline-flex;align-items:center;">
  <select style="
    width:200px;height:40px;padding:0 36px 0 12px;
    border:1px solid #E5E7EB;border-radius:10px;
    background:#fff;font-size:14px;color:#050015;
    appearance:none;outline:none;cursor:pointer;
  ">
    <option>Selecciona un cliente</option>
  </select>
  <svg style="position:absolute;right:10px;pointer-events:none;color:#9CA3AF;"
    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="m6 9 6 6 6-6"/>
  </svg>
</div>
```

---

## 17. Notification / Alert Banner

Floating banner, appears at top of content area (not navbar).

```html
<!-- Success notification -->
<div style="
  position:fixed;top:96px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:10px;
  padding:12px 20px;background:#fff;
  border:1px solid #BBF7D0;border-radius:12px;
  box-shadow:0 4px 20px rgba(0,0,0,0.12);
  font-size:14px;color:#050015;z-index:200;
">
  <span style="color:#22C55E;">✓</span>
  Credencial descifrada exitosamente
</div>
```

---

## 18. Form Section Card

White card grouping related form fields. Used in multi-section forms (EH Nueva Solicitud).
Each section is a separate card with title + subtitle + form grid inside.

```html
<div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:24px;margin-bottom:16px;">
  <!-- Section header -->
  <h3 style="font-size:16px;font-weight:700;color:#050015;margin:0 0 4px;">
    Información del producto
  </h3>
  <p style="font-size:13px;color:#9CA3AF;margin:0 0 20px;">
    Datos generales del producto y contexto del test.
  </p>

  <!-- 2-column grid -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <!-- Field with required asterisk -->
    <div>
      <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">
        <span style="color:#EF4444;">* </span>Producto
      </label>
      <div style="position:relative;">
        <select style="width:100%;height:40px;padding:0 36px 0 12px;border:1px solid #E5E7EB;
          border-radius:10px;background:#fff;font-size:14px;color:#050015;
          appearance:none;outline:none;cursor:pointer;">
          <option>Selecciona un producto</option>
        </select>
        <svg style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9CA3AF;"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    </div>
    <div>
      <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">
        <span style="color:#EF4444;">* </span>Cliente
      </label>
      <div style="position:relative;">
        <select style="width:100%;height:40px;padding:0 36px 0 12px;border:1px solid #E5E7EB;
          border-radius:10px;background:#fff;font-size:14px;color:#6B7280;
          appearance:none;outline:none;">
          <option>Selecciona un cliente</option>
        </select>
        <svg style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- Checkbox (active state) -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#050015;">
    <div style="width:16px;height:16px;border-radius:4px;background:#703EFF;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    ¿La solicitud fue requerida por un cliente externo?
  </label>
</div>
```

---

## 19. Dynamic List Input (+ Agregar)

Repeated input rows with trash icon. Used for URLs and repositories.

```html
<div style="margin-bottom:16px;">
  <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:8px;">
    <span style="color:#EF4444;">* </span>URLs a testear
  </label>

  <!-- Existing items -->
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <input type="text" value="https://app.empresa/api/v1" style="
        flex:1;height:40px;padding:0 12px;
        border:1px solid #E5E7EB;border-radius:10px;
        font-size:13px;color:#050015;outline:none;
      "/>
      <button style="width:36px;height:36px;background:transparent;border:1px solid #E5E7EB;
        border-radius:8px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:#9CA3AF;flex-shrink:0;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Add button -->
  <button style="display:inline-flex;align-items:center;gap:6px;
    padding:8px 14px;background:#fff;border:1px solid #E5E7EB;
    border-radius:9999px;font-size:13px;color:#050015;cursor:pointer;">
    <span style="font-size:16px;line-height:1;color:#6B7280;">+</span>
    Agregar repositorio
  </button>
</div>
```

---

## 20. Drag & Drop Upload Zone

Used in modals for file upload (reports, attachments).

```html
<div style="
  border:2px dashed #D1D5DB;border-radius:12px;
  padding:40px 24px;text-align:center;cursor:pointer;
  background:#fff;
">
  <!-- Cloud upload icon -->
  <svg style="margin:0 auto 12px;display:block;color:#D1D5DB;" width="40" height="40"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 1.076 1.894A3.75 3.75 0 0 1 17.25 19.5H6.75Z"/>
  </svg>
  <p style="font-size:15px;font-weight:600;color:#703EFF;margin:0 0 4px;">
    Haz clic o arrastra el archivo aquí
  </p>
  <p style="font-size:13px;color:#9CA3AF;margin:0;">PDF, máx. 20MB</p>
</div>
```

---

## 21. Form Footer (3-action)

Sticky footer bar at bottom of multi-section forms.
Button states: Cancelar (ghost) | Guardar borrador (outlined, always enabled) | Primary CTA (gradient when form valid, gray disabled when not).

```html
<div style="
  background:#fff;border-top:1px solid #E5E7EB;
  padding:16px 24px;display:flex;justify-content:flex-end;gap:10px;
  position:sticky;bottom:0;
">
  <!-- Cancel -->
  <button style="background:transparent;color:#6B7280;border:none;
    padding:10px 20px;font-size:14px;cursor:pointer;border-radius:9999px;">
    Cancelar
  </button>
  <!-- Save draft (always active) -->
  <button style="background:#fff;color:#050015;border:1.5px solid #E5E7EB;
    border-radius:9999px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;">
    Guardar borrador
  </button>
  <!-- Primary CTA: disabled state -->
  <button disabled style="background:#E5E7EB;color:#9CA3AF;border:none;
    border-radius:9999px;padding:10px 20px;font-size:14px;font-weight:600;cursor:not-allowed;">
    Crear solicitud
  </button>
  <!-- Primary CTA: active state (gradient + icon) -->
  <!--
  <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);
    color:#fff;border:none;border-radius:9999px;padding:10px 20px;
    font-size:14px;font-weight:600;cursor:pointer;
    display:inline-flex;align-items:center;gap:8px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M6 12L10 16L18 8"/>
    </svg>
    Enviar solicitud
  </button>
  -->
</div>
```

---

## 22. Download Attachment Chip

Purple pill for downloadable files. Used in detail views.

```html
<a href="#" style="
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 12px;
  background:#F1ECFF;border:1px solid #DDD6FE;border-radius:9999px;
  font-size:13px;color:#703EFF;font-weight:500;
  text-decoration:none;cursor:pointer;
">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 12l-4 4m0 0-4-4m4 4V4"/>
  </svg>
  informe_RETEST_final.pdf
</a>
```

---

## 23. Test Users Row

Compact credential row. Used in EH detail / form views.

```html
<div style="display:flex;flex-wrap:wrap;gap:16px;padding:12px 0;">
  <!-- Single user credential -->
  <div style="display:flex;align-items:center;gap:8px;min-width:200px;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0"/>
    </svg>
    <div>
      <div style="font-size:13px;font-weight:600;color:#050015;">Administrador</div>
      <div style="font-size:12px;color:#9CA3AF;letter-spacing:2px;">••••••••••••</div>
    </div>
    <!-- Copy icon -->
    <button style="background:transparent;border:none;cursor:pointer;color:#9CA3AF;padding:2px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
  </div>
</div>
```

---

## 24. Accordion / Collapsible Row

Used for Retests section. Header is always visible; body toggles.

```html
<!-- Expanded state -->
<div style="border:1px solid #E5E7EB;border-radius:14px;margin-bottom:8px;overflow:hidden;">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:10px;padding:14px 20px;
    cursor:pointer;background:#fff;">
    <span style="font-size:14px;font-weight:600;color:#050015;">Retest #2</span>
    <!-- Multiple badges -->
    <span style="padding:3px 10px;border-radius:9999px;background:#F0FDF4;border:1px solid #BBF7D0;
      color:#16A34A;font-size:11px;font-weight:500;">Finalizado</span>
    <span style="padding:3px 10px;border-radius:9999px;background:#F0FDF4;border:1px solid #BBF7D0;
      color:#16A34A;font-size:11px;font-weight:500;">Vulnerabilidades resueltas</span>
    <span style="font-size:12px;color:#9CA3AF;font-weight:400;">Solicitado por Augusto Caraballo · 28/03/2026</span>
    <div style="flex:1;"></div>
    <!-- Chevron up (expanded) -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  </div>
  <!-- Body (visible when expanded) -->
  <div style="padding:0 20px 16px;border-top:1px solid #F3F4F6;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;padding-top:14px;">
      <div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:2px;">Fecha propuesta</div>
        <div style="font-size:14px;font-weight:600;color:#050015;">05/04/2026</div>
      </div>
      <div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:2px;">Fecha confirmada</div>
        <div style="font-size:14px;font-weight:600;color:#050015;">13/01/2026</div>
      </div>
    </div>
  </div>
</div>
```

---

## 25. Activity Timeline (Historial Sidebar)

Right sidebar (~300px) with vertical event list. Sticky alongside main content.

```html
<div style="width:300px;flex-shrink:0;background:#fff;border:1px solid #E5E7EB;
  border-radius:14px;padding:20px;align-self:flex-start;position:sticky;top:96px;">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
    <h3 style="font-size:15px;font-weight:700;color:#050015;margin:0;">Historial</h3>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  </div>

  <!-- Timeline events -->
  <div style="display:flex;flex-direction:column;gap:0;">

    <!-- Event item -->
    <div style="display:flex;gap:12px;padding-bottom:20px;position:relative;">
      <!-- Vertical line -->
      <div style="position:absolute;left:15px;top:32px;bottom:0;width:1px;background:#E5E7EB;"></div>
      <!-- Icon circle -->
      <div style="width:32px;height:32px;border-radius:9999px;background:#F0FDF4;border:2px solid #22C55E;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2">
          <path d="M4.5 12.75l6 6 9-13.5"/>
        </svg>
      </div>
      <!-- Event content -->
      <div style="flex:1;padding-top:4px;">
        <div style="font-size:13px;font-weight:600;color:#050015;margin-bottom:6px;">
          Solicitud finalizada
        </div>
        <!-- User pill -->
        <div style="display:inline-flex;align-items:center;gap:5px;
          padding:3px 10px;border:1px solid #E5E7EB;border-radius:9999px;
          font-size:11px;color:#050015;margin-bottom:4px;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          Sebastian Naranjo
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-bottom:6px;">30/01/2026 11:00</div>
        <!-- Event tag (success) -->
        <div style="display:inline-block;padding:3px 8px;background:#F0FDF4;
          border-radius:6px;font-size:11px;color:#16A34A;">
          Sin vulnerabilidades pendientes
        </div>
      </div>
    </div>

    <!-- Event with embedded mini-table -->
    <div style="display:flex;gap:12px;padding-bottom:20px;position:relative;">
      <div style="position:absolute;left:15px;top:32px;bottom:0;width:1px;background:#E5E7EB;"></div>
      <div style="width:32px;height:32px;border-radius:9999px;background:#FFF7ED;border:2px solid #F97316;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div style="flex:1;padding-top:4px;">
        <div style="font-size:13px;font-weight:600;color:#050015;margin-bottom:6px;">
          Test programado
        </div>
        <div style="display:inline-flex;align-items:center;gap:5px;
          padding:3px 10px;border:1px solid #E5E7EB;border-radius:9999px;
          font-size:11px;color:#050015;margin-bottom:4px;">
          Sebastian Naranjo
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-bottom:8px;">13/01/2026 04:00</div>
        <!-- Mini-table embedded in event -->
        <div style="background:#F9FAFB;border-radius:8px;padding:10px 12px;
          display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div style="font-size:11px;color:#9CA3AF;">Tipo de EH</div>
          <div style="font-size:11px;color:#050015;">Interno</div>
          <div style="font-size:11px;color:#9CA3AF;">Alcance</div>
          <div style="font-size:11px;color:#050015;">Crystalbox</div>
          <div style="font-size:11px;color:#9CA3AF;">Fecha propuesta</div>
          <div style="font-size:11px;color:#DC2626;text-decoration:line-through;">15/03/2026</div>
          <div style="font-size:11px;color:#9CA3AF;">Fecha confirmada</div>
          <div style="font-size:11px;color:#050015;">17/03/2026</div>
        </div>
      </div>
    </div>

  </div>
</div>
```

**Timeline icon colors by event type:**
| Event | Icon | Color |
|-------|------|-------|
| Finalizada / Completada | check | `#22C55E` green |
| Solicitud enviada / En progreso | play / arrow-right | `#703EFF` purple |
| Programada / Scheduled | clock | `#F97316` orange |
| Retest solicitado / pendiente | refresh | `#3B82F6` blue |
| Borrador creado | pencil | `#9CA3AF` gray |

---

## 26. Confirmation Modal (Centered Icon)

Distinct from action modals — content is centered, no left-aligned form layout.
Title and description are `text-align: center`.

```html
<div style="width:480px;background:#fff;border-radius:20px;padding:36px 32px 28px;
  box-shadow:0 20px 60px rgba(0,0,0,0.18);text-align:center;position:relative;">

  <!-- Close button -->
  <button style="position:absolute;top:16px;right:16px;background:transparent;border:none;
    cursor:pointer;color:#9CA3AF;font-size:18px;">✕</button>

  <!-- Semantic icon (choose variant below) -->
  <!-- SUCCESS: green check circle -->
  <div style="width:52px;height:52px;border-radius:9999px;border:2px solid #22C55E;
    display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5">
      <path d="M4.5 12.75l6 6 9-13.5"/>
    </svg>
  </div>

  <!-- DESTRUCTIVE: red x-circle -->
  <!--
  <div style="width:52px;height:52px;border-radius:9999px;border:2px solid #DC2626;
    display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5">
      <path d="M6 18L18 6M6 6l12 12"/>
    </svg>
  </div>
  -->

  <!-- DESTROY/DELETE: colored square icon -->
  <!--
  <div style="width:52px;height:52px;border-radius:12px;background:#FF6B35;
    display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  </div>
  -->

  <h2 style="font-size:22px;font-weight:700;color:#050015;margin:0 0 10px;">
    ¿Activar este usuario?
  </h2>
  <p style="font-size:14px;color:#6B7280;margin:0 0 24px;line-height:1.5;">
    Recuperará el acceso inmediato a todos los productos y<br/>funcionalidades que tenía asignados.
  </p>

  <!-- Subject preview card -->
  <div style="background:#FAF9FB;border:1px solid #E5E7EB;border-radius:12px;
    padding:14px 16px;display:flex;align-items:center;gap:12px;
    text-align:left;margin-bottom:24px;">
    <div style="width:44px;height:44px;border-radius:10px;background:#703EFF;color:#fff;
      font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;
      flex-shrink:0;">AA</div>
    <div>
      <div style="font-size:14px;font-weight:600;color:#050015;">Ricardo Restrepo</div>
      <div style="font-size:12px;color:#6B7280;">rrestrepo@fintech.cl</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:flex-end;gap:10px;">
    <button style="background:#fff;color:#050015;border:1.5px solid #E5E7EB;
      border-radius:9999px;padding:10px 24px;font-size:14px;font-weight:500;cursor:pointer;">
      Volver
    </button>
    <!-- Positive CTA: purple -->
    <button style="background:#703EFF;color:#fff;border:none;border-radius:9999px;
      padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;">Activar</button>
    <!-- Destructive CTA: red -->
    <!--
    <button style="background:#EF4444;color:#fff;border:none;border-radius:9999px;
      padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;">Desactivar</button>
    -->
  </div>
</div>
```

---

## 27. Action Bar (Breadcrumb + CTAs)

When a detail view has contextual actions, they appear to the right of the breadcrumb.
Button variants depend on action semantics.

```html
<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;">
  <!-- Left: back + breadcrumb -->
  <div style="display:flex;align-items:center;gap:12px;">
    <button style="width:32px;height:32px;border:1px solid #E5E7EB;background:#fff;
      border-radius:8px;display:flex;align-items:center;justify-content:center;
      cursor:pointer;color:#6B7280;">←</button>
    <div style="display:flex;align-items:center;gap:6px;font-size:14px;">
      <span style="color:#703EFF;font-weight:500;cursor:pointer;">Ethical Hacking 1</span>
      <span style="color:#9CA3AF;">›</span>
      <span style="color:#703EFF;font-weight:500;cursor:pointer;">Solicitudes</span>
      <span style="color:#9CA3AF;">›</span>
      <span style="color:#050015;font-weight:500;">EH-2026-005</span>
    </div>
  </div>

  <!-- Right: contextual action buttons -->
  <div style="display:flex;align-items:center;gap:8px;">
    <!-- Gradient action -->
    <button style="background:linear-gradient(to right,#EE2EFF,#FF814B);color:#fff;border:none;
      border-radius:9999px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;
      display:inline-flex;align-items:center;gap:6px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9"/>
      </svg>
      Habilitar retest
    </button>
    <!-- Green action (positive/finalize) -->
    <button style="background:#22C55E;color:#fff;border:none;
      border-radius:9999px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;
      display:inline-flex;align-items:center;gap:6px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
      </svg>
      Finalizar solicitud
    </button>
    <!-- Outlined destructive -->
    <button style="background:#fff;color:#6B7280;border:1px solid #E5E7EB;
      border-radius:9999px;padding:9px 18px;font-size:13px;font-weight:500;cursor:pointer;
      display:inline-flex;align-items:center;gap:6px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
      </svg>
      Cancelar solicitud
    </button>
  </div>
</div>
```

---

## 28. Type Selector Cards

Two-option selection that reveals a form below when one is chosen.

```html
<!-- Unselected state (both neutral) -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
  <div style="border:1.5px solid #E5E7EB;border-radius:12px;padding:16px;
    display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
    <div style="width:40px;height:40px;border-radius:10px;background:#703EFF;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"/>
      </svg>
    </div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#050015;margin-bottom:4px;">Solicitud de descifrado</div>
      <div style="font-size:12px;color:#6B7280;line-height:1.4;">Acceso único de 60 segundos para visualización y copia única de la credencial.</div>
    </div>
  </div>

  <div style="border:1.5px solid #E5E7EB;border-radius:12px;padding:16px;
    display:flex;align-items:flex-start;gap:12px;cursor:pointer;">
    <div style="width:40px;height:40px;border-radius:10px;background:#FF6B35;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
      </svg>
    </div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#050015;margin-bottom:4px;">Solicitud de eliminación</div>
      <div style="font-size:12px;color:#6B7280;line-height:1.4;">Borrado permanente del KeyAlias en la base de datos. <strong>Esta acción no se puede deshacer.</strong></div>
    </div>
  </div>
</div>

<!-- Selected state: purple border + checkmark top-right -->
<!-- Add to selected card: border:1.5px solid #703EFF + position:relative -->
<!-- Add checkmark badge: position:absolute;top:-8px;right:-8px -->
```

---

## 29. Inline Alert Banner

Warning/danger notice inside a form or modal. NOT a floating notification.

```html
<div style="
  display:flex;align-items:flex-start;gap:10px;
  padding:12px 16px;background:#FEF2F2;
  border:1px solid #FECACA;border-radius:10px;
  font-size:13px;color:#DC2626;
  margin:12px 0;
">
  <svg style="flex-shrink:0;margin-top:1px;" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
  Esta acción eliminará permanentemente el registro de la base de datos.
</div>
```

---

## 30. Text Confirmation Input

Requires user to type a specific phrase before a destructive action is enabled.

```html
<div style="margin:16px 0;">
  <p style="font-size:13px;color:#050015;margin-bottom:8px;">
    Escribe "<strong>ELIMINAR REGISTRO</strong>" para confirmar
  </p>
  <input type="text" placeholder="ELIMINAR REGISTRO" style="
    width:100%;height:40px;padding:0 12px;
    border:1px solid #E5E7EB;border-radius:10px;
    font-size:14px;color:#050015;outline:none;background:#fff;
  "/>
</div>
```

---

## 31. Empty State

Used when a list/table has no results (filtered or genuinely empty).
Header row stays visible; body shows centered message.

```html
<!-- Table container with empty body -->
<div style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;">
  <!-- Column headers -->
  <div style="display:flex;padding:12px 20px;border-bottom:1px solid #E5E7EB;
    font-size:12px;font-weight:500;color:#9CA3AF;background:#fff;">
    <div style="width:140px;flex-shrink:0;">ID</div>
    <div style="width:140px;flex-shrink:0;">Producto</div>
    <div style="flex:1;">Cliente</div>
    <div style="width:140px;flex-shrink:0;">Estado</div>
    <div style="width:160px;flex-shrink:0;">Última actualización</div>
  </div>
  <!-- Empty body -->
  <div style="padding:80px 24px;text-align:center;">
    <p style="font-size:14px;color:#9CA3AF;margin:0;">Sin solicitudes</p>
  </div>
</div>
```

---

## 32. Active Filter + Clear Button

Appears when a filter is applied. Dropdown shows active value; clear button appears alongside.

```html
<div style="display:flex;gap:10px;align-items:center;">
  <!-- Active filter dropdown (value shown) -->
  <button style="display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;
    border:1px solid #703EFF;border-radius:9999px;background:#F1ECFF;
    font-size:13px;color:#703EFF;cursor:pointer;font-weight:500;">
    Tipo: En Remediación
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </button>

  <!-- Clear filters button (only when filters active) -->
  <button style="display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;
    border:1px solid #E5E7EB;border-radius:9999px;background:#fff;
    font-size:13px;color:#6B7280;cursor:pointer;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
    Limpiar filtros
  </button>
</div>
```

---

## 33. URL / Repo Chip (Lilac)

Distinct from country chips — used for URLs and repository paths in detail views.
Background is soft lilac `#F1ECFF`, text is purple.

```html
<!-- URL chip -->
<a href="#" style="
  display:inline-flex;align-items:center;
  padding:5px 12px;background:#F1ECFF;
  border:1px solid #DDD6FE;border-radius:9999px;
  font-size:12px;color:#703EFF;text-decoration:none;
  margin-right:6px;margin-bottom:6px;
">
  https://connect-test.globalpayments.cl/auth
</a>

<!-- Repo chip (same style) -->
<span style="
  display:inline-flex;align-items:center;
  padding:5px 12px;background:#F1ECFF;
  border:1px solid #DDD6FE;border-radius:9999px;
  font-size:12px;color:#703EFF;
">
  globalpayments/connect-backend
</span>
```
