'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Modo = 'escolha' | 'gestor' | 'farmaceutico'

// Logo pill verde escuro com cruz branca + nome
function LogoPill() {
  return (
    <div className="inline-flex items-center gap-3 bg-verde-800 rounded-full pl-2.5 pr-7 py-2.5 shadow-lg">
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner">
        <svg width={26} height={26} viewBox="0 0 24 24" fill="#14532d" aria-hidden="true">
          <rect x="10" y="3" width="4" height="18" rx="1" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
        </svg>
      </div>
      <span className="text-2xl tracking-tight leading-none">
        <strong className="font-extrabold text-white">Gentil</strong>
        <span className="text-white font-light ml-1.5">Filial</span>
      </span>
    </div>
  )
}

// Símbolo de farmácia (Hygeia / cobra+cálice estilizado) no footer
function SimboloFarmacia() {
  return (
    <div className="w-9 h-9 rounded-full bg-verde-50 border border-verde-100 flex items-center justify-center mx-auto">
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21 L8 14 Q 8 9, 12 9 Q 16 9, 16 14 L 16 21 Z" />
        <path d="M12 3 Q 18 6, 18 10 Q 18 13, 14 14" />
        <circle cx="18" cy="10" r="1" fill="#14532d" />
      </svg>
    </div>
  )
}

// Background com curvas onduladas sutis
function BgDecorativo() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 400 800"
      aria-hidden="true"
    >
      <path d="M0,60 Q200,30 400,80 L400,90 Q200,40 0,75 Z" fill="#bbf7d0" />
      <path d="M0,120 Q200,90 400,140 L400,150 Q200,100 0,135 Z" fill="#dcfce7" />
      <path d="M0,720 Q200,750 400,710 L400,720 Q200,760 0,730 Z" fill="#dcfce7" />
      <path d="M0,760 Q200,790 400,760 L400,770 Q200,800 0,770 Z" fill="#bbf7d0" />
    </svg>
  )
}

// Ilustração 3D-style do farmacêutico (via iconify CDN, com fallback emoji)
function IlustracaoFarmaceutico() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Cruz decorativa de fundo */}
      <svg className="absolute inset-0 m-auto" width="80%" height="80%" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="42" y="10" width="16" height="80" rx="4" fill="#bbf7d0" opacity="0.6" />
        <rect x="10" y="42" width="80" height="16" rx="4" fill="#bbf7d0" opacity="0.6" />
      </svg>
      {/* Imagem 3D via iconify */}
      <img
        src="https://api.iconify.design/fluent-emoji/man-health-worker.svg?width=130&height=130"
        alt="Farmacêutico"
        className="relative z-10 w-[110px] h-[110px] drop-shadow-md"
        loading="eager"
      />
    </div>
  )
}

// Ilustração 3D-style do armazém
function IlustracaoEstoque() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Cruz decorativa de fundo */}
      <svg className="absolute inset-0 m-auto" width="80%" height="80%" viewBox="0 0 100 100" aria-hidden="true">
        <rect x="42" y="10" width="16" height="80" rx="4" fill="#bbf7d0" opacity="0.6" />
        <rect x="10" y="42" width="80" height="16" rx="4" fill="#bbf7d0" opacity="0.6" />
      </svg>
      {/* Composição: armazém + caixas */}
      <div className="relative z-10 flex items-end gap-1">
        <img
          src="https://api.iconify.design/fluent-emoji/package.svg?width=80&height=80"
          alt="Caixa"
          className="w-14 h-14 drop-shadow-md -mr-2 z-10"
          loading="eager"
        />
        <img
          src="https://api.iconify.design/fluent-emoji/office-building.svg?width=80&height=80"
          alt="Armazém"
          className="w-20 h-20 drop-shadow-md"
          loading="eager"
        />
      </div>
    </div>
  )
}

