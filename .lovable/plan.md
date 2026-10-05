# Tipos de material personalizables

## Situación actual
- Cada material ya tiene un campo "tipo", pero es una lista fija (Filamento, Resina, Pegamento, Llavero, Tornillo, Pintura, Lija, Otros) que sirve sobre todo para mostrar el icono.
- Ahora mismo hay 27 materiales de tipo "Filamento" y 3 de tipo "Otros". Con esta lista no se puede distinguir entre PLA Basic, Matte, Silk, ABS o PETG.
- Al añadir un material a un proyecto, el selector muestra todos los materiales mezclados.

## Propuesta: dos niveles
```text
Categoría (fija, decide el icono)  ->  Tipo (lo crea el usuario)  ->  Material
Filamento                           ->  PLA Basic / Matte / Silk / ABS
Otros                               ->  Plate X / Imanes ...
```
- **Categoría**: se queda la lista fija actual, así no se pierden los iconos ni los filtros que ya existen.
- **Tipo**: lo gestiona cada usuario. Tiene nombre y categoría, y se puede crear, editar y borrar. Al empezar se añaden tipos sugeridos (PLA Basic, PLA Matte, Silk, PETG, ABS, TPU).

## Qué cambia para el usuario
1. **Crear o editar un material**: eliges la categoría y luego el tipo. Desde ese mismo selector puedes crear un tipo nuevo con "+ Nuevo tipo".
2. **Gestionar tipos**: una pequeña sección en Inventario para ver, renombrar y borrar tipos. No se puede borrar un tipo si tiene materiales; antes hay que reasignarlos.
3. **Proyectos y calculadora**: en cada línea de material eliges primero el tipo y después el material, ya filtrado. El tipo es opcional, así que puedes seguir buscando entre todos los materiales.
4. **Stock y adquisiciones**: un filtro nuevo por tipo y el tipo visible junto al nombre.

## Repercusiones y riesgos
- **Materiales existentes**: se quedan sin tipo hasta que el usuario lo asigne. Se pueden marcar como "Sin tipo" para encontrarlos fácilmente. No se pierde nada.
- **Proyectos, pedidos, impresiones y stock**: no les afecta, porque siguen enlazados al material, no al tipo.
- **Límites del plan**: los tipos no cuentan para el límite de materiales. Habría que decidir si se pone un límite al número de tipos.
- **Catálogo y PDF**: sin cambios, salvo que quieras mostrar el tipo.
- **Esfuerzo**: medio. Hay que tocar el inventario, el formulario de proyectos, la calculadora y los filtros, además de las traducciones en ES, EN y FR.
- **Más pasos al añadir materiales a un proyecto**: se compensa porque el tipo es opcional y el selector filtra al escribir.

## Detalles técnicos
- Tabla nueva `material_types` (id, user_id, name, category, position, timestamps), con permisos y reglas de acceso para que cada usuario solo vea sus tipos, y nombre único por usuario.
- `materials.material_type_id` uuid nulo que apunta a `material_types` (al borrar el tipo queda vacío; la interfaz bloquea ese borrado si hay materiales).
- `materials.type` se mantiene como categoría.
- Los tipos sugeridos se crean la primera vez que se abre el selector, si el usuario no tiene ninguno.
- Las consultas de materiales en ProjectFormModal, CalculatorPage, Inventory y Acquisitions incluyen el tipo; el filtro por tipo se hace en pantalla.
