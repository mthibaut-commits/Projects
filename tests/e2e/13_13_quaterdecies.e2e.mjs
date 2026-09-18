/* Gate e2e de la regla 13-quaterdecies: «Eliminar la simulación y vaciar la oferta» devuelve la oportunidad al
   estado de ENTRADA sin cerrar la pestaña, no toca la evidencia, avisa al tubo por `nex-simulado`, y sólo se
   ofrece mientras la oferta siga siendo del ejecutivo. Se ejercitan las DOS direcciones en la pantalla real:
   NEGATIVA · con la misma operación ya simulada se abren dos detalles —uno con la oferta FIRMADA
     (`clienteAcepto`) y otro PUBLICADA (`ofertaCerrada` + `ofertaComunicada`)— por el mismo ticket opaco que
     usa la app (`emitirTicketDetalle`, global de la página del tubo): el ítem tiene que estar deshabilitado, con
     el motivo ESCRITO debajo apuntando a «Reabrir para modificar», y un clic forzado no abre el ConfirmDialog.
   POSITIVA · en el detalle real (abierto por el tubo, con `window.opener`) se simula «Todo lo disponible», se
     PLANTA evidencia en los repositorios de la operación (visado, llamada, veto, versión), se reinicia por el menú
     Opciones → ConfirmDialog → «Eliminar la simulación», y se mide: panel de arranque de vuelta, «Documentos en la
     oferta» en 0, la cabecera de vuelta a la etapa con que se abrió, «Documentos disponibles» idéntico al de
     entrada, evidencia intacta byte a byte, y en el TUBO el patch que llegó por `nex-simulado`: simulado=false,
     stage=prospeccion, oferta vacía, pool = EXACTAMENTE oferta ∪ pool del estado simulado (ninguna perdida) que
     además contiene todos los ids con que la operación se abrió, y cada campo que la simulación había escrito
     presente en el patch con valor `undefined` (borrado, no viejo: si faltara la clave, `{...d, ...patch}`
     dejaría la cifra vieja). En DATOS el pool no vuelve al de entrada: la simulación incorpora facturas del
     libro (`candidatasLibro`) ausentes de `facturasDisponibles` y el reset las conserva —hallazgo documentado—;
     en PANTALLA «Documentos disponibles» sí dice lo mismo antes y después.
   Deja todo como lo encontró: los cuatro repositorios de la operación vuelven a su foto previa (con el `ok` de
   cada escritura verificado, no un `del` a ciegas), los tickets crafteados salen de `TICKETS_EMITIDOS` y de
   localStorage, el listener de `message` y `window.__nexPatches` se retiran, el filtro rápido vuelve al que
   estaba y el Directorio se apaga. */

const ITEM = /Eliminar la simulación y vaciar la oferta/;
const ESTRUCTURALES = new Set(["simulado", "stage", "monto", "facturas", "status", "facturasOp", "facturasDisponibles", "ofertaSugerida"]);
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* Apaga el Directorio: con el harness nuevo, su `apagarDirectorio` (idempotente); con el anterior, a mano.
   Encendido, el toggle dice «Directorio · N» —por eso el regex admite el conteo— y sólo se cliquea si está encendido. */
const apagarDirectorio = async (h) => {
  if (h.apagarDirectorio) return h.apagarDirectorio();
  const t = h.pagina.locator("button", { hasText: /^\s*Directorio(\s*·\s*\d+)?\s*$/ }).first();
  if (!(await t.count()) || !/·\s*\d+/.test((await t.innerText()) || "")) return;
  await t.click();
  await h.pagina.waitForFunction(() => !/Directorio\s*·\s*\d+/.test(document.body.innerText || ""), null, { timeout: 60000 }).catch(() => {});
  await h.pagina.waitForTimeout(500);
};
/* La línea de una sección del detalle, anclada por el TEXTO de su título: el elemento que lo contiene junto a sus
   conteos («N deudores · M facturas por M$…») es su padre. Sin clases de Tailwind. */
