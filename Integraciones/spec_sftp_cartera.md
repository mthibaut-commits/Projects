# Spec — sftp_cartera.csv (Activo A24)

**Propósito:** la **estructura comercial** del factoring —quién es ejecutivo, de qué equipo, bajo qué jefatura, en qué zona y sucursal— y la **asignación de cada cliente a su ejecutivo**. Es lo que decide **quién ve qué** en el tubo y a quién se le atribuye una operación.
**Transporte:** SFTP · `/in/cartera/` · `CARTERA_AAAAMMDD.csv` · diaria · UTF-8 · `;` · header. **Intradía:** upserts vía API A22 (dominio `CARTERA`) — un ejecutivo que entra o una cartera que se traspasa no esperan al batch del día siguiente.
**Clave:** `TIPO` + `COD_EJECUTIVO` + `RUT_CLIENTE`. Full-replace diario + upserts.

## Por qué existe

Ni la estructura ni la asignación son del pipeline: las produce **RRHH** y la **administración comercial**.

Tres consecuencias, todas verificadas antes de escribir esto:

1. **La cartera viajaba en el activo equivocado.** A5 describe participación de mercado; de quién es un cliente no es un atributo de su SOW. Cuando un activo lleva un campo que no es suyo, nadie sabe que hay que actualizarlo.
2. **La identidad era el nombre.** Cambiarle el apellido a una persona dejaba a toda su cartera sin dueño — sin error, sin aviso y sin forma de notarlo salvo que alguien reclamara.
3. **La jefatura no llegaba por ningún activo.** Era un mapa de una línea en el código. Un jefe nuevo no estaba en él, la búsqueda daba `undefined`, y eso se leía como «ve todo»: el ejecutivo nuevo fallaba **cerrado** y el jefe nuevo fallaba **abierto**, indistinguible de la gerencia.

## Dos granos, un archivo

La columna `TIPO` distingue las dos poblaciones:

| `TIPO` | Grano | Qué declara |
|---|---|---|
| `EJECUTIVO` | la persona | código, nombre, correo, equipo, jefatura, zona, sucursal, estado |
| `CARTERA` | la asignación | qué RUT cliente le pertenece, desde cuándo |

**Viajan juntos a propósito y se validan como una UNIDAD.** Una fila `CARTERA` que apunta a un `COD_EJECUTIVO` que el archivo no declara es un archivo roto: cargarla igual deja operaciones colgando de alguien que no existe, que es exactamente el estado que después nadie puede auditar. Con los dos granos en la misma entrega la comprobación es local y la carga falla entera, no a medias.

## Campos

| Campo | Aplica a | Descripción |
|---|---|---|
| `TIPO` | ambos | `EJECUTIVO` \| `CARTERA` |
| `COD_EJECUTIVO` | ambos | **La identidad.** Código estable del ejecutivo, independiente del nombre. Es lo que se congela en el JSON de cada oportunidad (`deal.exec`) |
| `RUT_CLIENTE` | `CARTERA` | RUT del cedente. Vacío en las filas `EJECUTIVO` |
| `NOMBRE` | ambos | Nombre de la persona en `EJECUTIVO`; razón social del cliente en `CARTERA`, como **copia de conveniencia** — el maestro de razón social es **A11** |
| `EMAIL` | `EJECUTIVO` | Correo corporativo |
| `EQUIPO` | `EJECUTIVO` | **Rótulo** del equipo comercial. Es presentación: se puede renombrar sin que cambie quién manda a quién |
| `COD_JEFE` | `EJECUTIVO` | **La arista.** Código de la jefatura a la que reporta. Es lo que decide el alcance de un jefe, no el rótulo del equipo |
| `ZONA` | `EJECUTIVO` | Zona comercial |
| `SUCURSAL` | `EJECUTIVO` | Sucursal desde la que opera |
| `ESTADO` | ambos | `ACTIVO` \| `INACTIVO`. Sólo se cargan las filas activas |
| `VIGENTE_DESDE` | ambos | Alta de la persona, o fecha en que el cliente se asignó a ese ejecutivo |
| `VIGENTE_HASTA` | ambos | Baja. Vacío mientras siga vigente |
| `FECHA_CORTE` | ambos | Generación |

## Notas

- **El rótulo del equipo no es una clave foránea.** `EQUIPO` se muestra; `COD_JEFE` decide. Hacer coincidir rótulos para saber a quién ve un jefe funcionaba sólo mientras nadie renombrara un equipo ni llegara un jefe cuyo equipo aún no estuviera escrito.
- **`COD_JEFE` apunta al catálogo de usuarios del TENANT, no a este archivo.** Quién es jefe y qué atribución tiene es configuración del tenant (Configuración › Usuarios / Roles); declararlo también acá lo pondría en dos sitios, que es el problema que este activo viene a cerrar. Este archivo declara **sólo la fuerza de venta**.
- **Una jefatura puede estar VACANTE**, y es un estado legítimo y frecuente: sus ejecutivos cuelgan de la gerencia. En el tenant de la demo sólo *Equipo Andes* tiene jefatura declarada; *Pacífico* y *Austral* están vacantes. De paso ejercita el caso que las reglas de atribución ya contemplan —un cargo vacante lo cubre la jefatura de su área—.
- **Un jefe que el archivo no menciona no ve NADA.** En una pantalla de oportunidades ajenas, fallar cerrado es la única respuesta defendible: lo contrario es que un error de carga abra la cartera completa.
- **Un RUT que no está en el archivo es un PROSPECTO, no un cliente sin ejecutivo.** No se rellena: quién trabaja un prospecto lo decide el pipeline con su propia regla de reparto, y eso es proceso, no dato. La diferencia importa porque un cliente sin dueño sí sería un defecto del archivo.
- **El archivo mueve EMPRESAS; no mueve OPERACIONES.** `deal.exec` guarda el código congelado en el JSON de la oportunidad. Que mañana el archivo asigne la empresa a otra persona no reasigna los negocios en curso: eso es un acto administrativo con fecha y responsable, y se hace en `Configuración › Oportunidades › Migración › Cambio de ejecutivo`, que va a la bitácora. Sólo se traspasa lo que está **en gestión, hasta antes del giro**: una operación girada ya se desembolsó y moverla sólo reescribiría de quién cuelga una venta que hizo otro.
- **La razón social de `CARTERA` es copia de conveniencia.** Se emite para que el archivo se pueda leer solo en una revisión manual; el maestro es A11. Si difieren, no se corrige el maestro: se registra la discrepancia (ver `Levantamiento_Activos_Informacion.md` §5).
- **Un código que el padrón ya no conoce no es «Agente IA».** Ese rótulo es para lo que de verdad no tiene dueño —`exec` vacío, originado por el inbound—. Un código desconocido es alguien que se fue, y se muestra marcado: relabelarlo falsea la atribución de operaciones que sí tuvieron dueño, y el dashboard, el Plan por Ejecutivo y el churn empiezan a contarle al agente lo que negoció una persona.
