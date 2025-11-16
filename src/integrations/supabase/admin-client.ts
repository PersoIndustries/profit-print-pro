/**
 * ⚠️ CLIENTE ADMIN - SOLO PARA USO EN DESARROLLO/SCRIPTS ⚠️
 * 
 * Este cliente usa la Service Role Key que tiene permisos completos de administración.
 * 
 * ⚠️ NUNCA uses este cliente en el frontend o código que se ejecute en el navegador.
 * ⚠️ NUNCA commitees la Service Role Key al repositorio.
 * ⚠️ SOLO úsalo en:
 *    - Scripts de migración
 *    - Operaciones server-side
 *    - Herramientas de desarrollo local
 * 
 * Para operaciones normales del frontend, usa el cliente en client.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Service Role Key - SOLO para operaciones admin
// Esta clave tiene permisos completos y debe mantenerse SECRETA
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validar que las variables estén definidas
if (!SUPABASE_URL) {
  throw new Error('Missing env.VITE_SUPABASE_URL');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY no está definida.\n' +
    'Este cliente admin solo funcionará si defines esta variable.\n' +
    'Para obtenerla: Supabase Dashboard → Settings → API → service_role key (secret)\n' +
    '⚠️ NUNCA uses esta clave en el frontend. Solo para scripts/desarrollo.'
  );
}

/**
 * Cliente de Supabase con permisos de administrador
 * Bypassa Row Level Security (RLS) y tiene acceso completo a la base de datos
 */
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Verifica si el cliente admin está disponible
 */
export const isAdminClientAvailable = () => {
  return supabaseAdmin !== null;
};


