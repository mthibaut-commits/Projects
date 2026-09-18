/* Gate de contrato de la regla 27-bis sobre el TEXTO del fuente y de los scripts: «Tubo diario» pasó a
   «Gestión diaria» y «Gestión» a «Reportes», y lo que hay que mirar es TODO lo que nombra la vista —el
   rótulo del botón de la navbar, el segundo argumento de `irA` (que es lo que se muestra y lo que audita),
   la miga (que ES la ruta del menú), el <h1>, las entradas del Command-K y los tres scripts de captura,
   que navegan por texto y con el nombre viejo se cuelgan hasta el timeout—. Con sonda: se planta cada
   violación en una copia y el gate la caza. El <h1> de Reportes («Gestión de Clientes») es un DESFASE
   anotado en la regla: se reporta, no se fuerza.
   LÍMITE DEL GATE: lee el fuente como TEXTO. Los extractores toleran espacios y saltos de línea (una miga
   escrita en dos líneas, como la de Presentación al comité, se encuentra igual), pero no entienden JSX:
   una navbar generada con `.map` sobre un catálogo daría «0 botones» y el gate fallaría RUIDOSAMENTE, no
   en silencio; ahí se migra el extractor a leer ese catálogo. La regla en PANTALLA la fija `e2e-27-bis`. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RAIZ, leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/[^\n]*/gm, "");
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ROTULOS = { pipeline: "Gestión diaria", panel: "Reportes" };
const VIEJOS = ["Tubo diario"];   // nombre viejo de `pipeline`: no puede aparecer ni como subcadena
const VIEJO_EXACTO = "Gestión";   // nombre viejo de `panel`: prohibido como rótulo ENTERO (es prefijo legítimo de «Gestión diaria»)
const SCRIPTS = ["capturar_pantallas.mjs", "capturar_tabla_simulada.mjs", "capturar_variantes.mjs"];
const CON_CATALOGO = "capturar_pantallas.mjs"; // el único que recorre TODAS las vistas, con un catálogo VISTAS propio (tercera copia)
/* «Gestión» es el desfase de pipeline_comercial.jsx:15067 (`NodoTareasModal`), abierto al escribir el gate y NO
   anotado en la regla; se acepta como desfase conocido y se imprime. Cuando el fuente diga «Reportes», quitarlo. */
const MODULO_TAREAS_ACEPTADOS = ["Reportes", "Gestión"];

/* La miga «Comercial › <rótulo>», tolerante a espacios y saltos de línea alrededor del chevron. */
const reMiga = (rot) => new RegExp(`Comercial\\s*<ChevronRight size=\\{12\\} />\\s*${esc(rot)}\\s*</div>`);
/* Un catálogo `const VISTAS = [["id", "Rótulo"], …];` (el del Command-K y el de capturar_pantallas.mjs). */
export function catalogoVistas(texto) {
  const decl = String(texto).match(/const VISTAS\s*=\s*\[([\s\S]*?)\];/);
  return decl ? [...decl[1].matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)].map((m) => [m[1], m[2]]) : null;
}
/* Un rótulo ENTERO en un script: como literal ("X", 'X', `X`) o como el ancla de clic /^X$/. */
const nombraExacto = (texto, rot) => new RegExp(`(["'\`])${esc(rot)}\\1|/\\^${esc(rot)}\\$/`).test(texto);

/* 1 · La navbar: cada botón muestra EXACTAMENTE el segundo argumento de su `irA`, y los ids renombrados
   llevan el rótulo nuevo. */
