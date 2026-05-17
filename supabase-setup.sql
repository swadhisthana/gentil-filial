-- ============================================
-- GENTIL FILIAL — Script de configuração Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================

-- 1. Tabela de filiais
CREATE TABLE filiais (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL
);

INSERT INTO filiais (nome) VALUES
  ('FILIAL 1'), ('FILIAL 2'), ('FILIAL 3'), ('FILIAL 4'), ('FILIAL 5'),
  ('FILIAL 6'), ('FILIAL 7'), ('FILIAL 8'), ('FILIAL 9'), ('FILIAL 10');

-- 2. Tabela de usuários (autenticação própria simples)
CREATE TABLE usuarios (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  usuario   TEXT NOT NULL UNIQUE,
  senha     TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('farmaceutico', 'gestor')),
  filial_id INTEGER REFERENCES filiais(id)
);

-- Gestor (não tem filial)
INSERT INTO usuarios (nome, usuario, senha, tipo, filial_id) VALUES
  ('Gestor Geral', 'gestor', 'gentil2024', 'gestor', NULL);

-- Farmacêuticos (um por filial — adicione mais conforme necessário)
INSERT INTO usuarios (nome, usuario, senha, tipo, filial_id) VALUES
  ('Ana Costa',      'filial1',  'filial1',  'farmaceutico', 1),
  ('Bruno Lima',     'filial2',  'filial2',  'farmaceutico', 2),
  ('Carla Souza',    'filial3',  'filial3',  'farmaceutico', 3),
  ('Diego Nunes',    'filial4',  'filial4',  'farmaceutico', 4),
  ('Elaine Ferraz',  'filial5',  'filial5',  'farmaceutico', 5),
  ('Felipe Moura',   'filial6',  'filial6',  'farmaceutico', 6),
  ('Gabriela Melo',  'filial7',  'filial7',  'farmaceutico', 7),
  ('Henrique Ramos', 'filial8',  'filial8',  'farmaceutico', 8),
  ('Isabela Rocha',  'filial9',  'filial9',  'farmaceutico', 9),
  ('João Alves',     'filial10', 'filial10', 'farmaceutico', 10);

-- 3. Tabela de produtos
CREATE TABLE produtos (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('medicamento', 'cosmético', 'alimento'))
);

-- Medicamentos
INSERT INTO produtos (nome, categoria) VALUES
  ('Paracetamol 500mg', 'medicamento'),
  ('Paracetamol 750mg', 'medicamento'),
  ('Dipirona 500mg', 'medicamento'),
  ('Ibuprofeno 400mg', 'medicamento'),
  ('Ibuprofeno 600mg', 'medicamento'),
  ('Amoxicilina 500mg', 'medicamento'),
  ('Azitromicina 500mg', 'medicamento'),
  ('Omeprazol 20mg', 'medicamento'),
  ('Omeprazol 40mg', 'medicamento'),
  ('Losartana 50mg', 'medicamento'),
  ('Losartana 100mg', 'medicamento'),
  ('Atenolol 25mg', 'medicamento'),
  ('Metformina 500mg', 'medicamento'),
  ('Metformina 850mg', 'medicamento'),
  ('Sinvastatina 20mg', 'medicamento'),
  ('Sinvastatina 40mg', 'medicamento'),
  ('Enalapril 10mg', 'medicamento'),
  ('Clonazepam 0,5mg', 'medicamento'),
  ('Clonazepam 2mg', 'medicamento'),
  ('Loratadina 10mg', 'medicamento'),
  ('Cetirizina 10mg', 'medicamento'),
  ('Dexametasona 4mg', 'medicamento'),
  ('Prednisolona 20mg', 'medicamento'),
  ('Levofloxacino 500mg', 'medicamento'),
  ('Ciprofloxacino 500mg', 'medicamento'),
  ('Fluconazol 150mg', 'medicamento'),
  ('Metoclopramida 10mg', 'medicamento'),
  ('Ondansetrona 8mg', 'medicamento'),
  ('Soro Fisiológico 250ml', 'medicamento'),
  ('Soro Fisiológico 500ml', 'medicamento'),
  ('Vitamina C 500mg', 'medicamento'),
  ('Vitamina D 2000UI', 'medicamento'),
  ('Ácido Fólico 5mg', 'medicamento'),
  ('Sulfato Ferroso 40mg', 'medicamento'),
  ('Rivotril 0,5mg', 'medicamento'),
  ('Insulina Regular 100UI', 'medicamento'),
  ('Glibenclamida 5mg', 'medicamento'),
  ('Captopril 25mg', 'medicamento'),
  ('Furosemida 40mg', 'medicamento'),
  ('Espironolactona 25mg', 'medicamento'),
  ('Ranitidina 150mg', 'medicamento'),
  ('Pantoprazol 40mg', 'medicamento'),
  ('Bisacodil 5mg', 'medicamento'),
  ('Lactulose Xarope', 'medicamento'),
  ('Salbutamol Spray', 'medicamento'),
  ('Budesonida Spray', 'medicamento'),
  ('Betametasona Creme', 'medicamento'),
  ('Nistatina Creme', 'medicamento'),
  ('Cetoconazol Shampoo', 'medicamento'),
  ('Ambroxol Xarope', 'medicamento');

