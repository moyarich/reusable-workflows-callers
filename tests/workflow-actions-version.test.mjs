import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const workflows = fileURLToPath(new URL("../.github/workflows/", import.meta.url));
const FIRST_PARTY = /\buses:\s*actions\/(checkout|setup-node|setup-python)@([^\s#]+)/g;

describe("caller workflow GitHub Actions runtime", () => {
  it("uses the supported v7 first-party actions across every workflow", () => {
    const outdated = [];
    const paths = readdirSync(workflows).filter(name => /\.ya?ml$/.test(name));
    for (const name of paths) {
      const content = readFileSync(join(workflows, name), "utf8");
      for (const match of content.matchAll(FIRST_PARTY)) {
        if (match[2] !== "v7")
          outdated.push(name + ": actions/" + match[1] + "@" + match[2]);
      }
    }
    expect(paths.length).toBeGreaterThan(0);
    expect(outdated, "Upgrade first-party workflow actions to v7").toEqual([]);
  });
});
