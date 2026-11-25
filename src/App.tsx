import React, { useEffect, useMemo, useState } from 'react';
import { BASE_PADRAO, CHAVE_STORAGE, SETORES_DISPONIVEIS } from './data/padrao';
import { executarEsquadraoRobos, agoraHora, sanitizarEstado } from './services/robos';
import { EstadoApp, PerfilTipo, TelaTipo, Demanda } from './types';
import { MiniChat } from './components/MiniChat';

export const App: React.FC = () => {
  const [tela, setTela] = useState<TelaTipo>('painel');
  const [estado, setEstado] = useState<EstadoApp>(() => {
    try {
      const raw = localStorage.getItem(CHAVE_STORAGE);
      return raw ? sanitizarEstado(JSON.parse(raw)) : BASE_PADRAO;
    } catch {
      return BASE_PADRAO;
    }
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  }, [estado]);

  const notificar = (texto: string) => {
    setToast(texto);
    setTimeout(() => setToast(null), 2200);
  };

  const demandaAtiva = useMemo(
    () => estado.demandas.find((d) => d.id === estado.selecionada) || estado.demandas[0],
    [estado]
  );

  const marcarAtividade = (prev: EstadoApp, quem: string) =>
    prev.usuarios.map((u) => (u.nome === quem ? { ...u, ultimoAcesso: agoraHora(), online: true } : u));

  return (
    <>
      <header className="topbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 18 }}>Nosso Time</strong>
          <span style={{ opacity: 0.85, fontSize: 13 }}>{estado.perfil}</span>
        </div>
      </header>

      <main style={{ padding: '16px', maxWidth: 980, margin: '0 auto' }}>
        {tela === 'painel' && (
          <div className="card">
            <div className="title">Visão Geral</div>
            <div className="sub">{estado.demandas.length} demandas ativas</div>
            {estado.demandas.map((d) => (
              <div key={d.id} className="demand-card" style={{ marginTop: 10, cursor: 'pointer' }} onClick={() => { setEstado((p) => ({ ...p, selecionada: d.id })); setTela('acao'); }}>
                <strong>{d.id} • {d.titulo}</strong>
                <div className="sub">{d.setor} • {d.resp} • {d.dias}d</div>
              </div>
            ))}
          </div>
        )}

        {tela === 'chat' && (
          <div className="card">
            <div className="row-space">
              <span className="title">Mini Chat</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('painel')}>Voltar</button>
            </div>
            <MiniChat
              perfil={estado.perfil}
              usuarios={estado.usuarios}
              chatAlvo={estado.chatAlvo}
              mensagens={estado.mensagens}
              onSelecionarAlvo={(nome) => setEstado((p) => ({ ...p, chatAlvo: nome }))}
              onInspecionarPessoa={() => {}}
              onEnviarMensagem={(msg) => setEstado((p) => ({ ...p, mensagens: [...p.mensagens, msg] }))}
              onVirarComando={(m) => {
                const id = 'CMD-' + String(estado.demandas.length + 1).padStart(3, '0');
                setEstado((p) => ({
                  ...p,
                  selecionada: id,
                  demandas: [{ id, titulo: m.texto, origem: 'secretario', prioridade: 'alta', status: 'aberta', dias: 2, setor: 'Equipe', resp: m.para, subs: [], log: ['Criado via chat'] }, ...p.demandas]
                }));
                notificar(`Virou ${id}`);
                setTela('acao');
              }}
              onVirarSubdemanda={(m) => {
                if (!demandaAtiva) return;
                const cod = `SUB-0${demandaAtiva.subs.length + 1}`;
                setEstado((p) => ({
                  ...p,
                  demandas: p.demandas.map((d) => d.id === demandaAtiva.id ? { ...d, status: 'em_andamento', subs: [...d.subs, { cod, setor: 'Manutenção', nivel: 1, dias: 2, texto: m.texto, feita: false }], log: [`${cod} do chat`, ...d.log] } : d)
                }));
                notificar(`Virou ${cod}`);
              }}
              onNotificar={notificar}
            />
          </div>
        )}

        {tela === 'acao' && demandaAtiva && (
          <div className="card">
            <div className="row-space">
              <span className="title">{demandaAtiva.id}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('painel')}>Voltar</button>
            </div>
            <div className="sub">{demandaAtiva.titulo}</div>
            <div style={{ marginTop: 12 }}>
              {demandaAtiva.subs.map((s) => (
                <div key={s.cod} className="demand-card" style={{ marginBottom: 8 }}>
                  <strong>{s.cod} • {s.setor}</strong>
                  <div className="sub">{s.texto}</div>
                  <button type="button" className="btn btn-ok btn-sm" onClick={() => {
                    setEstado((p) => ({
                      ...p,
                      demandas: p.demandas.map((d) => d.id === demandaAtiva.id ? { ...d, subs: d.subs.map((sub) => sub.cod === s.cod ? { ...sub, feita: true } : sub) } : d)
                    }));
                    notificar('Subdemanda concluída');
                  }}>
                    {s.feita ? 'Concluída ✓' : 'Concluir'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tela === 'perfil' && (
          <div className="card">
            <div className="title">{estado.perfil}</div>
            <div className="sub">Nosso Time • {estado.demandas.length} demandas</div>
            <div className="chain-bar" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-soft" onClick={() => setTela('painel')}>Visão Geral</button>
              <button type="button" className="btn btn-ghost" onClick={() => {
                const html = document.documentElement;
                html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
              }}>
                Tema
              </button>
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="bottom-dock">
        <div className="dock-grid">
          {([
            ['painel', 'Visão Geral'],
            ['chat', 'Mini Chat'],
            ['acao', 'Ação'],
            ['perfil', 'Perfil']
          ] as [TelaTipo, string][]).map(([id, label]) => (
            <button key={id} type="button" className={`dock-btn ${tela === id ? 'active' : ''}`} onClick={() => setTela(id)}>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
