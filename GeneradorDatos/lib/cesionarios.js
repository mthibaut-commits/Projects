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
//                 ningún otro activo contesta.
//   · `target`  — de los bancarios, los que Security mira de frente (BCI · Banco de Chile · Itaú).
//                 Es política COMERCIAL del tenant, no una propiedad del cesionario: otro factoring
//                 tendría otro target sobre el mismo padrón.
//   · `nuestro` — Factoring Security. No es competencia: es cartera propia.
//
// De ahí salen las CUATRO porciones del mix, que son una partición exhaustiva y disjunta:
//   ★ Security (nuestro) · Factoring target (banco+target) · Otros bancarios (banco) · Otros factoring (resto)
const BICE_RUT = "97.080.000-0";

const CESIONARIOS = [
  // ── Nosotros ────────────────────────────────────────────────────────────────────────────────
  { rut: BICE_RUT, nombre: "Factoring Security (BICE)", banco: true, nuestro: true },
  // ── Bancarios · TARGET (la competencia que se mira de frente) ────────────────────────────────
  { rut: "96.510.870-6", nombre: "BCI Factoring", banco: true, target: true },
  { rut: "96.667.560-8", nombre: "Banchile Factoring", banco: true, target: true },
  { rut: "76.645.030-K", nombre: "Itaú Factoring", banco: true, target: true },
  // ── Bancarios · el resto de la banca ─────────────────────────────────────────────────────────
  // Sin éstos la porción «Otros bancarios» no tendría de dónde salir y habría que inventarla, que es
  // exactamente lo que este padrón viene a evitar: si el activo registra las cesiones bancarias,
  // el padrón tiene que traer bancos que no sean el target.
  { rut: "97.036.000-K", nombre: "Banco Santander", banco: true },
  { rut: "97.030.000-7", nombre: "BancoEstado", banco: true },
  { rut: "97.018.000-1", nombre: "Scotiabank Chile", banco: true },
  { rut: "99.500.410-0", nombre: "Banco Consorcio", banco: true },
  { rut: "97.011.000-3", nombre: "Banco Internacional", banco: true },
  // ── No bancarios ─────────────────────────────────────────────────────────────────────────────
  { rut: "96.684.990-8", nombre: "Tanner Servicios Financieros" },
  { rut: "76.118.580-2", nombre: "Eurocapital" },
  { rut: "96.529.420-8", nombre: "Incofin" },
  { rut: "76.040.000-1", nombre: "Factotal" },
  { rut: "76.482.900-3", nombre: "Servicios Financieros Progreso" },
  { rut: "76.223.180-1", nombre: "Coopeuch Factoring" },
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
  if (c.banco && c.target) return { porcion: "factoringTarget", conocido: true };
  if (c.banco) return { porcion: "otrosBancarios", conocido: true };
  return { porcion: "otrosFactoring", conocido: true };
}

module.exports = { BICE_RUT, CESIONARIOS, POR_RUT, porcionDe };
