/* Gate e2e de la regla 13-octies-bis: «Documentos en la oferta» ofrece la MISMA elección de vista que
   «Documentos disponibles» (Por deudor / Por factura), la plana trae EXACTAMENTE lo mismo que los
   acordeones y agrega RUT deudor + razón social; el segmentado sólo aparece con la oferta NO vacía; y el
   estado VACÍO se ve (caja #EDECF3, borde #DEDCE7, 72 px, texto t11 medium en C.sub). Todo vive en el
   JSX de `DealDrawer` —estado de React, sin función expuesta salvo `facturasDeDeudores`, que ya fija el
   caso 98—, así que se ejercita el detalle real con el Modo Directorio.
   Dos direcciones: con oferta llena el segmentado ESTÁ y la caja NO; con oferta vacía la caja ESTÁ y el
   segmentado NO. Sonda del verificador de la caja: se plantan cinco elementos que el verificador tiene
   que rechazar —el estilo VIEJO (#F7F7FA / C.faint), y cuatro copias de la caja real con UN solo desvío
   cada una: fondo #F7F7FA, visibility:hidden, opacity:0 y fuera del documento— y para cada copia se exige
   que objete exactamente ese desvío; si el verificador aceptara cualquier cosa, el PASA no afirmaría nada.
   Medido en la corrida 2: las operaciones del Directorio NACEN con la oferta vacía («la corrida ya no la
   propone», 13-quaterdecies), así que el estado de entrada ES el vacío; la oferta se llena con el chip
   «Todo lo disponible» del panel de arranque y se vuelve a vaciar con «Eliminar la simulación».
   Cada caso enciende el Directorio por su cuenta y lo apaga al salir, con o sin error (el runner reinicia
   el estado por ARCHIVO, no por caso, y un caso no supone lo que dejó el anterior). Lo que el caso b deja
   en la sesión —la fila 1 del Directorio vuelta a «Sin simular» con el pool reordenado por
   `limpiarSimulacion`, y las entradas de auditoría que `registrarAuditoria` persiste en localStorage— se
   mide y va en el detalle del caso, no se supone. */

const HEX = { fondo: "#EDECF3", borde: "#DEDCE7" }; // el color del texto no va acá: la regla dice C.sub y se lee de la paleta de la página
const TXT_VACIO = "Ninguna factura seleccionada";
const TIP_PLANA_OFERTA = "Todas las facturas de la oferta en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TIP_DEUDOR = "Un acordeón por empresa deudora, con sus facturas dentro.";

/* Instala en la página el verificador de la caja vacía y su buscador; devuelve el C.sub leído de la
   paleta `C` (global de nivel módulo del fuente): la regla dice «sobre C.sub», no un hex, así que si la
   paleta cambia el gate sigue midiendo contra ella. Convierte los hex a rgb() —lo que devuelve
   getComputedStyle— en vez de escribir el rgb a mano, y compara el tamaño de fuente contra una sonda
   con la clase t11 en el mismo contenedor (.dp-detalle tiene su propia escala). */
