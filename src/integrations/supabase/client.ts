import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Obtener variables de entorno
// En Vite, las variables de entorno deben comenzar con VITE_ para ser expuestas al cliente
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén definidas
if (!SUPABASE_URL) {
  const errorMessage = 
    '❌ Error de configuración: VITE_SUPABASE_URL no está definida.\n\n' +
    'Por favor, configura esta variable de entorno:\n' +
    '- En desarrollo local: crea un archivo .env.local con VITE_SUPABASE_URL=tu_url\n' +
    '- En Netlify: ve a Site settings → Environment variables y agrega VITE_SUPABASE_URL\n\n' +
    'Ver NETLIFY_ENV_SETUP.md para más detalles.';
  console.error(errorMessage);
  throw new Error('Missing env.VITE_SUPABASE_URL');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  const errorMessage = 
    '❌ Error de configuración: VITE_SUPABASE_ANON_KEY no está definida.\n\n' +
    'Por favor, configura esta variable de entorno:\n' +
    '- En desarrollo local: crea un archivo .env.local con VITE_SUPABASE_ANON_KEY=tu_clave\n' +
    '- En Netlify: ve a Site settings → Environment variables y agrega VITE_SUPABASE_ANON_KEY\n\n' +
    'Ver NETLIFY_ENV_SETUP.md para más detalles.';
  console.error(errorMessage);
  throw new Error('Missing env.VITE_SUPABASE_ANON_KEY');
}

// Verificar que las variables no sean valores placeholder
if (SUPABASE_URL.includes('your_supabase_url') || SUPABASE_URL.includes('tu_url')) {
  console.warn('⚠️ Advertencia: VITE_SUPABASE_URL parece ser un valor placeholder. Asegúrate de usar la URL real de tu proyecto Supabase.');
}

if (SUPABASE_PUBLISHABLE_KEY.includes('your_supabase') || SUPABASE_PUBLISHABLE_KEY.includes('tu_clave')) {
  console.warn('⚠️ Advertencia: VITE_SUPABASE_ANON_KEY parece ser un valor placeholder. Asegúrate de usar la clave real de tu proyecto Supabase.');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});