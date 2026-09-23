# Casos de prueba — las cinco pantallas del ciclo de una operación

**Versión 1.0.0 · 23-09-2026 · NEX Factoring**

Qué hay que probar, a mano y en pantalla, en las cinco pantallas por las que pasa una operación: el
**tubo de Gestión diaria**, el **detalle de la oportunidad**, **Líneas**, **Verificación** y
**Otorgamiento**. Cada caso dice qué se hace, qué tiene que pasar, **qué regla de negocio lo fija** y si
ya hay una prueba automática que lo cubra — porque lo que ya está automatizado no necesita ojos y lo que
no, sí.

## 1. Cómo se lee un caso

| Columna | Qué trae |
|---|---|
| **Id** | `CP-<pantalla>-<n>`. No se renumera: si un caso se retira, su número queda libre y no se reusa |
| **Qué se prueba y cómo** | la acción, en los términos de la pantalla. Los rótulos van entre comillas y son los que la aplicación muestra hoy |
| **Resultado esperado** | lo observable. Si el caso puede fallar en las dos direcciones —un control que bloquea— el esperado dice las dos |
| **Fija** | la regla de dominio o el invariante del contrato que el caso protege. Las reglas viven en `vault/conocimiento/reglas/` y se citan por número; los invariantes son los códigos `TEN-01`…`PRI-01` |
| **Automatizado** | `suite N` = caso N de `tests_asignacion_lineas.js` · `e2e-…` = caso de `tests/e2e/` · `regla_….test.mjs` = gate de contrato · **manual** = nadie lo cubre todavía, y ése es el que hay que mirar |

**Los prefijos no se confunden con los invariantes.** `CP-OTG-03` es un caso de prueba; `OTG-01` es un
invariante del contrato con el servidor. El `CP-` de adelante es lo que los separa.

## 2. Lo que este plan NO cubre

- **Rendimiento, carga y concurrencia.** Dos apoderados resolviendo la misma excepción a la vez es un
  hueco conocido del servidor, no de la pantalla (`Specs_Procesos/Otorgamiento/spec-otorgamiento.md` §12).
- **Compatibilidad de navegador.** El entregable es un HTML que se abre en Chrome; nada más se probó.
- **Los motores por dentro.** `asignarLineas`, `verifDecision`, `prorratearOperacion` y los demás están
  cubiertos por la suite, que los llama por su nombre con estado inyectado. Acá se prueba lo que la
  pantalla **muestra** de esas decisiones.
- **Seguridad.** El contrato con el servidor declara qué decisiones son suyas; la pantalla las anticipa.
  Un caso de acá comprueba que la pantalla anticipa bien, no que el servidor esté protegido.

## 3. Antes de empezar

1. **Construir**: `node build_app.mjs` (o `Iniciar_NEX_Factoring.bat` en Windows) y abrir
   `pipeline_comercial.html` en Chrome. Sin `datos_inyectados.js` el pipeline queda en **0
   oportunidades** y ningún caso corre.
2. **Entrar**: usuario y clave → **OTP**, con el código de demo en pantalla; o **SSO Microsoft Entra ID**,
   que pide organización antes de entrar.
3. **Elegir la sesión**: el selector del extremo derecho de la navbar cambia de usuario sin volver a
   entrar. Muchos casos dependen de **quién mira** —un ejecutivo no ve lo mismo que el Jefe de Riesgo—, y
   la columna «Qué se prueba» lo dice cuando importa.
4. **Datos estables**: para no depender del stream, encender **«Directorio»** en la barra del tubo. Deja
   un conjunto acotado y repetible (regla 31). Los casos que necesitan el stream vivo lo dicen.
5. **Un caso que falla se reporta con la pantalla y el id del negocio** (`OP-…`), no con una descripción:
   los datos son deterministas y el mismo id reproduce el mismo estado.

---

## 4. Tubo de negocio · Gestión diaria (`CP-GD`)

**Punto de partida:** navbar › «Gestión diaria». El h1 dice «Gestión diaria comercial» y bajo él va el
contador de negocios. La barra de herramientas trae «Start», «Reiniciar», «Inbound», «Directorio»,
«Tabla», «Exportar» y «Nuevo negocio». Los tabs de estado son «Todos», «Prioritarios», «Con línea»,
«Sin línea», «Pendientes de giro», «Perdidas» y «Otras Empresas».

