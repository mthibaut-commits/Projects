#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════════════════════════
// EXTRACTOR DEL PADRÓN DE IDENTIDADES — NEX Factoring
//
//   node GeneradorDatos/extraer_padron.js <ruta-del-AEC.csv> [salida]
//   (por defecto escribe `GeneradorDatos/lib/padron.js`)
//
// Lee el AEC de BICE Factoring (REQ-15, 411.526 cesiones reales) y produce el PADRÓN: los pares
// RUT ↔ razón social que el sistema usa como identidades. Extrae SÓLO LA IDENTIDAD — que es registro
// público— y NADA de la transacción: ni folios, ni montos, ni fechas, ni quién le cedió a quién. Esa
// parte es la cartera comercial real del factoring y no entra en una demo; las operaciones se siguen
// generando sintéticas y deterministas (regla núcleo 9).
//
// Por eso el AEC NO se commitea y este script no corre en el CI: su salida sí, igual que
// `lib/cesionarios.js`, que es el mismo patrón (identidades reales de instituciones, escritas a mano).
//
// DOS DECISIONES QUE EL ARCHIVO OBLIGA:
//
//   · El AEC trae `RazonSocialCedente` pero NO `RazonSocialReceptor`: los deudores vienen con RUT real
//     y sin nombre. Sólo 335 de 5.000 receptores se pueden nombrar, porque también aparecen como
//     cedentes. Los 15 receptores más grandes no están entre ellos. De ahí que los deudores se sirvan
//     primero de esos 335 —donde el rol calza con el archivo— y el resto del pool de cedentes: una
//     empresa es cliente de un factoring y deudora de otro, así que el par sigue siendo real.
//   · EL AEC TRAE PERSONAS NATURALES y el padrón NO se las lleva. Un empresario individual cede sus
//     facturas con toda legitimidad y aparece en el archivo con su nombre completo y su RUT — pero eso
//     es dato de una persona identificable, no la identidad pública de una empresa, y no tiene por qué
//     terminar en una demo. El corte es el RUT, medido sobre este archivo y sin ambigüedad: de los 93
//     cedentes bajo 30M, CERO llevan marca societaria (son «nombre + dos apellidos»); entre 30M y 50M no
//     hay ninguno; los 9 del tramo 50–60M son el 100 % sociedades (SPA, LTDA., LLC extranjeras) y los
//     2.111 sobre 60M lo son en un 95 %. Así que se excluye TODO RUT bajo 50.000.000. Quedan 2.120
//     identidades de empresa para las 1.241 que el activo necesita.
//   · 384 RUT aparecen con más de una grafía («… LIMITADA» / «… LTDA.»). Gana la MÁS FRECUENTE, y se
//     copia VERBATIM: corregirle la caja o la puntuación a una razón social registrada es editar el
//     dato. Por eso el padrón trae mayúsculas donde el archivo las trae.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const fs = require("fs");
const path = require("path");

// Divide una línea CSV respetando comillas. El archivo trae campos entrecomillados con comas dentro.
function celdas(linea) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') { if (q && linea[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// RUT canónico del padrón: SIN puntos y con el dígito verificador en mayúscula, que es como viaja en
// el AEC y en los CSV de `Integraciones/`. Cada campo del activo lo re-formatea a su propia convención
// —DTESYNC guarda el emisor sin puntos y el receptor con puntos—, así que el padrón no puede imponer una.
function rutCanonico(r) {
  const s = String(r || "").replace(/\./g, "").trim().toUpperCase();
  return /^\d{1,9}-[\dK]$/.test(s) ? s : "";
}

// Bajo este número el RUT es de una PERSONA NATURAL y el padrón no lo toma (ver el encabezado). El
// tramo 50–60M sí entra: son sociedades, varias extranjeras, y excluirlas sería perder empresas reales.
const RUT_MIN_EMPRESA = 50000000;
const esEmpresa = (rut) => parseInt(String(rut).split("-")[0], 10) >= RUT_MIN_EMPRESA;

