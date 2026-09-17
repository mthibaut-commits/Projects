// AECSYNC — activo A2. Cesiones electrónicas: qué documento le cedió cada cliente a qué factoring.
//
// **ES EL REGISTRO COMPLETO, Y EL MAESTRO DE LA PARTICIPACIÓN** (15-09-2026, decisión del usuario:
// «tienes que hacer que A5 y A2 sean iguales; primero genera A2 y luego genera A5 con los resultados
// de A2»). Antes A2 y A5 respondían la MISMA pregunta —cuánto de lo que cede el cliente se lo lleva
// Security— por caminos independientes, y discrepaban **13,8 pto en la mediana y 61,8 en el p90**:
// A5 decía 97,7% donde A2 medía 5,1%. Ahora A2 se genera primero y A5 se MIDE sobre él, así que no
// pueden contradecirse: es el mismo número contado una sola vez.
//
// Eso obligó a que A2 dejara de ser una MUESTRA. Traía 1.300 cesiones mientras A5 declaraba 9.104 en
// sus series: el analítico afirmaba siete veces más cesiones de las que el registro contenía, y con
// tan poco no se puede medir una serie semanal —0,63 cesiones por cliente-semana, o sea casi todas
// las semanas vacías—. Ahora se cede una fracción realista del pool CEDIBLE de cada cliente.
//
// ── LO QUE NO SE PUDO CONSERVAR, y por qué ────────────────────────────────────────────────────────
// Los NIVELES de A5 eran imposibles contra el registro de facturas: sólo **114 de 233 clientes**
// tenían documentos suficientes para sostener lo que declaraban, y el peor pedía 11.579 MM en 61
// cesiones teniendo 2.019 MM en 36 documentos —5,7× más plata de la que emitió—. Un cliente no puede
// ceder lo que no facturó, así que el volumen pasa a estar acotado por el A1.
//
// Lo que SÍ se conserva es la PARTICIPACIÓN, que es lo que el negocio usa: el SOW es un cociente, y
// el cociente sí se puede respetar aunque el volumen cambie. La probabilidad de que cada cesión vaya
// a nosotros sale de la INTENCIÓN declarada en `lib/intencion_sow.js` —la trayectoria semanal que A5
// declaraba, congelada—, así que quién es buen cliente y quién se está yendo se mantiene —y con eso
// el descuento por SOW del pricing no se mueve—, pero ahora colgando de cesiones que existen.
//
// ── Por qué la intención NO se lee del A5 (17-09-2026) ───────────────────────────────────────────
// Este módulo la tomaba de los campos MEDIDOS del A5 (`SOWActualPct`, `HistoricoSemanal[].SOWPct`) y
// el A5 los volvía a medir sobre lo recién escrito: un sorteo por documento no reproduce su propio
// umbral, y cada corrida completa movía cesiones de cesionario sin que nada cambiara (153 de 7.480,
// luego 67, luego 33: convergía y no llegaba). Con la intención en un archivo propio, A2 es función
// del A1 y de ese archivo, y el generador tiene punto fijo (gate `tests/contract/generador.test.mjs`).
// El conjunto de cedentes también sale de ahí: antes se completaba con el A2 anterior, es decir, con
// la propia salida.
//
// ── Reglas de plausibilidad, todas medibles contra el A1 ──────────────────────────────────────────
//   · sólo documentos a CRÉDITO (`FormaPago === "2"`): un factoring compra crédito, no contado;
//   · sin nota de crédito ni reclamo: un documento anulado o reclamado no se cede;
//   · un documento se cede UNA sola vez — dos cesiones del mismo folio serían dos dueños del mismo
//     crédito, que es justamente lo que el registro electrónico existe para impedir;
//   · **la fecha de cesión cae DESPUÉS de la emisión** y no pasa del corte del activo;
//   · **el monto cedido es IGUAL O MENOR que el del documento.** La cesión parcial existe —se cede
//     una parte del crédito y el resto sigue siendo del cliente—, pero ceder MÁS sería transferir un
//     crédito que no existe. Los dos son invariantes del activo y se comprueban acá, no aguas abajo:
//     un consumidor que reciba `MontoCesion > MontoDocumento` no tiene forma de arreglarlo.
const { semilla, ent, entre } = require("../lib/rng");
const { BICE_RUT, CESIONARIOS } = require("../lib/cesionarios");
const INTENCION = require("../lib/intencion_sow");

const DIA = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (s) => Date.parse(String(s).slice(0, 10) + "T00:00:00");
// Lunes de la semana de una fecha — la misma convención con que A5 rotula sus semanas.
const lunesDe = (f) => { const d = new Date(ms(f)); const dow = (d.getUTCDay() + 6) % 7; return iso(d.getTime() - dow * DIA); };

