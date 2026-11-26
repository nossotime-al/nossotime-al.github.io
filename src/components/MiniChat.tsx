import React, { useEffect, useRef, useState } from 'react';
import { MensagemChat, PerfilTipo, Usuario } from '../types';
import { deveOcultarUltimoAcesso, horaCurta } from '../services/robos';

interface MiniChatProps {
  perfil: PerfilTipo;
  usuarios: Usuario[];
  chatAlvo: string;
  mensagens: MensagemChat[];
  onSelecionarAlvo: (nome: string) => void;
  onInspecionarPessoa: (nome: string) => void;
  onEnviarMensagem: (msg: MensagemChat) => void;
  onVirarComando: (msg: MensagemChat) => void;
  onVirarSubdemanda: (msg: MensagemChat) => void;
  onNotificar: (texto: string) => void;
}

export const MiniChat: React.FC<MiniChatProps> = ({
  perfil,
  usuarios,
  chatAlvo,
  mensagens,
  onSelecionarAlvo,
  onInspecionarPessoa,
  onEnviarMensagem,
  onVirarComando,
  onVirarSubdemanda,
  onNotificar
}) => {
  const [apenasOnline, setApenasOnline] = useState(true);
  const [buscaContato, setBuscaContato] = useState('');
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<{ nome: string; tamanhoKB: number } | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!gravando) return;
    const t = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [gravando]);

  const filtrados = usuarios.filter((u) => {
    const okOnline = !apenasOnline || u.online;
    const okBusca =
      !buscaContato.trim() ||
      u.nome.toLowerCase().includes(buscaContato.toLowerCase()) ||
      u.setor.toLowerCase().includes(buscaContato.toLowerCase());
    return okOnline && okBusca;
  });

  const contatos = filtrados.length ? filtrados : usuarios;
  const alvoAtivo = contatos.some((u) => u.nome === chatAlvo) ? chatAlvo : contatos[0]?.nome || 'Marcos';
  const alvoObj = usuarios.find((u) => u.nome === alvoAtivo) || contatos[0];
  const ocultarAcesso = deveOcultarUltimoAcesso(alvoObj);

  const conversa = mensagens.filter((m) => m.para === alvoAtivo || m.de === alvoAtivo);

  const dispararEnvio = (audioUrl: string | null, audioDuracao: string | null) => {
    const limpo = texto.trim();
    const anexoTexto = anexo ? `${anexo.nome} (${anexo.tamanhoKB} KB)` : null;
    if (!limpo && !audioUrl && !audioDuracao && !anexoTexto) {
      onNotificar('Digite, grave áudio ou anexe');
      return;
    }

    onEnviarMensagem({
      id: 'msg-' + Date.now(),
      de: perfil,
      para: alvoAtivo,
      texto: limpo || (audioDuracao ? 'Mensagem de áudio' : 'Arquivo enviado'),
      audioUrl,
      audioDuracao,
      anexoNome: anexoTexto,
      hora: horaCurta()
    });

    setTexto('');
    setAnexo(null);
    if (fileRef.current) fileRef.current.value = '';
    onNotificar(`Enviado para ${alvoAtivo}`);
  };

  const alternarAudio = async () => {
    if (gravando) {
      try {
        gravadorRef.current?.stop();
      } catch {}
      setGravando(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      dispararEnvio(null, '0:04 (nota de voz)');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      setSegundos(0);
      const rec = new MediaRecorder(stream);
      gravadorRef.current = rec;

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const dur = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        dispararEnvio(url, dur);
      };

      rec.start();
      setGravando(true);
      onNotificar('Gravando áudio...');
    } catch {
      dispararEnvio(null, '0:03 (áudio direto)');
    }
  };

  return (
    <div>
      <div className="sub" style={{ marginBottom: 8 }}>
        🔒 Conversa com {alvoAtivo}. Apenas os participantes visualizam as mensagens.
      </div>

      <div className="row-space">
        <button
          type="button"
          className={`chip ${apenasOnline ? 'active' : ''}`}
          onClick={() => setApenasOnline((v) => !v)}
        >
          {apenasOnline ? '● Só Online' : 'Todos'}
        </button>
        <input
          type="text"
          value={buscaContato}
          onChange={(e) => setBuscaContato(e.target.value)}
          placeholder="Buscar pessoa ou setor..."
          style={{ maxWidth: 200, minHeight: 36, fontSize: 12 }}
        />
      </div>

      {alvoObj && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="person-chip"
            onClick={() => onInspecionarPessoa(alvoObj.nome)}
          >
            <span className={alvoObj.online ? 'dot-live' : 'dot-off'} />
            {alvoObj.nome} • {alvoObj.setor}
            {!ocultarAcesso ? ` (${alvoObj.ultimoAcesso})` : ''}
          </button>
        </div>
      )}

      <div className="chat-contacts">
        {contatos.map((u) => (
          <button
            key={u.id}
            type="button"
            className={`contact-pill ${u.nome === alvoAtivo ? 'active' : ''}`}
            onClick={() => onSelecionarAlvo(u.nome)}
          >
            <span className={u.online ? 'dot-live' : 'dot-off'} />
            {u.nome}
          </button>
        ))}
      </div>

      <div className="chat-feed">
        {conversa.length ? (
          conversa.map((m) => (
            <div key={m.id} className={`msg-bubble ${m.de === perfil ? 'mine' : ''}`}>
              <div className="msg-meta">
                {m.de} → {m.para} • {m.hora}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.texto}</div>
              {m.audioDuracao && (
                <div className="attach-tag">
                  🎙️ Áudio ({m.audioDuracao})
                  {m.audioUrl && (
                    <audio
                      controls
                      src={m.audioUrl}
                      style={{ display: 'block', width: '100%', marginTop: 6, height: 32 }}
                    />
                  )}
                </div>
              )}
              {m.anexoNome && <div className="attach-tag">📎 {m.anexoNome}</div>}
              <div className="chips" style={{ marginTop: 6 }}>
                <button type="button" className="chip" onClick={() => onVirarComando(m)}>
                  ⚡ Virar Comando
                </button>
                <button type="button" className="chip" onClick={() => onVirarSubdemanda(m)}>
                  ↳ Virar Subdemanda
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="sub">Nenhuma mensagem com {alvoAtivo} ainda.</div>
        )}
      </div>

      <div className="chat-composer">
        <div className="chips" style={{ marginTop: 0 }}>
          <button type="button" className="chip" onClick={() => setTexto('Recebido, sigo na execução.')}>
            Recebido
          </button>
          <button type="button" className="chip" onClick={() => setTexto('Preciso de retorno imediato.')}>
            Retorno já
          </button>
          <button type="button" className="chip" onClick={() => setTexto('Concluído e validado.')}>
            Concluído
          </button>
        </div>

        {anexo && <div className="attach-tag">📎 Pronto para enviar: {anexo.nome} ({anexo.tamanhoKB} KB)</div>}
        {gravando && <div className="rec-badge">Gravando {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}</div>}

        <div className="composer-row">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Escreva para ${alvoAtivo}...`}
            onKeyDown={(e) => e.key === 'Enter' && dispararEnvio(null, null)}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispararEnvio(null, null)}>
            Enviar
          </button>
        </div>

        <div className="chain-bar" style={{ marginTop: 0 }}>
          <button
            type="button"
            className={`btn btn-sm ${gravando ? 'btn-bad' : 'btn-soft'}`}
            onClick={alternarAudio}
          >
            {gravando ? '⏹ Parar e Enviar Áudio' : '🎙️ Gravar Áudio'}
          </button>
          <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer', margin: 0 }}>
            📎 Anexo
            <input
              type="file"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const arq = e.target.files?.[0];
                if (!arq) return;
                setAnexo({
                  nome: arq.name,
                  tamanhoKB: Math.max(1, Math.round(arq.size / 1024))
                });
                onNotificar(`Anexo: ${arq.name}`);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
