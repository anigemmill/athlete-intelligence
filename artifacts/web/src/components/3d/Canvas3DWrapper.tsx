/**
 * Canvas3DWrapper — ErrorBoundary + Suspense + WebGL availability check.
 * Wraps all R3F canvases to ensure the app degrades gracefully when
 * WebGL is unavailable or the canvas throws.
 */
import React, { Component, Suspense } from "react";

interface State {
  hasError: boolean;
}

export class Canvas3DErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Silently swallow WebGL / Three.js errors
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Canvas3D] Error caught by boundary:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/** Check at runtime whether the browser supports WebGL */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      (canvas.getContext as any)("experimental-webgl")
    );
  } catch {
    return false;
  }
}

interface Canvas3DWrapperProps {
  children: React.ReactNode;
  /** Shown while canvas is loading (Suspense fallback) */
  loadingFallback?: React.ReactNode;
  /** Shown if WebGL is unavailable or the canvas throws */
  errorFallback?: React.ReactNode;
}

export function Canvas3DWrapper({
  children,
  loadingFallback = null,
  errorFallback = null,
}: Canvas3DWrapperProps) {
  return (
    <Canvas3DErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </Canvas3DErrorBoundary>
  );
}
