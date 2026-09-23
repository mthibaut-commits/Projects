#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════════════════════════
// GENERADOR DE DATOS DE ENTRADA — NEX Factoring
//
// Produce `datos_inyectados.js`, el archivo que el build embebe ANTES del bundle y que define los
// activos de información que el pipeline consume. El pipeline NO genera datos: los lee y los procesa.
// Todo lo que la aplicación necesite saber del negocio tiene que salir de acá.
//
//   node GeneradorDatos/generar.js [ruta-entrada] [ruta-salida] [--solo=BLOQUE[,BLOQUE]]
//   (por defecto lee y escribe `datos_inyectados.js` en la raíz del repo)
//   `--solo` regenera únicamente esos derivados y conserva los demás tal como vienen en la entrada:
//   sirve para probar un módulo en aislamiento. No hace falta para proteger a los otros bloques: una
//   corrida completa reproduce el archivo commiteado byte a byte (abajo).
//
// Datasets BASE — rescatados del build original, se copian sin tocar:
//   DTESYNC · LISTA_BLANCA · DEUDORES_AUTORIZADOS · SHARE_OF_WALLET (su ficha) · ESTRATEGIA_PRECIO
//
// DTESYNC es un FLUJO DE EVENTOS por documento (ADR-0020, regla 70): una fila por notificación —la
// creación y después cada cambio de estado—. Los derivados trabajan sobre DOCUMENTOS, así que `derivar`
// pliega el log UNA vez (`lib/dtesync.js`, `plegar`) y a cada módulo le entrega los documentos en
// `DTESYNC`; ningún módulo vuelve a recorrer el log. La migración del 23-09-2026 fue
// `migrar_dtesync_eventos.js`, que corre una sola vez.
//
// Datasets DERIVADOS — se regeneran en cada corrida a partir de los base, en este orden:
//   AECSYNC           activo A2        · cesiones electrónicas, cada una sobre un documento REAL del A1; el
//                                        cesionario se sortea con la intención de `lib/intencion_sow.js`
//   SHARE_OF_WALLET   activo A5        · la participación MEDIDA sobre AECSYNC (serie semanal, en pesos);
//                                        la ficha (target, segmento, horizonte) se conserva de la entrada
//   LINEA_DISPONIBLE  activo A7 + A8   · líneas de crédito por cliente y tipo (fotografía de cartera)
//   LINEA_CUPO        activo A23 (1-2) · la ESTRUCTURA de líneas: una fila por objeto de línea
//                                        (LF1/LF2/LF3/LF4) más la cabecera del cliente
//   LINEA_DEUDOR      activo A23 (3)   · exposición global del RUT deudor, compartida entre carteras
//   PLATAFORMA360     activo A11       · información de empresa por RUT (firmográfica, comercial, socios)
//   OTORGAMIENTO      activo A16       · variables de riesgo de cliente, deudor y par cliente-deudor
//   VERIFICACION      activo A10       · variables del predictor de verificación por par cliente-deudor
//   RIESGO_BICE       activo A9        · lo que la API de Riesgo BICE devuelve y el A16 NO trae
//   CARTERA           activo A24       · estructura comercial y asignación de cada cliente a su ejecutivo
//
// Se generan EN ORDEN y cada uno queda visible para los siguientes: VERIFICACION lee la nota del deudor
// del OTORGAMIENTO recién generado, para que los dos activos no puedan divergir.
//
// La generación es DETERMINISTA y tiene PUNTO FIJO: dos corridas sobre la misma entrada producen el
// mismo archivo, y una corrida sobre `datos_inyectados.js` lo reproduce byte a byte. Un derivado toma de
// su propia entrega anterior sólo lo que CONSERVA (la ficha del A5, los campos estructurales de las
// líneas), nunca lo que mide; lo que necesita y no se mide vive declarado (`lib/intencion_sow.js`,
// `lib/cesionarios.js`). El gate `tests/contract/generador.test.mjs` corre esta cadena en proceso y
// exige que cada bloque derivado salga igual al commiteado.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const path = require("path");
const { leer, escribir, serializar } = require("./lib/archivo");
const { plegar } = require("./lib/dtesync");
const lineas = require("./datasets/lineas");
const lineasPar = require("./datasets/lineas_par");
const shareOfWallet = require("./datasets/share_of_wallet");
const otorgamiento = require("./datasets/otorgamiento");
const verificacion = require("./datasets/verificacion");
const riesgoBice = require("./datasets/riesgo_bice");
const plataforma360 = require("./datasets/plataforma360");
const cartera = require("./datasets/cartera");
const cesiones = require("./datasets/cesiones");

