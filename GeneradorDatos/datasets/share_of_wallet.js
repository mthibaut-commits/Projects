// SHARE_OF_WALLET — activo A5. Cuánto de lo que el cliente cede se lo lleva Security.
//
// **SE DERIVA DE A2, NO SE GENERA** (15-09-2026, decisión del usuario: «tienes que hacer que A5 y A2
// sean iguales; primero genera A2 y luego genera A5 con los resultados de A2»). Antes los dos activos
// respondían la MISMA pregunta por caminos independientes y discrepaban **13,8 pto en la mediana y
// 61,8 en el p90** —A5 decía 97,7% donde A2 medía 5,1%—, sobre una cifra que decide el descuento por
// SOW del pricing, el segmento de churn y los KPI del dashboard. Ahora la serie se MIDE sobre las
// cesiones de AECSync, así que las dos entregas no pueden contradecirse: es el mismo número contado
// una sola vez. El criterio es el del Levantamiento §5 —el maestro es el activo cuyo SUJETO es el
// del campo—: el sujeto de «cuánto de lo cedido se llevó cada quién» es la CESIÓN, y A2 es su
// registro. Lo de A5 es el ANÁLISIS sobre esos hechos.
//
// ── Qué se MIDE y qué sigue siendo de A5 ──────────────────────────────────────────────────────────
// MEDIDO sobre las cesiones: la serie semanal entera (`MontoBICE`, `MontoTotal`, `NumCesiones`,
// `SOWPct`), la participación actual y la de la primera mitad, la pendiente, la tendencia, el gap, el
// estado y el diagnóstico. Todo eso es aritmética sobre el registro.
//
// PROPIO de A5, porque no es medible sobre cesiones: **`SOWTargetPct`** —es una META COMERCIAL, no una
// medición—, el segmento, el horizonte y la frecuencia de actualización. Se conservan de la entrega.
//
// ── Dos límites del registro, dichos en vez de disimulados ────────────────────────────────────────
// 1. **La serie llega hasta donde llegan los documentos.** El A1 trae emisiones desde el 2026-05-06 y
//    no se puede ceder una factura que no se emitió, así que la serie cubre ~7 semanas y no 10. Los
//    consumidores toman `slice(-8)` y derivan las semanas del propio dato, de modo que se adaptan.
// 2. **`HistoricoMensual` NO es medible**: son 13 meses y el registro cubre 2. Se conserva la
//    trayectoria de la entrega anterior pero **anclada** al SOW medido —el último mes ES la cifra
//    medida y los anteriores se desplazan con ella—, para que el gráfico no contradiga al registro.
//    Es reconstrucción declarada, no medición, y por eso queda dicho acá.
const BICE_RUT = "97.080.000-0";
const DIA = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (s) => Date.parse(String(s).slice(0, 10) + "T00:00:00");
const lunesDe = (f) => { const d = new Date(ms(f)); const dow = (d.getUTCDay() + 6) % 7; return iso(d.getTime() - dow * DIA); };
const r1 = (x) => Math.round(x * 10) / 10;

// Pendiente de una recta por mínimos cuadrados sobre (semana, SOWPct). Es lo que convierte una serie
// en una tendencia: sin ella «creciendo» sería comparar dos puntos y una sola semana mala daría vuelta
// el diagnóstico de una relación de meses.
function pendiente(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (ys[i] - my); den += (i - mx) * (i - mx); }
  return den ? num / den : 0;
}

