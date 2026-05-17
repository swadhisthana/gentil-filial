'use client'

import { useState, useEffect } from 'react'
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
  const [farmaceuticos, setFarmaceuticos] = useState<{ id: number; nome: string }[]>([])
  const [farmaceuticoId, setFarmaceuticoId] = useState('')
  const [carregandoFarma, setCarregandoFarma] = useState(false)

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nome')
      .eq('tipo', 'farmaceutico')
      .order('nome')
      .then(({ data }) => setFarmaceuticos(data ?? []))
  }, [])

  async function handleEntrarFarmaceutico() {
    if (!farmaceuticoId) return
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Gentil Filial</h1>
          <p className="text-verde-200 text-sm mt-1">Controle de Transferência de Estoque</p>
        </div>

        {/* ESCOLHA */}
        {modo === 'escolha' && (
          <div className="space-y-3">
            <button
              onClick={() => setModo('farmaceutico')}
              className="w-full bg-white text-verde-900 rounded-2xl p-5 text-left shadow-lg flex items-center gap-4 hover:bg-verde-50 transition-colors active:scale-95"
            >
              <span className="text-3xl">👩‍⚕️</span>
              <div>
                <p className="font-bold text-lg">Sou Farmacêutico</p>
                <p className="text-verde-600 text-sm">Selecione seu nome</p>
              </div>
            </button>
            <button
              onClick={() => setModo('gestor')}
              className="w-full bg-verde-700 text-white rounded-2xl p-5 text-left shadow-lg flex items-center gap-4 hover:bg-verde-600 transition-colors active:scale-95"
            >
              <span className="text-3xl">🗂️</span>
              <div>
                <p className="font-bold text-lg">Sou Estoquista</p>
                <p className="text-verde-200 text-sm">Acesso com usuário e senha</p>
              </div>
            </button>
          </div>
        )}

        {/* FARMACÊUTICO */}
        {modo === 'farmaceutico' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <button onClick={() => setModo('escolha')} className="text-verde-600 text-sm mb-4">← Voltar</button>
            <h2 className="text-verde-900 text-xl font-semibold mb-5 text-center">👩‍⚕️ Quem é você?</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {farmaceuticos.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFarmaceuticoId(String(f.id))}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      farmaceuticoId === String(f.id)
                        ? 'border-verde-700 bg-verde-50 text-verde-900'
                        : 'border-verde-100 text-verde-800 hover:border-verde-300'
                    }`}
                  >
                    {f.nome}
                  </button>
                ))}
              </div>

              <button
                onClick={handleEntrarFarmaceutico}
                disabled={!farmaceuticoId || carregandoFarma}
                className="btn-verde w-full text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {carregandoFarma ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        )}

        {/* ESTOQUISTA */}
        {modo === 'gestor' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <button onClick={() => setModo('escolha')} className="text-verde-600 text-sm mb-4">← Voltar</button>
            <h2 className="text-verde-900 text-xl font-semibold mb-5 text-center">🗂️ Estoquista</h2>
            <form onSubmit={handleLoginGestor} className="space-y-4">
              <div>
                <label className="block text-verde-800 text-sm font-medium mb-1">Usuário</label>
                <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
                  className="input-field" placeholder="seu.usuario" autoCapitalize="none" autoCorrect="off" required />
              </div>
              <div>
                <label className="block text-verde-800 text-sm font-medium mb-1">Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  className="input-field" placeholder="••••••••" required />
              </div>
              {erroGestor && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{erroGestor}</div>
              )}
              <button type="submit" disabled={carregandoGestor} className="btn-verde w-full text-center disabled:opacity-60">
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
