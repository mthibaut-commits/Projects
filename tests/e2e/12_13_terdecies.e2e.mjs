/* Gate e2e de la regla 13-terdecies: la LÍNEA GENERAL DEL CLIENTE va en la cabecera del detalle —el MISMO
   indicador de la columna «Línea» del tubo— y se mueve con la simulación. Se abre una operación del
   Directorio sin simular: la cabecera dice lo mismo que la celda del tubo (aprobada · utilizada · disponible)
   y NO dibuja «queda». Se simula desde el detalle: la cabecera pasa a «queda M$X» con X = disponible − monto
   de la oferta, «Disponible» no se mueve, y el tubo —que se entera por `nex-simulado`— sigue mostrando el
   ESTADO de la línea sin «queda» (la dirección que ya se probó y se revirtió). Se elimina la simulación: el
   tramo desaparece. Las dos direcciones del gate por `simulado` quedan ejercitadas en la pantalla real.
   Y su SITIO: a la altura del nombre del cliente y a su derecha, con el selector de sesión en la fila de
   arriba y sin el stepper «Etapa N de M» que la regla retiró (vive bajo `!fullPage`, que el detalle no usa). */

const num = (s) => { // «M$1.840» → 1840 · «M$761,2» → 761.2 · «$950.000» → 0.95 (todo en millones)
  if (!s) return null;
  if (s.startsWith("M$")) return parseFloat(s.slice(2).replace(/\./g, "").replace(",", "."));
  return parseFloat(s.slice(1).replace(/\./g, "")) / 1e6;
};
const leerIndicador = (pag, dentroDe) => pag.evaluate((sel) => {
  const raiz = sel ? document.querySelector(sel) : document;
  const els = raiz ? [...raiz.querySelectorAll('div[title^="Línea aprobada"]')] : [];
  return els.map((el) => {
    const t = el.getAttribute("title") || "";
    const g = (re) => (t.match(re) || [])[1] || null;
    return { title: t, texto: (el.innerText || "").replace(/\s+/g, " ").trim(), ancho: el.style.width,
      aprobada: g(/Línea aprobada (M?\$[\d.,]+)/), utilizada: g(/utilizada (M?\$[\d.,]+)/), disponible: g(/disponible (M?\$[\d.,]+)/),
      operacion: g(/esta operación (M?\$[\d.,]+)/), quedarian: g(/quedarían (M?\$[\d.,]+)/) };
  });
}, dentroDe || null);
const celdaTubo = async (pagina, id) => {
  const filas = await pagina.evaluate((id) => {
    const tr = [...document.querySelectorAll("tr.pl-row")].find((r) => (r.innerText || "").includes(id));
    if (!tr) return null; tr.setAttribute("data-e2e", "fila-13t"); return true;
  }, id);
  if (!filas) throw new Error(`no encuentro la fila ${id} en el tubo`);
  const v = await leerIndicador(pagina, 'tr[data-e2e="fila-13t"]');
  await pagina.evaluate(() => document.querySelector('tr[data-e2e="fila-13t"]')?.removeAttribute("data-e2e"));
  if (v.length !== 1) throw new Error(`la fila ${id} tiene ${v.length} indicadores de línea (esperaba 1)`);
  return v[0];
};
/* Apaga el Directorio SÓLO si está encendido (el toggle dice «Directorio · N»): lo hace `h.apagarDirectorio()`
   del harness; si el harness no lo trae, se mira el rótulo antes de tocar el toggle. Así un fallo de
   `encenderDirectorio()` no deja al `finally` ENCENDIÉNDOLO y contaminando el archivo siguiente. */
const apagarDirectorio = async (h) => {
  if (h.apagarDirectorio) return h.apagarDirectorio();
  const encendido = h.pagina.locator("button", { hasText: /^\s*Directorio\s*·\s*\d+\s*$/ }).first();
  if (!(await encendido.count())) return;
  await encendido.click();
  await h.pagina.waitForFunction(() => !/Directorio\s*·\s*\d+/.test(document.body.innerText || ""), null, { timeout: 60000 }).catch(() => {});
};

