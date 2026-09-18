/* Gate e2e de la regla 12-bis: lo que saca una oportunidad de Prospección es la SIMULACIÓN, la promoción
   viaja DENTRO del patch `nex-simulado` (el tubo se entera por ese mensaje) y el invariante DUAL devuelve
   a Prospección una «oferta» sin simular — salvo que YA tenga oferta (N° de negocio o la oferta enviada por
   WhatsApp). Todo eso vive en closures y useEffects de `PipelineComercial`, así que la suite no lo alcanza:
   se ejercita el tubo real en Modo Directorio. Las sondas C y D inyectan por el MISMO canal (`postMessage
   nex-simulado`) un estado que contradice la regla y comprueban que el efecto lo corrige; un marcador en
   `facturasOp` (que el tubo re-indexa en `FOLIOS_EN_OPERACION`) prueba que el patch se APLICÓ y no que se
   ignoró. Cada caso es AUTOCONTENIDO: enciende el Directorio (las cinco operaciones se regeneran de cero en
   cada encendido, `construirDirectorio`), pone el filtro rápido en «Todos» (con «Con línea» sólo se ven 3 de
   las 5), lee sus ids de la pantalla y en su `finally` cierra el detalle, apaga el Directorio y devuelve el
   filtro a «Con línea», que es la línea base de esta capa (regla 34: la app abre en «Todos»). */

const ETAPAS = /Sin gestión|Negociación|Oferta publicada|Prospección|Oferta y Negociación|Aceptada|Cesión|Otorgamiento|Perdida/;
const filas = (pagina) => pagina.evaluate((re) => [...document.querySelectorAll("tr.pl-row")].map((tr) => {
  const t = tr.innerText || "";
  return { id: (t.match(/OP-DIR\d+/) || [])[0] || null, etapa: (t.match(new RegExp(re)) || [])[0] || null, sinSimular: /Sin simular/.test(t) };
}), ETAPAS.source);
const fila = async (pagina, id) => (await filas(pagina)).find((f) => f.id === id) || null;
const esperarEtapa = (pagina, id, etapa, timeout = 30000) =>
  pagina.waitForFunction(([id, etapa, re]) => [...document.querySelectorAll("tr.pl-row")].some((tr) => {
    const t = tr.innerText || ""; return t.includes(id) && ((t.match(new RegExp(re)) || [])[0] === etapa);
  }), [id, etapa, ETAPAS.source], { timeout });
const postPatch = (pagina, dealId, patch) => pagina.evaluate(({ dealId, patch }) => window.postMessage({ type: "nex-simulado", dealId, patch }, "*"), { dealId, patch });
const filtroRapido = async (pagina, rotulo) => {
  await pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo) }).first().click();
  await pagina.waitForTimeout(400);
};
/* Directorio encendido, filtro «Todos» y los cinco ids leídos del tubo. No depende de ningún caso anterior. */
async function prepararTubo(h) {
  await h.encenderDirectorio();
  await filtroRapido(h.pagina, "Todos");
  const ids = (await filas(h.pagina)).map((f) => f.id).filter(Boolean);
  if (ids.length < 5) throw new Error(`el Directorio dejó ${ids.length} fila(s) OP-DIR en el tubo con el filtro «Todos», se esperaban 5`);
  return ids;
}
/* Deja el tubo como lo encontró el runner: sin detalle abierto, Directorio apagado (retira las cinco,
   parchadas o no: el tubo vuelve como estaba) y el filtro rápido en «Con línea». */
