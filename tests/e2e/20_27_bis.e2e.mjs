/* Gate e2e de la regla 27-bis en la app REAL: la navbar dice «Gestión diaria» y «Reportes» (y no «Tubo
   diario» ni «Gestión» a secas); la miga repite el rótulo del botón —es la ruta del menú—; el <h1> de
   Gestión diaria dice «Gestión diaria comercial» y el de Reportes se LEE y se reporta (desfase anotado);
   y el Command-K (Ctrl+K) ofrece «Reportes» en su grupo «Ir a» y navega al hacer CLIC en ese ítem (no con
   Enter sobre el primero de la lista, que sería otro ítem si un cliente o una oportunidad coincidiera),
   mientras «Tubo diario» no encuentra nada. Sin esperas fijas: se espera la miga de la vista destino y el
   cierre de la paleta. Deja la app como la encontró: paleta cerrada y en «Gestión diaria». */
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const PLACEHOLDER = "Buscar oportunidad, cliente o vista…";

/* La miga es el div «Comercial › X»: un nodo de texto «Comercial», el chevron (SVG sin texto) y el rótulo.
   Se localiza por esa forma, no por clases, y se devuelve normalizada («Comercial Reportes») o "". */
const MIGA_JS = `(() => {
  const d = [...document.querySelectorAll("div")].find((x) => x.querySelector(":scope > svg")
    && [...x.childNodes].some((n) => n.nodeType === 3 && /^\\s*Comercial\\s*$/.test(n.textContent)));
  return d ? d.textContent.replace(/\\s+/g, " ").trim() : "";
})()`;
const miga = (p) => p.evaluate(MIGA_JS);
const esperarMiga = (p, rot) => p.waitForFunction(`${MIGA_JS} === ${JSON.stringify("Comercial " + rot)}`, null, { timeout: 15000 });
const h1 = async (p) => norm(await p.locator("h1").first().innerText());

/* Abre la paleta con Ctrl+K y escribe `q`. Devuelve el input, el panel (el ancestro más cercano del input que
   también contiene la lista —botones— o el aviso «Sin resultados»: por forma, no por clase) y los ítems del
   grupo «Ir a»: los botones cuyo encabezado de grupo más cercano dice «Ir a». */
async function abrirCommandK(p, q) {
  await p.keyboard.press("Control+k");
  const input = p.getByPlaceholder(PLACEHOLDER);
  await input.waitFor({ timeout: 5000 });
  await input.fill(q);
  const paleta = input.locator('xpath=ancestor::div[.//button or contains(., "Sin resultados para")][1]');
  await paleta.waitFor({ timeout: 5000 });
  const irA = paleta.locator('xpath=.//button[preceding-sibling::div[1][normalize-space(.)="Ir a"]]');
  const grupos = paleta.locator('xpath=.//div[normalize-space(.)="Ir a"]');
  return { input, paleta, irA, grupos, textoPaleta: norm(await paleta.innerText()), items: (await irA.allInnerTexts()).map(norm) };
}
const paletaCerrada = (input) => input.waitFor({ state: "detached", timeout: 5000 });

