---
type: sesion
title: "Sesión 2026-09-22 — La mesa de verificación trabaja por factura, y el color del badge dice si ya se exige"
description: "La Mesa pasa a ser un listado de facturas agrupado por deudor, con marcar/adjuntar/anotar por documento; y los badges de otorgamiento y verificación dejan de nacer rojos mientras el ejecutivo todavía simula"
tags: [sesion, verificacion, mesa, ui, otorgamiento]
timestamp: 2026-09-22T01:00:00Z
feature: null
---

# Sesión 2026-09-22: la mesa por factura, y cuándo un pendiente pasa a exigirse

## Lo pedido

1. *«Necesito que esta funcionalidad sea la operación, un listado de facturas agrupada por deudor —a
   través del deudor se pueda acceder a las razones que gatilló la verificación—, pero que el core sea
   poder marcar si la factura está verificada o no, adjuntar un archivo y agregar una nota.»*
2. *«Al simular muestra el tab de verificación pero con el badge en morado; cuando el ejecutivo envíe a
   comité y publicar, se debe empezar a solicitar las acciones de otorgamiento y verificación, por lo que
   los badges son en rojo.»*

## 1 · La mesa trabaja por factura (regla 53)

**Lo que NO cambió, y es la mitad del diseño:** el agrupamiento sigue siendo por DEUDOR y las causas son
suyas. Una llamada cubre a todas sus facturas (regla 6), así que repetir las causas documento a documento
diría que cada factura tiene las suyas. Viven en la cabecera del grupo, detrás de un disclosure con sus
códigos a la vista — «a través del deudor», como pidió el usuario.

**Lo que sí cambió: la unidad de TRABAJO.** Cada factura es una fila con folio, tipo, las dos fechas,
monto, estado y sus acciones — marcar, **adjuntar** y **anotar**. No hubo que tocar el motor: la
confirmación PARCIAL ya existía y `verificarDeudor` ya escribía factura por factura; lo que faltaba era
poder resolverlas de a una, que es como ocurre la llamada.

**El hallazgo que el diseño anterior escondía.** Retirar una factura la saca de `facturasOp`, y la mesa
listaba sólo desde ahí: la evidencia de «ésta no la confirmó» **desaparecía de la pantalla justo después
de registrarla**, y con todas retiradas el deudor entero se esfumaba de la mesa aunque su veredicto
estuviera congelado — lo contrario de lo que la regla 6 pide. Ahora `filasVerificacion` arma `docs` con
las de la oferta **y** las vetadas: las retiradas se ven, tachadas, y no suman al monto.

**El respaldo es del documento** (`repoVerifRespaldo`): nota + adjuntos, aparte del hecho de la llamada,
porque se escribe en otro momento — el correo del deudor llega antes que la decisión, y el porqué de una
no confirmación se anota después de retirarla. Del archivo se guarda la **referencia**, no los bytes.

**Lo que sólo se vio usándola.** Marcar y anotar escriben en repositorios y no en `deals`, así que la
lista memoizada por `[deals, tick]` no se enteraba: el KPI no se movía y la nota no aparecía. **Retirar sí
cambia `deals`** —saca la factura de la oferta— y por eso ése funcionaba y los otros dos no. La sonda de
pantalla lo midió: `por verificar 4 · verificadas 0` después de marcar una. Se arregla moviendo el tick.

## 2 · Morado mientras se simula, rojo cuando se exige (regla 54)

El color no es decoración: dice **si eso ya es trabajo de alguien**. Mientras el ejecutivo arma la oferta,
los pendientes son una anticipación y el paquete puede cambiar entero; al **publicar** —cerrar y comunicar
al cliente— la casa se comprometió y pasan a ser trabajo. Estaba inconsistente y por eso se veía raro: el
chip de Verificación nacía ROJO desde la simulación mientras el de Otorgamiento era morado, en la misma
barra y sobre la misma operación. Dos colores para el mismo momento: uno de los dos mentía.

`exigeAcciones(deal)` es una sola función y es la misma compuerta del tab de Verificación **menos la
pre-evaluación**: pre-evaluar es justamente pedir el pronóstico antes de tiempo. Medido en pantalla con la
oferta simulada: los tres chips y el badge del tab en `rgb(124, 58, 237)` — morado. La transición la fija
el caso 158 en las dos direcciones y en el borde (cerrada sin comunicar **no** basta: publicar son dos
hechos); el gate exige que las dos superficies pregunten por la misma función.

## Dos defectos de mis propios gates, cazados por sus sondas

- `regla_53`: el patrón `[\s\S]{0,200}` para comprobar que `marcarDoc` mueve el tick **se colaba a la
  función siguiente** y pasaba con el `force` de `guardarResp`. Se ancló al cuerpo exacto de cada flecha.
- `regla_54`: contar los usos de `exigeAcciones` **en total** sobrevivía a que un chip volviera a un color
  fijo, porque cada chip lleva dos expresiones. Se cuenta por superficie.

Las dos veces la sonda negativa hizo exactamente lo que existe para hacer: un gate que no caza su propio
mutante no vigila nada.

## Verificación

Paso 0 prettier ✓ · 1 `tsc` sin TS1 ✓ · 2 sin duplicados ✓ · 3 build ✓ · 4 **300 gates de contrato** ✓ ·
5 **155/155** ✓ · 6 **29/29** e2e ✓ · 7 las 11 capturas regeneradas ✓.
