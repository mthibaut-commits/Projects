/* REGLA 81 · LAS FILAS «SIN CLASIFICAR» DEL TUBO SE JUNTAN POR RUT Y LLEVAN SU CÓDIGO DE OPORTUNIDAD.
 *
 * Reportado por el usuario el 24-09-2026 mirando el tubo: filas «Sin clasificar» con «4 deudores» y el
 * desglose «0 Prime con línea · 0 Otros con línea · 0 deudores sin línea», todas «Sin línea», y en el
 * subtítulo `OF-CONSTRUCTORA Y SERVICIOS NU?EZ SPA` donde en la fila sana va `OP-D95265-R2`. «Ahí debiera
 * ir el código de la oportunidad.» Causa única: `agruparInboundPorCliente` agrupaba por NOMBRE y tiraba
 * el RUT que el evento del inbound SÍ trae, así que su id era `"OF-" + nombre`, `capacidadDeudores`
 * salía por su guarda sin RUT (0/0/0) y `lineaDeCliente` no encontraba línea. Es uno de los 8 sitios
 * del T1 «join de empresas SIEMPRE por RUT» y el corolario de la regla 46 para el cedente.
 *
 * Y quién las ve: sólo el ejecutivo GESTOR del pipeline (rol `inbound`), no la ejecutiva comercial.
 *
 * Los patrones se aplican sobre `canonico(src)` (ADR-0006) y las sondas se plantan sobre el fuente crudo:
 * el auditor quita comentarios y canoniza por su cuenta.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const SRC = leer("pipeline_comercial.jsx");

export const sinComentarios = (texto) =>
  String(texto)
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");

/* Cuerpo desde el ancla hasta la llave que lo cierra: la del cuerpo es la primera a profundidad de
   paréntesis 0 (así la firma con paréntesis no la confunde). "" si el ancla no está. */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return "";
  let par = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "(") par++;
    else if (c === ")") par--;
    else if (c === "{" && par === 0) {
      let d = 0;
      for (let k = j; k < src.length; k++) {
        if (src[k] === "{") d++;
        else if (src[k] === "}" && --d === 0) return src.slice(j, k + 1);
      }
      return "";
    }
  }
  return "";
}

export function auditarRegla81(fuente) {
  const src = canonico(sinComentarios(fuente));
  const f = [];

  // 1 · La agrupación se hace por RUT del cedente, con el nombre sólo como respaldo cuando no hay RUT.
  const agr = cuerpoDe(src, "function agruparInboundPorCliente(");
  if (!agr) f.push("no existe `agruparInboundPorCliente`");
  else {
    if (!/const k = ev\.rutEmisor \|\| ev\.cedente \|\| "—";/.test(agr))
      f.push("`agruparInboundPorCliente` no agrupa por `rutEmisor` (con el nombre sólo de respaldo): dos cedentes con el mismo nombre serían uno, y uno escrito de dos formas serían dos");
    if (!/rutEmisor: /.test(agr)) f.push("la fila agrupada no lleva `rutEmisor`: sin él `capacidadDeudores` y `lineaDeCliente` no pueden preguntar por la línea");
    if (!/id: g\.opId \|\|/.test(agr)) f.push("el id de la fila no es el `opId` del evento: vuelve el `\"OF-\" + nombre` en el subtítulo");
    if (/id: "OF-" \+/.test(agr)) f.push("vuelve el id armado con el nombre (`\"OF-\" + …`)");
    if (!/const dk = ev\.rutRecep \|\| ev\.pagador \|\| "—";/.test(agr))
      f.push("los deudores de la fila se juntan por nombre y no por `rutRecep`");
    if (!/rut: ev\.rutRecep \|\| ""/.test(agr)) f.push("cada deudor de la fila no lleva su `rut`: el desglose por línea no lo puede reconocer");
  }

  // 2 · El evento del inbound trae el RUT del deudor, no sólo el del emisor.
  // La ventana mira hacia atrás desde el `opId` del constructor del stream: `rutRecep` va junto a `rutEmisor`,
  // a ~1.100 caracteres canónicos del `opId` (medido el 24-09-2026), y 1.600 deja margen para campos nuevos.
  const iOp = src.indexOf("opId: `OP-D${hashStr(r.RUTEmisor) % 100000}`");
  const bloque = iOp < 0 ? "" : src.slice(Math.max(0, iOp - 1600), iOp + 60);
  if (iOp < 0) f.push("no se encuentra el constructor del evento del inbound (el del `opId`)");
  else if (!/rutRecep: r\.RUTRecep,/.test(bloque)) f.push("el evento del inbound no lleva `rutRecep: r.RUTRecep`: el RUT del deudor viene en la fila del A1 y se descarta");

  // 3 · Sólo el gestor del pipeline ve lo sin clasificar.
  const vis = src.match(/const ofOtrasVisible = \(ev\) => [^;]+;/);
  if (!vis) f.push("no se encuentra `ofOtrasVisible`");
  else if (!/esGestorPipeline\(usuario\)/.test(vis[0])) f.push("`ofOtrasVisible` no gatea por `esGestorPipeline(usuario)`: la ejecutiva comercial sigue viendo lo sin clasificar");
  if (!/const esGestorPipeline = \(code\) => esRolAdmin\(code\) \|\| ROL_USUARIO\[code\] === "inbound";/.test(src))
    f.push("no existe `esGestorPipeline(code)` como rol —`inbound` o admin—: la visibilidad tiene que seguir al ROL, no a un código de usuario");

  // 4 · El desglose cuadra con el encabezado: sin RUT del cliente o sin su estado de líneas, los N deudores van a
  // «sin línea», no al vacío («eso siempre debiera de cuadrar»). El vacío queda sólo para cero deudores.
  const cap = cuerpoDe(src, "function capacidadDeudores(");
  if (!cap) f.push("no existe `capacidadDeudores`");
  else {
    if (/!rutCliente\)\s*return vacio/.test(cap) || /if \(!est\)\s*return vacio/.test(cap))
      f.push("`capacidadDeudores` vuelve a devolver el vacío sin RUT del cliente o sin estado de líneas: la fila cuenta N deudores y el desglose suma 0");
    if (!/sinLinea:\s*\{\s*n:\s*deudores\.length/.test(cap))
      f.push("`capacidadDeudores` no manda los N deudores a «sin línea» cuando nadie puede tener línea: el desglose no cuadra con el encabezado");
  }

  return f;
}

