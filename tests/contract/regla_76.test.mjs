/* REGLA 76 · NADIE ESCRIBE UNA TRANSICIÓN QUE NO LE CORRESPONDE.
 *
 * Tres agujeros de la misma máquina de estados, medidos el 23-09-2026 sobre el proceso de curse
 * (`Regresiones/Gaps_Proceso_Curse_2026-09-22.md`, G-24 · G-25 · G-26) y decididos por el usuario:
 *
 *   G-24 · el avance automático tras el otorgamiento escribía **Girada** directo, saltándose Pendiente
 *          Integración, VER-01 y la aprobación de Operaciones N3. `stage: "giro"` tiene UN escritor y es
 *          `aprobarIntegracion`, que es donde viven los controles (regla 26, regla 41).
 *   G-25 · `moverEtapa` escribía `perdida` sin causa y `cesion` sin `integracion`. La decisión sube a un
 *          catálogo PURO, `transicionManual`, por lo mismo que subió `etapaTrasFirma`: es lo que en
 *          producción resuelve el servidor, y una segunda copia del predicado se desfasa sin que nada
 *          lo diga (el patrón de VER-01).
 *   G-26 · el intent `cursar` de WhatsApp escribía `clienteAcepto: true` con la operación todavía en
 *          `oferta`. WhatsApp MANDA EL ENLACE; la firma es del portal, igual que en la vía email
 *          (definición del usuario, 23-09-2026).
 *
 * Los patrones se aplican sobre `canonico(src)` (ADR-0006) y las sondas se plantan sobre el texto
 * canónico, porque `canonico` es idempotente.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const SRC = leer("pipeline_comercial.jsx");

/* Cuerpo de un bloque, desde su ancla hasta la llave que lo cierra. La llave del CUERPO es la primera
   que aparece a profundidad de paréntesis 0: así un parámetro desestructurado —`function f({ a, b })`—
   y la condición de un `if` quedan adentro de sus paréntesis y no se confunden con el cuerpo. Buscar la
   última llave del ancla no sirve: obliga a que el ancla llegue hasta ella, y un cambio de firma la
   corre. Devuelve "" si el ancla no está. */
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

/* Las líneas que son SÓLO un comentario, fuera. Un gate que prohíbe escribir un campo tiene que mirar el
   CÓDIGO: el comentario que explica por qué ese campo ya no se escribe lo nombra, y nombrarlo no es
   escribirlo — es la trampa del `replace` que pega en un comentario, y acá la cazó su propia sonda.
   Se borran sólo las líneas cuyo primer carácter no blanco es `//`: un `//` a media línea puede ser el de
   `https://fonts.googleapis.com` dentro del `<style>`, que es un template literal y parte del componente.
   Corre ANTES de `canonico`, porque una vez colapsados los saltos de línea un `//` se come el resto. */
export const sinComentarios = (texto) =>
  String(texto)
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");

/* Las cuatro exigencias de la regla, sobre el CÓDIGO del fuente en forma canónica (ADR-0006).
   Devuelve la lista de FALLAS: vacía = cumple. */
