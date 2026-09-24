/* Gate de contrato de la regla 76 (Reportes › Cliente y SOW leen la cartera MEDIDA), sobre el TEXTO del fuente.

   La revisión de Reportes del 23-09-2026 encontró la pestaña Cliente con un donut escrito a mano (24 %, «$616.032 MM»,
   «$1,93 B»), dos series fijas de 2025 —«Mercado vs Security» y la tendencia por zona, con zonas que ni siquiera se
   llamaban como las del activo—, un toggle «Share of Wallet» que le sumaba 18 a un monto en pesos, una lista fija de
   ocho «competidores» con BICE (el tenant) adentro, y un estado de cartera que mandaba a «Solo competencia» a todo el
   que cayera o estuviera 10 pp bajo la meta, así que la «Brecha crítica» de más de 20 pp no podía tener a nadie.

   Lo puro lo prueba el caso 172 (`estadoCartera`, `desviacionSow`, `sowDeCartera`, `seriesCartera`, `pctSerie`,
   `competidoresDeCartera`, `segmentoSowCartera`, `cedeAOtros`). Lo que la suite no puede ver —no monta la app— es que
   las PANTALLAS los usen y que las piezas fijas no vuelvan. Eso se vigila acá, sobre la forma canónica (ADR-0006),
   con una sonda negativa por pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico, tramo } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla76(src) {
  const fallos = [];
  // 1 · Nada fijo: ni las series de 2025, ni la lista de competidores con el tenant adentro.
  // Se busca la DECLARACIÓN a columna 0: el comentario que deja constancia del retiro los nombra, y nombrarlos no es traerlos.
  for (const s of ["PC_COMPETIDORES", "PC_MERCADO", "PC_SECURITY", "PC_ZONA"])
    if (new RegExp(`^(?:const|let|var) ${s}\\b`, "m").test(src)) fallos.push(`vuelve \`${s}\`: la cartera de Reportes se lee del A5/A2 del alcance, no de una serie escrita a mano`);
  // 2 · El estado de la cartera se MIDE en la ventana, con la vara del churn.
  const cat = canonico(tramo(src, "const PC_CLIENTES = (() => {"));
  if (!cat) fallos.push("no encuentro el catálogo `PC_CLIENTES`");
  else {
    if (!cat.includes("estadoCartera(s)")) fallos.push("`PC_CLIENTES` no toma el estado de `estadoCartera`: «Solo competencia» tiene que ser SOW 0 medido");
    if (/act < tgt - 10/.test(cat)) fallos.push("vuelve «10 pp bajo la meta» como criterio de «Solo competencia»: con eso la brecha crítica no puede tener a nadie");
    if (!cat.includes("ventanaSow(s)")) fallos.push("`PC_CLIENTES` no guarda la plata de la ventana (`ventanaSow`): el donut y las series no tendrían de dónde leer");
  }
  // 3 · El panel calcula del alcance, y la pestaña Cliente dibuja lo calculado.
  const panel = canonico(tramo(src, "function PanelClientes("));
  if (!panel) fallos.push("no encuentro `PanelClientes`");
  else {
    if (!panel.includes("sowCartera: sowDeCartera(clientesScope)")) fallos.push("el resumen del panel no calcula el SOW del alcance (`sowDeCartera`)");
    if (!panel.includes("series: seriesCartera(clientesScope, zonas)")) fallos.push("el resumen del panel no arma las series del alcance (`seriesCartera`)");
    if (!panel.includes("segmentoSowCartera(c)")) fallos.push("el filtro «Segmento SOW» no usa `segmentoSowCartera`: bajo la meta manda la tendencia");
  }
  const cli = canonico(tramo(src, "function PCcliente("));
  if (!cli) fallos.push("no encuentro `PCcliente`");
  else {
    if (/<PCdonut pct=\{\d/.test(cli)) fallos.push("el donut vuelve a recibir un porcentaje escrito a mano");
    if (!cli.includes("<PCdonut pct={sw.pct} />")) fallos.push("el donut no recibe el SOW del alcance");
    if (/\$616\.032 MM|\$1,93 B/.test(cli)) fallos.push("vuelven los montos escritos a mano del donut");
    if (!cli.includes("{fmtMMc(sw.propio)}") || !cli.includes("{fmtMMc(sw.ajeno)}")) fallos.push("el donut no nombra la plata propia y la ajena del alcance");
    if (!cli.includes("<PCarea total={se.total} security={se.sec} semanas={se.semanas} />")) fallos.push("«Volumen cedido» no dibuja las series del alcance");
  }
  // 4 · La pestaña SOW: desviación, competidores y tendencia, todos del alcance.
  const sow = canonico(tramo(src, "function PCsow("));
  if (!sow) fallos.push("no encuentro `PCsow`");
  else {
    if (!sow.includes("desviacionSow(clientes)")) fallos.push("la desviación contra la meta no sale de `desviacionSow`");
    if (/c\.target - c\.sow > 20/.test(sow)) fallos.push("la brecha crítica vuelve a filtrarse a mano en la pantalla");
    if (!sow.includes("competidoresDeCartera(clientes,")) fallos.push("«Competidores capturando cartera» no sale del A2 del alcance (`competidoresDeCartera`)");
    if (!sow.includes("seriesCartera(clientes, ZONAS_COMERCIALES)")) fallos.push("la tendencia por zona no sale de las series del alcance");
  }
  const lin = canonico(tramo(src, "function PClineas("));
  if (!lin) fallos.push("no encuentro `PClineas`");
  else {
    if (/18 \+ v/.test(lin)) fallos.push("el toggle «Share of Wallet» vuelve a sumarle 18 a un monto");
    if (!lin.includes("pctSerie(")) fallos.push("el SOW semanal de una zona no se calcula como Security / total cedido (`pctSerie`)");
  }
  // 5 · «Operan con otros» de Clientes: el mismo conjunto que la card del Dashboard (el churn).
  const cv = canonico(tramo(src, "function ClientesView("));
  if (!cv) fallos.push("no encuentro `ClientesView`");
  else if (!cv.includes('fEstado === "competencia" ? cedeAOtros(e)')) fallos.push("el filtro «Operan con otros» de Clientes no cuenta lo que cuenta el Dashboard (`cedeAOtros`)");
  return fallos;
}

test("regla 76: Reportes › Cliente y SOW leen la cartera medida del alcance y no traen piezas fijas", () => {
  assert.deepEqual(auditarRegla76(jsx), []);
});

/* Cada mutante planta UNA violación y el gate tiene que cazarla: un gate verde que no se comprueba en rojo no vigila nada. */
const MUTANTES = [
  ["vuelve una serie fija", (s) => s.replace("const fmtMMc = ", "const PC_MERCADO = [245];\nconst fmtMMc = "), /PC_MERCADO/],
  ["vuelve la lista de competidores", (s) => s.replace("const fmtMMc = ", 'const PC_COMPETIDORES = [{ name: "BICE Factoring" }];\nconst fmtMMc = '), /PC_COMPETIDORES/],
  ["el estado deja de medirse", (s) => s.replace("estadoCartera(s)", "estadoViejo(s)"), /estadoCartera/],
  ["el donut vuelve al 24", (s) => s.replace("<PCdonut pct={sw.pct} />", "<PCdonut pct={24} />"), /escrito a mano/],
  ["el donut pierde la plata", (s) => s.replace("{fmtMMc(sw.ajeno)}", "$1,93 B"), /montos escritos a mano|plata propia/],
  ["la desviación se filtra a mano", (s) => s.replace("desviacionSow(clientes)", "desviacionVieja(clientes)"), /desviacionSow/],
  ["los competidores vuelven a ser fijos", (s) => s.replace("competidoresDeCartera(clientes,", "competidoresFijos(clientes,"), /competidoresDeCartera/],
  ["el toggle vuelve a sumar 18", (s) => s.replace(/pctSerie\(zonas\[k\]\.sec, zonas\[k\]\.total\)/, "zonas[k].sec.map((v) => Math.round(18 + v))"), /18|pctSerie/],
  ["Clientes vuelve a contar el estado", (s) => s.replace(/(fEstado === "competencia"\s*\?\s*)cedeAOtros\(e\)/, '$1e.estado === "Competencia"'), /cedeAOtros/],
];

test("sonda negativa: cada pieza fija o desconectada que vuelve se caza", () => {
  for (const [nombre, mutar, espera] of MUTANTES) {
    const mutado = mutar(jsx);
    assert.notEqual(mutado, jsx, `el mutante «${nombre}» no cambió nada: su ancla ya no está en el fuente`);
    const f = auditarRegla76(mutado);
    assert.ok(f.some((x) => espera.test(x)), `el mutante «${nombre}» no se cazó: ${JSON.stringify(f)}`);
  }
});
