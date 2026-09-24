/* Gate de contrato de la regla 77 (las cifras de operación de Reportes y del Dashboard se SUMAN semana a semana del A1 y
   del A2, con una sola función para las dos pantallas), sobre el TEXTO del fuente.

   La revisión de Reportes del 23-09-2026 encontró tres defectos en el mismo bloque de cálculo: lo facturado salía de
   `cedido / (0,50 + hash(RUT) % 30 / 100)` —una razón inventada por cliente— en el Dashboard y en Performance comercial;
   el KPI «SOW Target Deudores Prime» mostraba el SOW general (con el reparto proporcional que se usaba, el SOW prime y el
   general eran la misma cifra por construcción); y `sowTargetPct` —la participación propia frente al factoring target—
   se calculaba y ninguna pantalla la leía.

   Lo puro lo prueba el caso 173 (`sumarSemanas`, `indicesCartera`, `filaCartera`, `sumarFilas` y `dashboardKPIs`). Lo que
   la suite no ve es que Performance comercial —un componente— use la misma suma y que las pantallas LEAN lo calculado.
   Eso se vigila acá, sobre la forma canónica (ADR-0006), con una sonda por pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico, tramo } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El elemento `<KpiStat …/>` que lleva un rótulo dado, sobre el texto canónico: desde el `<KpiStat` anterior al rótulo
   hasta el primer `/>` después de él. */
export function kpiConRotulo(can, rotulo) {
  // Con el espacio delante: `label="…"` (las cards del Dashboard) también termina en `l="…"`.
  const j = can.indexOf(` l="${rotulo}"`);
  if (j < 0) return "";
  const i = can.lastIndexOf("<KpiStat", j);
  const k = can.indexOf("/>", j);
  return i < 0 || k < 0 ? "" : can.slice(i, k + 2);
}

export function auditarRegla77(src) {
  const fallos = [];
  // 1 · Ninguna razón inventada entre lo cedido y lo facturado.
  if (/\btasaCesion\b/.test(src)) fallos.push("vuelve `tasaCesion`: lo facturado se lee del A1, no se deduce de lo cedido con una razón por cliente");
  // La semilla era el RUT del cliente más «fac» (`hashStr(s.RUTCliente + "fac")`). Otro `hashStr(op.id + "fac")` que hay en
  // el fuente siembra otra cosa —las facturas de una operación de la vista Operaciones— y no es este hallazgo.
  if (/hashStr\([^)]*RUTCliente[^)]*"fac"\)/.test(src)) fallos.push("vuelve un hash del RUT del cliente con la semilla «fac» para inventar la facturación");
  // 2 · El Dashboard suma con la misma función, sin reparto proporcional.
  const dash = canonico(tramo(src, "function dashboardKPIs("));
  if (!dash) fallos.push("no encuentro `dashboardKPIs`");
  else {
    if (!dash.includes("filaCartera(s, desde, hasta, ix)")) fallos.push("el Dashboard no suma cada cliente con `filaCartera`");
    if (!dash.includes("sumarFilas(")) fallos.push("el Dashboard no agrega con `sumarFilas`");
    if (dash.includes("competenciaDe(")) fallos.push("el Dashboard vuelve a repartir lo perdido con la proporción de `competenciaDe`: lo del target se suma del A2");
    if (/Segmento === "Top" \? 0\.85/.test(dash)) fallos.push("vuelve la proporción de buenos deudores por segmento (0,85 / 0,6 / 0,4) en el Dashboard");
  }
  // 3 · Performance comercial: la misma suma, el SOW prime en su KPI y la comparación contra el target a la vista.
  const perf = canonico(tramo(src, "function ReportePerformance("));
  if (!perf) fallos.push("no encuentro `ReportePerformance`");
  else {
    if (!perf.includes("filaCartera(s, desde, hasta, ix)")) fallos.push("Performance comercial no suma cada cliente con `filaCartera`: el Dashboard y el reporte dirían dos cifras");
    if (!perf.includes("sumarFilas(")) fallos.push("Performance comercial no agrega con `sumarFilas`");
    if (perf.includes("competenciaDe(")) fallos.push("Performance comercial vuelve a repartir lo perdido con la proporción de `competenciaDe`");
    if (/Segmento === "Top" \? 0\.85/.test(perf)) fallos.push("vuelve la proporción de buenos deudores por segmento (0,85 / 0,6 / 0,4) en Performance");
    if (perf.includes('l="SOW Target Deudores Prime"')) fallos.push("vuelve el rótulo «SOW Target Deudores Prime», que mostraba el SOW general");
    const kpi = kpiConRotulo(perf, "SOW deudores prime");
    if (!kpi) fallos.push("no encuentro el KPI «SOW deudores prime» en Performance comercial");
    else {
      if (!kpi.includes("kpi.sowPrimePct")) fallos.push("el KPI «SOW deudores prime» no muestra `sowPrimePct`");
      if (/kpi\.sowPct\b/.test(kpi)) fallos.push("el KPI «SOW deudores prime» vuelve a mostrar el SOW general");
    }
    if (!perf.includes("kpi.sowTargetPct")) fallos.push("Performance comercial no muestra la participación propia frente al factoring target (`sowTargetPct`)");
    if (!perf.includes("f.sowTargetPct")) fallos.push("la tabla de Performance comercial no compara cada fila contra el factoring target");
  }
  const vista = canonico(tramo(src, "function DashboardView("));
  if (!vista) fallos.push("no encuentro `DashboardView`");
  else if (!vista.includes("o.sowTargetPct")) fallos.push("el Dashboard calcula `sowTargetPct` y no lo muestra");
  return fallos;
}

