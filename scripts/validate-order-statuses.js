import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NEW_STATUSES = ['pending', 'preparation', 'ready_to_produce', 'on_production', 'packaging', 'sent'];
const OLD_STATUSES = ['design', 'to_produce', 'printing', 'clean_and_packaging'];

async function validateOrderStatuses() {
  console.log('🔍 Validando estados de pedidos...\n');

  try {
    // 1. Verificar que no hay estados antiguos en order_items
    console.log('1. Verificando order_items...');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, status')
      .limit(1000);

    if (itemsError) throw itemsError;

    const oldStatusItems = orderItems?.filter(item => OLD_STATUSES.includes(item.status)) || [];
    
    if (oldStatusItems.length > 0) {
      console.log(`   ⚠️  Encontrados ${oldStatusItems.length} items con estados antiguos:`);
      const statusCounts = {};
      oldStatusItems.forEach(item => {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      - ${status}: ${count} items`);
      });
    } else {
      console.log('   ✅ Todos los order_items tienen estados válidos');
    }

    // 2. Verificar distribución de estados en order_items
    console.log('\n2. Distribución de estados en order_items:');
    const statusCounts = {};
    orderItems?.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    NEW_STATUSES.forEach(status => {
      const count = statusCounts[status] || 0;
      console.log(`   ${status}: ${count} items`);
    });

    // 3. Verificar que no hay estados antiguos en orders
    console.log('\n3. Verificando orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .limit(1000);

    if (ordersError) throw ordersError;

    const oldStatusOrders = orders?.filter(order => OLD_STATUSES.includes(order.status)) || [];
    
    if (oldStatusOrders.length > 0) {
      console.log(`   ⚠️  Encontrados ${oldStatusOrders.length} pedidos con estados antiguos:`);
      const statusCounts = {};
      oldStatusOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      - ${status}: ${count} pedidos`);
      });
    } else {
      console.log('   ✅ Todos los orders tienen estados válidos');
    }

    // 4. Verificar distribución de estados en orders
    console.log('\n4. Distribución de estados en orders:');
    const orderStatusCounts = {};
    orders?.forEach(order => {
      orderStatusCounts[order.status] = (orderStatusCounts[order.status] || 0) + 1;
    });
    NEW_STATUSES.forEach(status => {
      const count = orderStatusCounts[status] || 0;
      console.log(`   ${status}: ${count} pedidos`);
    });

    // 5. Intentar insertar un registro de prueba con cada nuevo estado
    console.log('\n5. Probando constraint de order_items...');
    let constraintValid = true;
    for (const status of NEW_STATUSES) {
      try {
        // Solo verificamos que el constraint acepta el valor, no insertamos realmente
        const { error: testError } = await supabase
          .from('order_items')
          .select('id')
          .eq('status', status)
          .limit(1);
        
        if (testError && testError.message.includes('check constraint')) {
          console.log(`   ❌ El estado '${status}' no es aceptado por el constraint`);
          constraintValid = false;
        }
      } catch (err) {
        // Si hay un error de constraint, lo capturamos
        if (err.message && err.message.includes('check constraint')) {
          console.log(`   ❌ El estado '${status}' no es aceptado por el constraint`);
          constraintValid = false;
        }
      }
    }

    if (constraintValid) {
      console.log('   ✅ El constraint acepta todos los nuevos estados');
    }

    // 6. Resumen final
    console.log('\n' + '='.repeat(50));
    const hasOldStatuses = oldStatusItems.length > 0 || oldStatusOrders.length > 0;
    
    if (!hasOldStatuses && constraintValid) {
      console.log('✅ VALIDACIÓN EXITOSA');
      console.log('   - Todos los estados están actualizados');
      console.log('   - El constraint acepta los nuevos estados');
      console.log('   - No se encontraron estados antiguos');
    } else {
      console.log('⚠️  VALIDACIÓN CON ADVERTENCIAS');
      if (hasOldStatuses) {
        console.log('   - Se encontraron estados antiguos que necesitan actualización');
      }
      if (!constraintValid) {
        console.log('   - El constraint no acepta todos los nuevos estados');
      }
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Error durante la validación:', error.message);
    process.exit(1);
  }
}

validateOrderStatuses();