test("regla 81 · el fuente cumple", () => {
  const fallas = auditarRegla81(SRC);
  assert.deepEqual(fallas, [], "FALLA:\n  - " + fallas.join("\n  - "));
});

test("sonda negativa: volver a agrupar por nombre se caza", () => {
  const plantado = SRC.replace('const k = ev.rutEmisor || ev.cedente || "—";', 'const k = ev.cedente || "—";');
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla81(plantado).some((x) => /no agrupa por `rutEmisor`/.test(x)));
});

test("sonda negativa: el id armado con el nombre se caza", () => {
  const plantado = SRC.replace("id: g.opId ||", 'id: "OF-" + g.cliente ||');
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  const fallas = auditarRegla81(plantado);
  assert.ok(fallas.some((x) => /no es el `opId`/.test(x)) && fallas.some((x) => /vuelve el id armado/.test(x)));
});

test("sonda negativa: el evento sin `rutRecep` se caza", () => {
  // Se quita la ocurrencia más cercana ANTES del `opId`: hay otra en `facturaDeDTE` (:4100) y ésa no es la de este constructor.
  const iOp = SRC.indexOf("opId: `OP-D${hashStr(r.RUTEmisor) % 100000}`");
  const iRr = SRC.lastIndexOf("rutRecep: r.RUTRecep,", iOp);
  assert.ok(iOp > 0 && iRr > 0 && iOp - iRr < 3000, "no encuentro `rutRecep` en el constructor del stream");
  const plantado = SRC.slice(0, iRr) + SRC.slice(iRr + "rutRecep: r.RUTRecep,".length);
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla81(plantado).some((x) => /no lleva `rutRecep: r\.RUTRecep`/.test(x)));
});

test("sonda negativa: los deudores juntados por nombre se cazan", () => {
  const plantado = SRC.replace('const dk = ev.rutRecep || ev.pagador || "—";', 'const dk = ev.pagador || "—";');
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla81(plantado).some((x) => /se juntan por nombre/.test(x)));
});

test("sonda negativa: la ejecutiva comercial volviendo a ver lo sin clasificar se caza", () => {
  const plantado = SRC.replace("esGestorPipeline(usuario)", "esEjecutivoSesion");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla81(plantado).some((x) => /no gatea por `esGestorPipeline/.test(x)));
});

test("sonda negativa: el rol del gestor resuelto por código de usuario se caza", () => {
  const plantado = SRC.replace('const esGestorPipeline = (code) => esRolAdmin(code) || ROL_USUARIO[code] === "inbound";', 'const esGestorPipeline = (code) => code === "IB";');
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(auditarRegla81(plantado).some((x) => /no existe `esGestorPipeline\(code\)` como rol/.test(x)));
});

test("sonda negativa: el desglose que vuelve a salir vacío sin RUT del cliente se caza", () => {
  const i = SRC.indexOf("function capacidadDeudores(");
  const j = SRC.indexOf("if (!est) return {", i);
  const k = SRC.indexOf("\n", j);
  assert.ok(i > 0 && j > i && k > j, "no encuentro la guarda de `capacidadDeudores`");
  const plantado = SRC.slice(0, j) + "if (!est) return vacio;" + SRC.slice(k);
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  const fallas = auditarRegla81(plantado);
  assert.ok(fallas.some((x) => /vuelve a devolver el vacío/.test(x)) && fallas.some((x) => /no cuadra con el encabezado/.test(x)));
});

test("`cuerpoDe` corta en la llave que cierra", () => {
  const txt = "function f({ a, b }) { if (x) { g(); } return 1; } function otra() { h(); }";
  assert.equal(cuerpoDe(txt, "function f("), "{ if (x) { g(); } return 1; }");
  assert.equal(cuerpoDe(txt, "function noExiste("), "");
});
