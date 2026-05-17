'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, filial:filiais(id, nome)')
        .eq('usuario', usuario.trim())
        .eq('senha', senha)
        .single()

      if (error || !data) {
        setErro('Usuário ou senha incorretos.')
        setCarregando(false)
        return
      }

      localStorage.setItem('gf_usuario', JSON.stringify(data))

      if (data.tipo === 'gestor') {
        router.push('/gestor')
      } else {
        router.push('/farmaceutico')
      }
    } catch {
      setErro('Erro ao conectar. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-verde-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Gentil Filial</h1>
          <p className="text-verde-200 text-sm mt-1">Controle de Transferência de Estoque</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-verde-900 text-xl font-semibold mb-6 text-center">Entrar</h2>

          <form onSubmit={handleLogin} className="space-y-4">
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

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-verde w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-verde-300 text-xs text-center mt-6">
          Farmácia Gentil © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