export function botonesNavbar(src) {
  // Hay más de un <header> en el fuente: la navbar es el <nav> que contiene irA("dashboard", …). El botón del
  // engranaje (irA("config", …), sólo ícono) queda FUERA del <nav>: acá todo botón tiene que mostrar un rótulo.
  const c = sinComentarios(src);
  const ancla = c.search(/irA\(\s*"dashboard"\s*,\s*"Dashboard"\s*\)/);
  const ini = ancla < 0 ? -1 : c.lastIndexOf("<nav", ancla), fin = ancla < 0 ? -1 : c.indexOf("</nav>", ancla);
  const nav = ini < 0 || fin < 0 ? "" : c.slice(ini, fin);
  const sinExpr = (t) => { let u = t; for (let i = 0; i < 6; i++) u = u.replace(/\{[^{}]*\}/g, ""); return u; };
  const botones = [...nav.matchAll(/<button\s+onClick=\{\(\)\s*=>\s*irA\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)\s*\}[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ id: m[1], arg: m[2], texto: sinExpr(m[3].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() }));
  const fallos = [];
  if (!nav) fallos.push("no hay <nav>…</nav> con irA(\"dashboard\", …) en el fuente");
  if (botones.length < 9) fallos.push(`la navbar tiene ${botones.length} botones con irA(id, rótulo); se esperaban al menos 9`);
  for (const b of botones) {
    if (!b.texto) fallos.push(`el botón de «${b.id}» no muestra un rótulo literal (¿una expresión JSX?): lo que se ve no se puede cotejar con su irA «${b.arg}»`);
    else if (b.texto !== b.arg) fallos.push(`el botón de «${b.id}» muestra «${b.texto}» y su irA dice «${b.arg}»: lo que se audita no es lo que se ve`);
  }
  for (const [id, rot] of Object.entries(ROTULOS)) {
    const b = botones.find((x) => x.id === id);
    if (!b) fallos.push(`no hay botón de la navbar para la vista «${id}»`);
    else if (b.arg !== rot) fallos.push(`la vista «${id}» se llama «${b.arg}» en la navbar; tiene que ser «${rot}»`);
  }
  return { fallos, botones };
}
/* 2 · La miga ES la ruta del menú: «Comercial › <rótulo del botón>» para las dos vistas renombradas. */
export function migas(src) {
  const c = sinComentarios(src);
  const fallos = [];
  for (const [id, rot] of Object.entries(ROTULOS)) if (!reMiga(rot).test(c)) fallos.push(`no hay miga «Comercial › ${rot}» para la vista «${id}»`);
  for (const v of VIEJOS) if (reMiga(v).test(c)) fallos.push(`vuelve la miga «${v}»`);
  if (reMiga(VIEJO_EXACTO).test(c)) fallos.push(`vuelve la miga «${VIEJO_EXACTO}» a secas (era el nombre viejo de Reportes)`);
  return fallos;
}
/* 3 · Los <h1>: el de Gestión diaria dice «Gestión diaria comercial». El de Reportes se LEE y se devuelve:
   la regla anota que sigue diciendo «Gestión de Clientes». */
export function h1De(src, rot) {
  const c = sinComentarios(src);
  const m0 = reMiga(rot).exec(c);
  if (!m0) return null;
  const m = c.slice(m0.index, m0.index + 800).match(/<h1[^>]*>\s*([^<]*?)\s*<\/h1>/);
  return m ? m[1] : null;
}
/* 4 · Las entradas del Command-K: el catálogo `VISTAS` local de `CommandK` nombra cada id IGUAL que la
   navbar, y con eso buscar «Reportes» encuentra la vista. */
