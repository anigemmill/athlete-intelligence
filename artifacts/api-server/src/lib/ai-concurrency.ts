/**
 * ai-concurrency.ts
 *
 * A shared, process-wide concurrency cap for outbound AI calls (OpenRouter
 * + OpenAI). Before M6.1, four independent research/extraction cycles
 * (general research, CompetitionsAgent, ContactsAgent x2, TimelineAgent)
 * already fired concurrently per athlete inside a single Promise.all, with
 * nothing capping how many requests could be in flight at once — and more
 * agents are planned, plus the scheduler can process several athletes
 * concurrently. This caps total concurrent calls across the whole process,
 * not per athlete or per agent, since that's where the real limit (rate
 * limits, cost spikes) actually applies.
 *
 * Deliberately dependency-free — a small in-process semaphore is enough
 * for this and doesn't need a queueing library.
 */

const MAX_CONCURRENT_AI_CALLS = 6;

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT_AI_CALLS) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}

function release(): void {
  active--;
  const next = waiters.shift();
  if (next) {
    active++;
    next();
  }
}

export async function withAiConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