| Id | Qué se prueba y cómo | Resultado esperado | Fija | Automatizado |
|---|---|---|---|---|
| CP-GD-01 | Entrar a «Gestión diaria» recién iniciada la sesión | El tubo abre en el tab **«Todos»**, y «Todos» es el **primer** tab de la fila | regla 34 | `regla_34.test.mjs` |
| CP-GD-02 | Leer los rótulos del menú y de la miga de pan | La navbar dice **«Gestión diaria»** y **«Reportes»** (no «Pipeline» ni «Panel»); la miga repite el rótulo del botón y `Ctrl+K` ofrece los mismos nombres | regla 27-bis | suite 128 · `e2e-27-bis` · `regla_27_bis.test.mjs` |
| CP-GD-03 | Cambiar entre la vista **Kanban** y la vista **«Tabla»** con el botón de la barra | Las dos vistas muestran el mismo conjunto de oportunidades y el mismo conteo; ninguna fila aparece sólo en una | regla 30-bis | manual |
| CP-GD-04 | Mirar el orden de la lista con oportunidades en distintas etapas y montos | Ordena por **avance primero y plata después**: una oportunidad más avanzada va antes que una de más monto y menos avance. El orden **no se rearma** con cada lote del stream | regla 30-bis | suite 112 |
| CP-GD-05 | Recorrer los tabs «Con línea» y «Sin línea» | Cada oportunidad cae en **uno solo** de los dos, y la suma de ambos más «Otras Empresas» cuadra con «Todos» | reglas 7, 34 | manual |
| CP-GD-06 | Encender **«Directorio»** | Quedan 5 filas `OP-DIR` («3 de 5»: 3 con línea, 2 sin línea, Todos 5, Otras 0), y los controles del stream «Start»/«Reiniciar» se ocultan | regla 31 | suite 129 · `e2e-31` · `regla_31.test.mjs` |
| CP-GD-07 | Apagar «Directorio» y volver al stream | El tubo vuelve al conjunto normal y el stream sigue corriendo: la demo acotada no lo deja apagado | regla 31 | `e2e-31` |
| CP-GD-08 | Dejar correr la **Bandeja Inbound** hasta que llegue a su tope (Configuración › Operación › «Tope de la Bandeja Inbound») | Al llenarse **sale primero lo que no es de nadie**, lo que sale **se cuenta y se dice** en un aviso, y las facturas de la cartera no se botan en silencio | regla 40 | suite 142 |
| CP-GD-09 | Leer la columna **SOW** de una fila con cesiones de varios factores | Dibuja a los **cesionarios** con hasta cuatro chips y **nosotros aparecemos siempre**, aunque el porcentaje sea 0 | regla 13-quindecies | suite 105 |
| CP-GD-10 | Comparar el SOW de la fila con el mix de financiamiento del cliente | El mix lo **mide** el stream de cesiones (A2) y lo **publica** el activo del cliente (A11): la columna no lo recalcula por su cuenta | regla 13-nonies | suite 99 |
| CP-GD-11 | Leer la columna **«Oportunidad»** en un cliente con deudores con y sin línea | Parte los deudores **por línea** —«N Prime con línea», «N deudores sin línea», con su monto cada grupo— usando un lookup y **no** el motor de asignación | regla 13-decies | suite 100 |
| CP-GD-12 | Abrir una oportunidad desde el tubo | Se abre el **detalle en una pestaña propia** del navegador, no un panel encima del tubo | regla de UI del detalle | `e2e-00` |
| CP-GD-13 | Simular una oferta en el detalle y volver al tubo sin recargar | La oportunidad **sale de «Prospección»** y el tubo lo refleja solo, por el aviso entre pestañas | regla 12-bis | `e2e-12-bis-a` · `e2e-12-bis-e` |
| CP-GD-14 | Editar el paquete en el detalle **sin simular** (agregar dos facturas y retirar una) | La oportunidad **se queda en Prospección** y el tubo no parpadea: lo que promueve es la simulación, no la edición | regla 12-bis | `e2e-12-bis-b` |
| CP-GD-15 | Cerrar la oferta en el detalle y mirar la bandeja «Solicitudes» de Líneas desde el tubo | La solicitud aparece **con el mismo id**, sin rearmarla, y cruzar N veces deja **una** entrada | regla 15-bis-bis | suite 126, 144 · `e2e-15-bis-bis-a` · `e2e-15-bis-bis-b` |
| CP-GD-16 | Llevar una oportunidad a «Perdidas» y después intentar devolverla con «Avanzar a» o arrastrándola en el Kanban | **No se puede**: la pérdida es estado terminal, y la tarjeta de pérdida se dibuja sin crashear la vista | regla 5 | suite 117, 118 · `regla_5.test.mjs` |
| CP-GD-17 | Cambiar el nombre y el color de una etapa en Configuración y volver al tubo | El tubo, el Kanban y el detalle usan el **nombre y el color nuevos**; ninguna pantalla conserva el rótulo viejo | regla 28 | suite 110, 111 |
| CP-GD-18 | Con el selector «Todos los ejecutivos», filtrar por un ejecutivo | Se ven sólo sus oportunidades, y la asignación sigue al **cedente** (no al deudor ni a la factura) | regla 11 | suite 121 |
| CP-GD-19 | Marcar una oportunidad como prioritaria desde una sesión de **ejecutivo** y desde una de **jefatura** | El ejecutivo **no puede**; la jefatura sí. El tab «Prioritarios» la recoge | PRI-01 | manual |
| CP-GD-20 | Pulsar «Exportar» con un filtro aplicado | Lo exportado es **lo que está en pantalla**, con el filtro aplicado, no el total | — | manual |

