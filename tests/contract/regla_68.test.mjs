/* Gate de contrato de la regla 68 (el corte y el reinicio del día son por RELOJ del tenant; al corte la oportunidad sin
   oferta se elimina y al reinicio vuelve como oportunidad nueva con id propio y referencia), sobre el TEXTO del fuente.
   Lo puro lo prueban los casos 163 y 164 (`jobDelReloj`, `relojSimulado`, `intervaloJobMs`, `corteDelDia`,
   `eventoDeReoriginacion`, la migración v3); lo que la suite no puede ver es que el CRON los use —que el efecto corte por
   `r.corte` y no «cada N corridas», que la corrida no abra fuera de la ventana, que el corte ELIMINE en vez de reabrir y
   que la oportunidad que nace del reinicio lleve `referencia`—, y que la configuración del tenant ya no ofrezca la etapa
   «no gestionada» ni diga que la frecuencia es declarativa. Eso se vigila acá.

   Con sonda negativa por pieza: un gate verde que no se comprueba en rojo no vigila nada. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El literal `CFG_OPER_BASE`, como texto, sin sus comentarios. */
function baseDe(src) {
  const i = src.indexOf("const CFG_OPER_BASE = {");
  const j = i < 0 ? -1 : src.indexOf("const CFG_OPER_DEFAULT", i);
  return i < 0 || j < 0 ? "" : src.slice(i, j).replace(/\/\/[^\n]*/g, "");
}

