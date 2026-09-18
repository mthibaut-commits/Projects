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

## Las dos correcciones del usuario, el mismo día

1. **«No todas las reglas requieren de aprobador, las knock out no tienen.»** El primer intento exigía área
   a **toda** regla con tramos. Está mal: el área es a quién se le pide la **excepción**, y una knock out
   —tramos sólo de `rechazado`— no se aprueba. Exigirle área la habría dejado **sin ejecutar por una
   carencia que no lo es**, que es el defecto opuesto al que esta regla cierra. El criterio quedó en
   `tiers.some((t) => t[1] === "excepcion")`, que es **el mismo** con que `OtorgamientosView` arma su lista
   de reglas —ya estaba escrito ahí y no lo miré—; el caso 141 recorre el catálogo real en las dos
   direcciones para que no puedan divergir.
2. **«Nunca puede pasar en silencio si está mal definida.»** Fuera del tab de Otorgamiento había **tres**
   vías por las que la operación se veía limpia, y las tres estaban en pantallas que se miran MÁS que el tab:
   - La **tarjeta del Kanban** devolvía `null` (una regla no ejecutada no llega a `exc` ni a `rechReev`).
   - El **denominador «N/M criterios»** del tubo encogía solo: «16/321» pasaba a «16/320». Encoger el
     denominador es la forma más silenciosa de todas, porque la cifra sigue pareciendo correcta.
   - La **mesa de reglas**, que es **donde se arregla**, mostraba un chip de área VACÍO y nada más.

## La tercera vuelta: «si la regla está mal definida, debes mostrarlo en la pantalla»

El usuario lo pidió una tercera vez, y tenía razón otra vez. Lo que lo destapó no fue leer el fuente sino
**capturar la pantalla con una regla plantada** — el catálogo de la demo no tiene ninguna mal definida, así
que sin plantarla no hay nada que ver, y sin la captura no se sabe qué se esconde.

Aparecieron **dos pantallas de mantenedor** que la escondían **por construcción**, no por olvido:

- `Configuración › Otorgamiento › Criterios de verificación` **agrupa por área** sobre una lista fija
  (`["operaciones","comercial","riesgo","extras"]`, `r.area === area`). Una regla sin área **no pertenece a
  ningún grupo y desaparece de la pantalla que la cataloga**, mientras la bajada seguía diciendo «las 78
  reglas del cliente». Es la vía más silenciosa de todas: no hay nada que mirar mal, simplemente **no está**.
  Ahora las que no caen en ningún grupo van **primero**, en su propio bloque naranjo, y la bajada dice
  cuántas son. De paso cubre un área que el tenant cree y esta lista fija no agrupe: ésas sí se ejecutan y
  se marcan distinto.
- `Configuración › Áreas`, **donde se declaran**, cuenta «Criterios que rutean acá» por fila. Una regla sin
  área no rutea a ninguna, así que la suma dejaba de cuadrar con el catálogo sin que nada lo dijera. Ahora
  un recuadro arriba los lista **uno por uno con su número**, porque lo que hay que hacer es ir a buscarlos.

Con eso son **ocho** sitios. Las capturas de los seis que muestran la regla plantada se le enviaron al
usuario: el detalle (fila y aviso de cabecera), la tarjeta del Kanban, el catálogo por área, Atribuciones
de aprobación y Configuración › Áreas.

**La lección, que es la que importa para la próxima:** una pantalla que **agrupa o filtra por un campo**
esconde por construcción lo que no tiene ese campo, y ninguna capa lo ve — ni `tsc`, ni los gates, ni la
suite, ni el e2e, porque todos preguntan por lo que existe. La única forma de encontrarlo es **plantar el
caso y mirar la pantalla**.

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
