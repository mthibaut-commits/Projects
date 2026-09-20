// LINEA_CUPO + LINEA_DEUDOR — activo A23 · consulta de líneas en TRES NIVELES.
//
// POR QUÉ EXISTE ESTE ARCHIVO. Hasta el 20-09-2026 los tres niveles del modelo de líneas se
// FABRICABAN dentro del pipeline: `lineasDeCliente()` sorteaba con `pcRng(hashStr("lpar"+rut))` qué
// deudores llevaban línea propia, cuánto recibía cada uno, cuáles llevaban además una puntual y si
// estaba consumida; y `lineasDeudor()` se construía encima y sorteaba la holgura del nivel 3. El
// activo A7/A8 (`LINEA_DISPONIBLE`) trae 466 filas —una por (cliente, tipo de línea), sin RUT de
// deudor y sin nivel LF— y el motor consumía 3.636 objetos de línea. Los 3.170 de diferencia los
// inventaba la app, partiendo justamente de A7, que es lo que el levantamiento prohíbe en una línea:
//
//     «A7 y A16 nunca alimentan el motor de líneas; A23 nunca alimenta la vista Líneas. Mezclarlas
//      da el error más caro de todos —cursar contra cupo que ya está tomado— y no avisa.»
//     (`Levantamiento_Activos_Informacion.md` §5.4)
//
// El cupo NO es de NEX (regla 12: su ciclo de vida lo administra el sistema de gestión de líneas y lo
// cierra el core). La ESTRUCTURA tampoco: quién tiene línea con quién, de cuánto y de qué clase es una
// decisión de riesgo que toma ese sistema, no una que el pipeline pueda deducir. Acá se produce como
// activo y el pipeline sólo la lee.
//
// LA MIGRACIÓN NO MOVIÓ UN PESO. El algoritmo está portado VERBATIM del `.jsx`, con el mismo `hashStr`
// + mulberry32 (`lib/rng.js` es el mismo generador), de modo que las 3.636 líneas y los 741 deudores
// salen idénticos. Esto importa más de lo que parece: el stream del RNG se consume CONDICIONALMENTE
// —`rnd() < 0.18 && techoLF3 >= TRAMO_LINEA` cortocircuita, `quemada` sólo se sortea si hubo LF3, y un
// cupo 0 no consume nada—, así que reordenar una condición corre la estructura entera del cliente.
// Cambiar cualquier número de acá es una decisión de negocio, no una refactorización.
//
// TODOS LOS MONTOS EN PESOS ENTEROS (regla núcleo 9). El millón es abreviatura de pantalla.
//
// DOS BLOQUES, los tres niveles que A23 devuelve:
//   LINEA_CUPO    nivel 1 y 2 · una fila `CLIENTE` por cliente (su cupo asignado y su estado) y una
//                 fila por objeto de línea: LF1 y LF4 son comodines del cliente, LF2 y LF3 son del par.
//   LINEA_DEUDOR  nivel 3     · exposición global del RUT deudor, compartida por todos los clientes
//                 que le ceden. Es el control de concentración, y por eso su ampliación afecta a
//                 carteras que el ejecutivo que la pide no ve.
const { hashStr, pcRng } = require("../lib/rng");

// ── POLÍTICA DEL SISTEMA DE LÍNEAS ────────────────────────────────────────────────────────────────
// Estos dos umbrales dimensionan, y desde esta migración los aplica ESTE generador, no el pipeline.
// En el mantenedor del tenant siguen visibles pero declarativos, como `concentracionDeudorPct` y
// `frecuenciaMin` (regla 9-bis): viajan en el contrato del servicio y quien los aplica es el sistema
// de gestión de líneas. Moverlos acá y regenerar es lo que en producción sería un cambio de política
// aguas arriba, visible en la entrega siguiente.
const LINEA_MINIMA = 10e6; // monto mínimo de una línea aprobada; la PUNTUAL (LF3) está exenta (regla 27)
const OTROS_DEUDORES_PCT = 10; // % sobre los cupos de par que se reserva al comodín de otros deudores
const TRAMO_LINEA = 5e6; // las líneas se tallan en tramos de $5.000.000
const LF1_PESOS = 30e6; // línea inicial al enrolar un cliente, antes de que haya comité

