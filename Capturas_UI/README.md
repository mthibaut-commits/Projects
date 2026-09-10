# Capturas_UI — las pantallas reales, capturadas del build de esta rama

**Esto es la fuente para exportar a Figma.** No son maquetas: es el DOM que Chromium pinta al abrir
`pipeline_comercial.html` construido desde este repo, con el CSS que de verdad le aplica. Cada
archivo lleva en un comentario la rama, el commit y la fecha de los que salió.

## Regenerar

```bash
node build_app.mjs
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node capturar_pantallas.mjs
```

Tarda unos 5 minutos: el HTML son 31 MB y Babel transpila las ~21.000 líneas en el navegador.

## Qué hay

| Archivo | Pantalla |
|---|---|
| `01-dashboard` | Dashboard |
| `02-pipeline` | Tubo diario · vista **Tabla** (la que carga por defecto) |
| `03-tareas` | Tareas |
| `04-clientes` | Clientes |
| `05-gestion` | Gestión (`PanelClientes`, con el Sankey) |
| `06-operaciones` | Operaciones |
| `07-lineas` | Líneas · sub-tab Vigentes |
| `08-otorgamientos` | Otorgamientos |
| `09-verificacion` | Verificación (mesa del equipo) |
| `10-tubo-kanban` | Tubo diario · vista **Kanban** |
| `11-detalle-operacion` | Detalle de la operación — **pestaña propia, no un drawer** |

## Reglas

- **No editar a mano.** Se regeneran; cualquier arreglo manual se pierde en la próxima corrida y
  vuelve a abrir la brecha entre el export y el código, que es lo que esto vino a cerrar.
- **Si una pantalla se ve mal, el arreglo va en el `.jsx`,** no acá.
- Los PNG son de referencia visual y **no se versionan** (ver `.gitignore`): se regeneran con el
  mismo comando.
- **Estado capturado:** el inbound corre hasta juntar ~100 negocios y después se pausa, así que las
  cifras son las de una sesión poblada. Cada pantalla queda en su estado por defecto — el tubo, por
  ejemplo, en la pestaña «Con línea», no en «Todos». Si el export necesita otro estado, se agrega el
  clic en `capturar_pantallas.mjs`; no se retoca el HTML.
