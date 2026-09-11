# Variantes_UI — los ESTADOS del detalle de la operación, capturados del build de esta rama

`Capturas_UI/` deja cada pantalla en su estado por defecto. El detalle de la operación, sin embargo,
casi no se usa en ese estado: el ejecutivo arma la oferta, despliega deudores, toca condiciones,
pre-evalúa y cierra. Esas transiciones son las que hay que poder mostrar y rediseñar, así que se
capturan aparte, con el **mismo serializador** de `capturar_pantallas.mjs` (se extrae de ese archivo
en vez de duplicarlo, para que no se desfasen).

## Regenerar

```bash
node build_app.mjs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_variantes.mjs
```

## Qué hay

| Archivo | Estado | Cómo se llega |
|---|---|---|
| `detalle-01-oferta-vacia` | Oferta vacía, con el modal de selección | Es el estado al abrir la operación |
| `detalle-02-oferta-armada` | Oferta armada y simulada | Elegir «Todo lo disponible» en el modal |
| `detalle-03-deudores-abiertos` | Acordeones de deudor desplegados | Clic en cada cabecera de deudor |
| `detalle-04-condiciones` | Panel de condiciones comerciales | Botón «Modificar» |
| `detalle-05-pre-evaluacion-aviso` | Aviso de excepciones sin comentario | Botón «Pre-evaluación» |
| `detalle-06-pre-evaluada` | Operación pre-evaluada | «Enviar de todos modos» |
| `detalle-07-otorgamiento` | Tab Otorgamiento (reglas y excepciones) | Tab, visible si la operación lo requiere |
| `detalle-08-verificacion` | Tab Verificación | Tab, aparece sólo tras pre-evaluar u ofertar (`mostrarVerif`) |
| `detalle-09-cerrar-oferta` | Cerrar oferta y publicar | Botón del resumen |

## Reglas

- **No editar a mano**, igual que `Capturas_UI/`: se regeneran.
- Cada variante **aísla su estado**: los acordeones se vuelven a colapsar tras la suya, para que las
  siguientes no arrastren el DOM de la anterior (sin eso pesaban 160 KB en vez de 45 KB).
- Los PNG de referencia no se versionan (ver `.gitignore`).

## Dos cosas que hay que saber para automatizar esta pantalla

- **«Modificar» abre un panel lateral con overlay.** Mientras está abierto ningún clic posterior
  entra: hay que cerrarlo (`[title="Cerrar"]`) antes de seguir.
- **«Pre-evaluación» abre un `ConfirmDialog`** («Excepciones sin comentario») que también bloquea.
  Se resuelve con «Enviar de todos modos», y recién ahí aparece el tab **Verificación**.
