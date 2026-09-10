# Export a Figma — NEX Factoring

HTML estático de las pantallas y del UI Kit, escrito con los tokens reales de
`pipeline_comercial.jsx`, para importarlo a Figma con el plugin **html.to.design**
(MCP `Html_to_design` → `import-html`).

| Archivo | Contenido | Ancho |
|---|---|---|
| `01-ui-kit.html` | Paleta `C`, etapas, escala tipográfica t7–t15 (Geist), radios 10/14/20, sombras spec, badges (TAG / CAT / tipo de deudor / salud), botones, tabs, inputs + OTP, KPI cards, `DealCard` (3 variantes), columna Kanban, tabla con barra de proyección | 1440 px |
| `02-login.html` | `LoginScreen`: columna de credenciales (512 px) + SSO Entra ID + panel de marca del tenant | 1600 px |
| `03-tubo-kanban.html` | Tubo diario en Kanban: navbar, filtros rápidos y macro columnas Prospección / Oferta / Otorgamiento / Aceptada-Perdida (Perdida colapsada) | 1600 px |
| `04-detalle-operacion.html` | `DealDrawer` sobre overlay: cabecera con pills, tabs, facturas, pricing por deudor, liquidación y barra de acciones | 1600 px |
| `05-lineas.html` | `LineasView` sub-tab «Vigentes»: KPIs, filtros de salud y tabla con recomendación y proyección post-curse | 1600 px |
| `06-gestion.html` | `PanelClientes`: filtros, tabs de secciones/reportes, cartera por ejecutivo con grupo «Perdido», evolución semanal y alertas comerciales | 1600 px |

## Notas

- **Tipografía:** Geist por Google Fonts (`@import` en cada archivo) — disponible en Figma.
- **Escala real del `<style>` del componente**, que no coincide con el comentario del código:
  t7 = 10,5 · t8 = 12,5 · t9 = 11,5 · t10 = 12,5 · t11 = 14 · t12 = 15 · t13 = 16 · t15 = 18 px. `t14` no existe.
- **Sin Tailwind ni React:** todo es CSS plano en línea para que el render del plugin sea fiel y las capas
  queden limpias en Figma.
- Los íconos de lucide-react se reemplazaron por glifos/SVG mínimos; los datos son demo (cedentes y
  deudores chilenos coherentes con `SPREAD_MIN_DEUDOR`).
- Para reimportar: `import-html` con el contenido del archivo, o `intoNodeId` para reemplazar un nodo ya
  importado en vez de crear uno nuevo.
