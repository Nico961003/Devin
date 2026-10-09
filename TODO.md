# TODO — Tipo de cambio USD-EUR

Este plan convierte `ESPECIFICACION.md` en incrementos pequeños y verificables. Las tareas están ordenadas por dependencia y, dentro de cada fase, de menor a mayor complejidad.

## Reglas de uso

- Completar una sola tarea funcional cada vez.
- No marcar una tarea principal hasta cumplir todos sus criterios de aceptación.
- Añadir o actualizar las pruebas indicadas en la misma tarea que introduce el comportamiento.
- Mantener el CSV y sus valores únicamente en memoria.
- Ejecutar las pruebas relacionadas después de cada tarea y la suite completa al cerrar una fase.

## Fase 1 — Base del proyecto

- [x] **T01. Crear la estructura de frontend y backend**
  - **Objetivo:** preparar una base ejecutable sin lógica de negocio.
  - **Criterios de aceptación:**
    - [x] El frontend usa React y Vite.
    - [x] El backend usa una versión LTS vigente de Node.js y Express.
    - [x] Existen comandos desde la raíz para desarrollo, pruebas y compilación de ambos proyectos.
    - [x] Frontend y backend pueden levantarse simultáneamente sin errores.
    - [x] Vite reenvía `/api` al backend durante el desarrollo o existe una configuración equivalente documentada.

