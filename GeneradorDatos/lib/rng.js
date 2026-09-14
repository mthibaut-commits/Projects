// Azar DETERMINISTA por clave estable. Mismo generador que usa el pipeline (`hashStr` + mulberry32),
// de modo que regenerar dos veces produce byte a byte el mismo archivo.
function hashStr(s) { let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function pcRng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const semilla = (clave) => pcRng(Math.abs(hashStr(clave)));
const entre = (r, a, b) => a + r() * (b - a);
const ent = (r, a, b) => Math.round(entre(r, a, b));
module.exports = { hashStr, pcRng, semilla, entre, ent };
