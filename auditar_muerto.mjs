/* ============================================================================================
   AUDITORÍA DE CÓDIGO MUERTO — qué se puede borrar, y qué NO aunque lo parezca.

       node auditar_muerto.mjs            # informe
       node auditar_muerto.mjs --csv      # inventario en CSV, para revisar fuera

   POR QUÉ EXISTE. La poda del 11-09-2026 sacó 59 símbolos de nivel módulo (952 líneas) y dejó dos
   trampas anotadas que este script implementa para no volver a caer en ellas:

     1. El CORTE lo manda la estructura del archivo, no el balance de llaves: una función de UNA
        SOLA LÍNEA no termina en el siguiente `}` a columna 0 —se lleva ochenta líneas ajenas—, y
        `htmlAprobacion` tenía un `function aprobar(){…}` a columna 0 DENTRO de un template literal.
     2. La GUARDA es comprobar que el tramo a borrar no contenga otra declaración de nivel módulo.
        Sin ella desapareció `CUENTAS_DEMO` y con él el login entero, sin que tsc, el chequeo de
        duplicados ni el build dijeran nada: el error sólo aparece al EJECUTAR.

   Y añade lo que aquella poda no midió:

     · TRANSITIVIDAD. Un símbolo vivo sólo porque lo usa otro símbolo muerto también está muerto.
       Se itera hasta punto fijo, que es lo que convierte 40 candidatos en la lista real.
     · SUPERFICIE EXTERNA. `build_app.mjs` appendea `definirWebComponent(React, ReactDOM,
       PipelineComercial)`, y la suite y los scripts `.mjs` llaman decenas de funciones del bundle.
       Contarlas como muertas sería el peor resultado posible de esta herramienta.
     · SÓLO EN COMENTARIOS. Un símbolo cuya única mención está en un comentario está muerto igual,
       pero borrarlo deja el comentario mintiendo: se lista aparte para arreglar las dos cosas.

   No borra nada: produce el inventario. La verificación de una poda no es `tsc` ni el build —los dos
   pasan con el login roto— sino regenerar las capturas, que renderizan las once vistas.
   ============================================================================================ */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(aqui, "pipeline_comercial.jsx"), "utf8");
const L = SRC.split("\n");
const CSV = process.argv.includes("--csv");

// ── Superficie externa: lo que consumen el build, la suite y los scripts ──────────────────────
const EXTERNOS = ["definirWebComponent", "PipelineComercial"];
const CONSUMIDORES = readdirSync(aqui)
  .filter((f) => (f.endsWith(".mjs") || f === "tests_asignacion_lineas.js") && f !== "auditar_muerto.mjs")
  .map((f) => ({ nombre: f, texto: readFileSync(join(aqui, f), "utf8") }));

