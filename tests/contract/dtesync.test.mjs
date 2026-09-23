/* El A1 (`DTESYNC` en `datos_inyectados.js`) es un FLUJO DE EVENTOS por documento (ADR-0020, regla 73): una fila por
   notificación —la creación con el documento entero y sin banderas, y después cada cambio de estado con la identidad y
   el `EstadoDTE` acumulado—. Este gate fija lo que el bloque commiteado tiene que cumplir para que plegarlo signifique
   algo, y prueba `GeneradorDatos/lib/dtesync.js` sobre logs plantados: `plegar` (el evento más nuevo manda cualquiera
   sea el orden), `expandir` + `migrar` (el pliegue reproduce el documento salvo el envoltorio y las fechas de las
   banderas) y `validarLog` (creación primero, secuencias contiguas, fechas que no retroceden ni pasan la recepción).

   Dos clases: los tests sobre el activo son REGLA (no se actualizan); los de las funciones traen su sonda negativa.
   Cuesta lo que cuesta leer el activo (~3 s), una sola vez y compartido con generador.test.mjs por el cache del módulo. */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { RAIZ } from "./_comun.mjs";

const require = createRequire(import.meta.url);
const { leer } = require(join(RAIZ, "GeneradorDatos/lib/archivo.js"));
const { plegar, expandir, ordenarLog, validarLog, diferenciasDeMigracion, resumen, clave } = require(join(RAIZ, "GeneradorDatos/lib/dtesync.js"));
const { migrar } = require(join(RAIZ, "GeneradorDatos/migrar_dtesync_eventos.js"));

let cache = null;
const cargar = () => cache || (cache = leer(join(RAIZ, "datos_inyectados.js")));

/* Un documento plano como los traía la entrega original: el estado final en la misma fila. */
const ESTADO = (est = {}) => ({ NotaCredito: null, FchNotaCredito: null, FolioNotaCredito: null, TipoDTERef: null, FolioDTERef: null, Aceptado: null, Reclamado: null, FchReclamo: null, FchRecepcion: "2026-06-23", FchAcuseRecibo: null, ...est });
const doc = (folio, emis, est) => ({
  RUTEmisor: "76.000.001-3", RznSoc: "Cedente Uno", TipoDTE: "33", TipoDTEDesc: "Factura electronica", Folio: folio, FchEmis: emis, FchVenc: "2026-08-01",
  RUTRecep: "96.000.002-K", RznSocRecep: "Deudor Dos", MntTotal: 1234567, EnlaceXml: "x", EnlacePdf: "p", FormaPago: "2", EmitidoRecibido: 1, Origen: "sii",
  EstadoDTE: ESTADO(est), Servicio: "DTESync", Notificacion: "DTE_SINCRONIZADO", Extras: null,
});
const DOCS = () => [
  doc(101, "2026-06-10", { Aceptado: "2", FchAcuseRecibo: "2026-06-23" }),
  doc(102, "2026-06-20", { NotaCredito: "1", FchNotaCredito: "2026-06-24", FolioNotaCredito: 500102 }),
  doc(103, "2026-06-22", { Reclamado: "1", FchReclamo: "2026-06-25" }),
  doc(104, "2026-06-21"),
];

test("el bloque DTESYNC commiteado es un log válido: creación primero, secuencias contiguas, fechas dentro de la ventana, en orden de llegada, y trae actualizaciones", () => {
  const { datos } = cargar();
  assert.deepEqual(validarLog(datos.DTESYNC), []);
  const r = resumen(datos.DTESYNC);
  assert.ok(r.actualizaciones > 0 && r.documentos < r.eventos, "el log no trae actualizaciones: volvió a ser una fila por documento");
  assert.equal(plegar(datos.DTESYNC).length, r.documentos, "el pliegue no deja un documento por (emisor, folio)");
});

test("una actualización no repite el documento: trae la identidad, el envoltorio y el EstadoDTE acumulado; la creación trae el documento entero", () => {
  const { datos } = cargar();
  const PERMITIDAS = new Set(["RUTEmisor", "TipoDTE", "Folio", "EstadoDTE", "Servicio", "Notificacion", "FchNotificacion", "Secuencia", "Extras"]);
  let malas = 0, creacionesIncompletas = 0;
  for (const e of datos.DTESYNC) {
    if ((+e.Secuencia || 1) > 1) { if (Object.keys(e).some((k) => !PERMITIDAS.has(k)) || !e.EstadoDTE) malas++; }
    else if (!("RznSoc" in e) || !("MntTotal" in e) || !("RznSocRecep" in e)) creacionesIncompletas++;
  }
  assert.equal(malas, 0, "hay actualizaciones que repiten campos del documento o no traen EstadoDTE");
  assert.equal(creacionesIncompletas, 0, "hay creaciones sin el documento entero");
});

test("plegar: el evento más nuevo manda cualquiera sea el orden de llegada, el atrasado sólo completa, la fila plana se pliega a sí misma y los documentos salen por folio", () => {
  const log = expandir(DOCS());
  const a = plegar(log), b = plegar([...log].reverse());
  assert.equal(JSON.stringify(a), JSON.stringify(b), "el orden de llegada cambió el pliegue");
  assert.deepEqual(a.map((d) => d.Folio), [101, 102, 103, 104]);
  assert.equal(a[0].EstadoDTE.Aceptado, "2");
  assert.equal(a[1].EstadoDTE.NotaCredito, "1");
  assert.equal(a[2].EstadoDTE.Reclamado, "1");
  assert.equal(a[3].Secuencia, 1);
  assert.equal(a[0].RznSoc, "Cedente Uno", "el documento perdió los campos de la creación");
  assert.equal(Object.keys(a[0])[1], "RznSoc", "el pliegue cambió el orden de las llaves del documento");
  const plano = doc(105, "2026-06-01", { Aceptado: "2", FchAcuseRecibo: "2026-06-05" });
  assert.deepEqual(plegar([plano]), [plano], "una fila sin Secuencia es un documento y se pliega a sí misma");
  assert.deepEqual(plegar([]), []);
  assert.deepEqual(plegar([null, {}, { RUTEmisor: "1-9" }]), [], "filas sin identidad no producen documentos");
});

