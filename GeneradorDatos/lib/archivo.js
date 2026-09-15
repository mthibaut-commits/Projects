// Lectura y escritura del archivo de datos inyectados. El archivo es una secuencia de asignaciones
// `window.NOMBRE=<json>`; se parte por esas marcas para poder reemplazar bloques sin tocar el resto.
const fs = require("fs");
function leer(ruta) {
  const txt = fs.readFileSync(ruta, "utf8");
  const marcas = [...txt.matchAll(/window\.([A-Z0-9_]+)=/g)].map((m) => ({ nombre: m[1], ini: m.index }));
  const bloques = {};
  marcas.forEach((m, i) => {
    const fin = i + 1 < marcas.length ? marcas[i + 1].ini : txt.length;
    bloques[m.nombre] = txt.slice(m.ini, fin);
  });
  const g = {}; global.window = g;
  for (const n of Object.keys(bloques)) eval(bloques[n]);
  return { bloques, datos: g, orden: marcas.map((m) => m.nombre) };
}
function escribir(ruta, orden, bloques) {
  fs.writeFileSync(ruta, orden.map((n) => bloques[n]).join(""));
}
const serializar = (nombre, valor) => "window." + nombre + "=" + JSON.stringify(valor) + "\n";
module.exports = { leer, escribir, serializar };
