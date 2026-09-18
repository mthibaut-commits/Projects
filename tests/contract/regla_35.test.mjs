// -------------------------------------------------------------------------------------------------
// Gate de la regla 35 — la palabra que los scripts esperan para saber que la portada cargó.
//
// El HTML son 41 MB y Babel transpila ~26.000 líneas EN EL NAVEGADOR: ningún script sabe cuándo
// terminó. Todos resuelven lo mismo — esperan a que una palabra de la portada aparezca en el texto de
// la página— y si esa palabra desaparece del fuente, se cuelgan los 300 s del timeout y recién ahí
// fallan, sin decir por qué. Son OCHO archivos y nada ataba el contrato.
//
// Clase: REGLA (nunca se actualiza). Si un script espera una palabra, esa palabra tiene que existir
// en el fuente. Al rediseñar la portada el 18-09-2026 «Bienvenido» dejó de ser el titular y pasó a ser
// el título de la tarjeta, justamente para no romper esto.
// -------------------------------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const leer = (rel) => readFileSync(join(raiz, rel), "utf8");

/* Toda espera sobre el texto de la página. */
export function esperasSobreElTexto(texto) {
  const re = /waitForFunction\(\s*\(\)\s*=>\s*\/([^/\n]+)\/\s*\.test\(\s*document\.body\.innerText/g;
  return [...texto.matchAll(re)].map((m) => m[1]);
}

/* De ésas, sólo las que esperan una PALABRA LITERAL. Las demás —alternancias, escapes, cifras
   interpoladas— esperan texto que el fuente arma en runtime y que no existe como literal: no son el
   contrato que esta regla protege, que es el de la portada. */
export function esperasDePortada(texto) {
  return esperasSobreElTexto(texto).filter((p) => /^[\p{L}][\p{L} ]*$/u.test(p));
}

/* Todo .mjs del repo que maneje el navegador: la raíz y los de e2e. */
export function scriptsQueEsperan(listar = () => {
  const enRaiz = readdirSync(raiz).filter((f) => f.endsWith(".mjs")).map((f) => f);
  const enE2e = existsSync(join(raiz, "tests", "e2e"))
    ? readdirSync(join(raiz, "tests", "e2e")).filter((f) => f.endsWith(".mjs")).map((f) => join("tests", "e2e", f))
    : [];
  return [...enRaiz, ...enE2e];
}, leerRel = leer) {
  const fuera = new Map();
  for (const rel of listar()) {
    const palabras = esperasDePortada(leerRel(rel));
    if (palabras.length) fuera.set(rel, palabras);
  }
  return fuera;
}

test("regla 35: toda palabra que un script espera de la portada existe en el fuente", () => {
  const fuente = leer("pipeline_comercial.jsx");
  const porArchivo = scriptsQueEsperan();
  // Si esto queda vacío el gate no vigila nada: significa que cambió la forma de esperar.
  assert.ok(porArchivo.size >= 5,
    `esperaba al menos 5 scripts esperando la portada, encontré ${porArchivo.size}`);
  const faltantes = [];
  for (const [archivo, palabras] of porArchivo) {
    for (const p of palabras) if (!fuente.includes(p)) faltantes.push(`${archivo} espera "${p}"`);
  }
  assert.deepEqual(faltantes, [],
    "estos scripts esperan una palabra que el fuente ya no tiene y se van a colgar 300 s:\n  " + faltantes.join("\n  "));
});

test("regla 35: la palabra viva es «Bienvenido» y está en LoginScreen", () => {
  const fuente = leer("pipeline_comercial.jsx");
  const i = fuente.indexOf("function LoginScreen");
  assert.ok(i > 0, "no encuentro LoginScreen");
  const login = fuente.slice(i, i + 40000);
  assert.ok(login.includes("Bienvenido"),
    "«Bienvenido» tiene que seguir dentro de LoginScreen: es lo que esperan run_tests.mjs, el harness e2e y las capturas");
});

test("sonda negativa: un script que espera una palabra ausente es cazado", () => {
  const plantado = 'await p.waitForFunction(() => /PalabraQueNoExiste/.test(document.body.innerText || ""), null, {});';
  assert.deepEqual(esperasDePortada(plantado), ["PalabraQueNoExiste"]);
  const fuente = "const x = 1; // sin esa palabra";
  assert.ok(!fuente.includes(esperasDePortada(plantado)[0]), "la sonda tiene que quedar fuera del fuente plantado");
});

test("sonda negativa: el extractor no confunde otras esperas", () => {
  const otras = [
    'await p.waitForFunction(() => document.querySelector(".x") !== null);',
    'await p.waitForSelector("text=Bienvenido");',
  ].join("\n");
  assert.deepEqual(esperasDePortada(otras), [], "sólo cuenta la espera sobre document.body.innerText");
});

test("sonda negativa: una espera con regex de verdad no se cuenta como literal de portada", () => {
  const conRegex = [
    'await p.waitForFunction(() => /Monto|Facturas/.test(document.body.innerText));',
    'await p.waitForFunction(() => /Total oferta[\\s\\S]{0,120}?\\$[\\d.]{5,}/.test(document.body.innerText));',
    'await p.waitForFunction(() => /Tienes 1 factura elegida/.test(document.body.innerText));',
  ].join("\n");
  assert.equal(esperasSobreElTexto(conRegex).length, 3, "las tres son esperas sobre el texto");
  assert.deepEqual(esperasDePortada(conRegex), [],
    "ninguna es una palabra literal: la primera tiene alternancia, la segunda escapes y la tercera una cifra que el fuente interpola");
});
