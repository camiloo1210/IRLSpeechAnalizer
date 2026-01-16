import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen w-full bg-zinc-900 text-white p-8">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-zinc-400 mb-6 text-center max-w-md">
                        The application encountered an unexpected error. This might be due to a network issue or missing configuration.
                    </p>
                    <pre className="bg-zinc-800 text-red-400 p-4 rounded-lg text-sm max-w-lg overflow-auto mb-6">
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
