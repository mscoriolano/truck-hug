-- Adicionar campos de medição de sulco do pneu
ALTER TABLE public.tires 
ADD COLUMN tread_depth DECIMAL(4,1) DEFAULT NULL,
ADD COLUMN min_tread_depth DECIMAL(4,1) DEFAULT 1.6,
ADD COLUMN warning_tread_depth DECIMAL(4,1) DEFAULT 3.0,
ADD COLUMN good_tread_depth DECIMAL(4,1) DEFAULT 5.0;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.tires.tread_depth IS 'Profundidade atual do sulco em mm';
COMMENT ON COLUMN public.tires.min_tread_depth IS 'Limite crítico do sulco em mm (padrão 1.6mm legal)';
COMMENT ON COLUMN public.tires.warning_tread_depth IS 'Limite de atenção do sulco em mm';
COMMENT ON COLUMN public.tires.good_tread_depth IS 'Limite para considerar bom estado em mm';