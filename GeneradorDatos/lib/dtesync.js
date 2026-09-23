// ════════════════════════════════════════════════════════════════════════════════════════════════
// EL A1 ES UN FLUJO DE EVENTOS POR DOCUMENTO (ADR-0020, regla 73; el usuario, 23-09-2026: «los eventos
// de DTESync llegan varias veces para la misma factura: una vez se crea (notifica nueva factura), después
// puede llegar nota de crédito, después aceptación»).
//
// El bloque `DTESYNC` del activo es el LOG de notificaciones del servicio, en orden de llegada: cada fila
// es UNA notificación. La primera de un documento es su creación (`DTE_SINCRONIZADO`, `Secuencia` 1, el
// documento entero, sin banderas); cada cambio posterior de su estado —el acuse del receptor, el reclamo,
// la nota de crédito— llega como `DTE_ACTUALIZADO` con la `Secuencia` siguiente, la identidad del documento
// (`RUTEmisor`, `TipoDTE`, `Folio`) y el `EstadoDTE` ACUMULADO a esa fecha. Una actualización no repite el
// documento: quien quiera «el documento» tiene que PLEGAR sus eventos, y eso se hace en un solo sitio.
//
// Tres funciones, y las tres puras:
//   · `plegar(eventos)`   → los documentos, uno por (RUTEmisor, Folio), con el estado del evento más nuevo.
//                           El orden de llegada no importa: un evento atrasado no pisa uno más nuevo. Salen
//                           ordenados por folio —el orden del libro—, que es el orden que el activo plano tenía.
//   · `expandir(docs)`    → el log a partir de documentos planos (la migración del 23-09-2026): la creación y una
//                           actualización por bandera, fechada dentro de la ventana del negocio.
//   · `validarLog(log)`   → lo que un log tiene que cumplir para que `plegar` signifique algo: creación primero,
//                           secuencias contiguas, fechas que no retroceden ni pasan la recepción del batch, el
//                           log ordenado por fecha de notificación.
// El pipeline pliega con la MISMA función, copiada en el fuente (`plegarDTE`): el gate `regla_73.test.mjs`
// corre las dos sobre el mismo log y exige el mismo resultado.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const { semilla, ent } = require("./rng");

const DIA = 86400000;
const ms = (s) => Date.parse(String(s || "").slice(0, 10) + "T00:00:00Z");
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const clave = (e) => e.RUTEmisor + "|" + e.Folio;
const seq = (e) => +e.Secuencia || 1;
const conAcuse = (est) => est.Aceptado != null && est.Aceptado !== "";
const conReclamo = (est) => est.Reclamado === "1";
const conNC = (est) => est.NotaCredito === "1" || est.NotaCredito === 1;

// Orden del libro: por folio y, a igual folio, por emisor. Es el orden que el activo plano traía (folios
// estrictamente crecientes), así que ningún lector cambia de orden por el pliegue.
const porFolio = (a, b) => +a.Folio - +b.Folio || (a.RUTEmisor < b.RUTEmisor ? -1 : a.RUTEmisor > b.RUTEmisor ? 1 : 0);

function plegar(eventos) {
  const docs = new Map();
  for (const e of eventos || []) {
    if (!e || !e.RUTEmisor || e.Folio == null) continue;
    const k = clave(e);
    const prev = docs.get(k);
    if (!prev) {
      docs.set(k, { ...e });
      continue;
    }
    docs.set(k, seq(e) >= seq(prev) ? { ...prev, ...e } : { ...e, ...prev });
  }
  return [...docs.values()].sort(porFolio);
}

