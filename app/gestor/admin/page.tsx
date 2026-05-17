'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'

type Aba = 'farmaceuticos' | 'produtos'

const FILIAIS = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, nome: `FILIAL ${i + 1}` }))
const CATEGORIAS = ['medicamento', 'cosmético', 'alimento'] as const

export default function AdminPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('farmaceuticos')

  // Farmacêuticos
  const [farmaceuticos, setFarmaceuticos] = useState<Usuario[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novaFilial, setNovaFilial] = useState('1')
  const [editandoFarma, setEditandoFarma] = useState<Usuario | null>(null)
  const [salvandoFarma, setSalvandoFarma] = useState(false)

  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [novoProduto, setNovoProduto] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<'medicamento' | 'cosmético' | 'alimento'>('medicamento')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [editandoProd, setEditandoProd] = useState<Produto | null>(null)
  const [salvandoProd, setSalvandoProd] = useState(false)

  const carregarFarmaceuticos = useCallback(async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*, filial:filiais(id, nome)')
      .eq('tipo', 'farmaceutico')
      .order('nome')
    if (data) setFarmaceuticos(data as Usuario[])
  }, [])

  const carregarProdutos = useCallback(async () => {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }, [])

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u = JSON.parse(dados)
    if (u.tipo !== 'gestor') { router.push('/'); return }
    carregarFarmaceuticos()
    carregarProdutos()
  }, [router, carregarFarmaceuticos, carregarProdutos])

  // ── FARMACÊUTICOS ──────────────────────────────────────
  async function adicionarFarmaceutico() {
    if (!novoNome.trim()) return
    setSalvandoFarma(true)
    const usuario = novoNome.trim().toLowerCase().replace(/\s+/g, '.')
    await supabase.from('usuarios').insert({
      nome: novoNome.trim(),
      usuario,
      senha: usuario,
      tipo: 'farmaceutico',
      filial_id: Number(novaFilial),
    })
    setNovoNome('')
    setNovaFilial('1')
    await carregarFarmaceuticos()
    setSalvandoFarma(false)
  }

  async function salvarFarmaceutico() {
    if (!editandoFarma) return
    setSalvandoFarma(true)
    await supabase.from('usuarios').update({
      nome: editandoFarma.nome,
      filial_id: editandoFarma.filial_id,
    }).eq('id', editandoFarma.id)
    setEditandoFarma(null)
    await carregarFarmaceuticos()
    setSalvandoFarma(false)
  }

  async function excluirFarmaceutico(id: number) {
    if (!confirm('Excluir este farmacêutico?')) return
    await supabase.from('usuarios').delete().eq('id', id)
    await carregarFarmaceuticos()
  }

  // ── PRODUTOS ──────────────────────────────────────────
  async function adicionarProduto() {
    if (!novoProduto.trim()) return
    setSalvandoProd(true)
    await supabase.from('produtos').insert({ nome: novoProduto.trim(), categoria: novaCategoria })
    setNovoProduto('')
    await carregarProdutos()
    setSalvandoProd(false)
  }

  async function salvarProduto() {
    if (!editandoProd) return
    setSalvandoProd(true)
    await supabase.from('produtos').update({
      nome: editandoProd.nome,
      categoria: editandoProd.categoria,
    }).eq('id', editandoProd.id)
    setEditandoProd(null)
    await carregarProdutos()
    setSalvandoProd(false)
  }

  async function excluirProduto(id: number) {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    await carregarProdutos()
  }

  const produtosFiltrados = produtos.filter(p => {
    const catOk = filtroCategoria === 'todos' || p.categoria === filtroCategoria
    const buscaOk = !filtroBusca || p.nome.toLowerCase().includes(filtroBusca.toLowerCase())
    return catOk && buscaOk
  })

  return (
    <div className="min-h-screen bg-verde-50 pb-10">
      {/* Header */}
      <header className="bg-verde-900 text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.push('/gestor')} className="text-verde-300 text-sm">← Voltar</button>
          <h1 className="text-lg font-bold">⚙️ Administração</h1>
        </div>
        <div className="flex gap-2">
          {(['farmaceuticos', 'produtos'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                aba === a ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200'
              }`}>
              {a === 'farmaceuticos' ? `👩‍⚕️ Farmacêuticos (${farmaceuticos.length})` : `💊 Produtos (${produtos.length})`}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">

        {/* ── ABA FARMACÊUTICOS ── */}
        {aba === 'farmaceuticos' && (
          <>
            {/* Formulário de adição */}
            <div className="card">
              <p className="text-verde-800 font-semibold mb-3">➕ Novo Farmacêutico</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarFarmaceutico()}
                  className="input-field"
                />
                <select value={novaFilial} onChange={e => setNovaFilial(e.target.value)} className="input-field">
                  {FILIAIS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <button onClick={adicionarFarmaceutico} disabled={!novoNome.trim() || salvandoFarma}
                  className="btn-verde w-full disabled:opacity-40">
                  {salvandoFarma ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Lista */}
            {farmaceuticos.map(f => (
              <div key={f.id} className="card">
                {editandoFarma?.id === f.id ? (
                  <div className="space-y-2">
                    <input
                      value={editandoFarma.nome}
                      onChange={e => setEditandoFarma({ ...editandoFarma, nome: e.target.value })}
                      className="input-field"
                    />
                    <select
                      value={editandoFarma.filial_id ?? 1}
                      onChange={e => setEditandoFarma({ ...editandoFarma, filial_id: Number(e.target.value) })}
                      className="input-field"
                    >
                      {FILIAIS.map(f2 => <option key={f2.id} value={f2.id}>{f2.nome}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={salvarFarmaceutico} disabled={salvandoFarma}
                        className="btn-verde flex-1 disabled:opacity-40">Salvar</button>
                      <button onClick={() => setEditandoFarma(null)} className="btn-branco flex-1">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-verde-900">{f.nome}</p>
                      <p className="text-verde-500 text-xs">{f.filial?.nome ?? '—'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditandoFarma(f)}
                        className="text-verde-700 text-xs border border-verde-300 rounded-lg px-3 py-1.5">✏️ Editar</button>
                      <button onClick={() => excluirFarmaceutico(f.id)}
                        className="text-red-600 text-xs border border-red-200 rounded-lg px-3 py-1.5">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── ABA PRODUTOS ── */}
        {aba === 'produtos' && (
          <>
            {/* Formulário de adição */}
            <div className="card">
              <p className="text-verde-800 font-semibold mb-3">➕ Novo Produto</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nome do produto"
                  value={novoProduto}
                  onChange={e => setNovoProduto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarProduto()}
                  className="input-field"
                />
                <select value={novaCategoria} onChange={e => setNovaCategoria(e.target.value as typeof novaCategoria)}
                  className="input-field">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <button onClick={adicionarProduto} disabled={!novoProduto.trim() || salvandoProd}
                  className="btn-verde w-full disabled:opacity-40">
                  {salvandoProd ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['todos', ...CATEGORIAS].map(c => (
                <button key={c} onClick={() => setFiltroCategoria(c)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filtroCategoria === c ? 'bg-verde-800 text-white' : 'bg-white text-verde-700 border border-verde-200'
                  }`}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <input type="search" placeholder="Buscar produto..." value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)} className="input-field" />

            <p className="text-verde-500 text-xs">{produtosFiltrados.length} produto(s)</p>

            {/* Lista */}
            {produtosFiltrados.map(p => (
              <div key={p.id} className="card">
                {editandoProd?.id === p.id ? (
                  <div className="space-y-2">
                    <input value={editandoProd.nome}
                      onChange={e => setEditandoProd({ ...editandoProd, nome: e.target.value })}
                      className="input-field" />
                    <select value={editandoProd.categoria}
                      onChange={e => setEditandoProd({ ...editandoProd, categoria: e.target.value as Produto['categoria'] })}
                      className="input-field">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={salvarProduto} disabled={salvandoProd}
                        className="btn-verde flex-1 disabled:opacity-40">Salvar</button>
                      <button onClick={() => setEditandoProd(null)} className="btn-branco flex-1">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-verde-900 text-sm">{p.nome}</p>
                      <span className={`categoria-${p.categoria} mt-0.5 inline-block`}>{p.categoria}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditandoProd(p)}
                        className="text-verde-700 text-xs border border-verde-300 rounded-lg px-3 py-1.5">✏️</button>
                      <button onClick={() => excluirProduto(p.id)}
                        className="text-red-600 text-xs border border-red-200 rounded-lg px-3 py-1.5">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
