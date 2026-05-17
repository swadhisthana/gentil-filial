import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Filial = {
  id: number
  nome: string
}

export type Produto = {
  id: number
  nome: string
  categoria: 'medicamento' | 'cosmético' | 'alimento'
}

export type Usuario = {
  id: number
  nome: string
  usuario: string
  tipo: 'farmaceutico' | 'gestor'
  filial_id: number | null
  filial?: Filial
}

export type ItemSolicitacao = {
  id: number
  solicitacao_id: number
  produto_id: number
  quantidade: number
  produto?: Produto
}

export type Solicitacao = {
  id: number
  filial_id: number
  farmaceutico_id: number
  status: 'pendente' | 'concluido'
  criado_em: string
  concluido_em: string | null
  filial?: Filial
  farmaceutico?: Usuario
  itens?: ItemSolicitacao[]
}
