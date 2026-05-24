'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'
import { extrairForma, IconForma } from '@/lib/parser-produto'

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

type Periodo = 'manha' | 'noite' | 'encerrado'

const CATEGORIAS = ['medicamento', 'Perfumaria', 'Alimentos'] as const
const LABELS_TITULO: Record<string, string> = {
  medicamento: 'Solicitar Medicações',
  Perfumaria: 'Solicitar Perfumaria',
  Alimentos: 'Alimentos & Nutrição',
}
const ICONES_CAT: Record<string, string> = {
  medicamento: '💊',
  Perfumaria: '🧴',
  Alimentos: '🥗',
}
const COR_CAT: Record<string, string> = {
  medicamento: 'from-blue-50 to-blue-100',
  Perfumaria: 'from-amber-50 to-amber-100',
  Alimentos: 'from-green-50 to-green-100',
}
// Alimentos é uma categoria virtual — no banco os produtos são 'Perfumaria'
const CATEGORIA_DB: Record<string, string> = {
  medicamento: 'medicamento',
  Perfumaria: 'Perfumaria',
  Alimentos: 'Perfumaria',
}

// Padrões de Alimentos excluídos do "Todos" de Perfumaria para evitar duplicatas
const ALIMENTOS_PADROES_EXCLUIR = [
  'WHEY','PROTEINA','PROTEÍNA','CREATINA','BCAA','VITAMINA','SUPLEMENTO',
  'PROBIOTICO','PROBIÓTICO','MALTODEXTRINA','ALBUMINA','TERMOGENICO','TERMOGÊNICO',
  'SORVETE','PICOLE','PICOLÉ','SUCO ','REFRIGERANTE','IOGURTE','BALA ',
  'BISCOITO','CAFE ','CAFÉ ','BOMBON','BOMBOM','ADOCANTE','ADOÇANTE','MEL ',
  'SNACK','RUFFLE','CHIPS','WAFER','AMENDOIM','BARRA DE CEREAL','GRANOLA',
]
const PAGINA_SIZE = 60

// Sub-filtros por categoria — padrões buscados no nome do produto
const SUB_FILTROS: Record<string, { label: string; icone: string; padroes: string[] }[]> = {
  medicamento: [
    { label: 'Todos',             icone: '💊', padroes: [] },
    { label: 'Comprimidos',       icone: '🔵', padroes: ['CPR','CPS','COMP ','COMPRIMIDO','CÁPSULA','CAPSULA','DRG','DRÁGEA','DRAGEA'] },
    { label: 'Gotas & Colírios',  icone: '💧', padroes: ['GTS','GOTA','GOTAS','COLIRIO','COLÍRIO','COL.'] },
    { label: 'Xaropes & Líquidos',icone: '🧪', padroes: ['XPE','XAROPE','SUSP','SUSPENSAO','SUSPENSÃO','ELIXIR','SOL ','SOLUCAO','SOLUÇÃO'] },
    { label: 'Pomadas & Géis',    icone: '🫙', padroes: ['POMADA','GEL ','CREME ','UNGÜENTO','UNGUENTO','PASTA ','LOÇÃO','LOCAO'] },
    { label: 'Injetáveis',        icone: '💉', padroes: ['INJ','AMPOLA','AMP.'] },
    { label: 'Sachês',            icone: '📦', padroes: ['SACHE','SACHÊ','ENVELOPE','ENV.'] },
  ],
  Perfumaria: [
    { label: 'Todos',               icone: '🧴', padroes: [] },
    { label: 'Higiene & Corpo',     icone: '🚿', padroes: ['SABONETE','SHAMPOO','CONDICIONADOR','DENTAL','ESCOVA','ENXAG','DESODORANTE','DESO','REPELENTE','PROTETOR SOL','SOLAR','HIDRATANTE','SABAO','SABÃO','DETERG','DESINFET','ANTISEPTICO','ANTISSEPTICO'] },
    { label: 'Cosméticos & Beleza', icone: '💄', padroes: ['MAQUIAGEM','BATOM','ESMALTE','PERFUME','COLONIA','COLÔNIA','TINTURA','ACETONA','CREME FACIAL','MASCARA','MÁSCARA','BLUSH','SOMBRA','RIMEL','RÍMEL','FRAGRAN'] },
    { label: 'Absorventes',         icone: '🌸', padroes: ['ABSORVENTE','INTIMUS','ALWAYS','CAREFREE','S.LIVRE','OB ','OB.','P/SEIOS','POS PARTO','PÓS PARTO'] },
    { label: 'Fraldas',             icone: '👶', padroes: ['FRALDA','CALCA ABSORV','CALÇA ABSORV','POISE','PROTETOR DE LEITO','PROTETOR LEITO','PAMPERS','BABYSEC','MAMYPOKO','HIPOPO','HUGGIES','TURMA DA MONICA BABY'] },
  ],
  Alimentos: [
    { label: 'Todos',              icone: '🥗', padroes: ['WHEY','PROTEINA','PROTEÍNA','CREATINA','BCAA','VITAMINA','SUPLEMENTO','PROBIOTICO','PROBIÓTICO','MALTODEXTRINA','ALBUMINA','TERMOGENICO','TERMOGÊNICO','SORVETE','PICOLE','PICOLÉ','SUCO ','REFRIGERANTE','IOGURTE','BALA ','BISCOITO','CAFE ','CAFÉ ','BOMBON','BOMBOM','ADOCANTE','ADOÇANTE','MEL ','SNACK','RUFFLE','CHIPS','WAFER','AMENDOIM','BARRA DE CEREAL','GRANOLA'] },
    { label: 'Suplementos',        icone: '💪', padroes: ['WHEY','PROTEINA','PROTEÍNA','CREATINA','BCAA','VITAMINA','SUPLEMENTO','PROBIOTICO','PROBIÓTICO','MALTODEXTRINA','ALBUMINA','TERMOGENICO','TERMOGÊNICO'] },
    { label: 'Alimentos & Snacks', icone: '🍫', padroes: ['SORVETE','PICOLE','PICOLÉ','SUCO ','REFRIGERANTE','IOGURTE','BALA ','BISCOITO','CAFE ','CAFÉ ','BOMBON','BOMBOM','ADOCANTE','ADOÇANTE','MEL ','SNACK','RUFFLE','CHIPS','WAFER','AMENDOIM','BARRA DE CEREAL','GRANOLA'] },
  ],
}

