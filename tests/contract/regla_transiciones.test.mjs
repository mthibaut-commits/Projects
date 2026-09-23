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
   Patrones sobre `canonico(src)` y sondas plantadas sobre el texto canónico (ADR-0006). */
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
export const cabezaMoverEtapa = (src) => entre(canonico(src), "const moverEtapa = (id, stageId, opts) => {", "setDeals((prev) => {");

/* El catálogo PURO al que `moverEtapa` le pregunta desde la regla 76. Las guardas que antes estaban
   escritas en el handler viven acá, y es acá donde hay que exigirlas: el handler puede reescribirse. */
export const catalogoTransiciones = (src) => entre(canonico(src), "function transicionManual(deal, stageId, opts) {", "// LA ASIGNACIÓN DE LÍNEA");

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
  // OTG-02 · NO SE AVANZA A CESIÓN CON EXCEPCIONES PENDIENTES, en el camino MANUAL. El invariante tenía
  // su evaluador escrito y probado (caso 88) y se aplicaba sólo tras la firma, en `etapaTrasFirma`.
  const re = /invarianteCumple\("OTG-02", "oportunidad.avanzarEtapa"/;
  if (!re.test(cab)) {
    fallos.push(
      '`moverEtapa` no comprueba OTG-02 (`invarianteCumple("OTG-02", "oportunidad.avanzarEtapa", …)`) antes de escribir: el menú esconde el destino y eso no es el control (regla 24)',
    );
  } else {
    if (!cab.includes('stageId === "cesion"'))
      fallos.push('`moverEtapa` ya no distingue `stageId === "cesion"`: la guarda de OTG-02 se aplicaría a transiciones que no le tocan');
    const tramo = cab.slice(cab.search(re), cab.search(re) + 800);
    if (!/\breturn;/.test(tramo)) fallos.push("la guarda de OTG-02 no CORTA (`return;`): detectar y seguir escribiendo no es un control");
    if (!/registrarAuditoria\(/.test(tramo))
      fallos.push("el rechazo de OTG-02 no se audita: una transición bloqueada sin rastro deja al ejecutivo sin dónde enterarse (regla 24)");
    if (!tramo.includes("OTG-02")) fallos.push("el registro de OTG-02 no nombra el código: es lo que cruza la auditoría con el contrato");
  }
  // GIRAR NO ES UNA ACCIÓN DE NEX (19-09-2026, corrección del usuario). Lo autoriza Operaciones al aprobar
  // la integración al core —eso inyecta la operación en TESORERÍA— y Tesorería gira. Así que `moverEtapa`
  // no rechaza ni audita nada sobre el giro: la transición NO EXISTE, igual que «Aceptada», que la fija el
  // cliente al firmar. Un rechazo acá sería NEX controlando algo que no le toca.
  const cat = catalogoTransiciones(src);
  if (!cat) fallos.push("no encuentro el catálogo puro `transicionManual`: las guardas volvieron a vivir dentro del handler");
  else if (!/if \(stageId === "giro"\) return \{ok: false, codigo: "GIR-01"/.test(cat))
    fallos.push("`transicionManual` sigue tratando «giro» como una transición manual: no lo es — lo autoriza Operaciones al integrar y lo ejecuta Tesorería");
  if (!/permiso\.codigo !== "GIR-01"/.test(cab))
    fallos.push("`moverEtapa` AUDITA el rechazo de «giro»: acá no se rechaza ni se audita nada sobre el giro, el control es del otro sistema (19-09-2026)");
  const dondeGiro = cab + " " + (cat || "");
  if (/invarianteCumple\("GIR-0[12]"/.test(dondeGiro) || /Avance a Giro bloqueado|Transición bloqueada \(GIR-01\)/.test(dondeGiro))
    fallos.push("`moverEtapa` vuelve a RECHAZAR una transición a giro: el control es del otro sistema, acá la acción simplemente no existe");
  // Y el menú no lo ofrece — pero NO en silencio: la regla 24 exige que el destino se muestre apagado con
  // el motivo, porque desaparecer sin explicación deja al ejecutivo sin dónde enterarse.
  if (!/if \(st\.id === "giro"\) return false;/.test(src))
    fallos.push("el menú «Avanzar a» sigue ofreciendo «Girar» como destino clickeable: girar no es del comercial");
  if (!/lo_autoriza_operaciones/.test(src))
    fallos.push("«Girar» desaparece del menú sin motivo: la regla 24 pide mostrarlo apagado y explicar por qué (lo autoriza Operaciones)");
  // GIR-02 —la huella de lo que se inyecta— sigue donde sirve: `aprobarIntegracion`, que es el último
  // punto ANTES de inyectar a Tesorería, y ése sí es un acto de NEX.
  // RE-ANCLADO el 20-09-2026 al mezclar con `main`: la huella dejó de compararse suelta y pasó a ser una de
  // las cuatro faltas de `controlesIntegracion` (regla 41), que `aprobarIntegracion` vuelve a llamar antes de
  // escribir. La REGLA no cambió —GIR-02 se comprueba en el último punto útil— así que el gate se re-ancla
  // en el mecanismo nuevo en vez de aflojarse: se exige que la compuerta nombre GIR-02 y que el handler la
  // llame. Pedir el rótulo viejo dejaría de vigilar lo que la regla dice.
  if (!/"GIR-02"/.test(src))
    fallos.push("`controlesIntegracion` ya no nombra GIR-02: la huella es una de las cuatro faltas que bloquean la integración");
  if (!/const ctrl = controlesIntegracion\(d0\);/.test(src) || !/if \(!ctrl\.ok\)/.test(src))
    fallos.push("`aprobarIntegracion` ya no comprueba GIR-02 antes de inyectar: es el último punto en que comparar la huella sirve de algo");
  // La regla vive en la tabla, no en el handler: una copia inline es cómo se desfasan.
  if (/\["cesion", "giro"\]\.includes\(/.test(cab))
    fallos.push(
      '`moverEtapa` re-implementa el predicado de GIR-01 (`["cesion","giro"].includes`) en vez de preguntárselo al invariante: dos copias de la misma regla se desfasan',
    );
  return fallos;
}

test("OTG-02 se comprueba en `moverEtapa` y corta; «giro» NO es una transición de NEX y el menú lo explica; GIR-02 sigue antes de inyectar", () => {
  assert.deepEqual(auditarTransiciones(jsx), []);
});

test("SONDAS: cada violación plantada en una copia del fuente hace fallar al auditor", () => {
  const can = canonico(jsx);
  const sondas = [
    [
      "sin la guarda de OTG-02",
      can.replace('invarianteCumple("OTG-02", "oportunidad.avanzarEtapa"', 'noop("OTG-02", "oportunidad.avanzarEtapa"'),
      /no comprueba OTG-02/,
    ],
    ["«giro» vuelve a ser una transición manual", can.replace('if (stageId === "giro") return {ok: false, codigo: "GIR-01"', 'if (false) return {ok: false, codigo: "GIR-01"'), /sigue tratando «giro» como una transición manual/],
    ["`moverEtapa` audita el rechazo del giro", can.replace('permiso.codigo !== "GIR-01"', 'true'), /AUDITA el rechazo de «giro»/],
    [
      "NEX vuelve a rechazar una transición a giro",
      can.replace('if (stageId === "giro") return {ok: false, codigo: "GIR-01"', 'if (stageId === "giro") return invarianteCumple("GIR-01", "oportunidad.girar", {deal: null}) && {ok: false, codigo: "GIR-01"'),
      /vuelve a RECHAZAR una transición a giro/,
    ],
    [
      "el menú vuelve a ofrecer «Girar» al comercial",
      can.replace('if (st.id === "giro") return false;', 'if (st.id === "giro") return true;'),
      /sigue ofreciendo «Girar»/,
    ],
    ["«Girar» desaparece sin explicación", can.replace(/lo_autoriza_operaciones/g, "sinMotivo"), /sin motivo/],
    [
      "la huella deja de comprobarse antes de inyectar",
      can.replace("const ctrl = controlesIntegracion(d0);", "const ctrl = { ok: true };"),
      /último punto en que comparar la huella/,
    ],
    [
      "el evaluador por código deja de leer la tabla",
      can.replace("INVARIANTES.find((i) => i.codigo === codigo)", "null"),
      /no saca el invariante de `INVARIANTES`/,
    ],
    [
      "el menú vuelve a ofrecer «Girar» al comercial",
      can.replace('if (st.id === "giro") return false;', 'if (st.id === "giro") return true;'),
      /sigue ofreciendo «Girar»/,
    ],
    ["«Girar» desaparece sin explicación", can.replace(/lo_autoriza_operaciones/g, "sinMotivo"), /sin motivo/],
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
