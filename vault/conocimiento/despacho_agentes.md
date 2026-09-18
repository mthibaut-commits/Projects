---
type: conocimiento
title: "Despacho de agentes — el bloque invariante, el ciclo refutar/reparar y los cuatro modos de falla medidos"
description: "Cómo se orquesta trabajo en paralelo en este repo: el brief que recibe todo agente despachado (verbatim, para pegar), la consigna del refutador, los cuatro errores que la refutación encontró en 30 gates, los límites operativos del contenedor y qué hacer cuando la orquestación se cae a la mitad"
tags: [conocimiento, agentes, orquestacion, gates]
timestamp: 2026-09-18T07:00:00Z
---

# Despacho de agentes

El 17-09-2026 se despacharon **más de noventa agentes** para cerrar la tabla de invariantes: uno por fila
para escribir el gate, otro por fila para refutarlo, reparadores para lo refutado y pulidores para lo
aceptado. Funcionó —los 30 gates existen y pasan— pero el brief que obedecía cada uno vivía en un `BRIEF.md`
del **scratchpad de la sesión**, que no sobrevive a la sesión. Esta página es ese brief, más lo que la
refutación midió. Sin ella, la próxima orquestación lo escribe de nuevo y probablemente peor.

Es la única página del vault que no habla del producto: habla de **cómo se produce**.

## El bloque invariante

Va **verbatim** en el prompt de todo agente despachado, antes de su tarea. No se resume ni se adapta: cada
cláusula está porque algo se rompió sin ella.

> **Reglas de este encargo, sin excepción.**
> 1. **No edites el repositorio.** Ni el fuente, ni los tests, ni el vault. Todo tu trabajo va en
>    `<scratchpad>/<trabajo>/casos/<id>/`. Quien integra es el orquestador.
> 2. **No construyas.** No corras `build_app.mjs`, `run_tests.mjs` ni la capa e2e completa. El HTML ya está
>    construido; usa el runner aislado que se te indica.
> 3. **Máximo 6 corridas.** Si a la sexta no está verde, entrega lo que tengas **con el diagnóstico escrito**.
>    Una entrega honesta que dice dónde se atascó vale más que una que declara verde lo que no lo está.
> 4. **Si la regla BLOQUEA algo, prueba las dos direcciones**: que bloquee cuando debe y que **deje pasar**
>    cuando no. Un control probado en una sola dirección pasa años roto (VER-01).
> 5. **Si la regla es una PROPIEDAD, planta la sonda**: rompe la regla a mano y comprueba que tu caso falla.
>    Un caso que pasa con la regla rota no fija nada.
> 6. **No dejes estado.** Nada en `localStorage`, ningún modal abierto, ningún filtro cambiado, ningún toggle
>    encendido al terminar. Compartes la página con los demás casos.
> 7. **Falla, no revientes.** Un `throw` aborta el reporte de todos los otros casos. Devuelve un fallo
>    descriptivo.
> 8. **Cita la evidencia que mediste**, no la que esperabas: los números que salieron, no los del enunciado.

## La consigna del refutador

Un agente distinto, por fila, con el encargo **contrario**: demostrar que el gate NO fija la regla.

> Tu trabajo no es revisar: es **refutar**. Asume que el caso está mal hasta que no puedas romperlo.
> 1. **Imagina la regla rota** —¿cómo se vería el código si alguien la violara?— y comprueba si el caso
>    **sigue pasando**. Si sigue pasando, el caso no fija la regla: fija la salida de hoy.
> 2. ¿Prueba **las dos direcciones** cuando la regla bloquea?
> 3. ¿**Contamina** el estado global de la corrida?
> 4. ¿Es **determinista**, o depende del reloj, del orden o de un sorteo?
> 5. ¿La evidencia está **calculada** o copiada del enunciado?
>
> Veredicto: **aceptado**, **aceptado con observaciones** (dilas) o **bloqueante** (di exactamente qué
> mutación del código deja el caso en verde).

Rindió: **19 aceptados con observaciones y 11 bloqueantes** de 30. Un tercio de los gates escritos por
agentes de effort alto no fijaba lo que decía fijar.

## Los cuatro modos de falla, medidos

Son el contenido real de esta página: los errores que la refutación encontró, con el ejemplo que los delató.

