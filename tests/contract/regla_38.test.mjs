// -------------------------------------------------------------------------------------------------
// Gate de la regla 38 — la entrada al sistema cuelga del éxito FINAL de autenticación.
//
// La trampa es de producto, no de código: el botón «Ingresar» NO lleva al dashboard, lleva al paso
// OTP. Colgar ahí la transición la dispara antes de autenticar y deja entrar a cualquiera visualmente.
// Las dos vías que sí terminan la autenticación son `verificarOtp` (credenciales + 2FA) y el selector
// de cuenta del SSO, y las dos tienen que pasar por `entrarAlSistema`.
//
// Clase: REGLA (nunca se actualiza). `onIngresar` no se llama desde el manejador del botón.
// -------------------------------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const leer = (rel) => readFileSync(join(raiz, rel), "utf8");

/* Recorta el cuerpo de LoginScreen, que es donde viven las dos vías. */
export function cuerpoDelLogin(fuente) {
  const i = fuente.indexOf("function LoginScreen");
  if (i < 0) return "";
  const j = fuente.indexOf("\n// ============================================================", i);
  return fuente.slice(i, j > i ? j : i + 40000);
}

/* `entrar` es el manejador del botón: va al paso OTP y no debe terminar la sesión. */
export function cuerpoDeEntrar(login) {
  const i = login.indexOf("const entrar = async ()");
  if (i < 0) return "";
  const j = login.indexOf("\n  };", i);
  return login.slice(i, j > i ? j : i + 2000);
}

test("regla 38: `entrar` (el botón) va al OTP y NO termina la sesión", () => {
  const cuerpo = cuerpoDeEntrar(cuerpoDelLogin(leer("pipeline_comercial.jsx")));
  assert.ok(cuerpo.length > 0, "no encuentro el manejador `entrar`");
  assert.ok(/setPaso\("otp"\)/.test(cuerpo), "«Ingresar» tiene que dejar al usuario en el paso OTP");
  assert.ok(!/onIngresar\s*\(/.test(cuerpo),
    "«Ingresar» no puede llamar a onIngresar: todavía no hay segundo factor");
  assert.ok(!/entrarAlSistema\s*\(/.test(cuerpo),
    "«Ingresar» no puede disparar la entrada al sistema: todavía no hay segundo factor");
});

test("regla 38: las DOS vías que sí autentican pasan por entrarAlSistema", () => {
  const login = cuerpoDelLogin(leer("pipeline_comercial.jsx"));
  assert.ok(/const entrarAlSistema = /.test(login), "falta la definición de entrarAlSistema");
  // La definición es `entrarAlSistema = (`, así que lo que cuenta `entrarAlSistema(` son los CALL SITES.
  const llamadas = [...login.matchAll(/entrarAlSistema\(/g)].length;
  assert.equal(llamadas, 2, `las vías que autentican son dos (2FA y SSO); encontré ${llamadas} llamadas`);
  assert.ok(/authExito\([^)]*\);\s*entrarAlSistema\(/.test(login),
    "la vía credenciales + 2FA tiene que entrar por entrarAlSistema");
  assert.ok(/CUENTAS_MS\.map[\s\S]{0,600}?entrarAlSistema\(/.test(login),
    "el selector de cuenta del SSO tiene que entrar por entrarAlSistema");
});

test("regla 38: onIngresar se llama en un solo lugar, dentro de la transición", () => {
  const login = cuerpoDelLogin(leer("pipeline_comercial.jsx"));
  const veces = [...login.matchAll(/onIngresar\(/g)].length;
  assert.equal(veces, 1, `onIngresar tiene que llamarse una sola vez (en entrarAlSistema); son ${veces}`);
});

test("regla 38: nunca hay dos dashboards — el panel se oculta al montar la capa", () => {
  const login = cuerpoDelLogin(leer("pipeline_comercial.jsx"));
  assert.ok(/panel\.style\.visibility\s*=\s*"hidden"/.test(login),
    "sin ocultar el panel se ven DOS dashboards de distinto tamaño y ningún desenfoque lo tapa");
  assert.ok(/setTimeout\(listo,/.test(login),
    "el cambio de pantalla lo manda el reloj: si WAAPI falla, el usuario tiene que entrar igual");
});

test("sonda negativa: un `entrar` que termina la sesión es cazado", () => {
  const plantado = 'const entrar = async () => {\n    const r = await verificarCredenciales(email, clave);\n    onIngresar(r.code);\n  };';
  const cuerpo = cuerpoDeEntrar(plantado);
  assert.ok(/onIngresar\s*\(/.test(cuerpo), "la sonda tiene que contener la llamada prohibida");
});

test("sonda negativa: el recorte de `entrar` no se come el resto del componente", () => {
  const plantado = 'const entrar = async () => {\n    setPaso("otp");\n  };\n  const otra = () => { onIngresar("X"); };';
  assert.ok(!/onIngresar\s*\(/.test(cuerpoDeEntrar(plantado)),
    "el recorte tiene que cortar en el cierre de `entrar`, no arrastrar lo que viene después");
});
