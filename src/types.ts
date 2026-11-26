export type PerfilTipo = 'Secretário' | 'Assessor' | 'Equipe de Gabinete' | 'Setor';
export type PrioridadeTipo = 'urgente' | 'alta' | 'normal';
export type StatusDemanda = 'aberta' | 'em_andamento' | 'aguardando_validacao' | 'atrasada' | 'resolvida';
export type TelaTipo = 'painel' | 'agenda' | 'novo' | 'acao' | 'chat' | 'perfil' | 'login' | 'cadastro' | 'admin';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  cargo: PerfilTipo;
  setor: string;
  online: boolean;
  ultimoAcesso: string;
}

export interface MarcacaoApoio {
  usuarioNome: string;
  setor: string;
  status: 'pendente' | 'aceita' | 'rejeitada';
  justificativa?: string;
  aceitaEm?: number;
  hora: string;
}

export interface CobrancaAlerta {
  id: string;
  autorAssinatura: string;
  texto: string;
  hora: string;
}

export interface Demanda {
  id: string;
  titulo: string;
  criadoPorAssinatura: string;
  criadoPorNome: string;
  prioridade: PrioridadeTipo;
  status: StatusDemanda;
  dias: number;
  iniciadaEm: number | null;
  setor: string;
  resp: string;
  marcados: MarcacaoApoio[];
  cobrancas: CobrancaAlerta[];
  log: string[];
}

export interface CompromissoAgenda {
  id: string;
  data: string;
  hora: string;
  titulo: string;
  local: string;
  criadoPor: string;
}

export interface MensagemChat {
  id: string;
  de: string;
  para: string;
  texto: string;
  audioUrl?: string | null;
  audioDuracao?: string | null;
  anexoNome?: string | null;
  hora: string;
}

export interface EstadoApp {
  usuarioAtualId: string;
  selecionada: string;
  statusFiltro: StatusDemanda | null;
  setorFiltro: string;
  chatAlvo: string;
  setores: string[];
  usuarios: Usuario[];
  demandas: Demanda[];
  agenda: CompromissoAgenda[];
  mensagens: MensagemChat[];
}
