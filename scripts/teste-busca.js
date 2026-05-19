'use strict'
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const FONTES_VTEX = [
  'https://www.drogariasaopaulo.com.br',
  'https://www.drogasil.com.br',
  'https://www.drogaraia.com.br',
  'https://www.panvel.com',
  'https://www.paguemenos.com.br',
  'https://www.nissei.com.br',
]

const delay = ms => new Promise(r => setTimeout(r, ms))

function normalizar(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim()
}

function limparNome(nome) {
  return normalizar(nome)
    .replace(/\b(c|l|lv|pg|p)\s*[\/\d]\s*\d*\s*/gi, ' ')
    .replace(/\b\d+\s*(ml|mg|g|un|und|cp|cps|comp|caps|fr|fl|amp|sach)\b/gi, ' ')
    .replace(/\babs\.?\s*/gi, ' ').replace(/\bgts\.?\s*/gi, ' ')
    .replace(/\b(com|sem|kit|pack|not|act|seca|seco|hiper)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim()
}

function gerarTermos(nome) {
  const orig = normalizar(nome).split(' ').filter(w => w.length > 1)
  const limpo = limparNome(nome).split(' ').filter(w => w.length > 1)
  return [...new Set([
    orig.slice(0, 4).join(' '), orig.slice(0, 3).join(' '), orig.slice(0, 2).join(' '),
    limpo.slice(0, 4).join(' '), limpo.slice(0, 3).join(' '), limpo.slice(0, 2).join(' '),
  ])].filter(t => t && t.length > 2)
}

async function buscarVTEX(base, termo) {
  try {
    const res = await fetch(`${base}/api/catalog_system/pub/products/search/${encodeURIComponent(termo)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) return null
    for (const item of data) {
      const img = item?.items?.[0]?.images?.[0]?.imageUrl
      if (img?.startsWith('http')) return img
    }
    return null
  } catch { return null }
}

async function main() {
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, categoria')
    .is('imagem_url', null)
    .order('nome')
    .limit(8)

  console.log(`\n🧪 Testando ${produtos.length} produtos:\n`)

  let achados = 0
  for (const p of produtos) {
    const termos = gerarTermos(p.nome)
    console.log(`\n[${p.id}] ${p.nome}`)
    console.log(`  Termos: ${termos.join(' | ')}`)

    let img = null
    for (const termo of termos) {
      for (const base of FONTES_VTEX) {
        img = await buscarVTEX(base, termo)
        if (img) {
          console.log(`  ✅ ${base.replace('https://www.', '')} | "${termo}"`)
          console.log(`     ${img}`)
          achados++
          break
        }
        await delay(80)
      }
      if (img) break
    }

    if (!img) console.log(`  ✖ Não encontrado`)
  }

  console.log(`\n📊 Resultado: ${achados}/${produtos.length} encontrados`)
}

main().catch(console.error)
