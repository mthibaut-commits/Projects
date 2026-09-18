/* Gate e2e de la regla 15-quater-bis: el paso DEUDORES del wizard de presentación al comité
   (Líneas › Solicitudes › «+ Nueva línea» → `PresentacionComite`, 3 pasos). Todo lo que la regla nombra
   —`construirDeudorLinea`, `filaDeudor`, `chipProm`, `subtotalDeu`, `DG_DEU`— son cierres DENTRO del
   componente, así que no hay función de módulo que la suite pueda llamar: se abre el wizard real con un
   cliente sin línea que sí tenga deudores recurrentes y se lee la tabla en el DOM.
   Lo que fija, con sus dos direcciones:
   · Las cuatro columnas de monto son «Aprobado · Utilizado · Sugerido · Propuesta», en ese orden y sin
     columna RUT (el RUT y los chips van DENTRO de la celda del nombre); «Tipo línea» y «Pol. %L» apilados.
   · `sugerido` NACE igual a `propuesta` (fila a fila, en los recurrentes pre-cargados Y en uno agregado
     con «+ Agregar deudor») y el tooltip del sugerido es el neutro. Al CORREGIR la propuesta —por las DOS
     vías que tiene el ejecutivo: el campo de la fila (`updDeu`) y el modal «Editar deudor factoring», donde
     el monto se recalcula con la suma de sus productos (`updDeuProd`)— el sugerido no se mueve, el tooltip
     pasa a «se apartó de la sugerencia: se pide $X contra $Y sugeridos», el Conc. % y el subtotal se
     recalculan con la nueva cifra; al volver a la sugerencia el tooltip vuelve al neutro (dirección
     negativa: la separación no es permanente ni se marca cuando no la hay).
   · Las cuatro van en PESOS (`$1.234.567`, nunca `M$`) y `InputPesos` muestra el peso con miles DENTRO
     del campo: al teclear «123456789» el campo dice «$123.456.789»; el total del pie y el cupo de la
     línea común van en `M$` (fmtMM, calculado en la página).
   · `chipProm` PEGADO a su veredicto y uno POR GRUPO: subtotal de sugeridos, cabecera de otros y franja
     global. Cada chip se localiza por su CONTENEDOR (el subtotal de su tabla, el div del select
     «+ Agregar deudor», la franja gris del input «Límite Máx.»), no por su valor ni por su posición, y el
     valor de cada uno es el promedio de nota ponderado por la PROPUESTA de SU grupo (se recalcula desde
     las celdas) y se mueve al corregir un monto. Con «otros» vacío el chip de su cabecera dice 0.00.
   · La franja gris trae el cupo de la línea común en plata (fmtMM(propFactoring·límite/100)) y el
     «Total propuesto» vive en el pie junto al botón que confirma.
   · Anchos MEDIDOS (`DG_DEU`, minWidth 1500): 14 pistas, ninguna cabecera DESBORDA su pista
     (scrollWidth ≤ clientWidth: las cabeceras son items de grid y su rect es la celda, así que un solape
     por rects nunca se ve) ni se parte en dos líneas, los cinco checkboxes V·N·C·FR·CP caben dentro de su
     columna sin invadir la de acciones, y el minWidth cubre la suma de las pistas fijas + la mínima
     flexible + los 13 gaps. La SONDA planta en la grilla real los tres defectos que la regla nombra
     («Cli/Deu» a 46px, checkboxes a 116px, «Conc. %» a 30px) y el mismo lector tiene que cazar los tres.
   NO cubre (para que nadie lo busque acá): el tercer camino de nacimiento —deudor «Solicitado» por el
   cierre de una oferta (`deudoresSolicitadosLinea`: sugerido = propuesta = max(…))— exige una oferta
   cerrada con línea insuficiente en la misma sesión. Y cómo se pinta un CERO en Aprobado/Utilizado no es
   de la regla: el fuente pone «—» en aprobado y «0» (sin signo peso) en utilizado; el gate acepta las
   formas de cero sin fijar esa asimetría, que queda anotada como hallazgo. */

const PESOS = /^\$\d{1,3}(\.\d{3})*$/;
const CERO = new Set(["—", "0", "$0"]); // las formas en que un cero puede pintarse: ninguna fija la asimetría «—»/«0»
const TIT_NEUTRO = "Monto que propone el sistema para este par.";
const TIT_PROPUESTA = "Monto de línea que se le pide al comité para este deudor. Se digita en pesos."; // title del InputPesos de la fila
const digitos = (s) => +String(s || "").replace(/[^\d]/g, "");

/* Elige, en la página, un cliente SIN línea vigente (los que ofrece «Crear Línea — nueva») con ≥ 2
   deudores recurrentes, para que la tabla traiga filas y el promedio ponderado tenga con qué ponderar. */
