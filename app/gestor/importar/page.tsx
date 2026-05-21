'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

type LinhaInfarma = {
  ean: string
  descricao: string
  fabricante: string
  classificacao: string
  estoque: number
  preco: number | null
}

type ResultadoArquivo = {
  arquivo: string
  atualizados: number
  criados: number
  ignorados: number
  total: number
  erro?: string
}

function lerArquivoInfarma(buf: ArrayBuffer, nomeArquivo: string): { dados: LinhaInfarma[]; ignorados: number } {
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][]
  const dados: LinhaInfarma[] = []
  let ignorados = 0
  for (let i = 1; i < linhas.length; i++) {
    const r = linhas[i]
    if (!r || r[0] == null) { ignorados++; continue }
    const ean = String(r[1] ?? '').trim()
    if (!ean) { ignorados++; continue }
    dados.push({
      ean,
      descricao: String(r[2] ?? '').trim(),
      fabricante: String(r[3] ?? '').trim(),
      classificacao: String(r[4] ?? '').trim(),
      estoque: Number.parseInt(String(r[9] ?? '0'), 10) || 0,
      preco: r[10] != null ? Number(r[10]) : null,
    })
  }
  return { dados, ignorados }
}

async function importarLote(dados: LinhaInfarma[], nomeArquivo: string, ignoradosLeitura: number): Promise<ResultadoArquivo> {
  if (dados.length === 0) {
    return { arquivo: nomeArquivo, atualizados: 0, criados: 0, ignorados: ignoradosLeitura, total: 0 }
  }

  const agora = new Date().toISOString()

  // Busca todos os EANs presentes no banco
  const eans = dados.map(d => d.ean)
  const { data: existentes } = await supabase
    .from('produtos')
    .select('id, codigo_barras')
    .in('codigo_barras', eans)

  const mapaExistentes = new Map((existentes ?? []).map(p => [p.codigo_barras, p.id]))

  const paraAtualizar = dados.filter(d => mapaExistentes.has(d.ean))
  const paraCriar = dados.filter(d => !mapaExistentes.has(d.ean))

  // Atualiza em lote (upsert por codigo_barras)
  let atualizados = 0
  let criados = 0

  if (paraAtualizar.length > 0) {
    const registros = paraAtualizar.map(d => ({
      id: mapaExistentes.get(d.ean)!,
      estoque_armazem: d.estoque,
      preco_venda: d.preco,
      estoque_atualizado_em: agora,
    }))
    // Upsert em lotes de 500 para não exceder limites
    const LOTE = 500
    for (let i = 0; i < registros.length; i += LOTE) {
      await supabase.from('produtos').upsert(registros.slice(i, i + LOTE), { onConflict: 'id' })
    }
    atualizados = paraAtualizar.length
  }

  if (paraCriar.length > 0) {
    const novos = paraCriar.map(d => ({
      nome: d.descricao,
      fabricante: d.fabricante,
      categoria: 'Perfumaria' as const, // default; ajustar manualmente se necessário
      codigo_barras: d.ean,
      codigo_infarma: null,
      estoque_armazem: d.estoque,
      preco_venda: d.preco,
      estoque_atualizado_em: agora,
    }))
    const LOTE = 500
    for (let i = 0; i < novos.length; i += LOTE) {
      await supabase.from('produtos').insert(novos.slice(i, i + LOTE))
    }
    criados = paraCriar.length
  }

  // Auditoria
  await supabase.from('importacoes_estoque').insert({
    arquivo: nomeArquivo,
    total_linhas: dados.length,
    atualizados,
    criados,
    ignorados: ignoradosLeitura,
  })

  return {
    arquivo: nomeArquivo,
    atualizados,
    criados,
    ignorados: ignoradosLeitura,
    total: dados.length,
  }
}

