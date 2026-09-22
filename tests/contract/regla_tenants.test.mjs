/* Gate de contrato de la regla 52 (el tenant se da de alta en la plataforma, con su marca y su
   administrador), sobre el TEXTO del fuente. El caso 156 cubre los MOTORES —que el catálogo persista,
   que un rol `admin` cubra las tres áreas, que el correo resuelva en vivo—; esto cubre lo que vive en
   pantalla y en la forma del código, que la suite no monta: que la sección exista, que la marca se
   haya IDO de Funcionalidades, y que el rótulo del tenant esté en el contenedor y no copiado en cada
   una de las veinte secciones.

   Y fija el hallazgo que apareció construyéndolo: `atribDeRol` decía «la atribución sigue al ROL» y
   resolvía el super-admin por el CÓDIGO literal "ADMIN", así que el administrador de un tenant nuevo
   salía con atribución vacía. Un gate que mire «existe un super-admin» pasa con el defecto puesto: lo
   que se fija es POR QUÉ se decide. Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo de una función/arrow de nivel de bloque.

   SE EMPIEZA A CONTAR EN LA ÚLTIMA LLAVE DE LA DECLARACIÓN, no en la primera del texto: con
   parámetros DESESTRUCTURADOS —`function CfgTenants({ cfgOper, setCfgOper }) {`— la primera llave es
   la del destructuring, se cierra en el mismo renglón y el «cuerpo» salía siendo la lista de
   parámetros. El gate pasaba a afirmar cosas sobre tres palabras en vez de sobre la función: doce
   aserciones fallaron a la vez y ninguna decía la verdad. `decl` termina siempre en `{`. */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const inicio = i + decl.length - 1;
  let prof = 0,
    visto = false;
  for (let j = inicio; j < src.length; j++) {
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

export function auditarRegla50(src) {
  const fallos = [];
  const can = canonico(src);

  // 1 · EL CATÁLOGO DE FACTORINGS ES DE LA PLATAFORMA. Su clave no lleva sufijo de tenant: guardarla
  //     por tenant sería que cada uno tuviera su propia idea de quién existe.
  if (/^const TENANTS = \[\{ id: "security"/m.test(src)) fallos.push("`TENANTS` vuelve a ser un literal fijo: no se puede dar de alta otro factoring");
  if (!/^const TENANTS_KEY = "nex_tenants";$/m.test(src)) fallos.push("la clave del catálogo de tenants no es `nex_tenants` sin sufijo: la lista de factorings es de la plataforma, no de un tenant");
  if (/TENANTS_KEY = "[^"]*" \+ TENANT_ACTUAL/.test(src)) fallos.push("la clave del catálogo de tenants lleva sufijo de tenant: cada factoring tendría su propia lista de factorings");
  if (!/^let TENANTS = cargarTenants\(\);$/m.test(src)) fallos.push("`TENANTS` no se hidrata del storage");
  const ct = cuerpoDe(src, "function cargarTenants() {");
  if (!ct) fallos.push("no existe `cargarTenants`");
  else {
    if (!/\/\^\[a-z\]\[a-z0-9_-\]\{1,23\}\$\//.test(ct)) fallos.push("`cargarTenants` no valida la forma del id: ese id compone las claves de storage de toda la configuración del tenant");
    if (!/for \(const b of TENANTS_BASE\) if \(!vistos\.has\(b\.id\)\) out\.unshift/.test(ct)) fallos.push("`cargarTenants` puede perder el tenant base: es el que resuelve el fallback de `resolverTenant`");
    if (!/vistos\.has\(id\)/.test(ct)) fallos.push("`cargarTenants` admite ids repetidos: dos tenants con el mismo id comparten las claves de storage");
  }

  // 2 · EL SUPER-ADMIN ES UN ROL, NO UN CÓDIGO. El hallazgo: el admin de un tenant nuevo no se llama
  //     «ADMIN» y salía con atribución vacía.
  if (!/^const esRolAdmin = \(code\) => ROL_USUARIO\[code\] === "admin" \|\| code === "ADMIN";$/m.test(src))
    fallos.push("no existe `esRolAdmin`: sin él, el super-admin se resuelve por el código literal y el administrador de un tenant nuevo no aprueba nada");
  const ar = cuerpoDe(src, "function atribDeRol(code) {");
  if (ar && !/if \(esRolAdmin\(code\)\) return \{riesgo: 5, comercial: 5, operaciones: 5\};/.test(canonico(ar)))
    fallos.push("`atribDeRol` vuelve a resolver el super-admin por el código: decía «la atribución sigue al ROL» y no lo cumplía");
  if (!/superAdmin: esRolAdmin\(code\),/.test(src)) fallos.push("el padrón marca el super-admin por el código y no por el rol");
  for (const f of ["puedeVerBitacora", "puedeVerMensajeria", "puedeVerCobranza", "puedeVerPlanEjec", "puedeVerFunnel", "puedeExcepcionarVerif", "aprobMasivaHabilitada", "esJefeComercial", "esGerenteComercial"])
    if (new RegExp(`const ${f} = \\(code\\) => code === "ADMIN"`).test(src)) fallos.push(`\`${f}\` sigue preguntando por el código "ADMIN": el administrador de un tenant nuevo no se llama así`);
  const pv = cuerpoDe(src, "const puedeVerificarFacturas = (code, hoy, lista) => {");
  if (pv && !/if \(esRolAdmin\(code\)\) return true;/.test(pv)) fallos.push("`puedeVerificarFacturas` resuelve el administrador por el código literal");

  // 3 · LOS USUARIOS QUE EL TENANT DA DE ALTA, y el correo como credencial resuelta EN VIVO.
  for (const f of ["cargarUsuariosTenant", "montarUsuariosTenant", "guardarUsuariosTenant"]) if (!new RegExp(`^function ${f}\\(`, "m").test(src)) fallos.push(`no existe \`${f}\``);
  if (!/^const USUARIOS_KEY = "pc_usuarios_" \+ TENANT_ACTUAL;$/m.test(src)) fallos.push("los usuarios dados de alta no se guardan por tenant");
  const cc = cuerpoDe(src, "const codigoDeCorreo = (email) => {");
  if (!cc) fallos.push("no existe `codigoDeCorreo`: el correo es la credencial y tiene que resolverse contra la lista viva");
  else {
    if (!/USUARIOS_TENANT\.find\(\(x\) => x\.email === k\)/.test(cc)) fallos.push("`codigoDeCorreo` no mira los usuarios dados de alta: el admin recién creado no podría entrar sin recargar");
    if (!/CUENTAS_DEMO\[k\]/.test(cc)) fallos.push("`codigoDeCorreo` dejó de mirar el elenco de la demo: la lista nueva se SUMA, no reemplaza");
  }
  if (!/const code = codigoDeCorreo\(k\);/.test(can)) fallos.push("el login no usa `codigoDeCorreo`");
  const mu = cuerpoDe(src, "function montarUsuariosTenant() {");
  if (mu && !/if \(Object\.keys\(atrib\)\.length\) ATRIB_USUARIO\[u\.code\] = \{tipo: "aprobador", atrib\};/.test(canonico(mu)))
    fallos.push("`montarUsuariosTenant` mete en `ATRIB_USUARIO` a quien no tiene atribución: dejaría un (área, nivel) con nombre y sin nadie que lo firme");

  // 4 · LA PANTALLA: la sección existe, y la MARCA se fue de Funcionalidades.
  if (!/^function CfgTenants\(\{ cfgOper, setCfgOper \}\) \{/m.test(src)) fallos.push("no existe `CfgTenants`");
  if (!/\{k: "tenants", label: "Tenants", Icon: [A-Za-z0-9]+\}/.test(can)) fallos.push("`Tenants` no está en el menú de Configuración");
  if (!/sec === "tenants" \? \(<CfgTenants cfgOper=\{cfgOper\} setCfgOper=\{setCfgOper\} \/>\)/.test(can)) fallos.push("la sección `tenants` no se renderiza");
  const cf = cuerpoDe(src, "function CfgFuncionalidades({ cfgOper, setCfgOper }) {");
  if (cf && /marcaLogo|marcaPrimario|Logotipo y colores/.test(cf)) fallos.push("la marca sigue en `CfgFuncionalidades`: es identidad del tenant, no una funcionalidad suya");
  const cft = cuerpoDe(src, "function CfgTenants({ cfgOper, setCfgOper }) {");
  if (cft) {
    for (const frag of ["marcaLogo", "marcaPrimario", "marcaNombre"]) if (!new RegExp(frag).test(cft)) fallos.push(`\`CfgTenants\` no trae \`${frag}\`: la marca tenía que mudarse acá entera`);
    if (!/Administrador del tenant/.test(cft)) fallos.push("`CfgTenants` no permite crear el administrador: un tenant sin admin no lo puede usar nadie");
    if (!/const codigoLibre = \(nombre\) =>/.test(cft)) fallos.push("`CfgTenants` no deriva un código libre: reusar uno vivo le atribuiría a alguien lo que hizo otro");
    if (!/USUARIOS_TENANT\.some\(\(u\) => u\.email === email\) \|\| CUENTAS_DEMO\[email\]/.test(cft)) fallos.push("`CfgTenants` admite un correo repetido: dos personas con el mismo correo son la misma sesión");
  }

  // 5 · EL RÓTULO DEL TENANT VA EN EL CONTENEDOR, no copiado en cada sección.
  const cv = cuerpoDe(src, "function ConfiguracionView({ usuario, cfgOper, setCfgOper, deals, onMigrarExec }) {");
  if (!cv) fallos.push("no encuentro `ConfiguracionView`");
  else {
    if (!/const plataforma = sec === "tenants";/.test(cv)) fallos.push("el rótulo no distingue la sección de la PLATAFORMA: diría que `Tenants` configura un tenant, que es lo contrario de lo que hace");
    if (!/«\{activa\.label\}» aplica sólo a este factoring/.test(cv)) fallos.push("el rótulo no nombra la sección ni dice que aplica sólo a este factoring");
    if (!/\{TENANT_ACTUAL\}/.test(cv)) fallos.push("el rótulo no muestra el identificador del tenant: es el que compone las claves `pc_*_<tenant>` que citan las bajadas");
  }

  // 6 · ÁREAS: se fueron las dos columnas, y NO se fue el control de la regla 35.
  const ca = cuerpoDe(src, "function CfgAreas() {");
  if (ca) {
    // Se mira la CABECERA de la tabla y no el cuerpo entero: el comentario que explica por qué se
    // fueron las columnas las nombra, y un gate que se auto-detecta no vigila nada.
    const cab = (ca.match(/\{\[("Área"[^\]]*)\]\.map\(\(h, i\)/) || [])[1] || "";
    if (/Criterios que rutean acá/.test(cab)) fallos.push("vuelve la columna «Criterios que rutean acá» a la tabla de Áreas");
    if (/Quién la tiene/.test(cab)) fallos.push("vuelve la columna «Quién la tiene» a la tabla de Áreas");
    if (!/\{\["Área", "Identificador", ""\]\.map/.test(canonico(ca))) fallos.push("la tabla de Áreas no quedó en las tres columnas (Área · Identificador · acción)");
    if (!/const n = tramosDeArea\(a\.id\);/.test(ca)) fallos.push("Áreas perdió la guarda de borrado: un área con criterios ruteando a ella los dejaría sin aprobador posible");
    if (!/criterio\(s\) MAL DEFINIDOS/.test(ca)) fallos.push("Áreas perdió el aviso de la regla 35: el control no se va con las columnas");
  }
  return fallos;
}

test("52 · el tenant se da de alta en la plataforma, con su marca y su administrador; el super-admin es un rol", () => {
  assert.deepEqual(auditarRegla50(jsx), []);
});

const MUTANTES = {
  "la lista de factorings vuelve a ser fija": { src: jsx.replace('const TENANTS_KEY = "nex_tenants";', 'const TENANTS = [{ id: "security", nombre: "Factoring Security", rut: "96.684.990-8", activo: true }];'), re: /vuelve a ser un literal fijo|no es `nex_tenants`/ },
  "la lista de factorings se guarda por tenant": { src: jsx.replace('const TENANTS_KEY = "nex_tenants";', 'const TENANTS_KEY = "nex_tenants_" + TENANT_ACTUAL;'), re: /no es `nex_tenants` sin sufijo|lleva sufijo de tenant/ },
  "el id del tenant deja de validarse": { src: jsx.replace("/^[a-z][a-z0-9_-]{1,23}$/.test(id)", "id.length > 0"), re: /no valida la forma del id/ },
  "se puede perder el tenant base": { src: jsx.replace("  for (const b of TENANTS_BASE) if (!vistos.has(b.id)) out.unshift({ ...b });", ""), re: /puede perder el tenant base/ },
  "el super-admin vuelve a ser un código": { src: jsx.replace("  if (esRolAdmin(code)) return { riesgo: 5, comercial: 5, operaciones: 5 };\n  const a = ROL_ATRIB[ROL_USUARIO[code]];", '  if (code === "ADMIN") return { riesgo: 5, comercial: 5, operaciones: 5 };\n  const a = ROL_ATRIB[ROL_USUARIO[code]];'), re: /vuelve a resolver el super-admin por el código/ },
  "el padrón marca super-admin por el código": { src: jsx.replace("    superAdmin: esRolAdmin(code),", '    superAdmin: code === "ADMIN",'), re: /marca el super-admin por el código/ },
  "un permiso de visibilidad vuelve al código": { src: jsx.replace("const puedeVerBitacora = (code) => esRolAdmin(code) || CFG_VER_BITACORA[code] === true;", 'const puedeVerBitacora = (code) => code === "ADMIN" || CFG_VER_BITACORA[code] === true;'), re: /`puedeVerBitacora` sigue preguntando por el código/ },
  "el login deja de mirar a los usuarios del tenant": { src: jsx.replace("  const u = USUARIOS_TENANT.find((x) => x.email === k);", "  const u = null;"), re: /no mira los usuarios dados de alta/ },
  "el login deja de mirar el elenco de la demo": { src: jsx.replace("  return (u && u.code) || CUENTAS_DEMO[k] || null;", "  return (u && u.code) || null;"), re: /dejó de mirar el elenco de la demo/ },
  "los usuarios del tenant no se guardan por tenant": { src: jsx.replace('const USUARIOS_KEY = "pc_usuarios_" + TENANT_ACTUAL;', 'const USUARIOS_KEY = "pc_usuarios";'), re: /no se guardan por tenant/ },
  "se mete en ATRIB_USUARIO a quien no tiene atribución": { src: jsx.replace('    if (Object.keys(atrib).length) ATRIB_USUARIO[u.code] = { tipo: "aprobador", atrib };', '    ATRIB_USUARIO[u.code] = { tipo: "aprobador", atrib };'), re: /mete en `ATRIB_USUARIO` a quien no tiene atribución/ },
  "la sección desaparece del menú": { src: jsx.replace('  { k: "tenants", label: "Tenants", Icon: LayoutGrid },\n', ""), re: /no está en el menú/ },
  "la marca vuelve a Funcionalidades": { src: jsx.replace("function CfgFuncionalidades({ cfgOper, setCfgOper }) {", "function CfgFuncionalidades({ cfgOper, setCfgOper }) {\n  const _marcaLogo = 1; // Logotipo y colores"), re: /sigue en `CfgFuncionalidades`/ },
  "se admite un correo repetido": { src: jsx.replace("    if (USUARIOS_TENANT.some((u) => u.email === email) || CUENTAS_DEMO[email])", "    if (false)"), re: /admite un correo repetido/ },
  "el rótulo dice que Tenants configura un tenant": { src: jsx.replace('          const plataforma = sec === "tenants";', "          const plataforma = false;"), re: /no distingue la sección de la PLATAFORMA/ },
  "el rótulo pierde el identificador": { src: jsx.replace("                    {TENANT_ACTUAL}\n", "                    {\"\"}\n"), re: /no muestra el identificador del tenant/ },
  "vuelve la columna de criterios a Áreas": { src: jsx.replace('              {["Área", "Identificador", ""].map((h, i) => (', '              {["Área", "Identificador", "Criterios que rutean acá", ""].map((h, i) => ('), re: /vuelve la columna «Criterios que rutean acá»/ },
  "Áreas pierde la guarda de borrado": { src: jsx.replace("              const n = tramosDeArea(a.id);", "              const n = 0;"), re: /perdió la guarda de borrado/ },
  "Áreas pierde el aviso de la regla 35": { src: jsx.replace("criterio(s) MAL DEFINIDOS: no se ejecutan ni se verifican", "criterios raros"), re: /perdió el aviso de la regla 35/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`52 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla50(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