const elegirCliente = (pagina) => pagina.evaluate(() => {
  const cands = PC_CLIENTES.filter((c) => !LINEAS_DATA.some((l) => l.cliente === c.nombre));
  for (const c of cands) { const n = deudoresRecurrentesLinea(c.nombre).length; if (n >= 2) return { nombre: c.nombre, rut: c.rut, recurrentes: n, cands: cands.length }; }
  return { nombre: null, cands: cands.length };
});

/* Lee el paso Deudores: por tabla (0 sugeridos · 1 otros) las cabeceras con sus medidas, las filas (14
   celdas cada una), el subtotal con su chip y la grilla; y fuera de las tablas los chips «Prom. Ponderado»
   —la lista entera para contarlos, y el de la cabecera de otros y el global localizados por su
   CONTENEDOR—, la franja gris con su límite, el pie y los pasos. */
const leerTabla = (pagina) => pagina.evaluate(() => {
  const esCab = (d) => d.children.length === 14 && d.children[0].tagName === "SPAN" && d.children[0].textContent.trim() === "Nota" && /Propuesta/.test(d.textContent);
  const cabs = [...document.querySelectorAll("div")].filter(esCab);
  const tablas = cabs.map((cab) => {
    const cont = cab.parentElement;
    const filas = [...cont.children].filter((d) => d !== cab && d.children.length === 14 && d.querySelector("input[type=text]")).map((d) => {
      const c = d.children; const inp = c[8];
      const botones = (k) => [...c[k].querySelectorAll("button")].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), l: Math.round(r.left), top: Math.round(r.top), b: Math.round(r.bottom) }; });
      const rectChk = c[12].getBoundingClientRect(), rectAcc = c[13].getBoundingClientRect();
      const labels = [...c[12].querySelectorAll("label")].map((l) => l.getBoundingClientRect());
      return { nota: +c[0].textContent.trim().replace(",", "."), nombre: c[2].querySelector("span").textContent.trim(), celdaNombre: c[2].textContent.trim(),
               tipoLinea: botones(3), pol: botones(4), aprobado: c[5].textContent.trim(), utilizado: c[6].textContent.trim(),
               sugerido: c[7].textContent.trim(), sugeridoTitle: c[7].getAttribute("title") || "", inputTag: inp.tagName, inputType: inp.getAttribute("type"), inputMode: inp.getAttribute("inputmode"), propuesta: inp.value,
               conc: c[11].textContent.trim(), chk: { n: labels.length, dentro: labels.every((r) => r.right <= rectChk.right + 0.5 && r.left >= rectChk.left - 0.5), invadeAcciones: labels.some((r) => r.right > rectAcc.left) } };
    });
    const sub = [...cont.children].find((d) => d !== cab && d.children.length === 10 && /Subtotal/.test(d.textContent));
    const subt = sub ? { etiqueta: sub.children[2].textContent.trim(), aprobado: sub.children[5].textContent.trim(), utilizado: sub.children[6].textContent.trim(), sugerido: sub.children[7].textContent.trim(), propuesta: sub.children[8].textContent.trim(), chip: sub.children[9].textContent.trim().replace(/\s+/g, " ") } : null;
    // Cada cabecera es un ITEM DE GRID: su rect es la celda, nunca el texto, así que dos contiguas jamás se
    // solapan aunque el texto desborde —lo que delata el desborde es scrollWidth > clientWidth—. Y como la
    // fila estira todos los items al alto de la más alta, el alto del span tampoco dice cuál se partió: si
    // UNA cabecera cae a dos líneas, las 14 miden dos líneas. Lo que se cuenta es el TEXTO: los rects de
    // línea de un Range sobre el contenido del span (uno por línea).
    const hc = [...cab.children].map((s) => { const r = s.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(s); return { t: s.textContent.trim(), w: r.width, sw: s.scrollWidth, cw: s.clientWidth, lineas: rg.getClientRects().length }; });
    const tpl = cab.style.gridTemplateColumns || "";
    const minmax = tpl.match(/minmax\((\d+)px/);
    const px = [...tpl.replace(/minmax\([^)]*\)/g, "").matchAll(/(\d+)px/g)].map((m) => +m[1]);
    const gap = parseFloat(getComputedStyle(cab).columnGap) || 0;
    const nPistas = getComputedStyle(cab).gridTemplateColumns.split(" ").length;
    const minWidth = parseFloat(cont.style.minWidth) || 0;
    return { headers: hc.map((x) => x.t), hc, tpl, sumaPistas: px.reduce((a, b) => a + b, 0) + (minmax ? +minmax[1] : 0) + gap * 13, nPistas, minWidth, filas, subt };
  });
  const cuerpo = document.body.innerText || "";
  const reP = /^Prom\. Ponderado:/;
  const txt = (s) => s.textContent.trim().replace(/\s+/g, " ");
  const esChip = (s) => reP.test(s.textContent.trim()) && ![...s.children].some((c) => reP.test(c.textContent.trim()));
  const chips = [...document.querySelectorAll("span")].filter(esChip).map(txt);
  // Los chips por grupo se localizan por su CONTENEDOR, no por su valor (el subtotal de otros vale lo mismo
  // que su cabecera por construcción) ni por su posición: el de la cabecera de otros vive en el div del
  // select «+ Agregar deudor»; el global, en la franja gris del input «Límite Máx.».
  const chipEn = (cont) => { const s = cont ? [...cont.querySelectorAll("span")].find(esChip) : null; return s ? txt(s) : null; };
  const selAgregar = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => o.textContent.trim() === "+ Agregar deudor"));
  const chipCabOtros = chipEn(selAgregar && selAgregar.parentElement);
  const inpLimite = [...document.querySelectorAll("input[type=number]")].find((i) => /^Otros Deudores Línea Común Límite Máx\./.test(((i.parentElement && i.parentElement.textContent) || "").trim()));
  const franja = inpLimite ? inpLimite.parentElement.parentElement.parentElement : null; // span → div → franja gris
  const limite = inpLimite ? +inpLimite.value : null;
  const franjaTxt = franja ? (franja.innerText || "").replace(/\s+/g, " ") : "";
  const chipGlobal = chipEn(franja);
  const total = [...document.querySelectorAll("div")].find((d) => d.children.length <= 1 && /^Total propuesto:/.test(d.textContent.trim()));
  const pie = total ? { texto: total.textContent.trim(), botonAlLado: [...total.parentElement.querySelectorAll("button")].map((b) => b.textContent.trim()) } : null;
  const pasos = [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /^[123]\. /.test(t));
  const totalM = cuerpo.match(/Total propuesto: (M\$[\d.,]+)/);
  return { tablas, chips, chipCabOtros, chipGlobal, limite, franjaTxt, pie, pasos, totalM: totalM ? totalM[1] : null, hayMS: tablas.map((t) => t.filas.some((f) => /M\$/.test(f.aprobado + f.utilizado + f.sugerido + f.propuesta))), enWizard: /Presentación al comité/.test(cuerpo) };
});

