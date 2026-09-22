/* Gate de contrato de la regla 57: la nota de una verificación es RICA y acepta una captura pegada.
   Dos mitades. La de TEXTO fija la forma de las piezas que no se ven correr —la captura entra como
   adjunto, el texto se pega plano, el `innerHTML` sólo se escribe si difiere—; la de COMPORTAMIENTO
   EXTRAE del fuente `notaTextoPlano` y `notaSegura` y los EJECUTA acá, porque un saneador que se queda
   corto pasa cualquier regex y sólo se nota con el HTML adentro. `notaSegura` usa el DOM, así que se le
   inyecta uno mínimo: lo que se prueba es su política, no el parser del navegador. Con sondas. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";
import { cuerpoDe } from "./regla_53.test.mjs";

const jsx = leer("pipeline_comercial.jsx");

export function auditarRegla57(src) {
  const fallos = [];
  for (const [re, msg] of [
    [/function NotaRica\(\{ valor, onCambio, onImagen, placeholder, minHeight = 72, escala = "t10" \}\)/, "no existe `NotaRica`: la nota de una verificación es un editor, no un textarea"],
    [/if \(el && String\(valor \|\| ""\) !== el\.innerHTML\) el\.innerHTML = String\(valor \|\| ""\);/, "el `innerHTML` se reescribe sin comparar: mueve el cursor al principio y la nota se digita al revés — no lo caza ningún gate, sólo se ve tecleando"],
    [/document\.execCommand\("insertText", false, \(ev\.clipboardData && ev\.clipboardData\.getData\("text\/plain"\)\) \|\| ""\);/, "el texto dejó de pegarse PLANO: copiar de un correo arrastra su hoja de estilos"],
    [/const img = items\.find\(\(x\) => x\.kind === "file" && \/\^image\\\/\/\.test\(x\.type \|\| ""\)\);/, "el editor no reconoce una imagen en el portapapeles: pegar la captura es el punto de toda la regla"],
    [/function guardarImagenPegada\(dataUrl, nombre\)/, "no existe `guardarImagenPegada`: la captura tiene que bajar al disco, no sólo quedar en la nota"],
    [/a\.download = nombre;/, "la captura no se escribe al sistema de archivos: sin servidor, la carpeta de descargas es el único al que este HTML puede escribir"],
    [/if \(meta\) setArchs\(\(l\) => \[\.\.\.l, meta\]\);/, "la captura pegada no entra como ADJUNTO: aguas abajo el respaldo no distingue de dónde vino el archivo, y además es lo que habilita el botón sin declarar «no hay respaldo»"],
    [/function notaSegura\(html\)/, "no existe `notaSegura`: lo que se guarda se vuelve a pintar como HTML y se le muestra a quien audita un giro"],
    [/function NotaLeida\(\{ html, className = "t10" \}\)/, "no existe `NotaLeida`: sanear en un solo sitio es lo que impide que el segundo lector lo olvide"],
    [/dangerouslySetInnerHTML=\{\{ __html: notaSegura\(html\) \}\}/, "la nota se pinta sin sanear"],
    [/const entrada = document\.createElement\("template"\);/, "el saneador no usa un `<template>`: es el único contenedor inerte —no carga recursos ni dispara `onerror` mientras se lo recorre—"],
  ]) {
    if (!re.test(src)) fallos.push(msg);
  }
  // La bitácora guarda TEXTO, no marcado: ninguna glosa puede interpolar una nota cruda. Se busca la
  // INTERPOLACIÓN en todo el fuente y no dentro de `glosa: \`…\``, porque esas glosas llevan templates
  // anidados: un `[^\`]*` se corta en el primer backtick interior y nunca llega a la nota.
  if (/\$\{(?:reg|datos|gestion|llamada)\.notas?\}/.test(src))
    fallos.push("una glosa interpola la nota CRUDA: un `<div>` adentro no se lee y una captura en base64 son cien mil caracteres en una fila de log");
  return fallos;
}

/* Extrae una función de nivel módulo del fuente y la compila sola, con el entorno que pida. */
function compilar(src, nombre, entorno = {}) {
  const cuerpo = cuerpoDe(src, nombre);
  assert.ok(cuerpo, `no encuentro \`${nombre}\``);
  const claves = Object.keys(entorno);
  return new Function(...claves, `${cuerpo}\n;return ${nombre};`)(...claves.map((k) => entorno[k]));
}

/* DOM mínimo para `notaSegura`: nodos con la API que usa, y nada más. Lo que se prueba acá es la
   POLÍTICA de la lista blanca, no el parser — por eso el `innerHTML` de entrada se parsea con una
   expresión regular de juguete que acepta lo que un portapapeles pega. */
