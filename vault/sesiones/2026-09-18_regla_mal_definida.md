---
type: sesion
title: "Sesión 2026-09-18 — Una regla mal definida no se ejecuta ni se verifica (regla 35)"
description: "Un criterio sin área ya no se evalúa: el motor corta antes de los tramos y la salida dice que no se ejecutó, con la causa y dónde se arregla. La sonda de DOM destapó que caía en el acordeón «N regla(s) aprobada(s)»"
tags: [sesion, otorgamiento, motor, reglas]
timestamp: 2026-09-18T05:00:00Z
feature: null
---

# Sesión 2026-09-18: una regla mal definida no se ejecuta, y se dice

## Lo pedido

> «En caso de encontrar una regla con un criterio sin área, esa regla no deberá ejecutarse ni verificarse.
> Se deberá mostrar en la salida que la regla no se ejecutó ya que no se ha definido correctamente.
> Falta las configuraciones de áreas u aprobador.»

## Hecho — regla 35 (`otorgamiento_y_atribucion.md`)

- **`reglaNoEjecutable(regla)`**, pura y de nivel módulo: una regla que **decide** (tiene tramos) y **no
  declara `area`** está mal definida. Las de **clasificación** y las **sin tramos** quedan fuera: informan
  o no deciden, así que no necesitan aprobador. `null` falla **cerrado**.
- **`evalReglaCli` la consulta ANTES de recorrer los tramos** y devuelve la quinta disposición,
  `no_ejecutada`, con el **motivo** y **dónde se arregla**. Va ahí porque es el único sitio por donde
  pasan las reglas de cliente y las de deudor; en cada consumidor, el que se olvidara la evaluaría igual.
- **`visadoDealCalc` las expone en `noEjec`** y no las mete en `exc` ni en `rech`: nada se evaluó, así que
  nada concluyó. **No bloquean.** Lo que protege a la operación no es el bloqueo, es que el problema se VEA.
- **La salida**: badge ámbar «No ejecutada · falta configuración», recuadro con «Esta regla no se ejecutó ni
  se verificó… La operación se evaluó SIN ella» + la causa + el mantenedor, un aviso de cabecera por tab, el
  contador del panel y el tooltip de la compuerta de Otorgamiento. El **hallazgo** de la regla **no** se
  muestra: afirmaría un resultado que nadie midió.

## Lo que encontró la sonda de DOM, y que el fuente no decía

Una regla no ejecutada **no requiere aprobación**, así que `reqAprob` la dejaba fuera de `reqRows` y caía
en **`okRows`** — o sea **dentro del acordeón «N regla(s) aprobada(s)», colapsado**. Contada como aprobada
y escondida: exactamente el *default silencioso* que la regla venía a cerrar, y en la mitad de la pantalla
que nadie mira. Ahora hay un **tercer balde**, siempre visible, y la frase «✓ Todas las reglas están
aprobadas» ya no sale cuando alguna no se ejecutó. De paso, `orden` no conocía la quinta disposición:
`orden[undefined]` daba `NaN` y el comparador quedaba indefinido para esas filas.

**Dos trampas de la sonda**, por si hay que repetirla: el detalle es **otra pestaña**, con su propio
módulo, así que plantar la regla en el tubo no la toca (el primer intento leyó 0 reglas por eso); y las
reglas del **cliente** salen del **snapshot** que congela la versión, así que hay que plantar **antes de
simular** o la versión ya está armada sin ella.

## Lo que NO cambió, a propósito

**«Sin aprobador definido»** (spec de excepciones §6.4) sigue siendo la respuesta cuando el área **existe
en el catálogo** pero el tenant no la tiene, o nadie la tiene en ese nivel o superior: ahí la regla **sí se
evalúa** —está bien definida— y lo que falta es un **usuario**. Son dos problemas y se arreglan en
mantenedores distintos. No ejecutar una regla porque al tenant le falta un aprobador dejaría pasar
operaciones en silencio, que es lo contrario de lo que se pidió.

## Verificación

`tsc` limpio · 0 duplicados · build 40,7 MB · **170/170** gates (con `regla_35.test.mjs`, 12 tests y 11
sondas) · **141/141** la suite (caso **141**, que planta la regla y restaura el catálogo) · **29/29** e2e ·
11 capturas · y la sonda de DOM del tab de Otorgamiento **9/9**, que es la única que monta esa pantalla.

Hoy **ninguna** de las 77 reglas del catálogo cae acá: las dos capas la prueban **plantando** una. Un test
que comparara el catálogo consigo mismo pasaría siempre y no vigilaría nada.
