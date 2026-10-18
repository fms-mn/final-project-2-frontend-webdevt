import { Component } from 'react';

// Shows a recovery screen instead of a blank page when a component throws while rendering.
// `resetKey` (the current route) clears the error when the visitor navigates elsewhere.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('The page crashed:', error);
  }

  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }} role="alert">
        <div className="empty-state-icon">🎬</div>
        <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
        <p>This page hit a problem and could not be shown. Your bookings are safe. Try reloading, or go back to the home page.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
        <a className="btn btn-secondary" href="/">Back to home</a>
      </div>
    );
  }
}
