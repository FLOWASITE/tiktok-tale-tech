#!/usr/bin/env python3
"""
Codemod: refactor hard-coded Lovable Gateway calls to go through
_shared/lovable-gateway.ts shim. Idempotent — re-running is safe.

Patterns replaced (chat completions only):
  Deno.env.get("LOVABLE_API_KEY")          → getGatewayConfig().apiKey
  "https://ai.gateway.lovable.dev/v1/chat/completions" → getGatewayConfig().url

Plus: inject `import { getGatewayConfig } from "../_shared/lovable-gateway.ts";`
at the top of each modified file (after the first import block).

Skipped: _shared/ai-provider.ts (already self-host aware) and embeddings files
(handled separately via _shared/embedding.ts).
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "supabase" / "functions"

SKIP = {
    "_shared/ai-provider.ts",
    "_shared/lovable-gateway.ts",
    "_shared/embedding.ts",
    "_shared/conversation-embedder.ts",
    "_shared/semantic-dedup.ts",
    "backfill-content-embeddings/index.ts",
    "embed-content/index.ts",
    "generate-embedding/index.ts",
}

URL_PATTERN = '"https://ai.gateway.lovable.dev/v1/chat/completions"'
KEY_PATTERN = re.compile(r'Deno\.env\.get\(["\']LOVABLE_API_KEY["\']\)')

IMPORT_LINE_RELATIVE = 'import { getGatewayConfig } from "../_shared/lovable-gateway.ts";'

def process(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    if rel in SKIP:
        return False
    txt = path.read_text(encoding="utf-8")
    if URL_PATTERN not in txt and not KEY_PATTERN.search(txt):
        return False

    orig = txt

    # Replace URL literal
    txt = txt.replace(URL_PATTERN, "getGatewayConfig().url")

    # Replace any Deno.env.get("LOVABLE_API_KEY") with getGatewayConfig().apiKey
    txt = KEY_PATTERN.sub("getGatewayConfig().apiKey", txt)

    # Inject import once
    if "lovable-gateway.ts" not in txt:
        # Insert after the last top-level import
        lines = txt.split("\n")
        last_import = 0
        for i, line in enumerate(lines[:80]):
            if line.startswith("import "):
                last_import = i
        lines.insert(last_import + 1, IMPORT_LINE_RELATIVE)
        txt = "\n".join(lines)

    if txt != orig:
        path.write_text(txt, encoding="utf-8")
        return True
    return False


def main():
    changed = []
    for p in ROOT.rglob("*.ts"):
        try:
            if process(p):
                changed.append(p.relative_to(ROOT).as_posix())
        except Exception as e:
            print(f"ERR {p}: {e}", file=sys.stderr)
    print(f"Refactored {len(changed)} files:")
    for c in changed:
        print(f"  - {c}")

if __name__ == "__main__":
    main()
