/* Gate de contrato de la regla 15 (Solicitud de línea: NEX sólo INYECTA y consulta; resuelve el sistema
   externo; una solicitud por línea; la bandeja se llama «Solicitudes»), sobre el TEXTO del fuente, para lo
   que la suite no alcanza porque vive en React: (1) el rótulo de la pestaña es «Solicitudes» y no «En
   proceso»; (2) la única puerta que constituye una línea es la respuesta del sistema externo
   (`constituirLinea` se llama SÓLO dentro de `api3EstadoProceso`, bajo una condición que habla de
   «Aprobada» y de `constituida`; `api1Inyeccion` no escribe veredicto ni cartera: deja «En gestión»);
   (3) «una solicitud por línea» en su camino REAL: el wizard manda `lineaId` de la línea desde la que se
   abrió, la pantalla de Vigentes deriva `conSolicitud` de la bandeja por ese `lineaId`, y la fila en curso
   no abre el wizard ni su menú de acciones.
   Son gates de REGLA, no snapshots: cada regex exige la propiedad y tolera otra forma de escribirla (se
   prueba abajo con una refactorización y con el arreglo de un defecto conocido). La SEMÁNTICA —«Observada»
   nunca constituye, «Aprobada» constituye una sola vez, un estado escrito por NEX no vale— la fija el caso
   de la suite de esta misma regla: un `LINEAS_DATA.push` directo en api1 lo caza también acá, pero una
   escritura de cartera por otro camino sólo la caza la suite. Cada gate se prueba primero contra una
   violación PLANTADA. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una función de nivel módulo: hasta la siguiente declaración a columna 0 (guarda de la poda). */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^(?:function|const) ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(m.index, fin < 0 ? undefined : m.index + m[0].length + fin);
}
export const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/* 1 · La pestaña de las solicitudes nuevas se rotula «Solicitudes». La clave interna sigue siendo
   `enproceso` (es lo que compara `setSub`), lo que la regla fija es lo que el ejecutivo LEE. */
