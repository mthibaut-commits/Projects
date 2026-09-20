#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════════════════════════
// MIGRACIÓN AL PADRÓN REAL — de identidades sintéticas a pares RUT ↔ razón social reales
//
//   node GeneradorDatos/migrar_padron.js [activo] [--dry]
//
// Reemplaza cada identidad sintética del activo por un par REAL del padrón (`lib/padron.js`). Corre
// UNA VEZ; queda commiteado para que el cambio sea auditable y repetible, no porque haga falta de nuevo.
// Después hay que correr `node GeneradorDatos/generar.js`, que recalcula los derivados sobre las
// identidades nuevas y restituye el punto fijo.
//
// POR QUÉ SE MAPEA POR RUT Y NUNCA POR NOMBRE. En el activo sintético hay 50 razones sociales
// COMPARTIDAS por dos RUT distintos —«Constructora RM SA» es 39663693-3 y 41604007-5 a la vez—, o sea
// dos empresas con el mismo nombre. Un reemplazo por nombre las fusionaría. El RUT es la identidad
// (`spec_aecsync.md` §81: «la identidad es el RUT, no el nombre»), así que el nombre se reescribe
// SIEMPRE derivándolo del RUT que tiene al lado, y el defecto se corrige solo.
//
// LO QUE HACE QUE ESTO SEA SEGURO, comprobado antes de tocar nada:
//   · emisores (500) y receptores (741) son DISJUNTOS en el activo: la biyección no puede solaparse;
//   · ningún RUT del padrón aparece ya en el activo: una sustitución en una fase no se pisa a sí misma;
//   · ningún RUT sintético tiene dos razones sociales.
// Las tres se vuelven a verificar acá y el script aborta si alguna dejó de valerse.
//
// LA IDENTIDAD NO VIVE SÓLO EN EL ACTIVO, y eso costó una corrida. `lib/intencion_sow.js` declara por RUT
// qué proporción cede cada cliente a Security, y `cesiones.js` saca de ahí el CONJUNTO de cedentes. Migrar
// el activo sin migrarlo a él dejó 258 cedentes apuntando a RUT que ya no existían en el A1: AECSYNC salió
// con CERO filas y el activo se encogió 6 MB —sin un solo error, porque «este cliente no tiene documentos
// cedibles» es una condición legítima—. Por eso los archivos LIGADOS se reescriben en la misma pasada.
// `lib/cesionarios.js` NO está ligado y no debe estarlo: sus 15 RUT ya son reales.
//
// EL FORMATO DEL RUT SE CONSERVA POR CAMPO. El activo es inconsistente a propósito —`RUTEmisor` va sin
// puntos y `RUTRecep` con puntos— y los joins comparan la cadena tal cual. Cada ocurrencia se reescribe
// con la MISMA forma que tenía. Y el RUT va incrustado además en `EnlaceXml`, `EnlacePdf` y `ClaveJoin`:
// se reemplaza el token en todo el archivo, así que esos tres viajan solos.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");
const { DEUDORES, CLIENTES, PROVEEDORES } = require("./lib/padron.js");

// Archivos que llevan las MISMAS identidades sintéticas que el activo y tienen que moverse con él.
// Sólo llevan RUT (no razón social), así que les basta la sustitución de token.
const ARCHIVOS_LIGADOS = ["lib/intencion_sow.js", "../proveedores_clientes.json"];