export const casos = [
  { id: "e2e-13-terdecies", titulo: "la línea general del cliente va en la cabecera del detalle —a la altura del nombre, sin el stepper de etapas— con las mismas cifras que la columna «Línea» del tubo; «queda» aparece al simular, se va al eliminar la simulación, y el tubo nunca lo dibuja",
    correr: async (h) => {
      let det = null;
      try {
        await h.encenderDirectorio();
        const id = await h.pagina.evaluate(() => ((document.querySelector("tr.pl-row")?.innerText || "").match(/OP-DIR\d+/) || [])[0] || null);
        if (!id) throw new Error("la primera fila del Directorio no trae id OP-DIR…");
        const tubo0 = await celdaTubo(h.pagina, id);
        if (!tubo0.aprobada || !tubo0.disponible) throw new Error("la celda «Línea» del tubo no trae aprobada/disponible: " + JSON.stringify(tubo0));
        if (/queda|excede/.test(tubo0.texto) || tubo0.quedarian) throw new Error("el tubo dibuja el tramo de la operación antes de nada: " + tubo0.texto);
        det = await h.abrirDetalle(0);
        const sinSim = await det.evaluate(() => /Sin simular|¿Qué facturas quieres incluir/i.test(document.body.innerText || ""));
        // CABECERA ANTES DE SIMULAR: el mismo indicador (ancho 260, UNA sola instancia) y las mismas cifras que el tubo, sin «queda».
        const cab0s = await leerIndicador(det);
        if (cab0s.length !== 1) throw new Error(`el detalle tiene ${cab0s.length} indicadores «Línea aprobada…» (esperaba 1, el de la cabecera)`);
        const cab0 = cab0s[0];
        if (cab0.ancho !== "260px") throw new Error("el indicador de la cabecera no mide 260 px: " + cab0.ancho);
        const mismas = (a, b) => a.aprobada === b.aprobada && a.utilizada === b.utilizada && a.disponible === b.disponible;
        if (!mismas(cab0, tubo0)) throw new Error(`la cabecera y el tubo no dicen lo mismo: cabecera ${cab0.title} · tubo ${tubo0.title}`);
        if (/queda|excede/.test(cab0.texto) || cab0.quedarian) throw new Error("la cabecera dibuja «queda» ANTES de simular: " + cab0.texto);
        // SU SITIO (primera frase de la regla y última viñeta): a la altura del NOMBRE del cliente y a su derecha, el
        // selector de sesión en la fila de arriba, y sin el stepper «Etapa N de M» (sólo existe bajo `!fullPage`).
        const sitio = await det.evaluate(() => {
          const ind = document.querySelector('div[title^="Línea aprobada"]');
          const fila = ind && ind.parentElement && ind.parentElement.parentElement;
          const h1 = fila && fila.querySelector("h1");
          if (!h1) return { error: "el indicador no comparte fila con el <h1> del nombre del cliente" };
          const r = (e) => e.getBoundingClientRect(); const I = r(ind), H = r(h1);
          const sel = document.querySelector('div[title^="Sólo demo: cambia la identidad"]');
          return { nombre: (h1.innerText || "").trim(), mismaFila: I.top < H.bottom && I.bottom > H.top, aLaDerecha: I.left >= H.right,
            selectorArriba: sel ? r(sel).bottom <= H.top + 1 : null, stepper: /Etapa \d+ de \d+/.test(document.body.innerText || "") };
        });
        if (sitio.error) throw new Error(sitio.error);
        if (!sitio.mismaFila || !sitio.aLaDerecha) throw new Error(`el indicador no está a la altura del nombre «${sitio.nombre}» y a su derecha (misma fila ${sitio.mismaFila}, a la derecha ${sitio.aLaDerecha})`);
        if (sitio.selectorArriba === null) throw new Error("no encuentro el selector de sesión en la cabecera del detalle");
        if (!sitio.selectorArriba) throw new Error("el selector de sesión no subió a la fila de arriba del nombre");
        if (sitio.stepper) throw new Error("la cabecera del detalle sigue mostrando el stepper «Etapa N de M» que la regla retiró");
        // SIMULAR desde el detalle (como capturar_tabla_simulada.mjs): «Todo lo disponible».
        const chip = det.locator("button").filter({ hasText: /Todo lo disponible|Todas las Prime/ }).first();
        if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque (¿la operación ya venía simulada?)");
        await chip.click();
        await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
        await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
        await det.waitForFunction(() => [...document.querySelectorAll('div[title^="Línea aprobada"]')].some((el) => /quedarían/.test(el.getAttribute("title") || "")), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras simular, la cabecera no muestra «quedarían»/«queda»: el indicador no se mueve con la simulación"); });
        // Lo que se lee después ya está en el DOM cuando la oferta muestra su «Total oferta $N» y no queda «simulando».
        await det.waitForFunction(() => /Total oferta[\s\S]{0,120}?\$[\d.]{5,}/.test(document.body.innerText || "") && !/simulando/i.test(document.body.innerText || ""), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras simular no aparece el «Total oferta $N» de la oferta armada"); });
        const cab1 = (await leerIndicador(det))[0];
        // «queda» = disponible − esta operación, calculado sobre lo que el propio tooltip declara; «Disponible» NO se movió.
        const esperado = num(cab1.disponible) - num(cab1.operacion);
        const quedaTexto = (cab1.texto.match(/queda (M?\$[\d.,]+)|excede por (M?\$[\d.,]+)/) || []);
        const quedaNum = quedaTexto[1] ? num(quedaTexto[1]) : quedaTexto[2] ? -num(quedaTexto[2]) : null;
        if (quedaNum == null) throw new Error("la cabecera simulada no dice «queda M$X» ni «excede por M$X»: " + cab1.texto);
        if (Math.abs(quedaNum - esperado) > 0.15) throw new Error(`queda ${quedaNum} ≠ disponible ${num(cab1.disponible)} − operación ${num(cab1.operacion)} = ${esperado.toFixed(1)}`);
        if (Math.abs(num(cab1.quedarian) - quedaNum) > 0.15) throw new Error(`el tooltip dice quedarían ${cab1.quedarian} y el texto ${quedaNum}`);
        if (!mismas(cab1, cab0)) throw new Error(`simular movió aprobada/utilizada/disponible: antes ${cab0.title} · después ${cab1.title}`);
        // La operación que el indicador descuenta es la OFERTA que se acaba de armar (el «Total oferta» en pesos, regla 29).
        const totalOf = await det.evaluate(() => ((document.body.innerText || "").match(/Total oferta[\s\S]{0,120}?\$([\d.]{5,})/) || [])[1] || null);
        if (totalOf == null) throw new Error("no encuentro el «Total oferta $N» de la oferta en el detalle");
        const totalOfMM = totalOf ? parseFloat(totalOf.replace(/\./g, "")) / 1e6 : null;
        if (Math.abs(totalOfMM - num(cab1.operacion)) > 0.15) throw new Error(`«esta operación» ${cab1.operacion} ≠ Total oferta ${totalOf}`);
        // EL TUBO se enteró por nex-simulado (la fila deja de decir «Sin simular») y su celda sigue mostrando el ESTADO: sin «queda», mismas cifras.
        await h.pagina.waitForFunction((id) => [...document.querySelectorAll("tr.pl-row")].some((tr) => (tr.innerText || "").includes(id) && !/Sin simular/.test(tr.innerText || "")), id, { timeout: 30000 })
          .catch(() => { throw new Error("el tubo no se enteró de la simulación (la fila sigue en «Sin simular»)"); });
        const tubo1 = await celdaTubo(h.pagina, id);
        if (/queda|excede/.test(tubo1.texto) || tubo1.quedarian || tubo1.operacion) throw new Error("con la operación simulada el tubo dibuja el tramo de la operación: " + tubo1.title);
        if (!mismas(tubo1, cab1)) throw new Error(`tras simular, tubo y cabecera difieren: tubo ${tubo1.title} · cabecera ${cab1.title}`);
        if (tubo1.ancho !== "122px") throw new Error("la celda del tubo no mide 122 px: " + tubo1.ancho);
        // ELIMINAR LA SIMULACIÓN (13-quaterdecies): el tramo desaparece — se mueve con la simulación en las dos direcciones.
        await det.locator("button", { hasText: /^\s*Opciones\s*$/ }).first().click();
        const item = det.locator("button", { hasText: /Eliminar la simulación y vaciar la oferta/ }).first();
        await item.waitFor({ state: "visible", timeout: 10000 }).catch(() => { throw new Error("no aparece «Eliminar la simulación y vaciar la oferta» en Opciones"); });
        await item.click();
        const confirmar = det.getByRole("button", { name: "Eliminar la simulación", exact: true });
        await confirmar.waitFor({ state: "visible", timeout: 10000 }).catch(() => { throw new Error("el ítem no abrió el ConfirmDialog «¿Eliminar la simulación y partir de cero?»"); });
        await confirmar.click();
        await det.waitForFunction(() => [...document.querySelectorAll('div[title^="Línea aprobada"]')].every((el) => !/quedarían/.test(el.getAttribute("title") || "")), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras eliminar la simulación la cabecera sigue diciendo «quedarían»"); });
        // La oferta vacía trae de vuelta el panel de arranque: ahí ya está pintado el estado de entrada entero.
        await det.waitForFunction(() => /¿Qué facturas quieres incluir en la oferta\?/.test(document.body.innerText || ""), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras eliminar la simulación el detalle no vuelve al panel de arranque «¿Qué facturas quieres incluir en la oferta?»"); });
        const cab2 = (await leerIndicador(det))[0];
        if (/queda|excede/.test(cab2.texto)) throw new Error("tras eliminar la simulación la cabecera sigue con «queda»: " + cab2.texto);
        if (!mismas(cab2, cab0)) throw new Error(`eliminar la simulación movió las cifras: ${cab2.title}`);
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        return `${id} (${sinSim ? "sin simular" : "?"}) · tubo «${tubo0.texto}» = cabecera «${cab0.texto}» (a la altura de «${sitio.nombre}», selector arriba, sin stepper) · simulada → «${cab1.texto}» (queda ${quedaNum} = ${num(cab1.disponible)} − ${num(cab1.operacion)}; Total oferta $${totalOf} = M$${totalOfMM.toFixed(1)}) · tubo tras simular «${tubo1.texto}» sin queda · eliminada → «${cab2.texto}»`;
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h);
      }
    } },
];
