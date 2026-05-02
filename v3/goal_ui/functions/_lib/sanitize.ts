/**
 * Prompt-injection defense helpers (ADR-093 §S3 / Step 22c, ADR-094 §R-1).
 *
 * Two principles:
 *
 *   1. User-supplied strings going into LLM prompts MUST be wrapped
 *      in `<user_input>...</user_input>` delimiters. This makes the
 *      LLM's instructions unambiguous: anything inside the delimiter
 *      is data, not instructions. Existing inner `</user_input>` tokens
 *      are stripped to prevent the user from closing the tag and
 *      injecting prompt-level instructions.
 *
 *   2. Every LLM response is validated with a Zod schema before any
 *      field is forwarded to the UI. Failures fall back to a safe
 *      default (typically a 502 with a generic error). LLM output
 *      is NEVER eval'd, NEVER concatenated unwrapped into a downstream
 *      prompt, and NEVER passed to `dangerouslySetInnerHTML`.
 *
 * R-1.2 hardening: every input now passes through a Zod-validated
 * cleanliness check (control-byte rejection) using the shared
 * `@claude-flow/security` package's `z` re-export. We can't reuse
 * `SafeStringSchema` directly because it rejects shell metacharacters
 * (`$`, `;`, `<>`, etc.) which research goals legitimately contain
 * ("Best EV under $50k", etc.). The local schema below mirrors the
 * style of `CommandArgumentSchema` — refine-based control-byte rejection
 * with a generous content cap.
 */

import { z } from '@claude-flow/security';

/**
 * Goal-UI-flavoured "free-text user input" schema. Allows:
 *   - any non-control character
 *   - whitespace including \n \r \t (preserved for multi-line goals)
 *
 * Rejects:
 *   - null bytes
 *   - C0 control characters except TAB (\x09), LF (\x0A), CR (\x0D)
 *   - DEL (\x7F)
 *   - inputs longer than 10,000 chars (~2,500 words — far above any
 *     legitimate research goal; keeps prompts cheap)
 */
export const UserPromptInputSchema = z
  .string()
  .max(10_000, 'Input too long')
  // eslint-disable-next-line no-control-regex
  .refine((s) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(s), {
    message: 'Input contains control characters',
  });

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Wrap a user-supplied string in `<user_input>` delimiters.
 *
 * Defense layers (in order):
 *   1. Zod-validate via `UserPromptInputSchema`. If invalid, silently
 *      strip the offending control characters rather than throw — a
 *      single stray byte from a copy/paste shouldn't fail the whole
 *      research run, but it must not reach the LLM.
 *   2. Strip embedded `</user_input>` close-tags (case-insensitive,
 *      whitespace-tolerant) so the user can't escape the delimiter.
 *   3. Wrap in delimiters.
 */
export function wrapUserInput(s: string | undefined | null): string {
  if (s === undefined || s === null) return '<user_input></user_input>';

  let cleaned = String(s);
  const validated = UserPromptInputSchema.safeParse(cleaned);
  if (!validated.success) {
    // Strip control bytes, then re-validate length. Truncation is
    // not silently applied — over-length input throws so the caller
    // knows it was malformed.
    cleaned = cleaned.replace(CONTROL_CHARS, '');
    const reValidated = UserPromptInputSchema.safeParse(cleaned);
    if (!reValidated.success) {
      throw new Error(`wrapUserInput: ${reValidated.error.issues[0]?.message ?? 'invalid input'}`);
    }
  }

  cleaned = cleaned.replace(/<\s*\/?\s*user_input\s*>/gi, '');
  return `<user_input>${cleaned}</user_input>`;
}