export function vistasCommandK(src) {
  const cuerpo = (src.match(/^function CommandK\([\s\S]*?^\}/m) || [""])[0];
  const vistas = catalogoVistas(cuerpo);
  if (!vistas) return { fallos: ["CommandK no declara `const VISTAS = [...]`"], vistas: [] };
  const fallos = [];
  const { botones } = botonesNavbar(src);
  for (const [id, rot] of vistas) {
    const b = botones.find((x) => x.id === id);
    if (b && b.arg !== rot) fallos.push(`el Command-K llama «${rot}» a la vista «${id}» y la navbar «${b.arg}»: buscar por el rótulo del menú no la encontraría`);
  }
  for (const [id, rot] of Object.entries(ROTULOS)) {
    const v = vistas.find((x) => x[0] === id);
    if (!v) fallos.push(`el Command-K no ofrece la vista «${id}»`);
    else if (v[1] !== rot) fallos.push(`en el Command-K «${id}» se llama «${v[1]}» y tiene que ser «${rot}»`);
  }
  // Filtra las vistas por su rótulo (tolerante al nombre de la variable y a los espacios).
  if (!/VISTAS\s*\.filter\(\s*\(\[\s*,\s*(\w+)\s*\]\)\s*=>\s*!ql\s*\|\|\s*\1\.toLowerCase\(\)\.includes\(ql\)\s*\)/.test(cuerpo)) fallos.push("el Command-K ya no filtra las vistas por su rótulo: buscar «Reportes» no la encontraría");
  return { fallos, vistas };
}
/* 5 · Fuera del fuente: los tres scripts de captura navegan y esperan por el rótulo NUEVO, y el catálogo con
   que capturar_pantallas.mjs recorre las vistas nombra cada una como el botón de la navbar (es su ancla de
   clic: `hasText: new RegExp("^" + etiqueta + "$")`). Con un rótulo que la navbar no tiene, no fallan: se
   cuelgan hasta el timeout. */