// `proveedores_clientes.json` trae DOS universos: sus 500 clientes son los mismos emisores del activo
// —y tienen que recibir el MISMO par, o el join cliente↔proveedores se parte— y sus 697 proveedores son
// un universo APARTE, los prospectos de la prospección, que no aparecen en el A1. Éstos necesitan su
// propio tramo del padrón. Que faltara costó el caso 121: «candidatas 0», porque las candidatas se
// arman cruzando proveedores con cesionarios y los proveedores seguían siendo sintéticos.
function mapaProveedores(rutaJson, lista) {
  const d = JSON.parse(fs.readFileSync(rutaJson, "utf8"));
  const clientes = new Set((d.clientes || []).map((c) => norm(c.rut)));
  const vol = new Map();
  for (const c of d.clientes || []) for (const p of c.proveedores || []) {
    const r = norm(p.rut);
    if (clientes.has(r)) continue; // es cliente: ya tiene par por el activo
    vol.set(r, (vol.get(r) || 0) + (+p.facturas || 1));
  }
  const ruts = [...vol.keys()].sort((a, b) => vol.get(b) - vol.get(a) || (a < b ? -1 : 1));
  if (lista.length < ruts.length) throw new Error(`el padrón no alcanza para proveedores: ${lista.length} < ${ruts.length}`);
  return new Map(ruts.map((r, i) => [r, lista[i]]));
}

const norm = (r) => String(r || "").replace(/\./g, "").trim().toUpperCase();
const conPuntos = (r) => {
  const [n, dv] = norm(r).split("-");
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};
// Escapa un RUT para meterlo en una expresión regular: el punto es metacarácter.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Identidades del activo, con su volumen, para que el mapeo sea por TAMAÑO: al cliente sintético con más
// documentos le toca el cedente real con más cesiones. No es cosmético — mantiene la forma de la
// distribución, que es lo que hace que los KPI de la demo sigan pareciéndose a los de antes.
function identidades(txt) {
  const emi = new Map(), rec = new Map(), nombres = new Map();
  for (const m of txt.matchAll(/"RUTEmisor":"([^"]+)","RznSoc":"([^"]+)"/g)) {
    const r = norm(m[1]);
    emi.set(r, (emi.get(r) || 0) + 1);
    if (!nombres.has(r)) nombres.set(r, new Set());
    nombres.get(r).add(m[2]);
  }
  for (const m of txt.matchAll(/"RUTRecep":"([^"]+)","RznSocRecep":"([^"]+)"/g)) {
    const r = norm(m[1]);
    rec.set(r, (rec.get(r) || 0) + 1);
    if (!nombres.has(r)) nombres.set(r, new Set());
    nombres.get(r).add(m[2]);
  }
  return { emi, rec, nombres };
}

function construirMapa(txt, padron) {
  const { emi, rec, nombres } = identidades(txt);
  const ambiguos = [...nombres].filter(([, s]) => s.size > 1);
  if (ambiguos.length) throw new Error(`hay ${ambiguos.length} RUT con más de una razón social: el mapeo por RUT dejaría de ser una función`);
  const inter = [...emi.keys()].filter((r) => rec.has(r));
  if (inter.length) throw new Error(`emisores y receptores se solapan en ${inter.length} RUT: la biyección no es válida`);
  const porVol = (m) => (a, b) => m.get(b) - m.get(a) || (a < b ? -1 : 1); // orden total ⇒ determinista
  const asignar = (rutsOrdenados, lista, rol) => {
    if (lista.length < rutsOrdenados.length) throw new Error(`el padrón no alcanza para ${rol}: ${lista.length} < ${rutsOrdenados.length}`);
    return rutsOrdenados.map((r, i) => [r, lista[i]]);
  };
  const mapa = new Map([
    ...asignar([...emi.keys()].sort(porVol(emi)), padron.CLIENTES, "clientes"),
    ...asignar([...rec.keys()].sort(porVol(rec)), padron.DEUDORES, "deudores"),
  ]);
  for (const [, par] of mapa) if (txt.includes(`"${par.rut}"`)) throw new Error(`el RUT ${par.rut} del padrón ya está en el activo: la sustitución se pisaría`);
  return mapa;
}

