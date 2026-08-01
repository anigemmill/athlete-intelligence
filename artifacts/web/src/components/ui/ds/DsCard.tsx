/**
 * DsCard — standard dark surface card.
 * Applies the canonical bg/border/radius tokens so every card looks consistent.
 */
import React from "react";
import { T } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export interface DsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pad the card with standard internal spacing (default true) */
  padded?: boolean;
  /** Show a lime-tinted border on hover */
  interactive?: boolean;
  /** Apply a subtle lime background highlight */
  highlighted?: boolean;
}

export function DsCard({
  padded = true,
  interactive = false,
  highlighted = false,
  className,
  style,
  children,
  ...rest
}: DsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-colors",
        padded && "p-5",
        interactive && "cursor-pointer",
        className,
      )}
      style={{
        background: highlighted ? T.bgHighlight : T.bgCard,
        border: `1px solid ${T.borderDefault}`,
        ...style,
      }}
      onMouseEnter={interactive ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = T.borderStrong;
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = T.borderDefault;
      } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

/** DsCardHeader — standard card header with bottom divider */
export function DsCardHeader({
  className,
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 py-4 flex items-center justify-between", className)}
      style={{ borderBottom: `1px solid ${T.borderSubtle}`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
