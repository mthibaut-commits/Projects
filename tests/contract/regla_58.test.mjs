/* Gate de contrato de la regla 58: la oferta PUBLICADA existe como estado y llega al tubo.
   Tres piezas, y las tres tienen que estar: (1) cerrar la oferta asienta los DOS hechos —el botón dice
   «y publicar», elige cómo se publica y deja escrito en el historial que el correo salió—; (2) los tres
   escritores de la publicación le AVISAN al tubo, que es otro documento; y (3) el predicado NO se
   afloja: sigue exigiendo cerrada Y comunicada, porque el camino del Agente IA publica por su lado sin
   pasar por el cierre (regla 54, caso 158). La pantalla la gatea `e2e-58`, en las dos direcciones. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";
import { cuerpoFlecha } from "./regla_53.test.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla58(src) {
  const fallos = [];
  // 1 · El catálogo declara el estado, entre Negociación y Aceptada.
  if (!/const ETAPA_PUBLICADA = "oferta_publicada";/.test(src)) fallos.push("no existe el estado `oferta_publicada`");
  if (!/\[ETAPA_PUBLICADA\]: \{ label: "Oferta publicada", color: "#16A34A" \}/.test(src))
    fallos.push("el tenant dejó de rotular `oferta_publicada`: sin rótulo la fila cae al nombre del modelo y nadie distingue una oferta enviada de una en negociación");
  if (!/const etapaVisualId = \(d\) => \(d && d\.stage === "oferta" && ofertaPublicada\(d\) \? ETAPA_PUBLICADA : displayStageId\(d\)\);/.test(src))
    fallos.push("la etapa visual dejó de colapsar a `oferta_publicada`: es lo único que convierte el hecho en el chip de la fila");
  // 2 · Cerrar la oferta asienta LOS DOS hechos.
  const i = src.indexOf("const patchCierre = {");
  const patch = i < 0 ? "" : src.slice(i, src.indexOf("};", i));
  if (!patch) fallos.push("no existe `patchCierre`");
  else {
    if (!/ofertaCerrada: true,/.test(patch)) fallos.push("`patchCierre` no marca la oferta como cerrada");
    if (!/ofertaComunicada: true,/.test(patch))
      fallos.push(
        "`patchCierre` no marca la oferta como COMUNICADA: el botón dice «y publicar», el modal elige cómo se publica y el historial deja escrito que el correo salió, así que sin la bandera la misma pantalla dice cuatro cosas distintas y el tubo se queda en «Negociación»",
      );
  }
  // 3 · Los TRES escritores de la publicación le avisan al tubo (el detalle es otro documento).
  for (const fn of ["cerrarOferta", "publicarOferta", "enviarCierre"]) {
    const cuerpo = cuerpoFlecha(src, fn) || cuerpoLlave(src, fn);
    if (!cuerpo) fallos.push(`no existe \`${fn}\``);
    else if (!/avisarTubo\(id, /.test(cuerpo))
      fallos.push(`\`${fn}\` publica la oferta y no le avisa al tubo: el detalle es pestaña propia, así que la fila se queda con la copia vieja y sigue diciendo «Negociación»`);
  }
  // 4 · El predicado NO se afloja: siguen haciendo falta los dos hechos.
  if (!/const cerrada = !!\(deal\.ofertaCerrada \|\| deal\.negocioNum\);/.test(src) || !/return cerrada && comunicada;/.test(src))
    fallos.push("`ofertaPublicada` dejó de exigir los dos hechos: cerrar es la aprobación interna y comunicar es el compromiso con el cliente, y el Agente IA hace el segundo sin el primero");
  return fallos;
}

/* Cuerpo de `const X = (…) => { … }` (sin `async`), del mismo modo que `cuerpoFlecha` lo hace con las async. */
export function cuerpoLlave(src, nombre) {
  const m = src.match(new RegExp(`\\n(\\s*)const ${nombre} = \\([^)]*\\) => \\{\\n`));
  if (!m) return null;
  const ini = m.index + 1;
  const cierre = src.indexOf("\n" + m[1] + "};", ini);
  return cierre < 0 ? src.slice(ini) : src.slice(ini, cierre);
}

test("58 · la oferta publicada es un estado, el cierre la asienta y los tres escritores le avisan al tubo", () => {
  assert.deepEqual(auditarRegla58(jsx), []);
});

const MUTANTES = {
  "cerrar deja de comunicar": {
    src: jsx.replace("      ofertaCerrada: true,\n      ofertaComunicada: true,", "      ofertaCerrada: true,"),
    re: /no marca la oferta como COMUNICADA/,
  },
  "publicar deja de avisarle al tubo": {
    src: jsx.replace("      avisarTubo(id, patch);\n      return { ...d, ...patch };\n    };\n    setDeals((prev) => prev.map(upd));", "      return { ...d, ...patch };\n    };\n    setDeals((prev) => prev.map(upd));"),
    re: /publicarOferta` publica la oferta y no le avisa al tubo/,
  },
  "el estado deja de rotularse": {
    src: jsx.replace('[ETAPA_PUBLICADA]: { label: "Oferta publicada", color: "#16A34A" }', "[ETAPA_PUBLICADA]: { color: \"#16A34A\" }"),
    re: /dejó de rotular/,
  },
  "la etapa visual deja de colapsar": {
    src: jsx.replace('const etapaVisualId = (d) => (d && d.stage === "oferta" && ofertaPublicada(d) ? ETAPA_PUBLICADA : displayStageId(d));', "const etapaVisualId = (d) => displayStageId(d);"),
    re: /dejó de colapsar/,
  },
  "el predicado se conforma con cerrar": {
    src: jsx.replace("  return cerrada && comunicada;", "  return cerrada;"),
    re: /dejó de exigir los dos hechos/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`58 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla58(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
