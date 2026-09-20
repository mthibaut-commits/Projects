/* Gate de contrato de la regla 40 (la Bandeja Inbound es una ventana con tope, y lo que el tope bota se
   dice), sobre el TEXTO del fuente: el recorte vive dentro de un `setStreamFeed` en `PipelineComercial`,
   así que ni la suite ni los auditores lo ven. Fija lo que se decidió: que la perilla se llame por lo que
   hace, que su default alcance para al menos un lote de ingesta —ése era el defecto—, que el recorte
   cuente lo que saca y que la bandeja y el tab lo digan. Con sonda negativa para cada pieza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer, canonico } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");

/* Los defaults de la configuración operativa del tenant, leídos del literal `CFG_OPER_BASE`. */
export function cfgBase(src) {
  const m = src.match(/const CFG_OPER_BASE = \{([\s\S]*?)\n\};/);
  if (!m) return null;
  const num = (k) => { const x = m[1].match(new RegExp(`\\b${k}:\\s*(\\d+)`)); return x ? +x[1] : null; };
  return { topeBandeja: num("topeBandeja"), loteStream: num("loteStream"), tieneViejo: /\btopeDocsCorrida\b/.test(m[1]) };
}

export function auditarRegla40(src) {
  const fallos = [];
  // Prettier abre las llamadas largas en varias líneas y agrega la coma final (ADR-0006): lo que estos
  // patrones fijan es el COMPORTAMIENTO, no el formato, así que se miden sobre `canonico`.
  const can = canonico(src);
  const cfg = cfgBase(src);
  if (!cfg) { fallos.push("no encuentro el literal `CFG_OPER_BASE`"); return fallos; }
  // 1 · La perilla se llama por lo que hace, y su viejo nombre no vuelve.
  if (cfg.topeBandeja == null) fallos.push("`CFG_OPER_BASE` no declara `topeBandeja`: la perilla del tamaño de la bandeja tiene que llamarse por lo que hace");
  if (cfg.tieneViejo) fallos.push("vuelve `topeDocsCorrida`: ese nombre decía «tope por corrida» y era el TAMAÑO DE LA BANDEJA, que es lo que dejó pasar un default de 60 contra lotes de 250");
  // 2 · EL DEFECTO MEDIDO: la bandeja tiene que aguantar al menos un lote de ingesta, o bota en cada lote.
  if (cfg.topeBandeja != null && cfg.loteStream != null && cfg.topeBandeja < cfg.loteStream)
    fallos.push(`la bandeja (${cfg.topeBandeja}) no alcanza a guardar un lote de ingesta (${cfg.loteStream}): recorta en CADA lote, que es exactamente el defecto que esta regla cierra`);
  // 3 · Renombrar una clave de configuración sube el esquema (lo dice `cargarCfgOper`).
  const esq = src.match(/cfgOper: (\d+),/);
  if (!esq || +esq[1] < 2) fallos.push("`SCHEMA_VERSION.cfgOper` sigue en 1: renombrar una clave de configuración sube el esquema");
  // 4 · LA POLÍTICA: sale primero lo que NO es de nadie. Es la decisión de la regla y lo que hace que
  //     el contador deje de bajar solo; el `esCliente` en el primer barrido es lo que la implementa.
  const rb = src.match(/^function recortarBandeja\(lista, tope\) \{[\s\S]*?\n\}/m);
  if (!rb) fallos.push("no existe `function recortarBandeja(lista, tope)` de nivel módulo: la política de recorte tiene que ser pura para poder probarla");
  else {
    if (!/for \(let i = arr\.length - 1; i >= 0 && fuera\.size < sobra; i--\) if \(!arr\[i\]\.esCliente\) fuera\.add/.test(rb[0]))
      fallos.push("el recorte no bota PRIMERO lo que no tiene dueño: sin eso una corrida barre las facturas de la cartera, que es el defecto que esta regla cierra");
    if (!/fueraConDueno/.test(rb[0])) fallos.push("el recorte no cuenta aparte las de la cartera que tuvo que botar: es la cifra que el aviso muestra en rojo");
    if (!/arr\.filter\(\(e\) => !fuera\.has\(e\.id\)\)/.test(rb[0])) fallos.push("el recorte no conserva el orden de llegada de las que quedan");
    for (const glob of ["streamFeed", "usuario", "cfgT"]) if (new RegExp(`\\b${glob}\\b`).test(rb[0])) fallos.push(`recortarBandeja lee \`${glob}\`: la política decide con la lista y el tope, nada más`);
  }
  // 5 · Y lo que sale se CUENTA y se registra.
  if (!/setBandejaRecortadas\(\(n\) => \({total: n\.total \+ r\.fuera, conDueno: n\.conDueno \+ r\.fueraConDueno}\)\)/.test(can)) fallos.push("el recorte de la bandeja no cuenta lo que saca: sin contarlo no hay cómo decirlo");
  if (!/logSys\("warn", "inbound", `La Bandeja Inbound llegó a su tope/.test(can)) fallos.push("el recorte no deja rastro en el log del sistema");
  if (!/const r = recortarBandeja\(junto, STREAM_TOPE\);/.test(can)) fallos.push("el stream ya no usa `recortarBandeja`: la política quedaría duplicada y podrían divergir");
  // 5 · Y SE DICE: en la bandeja y en el tooltip del tab, que es donde se vio el número moverse.
  if (!/\{recortadas\.total > 0 && \(/.test(src)) fallos.push("la Bandeja Inbound no muestra cuántas facturas salieron por el tope");
  if (!/<b>\{recortadas\.conDueno\.toLocaleString\("es-CL"\)\} de ellas de clientes de la cartera<\/b>/.test(src)) fallos.push("el aviso no distingue las de la cartera: son las únicas que alguien estaba esperando");
  if (!/salieron de la bandeja por el tope/.test(src)) fallos.push("el aviso de la bandeja no dice que las facturas SALIERON por el tope");
  if (!/tip: `Clientes con facturas sin clasificar que hay AHORA en la Bandeja Inbound/.test(src)) fallos.push("el tab «Otras Empresas» no explica en su tooltip que es una VENTANA: sin eso, verlo subir y bajar no tiene explicación en pantalla");
  if (!/title=\{f\.tip \|\| "Filtrar oportunidades"\}/.test(src)) fallos.push("los tabs del tubo no dibujan el tooltip propio de cada uno");
  // 6 · EL CONTADOR CUENTA LAS FILAS QUE LA TABLA DIBUJA. Las dos salen de la misma función pura, o
  //     vuelven a contradecirse: medido, el tab decía 262 sobre una tabla de 307.
  if (!/^function agruparInboundPorCliente\(eventos, asignar\) \{/m.test(src)) fallos.push("no existe `agruparInboundPorCliente` de nivel módulo: el contador y la lista tienen que salir de la misma función");
  if (!/const inboundFilas = useMemo\(\(\) => \(showInbound \? agruparInboundPorCliente\(streamFeed, asignarEjecutivo\)\.length : 0\)/.test(can)) fallos.push("el contador de «Todos» no cuenta las filas agrupadas: contar facturas dice 262 sobre una tabla de 307");
  if (!/count: directorio \? 0 : inboundMiasFilas/.test(src)) fallos.push("el contador de «Otras Empresas» no cuenta las filas agrupadas que su pestaña dibuja");
  if (!/streamAgrupadoCliente = \(soloMias = true\) => agruparInboundPorCliente\(/.test(can)) fallos.push("la lista de la tabla ya no usa `agruparInboundPorCliente`: contador y lista podrían divergir");
  if (/streamComoFilas/.test(src)) fallos.push("vuelve `streamComoFilas`: apilaba una fila POR FACTURA en «Todos» mientras la pestaña agrupaba por cliente — la misma información en dos formas");
  // 7 · El reset de la simulación deja el contador en cero: si no, arrastra el de la corrida anterior.
  if (!/setStreamFeed\(\[\]\); setBandejaRecortadas\({total: 0, conDueno: 0}\);/.test(can)) fallos.push("reiniciar la simulación no pone en cero lo recortado: arrastraría la cuenta de la corrida anterior");
  return fallos;
}

test("40 · la bandeja tiene tope con nombre honesto, alcanza para un lote, y lo que bota lo cuenta y lo dice", () => {
  assert.deepEqual(auditarRegla40(jsx), []);
});

const MUTANTES = {
  "vuelve el nombre viejo de la perilla": { src: jsx.replace("  topeBandeja: 500,", "  topeDocsCorrida: 500,"), re: /vuelve `topeDocsCorrida`|no declara `topeBandeja`/ },
  "la bandeja no aguanta un lote": { src: jsx.replace("  topeBandeja: 500,", "  topeBandeja: 60,"), re: /no alcanza a guardar un lote de ingesta/ },
  "renombrar sin subir el esquema": { src: jsx.replace("  cfgOper: 2,", "  cfgOper: 1,"), re: /sigue en 1/ },
  "el recorte deja de contar": { src: jsx.replace("setBandejaRecortadas((n) => ({ total: n.total + r.fuera, conDueno: n.conDueno + r.fueraConDueno }));", ""), re: /no cuenta lo que saca/ },
  "el recorte vuelve a botar sin mirar de quién es": { src: jsx.replace("  for (let i = arr.length - 1; i >= 0 && fuera.size < sobra; i--) if (!arr[i].esCliente) fuera.add(arr[i].id);\n", ""), re: /no bota PRIMERO lo que no tiene dueño/ },
  "la política mira el estado de la app": { src: jsx.replace("function recortarBandeja(lista, tope) {\n  const arr = lista || [];", "function recortarBandeja(lista, tope) {\n  const arr = lista || streamFeed;"), re: /recortarBandeja lee `streamFeed`/ },
  "el aviso no distingue la cartera": { src: jsx.replace('<b>{recortadas.conDueno.toLocaleString("es-CL")} de ellas de clientes de la cartera</b>', "<b>y algunas más</b>"), re: /no distingue las de la cartera/ },
  "el recorte deja de registrarse": { src: jsx.replace("`La Bandeja Inbound llegó a su tope", "`Otra cosa"), re: /no deja rastro en el log/ },
  "la bandeja deja de mostrarlo": { src: jsx.replace("      {recortadas.total > 0 && (", "      {false && ("), re: /no muestra cuántas facturas salieron/ },
  "el tab pierde su explicación": { src: jsx.replace("      tip: `Clientes con facturas sin clasificar que hay AHORA en la Bandeja Inbound", "      tip: `Otras"), re: /no explica en su tooltip que es una VENTANA/ },
  "los tabs dejan de dibujar su tooltip": { src: jsx.replace('title={f.tip || "Filtrar oportunidades"}', 'title="Filtrar oportunidades"'), re: /no dibujan el tooltip propio/ },
  "el contador vuelve a contar facturas": { src: jsx.replace("const inboundFilas = useMemo(() => (showInbound ? agruparInboundPorCliente(streamFeed, asignarEjecutivo).length : 0)", "const inboundFilas = useMemo(() => (showInbound ? streamFeed.length : 0)"), re: /no cuenta las filas agrupadas/ },
  "reiniciar arrastra la cuenta": { src: jsx.replace("setBandejaRecortadas({ total: 0, conDueno: 0 });", ""), re: /no pone en cero lo recortado/ },
};

for (const [nombre, m] of Object.entries(MUTANTES)) {
  test(`40 · sonda: el mutante «${nombre}» lo atrapa el auditor`, () => {
    assert.notEqual(m.src, jsx, "el mutante no cambió el fuente: la sonda no probaría nada");
    const fallos = auditarRegla40(m.src);
    assert.ok(fallos.some((f) => m.re.test(f)), `esperaba un fallo ${m.re}; obtuve ${JSON.stringify(fallos)}`);
  });
}
