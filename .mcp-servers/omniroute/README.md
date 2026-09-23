# OmniRoute — gateway de IA (instalado, pendiente de tu llave)

`diegosouzapw/OmniRoute` (npm `omniroute`, MIT) es un **gateway**: enruta a 360 proveedores, apila capas
gratuitas y comprime tokens. No es una skill ni un servidor MCP local — es un servicio, y además expone
un MCP propio. **Son dos cosas separadas y se deciden por separado.**

## Estado (23-09-2026, medido en el contenedor)

| | |
|---|---|
| CLI | `omniroute` 3.8.50 instalado (`npm i -g omniroute`, 1136 paquetes, ~450 MB) |
| Servidor | levanta en **6,1 s**; dashboard en `http://localhost:20128`, API en `/v1` |
| Cuenta | `omniroute setup --non-interactive --password <clave>` la crea sin navegador |
| Llave de API | **falta** — se crea desde el dashboard; no hay ruta por CLI (`omniroute keys add` es para llaves de PROVEEDORES, no de OmniRoute) |
| MCP | `/api/mcp/stream` responde `AUTH_001` sin llave. `/v1/models` también. |

## Los dos usos, y por qué importa la diferencia

**1 · El MCP** (herramientas, no enruta nada). Ya está en `.mcp.json`. Necesita el servidor arriba y la
llave en el entorno:

```bash
omniroute serve &                        # servidor local
export OMNIROUTE_API_KEY="…"             # la que crees en el dashboard
```

Mientras no se cumplan esas dos cosas, Claude Code va a reportar `omniroute` como **fallo de conexión**
en cada arranque. Es esperable, no es un error de configuración. Para sacarlo: borra su entrada de
`.mcp.json`.

**2 · El gateway** (enruta el tráfico del modelo). Esto NO está configurado y no se configura en este
repo, porque cambia a dónde van los prompts:

```bash
omniroute run claude                     # lanza Claude Code apuntado al gateway
```

Lo que hay que saber antes de correr esa línea **en este proyecto**: el repo lleva `Specs_Procesos/`, el
`Levantamiento_Activos_Informacion.md`, `Integraciones/` y las razones sociales de deudores que
`.claude/rules/testing.md` marca como **reales y como decisión pendiente del usuario**. Enrutado por el
gateway, todo eso deja de ir a Anthropic y pasa por proveedores de capa gratuita, que salvo excepción
entrenan con lo que reciben. El propio catálogo de OmniRoute marca **13 proveedores como *avoid*** por
riesgo de términos. Es una decisión sobre documentos de un cliente, no un flag.

## Un aviso del propio arranque que conviene leer

> ⚠ SECURITY: listening on 0.0.0.0 with NO API-key requirement — the inference plane (/v1/\*) is
> reachable by ANY device that can route to this host, and requests are billed to your configured
> providers.

Por defecto escucha en **todas las interfaces**. En una red de oficina eso es cualquiera que te alcance
gastando tus cuotas. Se cierra con una de estas dos:

```bash
export OMNIROUTE_SERVER_HOST=127.0.0.1   # sólo loopback
export REQUIRE_API_KEY=true              # o exigir llave en el plano de inferencia
```

*(En este contenedor `/v1/models` sí pidió llave, así que el aviso no calza del todo con lo observado;
la recomendación de cerrar la interfaz vale igual.)*

## Lo que NO funciona en sesión web

Los 360 proveedores están **bloqueados por la política de egreso** del contenedor. El servidor levanta y
el dashboard responde, pero no puede enrutar a ninguna parte. Esto es de tu Windows, no de acá.
