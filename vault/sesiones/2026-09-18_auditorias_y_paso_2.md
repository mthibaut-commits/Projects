---
type: sesion
title: "18-09-2026 — las dos auditorías y el agujero del paso 2"
description: "Cierre del análisis con agentic-repo-bootstrap-v2 (repositorio y código), y la corrección del único defecto accionable que salió de ahí: el paso 2 de la verificación no veía once declaraciones del fuente"
tags: [sesion, auditoria, verificacion, gates]
timestamp: 2026-09-18T03:50:00Z
---

# 18-09-2026 — las dos auditorías y el agujero del paso 2

## Qué se hizo

1. **`Auditoria_Bootstrap_Agentico_Cierre.md`** (+PDF): el repositorio medido contra los 12 pasos del skill.
2. **`Auditoria_Codigo_Fuente.md`** (+PDF): el PRODUCTO medido. 26.233 líneas, 1.175 funciones, 154 componentes,
   74 globales mutables y 55 de ellas escritas en dos sitios o menos. Conclusión: el archivo no tiene un problema
   de calidad, tiene una FORMA, y la recomendación es **no refactorizar** — con la condición previa escrita por si
   algún día se hace (que la capa e2e cubra el detalle).
3. **El único defecto accionable de esa auditoría, corregido**: el paso 2 de la verificación.

## El paso 2 no veía once declaraciones

El paso 2 buscaba `^(function|const|let|var) [A-Za-z0-9_]+`. Sobre `pipeline_comercial.jsx` eso son **944**
declaraciones, y el fuente tiene **955**: faltaban diez `async function` (`sha256Hex`, `validarOtp`,
`verificarAuditoria`, `vincularArchivoLog`, `escribirEnArchivo`, `drenarArchivoLog`, `persistirAuditoria`,
`emitirOtp`, `confirmarEscrituras`, `exportarCandidatasXlsx`) y el `export default function PipelineComercial`.

`auditar_muerto.mjs`, del mismo repositorio, **sí** las veía: su `RE_DECL` incluye `export default`, `async` y
`class`, y el comentario que la acompaña explica por qué, con el incidente que la motivó — *«un analizador que no
ve una forma de declarar funciones no da un falso negativo: da un falso POSITIVO, que acá significa borrar código
vivo»*. Dos herramientas del mismo repo tenían definiciones distintas de «declaración» y **la débil era la que
está en la ruta obligatoria de verificación**.

El modo de falla es el que `code_style.md` documenta con dos incidentes propios: un `const sha256Hex` que colisiona
con el `async function sha256Hex` es «Identifier 'sha256Hex' has already been declared», **`tsc` no lo detecta**
—probado en este repo con `visadoDealCalc`— y el paso 2 tampoco lo habría visto. El aviso llegaba dos minutos más
tarde, en el paso 5, cuando la suite no logra montar la app, y sin nombrar el símbolo.

## La corrección

- El patrón pasó a `^(export default )?(async )?(function|const|let|var|class) [A-Za-z_$][A-Za-z0-9_$]*`, el mismo
  que el auditor, en los **tres** sitios que escriben el paso 2: `CLAUDE.md`, `vault/conocimiento/verificacion.md`
  y `.github/workflows/gates.yml`.
- **La cola cambió de `$2` a `$NF`**, y no es cosmético: en `export default function PipelineComercial` el nombre
  es el último campo, así que un `$2` heredado habría devuelto «default» y «function» como si fueran símbolos —y
  dos veces cada uno, o sea un falso duplicado en cada corrida—.
- `tests/contract/fuente.test.mjs` sumó **dos gates** (151 → 153):
  1. **Los tres sitios dicen lo mismo.** El patrón y la cola se extraen de cada archivo y se comparan. Sin esto, el
     CI y el humano podían correr chequeos distintos y nadie se enteraba.
  2. **El paso 2 y `auditar_muerto` reconocen las mismas declaraciones del fuente**, línea a línea. Es la regla de
     fondo: el analizador de la ruta obligatoria no puede ser más débil que el que sólo se corre a mano.
- El test **ya no copia el patrón**: lo lee de `CLAUDE.md`, que es donde el paso 2 está escrito. Una copia menos que
  pueda quedar vieja.
- La sonda negativa planta la colisión `const sha256Hex` / `async function sha256Hex`, comprueba que hoy se caza y
  que **con el patrón de ayer no se cazaba**, y que el patrón viejo desacuerda con el auditor sobre el fuente real.

## Verificado a mano que los gates muerden

Dos mutaciones, revertidas después: (a) dejar el CI con el patrón viejo → cae el gate de los tres sitios; (b) volver
los tres archivos al patrón viejo → caen los tres gates (los dos nuevos y la sonda). Con todo restaurado, 153/153.

## Lo que NO se tocó, y por qué

`Auditoria_Bootstrap_Agentico.md` cita el grep viejo en dos lugares: son el registro de una medición fechada
(17-09-2026, commit `fc8a32b`) y cambiarlos falsearía el registro. `Inconsistencias_Motor_Otorgamiento.md` sí se
corrigió, porque ahí la cita era **prescriptiva** («verificación tras cada cambio, según `CLAUDE.md`») y había
quedado vieja: ahora apunta a `CLAUDE.md` sin copiar el comando.

## Para la próxima

El paso 2 sigue sin conocer los template literals, y el auditor sí (`enPlantilla`). La diferencia es deliberada y
está escrita en el gate: un `function` a columna 0 dentro de un backtick —como el que tenía `htmlAprobacion`— haría
gritar de más al paso 2, y ése es el lado barato de equivocarse. No ver una declaración no lo es.
