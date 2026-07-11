'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="panel error-panel">
          <div className="panel-title" style={{ color: 'var(--danger)' }}>Erro</div>
          <p style={{ marginBottom: 12 }}>
            Algo deu errado. Tente recarregar a pagina.
          </p>
          <p className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            {this.state.error?.message}
          </p>
          <button
            className="secondary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
