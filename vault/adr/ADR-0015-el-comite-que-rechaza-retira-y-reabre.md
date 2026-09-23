---
type: adr
title: "ADR-0015 · El comité de crédito puede rechazar una línea puntual; el rechazo retira las facturas del deudor y reabre la operación para una nueva firma"
description: "El comité es externo y responde aceptación o rechazo; NEX tiene que recibir el rechazo por la API de estado y, cuando llega, sacar de la oferta las facturas del deudor sin línea y reabrirla, porque el cliente tiene que volver a firmar el paquete que queda"
tags: [adr, lineas, comite, firma, curse]
estado: aceptado
timestamp: 2026-09-22T22:30:00Z
---

# ADR-0015 · El comité de crédito puede rechazar una línea puntual; el rechazo retira las facturas del deudor y reabre la operación para una nueva firma

## Contexto

El spec del curse (M-29) midió que el comité simulado sólo devuelve «Aprobada» u «Observada»: no existe un
estado de rechazo ni un manejador, y la regla 13 dice que después de aceptar la operación **sólo
encoge**. El usuario aclaró (22-09-2026):

> «Este es el comité de crédito, que es un comité que opera fuera de la plataforma y que da la
> aceptación o rechazo de las solicitudes de aumento de línea puntual cuando es necesario.»

Y sobre qué pasa con las facturas del deudor cuya línea se rechaza (M-18):

> «Si se rechaza la línea […] las facturas del deudor se deben retirar de la oferta y hacer una acción
> equivalente a reabrir la oferta, porque el ejecutivo la tiene que mandar a firmar de nuevo.»

## Decisión

1. La API de estado del proceso (API 3) puede devolver **«Rechazada»** por línea de detalle, además de
   «Aprobada» y «Observada». NEX la consulta en cada refresco, como hoy.
2. Al recibir el rechazo de una línea puntual, NEX **retira de la oferta las facturas del deudor** que
   dependían de ella, emite versión con el motivo, y **reabre la operación**: la firma anterior se revoca
   (regla 1) y el ejecutivo vuelve a publicar el paquete que queda para que el cliente lo firme.
3. Si al retirar no queda ninguna factura, la operación se pierde con causa «línea rechazada por el
   comité» (regla 5).

## Alternativas descartadas

- **Tratar el rechazo como «Observada»** y dejar la operación esperando. Descartada: un rechazo es una
  respuesta, y la operación no puede quedar aceptada sobre una línea que no existe.
- **Encoger sin nueva firma**, como hoy hace el retiro por verificación (regla 13). Descartada para el
  rechazo del comité: el cliente firmó un paquete que ya no es el que se va a cursar.

## Consecuencias

- Es un **T1**: cambia la máquina de estados después de la firma y precisa la regla 13 («sólo encoge»
  vale para la verificación; el rechazo del comité reabre). Regla nueva con gate y caso en la suite que
  inyecte un estado «Rechazada» y compruebe el retiro, la versión y la reapertura.
- Cambian el contrato de la API 3 (`Integraciones/`), `api3EstadoProceso` y el manejador de la bandeja
  de solicitudes.
- **Pendiente de confirmar por el usuario**: si el retiro por **verificación** (deudor que no confirma)
  también reabre y exige nueva firma, o sigue encogiendo con la firma vigente. Este ADR no lo decide.
