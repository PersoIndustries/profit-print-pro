# 📋 Reporte de Localización (i18n)

## Textos sin traducir encontrados

### 1. Header.tsx (Menú)

**Textos hardcodeados encontrados:**
- `"Materiales"` (línea 149) - Menú principal
- `"Inventario"` (línea 156) - Submenú
- `"Lista de la Compra"` (línea 160) - Submenú
- `"Proyectos"` (línea 172) - Menú principal
- `"Catálogos"` (línea 188) - Submenú
- `"Operaciones"` (línea 201) - Menú principal
- `"Impresiones"` (línea 212) - Submenú
- `"Acerca de"` (líneas 65, 91) - Link en header auth/landing

### 2. ShoppingList.tsx (Lista de la Compra)

**Textos hardcodeados encontrados:**
- `"Cargando listas..."` (línea 321)
- `"Lista de la Compra"` (línea 333) - Título
- `"Organiza tus compras en múltiples listas"` (línea 336) - Subtítulo
- `"Nueva Lista"` (línea 342) - Botón
- `"Agregar Item"` (línea 346) - Botón
- `"Lista:"` (línea 355) - Label
- `"Selecciona una lista"` (línea 358) - Placeholder
- `"Editar Lista"` (línea 378) - Menú dropdown
- `"Eliminar Lista"` (línea 385) - Menú dropdown
- `"No tienes listas creadas"` (línea 398)
- `"Crea tu primera lista para comenzar"` (línea 399)
- `"Crear primera lista"` (línea 402) - Botón
- `"Selecciona una lista"` (línea 410)
- `"Elige una lista de la compra para ver sus items"` (línea 411)
- `"La lista \"{name}\" está vacía"` (línea 418)
- `"Agrega items a esta lista"` (línea 419)
- `"Agregar primer item"` (línea 422) - Botón
- `"Precio total estimado:"` (línea 433)
- `"Pendientes ({count})"` (línea 446)
- `"Completados ({count})"` (línea 509)
- `"Cantidad: {quantity}"` (líneas 467, 531)
- `"Precio estimado: {price} €"` (líneas 473, 537)
- `"Editar Item"` / `"Agregar Item"` (línea 576) - Título dialog
- `"Nombre *"` (línea 581) - Label
- `"Cantidad"` (línea 589) - Label
- `"Precio Estimado (€)"` (línea 597) - Label
- `"Notas"` (línea 608) - Label
- `"Cancelar"` (línea 618) - Botón
- `"Guardar"` / `"Agregar"` (línea 621) - Botón
- `"Editar Lista"` / `"Nueva Lista"` (línea 632) - Título dialog
- `"Nombre de la Lista *"` (línea 637) - Label
- `"Crear"` (línea 641) - Botón

### 3. Inventory.tsx

**Estado:** ✅ Ya usa traducciones correctamente (t('inventory.*'))

## Acciones necesarias

1. Agregar claves de traducción faltantes a `src/i18n/locales/es.json`, `en.json`, `fr.json`
2. Actualizar `Header.tsx` para usar `t('nav.*')`
3. Actualizar `ShoppingList.tsx` para usar `t('shoppingList.*')`