const mmRound = (n) => Math.round(n);

// Reparto proporcional con PISO. El piso es por LÍNEA, así que limita CUÁNTAS líneas caben, no cuánto
// recibe cada una: si el presupuesto no alcanza para darle el mínimo a todos, los de menor peso quedan
// en 0 y su deudor pasa a financiarse por el comodín — que es para lo que existe.
function repartirConPiso(total, pesos, piso, tramo) {
  const n0 = pesos.length;
  const out = new Array(n0).fill(0);
  if (!(total > 0) || !n0) return out;
  const paso = Math.max(1, tramo || 1);
  const min = Math.max(0, piso);
  const cabenN = min > 0 ? Math.min(n0, Math.floor(total / min)) : n0;
  if (cabenN <= 0) return out; // ni una línea cabe: todo al comodín
  // Se quedan las de MAYOR peso: si hay que dejar deudores sin línea propia, que sean los que menos
  // volumen aportan.
  const idx = pesos
    .map((w, i) => ({ i, w: +w || 0 }))
    .sort((a, b) => b.w - a.w)
    .slice(0, cabenN);
  const sumaW = idx.reduce((a, x) => a + x.w, 0) || idx.length;
  let repartido = 0;
  idx.forEach((x, k) => {
    const ultimo = k === idx.length - 1;
    let v = ultimo ? total - repartido : Math.max(min, Math.round((total * (x.w / sumaW)) / paso) * paso);
    const restanN = idx.length - k - 1;
    v = Math.min(v, total - repartido - restanN * min);
    v = Math.max(min, v);
    out[x.i] = v;
    repartido += v;
  });
  return out;
}

// Índice (RUTEmisor → [{ rut, nombre, vol }]) de los deudores a los que cada cliente factura, ordenados
// por volumen. Es el insumo del dimensionamiento: el cupo del par se aprueba proporcional a la cuantía
// de la actividad comercial entre ese cliente y ese deudor (spec de líneas §3.9).
function paresPorEmisor(DTESYNC) {
  const m = new Map();
  for (const r of DTESYNC) {
    if (!r || !r.RUTEmisor || !r.RUTRecep) continue;
    let g = m.get(r.RUTEmisor);
    if (!g) {
      g = new Map();
      m.set(r.RUTEmisor, g);
    }
    const p = g.get(r.RUTRecep) || { rut: r.RUTRecep, nombre: r.RznSocRecep, vol: 0 };
    p.vol += r.MntTotal || 0;
    g.set(r.RUTRecep, p);
  }
  const out = new Map();
  for (const [rut, g] of m)
    out.set(
      rut,
      [...g.values()].sort((a, b) => b.vol - a.vol),
    );
  return out;
}

