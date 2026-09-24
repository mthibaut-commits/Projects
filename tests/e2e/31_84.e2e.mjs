/* Gate e2e de la regla 84: la fila del tubo y el arranque del detalle cuentan LA MISMA oportunidad. Reportado por el
   usuario el 24-09-2026: «en la lista de oportunidades aparecen 3 deudores · 3 facturas, pero al entrar al detalle
   aparecen muchas más», «no puede ser otra fuente si la pantalla de detalle es el detalle de la línea de la tabla». La
   fila leía la oferta más `facturasDisponibles` y el detalle le sumaba el libro del cliente: 3 contra 23.
     · e2e-84-a: el `title` de la columna Oportunidad de la fila 0 («La OPORTUNIDAD reúne N deudor(es) y M factura(s) por
       X») y el chip «Todo lo disponible · M fact. · X» del arranque del detalle de esa misma fila dicen el mismo M y la
       misma X.
   Selectores por texto y por `title`; nada por clases. */
export const casos = [
  { id: "e2e-84-a", titulo: "la fila del tubo y el arranque del detalle cuentan la misma oportunidad: mismas facturas y mismo monto en «Todo lo disponible»",
    correr: async (h) => {
      await h.encenderDirectorio();
      await h.pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: /^\s*Todos/ }).first().click();
      await h.pagina.waitForTimeout(400);
      const fila = await h.pagina.evaluate(() => {
        const tr = document.querySelector("tr.pl-row");
        if (!tr) return null;
        const el = [...tr.querySelectorAll("[title]")].find((x) => /^La OPORTUNIDAD reúne/.test(x.getAttribute("title") || ""));
        const m = el && (el.getAttribute("title") || "").match(/reúne (\d+) deudor\(es\) y (\d+) factura\(s\) por (M\$[\d.,]+)/);
        return { id: ((tr.innerText || "").match(/OP-DIR\d+/) || [])[0] || null, deudores: m ? +m[1] : null, facturas: m ? +m[2] : null, monto: m ? m[3] : null, title: el ? el.getAttribute("title").slice(0, 120) : null };
      });
      if (!fila || fila.facturas == null) throw new Error(`no pude leer la oportunidad de la fila 0 del tubo (${JSON.stringify(fila)})`);
      const det = await h.abrirDetalle(0);
      const idDet = await det.evaluate(() => (document.body.innerText.match(/OP-DIR\d+/) || [])[0] || null);
      if (idDet !== fila.id) throw new Error(`el detalle abrió ${idDet} y la fila era ${fila.id}`);
      const chip = await det.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /Todo lo disponible/.test(x.innerText || ""));
        const m = b && (b.innerText || "").replace(/\s+/g, " ").match(/Todo lo disponible · (\d+) fact\. · (M\$[\d.,]+)/);
        return m ? { facturas: +m[1], monto: m[2] } : null;
      });
      if (!chip) throw new Error("no encuentro el chip «Todo lo disponible · N fact. · M$X» en el arranque del detalle");
      if (chip.facturas !== fila.facturas || chip.monto !== fila.monto)
        throw new Error(`no coinciden: el tubo dice ${fila.facturas} facturas por ${fila.monto} y el detalle «Todo lo disponible · ${chip.facturas} fact. · ${chip.monto}»`);
      return `${fila.id}: tubo ${fila.deudores} deudores · ${fila.facturas} facturas · ${fila.monto} = detalle «Todo lo disponible · ${chip.facturas} fact. · ${chip.monto}»`;
    } },
];
