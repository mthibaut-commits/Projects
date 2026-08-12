# NEX Factoring — Pipeline Comercial (demo BICE / Factoring Security)

Demo de un pipeline comercial de factoring chileno para Datamart. UI en español (Chile).

## Arquitectura y build

- **Un solo archivo fuente:** `pipeline_comercial.jsx` (~12.500 líneas). React 18 + Tailwind CORE (sin compilador: solo clases base) en un único componente raíz `PipelineComercial`.
- **Build:** `build_app.ps1` (ejecutado por el usuario vía `.bat`) lee el `.jsx` de su propia carpeta, usa un importmap (react@18.3.1, lucide-react@0.383.0, recharts@2.12.7, d3-sankey@0.12.3) y APPENDEA el `createRoot(...).render(...)` al final. Por eso el `.jsx` termina en el `}` de cierre de `PipelineComercial` — **nunca agregar createRoot al fuente**.
- **Datos inyectados (CRÍTICO):** el build embebe `datos_inyectados.js` (~25 MB, rescatado del build de Cowork) como script clásico ANTES del bundle: define `window.DTESYNC` (30.000 facturas), `LISTA_BLANCA`, `DEUDORES_AUTORIZADOS`, `AECSYNC`, `SHARE_OF_WALLET`, `ESTRATEGIA_PRECIO`, `LINEA_DISPONIBLE`. **Sin este archivo el inbound no clasifica ninguna factura y el pipeline queda en 0 oportunidades** (el generador sintético de respaldo no trae `tipoDeudor`/`inboundBucket`). No editarlo a mano.
- El resultado es un HTML standalone que el usuario abre en Chrome.
- No hay tests; la verificación es: `tsc --jsx preserve --allowJs --noEmit --skipLibCheck` sin errores TS1, y chequear duplicados: `grep -oE "^(function|const|let|var) [A-Za-z0-9_]+" pipeline_comercial.jsx | awk '{print $2}' | sort | uniq -d` debe salir vacío.

## Convenciones del código

- Clases de fuente propias `t8`–`t13`, `t15` (definidas en el `<style>` del componente; **t14 no existe**). Escala Datamart: t7=9px, t8=11px, t9=10px, t10=11px, t11=12px, t12=13px, t13=14px, t15=16px. Fuente **Geist** (Google Fonts, @import en el `<style>`).
- **Diseño Datamart UI** (migrado según skill `datamart-ui`, 4 fases completas): paleta en el objeto `C`: ink #050015, sub #6B7280, faint #9CA3AF, line #E5E7EB, page #FFFFFF, indigo **#703EFF** (purple de marca; la key conserva el nombre "indigo"), navy #230C65, lilac #F1ECFF, green #16a34a, amber #C2410C (naranja spec), red #dc2626. Tabla semántica Datamart en badges (pill), tabs underline purple, CTA gradiente rosa→naranja (`.btn-cta`), `ConfirmDialog` para borrados reales, radios spec vía override de `.rounded-lg/xl/2xl` (10/14/20px) en el `<style>`. Navegación por **navbar superior** (logo + 7 vistas + Buscar Ctrl K + gear + campanas + selector de sesión + avatar-logout) — se probó un sidebar §49 y el usuario prefirió la navbar: **no volver a proponer sidebar**. **Command palette `CommandK`** con Ctrl/Cmd+K (spec §38): oportunidades (abre DealDrawer), clientes y vistas. Portada `LoginScreen` (spec Auth) con dos métodos: usuario+clave → **OTP 2FA** (§44, código demo precargado), o **SSO Microsoft Entra ID** (mock de Azure App Service Authentication: combo de organización obligatorio → interstitial → selector de cuenta del tenant; entra directo, la MFA la delega en Entra). El cron del inbound sigue activo tras drenarse el stream (gate `iniciadoRef`), para que las pérdidas por AECSync/oferta sigan evaluándose. `stageName` es de nivel módulo (las tarjetas de Perdida del Kanban la usan; si se vuelve local, toda pérdida crashea la app en blanco). La bandeja de Líneas «En proceso» muestra skeleton (~700 ms, clase `.skel`) al consultar estados. Los specs extendidos §34–§49 viven en `Skills/components-extended.md` del repo (v2 del skill del usuario). Colores que NO se tocan: mock portal Factoring Security (#0a7d3f, #6a2c91), mock WhatsApp, ramp severidad (#ea580c/#ca8a04), teal categórico, data-viz (NOTA_COLOR/CAT/Sankey).
- Datos sintéticos DETERMINISTAS: `hashStr` + `pcRng` (mulberry32) + `nowStamp()`. Nada de Math.random en datos que deban ser estables.
- Catálogos base: `PC_EXECS`, `PC_CLIENTES` (80 clientes), `EXECS`, `USERS`, `JEFE_A_EXECS`, `SPREAD_MIN_DEUDOR` (nombres de deudores canónicos).
- Componentes grandes: `PipelineComercial` (App), `DealDrawer` (detalle op), `DealCard`, `LineasView` (sub-tabs Vigentes/En proceso), `PresentacionComite` (wizard 6 pasos), `PanelClientes` (vista «Gestión» del menú; Sankey d3), `PlanPorEjecutivo`, `VerificacionTab`, `OtorgamientosView`.
- **Mis Tareas del Kanban fue ELIMINADO por completo** (panel lateral, `TaskCard`, estado `tasks`/generador, filtros por categoría, conversaciones activas): no reintroducir. La vista «Tareas» del menú (`TareasView`) es independiente y deriva de `deals`.