// ── Declaraciones de nivel módulo ─────────────────────────────────────────────────────────────
// A columna 0 y fuera de template literals: `htmlAprobacion` tenía un `function` a columna 0 dentro
// de un backtick, y tomarlo por declaración es exactamente cómo se borra código ajeno.
const enPlantilla = (() => {
  const marca = new Array(L.length).fill(false);
  let dentro = false;
  for (let i = 0; i < L.length; i++) {
    marca[i] = dentro;
    // se cuentan los backticks no escapados de la línea
    const n = (L[i].match(/(?<!\\)`/g) || []).length;
    if (n % 2 === 1) { dentro = !dentro; if (!marca[i]) marca[i] = false; }
  }
  return marca;
})();

// `async function` cuenta. Sin ella, `exportarCandidatasXlsx` no era una declaración y su cuerpo
// quedaba absorbido por el símbolo de arriba: `facturasDeCandidata` y `CESIONARIOS_MERCADO` salían
// muertos teniendo un llamador dentro de ese cuerpo. Un analizador que no ve una forma de declarar
// funciones no da un falso negativo: da un falso POSITIVO, que acá significa borrar código vivo.
const RE_DECL = /^(?:export\s+default\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;
const DECLS = [];
for (let i = 0; i < L.length; i++) {
  if (enPlantilla[i]) continue;
  const m = L[i].match(RE_DECL);
  if (m) DECLS.push({ nombre: m[1], linea: i + 1, texto: L[i] });
}

// ── Referencias ───────────────────────────────────────────────────────────────────────────────
// Se separan las de CÓDIGO de las de COMENTARIO: un símbolo mencionado sólo en un comentario está
// muerto, pero borrarlo sin tocar el comentario deja el comentario mintiendo.
// El `...` del SPREAD se borra antes de contar. La búsqueda descarta `algo.nombre` con un lookbehind
// de punto —para no contar accesos a propiedad— y `{ ...verifPar(…) }` caía en esa red: el punto que
// lo precede es el del spread. `verifPar` salía con CERO referencias teniendo dos llamadas, que es el
// peor error posible en esta herramienta: declara borrable algo que la app usa.
const sinSpread = (l) => l.replace(/\.\.\./g, " ");
const sinComentarios = L.map((l) => sinSpread(l.replace(/\/\/.*$/, "")));
const soloComentarios = L.map((l) => { const m = l.match(/\/\/(.*)$/); return m ? m[1] : ""; });

const contar = (nombre, lineas, saltar) => {
  const re = new RegExp(`(?<![A-Za-z0-9_$.])${nombre.replace(/\$/g, "\\$")}(?![A-Za-z0-9_$])`, "g");
  let n = 0, donde = [];
  for (let i = 0; i < lineas.length; i++) {
    if (saltar && saltar.has(i)) continue;
    const c = (lineas[i].match(re) || []).length;
    if (c) { n += c; if (donde.length < 4) donde.push(i + 1); }
  }
  return { n, donde };
};

const porNombre = {};
for (const d of DECLS) (porNombre[d.nombre] || (porNombre[d.nombre] = [])).push(d);

const INFO = {};
for (const nombre of Object.keys(porNombre)) {
  const lineasDecl = new Set(porNombre[nombre].map((d) => d.linea - 1));
  const cod = contar(nombre, sinComentarios, lineasDecl);
  const com = contar(nombre, soloComentarios, null);
  let externas = 0, quien = [];
  for (const c of CONSUMIDORES) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${nombre.replace(/\$/g, "\\$")}(?![A-Za-z0-9_$])`, "g");
    const k = (sinSpread(c.texto).match(re) || []).length;
    if (k) { externas += k; quien.push(c.nombre); }
  }
  INFO[nombre] = { nombre, linea: porNombre[nombre][0].linea, decl: porNombre[nombre][0].texto.slice(0, 110),
    cod: cod.n, codDonde: cod.donde, com: com.n, externas, quien,
    protegido: EXTERNOS.includes(nombre) };
}

// ── Punto fijo: un símbolo vivo sólo porque lo usa un muerto, también está muerto ─────────────
// Para eso hace falta saber QUÉ tramo pertenece a cada símbolo. El corte lo manda la estructura del
// archivo: la siguiente declaración de nivel módulo (fuera de template literal). Es la misma guarda
// que hizo segura la poda y la que impide que una función de una línea se lleve el vecindario.
const lineasDecl = DECLS.map((d) => d.linea - 1);
const tramo = {};
for (let k = 0; k < DECLS.length; k++) {
  const ini = DECLS[k].linea - 1;
  const fin = k + 1 < DECLS.length ? DECLS[k + 1].linea - 1 : L.length;
  (tramo[DECLS[k].nombre] || (tramo[DECLS[k].nombre] = [])).push([ini, fin]);
}

// Las líneas de nivel módulo que NO son una declaración son SENTENCIAS que corren al cargar el
// bundle —`if (LOG_RESTAURADOS) logSys(...)`—, y lo que mencionan está vivo. El corte por estructura
// las mete dentro del tramo del símbolo anterior, así que sin esto una constante usada por una
// sentencia de arranque se lee como auto-referencia y sale muerta.
const RAIZ = new Set();
for (let i = 0; i < L.length; i++) {
  const l = sinComentarios[i];
  if (!l || /^\s/.test(l)) continue;
  if (RE_DECL.test(L[i]) || enPlantilla[i]) continue;
  if (/^[})\];,]/.test(l) || /^(?:import|export)\b/.test(l)) continue;
  for (const otro of Object.keys(porNombre)) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${otro.replace(/\$/g, "\\$")}(?![A-Za-z0-9_$])`);
    if (re.test(l)) RAIZ.add(otro);
  }
}

const refsDe = (nombre) => {
  // qué nombres menciona el tramo de `nombre`, sin contarse a sí mismo
  const usados = new Set();
  for (const [ini, fin] of tramo[nombre] || []) {
    const cuerpo = sinComentarios.slice(ini, fin).join("\n");
    for (const otro of Object.keys(porNombre)) {
      if (otro === nombre) continue;
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${otro.replace(/\$/g, "\\$")}(?![A-Za-z0-9_$])`);
      if (re.test(cuerpo)) usados.add(otro);
    }
  }
  return usados;
};
const USA = {};
for (const n of Object.keys(porNombre)) USA[n] = refsDe(n);

