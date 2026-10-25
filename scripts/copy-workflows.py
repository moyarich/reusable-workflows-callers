#!/usr/bin/env python3
"""Generate repository-specific workflow files from canonical source workflows."""
from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

from ruamel.yaml import YAML

yaml = YAML()
yaml.preserve_quotes = True

def merge(target, patch, location=""):
    """Recursive YAML mapping merge; scalar/list overrides replace existing values."""
    if not isinstance(patch, dict) or not isinstance(target, dict):
        return copy.deepcopy(patch)
    for key, value in patch.items():
        child = f"{location}.{key}" if location else str(key)
        if key not in target:
            raise ValueError(f"Override targets missing key: {child}")
        target[key] = merge(target[key], value, child)
    return target

def build(config_file: Path, repository: str, output: Path):
    config = yaml.load(config_file)
    files = config["source-files"]
    if not isinstance(files, list) or not files or len(set(files)) != len(files):
        raise ValueError("source-files must be a nonempty list without duplicates")
    destination = config.get("destination-directory", ".github/workflows")
    if destination != ".github/workflows":
        raise ValueError("Only .github/workflows destination is allowed")
    targets = [r for r in config["repositories"] if r["name"] == repository]
    if len(targets) != 1:
        raise ValueError(f"Expected exactly one repository config for {repository}")
    target = targets[0]
    exclude = target.get("exclude", [])
    include = target.get("include")
    overrides = target.get("overrides", {})
    if not isinstance(exclude, list) or any(f not in files for f in exclude):
        raise ValueError("exclude must reference source-files")
    if include is not None and (not isinstance(include, list) or any(f not in files for f in include)):
        raise ValueError("include must reference source-files")
    if not isinstance(overrides, dict) or any(f not in files for f in overrides):
        raise ValueError("overrides must reference source-files")
    selected = [f for f in files if (include is None or f in include) and f not in exclude]
    if any(f not in selected for f in overrides):
        raise ValueError("overrides cannot target excluded files")
    result = []
    for source in selected:
        if not isinstance(source, str) or not source.startswith(".github/workflows/") or not source.endswith(".yml"):
            raise ValueError(f"Unsafe source path: {source}")
        path = Path(source)
        if not path.is_file():
            raise ValueError(f"Missing source workflow: {source}")
        dst = output / destination / path.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        if source in overrides:
            document = yaml.load(path)
            patch = overrides[source]
            if not isinstance(patch, dict) or any(k not in ("jobs", "env", "defaults", "name", "run-name") for k in patch):
                raise ValueError(f"Unsafe workflow override: {source}")
            merge(document, patch)
            with dst.open("w") as handle:
                yaml.dump(document, handle)
        else:
            dst.write_bytes(path.read_bytes())
        result.append(str(Path(destination) / path.name))
    print(json.dumps({"repository": repository, "files": result, "excluded": sorted(set(files) - set(selected))}))
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path(".github/copy.yml"))
    parser.add_argument("--repository", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.config, args.repository, args.output)
