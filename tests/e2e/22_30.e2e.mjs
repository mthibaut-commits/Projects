/* Gate e2e de la regla 30: el menú «Acciones» del detalle NO cierra la oferta ni avanza de etapa, sí ofrece
   «Eliminar la simulación y vaciar la oferta», y sólo aparece en las pestañas donde el ejecutivo no arma la
   oferta (ni Negocio › Detalle, ni Otorgamiento, ni Verificación). Se mide en la pantalla real, con la sesión
   adecuada: el Ejecutivo Comercial no ve Bitácora/Cobranza/Mensajería, así que se cambia la sesión con el
   selector (sólo demo) a un usuario que sí las vea (ADMIN) y se abre el menú en cada una.
   DIRECCIÓN NEGATIVA (lo que el menú NO ofrece): en Bitácora, Cobranza y Mensajería el menú queda EXACTAMENTE en
     «Guardar borrador · Rechazar… · Marcar prioridad de curse · Eliminar la simulación y vaciar la oferta», con una
     sola sección («Acciones»), sin «Cerrar oferta y publicar», sin «Enviar a Comité», sin «Avanzar a» y sin ningún
     nombre de etapa como destino — y se vuelve a medir DESPUÉS de simular la oferta, que es cuando el botón
     principal sí ofrece cerrar y avanzar: la diferencia está en el MENÚ, no en el estado de la operación.
     Y el reset tiene su negativa: con la oferta PUBLICADA (detalle abierto por el mismo ticket opaco de la app,
     `emitirTicketDetalle`, con `ofertaCerrada`+`ofertaComunicada` y sesión ADMIN en el payload) el ítem sigue en el
     menú, deshabilitado, con el motivo ESCRITO debajo, y un clic forzado no abre el ConfirmDialog.
   DIRECCIÓN POSITIVA (lo que sí existe): el botón principal de Negocio › Detalle —único camino al cierre— abre
     «Acción del botón» con «Cerrar oferta y publicar» / «Enviar a Comité y Publicar» y la sección «Avanzar a» con
     los destinos que el catálogo declara, CALCULADOS en la página del tubo con la misma regla que `panelAcciones`
     (STAGES/STAGE_ORDER desde la etapa que trajo el patch de la simulación, y «giro» sólo si
     `aprobacionFormalCliente` y `evidenciaContratoOk` lo permiten sobre la operación real). El menú «Acciones» es
     un menú VIVO (Rechazar… abre el diálogo de motivo, que se cancela) y su ítem «Eliminar la simulación…» de
     verdad vacía la oferta: se confirma desde Bitácora y la cabecera vuelve a la etapa de entrada, el tubo recibe
     el patch `simulado:false` por `nex-simulado` y la fila vuelve a «Sin simular». Ése es además el desmontaje del
     caso: nada queda simulado para los casos que corran después, y el Directorio se apaga en el `finally`.
   DÓNDE: el botón «Acciones» no existe en Negocio › Detalle ni en Otorgamiento (medido con la sesión inicial, que
     lo rotula limpio, y con ADMIN, donde lleva el badge de pendientes pegado al rótulo) ni en Verificación (cuando
     la operación lo muestra), y sí en las otras tres.
   Selectores por rol, texto o `title`; el panel del menú se toma como el hermano siguiente del botón que lo abre
   (`{accMenu && panelAcciones(…)}` va inmediatamente después del botón), y las cabeceras de sección por su
   `text-transform` calculado, no por clase. Es componible con el runner: tolera el Directorio ya encendido
   («Directorio · N») y lo apaga al salir. */

const SEL_SESION = 'select[title="Sesión de usuario (sólo demo)"]';
const ITEM_RESET = "Eliminar la simulación y vaciar la oferta";
const ESPERADOS = ["Guardar borrador", "Rechazar…", /^(Marcar|Quitar) prioridad de curse$/, ITEM_RESET];
const PROHIBIDO = /Cerrar oferta|Enviar a Comité|Avanzar a|Girar|Avanzar\b/;
const TITULO_CONFIRM_RESET = "¿Eliminar la simulación y partir de cero?";

/* Encendido, el toggle dice «Directorio · 5» (ToggleDirectorio): un regex que sólo acepta «Directorio» no lo ve. */
const apagarDirectorio = async (h) => { await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).first().click().catch(() => {}); await h.pagina.waitForTimeout(500); };
const asegurarDirectorio = async (h) => {
  if (await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).count()) { await h.pagina.waitForTimeout(300); return; }
  await h.encenderDirectorio();
};

