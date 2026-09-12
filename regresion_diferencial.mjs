/* ============================================================================================
   PRUEBA DIFERENCIAL: ¿cambió la lógica?

   Corre la MISMA batería de entradas contra DOS builds —el anterior a los cambios y el actual— y
   compara las salidas. Responde con evidencia la pregunta «después de tanto cambio, ¿se cambió la
   lógica?»: lo que debía quedar idéntico se verifica idéntico, y lo que cambió a propósito se lista
   con su diferencia para poder leerla.

       node build_app.mjs                          # deja el HTML actual
       PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node regresion_diferencial.mjs /ruta/base.html

   La batería NO puede usar símbolos que existan en una sola versión: todo va con `typeof` guardado.
   Las entradas se derivan de `DTESYNC` y `LB_RUT`, que son datos inyectados idénticos en ambos
   builds, así que las dos corridas ven exactamente lo mismo.

   Mismas dos trampas que run_tests.mjs: `nex-pipeline` renderiza en LIGHT DOM (la señal de montaje
   es el texto del login) y las opciones de `waitForFunction` van TERCERAS.
   ============================================================================================ */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const aqui = dirname(fileURLToPath(import.meta.url));
const HTML_ACTUAL = join(aqui, "pipeline_comercial.html");
const HTML_BASE = process.argv[2] || "/tmp/base/base.html";

const require = createRequire(import.meta.url);
let chromium = null;
for (const c of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
  try { ({ chromium } = require(c)); break; } catch { /* siguiente */ }
}
if (!chromium) { console.error("No encuentro playwright."); process.exit(2); }

