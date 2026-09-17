/* Gate e2e de la regla 13-sexdecies: armar la oferta A MANO tiene salida, y retirar la última factura también.
   Todo vive en el JSX de `DealDrawer` (panel de arranque, ícono de retiro) sin función expuesta, así que se
   ejercita el detalle real con el Modo Directorio, cuyas operaciones NACEN con la oferta vacía y se construyen
   de nuevo en cada encendido (`construirDirectorio`): cada caso enciende el Directorio al empezar y lo apaga en
   su `finally`, así que ninguno hereda lo que otro agregó, retiró o simuló, y la operación se elige por su
   CONTENIDO (la primera fila del tubo que dice «Sin simular»), no por un índice que depende de cuántas filas
   deja el filtro rápido.
   (a) Con la oferta VACÍA el panel pregunta «¿Qué facturas quieres incluir…» y NO ofrece «Tienes…» ni
       «Simular la oferta» (dirección negativa: no hay nada que simular). Se agregan DOS facturas una por una
       desde «Documentos disponibles»: el panel pasa a «Tienes 1 factura elegida · M$X» (X = el monto de ESA
       fila, misma cadena) y luego «Tienes 2 facturas elegidas · M$Y» (Y = suma), la acción principal es
       «Simular la oferta · 2 fact.», los atajos siguen DEBAJO del rótulo «O reemplaza la selección por», y al
       apretar Simular la oferta queda simulada con ESAS 2 facturas —no las de un atajo—.
   (b) Con DOS facturas se retira una (confirmando en el diálogo) y con UNA el ícono sigue habilitado, con el
       título «Retirar esta factura de la oferta», en C.sub (#6B7280) y sin el título viejo «La oferta debe tener
       al menos una factura» en ningún elemento renderizado.
   (c) Retirar la ÚLTIMA de una oferta SIN simular la vacía: vuelve el panel de arranque, no queda ícono de
       retiro ni «Re-evaluar operación», el folio vuelve a «Documentos disponibles» y la operación sigue en
       Prospección, «Sin simular» — también en la fila del tubo, que se entera por el aviso `nex-simulado`.
   (d) Lo mismo desde una oferta ya SIMULADA (una a mano → «Simular la oferta» → retirar): la simulación se
       borra y la operación VUELVE a Prospección, «Sin simular», en el detalle y en el tubo.
   Folio y monto se leen de cada fila por el RÓTULO de su cabecera («Folio», «Monto»), nunca por posición. */

const TIP_PLANA_DISP = "Todas las facturas en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TIP_PLANA_OFERTA = "Todas las facturas de la oferta en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TITULO_RETIRAR = "Retirar esta factura de la oferta";
const TITULO_AGREGAR = "Agregar a la simulación";
const VETO_VIEJO = "La oferta debe tener al menos una factura";
const num = (s) => { if (!s) return null; return s.startsWith("M$") ? parseFloat(s.slice(2).replace(/\./g, "").replace(",", ".")) : parseFloat(s.slice(1).replace(/\./g, "")) / 1e6; };

/* PÁGINA · folio y monto de la fila (grid) que contiene `btn`, leídos por el RÓTULO de la cabecera hermana
   («Folio», «Monto») y no por posición: una columna nueva no los corre. Se entrega a evaluate() serializada
   con toString(), por eso es una función suelta sin dependencias. */
