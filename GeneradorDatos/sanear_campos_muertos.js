#!/usr/bin/env node
// ══════════════════════════════════════════════════════
// SACA DEL ACTIVO LOS CAMPOS QUE NADIE LEE Y QUE NOMBRAN UNA ESCALA
//
//   node GeneradorDatos/sanear_campos_muertos.js [activo] [--dry]
//
// Corre UNA VEZ y queda commiteado para que el cambio sea auditable y repetible, igual que
// `sanear_catalogo_deudores.js` y `migrar_padron.js`. Después hay que correr `generar.js`.
//
// POR QUÉ HIZO FALTA. La regla 61 dice que ningún activo lleva sufijo de escala. Los bloques
// DERIVADOS se arreglan en su generador y se regeneran; los bloques **BASE** se copian tal cual desde
// el activo de entrada, así que un campo heredado ahí dentro no lo alcanza ninguna corrida. Medido
// sobre las 119 claves distintas del activo, quedaban dos con nombre de escala:
//
//   · DEUDORES_AUTORIZADOS.LineaSugeridaMM   (599 filas, bloque BASE)
//   · SHARE_OF_WALLET … Analisis.RequeridoParaTargetMM  (233 filas, bloque DERIVADO)
//
// Ninguna la lee nadie: ni el fuente, ni la suite, ni otro generador. La segunda se sacó en su
// generador (`datasets/share_of_wallet.js`); ésta es la primera, que es la que no se puede regenerar.
//
// Y era una trampa, no sólo ruido: `RequeridoParaTargetMM` guardaba **pesos** (202.175.551) bajo un
// nombre que dice millones. Quien lo leyera creyendo al nombre habría multiplicado por un millón —que
// es exactamente el defecto que la regla 60 describe—. Un campo que nadie lee y que miente sobre su
// unidad no es información: es una mina.
// ══════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

// Bloque → campos a sacar, con el motivo. Sin lectores en todo el repo, verificado a mano.
const MUERTOS = {
  DEUDORES_AUTORIZADOS: {
    LineaSugeridaMM: "heredado, en millones, sin lectores y sin layout que lo declare (regla 61)",
  },
};

/* Saca la clave de cada objeto del bloque. Se trabaja sobre el TEXTO y no sobre el JSON parseado
   porque el activo pesa 35 MB y se reserializaría entero: acá sólo desaparece el par clave-valor. */
function sacarCampo(texto, bloque, campo) {
  const i = texto.indexOf(bloque + "=[");
  if (i < 0) return { texto, sacados: 0 };
  let fin = texto.indexOf("\n", i);
  if (fin < 0) fin = texto.length;
  const cuerpo = texto.slice(i, fin);
  // `,"campo":valor` o `"campo":valor,` — el valor es un número, una cadena, true/false o null.
  const re = new RegExp(`,"${campo}":(?:"[^"]*"|-?[\\d.eE+]+|true|false|null)|"${campo}":(?:"[^"]*"|-?[\\d.eE+]+|true|false|null),`, "g");
  const sacados = (cuerpo.match(re) || []).length;
  return { texto: texto.slice(0, i) + cuerpo.replace(re, "") + texto.slice(fin), sacados };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const activo = args.find((a) => !a.startsWith("--")) || path.join(__dirname, "..", "datos_inyectados.js");
  let texto = fs.readFileSync(activo, "utf8");
  let total = 0;
  for (const [bloque, campos] of Object.entries(MUERTOS)) {
    for (const [campo, motivo] of Object.entries(campos)) {
      const r = sacarCampo(texto, bloque, campo);
      texto = r.texto; total += r.sacados;
      console.log("%s.%s: %s fila(s) · %s", bloque, campo, r.sacados, motivo);
    }
  }
  if (!total) return console.log("\nNada que sanear.");
  if (dry) return console.log("\n--dry: %s campo(s) se sacarían, no se escribió nada.", total);
  fs.writeFileSync(activo, texto);
  console.log("\nEscrito %s · %s campo(s) fuera. Corre ahora `node GeneradorDatos/generar.js`.", activo, total);
}

module.exports = { MUERTOS, sacarCampo };
if (require.main === module) main();
