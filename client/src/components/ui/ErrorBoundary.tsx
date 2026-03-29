import { Component, type ReactNode, type ErrorInfo } from "react";
import Button from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = "/";
            }}
          >
            Back to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
