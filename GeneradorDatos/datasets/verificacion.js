// VERIFICACION — activo A10 (CSV diario por SFTP, dominio VERIFICACION en el upsert intradía A22).
// Una fila por par (RUT_CLIENTE, RUT_DEUDOR); ver el diccionario de campos en
// `Integraciones/spec_sftp_verificacion.md`.
//
// PRINCIPIO: igual que el A16, se generan valores de negocio PLAUSIBLES por perfil y en ningún punto se
// mira un umbral del predictor. Qué porcentaje de facturas termina en verificación telefónica es una
// propiedad EMERGENTE del dato.
//
// Qué se siembra DÓNDE (misma convención que el A16):
//   · del DEUDOR   V01 (protocolo propio) y V10 (lo que le pagó al factoring en 3M, sumando TODOS sus
//                  cedentes) — son suyos y no cambian según con qué cliente opere.
//   · del PAR C-D  V02, V05, V07, V08 y los denominadores de V03/V04/V06 — describen la relación.
//
// Lo que se puede MEDIR no se inventa: el promedio de factura del par y su venta mensual salen del
// volumen real de DTESync, igual que los montos de línea en `lineas.js`.
//
// La NOTA del deudor NO viaja en este activo: es un atributo de la EMPRESA y vive sólo en el A11
// (Plataforma 360). Traerla acá era duplicarla en un tercer archivo.
const { hashStr, pcRng, entre, ent } = require("../lib/rng");

// Ventana de DTESync llevada a un mes, igual que en `lineas.js`.
const DIAS_VENTANA = 47, DIAS_MES = 30;
const CORTE = "2026-06-22";

