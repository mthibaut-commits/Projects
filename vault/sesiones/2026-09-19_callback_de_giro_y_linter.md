---
type: sesion
title: "El giro vuelve como callback de Tesorería, y el linter cierra el cuarteto de gates"
description: "Decisión del usuario: el sistema de giro avisa el evento. recibirGiroTesoreria es una función pura que devuelve el patch, con sus tres negativas. Y ESLint entra como paso 0-bis con reglas que citan incidentes reales del repo: encontró una clave duplicada en un objeto de pricing"
tags: [sesion, giro, tesoreria, regla-37, linter, gates]
timestamp: 2026-09-19T02:00:00Z
---

# El giro llega como noticia, y el cuarteto queda en cuatro

## El callback

La sesión anterior dejó anotado que no sabíamos **cómo nos enteraríamos del giro**: nada escribía
`giroPendiente: false` desde afuera, así que una operación inyectada a Tesorería se quedaba en «Pendiente
de Giro» para siempre. El usuario lo decidió: **habrá un callback desde el sistema de giro notificando el
evento**. Es *push*, no *pull* — al revés que los estados de línea de la regla 15.

`recibirGiroTesoreria(ev, deal)` es el punto de entrada, y es una **función pura que devuelve el patch**,
no un setter. Eso es deliberado y tiene dos consecuencias buenas: la suite la prueba por su nombre sin
montar la app (caso **145**), y quien la llama decide cuándo escribir. El cable —una rama más en el
listener que ya usan `nex-solicitud` y `nex-preeval`— sólo aplica y audita.

**Las tres negativas pesan tanto como la positiva**, y cada una tiene su razón:

- **`ya_girada`** — un callback **se reintenta**: es la naturaleza de un push. Reprocesarlo duplicaría el
  hecho en la bitácora y en los KPI de venta, donde una operación girada cuenta como venta.
- **`no_inyectada`** — sólo se gira lo que pasó por Operaciones. Un aviso sobre otra cosa es un error del
  otro lado, y se **dice** en vez de escribirse igual.
- **`aviso_incompleto`** — sin `operacionId` no hay con qué decidir. Falla cerrado.

Dos detalles que no son de forma. **El monto no se inventa**: si el aviso no lo trae, el patch no lo
afirma — un número inventado acá no cuadraría contra nada y nadie podría distinguirlo de uno real. Y **el
rechazo también se audita**: un aviso que llega y no corresponde es información sobre el otro lado, y
perderlo deja el problema invisible.

Queda contestado de paso **`giroDeal`/`GIRO_STATE`**: el paquete que vale es el que se INYECTA, así que si
alguna vez se congela la asignación de giros, se congela ahí. Hoy `giroDeal` sigue sin llamador y
`GIRO_STATE` sin escritor; eso no cambió y sigue siendo decisión de producto.

## El linter, y cómo se eligieron sus reglas

Era lo último que le faltaba al cuarteto de gates del bootstrap. El criterio para elegir reglas fue
estrecho a propósito: **cada una cita un incidente REAL de este repo**, escrito en el vault o en
`code_style.md`. Una regla que no pueda citar su incidente no entra. Y **ninguna regla de estilo**: de la
forma se encarga Prettier (ADR-0006), y duplicar esa autoridad es cómo las dos herramientas se pelean.

La medición, que es lo que hizo barata la decisión:

| | |
|---|---|
| Primera corrida | **385 hallazgos** |
| `no-undef` | 232 → eran **20 nombres**, todos globales legítimos del navegador |
| `no-unused-vars` | 151 → se **excluyó**: `auditar_muerto.mjs` ya cubre eso con su línea base, y triar 151 no es de esta sesión |
| **`no-dupe-keys`** | **1 — real** |
| Tras declarar los globales y corregir | **0** |

Los globales se declaran **uno por uno**, en vez de traer el paquete `globals`: la lista dice exactamente
qué toca esta app del navegador, igual que el SBOM dice qué trae del vendor. Con la lista completa
`no-undef` queda en cero, y desde ahí lo único que puede reportar es un identificador mal escrito o un
componente que nadie definió — que es justo lo que `tsc` y el build **no** ven, y que `CLAUDE.md` nombra
como trampa conocida.

**El hallazgo real**: `comision` aparecía **dos veces** en el mismo objeto literal de un cálculo de
pricing. Las dos eran la forma abreviada de la misma variable, así que el valor era idéntico y no se
perdía plata — pero es la huella exacta de la fusión de identificadores que `code_style.md` documenta
(«una clave repetida en un objeto literal es JS válido y silencioso: gana la última», 9 fusiones reales en
la migración a pesos). Se verificó que el `fin` de ese objeto devuelve `{financiado, dif, otros, subtotal,
girar}` y **no** trae `comision`, o sea que no había un campo perdido detrás: era redundancia pura. Se
borró la segunda.

Quedaban tres mensajes de ruido, ninguno del código: dos `eslint-disable` inertes y una directiva que
nombraba `react-hooks/exhaustive-deps`, un plugin que este stack no tiene (no hay bundler ni
`package.json`). Las directivas inertes se silenciaron en la configuración; la que nombraba el plugin se
reemplazó por un comentario que dice **por qué** esas dependencias son las que son — que es lo que la
directiva quería decir y no decía.

Entra como **paso 0-bis**, junto al formato: los dos protegen a los demás en vez de verificar una
conducta, y numerarlo así deja intacta la numeración 1-6 que citan `cifras.test.mjs` y media docena de
documentos.

## Verificación

0 `prettier --check` limpio · **0-bis `eslint` 0 hallazgos** · 1 `tsc` sin TS1 · 2 sin duplicados ·
3 build · 4 **208/208** contrato · 5 **145/145** la suite · 6 e2e. `CASOS_ESPERADOS` sube de 144 a 145.