export function auditarRegla76(fuente) {
  const src = canonico(sinComentarios(fuente));
  const f = [];

  // 1 · `stage: "giro"` tiene UN SOLO escritor, y es `aprobarIntegracion`. Dos escritores es exactamente
  //     el defecto: el del `useEffect` no pasaba por `controlesIntegracion` ni por la atribución N3.
  const escrituras = (src.match(/stage: "giro"/g) || []).length;
  if (escrituras !== 1) f.push(`stage: "giro" se escribe ${escrituras} vez/veces; la regla exige EXACTAMENTE 1 (aprobarIntegracion)`);
  const integrar = cuerpoDe(src, "const aprobarIntegracion = (id) =>");
  if (!integrar) f.push("no se encuentra `aprobarIntegracion`");
  else if (!integrar.includes('stage: "giro"')) f.push("`aprobarIntegracion` no escribe `stage: \"giro\"`: el único escritor legítimo dejó de serlo");

  // 2 · El avance automático tras el otorgamiento deja la operación en Pendiente Integración. Se
  //     comprueba por la FUNCIÓN PURA que lo decide, no por el handler: el handler puede reescribirse.
  const avance = cuerpoDe(src, "function avanceTrasOtorgamiento(");
  if (!avance) f.push("no existe la función pura `avanceTrasOtorgamiento` de nivel módulo");
  else {
    if (!avance.includes('integracion: "pendiente"')) f.push("`avanceTrasOtorgamiento` no deja `integracion: \"pendiente\"`");
    if (avance.includes('stage: "giro"')) f.push("`avanceTrasOtorgamiento` escribe `stage: \"giro\"`: el otorgamiento no gira, integra");
    if (!/verifResumenDeal\(/.test(avance)) f.push("`avanceTrasOtorgamiento` no consulta la verificación (VER-01)");
    if (!/otorgamientoCompleto\(/.test(avance)) f.push("`avanceTrasOtorgamiento` no consulta `otorgamientoCompleto` (OTG-02)");
  }

  // 3 · `moverEtapa` no decide por su cuenta: le pregunta al catálogo puro, que es quien exige la causa
  //     de la pérdida y quien escribe `integracion` al pasar a cesión.
  const catalogo = cuerpoDe(src, "function transicionManual(");
  if (!catalogo) f.push("no existe el catálogo puro `transicionManual` de nivel módulo");
  else {
    if (!/causa/.test(catalogo)) f.push("`transicionManual` no nombra la causa: una pérdida sin causa no se puede analizar (regla 5)");
    if (!catalogo.includes('integracion: "pendiente"')) f.push("`transicionManual` no escribe `integracion` al pasar a cesión (regla 26)");
    if (/setDeals|dealsRef|useState/.test(catalogo)) f.push("`transicionManual` no es pura: lee o escribe estado del componente");
  }
  for (const [nombre, ancla] of [
    ["moverEtapa", "const moverEtapa = (id, stageId"],
    ["moveTo", "const moveTo = (stageId)"],
  ]) {
    const cuerpo = cuerpoDe(src, ancla);
    if (!cuerpo) f.push(`no se encuentra \`${nombre}\``);
    else if (!/transicionManual\(/.test(cuerpo)) f.push(`\`${nombre}\` no consulta \`transicionManual\`: vuelve a decidir por su cuenta`);
  }

  // 4 · Un «sí» en el chat no es una firma. El intent `cursar` manda el enlace y nada más.
  const cursar = cuerpoDe(src, 'if (intent === "cursar"');
  if (!cursar) f.push("no se encuentra el intent `cursar` del canal WhatsApp");
  else if (/clienteAcepto/.test(cursar)) f.push("el intent `cursar` escribe `clienteAcepto`: un mensaje de WhatsApp no es la firma del portal (regla 1)");

  return f;
}

test("regla 76 · el fuente cumple las cuatro exigencias", () => {
  const fallas = auditarRegla76(SRC);
  assert.deepEqual(fallas, [], "FALLA:\n  - " + fallas.join("\n  - "));
});

test("sonda negativa: un segundo escritor de `stage: \"giro\"` se caza", () => {
  const plantado = SRC.replace('status: "Pendiente Integración', 'stage: "giro", status: "Pendiente Integración');
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(
    auditarRegla76(plantado).some((x) => /EXACTAMENTE 1/.test(x)),
    "un segundo escritor de la etapa de giro tiene que romper el gate",
  );
});

test("sonda negativa: `avanceTrasOtorgamiento` sin `integracion` se caza", () => {
  const plantado = SRC.replace(/(function avanceTrasOtorgamiento\([^)]*\) \{[\s\S]*?)integracion: "pendiente",/, "$1");
  assert.notEqual(plantado, SRC, "la sonda no plantó nada: el ancla cambió");
  assert.ok(
    auditarRegla76(plantado).some((x) => /no deja `integracion/.test(x)),
    "dejar la operación sin marcar Pendiente Integración tiene que romper el gate",
  );
});

test("sonda negativa: `transicionManual` que no nombra la causa se caza", () => {
  const cuerpo = cuerpoDe(SRC, "function transicionManual(");
  assert.notEqual(cuerpo, "", "no se encuentra `transicionManual`");
  const plantado = SRC.replace(cuerpo, cuerpo.replace(/causa/g, "motivo_"));
  assert.ok(
    auditarRegla76(plantado).some((x) => /no nombra la causa/.test(x)),
    "un catálogo que deja perder sin causa tiene que romper el gate",
  );
});

test("sonda negativa: el arrastre del Kanban que vuelve a decidir por su cuenta se caza", () => {
  const cuerpo = cuerpoDe(SRC, "const moveTo = (stageId)");
  assert.notEqual(cuerpo, "", "no se encuentra `moveTo`");
  const plantado = SRC.replace(cuerpo, cuerpo.replace(/transicionManual\(/g, "decidirAcá("));
  assert.ok(
    auditarRegla76(plantado).some((x) => /`moveTo` no consulta `transicionManual`/.test(x)),
    "arrastrar a la columna Perdida sin pasar por el catálogo tiene que romper el gate",
  );
});

test("sonda negativa: `moverEtapa` que vuelve a decidir por su cuenta se caza", () => {
  const cuerpo = cuerpoDe(SRC, "const moverEtapa = (id, stageId");
  assert.notEqual(cuerpo, "", "no se encuentra `moverEtapa`");
  const plantado = SRC.replace(cuerpo, cuerpo.replace(/transicionManual\(/g, "decidirAcá("));
  assert.ok(
    auditarRegla76(plantado).some((x) => /no consulta `transicionManual`/.test(x)),
    "un `moverEtapa` que no pasa por el catálogo tiene que romper el gate",
  );
});

test("sonda negativa: el intent `cursar` que da por firmada la operación se caza", () => {
  const cuerpo = cuerpoDe(SRC, 'if (intent === "cursar"');
  assert.notEqual(cuerpo, "", "no se encuentra el intent `cursar`");
  const plantado = SRC.replace(cuerpo, cuerpo.replace("cierreEnviado: true", "clienteAcepto: true, cierreEnviado: true"));
  assert.ok(
    auditarRegla76(plantado).some((x) => /el intent `cursar` escribe `clienteAcepto`/.test(x)),
    "un «sí» de WhatsApp que vale como firma tiene que romper el gate",
  );
});

test("sonda negativa: `transicionManual` que lee el estado del componente se caza", () => {
  const cuerpo = cuerpoDe(SRC, "function transicionManual(");
  assert.notEqual(cuerpo, "", "no se encuentra `transicionManual`");
  const plantado = SRC.replace(cuerpo, cuerpo.replace("{", "{ const d0 = dealsRef.current;"));
  assert.ok(
    auditarRegla76(plantado).some((x) => /no es pura/.test(x)),
    "un catálogo que se acopla al componente tiene que romper el gate",
  );
});

test("`cuerpoDe` corta en la llave que cierra, no en la primera que encuentra", () => {
  const txt = 'function f({ a, b }) { if (x) { g(); } return 1; } function otra() { h(); }';
  assert.equal(cuerpoDe(txt, "function f("), "{ if (x) { g(); } return 1; }");
  assert.equal(cuerpoDe(txt, "function noExiste("), "");
});
