---
type: sesion
title: "Sesión 2026-09-21 — Dos defectos que el usuario vio en pantalla: la identidad de la sesión y el atajo del otorgamiento automático"
description: "Por qué la Ejecutiva de verificación no podía verificar (el selector de la demo movía el rótulo y no la sesión) y por qué una operación mostraba «otorgamiento automático» con 38 criterios por aprobar al lado (el atajo no miraba el visado y se saltaba OTG-02)"
tags: [sesion, sesion-identidad, otorgamiento, verificacion, contrato]
timestamp: 2026-09-21T23:55:00Z
feature: null
---

# Sesión 2026-09-21: la identidad de la sesión y el atajo del otorgamiento

## Lo pedido

Dos reportes del usuario, los dos con captura y los dos de la forma «esto está raro»:

1. *«Revisa por qué el ejecutivo de verificación no puede verificar»* — la navbar decía **Camila Soto ·
   Ejecutivo de verificación** y las cuatro filas de la mesa decían «sólo el Ejecutivo de verificación
   puede marcarla».
2. *«Esto está rarísimo, ¿por qué hay deudores en la operación con requerimientos de otorgamiento?»* —
   el tab mostraba el cartel verde «Otorgamiento automático · sin intervención de un especialista» y a
   un centímetro, en el mismo resumen, «**Criterios por aprobar 38**».

(Queda **pendiente** la petición con la que se abrió la sesión: reestructurar la Mesa de verificación
como un listado de FACTURAS agrupadas por deudor, con marcar/adjuntar/anotar por factura. No se empezó.)

## 1 · La identidad de la sesión (regla 41)

**Diagnóstico, medido y no leído.** El selector de usuario de la demo llama a `setUsuario` —estado de
React— y **no toca `SESION`**. Los permisos preguntan por `SESION.usuario`, que es el código con que se
hizo login y **nunca es `null` en la pestaña principal**, así que el `|| usuario` que venía detrás no se
consultaba jamás. Con el selector en Camila: `SESION.usuario === "CR"`,
`puedeVerificarFacturas("EV") === true`, `puedeVerificarFacturas(SESION.usuario) === false`.

**Lo que lo hacía difícil de creer**: en la pestaña del DETALLE `SESION` es `null` —se llega por un
ticket, no por login— así que ahí el respaldo sí aplicaba y Camila **sí** podía marcar. El mismo permiso,
la misma persona, dos respuestas según la pestaña.

**El arreglo va en el selector, no en el permiso.** `suplantarSesion(code)` cambia la identidad de la
sesión en curso —sin reabrirla: los dos relojes y el tenant son de la sesión, no de la persona— y
`cambiarUsuario` queda como el único sitio que cambia de persona, moviendo las dos mitades. El cambio de
identidad va a la bitácora. El `|| usuario` se queda, porque es el respaldo de la pestaña del detalle.

## 2 · El atajo del otorgamiento automático (regla 42)

**Son dos preguntas distintas y el código las trataba como una.** `requiereOtorgamiento` es una
heurística **anterior al motor de reglas**: ¿hay deudores «Otro»?, ¿se supera la línea? Responde si hace
falta un especialista *por línea o por deudor*. El **visado** evalúa las 77 reglas del CLIENTE y no tiene
nada que ver con la lista del deudor: por eso una operación de puros Prime dentro de línea puede tener 38
criterios esperando excepción. El cartel verde afirmaba que no hacía falta nadie **y además escondía la
lista de criterios**, que estaba detrás de `!deal.otorgAuto` — el peor de los dos mundos.

**Lo grave no era el cartel.** `otorgamientoCompleto` abría con `if (deal.otorgAuto) return true;` antes
de mirar el visado, y la rama periódica del atajo sólo comprobaba las llamadas, así que la operación
llegaba a «Pendiente Integración · esperando a Operaciones» con 38 criterios sin aprobar. **OTG-02 estaba
declarado en `INVARIANTES` y el código no lo obedecía por este camino.** No hizo falta decidir nada de
producto: el contrato ya estaba escrito y ratificado; faltaba que el código lo cumpliera.

Es la misma lección que la regla de la firma (caso 88), un nivel más abajo: **las compuertas mandan sobre
el atajo**. Cuando se cerró en el momento de firmar quedó viva en el avance periódico, que es el que
mueve la operación cuando nadie está mirando. Las dos ramas del avance se fundieron en **una sola**:
lo único que cambiaba entre ellas era la glosa, y separadas volverían a separarse.

## Lo que esta sesión deja anotado

- **Un identificador citado dentro de un string cuenta como lectura** para `auditar_aislamiento` (se
  redescubrió el 18-09 y se volvió a confirmar acá al revisar la pureza de `otorgAutoVigente`).
- **`subEstadoDe` sigue rotulando «Automático»** mirando sólo `d.otorgAuto`: la misma contradicción en
  chico, en el chip del tubo. No se tocó porque esos rótulos están gateados (casos 110, 111) y merece su
  propio caso. Está escrito en la regla 42 para que no se redescubra.
- **Los casos 144 y 145 se escribieron DESPUÉS del arreglo**, y conviene decirlo: el diagnóstico vino con
  el reporte del usuario, así que no hubo un rojo previo que mirar. Cada uno afirma exactamente la
  conducta invertida (con el código anterior, 145 habría dado `otorgamientoCompleto === true` con 38
  pendientes y 144 ni siquiera habría encontrado `suplantarSesion`).

## Verificación

Paso 0 prettier ✓ · 1 `tsc` sin TS1 ✓ · 2 sin duplicados ✓ · 3 build 41,3 MB ✓ · 4 **249 gates de
contrato** ✓ · 5 **145/145** ✓ · 6 **29/29** e2e ✓ · 7 las 11 capturas regeneradas ✓.
