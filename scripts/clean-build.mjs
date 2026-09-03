import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const project = resolve(process.cwd());
const target = resolve(project, "dist");

if (basename(target) !== "dist" || dirname(target) !== project) {
  throw new Error("Refusing to clean an unexpected build directory");
}

await rm(target, { recursive: true, force: true });