// EL PANEL DE CONTRAPARTES de cada cedente. Una empresa trabaja con dos o tres factoring, no con uno
// distinto por factura, así que el cesionario se sortea de un panel estable por RUT y con pesos
// decrecientes —hay una relación principal y el resto es marginal—, que es lo que hace que un share
// of wallet signifique algo. Nosotros quedamos FUERA del panel: nuestra parte la decide el SOW.
const AJENOS = CESIONARIOS.filter((c) => !c.nuestro);
function panelDe(rut) {
  const r = semilla("panel|" + rut);
  const n = ent(r, 2, 4);
  const barajado = AJENOS.map((c) => ({ c, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.c);
  const elegidos = barajado.slice(0, n);
  // Al menos un banco en el panel de la mayoría: la banca financia a la mayor parte de las empresas
  // con ventas, y sin eso la porción bancaria del mix quedaría anecdótica. El 20% que no accede a
  // banca es deliberado — son las que sólo llegan al factoring no bancario.
  if (r() < 0.8 && !elegidos.some((c) => c.banco)) elegidos[elegidos.length - 1] = barajado.find((c) => c.banco);
  const pesos = elegidos.map((_, i) => Math.pow(0.55, i) * entre(r, 0.8, 1.2));
  const suma = pesos.reduce((a, b) => a + b, 0);
  let acc = 0;
  return { elegidos, acum: pesos.map((w) => (acc += w / suma)) };
}

function generar({ DTESYNC }) {
  if (!Array.isArray(DTESYNC) || !DTESYNC.length) return [];

  // Corte del activo: la emisión más reciente del batch. La cesión no puede ser posterior — el
  // archivo no la habría visto todavía.
  let corte = "";
  for (const d of DTESYNC) if (d && d.FchEmis && d.FchEmis > corte) corte = d.FchEmis;
  const corteMs = ms(corte);

  // ── Pool CEDIBLE por cedente, en orden estable (folio descendente, como el libro de ventas) ─────
  const pool = new Map();
  for (const d of DTESYNC) {
    if (!d || !d.RUTEmisor || !d.Folio) continue;
    if (!(d.FormaPago === "2" || d.FormaPago === 2)) continue;         // sólo crédito
    const est = d.EstadoDTE || {};
    if (est.NotaCredito === "1" || est.NotaCredito === 1) continue;    // anulado: no se cede
    if (est.Reclamado === "1") continue;                               // reclamado: no es cedible
    let a = pool.get(d.RUTEmisor); if (!a) { a = []; pool.set(d.RUTEmisor, a); }
    a.push(d);
  }
  for (const a of pool.values()) a.sort((x, y) => (+y.Folio || 0) - (+x.Folio || 0));

  // ── QUIÉN CEDE ──────────────────────────────────────────────────────────────────────────────────
  // Los que la intención declara: los clientes con ficha en el A5 (son clientes de factoring por
  // definición) y los cedentes sin ficha. No se inventa un cedente nuevo: que una empresa ceda o no es
  // un hecho del negocio, no una decisión de este generador — y tampoco se lee de la salida anterior.
  const cedentes = new Set([...Object.keys(INTENCION.clientes || {}), ...(INTENCION.cedentesSinFicha || [])]);

  // ── LA TRAYECTORIA DE PARTICIPACIÓN, por cliente y semana ───────────────────────────────────────
  // Es INTENCIÓN de generación, no resultado: dice qué proporción de las cesiones de esa semana va a
  // nosotros, y vive en `lib/intencion_sow.js` (en %, como el A5 la publica). El resultado se mide
  // después sobre las cesiones ya escritas (lo hace `share_of_wallet.js`), así que A5 termina
  // reportando lo que el registro contiene y no lo que aquí se pidió.
  const pct = (v) => Math.max(0, Math.min(100, +v || 0)) / 100;
  const intencionSow = (rut, lunes) => {
    const c = (INTENCION.clientes || {})[rut];
    if (c) {
      const w = c.semanas && c.semanas[lunes];
      if (w != null) return pct(w);
      if (c.actual != null) return pct(c.actual);
    }
    // Cedente sin ficha en el A5: perfil estable por RUT. No hereda de nadie.
    return entre(semilla("sowperfil|" + rut), 0.05, 0.75);
  };

  const out = [];
  let sinPool = 0;
  for (const rut of [...cedentes].sort()) {
    const docs = pool.get(rut) || [];
    if (!docs.length) { sinPool++; continue; }
    const r = semilla("cesion|" + rut);
    // TASA DE CESIÓN: qué fracción de lo que emitió a crédito termina cediendo. No se cede todo —el
    // cliente conserva parte de su cartera— y no se cede poco, o no sería cliente de factoring.
    const tasa = entre(r, 0.45, 0.85);
    const n = Math.max(1, Math.min(docs.length, Math.round(docs.length * tasa)));
    // Se recorre el pool salteando de forma determinista, para que las cesiones no queden todas en
    // los folios más nuevos —que son los que el inbound está ofreciendo justo ahora—.
    const paso = Math.max(1, Math.floor(docs.length / n));
    const elegidos = [];
    for (let i = ent(r, 0, Math.max(0, paso - 1)); i < docs.length && elegidos.length < n; i += paso) elegidos.push(docs[i]);

    const pn = panelDe(rut);
    for (const doc of elegidos) {
      // La cesión ocurre DESPUÉS de emitido el documento y antes del corte: entre 1 y 20 días, que es
      // el plazo en que un cedente lleva una factura al factoring.
      const rf = semilla("fcesion|" + rut + "|" + doc.Folio);
      const emisMs = ms(doc.FchEmis);
      const tope = Math.max(emisMs + DIA, Math.min(corteMs, emisMs + 20 * DIA));
      const fecha = Math.min(tope, emisMs + ent(rf, 1, 20) * DIA);
      const lunes = lunesDe(iso(fecha));

      // ¿A NOSOTROS O A LA COMPETENCIA? Lo decide la participación objetivo de esa semana. Es un
      // sorteo por documento y no un reparto exacto: el SOW resultante se MIDE después, y que difiera
      // unas décimas del objetivo es correcto — el cociente real de un registro discreto.
      const rc = semilla("dest|" + rut + "|" + doc.Folio);
      let ces = null;
      if (rc() >= intencionSow(rut, lunes)) {
        const k = rc();
        ces = pn.elegidos[pn.acum.findIndex((a) => k <= a)] || pn.elegidos[pn.elegidos.length - 1];
      }

      // MONTO DEL DOCUMENTO y MONTO CEDIDO. El primero es del A1 y no se discute; el segundo es igual
      // o menor. ~12% son cesiones PARCIALES (entre el 30% y el 95% del documento): el cliente cede
      // una parte del crédito y conserva el resto.
      const total = Math.round(+doc.MntTotal || 0);
      const rm = semilla("mcesion|" + rut + "|" + doc.Folio);
      const parcial = rm() < 0.12;
      const cedido = parcial ? Math.min(total, Math.max(1, Math.round(total * entre(rm, 0.30, 0.95)))) : total;

      const nombre = ces ? ces.nombre : "Factoring Security (BICE)";
      const rutFact = ces ? ces.rut : BICE_RUT;
      const correo = (s) => "contacto@" + String(s).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18) + ".cl";
      out.push({
        RUTCedente: doc.RUTEmisor,
        RazonSocialCedente: doc.RznSoc || "",
        EmailCedente: correo(doc.RznSoc || doc.RUTEmisor),
        RUTFactoring: rutFact,
        RazonSocialFactoring: nombre,
        EmailFactoring: correo(nombre),
        TipoDTE: doc.TipoDTE || "33",
        TipoDTEDesc: doc.TipoDTEDesc || "Factura electronica",
        Folio: doc.Folio,
        FechaEmisionDTE: doc.FchEmis,
        MontoDocumento: total,
        RUTEmisor: doc.RUTEmisor,
        RUTReceptor: doc.RUTRecep,
        RazonSocialReceptor: doc.RznSocRecep,
        EmailReceptor: correo(doc.RznSocRecep || doc.RUTRecep),
        FechaCesion: iso(fecha) + "T" + String(ent(rf, 0, 23)).padStart(2, "0") + ":" + String(ent(rf, 0, 59)).padStart(2, "0"),
        MontoCesion: cedido,
        FechaVencimientoCesion: doc.FchVenc || "",
        ReceptorElectronico: true,
        Servicio: "AECSync",
        Notificacion: "AEC_SINCRONIZADO",
        Extras: {},
      });
    }
  }

  // GUARDA: los invariantes se comprueban antes de devolver. Es el único punto del sistema donde
  // todavía se pueden arreglar — aguas abajo sólo queda mostrarlos mal.
  const vistos = new Set();
  for (const c of out) {
    if (String(c.FechaCesion).slice(0, 10) < c.FechaEmisionDTE) {
      throw new Error(`Cesión anterior a la emisión: folio ${c.Folio} de ${c.RUTCedente} (cesión ${c.FechaCesion}, emisión ${c.FechaEmisionDTE})`);
    }
    if (c.MontoCesion > c.MontoDocumento) {
      throw new Error(`Monto cedido mayor que el documento: folio ${c.Folio} de ${c.RUTCedente} (${c.MontoCesion} > ${c.MontoDocumento})`);
    }
    const k = c.RUTCedente + "|" + c.Folio;
    if (vistos.has(k)) throw new Error(`Folio cedido dos veces: ${c.Folio} de ${c.RUTCedente}`);
    vistos.add(k);
  }
  if (sinPool > 0) console.warn(`  ⚠  AECSYNC: ${sinPool} cedentes sin documentos cedibles en el A1 — no ceden.`);
  return out;
}
module.exports = { generar };
