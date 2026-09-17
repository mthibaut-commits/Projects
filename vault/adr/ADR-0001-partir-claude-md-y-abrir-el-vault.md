---
type: adr
title: "ADR-0001 — Partir CLAUDE.md por vida útil y abrir el vault"
description: "Por qué CLAUDE.md pasó de 229 KB cargados en cada sesión a 98 líneas, dónde fue cada cosa, qué alternativas se descartaron y en qué se aparta este repo de los defaults del skill agentic-repo-bootstrap-v2"
tags: [adr, fundacional, vault, claude-md]
timestamp: 2026-09-17T15:29:14Z
estado: aceptada
reemplaza: null
---

# ADR-0001: Partir `CLAUDE.md` por vida útil y abrir el vault

## Contexto

`Auditoria_Bootstrap_Agentico.md` (17-09-2026) midió que `CLAUDE.md` pesaba **425 líneas / 229.306 bytes
(~57.000 tokens)** y se cargaba entero en cada sesión. El 75 % eran 60 reglas de dominio que mezclan, en el
mismo párrafo, tres cosas con tres vidas útiles distintas: **la regla** (permanente), **el porqué** (permanente,
inmutable) y **la historia** de cuándo y cómo se descubrió (se lee una vez). La numeración ya estaba fracturada
(`13-octies-bis`, `15-bis-bis`, `30-ter` antes que `24`) y tres cifras del documento se habían desfasado en
silencio porque ninguna tenía gate. El contenido, sin embargo, es memoria real ganada con incidentes concretos:
la razón de que el proyecto haya crecido a 25.922 líneas sin perder coherencia. El usuario decidió el 17-09-2026
partir `CLAUDE.md` **antes** que cablear gates o hooks (opción «partir primero» de la auditoría).

## Decisión

Partir `CLAUDE.md` **por vida útil, a nivel de regla y verbatim**:

1. `CLAUDE.md` queda con lo que **toda** sesión necesita: estado (puntero al tablero), stack, los comandos
   exactos de verificación, doce reglas núcleo, el flujo con el usuario y el mapa. ≤150 líneas.
2. Las 60 reglas de dominio se mueven **sin cambiar una letra** a `vault/conocimiento/reglas/<tema>.md`,
   agrupadas por tema (10 archivos) y conservando su número, porque el fuente (47 menciones) y otros
   documentos (21) las citan así. Una regla nueva toma el siguiente entero libre; los sufijos `-bis` no vuelven.
3. `vault/conocimiento/invariantes.md` es el **índice**: cada regla con dónde vive y qué caso de la suite la
   verifica, más los 12 invariantes del contrato con el servidor con su cobertura. La columna vacía es el hallazgo.
4. «Arquitectura y build», la narrativa de verificación, «Contrato con el servidor» y «Documentación del proyecto»
   van verbatim a `vault/conocimiento/`; «Convenciones del código» a `.claude/rules/code_style.md`, que se carga al
   tocar el fuente, la suite o los scripts.
5. La partición se hace con un **script determinista por rangos de líneas** y se comprueba con una **sonda**:
   cada línea de contenido del original aparece exactamente una vez en el conjunto destino (398 de 398).
6. Se abre el vault mínimo que esto necesita —`conocimiento/`, `adr/`, `sesiones/` con el tablero— y nada más.

## Alternativas consideradas

- **Dejarlo como estaba** — descartada: 57.000 tokens por sesión antes de leer una línea de código, y el
  desfase de las cifras ya había empezado.
- **Resumirlo** — descartada: cada párrafo explica por qué una regla es como es; resumir pierde exactamente lo
  que lo hace valioso, y el usuario lo pidió con esas palabras («sin perder un párrafo»).
- **Partir por GÉNERO ahora, frase a frase** (regla → `invariantes.md`, porqué → un ADR por regla, historia →
  logs) — descartada **por ahora**: los tres géneros están entrelazados oración por oración y separarlos
  exige reescribir 172 KB; el riesgo de alterar el sentido supera el beneficio. Se hace **regla por regla,
  cuando cada una se vuelva a tocar**, que es cuando alguien la está leyendo con atención (decidir en el
  último momento responsable).
- **Renumerar** — descartada: la numeración fracturada es el síntoma de un documento append-only sin sitio
  para lo nuevo, no la enfermedad; renumerar rompería 68 referencias y no arreglaría la causa.
- **Bootstrap completo** (hooks, `tests/contract/`, CI, plantillas, roadmap) — **pospuesto**, no descartado:
  es una decisión del usuario, y el orden por retorno sobre riesgo está en la auditoría §8.

## Desviaciones respecto del skill `agentic-repo-bootstrap-v2` (con su razón)

| Default del skill | Acá | Por qué |
|---|---|---|
| Código, commits y ramas en inglés | **Todo en español**, incluidos commits e identificadores | La casa tiene 108 commits en español y el fuente entero nombra en español; imponer inglés partiría el repo en dos idiomas |
| Hooks deterministas, `tests/contract/`, CI | No en esta decisión | El usuario eligió partir primero; queda como siguiente paso en el tablero |
| `roadmap/`, `features/`, `specs/`, `plantillas/` | No se crean | El proyecto ya tiene `Specs_Procesos/` con su propia forma (`.md` + PDF); duplicar el mecanismo sin decidirlo sería inventar ceremonia |
| Git: `feature/<slug>` + `merge --no-ff` | Rama designada de la sesión; preset A/B sin decidir | No hay pipeline que despliegue ramas; decidirlo es parte del bootstrap completo |
| `.claude/rules/` por globs de ruta | Un solo `code_style.md` con globs sobre el fuente único | Con un solo archivo fuente la disclosure por ruta discrimina poco; el ahorro real es el vault por tema, que se lee a demanda |
| `.obsidian/app.json` en la raíz | No se crea | Nadie pidió Obsidian; el vault es markdown plano y funciona sin él |
| Principios LEAN/Frugal sembrados en `arquitectura.md` | No se agregan | `arquitectura.md` es verbatim; sembrar texto nuevo mezclaría lo movido con lo inventado y rompería la sonda |

## Consecuencias

**Positivas**
- El contexto fijo por sesión baja al **3,5 %** (7.941 bytes) y las reglas se leen **por tema**, a demanda.
- El índice hace visible, por primera vez, qué regla tiene caso en la suite y cuál sólo la sostiene la revisión.
- Nada se perdió y es **comprobable**: la sonda, no la confianza.
- La numeración deja de fracturarse hacia adelante (siguiente entero libre).

**Negativas / deuda asumida**
- 16 archivos donde había uno; `grep -rn "^13-ter\." vault/` resuelve la búsqueda por número.
- Las reglas siguen mezclando los tres géneros **por dentro**: la separación fina queda para cuando se toque cada una.
- Tres cifras desfasadas (líneas, componentes, MB) siguen verbatim en `arquitectura.md` hasta que exista el gate
  que las produzca; están anotadas en el tablero.
- Ocho de los doce invariantes del contrato siguen sin gate: ahora se ve, no se cerró.

**Eje del trade-off (Ley III).** Esta decisión compra **precisión de contexto y navegabilidad** a cambio de **más
archivos y de aplazar la separación por género**, que se hará regla por regla con la atención puesta en cada una.