const lineaSeccion = (pag, titulo) => pag.evaluate((t) => {
  const el = [...document.querySelectorAll("span")].find((s) => (s.textContent || "").trim() === t);
  const fila = el && el.parentElement;
  return fila ? (fila.innerText || "").replace(/\s+/g, " ").trim() : null;
}, titulo);
const etapaCabecera = (pag) => pag.evaluate(() => ((document.body.innerText || "").match(/OP-DIR\d+\s*·\s*([^\n·]+)/) || [])[1]?.trim() || null);
/* El filtro rápido activo del tubo (la pestaña en negrita, `title="Filtrar oportunidades"`), sin el conteo. */
const filtroActivo = (pag) => pag.evaluate(() => {
  const b = [...document.querySelectorAll('button[title="Filtrar oportunidades"]')].find((x) => x.style.fontWeight === "600");
  return b ? (b.innerText || "").replace(/\s*\d+\s*$/, "").trim() : null;
});
const elegirFiltro = async (pag, rotulo) => {
  await pag.locator('button[title="Filtrar oportunidades"]', { hasText: new RegExp("^\\s*" + escapar(rotulo)) }).first().click().catch(() => {});
  await pag.waitForTimeout(1200);
};
const uuidDe = (pag) => { try { return new URL(pag.url()).searchParams.get("t"); } catch (_) { return null; } };

/* Abre un detalle a partir de un deal CRAFTEADO en la página del tubo —la operación del ticket `uuidBase`, con el
   último patch de simulación que el tubo recibió y `extra` encima— por el mismo ticket opaco de la app. Deja el
   uuid emitido en `pg._ticket13q` para retirarlo al terminar. */
async function abrirConTicket(h, uuidBase, extra) {
  const uuid = await h.pagina.evaluate(({ uuidBase, extra }) => {
    const t = TICKETS_EMITIDOS[uuidBase];
    if (!t || t.tipo !== "deal" || !t.payload || !t.payload.deal) return null;
    const sim = (window.__nexPatches || []).filter((m) => m.dealId === t.payload.deal.id).pop();
    const deal = { ...t.payload.deal, ...(sim ? sim.patch : {}), ...extra };
    return emitirTicketDetalle("deal", deal.id, t.usuario, { deal, usuario: t.usuario, tab: null, ts: Date.now() });
  }, { uuidBase, extra });
  if (!uuid) throw new Error("no encuentro en TICKETS_EMITIDOS el ticket del detalle abierto desde el tubo");
  const pg = await h.ctx.newPage();
  pg._ticket13q = uuid;
  pg.on("pageerror", (e) => (pg._erroresE2E = pg._erroresE2E || []).push(String(e).slice(0, 300)));
  const url = h.pagina.url().replace(/\?.*$/, "") + "?t=" + encodeURIComponent(uuid);
  await pg.goto(url, { waitUntil: "load", timeout: 300000 });
  await pg.waitForFunction(() => /DETALLE DE OPORTUNIDAD/i.test(document.body.innerText || ""), null, { timeout: 300000 });
  await pg.waitForTimeout(800);
  return pg;
}
/* Dirección negativa sobre un detalle: el ítem existe, está deshabilitado, el motivo está escrito y el clic no abre nada. */
async function comprobarBloqueado(pg, motivoRe, rotulo) {
  // Con el paquete cerrado el detalle ya no dibuja «Opciones» —queda «Operación creada» y el menú «Acciones»
  // (regla 33)—, así que el ítem y su motivo se buscan ahí: es el MISMO ítem, en el único menú que hay.
  const op = pg.locator("button", { hasText: /^\s*Opciones\s*$/ }).first();
  const acc = pg.locator("button", { hasText: /^\s*Acciones\s*$/ }).first();
  const boton = (await op.count()) ? op : acc;
  if (!(await boton.count())) throw new Error(`${rotulo}: el detalle no ofrece ni «Opciones» ni «Acciones»`);
  await boton.click(); await pg.waitForTimeout(400);
  const item = pg.locator("button", { hasText: ITEM }).first();
  if (!(await item.count())) throw new Error(`${rotulo}: el ítem «Eliminar la simulación…» DESAPARECIÓ del menú en vez de deshabilitarse con motivo`);
  if (!(await item.isDisabled())) throw new Error(`${rotulo}: el ítem está HABILITADO con la oferta ${rotulo}`);
  const tip = (await item.getAttribute("title")) || "";
  const menu = await pg.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Eliminar la simulación y vaciar la oferta/.test(x.innerText || "")); return b && b.parentElement ? (b.parentElement.innerText || "") : ""; });
  if (!motivoRe.test(menu)) throw new Error(`${rotulo}: el motivo no está ESCRITO debajo del ítem (menú: «${menu.replace(/\s+/g, " ").slice(-200)}»)`);
  if (!/Reabrir para modificar/.test(menu)) throw new Error(`${rotulo}: el motivo no apunta a «Reabrir para modificar»`);
  if (!motivoRe.test(tip)) throw new Error(`${rotulo}: el tooltip del ítem no lleva el motivo: «${tip}»`);
  await item.dispatchEvent("click"); await pg.waitForTimeout(400);
  if (await pg.locator("text=¿Eliminar la simulación y partir de cero?").count()) throw new Error(`${rotulo}: un clic sobre el ítem deshabilitado abrió el ConfirmDialog`);
  return tip;
}

