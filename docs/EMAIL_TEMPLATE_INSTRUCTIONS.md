# Instrucciones: Plantilla de Email de Confirmación

## 📧 Plantilla HTML Mejorada

He creado una plantilla HTML moderna y profesional para el email de confirmación de registro en Layer Suite.

## 🎨 Características

- ✅ Diseño responsive (se adapta a móviles y escritorio)
- ✅ Colores profesionales con gradiente púrpura/azul
- ✅ Botón de confirmación destacado
- ✅ Enlace alternativo si el botón no funciona
- ✅ Información sobre expiración del enlace
- ✅ Footer profesional
- ✅ Compatible con clientes de email más comunes

## 📋 Cómo Usar en Supabase

### Paso 1: Acceder a la Configuración de Emails

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** → **Email Templates**
3. Selecciona la pestaña **"Confirm sign up"**

### Paso 2: Copiar la Plantilla

1. Abre el archivo `docs/EMAIL_CONFIRMATION_TEMPLATE_SIMPLE.html`
2. Copia **todo el contenido** del archivo
3. En Supabase, cambia a la vista **"Source"** (no "Preview")
4. Pega el contenido completo, reemplazando el HTML existente

### Paso 3: Configurar el Asunto

**Para cada tipo de email, usa estos subjects:**

#### Confirm Sign Up:
- Español: `¡Confirma tu registro en Layer Suite!`
- English: `Welcome to Layer Suite - Confirm your email`

#### Change Email Address:
- Español: `Confirmar Cambio de Email`
- English: `Confirm Email Change`

#### Reset Password:
- Español: `Restablecer tu Contraseña`
- English: `Reset Your Password`

#### Reauthentication:
- Español: `Confirmar Reautenticación`
- English: `Confirm Reauthentication`

#### Invite User:
- Español: `¡Has Sido Invitado a Layer Suite!`
- English: `You've Been Invited to Layer Suite!`

#### Magic Link:
- Español: `Tu Enlace Mágico de Layer Suite`
- English: `Your Layer Suite Magic Link`

### Paso 4: Guardar

1. Haz clic en **"Save"** o **"Guardar"**
2. Verifica en la pestaña **"Preview"** que se ve correctamente

## 🔍 Variables Disponibles

Cada plantilla usa diferentes variables de Supabase según el tipo:

- **Confirm Sign Up / Magic Link / Reset Password / Invite User:**
  - `{{.ConfirmationURL}}` - URL de confirmación/enlace generada automáticamente
  - `{{.SiteURL}}` (solo Invite User) - URL del sitio

- **Change Email Address:**
  - `{{.ConfirmationURL}}` - URL de confirmación
  - `{{.Email}}` - Email actual del usuario
  - `{{.NewEmail}}` - Nuevo email del usuario

- **Reauthentication:**
  - `{{.Token}}` - Código de verificación (6 dígitos)

Todas estas variables se reemplazarán automáticamente por Supabase cuando se envíe el email.

## 🎨 Personalización

Si quieres cambiar los colores del gradiente, busca estas líneas en el HTML:

```html
background: linear-gradient(135deg, #F97316 0%, #3B82F6 100%);
```

Puedes cambiarlos por:
- **Azul**: `linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)`
- **Verde**: `linear-gradient(135deg, #10b981 0%, #059669 100%)`
- **Rojo**: `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`
- **Púrpura**: `linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)`

**Nota:** Los colores actuales (#F97316 y #3B82F6) coinciden con el diseño de tu web.

## 📱 Compatibilidad

La plantilla está diseñada para funcionar en:
- ✅ Gmail (web y móvil)
- ✅ Outlook (web y desktop)
- ✅ Apple Mail
- ✅ Yahoo Mail
- ✅ Clientes de email móviles

## ⚠️ Notas Importantes

1. **No elimines** la variable `{{.ConfirmationURL}}` - es esencial para que funcione
2. Mantén la estructura de tablas HTML - es necesaria para compatibilidad con emails
3. Los estilos inline son intencionales - muchos clientes de email no soportan CSS externo
4. Prueba el email después de guardarlo para verificar que funciona correctamente

## 🧪 Prueba

Para probar la plantilla:

1. Guarda los cambios en Supabase
2. Crea una cuenta de prueba con un email real
3. Verifica que recibes el email con el nuevo diseño
4. Confirma que el botón de confirmación funciona correctamente

## 📄 Archivos Disponibles

### Confirm Sign Up (Confirmar Registro):
**Español:**
- `EMAIL_CONFIRMATION_TEMPLATE_SIMPLE.html` - Versión simplificada (recomendada)
- `EMAIL_CONFIRMATION_TEMPLATE.html` - Versión completa

**English:**
- `EMAIL_CONFIRMATION_TEMPLATE_EN.html` - Versión simplificada (recomendada)
- `EMAIL_CONFIRMATION_TEMPLATE_FULL_EN.html` - Versión completa

### Change Email Address (Cambiar Email):
**Español:** `EMAIL_CHANGE_EMAIL_ES.html`  
**English:** `EMAIL_CHANGE_EMAIL_EN.html`

### Reset Password (Restablecer Contraseña):
**Español:** `EMAIL_RESET_PASSWORD_ES.html`  
**English:** `EMAIL_RESET_PASSWORD_EN.html`

### Reauthentication (Reautenticación):
**Español:** `EMAIL_REAUTHENTICATION_ES.html`  
**English:** `EMAIL_REAUTHENTICATION_EN.html`

### Invite User (Invitar Usuario):
**Español:** `EMAIL_INVITE_USER_ES.html`  
**English:** `EMAIL_INVITE_USER_EN.html`

### Magic Link (Enlace Mágico):
**Español:** `EMAIL_MAGIC_LINK_ES.html`  
**English:** `EMAIL_MAGIC_LINK_EN.html`

**Nota:** Todas las plantillas usan los mismos colores de la web (naranja #F97316 y azul #3B82F6) y están optimizadas para Supabase.

## 🎨 Colores del Diseño

Las plantillas ahora usan los mismos colores que tu web:
- **Primary (Naranja)**: `#F97316` (hsl(24 95% 53%))
- **Secondary (Azul)**: `#3B82F6` (hsl(217 91% 60%))
- **Gradiente**: De naranja a azul (135deg)

