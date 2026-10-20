import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const patterns = Array.isArray(manifest.workspaces)
  ? manifest.workspaces
  : (manifest.workspaces?.packages ?? []);

const workspaces = patterns.flatMap((pattern) => {
  // Template convention: top-level packages/* and apps/*.
  const match = /^(.*)\/\*$/.exec(pattern);
  if (!match) throw new Error(`Unsupported workspace pattern: ${pattern}`);
  const parent = join(root, match[1]);
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(parent, entry.name);
      const file = join(directory, "package.json");
      return existsSync(file)
        ? [{ directory, relative: `${match[1]}/${entry.name}`, manifest: JSON.parse(readFileSync(file, "utf8")) }]
        : [];
    });
});

const [command, ...args] = process.argv.slice(2);

function run(script, workspace, extra = []) {
  const result = spawnSync("npm", ["run", script, "--workspace", workspace.relative, ...extra], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function select(candidates, script) {
  const found = candidates.find((workspace) => workspace.manifest.scripts?.[script]);
  if (!found) throw new Error(`No workspace provides the '${script}' script`);
  return found;
}

switch (command) {
  case "dev": {
    const apps = workspaces.filter((workspace) => workspace.relative.startsWith("apps/"));
    const preferred = apps.find((workspace) => workspace.relative.endsWith("/playground") && workspace.manifest.scripts?.dev);
    run("dev", preferred ?? select([...apps, ...workspaces], "dev"), args);
    break;
  }
  case "build:packages":
    for (const workspace of workspaces.filter((workspace) => workspace.relative.startsWith("packages/") && workspace.manifest.scripts?.build))
      run("build", workspace);
    break;
  case "build:playground":
    run("build", select(workspaces.filter((workspace) => workspace.relative.startsWith("apps/")), "build"));
    break;
  case "test:watch":
    run("test:watch", select([...workspaces.filter((workspace) => workspace.relative.startsWith("packages/")), ...workspaces], "test:watch"), args);
    break;
  case "pack:check": {
    const packages = workspaces.filter((workspace) => workspace.relative.startsWith("packages/") && workspace.manifest.private !== true);
    for (const workspace of packages) {
      const result = spawnSync("npm", ["pack", "--workspace", workspace.relative, "--dry-run"], {
        cwd: root, stdio: "inherit", shell: process.platform === "win32",
      });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
    console.log(`Checked ${packages.length} publishable packages.`);
    break;
  }
  default:
    throw new Error(`Unknown workspace command: ${command ?? "(missing)"}`);
}
