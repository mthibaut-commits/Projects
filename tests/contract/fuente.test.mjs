/* Gates de ARQUITECTURA sobre el fuente único: los invariantes de `.claude/rules/code_style.md` que se
   pueden comprobar por introspección del texto, en milisegundos y sin navegador. Cada uno nació de un
   incidente real: el montaje raíz agregado al fuente rompe el build; una clase `tN` usada y no declarada
   (el caso t14) deja quince elementos de un tamaño distinto en cada pantalla, sin error; `stageName` local
   crashea toda pérdida del Kanban; y dos builds con distinto `vendorOrden` producen dos HTML distintos
   del mismo fuente. `tsc` y el build pasan con todos ellos rotos. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* 1 · Paso 2 de la verificación, en JS. El patrón NO se copia acá: se LEE de `CLAUDE.md`, que es donde el
   paso 2 está escrito, y el gate de más abajo comprueba que los otros dos sitios que lo repiten —el mapa de
   la verificación del vault y el job del CI— digan exactamente lo mismo, y que ese patrón reconozca las
   MISMAS declaraciones que `auditar_muerto.mjs`. Hasta el 18-09-2026 el paso 2 buscaba
   `^(function|const|let|var) [A-Za-z0-9_]+` y por eso no veía once declaraciones del fuente —diez
   `async function` y el `export default function PipelineComercial`—: un `const sha256Hex` que colisionara
   con el `async function sha256Hex` es «Identifier has already been declared», `tsc` no lo dice (probado en
   este repo) y el paso 2 tampoco lo habría dicho; el aviso llegaba dos minutos después, en el paso 5, cuando
   la suite no logra montar la app y sin nombrar el símbolo. Dos herramientas del mismo repo tenían
   definiciones distintas de «declaración» y la más débil era la de la ruta obligatoria. */
const CLAUDE_MD = leer("CLAUDE.md");

/* El patrón del paso 2 tal como lo escribe un documento o el CI: `grep -oE '<patrón>' pipeline_comercial.jsx`,
   con comillas simples o dobles. Devuelve `null` si el texto no trae el comando. */
