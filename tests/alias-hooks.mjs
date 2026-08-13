import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Teaches the Node test runner the same "@/" alias the app uses, so tests can
 * import the real modules rather than copies of them. Without this the runner
 * would need a bundler, and a test that runs against a copy is not a test.
 */
export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(root, "src", specifier.slice(2));
    // TypeScript lets you omit the extension; ESM does not, so put it back.
    const candidates = /\.[a-z]+$/.test(base) ? [base] : [`${base}.ts`, `${base}.tsx`, base];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