function estoqueDesatualizado(atualizadoEm: string | null | undefined): boolean {
  if (!atualizadoEm) return true
  const d = new Date(atualizadoEm)
  const hoje = new Date()
  return d.toDateString() !== hoje.toDateString()
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function getPeriodoAtual(): Periodo {
  const hora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  })
  const h = parseInt(hora)
  if (h < 11) return 'manha'
  if (h < 20) return 'noite'
  return 'encerrado'
}

function LogoGentil({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 28 : 36
  const ts = size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden="true">
        <rect x="20" y="10" width="8" height="28" rx="3" fill="#14532d" />
        <rect x="10" y="20" width="28" height="8" rx="3" fill="#14532d" />
        <path d="M30 6 C 39 4, 42 12, 36 16 C 32 14, 30 11, 30 6 Z" fill="#84cc16" />
        <path d="M31 7 Q 35 11 36 15" stroke="#65a30d" strokeWidth="0.8" fill="none" />
      </svg>
      <span className={`${ts} tracking-tight leading-none`}>
        <strong className="font-extrabold text-verde-900">Gentil</strong>
        <em className="ml-1.5 font-medium not-italic italic text-verde-600">Filial</em>
      </span>
    </div>
  )
}

function BarcodeVisual({ ean }: { ean: string }) {
  if (!ean || ean.length < 8) return <p className="font-mono text-lg tracking-widest text-verde-900">{ean}</p>
  const patterns: Record<string, string> = {
    '0': '11010011100', '1': '11011001100', '2': '11011100110',
    '3': '10010110011', '4': '10011011001', '5': '10110011001',
    '6': '10011100110', '7': '10111001001', '8': '10001101001',
    '9': '10110001101',
  }
  const bars: boolean[] = []
  const code = ean.replace(/\D/g, '').slice(0, 13)
  for (const b of [1,0,1]) bars.push(b === 1)
  for (let i = 0; i < Math.min(code.length, 12); i++) {
    const p = patterns[code[i]] || '11010011100'
    for (const c of p) bars.push(c === '1')
    if (i === 5) for (const b of [0,1,0,1,0]) bars.push(b === 1)
  }
  for (const b of [1,0,1]) bars.push(b === 1)
  const w = 2
  const total = bars.length * w
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={total} height={52} viewBox={`0 0 ${total} 52`} className="max-w-[220px]">
        {bars.map((d, i) => d ? <rect key={i} x={i * w} width={w} height={52} fill="#111" /> : null)}
      </svg>
      <p className="font-mono text-sm tracking-widest text-verde-900">{ean}</p>
    </div>
  )
}