const btnAcciones = (pg) => pg.getByRole("button", { name: /^\s*Acciones\s*$/ });
/* Un tab del detalle por su rótulo; «Otorgamiento» y «Verificación» pueden llevar el badge de pendientes pegado. */
const tabBtn = (pg, rotulo) => pg.getByRole("button", { name: new RegExp("^\\s*" + rotulo + "(\\s*\\d+)?\\s*$") }).first();
const etapaCabecera = (pg) => pg.evaluate(() => ((document.body.innerText || "").match(/OP-DIR\d+\s*·\s*([^\n·]+)/) || [])[1]?.trim() || null);
/* Los tabs visibles, con el badge (dígitos) retirado del rótulo. */
const tabsVisibles = (pg) => pg.evaluate(() => [...document.querySelectorAll("button")].map((b) => (b.innerText || "").replace(/\s*\d+\s*$/, "").trim())
  .filter((t) => ["Negocio", "Bitácora", "Cobranza", "Mensajería", "Otorgamiento", "Verificación"].includes(t)));

/* Lee el panel que cuelga de un botón (el hermano siguiente): ítems (botones), cabeceras de sección, texto, C.red. */
const leerPanelDe = (pg, esBoton) => pg.evaluate((esBotonSrc) => {
  const esBoton = new Function("x", "return (" + esBotonSrc + ")(x)");
  const btn = [...document.querySelectorAll("button")].find(esBoton);
  const panel = btn ? btn.nextElementSibling : null;
  if (!panel || panel.tagName === "BUTTON") return null;
  const items = [...panel.querySelectorAll("button")].map((x) => ({ t: (x.innerText || "").replace(/\s+/g, " ").trim(), dis: x.disabled, color: getComputedStyle(x).color, title: x.getAttribute("title") || "" }));
  // cabeceras de sección: texto suelto en mayúsculas por CSS (textContent: innerText devuelve ya el uppercase)
  const secciones = [...panel.querySelectorAll("div")].filter((d) => !d.closest("button") && d.children.length === 0 && (d.textContent || "").trim() && getComputedStyle(d).textTransform === "uppercase").map((d) => (d.textContent || "").trim());
  const h = String(C.red).replace("#", "");
  const rojo = h.length === 6 ? `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})` : String(C.red);
  return { items, secciones, rojo, texto: (panel.innerText || "").replace(/\s+/g, " ").trim() };
}, esBoton.toString());

/* Abre el menú «Acciones» del encabezado y devuelve su contenido. */
async function leerMenuAcciones(pg, donde) {
  const b = btnAcciones(pg);
  const n = await b.count();
  if (n !== 1) throw new Error(`${donde}: el botón «Acciones» aparece ${n} veces (se esperaba 1)`);
  await b.click(); await pg.waitForTimeout(350);
  const m = await leerPanelDe(pg, (x) => /^\s*Acciones\s*$/.test(x.innerText || ""));
  if (!m) throw new Error(`${donde}: el clic en «Acciones» no abrió ningún panel`);
  return m;
}
/* Cierra el menú abierto sin ejecutar nada (segundo clic sobre el botón). */
const cerrarMenu = async (pg) => { const b = btnAcciones(pg); if (await b.count()) { await b.click(); await pg.waitForTimeout(200); } };
/* Un ítem del menú «Acciones» abierto, por su texto (el panel es hermano del botón: mismo padre). */
const itemAcciones = (pg, re) => btnAcciones(pg).locator("..").getByRole("button", { name: re }).first();

/* La dirección negativa completa sobre un tab: lista EXACTA, una sección, nada de cerrar/avanzar, reset rojo. */
async function comprobarMenu(pg, donde, { resetHabilitado = true } = {}) {
  const m = await leerMenuAcciones(pg, donde);
  const textos = m.items.map((i) => i.t);
  if (textos.length !== ESPERADOS.length || !ESPERADOS.every((e, i) => (e instanceof RegExp ? e.test(textos[i]) : textos[i] === e)))
    throw new Error(`${donde}: el menú ofrece [${textos.join(" · ")}] y tiene que ser exactamente [Guardar borrador · Rechazar… · Marcar prioridad de curse · ${ITEM_RESET}]`);
  if (m.secciones.length !== 1 || m.secciones[0] !== "Acciones") throw new Error(`${donde}: secciones del menú [${m.secciones.join(" · ")}]; tiene que haber UNA («Acciones»)`);
  if (PROHIBIDO.test(m.texto)) throw new Error(`${donde}: el menú menciona cerrar/avanzar: «${m.texto}»`);
  const reset = m.items[3];
  if (reset.color !== m.rojo) throw new Error(`${donde}: «${ITEM_RESET}» no va en C.red (${m.rojo}): ${reset.color}`);
  if (resetHabilitado && reset.dis) throw new Error(`${donde}: «${ITEM_RESET}» está deshabilitado sobre una oferta que sigue siendo del ejecutivo (${reset.title})`);
  if (!resetHabilitado && !reset.dis) throw new Error(`${donde}: «${ITEM_RESET}» está HABILITADO sobre una oferta publicada`);
  return m;
}