-- Cosméticos
INSERT INTO produtos (nome, categoria) VALUES
  ('Protetor Solar FPS 30', 'cosmético'),
  ('Protetor Solar FPS 50', 'cosmético'),
  ('Hidratante Corporal 200ml', 'cosmético'),
  ('Hidratante Facial 50g', 'cosmético'),
  ('Shampoo Antiqueda 200ml', 'cosmético'),
  ('Condicionador 200ml', 'cosmético'),
  ('Sabonete Íntimo', 'cosmético'),
  ('Desodorante Roll-On', 'cosmético'),
  ('Creme Anti-Idade 30g', 'cosmético'),
  ('Sérum Vitamina C', 'cosmético'),
  ('Pomada Cicatrizante', 'cosmético'),
  ('Óleo de Amêndoas 60ml', 'cosmético'),
  ('Esfoliante Facial', 'cosmético'),
  ('Máscara Capilar 300g', 'cosmético');

-- Alimentos
INSERT INTO produtos (nome, categoria) VALUES
  ('Whey Protein 1kg', 'alimento'),
  ('Albumina 500g', 'alimento'),
  ('Leite em Pó 400g', 'alimento'),
  ('Achocolatado 200ml', 'alimento'),
  ('Barra de Cereal', 'alimento'),
  ('Chá Verde 20 sachês', 'alimento'),
  ('Adoçante Sucralose', 'alimento'),
  ('Gatorade 500ml', 'alimento'),
  ('Suplemento Vitamínico Infantil', 'alimento'),
  ('Pasta de Amendoim 500g', 'alimento');

-- 4. Tabela de solicitações
CREATE TABLE solicitacoes (
  id               SERIAL PRIMARY KEY,
  filial_id        INTEGER NOT NULL REFERENCES filiais(id),
  farmaceutico_id  INTEGER NOT NULL REFERENCES usuarios(id),
  status           TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido')),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em     TIMESTAMPTZ
);

-- 5. Tabela de itens da solicitação
CREATE TABLE itens_solicitacao (
  id              SERIAL PRIMARY KEY,
  solicitacao_id  INTEGER NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
  produto_id      INTEGER NOT NULL REFERENCES produtos(id),
  quantidade      INTEGER NOT NULL CHECK (quantidade > 0)
);

-- 6. Habilitar Row Level Security (RLS) e criar policies permissivas para anon
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_solicitacao ENABLE ROW LEVEL SECURITY;

-- Policies: permite leitura e escrita para chave anônima (acesso controlado pelo app)
CREATE POLICY "acesso_total" ON filiais FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total" ON usuarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total" ON produtos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total" ON solicitacoes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "acesso_total" ON itens_solicitacao FOR ALL TO anon USING (true) WITH CHECK (true);

-- 7. Habilitar Realtime para a tabela de solicitações
ALTER PUBLICATION supabase_realtime ADD TABLE solicitacoes;
