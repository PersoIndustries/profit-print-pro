#!/bin/bash
# Script para regenerar tipos TypeScript de Supabase
# Uso: ./scripts/regenerate-types.sh

echo "Regenerando tipos TypeScript de Supabase..."

# Verificar si Docker está corriendo
if ! docker ps &> /dev/null; then
    echo "Error: Docker no está corriendo o no está disponible."
    echo "Por favor, inicia Docker y vuelve a intentar."
    echo ""
    echo "Alternativa: Si estás usando Supabase Cloud, usa:"
    echo "  npx supabase gen types typescript --project-id <tu-project-id> > src/integrations/supabase/types.ts"
    exit 1
fi

# Regenerar tipos
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
    echo "✓ Tipos regenerados exitosamente en src/integrations/supabase/types.ts"
else
    echo "Error al regenerar tipos. Verifica que Supabase esté corriendo localmente."
    exit 1
fi

