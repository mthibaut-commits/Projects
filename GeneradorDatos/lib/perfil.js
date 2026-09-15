// PERFIL DE RIESGO DE UNA ENTIDAD — compartido por los datasets.
// Varios activos describen a la MISMA empresa desde ángulos distintos: A11 su nota de comportamiento,
// A16 su deuda de buró y su mora. Si cada uno sorteara su propio perfil, una empresa podría salir con
// nota 4,8 y a la vez castigada en la CMF. Por eso el perfil se decide UNA vez, por RUT, y los dos
// módulos lo consultan: la coherencia entre activos queda por construcción, no por coincidencia.
// En una cartera real el riesgo se concentra en una minoría.
const { hashStr, pcRng } = require("./rng");
function perfilEntidad(clave) {
  const x = pcRng(Math.abs(hashStr("perfil|" + clave)))();
  return x < 0.58 ? "sana" : x < 0.86 ? "aislada" : "problematica";
}
module.exports = { perfilEntidad };
