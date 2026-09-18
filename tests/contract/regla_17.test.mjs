/* Gate de contrato de la regla 17 sobre el TEXTO del fuente, sin navegador. La suite (caso.js de esta carpeta)
   prueba el COMPORTAMIENTO —`fonoOfuscado`, `auditFechaHora`, `registrarAuditoria`, la cola, el flush automático
   y la persistencia—; lo que la suite no puede ver es DÓNDE se usa cada cosa, y ahí es donde la regla se rompe
   en silencio: una glosa nueva que escriba `reg.contacto.fono` a secas no falla en ningún test de función.
   Acá se fija:
   (1) TELÉFONOS: toda referencia a un campo de teléfono (`.fono`, `.telefono`, `.celular`, `.movil`, `.tel`,
       `.phone`, `.whatsapp`) —directa, o a través de una variable local que se cargó desde uno de esos campos—
       dentro de un TRAMO que escribe un log (el argumento COMPLETO, aunque ocupe varias líneas, de
       registrarAuditoria / logSys / hist.push / cambios.push / historialContacto.push; el valor de glosa: /
       resultado: / detalle: / mensaje:) va envuelta en un OFUSCADOR. Un ofuscador NO se acepta por su nombre:
       se extrae su cuerpo del fuente y se EJECUTA acá contra cinco formatos de teléfono. `fonoOfuscado` tiene
       que dejar «•••» + los últimos 4 dígitos; un ofuscador local (el `ofs` de `editarContacto`) tiene que, al
       menos, no devolver nunca el número entero y tapar 3 dígitos o más. Un envoltorio que no se encuentre o que
       sea identidad es una violación. Mostrar el teléfono en pantalla (Tel: …) o guardarlo en el estado
       (`telefono: nu.telefono.trim()`) no es un log y no se cuenta: se mide el tramo, no la línea.
       Límite conocido: es un gate de TEXTO; un alias que no salga de una asignación `const x = ….telefono`
       (p. ej. un parámetro de función que reciba el teléfono) no se ve. Eso lo cubre la revisión, no este gate.
   (2) MARCAS ABSOLUTAS: `auditFechaHora`, `nowStamp` y `logSys` derivan fecha y hora con getDate/getMonth/
       getFullYear/getHours/getMinutes/getSeconds; `auditFechaHora` no mira el reloj (recibe el ts del evento) y
       ninguno de los tres formatea relativo («hace», «atrás», «ago»). `registrarAuditoria` toma `e.ts || Date.now()`
       y guarda `ts` MÁS `...auditFechaHora(ts)`. Y las dos VISTAS (la de auditoría y la del log técnico) muestran
       `.fecha` y `.hora` del registro, no un relativo calculado sobre `.ts` al leer.
   (3) CADENA, PERSISTENCIA Y APPEND-ONLY: `auditHuella` firma con `previo` PRIMERO en el material;
       `registrarAuditoria` captura `previo` ANTES del `unshift`, estampa `hAlg = HASH_ALG`, encola en
       `AUDIT_COLA = AUDIT_COLA.then(` la huella con `previo ? previo.h : ""` y AGENDA el flush ella misma (el
       `setTimeout(… persistirAuditoria() …, 1200)` al registrar y el de 0 ms cuando la huella llega tarde): sin
       esas dos líneas la auditoría sólo persiste si alguien lo pide, y «persistente» deja de ser cierto.
       `persistirAuditoria` drena la cola (`while (c !== AUDIT_COLA)`) y escribe `AUDIT_KEY` sólo con registros
       `hAlg`; `verificarAuditoria` compara con `igualConstante`; y el log es APPEND-ONLY: `AUDIT_LOG` sólo se muta
       con unshift/push/sort y la cota `length = AUDIT_MAX` —ningún splice/shift/pop/`length = 0`, ninguna
       asignación en sitio `AUDIT_LOG[i].campo = …` / `AUDIT_LOG[i] = …` / `delete AUDIT_LOG[i]`— y `vaciarSysLog`
       no lo toca. (Editar por un alias —`const r = AUDIT_LOG[0]; r.glosa = …`— no se ve en el texto; lo detecta
       la cadena en runtime, que es lo que prueba la suite con la glosa alterada.)
   Sonda: dieciséis mutantes del fuente, una violación cada uno, y el auditor tiene que NOMBRAR la suya. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una declaración de nivel módulo: desde su línea a columna 0 hasta la siguiente declaración a columna 0. */
