/* Gate e2e de las reglas 76 y 77 (la revisión de Reportes del 23-09-2026) en la app REAL, con la sesión de la
   GERENCIA COMERCIAL (`GC`), que ve toda la cartera: la pestaña «Cliente» de Reportes no existe para un ejecutivo, y
   con su cartera sola las cifras cruzadas contra el Dashboard mirarían otro alcance.

   Lo que la suite y los gates de texto no pueden ver, porque no montan nada:
   · e2e-76 — que la PANTALLA dibuje la cartera medida: «Solo competencia» de Reportes › Cliente es la MISMA cifra que
     «Sólo otros» de la card «Operan con otros» del Dashboard (regla 16); el donut cuadra con sus dos montos y ya no es
     el 24 % escrito a mano; la desviación suma los que operan con Security y la brecha crítica tiene gente; ningún
     competidor es el tenant y la lista suma lo que el donut llama «Competencia»; el toggle «Share of Wallet» rotula
     porcentajes hasta 100; y en la OTRA dirección, acotar el alcance a un ejecutivo mueve el donut —las cifras fijas
     no se movían con nada—.
   · e2e-77 — que el Dashboard y Performance comercial digan lo MISMO para el mismo alcance y el mismo rango (el mes en
     curso, que es el preset por defecto del reporte): lo facturado, lo ganado y el SOW de deudores prime; que el KPI se
     llame «SOW deudores prime» y no el rótulo viejo; y que la participación frente al factoring target esté a la vista
     en las dos pantallas y en la columna «Vs target».

   Selectores por rótulo de texto, nunca por clases. Deja la app como la encontró: la sesión original, el alcance en
   «Todos los ejecutivos» y en «Gestión diaria». */

const SESION = 'select[title="Sesión de usuario (sólo demo)"]';
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
/* «M$677.823» → 677823 (millones de pesos, como la pantalla los redondea). */
const mm = (s) => {
  const m = String(s || "").match(/M\$\s*([\d.]+)/);
  return m ? +m[1].replace(/\./g, "") : NaN;
};
const pct = (s) => {
  const m = String(s || "").match(/(\d+)\s*%/);
  return m ? +m[1] : NaN;
};

/* La tarjeta cuyo rótulo es EXACTAMENTE `rotulo` (KpiStat de Reportes o DashCard del Dashboard): el valor es el
   elemento anterior al rótulo y el subtítulo el siguiente. Se compara `textContent`, que no pasa por el
   `text-transform: uppercase` del rótulo. `null` si no está. */
const tarjeta = (pagina, rotulo) =>
  pagina.evaluate((r) => {
    const el = [...document.querySelectorAll("div")].find((d) => d.childElementCount === 0 && (d.textContent || "").trim() === r);
    if (!el) return null;
    const card = el.closest(".rounded-2xl") || el.parentElement;
    return {
      valor: (el.previousElementSibling && el.previousElementSibling.textContent) || "",
      sub: (el.nextElementSibling && el.nextElementSibling.textContent) || "",
      card: (card && card.innerText) || "",
    };
  }, rotulo);

const pestana = async (pagina, rotulo) => {
  await pagina.locator("button", { hasText: new RegExp("^\\s*" + rotulo + "\\s*$") }).first().click();
  await pagina.waitForTimeout(1500);
};
const selectorEjecutivo = (pagina) => pagina.locator("select", { has: pagina.locator("option", { hasText: /^Todos los ejecutivos$/ }) }).first();

async function comoGerencia(h) {
  const antes = await h.pagina.locator(SESION).inputValue();
  if (antes !== "GC") {
    await h.pagina.selectOption(SESION, "GC");
    await h.pagina.waitForTimeout(1500);
  }
  return antes;
}
async function restaurar(h, sesion) {
  const sel = selectorEjecutivo(h.pagina);
  if (await sel.count()) await sel.selectOption("todos").catch(() => {});
  if (sesion && sesion !== "GC") await h.pagina.selectOption(SESION, sesion).catch(() => {});
  await h.irA("Gestión diaria").catch(() => {});
}

