/* Gate e2e de la regla 82: el encabezado del detalle NO cambia de alto al cambiar de tab, y la barra de scroll de la
   pestaña tiene su canal reservado. Reportado por el usuario el 24-09-2026 («cuando te cambias de tab Negocio,
   Otorgamiento se producen unos saltos en la estructura de la página»). Medido en el detalle real: en Negocio la fila
   de tabs medía 48 px —el botón «Pre-evaluación» la estiraba— y en Otorgamiento 31 px, así que el cuerpo empezaba
   17 px más arriba; y la barra de scroll aparecía o no según el largo del tab, corriendo el ancho ~17 px.
     · e2e-82-a: para cada tab de la tira, el alto del encabezado pegajoso y el `top` del cuerpo son LOS MISMOS, y
       `scrollbar-gutter` del documento es `stable`.
   Selectores por texto; nada por clases. */
export const casos = [
  { id: "e2e-82-a", titulo: "cambiar de tab en el detalle no mueve el cuerpo: el encabezado mide lo mismo en todos y el canal de la barra de scroll queda reservado",
    correr: async (h) => {
      await h.encenderDirectorio();
      const det = await h.abrirDetalle(0);
      const rotulos = await det.evaluate(() => {
        const neg = [...document.querySelectorAll("button")].find((b) => /^\s*Negocio\b/.test(b.innerText || ""));
        if (!neg) return [];
        return [...neg.parentElement.querySelectorAll("button")].map((b) => (b.innerText || "").split("\n")[0].replace(/\s+\d+$/, "").trim()).filter(Boolean);
      });
      if (rotulos.length < 2) throw new Error(`la tira de tabs trae ${rotulos.length} tab(s): no hay nada que comparar (${rotulos.join(", ")})`);
      const fotos = [];
      for (const r of [...rotulos, rotulos[0]]) {
        await det.locator("button", { hasText: new RegExp("^\\s*" + r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b") }).first().click();
        await det.waitForTimeout(500);
        fotos.push(await det.evaluate((r) => {
          const neg = [...document.querySelectorAll("button")].find((b) => /^\s*Negocio\b/.test(b.innerText || ""));
          const fila = neg.parentElement.parentElement;
          const cabecera = fila.parentElement;
          const cuerpo = cabecera.nextElementSibling;
          return { tab: r, fila: Math.round(fila.getBoundingClientRect().height), cabecera: Math.round(cabecera.getBoundingClientRect().height),
                   cuerpoTop: Math.round(cuerpo.getBoundingClientRect().top), gutter: getComputedStyle(document.documentElement).scrollbarGutter };
        }, r));
      }
      const alturas = new Set(fotos.map((f) => f.cabecera));
      const tops = new Set(fotos.map((f) => f.cuerpoTop));
      const gutter = fotos.every((f) => f.gutter === "stable");
      const det2 = fotos.map((f) => `${f.tab}: fila ${f.fila} · cabecera ${f.cabecera} · cuerpo en ${f.cuerpoTop}`).join(" | ");
      if (alturas.size !== 1 || tops.size !== 1) throw new Error(`el encabezado cambia de alto entre tabs: ${det2}`);
      if (!gutter) throw new Error(`scrollbar-gutter no es «stable» en la pestaña del detalle (${fotos[0].gutter || "—"})`);
      return `${rotulos.length} tab(s) · ${det2} · gutter stable`;
    } },
];
