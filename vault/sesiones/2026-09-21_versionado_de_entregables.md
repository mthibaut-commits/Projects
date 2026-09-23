---
type: sesion
title: "Sesión 2026-09-21 — Versionado de los entregables y carpeta de capturas simuladas"
description: "Los 23 entregables de Specs_Procesos e Integraciones declaran versión N.N.N bajo el título y cierran con un anexo de control de versiones reconstruido del historial real del repo; md_a_pdf.mjs la estampa como píldora en la banda y como tag en el encabezado de cada hoja, y abre el anexo en hoja nueva; lo vigila versiones.test.mjs. Además nace Capturas_Simuladas/ para las capturas que exigen conducir la app"
tags: [sesion, documentacion, versionado, capturas]
timestamp: 2026-09-21T23:55:00Z
feature: null
---

# Sesión 2026-09-21: versionado de los entregables

## Hecho

- **Medido primero.** No había versionado: de 30 documentos, **dos** declaraban su propia versión
  (`spec-pricing-simulacion` 1.2, `spec-modelo-giro` 1.0), otros dos citaban la versión **de otra cosa**
  —«Modelo de Riesgo v1.0», «política v1.1»— y los PDF originales del cliente la llevaban **en el nombre
  del archivo**. Tres esquemas conviviendo y ninguno cubriendo el conjunto. El PDF generado no estampaba
  ni versión ni fecha: una carilla impresa suelta no se podía fechar contra nada.
- **Los 23 entregables** (`Specs_Procesos/` 10 + `Integraciones/` 13) declaran ahora
  `**Versión N.N.N · DD-MM-AAAA · NEX Factoring**` bajo el título y cierran con
  `## Anexo · Control de versiones`.
- **Las tablas salen del historial del repositorio, no de la imaginación.** `git log --follow` por archivo,
  agrupando por jornada —el trabajo sobre un documento en un día es una versión, no cinco— y descartando
  lo que no cambia el contenido (regenerar un PDF, mover una carpeta). De ahí salen entre 1 y 6 filas por
  documento; el más movido es `spec_s3_verificacion` con seis.
- **La numeración dice QUÉ CLASE de cambio hubo**, que es lo único que la hace útil: **mayor** si cambia lo
  que el sistema decide o el contrato —quien implementó contra la anterior quedó equivocado—, **menor** si
  entra una sección o un criterio, **parche** si es redacción o una cifra. Por eso los seis specs de entrega
  diaria saltaron a **2.0.0** el 16-09: el transporte pasó de SFTP a S3 y quien hubiera implementado la
  entrega por SFTP estaría depositando en el lugar equivocado. El layout no cambió, y la fila lo dice.
- **`md_a_pdf.mjs`**: saca la línea de versión del cuerpo y la convierte en cromo — **píldora en la banda** y
  **tag en el encabezado de cada hoja** (`v1.2.1 · 21-09-2026`) —, y abre el anexo con `break-before: page`.
- **`tests/contract/versiones.test.mjs`** (gate 40): cabecera presente y única *en la cabecera*, anexo como
  última sección, versiones de mayor a menor y —lo que importa— **la primera fila del anexo ES la versión
  declarada**. Con sonda negativa para cada una de las cinco.
- **`Capturas_Simuladas/`** (pedido aparte del usuario): la tercera clase de captura. `Capturas_UI/` es el
  estado por defecto, `Variantes_UI/` los estados del detalle y ésta **lo que exige conducir la app** —cruzar
  de ventana, esperar el mensaje `nex-simulado`, correr un cálculo que vive en otra pantalla—. Se mudó
  `tubo-tabla-simulada`, que estaba con las variantes sólo porque se llega igual. El hook `protect_paths`,
  `.gitignore`, `.prettierignore` y el gate de hooks la cubren igual que a las otras dos.

## Decisiones tomadas con el usuario

- **Tag en el header de cada hoja + tabla de anexo en la última página**, elegido entre tres opciones. La
  tercera —sólo versión, sin tabla— se descartó.
- **Sólo los 23 entregables.** `Auditoria/` y `Regresiones/` quedan fuera: son fotos con fecha y no se
  re-emiten —se escribe otro informe—, así que un número de versión ahí no significaría nada.
