-- Adiciona campos CRF e Turno na tabela de usuários (farmacêuticos)
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS crf TEXT,
  ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'manha'
    CHECK (turno IN ('manha', 'noite'));

-- Garante que codigo_barras e fabricante existem em produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS fabricante TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