export const casos = [
  { id: "e2e-13-quaterdecies", titulo: "«Eliminar la simulación y vaciar la oferta» deja la oferta vacía, el pool = oferta ∪ pool del estado simulado (ninguna perdida, todas las de entrada), los campos de finanzasDe borrados, la etapa de entrada (prospeccion en el patch) y el tubo avisado, sin tocar la evidencia; firmada o publicada va deshabilitado —no oculto— con el motivo escrito",
    correr: async (h) => {
      let det = null; const extras = [];
      let id = null, fotoRepos = null, reposRestaurados = null, filtroPrevio = null;
      // Los cuatro repositorios de la operación vuelven a su foto previa: `set` de lo que había, `del` de lo que no,
      // con el `ok` de cada escritura verificado (RAT-01 puede rechazar) y un reintento si el contrato la rechazó.
      const restaurarRepos = async () => {
        if (reposRestaurados || !det || !id || !fotoRepos) return;
        reposRestaurados = await det.evaluate(async ({ id, foto }) => {
          const pares = [["repoVisado", repoVisado, foto.vis], ["repoVerifTel", repoVerifTel, foto.tel], ["repoNoConfirmadas", repoNoConfirmadas, foto.veto], ["repoSimVersions", repoSimVersions, foto.vers]];
          const out = [];
          for (const [n, r, v] of pares) {
            const escribir = () => (v === undefined ? r.del(id) : r.set(id, v));
            let res = await escribir();
            if (!res || !res.ok) { await new Promise((ok) => setTimeout(ok, 1500)); res = await escribir(); }
            out.push(`${n} ${res && res.ok ? "ok" : (res && res.codigo) || "sin respuesta"}`);
          }
          return out;
        }, { id, foto: fotoRepos });
      };
      try {
        await h.encenderDirectorio();
        // El tubo captura los patches de `nex-simulado` SIN pasar por JSON: una clave en `undefined` tiene que seguir siendo clave.
        await h.pagina.evaluate(() => {
          window.__nexPatches = [];
          window.__nexEscucha13q = (e) => { const m = e.data; if (m && m.type === "nex-simulado" && m.patch) window.__nexPatches.push(m); };
          window.addEventListener("message", window.__nexEscucha13q);
        });
        det = await h.abrirDetalle(0);
        const uuidDet = uuidDe(det);
        if (!uuidDet) throw new Error("el detalle no se abrió por ticket (?t=…): " + det.url());
        const foto = await h.pagina.evaluate((u) => {
          const t = TICKETS_EMITIDOS[u]; if (!t || t.tipo !== "deal" || !t.payload || !t.payload.deal) return null;
          const d = t.payload.deal;
          return { id: d.id, stage: d.stage, simulado: !!d.simulado, nOp: (d.facturasOp || []).length, pool: (d.facturasDisponibles || []).map((f) => String(f.id ?? f.folio)).sort() };
        }, uuidDet);
        if (!foto) throw new Error("el ticket del detalle abierto no está en TICKETS_EMITIDOS del tubo");
        id = foto.id;
        if (foto.stage !== "prospeccion" || foto.simulado || foto.nOp !== 0 || !foto.pool.length) throw new Error("la operación del Directorio no arranca en el estado de entrada: " + JSON.stringify(foto));
        // Foto de los repositorios ANTES de tocar nada (la simulación también escribe versiones): es a lo que se vuelve al terminar.
        fotoRepos = await det.evaluate((id) => {
          const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
          return { vis: copia(repoVisado.get(id)), tel: copia(repoVerifTel.get(id)), veto: copia(repoNoConfirmadas.get(id)), vers: copia(repoSimVersions.get(id)) };
        }, id);
        const etapa0 = await etapaCabecera(det);
        const disp0 = await lineaSeccion(det, "Documentos disponibles");
        // SIMULAR desde el detalle («Todo lo disponible»), como capturar_tabla_simulada.mjs.
        const chip = det.locator("button").filter({ hasText: /Todo lo disponible|Todas las Prime/ }).first();
        if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque");
        await chip.click();
        await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
        await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
        await h.pagina.waitForFunction((id) => (window.__nexPatches || []).some((m) => m.dealId === id && m.patch && m.patch.simulado === true), id, { timeout: 30000 })
          .catch(() => { throw new Error("el tubo no recibió el patch de la simulación por nex-simulado"); });
        await det.waitForTimeout(1200);
        const sim = await h.pagina.evaluate((id) => {
          const m = (window.__nexPatches || []).find((x) => x.dealId === id && x.patch.simulado === true); const p = m.patch;
          return { stage: p.stage, nOp: (p.facturasOp || []).length, nDisp: (p.facturasDisponibles || []).length, claves: Object.keys(p),
            union: [...(p.facturasOp || []), ...(p.facturasDisponibles || [])].map((f) => String(f.id ?? f.folio)).sort() };
        }, id);
        const camposFin = sim.claves.filter((k) => !ESTRUCTURALES.has(k));
        if (sim.stage !== "oferta" || sim.nOp === 0) throw new Error("la simulación no dejó la oferta armada en «oferta»: " + JSON.stringify({ stage: sim.stage, nOp: sim.nOp }));
        if (camposFin.length < 5) throw new Error("el patch de la simulación trae menos de 5 campos de finanzasDe: " + camposFin.join(","));
        // La simulación puede cambiar el conjunto (incorpora facturas del libro; una bloqueada no entra): eso es de
        // `aplicarSugerencia`/`incorporarFacturasOferta`, no del reset. Lo que la regla exige es que el reset no pierda
        // NINGUNA de las que la operación tiene al reiniciar, y que las de entrada sigan ahí.
        const setIni = new Set(foto.pool), setSim = new Set(sim.union);
        const soloIni = foto.pool.filter((x) => !setSim.has(x)), soloSim = sim.union.filter((x) => !setIni.has(x));
        const etapa1 = await etapaCabecera(det);
        if (etapa0 && etapa1 === etapa0) throw new Error(`la cabecera no cambió de etapa al simular: sigue «${etapa1}»`);
        const ofer1 = await lineaSeccion(det, "Documentos en la oferta");
        if (!ofer1 || /\b0 FACTURAS\b/i.test(ofer1)) throw new Error(`«Documentos en la oferta» no muestra la selección simulada: «${ofer1}»`);

        // ── NEGATIVA · firmada y publicada: deshabilitado con el motivo escrito, apuntando a «Reabrir para modificar».
        const pF = await abrirConTicket(h, uuidDet, { clienteAcepto: true }); extras.push(pF);
        const tipF = await comprobarBloqueado(pF, /El cliente ya firmó esta oferta/, "firmada");
        const pP = await abrirConTicket(h, uuidDet, { ofertaCerrada: true, ofertaComunicada: true }); extras.push(pP);
        const tipP = await comprobarBloqueado(pP, /La oferta ya se publicó al cliente/, "publicada");
        for (const p of extras) { const e = p._erroresE2E || []; if (e.length) throw new Error("errores de página en un detalle crafteado: " + e.join(" | ")); }

        // ── POSITIVA · plantar evidencia, reiniciar, medir.
        const antes = await det.evaluate(async (id) => {
          const rs = await Promise.all([
            repoVisado.set(id, { "5": { estado: "aprobado", por: "SONDA-13q", fecha: "2026-09-17 10:00" } }),
            repoVerifTel.set(id, { "SONDA-13q": { por: "EV", fecha: "2026-09-17 10:01" } }),
            repoNoConfirmadas.set(id, ["F-SONDA-13q"]),
            repoSimVersions.push(id, { v: 999, rev: 0, ts: Date.now(), origen: "sonda-13q", vars: {}, res: [], estado: "ok" }),
          ]);
          const rechazadas = rs.filter((r) => !r || !r.ok).map((r) => (r && r.codigo) || "sin respuesta");
          if (rechazadas.length) return "RECHAZO " + rechazadas.join(",");
          return JSON.stringify({ vis: repoVisado.get(id), tel: repoVerifTel.get(id), veto: repoNoConfirmadas.get(id), vers: (SIM_VERSIONS[id] || []).map((v) => v.v) });
        }, id);
        if (!/SONDA-13q/.test(antes) || !/999/.test(antes)) throw new Error("no pude plantar la evidencia en los repositorios: " + antes);
        await det.locator("button", { hasText: /^\s*Opciones\s*$/ }).first().click(); await det.waitForTimeout(400);
        const item = det.locator("button", { hasText: ITEM }).first();
        if (!(await item.count())) throw new Error("no aparece «Eliminar la simulación y vaciar la oferta» en Opciones con la oferta del ejecutivo");
        if (await item.isDisabled()) throw new Error("el ítem está deshabilitado con una oferta que sigue siendo del ejecutivo: " + (await item.getAttribute("title")));
        await item.click(); await det.waitForTimeout(400);
        if (!(await det.locator("text=¿Eliminar la simulación y partir de cero?").count())) throw new Error("el ítem no abrió el ConfirmDialog «¿Eliminar la simulación y partir de cero?»");
        await det.getByRole("button", { name: "Eliminar la simulación", exact: true }).click();
        await det.waitForFunction(() => /¿Qué facturas quieres incluir en la oferta\?/.test(document.body.innerText || ""), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras confirmar, el detalle no vuelve al panel de arranque «¿Qué facturas quieres incluir en la oferta?»"); });
        await det.waitForTimeout(800);
        const td = await h.texto(det);
        // El rótulo «Condiciones comerciales» vive bajo el velo atenuado (`!deal.simulado`) y se dibuja siempre; lo que depende
        // de la simulación es la selección («Tienes N facturas elegidas»), el conteo de «Documentos en la oferta» y el tramo
        // «quedarían» del indicador de línea (13-terdecies).
        if (/Tienes \d+ facturas? elegidas?/.test(td)) throw new Error("tras el reset la oferta sigue con facturas elegidas: " + (td.match(/Tienes [^\n]+/) || [])[0]);
        const ofer2 = await lineaSeccion(det, "Documentos en la oferta");
        if (ofer2 !== null && !/\b0 FACTURAS\b/i.test(ofer2)) throw new Error(`tras el reset «Documentos en la oferta» no queda en 0 facturas: «${ofer2}»`);
        const queda = await det.evaluate(() => [...document.querySelectorAll('div[title^="Línea aprobada"]')].some((el) => /quedarían/.test(el.getAttribute("title") || "")));
        if (queda) throw new Error("tras el reset el indicador de línea de la cabecera sigue descontando la operación («quedarían»): la simulación no se borró en pantalla");
        const etapa2 = await etapaCabecera(det);
        if (etapa2 !== etapa0) throw new Error(`la cabecera no volvió a la etapa de entrada: entrada «${etapa0}», simulada «${etapa1}», tras reset «${etapa2}»`);
        const disp2 = await lineaSeccion(det, "Documentos disponibles");
        if (disp0 !== null && disp2 !== disp0) throw new Error(`«Documentos disponibles» no volvió a lo de entrada: antes «${disp0}» · después «${disp2}»`);
        const despues = await det.evaluate((id) => JSON.stringify({ vis: repoVisado.get(id), tel: repoVerifTel.get(id), veto: repoNoConfirmadas.get(id), vers: (SIM_VERSIONS[id] || []).map((v) => v.v) }), id);
        if (despues !== antes) throw new Error(`el reset tocó la evidencia: antes ${antes} · después ${despues}`);
        // EL TUBO: el patch del reset llegó por nex-simulado y dice exactamente lo que la regla exige.
        await h.pagina.waitForFunction((id) => (window.__nexPatches || []).some((m) => m.dealId === id && m.patch && m.patch.simulado === false), id, { timeout: 30000 })
          .catch(() => { throw new Error("el tubo no recibió el patch del reset por nex-simulado (vacía acá, simulada allá)"); });
        const rs = await h.pagina.evaluate(({ id, campos }) => {
          const m = (window.__nexPatches || []).find((x) => x.dealId === id && x.patch.simulado === false); const p = m.patch;
          return { stage: p.stage, nOp: (p.facturasOp || []).length, monto: p.monto, facturas: p.facturas, ofertaSugerida: p.ofertaSugerida,
            pool: (p.facturasDisponibles || []).map((f) => String(f.id ?? f.folio)).sort(),
            ausentes: campos.filter((k) => !(k in p)), viejos: campos.filter((k) => (k in p) && p[k] !== undefined) };
        }, { id, campos: camposFin });
        if (rs.stage !== "prospeccion") throw new Error("el patch del reset no devuelve la etapa a prospección: " + rs.stage);
        if (rs.nOp !== 0 || rs.monto !== 0 || rs.facturas !== 0 || rs.ofertaSugerida) throw new Error("el patch del reset no deja la oferta vacía: " + JSON.stringify({ nOp: rs.nOp, monto: rs.monto, facturas: rs.facturas }));
        const setReset = new Set(rs.pool);
        const perdidas = sim.union.filter((x) => !setReset.has(x)), inventadas = rs.pool.filter((x) => !setSim.has(x));
        if (perdidas.length || inventadas.length || rs.pool.length !== sim.union.length) throw new Error(`el pool tras el reset no es oferta ∪ pool de la simulación: simulada ${sim.union.length} ids, reset ${rs.pool.length} ids (${inventadas.length} inventados, ${perdidas.length} perdidos: ${perdidas.slice(0, 5).join(",")})`);
        const perdidasEntrada = foto.pool.filter((x) => !setReset.has(x));
        if (perdidasEntrada.length) throw new Error(`el pool tras el reset no trae ${perdidasEntrada.length} de las ${foto.pool.length} facturas con que la operación se abrió (${soloIni.length} las retiró la simulación, ${perdidasEntrada.length - soloIni.length} el reset): ${perdidasEntrada.slice(0, 5).join(",")}`);
        if (rs.ausentes.length) throw new Error("campos de finanzasDe AUSENTES del patch del reset (el tubo se quedaría con la cifra vieja): " + rs.ausentes.join(","));
        if (rs.viejos.length) throw new Error("campos de finanzasDe con valor VIEJO en el patch del reset: " + rs.viejos.join(","));
        // Y la fila del tubo vuelve a decir «Sin simular» (puede haber cambiado de pestaña de filtro al simularse): si hay que
        // pasar a «Todos» para verla, el filtro que estaba se devuelve al terminar.
        const filaSin = async () => h.pagina.evaluate((id) => { const tr = [...document.querySelectorAll("tr.pl-row")].find((r) => (r.innerText || "").includes(id)); return tr ? /Sin simular/.test(tr.innerText || "") : null; }, id);
        let fila = await filaSin();
        if (fila === null) { filtroPrevio = await filtroActivo(h.pagina); await elegirFiltro(h.pagina, "Todos"); fila = await filaSin(); }
        if (fila === false) throw new Error("la fila del tubo NO volvió a «Sin simular» tras el reset");
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        await restaurarRepos();
        const rechazos = (reposRestaurados || []).filter((x) => !/ ok$/.test(x));
        if (rechazos.length) throw new Error("no pude devolver los repositorios a su foto previa: " + rechazos.join(" · "));
        return `${id} · entrada «${etapa0}» pool ${foto.pool.length} (disp0 «${disp0}») · simulada «${etapa1}» oferta ${sim.nOp} + pool ${sim.nDisp} (ofer1 «${ofer1}»; vs entrada: ${soloIni.length} sólo en entrada, ${soloSim.length} sólo tras simular —facturas del libro—), ${camposFin.length} campos de finanzasDe (${camposFin.slice(0, 6).join(",")}…) · firmada → deshabilitado «${tipF.slice(0, 40)}…» · publicada → deshabilitado «${tipP.slice(0, 40)}…» · reset → «${etapa2}», oferta 0 (ofer2 «${ofer2}»), pool ${rs.pool.length} = oferta ∪ pool simulados (0 perdidas, 0 inventadas, ${foto.pool.length}/${foto.pool.length} de entrada; disp2 «${disp2}»), ${camposFin.length}/${camposFin.length} campos borrados (0 ausentes, 0 viejos), evidencia intacta (${antes.length} bytes), tubo «Sin simular» ${fila === true ? "sí" : "no visible"}${filtroPrevio ? ` (filtro «${filtroPrevio}» → «Todos» → «${filtroPrevio}»)` : ""} · repos restaurados: ${reposRestaurados.join(", ")}`;
      } finally {
        await restaurarRepos().catch(() => {});
        await h.pagina.evaluate((uuids) => {
          if (window.__nexEscucha13q) window.removeEventListener("message", window.__nexEscucha13q);
          delete window.__nexEscucha13q; delete window.__nexPatches;
          for (const u of uuids) { try { delete TICKETS_EMITIDOS[u]; localStorage.removeItem("fs_tk_" + u); } catch (_) {} }
        }, extras.map((p) => p._ticket13q).filter(Boolean)).catch(() => {});
        for (const p of extras) await p.close().catch(() => {});
        if (det) await det.close().catch(() => {});
        if (filtroPrevio) await elegirFiltro(h.pagina, filtroPrevio);
        await apagarDirectorio(h);
      }
    } },
];
