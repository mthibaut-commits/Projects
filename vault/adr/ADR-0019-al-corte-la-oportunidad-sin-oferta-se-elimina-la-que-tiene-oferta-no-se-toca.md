---
type: adr
title: "ADR-0019 · Al corte del día la oportunidad sin oferta se elimina; la que tiene oferta no se toca; el corte es por reloj porque el inbound de producción es continuo"
description: "Cierra la decisión #3 del spec del curse (M-07, M-08): «gestionada» es la oportunidad que tiene oferta y nunca se elimina; la que no la tiene se elimina a la hora de corte del tenant y el inbound la vuelve a abrir al reinicio como oportunidad nueva con referencia. Reemplaza la reapertura con el mismo id de `rolloverDia` y el parámetro «etapa no gestionada» del tenant"
tags: [adr, inbound, corte-dia, oportunidad, curse]
estado: aceptado
timestamp: 2026-09-23T02:00:00Z
---

# ADR-0019 · Al corte del día la oportunidad sin oferta se elimina; la que tiene oferta no se toca

## Contexto

El modelo del proceso de curse (M-07, M-08) dice que a la hora de corte «se eliminan las oportunidades no
gestionadas» y que a las 06:00 «se reinicia». El sistema hace otra cosa: `rolloverDia` corre cuando el
contador de corridas del cron completa un día, toma las oportunidades del inbound que quedaron en la etapa
que el tenant configura como «no gestionada» (por defecto Prospección) y las **reabre con el mismo id**,
con el paquete rearmado desde la base, sin simular y con la oferta vacía; conserva ejecutivo, bitácora y
contactos y cuenta la reapertura. El id se conservó por un incidente del 17-09-2026: cuando cambiaba, el
aviso `nex-simulado` del detalle viajaba con el id viejo y el tubo lo descartaba. `spec-ciclo-factura.md`
§17, en cambio, describe la re-originación como «una oportunidad nueva, con su propio identificador».

El 22-09-2026 el usuario decidió que la hora de corte (23:00 por defecto) y la de reinicio (06:00 por
defecto) son parámetros del tenant que el job consume. Quedó abierta la decisión #3 de §15 del spec:
eliminar o reabrir, y qué es «no gestionada». El 23-09-2026 respondió:

> «Hoy el corte es por corridas (demo) pero en producción será un continuo. Las oportunidades que han sido
> gestionadas por el ejecutivo (tienen oferta) no se eliminan.»

## Decisión

1. **El corte y el reinicio son por reloj, no por conteo de corridas.** El conteo es un artificio de la
   demo: en producción el inbound es un proceso continuo y no hay «N corridas» a las que colgar el cierre.
   El job consume la hora de corte y la de reinicio del tenant (decisión del 22-09-2026).
2. **«Gestionada» es la oportunidad que tiene oferta**: el ejecutivo la simuló, y con eso existe una oferta
   (etapa Oferta o posterior). Un paquete de facturas elegidas sin simular no es una oferta todavía: sigue
   en Prospección y se elimina como cualquier otra sin oferta. Una oportunidad gestionada **no se toca** al
   corte, cualquiera sea su etapa. El parámetro «etapa no gestionada» del tenant deja de tener sentido: el
   criterio es «sin oferta», no una etapa configurable.
3. **La no gestionada se elimina** a la hora de corte: deja de existir para el ejecutivo y para el tubo. El
   cierre queda en la bitácora del sistema con el id, el cedente y el paquete que tenía.
4. **Al reinicio, el inbound la vuelve a abrir** desde lo que exista en la base —las facturas que tenía más
   las que llegaron— como una **oportunidad nueva, con su propio id** y una referencia a la eliminada, sin
   simular y con la oferta vacía. No es una reapertura: es una originación.
5. La regla «el id no cambia» sigue valiendo para todo lo que sobrevive al corte: nada que tenga oferta,
   versiones, visados o verificaciones cambia de identidad. Lo que se elimina no tiene nada de eso colgando.

## Alternativas descartadas

- **Reabrir con el mismo id** (lo de hoy, `rolloverDia`): conserva trazas y contactos, pero el modelo del
  negocio dice «eliminar» y el usuario lo reafirmó al precisar cuáles son las que no se eliminan.
- **«No gestionada» como etapa configurable del tenant** (`etapaNoGestionada`): la definición del usuario
  es funcional —tiene oferta o no la tiene— y no depende de cómo se llame la etapa.
- **Un criterio por actividad** (contacto registrado, detalle abierto): no lo pidió el negocio; una
  oportunidad con contactos pero sin oferta se elimina igual.

## Consecuencias

- Es un **T1**: cambia qué oportunidades ve el ejecutivo al día siguiente y qué trazas sobreviven. Lleva
  regla nueva con gate en la suite: al corte, la no gestionada desaparece y la que tiene oferta sigue
  idéntica; al reinicio nace otra con id nuevo y referencia (CP-022, en rojo; CP-021 queda sin caso;
  CP-023 pasa a «la que tiene oferta o está más adelante no se toca»).
- Cambian `rolloverDia` (elimina en vez de reabrir, y salta las que tienen oferta), el job por hora del
  tenant (G-02, G-03), la configuración del tenant (se retira «etapa no gestionada»), la regla del vault
  que hoy dice «EL ID NO CAMBIA» al reabrir (se reescribe en el commit que lo implemente) y
  `spec-ciclo-factura.md` §17, que ya describía la originación con id propio (GD-02 se cierra).
- Un detalle abierto sobre una oportunidad eliminada al corte queda huérfano: su aviso de simulación llega
  con un id que ya no existe y se descarta, que es la conducta actual ante un id desconocido. Que el job
  cierre esa pestaña con un mensaje es una mejora de pantalla, no parte de esta decisión.
