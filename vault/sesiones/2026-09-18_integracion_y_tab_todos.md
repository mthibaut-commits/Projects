---
type: sesion
title: "Sesión 2026-09-18 — Integración de las cuatro ramas y el tubo abre en «Todos»"
description: "Se cierra el merge de las cuatro ramas del 17-09 sobre un árbol verde: cinco gates reconciliados (regla 5, 13-octies-bis, 29, 30, 13-quaterdecies), una regresión propia cazada por el e2e, el renombre O05 y la regla 34 nueva (el tubo abre en «Todos», que pasa a ser el primer tab)"
tags: [sesion, merge, gates, ui, tubo]
timestamp: 2026-09-18T03:20:00Z
feature: null
---

# Sesión 2026-09-18: integrar todo, y el tubo abre en «Todos»

## Hecho

- **Merge de `claude/ecstatic-ptolemy-f7cb4m` con `origin/main`** (65 archivos): la tabla de invariantes
  cerrada, la capa e2e (29 casos), el punto fijo del generador y «Operación creada» + Editar en un solo árbol.
- **Regla 34, nueva** (`ui_detalle_y_tubo.md`, pedido del usuario): el tubo de Gestión diaria **abre en
  «Todos»** y **«Todos» es el primer tab**, antes del «Prioritarios» condicional. Gate propio
  `regla_34.test.mjs` (4 sondas) y fila en la tabla de invariantes.
- **O05**: «Evidencia del Contrato de Cesión» → «Contrato firmado por cliente de la operación», 10
  reemplazos en 7 archivos (fuente, catálogo de reglas, dos reglas del vault, tres specs, una auditoría).

## Lo que el merge obligó a decidir (y por qué el gate no era el que estaba mal)

Cinco gates quedaron en rojo al juntar los árboles. Ninguno por capricho: cada uno fijaba una garantía y
lo que se movió fue **dónde vive**, no la garantía. Uno era un defecto de verdad.

1. **Regla 5 · la compuerta se mudó.** El gate exigía un filtro inline por etapa dentro de
   `reabrirOperacion`; ese filtro pasó a `edicionOperacion(d0)`, que además apaga el botón y es lo que el
   menú consulta. El gate ahora admite las dos formas y, cuando se delega, le exige a la compuerta devolver
   `ok: false` para `perdida`. La puerta se cierra **una vez y en un solo lugar**, que era el punto.
2. **Regla 13-octies-bis · gana la medición.** El vacío de la oferta pasó a `#F5F4F8` / `#E4E2EC`: al
   mudarse la sección al panel lila, el `#EDECF3` dejó de distinguirse del fondo. Se corrigieron **a la vez**
   el gate, el caso e2e, el comentario del fuente y el TEXTO de la regla (núcleo 2). Lo que la regla fija
   —que el vacío SE VEA— no cambió; el par que no vuelve sigue siendo `#F7F7FA` / `C.faint`.
3. **Regla 29 · el chip se partió en dos.** «Solicitud línea» dejó de ser la rama gris del chip de estado.
   El gate pasó a exigir el **FALTANTE** (`monto − ev.asignado`) y no el monto del deudor: un
   `solicitud = monto` volvería a reportar de más en cada parcial, que es justo el defecto que el chip
   nuevo cerró. Snapshot declarado: las sondas de ese gate suben de 17 a 19.
4. **Regla 30 · un ítem más, la negativa intacta.** Cerrada la oferta el menú «Acciones» gana «Editar la
   oferta» (regla 33). Reabrir no cierra ni avanza, así que `PROHIBIDO` sigue vigilando lo mismo; el caso
   e2e espera la lista de cinco ítems **en ese estado** y busca el reset **por su rótulo, no por índice**
   —el índice fijo es lo que se rompe cuando alguien inserta un ítem antes—.
5. **Regla 13-quaterdecies · REGRESIÓN propia, y la cazó el e2e.** Al cerrar el paquete, `soloLectura`
   escondía el menú «Opciones» **entero**, y con él «Eliminar la simulación y vaciar la oferta», que la
   regla exige **deshabilitado con el motivo escrito, no oculto**. Corregido: el menú se queda y lo que se
   apaga es lo que edita el paquete, con una línea que dice por qué y apunta a Acciones › Editar. Y
   `motivoNoReset` ganó su rama para la oferta **cerrada sin publicar**, que antes caía en el motivo de la
   etapa —un motivo cierto que no era el hecho que bloqueaba—.

## Lo que hay que recordar

- **Una barrida de `bloqueado` → `soloLectura` no es un renombre**: `soloLectura` incluye `paqueteCerrado`,
  así que cada sitio que lo recibe cambia de comportamiento en un estado nuevo. El de 13-quaterdecies pasó
  por `tsc`, por el build, por los 156 gates y por los 140 casos de la suite: **lo vio el e2e**, que es la
  única capa que monta el detalle. Al ampliar una guarda, la pregunta no es «¿compila?» sino **«¿qué
  pantalla se queda sin una salida que una regla prometió?»**.
- **Mover una línea de JSX puede desarmar un gate que no habla de ella**: subir `{ id: "todos" … }` al
  principio de `quickFilters` la alejó del comentario `// DIRECTORIO` que la cubría, y el gate de la regla
  31 —que exige que todo enganche del modo sea *grepeable*— la marcó. Se movió la marca con la línea.
- **La línea base del e2e y el default de la app son dos decisiones distintas.** `reiniciar()` fija «Con
  línea» porque los casos abren las filas 0–2 de esa pestaña; que coincidiera con el arranque de la app era
  una coincidencia. Quedó escrito en el harness y en la regla 34, porque la próxima vez que alguien cambie
  un default va a buscar ahí.

## Verificación

`tsc` limpio · 0 duplicados · build 40,7 MB · **156/156** gates · **140/140** la suite · **29/29** e2e ·
11 capturas regeneradas · y las dos sondas de DOM que nada de eso monta: detalle simulado **15/15**,
tabs de Gestión diaria **6/6** (abre en «Todos», 65 filas de 65, y elegir otro tab no reordena la fila).
