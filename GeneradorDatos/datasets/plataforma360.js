// PLATAFORMA360 — activo A11 (CSV diario por SFTP, dominio PLATAFORMA360 en el upsert intradía A22).
// Una fila por (RUT, ROL) con ROL ∈ {CLIENTE, DEUDOR}; ver `Integraciones/spec_sftp_plataforma360.md`.
// Alimenta la presentación al comité (pasos 1, 2 y 4) y la generación IA de las notas comerciales.
//
// Lo que se puede MEDIR no se inventa:
//   · razón social y ventas          → DTESync (lo que la empresa emitió, anualizado)
//   · colocación y tasa de la última
//     operación                      → AECSync (lo que efectivamente nos cedió)
//   · segmento y sub-segmento        → SHARE_OF_WALLET
//   · mix de financiamiento (SOW)    → SHARE_OF_WALLET (participación de Security sobre el factoring)
//                                      + AECSync (cómo se reparte el resto entre factorings)
// Lo que no está en ningún activo —firmográfica, índices financieros, socios— se genera por perfil con
// rangos de plausibilidad de negocio, igual que el A16.
const { hashStr, pcRng, entre, ent } = require("../lib/rng");
const { perfilEntidad } = require("../lib/perfil");

const DIAS_VENTANA = 47, DIAS_ANIO = 365, CORTE = "2026-06-22";
// Fecha de enrolamiento: determinista por RUT, y nunca posterior a la primera operación del cliente.
function ingreso(rut, primeraOp) {
  const y = 2024 + (Math.abs(hashStr("fi|" + rut)) % 2);
  const m = 1 + (Math.abs(hashStr("fi2|" + rut)) % 9);
  const d = 10 + (Math.abs(hashStr("fi3|" + rut)) % 9);
  const f = `${y}-0${m}-${d}`;
  return (primeraOp && f > primeraOp) ? primeraOp : f;
}
const BICE_RUT = "97.080.000-0";
// El padrón de cesionarios dice de qué TIPO es cada uno: nuestro, banco target, otro banco, o
// factoring no bancario. Es lo que convierte una lista de cesiones en un mix de financiamiento.
const { porcionDe } = require("../lib/cesionarios");

const ACTIVIDADES = [
  ["VENTA AL POR MAYOR DE OTROS PRODUCTOS N.C.P.", "COMERCIO"],
  ["CONSTRUCCIÓN DE OBRAS MENORES", "CONSTRUCCIÓN"],
  ["TRANSPORTE DE CARGA POR CARRETERA", "TRANSPORTE"],
  ["ELABORACIÓN DE PRODUCTOS ALIMENTICIOS", "INDUSTRIA DE ALIMENTOS"],
  ["SERVICIOS DE INGENIERÍA Y ACTIVIDADES CONEXAS", "SERVICIOS"],
  ["CULTIVO DE FRUTAS Y HORTALIZAS", "AGRÍCOLA"],
  ["FABRICACIÓN DE PRODUCTOS METÁLICOS", "INDUSTRIA METALMECÁNICA"],
];
const NOMBRES_SOCIO = ["MARCELA LILIANA MARÍN GONZÁLEZ", "JORGE ANDRÉS SOTO PÉREZ", "CAROLINA PAZ FUENTES RÍOS",
  "RODRIGO ESTEBAN NAVARRO SILVA", "PATRICIA ELENA ROJAS CONTRERAS", "SEBASTIÁN IGNACIO MUÑOZ TAPIA"];

