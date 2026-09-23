---
type: sesion
title: "Sesión 2026-09-23 (cierre) — La cartera comercial se lee, no se inventa (regla 62)"
description: "Los dos generadores que quedaban dentro de la app sorteaban el volumen del cliente, su competidor y sus «malos deudores». No era sólo suciedad: el volumen salía en una escala que nadie declaraba y cuatro KPI de Reportes lo pasan por fmtMMc, así que mostraban del orden de M$5 donde va la cartera de 500 clientes. Los cuatro campos pasan a leerse del A11 y de la nota de corte; el fallback sintético de 80 empresas se retira entero; y las series de referencia del mercado pasan a pesos"
tags: [sesion, unidades, generador, regla-49]
timestamp: 2026-09-23T16:00:00Z
feature: null
---

# Sesión 2026-09-23 (cierre): la cartera se lee, no se inventa

## Hecho

- **Los cuatro campos que `PC_CLIENTES` sorteaba pasan a leerse de activos que ya existían**: el
  **volumen** del `COLOC_PROM_12M` del A11 (colocación promedio 12m, en pesos, medida sobre las cesiones
  del A2); el **competidor** del detalle por cesionario del mismo A11, tomando el mayor que no somos
  nosotros; y los **malos deudores** de la proporción de sus deudores bajo `NOTA_PRIORITARIA`.
- **El fallback sintético de 80 empresas, retirado entero.** Armaba nombres con tres listas, sorteaba RUT
  y fabricaba volumen y SOW. Sin activo, `PC_CLIENTES` queda en `[]`.
- **Las series de referencia del mercado pasan a PESOS** (`PC_MERCADO`, `PC_SECURITY`, `PC_ZONA`) y el eje
  del gráfico de zonas usa `fmtMM` en vez de rotular a mano.
- **Regla 62** con su gate propio, `regla_62.test.mjs`, que lee el fuente como texto y mira tres cosas
  dentro del catálogo: que no vuelva a sortear, que lea el A11, y que **el fallback no vuelva**.

## Decisiones tomadas con el usuario

- **«Saca esos generadores y cuando los implementes, que escalen en pesos.»** Se sacaron los cuatro
  sorteos, no sólo el que tenía la escala mala: el competidor inventado era igual de falso y más visible
  —la ficha del cliente lo nombra en cuatro frases—.
- **El corte del 50% que parte «buenos / con malos deudores» es de PANTALLA**, y está dicho como tal en el
  código. La regla de negocio es la nota (`NOTA_PRIORITARIA` = 4,2), que es la misma que decide a qué
  deudor se le abre oportunidad; el 50% sólo parte el panel de segmentos en dos.

## Errores encontrados y su solución (regla 11)

- **Cuatro KPI de Reportes estaban mal y nadie lo había visto.** `vol` valía entre 5.000 y 65.000 en una
  escala sin declarar, y «cedido», «Buenos», «Malos» y «Brecha de wallet» lo pasan por `fmtMMc`, que
  **divide por un millón**: la cartera de 500 clientes se mostraba como **M$5** y pico. Es un factor de un
  millón, la misma familia del 14-09, escondido detrás de una cifra que igual se ve plausible.
- **`vaA` ahora puede ser null** —un cliente que sólo cede a nosotros, o un prospecto sin mix— y lo
  nombraban cuatro frases. Cada una recibió su forma sin nombre («Dejó de operar. Contacto directo…»)
  en vez de un competidor de relleno: inventar uno habría sido volver al mismo defecto por la puerta de
  atrás.
- **El gate de invariantes cazó la regla antes de que existiera.** Al escribir el comentario del código
  cité «regla 62» y `invariantes.test.mjs` falló con «el .jsx cita «regla 62» y esa regla no está en el
  índice». Es el orden correcto: la regla se escribe, no se cita y después se busca.
- **El gate de cifras cazó seis conteos de una sola vez** —reglas de dominio, archivos de contrato en dos
  documentos, gates por regla en otros dos, y los tests del tablero—. Confirma la nota de las sesiones
  anteriores: al agregar una regla **y** un archivo de gate, correrlo enseguida.

## Pendiente / siguiente paso

- Subir a `main` con `merge --no-ff`, confirmando con el usuario. La rama acumula seis commits.
- **`Capturas_UI/` no se regeneró** aunque el cambio toca la UI (paso 7). Están desfasadas desde antes y
  su regeneración sigue atada a la **deuda 2** del tablero: el tubo se retrata a mitad del stream, así que
  no son deterministas y capturar ahora mezcla ruido no relacionado en el diff. Es decisión del usuario.
- La auditoría `Auditoria/Auditoria_Generadores_En_App.md` sigue teniendo hallazgos abiertos de la misma
  familia (§2.1 O01–O03, §2.4 repositorio documental, §2.6 libro de ventas, §2.7 plan mensual): esta
  sesión cerró el de la cartera comercial, no la lista.

## Sorpresas y aprendizajes

- **Un dato inventado con la escala mala se esconde mejor que uno sin escala.** Si «Brecha de wallet»
  hubiera mostrado 0 o `NaN`, alguien lo habría reportado el primer día. Mostraba **M$5**: una cifra
  chica, plausible para un mes flojo, y por eso sobrevivió.
- **Los reemplazos ya existían todos.** Ninguno de los cuatro campos necesitó un activo nuevo: el A11 ya
  publicaba la colocación y el mix por cesionario, y la nota de corte ya estaba en el fuente como
  constante con nombre. El invento no llenaba un hueco de datos, llenaba un hueco de lectura.
- **El gate más útil de los tres que escribí es el que vigila que el fallback no vuelva.** Los otros dos
  protegen algo que hoy está bien; ése protege contra una tentación concreta y recurrente — «rescatar la
  demo cuando no hay datos»—, que es exactamente cómo llegaron esas 80 empresas.
