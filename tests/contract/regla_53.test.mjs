/* Gate de contrato de la regla 53 (la mesa de verificación: OPERACIÓN → deudor colapsable → FACTURA)
   sobre el TEXTO del fuente. Los tres niveles y el panel lateral entraron el 22-09-2026 a pedido del
   usuario; lo que NO cambió es el modelo, y por eso el bloque 1 sigue intacto.
   La suite prueba el MODELO con el caso 157 —`docs` por documento, la
   retirada que sigue en la mesa, el respaldo que no se contagia—; acá se fija la FORMA de la pantalla y
   del repositorio, que es lo que un refactor rompe sin que ningún motor se entere: que las vetadas se
   sumen a la lista, que exista el respaldo por factura, que las acciones por documento muevan el tick
   —si no, el KPI no se entera de lo que acaba de marcarse— y que las causas sigan siendo del deudor.
   Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Cuerpo de una flecha `const X = async (...) => { ... };` indentada: de su declaración al primer
   `\n  };` a esa misma indentación. Hace falta porque un comodín `[\s\S]{0,N}` se cuela a la
   función SIGUIENTE —la sonda de «marcar deja de refrescar» lo demostró: el `force` de `guardarResp`
   hacía pasar el patrón de `marcarDoc` con el suyo ya borrado—. */
export function cuerpoFlecha(src, nombre) {
  const m = src.match(new RegExp(`\\n(\\s*)const ${nombre} = async \\([^)]*\\) => \\{\\n`));
  if (!m) return null;
  const ini = m.index + 1;
  const cierre = src.indexOf("\n" + m[1] + "};", ini);
  return cierre < 0 ? src.slice(ini) : src.slice(ini, cierre);
}

export function cuerpoDe(src, nombre) {
  const m = src.match(new RegExp(`^function ${nombre}\\b[^\\n]*\\n`, "m"));
  if (!m) return null;
  const resto = src.slice(m.index + m[0].length);
  const fin = resto.search(/^(?:function|const|let|var|export) /m);
  return src.slice(m.index, fin < 0 ? undefined : m.index + m[0].length + fin);
}

