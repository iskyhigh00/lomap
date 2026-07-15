# Casino Layout Studio — Release Candidate (Fases 1–8)

Resumen de lo implementado desde el arranque del proyecto hasta el cierre de la
Fase 8 (Release Candidate). No incluye funcionalidades planificadas para v2.0.

## Fase 1 — Base del producto
- App shell (barra superior, dock izquierdo de herramientas, panel derecho de propiedades).
- Motor geométrico y de entidades (perímetro, muro, pilar, zona, máquina, isla).
- Canvas 2D con pan/zoom/grid y selección.
- Store Zustand + patrón Command con historial undo/redo.
- Persistencia Dexie (IndexedDB) con autoguardado.
- PWA instalable con soporte offline (service worker).
- Batería inicial de tests con Vitest.

## Fase 2 — Islas y productividad de edición
- Gestión de máquinas dentro de islas (agregar/quitar/organizar).
- Selección de grupo con mover/rotar/duplicar/copiar-pegar/bloqueo.
- Panel de capas.
- Herramienta de medición con lectura de distancia en vivo.
- Atajos de teclado y duplicado con Alt+arrastre.

## Blueprints (planos de referencia)
- Importación de imagen de plano, calibración a escala real (2 puntos).
- Renderizado del plano detrás del layout con opacidad/brillo/contraste ajustables.
- Herramienta de mover plano y panel dedicado (bloqueo/visibilidad).
- Persistencia separada de blob/metadata en Dexie; caché de bitmap limpiada al cambiar de proyecto.

## Sistema de coordenadas
- Módulo formal de "Project Coordinate System" (mundo en cm, Y-down) documentado en `ARCHITECTURE.md`.
- Unificación de las transformaciones de pantalla/blueprint-local/escena 3D para evitar cálculos duplicados.

## Fase 4 — Herramientas CAD profesionales
- Muros: modelo de datos con `points[]`, alto, tipo y material; herramienta de trazado por clics con snap.
- Motor de snap: extremos, ángulo y grilla, con prioridad.
- Edición de vértices de muro por grips (mover/insertar/eliminar).
- Selección de segmento con edición de longitud exacta.
- Inspector de propiedades de muro (espesor/alto/tipo/material).
- Pilares (forma/material/snap/inserción continua).
- Puertas/aberturas sobre muros.
- Zonas (nombre/categoría/área automática/bloqueo/visibilidad).
- Herramientas CAD: offset, trim, extend, fillet, mirror, array, alinear.

## Fase 5 — Motor de validación
- Sistema de reglas desacoplado (`ConstraintRule`/`Conflict`).
- Detección de colisiones basada en SAT.
- Reglas de pasillo y de distancia/clearance.
- Panel de validación con severidad y navegación directa al conflicto.

## Fase 6 — Vista 3D sincronizada
- Vista 3D (React Three Fiber) que lee el mismo estado que el 2D, sin modelo de datos paralelo.
- Instancing de máquinas para rendimiento a gran escala.
- Carga diferida (`React.lazy`) de la escena 3D.
- Botón de encuadre ("Encuadre") para centrar la cámara en el layout.

## Fase 7 — Motor de layout inteligente
- Guías de alineación inteligentes.
- Distribución uniforme y espaciado uniforme.
- Rotación inteligente de islas respecto al muro más cercano.
- Estadísticas de layout (`layoutStats`) reutilizando la geometría de footprint existente.
- Snapshots de layout multi-proyecto: guardar, pegar en otro proyecto y comparar (diff) con resaltado de diferencias.

## Fase 8 — Release Candidate (esta entrega)
Pulido de UX, rendimiento y estabilidad, sin nuevas herramientas ni funcionalidades:
- **Rendimiento**: memoización de la lista de entidades visibles en el Canvas 2D
  (`entityList`), eliminando un recálculo completo de mapeo/filtrado en cada
  `pointermove` — antes se repetía decenas de veces por segundo incluso sin
  cambios en el modelo.
- **Nuevo menú contextual (clic derecho)** sobre el canvas: duplicar, copiar y
  eliminar la selección actual, reutilizando exactamente los mismos comandos
  que ya expone la barra de herramientas y los atajos de teclado.
- **Nuevos atajos de teclado**: `Ctrl/Cmd+A` selecciona todas las entidades
  visibles no bloqueadas; `F` encuadra el layout completo en la vista 2D
  (equivalente al botón "Encuadre" ya existente en 3D).
- **Nuevo botón "Encuadre" en 2D**, en la esquina inferior derecha del canvas,
  para centrar y ajustar el zoom a todo el layout con un clic.
- Verificación completa: `tsc --noEmit`, `vitest` (192 tests, 30 archivos),
  `oxlint` y `vite build` — todos en verde.
- Verificación manual en navegador (Playwright) del flujo completo: colocar
  entidades, selección múltiple con `Ctrl+A`, menú contextual, encuadre 2D.

## Estado de los tests
- **192/192 tests pasando** en 30 archivos de test (Vitest).
- `tsc -b --noEmit`: sin errores.
- `oxlint`: sin advertencias.
- `vite build`: build de producción exitoso.
