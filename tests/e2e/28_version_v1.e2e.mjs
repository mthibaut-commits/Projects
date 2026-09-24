/* Gate e2e de la regla 72 (ADR-0013: un evento de evaluación, cinco motores, una versión con cinco secciones o
   ninguna; la primera simulación emite la v1) y de la regla 73 (el acuse del receptor viene del A1 y la fila del
   documento lo muestra), en el detalle REAL: la pestaña propia, con la sesión iniciada y el Modo Directorio.
     · e2e-72-c (CP-036): SIN simular no hay versión, y la pantalla no afirma ninguna cifra de compuerta: el panel de
       arranque ofrece las opciones y el pie (otorgamiento · verificación · línea · giros) no existe todavía.
     · e2e-72-a (CP-034): dos facturas a mano y «Simular la oferta» dejan la v1 —`v: 1`, `rev: 0`, origen «Simulación
       de la oferta»— con las CINCO secciones sobre esas dos facturas, contemporánea; el TUBO la ve sin recargar (el
       evento `storage`, regla 15-bis-ter) y la auditoría tiene la fila del evento.
     · e2e-72-b (CP-035): cerrar y reabrir el detalle no pierde la versión ni cambia el titular: la pestaña nueva lee el
       repositorio, no un recálculo distinto.
     · e2e-72-d (CP-123): el modo de tasa cambiado en Configuración › Simulación deja, al re-evaluar, una versión que
       lo dice (`pricing.modo`), la anterior conserva el suyo y el paquete no se mueve.
     · e2e-73-a (CP-010): en las filas del documento el chip del acuse («Con acuse» / «Sin acuse» / «Reclamada») coincide,
       fila por fila, con lo que el A1 trae para esas facturas, y la reclamada sigue bloqueada en su fila (el filtro no cambió).
   Selectores por texto y por `title`; nada por clases. Los casos se encadenan sobre la misma fila 0 del filtro
   «Sin línea» (con el Directorio encendido es una OP-DIR sin línea aprobada), y cada uno deja el estado que
   necesita si el anterior no llegó (simula si hace falta). El último devuelve el modo de tasa y limpia las versiones
   que el archivo dejó en el storage. */

const TIP_PLANA_DISP = "Todas las facturas en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TIP_PLANA_OFERTA = "Todas las facturas de la oferta en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TITULO_AGREGAR = "Agregar a la simulación";
const KEY_VERSIONES = "pc_repo_simulacion_version";
const SECCIONES = ["res", "verificacion", "linea", "giro", "pricing"];

