// scripts/preencher-imagens.js
// Requer Node 18+ (fetch nativo — sem node-fetch)
'use strict'
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BATCH_SIZE = 30
const DELAY_MS = 600
const FALHAS_LOG = 'scripts/sem-imagem.txt'

// --------------------------------------------------
// FONTES VTEX (farmácias com API pública de busca)
// --------------------------------------------------

const FONTES_VTEX = [
  'https://www.drogariasaopaulo.com.br',
  'https://www.drogasil.com.br',
  'https://www.drogaraia.com.br',
  'https://www.panvel.com',
  'https://www.paguemenos.com.br',
  'https://www.nissei.com.br',
  'https://www.ultrafarma.com.br',
  'https://www.drogariaminasbrasileira.com.br',
  'https://www.farmaciaindiana.com.br',
  'https://www.drogariapopular.com.br',
]

// --------------------------------------------------
// UTILIDADES
// --------------------------------------------------

const delay = ms => new Promise(r => setTimeout(r, ms))

function normalizar(t) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function limparNome(nome) {
  return normalizar(nome)
    // remove padrões de quantidade/embalagem/promoção
    .replace(/\b(c|l|lv|pg|p)\s*[\/\d]\s*\d*\s*/gi, ' ')
    .replace(/\b\d+\s*(ml|mg|mcg|g|gr|kg|un|und|cp|cps|cpr|comp|caps|fr|fl|amp|sach|ui|ui\/ml)\b/gi, ' ')
    // remove prefixos de categoria abreviados
    .replace(/\babs\.?\s*/gi, ' ')
    .replace(/\bxpe\.?\s*/gi, ' ')
    .replace(/\bsol\.?\s*/gi, ' ')
    .replace(/\bsup\.?\s*/gi, ' ')
    .replace(/\bgts\.?\s*/gi, ' ')
    .replace(/\bcps\.?\s*/gi, ' ')
    // remove palavras genéricas
    .replace(/\b(com|sem|para|tipo|plus|max|med|min|kit|pack|promo|not|act|seca|seco|hiper|super|ultra)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function gerarTermos(nome) {
  const orig = normalizar(nome).split(' ').filter(w => w.length > 1)
  const limpo = limparNome(nome).split(' ').filter(w => w.length > 1)

  const candidatos = [
    orig.slice(0, 5).join(' '),
    orig.slice(0, 4).join(' '),
    orig.slice(0, 3).join(' '),
    orig.slice(0, 2).join(' '),
    limpo.slice(0, 5).join(' '),
    limpo.slice(0, 4).join(' '),
    limpo.slice(0, 3).join(' '),
    limpo.slice(0, 2).join(' '),
  ]

  return [...new Set(candidatos)].filter(t => t && t.length > 2)
}

// --------------------------------------------------
// BUSCA VTEX
// --------------------------------------------------

async function buscarVTEX(base, termo) {
  try {
    const url = `${base}/api/catalog_system/pub/products/search/${encodeURIComponent(termo)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) return null
    for (const item of data) {
      const img = item?.items?.[0]?.images?.[0]?.imageUrl
      if (img && img.startsWith('http')) return img
    }
    return null
  } catch {
    return null
  }
}

async function buscarEmTodasFontesVTEX(nome) {
  const termos = gerarTermos(nome)
  for (const termo of termos) {
    for (const base of FONTES_VTEX) {
      const img = await buscarVTEX(base, termo)
      if (img) {
        const host = base.replace('https://www.', '').replace('https://', '').split('/')[0]
        process.stdout.write(`\n      ✔ VTEX [${host}] "${termo}"`)
        return img
      }
      await delay(100)
    }
  }
  return null
}

// --------------------------------------------------
// OPEN BEAUTY FACTS
// --------------------------------------------------

async function buscarOpenBeautyFacts(nome) {
  try {
    const termo = limparNome(nome).split(' ').filter(Boolean).slice(0, 3).join(' ')
    const url = `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(termo)}&search_simple=1&action=process&json=1&page_size=5`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GentilFilial/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    for (const p of (data?.products || [])) {
      const img = p.image_front_url || p.image_url
      if (img && img.startsWith('http')) return img
    }
    return null
  } catch {
    return null
  }
}

// --------------------------------------------------
// OPEN FOOD FACTS
// --------------------------------------------------

async function buscarOpenFoodFacts(nome) {
  try {
    const termo = limparNome(nome).split(' ').filter(Boolean).slice(0, 3).join(' ')
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(termo)}&search_simple=1&action=process&json=1&page_size=5&lc=pt`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GentilFilial/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    for (const p of (data?.products || [])) {
      const img = p.image_front_url || p.image_url
      if (img && img.startsWith('http')) return img
    }
    return null
  } catch {
    return null
  }
}

// --------------------------------------------------
// ORQUESTRADOR POR PRODUTO
// --------------------------------------------------

async function buscarImagem(produto) {
  let img = await buscarEmTodasFontesVTEX(produto.nome)
  if (img) return img

  img = await buscarOpenBeautyFacts(produto.nome)
  if (img) { process.stdout.write(`\n      ✔ OpenBeautyFacts`); return img }

  img = await buscarOpenFoodFacts(produto.nome)
  if (img) { process.stdout.write(`\n      ✔ OpenFoodFacts`); return img }

  return null
}

// --------------------------------------------------
// SUPABASE
// --------------------------------------------------

async function atualizarImagem(id, imagem_url) {
  const { error } = await supabase
    .from('produtos')
    .update({ imagem_url })
    .eq('id', id)
  return !error
}

function salvarFalha(produto) {
  fs.appendFileSync(FALHAS_LOG, `[${produto.id}] ${produto.nome}\n`, 'utf8')
}

// --------------------------------------------------
// PROCESSAMENTO EM BATCH
// --------------------------------------------------

async function processarBatch() {
  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, nome, categoria')
    .is('imagem_url', null)
    .order('nome')
    .limit(BATCH_SIZE)

  if (error || !produtos?.length) return false

  let sucesso = 0
  let falhas = 0

  for (const produto of produtos) {
    process.stdout.write(`\n  [${produto.id}] ${produto.nome.substring(0, 45).padEnd(45)}`)

    const imagem = await buscarImagem(produto)

    if (!imagem) {
      process.stdout.write(' ✖')
      salvarFalha(produto)
      falhas++
    } else {
      const ok = await atualizarImagem(produto.id, imagem)
      if (ok) {
        process.stdout.write(' ✅')
        sucesso++
      } else {
        process.stdout.write(' ❌ (erro update)')
        salvarFalha(produto)
        falhas++
      }
    }

    await delay(DELAY_MS)
  }

  console.log(`\n\n     Batch: ✅ ${sucesso}  ✖ ${falhas}`)
  return true
}

// --------------------------------------------------
// LOOP PRINCIPAL
// --------------------------------------------------

async function iniciar() {
  if (fs.existsSync(FALHAS_LOG)) fs.unlinkSync(FALHAS_LOG)

  console.log('\n🚀 Iniciando preenchimento de imagens...')
  console.log(`   Fontes: ${FONTES_VTEX.length} farmácias VTEX + OpenBeautyFacts + OpenFoodFacts\n`)

  let rodada = 1

  while (true) {
    const { count: restantes } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .is('imagem_url', null)

    if (!restantes) break

    const { count: total } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true })

    const pct = (((total - restantes) / total) * 100).toFixed(1)
    console.log(`\n════ Rodada ${rodada} ║ ${restantes} sem imagem ║ ${pct}% cobertos ════`)

    const temMais = await processarBatch()
    if (!temMais) break

    rodada++
    await delay(1000)
  }

  const { count: final } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .is('imagem_url', null)

  console.log('\n══════════════════════════════════════════')
  if (final === 0) {
    console.log('  🎉 TODOS OS PRODUTOS TÊM IMAGEM!')
  } else {
    console.log(`  Produtos ainda sem imagem: ${final}`)
    console.log(`  Lista salva em: ${FALHAS_LOG}`)
  }
  console.log('══════════════════════════════════════════\n')
}

iniciar().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
