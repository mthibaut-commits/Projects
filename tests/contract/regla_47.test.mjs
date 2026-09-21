/* Gate de contrato de la regla 47 (la identidad de la sesión es una sola) sobre el TEXTO del fuente.
   La suite prueba el COMPORTAMIENTO con el caso 152 —la identidad cambia y los relojes no se
   reinician—; acá se fija la FORMA, que es lo que se rompe por descuido: que exista un único sitio que
   cambie de persona, que ese sitio mueva las dos mitades (la sesión y lo que la pantalla muestra) y que
   el respaldo `|| usuario` siga en pie, porque la pestaña del detalle no tiene sesión.
   Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una función de nivel módulo: de su declaración a la siguiente a columna 0. */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^function ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(m.index, fin < 0 ? undefined : m.index + m[0].length + fin);
}

export function auditarRegla47(src) {
  const fallos = [];
  // 1 · La suplantación existe y cambia la SESIÓN.
  const c = cuerpoDe(src, "suplantarSesion");
  if (!c) { fallos.push("no existe `function suplantarSesion(code)` de nivel módulo: sin ella el selector sólo mueve el rótulo"); return fallos; }
  if (!/SESION = \{ \.\.\.SESION, usuario: code/.test(c))
    fallos.push("`suplantarSesion` no cambia `SESION.usuario`: los permisos preguntan por ahí, así que la pantalla mostraría a una persona y el permiso respondería por otra");
  // 2 · NO reabre la sesión: los relojes y el tenant son de la sesión, no de la persona.
  if (/\babrirSesion\b/.test(c)) fallos.push("`suplantarSesion` llama a `abrirSesion`: cambiar de identidad reiniciaría los dos relojes y regalaría una sesión entera");
  for (const campo of ["expira", "iniciada", "tenant"]) {
    if (new RegExp(`${campo}:`).test(c)) fallos.push(`\`suplantarSesion\` escribe \`${campo}\`: es de la SESIÓN y no de la persona`);
  }
  // 3 · Falla en corto: sin sesión, sin código o con el mismo, no hace nada.
  if (!/if \(!SESION \|\| !code \|\| SESION\.usuario === code\) return SESION;/.test(c))
    fallos.push("`suplantarSesion` no corta en seco sin sesión, sin código o con el mismo: en la pestaña del detalle `SESION` es null y ahí no hay identidad que cambiar");
  // 4 · Queda ESCRITO. Un cambio de identidad sin rastro es lo que un registro de evidencia no puede permitirse.
  if (!/registrarAuditoria\(/.test(c)) fallos.push("`suplantarSesion` no deja el cambio de identidad en la bitácora");
  // 5 · UN SOLO SITIO cambia de persona, y mueve las dos mitades.
  if (!/const cambiarUsuario = \(u\) => \{\s*\n\s*suplantarSesion\(u\);\s*\n\s*setUsuario\(u\);\s*\n\s*\};/.test(src))
    fallos.push("no existe `cambiarUsuario` moviendo las dos mitades (la sesión y el estado de la pantalla): con dos caminos, el que se olvide de uno deja la app mostrando a alguien que no es");
  if (/onChange=\{\(e\) => setUsuario\(e\.target\.value\)\}/.test(src))
    fallos.push("un selector de usuario sigue llamando a `setUsuario` directo: cambia el rótulo y no la sesión, que es el defecto que la regla 41 cierra");
  if (/onCambiarUsuario=\{setUsuario\}/.test(src))
    fallos.push("el detalle recibe `setUsuario` en vez de `cambiarUsuario`: el mismo defecto por el otro camino");
  // 6 · El respaldo `|| usuario` SE QUEDA: la pestaña del detalle no tiene sesión.
  const conRespaldo = (src.match(/puedeVerificarFacturas\(\(SESION && SESION\.usuario\) \|\| usuario\)/g) || []).length;
  if (conRespaldo < 2)
    fallos.push("los permisos de verificación perdieron el respaldo `|| usuario`: en la pestaña del detalle `SESION` es null y nadie podría marcar nada");
  return fallos;
}

test("47 · la identidad de la sesión es una sola: un solo sitio la cambia, cambia la SESIÓN y no reinicia sus relojes", () => {
  assert.deepEqual(auditarRegla47(jsx), []);
});

const MUTANTES = {
  "el selector vuelve a mover sólo el rótulo": {
    src: jsx.replace(`  const cambiarUsuario = (u) => {
    suplantarSesion(u);
    setUsuario(u);
  };`, "  const cambiarUsuario = (u) => setUsuario(u);"),
    re: /no existe `cambiarUsuario` moviendo las dos mitades/,
  },
  "la navbar llama a setUsuario directo": {
    src: jsx.replace("onChange={(e) => cambiarUsuario(e.target.value)}", "onChange={(e) => setUsuario(e.target.value)}"),
    re: /sigue llamando a `setUsuario` directo/,
  },
  "el detalle recibe el setter crudo": {
    src: jsx.replace("onCambiarUsuario={cambiarUsuario}", "onCambiarUsuario={setUsuario}"),
    re: /el detalle recibe `setUsuario`/,
  },
  "suplantar reabre la sesión": {
    src: jsx.replace("  SESION = { ...SESION, usuario: code, suplantado: true, actividad: Date.now() };", "  abrirSesion(code, \"demo\");"),
    re: /llama a `abrirSesion`/,
  },
  "suplantar reinicia el reloj absoluto": {
    src: jsx.replace("  SESION = { ...SESION, usuario: code, suplantado: true, actividad: Date.now() };",
                     "  SESION = { ...SESION, usuario: code, expira: Date.now() + SESION_ABSOLUTA_MS };"),
    re: /escribe `expira`/,
  },
  "el cambio de identidad deja de auditarse": {
    src: jsx.replace(`  registrarAuditoria({
    usuario: USERS[code] || code,
    modulo: "Autenticación",
    accion: "Cambio de identidad (demo)",`, `  ({
    usuario: USERS[code] || code,
    modulo: "Autenticación",
    accion: "Cambio de identidad (demo)",`),
    re: /no deja el cambio de identidad en la bitácora/,
  },
  "se pierde el respaldo de la pestaña del detalle": {
    src: jsx.replaceAll("puedeVerificarFacturas((SESION && SESION.usuario) || usuario)", "puedeVerificarFacturas(SESION && SESION.usuario)"),
    re: /perdieron el respaldo/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`47 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla47(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
