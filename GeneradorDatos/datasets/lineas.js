// LINEA_DISPONIBLE — activo A7 (CSV diario por SFTP) + A8 (API de montos).
// Una fila por (RUTCliente, TipoLinea) con TipoLinea ∈ {Lista Blanca, Deudores Autorizados}.
// Los campos ESTRUCTURALES (ejecutivo, segmento, % financiamiento, % uso, estado, fechas) se conservan
// del maestro de origen; los MONTOS se derivan del volumen real de facturas a crédito del cedente hacia
// deudores de esa clase, llevado a un mes y multiplicado por el SOWTargetPct, que es la porción que la
// factoring espera financiar.
const { semilla } = require("../lib/rng");
const DIAS_VENTANA = 47;   // DTESYNC cubre 2026-05-06 → 2026-06-22
const DIAS_MES = 30;

function generar({ DTESYNC, SHARE_OF_WALLET, LINEA_DISPONIBLE, LISTA_BLANCA, DEUDORES_AUTORIZADOS }) {
  const LB = new Set(LISTA_BLANCA.map((x) => x.RUT)), DA = new Set(DEUDORES_AUTORIZADOS.map((x) => x.RUT));
  const clase = (rut) => (LB.has(rut) ? "Lista Blanca" : DA.has(rut) ? "Deudores Autorizados" : "Otro");
  const vol = {};
  for (const r of DTESYNC) {
    if (!r || !r.RUTEmisor || !(r.FormaPago === "2" || r.FormaPago === 2)) continue;
    const v = (vol[r.RUTEmisor] = vol[r.RUTEmisor] || { "Lista Blanca": 0, "Deudores Autorizados": 0, Otro: 0 });
    v[clase(r.RUTRecep)] += (+r.MntTotal || 0) / 1e6;
  }
  const sow = {}; for (const s of SHARE_OF_WALLET) sow[s.RUTCliente] = s;
  const red = (x) => (x <= 0 ? 0 : Math.max(5, Math.round(x / 5) * 5));
  return LINEA_DISPONIBLE.map((fila) => {
    const v = vol[fila.RUTCliente], s = sow[fila.RUTCliente];
    if (!v || !s) return fila;
    const objetivo = (+s.SOWTargetPct || 60) / 100;
    const aprobado = red((v[fila.TipoLinea] || 0) * (DIAS_MES / DIAS_VENTANA) * objetivo);
    const pctUso = +fila.PctUso || 0;
    const utilizado = +(aprobado * pctUso / 100).toFixed(1);
    const f = (+fila.MontoAprobadoMM > 0) ? aprobado / (+fila.MontoAprobadoMM) : 0;
    return { ...fila,
      MontoAprobadoMM: aprobado,
      MontoUtilizadoMM: utilizado,
      MontoDisponibleMM: +(aprobado - utilizado).toFixed(1),
      LiberadoUlt24hMM: +((+fila.LiberadoUlt24hMM || 0) * f).toFixed(1),
      CursadoUlt24hMM: +((+fila.CursadoUlt24hMM || 0) * f).toFixed(1),
    };
  });
}
module.exports = { generar };
