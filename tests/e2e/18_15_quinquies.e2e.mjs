/* Gate e2e de la regla 15-quinquies: el DOCUMENTO de la solicitud al comité («Ver documento» en la
   bandeja Líneas › Solicitudes) se arma con el REGISTRO INYECTADO y no re-derivando la solicitud, un
   campo ausente se DICE («no viene en el payload», en gris, nunca un guión ni un relleno), tiene CINCO
   secciones (`DocSec`) con el payload completo y su botón de copia, y los montos van en PESOS con el
   `M$` al lado. Todo vive en el JSX de `DocumentoSolicitud` —no hay función de nivel módulo que arme las
   secciones—, así que se ejercita la pantalla real: se inyecta por consola un registro con la forma que
   produce `solicitudComiteDeOferta` + `api1Inyeccion` (por `recibirSolicitudLinea`, el mismo camino por
   el que la solicitud del detalle llega al tubo), se abre la bandeja y se lee el modal.
   ANCLAS: el modal se localiza por su rótulo «Documento de la solicitud al comité» y es el ancestro más
   cercano que contiene las secciones `DocSec` (<section>, el único del fuente); una fila rótulo→valor
   (`F`) es un div con exactamente dos <span> dentro de una sección (la grilla de deudores tiene seis);
   el cierre es el botón `title="Cerrar"` del modal. Ninguna clase de Tailwind. El gris de la regla se
   lee de la paleta de la página (`C.faint`, computado por el navegador) y los esperados en pesos los
   calcula la página con `fmtCLP`/`fmtMM`: acá no hay literal de color ni de formato.
   SONDAS / dirección negativa:
   · «registro inyectado, no re-derivado»: el registro trae un deudor, un RUT, un monto, un N° de negocio
     y una hora de inyección que NO existen en ningún activo de hoy; si el documento re-derivara la
     solicitud con las líneas o el libro de hoy, ninguno aparecería. El `<pre>` del payload tiene que ser
     byte a byte el JSON del objeto que está en la bandeja.
   · «ausente se dice»: el conjunto de rótulos marcados «no viene en el payload» tiene que ser EXACTAMENTE
     el de los campos que el registro no trae: 5 en la automática (venc., fianzas, garantías, monto
     garantías, nota ponderada) y OTROS 3 en una armada a mano con esos cinco llenos (subtipo, gap,
     operación de origen). Y «viene en cero» ≠ «no viene»: propGlobal/propConfirming = 0 se muestran
     como $0, no como ausentes. Ningún valor de las filas rótulo→valor es un guión. La grilla Deudores
     NO se gatea: `d.pide || "—"` y `d.alcance || "—"` (pipeline_comercial.jsx ~22283) sí pintan un
     guión con pide/alcance nulos —desfase con la viñeta 2 de la regla, hallazgo de producto—; el caso
     lo MIDE y lo deja dicho en el detalle, sin fallar por él.
   · sondas plantadas contra el propio verificador: una fila ausente pintada en `C.sub` en vez de
     `C.faint`, una «rellenada» con guión y un campo presente marcado como ausente; se plantan y se
     retiran dentro del mismo `evaluate`, así que nunca sobreviven a una comprobación que lance.
   · «pesos con M$ al lado»: la fila de propFactoring trae fmtCLP(v) Y fmtMM(v) —calculados en la página—
     y se comprueba que la abreviatura sola NO contiene los dígitos que el peso sí (por eso hace falta el
     peso); propFactoring − pedido = vigente y pedido = suma del detalle, leídos del documento.
   RESTAURA: cierra el modal de verdad por su botón (Escape no lo cierra y su overlay tapa la navbar del
   resto de la corrida), retira los dos registros de `SOLICITUDES_LINEA`, borra el asiento que
   `DetalleSolicitud` deja en `_cacheCli` para el RUT de la sonda y vuelve a Gestión diaria. */

const ID_AUTO = "PRC-99815", ID_MANO = "PRC-99816";
const RUT = "76.151.515-5";
const VIGENTE = 2617547792, PEDIDO_A = 123456789, PEDIDO_B = 163974720; // 287.431.509 → propFactoring 2.904.979.301
const TS_AUTO = "2026-01-15 09:30:00";
const AUSENTES_AUTO = ["Vencimiento propuesto", "Fianzas solidarias", "Garantías", "Monto de garantías", "Nota ponderada de los deudores"];
const AUSENTES_MANO = ["Subtipo", "Gap pedido", "Operación de origen"];
const SECCIONES = ["Identificación", "Línea propuesta", "Deudores", "Bienes, garantías y presentación comercial", "Payload inyectado (API 1)"];
const CABECERA = "Documento de la solicitud al comité"; // el rótulo del modal: su ancla por texto
const MARCA_AUSENTE = "no viene en el payload";