---

## 5. Detalle de la oportunidad (`CP-DET`)

**Punto de partida:** abrir una oportunidad desde el tubo. El detalle es una **pestaña propia** y se llega
por un ticket opaco en la URL. La cabecera trae el cliente, el id `OP-…`, la etapa, la línea del cliente y
los chips de producto y categoría. Los tabs son «Negocio», «Otorgamiento» (cuando hay criterios) y
«Verificación» (cuando corresponde), más «Bitácora», «Cobranza» y «Mensajería» según el usuario.

| Id | Qué se prueba y cómo | Resultado esperado | Fija | Automatizado |
|---|---|---|---|---|
| CP-DET-01 | Abrir una oportunidad sin oferta armada | Se ve el estado de entrada: **«La oferta está vacía»** con «Elige qué facturas incluir para evaluar la línea», el título «Documentos en la oferta» en **0 · 0** y sin el segmentado de vista | regla 13-octies-bis | `e2e-13-octies-bis-a` |
| CP-DET-02 | Leer la cabecera | La **línea general del cliente** va a la altura del nombre, fuera del stepper de etapas, con las mismas cifras que el tubo | regla 13-terdecies | suite 123 · `e2e-13-terdecies` |
| CP-DET-03 | Simular la oferta y volver a mirar la cabecera | La línea de la cabecera **se mueve con la simulación**: refleja el disponible después de lo que la oferta toma | regla 13-terdecies | `e2e-13-terdecies` |
| CP-DET-04 | Abrir «¿Qué facturas quieres incluir en la oferta?» | Los deudores se parten en **dos pestañas por línea** —«Deudores con línea» y el resto— con su conteo de facturas y su monto | regla 13-septies | suite 97 |
| CP-DET-05 | Alternar «Por deudor» / «Por factura» en «Documentos disponibles» | Las dos vistas traen **el mismo conjunto**; la plana ordena por folio descendente y agrega la columna que el acordeón esconde | reglas 13-octies, 13-octies-bis | suite 98 · `e2e-13-octies-bis-b` |
| CP-DET-06 | Elegir «Todo lo disponible» | La oferta queda con el total de facturas y el monto que el botón anuncia; el segmentado aparece y la caja del estado vacío se va | regla 13-octies-bis | `e2e-13-octies-bis-b` |
| CP-DET-07 | Armar la oferta **a mano**, con la oferta vacía | El panel **pregunta** y no ofrece simular; al elegir N facturas dice «Tienes N…» y recién ahí ofrece simular | regla 13-sexdecies | `e2e-13-sexdecies-a` |
| CP-DET-08 | Con dos facturas en la oferta, retirar una confirmando en el diálogo | El folio **vuelve al pool**; con una sola factura el ícono de retirar sigue disponible (no hay veto) | regla 13-sexdecies | `e2e-13-sexdecies-b` |
| CP-DET-09 | Retirar la **última** factura de una oferta **sin simular** | La oferta queda vacía y vuelve el panel de arranque | regla 13-sexdecies | `e2e-13-sexdecies-c` |
| CP-DET-10 | Retirar la **última** factura de una oferta **ya simulada** | La oferta queda vacía **y la simulación se va con ella**: no queda un resultado colgando sin documentos | regla 13-sexdecies | `e2e-13-sexdecies-d` |
| CP-DET-11 | Usar «Eliminar la simulación y vaciar la oferta» | La oferta queda vacía, el pool vuelve a ser la unión de lo que estaba en la oferta y lo que quedaba disponible —**ninguna factura se pierde**— y se puede partir de cero sin cerrar la pestaña | regla 13-quaterdecies | `e2e-13-quaterdecies` |
| CP-DET-12 | Leer los montos de los **documentos** en el detalle | Van en **pesos** (el titular dice «Se puede cursar la oferta completa · $X»); el `M$` queda para los resúmenes | regla 29 | `e2e-29-a` |
| CP-DET-13 | Simular una oferta que la línea sólo cubre en parte | El titular dice **«Se puede cursar $X de $Y»** en pesos, con Y = «Total oferta», y el CTA cambia a «Enviar a Comité y Publicar» | reglas 29, 15-bis | `e2e-29-b` |
| CP-DET-14 | Con una oferta ya simulada, **agregar** una factura | El conteo y el monto suben **al instante**, pero el titular pasa a **«La selección cambió»** sin cifra: el cálculo **no** se dispara solo | regla 14 | `e2e-14-a` · `regla_14.test.mjs` |
| CP-DET-15 | Con una oferta ya simulada, **quitar** una factura | Mismo comportamiento: el conteo baja al instante y el titular queda «La selección cambió» sin cifra | regla 14 | `e2e-14-b` |
| CP-DET-16 | Con «La selección cambió» en pantalla, mirar el pie de la tarjeta | Los controles de Verificación y Línea siguen mostrando el **resultado de la simulación anterior**: es un defecto conocido de la regla 14 y el caso lo congela para que no empeore | regla 14 | `e2e-14-c` |
| CP-DET-17 | Abrir «Modificar» en «Condiciones comerciales» y cambiar la tasa | El desglose recalcula: «Monto Documentos», «Diferencia de precio», «Monto Anticipo», «Subtotal Descuentos» y **«Monto a Girar»**. Los conceptos y sus fórmulas salen de la configuración del tenant | reglas 9, 20 | suite ~69 |
| CP-DET-18 | Revisar el desglose **por factura** de una oferta con varias facturas | El prorrateo reparte a nivel de factura y la suma de las partes cuadra con el total de la operación, al peso | regla 21 | suite 65, ~70–75 |
| CP-DET-19 | Armar una oferta cuyo **«Monto a Girar»** quede en cero o negativo | La oferta **se arma y se simula**, pero **no se cursa**: el CTA de cierre no la deja pasar | regla 13-septdecies | suite 108 |
| CP-DET-20 | Bajar la tasa por debajo de la atribución del rol y tratar de cerrar | Queda **fuera de atribución** y el veredicto dice por qué; con el rol que sí tiene atribución, pasa. Bajo el mínimo absoluto gana el bloqueo duro | ATR-01, regla 8 | suite 145, 149 · `regla_atr_01.test.mjs` |
| CP-DET-21 | Abrir el menú **«Acciones»** | Ofrece «Guardar borrador», «Rechazar…» y priorizar (más Bitácora/Cobranza/Mensajería según el usuario). **No** cierra la oferta ni avanza de etapa | regla 30 | `e2e-30` · `regla_30.test.mjs` |
| CP-DET-22 | Pulsar «Pre-evaluación» con excepciones sin comentario | Sale el aviso; **«Enviar de todos modos»** continúa y la operación queda pre-evaluada | reglas de excepciones | manual |
| CP-DET-23 | Cerrar la oferta y volver a mirar la pantalla | El CTA de cierre **se va**, queda «Operación creada» y la edición pasa a «Acciones › Editar»; la guarda contra una solicitud duplicada **cruza de pestaña** | regla 33 | `regla_33.test.mjs` |
| CP-DET-24 | Cerrar una oferta que necesita línea nueva | La **solicitud al comité se genera sola**, ligada a su línea, y aparece en la bandeja «Solicitudes» | reglas 15-bis, 15-bis-bis | suite 106, 107, 126 |
| CP-DET-25 | Publicar la oferta desde el modal de curse | La decisión se toma **en el modal**, y queda evidencia de qué se publicó | regla 23 | suite ~85 |
| CP-DET-26 | Intentar cursar sin haber pasado por Cesión | **No gira**: el desembolso exige que la operación haya pasado por Cesión | GIR-01 | suite 136 · `regla_transiciones.test.mjs` |
| CP-DET-27 | Comprobar que el monto cedido de cada factura es el monto del documento | Un monto cedido distinto del documento **se detecta** (criterio O06) | regla 13-sexies | suite 96 |
| CP-DET-28 | Revisar las fechas de cada factura de la oferta | Emisión y vencimiento salen **del documento**, no de un cálculo de la pantalla | regla 13-ter | suite 93 |

