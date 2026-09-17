#!/usr/bin/env node
/* PreToolUse (EnterWorktree): los worktrees se usan sólo si el usuario los pidió explícitamente.
   En vez de bloquear a ciegas, convierte el intento en un diálogo de permiso: el diálogo es la prueba
   de que el worktree se discutió. */
export const DECISION = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: "Los worktrees se usan sólo si el usuario los pidió explícitamente en esta conversación. Si no fue así, trabaja en el checkout, en la rama designada de la sesión o en una feature/<slug>.",
  },
};
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.stdout.write(JSON.stringify(DECISION, null, 2) + "\n");
  process.exit(0);
}