// Reescribe el activo. Primero los NOMBRES —en pareja con su RUT, que todavía es el viejo— y sólo
// después los RUT. Invertir el orden dejaría los nombres sin par por el que buscarse.
function migrar(txt, mapa) {
  let out = txt;
  const cuenta = { nombres: 0, ruts: 0 };
  const pares = [["RUTEmisor", "RznSoc"], ["RUTRecep", "RznSocRecep"], ["RUTCedente", "RazonSocialCedente"],
    ["RUT", "RazonSocial"], ["RUTCliente", "RazonSocialCliente"], ["rut", "razonSocial"]];
  for (const [cr, cn] of pares) {
    out = out.replace(new RegExp(`("${cr}":\\s*")([^"]+)(",\\s*"${cn}":\\s*")([^"]+)(")`, "g"), (todo, a, rut, b, _viejo, c) => {
      const par = mapa.get(norm(rut));
      if (!par) return todo;
      cuenta.nombres++;
      return a + rut + b + par.razonSocial.replace(/[\\"]/g, "\\$&") + c;
    });
  }
  // Los RUT, en todas sus formas y dondequiera que estén: campos, ClaveJoin, EnlaceXml, EnlacePdf.
  for (const [viejo, par] of mapa) {
    const sin = viejo, con = conPuntos(viejo);
    for (const forma of new Set([sin, con])) {
      const re = new RegExp(esc(forma), "g");
      const nuevo = forma.includes(".") ? conPuntos(par.rut) : norm(par.rut);
      out = out.replace(re, () => { cuenta.ruts++; return nuevo; });
    }
  }
  return { out, cuenta };
}

module.exports = { norm, conPuntos, identidades, construirMapa, migrar };

if (require.main === module) {
  const activo = process.argv.find((a) => a.endsWith(".js") && a !== process.argv[1]) || path.join(__dirname, "..", "datos_inyectados.js");
  const seco = process.argv.includes("--dry");
  const txt = fs.readFileSync(activo, "utf8");
  const mapa = construirMapa(txt, { DEUDORES, CLIENTES });
  for (const [r, par] of mapaProveedores(path.join(__dirname, "..", "proveedores_clientes.json"), PROVEEDORES)) mapa.set(r, par);
  const { out, cuenta } = migrar(txt, mapa);
  const quedan = [...mapa.keys()].filter((r) => out.includes(`"${r}"`) || out.includes(`"${conPuntos(r)}"`));
  console.log(`identidades mapeadas: ${mapa.size}`);
  console.log(`   razones sociales reescritas: ${cuenta.nombres}`);
  console.log(`   ocurrencias de RUT reescritas: ${cuenta.ruts}`);
  console.log(`   RUT sintéticos que sobreviven: ${quedan.length}${quedan.length ? " ← " + quedan.slice(0, 5).join(", ") : ""}`);
  if (quedan.length) { console.error("ABORTA: quedó una identidad sintética sin migrar"); process.exit(1); }
  // Los ligados, con el MISMO mapa: si se migran con otro, las dos mitades dejan de casar en silencio.
  const ligados = ARCHIVOS_LIGADOS.map((rel) => {
    const ruta = path.join(__dirname, rel);
    const antes = fs.readFileSync(ruta, "utf8");
    const { out: despues, cuenta: c } = migrar(antes, mapa);
    const sobran = [...mapa.keys()].filter((r) => despues.includes(`"${r}"`) || despues.includes(`"${conPuntos(r)}"`));
    return { ruta, rel, despues, n: c.ruts, sobran };
  });
  for (const l of ligados) console.log(`   ligado ${l.rel}: ${l.n} RUT reescritos, ${l.sobran.length} sintéticos sobreviven`);
  const malos = ligados.filter((l) => l.sobran.length);
  if (malos.length) { console.error(`ABORTA: ${malos[0].rel} conserva identidades sintéticas`); process.exit(1); }
  if (seco) { console.log("(--dry: no se escribió nada)"); process.exit(0); }
  fs.writeFileSync(activo, out);
  for (const l of ligados) fs.writeFileSync(l.ruta, l.despues);
  console.log(`escrito ${activo} (${(out.length / 1e6).toFixed(1)} MB)`);
}
