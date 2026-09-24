/* Gate de contrato de la regla 48 (el atajo del otorgamiento automático no pasa por encima del visado,
   OTG-02) sobre el TEXTO del fuente. La suite prueba el COMPORTAMIENTO con el caso 153 —con criterios
   pendientes el atajo no está vigente ni completa la operación, en la automática y en la manual—; acá se
   fija la FORMA: que la compuerta sea pura y reciba el estado, que `otorgamientoCompleto` mire el visado
   ANTES del atajo, que el avance tenga UNA sola rama (separadas volverían a separarse) y que la pantalla
   no muestre el cartel verde encima de los criterios que esconde. Con sonda negativa para cada pieza. */
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

export function auditarRegla48(src) {
  const fallos = [];
  // 1 · La compuerta existe, es de nivel módulo, y responde lo que su nombre dice.
  const c = cuerpoDe(src, "otorgAutoVigente");
  if (!c) { fallos.push("no existe `function otorgAutoVigente(deal, estado)` de nivel módulo"); return fallos; }
  if (!/^function otorgAutoVigente\(deal, estado\)/m.test(c))
    fallos.push("`otorgAutoVigente` no recibe el estado por parámetro: el visado es evidencia del servidor y entra inyectado, como el resto del motor");
  if (!/if \(!deal \|\| !deal\.otorgAuto\) return false;/.test(c))
    fallos.push("`otorgAutoVigente` no exige `otorgAuto`: sin el atajo declarado no hay atajo que pueda estar vigente");
  if (!/const v = visadoDeal\(deal, estado\);/.test(c))
    fallos.push("`otorgAutoVigente` no consulta el visado: es justamente lo que el atajo no miraba");
  if (!/return v\.excPend\.length === 0 && v\.rechReev\.length === 0;/.test(c))
    fallos.push("`otorgAutoVigente` no exige el visado SIN PENDIENTES (`excPend` y `rechReev`): son los dos que OTG-02 nombra");
  // Pureza: el estado entra, no se lee.
  for (const glob of ["VISADO_STATE", "VISADO_CACHE", "SESION"]) {
    if (new RegExp(`\\b${glob}\\b`).test(c)) fallos.push(`\`otorgAutoVigente\` lee \`${glob}\`: el motor decide con lo que le inyectan`);
  }
  // 2 · OTG-02 se comprueba ANTES del atajo. Al revés, el atajo vuelve a ganar.
  const oc = cuerpoDe(src, "otorgamientoCompleto");
  if (!oc) { fallos.push("no existe `function otorgamientoCompleto`"); return fallos; }
  const iGuarda = oc.indexOf("if (v.excPend.length || v.rechReev.length) return false;");
  const iAtajo = oc.indexOf("if (deal.otorgAuto) return true;");
  if (iGuarda < 0) fallos.push("`otorgamientoCompleto` no comprueba OTG-02: con excepciones o rechazos re-evaluables sin resolver la operación no puede pasar a Cesión");
  else if (iAtajo >= 0 && iAtajo < iGuarda)
    fallos.push("`otorgamientoCompleto` consulta el atajo ANTES de OTG-02: para entonces ya devolvió `true` con el otorgamiento sin hacer");
  // 3 · UNA SOLA RAMA en el avance. La del atajo miraba sólo las llamadas y por ahí se colaba.
  const ato = cuerpoDe(src, "avanceTrasOtorgamiento");
  if (!ato) fallos.push("no existe `function avanceTrasOtorgamiento`: las dos compuertas volvieron a vivir dentro de un handler");
  else {
    if (!/otorgamientoCompleto\(deal, estado\)/.test(ato))
      fallos.push("`avanceTrasOtorgamiento` no exige `otorgamientoCompleto`: es la compuerta OTG-02 y sin ella el atajo vuelve a ganar");
    if (!/verifResumenDeal\(deal, estado\)\.pend > 0/.test(ato))
      fallos.push("`avanceTrasOtorgamiento` no exige la verificación: son las dos compuertas, OTG-02 y VER-01");
  }
  if ((src.match(/avanceTrasOtorgamiento\(/g) || []).length < 3)
    fallos.push("alguno de los dos avances —el periódico y el por evento— volvió a decidir por su cuenta en vez de preguntarle a `avanceTrasOtorgamiento`");
  if (/if \(d\.otorgAuto\) \{\s*\n\s*if \(verifResumenDeal\(d\)\.pend > 0\) return d;/.test(src) || (ato && /otorgAuto[^;]*verifResumenDeal\(deal, estado\)\.pend > 0/.test(ato)))
    fallos.push("volvió la rama aparte del otorgamiento automático, que avanza mirando sólo las llamadas: es el camino por el que 38 criterios sin aprobar llegaban a «Pendiente Integración»");
  // 4 · La pantalla: el cartel verde sólo con el atajo vigente, y los criterios cuando no lo está.
  if (!/\{tab === "otorgamiento" && otorgAutoVigente\(deal\) && \(/.test(src))
    fallos.push("el cartel de «otorgamiento automático» no consulta `otorgAutoVigente`: se mostraba con criterios por aprobar a la vista en el mismo resumen");
  if (!/\{tab === "otorgamiento" &&\s*\n\s*!otorgAutoVigente\(deal\) &&/.test(src))
    fallos.push("la lista de criterios sigue escondida detrás de `!deal.otorgAuto`: el tab que los muestra quedaba reemplazado por un cartel diciendo que no hacía falta nadie");
  return fallos;
}

test("48 · el atajo del otorgamiento automático no pasa por encima del visado: OTG-02 primero, una sola rama y la pantalla no lo esconde", () => {
  assert.deepEqual(auditarRegla48(jsx), []);
});

const MUTANTES = {
  "el atajo vuelve a ganarle a OTG-02": {
    src: jsx.replace(`  if (v.excPend.length || v.rechReev.length) return false;
  if (deal.otorgAuto) return true;`, `  if (deal.otorgAuto) return true;
  if (v.excPend.length || v.rechReev.length) return false;`),
    re: /consulta el atajo ANTES de OTG-02/,
  },
  "otorgamientoCompleto deja de mirar los pendientes": {
    src: jsx.replace("  if (v.excPend.length || v.rechReev.length) return false;\n", ""),
    re: /no comprueba OTG-02/,
  },
  "la compuerta se conforma con el atajo declarado": {
    src: jsx.replace("  return v.excPend.length === 0 && v.rechReev.length === 0;\n}", "  return true;\n}"),
    re: /no exige el visado SIN PENDIENTES/,
  },
  "la compuerta lee el visado global": {
    src: jsx.replace("  const v = visadoDeal(deal, estado);\n  return v.excPend.length === 0 && v.rechReev.length === 0;",
                     "  const v = visadoDeal(deal, VISADO_STATE);\n  return v.excPend.length === 0 && v.rechReev.length === 0;"),
    re: /lee `VISADO_STATE`/,
  },
  "vuelve la rama aparte del automático": {
    src: jsx.replace("  if (verifResumenDeal(deal, estado).pend > 0) return null;",
                     "  if (deal.otorgAuto && verifResumenDeal(deal, estado).pend > 0) return null;"),
    re: /volvió la rama aparte del otorgamiento automático/,
  },
  "el cartel verde vuelve a mirar sólo la bandera": {
    src: jsx.replace('{tab === "otorgamiento" && otorgAutoVigente(deal) && (', '{tab === "otorgamiento" && deal.otorgAuto && ('),
    re: /no consulta `otorgAutoVigente`/,
  },
  "los criterios vuelven a esconderse": {
    src: jsx.replace("            !otorgAutoVigente(deal) &&", "            !deal.otorgAuto &&"),
    re: /sigue escondida detrás de `!deal.otorgAuto`/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`48 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla48(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