async function restaurarTubo(h, det) {
  if (det) await det.close().catch(() => {});
  await h.apagarDirectorio();
  await filtroRapido(h.pagina, "Con línea").catch(() => {});
}
async function abrirPorId(h, id) {
  const tr = h.pagina.locator("tr.pl-row", { hasText: id }).first();
  if (!(await tr.count())) throw new Error(`no hay fila ${id} en el tubo`);
  const [det] = await Promise.all([h.ctx.waitForEvent("page", { timeout: 60000 }), tr.click()]);
  await det.waitForLoadState("load", { timeout: 300000 });
  await det.waitForFunction(() => /DETALLE DE OPORTUNIDAD/i.test(document.body.innerText || ""), null, { timeout: 300000 });
  await det.waitForTimeout(2000);
  det.on("pageerror", (e) => (det._erroresE2E = det._erroresE2E || []).push(String(e).slice(0, 300)));
  return det;
}
/* La etapa que rotula la cabecera del detalle: el `<span>` «· OP-DIRn · Etapa» que sigue al `<h1>` del cliente. */
const etapaDetalle = (det, id) => det.evaluate((id) => {
  const re = new RegExp("· " + id + " · ([^\\n·]+)");
  for (const h of document.querySelectorAll("h1")) { const m = ((h.nextElementSibling || {}).textContent || "").match(re); if (m) return m[1].trim(); }
  return null;
}, id);
/* Muestrea esa cabecera cada 40 ms durante `ms` y devuelve las etapas DISTINTAS que mostró: un parpadeo a
   «Oferta y Negociación» que el dual corrigiera después también cuenta como promoción. */
const etapasVistas = (det, id, ms) => det.evaluate(({ id, ms }) => new Promise((res) => {
  const re = new RegExp("· " + id + " · ([^\\n·]+)"); const vistas = new Set(); let n = 0; const t0 = Date.now();
  const leer = () => { n++; for (const h of document.querySelectorAll("h1")) { const m = ((h.nextElementSibling || {}).textContent || "").match(re); if (m) vistas.add(m[1].trim()); } };
  leer();
  const iv = setInterval(() => { leer(); if (Date.now() - t0 >= ms) { clearInterval(iv); res({ vistas: [...vistas], n }); } }, 40);
}), { id, ms });
const elegidas = (det) => det.evaluate(() => +(((document.body.innerText || "").match(/Tienes (\d+) facturas? elegidas?/) || [])[1] || 0));
/* Simula desde el panel de arranque del detalle («Todo lo disponible») y espera las condiciones comerciales. */
async function simularEnDetalle(det) {
  const chip = det.locator("button").filter({ hasText: /Todo lo disponible/ }).first();
  if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque");
  await chip.click();
  await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
  await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
  await det.waitForTimeout(2500);
}

