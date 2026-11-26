import React, { useState } from 'react';
import { AgendaItem } from '../types';

interface AgendaProps {
  itens: AgendaItem[];
  podeEditar: boolean;
  onAdicionar: (item: AgendaItem) => void;
  onVoltar: () => void;
}

export const Agenda: React.FC<AgendaProps> = ({ itens, podeEditar, onAdicionar, onVoltar }) => {
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');

  const salvar = () => {
    if (!titulo.trim()) return;
    onAdicionar({
      id: 'ag-' + Date.now(),
      data: data.trim() || 'Hoje',
      hora: hora.trim() || '09:00',
      titulo: titulo.trim(),
      local: local.trim() || 'Gabinete',
      criadoPor: 'Secretário'
    });
    setTitulo('');
    setData('');
    setHora('');
    setLocal('');
  };

  return (
    <div className="card">
      <div className="row-space">
        <div>
          <div className="title">Agenda do Secretário</div>
          <div className="sub">Compromissos visíveis para a equipe</div>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>

      {podeEditar && (
        <div className="custody-box" style={{ marginTop: 12 }}>
          <div className="title" style={{ fontSize: 14 }}>+ Novo Compromisso</div>
          <div className="chain-bar">
            <input type="text" value={data} onChange={(e) => setData(e.target.value)} placeholder="Data (ex: 27/11)" />
            <input type="text" value={hora} onChange={(e) => setHora(e.target.value)} placeholder="Hora (ex: 10:00)" />
          </div>
          <input
            type="text"
            style={{ marginTop: 8 }}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Pauta / Compromisso..."
          />
          <input
            type="text"
            style={{ marginTop: 8 }}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Local..."
          />
          <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={salvar}>
            Salvar na Agenda
          </button>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        {itens.length ? (
          itens.map((item) => (
            <div key={item.id} className="demand-card" style={{ marginBottom: 8 }}>
              <div className="row-space">
                <strong>📅 {item.data} • {item.hora}</strong>
                <span className="tag">{item.local}</span>
              </div>
              <div style={{ fontWeight: 850 }}>{item.titulo}</div>
              <div className="sub">Agendado por: {item.criadoPor}</div>
            </div>
          ))
        ) : (
          <div className="sub">Nenhum compromisso na agenda.</div>
        )}
      </div>
    </div>
  );
};
