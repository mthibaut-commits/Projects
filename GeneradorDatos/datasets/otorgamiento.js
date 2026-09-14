// OTORGAMIENTO — activo A16 (CSV diario por SFTP, dominio OTORGAMIENTO en el upsert intradía A22).
// Una fila por (RUT, ROL, RUT_CONTRAPARTE) con ROL ∈ {CLIENTE, DEUDOR}; ver el diccionario de campos en
// `Integraciones/spec_sftp_otorgamiento.md`.
//
// La NOTA DE COMPORTAMIENTO no vive acá: es un atributo de la EMPRESA y vive en el A11 (Plataforma 360),
// que es el activo de información de empresa. Este activo trae su comportamiento de riesgo, no su nota.
//
// PRINCIPIO: se generan valores de negocio PLAUSIBLES por perfil de entidad. En ningún punto se mira un
// umbral de regla. Qué porcentaje de la cartera cae en excepción es una propiedad EMERGENTE del dato,
// nunca un objetivo puesto a mano — si no, los umbrales quedarían duplicados aquí y en el catálogo, y
// moverlos en la política rompería la calibración en silencio.
const { hashStr, pcRng, entre, ent } = require("../lib/rng");
const { perfilEntidad } = require("../lib/perfil");

function generar({ DTESYNC, LISTA_BLANCA, DEUDORES_AUTORIZADOS }) {
  const LB = new Set(LISTA_BLANCA.map((x) => x.RUT)), DA = new Set(DEUDORES_AUTORIZADOS.map((x) => x.RUT));
  // Perfil de la entidad: el MISMO que usa el A11 para la nota de comportamiento (ver `lib/perfil.js`),
  // para que una empresa no salga con nota 4,8 y a la vez castigada en la CMF.
  const perfil = perfilEntidad;
  // Rango por perfil: cómo se ve una empresa sana, una con incidencias aisladas y una con problemas.
  const R = { sana: 0, aislada: 1, problematica: 2 };
  const entre = (r, a, b) => a + r() * (b - a);
  const ent = (r, a, b) => Math.round(entre(r, a, b));
  // Deuda de buró: la mayoría no tiene. Cuando existe, cola larga (log-normal truncada).
  const deuda = (r, p, escalaMM) => (r() < p ? Math.round(escalaMM * 1e6 * Math.pow(r(), 2.2) * 4) : 0);
  const P_DEUDA = { sana: 0, aislada: 0.10, problematica: 0.35 };
  
  // Rangos de comportamiento comercial, en % — plausibilidad de negocio, sin mirar umbrales.
  const RANGO = {
    concentracion: [[10, 40], [20, 58], [38, 88]],   // % de venta en un solo deudor
    cruzada:       [[0, 12],  [4, 34],  [18, 72]],   // % de compra al mismo deudor
    notaCredito:   [[0, 3],   [1, 11],  [5, 38]],    // % de facturas anuladas o rebajadas
    reclamo:       [[0, 2],   [1, 7],   [3, 24]],    // % de facturas reclamadas
    ratioCesion:   [[5, 38],  [18, 62], [44, 92]],   // % de la venta cedida a factoring
    factoringPeq:  [[0, 22],  [8, 42],  [28, 68]],   // % cedido a factorings pequeños
    nroFactorings: [[1, 3],   [2, 5],   [4, 10]],    // cantidad de factorings con los que opera
  };
  const rango = (r, cual, pf, dec) => { const [a, b] = RANGO[cual][R[pf]]; return dec ? +entre(r, a, b).toFixed(1) : ent(r, a, b); };
  
  const CORTE = "2026-06-22";
  function filaCliente(rut, pf, r) {
    const pd = P_DEUDA[pf], total = Math.round(entre(r, 40, 220) * 1e6);
    const totalInt = Math.round(entre(r, 35, 190) * 1e6);
    return {
      RUT: rut, ROL: "CLIENTE", RUT_CONTRAPARTE: "",
      PAGARE_FIRMADO: pf === "sana" ? 1 : (r() < (pf === "aislada" ? 0.9 : 0.7) ? 1 : 0),
      MNT_PAGARES_M: Math.round(entre(r, 120000, 900000)),
      FCH_VCTO_PAGARE: pf === "sana" || r() < 0.85 ? "2027-06-30" : "2026-08-15",
      IVA_ULT_PERIODO: pf === "sana" || r() < 0.88 ? "202606" : "202603",
      LINEA_APROBADA_MM: 0, LINEA_EXTENDIDA: pf === "problematica" && r() < 0.25 ? 1 : 0,
      VAR_VENTA_MENSUAL_PCT: pf === "sana" ? ent(r, -12, 28) : pf === "aislada" ? ent(r, -26, 18) : ent(r, -52, 8),
      CMF_DIR_MOROSA_30_90: deuda(r, pd, 14), CMF_DIR_MOROSA_90_180: deuda(r, pd * 0.5, 12),
      CMF_DIR_MOROSA_180_3A: deuda(r, pd * 0.35, 10), CMF_DIR_CASTIGADA: deuda(r, pd * 0.3, 9),
      CMF_IND_VENCIDA: deuda(r, pd * 0.45, 12), CMF_IND_CASTIGADA: deuda(r, pd * 0.3, 10),
      CMF_LEASING_MOROSA: deuda(r, pd * 0.7, 13), CMF_DEUDA_TOTAL: total,
      EFX_DEUDA_MOROSA: deuda(r, pd, 9), EFX_PROTESTOS: deuda(r, pd * 0.8, 8),
      ACHEF_MOROSA_60_90: deuda(r, pd * 0.7, 45), ACHEF_MOROSA_90_180: deuda(r, pd * 0.45, 45),
      ACHEF_MOROSA_MAS_180: deuda(r, pd * 0.25, 35), INFRACCIONES_LABORALES_12M: deuda(r, pd * 0.6, 40),
      MORA_INTERNA_MAS_25D: deuda(r, pd, 4), MORA_INTERNA_30_90: deuda(r, pd * 0.7, 14),
      MORA_INTERNA_90_180: deuda(r, pd * 0.4, 12), MORA_INTERNA_180_3A: deuda(r, pd * 0.25, 9),
      DEUDA_INTERNA_TOTAL: totalInt,
      TGR_VIGENTE: deuda(r, pd * 0.6, 5), TGR_MOROSA: deuda(r, pd * 0.4, 5), TGR_COBRANZA_ADM: deuda(r, pd * 0.3, 4),
      TGR_COBRANZA_JUD: deuda(r, pd * 0.12, 4), TGR_CONVENIOS: deuda(r, pd * 0.18, 4), TGR_CONVENIOS_CUOTAS_IMPAGAS: deuda(r, pd * 0.1, 3),
      CONCENTRACION_VENTA_PCT: rango(r, "concentracion", pf), VENTA_CRUZADA_PCT: rango(r, "cruzada", pf, 1),
      NOTA_CREDITO_PCT: rango(r, "notaCredito", pf, 1), RECLAMO_PCT: rango(r, "reclamo", pf, 1),
      VENTA_CRUZADA_CD_PCT: 0, NOTA_CREDITO_CD_PCT: 0, RECLAMO_CD_PCT: 0,
      RATIO_CESION_VENTA_PCT: rango(r, "ratioCesion", pf), NRO_FACTORINGS_LM: rango(r, "nroFactorings", pf),
      FACTORING_PEQUENO_PCT: rango(r, "factoringPeq", pf),
      CARTERA_RECLAMADA: deuda(r, pd, 8), CARTERA_NC: deuda(r, pd * 0.8, 7),
      CARTERA_MOROSA: deuda(r, pd, 9), CXC_PENDIENTES: deuda(r, pd * 1.1, 7),
      SOCIOS_COMUNES_CD: 0, CLIENTE_BLOQUEADO: pf === "problematica" && r() < 0.12 ? 1 : 0,
      JUICIOS_GESINTEL: pf === "sana" ? 0 : (r() < 0.3 ? 1 + Math.floor(r() * 3) : 0), FECHA_CORTE: CORTE,
    };
  }
  function filaDeudor(rutD, rutC, pf, pfPar, r, rPar) {
    const pd = P_DEUDA[pf], total = Math.round(entre(r, 60, 420) * 1e6), totalInt = Math.round(entre(r, 30, 180) * 1e6);
    return {
      RUT: rutD, ROL: "DEUDOR", RUT_CONTRAPARTE: rutC,
      PAGARE_FIRMADO: 0, MNT_PAGARES_M: 0, FCH_VCTO_PAGARE: "", IVA_ULT_PERIODO: "",
      LINEA_APROBADA_MM: 0, LINEA_EXTENDIDA: 0, VAR_VENTA_MENSUAL_PCT: 0,
      CMF_DIR_MOROSA_30_90: deuda(r, pd, 14), CMF_DIR_MOROSA_90_180: deuda(r, pd * 0.5, 12),
      CMF_DIR_MOROSA_180_3A: deuda(r, pd * 0.35, 10), CMF_DIR_CASTIGADA: deuda(r, pd * 0.3, 9),
      CMF_IND_VENCIDA: deuda(r, pd * 0.45, 12), CMF_IND_CASTIGADA: deuda(r, pd * 0.3, 10),
      CMF_LEASING_MOROSA: deuda(r, pd * 0.7, 13), CMF_DEUDA_TOTAL: total,
      EFX_DEUDA_MOROSA: deuda(r, pd, 9), EFX_PROTESTOS: 0,
      ACHEF_MOROSA_60_90: deuda(r, pd * 0.7, 45), ACHEF_MOROSA_90_180: deuda(r, pd * 0.45, 45),
      ACHEF_MOROSA_MAS_180: deuda(r, pd * 0.25, 35), INFRACCIONES_LABORALES_12M: deuda(r, pd * 0.6, 40),
      MORA_INTERNA_MAS_25D: deuda(r, pd, 4), MORA_INTERNA_30_90: deuda(r, pd * 0.7, 14),
      MORA_INTERNA_90_180: deuda(r, pd * 0.4, 12), MORA_INTERNA_180_3A: deuda(r, pd * 0.25, 9),
      DEUDA_INTERNA_TOTAL: totalInt,
      TGR_VIGENTE: 0, TGR_MOROSA: 0, TGR_COBRANZA_ADM: 0, TGR_COBRANZA_JUD: 0, TGR_CONVENIOS: 0, TGR_CONVENIOS_CUOTAS_IMPAGAS: 0,
      CONCENTRACION_VENTA_PCT: 0, VENTA_CRUZADA_PCT: 0,
      NOTA_CREDITO_PCT: rango(r, "notaCredito", pf, 1), RECLAMO_PCT: rango(r, "reclamo", pf, 1),
      VENTA_CRUZADA_CD_PCT: rango(rPar, "cruzada", pfPar, 1), NOTA_CREDITO_CD_PCT: rango(rPar, "notaCredito", pfPar, 1),
      RECLAMO_CD_PCT: rango(rPar, "reclamo", pfPar, 1),
      RATIO_CESION_VENTA_PCT: 0, NRO_FACTORINGS_LM: 0, FACTORING_PEQUENO_PCT: 0,
      CARTERA_RECLAMADA: 0, CARTERA_NC: 0, CARTERA_MOROSA: 0, CXC_PENDIENTES: 0,
      SOCIOS_COMUNES_CD: pfPar === "problematica" && rPar() < 0.10 ? 1 : 0,
      CLIENTE_BLOQUEADO: 0, JUICIOS_GESINTEL: 0, FECHA_CORTE: CORTE,
    };
  }
  const emisores = new Set(), pares = new Set();
  for (const d of DTESYNC) {
    if (!d || !d.RUTEmisor) continue;
    emisores.add(d.RUTEmisor);
    if (d.RUTRecep) pares.add(d.RUTEmisor + "|" + d.RUTRecep);
  }
  const filas = [];
  for (const rut of emisores) filas.push(filaCliente(rut, perfil(rut), pcRng(hashStr("otCli|" + rut))));
  for (const par of pares) {
    const [rutC, rutD] = par.split("|");
    // Las variables del DEUDOR (nota, buró, mora interna) se siembran por DEUDOR: son suyas y no cambian
    // según con qué cliente opere. Sólo las del par C-D (*_CD y socios comunes) se siembran por par.
    filas.push(filaDeudor(rutD, rutC, perfil("deu|" + rutD), perfil("par|" + par),
      pcRng(hashStr("otDeu|" + rutD)), pcRng(hashStr("otPar|" + par))));
  }
  // Formato COLUMNAR: el origen es un CSV (una cabecera + filas). Repetir los 54 nombres de campo en cada
  // una de las 16.000 filas cuesta ~19 MB de puras llaves; así son ~3 MB y la forma es la del contrato.
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