function viaProxy(url: string, w = 200, h = 240) {
  const params = new URLSearchParams({
    url: url.replace(/^https?:\/\//, ''),
    w: String(w), h: String(h),
    fit: 'contain', bg: 'white', output: 'webp', q: '85',
  })
  return `https://wsrv.nl/?${params.toString()}`
}

function iniciais(nome?: string): string {
  if (!nome) return '?'
  const palavras = nome.trim().split(/\s+/).filter(p => p.length > 2)
  if (palavras.length >= 2) return (palavras[0][0] + palavras[1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

// Ícones SVG inline para o placeholder — maiores que IconForma (24→48px viewBox reusado, tamanho via className)
function PlaceholderSvg({ tipo, className }: { tipo: string; className?: string }) {
  const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: className ?? 'w-9 h-9' }
  switch (tipo) {
    case 'capsule': return <svg {...base}><path d="M3.5 10.5 L13.5 20.5 A5.66 5.66 0 0 0 20.5 13.5 L10.5 3.5 A5.66 5.66 0 0 0 3.5 10.5Z" /><line x1="8" y1="16" x2="16" y2="8" /></svg>
    case 'pill':    return <svg {...base}><rect x="3" y="9" width="18" height="6" rx="3" /><line x1="12" y1="9" x2="12" y2="15" /></svg>
    case 'liquid':  return <svg {...base}><path d="M9 2h6v6l3 5a6 6 0 1 1-12 0l3-5V2z" /><line x1="6" y1="15" x2="18" y2="15" /></svg>
    case 'tube':    return <svg {...base}><rect x="2" y="9" width="14" height="6" rx="2" /><path d="M16 10l4-2v8l-4-2V10z" /><line x1="5" y1="12" x2="5" y2="12" strokeWidth={2} /></svg>
    case 'syringe': return <svg {...base}><line x1="19" y1="2" x2="22" y2="5" /><path d="M5 19l9-9" /><path d="M10 8l6 6-4 4-6-6 4-4z" /><line x1="2" y1="22" x2="5" y2="19" /></svg>
    case 'spray':   return <svg {...base}><rect x="4" y="11" width="10" height="10" rx="2" /><path d="M14 13h2a2 2 0 0 0 0-4h-2" /><path d="M9 11V7a3 3 0 0 1 6 0" /><line x1="18" y1="7" x2="21" y2="4" /><line x1="18" y1="4" x2="21" y2="7" /></svg>
    case 'envelope':return <svg {...base}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 7l9 7 9-7" /></svg>
    case 'baby':    return <svg {...base}><circle cx="12" cy="5" r="2" /><path d="M8 21v-6a4 4 0 0 1 8 0v6" /><path d="M5 12h14" /><path d="M9 12v3" /><path d="M15 12v3" /></svg>
    case 'flower':  return <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2a3 3 0 0 1 3 3c0 1.2-.7 2.3-1.5 3h-3C9.7 7.3 9 6.2 9 5a3 3 0 0 1 3-3z" /><path d="M12 22a3 3 0 0 1-3-3c0-1.2.7-2.3 1.5-3h3c.8.7 1.5 1.8 1.5 3a3 3 0 0 1-3 3z" /><path d="M2 12a3 3 0 0 1 3-3c1.2 0 2.3.7 3 1.5v3c-.7.8-1.8 1.5-3 1.5a3 3 0 0 1-3-3z" /><path d="M22 12a3 3 0 0 1-3 3c-1.2 0-2.3-.7-3-1.5v-3c.7-.8 1.8-1.5 3-1.5a3 3 0 0 1 3 3z" /></svg>
    case 'food':    return <svg {...base}><path d="M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" /><path d="M12 6v4l3 3" /></svg>
    default:        return <svg {...base}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" /></svg>
  }
}

// Detecta ícone e cor para perfumaria pelo nome do produto
function iconePerfumaria(nome: string): { icon: string; bg: string; fg: string } {
  const n = nome.toUpperCase()
  if (/ABSORV|INTIMUS|ALWAYS|CAREFREE|OB |PROTETOR DI|PÓS PARTO|POS PARTO/.test(n)) return { icon: 'flower',   bg: 'from-pink-50 to-rose-100',     fg: 'text-rose-400' }
  if (/FRALDA|MAMADEIRA|CHUPETA|BICO |BABY|INFANTIL|LENCO UMED|LENÇO UMED/.test(n)) return { icon: 'baby',     bg: 'from-sky-50 to-blue-100',       fg: 'text-sky-400' }
  if (/SORVETE|PICOLE|PICOLÉ|SUCO |REFRIG|LEITE|IOGURTE|BALA |BISCOITO|CAFE |CAFÉ |CHOCOL|CEREAL|MEL /.test(n)) return { icon: 'food',  bg: 'from-orange-50 to-amber-100',   fg: 'text-amber-500' }
  if (/MAQUIAGEM|BATOM|ESMALTE|PERFUME|COLONIA|COLÔNIA|TINTURA|BLUSH|SOMBRA|RÍMEL|RIMEL/.test(n))  return { icon: 'spray',   bg: 'from-purple-50 to-fuchsia-100', fg: 'text-fuchsia-400' }
  return { icon: 'tube', bg: 'from-teal-50 to-emerald-100', fg: 'text-teal-500' }
}

const ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  capsule:  { bg: 'from-indigo-50 to-blue-100',   fg: 'text-indigo-400' },
  pill:     { bg: 'from-blue-50 to-cyan-100',     fg: 'text-blue-400'   },
  liquid:   { bg: 'from-cyan-50 to-sky-100',      fg: 'text-cyan-500'   },
  tube:     { bg: 'from-teal-50 to-emerald-100',  fg: 'text-teal-500'   },
  syringe:  { bg: 'from-red-50 to-rose-100',      fg: 'text-red-400'    },
  spray:    { bg: 'from-purple-50 to-violet-100', fg: 'text-violet-400' },
  envelope: { bg: 'from-amber-50 to-yellow-100',  fg: 'text-amber-500'  },
}

function ImgProduto({ produto, size = 'sm' }: { produto: { categoria: string; imagem_url?: string | null; nome?: string }; size?: 'sm' | 'lg' }) {
  const [erro, setErro] = useState(false)
  const dims = size === 'lg' ? 'w-32 h-32' : 'w-[88px] h-[100px]'
  if (produto.imagem_url && !erro) {
    const pw = size === 'lg' ? 320 : 200
    const ph = size === 'lg' ? 320 : 240
    return (
      <div className={`${dims} rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-verde-100 overflow-hidden p-1.5`}>
        <img src={viaProxy(produto.imagem_url, pw, ph)} alt={produto.nome || ''}
          loading="lazy" className="w-full h-full object-contain"
          onError={() => setErro(true)} referrerPolicy="no-referrer" />
      </div>
    )
  }

  // Placeholder SVG inteligente — ícone baseado na forma do produto
  let icon: string, bg: string, fg: string, label: string
  if (produto.categoria === 'Perfumaria') {
    const p = iconePerfumaria(produto.nome || '')
    icon = p.icon; bg = p.bg; fg = p.fg
    label = 'Perfumaria'
  } else {
    const forma = extrairForma(produto.nome || '', produto.categoria)
    icon = forma.icon
    label = forma.forma
    const c = ICON_COLORS[icon] ?? { bg: 'from-slate-50 to-slate-100', fg: 'text-slate-400' }
    bg = c.bg; fg = c.fg
  }
  const iconSize = size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'
  const labelSize = size === 'lg' ? 'text-[10px]' : 'text-[8px]'

  return (
    <div className={`${dims} rounded-xl bg-gradient-to-br ${bg} flex flex-col items-center justify-center flex-shrink-0 border border-white/80 gap-1 shadow-inner`}>
      <div className={`${fg} opacity-75`}>
        <PlaceholderSvg tipo={icon} className={iconSize} />
      </div>
      <span className={`${labelSize} ${fg} opacity-60 font-semibold uppercase tracking-wide`}>{label}</span>
    </div>
  )
}

function LinhaLaboratorio({
  laboratorio, ativo, logoUrl, onClick,
}: {
  laboratorio: string; ativo: boolean; logoUrl?: string | null; onClick: () => void
}) {
  const [erro, setErro] = useState(false)
  const isTodos = laboratorio === 'Todos'
  const temLogo = logoUrl && !erro && !isTodos
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-4 active:bg-verde-50 ${
        ativo ? 'bg-verde-50 border-verde-700' : 'bg-white border-transparent hover:bg-verde-50/40'
      }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
        isTodos ? 'bg-verde-100' : temLogo ? 'bg-white border border-verde-100 p-1.5' : 'bg-verde-50 border border-verde-100'
      }`}>
        {isTodos ? (
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        ) : temLogo ? (
          <img src={viaProxy(logoUrl!, 100, 100)} alt={laboratorio} loading="lazy"
            className="max-w-full max-h-full object-contain" onError={() => setErro(true)} referrerPolicy="no-referrer" />
        ) : (
          <span className="text-verde-700 font-bold text-sm">{laboratorio.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <span className={`flex-1 text-left text-sm ${ativo ? 'font-bold text-verde-900' : 'font-medium text-verde-800'}`}>
        {laboratorio}
      </span>
      {ativo && (
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

function ModalLaboratorios({
  laboratorios, ativo, logos, onSelecionar, onFechar,
}: {
  laboratorios: string[]; ativo: string; logos: Record<string, string>
  onSelecionar: (l: string) => void; onFechar: () => void
}) {
  const [buscaLab, setBuscaLab] = useState('')
  const filtrados = useMemo(
    () => laboratorios.filter(l => l.toLowerCase().includes(buscaLab.toLowerCase())),
    [laboratorios, buscaLab]
  )
  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex-1" />
      <div className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1" />
        <div className="px-4 pt-3 pb-3 border-b border-verde-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-verde-800">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <h2 className="text-base font-bold">Filtrar por Laboratório</h2>
            </div>
            <button onClick={onFechar} className="w-8 h-8 rounded-full flex items-center justify-center text-verde-500 active:bg-verde-50 text-xl leading-none" aria-label="Fechar">×</button>
          </div>
          <input type="search" placeholder="🔍 Buscar laboratório..."
            value={buscaLab} onChange={e => setBuscaLab(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-verde-50 border border-verde-100 text-verde-900 placeholder-verde-400 focus:outline-none focus:border-verde-500 text-sm"
            autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-verde-50">
          {filtrados.length === 0
            ? <p className="text-center text-verde-500 text-sm py-8">Nenhum laboratório encontrado.</p>
            : filtrados.map(lab => (
                <LinhaLaboratorio key={lab} laboratorio={lab} ativo={ativo === lab}
                  logoUrl={logos[lab]} onClick={() => { onSelecionar(lab); onFechar() }} />
              ))
          }
        </div>
        <div className="px-4 py-3 border-t border-verde-100 text-center bg-verde-50/40">
          <p className="text-verde-500 text-xs">{filtrados.length} laboratório{filtrados.length === 1 ? '' : 's'}</p>
        </div>
      </div>
    </div>
  )
}

function ControleQtd({ qtd, onMenos, onMais, compact = false }: {
  qtd: number; onMenos: () => void; onMais: () => void; compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0' : 'gap-1'}`}>
      {!compact && <p className="text-verde-500 text-[11px] font-medium">Quantidade</p>}
      <div className={`flex items-center border-2 rounded-xl bg-white overflow-hidden transition-colors ${qtd > 0 ? 'border-verde-500' : 'border-verde-200'}`}>
        <button onClick={onMenos} disabled={qtd === 0}
          className="w-8 h-9 text-verde-700 font-bold text-xl disabled:text-gray-300 active:bg-verde-50">−</button>
        <div className="w-px h-5 bg-verde-200" />
        <span className={`w-8 text-center font-bold ${qtd > 0 ? 'text-verde-900' : 'text-gray-400'}`}>{qtd}</span>
        <div className="w-px h-5 bg-verde-200" />
        <button onClick={onMais} className="w-8 h-9 text-verde-700 font-bold text-xl active:bg-verde-50">+</button>
      </div>
    </div>
  )
}

