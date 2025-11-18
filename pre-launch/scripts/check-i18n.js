/**
 * Script para verificar localización (i18n) en componentes
 * Verifica que todos los textos estén traducidos
 * 
 * Ejecutar con: node pre-launch/scripts/check-i18n.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Archivos a verificar
const filesToCheck = [
  'src/components/Header.tsx',
  'src/pages/ShoppingList.tsx',
  'src/pages/Inventory.tsx'
];

// Textos en español que deberían estar traducidos
const spanishTexts = [
  'Materiales', 'Inventario', 'Lista de la Compra', 'Proyectos', 
  'Operaciones', 'Impresiones', 'Catálogos', 'Acerca de',
  'Nueva Lista', 'Agregar Item', 'Cargando listas', 
  'Selecciona una lista', 'Organiza tus compras',
  'Editar Item', 'Editar Lista', 'Crear', 'Guardar',
  'Cancelar', 'Eliminar', 'Lista:', 'Nombre de la Lista',
  'Pendientes', 'Completados', 'Precio total estimado',
  'Cantidad', 'Precio Estimado', 'Notas', 'Nombre'
];

function checkFile(filePath) {
  const fullPath = join(projectRoot, filePath);
  
  if (!existsSync(fullPath)) {
    return { file: filePath, errors: [`Archivo no existe: ${filePath}`] };
  }

  const content = readFileSync(fullPath, 'utf-8');
  const errors = [];
  const warnings = [];
  
  // Verificar si usa useTranslation
  const usesTranslation = content.includes('useTranslation') || content.includes('t(');
  
  // Buscar textos hardcodeados en español
  spanishTexts.forEach(text => {
    // Buscar el texto como string literal (con comillas)
    const regex = new RegExp(`["']${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g');
    const matches = content.match(regex);
    
    if (matches) {
      // Verificar que no esté dentro de un t()
      const lines = content.split('\n');
      matches.forEach(() => {
        const lineIndex = lines.findIndex(line => line.includes(`"${text}"`) || line.includes(`'${text}'`));
        if (lineIndex !== -1) {
          const line = lines[lineIndex];
          // Si no está dentro de t() y no es un comentario
          if (!line.includes('t(') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            errors.push(`Línea ${lineIndex + 1}: Texto hardcodeado "${text}" sin traducir`);
          }
        }
      });
    }
  });
  
  // Buscar patrones comunes de textos sin traducir
  const hardcodedPatterns = [
    /(?:title|label|placeholder|text|content)\s*[:=]\s*["']([A-ZÁÉÍÓÚÑ][^"']{3,})["']/g,
    /<[^>]+>([A-ZÁÉÍÓÚÑ][^<]{3,})<\/[^>]+>/g
  ];
  
  hardcodedPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1];
      // Ignorar si está en comentarios o ya está en t()
      const context = content.substring(Math.max(0, match.index - 50), match.index + match[0].length);
      if (!context.includes('t(') && !context.includes('//') && !context.includes('*')) {
        if (spanishTexts.some(st => text.includes(st))) {
          warnings.push(`Posible texto sin traducir: "${text.substring(0, 30)}..."`);
        }
      }
    }
  });
  
  return {
    file: filePath,
    usesTranslation,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)]
  };
}

function checkTranslations() {
  console.log('🔍 Verificando Localización (i18n)\n');
  console.log('═'.repeat(80));
  
  const results = [];
  
  filesToCheck.forEach(file => {
    const result = checkFile(file);
    results.push(result);
  });
  
  // Mostrar resultados
  results.forEach(result => {
    console.log(`\n📄 ${result.file}`);
    console.log(`   Usa traducciones: ${result.usesTranslation ? '✅' : '❌'}`);
    
    if (result.errors.length > 0) {
      console.log(`   ❌ Errores (${result.errors.length}):`);
      result.errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Advertencias (${result.warnings.length}):`);
      result.warnings.slice(0, 5).forEach(warning => {
        console.log(`      - ${warning}`);
      });
      if (result.warnings.length > 5) {
        console.log(`      ... y ${result.warnings.length - 5} más`);
      }
    }
    
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`   ✅ Sin problemas detectados`);
    }
  });
  
  // Resumen
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN\n');
  console.log(`   Total de errores: ${totalErrors}`);
  console.log(`   Total de advertencias: ${totalWarnings}\n`);
  
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('🎉 ¡Todos los textos están traducidos!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Se encontraron textos sin traducir. Revisa los detalles arriba.\n');
    process.exit(totalErrors > 0 ? 1 : 0);
  }
}

checkTranslations();