// ── EL ESTADO DE LÍNEAS DE UN CLIENTE ─────────────────────────────────────────────────────────────
// Tres estados, y un cliente está siempre en uno solo:
//   A · enrolado sin comité → sólo LF1 $30.000.000, deudores prime, un solo uso, se consume completa
//   B · con comité          → LF2 + LF3 + LF4, sin LF1
//   S · con comité y TODAS sus líneas suspendidas → sin cupo de ninguna clase. No es un cliente nuevo:
//       darle la LF1 rodearía una decisión de riesgo deliberada. Lo utilizado sigue vigente, porque
//       suspender una línea no libera lo ya cedido.
function estadoDeCliente(rutCli, { fila, enMaestro, meta, deudores }) {
  if (!fila && enMaestro) {
    const usado = mmRound(meta.reduce((x, m) => x + (m.uso || 0), 0));
    return { estado: "S", asignadaCliente: 0, usoCliente: usado, cola: deudores, lineas: [] };
  }
  if (!fila) {
    return {
      estado: "A",
      asignadaCliente: LF1_PESOS,
      usoCliente: 0,
      cola: deudores,
      lineas: [
        { id: "LF1-" + rutCli, tipo: "LF1", granularidad: "comodin", rutDeudor: null, aprobado: LF1_PESOS, vigente: 0, soloPrime: true, unSoloUso: true },
      ],
    };
  }

  const rnd = pcRng(hashStr("lpar" + rutCli));

  // EL NIVEL 1 ES EL CONSOLIDADO: la línea del RUT cliente **es** la suma de lo que se le asignó, sea
  // por par (LF2 normal, LF3 puntual) o al cliente con los otros deudores (LF4 comodín). No es un
  // tope aparte que se compare contra esa suma (20-09-2026, definición del usuario; ver regla 45).
  //
  // Hasta hoy el presupuesto era la línea asignada MENOS una holgura sorteada entre el 8% y el 22%,
  // heredada de cuando el nivel 1 se modelaba como un campo independiente. El resultado medido: en
  // **217 de 224** clientes la cabecera quedaba por sobre la suma de sus líneas, con una brecha
  // mediana del **13,7%** y **$36.024.682.300** acumulados de cupo que el cliente tenía en su ficha y
  // ninguna línea podía usar. Se reparte TODO lo aprobado, así que cabecera = Σ líneas por
  // construcción y no por comprobación.
  const objetivoTotal = fila.aprobada;
  const pctOtros = Math.max(0, Math.min(100, OTROS_DEUDORES_PCT));
  // EL PISO NO CREA CAPACIDAD. Se acota a lo que el comité aprobó: un cliente con casi todas sus líneas
  // suspendidas puede quedar con un presupuesto efectivo bajo el mínimo, y darle igual una línea de
  // 10MM sería aprobarle cupo que nadie aprobó.
  const pisoLinea = Math.min(Math.max(0, LINEA_MINIMA), objetivoTotal);
  const apComodinBase = Math.max(pisoLinea, Math.round(objetivoTotal * (pctOtros / (100 + pctOtros))));
  const objetivoPares = Math.max(0, objetivoTotal - apComodinBase);

  // Deudores con línea propia: los que concentran el 85% del volumen, entre 6 y 12. El tope de 12
  // importa —repartir el presupuesto entre veinte pares dejaba líneas de 5MM contra facturas de 8MM de
  // mediana, y cada factura quedaba sobre su propio cupo— y el piso de 6 también: escalar el número de
  // pares con el tamaño de la línea se midió PEOR (84% de ofertas cursables completas contra 80%).
  const volTotalCli = deudores.reduce((s, d) => s + d.vol, 0) || 1;
  let acum = 0,
    nPar85 = 0;
  for (const d of deudores) {
    nPar85++;
    acum += d.vol;
    if (acum / volTotalCli >= 0.85) break;
  }
  const nPar = Math.max(1, Math.min(deudores.length, Math.max(6, Math.min(12, nPar85))));
  const cabeza = deudores.slice(0, nPar);
  const cupos = repartirConPiso(objetivoPares, cabeza.map((d) => d.vol), pisoLinea, TRAMO_LINEA);
  // Lo que el piso dejó sin repartir NO se pierde: vuelve al comodín. Descontarlo del cliente sería
  // quitarle capacidad que el comité sí le aprobó, por una regla de tamaño mínimo de línea.
  const sobranteAlComodin = Math.max(0, objetivoPares - cupos.reduce((s, x) => s + x, 0));

  // ── EL COMODÍN, ya con el sobrante de los pares ─────────────────────────────────────────────────
  // Va DESPUÉS del reparto de pares porque depende de él. Respeta el MISMO piso —una LF4 bajo el mínimo
  // tampoco financia nada—, así que si sólo cabe una, esa categoría se queda con todo.
  const apComodin = apComodinBase + sobranteAlComodin;
  const repComodin = repartirConPiso(apComodin, meta.map((m) => m.peso || 1), pisoLinea, TRAMO_LINEA);
  const comodines = meta
    .map((m, i) => ({
      id: "LF4-" + rutCli + "-" + (m.categoria === "Lista Blanca" ? "LB" : "DA"),
      tipo: "LF4",
      granularidad: "comodin",
      categoria: m.categoria,
      rutDeudor: null,
      suspendida: m.suspendida,
      aprobado: repComodin[i],
      vigente: 0,
    }))
    .filter((x) => x.aprobado > 0);
  // Uso repartido en la misma proporción que lo aprobado: la utilización se distribuye sobre toda la
  // capacidad, no sólo sobre los pares.
  let usComodin = Math.min(apComodin, mmRound(fila.uso * (apComodin / (objetivoTotal || 1))));
  {
    let q = usComodin;
    for (const p of comodines) {
      const t2 = Math.min(p.aprobado, mmRound(q));
      p.vigente = t2;
      q = mmRound(q - t2);
    }
    usComodin = mmRound(usComodin - Math.max(0, q));
  }
  const necesario = Math.max(0, mmRound(fila.uso - usComodin));

  const lineas = [];
  cabeza.forEach((d, i) => {
    const cupo = cupos[i];
    if (cupo <= 0) return; // no alcanzó para una línea propia: lo cubre el comodín
    // ~18% de los pares con línea llevan además una PUNTUAL (LF3) tallada sobre su cupo. Una LF3 sólo
    // puede estar intacta o consumida COMPLETA (spec §3.6): nunca a medias. La PUNTUAL está EXENTA del
    // mínimo —su tamaño lo fija la operación, no la política—, pero se talla para que lo que le quede a
    // la LF2 siga sobre el piso: si no, partir el cupo en dos dejaría la normal bajo el mínimo por la
    // puerta de atrás.
    const techoLF3 = Math.max(0, cupo - pisoLinea);
    const mLF3 =
      rnd() < 0.18 && techoLF3 >= TRAMO_LINEA
        ? Math.min(techoLF3, Math.max(TRAMO_LINEA, Math.round((cupo * (0.2 + rnd() * 0.3)) / TRAMO_LINEA) * TRAMO_LINEA))
        : 0;
    if (mLF3 > 0)
      lineas.push({
        id: "LF3-" + rutCli + "-" + i,
        tipo: "LF3",
        granularidad: "par",
        rutDeudor: d.rut,
        nombreDeudor: d.nombre,
        aprobado: mLF3,
        vigente: 0,
        unSoloUso: true,
        quemada: rnd() < 0.34,
      });
    lineas.push({
      id: "LF2-" + rutCli + "-" + i,
      tipo: "LF2",
      granularidad: "par",
      rutDeudor: d.rut,
      nombreDeudor: d.nombre,
      aprobado: Math.max(pisoLinea, cupo - mLF3),
      vigente: 0,
    });
  });

  // Si la talla de una LF3 deja a las LF2 sin capacidad para sostener el uso vigente, la puntual se
  // devuelve a su LF2: es preferible a un cliente cuyo uso no cabe en ninguna línea.
  for (const l3 of lineas.filter((l) => l.tipo === "LF3")) {
    if (lineas.filter((l) => l.tipo === "LF2").reduce((s, l) => s + l.aprobado, 0) >= necesario) break;
    const par = lineas.find((l) => l.tipo === "LF2" && l.rutDeudor === l3.rutDeudor);
    if (!par) continue;
    par.aprobado = mmRound(par.aprobado + l3.aprobado);
    l3.descartada = true;
  }
  for (let i = lineas.length - 1; i >= 0; i--) if (lineas[i].descartada) lineas.splice(i, 1);

  // Uso: primero las LF3 ya consumidas (que van completas por definición) y el resto sobre las LF2,
  // proporcional a lo aprobado. Cuadra EXACTO con el uso del cliente menos el de las comodín: la
  // utilización es una medición del mismo cedido-no-pagado, se corte por par o por cliente.
  let objetivoUso = necesario;
  const lf2 = lineas.filter((l) => l.tipo === "LF2");
  const capLF2 = lf2.reduce((s, l) => s + l.aprobado, 0);
  for (const l of lineas) {
    if (l.tipo !== "LF3" || !l.quemada) continue;
    if (objetivoUso - l.aprobado < 0 || objetivoUso - l.aprobado > capLF2) continue;
    l.vigente = l.aprobado;
    objetivoUso = mmRound(objetivoUso - l.aprobado);
  }
  const apLF2 = capLF2 || 1;
  let usado = 0;
  lf2.forEach((l, i) => {
    const ultimo = i === lf2.length - 1;
    let v = ultimo ? mmRound(objetivoUso - usado) : mmRound(Math.min(l.aprobado, objetivoUso * (l.aprobado / apLF2)));
    v = Math.max(0, Math.min(l.aprobado, v));
    l.vigente = v;
    usado = mmRound(usado + v);
  });
  let resto = mmRound(objetivoUso - usado);
  for (const l of lf2) {
    if (resto <= 0) break;
    const t = Math.min(mmRound(l.aprobado - l.vigente), resto);
    l.vigente = mmRound(l.vigente + t);
    resto = mmRound(resto - t);
  }

  const todas = lineas.concat(comodines);

  // NADA DE LO APROBADO SE PIERDE POR EL CAMINO. `repartirConPiso` devuelve 0 en las partes que no
  // alcanzan el mínimo, y esas sobras ya vuelven al comodín; pero si el comodín TAMPOCO alcanza el
  // piso, su reparto sale en ceros y ese tramo se evaporaba. Con el nivel 1 como consolidado eso
  // dejaría de cuadrar, así que el residuo se le entrega a la línea MAYOR, que siempre puede
  // recibirlo sin cruzar ningún piso — mismo criterio que el prorrateo por factura.
  const colocado = todas.reduce((s, l) => s + l.aprobado, 0);
  const residuo = objetivoTotal - colocado;
  if (residuo > 0 && todas.length) {
    let may = todas[0];
    for (const l of todas) if (l.aprobado > may.aprobado) may = l;
    may.aprobado = mmRound(may.aprobado + residuo);
  }

  return {
    estado: "B",
    // La cabecera es la SUMA, no `fila.aprobada`: si un cliente quedara sin ninguna línea colocable,
    // su nivel 1 es 0 y no el cupo de su ficha — decir lo contrario sería prometer capacidad que
    // ninguna línea puede ejercer, que es exactamente el defecto que esto corrige.
    asignadaCliente: todas.reduce((s, l) => s + l.aprobado, 0),
    usoCliente: fila.uso,
    lineas: todas,
    cola: deudores.slice(nPar),
  };
}

