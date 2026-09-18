/* Gate e2e de la regla 15-bis-bis con DOS documentos de verdad (el tubo y la pestaña del detalle), que es lo
   único que la suite no puede reproducir —«los casos corren todo en un solo documento»—. Dos casos:
   (a) EL CAMINO REAL: se cierra una oferta con deudores sin cupo desde la pestaña del detalle («Enviar a Comité y
       Publicar» → «Confirmar y enviar») y se comprueba que el log del DETALLE dice «Solicitud de línea inyectada»
       con un id, que ese mismo id aparece en `api2ListarProcesos()` del TUBO con el registro idéntico (clonado, no
       rearmado: la secuencia del tubo no se mueve) y que la bandeja «Líneas › Solicitudes» lo lista.
   (b) EL CANAL Y SU IDEMPOTENCIA: desde el detalle se inyecta por API 1 un registro de prueba; el tubo NO lo ve
       (es otro módulo: el defecto que la regla describe); se postea por `nex-solicitud` como lo hace el código y el
       tubo lo incorpora tal cual; se postea dos veces más ⇒ sigue una sola entrada; un mensaje sin registro o de
       otro tipo no escribe nada.
   La sesión del runner es COMPARTIDA con los archivos que siguen: cada caso enciende el Directorio que necesita y
   deja el tubo como lo encontró —Directorio apagado, el filtro «Con línea» de la línea base e2e (regla 34: la app
   abre en «Todos»), las claves `pc_repo_*`
   del storage (lo que una pestaña de detalle NUEVA hereda: el cierre justifica excepciones y escribe eventos de
   otorgamiento) y el `SOLIC_SEQ` del detalle en su valor medido, sin la solicitud del caso—. */
const idsTubo = (p) => p.evaluate(() => api2ListarProcesos().map((s) => s && s.idProceso));
/* Retira de la lista de ESA página toda entrada con ese id; devuelve cuántas quedan (0 si limpió). */
const quitarSolicitud = (pag, id) => pag.evaluate((id) => {
  const L = api2ListarProcesos();
  for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].idProceso === id) L.splice(i, 1);
  return L.filter((s) => s && s.idProceso === id).length;
}, id);
/* El filtro rápido del tubo, por su `title` y su rótulo (nunca por clase). */
async function filtrar(p, rotulo) {
  const b = p.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo) }).first();
  if (!(await b.count())) throw new Error(`no encuentro el filtro rápido «${rotulo}» en el tubo`);
  await b.click();
  await p.waitForTimeout(1200);
}
const filtroActivo = (p) => p.evaluate(() => {
  const b = [...document.querySelectorAll('button[title="Filtrar oportunidades"]')].find((x) => getComputedStyle(x).fontWeight === "600");
  return b ? b.innerText.replace(/\s+/g, " ").trim() : null;
});
/* Foto, diferencias y restauración de las claves `pc_repo_*` del storage compartido por las pestañas. */
const fotoRepos = (p) => p.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (k.startsWith("pc_repo_")) o[k] = localStorage.getItem(k); return o; });
const cambiosRepos = (p, foto) => p.evaluate((foto) => {
  const out = [];
  for (const k of Object.keys(localStorage)) if (k.startsWith("pc_repo_") && (!(k in foto) || localStorage.getItem(k) !== foto[k])) out.push(`${k} ${(localStorage.getItem(k) || "").length} b${k in foto ? "" : " (nueva)"}`);
  for (const k of Object.keys(foto)) if (localStorage.getItem(k) === null) out.push(`${k} (borrada)`);
  return out;
}, foto);
const restaurarRepos = (p, foto) => p.evaluate((foto) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("pc_repo_") && !(k in foto)) localStorage.removeItem(k);
  for (const k of Object.keys(foto)) localStorage.setItem(k, foto[k]);
}, foto);
async function verEnBandeja(h, id) {
  const p = h.pagina;
  await h.irA("Líneas");
  await p.waitForFunction(() => /Líneas de crédito/.test(document.body.innerText || ""), null, { timeout: 60000 });
  await p.locator("button", { hasText: /^\s*Solicitudes( · \d+)?\s*$/ }).first().click();
  await p.waitForTimeout(600);
  const t = await h.texto(p);
  await h.irA("Gestión diaria");
  return t.includes(id);
}
/* Deja el tubo como lo encontró el caso (a) y dice qué comprobó. Idempotente: se llama al final y, si el caso
   lanzó antes de llegar, desde el `finally`. */
