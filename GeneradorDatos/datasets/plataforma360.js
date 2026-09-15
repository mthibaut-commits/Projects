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
// FACTORING TARGET: los factorings de BANCO, que son la competencia que Security mira de frente
// («factoring target (BCI/Chile/Itaú)» en el tablero de churn). El resto es «otros factoring».
// La lista se DECLARA y se compara por TOKEN completo, igual que en `pipeline_comercial.jsx` —las dos
// tienen que decir lo mismo—: buscar trozos de la razón social clasificaba **Eurocapital como
// factoring de banco**, porque «eurocap·ita·l» contiene el «ita» con que se buscaba «Itaú».
const FACTORING_TARGET = ["bci", "banchile", "banco de chile", "itau"];
const sinTildes = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const RX_FACT_TARGET = new RegExp("(^|\\s)(" + FACTORING_TARGET.join("|") + ")(\\s|$)");
const esFactoringBanco = (n) => RX_FACT_TARGET.test(sinTildes(n));
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
//  · La participación de Security SOBRE EL FACTORING la manda el A5 (`SOWActualPct`): es su maestro.
//  · El resto del factoring se reparte entre «factoring target» y «otros factoring» con la proporción
//    MEDIDA en AECSync. Sin cesiones registradas se reparte por perfil, y se dice.
//  · La porción BANCARIA no-factoring no está en ningún activo —ni AECSync ni el A5 la ven— así que
//    se genera por perfil: una empresa sana se financia más con banco y menos con factoring.
// Un DEUDOR no cede facturas, así que no tiene mix: los campos van vacíos en vez de en cero, que se
// leería como «se financia 0% con nosotros» en vez de «esta pregunta no le aplica».
function mixFinanciero(rut, s, rep, r, pf) {
  if (!s) return { SOW_SECURITY_PCT: "", SOW_FACTORING_TARGET_PCT: "", SOW_OTROS_FACTORING_PCT: "", SOW_OTROS_BANCARIOS_PCT: "" };
  const sowFact = Math.max(0, Math.min(100, +s.SOWActualPct || 0));   // del A5: % del factoring que es nuestro
  const resto = 100 - sowFact;
  // Cómo se parte el resto entre factorings de banco y el resto, medido cuando hay con qué.
  const ajenos = rep ? rep.target + rep.otros : 0;
  const pTarget = ajenos > 0 ? rep.target / ajenos : entre(r, 0.35, 0.65);
  // Cuánto de su financiamiento NO es factoring. Por perfil: la empresa sana accede a banco.
  const banc = pf === "sana" ? entre(r, 0.18, 0.34) : pf === "aislada" ? entre(r, 0.10, 0.24) : entre(r, 0.03, 0.14);
  const f = 1 - banc;                                                  // lo que sí es factoring
  const pct = [sowFact * f, resto * pTarget * f, resto * (1 - pTarget) * f, banc * 100].map((x) => Math.round(x * 10) / 10);
  // Los cuatro tienen que sumar 100 exacto: el redondeo a un decimal deja hasta 0,2 de diferencia y
  // cuatro chips que suman 99,8 se leen como un dato mal calculado. El ajuste va a la porción MAYOR,
  // que siempre puede absorberlo (mismo criterio que el prorrateo por factura).
  const i = pct.indexOf(Math.max(...pct));
  pct[i] = Math.round((pct[i] + (100 - pct.reduce((a, b) => a + b, 0))) * 10) / 10;
  return { SOW_SECURITY_PCT: pct[0], SOW_FACTORING_TARGET_PCT: pct[1], SOW_OTROS_FACTORING_PCT: pct[2], SOW_OTROS_BANCARIOS_PCT: pct[3] };
}
function generar({ DTESYNC, AECSYNC, SHARE_OF_WALLET }) {
  // ── Medido: volumen emitido y recibido por RUT ────────────────────────────────────────────────
  const emis = {}, recep = {}, razon = {};
  for (const d of DTESYNC) {
    if (!d) continue;
    if (d.RUTEmisor) { const g = emis[d.RUTEmisor] || (emis[d.RUTEmisor] = { mm: 0, n: 0 }); g.mm += (+d.MntTotal || 0) / 1e6; g.n++; razon[d.RUTEmisor] = razon[d.RUTEmisor] || d.RznSoc; }
    if (d.RUTRecep) { const g = recep[d.RUTRecep] || (recep[d.RUTRecep] = { mm: 0, n: 0 }); g.mm += (+d.MntTotal || 0) / 1e6; g.n++; razon[d.RUTRecep] = razon[d.RUTRecep] || d.RznSocRecep; }
  }
  // ── Medido: lo que cada cedente nos cedió a NOSOTROS (colocación real) ────────────────────────
  // Se guardan las DOS puntas de la historia: la PRIMERA cesión (cuándo empezó a operar con nosotros)
  // y la última. El fold llevaba sólo el máximo y lo escribía en `FECHA_PRIMERA_OPERACION`, así que el
  // campo decía «primera» y traía la última — una empresa que nos cede hace dos años figuraba como
  // cliente estrenado el mes pasado, que es justo al revés de lo que el campo sirve para decidir.
  const coloc = {};
  for (const a of (AECSYNC || [])) {
    if (!a || !a.RUTEmisor || a.RUTFactoring !== BICE_RUT) continue;
    const g = coloc[a.RUTEmisor] || (coloc[a.RUTEmisor] = { mm: 0, n: 0, primera: "", ultima: "" });
    g.mm += (+a.MontoCesion || 0) / 1e6; g.n++;
    const f = (a.FechaCesion || "").slice(0, 10); if (!f) continue;
    if (f > g.ultima) g.ultima = f;
    if (!g.primera || f < g.primera) g.primera = f;
  }
  const sow = {};
  for (const s of (SHARE_OF_WALLET || [])) if (s && s.RUTCliente) sow[s.RUTCliente] = s;

  // ── Medido: cómo se reparte entre FACTORINGS lo que el cliente cede ───────────────────────────
  // De AECSync, que desde el 14-09-2026 reconcilia con el A1 —cada cesión apunta a un documento real—,
  // así que estas proporciones se pueden medir en vez de suponerse.
  const repFact = {};
  for (const a of (AECSYNC || [])) {
    if (!a || !a.RUTEmisor) continue;
    const g = repFact[a.RUTEmisor] || (repFact[a.RUTEmisor] = { nuestro: 0, target: 0, otros: 0 });
    const m = +a.MontoCesion || 0;
    if (a.RUTFactoring === BICE_RUT) g.nuestro += m;
    else if (esFactoringBanco(a.RazonSocialFactoring)) g.target += m;
    else g.otros += m;
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
    const vAnualM = Math.round((emis[rut] ? emis[rut].mm : (recep[rut] ? recep[rut].mm : 0)) * (DIAS_ANIO / DIAS_VENTANA) * 1000);
    const sii = [Math.round(vAnualM * entre(r, 0.82, 0.95)), Math.round(vAnualM * entre(r, 0.9, 1.0)), vAnualM];
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
      MARGEN_ULT_MES_M: Math.round(vAnualM / 12 * margenPct / 100),
      MARGEN_12M_M: Math.round(vAnualM * margenPct / 100),
      COLOC_PROM_12M_M: c ? Math.round(c.mm * 1000 / 12) : 0,
      // ── MIX DE FINANCIAMIENTO DEL CLIENTE («SOW» en el tablero comercial) ─────────────────────
      // Cuatro porcentajes que suman 100: cuánto de su financiamiento toma de nosotros, de los
      // factorings de banco, del resto de los factorings, y cuánto NO es factoring sino crédito
      // bancario. Vive en el A11 porque es el ÚNICO activo que ve más allá del factoring: AECSync
      // sólo registra cesiones y el A5 sólo mide participación DENTRO del factoring. La cuarta
      // porción es justamente la que ningún otro activo puede responder.
      // NO contradice al A5, que es el maestro de la participación sobre factoring (§5 del
      // levantamiento): las tres porciones de factoring, renormalizadas sobre su subtotal,
      // reproducen `SOWActualPct`. Lo que el A11 agrega es el denominador más ancho.
      ...mixFinanciero(rut, s, repFact[rut], r, pf),
      // Pricing histórico: NO está en ningún activo —una cesión traspasa el crédito, no el precio al
      // que se compró—, así que se genera por perfil. La cesión sólo decide si el campo APLICA: un
      // cliente que nunca nos cedió no tiene tasa de última operación.
      SPREAD_REAL_12M_PCT: c ? rango(r, "spreadReal", pf, 2) : "",
      TASA_ULT_OP_PCT: c ? +(rango(r, "spreadReal", pf, 2) + 0.58).toFixed(2) : "",
      COMISION_ULT_OP_M: c ? ent(r, 120, 480) : "",
      PAS_EXIGIBLE_GEN_BRUTA: rango(r, "pasExGen", pf, 2),
      PATRIMONIO_M: Math.round(vAnualM * entre(r, 0.15, 0.65)),
      GENERACION_M: Math.round(vAnualM * margenPct / 100 * entre(r, 0.6, 1.1)),
      LEVERAGE: rango(r, "leverage", pf, true),
      VENTAS_A1_M: dec[0], VENTAS_A2_M: dec[1], VENTAS_A3_M: dec[2],
      VENTAS_SII_A1_M: sii[0], VENTAS_SII_A2_M: sii[1], VENTAS_SII_A3_M: sii[2],
      SOCIOS_JSON: JSON.stringify(socios),
      FECHA_CORTE: CORTE,
    });
  }
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
