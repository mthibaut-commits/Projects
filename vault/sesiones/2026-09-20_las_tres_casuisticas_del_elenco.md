---
type: sesion
title: "Las tres casuísticas del elenco: el dato estaba, faltaba mirarlo"
description: "e2e-29-b llevaba tres días rojo y el CI con él. El remedio propuesto era regenerar DTESync; la medición dijo que el pool ya tenía el caso y el que no lo miraba era el Directorio"
tags: [sesion, directorio, lineas, e2e]
timestamp: 2026-09-21T01:10:00Z
---

# Las tres casuísticas del elenco · regla 31 ampliada

## El punto de partida

`e2e-29-b` estaba rojo desde el commit del padrón real, y **con él el CI de la rama**: el workflow corre
los seis pasos, así que un e2e rojo lo pone rojo entero. Tres corridas seguidas fallidas, y por eso el
push a `main` quedó denegado por el clasificador (`[CI Bypass]`) — con razón.

El usuario había propuesto el remedio:

> «Creo que debes forzar que en pool de datos existan rut deudores sin linea (fuera del directorio),
> otras con un mix de deudores con linea, y con linea parcial; asi estan los 3 casos. Creo que lo mejor
> es **regenerar los datos de dtesync** para que sean coherentes con estas casuisticas.»

## Lo que dijo la medición

**No había que regenerar nada.** De los **496** clientes que cumplen el perfil del Directorio (≥5
deudores, ≥30 facturas comprables), **37 ya tienen un deudor de CUPO CERO** — sin línea de par viva y
con el comodín de su cliente sin nada disponible. Uno de ellos, `76423742-0`, tiene los 11.

El pool tenía las tres casuísticas. **El que no las miraba era el elenco:** `construirDirectorio`
elegía sus 5 clientes por orden de RUT y por si la línea del **CLIENTE** cubría la oferta —`parcial =
monto > disponible`—, sin preguntar nunca si algún **DEUDOR** quedaba sin cupo. La regla 31 prometía
dos casos (3 dentro de línea, 2 parciales) y el tercero quedaba al azar.

Regenerar DTESync habría movido 30.000 facturas y todos los activos derivados para conseguir algo que
ya estaba ahí. Vale la pena anotarlo: **el remedio propuesto era más caro que el problema, y medir
primero lo mostró en dos minutos.**

## El arreglo

`DIRECTORIO_PERFIL.carencia = 2` y una cuota que va **antes** de la general de parciales —si va después,
las primeras por orden de RUT se la comen—. La carencia se **mide** sobre las líneas reales del
cliente (pares vivos + comodín disponible), no se sortea: el elenco lee la cartera, no la inventa.

**Son las DOS parciales y no una.** Con una sola, quien recorre la demo —o un caso e2e— abre la
primera fila de «Sin línea» que encuentra, no la que tiene el escenario, y la mitad de las veces el
tercer caso seguía sin verse. Eso fue exactamente lo que pasó: con `carencia: 1` el elenco SÍ incluyó
al cliente con carencia (`OP-DIR4`, comodín en 0 y 11 facturas con motivo `lf4`), y el e2e siguió rojo
porque abrió la otra.

## La trampa del caso 129

La suite tiene una **reimplementación independiente** del elenco (`referencia()`) escrita desde el
texto de la regla, y compara RUT por RUT y folio por folio contra la real. Al cambiar la selección
quedó en rojo — que es exactamente para lo que existe. Se le agregó la misma cuota, escrita desde la
regla como el resto de esa copia. **No es un snapshot que se actualiza**: si las dos implementaciones
dejaran de coincidir, el caso lo dice.

## Verificación

Los seis pasos, y esta vez enteros: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build ·
**268 gates de contrato** · **151/151** la suite · **29/29 e2e**. Es la primera corrida completamente
verde desde el 20-09. El paso 7 no aplica: el elenco del Directorio no sale en las capturas, que
retratan el tubo con el stream corriendo.

## Lo que queda

Nada mío en la rama. Del usuario, desde Windows: el tag `v0.1.0` y borrar las ramas integradas (proxy
403), correr el `.bat` una vez, y decidir sobre `Capturas_UI/` (deuda 2: no es determinista).
