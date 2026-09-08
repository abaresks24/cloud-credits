"use client";

import { useMemo } from "react";

const HORIZON = 730 * 24 * 3600; // seconds, matches the deployed pool

/**
 * The value-over-time curve (SPEC §5.5 — "the screen that sells the project").
 * value(t) = faceValue * min(timeLeft, horizon) / horizon, plotted from now to expiry.
 */
export function ValueCurve({ faceValue, expiry }: { faceValue: number; expiry: number }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const { path, area, nowX, nowY, pts } = useMemo(() => {
    const W = 520, H = 220, padL = 8, padR = 8, padT = 14, padB = 22;
    const start = nowSec;
    const end = Math.max(expiry, nowSec + 1);
    const span = end - start;
    const N = 60;
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = start + (span * i) / N;
      const left = Math.max(0, expiry - t);
      const factor = Math.min(left, HORIZON) / HORIZON;
      const value = faceValue * factor;
      const x = padL + ((W - padL - padR) * i) / N;
      const y = padT + (H - padT - padB) * (1 - value / faceValue);
      xs.push(x); ys.push(y);
    }
    const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const area = `${path} L${xs[xs.length - 1].toFixed(1)},${H - padB} L${xs[0].toFixed(1)},${H - padB} Z`;
    return { path, area, nowX: xs[0], nowY: ys[0], pts: { W, H, padB } };
  }, [faceValue, expiry, nowSec]);

  const monthsLeft = Math.max(0, (expiry - nowSec) / (30 * 24 * 3600));

  return (
    <div>
      <svg viewBox={`0 0 ${pts.W} ${pts.H}`} width="100%" role="img" aria-label="value over time">
        <defs>
          <linearGradient id="cc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f8cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#cc)" />
        <path d={path} fill="none" stroke="url(#line)" strokeWidth="2.5" />
        <line x1="0" y1={pts.H - pts.padB} x2={pts.W} y2={pts.H - pts.padB} stroke="#1d2942" />
        <circle cx={nowX} cy={nowY} r="4.5" fill="#22d3ee" />
        <text x={nowX + 8} y={nowY - 8} fill="#8a99b8" fontSize="11" fontFamily="ui-monospace">now</text>
        <text x={pts.W - 8} y={pts.H - 6} fill="#8a99b8" fontSize="11" textAnchor="end" fontFamily="ui-monospace">expiry</text>
        <text x="8" y={pts.H - 6} fill="#8a99b8" fontSize="11" fontFamily="ui-monospace">
          {monthsLeft.toFixed(0)} months left
        </text>
      </svg>
      <p className="notice">
        Value converges to zero at expiry: a buyer needs time to consume the credit, so the closer to
        expiry, the less it is worth. The pool prices this <b>mechanically</b> via the v4 hook.
      </p>
    </div>
  );
}
