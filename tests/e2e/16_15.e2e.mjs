/* Gate e2e de la regla 15 en la PANTALLA de Líneas, que la suite no monta: (1) la pestaña de las solicitudes
   nuevas se llama «Solicitudes» (y no hay ninguna «En proceso»); (2) una solicitud armada por el CAMINO REAL
   —el wizard `PresentacionComite` abierto desde una fila de Vigentes, Deudores y Bienes confirmados, y
   «Solicitar VB · Inyectar»— aparece en la bandeja con su idProceso y «En gestión», o sea NEX la muestra sin
   resolverla; (3) UNA POR LÍNEA: esa misma línea queda marcada «Solicitud en curso» en Vigentes, su fila NO
   abre el wizard, y —dirección contraria— una línea sin solicitud sí lo abre. Se pasa por el wizard y no por
   `api1Inyeccion` a mano porque lo que liga la solicitud a su línea es el payload que arma el wizard: una
   inyección armada en el test con `lineaId` puesto a mano pasaría aunque el wizard dejara de mandarlo. Al
   final se retira lo inyectado. */
const ROT_BLOQ = "Esta línea ya tiene una solicitud en gestión (ver «Solicitudes»)";
const ROT_LIBRE = "Iniciar solicitud de modificación / renovación de esta línea";
const RE_RUT = /(\d{7,8}-[\dkK])\s*·/;   // «76123456-7 · Ejecutivo», como lo pinta la fila
const RE_SOL = /^\s*Solicitudes( · \d+)?\s*$/;

