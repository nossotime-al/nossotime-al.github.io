import { Demanda, EstadoApp, MensagemChat, PerfilTipo, Usuario } from '../types';
import { BASE_PADRAO } from '../data/padrao';

export function horaCurta(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function agoraHora(): string {
  return `Hoje, ${horaCurta()}`;
}

export function normalizarTexto(txt: string): string {
  return String(txt || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function ehNucleoGabinete(cargo: PerfilTipo): boolean {
  return cargo === 'Secretário' || cargo === 'Assessor' || cargo === 'Equipe de Gabinete';
}

export function formatarAssinaturaCriador(usuario: Usuario): string {
  if (usuario.cargo === 'Secretário') return `Secretário - ${usuario.nome}`;
  if (usuario.cargo === 'Assessor') return `Secretário - ${usuario.nome} - Assessor`;
  if (usuario.cargo === 'Equipe de Gabinete') return `Secretário - ${usuario.nome} - Equipe de Gabinete`;
  return `${usuario.nome} (${usuario.setor})`;
}

export function deveOcultarUltimoAcesso(u?: Usuario | null): boolean {
  if (!u) return false;
  return u.cargo === 'Secretário' || u.cargo === 'Assessor';
}

export function setorJaCadastrado(setores: string[], candidato: string): boolean {
  const alvo = normalizarTexto(candidato);
  if (!alvo) return true;
  return setores.some((s) => normalizarTexto(s) === alvo);
}

export function formatarTempoDecorrido(iniciadaEm: number | null): string {
  if (!iniciadaEm || !Number.isFinite(iniciadaEm)) return 'Aguardando iniciar';
  const diffMs = Math.max(0, Date.now() - iniciadaEm);
  const mins = Math.floor(diffMs / 60000);
  const horas = Math.floor(mins / 60);
  const restoMins = mins % 60;
  if (horas > 0) return `${horas}h ${String(restoMins).padStart(2, '0')}m contando`;
  return `${mins}m contando`;
}

export function filtrarConversaPrivada(
  mensagens: MensagemChat[],
  meuNome: string,
  alvoNome: string
): MensagemChat[] {
  return mensagens.filter(
    (m) =>
      (m.de === meuNome && m.para === alvoNome) ||
      (m.de === alvoNome && m.para === meuNome)
  );
}

export function clonarEstado(src: EstadoApp): EstadoApp {
  return JSON.parse(JSON.stringify(src));
}

export function sanitizarEstado(raw: unknown): EstadoApp {
  try {
    if (!raw || typeof raw !== 'object') return clonarEstado(BASE_PADRAO);
    const obj = raw as Partial<EstadoApp>;
    const base = clonarEstado(BASE_PADRAO);

    const usuariosValidos =
      Array.isArray(obj.usuarios) && obj.usuarios.length
        ? obj.usuarios.filter((u) => u && typeof u.id === 'string' && typeof u.nome === 'string')
        : base.usuarios;

    const usuarioExiste = usuariosValidos.some((u) => u.id === obj.usuarioAtualId);
    const setoresUnicos: string[] = [];
    const listaSetores = Array.isArray(obj.setores) && obj.setores.length ? obj.setores : base.setores;
    for (const s of listaSetores) {
      if (typeof s === 'string' && s.trim() && !setorJaCadastrado(setoresUnicos, s)) {
        setoresUnicos.push(s.trim());
      }
    }

    const demandasValidas: Demanda[] = Array.isArray(obj.demandas)
      ? obj.demandas
          .filter((d) => d && typeof d.id === 'string' && typeof d.titulo === 'string')
          .map((d) => ({
            ...d,
            criadoPorAssinatura: d.criadoPorAssinatura || 'Secretário - Claydon',
            criadoPorNome: d.criadoPorNome || 'Claydon',
            dias: Number.isFinite(Number(d.dias)) ? Number(d.dias) : 2,
            iniciadaEm: typeof d.iniciadaEm === 'number' ? d.iniciadaEm : null,
            marcados: Array.isArray(d.marcados) ? d.marcados : [],
            cobrancas: Array.isArray(d.cobrancas) ? d.cobrancas : [],
            log: Array.isArray(d.log) ? d.log : []
          }))
      : base.demandas;

    return {
      ...base,
      ...obj,
      usuarioAtualId: usuarioExiste && obj.usuarioAtualId ? obj.usuarioAtualId : usuariosValidos[0].id,
      setores: setoresUnicos.length ? setoresUnicos : base.setores,
      usuarios: usuariosValidos,
      demandas: demandasValidas,
      agenda: Array.isArray(obj.agenda) ? obj.agenda : base.agenda,
      mensagens: Array.isArray(obj.mensagens) ? obj.mensagens : base.mensagens
    };
  } catch {
    return clonarEstado(BASE_PADRAO);
  }
}

export function executarEsquadraoRobos(estado: EstadoApp): {
  proximo: EstadoApp;
  reparos: number;
  criticas: Demanda[];
  statusRobos: string;
} {
  const limpo = sanitizarEstado(estado);
  let reparos = 0;

  const demandas = limpo.demandas.map((d) => {
    let status = d.status;
    let dias = Number.isFinite(Number(d.dias)) ? Number(d.dias) : 2;
    let iniciadaEm = d.iniciadaEm;

    if (status === 'em_andamento' && !iniciadaEm) {
      iniciadaEm = Date.now();
      reparos++;
    }

    if (status !== 'resolvida' && dias <= 0 && status !== 'atrasada') {
      status = 'atrasada';
      reparos++;
    }

    return { ...d, status, dias, iniciadaEm };
  });

  const criticas = demandas.filter(
    (d) =>
      d.status !== 'resolvida' &&
      (d.prioridade === 'urgente' || d.status === 'atrasada' || d.cobrancas.length > 0)
  );

  return {
    proximo: { ...limpo, demandas },
    reparos,
    criticas,
    statusRobos: `6 Robôs Ativos • ${criticas.length} alerta(s) crítico(s)`
  };
}
