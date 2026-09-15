// PADRÓN DE CESIONARIOS — quién puede aparecer como cesionario en una cesión de AECSync (A2), y de
// qué tipo es cada uno.
//
// AECSync registra **todas** las cesiones del cliente, **bancarias y no bancarias**, e identifica en
// cada una al cesionario. O sea que el activo ya responde con quién se financia el cliente: no hay
// que suponerlo. Lo único que AECSync no dice —porque no es un dato del SII sino del mercado— es de
// qué TIPO es cada cesionario, y eso es lo que declara este padrón.
//
// **La identidad es el RUT, no el nombre.** Es la misma lección del A24: un rótulo se renombra y un
// RUT no. Clasificar por trozo de razón social ya había puesto a **Eurocapital** entre los factoring
// de banco —«eurocap·ita·l» contiene el «ita» con que se buscaba «Itaú»—, y con el mix midiéndose
// sobre esta clasificación el error deja de ser un KPI torcido y pasa a ser una porción entera mal
// atribuida.
//
// Tres atributos y una consecuencia:
//   · `banco`   — el cesionario ES un banco o la filial de factoring de un banco. Parte la cartera
//                 del cliente en financiamiento bancario y no bancario, que es la pregunta que
//                 ningún otro activo contesta. Es una propiedad del cesionario: no se configura.
//   · `target`  — los que Security mira de frente. **Es política COMERCIAL del TENANT**, no una
//                 propiedad del cesionario, así que lo que hay acá es el DEFAULT: quién es target se
//                 edita en `Configuración › Factoring target` y el pipeline reagrupa las porciones
//                 con lo que el tenant declare, leyendo `SOW_DETALLE_JSON` (que es la MEDICIÓN,
//                 cesionario por cesionario). Los cuatro agregados del A11 se publican con este
//                 default para el consumidor que no tiene esa configuración.
//   · `nuestro` — Factoring Security. No es competencia: es cartera propia.
//
// `corto` es el nombre para un CHIP, donde no caben «Servicios Financieros Progreso» ni tres razones
// sociales seguidas. Vive en el padrón y no en el consumidor porque es un atributo del cesionario:
// el rótulo de la porción target se ARMA con los cortos de quienes el tenant eligió («BCI -
// Santander»), de modo que el chip no pueda nombrar a alguien que no está adentro.
//
// De ahí salen las CUATRO porciones del mix, que son una partición exhaustiva y disjunta. El orden
// importa: `target` se evalúa ANTES que `banco`, así que un target no bancario sigue cayendo en su
// porción y ninguna queda con dos dueños.
//   ★ Security (nuestro) · Factoring target (los configurados) · Otros bancarios (banco) · Otros factoring (resto)
const BICE_RUT = "97.080.000-0";

const CESIONARIOS = [
  // ── Nosotros ────────────────────────────────────────────────────────────────────────────────
  { rut: BICE_RUT, nombre: "Factoring Security (BICE)", corto: "Security", banco: true, nuestro: true },
  // ── Bancarios · TARGET POR DEFECTO (lo que el tenant edita en Configuración) ──────────────────
  { rut: "96.510.870-6", nombre: "BCI Factoring", corto: "BCI", banco: true, target: true },
  { rut: "97.036.000-K", nombre: "Banco Santander", corto: "Santander", banco: true, target: true },
  // ── Bancarios · el resto de la banca ─────────────────────────────────────────────────────────
  // Sin éstos la porción «Otros bancarios» no tendría de dónde salir y habría que inventarla, que es
  // exactamente lo que este padrón viene a evitar: si el activo registra las cesiones bancarias,
  // el padrón tiene que traer bancos que no sean el target.
  { rut: "96.667.560-8", nombre: "Banchile Factoring", corto: "Banchile", banco: true },
  { rut: "76.645.030-K", nombre: "Itaú Factoring", corto: "Itaú", banco: true },
  { rut: "97.030.000-7", nombre: "BancoEstado", corto: "BancoEstado", banco: true },
  { rut: "97.018.000-1", nombre: "Scotiabank Chile", corto: "Scotiabank", banco: true },
  { rut: "99.500.410-0", nombre: "Banco Consorcio", corto: "Consorcio", banco: true },
  { rut: "97.011.000-3", nombre: "Banco Internacional", corto: "Internacional", banco: true },
  // ── No bancarios ─────────────────────────────────────────────────────────────────────────────
  { rut: "96.684.990-8", nombre: "Tanner Servicios Financieros", corto: "Tanner" },
  { rut: "76.118.580-2", nombre: "Eurocapital", corto: "Eurocapital" },
  { rut: "96.529.420-8", nombre: "Incofin", corto: "Incofin" },
  { rut: "76.040.000-1", nombre: "Factotal", corto: "Factotal" },
  { rut: "76.482.900-3", nombre: "Servicios Financieros Progreso", corto: "Progreso" },
  { rut: "76.223.180-1", nombre: "Coopeuch Factoring", corto: "Coopeuch" },
];

const POR_RUT = new Map(CESIONARIOS.map((c) => [c.rut, c]));

// La porción del mix a la que pertenece un cesionario. Un RUT que el padrón NO declara cae en
// «otros factoring» —el balde más conservador: no lo cuenta como banca ni como competencia
// directa— y se informa aparte, porque un cesionario desconocido es un padrón desactualizado y no
// un hecho del negocio. Fallar en silencio acá es repartir plata a una porción equivocada.
function porcionDe(rut) {
  const c = POR_RUT.get(rut);
  if (!c) return { porcion: "otrosFactoring", conocido: false };
  if (c.nuestro) return { porcion: "security", conocido: true };
  if (c.target) return { porcion: "factoringTarget", conocido: true };
  if (c.banco) return { porcion: "otrosBancarios", conocido: true };
  return { porcion: "otrosFactoring", conocido: true };
}

// Los RUT que son target POR DEFECTO. Es lo que el tenant encuentra la primera vez que abre el
// mantenedor, y lo que el A11 usa para publicar sus cuatro agregados.
const TARGET_DEFAULT = CESIONARIOS.filter((c) => c.target).map((c) => c.rut);

module.exports = { BICE_RUT, CESIONARIOS, POR_RUT, TARGET_DEFAULT, porcionDe };