---

## 6. Líneas (`CP-LIN`)

**Punto de partida:** navbar › «Líneas». El h1 dice «Líneas de crédito» y hay dos sub-tabs: **«Vigentes»**
y **«Solicitudes»** (con el conteo al lado cuando hay). Sobre la tabla van los KPI —clientes con línea
aprobada, «Sin línea», «Línea total aprobada», «Aumentos recomendados» y «Con morosidad»— y los filtros de
salud «Todas», «Saludable», «Subutilizada», «Atención», «En riesgo» y «Crítica».

| Id | Qué se prueba y cómo | Resultado esperado | Fija | Automatizado |
|---|---|---|---|---|
| CP-LIN-01 | Leer la columna «Línea aprobada» de un cliente y compararla con la suma de sus líneas por deudor y comodín | La cabecera **ES la suma**, en aprobado **y** en utilizado: no la supera | regla 45 | suite 151 |
| CP-LIN-02 | Revisar de dónde salen las líneas de un cliente | Los tres niveles **llegan por el activo** y el pipeline sólo los lee: no fabrica objetos de línea a partir de otra entrega | regla 44 | suite 150 · `regla_lineas_activo.test.mjs` |
| CP-LIN-03 | Filtrar por cada estado de salud | Cada cliente cae en **un solo** estado y la suma de los filtros cuadra con «Todas» | — | manual |
| CP-LIN-04 | Ver un cliente **sin línea** | Aparece en el KPI «Sin línea», la columna dice «Sin línea» y la acción ofrecida es **«Nueva línea»** | regla 27 | suite 102 |
| CP-LIN-05 | Usar la acción **«Solicitar»** sobre una recomendación «Aumentar línea» | Abre el wizard de presentación al comité con el tipo y subtipo que la recomendación implica | regla 15 | suite 125 · `e2e-15` |
| CP-LIN-06 | Recorrer el wizard | Pide **dos secciones** —«Deudores» y «Bienes y garantías»— y termina mostrando **un documento**: «Documento · revisar y enviar» | regla 15-ter | suite 107 |
| CP-LIN-07 | Mirar el paso **«Deudores»** del wizard | Muestra **Aprobado · Utilizado · Sugerido · Propuesta** en pesos, sin columna de RUT | regla 15-quater-bis | suite 127 · `e2e-15-quater-bis` |
| CP-LIN-08 | Enviar la presentación y abrir la bandeja «Solicitudes» | La solicitud entra **sin resolverse** y **ligada a su línea**, y esa línea **no admite otra** mientras ésta esté abierta | regla 15 | `e2e-15` · `regla_15.test.mjs` |
| CP-LIN-09 | Abrir una solicitud de la bandeja | Se abre y muestra **sus líneas de detalle** | regla 15-quater | suite 109 |
| CP-LIN-10 | Pulsar «Ver documento» en una solicitud | El documento se arma con el **registro realmente inyectado** (deudor, RUT, monto, número y hora), no con lo que la pantalla tenía a mano | regla 15-quinquies | `e2e-15-quinquies` |
| CP-LIN-11 | Pedir un cupo **bajo $10.000.000** para una línea normal, y después para una **puntual** | La normal **no pasa** el mínimo; la **puntual está exenta** | regla 27 | suite 102 |
| CP-LIN-12 | Revisar el RUT del deudor que el wizard propone | Se **resuelve** contra el universo conocido; no se arma. Un RUT inventado sería, para el motor, otro deudor | regla 46 | suite 151 · `padron.test.mjs` |
| CP-LIN-13 | Aprobar en el comité una línea puntual para un deudor **sin línea propia** y volver a simular la operación | La asignación siguiente **usa la línea nueva**: el deudor deja de financiarse por el comodín y pasa a su puntual, marcada con su origen | reglas 44, 46 | suite 150 |
| CP-LIN-14 | Pulsar «Solicitudes» y refrescar el estado de los procesos | La bandeja muestra el **skeleton de carga** (~700 ms) mientras consulta, y después los estados actualizados | — | manual |
| CP-LIN-15 | Mirar la **reserva** de una línea con una operación en curso | La reserva **no la lleva NEX**: es del sistema de gestión de líneas, y acá sólo se muestra lo que la API devuelve | regla 12 | suite 122 · `regla_12.test.mjs` |
| CP-LIN-16 | Simular dos veces la misma operación cambiando el paquete | Cada simulación **emite una versión**, y el diff entre versiones es **informativo**: no reescribe la anterior | regla 13 | suite ~16–23 |

