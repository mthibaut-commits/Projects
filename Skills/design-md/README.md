# Referencias de diseño (DESIGN.md)

Material de consulta para componer pantallas. **No gobierna nada**: el lenguaje visual de este proyecto
es Datamart y lo fija la **regla 34** (`vault/conocimiento/reglas/ui_detalle_y_tubo.md`), con gate en
`tests/contract/regla_34.test.mjs`.

| Carpeta | Qué hay | En git |
|---|---|---|
| `coleccion/` | Los 74 `DESIGN.md` de [VoltAgent/awesome-design-md](https://github.com/voltagent/awesome-design-md) — Stripe, Linear, Figma, Vercel, Apple… | no (2,8 MB de terceros) |
| `propias/` | Las que trae el usuario | sí |

```bash
node Skills/design-md/obtener.mjs                                  # clona o actualiza la colección
node Skills/design-md/obtener.mjs --listar                         # las 74 marcas
node Skills/design-md/obtener.mjs --marca=linear.app --a=<ruta>    # extrae una
```

## La línea que no se cruza

Una referencia externa aporta **composición** —ritmo de espaciado, jerarquía, densidad, estados vacíos,
microcopy, transiciones—. No aporta **tokens**: el color sale del objeto `C`, el tipo de la escala
`t7`–`t15`, la fuente es Geist y los radios salen de los override de `.rounded-*`.

El choque no es teórico. El `DESIGN.md` de Claude/Anthropic que está en `propias/` declara 23 colores y
**22 son foráneos**: sólo comparte `#ffffff` con el fuente. Su lienzo es crema `#faf9f5`, su primario
coral `#cc785c` y su display una serif; Datamart es lienzo blanco, púrpura `#703EFF` y Geist sans.
Ninguno está mal — tener los dos, sí.

Por eso `obtener.mjs` exige `--a=<ruta>` y **bloquea la raíz del repo**: un `DESIGN.md` ahí significa,
por la convención de Google Stitch, «cómo debe verse este proyecto», y los agentes de diseño lo leen así.
El gate de la regla 34 lo comprueba, y además vigila que no entre al fuente un color que no esté en la
línea base de paleta.
