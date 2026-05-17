'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'
import { extrairForma, IconForma } from '@/lib/parser-produto'

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

type Periodo = 'manha' | 'noite' | 'encerrado'

const CATEGORIAS = ['medicamento', 'cosmético', 'alimento'] as const
const LABELS_TITULO: Record<string, string> = {
  medicamento: 'Solicitar Medicações',
  cosmético: 'Solicitar Cosméticos',
  alimento: 'Solicitar Alimentos',
}
const ICONES_CAT: Record<string, string> = {
  medicamento: '💊',
  cosmético: '💄',
  alimento: '🍎',
}
const COR_CAT: Record<string, string> = {
  medicamento: 'from-blue-50 to-blue-100',
  cosmético: 'from-pink-50 to-pink-100',
  alimento: 'from-orange-50 to-orange-100',
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

// Logo Gentil Filial em SVG (cruz + folha)
function LogoGentil({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 28 : 36
  const ts = size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <div className="flex items-center gap-2.5">
      <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden="true">
        <rect x="20" y="10" width="8" height="28" rx="3" fill="#14532d" />
        <rect x="10" y="20" width="28" height="8" rx="3" fill="#14532d" />
        {/* Folha */}
        <path
          d="M30 6 C 39 4, 42 12, 36 16 C 32 14, 30 11, 30 6 Z"
          fill="#84cc16"
        />
        <path d="M31 7 Q 35 11 36 15" stroke="#65a30d" strokeWidth="0.8" fill="none" />
      </svg>
      <span className={`${ts} tracking-tight leading-none`}>
        <strong className="font-extrabold text-verde-900">Gentil</strong>
        <em className="ml-1.5 font-medium not-italic italic text-verde-600">Filial</em>
      </span>
    </div>
  )
}

// Barcode SVG
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
      <svg width={total} height={52} viewBox={`0 0 ${total} 52`} className="max-w-[220px]" style={{ display: 'block' }}>
        {bars.map((d, i) => d ? <rect key={i} x={i * w} width={w} height={52} fill="#111" /> : null)}
      </svg>
      <p className="font-mono text-sm tracking-widest text-verde-900">{ean}</p>
    </div>
  )
}

