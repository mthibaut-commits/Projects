# Capturas simuladas

Capturas del DOM real tomadas sobre un estado que **el sistema no alcanza solo**: hay que conducir la
app hasta ahí antes de retratarla. Es la diferencia con las otras dos carpetas de capturas:

| Carpeta | Qué retrata | Cómo se llega |
|---|---|---|
| `Capturas_UI/` | las 11 pantallas en su **estado por defecto** | se abre la vista y se captura |
| `Variantes_UI/` | los **estados del detalle** de la operación | se hace clic dentro de la misma pestaña |
| `Capturas_Simuladas/` | estados que **cruzan de una ventana a otra** o dependen de un cálculo que sólo ocurre en otra pantalla | hay que ir, hacer, volver y recién ahí capturar |

## Qué hay

| Archivo | Qué muestra | Cómo se llega |
|---|---|---|
| `tubo-tabla-simulada.html` | el **tubo en vista Tabla con una operación ya simulada** | el tubo arranca entero en «Sin simular»: lo único que calcula condiciones es `simularOferta`, y esa función **sólo existe en la pestaña del detalle**. El script arma la oferta ahí, espera el aviso `nex-simulado`, busca en qué filtro quedó la fila —al simularse cambia de estado y puede salir del que estaba— y captura |

## Regenerar

```bash
node build_app.mjs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_tabla_simulada.mjs
```

## Reglas

- **No se editan a mano** (lo bloquea el hook `protect_paths`): si una pantalla se ve mal, el arreglo va
  en `pipeline_comercial.jsx` y se vuelve a capturar.
- Los **PNG** de referencia no se versionan (ver `.gitignore`): no comprimen y hacen crecer el repo en
  cada corrida. El HTML de al lado sí va — es el entregable, y es lo que se exporta a Figma.
- Cada captura **estampa rama, commit y fecha**, igual que las de `Capturas_UI/`: una captura sin eso no
  se puede fechar contra el fuente que la produjo.

## Qué entra acá

Una captura entra cuando **reproducirla exige conducir la app**, no sólo abrir una vista: un estado que
nace de un mensaje entre pestañas (`nex-simulado`), de un cálculo que corre en otra pantalla, o de una
simulación que hay que ejecutar antes. Si basta con abrir la vista, va a `Capturas_UI/`; si es un clic
dentro del detalle, va a `Variantes_UI/`.