export const casos = [
  { id: "e2e-15", titulo: "la bandeja se llama «Solicitudes», la solicitud que arma el wizard entra sin resolverse y ligada a su línea, y esa línea no admite otra",
    correr: async (h) => {
      const p = h.pagina;
      await h.irA("Líneas");
      await p.waitForFunction(() => /Líneas de crédito/.test(document.body.innerText || ""), null, { timeout: 60000 });
      // (1) Las pestañas: «Vigentes» y «Solicitudes», ninguna «En proceso».
      const rotulos = (await p.locator("button", { hasText: /^\s*(Vigentes|Solicitudes( · \d+)?|En proceso)\s*$/ }).allInnerTexts()).map((t) => t.trim());
      if (!rotulos.some((t) => /^Solicitudes( · \d+)?$/.test(t))) throw new Error(`no hay pestaña «Solicitudes»: ${rotulos.join(" | ")}`);
      if (rotulos.some((t) => /^En proceso$/.test(t))) throw new Error(`hay una pestaña «En proceso»: ${rotulos.join(" | ")}`);
      // Dos líneas VIGENTES sin solicitud (el rótulo de la fila lo dice); el RUT se lee del texto de la fila.
      const libres = p.locator(`tr[title="${ROT_LIBRE}"]`);
      const nLibres = await libres.count();
      if (nLibres < 2) throw new Error(`hacen falta 2 líneas vigentes sin solicitud y hay ${nLibres}`);
      const rutDe = async (fila) => { const m = (await fila.innerText()).match(RE_RUT); if (!m) throw new Error("no pude leer el RUT de la fila"); return m[1]; };
      const rut = await rutDe(libres.nth(0));
      const antes = await p.evaluate((r) => { const l = LINEAS_DATA.find((x) => x.rut === r); return { lineaId: l ? l.id : null, ids: api2ListarProcesos().map((s) => s && s.idProceso) }; }, rut);
      if (!antes.lineaId) throw new Error(`la línea ${rut} no está en LINEAS_DATA`);
      // (2) CAMINO REAL: la fila libre abre el wizard para ESA línea…
      await libres.nth(0).click();
      await p.waitForFunction(() => /Presentación al comité/.test(document.body.innerText || ""), null, { timeout: 30000 });
      if (!(await h.texto(p)).includes(rut)) throw new Error(`el wizard abrió pero no para ${rut}`);
      // …Deudores: si el cliente no trae recurrentes, se agrega uno en «Otros deudores identificados» (el
      // ejecutivo de la sesión no es admin, así que elegirlo lo carga directo); se confirma.
      const confDeu = p.locator("button", { hasText: /^\s*Confirmar deudores · Siguiente ›\s*$/ }).first();
      let deudorAgregado = "";
      if (await confDeu.isDisabled()) {
        const sel = p.locator("select[title*='deudor(es) disponibles']").first();
        if (!(await sel.count())) throw new Error("sin deudores recurrentes y sin selector de «Otros deudores» para agregar uno");
        deudorAgregado = await sel.locator("option").nth(1).getAttribute("value");
        await sel.selectOption(deudorAgregado);
        await p.waitForTimeout(300);
        if (await confDeu.isDisabled()) throw new Error("agregué un deudor y «Confirmar deudores» sigue deshabilitado");
      }
      await confDeu.click();
      await p.waitForTimeout(300);
      // …Bienes y garantías (opcionales): se confirma; el documento se revisa y se ENVÍA.
      await p.locator("button", { hasText: /^\s*Confirmar bienes · Revisar documento ›\s*$/ }).first().click();
      await p.waitForFunction(() => /Esta es la presentación completa que va al comité/.test(document.body.innerText || ""), null, { timeout: 30000 });
      const enviar = p.locator("button", { hasText: /^\s*Solicitar VB · Inyectar\s*$/ }).first();
      if (await enviar.isDisabled()) throw new Error("«Solicitar VB · Inyectar» está deshabilitado en el documento");
      await enviar.click();
      // Al inyectar, la pantalla vuelve a Líneas en la pestaña «Solicitudes» (skeleton ~700 ms).
      await p.waitForFunction(() => /Líneas de crédito/.test(document.body.innerText || "") && !/Presentación al comité/.test(document.body.innerText || ""), null, { timeout: 30000 });
      await p.waitForTimeout(1200);
      const ins = await p.evaluate(({ r, idsAntes }) => {
        const nuevas = api2ListarProcesos().filter((s) => s && !idsAntes.includes(s.idProceso));
        const s = nuevas.find((x) => x.rut === r) || null;
        return { nuevas: nuevas.length, id: s && s.idProceso, estado: s && s.estado, constituida: !!(s && s.constituida), lineaId: s && s.lineaId, ejecutivo: s && s.ejecutivo };
      }, { r: rut, idsAntes: antes.ids });
      if (ins.nuevas !== 1 || !ins.id) throw new Error(`el wizard tenía que dejar UNA solicitud nueva para ${rut} y dejó ${ins.nuevas}`);
      if (ins.estado !== "En gestión" || ins.constituida) throw new Error(`la solicitud ${ins.id} quedó «${ins.estado}» · constituida ${ins.constituida}: NEX no resuelve`);
      if (ins.lineaId !== antes.lineaId) throw new Error(`la solicitud ${ins.id} no quedó ligada a su línea: lineaId ${ins.lineaId}, esperaba ${antes.lineaId}`);
      // La bandeja «Solicitudes» la lista con su id y «En gestión».
      const tBandeja = await h.texto(p);
      if (!tBandeja.includes(ins.id)) throw new Error(`la bandeja «Solicitudes» no lista ${ins.id}`);
      const tFilaB = await p.locator("tr", { hasText: ins.id }).first().innerText();
      if (!/En gestión/.test(tFilaB)) throw new Error(`la fila ${ins.id} de la bandeja no dice «En gestión»: ${tFilaB.replace(/\s+/g, " ").slice(0, 160)}`);
      const rotSol = (await p.locator("button", { hasText: RE_SOL }).first().innerText()).trim();
      // (3) UNA POR LÍNEA: en Vigentes la fila queda marcada y NO abre el wizard.
      await p.locator("button", { hasText: /^\s*Vigentes\s*$/ }).first().click();
      await p.waitForTimeout(600);
      const bloqueada = p.locator(`tr[title="${ROT_BLOQ}"]`).filter({ hasText: rut });
      if ((await bloqueada.count()) !== 1) throw new Error(`la línea ${rut} con solicitud en la bandeja no quedó marcada como en curso (${await bloqueada.count()} filas)`);
      if (!/Solicitud en curso/.test(await bloqueada.first().innerText())) throw new Error("la fila en curso no muestra el chip «Solicitud en curso»");
      await bloqueada.first().click();
      await p.waitForTimeout(600);
      const t1 = await h.texto(p);
      if (/Presentación al comité/.test(t1)) throw new Error("la fila con solicitud en curso abrió el wizard: dos solicitudes para la misma línea");
      if (!/Líneas de crédito/.test(t1)) throw new Error("al hacer clic en la fila en curso la pantalla de Líneas desapareció");
      // Dirección contraria: una línea SIN solicitud sí abre el wizard (y se cancela sin inyectar).
      const libre = p.locator(`tr[title="${ROT_LIBRE}"]`).first();
      const rutLibre = await rutDe(libre);
      if (rutLibre === rut) throw new Error("la fila «libre» es la misma línea que ya tiene solicitud");
      await libre.click();
      await p.waitForFunction(() => /Presentación al comité/.test(document.body.innerText || ""), null, { timeout: 30000 });
      if (!(await h.texto(p)).includes(rutLibre)) throw new Error(`el wizard abrió pero no para ${rutLibre}`);
      await p.locator("button", { hasText: /^\s*Cancelar\s*$/ }).first().click();
      await p.waitForTimeout(400);
      // Retirar lo inyectado: este caso no le deja una solicitud a la demo, y la fila vuelve a quedar libre.
      const quedan = await p.evaluate(({ id, idsAntes }) => { const L = api2ListarProcesos(); const i = L.findIndex((s) => s && s.idProceso === id); if (i >= 0) L.splice(i, 1); return L.filter((s) => s && !idsAntes.includes(s.idProceso)).length; }, { id: ins.id, idsAntes: antes.ids });
      await p.locator("button", { hasText: RE_SOL }).first().click();
      await p.waitForTimeout(300);
      await p.locator("button", { hasText: /^\s*Vigentes\s*$/ }).first().click();
      await p.waitForTimeout(300);
      const liberada = await p.locator(`tr[title="${ROT_LIBRE}"]`).filter({ hasText: rut }).count();
      await h.irA("Gestión diaria");
      return `pestañas ${rotulos.join(" | ")} → «${rotSol}» · wizard desde ${rut}${deudorAgregado ? ` (+ deudor «${deudorAgregado}»)` : ""} → ${ins.id} en bandeja «En gestión» sin constituir, lineaId ${ins.lineaId} · ${rut} marcada «Solicitud en curso» y no abre el wizard · ${rutLibre} sin solicitud sí lo abre · retirada: ${quedan} de prueba quedan, fila liberada ${liberada === 1}`;
    } },
];