export function auditarRegla68(src) {
  const fallos = [];
  const can = canonico(src);
  // 1 · La configuración: las horas del modelo, el corte diario, y NADA de etapa configurable ni jornada en horas.
  const base = baseDe(src);
  if (!base) fallos.push("no encuentro `CFG_OPER_BASE`");
  else {
    if (!/horaInicio:\s*"06:00"/.test(base)) fallos.push("`horaInicio` no es 06:00: el reinicio del día es el del modelo del negocio");
    if (!/horaFin:\s*"23:00"/.test(base)) fallos.push("`horaFin` no es 23:00: el corte del día es el del modelo del negocio");
    if (!/corteDiario:\s*true/.test(base)) fallos.push("`corteDiario` no existe o no viene activado");
    if (/etapaNoGestionada/.test(base)) fallos.push("vuelve `etapaNoGestionada`: el criterio del corte es «tiene oferta», no una etapa configurable (ADR-0019)");
    if (/\bhorasDia\b/.test(base)) fallos.push("vuelve `horasDia`: el día va del reinicio al corte, no es una jornada en horas");
    if (/reaperturaDiaria/.test(base)) fallos.push("vuelve `reaperturaDiaria`: el corte ELIMINA, no reabre");
  }
  const esq = src.match(/^\s*cfgOper:\s*(\d+),/m);
  if (!esq || +esq[1] < 3) fallos.push("`SCHEMA_VERSION.cfgOper` no llegó a 3: retirar y renombrar claves sube el esquema (regla 39)");
  // 2 · El reloj decide: el efecto corta por `r.corte` y reinicia por `r.reinicio`; nunca «cada N corridas».
  if (!can.includes("if (corridas > 0 && r.corte) cerrarDiaRef.current(r.dia);")) fallos.push("el cierre del día no lo dispara la hora de corte del tenant");
  if (!can.includes("if (corridas > 0 && r.reinicio) reinicioDiaRef.current(r.dia);")) fallos.push("el reinicio del día no lo dispara la hora de reinicio del tenant");
  if (/corridas % HORAS_DIA/.test(can) || /\bHORAS_DIA\b/.test(can)) fallos.push("vuelve el corte por conteo de corridas (`HORAS_DIA`): en producción el inbound es continuo");
  // 3 · La corrida sólo abre dentro de la ventana.
  if (!can.includes("if (r.enVentana) correrProceso();")) fallos.push("la corrida abre oportunidades fuera de la ventana del tenant");
  // 4 · El corte ELIMINA y deja rastro; lo eliminado vuelve al inbound al reinicio.
  const iC = can.indexOf("const corteDia = (nDia) => {");
  const corte = iC < 0 ? "" : can.slice(iC, iC + 2500);
  if (!corte) fallos.push("no existe `corteDia`: ¿volvió `rolloverDia`?");
  else {
    if (!corte.includes("const r = corteDelDia(dealsRef.current || []);")) fallos.push("`corteDia` no decide con `corteDelDia`: la política del corte tiene que ser pura");
    if (!corte.includes("setDeals((prev) => prev.filter((d) => !idsElim.has(d.id)));")) fallos.push("el corte no ELIMINA: la sin oferta seguiría en el tubo");
    if (!corte.includes("eventoDeReoriginacion(d, nDia)")) fallos.push("lo eliminado no queda pendiente de reinicio: al día siguiente no se re-originaría");
    if (!/logSys\("info", "cierre-dia", `Corte del día \$\{nDia\}/.test(corte)) fallos.push("el corte no deja su cierre en la bitácora del sistema");
  }
  if (/const rolloverDia = /.test(can)) fallos.push("vuelve `rolloverDia`: reabrir con el mismo id es lo que ADR-0019 descartó");
  if (!can.includes("if (evs.length) setAcumulado((prev) => [...prev, ...evs]);")) fallos.push("el reinicio no devuelve al inbound lo que el corte eliminó");
  // 5 · La que nace del reinicio lleva la referencia.
  if (!can.includes("referencia: ev.referencia || undefined,")) fallos.push("la oportunidad que nace del reinicio no lleva `referencia`: nada la uniría con la eliminada");
  // 6 · La pantalla: sin etapa configurable, y la frecuencia ya no es declarativa.
  if (/l="Etapa «no gestionada»"/.test(src)) fallos.push("Configuración › Operación vuelve a ofrecer la etapa «no gestionada»");
  const iF = src.indexOf('l="Frecuencia de actualización"');
  const campo = iF < 0 ? "" : src.slice(iF, iF + 600);
  if (!campo) fallos.push("no encuentro el campo «Frecuencia de actualización»");
  else if (/declarativ/i.test(campo)) fallos.push("el campo «Frecuencia de actualización» sigue diciendo que es declarativo: `intervaloJobMs` lo consume");
  if (!/const intervaloJobMs = \(cfg\) => /.test(src)) fallos.push("no existe `intervaloJobMs`: `frecuenciaMin` vuelve a ser decorativa");
  return fallos;
}

test("regla 68: el corte y el reinicio son por reloj del tenant, el corte elimina la sin oferta y el reinicio la re-origina con referencia", () => {
  assert.deepEqual(auditarRegla68(jsx), []);
});

/* Cada mutante planta UNA violación (sobre el fuente crudo o su forma canónica, según lo que mide cada pieza) y el gate
   tiene que cazarla. */
const MUTANTES = [
  ["vuelve la etapa configurable", (s) => s.replace('  corteDiario: true,\n', '  corteDiario: true,\n  etapaNoGestionada: "prospeccion",\n')],
  ["el esquema no sube", (s) => s.replace(/^(\s*cfgOper:\s*)3,/m, "$12,")],
  ["el cierre vuelve a ser por conteo", (s) => s.replace("if (corridas > 0 && r.corte) cerrarDiaRef.current(r.dia);", "if (corridas > 0 && corridas % 8 === 0) cerrarDiaRef.current(r.dia);")],
  ["la corrida abre fuera de la ventana", (s) => s.replace("if (r.enVentana) correrProceso();", "correrProceso();")],
  ["el corte deja de eliminar", (s) => s.replace("setDeals((prev) => prev.filter((d) => !idsElim.has(d.id)));", "setDeals((prev) => prev);")],
  ["la que nace del reinicio pierde la referencia", (s) => s.replace("referencia: ev.referencia || undefined,", "")],
  ["la frecuencia vuelve a ser declarativa", (s) => s.replace('l="Frecuencia de actualización"', 'l="Frecuencia de actualización" hint="DECLARATIVA"')],
];
for (const [nombre, mutar] of MUTANTES)
  test(`sonda negativa: ${nombre}`, () => {
    const mut = mutar(jsx);
    assert.notEqual(mut, jsx, "la sonda no plantó nada: el texto quedó igual");
    assert.ok(auditarRegla68(mut).length > 0, "el gate no cazó la violación plantada");
  });