// Passa imagem por proxy (wsrv.nl) pra resolver hotlink protection + resize
function viaProxy(url: string, w = 200, h = 240) {
  // Algumas URLs já vêm de CDNs que aceitam hotlink — vamos passar tudo pelo proxy
  // pra padronizar o tamanho e contornar hotlink protection
  const params = new URLSearchParams({
    url: url.replace(/^https?:\/\//, ''),
    w: String(w),
    h: String(h),
    fit: 'contain',
    bg: 'white',
    output: 'webp',
    q: '85',
  })
  return `https://wsrv.nl/?${params.toString()}`
}

// Imagem do produto
function ImgProduto({ produto, size = 'sm' }: { produto: { categoria: string; imagem_url?: string | null; nome?: string }; size?: 'sm' | 'lg' }) {
  const [erro, setErro] = useState(false)
  const dims = size === 'lg' ? 'w-32 h-32' : 'w-[88px] h-[100px]'
  const placeholderIcon = ICONES_CAT[produto.categoria] || '📦'
  const placeholderGrad = COR_CAT[produto.categoria] || 'from-gray-50 to-gray-100'

  if (produto.imagem_url && !erro) {
    const w = size === 'lg' ? 320 : 200
    const h = size === 'lg' ? 320 : 240
    return (
      <div className={`${dims} rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-verde-100 overflow-hidden p-1.5`}>
        <img
          src={viaProxy(produto.imagem_url, w, h)}
          alt={produto.nome || ''}
          loading="lazy"
          className="w-full h-full object-contain"
          onError={() => setErro(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    )
  }

  return (
    <div className={`${dims} rounded-xl bg-gradient-to-br ${placeholderGrad} flex items-center justify-center flex-shrink-0 border border-gray-100`}>
      <span className={size === 'lg' ? 'text-5xl opacity-70' : 'text-3xl opacity-70'}>{placeholderIcon}</span>
    </div>
  )
}

// Linha vertical de laboratório (com logo, nome, indicador de seleção)
function LinhaLaboratorio({
  laboratorio, ativo, logoUrl, onClick,
}: {
  laboratorio: string
  ativo: boolean
  logoUrl?: string | null
  onClick: () => void
}) {
  const [erro, setErro] = useState(false)
  const isTodos = laboratorio === 'Todos'
  const temLogo = logoUrl && !erro && !isTodos

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors border-l-4 active:bg-verde-50 ${
        ativo
          ? 'bg-verde-50 border-verde-700'
          : 'bg-white border-transparent hover:bg-verde-50/40'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
        isTodos
          ? 'bg-verde-100'
          : temLogo
            ? 'bg-white border border-verde-100 p-1.5'
            : 'bg-verde-50 border border-verde-100'
      }`}>
        {isTodos ? (
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        ) : temLogo ? (
          <img
            src={viaProxy(logoUrl!, 100, 100)}
            alt={laboratorio}
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={() => setErro(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-verde-700 font-bold text-sm">
            {laboratorio.slice(0, 2).toUpperCase()}
          </span>
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

// Modal bottom sheet com lista vertical de laboratórios + busca interna
function ModalLaboratorios({
  laboratorios, ativo, logos, onSelecionar, onFechar,
}: {
  laboratorios: string[]
  ativo: string
  logos: Record<string, string>
  onSelecionar: (l: string) => void
  onFechar: () => void
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
      <div
        className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b border-verde-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-verde-800">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <h2 className="text-base font-bold">Filtrar por Laboratório</h2>
            </div>
            <button
              onClick={onFechar}
              className="w-8 h-8 rounded-full flex items-center justify-center text-verde-500 active:bg-verde-50 text-xl leading-none"
              aria-label="Fechar"
            >×</button>
          </div>
          <input
            type="search"
            placeholder="🔍 Buscar laboratório..."
            value={buscaLab}
            onChange={e => setBuscaLab(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-verde-50 border border-verde-100 text-verde-900 placeholder-verde-400 focus:outline-none focus:border-verde-500 text-sm"
            autoFocus
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-verde-50">
          {filtrados.length === 0 ? (
            <p className="text-center text-verde-500 text-sm py-8">Nenhum laboratório encontrado.</p>
          ) : (
            filtrados.map(lab => (
              <LinhaLaboratorio
                key={lab}
                laboratorio={lab}
                ativo={ativo === lab}
                logoUrl={logos[lab]}
                onClick={() => { onSelecionar(lab); onFechar() }}
              />
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-verde-100 text-center bg-verde-50/40">
          <p className="text-verde-500 text-xs">
            {filtrados.length} laboratório{filtrados.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </div>
  )
}

function ControleQtd({ qtd, onMenos, onMais }: { qtd: number; onMenos: () => void; onMais: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-verde-500 text-[11px] font-medium">Quantidade</p>
      <div className="flex items-center border-2 border-verde-300 rounded-xl bg-white overflow-hidden">
        <button
          onClick={onMenos}
          disabled={qtd === 0}
          className="w-8 h-9 text-verde-700 font-bold text-xl disabled:text-gray-300 active:bg-verde-50"
        >−</button>
        <div className="w-px h-5 bg-verde-200" />
        <span className="w-8 text-center font-bold text-verde-900">{qtd}</span>
        <div className="w-px h-5 bg-verde-200" />
        <button
          onClick={onMais}
          className="w-8 h-9 text-verde-700 font-bold text-xl active:bg-verde-50"
        >+</button>
      </div>
    </div>
  )
}

function ModalProduto({
  produto, qtdCarrinho, onFechar, onAdicionar, onRemover,
}: {
  produto: Produto
  qtdCarrinho: number
  onFechar: () => void
  onAdicionar: () => void
  onRemover: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="flex justify-center mb-3">
          <ImgProduto produto={produto} size="lg" />
        </div>
        <span className={`categoria-${produto.categoria} mb-3 inline-block`}>{produto.categoria}</span>
        <h2 className="text-xl font-bold text-verde-900 leading-tight mb-1">{produto.nome}</h2>
        {produto.fabricante && (
          <p className="text-verde-600 text-sm mb-4">🏭 Laboratório: <strong>{produto.fabricante}</strong></p>
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
  carrinho: ItemCarrinho[]
  enviando: boolean
  periodo: Periodo
  onAlterarQtd: (p: Produto, delta: number) => void
  onFechar: () => void
  onConfirmar: () => void
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
        {carrinho.length === 0 && (
          <div className="text-center text-verde-500 py-12">Carrinho vazio.</div>
        )}
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
                {info.embalagem && (
                  <p className="text-[11px] text-verde-400 mt-0.5">{info.embalagem}</p>
                )}
              </div>
              <ControleQtd
                qtd={item.quantidade}
                onMenos={() => onAlterarQtd(item.produto, -1)}
                onMais={() => onAlterarQtd(item.produto, 1)}
              />
            </div>
          )
        })}
      </div>

      <div className="border-t border-verde-100 bg-white px-4 py-4 shadow-2xl">
        <button
          onClick={onConfirmar}
          disabled={carrinho.length === 0 || enviando || periodo === 'encerrado'}
          className="btn-verde w-full disabled:opacity-50"
        >
          {enviando
            ? 'Enviando...'
            : periodo === 'encerrado'
              ? '🔒 Período encerrado'
              : `✅ Confirmar Solicitação da ${labelPeriodo}`}
        </button>
      </div>
    </div>
  )
}

export default function FarmaceuticoPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('medicamento')
  const [fabricanteAtivo, setFabricanteAtivo] = useState<string>('Todos')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('manha')
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null)
  const [revisao, setRevisao] = useState(false)
  const [logosFabricantes, setLogosFabricantes] = useState<Record<string, string>>({})
  const [modalLab, setModalLab] = useState(false)

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u: Usuario = JSON.parse(dados)
    if (u.tipo !== 'farmaceutico') { router.push('/gestor'); return }
    setUsuario(u)
    carregarProdutos()
    setPeriodo(getPeriodoAtual())
    const timer = setInterval(() => setPeriodo(getPeriodoAtual()), 60_000)

    // Carrega logos de fabricantes
    fetch('/fabricantes_logos.json')
      .then(r => r.ok ? r.json() : {})
      .then(setLogosFabricantes)
      .catch(() => {})

    return () => clearInterval(timer)
  }, [router])

  const carregarProdutos = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, categoria, fabricante, codigo_barras, imagem_url')
      .order('nome')
    if (data) setProdutos(data as Produto[])
    setCarregando(false)
  }, [])

  const fabricantes = useMemo(() => {
    const set = new Set<string>()
    produtos.filter(p => p.categoria === categoriaAtiva).forEach(p => {
      if (p.fabricante) set.add(p.fabricante)
    })
    return ['Todos', ...Array.from(set).sort()]
  }, [produtos, categoriaAtiva])

  useEffect(() => { setFabricanteAtivo('Todos') }, [categoriaAtiva])

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
    if (carrinho.length === 0) return
    if (!usuario) return
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
      setRevisao(false)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 4000)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setEnviando(false)
    }
  }

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      if (p.categoria !== categoriaAtiva) return false
      if (fabricanteAtivo !== 'Todos' && p.fabricante !== fabricanteAtivo) return false
      if (busca) {
        const b = busca.toLowerCase()
        if (!p.nome.toLowerCase().includes(b)
          && !(p.fabricante || '').toLowerCase().includes(b)
          && !(p.codigo_barras || '').includes(busca)) return false
      }
      return true
    })
  }, [produtos, categoriaAtiva, fabricanteAtivo, busca])

  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0)

  if (carregando) {
    return (
      <div className="min-h-screen bg-verde-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-verde-50 pb-32">
      {/* HEADER VERDE */}
      <header className="bg-verde-800 text-white pt-safe sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={sair}
            className="w-9 h-9 flex items-center justify-center active:opacity-60"
            aria-label="Voltar"
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <h1 className="text-lg font-semibold flex-1 text-center pr-9">
            {LABELS_TITULO[categoriaAtiva]}
          </h1>

          <button
            onClick={() => setRevisao(true)}
            className="relative w-9 h-9 flex items-center justify-center active:opacity-60"
            aria-label="Ver carrinho"
          >
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
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

      {/* ÁREA BRANCA com logo + selo de período */}
      <div className="bg-white rounded-t-3xl -mt-3 relative z-10 pt-5 pb-3 px-4">
        <div className="flex items-center justify-center mb-1">
          <LogoGentil />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-verde-500">
            {usuario?.filial?.nome} · {usuario?.nome}
          </span>
          <span className={`font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            periodo === 'manha' ? 'bg-amber-100 text-amber-800'
            : periodo === 'noite' ? 'bg-indigo-100 text-indigo-800'
            : 'bg-gray-200 text-gray-600'
          }`}>
            {periodo === 'manha' ? '🌅 Manhã' : periodo === 'noite' ? '🌙 Noite' : '🔒 Encerrado'}
          </span>
        </div>
      </div>

      {/* TABS CATEGORIA + BUSCA */}
      <div className="px-4 pt-2 pb-2 space-y-2 bg-white">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                categoriaAtiva === cat
                  ? 'bg-verde-800 text-white'
                  : 'bg-verde-50 text-verde-700 border border-verde-200'
              }`}
            >
              {ICONES_CAT[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="🔍 Buscar produto, laboratório ou código..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-verde-50 border border-verde-100 text-verde-900 placeholder-verde-400 focus:outline-none focus:border-verde-500 text-sm"
        />
      </div>

      {/* CARD DE FILTRO POR LABORATÓRIO (trigger pro modal vertical) */}
      <button
        onClick={() => setModalLab(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] bg-white rounded-2xl shadow-sm border border-verde-100 flex items-center justify-between px-4 py-3.5 active:bg-verde-50/40"
      >
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
            <span className="bg-verde-100 text-verde-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              1 ativo
            </span>
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
        <div className="mx-4 mt-4 bg-verde-100 border border-verde-400 text-verde-800 rounded-xl px-4 py-3 text-sm font-medium text-center animate-pulse">
          ✅ Solicitação enviada com sucesso!
        </div>
      )}

      {/* LISTA DE PRODUTOS */}
      <div className="px-4 mt-3 space-y-2.5">
        <div className="flex items-baseline justify-between px-1">
          <p className="text-verde-700 text-xs font-semibold">
            {produtosFiltrados.length} produto{produtosFiltrados.length === 1 ? '' : 's'}
          </p>
          {fabricanteAtivo !== 'Todos' && (
            <button
              onClick={() => setFabricanteAtivo('Todos')}
              className="text-verde-600 text-xs underline"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="card text-center text-verde-500 py-10 text-sm">
            Nenhum produto encontrado.
          </div>
        )}

        {produtosFiltrados.map(produto => {
          const qtd = quantidadeNoCarrinho(produto.id)
          const info = extrairForma(produto.nome, produto.categoria)
          return (
            <div key={produto.id} className="card flex gap-3 items-stretch py-3.5">
              <button
                onClick={() => setProdutoDetalhe(produto)}
                className="flex-shrink-0 active:opacity-70 self-center"
                aria-label="Ver detalhes"
              >
                <ImgProduto produto={produto} />
              </button>

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setProdutoDetalhe(produto)}
              >
                <p className="font-bold text-verde-900 text-sm leading-tight line-clamp-2">
                  {produto.nome}
                </p>
                <div className="mt-1 space-y-0.5">
                  {produto.fabricante && (
                    <p className="text-xs leading-snug">
                      <span className="text-verde-500">Laboratório: </span>
                      <span className="text-verde-700 font-semibold">{produto.fabricante}</span>
                    </p>
                  )}
                  {produto.codigo_barras && (
                    <p className="text-xs leading-snug">
                      <span className="text-verde-500">EAN: </span>
                      <span className="text-verde-700 font-mono">{produto.codigo_barras}</span>
                    </p>
                  )}
                </div>
                <div className="border-t border-dashed border-verde-200 my-2" />
                <p className="text-xs flex items-center gap-1.5 text-verde-700">
                  <IconForma tipo={info.icon} className="text-verde-600" />
                  <span className="font-medium">{info.forma}</span>
                </p>
                {info.embalagem && (
                  <p className="text-[11px] text-verde-400 mt-0.5">{info.embalagem}</p>
                )}
              </div>

              <div className="flex-shrink-0 self-center">
                <ControleQtd
                  qtd={qtd}
                  onMenos={() => alterarQuantidade(produto, -1)}
                  onMais={() => alterarQuantidade(produto, 1)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* BARRA INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-verde-200 px-4 py-3 z-30 shadow-2xl flex items-center gap-3">
        <div className="flex-shrink-0">
          <p className="text-verde-500 text-[11px]">Itens selecionados</p>
          <p className="text-verde-900 font-bold text-lg leading-tight">
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <button
          onClick={() => setRevisao(true)}
          disabled={periodo === 'encerrado' || totalItens === 0}
          className="flex-1 btn-verde flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="font-semibold">Revisar Solicitação</span>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
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
          onSelecionar={setFabricanteAtivo}
          onFechar={() => setModalLab(false)}
        />
      )}
    </div>
  )
}
