---
type: sesion
title: "Sesión 2026-09-18 — Tener área no basta: una regla excepcionable sin aprobador tampoco se ejecuta (regla 35, ampliación)"
description: "El usuario cerró la pregunta que quedó abierta: «si la regla especifica que es excepcionable debe gatillar el mensaje que está mal definido». Ahora la compuerta juzga el RUTEO completo —tres causas— y para eso recibe el padrón del tenant, sin dejar de ser pura"
tags: [sesion, otorgamiento, motor, reglas, aislamiento]
timestamp: 2026-09-18T22:30:00Z
feature: null
---

# Sesión 2026-09-18: tener área no basta

## Lo pedido

Al cerrar la sesión anterior quedó una pregunta mía sin responder: cuando el área **sí existe** en el catálogo
pero el tenant **no tiene a nadie** en ese nivel, la regla se evaluaba igual y su excepción salía con «Sin
aprobador definido» — visible, pero la operación quedaba pegada esperando a alguien que no existe. El usuario
la respondió en una línea: *«Si la regla especifica que es excepcionable debe gatillar el mensaje que está mal
definido»*.

## Lo hecho

La regla 35 pasó de una causa a **tres**, y las tres paran la regla porque las tres dejan la excepción sin
destinatario: `sin_area` (no la declara), `area_inexistente` (declara una que el tenant no tiene) y
`sin_usuario` (existe y nadie la tiene en ese nivel ni en uno superior). La causa se guarda igual, porque
**cada una se arregla en un mantenedor distinto** y mandar al usuario al equivocado es casi tan malo como no
decirle nada: el badge de la mesa de reglas dice «Sin área» o «Sin aprobador» según cuál sea, y el texto
termina en «Configuración › Áreas» o «Configuración › Usuarios».

Se prueban **todos** los tramos de excepción, no el primero: cualquiera puede ser el que dispare.

## El problema real: la compuerta necesitaba el tenant y no podía leerlo

`reglaNoEjecutable` juzgaba la DEFINICIÓN de la regla — su gate lo decía con todas sus letras y lo vigilaba con
una sonda. Juzgar el RUTEO es otra cosa: la misma regla, intacta, pasa a estar mal definida el día que alguien
borra un área en Configuración. Así que ahora recibe el **padrón** … por parámetro. Quien itera el catálogo
(`evaluarOtorgItems`, `snapVersionCli` y las tres pantallas de mantenedor) lo calcula UNA vez y lo inyecta.

El primer intento llamó a `rolDeAreaNivel`, que se busca el padrón cuando no se lo pasan. `tsc`, el build y los
26 tests del gate pasaron; **`auditar_aislamiento.mjs` no**: sigue las llamadas, y sacó a `evalReglaCli` de la
lista de funciones puras en el acto (`TENANT(USERS←reglaNoEjecutable, AREAS_CAT←…)`). Eso es exactamente lo que
esa línea base existe para impedir — «lo que se desacopló no se vuelve a acoplar» — y el arreglo no fue aflojarla:
el núcleo se partió en `cargoDeAreaNivel(area, nivel, pad)`, **puro y con el padrón obligatorio**, y
`rolDeAreaNivel` quedó como su adaptador para las pantallas. `reglaNoEjecutable` y `cargoDeAreaNivel` entran a
`DECIDEN` y a `BASE_PURAS`: si mañana leen el padrón por su cuenta, rompe.

Segunda vuelta del mismo auditor, y vale anotarla porque cuesta media hora encontrarla: volvió a marcar
`evalReglaCli` cuando el código ya era correcto. El auditor lee TEXTO, y el mensaje de ayuda que yo había escrito
—«quien llama al motor tiene que inyectarle el padrón (\`padronAprobadores()\`)»— **nombraba el global dentro de
un string**. Un identificador citado en una frase para humanos cuenta como una lectura. El mensaje dice ahora
«el padrón de aprobadores del tenant».

**Sin padrón la compuerta falla CERRADO** (`causa: "sin_padron"`): quien olvide inyectarlo ve el criterio marcado
en pantalla, no aprobado en silencio. El costo salió a la luz de inmediato y es la prueba de que sirve: los casos
**116 y 137** de la suite llamaban a `evalReglaCli` sin padrón y se pusieron rojos. Se les inyectó el real.

## Qué NO cambió, a propósito

- **El knock out sigue corriendo** aunque no tenga a quién pedirle nada: no se aprueba, incumple y se acabó. Es
  la corrección que el usuario hizo por la mañana y no se pierde al ampliar (caso 143 la mide con padrón vacío).
- **«Sin aprobador definido» sigue vivo en el piso por monto**: `nivelExigido` sube el nivel según cuánto se gira,
  y ése es un atributo de la OPERACIÓN, no de la definición de la regla — la misma regla rutea bien en una
  operación chica. Ahí no corresponde no ejecutarla, corresponde decir que a ese monto no hay quien firme.
- **El super-admin no cuenta como aprobador.** `puedeAprobarExc` lo deja pasar antes de mirar el área, así que
  técnicamente podría firmar cualquier cosa; es la llave maestra del tenant, no el aprobador que la política
  designa. Con el mismo criterio, una regla sin área tampoco se ejecutaba aunque él pudiera firmarla.

## Cómo se verificó que se VE

El método de la regla 35, otra vez: **plantar la regla y mirar la pantalla**. El catálogo real no tiene ninguna
mal definida, así que sin plantarla no hay nada que ver. Dos sondas, una por forma del defecto:

| Pantalla | Área real que nadie tiene (`verificacion`) | Área de un grupo, nivel sin cubrir (`riesgo` N9) |
|---|---|---|
| Configuración › Áreas | «1 criterio(s) MAL DEFINIDOS», con motivo y mantenedor por criterio | ídem |
| Otorgamiento › Atribuciones | «Sin aprobador · NO SE EJECUTA» + recuadro | ídem |
| Otorgamiento › Criterios | bloque «Fuera de las áreas listadas · 1 NO SE EJECUTAN» | **cabecera del grupo «⚠ 1 NO SE EJECUTAN» + badge y motivo en la ficha** |
| Detalle › Otorgamiento | «⚠ 1 regla(s) … NO se ejecutaron» + fila ámbar con la causa | ídem |

La última columna es la que obligó a tocar código nuevo: una regla que **sí** cae en uno de los cuatro grupos se
veía perfectamente normal en la pantalla que la cataloga. Es el mismo agujero de la sesión anterior con otra
cara — una pantalla que agrupa esconde por construcción lo que no calza, y también lo que calza mal.

## Medición que queda dentro del caso

Hoy **ninguna** de las 77 reglas cae acá: las 69 con excepción tienen a quién pedírsela en este tenant, porque
`cargoDeAreaNivel` escala hacia arriba (riesgo N1–N3 → Jefe de Riesgo N4; operaciones N1–N2 → Jefe de Operaciones
N3). El caso 143 lo afirma, así que **el día que alguien borre un área o la deje sin gente, se rompe** — que es
el punto: significaría que la demo está mostrando reglas que no se ejecutan.

## Verificación

Paso 0 prettier ✓ · 1 `tsc` sin TS1 ✓ · 2 sin duplicados ✓ · 3 build 41,3 MB ✓ · 4 **233 gates de contrato** ✓ ·
5 **143/143** (el caso 143 **en rojo primero** contra el build anterior: 142/143) · 6 **29/29** e2e ✓ ·
7 las 11 capturas regeneradas ✓.
