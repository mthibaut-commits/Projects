// RIESGO_BICE — activo A9 (API Riesgo Crédito BICE, `riesgo-credito/v1`, 9 endpoints).
// Una fila por RUT de empresa (clientes y deudores).
//
// PRINCIPIO ADICIONAL AL DEL RESTO: este activo SOLAPA con el A16 —mora CMF, mora ACHEF, protestos,
// mora interna son las mismas variables— y antes cada uno traía su propio número, así que una misma
// empresa mostraba una mora en el otorgamiento y otra en la presentación al comité.
//
// Acá se genera SÓLO lo que el A16 no tiene. Lo que solapa NO se duplica: el pipeline lo lee del A16 al
// componer la respuesta de la API. Y lo poco que debe ser coherente con el A16 —el desglose directa /
// indirecta, que debe sumar la deuda total, y el número de protestos, que no puede ser cero si el A16
// trae monto protestado— se deriva de la fila del A16, no de un azar propio.
const { hashStr, pcRng, entre, ent } = require("../lib/rng");

const CORTE = "2026-06-22";

function generar({ DTESYNC, OTORGAMIENTO }) {
  // Fila CLIENTE / DEUDOR del A16 por RUT: de ahí salen la deuda total y el monto protestado.
  const ix = {}, a16 = {};
  if (OTORGAMIENTO && OTORGAMIENTO.campos && OTORGAMIENTO.filas) {
    OTORGAMIENTO.campos.forEach((c, i) => (ix[c] = i));
    for (const f of OTORGAMIENTO.filas) if (!a16[f[ix.RUT]]) a16[f[ix.RUT]] = f;
  }
  const de = (rut, campo) => { const f = a16[rut]; return f ? (+f[ix[campo]] || 0) : 0; };

  const perfil = (rut) => { const x = pcRng(Math.abs(hashStr("rbperfil|" + rut)))(); return x < 0.60 ? "sana" : x < 0.87 ? "aislada" : "problematica"; };
  const R = { sana: 0, aislada: 1, problematica: 2 };
  const RANGO = {
    pctDirecta:   [[55, 92], [45, 88], [35, 82]],   // % de la deuda total que es directa; el resto, indirecta
    leasingUF:    [[0, 900], [0, 2600], [0, 5200]], // leasing vigente, en UF
    achefVigM:    [[8000, 260000], [5000, 180000], [1500, 90000]], // cartera ACHEF vigente (M$)
    achefFac:     [[12, 340], [8, 220], [3, 120]],  // documentos en ACHEF
    boletin:      [[0, 0],  [0, 2],   [1, 6]],      // anotaciones vigentes en el boletín comercial
    previsionalM: [[0, 0],  [0, 3500], [800, 22000]], // deuda previsional (M$)
  };
  const rango = (r, cual, pf, dec) => { const [a, b] = RANGO[cual][R[pf]]; return dec ? +entre(r, a, b).toFixed(1) : ent(r, a, b); };
  // Clasificación deudora de la CMF. Un perfil problemático rara vez califica A.
  const CLASE = { sana: ["A", "A", "A", "B"], aislada: ["A", "B", "B", "C"], problematica: ["B", "C", "C", "C"] };

  const ruts = new Set();
  for (const d of DTESYNC) { if (!d) continue; if (d.RUTEmisor) ruts.add(d.RUTEmisor); if (d.RUTRecep) ruts.add(d.RUTRecep); }

  const filas = [];
  for (const rut of ruts) {
    const pf = perfil(rut), r = pcRng(hashStr("rbice|" + rut));
    // Coherencia con el A16: el desglose reparte la deuda total que YA declara el otro activo.
    const total = de(rut, "CMF_DEUDA_TOTAL");
    const pctDir = rango(r, "pctDirecta", pf);
    const directa = Math.round(total * pctDir / 100);
    // Idem protestos: el A16 trae el MONTO protestado; el número de anotaciones no puede contradecirlo.
    const montoProtesto = de(rut, "EFX_PROTESTOS");
    const protestosN = montoProtesto > 0 ? 1 + ent(r, 0, 3) : 0;
    filas.push({
      RUT: rut,
      CMF_DEUDA_DIRECTA_M: Math.round(directa / 1000),
      CMF_DEUDA_INDIRECTA_M: Math.round((total - directa) / 1000),
      LEASING_UF: rango(r, "leasingUF", pf),
      ACHEF_VIGENTE_M: rango(r, "achefVigM", pf),
      ACHEF_FACTURAS: rango(r, "achefFac", pf),
      BOLETIN_COMERCIAL_N: rango(r, "boletin", pf),
      PROTESTOS_N: protestosN,
      DEUDA_PREVISIONAL_M: rango(r, "previsionalM", pf),
      CLASIFICACION_DEUDORA: CLASE[pf][ent(r, 0, 3)],
      FECHA_CORTE: CORTE,
    });
  }
  const campos = Object.keys(filas[0]);
  return { campos, filas: filas.map((f) => campos.map((c) => f[c])) };
}
module.exports = { generar };