export function pestanaSolicitudes(src) {
  const m = src.match(/\[\["vigentes", "Vigentes", \w+\], \["enproceso", (`[^`]*`|"[^"]*"), \w+\]\]/);
  if (!m) return ["no encuentro la definición de las dos pestañas de Líneas ([\"vigentes\", …], [\"enproceso\", …])"];
  const rotulo = m[1].slice(1, -1);
  const fallos = [];
  if (!/^Solicitudes\b/.test(rotulo)) fallos.push(`la pestaña de solicitudes se rotula «${rotulo}» y tiene que empezar con «Solicitudes»`);
  if (/en proceso/i.test(rotulo)) fallos.push("«en proceso» describe un estado del sistema externo, no lo que la bandeja contiene");
  return fallos;
}

/* 2 · Quién resuelve. `api1Inyeccion` deja el registro «En gestión» y no sabe de veredictos, de constituir
   ni de la cartera; `constituirLinea(` fuera de su definición sólo se invoca dentro de `api3EstadoProceso`,
   que es el mock del sistema externo, y ahí bajo una condición que nombra «Aprobada» y `constituida`
   (la condición puede vivir en una const: lo que se exige es que el `if` que guarda la llamada hable de
   las dos cosas). */
export function soloElExternoResuelve(src) {
  const fallos = [];
  const api1 = cuerpoDe(src, "api1Inyeccion"), api3 = cuerpoDe(src, "api3EstadoProceso");
  if (!api1) fallos.push("api1Inyeccion no está a nivel módulo");
  if (!api3) fallos.push("api3EstadoProceso no está a nivel módulo");
  if (api1) {
    const c = sinComentarios(api1);
    if (!/estado: "En gestión"/.test(c)) fallos.push("api1Inyeccion no deja la solicitud «En gestión»");
    if (/constituirLinea\(|"Aprobada"|"Observada"|constituida/.test(c)) fallos.push("api1Inyeccion decide o constituye: eso es del sistema externo");
    if (/LINEAS_DATA|_lineaIdx/.test(c)) fallos.push("api1Inyeccion toca la cartera (LINEAS_DATA): inyectar escribe la solicitud, no la línea");
  }
  if (api3) {
    const c = sinComentarios(api3);
    const llamada = c.indexOf("constituirLinea(");
    if (llamada < 0) fallos.push("api3EstadoProceso no constituye la línea cuando el externo resuelve «Aprobada»");
    else {
      const antes = c.slice(0, llamada);
      const ultimoIf = antes.lastIndexOf("if (");
      const guarda = ultimoIf < 0 ? "" : antes.slice(ultimoIf);
      if (ultimoIf < 0) fallos.push("constituirLinea( en api3EstadoProceso no está bajo ningún `if`: constituiría en cada consulta");
      else {
        if (!/aprobada/i.test(guarda)) fallos.push("api3EstadoProceso no constituye sólo con «Aprobada»: la condición que guarda constituirLinea( no la nombra");
        if (!/constituida/i.test(guarda)) fallos.push("api3EstadoProceso constituiría más de una vez: la condición que guarda constituirLinea( no mira `constituida`");
      }
    }
  }
  // Toda llamada a constituirLinea( fuera de su definición tiene que caer dentro del cuerpo de api3.
  const inicio3 = api3 ? src.indexOf(api3) : -1, fin3 = api3 ? inicio3 + api3.length : -1;
  // Se recorre por LÍNEA sobre el fuente original: quitar los comentarios cambia los offsets.
  const lineas = src.split("\n");
  let pos = 0;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const codigo = sinComentarios(l);
    if (/constituirLinea\(/.test(codigo) && !/^function constituirLinea\(/.test(l)) {
      if (!(pos >= inicio3 && pos < fin3)) fallos.push(`constituirLinea( se llama fuera de api3EstadoProceso (línea ${i + 1}): sólo el veredicto del sistema externo constituye una línea`);
    }
    pos += l.length + 1;
  }
  return fallos;
}

/* 3 · Una solicitud por línea, en el camino real: (a) el payload que el wizard `PresentacionComite` manda
   a API 1 lleva `lineaId` tomado de la línea desde la que se abrió (sin eso `conSolicitud` queda vacío
   para TODA solicitud real y la regla se rompe con la pantalla intacta); (b) la pantalla de Vigentes
   deriva `conSolicitud` de la bandeja (api2ListarProcesos) por `lineaId` —filtrar ahí las resueltas es
   un arreglo válido, no una violación—; (c) la fila en curso consulta ese conjunto, no abre el wizard
   (`if (enCurso) return;` al inicio del onClick) y su menú de acciones va deshabilitado. */
export function unaPorLinea(src) {
  const fallos = [];
  const wiz = cuerpoDe(src, "PresentacionComite");
  if (!wiz) fallos.push("PresentacionComite no está a nivel módulo");
  else {
    const c = sinComentarios(wiz);
    const ini = c.indexOf("api1Inyeccion(");
    if (ini < 0) fallos.push("el wizard PresentacionComite no inyecta por api1Inyeccion");
    else {
      const fin = c.indexOf(");", ini);
      const payload = c.slice(ini, fin < 0 ? undefined : fin);
      if (!/\blineaId:\s*linea\b/.test(payload)) fallos.push("el payload que el wizard manda a api1Inyeccion no lleva `lineaId` de la línea desde la que se abrió: ninguna solicitud real quedaría ligada a su línea");
    }
  }
  if (!/const conSolicitud = new Set\(api2ListarProcesos\(\)[^\n]*\.lineaId\b/.test(src)) fallos.push("`conSolicitud` no se deriva de la bandeja (api2ListarProcesos) por `lineaId`");
  if (!/const enCurso = conSolicitud\.has\(/.test(src)) fallos.push("la fila de Vigentes no consulta `conSolicitud` para saber si la línea ya tiene solicitud");
  if (!/<tr key=\{l\.id\} onClick=\{\(\) => \{\s*if \(enCurso\) return;/.test(src)) fallos.push("la fila con solicitud en curso sigue abriendo el wizard: falta `if (enCurso) return;` al inicio del onClick");
  if (!/disabled=\{enCurso\}/.test(src)) fallos.push("el botón de acciones de la fila no se deshabilita con una solicitud en curso");
  return fallos;
}

test("la bandeja de las solicitudes nuevas se rotula «Solicitudes», no «En proceso» (con sonda)", () => {
  assert.deepEqual(pestanaSolicitudes(jsx), []);
  const plantado = jsx.replace(/\["enproceso", `Solicitudes/, '["enproceso", `En proceso');
  assert.notEqual(plantado, jsx, "la sonda no encontró qué plantar");
  assert.ok(pestanaSolicitudes(plantado).length >= 1, "el gate no caza el rótulo «En proceso» plantado");
});

test("sólo el veredicto del sistema externo constituye la línea: api1 deja «En gestión», constituirLinea vive dentro de api3 bajo «Aprobada» y una sola vez (con sondas)", () => {
  assert.deepEqual(soloElExternoResuelve(jsx), []);
  // Sonda 1: NEX constituye al inyectar (resuelve solo).
  const plant1 = jsx.replace(/(function api1Inyeccion\(sol\) \{\n)/, "$1  constituirLinea(sol);\n");
  assert.notEqual(plant1, jsx);
  assert.ok(soloElExternoResuelve(plant1).some((f) => /api1Inyeccion decide|fuera de api3EstadoProceso/.test(f)), "el gate no caza una constitución dentro de api1");
  // Sonda 2: api3 constituye sin esperar «Aprobada».
  const plant2 = jsx.replace('if (s.estado === "Aprobada" && !s.constituida) {', "if (!s.constituida) {");
  assert.notEqual(plant2, jsx);
  assert.ok(soloElExternoResuelve(plant2).some((f) => /sólo con «Aprobada»/.test(f)), "el gate no caza una constitución sin «Aprobada»");
  // Sonda 2b: api3 constituye en CADA consulta «Aprobada» (sin `!s.constituida`).
  const plant2b = jsx.replace('if (s.estado === "Aprobada" && !s.constituida) {', 'if (s.estado === "Aprobada") {');
  assert.notEqual(plant2b, jsx);
  assert.ok(soloElExternoResuelve(plant2b).some((f) => /más de una vez/.test(f)), "el gate no caza la constitución repetida");
  // Sonda 3: una llamada suelta a constituirLinea en otra función.
  const plant3 = jsx.replace(/(^function recibirSolicitudLinea\(reg\) \{\n)/m, "$1  constituirLinea(reg);\n");
  assert.notEqual(plant3, jsx);
  assert.ok(soloElExternoResuelve(plant3).some((f) => /fuera de api3EstadoProceso/.test(f)), "el gate no caza una constitución fuera de api3");
  // Sonda 4 (REF-3): api1 escribe la cartera a mano, sin nombrar constituirLinea ni «Aprobada».
  const plant4 = jsx.replace(/(function api1Inyeccion\(sol\) \{\n)/, "$1  LINEAS_DATA.push({ id: 'L-x', rut: sol.rut, aprobada: sol.propFactoring }); _lineaIdx = null;\n");
  assert.notEqual(plant4, jsx);
  assert.ok(soloElExternoResuelve(plant4).some((f) => /toca la cartera/.test(f)), "el gate no caza un push directo a LINEAS_DATA en api1");
  // Tolerancia (REF-4): la misma regla escrita de otra forma —la condición en una const— sigue en verde.
  const refac = jsx.replace('if (s.estado === "Aprobada" && !s.constituida) {\n    const fila = constituirLinea(s);',
    'const aprobadaYNoConstituida = s.estado === "Aprobada" && !s.constituida;\n  if (aprobadaYNoConstituida) {\n    const fila = constituirLinea(s);');
  assert.notEqual(refac, jsx, "no encontré el bloque de api3 para refactorizar");
  assert.deepEqual(soloElExternoResuelve(refac), [], "el gate rechaza una refactorización de igual semántica: sería un snapshot");
});

test("una solicitud por línea: el wizard liga la solicitud a su línea (lineaId) y la fila de Vigentes con solicitud en la bandeja no abre otra (con sondas)", () => {
  assert.deepEqual(unaPorLinea(jsx), []);
  // Sonda 1 (REF-1): el wizard deja de mandar lineaId — la regla se rompe en el camino real con la pantalla intacta.
  const plant1 = jsx.replace("ejecutivo: usuarioNombre, lineaId: linea ? linea.id : null });", "ejecutivo: usuarioNombre });");
  assert.notEqual(plant1, jsx, "no encontré el payload del wizard para plantar");
  assert.ok(unaPorLinea(plant1).some((f) => /no lleva `lineaId`/.test(f)), "el gate no caza un wizard que inyecta sin lineaId");
  // Sonda 2: la fila en curso vuelve a abrir el wizard.
  const plant2 = jsx.replace("<tr key={l.id} onClick={() => { if (enCurso) return; ", "<tr key={l.id} onClick={() => { ");
  assert.notEqual(plant2, jsx);
  assert.ok(unaPorLinea(plant2).some((f) => /sigue abriendo el wizard/.test(f)), "el gate no caza la fila en curso que abre el wizard");
  // Sonda 3: conSolicitud deja de mirar lineaId (se deriva por rut, por ejemplo).
  const plant3 = jsx.replace("const conSolicitud = new Set(api2ListarProcesos().map((s) => s.lineaId).filter(Boolean));",
    "const conSolicitud = new Set(api2ListarProcesos().map((s) => s.rut).filter(Boolean));");
  assert.notEqual(plant3, jsx);
  assert.ok(unaPorLinea(plant3).some((f) => /por `lineaId`/.test(f)), "el gate no caza un conSolicitud que no va por lineaId");
  // Tolerancia (REF-2): ARREGLAR el defecto documentado —excluir las solicitudes ya resueltas— sigue en verde.
  const arreglo = jsx.replace("const conSolicitud = new Set(api2ListarProcesos().map((s) => s.lineaId).filter(Boolean));",
    "const conSolicitud = new Set(api2ListarProcesos().filter((s) => !s.constituida).map((s) => s.lineaId).filter(Boolean));");
  assert.notEqual(arreglo, jsx);
  assert.deepEqual(unaPorLinea(arreglo), [], "el gate rechaza el arreglo del defecto 2(b): sería un snapshot");
});