function ModalProduto({
  produto, qtdCarrinho, onFechar, onAdicionar, onRemover,
}: {
  produto: Produto; qtdCarrinho: number
  onFechar: () => void; onAdicionar: () => void; onRemover: () => void
}) {
  const info = extrairForma(produto.nome, produto.categoria)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex justify-center mb-3"><ImgProduto produto={produto} size="lg" /></div>
        <span className={`categoria-${produto.categoria} mb-3 inline-block`}>{produto.categoria}</span>
        <h2 className="text-xl font-bold text-verde-900 leading-tight mb-1">{produto.nome}</h2>
        {produto.fabricante && (
          <p className="text-verde-600 text-sm mb-2">🏭 Laboratório: <strong>{produto.fabricante}</strong></p>
        )}
        {produto.categoria === 'medicamento' && info.qtd && (
          <p className="text-verde-500 text-sm mb-4 flex items-center gap-1.5">
            <IconForma tipo={info.icon} className="text-verde-500" />
            {info.embalagem}
          </p>
        )}
        {produto.codigo_barras && (
          <div className="flex flex-col items-center py-4 border-y border-verde-100 my-4">
            <BarcodeVisual ean={produto.codigo_barras} />
          </div>
        )}
        <div className="mt-4">
          {qtdCarrinho > 0 ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={onRemover} className="w-11 h-11 rounded-full bg-verde-100 text-verde-800 font-bold text-xl flex items-center justify-center active:scale-90">−</button>
                <span className="text-2xl font-bold text-verde-900 w-8 text-center">{qtdCarrinho}</span>
                <button onClick={onAdicionar} className="w-11 h-11 rounded-full bg-verde-800 text-white font-bold text-xl flex items-center justify-center active:scale-90">+</button>
              </div>
              <span className="text-verde-700 text-sm font-medium">no carrinho</span>
            </div>
          ) : (
            <button onClick={onAdicionar} className="btn-verde w-full text-center">+ Adicionar ao Carrinho</button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalRevisao({
  carrinho, enviando, periodo, onAlterarQtd, onFechar, onConfirmar,
}: {
  carrinho: ItemCarrinho[]; enviando: boolean; periodo: Periodo
  onAlterarQtd: (p: Produto, delta: number) => void
  onFechar: () => void; onConfirmar: () => void
}) {
  const total = carrinho.reduce((a, i) => a + i.quantidade, 0)
  const labelPeriodo = periodo === 'manha' ? 'Manhã' : periodo === 'noite' ? 'Noite' : 'Encerrado'
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="bg-verde-800 text-white px-4 pt-safe pb-4 flex items-center gap-3 shadow-md">
        <button onClick={onFechar} className="w-9 h-9 rounded-full hover:bg-verde-700 flex items-center justify-center text-2xl leading-none">←</button>
        <h1 className="text-lg font-semibold flex-1">Revisar Solicitação</h1>
        <span className="bg-white text-verde-800 text-xs font-bold px-2.5 py-1 rounded-full">{total} {total === 1 ? 'item' : 'itens'}</span>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {carrinho.length === 0 && <div className="text-center text-verde-500 py-12">Carrinho vazio.</div>}
        {carrinho.map(item => {
          const info = extrairForma(item.produto.nome, item.produto.categoria)
          return (
            <div key={item.produto.id} className="card flex items-center gap-3">
              <ImgProduto produto={item.produto} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-verde-900 text-sm leading-tight">{item.produto.nome}</p>
                {item.produto.fabricante && (
                  <p className="text-xs mt-0.5">
                    <span className="text-verde-500">Laboratório: </span>
                    <span className="text-verde-700 font-semibold">{item.produto.fabricante}</span>
                  </p>
                )}
                {item.produto.codigo_barras && (
                  <p className="text-xs">
                    <span className="text-verde-500">EAN: </span>
                    <span className="text-verde-700 font-mono">{item.produto.codigo_barras}</span>
                  </p>
                )}
                <div className="border-t border-dashed border-verde-200 my-1.5" />
                <p className="text-xs flex items-center gap-1.5 text-verde-700">
                  <IconForma tipo={info.icon} className="text-verde-600" />
                  <span className="font-medium">{info.forma}</span>
                </p>
                {info.embalagem && <p className="text-[11px] text-verde-400 mt-0.5">{info.embalagem}</p>}
              </div>
              <ControleQtd qtd={item.quantidade}
                onMenos={() => onAlterarQtd(item.produto, -1)}
                onMais={() => onAlterarQtd(item.produto, 1)} />
            </div>
          )
        })}
      </div>
      <div className="border-t border-verde-100 bg-white px-4 py-4 shadow-2xl">
        <button onClick={onConfirmar}
          disabled={carrinho.length === 0 || enviando || periodo === 'encerrado'}
          className="btn-verde w-full disabled:opacity-50">
          {enviando ? 'Enviando...' : periodo === 'encerrado'
            ? '🔒 Período encerrado'
            : `✅ Confirmar Solicitação da ${labelPeriodo}`}
        </button>
      </div>
    </div>
  )
}

// ── Barra de paginação ─────────────────────────────────────────────────────
function PaginationBar({ pagina, total, onPagina }: {
  pagina: number; total: number; onPagina: (p: number) => void
}) {
  let pages: number[]
  if (total <= 7) {
    pages = Array.from({ length: total }, (_, i) => i + 1)
  } else {
    const s = new Set([1, total])
    for (let d = -2; d <= 2; d++) {
      const p = pagina + d
      if (p >= 1 && p <= total) s.add(p)
    }
    pages = Array.from(s).sort((a, b) => a - b)
  }

  const nodes: React.ReactNode[] = []
  pages.forEach((p, i) => {
    const prev = pages[i - 1]
    if (prev && p - prev > 1) {
      nodes.push(<span key={`dot-${p}`} className="text-verde-300 text-sm px-0.5">…</span>)
    }
    nodes.push(
      <button key={p} onClick={() => onPagina(p)}
        className={`w-9 h-9 rounded-xl font-semibold text-sm transition-colors ${
          p === pagina
            ? 'bg-verde-800 text-white shadow-sm'
            : 'bg-white border border-verde-200 text-verde-700 active:bg-verde-50'
        }`}>
        {p}
      </button>
    )
  })

  return (
    <div className="flex items-center justify-center gap-1.5 py-5">
      <button onClick={() => onPagina(pagina - 1)} disabled={pagina === 1}
        className="w-9 h-9 rounded-xl bg-white border border-verde-200 text-verde-700 font-bold text-lg disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center">
        ‹
      </button>
      {nodes}
      <button onClick={() => onPagina(pagina + 1)} disabled={pagina === total}
        className="w-9 h-9 rounded-xl bg-white border border-verde-200 text-verde-700 font-bold text-lg disabled:opacity-30 active:scale-95 transition-transform flex items-center justify-center">
        ›
      </button>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────
export default function FarmaceuticoPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const salvo = localStorage.getItem('gf_carrinho')
      return salvo ? JSON.parse(salvo) : []
    } catch { return [] }
  })
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('medicamento')
  const [fabricanteAtivo, setFabricanteAtivo] = useState<string>('Todos')
  const [fabricantes, setFabricantes] = useState<string[]>(['Todos'])
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoPagina, setCarregandoPagina] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('manha')
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [revisao, setRevisao] = useState(false)
  const [logosFabricantes, setLogosFabricantes] = useState<Record<string, string>>({})
  const [modalLab, setModalLab] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [subFiltro, setSubFiltro] = useState<string>('Todos')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carrega lista de fabricantes distintos para o modal de filtro
  const carregarFabricantes = useCallback(async (cat: string) => {
    const catDB = CATEGORIA_DB[cat] ?? cat
    const { data } = await supabase
      .from('produtos')
      .select('fabricante')
      .eq('categoria', catDB)
      .not('fabricante', 'is', null)
      .limit(2000)
    if (data) {
      const unicos = Array.from(new Set(data.map(p => p.fabricante as string).filter(Boolean))).sort()
      setFabricantes(['Todos', ...unicos])
    }
  }, [])

  // Carrega uma página de produtos (server-side — categoria + fabricante + busca)
  const carregarPagina = useCallback(async ({
    cat, pagina, fab, texto, sub = 'Todos', inicial = false,
  }: {
    cat: string; pagina: number; fab: string; texto: string; sub?: string; inicial?: boolean
  }) => {
    if (inicial) setCarregando(true)
    else setCarregandoPagina(true)

    const offset = (pagina - 1) * PAGINA_SIZE
    const textoBusca = texto.trim()

    // Monta filtro de sub-categoria (OR entre padrões)
    const subDef = SUB_FILTROS[cat]?.find(s => s.label === sub)
    const subPadroes = subDef && subDef.padroes.length > 0 ? subDef.padroes : null
    const subFiltroStr = subPadroes ? subPadroes.map(p => `nome.ilike.%${p}%`).join(',') : null

    const catDB = CATEGORIA_DB[cat] ?? cat

    // Count query
    let countQ = supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('categoria', catDB).gt('estoque_armazem', 0)
    if (fab !== 'Todos') countQ = countQ.eq('fabricante', fab)
    if (textoBusca.length >= 2) countQ = countQ.ilike('nome', `%${textoBusca}%`)
    if (subFiltroStr) countQ = countQ.or(subFiltroStr)
    // Perfumaria "Todos": exclui produtos que pertencem à aba Alimentos
    if (cat === 'Perfumaria' && !subFiltroStr) {
      for (const p of ALIMENTOS_PADROES_EXCLUIR) countQ = countQ.not('nome', 'ilike', `%${p}%`)
    }

    // Data query
    let dataQ = supabase.from('produtos')
      .select('id, nome, categoria, fabricante, codigo_barras, imagem_url, estoque_armazem, estoque_atualizado_em')
      .eq('categoria', catDB).gt('estoque_armazem', 0).order('nome').range(offset, offset + PAGINA_SIZE - 1)
    if (fab !== 'Todos') dataQ = dataQ.eq('fabricante', fab)
    if (textoBusca.length >= 2) dataQ = dataQ.ilike('nome', `%${textoBusca}%`)
    if (subFiltroStr) dataQ = dataQ.or(subFiltroStr)
    // Perfumaria "Todos": exclui produtos que pertencem à aba Alimentos
    if (cat === 'Perfumaria' && !subFiltroStr) {
      for (const p of ALIMENTOS_PADROES_EXCLUIR) dataQ = dataQ.not('nome', 'ilike', `%${p}%`)
    }

    const [{ count }, { data }] = await Promise.all([countQ, dataQ])

    setTotalProdutos(count ?? 0)
    setProdutos((data ?? []) as Produto[])
    if (inicial) setCarregando(false)
    else setCarregandoPagina(false)
  }, [])

  // ── Inicialização ──────────────────────────────────────────────────────────
  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u: Usuario = JSON.parse(dados)
    if (u.tipo !== 'farmaceutico') { router.push('/gestor'); return }
    setUsuario(u)
    setPeriodo(getPeriodoAtual())
    const timer = setInterval(() => setPeriodo(getPeriodoAtual()), 60_000)
    carregarFabricantes('medicamento')
    carregarPagina({ cat: 'medicamento', pagina: 1, fab: 'Todos', texto: '', inicial: true })
    fetch('/fabricantes_logos.json').then(r => r.ok ? r.json() : {}).then(setLogosFabricantes).catch(() => {})
    return () => {
      clearInterval(timer)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [router, carregarFabricantes, carregarPagina])

  // Persiste carrinho no localStorage sempre que mudar
  useEffect(() => {
    try { localStorage.setItem('gf_carrinho', JSON.stringify(carrinho)) } catch { /* ignora */ }
  }, [carrinho])

  // ── Handlers (imperativos — evitam loops de useEffect) ────────────────────

  function handleCategoriaChange(cat: string) {
    if (cat === categoriaAtiva) return
    setCategoriaAtiva(cat)
    setSubFiltro('Todos')
    setFabricanteAtivo('Todos')
    setBusca('')
    setPaginaAtual(1)
    carregarFabricantes(cat)
    carregarPagina({ cat, pagina: 1, fab: 'Todos', texto: '', sub: 'Todos' })
  }

  function handleSubFiltro(sub: string) {
    setSubFiltro(sub)
    setPaginaAtual(1)
    carregarPagina({ cat: categoriaAtiva, pagina: 1, fab: fabricanteAtivo, texto: busca, sub })
  }

  function handleBuscaChange(texto: string) {
    setBusca(texto)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPaginaAtual(1)
      carregarPagina({ cat: categoriaAtiva, pagina: 1, fab: fabricanteAtivo, texto, sub: subFiltro })
    }, 400)
  }

  function handleSelecionarFabricante(fab: string) {
    setFabricanteAtivo(fab)
    setPaginaAtual(1)
    setModalLab(false)
    carregarPagina({ cat: categoriaAtiva, pagina: 1, fab, texto: busca, sub: subFiltro })
  }

  function handlePagina(p: number) {
    const max = Math.max(1, Math.ceil(totalProdutos / PAGINA_SIZE))
    const nova = Math.max(1, Math.min(p, max))
    setPaginaAtual(nova)
    carregarPagina({ cat: categoriaAtiva, pagina: nova, fab: fabricanteAtivo, texto: busca, sub: subFiltro })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function limparFiltros() {
    setBusca('')
    setFabricanteAtivo('Todos')
    setSubFiltro('Todos')
    setPaginaAtual(1)
    carregarPagina({ cat: categoriaAtiva, pagina: 1, fab: 'Todos', texto: '', sub: 'Todos' })
  }

  function sair() {
    if (!confirm('Sair da conta?')) return
    localStorage.removeItem('gf_usuario')
    router.push('/')
  }

  function alterarQuantidade(produto: Produto, delta: number) {
    setCarrinho(prev => {
      const existente = prev.find(i => i.produto.id === produto.id)
      if (!existente) {
        if (delta <= 0) return prev
        return [...prev, { produto, quantidade: delta }]
      }
      const nova = existente.quantidade + delta
      if (nova <= 0) return prev.filter(i => i.produto.id !== produto.id)
      return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: nova } : i)
    })
  }

  function quantidadeNoCarrinho(produtoId: number) {
    return carrinho.find(i => i.produto.id === produtoId)?.quantidade ?? 0
  }

  async function confirmarSolicitacao() {
    if (carrinho.length === 0 || !usuario) return
    if (periodo === 'encerrado') { setErro('Período encerrado.'); return }
    setEnviando(true)
    setErro('')
    try {
      const { data: sol, error: solError } = await supabase
        .from('solicitacoes')
        .insert({ filial_id: usuario.filial_id, farmaceutico_id: usuario.id, status: 'pendente' })
        .select().single()
      if (solError || !sol) throw new Error('Erro ao criar solicitação')
      const itens = carrinho.map(i => ({
        solicitacao_id: sol.id, produto_id: i.produto.id, quantidade: i.quantidade,
      }))
      const { error: itensError } = await supabase.from('itens_solicitacao').insert(itens)
      if (itensError) throw new Error('Erro ao inserir itens')
      setCarrinho([])
      localStorage.removeItem('gf_carrinho')
      setRevisao(false)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 4000)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setEnviando(false)
    }
  }

  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0)
  const totalPaginas = Math.max(1, Math.ceil(totalProdutos / PAGINA_SIZE))

  // ── Loading inicial ────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="min-h-screen bg-verde-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-verde-200 border-t-verde-700 rounded-full animate-spin" />
          <p className="text-verde-700 font-semibold text-sm">Carregando produtos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-verde-50 pb-32">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-verde-800 text-white pt-safe sticky top-0 z-20">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={sair}
            className="w-9 h-9 flex items-center justify-center active:opacity-60 rounded-full hover:bg-verde-700"
            aria-label="Sair da conta" title="Sair">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
          <h1 className="text-base font-semibold flex-1 text-center">{LABELS_TITULO[categoriaAtiva]}</h1>
          <button onClick={() => setRevisao(true)}
            className="relative w-9 h-9 flex items-center justify-center active:opacity-60 rounded-full hover:bg-verde-700"
            aria-label="Ver carrinho">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalItens > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-verde-800">
                {totalItens}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── ÁREA BRANCA: logo + período ───────────────────────────────────── */}
      <div className="bg-white rounded-t-3xl -mt-3 relative z-10 pt-5 pb-3 px-4">
        <div className="flex items-center justify-center mb-1"><LogoGentil /></div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-verde-500">{usuario?.filial?.nome} · {usuario?.nome}</span>
          <span className={`font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            periodo === 'manha' ? 'bg-amber-100 text-amber-800'
            : periodo === 'noite' ? 'bg-indigo-100 text-indigo-800'
            : 'bg-gray-200 text-gray-600'
          }`}>
            {periodo === 'manha' ? '🌅 Manhã' : periodo === 'noite' ? '🌙 Noite' : '🔒 Encerrado'}
          </span>
        </div>
      </div>

      {/* ── TABS + BUSCA ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-2 space-y-2 bg-white">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => handleCategoriaChange(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                categoriaAtiva === cat ? 'bg-verde-800 text-white' : 'bg-verde-50 text-verde-700 border border-verde-200'
              }`}>
              {ICONES_CAT[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Sub-filtros */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {(SUB_FILTROS[categoriaAtiva] ?? []).map(sf => (
            <button key={sf.label} onClick={() => handleSubFiltro(sf.label)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                subFiltro === sf.label
                  ? 'bg-verde-600 text-white'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
              {sf.icone} {sf.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input type="search"
            placeholder="🔍 Buscar produto, laboratório ou código..."
            value={busca}
            onChange={e => handleBuscaChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-verde-50 border border-verde-100 text-verde-900 placeholder-verde-400 focus:outline-none focus:border-verde-500 text-sm pr-10"
          />
          {carregandoPagina && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-verde-300 border-t-verde-700 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ── FILTRO POR LABORATÓRIO ────────────────────────────────────────── */}
      <button onClick={() => setModalLab(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] bg-white rounded-2xl shadow-sm border border-verde-100 flex items-center justify-between px-4 py-3.5 active:bg-verde-50/40">
        <div className="flex items-center gap-2.5 text-verde-700">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <div className="text-left">
            <p className="font-semibold text-sm leading-tight">Filtrar por Laboratório</p>
            <p className="text-verde-500 text-xs mt-0.5">
              {fabricanteAtivo === 'Todos' ? 'Todos os laboratórios' : fabricanteAtivo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {fabricanteAtivo !== 'Todos' && (
            <span className="bg-verde-100 text-verde-800 text-[10px] font-bold px-2 py-0.5 rounded-full">1 ativo</span>
          )}
          <span className="text-verde-400 text-2xl leading-none">›</span>
        </div>
      </button>

      {periodo === 'encerrado' && (
        <div className="mx-4 mt-4 bg-gray-100 border border-gray-300 text-gray-600 rounded-xl px-4 py-3 text-sm font-medium text-center">
          🔒 Período encerrado. Novas solicitações retornam amanhã.
        </div>
      )}

      {sucesso && (
        <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
          <div className="bg-verde-700 text-white rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-xl flex items-center gap-2.5 justify-center">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Solicitação enviada com sucesso!
          </div>
        </div>
      )}

      {/* ── AVISO DE ESTOQUE DESATUALIZADO ──────────────────────────────── */}
      {(() => {
        const atualizadoEm = produtos[0]?.estoque_atualizado_em ?? null
        const desatualizado = estoqueDesatualizado(atualizadoEm)
        if (desatualizado) {
          return (
            <div className="mx-4 mt-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
              <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-amber-800 text-xs leading-snug font-medium">
                Estoque pode estar desatualizado — importe o relatório do Infarma antes da chamada
              </p>
            </div>
          )
        }
        return (
          <div className="mx-4 mt-3 bg-verde-50 border border-verde-100 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-verde-500 text-sm">✓</span>
            <p className="text-verde-700 text-xs font-medium">
              Estoque atualizado hoje às {formatarHora(atualizadoEm!)}
            </p>
          </div>
        )
      })()}

      {/* ── LISTA DE PRODUTOS ────────────────────────────────────────────── */}
      <div className="px-4 mt-3 space-y-2.5">
        {/* Contador */}
        <div className="flex items-baseline justify-between px-1">
          <p className="text-verde-700 text-xs font-semibold flex items-center gap-2">
            {totalProdutos.toLocaleString('pt-BR')} produto{totalProdutos === 1 ? '' : 's'}
            {totalPaginas > 1 && (
              <span className="text-verde-400 font-normal text-[11px]">· pág {paginaAtual}/{totalPaginas}</span>
            )}
          </p>
          {(fabricanteAtivo !== 'Todos' || busca.trim().length >= 2) && (
            <button onClick={limparFiltros} className="text-verde-600 text-xs underline">Limpar filtros</button>
          )}
        </div>

        {/* Empty state */}
        {produtos.length === 0 && !carregandoPagina && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-verde-50 flex items-center justify-center">
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <p className="text-verde-700 font-semibold text-sm">Nenhum produto encontrado</p>
            <p className="text-gray-400 text-xs text-center max-w-[200px]">
              {busca ? `Nenhum resultado para "${busca}"` : 'Tente outro laboratório ou categoria'}
            </p>
            {(busca || fabricanteAtivo !== 'Todos') && (
              <button onClick={limparFiltros}
                className="mt-1 text-verde-700 text-xs font-semibold border border-verde-200 rounded-xl px-4 py-2">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {produtos.map(produto => {
          const qtd = quantidadeNoCarrinho(produto.id)
          const info = produto.categoria === 'medicamento'
            ? extrairForma(produto.nome, produto.categoria)
            : null
          return (
            <div key={produto.id} className={`rounded-2xl shadow-sm border flex gap-3 items-center px-4 py-3.5 transition-colors ${
              qtd > 0 ? 'bg-verde-50 border-verde-200' : 'bg-white border-gray-100'
            }`}>
              <button onClick={() => setProdutoDetalhe(produto)}
                className="flex-shrink-0 active:opacity-70" aria-label="Ver detalhes">
                <ImgProduto produto={produto} size="sm" />
              </button>

              <div className="flex-1 min-w-0" onClick={() => setProdutoDetalhe(produto)}>
                <p className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">{produto.nome}</p>

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="bg-verde-100 text-verde-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {produto.categoria === 'Perfumaria' ? 'Perfumaria' : 'Medicamento'}
                  </span>
                  {produto.fabricante && (
                    <span className="border border-gray-300 text-gray-600 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                      {produto.fabricante}
                    </span>
                  )}
                </div>

                {produto.codigo_barras && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    EAN: <span className="font-mono text-gray-500">{produto.codigo_barras}</span>
                  </p>
                )}

                {/* Quantidade de comprimidos — só medicamentos, só quando parseia */}
                {info && info.qtd && (
                  <p className="text-[11px] text-verde-500 mt-0.5 flex items-center gap-1">
                    <IconForma tipo={info.icon} className="text-verde-400" />
                    {info.embalagem}
                  </p>
                )}

                {/* Badge de estoque */}
                {produto.estoque_armazem !== undefined && produto.estoque_armazem > 0 && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-verde-700 bg-verde-50 px-2 py-0.5 rounded-full">
                    📦 {produto.estoque_armazem} un.
                  </span>
                )}
              </div>

              <div className="flex-shrink-0">
                <ControleQtd qtd={qtd}
                  onMenos={() => alterarQuantidade(produto, -1)}
                  onMais={() => alterarQuantidade(produto, 1)}
                  compact />
              </div>
            </div>
          )
        })}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <PaginationBar pagina={paginaAtual} total={totalPaginas} onPagina={handlePagina} />
        )}
      </div>

      {/* ── BARRA INFERIOR ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe z-30 shadow-2xl flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-verde-50 flex items-center justify-center">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          {totalItens > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-verde-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalItens}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs">{totalItens} {totalItens === 1 ? 'item selecionado' : 'itens selecionados'}</p>
        </div>
        <button onClick={() => setRevisao(true)}
          disabled={periodo === 'encerrado' || totalItens === 0}
          className="bg-verde-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-40 active:scale-95 transition-transform">
          Enviar solicitação
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {erro && !revisao && (
        <div className="fixed bottom-24 left-4 right-4 bg-red-100 border border-red-300 text-red-700 rounded-xl px-4 py-2 text-sm text-center z-40">
          {erro}
        </div>
      )}

      {produtoDetalhe && (
        <ModalProduto
          produto={produtoDetalhe}
          qtdCarrinho={quantidadeNoCarrinho(produtoDetalhe.id)}
          onFechar={() => setProdutoDetalhe(null)}
          onAdicionar={() => alterarQuantidade(produtoDetalhe, 1)}
          onRemover={() => {
            alterarQuantidade(produtoDetalhe, -1)
            if (quantidadeNoCarrinho(produtoDetalhe.id) <= 1) setProdutoDetalhe(null)
          }}
        />
      )}

      {revisao && (
        <ModalRevisao
          carrinho={carrinho}
          enviando={enviando}
          periodo={periodo}
          onAlterarQtd={alterarQuantidade}
          onFechar={() => setRevisao(false)}
          onConfirmar={confirmarSolicitacao}
        />
      )}

      {modalLab && (
        <ModalLaboratorios
          laboratorios={fabricantes}
          ativo={fabricanteAtivo}
          logos={logosFabricantes}
          onSelecionar={handleSelecionarFabricante}
          onFechar={() => setModalLab(false)}
        />
      )}
    </div>
  )
}
