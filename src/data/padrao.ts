import { EstadoApp } from '../types';

export const CHAVE_STORAGE = 'nosso_time_ts_v1';

export const SETORES_DISPONIVEIS = [
  'Manutenção',
  'Transporte',
  'Saúde',
  'Educação',
  'Infraestrutura'
] as const;

export const BASE_PADRAO: EstadoApp = {
  perfil: 'Secretário',
  origem: 'todas',
  status: null,
  selecionada: 'CMD-001',
  chatAlvo: 'Marcos',
  alertas: [
    'Robôs Guardião, Prazos e Fluxo ativos.',
    'CMD-001 em andamento com Marcos.',
    'CMD-002 aguardando validação.'
  ],
  usuarios: [
    { id: 'u-sec', nome: 'Secretário', cargo: 'Secretário', setor: 'Gabinete', online: true, ultimoAcesso: 'Hoje, 19:15' },
    { id: 'u-ass', nome: 'Assessor', cargo: 'Assessor', setor: 'Gabinete', online: true, ultimoAcesso: 'Hoje, 19:12' },
    { id: 'u-eq1', nome: 'Marcos', cargo: 'Equipe', setor: 'Manutenção', online: true, ultimoAcesso: 'Hoje, 19:10' },
    { id: 'u-eq2', nome: 'Patrícia', cargo: 'Equipe', setor: 'Transporte', online: true, ultimoAcesso: 'Hoje, 19:08' },
    { id: 'u-st1', nome: 'Setor Saúde', cargo: 'Setor', setor: 'Saúde', online: true, ultimoAcesso: 'Hoje, 18:55' },
    { id: 'u-st2', nome: 'Setor Infra', cargo: 'Setor', setor: 'Infraestrutura', online: false, ultimoAcesso: 'Ontem, 19:10' }
  ],
  mensagens: [
    {
      id: 'm1',
      de: 'Marcos',
      para: 'Secretário',
      texto: 'Equipe no local da vistoria, telhado e calhas avaliados.',
      audioUrl: null,
      audioDuracao: null,
      anexoNome: null,
      hora: '19:05'
    },
    {
      id: 'm2',
      de: 'Secretário',
      para: 'Marcos',
      texto: 'Perfeito. Se precisar de apoio extra, já puxo como comando ou subdemanda.',
      audioUrl: null,
      audioDuracao: null,
      anexoNome: null,
      hora: '19:06'
    }
  ],
  pendentes: [
    { id: 1, nome: 'Fernanda Oliveira', info: 'Saúde • Setor' },
    { id: 2, nome: 'Rafael Mendes', info: 'Transporte • Equipe' }
  ],
  demandas: [
    {
      id: 'CMD-001',
      titulo: 'Vistoria predial e reparo na unidade',
      origem: 'secretario',
      prioridade: 'alta',
      status: 'em_andamento',
      dias: 3,
      setor: 'Manutenção',
      resp: 'Marcos',
      subs: [
        { cod: 'SUB-01', setor: 'Manutenção', nivel: 1, dias: 2, texto: 'Troca de telhas e calhas', feita: false }
      ],
      log: ['Comando emitido (3d)', 'SUB-01 enviada para Manutenção']
    },
    {
      id: 'CMD-002',
      titulo: 'Entrega de insumos e apoio logístico',
      origem: 'equipe',
      prioridade: 'urgente',
      status: 'aguardando_validacao',
      dias: 1,
      setor: 'Transporte',
      resp: 'Patrícia',
      subs: [
        { cod: 'SUB-02', setor: 'Transporte', nivel: 1, dias: 1, texto: 'Rota de entrega', feita: true }
      ],
      log: ['Comando urgente (1d)', 'Aguardando validação']
    },
    {
      id: 'DEM-003',
      titulo: 'Apoio de transporte entre setores',
      origem: 'setor',
      prioridade: 'normal',
      status: 'aberta',
      dias: 5,
      setor: 'Transporte',
      resp: 'Setor Transporte',
      subs: [],
      log: ['Aberta entre setores (5d)']
    }
  ]
};
