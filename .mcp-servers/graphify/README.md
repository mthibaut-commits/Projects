# graphify — el repo como grafo consultable

`Graphify-Labs/graphify` (PyPI `graphifyy`, Apache-2.0) parsea el código con AST de tree-sitter y arma
un grafo que se consulta en vez de grepear. Acá sirve para algo concreto: `pipeline_comercial.jsx` es
**un solo archivo enorme**, y el `CLAUDE.md` ya pide leer sólo las secciones necesarias.

## Reconstruir el grafo

```bash
uv tool install "graphifyy[mcp]"        # una vez (requiere uv; el repo es Node, esto es Python)
graphify extract . --code-only --no-label
```

`graphify-out/` está **ignorado por git**: son 1,8 MB generados y se quedan obsoletos apenas cambia el
`.jsx` (regla núcleo 10 — se corrige el origen y se regenera). Hay que rehacerlo tras un cambio grande.

## Por qué `--code-only` y `--no-label`

Sin esos flags, graphify manda los documentos que NO son código —`Specs_Procesos/`,
`Levantamiento_Activos_Informacion.md`, `Integraciones/`, el vault— a un modelo para un pase semántico,
y usa otro para nombrar las comunidades. Eso es la fuente de verdad de negocio de BICE / Factoring
Security saliendo del proyecto, y no es una decisión que se tome de paso. Con `--code-only` la
extracción es **AST local, determinista y sin red** — que además es lo que pide la regla núcleo 9.

Si algún día se quiere el pase semántico sobre los documentos, es una decisión con alternativas: va a
un ADR (`vault/adr/`), no a un flag.

## Exclusiones

`.graphifyignore` en la raíz, sintaxis de `.gitignore`, se **suma** al `.gitignore` del repo. Deja fuera
lo trackeado que no es código de este proyecto: `datos_inyectados.js` (33 MB generados), `vendor/`
(bytes fijados por el SBOM), `Legado/`, `Capturas_UI/` y `Variantes_UI/` (salida), las skills de
terceros y los clones de `.mcp-servers/*/upstream/`.

Medido el 23-09-2026: **88 archivos de código → 1608 nodos, 3322 aristas, 100 comunidades**. Los hubs
que detecta calzan con lo que el `CLAUDE.md` ya afirma: `PipelineComercial` (114 aristas), `DealDrawer`
(70), `hashStr` (59), `fmtMM` (50).

## El servidor MCP

`.mcp.json` lo levanta con `uvx --from graphifyy[mcp] graphify-mcp graphify-out/graph.json`, que resuelve
el paquete solo — no hace falta `uv tool install` previo, pero **sí hace falta `uv`** en la máquina.
Diez herramientas: `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`,
`graph_stats`, `shortest_path`, `list_prs`, `get_pr_impact`, `triage_prs`.

**Sin `graphify-out/graph.json` el servidor no levanta.** Es lo primero que hay que mirar si falla.

## Lo que NO se instaló

`graphify install` registra la skill `/graphify` **y mete un hook `PreToolUse` en
`.claude/settings.json`**, donde viven los tres hooks deterministas del repo. No lo corrí: es una
decisión sobre el comportamiento del agente en todo el proyecto. Si lo quieres:

```bash
graphify install --project        # NO uses --strict: bloquea la primera lectura de archivo de cada sesión
```

Después de correrlo, `git diff .claude/settings.json` y `node --test "tests/contract/*.test.mjs"`.

## Privacidad

graphify loguea cada consulta en `~/.cache/graphify-queries.log` (JSON Lines: pregunta, corpus, nodos,
duración; no el subgrafo). Se apaga con `GRAPHIFY_QUERY_LOG_DISABLE=1`.