// Calcula el estado de TODOS los clientes del universo. Se hace una sola vez y los dos bloques salen de
// acá, porque el nivel 3 se construye sobre el nivel 2.
function estadoDeTodos({ DTESYNC, LINEA_DISPONIBLE }) {
  const pares = paresPorEmisor(DTESYNC);

  // La cabecera por cliente que trae A7/A8: cupo asignado (las suspendidas no aportan) y utilizado (lo
  // cedido sigue vigente). Se conserva el ORDEN de la entrega, que es el que ve el nivel 3.
  const porRut = new Map();
  for (const l of LINEA_DISPONIBLE) {
    if (!l || !l.RUTCliente) continue;
    const g = porRut.get(l.RUTCliente) || { aprobada: 0, uso: 0, razon: l.RazonSocialCliente || "" };
    if (l.Estado !== "Suspendida") g.aprobada += +l.MontoAprobado || 0;
    g.uso += +l.MontoUtilizado || 0;
    porRut.set(l.RUTCliente, g);
  }
  // Sólo es línea vigente la que tiene cupo. El cliente que suma 0 aprobado NO desaparece: sigue en el
  // maestro, y esa diferencia es justo la que separa el estado S del estado A.
  const fila = new Map();
  for (const [rut, g] of porRut) {
    const aprobada = Math.round(g.aprobada);
    if (!(aprobada > 0)) continue;
    fila.set(rut, { aprobada, uso: Math.round(Math.min(g.uso, aprobada)), razon: g.razon });
  }

  // LF4 POR CATEGORÍA DE DEUDOR. Del A7/A8 se conservan las dos cosas que aporta y no se pueden
  // derivar: el corte por categoría (la misma llave que usa `tipoLineaDeDeudor`) y el estado
  // «Suspendida». El MONTO no sale de ahí: se dimensiona con la regla del spec (% sobre los cupos de
  // par), porque el activo traía 15–40MM por fila y dejaba a veinte deudores de la cola compitiendo.
  const metaIdx = new Map();
  for (const r of LINEA_DISPONIBLE) {
    let g = metaIdx.get(r.RUTCliente);
    if (!g) {
      g = [];
      metaIdx.set(r.RUTCliente, g);
    }
    g.push({ categoria: r.TipoLinea, peso: r.MontoAprobado || 0, suspendida: r.Estado === "Suspendida", uso: +r.MontoUtilizado || 0 });
  }
  const META_DEFECTO = [
    { categoria: "Lista Blanca", peso: 1, suspendida: false },
    { categoria: "Deudores Autorizados", peso: 1, suspendida: false },
  ];

  // EL UNIVERSO son los emisores del A1 (todo el que factura es cliente potencial) más los clientes que
  // el maestro de líneas declara. En el orden del A1 primero, que es el de `PC_CLIENTES`.
  const universo = [];
  const vistos = new Set();
  const razon = new Map();
  for (const r of DTESYNC) {
    if (!r || !r.RUTEmisor || vistos.has(r.RUTEmisor)) continue;
    vistos.add(r.RUTEmisor);
    universo.push(r.RUTEmisor);
    razon.set(r.RUTEmisor, r.RznSoc || "");
  }
  for (const r of LINEA_DISPONIBLE) {
    if (!r || !r.RUTCliente || vistos.has(r.RUTCliente)) continue;
    vistos.add(r.RUTCliente);
    universo.push(r.RUTCliente);
    razon.set(r.RUTCliente, r.RazonSocialCliente || "");
  }

  const out = new Map();
  for (const rut of universo) {
    out.set(
      rut,
      estadoDeCliente(rut, {
        fila: fila.get(rut) || null,
        enMaestro: metaIdx.has(rut),
        meta: metaIdx.get(rut) || META_DEFECTO,
        deudores: pares.get(rut) || [],
      }),
    );
  }
  return { estados: out, razon, ordenMaestro: [...fila.keys()] };
}