export default function ImportarEstoquePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([])
  const [processando, setProcessando] = useState(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number; nomeAtual: string } | null>(null)
  const [resultados, setResultados] = useState<ResultadoArquivo[]>([])
  const [arrastando, setArrastando] = useState(false)

  const adicionarArquivos = useCallback((files: FileList | null) => {
    if (!files) return
    const xls = Array.from(files).filter(f => f.name.match(/\.(xls|xlsx)$/i))
    if (xls.length === 0) return
    setArquivosSelecionados(prev => {
      const nomes = new Set(prev.map(f => f.name))
      return [...prev, ...xls.filter(f => !nomes.has(f.name))]
    })
    setResultados([])
  }, [])

  const removerArquivo = (nome: string) => {
    setArquivosSelecionados(prev => prev.filter(f => f.name !== nome))
  }

  async function iniciarImportacao() {
    if (arquivosSelecionados.length === 0 || processando) return
    setProcessando(true)
    setResultados([])
    const novosResultados: ResultadoArquivo[] = []

    for (let i = 0; i < arquivosSelecionados.length; i++) {
      const arquivo = arquivosSelecionados[i]
      setProgresso({ atual: i + 1, total: arquivosSelecionados.length, nomeAtual: arquivo.name })
      try {
        const buf = await arquivo.arrayBuffer()
        const { dados, ignorados } = lerArquivoInfarma(buf, arquivo.name)
        const resultado = await importarLote(dados, arquivo.name, ignorados)
        novosResultados.push(resultado)
      } catch (e) {
        novosResultados.push({
          arquivo: arquivo.name,
          atualizados: 0, criados: 0, ignorados: 0, total: 0,
          erro: e instanceof Error ? e.message : 'Erro desconhecido',
        })
      }
    }

    setResultados(novosResultados)
    setArquivosSelecionados([])
    setProgresso(null)
    setProcessando(false)
  }

  const totalAtualizados = resultados.reduce((s, r) => s + r.atualizados, 0)
  const totalCriados = resultados.reduce((s, r) => s + r.criados, 0)
  const temErro = resultados.some(r => r.erro)

  return (
    <div className="min-h-screen bg-verde-50 pb-12">
      {/* Header */}
      <header className="bg-verde-800 text-white px-4 pt-safe pb-4 flex items-center gap-3 shadow-md sticky top-0 z-20">
        <button onClick={() => router.push('/gestor')}
          className="w-9 h-9 rounded-full hover:bg-verde-700 flex items-center justify-center text-xl leading-none">
          ←
        </button>
        <div>
          <h1 className="font-bold text-base leading-tight">Atualizar Estoque</h1>
          <p className="text-verde-300 text-xs">Importar relatório Infarma (.xls)</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* Zona de drop */}
        <div
          onDragOver={e => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={e => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            arrastando ? 'border-verde-500 bg-verde-100' : 'border-verde-200 bg-white hover:bg-verde-50'
          }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            multiple
            className="hidden"
            onChange={e => adicionarArquivos(e.target.files)}
          />
          <div className="w-14 h-14 rounded-full bg-verde-100 flex items-center justify-center">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-verde-900 text-sm">
              {arrastando ? 'Solte os arquivos aqui' : 'Clique ou arraste os arquivos .xls'}
            </p>
            <p className="text-verde-500 text-xs mt-1">
              Aceita um ou vários arquivos (por fabricante ou geral)
            </p>
          </div>
        </div>

        {/* Arquivos selecionados */}
        {arquivosSelecionados.length > 0 && (
          <div className="bg-white rounded-2xl border border-verde-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-verde-50 flex items-center justify-between">
              <p className="text-verde-800 font-semibold text-sm">
                {arquivosSelecionados.length} arquivo{arquivosSelecionados.length > 1 ? 's' : ''} selecionado{arquivosSelecionados.length > 1 ? 's' : ''}
              </p>
              <button onClick={() => setArquivosSelecionados([])}
                className="text-red-400 text-xs hover:text-red-600">remover todos</button>
            </div>
            <ul className="divide-y divide-verde-50">
              {arquivosSelecionados.map(f => (
                <li key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-verde-700 text-lg">📄</span>
                  <span className="flex-1 text-sm text-verde-900 truncate">{f.name}</span>
                  <span className="text-xs text-verde-400">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removerArquivo(f.name)}
                    className="text-red-300 hover:text-red-500 w-6 h-6 rounded flex items-center justify-center text-lg leading-none">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progresso */}
        {processando && progresso && (
          <div className="bg-white rounded-2xl border border-verde-100 shadow-sm px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-verde-300 border-t-verde-700 rounded-full animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-verde-900 truncate">{progresso.nomeAtual}</p>
                <p className="text-xs text-verde-500">Arquivo {progresso.atual} de {progresso.total}</p>
              </div>
            </div>
            <div className="h-2 bg-verde-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-verde-600 rounded-full transition-all duration-300"
                style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="space-y-3">
            {/* Resumo geral */}
            <div className={`rounded-2xl px-5 py-4 border ${temErro ? 'bg-red-50 border-red-200' : 'bg-verde-50 border-verde-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{temErro ? '⚠️' : '✅'}</span>
                <p className="font-bold text-verde-900 text-base">
                  {temErro ? 'Concluído com erros' : 'Importação concluída'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl px-3 py-2 text-center border border-verde-100">
                  <p className="text-2xl font-bold text-verde-800">{totalAtualizados.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-verde-600 font-medium">Atualizados</p>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 text-center border border-verde-100">
                  <p className="text-2xl font-bold text-blue-700">{totalCriados.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-blue-600 font-medium">Criados</p>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 text-center border border-verde-100">
                  <p className="text-2xl font-bold text-gray-500">{resultados.reduce((s, r) => s + r.ignorados, 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-gray-500 font-medium">Ignorados</p>
                </div>
              </div>
            </div>

            {/* Detalhe por arquivo */}
            {resultados.length > 1 && (
              <div className="bg-white rounded-2xl border border-verde-100 shadow-sm overflow-hidden">
                <p className="px-4 py-2.5 text-xs font-semibold text-verde-700 border-b border-verde-50">Detalhe por arquivo</p>
                <ul className="divide-y divide-verde-50">
                  {resultados.map(r => (
                    <li key={r.arquivo} className="px-4 py-3">
                      <p className="text-sm font-medium text-verde-900 truncate mb-1">{r.arquivo}</p>
                      {r.erro ? (
                        <p className="text-xs text-red-600">❌ {r.erro}</p>
                      ) : (
                        <p className="text-xs text-verde-600">
                          ✅ {r.atualizados} atualiz. · {r.criados} criados · {r.ignorados} ignorados
                          <span className="text-verde-400 ml-1">({r.total} linhas)</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => { setResultados([]); setArquivosSelecionados([]) }}
              className="w-full bg-verde-700 text-white font-semibold py-3 rounded-xl text-sm">
              Nova importação
            </button>
          </div>
        )}

        {/* Botão importar */}
        {arquivosSelecionados.length > 0 && !processando && (
          <button
            onClick={iniciarImportacao}
            className="w-full bg-verde-700 text-white font-bold py-4 rounded-2xl text-base shadow-md active:scale-95 transition-transform">
            Importar {arquivosSelecionados.length > 1 ? `${arquivosSelecionados.length} arquivos` : 'arquivo'}
          </button>
        )}

        {/* Instrução */}
        {arquivosSelecionados.length === 0 && resultados.length === 0 && (
          <div className="bg-white rounded-2xl border border-verde-100 shadow-sm px-5 py-4 space-y-2.5">
            <p className="text-verde-800 font-semibold text-sm">Como usar</p>
            <ol className="space-y-2 text-sm text-verde-700">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-verde-100 text-verde-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>No Infarma, acesse o relatório de estoque e exporte como <strong>.xls</strong></span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-verde-100 text-verde-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Selecione o(s) arquivo(s) aqui — pode importar um geral ou vários por fabricante de uma vez</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-verde-100 text-verde-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Clique em <strong>Importar</strong> — o estoque é atualizado automaticamente</span>
              </li>
            </ol>
            <p className="text-verde-400 text-xs pt-1 border-t border-verde-50">
              Faça isso <strong>antes das 18h</strong>, pouco antes da chamada diária.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
