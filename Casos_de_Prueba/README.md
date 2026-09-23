# Casos de prueba

Qué hay que **mirar en pantalla** para aceptar una entrega. No es un spec —eso dice cómo funciona el
negocio, y vive en `Specs_Procesos/<tema>/`— ni un informe de auditoría: es la lista de comprobaciones que
alguien ejecuta, con su resultado esperado.

| Documento | Cubre |
|---|---|
| `casos-de-prueba-pantallas.md` (+ `.pdf`) | las cinco pantallas del ciclo de una operación: tubo de Gestión diaria, detalle de la oportunidad, Líneas, Verificación y Otorgamiento |

## Cómo está armado

- Un caso es `CP-<pantalla>-<n>` y trae **qué se hace · qué tiene que pasar · qué regla lo fija · si ya
  está automatizado**. El `CP-` de adelante es lo que lo separa de un invariante del contrato: `CP-OTG-15`
  es un caso de prueba, `OTG-01` es un invariante.
- **La columna «Fija» es el puente con el vault.** Apunta a una regla de `vault/conocimiento/reglas/` o a
  un invariante del contrato. Si un caso falla, el texto de esa regla dice qué se esperaba y **por qué**.
- **La columna «Automatizado» dice la verdad, no el deseo.** `suite N`, `e2e-…` o `regla_….test.mjs`
  cuando existe la prueba; **manual** cuando no la hay. Los manuales son la lista corta de lo que se rompe
  sin que nadie lo note.
- **Los ids no se renumeran.** Un caso retirado deja su número libre y no se reusa, igual que las reglas
  del vault.

## Cómo se mantiene

1. **Una regla nueva con gate no necesita caso acá**: ya está cubierta. Lo que entra es lo que **sólo se
   ve mirando**.
2. Cuando un caso **manual** se automatiza, se cambia su columna y se dice en el commit: la cuenta de
   manuales del §9 es una medición, no una estimación.
3. Las cadenas entre comillas son **los rótulos que la aplicación muestra**, no paráfrasis. Al cambiar un
   rótulo en `pipeline_comercial.jsx`, este documento cambia en el mismo commit.
4. Lleva versión y anexo de control de versiones como los demás entregables, y lo exige
   `tests/contract/versiones.test.mjs`.
