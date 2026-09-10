# Export a Figma — NEX Factoring

> **De dónde tiene que salir el export: de `Capturas_UI/`.**
> Esos archivos son el DOM real de un build de `main`, capturados por `capturar_pantallas.mjs`, y
> cada uno lleva estampado el commit del que salió. Los HTML de ESTA carpeta están escritos a mano
> y por eso se desfasaron sin que nadie lo notara: llegaron a dibujar el detalle de la operación
> como drawer sobre overlay dos semanas después de que dejara de serlo, y el tubo en Kanban cuando
> carga por defecto en Tabla. Para actualizar el export, regenerar las capturas y partir de ahí; si
> una pantalla se ve mal, el arreglo va en `pipeline_comercial.jsx`, no en un HTML de maqueta.

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

| `07-tubo-tabla.html` | Tubo diario en **vista Tabla** (`TablaOportunidades`): Oportunidad · Ejecutivo · Monto · Línea · Condiciones de la oferta · Etapa · Estrategia. Incluye fila **«Sin simular»**, fila con condiciones simuladas, «Actualizando la oportunidad…», facturas nuevas sin incorporar, «Requiere otorgamiento», «Perdida · reglas de otorgamiento», «Girada» y «Sin cupo disponible» | 1600 px |
| `08-card-simulacion.html` | **Card de simulación** — paso 4 del wizard de Nuevo negocio: «Resultado nueva simulación», campos editables (tasa, comisión, gastos, otros), Monto a Girar y panel de documentos simulados | 1040 px |
| `09-detalle-sin-simular.html` | Detalle · **sin simular**: condiciones atenuadas con el CTA «Re-evaluar operación» tras incorporar facturas nuevas; desglose y Monto a Girar en «—» | 960 px |
| `10-detalle-con-simulacion.html` | Detalle · **con simulación**: `SimResumen` completo — cabecera «Resultado de la simulación #N», condiciones, atribución por banda, desglose de descuentos, Monto a Girar y nota de retenciones | 960 px |
| `11-detalle-cambio-condiciones.html` | Detalle · **cambio de condiciones** (`editCond`): tabla Criterio / Condiciones originales / Nuevas condiciones, chip «▲ −14,8% · requiere jefatura» y banner de autorización | 960 px |
| `12-detalle-deudores-abiertos.html` | Detalle · sub-tab **Detalle** con los **acordeones por deudor abiertos**: identidad (RUT, Nota, Prime), línea del deudor con proyección, tags Otorg. n/m y Verificado / Req. verif., documentos por deudor y «Otras facturas disponibles» | 960 px |
| `13-detalle-modal-cerrar.html` | Detalle · **modal «Cerrar oferta»** abierto: «Facturas fuera del paquete», listado de descartadas y las dos opciones (nueva oportunidad / descartar) | 1600 px |

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
