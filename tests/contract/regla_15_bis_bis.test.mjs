/* Gate de contrato de la regla 15-bis-bis sobre el TEXTO del fuente: la suite prueba al receptor, pero que el
   EMISOR exista dentro de `cerrarOferta` y que el listener del tubo rutee `nex-solicitud` a `recibirSolicitudLinea`
   sólo se ve leyendo el fuente (viven dentro de componentes de React, sin función expuesta). Tres propiedades,
   cada una con sonda negativa —y cada sonda comprueba que plantó algo, para no comparar el fuente consigo mismo—:
   (1) `cerrarOferta` postea `nex-solicitud` con el registro que `api1Inyeccion` acaba de dejar en
   `SOLICITUDES_LINEA[0]` —tal cual, su copia superficial, o una variable local asignada desde él DESPUÉS de
   `api1Inyeccion(`—; (2) el listener de mensajes del TUBO (el `onMsg` del `useEffect` de `PipelineComercial`, y
   sólo ése) maneja `nex-solicitud` con `recibirSolicitudLinea(m.registro)`; (3) el receptor es de nivel módulo,
   deduplica por la SOLICITUD (`mismaSolicitudComite`), le asigna un id libre cuando el propuesto viene
   tomado por otra, y NO rearma (no llama a `api1Inyeccion`), se llame como se llame
   su parámetro. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Sustitución literal que exige que `viejo` exista (una sonda que no planta nada no prueba nada) y no interpreta
   `$&`/`$1` en el reemplazo. */
function sustituir(src, viejo, nuevo) {
  assert.ok(src.includes(viejo), `la sonda no encontró qué plantar: ${String(viejo).slice(0, 80)}`);
  return src.replace(viejo, () => nuevo);
}

/* Tramo de una función flecha declarada con `  const nombre = (` a 2 espacios, hasta su `  };` de cierre. */
export function tramoFlecha(src, nombre) {
  const L = src.split("\n");
  const ini = L.findIndex((l) => l.startsWith(`  const ${nombre} = (`));
  if (ini < 0) return null;
  const fin = L.findIndex((l, i) => i > ini && l === "  };");
  return fin < 0 ? null : L.slice(ini, fin + 1).join("\n");
}
/* El registro que puede viajar: `SOLICITUDES_LINEA[0]` tal cual o su copia superficial. */
const ES_REGISTRO_CERO = /^(?:SOLICITUDES_LINEA\[0\]|\{\s*\.\.\.SOLICITUDES_LINEA\[0\]\s*\})$/;
export function emisorEnCerrarOferta(src) {
  const t = tramoFlecha(src, "cerrarOferta");
  if (!t) return { ok: false, motivo: "no encuentro `const cerrarOferta = (`" };
  const iIny = t.indexOf("api1Inyeccion(");
  if (iIny < 0) return { ok: false, motivo: "cerrarOferta no llama a api1Inyeccion" };
  // `registro: <expr>` o la abreviatura `registro` (= la variable local del mismo nombre).
  const post = t.match(/postMessage\(\{\s*type:\s*"nex-solicitud",\s*registro\s*(?::\s*(\{\s*\.\.\.[^}]*\}|[^,}\s]+))?\s*\}/);
  if (!post) return { ok: false, motivo: "cerrarOferta no postea `nex-solicitud` con un `registro`" };
  const iPost = post.index;
  if (iPost < iIny) return { ok: false, motivo: "el postMessage va ANTES de api1Inyeccion: postearía la solicitud anterior" };
  let expr = (post[1] || "registro").trim();
  if (ES_REGISTRO_CERO.test(expr)) return { ok: true, registro: expr };
  if (!/^[A-Za-z_$][\w$]*$/.test(expr))
    return { ok: false, motivo: `el registro posteado es \`${expr}\`: ni SOLICITUDES_LINEA[0] ni una variable local asignada desde él` };
  const asig = t.match(new RegExp(`(?:const|let)\\s+${expr.replace(/\$/g, "\\$")}\\s*=\\s*([^;\\n]+);`));
  if (!asig) return { ok: false, motivo: `\`${expr}\` no se asigna dentro de cerrarOferta` };
  const valor = asig[1].trim();
  if (!ES_REGISTRO_CERO.test(valor))
    return { ok: false, motivo: `\`${expr} = ${valor}\`: no es SOLICITUDES_LINEA[0], el registro que api1Inyeccion acaba de dejar` };
  if (asig.index < iIny) return { ok: false, motivo: `\`${expr}\` se asigna ANTES de api1Inyeccion: sería la solicitud anterior` };
  if (asig.index > iPost) return { ok: false, motivo: `\`${expr}\` se asigna DESPUÉS del postMessage` };
  return { ok: true, registro: `${expr} = ${valor}` };
}
/* El listener de mensajes del TUBO: el `onMsg` del useEffect de `PipelineComercial` —desde
   `    const onMsg = (ev) => {` hasta su `    };`, con `window.addEventListener("message", onMsg)` a continuación—.
   Acotarlo ahí evita que un comentario, o un listener de OTRO componente con el mismo texto, cuente como el rutéo. */
