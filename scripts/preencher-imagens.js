// scripts/preencher-imagens.js
const fetch = require('node-fetch')   
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const BATCH_SIZE = 50
const DELAY_MS = 1200

// --------------------------------------------------
// UTILIDADES
// --------------------------------------------------

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function gerarTermoBusca(nome) {
  return `${normalizar(nome)}`
}

// --------------------------------------------------
// BUSCA DE IMAGEM
// --------------------------------------------------

async function buscarImagemVTEX(produto) {
  try {
    const termo = gerarTermoBusca(produto.nome)

    const urlBusca = `https://www.drogariasaopaulo.com.br/api/catalog_system/pub/products/search/${encodeURIComponent(termo)}`

    const response = await fetch(urlBusca, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!response.ok) {
      console.log(`❌ Erro VTEX: ${produto.nome}`)
      return null
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⚠️ Nenhuma imagem encontrada: ${produto.nome}`)
      return null
    }

    const item = data[0]

    const imagem =
      item?.items?.[0]?.images?.[0]?.imageUrl ||
      item?.items?.[0]?.images?.[0]?.imageTag

    if (!imagem) {
      console.log(`⚠️ Produto sem imagem: ${produto.nome}`)
      return null
    }

    return imagem
  } catch (err) {
    console.log(`❌ Falha busca ${produto.nome}`)
    return null
  }
}

// --------------------------------------------------
// VERIFICAR DUPLICAÇÃO
// --------------------------------------------------

async function imagemJaExiste(url) {
  const { count } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .eq('imagem_url', url)

  return count > 0
}

// --------------------------------------------------
// ATUALIZAR PRODUTO
// --------------------------------------------------

async function atualizarImagem(id, imagem_url) {
  const { error } = await supabase
    .from('produtos')
    .update({ imagem_url })
    .eq('id', id)

  if (error) {
    console.log(`❌ Erro update ID ${id}`)
    return false
  }

  return true
}

// --------------------------------------------------
// PROCESSAMENTO
// --------------------------------------------------

async function processarBatch() {
  console.log('🔎 Buscando produtos sem imagem...\n')

  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, nome')
    .is('imagem_url', null)
    .limit(BATCH_SIZE)

  if (error) {
    console.log('❌ Erro ao buscar produtos')
    console.log(error)
    return
  }

  if (!produtos || produtos.length === 0) {
    console.log('✅ Todos os produtos possuem imagem.')
    return
  }

  console.log(`📦 Batch encontrado: ${produtos.length} produtos\n`)

  let sucesso = 0
  let falhas = 0
  let ignorados = 0

  for (const produto of produtos) {
    console.log(`🔍 ${produto.nome}`)

    const imagem = await buscarImagemVTEX(produto)

    if (!imagem) {
      falhas++
      await delay(DELAY_MS)
      continue
    }

    const duplicada = await imagemJaExiste(imagem)

    if (duplicada) {
      console.log(`⚠️ Imagem duplicada`)
      ignorados++
      await delay(DELAY_MS)
      continue
    }

    const atualizado = await atualizarImagem(produto.id, imagem)

    if (atualizado) {
      console.log(`✅ Atualizado`)
      sucesso++
    } else {
      falhas++
    }

    await delay(DELAY_MS)
  }

  console.log('\n--------------------------------')
  console.log(`✅ Sucesso: ${sucesso}`)
  console.log(`⚠️ Ignorados: ${ignorados}`)
  console.log(`❌ Falhas: ${falhas}`)
  console.log('--------------------------------\n')
}

// --------------------------------------------------
// LOOP CONTÍNUO
// --------------------------------------------------

async function iniciar() {
  while (true) {
    await processarBatch()

    console.log('⏳ Aguardando próximo batch...\n')

    await delay(5000)
  }
}

iniciar()