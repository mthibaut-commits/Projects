---
type: sesion
title: "El tab de Verificación: informativo al simular, el deudor decide y la factura se llama"
description: "Tres pedidos del usuario sobre la misma pantalla, y el hallazgo de método: la primera versión del caso e2e afirmaba «no aparece el botón de firmar» con una sesión que no puede firmar nunca — pasaba con el defecto plantado"
tags: [sesion, verificacion, e2e, pantalla]
timestamp: 2026-09-22T08:00:00Z
---

# El deudor decide, la factura se llama · regla 53

## Qué pidió el usuario

Tres mensajes distintos, todos sobre el tab de Verificación del detalle:

> «Cuando se simula debiera habilitarse el tab de Verificación de manera informativa con el detalle de
> las facturas que se requieren verificar y cuáles no.»
>
> «Me parece que el concepto Lista Blanca ya no se utiliza, puedes revisar; prefiero que incluyas ahí
> el Chip de Prime y la Nota Deudor.»
>
> «Puedes separar la información de la evaluación de si el deudor requiere verificación o no de la
> información de factura; las causas de verificación son asociadas al deudor y no a la factura, por lo
> que asocia la información de verificación al deudor y el quiz de la verificación telefónica a cada
> factura. Pero no los mezcles.»

## 1 · La compuerta protegía lo que no había que proteger

La regla 6 escondía el tab hasta pre-evaluar o publicar la oferta, y el argumento escrito era bueno:
llamar a un deudor toma **3–4 horas**, retrasa el giro, y hacerlo por facturas que el ejecutivo quizá
retire es tirarlas. Pero ese argumento **justifica no dejar llamar, no dejar a ciegas a quien está
armando la oferta** — y la propia regla 6 abre diciendo que «el ejecutivo tiene que saber ANTES de
comprometer un plazo». La compuerta estaba puesta un paso antes de donde el daño ocurre.

Ahora el tab aparece en cuanto hay **oferta simulada**, y lo accionable se calcula aparte:

```js
const verifAccionable = !!(deal && (tienePreEval(deal.id) || ofertaPublicada(deal) || […etapas]));
const mostrarVerif    = !!(deal && (deal.facturasOp || []).length && (verifAccionable || deal.simulado));
//                      <VerificacionTab … informativo={!verifAccionable} …>
```

**Se pasa la NEGACIÓN de lo accionable, no `deal.simulado`.** Las dos expresiones dicen lo mismo hoy y
dejarían de coincidir en cuanto se agregue un tercer camino accionable — y el tab quedaría mudo justo
donde hay que trabajar.

En informativo, `puedeAccionar = puedeMarcar && !informativo` gatea **las dos acciones que dejan
evidencia**: registrar la llamada y retirar la factura no confirmada. Y el modo **se anuncia**: un tab
de sólo lectura sin cartel se lee como un tab roto, y quien busca el botón que no está reporta un
defecto que no existe.

## 2 · El chip nombra el segmento, no la lista de la que salió

Decía «Lista Blanca» / «Autorizada». Dice **Prime**, que es la unión de las dos y es exactamente lo
que el predictor usa para recortar el protocolo a 6 criterios. `verifFactura` ahora **propaga `prime`
en sus DOS salidas** —la fresca y la congelada; con una sola, el chip desaparecería justo después de
la llamada— para que la UI no tenga que comparar contra la cadena retirada.

`DEUDOR_LABEL` y `DEUDOR_CHIP` **se eliminaron**: vivían sólo en este tab. Dejarlos habría sido código
muerto con el nombre retirado adentro, y el auditor los habría reportado.

La **Nota Deudor** va rotulada: era un número suelto entre el chip y el nombre, y nada decía de qué
era. Sin nota en el maestro se muestra **`s/n`** en gris, no `0`, que es la peor nota posible. El color
lo fija `NOTA_COLOR`; se retiró la copia local `notaCol`, idéntica.

## 3 · Los criterios son del deudor; el quiz, de la factura

`verifDecision` calcula V00–V10 **una vez** sobre el conjunto de facturas del par. Dibujarlos dentro de
cada fila mostraba el mismo dato N veces y —esto es lo que el usuario señaló— **sugería que la factura
tenía criterios propios**. No los tiene. Subieron al panel del grupo, que abre la cabecera del deudor,
junto con la tarjeta del veredicto y el segmento.

La fila de factura abre **sólo el quiz** —existencia, recepción conforme y fecha de pago de ESE
folio—, y sólo cuando hay llamada que mirar: la pendiente, o la ya registrada, que sobrevive al
veredicto congelado. Una factura que el modelo dio por verificada no tiene quiz y su fila no dibuja
chevron ni cursor; ofrecer un panel vacío es peor que no ofrecer nada.

## El hallazgo de método: una aserción que no vigilaba nada

El caso e2e pasó a la primera. Lo planté igual —`puedeAccionar = puedeMarcar`, o sea el modo
informativo dejando firmar— y **siguió pasando**.

La causa: el harness inicia sesión como la ejecutiva comercial, y `puedeVerificarFacturas` sólo
devuelve `true` para el **Ejecutivo de verificación** (o quien lo cubre). El botón no estaba **por el
permiso**, no por la compuerta. Mi aserción afirmaba algo verdadero por una razón que no era la que
decía medir.

*Solución:* los dos casos cambian la sesión a `EV` con el selector del detalle, y se agregó el caso
**B**, que prueba **la otra dirección sobre la misma pantalla**: pre-evaluar retira el cartel y hace
aparecer los dos botones. Con eso el negativo del caso A deja de poder pasar solo. Replantada la
violación, los dos casos caen.

Es la misma familia que las sondas del 20 y el 21 (`replace` que pegó en un comentario, una sonda que
neutralizaba en vez de borrar): **un verde que no se comprueba en rojo no es evidencia**. Y acá con un
agravante que vale anotar: esta vez la sonda sí plantaba bien; lo que estaba mal era **el entorno de la
aserción** — el usuario de la sesión. Plantar el defecto es necesario y no basta: hay que plantarlo
donde la aserción de verdad mire.

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **363 gates de contrato**
(46 archivos, +16 del gate nuevo, 15 de ellos sondas) · **156/156** la suite · **31/31 e2e** (+2).
Sin caso de suite: `VerificacionTab` es un componente y la suite no monta componentes.

`cifras.test.mjs` hizo su trabajo dos veces: las cuatro cuentas que el gate nuevo movió y las tres que
movieron los casos e2e salieron reportadas antes del commit, no después.

**El paso 7 no aplica, y no es un atajo.** `capturar_pantallas.mjs` retrata el detalle en su pestaña
pero en el tab que abre por defecto —Negocio—: la captura no mostraría nada de lo que cambió. Lo que
sí lo muestra es el paso 6, que abre ESTA pantalla con sesión real y lee su contenido. `Capturas_UI/`
sigue sin regenerarse por lo de siempre: no es determinista (el tubo se retrata a mitad del stream) y
regenerarla es decisión del usuario — deuda 2 del tablero.
