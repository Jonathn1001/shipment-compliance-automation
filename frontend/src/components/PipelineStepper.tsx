import { useEffect, useState } from 'react';
import type { ShipmentStatus, ValidationStep } from '../api/types';
import { StatusBadge } from './StatusBadge';

/**
 * Replays a validation run's real step trace (from `/validate`). Steps are
 * revealed one at a time for a "step by step" feel; the numbers shown are the
 * engine's own, not a client-side reconstruction. Honors reduced-motion by
 * revealing everything at once.
 */

const STEP_MS = 480;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const prettyKey = (k: string) =>
  k
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const prettyVal = (v: string | number | boolean) =>
  typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);

export function PipelineStepper({
  steps,
  finalStatus,
}: {
  steps: ValidationStep[];
  finalStatus: ShipmentStatus;
}) {
  const instant = prefersReducedMotion();
  const [revealed, setRevealed] = useState(instant ? steps.length : 0);

  useEffect(() => {
    if (instant) {
      setRevealed(steps.length);
      return;
    }
    setRevealed(0);
    const timers = steps.map((_, i) =>
      setTimeout(() => setRevealed((n) => Math.max(n, i + 1)), STEP_MS * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [steps, instant]);

  const done = revealed >= steps.length;

  return (
    <div className="pipeline">
      <div className="pipeline-head">
        <p className="eyebrow" style={{ margin: 0 }}>Validation pipeline</p>
        <span className="pipeline-count">
          {Math.min(revealed, steps.length)}/{steps.length}
        </span>
      </div>

      <ol className="steps">
        {steps.map((step, i) => {
          const shown = i < revealed;
          const active = !instant && shown && i === revealed - 1 && !done;
          return (
            <li
              key={step.key}
              className={`step${shown ? ' shown' : ''}${active ? ' active' : ''}`}
            >
              <span className="step-dot" aria-hidden="true">
                {shown ? i + 1 : ''}
              </span>
              <div className="step-body">
                <div className="step-label">{step.label}</div>
                <div className="step-chips">
                  {Object.entries(step.detail).map(([k, v]) => (
                    <span className="chip" key={k}>
                      <span className="chip-k">{prettyKey(k)}</span>
                      <span className="chip-v">{prettyVal(v)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {done && (
        <div className="pipeline-result">
          <span>Result</span>
          <StatusBadge status={finalStatus} />
        </div>
      )}
    </div>
  );
}