---

## 7. Verificación de facturas (`CP-VRF`)

**Punto de partida:** dos lugares. El **tab «Verificación» del detalle**, que es la vista del ejecutivo
comercial sobre su operación; y **navbar › «Verificación»**, la **«Mesa de verificación»** del equipo, con
los tabs «Por verificar», «Verificadas», «No verificadas» y «Todas».

| Id | Qué se prueba y cómo | Resultado esperado | Fija | Automatizado |
|---|---|---|---|---|
| CP-VRF-01 | Abrir el tab «Verificación» de una operación con varias facturas del mismo deudor | El veredicto es **por deudor**: una llamada cubre todas sus facturas en la operación | regla 6 | suite ~27–32, ~52–55 |
| CP-VRF-02 | Leer el encabezado del tab | Dice cuántas facturas **requieren verificación telefónica** y que el resto quedó verificado **por el modelo** | regla 6 | manual |
| CP-VRF-03 | Comparar el resultado de una factura con los umbrales del modelo | Las comparaciones se hacen **en pesos**: el `M$` de pantalla no cruza a la lógica | regla 9-ter | suite 115 |
| CP-VRF-04 | Recorrer los sub-filtros del resultado por factura («Verif. telefónica», «Verificadas», «modelo», «Reglas fallidas», «Todas», «Lista Blanca») | Cada factura aparece en los filtros que le corresponden y en ninguno más; los conteos de la cabecera cuadran | regla 6 | manual |
| CP-VRF-05 | Pulsar «Refrescar» sobre la consulta a la API de riesgo | Se vuelve a consultar y la marca de tiempo de «Consulta a la API de riesgo» cambia | — | manual |
| CP-VRF-06 | En la «Mesa de verificación», filtrar por «Por verificar» sin deudores pendientes | Dice **«No hay deudores esperando verificación telefónica.»**, no una tabla vacía sin explicación | — | manual |
| CP-VRF-07 | Buscar en la mesa por cliente, deudor u operación con un término que no existe | Dice **«Sin resultados para este filtro.»** | — | manual |
| CP-VRF-08 | Abrir una fila de la mesa y leer **«Causa que gatilló la verificación»** | Trae **todas** las causas de esa fila; si son varias, hay que confirmarlas todas en la misma llamada | regla 6 | manual |
| CP-VRF-09 | Marcar un deudor como **verificado** desde la mesa | Pasa al tab «Verificadas» y la operación baja su contador de pendientes | regla 6, VER-01 | suite 52, 88 |
| CP-VRF-10 | Marcar un deudor como **no confirmado** y usar «Retirar facturas no confirmadas» | Las facturas de ese deudor **salen de la operación** y el resto de lo ya hecho **se conserva** | regla 6 | suite ~76–77 |
| CP-VRF-11 | Intentar cursar con **una** verificación pendiente | **No cursa**, y dice cuántas faltan | VER-01 | suite 52, 88, 144 |
| CP-VRF-12 | Completar todas las verificaciones e intentar cursar | **Cursa**. El caso se prueba en las **dos** direcciones a propósito: VER-01 falló en ambas durante semanas porque sólo se miraba una | VER-01 | suite 144 |
| CP-VRF-13 | Reabrir una operación ya verificada para modificarla | La firma se **revoca**, lo no confirmado queda **vetado** y lo ya hecho se conserva | regla 6 | suite ~52–55 |
| CP-VRF-14 | Entrar como **Ejecutivo de verificación** y como ejecutivo comercial | La mesa es del equipo de verificación; el comercial ve el tab de su operación pero no la bandeja del equipo | reglas 18, 25 | manual |