// ── NIVEL 3 · LA LÍNEA DEL DEUDOR ─────────────────────────────────────────────────────────────────
// Su utilización es la suma de lo que TODOS los clientes le tienen cedido y no pagado: es lo que la
// convierte en un control de concentración y lo que hace verdadera la columna «a quién afecta» del
// modal de confirmación de curse.
function nivelDeudor({ estados, ordenMaestro, pares, tipoDeudor }) {
  const uso = new Map(),
    clientes = new Map(),
    nombres = new Map();
  const anotar = (rut, nombre, monto, rutCli) => {
    if (!rut) return;
    uso.set(rut, mmRound((uso.get(rut) || 0) + monto));
    if (!clientes.has(rut)) clientes.set(rut, new Set());
    if (monto > 0 && rutCli) clientes.get(rut).add(rutCli);
    if (nombre && !nombres.has(rut)) nombres.set(rut, nombre);
  };
  for (const rutCli of ordenMaestro) {
    const st = estados.get(rutCli);
    if (!st) continue;
    for (const ln of st.lineas) if (ln.rutDeudor) anotar(ln.rutDeudor, ln.nombreDeudor, ln.vigente, rutCli);
    // Lo usado en la comodín se atribuye a la COLA de deudores del cliente —los que no tienen línea
    // propia—, proporcional a su volumen. Sin esta atribución ese uso no se descontaría de ninguna
    // línea de deudor y el nivel 3 quedaría subestimado justo en la cola.
    const usComodin = st.lineas.filter((x) => x.granularidad === "comodin").reduce((s, x) => s + x.vigente, 0);
    const cola = st.cola || [];
    const volCola = cola.reduce((s, d) => s + d.vol, 0);
    if (usComodin > 0 && volCola > 0) cola.forEach((d) => anotar(d.rut, d.nombre, mmRound(usComodin * (d.vol / volCola)), rutCli));
    else cola.forEach((d) => anotar(d.rut, d.nombre, 0, rutCli));
  }
  // El universo son TODOS los deudores de las facturas, no sólo los que hoy tienen saldo: la línea del
  // deudor existe aunque nadie le haya cedido todavía, porque es un tope de concentración.
  for (const [, lista] of pares) for (const d of lista) anotar(d.rut, d.nombre, 0, null);

  const out = [];
  for (const [rut, u] of uso) {
    const rnd = pcRng(hashStr("ldeu" + rut));
    const t = tipoDeudor(rut, nombres.get(rut) || "");
    // Un 8% de los deudores están CONCENTRADOS: su línea propia queda apenas por sobre lo ya colocado,
    // así que es ella —y no la del par— la que frena la operación. Sin este tramo el nivel 3 casi nunca
    // mordía y el caso «hay que ampliar la exposición del deudor», que es el único que afecta a carteras
    // de otros ejecutivos, prácticamente no aparecía. Los prime toleran más concentración; en los «Otro»
    // es donde el control muerde.
    const concentrado = hashStr("conc" + rut) % 100 < 8;
    const holgura = concentrado
      ? 1.03 + rnd() * 0.09
      : t === "Lista Blanca"
        ? 1.25 + rnd() * 0.55
        : t === "Deudor Autorizado"
          ? 1.12 + rnd() * 0.38
          : 1.02 + rnd() * 0.2;
    // EN PESOS y tallada en tramos de $5.000.000 como las demás. `ceil` y no `round`: al redondear, la
    // línea podía nacer BAJO su propio uso. El respaldo del deudor SIN uso se expresa en pesos desde el
    // 14-09-2026 — cuando quedó en millones, 24 de 741 deudores tenían una línea de «80» pesos y el
    // nivel 3 los bloqueaba enteros.
    const base = u > 0 ? u * holgura : (40 + Math.floor(rnd() * 24) * 5) * 1e6;
    // El PISO de política también aplica acá: la del deudor es una línea aprobada como cualquier otra y
    // una bajo el mínimo no deja pasar ninguna factura.
    const tallado = Math.max(LINEA_MINIMA, Math.ceil(base / TRAMO_LINEA) * TRAMO_LINEA, Math.ceil(u / TRAMO_LINEA) * TRAMO_LINEA);
    out.push({
      RUTDeudor: rut,
      RazonSocialDeudor: nombres.get(rut) || "",
      TipoDeudor: t,
      MontoAprobado: tallado,
      MontoUtilizado: u,
      MontoDisponible: mmRound(tallado - u),
      ClientesConCesion: clientes.get(rut) ? clientes.get(rut).size : 0,
    });
  }
  return out;
}