// ── LA BATERÍA ────────────────────────────────────────────────────────────────────────────────
// Se serializa y se evalúa dentro de cada página. Devuelve un objeto {familia: resultado} que se
// compara entre las dos versiones. Todo determinista: sin Math.random, sin fechas.
const BATERIA = `(() => {
  const out = {};
  const err = (e) => ({ __error: String(e && e.message || e).slice(0, 200) });
  const intenta = (fn) => { try { return fn(); } catch (e) { return err(e); } };

  // Universo estable, derivado de los datos inyectados (idénticos en ambos builds).
  const LB = [...LB_RUT].slice(0, 40);
  const nomDe = (r) => "DEU-" + r;
  const fac = (id, rut, monto, venc) => ({ id, folio: id, deudor: nomDe(rut), rutRecep: rut,
    montoMM: monto, tipoDeudor: "Lista Blanca", venc: venc });
  const L  = (id, tipo, rut, ap, vig) => ({ id, tipo, granularidad: "par", rutDeudor: rut, aprobado: ap, vigente: vig || 0 });
  const cmd = (ap, vig, susp) => ({ id: "LF4-T", tipo: "LF4", granularidad: "comodin", categoria: "Lista Blanca", rutDeudor: null, aprobado: ap, vigente: vig || 0, suspendida: !!susp });
  const estB = (lineas, asignada, uso) => ({ estado: "B", asignadaCliente: asignada, usoCliente: uso || 0, lineas, cola: [] });
  const dl = (rut, ap, vig) => ({ rutDeudor: rut, aprobado: ap, vigente: vig || 0 });

  // ── 1 · MOTOR DE ASIGNACIÓN DE LÍNEAS ────────────────────────────────────────────────────────
  // No lo tocó ningún cambio de la sesión: tiene que salir IDÉNTICO, byte a byte.
  out.lineas = intenta(() => {
    const casos = [];
    for (let i = 0; i < 40; i++) {
      const a = LB[i % LB.length], b = LB[(i + 7) % LB.length], c = LB[(i + 13) % LB.length];
      const facturas = [
        fac("f1", a, 10 + (i % 9) * 13, 30), fac("f2", b, 25 + (i % 5) * 21, 45),
        fac("f3", c, 7 + (i % 11) * 9, 60), fac("f4", a, 40 + (i % 3) * 17, 30),
      ];
      const estado = {
        estado: estB([
          L("LF2-a", "LF2", a, 50 + i * 3, i % 4 * 5),
          L("LF3-b", "LF3", b, 30 + i * 2),
          cmd(60 + i, i % 3 * 4, i % 9 === 0),
        ], 400 + i * 11, i % 6 * 7),
        deudores: { [a]: dl(a, 200 + i * 5), [b]: dl(b, 80 + i * 3), [c]: dl(c, 40 + i) },
      };
      const r = asignarLineas(facturas, "76.111.111-" + (i % 10), estado);
      casos.push({
        i, cursable: r.cursable, requiereComite: r.requiereComite, oferta: r.oferta,
        estadoCliente: r.estadoCliente, dispCliente: r.dispCliente,
        facturas: (r.facturas || []).map((f) => ({ id: f.id, estado: f.estado, motivo: f.motivo,
          origen: (f.origen || []).map((o) => (o.lineaId || o.linea_id) + ":" + o.monto) })),
        deudores: (r.deudores || []).map((d) => ({ n: d.nombre, asignado: d.asignado, holgura: d.holgura,
          manda: d.manda && d.manda.label, conLineaPropia: d.conLineaPropia })),
        solicitudes: (r.solicitudes || []).map((s) => s.motivo + "|" + s.monto),
      });
    }
    return casos;
  });

  // ── 2 · PREDICTOR DE VERIFICACIÓN, con el plazo SIEMPRE presente ──────────────────────────────
  // Es la parte que NO debía cambiar: el único arreglo fue el dato faltante de la regla 6.
  out.verif_con_plazo = intenta(() => {
    const casos = [];
    for (let i = 0; i < 60; i++) {
      const par = {
        aplican: i % 2 ? ["V01","V02","V03","V04","V05","V06","V07","V08","V09","V10"] : ["V01","V04","V05","V07","V08","V10"],
        protocolo: { existe: i % 11 === 0, id: "PROT-" + i }, recortado: !(i % 2), prime: !(i % 3),
        fchVctoProm: 30 + (i % 5) * 15,
        pctPagoDeudor3M: 80 + (i % 21), mntCompraOp3M: 50 + i * 7, avgVentaProm3M: 90 + i * 11,
        mesesConVenta6M: i % 7, pctMora25d: (i % 9) * 0.7, pctReclamadas: (i % 8) * 0.9,
        mntPagoDeudor3M: i % 4 === 0 ? 200 + i : 1200 + i * 40,
      };
      const fs = [{ id: "a", montoMM: 20 + (i % 13) * 30, venc: 30 + (i % 5) * 15 + (i % 3) },
                  { id: "b", montoMM: 5 + (i % 7) * 11, venc: 30 + (i % 5) * 15 }];
      const r = verifDecision(par, fs);
      casos.push({ i, requiere: r.requiere, motivo: r.motivo,
        evals: (r.evals || []).map((e) => e.r.id + ":" + e.st),
        fallidas: (r.fallidas || []).map((e) => e.r.id), vals: r.vals });
    }
    return casos;
  });

  // ── 3 · REGLA 6 SIN PLAZO: acá SÍ se esperaba un cambio ──────────────────────────────────────
  out.verif_sin_plazo = intenta(() => {
    const par = { aplican: ["V06"], protocolo: { existe: false }, recortado: false, prime: false,
      fchVctoProm: 40, pctPagoDeudor3M: 95, mntCompraOp3M: 100, avgVentaProm3M: 100,
      mesesConVenta6M: 6, pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 2000 };
    const r = verifDecision(par, [{ id: "a", montoMM: 10 }]);
    return { requiere: r.requiere, v06: (r.evals.find((e) => e.r.id === "V06") || {}).st };
  });

  // ── 4 · CAT por nota ponderada por monto ──────────────────────────────────────────────────────
  out.cat = intenta(() => {
    const casos = [];
    for (let i = 0; i < 30; i++) {
      const items = [];
      for (let k = 0; k < 5; k++) items.push({ n: 2 + ((i + k) % 7) * 0.45, m: 10 + ((i * k) % 17) * 9 });
      const c = catShares(items);
      casos.push({ i, cat: c.cat, sub: c.sub, sA: +c.sA.toFixed(4), sB: +c.sB.toFixed(4), sC: +c.sC.toFixed(4), sD: +c.sD.toFixed(4) });
    }
    return casos;
  });

  // ── 5 · Nota, score y tramo por deudor ────────────────────────────────────────────────────────
  out.nota = intenta(() => [...LB_RUT].slice(0, 120).map((r) => {
    const n = nomDe(r), sc = scoreDeudor(n, "Lista Blanca").score, nota = notaFromScore(sc);
    return r + "|" + sc + "|" + nota + "|" + tramoNota(nota) + "|" + tipoDeudor(r, n);
  }));

  // ── 6 · Precio: spread mínimo por deudor y tasa ───────────────────────────────────────────────
  out.precio = intenta(() => {
    const nombres = Object.keys(typeof SPREAD_MIN_DEUDOR !== "undefined" ? SPREAD_MIN_DEUDOR : {}).slice(0, 40);
    return nombres.map((n) => n + "|" + spreadMinDeudor(n));
  });

  // ── 7 · Catálogo de otorgamiento: acá SÍ hubo cambios deliberados ─────────────────────────────
  out.catalogo = intenta(() => ({
    reglas: REGLAS_CLIENTE.length,
    ids: REGLAS_CLIENTE.map((r) => r.cond).filter(Boolean).sort(),
    tramosExc: REGLAS_CLIENTE.reduce((a, r) => a + (r.tiers || []).filter((t) => t[1] === "excepcion").length, 0),
    porArea: REGLAS_CLIENTE.reduce((a, r) => { (r.tiers || []).forEach((t) => { if (t[1] === "excepcion") a[r.area] = (a[r.area] || 0) + 1; }); return a; }, {}),
    niveles: REGLAS_CLIENTE.flatMap((r) => (r.tiers || []).filter((t) => t[1] === "excepcion").map((t) => r.cond + ":" + t[2])).sort(),
    noReev: [...NO_REEV_CLIENTE].sort((a, b) => a - b),
  }));

  // ── 8 · Evaluación de otorgamiento sobre operaciones sintéticas ───────────────────────────────
  out.otorg = intenta(() => {
    const casos = [];
    for (let i = 0; i < 24; i++) {
      const a = LB[i % LB.length], b = LB[(i + 5) % LB.length];
      const deal = { id: "REG-" + i, rutEmisor: "76.222.222-" + (i % 10), cliente: "Cliente " + i,
        amountMM: 10 + i * 17, facturasOp: [fac("x1", a, 10 + i * 9, 30), fac("x2", b, 20 + i * 4, 45)] };
      const v = visadoDealCalc(deal, {});
      casos.push({ i, estado: v.estado, nExc: v.exc.length, nRech: v.rech.length,
        rechFirme: v.rechFirme.map((x) => x.n).sort(), exc: v.exc.map((x) => x.n + "@" + (x.deudor ? "D" : "C") + ":N" + x.nivel).sort() });
    }
    return casos;
  });

  // ── 9 · Ruteo de etapa e invariantes ──────────────────────────────────────────────────────────
  out.ruteo = intenta(() => {
    const casos = [];
    for (let i = 0; i < 20; i++) {
      const a = LB[i % LB.length];
      const deal = { id: "RT-" + i, rutEmisor: "76.333.333-" + (i % 10), amountMM: 15 + i * 13,
        facturasOp: [fac("y1", a, 15 + i * 13, 30)], stage: "oferta" };
      const o = requiereOtorgamiento(deal);
      casos.push({ i, requiere: !!o, motivo: o ? o.motivo : null });
    }
    return casos;
  });

  out.invariantes = intenta(() => (typeof INVARIANTES !== "undefined" ? INVARIANTES : []).map((x) => x.codigo + "|" + x.autoridad).sort());

  return out;
})()`;

