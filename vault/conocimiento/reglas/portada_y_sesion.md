---
type: conocimiento
title: "Reglas — Portada de ingreso y entrada a la sesión"
description: "Qué muestra la portada, de dónde sale su arte y quién lo embebe, cuál es la palabra que ocho scripts esperan para saber que cargó, y de qué cuelga la transición al dashboard"
tags: [conocimiento, reglas, dominio, portada, sesion]
timestamp: 2026-09-18T18:10:00Z
---

# Portada de ingreso y entrada a la sesión

> Reglas de dominio de NEX, agrupadas por tema. Se citan por su número (`regla 37`) y **no se renumeran**:
> el fuente y otros documentos las referencian así. Índice de todas, con qué caso verifica cada una:
> [`invariantes.md`](../invariantes.md).

36. **LA PORTADA MUESTRA PANTALLAS REALES DEL PRODUCTO, Y SU ARTE ES UN ACTIVO GENERADO** (18-09-2026).
    Los dos paneles en perspectiva de la portada no son maquetas: son el Dashboard y el tubo Kanban
    capturados de `Capturas_UI/`, que es el DOM real con el CSS real. La cadena es
    `Capturas_UI/` → `generar_arte_login.mjs` → **`arte_login.js`** → el build. Tres cosas que no se
    negocian: **(a)** el arte NO vive dentro del `.jsx` —son bytes generados y el fuente se edita a
    mano (regla 10 de `CLAUDE.md`)—, vive en un activo aparte como `datos_inyectados.js`; **(b)** lo
    embeben **los DOS builds**, `build_app.mjs` y `build_app.ps1`, porque el usuario construye en
    Windows con el `.bat` y un activo embebido sólo por Node le deja la portada sin paneles **y sin
    ningún error**; **(c)** si el activo falta, `ARTE_LOGIN` cae a `{}` y los paneles no se montan: se
    degrada, no rompe. Formato **WebP** porque la app corre sólo en Chrome y sobre una captura de
    interfaz pesa ~3,6 veces menos que PNG (*medido: 726 KB → 201 KB a q0,86*). Se captura a **1600 px**
    porque el contenedor de la app topa ahí: más ancho agrega margen blanco muerto y más angosto,
    estirado, agranda todo —que fue el defecto «se ve con demasiado zoom» de la primera pasada—. Si la
    UI cambia y se regeneran las capturas, hay que **volver a correr el generador** o la portada sigue
    mostrando una versión que ya no existe; por eso el archivo estampa la rama y el commit de origen.

37. **«BIENVENIDO» ES EL CONTRATO ENTRE LA PORTADA Y OCHO SCRIPTS** (18-09-2026). El HTML son 41 MB y
    Babel transpila ~26.000 líneas **en el navegador**: ningún script sabe cuándo terminó. Todos
    resuelven lo mismo —esperan a que la palabra **`Bienvenido`** aparezca en el texto de la página— y
    son ocho: `run_tests.mjs`, `tests/e2e/_harness.mjs`, `tests/e2e/24_cry_01.e2e.mjs`,
    `capturar_pantallas.mjs`, `capturar_variantes.mjs`, `capturar_tabla_simulada.mjs`,
    `regenerar_atribuciones.mjs` y `Regresiones/regresion_diferencial.mjs`. Borrarla del fuente **no rompe nada al
    instante**: cada uno se cuelga los 300 s de su timeout y recién ahí falla, sin decir por qué. Al
    rediseñar la portada la palabra dejó de ser el titular —ahora el titular es el claim del tenant— y
    pasó a ser **el título de la tarjeta**, que además es donde corresponde saludar. Si algún día hay
    que moverla, se mueve **con los ocho scripts en el mismo commit**.

38. **LA ENTRADA AL SISTEMA CUELGA DEL ÉXITO FINAL DE AUTENTICACIÓN, NO DEL BOTÓN** (18-09-2026). La
    trampa es de producto: **«Ingresar» no lleva al dashboard, lleva al paso OTP**. Las dos vías que sí
    terminan la autenticación son `verificarOtp` (credenciales + 2FA) y el selector de cuenta del SSO, y
    las dos pasan por `entrarAlSistema`, que es el único lugar donde se llama a `onIngresar`. Colgar la
    transición del botón la dispararía antes del segundo factor. La transición en sí tiene dos
    invariantes propias: **(a) nunca hay dos dashboards** —se mide la caja del panel sin su rotación, la
    capa a pantalla completa se pone exactamente encima y el panel se oculta en el mismo cuadro; con dos
    copias del mismo dashboard a distinto tamaño no hay desenfoque que lo tape—; y **(b) el cambio de
    pantalla lo manda el reloj (`setTimeout`), no la promesa de la animación**: si WAAPI falla, el
    usuario entra igual en vez de quedarse mirando el login para siempre. El suelo oscuro es del
    contenedor (`marcaFondo`) y no de la escena que se va: cuando la escena se desvanece, sin ese suelo
    aparece el blanco de la app y la pantalla se blanquea a mitad del zoom. Y **(c) la capa aterriza
    EXACTO donde la app va a dibujar**: la app centra su contenido con `mx-auto` y `max-width:1600`, así
    que la capa se parte en el blanco de página y una **banda con ese mismo tope**, y la geometría del
    zoom se mide contra la banda en reposo, no contra el viewport. Midiéndola contra el viewport la
    captura se estiraba a todo el ancho y el último cuadro quedaba ~25 % más grande que la app en una
    pantalla de 2000 px: al entregar el control se veía un salto (*reportado por el usuario el
    18-09-2026; medido después: 0 px de desfase en posición y en ancho*).

39. **CAMBIAR UN DEFAULT DE `CFG_OPER_BASE` NO LLEGA A QUIEN YA TIENE CONFIGURACIÓN GUARDADA**
    (18-09-2026). `cargarCfgOper` hace `{ ...CFG_OPER_BASE, ...guardado }`: **lo guardado gana**. Eso es
    lo correcto para lo que el usuario eligió en Configuración, y silenciosamente equivocado para un
    default que el PRODUCTO cambió. El usuario reportó que la portada se veía «mucho más clara» que las
    muestras: su navegador tenía la configuración del tenant de antes de ADR-0005, así que seguía
    pintando el degradado lineal anterior y el CTA `#4F46E5 → #6D5BFF` aunque el fuente ya tenía los
    nuevos. **Ningún test lo veía**: los siete pasos corren sobre un `localStorage` vacío, donde el
    default siempre gana. Se reprodujo inyectando la configuración v1 antes de cargar la página.
    La salida es la que el propio comentario de `SCHEMA_VERSION` prescribe: **subir la versión de la
    colección y escribir su migración** — `cfgOper` pasó a 2 y su ruta **retira sólo las tres claves que
    ADR-0005 cambió** (`marcaPrimario`, `marcaCta`, `marcaPanel`) para que vuelvan a salir del default,
    conservando el resto —tasas, tramos, banderas de demo—, que eso sí lo eligió el usuario. Devolver
    `null` habría descartado la configuración entera y le habría borrado sus perillas. Vale para
    cualquier otro default: **si cambia un valor que ya pudo quedar guardado, sube el esquema**.