// El mix de financiamiento de un cliente, en cuatro porciones que suman 100.
//
// **TODA cesión es factoring**: un banco que compra una factura está haciendo factoring. Así que el
// universo que AECSync registra —bancarias y no bancarias— es el financiamiento por cesión del
// cliente, y las cuatro porciones lo parten por QUIÉN se lo lleva.
//
// De dónde sale cada mitad de la respuesta, que ya no es de dos activos distintos: desde el
// 15-09-2026 **A5 se deriva de A2**, así que la participación propia y el reparto del resto se miden
// sobre el MISMO registro y no pueden contradecirse. Se ancla igual al `SOWActualPct` del A5 porque
// es la cifra que el resto del sistema ya consume —el descuento por SOW del pricing, el
// dimensionamiento de líneas, el churn— y recalcularla acá la dejaría con dos valores en dos
// pantallas por un redondeo.
//
// Los CUATRO AGREGADOS se publican con el padrón por DEFECTO, pero quién es «factoring target» es
// política comercial del TENANT y se edita en la aplicación: lo que manda es `SOW_DETALLE_JSON` —el
// reparto cesionario por cesionario, que es la medición— y el consumidor reagrupa con su propia
// configuración. Por eso el detalle no es un adorno del tooltip: es el dato.
//
// Un cedente **sin cesiones** no tiene mix, y eso se devuelve vacío y no en cero: nunca cedió, así
// que no hay con qué medir con quién se financia. Cuatro ceros afirmarían «no se financia con nadie»,
// que el activo no dice. Es la misma distinción que la nota de comportamiento: vacío es *no hay dato*.
const SIN_MIX = { SOW_SECURITY_PCT: "", SOW_FACTORING_TARGET_PCT: "", SOW_OTROS_FACTORING_PCT: "", SOW_OTROS_BANCARIOS_PCT: "", SOW_DETALLE_JSON: "" };
function mixFinanciero(g, s) {
  if (!g || !(g.total > 0)) return SIN_MIX;
  const medido = g.security / g.total * 100;
  const sec = Math.max(0, Math.min(100, s ? (+s.SOWActualPct || 0) : medido));
  const ajeno = g.factoringTarget + g.otrosBancarios + g.otrosFactoring;
  const resto = 100 - sec;

  // Se reparte el 100 UNA sola vez, cesionario por cesionario, y las cuatro porciones se AGREGAN
  // desde ese detalle. Al revés —porciones primero, detalle después— las dos cifras se redondean por
  // separado y el tooltip termina diciendo 21,9 donde el chip dice 22: el detalle de un número tiene
  // que sumar ese número, o no es su detalle.
  const detalle = [];
  for (const e of g.porCesionario.values()) {
    const esNuestro = e.porcion === "security";
    const pct = esNuestro ? sec : (ajeno > 0 ? e.monto / ajeno * resto : 0);
    if (pct <= 0) continue;
    detalle.push({ rut: e.rut, nombre: e.nombre, porcion: e.porcion, pct: Math.round(pct * 10) / 10 });
  }
  detalle.sort((a, b) => b.pct - a.pct);
  // El redondeo a un decimal deja hasta unas décimas de diferencia, y cuatro chips que suman 99,8 se
  // leen como un dato mal calculado. El ajuste va al cesionario MAYOR, que siempre puede absorberlo
  // (mismo criterio que el prorrateo por factura).
  if (detalle.length) {
    const suma = detalle.reduce((a, b) => a + b.pct, 0);
    detalle[0].pct = Math.round((detalle[0].pct + (100 - suma)) * 10) / 10;
  }
  const por = (q) => Math.round(detalle.filter((d) => d.porcion === q).reduce((a, b) => a + b.pct, 0) * 10) / 10;
  return {
    SOW_SECURITY_PCT: por("security"),
    SOW_FACTORING_TARGET_PCT: por("factoringTarget"),
    SOW_OTROS_FACTORING_PCT: por("otrosFactoring"),
    SOW_OTROS_BANCARIOS_PCT: por("otrosBancarios"),
    SOW_DETALLE_JSON: JSON.stringify(detalle),
  };
}
function generar({ DTESYNC, AECSYNC, SHARE_OF_WALLET }) {
  // ── Medido: volumen emitido y recibido por RUT ────────────────────────────────────────────────
  const emis = {}, recep = {}, razon = {};
  for (const d of DTESYNC) {
    if (!d) continue;
    if (d.RUTEmisor) { const g = emis[d.RUTEmisor] || (emis[d.RUTEmisor] = { pesos: 0, n: 0 }); g.pesos += +d.MntTotal || 0; g.n++; razon[d.RUTEmisor] = razon[d.RUTEmisor] || d.RznSoc; }
    if (d.RUTRecep) { const g = recep[d.RUTRecep] || (recep[d.RUTRecep] = { pesos: 0, n: 0 }); g.pesos += +d.MntTotal || 0; g.n++; razon[d.RUTRecep] = razon[d.RUTRecep] || d.RznSocRecep; }
  }
  // ── Medido: lo que cada cedente nos cedió a NOSOTROS (colocación real) ────────────────────────
  // Se guardan las DOS puntas de la historia: la PRIMERA cesión (cuándo empezó a operar con nosotros)
  // y la última. El fold llevaba sólo el máximo y lo escribía en `FECHA_PRIMERA_OPERACION`, así que el
  // campo decía «primera» y traía la última — una empresa que nos cede hace dos años figuraba como
  // cliente estrenado el mes pasado, que es justo al revés de lo que el campo sirve para decidir.
  const coloc = {};
  for (const a of (AECSYNC || [])) {
    if (!a || !a.RUTEmisor || a.RUTFactoring !== BICE_RUT) continue;
    const g = coloc[a.RUTEmisor] || (coloc[a.RUTEmisor] = { pesos: 0, n: 0, primera: "", ultima: "" });
    g.pesos += +a.MontoCesion || 0; g.n++;
    const f = (a.FechaCesion || "").slice(0, 10); if (!f) continue;
    if (f > g.ultima) g.ultima = f;
    if (!g.primera || f < g.primera) g.primera = f;
  }
  const sow = {};
  for (const s of (SHARE_OF_WALLET || [])) if (s && s.RUTCliente) sow[s.RUTCliente] = s;

  // ── Medido: EL MIX DE FINANCIAMIENTO, sobre AECSync ──────────────────────────────────────────
  // AECSync registra TODAS las cesiones del cliente —bancarias y no bancarias— e identifica en cada
  // una al cesionario, así que con quién se financia y en qué proporción **se mide**, no se supone.
  // Se reparte por MONTO CEDIDO, que es la plata, y no por número de cesiones, que contaría igual un
  // documento de $2 millones y uno de $200.
  const mix = {};
  let cesionariosDesconocidos = 0;
  for (const a of (AECSYNC || [])) {
    if (!a || !a.RUTEmisor) continue;
    const g = mix[a.RUTEmisor] || (mix[a.RUTEmisor] = { security: 0, factoringTarget: 0, otrosBancarios: 0, otrosFactoring: 0, total: 0, porCesionario: new Map() });
    const { porcion, conocido } = porcionDe(a.RUTFactoring);
    if (!conocido) cesionariosDesconocidos++;
    const m = +a.MontoCesion || 0;
    g[porcion] += m; g.total += m;
    // El desglose POR CESIONARIO: es lo que el tooltip del chip muestra —razón social y %—, y lo que
    // convierte «Otros bancarios · 22%» en una respuesta. Se guarda acá y no se recalcula aguas abajo
    // porque el reparto se ancla al A5 y hay que repartir el mismo 100 una sola vez.
    const k = a.RUTFactoring || "";
    const e = g.porCesionario.get(k) || { rut: k, nombre: a.RazonSocialFactoring || "Cesionario sin nombre", porcion, monto: 0 };
    e.monto += m; g.porCesionario.set(k, e);
  }

  // Mismo perfil que usa el A16 para la deuda de buró (ver `lib/perfil.js`): la nota y el comportamiento
  // de riesgo de una empresa tienen que contar la misma historia.
  const perfil = perfilEntidad;
  const R = { sana: 0, aislada: 1, problematica: 2 };
  const RANGO = {
    trabajadores: [[25, 320], [12, 160], [5, 70]],
    leverage:     [[0.6, 1.9], [1.4, 3.2], [2.6, 6.5]],
    pasExGen:     [[1.2, 3.4], [2.8, 5.6], [4.5, 9.5]],
    margenPct:    [[3.5, 9.0], [1.8, 5.5], [0.3, 3.0]],   // margen de contribución sobre venta
    spreadReal:   [[0.9, 1.6], [1.1, 1.9], [1.4, 2.4]],   // % mensual
  };
  const rango = (r, cual, pf, dec) => { const [a, b] = RANGO[cual][R[pf]]; return dec ? +entre(r, a, b).toFixed(dec === true ? 1 : dec) : ent(r, a, b); };

  const ruts = new Set([...Object.keys(emis), ...Object.keys(recep)]);
  const filas = [];
  for (const rut of ruts) {
    const esCliente = !!emis[rut];
    const rol = esCliente ? "CLIENTE" : "DEUDOR";
    const pf = perfil(rut), r = pcRng(hashStr("p360f|" + rut));
    const [actividad, sector] = ACTIVIDADES[Math.abs(hashStr("act|" + rut)) % ACTIVIDADES.length];
    // Ventas SII: lo EMITIDO en la ventana de DTESync, anualizado. Las declaradas por el cliente son las
    // del SII con la desviación típica de una declaración propia.
    const vAnual = Math.round((emis[rut] ? emis[rut].pesos : (recep[rut] ? recep[rut].pesos : 0)) * (DIAS_ANIO / DIAS_VENTANA));
    const sii = [Math.round(vAnual * entre(r, 0.82, 0.95)), Math.round(vAnual * entre(r, 0.9, 1.0)), vAnual];
    const dec = sii.map((v) => Math.round(v * entre(r, 0.93, 1.02)));
    const c = coloc[rut] || null, s = sow[rut] || null;
    const margenPct = rango(r, "margenPct", pf, true);
    const socios = [];
    const nS = 1 + (Math.abs(hashStr("nsoc|" + rut)) % 3);
    let resto = 100;
    for (let i = 0; i < nS; i++) {
      const part = i === nS - 1 ? resto : Math.max(5, Math.round(resto * entre(r, 0.35, 0.8)));
      resto -= part;
      const h = Math.abs(hashStr("soc|" + rut + "|" + i));
      socios.push({ rut: `${9000000 + (h % 8999999)}-${"0123456789K"[h % 11]}`, nombre: NOMBRES_SOCIO[h % NOMBRES_SOCIO.length],
        participacion: part, pep: r() < 0.04 ? "Sí" : "No", fatca: r() < 0.03 ? "Sí" : "No" });
    }
    filas.push({
      RUT: rut, RAZON_SOCIAL: razon[rut] || "", ROL: rol,
      // NOTA DE COMPORTAMIENTO 1–5 (5 = mejor pagador). Único activo que la trae: es de la EMPRESA, y la
      // consultan tanto el otorgamiento (C09 para el cliente, D01 para el deudor) como el predictor.
      NOTA_COMPORTAMIENTO: +(pf === "sana" ? entre(r, 4.0, 5.0) : pf === "aislada" ? entre(r, 3.4, 4.6) : entre(r, 1.8, 4.0)).toFixed(1),
      ACTIVIDAD_ECONOMICA: actividad, SECTOR: sector,
      NUM_TRABAJADORES: rango(r, "trabajadores", pf),
      // Enrolarse es ANTES de operar: el ingreso se genera (no está en ningún activo) pero acotado a
      // que no sea posterior a la primera cesión, o el archivo describiría un cliente que operó antes
      // de existir. Con cesiones reconciliadas contra el A1 esto ya se puede comprobar.
      FECHA_INGRESO: ingreso(rut, c && c.primera),
      FECHA_PRIMERA_OPERACION: (c && c.primera) || "",
      CLIENTE_BANCO: r() < 0.32 ? "SI" : "NO", ALERTAS: pf === "ajustada" && r() < 0.35 ? "SI" : "NO",
      SEGMENTO: s ? s.Segmento : (esCliente ? "Base" : ""),
      SUB_SEGMENTO: s ? (s.Segmento === "Top" ? "Grandes" : s.Segmento === "Medio" ? "Medianas Grandes" : "Medianas") : "",
      QUINTIL: s ? (s.Segmento === "Top" ? 5 : s.Segmento === "Medio" ? 3 : 2) : "",
      MARGEN_ULT_MES: Math.round(vAnual / 12 * margenPct / 100),
      MARGEN_12M: Math.round(vAnual * margenPct / 100),
      COLOC_PROM_12M: c ? Math.round(c.pesos / 12) : 0,
      // ── MIX DE FINANCIAMIENTO DEL CLIENTE («SOW» en el tablero comercial) ─────────────────────
      // Cuatro porcentajes que suman 100: cuánto de su financiamiento toma de nosotros, de los
      // factorings de banco, del resto de los factorings, y cuánto NO es factoring sino crédito
      // bancario. Vive en el A11 porque es el ÚNICO activo que ve más allá del factoring: AECSync
      // sólo registra cesiones y el A5 sólo mide participación DENTRO del factoring. La cuarta
      // porción es justamente la que ningún otro activo puede responder.
      // NO contradice al A5, que es el maestro de la participación sobre factoring (§5 del
      // levantamiento): las tres porciones de factoring, renormalizadas sobre su subtotal,
      // reproducen `SOWActualPct`. Lo que el A11 agrega es el denominador más ancho.
      ...mixFinanciero(mix[rut], s),
      // Pricing histórico: NO está en ningún activo —una cesión traspasa el crédito, no el precio al
      // que se compró—, así que se genera por perfil. La cesión sólo decide si el campo APLICA: un
      // cliente que nunca nos cedió no tiene tasa de última operación.
      SPREAD_REAL_12M_PCT: c ? rango(r, "spreadReal", pf, 2) : "",
      TASA_ULT_OP_PCT: c ? +(rango(r, "spreadReal", pf, 2) + 0.58).toFixed(2) : "",
      COMISION_ULT_OP: c ? ent(r, 120000, 480000) : "",
      PAS_EXIGIBLE_GEN_BRUTA: rango(r, "pasExGen", pf, 2),
      PATRIMONIO: Math.round(vAnual * entre(r, 0.15, 0.65)),
      GENERACION: Math.round(vAnual * margenPct / 100 * entre(r, 0.6, 1.1)),
      LEVERAGE: rango(r, "leverage", pf, true),
      VENTAS_A1: dec[0], VENTAS_A2: dec[1], VENTAS_A3: dec[2],
      VENTAS_SII_A1: sii[0], VENTAS_SII_A2: sii[1], VENTAS_SII_A3: sii[2],
      SOCIOS_JSON: JSON.stringify(socios),
      FECHA_CORTE: CORTE,
    });
  }
  // Un cesionario que el padrón no declara cayó en «otros factoring» sin que nadie lo decidiera, así
  // que se GRITA: es un padrón desactualizado, y en silencio se ve igual que un dato correcto.
  if (cesionariosDesconocidos > 0) {
    console.warn(`  ⚠  PLATAFORMA360: ${cesionariosDesconocidos} cesiones con un cesionario que \`lib/cesionarios.js\` no declara.`);
  }
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