const filtroRapido = async (pagina, rotulo) => {
  await pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo) }).first().click();
  await pagina.waitForTimeout(400);
};
const idDe = (det) => det.evaluate(() => (document.body.innerText.match(/\b(OP-DIR\d+)\b/) || [])[1] || null);
const versiones = (pg, id) => pg.evaluate(([id, S]) => ((typeof SIM_VERSIONS !== "undefined" && SIM_VERSIONS[id]) || []).map((v) => ({
  v: v.v, rev: v.rev, origen: v.origen, motivo: v.motivo, secciones: S.filter((k) => v[k] != null), fallidos: (v.motoresFallidos || []).length,
  modo: v.pricing ? v.pricing.modo : null, folios: v.linea && v.linea.facturas ? v.linea.facturas.map((f) => String(f.folio)).sort() : null,
  ts: v.ts instanceof Date ? v.ts.getTime() : Date.parse(v.ts) || null,
})), [id, SECCIONES]);
/* Lo que la pantalla AFIRMA del veredicto y del pie: las compuertas llevan su explicación en `title`. */
const foto = (det) => det.evaluate(() => {
  const t = document.body.innerText || "";
  const comp = (frags) => { const e = [...document.querySelectorAll("span[title]")].find((x) => frags.some((fr) => (x.getAttribute("title") || "").includes(fr))); return e ? (e.innerText || "").replace(/\s+/g, " ").trim() : null; };
  return {
    veredicto: (t.match(/Se puede cursar la oferta completa · \$[\d.]+|Se puede cursar \$[\d.]+ de \$[\d.]+|No se puede cursar nada de esta oferta/) || [])[0] || null,
    otorg: comp(["motor de otorgamiento", "Reglas aprobadas"]), verif: comp(["verificación telefónica"]), linea: comp(["línea disponible", "línea vigente"]),
    giros: document.querySelectorAll("[title^='Giro Normal:'],[title^='Giro Express:']").length,
    arranque: /Todo lo disponible/.test(t), elegidas: (t.match(/Tienes \d+ facturas? elegidas?/) || [])[0] || null,
  };
});
const simulada = (det) => det.evaluate(() => /Se puede cursar|No se puede cursar/.test(document.body.innerText || ""));
/* Dos facturas a mano por la vista plana de los disponibles; devuelve sus folios tal como la fila los muestra. */
async function agregarDos(det) {
  await det.locator(`button[title="${TIP_PLANA_DISP}"]`).first().click();
  await det.waitForTimeout(400);
  const folios = [];
  for (let i = 0; i < 2; i++) {
    const folio = await det.evaluate((T) => { const b = document.querySelector(`button[title="${T}"]:not([disabled])`); if (!b) return null; const c = [...b.parentElement.children].map((x) => (x.textContent || "").trim()); return (c.find((x) => /^#\d+/.test(x)) || "").replace(/^#/, "") || null; }, TITULO_AGREGAR);
    if (!folio) throw new Error(`no hay fila incorporable (${i + 1}ª) en Documentos disponibles`);
    folios.push(folio);
    await det.locator(`button[title="${TITULO_AGREGAR}"]:not([disabled])`).first().click();
    await det.waitForTimeout(500);
  }
  await det.waitForFunction(() => /Tienes 2 facturas elegidas/.test(document.body.innerText || ""), null, { timeout: 10000 })
    .catch(() => { throw new Error("tras agregar dos facturas la pantalla no dice «Tienes 2 facturas elegidas»"); });
  return folios.sort();
}
async function simular(det) {
  await det.locator("button", { hasText: /Simular la oferta/ }).first().click();
  await det.waitForFunction(() => /Se puede cursar|No se puede cursar/.test(document.body.innerText || "") && !/simulando/i.test(document.body.innerText || ""), null, { timeout: 60000 })
    .catch(() => { throw new Error("«Simular la oferta» no dejó el veredicto en pantalla"); });
  await det.waitForTimeout(1000);
}
/* Deja la fila 0 de «Sin línea» simulada (si no lo está) y devuelve el detalle abierto con su id. */
async function abrirSimulada(h) {
  await h.encenderDirectorio();
  await filtroRapido(h.pagina, "Sin línea");
  const det = await h.abrirDetalle(0);
  const id = await idDe(det);
  if (!id) throw new Error("no leo el id OP-DIR del detalle");
  let folios = null;
  if (!(await simulada(det))) { folios = await agregarDos(det); await simular(det); }
  return { det, id, folios };
}
const chipsAcuse = (det) => det.evaluate(() => [...document.querySelectorAll("span")]
  .filter((s) => s.children.length === 0 && /^(Con acuse|Sin acuse|Reclamada)$/.test((s.textContent || "").trim()) && /acuse|reclam/i.test(s.getAttribute("title") || ""))
  // La fila del documento es el `div` de grilla que contiene al chip; sus hijos son las celdas (#folio entre ellas).
  .map((s) => { const fila = s.closest("div"); const c = fila ? [...fila.children].map((x) => (x.textContent || "").trim()) : []; const txt = (fila && fila.innerText) || ""; return { texto: s.textContent.trim(), folio: (c.find((x) => /^#\d+/.test(x)) || "").replace(/^#/, "") || null, bloqueada: /🔒|Reclamada por el deudor/.test(txt) || !!(fila && fila.querySelector("button[disabled]")) }; }));

export const casos = [
  {
    id: "e2e-72-c",
    titulo: "SIN simular no hay versión y la pantalla no afirma ninguna compuerta: el panel de arranque ofrece las opciones y el pie no existe todavía",
    correr: async (h) => {
      let det = null;
      try {
        await h.encenderDirectorio();
        await filtroRapido(h.pagina, "Sin línea");
        det = await h.abrirDetalle(0);
        const id = await idDe(det);
        const vs = await versiones(det, id);
        const f = await foto(det);
        if (vs.length) throw new Error(`${id} sin simular ya tiene ${vs.length} versión(es): la v1 la emite el gesto de simular, nada antes`);
        if (f.veredicto) throw new Error(`sin simular el titular afirma «${f.veredicto}»`);
        if (f.otorg || f.verif || f.linea || f.giros) throw new Error(`sin simular el pie afirma compuertas: ${JSON.stringify({ otorg: f.otorg, verif: f.verif, linea: f.linea, giros: f.giros })}`);
        if (!f.arranque) throw new Error("sin simular no está el panel de arranque («Todo lo disponible»)");
        return `${id}: 0 versiones · sin titular · sin compuertas ni chips de giro · panel de arranque a la vista`;
      } finally { if (det) await det.close().catch(() => {}); }
    },
  },
  {
    id: "e2e-72-a",
    titulo: "«Simular la oferta» con dos facturas a mano deja la v1 con las cinco secciones sobre esas facturas, el tubo la ve sin recargar y la auditoría tiene el evento",
    correr: async (h) => {
      let det = null;
      try {
        await h.encenderDirectorio();
        await filtroRapido(h.pagina, "Sin línea");
        det = await h.abrirDetalle(0);
        const id = await idDe(det);
        if (await simulada(det)) throw new Error(`${id} ya está simulada: este caso necesita la fila sin simular (¿el caso anterior no limpió?)`);
        const antes = Date.now();
        const folios = await agregarDos(det);
        await simular(det);
        const vs = await versiones(det, id);
        if (vs.length !== 1) throw new Error(`tras simular hay ${vs.length} versión(es), se esperaba exactamente la v1`);
        const v1 = vs[0];
        if (v1.v !== 1 || v1.rev !== 0) throw new Error(`la primera versión es v${v1.v}/rev${v1.rev}: no es la v1`);
        if (v1.origen !== "Simulación de la oferta" || v1.motivo !== "simulacion") throw new Error(`la v1 dice origen «${v1.origen}» / motivo «${v1.motivo}»`);
        if (v1.secciones.length !== 5 || v1.fallidos) throw new Error(`la v1 trae ${v1.secciones.length} secciones (${v1.secciones.join(",")}) y ${v1.fallidos} motor(es) fallido(s): cinco o ninguna`);
        if (!v1.folios || v1.folios.join(",") !== folios.join(",")) throw new Error(`la línea de la v1 es sobre ${JSON.stringify(v1.folios)} y la oferta tiene ${JSON.stringify(folios)}`);
        if (!v1.ts || v1.ts < antes - 5000) throw new Error("la v1 no es contemporánea de la simulación");
        // El TUBO la ve sin recargar: el evento `storage` (la carrera con el postMessage está medida, regla 15-bis-ter).
        await h.pagina.waitForFunction((id) => ((typeof SIM_VERSIONS !== "undefined" && SIM_VERSIONS[id]) || []).length === 1, id, { timeout: 8000 })
          .catch(() => { throw new Error("el tubo no ve la v1 que emitió el detalle (¿el listener de `storage`?)"); });
        const aud = await det.evaluate((id) => AUDIT_LOG.filter((a) => a.empresaId === id && a.modulo === "Evaluación de la operación").map((a) => a.accion), id);
        if (!aud.includes("Simulación de la oferta")) throw new Error(`la auditoría no tiene el evento: ${JSON.stringify(aud)}`);
        const f = await foto(det);
        return `${id}: v1 (rev 0) «${v1.origen}» con ${v1.secciones.length} secciones sobre #${folios.join(", #")} · modo ${v1.modo} · el tubo la ve · auditoría «${aud[0]}» · titular «${f.veredicto}»`;
      } finally { if (det) await det.close().catch(() => {}); }
    },
  },
  {
    id: "e2e-72-b",
    titulo: "cerrar y reabrir el detalle no pierde la versión ni cambia el titular: la pestaña nueva lee el repositorio",
    correr: async (h) => {
      let det = null;
      try {
        const a = await abrirSimulada(h);
        det = a.det;
        const id = a.id;
        const vs0 = await versiones(det, id);
        const f0 = await foto(det);
        if (!vs0.length) throw new Error(`${id} simulada y sin versión`);
        await det.close();
        det = null;
        await h.pagina.waitForTimeout(500);
        det = await h.abrirDetalle(0);
        const id2 = await idDe(det);
        if (id2 !== id) throw new Error(`al reabrir la fila 0 es ${id2}, era ${id}`);
        const vs1 = await versiones(det, id);
        const f1 = await foto(det);
        if (vs1.length !== vs0.length) throw new Error(`al reabrir hay ${vs1.length} versión(es), había ${vs0.length}`);
        if (vs1[vs1.length - 1].v !== vs0[vs0.length - 1].v || JSON.stringify(vs1[vs1.length - 1].folios) !== JSON.stringify(vs0[vs0.length - 1].folios)) throw new Error("la versión vigente cambió al reabrir");
        if (f1.veredicto !== f0.veredicto) throw new Error(`el titular cambió al reabrir: «${f0.veredicto}» → «${f1.veredicto}»`);
        if (f1.linea !== f0.linea || f1.verif !== f0.verif) throw new Error(`el pie cambió al reabrir: ${JSON.stringify({ antes: [f0.linea, f0.verif], despues: [f1.linea, f1.verif] })}`);
        return `${id}: ${vs0.length} versión(es) antes y después · titular «${f1.veredicto}» igual · pie igual (${f1.linea} · verificación ${f1.verif})`;
      } finally { if (det) await det.close().catch(() => {}); }
    },
  },
  {
    id: "e2e-72-d",
    titulo: "el modo de tasa cambiado en Configuración deja, al re-evaluar, una versión que lo dice; la anterior conserva el suyo y el paquete no se mueve",
    correr: async (h) => {
      let det = null, modo0 = null;
      const selectModo = () => h.pagina.locator("select").filter({ has: h.pagina.locator('option[value="riesgo"]') }).first();
      try {
        // 1 · La versión vigente, con el modo de hoy.
        const a = await abrirSimulada(h);
        det = a.det;
        const id = a.id;
        const vsAntes = await versiones(det, id);
        const modoAntes = vsAntes[vsAntes.length - 1].modo;
        await det.close();
        det = null;
        // 2 · Configuración › Simulación y pricing: «Selección de la tasa del negocio», a otro modo.
        await h.pagina.locator('button[title="Configuración"]').first().click();
        await h.pagina.waitForTimeout(800);
        const sel = selectModo();
        if (!(await sel.count())) throw new Error("no encuentro el selector «Selección de la tasa del negocio» en Configuración");
        modo0 = await sel.inputValue();
        const nuevo = modo0 === "riesgo" ? "ultima" : "riesgo";
        await sel.selectOption(nuevo);
        await h.pagina.waitForTimeout(500);
        const enTubo = await h.pagina.evaluate(() => CFG_ACTIVA.tasaModo);
        if (enTubo !== nuevo) throw new Error(`el tubo no aplicó el modo: CFG_ACTIVA.tasaModo = ${enTubo}`);
        // 3 · Un detalle NUEVO lo lee y re-evalúa: «Re-evaluar simulación» (tab Otorgamiento) o, si no hay
        //     re-evaluables pendientes, una factura más y «Re-evaluar operación» — los dos son el mismo evento.
        await h.irA("Gestión diaria");
        await filtroRapido(h.pagina, "Sin línea");
        det = await h.abrirDetalle(0);
        const enDetalle = await det.evaluate(() => CFG_ACTIVA.tasaModo);
        if (enDetalle !== nuevo) throw new Error(`el detalle nuevo no lee el modo cambiado: ${enDetalle}`);
        await det.locator("button").filter({ hasText: /^\s*Otorgamiento\s*\d*\s*$/ }).first().click();
        await det.waitForTimeout(700);
        const icono = det.locator('button[title^="Re-evaluar la simulación"]').first();
        if ((await icono.count()) && !(await icono.isDisabled())) await icono.click();
        const btn = det.locator("button").filter({ hasText: /^\s*Re-evaluar simulación\s*$/ }).first();
        let gesto;
        if ((await icono.count()) && !(await icono.isDisabled())) gesto = "el icono de «Re-evaluar la simulación» del encabezado";
        else if ((await btn.count()) && !(await btn.isDisabled())) { await btn.click(); gesto = "«Re-evaluar simulación»"; }
        else {
          await det.locator("button").filter({ hasText: /^\s*Negocio\s*\d*\s*$/ }).first().click();
          await det.waitForTimeout(500);
          await det.locator(`button[title="${TIP_PLANA_DISP}"]`).first().click();
          await det.waitForTimeout(400);
          await det.locator(`button[title="${TITULO_AGREGAR}"]:not([disabled])`).first().click();
          await det.waitForTimeout(600);
          await det.locator("button", { hasText: /^\s*Re-evaluar operación\s*$/ }).first().click();
          gesto = "una factura más y «Re-evaluar operación»";
        }
        await det.waitForFunction(([id, n]) => ((typeof SIM_VERSIONS !== "undefined" && SIM_VERSIONS[id]) || []).length === n + 1, [id, vsAntes.length], { timeout: 15000 })
          .catch(() => { throw new Error(`${gesto} no dejó la versión ${vsAntes.length + 1}`); });
        const vs = await versiones(det, id);
        const ult = vs[vs.length - 1], prev = vs[vs.length - 2];
        if (ult.modo !== nuevo) throw new Error(`la versión nueva dice modo «${ult.modo}», se cambió a «${nuevo}»`);
        if (prev.modo !== modoAntes) throw new Error(`la versión anterior cambió de modo: «${modoAntes}» → «${prev.modo}»`);
        if (ult.secciones.length !== 5) throw new Error(`la versión nueva trae ${ult.secciones.length} secciones`);
        if (gesto === "«Re-evaluar simulación»" && JSON.stringify(ult.folios) !== JSON.stringify(prev.folios)) throw new Error("el paquete cambió entre las dos versiones sin que nadie lo tocara");
        return `${id}: modo ${modo0} → ${nuevo} en Configuración · ${gesto} → v${ult.v} con modo «${ult.modo}» y v${prev.v} sigue en «${prev.modo}» · ${ult.folios ? ult.folios.length : 0} facturas`;
      } finally {
        if (det) await det.close().catch(() => {});
        if (modo0) {
          await h.pagina.locator('button[title="Configuración"]').first().click().catch(() => {});
          await h.pagina.waitForTimeout(600);
          const sel = selectModo();
          if (await sel.count()) await sel.selectOption(modo0).catch(() => {});
          await h.pagina.waitForTimeout(300);
          await h.irA("Gestión diaria").catch(() => {});
        }
      }
    },
  },
  {
    id: "e2e-73-a",
    titulo: "el chip del acuse de cada fila del documento coincide con lo que el A1 trae para esa factura, y la reclamada sigue bloqueada en su fila",
    correr: async (h) => {
      let det = null;
      try {
        const a = await abrirSimulada(h);
        det = a.det;
        const id = a.id;
        // La oferta en su vista plana: un chip por factura, igual al dato del A1 de ESA factura.
        await det.locator(`button[title="${TIP_PLANA_OFERTA}"]`).first().click();
        await det.waitForTimeout(600);
        const chipsOferta = await chipsAcuse(det);
        const vs = await versiones(det, id);
        const folios = vs[vs.length - 1].folios || [];
        const esperado = await det.evaluate((folios) => { const m = {}; for (const a of libroPorEmisor().values()) for (const f of a) if (folios.includes(String(f.folio))) m[String(f.folio)] = f.acuse; return m; }, folios);
        const rot = { aceptada: "Con acuse", sin_acuse: "Sin acuse", reclamada: "Reclamada" };
        const enOferta = chipsOferta.filter((c) => c.folio && folios.includes(c.folio));
        if (enOferta.length !== folios.length) throw new Error(`la oferta tiene ${folios.length} factura(s) y ${enOferta.length} chip(s) de acuse: ${JSON.stringify(chipsOferta).slice(0, 200)}`);
        const mal = enOferta.filter((c) => rot[esperado[c.folio]] !== c.texto);
        if (mal.length) throw new Error(`chip distinto del A1: ${JSON.stringify(mal)} (A1: ${JSON.stringify(esperado)})`);
        // Los disponibles en su vista plana: cada chip con su título, y la reclamada con el candado.
        await det.locator(`button[title="${TIP_PLANA_DISP}"]`).first().click();
        await det.waitForTimeout(600);
        const chipsDisp = await chipsAcuse(det);
        // La reclamada no es agregable: la fila la bloquea («Reclamada por el deudor», el candado de «otras facturas» o el
        // botón «Agregar» apagado), que es lo que la regla 73 conserva del filtro.
        const reclamadas = chipsDisp.filter((c) => c.texto === "Reclamada");
        const sinCandado = reclamadas.filter((c) => !c.bloqueada);
        if (sinCandado.length) throw new Error(`reclamada(s) sin bloqueo en la fila: ${JSON.stringify(sinCandado)}`);
        const cnt = (xs) => xs.reduce((m, c) => { m[c.texto] = (m[c.texto] || 0) + 1; return m; }, {});
        return `${id}: oferta ${folios.length} chip(s) = A1 (${JSON.stringify(cnt(enOferta))}) · disponibles ${chipsDisp.length} chip(s) ${JSON.stringify(cnt(chipsDisp))}, reclamadas bloqueadas ${reclamadas.length}`;
      } finally {
        if (det) await det.close().catch(() => {});
        // Lo que el archivo dejó en el storage se limpia: las versiones de la OP-DIR no son de nadie más.
        await h.pagina.evaluate((k) => { try { localStorage.removeItem(k); } catch (_) {} try { repoSimVersions.recargar(); SIM_VERSIONS = repoSimVersions.all(); } catch (_) {} }, KEY_VERSIONES).catch(() => {});
        await h.apagarDirectorio().catch(() => {});
        await filtroRapido(h.pagina, "Con línea").catch(() => {});
      }
    },
  },
];