const inyectar = (pagina) => pagina.evaluate(({ ID_AUTO, ID_MANO, RUT, VIGENTE, PEDIDO_A, PEDIDO_B, TS_AUTO }) => {
  const lista = api2ListarProcesos();
  for (let i = lista.length - 1; i >= 0; i--) if (lista[i] && (lista[i].idProceso === ID_AUTO || lista[i].idProceso === ID_MANO)) lista.splice(i, 1);
  const n0 = lista.length;
  // AUTOMÁTICA: la forma exacta de `solicitudComiteDeOferta` (15-bis) + el estampado de `api1Inyeccion`.
  const deal = { id: "OP-15Q-SONDA", rutEmisor: RUT, cliente: "Cliente Sonda 15-quinquies", negocioNum: 48123 };
  const ev = { requiereComite: PEDIDO_A + PEDIDO_B, solicitudes: [
    { deudor: "Deudor Sonda Alfa", rutDeudor: "99.999.999-9", monto: PEDIDO_A, pide: "Línea Cliente - Deudor puntual", motivo: "sin cupo en la Línea Cliente - Deudor", alcance: "sólo este par" },
    { deudor: "Deudor Sonda Beta", rutDeudor: null, monto: PEDIDO_B, pide: "Línea Cliente - Deudor puntual", motivo: "la línea inicial no cubre este deudor", alcance: null } ] };
  const base = solicitudComiteDeOferta(deal, ev, "Ejecutivo Sonda", VIGENTE);
  if (!base) return { error: "solicitudComiteDeOferta devolvió null" };
  const auto = { ...base, idProceso: ID_AUTO, estado: "En gestión", refrescos: 0, ts: TS_AUTO, tsEstado: TS_AUTO };
  // A MANO: lo que el wizard llena y una automática no —para que el marcador siga al payload y no a un layout fijo.
  const mano = { rut: RUT, cliente: "Cliente Sonda 15-quinquies", tipo: "crear", subtipo: null,
    totalPropuesto: 300e6, propFactoring: 300e6, propGlobal: 0, propConfirming: 0,
    vencProp: "2027-09-16", fianzas: "Sí · aval del socio", garantias: "Hipoteca sobre bodega", montoGarantias: 100e6, promNota: 4.3,
    notas: "Presentación comercial de prueba 15-quinquies",
    detalle: [{ deudor: "Deudor Sonda Gamma", rutDeudor: "98.888.888-8", monto: 300e6, pide: "Línea Cliente - Deudor", motivo: null, alcance: null, tipoLinea: "normal" }],
    deudores: 1, ejecutivo: "Ejecutivo Sonda", idProceso: ID_MANO, estado: "En gestión", refrescos: 0, ts: "2026-01-16 10:00:00", tsEstado: "2026-01-16 10:00:00" };
  const r1 = recibirSolicitudLinea(auto), r2 = recibirSolicitudLinea(mano);
  // Los esperados en pesos los formatea la PÁGINA (`fmtCLP`/`fmtMM`), no Node: el ICU de Node no es el del navegador.
  return { r1, r2, n0, n1: lista.length, propFactoring: auto.propFactoring, pedido: auto.pedido,
    esperado: { clp: fmtCLP(auto.propFactoring), mm: fmtMM(auto.propFactoring), clpPedido: fmtCLP(auto.pedido), clpA: fmtCLP(PEDIDO_A), clpCero: fmtCLP(0) + " · " + fmtMM(0) },
    jsonAuto: JSON.stringify(lista.find((s) => s.idProceso === ID_AUTO), null, 2), jsonMano: JSON.stringify(lista.find((s) => s.idProceso === ID_MANO), null, 2) };
}, { ID_AUTO, ID_MANO, RUT, VIGENTE, PEDIDO_A, PEDIDO_B, TS_AUTO });

/* Retira los dos registros y el asiento que `DetalleSolicitud` dejó en `_cacheCli` al memoizar
   `lineasDeCliente(RUT)` (un RUT que no existe en DTESYNC no debe quedar cacheado como estado A). */
