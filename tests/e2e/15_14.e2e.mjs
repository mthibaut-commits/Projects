/* Gate e2e de la regla 14 (reevaluación explícita) en el detalle REAL: agregar o quitar facturas NO dispara
   cálculo; lo aritmético (conteo y monto de la oferta) se actualiza al instante y lo que depende de la línea
   o de la verificación queda SIN número hasta apretar «Re-evaluar operación». Tres casos:
     · e2e-14-a / e2e-14-b (agregar / quitar): TITULAR del veredicto («La selección cambió», sin cifra vieja ni
       nueva) y FILAS de la oferta («Sin evaluar»), con la aritmética al día y Re-evaluar devolviendo la cifra.
       Dirección negativa: si alguien quita `reevalPend ? null`, aparece una cifra y el caso cae.
     · e2e-14-c (SNAPSHOT del defecto, pasa en verde fijando lo que el código hace): el PIE de la misma tarjeta
       —compuertas «Verificación» y «Línea» y los chips de giro— tampoco debería afirmar un número durante la
       pendencia. Hoy lo hace:
       `nSinLinea` da 0 con `evalLin === null` y la compuerta Línea se pinta VERDE con «Deudores con línea N»;
       `verifRes` y `giros` (girosDeDeal → verifDeudorDeal + evaluarOtorgItems) se recalculan en cada render
       sin mirar `reevalPend`. Cuando se corrija, este caso falla y hay que darlo vuelta en el mismo commit.
   La foto lee el pie por `title` (las compuertas y los chips llevan su explicación ahí), nunca por clases.
   Se mide además, sin afirmarlo, el registro de versiones (`SIM_VERSIONS`) del detalle. */