- [x] **T02. Definir los contratos de datos y errores**
  - **Objetivo:** compartir una forma estable para observaciones, resúmenes y errores.
  - **Criterios de aceptación:**
    - [x] Una observación normalizada contiene `date`, `usdPerEur` y `eurPerUsd`.
    - [x] El resumen contiene `totalRows`, `validRows`, `discardedRows`, `minDate` y `maxDate`.
    - [x] Todo error de API usa `{ "error": { "code", "message" } }`.
    - [x] Están definidos los códigos `FILE_REQUIRED`, `INVALID_CSV`, `MISSING_COLUMNS`, `NO_VALID_DATA`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE` e `INTERNAL_ERROR`.
    - [x] Los contratos tienen pruebas o validaciones automatizadas.

- [x] **T03. Crear la estructura visual estática**
  - **Objetivo:** construir la página principal sin conectar todavía el CSV ni el gráfico.
  - **Criterios de aceptación:**
    - [x] La página muestra el título **Tipo de cambio USD-EUR**.
    - [x] Aparecen, en orden, instrucciones, control de carga, área de estado, selector de intervalos, leyenda y contenedor del gráfico.
    - [x] Los elementos dependientes de datos están ocultos o deshabilitados mientras no haya un archivo procesado.
    - [x] La página no genera desplazamiento horizontal a 320 px de ancho.

## Fase 2 — Procesamiento del CSV en el backend

- [ ] **T04. Validar la estructura básica del CSV**
  - **Objetivo:** reconocer archivos analizables antes de procesar sus filas.
  - **Criterios de aceptación:**
    - [ ] `csv-parse` acepta UTF-8 con o sin BOM y usa la coma como delimitador.
    - [ ] Los espacios exteriores de encabezados y campos se eliminan.
    - [ ] Se exigen exactamente como columnas obligatorias `observation_date` y `DEXUSEU`; las columnas adicionales se ignoran.
    - [ ] Las líneas completamente vacías se ignoran y no se incluyen en los contadores.
    - [ ] Un CSV ilegible o sin encabezados obligatorios produce un error de dominio comprobado mediante pruebas unitarias.

- [ ] **T05. Validar y limpiar las filas**
  - **Objetivo:** separar observaciones válidas de filas descartadas.
  - **Criterios de aceptación:**
    - [ ] Solo se aceptan fechas reales con formato `AAAA-MM-DD` y sin conversiones de zona horaria.
    - [ ] `DEXUSEU` solo se acepta si es un número finito mayor que cero y usa punto decimal.
    - [ ] Las filas con campos vacíos, fechas inválidas o cambios inválidos se descartan sin impedir el uso de las filas correctas.
    - [ ] El encabezado y las líneas vacías no cuentan como filas de datos.
    - [ ] Hay pruebas para años bisiestos, fechas imposibles, `NaN`, infinito, cero, negativos y campos vacíos.

- [ ] **T06. Deduplicar, ordenar y transformar los datos**
  - **Objetivo:** generar la colección normalizada que consumirá el frontend.
  - **Criterios de aceptación:**
    - [ ] Si una fecha está repetida, se conserva la última fila encontrada.
    - [ ] Las filas duplicadas sustituidas se contabilizan como descartadas.
    - [ ] Las observaciones se devuelven de la fecha más antigua a la más reciente.
    - [ ] `usdPerEur` conserva el valor original de `DEXUSEU`.
    - [ ] `eurPerUsd` se calcula como `1 / DEXUSEU` sin redondeo interno.
    - [ ] Las pruebas verifican deduplicación, orden y precisión del cálculo inverso.

- [ ] **T07. Calcular el resumen de procesamiento**
  - **Objetivo:** informar con precisión qué ocurrió durante la limpieza.
  - **Criterios de aceptación:**
    - [ ] Se calculan `totalRows`, `validRows`, `discardedRows`, `minDate` y `maxDate`.
    - [ ] Siempre se cumple `totalRows = validRows + discardedRows`.
    - [ ] `minDate` y `maxDate` proceden exclusivamente de filas válidas.
    - [ ] Si no queda ninguna fila válida, se genera `NO_VALID_DATA`.
    - [ ] Las pruebas cubren archivos totalmente válidos, parcialmente válidos y sin datos válidos.

- [ ] **T08. Implementar `POST /api/exchange-rates`**
  - **Objetivo:** exponer el procesamiento mediante la API especificada.
  - **Criterios de aceptación:**
    - [ ] El endpoint acepta `multipart/form-data` con un único campo `file`.
    - [ ] Multer mantiene el archivo en memoria y no crea archivos temporales.
    - [ ] Una petición válida responde `200` con `data` y `summary` conforme al contrato.
    - [ ] Un archivo ausente responde `400/FILE_REQUIRED`.
    - [ ] Columnas ausentes, CSV ilegible y ausencia de datos válidos responden con sus códigos previstos.
    - [ ] Las pruebas de integración ejercitan el endpoint con archivos reales o búferes equivalentes.

- [ ] **T09. Aplicar límites y validaciones de seguridad del archivo**
  - **Objetivo:** rechazar entradas no admitidas antes de procesarlas.
  - **Criterios de aceptación:**
    - [ ] El límite predeterminado del archivo es 10 MB y puede configurarse sin superar el máximo funcional de 10 MB de esta versión.
    - [ ] Un archivo superior al límite responde `413/FILE_TOO_LARGE`.
    - [ ] Una extensión o tipo no admitido responde `415/UNSUPPORTED_FILE_TYPE`.
    - [ ] El servidor valida la estructura real además de extensión y tipo declarado.
    - [ ] El contenido, los valores y el nombre del CSV no se registran ni se interpolan como HTML.
    - [ ] El búfer deja de estar referenciado al terminar la petición y ninguna prueba detecta escritura en disco.
    - [ ] Los errores `500/INTERNAL_ERROR` no exponen rutas ni trazas.

## Fase 3 — Flujo de carga en el frontend

- [ ] **T10. Implementar el selector de archivo**
  - **Objetivo:** permitir elegir un CSV desde el navegador.
  - **Criterios de aceptación:**
    - [ ] El control acepta un solo archivo con extensión `.csv`.
    - [ ] El frontend comprueba preliminarmente extensión y tamaño de 10 MB.
    - [ ] Las comprobaciones del cliente no sustituyen el envío y validación autoritativa del servidor.
    - [ ] Elegir un nuevo archivo reemplaza el resultado anterior sin recargar la página.
    - [ ] El control tiene nombre accesible, foco visible y funciona con teclado.

- [ ] **T11. Conectar la carga con la API**
  - **Objetivo:** enviar el archivo y conservar la respuesta normalizada en memoria.
  - **Criterios de aceptación:**
    - [ ] El frontend envía `multipart/form-data` a `POST /api/exchange-rates` mediante `fetch`.
    - [ ] Mientras espera, muestra un estado de procesamiento y evita envíos duplicados.
    - [ ] Tras el éxito, conserva observaciones y resumen en el estado de React.
    - [ ] No persiste el CSV ni la respuesta en `localStorage`, `sessionStorage` o IndexedDB.
    - [ ] La respuesta queda disponible para filtrar sin volver a solicitar el archivo.

- [ ] **T12. Mostrar estados, errores y resumen**
  - **Objetivo:** cubrir los cinco estados de interfaz definidos en la especificación.
  - **Criterios de aceptación:**
    - [ ] Se distinguen los estados sin archivo, procesando, éxito total, éxito con descartes y error bloqueante.
    - [ ] El resumen muestra filas leídas, válidas y descartadas.
    - [ ] Cada código de API produce un mensaje claro y accionable en español.
    - [ ] Un error bloqueante oculta el gráfico en lugar de mostrar datos vacíos o anteriores.
    - [ ] Estados y errores se anuncian mediante una región `aria-live`.

## Fase 4 — Filtros temporales

- [ ] **T13. Implementar el cálculo de intervalos**
  - **Objetivo:** crear una función pura que filtre observaciones por años naturales.
  - **Criterios de aceptación:**
    - [ ] La fecha de referencia es la observación válida más reciente, no la fecha actual.
    - [ ] Existen intervalos de 1, 2, 5 y 10 años.
    - [ ] Ambos extremos del intervalo son inclusivos.
    - [ ] El cálculo no desplaza fechas por zona horaria.
    - [ ] Si no hay historia suficiente, se devuelven todos los puntos disponibles del periodo.
    - [ ] Las pruebas incluyen el ejemplo `2024-08-22` a `2025-08-22` para 1 año y un caso de 29 de febrero.

- [ ] **T14. Construir el selector de intervalos**
  - **Objetivo:** permitir cambiar el rango visible sin tocar el servidor.
  - **Criterios de aceptación:**
    - [ ] El selector ofrece exactamente 1, 2, 5 y 10 años.
    - [ ] El intervalo inicial seleccionado es 1 año.
    - [ ] Cambiar de opción actualiza ambas series.
    - [ ] Después de la carga inicial, cambiar el intervalo no genera peticiones de red.
    - [ ] La opción activa se identifica visualmente y mediante `aria-pressed` o semántica equivalente.

## Fase 5 — Gráfico

- [ ] **T15. Renderizar el gráfico base con Apache ECharts**
  - **Objetivo:** mostrar la serie original con la orientación de ejes acordada.
  - **Criterios de aceptación:**
    - [ ] El gráfico se integra mediante `echarts-for-react`.
    - [ ] El eje X es numérico, lleva la etiqueta **Tipo de cambio** y el eje Y es temporal.
    - [ ] Los datos se proporcionan como `[tipoDeCambio, fecha]`.
    - [ ] El eje Y muestra referencias anuales legibles.
    - [ ] Los puntos mantienen el orden cronológico en sentido vertical.
    - [ ] El gráfico cambia de tamaño con su contenedor.

- [ ] **T16. Añadir ambas cotizaciones y la leyenda**
  - **Objetivo:** comparar la cotización original y su inversa.
  - **Criterios de aceptación:**
    - [ ] Se muestran las series **USD por EUR** y **EUR por USD** sobre la misma escala numérica.
    - [ ] Cada serie usa un color y un estilo de línea distinguibles.
    - [ ] La leyenda identifica ambas unidades.
    - [ ] La leyenda permite activar y desactivar cada serie.
    - [ ] Ocultar una serie no altera ni recalcula sus datos.

- [ ] **T17. Implementar tooltip y cruz interactiva**
  - **Objetivo:** consultar con precisión la observación más próxima al puntero.
  - **Criterios de aceptación:**
    - [ ] Al pasar el puntero aparece un `axisPointer` de tipo cruz con líneas vertical y horizontal.
    - [ ] El tooltip localiza la observación visible más próxima.
    - [ ] Muestra la fecha exacta, USD por EUR y EUR por USD.
    - [ ] El valor original presenta hasta 4 decimales y el inverso hasta 6, sin cambiar los valores internos.
    - [ ] Fechas y números visibles usan formato español y separador decimal local.

- [ ] **T18. Añadir navegación del gráfico por teclado**
  - **Objetivo:** ofrecer una alternativa funcional al uso del puntero.
  - **Criterios de aceptación:**
    - [ ] El gráfico puede recibir foco y tiene una descripción textual de ejes e interacción.
    - [ ] Las flechas arriba y abajo recorren las observaciones del intervalo visible.
    - [ ] La observación seleccionada abre o actualiza el tooltip.
    - [ ] Fecha y ambas cotizaciones se anuncian en una región `aria-live`.
    - [ ] `Escape` oculta el tooltip activo.
    - [ ] Las pruebas de interfaz cubren todo el recorrido de teclado.

## Fase 6 — Presentación, accesibilidad y compatibilidad

- [ ] **T19. Completar el diseño adaptable**
  - **Objetivo:** presentar correctamente la aplicación en móvil, tableta y escritorio.
  - **Criterios de aceptación:**
    - [ ] No existe desplazamiento horizontal a 320 px, 768 px y 1280 px de ancho.
    - [ ] El selector permanece visible mientras existen datos válidos.
    - [ ] El gráfico mantiene un tamaño utilizable en los tres formatos.
    - [ ] Estados, leyenda, etiquetas y tooltip no se solapan ni quedan recortados.

- [ ] **T20. Completar accesibilidad WCAG 2.1 AA**
  - **Objetivo:** hacer que los flujos principales sean operables y comprensibles sin ratón.
  - **Criterios de aceptación:**
    - [ ] Todos los controles tienen nombre accesible, orden de foco lógico y foco visible.
    - [ ] El contraste de texto, controles y estados cumple nivel AA.
    - [ ] Las series no se distinguen únicamente por color.
    - [ ] Los mensajes dinámicos y la observación activa se anuncian sin duplicaciones molestas.
    - [ ] Una auditoría automatizada no presenta infracciones críticas y la navegación manual por teclado completa el flujo principal.

- [ ] **T21. Verificar compatibilidad entre navegadores**
  - **Objetivo:** validar el comportamiento en los navegadores exigidos.
  - **Criterios de aceptación:**
    - [ ] La carga, filtrado, leyenda, tooltip y teclado funcionan en las dos versiones estables más recientes de Chrome, Edge, Firefox y Safari.
    - [ ] Las diferencias inevitables quedan documentadas y no impiden el flujo principal.
    - [ ] El frontend compilado no depende de API experimentales sin alternativa.

## Fase 7 — Verificación integral y entrega

- [ ] **T22. Completar pruebas unitarias**
  - **Objetivo:** cubrir todas las reglas puras de datos y rango temporal.
  - **Criterios de aceptación:**
    - [ ] Hay pruebas para UTF-8/BOM, columnas adicionales, espacios, vacíos, fechas y tipos de cambio inválidos.
    - [ ] Hay pruebas para deduplicación, orden, cotización inversa y contadores.
    - [ ] Hay pruebas para los cuatro intervalos, límites inclusivos y zonas horarias.
    - [ ] Todas las pruebas unitarias pasan de forma repetible.

- [ ] **T23. Completar pruebas de integración de la API**
  - **Objetivo:** verificar el contrato HTTP y el procesamiento en memoria.
  - **Criterios de aceptación:**
    - [ ] Se cubren respuesta `200` y errores `400`, `413`, `415` y `500`.
    - [ ] Cada respuesta de error respeta el contrato común y no contiene trazas.
    - [ ] Se verifica un archivo con mezcla de filas válidas e inválidas.
    - [ ] Se verifica que no se crea ningún archivo temporal ni persistente.
    - [ ] Todas las pruebas de integración pasan.

- [ ] **T24. Completar pruebas de interfaz y flujo integral**
  - **Objetivo:** validar la aplicación desde la selección del archivo hasta la interacción con el gráfico.
  - **Criterios de aceptación:**
    - [ ] Una prueba carga `DEXUSEU.csv` y comprueba resumen y ambas series.
    - [ ] Se prueban los cuatro intervalos sin solicitudes adicionales.
    - [ ] Se prueban cruz, tooltip, leyenda y navegación por teclado.
    - [ ] Se prueban los cinco estados de interfaz y la sustitución de archivo.
    - [ ] Se prueban vistas móvil, tableta y escritorio.
    - [ ] Toda la suite de interfaz pasa.

- [ ] **T25. Verificar los objetivos de rendimiento**
  - **Objetivo:** comprobar los límites definidos con datos representativos.
  - **Criterios de aceptación:**
    - [ ] Un CSV de hasta 10 MB y 10 000 observaciones válidas se procesa en menos de 3 segundos en el equipo de referencia.
    - [ ] El gráfico se renderiza en menos de 1 segundo.
    - [ ] Selector y tooltip responden en menos de 100 ms.
    - [ ] Si es necesario, ECharts usa muestreo o renderizado progresivo sin perder el valor exacto del tooltip.
    - [ ] El procedimiento y el equipo de referencia quedan documentados para repetir la medición.

- [ ] **T26. Preparar la compilación y validación final**
  - **Objetivo:** dejar una versión reproducible y lista para ejecutar.
  - **Criterios de aceptación:**
    - [ ] La instalación parte de un archivo de bloqueo de dependencias versionado.
    - [ ] Compilación, lint, pruebas unitarias, integración e interfaz terminan correctamente.
    - [ ] La auditoría de dependencias no presenta vulnerabilidades críticas conocidas sin justificar.
    - [ ] Los secretos y archivos locales no se incluyen en la compilación.
    - [ ] Frontend y backend se levantan con los comandos documentados.
    - [ ] Se verifican los 12 criterios globales de aceptación de `ESPECIFICACION.md`.

## Matriz de trazabilidad

| Sección de `ESPECIFICACION.md` | Tareas que la implementan o verifican |
| --- | --- |
| Datos de entrada y limpieza | T04–T07, T22 |
| RF-01. Carga del CSV | T10–T12, T24 |
| RF-02. Validación y errores | T04–T09, T12, T23 |
| RF-03. Gráfico de líneas | T15–T16, T24 |
| RF-04. Selector de intervalo | T13–T14, T22, T24 |
| RF-05. Tooltip e interacción | T17–T18, T24 |
| RF-06. Estados de interfaz | T12, T24 |
| Diseño de interfaz | T03, T19–T20 |
| Arquitectura y contrato de API | T01–T02, T08–T09, T23 |
| Rendimiento | T25 |
| Seguridad | T09, T23, T26 |
| Accesibilidad | T10, T12, T18, T20, T24 |
| Compatibilidad, idioma y formato | T17, T19–T21 |
| Pruebas mínimas | T22–T24 |
| Criterios globales de aceptación | T26 |
