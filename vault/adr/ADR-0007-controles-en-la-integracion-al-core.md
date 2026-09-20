---
type: adr
title: "ADR-0007 — Los controles del giro se vuelven a mirar al aprobar la integración al core"
description: "Por qué la aprobación de Operaciones N3 pasó a exigir los tres controles (otorgamiento resuelto, verificación completa y cada factura con línea asignada) además de la huella, y por qué no se resolvió avisando sin bloquear, ni dejándolo sólo para el servidor, ni re-asignando la línea en ese punto"
tags: [adr, otorgamiento, giro, operaciones]
timestamp: 2026-09-20T04:10:00Z
estado: aceptada
reemplaza: null
---

# ADR-0007: los controles del giro se vuelven a mirar al aprobar la integración al core

## Contexto

Al documentar el proceso de gestión de excepciones (19-09-2026) el usuario revisó la tabla de §5.3 y
apuntó que faltaban dos controles: que **Operaciones apruebe** —que todo esté correctamente
excepcionado— y que **ninguna factura quede sin línea aprobada y asignada**. Medido en el fuente ese
mismo día: la aprobación de Operaciones existía tal cual, pero **el botón sólo comprobaba dos cosas**,
la atribución del que firma (OTG-01) y la huella del paquete (GIR-02).

El resto se daba por hecho, y con una razón que parecía suficiente: `etapaTrasFirma` deja la operación
en «Otorgamiento / Verificación» mientras falte excepcionar, llamar o adjuntar, y sólo cuando todo eso
se resuelve pasa a «Pendiente Integración». O sea que una operación no podía *haber llegado* al botón
con algo pendiente.

Lo que esa lectura pasa por alto es que **esa es la foto del momento en que se resolvió**, y entre ese
momento y el clic de Operaciones pueden pasar días. En el medio:

- un apoderado puede **revertir** un visado —la acción existe, es legítima y está en el proceso—;
- la verificación puede **retirar** una factura que el deudor no confirmó, y eso reescribe el paquete;
- el cupo de una línea puede **consumirse en otro negocio** del mismo cliente, porque la línea es un
  recurso compartido y el disponible lo devuelve una API, no esta pantalla.

Ninguna de las tres mueve la etapa hacia atrás, y la huella no se entera de dos de ellas: el paquete
puede ser exactamente el que el cliente firmó y aun así no estar en condiciones de entrar al core.

## Decisión

Una función pura, **`controlesIntegracion(deal, estado)`**, es el único sitio que decide si la
integración al core se puede aprobar. Exige cuatro cosas y devuelve las faltas **con su código**:

| Código | Qué exige |
|---|---|
| **OTG-02** | ninguna excepción sin decidir ni rechazo re-evaluable sin regularizar, sobre el visado **vigente** |
| **VER-01** | todas las facturas con su verificación telefónica completa |
| **LIN-01** | **cada factura** del paquete con línea aprobada y asignada, mirada una por una sobre la asignación de la versión |
| **GIR-02** | la huella de lo que se va a inyectar calza con la de lo que el cliente autorizó |

Se comprueba **dos veces**: el botón queda deshabilitado con la lista de faltas a la vista, y
`aprobarIntegracion` vuelve a llamarla **antes de escribir**, porque la pantalla puede venir de hace un
rato y un botón deshabilitado no es un control. El intento bloqueado va a la auditoría con los códigos
en la acción y severidad alta. La atribución (OTG-01) se sigue comprobando **primero**: quien no puede
firmar no tiene por qué recibir el detalle de lo que falta.

Queda como **regla 41**, con el caso **144** de la suite —que la prueba en las dos direcciones— y el
gate `regla_41.test.mjs`, que vigila el cableado: que la pantalla use la compuerta, que el handler la
vuelva a llamar y que la auditoría nombre los códigos.

## Alternativas consideradas

- **Avisar sin bloquear** (mostrar lo que falta y dejar aprobar igual) — descartada: lo que está del
  otro lado del botón es dinero saliendo. Un aviso que se puede ignorar es exactamente lo que produce
  la operación «Girada» con criterios sin aprobar a la vista que ya se vio una vez (regla 26).
- **Dejarlo sólo para el resolver del servidor** — descartada como *única* medida, no como destino: el
  servidor es quien de verdad lo hace cumplir, y así está escrito en los invariantes. Pero mientras el
  motor corra en el navegador, no anticiparlo deja al encargado de Operaciones apretando un botón que
  en producción fallaría, sin saber por qué. Anticipar el rechazo con el **mismo código** es lo que el
  cliente puede hacer.
- **Re-asignar la línea en el momento de integrar**, en vez de leer la asignación de la versión —
  descartada: una operación aceptada se lee de su versión y no se re-evalúa (regla 12). El cupo ya está
  reservado en el sistema de líneas, así que el disponible viene **neto** de esa reserva y re-asignar
  mostraría menos cursable del que el cliente firmó. La versión es la evidencia de lo acordado;
  recalcularla encima sería reescribir el acuerdo.
- **Mirar sólo el total contra la línea del cliente**, que es lo que ya hacía `requiereOtorgamiento` —
  descartada: un paquete puede caber holgado en la línea global y traer igual una factura sin línea de
  par, que es justamente la que se fue al comité. El core no tiene contra qué imputarla.
- **Dejar pasar cuando no hay asignación** (no poder medir como equivalente a estar bien) — descartada:
  se falla **cerrado**. No poder afirmar que cada factura tiene cupo no es lo mismo que afirmar que lo
  tiene, y en una compuerta sobre plata que sale, la duda se resuelve en contra.

## Consecuencias

**Positivas**
- El último control antes del giro deja de confiar en una foto de hace días.
- El encargado de Operaciones ve **qué** falta y **qué código** es, en vez de un botón apagado.
- La decisión vive en una función pura, extraíble tal cual a un resolver: es la misma forma que tienen
  los otros motores.

**Negativas / deuda asumida**
- Una operación que antes se integraba con un clic puede quedar detenida por un visado revertido o una
  factura sin cupo. Es el punto, pero cambia el ritmo de trabajo de Operaciones y hay que decirlo.
- La compuerta lee la asignación de la versión; una operación **sin ninguna versión con asignación**
  queda bloqueada hasta que se genere una. En la demo eso sólo ocurre en operaciones armadas a mano.
- Un control más que mantener en dos sitios —la pantalla y el handler— hasta que el resolver exista.

**Eje del trade-off.** Compra **que no salga plata sobre una operación que dejó de estar en regla** a
cambio de **operaciones detenidas en el último paso** y de un control que hay que sostener en el
cliente mientras el motor siga ahí.
