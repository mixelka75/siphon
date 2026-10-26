import { Component, type ReactNode } from 'react';

// Без границы ошибок любой сбой отрисовки превращает окно в пустой экран.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty" style={{ height: '100%' }}>
        <h3>Что-то пошло не так</h3>
        <p><code>{String(this.state.error.message || this.state.error)}</code></p>
        <span className="row">
          <button className="btn primary" onClick={() => this.setState({ error: null })}>Попробовать снова</button>
          <button className="btn" onClick={() => location.reload()}>Перезагрузить</button>
        </span>
      </div>
    );
  }
}