---

## 8. Otorgamiento (`CP-OTG`)

**Punto de partida:** dos lugares. El **tab «Otorgamiento» del detalle**, que muestra las reglas evaluadas
y las excepciones de esa operación; y **navbar › «Otorgamientos»**, la **«Bandeja de aprobaciones»** con
los tabs «Todas», «Pre-evaluación», «Evaluación» y «Finalizadas», el interruptor «Sólo mis pendientes» y
el **«Visado Cliente»** / por deudor, que es donde un apoderado resuelve.

| Id | Qué se prueba y cómo | Resultado esperado | Fija | Automatizado |
|---|---|---|---|---|
| CP-OTG-01 | Abrir el tab «Otorgamiento» de una operación evaluada | Lista las reglas con su código (`C…`, `D…`, `O…`), su disposición y, en las excepcionables, el **nivel y el rol** que deben firmarla; al pie, «N regla(s) aprobada(s)» | regla 4 | suite 44, 46, 48, 56–59 |
| CP-OTG-02 | Leer una tarjeta de excepción | Muestra el **par (área, nivel)** que la resuelve —por ejemplo «N4 · Jefe de Riesgo (Riesgo)»— y el texto del criterio | reglas 4, 18 | suite 44, 46 |
| CP-OTG-03 | Resolver una excepción con un usuario **sin** atribución en ese par, y después con uno que **sí** la tiene | El primero **no puede**; el segundo sí. La atribución se comprueba **antes** de escribir | OTG-01 | suite 135 · `regla_otg_01.test.mjs` |
| CP-OTG-04 | Subir el monto de la operación hasta cruzar un tramo | El **piso por monto** sube el nivel exigido: la misma excepción pasa a necesitar un apoderado más alto | regla 4 | suite 44 |
| CP-OTG-05 | Usar «Marcar sin comentarios y solicitar (N)» sobre las excepciones pendientes | Quedan solicitadas en bloque, con el registro de quién las solicitó y cuándo | reglas de excepciones | manual |
| CP-OTG-06 | Intentar avanzar a **Cesión** con excepciones o rechazos re-evaluables sin resolver | **No avanza**, y dice cuántos quedan | OTG-02 | suite 144 · `regla_transiciones.test.mjs` |
| CP-OTG-07 | Resolver todo e intentar avanzar a Cesión | **Avanza**. También se prueba en las dos direcciones | OTG-02 | suite 144 |
| CP-OTG-08 | Cargar el **contrato de cesión firmado** en la tarjeta de O05 | Queda cargado, y **solicitar no cierra la puerta**: la tarjeta sigue aceptando el contrato después de haberse solicitado | regla 30-ter | suite 114 |
| CP-OTG-09 | Pulsar **«Re-evaluar simulación»** tras cargar el contrato | Se emite una **versión nueva** con los valores nuevos, y las reglas re-evaluables **no dejan la operación en pérdida** | regla 14 | suite 124 · `regla_14.test.mjs` |
| CP-OTG-10 | Mirar el selector de versiones del tab | Cada evaluación queda como una versión (`v1`, `v2`, …) con su fecha y su conteo de aprobadas / con excepción / rechazadas; las anteriores **se pueden abrir** | regla 13 | suite ~16–23 |
| CP-OTG-11 | Configurar una regla **sin área** o con un área **sin nadie** en el nivel exigido, y evaluar | La regla **no se ejecuta ni se verifica**, y la salida dice la **causa** y **en qué mantenedor se arregla** — no queda escondida como aprobada | regla 35 | suite 143 · `regla_35.test.mjs` |
| CP-OTG-12 | Entrar a «Otorgamientos» con el interruptor «Sólo mis pendientes» encendido y sin nada asignado | Dice **«No tienes operaciones con acciones pendientes. Quita "Sólo mis pendientes" para ver todas.»** | reglas 18, 25 | manual |
| CP-OTG-13 | Recorrer los tabs «Pre-evaluación», «Evaluación» y «Finalizadas» | Cada operación cae en el tab que le corresponde por su estado y en ninguno más | — | manual |
| CP-OTG-14 | Poner a un apoderado de **vacaciones** y dejar su reemplazo, y volver a la bandeja | Las excepciones de su par (área, nivel) las puede resolver el **reemplazo**, y lo hecho se atribuye a quien lo hizo | reglas 19, 25 | suite ~60–64 |
| CP-OTG-15 | Pulsar **«Aprobar integración al core»** como Encargado de Operaciones con una operación que tiene excepciones sin resolver, verificación incompleta o **una factura sin línea asignada** | El botón está **deshabilitado** y lista **cada falta con su código** (`OTG-02`, `VER-01`, `LIN-01`, `GIR-02`) | regla 41 | suite 144 · `regla_41.test.mjs` |
| CP-OTG-16 | Resolver las cuatro faltas y volver a pulsar | El botón **habilita** y la integración se aprueba, dejando la atribución registrada primero | regla 41, OTG-01 | suite 144 · `regla_41.test.mjs` |
| CP-OTG-17 | Intentar girar una operación cuya evidencia de contrato **no calza** con lo que se inyectó | **No gira**: la huella del paquete autorizado tiene que calzar con la que se inyecta | GIR-02 | suite 144 · `regla_41.test.mjs` |
| CP-OTG-18 | Esperar el aviso de giro de Tesorería, y después reintentarlo | El aviso **cierra** la operación; el reintento **no la reescribe**; una operación que no se inyectó **no se gira** y un aviso mal formado **falla cerrado** | regla 43 | suite 147, 148 |

