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
    if (!confirm('Sair da conta do estoquista?')) return
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/gestor/admin')}
              className="flex items-center gap-1.5 bg-verde-800 hover:bg-verde-700 text-verde-100 text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              Admin
            </button>
            <button
              onClick={sair}
              className="flex items-center gap-1.5 bg-verde-800 hover:bg-verde-700 text-verde-100 text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair
            </button>
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
        {carregando && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-12 h-12 border-4 border-verde-200 border-t-verde-700 rounded-full animate-spin" />
            <p className="text-verde-600 text-sm font-medium">Carregando solicitações...</p>
          </div>
        )}

        {!carregando && lista.length === 0 && (
          <div className="bg-white rounded-2xl border border-verde-100 shadow-sm py-14 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-verde-50 flex items-center justify-center">
              {aba === 'pendentes' ? (
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              ) : (
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
            </div>
            <p className="text-verde-800 font-semibold text-sm">
              {aba === 'pendentes' ? 'Tudo em dia!' : 'Sem histórico ainda'}
            </p>
            <p className="text-gray-400 text-xs text-center max-w-[200px]">
              {aba === 'pendentes' ? 'Nenhuma solicitação aguardando separação.' : 'Solicitações concluídas aparecerão aqui.'}
            </p>
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
                <span className={`text-verde-400 ml-2 transition-transform duration-200 ${expandido === sol.id ? 'rotate-180' : ''}`}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
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
                          {/* Checkbox (só pendentes) — 44px touch area mínimo */}
                          {sol.status === 'pendente' && (
                            <button
                              onClick={() => toggleEncontrado(item.id)}
                              className="w-11 h-11 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
                              aria-label={estado?.encontrado ? 'Desmarcar encontrado' : 'Marcar como encontrado'}
                            >
                              <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                estado?.encontrado
                                  ? 'bg-verde-700 border-verde-700 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {estado?.encontrado && (
                                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>
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
