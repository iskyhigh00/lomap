# Backlog priorizado — Casino Layout Studio v2.0

Lista de mejoras candidatas para la próxima versión mayor, ordenadas por
prioridad. No implementadas en esta entrega (Fase 8 fue exclusivamente de
estabilización, sin funcionalidades nuevas).

## Alta prioridad
1. **IA de asistencia de diseño** — sugerencias de distribución de islas y
   corrección automática de conflictos de validación (mencionada como "IA"
   en el roadmap original, explícitamente fuera de alcance hasta ahora).
2. **Optimizador automático de layout** — generación/ajuste automático de
   disposiciones para maximizar densidad de máquinas respetando reglas de
   pasillo/clearance (explícitamente fuera de alcance hasta ahora).
3. **Code-splitting del bundle 3D** — `Scene3D` pesa ~936 kB (250 kB gzip) y
   dispara la advertencia de chunk grande de Vite. Dividir por sub-features
   (materiales, instancing, cámara) o cargar drei/three de forma más
   incremental.
4. **Accesibilidad de teclado más completa** — navegación del árbol de
   entidades y paneles con teclado, roles ARIA en los botones de icono
   (actualmente dependen solo de `title`), foco visible consistente.

## Media prioridad
5. **Responsive / soporte de pantallas pequeñas** — la app asume escritorio
   de al menos ~1280px; no hay layout adaptado a tablet ni a paneles
   colapsables en pantallas angostas.
6. **Menú contextual extendido** — el menú agregado en Fase 8 cubre
   duplicar/copiar/eliminar; falta bloquear/desbloquear entidad individual,
   enviar a capa, y acciones específicas por tipo (p. ej. "Convertir a
   perímetro").
7. **Deshacer selectivo / historial visual** — lista navegable del historial
   de comandos (más allá de undo/redo lineal).
8. **Multi-selección desde el panel de capas** — seleccionar/filtrar
   entidades directamente desde el árbol de capas.
9. **Mejor manejo de memoria en proyectos muy grandes** — perfilar y, si
   corresponde, virtualizar el renderizado de listas largas en paneles
   (Validación, Capas) para layouts de miles de objetos.

## Baja prioridad
10. **Temas / personalización visual** — soporte de tema claro además del
    oscuro actual.
11. **Exportación ampliada** — formatos adicionales de exportación más allá
    de los ya soportados (evaluar PDF con capas, IFC, etc.).
12. **Colaboración multi-usuario** — edición concurrente, fuera de alcance
    de la arquitectura local-first actual (Dexie/IndexedDB).
