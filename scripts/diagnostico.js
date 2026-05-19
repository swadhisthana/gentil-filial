// scripts/diagnostico.js
const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  const { count: total } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })

  const { count: semImagem } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .is('imagem_url', null)

  const { count: comImagem } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .not('imagem_url', 'is', null)

  console.log(`\n📊 DIAGNÓSTICO`)
  console.log(`Total de produtos : ${total}`)
  console.log(`Com imagem        : ${comImagem}`)
  console.log(`Sem imagem        : ${semImagem}`)
  console.log(`Cobertura         : ${((comImagem / total) * 100).toFixed(1)}%\n`)

  // Listar os sem imagem
  const { data } = await supabase
    .from('produtos')
    .select('id, nome, categoria')
    .is('imagem_url', null)
    .order('nome')

  if (data && data.length > 0) {
    console.log('📋 PRODUTOS SEM IMAGEM:')
    data.forEach(p => console.log(`  [${p.id}] ${p.nome} (${p.categoria || 'sem categoria'})`))
  }
}

main().catch(console.error)
