/* Gate e2e de la regla 53: el tab de Verificación con la oferta SÓLO SIMULADA. Lo que la capa de
   contrato no puede ver, porque lee el fuente como texto y no monta nada:

   · que el tab APAREZCA al simular y no antes (las dos direcciones: con la oferta vacía no está);
   · que en ese estado no haya con qué firmar —ni «Registrar verificación» ni «El deudor no confirmó ·
     retirar»— y que el cartel lo diga;
   · que los criterios V00–V10 estén UNA vez, en el panel del DEUDOR, y que la fila de factura abra
     sólo el quiz telefónico, y sólo cuando hay llamada que mirar.

   **Los dos casos se miran con la sesión del EJECUTIVO DE VERIFICACIÓN (`EV`), y no es un detalle.**
   La primera versión de este caso afirmaba «no aparece el botón de registrar» con la sesión de la
   ejecutiva comercial, que NO puede firmar verificaciones nunca: la aserción pasaba con el defecto
   plantado —se midió— porque el botón faltaba por el permiso, no por la compuerta. Un caso así no
   vigila nada. Con `EV` el botón depende SÓLO de `informativo`, y por eso el caso B prueba la otra
   dirección sobre la misma pantalla: pre-evaluar abre la llamada y el botón aparece.

   Cada caso es AUTOCONTENIDO —enciende el Directorio, filtro «Todos», abre SU operación (A la 1ª, B
   la 2ª: la pre-evaluación del B se persiste y no debe contaminar al A) y en su `finally` cierra el
   detalle, apaga el Directorio y devuelve el filtro a «Con línea», que es la línea base de esta capa. */

const filas = (pagina) =>
  pagina.evaluate(() => [...document.querySelectorAll("tr.pl-row")].map((tr) => ((tr.innerText || "").match(/OP-DIR\d+/) || [])[0] || null));
const filtroRapido = async (pagina, rotulo) => {
  await pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo) }).first().click();
  await pagina.waitForTimeout(400);
};
async function prepararTubo(h) {
  await h.encenderDirectorio();
  await filtroRapido(h.pagina, "Todos");
  const ids = (await filas(h.pagina)).filter(Boolean);
  if (ids.length < 5) throw new Error(`el Directorio dejó ${ids.length} fila(s) OP-DIR con el filtro «Todos», se esperaban 5`);
  return ids;
}
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
/* Simula desde el panel de arranque del detalle. Deja la oferta con TODO lo disponible del cliente. */
async function simularEnDetalle(det) {
  const chip = det.locator("button").filter({ hasText: /Todo lo disponible/ }).first();
  if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque");
  await chip.click();
  await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
  await det.waitForTimeout(2500);
}
/* El selector de identidad del detalle (sólo demo). Cambiar a `EV` es lo que hace que el botón de
   firmar dependa de la COMPUERTA y no del permiso. */
async function cambiarSesion(det, code) {
  const sel = det.locator('select[title="Sesión de usuario (sólo demo)"]').first();
  if (!(await sel.count())) throw new Error("no encuentro el selector de sesión del detalle");
  await sel.selectOption(code);
  await det.waitForTimeout(1200);
}
/* Pre-evaluación: la puerta que abre la mesa de verificación sin esperar a publicar la oferta. La
   pide el ejecutivo comercial —no el EV— y avisa antes si hay excepciones sin comentario. */
async function preEvaluar(det) {
  const pe = det.locator("button").filter({ hasText: /^\s*Pre-evaluación\s*$/ }).first();
  if (!(await pe.count())) throw new Error("no encuentro el botón «Pre-evaluación» en el tab Negocio");
  await pe.click();
  await det.waitForTimeout(1500);
  const seguir = det.locator(".ovl button").filter({ hasText: /^\s*Enviar de todos modos\s*$/ }).first();
  if (await seguir.count()) {
    await seguir.click();
    await det.waitForTimeout(1500);
  }
}
/* Los botones de la barra de pestañas del detalle. El detalle es pestaña propia —no hay navbar— así
   que «Verificación» acá sólo puede ser la pestaña. El rótulo va con su badge («Otorgamiento\n37»),
   por eso se compara la PRIMERA línea. */
const pestanas = (det) =>
  det.evaluate(() =>
    [...document.querySelectorAll("button")]
      .map((b) => ((b.innerText || "").trim().split("\n")[0] || "").trim())
      .filter((t) => /^(Negocio|Mensajería|Otorgamiento|Verificación)$/.test(t)),
  );
