/**
 * Script de Pruebas COMPLETAS para Edge Functions Administrativas
 * 
 * Este script requiere autenticación real como admin.
 * 
 * Uso:
 *   npx tsx scripts/test-admin-functions-with-auth.ts <admin-email> <admin-password>
 * 
 * Ejemplo:
 *   npx tsx scripts/test-admin-functions-with-auth.ts admin@example.com password123
 * 
 * ⚠️ ADVERTENCIA: Este script hace cambios REALES en la base de datos.
 * Solo úsalo en desarrollo o con datos de prueba.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_BASE_URL = process.env.VITE_SUPABASE_FUNCTION_URL || SUPABASE_URL?.replace('/rest/v1', '/functions/v1');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Faltan variables de entorno requeridas');
  console.error('   Necesitas: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Obtener credenciales de admin desde argumentos
const adminEmail = process.argv[2];
const adminPassword = process.argv[3];

if (!adminEmail || !adminPassword) {
  console.error('❌ Error: Faltan credenciales de admin');
  console.error('   Uso: npx tsx scripts/test-admin-functions-with-auth.ts <email> <password>');
  process.exit(1);
}

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  response?: any;
  duration: number;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let testUserId: string | null = null;

// Función helper para hacer requests a Edge Functions
async function invokeFunction(
  functionName: string,
  body: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!authToken) {
    return { success: false, error: 'No hay token de autenticación' };
  }

  const url = `${FUNCTION_BASE_URL}/${functionName}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

// Función para ejecutar un test
async function runTest(
  name: string,
  testFn: () => Promise<{ success: boolean; error?: string; data?: any }>
): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${colors.cyan}▶ ${name}${colors.reset}`);
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`${colors.green}✓ ${name} - OK${colors.reset} (${duration}ms)`);
      if (result.data && result.data.message) {
        console.log(`  ${colors.green}→ ${result.data.message}${colors.reset}`);
      }
      results.push({ name, success: true, response: result.data, duration });
    } else {
      console.log(`${colors.red}✗ ${name} - FAILED${colors.reset} (${duration}ms)`);
      console.log(`  ${colors.red}Error: ${result.error}${colors.reset}`);
      results.push({ name, success: false, error: result.error, duration });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}✗ ${name} - ERROR${colors.reset} (${duration}ms)`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    results.push({ name, success: false, error: error.message, duration });
  }
}

async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Tests COMPLETOS de Edge Functions Administrativas${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);

  // Crear cliente de Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  // Autenticarse como admin
  console.log(`\n${colors.yellow}🔐 Autenticando como admin...${colors.reset}`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (authError || !authData.session) {
    console.error(`${colors.red}❌ Error de autenticación: ${authError?.message}${colors.reset}`);
    process.exit(1);
  }

  authToken = authData.session.access_token;
  const adminUserId = authData.user.id;
  console.log(`${colors.green}✓ Autenticado como: ${adminEmail} (${adminUserId})${colors.reset}`);

  // Verificar que el usuario es admin
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUserId)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    console.error(`${colors.red}❌ El usuario no tiene permisos de administrador${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Permisos de administrador verificados${colors.reset}`);

  // Obtener un usuario de prueba (no admin, no eliminado)
  const { data: testUsers, error: testUserError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .neq('id', adminUserId)
    .is('deleted_at', null)
    .limit(1);

  if (testUserError || !testUsers || testUsers.length === 0) {
    console.error(`${colors.red}❌ No se encontró ningún usuario de prueba${colors.reset}`);
    console.error('   Crea un usuario de prueba primero');
    process.exit(1);
  }

  testUserId = testUsers[0].id;
  console.log(`${colors.green}✓ Usuario de prueba: ${testUsers[0].email} (${testUserId})${colors.reset}`);

  console.log(`\n${colors.yellow}⚠ ADVERTENCIA: Estos tests harán cambios REALES en la base de datos.${colors.reset}`);
  console.log(`${colors.yellow}   Asegúrate de estar en un entorno de desarrollo.${colors.reset}\n`);

  // Test 1: admin-add-trial
  await runTest('admin-add-trial: Agregar 7 días de trial', async () => {
    return await invokeFunction('admin-add-trial', {
      userId: testUserId,
      trialDays: 7,
      notes: 'Test automatizado - puede ser revertido',
    });
  });

  // Test 2: admin-change-subscription-tier (upgrade)
  await runTest('admin-change-subscription-tier: Cambiar a tier_1', async () => {
    return await invokeFunction('admin-change-subscription-tier', {
      userId: testUserId,
      newTier: 'tier_1',
      notes: 'Test automatizado',
    });
  });

  // Test 3: admin-change-subscription-tier (downgrade)
  await runTest('admin-change-subscription-tier: Cambiar a free (downgrade)', async () => {
    return await invokeFunction('admin-change-subscription-tier', {
      userId: testUserId,
      newTier: 'free',
      notes: 'Test automatizado - downgrade',
    });
  });

  // Test 4: admin-add-trial (otra vez para restaurar)
  await runTest('admin-add-trial: Restaurar trial (15 días)', async () => {
    return await invokeFunction('admin-add-trial', {
      userId: testUserId,
      trialDays: 15,
      notes: 'Test automatizado - restauración',
    });
  });

  // Test 5: Verificar que las funciones rechazan usuarios no admin
  // (Este test requiere crear un token de usuario no admin, más complejo)

  // Resumen
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Resumen de Tests${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${colors.green}✓ Exitosos: ${successful}${colors.reset}`);
  console.log(`${colors.red}✗ Fallidos: ${failed}${colors.reset}`);
  console.log(`⏱  Tiempo total: ${totalDuration}ms`);

  if (failed > 0) {
    console.log(`\n${colors.red}Tests fallidos:${colors.reset}`);
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${colors.red}✗ ${r.name}${colors.reset}`);
        if (r.error) console.log(`    ${r.error}`);
      });
  }

  console.log(`\n${colors.yellow}⚠ NOTA: Los cambios realizados en el usuario de prueba pueden necesitar limpieza manual.${colors.reset}`);

  // Cerrar sesión
  await supabase.auth.signOut();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

