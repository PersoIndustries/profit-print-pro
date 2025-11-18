/**
 * Script maestro que ejecuta todas las validaciones
 * Ejecutar con: node pre-launch/scripts/validate-all.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptsDir = __dirname;

const validations = [
  {
    name: 'Validación de Seguridad',
    script: 'validate-security-direct.js',
    critical: true
  },
  {
    name: 'Validación Pre-Lanzamiento Completa',
    script: 'pre-launch-validation.js',
    critical: true
  }
];

async function runValidation(validation) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 Ejecutando: ${validation.name}`);
  console.log(`${'═'.repeat(80)}\n`);
  
  try {
    const projectRoot = join(__dirname, '..', '..');
    const { stdout, stderr } = await execAsync(
      `node "${join(scriptsDir, validation.script)}"`,
      { 
        cwd: projectRoot,
        env: { ...process.env, NODE_PATH: projectRoot }
      }
    );
    
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
    
    return { success: true, validation };
  } catch (error) {
    console.error(`❌ Error en ${validation.name}:`);
    console.error(error.stdout || error.message);
    
    if (validation.critical) {
      return { success: false, validation, error };
    } else {
      return { success: true, validation, warning: true };
    }
  }
}

async function runAllValidations() {
  console.log('🚀 EJECUTANDO TODAS LAS VALIDACIONES PRE-LANZAMIENTO\n');
  console.log('═'.repeat(80));
  
  const results = [];
  
  for (const validation of validations) {
    const result = await runValidation(validation);
    results.push(result);
  }
  
  // Resumen final
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN FINAL\n');
  
  const passed = results.filter(r => r.success && !r.warning).length;
  const warnings = results.filter(r => r.warning).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Validaciones pasadas: ${passed}`);
  console.log(`⚠️  Validaciones con advertencias: ${warnings}`);
  console.log(`❌ Validaciones fallidas: ${failed}\n`);
  
  if (failed > 0) {
    console.log('❌ VALIDACIONES CRÍTICAS FALLIDAS:\n');
    results
      .filter(r => !r.success)
      .forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.validation.name}`);
      });
    console.log('');
  }
  
  console.log('═'.repeat(80));
  
  if (failed === 0) {
    console.log('🎉 ¡Todas las validaciones críticas pasaron!');
    console.log('   Revisa el checklist manual antes de lanzar.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Hay validaciones críticas que deben resolverse antes del lanzamiento.\n');
    process.exit(1);
  }
}

runAllValidations().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