function domDeJuguete() {
  const TEXTO = 3, ELEM = 1;
  const nodo = (tag) => ({
    nodeType: ELEM,
    tagName: tag.toUpperCase(),
    childNodes: [],
    attrs: {},
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
    setAttribute(n, v) { this.attrs[n] = String(v); },
    appendChild(h) { this.childNodes.push(h); return h; },
    get innerHTML() { return this.childNodes.map(serie).join(""); },
    set innerHTML(html) { this.childNodes = parsear(html); },
  });
  const texto = (v) => ({ nodeType: TEXTO, nodeValue: v });
  const serie = (n) =>
    n.nodeType === TEXTO
      ? n.nodeValue
      : `<${n.tagName.toLowerCase()}${Object.entries(n.attrs).map(([k, v]) => ` ${k}="${v}"`).join("")}>${n.childNodes.map(serie).join("")}</${n.tagName.toLowerCase()}>`;
  function parsear(html) {
    const salida = [];
    const pila = [{ childNodes: salida }];
    const re = /<\/?([a-zA-Z][\w-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*\/?>|([^<]+)/g;
    for (const m of String(html).matchAll(re)) {
      const tope = pila[pila.length - 1];
      if (m[3] != null) { tope.childNodes.push(texto(m[3])); continue; }
      if (m[0].startsWith("</")) { if (pila.length > 1) pila.pop(); continue; }
      const e = nodo(m[1]);
      for (const a of (m[2] || "").matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) e.setAttribute(a[1], a[2]);
      tope.childNodes.push(e);
      if (!/^(br|img|input|hr)$/i.test(m[1]) && !m[0].endsWith("/>")) pila.push(e);
    }
    return salida;
  }
  const plantilla = () => { const t = nodo("template"); t.content = nodo("fragmento"); Object.defineProperty(t, "innerHTML", {
    get() { return this.content.childNodes.map(serie).join(""); },
    set(h) { this.content.childNodes = parsear(h); },
  }); return t; };
  return { createElement: (t) => (t === "template" ? plantilla() : nodo(t)), createTextNode: texto };
}

test("57 · el editor de notas: captura pegada al disco y como adjunto, texto plano, y lo guardado se pinta saneado", () => {
  assert.deepEqual(auditarRegla57(jsx), []);
});

test("57 · comportamiento: `notaTextoPlano` deja texto legible y nombra la imagen", () => {
  const f = compilar(jsx, "notaTextoPlano");
  assert.equal(f('<div>Hablé con <b>Ana</b></div><img src="data:image/png;base64,AAAA" alt="captura-1.png" />'), "Hablé con Ana [imagen: captura-1.png]");
  assert.equal(f("<p>uno</p><p>dos</p>"), "uno dos");
  assert.equal(f(""), "");
  assert.equal(f("<div><br></div>"), "");
  assert.ok(!/base64/.test(f('<img src="data:image/png;base64,QUJD" />')), "la glosa no puede llevar el base64 de la captura");
});

test("57 · comportamiento: `notaSegura` deja pasar lo del editor y descarta todo lo demás", () => {
  const f = compilar(jsx, "notaSegura", { document: domDeJuguete(), NOTA_TAGS_OK: ["B", "STRONG", "I", "EM", "U", "BR", "UL", "OL", "LI", "DIV", "P", "SPAN", "IMG"] });
  const ok = f('<b>ok</b><ul><li>uno</li></ul><img src="data:image/png;base64,QUJD" alt="c.png" class="nota-img"></img>');
  assert.ok(/<b>ok<\/b>/.test(ok) && /<li>uno<\/li>/.test(ok), `se perdió marcado legítimo: ${ok}`);
  assert.ok(/src="data:image\/png;base64,QUJD"/.test(ok), `se perdió la captura embebida: ${ok}`);
  const sucio = f('<script>alert(1)</script><img src="https://ajeno.cl/x.png"><b onclick="robar()" style="color:red">texto</b><a href="javascript:x">link</a>');
  assert.ok(!/script|onclick|style=|href|ajeno\.cl/i.test(sucio), `el saneador dejó pasar algo: ${sucio}`);
  assert.ok(/texto/.test(sucio) && /link/.test(sucio), `desenvolver tenía que conservar el texto: ${sucio}`);
});

const MUTANTES = {
  "la captura deja de bajar al disco": { src: jsx.replace("  a.download = nombre;", "  a.title = nombre;"), re: /no se escribe al sistema de archivos/ },
  "la captura deja de entrar como adjunto": { src: jsx.replace("    if (meta) setArchs((l) => [...l, meta]);", "    if (meta) return meta;"), re: /no entra como ADJUNTO/ },
  "la nota se pinta sin sanear": { src: jsx.replace("dangerouslySetInnerHTML={{ __html: notaSegura(html) }}", "dangerouslySetInnerHTML={{ __html: html }}"), re: /se pinta sin sanear/ },
  "el innerHTML se reescribe siempre": {
    src: jsx.replace('    if (el && String(valor || "") !== el.innerHTML) el.innerHTML = String(valor || "");', '    if (el) el.innerHTML = String(valor || "");'),
    re: /se reescribe sin comparar/,
  },
  "la glosa vuelve a interpolar la nota cruda": {
    src: jsx.replace(/\$\{notaTextoPlano\(reg\.notas\) \? ` \u00b7 \$\{notaTextoPlano\(reg\.notas\)\}` : ""\}/, "${reg.notas}"),
    re: /interpola la nota CRUDA/,
  },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`57 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla57(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
