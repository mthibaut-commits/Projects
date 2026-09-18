/* Gate e2e de la regla 29: en el DETALLE los montos de DOCUMENTO van en PESOS y el `M$` queda para los
   resúmenes. Todo vive en el JSX de `DealDrawer` (titular del veredicto, fila del deudor, «Total oferta»,
   `labelAccion`) sin función expuesta, así que se ejercita el detalle real con el Modo Directorio, que trae
   3 clientes DENTRO de línea y 2 con línea PARCIAL: las dos direcciones del CTA y del chip «Solicitud línea».
   (a) Cliente dentro de línea, simulado con el atajo «Deudores con línea» (lo que el motor deja CON_LINEA): el titular dice «Se puede cursar la oferta
       completa · $X» en pesos con puntos y sin M$; «Total oferta» y «Monto Documentos» dicen la MISMA cifra en
       la MISMA escala; el monto de cada deudor y «Línea disponible $» van en pesos y la suma por deudor ES el
       total (calculado, no dorado); el chip de conteo de sección, el indicador de línea de la cabecera y el
       badge del chip de Giro siguen en M$ (y el chip de sección = total/1e6). El CTA dice «Cerrar oferta y
       publicar» y NO hay «Solicitud línea» ni «Enviar a Comité» (dirección negativa del CTA y del chip).
   (b) Cliente con línea parcial, simulado con «Todo lo disponible»: «Se puede cursar $X de $Y» con X < Y, Y = «Total oferta»; el CTA dice
       «Enviar a Comité y Publicar»; cada deudor con FALTANTE ya en la oferta —de cupo cero o PARCIAL— muestra
       «Solicitud línea $Z» en ÁMBAR (#C2410C / #FFF7ED) con Z = `monto − asignado` leído de su propia fila, un
       chip por faltante y la suma de los Z ≤ Y − X. Después, «Opciones ›
       Sacar facturas sin línea» retira las REQUIERE_COMITE: el deudor de cupo cero se va entero a «Documentos
       disponibles» y ahí describe la carencia («Sin Línea Cliente - Deudor» / «Línea Cliente - Deudor sin
       cupo»), el PARCIAL se queda en la oferta con lo que cabía y vuelve a «Línea disponible $X», y no queda
       ningún «Solicitud línea» en la pantalla —fuera de la oferta, o sin faltante, no se pide nada—; re-evaluada, la oferta
       que queda es exactamente $X, cursable completa, y el CTA vuelve a «Cerrar oferta y publicar».
   Sonda: los detectores de escala se prueban contra textos PLANTADOS («Se puede cursar M$24,9 de M$29,6»,
   «$24,9», «M$ en Total oferta») y tienen que rechazarlos; si el detector aceptara M$ en un sitio de pesos,
   el caso fallaría antes de mirar la pantalla.
   Lo que el gate TOLERA a propósito (está en `hallazgos` del reporte para que el usuario decida): el badge
   «M$Y puntual» dentro del chip «Línea disponible $X» (regex de `comprobarComunes`) y el titular «Aceptada ·
   M$X con línea asignada» de la tarjeta tras aceptar, que el caso no llega a ver porque nunca acepta.
   Estado: cada caso enciende el Directorio si lo necesita y en su `finally` cierra el detalle, lo apaga,
   devuelve el filtro rápido al que estaba y restaura las claves `pc_repo_*` de localStorage tal como estaban
   (el detalle es otra pestaña del mismo origen: lo que escriba ahí lo leería el próximo caso que abra la misma
   operación). */

/* El signo se tolera: un «Monto a Girar» negativo se MUESTRA (regla 13-septdecies: la oferta se simula para que
   se vea por qué no da, y no se cursa) y `fmtCLP` lo escribe en pesos, que es lo que esta regla pide. */
const RE_PESOS = /^\$-?\d{1,3}(?:\.\d{3})*$/;          // «$24.915.639» · «$950» · «$-134.025» — entero, con punto de miles, sin M$
const RE_MM = /^M\$-?\d{1,3}(?:\.\d{3})*(?:,\d)?$/;    // «M$29,6» · «M$1.840» — la abreviatura de fmtMM
const esPesos = (s) => RE_PESOS.test(s || "");
const esMM = (s) => RE_MM.test(s || "");
const pesos = (s) => esPesos(s) ? parseInt(s.slice(1).replace(/\./g, ""), 10) : NaN;
const mm = (s) => esMM(s) ? parseFloat(s.slice(2).replace(/\./g, "").replace(",", ".")) : NaN;
const AMBAR = "rgb(194, 65, 12)";     // #C2410C — fg del ChipFila «Solicitud línea»
const AMBAR_BG = "rgb(255, 247, 237)"; // #FFF7ED
const CARENCIA = /^(Sin Línea Cliente - Deudor|Línea Cliente - Deudor sin cupo)$/; // el rótulo FUERA de la oferta: describe qué falta, no pide
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

/* Directorio: `h.encenderDirectorio()` es idempotente en el runner nuevo; la guardia local sirve al viejo, que
   con el toggle ya en «Directorio · 5» no lo encontraba. `h.apagarDirectorio()` viene del runner nuevo. */