const limpiar = (pagina) => pagina.evaluate(({ ID_AUTO, ID_MANO, RUT }) => {
  const lista = api2ListarProcesos();
  for (let i = lista.length - 1; i >= 0; i--) if (lista[i] && (lista[i].idProceso === ID_AUTO || lista[i].idProceso === ID_MANO)) lista.splice(i, 1);
  const cache = (typeof _cacheCli === "object" && _cacheCli && typeof _cacheCli.delete === "function") ? _cacheCli.delete(RUT) : null;
  return { n: lista.length, quedan: lista.filter((s) => s && (s.idProceso === ID_AUTO || s.idProceso === ID_MANO)).length, cacheBorrada: cache };
}, { ID_AUTO, ID_MANO, RUT });

/* Lee el modal del documento: secciones, filas rótulo→valor (si está marcada ausente, su color y su
   estilo), el gris de la paleta computado, los guiones de la grilla Deudores, la cabecera, el <pre> del
   payload, los botones y el total de deudores. Con `sonda` planta una fila defectuosa junto a «Proceso»
   —«gris»: ausente pintado en C.sub · «guion»: valor «—» · «falso-ausente»: «Total propuesto» marcado—,
   la lee y la RETIRA antes de devolver, dentro del mismo evaluate. */
const leerDoc = (pagina, sonda = null) => pagina.evaluate(({ CABECERA, MARCA_AUSENTE, sonda }) => {
  const cab = [...document.querySelectorAll("div")].find((d) => d.children.length === 0 && d.textContent.trim() === CABECERA);
  if (!cab) return null;
  let modal = cab; while (modal && !modal.querySelector("section")) modal = modal.parentElement; // el ancestro con las DocSec
  if (!modal) return null;
  const esFila = (d) => d.children.length === 2 && d.children[0].tagName === "SPAN" && d.children[1].tagName === "SPAN";
  const filasDom = () => [...modal.querySelectorAll("section div")].filter(esFila);
  let plantada = null, probe = null;
  try {
    if (sonda) {
      const ancla = filasDom().find((d) => d.children[0].textContent.trim() === "Proceso");
      if (!ancla) return { error: "no encuentro la fila «Proceso» para plantar la sonda " + sonda };
      plantada = document.createElement("div");
      const k = document.createElement("span"), v = document.createElement("span");
      k.textContent = sonda === "falso-ausente" ? "Total propuesto" : "Campo sonda " + sonda;
      if (sonda === "guion") { v.textContent = "—"; v.style.color = C.ink; }
      else { v.textContent = MARCA_AUSENTE; v.style.fontStyle = "italic"; v.style.color = sonda === "gris" ? C.sub : C.faint; }
      plantada.append(k, v); ancla.parentElement.appendChild(plantada);
    }
    probe = document.createElement("span"); probe.style.color = C.faint; modal.appendChild(probe);
    const rgbFaint = getComputedStyle(probe).color; // el gris de la regla, como lo pinta el navegador
    const secciones = [...modal.querySelectorAll("section h2")].map((h) => h.textContent.trim());
    const filas = filasDom().map((d) => {
      const k = d.children[0].textContent.trim(), v = d.children[1], cs = getComputedStyle(v);
      return { k, v: v.textContent.trim(), ausente: v.textContent.trim() === MARCA_AUSENTE, color: cs.color, italic: cs.fontStyle };
    });
    const secDeudores = [...modal.querySelectorAll("section")].find((s) => { const h = s.querySelector("h2"); return h && h.textContent.trim() === "Deudores"; });
    const guionesGrilla = secDeudores ? [...secDeudores.querySelectorAll("span")].filter((s) => s.children.length === 0 && /^[—–-]$/.test(s.textContent.trim())).length : null;
    const pre = modal.querySelector("pre");
    const botones = [...modal.querySelectorAll("button")].map((b) => b.textContent.trim());
    const texto = modal.innerText || "";
    const mTotal = texto.match(/(\d+) línea\(s\)\s*\n?\s*(\$[\d.]+)/);
    return { rgbFaint, secciones, filas, guionesGrilla, pre: pre ? pre.textContent : null, botones, cabecera: texto.slice(0, 400), texto,
      totalDeudores: mTotal ? { n: +mTotal[1], clp: mTotal[2] } : null };
  } finally { if (plantada) plantada.remove(); if (probe) probe.remove(); }
}, { CABECERA, MARCA_AUSENTE, sonda });

