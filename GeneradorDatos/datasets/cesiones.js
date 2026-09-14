// AECSYNC — activo A2. Cesiones electrónicas: qué documento le cedió cada cliente a qué factoring.
//
// ERA UN DATASET BASE Y NO RECONCILIABA CON EL A1. Medido sobre la entrega anterior: de las **1.300
// cesiones sólo 3** referenciaban un folio que DTESync declara para ese mismo cedente, aunque los 258
// cedentes sí son emisores del A1 y los rangos de folio se solapan (100.049–119.847 contra
// 100.002–219.450). Las dos entregas se produjeron con folios independientes, así que una cesión no se
// podía atribuir a ningún documento: **una factura cedida que no existe**.
//
// Y una cesión SIN documento no es un detalle de realismo. Todo lo que cuelga de ella queda sin poder
// calcularse y termina inventándose aguas abajo:
//   · «cedida a terceros» en la tabla de candidatas se sorteaba con un hash del folio,
//   · `perdidaCesion` —perder la oportunidad ante la competencia— era `rndDetBool(id, 0.12)`,
//   · `cedidasOtro` —cuántas facturas de esta oferta se llevó otro factoring— quedaba siempre en 0.
//
// Además **1.267 de las 1.300 cesiones tenían fecha ANTERIOR a la emisión** del documento que decían
// ceder. No se puede ceder una factura que todavía no se emitió.
//
// Ahora cada cesión APUNTA A UN DOCUMENTO REAL del cedente y copia sus campos del A1: folio, fecha de
// emisión, monto, RUT y razón social del receptor, vencimiento. Lo que sigue siendo propio de la cesión
// —a qué factoring, cuándo, con qué correo— se conserva de la entrega anterior, que es lo que la hace
// reconocible: los mismos siete factoring con los mismos pesos.
//
// Reglas de plausibilidad, todas medibles contra el A1:
//   · sólo documentos a CRÉDITO (`FormaPago === "2"`): un factoring compra crédito, no contado;
//   · sin nota de crédito ni reclamo: un documento anulado o reclamado no se cede;
//   · un documento se cede UNA sola vez — dos cesiones del mismo folio serían dos dueños del mismo
//     crédito, que es justamente lo que el registro electrónico existe para impedir;
//   · **la fecha de cesión cae DESPUÉS de la emisión** y no pasa del corte del activo: no se puede
//     ceder una factura que todavía no se emitió;
//   · **el monto cedido es IGUAL O MENOR que el del documento.** La cesión parcial existe —se cede
//     una parte del crédito y el resto sigue siendo del cliente—, pero ceder MÁS que la factura sería
//     transferir un crédito que no existe. Los dos son invariantes del activo y se comprueban acá, no
//     aguas abajo: un consumidor que reciba `MontoCesion > MontoDocumento` no tiene forma de arreglarlo.
//     La entrega anterior tenía las 1.300 cesiones por el total exacto, así que la cota «o menor»
//     nunca se ejercitaba; ahora una minoría es parcial para que el caso exista en el dato.
const { semilla, ent, entre } = require("../lib/rng");

const DIA = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (s) => Date.parse(String(s).slice(0, 10) + "T00:00:00");

