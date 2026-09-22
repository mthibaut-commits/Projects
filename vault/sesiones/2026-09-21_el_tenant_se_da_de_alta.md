---
type: sesion
title: "Configuración › Tenants: el alta del factoring, su marca y su administrador"
description: "Construirlo destapó que el super-admin se resolvía por el CÓDIGO «ADMIN» y no por el rol: el administrador de un tenant nuevo salía con atribución vacía y no podía aprobar nada"
tags: [sesion, tenant, configuracion, atribucion]
timestamp: 2026-09-21T23:30:00Z
---

# El tenant se da de alta · regla 52

## Qué pidió el usuario

> «Implementa en la configuración un menú Tenant en donde se cree el Tenant de Security y/o otro cliente;
> saca la configuración del logo y de los colores y déjalos en ese menú; en ese menú también deberías
> poder crear al admin del Tenant para que pueda ingresar y empezar a crear a los otros usuarios. En la
> configuración de las Áreas elimina toda esa información relativa a Criterios que rutean acá y elimina
> la columna de Quién la tiene.»

Y mientras se construía:

> «Cada uno de los menús de configuración debiera arriba indicar el Tenant en el que está configurando,
> ya que todas esas configuraciones son específicas para el Tenant.»

## Lo que se hizo

`Configuración › Tenants`, primera del menú, con **tres bloques en un orden que es el punto**: crear el
factoring, darle marca, y **darle un administrador**. Un tenant sin admin es una carpeta vacía —no hay
quién entre a crear al resto— y por eso el alta del usuario vive acá y no en `Configuración › Usuarios`,
que asigna roles a gente que ya existe.

La **lista de factorings es de la PLATAFORMA**: `nex_tenants`, **sin sufijo**. `pc_roles_security` es
«los roles DE Security», pero guardar la lista de factorings por tenant sería que cada uno tuviera su
propia idea de quién existe. El `id` **compone las claves de storage** de toda su configuración, así que
la higiene no es cosmética: un id inválido no es una fila rara, es un prefijo roto.

La **marca se mudó** desde `Funcionalidades`, donde estaba junto a los toggles de módulos: logotipo,
nombre y acento son identidad del tenant, no una funcionalidad suya.

El **rótulo del tenant** va en el CONTENEDOR de Configuración y no en cada sección: son veinte pantallas
y la que se agregue mañana lo tendría que recordar sola. `Tenants` es la única que no configura un tenant
sino la lista de todos, y **lo dice** en vez de mentir — un rótulo que afirma lo mismo en todas partes
deja de significar algo.

En **Áreas** se fueron las dos columnas. Lo que **no** se fue es el control de la **regla 35**: el aviso
de los criterios mal definidos, que es lo que su gate exige. Tampoco la guarda de borrado: `tramosDeArea`
ya no se muestra, pero sigue decidiendo si el área se puede eliminar.

## El hallazgo: el super-admin era un CÓDIGO, no un rol

Sondeando la pantalla recién hecha en Chromium, el administrador creado salía con
`atribución: {}` y `enPadron: false`. O sea: **el administrador del tenant nuevo no podía aprobar nada,
que es exactamente para lo que se lo crea.**

La causa estaba a la vista y llevaba meses ahí. `atribDeRol` tiene encima un comentario que dice, con
todas sus letras, «LA ATRIBUCIÓN SIGUE AL ROL, no al código de usuario»… y su primera línea era:

```js
if (code === "ADMIN") return { riesgo: 5, comercial: 5, operaciones: 5 };
```

`"ADMIN"` es el código del elenco de la demo. Cualquier administrador con otro código —o sea, todos los
que se creen de ahora en adelante— caía al `ROL_ATRIB[...]` de abajo, y `ROL_ATRIB` **no declara `admin`
a propósito**: el super-admin cubre tres áreas en el nivel máximo, no un par (área, nivel). Resultado:
atribución vacía. Lo mismo pasaba en `padronAprobadores` (`superAdmin: code === "ADMIN"`), en los siete
permisos de visibilidad y en `esJefeComercial`/`esGerenteComercial`. Ahora todos preguntan por
`esRolAdmin`.

**Vale la pena quedarse con esto: un comentario que declara una regla no es la regla.** El comentario
decía lo correcto desde el día que se escribió; la línea de abajo decía otra cosa. Nadie lo vio porque
mientras hubo UN administrador y se llamaba `ADMIN`, las dos afirmaciones daban el mismo resultado.

## Dos fallos míos, con causa y solución (regla núcleo 11)

**1 · El helper `cuerpoDe` del gate se cortaba en los parámetros desestructurados.** Contaba llaves desde
la primera del texto, y en `function CfgTenants({ cfgOper, setCfgOper }) {` la primera es la del
destructuring: se cierra en el mismo renglón, así que el «cuerpo» salía siendo la lista de parámetros.
Doce aserciones fallaron a la vez y **ninguna decía la verdad** —afirmaban cosas sobre tres palabras—.
*Solución:* empezar a contar en la ÚLTIMA llave de la declaración, que es la del cuerpo. Los gates
anteriores (48, 49) usan el mismo helper y no lo notaron porque ninguna de sus declaraciones
desestructura.

**2 · Una aserción del caso 154 estaba mal, no el código.** Afirmaba que un tenant con id `"MAYUS"` se
descarta; `cargarTenants` lo **normaliza** a minúsculas antes de validar, igual que hace Áreas y igual que
hace el formulario. Se corrigió la aserción para que afirme lo que la regla dice —el id se normaliza, lo
que no tiene forma de tenant se descarta— en vez de bajar la exigencia para que pasara.

Las dos son la misma lección que el `recargar()` de esta mañana: **el gate encontró el defecto antes que
la pantalla, y las dos veces el defecto estaba en lo que yo acababa de escribir.**

## Verificación

Los seis pasos: prettier · eslint 0 · `tsc` sin TS1 · 0 duplicados · build · **331 gates de contrato**
(+20 del gate nuevo, 18 de ellos sondas) · **154/154** la suite · **29/29 e2e**. Y una sonda en Chromium
contra la pantalla nueva: el menú aparece, la sección monta sin errores, la marca ya NO está en
Funcionalidades, y el usuario creado entra al padrón, cubre las tres áreas y puede iniciar sesión con su
correo sin recargar.
