#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════════════════════════
// SANEA EL CATÁLOGO A4 · saca del activo toda identidad que el padrón no declara
//
//   node GeneradorDatos/sanear_catalogo_deudores.js [activo] [--dry]
//
// Corre UNA VEZ; queda commiteado para que el cambio sea auditable y repetible, igual que
// `migrar_padron.js`. Después hay que correr `node GeneradorDatos/generar.js`.
//
// POR QUÉ HIZO FALTA. `migrar_padron.js` mapea por RUT los emisores y receptores del A1, que son los
// que tienen facturas detrás. `DEUDORES_AUTORIZADOS` (A4) declara 600 deudores y **621 de sus 622
// nombres están en el A1**, así que la migración los alcanzó a todos… menos uno:
//
//     4.603.315-2 · «Automotriz Puerto Montt y Cía. Ltda.»
//
// Ese deudor no aparece en ninguna factura, así que la migración nunca lo vio y conservó su identidad
// sintética. Dos cosas mal a la vez, las dos que el ADR-0009 vino a cerrar: el RUT está en **rango de
// persona natural** (4,6 millones, bajo el corte de 50.000.000) y su **dígito verificador es
// inválido**. Lo encontró la revisión del wizard del comité (regla 46): desde que ese wizard resuelve
// el RUT del deudor contra los catálogos en vez de inventarlo, una fila así es alcanzable —el comité
// podría otorgarle una línea a una persona que no existe—.
//
// POR QUÉ SE SACA EN VEZ DE REEMPLAZARSE. Las cuatro listas del padrón están dimensionadas a lo que el
// activo necesita y `DEUDORES` no tiene ninguna identidad de repuesto (741 de 741 en uso). Las otras
// dos listas con holgura —`STREAM` y `PROVEEDORES`— tienen dueño y las listas son disjuntas a
// propósito (`padron.test.mjs`), así que tomar de ahí rompería esa garantía para ganar una fila. Y
// acuñar una identidad nueva exige el AEC, que no se commitea. Un deudor autorizado **sin una sola
// factura** no aporta nada al catálogo: no tiene par, no tiene línea y no abre ninguna oportunidad.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const padron = require("./lib/padron");

const norm = (r) => String(r).replace(/\./g, "").toUpperCase();

// Los RUT que el padrón declara, en cualquiera de sus cuatro listas.
function declarados() {
  const s = new Set();
  for (const lista of Object.values(padron)) if (Array.isArray(lista)) for (const x of lista) s.add(norm(x.rut));
  return s;
}

// Las filas de un bloque cuyo `RUT` el padrón no declara. Se expone para que el gate la pruebe sobre
// un caso plantado en vez de sobre el activo real.
function huerfanasDelBloque(filas, dec) {
  return (filas || []).filter((f) => f && f.RUT && !dec.has(norm(f.RUT)));
}

// Saca del TEXTO del activo las filas indicadas del bloque. Se opera sobre el texto y no sobre el
// objeto para no reserializar 35 MB y cambiar un archivo entero por una fila.
function sacarFilas(texto, bloque, ruts) {
  const marca = `window.${bloque}=`;
  const i = texto.indexOf(marca);
  if (i < 0) throw new Error(`no encuentro el bloque ${bloque} en el activo`);
  const fin = texto.indexOf("\nwindow.", i);
  const cuerpo = texto.slice(i + marca.length, fin < 0 ? texto.length : fin);
  const filas = JSON.parse(cuerpo.replace(/;\s*$/, ""));
  const quedan = filas.filter((f) => !ruts.has(norm(f.RUT)));
  if (quedan.length === filas.length) return { texto, sacadas: 0 };
  return {
    texto: texto.slice(0, i + marca.length) + JSON.stringify(quedan) + texto.slice(fin < 0 ? texto.length : fin),
    sacadas: filas.length - quedan.length,
  };
}

function main() {
  const raiz = path.resolve(__dirname, "..");
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const activo = args.find((a) => !a.startsWith("--")) || path.join(raiz, "datos_inyectados.js");

  const texto = fs.readFileSync(activo, "utf8");
  const datos = {};
  new Function("window", texto)(datos);
  const dec = declarados();

  let salida = texto,
    total = 0;
  for (const bloque of ["LISTA_BLANCA", "DEUDORES_AUTORIZADOS"]) {
    const huerf = huerfanasDelBloque(datos[bloque], dec);
    if (!huerf.length) {
      console.log("%s: sin identidades huérfanas (%s filas)", bloque.padEnd(22), (datos[bloque] || []).length);
      continue;
    }
    for (const f of huerf) console.log("%s: FUERA %s · %s", bloque.padEnd(22), f.RUT, f.RazonSocial);
    const r = sacarFilas(salida, bloque, new Set(huerf.map((f) => norm(f.RUT))));
    salida = r.texto;
    total += r.sacadas;
  }

  if (!total) return console.log("\nNada que sanear.");
  if (dry) return console.log("\n--dry: %s fila(s) se sacarían, no se escribió nada.", total);
  fs.writeFileSync(activo, salida);
  console.log("\nEscrito %s · %s fila(s) fuera. Corre ahora `node GeneradorDatos/generar.js`.", activo, total);
}

module.exports = { declarados, huerfanasDelBloque, sacarFilas, norm };
if (require.main === module) main();