export function tramoListenerTubo(src) {
  const L = src.split("\n");
  const iApp = L.findIndex((l) => /^export default function PipelineComercial\(/.test(l));
  if (iApp < 0) return { error: "no encuentro `export default function PipelineComercial(`" };
  const ini = L.findIndex((l, i) => i > iApp && l === "    const onMsg = (ev) => {");
  if (ini < 0) return { error: "PipelineComercial no declara `const onMsg = (ev) => {`" };
  const fin = L.findIndex((l, i) => i > ini && l === "    };");
  if (fin < 0) return { error: "el `onMsg` de PipelineComercial no cierra con `    };`" };
  if (!L.slice(fin + 1, fin + 4).some((l) => /window\.addEventListener\("message", onMsg\)/.test(l)))
    return { error: 'tras el cierre de onMsg no viene `window.addEventListener("message", onMsg)`: el tramo no es el listener' };
  return { tramo: L.slice(ini, fin + 1).join("\n"), desde: ini + 1, hasta: fin + 1 };
}
export function listenerRutea(src) {
  const t = tramoListenerTubo(src);
  if (t.error) return { ok: false, motivo: t.error };
  const m = t.tramo.match(/m\.type === "nex-solicitud"[^\n]*\n([^\n]*)/);
  if (!m) return { ok: false, motivo: `el onMsg del tubo (líneas ${t.desde}–${t.hasta}) no tiene rama \`m.type === "nex-solicitud"\`` };
  if (!/recibirSolicitudLinea\(m\.registro\)/.test(m[0])) return { ok: false, motivo: "la rama nex-solicitud no llama a recibirSolicitudLinea(m.registro)" };
  return { ok: true, lineas: `${t.desde}–${t.hasta}` };
}
export function receptorNoRearma(src) {
  const m = src.match(/^function recibirSolicitudLinea\(([A-Za-z_$][\w$]*)\) \{\n([\s\S]*?)^\}/m);
  if (!m) return { ok: false, motivo: "recibirSolicitudLinea no es una función de nivel módulo con un parámetro" };
  const p = m[1],
    cuerpo = m[2],
    P = p.replace(/\$/g, "\\$");
  if (!new RegExp(`\\b${P}\\.idProceso`).test(cuerpo)) return { ok: false, motivo: `el receptor no mira ${p}.idProceso` };
  if (!new RegExp(`\\.find\\(.*idProceso === ${P}\\.idProceso`).test(cuerpo))
    return { ok: false, motivo: "el receptor no busca el id que ya está en la bandeja" };
  // La identidad de una solicitud es su CONTENIDO, no su id: `SOLIC_SEQ` arranca en 0 en cada pestaña, así
  // que dos solicitudes distintas proponen el mismo. Deduplicar por id perdía la segunda en silencio.
  if (!/mismaSolicitudComite\(/.test(cuerpo))
    return {
      ok: false,
      motivo:
        "el receptor deduplica por el ID y no por la SOLICITUD (`mismaSolicitudComite`): dos pestañas proponen el mismo id y perdería una petición al comité",
    };
  if (!/siguienteIdProceso\(\)/.test(cuerpo))
    return { ok: false, motivo: "el receptor no le asigna un id LIBRE a la solicitud que llega con el id tomado: la descartaría" };
  if (!/idProcesoOrigen/.test(cuerpo))
    return {
      ok: false,
      motivo: "el receptor no conserva `idProcesoOrigen`: la bitácora de la otra pestaña cita el id propuesto y quedaría sin correspondencia (regla 24)",
    };
  // Sigue sin REARMAR: viaja el registro ya armado. Re-etiquetar no es rearmar, pero llamar a
  // `api1Inyeccion` sí — construiría otro registro y perdería lo que la pestaña calculó.
  if (/api1Inyeccion\(/.test(cuerpo)) return { ok: false, motivo: "el receptor REARMA la solicitud (api1Inyeccion): perdería el registro que viajó" };
  return { ok: true, parametro: p };
}

test("15-bis-bis · cerrarOferta postea `nex-solicitud` con el registro recién inyectado (SOLICITUDES_LINEA[0])", () => {
  const r = emisorEnCerrarOferta(jsx);
  assert.ok(r.ok, r.motivo);
  assert.equal(r.registro, "SOLICITUDES_LINEA[0]");
  const t = tramoFlecha(jsx, "cerrarOferta");
  const linea = t.split("\n").find((l) => l.includes('type: "nex-solicitud"'));
  const LINEA_INY = "const idProc = api1Inyeccion(sol);";
  const enTramo = (nuevoTramo) => sustituir(jsx, t, nuevoTramo);
  // Sondas negativas: sin el postMessage, con él antes de inyectar, o posteando otra cosa, el gate lo caza.
  assert.equal(emisorEnCerrarOferta(enTramo(sustituir(t, linea + "\n", ""))).ok, false, "sonda: quitado el postMessage el gate tiene que fallar");
  const antes = sustituir(sustituir(t, linea + "\n", ""), LINEA_INY, linea + "\n          " + LINEA_INY);
  assert.equal(emisorEnCerrarOferta(enTramo(antes)).ok, false, "sonda: el postMessage antes de api1Inyeccion tiene que fallar");
  assert.equal(
    emisorEnCerrarOferta(enTramo(sustituir(t, "registro: SOLICITUDES_LINEA[0]", "registro: idProc"))).ok,
    false,
    "sonda: postear el id en vez del registro tiene que fallar",
  );
  assert.equal(
    emisorEnCerrarOferta(enTramo(sustituir(t, "registro: SOLICITUDES_LINEA[0]", "registro: sol"))).ok,
    false,
    "sonda: postear los datos de entrada (rearmables) en vez del registro tiene que fallar",
  );
  // Refactor CONFORME: el registro va por una variable local asignada desde SOLICITUDES_LINEA[0] tras inyectar…
  const conVar = sustituir(
    sustituir(t, LINEA_INY, LINEA_INY + "\n          const registroNuevo = SOLICITUDES_LINEA[0];"),
    "registro: SOLICITUDES_LINEA[0]",
    "registro: registroNuevo",
  );
  const rv = emisorEnCerrarOferta(enTramo(conVar));
  assert.ok(rv.ok, `refactor conforme rechazado: ${rv.motivo}`);
  assert.equal(rv.registro, "registroNuevo = SOLICITUDES_LINEA[0]");
  // …pero esa variable asignada ANTES de inyectar, o desde otra cosa, sigue fallando.
  const varAntes = sustituir(
    sustituir(t, LINEA_INY, "const registroNuevo = SOLICITUDES_LINEA[0];\n          " + LINEA_INY),
    "registro: SOLICITUDES_LINEA[0]",
    "registro: registroNuevo",
  );
  assert.equal(emisorEnCerrarOferta(enTramo(varAntes)).ok, false, "sonda: la variable asignada antes de api1Inyeccion tiene que fallar");
  const varOtra = sustituir(
    sustituir(t, LINEA_INY, LINEA_INY + "\n          const registroNuevo = sol;"),
    "registro: SOLICITUDES_LINEA[0]",
    "registro: registroNuevo",
  );
  assert.equal(emisorEnCerrarOferta(enTramo(varOtra)).ok, false, "sonda: la variable asignada desde `sol` tiene que fallar");
});

test("15-bis-bis · el listener del tubo (onMsg de PipelineComercial) rutea `nex-solicitud` a recibirSolicitudLinea(m.registro)", () => {
  const r = listenerRutea(jsx);
  assert.ok(r.ok, r.motivo);
  const t = tramoListenerTubo(jsx);
  assert.ok(t.tramo.includes('m.type === "nex-solicitud"'), "la rama tiene que estar DENTRO del onMsg de PipelineComercial");
  assert.equal(
    listenerRutea(sustituir(jsx, "recibirSolicitudLinea(m.registro)", "api1Inyeccion(m.registro)")).ok,
    false,
    "sonda: rearmar con api1Inyeccion en el listener tiene que fallar",
  );
  const sinRama = sustituir(jsx, 'm.type === "nex-solicitud"', 'm.type === "nex-otra"');
  assert.equal(listenerRutea(sinRama).ok, false, "sonda: sin la rama tiene que fallar");
  // Un señuelo FUERA del listener del tubo (un comentario al inicio del fuente, o un listener de otro componente)
  // con el mismo texto no cuenta: antes el gate tomaba la primera aparición en todo el fuente y esto lo engañaba.
  const señuelo = '// if (m && m.type === "nex-solicitud" && m.registro) {\n//   if (recibirSolicitudLinea(m.registro)) setDeals((prev) => prev.slice());\n';
  assert.equal(listenerRutea(señuelo + sinRama).ok, false, "sonda: un señuelo fuera del onMsg del tubo no puede satisfacer el gate");
  assert.equal(listenerRutea(señuelo + jsx).ok, true, "el señuelo no debe estorbar cuando la rama real existe");
  assert.equal(
    listenerRutea(sustituir(jsx, "export default function PipelineComercial(", "export default function PipelineComercialX(")).ok,
    false,
    "sonda: sin PipelineComercial no hay listener del tubo que gatear",
  );
});

test("15-bis-bis · recibirSolicitudLinea es de nivel módulo, deduplica por la SOLICITUD, asigna un id libre y no rearma", () => {
  const r = receptorNoRearma(jsx);
  assert.ok(r.ok, r.motivo);
  assert.equal(r.parametro, "reg");
  const cuerpoRearma = sustituir(jsx, "    SOLICITUDES_LINEA.unshift(reg);\n    return true;", "    api1Inyeccion(reg);\n    return true;");
  assert.equal(receptorNoRearma(cuerpoRearma).ok, false, "sonda: un receptor que rearma tiene que fallar");
  const sinDedup = sustituir(jsx, "  if (choque && mismaSolicitudComite(choque, reg)) return false;", "  if (choque) return false;");
  assert.equal(receptorNoRearma(sinDedup).ok, false, "sonda: volver a deduplicar por el ID tiene que fallar");
  const sinAsignar = sustituir(jsx, "  const idNuevo = siguienteIdProceso();", "  const idNuevo = reg.idProceso;");
  assert.equal(receptorNoRearma(sinAsignar).ok, false, "sonda: no asignar un id libre tiene que fallar");
  const sinTraza = sustituir(jsx, "idProcesoOrigen: reg.idProceso });", "noOrigen: reg.idProceso });").replace(/idProcesoOrigen/g, "noOrigen");
  assert.equal(receptorNoRearma(sinTraza).ok, false, "sonda: perder la procedencia tiene que fallar");
  const anidado = sustituir(jsx, "\nfunction recibirSolicitudLinea(reg) {", "\nconst _envoltura = () => {\nfunction recibirSolicitudLinea(reg) {").replace(
    "    SOLICITUDES_LINEA.unshift(reg);\n    return true;\n}",
    "    SOLICITUDES_LINEA.unshift(reg);\n    return true;\n}\n};",
  );
  assert.equal(
    receptorNoRearma(anidado.replace(/^function recibirSolicitudLinea/m, "  function recibirSolicitudLinea")).ok,
    false,
    "sonda: un receptor que no es de nivel módulo tiene que fallar",
  );
  // Refactor CONFORME: el parámetro se llama de otra forma y el gate no lo rechaza.
  const fn = jsx.match(/^function recibirSolicitudLinea\(reg\) \{\n[\s\S]*?^\}/m)[0];
  const renombrado = sustituir(jsx, fn, fn.replace(/\breg\b/g, "registro"));
  const rr = receptorNoRearma(renombrado);
  assert.ok(rr.ok, `refactor conforme rechazado: ${rr.motivo}`);
  assert.equal(rr.parametro, "registro");
});