// ── expandir ────────────────────────────────────────────────────────────────────────────────────
// Ventanas del negocio para fechar cada bandera desde la emisión: el receptor tiene 8 días para dar acuse o
// reclamar (SII); una nota de crédito puede llegar bastante después. La fecha es determinista por documento
// y bandera (`semilla`), y nunca pasa de `tope`: la recepción del batch (`FchRecepcion`), porque el archivo
// no puede traer un evento que todavía no ocurrió. La entrega original traía las tres fechas como CONSTANTES
// (todos los acuses el 23-06, todos los reclamos el 25-06, todas las NC el 24-06: después del corte), o sea
// un marcador y no un dato; acá cada evento recibe la suya.
const VENTANA = { acuse: 8, reclamo: 8, nc: 30 };
const ESTADO_VACIO = (est) => ({
  NotaCredito: null, FchNotaCredito: null, FolioNotaCredito: null, TipoDTERef: null, FolioDTERef: null,
  Aceptado: null, Reclamado: null, FchReclamo: null, FchRecepcion: est.FchRecepcion == null ? null : est.FchRecepcion, FchAcuseRecibo: null,
});

function fechaBandera(doc, tipo, tope) {
  const d = ent(semilla("dte-evento|" + tipo + "|" + clave(doc)), 1, VENTANA[tipo]);
  const t = ms(doc.FchEmis) + d * DIA;
  const topeMs = tope ? ms(tope) : Infinity;
  return iso(Math.min(t, Math.max(topeMs, ms(doc.FchEmis) + DIA)));
}

// Inserta `FchNotificacion` y `Secuencia` después de `Notificacion`, conservando el orden de las demás llaves.
function conEnvoltorio(base, notificacion, fecha, secuencia) {
  const out = {};
  let puesto = false;
  for (const [k, v] of Object.entries(base)) {
    if (k === "FchNotificacion" || k === "Secuencia") continue;
    out[k] = k === "Notificacion" ? notificacion : v;
    if (k === "Notificacion") { out.FchNotificacion = fecha; out.Secuencia = secuencia; puesto = true; }
  }
  if (!puesto) { out.Notificacion = notificacion; out.FchNotificacion = fecha; out.Secuencia = secuencia; }
  return out;
}

function expandir(documentos, { tope } = {}) {
  const out = [];
  for (const doc of documentos || []) {
    if (!doc || !doc.RUTEmisor || doc.Folio == null) continue;
    const est = doc.EstadoDTE || {};
    const limite = tope || est.FchRecepcion || null;
    // La creación: el documento entero, sin banderas, el día de su emisión.
    out.push(conEnvoltorio({ ...doc, EstadoDTE: ESTADO_VACIO(est) }, "DTE_SINCRONIZADO", doc.FchEmis, 1));
    // Una actualización por bandera, en el orden de sus fechas, con el estado acumulado.
    const banderas = [];
    if (conAcuse(est)) banderas.push({ tipo: "acuse", fecha: fechaBandera(doc, "acuse", limite) });
    if (conReclamo(est)) banderas.push({ tipo: "reclamo", fecha: fechaBandera(doc, "reclamo", limite) });
    if (conNC(est)) banderas.push({ tipo: "nc", fecha: fechaBandera(doc, "nc", limite) });
    const orden = { acuse: 0, reclamo: 1, nc: 2 };
    banderas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : orden[a.tipo] - orden[b.tipo]));
    let estado = ESTADO_VACIO(est);
    banderas.forEach((b, i) => {
      if (b.tipo === "acuse") estado = { ...estado, Aceptado: est.Aceptado, FchAcuseRecibo: b.fecha };
      if (b.tipo === "reclamo") estado = { ...estado, Reclamado: est.Reclamado, FchReclamo: b.fecha };
      if (b.tipo === "nc") estado = { ...estado, NotaCredito: est.NotaCredito, FchNotaCredito: b.fecha, FolioNotaCredito: est.FolioNotaCredito == null ? null : est.FolioNotaCredito, TipoDTERef: est.TipoDTERef == null ? null : est.TipoDTERef, FolioDTERef: est.FolioDTERef == null ? null : est.FolioDTERef };
      out.push({
        RUTEmisor: doc.RUTEmisor, TipoDTE: doc.TipoDTE == null ? "33" : doc.TipoDTE, Folio: doc.Folio,
        EstadoDTE: estado,
        Servicio: doc.Servicio || "DTESync", Notificacion: "DTE_ACTUALIZADO", FchNotificacion: b.fecha, Secuencia: i + 2,
        Extras: doc.Extras == null ? null : doc.Extras,
      });
    });
  }
  return ordenarLog(out);
}

