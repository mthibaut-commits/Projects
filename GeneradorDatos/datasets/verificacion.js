// VERIFICACION — activo A10 (CSV diario por SFTP, dominio VERIFICACION en el upsert intradía A22).
// Una fila por par (RUT_CLIENTE, RUT_DEUDOR); ver el diccionario de campos en
// `Integraciones/spec_sftp_verificacion.md`.
//
// PRINCIPIO: igual que el A16, se generan valores de negocio PLAUSIBLES por perfil y en ningún punto se
// mira un umbral del predictor. Qué porcentaje de facturas termina en verificación telefónica es una
// propiedad EMERGENTE del dato.
//
// Qué se siembra DÓNDE (misma convención que el A16):
//   · del DEUDOR   V01 (protocolo propio) y V06 (cómo paga respecto de su propio promedio) — son suyos
//                  y no cambian según con qué cliente opere.
//   · del PAR C-D  V02, V05, V07, V08, V10 y los denominadores de V03/V04 — describen la relación.
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
  // ── Volumen real por par: cuántas facturas y por cuánto ───────────────────────────────────────
  const par = {};
  for (const d of DTESYNC) {
    if (!d || !d.RUTEmisor || !d.RUTRecep) continue;
    const k = d.RUTEmisor + "|" + d.RUTRecep;
    const p = par[k] || (par[k] = { n: 0, mm: 0 });
    p.n++; p.mm += (+d.MntTotal || 0) / 1e6;
  }

  // Perfil de la relación y del deudor. En una cartera real la mayoría de los pares son sanos.
  const perfil = (clave) => { const x = pcRng(Math.abs(hashStr("vperfil|" + clave)))(); return x < 0.60 ? "sana" : x < 0.87 ? "aislada" : "problematica"; };
  const R = { sana: 0, aislada: 1, problematica: 2 };
  // Rangos de plausibilidad de negocio. Ninguno mira un umbral del predictor.
  const RANGO = {
    pagado:      [[93, 100], [84, 99],  [58, 93]],   // % de la cartera del par que el deudor pagó (Ult3M)
    recurrencia: [[5, 6],    [3, 6],    [0, 4]],     // meses con venta C-D > 0 en los últimos 6
    difPago:     [[0, 3],    [1, 8],    [4, 20]],    // días entre el vencimiento y su fecha típica de pago
    mora25:      [[0, 1.5],  [0.4, 6],  [3.5, 22]],  // % pagado con mora > 25 días
    reclamadas:  [[0, 1.2],  [0.4, 5],  [2.5, 18]],  // % de facturas reclamadas
    coberturaM:  [[14, 40],  [5, 22],   [0.5, 8]],   // pago Ult3M como múltiplo de la factura típica del par
  };
  const rango = (r, cual, pf, dec) => { const [a, b] = RANGO[cual][R[pf]]; return dec ? +entre(r, a, b).toFixed(1) : ent(r, a, b); };

  const filas = [];
  for (const k of Object.keys(par)) {
    const [rutC, rutD] = k.split("|");
    const p = par[k];
    const pfPar = perfil("par|" + k), pfDeu = perfil("deu|" + rutD);
    const rPar = pcRng(hashStr("vfPar|" + k)), rDeu = pcRng(hashStr("vfDeu|" + rutD));
    // Medido, no inventado: factura típica del par y su venta mensual, en M$.
    const promFacturaM = Math.round(p.mm / p.n * 1000);
    const ventaMesM = Math.round(p.mm * (DIAS_MES / DIAS_VENTANA) * 1000);
    filas.push({
      RUT_CLIENTE: rutC, RUT_DEUDOR: rutD,
      // ~9% de los deudores tiene protocolo de verificación propio pactado.
      V01_PROTOCOLO_PROPIO: rDeu() < 0.09 ? 1 : 0,
      V02_PCT_PAGADO_3M: rango(rPar, "pagado", pfPar, 1),
      PROM_FACTURA_CD_M: promFacturaM,
      VENTA_PROM_CD_L6M_M: ventaMesM,
      V05_RECURRENCIA_MESES_6M: rango(rPar, "recurrencia", pfPar),
      V06_DIF_FECHA_PAGO_DIAS: rango(rDeu, "difPago", pfDeu),
      V07_PCT_MORA_25D: rango(rPar, "mora25", pfPar, 1),
      V08_PCT_RECLAMADAS: rango(rPar, "reclamadas", pfPar, 1),
      // Lo pagado por el deudor en 3 meses, como múltiplo de la factura típica de la relación.
      V10_MNT_PAGADO_3M_M: Math.round(promFacturaM * rango(rPar, "coberturaM", pfPar, 1)),
      FECHA_CORTE: CORTE,
    });
  }
  // Formato COLUMNAR: el origen es un CSV. Ver la nota en `otorgamiento.js`.
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
