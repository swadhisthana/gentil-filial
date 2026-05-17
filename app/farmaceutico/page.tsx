'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

type Periodo = 'manha' | 'noite' | 'encerrado'

const CATEGORIAS = ['medicamento', 'cosmético', 'alimento'] as const
const LABELS_CATEGORIA: Record<string, string> = {
  medicamento: 'Medicamentos',
  cosmético: 'Cosméticos',
  alimento: 'Alimentos',
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

function PeriodoBadge({ periodo }: { periodo: Periodo }) {
  if (periodo === 'manha') return (
    <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
      🌅 Manhã <span className="opacity-70 font-normal">até 11h</span>
    </span>
  )
  if (periodo === 'noite') return (
    <span className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full">
      🌙 Noite <span className="opacity-70 font-normal">até 20h</span>
    </span>
  )
  return (
    <span className="flex items-center gap-1 bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
      🔒 Encerrado
    </span>
  )
}

// Barcode visual SVG (simplified EAN representation)
function BarcodeVisual({ ean }: { ean: string }) {
  if (!ean || ean.length < 8) return <p className="font-mono text-lg tracking-widest text-verde-900">{ean}</p>

  // Generate bars from digits
  const patterns: Record<string, string> = {
    '0': '11010011100', '1': '11011001100', '2': '11011100110',
    '3': '10010110011', '4': '10011011001', '5': '10110011001',
    '6': '10011100110', '7': '10111001001', '8': '10001101001',
    '9': '10110001101',
  }
  const bars: { dark: boolean; wide: boolean }[] = []
  const code = ean.replace(/\D/g, '').slice(0, 13)

  // Start guard
  for (const b of [1,0,1]) bars.push({ dark: b === 1, wide: false })

  for (let i = 0; i < Math.min(code.length, 12); i++) {
    const p = patterns[code[i]] || '11010011100'
    for (const c of p) bars.push({ dark: c === '1', wide: false })
    if (i === 5) {
      // Middle guard
      for (const b of [0,1,0,1,0]) bars.push({ dark: b === 1, wide: false })
    }
  }

  // End guard
  for (const b of [1,0,1]) bars.push({ dark: b === 1, wide: false })

  const barWidth = 2
  const totalWidth = bars.length * barWidth
  const height = 52

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="max-w-[220px]"
        style={{ display: 'block' }}
      >
        {bars.map((b, i) =>
          b.dark ? (
            <rect key={i} x={i * barWidth} y={0} width={barWidth} height={height} fill="#111" />
          ) : null
        )}
      </svg>
      <p className="font-mono text-sm tracking-widest text-verde-900">{ean}</p>
    </div>
  )
}