async function dejarComoEstaba(h, repos0, id) {
  const p = h.pagina;
  const quedan = id ? await quitarSolicitud(p, id) : 0;
  await h.irA("Gestión diaria");
  await filtrar(p, "Con línea");
  await restaurarRepos(p, repos0);
  const difs = await cambiosRepos(p, repos0);
  const filtro = await filtroActivo(p);
  await h.apagarDirectorio();
  const dirApagado = !/Directorio\s*·\s*\d+/.test(await h.texto(p));
  return `solicitud retirada ${quedan === 0} · filtro «${filtro}» ${/^Con línea/.test(filtro || "")} · pc_repo_* como estaban ${difs.length === 0} · Directorio apagado ${dirApagado}`;
}

export const casos = [
  { id: "e2e-15-bis-bis-a", titulo: "cerrar la oferta en la pestaña del detalle deja la solicitud en la bandeja del TUBO, con el mismo id y sin rearmarla",
    correr: async (h) => {
      const p = h.pagina;
      await h.encenderDirectorio();                       // idempotente; se apaga al salir
      const repos0 = await fotoRepos(p);                  // lo que una pestaña de detalle NUEVA hereda
      let idCaso = null, restaurado = false;
      try {
        // Una operación con parte de la oferta SIN cupo: es la que genera solicitud al cerrar. Se toma la ÚLTIMA
        // fila de «Sin línea»: la fila 0 es también la fila 0 de «Con línea» y de «Todos» —la que abren los demás
        // casos— y cerrarle la oferta acá les cambiaría la operación.
        await filtrar(p, "Sin línea");
        const nFilas = await p.locator("tr.pl-row").count();
        if (!nFilas) throw new Error("no hay filas en el filtro «Sin línea» del Directorio");
        const fila = nFilas - 1;
        const antesTubo = await idsTubo(p);
        const seqTubo0 = await p.evaluate(() => SOLIC_SEQ);
        const d = await h.abrirDetalle(fila);
        // Armar y simular la oferta con la selección rápida (como capturar_tabla_simulada.mjs).
        const chip = d.locator("button").filter({ hasText: /Todo lo disponible/ }).first();
        if (!(await chip.count())) throw new Error("el detalle no ofrece «Todo lo disponible»");
        await chip.click();
        await d.waitForFunction(() => /condiciones comerciales/i.test(document.body.innerText || ""), null, { timeout: 30000 });
        await d.waitForFunction(() => !/simulando/i.test(document.body.innerText || ""), null, { timeout: 30000 }).catch(() => {});
        await d.waitForTimeout(2500);
        const cta = d.locator("button").filter({ hasText: /^\s*(Enviar a Comité y Publicar|Cerrar oferta y publicar)\s*$/ }).first();
        if (!(await cta.count())) throw new Error("no encuentro el CTA de cierre en el detalle");
        const rotCta = (await cta.innerText()).trim();
        await cta.click();
        await d.waitForFunction(() => /Confirmar y enviar|Confirmar curse/.test(document.body.innerText || ""), null, { timeout: 30000 });
        const conf = d.locator("button").filter({ hasText: /^\s*(Confirmar y enviar|Confirmar curse)\s*$/ }).first();
        const rotConf = (await conf.innerText()).trim();
        if (rotConf !== "Confirmar y enviar") throw new Error(`el modal dice «${rotConf}»: esta oferta (fila ${fila + 1}/${nFilas} de «Sin línea») no manda nada al comité, no sirve para el caso (CTA «${rotCta}»)`);
        // Con excepciones sin justificar el cierre se BLOQUEA (es lo que la regla dice que bloquea, y no la firma
        // del cliente). Resolverlas en bloque son DOS pasos en el tab Otorgamiento: «Marcar sin comentarios y
        // solicitar (N)» sólo abre el panel; el que ejecuta es «Enviar N solicitud(es)». Se recorren los dos.
        let excepciones = "sin excepciones pendientes";
        if (await conf.isDisabled()) {
          const motivo = (await conf.getAttribute("title")) || "";
          const mPend = motivo.match(/Pendiente: (\d+) excepci/);
          if (!mPend) throw new Error(`«Confirmar y enviar» está deshabilitado por otra causa: ${motivo}`);
          await d.getByRole("button", { name: "Cancelar", exact: true }).last().click();
          await d.waitForTimeout(500);
          await d.locator("button").filter({ hasText: /^\s*Otorgamiento\s*\d*\s*$/ }).first().click();
          await d.waitForTimeout(1200);
          const marcar = d.locator("button").filter({ hasText: /Marcar sin comentarios y solicitar \(\d+\)/ }).first();
          if (!(await marcar.count())) throw new Error(`el tab Otorgamiento no ofrece «Marcar sin comentarios y solicitar (N)» con ${mPend[1]} pendientes`);
          const rotMarcar = (await marcar.innerText()).trim();
          await marcar.click();
          await d.waitForTimeout(500);
          // Primer paso: sólo abre el panel — todavía no se envió nada.
          const enviar = d.locator("button").filter({ hasText: /^\s*Enviar \d+ solicitud\(es\)\s*$/ }).first();
          if (!(await enviar.count())) throw new Error("«Marcar sin comentarios…» no abrió el panel con «Enviar N solicitud(es)»");
          const rotEnviar = (await enviar.innerText()).trim();
          await enviar.click();
          await d.waitForTimeout(2000);
          excepciones = `${mPend[1]} excepciones bloqueaban → «${rotMarcar}» abre el panel → «${rotEnviar}» ejecuta`;
          await d.locator("button").filter({ hasText: /^\s*Negocio\s*$/ }).first().click();
          await d.waitForTimeout(1200);
          const cta2 = d.locator("button").filter({ hasText: /^\s*(Enviar a Comité y Publicar|Cerrar oferta y publicar)\s*$/ }).first();
          if (!(await cta2.count())) throw new Error("tras justificar en bloque no encuentro el CTA de cierre en Negocio");
          await cta2.click();
          await d.waitForFunction(() => /Confirmar y enviar|Confirmar curse/.test(document.body.innerText || ""), null, { timeout: 30000 });
          const conf2 = d.locator("button").filter({ hasText: /^\s*(Confirmar y enviar|Confirmar curse)\s*$/ }).first();
          if (await conf2.isDisabled()) throw new Error(`sigue deshabilitado tras enviar las solicitudes: ${await conf2.getAttribute("title")}`);
          await conf2.click();
        } else {
          await conf.click();
        }
        // Con facturas emitidas hace menos de 8 días, `intentarCerrar` abre un segundo modal (qué hacer con
        // las descartadas) y el cierre real lo ejecuta su botón «Cerrar oferta». Si aparece, se confirma.
        let segundoModal = false;
        const btnPub = d.locator("button").filter({ hasText: /^\s*Cerrar oferta\s*$/ }).first();
        await btnPub.waitFor({ state: "visible", timeout: 4000 }).then(() => { segundoModal = true; }).catch(() => {});
        if (segundoModal) await btnPub.click();
        await d.waitForFunction(() => SYS_LOG.some((x) => /Solicitud de línea inyectada|No se pudo inyectar la solicitud|Cierre bloqueado/.test(x.mensaje || "")), null, { timeout: 20000 }).catch(() => {});
        // Lo que dice el DETALLE: el log de inyección entero y el registro que dejó, con la evidencia que la
        // regla cita (líneas de detalle y pedido).
        const det = await d.evaluate(() => {
          const e = SYS_LOG.find((x) => /Solicitud de línea inyectada/.test(x.mensaje || ""));
          const id = e && e.datos && e.datos.proceso;
          const reg = api2ListarProcesos().find((s) => s && s.idProceso === id);
          const cola = SYS_LOG.filter((x) => /linea|oferta/.test(x.fuente || "") || x.nivel === "error").slice(0, 8).map((x) => `[${x.nivel}/${x.fuente}] ${x.mensaje}`);
          return { log: e ? e.mensaje : null, id: id || null, reg: reg ? JSON.stringify(reg) : null, cliente: reg ? reg.cliente : null,
            lineas: reg ? (reg.detalle || []).length : null, deudores: reg ? reg.deudores : null, pedido: reg ? fmtMM(reg.pedido) : null, cola };
        });
        if (!det.id || !det.reg) throw new Error(`el detalle no registró la inyección (segundo modal ${segundoModal}) · log: ${det.cola.join(" | ").slice(0, 260)}`);
        idCaso = det.id;
        if (antesTubo.includes(det.id)) throw new Error(`el tubo ya tenía ${det.id} antes de cerrar: el caso no distingue nada`);
        // Lo que ve el TUBO: el mismo id, el registro idéntico, la secuencia local intacta.
        await p.waitForFunction((id) => api2ListarProcesos().some((s) => s && s.idProceso === id), det.id, { timeout: 15000 })
          .catch(() => { throw new Error(`el tubo no recibió ${det.id} por nex-solicitud: la solicitud quedó en la pestaña del detalle`); });
        const tubo = await p.evaluate((id) => {
          const L = api2ListarProcesos();
          return { n: L.filter((s) => s && s.idProceso === id).length, reg: JSON.stringify(L.find((s) => s && s.idProceso === id)), seq: SOLIC_SEQ, primero: L[0] && L[0].idProceso };
        }, det.id);
        if (tubo.n !== 1) throw new Error(`el tubo tiene ${tubo.n} entradas de ${det.id}`);
        if (tubo.reg !== det.reg) throw new Error(`el registro del tubo no es el del detalle (rearmado o alterado)`);
        if (tubo.seq !== seqTubo0) throw new Error(`la secuencia del tubo se movió (${seqTubo0}→${tubo.seq}): el tubo rearmó la solicitud`);
        const enBandeja = await verEnBandeja(h, det.id);
        if (!enBandeja) throw new Error(`la bandeja «Líneas › Solicitudes» del tubo no lista ${det.id}`);
        const escrito = await cambiosRepos(p, repos0);       // lo que el cierre dejó en el storage compartido
        const fin = await dejarComoEstaba(h, repos0, idCaso); restaurado = true;
        return `fila ${fila + 1}/${nFilas} de «Sin línea» (${det.cliente}) · CTA «${rotCta}» → «${rotConf}» · ${excepciones} · segundo modal (facturas recientes) ${segundoModal} · detalle: «${det.log}» → registro ${det.id}: ${det.lineas} línea(s) de detalle, ${det.deudores} deudor(es), pedido ${det.pedido} · tubo: ${det.id} ×${tubo.n}, registro idéntico, SOLIC_SEQ ${seqTubo0}→${tubo.seq}, en [0] ${tubo.primero === det.id} · bandeja lo lista ${enBandeja} · el cierre escribió en storage: ${escrito.length ? escrito.join(", ") : "nada"} · al salir: ${fin}`;
      } finally {
        if (!restaurado) await dejarComoEstaba(h, repos0, idCaso).catch(() => {});
      }
    } },

  { id: "e2e-15-bis-bis-b", titulo: "lo inyectado en el detalle no existe en el tubo hasta que cruza por nex-solicitud, y cruzar N veces deja UNA entrada",
    correr: async (h) => {
      const p = h.pagina;
      await h.encenderDirectorio();                       // idempotente; se apaga al salir
      let d = null, det = null, restaurado = false;
      // Limpieza en las DOS pestañas: la solicitud fuera de ambas, el SOLIC_SEQ del detalle en su valor MEDIDO
      // (no en un literal) y el Directorio apagado. Idempotente: al final y, si el caso lanzó, desde el `finally`.
      const limpiar = async () => {
        const enTubo = det ? await quitarSolicitud(p, det.id) : 0;
        const enDet = (d && det) ? await d.evaluate(({ id, seq0 }) => {
          const L = api2ListarProcesos();
          for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].idProceso === id) L.splice(i, 1);
          SOLIC_SEQ = seq0;
          return { quedan: L.filter((s) => s && s.idProceso === id).length, seq: SOLIC_SEQ };
        }, { id: det.id, seq0: det.seq0 }) : { quedan: 0, seq: null };
        await h.apagarDirectorio();
        return { enTubo, enDet };
      };
      try {
        d = await h.abrirDetalle(0);
        const seqTubo0 = await p.evaluate(() => SOLIC_SEQ);
        // (1) En el DETALLE: inyectar por API 1 con una secuencia lejana y quedarse con SOLICITUDES_LINEA[0].
        det = await d.evaluate(() => {
          const seq0 = SOLIC_SEQ;                           // se restaura a ESTE valor al final
          SOLIC_SEQ = 92500;
          const id = api1Inyeccion({ rut: "76.151.515-5", cliente: "Prueba e2e 15-bis-bis", tipo: "modificar", subtipo: "agregar_deudores",
            totalPropuesto: 740e6, propFactoring: 740e6, propGlobal: 0, propConfirming: 0, pedido: 90e6,
            detalle: [{ deudor: "Codelco", rutDeudor: null, monto: 90e6, pide: "puntual", motivo: "par", alcance: null, tipoLinea: "puntual" }],
            deudores: 1, origen: { dealId: "OP-E2E", negocio: null }, ejecutivo: "e2e-15-bis-bis", automatica: true });
          return { id, seq0, seq1: SOLIC_SEQ, reg: JSON.stringify(SOLICITUDES_LINEA[0]), enCero: SOLICITUDES_LINEA[0].idProceso === id };
        });
        if (!det.enCero) throw new Error("api1Inyeccion no dejó el registro en SOLICITUDES_LINEA[0]");
        // (2) El TUBO no lo ve: otro documento, otro módulo. Es el defecto que la regla describe.
        const aislado = !(await idsTubo(p)).includes(det.id);
        if (!aislado) throw new Error(`el tubo ve ${det.id} sin que nadie lo haya posteado: ¿SOLICITUDES_LINEA compartido?`);
        // (3) Cruza por el canal, tal como lo hace cerrarOferta.
        const post = () => d.evaluate(() => { window.opener.postMessage({ type: "nex-solicitud", registro: SOLICITUDES_LINEA[0] }, ORIGEN_APP); return !!window.opener; });
        if (!(await post())) throw new Error("la pestaña del detalle no tiene window.opener: el canal no existe");
        await p.waitForFunction((id) => api2ListarProcesos().some((s) => s && s.idProceso === id), det.id, { timeout: 15000 })
          .catch(() => { throw new Error(`el tubo no incorporó ${det.id} tras el postMessage`); });
        const t1 = await p.evaluate((id) => { const L = api2ListarProcesos(); return { n: L.filter((s) => s && s.idProceso === id).length, reg: JSON.stringify(L.find((s) => s && s.idProceso === id)), seq: SOLIC_SEQ }; }, det.id);
        if (t1.n !== 1 || t1.reg !== det.reg) throw new Error(`incorporado ×${t1.n}, idéntico ${t1.reg === det.reg}`);
        if (t1.seq !== seqTubo0) throw new Error(`la secuencia del tubo se movió (${seqTubo0}→${t1.seq}): rearmó`);
        // (4) Dos veces más el MISMO registro ⇒ sigue una sola entrada.
        await post(); await post();
        await p.waitForTimeout(800);
        const n3 = await p.evaluate((id) => api2ListarProcesos().filter((s) => s && s.idProceso === id).length, det.id);
        if (n3 !== 1) throw new Error(`tras 3 postMessage el tubo tiene ${n3} entradas de ${det.id}`);
        // (5) Dirección negativa: sin registro, o con otro tipo, no se escribe nada.
        const nAntes = (await idsTubo(p)).length;
        await d.evaluate(() => {
          window.opener.postMessage({ type: "nex-solicitud" }, ORIGEN_APP);
          window.opener.postMessage({ type: "nex-solicitud", registro: { rut: "sin id" } }, ORIGEN_APP);
          window.opener.postMessage({ type: "nex-otra", registro: { ...SOLICITUDES_LINEA[0], idProceso: "PRC-99999" } }, ORIGEN_APP);
        });
        await p.waitForTimeout(800);
        const despues = await idsTubo(p);
        if (despues.length !== nAntes || despues.includes("PRC-99999")) throw new Error(`un mensaje sin registro o de otro tipo escribió en el tubo (${nAntes}→${despues.length})`);
        // (6) La bandeja del tubo lo lista.
        const enBandeja = await verEnBandeja(h, det.id);
        if (!enBandeja) throw new Error(`la bandeja «Líneas › Solicitudes» no lista ${det.id}`);
        const fin = await limpiar(); restaurado = true;
        return `${det.id} inyectado en el detalle · el tubo NO lo ve ${aislado} · tras nex-solicitud ×1 registro idéntico, SOLIC_SEQ del tubo ${seqTubo0}→${t1.seq} · ×3 ⇒ ${n3} entrada · sin registro / otro tipo no escriben ${despues.length === nAntes} · bandeja ${enBandeja} · al salir: retirada de las dos pestañas ${fin.enTubo === 0 && fin.enDet.quedan === 0} · SOLIC_SEQ del detalle ${det.seq0}→${det.seq1}→${fin.enDet.seq} (restaurado al medido) · Directorio apagado`;
      } finally {
        if (!restaurado) await limpiar().catch(() => {});
      }
    } },
];
