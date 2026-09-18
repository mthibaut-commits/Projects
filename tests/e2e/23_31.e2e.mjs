/* Gate e2e de la regla 31 · MODO DIRECTORIO, la mitad que vive en el estado de React (`directorio` y sus cinco
   enganches marcados DIRECTORIO: dealsTubo, filtered, los conteos de las pestañas, el contador de la cabecera y
   el botón). Se mide en la pantalla real, en los DOS estados con que puede encontrarse el toggle:
   1) TUBO RECIÉN CARGADO, sin apretar Start («0 de 0»): encender deja «3 de 5» —3 en «Con línea», 2 en «Sin
      línea», 5 en «Todos», 0 en «Otras…»—, cinco filas OP-DIR y ninguna otra; oculta Start/Reiniciar/Inbound y
      la «Bandeja Inbound» del Kanban; no deja rastro en localStorage/sessionStorage; y apagar vuelve a «0 de 0»
      con los tres controles de vuelta y sin ninguna OP-DIR.
   2) CON EL STREAM CORRIDO (Start → filas del inbound → Pausar, para que la foto sea comparable): se fotografían
      la cabecera, las filas (ids en orden) y los conteos «Todos»/«Otras…» del inbound; encender deja el total en 5
      —silencia el stream: «Todos» pasa de X+inbound a 5 y «Otras…» a 0— y NINGUNA de las filas previas queda
      visible; apagar devuelve EXACTAMENTE las mismas filas en el mismo orden y la misma cabecera.
   DIRECCIÓN NEGATIVA: lo que el toggle NO toca —las oportunidades ajenas al elenco sobreviven intactas al
   encender/apagar (retira por la marca `_directorio`, no vacía el tubo)— y lo que NO deja —ninguna OP-DIR después
   de apagar, ningún control del stream mientras está encendido, ninguna clave de storage—. */

const RE_CAB = /(\d+)\s+de\s+(\d+)\s+negocios/;
const cabecera = async (pg) => { const m = (await pg.evaluate(() => document.body.innerText || "")).match(RE_CAB); return m ? { n: +m[1], total: +m[2], txt: `${m[1]} de ${m[2]}` } : null; };
const nBtn = (pg, re) => pg.locator("button", { hasText: re }).count();
const filas = (pg) => pg.evaluate(() => [...document.querySelectorAll("tr.pl-row")].map((tr) => ((tr.innerText || "").match(/OP-[A-Z0-9-]+/) || ["?"])[0]));
/* Conteo de una pestaña del tubo: el botón «Rótulo N». */
const tab = async (pg, rotulo) => pg.evaluate((r) => {
  const b = [...document.querySelectorAll("button")].map((x) => (x.innerText || "").replace(/\s+/g, " ").trim()).find((t) => new RegExp("^" + r + " \\d+$").test(t));
  return b ? +b.split(" ").pop() : null;
}, rotulo);
const clicTab = async (pg, rotulo) => { await pg.locator("button", { hasText: new RegExp("^\\s*" + rotulo + "\\s*\\d+\\s*$") }).first().click(); await pg.waitForTimeout(400); };
const storageDir = (pg) => pg.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => /directorio/i.test(k)));
/* Cambia la vista del tubo por el selector (Tabla / Kanban) y devuelve si el texto de la página trae «Bandeja Inbound». */
async function bandejaEnKanban(pg) {
  await pg.locator('button[title^="Cambiar la vista del tubo"]').click(); await pg.waitForTimeout(250);
  await pg.locator("button", { hasText: /^\s*Kanban\s*$/ }).first().click(); await pg.waitForTimeout(700);
  const hay = /Bandeja Inbound/.test(await pg.evaluate(() => document.body.innerText || ""));
  await pg.locator('button[title^="Cambiar la vista del tubo"]').click(); await pg.waitForTimeout(250);
  await pg.locator("button", { hasText: /^\s*Tabla\s*$/ }).first().click(); await pg.waitForTimeout(700);
  return hay;
}
const controles = async (pg) => ({ start: await nBtn(pg, /^\s*(Start|Pausar)\s*$/), reiniciar: await nBtn(pg, /^\s*Reiniciar\s*$/), inbound: await nBtn(pg, /^\s*Inbound\s*$/), dir: await nBtn(pg, /^\s*Directorio(\s*·\s*\d+)?\s*$/) });
const apagar = async (pg) => { await pg.locator("button", { hasText: /^\s*Directorio\s*·\s*\d+\s*$/ }).first().click(); await pg.waitForTimeout(600); };