const digitos = (s) => +String(s || "").replace(/[^\d]/g, "");
/* El modal, como locator: el ancestro más cercano del rótulo que contiene una sección DocSec. */
const modalLoc = (pagina) => pagina.getByText(CABECERA, { exact: true }).locator("xpath=ancestor::*[.//section][1]");
const botonCerrar = (pagina) => modalLoc(pagina).getByTitle("Cerrar", { exact: true });

async function abrirDocumento(pagina, id) {
  const fila = pagina.locator("tr", { hasText: id }).first();
  if (!(await fila.count())) throw new Error(`la bandeja no lista ${id}`);
  await fila.click(); await pagina.waitForTimeout(400);
  const btn = pagina.locator("button", { hasText: /Ver documento/ });
  if ((await btn.count()) !== 1) throw new Error(`tras abrir ${id} hay ${await btn.count()} botón(es) «Ver documento» y se esperaba 1`);
  await btn.first().click(); await pagina.waitForTimeout(500);
  const doc = await leerDoc(pagina);
  if (!doc) throw new Error(`no aparece el modal «${CABECERA}»`);
  if (doc.error) throw new Error(doc.error);
  return doc;
}
async function cerrarDocumento(pagina) {
  await botonCerrar(pagina).first().click(); await pagina.waitForTimeout(300);
}
const comprobarAusentes = (doc, esperados, quien) => {
  const marcados = doc.filas.filter((f) => f.ausente);
  const set = new Set(marcados.map((f) => f.k));
  const faltan = esperados.filter((k) => !set.has(k)), sobran = [...set].filter((k) => !esperados.includes(k));
  if (faltan.length || sobran.length) throw new Error(`${quien}: los marcados «${MARCA_AUSENTE}» no son los campos ausentes del registro · faltan ${JSON.stringify(faltan)} · sobran ${JSON.stringify(sobran)} · marcados ${JSON.stringify([...set])}`);
  const malPintados = marcados.filter((f) => f.color !== doc.rgbFaint || f.italic !== "italic");
  if (malPintados.length) throw new Error(`${quien}: ausentes no van en gris (C.faint = ${doc.rgbFaint}) e itálica: ${JSON.stringify(malPintados.map((f) => [f.k, f.color, f.italic]))}`);
  const guiones = doc.filas.filter((f) => /^[—–-]?$/.test(f.v));
  if (guiones.length) throw new Error(`${quien}: hay campos vacíos o con guión en vez de decirlo: ${JSON.stringify(guiones.map((f) => f.k))}`);
  return marcados.length;
};