// Modal de detalhe do produto
function ModalProduto({
  produto,
  qtdCarrinho,
  onFechar,
  onAdicionar,
  onRemover,
}: {
  produto: Produto
  qtdCarrinho: number
  onFechar: () => void
  onAdicionar: () => void
  onRemover: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onFechar}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Categoria */}
        <span className={`categoria-${produto.categoria} mb-3 inline-block`}>
          {produto.categoria}
        </span>

        {/* Nome */}
        <h2 className="text-xl font-bold text-verde-900 leading-tight mb-1">
          {produto.nome}
        </h2>

        {/* Fabricante */}
        {produto.fabricante && (
          <p className="text-verde-600 text-sm mb-4">
            🏭 {produto.fabricante}
          </p>
        )}

        {/* Barcode */}
        {produto.codigo_barras && (
          <div className="flex flex-col items-center py-4 border-y border-verde-100 my-4">
            <BarcodeVisual ean={produto.codigo_barras} />
          </div>
        )}

        {/* Controles */}
        <div className="mt-4">
          {qtdCarrinho > 0 ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onRemover}
                  className="w-11 h-11 rounded-full bg-verde-100 text-verde-800 font-bold text-xl flex items-center justify-center active:scale-90 transition-transform"
                >−</button>
                <span className="text-2xl font-bold text-verde-900 w-8 text-center">{qtdCarrinho}</span>
                <button
                  onClick={onAdicionar}
                  className="w-11 h-11 rounded-full bg-verde-800 text-white font-bold text-xl flex items-center justify-center active:scale-90 transition-transform"
                >+</button>
              </div>
              <span className="text-verde-700 text-sm font-medium">no carrinho</span>
            </div>
          ) : (
            <button
              onClick={onAdicionar}
              className="btn-verde w-full text-center"
            >
              + Adicionar ao Carrinho
            </button>
          )}
        </div>
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

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u: Usuario = JSON.parse(dados)
    if (u.tipo !== 'farmaceutico') { router.push('/gestor'); return }
    setUsuario(u)
    carregarProdutos()
    setPeriodo(getPeriodoAtual())
    // Atualiza período a cada minuto
    const timer = setInterval(() => setPeriodo(getPeriodoAtual()), 60_000)
    return () => clearInterval(timer)
  }, [router])

  const carregarProdutos = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, categoria, fabricante, codigo_barras')
      .order('nome')
    if (data) setProdutos(data as Produto[])
    setCarregando(false)
  }, [])

  // Lista de fabricantes da categoria ativa
  const fabricantes = useMemo(() => {
    const set = new Set<string>()
    produtos
      .filter(p => p.categoria === categoriaAtiva)
      .forEach(p => { if (p.fabricante) set.add(p.fabricante) })
    return ['Todos', ...Array.from(set).sort()]
  }, [produtos, categoriaAtiva])

  // Reset fabricante ao trocar categoria
  useEffect(() => {
    setFabricanteAtivo('Todos')
  }, [categoriaAtiva])

  function sair() {
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

  async function enviarSolicitacao() {
    if (carrinho.length === 0) { setErro('Adicione ao menos um produto.'); return }
    if (!usuario) return
    if (periodo === 'encerrado') { setErro('Período encerrado. Solicitações até as 20h.'); return }
    setEnviando(true)
    setErro('')

    try {
      const { data: sol, error: solError } = await supabase
        .from('solicitacoes')
        .insert({
          filial_id: usuario.filial_id,
          farmaceutico_id: usuario.id,
          status: 'pendente',
        })
        .select()
        .single()

      if (solError || !sol) throw new Error('Erro ao criar solicitação')

      const itens = carrinho.map(i => ({
        solicitacao_id: sol.id,
        produto_id: i.produto.id,
        quantidade: i.quantidade,
      }))

      const { error: itensError } = await supabase.from('itens_solicitacao').insert(itens)
      if (itensError) throw new Error('Erro ao inserir itens')

      setCarrinho([])
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
      const matchCategoria = p.categoria === categoriaAtiva
      const matchFabricante = fabricanteAtivo === 'Todos' || p.fabricante === fabricanteAtivo
      const matchBusca = busca === '' ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.fabricante || '').toLowerCase().includes(busca.toLowerCase()) ||
        (p.codigo_barras || '').includes(busca)
      return matchCategoria && matchFabricante && matchBusca
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
    <div className="min-h-screen bg-verde-50 pb-36">
      {/* Header */}
      <header className="bg-verde-900 text-white px-4 pt-safe pb-3 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold leading-tight">💊 Gentil Filial</h1>
            <p className="text-verde-300 text-xs">
              {usuario?.filial?.nome} · {usuario?.nome}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodoBadge periodo={periodo} />
            <button onClick={sair} className="text-verde-400 text-xs underline ml-1">Sair</button>
          </div>
        </div>

        {/* Busca */}
        <input
          type="search"
          placeholder="Buscar produto, fabricante ou código..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setFabricanteAtivo('Todos') }}
          className="w-full mt-1 px-4 py-2.5 rounded-xl bg-verde-800 text-white placeholder-verde-400 border border-verde-700 focus:outline-none focus:border-verde-400 text-sm"
        />

        {/* Abas de categoria */}
        <div className="flex gap-2 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategoriaAtiva(cat); setBusca('') }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                categoriaAtiva === cat
                  ? 'bg-white text-verde-900'
                  : 'bg-verde-800 text-verde-300'
              }`}
            >
              {LABELS_CATEGORIA[cat]}
            </button>
          ))}
        </div>

        {/* Filtro por fabricante */}
        {fabricantes.length > 2 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {fabricantes.map(fab => (
              <button
                key={fab}
                onClick={() => setFabricanteAtivo(fab)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  fabricanteAtivo === fab
                    ? 'bg-verde-400 text-verde-900'
                    : 'bg-verde-800/70 text-verde-300 border border-verde-700'
                }`}
              >
                {fab}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Alerta período encerrado */}
      {periodo === 'encerrado' && (
        <div className="mx-4 mt-4 bg-gray-100 border border-gray-300 text-gray-600 rounded-xl px-4 py-3 text-sm font-medium text-center">
          🔒 Período encerrado. Novas solicitações retornam amanhã.
        </div>
      )}

      {/* Sucesso */}
      {sucesso && (
        <div className="mx-4 mt-4 bg-verde-100 border border-verde-400 text-verde-800 rounded-xl px-4 py-3 text-sm font-medium text-center animate-pulse">
          ✅ Solicitação da {periodo === 'manha' ? 'manhã' : 'noite'} enviada!
        </div>
      )}

      {/* Lista de Produtos */}
      <div className="px-4 mt-3 space-y-2">
        <p className="text-verde-600 text-xs font-medium uppercase tracking-wide">
          {fabricanteAtivo !== 'Todos' ? fabricanteAtivo : LABELS_CATEGORIA[categoriaAtiva]}
          {' '}({produtosFiltrados.length})
        </p>

        {produtosFiltrados.length === 0 && (
          <div className="card text-center text-verde-500 py-8 text-sm">
            Nenhum produto encontrado.
          </div>
        )}

        {produtosFiltrados.map(produto => {
          const qtd = quantidadeNoCarrinho(produto.id)
          return (
            <div key={produto.id} className="card flex items-center gap-3 py-3">
              <div
                className="flex-1 min-w-0 cursor-pointer active:opacity-70 transition-opacity"
                onClick={() => setProdutoDetalhe(produto)}
              >
                <p className="text-verde-900 font-semibold text-sm leading-tight">{produto.nome}</p>
                {produto.fabricante && (
                  <p className="text-verde-500 text-xs mt-0.5 truncate">🏭 {produto.fabricante}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`categoria-${produto.categoria}`}>
                    {produto.categoria}
                  </span>
                  {produto.codigo_barras && (
                    <span className="text-gray-400 text-xs font-mono">{produto.codigo_barras}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {qtd > 0 ? (
                  <>
                    <button
                      onClick={() => alterarQuantidade(produto, -1)}
                      className="w-8 h-8 rounded-full bg-verde-100 text-verde-800 font-bold flex items-center justify-center text-xl leading-none active:scale-90 transition-transform"
                    >−</button>
                    <span className="w-6 text-center font-bold text-verde-900 text-sm">{qtd}</span>
                    <button
                      onClick={() => alterarQuantidade(produto, 1)}
                      className="w-8 h-8 rounded-full bg-verde-800 text-white font-bold flex items-center justify-center text-xl leading-none active:scale-90 transition-transform"
                    >+</button>
                  </>
                ) : (
                  <button
                    onClick={() => alterarQuantidade(produto, 1)}
                    className="w-8 h-8 rounded-full bg-verde-800 text-white font-bold flex items-center justify-center text-xl leading-none active:scale-90 transition-transform"
                  >+</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra inferior fixa */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-verde-200 px-4 py-3 z-30 shadow-2xl">
          <div className="mb-2 max-h-28 overflow-y-auto space-y-1">
            {carrinho.map(item => (
              <div key={item.produto.id} className="flex justify-between text-xs">
                <span className="text-verde-700 truncate flex-1">{item.produto.nome}</span>
                <span className="text-verde-900 font-bold ml-2">× {item.quantidade}</span>
              </div>
            ))}
          </div>

          {erro && (
            <p className="text-red-600 text-xs mb-2 text-center">{erro}</p>
          )}

          <button
            onClick={enviarSolicitacao}
            disabled={enviando || periodo === 'encerrado'}
            className="btn-verde w-full text-center disabled:opacity-60 text-sm"
          >
            {enviando
              ? 'Enviando...'
              : `Enviar Solicitação da ${periodo === 'manha' ? 'Manhã' : 'Noite'} (${totalItens} itens)`
            }
          </button>
        </div>
      )}

      {/* Modal de detalhe */}
      {produtoDetalhe && (
        <ModalProduto
          produto={produtoDetalhe}
          qtdCarrinho={quantidadeNoCarrinho(produtoDetalhe.id)}
          onFechar={() => setProdutoDetalhe(null)}
          onAdicionar={() => {
            alterarQuantidade(produtoDetalhe, 1)
          }}
          onRemover={() => {
            alterarQuantidade(produtoDetalhe, -1)
            if (quantidadeNoCarrinho(produtoDetalhe.id) <= 1) setProdutoDetalhe(null)
          }}
        />
      )}
    </div>
  )
}