- **Esto NO reabre la regla del 16-09** («los entregables no llevan historial»). Lo que esa regla prohíbe es
  narrar **dentro del texto** que antes estaba mal («Nuevo en esta versión», tablas Antes/Ahora). El anexo es
  otra cosa: un bloque de control al final que dice qué cambió entre versiones, que es lo que un cliente
  necesita para saber si el papel que tiene en la mano es el vigente. Queda escrito en
  `Specs_Procesos/README.md` para que nadie tenga que volver a deducirlo.
- **El consolidado de integraciones lleva versión propia** (1.2.1) declarada en `armar_integraciones.mjs`, no
  en el `.md`: el `.md` es generado y editarlo a mano lo pisa la corrida siguiente. Los doce capítulos
  **conservan** su línea de versión —dice qué versión de ese spec reproduce el capítulo— y **pierden** su
  anexo: doce anexos seguidos dentro de un consolidado no se leen.

## Errores encontrados y su solución (regla 11)

- **La línea de versión, puesta en el cuerpo, se comía el propósito.** El conversor destaca el primer párrafo
  como bajada del documento (`p.lead`), así que el lector encontraba «Versión 1.2.0» donde va la explicación
  de para qué sirve el papel. Los dos documentos que ya la traían tenían el defecto desde el 12-09 y nadie lo
  vio. La solución es la misma que ya usaba con el H1: **extraerla del cuerpo** y renderizarla como cromo.
- **Cuatro documentos traían una SEGUNDA línea de versión en otro formato**
  (`**Versión:** 1.0 · **Fecha:** … · **Sistema:** …`) que el primer barrido no cazó porque los dos puntos
  van dentro de la negrita. Quedaron con dos versiones contradictorias hasta que se buscó «Versi» en las
  primeras ocho líneas de cada archivo. La lección: al normalizar un campo, **buscar el concepto, no el
  patrón que uno acaba de escribir**.
- **La regla de unicidad de la cabecera rompía el consolidado**, que reproduce doce capítulos con su propia
  línea de versión. Se acotó la exigencia a la **cabecera** —el texto antes de la primera sección—, que es
  donde vive la versión propia del documento, y se le plantó sonda: una versión dentro de una sección es de
  un capítulo reproducido y no es un fallo.
- **El gate `cifras.test.mjs` cazó el conteo** apenas entró el archivo 40: el tablero y `verificacion.md`
  decían 39. Es exactamente para lo que existe, y confirma la nota de la sesión anterior: al agregar un gate,
  correrlo enseguida.
- `invariantes.md` traía la fila de `generador.test.mjs` **dos veces**, idénticas: artefacto de una mezcla.
  Retirada una.

## Pendiente / siguiente paso

- Subir a `main` con `merge --no-ff`, confirmando con el usuario.
- `padron.test.mjs` no tiene fila en la tabla *Gates de contrato* de `invariantes.md`. No se tocó acá para no
  mezclar; es una línea.
- Sigue del usuario, desde Windows: el tag `v0.1.0` y borrar las ramas integradas (el proxy da 403).

## Sorpresas y aprendizajes

- **Un versionado sin criterio es decoración.** Lo que convierte «1.2.1» en información es la regla de cuándo
  sube cada dígito, y que alguien la pueda aplicar sin preguntar. Por eso está escrita en el README de la
  carpeta y repetida en una línea dentro de cada anexo: el lector del PDF no tiene el README al lado.
- **La cabecera y la tabla se desfasan solas.** Son dos sitios que afirman lo mismo, y el repo ya tiene el
  hallazgo 2.3 para eso. El gate que importa no es «declara versión» sino «la primera fila del anexo ES la
  versión declarada»: sin él, en la primera corrección alguien sube el número arriba y olvida la fila.
- **Reconstruir el historial desde `git log` salió mejor de lo esperado** porque los mensajes de commit de
  esta casa dicen **qué y por qué**. Una fila del anexo es casi el asunto del commit reescrito para el
  lector del documento. Es una razón más para no escribir «fix docs».
