/* Gate e2e de la regla 58: la oferta PUBLICADA se ve en el tubo. El estado `oferta_publicada` existe en
   el catálogo del tenant desde siempre, pero la fila seguía diciendo «Negociación» con la oferta ya en
   manos del cliente: el detalle es pestaña propia y los tres escritores de la publicación —el cierre, el
   canal del agente y el envío del enlace para firmar— no le avisaban al tubo, o no asentaban la bandera.
   Se ejercita por el MISMO canal que usan (`postMessage nex-simulado`), que es lo que el tubo escucha, y
   en las DOS direcciones: con los dos hechos la fila pasa a «Oferta publicada», y sólo con el cierre
   —sin comunicar— se queda en «Negociación», que es la distinción que la regla 54 fija (caso 158). */

const ETAPAS = /Sin gestión|Negociación|Oferta publicada|Prospección|Oferta y Negociación|Aceptada|Cesión|Otorgamiento|Perdida/;
const filas = (pagina) => pagina.evaluate((re) => [...document.querySelectorAll("tr.pl-row")].map((tr) => {
  const t = tr.innerText || "";
  return { id: (t.match(/OP-DIR\d+/) || [])[0] || null, etapa: (t.match(new RegExp(re)) || [])[0] || null };
}), ETAPAS.source);
const fila = async (pagina, id) => (await filas(pagina)).find((f) => f.id === id) || null;
const postPatch = (pagina, dealId, patch) => pagina.evaluate(({ dealId, patch }) => window.postMessage({ type: "nex-simulado", dealId, patch }, "*"), { dealId, patch });
const esperarEtapa = (pagina, id, etapa, timeout = 20000) =>
  pagina.waitForFunction(([id, etapa, re]) => [...document.querySelectorAll("tr.pl-row")].some((tr) => {
    const t = tr.innerText || ""; return t.includes(id) && ((t.match(new RegExp(re)) || [])[0] === etapa);
  }), [id, etapa, ETAPAS.source], { timeout });
const filtroRapido = async (pagina, rotulo) => {
  await pagina.locator('button[title="Filtrar oportunidades"]').filter({ hasText: new RegExp("^\\s*" + rotulo) }).first().click();
  await pagina.waitForTimeout(400);
};

export const casos = [
  {
    id: "e2e-58",
    titulo: "la oferta publicada se ve en el TUBO: con el cierre y la comunicación la fila pasa a «Oferta publicada», y sólo con el cierre se queda en «Negociación»",
    correr: async (h) => {
      try {
        await h.encenderDirectorio();
        await filtroRapido(h.pagina, "Todos");
        const ids = (await filas(h.pagina)).map((f) => f.id).filter(Boolean);
        if (ids.length < 2) throw new Error(`el Directorio dejó ${ids.length} fila(s) OP-DIR, se esperaban 5`);
        const [idA, idB] = ids;
        const antesA = await fila(h.pagina, idA);
        // A · los DOS hechos, que es lo que el cierre asienta desde la regla 58.
        await postPatch(h.pagina, idA, { stage: "oferta", ofertaCerrada: true, ofertaComunicada: true, negocioNum: 5801, status: "Oferta publicada · N° 5801 · pendiente firma del cliente" });
        await esperarEtapa(h.pagina, idA, "Oferta publicada").catch(() => { throw new Error("el tubo no pasó la fila a «Oferta publicada» con la oferta cerrada Y comunicada"); });
        const despA = await fila(h.pagina, idA);
        // B · sólo el cierre: publicar son DOS hechos y sin el segundo la fila no se mueve (regla 54).
        const antesB = await fila(h.pagina, idB);
        await postPatch(h.pagina, idB, { stage: "oferta", ofertaCerrada: true, negocioNum: 5802 });
        await h.pagina.waitForTimeout(1200);
        const despB = await fila(h.pagina, idB);
        if (despB.etapa === "Oferta publicada") throw new Error("una oferta cerrada y NO comunicada se está mostrando como publicada: publicar son dos hechos");
        return `${idA}: «${antesA.etapa}» → «${despA.etapa}» (cerrada + comunicada) · ${idB}: «${antesB.etapa}» → «${despB.etapa}» (sólo cerrada)`;
      } finally {
        await h.apagarDirectorio();
        await filtroRapido(h.pagina, "Con línea").catch(() => {});
      }
    },
  },
];
