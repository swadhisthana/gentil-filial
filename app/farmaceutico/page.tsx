'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'

type ItemCarrinho = {
  produto: Produto
  quantidade: number
}

const CATEGORIAS = ['medicamento', 'cosmético', 'alimento'] as const
const LABELS_CATEGORIA: Record<string, string> = {
  medicamento: 'Medicamentos',
  cosmético: 'Cosméticos',
  alimento: 'Alimentos',
}

export default function FarmaceuticoPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('medicamento')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u: Usuario = JSON.parse(dados)
    if (u.tipo !== 'farmaceutico') { router.push('/gestor'); return }
    setUsuario(u)
    carregarProdutos()
  }, [router])

  const carregarProdutos = useCallback(async () => {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
    setCarregando(false)
  }, [])

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

  const produtosFiltrados = produtos.filter(p => {
    const matchCategoria = p.categoria === categoriaAtiva
    const matchBusca = busca === '' || p.nome.toLowerCase().includes(busca.toLowerCase())
    return matchCategoria && matchBusca
  })

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
      {/* Header */}
      <header className="bg-verde-900 text-white px-4 pt-safe pb-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold">💊 Gentil Filial</h1>
            <p className="text-verde-200 text-xs">
              {usuario?.filial?.nome} · {usuario?.nome}
            </p>
          </div>
          <button onClick={sair} className="text-verde-300 text-sm underline">Sair</button>
        </div>

        {/* Busca */}
        <input
          type="search"
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full mt-3 px-4 py-2 rounded-xl bg-verde-800 text-white placeholder-verde-400 border border-verde-700 focus:outline-none focus:border-verde-400 text-sm"
        />

        {/* Abas de categoria */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategoriaAtiva(cat); setBusca('') }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                categoriaAtiva === cat
                  ? 'bg-white text-verde-900'
                  : 'bg-verde-800 text-verde-200'
              }`}
            >
              {LABELS_CATEGORIA[cat]}
            </button>
          ))}
        </div>
      </header>

      {/* Sucesso */}
      {sucesso && (
        <div className="mx-4 mt-4 bg-verde-100 border border-verde-400 text-verde-800 rounded-xl px-4 py-3 text-sm font-medium text-center">
          ✅ Solicitação enviada com sucesso!
        </div>
      )}

      {/* Lista de Produtos */}
      <div className="px-4 mt-4 space-y-2">
        <p className="text-verde-700 text-xs font-medium uppercase tracking-wide">
          {LABELS_CATEGORIA[categoriaAtiva]} ({produtosFiltrados.length})
        </p>

        {produtosFiltrados.length === 0 && (
          <div className="card text-center text-verde-600 py-8">
            Nenhum produto encontrado.
          </div>
        )}

        {produtosFiltrados.map(produto => {
          const qtd = quantidadeNoCarrinho(produto.id)
          return (
            <div key={produto.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-verde-900 font-medium text-sm leading-tight">{produto.nome}</p>
                <span className={`categoria-${produto.categoria} mt-1 inline-block`}>
                  {produto.categoria}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {qtd > 0 ? (
                  <>
                    <button
                      onClick={() => alterarQuantidade(produto, -1)}
                      className="w-8 h-8 rounded-full bg-verde-100 text-verde-800 font-bold flex items-center justify-center text-lg leading-none"
                    >−</button>
                    <span className="w-6 text-center font-bold text-verde-900">{qtd}</span>
                    <button
                      onClick={() => alterarQuantidade(produto, 1)}
                      className="w-8 h-8 rounded-full bg-verde-800 text-white font-bold flex items-center justify-center text-lg leading-none"
                    >+</button>
                  </>
                ) : (
                  <button
                    onClick={() => alterarQuantidade(produto, 1)}
                    className="w-8 h-8 rounded-full bg-verde-800 text-white font-bold flex items-center justify-center text-lg leading-none"
                  >+</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra inferior fixa */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-verde-200 px-4 py-4 z-30 shadow-2xl">
          <div className="mb-3 max-h-32 overflow-y-auto space-y-1">
            {carrinho.map(item => (
              <div key={item.produto.id} className="flex justify-between text-sm">
                <span className="text-verde-800 truncate flex-1">{item.produto.nome}</span>
                <span className="text-verde-900 font-bold ml-2">× {item.quantidade}</span>
              </div>
            ))}
          </div>

          {erro && (
            <p className="text-red-600 text-xs mb-2 text-center">{erro}</p>
          )}

          <button
            onClick={enviarSolicitacao}
            disabled={enviando}
            className="btn-verde w-full text-center disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : `Enviar Solicitação (${totalItens} itens)`}
          </button>
        </div>
      )}
    </div>
  )
}