function generar({ DTESYNC, AECSYNC }) {
  const previas = AECSYNC || [];
  if (!previas.length || !Array.isArray(DTESYNC) || !DTESYNC.length) return previas;

  // Fecha de corte del activo: la emisión más reciente que trae el batch. La cesión no puede ser
  // posterior —el archivo no la habría visto todavía—.
  let corte = "";
  for (const d of DTESYNC) if (d && d.FchEmis && d.FchEmis > corte) corte = d.FchEmis;
  const corteMs = ms(corte);

  // Documentos CEDIBLES por cedente, en orden estable (folio descendente, como el libro de ventas).
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

  // Cuántas cesiones pide cada cedente en la entrega anterior. Se respeta ese reparto —es lo que hace
  // que unos clientes cedan mucho y otros nada— acotado a lo que el cedente realmente emitió.
  const pedidas = new Map();
  for (const c of previas) { const k = c && c.RUTCedente; if (k) pedidas.set(k, (pedidas.get(k) || 0) + 1); }

  // Reparto: a cada cedente se le asignan documentos distintos, tomados de su propio pool.
  const asignados = new Map();  // RUTCedente -> [documento]
  for (const [rut, n] of pedidas) {
    const disponibles = pool.get(rut) || [];
    if (!disponibles.length) { asignados.set(rut, []); continue; }
    const r = semilla("cesion|" + rut);
    // Se recorre el pool salteando de forma determinista, para que las cesiones no queden todas en los
    // folios más nuevos —que son los que el inbound está ofreciendo justo ahora—.
    const paso = Math.max(1, Math.floor(disponibles.length / Math.max(1, n)));
    const elegidos = [];
    let i = ent(r, 0, Math.max(0, paso - 1));
    while (elegidos.length < n && i < disponibles.length) { elegidos.push(disponibles[i]); i += paso; }
    // Si el pool es más chico que lo pedido, se cede lo que hay: un cliente no puede ceder facturas
    // que no emitió. El conteo final se informa en la corrida.
    asignados.set(rut, elegidos);
  }

  // Emisión de las cesiones, conservando el orden y los campos propios de la entrega anterior.
  const cursor = new Map();
  const out = [];
  for (const c of previas) {
    const rut = c && c.RUTCedente; if (!rut) continue;
    const lista = asignados.get(rut) || [];
    const k = cursor.get(rut) || 0;
    const doc = lista[k];
    if (!doc) continue;                       // el cedente no tenía tantos documentos cedibles
    cursor.set(rut, k + 1);

    // La cesión ocurre DESPUÉS de emitido el documento y antes del corte del activo. Entre 1 y 20
    // días, que es el plazo en que un cedente lleva una factura al factoring.
    const r = semilla("fcesion|" + rut + "|" + doc.Folio);
    const emisMs = ms(doc.FchEmis);
    const tope = Math.max(emisMs + DIA, Math.min(corteMs, emisMs + 20 * DIA));
    const fecha = Math.min(tope, emisMs + ent(r, 1, 20) * DIA);

    // MONTO DEL DOCUMENTO y MONTO CEDIDO. El primero es del A1 y no se discute; el segundo es igual o
    // menor. ~12% son cesiones PARCIALES (entre el 30% y el 95% del documento): el cliente cede una
    // parte del crédito y conserva el resto.
    const total = Math.round(+doc.MntTotal || 0);
    const rm = semilla("mcesion|" + rut + "|" + doc.Folio);
    const parcial = rm() < 0.12;
    const cedido = parcial ? Math.min(total, Math.max(1, Math.round(total * entre(rm, 0.30, 0.95)))) : total;

    out.push({
      ...c,
      RazonSocialCedente: doc.RznSoc || c.RazonSocialCedente,
      TipoDTE: doc.TipoDTE || c.TipoDTE,
      TipoDTEDesc: doc.TipoDTEDesc || c.TipoDTEDesc,
      Folio: doc.Folio,
      FechaEmisionDTE: doc.FchEmis,
      MontoDocumento: total,
      RUTEmisor: doc.RUTEmisor,
      RUTReceptor: doc.RUTRecep,
      RazonSocialReceptor: doc.RznSocRecep,
      FechaCesion: iso(fecha) + String(c.FechaCesion || "").slice(10),  // conserva la hora original
      MontoCesion: cedido,
      FechaVencimientoCesion: doc.FchVenc || c.FechaVencimientoCesion,
    });
  }
  // GUARDA: los dos invariantes se comprueban antes de devolver. Es el único punto del sistema donde
  // todavía se pueden arreglar — aguas abajo sólo queda mostrarlos mal.
  for (const c of out) {
    if (String(c.FechaCesion).slice(0, 10) < c.FechaEmisionDTE) {
      throw new Error(`Cesión anterior a la emisión: folio ${c.Folio} de ${c.RUTCedente} (cesión ${c.FechaCesion}, emisión ${c.FechaEmisionDTE})`);
    }
    if (c.MontoCesion > c.MontoDocumento) {
      throw new Error(`Monto cedido mayor que el documento: folio ${c.Folio} de ${c.RUTCedente} (${c.MontoCesion} > ${c.MontoDocumento})`);
    }
  }
  return out;
}
module.exports = { generar };