export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^(?:async function|function|const|let) ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:async function|function|const|let|var|export|\(\(\) =>|\(function)\b/m);
  return m[0] + (fin < 0 ? resto : resto.slice(0, fin));
}
/* La función de nivel módulo (`function Nombre(`) que contiene la primera aparición de `aguja`. */
export function componenteQueUsa(src, aguja) {
  // La primera aparición del hook es su propia definición (`const usarAuditoria = () => …`): se toma la primera
  // que viva dentro de un COMPONENTE (función de nivel módulo con nombre en mayúscula), que es la vista.
  let desde = 0, i;
  while ((i = src.indexOf(aguja, desde)) >= 0) {
    desde = i + aguja.length;
    const decls = [...src.slice(0, i).matchAll(/^function (\w+)\(/gm)];
    const nombre = decls.length ? decls[decls.length - 1][1] : null;
    if (nombre && /^[A-Z]/.test(nombre)) return nombre;
  }
  return null;
}
const lineaDe = (src, idx) => src.slice(0, idx).split("\n").length;

// ── (1) Teléfonos ───────────────────────────────────────────────────────────────────────────────
const CAMPO_FONO = "fono|telefono|fonoMovil|celular|movil|tel|phone|whatsapp";
const REF_FONO = new RegExp(`\\.(${CAMPO_FONO})\\b`, "g");
const ABRIDORES = /\b(?:registrarAuditoria|logSys)\(|\b(?:hist|cambios|historialContacto|bitacora)\.push\(/g;
const CLAVES_LOG = /\b(?:glosa|resultado|detalle|mensaje):/g;
const FONOS_MUESTRA = ["+56 9 8765 4321", "+56987654321", "(2) 2345 6789", "9-1234-5678", "56 2 2987 6543"];
const digitos = (s) => String(s == null ? "" : s).replace(/\D/g, "");

/* Fin del argumento de una llamada: desde el `(` abridor hasta su `)` de cierre, contando paréntesis y saltando
   cadenas "…" y '…' (los template literals se cuentan tal cual: su `${…}` también va balanceado). Cap: 80 líneas. */
function cierreDeLlamada(src, iParen) {
  let prof = 0, i = iParen, lineas = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '"' || ch === "'") { const q = ch; i++; while (i < src.length && src[i] !== q && src[i] !== "\n") { if (src[i] === "\\") i++; i++; } }
    else if (ch === "\n") { if (++lineas > 80) return i; }
    else if (ch === "(") prof++;
    else if (ch === ")") { prof--; if (prof === 0) return i + 1; }
    i++;
  }
  return src.length;
}
/* Tramos [ini, fin) del fuente que ESCRIBEN un log. */
export function tramosLog(src) {
  const tramos = [];
  for (const m of src.matchAll(ABRIDORES)) tramos.push([m.index, cierreDeLlamada(src, m.index + m[0].length - 1)]);
  for (const m of src.matchAll(CLAVES_LOG)) { const nl = src.indexOf("\n", m.index); tramos.push([m.index, nl < 0 ? src.length : nl]); }
  return tramos;
}
/* Identificadores cargados desde un campo de teléfono (`const tel = d.contacto.telefono`, `const { telefono } = c`).
   Una comparación (`const cambio = a.telefono !== b.telefono`) es un booleano, no un teléfono. */
export function identificadoresConFono(src) {
  const ids = new Set();
  for (const m of src.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*([^;\n]*)/g)) {
    const rhs = m[2];
    if (!new RegExp(`\\.(${CAMPO_FONO})\\b`).test(rhs)) continue;
    if (/[!=]==?|[<>]=?|\?\?/.test(rhs) && !/\|\|\s*""/.test(rhs)) continue; // booleano
    if (new RegExp(`\\w+\\(\\s*[\\w.\\[\\]"']*\\.(?:${CAMPO_FONO})\\b`).test(rhs)) continue;       // ya viene envuelto
    ids.add(m[1]);
  }
  for (const m of src.matchAll(/\b(?:const|let|var)\s*\{([^}\n]*)\}\s*=/g))
    for (const campo of m[1].split(",")) { const n = campo.trim().split(/\s*:\s*/).pop(); if (n && new RegExp(`^(?:${CAMPO_FONO})$`).test(campo.trim().split(/\s*:\s*/)[0])) ids.add(n); }
  return ids;
}
/* Ejecuta un ofuscador extraído del fuente contra la muestra. `estricto`: «•••» + últimos 4 dígitos (fonoOfuscado);
   si no, la cota mínima de un ofuscador local: nunca el número entero y al menos 3 dígitos tapados. */
