/* Gate de contrato de la regla 68 (el comité de crédito que rechaza una línea puntual: la API 3 devuelve «Rechazada»
   por línea de detalle; el rechazo retira las facturas del deudor, emite versión y REABRE la operación; en cero, pérdida
   con causa), sobre el TEXTO del fuente. La decisión es pura y la prueba el caso 165 (`rechazoComiteDecision`,
   `api3EstadoProceso`, `CLOSE_REASONS`); lo que la suite no puede ver es que «Consultar estados» la APLIQUE —que el
   manejador exista, escriba la versión, pierda con la causa o parchee el negocio— y que la bandeja pinte el estado.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla68(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La API 3 resuelve «Rechazada» y lo escribe por línea de detalle.
  if (!can.includes('const fin = r === 0 ? "Observada" : r === 1 ? "Rechazada" : "Aprobada";')) fallos.push("`api3EstadoProceso` no resuelve «Rechazada»: el comité vuelve a no poder decir que no");
  if (!/if \(SEQ\.indexOf\(s\.estado\) === SEQ\.length - 1\) \(s\.detalle \|\| \[\]\)\.forEach\(\(d\) => \{if \(d\) d\.estado = s\.estado;\}\);/.test(can)) fallos.push("la API 3 no escribe el desenlace por línea de detalle, que es lo que el comité aprueba o rechaza");
  // 2 · La decisión pura existe y retira / reabre / pierde.
  const iD = can.indexOf("function rechazoComiteDecision(deal, sol, versiones) {");
  const dec = iD < 0 ? "" : can.slice(iD, iD + 3500);
  if (!dec) fallos.push("no existe `rechazoComiteDecision`: la política del rechazo tiene que ser pura para poder probarla");
  else {
    if (!dec.includes("recortarAsignacion(")) fallos.push("el rechazo no recorta la asignación: la versión no encogería (regla 13)");
    if (!dec.includes('motivo: "comite_rechazo"')) fallos.push("la versión del rechazo no lleva el motivo `comite_rechazo`");
    if (!dec.includes('closeReason: "committee_reject"')) fallos.push("en cero, el rechazo no pierde con la causa «Línea rechazada por el comité» (regla 5)");
    if (!dec.includes("...(firmada ? {reabierta: marca} : {})")) fallos.push("el rechazo no revoca la firma al reabrir (regla 1): el cliente firmó un paquete que ya no es el que se va a cursar");
    if (!dec.includes('stage: "oferta"')) fallos.push("el rechazo no devuelve la operación a Oferta para una nueva firma");
  }
  if (!/\{k: "committee_reject", label: "Línea rechazada por el comité", result: "lost"\}/.test(can)) fallos.push("`CLOSE_REASONS` no declara la causa «Línea rechazada por el comité»");
  // 3 · El manejador ESCRIBE lo que la decisión dice, y «Consultar estados» lo dispara.
  const iA = can.indexOf("const aplicarRechazoComite = (sol) => {");
  const ap = iA < 0 ? "" : can.slice(iA, iA + 3000);
  if (!ap) fallos.push("no existe `aplicarRechazoComite`: la decisión existiría y nadie la aplicaría");
  else {
    if (!ap.includes("const dec = rechazoComiteDecision(d0, sol, repoSimVersions.get(id) || []);")) fallos.push("`aplicarRechazoComite` no decide con `rechazoComiteDecision` sobre las versiones del negocio");
    if (!ap.includes("if (dec.version) repoSimVersions.push(id, dec.version);")) fallos.push("el rechazo no deja versión: no habría evidencia de por qué bajó el monto");
    if (!ap.includes("reject(id, dec.closeReason);")) fallos.push("en cero, el rechazo no pierde la operación por el camino de la pérdida (regla 5)");
    if (!ap.includes("setDeals((prev) => prev.map((d) => (d.id === id ? {...d, ...patch} : d)));")) fallos.push("el rechazo no parchea el negocio: ni retira ni reabre");
  }
  if (!can.includes('if (est === "Rechazada" && onRechazo && !s.rechazoAplicado) onRechazo(s);')) fallos.push("«Consultar estados» no aplica el rechazo: la bandeja diría «Rechazada» y la operación seguiría firmada sobre una línea que no existe");
  if (!can.includes("<LineasView soloExec={soloExec} usuario={usuario} onRechazo={aplicarRechazoComite} />")) fallos.push("`LineasView` no recibe `onRechazo={aplicarRechazoComite}`");
  // 4 · La bandeja pinta «Rechazada».
  if (!/Rechazada: \{bg: "#fef2f2", fg: "#B91C1C"\}/.test(can)) fallos.push("la bandeja de solicitudes no pinta «Rechazada»: caería al color de «En gestión»");
  return fallos;
}

test("regla 68: el comité que rechaza retira, versiona y reabre; en cero pierde con causa; «Consultar estados» lo aplica", () => {
  assert.deepEqual(auditarRegla68(jsx), []);
});

const MUTANTES = [
  ["la API 3 deja de rechazar", (c) => c.replace('const fin = r === 0 ? "Observada" : r === 1 ? "Rechazada" : "Aprobada";', 'const fin = r === 0 ? "Observada" : "Aprobada";')],
  ["el rechazo no revoca la firma", (c) => c.replace("...(firmada ? {reabierta: marca} : {})", "...{}")],
  ["en cero no se pierde con causa", (c) => c.replace('closeReason: "committee_reject"', 'closeReason: "other"')],
  ["«Consultar estados» no aplica el rechazo", (c) => c.replace('if (est === "Rechazada" && onRechazo && !s.rechazoAplicado) onRechazo(s);', "")],
  ["el manejador no deja versión", (c) => c.replace("if (dec.version) repoSimVersions.push(id, dec.version);", "")],
  // El mapa de colores vive en dos componentes: la sonda lo borra de los dos, o el gate encontraría el otro.
  ["la bandeja no pinta el rechazo", (c) => c.split('Rechazada: {bg: "#fef2f2", fg: "#B91C1C"}').join("")],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const can = canonico(jsx);
    const mut = mutar(can);
    assert.notEqual(mut, can, "la sonda no plantó nada: el texto quedó igual");
    assert.ok(auditarRegla68(mut).length > 0, "el gate no cazó la violación plantada");
  });