export function patronPaso2(texto) {
  const m = texto.match(/grep -oE (['"])(.+?)\1 pipeline_comercial\.jsx/);
  return m ? m[2] : null;
}

/* La cola de la tubería importa tanto como el patrón: con `export default function X` el nombre es el ÚLTIMO
   campo, no el segundo, así que un `$2` heredado devolvería «default» y «function» como si fueran símbolos. */
export function colaPaso2(texto) {
  const m = texto.match(/pipeline_comercial\.jsx \| (awk '\{print \$\w+\}' \| sort \| uniq -d)/);
  return m ? m[1] : null;
}

/* Lo que devolvería `grep -oE <re> | awk '{print $NF}'`: el último campo de cada coincidencia. */
export function declaradosCon(re, src) {
  const anclado = new RegExp(re.source ?? re, "");
  const out = [];
  for (const l of src.split("\n")) {
    const m = l.match(anclado);
    if (m) out.push(m[0].trim().split(/\s+/).pop());
  }
  return out;
}

export function duplicadosNivelModulo(src, patron = patronPaso2(CLAUDE_MD)) {
  const vistos = new Map();
  for (const s of declaradosCon(patron, src)) vistos.set(s, (vistos.get(s) || 0) + 1);
  return [...vistos].filter(([, n]) => n > 1).map(([s]) => s);
}

/* 2 · El .jsx no monta la app: el build APPENDEA definirWebComponent(React, ReactDOM, PipelineComercial). */
export function montajeRaiz(src) {
  const fallos = [];
  if (/^definirWebComponent\(/m.test(src)) fallos.push("hay una llamada a `definirWebComponent(` a columna 0: el montaje raíz lo appendea el build, nunca va en el fuente");
  if (!/^export default function PipelineComercial\(/m.test(src)) fallos.push("falta `export default function PipelineComercial(` a columna 0");
  const ultima = src.replace(/\s+$/, "").split("\n").pop();
  if (ultima !== "}") fallos.push(`la última línea del fuente es «${ultima.slice(0, 50)}» y tiene que ser el \`}\` que cierra PipelineComercial`);
  return fallos;
}

/* 3 · Clases propias del <style>, en los dos sentidos. Espejo de la sección D de auditar_muerto.mjs:
   las reglas `.clase{` se buscan en todo el fuente (hay varios bloques <style>), las usadas salen de los
   className, y el filtro nombra las clases PROPIAS para no contar utilidades de Tailwind. */
export const ESPERADAS = /^(t\d+|ovl|skel|minw5|btn-cta|pl-row|pl-sim|pl-spin|nex-)/;
export function clasesPropias(src) {
  const declaradas = new Set([...src.matchAll(/\.([a-zA-Z][\w-]*)\s*\{/g)].map((m) => m[1]));
  const usadas = new Set();
  for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g))
    for (const c of (m[1] || m[2] || m[3] || "").split(/\s+/)) if (c && !c.includes("$")) usadas.add(c.replace(/^.*:/, ""));
  const propias = [...declaradas].filter((c) => ESPERADAS.test(c));
  return {
    declaradas: propias.sort(),
    sinUso: propias.filter((c) => !usadas.has(c)).sort(),
    sinDeclarar: [...usadas].filter((c) => ESPERADAS.test(c) && !declaradas.has(c)).sort(),
  };
}

/* 5 · Los dos builds cumplen el MISMO contrato: el orden del vendor es idéntico en el .mjs y el .ps1. */
export function vendorOrdenDe(mjs, ps1) {
  const lista = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const a = mjs.match(/const vendorOrden = \[([\s\S]*?)\];/);
  const b = ps1.match(/\$vendorOrden = @\(([\s\S]*?)\)/);
  return { mjs: a ? lista(a[1]) : null, ps1: b ? lista(b[1]) : null };
}

/* 6 · Los dos analizadores del repo tienen que ver la MISMA declaración. `auditar_muerto.mjs` es el que
   tiene la definición completa —y el comentario que la justifica: «un analizador que no ve una forma de
   declarar funciones no da un falso negativo: da un falso POSITIVO, que acá significa borrar código vivo»—,
   así que manda él. Se comparan sobre TODAS las líneas del fuente, sin el filtro de template literals que el
   auditor aplica por separado: lo que se fija acá es el PATRÓN, no ese filtro. Que el paso 2 no conozca los
   backticks lo puede hacer gritar de más —un `function` a columna 0 dentro de un template literal, como el
   que tenía `htmlAprobacion`—, y ése es el lado barato de equivocarse: obliga a mirar. No ver una declaración
   no lo es. */
export function reDeclAuditor(texto) {
  const m = texto.match(/const RE_DECL = \/(.+)\/;/);
  return m ? m[1] : null;
}

test("no hay símbolos de nivel módulo duplicados (paso 2 de la verificación)", () => {
  assert.deepEqual(duplicadosNivelModulo(jsx), [], "una clave repetida en un objeto literal es JS válido y silencioso; un símbolo repetido a nivel módulo también hasta que Babel lo transpila");
});

test("el fuente no monta la app: termina en el `}` de PipelineComercial y no llama a definirWebComponent", () => {
  assert.deepEqual(montajeRaiz(jsx), []);
});

test("toda clase propia del <style> que se usa está declarada, y toda declarada se usa (el caso t14)", () => {
  const c = clasesPropias(jsx);
  assert.ok(c.declaradas.length >= 9, `se esperaban al menos t7…t15 declaradas; hay ${c.declaradas.length}`);
  assert.deepEqual(c.sinDeclarar, [], "una clase usada y no declarada no falla: el elemento hereda el tamaño del padre y sale distinto en cada pantalla");
  assert.deepEqual(c.sinUso, [], "una clase declarada y sin uso es CSS muerto; bórrala o úsala");
});

test("`stageName` es de nivel módulo (si se vuelve local, toda pérdida del Kanban crashea la app)", () => {
  assert.match(jsx, /^(?:const|function) stageName\b/m);
});

test("build_app.mjs y build_app.ps1 declaran el mismo vendorOrden, y cada archivo existe en vendor/", () => {
  const { mjs, ps1 } = vendorOrdenDe(leer("build_app.mjs"), leer("build_app.ps1"));
  assert.ok(mjs && ps1, "no se encontró vendorOrden en uno de los dos builds");
  assert.deepEqual(mjs, ps1, "los dos builds son el MISMO contrato: si cambia uno, cambia el otro");
  assert.deepEqual(mjs.filter((f) => !existsSync(join(RAIZ, "vendor", f))), [], "archivo del vendorOrden que no existe en vendor/");
});

test("el paso 2 dice lo mismo en los tres sitios que lo escriben: CLAUDE.md, el vault y el CI", () => {
  const patron = patronPaso2(CLAUDE_MD);
  const cola = colaPaso2(CLAUDE_MD);
  assert.ok(patron, "CLAUDE.md ya no trae el grep del paso 2");
  assert.ok(cola, "CLAUDE.md ya no trae la cola `awk | sort | uniq -d` del paso 2");
  assert.match(cola, /\$NF/, "con `export default function X` el nombre es el ÚLTIMO campo: un `$2` heredado devolvería «default» y «function» como si fueran símbolos");
  for (const rel of ["vault/conocimiento/verificacion.md", ".github/workflows/gates.yml"]) {
    const texto = leer(rel);
    assert.equal(patronPaso2(texto), patron, `${rel} repite el paso 2 con OTRO patrón: el que corre en el CI y el que corre el humano tienen que ser el mismo`);
    assert.equal(colaPaso2(texto), cola, `${rel} repite el paso 2 con OTRA cola`);
  }
});

test("el paso 2 y auditar_muerto reconocen exactamente las mismas declaraciones del fuente", () => {
  const reAud = reDeclAuditor(leer("auditar_muerto.mjs"));
  assert.ok(reAud, "no se encontró `const RE_DECL = /…/;` en auditar_muerto.mjs");
  const delPaso2 = declaradosCon(patronPaso2(CLAUDE_MD), jsx);
  const delAuditor = declaradosCon(reAud, jsx);
  assert.ok(delPaso2.length > 900, `el paso 2 ve ${delPaso2.length} declaraciones: son ~950, algo se rompió en el patrón`);
  assert.deepEqual(
    delAuditor.filter((s, i) => delPaso2[i] !== s).concat(delPaso2.filter((s, i) => delAuditor[i] !== s)),
    [],
    "los dos analizadores del repo no ven la misma declaración; el de la ruta obligatoria de verificación no puede ser el débil",
  );
});

test("sonda negativa: un duplicado, un montaje raíz, una t16 y un vendor distinto plantados se detectan", () => {
  assert.deepEqual(duplicadosNivelModulo("const a = 1;\nfunction a() {}\nconst b = 2;"), ["a"]);
  /* El duplicado que el paso 2 NO veía hasta el 18-09-2026, y el patrón de entonces plantado para comprobar
     que este gate lo habría cazado: la colisión con un `async function`, y el desacuerdo con el auditor. */
  const PATRON_VIEJO = "^(function|const|let|var) [A-Za-z0-9_]+";
  const COLISION = "const sha256Hex = 1;\nasync function sha256Hex(txt) {}\nconst b = 2;";
  assert.deepEqual(duplicadosNivelModulo(COLISION), ["sha256Hex"]);
  assert.deepEqual(duplicadosNivelModulo(COLISION, PATRON_VIEJO), [], "el patrón viejo no veía `async function`: ésta es la razón de ser del gate de acuerdo");
  assert.notDeepEqual(declaradosCon(PATRON_VIEJO, jsx), declaradosCon(reDeclAuditor(leer("auditar_muerto.mjs")), jsx), "el gate de acuerdo tiene que romper con el patrón viejo");
  assert.notEqual(colaPaso2("… pipeline_comercial.jsx | awk '{print $2}' | sort | uniq -d"), colaPaso2(CLAUDE_MD), "una cola con `$2` plantada tiene que salir distinta de la de CLAUDE.md");
  assert.equal(patronPaso2("node --test \"tests/contract/*.test.mjs\""), null);
  assert.equal(reDeclAuditor("const OTRA = /x/;"), null);
  assert.ok(montajeRaiz(jsx + "\ndefinirWebComponent(React, ReactDOM, PipelineComercial);\n").some((f) => f.includes("columna 0")));
  const c = clasesPropias(jsx + '\n<div className="t16 mt-2"/>');
  assert.deepEqual(c.sinDeclarar, ["t16"]);
  assert.deepEqual(vendorOrdenDe('const vendorOrden = ["a.js", "b.js"];', '$vendorOrden = @("a.js")'), { mjs: ["a.js", "b.js"], ps1: ["a.js"] });
});

/* EL PASO 0 SE CORRE CON LA VERSIÓN QUE CORRE EL CI (23-09-2026).
   `npx prettier` sin versión resuelve a la última publicada, y dos versiones NO formatean igual: el
   ternario de `estPill` en `VerificacionTab` lo quiere en un renglón con 3.8.1 y partido en dos con
   3.6.2, que es la que `gates.yml` instala. El resultado es una línea que OSCILA —entró pegada el
   21-09, la mezcla del 22-09 la dejó canónica, la del 23-09 la volvió a pegar— y, cada vez que cae
   del lado del CI, un `prettier --check` local en verde contra un job en rojo. Y el paso 0 es el
   PRIMERO del workflow: el job sale con 1 ahí y no corre nada más, así que tres commits de `main`
   quedaron sin linter, sin tsc, sin build, sin gates, sin suite y sin e2e — mientras el tablero
   citaba «440/440», cierto en la rama donde se midió y no en `main`.
   Por eso el comando va PINNEADO en los cuatro sitios que lo escriben, y este gate los mantiene juntos. */
export function prettierPinDe(texto) {
  const m = texto.match(/npx prettier@(\d+\.\d+\.\d+) --(?:check|write)/);
  return m ? m[1] : null;
}
export function prettierInstaladoEnCI(yml) {
  const m = yml.match(/npm i -g [^\n]*\bprettier@(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

test("el paso 0 fija la MISMA versión de Prettier que el CI instala, en los cuatro sitios", () => {
  const yml = leer(".github/workflows/gates.yml");
  const pin = prettierInstaladoEnCI(yml);
  assert.ok(pin, "gates.yml ya no instala una versión fija de prettier: sin eso el paso 0 no es reproducible");
  for (const rel of ["CLAUDE.md", ".claude/rules/testing.md", "vault/conocimiento/verificacion.md", ".github/workflows/gates.yml"]) {
    const v = prettierPinDe(leer(rel));
    assert.ok(v, `${rel} escribe el paso 0 sin fijar la versión: \`npx prettier\` a secas resuelve a la última y no formatea igual`);
    assert.equal(v, pin, `${rel} fija prettier@${v} y el CI instala ${pin}: el fuente va a oscilar entre las dos`);
  }
});

test("sonda negativa: una versión suelta o desalineada en cualquiera de los cuatro se caza", () => {
  assert.equal(prettierPinDe("npx prettier --check pipeline_comercial.jsx"), null, "dio por fijada una versión que no está");
  assert.equal(prettierPinDe("npx prettier@3.6.2 --check pipeline_comercial.jsx"), "3.6.2");
  assert.equal(prettierPinDe("npx prettier@3.8.1 --write pipeline_comercial.jsx"), "3.8.1");
  assert.equal(prettierInstaladoEnCI("npm i -g typescript@6.0.2 prettier@3.6.2 eslint@10.1.0"), "3.6.2");
  assert.equal(prettierInstaladoEnCI("npm i -g typescript@6.0.2 eslint@10.1.0"), null, "no notó que el CI dejó de fijarla");
});
