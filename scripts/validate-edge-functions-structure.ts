/**
 * Script de Validación de Estructura de Edge Functions
 * 
 * Valida que todas las Edge Functions tengan la estructura correcta
 * sin necesidad de desplegarlas o ejecutarlas.
 * 
 * Uso:
 *   npx tsx scripts/validate-edge-functions-structure.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  functionName: string;
  hasIndexFile: boolean;
  hasCorsHeaders: boolean;
  hasAdminCheck: boolean;
  hasErrorHandling: boolean;
  hasStripeIntegration?: boolean;
  errors: string[];
  warnings: string[];
}

const requiredFunctions = [
  'admin-change-subscription-tier',
  'admin-process-refund',
  'admin-process-refund-request',
  'admin-cancel-subscription',
  'admin-delete-user',
  'admin-add-trial',
];

function validateFunction(functionName: string): ValidationResult {
  const result: ValidationResult = {
    functionName,
    hasIndexFile: false,
    hasCorsHeaders: false,
    hasAdminCheck: false,
    hasErrorHandling: false,
    errors: [],
    warnings: [],
  };

  const functionPath = join(process.cwd(), 'supabase', 'functions', functionName);
  const indexPath = join(functionPath, 'index.ts');

  // Verificar que existe el directorio
  try {
    const stats = statSync(functionPath);
    if (!stats.isDirectory()) {
      result.errors.push(`El path ${functionPath} no es un directorio`);
      return result;
    }
  } catch {
    result.errors.push(`No se encuentra el directorio: ${functionPath}`);
    return result;
  }

  // Verificar que existe index.ts
  try {
    const stats = statSync(indexPath);
    if (!stats.isFile()) {
      result.errors.push(`index.ts no es un archivo`);
      return result;
    }
    result.hasIndexFile = true;
  } catch {
    result.errors.push(`No se encuentra index.ts en ${functionPath}`);
    return result;
  }

  // Leer y validar el contenido
  try {
    const content = readFileSync(indexPath, 'utf-8');

    // Verificar CORS headers
    if (content.includes('corsHeaders') || content.includes('Access-Control-Allow-Origin')) {
      result.hasCorsHeaders = true;
    } else {
      result.warnings.push('No se encontraron headers CORS');
    }

    // Verificar verificación de admin
    if (
      content.includes('user_roles') &&
      content.includes('admin') &&
      (content.includes('role') || content.includes('has_role'))
    ) {
      result.hasAdminCheck = true;
    } else {
      result.errors.push('No se encontró verificación de permisos de admin');
    }

    // Verificar manejo de errores
    if (content.includes('try') && content.includes('catch') && content.includes('error')) {
      result.hasErrorHandling = true;
    } else {
      result.warnings.push('Manejo de errores podría ser mejorado');
    }

    // Verificar integración con Stripe (para funciones que la necesitan)
    const functionsWithStripe = [
      'admin-process-refund',
      'admin-process-refund-request',
      'admin-cancel-subscription',
      'admin-delete-user',
    ];

    if (functionsWithStripe.includes(functionName)) {
      if (content.includes('stripe') || content.includes('Stripe')) {
        result.hasStripeIntegration = true;
      } else {
        result.warnings.push('No se encontró integración con Stripe (puede ser opcional)');
      }
    }

    // Verificar que usa Service Role Key
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')) {
      // OK
    } else {
      result.warnings.push('No se encontró uso de Service Role Key');
    }

    // Verificar que tiene estructura de serve()
    if (content.includes('serve(') || content.includes('serve(async')) {
      // OK
    } else {
      result.errors.push('No se encontró la función serve()');
    }

    // Verificar que maneja OPTIONS para CORS
    if (content.includes('OPTIONS') || content.includes('req.method === \'OPTIONS\'')) {
      // OK
    } else {
      result.warnings.push('No se encontró manejo de requests OPTIONS para CORS');
    }
  } catch (error: any) {
    result.errors.push(`Error al leer el archivo: ${error.message}`);
  }

  return result;
}

async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Validación de Estructura de Edge Functions${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const results: ValidationResult[] = [];

  // Validar cada función requerida
  for (const functionName of requiredFunctions) {
    console.log(`${colors.cyan}Validando: ${functionName}${colors.reset}`);
    const result = validateFunction(functionName);
    results.push(result);

    // Mostrar resultados
    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log(`${colors.green}✓ ${functionName} - OK${colors.reset}`);
    } else {
      if (result.errors.length > 0) {
        console.log(`${colors.red}✗ ${functionName} - ERRORES${colors.reset}`);
        result.errors.forEach(err => console.log(`  ${colors.red}✗ ${err}${colors.reset}`));
      }
      if (result.warnings.length > 0) {
        console.log(`${colors.yellow}⚠ ${functionName} - ADVERTENCIAS${colors.reset}`);
        result.warnings.forEach(warn => console.log(`  ${colors.yellow}⚠ ${warn}${colors.reset}`));
      }
    }

    // Mostrar características encontradas
    const features = [];
    if (result.hasIndexFile) features.push('index.ts');
    if (result.hasCorsHeaders) features.push('CORS');
    if (result.hasAdminCheck) features.push('Admin Check');
    if (result.hasErrorHandling) features.push('Error Handling');
    if (result.hasStripeIntegration) features.push('Stripe');

    if (features.length > 0) {
      console.log(`  ${colors.cyan}Características: ${features.join(', ')}${colors.reset}`);
    }

    console.log('');
  }

  // Resumen
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Resumen${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const allValid = results.every(r => r.errors.length === 0);

  console.log(`Funciones validadas: ${results.length}`);
  console.log(`${colors.green}✓ Sin errores: ${results.filter(r => r.errors.length === 0).length}${colors.reset}`);
  console.log(`${colors.red}✗ Con errores: ${results.filter(r => r.errors.length > 0).length}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Advertencias: ${totalWarnings}${colors.reset}`);

  if (allValid) {
    console.log(`\n${colors.green}✓ Todas las funciones tienen la estructura correcta${colors.reset}`);
  } else {
    console.log(`\n${colors.red}✗ Algunas funciones tienen errores que deben corregirse${colors.reset}`);
  }

  process.exit(allValid ? 0 : 1);
}

main().catch(console.error);

