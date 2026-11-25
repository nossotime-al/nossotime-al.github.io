export type PerfilTipo = 'Secretário' | 'Assessor' | 'Equipe' | 'Setor';
export type OrigemTipo = 'todas' | 'secretario' | 'equipe' | 'setor';
export type PrioridadeTipo = 'urgente' | 'alta' | 'normal';
export type StatusDemanda = 'aberta' | 'em_andamento' | 'aguardando_validacao' | 'atrasada' | 'resolvida';
export type TelaTipo = 'login' | 'cadastro' | 'painel' | 'novo' | 'acao' | 'subdemanda' | 'chat' | 'admin' | 'perfil';
export interface Usuario { id: string; nome: string; cargo: PerfilTipo; setor: string; online: boolean; ultimoAcesso: string; }
export interface Subdemanda { cod: string; setor: string; nivel: 1 | 2; dias: number; texto: string; feita: boolean; }
export interface Demanda { id: string; titulo: string; origem: Exclude<OrigemTipo, 'todas'>; prioridade: PrioridadeTipo; status: StatusDemanda; dias: number; setor: string; resp: string; subs: Subdemanda[]; log: string[]; }
export interface MensagemChat { id: string; de: string; para: string; texto: string; audioUrl: string | null; audioDuracao: string | null; anexoNome: string | null; hora: string; }
export interface CadastroPendente { id: number; nome: string; info: string; }
export interface EstadoApp { perfil: PerfilTipo; origem: OrigemTipo; status: StatusDemanda | null; selecionada: string; chatAlvo: string; alertas: string[]; usuarios: Usuario[]; mensagens: MensagemChat[]; pendentes: CadastroPendente[]; demandas: Demanda[]; }