async function correr(html, etiqueta) {
  const nav = await chromium.launch();
  const pag = await nav.newPage();
  const errores = [];
  pag.on("pageerror", (e) => errores.push(String(e).slice(0, 200)));
  await pag.goto("file://" + html, { waitUntil: "load", timeout: 300000 });
  await pag.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 300000 });
  const r = await pag.evaluate(BATERIA);
  await nav.close();
  console.log(`  ${etiqueta}: ${Object.keys(r).length} familias${errores.length ? " · " + errores.length + " error(es) de página" : ""}`);
  return r;
}

console.log("Corriendo la batería en los dos builds…");
const base = await correr(HTML_BASE, "BASE  ");
const act = await correr(HTML_ACTUAL, "ACTUAL");

// ── COMPARACIÓN ───────────────────────────────────────────────────────────────────────────────
// `debeSerIgual` es el corazón de la prueba: son las familias que NINGÚN cambio de la sesión debía
// tocar. Una diferencia ahí es una regresión, no una mejora.
const DEBE_SER_IGUAL = ["lineas", "verif_con_plazo", "cat", "nota", "precio", "ruteo", "invariantes"];
const CAMBIO_ESPERADO = ["verif_sin_plazo", "catalogo", "otorg"];

const j = (x) => JSON.stringify(x);
let fallos = 0;
console.log("\n── Lo que NO debía cambiar ──────────────────────────────────────");
for (const fam of DEBE_SER_IGUAL) {
  const a = base[fam], b = act[fam];
  if (a && a.__error) { console.log(`  ⚠ ${fam.padEnd(18)} la BASE no pudo evaluarlo: ${a.__error}`); continue; }
  if (b && b.__error) { console.log(`  ✗ ${fam.padEnd(18)} el ACTUAL revienta: ${b.__error}`); fallos++; continue; }
  if (j(a) === j(b)) {
    const n = Array.isArray(a) ? a.length : 1;
    console.log(`  ✓ ${fam.padEnd(18)} IDÉNTICO (${n} caso${n === 1 ? "" : "s"})`);
  } else {
    fallos++;
    console.log(`  ✗ ${fam.padEnd(18)} DIFIERE`);
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (j(a[i]) !== j(b[i])) {
          console.log(`      caso ${i}:\n        base   ${j(a[i]).slice(0, 300)}\n        actual ${j(b[i]).slice(0, 300)}`);
          break;
        }
      }
    } else {
      console.log(`      base   ${j(a).slice(0, 400)}\n      actual ${j(b).slice(0, 400)}`);
    }
  }
}

console.log("\n── Lo que SÍ debía cambiar (se lista para poder leerlo) ─────────");
for (const fam of CAMBIO_ESPERADO) {
  const a = base[fam], b = act[fam];
  const igual = j(a) === j(b);
  console.log(`  ${igual ? "=" : "Δ"} ${fam.padEnd(18)} ${igual ? "sin cambios" : "cambió"}`);
}

const rutaBase = "/tmp/base/salida_base.json", rutaAct = "/tmp/base/salida_actual.json";
writeFileSync(rutaBase, JSON.stringify(base, null, 1));
writeFileSync(rutaAct, JSON.stringify(act, null, 1));
console.log(`\nSalidas completas en ${rutaBase} y ${rutaAct}`);
console.log(fallos ? `\n${fallos} REGRESIÓN(ES) en lo que no debía cambiar.` : "\nSin regresiones: todo lo que no debía cambiar salió idéntico.");
process.exit(fallos ? 1 : 0);
