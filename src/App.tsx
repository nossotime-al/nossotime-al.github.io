import React, { useEffect, useState } from 'react';
import {
  EstadoApp,
  MensagemChat,
  OrigemTipo,
  PerfilTipo,
  PrioridadeTipo,
  StatusDemanda,
  TelaTipo,
  Usuario
} from './types';
import { BASE_PADRAO, CHAVE_STORAGE, SETORES_DISPONIVEIS } from './data/padrao';
import {
  agoraHora,
  clonarEstado,
  deveOcultarUltimoAcesso,
  executarEsquadraoRobos,
  sanitizarEstado
} from './services/robos';
import { MiniChat } from './components/MiniChat';

const ORDENS = ['prazo', 'prioridade', 'recente'] as const;

export function App() {
  const [estado, setEstado] = useState<EstadoApp>(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      const base = sanitizarEstado(salvo ? JSON.parse(salvo) : null);
      return executarEsquadraoRobos(base).proximo;
    } catch {
      return clonarEstado(BASE_PADRAO);
    }
  });

  const [tela, setTela] = useState<TelaTipo>('painel');
  const [idxOrdem, setIdxOrdem] = useState(0);
  const [modoFoco, setModoFoco] = useState(false);
  const [drawerAlertas, setDrawerAlertas] = useState(false);
  const [drawerApp, setDrawerApp] = useState(false);
  const [pessoaInspecionada, setPessoaInspecionada] = useState<Usuario | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [promptInstall, setPromptInstall] = useState<any>(null);

  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSetor, setCadSetor] = useState<string>('Manutenção');
  const [cadPerfil, setCadPerfil] = useState<PerfilTipo>('Setor');

  const [cmdTexto, setCmdTexto] = useState('');
  const [cmdResp, setCmdResp] = useState('Marcos');
  const [cmdPrazo, setCmdPrazo] = useState<{ prio: PrioridadeTipo; dias: number }>({
    prio: 'alta',
    dias: 3
  });

  const [subSetor, setSubSetor] = useState<string>('Manutenção');
  const [subNivel, setSubNivel] = useState<1 | 2>(1);
  const [subDias, setSubDias] = useState<number>(2);
  const [subDetalhe, setSubDetalhe] = useState('');

  const notificar = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((atual) => (atual === msg ? null : atual)), 2100);
  };

  useEffect(() => {
    try {
      const enxuto: EstadoApp = {
        ...estado,
        mensagens: estado.mensagens.map((m) => ({
          ...m,
          audioUrl: m.audioUrl && m.audioUrl.startsWith('blob:') ? null : m.audioUrl
        }))
      };
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(enxuto));
    } catch {}
  }, [estado]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptInstall(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const ciclo = window.setInterval(() => {
      setEstado((prev) => executarEsquadraoRobos(prev).proximo);
    }, 30000);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.clearInterval(ciclo);
    };
  }, []);

  const marcarAtividade = (prev: EstadoApp, nomeOuCargo: string): Usuario[] =>
    prev.usuarios.map((u) =>
      u.nome === nomeOuCargo || u.cargo === nomeOuCargo
        ? { ...u, online: true, ultimoAcesso: agoraHora() }
        : u
    );

  const rodarRobosAgora = (avisar: boolean) => {
    setEstado((prev) => {
      const res = executarEsquadraoRobos(prev);
      if (avisar) {
        notificar(
          res.reparos
            ? `Robôs corrigiram ${res.reparos} ponto(s)`
            : `Robôs ok • ${res.urgentes.length} urgente(s)`
        );
      }
      return res.proximo;
    });
  };

  const executarAtualizar = async () => {
    notificar('Atualizando...');
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.replace(url.toString());
  };

  const executarApp = async () => {
    if (promptInstall?.prompt) {
      try {
        promptInstall.prompt();
        await promptInstall.userChoice;
        setPromptInstall(null);
        return;
      } catch {}
    }
    setDrawerApp(true);
  };

  const inspecionarPessoa = (nomeAlvo: string) => {
    const achado =
      estado.usuarios.find((u) => u.nome === nomeAlvo || u.cargo === nomeAlvo) || {
        id: 'tmp-' + nomeAlvo,
        nome: nomeAlvo,
        cargo: 'Equipe' as PerfilTipo,
        setor: 'Operação',
        online: true,
        ultimoAcesso: agoraHora()
      };
    setPessoaInspecionada(achado);
  };

  const entrarComo = (perfil: PerfilTipo) => {
    setEstado((prev) => ({
      ...prev,
      perfil,
      usuarios: marcarAtividade(prev, perfil)
    }));
    notificar(`Perfil: ${perfil}`);
    setTela('painel');
  };

  const salvarCadastro = () => {
    const nome = cadNome.trim() || 'Novo Membro';
    setEstado((prev) => ({
      ...prev,
      chatAlvo: nome,
      pendentes: [...prev.pendentes, { id: Date.now(), nome, info: `${cadSetor} • ${cadPerfil}` }],
      usuarios: [
        ...prev.usuarios,
        {
          id: 'u-' + Date.now(),
          nome,
          cargo: cadPerfil,
          setor: cadSetor,
          online: true,
          ultimoAcesso: agoraHora()
        }
      ],
      alertas: [`Novo cadastro: ${nome} (${cadSetor})`, ...prev.alertas]
    }));
    setCadNome('');
    setCadEmail('');
    notificar('Cadastro salvo');
    setTela('login');
  };

  const criarComando = () => {
    const titulo = cmdTexto.trim() || 'Comando operacional';
    const id = 'CMD-' + String(estado.demandas.length + 1).padStart(3, '0');
    setEstado((prev) => ({
      ...prev,
      selecionada: id,
      usuarios: marcarAtividade(prev, prev.perfil),
      alertas: [`${id}: ${titulo}`, ...prev.alertas],
      demandas: [
        {
          id,
          titulo,
          origem: 'secretario',
          prioridade: cmdPrazo.prio,
          status: 'aberta',
          dias: cmdPrazo.dias,
          setor: 'Equipe',
          resp: cmdResp,
          subs: [],
          log: [`Criado (${cmdPrazo.dias}d) para ${cmdResp}`]
        },
        ...prev.demandas
      ]
    }));
    setCmdTexto('');
    notificar(`${id} enviado`);
    setTela('painel');
  };

  const demandaAtiva =
    estado.demandas.find((d) => d.id === estado.selecionada) || estado.demandas[0];

  const rank: Record<PrioridadeTipo, number> = { urgente: 1, alta: 2, normal: 3 };
  const demandasFiltradas = estado.demandas
    .filter((d) => {
      const okO = estado.origem === 'todas' || d.origem === estado.origem;
      const okS = !estado.status || d.status === estado.status;
      const okF =
        !modoFoco ||
        (d.status !== 'resolvida' && (d.prioridade === 'urgente' || Number(d.dias) <= 3));
      return okO && okS && okF;
    })
    .sort((a, b) => {
      const modo = ORDENS[idxOrdem];
      if (modo === 'prioridade') return rank[a.prioridade] - rank[b.prioridade];
      if (modo === 'prazo') return a.dias - b.dias;
      return 0;
    });

  const onlineCount = estado.usuarios.filter((u) => u.online).length;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  return (
    <>
      <header className="topbar">
        <div className="topbar-wrap">
          <div className="brand" onClick={() => setTela('painel')}>
            <div className="brand-badge">NT</div>
            <div>
              <h1>Nosso Time</h1>
              <small>{estado.perfil} • Operação Ativa</small>
            </div>
          </div>

          <div className="top-actions">
            <button type="button" className="top-btn" onClick={executarAtualizar}>
              ↻ Atualizar
            </button>
            <button type="button" className="top-btn" onClick={executarApp}>
              ⬇ App
            </button>
            <button
              type="button"
              className="top-btn"
              onClick={() => setDrawerAlertas((v) => !v)}
            >
              Alertas <span className="count-pill">{estado.alertas.length}</span>
            </button>
            <button
              type="button"
              className="top-btn"
              onClick={() => {
                const html = document.documentElement;
                html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
              }}
            >
              🌚
            </button>
            <button
              type="button"
              className="top-btn"
              onClick={() => {
                setEstado(clonarEstado(BASE_PADRAO));
                notificar('Base restaurada');
              }}
            >
              ↺
            </button>
          </div>
        </div>
      </header>

      <main className="main" style={{ paddingBottom: 110 }}>
        {drawerAlertas && (
          <div className="card">
            <div className="row-space">
              <span className="title">Robôs e Alertas</span>
              <div className="chips" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-soft"
                  onClick={() => rodarRobosAgora(true)}
                >
                  Rodar Robôs
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setEstado((prev) => ({ ...prev, alertas: [] }))}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-soft"
                  onClick={() => setDrawerAlertas(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              {estado.alertas.length ? (
                estado.alertas.map((a, i) => (
                  <div
                    key={i}
                    style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}
                  >
                    • {a}
                  </div>
                ))
              ) : (
                <div className="sub">0 alertas pendentes.</div>
              )}
            </div>
          </div>
        )}

        {drawerApp && (
          <div className="card">
            <div className="row-space">
              <span className="title">Instalar nossotime-al.github.io</span>
              <button
                type="button"
                className="btn btn-sm btn-soft"
                onClick={() => setDrawerApp(false)}
              >
                Fechar
              </button>
            </div>
            <p className="sub" style={{ marginTop: 8 }}>
              {isIOS
                ? 'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.'
                : 'No menu do navegador: toque em Instalar aplicativo ou Adicionar à tela inicial.'}
            </p>
          </div>
        )}

        {tela === 'login' && (
          <div className="card" style={{ maxWidth: 500, margin: '8px auto' }}>
            <div className="row-space">
              <span className="title">Entrar</span>
              <button type="button" className="btn btn-sm btn-soft" onClick={() => setTela('cadastro')}>
                Cadastro →
              </button>
            </div>

            <div className="chain-bar">
              {(['Secretário', 'Assessor', 'Equipe', 'Setor'] as PerfilTipo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${p === 'Secretário' ? 'btn-primary' : 'btn-soft'}`}
                  onClick={() => entrarComo(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="lbl">E-mail</label>
            <input type="email" placeholder="seu@email.gov.br" />

            <label className="lbl">Senha</label>
            <input type="password" placeholder="••••••••" />

            <div className="chain-bar">
              <button type="button" className="btn btn-primary" onClick={() => entrarComo('Secretário')}>
                Entrar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTela('cadastro')}>
                Criar Conta →
              </button>
            </div>
          </div>
        )}

        {tela === 'cadastro' && (
          <div className="card" style={{ maxWidth: 560, margin: '8px auto' }}>
            <div className="row-space">
              <span className="title">Cadastro</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('login')}>
                ← Login
              </button>
            </div>

            <label className="lbl">Nome</label>
            <input
              type="text"
              value={cadNome}
              onChange={(e) => setCadNome(e.target.value)}
              placeholder="Nome completo"
            />

            <label className="lbl">E-mail</label>
            <input
              type="email"
              value={cadEmail}
              onChange={(e) => setCadEmail(e.target.value)}
              placeholder="email@setor.gov.br"
            />

            <label className="lbl">Setor</label>
            <div className="chips">
              {SETORES_DISPONIVEIS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${cadSetor === s ? 'active' : ''}`}
                  onClick={() => setCadSetor(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="lbl">Perfil</label>
            <div className="chips">
              {(['Setor', 'Equipe', 'Assessor'] as PerfilTipo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`chip ${cadPerfil === p ? 'active' : ''}`}
                  onClick={() => setCadPerfil(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="chain-bar">
              <button type="button" className="btn btn-primary" onClick={salvarCadastro}>
                Concluir Cadastro →
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTela('login')}>
                Voltar ao Login
              </button>
            </div>
          </div>
        )}

        {tela === 'painel' && (
          <>
            <div className="card">
              <div className="row-space">
                <div>
                  <div className="title">Visão Geral • {estado.perfil}</div>
                  <div className="sub">
                    {estado.demandas.length} demandas • {onlineCount} online agora
                  </div>
                </div>
                <div className="chips" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${modoFoco ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setModoFoco((v) => !v)}
                  >
                    Foco Crítico
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setTela('novo')}
                  >
                    + Novo Comando →
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-soft"
                    onClick={() => setTela('chat')}
                  >
                    Mini Chat →
                  </button>
                </div>
              </div>

              {pessoaInspecionada && (
                <div className="person-sheet">
                  <div className="row-space">
                    <div>
                      <strong>{pessoaInspecionada.nome}</strong>{' '}
                      <span className="sub">
                        • {pessoaInspecionada.cargo} ({pessoaInspecionada.setor})
                      </span>
                      <div className="sub">
                        {pessoaInspecionada.online ? 'Ativo agora' : 'Fora agora'}
                        {!deveOcultarUltimoAcesso(pessoaInspecionada)
                          ? ` • Último acesso: ${pessoaInspecionada.ultimoAcesso}`
                          : ''}
                      </div>
                    </div>
                    <div className="chips" style={{ marginTop: 0 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setEstado((prev) => ({ ...prev, chatAlvo: pessoaInspecionada.nome }));
                          setTela('chat');
                        }}
                      >
                        Conversar →
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setPessoaInspecionada(null)}
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="kpi-row">
              {(
                [
                  ['aberta', 'Abertas', ''],
                  ['em_andamento', 'Em Andamento', 'warn'],
                  ['aguardando_validacao', 'Validação', 'purple'],
                  ['atrasada', 'Atrasadas', 'bad'],
                  ['resolvida', 'Resolvidas', 'ok']
                ] as [StatusDemanda, string, string][]
              ).map(([st, label, cls]) => (
                <button
                  key={st}
                  type="button"
                  className={`kpi ${cls} ${estado.status === st ? 'active' : ''}`}
                  onClick={() =>
                    setEstado((prev) => ({ ...prev, status: prev.status === st ? null : st }))
                  }
                >
                  <div className="kpi-val">
                    {estado.demandas.filter((d) => d.status === st).length}
                  </div>
                  <div className="kpi-lbl">{label}</div>
                </button>
              ))}
            </div>

            <div className="card">
              <div className="row-space">
                <div className="chips" style={{ marginTop: 0 }}>
                  {(
                    [
                      ['todas', 'Todas'],
                      ['secretario', 'Secretário'],
                      ['equipe', 'Equipe'],
                      ['setor', 'Setores']
                    ] as [OrigemTipo, string][]
                  ).map(([orig, label]) => (
                    <button
                      key={orig}
                      type="button"
                      className={`chip ${estado.origem === orig ? 'active' : ''}`}
                      onClick={() => setEstado((prev) => ({ ...prev, origem: orig }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setIdxOrdem((i) => (i + 1) % ORDENS.length)}
                >
                  Ordem: {ORDENS[idxOrdem]}
                </button>
              </div>

              <div className="demands-grid">
                {demandasFiltradas.length ? (
                  demandasFiltradas.map((d) => {
                    const feitas = d.subs.filter((s) => s.feita).length;
                    const pessoa = estado.usuarios.find(
                      (u) => u.nome === d.resp || u.cargo === d.resp
                    );
                    return (
                      <div key={d.id} className="demand-card">
                        <div>
                          <div className="row-space">
                            <div className="tags">
                              <strong>{d.id}</strong>
                              <span className={`tag ${d.prioridade}`}>{d.prioridade}</span>
                              <span className={`tag ${d.status}`}>
                                {d.status.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="sub">
                              {d.dias}d • {d.setor}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, marginTop: 8 }}>{d.titulo}</div>
                          <div className="row-space" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="person-chip"
                              onClick={() => inspecionarPessoa(d.resp)}
                            >
                              <span className={pessoa?.online ? 'dot-live' : 'dot-off'} />
                              {d.resp}
                            </button>
                            <span className="sub">Sub: {feitas}/{d.subs.length}</span>
                          </div>
                        </div>
                        <div className="chain-bar" style={{ marginTop: 10 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setEstado((prev) => ({ ...prev, selecionada: d.id }));
                              setTela('acao');
                            }}
                          >
                            Abrir →
                          </button>
                          {d.status !== 'resolvida' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ok"
                              onClick={() => {
                                setEstado((prev) => ({
                                  ...prev,
                                  demandas: prev.demandas.map((x) =>
                                    x.id === d.id
                                      ? {
                                          ...x,
                                          status: 'resolvida',
                                          dias: 0,
                                          log: [`Concluída por ${prev.perfil}`, ...x.log]
                                        }
                                      : x
                                  )
                                }));
                                notificar(`${d.id} concluída`);
                              }}
                            >
                              Concluir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="demand-card">
                    <div className="sub">0 demandas neste filtro.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="row-space">
                <div>
                  <div className="title">Online Agora</div>
                  <div className="sub">
                    {onlineCount} pessoas ativas • toque para conversar
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-soft"
                  onClick={() => setTela('chat')}
                >
                  Abrir Chat →
                </button>
              </div>
              <div className="presence-list" style={{ marginTop: 10 }}>
                {estado.usuarios.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="person-chip"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onClick={() => {
                      setEstado((prev) => ({ ...prev, chatAlvo: u.nome }));
                      setTela('chat');
                    }}
                  >
                    <span className={u.online ? 'dot-live' : 'dot-off'} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700 }}>{u.nome}</div>
                      <div className="sub" style={{ fontSize: 11 }}>
                        {u.cargo} • {u.setor}
                        {!deveOcultarUltimoAcesso(u) ? ` • ${u.ultimoAcesso}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tela === 'novo' && (
          <div className="card">
            <div className="row-space">
              <span className="title">Novo Comando</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('painel')}>
                ← Visão Geral
              </button>
            </div>

            <label className="lbl">Escrever Demanda</label>
            <textarea
              value={cmdTexto}
              onChange={(e) => setCmdTexto(e.target.value)}
              placeholder="Digite aqui a demanda..."
            />

            <div className="chips">
              {[
                'Vistoria e reparo imediato',
                'Apoio de transporte e entrega',
                'Inspeção técnica no local'
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chip"
                  onClick={() => setCmdTexto((v) => (v.trim() ? `${v.trim()} — ${t}` : t))}
                >
                  + {t.split(' ')[0]}
                </button>
              ))}
            </div>

            <label className="lbl">Responsável</label>
            <div className="chips">
              {['Marcos', 'Patrícia', 'Diego'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`chip ${cmdResp === r ? 'active' : ''}`}
                  onClick={() => setCmdResp(r)}
                >
                  {r}
                </button>
              ))}
            </div>

            <label className="lbl">Prazo</label>
            <div className="chips">
              {(
                [
                  ['Urgente (1d)', 'urgente', 1],
                  ['Alta (3d)', 'alta', 3],
                  ['Normal (7d)', 'normal', 7]
                ] as [string, PrioridadeTipo, number][]
              ).map(([label, prio, dias]) => (
                <button
                  key={prio}
                  type="button"
                  className={`chip ${cmdPrazo.prio === prio ? 'active' : ''}`}
                  onClick={() => setCmdPrazo({ prio, dias })}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="chain-bar">
              <button type="button" className="btn btn-primary" onClick={criarComando}>
                Enviar Comando →
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTela('painel')}>
                Voltar
              </button>
            </div>
          </div>
        )}

        {tela === 'acao' && demandaAtiva && (
          <>
            <div className="card">
              <div className="row-space">
                <div className="tags">
                  <strong>{demandaAtiva.id}</strong>
                  <span className={`tag ${demandaAtiva.prioridade}`}>{demandaAtiva.prioridade}</span>
                  <span className={`tag ${demandaAtiva.status}`}>
                    {demandaAtiva.status.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="person-chip"
                  onClick={() => inspecionarPessoa(demandaAtiva.resp)}
                >
                  {demandaAtiva.resp} • {demandaAtiva.setor}
                </button>
              </div>
              <div className="title" style={{ marginTop: 10 }}>
                {demandaAtiva.titulo}
              </div>
            </div>

            <div className="card">
              <div className="title">Próximo Passo</div>
              <div className="chain-bar">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEstado((prev) => ({
                      ...prev,
                      usuarios: marcarAtividade(prev, prev.perfil),
                      demandas: prev.demandas.map((d) =>
                        d.id === demandaAtiva.id
                          ? {
                              ...d,
                              status: 'em_andamento',
                              log: [`Respondido por ${prev.perfil} — em andamento`, ...d.log]
                            }
                          : d
                      )
                    }));
                    notificar('Resposta registrada');
                  }}
                >
                  Responder / Ir ao Local
                </button>
                <button
                  type="button"
                  className="btn btn-soft"
                  onClick={() => setTela('subdemanda')}
                >
                  Abrir Subdemanda →
                </button>
                <button
                  type="button"
                  className="btn btn-ok"
                  onClick={() => {
                    setEstado((prev) => ({
                      ...prev,
                      usuarios: marcarAtividade(prev, prev.perfil),
                      demandas: prev.demandas.map((d) =>
                        d.id === demandaAtiva.id
                          ? {
                              ...d,
                              status: 'resolvida',
                              dias: 0,
                              log: [`Concluída por ${prev.perfil}`, ...d.log]
                            }
                          : d
                      )
                    }));
                    notificar('Concluída');
                  }}
                >
                  Concluir
                </button>
              </div>
            </div>

            <div className="card">
              <div className="row-space">
                <span className="title">Subdemandas</span>
                <button
                  type="button"
                  className="btn btn-sm btn-soft"
                  onClick={() => setTela('subdemanda')}
                >
                  + Subdemanda →
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                {demandaAtiva.subs.length ? (
                  demandaAtiva.subs.map((s, idx) => (
                    <div key={s.cod} className="demand-card" style={{ marginBottom: 8 }}>
                      <div className="row-space">
                        <strong>
                          {s.cod} • {s.setor} (Nível {s.nivel})
                        </strong>
                        <span className={`tag ${s.feita ? 'resolvida' : 'em_andamento'}`}>
                          {s.feita ? 'Concluída' : `${s.dias}d`}
                        </span>
                      </div>
                      <div className="sub">{s.texto}</div>
                      <button
                        type="button"
                        className="btn btn-ok btn-sm"
                        onClick={() => {
                          setEstado((prev) => {
                            const atualizado: EstadoApp = {
                              ...prev,
                              usuarios: marcarAtividade(prev, prev.perfil),
                              demandas: prev.demandas.map((d) =>
                                d.id === demandaAtiva.id
                                  ? {
                                      ...d,
                                      subs: d.subs.map((sub, i) =>
                                        i === idx ? { ...sub, feita: true } : sub
                                      ),
                                      log: [`${s.cod} concluída por ${prev.perfil}`, ...d.log]
                                    }
                                  : d
                              )
                            };
                            return executarEsquadraoRobos(atualizado).proximo;
                          });
                          notificar('Subdemanda concluída');
                        }}
                      >
                        {s.feita ? 'Concluída ✓' : 'Concluir Subdemanda'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="demand-card">
                    <div className="sub">0 subdemandas neste item.</div>
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={() => setTela('subdemanda')}
                    >
                      + Criar Subdemanda →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="title">Histórico</div>
              <div className="timeline">
                {demandaAtiva.log.map((item, i) => (
                  <div key={i} className="tl-row">
                    <strong>{item}</strong>
                    <small>Registrado</small>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tela === 'subdemanda' && demandaAtiva && (
          <div className="card">
            <div className="row-space">
              <span className="title">Nova Subdemanda</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('acao')}>
                ← Voltar à Ação
              </button>
            </div>

            <label className="lbl">Setor</label>
            <div className="chips">
              {SETORES_DISPONIVEIS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${subSetor === s ? 'active' : ''}`}
                  onClick={() => setSubSetor(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="lbl">Nível (Máx. 2)</label>
            <div className="chips">
              {([1, 2] as (1 | 2)[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip ${subNivel === n ? 'active' : ''}`}
                  onClick={() => setSubNivel(n)}
                >
                  Nível {n}
                </button>
              ))}
            </div>

            <label className="lbl">Prazo</label>
            <div className="chips">
              {[1, 2, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${subDias === d ? 'active' : ''}`}
                  onClick={() => setSubDias(d)}
                >
                  {d} {d === 1 ? 'dia' : 'dias'}
                </button>
              ))}
            </div>

            <label className="lbl">Detalhes</label>
            <textarea
              value={subDetalhe}
              onChange={(e) => setSubDetalhe(e.target.value)}
              placeholder="Escreva a execução do setor..."
            />

            <div className="chain-bar">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const cod = `SUB-0${demandaAtiva.subs.length + 1}`;
                  const texto = subDetalhe.trim() || `Execução no setor ${subSetor}`;
                  setEstado((prev) => ({
                    ...prev,
                    usuarios: marcarAtividade(prev, prev.perfil),
                    demandas: prev.demandas.map((d) =>
                      d.id === demandaAtiva.id
                        ? {
                            ...d,
                            setor: subSetor,
                            status: 'em_andamento',
                            subs: [
                              ...d.subs,
                              {
                                cod,
                                setor: subSetor,
                                nivel: subNivel,
                                dias: subDias,
                                texto,
                                feita: false
                              }
                            ],
                            log: [`${cod} → ${subSetor} (Nv ${subNivel}, ${subDias}d)`, ...d.log]
                          }
                        : d
                    )
                  }));
                  setSubDetalhe('');
                  notificar(`${cod} criada`);
                  setTela('acao');
                }}
              >
                Criar Subdemanda →
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTela('acao')}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {tela === 'chat' && (
          <div className="card">
            <div className="row-space">
              <span className="title">Mini Chat • Online e Ação</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setTela('painel')}>
                ← Visão Geral
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <MiniChat
                perfil={estado.perfil}
                usuarios={estado.usuarios}
                chatAlvo={estado.chatAlvo}
                mensagens={estado.mensagens}
                onSelecionarAlvo={(nome) => setEstado((prev) => ({ ...prev, chatAlvo: nome }))}
                onInspecionarPessoa={inspecionarPessoa}
                onEnviarMensagem={(msg) =>
                  setEstado((prev) => ({
                    ...prev,
                    usuarios: marcarAtividade(prev, prev.perfil),
                    mensagens: [...prev.mensagens, msg]
                  }))
                }
                onVirarComando={(m) => {
                  const id = 'CMD-' + String(estado.demandas.length + 1).padStart(3, '0');
                  setEstado((prev) => ({
                    ...prev,
                    selecionada: id,
                    demandas: [
                      {
                        id,
                        titulo: m.texto,
                        origem: 'secretario',
                        prioridade: 'alta',
                        status: 'aberta',
                        dias: 2,
                        setor: 'Equipe',
                        resp: m.para || prev.chatAlvo,
                        subs: [],
                        log: [`Robô de Fluxo: criado via chat com ${m.para}`]
                      },
                      ...prev.demandas
                    ]
                  }));
                  notificar(`Virou ${id}`);
                  setTela('acao');
                }}
                onVirarSubdemanda={(m) => {
                  if (!demandaAtiva) return;
                  const cod = `SUB-0${demandaAtiva.subs.length + 1}`;
                  setEstado((prev) => ({
                    ...prev,
                    demandas: prev.demandas.map((d) =>
                      d.id === demandaAtiva.id
                        ? {
                            ...d,
                            status: 'em_andamento',
                            subs: [
                              ...d.subs,
                              {
                                cod,
                                setor: 'Manutenção',
                                nivel: 1,
                                dias: 2,
                                texto: m.texto,
                                feita: false
                              }
                            ],
                            log: [`Robô de Fluxo: ${cod} criada do chat`, ...d.log]
                          }
                        : d
                    )
                  }));
                  notificar(`Virou ${cod}`);
                  setTela('acao');
                }}
                onNotificar={notificar}
              />
            </div>
          </div>
        )}

        {tela === 'admin' && (
          <div className="card">
            <div className="row-space">
              <span className="title">Admin • Aprovações</span>
              <button
                type="button"
                className="btn btn-sm btn-soft"
                onClick={() => setTela('cadastro')}
              >
                + Cadastro →
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              {estado.pendentes.length ? (
                estado.pendentes.map((p) => (
                  <div key={p.id} className="demand-card" style={{ marginBottom: 8 }}>
                    <div className="row-space">
                      <button
                        type="button"
                        className="person-chip"
                        onClick={() => inspecionarPessoa(p.nome)}
                      >
                        {p.nome} • {p.info}
                      </button>
                      <div className="chips" style={{ marginTop: 0 }}>
                        <button
                          type="button"
                          className="btn btn-ok btn-sm"
                          onClick={() => {
                            setEstado((prev) => ({
                              ...prev,
                              pendentes: prev.pendentes.filter((x) => x.id !== p.id)
                            }));
                            notificar(`${p.nome} aprovado`);
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className="btn btn-bad btn-sm"
                          onClick={() => {
                            setEstado((prev) => ({
                              ...prev,
                              pendentes: prev.pendentes.filter((x) => x.id !== p.id)
                            }));
                            notificar(`${p.nome} rejeitado`);
                          }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="demand-card">
                  <div className="sub">0 pendências no momento.</div>
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    onClick={() => setTela('cadastro')}
                  >
                    Novo Cadastro →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tela === 'perfil' && (
          <div className="card">
            <div className="title">{estado.perfil}</div>
            <div className="sub">Nosso Time • {estado.demandas.length} demandas</div>
            <div className="chain-bar">
              <button type="button" className="btn btn-soft" onClick={() => setTela('login')}>
                Trocar Perfil →
              </button>
              <button type="button" className="btn btn-soft" onClick={() => setTela('cadastro')}>
                Cadastro →
              </button>
              <button type="button" className="btn btn-soft" onClick={() => setTela('admin')}>
                Admin →
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const html = document.documentElement;
                  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
                }}
              >
                Tema Claro/Escuro
              </button>
              <button type="button" className="btn btn-bad" onClick={() => setTela('login')}>
                Sair
              </button>
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="bottom-dock">
        <div className="dock-grid">
          {(
            [
              ['painel', 'Visão Geral'],
              ['novo', '+ Comando'],
              ['chat', 'Mini Chat'],
              ['perfil', 'Perfil']
            ] as [TelaTipo, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`dock-btn ${tela === id ? 'active' : ''}`}
              onClick={() => setTela(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