/* Abre un detalle a partir de un deal CRAFTEADO en la página del tubo, por el mismo ticket opaco de la app. */
async function abrirConTicket(h, extra, usuario) {
  const uuid = await h.pagina.evaluate(({ extra, usuario }) => {
    const t = Object.values(TICKETS_EMITIDOS).find((x) => x.tipo === "deal" && x.payload && x.payload.deal);
    if (!t) return null;
    const sims = (window.__nexPatches || []).filter((m) => m.dealId === t.payload.deal.id);
    const deal = { ...t.payload.deal, ...(sims.length ? sims[sims.length - 1].patch : {}), ...extra };
    return emitirTicketDetalle("deal", deal.id, usuario, { deal, usuario, tab: null, ts: Date.now() });
  }, { extra, usuario });
  if (!uuid) throw new Error("no encuentro el ticket del detalle en TICKETS_EMITIDOS (¿se abrió el detalle desde el tubo?)");
  const pg = await h.ctx.newPage();
  pg.on("pageerror", (e) => (pg._erroresE2E = pg._erroresE2E || []).push(String(e).slice(0, 300)));
  await pg.goto(h.pagina.url().replace(/\?.*$/, "") + "?t=" + encodeURIComponent(uuid), { waitUntil: "load", timeout: 300000 });
  await pg.waitForFunction(() => /DETALLE DE OPORTUNIDAD/i.test(document.body.innerText || ""), null, { timeout: 300000 });
  await pg.waitForTimeout(800);
  return pg;
}

/* Otorgamiento (y Verificación si la operación lo muestra): sin botón «Acciones». Devuelve lo medido. */
async function sinAccionesEn(pg, tabs, quien) {
  const out = [];
  for (const t of ["Otorgamiento", "Verificación"]) {
    if (!tabs.includes(t)) { if (t === "Otorgamiento") throw new Error(`con sesión ${quien} no aparece el tab «Otorgamiento» (tabs: ${tabs.join(", ")})`); out.push(`${t} ausente`); continue; }
    const b = tabBtn(pg, t);
    if (!(await b.count())) throw new Error(`con sesión ${quien} no encuentro el botón del tab «${t}» por su rótulo`);
    const rotulo = (await b.innerText()).replace(/\s+/g, " ").trim();
    await b.click(); await pg.waitForTimeout(600);
    const n = await btnAcciones(pg).count();
    if (n) throw new Error(`en el tab «${t}» (sesión ${quien}) aparece el botón «Acciones» (${n}) y no debe`);
    out.push(`${t} («${rotulo}»): 0`);
  }
  return `${quien}: ${out.join(", ")}`;
}