// Card de opção (Sou Farmacêutico / Sou Estoquista)
function CardOpcao({
  ilustracao, tituloLinha1, tituloLinha2, descricao, onClick,
}: {
  ilustracao: React.ReactNode
  tituloLinha1: string
  tituloLinha2: string
  descricao: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-3xl shadow-lg flex items-stretch overflow-hidden border border-verde-50 active:scale-[0.98] transition-transform"
    >
      {/* Ilustração */}
      <div className="w-[38%] bg-gradient-to-br from-verde-50 to-white flex items-center justify-center p-3 relative">
        {ilustracao}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 flex items-center gap-3">
        <div className="flex-1 text-left">
          <h3 className="text-[22px] font-extrabold text-verde-800 leading-[1.05]">
            {tituloLinha1}
            <br />
            {tituloLinha2}
          </h3>
          <div className="w-10 h-0.5 bg-verde-500 rounded-full my-2.5" />
          <p className="text-gray-500 text-[13px] leading-snug">
            {descricao}
          </p>
        </div>
        <div className="w-11 h-11 bg-verde-700 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  )
}

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
    <div className="min-h-screen bg-white relative overflow-hidden">
      <BgDecorativo />

      <div className="relative z-10 max-w-md mx-auto px-5 py-8 flex flex-col min-h-screen">
        {/* TELA INICIAL — ESCOLHA DE PERFIL */}
        {modo === 'escolha' && (
          <>
            {/* Logo pill */}
            <div className="flex justify-center pt-2 mb-8">
              <LogoPill />
            </div>

            {/* Saudação */}
            <div className="text-center mb-7">
              <h1 className="text-[34px] font-extrabold text-gray-800 leading-tight">
                Bem-vindo!
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Selecione sua função para continuar
              </p>
            </div>

            {/* Cards */}
            <div className="space-y-5 flex-1">
              <CardOpcao
                ilustracao={<IlustracaoFarmaceutico />}
                tituloLinha1="Sou"
                tituloLinha2="Farmacêutico"
                descricao="Acesse ferramentas e serviços exclusivos para farmacêuticos."
                onClick={() => setModo('farmaceutico')}
              />
              <CardOpcao
                ilustracao={<IlustracaoEstoque />}
                tituloLinha1="Sou"
                tituloLinha2="Estoquista"
                descricao="Gerencie estoque, produtos e operações da filial com eficiência."
                onClick={() => setModo('gestor')}
              />
            </div>

            {/* Footer */}
            <div className="text-center pt-6 pb-2">
              <SimboloFarmacia />
              <p className="text-gray-400 text-xs mt-2">
                Farmácia Gentil © {new Date().getFullYear()}
              </p>
            </div>
          </>
        )}

        {/* FARMACÊUTICO — picker de nome */}
        {modo === 'farmaceutico' && (
          <>
            <div className="flex items-center gap-3 pt-2 mb-6">
              <button
                onClick={() => { setModo('escolha'); setFarmaceuticoId('') }}
                className="w-10 h-10 rounded-full bg-white shadow-md border border-verde-100 flex items-center justify-center"
                aria-label="Voltar"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <LogoPill />
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6 border border-verde-50 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-verde-50 flex items-center justify-center">
                  <img
                    src="https://api.iconify.design/fluent-emoji/man-health-worker.svg?width=40&height=40"
                    alt=""
                    className="w-9 h-9"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-verde-900 leading-tight">Quem é você?</h2>
                  <p className="text-gray-500 text-xs">Selecione seu nome para entrar</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2 max-h-96">
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
                {farmaceuticos.length === 0 && (
                  <p className="text-center text-gray-400 py-8 text-sm">Nenhum farmacêutico cadastrado.</p>
                )}
              </div>

              <button
                onClick={handleEntrarFarmaceutico}
                disabled={!farmaceuticoId || carregandoFarma}
                className="btn-verde w-full text-center disabled:opacity-40 disabled:cursor-not-allowed mt-4"
              >
                {carregandoFarma ? 'Entrando...' : 'Entrar'}
              </button>
            </div>

            <div className="text-center pt-4 pb-2">
              <p className="text-gray-400 text-xs">
                Farmácia Gentil © {new Date().getFullYear()}
              </p>
            </div>
          </>
        )}

        {/* ESTOQUISTA — usuário + senha */}
        {modo === 'gestor' && (
          <>
            <div className="flex items-center gap-3 pt-2 mb-6">
              <button
                onClick={() => { setModo('escolha'); setUsuario(''); setSenha(''); setErroGestor('') }}
                className="w-10 h-10 rounded-full bg-white shadow-md border border-verde-100 flex items-center justify-center"
                aria-label="Voltar"
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <LogoPill />
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6 border border-verde-50 flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-verde-50 flex items-center justify-center">
                  <img
                    src="https://api.iconify.design/fluent-emoji/office-building.svg?width=40&height=40"
                    alt=""
                    className="w-9 h-9"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-verde-900 leading-tight">Estoquista</h2>
                  <p className="text-gray-500 text-xs">Acesse com suas credenciais</p>
                </div>
              </div>

              <form onSubmit={handleLoginGestor} className="space-y-4">
                <div>
                  <label className="block text-verde-800 text-sm font-medium mb-1.5">Usuário</label>
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
                  <label className="block text-verde-800 text-sm font-medium mb-1.5">Senha</label>
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

            <div className="text-center pt-4 pb-2">
              <p className="text-gray-400 text-xs">
                Farmácia Gentil © {new Date().getFullYear()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
