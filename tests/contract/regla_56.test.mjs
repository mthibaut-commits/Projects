/* Gate de contrato de la regla 56: el que scrollea la tabla del tubo es SU PROPIO panel.
   Es un gate de TEXTO porque lo que la regla fija es una FORMA del árbol —quién puede encogerse— y eso
   no lo prueba ningún motor: la suite no monta la tabla y `tsc` no sabe de `min-width: auto`. Lo que se
   mide: la raíz de `TablaOportunidades` lleva `min-w-0`, el panel de la tabla conserva su
   `overflow-x-auto` y la tabla conserva su `minWidth` —las tres piezas juntas son el mecanismo, y quitar
   cualquiera lo apaga—. Con sonda negativa por pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla56(src) {
  const fallos = [];
  const i = src.indexOf("function TablaOportunidades(");
  if (i < 0) return ["no existe `function TablaOportunidades`"];
  const tramo = src.slice(i, i + 12000);
  if (!/<div className="flex min-w-0 flex-1 flex-col gap-2">/.test(tramo))
    fallos.push(
      "la raíz de `TablaOportunidades` perdió `min-w-0`: es un ITEM flex del contenedor que el tubo comparte con el Kanban, y con `min-width: auto` no se encoge bajo el ancho mínimo de la tabla — medido a 1366 px, el `overflow-x-auto` del panel queda con `scrollWidth === clientWidth` (nada que scrollear), desborda la PÁGINA y la card de «Oferta» sale cortada por la ventana",
    );
  if (!/<div className="flex-1 overflow-x-auto rounded-xl bg-white p-1"/.test(tramo))
    fallos.push("el panel de la tabla perdió su `overflow-x-auto`: es el que tiene que desplazar la tabla dentro de su marco");
  if (!/style=\{\{ minWidth: mostrarEjec \? "1666px" : "1526px", tableLayout: "fixed" \}\}/.test(tramo))
    fallos.push("la tabla perdió su `minWidth`/`tableLayout: fixed`: sin ellos las columnas se comprimen, el texto envuelve y crece el alto de cada fila");
  return fallos;
}

test("56 · la tabla del tubo se desplaza dentro de su panel: la raíz puede encogerse y el panel scrollea", () => {
  assert.deepEqual(auditarRegla56(jsx), []);
});

const MUTANTES = {
  "la raíz vuelve a no poder encogerse": {
    src: jsx.replace('<div className="flex min-w-0 flex-1 flex-col gap-2">', '<div className="flex flex-1 flex-col gap-2">'),
    re: /perdió `min-w-0`/,
  },
  "el panel deja de scrollear": {
    src: jsx.replace('<div className="flex-1 overflow-x-auto rounded-xl bg-white p-1"', '<div className="flex-1 rounded-xl bg-white p-1"'),
    re: /perdió su `overflow-x-auto`/,
  },
  "la tabla pierde su ancho mínimo": {
    src: jsx.replace('style={{ minWidth: mostrarEjec ? "1666px" : "1526px", tableLayout: "fixed" }}', 'style={{ tableLayout: "fixed" }}'),
    re: /perdió su `minWidth`/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`56 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla56(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
