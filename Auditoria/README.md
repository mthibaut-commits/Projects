# Auditoría

Los informes que **miden** algo del proyecto y salen con un número. No son norma: una auditoría dice qué
hay, no qué debe haber — lo que debe haber vive en `Specs_Procesos/` y en `vault/conocimiento/reglas/`.

| Documento | Qué mide | Fecha |
|---|---|---|
| `Auditoria_Bootstrap_Agentico.md` (+ `.pdf`) | el REPOSITORIO contra el skill `agentic-repo-bootstrap-v2`: siete hallazgos y el orden para cerrarlos. Es lo que motivó partir `CLAUDE.md` y abrir el vault | 17-09-2026 |
| `Auditoria_Bootstrap_Agentico_Cierre.md` (+ `.pdf`) | el cierre de esos siete | 19-09-2026 |
| `Auditoria_Codigo_Fuente.md` (+ `.pdf`) | el PRODUCTO: la forma de `pipeline_comercial.jsx` y qué cuesta cambiarlo | 18-09-2026 |
| `Auditoria_Codigo_Muerto.md` | lo que `node auditar_muerto.mjs` encuentra —símbolos sin referencia con transitividad, `useState` que nadie lee, props no declaradas, clases del `<style>`— y qué se podó | 14-09-2026 |
| `Auditoria_Generadores_En_App.md` | si queda algún generador de datos dentro del pipeline, que la regla núcleo 9 prohíbe | 14-09-2026 |

## Qué entra acá y qué no

- **Entra** un documento que cuenta, compara contra una línea base o reproduce una medición con su comando.
- **No entra** un documento que define cómo funciona el negocio (va a `Specs_Procesos/<tema>/`) ni uno que
  cotejó una definición contra la implementación y dejó hallazgos por cerrar (va a `Regresiones/`).
- Una **fecha de medición no es historial y se queda**: un conteo sin fecha no es una medición.
- Las cifras que un documento vivo cita están gateadas en `tests/contract/cifras.test.mjs`. Un informe de
  acá **no** lo está: es una foto con fecha, y por eso la lleva escrita.