// Tipo de deudor según las listas (por RUT del receptor; fallback por nombre), igual que en el fuente.
function hacerTipoDeudor({ LISTA_BLANCA, DEUDORES_AUTORIZADOS }) {
  const lbRut = new Set(LISTA_BLANCA.map((x) => x.RUT));
  const daRut = new Set(DEUDORES_AUTORIZADOS.map((x) => x.RUT));
  const lbNom = new Set(LISTA_BLANCA.map((x) => (x.RazonSocial || "").toLowerCase()));
  const daNom = new Set(DEUDORES_AUTORIZADOS.map((x) => (x.RazonSocial || "").toLowerCase()));
  return (rut, nombre) => {
    if (rut && lbRut.has(rut)) return "Lista Blanca";
    if (rut && daRut.has(rut)) return "Deudor Autorizado";
    const n = (nombre || "").toLowerCase();
    if (lbNom.has(n)) return "Lista Blanca";
    if (daNom.has(n)) return "Deudor Autorizado";
    return "Otro";
  };
}

const FECHA_SNAPSHOT = "2026-06-23"; // la misma foto que A7/A8
// ORIGEN de una línea. El activo trae sólo las del maestro; `ORIGEN_COMITE` lo escribe el pipeline
// sobre las que constituye una solicitud aprobada, y se declara acá para que el nombre viva en un
// solo lugar y el gate pueda exigir que el activo no traiga ninguna del comité.
const ORIGEN_MAESTRO = "MAESTRO";
const ORIGEN_COMITE = "COMITE";