const fmtEnPagina = (pagina, v) => pagina.evaluate((v) => ({ clp: fmtCLP(v), mm: fmtMM(v) }), v);
const promDe = (filas) => filas.length ? +(filas.reduce((s, f) => s + f.nota * (digitos(f.propuesta) || 1), 0) / filas.reduce((s, f) => s + (digitos(f.propuesta) || 1), 0)).toFixed(2) : 0;
const valorChip = (txt) => { const m = String(txt).match(/Prom\. Ponderado:\s*([\d.]+)/); return m ? +m[1] : NaN; };

/* Los anchos de `DG_DEU`, MEDIDOS. El MISMO lector juzga la grilla real (tiene que salir limpio) y la
   grilla con los defectos plantados (tiene que cazarlos): devuelve la lista de defectos de una tabla. */
const fallosAnchos = (T) => {
  const f = [];
  if (T.nPistas !== 14) f.push(`la grilla tiene ${T.nPistas} pistas y no 14`);
  for (const c of T.hc) {
    if (!c.t) continue;
    if (c.sw > c.cw) f.push(`cabecera «${c.t}» desborda su pista (${c.sw}px de texto en ${c.cw}px)`);
    if (c.lineas > 1) f.push(`cabecera «${c.t}» partida en dos líneas (${c.lineas} líneas de texto en ${c.cw}px)`);
  }
  if (!T.hc.some((c) => c.t === "Conc. %")) f.push("no está la cabecera «Conc. %»");
  for (const r of T.filas) if (!(r.chk.n === 5 && r.chk.dentro && !r.chk.invadeAcciones)) f.push(`${r.nombre}: checkboxes V·N·C·FR·CP ${JSON.stringify(r.chk)}`);
  if (!(T.minWidth >= 1500 && T.minWidth >= T.sumaPistas)) f.push(`minWidth ${T.minWidth} no cubre la suma de pistas ${T.sumaPistas.toFixed(0)} (≥ 1500)`);
  return f;
};