---

## 9. Dónde mirar primero

De los **96 casos**, **79** tienen prueba automática y **17** están marcados **manual**. Los 17 se
reparten así: 4 en el tubo, 1 en el detalle, 2 en Líneas, 7 en Verificación y 3 en Otorgamiento — la
Mesa de verificación es, con diferencia, la pantalla menos cubierta.

Los manuales no son los menos importantes: son los que nadie va a notar si se rompen. Tres merecen
atención antes que el resto, por lo que cuesta el error:

1. **CP-GD-19** (sólo una jefatura prioriza), **CP-VRF-14** y **CP-OTG-12** (qué ve cada rol): los
   permisos por usuario no tienen gate, y un rol que ve de más **no se descubre mirando la pantalla
   propia** — hay que entrar con el otro usuario.
2. **CP-DET-22** (pre-evaluar con excepciones sin comentario): ese aviso y su «Enviar de todos modos» son
   la única barrera entre una excepción sin justificar y la bandeja del apoderado.
3. **CP-GD-20** (exportar lo filtrado): exportar el total cuando la pantalla muestra un filtro es el tipo
   de error que se descubre en la reunión donde se presenta el archivo.

## 10. Qué hacer cuando un caso falla

1. **Anotar el id del negocio** (`OP-…`) y la sesión con la que se estaba mirando. Los datos son
   deterministas: el mismo id reproduce el mismo estado en otra máquina.
2. **Mirar si el caso tiene una regla en la columna «Fija»**. Si la tiene, el texto de esa regla dice qué
   se esperaba y **por qué** — casi siempre está ganado con un incidente real.
3. **Si el caso está automatizado y la prueba pasa pero la pantalla falla**, el hueco es la prueba, no la
   pantalla: la prueba está midiendo otra cosa. Eso vale reportarlo aparte.

---

## Anexo · Control de versiones

**Mayor** = cambia lo que el sistema decide o el contrato con el servidor · **menor** = entra una sección, un campo o un criterio · **parche** = redacción, una cifra o una referencia.

| Versión | Fecha | Qué cambió |
|---|---|---|
| **1.0.0** | 23-09-2026 | Primera versión: 96 casos sobre las cinco pantallas del ciclo de una operación, con la regla que fija cada uno y su cobertura automática. |
