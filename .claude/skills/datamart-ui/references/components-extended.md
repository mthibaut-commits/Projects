# Components (extendido) — Datamart Central Hub

Complemento de `components.md`. Cubre los componentes de `ui.shadcn.com/docs/components`
que no tenían patrón Datamart documentado. La numeración §34–§49 continúa la del archivo base.

Mismas convenciones: HTML autocontenido con estilos inline (Track A). En Track B usar el
componente shadcn equivalente con tokens semánticos — nunca hex en el JSX.

---

## Mapa de cobertura shadcn → Datamart

| Componente shadcn | Patrón Datamart | Estado |
|---|---|---|
| Accordion | §24 Accordion / fila colapsable | Cubierto |
| Alert | §29 Inline alert banner | Cubierto |
| Alert Dialog | §26 Modal de confirmación | Cubierto |
| Attachment | §20 Upload · §22 Chip de adjunto | Cubierto |
| Avatar | §7 Avatar | Cubierto |
| Badge | §8 Status badges · §9 · §10 · §33 | Cubierto |
| Breadcrumb | §2 Breadcrumb + volver | Cubierto |
| Button | §6 Botones (6 variantes) | Cubierto |
| Button Group | §21 Form footer | Cubierto |
| Calendar / Date Picker | §46 Date picker (rango) | **Nuevo** |
| Card | §11 · §12 · §13 · §18 | Cubierto |
| Chart | Casos de uso — barras, donut, sparkline | Cubierto |
| Checkbox | §18 Form section card | Cubierto |
| Collapsible | §24 Accordion | Cubierto |
| Combobox / Command | §38 Command (⌘K) | **Nuevo** |
| Context Menu / Menubar | §34 Dropdown menu | **Nuevo** |
| Data Table | §48 Data table (orden y selección) | **Nuevo** |
| Dialog | §14 Modal shell | Cubierto |
| Dropdown Menu | §34 Dropdown menu | **Nuevo** |
| Empty | §31 Empty state | Cubierto |
| Field / Label | §18 Form section card | Cubierto |
| Hover Card | §37 Hover card | **Nuevo** |
| Input | §16 Inputs · §30 Confirmación por texto | Cubierto |
| Input Group | §45 Input group | **Nuevo** |
| Input OTP | §44 Input OTP (2FA) | **Nuevo** |
| Item | §11 Fila de tabla · §23 Test users | Cubierto |
| Kbd | §38 Command (footer de atajos) | **Nuevo** |
| Native Select | §16 Select / dropdown | Cubierto |
| Navigation Menu | §1 Navbar · §3 Tabs | Cubierto |
| Pagination | §47 Pagination | **Nuevo** |
| Popover | §36 Popover | **Nuevo** |
| Progress | §42 Progress lineal y circular | **Nuevo** |
| Radio Group | §15 Selection item · §28 Type selector | Cubierto |
| Select | §5 Dropdown filter · §32 Filtro activo | Cubierto |
| Separator | §49 Sidebar · §34 Dropdown | **Nuevo** |
| Sheet / Drawer | §39 Sheet (panel lateral) | **Nuevo** |
| Sidebar | §49 Sidebar de navegación | **Nuevo** |
| Skeleton | §34 bis Estados de datos | Cubierto |
| Spinner | §43 Spinner y botón en carga | **Nuevo** |
| Switch | §40 Switch | **Nuevo** |
| Table | §48 Data table · §31 Empty state | **Nuevo** |
| Tabs | §3 Tab navigation | Cubierto |
| Textarea | Casos de uso — justificación | Cubierto |
| Toast | §17 Notificación flotante | Cubierto |
| Toggle / Toggle Group | §41 Segmented control | **Nuevo** |
| Tooltip | §35 Tooltip | **Nuevo** |
| Typography | Fundamentos — escala tipográfica | Cubierto |
| Aspect Ratio · Carousel · Resizable · Scroll Area | Sin caso de uso en el portal | N/A |
| Bubble · Message · Message Scroller · Questionnaire | Primitivos de chat/IA — fuera de alcance | N/A |

---

## Índice