export const casos = [
  { id: "e2e-12-bis-a", titulo: "simular en el detalle saca la oportunidad de Prospección y la promoción llega al tubo dentro del patch nex-simulado",
    correr: async (h) => {
      let det = null;
      try {
        const ids = await prepararTubo(h); const id = ids[0];
        const antes = await fila(h.pagina, id);
        if (!antes || antes.etapa !== "Sin gestión" || !antes.sinSimular) throw new Error(`estado de entrada raro: ${JSON.stringify(antes)}`);
        det = await abrirPorId(h, id);
        const e0 = await etapaDetalle(det, id);
        await simularEnDetalle(det);
        const e1 = await etapaDetalle(det, id);
        // El tubo se entera POR EL PATCH: se espera con el detalle todavía abierto (el aviso sale de su efecto post-commit).
        await esperarEtapa(h.pagina, id, "Negociación").catch(() => { throw new Error("el tubo no pasó la fila a «Negociación» tras simular (¿la etapa viaja fuera del patch?)"); });
        const despues = await fila(h.pagina, id);
        if (despues.sinSimular) throw new Error("la fila sigue diciendo «Sin simular» después de simular");
        if (e0 !== "Prospección" || e1 !== "Oferta y Negociación") throw new Error(`cabecera del detalle: antes «${e0}» · después «${e1}»`);
        return `${id}: tubo «${antes.etapa}» → «${despues.etapa}» · detalle «${e0}» → «${e1}» · sinSimular ${antes.sinSimular} → ${despues.sinSimular}`;
      } finally { await restaurarTubo(h, det); }
    } },
  { id: "e2e-12-bis-b", titulo: "editar el paquete sin simular NO promueve: agregar dos facturas a mano y retirar una deja la oportunidad en Prospección, sin parpadeo",
    correr: async (h) => {
      let det = null;
      try {
        const ids = await prepararTubo(h); const id = ids[1];
        det = await abrirPorId(h, id);
        const e0 = await etapaDetalle(det, id);
        if (e0 !== "Prospección") throw new Error(`estado de entrada raro: el detalle de ${id} dice «${e0}»`);
        const vistas = new Set(); let muestras = 0;
        const muestrear = async () => { const r = await etapasVistas(det, id, 1500); r.vistas.forEach((e) => vistas.add(e)); muestras += r.n; };
        // Los acordeones por deudor arrancan cerrados: la vista plana «Por factura» de Documentos DISPONIBLES
        // (su título dice «Todas las facturas en una sola lista»; el de la oferta, «…de la oferta…») deja los
        // botones «Agregar» a la vista. Se agregan DOS porque retirar exige que quede al menos una.
        const agregarUna = async () => {
          await det.locator('button[title^="Todas las facturas en una sola lista"]').first().click(); await det.waitForTimeout(600);
          const btn = det.locator('button[title="Agregar a la simulación"]:not([disabled])').first();
          if (!(await btn.count())) throw new Error("no hay ningún botón «Agregar» habilitado en Documentos disponibles");
          await btn.click(); await muestrear();
        };
        await agregarUna(); const n1 = await elegidas(det);
        await agregarUna(); const n2 = await elegidas(det);
        // RETIRAR una: vista plana de «Documentos en la oferta» → papelera → ConfirmDialog «Retirar factura».
        await det.locator('button[title^="Todas las facturas de la oferta en una sola lista"]').first().click(); await det.waitForTimeout(600);
        const papelera = det.locator('button[title="Retirar esta factura de la oferta"]').first();
        if (!(await papelera.count())) throw new Error("no aparece «Retirar esta factura de la oferta» en Documentos en la oferta");
        await papelera.click(); await det.waitForTimeout(400);
        await det.getByRole("button", { name: "Retirar factura", exact: true }).click(); await muestrear();
        const n3 = await elegidas(det);
        const e1 = await etapaDetalle(det, id);
        await det.close(); det = null; await h.pagina.waitForTimeout(1500);
        const f = await fila(h.pagina, id);
        if (n1 !== 1 || n2 !== 2 || n3 !== 1) throw new Error(`la edición no se aplicó como se esperaba: elegidas ${n1} → ${n2} → ${n3} (se esperaba 1 → 2 → 1)`);
        const ajenas = [...vistas].filter((e) => e !== "Prospección");
        if (ajenas.length || e1 !== "Prospección") throw new Error(`el detalle salió de Prospección con sólo editar el paquete: mostró «${[...vistas].join("», «")}» y terminó en «${e1}»`);
        if (!f || f.etapa !== "Sin gestión" || !f.sinSimular) throw new Error(`el tubo movió la fila: ${JSON.stringify(f)}`);
        return `${id}: elegidas a mano ${n1} → ${n2} → retiro → ${n3} · cabecera siempre «Prospección» en ${muestras} muestras · tubo «${f.etapa}» y Sin simular ${f.sinSimular}`;
      } finally { await restaurarTubo(h, det); }
    } },
  { id: "e2e-12-bis-c", titulo: "el canal aplica el patch y la excepción del dual manda: «oferta» sin simular pero CON N° de negocio se queda en Negociación",
    correr: async (h) => {
      try {
        const ids = await prepararTubo(h); const id = ids[2];
        await postPatch(h.pagina, id, { stage: "oferta", simulado: false, negocioNum: "E2E-NEG-12BIS" });
        await esperarEtapa(h.pagina, id, "Negociación", 10000).catch(() => { throw new Error("el tubo no aplicó el patch por nex-simulado (o el dual empujó a Prospección a una oferta con N° de negocio)"); });
        await h.pagina.waitForTimeout(2000);
        const f = await fila(h.pagina, id);
        if (f.etapa !== "Negociación") throw new Error(`a los 2 s la fila dice «${f.etapa}»: los dos invariantes se empujan`);
        return `${id}: patch {stage:oferta, simulado:false, negocioNum} → «${f.etapa}» y estable 2 s`;
      } finally { await restaurarTubo(h, null); }
    } },
  { id: "e2e-12-bis-d", titulo: "invariante dual: una «oferta» SIN simular y sin oferta previa vuelve a Prospección (el patch se aplicó: el marcador quedó indexado)",
    correr: async (h) => {
      try {
        const ids = await prepararTubo(h); const id = ids[3];
        await postPatch(h.pagina, id, { stage: "oferta", simulado: false, facturasOp: [{ id: "marca-e2e", folio: "E2E999", monto: 1000, deudor: "Sonda E2E" }] });
        await h.pagina.waitForTimeout(2500);
        const marca = await h.pagina.evaluate(() => Object.values(FOLIOS_EN_OPERACION).some((m) => m && m["E2E999"]));
        const f = await fila(h.pagina, id);
        if (!marca) throw new Error("el patch NO se aplicó (FOLIOS_EN_OPERACION no indexa el folio marcador): la sonda no probó nada");
        if (f.etapa !== "Sin gestión") throw new Error(`el dual no corrigió: la fila dice «${f.etapa}» con simulado:false y sin oferta`);
        // Y la excepción por WhatsApp del ORIGINAL: Prospección con la oferta en el hilo → Negociación, y el dual no la devuelve.
        const id2 = ids[4];
        await postPatch(h.pagina, id2, { stage: "prospeccion", simulado: false, waSesion: [{ from: "ejecutivo", text: "Oferta de factoring para Sonda E2E:\n• Cantidad de documentos: 1", time: "—" }] });
        await esperarEtapa(h.pagina, id2, "Negociación", 10000).catch(() => { throw new Error("el invariante original no promovió una Prospección con la oferta enviada por WhatsApp"); });
        await h.pagina.waitForTimeout(2000);
        const g = await fila(h.pagina, id2);
        if (g.etapa !== "Negociación") throw new Error(`a los 2 s ${id2} dice «${g.etapa}»: el dual empujó de vuelta a una oferta ya enviada`);
        return `${id}: oferta sin simular → «${f.etapa}» (marcador indexado ${marca}) · ${id2}: prospección + oferta WhatsApp → «${g.etapa}» estable`;
      } finally { await restaurarTubo(h, null); }
    } },
  { id: "e2e-12-bis-e", titulo: "eliminar la simulación devuelve la oportunidad a Prospección en el detalle y en el tubo",
    correr: async (h) => {
      let det = null;
      try {
        const ids = await prepararTubo(h); const id = ids[0];
        det = await abrirPorId(h, id);
        // Primero hay que TENER una simulación: se simula acá mismo y se comprueba que las dos pestañas la vieron.
        await simularEnDetalle(det);
        const e0 = await etapaDetalle(det, id);
        await esperarEtapa(h.pagina, id, "Negociación").catch(() => { throw new Error("no hay qué eliminar: el tubo no pasó la fila a «Negociación» tras simular"); });
        const antes = await fila(h.pagina, id);
        if (e0 !== "Oferta y Negociación" || antes.sinSimular) throw new Error(`no hay qué eliminar: detalle «${e0}», fila ${JSON.stringify(antes)}`);
        await det.locator("button", { hasText: /^\s*Opciones\s*$/ }).first().click(); await det.waitForTimeout(400);
        const item = det.locator("button", { hasText: /Eliminar la simulación y vaciar la oferta/ }).first();
        if (!(await item.count())) throw new Error("no aparece «Eliminar la simulación y vaciar la oferta» en Opciones");
        if (await item.isDisabled()) throw new Error("el ítem está deshabilitado: " + (await item.getAttribute("title")));
        await item.click(); await det.waitForTimeout(400);
        await det.getByRole("button", { name: "Eliminar la simulación", exact: true }).click();
        await det.waitForTimeout(1500);
        const e1 = await etapaDetalle(det, id);
        await esperarEtapa(h.pagina, id, "Sin gestión").catch(() => { throw new Error("el tubo no devolvió la fila a «Sin gestión» tras eliminar la simulación"); });
        const f = await fila(h.pagina, id);
        if (e1 !== "Prospección") throw new Error(`la cabecera del detalle quedó en «${e1}» tras eliminar la simulación`);
        if (!f.sinSimular) throw new Error("la fila no volvió a «Sin simular»");
        return `${id}: simulada (detalle «${e0}», tubo «${antes.etapa}») → eliminar → detalle «${e1}» · tubo «${f.etapa}» · Sin simular ${f.sinSimular}`;
      } finally { await restaurarTubo(h, det); }
    } },
];
