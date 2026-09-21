/* Gate de contrato de la regla 48 (el cierre del negocio le escribe a quien tiene que firmar), sobre el
   TEXTO del fuente: `confirmarCierre` vive dentro de `PipelineComercial` —es el handler de la firma que
   vuelve del portal— así que ni la suite ni los auditores lo alcanzan, y el defecto que esta regla cierra
   era una AUSENCIA: 162 líneas sin una sola llamada a la mensajería. Una ausencia no la caza ningún test
   que mire la salida, porque no hay salida que mirar. Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* El cuerpo de una función/arrow de nivel de bloque, contando llaves desde su declaración. Se usa para
   afirmar DÓNDE está una llamada —dentro del handler, fuera del updater—, que es la mitad de esta regla. */
export function cuerpoDe(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  let prof = 0,
    visto = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === "{") {
      prof++;
      visto = true;
    } else if (c === "}") {
      prof--;
      if (visto && prof === 0) return src.slice(i, j + 1);
    }
  }
  return null;
}

export function auditarRegla48(src) {
  const fallos = [];
  const can = canonico(src);

  // 1 · LA FUNCIÓN EXISTE Y ES DE NIVEL MÓDULO. Dentro de un componente no la puede llamar el handler
  //     de la firma ni probarla la suite: es el mismo motivo por el que `stageName` vive afuera.
  if (!/^function avisarCierreNegocio\(deal, excPend, pendVerif\) \{/m.test(src))
    fallos.push("no existe `function avisarCierreNegocio(deal, excPend, pendVerif)` de nivel módulo: el aviso del cierre tiene que ser llamable desde el handler de la firma y probable por la suite");
  if (!/^function codigosAprobadoresDe\(excPend, padron\) \{/m.test(src))
    fallos.push("no existe `function codigosAprobadoresDe(excPend, padron)` de nivel módulo: sin ella cada aviso vuelve a escribir su propio bucle de «quién firma esto», y el de `avisarPreEval` ya se había saltado los reemplazos");
  if (!/^function tramosDeExcepciones\(excPend, padron\) \{/m.test(src))
    fallos.push("no existe `function tramosDeExcepciones(excPend, padron)` de nivel módulo: es lo que hace que el aviso diga (área, nivel) y quién firma, en vez de un número suelto");

  // 2 · EL DEFECTO MEDIDO: `confirmarCierre` —la firma del cliente— tiene que avisar. Era la puerta
  //     AUTOMÁTICA a la mesa de otorgamiento y la única que no llamaba a nadie.
  const cc = cuerpoDe(src, "const confirmarCierre = (id, tasa, opts, usuario) => {");
  if (!cc) fallos.push("no encuentro `confirmarCierre`: es el handler de la firma del cliente y el sitio donde el negocio se cierra");
  else {
    if (!/\bavisarCierreNegocio\(/.test(cc))
      fallos.push("`confirmarCierre` no llama a `avisarCierreNegocio`: al firmar el cliente la operación entra sola a la mesa de otorgamiento y nadie se entera — es exactamente el defecto que esta regla cierra");
    // 3 · Y LA LLAMADA VA FUERA DEL UPDATER. `setDeals(fn)` no ejecuta `fn` en el acto y puede llamarlo
    //     más de una vez: un envío ahí adentro manda el aviso dos veces.
    const upd = cuerpoDe(cc, "const upd = (d) => {");
    if (upd && /\bavisarCierreNegocio\(|\bhiloEnviar\(|\bhiloNuevo\(/.test(upd))
      fallos.push("el aviso del cierre se manda DENTRO del updater de `setDeals`: React no lo ejecuta en el acto y puede llamarlo más de una vez, así que el mensaje sale duplicado");
    // 4 · Se evalúa el paquete FIRMADO, no el ofertado: las excepciones de una operación en cesión no
    //     son las mismas que las de la oferta, y es el veredicto firmado el que decide quién firma.
    if (!/const dCerrado = dealFirmado\(dFirma, montoFirmado\(dFirma, opts\)\);/.test(canonico(cc)))
      fallos.push("`confirmarCierre` no evalúa el paquete firmado con `dealFirmado`/`montoFirmado`: una segunda copia de esa expresión se desfasa de la que guarda el updater sin que nada lo diga");
  }

  // 5 · UNA SOLA EXPRESIÓN DEL PAQUETE FIRMADO, y el updater la usa.
  if (!/^const dealFirmado = \(deal, monto\) => \(\{ \.\.\.deal, monto, stage: "cesion", clienteAcepto: true, reabierta: undefined \}\);$/m.test(src))
    fallos.push("no existe `dealFirmado` de nivel módulo con la forma del paquete firmado: es el patrón de VER-01, dos cómputos del mismo hecho que se separan");
  if (!/const dFirmado = dealFirmado\(d, montoFinal\);/.test(can))
    fallos.push("el updater de `confirmarCierre` ya no arma el paquete firmado con `dealFirmado`: vuelve a haber dos copias de la misma expresión");

  // 6 · EL REMITENTE ES EL SISTEMA. La firma la hizo el CLIENTE en el portal, no el ejecutivo — y si el
  //     aviso saliera de parte de él, `hiloEnviar` se lo daría por leído justo a quien no le llegaba nada.
  const ac = cuerpoDe(src, "function avisarCierreNegocio(deal, excPend, pendVerif) {");
  if (ac) {
    if (!/hiloEnviar\(h, CODE_SISTEMA, texto, null\);/.test(canonico(ac)))
      fallos.push("el aviso del cierre no sale de `CODE_SISTEMA`: mandarlo de parte del ejecutivo le atribuye un mensaje que no escribió y se lo marca como leído, que es justo a quien no le llegaba nada");
    if (!/const ejec = deal\.exec && USERS\[deal\.exec\] \? deal\.exec : null;/.test(canonico(ac)))
      fallos.push("el aviso del cierre no incluye al ejecutivo de la operación: es la mitad de lo que se reportó («ni al ejecutivo»)");
    if (!/const dests = codigosAprobadoresDe\(excPend\);/.test(canonico(ac)))
      fallos.push("el aviso del cierre no resuelve sus destinatarios con `codigosAprobadoresDe`");
    if (!/if \(!dests\.length && !\(excPend \|\| \[\]\)\.length && !pendVerif\) return null;/.test(canonico(ac)))
      fallos.push("el aviso del cierre se manda aunque no quede nada que firmar ni que verificar: un mensaje «no tienes nada que hacer» en cada operación cursada limpia vacía la campana de significado");
    if (!/const prev = hilosDeDeal\(deal\.id\)\.find\(\(h\) => h\.asunto === asunto\);/.test(canonico(ac)))
      fallos.push("el aviso del cierre no reusa el hilo de la operación: volver a cerrarla abriría un hilo nuevo cada vez");
  }

  // 7 · EL SUPER-ADMIN NO ENTRA, y los destinatarios salen del PADRÓN (que ya aplica los reemplazos por
  //     vacaciones) y no de `ATRIB_USUARIO`, que es sólo quién existe.
  const ca = cuerpoDe(src, "function codigosAprobadoresDe(excPend, padron) {");
  if (ca) {
    if (!/!u\.superAdmin && puedeAprobarExc\(u\.code, regla, \(x && x\.nivel\) \|\| 4, pad\)/.test(canonico(ca)))
      fallos.push("`codigosAprobadoresDe` no excluye al super-administrador o no decide con `puedeAprobarExc`: el super-admin puede firmar todo, así que estaría en cada hilo del sistema");
    if (/\bATRIB_USUARIO\b/.test(ca))
      fallos.push("`codigosAprobadoresDe` recorre `ATRIB_USUARIO`: ése es el padrón de quién EXISTE y se salta los reemplazos por vacaciones (regla 19) — quien cubre a un ausente no recibiría el aviso");
    if (!/const pad = padron \|\| padronAprobadores\(\);/.test(canonico(ca)))
      fallos.push("`codigosAprobadoresDe` no acepta un padrón inyectado: sin eso no se puede probar contra un tenant plantado");
  }
  // …y el cartel de la bandeja vacía agrupa con `tramosDeExcepciones`, la misma que el aviso: si
  // agrupara por su cuenta, los dos textos que explican lo mismo podrían decir cosas distintas.
  if (!/const tramos = tramosDeExcepciones\(pendientes\);/.test(can))
    fallos.push("el cartel de la bandeja vacía de Otorgamientos no agrupa con `tramosDeExcepciones`: vuelve a tener su propio bucle y puede decir algo distinto del aviso del cierre");
  // …y `avisarPreEval` usa la MISMA función: dos bucles de «quién firma esto» divergen.
  const pe = cuerpoDe(src, "function avisarPreEval(deal, execCode) {");
  if (pe && !/const dests = codigosAprobadoresDe\(excPend\);/.test(canonico(pe)))
    fallos.push("`avisarPreEval` no resuelve sus destinatarios con `codigosAprobadoresDe`: vuelve a tener su propio bucle, que es el que se saltaba los reemplazos");

  // 8 · EL SISTEMA POSTEA, NO SE SUMA AL HILO. `participantes` son códigos de USUARIO: las pantallas los
  //     resuelven contra `USERS` y `hilosDeUsuario` filtra por ahí.
  if (!/if \(deCode !== CODE_SISTEMA && !h\.participantes\.includes\(deCode\)\) h\.participantes\.push\(deCode\);/.test(can))
    fallos.push("`hiloEnviar` vuelve a sumar al remitente sin mirar si es el sistema: `CODE_SISTEMA` no es un login y aparecería como «SIS» entre los participantes");
  if (!/const nombreEnHilo = \(code\) => USERS\[code\] \|\| \(code === CODE_SISTEMA \? NOMBRE_SISTEMA : code\);/.test(can))
    fallos.push("no existe `nombreEnHilo`: sin él la mensajería mostraría «SIS» como autor y la bitácora registraría «SIS» como usuario");
  if (!/deNombre: nombreEnHilo\(deCode\)/.test(can)) fallos.push("`hiloEnviar` no resuelve el nombre del remitente con `nombreEnHilo`");
  if (/const CODE_SISTEMA = "SIS";/.test(src) && /^\s*SIS:/m.test(src))
    fallos.push("`SIS` entró a `USERS`: sería un login sin persona, con selector de sesión y rol asignable");

  // 9 · EL PUENTE ENTRE PESTAÑAS. La firma vuelve del portal a la pestaña que lo abrió, y ésa puede ser
  //     la del DETALLE, que monta el `DealDrawer` y nada más: sin campana ni bandeja de mensajes.
  if (!/^function recibirHilo\(hilo\) \{/m.test(src))
    fallos.push("no existe `recibirHilo` de nivel módulo: el hilo nacido en la pestaña del detalle no cruzaría al tubo y el mensaje existiría sin que lo viera nadie");
  const rh = cuerpoDe(src, "function recibirHilo(hilo) {");
  if (rh && !/HILOS\.findIndex\(\(h\) => h\.dealId === hilo\.dealId && h\.asunto === hilo\.asunto\)/.test(canonico(rh)))
    fallos.push("`recibirHilo` identifica el hilo por otra cosa que (operación, asunto): `h.id` se numera con el largo de la lista LOCAL y colisiona entre pestañas");
  if (!/if \(hCierre && window\.opener\) window\.opener\.postMessage\(\{type: "nex-hilo", hilo: hCierre\}, ORIGEN_APP\);/.test(can))
    fallos.push("`confirmarCierre` no le avisa a la pestaña del tubo del hilo que acaba de crear: es el agujero que ya cerraron `nex-solicitud` y `nex-preeval`");
  if (!/if \(m && m\.type === "nex-hilo" && m\.hilo\) \{/.test(can)) fallos.push("el listener de mensajes no atiende `nex-hilo`: el aviso llegaría a una pestaña que lo descarta");

  return fallos;
}

test("48 · el cierre del negocio le escribe a los aprobadores y al ejecutivo, de parte del sistema y sin duplicarse", () => {
  assert.deepEqual(auditarRegla48(jsx), []);
});

const MUTANTES = {
  "el cierre deja de avisar": {
    src: jsx.replace(
      "      const hCierre = avisarCierreNegocio({ ...dCerrado, negocioNum: dFirma.negocioNum || negDe(dFirma) }, visC.excPend, verifResumenDeal(dCerrado).pend);",
      "      const hCierre = null;",
    ),
    re: /no llama a `avisarCierreNegocio`/,
  },
  "el aviso se manda dentro del updater": {
    src: jsx.replace("      const montoFinal = montoFirmado(d, opts);", "      avisarCierreNegocio(d, [], 0);\n      const montoFinal = montoFirmado(d, opts);"),
    re: /DENTRO del updater/,
  },
  "el remitente vuelve a ser el ejecutivo": { src: jsx.replace("hiloEnviar(h, CODE_SISTEMA, texto, null);", "hiloEnviar(h, deal.exec, texto, null);"), re: /no sale de `CODE_SISTEMA`/ },
  "el ejecutivo queda fuera": {
    src: jsx.replace("  const ejec = deal.exec && USERS[deal.exec] ? deal.exec : null;", "  const ejec = null;"),
    re: /no incluye al ejecutivo/,
  },
  "avisa aunque no quede nada que firmar": {
    src: jsx.replace("  if (!dests.length && !(excPend || []).length && !pendVerif) return null;", ""),
    re: /aunque no quede nada que firmar/,
  },
  // El anclaje lleva la línea de ARRIBA a propósito: `const prev = hilosDeDeal(…)` aparece idéntica en
  // tres avisos distintos y `String.replace` pisa la primera, que es la de `avisarPreEval` — la sonda
  // cambiaba el fuente (su propia aserción pasaba) y no tocaba lo que este gate mira.
  "cada cierre abre un hilo nuevo": {
    src: jsx.replace(
      "  const asunto = `Cierre de negocio · ${deal.id}`;\n  const prev = hilosDeDeal(deal.id).find((h) => h.asunto === asunto);",
      "  const asunto = `Cierre de negocio · ${deal.id}`;\n  const prev = null;",
    ),
    re: /no reusa el hilo/,
  },
  "el super-admin entra en cada hilo": {
    src: jsx.replace("      if (!u.superAdmin && puedeAprobarExc(u.code, regla, (x && x.nivel) || 4, pad)) codes.add(u.code);", "      if (puedeAprobarExc(u.code, regla, (x && x.nivel) || 4, pad)) codes.add(u.code);"),
    re: /no excluye al super-administrador/,
  },
  "los destinatarios vuelven a salir de ATRIB_USUARIO": {
    src: jsx.replace("    pad.usuarios.forEach((u) => {", "    Object.keys(ATRIB_USUARIO).forEach((u) => {"),
    re: /recorre `ATRIB_USUARIO`/,
  },
  "el cartel de la bandeja vacía agrupa por su cuenta": {
    src: jsx.replace("            const tramos = tramosDeExcepciones(pendientes);", "            const tramos = [];"),
    re: /no agrupa con `tramosDeExcepciones`/,
  },
  "avisarPreEval se rearma su propio bucle": {
    src: jsx.replace("  const dests = codigosAprobadoresDe(excPend);\n  const asunto = `Pre-evaluación de otorgamiento", "  const dests = Object.keys(ATRIB_USUARIO);\n  const asunto = `Pre-evaluación de otorgamiento"),
    re: /`avisarPreEval` no resuelve sus destinatarios/,
  },
  "el sistema se suma a los participantes": {
    src: jsx.replace("  if (deCode !== CODE_SISTEMA && !h.participantes.includes(deCode)) h.participantes.push(deCode);", "  if (!h.participantes.includes(deCode)) h.participantes.push(deCode);"),
    re: /vuelve a sumar al remitente/,
  },
  "el autor del mensaje se muestra en crudo": { src: jsx.replace("deNombre: nombreEnHilo(deCode),", "deNombre: USERS[deCode] || deCode,"), re: /no resuelve el nombre del remitente/ },
  "SIS entra al catálogo de usuarios": { src: jsx.replace('  IB: "Tomás Alcaíno · Ejecutivo de Inbound",', '  IB: "Tomás Alcaíno · Ejecutivo de Inbound",\n  SIS: "Sistema",'), re: /entró a `USERS`/ },
  "el hilo no cruza a la pestaña del tubo": {
    src: jsx.replace('if (hCierre && window.opener) window.opener.postMessage({ type: "nex-hilo", hilo: hCierre }, ORIGEN_APP);', "/* nada */"),
    re: /no le avisa a la pestaña del tubo/,
  },
  "el tubo descarta el hilo que recibe": { src: jsx.replace('if (m && m.type === "nex-hilo" && m.hilo) {', "if (false) {"), re: /no atiende `nex-hilo`/ },
  "el hilo recibido se identifica por su id local": {
    src: jsx.replace("  const i = HILOS.findIndex((h) => h.dealId === hilo.dealId && h.asunto === hilo.asunto);", "  const i = HILOS.findIndex((h) => h.id === hilo.id);"),
    re: /identifica el hilo por otra cosa/,
  },
  "el paquete firmado se vuelve a escribir a mano": {
    src: jsx.replace("      const dFirmado = dealFirmado(d, montoFinal);", '      const dFirmado = { ...d, monto: montoFinal, stage: "cesion", clienteAcepto: true, reabierta: undefined };'),
    re: /ya no arma el paquete firmado con `dealFirmado`/,
  },
  "el aviso se arma sobre el paquete ofertado": {
    src: jsx.replace("      const dCerrado = dealFirmado(dFirma, montoFirmado(dFirma, opts));", "      const dCerrado = dFirma;"),
    re: /no evalúa el paquete firmado/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`48 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla48(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
