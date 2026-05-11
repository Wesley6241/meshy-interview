import type { CSSProperties } from "react";

export function TaskProgressRing({
  progress,
  size = "md",
  className = "",
}: {
  progress: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const pct = Math.round(p * 100);

  return (
    <div className={`taskProgressRingWrap taskProgressRingWrap--${size} ${className}`.trim()}>
      <div
        className="taskProgressRing"
        style={{ ["--progress" as string]: String(p) } as CSSProperties}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      />
    </div>
  );
}
