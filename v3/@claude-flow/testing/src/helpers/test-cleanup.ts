/**
 * @claude-flow/testing - Test Cleanup Utilities
 *
 * Provides standardized cleanup for async operations, timers, and resources
 * to eliminate flaky tests and "unhandled promise" warnings.
 *
 * Addresses issues identified in test cleanup analysis:
 * - Pending promise errors in tests with background timers
 * - Missing proper async cleanup in test teardown
 * - Unhandled timers causing test runner warnings
 *
 * @example
 * import { createTestCleanup } from '@claude-flow/testing';
 *
 * it('should cleanup properly', async () => {
 *   const cleanup = createTestCleanup();
 *   const timer = cleanup.setTimeout(() => {}, 1000);
 *   cleanup.addPromise(fetchData());
 *   // ... test logic
 *   await cleanup.cleanup(); // clears all timers & awaits promises
 * });
 */

import { vi, afterEach } from 'vitest';

/**
 * Cleanup registration for test resources
 */
export interface CleanupRegistration {
  /** Unique identifier for this registration */
  id: string;
  /** Description for debugging */
  description: string;
  /** When this was registered */
  createdAt: number;
}

/**
 * Configuration for TestCleanup
 */
export interface TestCleanupOptions {
  /** Auto-register cleanup in Vitest's afterEach (default: true) */
  autoCleanup?: boolean;
  /** Timeout for cleanup operations in ms (default: 5000) */
  cleanupTimeout?: number;
  /** Throw on cleanup failure (default: false) */
  throwOnCleanupError?: boolean;
  /** Enable verbose logging (default: false) */
  debug?: boolean;
}

/**
 * Default cleanup options
 */
const DEFAULT_OPTIONS: Required<TestCleanupOptions> = {
  autoCleanup: true,
  cleanupTimeout: 5000,
  throwOnCleanupError: false,
  debug: false,
};

/**
 * Timer type for safe cleanup
 */
interface RegisteredTimer {
  id: ReturnType<typeof setTimeout | typeof setInterval>;
  type: 'timeout' | 'interval';
  description: string;
}

/**
 * TestCleanup - Manages cleanup of async operations in tests
 *
 * Features:
 * - Safe timer registration and cleanup (setTimeout/setInterval)
 * - Promise tracking and settlement
 * - Resource registration (closeable/disposable objects)
 * - Vitest afterEach auto-integration
 * - Detailed error reporting for debugging flaky tests
 */
export class TestCleanup {
  private timers: RegisteredTimer[] = [];
  private promises: Set<Promise<unknown>> = new Set();
  private cleanupFns: Array<{ fn: () => void | Promise<void>; description: string }> = [];
  private disposables: Array<{ dispose: () => void | Promise<void>; description: string }> = [];
  private cleaned = false;
  private options: Required<TestCleanupOptions>;
  private idCounter = 0;