test("regla 77: lo facturado sale del A1, el SOW prime y el target del A2, con una sola suma para el Dashboard y Performance", () => {
  assert.deepEqual(auditarRegla77(jsx), []);
});

/* Reemplaza TODAS las apariciones de `de` por `a` dentro del tramo de una declaración, y deja el resto del fuente igual. */
const dentro = (s, firma, de, a) => {
  const t = tramo(s, firma);
  return t ? s.replace(t, t.split(de).join(a)) : s;
};

const MUTANTES = [
  ["vuelve la razón inventada", (s) => s.replace("function dashboardKPIs(", 'const tasaCesion = 0.5 + (hashStr("x" + "fac") % 30) / 100;\nfunction dashboardKPIs('), /tasaCesion/],
  ["vuelve el hash del RUT", (s) => s.replace("function dashboardKPIs(", 'const r0 = hashStr(s.RUTCliente + "fac");\nfunction dashboardKPIs('), /semilla «fac»/],
  ["el Dashboard deja de sumar con la fila", (s) => dentro(s, "function dashboardKPIs(", "filaCartera(", "filaVieja("), /Dashboard no suma/],
  ["Performance deja de sumar con la fila", (s) => dentro(s, "function ReportePerformance(", "filaCartera(", "filaVieja("), /Performance comercial no suma/],
  ["el KPI prime vuelve al SOW general", (s) => dentro(s, "function ReportePerformance(", "kpi.sowPrimePct", "kpi.sowPct"), /SOW general|no muestra `sowPrimePct`/],
  ["vuelve el rótulo viejo", (s) => dentro(s, "function ReportePerformance(", ' l="SOW deudores prime"', ' l="SOW Target Deudores Prime"'), /rótulo «SOW Target Deudores Prime»|no encuentro el KPI/],
  ["el Dashboard deja de mostrar la comparación", (s) => dentro(s, "function DashboardView(", "o.sowTargetPct", "o.otraCosa"), /no lo muestra/],
];

test("sonda negativa: la razón inventada, la suma desconectada, el KPI con el SOW general y la comparación muda se cazan", () => {
  for (const [nombre, mutar, espera] of MUTANTES) {
    const mutado = mutar(jsx);
    assert.notEqual(mutado, jsx, `el mutante «${nombre}» no cambió nada: su ancla ya no está en el fuente`);
    const f = auditarRegla77(mutado);
    assert.ok(f.some((x) => espera.test(x)), `el mutante «${nombre}» no se cazó: ${JSON.stringify(f)}`);
  }
});
