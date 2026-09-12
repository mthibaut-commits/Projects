/* ============================================================================================
   AUDITORÍA DE AISLAMIENTO — qué le falta a cada función para poder vivir en el backend.

       node auditar_aislamiento.mjs

   Los dos motores (otorgamiento y verificación) y el de líneas corren en producción del lado del
   SERVIDOR: el atacante ES el cliente, así que un motor que decide en el navegador no decide nada
   —`REGLAS_CLIENTE` se edita desde la consola—. Para poder extraerlos, todo lo que deciden tiene que
   ENTRAR POR PARÁMETRO y salir puro.

   Este script no opina: recorre cada función de nivel módulo y lista qué lee de afuera, clasificado
   por qué tan difícil es de romper:

     TENANT     datos del tenant (usuarios, roles, áreas, permisos) — se inyectan como padrón
     COMMIT     evidencia persistida (visados, llamadas, vetos, versiones) — se inyecta como estado
     SESION     quién está mirando la pantalla — nunca debe decidir nada del lado del servidor
     RELOJ      nowStamp()/Date — la hora la pone el servidor, no el cliente
     AZAR       Math.random — rompe la reproducibilidad de una decisión
     BATCH      datos inyectados (DTESYNC, listas) — en producción son un SELECT del batch diario
     CONFIG     catálogos y parámetros del modelo de riesgo
     MEMO       caches de módulo — en producción, la tabla precalculada

   Sin dependencias: analiza el texto del `.jsx`.
   ============================================================================================ */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(aqui, "pipeline_comercial.jsx"), "utf8");
const L = SRC.split("\n");

