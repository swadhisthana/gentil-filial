'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Produto, Usuario } from '@/lib/supabase'

type Aba = 'dashboard' | 'farmaceuticos' | 'produtos'

const FILIAIS = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, nome: `FILIAL ${i + 1}` }))
const CATEGORIAS = ['medicamento', 'Perfumaria'] as const

type Stats = {
  totalProdutos: number
  semImagem: number
  totalFarma: number
  solHoje: number
  solPendentes: number
}

function StatCard({ titulo, valor, sub, cor }: { titulo: string; valor: number | string; sub?: string; cor?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-verde-100 shadow-sm p-4">
      <p className="text-verde-500 text-xs font-medium">{titulo}</p>
      <p className={`text-3xl font-extrabold mt-1 ${cor || 'text-verde-900'}`}>{valor}</p>
      {sub && <p className="text-gray-400 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('dashboard')
  const [carregando, setCarregando] = useState(true)

  // Farmacêuticos
  const [farmaceuticos, setFarmaceuticos] = useState<Usuario[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novaFilial, setNovaFilial] = useState('1')
  const [novoCrf, setNovoCrf] = useState('')
  const [novoTurno, setNovoTurno] = useState<'manha' | 'noite'>('manha')
  const [editandoFarma, setEditandoFarma] = useState<Usuario | null>(null)
  const [salvandoFarma, setSalvandoFarma] = useState(false)
  const [buscaFarma, setBuscaFarma] = useState('')

  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [novoProduto, setNovoProduto] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<'medicamento' | 'Perfumaria'>('medicamento')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [editandoProd, setEditandoProd] = useState<Produto | null>(null)
  const [salvandoProd, setSalvandoProd] = useState(false)
  const [limiteVisivel, setLimiteVisivel] = useState(50)
  const [buscandoProd, setBuscandoProd] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dashboard
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregandoStats, setCarregandoStats] = useState(false)

  const carregarFarmaceuticos = useCallback(async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*, filial:filiais(id, nome)')
      .eq('tipo', 'farmaceutico')
      .order('nome')
    if (data) setFarmaceuticos(data as Usuario[])
  }, [])

  const carregarProdutos = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, categoria, fabricante, codigo_barras, imagem_url')
      .order('nome')
      .limit(500)
    if (data) setProdutos(data)
  }, [])

  const carregarStats = useCallback(async () => {
    setCarregandoStats(true)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeIso = hoje.toISOString()

    try {
      const [
        { count: total },
        { count: semImg },
        { count: totalFarma },
        { count: solHoje },
        { count: solPend },
      ] = await Promise.all([
        supabase.from('produtos').select('*', { count: 'exact', head: true }),
        supabase.from('produtos').select('*', { count: 'exact', head: true }).is('imagem_url', null),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('tipo', 'farmaceutico'),
        supabase.from('solicitacoes').select('*', { count: 'exact', head: true }).gte('criado_em', hojeIso),
        supabase.from('solicitacoes').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      ])
      setStats({
        totalProdutos: total ?? 0,
        semImagem: semImg ?? 0,
        totalFarma: totalFarma ?? 0,
        solHoje: solHoje ?? 0,
        solPendentes: solPend ?? 0,
      })
    } catch { /* silencia erros de stats */ }
    setCarregandoStats(false)
  }, [])

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u = JSON.parse(dados)
    if (u.tipo !== 'gestor') { router.push('/'); return }
    Promise.all([carregarFarmaceuticos(), carregarProdutos(), carregarStats()])
      .finally(() => setCarregando(false))
  }, [router, carregarFarmaceuticos, carregarProdutos, carregarStats])

  // ── Busca server-side de produtos (debounce 400ms) ─────────────────────────
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (filtroBusca.trim().length >= 2) {
      setBuscandoProd(true)
      searchTimerRef.current = setTimeout(async () => {
        let q = supabase
          .from('produtos')
          .select('id, nome, categoria, fabricante, codigo_barras, imagem_url')
          .ilike('nome', `%${filtroBusca.trim()}%`)
          .order('nome')
          .limit(200)
        if (filtroCategoria !== 'todos') {
          q = q.eq('categoria', filtroCategoria as 'medicamento' | 'Perfumaria')
        }
        const { data } = await q
        if (data) { setProdutos(data); setLimiteVisivel(200) }
        setBuscandoProd(false)
      }, 400)
    } else if (filtroBusca.trim().length === 0) {
      setLimiteVisivel(50)
      carregarProdutos()
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [filtroBusca, filtroCategoria, carregarProdutos])

  // ── FARMACÊUTICOS ──────────────────────────────────────────────────────────
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
      crf: novoCrf.trim() || null,
      turno: novoTurno,
    })
    setNovoNome(''); setNovaFilial('1'); setNovoCrf(''); setNovoTurno('manha')
    await carregarFarmaceuticos()
    setSalvandoFarma(false)
  }

  async function salvarFarmaceutico() {
    if (!editandoFarma) return
    setSalvandoFarma(true)
    await supabase.from('usuarios').update({
      nome: editandoFarma.nome,
      filial_id: editandoFarma.filial_id,
      crf: editandoFarma.crf || null,
      turno: editandoFarma.turno || 'manha',
    }).eq('id', editandoFarma.id)
    setEditandoFarma(null)
    await carregarFarmaceuticos()
    setSalvandoFarma(false)
  }

  async function excluirFarmaceutico(id: number) {
    if (!confirm('Excluir este farmacêutico? Esta ação não pode ser desfeita.')) return
    await supabase.from('usuarios').delete().eq('id', id)
    await carregarFarmaceuticos()
  }

  // ── PRODUTOS ──────────────────────────────────────────────────────────────
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

  const produtosFiltrados = filtroBusca.trim().length >= 2
    ? produtos // já veio filtrado do server
    : produtos.filter(p => {
        const catOk = filtroCategoria === 'todos' || p.categoria === filtroCategoria
        return catOk
      })
  const produtosVisiveis = produtosFiltrados.slice(0, limiteVisivel)

  const farmasFiltrados = farmaceuticos.filter(f =>
    !buscaFarma || f.nome.toLowerCase().includes(buscaFarma.toLowerCase())
  )

  if (carregando) {
    return (
      <div className="min-h-screen bg-verde-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-verde-200 border-t-verde-700 rounded-full animate-spin" />
          <p className="text-verde-700 text-sm font-medium">Carregando painel...</p>
        </div>
      </div>
    )
  }

  const pctImagem = stats ? Math.round(((stats.totalProdutos - stats.semImagem) / stats.totalProdutos) * 100) : 0

  return (
    <div className="min-h-screen bg-verde-50 pb-10">
      {/* Header */}
      <header className="bg-verde-900 text-white px-4 pt-4 pb-3 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.push('/gestor')}
            className="w-9 h-9 rounded-full bg-verde-800 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Voltar"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">Administração</h1>
            <p className="text-verde-300 text-[11px]">Gestão de usuários, produtos e métricas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {([
            ['dashboard', 'Dashboard'],
            ['farmaceuticos', `Solicitantes (${farmaceuticos.length})`],
            ['produtos', `Produtos`],
          ] as [Aba, string][]).map(([a, label]) => (
            <button key={a} onClick={() => setAba(a)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                aba === a ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200 hover:bg-verde-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 mt-4 space-y-3">

        {/* ── ABA DASHBOARD ────────────────────────────────────────────────── */}
        {aba === 'dashboard' && (
          <div className="space-y-4">
            {carregandoStats ? (
              <div className="flex justify-center py-10">
                <div className="w-10 h-10 border-4 border-verde-200 border-t-verde-700 rounded-full animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Imagens */}
                <div className="bg-white rounded-2xl border border-verde-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-verde-800 font-semibold text-sm">Cobertura de Imagens</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctImagem >= 80 ? 'bg-verde-100 text-verde-800' : pctImagem >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>
                      {pctImagem}%
                    </span>
                  </div>
                  <div className="w-full bg-verde-100 rounded-full h-3 mb-2">
                    <div
                      className="bg-verde-600 h-3 rounded-full transition-all"
                      style={{ width: `${pctImagem}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{(stats.totalProdutos - stats.semImagem).toLocaleString('pt-BR')} com imagem</span>
                    <span className="text-red-500 font-medium">{stats.semImagem.toLocaleString('pt-BR')} sem imagem</span>
                  </div>
                  <p className="text-gray-400 text-[11px] mt-2">
                    Para preencher: <code className="bg-gray-100 px-1 rounded text-[10px]">python buscar_imagens_v3.py</code>
                  </p>
                </div>

                {/* Grid de stats */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard titulo="Total de Produtos" valor={stats.totalProdutos.toLocaleString('pt-BR')} sub="no catálogo" />
                  <StatCard titulo="Solicitantes" valor={stats.totalFarma} sub="cadastrados" />
                  <StatCard titulo="Solicitações Hoje" valor={stats.solHoje} sub="desde meia-noite" cor="text-blue-700" />
                  <StatCard titulo="Pendentes Agora" valor={stats.solPendentes} sub="aguardando separação" cor={stats.solPendentes > 0 ? 'text-amber-600' : 'text-verde-700'} />
                </div>

                {/* Quick actions */}
                <div className="bg-white rounded-2xl border border-verde-100 shadow-sm p-4">
                  <p className="text-verde-800 font-semibold text-sm mb-3">Ações Rápidas</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setAba('farmaceuticos')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-verde-50 border border-verde-100 text-left active:bg-verde-100 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-verde-100 flex items-center justify-center flex-shrink-0">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-verde-900 font-semibold text-sm">Gerenciar Solicitantes</p>
                        <p className="text-verde-500 text-xs">{stats.totalFarma} cadastrados</p>
                      </div>
                      <svg className="ml-auto text-verde-400" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>

                    <button
                      onClick={() => setAba('produtos')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-verde-50 border border-verde-100 text-left active:bg-verde-100 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-verde-100 flex items-center justify-center flex-shrink-0">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-verde-900 font-semibold text-sm">Catálogo de Produtos</p>
                        <p className="text-verde-500 text-xs">{stats.totalProdutos.toLocaleString('pt-BR')} produtos · {stats.semImagem} sem imagem</p>
                      </div>
                      <svg className="ml-auto text-verde-400" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>

                    <button
                      onClick={() => router.push('/gestor')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-verde-50 border border-verde-100 text-left active:bg-verde-100 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-verde-100 flex items-center justify-center flex-shrink-0">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-verde-900 font-semibold text-sm">Ver Solicitações</p>
                        <p className="text-verde-500 text-xs">{stats.solPendentes > 0 ? `${stats.solPendentes} pendente${stats.solPendentes > 1 ? 's' : ''}` : 'Nenhuma pendente'}</p>
                      </div>
                      <svg className="ml-auto text-verde-400" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  onClick={carregarStats}
                  className="btn-branco w-full text-xs"
                >
                  Atualizar métricas
                </button>
              </>
            ) : (
              <div className="card text-center text-verde-500 py-8">Erro ao carregar métricas.</div>
            )}
          </div>
        )}

        {/* ── ABA FARMACÊUTICOS ────────────────────────────────────────────── */}
        {aba === 'farmaceuticos' && (
          <>
            {/* Formulário de adição */}
            <div className="card">
              <p className="text-verde-800 font-semibold mb-3 flex items-center gap-2">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Novo Solicitante
              </p>
              <div className="space-y-2">
                <input type="text" placeholder="Nome completo" value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarFarmaceutico()}
                  className="input-field" />
                <input type="text" placeholder="CRF (opcional)" value={novoCrf}
                  onChange={e => setNovoCrf(e.target.value)} className="input-field" />
                <select value={novaFilial} onChange={e => setNovaFilial(e.target.value)} className="input-field">
                  {FILIAIS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <div className="flex gap-2">
                  {(['manha', 'noite'] as const).map(t => (
                    <button key={t} onClick={() => setNovoTurno(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border-2 ${
                        novoTurno === t
                          ? t === 'manha' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-indigo-100 border-indigo-400 text-indigo-800'
                          : 'bg-white border-verde-200 text-verde-600'
                      }`}>
                      {t === 'manha' ? '🌅 Manhã' : '🌙 Noite'}
                    </button>
                  ))}
                </div>
                <button onClick={adicionarFarmaceutico} disabled={!novoNome.trim() || salvandoFarma}
                  className="btn-verde w-full disabled:opacity-40">
                  {salvandoFarma ? 'Salvando...' : 'Adicionar Solicitante'}
                </button>
              </div>
            </div>

            {/* Busca de farmacêuticos */}
            {farmaceuticos.length > 5 && (
              <input type="search" placeholder="Buscar solicitante..." value={buscaFarma}
                onChange={e => setBuscaFarma(e.target.value)}
                className="input-field" />
            )}

            <p className="text-verde-500 text-xs px-1">{farmasFiltrados.length} solicitante{farmasFiltrados.length !== 1 ? 's' : ''}</p>

            {/* Lista */}
            {farmasFiltrados.map(f => (
              <div key={f.id} className="card">
                {editandoFarma?.id === f.id ? (
                  <div className="space-y-2">
                    <input value={editandoFarma.nome}
                      onChange={e => setEditandoFarma({ ...editandoFarma, nome: e.target.value })}
                      className="input-field" placeholder="Nome completo" />
                    <input value={editandoFarma.crf ?? ''}
                      onChange={e => setEditandoFarma({ ...editandoFarma, crf: e.target.value })}
                      className="input-field" placeholder="CRF (opcional)" />
                    <select value={editandoFarma.filial_id ?? 1}
                      onChange={e => setEditandoFarma({ ...editandoFarma, filial_id: Number(e.target.value) })}
                      className="input-field">
                      {FILIAIS.map(f2 => <option key={f2.id} value={f2.id}>{f2.nome}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {(['manha', 'noite'] as const).map(t => (
                        <button key={t} onClick={() => setEditandoFarma({ ...editandoFarma, turno: t })}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border-2 ${
                            editandoFarma.turno === t
                              ? t === 'manha' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-indigo-100 border-indigo-400 text-indigo-800'
                              : 'bg-white border-verde-200 text-verde-500'
                          }`}>
                          {t === 'manha' ? '🌅 Manhã' : '🌙 Noite'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={salvarFarmaceutico} disabled={salvandoFarma}
                        className="btn-verde flex-1 disabled:opacity-40">Salvar</button>
                      <button onClick={() => setEditandoFarma(null)} className="btn-branco flex-1">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-verde-900 truncate">{f.nome}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-verde-500 text-xs">{f.filial?.nome ?? '—'}</p>
                        {f.crf && <span className="text-blue-600 text-xs font-mono">CRF {f.crf}</span>}
                        {f.turno && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            f.turno === 'manha' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {f.turno === 'manha' ? '🌅 Manhã' : '🌙 Noite'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setEditandoFarma(f)}
                        className="text-verde-700 text-xs border border-verde-200 rounded-xl px-3 py-2 active:bg-verde-50">
                        Editar
                      </button>
                      <button onClick={() => excluirFarmaceutico(f.id)}
                        className="text-red-500 text-xs border border-red-200 rounded-xl px-3 py-2 active:bg-red-50">
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {farmasFiltrados.length === 0 && (
              <div className="card text-center text-verde-500 py-8 text-sm">
                {buscaFarma ? 'Nenhum resultado.' : 'Nenhum solicitante cadastrado.'}
              </div>
            )}
          </>
        )}

        {/* ── ABA PRODUTOS ─────────────────────────────────────────────────── */}
        {aba === 'produtos' && (
          <>
            {/* Formulário de adição */}
            <div className="card">
              <p className="text-verde-800 font-semibold mb-3 flex items-center gap-2">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Novo Produto
              </p>
              <div className="space-y-2">
                <input type="text" placeholder="Nome do produto (title case)"
                  value={novoProduto} onChange={e => setNovoProduto(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarProduto()}
                  className="input-field" />
                <select value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value as typeof novaCategoria)}
                  className="input-field">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <button onClick={adicionarProduto} disabled={!novoProduto.trim() || salvandoProd}
                  className="btn-verde w-full disabled:opacity-40">
                  {salvandoProd ? 'Salvando...' : 'Adicionar Produto'}
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {['todos', ...CATEGORIAS].map(c => (
                <button key={c} onClick={() => { setFiltroCategoria(c); setLimiteVisivel(50) }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filtroCategoria === c ? 'bg-verde-800 text-white' : 'bg-white text-verde-700 border border-verde-200'
                  }`}>
                  {c === 'todos' ? 'Todos' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>

            {/* Busca server-side */}
            <div className="relative">
              <input type="search" placeholder="Buscar produto (mín. 2 caracteres)..."
                value={filtroBusca}
                onChange={e => { setFiltroBusca(e.target.value); setLimiteVisivel(50) }}
                className="input-field pr-10" />
              {buscandoProd && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-verde-300 border-t-verde-700 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {filtroBusca.trim().length >= 2 && (
              <p className="text-verde-500 text-xs px-1">
                Busca no banco inteiro — {produtosFiltrados.length} resultado{produtosFiltrados.length !== 1 ? 's' : ''}
              </p>
            )}

            <div className="flex items-center justify-between px-1">
              <p className="text-verde-500 text-xs">
                {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
                {produtosFiltrados.length > limiteVisivel ? ` · mostrando ${limiteVisivel}` : ''}
              </p>
              {filtroBusca.length === 0 && filtroCategoria === 'todos' && stats && (
                <p className="text-xs text-gray-400">
                  <span className="text-verde-600 font-medium">{stats.totalProdutos - stats.semImagem}</span> com imagem ·{' '}
                  <span className="text-red-500 font-medium">{stats.semImagem}</span> sem
                </p>
              )}
            </div>

            {/* Lista de produtos */}
            {produtosVisiveis.map(p => (
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
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Indicador de imagem */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.imagem_url ? 'bg-verde-500' : 'bg-gray-300'}`}
                        title={p.imagem_url ? 'Tem imagem' : 'Sem imagem'}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-verde-900 text-sm truncate">{p.nome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`categoria-${p.categoria} inline-block`}>{p.categoria}</span>
                          {p.fabricante && (
                            <span className="text-gray-400 text-[10px]">{p.fabricante}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setEditandoProd(p)}
                        className="text-verde-700 text-xs border border-verde-200 rounded-xl px-3 py-2 active:bg-verde-50">
                        Editar
                      </button>
                      <button onClick={() => excluirProduto(p.id)}
                        className="text-red-500 text-xs border border-red-200 rounded-xl px-3 py-2 active:bg-red-50">
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {produtosFiltrados.length === 0 && !buscandoProd && (
              <div className="card text-center text-verde-500 py-8 text-sm">
                {filtroBusca ? `Nenhum produto encontrado para "${filtroBusca}"` : 'Nenhum produto.'}
              </div>
            )}

            {/* Carregar mais */}
            {produtosFiltrados.length > limiteVisivel && (
              <button onClick={() => setLimiteVisivel(v => v + 50)} className="btn-branco w-full text-sm">
                Carregar mais ({produtosFiltrados.length - limiteVisivel} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
