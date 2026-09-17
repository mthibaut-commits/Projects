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
//   `--solo` regenera únicamente esos derivados y conserva los demás tal como vienen en la entrada.
//   Existe porque la cadena AECSYNC → SHARE_OF_WALLET → AECSYNC no tiene punto fijo: una corrida
//   completa mueve ~150 cesiones de cesionario aunque nada haya cambiado (ver README), y un cambio en
//   otro activo no tiene por qué arrastrar eso.
//
// Datasets BASE — rescatados del build original, se copian sin tocar:
//   DTESYNC · LISTA_BLANCA · DEUDORES_AUTORIZADOS · SHARE_OF_WALLET · ESTRATEGIA_PRECIO
//
// Datasets DERIVADOS — se regeneran en cada corrida a partir de los base:
//   SHARE_OF_WALLET   activo A5        · serie semanal de participación, con los montos en pesos
//   LINEA_DISPONIBLE  activo A7 + A8   · líneas de crédito por cliente y tipo
//   OTORGAMIENTO      activo A16       · variables de riesgo de cliente, deudor y par cliente-deudor
//   VERIFICACION      activo A10       · variables del predictor de verificación por par cliente-deudor
//   RIESGO_BICE       activo A9        · lo que la API de Riesgo BICE devuelve y el A16 NO trae
//   PLATAFORMA360     activo A11       · información de empresa por RUT (firmográfica, comercial, socios)
//   CARTERA           activo A24       · estructura comercial y asignación de cada cliente a su ejecutivo
//   AECSYNC           activo A2        · cesiones electrónicas, cada una sobre un documento REAL del A1
//
// Se generan EN ORDEN y cada uno queda visible para los siguientes: VERIFICACION lee la nota del deudor
// del OTORGAMIENTO recién generado, para que los dos activos no puedan divergir.
//
// La generación es DETERMINISTA por bloque: dos corridas sobre la misma entrada producen el mismo
// bloque — con UNA excepción conocida, la cadena AECSYNC → SHARE_OF_WALLET → AECSYNC, que no tiene
// punto fijo (ver README, «Regenerar un solo derivado»).
// ════════════════════════════════════════════════════════════════════════════════════════════════
const path = require("path");
const { leer, escribir, serializar } = require("./lib/archivo");
const lineas = require("./datasets/lineas");
const shareOfWallet = require("./datasets/share_of_wallet");
const otorgamiento = require("./datasets/otorgamiento");
const verificacion = require("./datasets/verificacion");
const riesgoBice = require("./datasets/riesgo_bice");
const plataforma360 = require("./datasets/plataforma360");
const cartera = require("./datasets/cartera");
const cesiones = require("./datasets/cesiones");

const raiz = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const soloArg = args.find((a) => a.startsWith("--solo="));
const solo = soloArg ? new Set(soloArg.slice("--solo=".length).split(",").map((s) => s.trim()).filter(Boolean)) : null;
const posicionales = args.filter((a) => !a.startsWith("--"));
const entrada = posicionales[0] || path.join(raiz, "datos_inyectados.js");
const salida = posicionales[1] || entrada;

console.log("Leyendo  %s", entrada);
const { bloques, datos, orden } = leer(entrada);
for (const n of orden) console.log("  base  %s: %s registros", n.padEnd(22), Array.isArray(datos[n]) ? datos[n].length : (datos[n] && datos[n].filas ? datos[n].filas.length + " filas" : "—"));

const DERIVADOS = [
  // AECSYNC va PRIMERO: PLATAFORMA360 mide sobre él la colocación real de cada cliente, así que las
  // cesiones tienen que estar reconciliadas con el A1 antes de que nadie las lea.
  ["AECSYNC", () => cesiones.generar(datos)],
  ["SHARE_OF_WALLET", () => shareOfWallet.generar(datos)],
  ["LINEA_DISPONIBLE", () => lineas.generar(datos)],
  ["PLATAFORMA360", () => plataforma360.generar(datos)],
  ["OTORGAMIENTO", () => otorgamiento.generar(datos)],
  ["VERIFICACION", () => verificacion.generar(datos)],
  ["RIESGO_BICE", () => riesgoBice.generar(datos)],
  ["CARTERA", () => cartera.generar(datos)],
];

if (solo) for (const n of solo) if (!DERIVADOS.some(([nombre]) => nombre === n)) { console.error("--solo: %s no es un derivado (%s)", n, DERIVADOS.map(([x]) => x).join(", ")); process.exit(2); }
console.log("\nGenerando derivados" + (solo ? " (--solo " + [...solo].join(",") + ")" : ""));
for (const [nombre, fn] of DERIVADOS) {
  if (solo && !solo.has(nombre)) { console.log("  %s: se conserva de la entrada", nombre.padEnd(22)); continue; }
  const valor = fn();
  bloques[nombre] = serializar(nombre, valor);
  datos[nombre] = valor; // queda disponible para los derivados siguientes
  if (!orden.includes(nombre)) orden.push(nombre);
  const n = Array.isArray(valor) ? valor.length : (valor.filas ? valor.filas.length : 0);
  console.log("  %s: %s filas", nombre.padEnd(22), n);
}

escribir(salida, orden, bloques);
const mb = (require("fs").statSync(salida).size / 1048576).toFixed(1);
console.log("\nEscrito  %s  (%s MB)", salida, mb);