const abrirTabVerif = async (det) => {
  await det.locator("button").filter({ hasText: /^\s*Verificación/ }).first().click();
  await det.waitForFunction(() => /criterios del predictor/i.test(document.body.innerText || ""), null, { timeout: 30000 });
  await det.waitForTimeout(600);
};
/* El panel del tab, no el documento entero: el detalle tiene otros bloques que hablan de deudores y
   de listas, y medir sobre `body.innerText` haría pasar o fallar el caso por texto ajeno. El
   CONTENEDOR del tab empieza con el mismo texto que su subtítulo y `querySelectorAll` lo devuelve
   antes, así que el subtítulo se identifica por no tener hijos. `innerText` es texto RENDERIZADO: los
   rótulos con la clase `uppercase` vuelven en MAYÚSCULA, y por eso se comparan sin distinguir caja. */
const panelVerif = (det) =>
  det.evaluate(() => {
    const marca = [...document.querySelectorAll("div")].find(
      (d) => !d.children.length && /^por deudor · criterios del predictor/i.test((d.innerText || "").trim()),
    );
    const cont = marca && marca.parentElement;
    return cont ? cont.innerText || "" : "";
  });
/* Cuántas filas de factura ofrecen quiz y cuántas no, por el `title` que las distingue. */
const filasFactura = (det) =>
  det.evaluate(() => ({
    conQuiz: document.querySelectorAll('[title="Ver el quiz de la verificación telefónica de este folio"]').length,
    sinQuiz: document.querySelectorAll('[title="Verificada por el modelo: no hay llamada que registrar"]').length,
  }));
const abrirPrimerQuiz = async (det) => {
  await det.locator('[title="Ver el quiz de la verificación telefónica de este folio"]').first().click();
  await det.waitForTimeout(500);
  return panelVerif(det);
};

