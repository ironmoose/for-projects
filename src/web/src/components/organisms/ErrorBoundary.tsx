import { Component, type ErrorInfo, type ReactNode } from "react";
import { semantic as t } from "@4lt7ab/ui/core";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Themed fallback rendered by the class component via a function child. */
function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color: t.colorActionDestructive,
      }}
    >
      <h3
        style={{
          margin: "0 0 0.5rem",
          fontFamily: t.fontSerif,
          color: t.colorActionDestructive,
        }}
      >
        Something went wrong
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: t.fontSizeSm,
          color: t.colorTextMuted,
          opacity: 0.7,
        }}
      >
        {error?.message ?? "An unexpected error occurred."}
      </p>
      <button
        onClick={onReset}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          border: `1px solid ${t.colorActionDestructive}`,
          borderRadius: t.radiusMd,
          background: `color-mix(in srgb, ${t.colorActionDestructive} 10%, transparent)`,
          color: t.colorActionDestructive,
          cursor: "pointer",
          fontFamily: t.fontSans,
          fontSize: t.fontSizeSm,
          transition: `background 0.15s`,
        }}
      >
        Try again
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}