export function auditarRegla53(src) {
  const fallos = [];
  // 1 · El MODELO: `filasVerificacion` arma un documento por factura, con las vetadas adentro.
  const c = cuerpoDe(src, "filasVerificacion");
  if (!c) { fallos.push("no existe `function filasVerificacion`"); return fallos; }
  if (!/const docs = \[\.\.\.suyas, \.\.\.g\.fuera\]\.map\(/.test(c))
    fallos.push("`filasVerificacion` no arma `docs` con las de la oferta Y las vetadas: retirar una factura la saca de `facturasOp`, así que la evidencia de «ésta no la confirmó» desaparecía de la pantalla");
  if (!/estado: docEstado\(f\)/.test(c) || !/tel\[f\.id\] \? "verificada" : "pendiente"/.test(c))
    fallos.push("cada documento no trae su propio estado: la unidad de trabajo es la factura");
  if (!/respaldo: resp\[f\.id\] \|\| null/.test(c))
    fallos.push("el documento no trae su respaldo: la nota y el archivo son de la factura, no del deudor");
  if (!/estado: docs\.some\(\(x\) => x\.estado === "pendiente"\) \? "pendiente"/.test(c))
    fallos.push("el estado del DEUDOR no se deriva de sus documentos: con uno pendiente la fila tiene que seguir pendiente, que es lo que falta hacer");
  if (!/const resp = \(estado && estado\.respaldo && estado\.respaldo\[d\.id\]\)/.test(c))
    fallos.push("el respaldo no entra por parámetro: es evidencia del servidor, como el resto del commit de verificación");
  // 2 · El REPOSITORIO del respaldo existe y guarda la REFERENCIA del archivo, no los bytes.
  if (!/const repoVerifRespaldo = crearRepo\("verificacion_respaldo"\);/.test(src))
    fallos.push("no existe el repositorio `verificacion_respaldo`: sin él la nota y el adjunto no sobreviven a la pantalla");
  if (!/nombre: x\.name, tipo: x\.type \|\| "", tam: x\.size \|\| 0/.test(src))
    fallos.push("el adjunto no guarda la REFERENCIA del archivo (nombre, tipo, tamaño): los bytes viven en el gestor documental, no acá");
  if (!/const nombresArch = \(l\) => \(l \|\| \[\]\)\.map\(\(a\) => \(a && a\.nombre\) \|\| String\(a \|\| ""\)\)\.filter\(Boolean\);/.test(src))
    fallos.push("no existe `nombresArch`: cuatro registradores distintos escriben la misma lista de respaldos en la bitácora y con cuatro copias se separan a la primera corrección");
  // 3 · LA PANTALLA: TRES niveles (operación → deudor → factura), las dos decisiones por el panel
  // lateral, y el tick que las hace visibles.
  for (const [re, msg] of [
    [/const ops = useMemo\(/, "la mesa dejó de agrupar por operación: el verificador llama POR OPERACIÓN —es lo que frena un giro— y una lista de deudores sueltos lo obliga a reconstruir a cuál pertenece cada fila"],
    [/o = \{ op: f\.op, deal: f\.deal, cliente: f\.cliente, filas: \[\] \};/, "el nivel de la operación no lleva su deal: sin él no hay número, ni fecha, ni forma de abrirla"],
    [/Oportunidad del \{fechaOportunidad\(o\.deal\)\}/, "la card de la operación no dice su fecha"],
    [/\{chipsVerif\(o\.cuenta\)\}/, "la operación no muestra su estado de verificación global"],
    [/\{chipsVerif\(cuenta\)\}/, "el deudor no lleva sus contadores al costado de la razón social"],
    [/setAbiertoDeu\(\(m\) => \(\{ \.\.\.m, \[f\.id\]: !abrirDeu \}\)\)/, "la card del deudor dejó de ser colapsable: las facturas se despliegan al abrirla"],
    [/\{doc\.estado === "pendiente" && puedeMarcar && botonesDoc\(f, \[doc\], true\)\}/, "la factura pendiente no ofrece «Verificar» / «No verificar»"],
    [/setPanel\(\{ fila: f, docs, modo: "verificar" \}\)/, "«Verificar» no abre el panel lateral: la información de la llamada no tendría dónde entrar"],
    [/setPanel\(\{ fila: f, docs, modo: "no_verificar" \}\)/, "«No verificar» no abre el panel lateral: retirar plata de una operación viva volvería a resolverse con un sí/no, sin motivo ni respaldo"],
    [/function DrawerVerificacion\(\{ fila, docs, modo, onCerrar, onConfirmar \}\)/, "no existe `DrawerVerificacion`: el registro es lateral y sirve para las dos decisiones"],
    [/className="fixed inset-0 z-50 flex justify-end ovl"/, "el registro dejó de ser lateral: un modal centrado tapa la lista que se está mirando al registrar"],
    [/\.filter\(\(x\) => x\[2\] > 0\)/, "un contador en CERO vuelve a dibujarse: «Pendientes 0» es lo que el usuario pidió esconder, y tres chips donde dos dicen cero esconden al único que había que leer"],
    [/\{f\.causas\.length > 0 && \(/, "la fila de causas se dibuja aunque no haya ninguna: «0 causas» es ruido con la tipografía de un título"],
  ]) {
    if (!re.test(src)) fallos.push(msg);
  }
  // 3-bis · El panel escribe el respaldo en CADA documento de su alcance: la evidencia se recupera
  // desde el folio, que es por donde se pregunta cuando alguien audita un giro.
  const ap = cuerpoFlecha(src, "aplicarPanel");
  if (!ap) fallos.push("no existe `aplicarPanel`");
  else {
    if (!/for \(const d of datos\.docs \|\| \[\]\) await guardarResp\(f, d, respaldo\);/.test(ap))
      fallos.push("el panel no guarda el respaldo en cada documento de su alcance: la nota y las capturas quedarían fuera del folio");
    if (!/const todos = pend\.length > 0 && pend\.every\(\(x\) => ids\.has\(x\.id\)\);/.test(ap))
      fallos.push("el panel no distingue el alcance: cubrir TODO lo pendiente del deudor usa su escritor —que además congela el veredicto— y un folio suelto no");
  }
  // Y el tick: marcar y anotar escriben en un repositorio y no en `deals`, así que la lista memoizada
  // por `[deals, tick]` no se entera sola. Se mira el cuerpo EXACTO de cada flecha, no un comodín.
  for (const [fn, msg] of [
    ["marcarDoc", "`marcarDoc` no mueve el tick: marcar escribe en un repositorio y no en `deals`, así que la lista memoizada no se entera y el KPI no se mueve"],
    ["guardarResp", "`guardarResp` no mueve el tick: la nota se guarda y la fila no lo muestra"],
  ]) {
    const cuerpo = cuerpoFlecha(src, fn);
    if (!cuerpo) fallos.push(`no existe \`${fn}\``);
    else if (!/force\(\(v\) => v \+ 1\);/.test(cuerpo)) fallos.push(msg);
  }
  // 4 · LAS CAUSAS SIGUEN SIENDO DEL DEUDOR (regla 6): en la cabecera del grupo, no en cada documento.
  if (!/\{f\.causas\.length === 1 \? "Causa que gatilló la verificación" : `\$\{f\.causas\.length\} causas que gatillaron la verificación`\}/.test(src))
    fallos.push("las causas dejaron la cabecera del grupo: son del deudor —una llamada las confirma todas— y repetirlas por documento dice que cada factura tiene las suyas");
  // 5 · La llamada del deudor cubre sólo lo PENDIENTE.
  if (!/const soloPendientes = \(f\) => \(\{ \.\.\.f, facturas: \(f\.docs \|\| \[\]\)\.filter\(\(x\) => x\.estado === "pendiente"\)\.map\(\(x\) => x\.f\) \}\);/.test(src))
    fallos.push("el «Verificar» del deudor no se acota a lo pendiente: retiraría o re-registraría documentos ya resueltos de a uno");
  return fallos;
}

test("53 · la mesa va por operación → deudor → factura: estado y respaldo por documento, las vetadas adentro y las dos decisiones por el panel lateral", () => {
  assert.deepEqual(auditarRegla53(jsx), []);
});

const MUTANTES = {
  "las vetadas vuelven a desaparecer": {
    src: jsx.replace("      const docs = [...suyas, ...g.fuera].map(", "      const docs = [...suyas].map("),
    re: /no arma `docs` con las de la oferta Y las vetadas/,
  },
  "el documento pierde su respaldo": {
    src: jsx.replace("        respaldo: resp[f.id] || null,", "        respaldo: null,"),
    re: /no trae su respaldo/,
  },
  "el respaldo se lee del navegador": {
    src: jsx.replace('    const resp = (estado && estado.respaldo && estado.respaldo[d.id]) || (typeof VERIF_RESPALDO !== "undefined" && VERIF_RESPALDO[d.id]) || {};',
                     '    const resp = (typeof VERIF_RESPALDO !== "undefined" && VERIF_RESPALDO[d.id]) || {};'),
    re: /no entra por parámetro/,
  },
  "marcar deja de refrescar la mesa": {
    src: jsx.replace(`  const marcarDoc = async (f, doc, est, llamada) => {
    if (onMarcarFactura) await onMarcarFactura(f, doc, est, llamada);
    force((v) => v + 1);
  };`, `  const marcarDoc = async (f, doc, est, llamada) => {
    if (onMarcarFactura) await onMarcarFactura(f, doc, est, llamada);
  };`),
    re: /`marcarDoc` no mueve el tick/,
  },
  "guardar el respaldo deja de refrescar": {
    src: jsx.replace(`  const guardarResp = async (f, doc, datos) => {
    if (onRespaldo) await onRespaldo(f, doc, datos);
    force((v) => v + 1);
  };`, `  const guardarResp = async (f, doc, datos) => {
    if (onRespaldo) await onRespaldo(f, doc, datos);
  };`),
    re: /`guardarResp` no mueve el tick/,
  },
  "«No verificar» deja de abrir el panel": {
    src: jsx.replace('onClick={() => setPanel({ fila: f, docs, modo: "no_verificar" })}', 'onClick={() => marcarDoc(f, docs[0], "no_verificada")}'),
    re: /no abre el panel lateral/,
  },
  "un contador en cero vuelve a dibujarse": {
    src: jsx.replace("      .filter((x) => x[2] > 0)", "      .filter(() => true)"),
    re: /en CERO vuelve a dibujarse/,
  },
  "la mesa vuelve a listar deudores sueltos": {
    src: jsx.replace("  const ops = useMemo(", "  const opsViejo = useMemo("),
    re: /dejó de agrupar por operación/,
  },
  "la fila de causas se dibuja vacía": {
    src: jsx.replace("                        {f.causas.length > 0 && (", "                        {true && ("),
    re: /aunque no haya ninguna/,
  },
  "el respaldo del panel no baja al folio": {
    src: jsx.replace("    for (const d of datos.docs || []) await guardarResp(f, d, respaldo);", "    await guardarResp(f, datos.docs[0], respaldo);"),
    re: /no guarda el respaldo en cada documento/,
  },
  "el adjunto se guarda como un nombre suelto": {
    src: jsx.replace("{ nombre: x.name, tipo: x.type || \"\", tam: x.size || 0 }", "x.name"),
    re: /no guarda la REFERENCIA del archivo/,
  },
  "la llamada del deudor vuelve a cubrirlo todo": {
    src: jsx.replace('const soloPendientes = (f) => ({ ...f, facturas: (f.docs || []).filter((x) => x.estado === "pendiente").map((x) => x.f) });',
                     "const soloPendientes = (f) => f;"),
    re: /no se acota a lo pendiente/,
  },
  "el deudor se da por verificado con documentos pendientes": {
    src: jsx.replace('        estado: docs.some((x) => x.estado === "pendiente") ? "pendiente" : docs.some((x) => x.estado === "no_verificada") ? "no_verificada" : "verificada",',
                     '        estado: docs.some((x) => x.estado === "no_verificada") ? "no_verificada" : "verificada",'),
    re: /no se deriva de sus documentos/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`53 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla53(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
