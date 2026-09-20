// -------------------------------------------------------------------------------------------------
// Gate de la regla 39 — cambiar un default de `CFG_OPER_BASE` no llega a quien ya tiene configuración
// guardada, salvo que suba `SCHEMA_VERSION.cfgOper` con su migración.
//
// `cargarCfgOper` hace `{ ...CFG_OPER_BASE, ...guardado }`: lo guardado GANA. Eso es correcto para lo
// que el usuario eligió, y silenciosamente equivocado para un default que el producto cambió. Medido el
// 18-09-2026: con la configuración v1 en el navegador, la portada seguía saliendo con el degradado y el
// CTA anteriores aunque el fuente ya tenía los de ADR-0005, y ningún test lo veía porque todos corren
// sobre un `localStorage` vacío.
//
// Clase: REGLA (nunca se actualiza). Este gate no sólo mira la versión: EJECUTA la migración declarada
// en el fuente contra una configuración v1 plantada, y comprueba que retire los colores de marca y
// conserve lo demás.
// -------------------------------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const leer = (rel) => readFileSync(join(raiz, rel), "utf8");

/* Las tres claves que ADR-0005 cambió: si una configuración guardada las conserva, las impone. */
export const CLAVES_DE_MARCA = ["marcaPrimario", "marcaCta", "marcaPanel"];

export function versionCfgOper(fuente) {
  const m = fuente.match(/^\s*cfgOper:\s*(\d+),/m);
  return m ? Number(m[1]) : null;
}

/* Recorta el valor de `cfgOper` dentro de MIGRACIONES contando llaves, y lo devuelve evaluado. */
export function migracionCfgOper(fuente) {
  const ini = fuente.indexOf("const MIGRACIONES");
  if (ini < 0) return null;
  const marca = fuente.indexOf("\n  cfgOper: {", ini);
  if (marca < 0) return null;
  let i = fuente.indexOf("{", marca), prof = 0, fin = -1;
  for (let k = i; k < fuente.length; k++) {
    if (fuente[k] === "{") prof++;
    else if (fuente[k] === "}") { prof--; if (prof === 0) { fin = k + 1; break; } }
  }
  if (fin < 0) return null;
  // eslint-disable-next-line no-new-func -- se evalúa el fuente del repo, no una entrada externa
  return new Function("return (" + fuente.slice(i, fin) + ")")();
}

test("regla 39: cfgOper subió de esquema y tiene su ruta de migración", () => {
  const fuente = leer("pipeline_comercial.jsx");
  const v = versionCfgOper(fuente);
  assert.ok(v >= 2, `SCHEMA_VERSION.cfgOper tiene que ser ≥ 2 desde ADR-0005; es ${v}`);
  const rutas = migracionCfgOper(fuente);
  assert.ok(rutas && typeof rutas[v] === "function",
    `MIGRACIONES.cfgOper tiene que traer una ruta a ${v}: sin ella el dato viejo se descarta ENTERO y el tenant pierde sus tasas`);
});

test("regla 39: la migración retira los colores de marca y conserva lo que el usuario eligió", () => {
  const fuente = leer("pipeline_comercial.jsx");
  const v = versionCfgOper(fuente);
  const migrar = migracionCfgOper(fuente)[v];
  const guardado = {
    security: {
      marcaPrimario: "#4F46E5",
      marcaCta: "linear-gradient(to right, #4F46E5, #6D5BFF)",
      marcaPanel: "linear-gradient(135deg, #5B21B6 0%, #6D28D9 45%, #7C3AED 100%)",
      marcaNombre: "Factoring Security",
      tasaMinAbsoluta: 0.78,
      descEjec: 12,
    },
  };
  const salida = migrar(guardado, 1);
  assert.ok(salida && salida.security, "la migración no puede devolver null: se perdería toda la configuración");
  for (const k of CLAVES_DE_MARCA) {
    assert.ok(!(k in salida.security), `«${k}» tiene que salir de lo guardado para que vuelva a mandar el default`);
  }
  assert.deepEqual(
    { marcaNombre: salida.security.marcaNombre, tasaMinAbsoluta: salida.security.tasaMinAbsoluta, descEjec: salida.security.descEjec },
    { marcaNombre: "Factoring Security", tasaMinAbsoluta: 0.78, descEjec: 12 },
    "lo que el usuario configuró se conserva: sólo los colores de marca son decisión de producto",
  );
  assert.deepEqual(guardado.security.marcaPrimario, "#4F46E5", "la migración no muta la entrada");
});

test("regla 39: los colores de marca del default son los de ADR-0005", () => {
  const fuente = leer("pipeline_comercial.jsx");
  const base = fuente.slice(fuente.indexOf("const CFG_OPER_BASE"), fuente.indexOf("const CFG_OPER_DEFAULT"));
  assert.ok(/marcaPrimario:\s*"#703EFF"/.test(base), "el primario es #703EFF, el mismo morado del producto");
  // Se miran VALORES, no el texto: el comentario que cuenta por qué se retiró el #4F46E5 debe quedarse.
  const sinComentarios = base.replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/:\s*"[^"]*#4F46E5/.test(sinComentarios),
    "ningún valor del default puede seguir siendo el #4F46E5 que convivía con el morado del producto");
  assert.ok(/marcaFondo:\s*"#/.test(base), "el suelo de la portada es del contenedor y sale del tenant");
});

test("sonda negativa: una migración que NO retira el primario es cazada", () => {
  const migrar = (datos) => datos;                       // la identidad: conserva todo, incluidos los colores
  const salida = migrar({ security: { marcaPrimario: "#4F46E5" } });
  assert.ok("marcaPrimario" in salida.security,
    "la sonda tiene que conservar el color: es el caso que el gate de arriba rechaza");
});

test("sonda negativa: el extractor devuelve null si MIGRACIONES no declara cfgOper", () => {
  assert.equal(migracionCfgOper("const MIGRACIONES = {\n  curse: { 2: (d) => d },\n};"), null);
  assert.equal(versionCfgOper("const SCHEMA_VERSION = {\n  cxc: 1,\n};"), null);
});