  constructor(options: TestCleanupOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.autoCleanup) {
      afterEach(async () => {
        await this.cleanup();
      });
    }
  }

  /**
   * Register a setTimeout that will be cleared during cleanup
   *
   * @returns The timer ID (same as setTimeout)
   */
  setTimeout(handler: (...args: unknown[]) => void, ms: number, ...args: unknown[]): ReturnType<typeof setTimeout> {
    const id = setTimeout(handler, ms, ...args);
    this.timers.push({ id, type: 'timeout', description: `setTimeout(${ms}ms)` });
    this._debug(`Registered setTimeout(${ms}ms)`);
    return id;
  }

  /**
   * Register a setInterval that will be cleared during cleanup
   *
   * @returns The interval ID
   */
  setInterval(handler: (...args: unknown[]) => void, ms: number, ...args: unknown[]): ReturnType<typeof setInterval> {
    const id = setInterval(handler, ms, ...args);
    this.timers.push({ id, type: 'interval', description: `setInterval(${ms}ms)` });
    this._debug(`Registered setInterval(${ms}ms)`);
    return id;
  }

  /**
   * Track a promise for settlement during cleanup
   */
  addPromise<T>(promise: Promise<T>, description = 'anonymous'): Promise<T> {
    const tracked = promise
      .then((result) => {
        this.promises.delete(promise);
        return result;
      })
      .catch((error) => {
        this.promises.delete(promise);
        this._debug(`Pending promise rejected: ${description} — ${error}`);
        // Don't suppress — let the test handle it
        throw error;
      });
    this.promises.add(promise);
    this._debug(`Tracking promise: ${description}`);
    return tracked;
  }

  /**
   * Register a cleanup function to be called during cleanup
   */
  addCleanup(fn: () => void | Promise<void>, description = 'anonymous cleanup'): void {
    this.cleanupFns.push({ fn, description });
    this._debug(`Registered cleanup: ${description}`);
  }

  /**
   * Register a disposable/closeable resource
   */
  addDisposable(disposable: { dispose?: () => void | Promise<void>; close?: () => void | Promise<void>; destroy?: () => void | Promise<void> }, description = 'anonymous resource'): void {
    const disposeFn = async () => {
      if (disposable.dispose) await disposable.dispose();
      else if (disposable.close) await disposable.close();
      else if (disposable.destroy) await disposable.destroy();
    };
    this.disposables.push({ dispose: disposeFn, description });
    this._debug(`Registered disposable: ${description}`);
  }

  /**
   * Create a wrapper around requestAnimationFrame for testing
   * that can be properly cleaned up
   */
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame(callback);
    this.addCleanup(() => cancelAnimationFrame(id), `requestAnimationFrame(${id})`);
    return id;
  }

  /**
   * Run all cleanup operations
   * Clears timers, awaits pending promises, runs cleanup functions
   */
  async cleanup(): Promise<{ cleared: number; errors: Error[] }> {
    if (this.cleaned) {
      return { cleared: 0, errors: [] };
    }
    this.cleaned = true;

    const errors: Error[] = [];
    let cleared = 0;

    // 1. Clear timers
    for (const timer of this.timers) {
      try {
        if (timer.type === 'timeout') {
          clearTimeout(timer.id);
        } else {
          clearInterval(timer.id);
        }
        cleared++;
      } catch (error) {
        errors.push(new Error(`Failed to clear ${timer.type}: ${error}`));
      }
    }
    this.timers = [];

    if (cleared > 0) {
      this._debug(`Cleared ${cleared} timer(s)`);
    }

    // 2. Settle pending promises
    if (this.promises.size > 0) {
      this._debug(`Settling ${this.promises.size} pending promise(s)...`);
      try {
        await Promise.allSettled([...this.promises]);
      } catch {
        // already settled via allSettled
      }
      this.promises.clear();
    }

    // 3. Run cleanup functions (in reverse order)
    for (const cleanup of this.cleanupFns.reverse()) {
      try {
        await Promise.race([
          cleanup.fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Cleanup timed out: ${cleanup.description}`)), this.options.cleanupTimeout)
          ),
        ]);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        if (this.options.debug) {
          console.warn(`[TestCleanup] Cleanup error [${cleanup.description}]:`, error);
        }
      }
    }
    this.cleanupFns = [];

    // 4. Dispose resources
    for (const disposable of this.disposables.reverse()) {
      try {
        await disposable.dispose();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    this.disposables = [];

    if (errors.length > 0 && this.options.throwOnCleanupError) {
      throw new AggregateError(errors, `TestCleanup: ${errors.length} cleanup error(s)`);
    }

    return { cleared, errors };
  }

  /**
   * Get diagnostic info about current state
   */
  getDiagnostics(): { activeTimers: number; pendingPromises: number; cleanupFns: number; disposables: number } {
    return {
      activeTimers: this.timers.length,
      pendingPromises: this.promises.size,
      cleanupFns: this.cleanupFns.length,
      disposables: this.disposables.length,
    };
  }

  private _debug(message: string): void {
    if (this.options.debug) {
      console.debug(`[TestCleanup] ${message}`);
    }
  }
}

/**
 * Create a TestCleanup instance with default options
 *
 * @example
 * const cleanup = createTestCleanup();
 * const timer = cleanup.setTimeout(() => doStuff(), 500);
 * await cleanup.cleanup();
 */
export function createTestCleanup(options: TestCleanupOptions = {}): TestCleanup {
  return new TestCleanup(options);
}

/**
 * Create a scoped cleanup that auto-registers with Vitest's afterEach
 *
 * @example
 * const scope = createCleanupScope({ debug: true });
 * scope.setTimeout(() => {}, 1000);
 */
export function createCleanupScope(options: Omit<TestCleanupOptions, 'autoCleanup'> = {}): TestCleanup {
  return new TestCleanup({ ...options, autoCleanup: true });
}

/**
 * Safely run an async operation with automatic cleanup registration
 *
 * @example
 * const result = await withCleanup(
 *   async (cleanup) => {
 *     const timer = cleanup.setTimeout(() => {}, 1000);
 *     const data = await fetchData();
 *     return data;
 *   }
 * );
 */
export async function withCleanup<T>(
  fn: (cleanup: TestCleanup) => Promise<T>,
  options: TestCleanupOptions = {}
): Promise<T> {
  const cleanup = new TestCleanup(options);
  try {
    return await fn(cleanup);
  } finally {
    await cleanup.cleanup();
  }
}
