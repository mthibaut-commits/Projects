#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════════════════════════
// MIGRACIÓN DEL A1 A FLUJO DE EVENTOS — de una fila por documento a una fila por notificación
// (ADR-0020, regla 73; 23-09-2026)
//
//   node GeneradorDatos/migrar_dtesync_eventos.js [activo] [--dry]
//
// Reescribe el bloque `DTESYNC` de `datos_inyectados.js`: cada documento pasa a ser su creación
// (`DTE_SINCRONIZADO`, `Secuencia` 1, sin banderas, el día de la emisión) más una actualización
// (`DTE_ACTUALIZADO`) por cada bandera que traía —acuse, reclamo, nota de crédito—, fechada dentro de la
// ventana del negocio y nunca después de la recepción del batch (`lib/dtesync.js`, `expandir`). El log
// queda en orden de llegada. Los demás bloques no se tocan: después hay que correr
// `node GeneradorDatos/generar.js`, que pliega el log y regenera los derivados sobre los mismos
// documentos (deberían salir byte a byte iguales: el pliegue reproduce el documento).
//
// Corre UNA VEZ, como `migrar_padron.js`; queda commiteado para que el cambio sea auditable y repetible.
// Aborta si el bloque ya es un log (alguna fila con `Secuencia`), si el log resultante no valida
// (`validarLog`) o si el pliegue no reproduce cada documento salvo lo que la migración cambia a propósito
// (`diferenciasDeMigracion`): el envoltorio y las fechas de las banderas, que en la entrega original eran
// tres constantes posteriores al corte (todos los acuses el 23-06, las NC el 24-06, los reclamos el 25-06).
// ════════════════════════════════════════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const { leer, escribir, serializar } = require("./lib/archivo");
const { plegar, expandir, validarLog, diferenciasDeMigracion, resumen, clave } = require("./lib/dtesync");

function migrar(documentos) {
  if (documentos.some((r) => r && r.Secuencia != null)) throw new Error("el bloque DTESYNC ya es un flujo de eventos (hay filas con Secuencia): no hay nada que migrar");
  const eventos = expandir(documentos);
  const problemas = validarLog(eventos);
  if (problemas.length) throw new Error("el log no valida:\n  " + problemas.join("\n  "));
  const plegados = new Map(plegar(eventos).map((d) => [clave(d), d]));
  const dif = [];
  for (const d of documentos) {
    if (!d || !d.RUTEmisor) continue;
    const x = diferenciasDeMigracion(d, plegados.get(clave(d)));
    if (x.length && dif.length < 10) dif.push(`${clave(d)}: ${x.join(" · ")}`);
  }
  if (dif.length) throw new Error("el pliegue no reproduce el documento:\n  " + dif.join("\n  "));
  if (plegados.size !== new Set(documentos.filter((d) => d && d.RUTEmisor).map(clave)).size) throw new Error("el pliegue perdió documentos");
  return eventos;
}

module.exports = { migrar };

if (require.main === module) {
  const activo = process.argv.find((a) => a.endsWith(".js") && a !== process.argv[1]) || path.join(__dirname, "..", "datos_inyectados.js");
  const seco = process.argv.includes("--dry");
  console.log("Leyendo  %s", activo);
  const { bloques, orden, datos } = leer(activo);
  const documentos = datos.DTESYNC || [];
  console.log("  DTESYNC: %s documentos (una fila por documento)", documentos.length.toLocaleString("es-CL"));
  let eventos;
  try { eventos = migrar(documentos); } catch (e) { console.error("ABORTA: " + e.message); process.exit(1); }
  const r = resumen(eventos);
  console.log("  → %s eventos: %s creaciones + %s actualizaciones (%s acuses · %s reclamos · %s notas de crédito), del %s al %s",
    r.eventos.toLocaleString("es-CL"), r.creaciones.toLocaleString("es-CL"), r.actualizaciones.toLocaleString("es-CL"),
    r.acuses.toLocaleString("es-CL"), r.reclamos.toLocaleString("es-CL"), r.notasCredito.toLocaleString("es-CL"), r.desde, r.hasta);
  const bloque = serializar("DTESYNC", eventos);
  console.log("  bloque DTESYNC: %s MB → %s MB", (bloques.DTESYNC.length / 1048576).toFixed(1), (bloque.length / 1048576).toFixed(1));
  if (seco) { console.log("(--dry: no se escribió nada)"); process.exit(0); }
  bloques.DTESYNC = bloque;
  escribir(activo, orden, bloques);
  console.log("escrito %s (%s MB). Ahora: node GeneradorDatos/generar.js", activo, (fs.statSync(activo).size / 1048576).toFixed(1));
}