export function ofuscadorCumple(fn, estricto) {
  try {
    for (const f of FONOS_MUESTRA) {
      const d = digitos(f), o = String(fn(f)), od = digitos(o);
      if (o.includes(d) || od === d) return `devuelve el número entero para «${f}» → «${o}»`;
      if (estricto) { if (!/^•••\d{1,4}$/.test(o) || !d.endsWith(od)) return `para «${f}» devuelve «${o}» y no «•••» + los últimos 4 dígitos`; }
      else if (od.length > d.length - 3) return `para «${f}» devuelve «${o}»: tapa menos de 3 dígitos`;
    }
    if (estricto && fn("") !== "—") return `para "" devuelve «${fn("")}» y no «—»`;
    fn(""); fn(null); fn(undefined);
    return null;
  } catch (e) { return `revienta al ejecutarlo: ${String(e).slice(0, 80)}`; }
}
/* Extrae y compila un ofuscador por nombre: `function nombre(…) {…}` de nivel módulo, o `const nombre = (…) => …;`
   local en una línea. Devuelve { fn } o { error }. */
export function compilarOfuscador(src, nombre) {
  const cuerpo = cuerpoDe(src, nombre);
  if (cuerpo && new RegExp(`^function ${nombre}\\(`, "m").test(cuerpo)) {
    try { return { fn: new Function(cuerpo + `\n;return ${nombre};`)() }; } catch (e) { return { error: `no compila solo: ${String(e).slice(0, 80)}` }; }
  }
  const local = src.match(new RegExp(`^\\s*const ${nombre} = ((?:\\([^)]*\\)|\\w+) => [^\\n]*?);\\s*$`, "m"));
  if (!local) return { error: `no encuentro \`${nombre}\` como función de nivel módulo ni como arrow local de una línea` };
  try { return { fn: new Function(`return (${local[1]});`)() }; } catch (e) { return { error: `no compila solo: ${String(e).slice(0, 80)}` }; }
}
/* Referencias a un teléfono dentro de un tramo que escribe un log, sin un ofuscador que CUMPLA. */
export function fonosSinOfuscar(src) {
  const fallos = [];
  const tainted = identificadoresConFono(src);
  const cache = new Map();
  const veredicto = (nombre) => {
    if (!cache.has(nombre)) {
      const c = compilarOfuscador(src, nombre);
      cache.set(nombre, c.error ? `«${nombre}(» no es un ofuscador verificable: ${c.error}` : (ofuscadorCumple(c.fn, nombre === "fonoOfuscado") ? `«${nombre}(» no ofusca: ${ofuscadorCumple(c.fn, nombre === "fonoOfuscado")}` : null));
    }
    return cache.get(nombre);
  };
  // `\b` es ASCII: «tel» seguido de «é» es límite de palabra, así que `\btel\b` calzaba DENTRO de «teléfono»
  // y una glosa en español se leía como la variable local. La cota pide que no siga letra, acentuada incluida.
  const refTainted = tainted.size ? new RegExp(`(?<![.\\w])(${[...tainted].join("|")})(?![\\w\\u00C0-\\u024F])(?!\\s*[:=(])`, "g") : null;
  for (const [a, b] of tramosLog(src)) {
    const t = src.slice(a, b);
    if (/^\s*\/\//.test(src.slice(src.lastIndexOf("\n", a) + 1, a + 1))) continue; // línea comentada
    const refs = [...t.matchAll(REF_FONO)].map((m) => ({ i: m.index, txt: m[0], re: `\\.(?:${CAMPO_FONO})$` }));
    if (refTainted) for (const m of t.matchAll(refTainted)) refs.push({ i: m.index, txt: m[0] + " (cargada desde un campo de teléfono)", re: `\\b${m[1]}$` });
    for (const r of refs) {
      const antes = t.slice(0, r.i + (r.txt.split(" ")[0]).length);
      const w = antes.match(new RegExp(`(\\w+)\\(\\s*[\\w.\\[\\]"']*${r.re}`));
      const linea = lineaDe(src, a + r.i);
      if (!w) { fallos.push(`línea ${linea}: «${r.txt}» entra a un log sin ofuscar → ${src.slice(src.lastIndexOf("\n", a + r.i) + 1, a + r.i + 60).trim().slice(0, 100)}`); continue; }
      const v = veredicto(w[1]);
      if (v) fallos.push(`línea ${linea}: «${r.txt}» entra a un log envuelta en ${v}`);
    }
  }
  return fallos;
}

// ── (2) Marcas absolutas ────────────────────────────────────────────────────────────────────────
const ABS = ["getDate()", "getMonth() + 1", "getFullYear()", "getHours()", "getMinutes()", "getSeconds()"];
const RELATIVO = /\bhace\b|atr[aá]s|\bago\b|fromNow|timeAgo/i;
export function marcasAbsolutas(src) {
  const fallos = [];
  for (const nombre of ["auditFechaHora", "nowStamp", "logSys"]) {
    const c = cuerpoDe(src, nombre);
    if (!c) { fallos.push(`no encuentro \`${nombre}\` a nivel módulo`); continue; }
    for (const a of ABS) if (!c.includes(a)) fallos.push(`\`${nombre}\` ya no deriva la marca con ${a}`);
    if (RELATIVO.test(c)) fallos.push(`\`${nombre}\` formatea una marca RELATIVA (${(c.match(RELATIVO) || [])[0]}): los timestamps de un log son absolutos`);
  }
  const afh = cuerpoDe(src, "auditFechaHora") || "";
  if (/Date\.now\(\)/.test(afh)) fallos.push("`auditFechaHora` mira el reloj: la fecha de un registro se deriva del ts del EVENTO, no de cuándo se lee");
  if (!/^function auditFechaHora\(ts\)/m.test(src) || !/new Date\(ts\)/.test(afh)) fallos.push("`auditFechaHora(ts)` tiene que construir la fecha desde su parámetro `ts`");
  const ra = cuerpoDe(src, "registrarAuditoria") || "";
  if (!ra.includes("const ts = e.ts || Date.now();")) fallos.push("`registrarAuditoria` perdió `const ts = e.ts || Date.now();` (el ts es del evento; el reloj sólo cuando el evento no lo trae)");
  if (!/const r = \{[\s\S]{0,800}?\bts,\s*\.\.\.auditFechaHora\(ts\)/.test(ra)) fallos.push("el registro de auditoría tiene que llevar `ts` (epoch) MÁS `...auditFechaHora(ts)` (fecha y hora absolutas)");
  const ls = cuerpoDe(src, "logSys") || "";
  if (!ls.includes("const ts = Date.now();") || !/\bts,/.test(ls) || !/fecha:/.test(ls) || !/hora:/.test(ls)) fallos.push("`logSys` tiene que estampar `ts` (epoch) más `fecha:` y `hora:` absolutas en cada entrada");
  // las vistas muestran la marca guardada, no un relativo calculado al leer
  for (const [hook, que] of [["usarAuditoria()", "auditoría"], ["usarSysLog()", "log técnico"]]) {
    const comp = componenteQueUsa(src, hook);
    const cv = comp ? cuerpoDe(src, comp) : null;
    if (!cv) { fallos.push(`no encuentro el componente que usa ${hook}`); continue; }
    // Basta con que muestre la marca GUARDADA: la vista del log técnico rinde sólo la hora (una línea por
    // evento del día), la de auditoría las dos. Lo que la regla prohíbe es calcular un relativo al leer.
    if (!/\.fecha\}/.test(cv) && !/\.hora\}/.test(cv)) fallos.push(`la vista de ${que} (\`${comp}\`) ya no muestra \`.fecha\` ni \`.hora\` del registro`);
    if (RELATIVO.test(cv)) fallos.push(`la vista de ${que} (\`${comp}\`) formatea una marca RELATIVA (${(cv.match(RELATIVO) || [])[0]}): la fecha de un evento no depende de cuándo se mira`);
    if (/Date\.now\(\)\s*-\s*\w+\.ts\b|\w+\.ts\s*-\s*Date\.now\(\)/.test(cv)) fallos.push(`la vista de ${que} (\`${comp}\`) calcula sobre \`Date.now() - .ts\`: eso es un relativo`);
  }
  return fallos;
}