export const casos = [
  { id: "e2e-27-bis", titulo: "los rótulos del menú: navbar «Gestión diaria»/«Reportes», la miga repite el botón, el h1 de Gestión diaria; Ctrl+K ofrece «Reportes» en «Ir a» y el clic navega; «Tubo diario» no existe",
    correr: async (h) => {
      const p = h.pagina;
      try {
        const botones = (await p.locator("header nav button").allInnerTexts()).map(norm).filter(Boolean);
        if (!botones.includes("Gestión diaria")) throw new Error(`la navbar no tiene «Gestión diaria»: [${botones.join(" · ")}]`);
        if (!botones.includes("Reportes")) throw new Error(`la navbar no tiene «Reportes»: [${botones.join(" · ")}]`);
        if (botones.includes("Tubo diario") || botones.includes("Gestión")) throw new Error(`la navbar trae un rótulo viejo: [${botones.join(" · ")}]`);

        // Gestión diaria por el BOTÓN: miga y h1.
        await h.irA("Gestión diaria");
        await esperarMiga(p, "Gestión diaria").catch(() => {});
        const migaGD = await miga(p), h1GD = await h1(p);
        if (migaGD !== "Comercial Gestión diaria") throw new Error(`la miga de Gestión diaria dice «${migaGD}» y no «Comercial Gestión diaria»`);
        if (h1GD !== "Gestión diaria comercial") throw new Error(`el h1 de Gestión diaria dice «${h1GD}»`);

        // Reportes por el BOTÓN: la miga repite el rótulo; el h1 se reporta (desfase anotado).
        await h.irA("Reportes");
        await esperarMiga(p, "Reportes").catch(() => {});
        const migaR = await miga(p), h1R = await h1(p);
        if (migaR !== "Comercial Reportes") throw new Error(`la miga de Reportes dice «${migaR}» y no «Comercial Reportes»`);
        if (h1R === "Gestión" || h1R === "Tubo diario") throw new Error(`el h1 de Reportes volvió a un nombre viejo: «${h1R}»`);
        const notaH1 = h1R === "Reportes" ? "h1 «Reportes»" : `h1 «${h1R}» (desfase anotado en la regla: no dice «Reportes»)`;

        // Command-K desde Gestión diaria (para que el cambio de miga sea observable): «Reportes» aparece en el
        // grupo «Ir a», el CLIC sobre ese ítem navega y cierra la paleta.
        await h.irA("Gestión diaria");
        await esperarMiga(p, "Gestión diaria");
        const k1 = await abrirCommandK(p, "Reportes");
        if (!k1.items.includes("Reportes")) throw new Error(`Ctrl+K «Reportes» no ofrece la vista en «Ir a»: [${k1.items.join(" · ")}] · «${k1.textoPaleta.slice(0, 120)}»`);
        await k1.irA.filter({ hasText: /^Reportes$/ }).first().click();
        await esperarMiga(p, "Reportes");
        await paletaCerrada(k1.input);
        const migaK = await miga(p);

        // «gestión» ofrece SÓLO «Gestión diaria» (no «Gestión» a secas, el rótulo viejo de Reportes) y el clic vuelve al tubo.
        const k2 = await abrirCommandK(p, "gestión");
        if (k2.items.some((t) => t === "Gestión") || !k2.items.includes("Gestión diaria")) throw new Error(`Ctrl+K «gestión» ofrece en «Ir a» [${k2.items.join(" · ")}]`);
        await k2.irA.filter({ hasText: /^Gestión diaria$/ }).first().click();
        await esperarMiga(p, "Gestión diaria");
        await paletaCerrada(k2.input);
        const migaK2 = await miga(p);

        // SONDA · dirección negativa: el nombre viejo no encuentra ninguna vista (ni grupo «Ir a» ni ítems) y la paleta lo dice.
        const k3 = await abrirCommandK(p, "Tubo diario");
        const nGrupos = await k3.grupos.count(), nItems = k3.items.length;
        const sinRes = /Sin resultados para «Tubo diario»/.test(k3.textoPaleta);
        await p.keyboard.press("Escape");
        await paletaCerrada(k3.input);
        if (nGrupos || nItems || !sinRes) throw new Error(`Ctrl+K «Tubo diario» todavía encuentra algo (grupos «Ir a» ${nGrupos}, ítems ${nItems}): «${k3.textoPaleta.slice(0, 160)}»`);

        return `navbar [${botones.join(" · ")}] · Gestión diaria: miga «${migaGD}», h1 «${h1GD}» · Reportes: miga «${migaR}», ${notaH1} · Ctrl+K «Reportes» → Ir a [${k1.items.join(",")}] + clic → miga «${migaK}», paleta cerrada · «gestión» → [${k2.items.join(",")}] + clic → «${migaK2}» · sonda «Tubo diario» → Sin resultados ${sinRes}, grupos «Ir a» ${nGrupos}`;
      } finally {
        // Estado de partida para el siguiente caso: paleta cerrada y en «Gestión diaria».
        await p.keyboard.press("Escape").catch(() => {});
        await p.getByPlaceholder(PLACEHOLDER).waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
        await h.irA("Gestión diaria").catch(() => {});
      }
    } },
];