const instalar = (det) => det.evaluate(({ HEX, TXT_VACIO }) => {
  const sub = (typeof C !== "undefined" && C && C.sub) || null;
  if (!/^#[0-9a-fA-F]{6}$/.test(sub || "")) throw new Error("no se lee C.sub de la paleta `C` de la página: " + JSON.stringify(sub));
  const rgb = (h) => "rgb(" + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ") + ")";
  // «Se ve»: display / visibility / opacity propios o heredados (checkVisibility, Chromium ≥ 105; si no
  // existiera, se recorre la cadena de ancestros a mano), y además dentro del documento —una caja con
  // los tokens correctos pero en left:-9999px tampoco se ve—.
  const visible = (e) => {
    if (typeof e.checkVisibility === "function") return e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === "none" || c.visibility === "hidden" || parseFloat(c.opacity) === 0) return false; }
    return e.getClientRects().length > 0;
  };
  window.__nexCaja = (el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const de = document.documentElement; const fallos = [];
    if (!visible(el)) fallos.push("invisible (display/visibility/opacity)");
    if (r.width <= 0 || r.right <= 0 || r.bottom <= 0 || r.left >= de.scrollWidth || r.top >= de.scrollHeight) fallos.push(`fuera del documento (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)})`);
    if (cs.backgroundColor !== rgb(HEX.fondo)) fallos.push("fondo " + cs.backgroundColor);
    if (cs.borderTopWidth !== "1px" || cs.borderTopStyle !== "solid" || cs.borderTopColor !== rgb(HEX.borde)) fallos.push(`borde ${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`);
    if (r.height < 72) fallos.push("alto " + r.height);
    if (!el.classList.contains("t11") || !el.classList.contains("font-medium")) fallos.push("clases «" + el.className + "»");
    if (cs.color !== rgb(sub)) fallos.push("color " + cs.color + " ≠ C.sub " + sub);
    const sonda = document.createElement("span"); sonda.className = "t11"; sonda.textContent = "x"; el.parentElement.appendChild(sonda);
    const fzSonda = getComputedStyle(sonda).fontSize; sonda.remove();
    if (cs.fontSize !== fzSonda) fallos.push(`fuente ${cs.fontSize} ≠ t11 ${fzSonda}`);
    if (el.textContent.trim() !== TXT_VACIO) fallos.push("texto «" + el.textContent.trim() + "»");
    return { fallos, medido: { fondo: cs.backgroundColor, borde: cs.borderTopColor, alto: Math.round(r.height * 10) / 10, fuente: cs.fontSize, color: cs.color } };
  };
  // La caja se busca por su TEXTO: el elemento más hondo cuyo texto es exactamente el mensaje —el div
  // de hoy o un <span> envoltorio de mañana— y desde ahí el primer ancestro-o-sí `div` que PINTA (fondo
  // o borde): eso es «la caja». Exigir un div hoja daba falso rojo ante un refactor inocuo. Si nada pinta
  // (la caja desapareció), queda el div más cercano y el verificador objeta fondo y borde, que es lo que pasó.
  window.__nexCajaVacia = () => {
    const es = (e) => e.textContent.trim() === TXT_VACIO;
    const hoja = [...document.querySelectorAll("body *")].find((e) => es(e) && ![...e.children].some(es));
    if (!hoja) return null;
    const pinta = (d) => { const c = getComputedStyle(d); return !/^(rgba\(0, 0, 0, 0\)|transparent)$/.test(c.backgroundColor) || parseFloat(c.borderTopWidth) > 0; };
    const base = hoja.closest("div");
    for (let d = base; d; d = d.parentElement && d.parentElement.closest("div")) if (pinta(d)) return d;
    return base;
  };
  return sub;
}, { HEX, TXT_VACIO });

/* Filas de la OFERTA en el DOM: las que llevan el botón «Retirar esta factura de la oferta» (la sección
   de disponibles lleva «Agregar», y las «otras facturas de este deudor» anidadas en un acordeón también,
   así que el botón es lo único que separa un documento de la oferta de uno que no lo está). */
