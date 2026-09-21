# Regresiones

Los documentos que cotejan la **definición** contra la **implementación** y dejan hallazgos que alguien
tiene que cerrar. Salieron de `Specs_Procesos/` a propósito: un spec dice **cómo es** el sistema y éstos
dicen **en qué no calza**; juntos, un hallazgo abierto se termina leyendo como si fuera norma.

| Documento | Qué cotejó | Estado |
|---|---|---|
| `Inconsistencias_Motor_Otorgamiento.md` (+ `.pdf`) | la política v1.1 contra el motor de otorgamiento: INC-01 a INC-07, con evidencia, impacto y la decisión de negocio de cada uno | **los siete cerrados** el 11-09-2026. Su §5 lista lo que sigue abierto, que no son hallazgos sino **parámetros que la propia política declara sin definir** |
| `Revision_Definiciones_2026-09-11.md` (+ `.pdf`) | los PDF de política, los `.md` de proceso y los layouts de integración contra lo que ejecuta el código | dice qué debe recoger la próxima versión del PDF, qué se corrigió en los `.md` y los defectos de implementación que aparecieron de paso |

## Cómo se lee uno de éstos

El diagnóstico de cada hallazgo se conserva **íntegro** —es lo que justifica la decisión— con un recuadro
arriba que dice qué decidió el negocio y qué se implementó. Las referencias a línea siguen ancladas al
commit en que se midieron; para encontrar el símbolo hoy, la búsqueda por nombre es más fiable que el
número de línea.

Un hallazgo que se cierra **no se borra**: se marca cerrado con su decisión. Lo que sí sube, cuando en tres
meses siga importando, es a `vault/conocimiento/reglas/<tema>.md` como regla con su gate.