34. [Dropdown menu (contenido del kebab)](#34-dropdown)
35. [Tooltip](#35-tooltip)
36. [Popover](#36-popover)
37. [Hover card (preview de entidad)](#37-hovercard)
38. [Command / Combobox (⌘K)](#38-command)
39. [Sheet (panel lateral)](#39-sheet)
40. [Switch](#40-switch)
41. [Toggle group (segmented control)](#41-toggle)
42. [Progress (lineal y circular)](#42-progress)
43. [Spinner y botón en carga](#43-spinner)
44. [Input OTP (2FA)](#44-otp)
45. [Input group (prefijo, sufijo, acción)](#45-inputgroup)
46. [Date picker (rango)](#46-datepicker)
47. [Pagination](#47-pagination)
48. [Data table (orden y selección)](#48-datatable)
49. [Sidebar de navegación](#49-sidebar)

---

## 34. Dropdown menu (contenido del kebab)

> shadcn: `Dropdown Menu · Context Menu · Menubar`

El skill define el botón ⋮ (§6) pero nunca su menú. Panel de 220px con label de grupo, items con icono, separador y acción destructiva al final.

```html
<div style="width:220px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.12);padding:6px;">

  <div style="font-size:11px;font-weight:500;color:#9CA3AF;padding:6px 10px 4px;">Acciones</div>

  <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;
    font-size:13.5px;color:#050015;cursor:pointer;"
    onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6">
      <path d="M16.86 4.49a2.1 2.1 0 1 1 2.98 2.98L7.5 19.81l-4 1 1-4L16.86 4.49Z"/></svg>
    Editar usuario
  </div>

  <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;
    font-size:13.5px;color:#050015;cursor:pointer;"
    onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6">
      <path d="M15 19.13a9.4 9.4 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.5M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Z"/></svg>
    Asignar grupo
    <div style="flex:1;"></div>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
      <path d="m9 6 6 6-6 6"/></svg>
  </div>

  <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;
    font-size:13.5px;color:#050015;cursor:pointer;"
    onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.6">
      <rect x="9" y="9" width="12" height="12" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>
    Copiar ID
    <div style="flex:1;"></div>
    <span style="font-size:11px;color:#9CA3AF;font-family:ui-monospace,monospace;">⌘C</span>
  </div>

  <div style="height:1px;background:#F3F4F6;margin:5px 6px;"></div>

  <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;
    font-size:13.5px;color:#DC2626;cursor:pointer;"
    onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='transparent'">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
    Desactivar usuario
  </div>
</div>

<!-- Toda acción destructiva del menú abre un AlertDialog (§26) — nunca ejecuta directo -->
```

---

## 35. Tooltip

> shadcn: `Tooltip`

Burbuja navy sobre fondo claro. Track B: envolver siempre en <TooltipProvider> (patrón P1 del skill) o falla en silencio.

```html
<div style="position:relative;display:inline-flex;">
  <button style="width:32px;height:32px;background:#fff;border:1px solid #E5E7EB;
    border-radius:9999px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;color:#6B7280;">⋮</button>

  <!-- Tooltip arriba -->
  <div style="position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);
    background:#230C65;color:#fff;font-size:12px;font-weight:500;
    padding:6px 10px;border-radius:8px;white-space:nowrap;
    box-shadow:0 4px 14px rgba(0,0,0,.18);">
    Más acciones
    <span style="position:absolute;top:100%;left:50%;transform:translateX(-50%);
      border:5px solid transparent;border-top-color:#230C65;"></span>
  </div>
</div>

<!-- Track B: <TooltipProvider> es obligatorio como wrapper.
     Sin él, Tooltip / Kbd / Sidebar collapsible="icon" fallan en silencio. -->
```

---

## 36. Popover

> shadcn: `Popover`

Panel con acciones, a diferencia del tooltip (solo texto). 280px, radius 12px, misma sombra que el dropdown.

```html
<div style="width:280px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.12);padding:16px;">
  <div style="font-size:14px;font-weight:700;color:#050015;margin-bottom:4px;">Filtrar por fecha</div>
  <div style="font-size:12.5px;color:#6B7280;margin-bottom:14px;">Rango de creación de la solicitud</div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
    <div>
      <label style="display:block;font-size:12px;color:#6B7280;margin-bottom:5px;">Desde</label>
      <input type="text" value="01/06/2026" style="width:100%;height:36px;padding:0 10px;
        border:1px solid #E5E7EB;border-radius:9px;font-size:13px;color:#050015;outline:none;"/>
    </div>
    <div>
      <label style="display:block;font-size:12px;color:#6B7280;margin-bottom:5px;">Hasta</label>
      <input type="text" value="30/06/2026" style="width:100%;height:36px;padding:0 10px;
        border:1px solid #E5E7EB;border-radius:9px;font-size:13px;color:#050015;outline:none;"/>
    </div>
  </div>

  <div style="display:flex;gap:8px;">
    <button style="flex:1;background:#703EFF;color:#fff;border:none;border-radius:9999px;
      padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">Aplicar</button>
    <button style="background:#fff;color:#6B7280;border:1px solid #E5E7EB;border-radius:9999px;
      padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;">Limpiar</button>
  </div>
</div>
```

---

## 37. Hover card (preview de entidad)

> shadcn: `Hover Card`

Detalle contextual al pasar el mouse sobre un cliente o usuario. Solo informativo — si tiene acciones, usar Popover (§36).

```html
<div style="width:300px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.12);padding:16px;">
  <div style="display:flex;gap:12px;margin-bottom:12px;">
    <div style="width:44px;height:44px;border-radius:10px;border:1px solid #E5E7EB;
      display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🇲🇽</div>
    <div>
      <div style="font-size:14.5px;font-weight:700;color:#050015;">Global Payments</div>
      <div style="font-size:12px;color:#6B7280;">PNA1504108Y2 · México</div>
    </div>
  </div>

  <div style="font-size:12.5px;color:#6B7280;line-height:1.5;margin-bottom:12px;">
    Cliente enterprise desde marzo 2024. Contrato vigente hasta 12/2026.
  </div>

  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
    <span style="padding:3px 9px;border-radius:9999px;background:#F1ECFF;border:1px solid #DDD6FE;
      color:#703EFF;font-size:11px;">Connect</span>
    <span style="padding:3px 9px;border-radius:9999px;background:#F1ECFF;border:1px solid #DDD6FE;
      color:#703EFF;font-size:11px;">Getdata</span>
    <span style="padding:3px 9px;border-radius:9999px;background:#F1ECFF;border:1px solid #DDD6FE;
      color:#703EFF;font-size:11px;">KeyShield</span>
  </div>

  <div style="border-top:1px solid #F3F4F6;padding-top:11px;display:flex;gap:18px;font-size:12px;">
    <span style="color:#6B7280;"><strong style="color:#050015;">18</strong> usuarios</span>
    <span style="color:#6B7280;"><strong style="color:#050015;">4</strong> productos</span>
    <span style="color:#6B7280;"><strong style="color:#050015;">960k</strong> consultas</span>
  </div>
</div>
```

---

## 38. Command / Combobox (⌘K)

> shadcn: `Command · Combobox · Kbd`

Buscador con teclado. Crítico cuando la lista supera la regla 7±2 del skill: clientes, KeyAlias, usuarios. Incluye el patrón Kbd.

```html
<div style="width:460px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;
  box-shadow:0 20px 60px rgba(0,0,0,.18);overflow:hidden;">

  <!-- Input de comando -->
  <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #E5E7EB;">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.9-3.9"/></svg>
    <input type="text" placeholder="Buscar cliente, KeyAlias o usuario…"
      style="flex:1;border:none;outline:none;font-size:14.5px;color:#050015;background:transparent;"/>
    <span style="font-size:11px;color:#9CA3AF;border:1px solid #E5E7EB;border-radius:6px;
      padding:2px 6px;font-family:ui-monospace,monospace;">ESC</span>
  </div>

  <!-- Resultados -->
  <div style="max-height:300px;overflow-y:auto;padding:6px;">
    <div style="font-size:11px;font-weight:500;color:#9CA3AF;padding:8px 10px 5px;">Clientes</div>

    <!-- Item activo -->
    <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;
      background:#F1ECFF;cursor:pointer;">
      <span style="font-size:16px;">🇲🇽</span>
      <span style="font-size:13.5px;color:#050015;font-weight:500;">Global Payments</span>
      <div style="flex:1;"></div>
      <span style="font-size:11px;color:#703EFF;">PNA1504108Y2</span>
    </div>

    <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;"
      onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
      <span style="font-size:16px;">🇨🇱</span>
      <span style="font-size:13.5px;color:#050015;">Fintech Andina</span>
      <div style="flex:1;"></div>
      <span style="font-size:11px;color:#9CA3AF;">76.543.210-K</span>
    </div>

    <div style="height:1px;background:#F3F4F6;margin:6px;"></div>
    <div style="font-size:11px;font-weight:500;color:#9CA3AF;padding:8px 10px 5px;">Acciones rápidas</div>

    <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;"
      onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='transparent'">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.8">
        <path d="M12 5v14M5 12h14"/></svg>
      <span style="font-size:13.5px;color:#050015;">Nueva solicitud</span>
      <div style="flex:1;"></div>
      <span style="font-size:11px;color:#9CA3AF;border:1px solid #E5E7EB;border-radius:5px;
        padding:1px 5px;font-family:ui-monospace,monospace;">⌘N</span>
    </div>
  </div>

  <!-- Footer con atajos -->
  <div style="display:flex;align-items:center;gap:14px;padding:9px 16px;background:#FAF9FB;
    border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;">
    <span><strong style="color:#6B7280;">↑↓</strong> navegar</span>
    <span><strong style="color:#6B7280;">↵</strong> seleccionar</span>
    <span><strong style="color:#6B7280;">esc</strong> cerrar</span>
  </div>
</div>
```

---

## 39. Sheet (panel lateral)

> shadcn: `Sheet · Drawer`

Los principios del skill lo citan para "detalle contextual sin navegar", pero no había spec. Panel derecho de 420px con header, cuerpo scrolleable y footer.

```html
<!-- Overlay -->
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:900;"></div>

<!-- Panel derecho -->
<div style="position:fixed;top:0;right:0;bottom:0;width:420px;background:#fff;
  box-shadow:-8px 0 32px rgba(0,0,0,.16);z-index:901;
  display:flex;flex-direction:column;">

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;gap:12px;padding:22px 22px 16px;
    border-bottom:1px solid #E5E7EB;">
    <div style="flex:1;">
      <div style="font-size:18px;font-weight:700;color:#050015;margin-bottom:3px;">
        Solicitud-descifrado-001</div>
      <div style="font-size:13px;color:#6B7280;">Detalle de la credencial</div>
    </div>
    <button style="width:30px;height:30px;background:transparent;border:none;
      cursor:pointer;color:#9CA3AF;font-size:17px;">✕</button>
  </div>

  <!-- Cuerpo scrolleable -->
  <div style="flex:1;overflow-y:auto;padding:20px 22px;
    display:flex;flex-direction:column;gap:16px;">
    <div>
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:3px;">Estado</div>
      <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
        border-radius:9999px;background:#EFF6FF;border:1px solid #BFDBFE;
        color:#2563EB;font-size:12px;font-weight:500;">● Pendiente</span>
    </div>
    <div>
      <div style="font-size:12px;color:#9CA3AF;margin-bottom:3px;">KeyAlias</div>
      <div style="font-size:14px;font-weight:500;color:#050015;">COL-PROV-12345</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:16px 22px;border-top:1px solid #E5E7EB;display:flex;gap:10px;">
    <button style="flex:1;background:#703EFF;color:#fff;border:none;border-radius:9999px;
      padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">Aprobar</button>
    <button style="background:#fff;color:#050015;border:1.5px solid #E5E7EB;
      border-radius:9999px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;">Cerrar</button>
  </div>
</div>

<!-- Sheet = detalle sin salir de la página. Si el detalle merece URL propia,
     usar una ruta nueva con Breadcrumb (§2) en vez de Sheet. -->
```

---

## 40. Switch

> shadcn: `Switch · Field`

Para preferencias que se aplican al instante. Si el cambio requiere Guardar, usar checkbox (§18). Track B: envolver en <Field orientation="horizontal">.

```html
<div style="display:flex;flex-direction:column;gap:2px;max-width:440px;">

  <!-- Encendido -->
  <label style="display:flex;align-items:center;gap:14px;padding:13px 0;
    border-bottom:1px solid #F3F4F6;cursor:pointer;">
    <div style="flex:1;">
      <div style="font-size:14px;font-weight:500;color:#050015;">Alertas de expiración</div>
      <div style="font-size:12.5px;color:#6B7280;margin-top:2px;">
        Avisar 48 h antes de que expire una credencial</div>
    </div>
    <div style="width:40px;height:23px;border-radius:9999px;background:#703EFF;
      padding:2.5px;flex-shrink:0;transition:background .15s;">
      <div style="width:18px;height:18px;border-radius:9999px;background:#fff;
        margin-left:17px;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:margin .15s;"></div>
    </div>
  </label>

  <!-- Apagado -->
  <label style="display:flex;align-items:center;gap:14px;padding:13px 0;
    border-bottom:1px solid #F3F4F6;cursor:pointer;">
    <div style="flex:1;">
      <div style="font-size:14px;font-weight:500;color:#050015;">Resumen diario</div>
      <div style="font-size:12.5px;color:#6B7280;margin-top:2px;">
        Un correo con la actividad del día</div>
    </div>
    <div style="width:40px;height:23px;border-radius:9999px;background:#E5E7EB;
      padding:2.5px;flex-shrink:0;">
      <div style="width:18px;height:18px;border-radius:9999px;background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>
    </div>
  </label>

  <!-- Deshabilitado -->
  <label style="display:flex;align-items:center;gap:14px;padding:13px 0;
    cursor:not-allowed;opacity:.55;">
    <div style="flex:1;">
      <div style="font-size:14px;font-weight:500;color:#050015;">Webhooks de auditoría</div>
      <div style="font-size:12.5px;color:#6B7280;margin-top:2px;">
        Requiere plan Enterprise</div>
    </div>
    <div style="width:40px;height:23px;border-radius:9999px;background:#E5E7EB;
      padding:2.5px;flex-shrink:0;">
      <div style="width:18px;height:18px;border-radius:9999px;background:#fff;"></div>
    </div>
  </label>
</div>
```

---

## 41. Toggle group (segmented control)

> shadcn: `Toggle · Toggle Group`

Alternativa al dropdown filter (§5) cuando hay 2–4 opciones excluyentes y vale la pena verlas todas: rangos de tiempo, vistas, alcance.

```html
<!-- Segmented control con texto -->
<div style="display:inline-flex;gap:3px;padding:3px;background:#F9FAFB;
  border:1px solid #E5E7EB;border-radius:9999px;">
  <button style="border:none;border-radius:9999px;padding:6px 15px;font-size:13px;
    font-weight:500;cursor:pointer;background:transparent;color:#6B7280;">7 días</button>
  <!-- Item activo -->
  <button style="border:none;border-radius:9999px;padding:6px 15px;font-size:13px;
    font-weight:600;cursor:pointer;background:#703EFF;color:#fff;">30 días</button>
  <button style="border:none;border-radius:9999px;padding:6px 15px;font-size:13px;
    font-weight:500;cursor:pointer;background:transparent;color:#6B7280;">90 días</button>
</div>

<!-- Toggle de vista (solo iconos) — activo en blanco con sombra -->
<div style="display:inline-flex;gap:3px;padding:3px;background:#F9FAFB;
  border:1px solid #E5E7EB;border-radius:10px;">
  <button style="border:none;border-radius:8px;padding:7px 11px;cursor:pointer;
    background:#fff;color:#703EFF;box-shadow:0 1px 2px rgba(0,0,0,.08);">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>
  </button>
  <button style="border:none;border-radius:8px;padding:7px 11px;cursor:pointer;
    background:transparent;color:#9CA3AF;">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  </button>
</div>
```

---

## 42. Progress (lineal y circular)

> shadcn: `Progress`

Consumo de cuota API, avance de carga, uso de plan. El color cambia de morado a naranja y rojo al acercarse al límite.

```html
<!-- Barra lineal con contexto -->
<div style="max-width:420px;margin-bottom:22px;">
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;">
    <span style="font-size:13.5px;font-weight:500;color:#050015;">Consultas del mes</span>
    <span style="font-size:12.5px;color:#6B7280;">
      <strong style="color:#050015;">742k</strong> / 1M</span>
  </div>
  <div style="height:8px;border-radius:9999px;background:#F1ECFF;overflow:hidden;">
    <div style="height:100%;width:74%;border-radius:9999px;background:#703EFF;"></div>
  </div>
  <div style="font-size:11.5px;color:#9CA3AF;margin-top:6px;">Se reinicia el 01/09/2026</div>
</div>

<!-- Umbral de advertencia: naranja sobre 80%, rojo sobre 95% -->
<div style="max-width:420px;margin-bottom:22px;">
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;">
    <span style="font-size:13.5px;font-weight:500;color:#050015;">Almacenamiento</span>
    <span style="font-size:12.5px;color:#C2410C;font-weight:600;">92%</span>
  </div>
  <div style="height:8px;border-radius:9999px;background:#FFF7ED;overflow:hidden;">
    <div style="height:100%;width:92%;border-radius:9999px;background:#F97316;"></div>
  </div>
</div>

<!-- Anillo circular -->
<svg viewBox="0 0 100 100" style="width:96px;height:96px;">
  <circle cx="50" cy="50" r="42" fill="none" stroke="#F1ECFF" stroke-width="10"/>
  <circle cx="50" cy="50" r="42" fill="none" stroke="#703EFF" stroke-width="10"
    stroke-linecap="round" stroke-dasharray="263.9" stroke-dashoffset="68.6"
    transform="rotate(-90 50 50)"/>
  <text x="50" y="48" text-anchor="middle" font-size="19" font-weight="700"
    fill="#050015" font-family="Geist,sans-serif">74%</text>
  <text x="50" y="62" text-anchor="middle" font-size="8"
    fill="#9CA3AF" font-family="Geist,sans-serif">cuota</text>
</svg>

<!-- dashoffset = 263.9 × (1 − porcentaje) -->
```

---

## 43. Spinner y botón en carga

> shadcn: `Spinner`

Los principios prohíben el spinner a pantalla completa (para eso está Skeleton). Solo inline o dentro de un botón con disabled.

```html
<style>@keyframes dm-spin{to{transform:rotate(360deg)}}</style>

<!-- Spinner suelto -->
<svg viewBox="0 0 24 24" style="width:20px;height:20px;animation:dm-spin .7s linear infinite;">
  <circle cx="12" cy="12" r="9" fill="none" stroke="#E5E7EB" stroke-width="3"/>
  <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#703EFF" stroke-width="3" stroke-linecap="round"/>
</svg>

<!-- Botón en carga: disabled + spinner + texto en gerundio -->
<button disabled style="background:#703EFF;color:#fff;border:none;border-radius:9999px;
  padding:10px 20px;font-size:14px;font-weight:600;cursor:not-allowed;opacity:.75;
  display:inline-flex;align-items:center;gap:9px;">
  <svg viewBox="0 0 24 24" style="width:15px;height:15px;animation:dm-spin .7s linear infinite;">
    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  </svg>
  Descifrando…
</button>

<!-- Spinner inline en una fila -->
<div style="display:inline-flex;align-items:center;gap:9px;font-size:13px;color:#6B7280;">
  <svg viewBox="0 0 24 24" style="width:14px;height:14px;animation:dm-spin .7s linear infinite;">
    <circle cx="12" cy="12" r="9" fill="none" stroke="#E5E7EB" stroke-width="3"/>
    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#703EFF" stroke-width="3" stroke-linecap="round"/>
  </svg>
  Verificando con el SII…
</div>
```

---

## 44. Input OTP (2FA)

> shadcn: `Input OTP`

Verificación en dos pasos — obligatoria en el contexto fintech de Datamart. Seis casillas, separador al medio, estado de error incluido.

```html
<div style="max-width:400px;">
  <div style="font-size:16px;font-weight:700;color:#050015;margin-bottom:4px;">
    Verifica tu identidad</div>
  <div style="font-size:13.5px;color:#6B7280;margin-bottom:20px;">
    Enviamos un código de 6 dígitos a <strong style="color:#050015;">•••@fintech.cl</strong></div>

  <!-- Casillas: la activa lleva borde morado + ring -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
    <input maxlength="1" value="4" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;outline:none;"/>
    <input maxlength="1" value="8" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;outline:none;"/>
    <input maxlength="1" value="1" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;outline:none;"/>
    <span style="width:10px;height:1.5px;background:#D1D5DB;flex-shrink:0;"></span>
    <input maxlength="1" value="" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1.5px solid #703EFF;border-radius:10px;
      background:#fff;outline:none;box-shadow:0 0 0 3px rgba(112,62,255,.1);"/>
    <input maxlength="1" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;outline:none;"/>
    <input maxlength="1" style="width:46px;height:52px;text-align:center;font-size:20px;
      font-weight:600;color:#050015;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;outline:none;"/>
  </div>

  <div style="font-size:12.5px;color:#6B7280;">
    ¿No lo recibiste?
    <a style="color:#703EFF;font-weight:500;cursor:pointer;text-decoration:none;">Reenviar en 0:42</a>
  </div>

  <!-- Estado de error: borde y texto destructivos en todas las casillas
       border:1.5px solid #FECACA; y mensaje con FieldError (no toast) -->
  <div style="display:flex;align-items:center;gap:7px;margin-top:14px;font-size:12.5px;color:#DC2626;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    El código es incorrecto o expiró.
  </div>
</div>
```

---

## 45. Input group (prefijo, sufijo, acción)

> shadcn: `Input Group`

El skill solo tenía el input pelado (§16). Aquí van los tres casos reales: prefijo fijo, sufijo con unidad y acción embebida.

```html
<div style="display:flex;flex-direction:column;gap:16px;max-width:400px;">

  <!-- Prefijo fijo -->
  <div>
    <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">
      RUT del cliente</label>
    <div style="display:flex;align-items:stretch;border:1px solid #E5E7EB;border-radius:10px;
      overflow:hidden;background:#fff;">
      <span style="display:flex;align-items:center;padding:0 12px;background:#F9FAFB;
        border-right:1px solid #E5E7EB;font-size:13px;color:#6B7280;">CL</span>
      <input type="text" placeholder="76.543.210-K" style="flex:1;height:40px;padding:0 12px;
        border:none;outline:none;font-size:14px;color:#050015;"/>
    </div>
  </div>

  <!-- Sufijo con unidad -->
  <div>
    <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">
      Límite de consultas</label>
    <div style="display:flex;align-items:stretch;border:1px solid #E5E7EB;border-radius:10px;
      overflow:hidden;background:#fff;">
      <input type="text" value="50.000" style="flex:1;height:40px;padding:0 12px;
        border:none;outline:none;font-size:14px;color:#050015;"/>
      <span style="display:flex;align-items:center;padding:0 12px;background:#F9FAFB;
        border-left:1px solid #E5E7EB;font-size:13px;color:#6B7280;">/ mes</span>
    </div>
  </div>

  <!-- Icono líder + acción embebida -->
  <div>
    <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;">
      Endpoint del webhook</label>
    <div style="display:flex;align-items:center;border:1px solid #E5E7EB;border-radius:10px;
      background:#fff;padding-left:12px;">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF"
        stroke-width="1.8" style="flex-shrink:0;">
        <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>
      <input type="text" value="https://api.empresa.cl/hooks/dm" style="flex:1;height:40px;
        padding:0 10px;border:none;outline:none;font-size:13.5px;color:#050015;"/>
      <button style="height:30px;margin-right:5px;padding:0 12px;background:#F1ECFF;
        border:1px solid #DDD6FE;border-radius:9999px;font-size:12.5px;font-weight:500;
        color:#703EFF;cursor:pointer;flex-shrink:0;">Probar</button>
    </div>
  </div>
</div>
```

---

## 46. Date picker (rango)

> shadcn: `Calendar · Date Picker`

Calendario en popover. El rango se pinta con lila #F1ECFF y los extremos en morado sólido; los días fuera de rango quedan deshabilitados.

```html
<div style="width:300px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.12);padding:16px;">

  <!-- Header del mes -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <button style="width:28px;height:28px;border:1px solid #E5E7EB;background:#fff;border-radius:8px;
      display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6B7280;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 6-6 6 6 6"/></svg></button>
    <span style="font-size:14px;font-weight:600;color:#050015;">Junio 2026</span>
    <button style="width:28px;height:28px;border:1px solid #E5E7EB;background:#fff;border-radius:8px;
      display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6B7280;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m9 6 6 6-6 6"/></svg></button>
  </div>

  <!-- Días de la semana -->
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;">
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">L</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">M</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">M</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">J</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">V</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">S</div>
    <div style="text-align:center;font-size:11px;font-weight:500;color:#9CA3AF;padding:4px 0;">D</div>
  </div>

  <!-- Grilla de días -->
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
    <div style="height:32px;"></div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">2</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">3</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">4</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">5</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">6</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">7</div>

    <!-- Inicio del rango -->
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;
      font-weight:600;color:#fff;background:#703EFF;border-radius:8px 0 0 8px;cursor:pointer;">8</div>
    <!-- Días intermedios -->
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#703EFF;background:#F1ECFF;cursor:pointer;">9</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#703EFF;background:#F1ECFF;cursor:pointer;">10</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#703EFF;background:#F1ECFF;cursor:pointer;">11</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#703EFF;background:#F1ECFF;cursor:pointer;">12</div>
    <!-- Fin del rango -->
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;
      font-weight:600;color:#fff;background:#703EFF;border-radius:0 8px 8px 0;cursor:pointer;">13</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">14</div>

    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">15</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">16</div>
    <!-- Hoy: anillo morado sin relleno -->
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;
      font-weight:600;color:#703EFF;border:1.5px solid #703EFF;border-radius:8px;cursor:pointer;">17</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">18</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#050015;border-radius:8px;cursor:pointer;">19</div>
    <!-- Deshabilitado -->
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#D1D5DB;cursor:not-allowed;">20</div>
    <div style="height:32px;display:flex;align-items:center;justify-content:center;font-size:12.5px;color:#D1D5DB;cursor:not-allowed;">21</div>
  </div>

  <div style="border-top:1px solid #F3F4F6;margin-top:12px;padding-top:12px;
    display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:12px;color:#6B7280;">08 – 13 jun</span>
    <button style="background:#703EFF;color:#fff;border:none;border-radius:9999px;
      padding:7px 16px;font-size:12.5px;font-weight:600;cursor:pointer;">Aplicar</button>
  </div>
</div>
```

---

## 47. Pagination

> shadcn: `Pagination`

La regla 7±2 del skill exige paginación o búsqueda en listas largas, pero no había spec. Píldoras, activa en morado, elipsis para saltos.

```html
<div style="display:flex;align-items:center;justify-content:space-between;
  padding:16px 4px;flex-wrap:wrap;gap:12px;">

  <!-- Contexto de resultados -->
  <div style="font-size:13px;color:#6B7280;">
    Mostrando <strong style="color:#050015;">1–10</strong> de
    <strong style="color:#050015;">248</strong> solicitudes
  </div>

  <div style="display:flex;align-items:center;gap:5px;">
    <button style="height:34px;padding:0 13px;border:1px solid #E5E7EB;background:#fff;
      border-radius:9999px;font-size:13px;color:#6B7280;cursor:pointer;
      display:inline-flex;align-items:center;gap:5px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 6-6 6 6 6"/></svg> Anterior</button>

    <!-- Página activa -->
    <button style="min-width:34px;height:34px;border:none;background:#703EFF;color:#fff;
      border-radius:9999px;font-size:13px;font-weight:600;cursor:pointer;">1</button>
    <button style="min-width:34px;height:34px;border:1px solid #E5E7EB;background:#fff;
      color:#050015;border-radius:9999px;font-size:13px;cursor:pointer;">2</button>
    <button style="min-width:34px;height:34px;border:1px solid #E5E7EB;background:#fff;
      color:#050015;border-radius:9999px;font-size:13px;cursor:pointer;">3</button>
    <span style="min-width:26px;text-align:center;color:#9CA3AF;font-size:13px;">…</span>
    <button style="min-width:34px;height:34px;border:1px solid #E5E7EB;background:#fff;
      color:#050015;border-radius:9999px;font-size:13px;cursor:pointer;">25</button>

    <button style="height:34px;padding:0 13px;border:1px solid #E5E7EB;background:#fff;
      border-radius:9999px;font-size:13px;color:#050015;cursor:pointer;
      display:inline-flex;align-items:center;gap:5px;">
      Siguiente <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m9 6 6 6-6 6"/></svg></button>
  </div>

  <!-- Selector de tamaño de página -->
  <div style="position:relative;display:inline-flex;align-items:center;">
    <select style="height:34px;padding:0 30px 0 12px;border:1px solid #E5E7EB;border-radius:9999px;
      background:#fff;font-size:13px;color:#050015;appearance:none;outline:none;cursor:pointer;">
      <option>10 por página</option><option>25 por página</option><option>50 por página</option>
    </select>
    <svg style="position:absolute;right:11px;pointer-events:none;color:#9CA3AF;" width="13" height="13"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
  </div>
</div>
```

---

## 48. Data table (orden y selección)

> shadcn: `Data Table · Table · Checkbox`

Complementa la fila-card (§11) cuando hay que ordenar y actuar en lote. Header ordenable, checkbox de selección, fila seleccionada en lila y barra de acción masiva.

```html
<div style="border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;background:#fff;">

  <!-- Barra de selección (solo con filas marcadas) -->
  <div style="display:flex;align-items:center;gap:12px;padding:11px 18px;background:#F1ECFF;
    border-bottom:1px solid #DDD6FE;">
    <span style="font-size:13px;color:#703EFF;font-weight:500;">2 de 24 seleccionadas</span>
    <div style="flex:1;"></div>
    <button style="height:30px;padding:0 13px;background:#fff;border:1px solid #DDD6FE;
      border-radius:9999px;font-size:12.5px;color:#703EFF;font-weight:500;cursor:pointer;">Exportar</button>
    <button style="height:30px;padding:0 13px;background:#fff;border:1px solid #FECACA;
      border-radius:9999px;font-size:12.5px;color:#DC2626;font-weight:500;cursor:pointer;">Cancelar solicitudes</button>
  </div>

  <!-- Header ordenable -->
  <div style="display:flex;align-items:center;gap:14px;padding:11px 18px;background:#FAF9FB;
    border-bottom:1px solid #E5E7EB;font-size:11.5px;font-weight:500;color:#9CA3AF;">
    <span style="width:18px;height:18px;border-radius:5px;border:1.5px solid #703EFF;background:#703EFF;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;">
      <span style="width:8px;height:1.5px;background:#fff;"></span></span>
    <div style="width:150px;flex-shrink:0;display:flex;align-items:center;gap:4px;cursor:pointer;">ID
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2">
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg></div>
    <div style="flex:1;display:flex;align-items:center;gap:4px;cursor:pointer;">Cliente
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2">
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg></div>
    <!-- Columna ordenada activa: label morado + flecha de dirección -->
    <div style="width:150px;flex-shrink:0;display:flex;align-items:center;gap:4px;
      color:#703EFF;cursor:pointer;">Creación
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 5v14M6 13l6 6 6-6"/></svg></div>
    <div style="width:110px;flex-shrink:0;">Estado</div>
    <div style="width:34px;flex-shrink:0;"></div>
  </div>

  <!-- Fila seleccionada -->
  <div style="display:flex;align-items:center;gap:14px;padding:13px 18px;
    border-bottom:1px solid #F3F4F6;background:#FBFAFF;font-size:13.5px;">
    <span style="width:18px;height:18px;border-radius:5px;background:#703EFF;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></span>
    <div style="width:150px;flex-shrink:0;font-family:ui-monospace,monospace;font-size:12.5px;
      color:#050015;">EH-2026-005</div>
    <div style="flex:1;color:#050015;font-weight:500;">Global Payments</div>
    <div style="width:150px;flex-shrink:0;color:#6B7280;">20/01/2026 10:30</div>
    <div style="width:110px;flex-shrink:0;">
      <span style="padding:3px 10px;border-radius:9999px;background:#EFF6FF;border:1px solid #BFDBFE;
        color:#2563EB;font-size:11px;font-weight:500;">● Pendiente</span></div>
    <div style="width:34px;flex-shrink:0;text-align:right;color:#9CA3AF;cursor:pointer;">⋮</div>
  </div>

  <!-- Fila normal -->
  <div style="display:flex;align-items:center;gap:14px;padding:13px 18px;font-size:13.5px;">
    <span style="width:18px;height:18px;border-radius:5px;border:1.5px solid #D1D5DB;background:#fff;
      flex-shrink:0;cursor:pointer;"></span>
    <div style="width:150px;flex-shrink:0;font-family:ui-monospace,monospace;font-size:12.5px;
      color:#050015;">EH-2026-004</div>
    <div style="flex:1;color:#050015;font-weight:500;">Fintech Andina</div>
    <div style="width:150px;flex-shrink:0;color:#6B7280;">18/01/2026 09:12</div>
    <div style="width:110px;flex-shrink:0;">
      <span style="padding:3px 10px;border-radius:9999px;background:#F0FDF4;border:1px solid #BBF7D0;
        color:#16A34A;font-size:11px;font-weight:500;">✓ Finalizada</span></div>
    <div style="width:34px;flex-shrink:0;text-align:right;color:#9CA3AF;cursor:pointer;">⋮</div>
  </div>
</div>

<!-- El checkbox del header en estado indeterminado usa una barra, no un check.
     Toda acción masiva destructiva pasa por AlertDialog (§26). -->
```

---

## 49. Sidebar de navegación

> shadcn: `Sidebar · Separator`

El portal es solo navbar, pero el backoffice NEX necesita sidebar. Navy #230C65, item activo en píldora blanca, footer de usuario.

```html
<div style="width:236px;background:#230C65;padding:16px 12px;height:100vh;
  display:flex;flex-direction:column;gap:4px;">

  <!-- Logo -->
  <div style="display:flex;align-items:center;gap:8px;padding:4px 10px 16px;">
    <svg width="16" height="22" viewBox="0 0 20 28">
      <defs><linearGradient id="sb-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#EE2EFF"/><stop offset="100%" stop-color="#FF814B"/>
      </linearGradient></defs>
      <rect x="0" y="4" width="5" height="20" rx="2.5" fill="url(#sb-grad)"/>
      <rect x="7.5" y="0" width="5" height="28" rx="2.5" fill="url(#sb-grad)"/>
      <rect x="15" y="6" width="5" height="16" rx="2.5" fill="url(#sb-grad)"/>
    </svg>
    <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-.3px;">Datamart</span>
  </div>

  <!-- Grupo (máx. 2 niveles de anidación, agrupar por dominio) -->
  <div style="font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
    color:rgba(255,255,255,.42);padding:8px 10px 6px;">Operación</div>

  <!-- Item activo: píldora blanca -->
  <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9999px;
    background:#fff;color:#230C65;font-size:13.5px;font-weight:600;cursor:pointer;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    Solicitudes
    <div style="flex:1;"></div>
    <span style="background:#703EFF;color:#fff;font-size:10.5px;font-weight:600;
      border-radius:9999px;padding:1px 7px;">12</span>
  </div>

  <!-- Item inactivo -->
  <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9999px;
    color:rgba(255,255,255,.72);font-size:13.5px;cursor:pointer;"
    onmouseover="this.style.background='rgba(255,255,255,.08)';this.style.color='#fff'"
    onmouseout="this.style.background='transparent';this.style.color='rgba(255,255,255,.72)'">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
      <path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.03 5.91c-.56-.1-1.16.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.4.53-1 .43-1.56A6 6 0 0 1 21.75 8.25Z"/></svg>
    Credenciales
  </div>

  <!-- Separator -->
  <div style="height:1px;background:rgba(255,255,255,.12);margin:10px;"></div>

  <div style="flex:1;"></div>

  <!-- Footer de usuario -->
  <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;
    background:rgba(255,255,255,.07);cursor:pointer;">
    <div style="width:32px;height:32px;border-radius:8px;background:#703EFF;color:#fff;
      font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;
      flex-shrink:0;">MC</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:12.5px;font-weight:600;color:#fff;">Mauricio</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);overflow:hidden;
        text-overflow:ellipsis;white-space:nowrap;">Admin · Datamart</div>
    </div>
  </div>
</div>

<!-- Track B: Sidebar collapsible="icon" requiere <TooltipProvider> como wrapper (P1). -->
```

---