test("expandir + migrar: una creación sin banderas el día de la emisión, una actualización por bandera fechada entre la emisión y la recepción, y el pliegue reproduce el documento", () => {
  const docs = DOCS();
  const log = migrar(docs);
  assert.deepEqual(validarLog(log), []);
  assert.equal(log.length, 4 + 3, "cuatro creaciones y tres actualizaciones");
  assert.equal(JSON.stringify(log), JSON.stringify(ordenarLog(log)), "el log no sale en orden de llegada");
  const plegados = new Map(plegar(log).map((d) => [clave(d), d]));
  for (const d of docs) assert.deepEqual(diferenciasDeMigracion(d, plegados.get(clave(d))), [], "documento " + d.Folio);
  const creacion = log.find((e) => e.Folio === 102 && e.Secuencia === 1), act = log.find((e) => e.Folio === 102 && e.Secuencia === 2);
  assert.equal(creacion.FchNotificacion, "2026-06-20");
  assert.equal(creacion.EstadoDTE.NotaCredito, null, "la creación ya trae la bandera");
  assert.ok(act.FchNotificacion > "2026-06-20" && act.FchNotificacion <= "2026-06-23", "la NC no quedó entre la emisión y la recepción: " + act.FchNotificacion);
  assert.equal(act.EstadoDTE.FolioNotaCredito, 500102);
  assert.ok(!("RznSoc" in act), "la actualización repite el documento");
  // Determinista: la misma entrada, el mismo log.
  assert.equal(JSON.stringify(migrar(DOCS())), JSON.stringify(log));
  // Y no migra dos veces.
  assert.throws(() => migrar(log), /ya es un flujo de eventos/);
});

test("sonda negativa: validarLog caza la actualización antes de la creación, la secuencia saltada, la fecha que retrocede o pasa la recepción, la creación con banderas y el log desordenado", () => {
  const log = expandir(DOCS());
  const con = (f) => { const l = log.map((e) => ({ ...e, EstadoDTE: { ...e.EstadoDTE } })); f(l); return validarLog(l); };
  const i101 = log.findIndex((e) => e.Folio === 101 && e.Secuencia === 2);
  assert.ok(con((l) => { const [x] = l.splice(i101, 1); l.unshift(x); }).some((m) => /no está en orden|Secuencia 2, no 1/.test(m)), "actualización antes de la creación");
  assert.ok(con((l) => { l[i101].Secuencia = 3; }).some((m) => /Secuencia 3 después de 1/.test(m)), "secuencia saltada");
  assert.ok(con((l) => { l[i101].FchNotificacion = "2026-06-09"; }).some((m) => /retrocede|no es posterior|no está en orden/.test(m)), "fecha que retrocede");
  assert.ok(con((l) => { l[i101].FchNotificacion = "2026-07-01"; }).some((m) => /posterior a la recepción/.test(m)), "fecha que pasa la recepción");
  assert.ok(con((l) => { l.find((e) => e.Folio === 104).EstadoDTE.Aceptado = "2"; }).some((m) => /ya trae banderas/.test(m)), "creación con banderas");
  assert.ok(con((l) => { l.reverse(); }).some((m) => /no está en orden/.test(m)), "log desordenado");
  assert.ok(con((l) => { delete l[i101].EstadoDTE; }).some((m) => /no trae EstadoDTE/.test(m)), "actualización sin estado");
  assert.deepEqual(con(() => {}), [], "el log intacto tiene que validar");
});

test("sonda negativa: diferenciasDeMigracion caza un monto cambiado, una bandera perdida, una fecha fuera de ventana y una secuencia de menos", () => {
  const d = DOCS()[1];
  const bien = plegar(expandir([d]))[0];
  assert.deepEqual(diferenciasDeMigracion(d, bien), []);
  assert.ok(diferenciasDeMigracion(d, { ...bien, MntTotal: 1 }).some((m) => /^MntTotal/.test(m)));
  assert.ok(diferenciasDeMigracion(d, { ...bien, EstadoDTE: { ...bien.EstadoDTE, NotaCredito: null } }).some((m) => /EstadoDTE\.NotaCredito/.test(m)));
  assert.ok(diferenciasDeMigracion(d, { ...bien, EstadoDTE: { ...bien.EstadoDTE, FchNotaCredito: "2026-06-19" } }).some((m) => /no es posterior a la emisión/.test(m)));
  assert.ok(diferenciasDeMigracion(d, { ...bien, EstadoDTE: { ...bien.EstadoDTE, FchNotaCredito: "2026-06-30" } }).some((m) => /pasa la recepción/.test(m)));
  assert.ok(diferenciasDeMigracion(d, { ...bien, Secuencia: 1 }).some((m) => /Secuencia 1, se esperaban 2/.test(m)));
  assert.ok(diferenciasDeMigracion(d, null).length > 0);
});
