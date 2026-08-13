import { register } from "node:module";

// Node needs the resolve hook registered, not merely imported.
register("./alias-hooks.mjs", import.meta.url);