function filaDe(btn) {
  const row = btn && btn.parentElement; if (!row) return null;
  const rotulos = (el) => [...el.children].map((x) => (x.textContent || "").trim());
  let cab = row.previousElementSibling;
  while (cab && !rotulos(cab).some((r) => /^Folio$/i.test(r))) cab = cab.previousElementSibling;
  if (!cab) return { error: "la fila no tiene una cabecera con «Folio» entre sus hermanos anteriores" };
  const rot = rotulos(cab), c = rotulos(row);
  if (c.length !== rot.length) return { error: `la fila tiene ${c.length} celdas y la cabecera ${rot.length}` };
  const iF = rot.findIndex((r) => /^Folio$/i.test(r)), iM = rot.findIndex((r) => /^Monto$/i.test(r));
  return { folio: (c[iF] || "").replace(/^#/, ""), monto: iM < 0 ? null : c[iM] };
}
const FILA_DE = filaDe.toString();
/* Índice, entre los botones con título T, del que está en la fila del folio dado (−1 si no está). */
const indiceDelFolio = (det, T, folio) => det.evaluate(({ T, folio, src }) => {
  const filaDe = new Function("return " + src)();
  return [...document.querySelectorAll(`button[title="${T}"]`)].findIndex((b) => (filaDe(b) || {}).folio === folio);
}, { T, folio, src: FILA_DE });
/* ¿Está el folio en alguna tabla cuya cabecera tenga «Folio» y el rótulo distintivo («Acción» = disponibles,
   «Financiada con» = oferta)? Recorre las filas hermanas de la cabecera: no depende del título del botón. */
const folioEnTabla = (det, distintivo, folio) => det.evaluate(({ distintivo, folio }) => {
  const rot = (el) => [...el.children].map((x) => (x.textContent || "").trim());
  return [...document.querySelectorAll("div")].filter((el) => { const r = rot(el); return r.some((t) => /^Folio$/i.test(t)) && r.includes(distintivo); })
    .some((cab) => { const iF = rot(cab).findIndex((t) => /^Folio$/i.test(t)); for (let f = cab.nextElementSibling; f; f = f.nextElementSibling) { const c = f.children[iF]; if (c && (c.textContent || "").trim() === "#" + folio) return true; } return false; });
}, { distintivo, folio });
const folioEnDisponibles = (det, folio) => folioEnTabla(det, "Acción", folio);
const folioEnOferta = (det, folio) => folioEnTabla(det, "Financiada con", folio);

/* Lo que dice el panel de arranque y su entorno (innerText: los rótulos `uppercase` llegan ya en mayúsculas → /i). */
const panel = (det) => det.evaluate(({ TITULO_RETIRAR }) => {
  const t = document.body.innerText || "";
  const m = t.match(/Tienes (\d+) facturas? elegidas? · (M?\$[\d.,]+)/);
  const botones = [...document.querySelectorAll("button")];
  const sim = botones.find((b) => /Simular la oferta/.test(b.textContent || ""));
  const reemplaza = [...document.querySelectorAll("div")].find((d) => d.children.length === 0 && /^O reemplaza la selección por$/i.test((d.textContent || "").trim())) || null;
  // Los tres chips del panel de arranque (`opcionesInicio`): «<rótulo> · N fact. · M$X».
  const atajos = botones.filter((b) => /^\s*(Deudores con línea|Prime|Todo lo disponible) · \d+ fact\. · M?\$[\d.,]+\s*$/.test((b.textContent || "").replace(/\s+/g, " ")));
  const debajo = reemplaza ? atajos.every((b) => !!(reemplaza.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) : null;
  const of = (() => { const i = t.search(/Documentos en la oferta/i); if (i < 0) return null; const mm = t.slice(i, i + 200).match(/(\d+) deudor(?:es)? · (\d+) facturas? por/i); return mm ? { deudores: +mm[1], facturas: +mm[2] } : null; })();
  return { tienes: m ? { n: +m[1], monto: m[2] } : null, pregunta: /¿Qué facturas quieres incluir en la oferta\?/.test(t),
    simular: sim ? { texto: (sim.textContent || "").replace(/\s+/g, " ").trim(), disabled: sim.disabled } : null,
    reemplaza: !!reemplaza, atajos: atajos.map((b) => (b.textContent || "").replace(/\s+/g, " ").trim()), debajo,
    simulando: /Simulando la oferta/.test(t), reevaluar: /Re-evaluar operación/.test(t), oferta: of,
    retirar: [...document.querySelectorAll(`button[title="${TITULO_RETIRAR}"]`)].map((b) => ({ disabled: b.disabled, color: getComputedStyle(b).color, clases: b.className })),
    // Sólo elementos RENDERIZADOS: el innerHTML del body trae el fuente JSX entero dentro del <script type="text/babel">.
    vetoViejoEnDom: [...document.querySelectorAll("[title]")].some((el) => /La oferta debe tener al menos una factura/.test(el.getAttribute("title") || "")) };
}, { TITULO_RETIRAR });

/* Pone «Documentos disponibles» en vista plana (filas con el botón «Agregar a la simulación» a la vista). */
async function abrirPlanaDisponibles(det) {
  const seg = det.locator(`button[title="${TIP_PLANA_DISP}"]`);
  if (!(await seg.count())) throw new Error("no encuentro el segmentado «Por factura» de Documentos disponibles");
  await seg.first().click(); await det.waitForTimeout(500);
}
/* La oferta se dibuja por deudor con los acordeones CERRADOS: los íconos de retiro sólo están en el DOM en la vista «Por factura». */
async function abrirPlanaOferta(det) {
  const seg = det.locator(`button[title="${TIP_PLANA_OFERTA}"]`);
  if (!(await seg.count())) throw new Error("no encuentro el segmentado «Por factura» de Documentos en la oferta (¿oferta vacía?)");
  await seg.first().click(); await det.waitForTimeout(500);
}
/* Primera fila incorporable de la plana de disponibles: folio y monto tal como se muestran (por rótulo); y la agrega. */
async function agregarPrimera(det) {
  const fila = await det.evaluate(({ T, src }) => { const filaDe = new Function("return " + src)(); const b = document.querySelector(`button[title="${T}"]:not([disabled])`); return b ? filaDe(b) : null; }, { T: TITULO_AGREGAR, src: FILA_DE });
  if (!fila || fila.error || !fila.folio || !fila.monto) throw new Error("no hay fila incorporable con folio y monto en Documentos disponibles: " + JSON.stringify(fila));
  await det.locator(`button[title="${TITULO_AGREGAR}"]:not([disabled])`).first().click();
  await det.waitForTimeout(600);
  return fila;
}
/* Aprieta el ícono de retiro del folio y confirma en el diálogo real («Retirar factura»). */
async function retirar(det, folio) {
  const idx = await indiceDelFolio(det, TITULO_RETIRAR, folio);
  if (idx < 0) throw new Error(`no encuentro el botón de retiro del folio ${folio}`);
  await det.locator(`button[title="${TITULO_RETIRAR}"]`).nth(idx).click(); await det.waitForTimeout(300);
  const dlg = await det.evaluate(() => /¿Retirar esta factura de la oferta\?/.test(document.body.innerText || ""));
  if (!dlg) throw new Error("al apretar el ícono no se abrió el diálogo «¿Retirar esta factura de la oferta?»");
  await det.getByRole("button", { name: "Retirar factura", exact: true }).click(); await det.waitForTimeout(700);
}
/* El panel de arranque se retira de la pantalla (ni pregunta, ni «Tienes», ni «Simulando la oferta…»): es la
   señal de que la operación quedó simulada. Lanza si no ocurre. */
const esperarSimulada = (det) => det.waitForFunction(() => { const t = document.body.innerText || ""; return !/Simulando la oferta/.test(t) && !/Tienes \d+ facturas? elegidas?/.test(t) && !/¿Qué facturas quieres incluir en la oferta\?/.test(t); }, null, { timeout: 30000 })
  .catch(() => { throw new Error("«Simular la oferta» no simuló: el panel de arranque no se retiró de la pantalla"); });
/* Vuelve el panel de arranque con la oferta vacía; true/false sin lanzar (el mensaje lo arma el caso). */
const esperarVacia = (det) => det.waitForFunction(() => { const t = document.body.innerText || ""; return /¿Qué facturas quieres incluir en la oferta\?/.test(t) && !/Tienes \d+ facturas? elegidas?/.test(t); }, null, { timeout: 8000 }).then(() => true).catch(() => false);
/* La fila del tubo (pestaña de la sesión) de la operación: texto plano, o null si no está en la tabla. */
const filaTubo = (h, id) => h.pagina.evaluate((id) => { const tr = [...document.querySelectorAll("tr.pl-row")].find((x) => (x.innerText || "").includes(id)); return tr ? (tr.innerText || "").replace(/\s+/g, " ").trim() : null; }, id);
/* Espera a que la fila del tubo diga (o deje de decir) «Sin simular»: el detalle es otra pestaña y el tubo se entera por `nex-simulado`. */
const esperarTubo = (h, id, sinSimular) => h.pagina.waitForFunction(({ id, sinSimular }) => { const tr = [...document.querySelectorAll("tr.pl-row")].find((x) => (x.innerText || "").includes(id)); return !!tr && /Sin simular/.test(tr.innerText || "") === sinSimular; }, { id, sinSimular }, { timeout: 10000 }).then(() => true).catch(() => false);
/* Abre el detalle de la primera operación del tubo que diga «Sin simular» (el Directorio recién encendido las
   trae todas así). Devuelve la pestaña, el id de la operación y la fila que se abrió. */
async function abrirSinSimular(h) {
  await h.encenderDirectorio();
  const n = await h.pagina.evaluate(() => [...document.querySelectorAll("tr.pl-row")].findIndex((tr) => /Sin simular/.test(tr.innerText || "")));
  if (n < 0) throw new Error("no hay en el tubo ninguna operación «Sin simular» (¿el Directorio no se encendió?)");
  const det = await h.abrirDetalle(n);
  const id = await det.evaluate(() => ((document.body.innerText || "").match(/OP-DIR\d+/) || [])[0] || "?");
  return { det, id, n };
}
/* Lo que la regla exige tras retirar la última factura: oferta vacía y panel de arranque en el detalle, el folio
   de vuelta en disponibles, y la operación en Prospección, «Sin simular», en la fila del tubo. Devuelve lo que NO se cumple. */
async function comprobarVaciada(h, det, id, folio) {
  const fallos = []; const p = await panel(det);
  if (p.tienes) fallos.push(`el panel sigue en «Tienes ${p.tienes.n} factura(s) elegida(s) · ${p.tienes.monto}»`);
  if (!p.pregunta) fallos.push("no volvió la pregunta «¿Qué facturas quieres incluir en la oferta?»");
  if (p.retirar.length) fallos.push(`quedan ${p.retirar.length} ícono(s) de retiro`);
  if (p.oferta && p.oferta.facturas !== 0) fallos.push(`«Documentos en la oferta» dice ${JSON.stringify(p.oferta)}`);
  if (p.reevaluar) fallos.push("sigue ofreciendo «Re-evaluar operación» con la oferta vacía");
  if (!(await folioEnDisponibles(det, folio))) fallos.push(`el folio ${folio} no volvió a Documentos disponibles`);
  if (!(await esperarTubo(h, id, true))) fallos.push(`la fila del tubo no dice «Sin simular»: ${await filaTubo(h, id)}`);
  // En el TUBO la etapa se rotula con el catálogo del tenant (regla 28: `etapaDeDeal` es la única puerta), y ahí
  // «prospeccion» se llama «Sin gestión». El detalle, que aún rotula con el catálogo base, dice «Prospección».
  else { const ft = await filaTubo(h, id); if (!/Sin gestión|Prospección/.test(ft || "")) fallos.push(`la fila del tubo no volvió a prospección: ${ft}`); }
  return fallos;
}
const erroresDe = (det) => { const errs = det._erroresE2E || []; if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | ")); };

export const casos = [
  { id: "e2e-13-sexdecies-a", titulo: "armar la oferta a mano tiene salida: con la oferta vacía el panel pregunta y no ofrece simular; con N elegidas dice «Tienes N factura(s) elegida(s) · M$X» (X = lo agregado), la acción principal es «Simular la oferta», los atajos quedan bajo «O reemplaza la selección por» y simular usa ESA selección",
    correr: async (h) => {
      let det = null;
      try {
        const ab = await abrirSinSimular(h); det = ab.det; const id = ab.id;
        // VACÍA: pregunta, sin «Tienes», sin «Simular la oferta», sin «O reemplaza» — y los atajos están.
        const p0 = await panel(det);
        if (!p0.pregunta) throw new Error("con la oferta vacía el panel no pregunta «¿Qué facturas quieres incluir en la oferta?»");
        if (p0.tienes || p0.simular || p0.reemplaza) throw new Error("con la oferta vacía el panel ofrece la salida manual: " + JSON.stringify({ tienes: p0.tienes, simular: p0.simular, reemplaza: p0.reemplaza }));
        if (p0.atajos.length < 2 || p0.atajos.length > 3) throw new Error("el panel de arranque no trae los 2–3 atajos (Deudores con línea / Prime / Todo lo disponible): " + JSON.stringify(p0.atajos));
        if (p0.oferta && p0.oferta.facturas !== 0) throw new Error("la operación del Directorio no nace con la oferta vacía: " + JSON.stringify(p0.oferta));
        // UNA a mano: «Tienes 1 factura elegida · M$X», X = la MISMA cadena que la fila agregada.
        await abrirPlanaDisponibles(det);
        const f1 = await agregarPrimera(det);
        await det.waitForFunction(() => /Tienes 1 factura elegida/.test(document.body.innerText || ""), null, { timeout: 10000 })
          .catch(() => { throw new Error("tras agregar una factura a mano el panel no dice «Tienes 1 factura elegida»"); });
        const p1 = await panel(det);
        if (!p1.tienes || p1.tienes.n !== 1) throw new Error("panel con 1 factura: " + JSON.stringify(p1.tienes));
        if (p1.tienes.monto !== f1.monto) throw new Error(`«Tienes 1 factura elegida · ${p1.tienes.monto}» ≠ monto de la fila agregada ${f1.monto} (folio ${f1.folio})`);
        if (!p1.simular || p1.simular.disabled || !/Simular la oferta · 1 fact\. · /.test(p1.simular.texto)) throw new Error("la acción principal no es «Simular la oferta · 1 fact.» habilitada: " + JSON.stringify(p1.simular));
        if (!p1.reemplaza) throw new Error("falta el rótulo «O reemplaza la selección por» sobre los atajos");
        if (p1.pregunta) throw new Error("con una factura elegida el panel sigue preguntando «¿Qué facturas quieres incluir…?»");
        if (p1.debajo !== true) throw new Error("los atajos no están DEBAJO del rótulo «O reemplaza la selección por»");
        if (p1.atajos.length < 2) throw new Error("los atajos desaparecieron al elegir a mano: " + JSON.stringify(p1.atajos));
        // DOS: la suma, y el conteo de «Documentos en la oferta» dice 2.
        const f2 = await agregarPrimera(det);
        if (f2.folio === f1.folio) throw new Error("la factura agregada no salió del pool: la plana volvió a ofrecer el folio " + f1.folio);
        await det.waitForFunction(() => /Tienes 2 facturas elegidas/.test(document.body.innerText || ""), null, { timeout: 10000 })
          .catch(() => { throw new Error("tras agregar la segunda el panel no dice «Tienes 2 facturas elegidas»"); });
        const p2 = await panel(det);
        const esperado = num(f1.monto) + num(f2.monto);
        if (Math.abs(num(p2.tienes.monto) - esperado) > 0.11) throw new Error(`«Tienes 2 facturas elegidas · ${p2.tienes.monto}» ≠ ${f1.monto} + ${f2.monto} = M$${esperado.toFixed(1)}`);
        if (!p2.simular || !/Simular la oferta · 2 fact\. · /.test(p2.simular.texto)) throw new Error("el botón no dice «Simular la oferta · 2 fact.»: " + JSON.stringify(p2.simular));
        if (num((p2.simular.texto.match(/(M?\$[\d.,]+)\s*$/) || [])[1]) !== num(p2.tienes.monto)) throw new Error("el botón y el título del panel no dicen la misma cifra: " + p2.simular.texto + " / " + p2.tienes.monto);
        if (!p2.oferta || p2.oferta.facturas !== 2) throw new Error("«Documentos en la oferta» no cuenta 2 facturas: " + JSON.stringify(p2.oferta));
        // SIMULAR LA OFERTA: la salida existe y simula LA SELECCIÓN (2 facturas), no un atajo.
        await det.locator("button", { hasText: /Simular la oferta/ }).first().click();
        await esperarSimulada(det); await det.waitForTimeout(800);
        const p3 = await panel(det);
        if (p3.tienes || p3.simular || p3.pregunta || p3.simulando) throw new Error("tras simular el panel de arranque sigue en pantalla: " + JSON.stringify({ tienes: p3.tienes, simular: p3.simular, pregunta: p3.pregunta, simulando: p3.simulando }));
        if (!p3.oferta || p3.oferta.facturas !== 2) throw new Error("simular reemplazó la selección manual: «Documentos en la oferta» dice " + JSON.stringify(p3.oferta) + " y eran 2");
        await abrirPlanaOferta(det);
        const enOf = await Promise.all([folioEnOferta(det, f1.folio), folioEnOferta(det, f2.folio)]);
        if (!enOf.every(Boolean)) throw new Error(`los folios elegidos a mano no están en la oferta simulada: ${f1.folio}=${enOf[0]} ${f2.folio}=${enOf[1]}`);
        erroresDe(det);
        return `${id} (fila ${ab.n}) · vacía: pregunta sí, Tienes/Simular/O reemplaza no, atajos ${p0.atajos.length} · +#${f1.folio} → «Tienes 1 factura elegida · ${p1.tienes.monto}» = fila ${f1.monto} · +#${f2.folio} → «${p2.tienes.monto}» = ${f1.monto}+${f2.monto} · botón «${p2.simular.texto}» · atajos debajo ${p1.debajo} · simulada con ${p3.oferta.facturas} facturas (${f1.folio}, ${f2.folio})`;
      } finally {
        if (det) await det.close().catch(() => {});
        await h.apagarDirectorio();
      }
    } },
  { id: "e2e-13-sexdecies-b", titulo: "retirar no tiene veto: con dos facturas se retira una confirmando en el diálogo y el folio vuelve al pool; con UNA el ícono sigue habilitado, en C.sub, con hover y sin el título viejo «la oferta debe tener al menos una factura» en ningún elemento",
    correr: async (h) => {
      let det = null;
      try {
        const ab = await abrirSinSimular(h); det = ab.det; const id = ab.id;
        await abrirPlanaDisponibles(det);
        const f1 = await agregarPrimera(det); const f2 = await agregarPrimera(det);
        await det.waitForFunction(() => /Tienes 2 facturas elegidas/.test(document.body.innerText || ""), null, { timeout: 10000 });
        await abrirPlanaOferta(det);
        const p2 = await panel(det);
        if (p2.retirar.length !== 2 || p2.retirar.some((r) => r.disabled)) throw new Error("con 2 facturas: " + JSON.stringify(p2.retirar));
        // Retirar UNA (no es la última): el diálogo confirma y queda 1.
        await retirar(det, f1.folio);
        await det.waitForFunction(() => /Tienes 1 factura elegida/.test(document.body.innerText || ""), null, { timeout: 10000 })
          .catch(() => { throw new Error("retirar una de dos no dejó la oferta en «Tienes 1 factura elegida»"); });
        if (!(await folioEnDisponibles(det, f1.folio))) throw new Error(`el folio retirado ${f1.folio} no volvió a Documentos disponibles`);
        if (await folioEnOferta(det, f1.folio)) throw new Error(`el folio retirado ${f1.folio} sigue en la oferta`);
        // CON UNA: el ícono está, habilitado, en C.sub, sin el veto viejo en el DOM.
        const p1 = await panel(det);
        if (p1.retirar.length !== 1) throw new Error("con una factura hay " + p1.retirar.length + " íconos de retiro");
        const r = p1.retirar[0];
        if (r.disabled) throw new Error("con una sola factura el ícono de retiro está DESHABILITADO (vuelve el veto «al menos una»)");
        if (r.color !== "rgb(107, 114, 128)") throw new Error("el ícono de retiro no está en C.sub #6B7280: " + r.color);
        if (/disabled:opacity/.test(r.clases) || !/hover:bg-stone-100/.test(r.clases)) throw new Error("el ícono de retiro no lleva hover / lleva la atenuación de deshabilitado: " + r.clases);
        if (p1.vetoViejoEnDom) throw new Error("el DOM del detalle sigue diciendo «" + VETO_VIEJO + "»");
        erroresDe(det);
        return `${id} (fila ${ab.n}) · +#${f1.folio} +#${f2.folio} → 2 íconos habilitados · retiro #${f1.folio} → «Tienes 1 factura elegida · ${p1.tienes.monto}», folio de vuelta en disponibles y fuera de la oferta · con UNA (#${f2.folio}): habilitado, ${r.color}, clases con hover y sin disabled:opacity, sin «${VETO_VIEJO}» en ningún title`;
      } finally {
        if (det) await det.close().catch(() => {});
        await h.apagarDirectorio();
      }
    } },
  { id: "e2e-13-sexdecies-c", titulo: "retirar la ÚLTIMA factura de una oferta sin simular la vacía: al confirmar vuelve el panel de arranque sin íconos de retiro ni «Re-evaluar operación», el folio vuelve a Documentos disponibles y la operación sigue en Prospección, «Sin simular», también en la fila del tubo",
    correr: async (h) => {
      let det = null;
      try {
        const ab = await abrirSinSimular(h); det = ab.det; const id = ab.id;
        await abrirPlanaDisponibles(det);
        const f = await agregarPrimera(det);
        await det.waitForFunction(() => /Tienes 1 factura elegida/.test(document.body.innerText || ""), null, { timeout: 10000 })
          .catch(() => { throw new Error("tras agregar una factura el panel no dice «Tienes 1 factura elegida»"); });
        await abrirPlanaOferta(det);
        if (!(await folioEnOferta(det, f.folio))) throw new Error(`el folio ${f.folio} no está en la oferta`);
        const pu = await panel(det);
        if (pu.retirar.length !== 1 || pu.retirar[0].disabled) throw new Error("con una factura el ícono de retiro no está habilitado: " + JSON.stringify(pu.retirar));
        // RETIRAR LA ÚLTIMA: la oferta queda vacía, vuelve el panel de arranque y el folio vuelve al pool.
        await retirar(det, f.folio);
        if (!(await esperarVacia(det))) {
          const p0 = await panel(det);
          throw new Error(`retirar la ÚLTIMA factura (#${f.folio}) no vació la oferta: el panel sigue en ${JSON.stringify(p0.tienes)} con ${p0.retirar.length} ícono(s) de retiro y «Documentos en la oferta» ${JSON.stringify(p0.oferta)} — el ícono se deja apretar y el diálogo confirma, pero la mutación (retirarFacturaOferta) devuelve la operación sin cambios cuando quedaría vacía`);
        }
        const fallos = await comprobarVaciada(h, det, id, f.folio);
        if (fallos.length) throw new Error("tras retirar la última: " + fallos.join(" · "));
        erroresDe(det);
        return `${id} (fila ${ab.n}) · +#${f.folio} (${pu.tienes.monto}) → ícono habilitado · retiro de la última → oferta vacía, panel de arranque, 0 íconos, sin re-evaluar, folio de vuelta en disponibles · tubo: «Sin simular» · Prospección`;
      } finally {
        if (det) await det.close().catch(() => {});
        await h.apagarDirectorio();
      }
    } },
  { id: "e2e-13-sexdecies-d", titulo: "retirar la ÚLTIMA factura de una oferta ya SIMULADA (una a mano → «Simular la oferta» → retirar) la vacía: la simulación se borra, vuelve el panel de arranque sin «Re-evaluar operación», el folio vuelve a Documentos disponibles y la operación vuelve a Prospección, «Sin simular», en el detalle y en la fila del tubo",
    correr: async (h) => {
      let det = null;
      try {
        const ab = await abrirSinSimular(h); det = ab.det; const id = ab.id;
        const p0 = await panel(det);
        if (!p0.pregunta || p0.tienes) throw new Error("la operación no parte con la oferta vacía: " + JSON.stringify({ pregunta: p0.pregunta, tienes: p0.tienes }));
        // UNA a mano y «Simular la oferta»: la operación queda simulada, y el tubo se entera (deja de decir «Sin simular»).
        await abrirPlanaDisponibles(det);
        const f = await agregarPrimera(det);
        await det.waitForFunction(() => /Tienes 1 factura elegida/.test(document.body.innerText || ""), null, { timeout: 10000 })
          .catch(() => { throw new Error("tras agregar una factura el panel no dice «Tienes 1 factura elegida»"); });
        await det.locator("button", { hasText: /Simular la oferta/ }).first().click();
        await esperarSimulada(det); await det.waitForTimeout(800);
        const pS = await panel(det);
        if (pS.tienes || pS.pregunta || pS.simulando) throw new Error("tras simular el panel de arranque sigue en pantalla: " + JSON.stringify({ tienes: pS.tienes, pregunta: pS.pregunta, simulando: pS.simulando }));
        if (!pS.oferta || pS.oferta.facturas !== 1) throw new Error("la oferta simulada no tiene exactamente la factura elegida: " + JSON.stringify(pS.oferta));
        if (!(await esperarTubo(h, id, false))) throw new Error(`tras simular en el detalle, la fila del tubo sigue en «Sin simular» (el aviso nex-simulado no cruzó de pestaña): ${await filaTubo(h, id)}`);
        await abrirPlanaOferta(det);
        const pu = await panel(det);
        if (pu.retirar.length !== 1 || pu.retirar[0].disabled) throw new Error("con una factura en la oferta simulada el ícono de retiro no está habilitado: " + JSON.stringify(pu.retirar));
        // RETIRAR LA ÚLTIMA de la oferta simulada: la simulación se borra y vuelve el panel de arranque.
        await retirar(det, f.folio);
        if (!(await esperarVacia(det))) {
          const p1 = await panel(det);
          throw new Error(`retirar la ÚLTIMA factura (#${f.folio}) de la oferta SIMULADA no la vació: el panel de arranque no volvió — ${JSON.stringify({ retirar: p1.retirar.length, oferta: p1.oferta, reevaluar: p1.reevaluar })} — el ícono se deja apretar y el diálogo confirma, pero la operación sigue simulada con su única factura${p1.reevaluar ? " y «Re-evaluar operación» pendiente" : ""}`);
        }
        const fallos = await comprobarVaciada(h, det, id, f.folio);
        if (fallos.length) throw new Error("tras retirar la última de la oferta simulada: " + fallos.join(" · "));
        erroresDe(det);
        return `${id} (fila ${ab.n}) · +#${f.folio} (${f.monto}) → simulada (la fila del tubo dejó de decir «Sin simular») · retiro de la última → simulación borrada, panel de arranque, 0 íconos, sin re-evaluar, folio de vuelta en disponibles · tubo: «Sin simular» · Prospección`;
      } finally {
        if (det) await det.close().catch(() => {});
        await h.apagarDirectorio();
      }
    } },
];