export const casos = [
  {
    id: "e2e-76",
    titulo:
      "Reportes › Cliente y SOW dibujan la cartera medida: «Solo competencia» = «Sólo otros» del Dashboard, el donut cuadra con sus montos, la desviación suma los que operan con Security con la brecha crítica medida, ningún competidor es el tenant y la lista suma la competencia del donut, el SOW semanal es un %, y el alcance mueve las cifras",
    correr: async (h) => {
      const p = h.pagina;
      const sesion = await comoGerencia(h);
      try {
        // El Dashboard: «Sólo otros» de la card «Operan con otros».
        await h.irA("Dashboard");
        await p.waitForTimeout(1500);
        const otros = await tarjeta(p, "Operan con otros");
        if (!otros) throw new Error("no encuentro la card «Operan con otros» del Dashboard");
        const soloOtros = +((norm(otros.card).match(/Sólo otros\s*(\d+)/) || [])[1] || NaN);
        // Reportes › Cliente.
        await h.irA("Reportes");
        await pestana(p, "Cliente");
        const comp = await tarjeta(p, "Solo competencia"),
          sec = await tarjeta(p, "Operan con Security");
        if (!comp || !sec) throw new Error("no encuentro los KPI «Solo competencia» / «Operan con Security» de Reportes › Cliente");
        const nComp = +norm(comp.valor).replace(/\./g, ""),
          nSec = +norm(sec.valor).replace(/\./g, "");
        if (!(nComp === soloOtros)) throw new Error(`«Solo competencia» dice ${nComp} y «Sólo otros» del Dashboard ${soloOtros}: tienen que ser el mismo conjunto (regla 16)`);
        const txt = norm(await h.texto(p));
        if (/\$616\.032 MM|\$1,93 B/.test(txt)) throw new Error("vuelven los montos escritos a mano del donut");
        const d = txt.match(/SoW Security Security (M\$[\d.]+) Competencia (M\$[\d.]+)/);
        const donutPct = pct((txt.match(/(\d+)% SoW Security/) || [])[0]);
        if (!d) throw new Error(`no encuentro los montos del donut en «${(txt.match(/Share of Wallet.{0,200}/) || [""])[0]}»`);
        const propio = mm(d[1]),
          ajeno = mm(d[2]);
        if (!(Math.abs(Math.round((propio / (propio + ajeno)) * 100) - donutPct) <= 1)) throw new Error(`el donut dice ${donutPct}% y sus montos dan ${Math.round((propio / (propio + ajeno)) * 100)}%`);
        if (/2025/.test(txt)) throw new Error("la pestaña Cliente vuelve a rotular una serie de 2025");
        // Reportes › SOW.
        await pestana(p, "SOW");
        const sow = norm(await h.texto(p));
        const n = (re) => +((sow.match(re) || [])[1] || NaN);
        const def = n(/Defendidos · SoW ≥ target (\d+)/),
          mod = n(/Brecha moderada · hasta \d+ pp bajo target (\d+)/),
          cri = n(/Brecha crítica · más de \d+ pp bajo target (\d+)/);
        if (!(def + mod + cri === nSec)) throw new Error(`la desviación suma ${def}+${mod}+${cri} y «Operan con Security» dice ${nSec}: es una partición`);
        if (!(cri > 0)) throw new Error("la brecha crítica vuelve a estar en 0 por construcción");
        const bloque = (sow.match(/Competidores capturando cartera(.*?)Tendencia semanal por zona/) || [])[1] || "";
        if (!bloque) throw new Error("no encuentro «Competidores capturando cartera» o la «Tendencia semanal por zona»");
        if (/BICE|Factoring Security/.test(bloque)) throw new Error(`el tenant aparece entre los competidores: «${bloque.slice(0, 160)}»`);
        const montos = [...bloque.matchAll(/M\$([\d.]+)/g)].map((m) => +m[1].replace(/\./g, ""));
        const suma = montos.reduce((s, x) => s + x, 0);
        if (!(montos.length > 1 && Math.abs(suma - ajeno) <= montos.length)) throw new Error(`los competidores suman M$${suma} y el donut llama «Competencia» a M$${ajeno}`);
        await pestana(p, "Share of Wallet");
        const ejes = await p.evaluate(() => [...document.querySelectorAll("svg text")].map((t) => t.textContent).filter((s) => /^\d+%$/.test(s)));
        if (!ejes.includes("100%") || ejes.some((s) => parseInt(s, 10) > 100)) throw new Error(`el eje del SOW semanal no es un porcentaje hasta 100: [${ejes.join(" ")}]`);
        // La otra dirección: el alcance mueve las cifras.
        const sel = selectorEjecutivo(p);
        const ejec = (await sel.locator("option").allInnerTexts()).filter((o) => o !== "Todos los ejecutivos")[0];
        await sel.selectOption({ label: ejec });
        await p.waitForTimeout(800);
        await pestana(p, "Cliente");
        const txt2 = norm(await h.texto(p));
        const d2 = txt2.match(/SoW Security Security (M\$[\d.]+) Competencia (M\$[\d.]+)/);
        if (!d2 || !(mm(d2[1]) < propio)) throw new Error(`con el alcance en ${ejec} el donut no se movió (${d2 ? d2[1] : "—"} vs ${d[1]})`);
        return `«Solo competencia» ${nComp} = «Sólo otros» ${soloOtros} · donut ${donutPct}% (${d[1]} / ${d[2]}) · desviación ${def}/${mod}/${cri} de ${nSec} · ${montos.length} competidores suman M$${suma} ≈ ${d[2]}, sin el tenant · eje SOW hasta 100% · alcance ${ejec}: ${d2[1]}`;
      } finally {
        await restaurar(h, sesion);
      }
    },
  },
  {
    id: "e2e-77",
    titulo:
      "el Dashboard y Performance comercial dicen lo mismo del mes en curso —facturado del A1, ganado y SOW de deudores prime—, el KPI se llama «SOW deudores prime» y la participación frente al factoring target está a la vista en las dos pantallas",
    correr: async (h) => {
      const p = h.pagina;
      const sesion = await comoGerencia(h);
      try {
        await h.irA("Dashboard");
        await p.waitForTimeout(1500);
        const fac = await tarjeta(p, "Facturas emitidas"),
          gan = await tarjeta(p, "Cedido a Security"),
          sow = await tarjeta(p, "SOW");
        if (!fac || !gan || !sow) throw new Error("no encuentro las cards «Facturas emitidas» / «Cedido a Security» / «SOW» del Dashboard");
        if (!/frente a/.test(gan.sub)) throw new Error(`la card «Cedido a Security» no muestra la participación frente al factoring target: «${gan.sub}»`);
        const primeDash = pct((norm(sow.sub).match(/(\d+)% en deudores prime/) || [])[0]);
        await h.irA("Reportes");
        await pestana(p, "Performance comercial");
        const kFac = await tarjeta(p, "Facturas de buenos deudores"),
          kGan = await tarjeta(p, "Ganado (Security)"),
          kPrime = await tarjeta(p, "SOW deudores prime");
        if (!kFac || !kGan) throw new Error("no encuentro los KPI de Performance comercial");
        if (!kPrime) throw new Error("no existe el KPI «SOW deudores prime» en Performance comercial");
        if (await tarjeta(p, "SOW Target Deudores Prime")) throw new Error("vuelve el rótulo «SOW Target Deudores Prime»");
        const iguales = [
          ["lo facturado", mm(fac.valor), mm(kFac.valor)],
          ["lo ganado", mm(gan.valor), mm(kGan.valor)],
          ["el SOW de deudores prime", primeDash, pct(kPrime.valor)],
        ];
        for (const [que, a, b] of iguales)
          if (!(Number.isFinite(a) && a === b)) throw new Error(`${que}: el Dashboard dice ${a} y Performance comercial ${b} para el mismo mes y el mismo alcance`);
        if (!/frente a/.test(kGan.sub)) throw new Error(`el KPI «Ganado (Security)» no muestra la participación frente al factoring target: «${kGan.sub}»`);
        const txt = norm(await h.texto(p));
        if (!/Vs target/.test(txt)) throw new Error("la tabla de Performance comercial no trae la columna «Vs target»");
        return `facturado M$${mm(fac.valor)} · ganado M$${mm(gan.valor)} · SOW prime ${primeDash}% en las dos pantallas · «${norm(kGan.sub)}» · columna «Vs target»`;
      } finally {
        await restaurar(h, sesion);
      }
    },
  },
];