export const casos = [
  { id: "e2e-31", titulo: "modo Directorio: encender deja «3 de 5» (3 con línea · 2 sin línea · Todos 5 · Otras 0) con 5 filas OP-DIR, oculta Start/Reiniciar/Inbound y la Bandeja Inbound del Kanban, no persiste; apagar retira SÓLO las OP-DIR y devuelve el tubo exacto, en «0 de 0» y con el stream corrido",
    correr: async (h) => {
      const pg = h.pagina;
      const det = [];
      // ── 1 · tubo recién cargado, sin Start (la sesión aterriza en el Dashboard: hay que ir al tubo)
      await h.irA("Gestión diaria");
      const c0 = await cabecera(pg);
      if (!c0 || c0.txt !== "0 de 0") throw new Error(`el tubo recién cargado tiene que decir «0 de 0» y dice «${c0 && c0.txt}»`);
      const k0 = await controles(pg);
      if (!(k0.start === 1 && k0.reiniciar === 1 && k0.inbound === 1 && k0.dir === 1)) throw new Error(`antes de encender faltan controles: ${JSON.stringify(k0)}`);
      if ((await filas(pg)).length !== 0) throw new Error("hay filas en el tubo antes de encender y de apretar Start");
      await h.encenderDirectorio();
      const c1 = await cabecera(pg);
      const f1 = await filas(pg);
      const tabs1 = { con: await tab(pg, "Con línea"), sin: await tab(pg, "Sin línea"), todos: await tab(pg, "Todos"), otras: await tab(pg, "Otras (Empresas|facturas)") };
      const k1 = await controles(pg);
      const nToggle = await nBtn(pg, /^\s*Directorio\s*·\s*5\s*$/);
      if (!c1 || c1.total !== 5 || c1.n !== tabs1.con || c1.txt !== "3 de 5") throw new Error(`encendido: la cabecera dice «${c1 && c1.txt}» y tiene que decir «3 de 5» (Con línea ${tabs1.con})`);
      if (!(tabs1.con === 3 && tabs1.sin === 2 && tabs1.todos === 5 && tabs1.otras === 0)) throw new Error(`encendido: pestañas ${JSON.stringify(tabs1)}; se esperaba Con línea 3 · Sin línea 2 · Todos 5 · Otras 0`);
      if (f1.length !== 3 || !f1.every((id) => /^OP-DIR\d+$/.test(id))) throw new Error(`encendido: filas [${f1.join(",")}] — tienen que ser 3 y todas OP-DIR`);
      if (!(k1.start === 0 && k1.reiniciar === 0 && k1.inbound === 0 && k1.dir === 1 && nToggle === 1)) throw new Error(`encendido: Start/Reiniciar/Inbound tienen que desaparecer y el toggle decir «Directorio · 5»: ${JSON.stringify(k1)} toggle·5=${nToggle}`);
      await clicTab(pg, "Sin línea"); const cS = await cabecera(pg); const fS = await filas(pg);
      await clicTab(pg, "Todos"); const cT = await cabecera(pg); const fT = await filas(pg);
      await clicTab(pg, "Con línea");
      if (!(cS && cS.txt === "2 de 5" && fS.length === 2 && cT && cT.txt === "5 de 5" && fT.length === 5 && new Set(fT).size === 5 && fT.every((id) => /^OP-DIR\d+$/.test(id))))
        throw new Error(`encendido: Sin línea «${cS && cS.txt}» ${fS.length} filas · Todos «${cT && cT.txt}» ${fT.length} filas [${fT.join(",")}]`);
      const bandejaOn = await bandejaEnKanban(pg);
      if (bandejaOn) throw new Error("encendido: el Kanban sigue mostrando la «Bandeja Inbound»");
      const st = await storageDir(pg);
      if (st.length) throw new Error(`encendido: quedó rastro en storage: ${st.join(",")}`);
      await apagar(pg);
      const c2 = await cabecera(pg); const f2 = await filas(pg); const k2 = await controles(pg);
      const quedaDir = /OP-DIR\d/.test(await pg.evaluate(() => document.body.innerText || ""));
      if (!c2 || c2.txt !== "0 de 0" || f2.length !== 0 || quedaDir) throw new Error(`apagado: «${c2 && c2.txt}», ${f2.length} filas, OP-DIR visible=${quedaDir}; tenía que volver a «0 de 0» sin ninguna OP-DIR`);
      if (!(k2.start === 1 && k2.reiniciar === 1 && k2.inbound === 1 && k2.dir === 1)) throw new Error(`apagado: los controles del stream no volvieron: ${JSON.stringify(k2)}`);
      det.push(`sin Start: 0 de 0 → ${c1.txt} (con ${tabs1.con}·sin ${tabs1.sin}·todos ${tabs1.todos}·otras ${tabs1.otras}; filas ${f1.length}/${fS.length}/${fT.length}) · controles ${k0.start + k0.reiniciar + k0.inbound}→${k1.start + k1.reiniciar + k1.inbound}→${k2.start + k2.reiniciar + k2.inbound} · Bandeja Inbound en Kanban: ${bandejaOn} · storage 0 → apagado ${c2.txt}`);

      // ── 2 · con el stream corrido: Start, esperar filas del inbound, Pausar, fotografiar
      await pg.locator("button", { hasText: /^\s*Start\s*$/ }).first().click();
      await pg.waitForFunction((re) => { const m = (document.body.innerText || "").match(re); return m && +m[2] >= 10 && document.querySelectorAll("tr.pl-row").length >= 3; }, RE_CAB.source, { timeout: 180000 });
      await pg.locator("button", { hasText: /^\s*Pausar\s*$/ }).first().click(); await pg.waitForTimeout(1200);
      const c3 = await cabecera(pg); const f3 = await filas(pg);
      const tabs3 = { con: await tab(pg, "Con línea"), sin: await tab(pg, "Sin línea"), todos: await tab(pg, "Todos"), otras: await tab(pg, "Otras (Empresas|facturas)") };
      const bandeja3 = await bandejaEnKanban(pg);
      const c3b = await cabecera(pg); const f3b = await filas(pg);
      if (!c3 || c3b.txt !== c3.txt || f3b.join() !== f3.join()) throw new Error(`la foto con el stream pausado no es estable (${c3 && c3.txt} → ${c3b && c3b.txt}); no se puede comparar`);
      if (!bandeja3) throw new Error("con el stream corrido y el Directorio apagado el Kanban tiene que mostrar la «Bandeja Inbound»");
      if (f3.length < 3 || f3.some((id) => /^OP-DIR/.test(id))) throw new Error(`foto previa inválida: filas [${f3.join(",")}]`);
      await h.encenderDirectorio();
      const c4 = await cabecera(pg); const f4 = await filas(pg); const k4 = await controles(pg);
      const tabs4 = { con: await tab(pg, "Con línea"), sin: await tab(pg, "Sin línea"), todos: await tab(pg, "Todos"), otras: await tab(pg, "Otras (Empresas|facturas)") };
      const bandeja4 = await bandejaEnKanban(pg);
      if (!c4 || c4.total !== 5 || c4.n !== tabs4.con || !(tabs4.con + tabs4.sin === 5 && tabs4.todos === 5 && tabs4.otras === 0)) throw new Error(`stream corrido + encendido: cabecera «${c4 && c4.txt}», pestañas ${JSON.stringify(tabs4)}; el total tiene que ser 5 y el stream silenciado`);
      if (!(tabs3.todos > 5 || tabs3.otras > 0)) throw new Error(`la sonda del stream no tiene inbound que silenciar (Todos ${tabs3.todos}, Otras ${tabs3.otras})`);
      if (!f4.every((id) => /^OP-DIR\d+$/.test(id)) || f4.some((id) => f3.includes(id))) throw new Error(`stream corrido + encendido: filas [${f4.join(",")}] — sólo OP-DIR y ninguna de las previas`);
      if (!(k4.start === 0 && k4.reiniciar === 0 && k4.inbound === 0) || bandeja4) throw new Error(`stream corrido + encendido: controles ${JSON.stringify(k4)}, Bandeja Inbound=${bandeja4}`);
      await apagar(pg);
      const c5 = await cabecera(pg); const f5 = await filas(pg); const k5 = await controles(pg);
      const tabs5 = { con: await tab(pg, "Con línea"), sin: await tab(pg, "Sin línea"), todos: await tab(pg, "Todos"), otras: await tab(pg, "Otras (Empresas|facturas)") };
      if (!c5 || c5.txt !== c3.txt || f5.join() !== f3.join()) throw new Error(`apagar con el stream corrido no devolvió el tubo exacto: «${c3.txt}» [${f3.length} filas] → «${c5 && c5.txt}» [${f5.length} filas]; ids iguales=${f5.join() === f3.join()}`);
      if (JSON.stringify(tabs5) !== JSON.stringify(tabs3) || !(k5.start === 1 && k5.reiniciar === 1 && k5.inbound === 1)) throw new Error(`apagado tras el stream: pestañas ${JSON.stringify(tabs5)} vs ${JSON.stringify(tabs3)}; controles ${JSON.stringify(k5)}`);
      // ── 3 · el caso restaura lo que tocó: «Reiniciar» (resetStream) devuelve el tubo a «0 de 0». Sin esto el
      //      stream queda iniciado y pausado para el archivo e2e siguiente, que comparte la página del runner.
      await pg.locator("button", { hasText: /^\s*Reiniciar\s*$/ }).first().click();
      await pg.waitForFunction((re) => { const m = (document.body.innerText || "").match(re); return m && +m[1] === 0 && +m[2] === 0; }, RE_CAB.source, { timeout: 30000 }).catch(() => {});
      const c6 = await cabecera(pg); const f6 = await filas(pg);
      const tabs6 = { todos: await tab(pg, "Todos"), otras: await tab(pg, "Otras (Empresas|facturas)") };
      if (!c6 || c6.n !== 0 || c6.total !== 0 || f6.length !== 0 || tabs6.todos !== 0) throw new Error(`Reiniciar no devolvió el tubo a cero: «${c6 && c6.txt}», ${f6.length} filas, Todos ${tabs6.todos}`);
      det.push(`restaurado: «${c6.txt}» (0 filas, todos ${tabs6.todos}·otras ${tabs6.otras})`);
      det.push(`stream corrido: «${c3.txt}» (todos ${tabs3.todos}·otras ${tabs3.otras}, ${f3.length} filas, bandeja ${bandeja3}) → encendido «${c4.txt}» (con ${tabs4.con}·sin ${tabs4.sin}·todos ${tabs4.todos}·otras ${tabs4.otras}, ${f4.length} filas OP-DIR, 0 previas visibles, bandeja ${bandeja4}) → apagado «${c5.txt}», ${f5.length} filas idénticas en el mismo orden`);
      return det.join(" · ");
    } },
];
