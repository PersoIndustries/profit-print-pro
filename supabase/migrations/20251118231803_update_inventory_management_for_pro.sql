-- Actualizar inventory_management para que Pro también tenga acceso al stock
UPDATE public.tier_features
SET tier_1 = true
WHERE feature_key = 'inventory_management';

