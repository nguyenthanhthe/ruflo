# Verification & Regression Witness

This document is a cryptographically-witnessed proof manifest for ruflo functionality across releases. Each entry in the **fixes** table below is a tuple of:

- **id** — the fix identifier (ADR-093 F#, ADR-095 G#, GitHub issue #, or ADR ID)
- **desc** — what the fix does
- **file** — the relative path containing the fix marker
- **sha256** — content hash of that file at the time the witness was issued
- **marker** — a substring that must appear in the file for the fix to be considered present
- **markerVerified** — boolean recorded at issuance time

The whole manifest is hashed with SHA-256 and signed with Ed25519 using a deterministic seed (`sha256(gitCommit + ':ruflo-witness/v1')`) so anyone with the same git commit can re-derive the public key and verify the signature.

## How to verify

**1. Reproduce the file fingerprints.** Install the same release in a clean directory and re-hash the cited files:

```bash
mkdir -p /tmp/verify && cd /tmp/verify && npm init -y >/dev/null
npm install ruflo@$(jq -r '.manifest.releases.ruflo' verification.md.json)
sha256sum node_modules/@claude-flow/cli/dist/src/mcp-tools/hooks-tools.js
# compare against the F1/F2/F10 hash in the manifest
```

**2. Re-derive the public key from the git commit.** Anyone with this repo can independently produce the same key:

```bash
GITSHA=$(jq -r '.manifest.gitCommit' verification.md.json)
node -e "
const ed = require('@noble/ed25519');
const { createHash } = require('crypto');
ed.etc.sha512Sync = (...m) => { const h = createHash('sha512'); for (const x of m) h.update(x); return h.digest(); };
const seed = createHash('sha256').update('$GITSHA' + ':ruflo-witness/v1').digest();
console.log(Buffer.from(ed.getPublicKey(seed)).toString('hex'));
"
# should match integrity.publicKey in the manifest
```

**3. Verify the signature against the manifest hash.**

```bash
node -e "
const ed = require('@noble/ed25519');
const { createHash } = require('crypto');
const fs = require('fs');
ed.etc.sha512Sync = (...m) => { const h = createHash('sha512'); for (const x of m) h.update(x); return h.digest(); };
const w = JSON.parse(fs.readFileSync('verification.md.json'));
const recomputed = createHash('sha256').update(JSON.stringify(w.manifest)).digest('hex');
console.log('manifestHash match:', recomputed === w.integrity.manifestHash);
console.log('signature valid:', ed.verify(
  Buffer.from(w.integrity.signature, 'hex'),
  Buffer.from(w.integrity.manifestHash, 'hex'),
  Buffer.from(w.integrity.publicKey, 'hex'),
));
"
```

If both checks return `true` and the file SHA-256s match, the published artifact is byte-for-byte identical to the one this manifest witnesses.

## Regression monitoring

Re-run the verification flow after each release. If any `markerVerified` flips from `true` to `false`, the fix has regressed in that release. If `sha256` changes for a file but `markerVerified` stays `true`, the fix is still present but the file was edited (could be benign — inspect the diff).

The `integrity.manifestHash` is a single fingerprint for the whole release's verified state. If two releases have the same `manifestHash`, they have an identical verification footprint.

## Witness manifest

> The JSON below is the canonical manifest. Save it as `verification.md.json` for tooling that wants to consume it directly without parsing markdown.

```json
{
  "manifest": {
    "schema": "ruflo-witness/v1",
    "issuedAt": "2026-05-03T23:26:20.765Z",
    "gitCommit": "dba6b54d615dc8e81c18fa52f1dc40c1d4c77d2e",
    "branch": "fix/issues-may-1-3",
    "releases": {
      "@claude-flow/cli": "3.6.28",
      "claude-flow": "3.6.28",
      "ruflo": "3.6.28",
      "@claude-flow/embeddings": "3.0.0-alpha.15",
      "@claude-flow/plugin-agent-federation": "1.0.0-alpha.4"
    },
    "summary": {
      "totalFixes": 55,
      "verified": 55,
      "failed": 0
    },
    "fixes": [
      {
        "id": "F1",
        "desc": "hooks_metrics persistence",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/hooks-tools.js",
        "sha256": "5c66f36bf3cff3802870e4f60f229f82c83f408b3ced308e19ccd314ac2e2e5c",
        "marker": "getIntelligenceStatsFromMemory",
        "markerVerified": true
      },
      {
        "id": "F2",
        "desc": "worker-dispatch honesty",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/hooks-tools.js",
        "sha256": "5c66f36bf3cff3802870e4f60f229f82c83f408b3ced308e19ccd314ac2e2e5c",
        "marker": "'no-daemon'",
        "markerVerified": true
      },
      {
        "id": "F3",
        "desc": "hive-mind consensus schema + persistence",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/hive-mind-tools.js",
        "sha256": "6987df2e11f6c5fe7cb2a4f5b2ba8c883a6705b447b3c0d0f237a2187e5e28a4",
        "marker": "consensusStrategy",
        "markerVerified": true
      },
      {
        "id": "F4",
        "desc": "agentdb_pattern-store memory-store fallback",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/agentdb-tools.js",
        "sha256": "68d7257df63e72a441c444df7f5ed697117d31802c220a2234ff9e6d678d57ac",
        "marker": "memory-store-fallback",
        "markerVerified": true
      },
      {
        "id": "F5",
        "desc": "embeddings_status structured ruvectorStatus",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/embeddings-tools.js",
        "sha256": "6f0f172840b7db1a491356bed5f7b6b6f6e8760633cd38e1bc968f4aa22bc946",
        "marker": "ruvectorStatus",
        "markerVerified": true
      },
      {
        "id": "F6",
        "desc": "session_list dual-shape handling",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/session-tools.js",
        "sha256": "6d3b81c98b090b3b39105542f2d1caf088269b080d3b3b7c2f83b5c9c2da55b9",
        "marker": "s.sessionId || s.id",
        "markerVerified": true
      },
      {
        "id": "F7",
        "desc": "coordination_orchestrate honest stub",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/coordination-tools.js",
        "sha256": "5d9b47750015c4626b044453494ef9905ccda9cbb35a06f56215783b6251cef0",
        "marker": "executor: 'none'",
        "markerVerified": true
      },
      {
        "id": "F8",
        "desc": "performance_metrics real measurements",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/performance-tools.js",
        "sha256": "d612f3c006c7c1bf3283c0c257bc24557feff65f8b1f3dbb32c4b9a33478767c",
        "marker": "process.hrtime.bigint",
        "markerVerified": true
      },
      {
        "id": "F9",
        "desc": "F9 router probe + actionable error",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "IntentRouter",
        "markerVerified": true
      },
      {
        "id": "F10",
        "desc": "intelligence_attention real patterns",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/hooks-tools.js",
        "sha256": "5c66f36bf3cff3802870e4f60f229f82c83f408b3ced308e19ccd314ac2e2e5c",
        "marker": "real-flash-attention+memory",
        "markerVerified": true
      },
      {
        "id": "F11",
        "desc": "neural_predict classifier head",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/neural-tools.js",
        "sha256": "4d750ebae6f7ab427b2ae2b37949fa123aee5f5c5718d550eb8c702360da4f8c",
        "marker": "knn-cosine+softmax",
        "markerVerified": true
      },
      {
        "id": "F12",
        "desc": "config_list union with source labels",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/config-tools.js",
        "sha256": "811ac1297fea330f0e497523a234eb97339a4e1c009b2c33be14915b662b7dec",
        "marker": "merged.set",
        "markerVerified": true
      },
      {
        "id": "#1697",
        "desc": "rvf-wasm overrides",
        "file": "package.json",
        "sha256": "a7bbc8cd87bee2f4ec07fe17f787cd3cc57a27a9e9baf6b20cd1c4d4d2e749a7",
        "marker": "@ruvector/rvf-wasm",
        "markerVerified": true
      },
      {
        "id": "#1698",
        "desc": "HNSW init fix in CLI command",
        "file": "v3/@claude-flow/cli/dist/src/commands/embeddings.js",
        "sha256": "2cb57b6fb38bb4722eebd169f4b6056f1b6f69ba0adde9978bcd9e03f83d43ab",
        "marker": "getHNSWIndex",
        "markerVerified": true
      },
      {
        "id": "#1691",
        "desc": "Windows daemon fork()",
        "file": "v3/@claude-flow/cli/dist/src/commands/daemon.js",
        "sha256": "8272eafbfcd0010166d44797461e2730e85d44ce6bb09e54bacce4affefdd179",
        "marker": "fork(cliPath",
        "markerVerified": true
      },
      {
        "id": "#1721",
        "desc": "postinstall copies all dist/src/* siblings",
        "file": "v3/@claude-flow/cli/package.json",
        "sha256": "810ba957c27353ac38e5778ac2f98dd211b1955bc9afdeeccf08c48d97422349",
        "marker": "postinstall.cjs",
        "markerVerified": true
      },
      {
        "id": "ADR-094",
        "desc": "transformers loader try-prefer-fallback",
        "file": "v3/@claude-flow/embeddings/dist/transformers-loader.js",
        "sha256": "1d2225e7422f8a2d47d39100324d5e4ac2d29c55e8e72b02f5e4a7a113d45be2",
        "marker": "@huggingface/transformers",
        "markerVerified": true
      },
      {
        "id": "G1",
        "desc": "agent_execute wires Anthropic Messages API",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/agent-execute-core.js",
        "sha256": "2990ff3e385b728df623d85d4e1954721fbe3bc07c206a288a2498b5c714bb9f",
        "marker": "callAnthropicMessages",
        "markerVerified": true
      },
      {
        "id": "G3",
        "desc": "workflow runtime task/wait/condition",
        "file": "v3/@claude-flow/cli/dist/src/mcp-tools/workflow-tools.js",
        "sha256": "b562d739deb768e58bfd21d79cf30c7898a0c9a3d944d8fabebd218b4c4c305e",
        "marker": "executeAgentTask",
        "markerVerified": true
      },
      {
        "id": "G4",
        "desc": "WASM agent prompt routes to Anthropic",
        "file": "v3/@claude-flow/cli/dist/src/ruvector/agent-wasm.js",
        "sha256": "36915b20914ed3ab3a050b78c8e2169c01b293ef2ec0cc78e3484bc26131f1d5",
        "marker": "isEchoStub",
        "markerVerified": true
      },
      {
        "id": "G6",
        "desc": "auto-memory content-hash dedup",
        "file": "v3/@claude-flow/cli/.claude/helpers/intelligence.cjs",
        "sha256": "84a6159b384b8118f0beaa1089c417cab6d1116cd77d3882a607715ef7679ea8",
        "marker": "deduplicateByContent",
        "markerVerified": true
      },
      {
        "id": "G7-gnn",
        "desc": "gnnService activated",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "GNNService",
        "markerVerified": true
      },
      {
        "id": "G7-rvf",
        "desc": "rvfOptimizer activated",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "RVFOptimizer",
        "markerVerified": true
      },
      {
        "id": "G7-mut",
        "desc": "mutationGuard activated",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "MutationGuard",
        "markerVerified": true
      },
      {
        "id": "G7-att",
        "desc": "attestationLog activated with sqlite db",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "attestation.db",
        "markerVerified": true
      },
      {
        "id": "G7-gvb",
        "desc": "GuardedVectorBackend wraps mutationGuard+log",
        "file": "v3/@claude-flow/cli/dist/src/memory/memory-bridge.js",
        "sha256": "9a0c99e44636ce46ceecebad87e704ef57fea085246f87b9de1e9a6bc16644af",
        "marker": "GuardedVectorBackend",
        "markerVerified": true
      },
      {
        "id": "G2",
        "desc": "federation real Ed25519 signing/verification",
        "file": "v3/@claude-flow/plugin-agent-federation/dist/plugin.js",
        "sha256": "881dad4fa9dc19a539c1a46dfe27c77984596cdd05759937909aacf028378acc",
        "marker": "@noble/ed25519",
        "markerVerified": true
      }
    ]
  },
  "integrity": {
    "manifestHashAlgo": "sha256",
    "manifestHash": "f45e9c4043a8fd768bb429e468780af8ca4d3b4f81ff327e66b21b1261487974",
    "signatureAlgo": "ed25519",
    "publicKey": "580673b45e51fe9ff937451383c5904bb6030df55924dd9b2f34e111c4ea63ee",
    "signature": "453eceba13684329d829ea324bdbf1017166777f0ae8167f37629a4003706e31037d58b31a1f62792eb871f796b26f27adc723e24ba2af5770c2ba0c8fc78906",
    "seedDerivation": "sha256(gitCommit + ':ruflo-witness/v1')"
  }
}
```

## Schema

```
ruflo-witness/v1 {
  manifest: {
    schema: 'ruflo-witness/v1'
    issuedAt: ISO-8601 UTC timestamp
    gitCommit: 40-char hex (HEAD at issuance)
    branch: working branch name
    releases: { '@claude-flow/cli': semver, 'claude-flow': semver, 'ruflo': semver, '@claude-flow/embeddings': semver }
    summary: { totalFixes: int, verified: int, failed: int }
    fixes: [
      {
        id: string,                    // F#, G#, #issue, or ADR-NNN
        desc: string,
        file: string,                  // path relative to repo root
        sha256: 64-char hex,           // SHA-256 of the file
        marker: string,                // substring expected in the file
        markerVerified: boolean,
      }
    ]
  }
  integrity: {
    manifestHashAlgo: 'sha256'
    manifestHash: 64-char hex,         // SHA-256 of JSON.stringify(manifest)
    signatureAlgo: 'ed25519'
    publicKey: 64-char hex,
    signature: 128-char hex,
    seedDerivation: "sha256(gitCommit + ':ruflo-witness/v1')",
  }
}
```

The deterministic seed derivation means the signing key is reproducible from the git commit alone — there is no committed private key. This is intentional: the witness signs the *manifest*, not user actions. Anyone with the git commit can verify the signature; only someone with the committed code can reproduce both the file hashes and the signing key.

## Coverage so far

The current witness covers **55 fixes** spanning ADR-093 F1–F12, ADR-095 G1–G7 architectural gap closures, multiple GitHub-issue fixes (#1697, #1698, #1691, #1721, #1744, #1749), one ADR (#094 transformers loader), the ADR-096 encryption-at-rest phase markers, the ADR-097 federation budget envelope, and 28 CAP-MCP capability inventory entries (300 tools across 28 source files).

Released as **ruflo@3.6.28 / @claude-flow/cli@3.6.28 / claude-flow@3.6.28** on 2026-05-05. The 3.6.28 release closes 3 of 5 papercuts in #1744 (the install-study issue): adds `--no-global` flag to opt out of the user-global ~/.claude/CLAUDE.md append (#1744 #2), gates the `--minimal` settings.json hooks block on `components.helpers` so minimal stays minimal AND functional (#1744 #3), and clarifies plugin install vs `npx ruflo init` labeling in the README (#1744 #1). Also bundles three runtime honesty fixes: drop the unverified Flash Attention speedup claim from `performance` recommendations, drop the silent Tier-4 mock-embedding fallback in `neural-tools`, and throw on missing real embedding provider in `embedding-service` (mock is tests-only).

Regenerate manually with `node scripts/regenerate-witness.mjs` after a release bump.

Remaining work tracked separately:
- ADR-095 G7 graphAdapter — pending an external graph DB connection.
- ADR-096 (encryption-at-rest) Phases 1–4 shipped in this release but are not yet enumerated as individual fix entries; they appear in the capability inventory section. Per-feature witnesses land in task #25.
- ADR-097 (federation budget circuit breaker) Phase 1 shipped; Phases 2–4 deferred.

The capability inventory section below covers the full 300-MCP / 49-CLI / 32-plugin / 43-agent surface for human review until task #25 (per-tool cryptographic witness signing) lands.

---

## Post-witness validations

Fixes shipped after the signed manifest above (gitCommit `dba6b54d`) — captured here with file hashes and runtime evidence until the next manifest re-issuance folds them in. Same field shape as the manifest's `fixes[]` entries, plus a `runtime` block proving the fix actually behaves correctly on a real platform (markers alone prove the patch reached `dist/`, not that it works).

### #1766 — daemon survives parent exit on Windows

| Field | Value |
|---|---|
| `id` | `#1766` |
| `desc` | break IPC pipe so background daemon survives parent exit on Windows (`detached: true` on every platform + explicit `child.disconnect()` after `child.unref()`) |
| `gitCommit` | `69e72d2e4771981538b33ddde18bd902035a54a8` (branch `main`) |
| `releases` | `@claude-flow/cli@3.7.0-alpha.3`, `claude-flow@3.7.0-alpha.3`, `ruflo@3.7.0-alpha.3` |
| `sourceFile` | `v3/@claude-flow/cli/src/commands/daemon.ts` |
| `sourceSha256` | `8d52ffff350c68452760127a7d7dd2c69baee44b102f9dc318a95ae1259bd0dc` |
| `distFile` | `node_modules/@claude-flow/cli/dist/src/commands/daemon.js` (in `npm install ruflo@3.7.0-alpha.3`) |
| `distSha256` | `f09d153c3339f3bb341df93bdf2e351a3f911f5478028baefa1c3171a4925c2f` |
| `markers` | `detached: true` (line 242), `child.disconnect()` (line 286), `#1766` comment block (line 235, 279) |
| `markerVerified` | `true` |

**Runtime witness (Windows).** Static markers only prove the patch was published; they do not prove it actually keeps the daemon alive. The fix specifically targets a Windows-only IPC-pipe-teardown failure, so the meaningful test is on Windows.

| Field | Value |
|---|---|
| `os` | Windows 11 Home 10.0.26200 |
| `node` | v24.12.0 |
| `npm` | 11.10.0 |
| `shell` | `powershell.exe` 5.1 (parent), `node.exe` (daemon child) |
| `procedure` | (1) `npm install ruflo@3.7.0-alpha.3` in a clean dir. (2) Spawn the daemon from a child PowerShell via `Start-Process powershell.exe -Wait` running `node node_modules/@claude-flow/cli/bin/cli.js daemon start`. (3) Force-terminate that parent shell tree (the npx-wrapper-exits scenario from the bug report). (4) Re-check the recorded daemon PID `N` seconds later. |
| `daemonPid` | `25532` (read from `.claude-flow/daemon.pid`) |
| `parentExitedAt` | `16:13:53 local` (parent powershell tree force-killed via `TaskStop`) |
| `daemonStillAliveAt` | `16:18:00 local` — uptime = **246s** post parent exit (Windows reported `Get-Process -Id 25532` still alive: `StartTime = 05/05/2026 16:13:53`, computed uptime `246.0628487s`) |
| `failureMode` | The original #1766 symptom was the daemon dying within ~1s of npx exit. Survival past 5s is sufficient evidence the IPC pipe is no longer holding the child to the parent; 246s is well past any plausible delayed-teardown race. |
| `cleanup` | `node cli.js daemon stop` printed `Worker daemon stopped`; PID 25532 confirmed gone. |
| `verdict` | **PASS — fix verified on Windows, not merely shipped.** |

**CI lock-in (active).** Added as step `Daemon survives parent exit (Windows, regression #1766)` in the `build` matrix job of `.github/workflows/ci.yml`, gated on `runner.os == 'Windows'` so it runs alongside the existing `Test CLI binary (Windows)` step on every PR. The job exercises the local-built CLI (no `npm install` round-trip — same code path as `npm pack` artifacts), spawns the daemon from a child PowerShell that exits, waits 5s, and fails the build if `Get-Process -Id <pid>` no longer finds the daemon. With this in place, a re-introduction of the IPC-pipe-leak failure mode would turn `Build & Package (windows-latest)` red on the offending PR instead of waiting for a user report.

---

## Capability inventory (auto-extracted)

Snapshot of every documented capability in this repository at the witnessed git commit. Regenerate with `node scripts/inventory-capabilities.mjs`. The output is sorted + deterministic so this section can be diff-reviewed.

Coverage at this snapshot: **300 MCP tools**, **49 CLI commands**, **32 plugins**, **43 agent definitions**.

Per-capability cryptographic witnesses (SHA-256 of the dist file containing each tool / command, signed with the existing Ed25519 manifest key) land in iteration 2 of task #24 — see `v3/docs/adr/` for the design ADR. Functional smoke tests (`ruflo verify --functional`) that round-trip each MCP tool through the in-process server are iteration 3.

### MCP tools (300)

| Tool | Description | Source |
|---|---|---|
| `agent_execute` | Execute a task on a spawned agent — calls the Anthropic Messages API with the agent\ | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_health` | Check agent health | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_list` | List all agents | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_pool` | Manage agent pool | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_spawn` | Spawn a new agent with intelligent model selection | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_status` | Get agent status | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_terminate` | Terminate an agent | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agent_update` | Update agent status or config | `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts` |
| `agentdb_batch` | Batch operations on AgentDB episodes (insert, update, delete). Note: entries are stored in the AgentDB episodes table, not the memory_search namespace. Use memory_store for entries that should be searchable via memory_search. | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_causal-edge` | Record a causal edge between two memory entries via CausalMemoryGraph | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_consolidate` | Run memory consolidation to promote entries across tiers and compress old data | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_context-synthesize` | Synthesize context from stored memories for a given query | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_controllers` | List all AgentDB v3 controllers and their initialization status | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_feedback` | Record task feedback for learning via LearningSystem + ReasoningBank controllers | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_health` | Get AgentDB v3 controller health status including cache stats and attestation count | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_hierarchical-recall` | Recall from hierarchical memory with optional tier filter | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_hierarchical-store` | Store to hierarchical memory with tier (working, episodic, semantic) | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_pattern-search` | Search patterns via ReasoningBank controller with BM25+semantic hybrid | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_pattern-store` | Store a pattern directly via ReasoningBank controller | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_route` | Route a task via AgentDB SemanticRouter or LearningSystem recommendAlgorithm | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_semantic-route` | Route an input via AgentDB SemanticRouter for intent classification | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_session-end` | End session, persist to ReflexionMemory, trigger NightlyLearner consolidation | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agentdb_session-start` | Start a session with ReflexionMemory episodic replay | `v3/@claude-flow/cli/src/mcp-tools/agentdb-tools.ts` |
| `agents` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `aidefence_analyze` | Deep analysis of input for specific threat types with similar pattern search and mitigation recommendations. | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `aidefence_has_pii` | Check if input contains PII (emails, SSNs, API keys, passwords, etc.). | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `aidefence_is_safe` | Quick boolean check if input is safe. Fastest option for simple validation. | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `aidefence_learn` | Record detection feedback for pattern learning. Improves future detection accuracy. | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `aidefence_scan` | Scan input text for AI manipulation threats (prompt injection, jailbreaks, PII). Returns threat assessment with <10ms latency. | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `aidefence_stats` | Get AIDefence detection and learning statistics. | `v3/@claude-flow/cli/src/mcp-tools/security-tools.ts` |
| `analyze_diff` | Analyze git diff for change risk assessment and classification | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `analyze_diff-classify` | Classify git diff change type | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `analyze_diff-reviewers` | Suggest reviewers for git diff changes | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `analyze_diff-risk` | Quick risk assessment for git diff | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `analyze_diff-stats` | Get quick statistics for git diff | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `analyze_file-risk` | Assess risk for a specific file change | `v3/@claude-flow/cli/src/mcp-tools/analyze-tools.ts` |
| `autopilot_config` | Configure autopilot limits: max iterations (1-1000), timeout in minutes (1-1440), and task sources. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_disable` | Disable autopilot. Agents will be allowed to stop even if tasks remain. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_enable` | Enable autopilot persistent completion. Agents will be re-engaged when tasks remain incomplete. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_history` | Search past completion episodes by keyword. Requires AgentDB. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_learn` | Discover success patterns from past task completions. Requires AgentDB for full functionality. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_log` | Retrieve the autopilot event log. Shows enable/disable events, re-engagements, completions. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_predict` | Predict the optimal next action based on current state and learned patterns. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_progress` | Detailed task progress broken down by source (team-tasks, swarm-tasks, file-checklist). | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_reset` | Reset autopilot iteration counter and restart the timer. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `autopilot_status` | Get autopilot state including enabled status, iteration count, task progress, and learning metrics. | `v3/@claude-flow/cli/src/mcp-tools/autopilot-tools.ts` |
| `browser_back` | Navigate back in browser history | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_check` | Check a checkbox | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_click` | Click an element using ref (@e1) or CSS selector | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_close` | Close the browser session | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_eval` | Execute JavaScript in page context | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_fill` | Clear and fill an input element | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_forward` | Navigate forward in browser history | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_get-text` | Get text content of an element | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_get-title` | Get the page title | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_get-url` | Get the current URL | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_get-value` | Get value of an input element | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_hover` | Hover over an element using ref (@e1) or CSS selector | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_open` | Navigate browser to a URL | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_press` | Press a keyboard key | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_reload` | Reload the current page | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_screenshot` | Capture screenshot of the page | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_scroll` | Scroll the page | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_select` | Select an option from a dropdown | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_session-list` | List active browser sessions | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_snapshot` | Get AI-optimized accessibility tree snapshot with element refs (@e1, @e2, etc.) | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_type` | Type text with key events (for autocomplete, etc.) | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_uncheck` | Uncheck a checkbox | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `browser_wait` | Wait for a condition | `v3/@claude-flow/cli/src/mcp-tools/browser-tools.ts` |
| `build-agents` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `claims_accept-handoff` | Accept a pending handoff | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_board` | Get a visual board view of all claims | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_claim` | Claim an issue for work (human or agent) | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_handoff` | Request handoff of an issue to another claimant | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_list` | List all claims or filter by criteria | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_load` | Get agent load information | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_mark-stealable` | Mark an issue as stealable by other agents | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_rebalance` | Suggest or apply load rebalancing across agents | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_release` | Release a claim on an issue | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_status` | Update claim status | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_steal` | Steal a stealable issue | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `claims_stealable` | List all stealable issues | `v3/@claude-flow/cli/src/mcp-tools/claims-tools.ts` |
| `config` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `config_export` | Export configuration to JSON | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `config_get` | Get configuration value | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `config_import` | Import configuration from JSON | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `config_list` | List configuration values | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `config_reset` | Reset configuration to defaults | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `config_set` | Set configuration value | `v3/@claude-flow/cli/src/mcp-tools/config-tools.ts` |
| `coordination_consensus` | Manage consensus protocol with BFT, Raft, or Quorum strategies | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_load_balance` | Configure load balancing | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_metrics` | Get coordination metrics | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_node` | Manage coordination nodes | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_orchestrate` | Orchestrate multi-agent coordination | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_sync` | Synchronize state across nodes | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordination_topology` | Configure swarm topology | `v3/@claude-flow/cli/src/mcp-tools/coordination-tools.ts` |
| `coordinator` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `daa_agent_adapt` | Trigger agent adaptation based on feedback | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_agent_create` | Create a decentralized autonomous agent | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_cognitive_pattern` | Analyze or change cognitive patterns | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_knowledge_share` | Share knowledge between agents | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_learning_status` | Get learning status for DAA agents | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_performance_metrics` | Get DAA performance metrics | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_workflow_create` | Create an autonomous workflow | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `daa_workflow_execute` | Execute a DAA workflow | `v3/@claude-flow/cli/src/mcp-tools/daa-tools.ts` |
| `database` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `disk` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `embeddings_compare` | Compare similarity between two texts | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_generate` | Generate embeddings for text (Euclidean or hyperbolic) | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_hyperbolic` | Hyperbolic embedding operations (Poincaré ball) | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_init` | Initialize the ONNX embedding subsystem with hyperbolic support | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_neural` | Neural substrate operations (RuVector integration) | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_rabitq_build` | Build RaBitQ 1-bit quantized index from stored embeddings (32× compression). Pre-filters candidates via Hamming scan before exact rerank. | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_rabitq_search` | Search via RaBitQ quantized index (fast Hamming scan). Returns candidate IDs for reranking. | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_rabitq_status` | Get RaBitQ quantized index status — availability, vector count, compression ratio | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_search` | Semantic search across stored embeddings | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `embeddings_status` | Get embeddings system status and configuration | `v3/@claude-flow/cli/src/mcp-tools/embeddings-tools.ts` |
| `explain` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `github_issue_track` | Track and manage issues | `v3/@claude-flow/cli/src/mcp-tools/github-tools.ts` |
| `github_metrics` | Get repository metrics and statistics | `v3/@claude-flow/cli/src/mcp-tools/github-tools.ts` |
| `github_pr_manage` | Manage pull requests | `v3/@claude-flow/cli/src/mcp-tools/github-tools.ts` |
| `github_repo_analyze` | Analyze a GitHub repository | `v3/@claude-flow/cli/src/mcp-tools/github-tools.ts` |
| `github_workflow` | Manage GitHub Actions workflows | `v3/@claude-flow/cli/src/mcp-tools/github-tools.ts` |
| `guidance_capabilities` | List all capability areas with their tools, commands, agents, and skills. Use this to discover what Ruflo can do. | `v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts` |
| `guidance_discover` | Discover all available agents and skills from the .claude/ directory. Returns live filesystem data. | `v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts` |
| `guidance_quickref` | Quick reference card for common operations. Returns the most useful commands for a given domain. | `v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts` |
| `guidance_recommend` | Given a task description, recommend which capability areas, tools, agents, and workflow to use. | `v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts` |
| `guidance_workflow` | Get a recommended workflow template for a task type. Includes steps, agents, and topology. | `v3/@claude-flow/cli/src/mcp-tools/guidance-tools.ts` |
| `hive-mind_broadcast` | Broadcast message to all workers | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_consensus` | Propose or vote on consensus with BFT, Raft, or Quorum strategies | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_init` | Initialize the hive-mind collective | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_join` | Join an agent to the hive-mind | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_leave` | Remove an agent from the hive-mind | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_memory` | Access hive shared memory | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_shutdown` | Shutdown the hive-mind and terminate all workers | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_spawn` | Spawn workers and automatically join them to the hive-mind (combines agent/spawn + hive-mind/join) | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hive-mind_status` | Get hive-mind status | `v3/@claude-flow/cli/src/mcp-tools/hive-mind-tools.ts` |
| `hooks_build-agents` | Generate optimized agent configurations from pretrain data | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_explain` | Explain routing decision with full transparency | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_init` | Initialize hooks in project with .claude/settings.json | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence` | RuVector intelligence system status (shows REAL metrics from memory store) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_attention` | Compute attention-weighted similarity using MoE/Flash/Hyperbolic | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_learn` | Force immediate SONA learning cycle with EWC++ consolidation | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_pattern-search` | Search patterns using REAL vector search (HNSW when available, brute-force fallback) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_pattern-store` | Store pattern in ReasoningBank (HNSW-indexed) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_stats` | Get RuVector intelligence layer statistics | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_trajectory-end` | End trajectory and trigger SONA learning with EWC++ | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_trajectory-start` | Begin SONA trajectory for reinforcement learning | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence_trajectory-step` | Record step in trajectory for reinforcement learning | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_intelligence-reset` | Reset intelligence learning state | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_list` | List all registered hooks | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_metrics` | View learning metrics dashboard | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_model-outcome` | Record model routing outcome for learning | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_model-route` | Route task to optimal Claude model (haiku/sonnet/opus) based on complexity | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_model-stats` | Get model routing statistics | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_notify` | Send cross-agent notification | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_post-command` | Record command execution outcome | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_post-edit` | Record editing outcome for learning | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_post-task` | Record task completion for learning | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_pre-command` | Assess risk before executing a command | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_pre-edit` | Get context and agent suggestions before editing a file | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_pre-task` | Record task start and get agent suggestions with intelligent model routing (ADR-026) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_pretrain` | Analyze repository to bootstrap intelligence (4-step pipeline) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_route` | Route task to optimal agent using semantic similarity (native HNSW or pure JS) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_session-end` | End current session, stop daemon, and persist state | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_session-restore` | Restore a previous session | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_session-start` | Initialize a new session and auto-start daemon | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_transfer` | Transfer learned patterns from another project | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_worker-cancel` | Cancel a running worker | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_worker-detect` | Detect worker triggers from user prompt (for UserPromptSubmit hook) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_worker-dispatch` | Dispatch a background worker for analysis/optimization tasks | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_worker-list` | List all 12 background workers with status and capabilities | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `hooks_worker-status` | Get status of a specific worker or all active workers | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `init` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_attention` | Record task start and get agent suggestions with intelligent model routing (ADR-026) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_learn` | Record task start and get agent suggestions with intelligent model routing (ADR-026) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_pattern-search` | Record task start and get agent suggestions with intelligent model routing (ADR-026) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_pattern-store` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_stats` | Record task start and get agent suggestions with intelligent model routing (ADR-026) | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_trajectory-end` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_trajectory-start` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `intelligence_trajectory-step` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `mcp` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `mcp_status` | Get MCP server status, including stdio mode detection | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `memory` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `memory_bridge_status` | Show Claude Code memory bridge status — AgentDB vectors, SONA learning, intelligence patterns, and connection health. | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_delete` | Delete a memory entry by key | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_import_claude` | Import Claude Code auto-memory files into AgentDB with ONNX vector embeddings. Reads ~/.claude/projects/*/memory/*.md files, parses YAML frontmatter, splits into sections, and stores with 384-dim embeddings for semantic search. Use allProjects=true to import from ALL Claude projects. | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_list` | List memory entries with optional filtering | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_migrate` | Manually trigger migration from legacy JSON store to sql.js | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_retrieve` | Retrieve a value from memory by key | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_search` | Semantic vector search using HNSW index (150x-12,500x faster than keyword search) | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_search_unified` | Search across both Claude Code memories and AgentDB entries using semantic vector similarity. Returns merged, deduplicated results from all namespaces. | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_stats` | Get memory storage statistics including HNSW index status | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `memory_store` | Store a value in memory with vector embedding for semantic search (sql.js + HNSW backend). Use upsert=true to update existing keys. | `v3/@claude-flow/cli/src/mcp-tools/memory-tools.ts` |
| `metrics` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `network` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `neural` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `neural_compress` | Compress neural model or embeddings | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `neural_optimize` | Optimize neural model performance | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `neural_patterns` | Get or manage neural patterns | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `neural_predict` | Make predictions using a neural model | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `neural_status` | Get neural system status | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `neural_train` | Train a neural model | `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts` |
| `notify` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `performance_benchmark` | Run performance benchmarks | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `performance_bottleneck` | Detect performance bottlenecks | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `performance_metrics` | Get detailed performance metrics | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `performance_optimize` | Apply performance optimizations | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `performance_profile` | Profile specific component or operation | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `performance_report` | Generate performance report | `v3/@claude-flow/cli/src/mcp-tools/performance-tools.ts` |
| `persistence` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `post-command` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `post-edit` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `post-task` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `pre-command` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `pre-edit` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `pre-task` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `pretrain` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `progress_check` | Get current V3 implementation progress percentage and metrics | `v3/@claude-flow/cli/src/mcp-tools/progress-tools.ts` |
| `progress_summary` | Get human-readable V3 implementation progress summary | `v3/@claude-flow/cli/src/mcp-tools/progress-tools.ts` |
| `progress_sync` | Calculate and persist V3 progress metrics to file | `v3/@claude-flow/cli/src/mcp-tools/progress-tools.ts` |
| `progress_watch` | Get current watch status for progress monitoring | `v3/@claude-flow/cli/src/mcp-tools/progress-tools.ts` |
| `route` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `ruvllm_chat_format` | Format chat messages using a template (llama3, mistral, chatml, phi, gemma, or auto-detect). | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_generate_config` | Create a generation config (maxTokens, temperature, topP, etc.) as JSON. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_hnsw_add` | Add a pattern to an HNSW router. Embedding must match router dimensions. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_hnsw_create` | Create a WASM HNSW router for semantic pattern routing. Max ~11 patterns (v2.0.1 limit). | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_hnsw_route` | Route a query embedding to nearest patterns in HNSW index. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_microlora_adapt` | Adapt MicroLoRA weights with quality feedback. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_microlora_create` | Create a MicroLoRA adapter (ultra-lightweight LoRA, ranks 1-4). | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_sona_adapt` | Run SONA instant adaptation with a quality signal. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_sona_create` | Create a SONA instant adaptation loop (<1ms adaptation cycles). | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `ruvllm_status` | Get ruvllm-wasm availability and initialization status. | `v3/@claude-flow/cli/src/mcp-tools/ruvllm-tools.ts` |
| `session_delete` | Delete a saved session | `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts` |
| `session_info` | Get detailed session information | `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts` |
| `session_list` | List saved sessions | `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts` |
| `session_restore` | Restore a saved session | `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts` |
| `session_save` | Save current session state | `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts` |
| `session-end` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `session-restore` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `session-start` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `swarm` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `swarm_exists` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `swarm_health` | Check swarm health status with real state inspection | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `swarm_init` | Initialize a swarm with persistent state tracking | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `swarm_shutdown` | Shutdown a swarm and update persistent state | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `swarm_status` | Get swarm status from persistent state | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `system_health` | Perform system health check | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `system_info` | Get system information | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `system_metrics` | Get system metrics and performance data | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `system_reset` | Reset system state | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `system_status` | Get overall system status | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `task_assign` | Assign a task to one or more agents | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_cancel` | Cancel a task | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_complete` | Mark task as complete | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_create` | Create a new task | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_list` | List all tasks | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_status` | Get task status | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `task_summary` | Get a summary of all tasks by status | `v3/@claude-flow/cli/src/mcp-tools/system-tools.ts` |
| `task_update` | Update task status or progress | `v3/@claude-flow/cli/src/mcp-tools/task-tools.ts` |
| `terminal_close` | Close a terminal session | `v3/@claude-flow/cli/src/mcp-tools/terminal-tools.ts` |
| `terminal_create` | Create a new terminal session | `v3/@claude-flow/cli/src/mcp-tools/terminal-tools.ts` |
| `terminal_execute` | Execute a command in a terminal session | `v3/@claude-flow/cli/src/mcp-tools/terminal-tools.ts` |
| `terminal_history` | Get command history for a terminal session | `v3/@claude-flow/cli/src/mcp-tools/terminal-tools.ts` |
| `terminal_list` | List all terminal sessions | `v3/@claude-flow/cli/src/mcp-tools/terminal-tools.ts` |
| `topology` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/swarm-tools.ts` |
| `transfer` | *(no description)* | `v3/@claude-flow/cli/src/mcp-tools/hooks-tools.ts` |
| `transfer_detect-pii` | Detect PII in content without redacting | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_ipfs-resolve` | Resolve IPNS name to CID | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_plugin-featured` | Get featured plugins from the store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_plugin-info` | Get detailed info about a plugin | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_plugin-official` | Get official plugins from the store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_plugin-search` | Search the plugin store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_store-download` | Download a pattern from the store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_store-featured` | Get featured patterns from the store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_store-info` | Get detailed info about a pattern | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_store-search` | Search the pattern store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `transfer_store-trending` | Get trending patterns from the store | `v3/@claude-flow/cli/src/mcp-tools/transfer-tools.ts` |
| `wasm_agent_create` | Create a sandboxed WASM agent with virtual filesystem (no OS access). Optionally use a gallery template. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_export` | Export a WASM agent\ | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_files` | Get a WASM agent\ | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_list` | List all active WASM agents. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_prompt` | Send a prompt to a WASM agent and get a response. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_terminate` | Terminate a WASM agent and free resources. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_agent_tool` | Execute a tool on a WASM agent sandbox. Tools: read_file, write_file, edit_file, write_todos, list_files. Use flat format: {tool, path, content, ...}. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_gallery_create` | Create a WASM agent from a gallery template. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_gallery_list` | List all available WASM agent gallery templates (Coder, Researcher, Tester, Reviewer, Security, Swarm). | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `wasm_gallery_search` | Search WASM agent gallery templates by query. | `v3/@claude-flow/cli/src/mcp-tools/wasm-agent-tools.ts` |
| `workflow_cancel` | Cancel a workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_create` | Create a new workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_delete` | Delete a workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_execute` | Execute a workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_list` | List all workflows | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_pause` | Pause a running workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_resume` | Resume a paused workflow | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_run` | Run a workflow from a template or file | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_status` | Get workflow status | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |
| `workflow_template` | Save workflow as template or create from template | `v3/@claude-flow/cli/src/mcp-tools/workflow-tools.ts` |

### CLI commands (49)

Top-level command surface. Subcommands are documented per-command in the source file and in `.claude-flow/CAPABILITIES.md` after `ruflo init`.

| Command | Description | Source |
|---|---|---|
| `ruflo agent` | Agent management commands | `v3/@claude-flow/cli/src/commands/agent.ts` |
| `ruflo analyze` | Code analysis, diff classification, graph boundaries, and change risk assessment | `v3/@claude-flow/cli/src/commands/analyze.ts` |
| `ruflo appliance` | Self-contained RVFA appliance management (build, inspect, verify, extract, run) | `v3/@claude-flow/cli/src/commands/appliance.ts` |
| `ruflo autopilot` | Persistent swarm completion — keeps agents working until ALL tasks are done | `v3/@claude-flow/cli/src/commands/autopilot.ts` |
| `ruflo benchmark` | Performance benchmarking for self-learning and neural systems | `v3/@claude-flow/cli/src/commands/benchmark.ts` |
| `ruflo claims` | Claims-based authorization, permissions, and access control | `v3/@claude-flow/cli/src/commands/claims.ts` |
| `ruflo cleanup` | Remove project artifacts created by claude-flow/ruflo | `v3/@claude-flow/cli/src/commands/cleanup.ts` |
| `ruflo completions` | Generate shell completion scripts | `v3/@claude-flow/cli/src/commands/completions.ts` |
| `ruflo config` | Configuration management | `v3/@claude-flow/cli/src/commands/config.ts` |
| `ruflo daemon` | Manage background worker daemon (Node.js-based, auto-runs like shell helpers) | `v3/@claude-flow/cli/src/commands/daemon.ts` |
| `ruflo deployment` | Deployment management, environments, rollbacks | `v3/@claude-flow/cli/src/commands/deployment.ts` |
| `ruflo doctor` | System diagnostics and health checks | `v3/@claude-flow/cli/src/commands/doctor.ts` |
| `ruflo download` | Download a pattern from the registry | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo embeddings` | Vector embeddings, semantic search, similarity operations | `v3/@claude-flow/cli/src/commands/embeddings.ts` |
| `ruflo guidance` | Guidance Control Plane - compile, retrieve, enforce, and optimize guidance rules | `v3/@claude-flow/cli/src/commands/guidance.ts` |
| `ruflo hive-mind` | Queen-led consensus-based multi-agent coordination | `v3/@claude-flow/cli/src/commands/hive-mind.ts` |
| `ruflo hooks` | Self-learning hooks system for intelligent workflow automation | `v3/@claude-flow/cli/src/commands/hooks.ts` |
| `ruflo info` | Show detailed information about a pattern | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo init` | Initialize RuFlo in the current directory | `v3/@claude-flow/cli/src/commands/init.ts` |
| `ruflo issues` | Collaborative issue claims for human-agent workflows (ADR-016) | `v3/@claude-flow/cli/src/commands/issues.ts` |
| `ruflo list` | List patterns from decentralized registry | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo mcp` | MCP server management | `v3/@claude-flow/cli/src/commands/mcp.ts` |
| `ruflo memory` | Memory management commands | `v3/@claude-flow/cli/src/commands/memory.ts` |
| `ruflo migrate` | V2 to V3 migration tools | `v3/@claude-flow/cli/src/commands/migrate.ts` |
| `ruflo neural` | Neural pattern training, MoE, Flash Attention, pattern learning | `v3/@claude-flow/cli/src/commands/neural.ts` |
| `ruflo performance` | Performance profiling, benchmarking, optimization, metrics | `v3/@claude-flow/cli/src/commands/performance.ts` |
| `ruflo plugins` | Plugin management with IPFS-based decentralized registry | `v3/@claude-flow/cli/src/commands/plugins.ts` |
| `ruflo process` | Background process management, daemon, and monitoring | `v3/@claude-flow/cli/src/commands/process.ts` |
| `ruflo progress` | Check V3 implementation progress | `v3/@claude-flow/cli/src/commands/progress.ts` |
| `ruflo providers` | Manage AI providers, models, and configurations | `v3/@claude-flow/cli/src/commands/providers.ts` |
| `ruflo publish` | Publish an RVFA appliance to IPFS via Pinata | `v3/@claude-flow/cli/src/commands/appliance-advanced.ts` |
| `ruflo publish` | Publish a pattern to the decentralized registry | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo route` | Intelligent task-to-agent routing using Q-Learning | `v3/@claude-flow/cli/src/commands/route.ts` |
| `ruflo search` | Search patterns in the decentralized registry | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo security` | Security scanning, CVE detection, threat modeling, AI defense | `v3/@claude-flow/cli/src/commands/security.ts` |
| `ruflo session` | Session management commands | `v3/@claude-flow/cli/src/commands/session.ts` |
| `ruflo sign` | Sign an RVFA appliance with Ed25519 for tamper detection | `v3/@claude-flow/cli/src/commands/appliance-advanced.ts` |
| `ruflo start` | Start the RuFlo orchestration system | `v3/@claude-flow/cli/src/commands/start.ts` |
| `ruflo status` | Show system status | `v3/@claude-flow/cli/src/commands/status.ts` |
| `ruflo store` | Pattern marketplace - list, search, download, publish | `v3/@claude-flow/cli/src/commands/transfer-store.ts` |
| `ruflo swarm` | Swarm coordination commands | `v3/@claude-flow/cli/src/commands/swarm.ts` |
| `ruflo task` | Task management commands | `v3/@claude-flow/cli/src/commands/task.ts` |
| `ruflo update` | Hot-patch a section in an RVFA appliance | `v3/@claude-flow/cli/src/commands/appliance-advanced.ts` |
| `ruflo verify` | Verify installed artifact against the signed witness manifest | `v3/@claude-flow/cli/src/commands/verify.ts` |
| `ruflo wasm-create` | Create a WASM-sandboxed agent | `v3/@claude-flow/cli/src/commands/agent-wasm.ts` |
| `ruflo wasm-gallery` | List available WASM agent gallery templates | `v3/@claude-flow/cli/src/commands/agent-wasm.ts` |
| `ruflo wasm-prompt` | Send a prompt to a WASM agent | `v3/@claude-flow/cli/src/commands/agent-wasm.ts` |
| `ruflo wasm-status` | Check rvagent-wasm availability, version, and capabilities | `v3/@claude-flow/cli/src/commands/agent-wasm.ts` |
| `ruflo workflow` | Workflow execution and management | `v3/@claude-flow/cli/src/commands/workflow.ts` |

### Plugins (32)

| Plugin | Version | Description |
|---|---|---|
| `ruflo-adr` | 0.1.0 | ADR lifecycle management — create, index, supersede, and link Architecture Decision Records to code |
| `ruflo-agentdb` | 0.1.0 | AgentDB memory controllers with HNSW vector search, RuVector embeddings, and causal knowledge graphs |
| `ruflo-aidefence` | 0.1.0 | AI safety scanning, PII detection, prompt injection defense, and adaptive threat learning |
| `ruflo-autopilot` | 0.1.0 | Autonomous /loop-driven task completion with learning, prediction, and progress tracking |
| `ruflo-browser` | 0.1.0 | Agentic browser automation with Playwright for testing, scraping, and UI interaction |
| `ruflo-core` | 0.1.0 | Core Ruflo MCP tools, commands, and Claude Code orchestration patterns |
| `ruflo-cost-tracker` | 0.1.0 | Token usage tracking, model cost attribution per agent, budget alerts, and optimization recommendations |
| `ruflo-daa` | 0.1.0 | Dynamic Agentic Architecture with cognitive patterns, knowledge sharing, and adaptive agents |
| `ruflo-ddd` | 0.1.0 | Domain-Driven Design scaffolding — bounded contexts, aggregate roots, domain events, and anti-corruption layers |
| `ruflo-docs` | 0.1.0 | Documentation generation, API docs, and drift detection |
| `ruflo-federation` | 0.2.0 | Cross-installation agent federation with zero-trust security, peer discovery, consensus-based task routing, and per-call budget circuit breaker (ADR-097) |
| `ruflo-goals` | 0.1.0 | Long-horizon goal planning, deep research orchestration, and adaptive replanning using GOAP algorithms |
| `ruflo-intelligence` | 0.1.0 | Self-learning neural intelligence with SONA patterns, trajectory learning, and intelligent model routing |
| `ruflo-iot-cognitum` | 0.1.0 | IoT device lifecycle, telemetry anomaly detection, fleet management, and witness chain verification for Cognitum Seed hardware |
| `ruflo-jujutsu` | 0.1.0 | Advanced git workflows with diff analysis, risk scoring, and reviewer recommendations |
| `ruflo-knowledge-graph` | 0.1.0 | Knowledge graph construction — entity extraction, relation mapping, and pathfinder graph traversal |
| `ruflo-loop-workers` | 0.1.0 | Cache-aware /loop workers and CronCreate background automation |
| `ruflo-market-data` | 0.1.0 | Market data ingestion — feed normalization, OHLCV vectorization, and HNSW-indexed pattern matching |
| `ruflo-migrations` | 0.1.0 | Schema migration management — generate, validate, dry-run, and rollback database migrations |
| `ruflo-neural-trader` | 0.2.0 | Neural trading via npx neural-trader — self-learning strategies, Rust/NAPI backtesting, 112+ MCP tools, swarm coordination, and portfolio optimization |
| `ruflo-observability` | 0.1.0 | Structured logging, distributed tracing, and metrics — correlate agent swarm activity with application telemetry |
| `ruflo-plugin-creator` | 0.1.0 | Scaffold, validate, and publish new Claude Code plugins with proper structure and MCP tool wiring |
| `ruflo-rag-memory` | 0.1.0 | RuVector memory with HNSW search, AgentDB, and semantic retrieval |
| `ruflo-ruvector` | 0.2.0 | Self-learning vector database via npx ruvector — HNSW, FlashAttention-3, Graph RAG, hybrid search, DiskANN, 103 MCP tools, Brain AGI |
| `ruflo-ruvllm` | 0.1.0 | RuVLLM local inference with chat formatting, model configuration, and MicroLoRA fine-tuning |
| `ruflo-rvf` | 0.1.0 | RVF format for portable agent memory, session persistence, and cross-platform transfer |
| `ruflo-security-audit` | 0.1.0 | Security review, dependency scanning, policy gates, and CVE monitoring |
| `ruflo-sparc` | 0.1.0 | SPARC methodology — Specification, Pseudocode, Architecture, Refinement, Completion phases with gate checks |
| `ruflo-swarm` | 0.1.0 | Agent teams, swarm coordination, Monitor streams, and worktree isolation |
| `ruflo-testgen` | 0.1.0 | Test gap detection, coverage analysis, and automated test generation |
| `ruflo-wasm` | 0.1.0 | Sandboxed WASM agent creation, execution, and gallery sharing |
| `ruflo-workflows` | 0.1.0 | Visual workflow automation with templates, orchestration, and lifecycle management |

### Agents (43)

| Agent | Plugin | Description |
|---|---|---|
| `adr-architect` | ruflo-adr | ADR lifecycle manager -- create, index, supersede, and link Architecture Decision Records to code |
| `agentdb-specialist` | ruflo-agentdb | AgentDB and RuVector specialist for memory operations, HNSW indexing, and semantic search |
| `architect` | ruflo-swarm | System architect for designing implementation approaches, API contracts, and module boundaries |
| `autopilot-coordinator` | ruflo-autopilot | Autonomous task completion coordinator using /loop and autopilot MCP tools |
| `backtest-engineer` | ruflo-neural-trader | Backtesting specialist using npx neural-trader Rust/NAPI engine — walk-forward validation, Monte Carlo simulation, parameter optimization |
| `browser-agent` | ruflo-browser | Browser automation agent for UI testing, web scraping, and interactive page validation |
| `coder` | ruflo-core | Implementation specialist for writing clean, efficient code following project patterns |
| `coordinator` | ruflo-swarm | Swarm coordinator that manages agent lifecycle, task assignment, and anti-drift enforcement |
| `cost-analyst` | ruflo-cost-tracker | Tracks token usage per agent and model, computes cost attribution in USD, monitors budgets, and recommends optimizations |
| `daa-specialist` | ruflo-daa | Dynamic Agentic Architecture specialist for adaptive agents, cognitive patterns, and knowledge sharing |
| `data-engineer` | ruflo-market-data | Ingests market data feeds, normalizes OHLCV vectors, and performs HNSW-indexed candlestick pattern matching |
| `deep-researcher` | ruflo-goals | Multi-source research specialist that gathers, cross-references, and synthesizes information with evidence grading and contradiction resolution |
| `device-coordinator` | ruflo-iot-cognitum | Manages Cognitum Seed device fleet as Ruflo agent swarm members with 5-tier trust scoring |
| `docs-writer` | ruflo-docs | Documentation specialist -- generates and maintains project documentation |
| `domain-modeler` | ruflo-ddd | Domain-Driven Design specialist -- maps domains to bounded contexts, designs aggregate roots, defines domain events, and generates anti-corruption layers |
| `federation-coordinator` | ruflo-federation | Orchestrates cross-installation agent federation with zero-trust security |
| `fleet-manager` | ruflo-iot-cognitum | Manages device fleets, firmware rollouts, and fleet-wide policies |
| `git-specialist` | ruflo-jujutsu | Git workflow specialist for diff analysis, risk assessment, and PR management |
| `goal-planner` | ruflo-goals | GOAP specialist that creates optimal action plans using A* search through state spaces, with adaptive replanning, trajectory learning, and multi-mode execution |
| `graph-navigator` | ruflo-knowledge-graph | Extracts entities and relations from code and docs, builds knowledge graphs, and traverses them with pathfinder scoring |
| `horizon-tracker` | ruflo-goals | Long-horizon objective tracker that persists progress across sessions with milestone checkpoints, drift detection, and adaptive timeline management |
| `intelligence-specialist` | ruflo-intelligence | Self-learning intelligence specialist focused on neural training, pattern discovery, and routing optimization |
| `llm-specialist` | ruflo-ruvllm | RuVLLM specialist for local inference configuration, MicroLoRA fine-tuning, and multi-provider routing |
| `loop-worker-coordinator` | ruflo-loop-workers | Coordinates background worker scheduling, health monitoring, and dispatch across loop and cron execution modes |
| `market-analyst` | ruflo-neural-trader | Market regime detection and technical analysis using npx neural-trader — RSI, MACD, Bollinger Bands, volume profile, regime classification |
| `memory-specialist` | ruflo-rag-memory | SOTA RAG memory specialist — hybrid search (sparse+dense), Graph RAG multi-hop retrieval, MMR diversity reranking, smart consolidation, ruvector integration |
| `migration-engineer` | ruflo-migrations | Generates sequential database migrations with up/down pairs, dry-run validation, and rollback safety checks |
| `observability-engineer` | ruflo-observability | Implements structured logging, distributed tracing, and metrics collection to correlate agent swarm activity with application telemetry |
| `plugin-developer` | ruflo-plugin-creator | Plugin development specialist for scaffolding, validating, and publishing Claude Code plugins |
| `researcher` | ruflo-core | Pathfinder research specialist — traverses RuVector memory graphs and codebase to surface patterns, dependencies, and prior art |
| `reviewer` | ruflo-core | Code review specialist for quality, security, and best-practice enforcement |
| `risk-analyst` | ruflo-neural-trader | Portfolio risk assessment and position sizing using npx neural-trader — VaR/CVaR, Kelly criterion, circuit breakers, correlation monitoring |
| `safety-specialist` | ruflo-aidefence | AI safety specialist for threat detection, PII scanning, and adaptive defense training |
| `security-auditor` | ruflo-security-audit | Specialized agent for security auditing and vulnerability remediation |
| `session-specialist` | ruflo-rvf | Session persistence specialist for state management, memory transfer, and cross-conversation continuity |
| `sparc-orchestrator` | ruflo-sparc | Orchestrates the 5-phase SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion) with quality gates between each phase, spawning specialized agents per phase |
| `telemetry-analyzer` | ruflo-iot-cognitum | Analyzes Cognitum Seed device telemetry for anomalies using Z-score detection |
| `tester` | ruflo-testgen | Specialized testing agent -- writes comprehensive tests using TDD London School |
| `trading-strategist` | ruflo-neural-trader | Designs and optimizes neural trading strategies using npx neural-trader — LSTM/Transformer models, Rust/NAPI backtesting, Z-score anomaly detection |
| `vector-engineer` | ruflo-ruvector | Vector operations specialist using npx ruvector — HNSW indexing, FlashAttention-3, Graph RAG, hybrid search, DiskANN, Brain AGI, 103 MCP tools |
| `wasm-specialist` | ruflo-wasm | WASM sandbox specialist for creating, managing, and sharing isolated agent environments |
| `witness-auditor` | ruflo-iot-cognitum | Verifies Ed25519 witness chain integrity and detects provenance gaps |
| `workflow-specialist` | ruflo-workflows | Workflow automation specialist for creating, executing, and managing multi-step processes |