export const casos = [
  {
    id: "e2e-53-a",
    titulo:
      "con la oferta SÓLO simulada el tab Verificación aparece (y con la oferta vacía no) en modo INFORMATIVO: cartel puesto, y ni siquiera el Ejecutivo de verificación puede registrar la llamada ni retirar la factura; el deudor va con «Nota Deudor» y sin «Lista Blanca», sus criterios están UNA vez en el panel del grupo y la fila de factura sólo abre el quiz",
    correr: async (h) => {
      let det = null;
      try {
        const ids = await prepararTubo(h);
        det = await abrirPorId(h, ids[0]);

        // ── LA OTRA DIRECCIÓN: sin oferta el tab no existe. Un caso que sólo mire «aparece al
        //    simular» pasaría también con el tab visible siempre.
        const antes = await pestanas(det);
        if (antes.includes("Verificación")) throw new Error(`el tab Verificación ya está antes de simular: pestañas ${JSON.stringify(antes)}`);

        await simularEnDetalle(det);
        const despues = await pestanas(det);
        if (!despues.includes("Verificación")) throw new Error(`el tab Verificación no apareció al simular: pestañas ${JSON.stringify(despues)}`);

        // La sesión que SÍ firma verificaciones: así el botón depende de la compuerta, no del permiso.
        await cambiarSesion(det, "EV");
        await abrirTabVerif(det);
        const panel = await panelVerif(det);
        if (!panel) throw new Error("no encuentro el panel del tab de Verificación");

        // ── 1 · MODO INFORMATIVO: el cartel está y nombra las dos mitades (qué trae hoy, qué lo abre).
        if (!/Informativo\./.test(panel)) throw new Error("no aparece el cartel del modo informativo");
        for (const frase of ["no se registra ninguna llamada", "pre-evaluar", "cerrar y publicar"])
          if (!panel.includes(frase)) throw new Error(`el cartel informativo no dice «${frase}»`);

        // ── 2 · LA PANTALLA NO NOMBRA LA LISTA INTERNA, y la nota va rotulada.
        if (/Lista Blanca|Autorizada/.test(panel)) throw new Error("el tab sigue nombrando «Lista Blanca»/«Autorizada» en vez del segmento Prime");
        if (!panel.includes("Nota Deudor")) throw new Error("la nota del deudor no va rotulada «Nota Deudor»");

        // ── 3 · LOS CRITERIOS SON DEL DEUDOR: cerrados no se ven, y se abren desde la CABECERA.
        if (/criterios del deudor/i.test(panel)) throw new Error("el panel de criterios del deudor arranca abierto");
        const cab = det.locator('[title="Ver los criterios V00–V10 y el veredicto de este deudor"]').first();
        if (!(await cab.count())) throw new Error("la cabecera del grupo no abre la evaluación del deudor");
        await cab.click();
        await det.waitForTimeout(400);
        const conCriterios = await panelVerif(det);
        if (!/criterios del deudor · par cliente-deudor \(3M\)/i.test(conCriterios)) throw new Error("abrir la cabecera no muestra los criterios del deudor");
        if (!/V0\d · /.test(conCriterios)) throw new Error("el panel del deudor no lista ningún criterio V0x");

        // ── 4 · EL QUIZ ES DE LA FACTURA, y sólo lo ofrece la que tiene llamada que mirar.
        const { conQuiz, sinQuiz } = await filasFactura(det);
        if (conQuiz + sinQuiz === 0) throw new Error("no hay filas de factura en el tab");
        const m = conCriterios.match(/(\d+) de (\d+) factura\(s\) requieren/);
        if (m && +m[1] !== conQuiz) throw new Error(`el cartel dice ${m[1]} factura(s) por verificar y hay ${conQuiz} fila(s) con quiz`);
        if (!m && conQuiz !== 0) throw new Error(`la operación quedó verificada por el modelo y aun así hay ${conQuiz} fila(s) con quiz`);
        if (!conQuiz) throw new Error("ninguna factura de esta operación requiere verificación: el caso no podría probar la compuerta");

        const conQuizAbierto = await abrirPrimerQuiz(det);
        for (const frase of [/verificación telefónica/i, /Existencia de la factura/, /Recepción conforme/, /Fecha de pago comprometida/])
          if (!frase.test(conQuizAbierto)) throw new Error(`la fila abierta no muestra ${frase}`);
        // …y NO repite los criterios: los tiene el deudor, una sola vez.
        const nCrit = (conQuizAbierto.match(/criterios del deudor · par cliente-deudor \(3M\)/gi) || []).length;
        if (nCrit !== 1) throw new Error(`los criterios del deudor aparecen ${nCrit} veces: tienen que estar UNA, en el panel del grupo`);
        // …y en informativo no hay con qué firmar. Es la mitad que de verdad protege la regla 6.
        for (const b of ["Registrar verificación", "El deudor no confirmó · retirar"])
          if (conQuizAbierto.includes(b))
            throw new Error(`el modo informativo ofrece «${b}» al Ejecutivo de verificación: la compuerta tiene que impedir firmar, no sólo informar`);

        return `${ids[0]} (sesión EV): tab ausente sin oferta → presente al simular · cartel informativo · ${conQuiz} fila(s) con quiz y ${sinQuiz} sin él · criterios del deudor 1× · quiz abierto sin botones de firma`;
      } finally {
        await restaurarTubo(h, det);
      }
    },
  },
  {
    id: "e2e-53-b",
    titulo:
      "la otra dirección sobre la MISMA pantalla: pre-evaluar abre la llamada — el cartel informativo desaparece y el Ejecutivo de verificación ya tiene «Registrar verificación» y «El deudor no confirmó · retirar» en el quiz de la factura",
    correr: async (h) => {
      let det = null;
      try {
        const ids = await prepararTubo(h);
        det = await abrirPorId(h, ids[1]);
        await simularEnDetalle(det);

        // Antes de pre-evaluar, con la MISMA sesión que va a firmar: informativo y sin botones.
        await cambiarSesion(det, "EV");
        await abrirTabVerif(det);
        const { conQuiz } = await filasFactura(det);
        if (!conQuiz) throw new Error("ninguna factura de esta operación requiere verificación: el caso no podría probar la compuerta");
        const informativo = await abrirPrimerQuiz(det);
        if (!/Informativo\./.test(informativo)) throw new Error("la oferta recién simulada no entró en modo informativo");
        if (/Registrar verificación/.test(informativo)) throw new Error("el modo informativo ya ofrece registrar la llamada");

        // La pre-evaluación la pide el EJECUTIVO COMERCIAL desde Negocio, no el EV.
        await cambiarSesion(det, "CR");
        await det.locator("button").filter({ hasText: /^\s*Negocio\s*$/ }).first().click();
        await det.waitForTimeout(800);
        await preEvaluar(det);

        await cambiarSesion(det, "EV");
        await abrirTabVerif(det);
        const accionable = await abrirPrimerQuiz(det);
        if (/Informativo\./.test(accionable)) throw new Error("tras pre-evaluar el tab sigue diciendo que es informativo");
        for (const b of ["Registrar verificación", "El deudor no confirmó · retirar"])
          if (!accionable.includes(b)) throw new Error(`tras pre-evaluar el Ejecutivo de verificación sigue sin «${b}»: la compuerta no se abrió`);

        return `${ids[1]} (sesión EV): informativo sin botones → pre-evaluado, cartel retirado y las dos acciones de firma disponibles`;
      } finally {
        await restaurarTubo(h, det);
      }
    },
  },
];
