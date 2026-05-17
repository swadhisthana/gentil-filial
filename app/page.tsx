'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Modo = 'escolha' | 'gestor' | 'farmaceutico'

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('escolha')

  // Gestor
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erroGestor, setErroGestor] = useState('')
  const [carregandoGestor, setCarregandoGestor] = useState(false)

  // Farmacêutico
  const [filialId, setFilialId] = useState('')
  const [farmaceuticoId, setFarmaceuticoId] = useState('')
  const [farmaceuticos, setFarmaceuticos] = useState<{ id: number; nome: string }[]>([])
  const [carregandoFarma, setCarregandoFarma] = useState(false)

  const filiais = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, nome: `FILIAL ${i + 1}` }))

  async function handleFilialChange(id: string) {
    setFilialId(id)
    setFarmaceuticoId('')
    if (!id) { setFarmaceuticos([]); return }
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('tipo', 'farmaceutico')
      .eq('filial_id', id)
      .order('nome')
    setFarmaceuticos(data ?? [])
  }

  async function handleEntrarFarmaceutico() {
    if (!filialId || !farmaceuticoId) return
    setCarregandoFarma(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*, filial:filiais(id, nome)')
      .eq('id', farmaceuticoId)
      .single()
    if (data) {
      localStorage.setItem('gf_usuario', JSON.stringify(data))
      router.push('/farmaceutico')
    }
    setCarregandoFarma(false)
  }

  async function handleLoginGestor(e: React.FormEvent) {
    e.preventDefault()
    setErroGestor('')
    setCarregandoGestor(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*, filial:filiais(id, nome)')
      .eq('usuario', usuario.trim())
      .eq('senha', senha)
      .eq('tipo', 'gestor')
      .single()
    if (!data) {
      setErroGestor('Usuário ou senha incorretos.')
      setCarregandoGestor(false)
      return
    }
    localStorage.setItem('gf_usuario', JSON.stringify(data))
    router.push('/gestor')
  }

  return (
    <div className="min-h-screen bg-verde-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Gentil Filial</h1>
          <p className="text-verde-200 text-sm mt-1">Controle de Transferência de Estoque</p>
        </div>

        {/* TELA DE ESCOLHA */}
        {modo === 'escolha' && (
          <div className="space-y-3">
            <button
              onClick={() => setModo('farmaceutico')}
              className="w-full bg-white text-verde-900 rounded-2xl p-5 text-left shadow-lg flex items-center gap-4 hover:bg-verde-50 transition-colors active:scale-95"
            >
              <span className="text-3xl">👩‍⚕️</span>
              <div>
                <p className="font-bold text-lg">Sou Farmacêutico</p>
                <p className="text-verde-600 text-sm">Selecione seu nome e filial</p>
              </div>
            </button>
            <button
              onClick={() => setModo('gestor')}
              className="w-full bg-verde-700 text-white rounded-2xl p-5 text-left shadow-lg flex items-center gap-4 hover:bg-verde-600 transition-colors active:scale-95"
            >
              <span className="text-3xl">🗂️</span>
              <div>
                <p className="font-bold text-lg">Sou Gestor</p>
                <p className="text-verde-200 text-sm">Acesso com usuário e senha</p>
              </div>
            </button>
          </div>
        )}

        {/* TELA FARMACÊUTICO */}
        {modo === 'farmaceutico' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <button onClick={() => setModo('escolha')} className="text-verde-600 text-sm mb-4 flex items-center gap-1">
              ← Voltar
            </button>
            <h2 className="text-verde-900 text-xl font-semibold mb-5 text-center">👩‍⚕️ Farmacêutico</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-verde-800 text-sm font-medium mb-1">Sua Filial</label>
                <select
                  value={filialId}
                  onChange={e => handleFilialChange(e.target.value)}
                  className="input-field"
                >
                  <option value="">Selecione a filial...</option>
                  {filiais.map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {filialId && (
                <div>
                  <label className="block text-verde-800 text-sm font-medium mb-1">Seu Nome</label>
                  <select
                    value={farmaceuticoId}
                    onChange={e => setFarmaceuticoId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Selecione seu nome...</option>
                    {farmaceuticos.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleEntrarFarmaceutico}
                disabled={!filialId || !farmaceuticoId || carregandoFarma}
                className="btn-verde w-full text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {carregandoFarma ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        )}

        {/* TELA GESTOR */}
        {modo === 'gestor' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <button onClick={() => setModo('escolha')} className="text-verde-600 text-sm mb-4 flex items-center gap-1">
              ← Voltar
            </button>
            <h2 className="text-verde-900 text-xl font-semibold mb-5 text-center">🗂️ Gestor</h2>

            <form onSubmit={handleLoginGestor} className="space-y-4">
              <div>
                <label className="block text-verde-800 text-sm font-medium mb-1">Usuário</label>
                <input
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="input-field"
                  placeholder="seu.usuario"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
              <div>
                <label className="block text-verde-800 text-sm font-medium mb-1">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              {erroGestor && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {erroGestor}
                </div>
              )}
              <button
                type="submit"
                disabled={carregandoGestor}
                className="btn-verde w-full text-center disabled:opacity-60"
              >
                {carregandoGestor ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        )}

        <p className="text-verde-300 text-xs text-center mt-6">Farmácia Gentil © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
