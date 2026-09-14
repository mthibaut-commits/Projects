// CARTERA — activo A24 (CSV diario por SFTP). Ver `Integraciones/spec_sftp_cartera.md`.
//
// POR QUÉ EXISTE. La estructura comercial —quién es ejecutivo, de qué equipo, en qué zona y sucursal—
// y la ASIGNACIÓN de cada cliente a su ejecutivo vivían repartidas en cuatro constantes del bundle y
// en un campo pasajero del A5 (`SHARE_OF_WALLET.Ejecutivo`, que además viaja por NOMBRE). Ninguna de
// las dos cosas es del pipeline: las produce RRHH y la administración comercial, cambian todos los
// días y llegan en el archivo de cartera de cada mañana.
//
// DOS GRANOS, UN ARCHIVO, y por eso la columna `TIPO`:
//   · TIPO = EJECUTIVO → la persona en la estructura (código, nombre, equipo, jefe, zona, sucursal)
//   · TIPO = CARTERA   → la asignación (RUT cliente → código de ejecutivo)
// Viajan juntos porque tienen que validarse como una UNIDAD: una asignación a un código que el
// archivo no declara es un archivo roto, y cargarla igual deja operaciones colgando de un ejecutivo
// que no existe. Ver la nota de integridad en el spec.
//
// Lo que se puede MEDIR no se inventa: la asignación sale del `Ejecutivo` que ya declara el A5, para
// que el activo nuevo no contradiga al que la app viene leyendo. Lo que el A5 no cubre —el prospecto
// sin dueño— NO se rellena: un RUT que no está en el archivo es un prospecto, no un cliente sin
// ejecutivo, y esa diferencia la decide el pipeline, no el dato.
//
// NO entra acá la cartera curada de la SEMILLA de eventos del demo (`EMPRESA_EJECUTIVO` en el
// pipeline). Son ~24 razones sociales escritas a mano para mostrar escenarios concretos, no existen
// en DTESync y por lo tanto no tienen RUT: este archivo se llavea por RUT, que es la identidad de un
// cliente. Esa asignación pertenece a la semilla, no al padrón de cartera, y se queda con ella.
const { hashStr } = require("../lib/rng");

const CORTE = "2026-06-22";
const DESDE = "2025-01-02";

// La estructura comercial del tenant de la demo: SÓLO la fuerza de venta. En producción la produce
// RRHH; acá es el catálogo que la app venía declarando en cuatro constantes de módulo, ahora en un
// solo sitio y con el CÓDIGO como identidad —no el nombre—, que es lo que permite que alguien se
// cambie el apellido sin que se caiga la cartera.
//
// `COD_JEFE` apunta al catálogo de usuarios del TENANT, no a este archivo: quién es jefe y qué
// atribución tiene es configuración del tenant, y declararlo también acá lo pondría en dos sitios.
// En este tenant sólo **Equipo Andes** tiene jefatura declarada (JG); las otras dos están VACANTES y
// sus ejecutivos cuelgan de la gerencia comercial (GC). Es un estado legítimo y frecuente, y de paso
// ejercita el caso «cargo vacante» que las reglas de atribución ya contemplan.
const ESTRUCTURA = [
  // cod  nombre             email                     equipo            jefe  zona                    sucursal
  ["CR", "Carla Rivas",     "crivas@factoring.cl",    "Equipo Andes",    "JG", "Zona Norte (Andina)", "Antofagasta"],
  ["RF", "Rodrigo Fuentes", "rfuentes@factoring.cl",  "Equipo Andes",    "JG", "Zona Norte (Andina)", "La Serena"],
  ["JT", "Javier Torres",   "jtorres@factoring.cl",   "Equipo Pacífico", "GC", "Zona Centro",         "Valparaíso"],
  ["MS", "María José Soto", "mjsoto@factoring.cl",    "Equipo Pacífico", "GC", "Zona Centro",         "Santiago Centro"],
  ["NB", "Natalia Bravo",   "nbravo@factoring.cl",    "Equipo Austral",  "GC", "Zona Sur",            "Concepción"],
  ["DC", "Diego Cáceres",   "dcaceres@factoring.cl",  "Equipo Austral",  "GC", "Zona Sur",            "Puerto Montt"],
];


function generar({ DTESYNC, SHARE_OF_WALLET }) {
  const campos = ["TIPO", "COD_EJECUTIVO", "RUT_CLIENTE", "NOMBRE", "EMAIL", "EQUIPO", "COD_JEFE",
                  "ZONA", "SUCURSAL", "ESTADO", "VIGENTE_DESDE", "VIGENTE_HASTA", "FECHA_CORTE"];
  const filas = [];

  // ── Filas EJECUTIVO ───────────────────────────────────────────────────────────────────────────
  for (const [cod, nombre, email, equipo, jefe, zona, sucursal] of ESTRUCTURA) {
    filas.push(["EJECUTIVO", cod, "", nombre, email, equipo, jefe, zona, sucursal, "ACTIVO", DESDE, "", CORTE]);
  }

  // ── Filas CARTERA ─────────────────────────────────────────────────────────────────────────────
  // Índice nombre → código, para resolver el `Ejecutivo` del A5, que viaja por nombre. Es exactamente
  // la traducción que el pipeline hacía en runtime y que este activo viene a eliminar.
  const codPorNombre = {};
  for (const [cod, nombre] of ESTRUCTURA) codPorNombre[nombre] = cod;
  // Razón social por RUT, medida de DTESync: la copia de conveniencia del archivo sale del maestro
  // que la produce, no de un nombre inventado acá.
  const razon = {};
  for (const d of (DTESYNC || [])) {
    if (!d || !d.RUTEmisor) continue;
    if (!razon[d.RUTEmisor]) razon[d.RUTEmisor] = d.RznSoc || "";
  }

  const asignado = {};
  for (const s of (SHARE_OF_WALLET || [])) {
    if (!s || !s.RUTCliente) continue;
    const cod = codPorNombre[s.Ejecutivo];
    if (!cod) continue;                       // ejecutivo que la estructura no declara: no se emite
    asignado[s.RUTCliente] = cod;
  }

  // Orden estable por RUT: el archivo tiene que ser byte a byte el mismo en dos corridas iguales.
  for (const rut of Object.keys(asignado).sort()) {
    // Antigüedad de la asignación: estable por par (rut, ejecutivo). No se sortea la FECHA sino los
    // días hacia atrás, para que reasignar un cliente a otro ejecutivo mueva la fecha, que es el
    // comportamiento que un archivo real tiene.
    const dias = Math.abs(hashStr("cartera|" + rut + "|" + asignado[rut])) % 900;
    const d = new Date(Date.parse(CORTE) - dias * 86400000).toISOString().slice(0, 10);
    filas.push(["CARTERA", asignado[rut], rut, razon[rut] || "", "", "", "", "", "", "ACTIVO", d, "", CORTE]);
  }

  return { campos, filas };
}
module.exports = { generar };