const asegurarDirectorio = async (h) => {
  if (await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).count()) { await h.pagina.waitForTimeout(300); return; }
  await h.encenderDirectorio();
};
const apagarDirectorio = async (h) => {
  if (h.apagarDirectorio) return h.apagarDirectorio();
  await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).first().click().catch(() => {}); await h.pagina.waitForTimeout(500);
};
/* Pestaña del tubo («Con línea» / «Sin línea»): parte por `lineaCreditoDe(d).fueraDeLinea`, que es lo mismo que
   el Directorio llama «dentro de línea» / «línea parcial». */
async function pestana(h, rotulo) {
  const b = h.pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo + "\\s*\\d*\\s*$") }).first();
  if (!(await b.count())) throw new Error(`no encuentro la pestaña «${rotulo}» del tubo`);
  await b.click(); await h.pagina.waitForTimeout(700);
  return h.pagina.locator("tr.pl-row").count();
}
/* El filtro rápido activo (peso 600 en el botón) para devolverlo al terminar; el rótulo es el primer nodo de texto. */
const filtroActivo = (h) => h.pagina.evaluate(() => {
  const b = [...document.querySelectorAll('button[title="Filtrar oportunidades"]')].find((x) => +getComputedStyle(x).fontWeight >= 600);
  return b && b.childNodes[0] ? (b.childNodes[0].textContent || "").trim() || null : null;
}).catch(() => null);
/* Foto y restauración de lo que el detalle deja en localStorage (`pc_repo_*` = los repositorios por operación). */
const fotoRepos = (pg) => pg.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("pc_repo_")) o[k] = localStorage.getItem(k); } return o; });
const restaurarRepos = (pg, antes) => pg.evaluate((antes) => {
  const ahora = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("pc_repo_")) ahora[k] = localStorage.getItem(k); }
  const cambios = [];
  for (const k of new Set([...Object.keys(antes), ...Object.keys(ahora)])) {
    if (antes[k] === ahora[k]) continue;
    cambios.push(k.replace(/^pc_repo_/, "") + (k in antes ? " (modificada)" : " (nueva)"));
    if (k in antes) localStorage.setItem(k, antes[k]); else localStorage.removeItem(k);
  }
  return cambios;
}, antes);
/* Simular desde el detalle (como capturar_tabla_simulada.mjs): «Todo lo disponible». */
async function simularCon(det, atajo) {
  const chip = det.locator("button").filter({ hasText: atajo }).first();
  if (!(await chip.count())) throw new Error(`no encuentro el chip «${atajo}» del panel de arranque (¿la operación ya venía simulada?)`);
  await chip.click();
  await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 })
    .catch(() => { throw new Error(`«${atajo}» no simuló: no aparecen las condiciones comerciales`); });
  await det.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
  await det.waitForFunction(() => /Se puede cursar|No se puede cursar/.test(document.body.innerText || ""), null, { timeout: 15000 })
    .catch(() => { throw new Error("tras simular no aparece la tarjeta de veredicto («Se puede cursar…»)"); });
  await det.waitForTimeout(1500);
}
/* Lee de la pantalla todo lo que la regla nombra. Sólo elementos RENDERIZADOS: el innerHTML trae el JSX entero. */
const leer = (det) => det.evaluate(() => {
  const t = document.body.innerText || "";
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const g = (re) => (t.match(re) || []);
  const titular = (() => {
    let m = t.match(/Se puede cursar la oferta completa · (\S+)/); if (m) return { tipo: "completa", cursable: m[1], total: m[1], raw: m[0] };
    m = t.match(/Se puede cursar (\S+) de (\S+)/); if (m) return { tipo: "parcial", cursable: m[1], total: m[2], raw: m[0] };
    m = t.match(/No se puede cursar nada de esta oferta/); if (m) return { tipo: "nada", raw: m[0] };
    m = t.match(/La selección cambió/); if (m) return { tipo: "reeval", raw: m[0] };
    return null;
  })();
  const tot = g(/Total oferta · (\d+) deudor\(es\) · (\d+) factura\(s\)\s*(\S+)/);
  // Condiciones comerciales: la tarjeta «Monto Documentos» (rótulo uppercase → /i) y su valor en el hermano.
  const tarjeta = (rot) => { const d = [...document.querySelectorAll("div")].find((x) => x.children.length === 0 && new RegExp("^" + rot + "$", "i").test(norm(x.textContent))); return d && d.nextElementSibling ? norm(d.nextElementSibling.textContent) : null; };
  // Fila de cada deudor de la oferta (bloque derecho): «$X[ con línea, de $Y] · N fact. · tasa Z%».
  const deudores = [...document.querySelectorAll("span")].filter((sp) => /^\d+ fact\. · tasa [\d.,]+%$/.test(norm(sp.textContent))).map((sp) => {
    const cola = norm(sp.textContent); const todo = norm(sp.parentElement.textContent);
    const cabeza = todo.endsWith(cola) ? todo.slice(0, todo.length - cola.length).trim() : null;
    const m = (cabeza || "").match(/^(\S+)(?: con línea, de (\S+))?$/);
    return m ? { asignado: m[1], monto: m[2] || m[1], fact: +cola.match(/^(\d+)/)[1], raw: todo } : { asignado: "?", monto: "?", fact: 0, raw: todo };
  });
  const chipsLinea = [...document.querySelectorAll('span[title^="Línea disponible de este deudor:"]')].map((s) => norm(s.innerText));
  const chipsSolicitud = [...document.querySelectorAll("span")].filter((s) => s.children.length <= 2 && /^Solicitud línea /.test(norm(s.innerText)))
    .map((s) => { const cs = getComputedStyle(s); return { texto: norm(s.innerText), color: cs.color, bg: cs.backgroundColor, title: s.getAttribute("title") || "" }; });
  // El chip de línea de CADA deudor (en la oferta y fuera de ella), con el nombre del deudor: sube desde el chip
  // hasta la caja de identidad, cuyo primer div lleva la razón social como `title` y como texto.
  const nombreDeudorDe = (el) => { let e = el; for (let k = 0; k < 8 && e; k++) { const nom = [...e.children].find((c) => c.tagName === "DIV" && c.getAttribute("title") && norm(c.textContent) === norm(c.getAttribute("title"))); if (nom) return norm(nom.getAttribute("title")); e = e.parentElement; } return null; };
  const chipsDeudor = [...document.querySelectorAll("span[title]")]
    .filter((s) => /^(Línea disponible de este deudor:|Sin cupo para |Tiene Línea Cliente - Deudor pero sin cupo|No tiene Línea Cliente - Deudor:)/.test(s.getAttribute("title") || ""))
    .map((s) => ({ deudor: nombreDeudorDe(s), rotulo: norm([...s.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("")), texto: norm(s.innerText) }));
  const sinCupoFuera = chipsDeudor.filter((c) => /^(Sin Línea Cliente - Deudor|Línea Cliente - Deudor sin cupo)$/.test(c.rotulo)).length;
  const seccion = (() => { const e = document.querySelector('[title="Monto seleccionado para esta oferta"]'); return e ? norm(e.innerText) : null; })();
  const indicador = (() => { const e = document.querySelector('div[title^="Línea aprobada"]'); return e ? { texto: norm(e.innerText), title: e.getAttribute("title") } : null; })();
  const chipsGiro = [...document.querySelectorAll('span[title^="Giro Normal:"], span[title^="Giro Express:"]')].map((s) => ({ texto: norm(s.innerText), badge: s.lastElementChild && s.children.length ? norm(s.lastElementChild.innerText) : null, title: s.getAttribute("title") }));
  const ctas = [...document.querySelectorAll("button")].map((b) => norm(b.innerText)).filter((s) => /^(Cerrar oferta y publicar|Enviar a Comité y Publicar)$/.test(s));
  const id = (t.match(/OP-DIR\d+/) || [])[0] || "?";
  return { id, titular, total: tot.length ? { deudores: +tot[1], facturas: +tot[2], monto: tot[3] } : null,
    montoDocs: tarjeta("Monto Documentos"), montoGirar: tarjeta("Monto a Girar"), deudores, chipsLinea, chipsSolicitud, chipsDeudor, sinCupoFuera, seccion, indicador, chipsGiro, ctas };
});

/* Comprobaciones comunes a las dos direcciones. Devuelve las cifras para el detalle. */
function comprobarComunes(r) {
  if (!r.titular) throw new Error("no hay titular de veredicto («Se puede cursar…»)");
  if (r.titular.tipo === "nada") throw new Error("la oferta no tiene NADA cursable: el Directorio prometía dentro de línea o parcial · " + r.titular.raw);
  if (r.titular.tipo === "reeval") throw new Error("la tarjeta dice «La selección cambió»: falta re-evaluar antes de leer el veredicto");
  if (/M\$/.test(r.titular.raw)) throw new Error("el titular del veredicto abrevia en M$: «" + r.titular.raw + "»");
  if (!esPesos(r.titular.cursable) || !esPesos(r.titular.total)) throw new Error("el titular no va en pesos con punto de miles: «" + r.titular.raw + "»");
  if (!r.total) throw new Error("no encuentro «Total oferta · N deudor(es) · M factura(s) $X»");
  if (!esPesos(r.total.monto)) throw new Error("«Total oferta» no va en pesos: " + r.total.monto);
  if (pesos(r.total.monto) !== pesos(r.titular.total)) throw new Error(`el titular dice «de ${r.titular.total}» y «Total oferta» dice ${r.total.monto}: la misma cifra en dos valores`);
  if (!r.montoDocs || !esPesos(r.montoDocs)) throw new Error("«Monto Documentos» de Condiciones comerciales no va en pesos: " + r.montoDocs);
  if (pesos(r.montoDocs) !== pesos(r.total.monto)) throw new Error(`«Monto Documentos» ${r.montoDocs} ≠ «Total oferta» ${r.total.monto}: la misma cifra en dos escalas o dos valores`);
  if (!r.montoGirar || !esPesos(r.montoGirar)) throw new Error("«Monto a Girar» no va en pesos: " + r.montoGirar);
  if (r.deudores.length !== r.total.deudores) throw new Error(`filas de deudor leídas ${r.deudores.length} ≠ ${r.total.deudores} del «Total oferta» · ${JSON.stringify(r.deudores.map((d) => d.raw))}`);
  const malos = r.deudores.filter((d) => !esPesos(d.monto) || !esPesos(d.asignado));
  if (malos.length) throw new Error("monto de deudor que no va en pesos: " + JSON.stringify(malos.map((d) => d.raw)));
  const suma = r.deudores.reduce((s, d) => s + pesos(d.monto), 0);
  if (suma !== pesos(r.total.monto)) throw new Error(`la suma de los montos por deudor (${suma}) ≠ «Total oferta» ${r.total.monto}`);
  const nFact = r.deudores.reduce((s, d) => s + d.fact, 0);
  if (nFact !== r.total.facturas) throw new Error(`facturas por deudor ${nFact} ≠ ${r.total.facturas} del total`);
  // TOLERADO a propósito (hallazgo, no gate): el badge «M$Y puntual» dentro del chip «Línea disponible $X».
  const cl = r.chipsLinea.filter((s) => !/^Línea disponible \$\d{1,3}(?:\.\d{3})*(?: M\$[\d.,]+ puntual)?$/.test(s));
  if (cl.length) throw new Error("«Línea disponible» que no va en pesos: " + JSON.stringify(cl));
  // Lo que se queda en M$: chip de sección (= total/1e6), indicador de línea de la cabecera, badge del chip de Giro.
  if (!r.seccion || !esMM(r.seccion) && !(pesos(r.total.monto) < 1e6 && esPesos(r.seccion))) throw new Error("el chip de conteo de sección no va en M$: " + r.seccion);
  if (esMM(r.seccion) && Math.abs(mm(r.seccion) - pesos(r.total.monto) / 1e6) > 0.051) throw new Error(`chip de sección ${r.seccion} ≠ Total oferta ${r.total.monto} / 1e6`);
  if (!r.indicador) throw new Error("no hay indicador de línea en la cabecera");
  if (!/^M\$[\d.,]+ aprobada (Sin cupo disponible|Disponible M\$[\d.,]+)/.test(r.indicador.texto)) throw new Error("el indicador de línea de la cabecera no va en M$: «" + r.indicador.texto + "»");
  // Con «Monto a Girar» no positivo la tarjeta no reparte nada (sólo dibuja los tipos con monto > 0): la oferta se
  // simula pero no se cursa (13-septdecies), y no hay chip de Giro que juzgar.
  const giroPositivo = pesos(r.montoGirar) >= 1;
  if (giroPositivo && !r.chipsGiro.length) throw new Error("no hay chip de Giro en la tarjeta de veredicto");
  const gm = r.chipsGiro.filter((c) => !esMM(c.badge) && !(esPesos(c.badge) && Math.abs(pesos(c.badge)) < 1e6));
  if (gm.length) throw new Error("badge del chip de Giro que no va en M$: " + JSON.stringify(gm));
  if (r.ctas.length !== 1) throw new Error("hay " + r.ctas.length + " CTA principal(es) «Cerrar oferta y publicar / Enviar a Comité y Publicar»: " + JSON.stringify(r.ctas));
  const giroChips = r.chipsGiro.length ? r.chipsGiro.map((c) => c.badge).join("+") : `(sin chip: Monto a Girar ${r.montoGirar}, no se cursa)`;
  return { suma, giroChips };
}

/* Sonda: los detectores rechazan lo que la regla prohíbe donde lo prohíbe. */
function sonda() {
  const casos = [
    ["$24.915.639", true, false], ["$950", true, false], ["M$24,9", false, true], ["M$1.840", false, true], ["M$29,6", false, true],
    ["$24,9", false, false], ["$24.915.639,5", false, false], ["MM$1,31", false, false], ["24.915.639", false, false], ["$24915639", false, false],
    ["$-134.025", true, false], ["M$-1,3", false, true], ["-$134.025", false, false],
  ];
  const fallos = casos.filter(([s, p, m]) => esPesos(s) !== p || esMM(s) !== m).map(([s]) => s);
  if (fallos.length) throw new Error("SONDA: el detector de escala clasifica mal " + JSON.stringify(fallos));
  // El rótulo de carencia (fuera de la oferta) no es «Solicitud línea» ni «Línea disponible».
  const rot = [["Sin Línea Cliente - Deudor", true], ["Línea Cliente - Deudor sin cupo", true], ["Solicitud línea $3.357.624", false], ["Línea disponible $1.000.000", false]];
  const malRot = rot.filter(([s, ok]) => CARENCIA.test(s) !== ok).map(([s]) => s);
  if (malRot.length) throw new Error("SONDA: el detector de carencia clasifica mal " + JSON.stringify(malRot));
  // Un titular PLANTADO en M$ tiene que reventar en comprobarComunes.
  const plantado = { titular: { tipo: "parcial", cursable: "M$24,9", total: "M$29,6", raw: "Se puede cursar M$24,9 de M$29,6" } };
  let cazado = false; try { comprobarComunes(plantado); } catch (e) { cazado = /abrevia en M\$/.test(e.message); }
  if (!cazado) throw new Error("SONDA: un titular plantado en M$ no fue rechazado");
  const plantado2 = { titular: { tipo: "parcial", cursable: "$24.915.639", total: "$29.590.499", raw: "Se puede cursar $24.915.639 de $29.590.499" }, total: { deudores: 1, facturas: 1, monto: "M$29,6" } };
  cazado = false; try { comprobarComunes(plantado2); } catch (e) { cazado = /«Total oferta» no va en pesos/.test(e.message); }
  if (!cazado) throw new Error("SONDA: un «Total oferta» plantado en M$ no fue rechazado");
  return `sonda ${casos.length} textos + ${rot.length} rótulos + 2 plantados rechazados`;
}

export { comprobarComunes, sonda, esPesos, esMM, CARENCIA }; // para refutarlos con lecturas plantadas sin abrir el navegador

/* Abre filas de una pestaña hasta dar con el tipo de veredicto pedido. */
const VISITADAS = new Set(); // ids ya simulados en esta sesión: al simularse una fila puede CAMBIAR de pestaña
async function buscar(h, rotulo, tipo, atajo, max) {
  const intentos = [];
  for (let k = 0; k < max; k++) {
    await pestana(h, rotulo);
    const ids = await h.pagina.evaluate(() => [...document.querySelectorAll("tr.pl-row")].map((r) => ((r.innerText || "").match(/OP-DIR\d+/) || [])[0] || "?"));
    const i = ids.findIndex((id) => !VISITADAS.has(id));
    if (i < 0) break;
    VISITADAS.add(ids[i]);
    let det = null;
    try {
      det = await h.abrirDetalle(i);
      await simularCon(det, atajo);
      const r = await leer(det);
      if (r.titular && r.titular.tipo === tipo) return { r, det, intentos };
      intentos.push(`${r.id}: ${r.titular ? r.titular.raw : "sin titular"} · CTA ${JSON.stringify(r.ctas)}`);
    } catch (e) { intentos.push(`${ids[i]}: ${e.message}`); }
    if (det) await det.close().catch(() => {});
  }
  throw new Error(`ninguna fila de «${rotulo}» dio un veredicto «${tipo}» con «${atajo}»: ${intentos.join(" | ") || "(sin filas sin visitar)"}`);
}

/* «Opciones › Sacar facturas sin línea»: retira de la oferta las facturas REQUIERE_COMITE (las de los deudores
   sin cupo) y deja la selección pendiente de re-evaluar. Devuelve el rótulo del botón («… · N fact.»). */
async function sacarSinLinea(det) {
  await det.locator('button[title="Cargar XML del cliente, o agregar y sacar facturas de la oferta en bloque"]').first().click();
  const sacar = det.locator("button", { hasText: /^\s*Sacar facturas sin línea · \d+ fact\./ }).first();
  if (!(await sacar.count())) throw new Error("el menú «Opciones» no ofrece «Sacar facturas sin línea»");
  if (await sacar.isDisabled()) throw new Error("«Sacar facturas sin línea» está deshabilitado (la oferta quedaría vacía): no se puede probar la dirección fuera de la oferta en esta fila");
  const txt = norm(await sacar.innerText());
  await sacar.click();
  await det.waitForFunction(() => /La selección cambió/.test(document.body.innerText || ""), null, { timeout: 15000 })
    .catch(() => { throw new Error("tras «Sacar facturas sin línea» no aparece «La selección cambió»"); });
  await det.waitForTimeout(600);
  return txt;
}
/* El chip de línea del deudor `nombre` tal como se ve ahora (se busca por nombre si no está en la página: la
   lista de disponibles va paginada y partida en «Deudores aprobados línea» / «Deudores sin aprobar»). */
async function chipDe(det, nombre) {
  const en = (r) => r.chipsDeudor.find((x) => x.deudor === nombre);
  let ch = en(await leer(det));
  if (ch) return ch;
  const q = det.locator('input[placeholder^="Buscar empresa deudora"]').first();
  if (!(await q.count())) return null;
  for (const tab of [/^\s*Deudores sin aprobar\s*\d+\s*$/, /^\s*Deudores aprobados línea\s*\d+\s*$/]) {
    await q.fill(nombre); await det.waitForTimeout(400);
    const b = det.locator("button", { hasText: tab }).first();
    if (await b.count()) { await b.click(); await det.waitForTimeout(300); }
    ch = en(await leer(det));
    if (ch) break;
  }
  await q.fill(""); await det.waitForTimeout(300);
  return ch || null;
}

export const casos = [
  { id: "e2e-29-a", titulo: "en el detalle los montos de documento van en pesos (titular «Se puede cursar la oferta completa · $X», monto por deudor, «Línea disponible $», «Total oferta» = «Monto Documentos» = suma por deudor) y el M$ queda en el chip de sección, el indicador de línea y el chip de Giro; dentro de línea el CTA dice «Cerrar oferta y publicar» y no hay «Solicitud línea»",
    correr: async (h) => {
      let det = null, detalle = null;
      const antes = await fotoRepos(h.pagina).catch(() => ({}));
      const filtro0 = await filtroActivo(h);
      try {
        const s = sonda();
        await asegurarDirectorio(h);
        const b = await buscar(h, "Con línea", "completa", "Deudores con línea", 3);
        det = b.det; const r = b.r;
        const c = comprobarComunes(r);
        if (pesos(r.titular.cursable) !== pesos(r.total.monto)) throw new Error(`«oferta completa · ${r.titular.cursable}» ≠ Total oferta ${r.total.monto}`);
        // Dirección negativa del CTA y del chip: sin deudores sin cupo no se manda nada al comité.
        if (r.ctas[0] !== "Cerrar oferta y publicar") throw new Error("dentro de línea el CTA dice «" + r.ctas[0] + "» y no «Cerrar oferta y publicar»");
        if (r.chipsSolicitud.length) throw new Error("dentro de línea hay chips «Solicitud línea»: " + JSON.stringify(r.chipsSolicitud));
        if (r.deudores.some((d) => d.asignado !== d.monto)) throw new Error("dentro de línea hay deudores con «con línea, de»: " + JSON.stringify(r.deudores.filter((d) => d.asignado !== d.monto).map((d) => d.raw)));
        // El chip «Línea disponible $» se dibuja también en los deudores FUERA de la oferta (Documentos disponibles): al menos uno por deudor en la oferta.
        if (r.chipsLinea.length < r.deudores.length) throw new Error(`dentro de línea hay ${r.chipsLinea.length} chips «Línea disponible $» para ${r.deudores.length} deudores`);
        // Cada chip de línea leído tiene dueño (el lector por nombre es el que usa el caso b): ninguno sin deudor.
        const huerfanos = r.chipsDeudor.filter((x) => !x.deudor);
        if (huerfanos.length) throw new Error("chips de línea sin deudor legible: " + JSON.stringify(huerfanos.map((x) => x.texto)));
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        detalle = `${r.id} · «${r.titular.raw}» · Total oferta ${r.total.monto} (${r.total.deudores} deudores · ${r.total.facturas} fact.) = Monto Documentos ${r.montoDocs} = Σ deudores ${c.suma.toLocaleString("es-CL")} · Monto a Girar ${r.montoGirar} · «Línea disponible» ×${r.chipsLinea.length} en pesos (chips de línea con dueño ${r.chipsDeudor.length}, sin cupo fuera ${r.sinCupoFuera}) · sección ${r.seccion} · cabecera «${r.indicador.texto}» · giro ${c.giroChips} · CTA «${r.ctas[0]}» · Solicitud línea ×0 · ${s}` + (b.intentos.length ? ` · saltadas: ${b.intentos.join(" | ")}` : "");
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h).catch(() => {});
        if (filtro0) await pestana(h, filtro0).catch(() => {});
        const cambios = await restaurarRepos(h.pagina, antes).catch(() => null);
        if (detalle != null) detalle += ` · localStorage pc_repo_*: ${cambios === null ? "no se pudo leer" : cambios.length ? "tocó " + cambios.join(", ") + " → restaurado" : "sin rastro"}`;
      }
      return detalle;
    } },
  { id: "e2e-29-b", titulo: "con línea parcial el titular dice «Se puede cursar $X de $Y» en pesos con Y = «Total oferta», el CTA dice «Enviar a Comité y Publicar» y cada deudor con faltante ya en la oferta —de cupo cero o parcial— muestra «Solicitud línea $Z» en ámbar con Z = lo que no se le asignó; sacadas esas facturas de la oferta, los mismos deudores vuelven a describir la carencia sin «Solicitud línea», la oferta que queda es $X cursable completa y el CTA vuelve a «Cerrar oferta y publicar»",
    correr: async (h) => {
      let det = null, detalle = null;
      const antes = await fotoRepos(h.pagina).catch(() => ({}));
      const filtro0 = await filtroActivo(h);
      try {
        await asegurarDirectorio(h);
        const b = await buscar(h, "Sin línea", "parcial", "Todo lo disponible", 3);
        det = b.det; const r = b.r;
        const c = comprobarComunes(r);
        const X = pesos(r.titular.cursable), Y = pesos(r.titular.total);
        if (!(X > 0 && X < Y)) throw new Error(`«${r.titular.raw}»: se esperaba 0 < X < Y`);
        if (r.ctas[0] !== "Enviar a Comité y Publicar") throw new Error("con deudores sin cupo el CTA dice «" + r.ctas[0] + "» y no «Enviar a Comité y Publicar»");
        if (!r.chipsSolicitud.length) throw new Error("con deudores sin cupo no hay ningún chip «Solicitud línea $Z» (fuera-de-oferta describiendo carencia: " + r.sinCupoFuera + ")");
        // «Solicitud línea $Z»: Z es lo que la evaluación NO le asignó a ese deudor —`monto − asignado`, leído de
        // su propia fila («$X con línea, de $Y»)— y lo pide TODO deudor con faltante, no sólo el de cupo cero
        // (17-09-2026, regla 29: antes un PARCIAL no escribía en ninguna parte la plata que iba a pedir).
        // Tolerancia de $1: la cifra pasa por `mmRound` y por el formateador antes de volver como texto.
        const conFalta = r.deudores.map((d) => ({ ...d, falta: pesos(d.monto) - pesos(d.asignado) })).filter((d) => d.falta > 0);
        const ceros = r.deudores.filter((d) => d.asignado === "$0");
        const casa = (z) => conFalta.some((d) => Math.abs(d.falta - z) <= 1);
        if (r.chipsSolicitud.length !== conFalta.length)
          throw new Error(`hay ${conFalta.length} deudor(es) con faltante en la oferta y ${r.chipsSolicitud.length} chip(s) «Solicitud línea»: todo faltante tiene que estar escrito en su fila (faltantes ${JSON.stringify(conFalta.map((d) => d.falta))})`);
        for (const ch of r.chipsSolicitud) {
          const m = ch.texto.match(/^Solicitud línea (\S+)$/);
          if (!m || !esPesos(m[1])) throw new Error("chip «Solicitud línea» que no va en pesos: " + JSON.stringify(ch));
          if (ch.color !== AMBAR || ch.bg !== AMBAR_BG) throw new Error(`chip «${ch.texto}» no va en ámbar #C2410C/#FFF7ED: ${ch.color} / ${ch.bg}`);
          if (!casa(pesos(m[1]))) throw new Error(`«${ch.texto}» no es el faltante de ningún deudor de la oferta: ${JSON.stringify(conFalta.map((d) => d.falta))}`);
          if (!/entra como línea PUNTUAL en la solicitud al comité/.test(ch.title)) throw new Error("el tooltip del chip no dice que entra como PUNTUAL al comité: " + ch.title);
        }
        const sumaZ = r.chipsSolicitud.reduce((s, ch) => s + pesos(ch.texto.replace(/^Solicitud línea /, "")), 0);
        if (sumaZ > Y - X) throw new Error(`Σ «Solicitud línea» ${sumaZ} > Y − X = ${Y - X}`);
        // El hallazgo que esta observación anotaba —«un PARCIAL no escribe la plata que va a pedir»— quedó CERRADO el
        // 17-09-2026: la comprobación de arriba exige un chip por faltante, así que ya no hay deudor mudo. Lo que se
        // sigue reportando es cuántos de ellos son parciales, que es el caso que antes no se veía.
        const parciales = conFalta.length - ceros.length;
        // Los que piden, CON NOMBRE: son los deudores que la maniobra de abajo va a dejar fuera de la oferta.
        const piden = r.chipsDeudor.filter((x) => /^Solicitud línea /.test(x.rotulo));
        if (piden.length !== r.chipsSolicitud.length) throw new Error(`el lector por deudor ve ${piden.length} «Solicitud línea» y el lector de chips ${r.chipsSolicitud.length}`);
        if (piden.some((x) => !x.deudor)) throw new Error("no pude leer el nombre del deudor de un chip «Solicitud línea»: " + JSON.stringify(piden.filter((x) => !x.deudor).map((x) => x.texto)));
        if (r.sinCupoFuera) throw new Error("con «Todo lo disponible» no queda deudor fuera de la oferta, pero hay rótulos de carencia: " + r.sinCupoFuera);
        // DIRECCIÓN «fuera de la oferta no se pide nada»: «Opciones › Sacar facturas sin línea» retira exactamente las
        // facturas REQUIERE_COMITE, así que esos mismos deudores pasan a «Documentos disponibles».
        const sacado = await sacarSinLinea(det);
        const r2 = await leer(det);
        if (r2.chipsSolicitud.length) throw new Error("con las facturas sin línea FUERA de la oferta sigue habiendo «Solicitud línea»: " + JSON.stringify(r2.chipsSolicitud.map((x) => x.texto)));
        // «Sacar facturas sin línea» retira sólo las REQUIERE_COMITE, así que los que pedían terminan en DOS
        // sitios y hay que exigirle a cada uno lo suyo (17-09-2026, con el chip del PARCIAL): el de cupo cero
        // se va entero a «Documentos disponibles» y ahí describe la CARENCIA; el PARCIAL se queda en la oferta
        // con la parte que sí cabía y vuelve a decir «Línea disponible $X», que es cierto. Lo que ninguno
        // puede seguir diciendo es «Solicitud línea» —ya comprobado sobre la pantalla entera—: fuera de la
        // oferta, o sin faltante, no se pide nada.
        const fuera = [], quedan = [], noVistos = [];
        for (const p of piden) {
          const ch = await chipDe(det, p.deudor);
          if (!ch) { noVistos.push(p.deudor); continue; }
          if (/^Solicitud línea /.test(ch.rotulo)) throw new Error(`${p.deudor} sigue pidiendo línea después de sacar sus facturas sin línea: «${ch.rotulo}»`);
          if (CARENCIA.test(ch.rotulo)) fuera.push(`${p.deudor}: «${p.rotulo}» → «${ch.rotulo}»`);
          else if (/^Línea disponible /.test(ch.rotulo)) quedan.push(`${p.deudor}: «${p.rotulo}» → «${ch.rotulo}» (parcial: se quedó con lo que cabía)`);
          else throw new Error(`tras sacar las facturas sin línea ${p.deudor} dice «${ch.rotulo}»: se esperaba la carencia («Sin Línea Cliente - Deudor» / «Línea Cliente - Deudor sin cupo») o «Línea disponible $X»`);
        }
        if (!fuera.length && !quedan.length) throw new Error("ninguno de los deudores que pedían línea se encontró después de sacar sus facturas: " + JSON.stringify(noVistos));
        if (!fuera.length) throw new Error(`ningún deudor de cupo cero quedó FUERA de la oferta describiendo la carencia (los ${quedan.length} que pedían eran todos parciales): ${JSON.stringify(quedan)}`);
        if (noVistos.length) throw new Error(`deudores que pedían y no aparecen fuera de la oferta: ${JSON.stringify(noVistos)}`);
        // Re-evaluada, lo que queda es exactamente lo que tenía línea: Total oferta = X, cursable completa, CTA sin comité.
        const reev = det.locator("button", { hasText: /^\s*Re-evaluar operación\s*$/ }).first();
        if (!(await reev.count())) throw new Error("no aparece «Re-evaluar operación» tras sacar las facturas sin línea");
        await reev.click();
        await det.waitForFunction(() => /Se puede cursar|No se puede cursar/.test(document.body.innerText || ""), null, { timeout: 15000 })
          .catch(() => { throw new Error("tras re-evaluar no vuelve la tarjeta de veredicto («Se puede cursar…»)"); });
        await det.waitForTimeout(800);
        const r3 = await leer(det);
        const c3 = comprobarComunes(r3);
        if (pesos(r3.total.monto) !== X) throw new Error(`sacadas las facturas sin línea, «Total oferta» ${r3.total.monto} ≠ los ${X.toLocaleString("es-CL")} cursables del titular anterior`);
        if (r3.chipsSolicitud.length) throw new Error("re-evaluada sin deudores sin cupo, hay «Solicitud línea»: " + JSON.stringify(r3.chipsSolicitud.map((x) => x.texto)));
        if (r3.ctas[0] !== "Cerrar oferta y publicar") throw new Error("sin deudores sin cupo en la oferta el CTA dice «" + r3.ctas[0] + "» y no «Cerrar oferta y publicar»");
        if (r3.titular.tipo !== "completa" || pesos(r3.titular.cursable) !== X) throw new Error(`re-evaluada, el titular dice «${r3.titular.raw}» y no «Se puede cursar la oferta completa · $${X.toLocaleString("es-CL")}»`);
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        detalle = `${r.id} · «${r.titular.raw}» · Total oferta ${r.total.monto} = Monto Documentos ${r.montoDocs} = Σ deudores ${c.suma.toLocaleString("es-CL")} · CTA «${r.ctas[0]}» · Solicitud línea ×${r.chipsSolicitud.length} [${r.chipsSolicitud.map((x) => x.texto).join(", ")}] en ${r.chipsSolicitud[0].color}/${r.chipsSolicitud[0].bg}, Σ ${sumaZ.toLocaleString("es-CL")} ≤ Y−X ${(Y - X).toLocaleString("es-CL")} · ${conFalta.length} deudor(es) con faltante = ${ceros.length} con $0 + ${parciales} parcial(es), todos con chip · sección ${r.seccion} · cabecera «${r.indicador.texto}» · giro ${c.giroChips} · FUERA: «${sacado}» → Solicitud línea ×0, ${fuera.length}/${piden.length} describen la carencia fuera de la oferta y ${quedan.length} parcial(es) se quedaron con su línea [${[...fuera, ...quedan].join(" | ")}] · re-evaluada: «${r3.titular.raw}» = Total oferta ${r3.total.monto} (${r3.total.deudores} deudores · ${r3.total.facturas} fact.), CTA «${r3.ctas[0]}», sección ${r3.seccion}, giro ${c3.giroChips}` + (b.intentos.length ? ` · saltadas: ${b.intentos.join(" | ")}` : "");
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h).catch(() => {});
        if (filtro0) await pestana(h, filtro0).catch(() => {});
        const cambios = await restaurarRepos(h.pagina, antes).catch(() => null);
        if (detalle != null) detalle += ` · localStorage pc_repo_*: ${cambios === null ? "no se pudo leer" : cambios.length ? "tocó " + cambios.join(", ") + " → restaurado" : "sin rastro"}`;
      }
      return detalle;
    } },
];