| Modo | Qué pasó | Qué lo evita |
|---|---|---|
| **Fija la salida de hoy, no la regla** | El gate de la regla 8 exigía «aprobado» para una tasa BAJO el mínimo del deudor —lo contrario de la regla— y quedaba blindado contra su propia corrección. El de la 10 declaraba «fuera de regla» el único intento «no entregado» que la cláusula describe. El de la 2 exigía que NO existiera la función que la regla nombra | Cláusula 5 del brief y punto 1 de la consigna: romper la regla a mano y ver si el caso sigue pasando |
| **Comprobación vacua** | Un solape de cabeceras medido con `getBoundingClientRect` sobre ítems de un grid: no puede fallar nunca. «Lo que el emisor postea es el registro inyectado» con la lista vacía no distingue `unshift` de `push`. «El disponible entra neto de A23» era una identidad que el propio dato construye | La sonda: un caso que no puede fallar tampoco falla cuando se planta la violación |
| **Contaminación entre casos** | El runner e2e comparte UNA página. Un caso dejaba el filtro rápido en «Sin línea», el Modo Directorio encendido, un modal abierto que bloquea la navbar del resto de la corrida, o claves en `localStorage` | Cláusula 6, y el runner reinicia el estado al empezar cada **archivo** (Directorio apagado, filtro «Con línea», sin modal) |
| **Revienta en vez de fallar** | `TypeError` sobre `undefined`, `RangeError` con un tope `Infinity`. En la suite un `throw` aborta `page.evaluate` y se pierde el reporte de los otros 139 casos | Cláusula 7 |

## El ciclo

**Escribir → refutar → reparar → pulir.** Cuatro fases, agentes **distintos** en cada una: quien escribió un
gate no lo refuta, y quien lo refutó no lo repara. La independencia es el mecanismo; sin ella la fase de
refutación es una segunda opinión del mismo razonamiento.

1. **Escribir** — un agente por unidad de trabajo, con el bloque invariante y un runner aislado.
2. **Refutar** — un agente por unidad, con la consigna de arriba. Veredicto de tres valores.
3. **Reparar** — un agente **fresco** por bloqueante. Lo reparado vuelve a refutarse.
4. **Pulir** — un agente por «aceptado con observaciones», aplicando la observación **sin debilitar el gate**.
   Es la fase que más fácil se salta y la que convierte un 19/30 en un 30/30.

## Límites operativos del contenedor

- **Concurrencia = `nproc` − 2.** Acá `nproc` es 4, así que **2**. Dejar dos núcleos libres no es cortesía:
  la suite y la capa e2e corren Chromium, y si la orquestación se come los cuatro, lo que se frena es
  justamente la verificación que uno está esperando.
- **Un comando que se pasa del tiempo de espera deja su proceso vivo.** Se revisa con
  `ps -eo pid,etime,pcpu,comm | awk '$3+0>1'` y se mata **antes** de despachar la fase siguiente. El
  17-09-2026 quedaron cuatro `rev` colgados, uno casi seis horas, comiendo núcleos toda la sesión
  (regla núcleo 11 de `CLAUDE.md`).
- **Nunca `rev` en una tubería**: en este contenedor no termina. Para recortar el final de una línea va
  `python3 -c` o `awk`.
- **El guard de git mira el TEXTO del comando.** Un heredoc que escriba un comando prohibido como dato —el
  caso de `verificar_hooks.mjs` y su propia sonda— dispara el hook. Salida: la herramienta de archivos, que
  no pasa por el hook de Bash (`loop_agentico_hooks.md`).

## Cuando la orquestación se cae a la mitad

Pasó **dos veces** el 17-09: la cuenta topó su límite de sesión y el workflow murió entero en la fase de
refutación. Lo que se hizo, y lo que la doctrina fija:

- **El orquestador termina a mano lo que faltaba.** Cinco filas reparadas y cinco pulidos a medias se
  cerraron así.
- **Un paso que no corrió se DECLARA, no se da por corrido.** La re-refutación de lo reparado no alcanzó a
  correr; lo reparado se verificó corriendo cada gate y la verificación completa, **no** con un refutador
  nuevo, y eso quedó escrito en el log de la sesión y en el commit. Un cierre proporcional es el que dice
  qué parte del método se ejecutó y qué parte no; declarar verde un paso que no corrió es el único error de
  esta lista que no lo caza ningún gate.

## Qué NO se despacha

- **El merge, el commit y el push.** Los hace el orquestador, con la verificación completa corrida sobre el
  árbol que va a commitear.
- **La verificación completa** (los siete pasos). Un agente no construye ni corre la suite: si cada uno lo
  hiciera, la orquestación se ahogaría sola en el contenedor.
- **Las decisiones de producto.** Un agente que se topa con una pregunta de negocio la **reporta**; no la
  resuelve. La regla 28 es el ejemplo: que `OperacionesView` repita filas del tubo es una decisión, no un
  defecto, y la regla ya lo decía.
- **Renumerar reglas o casos.** Dos sesiones paralelas toman el mismo «siguiente entero libre»; quien mezcla
  después renumera, y eso es trabajo de orquestador.

## Lo que este repo NO tiene medido

**El routing por modelo.** Las orquestaciones de esta semana se despacharon con *effort* alto y sin variar el
modelo por fase, así que no hay evidencia para prescribir «esta fase con un modelo chico y ésta con uno
grande». Queda dicho para que nadie lo busque acá ni lo invente: cuando se mida, va en esta página con el
número al lado.
