import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTheme } from "../theme/ThemeContext";

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
  const { theme } = useTheme();

  return (
    <div
      style={{
        padding: "2rem",
        textAlign: "center",
        color: theme.color.danger,
      }}
    >
      <h3
        style={{
          margin: "0 0 0.5rem",
          fontFamily: theme.font.headline,
          color: theme.color.danger,
        }}
      >
        Something went wrong
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: theme.font.size.sm,
          color: theme.color.textMuted,
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
          border: `1px solid ${theme.color.danger}`,
          borderRadius: theme.radius.md,
          background: `${theme.color.danger}1a`,
          color: theme.color.danger,
          cursor: "pointer",
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          transition: `background ${theme.motion.fast}`,
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
