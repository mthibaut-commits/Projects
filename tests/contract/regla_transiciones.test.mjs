/* Gate de contrato de GIR-01 y OTG-02 en `moverEtapa`, sobre el TEXTO del fuente.
   Los dos invariantes tienen su `evaluar` escrito y probado (casos 88 y 136), y los dos se aplicaban sólo
   en el camino AUTOMÁTICO: `etapaTrasFirma` rutea la operación tras la firma del cliente mirando el visado
   pendiente (OTG-02) y la huella (GIR-02). El «Avanzar a» MANUAL del menú y el arrastre del Kanban entran
   por `moverEtapa`, que comprobaba GIR-02 y nada más:
   · **GIR-01** —«no gira sin pasar por Cesión»— no se comprobaba en ninguna parte del handler. El menú
     filtra los destinos, y eso era todo el control: regla 24, la pantalla que esconde la acción no lo es.
   · **OTG-02** —«no avanza a Cesión con excepciones pendientes»— tampoco, en el camino manual.
   Acá se fija que las dos guardas existan, que corten ANTES de `setDeals`, que auditen nombrando su código,
   y que **no re-implementen el predicado**: lo preguntan por código al invariante, que es la única fuente.
   Un `["cesion","giro"].includes(...)` escrito a mano dentro de `moverEtapa` sería una segunda copia de la
   regla, que es como GIR-01 y su tabla se desfasan sin que nadie lo note.
   Patrones sobre `canonico(src)` y sondas plantadas sobre el texto canónico (ADR-0005). */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
/* El cierre se busca DESPUÉS del inicio, no desde él: con `desde = "function invarianteCumple(…)"` y
   `hasta = "function "`, buscar desde `i` calzaba en el propio `desde` y devolvía cadena VACÍA — y un
   bloque vacío hace que las comprobaciones que lo miran pasen por vacuidad. Lo cazaron las sondas. */
const entre = (src, desde, hasta) => {
  const i = src.indexOf(desde);
  if (i < 0) return null;
  const j = src.indexOf(hasta, i + desde.length);
  return j < 0 ? null : src.slice(i, j);
};

/* El handler `moverEtapa` hasta su `setDeals(`: todo control tiene que vivir acá adentro. */
export const cabezaMoverEtapa = (src) => entre(canonico(src), "const moverEtapa = (id, stageId) => {", "setDeals((prev) => {");

export function auditarTransiciones(src0) {
  const src = canonico(src0);
  const fallos = [];
  // El evaluador por código, que es lo que evita la segunda copia de la regla.
  if (!/function invarianteCumple\(codigo, mutacion, payload\)/.test(src))
    fallos.push(
      "no existe `invarianteCumple(codigo, mutacion, payload)`: sin él, cada handler re-implementa el predicado del invariante y la tabla se desfasa del código",
    );
  const ic = entre(src, "function invarianteCumple(codigo, mutacion, payload)", "function ");
  if (ic) {
    if (!/INVARIANTES\.find\(\(i\) => i\.codigo === codigo\)/.test(ic))
      fallos.push("`invarianteCumple` no saca el invariante de `INVARIANTES` por su código: tiene que leer la MISMA tabla que el contrato");
    if (!/registrarRechazo\(/.test(ic))
      fallos.push("`invarianteCumple` no registra el rechazo: un control que no cuenta no se puede auditar contra el contrato");
    if (!/catch/.test(ic))
      fallos.push("`invarianteCumple` no atrapa un evaluador que revienta: el control es del servidor y un bug acá no puede dejar al ejecutivo sin trabajar");
  }
  const cab = cabezaMoverEtapa(src);
  if (!cab) {
    fallos.push("no encuentro la cabeza de `moverEtapa` (de su declaración a `setDeals(`)");
    return fallos;
  }
  for (const [cod, mut, cuando] of [
    ["GIR-01", "oportunidad.girar", 'stageId === "giro"'],
    ["OTG-02", "oportunidad.avanzarEtapa", 'stageId === "cesion"'],
  ]) {
    const re = new RegExp(`invarianteCumple\\("${cod}", "${mut}"`);
    if (!re.test(cab)) {
      fallos.push(
        `\`moverEtapa\` no comprueba ${cod} (\`invarianteCumple("${cod}", "${mut}", …)\`) antes de escribir: el menú esconde el destino y eso no es el control (regla 24)`,
      );
      continue;
    }
    if (!cab.includes(cuando)) fallos.push(`\`moverEtapa\` ya no distingue \`${cuando}\`: la guarda de ${cod} se aplicaría a transiciones que no le tocan`);
    const i = cab.search(re);
    const tramo = cab.slice(i, i + 800);
    if (!/\breturn;/.test(tramo)) fallos.push(`la guarda de ${cod} no CORTA (\`return;\`): detectar y seguir escribiendo no es un control`);
    if (!/registrarAuditoria\(/.test(tramo))
      fallos.push(`el rechazo de ${cod} no se audita: una transición bloqueada sin rastro deja al ejecutivo sin dónde enterarse (regla 24)`);
    if (!tramo.includes(cod)) fallos.push(`el registro de ${cod} no nombra el código: es lo que cruza la auditoría con el contrato`);
  }
  // La regla vive en la tabla, no en el handler: una copia inline es cómo se desfasan.
  if (/\["cesion", "giro"\]\.includes\(/.test(cab))
    fallos.push(
      '`moverEtapa` re-implementa el predicado de GIR-01 (`["cesion","giro"].includes`) en vez de preguntárselo al invariante: dos copias de la misma regla se desfasan',
    );
  return fallos;
}

test("GIR-01 y OTG-02 se comprueban en `moverEtapa` antes de escribir, cortan, auditan y no re-implementan el predicado", () => {
  assert.deepEqual(auditarTransiciones(jsx), []);
});

test("SONDAS: cada violación plantada en una copia del fuente hace fallar al auditor", () => {
  const can = canonico(jsx);
  const sondas = [
    ["sin la guarda de GIR-01", can.replace('invarianteCumple("GIR-01", "oportunidad.girar"', 'noop("GIR-01", "oportunidad.girar"'), /no comprueba GIR-01/],
    [
      "sin la guarda de OTG-02",
      can.replace('invarianteCumple("OTG-02", "oportunidad.avanzarEtapa"', 'noop("OTG-02", "oportunidad.avanzarEtapa"'),
      /no comprueba OTG-02/,
    ],
    [
      "el evaluador por código deja de leer la tabla",
      can.replace("INVARIANTES.find((i) => i.codigo === codigo)", "null"),
      /no saca el invariante de `INVARIANTES`/,
    ],
    [
      "el rechazo deja de contarse",
      can.replace(/(function invarianteCumple\(codigo, mutacion, payload\)[\s\S]{0,600}?)registrarRechazo\(/, "$1noop("),
      /no registra el rechazo/,
    ],
  ];
  const mudas = sondas.filter(([, src]) => src === can).map(([n]) => n);
  assert.deepEqual(mudas, [], "sondas cuyo ancla ya no existe: no probarían nada");
  const nocazadas = sondas.filter(([, src, re]) => !auditarTransiciones(src).some((f) => re.test(f))).map(([n]) => n);
  assert.deepEqual(nocazadas, [], "sondas que el auditor no cazó");
});