function generar({ DTESYNC }) {
  // ── Volumen y plazo reales por par: cuántas facturas, por cuánto y a qué plazo ────────────────
  // El plazo histórico de pago sale de las propias facturas (vencimiento menos emisión): es un dato
  // del par que DTESync ya tiene, así que no hay por qué generarlo.
  const par = {};
  for (const d of DTESYNC) {
    if (!d || !d.RUTEmisor || !d.RUTRecep) continue;
    const k = d.RUTEmisor + "|" + d.RUTRecep;
    const p = par[k] || (par[k] = { n: 0, mm: 0, dias: 0, nd: 0 });
    p.n++; p.mm += (+d.MntTotal || 0) / 1e6;
    const e = Date.parse(String(d.FchEmis || "").slice(0, 10)), v = Date.parse(String(d.FchVenc || "").slice(0, 10));
    if (!isNaN(e) && !isNaN(v) && v >= e) { p.dias += (v - e) / 86400000; p.nd++; }
  }

  // Perfil de la relación y del deudor. En una cartera real la mayoría de los pares son sanos.
  const perfil = (clave) => { const x = pcRng(Math.abs(hashStr("vperfil|" + clave)))(); return x < 0.60 ? "sana" : x < 0.87 ? "aislada" : "problematica"; };
  const R = { sana: 0, aislada: 1, problematica: 2 };
  // Rangos de plausibilidad de negocio. Ninguno mira un umbral del predictor.
  const RANGO = {
    pagado:      [[93, 100], [84, 99],  [58, 93]],   // % de la cartera del par que el deudor pagó (Ult3M)
    recurrencia: [[5, 6],    [3, 6],    [0, 4]],     // meses con venta C-D > 0 en los últimos 6
    // Nada acá: el plazo histórico del par se MIDE sobre DTESync (ver `plazoDe`).
    mora25:      [[0, 1.5],  [0.4, 6],  [3.5, 22]],  // % pagado con mora > 25 días
    reclamadas:  [[0, 1.2],  [0.4, 5],  [2.5, 18]],  // % de facturas reclamadas
    // Con qué frecuencia factura el par, en facturas por mes. La ventana del A1 (47 días, ~2 facturas
    // por par, y UNA en el 55% de los pares) es una MUESTRA corta de la relación, no la relación: una
    // sana factura varias veces al mes, una aislada alrededor de una, una problemática de tanto en
    // tanto. Es el mismo perfil que decide la recurrencia (V05), así que las dos cuentan lo mismo. Y
    // nunca por debajo del ritmo que la ventana ya muestra: lo medido no se contradice.
    frecuenciaMes:  [[2.0, 4.5],   [0.8, 2.0],   [0.2, 0.8]],
    // Qué fracción de lo que el par VENDE en 3M termina COMPRADA por Security: una relación sana cede
    // la mayor parte, una problemática poco. Es el denominador de V03.
    fraccionCedida: [[0.55, 0.90], [0.35, 0.70], [0.15, 0.50]],
    // Qué fracción de lo comprado al DEUDOR pagó el deudor en el mismo trimestre. En régimen se paga lo
    // que venció, o sea del orden de lo comprado; un deudor problemático paga una parte.
    coberturaPago:  [[0.85, 1.15], [0.55, 1.00], [0.05, 0.60]],
  };
  const rango = (r, cual, pf, dec) => { const [a, b] = RANGO[cual][R[pf]]; return dec ? +entre(r, a, b).toFixed(1) : ent(r, a, b); };
  const frac = (r, cual, pf) => { const [a, b] = RANGO[cual][R[pf]]; return +entre(r, a, b).toFixed(2); };

  // ── Paso 1 · la relación de cada par: venta mensual y compra en 3M, en M$ ────────────────────
  // Lo MEDIDO: la factura típica del par (total / nº de facturas) y el ritmo que la ventana muestra. Lo
  // MODELADO por perfil: la frecuencia mensual y la fracción cedida. Van con flujos de RNG propios para
  // que las demás variables del par no se muevan al cambiar este modelo.
  const rel = {};
  for (const k of Object.keys(par)) {
    const p = par[k], pfPar = perfil("par|" + k), rRel = pcRng(hashStr("vfRel|" + k));
    const facturaTipica = p.mm / p.n;
    const ritmoVentana = p.n * (DIAS_MES / DIAS_VENTANA);
    const facturasMes = Math.max(ritmoVentana, rango(rRel, "frecuenciaMes", pfPar, 1));
    const ventaMes = facturaTipica * facturasMes;
    const compra3M = ventaMes * 3 * frac(rRel, "fraccionCedida", pfPar);
    rel[k] = { ventaMes, compra3M };
  }
  // ── Paso 2 · lo pagado por cada DEUDOR en 3M, sumando todos sus pares ────────────────────────
  // V10 es del DEUDOR y no del par: la política pide «volumen de pago suficiente para que sus
  // estadísticas sean representativas» y evita el falso positivo del deudor «que operó una sola vez con
  // Security». Un deudor grande con muchos cedentes lo cumple aunque el par evaluado sea chico; uno con
  // un solo cedente pequeño, no. Se siembra por deudor, como V01, y viaja repetido en cada fila del par.
  const compraDeudor3M = {};
  for (const k of Object.keys(par)) { const rd = k.split("|")[1]; compraDeudor3M[rd] = (compraDeudor3M[rd] || 0) + rel[k].compra3M; }
  const pagadoDeudor3M = {};
  for (const rd of Object.keys(compraDeudor3M)) {
    pagadoDeudor3M[rd] = compraDeudor3M[rd] * frac(pcRng(hashStr("vfDeuPago|" + rd)), "coberturaPago", perfil("deu|" + rd));
  }

  const filas = [];
  for (const k of Object.keys(par)) {
    const [rutC, rutD] = k.split("|");
    const p = par[k];
    const pfPar = perfil("par|" + k), pfDeu = perfil("deu|" + rutD);
    const rPar = pcRng(hashStr("vfPar|" + k)), rDeu = pcRng(hashStr("vfDeu|" + rutD));
    // V03 se mide contra el TOTAL comprado al par en 3 meses móviles y V04 contra la venta mensual
    // promedio del par (spec A10): los dos salen de la relación modelada en el paso 1, en MILES.
    const compra3M = Math.round(rel[k].compra3M * 1000);
    const ventaMesM = Math.round(rel[k].ventaMes * 1000);
    filas.push({
      RUT_CLIENTE: rutC, RUT_DEUDOR: rutD,
      // ~9% de los deudores tiene protocolo de verificación propio pactado.
      V01_PROTOCOLO_PROPIO: rDeu() < 0.09 ? 1 : 0,
      V02_PCT_PAGADO_3M: rango(rPar, "pagado", pfPar, 1),
      V03_MNT_COMPRA_3M_M: compra3M,
      V04_VENTA_PROM_3M_M: ventaMesM,
      V05_RECURRENCIA_MESES_6M: rango(rPar, "recurrencia", pfPar),
      // Plazo histórico de pago del par, en días. NEX calcula contra él la DESVIACIÓN del documento
      // que se está evaluando (V06): el archivo no puede traerla porque depende de esa factura.
      V06_PLAZO_PROM_PAGO_DIAS: p.nd ? Math.round(p.dias / p.nd) : 30,
      V07_PCT_MORA_25D: rango(rPar, "mora25", pfPar, 1),
      V08_PCT_RECLAMADAS: rango(rPar, "reclamadas", pfPar, 1),
      // Lo que el DEUDOR le pagó al factoring en 3 meses, sumando todos sus cedentes (paso 2), en MILES.
      V10_MNT_PAGADO_3M_M: Math.round(pagadoDeudor3M[rutD] * 1000),
      FECHA_CORTE: CORTE,
    });
  }
  // Formato COLUMNAR: el origen es un CSV. Ver la nota en `otorgamiento.js`.
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
