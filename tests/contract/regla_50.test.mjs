/* Gate de contrato de la regla 50 (mientras se simula es un pronóstico; al publicar se exige) sobre el
   TEXTO del fuente. La suite prueba el PREDICADO con el caso 155 —las dos direcciones y el borde de
   «cerrada sin comunicar»—; acá se fija que la pantalla lo USE: que las dos superficies (los badges de
   las pestañas y los chips de las compuertas) pregunten por la misma función y no vuelvan a pintar un
   color fijo, que es como nació la inconsistencia que el usuario vio. Con sonda negativa. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^function ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(m.index, fin < 0 ? undefined : m.index + m[0].length + fin);
}

export function auditarRegla50(src) {
  const fallos = [];
  const c = cuerpoDe(src, "exigeAcciones");
  if (!c) { fallos.push("no existe `function exigeAcciones(deal)` de nivel módulo: sin una sola función, cada superficie elige su color"); return fallos; }
  if (!/return ofertaPublicada\(deal\);/.test(c))
    fallos.push("`exigeAcciones` no se apoya en `ofertaPublicada`: publicar son DOS hechos (cerrar y comunicar) y duplicar ese criterio los separa");
  if (!/\["aceptadas", "cesion", "otorgamiento", "giro"\]\.includes\(deal\.stage\)/.test(c))
    fallos.push("`exigeAcciones` no exige en las etapas posteriores a la firma: ahí la operación ya no vuelve atrás sola");
  if (/tienePreEval/.test(c))
    fallos.push("`exigeAcciones` mira la pre-evaluación: pre-evaluar es pedir el pronóstico antes de tiempo, así que muestra el tab pero no vuelve rojo lo que nadie tiene que hacer todavía");
  // Las DOS superficies preguntan, y ninguna se queda con un color fijo. Se cuentan POR SUPERFICIE y no
  // en total: los chips llevan dos expresiones cada uno, así que un total suelto sobrevive a que uno
  // vuelva a ser literal —la sonda lo demostró antes de que este gate vigilara algo—.
  const badges = (src.match(/style=\{\{ backgroundColor: exigeAcciones\(deal\) \? "#EF4444" : "#7C3AED" \}\}/g) || []).length;
  if (badges < 2)
    fallos.push(`los badges de las pestañas no preguntan los dos por \`exigeAcciones\` (${badges} de 2): Otorgamiento y Verificación tienen que decir lo mismo sobre la misma operación`);
  const chips = (src.match(/exigeAcciones\(deal\) \? "#EF4444" : "#7C3AED",\s*\n\s*exigeAcciones\(deal\) \? "#FEF2F2" : "#f5f3ff",/g) || []).length;
  if (chips < 2)
    fallos.push(`los chips de las compuertas no toman su color de \`exigeAcciones\` (${chips} de 2): así nació la inconsistencia, con el de Verificación rojo desde la simulación y el de Otorgamiento morado`);
  if (/style=\{\{ backgroundColor: "#C2410C" \}\}\s*\n\s*>\s*\n\s*\{verifPendOp\}/.test(src))
    fallos.push("el badge de Verificación volvió a un color fijo: nacía rojo desde la simulación mientras el de Otorgamiento era morado, y uno de los dos mentía");
  if (!/exigeAcciones\(deal\) \? "#EF4444" : "#7C3AED"/.test(src))
    fallos.push("ninguna superficie pinta morado→rojo según `exigeAcciones`");
  return fallos;
}

test("50 · una sola compuerta decide si los pendientes son pronóstico o trabajo, y las dos superficies la consultan", () => {
  assert.deepEqual(auditarRegla50(jsx), []);
});

const MUTANTES = {
  "vuelve el color fijo del badge de verificación": {
    src: jsx.replace(`                        style={{ backgroundColor: exigeAcciones(deal) ? "#EF4444" : "#7C3AED" }}
                      >
                        {verifPendOp}`, `                        style={{ backgroundColor: "#C2410C" }}
                      >
                        {verifPendOp}`),
    re: /volvió a un color fijo|los badges de las pestañas no preguntan/,
  },
  "un chip vuelve a nacer con color fijo": {
    // Los chips del resumen llevan el color en dos líneas sueltas, así que basta con que una vuelva a
    // ser literal: el conteo de usos cae por debajo de los cuatro que las dos superficies necesitan.
    src: jsx.replace('                                            exigeAcciones(deal) ? "#EF4444" : "#7C3AED",\n', '                                            "#EF4444",\n'),
    re: /los chips de las compuertas no toman su color/,
  },
  "la compuerta mira la pre-evaluación": {
    src: jsx.replace("  return ofertaPublicada(deal);\n}", "  return ofertaPublicada(deal) || tienePreEval(deal.id);\n}"),
    re: /mira la pre-evaluación/,
  },
  "la compuerta duplica el criterio de publicación": {
    src: jsx.replace("  return ofertaPublicada(deal);\n}", "  return !!(deal.ofertaCerrada && deal.ofertaComunicada);\n}"),
    re: /no se apoya en `ofertaPublicada`/,
  },
  "las etapas posteriores dejan de exigir": {
    src: jsx.replace('  if (["aceptadas", "cesion", "otorgamiento", "giro"].includes(deal.stage)) return true;\n', ""),
    re: /no exige en las etapas posteriores/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`50 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla50(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
