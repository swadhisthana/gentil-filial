const fetch = require('node-fetch')

async function t() {
  // Teste 1: drogasil 'Always'
  let r = await fetch('https://www.drogasil.com.br/api/catalog_system/pub/products/search/Always', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  })
  console.log('drogasil Always → status:', r.status)
  if (r.ok) {
    const d = await r.json()
    console.log('  resultados:', d.length)
    if (d[0]) console.log('  imagem:', d[0]?.items?.[0]?.images?.[0]?.imageUrl)
  }

  // Teste 2: drogaria sp 'Carefree'
  r = await fetch('https://www.drogariasaopaulo.com.br/api/catalog_system/pub/products/search/Carefree', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  console.log('\ndrogariasaopaulo Carefree → status:', r.status)
  if (r.ok) {
    const d = await r.json()
    console.log('  resultados:', d.length)
    if (d[0]) console.log('  imagem:', d[0]?.items?.[0]?.images?.[0]?.imageUrl)
  }

  // Teste 3: panvel 'Carefree'
  r = await fetch('https://www.panvel.com/api/catalog_system/pub/products/search/Carefree', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  console.log('\npanvel Carefree → status:', r.status)
  if (r.ok) {
    const d = await r.json()
    console.log('  resultados:', d.length)
    if (d[0]) console.log('  imagem:', d[0]?.items?.[0]?.images?.[0]?.imageUrl)
  }

  // Teste 4: drogaraia 'Carefree'
  r = await fetch('https://www.drogaraia.com.br/api/catalog_system/pub/products/search/Carefree', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  console.log('\ndrogaraia Carefree → status:', r.status)
  if (r.ok) {
    const d = await r.json()
    console.log('  resultados:', d.length)
    if (d[0]) console.log('  imagem:', d[0]?.items?.[0]?.images?.[0]?.imageUrl)
  }

  // Teste 5: paguemenos 'Always'
  r = await fetch('https://www.paguemenos.com.br/api/catalog_system/pub/products/search/Always', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  console.log('\npaguemenos Always → status:', r.status)
  if (r.ok) {
    const d = await r.json()
    console.log('  resultados:', d.length)
    if (d[0]) console.log('  imagem:', d[0]?.items?.[0]?.images?.[0]?.imageUrl)
  }
}

t().catch(console.error)
