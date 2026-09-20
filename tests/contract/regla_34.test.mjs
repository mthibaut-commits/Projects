/* Gate de contrato de la regla 34 (el tubo de Gestión diaria abre en «Todos», y «Todos» es el primer tab),
   sobre el TEXTO del fuente: los tabs viven dentro de `PipelineComercial`, así que ni la suite ni `tsc` los
   ven, y el e2e fija «Con línea» a propósito en `reiniciar()` —o sea que tampoco mide este arranque—.
   Dos cosas: el estado inicial de `quickFilter` y la POSICIÓN de «Todos» en `quickFilters`, que tiene que ser
   la primera incluso antes del «Prioritarios» condicional. Con sonda negativa para cada una. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El literal `quickFilters`: de su declaración al `];` que la cierra. */
export function tramoQuickFilters(src) {
  const a = src.indexOf("  const quickFilters = [");
  if (a < 0) return null;
  const b = src.indexOf("\n  ];", a);
  return b < 0 ? null : src.slice(a, b);
}

export function auditarTabs(src) {
  const fallos = [];
  // 1 · Abre sin filtro. Cualquier otro id deja la pantalla de entrada mostrando un recorte que nadie pidió.
  const m = src.match(/const \[quickFilter, setQuickFilter\] = useState\("([^"]*)"\)/);
  if (!m) fallos.push("no encuentro el estado `quickFilter`");
  else if (m[1] !== "todos") fallos.push(`el tubo arranca en «${m[1]}» y no en «todos»: la pantalla de entrada muestra un recorte que el ejecutivo no eligió`);
  // 2 · «Todos» es el PRIMER elemento del arreglo, antes del `...(…? [{ id: "prioritarios" …)` condicional.
  const t = tramoQuickFilters(src);
  if (!t) { fallos.push("no encuentro el literal `quickFilters`"); return fallos; }
  const ids = [...t.matchAll(/\{ id: "([a-z]+)"/g)].map((x) => x[1]);
  if (!ids.includes("todos")) fallos.push("`quickFilters` ya no tiene el tab «todos»");
  else if (ids[0] !== "todos") fallos.push(`el primer tab es «${ids[0]}» y no «todos»: el tab de entrada al final de la fila se lee como el último recorte de una lista de recortes`);
  // 3 · Y va antes del condicional, no dentro de él: si «Prioritarios» lo precediera, la posición de «Todos»
  //     saltaría cada vez que la jefatura prioriza un negocio.
  const iTodos = t.indexOf('{ id: "todos"'), iPrio = t.indexOf('{ id: "prioritarios"');
  if (iTodos >= 0 && iPrio >= 0 && iPrio < iTodos) fallos.push("«Todos» va después del «Prioritarios» condicional: su posición salta cuando la jefatura prioriza un negocio");
  // 4 · `clearAll` deja el mismo tab con que abre: «limpiar filtros» y «recién abierto» son el mismo estado.
  const ca = src.match(/const clearAll = \(\) => \{[\s\S]{0,600}?\n  \};/);
  if (!ca) fallos.push("no encuentro `clearAll`");
  else if (!/setQuickFilter\("todos"\)/.test(ca[0])) fallos.push("`clearAll` no vuelve a «todos»: el destino de «limpiar filtros» dejó de ser el punto de partida");
  return fallos;
}

test("34 · el tubo abre en «Todos», «Todos» es el primer tab (antes del Prioritarios condicional) y clearAll vuelve ahí", () => {
  assert.deepEqual(auditarTabs(jsx), []);
});

const MUTANTES = {
  "arranca en «Con línea»": { src: jsx.replace('const [quickFilter, setQuickFilter] = useState("todos")', 'const [quickFilter, setQuickFilter] = useState("conlinea")'), re: /arranca en «conlinea»/ },
  "«Todos» al final de la fila": {
    src: (() => {
      const linea = '    { id: "todos", label: "Todos", count: dealsTubo.length + (directorio ? 0 : inboundCount) },\n';
      const s = jsx.replace(linea, "");
      // Prettier abrió los objetos largos en varias líneas (ADR-0006): el ancla es el bloque, no la línea.
      return s.replace('    {\n      id: "otrasfacturas",', linea + '    {\n      id: "otrasfacturas",');
    })(), re: /el primer tab es «prioritarios» y no «todos»|el primer tab es «conlinea» y no «todos»/,
  },
  "«Todos» después del Prioritarios condicional": {
    src: (() => {
      const linea = '    { id: "todos", label: "Todos", count: dealsTubo.length + (directorio ? 0 : inboundCount) },\n';
      const cond = '    ...(nPrioTubo > 0 || quickFilter === "prioritarios" ? [{ id: "prioritarios", label: "Prioritarios", count: nPrioTubo }] : []),\n';
      return jsx.replace(linea + cond, cond + linea);
    })(), re: /después del «Prioritarios» condicional/,
  },
  "clearAll deja otro tab": { src: jsx.replace(/(const clearAll = \(\) => \{[\s\S]{0,200}?setQuickFilter\(")todos("\))/, '$1conlinea$2'), re: /clearAll` no vuelve a «todos»/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`34 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarTabs(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
