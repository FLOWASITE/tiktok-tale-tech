

# Remove Redundant Brand Memory & Compliance Nodes

## Why

The `generate-multichannel` edge function (which Content Node calls) already has:
- **Compliance pre-check**: Loads `industry_jurisdiction_profiles`, merges forbidden terms, compliance rules, claim restrictions, and blocks topics with forbidden terms (lines 1970-2000)
- **Brand voice/memory**: Loads full `brand_templates` with tone, forbidden words, compliance rules and injects them into the LLM prompt (lines 1750-1850)

The separate Brand Memory and Compliance graph nodes duplicate this work, adding ~100-200ms of latency per request for zero benefit.

## Changes

### 1. Remove nodes from graph plans (`graph-engine.ts`)

Update the 3 plan templates that reference these nodes:

- `generate_with_research`: Change `{ node: 'research', parallelWith: ['brand_memory', 'compliance'] }` to `{ node: 'research' }`
- `full_pipeline`: Same change
- Add `'brand_memory'` and `'compliance'` to `skipNodes` arrays

### 2. Remove from node registry (`graph/nodes/index.ts`)

- Remove imports for `createBrandMemoryNode` and `createComplianceNode`
- Remove `registry.set('brand_memory', ...)` and `registry.set('compliance', ...)` entries
- Keep the re-exports for backward compatibility (other code may reference them)

### 3. Clean up GraphState (`graph-state.ts`)

- Keep `brandMemoryContext` and `complianceResult` fields in the interface (they won't be populated but won't cause errors either)
- Remove them from `buildStateContext()` output since they'll always be empty

## What stays unchanged

- `brand-memory-node.ts` and `compliance-node.ts` files are kept (not deleted) for potential future use
- `generate-multichannel` continues to handle all compliance and brand voice logic internally
- No frontend changes needed

## Impact

- Faster graph execution (2 fewer parallel DB calls)
- Simpler pipeline: Research -> Strategy -> Content -> Reviewer -> Governor