// ── LOS DOS BLOQUES ───────────────────────────────────────────────────────────────────────────────
function generarCupo(datos) {
  const { estados, razon } = estadoDeTodos(datos);
  const out = [];
  for (const [rutCli, st] of estados) {
    // La fila CLIENTE es el NIVEL 1: el cupo que el comité le asignó y lo que lleva utilizado. Existe
    // siempre, incluso para el cliente en estado S que no tiene ninguna línea: sin ella, ese cliente
    // sería indistinguible de uno que nunca pasó por comité, que es justo lo que le daría una LF1 nueva.
    out.push({
      ClaveJoin: rutCli + "|CLIENTE",
      IdLinea: "CLI-" + rutCli,
      RUTCliente: rutCli,
      RazonSocialCliente: razon.get(rutCli) || "",
      Nivel: 1,
      TipoLinea: "CLIENTE",
      EstadoCliente: st.estado,
      RUTDeudor: "",
      RazonSocialDeudor: "",
      Categoria: "",
      MontoAprobado: st.asignadaCliente,
      MontoUtilizado: st.usoCliente,
      Estado: "Vigente",
      UnSoloUso: 0,
      SoloPrime: 0,
      Consumida: 0,
      Origen: ORIGEN_MAESTRO,
      IdProceso: "",
      FechaSnapshot: FECHA_SNAPSHOT,
    });
    for (const l of st.lineas)
      out.push({
        ClaveJoin: rutCli + "|" + l.tipo + "|" + (l.rutDeudor || l.categoria || ""),
        IdLinea: l.id,
        RUTCliente: rutCli,
        RazonSocialCliente: razon.get(rutCli) || "",
        Nivel: l.granularidad === "par" ? 2 : 1,
        TipoLinea: l.tipo,
        EstadoCliente: st.estado,
        RUTDeudor: l.rutDeudor || "",
        RazonSocialDeudor: l.nombreDeudor || "",
        Categoria: l.categoria || "",
        MontoAprobado: l.aprobado,
        MontoUtilizado: l.vigente,
        Estado: l.suspendida ? "Suspendida" : "Vigente",
        UnSoloUso: l.unSoloUso ? 1 : 0,
        SoloPrime: l.soloPrime ? 1 : 0,
        Consumida: l.quemada ? 1 : 0,
        // De dónde viene la línea. El maestro es la entrega del sistema de gestión de líneas; las que
        // el COMITÉ otorga entran marcadas y con su `idProceso`, para que se puedan distinguir de las
        // que ya estaban — es lo que permite auditar qué cupo nació de una solicitud y cuál no.
        Origen: ORIGEN_MAESTRO,
        IdProceso: "",
        FechaSnapshot: FECHA_SNAPSHOT,
      });
  }
  return out;
}

function generarDeudor(datos) {
  const { estados, ordenMaestro } = estadoDeTodos(datos);
  return nivelDeudor({
    estados,
    ordenMaestro,
    pares: paresPorEmisor(datos.DTESYNC),
    tipoDeudor: hacerTipoDeudor(datos),
  });
}

module.exports = {
  cupo: { generar: generarCupo },
  deudor: { generar: generarDeudor },
  // expuestos para el gate de contrato, que los prueba sobre un caso plantado
  repartirConPiso,
  estadoDeTodos,
  paresPorEmisor,
  hacerTipoDeudor,
  LINEA_MINIMA,
  OTROS_DEUDORES_PCT,
  ORIGEN_MAESTRO,
  ORIGEN_COMITE,
  TRAMO_LINEA,
  LF1_PESOS,
};