export const casos = [
  { id: "e2e-15-quater-bis", titulo: "el paso Deudores del wizard muestra Aprobado · Utilizado · Sugerido · Propuesta en pesos (sin columna RUT, tipo línea y Pol. %L apilados), sugerido NACE igual a propuesta (pre-cargados y agregado) con tooltip neutro, se SEPARA al corregir —en la fila y por el modal de productos— (tooltip «se apartó», conc. % y subtotal recalculados) y vuelve al neutro al restaurar, InputPesos muestra $ con miles dentro del campo, un chipProm por grupo (cada uno en SU contenedor) ponderado por la propuesta, el cupo de la línea común en M$ y el total en el pie junto a Confirmar, y los anchos de DG_DEU están medidos (14 pistas, ninguna cabecera desborda su pista ni se parte en dos líneas, checkboxes dentro de su columna, minWidth ≥ suma; la sonda 46/116/30 px se caza entera)",
    correr: async (h) => {
      const { pagina } = h;
      await h.irA("Líneas");
      const cli = await elegirCliente(pagina);
      if (!cli.nombre) throw new Error(`ningún cliente sin línea con ≥ 2 deudores recurrentes (candidatos ${cli.cands})`);
      const subSol = pagina.locator("button", { hasText: /^\s*Solicitudes/ }).first();
      if (!(await subSol.count())) throw new Error("no encuentro el sub-tab «Solicitudes» de Líneas");
      await subSol.click(); await pagina.waitForTimeout(400);
      await pagina.locator("button", { hasText: /Nueva línea/ }).first().click(); await pagina.waitForTimeout(400);
      if (!/Crear Línea — nueva/.test(await h.texto(pagina))) throw new Error("«+ Nueva línea» no abrió «Crear Línea — nueva»");
      await pagina.getByPlaceholder("Razón social o RUT…").fill(cli.nombre); await pagina.waitForTimeout(300);
      await pagina.locator("button", { hasText: cli.nombre }).first().click(); await pagina.waitForTimeout(200);
      await pagina.getByRole("button", { name: "Continuar", exact: true }).click();
      await pagina.waitForFunction(() => /Presentación al comité/.test(document.body.innerText || ""), null, { timeout: 30000 });
      await pagina.waitForTimeout(600);
      try {
        // ── 1. La tabla al nacer
        let L = await leerTabla(pagina);
        const fallos = [];
        if (!L.enWizard || L.pasos.length !== 3 || !/Deudores/.test(L.pasos[0]) || !/Bienes y garantías/.test(L.pasos[1]) || !/Documento/.test(L.pasos[2])) fallos.push(`pasos: ${JSON.stringify(L.pasos)}`);
        if (L.tablas.length < 1) throw new Error("no encuentro la cabecera de la tabla de deudores (Nota … Propuesta)");
        const T = L.tablas[0];
        const iA = T.headers.indexOf("Aprobado"), iU = T.headers.indexOf("Utilizado"), iS = T.headers.indexOf("Sugerido"), iP = T.headers.indexOf("Propuesta");
        if (!(iA === 5 && iU === 6 && iS === 7 && iP === 8)) fallos.push(`columnas de monto fuera de orden: ${JSON.stringify(T.headers)}`);
        if (T.headers.some((t) => /^RUT$/i.test(t))) fallos.push("sigue habiendo una columna RUT");
        if (!T.filas.length) throw new Error(`la tabla de sugeridos no trae filas (cliente ${cli.nombre}, ${cli.recurrentes} recurrentes)`);
        if (T.filas.length !== cli.recurrentes) fallos.push(`filas ${T.filas.length} ≠ recurrentes ${cli.recurrentes}`);
        for (const f of T.filas) {
          if (!/\d{8}-[\dK]/.test(f.celdaNombre)) fallos.push(`${f.nombre}: el RUT no va dentro de la celda del nombre`);
          if (!/Recurrente/.test(f.celdaNombre)) fallos.push(`${f.nombre}: el chip Recurrente no va dentro de la celda del nombre`);
          if (f.sugerido !== f.propuesta) fallos.push(`${f.nombre}: sugerido «${f.sugerido}» ≠ propuesta «${f.propuesta}» al nacer`);
          if (!PESOS.test(f.sugerido) || !PESOS.test(f.propuesta)) fallos.push(`${f.nombre}: sugerido/propuesta no van en pesos: «${f.sugerido}» «${f.propuesta}»`);
          if (!(PESOS.test(f.aprobado) || CERO.has(f.aprobado)) || !(PESOS.test(f.utilizado) || CERO.has(f.utilizado))) fallos.push(`${f.nombre}: aprobado/utilizado no van en pesos: «${f.aprobado}» «${f.utilizado}»`);
          if (f.sugeridoTitle !== TIT_NEUTRO) fallos.push(`${f.nombre}: al nacer el tooltip del sugerido no es el neutro: «${f.sugeridoTitle}»`);
          if (!(f.inputTag === "INPUT" && f.inputType === "text" && f.inputMode === "numeric")) fallos.push(`${f.nombre}: la Propuesta no es un input de texto numérico (${f.inputTag}/${f.inputType}/${f.inputMode})`);
          const [p1, p2] = f.tipoLinea; if (!(p1 && p2 && p1.t === "Puntual" && p2.t === "Normal" && p2.top >= p1.b - 1 && Math.abs(p2.l - p1.l) < 2)) fallos.push(`${f.nombre}: Puntual/Normal no van apilados: ${JSON.stringify(f.tipoLinea)}`);
          if (!(f.pol.length >= 2 && f.pol[1].top >= f.pol[0].b - 1)) fallos.push(`${f.nombre}: Pol. %L no va apilado: ${JSON.stringify(f.pol)}`);
        }
        if (L.hayMS.some(Boolean)) fallos.push("alguna celda de monto de la tabla va en M$");
        // anchos medidos: el lector compartido con la sonda de 1-bis
        fallos.push(...fallosAnchos(T));
        // chips: uno por grupo, cada uno en SU contenedor, y el de sugeridos = promedio ponderado por la propuesta de SUS filas
        if (L.chips.length !== 3) fallos.push(`hay ${L.chips.length} chips «Prom. Ponderado» y se esperaban 3 (subtotal sugeridos · cabecera otros · franja global): ${JSON.stringify(L.chips)}`);
        const prom0 = promDe(T.filas);
        if (!T.subt || valorChip(T.subt.chip) !== prom0) fallos.push(`chip del subtotal «${T.subt && T.subt.chip}» ≠ ponderado calculado ${prom0}`);
        if (!/^Prom\. Ponderado: 0\.00 · límite de compra/.test(L.chipCabOtros || "")) fallos.push(`con «otros» vacío la cabecera de otros (junto a «+ Agregar deudor») no trae el chip en 0.00: «${L.chipCabOtros}»`);
        if (valorChip(L.chipGlobal) !== prom0) fallos.push(`chip global (franja «Límite Máx.») «${L.chipGlobal}» ≠ ${prom0} (sin otros, es el mismo promedio)`);
        if (!/Sobre el límite de compra|Bajo el límite de compra/.test(T.subt ? T.subt.chip : "")) fallos.push("el veredicto no va pegado al promedio");
        const sumaSug0 = T.filas.reduce((s, f) => s + digitos(f.sugerido), 0), sumaProp0 = T.filas.reduce((s, f) => s + digitos(f.propuesta), 0);
        const fs0 = await fmtEnPagina(pagina, sumaSug0), fp0 = await fmtEnPagina(pagina, sumaProp0);
        if (!T.subt || T.subt.sugerido !== fs0.clp || T.subt.propuesta !== fp0.clp) fallos.push(`subtotal sugerido «${T.subt && T.subt.sugerido}»/propuesta «${T.subt && T.subt.propuesta}» ≠ ${fs0.clp}/${fp0.clp}`);
        // franja gris y pie. `propFactoring` no está en pantalla en el paso 0: se lee del «Total propuesto» del
        // pie, que es propFactoring + propConfirming con propConfirming = 0 al crear. Si el confirming dejara de
        // nacer en 0, este `pf` sería mayor que propFactoring y la franja y el Conc. % dejarían de cuadrar: FALLA visible.
        const pf = L.totalM ? Math.round(parseFloat(L.totalM.replace("M$", "").replace(/\./g, "").replace(",", ".")) * 1e6) : 0;
        const cupo = await fmtEnPagina(pagina, Math.round(pf * (L.limite || 0) / 100));
        if (!(pf > 0 && L.limite > 0 && L.franjaTxt.includes(`cupo de la línea común ${cupo.mm}`))) fallos.push(`la franja no dice el cupo en plata: límite ${L.limite}% de ${L.totalM} → «${cupo.mm}» · franja «${L.franjaTxt.slice(0, 160)}»`);
        if (!(L.pie && /^Total propuesto: M\$/.test(L.pie.texto) && L.pie.botonAlLado.some((b) => /Confirmar deudores/.test(b)))) fallos.push(`el total no está en el pie junto al botón: ${JSON.stringify(L.pie)}`);
        if (fallos.length) throw new Error("al nacer: " + fallos.join(" · "));

        // ── 1-bis. SONDA de los anchos: se plantan en la grilla real los TRES defectos que la regla describe
        //    —«Cli/Deu» a 46px, los checkboxes a 116px y «Conc. %» a 30px— y el MISMO lector que acaba de dar
        //    la grilla por buena tiene que cazar los tres; después se restaura y se relee.
        const plantar = (tpl) => pagina.evaluate((tpl) => {
          const esCab = (d) => d.children.length === 14 && d.children[0].tagName === "SPAN" && d.children[0].textContent.trim() === "Nota" && /Propuesta/.test(d.textContent);
          const cab = [...document.querySelectorAll("div")].find(esCab); const orig = cab.style.gridTemplateColumns;
          const grillas = [cab, ...[...cab.parentElement.children].filter((d) => d !== cab && d.children.length === 14)];
          for (const g of grillas) g.style.gridTemplateColumns = tpl || orig;
          return orig;
        }, tpl);
        const tplSonda = T.tpl.replace(/^44px 58px/, "44px 46px").replace(/156px/, "116px").replace(/60px 116px/, "30px 116px");
        if (tplSonda === T.tpl || !/46px/.test(tplSonda) || !/30px 116px/.test(tplSonda)) throw new Error(`no pude plantar los tres defectos sobre «${T.tpl}»`);
        const tplOrig = await plantar(tplSonda);
        const LS = await leerTabla(pagina); const TS = LS.tablas[0];
        await plantar(tplOrig);
        const defectosSonda = fallosAnchos(TS);
        const caza = { cliDeu: defectosSonda.some((m) => /«Cli\/Deu» desborda/.test(m)), checkboxes: defectosSonda.some((m) => /checkboxes/.test(m)), conc: defectosSonda.some((m) => /«Conc\. %» partida en dos líneas/.test(m)) };
        if (!(caza.cliDeu && caza.checkboxes && caza.conc)) throw new Error(`la sonda de anchos no se caza entera ${JSON.stringify(caza)}: ${defectosSonda.join(" · ") || "(sin defectos leídos)"} · Cli/Deu ${JSON.stringify(TS.hc[1])}`);
        const LR = await leerTabla(pagina); const restos = fallosAnchos(LR.tablas[0]);
        if (LR.tablas[0].tpl !== T.tpl || restos.length) throw new Error(`la grilla no quedó restaurada tras la sonda: ${restos.join(" · ") || LR.tablas[0].tpl}`);
        // Resumen de lo que la sonda leyó, para la evidencia: qué cabeceras desbordan, cuáles se parten y cuántas filas de checkboxes.
        const nombres = (re) => defectosSonda.filter((m) => re.test(m)).map((m) => (m.match(/«([^»]+)»/) || [])[1]).filter(Boolean).join("/");
        const resumenSonda = `desbordan ${nombres(/desborda su pista/)} · se parten ${nombres(/partida en dos líneas/)} · checkboxes en ${defectosSonda.filter((m) => /checkboxes/.test(m)).length} filas`;

        // ── 2. Corregir la propuesta de la primera fila por su campo: el sugerido no se mueve, el tooltip lo dice
        const f0 = T.filas[0]; const sug0 = digitos(f0.sugerido);
        const NUEVO = sug0 + 123456789;
        const inp0 = pagina.getByTitle(TIT_PROPUESTA, { exact: true }).first(); // el campo Propuesta de la fila, por su title
        if (!(await inp0.count())) throw new Error(`no encuentro el campo Propuesta de la fila por su título «${TIT_PROPUESTA}»`);
        await inp0.fill(String(NUEVO)); await pagina.waitForTimeout(300);
        L = await leerTabla(pagina); const T2 = L.tablas[0]; const g0 = T2.filas[0];
        const fN = await fmtEnPagina(pagina, NUEVO), fS = await fmtEnPagina(pagina, sug0);
        const fallos2 = [];
        if (g0.propuesta !== fN.clp) fallos2.push(`el campo no muestra el peso con miles: «${g0.propuesta}» ≠ «${fN.clp}»`);
        if (g0.sugerido !== f0.sugerido) fallos2.push(`el sugerido se movió al corregir: «${f0.sugerido}» → «${g0.sugerido}»`);
        if (g0.sugeridoTitle !== `El ejecutivo se apartó de la sugerencia: se pide ${fN.clp} contra ${fS.clp} sugeridos.`) fallos2.push(`tooltip tras corregir: «${g0.sugeridoTitle}»`);
        if (g0.conc !== `${Math.round(NUEVO / pf * 100)}%`) fallos2.push(`conc. % no se recalculó: «${g0.conc}» ≠ ${Math.round(NUEVO / pf * 100)}%`);
        for (const f of T2.filas.slice(1)) if (f.sugeridoTitle !== TIT_NEUTRO || f.sugerido !== f.propuesta) fallos2.push(`${f.nombre}: una fila que no se tocó cambió (${f.sugeridoTitle})`);
        const fp2 = await fmtEnPagina(pagina, sumaProp0 - sug0 + NUEVO);
        if (!(T2.subt && T2.subt.sugerido === fs0.clp && T2.subt.propuesta === fp2.clp)) fallos2.push(`subtotales tras corregir: sugerido «${T2.subt && T2.subt.sugerido}» (esperado ${fs0.clp}) · propuesta «${T2.subt && T2.subt.propuesta}» (esperado ${fp2.clp})`);
        const prom2 = promDe(T2.filas);
        if (valorChip(T2.subt.chip) !== prom2) fallos2.push(`el chip no se movió con la propuesta: «${T2.subt.chip}» ≠ ${prom2}`);
        const notasDistintas = new Set(T2.filas.map((f) => f.nota)).size > 1;
        if (notasDistintas && prom2 === prom0 && Math.abs(T2.filas[0].nota - prom0) > 0.05) fallos2.push(`el ponderado no cambió (${prom0}) pese a mover el peso de una fila con nota distinta`);
        if (fallos2.length) throw new Error("al corregir: " + fallos2.join(" · "));

        // ── 3. Volver a la sugerencia: el tooltip vuelve al neutro (la separación no es una marca permanente)
        await inp0.fill(String(sug0)); await pagina.waitForTimeout(300);
        L = await leerTabla(pagina); const g3 = L.tablas[0].filas[0];
        if (!(g3.propuesta === f0.propuesta && g3.sugerido === f0.sugerido && g3.sugeridoTitle === TIT_NEUTRO && g3.conc === f0.conc)) throw new Error(`al restaurar: propuesta «${g3.propuesta}» sugerido «${g3.sugerido}» tooltip «${g3.sugeridoTitle}» conc «${g3.conc}»`);
        // sonda de InputPesos en la pantalla: letras y puntos tecleados quedan en dígitos con miles
        await inp0.fill("$12a.34b5"); await pagina.waitForTimeout(200);
        const f1234 = await fmtEnPagina(pagina, 12345);
        const vSonda = await inp0.inputValue(); if (vSonda !== f1234.clp) throw new Error(`sonda de teclado: «$12a.34b5» dejó «${vSonda}» y no «${f1234.clp}»`);
        await inp0.fill(String(sug0)); await pagina.waitForTimeout(200);

        // ── 3-bis. La SEGUNDA vía de corrección: en el modal «Editar deudor factoring» el monto del deudor se
        //    recalcula con la suma de sus productos (`updDeuProd`). También tiene que separar el sugerido y, al
        //    devolver el producto a la sugerencia, volver al neutro. La fila del producto se localiza por su
        //    selector (el único con la opción «CHEQUE PROPIO»), no por posición.
        const lapiz = pagina.getByTitle("Editar deudor factoring", { exact: true }).first();
        const selProd = pagina.locator("select").filter({ has: pagina.locator("option", { hasText: /^CHEQUE PROPIO$/ }) });
        const inpProd = selProd.first().locator("xpath=..").locator("input[type=text][inputmode=numeric]").first();
        const guardar = pagina.getByRole("button", { name: "Guardar", exact: true });
        await lapiz.click(); await pagina.waitForTimeout(300);
        if ((await selProd.count()) !== 1) throw new Error(`el modal «Editar deudor factoring» no muestra UN producto (${await selProd.count()} selectores de producto)`);
        const NUEVO2 = sug0 + 55555555;
        await inpProd.fill(String(NUEVO2)); await pagina.waitForTimeout(300);
        await guardar.click(); await pagina.waitForTimeout(300);
        L = await leerTabla(pagina); const g4 = L.tablas[0].filas[0];
        const fN2 = await fmtEnPagina(pagina, NUEVO2);
        const fallos3 = [];
        if (g4.propuesta !== fN2.clp) fallos3.push(`la propuesta no se recalculó con la suma de productos: «${g4.propuesta}» ≠ «${fN2.clp}»`);
        if (g4.sugerido !== f0.sugerido) fallos3.push(`el sugerido se movió al corregir por el modal: «${f0.sugerido}» → «${g4.sugerido}»`);
        if (g4.sugeridoTitle !== `El ejecutivo se apartó de la sugerencia: se pide ${fN2.clp} contra ${fS.clp} sugeridos.`) fallos3.push(`tooltip tras corregir por el modal: «${g4.sugeridoTitle}»`);
        if (g4.conc !== `${Math.round(NUEVO2 / pf * 100)}%`) fallos3.push(`conc. % tras el modal: «${g4.conc}» ≠ ${Math.round(NUEVO2 / pf * 100)}%`);
        await lapiz.click(); await pagina.waitForTimeout(300);
        await inpProd.fill(String(sug0)); await pagina.waitForTimeout(300);
        await guardar.click(); await pagina.waitForTimeout(300);
        L = await leerTabla(pagina); const g5 = L.tablas[0].filas[0];
        if (!(g5.propuesta === f0.propuesta && g5.sugerido === f0.sugerido && g5.sugeridoTitle === TIT_NEUTRO && g5.conc === f0.conc)) fallos3.push(`al restaurar por el modal: propuesta «${g5.propuesta}» sugerido «${g5.sugerido}» tooltip «${g5.sugeridoTitle}» conc «${g5.conc}»`);
        if (fallos3.length) throw new Error("por el modal de productos: " + fallos3.join(" · "));

        // ── 4. Agregar un deudor en «Otros»: nace con sugerido = propuesta y aparece SU chip de grupo
        const sel = pagina.locator("select").filter({ has: pagina.locator("option", { hasText: /\+ Agregar deudor/ }) }).first();
        if (!(await sel.count())) throw new Error("no encuentro el selector «+ Agregar deudor»");
        const opciones = await sel.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
        if (!opciones.length) throw new Error("el selector «+ Agregar deudor» no ofrece candidatos");
        await sel.selectOption(opciones[0]); await pagina.waitForTimeout(400);
        const aceptar = pagina.getByRole("button", { name: "Aceptar y cargar" });
        if (await aceptar.count()) { await aceptar.click(); await pagina.waitForTimeout(400); }
        L = await leerTabla(pagina);
        const fallos4 = [];
        if (L.tablas.length !== 2) fallos4.push(`tras agregar hay ${L.tablas.length} tabla(s) y no 2`);
        const O = L.tablas[1]; const fo = O && O.filas[0];
        if (!fo) fallos4.push("la tabla de otros no trae la fila agregada");
        else {
          if (fo.nombre !== opciones[0]) fallos4.push(`la fila agregada es «${fo.nombre}» y no «${opciones[0]}»`);
          if (fo.sugerido !== fo.propuesta || !PESOS.test(fo.sugerido) || fo.sugeridoTitle !== TIT_NEUTRO) fallos4.push(`el agregado no nace con sugerido = propuesta: «${fo.sugerido}» / «${fo.propuesta}» · ${fo.sugeridoTitle}`);
          if (/Recurrente/.test(fo.celdaNombre)) fallos4.push("el agregado a mano sale como Recurrente");
          fallos4.push(...fallosAnchos(O).map((m) => "tabla de otros: " + m));
        }
        if (L.chips.length !== 4) fallos4.push(`con otros ocupado hay ${L.chips.length} chips y se esperaban 4: ${JSON.stringify(L.chips)}`);
        const promO = promDe(O ? O.filas : []), promG = promDe([...L.tablas[0].filas, ...(O ? O.filas : [])]);
        if (O && O.subt && valorChip(O.subt.chip) !== promO) fallos4.push(`chip del subtotal de otros «${O.subt.chip}» ≠ ${promO}`);
        if (valorChip(L.chipCabOtros) !== promO) fallos4.push(`el chip de la CABECERA de otros (junto a «+ Agregar deudor») «${L.chipCabOtros}» ≠ ponderado de su grupo ${promO}`);
        if (valorChip(L.chipGlobal) !== promG) fallos4.push(`el chip GLOBAL (franja «Límite Máx.») «${L.chipGlobal}» ≠ ponderado de todos ${promG}`);
        if (fallos4.length) throw new Error("al agregar: " + fallos4.join(" · "));
        return `cliente «${cli.nombre}» · ${T.filas.length} recurrentes + 1 agregado · nace ${f0.sugerido} = ${f0.propuesta} · corregido en la fila a ${fN.clp} (sugerido quieto, conc ${Math.round(NUEVO / pf * 100)}%, chip ${prom0}→${prom2}) y restaurado · corregido por el modal de productos a ${fN2.clp} (sugerido quieto) y restaurado · chips 3→4 por contenedor (sugeridos ${prom0}, otros ${promO}, global ${promG}) · cupo común ${cupo.mm} de ${L.totalM} · pistas ${T.nPistas}, suma ${T.sumaPistas.toFixed(0)} ≤ minWidth ${T.minWidth}, ${T.hc.filter((c) => c.t).length} cabeceras sin desborde ni corte · sonda 46/116/30 px cazada (${resumenSonda}) y restaurada`;
      } finally {
        // Deja el estado como lo encontró: cierra el modal si quedó abierto, cancela el wizard (se desmonta con
        // su estado; nada se persiste sin pulsar «Solicitar VB · Inyectar»), devuelve Líneas a «Vigentes» y
        // vuelve a Gestión diaria. No enciende el Directorio ni toca el filtro rápido: no hay nada más que apagar.
        const guardarAbierto = pagina.getByRole("button", { name: "Guardar", exact: true });
        if (await guardarAbierto.count()) await guardarAbierto.first().click().catch(() => {});
        const cancelar = pagina.getByRole("button", { name: "Cancelar", exact: true });
        if (await cancelar.count()) await cancelar.first().click().catch(() => {});
        await pagina.waitForTimeout(300);
        const vigentes = pagina.locator("button", { hasText: /^\s*Vigentes\s*$/ }).first();
        if (await vigentes.count()) await vigentes.click().catch(() => {});
        await h.irA("Gestión diaria").catch(() => {});
      }
    } },
];