// ── Qué cuenta como estado externo ────────────────────────────────────────────────────────────
const MUTABLES = [...SRC.matchAll(/^let ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const CLASE = {
  TENANT: ["USERS", "EXECS", "ROL_USUARIO", "ROLES_CAT", "AREAS_CAT", "ATRIB_USUARIO", "ROL_ATRIB",
           "PERMISOS", "TENANT_ACTUAL", "CFG_ACTIVA", "JEFE_A_EXECS", "EXEC_JEFATURA"],
  COMMIT: ["VISADO_STATE", "VISADO_DETALLE", "SOLICITUD_EXC", "VERIF_EXC", "VERIF_TEL",
           "NO_CONFIRMADAS", "VERIF_VEREDICTO", "SIM_VERSIONS", "OTORG_EVENTOS"],
  SESION: ["SESION", "OTP_STORE"],
  RELOJ: ["nowStamp", "Date"],
  AZAR: ["Math.random"],
  BATCH: ["DTESYNC", "LISTA_BLANCA", "DEUDORES_AUTORIZADOS", "AECSYNC", "SHARE_OF_WALLET",
          "ESTRATEGIA_PRECIO", "LINEA_DISPONIBLE", "LB_RUT", "DA_RUT", "LB_NOMBRE", "DA_NOMBRE",
          "PROVEEDORES_CLIENTES"],
  CONFIG: ["REGLAS_CLIENTE", "VERIF_RULES", "PISO_ATRIB_MONTO", "CFG_TRAMOS", "NO_REEV_CLIENTE",
           "SPREAD_MIN_DEUDOR", "INVARIANTES", "CONTRATO_LIMITES"],
  MEMO: ["_VERIF_PAR", "_deudorIdx", "_lineaIdx", "_lf4Idx", "_dtePares", "_cacheCli", "_PADRON",
         "LINEAS_DATA", "PIPELINE_TICK"],
};
const DONDE = {};
for (const [k, xs] of Object.entries(CLASE)) for (const x of xs) DONDE[x] = k;

// ── Las funciones que DECIDEN: las que tendrían que vivir en el servicio ──────────────────────
// Se listan a propósito en vez de inferirlas: el criterio es «su resultado cambia si la operación se
// cursa o no, a quién se le pide permiso, o cuánto se gira». Lo demás es presentación.
const DECIDEN = {
  "Otorgamiento": ["evaluarOtorgItems", "evalReglaCli", "visadoDealCalc", "visadoDeal", "apiVarsCliente",
    "varsClienteActual", "varsModeloExt", "deudorBlock", "snapVersionCli", "reevaluarCliente",
    "puedeAprobarExc", "aprobadoresExc", "rolDeAreaNivel", "padronAprobadores", "atribDe", "atribDeRol",
    "nivelExigido", "pisoPorMonto", "otorgBloqueado", "bloqueoFirmeInfo", "otorgamientoCompleto",
    "requiereOtorgamiento", "esReglaDeudor", "revOtorgActual", "buildAtribucionesJSON"],
  "Verificación": ["verifDecision", "verifEvaluar", "verifPar", "verifFactura", "verifDeudorDeal",
    "verifResumenDeal", "filasVerificacion", "causasVerif", "veredictoCongelado", "claveVeredicto",
    "puedeVerificarFacturas", "facturasDeudorEnDeal"],
  "Líneas": ["asignarLineas", "recortarAsignacion", "lineasDeCliente", "lineaDeDeudor", "lineasDeudor",
    "lf4MetaPorCliente", "tipoLineaDeDeudor", "dispDeudor"],
  "Precio y estado": ["spreadMinDeudor", "notaFromScore", "scoreDeudor", "tipoDeudor", "tramoNota",
    "catShares", "catDeal", "catDisp", "aprobacionFormalCliente", "estadoCandidata",
    "causaPerdidaDeal", "churnCartera", "validarMutacion"],
};

// ── Extractor con la guarda que ya costó un login ─────────────────────────────────────────────
function cuerpo(nombre) {
  const re = new RegExp("^(?:function|const|let) " + nombre + "\\b");
  const i = L.findIndex((l) => re.test(l));
  if (i < 0) return null;
  const linea = L[i];
  let fin;
  if (/^function /.test(linea)) {
    if (linea.includes("{") && (linea.match(/\{/g) || []).length === (linea.match(/\}/g) || []).length) fin = i + 1;
    else { let j = i + 1; while (j < L.length && L[j] !== "}") j++; fin = j + 1; }
  } else {
    let saldo = 0, j = i, dentro = false;
    while (j < L.length) {
      for (const ch of L[j]) { if ("([{".includes(ch)) { saldo++; dentro = true; } else if (")]}".includes(ch)) saldo--; }
      if (dentro && saldo <= 0) break;
      if (!dentro && L[j].replace(/\/\/.*$/, "").trimEnd().endsWith(";")) break;
      j++;
    }
    fin = j + 1;
  }
  return { ini: i + 1, texto: L.slice(i, fin).join("\n") };
}

// ── Análisis ──────────────────────────────────────────────────────────────────────────────────
const filas = [];
for (const [familia, nombres] of Object.entries(DECIDEN)) {
  for (const n of nombres) {
    const c = cuerpo(n);
    if (!c) { filas.push({ familia, n, linea: null, falta: ["NO ENCONTRADA"], lecturas: {} }); continue; }
    // el cuerpo sin su propia cabecera, para no contar el nombre de la función como lectura
    const cuerpoSolo = c.texto.split("\n").slice(1).join("\n");
    const lecturas = {};
    for (const [sym, clase] of Object.entries(DONDE)) {
      const re = new RegExp("\\b" + sym.replace(".", "\\.") + "\\b");
      if (re.test(cuerpoSolo)) (lecturas[clase] = lecturas[clase] || []).push(sym);
    }
    // mutables de módulo que no estén ya clasificados
    for (const m of MUTABLES) {
      if (DONDE[m]) continue;
      if (new RegExp("\\b" + m + "\\b").test(cuerpoSolo)) (lecturas.OTRO = lecturas.OTRO || []).push(m);
    }
    // ¿recibe estado por parámetro? (la señal de que ya se desacopló)
    const firma = c.texto.split("\n")[0];
    const inyecta = /\b(padron|visado|estado|vars|rev|tel|vetadas|veredicto)\b/.test(firma);
    filas.push({ familia, n, linea: c.ini, lecturas, inyecta, lineas: c.texto.split("\n").length });
  }
}

// ── Informe ───────────────────────────────────────────────────────────────────────────────────
const PESO = { SESION: 5, AZAR: 5, COMMIT: 4, TENANT: 4, RELOJ: 3, BATCH: 2, MEMO: 2, CONFIG: 1, OTRO: 3 };
const puntaje = (f) => Object.keys(f.lecturas).reduce((a, k) => a + (PESO[k] || 1), 0);

console.log("AUDITORÍA DE AISLAMIENTO — qué lee cada función que DECIDE\n");
console.log("Clases: SESION/AZAR = nunca deben decidir · COMMIT/TENANT = se inyectan · RELOJ = lo pone");
console.log("el servidor · BATCH/MEMO = un SELECT en producción · CONFIG = el modelo de riesgo\n");

for (const familia of Object.keys(DECIDEN)) {
  console.log("── " + familia + " " + "─".repeat(72 - familia.length));
  const fs = filas.filter((f) => f.familia === familia).sort((a, b) => puntaje(b) - puntaje(a));
  for (const f of fs) {
    const clases = Object.keys(f.lecturas);
    const limpio = clases.length === 0 || clases.every((c) => c === "CONFIG");
    const marca = limpio ? "✓" : puntaje(f) >= 4 ? "✗" : "·";
    const det = clases.length
      ? clases.map((c) => c + "(" + [...new Set(f.lecturas[c])].join(",") + ")").join(" ")
      : "nada global";
    console.log(`  ${marca} ${f.n.padEnd(24)} ${String(f.linea || "—").padStart(6)}  ${det}`);
  }
  console.log("");
}

const total = filas.filter((f) => f.linea);
const puras = total.filter((f) => { const c = Object.keys(f.lecturas); return c.length === 0 || c.every((x) => x === "CONFIG"); });
const sucias = total.filter((f) => !puras.includes(f)).sort((a, b) => puntaje(b) - puntaje(a));
console.log("═".repeat(80));
console.log(`RESUMEN: ${puras.length} de ${total.length} funciones que deciden ya son extraíbles`);
console.log(`         (no leen nada global, o sólo el catálogo del modelo de riesgo)\n`);
console.log("Las que faltan, por dificultad:");
for (const f of sucias) {
  console.log(`  ${String(puntaje(f)).padStart(2)}  ${f.n.padEnd(24)} ${Object.keys(f.lecturas).join(" ")}`);
}
