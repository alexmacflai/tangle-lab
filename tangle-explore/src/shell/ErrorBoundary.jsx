import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message ?? 'Unknown rendering error.'
    };
  }

  componentDidCatch(error, info) {
    // Keep full diagnostics in the dev console while rendering a visible fallback.
    console.error('Idea render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            margin: 12,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #2B465F',
            background: '#071B2E',
            color: '#FFFFFF',
            fontSize: 13
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>This mini-prototype crashed.</div>
          <div style={{ opacity: 0.85 }}>{this.state.message}</div>
        </div>
      );
    }

    return this.props.children;
  }
}
