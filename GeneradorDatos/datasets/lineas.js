// LINEA_DISPONIBLE — activo A7 (CSV diario por SFTP) + A8 (API de montos).
// Una fila por (RUTCliente, TipoLinea) con TipoLinea ∈ {Lista Blanca, Deudores Autorizados}.
// Los campos ESTRUCTURALES (ejecutivo, segmento, % financiamiento, % uso, estado, fechas) se conservan
// del maestro de origen; los MONTOS se derivan del volumen real de facturas a crédito del cedente hacia
// deudores de esa clase, llevado a un mes y multiplicado por el SOWTargetPct, que es la porción que la
// factoring espera financiar.
//
// TODOS LOS MONTOS VAN EN PESOS. El millón es una abreviatura de PANTALLA, no una unidad de dato: en
// millones con un decimal, el cupo de una línea se cuantiza de a $100.000 y lo utilizado deja de
// cuadrar contra la suma de las facturas cedidas, que sí son pesos exactos.
// El cupo que aprueba el comité puede ser CUALQUIER monto; típicamente es una cifra redonda, pero no
// necesariamente. Se modela así —la mayoría en tramos de $5.000.000, el resto al peso exacto— para
// que nada aguas abajo pueda asumir que un cupo es redondo. Lo UTILIZADO, que sale de facturas
// reales, es siempre exacto al peso.
const { semilla } = require("../lib/rng");
const DIAS_VENTANA = 47;   // DTESYNC cubre 2026-05-06 → 2026-06-22
const DIAS_MES = 30;
const TRAMO_CUPO = 5e6;    // el tramo habitual en que se otorga un cupo
const PCT_REDONDO = 0.82;  // proporción de líneas cuyo cupo quedó en una cifra redonda

function generar({ DTESYNC, SHARE_OF_WALLET, LINEA_DISPONIBLE, LISTA_BLANCA, DEUDORES_AUTORIZADOS }) {
  const LB = new Set(LISTA_BLANCA.map((x) => x.RUT)), DA = new Set(DEUDORES_AUTORIZADOS.map((x) => x.RUT));
  const clase = (rut) => (LB.has(rut) ? "Lista Blanca" : DA.has(rut) ? "Deudores Autorizados" : "Otro");
  const vol = {};
  for (const r of DTESYNC) {
    if (!r || !r.RUTEmisor || !(r.FormaPago === "2" || r.FormaPago === 2)) continue;
    const v = (vol[r.RUTEmisor] = vol[r.RUTEmisor] || { "Lista Blanca": 0, "Deudores Autorizados": 0, Otro: 0 });
    v[clase(r.RUTRecep)] += +r.MntTotal || 0;                       // pesos, sin dividir
  }
  const sow = {}; for (const s of SHARE_OF_WALLET) sow[s.RUTCliente] = s;
  const cupo = (x, clave) => {
    if (x <= 0) return 0;
    const r = semilla("cupo|" + clave);
    if (r() < PCT_REDONDO) return Math.max(TRAMO_CUPO, Math.round(x / TRAMO_CUPO) * TRAMO_CUPO);
    return Math.max(1, Math.round(x));   // el comité aprobó el monto pedido, sin redondear
  };
  return LINEA_DISPONIBLE.map((fila) => {
    const v = vol[fila.RUTCliente], s = sow[fila.RUTCliente];
    if (!v || !s) return fila;
    const objetivo = (+s.SOWTargetPct || 60) / 100;
    const aprobado = cupo((v[fila.TipoLinea] || 0) * (DIAS_MES / DIAS_VENTANA) * objetivo, fila.RUTCliente + "|" + fila.TipoLinea);
    const pctUso = +fila.PctUso || 0;
    const utilizado = Math.round(aprobado * pctUso / 100);
    // Los movimientos de las últimas 24 h se conservan como PROPORCIÓN del cupo, no reescalando el
    // valor anterior: así el generador es idempotente y no depende de en qué unidad venía el origen.
    const prevAp = +fila.MontoAprobadoMM || +fila.MontoAprobado || 0;
    const rel = (k) => { const v = +fila[k + "MM"] || +fila[k] || 0; return prevAp > 0 ? v / prevAp : 0; };
    const relLib = rel("LiberadoUlt24h"), relCur = rel("CursadoUlt24h");
    const del = { ...fila };
    for (const k of ["MontoAprobadoMM", "MontoUtilizadoMM", "MontoDisponibleMM", "LiberadoUlt24hMM", "CursadoUlt24hMM"]) delete del[k];
    return { ...del,
      MontoAprobado: aprobado,
      MontoUtilizado: utilizado,
      MontoDisponible: aprobado - utilizado,
      LiberadoUlt24h: Math.round(aprobado * relLib),
      CursadoUlt24h: Math.round(aprobado * relCur),
    };
  });
}
module.exports = { generar };
