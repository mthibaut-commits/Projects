// -------------------------------------------------------------------------------------------------
// Gate de la regla 36 — el arte de la portada es un activo GENERADO, y los dos builds lo embeben.
//
// La portada muestra dos pantallas reales del producto. Son bytes generados (`Capturas_UI/` →
// `generar_arte_login.mjs` → `arte_login.js`), así que NO viven dentro del `.jsx`, que se edita a mano
// (regla 10 de CLAUDE.md). El riesgo que este gate cubre es el que CLAUDE.md nombra para el build:
// «mismo contrato que build_app.mjs: si cambia uno, cambia el otro». Un activo embebido sólo por el
// build de Node deja al usuario, que construye en Windows con el `.bat`, con una portada sin paneles
// y sin ningún error.
//
// Clase: REGLA (nunca se actualiza). Los dos builds, o ninguno.
// -------------------------------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const leer = (rel) => readFileSync(join(raiz, rel), "utf8");

/* ¿El build lee el activo y lo agrega al payload? Se mira por separado para que la sonda pueda
   plantar el caso peligroso: lo lee pero no lo embebe. */
export function embebeElArte(texto) {
  return {
    lee: texto.includes("arte_login.js"),
    // Node: `payload = payload + "\n" + arteJs`  ·  PowerShell: `$payload = $payload + ... + $arteJs`
    embebe: /\$?payload\s*=\s*\$?payload\s*\+[^\n]*\$?arteJs/.test(texto),
  };
}

test("regla 36: los DOS builds leen arte_login.js y lo agregan al payload", () => {
  const mjs = embebeElArte(leer("build_app.mjs"));
  const ps1 = embebeElArte(leer("build_app.ps1"));
  assert.deepEqual(
    { node: mjs, windows: ps1 },
    { node: { lee: true, embebe: true }, windows: { lee: true, embebe: true } },
    "el arte tiene que entrar por los dos builds: si sólo entra por Node, el usuario construye en Windows y la portada queda sin paneles, sin ningún error",
  );
});

test("regla 36: el generador existe y sale de Capturas_UI, no de una maqueta", () => {
  assert.ok(existsSync(join(raiz, "generar_arte_login.mjs")), "falta generar_arte_login.mjs");
  const gen = leer("generar_arte_login.mjs");
  assert.ok(gen.includes("Capturas_UI"), "el arte tiene que salir de Capturas_UI: son el DOM real, no maquetas");
  assert.ok(/image\/webp/.test(gen), "WebP: sobre una captura de interfaz pesa ~3,6 veces menos que PNG");
});

test("regla 36: el fuente degrada si el activo falta, en vez de romper", () => {
  const fuente = leer("pipeline_comercial.jsx");
  assert.ok(/const ARTE_LOGIN = .*window\.ARTE_LOGIN.*\|\|\s*\{\}/.test(fuente),
    "ARTE_LOGIN tiene que caer a {} si el build no inyectó el activo");
  assert.ok(fuente.includes("ARTE_LOGIN.dashboard &&"),
    "los paneles se montan sólo si hay arte: sin la guarda, falta el activo y la portada revienta");
});

test("sonda negativa: un build que lee el activo pero no lo embebe es cazado", () => {
  const plantado = 'const arteJs = leerSiExiste(join(root, "arte_login.js"));\nlet payload = buildJs;\nif (datosJs) payload = payload + datosJs;';
  assert.deepEqual(embebeElArte(plantado), { lee: true, embebe: false });
});

test("sonda negativa: un build que ni lo menciona es cazado", () => {
  assert.deepEqual(embebeElArte("let payload = buildJs;"), { lee: false, embebe: false });
});
