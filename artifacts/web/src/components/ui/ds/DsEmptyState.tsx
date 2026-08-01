/**
 * DsEmptyState — consistent empty / zero-state component.
 */
import React from "react";
import { T } from "@/lib/tokens";

export interface DsEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function DsEmptyState({ icon, title, description, action }: DsEmptyStateProps) {
  return (
    <div
      className="py-16 flex flex-col items-center justify-center text-center rounded-xl"
      style={{ border: `1px dashed ${T.borderStrong}` }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: T.bgElevated }}
      >
        <span style={{ color: T.t40 }}>{icon}</span>
      </div>
      <h3 className="text-[14px] font-semibold mb-1" style={{ color: T.t92 }}>
        {title}
      </h3>
      {description && (
        <p className="text-[13px] max-w-sm leading-relaxed" style={{ color: T.t55 }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** DsLoadingSkeleton — animated placeholder lines */
export function DsLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded shrink-0"
            style={{ background: T.bgElevated }}
          />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded" style={{ background: T.bgElevated, width: `${60 + i * 10}%` }} />
            <div className="h-2 rounded" style={{ background: T.bgCard, width: `${40 + i * 8}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
