/* Gate de contrato de la regla 51 (el estado del otorgamiento cruza de pestaña, con storage Y aviso),
   sobre el TEXTO del fuente. Lo que esta regla fija no se puede probar desde la suite: hacen falta DOS
   documentos, y la suite corre en uno. El caso 155 cubre la mitad que sí se puede —que el estado se
   persiste y que solicitar una excepción habilita la bandeja—; esta es la otra mitad: que el aviso
   salga del PUNTO ÚNICO y no del call site, que el receptor no lo re-difunda, y que releer no deje los
   alias mirando una tabla vieja.

   El defecto que cierra era una ASIMETRÍA: el botón «Pre-evaluación» tenía su postMessage escrito a
   mano junto al onClick y el otro camino —solicitar la aprobación de UNA excepción— no lo tenía. Un
   gate que mire «existe un postMessage en alguna parte» pasa con el defecto puesto, así que lo que se
   fija es DÓNDE vive. Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo de una función/arrow de nivel de bloque, contando llaves desde su declaración. */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  let prof = 0,
    visto = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "{") {
      prof++;
      visto = true;
    } else if (c === "}") {
      prof--;
      if (visto && prof === 0) return src.slice(i, j + 1);
    }
  }
  return null;
}

export function auditarRegla49(src) {
  const fallos = [];
  const can = canonico(src);

  // 1 · EL ESTADO ES REPOSITORIO, NO UN `let` DE MÓDULO. Un `let` es memoria de CADA documento, y el
  //     detalle es pestaña propia: es toda la causa del defecto.
  if (/^let PRE_EVAL = \{\};$/m.test(src)) fallos.push("`PRE_EVAL` vuelve a ser un objeto de módulo: es memoria de CADA documento y el detalle es pestaña propia, así que el aprobador no ve la bandeja");
  if (!/^let PRE_EVAL = repoPreEval\.all\(\);$/m.test(src)) fallos.push("`PRE_EVAL` no es el alias de `repoPreEval`: sin repositorio la pre-evaluación no sobrevive a cerrar la pestaña");
  if (/^let HILOS = \[\];/m.test(src)) fallos.push("`HILOS` vuelve a ser un array de módulo: lo que se escribe desde el detalle no llega nunca al Centro de mensajería, que se pinta en el tubo");
  if (!/^let HILOS = repoHilos\.get\("lista"\) \|\| \[\];/m.test(src)) fallos.push("`HILOS` no se hidrata de `repoHilos`");
  for (const r of ["repoPreEval", "repoHilos"]) if (!new RegExp(`const ${r} = crearRepo\\("`).test(src)) fallos.push(`no existe el repositorio \`${r}\``);
  // …y `reapuntarRepos` los reapunta: al cambiar de tenant, un alias que no se reapunta sigue
  //    mostrando los datos del tenant anterior.
  const rr = cuerpoDe(src, "function reapuntarRepos() {");
  if (rr) {
    if (!/PRE_EVAL = repoPreEval\.all\(\);/.test(rr)) fallos.push("`reapuntarRepos` no reapunta `PRE_EVAL`: al cambiar de tenant seguiría mostrando el anterior");
    if (!/HILOS = repoHilos\.get\("lista"\) \|\| \[\];/.test(rr)) fallos.push("`reapuntarRepos` no reapunta `HILOS`");
  }

  // 2 · EL AVISO SALE DEL PUNTO ÚNICO, no del call site. Es el defecto exacto: el botón lo tenía y el
  //     otro camino no.
  if (!/^function avisarOpener\(mensaje\) \{/m.test(src)) fallos.push("no existe `avisarOpener` de nivel módulo: sin un punto único, cada call site escribe el suyo y el que se agrega después se olvida");
  const sp = cuerpoDe(src, "function setPreEval(dealId, code, on, difundir = true) {");
  if (!sp) fallos.push("`setPreEval` no acepta `difundir`: el receptor del aviso tiene que poder aplicarlo sin volver a contarlo");
  else {
    if (!/repoPreEval\.set\(dealId,/.test(sp) || !/repoPreEval\.del\(dealId\)/.test(sp)) fallos.push("`setPreEval` no escribe en `repoPreEval` en las dos direcciones (encender y apagar)");
    if (!/if \(difundir\) avisarOpener\(\{type: "nex-preeval", dealId, on: !!on, por: code\}\);/.test(canonico(sp)))
      fallos.push("`setPreEval` no difunde: el aviso vuelve a depender de que cada call site se acuerde, que es justo lo que se rompió");
  }
  const he = cuerpoDe(src, "function hiloEnviar(h, deCode, texto, arch, menciones) {");
  if (he) {
    if (!/guardarHilos\(\);/.test(he)) fallos.push("`hiloEnviar` no persiste el hilo: no sobreviviría a cerrar la pestaña del detalle");
    if (!/avisarOpener\(\{type: "nex-hilo", hilo: h\}\);/.test(canonico(he))) fallos.push("`hiloEnviar` no avisa al opener: el Centro de mensajería de la pestaña abierta no se entera");
  }
  // …y el BOTÓN ya no lleva su propio postMessage: si vuelve, vuelve la asimetría.
  if (/avisarOpenerPreEval/.test(src)) fallos.push("vuelve `avisarOpenerPreEval` junto al botón: el aviso tiene que salir de `setPreEval`, que es por donde pasan LOS DOS caminos");

  // 3 · EL RECEPTOR NO RE-DIFUNDE. Dos pestañas que se tengan la una a la otra como opener se
  //     rebotarían el aviso indefinidamente.
  if (!/setPreEval\(m\.dealId, m\.por \|\| "EJ", !!m\.on, false\);/.test(can)) fallos.push("el handler de `nex-preeval` re-difunde el aviso que acaba de recibir: dos pestañas se lo rebotarían");
  if (!/refrescarEstadoOtorgamiento\(\);/.test(can)) fallos.push("el handler no relee el estado del otorgamiento: los repositorios cargan el storage UNA vez, así que la pestaña abierta seguiría con lo que leyó al abrirse");

  // 4 · RELEER RELLENA LA TABLA DEL TENANT, no la reemplaza. Los alias apuntan a ESE objeto: la
  //     primera versión de `recargar` lo reemplazaba y los dejaba leyendo la tabla vieja.
  const rc = cuerpoDe(src, "    recargar() {");
  if (!rc) fallos.push("el repositorio no expone `recargar()`: sin él, una pestaña ya abierta nunca ve lo que otra escribió");
  else {
    if (!/for \(const t of Object\.keys\(datos\)\)/.test(rc)) fallos.push("`recargar` no recorre los tenants: reemplazar `datos` entero deja a los alias mirando la tabla vieja");
    if (!/for \(const k of Object\.keys\(dest\)\) delete dest\[k\];/.test(rc) || !/Object\.assign\(dest, src\);/.test(rc))
      fallos.push("`recargar` no vacía y rellena la MISMA tabla del tenant: es lo que mantiene vivos los alias `PRE_EVAL`/`VISADO_STATE`");
  }
  const re = cuerpoDe(src, "function refrescarEstadoOtorgamiento() {");
  if (re) {
    for (const r of ["repoVisado", "repoSolicitudExc", "repoPreEval", "repoHilos"]) if (!new RegExp(`\\b${r}\\b`).test(re)) fallos.push(`\`refrescarEstadoOtorgamiento\` no relee \`${r}\``);
    if (!/reapuntarRepos\(\);/.test(re)) fallos.push("`refrescarEstadoOtorgamiento` no reapunta ni invalida el visado memoizado: la mesa seguiría decidiendo con el veredicto cacheado");
  }

  // 5 · UN SOLO BUCLE DE «QUIÉN PUEDE FIRMAR ESTO». Era el tercero escrito a mano, y miraba
  //     `ATRIB_USUARIO` —o sea, se saltaba los reemplazos por vacaciones (regla 19)—.
  const sa = cuerpoDe(src, "function solicitarAprobacionExc(deal, x, execCode, comentario, archivos, sinComentarios) {");
  if (sa) {
    if (/\bATRIB_USUARIO\b/.test(sa)) fallos.push("`solicitarAprobacionExc` vuelve a recorrer `ATRIB_USUARIO`: se salta los reemplazos por vacaciones y le escribe a quien está de vacaciones");
    if (!/const dests = codigosAprobadoresDe\(\[x\]\);/.test(canonico(sa))) fallos.push("`solicitarAprobacionExc` no resuelve sus destinatarios con `codigosAprobadoresDe`");
    if (!/if \(!tienePreEval\(deal\.id\)\) setPreEval\(deal\.id, execCode, true\);/.test(canonico(sa)))
      fallos.push("solicitar una excepción ya no habilita la bandeja: `excEnBandeja` consulta `tienePreEval`, así que el aprobador no podría visarla");
  }
  // REGLA 55 · LA FIRMA DEL CLIENTE TAMBIÉN CRUZA. El portal de curse le postea a la pestaña que lo
  // abrió —la del DETALLE—, así que `confirmarCierre` corre allá: sin avisar al tubo, el detalle
  // mostraba «Otorgamiento» y el tubo seguía en «Negociación» sobre la misma operación, y la bandeja
  // del aprobador la trataba como no aceptada. Se exige que el updater arme un PATCH y lo difunda,
  // no que devuelva el deal entero: sin patch no hay nada que mandar.
  const cc = cuerpoDe(src, "const confirmarCierre = (id, tasa, opts, usuario) => {");
  if (!cc) fallos.push("no existe `confirmarCierre`");
  else {
    if (!/const patch = \{/.test(cc))
      fallos.push("`confirmarCierre` no arma un PATCH: devolviendo el deal entero no hay qué mandarle al tubo, y la etapa que la firma mueve se queda en la pestaña del detalle");
    if (!/avisarTubo\(id, patch\);/.test(cc))
      fallos.push("`confirmarCierre` no avisa al tubo: la firma del cliente llega a la pestaña del detalle y el tubo se queda con la etapa vieja (regla 55)");
    if (!/return \{\s*\.\.\.d,\s*\.\.\.patch\s*\};/.test(cc))
      fallos.push("`confirmarCierre` aplica algo distinto de lo que difunde: el patch y lo que guarda tienen que ser lo mismo o las dos pestañas divergen");
  }
  return fallos;
}

test("51 · el estado del otorgamiento cruza de pestaña: repositorio, aviso desde el punto único y relectura que no rompe los alias", () => {
  assert.deepEqual(auditarRegla49(jsx), []);
});

/* Quita el `avisarTubo(id, patch);` del cuerpo de UNA función, sin tocar el de las demás. */
function sinAviso(src, firma) {
  const cuerpo = cuerpoDe(src, firma);
  if (!cuerpo) throw new Error(`no encuentro ${firma}`);
  return src.replace(cuerpo, cuerpo.replace("      avisarTubo(id, patch);\n", ""));
}

const MUTANTES = {
  // La mutación va sobre el cuerpo de `confirmarCierre` y no sobre la primera coincidencia del fuente:
  // desde la regla 58 hay TRES funciones que difunden un `patch` con las mismas dos líneas, y un
  // `replace` a secas mutaba la primera —`publicarOferta`— dejando intacta la que esta sonda vigila.
  "la firma del cliente deja de cruzar al tubo": { src: sinAviso(jsx, "const confirmarCierre = (id, tasa, opts, usuario) => {"), re: /no avisa al tubo/ },
  "el cierre vuelve a devolver el deal entero": { src: jsx.replace("      const patch = {\n        reabierta: undefined,", "      return {\n        ...d,\n        reabierta: undefined,"), re: /no arma un PATCH|aplica algo distinto/ },
  "la pre-evaluación vuelve a ser un objeto de módulo": { src: jsx.replace("let PRE_EVAL = repoPreEval.all();", "let PRE_EVAL = {};"), re: /vuelve a ser un objeto de módulo|no es el alias de `repoPreEval`/ },
  "los hilos vuelven a ser un array de módulo": { src: jsx.replace('let HILOS = repoHilos.get("lista") || [];', "let HILOS = [];"), re: /vuelve a ser un array de módulo|no se hidrata/ },
  "setPreEval deja de difundir": { src: jsx.replace('  if (difundir) avisarOpener({ type: "nex-preeval", dealId, on: !!on, por: code });', ""), re: /`setPreEval` no difunde/ },
  "hiloEnviar deja de avisar": { src: jsx.replace('  avisarOpener({ type: "nex-hilo", hilo: h });', ""), re: /no avisa al opener/ },
  "hiloEnviar deja de persistir": { src: jsx.replace("  // Storage para que sobreviva a cerrar la pestaña; aviso para que la que está abierta se entere.\n  guardarHilos();", "  // …"), re: /no persiste el hilo/ },
  "vuelve el aviso escrito a mano junto al botón": {
    src: jsx.replace("                const enviarPreEval = () => {", '                const avisarOpenerPreEval = (x) => x;\n                const enviarPreEval = () => {'),
    re: /vuelve `avisarOpenerPreEval`/,
  },
  "el receptor re-difunde": { src: jsx.replace('setPreEval(m.dealId, m.por || "EJ", !!m.on, false);', 'setPreEval(m.dealId, m.por || "EJ", !!m.on);'), re: /re-difunde el aviso/ },
  "el receptor no relee": { src: jsx.replace("        refrescarEstadoOtorgamiento();\n", ""), re: /no relee el estado del otorgamiento/ },
  "recargar reemplaza la tabla en vez de rellenarla": {
    src: jsx.replace("      for (const t of Object.keys(datos)) {", "      for (const t of []) {"),
    re: /no recorre los tenants/,
  },
  "recargar pierde el objeto del tenant": {
    src: jsx.replace("        for (const k of Object.keys(dest)) delete dest[k];", "        datos[t] = {};"),
    re: /no vacía y rellena la MISMA tabla/,
  },
  "refrescar deja de invalidar el visado": { src: jsx.replace("  for (const r of [repoVisado, repoVisadoDetalle, repoSolicitudExc, repoPreEval, repoOtorgEventos, repoHilos]) r.recargar();\n  reapuntarRepos();", "  for (const r of [repoVisado, repoVisadoDetalle, repoSolicitudExc, repoPreEval, repoOtorgEventos, repoHilos]) r.recargar();"), re: /no reapunta ni invalida el visado/ },
  "solicitar una excepción deja de habilitar la bandeja": {
    src: jsx.replace("  if (!tienePreEval(deal.id)) setPreEval(deal.id, execCode, true); // habilita la bandeja para que el apoderado pueda visar", ""),
    re: /ya no habilita la bandeja/,
  },
  "solicitarAprobacionExc rearma su bucle sobre ATRIB_USUARIO": {
    src: jsx.replace("  const dests = codigosAprobadoresDe([x]);", '  const dests = Object.keys(ATRIB_USUARIO).filter((k) => k !== "ADMIN");'),
    re: /vuelve a recorrer `ATRIB_USUARIO`|no resuelve sus destinatarios/,
  },
  "reapuntarRepos olvida la pre-evaluación": { src: jsx.replace("  PRE_EVAL = repoPreEval.all();\n", ""), re: /no reapunta `PRE_EVAL`/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`51 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla49(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