const DERIVADOS = [
  // AECSYNC va PRIMERO: SHARE_OF_WALLET y PLATAFORMA360 miden sobre él, así que las cesiones tienen que
  // estar reconciliadas con el A1 antes de que nadie las lea.
  ["AECSYNC", cesiones],
  ["SHARE_OF_WALLET", shareOfWallet],
  ["LINEA_DISPONIBLE", lineas],
  // Los dos niveles del A23 van DESPUÉS del A7/A8, que es su insumo estructural: de ahí salen el corte
  // por categoría de deudor y el estado «Suspendida», y de ahí el cupo asignado al cliente.
  ["LINEA_CUPO", lineasPar.cupo],
  ["LINEA_DEUDOR", lineasPar.deudor],
  ["PLATAFORMA360", plataforma360],
  ["OTORGAMIENTO", otorgamiento],
  ["VERIFICACION", verificacion],
  ["RIESGO_BICE", riesgoBice],
  ["CARTERA", cartera],
];

// Corre la cadena sobre `datos` (los bloques ya evaluados, por nombre) y devuelve los derivados que
// generó. MUTA `datos` a propósito: cada derivado queda visible para los siguientes. `solo` limita qué se
// regenera; `log` recibe una línea por bloque. Es lo que el gate de contrato ejecuta en proceso.
function derivar(datos, { solo = null, log = () => {} } = {}) {
  const out = {};
  // El log del A1 se pliega acá y una sola vez: cada módulo recibe los DOCUMENTOS en `DTESYNC` (y los
  // derivados anteriores, porque `datos` se muta a medida que se generan).
  const documentos = plegar(datos.DTESYNC);
  log(`  DTESYNC: ${(datos.DTESYNC || []).length} eventos → ${documentos.length} documentos`);
  for (const [nombre, modulo] of DERIVADOS) {
    if (solo && !solo.has(nombre)) { log(`  ${nombre.padEnd(22)}: se conserva de la entrada`); continue; }
    const valor = modulo.generar({ ...datos, DTESYNC: documentos });
    datos[nombre] = valor;
    out[nombre] = valor;
    const n = Array.isArray(valor) ? valor.length : (valor && valor.filas ? valor.filas.length : 0);
    log(`  ${nombre.padEnd(22)}: ${n} filas`);
  }
  return out;
}

function main() {
  const raiz = path.resolve(__dirname, "..");
  const args = process.argv.slice(2);
  const soloArg = args.find((a) => a.startsWith("--solo="));
  const solo = soloArg ? new Set(soloArg.slice("--solo=".length).split(",").map((s) => s.trim()).filter(Boolean)) : null;
  const posicionales = args.filter((a) => !a.startsWith("--"));
  const entrada = posicionales[0] || path.join(raiz, "datos_inyectados.js");
  const salida = posicionales[1] || entrada;
  if (solo) for (const n of solo) if (!DERIVADOS.some(([nombre]) => nombre === n)) { console.error("--solo: %s no es un derivado (%s)", n, DERIVADOS.map(([x]) => x).join(", ")); process.exit(2); }

  console.log("Leyendo  %s", entrada);
  const { bloques, datos, orden } = leer(entrada);
  for (const n of orden) console.log("  base  %s: %s registros", n.padEnd(22), Array.isArray(datos[n]) ? datos[n].length : (datos[n] && datos[n].filas ? datos[n].filas.length + " filas" : "—"));

  console.log("\nGenerando derivados" + (solo ? " (--solo " + [...solo].join(",") + ")" : ""));
  const derivados = derivar(datos, { solo, log: (l) => console.log(l) });
  for (const [nombre, valor] of Object.entries(derivados)) {
    bloques[nombre] = serializar(nombre, valor);
    if (!orden.includes(nombre)) orden.push(nombre);
  }
  escribir(salida, orden, bloques);
  const mb = (require("fs").statSync(salida).size / 1048576).toFixed(1);
  console.log("\nEscrito  %s  (%s MB)", salida, mb);
}

module.exports = { DERIVADOS, derivar };
if (require.main === module) main();
