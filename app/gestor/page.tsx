'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Solicitacao, Usuario } from '@/lib/supabase'

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

  const carregarSolicitacoes = useCallback(async () => {
    const { data } = await supabase
      .from('solicitacoes')
      .select(`
        *,
        filial:filiais(id, nome),
        farmaceutico:usuarios(id, nome),
        itens:itens_solicitacao(
          id, quantidade,
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

  // Realtime: atualiza quando chegar nova solicitação
  useEffect(() => {
    const channel = supabase
      .channel('solicitacoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, () => {
        carregarSolicitacoes()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [carregarSolicitacoes])

  function sair() {
    localStorage.removeItem('gf_usuario')
    router.push('/')
  }

  async function marcarConcluido(id: number) {
    setConcluindo(id)
    await supabase
      .from('solicitacoes')
      .update({ status: 'concluido', concluido_em: new Date().toISOString() })
      .eq('id', id)
    await carregarSolicitacoes()
    setConcluindo(null)
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
            <p className="text-verde-200 text-xs">Painel do Gestor · {usuario?.nome}</p>
          </div>
          <button onClick={sair} className="text-verde-300 text-sm underline">Sair</button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setAba('pendentes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              aba === 'pendentes' ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200'
            }`}
          >
            Solicitações
            {pendentes.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {pendentes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAba('historico')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              aba === 'historico' ? 'bg-white text-verde-900' : 'bg-verde-800 text-verde-200'
            }`}
          >
            Histórico ({historico.length})
          </button>
        </div>
      </header>

      {/* Indicador de novas solicitações */}
      {aba === 'pendentes' && pendentes.length > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-amber-500 text-lg">🔔</span>
          <p className="text-amber-800 text-sm font-medium">
            {pendentes.length} solicitaç{pendentes.length === 1 ? 'ão pendente' : 'ões pendentes'}
          </p>
        </div>
      )}

      {/* Lista */}
      <div className="px-4 mt-4 pb-8 space-y-3">
        {carregando && (
          <div className="text-verde-600 text-center py-8">Carregando...</div>
        )}

        {!carregando && lista.length === 0 && (
          <div className="card text-center text-verde-600 py-10">
            {aba === 'pendentes' ? 'Nenhuma solicitação pendente.' : 'Nenhum histórico ainda.'}
          </div>
        )}

        {lista.map(sol => (
          <div key={sol.id} className="card">
            {/* Cabeçalho do card */}
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpandido(expandido === sol.id ? null : sol.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-verde-900 font-bold text-sm">{sol.filial?.nome}</span>
                  {sol.status === 'pendente' ? (
                    <span className="badge-pendente">Pendente</span>
                  ) : (
                    <span className="badge-concluido">Concluído</span>
                  )}
                </div>
                <p className="text-verde-600 text-xs mt-0.5">
                  👤 {sol.farmaceutico?.nome}
                </p>
                <p className="text-verde-500 text-xs">
                  🕐 {formatarHora(sol.criado_em)}
                </p>
                {sol.concluido_em && (
                  <p className="text-verde-500 text-xs">
                    ✅ Concluído em {formatarHora(sol.concluido_em)}
                  </p>
                )}
                <p className="text-verde-700 text-xs mt-1">
                  {sol.itens?.length ?? 0} produto(s) · toque para {expandido === sol.id ? 'fechar' : 'ver'}
                </p>
              </div>
              <span className="text-verde-400 text-lg ml-2">{expandido === sol.id ? '▲' : '▼'}</span>
            </div>

            {/* Itens expandidos */}
            {expandido === sol.id && (
              <div className="mt-3 border-t border-verde-100 pt-3 space-y-1.5">
                {sol.itens?.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-verde-900 text-sm">{item.produto?.nome}</p>
                      <span className={`categoria-${item.produto?.categoria} text-xs`}>
                        {item.produto?.categoria}
                      </span>
                    </div>
                    <span className="text-verde-900 font-bold text-sm bg-verde-100 px-2 py-0.5 rounded-lg">
                      × {item.quantidade}
                    </span>
                  </div>
                ))}

                {sol.status === 'pendente' && (
                  <button
                    onClick={() => marcarConcluido(sol.id)}
                    disabled={concluindo === sol.id}
                    className="btn-verde w-full mt-3 disabled:opacity-60"
                  >
                    {concluindo === sol.id ? 'Concluindo...' : '✅ Marcar como Concluído'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