const filasOferta = (det) => det.evaluate(() => [...document.querySelectorAll('button[title="Retirar esta factura de la oferta"]')].map((b) => {
  const row = b.parentElement; const c = [...row.children].map((x) => x.textContent.trim());
  // El folio se lee de SU celda (la segunda): en el textContent de la fila el folio queda pegado a la
  // fecha de vencimiento (#19330812-08-2026) y un regex sobre la fila leía «19330812» donde hay «193308».
  return { folio: (c[1] || "").replace(/^#/, "") || null, n: row.children.length, celdas: c.slice(0, 4) };
}));
/* OJO: el título va con `uppercase`, e innerText devuelve el texto YA transformado (DOCUMENTOS EN LA
   OFERTA); por eso las comparaciones sobre innerText van con /i. */
const conteoTitulo = (det) => det.evaluate(() => {
  const t = document.body.innerText || ""; const i = t.search(/Documentos en la oferta/i); if (i < 0) return null;
  const m = t.slice(i, i + 200).match(/(\d+) deudor(?:es)? · (\d+) facturas? por/i); return m ? { deudores: +m[1], facturas: +m[2] } : null;
});
const segmentado = async (det) => ({
  planaOferta: await det.locator(`button[title="${TIP_PLANA_OFERTA}"]`).count(),
  porDeudor: await det.locator(`button[title="${TIP_DEUDOR}"]`).count(),
});
/* Cabeceras de acordeón: el botón que envuelve `cabDeudor`, por ROL y por su texto —lleva la razón
   social, el RUT y el chip «Nota N»—, no por clases de Tailwind (regla de testing). Las de la OFERTA son
   las que preceden al título «Documentos disponibles»; se devuelven sus índices dentro del locator. */
const cabecerasOferta = async (det) => {
  const todas = det.getByRole("button").filter({ hasText: /Nota \d/ });
  const idx = await todas.evaluateAll((els) => {
    const fin = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === "Documentos disponibles");
    return els.map((el, i) => (!fin || !!(el.compareDocumentPosition(fin) & Node.DOCUMENT_POSITION_FOLLOWING)) ? i : -1).filter((i) => i >= 0);
  });
  return { todas, idx };
};
/* Auditoría: lo persistido (`registrarAuditoria` → localStorage[AUDIT_KEY].datos, que comparten las
   pestañas del mismo origen) y lo que la pestaña del detalle tiene en MEMORIA (`AUDIT_LOG`), contando la
   entrada «Simulación eliminada» que registra `limpiarSimulacion` (`simularOferta` no registra ninguna).
   Se mide en vez de suponerlo: cada pestaña persiste SU AUDIT_LOG entero y la última que escribe gana,
   así que lo que el detalle registró puede no estar en localStorage cuando el tubo vuelve a escribir. */
const auditoriaPersistida = (pagina) => pagina.evaluate(() => {
  try { const j = JSON.parse(localStorage.getItem("nex_auditoria") || "null"); const d = j && Array.isArray(j.datos) ? j.datos : null;
    return d ? { n: d.length, eliminadas: d.filter((r) => r.accion === "Simulación eliminada").length, ts: j._ts || null } : null; } catch (e) { return null; }
});
const auditoriaEnMemoria = (det) => det.evaluate(() => {
  const mem = typeof AUDIT_LOG !== "undefined" && Array.isArray(AUDIT_LOG) ? AUDIT_LOG : null; if (!mem) return null;
  const el = mem.filter((r) => r.accion === "Simulación eliminada");
  return { n: mem.length, eliminadas: el.length, ts: el[0] ? (el[0].ts || parseInt(String(el[0].id).slice(2), 10) || null) : null };
});
const fmtAu = (a) => (a ? `${a.n} (eliminadas ${a.eliminadas})` : "n/d");

/* Corre el cuerpo del caso con el Directorio encendido y, pase lo que pase, lo apaga al salir: sin
   `.catch(() => {})`, para que un toggle que no aparece no deje el Directorio encendido en silencio para
   el archivo siguiente; y sin que un fallo del cierre TAPE al del caso (los dos van en el mismo mensaje). */
async function conDirectorio(h, cuerpo) {
  let res, error = null;
  try { await h.encenderDirectorio(); res = await cuerpo(); } catch (e) { error = e; }
  try { await h.apagarDirectorio(); }
  catch (e) { const m = "al apagar el Directorio (puede quedar encendido): " + String(e && e.message || e).slice(0, 160); if (error) error.message += " · además, " + m; else error = new Error(m); }
  if (error) throw error;
  return res;
}

/* La caja de vacío medida en el DOM + las sondas del verificador. */
async function verificarCaja(det) {
  const real = await det.evaluate(() => { const el = window.__nexCajaVacia(); return el ? window.__nexCaja(el) : null; });
  if (!real) throw new Error("no encuentro la caja «Ninguna factura seleccionada»");
  if (real.fallos.length) throw new Error("la caja de vacío no cumple: " + real.fallos.join(" · ") + " · medido " + JSON.stringify(real.medido));
  // SONDA 1: el estilo VIEJO (#F7F7FA sobre blanco, C.faint, sin borde ni alto) tiene que fallar por varios lados.
  // SONDAS 2–5: la caja real con UN solo desvío —fondo #F7F7FA · visibility:hidden · opacity:0 · fuera
  // del documento— y el verificador tiene que objetar exactamente ESE desvío, para saber que discrimina
  // atributo por atributo y que «se ve» es una medición y no una frase.
  const sondas = await det.evaluate(() => {
    const el = window.__nexCajaVacia(); const p = el.parentElement;
    const medir = (nodo) => { p.appendChild(nodo); const f = window.__nexCaja(nodo).fallos; nodo.remove(); return f; };
    const clon = (f) => { const c = el.cloneNode(true); f(c); return c; };
    const vieja = document.createElement("div"); vieja.className = "flex items-center justify-center rounded-lg px-3 py-2 t9"; vieja.style.cssText = "background-color:#F7F7FA;color:#9CA3AF"; vieja.textContent = el.textContent.trim();
    return {
      vieja: medir(vieja),
      copia: medir(clon((c) => { c.style.backgroundColor = "#F7F7FA"; })),
      oculta: medir(clon((c) => { c.style.visibility = "hidden"; })),
      transparente: medir(clon((c) => { c.style.opacity = "0"; })),
      fuera: medir(clon((c) => { c.style.position = "absolute"; c.style.left = "-9999px"; })),
    };
  });
  if (sondas.vieja.length < 4) throw new Error("el verificador acepta el estilo viejo: sólo objeta " + JSON.stringify(sondas.vieja));
  const soloUno = (nombre, re) => { const f = sondas[nombre]; if (f.length !== 1 || !re.test(f[0])) throw new Error(`el verificador no aísla el desvío de la sonda «${nombre}» (esperaba sólo ${re}): ${JSON.stringify(f)}`); };
  soloUno("copia", /^fondo/); soloUno("oculta", /^invisible/); soloUno("transparente", /^invisible/); soloUno("fuera", /^fuera/);
  return { real, sondas };
}

export const casos = [
  { id: "e2e-13-octies-bis-a", titulo: "el estado de ENTRADA es la oferta vacía y SE VE: título «Documentos en la oferta» con 0 · 0, sin segmentado, caja #EDECF3 · borde #DEDCE7 · ≥72 px · t11 medium · C.sub, visible y dentro del documento; el estilo viejo (#F7F7FA / C.faint) y las copias oculta, transparente y fuera de pantalla las rechaza el mismo verificador",
    correr: (h) => conDirectorio(h, async () => {
      const det = await h.abrirDetalle(0);
      const sub = await instalar(det);
      const txt = await h.texto(det);
      if (!/Documentos en la oferta/i.test(txt)) throw new Error("no aparece el título «Documentos en la oferta»");
      if (/Deudores en la oferta/i.test(txt)) throw new Error("sigue el título viejo «Deudores en la oferta»");
      const cab = await conteoTitulo(det);
      if (!cab) throw new Error("no se lee el conteo «N deudores · M facturas por» bajo el título");
      if (cab.facturas !== 0 || cab.deudores !== 0) throw new Error("la operación del Directorio no nace con la oferta vacía: " + JSON.stringify(cab) + " — el caso b cubre la dirección llena; revisar el estado de entrada");
      const seg = await segmentado(det);
      if (seg.planaOferta !== 0) throw new Error(`con la oferta vacía el segmentado de la oferta está presente (Por factura de la oferta: ${seg.planaOferta})`);
      if ((await filasOferta(det)).length) throw new Error("hay filas con «Retirar esta factura de la oferta» con 0 facturas");
      const { real, sondas } = await verificarCaja(det);
      const primero = (f) => f.split(" ")[0];
      return `oferta ${cab.deudores} · ${cab.facturas} · segmentado oferta ${seg.planaOferta} (Por deudor en pantalla: ${seg.porDeudor}, el de disponibles) · C.sub ${sub} · caja ${JSON.stringify(real.medido)} · sonda vieja objeta ${sondas.vieja.length} (${sondas.vieja.map(primero).join(",")}) · copias con un desvío objetan sólo el suyo: fondo→${primero(sondas.copia[0])} · hidden→${primero(sondas.oculta[0])} · opacity 0→${primero(sondas.transparente[0])} · left -9999→${primero(sondas.fuera[0])} · Directorio apagado al salir`;
    }) },
  { id: "e2e-13-octies-bis-b", titulo: "al llenar la oferta aparece el segmentado y la caja se va; la plana trae lo MISMO que los acordeones (folio desc.) y agrega RUT deudor + razón social; al vaciarla el segmentado desaparece y la caja vuelve",
    correr: (h) => conDirectorio(h, async () => {
      const au0 = await auditoriaPersistida(h.pagina);
      let det = null; let res; let auDet = null;
      try {
        det = await h.abrirDetalle(1);
        await instalar(det);
        const cab0 = await conteoTitulo(det);
        if (!cab0 || cab0.facturas !== 0) throw new Error("la fila 1 del Directorio no nace vacía: " + JSON.stringify(cab0));
        const seg0 = await segmentado(det);
        // LLENAR: chip «Todo lo disponible» del panel de arranque (arma la oferta y simula).
        const chip = det.getByRole("button").filter({ hasText: /Todo lo disponible/ }).first();
        if (!(await chip.count())) throw new Error("no encuentro el chip «Todo lo disponible» del panel de arranque");
        await chip.click();
        await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
        await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
        await det.waitForTimeout(2000);
        const cab = await conteoTitulo(det);
        if (!cab || cab.facturas < 2 || cab.deudores < 2) throw new Error("«Todo lo disponible» no llenó la oferta con al menos 2 deudores y 2 facturas: " + JSON.stringify(cab));
        const seg1 = await segmentado(det);
        if (seg1.planaOferta !== 1) throw new Error(`con ${cab.facturas} facturas en la oferta el segmentado de la oferta no está (Por factura de la oferta: ${seg1.planaOferta})`);
        if (await det.evaluate(() => !!window.__nexCajaVacia())) throw new Error("la caja «Ninguna factura seleccionada» sigue con la oferta llena");
        // POR DEUDOR (default): abrir todos los acordeones de la oferta y juntar sus folios. Se abren del
        // último al primero: lo que un acordeón abierto agrega al DOM queda DESPUÉS de su cabecera y no
        // corre los índices de las que faltan por abrir.
        const { todas, idx } = await cabecerasOferta(det);
        if (idx.length !== cab.deudores) throw new Error(`acordeones de la oferta ${idx.length} ≠ ${cab.deudores} deudores del título`);
        for (const i of [...idx].reverse()) { await todas.nth(i).click(); await det.waitForTimeout(150); }
        await det.waitForTimeout(400);
        const filasAcordeon = await filasOferta(det);
        const setA = new Set(filasAcordeon.map((f) => f.folio));
        if (filasAcordeon.some((f) => f.n !== 7)) throw new Error("en Por deudor una fila de la oferta no tiene 7 columnas (¿RUT/razón social se colaron en el acordeón?)");
        if (filasAcordeon.length !== cab.facturas || setA.size !== cab.facturas) throw new Error(`acordeones: ${filasAcordeon.length} filas / ${setA.size} folios ≠ ${cab.facturas} facturas del título`);
        const rutEnAcordeon = await det.evaluate(() => { const fin = [...document.querySelectorAll("span")].find((x) => x.textContent.trim() === "Documentos disponibles"); return [...document.querySelectorAll("span")].some((s) => s.textContent.trim() === "RUT deudor" && (!fin || !!(s.compareDocumentPosition(fin) & Node.DOCUMENT_POSITION_FOLLOWING))); });
        if (rutEnAcordeon) throw new Error("la cabecera «RUT deudor» aparece en la vista Por deudor de la oferta");
        // POR FACTURA: la misma función que disponibles (caso 98): mismo conjunto, folio descendente, +2 columnas.
        await det.locator(`button[title="${TIP_PLANA_OFERTA}"]`).click(); await det.waitForTimeout(600);
        const filasPlana = await filasOferta(det);
        const setB = new Set(filasPlana.map((f) => f.folio));
        const folios = filasPlana.map((f) => +f.folio);
        const desc = folios.every((v, i) => i === 0 || folios[i - 1] > v);
        const iguales = setA.size === setB.size && [...setA].every((x) => setB.has(x));
        if (!iguales) throw new Error(`la plana no trae lo mismo que los acordeones: acordeón ${setA.size} · plana ${setB.size} · sólo en acordeón ${[...setA].filter((x) => !setB.has(x)).slice(0, 5)} · sólo en plana ${[...setB].filter((x) => !setA.has(x)).slice(0, 5)}`);
        if (!desc) throw new Error("la plana de la oferta no viene en folio descendente estricto: " + folios.slice(0, 8).join(","));
        if (filasPlana.some((f) => f.n !== 9)) throw new Error("en Por factura una fila de la oferta no tiene 9 columnas (7 + RUT deudor + razón social)");
        const sinDeudor = filasPlana.filter((f) => !f.celdas[3]);
        if (sinDeudor.length) throw new Error(`${sinDeudor.length} fila(s) de la plana sin razón social del deudor`);
        const cabPlana = await det.evaluate(() => { const fin = [...document.querySelectorAll("span")].find((x) => x.textContent.trim() === "Documentos disponibles"); return [...document.querySelectorAll("span")].filter((s) => /^(RUT deudor|Razón social)$/.test(s.textContent.trim()) && (!fin || !!(s.compareDocumentPosition(fin) & Node.DOCUMENT_POSITION_FOLLOWING))).length; });
        if (cabPlana !== 2) throw new Error(`la plana de la oferta trae ${cabPlana} cabeceras «RUT deudor»/«Razón social» y se esperaban 2`);
        const conRut = filasPlana.filter((f) => /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/.test(f.celdas[2])).length;
        await det.locator(`button[title="${TIP_DEUDOR}"]`).first().click(); await det.waitForTimeout(300);
        // VACIAR: «Opciones › Eliminar la simulación y vaciar la oferta» (13-quaterdecies) devuelve la pantalla al estado de ENTRADA.
        await det.getByRole("button", { name: /^\s*Opciones\s*$/ }).first().click(); await det.waitForTimeout(400);
        const item = det.getByRole("button").filter({ hasText: /Eliminar la simulación y vaciar la oferta/ }).first();
        if (!(await item.count())) throw new Error("no aparece «Eliminar la simulación y vaciar la oferta» en Opciones");
        if (await item.isDisabled()) throw new Error("el ítem está deshabilitado: " + (await item.getAttribute("title")));
        await item.click(); await det.waitForTimeout(400);
        await det.getByRole("button", { name: "Eliminar la simulación", exact: true }).click();
        await det.waitForFunction(() => /Ninguna factura seleccionada/.test(document.body.innerText || ""), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras vaciar la oferta no aparece «Ninguna factura seleccionada»"); });
        await det.waitForTimeout(600);
        const cab2 = await conteoTitulo(det);
        if (!cab2 || cab2.facturas !== 0 || cab2.deudores !== 0) throw new Error("tras vaciar, el título no dice 0 deudores · 0 facturas: " + JSON.stringify(cab2));
        const seg2 = await segmentado(det);
        if (seg2.planaOferta !== 0) throw new Error(`el segmentado de la oferta sigue con la oferta vacía (Por factura de la oferta: ${seg2.planaOferta})`);
        if ((await filasOferta(det)).length) throw new Error("quedan filas con «Retirar esta factura de la oferta» con la oferta vacía");
        const { real } = await verificarCaja(det);
        auDet = await auditoriaEnMemoria(det);
        // La auditoría se persiste en el timer de respaldo de `registrarAuditoria` (1200 ms; el flush «a 0 ms
        // tras la huella» nunca se programa porque el de respaldo ya ocupó AUDIT_FLUSH_T) y no hay flush al
        // cerrar la pestaña, así que cerrar antes de ese plazo pierde la entrada. Se espera a que llegue a
        // localStorage —hasta 3 s, sin lanzar— para medir el estado estable y no el del cierre rápido.
        await det.waitForFunction(() => { try { const j = JSON.parse(localStorage.getItem("nex_auditoria") || "null"); return !!(j && Array.isArray(j.datos) && j.datos.some((r) => r.accion === "Simulación eliminada")); } catch (e) { return false; } }, null, { timeout: 3000 }).catch(() => {});
        res = `oferta 0 → ${cab.deudores} deudores · ${cab.facturas} facturas → 0 · segmentado oferta ${seg0.planaOferta} → ${seg1.planaOferta} → ${seg2.planaOferta} · acordeón ${setA.size} folios = plana ${setB.size} · folio desc. ${desc} · columnas 7 → 9 · RUT en ${conRut}/${filasPlana.length} · caja al volver ${JSON.stringify(real.medido)}`;
      } finally {
        if (det) await det.close().catch(() => {});
      }
      // Lo que el caso DEJA, medido: el detalle mandó al tubo (`nex-simulado`) el patch de `simularOferta` y
      // luego el de `limpiarSimulacion` (fila 1 en «Sin simular», pool reordenado), y la auditoría: la
      // entrada que el detalle registró en memoria, y lo que quedó en localStorage al cerrar la pestaña.
      const fila = h.pagina.locator("tr.pl-row").nth(1);
      const tFila = (await fila.count()) ? await fila.innerText() : "";
      const au1 = await auditoriaPersistida(h.pagina);
      const desfase = auDet && auDet.ts && au1 && au1.ts ? ` · localStorage escrito ${au1.ts - auDet.ts} ms después de la «Simulación eliminada» del detalle` : "";
      return `${res} · deja: fila 1 del Directorio ${/Sin simular/.test(tFila) ? "en «Sin simular»" : "sin el rótulo «Sin simular»"} y con el pool reordenado por limpiarSimulacion · auditoría: antes ${fmtAu(au0)} → detalle en memoria tras vaciar ${fmtAu(auDet)} → localStorage al cerrar ${fmtAu(au1)}${desfase} · Directorio apagado al salir`;
    }) },
];
