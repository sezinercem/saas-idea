import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
          <div className="mx-auto max-w-2xl">
            <Alert tone="error">Something went wrong: {this.state.error.message}</Alert>
            <Button className="mt-4" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