function generar({ AECSYNC, SHARE_OF_WALLET }) {
  const base = SHARE_OF_WALLET || [];
  const ces = AECSYNC || [];
  if (!ces.length) return base;

  // ── Medido: la serie semanal de cada cedente, sobre las cesiones ────────────────────────────────
  const porCli = new Map();
  for (const c of ces) {
    const rut = c && c.RUTEmisor; if (!rut) continue;
    const sem = lunesDe(c.FechaCesion);
    let g = porCli.get(rut); if (!g) { g = new Map(); porCli.set(rut, g); }
    let w = g.get(sem); if (!w) { w = { Semana: sem, NumCesiones: 0, MontoBICE: 0, MontoTotal: 0 }; g.set(sem, w); }
    const m = Math.round(+c.MontoCesion || 0);
    w.NumCesiones++; w.MontoTotal += m;
    if (c.RUTFactoring === BICE_RUT) w.MontoBICE += m;
  }
  // El eje de semanas es COMÚN a todos los clientes: una semana sin cesiones de este cliente igual
  // existe y vale 0, porque «no cedió nada» es un dato y no un hueco. Sin el eje común, dos clientes
  // tendrían series de distinto largo y compararlos en el mismo gráfico mentiría.
  const ejeSemanas = [...new Set(ces.map((c) => lunesDe(c.FechaCesion)))].sort();

  const out = [];
  for (const s of base) {
    const g = porCli.get(s.RUTCliente);
    // Un cliente sin cesiones en el registro no tiene SOW medible. Se conserva su ficha con la serie
    // vacía en vez de arrastrar cifras de la entrega anterior: inventar acá es exactamente lo que
    // esta derivación viene a eliminar.
    const semanas = ejeSemanas.map((k) => {
      const w = (g && g.get(k)) || { Semana: k, NumCesiones: 0, MontoBICE: 0, MontoTotal: 0 };
      return { Semana: k, SOWPct: w.MontoTotal > 0 ? r1(w.MontoBICE / w.MontoTotal * 100) : 0,
               NumCesiones: w.NumCesiones, MontoBICE: w.MontoBICE, MontoTotal: w.MontoTotal };
    });
    const conDato = semanas.filter((w) => w.MontoTotal > 0);
    const target = +s.SOWTargetPct || 0;

    if (!conDato.length) {
      out.push({ ...s, SOWActualPct: 0, SOWHace10SemPct: 0, GapPct: Math.max(0, r1(target)),
        SOWTendencia: "Sin cesiones", SOWFlecha: "SOW —", PendienteSemanalPts: 0,
        HistoricoSemanal: semanas,
        EstadoSOW: { Nivel: "red", Label: "Sin cesiones en el registro", ActualPct: 0, TargetPct: target, GapPct: r1(target) },
        Analisis: { Pendiente: "Sin cesiones", PendienteSemanalPts: 0, AsintotaEstimadaPct: 0, ConvergeAlTarget: false,
                    SemanasParaTarget: null, RequeridoParaTargetMM: 0,
                    Diagnostico: "El registro de cesiones no trae operaciones de este cliente en la ventana." },
        HistoricoMensual: s.HistoricoMensual || [] });
      continue;
    }

    // PARTICIPACIÓN ACTUAL: sobre el AGREGADO de las semanas con dato, no sobre la última. Con una
    // mediana de 5 a 40 cesiones por cliente hay semanas de una sola operación, y ahí la última
    // semana da 0% o 100% por accidente — el cociente del período es la cifra que significa algo.
    const sum = (arr, k) => arr.reduce((a, w) => a + w[k], 0);
    const actual = r1(sum(conDato, "MontoBICE") / (sum(conDato, "MontoTotal") || 1) * 100);
    // …y la referencia «de antes» es la PRIMERA MITAD de la serie, que es contra lo que el ejecutivo
    // compara para saber si la relación mejora. Con una sola semana no hay «antes»: vale lo actual.
    const mitad = Math.max(1, Math.floor(conDato.length / 2));
    const prim = conDato.slice(0, mitad);
    const antes = conDato.length > 1 ? r1(sum(prim, "MontoBICE") / (sum(prim, "MontoTotal") || 1) * 100) : actual;

    const pts = r1(pendiente(conDato.map((w) => w.SOWPct)));
    const delta = r1(actual - antes);
    const tend = pts >= 0.4 || delta >= 3 ? "Creciendo" : pts <= -0.4 || delta <= -3 ? "Decreciente" : "Manteniendo";
    const flecha = tend === "Creciendo" ? "SOW ↑" : tend === "Decreciente" ? "SOW ↓" : "SOW →";
    const gap = Math.max(0, r1(target - actual));
    const nivel = actual >= target ? "green" : actual >= target * 0.7 ? "yellow" : "red";
    const label = actual >= target ? `En target · ${tend.toLowerCase()}` : `${r1(gap)} pto bajo el target · ${tend.toLowerCase()}`;
    // Cuántas semanas al ritmo actual para llegar al target. Sólo tiene sentido si el ritmo apunta
    // hacia allá: con pendiente cero o negativa no converge, y decir «300 semanas» sería peor que
    // decir que no converge.
    const converge = gap > 0 && pts > 0.05;
    const semParaTarget = gap === 0 ? 0 : converge ? Math.ceil(gap / pts) : null;
    // Cuánto habría que sumar de cesiones NUESTRAS, al volumen del período, para alcanzar el target.
    const totPer = sum(conDato, "MontoTotal");
    const requerido = Math.max(0, Math.round(totPer * (target / 100) - sum(conDato, "MontoBICE")));

    // HistoricoMensual: se conserva la forma y se ANCLA al SOW medido (ver cabecera).
    const mensual = (s.HistoricoMensual || []).slice();
    if (mensual.length) {
      const ult = +mensual[mensual.length - 1].SOWPct || 0;
      const shift = actual - ult;
      for (let i = 0; i < mensual.length; i++) {
        // El desplazamiento entra progresivamente: el último mes queda exacto y los anteriores
        // conservan su trayectoria. Desplazarlos todos por igual movería una historia que nadie midió.
        const t = mensual.length > 1 ? i / (mensual.length - 1) : 1;
        mensual[i] = { ...mensual[i], SOWPct: r1(Math.max(0, Math.min(100, (+mensual[i].SOWPct || 0) + shift * t))), Target: target };
      }
    }

    out.push({
      ...s,
      SOWActualPct: actual,
      SOWHace10SemPct: antes,
      GapPct: gap,
      SOWTendencia: tend,
      SOWFlecha: flecha,
      PendienteSemanalPts: pts,
      HistoricoSemanal: semanas,
      EstadoSOW: { Nivel: nivel, Label: label, ActualPct: actual, TargetPct: target, GapPct: r1(target - actual) },
      Analisis: {
        Pendiente: tend, PendienteSemanalPts: pts,
        AsintotaEstimadaPct: r1(Math.max(0, Math.min(100, actual + pts * 8))),
        ConvergeAlTarget: gap === 0 || converge,
        SemanasParaTarget: semParaTarget,
        RequeridoParaTargetMM: requerido,
        Diagnostico: gap === 0 ? "En target." : converge ? "En trayectoria hacia el target."
          : tend === "Decreciente" ? "SOW a la baja: la competencia gana terreno en este cliente."
          : "Estancado bajo el target: no converge al ritmo actual.",
      },
      HistoricoMensual: mensual,
    });
  }
  return out;
}
module.exports = { generar };