export const casos = [
  { id: "e2e-30", titulo: "el menú «Acciones» del detalle (Bitácora/Cobranza/Mensajería, sesión que las ve) queda en Guardar borrador · Rechazar… · Prioridad · Eliminar la simulación, sin «Cerrar oferta» ni «Avanzar a», antes y después de simular; no aparece en Negocio › Detalle ni en Otorgamiento (CR y ADMIN); el principal sí ofrece cerrar y avanzar; el reset se deshabilita con motivo si la oferta está publicada y, habilitado, de verdad vacía la oferta",
    correr: async (h) => {
      const det0 = []; let det = null, usuario0 = null, id = null; const extras = [];
      try {
        await asegurarDirectorio(h);
        // El tubo captura los patches de `nex-simulado`: con ellos se calcula la etapa esperada y se comprueba el reset.
        await h.pagina.evaluate(() => { window.__nexPatches = []; window.addEventListener("message", (e) => { const m = e.data; if (m && m.type === "nex-simulado" && m.patch) window.__nexPatches.push(m); }); });
        det = await h.abrirDetalle(0);
        const foto = await h.pagina.evaluate(() => {
          const t = Object.values(TICKETS_EMITIDOS).find((x) => x.tipo === "deal" && x.payload && x.payload.deal); if (!t) return null;
          return { id: t.payload.deal.id, stage: t.payload.deal.stage, simulado: !!t.payload.deal.simulado, nombreEtapa: (stageById(t.payload.deal.stage) || {}).name || null };
        });
        if (!foto) throw new Error("no hay ticket de detalle en TICKETS_EMITIDOS");
        id = foto.id;
        if (foto.simulado) throw new Error(`la fila 0 del Directorio ya viene simulada (${id}, ${foto.stage}): un caso anterior contaminó el tubo`);
        // ── Sesión inicial (Ejecutivo Comercial): qué tabs ve, sin «Acciones» en Negocio › Detalle ni en Otorgamiento (rótulo limpio).
        const sel = det.locator(SEL_SESION);
        if (!(await sel.count())) throw new Error("no encuentro el selector de sesión del detalle (¿modoDemo apagado?)");
        usuario0 = await sel.inputValue();
        const tabs0 = await tabsVisibles(det);
        const nAcc0 = await btnAcciones(det).count();
        if (nAcc0 !== 0) throw new Error(`Negocio › Detalle (sesión ${usuario0}): el botón «Acciones» aparece ${nAcc0} vez/veces y no debe`);
        const etapa0 = await etapaCabecera(det);
        if (etapa0 !== foto.nombreEtapa) throw new Error(`la cabecera dice «${etapa0}» y el catálogo rotula la etapa «${foto.stage}» de la operación como «${foto.nombreEtapa}»`);
        const sinAcc0 = await sinAccionesEn(det, tabs0, usuario0);
        await tabBtn(det, "Negocio").click(); await det.waitForTimeout(400);
        // ── Cambiar la sesión a ADMIN, que ve Bitácora, Cobranza y Mensajería.
        await sel.selectOption("ADMIN"); await det.waitForTimeout(600);
        const tabs1 = await tabsVisibles(det);
        for (const t of ["Bitácora", "Cobranza", "Mensajería"]) if (!tabs1.includes(t)) throw new Error(`con sesión ADMIN no aparece el tab «${t}» (tabs: ${tabs1.join(", ")})`);
        // ── NEGATIVA · antes de simular, en los tres tabs.
        for (const t of ["Bitácora", "Cobranza", "Mensajería"]) {
          await tabBtn(det, t).click(); await det.waitForTimeout(500);
          const m = await comprobarMenu(det, t); await cerrarMenu(det);
          det0.push(`${t}: 4 ítems, 1 sección, reset ${m.rojo}+habilitado`);
        }
        // ── El menú es VIVO: «Rechazar…» abre el diálogo de motivo (se cancela con clic fuera).
        await leerMenuAcciones(det, "Mensajería (vivo)");
        await itemAcciones(det, /^Rechazar…$/).click(); await det.waitForTimeout(400);
        if (!(await det.getByText("¿Por qué se pierde esta operación?").count())) throw new Error("«Rechazar…» del menú «Acciones» no abrió el diálogo de motivo: el menú leído no es el vivo");
        await det.mouse.click(5, 5); await det.waitForTimeout(400);
        if (await det.getByText("¿Por qué se pierde esta operación?").count()) throw new Error("no pude cancelar el diálogo de rechazo");
        // ── Otorgamiento con ADMIN (rótulo con badge) / Verificación si está: sin botón «Acciones».
        const sinAcc1 = await sinAccionesEn(det, tabs1, "ADMIN");
        // ── POSITIVA · Negocio › Detalle: simular «Todo lo disponible»; el botón principal sí ofrece cerrar y «Avanzar a».
        await tabBtn(det, "Negocio").click(); await det.waitForTimeout(500);
        const chip = det.locator("button").filter({ hasText: /Todo lo disponible|Todas las Prime/ }).first();
        if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque");
        await chip.click();
        await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
        await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
        await h.pagina.waitForFunction((id) => (window.__nexPatches || []).some((m) => m.dealId === id && m.patch && m.patch.simulado === true), id, { timeout: 30000 })
          .catch(() => { throw new Error("el tubo no recibió el patch de la simulación por nex-simulado"); });
        await det.waitForTimeout(1200);
        const etapa1 = await etapaCabecera(det);
        if (await btnAcciones(det).count()) throw new Error("Negocio › Detalle simulado: el botón «Acciones» del encabezado aparece y no debe (el principal lo lleva incorporado)");
        // Los destinos esperados de «Avanzar a», con la MISMA regla que panelAcciones, sobre la operación real simulada.
        const espera = await h.pagina.evaluate((id) => {
          const t = Object.values(TICKETS_EMITIDOS).find((x) => x.tipo === "deal" && x.payload && x.payload.deal && x.payload.deal.id === id);
          const p = (window.__nexPatches || []).find((m) => m.dealId === id && m.patch.simulado === true).patch;
          const deal = { ...t.payload.deal, ...p };
          const iAct = STAGE_ORDER.indexOf(deal.stage);
          const destinos = STAGES.filter((st) => {
            if (["aceptadas", "cesion", "perdida"].includes(st.id)) return false;
            if (STAGE_ORDER.indexOf(st.id) <= iAct) return false;
            if (st.id === "giro") return aprobacionFormalCliente(deal) && evidenciaContratoOk(deal).ok;
            return true;
          }).map((st) => (st.id === "giro" ? "Girar (desembolsar)" : st.name));
          return { stage: deal.stage, nombreEtapa: (stageById(deal.stage) || {}).name || null, destinos };
        }, id);
        if (etapa1 !== espera.nombreEtapa) throw new Error(`tras simular la cabecera dice «${etapa1}» y el patch dejó la etapa «${espera.stage}» («${espera.nombreEtapa}»)`);
        if (!espera.destinos.length) throw new Error(`desde «${espera.stage}» el catálogo no declara ningún destino de avance: el caso no puede probar «Avanzar a»`);
        const chev = det.locator('button[title="Elegir otra acción"]').first();
        if (!(await chev.count())) throw new Error("no aparece el botón principal (split) de la tarjeta de veredicto tras simular");
        await chev.click(); await det.waitForTimeout(350);
        const ppal = await leerPanelDe(det, (x) => x.getAttribute("title") === "Elegir otra acción");
        if (!ppal) throw new Error("el chevron del botón principal no abrió el menú");
        const itemsPpal = ppal.items.map((i) => i.t);
        if (!ppal.secciones.includes("Acción del botón")) throw new Error(`el menú del botón principal no dice «Acción del botón»: [${ppal.secciones.join(" · ")}]`);
        if (!itemsPpal.some((i) => /^(Cerrar oferta y publicar|Enviar a Comité y Publicar)$/.test(i))) throw new Error(`el botón principal no ofrece cerrar: [${itemsPpal.join(" · ")}]`);
        if (!ppal.secciones.includes("Avanzar a")) throw new Error(`el botón principal perdió «Avanzar a» (destinos esperados: ${espera.destinos.join(", ")}); secciones [${ppal.secciones.join(" · ")}]`);
        const ofrecidos = itemsPpal.filter((i) => !/^(Cerrar oferta y publicar|Enviar a Comité y Publicar|Guardar borrador|Rechazar…|(Marcar|Quitar) prioridad de curse)$/.test(i));
        if (JSON.stringify(ofrecidos) !== JSON.stringify(espera.destinos)) throw new Error(`«Avanzar a» del botón principal ofrece [${ofrecidos.join(" · ")}] y el catálogo declara [${espera.destinos.join(" · ")}]`);
        if (itemsPpal.includes(ITEM_RESET)) throw new Error("el menú del botón principal ofrece el reset, que es del menú «Acciones» (Opciones lo lleva en esta pestaña)");
        await chev.click(); await det.waitForTimeout(200);
        // ── NEGATIVA otra vez, con la oferta SIMULADA (cuando cerrar y avanzar SÍ existen en el principal).
        await tabBtn(det, "Bitácora").click(); await det.waitForTimeout(500);
        const mSim = await comprobarMenu(det, "Bitácora simulada"); await cerrarMenu(det);
        det0.push(`Bitácora simulada: 4 ítems, 1 sección, reset ${mSim.rojo}+habilitado`);
        // ── NEGATIVA del reset: oferta PUBLICADA (ticket crafteado, sesión ADMIN en el payload) → deshabilitado con el motivo escrito.
        const pP = await abrirConTicket(h, { ofertaCerrada: true, ofertaComunicada: true }, "ADMIN"); extras.push(pP);
        await tabBtn(pP, "Bitácora").click(); await pP.waitForTimeout(500);
        const mP = await comprobarMenu(pP, "Bitácora (oferta publicada)", { resetHabilitado: false });
        if (!/La oferta ya se publicó al cliente/.test(mP.items[3].title)) throw new Error(`publicada: el tooltip del reset no lleva el motivo: «${mP.items[3].title}»`);
        if (!/La oferta ya se publicó al cliente/.test(mP.texto) || !/Reabrir para modificar/.test(mP.texto)) throw new Error(`publicada: el motivo no está ESCRITO debajo del ítem apuntando a «Reabrir para modificar» (menú: «${mP.texto.slice(-220)}»)`);
        await itemAcciones(pP, new RegExp(ITEM_RESET)).dispatchEvent("click"); await pP.waitForTimeout(400);
        if (await pP.getByText(TITULO_CONFIRM_RESET).count()) throw new Error("publicada: un clic sobre el ítem deshabilitado abrió el ConfirmDialog");
        const errP = pP._erroresE2E || [];
        if (errP.length) throw new Error("errores de página en el detalle crafteado: " + errP.join(" | "));
        await pP.close(); extras.pop();
        // ── Nada se movió al recorrer los menús: sin «Oferta publicada», misma etapa que después de simular.
        const txt = await h.texto(det);
        if (/Oferta publicada/.test(txt)) throw new Error("la operación aparece como «Oferta publicada» después de recorrer el menú «Acciones»");
        const etapa2 = await etapaCabecera(det);
        if (etapa2 !== etapa1) throw new Error(`la etapa cambió al recorrer el menú: «${etapa1}» → «${etapa2}»`);
        // ── POSITIVA del reset (y desmontaje): desde Bitácora, «Eliminar la simulación…» → ConfirmDialog → la oferta vuelve a vacía.
        await leerMenuAcciones(det, "Bitácora (reset)");
        await itemAcciones(det, new RegExp(ITEM_RESET)).click(); await det.waitForTimeout(400);
        if (!(await det.getByText(TITULO_CONFIRM_RESET).count())) throw new Error(`«${ITEM_RESET}» del menú «Acciones» no abrió el ConfirmDialog «${TITULO_CONFIRM_RESET}»`);
        await det.getByRole("button", { name: "Eliminar la simulación", exact: true }).click();
        await det.waitForFunction((e0) => ((document.body.innerText || "").match(/OP-DIR\d+\s*·\s*([^\n·]+)/) || [])[1]?.trim() === e0, etapa0, { timeout: 15000 })
          .catch(() => { throw new Error(`tras confirmar el reset la cabecera no volvió a «${etapa0}»`); });
        await h.pagina.waitForFunction((id) => (window.__nexPatches || []).some((m) => m.dealId === id && m.patch && m.patch.simulado === false), id, { timeout: 30000 })
          .catch(() => { throw new Error("el tubo no recibió el patch del reset por nex-simulado: el caso dejaría la fila simulada para los que siguen"); });
        await h.pagina.waitForTimeout(800);
        const fila = await h.pagina.evaluate((id) => { const tr = [...document.querySelectorAll("tr.pl-row")].find((r) => (r.innerText || "").includes(id)); return tr ? (tr.innerText || "").replace(/\s+/g, " ").trim() : null; }, id);
        if (fila === null) throw new Error(`la fila ${id} no está en el tubo tras el reset`);
        if (!/Sin simular/.test(fila)) throw new Error(`la fila del tubo NO volvió a «Sin simular» tras el reset: «${fila.slice(0, 140)}»`);
        const etapa3 = await etapaCabecera(det);
        await sel.selectOption(usuario0); await det.waitForTimeout(300);
        const err = det._erroresE2E || [];
        if (err.length) throw new Error("errores de página en el detalle: " + err.join(" | "));
        return `${id} · sesión ${usuario0} ve [${tabs0.join(", ")}], sin «Acciones» en Negocio › Detalle · ${sinAcc0} · ADMIN ve [${tabs1.join(", ")}] · ${det0.join(" · ")} · Rechazar… abre el diálogo (vivo) · ${sinAcc1} · principal simulado: [${itemsPpal.join(" · ")}] secciones [${ppal.secciones.join(" · ")}], «Avanzar a» = catálogo [${espera.destinos.join(" · ")}] · publicada: reset deshabilitado, motivo escrito, clic no abre nada · etapa ${etapa0} → ${etapa1} = ${etapa2}, sin «Oferta publicada» · reset desde Bitácora → «${etapa3}», tubo «Sin simular»`;
      } finally {
        for (const p of extras) await p.close().catch(() => {});
        if (det && usuario0) await det.locator(SEL_SESION).selectOption(usuario0).catch(() => {});
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h);
      }
    } },
];
