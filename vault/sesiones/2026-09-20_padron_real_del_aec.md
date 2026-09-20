---
type: sesion
title: "El padrón real: las identidades salen del AEC, y con ellas se fue el 39 % de RUT en rango de persona"
description: "El usuario entregó el AEC de BICE Factoring y decidió usar pares RUT ↔ razón social reales. Migrar 1.938 identidades destapó tres cosas que nadie veía: RUT de deudor en rango de persona natural, 50 razones sociales compartidas por dos RUT, y un tooltip que decía «quedarían M$-X» junto a un texto que decía «excede por M$X»"
tags: [sesion, datos, padron, adr-0007, privacidad]
timestamp: 2026-09-20T04:00:00Z
---

# El padrón real

## Cómo empezó, y el error de método que vale anotar

El tablero traía «razones sociales reales sobre RUT sintéticos» como decisión pendiente. Al ir a medirla
apareció que el estado era **peor** que lo documentado: de los 30.000 RUT de deudor, el **51,5 %** estaba
fuera del rango de empresa y el **39,3 %** en rango de **persona natural** — «Clorox Chile S.A.» llevaba
`9.710.034-4`, que puede ser el RUT de alguien que existe. `testing.md` decía «los RUT del sistema son
sintéticos» y eso era cierto y tranquilizador y no describía el problema.

El usuario pidió el corte correcto —*«no inventes los RUT, toma pares de RUT y razón social que sean
reales»*— y entregó el AEC (REQ-15, 411.526 cesiones). **ADR-0007** fija qué entra y qué no.

## Lo que NO se hizo, y es la mitad de la decisión

De los 23 deudores de la demo, el repo sólo podía sostener **3** con fuente. Los otros —Codelco, Falabella,
Cencosud— no tienen su RUT en ningún archivo del proyecto. **No se escribió ni uno de memoria.** Un RUT
equivocado atribuido a una empresa real es peor que uno sintético: parece verificado y nadie lo revisa.

Y de las 411.526 filas del AEC **no entró ninguna**. Sólo el par `RUT ↔ razón social`, que es registro
público. Folios, montos, fechas y quién-le-cedió-a-quién son la cartera comercial de BICE Factoring y no
tienen por qué viajar en una demo. El archivo tampoco se commitea; el extractor sí.

## Las personas naturales

El AEC trae **93 empresarios individuales** cediendo sus facturas con nombre completo y RUT. Legítimo en el
negocio, improcedente en una demo. Quedan fuera.

Se colaron en la primera pasada —el padrón salió con `CRISTINA HAYDEE SILVA UGALDE` como deudora— y se
vieron al revisar la salida, no por un control. Ahora el control existe (`padron.test.mjs`).

El umbral se midió en vez de suponerse: de los **93** cedentes bajo 30M, **cero** llevan marca societaria;
entre 30M y 50M no hay ninguno; los **9** del tramo 50–60M son el **100 %** sociedades, varias extranjeras
(`D2R INTERNATIONAL LLC`). Por eso el corte va en **50M** y no en 60M: ahí se habrían perdido empresas.

## Tres cosas que la migración destapó

1. **50 razones sociales compartidas por dos RUT distintos.** «Constructora RM SA» era 39663693-3 *y*
   41604007-5. Mapear por nombre las habría fusionado; se mapea por RUT (`spec_aecsync.md` §81) y el
   defecto se corrigió solo.
2. **La identidad no vivía sólo en el activo.** `lib/intencion_sow.js` declara por RUT quién cede: migrar
   sin él dejó **AECSYNC en CERO filas** y el activo 6 MB más chico, **sin un solo error** — «este cliente
   no tiene documentos cedibles» es una condición legítima. Y `proveedores_clientes.json` trae 697
   proveedores ausentes del A1: faltando ellos, el caso **121** cayó con «candidatas 0». Los dos son
   **archivos ligados** y ahora se migran en la misma pasada, con el mismo mapa.
3. **Un tooltip que se contradecía con el texto de al lado.** La cabecera decía «excede por M$1.207,8» y su
   `title` decía «quedarían M$**-**1.207,8». El estado no se dibujaba nunca porque ninguna operación del
   Directorio excedía su línea; con las identidades nuevas, una sí. Lo cazó `e2e-13-terdecies` al no poder
   ni parsear el signo. **Y el caso 123 de la suite FIJABA la contradicción**: exigía el `quedarían`
   negativo. Se corrigió la app y el caso pasó a exigir que las dos formas digan lo mismo, en los dos
   sentidos — que es más estricto que antes, no menos.