// El log en orden de llegada: por fecha de notificación y, dentro del día, por folio (el orden del libro) y
// secuencia. La creación de un documento siempre precede a sus actualizaciones porque éstas se fechan
// después de la emisión.
const porLlegada = (a, b) =>
  (a.FchNotificacion < b.FchNotificacion ? -1 : a.FchNotificacion > b.FchNotificacion ? 1 : 0) || porFolio(a, b) || seq(a) - seq(b);
const ordenarLog = (eventos) => [...eventos].sort(porLlegada);

// ── validarLog ──────────────────────────────────────────────────────────────────────────────────
const REQUERIDOS_CREACION = ["RUTEmisor", "RznSoc", "Folio", "FchEmis", "RUTRecep", "RznSocRecep", "MntTotal"];
function validarLog(eventos, { max = 20 } = {}) {
  const fallos = [];
  const f = (s) => { if (fallos.length < max) fallos.push(s); };
  const vistos = new Map(); // clave → { seq, fecha, emision, recepcion }
  let anterior = null;
  (eventos || []).forEach((e, i) => {
    if (!e || !e.RUTEmisor || e.Folio == null) return f(`fila ${i}: sin RUTEmisor o Folio`);
    if (!e.FchNotificacion) f(`fila ${i} (${clave(e)}): sin FchNotificacion`);
    if (!e.Secuencia) f(`fila ${i} (${clave(e)}): sin Secuencia`);
    if (anterior && porLlegada(anterior, e) > 0) f(`fila ${i} (${clave(e)}): el log no está en orden de llegada (fecha, folio, secuencia)`);
    anterior = e;
    const k = clave(e);
    const v = vistos.get(k);
    const est = e.EstadoDTE || {};
    if (!v) {
      if (seq(e) !== 1) f(`fila ${i} (${k}): el primer evento del documento tiene Secuencia ${seq(e)}, no 1`);
      if (e.Notificacion !== "DTE_SINCRONIZADO") f(`fila ${i} (${k}): la creación no es DTE_SINCRONIZADO (${e.Notificacion})`);
      for (const c of REQUERIDOS_CREACION) if (!(c in e)) f(`fila ${i} (${k}): la creación no trae ${c}`);
      if (conAcuse(est) || conReclamo(est) || conNC(est)) f(`fila ${i} (${k}): la creación ya trae banderas`);
      if (e.FchEmis && e.FchNotificacion && e.FchNotificacion < e.FchEmis) f(`fila ${i} (${k}): la creación se notifica antes de la emisión`);
      vistos.set(k, { seq: 1, fecha: e.FchNotificacion, emision: e.FchEmis, recepcion: est.FchRecepcion || null });
      return;
    }
    if (seq(e) !== v.seq + 1) f(`fila ${i} (${k}): Secuencia ${seq(e)} después de ${v.seq}`);
    if (e.Notificacion !== "DTE_ACTUALIZADO") f(`fila ${i} (${k}): la actualización no es DTE_ACTUALIZADO (${e.Notificacion})`);
    if (!e.EstadoDTE) f(`fila ${i} (${k}): la actualización no trae EstadoDTE`);
    if (e.FchNotificacion < v.fecha) f(`fila ${i} (${k}): la fecha retrocede (${e.FchNotificacion} < ${v.fecha})`);
    if (v.emision && e.FchNotificacion <= v.emision) f(`fila ${i} (${k}): la actualización no es posterior a la emisión`);
    if (v.recepcion && e.FchNotificacion > v.recepcion) f(`fila ${i} (${k}): la actualización es posterior a la recepción del batch (${e.FchNotificacion} > ${v.recepcion})`);
    v.seq = seq(e);
    v.fecha = e.FchNotificacion;
  });
  return fallos;
}

