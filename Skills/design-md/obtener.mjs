#!/usr/bin/env node
/* Trae y consulta la colección DESIGN.md de VoltAgent/awesome-design-md (73 marcas).
   La colección queda en `coleccion/`, IGNORADA por git: son 2,8 MB de material de terceros
   que se actualiza solo y no tiene por qué vivir en la historia de este repo.

   POR QUÉ NINGÚN DESIGN.md VA A LA RAÍZ: un DESIGN.md en la raíz es, por convención, "cómo
   debe verse este proyecto", y los agentes de diseño lo leen así. Este proyecto YA tiene su
   lenguaje visual —la paleta Datamart del objeto `C`, la escala t7–t15, la skill datamart-ui,
   y ADR que no se re-litigan (sidebar, drawer, Mis Tareas)—. Dejar caer ahí el DESIGN.md de
   Stripe o de Linear no agrega una referencia: la CONTRADICE en silencio. Por eso `--a` es
   obligatorio al extraer y la raíz está bloqueada salvo --forzar.

   Uso:
     node Skills/design-md/obtener.mjs                          clona o actualiza la colección
     node Skills/design-md/obtener.mjs --listar                 las 73 marcas disponibles
     node Skills/design-md/obtener.mjs --marca=linear.app --a=<ruta>   copia ESE DESIGN.md
*/
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const COLECCION = join(AQUI, "coleccion");
const MARCAS = join(COLECCION, "design-md");
const RAIZ_REPO = resolve(AQUI, "..", "..");
const REPO = "https://github.com/voltagent/awesome-design-md.git";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const flag = (n) => process.argv.includes(`--${n}`);
const win = process.platform === "win32";

function correr(cmd, args, cwd, etiqueta) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win });
  if (r.status !== 0) { console.error(`\n✗ falló: ${etiqueta}`); process.exit(1); }
}

function asegurarColeccion() {
  if (existsSync(join(COLECCION, ".git"))) {
    correr("git", ["fetch", "--depth", "1", "origin"], COLECCION, "git fetch");
    correr("git", ["reset", "--hard", "origin/HEAD"], COLECCION, "git reset");
  } else {
    rmSync(COLECCION, { recursive: true, force: true });
    correr("git", ["clone", "--depth", "1", REPO, COLECCION], AQUI, "git clone");
  }
  if (!existsSync(MARCAS)) { console.error("✗ el upstream cambió de estructura: no hay design-md/"); process.exit(1); }
}

function listar() {
  return readdirSync(MARCAS).filter((d) => statSync(join(MARCAS, d)).isDirectory() && existsSync(join(MARCAS, d, "DESIGN.md"))).sort();
}

asegurarColeccion();
const marcas = listar();

if (flag("listar")) {
  console.log(`${marcas.length} marcas:\n`);
  for (let i = 0; i < marcas.length; i += 4) console.log("  " + marcas.slice(i, i + 4).map((m) => m.padEnd(16)).join(""));
  process.exit(0);
}

const marca = arg("marca");
if (!marca) {
  console.log(`✓ colección en ${relative(RAIZ_REPO, COLECCION)} — ${marcas.length} marcas`);
  console.log("  --listar para verlas · --marca=<x> --a=<ruta> para extraer una");
  process.exit(0);
}

if (!marcas.includes(marca)) {
  const cerca = marcas.filter((m) => m.includes(marca.toLowerCase().split(".")[0]));
  console.error(`✗ no existe la marca "${marca}"${cerca.length ? `. ¿Quisiste decir: ${cerca.join(", ")}?` : ""}`);
  console.error("  node Skills/design-md/obtener.mjs --listar");
  process.exit(1);
}

const a = arg("a");
if (!a) { console.error(`✗ falta --a=<ruta>: dónde dejar el DESIGN.md de ${marca}`); process.exit(1); }

const destino = resolve(RAIZ_REPO, a);
if (destino === join(RAIZ_REPO, "DESIGN.md") && !flag("forzar")) {
  console.error("✗ la RAÍZ del repo está bloqueada a propósito.");
  console.error("  Un DESIGN.md ahí lo leen los agentes como el lenguaje visual DE ESTE proyecto, y este");
  console.error("  proyecto ya tiene el suyo: paleta Datamart (objeto `C`), escala t7–t15, skill datamart-ui");
  console.error("  y ADR aceptados. Sería una contradicción silenciosa, no una referencia.");
  console.error("  Si igual lo quieres, repite con --forzar y déjalo dicho en el commit.");
  process.exit(1);
}

copyFileSync(join(MARCAS, marca, "DESIGN.md"), destino);
console.log(`✓ ${marca}/DESIGN.md → ${relative(RAIZ_REPO, destino)}`);
console.log("  Es una REFERENCIA: lo que gobierna este proyecto sigue siendo la paleta Datamart.");
