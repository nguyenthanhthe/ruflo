/**
 * Research-run trajectory storage (R-4.1 / ADR-097).
 *
 * A "trajectory" is the full record of one completed research run:
 *
 *   {
 *     goalHash, goalText,
 *     configHash, presetId,
 *     perStepFindings: [...],
 *     finalReport,
 *     userVerdict: 'kept' | 'edited' | 'discarded' | undefined,
 *     startedAt, completedAt,
 *   }
 *
 * Persisted via the AgentDB browser client (namespace `trajectories`,
 * key derives from goalHash + startedAt). R-4.2 wires actual recording
 * into Index.tsx::executeResearch(); R-4.3 surfaces recall via
 * GoalInput chips.
 *
 * This step (R-4.1) defines the SCHEMA + persist API and proves it
 * round-trips 5 sample trajectories with Zod validation.
 */

import { z } from 'zod';
import { getAgentDbClient } from './client';

// ── Schema ──────────────────────────────────────────────────────

const FindingSummarySchema = z.object({
  title: z.string().min(1),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const PerStepFindingsSchema = z.object({
  stepTitle: z.string().min(1),
  findingCount: z.number().int().nonnegative(),
  findings: z.array(FindingSummarySchema).max(50),
  avgConfidence: z.number().min(0).max(1).optional(),
  latencyMs: z.number().nonnegative().optional(),
});

const FinalReportSchema = z.object({
  recommendationsCount: z.number().int().nonnegative(),
  summary: z.string().optional(),
});

export const TrajectorySchema = z.object({
  /** Stable hash of the goal text — used to dedupe across re-runs. */
  goalHash: z.string().regex(/^[a-f0-9]{8}$/),
  /** The original goal text. Capped at 2K to keep trajectories small. */
  goalText: z.string().min(1).max(2_000),
  /** Stable hash of the research config snapshot. */
  configHash: z.string().regex(/^[a-f0-9]{8}$/),
  /** The preset name used (`academic-deep`, `market-trends`, etc.). */
  presetId: z.string().min(1).max(64),
  /** Per-step findings summary. */
  perStepFindings: z.array(PerStepFindingsSchema).min(1).max(20),
  /** Final report meta. */
  finalReport: FinalReportSchema.optional(),
  /** User's verdict on the run; undefined until they act. */
  userVerdict: z.enum(['kept', 'edited', 'discarded']).optional(),
  /** ms-since-epoch of run start. */
  startedAt: z.number().int().nonnegative(),
  /** ms-since-epoch of run completion (or last update). */
  completedAt: z.number().int().nonnegative(),
});

export type Trajectory = z.infer<typeof TrajectorySchema>;

// ── Persistence API ─────────────────────────────────────────────

const NAMESPACE = 'trajectories';

function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return ((h >>> 0).toString(16) + '00000000').slice(0, 8);
}

/** Compute the canonical goal hash for a free-text goal. */
export function computeGoalHash(goalText: string): string {
  return shortHash(goalText.trim().toLowerCase());
}

/** Compute the canonical config hash for any config object. */
export function computeConfigHash(config: unknown): string {
  return shortHash(JSON.stringify(config ?? {}));
}

/** Build the IDB id for a trajectory — `${goalHash}-${startedAt}` so
 *  multiple runs of the same goal don't collide. */
export function trajectoryId(goalHash: string, startedAt: number): string {
  return `${NAMESPACE}:${goalHash}-${startedAt}`;
}

/**
 * Validate + persist a trajectory. Throws on schema violation
 * (callers should treat trajectory recording as best-effort and
 * swallow the exception — see R-4.2 wiring).
 */
export async function addTrajectory(t: Trajectory): Promise<void> {
  const validated = TrajectorySchema.parse(t);
  const client = getAgentDbClient();
  const id = trajectoryId(validated.goalHash, validated.startedAt);
  await client.put(id, NAMESPACE, validated);
}

/**
 * Update a stored trajectory's `userVerdict` + bump `completedAt`.
 * No-op if the trajectory id isn't found.
 */
export async function setTrajectoryVerdict(
  goalHash: string,
  startedAt: number,
  verdict: NonNullable<Trajectory['userVerdict']>,
): Promise<void> {
  const client = getAgentDbClient();
  const id = trajectoryId(goalHash, startedAt);
  const entry = await client.get<Trajectory>(id);
  if (!entry) return;
  const next: Trajectory = { ...entry.data, userVerdict: verdict, completedAt: Date.now() };
  TrajectorySchema.parse(next);
  await client.put(id, NAMESPACE, next);
}

/** Retrieve all stored trajectories (newest first by completedAt). */
export async function listTrajectories(): Promise<Trajectory[]> {
  const client = getAgentDbClient();
  const all = await client.list<Trajectory>(NAMESPACE);
  return all
    .map((e) => e.data)
    .sort((a, b) => b.completedAt - a.completedAt);
}

/** Delete one trajectory by goalHash + startedAt. */
export async function deleteTrajectory(goalHash: string, startedAt: number): Promise<void> {
  const client = getAgentDbClient();
  await client.delete(trajectoryId(goalHash, startedAt));
}