## Un cuarto hallazgo, y la parte donde me equivoqué dos veces

`e2e-13-terdecies` quedó fallando después de arreglar el tooltip, con «el tubo no se enteró de la
simulación». Diagnostiqué mal **dos veces** antes de medirlo:

1. Supuse que el orden del tubo se había vuelto inestable y que el caso abría una fila distinta de la que
   vigilaba. **Falso**: sondeé el orden en cuatro instantes y es estable, y el id de la fila 0 calza con el
   del detalle que abre.
2. Supuse que con el padrón real el Directorio había quedado con **3 clientes sin línea** en vez de 2, o
   sea que la regla 31 había dejado de cumplirse. **También falso**, y el error fue de método: medí el tubo
   **después** de simular. En el estado inicial son **3 «Con línea» y 2 «Sin línea»**, exactamente lo que la
   regla 31 promete y mide.

Lo que pasa de verdad, leyendo el predicado del filtro en vez de adivinarlo: **«Sin línea» no significa
«el cliente no tiene línea» sino «la operación EXCEDE la línea aprobada»** —está escrito en el comentario
del propio filtro, «fuera de línea → requiere aprobar/ampliar la línea en el comité»—. Así que simular
«Todo lo disponible» sobre una operación que no cabe la mueve de «Con línea» a «Sin línea», y bajo el
filtro que el runner deja puesto la fila **desaparece del tubo**. La app hace exactamente lo que debe.

El caso es sobre el INDICADOR de línea en la cabecera y su espejo en el tubo, no sobre el filtro rápido,
así que ahora se para en «Todos» y restaura «Con línea» al salir. El acoplamiento existía desde antes;
sólo no se ejercitaba porque ninguna operación del Directorio excedía su línea.

**La lección, que es la misma de la regla 8 en esta misma sesión:** medí con precisión el lugar equivocado
y la precisión le dio autoridad a la conclusión. Las dos veces lo corrigió sondear el estado real en vez de
razonar sobre el código.

## Verificación

0 prettier · 0-bis eslint 0 · 1 tsc sin TS1 · 2 sin duplicados · 3 build · 4 **217/217** contrato ·
5 **147/147** la suite · 6 **28/29 e2e**.

## El caso que queda ROJO, y por qué no lo forcé

`e2e-29-b` falla, y **no es un defecto de la app**: con el padrón real ninguna operación del Directorio
contiene ya un deudor de **cupo cero**. Los 17 que piden línea son todos **parciales**. Ese caso prueba las
DOS ramas de «Sacar facturas sin línea» —el de cupo cero se va entero de la oferta y pasa a describir la
carencia; el parcial se queda con lo que cabía— y el escenario de la primera desapareció del fixture.

Intenté tres arreglos y los descarté todos, dejando el archivo como estaba:

1. Ampliar la búsqueda a más pestañas (`Sin línea` → `Sin línea` + `Todos`): encuentra más operaciones
   parciales, ninguna con cupo cero.
2. Pedirle a la búsqueda el escenario (`extra`, un predicado sobre los títulos de los chips de deudor):
   mejora el mensaje de error —dice «tipo OK pero sin el escenario pedido»— pero no fabrica el caso.
3. Incluir el tercer marcador, «Sin cupo para …», que es el de dentro de la oferta: tampoco.

Las dos salidas reales son **aflojar la aserción** —que `testing.md` prohíbe con todas sus letras: «un gate
que se afloja deja de vigilar»— o **extender `construirDirectorio`** para que el Directorio garantice un
deudor de cupo cero. Lo segundo es territorio de la **regla 31**, que hoy promete «3 dentro de línea y 2 con
línea parcial» y **no** promete cupo cero: sería un requisito NUEVO, con su gate y su decisión de producto.
No es mío tomarla, así que queda escrito acá y en el tablero con el diagnóstico completo.

El **punto fijo del generador se conserva**: una corrida sobre el archivo migrado lo reproduce byte a byte.
Y los **1.983 RUT del padrón tienen dígito verificador válido**, que es lo que distingue un RUT real de uno
escrito a mano — y lo que el gate comprueba para que siga siendo así.

## Numeración: la regla salta a 42

`main` tomó 36–40 mientras esta rama tomaba 36 y 37. En vez de crear una tercera colisión, esta regla toma
**42** y la **41 queda reservada** para la regla de giro que esta rama numeró 37. La deuda del tablero
—«quien mezcla después renumera»— se paga por adelantado.