const vivos = new Set();
const pendientes = [];
for (const n of Object.keys(porNombre)) {
  const i = INFO[n];
  if (i.protegido || i.externas > 0 || RAIZ.has(n)) { vivos.add(n); pendientes.push(n); }
}
// Todo lo que un vivo menciona, vive.
while (pendientes.length) {
  const n = pendientes.pop();
  for (const o of USA[n] || []) if (!vivos.has(o)) { vivos.add(o); pendientes.push(o); }
}
// Y lo que el cuerpo del componente raíz y el resto del archivo usan, también: un símbolo referido
// desde CUALQUIER tramo vivo está vivo. Las líneas que no pertenecen a ninguna declaración (el
// preámbulo del archivo) cuentan como vivas.
const muertos = Object.keys(porNombre).filter((n) => !vivos.has(n));

// ── Informe ───────────────────────────────────────────────────────────────────────────────────
const fmt = (n, w) => String(n).padEnd(w);
if (CSV) {
  console.log("simbolo;linea;refs_codigo;refs_comentario;refs_externas;consumidores;declaracion");
  for (const n of muertos.sort((a, b) => INFO[a].linea - INFO[b].linea)) {
    const i = INFO[n];
    console.log([n, i.linea, i.cod, i.com, i.externas, i.quien.join("+"), JSON.stringify(i.decl)].join(";"));
  }
} else {
  console.log("AUDITORÍA DE CÓDIGO MUERTO — pipeline_comercial.jsx");
  console.log(`${DECLS.length} declaraciones de nivel módulo · ${Object.keys(porNombre).length} nombres distintos`);
  console.log(`Superficie externa: ${CONSUMIDORES.length} consumidores (${CONSUMIDORES.map((c) => c.nombre).join(", ")})\n`);

  const sinNada = muertos.filter((n) => INFO[n].cod === 0 && INFO[n].com === 0);
  const soloCom = muertos.filter((n) => INFO[n].cod === 0 && INFO[n].com > 0);
  const soloMuertos = muertos.filter((n) => INFO[n].cod > 0);

  const bloque = (titulo, lista, nota) => {
    console.log(`── ${titulo} (${lista.length}) ${"─".repeat(Math.max(0, 60 - titulo.length))}`);
    if (nota) console.log(`   ${nota}`);
    for (const n of lista.sort((a, b) => INFO[a].linea - INFO[b].linea)) {
      const i = INFO[n];
      console.log(`   ${fmt(i.linea, 7)}${fmt(n, 30)} cod=${fmt(i.cod, 4)} com=${fmt(i.com, 4)}`);
    }
    console.log("");
  };
  bloque("SIN NINGUNA REFERENCIA — borrar", sinNada,
    "Ni código ni comentarios los mencionan. Es la poda limpia.");
  bloque("SÓLO EN COMENTARIOS — borrar los dos", soloCom,
    "El código no los usa; borrarlos sin tocar el comentario lo deja mintiendo.");
  bloque("VIVOS SÓLO ENTRE ELLOS — REVISAR A MANO, no borrar a ciegas", soloMuertos,
    "Tienen referencias, pero sólo desde tramos que este análisis da por muertos. Es la lista donde\n   un corte mal hecho produce un falso positivo, y acá un falso positivo es borrar código vivo.");

  const soloSuite = Object.keys(porNombre).filter((n) => INFO[n].externas > 0 && INFO[n].cod === 0 && !INFO[n].protegido);
  bloque("NO SE USAN EN LA APP, SÓLO EN LOS SCRIPTS — revisar", soloSuite,
    "Vivos por la suite o por un .mjs. Puede ser contrato probado… o producto muerto con test.");

  console.log(`TOTAL A BORRAR: ${muertos.length} símbolos\n`);

  // ── B · ESTADO DE REACT QUE NADIE LEE NI ESCRIBE ────────────────────────────────────────────
  // Un `useState` cuyo valor no se lee es una celda que se actualiza para nadie; uno cuyo setter no
  // se llama es una constante escrita con la forma de un estado. Los dos son ruido que además
  // provoca renders.
  {
    const hallazgos = [];
    const re = /const \[([A-Za-z0-9_$]+),\s*([A-Za-z0-9_$]+)\]\s*=\s*useState/;
    for (let i = 0; i < L.length; i++) {
      const m = sinComentarios[i].match(re);
      if (!m) continue;
      const [, val, set] = m;
      const cv = contar(val, sinComentarios, new Set([i])).n;
      const cs = contar(set, sinComentarios, new Set([i])).n;
      if (cv === 0 || cs === 0) hallazgos.push({ linea: i + 1, val, set, cv, cs });
    }
    console.log(`── B · useState sin uso (${hallazgos.length}) ${"─".repeat(40)}`);
    for (const h of hallazgos) {
      const que = h.cv === 0 && h.cs === 0 ? "no se lee NI se escribe"
        : h.cv === 0 ? "se escribe pero NO se lee (render para nadie)"
        : "se lee pero NO se escribe (es una constante disfrazada)";
      console.log(`   ${fmt(h.linea, 7)}${fmt(h.val + " / " + h.set, 38)}${que}`);
    }
    console.log("");
  }

  // ── C · PROPS QUE SE PASAN Y EL COMPONENTE NO RECIBE ────────────────────────────────────────
  // El defecto del modelo de causas de otorgamiento era exactamente éste: «las dos props se pasaban
  // y nadie las invocaba», así que una operación derivada a otorgamiento manual no tenía salida. Un
  // prop que el destino no declara no falla: simplemente no pasa nada, y eso puede tardar meses.
  {
    const comp = {};
    for (let i = 0; i < L.length; i++) {
      const m = L[i].match(/^(?:async\s+)?function ([A-Z][A-Za-z0-9_$]*)\s*\(\s*\{/);
      if (!m) continue;
      // La lista de props se recorta BALANCEANDO LLAVES, no cortando en la primera `}`: un valor por
      // defecto es un objeto —`filtrosDeal = {}`— y cortar ahí perdía todo lo que venía después. El
      // resultado era que `PCsankey` figuraba sin declarar cuatro props que sí declara, o sea cuatro
      // hallazgos inventados en el informe que existe para encontrar props que nadie recibe.
      // La cota son 60 líneas y no 12 desde el formateo del fuente (ADR-0005): una lista larga de props
      // pasó a ocupar UNA LÍNEA POR PROP —`SimResumen` declara 22 en 24 líneas—, así que cortar en 12 se
      // comía la segunda mitad de la firma y las inventaba como «props que el componente no declara».
      let saldo = 0, txt = "", j = i, empezo = false;
      bucle: for (; j < L.length && j - i < 60; j++) {
        for (const ch of L[j]) {
          if (ch === "{") { saldo++; empezo = true; if (saldo === 1) continue; }
          else if (ch === "}") { saldo--; if (saldo === 0 && empezo) break bucle; }
          if (empezo) txt += ch;
        }
        txt += " ";
      }
      // Sólo los nombres de PRIMER nivel: lo que está dentro de un valor por defecto no es un prop.
      const nivel1 = txt.replace(/\{[^{}]*\}/g, " ").replace(/\[[^\]]*\]/g, " ");
      const props = new Set((nivel1.match(/([A-Za-z0-9_$]+)\s*(?=[,:=}]|$)/g) || []).map((x) => x.trim()));
      for (const x of (txt.match(/([A-Za-z0-9_$]+)\s*[,:]/g) || [])) props.add(x.replace(/[,:\s]/g, ""));
      for (const x of (txt.match(/([A-Za-z0-9_$]+)\s*=/g) || [])) props.add(x.replace(/[=\s]/g, ""));
      comp[m[1]] = props;
    }
    const hallazgos = [];
    const reUso = /<([A-Z][A-Za-z0-9_$]*)\s([^>]*?)\/?>/gs;
    const cuerpo = sinComentarios.join("\n");
    let u;
    while ((u = reUso.exec(cuerpo))) {
      const nombre = u[1];
      if (!comp[nombre]) continue;
      for (const pm of u[2].matchAll(/(?:^|\s)([a-zA-Z][A-Za-z0-9_$]*)=[{"]/g)) {
        const prop = pm[1];
        if (comp[nombre].has(prop) || prop === "key" || prop === "ref") continue;
        const linea = cuerpo.slice(0, u.index).split("\n").length;
        hallazgos.push({ linea, nombre, prop });
      }
    }
    const vistos = new Set();
    const unicos = hallazgos.filter((h) => { const k = h.nombre + "." + h.prop; if (vistos.has(k)) return false; vistos.add(k); return true; });
    // OJO al leer esta sección: el recorte de un uso de JSX (`<Comp … >`) no entiende ANIDAMIENTO, así
    // que a un componente se le pueden atribuir los props de sus hijos —`<DashCard sub={<span
    // className="block">…}>` figuraba pasando `className`—. Son CANDIDATOS: cada uno se comprueba
    // mirando el call site.
    console.log(`── C · props que el componente NO declara — CANDIDATOS, verificar a mano (${unicos.length}) ${"─".repeat(5)}`);
    for (const h of unicos) console.log(`   ${fmt(h.linea, 7)}<${h.nombre}> recibe «${h.prop}» y no lo declara`);
    console.log("");
  }

  // ── D · CLASES DEL <style> ──────────────────────────────────────────────────────────────────
  // En los dos sentidos, porque el caro fue el segundo: `t14` se usaba en quince lugares y NO estaba
  // declarada, así que quince elementos —entre ellos el «Monto a Girar»— heredaban el tamaño del
  // padre y quedaban de un tamaño distinto en cada pantalla, por accidente y sin error.
  {
    // Se buscan las REGLAS (`.clase{`) en todo el fuente y no el bloque <style>: hay varios bloques,
    // uno por componente, y localizarlos por su etiqueta hacía que el análisis midiera cero y no
    // dijera nada — un informe vacío se lee como «no hay hallazgos».
    const declaradas = new Set([...SRC.matchAll(/\.([a-zA-Z][\w-]*)\s*\{/g)].map((m) => m[1]));
    const usadas = new Set();
    for (const m of SRC.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)) {
      for (const c of ((m[1] || m[2] || m[3] || "").split(/\s+/))) if (c && !c.includes("$")) usadas.add(c.replace(/^.*:/, ""));
    }
    // El filtro nombra las clases PROPIAS una por una. Con prefijos anchos entraban `pl-2`/`pl-3`, que
// son utilidades de padding de Tailwind, y `card`/`chip`, que son del template de PDF: un informe con
// ruido se deja de leer, y entonces deja de servir para lo que existe.
const ESPERADAS = /^(t\d+|ovl|skel|minw5|btn-cta|pl-row|pl-sim|pl-spin|nex-)/;
    const propias = [...declaradas].filter((c) => ESPERADAS.test(c));
    const sinUso = propias.filter((c) => !usadas.has(c));
    const sinDeclarar = [...usadas].filter((c) => ESPERADAS.test(c) && !declaradas.has(c));
    console.log(`── D · clases propias del <style> (${propias.length} declaradas) ${"─".repeat(24)}`);
    console.log(`   declaradas y NO usadas: ${sinUso.length ? sinUso.join(", ") : "ninguna"}`);
    console.log(`   usadas y NO declaradas: ${sinDeclarar.length ? sinDeclarar.join(", ") + "  ← el caso t14" : "ninguna"}`);
    console.log("");
  }
}
