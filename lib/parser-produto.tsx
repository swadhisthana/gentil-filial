/**
 * Extrai forma farmacêutica e quantidade do nome do produto.
 * Ex: "Decongex Plus C/4 Cpr" → { forma: 'Comprimido', qtd: 4 }
 *     "Allegra 180Mg Caps C/10" → { forma: 'Cápsula', qtd: 10 }
 */

const FORMAS: Array<[RegExp, string, string]> = [
  // [regex, label, svg-icon-name]
  [/\bcps\b|\bcaps?\b|\bcápsulas?\b|\bcapsulas?\b/i, 'Cápsula', 'capsule'],
  [/\bcpr\b|\bcomprimidos?\b|\bcomp\b/i, 'Comprimido', 'pill'],
  [/\bdrg\b|\bdrágeas?\b|\bdrageas?\b/i, 'Drágea', 'pill'],
  [/\bsol\b|\bsolução\b|\bsolucao\b|xarope|gotas/i, 'Líquido', 'liquid'],
  [/\bpo\b|\bpó\b|\bpomada\b/i, 'Pomada', 'tube'],
  [/\bcreme\b/i, 'Creme', 'tube'],
  [/\bspray\b|aerosol|aerossol/i, 'Spray', 'spray'],
  [/\binj\b|\binjeção\b|\binjecao\b|\bampola\b/i, 'Injeção', 'syringe'],
  [/\benv\b|\benvelope\b|\bsache\b|\bsachê\b/i, 'Envelope', 'envelope'],
  [/\bml\b/i, 'Líquido', 'liquid'],
]

export type FormaInfo = {
  forma: string
  qtd: number | null
  embalagem: string // "Caixa com X cápsulas" ou ''
  icon: string
}

export function extrairForma(nome: string, categoria: string): FormaInfo {
  // Padrões para detectar quantidade
  // "C/X" "X CPR" "X CAPS" "X COMPRIMIDOS"
  let qtd: number | null = null
  const mQtd1 = nome.match(/\bc\/\s*(\d+)/i)
  const mQtd2 = nome.match(/\b(\d+)\s*(?:cpr|cps?|caps?|comp|drg|env)\b/i)
  if (mQtd1) qtd = parseInt(mQtd1[1])
  else if (mQtd2) qtd = parseInt(mQtd2[1])

  // Detecta forma
  let forma = ''
  let icon = 'pill'
  for (const [rx, label, ic] of FORMAS) {
    if (rx.test(nome)) {
      forma = label
      icon = ic
      break
    }
  }

  // Fallback por categoria
  if (!forma) {
    if (categoria === 'cosmético') { forma = 'Cosmético'; icon = 'tube' }
    else if (categoria === 'alimento') { forma = 'Alimento'; icon = 'food' }
    else { forma = 'Medicamento'; icon = 'pill' }
  }

  // Plural do forma name para embalagem
  const plurais: Record<string, string> = {
    'Comprimido': 'comprimidos',
    'Cápsula': 'cápsulas',
    'Drágea': 'drágeas',
    'Envelope': 'envelopes',
    'Líquido': 'mL',
    'Injeção': 'ampolas',
    'Spray': 'unidades',
    'Pomada': 'g',
    'Creme': 'g',
  }
  const plural = plurais[forma] || 'unidades'
  const embalagem = qtd ? `Caixa com ${qtd} ${plural}` : ''

  return { forma, qtd, embalagem, icon }
}

// Ícones SVG para formas farmacêuticas
export function IconForma({ tipo, className = "" }: { tipo: string; className?: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className }
  switch (tipo) {
    case 'capsule':
      return (
        <svg {...props}>
          <path d="M8 8 L16 16 A 5.6 5.6 0 0 0 8 8 Z" fill="currentColor" opacity="0.5" />
          <path d="M16 16 L8 8 A 5.6 5.6 0 0 1 16 16 Z" />
          <rect x="3.5" y="10.5" width="17" height="3" rx="1.5" transform="rotate(-45 12 12)" />
        </svg>
      )
    case 'pill':
      return (
        <svg {...props}>
          <rect x="3" y="9" width="18" height="6" rx="3" />
          <line x1="12" y1="9" x2="12" y2="15" />
        </svg>
      )
    case 'liquid':
      return (
        <svg {...props}>
          <path d="M8 2 L8 8 L4 14 A 5 5 0 0 0 20 14 L16 8 L16 2 Z" />
          <line x1="8" y1="2" x2="16" y2="2" />
        </svg>
      )
    case 'tube':
      return (
        <svg {...props}>
          <rect x="3" y="8" width="14" height="8" rx="1" />
          <path d="M17 9 L21 7 L21 17 L17 15 Z" />
        </svg>
      )
    case 'syringe':
      return (
        <svg {...props}>
          <line x1="18" y1="2" x2="22" y2="6" />
          <line x1="14" y1="6" x2="20" y2="12" />
          <path d="M6 14 L10 18 L14 14 L8 8 Z" />
          <line x1="2" y1="20" x2="6" y2="16" />
        </svg>
      )
    case 'envelope':
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="12" rx="1" />
          <path d="M3 7 L12 13 L21 7" />
        </svg>
      )
    case 'spray':
      return (
        <svg {...props}>
          <rect x="8" y="9" width="8" height="12" rx="1" />
          <rect x="10" y="5" width="4" height="4" />
          <line x1="6" y1="2" x2="5" y2="3" />
          <line x1="18" y1="2" x2="19" y2="3" />
          <line x1="6" y1="6" x2="4" y2="5" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <rect x="3" y="9" width="18" height="6" rx="3" />
        </svg>
      )
  }
}