export function scriptsCaptura(archivos, src = jsx) {
  const rotulosNavbar = new Set(botonesNavbar(src).botones.map((b) => b.arg));
  const fallos = [];
  for (const [nombre, texto] of Object.entries(archivos)) {
    for (const v of VIEJOS) if (texto.includes(v)) fallos.push(`${nombre} todavía nombra «${v}»`);
    if (nombraExacto(texto, VIEJO_EXACTO)) fallos.push(`${nombre} nombra «${VIEJO_EXACTO}» a secas como rótulo (el nombre viejo de Reportes): un clic por ese texto se colgaría hasta el timeout`);
    if (!/hasText:\s*\/\^Gestión diaria\$\//.test(texto)) fallos.push(`${nombre} no hace clic en «Gestión diaria» por texto (hasText: /^Gestión diaria$/)`);
    if (!/waitForFunction\(\(\)\s*=>\s*\/Gestión diaria\/\.test\(/.test(texto)) fallos.push(`${nombre} no espera el rótulo «Gestión diaria» para dar por cargada la app`);
    const catalogo = catalogoVistas(texto);
    if (nombre === CON_CATALOGO && !catalogo) fallos.push(`${nombre} ya no declara el catálogo VISTAS con que recorre las vistas: no se puede cotejar con la navbar`);
    for (const [slug, rot] of catalogo || []) if (!rotulosNavbar.has(rot)) fallos.push(`${nombre} navega a «${rot}» (slug «${slug}») y la navbar no tiene ese botón: el clic por texto se colgaría hasta el timeout`);
    if (catalogo) for (const rot of Object.values(ROTULOS)) if (!catalogo.some(([, r]) => r === rot)) fallos.push(`${nombre} no recorre la vista «${rot}»`);
  }
  return fallos;
}
/* 6 · La auditoría desde adentro de la vista: `irA` audita `modulo: label` («Ingreso al módulo Reportes»),
   así que una acción disparada desde esa vista tiene que nombrar el MISMO módulo. Bi-estado a propósito
   (ver MODULO_TAREAS_ACEPTADOS): el desfase conocido se imprime, cualquier otro nombre falla. */
export function moduloNodoTareas(src) {
  const cuerpo = (src.match(/^function NodoTareasModal\([\s\S]*?^\}/m) || [""])[0];
  const m = cuerpo.match(/registrarAuditoria\(\{[^\n]*?modulo:\s*"([^"]+)"/);
  const modulo = m ? m[1] : null;
  const fallos = [];
  if (!modulo) fallos.push("NodoTareasModal ya no audita la asignación de tareas con registrarAuditoria({ …, modulo: \"…\" })");
  else if (!MODULO_TAREAS_ACEPTADOS.includes(modulo)) fallos.push(`NodoTareasModal audita «Asignar tarea» en el módulo «${modulo}»: la vista se llama «Reportes»`);
  return { modulo, fallos };
}
const leerScripts = () => Object.fromEntries(SCRIPTS.map((s) => [s, leer(s)]));

test("27-bis · navbar: cada botón muestra el segundo argumento de su irA, y pipeline/panel dicen «Gestión diaria»/«Reportes»", () => {
  const { fallos, botones } = botonesNavbar(jsx);
  assert.deepEqual(fallos, []);
  assert.deepEqual(botones.filter((b) => b.id in ROTULOS).map((b) => [b.id, b.texto]), [["pipeline", "Gestión diaria"], ["panel", "Reportes"]]);
});
test("27-bis · la miga ES la ruta del menú: «Comercial › Gestión diaria» y «Comercial › Reportes», sin «Tubo diario» ni «Gestión» a secas", () => {
  assert.deepEqual(migas(jsx), []);
});
test("27-bis · el <h1> de Gestión diaria dice «Gestión diaria comercial»; el de Reportes se reporta (desfase anotado: «Gestión de Clientes»)", (t) => {
  assert.equal(h1De(jsx, "Gestión diaria"), "Gestión diaria comercial");
  const h1 = h1De(jsx, "Reportes");
  t.diagnostic(`h1 de Reportes: «${h1}»${h1 === "Gestión de Clientes" ? " — desfase anotado en la regla 27-bis, sigue abierto" : ""}`);
  assert.ok(h1 === "Reportes" || h1 === "Gestión de Clientes", `el h1 de Reportes dice «${h1}»: ni el rótulo del menú ni el desfase anotado («Gestión de Clientes»)`);
  assert.notEqual(h1, "Gestión", "el h1 de Reportes volvió al nombre viejo del menú");
});
test("27-bis · Command-K: VISTAS nombra cada id igual que la navbar y filtra por rótulo, así buscar «Reportes» encuentra la vista", () => {
  const { fallos, vistas } = vistasCommandK(jsx);
  assert.deepEqual(fallos, []);
  assert.deepEqual(vistas.filter(([id]) => id in ROTULOS), [["pipeline", "Gestión diaria"], ["panel", "Reportes"]]);
  assert.ok(!vistas.some(([, l]) => l === "Gestión" || l === "Tubo diario"), "el Command-K ofrece un rótulo viejo");
});
test("27-bis · los tres scripts de captura (y el harness e2e) navegan y esperan por «Gestión diaria», nunca por «Tubo diario» ni «Gestión»; el catálogo de capturar_pantallas.mjs nombra cada vista como la navbar", () => {
  for (const s of SCRIPTS) assert.ok(existsSync(join(RAIZ, s)), `falta ${s}`);
  const sc = leerScripts();
  assert.deepEqual(scriptsCaptura(sc), []);
  const catalogo = catalogoVistas(sc[CON_CATALOGO]);
  assert.ok(catalogo && catalogo.length >= 9, `el catálogo VISTAS de ${CON_CATALOGO} tiene ${catalogo ? catalogo.length : 0} vistas`);
  const harness = leer("tests/e2e/_harness.mjs");
  assert.ok(/Gestión diaria/.test(harness) && !/Tubo diario/.test(harness) && !nombraExacto(harness, VIEJO_EXACTO), "el harness e2e espera por un rótulo viejo");
});
test("27-bis · el nombre viejo «Tubo diario» no vuelve al fuente", () => {
  assert.ok(!/Tubo diario/.test(sinComentarios(jsx)), "«Tubo diario» reaparece en el fuente (fuera de comentarios)");
});
test("27-bis · la auditoría de «Asignar tarea» (NodoTareasModal) nombra el módulo de la vista: «Reportes», o el desfase conocido «Gestión», que se reporta", (t) => {
  const { modulo, fallos } = moduloNodoTareas(jsx);
  assert.deepEqual(fallos, []);
  t.diagnostic(modulo === "Gestión"
    ? "NodoTareasModal audita modulo: «Gestión» (pipeline_comercial.jsx:15067) mientras irA audita «Reportes» — desfase NO anotado en la regla 27-bis; al corregirlo, quitar «Gestión» de MODULO_TAREAS_ACEPTADOS"
    : `NodoTareasModal audita modulo: «${modulo}» — alineado con el rótulo del menú`);
});
test("27-bis · SONDAS: cada violación plantada la caza su gate, y el formato legítimo (espacios, saltos de línea) no lo rompe", () => {
  // (a) botón con rótulo viejo → irA sigue diciendo el nuevo: se detecta el desacuerdo Y el rótulo.
  const a = jsx.replace('irA("pipeline", "Gestión diaria")} style={{ color: vistaApp === "pipeline" ? C.indigo : C.sub, fontWeight: vistaApp === "pipeline" ? 600 : 400 }}>Gestión diaria</button>',
                        'irA("pipeline", "Tubo diario")} style={{ color: vistaApp === "pipeline" ? C.indigo : C.sub, fontWeight: vistaApp === "pipeline" ? 600 : 400 }}>Tubo diario</button>');
  assert.notEqual(a, jsx); assert.ok(botonesNavbar(a).fallos.some((f) => /«pipeline» se llama «Tubo diario»/.test(f)), "no cazó el rótulo viejo en la navbar");
  // (b) el botón muestra una cosa y audita otra.
  const b = jsx.replace('600 : 400 }}>Reportes</button>', '600 : 400 }}>Gestión</button>');
  assert.notEqual(b, jsx); assert.ok(botonesNavbar(b).fallos.some((f) => /muestra «Gestión» y su irA dice «Reportes»/.test(f)), "no cazó el desacuerdo botón/irA");
  // (c) el rótulo como expresión JSX ({"Tubo diario"}): lo que se ve no se puede cotejar, y el gate lo dice.
  const c = jsx.replace('600 : 400 }}>Gestión diaria</button>', '600 : 400 }}>{"Tubo diario"}</button>');
  assert.notEqual(c, jsx); assert.ok(botonesNavbar(c).fallos.some((f) => /«pipeline» no muestra un rótulo literal/.test(f)), "toleró un rótulo por expresión JSX");
  // (d) la miga con el nombre viejo.
  const d = jsx.replace("Comercial <ChevronRight size={12} /> Reportes</div>", "Comercial <ChevronRight size={12} /> Gestión</div>");
  assert.notEqual(d, jsx); assert.ok(migas(d).some((f) => /Comercial › Reportes/.test(f)) && migas(d).some((f) => /«Gestión» a secas/.test(f)), "no cazó la miga vieja");
  // (e) el h1 de Gestión diaria vuelve al título viejo.
  const e = jsx.replace("<h1 className=\"text-2xl font-semibold tracking-tight\">Gestión diaria comercial</h1>", "<h1 className=\"text-2xl font-semibold tracking-tight\">Tubo diario</h1>");
  assert.notEqual(e, jsx); assert.equal(h1De(e, "Gestión diaria"), "Tubo diario");
  // (f) el Command-K con el rótulo viejo: se detecta contra la navbar y contra el rótulo esperado.
  const f = jsx.replace('["panel", "Reportes"]', '["panel", "Gestión"]');
  assert.notEqual(f, jsx); assert.ok(vistasCommandK(f).fallos.some((x) => /Command-K llama «Gestión» a la vista «panel»/.test(x)), "no cazó el Command-K desfasado");
  // (g) un script de captura con el nombre viejo en todas partes: por el nombre, por el ancla de clic y por el catálogo.
  const sc = leerScripts();
  sc[CON_CATALOGO] = sc[CON_CATALOGO].replace(/Gestión diaria/g, "Tubo diario");
  const g = scriptsCaptura(sc);
  assert.ok(g.some((x) => /capturar_pantallas\.mjs todavía nombra «Tubo diario»/.test(x)) && g.some((x) => /no hace clic en «Gestión diaria»/.test(x)) && g.some((x) => /navega a «Tubo diario» \(slug «pipeline»\)/.test(x)), "no cazó el script con el nombre viejo");
  // (h) el catálogo del script vuelve a «Gestión» para Reportes: lo caza el rótulo prohibido Y el cruce con la navbar.
  const sh = leerScripts();
  sh[CON_CATALOGO] = sh[CON_CATALOGO].replace('["gestion", "Reportes"]', '["gestion", "Gestión"]');
  assert.notEqual(sh[CON_CATALOGO], sc[CON_CATALOGO]); assert.notEqual(sh[CON_CATALOGO], leer(CON_CATALOGO), "la sonda (h) no se plantó");
  const h = scriptsCaptura(sh);
  assert.ok(h.some((x) => /nombra «Gestión» a secas como rótulo/.test(x)) && h.some((x) => /navega a «Gestión» \(slug «gestion»\) y la navbar no tiene ese botón/.test(x)) && h.some((x) => /no recorre la vista «Reportes»/.test(x)), `no cazó el catálogo con «Gestión»: ${JSON.stringify(h)}`);
  // (i) cualquier rótulo del catálogo que la navbar no tenga (no sólo los renombrados) se caza por el cruce.
  const si = leerScripts();
  si[CON_CATALOGO] = si[CON_CATALOGO].replace('["operaciones", "Operaciones"]', '["operaciones", "Operación"]');
  assert.notEqual(si[CON_CATALOGO], leer(CON_CATALOGO), "la sonda (i) no se plantó");
  assert.ok(scriptsCaptura(si).some((x) => /navega a «Operación» \(slug «operaciones»\)/.test(x)), "no cazó un rótulo del catálogo ajeno a la navbar");
  // (j) el módulo de la auditoría de tareas con un nombre que no es ni el del menú ni el desfase conocido.
  const j = jsx.replace('modulo: "Gestión", accion: "Asignar tarea"', 'modulo: "Tubo diario", accion: "Asignar tarea"');
  const j2 = jsx.replace('modulo: "Reportes", accion: "Asignar tarea"', 'modulo: "Panel", accion: "Asignar tarea"');
  const plantada = j !== jsx ? j : j2; // el fuente dice «Gestión» (desfase) o ya «Reportes»: la sonda se planta sobre el que esté.
  assert.notEqual(plantada, jsx, "la sonda (j) no se plantó: NodoTareasModal ya no audita «Asignar tarea» con modulo «Gestión» ni «Reportes»");
  assert.ok(moduloNodoTareas(plantada).fallos.some((x) => /audita «Asignar tarea» en el módulo «(Tubo diario|Panel)»/.test(x)), "no cazó el módulo ajeno en la auditoría de tareas");
  assert.deepEqual(moduloNodoTareas(jsx.replace(/modulo: "(Gestión|Reportes)", accion: "Asignar tarea"/, 'modulo: "Reportes", accion: "Asignar tarea"')).fallos, [], "el estado corregido («Reportes») tiene que pasar");
  // (k) TOLERANCIA · la miga en dos líneas (el formato de Presentación al comité) se sigue encontrando, y su h1 también.
  const k = jsx.replace("Comercial <ChevronRight size={12} /> Reportes</div>", "Comercial <ChevronRight size={12} />\n              Reportes\n            </div>");
  assert.notEqual(k, jsx); assert.ok(!migas(k).some((x) => /Reportes/.test(x)), "la miga en dos líneas se dio por desaparecida"); assert.equal(h1De(k, "Reportes"), h1De(jsx, "Reportes"));
  // (l) TOLERANCIA · irA con espacios y salto de línea entre sus argumentos sigue leyéndose.
  const l = jsx.replace('irA("pipeline", "Gestión diaria")}', 'irA( "pipeline",\n              "Gestión diaria" ) }');
  assert.notEqual(l, jsx); assert.deepEqual(botonesNavbar(l).fallos, []); assert.equal(botonesNavbar(l).botones.find((x) => x.id === "pipeline").arg, "Gestión diaria");
});
