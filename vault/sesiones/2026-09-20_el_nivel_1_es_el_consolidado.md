---
type: sesion
title: "La línea del cliente es la suma, y el deudor al que el comité le asigna una es un RUT real"
description: "Revisión del proceso de solicitud de línea que pidió el usuario: tres huecos medidos —la cabecera no era la suma en 217 de 224 clientes, el wizard inventaba el RUT del deudor, y las líneas del comité no llevaban marca— más una identidad que la migración del padrón no había alcanzado"
tags: [sesion, lineas, comite, padron, activos]
timestamp: 2026-09-21T00:20:00Z
---

# El nivel 1 es el consolidado · reglas 45 y 46 · ADR-0011

## Qué pidió el usuario

Revisar el proceso de solicitud de línea, y con él la definición del modelo:

> «Revisa el proceso de solicitud de linea; ahi en la primera pantalla en donde ya estas parado en un
> cliente, buscas empresas deudoras y le asignas un monto puntual o normal (lf2-lf3) con un monto. Asi
> el comite si asigna lineas por pares.
>
> El sistema debiera trabajar con lineas al rut cliente (que es un monto global de la suma de las
> lineas asignadas al cliente ya sea por par (puntual o normal) o al rut cliente con los otros
> deudores (comodin)). **Si los datos no venen asi estamos mal.** Ademas de las lineas deudoras que no
> son par y que actuan como un restriccion evitando que el factoring se concentre una deuda mas alla
> del limite de la linea con ese deudor; una linea de control de exposicion al riesgo deudor.
>
> Las lineas son en pesos. El comite agrega mas lineas al activo de datos de las lineas que al
> reevaluar la oportunidad ahora si deberia tener mas linea para poder asignar y pasar ese gate. Pero
> agregalas al activo con un codigo o marca especial para que las puedas distinguir. ¿Quedo listo?»

La respuesta era **no**. Tres huecos, y uno más que apareció por el camino.

## Los cuatro hallazgos, medidos

**1 · La cabecera no era la suma.** En **217 de 224** clientes en estado B superaba a la suma de sus
líneas: brecha mediana **13,7 %**, p90 **19,7 %**, **$36.024.682.300** acumulados. Venía de que el
dimensionamiento tomaba `aprobada × (0,78 + rnd()×0,14)` como presupuesto, o sea le restaba una holgura
sorteada del 8 al 22 % — coherente con la regla 7, que definía el nivel 1 como un campo asignado y *no*
un consolidado. Son dos modelos y sólo uno puede estar en los datos: **regla 45, ADR-0011**.

**2 · El wizard inventaba el RUT del deudor.** `construirDeudorLinea` lo armaba con
`` `${76000000 + (h % 20000000)}-${"0123456789K"[h % 11]}` ``. Medido sobre 400 deudores: **92 % con
dígito verificador inválido** y **100 % desconocidos** para el sistema. Y los candidatos que ofrecía la
búsqueda eran las **23** razones sociales de `SPREAD_MIN_DEUDOR` —la tabla de spreads mínimos, no un
catálogo de empresas—, así que el ejecutivo veía pre-cargadas empresas con las que su cliente jamás
había trabajado. Consecuencia: **el bucle que cerré ayer (regla 44) no cerraba por el camino del
wizard**, sólo por la solicitud automática del cierre de oferta, que sí lleva el RUT de la factura.
**Regla 46.**

**3 · Las líneas del comité no llevaban marca.** Sólo el prefijo del id. Ahora el activo trae
`Origen` + `IdProceso` como campos de primera clase (todas `MAESTRO`), y lo que el comité constituye
—línea nueva, ampliación de una LF2 y excedente al comodín— queda marcado `COMITE` con su proceso.

**4 · Una identidad que la migración del padrón no alcanzó.** `4.603.315-2 · «Automotriz Puerto Montt
y Cía. Ltda.»` en `DEUDORES_AUTORIZADOS`: RUT en **rango de persona natural** y **DV inválido**.
Sobrevivió porque `migrar_padron.js` mapea por los RUT del A1 y ese deudor no aparece en ninguna
factura — y porque `padron.test.mjs` miraba `RUTEmisor` y `RUTRecep` y **nada más**: el campo `RUT` de
los catálogos nunca se revisó. El gate ahora mira los cinco campos, con una sonda por campo, y la fila
salió con `sanear_catalogo_deudores.js`.

## Lo que hay que recordar del método

**El gate re-anclado encontró el defecto siguiente.** `e2e-15-quater-bis` exigía `\d{8}-[\dK]` en la
celda del nombre: ocho dígitos SEGUIDOS, que es exactamente la forma del RUT que el wizard inventaba.
Al pasar a RUT reales el gate cayó. Aflojarlo a «hay algo con guión» habría dejado pasar justo lo que
la regla 46 vino a cerrar, así que se re-ancló **exigiendo más**: RUT bien formado y con **dígito
verificador válido**.

**Y mi primer re-anclaje estaba mal.** `(\d{1,3}(?:\.\d{3})*)-([\dkK])` reportó «DV inválido» en
`76121572-8`, que es un RUT perfectamente válido: el patrón calzaba sólo los últimos tres dígitos
(`572-8`). El activo lleva **los dos formatos a propósito** —`migrar_padron.js`: «el formato del RUT se
conserva por campo», `RUTEmisor` sin puntos y `RUTRecep` con ellos—. La versión correcta acepta ambos y
lleva dos miradas atrás: `(?<!\d)` para no empezar a media cifra y `(?<!\d\.)` para no arrancar en el
segundo grupo de un RUT con puntos. Se probó **en Node contra cinco casos plantados** antes de gastar
otra corrida de cinco minutos del e2e.

**El costo de no medir primero:** el primer diagnóstico que escribí decía que el RUT no resolvía. No
era eso — resolvía perfecto y el error era mío, en el gate.

## Lo que cambió de significado

La regla 45 **reemplaza la primera viñeta de la regla 7** («campo ASIGNADO al cliente, no un
consolidado»). El resto de la 7 sigue vigente y la 45 lo dice, en vez de dejar dos textos que se
contradicen. La estructura se movió: **3.636 → 3.667** objetos de línea, y el total aprobado del
sistema quedó en **$269.800.885.228**, que es exactamente lo que el maestro A7/A8 declara — antes esa
cifra y la suma de las líneas no coincidían.

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **266 gates de contrato** ·
**151/151** la suite · **28/29** e2e. El único rojo sigue siendo `e2e-29-b`, que ya lo estaba antes de
la regla 44. El paso 7 no aplica: las capturas cubren las 9 vistas de la navbar y ni el wizard del
comité ni Configuración están entre ellas.
