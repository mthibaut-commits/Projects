/* Un entregable que circula en PDF tiene que poder decir, solo, de qué versión es: llega por correo, se
   imprime, y una carilla suelta sin número no se puede contrastar con nada. Este gate fija las tres piezas
   del esquema (21-09-2026, pedido del usuario):

     1. el documento DECLARA su versión bajo el título, en `**Versión N.N.N · DD-MM-AAAA · NEX Factoring**`;
     2. cierra con `## Anexo · Control de versiones`, que es lo que el lector mira para saber qué cambió;
     3. la PRIMERA fila del anexo es la versión declarada, con su fecha.

   La tercera es la que importa: sin ella el encabezado y la tabla se desfasan en la primera corrección
   —alguien sube el número arriba y olvida la fila, o al revés— y el documento pasa a afirmar dos versiones
   distintas de sí mismo. Es la misma familia que el hallazgo 2.3 de la auditoría de bootstrap: una cifra que
   nadie mide se desfasa en silencio.

   `Integraciones_APIs_y_S3.md` es GENERADO: su versión y su historial viven en `armar_integraciones.mjs`, y
   este gate los lee en el archivo producido, que es lo que el lector recibe. */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { RAIZ, leer, caminar, rel } from "./_comun.mjs";

/* Los ENTREGABLES: lo que el cliente recibe y contra lo que alguien implementa. `Auditoria/` y
   `Regresiones/` quedan fuera a propósito — son fotos con fecha y no se re-emiten: se escribe otra. */
export const ENTREGABLES = () =>
  [...caminar(join(RAIZ, "Specs_Procesos")), ...caminar(join(RAIZ, "Integraciones"))]
    .map(rel).filter((p) => !p.endsWith("README.md")).sort();

export const CABECERA = /^\*\*Versión (\d+\.\d+\.\d+) · (\d{2}-\d{2}-\d{4}) · NEX Factoring\*\*$/m;
const TITULO_ANEXO = "## Anexo · Control de versiones";

/* Devuelve los incumplimientos de UN documento. Recibe texto para poder plantarle una violación. */
export function fallos(texto, nombre = "doc") {
  const out = [];
  // La versión PROPIA del documento va en su cabecera, antes de la primera sección. El consolidado de
  // integraciones reproduce doce capítulos que traen la suya, y ésas son de los specs, no de él: por eso
  // la unicidad se exige en la cabecera y no en todo el texto.
  const cabeza = texto.includes("\n## ") ? texto.slice(0, texto.indexOf("\n## ")) : texto;
  const cab = cabeza.match(CABECERA);
  if (!cab) return [`${nombre}: no declara versión sobre el cuerpo — falta \`**Versión N.N.N · DD-MM-AAAA · NEX Factoring**\``];
  if ((cabeza.match(new RegExp(CABECERA.source, "gm")) || []).length > 1)
    out.push(`${nombre}: declara su versión más de una vez en la cabecera`);

  const i = texto.indexOf(TITULO_ANEXO);
  if (i < 0) return [...out, `${nombre}: no cierra con \`${TITULO_ANEXO}\``];
  if (texto.slice(i + TITULO_ANEXO.length).includes("\n## "))
    out.push(`${nombre}: el anexo no es la última sección`);

  const filas = [...texto.slice(i).matchAll(/^\| \*{0,2}(\d+\.\d+\.\d+)\*{0,2} \| (\d{2}-\d{2}-\d{4}) \|/gm)]
    .map((m) => ({ v: m[1], f: m[2] }));
  if (!filas.length) return [...out, `${nombre}: el anexo no tiene ninguna fila de versión`];

  if (filas[0].v !== cab[1] || filas[0].f !== cab[2])
    out.push(`${nombre}: la cabecera dice ${cab[1]} (${cab[2]}) y la primera fila del anexo ${filas[0].v} (${filas[0].f})`);

  const num = (v) => v.split(".").map(Number);
  for (let k = 1; k < filas.length; k++) {
    const [a, b] = [num(filas[k - 1].v), num(filas[k].v)];
    const mayor = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
    if (!mayor) out.push(`${nombre}: el anexo no va de mayor a menor (${filas[k - 1].v} antes de ${filas[k].v})`);
  }
  return out;
}

test("los 23 entregables declaran versión y cierran con su anexo de control de versiones", () => {
  const docs = ENTREGABLES();
  assert.ok(docs.length >= 23, `se esperaban al menos 23 entregables y hay ${docs.length}`);
  const malos = docs.flatMap((d) => fallos(leer(d), d));
  assert.deepEqual(malos, []);
});

test("sonda negativa: un documento sin cabecera, sin anexo o desfasado, se caza", () => {
  const bueno = ["# Spec de algo", "", "**Versión 1.2.0 · 14-09-2026 · NEX Factoring**", "", "Cuerpo.", "",
    "---", "", TITULO_ANEXO, "", "| Versión | Fecha | Qué cambió |", "|---|---|---|",
    "| **1.2.0** | 14-09-2026 | Lo último. |", "| 1.1.0 | 12-09-2026 | Antes. |"].join("\n");
  assert.deepEqual(fallos(bueno), [], "el documento bien formado tiene que pasar");

  assert.equal(fallos(bueno.replace(/^\*\*Versión.*$/m, "")).length, 1, "sin cabecera");
  assert.equal(fallos(bueno.replace(TITULO_ANEXO, "## Otra cosa")).length, 1, "sin anexo");
  assert.ok(fallos(bueno.replace("| **1.2.0** | 14-09-2026 |", "| **1.1.5** | 14-09-2026 |"))[0].includes("primera fila"),
    "cabecera y primera fila desfasadas");
  assert.ok(fallos(bueno.replace("| 1.1.0 | 12-09-2026 |", "| 1.3.0 | 12-09-2026 |"))[0].includes("de mayor a menor"),
    "el anexo desordenado");
  assert.ok(fallos(bueno + "\n\n## Una sección después del anexo\n")[0].includes("última sección"),
    "el anexo tiene que cerrar el documento");
  assert.ok(fallos(bueno.replace("Cuerpo.", "**Versión 9.9.9 · 01-01-2026 · NEX Factoring**"))[0].includes("más de una vez"),
    "dos cabeceras es ambiguo: gana la primera y la otra miente");
  // Pero una versión DENTRO de una sección es de un capítulo reproducido, no del documento: no es un fallo.
  assert.deepEqual(fallos(bueno.replace(TITULO_ANEXO, "## Un capítulo\n\n**Versión 3.0.0 · 02-02-2026 · NEX Factoring**\n\n" + TITULO_ANEXO)), [],
    "la versión de un capítulo reproducido no es la del documento");
});

test("md_a_pdf.mjs saca la versión del cuerpo y la estampa en cada hoja", () => {
  const src = leer("md_a_pdf.mjs");
  assert.match(src, /const mVer = cuerpoSrc\.match\(/, "el conversor tiene que extraer la línea de versión");
  assert.match(src, /headerTemplate:[\s\S]{0,400}\$\{version \?/, "el encabezado de cada hoja lleva la versión");
  assert.match(src, /h2\.anexo \{ break-before: page; \}/, "el anexo abre en hoja nueva");
});
