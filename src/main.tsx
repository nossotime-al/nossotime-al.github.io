import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

class EscudoBlindado extends React.Component<
  { children: React.ReactNode },
  { erro: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { erro: false };
  }

  static getDerivedStateFromError() {
    return { erro: true };
  }

  render() {
    if (this.state.erro) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>Auto-Recuperação Ativada</h2>
          <p style={{ margin: '12px 0' }}>O Robô Guardião interceptou uma falha e está pronto para restaurar.</p>
          <button
            type="button"
            style={{ padding: '12px 20px', borderRadius: 12, background: '#0A3D62', color: '#fff', border: 'none', fontWeight: 800 }}
            onClick={() => {
              try { localStorage.clear(); } catch {}
              window.location.reload();
            }}
          >
            Restaurar Sistema Agora
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EscudoBlindado>
      <App />
    </EscudoBlindado>
  </React.StrictMode>
);
