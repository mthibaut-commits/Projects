/* Gate de la regla 33 · la guarda contra una solicitud al comité DUPLICADA cruza de pestaña.

   Por qué un gate de TEXTO y no un caso de la suite: la guarda vive dentro del handler de cerrar la oferta,
   que es un closure de `PipelineComercial`; la suite no monta la app y no puede llamarlo. Lo que sí se puede
   fijar desde fuera es la FORMA: que exista el repositorio, que la búsqueda de la previa lo consulte y que la
   inyección lo escriba. Las tres tienen que estar: con el repositorio pero sin la lectura, la guarda sigue
   ciega; con la lectura pero sin la escritura, siempre encuentra vacío. Es el modo de falla que tenía hasta el
   18-09-2026, cuando la previa se buscaba SÓLO en `SOLICITUDES_LINEA`, que es la memoria de la pestaña: el
   detalle es pestaña propia desde el 02-09-2026, así que cerrar la oferta, cerrar la pestaña y volver a
   abrirla dejaba la comparación sin nada y entraba una segunda petición idéntica — y NEX no puede retirar la
   anterior (regla 15), o sea que el comité terminaba viendo las dos.

   Lo que este gate NO afirma: que la guarda decida bien. Eso es `mismaSolicitudComite`, que compara el
   detalle y no el total (dos repartos distintos pueden sumar igual) y lo fija el caso 116 de la suite. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

export const REPO = "solicitud_comite";

/* Las tres piezas, sobre el texto del fuente. `src` entra por parámetro para poder plantar el fuente roto. */
export function guardaCruzaPestana(src) {
  const fallos = [];
  if (!new RegExp(`const repoSolicitudComite = crearRepo\\("${REPO}"\\)`).test(src))
    fallos.push(`no existe \`const repoSolicitudComite = crearRepo("${REPO}")\`: sin repositorio la guarda no puede cruzar de pestaña`);

  /* La lectura: la previa se busca también en el repositorio, no sólo en la lista de la pestaña. */
  const previa = src.match(/const previa = sol \?[^\n]*/);
  if (!previa) fallos.push("no se encuentra la búsqueda de la solicitud previa (`const previa = sol ?`)");
  else {
    if (!/repoSolicitudComite\.get\(/.test(previa[0]))
      fallos.push("la previa no consulta `repoSolicitudComite.get(...)`: buscarla sólo en SOLICITUDES_LINEA la deja ciega a lo que cerró otra pestaña");
    if (!/SOLICITUDES_LINEA\.find\(/.test(previa[0]))
      fallos.push("la previa dejó de mirar `SOLICITUDES_LINEA`: es la que trae el estado vivo del proceso para el log");
  }

  /* La escritura: al inyectar se persiste, y con lo que el comparador necesita. */
  const set = src.match(/repoSolicitudComite\.set\([^\n]*/);
  if (!set) fallos.push("nadie escribe en `repoSolicitudComite`: la guarda encontraría siempre vacío");
  else for (const campo of ["idProceso", "rut", "detalle"])
    if (!new RegExp(`\\b${campo}\\b`).test(set[0]))
      fallos.push(`lo que se persiste no lleva \`${campo}\`, y \`mismaSolicitudComite\` lo necesita para comparar`);

  return fallos;
}

test("la guarda contra una solicitud al comité duplicada cruza de pestaña (regla 33)", () => {
  assert.deepEqual(guardaCruzaPestana(jsx), []);
});

test("sonda negativa: las tres formas de dejar la guarda ciega se detectan", () => {
  const sano = jsx;
  assert.deepEqual(guardaCruzaPestana(sano), [], "el fuente sano no da fallos");

  const sinRepo = sano.replace(`const repoSolicitudComite = crearRepo("${REPO}");`, "");
  assert.match(guardaCruzaPestana(sinRepo).join(" "), /no existe .*crearRepo/, "sin repositorio tiene que caer");

  const sinLectura = sano.replace(/const previa = sol \?[^\n]*/, "const previa = sol ? SOLICITUDES_LINEA.find((x) => x && x.origen && x.origen.dealId === id) : null;");
  assert.match(guardaCruzaPestana(sinLectura).join(" "), /no consulta `repoSolicitudComite\.get/, "volver a mirar sólo la pestaña tiene que caer: es el defecto que esto cierra");

  const sinEscritura = sano.replace(/repoSolicitudComite\.set\([^\n]*/, "");
  assert.match(guardaCruzaPestana(sinEscritura).join(" "), /nadie escribe en `repoSolicitudComite`/, "sin escritura la guarda encuentra siempre vacío");

  const sinDetalle = sano.replace(/repoSolicitudComite\.set\([^\n]*/, "repoSolicitudComite.set(id, { idProceso: idProc, rut: sol.rut });");
  assert.match(guardaCruzaPestana(sinDetalle).join(" "), /no lleva `detalle`/, "persistir sin el detalle deja al comparador sin con qué comparar");
});