function extraer(texto) {
  const lineas = texto.split(/\r?\n/);
  const cab = celdas(lineas[0]).map((c) => c.trim());
  const iRutCed = cab.indexOf("RUTCedente"), iRznCed = cab.indexOf("RazonSocialCedente"), iRutRec = cab.indexOf("RUTReceptor");
  if (iRutCed < 0 || iRznCed < 0 || iRutRec < 0) throw new Error("el AEC no trae RUTCedente / RazonSocialCedente / RUTReceptor");
  const grafias = new Map(); // rut -> Map(nombre -> veces)
  const vecesCed = new Map(); // rut -> cesiones como cedente
  const vecesRec = new Map(); // rut -> cesiones como receptor
  for (let i = 1; i < lineas.length; i++) {
    if (!lineas[i]) continue;
    const c = celdas(lineas[i]);
    const rc = rutCanonico(c[iRutCed]), nc = String(c[iRznCed] || "").replace(/^"|"$/g, "").trim();
    if (rc && nc) {
      if (!grafias.has(rc)) grafias.set(rc, new Map());
      const g = grafias.get(rc);
      g.set(nc, (g.get(nc) || 0) + 1);
      vecesCed.set(rc, (vecesCed.get(rc) || 0) + 1);
    }
    const rr = rutCanonico(c[iRutRec]);
    if (rr) vecesRec.set(rr, (vecesRec.get(rr) || 0) + 1);
  }
  // La grafía más frecuente gana; a igual frecuencia, la alfabéticamente menor, para que sea determinista.
  const nombre = new Map();
  for (const [rut, g] of grafias) {
    const mejor = [...g.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
    nombre.set(rut, mejor);
  }
  return { nombre, vecesCed, vecesRec };
}

// Reparte las identidades en DEUDORES y CLIENTES sin solaparlas. Los deudores se sirven PRIMERO de los
// que el AEC muestra como receptores (rol que calza) y en orden de volumen; los clientes salen de los
// cedentes que quedan, también por volumen. El orden es total y determinista: a igual volumen decide el
// RUT, así que dos corridas reparten idéntico.
function repartir(padron, nDeudores, nClientes, nStream, nProv) {
  const { nombre, vecesCed, vecesRec } = padron;
  const porVol = (m) => (a, b) => (m.get(b) || 0) - (m.get(a) || 0) || (a < b ? -1 : 1);
  const nombrables = [...nombre.keys()].filter(esEmpresa);
  const receptores = nombrables.filter((r) => vecesRec.has(r)).sort(porVol(vecesRec));
  const deudores = receptores.slice(0, nDeudores);
  if (deudores.length < nDeudores) {
    const resto = nombrables.filter((r) => !vecesRec.has(r)).sort(porVol(vecesCed));
    deudores.push(...resto.slice(0, nDeudores - deudores.length));
  }
  const usados = new Set(deudores);
  const clientes = nombrables.filter((r) => !usados.has(r)).sort(porVol(vecesCed)).slice(0, nClientes);
  // STREAM: los cedentes del flujo inbound. Son PROSPECTOS —empresas que todavía no son clientes del
  // factoring—, así que salen de los que sobran y no pueden repetir a nadie de las otras dos listas.
  // Se eligen DESPUÉS, sobre el resto, para que agregar esta lista no mueva ni un deudor ni un cliente.
  for (const r of clientes) usados.add(r);
  const stream = nombrables.filter((r) => !usados.has(r)).sort(porVol(vecesCed)).slice(0, nStream);
  // PROVEEDORES: quiénes le venden a cada cliente (`proveedores_clientes.json`). Es el universo de
  // PROSPECTOS de la prospección, y es disjunto de los clientes por construcción del activo. Va último
  // por lo mismo que el stream: cada lista nueva se sirve de lo que queda y no mueve a las anteriores.
  for (const r of stream) usados.add(r);
  const proveedores = nombrables.filter((r) => !usados.has(r)).sort(porVol(vecesCed)).slice(0, nProv);
  if (deudores.length < nDeudores || clientes.length < nClientes || stream.length < nStream || proveedores.length < nProv) {
    throw new Error(`el padrón no alcanza: deudores ${deudores.length}/${nDeudores}, clientes ${clientes.length}/${nClientes}, stream ${stream.length}/${nStream}, proveedores ${proveedores.length}/${nProv}`);
  }
  const fila = (r) => ({ rut: r, razonSocial: nombre.get(r) });
  return { deudores: deudores.map(fila), clientes: clientes.map(fila), stream: stream.map(fila), proveedores: proveedores.map(fila) };
}

module.exports = { celdas, rutCanonico, extraer, repartir, esEmpresa, RUT_MIN_EMPRESA };

if (require.main === module) {
  const entrada = process.argv[2];
  if (!entrada) { console.error("uso: node GeneradorDatos/extraer_padron.js <AEC.csv> [salida]"); process.exit(1); }
  const salida = process.argv[3] || path.join(__dirname, "lib", "padron.js");
  const N_DEUDORES = 741, N_CLIENTES = 500, N_STREAM = 45, N_PROV = 697; // el activo, el stream y los prospectos
  const p = extraer(fs.readFileSync(entrada, "utf8"));
  const { deudores, clientes, stream, proveedores } = repartir(p, N_DEUDORES, N_CLIENTES, N_STREAM, N_PROV);
  const comoRec = deudores.filter((d) => p.vecesRec.has(d.rut)).length;
  const personas = [...p.nombre.keys()].filter((r) => !esEmpresa(r)).length;
  console.log(`personas naturales excluidas del padrón: ${personas}`);
  const cab = `// GENERADO por \`node GeneradorDatos/extraer_padron.js <AEC.csv>\` — NO editar a mano.
// El PADRÓN de identidades: pares RUT ↔ razón social REALES, extraídos del AEC de BICE Factoring
// (REQ-15). Sólo identidad; ninguna transacción del archivo llega acá (ver el encabezado del extractor).
// Sólo EMPRESAS: las ${personas} personas naturales del AEC quedan fuera (RUT < ${RUT_MIN_EMPRESA}).
// ${deudores.length} deudores (${comoRec} de ellos aparecen como receptores en el AEC, así que el rol calza)
// ${clientes.length} clientes, ${stream.length} prospectos del stream y ${proveedores.length} proveedores, sin repetirse entre listas.
// Las razones sociales van VERBATIM: la grafía más frecuente de cada RUT.
`;
  const lista = (xs) => xs.map((x) => `  { rut: ${JSON.stringify(x.rut)}, razonSocial: ${JSON.stringify(x.razonSocial)} },`).join("\n");
  fs.writeFileSync(salida, `${cab}const DEUDORES = [\n${lista(deudores)}\n];\nconst CLIENTES = [\n${lista(clientes)}\n];\nconst STREAM = [\n${lista(stream)}\n];\nconst PROVEEDORES = [\n${lista(proveedores)}\n];\nmodule.exports = { DEUDORES, CLIENTES, STREAM, PROVEEDORES };\n`);
  console.log(`padrón escrito en ${salida}`);
  console.log(`   deudores ${deudores.length} (${comoRec} con rol de receptor en el AEC) · clientes ${clientes.length} · stream ${stream.length} · proveedores ${proveedores.length}`);
  console.log(`   top 5 deudores: ${deudores.slice(0, 5).map((d) => d.razonSocial).join(" · ")}`);
}
