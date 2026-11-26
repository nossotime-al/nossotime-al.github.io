import { BASE_PADRAO } from '../data/padrao';
import { EstadoApp, MensagemChat, Usuario } from '../types';

export function clonarEstado<T>(obj: T): T {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

export function agoraHora(): string {
  try {
    return 'Hoje, ' + new Date().toTimeString().slice(0, 5);
  } catch {
    return 'Hoje';
  }
}

export function horaCurta(): string {
  try {
    return new Date().toTimeString().slice(0, 5);
  } catch {
    return 'Agora';
  }
}

export function deveOcultarUltimoAcesso(u?: Pick<Usuario, 'cargo'> | null): boolean {
  return u?.cargo === 'Secretário' || u?.cargo === 'Assessor';
}

export function ehNucleoGabinete(cargo?: string | null): boolean {
  return cargo === 'Secretário' || cargo === 'Assessor';
}

export function filtrarConversaPrivada(
  mensagens: MensagemChat[],
  eu: string,
  alvo: string
): MensagemChat[] {
  if (!eu || !alvo) return [];
  return mensagens.filter(
    (m) =>
      (m.de === eu && m.para === alvo) ||
      (m.de === alvo && m.para === eu)
  );
}

export function sanitizarEstado(raw: unknown): EstadoApp {
  const base = clonarEstado(BASE_PADRAO);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<EstadoApp>;

  return {
    perfil: r.perfil || base.perfil,
    origem: r.origem || base.origem,
    status: r.status ?? null,
    selecionada: typeof r.selecionada === 'string' && r.selecionada ? r.selecionada : base.selecionada,
    chatAlvo: typeof r.chatAlvo === 'string' && r.chatAlvo ? r.chatAlvo : base.chatAlvo,
    alertas: Array.isArray(r.alertas) ? r.alertas.map(String) : base.alertas,
    usuarios: Array.isArray(r.usuarios) && r.usuarios.length ? r.usuarios : base.usuarios,
    mensagens: Array.isArray(r.mensagens) ? r.mensagens : base.mensagens,
    pendentes: Array.isArray(r.pendentes) ? r.pendentes : base.pendentes,
    demandas: Array.isArray(r.demandas) ? r.demandas : base.demandas,
    agenda: Array.isArray(r.agenda) ? r.agenda : (base.agenda || [])
  };
}

export function executarEsquadraoRobos(atual: EstadoApp): {
  proximo: EstadoApp;
  reparos: number;
  urgentes: string[];
} {
  const proximo = sanitizarEstado(atual);
  let reparos = 0;
  const urgentes: string[] = [];

  proximo.demandas = proximo.demandas.map((d) => {
    const subs = Array.isArray(d.subs) ? [...d.subs] : [];
    const log = Array.isArray(d.log) && d.log.length ? [...d.log] : ['Robô Guardião: log restaurado'];
    if (!Array.isArray(d.subs) || !Array.isArray(d.log) || !d.log.length) reparos++;

    let status = d.status;
    if (
      subs.length > 0 &&
      subs.every((s) => s.feita) &&
      status !== 'resolvida' &&
      status !== 'aguardando_validacao'
    ) {
      status = 'aguardando_validacao';
      log.unshift('Robô de Prazos: subdemandas prontas → validação');
      reparos++;
    }

    if (status !== 'resolvida' && (d.prioridade === 'urgente' || Number(d.dias) <= 1)) {
      urgentes.push(d.id);
    }

    return { ...d, subs, log, status };
  });

  if (urgentes.length && !proximo.alertas.some((a) => a.startsWith('Robô de Prazos:'))) {
    proximo.alertas = [`Robô de Prazos: ${urgentes.join(', ')} em atenção.`, ...proximo.alertas].slice(0, 8);
  }

  return { proximo, reparos, urgentes };
}
