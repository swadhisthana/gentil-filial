'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Solicitacao, ItemSolicitacao, Usuario } from '@/lib/supabase'

type Aba = 'pendentes' | 'historico'

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))
}

export default function GestorPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [aba, setAba] = useState<Aba>('pendentes')
  const [carregando, setCarregando] = useState(true)
  const [concluindo, setConcluindo] = useState<number | null>(null)
  const [expandido, setExpandido] = useState<number | null>(null)
  // estado local dos itens enquanto o estoquista trabalha
  const [itensEditados, setItensEditados] = useState<Record<number, { encontrado: boolean; quantidade_enviada: number }>>({})

  const carregarSolicitacoes = useCallback(async () => {
    const { data } = await supabase
      .from('solicitacoes')
      .select(`
        *,
        filial:filiais(id, nome),
        farmaceutico:usuarios(id, nome),
        itens:itens_solicitacao(
          id, quantidade, encontrado, quantidade_enviada,
          produto:produtos(id, nome, categoria)
        )
      `)
      .order('criado_em', { ascending: false })

    if (data) setSolicitacoes(data as Solicitacao[])
    setCarregando(false)
  }, [])

  useEffect(() => {
    const dados = localStorage.getItem('gf_usuario')
    if (!dados) { router.push('/'); return }
    const u: Usuario = JSON.parse(dados)
    if (u.tipo !== 'gestor') { router.push('/farmaceutico'); return }
    setUsuario(u)
    carregarSolicitacoes()
  }, [router, carregarSolicitacoes])

  useEffect(() => {
    const channel = supabase
      .channel('solicitacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        carregarSolicitacoes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [carregarSolicitacoes])

  // Ao expandir uma solicitação, inicializa o estado local dos itens
  function handleExpandir(sol: Solicitacao) {
    const novoId = expandido === sol.id ? null : sol.id
    setExpandido(novoId)
    if (novoId && sol.itens) {
      const inicial: Record<number, { encontrado: boolean; quantidade_enviada: number }> = {}
      sol.itens.forEach(item => {
        inicial[item.id] = {
          encontrado: item.encontrado ?? false,
          quantidade_enviada: item.quantidade_enviada ?? item.quantidade,
        }
      })
      setItensEditados(prev => ({ ...prev, ...inicial }))
    }
  }

  function toggleEncontrado(itemId: number) {
    setItensEditados(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], encontrado: !prev[itemId]?.encontrado },
    }))
  }

  function alterarQtdEnviada(itemId: number, valor: string) {
    const num = Math.max(0, parseInt(valor) || 0)
    setItensEditados(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantidade_enviada: num },
    }))
  }

  async function marcarConcluido(sol: Solicitacao) {
    setConcluindo(sol.id)

    // Salva encontrado e quantidade_enviada de cada item
    if (sol.itens) {
      for (const item of sol.itens) {
        const estado = itensEditados[item.id]
        if (estado) {
          await supabase.from('itens_solicitacao').update({
            encontrado: estado.encontrado,
            quantidade_enviada: estado.quantidade_enviada,
          }).eq('id', item.id)
        }
      }
    }

    await supabase.from('solicitacoes').update({
      status: 'concluido',
      concluido_em: new Date().toISOString(),
    }).eq('id', sol.id)

    await carregarSolicitacoes()
    setExpandido(null)
    setConcluindo(null)
  }

  function sair() {
    localStorage.removeItem('gf_usuario')
    router.push('/')
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente')
  const historico = solicitacoes.filter(s => s.status === 'concluido')
  const lista = aba === 'pendentes' ? pendentes : historico

  return (
    <div className="min-h-screen bg-verde-50">
      {/* Header */}
      <header className="bg-verde-900 text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">💊 Gentil Filial</h1>
            <p className="text-verde-200 text-xs">Painel do Estoquista · {usuario?.nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/gestor/admin')} className="text-verde-300 text-sm">⚙️ Admin</button>
            <button onClick={sair} className="text-verde-300 text-sm underline">Sair</button>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => setAba('pendentes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${aba === 'pendentes' ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200'}`}>
            Solicitações
            {pendentes.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {pendentes.length}
              </span>
            )}
          </button>
          <button onClick={() => setAba('historico')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${aba === 'historico' ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200'}`}>
            Histórico ({historico.length})
          </button>
        </div>
      </header>

      {aba === 'pendentes' && pendentes.length > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-amber-500 text-lg">🔔</span>
          <p className="text-amber-800 text-sm font-medium">
            {pendentes.length} solicitaç{pendentes.length === 1 ? 'ão pendente' : 'ões pendentes'}
          </p>
        </div>
      )}

      <div className="px-4 mt-4 pb-8 space-y-3">
        {carregando && <div className="text-verde-600 text-center py-8">Carregando...</div>}

        {!carregando && lista.length === 0 && (
          <div className="card text-center text-verde-600 py-10">
            {aba === 'pendentes' ? 'Nenhuma solicitação pendente.' : 'Nenhum histórico ainda.'}
          </div>
        )}

        {lista.map(sol => {
          const itens = sol.itens ?? []
          const totalItens = itens.length
          const encontrados = aba === 'pendentes'
            ? itens.filter(i => itensEditados[i.id]?.encontrado).length
            : itens.filter(i => i.encontrado).length

          return (
            <div key={sol.id} className="card">
              {/* Cabeçalho do card */}
              <div className="flex items-start justify-between cursor-pointer" onClick={() => handleExpandir(sol)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-verde-900 font-bold text-sm">{sol.filial?.nome}</span>
                    {sol.status === 'pendente'
                      ? <span className="badge-pendente">Pendente</span>
                      : <span className="badge-concluido">Concluído</span>}
                  </div>
                  <p className="text-verde-600 text-xs mt-0.5">👤 {sol.farmaceutico?.nome}</p>
                  <p className="text-verde-500 text-xs">🕐 {formatarHora(sol.criado_em)}</p>
                  {sol.concluido_em && (
                    <p className="text-verde-500 text-xs">✅ Concluído em {formatarHora(sol.concluido_em)}</p>
                  )}
                  <p className="text-verde-700 text-xs mt-1">
                    {totalItens} produto(s)
                    {sol.status === 'concluido' && ` · ${encontrados}/${totalItens} encontrados`}
                  </p>
                </div>
                <span className="text-verde-400 text-lg ml-2">{expandido === sol.id ? '▲' : '▼'}</span>
              </div>

              {/* Itens expandidos */}
              {expandido === sol.id && (
                <div className="mt-3 border-t border-verde-100 pt-3 space-y-3">

                  {/* Progresso (só pendentes) */}
                  {sol.status === 'pendente' && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-verde-100 rounded-full h-2">
                        <div
                          className="bg-verde-600 h-2 rounded-full transition-all"
                          style={{ width: totalItens ? `${(encontrados / totalItens) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="text-verde-700 text-xs font-medium">{encontrados}/{totalItens}</span>
                    </div>
                  )}

                  {/* Lista de itens */}
                  {itens.map((item: ItemSolicitacao) => {
                    const estado = itensEditados[item.id]
                    const enc = sol.status === 'pendente' ? estado?.encontrado : item.encontrado
                    const qtdEnv = sol.status === 'pendente' ? estado?.quantidade_enviada : item.quantidade_enviada

                    return (
                      <div key={item.id}
                        className={`rounded-xl p-3 border transition-colors ${enc ? 'bg-verde-50 border-verde-300' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                          {/* Checkbox (só pendentes) */}
                          {sol.status === 'pendente' && (
                            <button
                              onClick={() => toggleEncontrado(item.id)}
                              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                estado?.encontrado
                                  ? 'bg-verde-700 border-verde-700 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {estado?.encontrado && <span className="text-sm leading-none">✓</span>}
                            </button>
                          )}

                          {/* Nome e categoria */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-tight ${enc ? 'text-verde-900' : 'text-gray-500'}`}>
                              {item.produto?.nome}
                            </p>
                            <span className={`categoria-${item.produto?.categoria} mt-0.5 inline-block`}>
                              {item.produto?.categoria}
                            </span>
                          </div>

                          {/* Quantidade */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-gray-400 text-xs">Pedido: {item.quantidade}</span>
                            {sol.status === 'pendente' ? (
                              <div className="flex items-center gap-1">
                                <span className="text-verde-700 text-xs font-medium">Enviar:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={estado?.quantidade_enviada ?? item.quantidade}
                                  onChange={e => alterarQtdEnviada(item.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-14 text-center border-2 border-verde-300 rounded-lg px-1 py-1 text-sm font-bold text-verde-900 focus:outline-none focus:border-verde-600"
                                />
                              </div>
                            ) : (
                              <span className="text-verde-800 text-xs font-bold">
                                Enviado: {qtdEnv ?? item.quantidade}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {sol.status === 'pendente' && (
                    <button
                      onClick={() => marcarConcluido(sol)}
                      disabled={concluindo === sol.id}
                      className="btn-verde w-full mt-1 disabled:opacity-60"
                    >
                      {concluindo === sol.id ? 'Salvando...' : '✅ Concluir Separação'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
