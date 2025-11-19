# Script para regenerar tipos TypeScript de Supabase
# Uso: .\scripts\regenerate-types.ps1

Write-Host "Regenerando tipos TypeScript de Supabase..." -ForegroundColor Cyan

# Verificar si Docker está corriendo
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker no está corriendo o no está disponible." -ForegroundColor Red
    Write-Host "Por favor, inicia Docker Desktop y vuelve a intentar." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternativa: Si estás usando Supabase Cloud, usa:" -ForegroundColor Yellow
    Write-Host "  npx supabase gen types typescript --project-id <tu-project-id> > src/integrations/supabase/types.ts" -ForegroundColor Cyan
    exit 1
}

# Regenerar tipos
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Tipos regenerados exitosamente en src/integrations/supabase/types.ts" -ForegroundColor Green
} else {
    Write-Host "Error al regenerar tipos. Verifica que Supabase esté corriendo localmente." -ForegroundColor Red
    exit 1
}