export const casos = [
  { id: "e2e-15-quinquies", titulo: "«Ver documento» arma el documento con el REGISTRO inyectado (deudor, RUT, monto, N° y hora que hoy no existen; <pre> = JSON del registro), 5 secciones DocSec + Copiar JSON, exactamente los campos ausentes dicen «no viene en el payload» en gris (5 en la automática, otros 3 en la armada a mano; $0 no es ausente; ningún guión en los campos de cabecera) y los montos van en pesos con M$ al lado (propFactoring − pedido = vigente, pedido = suma del detalle)",
    correr: async (h) => {
      const { pagina } = h;
      let iny = null;
      try {
        iny = await inyectar(pagina);
        if (iny.error) throw new Error(iny.error);
        if (iny.r1 !== true || iny.r2 !== true || iny.n1 !== iny.n0 + 2) throw new Error("no se pudieron inyectar los dos registros: " + JSON.stringify(iny));
        await h.irA("Líneas");
        const tab = pagina.locator("button", { hasText: /^\s*Solicitudes/ }).first();
        if (!(await tab.count())) throw new Error("no encuentro la pestaña «Solicitudes» de Líneas");
        await tab.click(); await pagina.waitForTimeout(600);
        if (!/Solicitudes en curso|solicitud\(es\) en curso/i.test(await h.texto(pagina))) throw new Error("la bandeja de solicitudes no montó");

        // ── AUTOMÁTICA ──
        const A = await abrirDocumento(pagina, ID_AUTO);
        if (JSON.stringify(A.secciones) !== JSON.stringify(SECCIONES)) throw new Error("las secciones no son las cinco de DocSec en su orden: " + JSON.stringify(A.secciones));
        if (!/Entró sola al cerrar la oferta \(API 1\)/.test(A.cabecera)) throw new Error("la cabecera no dice que entró sola por API 1: " + A.cabecera.slice(0, 200));
        // Registro inyectado, no re-derivado: los datos que hoy no existen tienen que estar en el documento.
        const marcas = ["Deudor Sonda Alfa", "99.999.999-9", iny.esperado.clpA, "N° 48123 · OP-15Q-SONDA", TS_AUTO, "Deudor Sonda Beta", "sin RUT"];
        const noEstan = marcas.filter((m) => !A.texto.includes(m));
        if (noEstan.length) throw new Error("el documento NO muestra datos del registro inyectado (¿re-deriva?): faltan " + JSON.stringify(noEstan));
        if (A.pre == null) throw new Error("no hay <pre> con el payload");
        if (A.pre !== iny.jsonAuto) throw new Error(`el <pre> del payload no es el JSON del registro que está en la bandeja (${A.pre.length} vs ${iny.jsonAuto.length} caracteres)`);
        const payload = JSON.parse(A.pre);
        const nClaves = Object.keys(payload).length;
        if (payload.automatica !== true || payload.idProceso !== ID_AUTO || nClaves < 15) throw new Error(`payload incompleto: automatica=${payload.automatica} id=${payload.idProceso} claves=${nClaves}`);
        if (!A.botones.some((b) => /Copiar JSON/.test(b))) throw new Error("falta el botón «Copiar JSON»: " + JSON.stringify(A.botones));
        // Ausentes: exactamente los cinco que una automática no captura, en gris, y sin guiones en las filas rótulo→valor.
        const nAusA = comprobarAusentes(A, AUSENTES_AUTO, "automática");
        // «Viene en cero» ≠ «no viene»: propGlobal y propConfirming son 0 y se muestran como $0.
        const ceros = A.filas.filter((f) => /^Propuesta (global|confirming)$/.test(f.k));
        if (ceros.length !== 2 || ceros.some((f) => f.ausente || f.v !== iny.esperado.clpCero)) throw new Error("un campo en CERO no se muestra como $0 · $0: " + JSON.stringify(ceros.map((f) => [f.k, f.v])));
        // Pesos con M$ al lado, calculados en la página; la abreviatura sola esconde los dígitos que el peso sí trae.
        const pf = A.filas.find((f) => f.k === "Propuesta factoring");
        if (!pf || !pf.v.includes(iny.esperado.clp) || !pf.v.includes(iny.esperado.mm)) throw new Error(`«Propuesta factoring» no trae el peso Y el M$: «${pf && pf.v}» (esperado ${iny.esperado.clp} · ${iny.esperado.mm})`);
        const colaPesos = iny.esperado.clp.slice(-7); // «979.301»
        if (iny.esperado.mm.includes(colaPesos) || !iny.esperado.clp.includes(colaPesos)) throw new Error("la sonda de la abreviatura no discrimina: " + iny.esperado.mm);
        const gap = A.filas.find((f) => f.k === "Gap pedido"), tp = A.filas.find((f) => f.k === "Total propuesto");
        if (!gap || !gap.v.includes(iny.esperado.clpPedido)) throw new Error("«Gap pedido» no trae el pedido en pesos: " + (gap && gap.v));
        if (!tp) throw new Error("no hay fila «Total propuesto»");
        const pfPesos = digitos(pf.v.split("·")[0]), gapPesos = digitos(gap.v.split("·")[0]), tpPesos = digitos(tp.v.split("·")[0]);
        if (pfPesos - gapPesos !== VIGENTE || tpPesos !== pfPesos) throw new Error(`no se ve que propFactoring sea la vigente más lo pedido: ${pfPesos} − ${gapPesos} = ${pfPesos - gapPesos} ≠ ${VIGENTE} (total propuesto ${tpPesos})`);
        if (!A.totalDeudores || A.totalDeudores.n !== 2 || digitos(A.totalDeudores.clp) !== gapPesos) throw new Error("el total del detalle de deudores no cuadra con el gap pedido: " + JSON.stringify(A.totalDeudores) + " vs " + gapPesos);
        // SONDAS DEL VERIFICADOR: tres filas defectuosas plantadas —un ausente en C.sub en vez de C.faint, un campo
        // «rellenado» con guión, y un campo presente marcado como ausente— y `comprobarAusentes` tiene que rechazar
        // cada una; si las aceptara, el PASA de arriba no afirmaría nada. Se plantan y retiran dentro de `leerDoc`.
        const sondas = [];
        for (const tipo of ["gris", "guion", "falso-ausente"]) {
          const D = await leerDoc(pagina, tipo);
          if (!D || D.error) throw new Error("no pude plantar la sonda " + tipo + ": " + (D ? D.error : "modal cerrado"));
          let atrapada = false;
          try { comprobarAusentes(D, tipo === "gris" ? [...AUSENTES_AUTO, "Campo sonda gris"] : AUSENTES_AUTO, "sonda"); } catch (e) { atrapada = true; }
          sondas.push(tipo + ":" + (atrapada ? "atrapada" : "PASÓ"));
        }
        if (sondas.some((s) => /PASÓ$/.test(s))) throw new Error("el verificador acepta una fila defectuosa plantada (¿C.sub igual a C.faint?): " + sondas.join(" · "));
        const trasSondas = await leerDoc(pagina);
        if (!trasSondas || trasSondas.filas.length !== A.filas.length) throw new Error(`una sonda quedó plantada en el modal: ${trasSondas && trasSondas.filas.length} filas vs ${A.filas.length}`);
        await cerrarDocumento(pagina);
        if (await leerDoc(pagina)) throw new Error("el modal no se cerró");

        // ── A MANO: los cinco llenos ya no se marcan y se marcan los tres que ésta no trae ──
        const M = await abrirDocumento(pagina, ID_MANO);
        if (JSON.stringify(M.secciones) !== JSON.stringify(SECCIONES)) throw new Error("(a mano) secciones: " + JSON.stringify(M.secciones));
        if (!/Armada en el asistente/.test(M.cabecera)) throw new Error("(a mano) la cabecera no la distingue de una automática: " + M.cabecera.slice(0, 200));
        const nAusM = comprobarAusentes(M, AUSENTES_MANO, "a mano");
        const llenos = M.filas.filter((f) => AUSENTES_AUTO.includes(f.k));
        if (llenos.length !== 5 || llenos.some((f) => f.ausente)) throw new Error("(a mano) campos que el registro SÍ trae salen marcados como ausentes: " + JSON.stringify(llenos.map((f) => [f.k, f.v])));
        if (M.pre !== iny.jsonMano) throw new Error("(a mano) el <pre> no es el JSON del registro de la bandeja");
        if (!M.texto.includes("Presentación comercial de prueba 15-quinquies")) throw new Error("(a mano) las notas del registro no aparecen");
        await cerrarDocumento(pagina);
        if (await leerDoc(pagina)) throw new Error("(a mano) el modal no se cerró");
        return `secciones ${A.secciones.length} = DocSec ×5 · cabecera automática ok · registro inyectado visible (${marcas.length}/${marcas.length} marcas, ts ${TS_AUTO}) · <pre> = JSON del registro (${nClaves} claves, automatica true) · Copiar JSON ok · ausentes automática ${nAusA}/5 = ${AUSENTES_AUTO.length} exactos, gris (C.faint ${A.rgbFaint}) + itálica, 0 guiones en las filas rótulo→valor · $0 no es ausente (${iny.esperado.clpCero}) · propFactoring «${pf.v}» (M$ sin ${colaPesos}) · ${pfPesos} − ${gapPesos} = ${VIGENTE} vigente · detalle ${A.totalDeudores.n} líneas por ${A.totalDeudores.clp} = gap · a mano: ausentes ${nAusM}/3 exactos, los 5 llenos presentes, cabecera «Armada en el asistente» · sondas plantadas ${sondas.join(" · ")} y retiradas · grilla Deudores «—» con pide/alcance nulos: automática ${A.guionesGrilla}, a mano ${M.guionesGrilla} (hallazgo de producto, no gatea)`;
      } finally {
        // Escape NO cierra este modal (no tiene handler) y su overlay tapa la navbar: si una comprobación lanzó
        // con el documento abierto, se cierra de verdad por su botón antes de navegar, o todo caso e2e posterior
        // muere en el clic de la navbar. Luego se retiran los registros y el asiento de `_cacheCli`.
        const cerrar = botonCerrar(pagina);
        if (await cerrar.count().catch(() => 0)) await cerrar.first().click({ timeout: 5000 }).catch(() => {});
        await limpiar(pagina);
        await h.irA("Gestión diaria").catch(() => {});
      }
    } },
];