// ── (3) Cadena, flush automático, persistencia y append-only ────────────────────────────────────
export function cadenaAuditoria(src) {
  const fallos = [];
  if (!/^const auditHuella = \(r, previo\) => sha256Hex\(\[previo \|\| "",/m.test(src)) fallos.push("`auditHuella(r, previo)` tiene que firmar con `previo` PRIMERO en el material: sin él no hay cadena, sólo hashes sueltos");
  const ra = cuerpoDe(src, "registrarAuditoria") || "";
  if (!ra) fallos.push("no encuentro `registrarAuditoria`");
  const iPrevio = ra.indexOf("const previo = AUDIT_LOG.length ? AUDIT_LOG[0] : null;"), iUnshift = ra.indexOf("AUDIT_LOG.unshift(r);");
  if (iPrevio < 0) fallos.push("`registrarAuditoria` perdió `const previo = AUDIT_LOG.length ? AUDIT_LOG[0] : null;`");
  if (iUnshift < 0) fallos.push("`registrarAuditoria` ya no inserta con `AUDIT_LOG.unshift(r);` (el más reciente va primero)");
  if (iPrevio >= 0 && iUnshift >= 0 && iPrevio > iUnshift) fallos.push("`previo` se captura DESPUÉS del unshift: el registro se encadenaría consigo mismo");
  if (!ra.includes("r.hAlg = HASH_ALG;")) fallos.push("`registrarAuditoria` tiene que estampar `r.hAlg = HASH_ALG` (es lo que distingue un registro real de la semilla y lo que persiste)");
  if (!ra.includes("AUDIT_COLA = AUDIT_COLA.then(")) fallos.push("la huella tiene que encolarse en `AUDIT_COLA = AUDIT_COLA.then(`: SHA-256 es asíncrono y la cadena se calcula EN ORDEN");
  if (!ra.includes('r.h = await auditHuella(r, previo ? previo.h : "");')) fallos.push("la huella del registro es `auditHuella(r, previo ? previo.h : \"\")`: la del anterior, o vacía para el primero");
  // flush AUTOMÁTICO: «persistente» significa que la app persiste sola, no cuando alguien llama persistirAuditoria()
  const flushes = [...ra.matchAll(/AUDIT_FLUSH_T = setTimeout\(\(\) => \{\s*AUDIT_FLUSH_T = null;\s*persistirAuditoria\(\);\s*\}, (\d+)\)/g)].map((m) => +m[1]);
  if (!flushes.includes(1200)) fallos.push("`registrarAuditoria` ya no agenda el flush (`AUDIT_FLUSH_T = setTimeout(… persistirAuditoria() …, 1200)`): la auditoría dejaría de persistir sola");
  if (!flushes.includes(0)) fallos.push("la huella que llega tarde tiene que volver a pedir flush (`setTimeout(… persistirAuditoria() …, 0)` dentro de la cola), o el último registro queda sin huella en disco");
  const pa = cuerpoDe(src, "persistirAuditoria") || "";
  if (!pa.includes("while (c !== AUDIT_COLA)")) fallos.push("`persistirAuditoria` tiene que DRENAR la cola (`while (c !== AUDIT_COLA)`) antes de escribir, o persiste registros sin huella");
  if (!/setItem\(\s*AUDIT_KEY,/.test(pa)) fallos.push("`persistirAuditoria` ya no escribe en `AUDIT_KEY`");
  if (!pa.includes("AUDIT_LOG.filter((r) => r.hAlg)")) fallos.push("`persistirAuditoria` persiste sólo registros con `hAlg`: la semilla no es evidencia");
  const va = cuerpoDe(src, "verificarAuditoria") || "";
  if (!va.includes("igualConstante(r.h, await auditHuella(r, previo))")) fallos.push("`verificarAuditoria` recalcula cada eslabón con `auditHuella(r, previo)` y compara con `igualConstante`");
  // append-only
  const mut = [...src.matchAll(/AUDIT_LOG\.(splice|shift|pop|reverse|fill|copyWithin)\(/g)].map((m) => m[0]);
  if (mut.length) fallos.push(`AUDIT_LOG es append-only y el fuente lo muta con ${[...new Set(mut)].join(", ")}`);
  const trunc = [...src.matchAll(/AUDIT_LOG\.length = (?!AUDIT_MAX;)[^\n]*/g)].map((m) => m[0]);
  if (trunc.length) fallos.push(`AUDIT_LOG sólo se recorta por la cota (\`length = AUDIT_MAX\`), no con ${trunc.join(" | ")}`);
  const enSitio = [...src.matchAll(/AUDIT_LOG\[[^\]\n]*\](?:\s*\.\s*\w+|\s*\[[^\]\n]*\])*\s*(?:=(?!=)|\+=|-=)|delete AUDIT_LOG\[|Object\.assign\(\s*AUDIT_LOG\[/g)].map((m) => `línea ${lineaDe(src, m.index)}: ${m[0].trim()}`);
  if (enSitio.length) fallos.push(`AUDIT_LOG es append-only y el fuente edita un registro EN SITIO (${enSitio.join(" | ")}): la evidencia no se corrige, se agrega otro registro`);
  const vs = cuerpoDe(src, "vaciarSysLog") || "";
  if (/AUDIT_LOG/.test(vs)) fallos.push("`vaciarSysLog` toca AUDIT_LOG: vaciar el log técnico no puede vaciar la evidencia");
  if (!/registrarAuditoria\(/.test(vs)) fallos.push("vaciar el log técnico es un hecho auditable: `vaciarSysLog` tiene que llamar a `registrarAuditoria`");
  return fallos;
}

test("regla 17 · ningún campo de teléfono —directo o por variable local— entra a un tramo de log sin un ofuscador que se ejecute y cumpla", () => {
  const f = fonosSinOfuscar(jsx);
  assert.deepEqual(f, [], f.join("\n"));
  // y las dos glosas de la verificación telefónica —donde el teléfono sí viaja— existen y ofuscan
  const n = (jsx.match(/fonoOfuscado\(reg\.contacto\.fono\)/g) || []).length;
  assert.ok(n >= 2, `esperaba al menos 2 glosas de auditoría con fonoOfuscado(reg.contacto.fono); hay ${n}`);
  assert.match(jsx, /^function fonoOfuscado\(fono\)/m, "`fonoOfuscado` tiene que ser de nivel módulo (la suite la llama)");
  // el ofuscador se juzga por lo que HACE: compilado desde el fuente, contra la muestra
  const c = compilarOfuscador(jsx, "fonoOfuscado");
  assert.ok(c.fn, c.error);
  assert.equal(ofuscadorCumple(c.fn, true), null);
  // el tramo se mide de verdad: hay al menos un tramo multilínea y las glosas largas caen dentro
  assert.ok(tramosLog(jsx).some(([a, b]) => jsx.slice(a, b).includes("\n")), "ningún tramo multilínea: el balance de paréntesis dejó de funcionar");
});

test("regla 17 · las marcas de auditoría, bitácora, log técnico y sus vistas son absolutas y salen del ts del evento", () => {
  const f = marcasAbsolutas(jsx);
  assert.deepEqual(f, [], f.join("\n"));
});

test("regla 17 · la auditoría encadena en orden por AUDIT_COLA, agenda su propio flush, persiste con huella y es append-only", () => {
  const f = cadenaAuditoria(jsx);
  assert.deepEqual(f, [], f.join("\n"));
});

/* Sonda negativa: cada mutante planta UNA violación y el auditor tiene que nombrarla. */
const OFS_HOY = 'const ofs = (t) => (t ? String(t).replace(/\\d{3,4}(?=\\s*$)/, "XXXX") : "—");';
const MUTANTES = [
  ["glosa de verificación con el teléfono a secas", (s) => s.replace("fonoOfuscado(reg.contacto.fono)", "reg.contacto.fono"), fonosSinOfuscar, /reg\.contacto\.fono|\.fono/],
  ["bitácora de contacto con el teléfono a secas", (s) => s.replace("${ofs(prev.telefono)}", "${prev.telefono}"), fonosSinOfuscar, /\.telefono.*sin ofuscar/],
  ["logSys nuevo con el teléfono del contacto", (s) => s + '\n  logSys("info", "wa", `llamada a ${d.contacto.telefono}`);\n', fonosSinOfuscar, /\.telefono/],
  ["R1 · el `ofs` de la bitácora se vuelve identidad (el nombre sigue, el número entero también)", (s) => s.replace(OFS_HOY, 'const ofs = (t) => (t ? String(t) : "—");'), fonosSinOfuscar, /«ofs\(» no ofusca.*número entero/],
  ["R1-bis · el `ofs` de la bitácora tapa sólo 2 dígitos", (s) => s.replace(OFS_HOY, 'const ofs = (t) => (t ? String(t).replace(/\\d{2}(?=\\s*$)/, "XX") : "—");'), fonosSinOfuscar, /«ofs\(» no ofusca.*menos de 3/],
  ["un envoltorio con nombre de ofuscador que no existe", (s) => s.replace("fonoOfuscado(reg.contacto.fono)", "mascara(reg.contacto.fono)"), fonosSinOfuscar, /«mascara\(» no es un ofuscador verificable/],
  ["fonoOfuscado debilitada: deja 8 dígitos a la vista", (s) => s.replace('return s.length <= 4 ? "•••" + s : "•••" + s.slice(-4);', 'return s.length <= 4 ? "•••" + s : "•••" + s.slice(-8);'), fonosSinOfuscar, /«fonoOfuscado\(» no ofusca/],
  ["R2 · el teléfono pasa por una variable local y la glosa la interpola", (s) => s + '\n  const telWa = d.contacto.telefono;\n  logSys("info", "wa", `llamada a ${telWa}`);\n  const glosaTel = "contacto " + reg.contacto.fono;\n  registrarAuditoria({ usuario: "x", modulo: "Verificación", accion: "Llamada", glosa: glosaTel, exito: true });\n', fonosSinOfuscar, /telWa.*cargada desde un campo de teléfono/],
  ["R2-bis · la variable local que lleva la glosa", (s) => s + '\n  const glosaTel = "contacto " + reg.contacto.fono;\n  registrarAuditoria({ usuario: "x", modulo: "Verificación", accion: "Llamada", glosa: glosaTel, exito: true });\n', fonosSinOfuscar, /glosaTel.*cargada desde un campo de teléfono/],
  ["R3 · el teléfono bajo otro nombre de campo (celular, fonoMovil)", (s) => s + '\n  logSys("info", "wa", `llamada a ${d.contacto.celular}`);\n  registrarAuditoria({ usuario: "x", modulo: "Verificación", accion: "Llamada", glosa: `contacto ${reg.contacto.fonoMovil}`, exito: true });\n', fonosSinOfuscar, /\.celular/],
  ["R4 · registrarAuditoria multilínea con la glosa en su propia línea", (s) => s + '\n  registrarAuditoria({\n    usuario: "x", modulo: "Verificación", accion: "Llamada",\n    glosa: "contacto " + reg.contacto.fono + " · listo",\n    exito: true });\n', fonosSinOfuscar, /\.fono/],
  ["R4-bis · logSys multilínea con el teléfono en la tercera línea, sin clave de log", (s) => s + '\n  logSys("info", "wa",\n    "llamada a " +\n    d.contacto.telefono);\n', fonosSinOfuscar, /\.telefono/],
  ["auditFechaHora formatea relativo mirando el reloj", (s) => s.replace("fecha: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`", "fecha: `hace ${Math.round((Date.now() - ts) / 86400000)} días`"), marcasAbsolutas, /RELATIVA|reloj|getDate/],
  ["registrarAuditoria ignora el ts del evento", (s) => s.replace("const ts = e.ts || Date.now();", "const ts = Date.now();"), marcasAbsolutas, /e\.ts/],
  ["la vista de auditoría muestra «hace N min» sobre .ts en vez de la fecha guardada", (s) => s.replace('<div className="t12" style={{ color: C.ink }}>\n                    {e.fecha}\n                  </div>', '<div className="t12" style={{ color: C.ink }}>{`hace ${Math.round((Date.now() - e.ts) / 60000)} min`}</div>'), marcasAbsolutas, /vista de auditoría.*RELATIVA|Date\.now\(\) - \.ts/],
  ["auditHuella sin el eslabón anterior", (s) => s.replace('const auditHuella = (r, previo) => sha256Hex([previo || "",', "const auditHuella = (r, previo) => sha256Hex(["), cadenaAuditoria, /previo/],
  ["previo capturado después del unshift", (s) => s.replace("  const previo = AUDIT_LOG.length ? AUDIT_LOG[0] : null;\n  r.hAlg = HASH_ALG;\n  AUDIT_LOG.unshift(r);", "  r.hAlg = HASH_ALG;\n  AUDIT_LOG.unshift(r);\n  const previo = AUDIT_LOG.length ? AUDIT_LOG[0] : null;"), cadenaAuditoria, /DESPUÉS del unshift/],
  ["R6 · registrarAuditoria sin flush automático: sólo persiste si alguien lo pide", (s) => s
    .replace(/ *if \(AUDIT_FLUSH_T == null\)\n *AUDIT_FLUSH_T = setTimeout\(\(\) => \{\n *AUDIT_FLUSH_T = null;\n *persistirAuditoria\(\);\n *\}, \d+\);\n/g, ""), cadenaAuditoria, /ya no agenda el flush/],
  ["alguien borra un registro de la auditoría", (s) => s.replace("function vaciarSysLog() {\n", "function vaciarSysLog() {\n  AUDIT_LOG.splice(0, 1);\n"), cadenaAuditoria, /splice|vaciarSysLog/],
  ["R5 · alguien edita un registro EN SITIO fuera de vaciarSysLog", (s) => s.replace("function descargarArchivoLog(entradas) {\n", 'function descargarArchivoLog(entradas) {\n  if (AUDIT_LOG[0]) { AUDIT_LOG[0].glosa = "editada"; AUDIT_LOG[0].h = null; }\n'), cadenaAuditoria, /EN SITIO.*AUDIT_LOG\[0\]\.glosa/],
  ["R5-bis · alguien reemplaza un registro entero", (s) => s.replace("function descargarArchivoLog(entradas) {\n", 'function descargarArchivoLog(entradas) {\n  AUDIT_LOG[3] = { ...AUDIT_LOG[3], glosa: "x" };\n'), cadenaAuditoria, /EN SITIO.*AUDIT_LOG\[3\] =/],
];
for (const [nombre, mutar, auditor, espera] of MUTANTES) {
  test(`sonda · ${nombre}`, () => {
    const m = mutar(jsx);
    assert.notEqual(m, jsx, "el mutante no cambió nada: el ancla del fuente se movió y la sonda dejó de probar");
    const f = auditor(m);
    assert.ok(f.length >= 1 && f.some((x) => espera.test(x)), `el auditor no nombró la violación plantada; devolvió: ${JSON.stringify(f)}`);
  });
}