## Reglas de dominio (invariantes — NO romper)

1. **Curse nunca por email:** el cliente acepta SOLO firmando en el portal (factoringsecurity.cl/curse). El ejecutivo no puede mover a Aceptada (bloqueado en drag y selector). Al enviar el enlace de cierre por **Email**, `enviarCierre` abre una **pestaña nueva** (blob URL vía `emailCierreHTML(deal)`, como el WhatsApp del cliente): página standalone con branding Factoring Security verde `#0a7d3f` — vista email → CTA "Revisar y firmar" → login → detalle → firma. Al firmar hace `window.opener.postMessage({type:'aceptada', neg})`, que el listener de mensajes del panel ya maneja (llama `confirmarCierre` → la operación avanza a Cesión/Giro). No es modal in-app.
2. **Nota Deudor 1–5** (5 = mejor pagador) reemplazó al score 0–99 en la UI (`notaFromScore`, `NOTA_COLOR`). Política de compra: nota ≥ 3,7.
3. **CAT 1–5 por nota ponderada por monto** (`catShares`/`catDeal`/`catDisp`): CAT-1 sA≥80%, CAT-2 sA≥50%, CAT-3 sA+sB≥80%, CAT-4 resto, CAT-5 si sD>5% (tolerancia) con subtipos 5A–5D. Se recalcula en vivo al cambiar folios. No afecta reglas de búsqueda.
4. **Motor de otorgamiento = Modelo de Riesgo v1.0:** catálogo C01–C52 / D01–D23 / O01–O04 inyectado en runtime sobre `REGLAS_CLIENTE` (mutación tras el catálogo viejo). Niveles política N1..N5+Comité (N5=máx) homologados al módulo con `nivel = 6−N`. KNOCKOUT = C30/C31/C32 (TGR judicial/convenios/cuotas) → `rechFirme` → pérdida automática. Re-evaluables definidos por `NO_REEV_CLIENTE`.
5. **Pérdida es estado terminal** (spec Perdida v1.0): causa específica siempre (`causaPerdidaDeal`, nunca el genérico), etapa de origen, actor, cierre de tareas en cascada, badges accionables suprimidos. Reapertura = operación nueva con referencia.
6. **Predictor de verificación V01–V10** (`VERIF_RULES`/`verifFactura`): segmento ELITE (nota>3,7 + Lista Blanca/Prime + V10 + V04; aplica V01,V04,V05,V07,V08,V10; degradable intramés) vs OTHERS (todo). V01 protocolo propio prevalece; V09 >MM$300 fuerza teléfono. Sin versionado: viene de API/SFTP, botón "Refrescar". Verificación telefónica: checklist existencia/recepción/fecha, bloquea el giro.
7. **Oferta:** el gate "Cerrar oferta" (aprobación del ejecutivo) es prerequisito de publicar; el Agente IA (WhatsApp) es OPCIONAL — el ejecutivo puede publicar por email o WhatsApp manual. Fuera de atribución si el cliente pide tasa bajo el mínimo del deudor.
8. **Pricing:** tasa = spread + costo fondo 0,58%. Spread sugerido por SOW (`SPREAD_ESTANDAR` 0,60% − `SOW_AJUSTE` por estado), SIEMPRE truncado por `spreadMinDeudor` (piso de riesgo).
9. **Contactabilidad:** mensaje NO entregado ⇒ 1 solo intento y "Error de contactabilidad"; solo se reintenta (hasta 3) si se entrega sin respuesta.
10. **Asignación de ejecutivo por CEDENTE** (cliente), nunca por deudor. Reglas de prospección solo consideran Lista Blanca/Autorizados/históricos del último año; "Otro" nunca abre oportunidad (agregado manual ⇒ Otorgamiento).
11. **Solicitud de línea:** NEX solo INYECTA (API 1) y consulta (API 2/3 + callback push); resuelve el sistema externo. Una solicitud por línea. Wizard con patrón recuperar→aceptar→editar→confirmar (paso 1 carga automática).
12. Teléfonos ofuscados en logs; timestamps absolutos (nunca relativos); auditoría vía `registrarAuditoria`.

## Documentación del proyecto (fuente de verdad de negocio)

- `Levantamiento_Activos_Informacion.md` — inventario A1–A22 de APIs/SFTP/streams (patrón: SFTP diario → tabla interna + upsert intradía A22).
- `Analisis_Solicitud_Linea_Comite.md` — diseño del módulo de líneas.
- `Integraciones/` — swaggers (gestión de líneas con callback push, montos, upsert A22), layouts CSV de las 5 entregas SFTP y specs de campos.
- `Specs_Procesos/` — PDFs: Inbound de Facturas, Calificación (Otorgamiento+Verificación), Gestión de Oportunidad en Kanban (vigente: v1.2), Solicitud de Línea al Comité, Integraciones APIs y SFTP (vigente: v1.1).
- `swagger_riesgo BICE.yaml` (en uploads originales) — API Riesgo Crédito BICE, 9 endpoints.

## Flujo de trabajo con el usuario

- El usuario (Mauricio, Datamart) reconstruye el HTML con el `.bat` y prueba en Chrome; itera con screenshots. Responder en español.
- Ediciones quirúrgicas con anclas únicas; verificar tras cada cambio (tsc + duplicados). El archivo es grande: leer solo las secciones necesarias.
- Historial: este proyecto se migró desde Cowork; ya no existe la copia espejo en `outputs` — hay UN solo `pipeline_comercial.jsx`.
