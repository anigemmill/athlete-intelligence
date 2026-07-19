import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // In production, forward to your error-tracking service (e.g. Sentry).
    // Suppressed here to avoid console noise; the fallback UI is shown instead.
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FCFAFA]">
          <div className="text-center max-w-md px-6">
            <div className="w-12 h-12 rounded-full bg-[#FFF0EE] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#E75D50" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-[18px] font-semibold text-[#1C1F3A] mb-2">Something went wrong</h2>
            <p className="text-[13px] text-[#6B7080] mb-5 leading-relaxed">
              An unexpected error occurred. Please refresh the page — if the problem persists, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#293055] text-white text-[13px] font-medium hover:bg-[#1e2440] transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