const TIP_PLANA_DISP = "Todas las facturas en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TIP_PLANA_OFERTA = "Todas las facturas de la oferta en una sola lista, de la más nueva a la más antigua (folio descendente).";
const TITULO_AGREGAR = "Agregar a la simulación";
const TITULO_RETIRAR = "Retirar esta factura de la oferta";
const num = (s) => { if (!s) return null; return s.startsWith("M$") ? parseFloat(s.slice(2).replace(/\./g, "").replace(",", ".")) : parseFloat(s.slice(1).replace(/\./g, "")) / 1e6; };
const apagarDirectorio = async (h) => { await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).first().click().catch(() => {}); await h.pagina.waitForTimeout(500); };
const asegurarDirectorio = async (h) => {
  if (await h.pagina.locator("button", { hasText: /^\s*Directorio · \d+\s*$/ }).count()) { await h.pagina.waitForTimeout(300); return; }
  await h.encenderDirectorio();
};
async function abrirPlana(det, tip, que) {
  const seg = det.locator(`button[title="${tip}"]`);
  if (!(await seg.count())) throw new Error(`no encuentro el segmentado «Por factura» de ${que}`);
  await seg.first().click(); await det.waitForTimeout(400);
}
/* Primera fila incorporable de la plana de disponibles (folio y monto como se muestran) y la agrega. */
async function agregarPrimera(det) {
  const fila = await det.evaluate((T) => {
    const b = document.querySelector(`button[title="${T}"]:not([disabled])`); if (!b) return null;
    const c = [...b.parentElement.children].map((x) => (x.textContent || "").trim());
    return { folio: (c[1] || "").replace(/^#/, ""), monto: c.find((x) => /^M?\$[\d.,]+$/.test(x)) || null };
  }, TITULO_AGREGAR);
  if (!fila || !fila.folio || !fila.monto) throw new Error("no hay fila incorporable en Documentos disponibles: " + JSON.stringify(fila));
  await det.locator(`button[title="${TITULO_AGREGAR}"]:not([disabled])`).first().click();
  await det.waitForTimeout(500);
  return fila;
}
/* Foto de lo que la pantalla AFIRMA sobre la oferta: lo aritmético, el veredicto y las filas. */
const foto = (det) => det.evaluate(({ TITULO_RETIRAR }) => {
  const t = document.body.innerText || "";
  const id = (t.match(/OP-DIR\d+/) || [])[0] || "?";
  const of = (() => { const i = t.search(/Documentos en la oferta/i); if (i < 0) return null; const m = t.slice(i, i + 220).match(/(\d+) deudor(?:es)? · (\d+) facturas? por\s+(M?\$[\d.,]+)/i); return m ? { deudores: +m[1], facturas: +m[2], monto: m[3] } : null; })();
  // Titular del veredicto con CIFRA (cualquiera de las tres formas que la escriben).
  const cifra = (t.match(/Se puede cursar la oferta completa · \$[\d.]+|Se puede cursar \$[\d.]+ de \$[\d.]+|No se puede cursar nada de esta oferta/) || [])[0] || null;
  const botones = [...document.querySelectorAll("button")];
  const reev = botones.find((b) => /Re-evaluar operación|Re-evaluando…/.test(b.textContent || ""));
  // Filas de la oferta (vista plana): estado de línea por fila, leído de la celda que sigue al origen.
  const filas = [...document.querySelectorAll(`button[title="${TITULO_RETIRAR}"]`)].map((b) => {
    const c = [...b.parentElement.children].map((x) => (x.textContent || "").trim());
    return { folio: (c[1] || "").replace(/^#/, ""), estado: c.find((x) => /^(Sin evaluar|Se puede cursar|Requiere comité)/.test(x)) || null };
  });
  // PIE de la tarjeta: las compuertas llevan su explicación en `title`; los chips de giro también.
  const comp = (frags) => { const e = [...document.querySelectorAll("span[title]")].find((x) => frags.some((fr) => (x.getAttribute("title") || "").includes(fr))); return e ? (e.innerText || "").replace(/\s+/g, " ").trim() : null; };
  const pie = { otorg: comp(["motor de otorgamiento", "Reglas aprobadas"]), verif: comp(["verificación telefónica"]), linea: comp(["línea disponible", "línea vigente"]),
    giros: [...document.querySelectorAll("[title^='Giro Normal:'],[title^='Giro Express:']")].map((e) => (e.getAttribute("title") || "").split(" en ")[0]) };
  let versiones = null; try { versiones = ((typeof SIM_VERSIONS !== "undefined" && SIM_VERSIONS[id]) || []).length; } catch (_) { versiones = "n/d"; }
  return { id, of, cifra, pendiente: /La selección cambió/.test(t) && /falta re-evaluar la línea/.test(t),
    reev: reev ? { texto: (reev.textContent || "").trim(), disabled: reev.disabled } : null, filas, pie, versiones,
    condiciones: /condiciones comerciales/i.test(t), simulando: /simulando/i.test(t) };
}, { TITULO_RETIRAR });
async function simularConDos(det) {
  await abrirPlana(det, TIP_PLANA_DISP, "Documentos disponibles");
  const f1 = await agregarPrimera(det); const f2 = await agregarPrimera(det);
  await det.waitForFunction(() => /Tienes 2 facturas elegidas/.test(document.body.innerText || ""), null, { timeout: 10000 });
  await det.locator("button", { hasText: /Simular la oferta/ }).first().click();
  await det.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || "") && !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 })
    .catch(() => { throw new Error("«Simular la oferta» no simuló"); });
  await det.waitForFunction(() => /Se puede cursar|No se puede cursar/.test(document.body.innerText || ""), null, { timeout: 15000 })
    .catch(() => { throw new Error("tras simular no aparece el veredicto de línea"); });
  await det.waitForTimeout(800);
  return [f1, f2];
}
async function reevaluar(det) {
  const btn = det.locator("button", { hasText: /^\s*Re-evaluar operación\s*$/ }).first();
  if (!(await btn.count())) throw new Error("no hay botón «Re-evaluar operación» con la selección cambiada");
  await btn.click();
  await det.waitForFunction(() => !/La selección cambió|Re-evaluando…/.test(document.body.innerText || ""), null, { timeout: 15000 })
    .catch(() => { throw new Error("«Re-evaluar operación» no resolvió la pendencia"); });
  await det.waitForTimeout(600);
}
/* Comprueba la pendencia: aritmética al día, veredicto sin cifra, filas sin evaluar, botón presente. */
function exigirPendiente(p0, p1, delta, glosa) {
  if (!p1.of || !p0.of) throw new Error(`${glosa}: no leo el conteo de «Documentos en la oferta»: ` + JSON.stringify({ antes: p0.of, despues: p1.of }));
  if (p1.of.facturas !== p0.of.facturas + delta.n) throw new Error(`${glosa}: el conteo NO se actualizó al instante: ${p0.of.facturas} → ${p1.of.facturas} (esperado ${p0.of.facturas + delta.n})`);
  const esperado = num(p0.of.monto) + delta.monto;
  if (Math.abs(num(p1.of.monto) - esperado) > 0.11) throw new Error(`${glosa}: el monto de la oferta NO es aritmético: ${p0.of.monto} ${delta.monto >= 0 ? "+" : "−"} M$${Math.abs(delta.monto).toFixed(1)} ≠ ${p1.of.monto}`);
  if (!p1.pendiente) throw new Error(`${glosa}: la tarjeta no dice «La selección cambió · … falta re-evaluar la línea»`);
  if (p1.cifra) throw new Error(`${glosa}: con la selección cambiada la pantalla sigue afirmando una cifra de línea: «${p1.cifra}» (antes: «${p0.cifra}») — se recalculó o quedó la vieja`);
  if (!p1.reev || p1.reev.disabled) throw new Error(`${glosa}: no hay botón «Re-evaluar operación» habilitado: ` + JSON.stringify(p1.reev));
  const sinEval = p1.filas.filter((f) => f.estado === "Sin evaluar").length;
  if (p1.filas.length !== p1.of.facturas || sinEval !== p1.filas.length) throw new Error(`${glosa}: ${sinEval} de ${p1.filas.length} filas dicen «Sin evaluar» (oferta: ${p1.of.facturas}); alguna fila muestra un estado de línea que nadie evaluó: ` + JSON.stringify(p1.filas));
}
const pieTxt = (p) => `Línea «${p.pie.linea}» · Verificación «${p.pie.verif}» · giros [${p.pie.giros.join(" | ")}]`;
/* (14-c) SNAPSHOT del defecto: la regla 14 pide que durante la pendencia NADA afirme un número, y el titular y las
   filas ya lo cumplen (14-a y 14-b). El PIE de la tarjeta —compuertas «Verificación» y «Línea» y los chips de giro—
   NO: `nSinLinea` da 0 con `evalLin === null` y la compuerta Línea se pinta verde, y `verifRes`/`girosDeDeal` se
   recalculan en cada render sin mirar `reevalPend`. Repararlo es de la pantalla del detalle y quedó como decisión
   del usuario (tablero), así que acá se FIJA lo que el código hace hoy: el día que el pie deje de afirmar números,
   este caso falla y hay que darlo vuelta —pasar a exigir «sin número»— en el mismo commit que lo corrija. */
function fijarPieQueAfirma(p1, p0, glosa) {
  const afirma = [];
  if (p1.pie.linea && /\d/.test(p1.pie.linea)) afirma.push(`Línea «${p1.pie.linea}»`);
  if (p1.pie.verif && /\d/.test(p1.pie.verif)) afirma.push(`Verificación «${p1.pie.verif}»`);
  if (p1.pie.giros.length) afirma.push(`giro ${p1.pie.giros.join(" + ")}`);
  if (!afirma.length) throw new Error(`${glosa}: el pie YA NO afirma números durante la pendencia (antes: ${pieTxt(p0)}). El defecto está corregido: este caso tiene que pasar a EXIGIR el pie sin número (regla 14).`);
  return afirma;
}
function exigirEvaluada(p, glosa) {
  if (!p.cifra) throw new Error(`${glosa}: el veredicto no volvió con cifra`);
  if (p.pendiente) throw new Error(`${glosa}: sigue «La selección cambió»`);
  const sinEval = p.filas.filter((f) => f.estado === "Sin evaluar").length;
  if (!p.filas.length || sinEval) throw new Error(`${glosa}: ${sinEval} fila(s) siguen «Sin evaluar» tras re-evaluar: ` + JSON.stringify(p.filas));
}

export const casos = [
  { id: "e2e-14-a", titulo: "agregar una factura a la oferta simulada no dispara cálculo: conteo y monto al instante, TITULAR «La selección cambió» sin cifra y FILAS «Sin evaluar» hasta «Re-evaluar operación», que devuelve la cifra (el pie de la tarjeta lo gatea 14-c)",
    correr: async (h) => {
      let det = null;
      try {
        await asegurarDirectorio(h);
        det = await h.abrirDetalle(0);
        const [f1, f2] = await simularConDos(det);
        await abrirPlana(det, TIP_PLANA_OFERTA, "Documentos en la oferta");
        const p0 = await foto(det);
        if (!p0.cifra || p0.pendiente || !p0.of || p0.of.facturas !== 2) throw new Error("estado de partida no evaluado: " + JSON.stringify({ cifra: p0.cifra, pendiente: p0.pendiente, of: p0.of }));
        if (p0.filas.some((f) => f.estado === "Sin evaluar" || !f.estado)) throw new Error("tras simular hay filas sin estado de línea: " + JSON.stringify(p0.filas));
        // AGREGAR una tercera desde disponibles → pendiente, sin número.
        const f3 = await agregarPrimera(det);
        if ([f1.folio, f2.folio].includes(f3.folio)) throw new Error("la plana volvió a ofrecer un folio ya en la oferta: " + f3.folio);
        const p1 = await foto(det);
        exigirPendiente(p0, p1, { n: +1, monto: num(f3.monto) }, "tras agregar #" + f3.folio);
        if (p1.versiones !== "n/d" && p1.versiones !== p0.versiones) throw new Error(`agregar emitió una versión: ${p0.versiones} → ${p1.versiones}`);
        // RE-EVALUAR → vuelve la cifra y las tres filas quedan evaluadas.
        await reevaluar(det);
        const p2 = await foto(det);
        exigirEvaluada(p2, "tras re-evaluar");
        if (p2.of.facturas !== 3 || !p2.filas.some((f) => f.folio === f3.folio && f.estado !== "Sin evaluar")) throw new Error("la factura agregada no quedó evaluada: " + JSON.stringify({ of: p2.of, filas: p2.filas }));
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        return `${p0.id} · simulada con 2 (${p0.of.monto}, «${p0.cifra}») · +#${f3.folio} ${f3.monto} → ${p1.of.facturas} fact. por ${p1.of.monto} al instante, veredicto «La selección cambió» sin cifra, ${p1.filas.length}/${p1.filas.length} filas «Sin evaluar», botón «${p1.reev.texto}» · versiones ${p0.versiones}→${p1.versiones} · pie durante la pendencia (medido acá, gateado en 14-c): ${pieTxt(p1)} · Re-evaluar → «${p2.cifra}», ${p2.filas.map((f) => f.estado).join("/")}`;
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h);
      }
    } },
  { id: "e2e-14-b", titulo: "quitar una factura tampoco dispara cálculo: el conteo y el monto bajan al instante, el TITULAR queda «La selección cambió» sin cifra y las FILAS «Sin evaluar» hasta re-evaluar (el pie lo gatea 14-c)",
    correr: async (h) => {
      let det = null;
      try {
        await asegurarDirectorio(h);
        det = await h.abrirDetalle(1);
        const [f1] = await simularConDos(det);
        await abrirPlana(det, TIP_PLANA_OFERTA, "Documentos en la oferta");
        const p0 = await foto(det);
        if (!p0.cifra || p0.pendiente || !p0.of || p0.of.facturas !== 2) throw new Error("estado de partida no evaluado: " + JSON.stringify({ cifra: p0.cifra, pendiente: p0.pendiente, of: p0.of }));
        // QUITAR f1 (confirmando en el diálogo).
        const idx = await det.evaluate(({ T, folio }) => [...document.querySelectorAll(`button[title="${T}"]`)].findIndex((b) => ((b.parentElement.children[1] || {}).textContent || "").trim() === "#" + folio), { T: TITULO_RETIRAR, folio: f1.folio });
        if (idx < 0) throw new Error("no encuentro el ícono de retiro del folio " + f1.folio);
        await det.locator(`button[title="${TITULO_RETIRAR}"]`).nth(idx).click(); await det.waitForTimeout(300);
        await det.getByRole("button", { name: "Retirar factura", exact: true }).click(); await det.waitForTimeout(700);
        const p1 = await foto(det);
        exigirPendiente(p0, p1, { n: -1, monto: -num(f1.monto) }, "tras retirar #" + f1.folio);
        if (p1.versiones !== "n/d" && p1.versiones !== p0.versiones) throw new Error(`retirar emitió una versión: ${p0.versiones} → ${p1.versiones}`);
        await reevaluar(det);
        const p2 = await foto(det);
        exigirEvaluada(p2, "tras re-evaluar");
        if (p2.of.facturas !== 1) throw new Error("la oferta no quedó con 1 factura: " + JSON.stringify(p2.of));
        const errs = det._erroresE2E || [];
        if (errs.length) throw new Error("errores de página en el detalle: " + errs.join(" | "));
        return `${p0.id} · simulada con 2 (${p0.of.monto}, «${p0.cifra}») · −#${f1.folio} ${f1.monto} → ${p1.of.facturas} fact. por ${p1.of.monto} al instante, «La selección cambió» sin cifra, ${p1.filas.length}/${p1.filas.length} «Sin evaluar» · versiones ${p0.versiones}→${p1.versiones} · pie durante la pendencia (medido acá, gateado en 14-c): ${pieTxt(p1)} · Re-evaluar → «${p2.cifra}»`;
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h);
      }
    } },
  { id: "e2e-14-c", titulo: "SNAPSHOT del defecto de la regla 14 en el PIE de la tarjeta: con «La selección cambió» en pantalla las compuertas Verificación y Línea y los chips de giro siguen afirmando números — se recalculan las tres al agregar y pinta «Deudores con línea N» en verde",
    correr: async (h) => {
      let det = null;
      try {
        await asegurarDirectorio(h);
        det = await h.abrirDetalle(0);
        const [f1, f2] = await simularConDos(det);
        await abrirPlana(det, TIP_PLANA_OFERTA, "Documentos en la oferta");
        const p0 = await foto(det);
        if (!p0.cifra || p0.pendiente || !p0.of || p0.of.facturas !== 2) throw new Error("estado de partida no evaluado: " + JSON.stringify({ cifra: p0.cifra, pendiente: p0.pendiente, of: p0.of }));
        if (!p0.pie.linea || !p0.pie.verif) throw new Error("no leo las compuertas del pie por su title (cambió la forma; revisar el gate): " + JSON.stringify(p0.pie));
        const f3 = await agregarPrimera(det);
        if ([f1.folio, f2.folio].includes(f3.folio)) throw new Error("la plana volvió a ofrecer un folio ya en la oferta: " + f3.folio);
        const p1 = await foto(det);
        exigirPendiente(p0, p1, { n: +1, monto: num(f3.monto) }, "tras agregar #" + f3.folio); // lo de 14-a tiene que seguir en pie
        const afirmaPie = fijarPieQueAfirma(p1, p0, "tras agregar #" + f3.folio);
        await reevaluar(det);
        const p2 = await foto(det);
        exigirEvaluada(p2, "tras re-evaluar");
        return `${p0.id} · antes: ${pieTxt(p0)} · pendiente: ${pieTxt(p1)} · tras Re-evaluar: ${pieTxt(p2)} · DEFECTO fijado: durante la pendencia el pie sigue afirmando ${afirmaPie.join(", ")} (decisión del tablero)`;
      } finally {
        if (det) await det.close().catch(() => {});
        await apagarDirectorio(h);
      }
    } },
];