// Lo que la migración cambia a propósito y lo que NO puede cambiar: el documento plegado tiene que ser el
// original salvo el envoltorio (`Notificacion`, `FchNotificacion`, `Secuencia`) y las fechas de las banderas,
// que además tienen que quedar entre la emisión y la recepción. Devuelve las diferencias encontradas.
function diferenciasDeMigracion(original, plegado) {
  const out = [];
  if (!plegado) return ["el documento no está en el pliegue"];
  const CAMBIAN = new Set(["Notificacion", "FchNotificacion", "Secuencia", "EstadoDTE"]);
  for (const k of Object.keys(original)) if (!CAMBIAN.has(k) && JSON.stringify(original[k]) !== JSON.stringify(plegado[k])) out.push(`${k}: ${JSON.stringify(original[k])} → ${JSON.stringify(plegado[k])}`);
  for (const k of Object.keys(plegado)) if (!(k in original) && !CAMBIAN.has(k)) out.push(`${k}: no estaba en el original`);
  const eo = original.EstadoDTE || {}, ep = plegado.EstadoDTE || {};
  for (const k of ["NotaCredito", "FolioNotaCredito", "TipoDTERef", "FolioDTERef", "Aceptado", "Reclamado", "FchRecepcion"]) if (JSON.stringify(eo[k] == null ? null : eo[k]) !== JSON.stringify(ep[k] == null ? null : ep[k])) out.push(`EstadoDTE.${k}: ${JSON.stringify(eo[k])} → ${JSON.stringify(ep[k])}`);
  const ventana = (campo, presente) => {
    if (!presente) { if (ep[campo] != null) out.push(`EstadoDTE.${campo} con fecha sin bandera`); return; }
    if (!ep[campo]) return out.push(`EstadoDTE.${campo} sin fecha`);
    if (ep[campo] <= original.FchEmis) out.push(`EstadoDTE.${campo} ${ep[campo]} no es posterior a la emisión ${original.FchEmis}`);
    if (eo.FchRecepcion && ep[campo] > eo.FchRecepcion) out.push(`EstadoDTE.${campo} ${ep[campo]} pasa la recepción ${eo.FchRecepcion}`);
  };
  ventana("FchAcuseRecibo", conAcuse(eo));
  ventana("FchReclamo", conReclamo(eo));
  ventana("FchNotaCredito", conNC(eo));
  const n = 1 + (conAcuse(eo) ? 1 : 0) + (conReclamo(eo) ? 1 : 0) + (conNC(eo) ? 1 : 0);
  if (seq(plegado) !== n) out.push(`Secuencia ${seq(plegado)}, se esperaban ${n} eventos`);
  if (plegado.Notificacion !== (n > 1 ? "DTE_ACTUALIZADO" : "DTE_SINCRONIZADO")) out.push(`Notificacion ${plegado.Notificacion}`);
  return out;
}

// Conteo para la consola y para los documentos: documentos, eventos y actualizaciones por tipo.
function resumen(eventos) {
  const r = { eventos: 0, documentos: 0, creaciones: 0, actualizaciones: 0, acuses: 0, reclamos: 0, notasCredito: 0, desde: "", hasta: "" };
  const docs = new Set();
  let prev = null;
  for (const e of eventos || []) {
    if (!e || !e.RUTEmisor) continue;
    r.eventos++;
    docs.add(clave(e));
    if (seq(e) === 1) r.creaciones++; else r.actualizaciones++;
    const est = e.EstadoDTE || {};
    if (seq(e) > 1) {
      if (conNC(est) && !(prev && prev.k === clave(e) && conNC(prev.est))) r.notasCredito++;
      else if (conReclamo(est) && !(prev && prev.k === clave(e) && conReclamo(prev.est))) r.reclamos++;
      else if (conAcuse(est)) r.acuses++;
    }
    prev = { k: clave(e), est };
    if (e.FchNotificacion) { if (!r.desde || e.FchNotificacion < r.desde) r.desde = e.FchNotificacion; if (e.FchNotificacion > r.hasta) r.hasta = e.FchNotificacion; }
  }
  r.documentos = docs.size;
  return r;
}

module.exports = { plegar, expandir, ordenarLog, validarLog, diferenciasDeMigracion, resumen, clave, VENTANA };
