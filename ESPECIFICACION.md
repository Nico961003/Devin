# Especificación de software: Tipo de cambio USD-EUR

## 1. Propósito

Desarrollar una aplicación web denominada **Tipo de cambio USD-EUR** que permita cargar un archivo CSV con observaciones históricas del tipo de cambio, depurar los datos y representarlos mediante un gráfico de líneas interactivo.

## 2. Alcance

La primera versión deberá:

- aceptar un archivo CSV proporcionado por el usuario;
- validar y procesar las columnas requeridas;
- descartar las filas sin fecha o sin tipo de cambio válido;
- calcular y mostrar ambas cotizaciones: USD por EUR y EUR por USD;
- permitir filtrar la visualización a 1, 2, 5 o 10 años;
- representar la fecha en el eje X y el tipo de cambio en el eje Y;
- ofrecer una leyenda, etiquetas de ejes y un tooltip interactivo con una cruz completa.

Quedan fuera del alcance inicial la autenticación, el almacenamiento permanente de archivos, la edición manual de datos y la consulta automática a proveedores externos de tipos de cambio.

## 3. Datos de entrada

### 3.1 Formato esperado

El archivo deberá:

- tener extensión `.csv` y un tamaño máximo de **10 MB**;
- incluir una fila de encabezado y utilizar la coma como delimitador;
- utilizar codificación UTF-8; se admitirá opcionalmente una marca BOM al inicio;
- contener las columnas `observation_date` y `DEXUSEU`; las columnas adicionales se ignorarán;
- representar las fechas con el formato ISO `AAAA-MM-DD` y corresponder a fechas reales del calendario;
- usar punto como separador decimal en `DEXUSEU`;
- usar `DEXUSEU` para expresar cuántos USD equivalen a 1 EUR.

Ejemplo:

```csv
observation_date,DEXUSEU
1999-01-04,1.1812
1999-01-05,1.1760
1999-01-18,
```

### 3.2 Limpieza y transformación

El sistema deberá:

1. ignorar las líneas completamente vacías sin contabilizarlas como filas leídas ni descartadas;
2. recortar espacios exteriores en encabezados y campos;
3. descartar filas en las que `observation_date` o `DEXUSEU` estén vacíos;
4. descartar filas cuya fecha no sea válida o cuyo tipo de cambio no sea un número finito mayor que cero;
5. normalizar las fechas a `AAAA-MM-DD` sin aplicar conversiones de zona horaria;
6. conservar una sola observación por fecha; si hubiera duplicados, prevalecerá la última fila del archivo y las anteriores se contabilizarán como descartadas;
7. ordenar las observaciones válidas de la más antigua a la más reciente;
8. calcular la cotización inversa mediante `EUR por USD = 1 / DEXUSEU`, sin redondear el valor usado internamente;
9. informar al usuario del número de filas leídas, válidas y descartadas, cumpliendo `totalRows = validRows + discardedRows`.

Si no queda ninguna observación válida, no se mostrará el gráfico y se presentará un mensaje de error accionable. El encabezado no se contabilizará como fila de datos.

## 4. Requisitos funcionales

### RF-01. Carga del CSV

- La pantalla principal deberá incluir una zona de selección de archivo y admitir selección mediante el explorador del sistema.
- Solo se procesará un archivo a la vez.
- Al cargar otro archivo, este sustituirá los datos mostrados anteriormente.
- Mientras se procesa el archivo, la interfaz mostrará un estado de carga.

### RF-02. Validación y errores

- La aplicación deberá rechazar archivos sin las columnas obligatorias.
- Deberá mostrar mensajes diferenciados para archivo no válido, columnas ausentes, CSV ilegible y ausencia de datos válidos.
- Las filas inválidas no deberán impedir la visualización de las filas válidas.
- Tras procesar el archivo, deberá mostrarse un resumen con el total de filas leídas, válidas y descartadas.

### RF-03. Gráfico de líneas

- El gráfico deberá usar **Apache ECharts**.
- El eje X será temporal y representará la fecha.
- El eje Y será numérico y representará el tipo de cambio.
- Las marcas principales del eje X deberán identificar los años.
- El eje Y deberá llevar la etiqueta **Tipo de cambio**; la unidad concreta se identificará mediante el nombre de cada serie para evitar atribuir una sola unidad a ambas cotizaciones.
- Se mostrarán dos series de líneas sobre la misma escala numérica:
  - **USD por EUR**: valor original de `DEXUSEU`;
  - **EUR por USD**: valor calculado como `1 / DEXUSEU`.
- Cada punto se proporcionará a ECharts como el par `[fecha, tipoDeCambio]`, de acuerdo con la orientación elegida de los ejes.
- La leyenda deberá permitir identificar y activar o desactivar cada serie.
- Los datos deberán mantener el orden cronológico en sentido horizontal.
- El gráfico deberá reajustarse al tamaño de su contenedor.

### RF-04. Selector de intervalo

- Se ofrecerán cuatro intervalos predefinidos: **1 año**, **2 años**, **5 años** y **10 años**.
- El intervalo se calculará en años naturales hacia atrás desde la fecha válida más reciente del archivo, no desde la fecha actual del dispositivo.
- Los límites del intervalo serán inclusivos. Por ejemplo, si la fecha máxima es `2025-08-22`, el intervalo de 1 año incluirá observaciones desde `2024-08-22` hasta `2025-08-22`.
- Al elegir un intervalo, ambas series deberán actualizarse en el cliente sin volver a cargar ni enviar el CSV.
- Si el archivo contiene menos datos que el intervalo elegido, se mostrarán todos los datos disponibles dentro de ese intervalo.
- El intervalo predeterminado será **1 año**.

### RF-05. Tooltip e interacción

- Al pasar el puntero sobre el gráfico, se mostrará un indicador en forma de cruz con líneas horizontal y vertical.
- El tooltip deberá mostrar:
  - la fecha exacta en formato legible;
  - el valor original en USD por EUR;
  - el valor inverso en EUR por USD.
- Los cálculos deberán conservar su precisión interna; el valor original se presentará con hasta 4 decimales y el inverso con hasta 6 decimales.
- El tooltip deberá localizar la observación más próxima al puntero.
- Para ofrecer una alternativa verificable al uso del ratón, el gráfico tendrá foco de teclado y permitirá recorrer las observaciones visibles con las teclas de flecha arriba y abajo. La observación activa se mostrará mediante el tooltip y se anunciará en una región `aria-live`.
- La tecla `Escape` ocultará el tooltip activo.

### RF-06. Estados de interfaz

La interfaz deberá contemplar los siguientes estados:

1. sin archivo cargado;
2. procesando archivo;
3. datos cargados correctamente;
4. datos cargados con filas descartadas;
5. error que impide generar el gráfico.

## 5. Diseño de interfaz

La vista principal contendrá, en este orden:

1. título **Tipo de cambio USD-EUR**;
2. breve instrucción sobre el formato requerido;
3. control para cargar el CSV;
4. resumen del procesamiento o mensaje de error;
5. selector de intervalos;
6. leyenda;
7. gráfico de líneas con etiquetas de ejes y tooltip.

El selector de intervalos deberá permanecer visible mientras haya datos válidos. La interfaz deberá adaptarse como mínimo a pantallas de escritorio, tabletas y móviles sin provocar desplazamiento horizontal en la página.

## 6. Arquitectura técnica propuesta

### 6.1 Frontend

- **React** con JavaScript o TypeScript para la interfaz basada en componentes.
- **Vite** para desarrollo y compilación.
- **Apache ECharts** para el gráfico.
- **echarts-for-react** como integración entre React y ECharts.
- `fetch` para comunicarse con la API.
- El frontend conservará en memoria la respuesta normalizada y aplicará localmente los filtros de 1, 2, 5 y 10 años.

Componentes sugeridos:

- `CsvUploader`: selección y envío del archivo;
- `ProcessingSummary`: resumen de filas válidas y descartadas;
- `RangeSelector`: intervalos de 1, 2, 5 y 10 años;
- `ExchangeRateChart`: configuración y renderizado de ECharts;
- `StatusMessage`: estados de carga y error.

### 6.2 Backend

- **Node.js**, en una versión LTS con soporte vigente, como entorno de ejecución.
- **Express** para la API HTTP.
- **Multer** para recibir el archivo mediante `multipart/form-data`, manteniéndolo en memoria y aplicando el límite de 10 MB.
- **csv-parse** para analizar el CSV.

El backend procesará el archivo en memoria y no lo almacenará de forma permanente. Devolverá únicamente las observaciones normalizadas y los metadatos del procesamiento. La validación del servidor será autoritativa aunque el frontend realice comprobaciones preliminares para mejorar la experiencia de usuario.

### 6.3 Contrato de API propuesto

#### `POST /api/exchange-rates`

Petición:

- tipo de contenido: `multipart/form-data`;
- campo de archivo: `file`.

Respuesta satisfactoria (`200`):

```json
{
  "data": [
    {
      "date": "1999-01-04",
      "usdPerEur": 1.1812,
      "eurPerUsd": 0.846597
    }
  ],
  "summary": {
    "totalRows": 3,
    "validRows": 2,
    "discardedRows": 1,
    "minDate": "1999-01-04",
    "maxDate": "1999-01-05"
  }
}
```

Respuesta de error:

```json
{
  "error": {
    "code": "MISSING_COLUMNS",
    "message": "El archivo debe incluir observation_date y DEXUSEU."
  }
}
```

Códigos HTTP previstos:

- `400`: archivo ausente (`FILE_REQUIRED`), CSV ilegible (`INVALID_CSV`), columnas ausentes (`MISSING_COLUMNS`) o ausencia de filas válidas (`NO_VALID_DATA`);
- `413`: archivo superior al límite permitido (`FILE_TOO_LARGE`);
- `415`: extensión o tipo de archivo no admitido (`UNSUPPORTED_FILE_TYPE`);
- `500`: error interno no esperado (`INTERNAL_ERROR`).

Todas las respuestas de error usarán el mismo objeto `{ "error": { "code", "message" } }`. Los mensajes estarán en español y no expondrán detalles internos.

## 7. Requisitos no funcionales

### RNF-01. Rendimiento

- La interfaz deberá mantener visibles sus estados de carga y no realizar el análisis del CSV en el hilo principal del navegador, ya que el procesamiento corresponde al backend.
- Para un CSV de hasta 10 MB con 10 000 observaciones válidas, la API deberá responder en menos de 3 segundos y el gráfico deberá renderizarse en menos de 1 segundo en un equipo de desarrollo de referencia, excluyendo la latencia de red externa.
- Las interacciones del selector y del tooltip deberán responder en menos de 100 ms para ese volumen de datos.
- ECharts deberá configurarse con muestreo o renderizado progresivo si el volumen de datos afecta a estos objetivos.

### RNF-02. Seguridad

- El servidor deberá establecer un límite de tamaño de archivo configurable cuyo valor predeterminado y máximo funcional de esta versión será **10 MB**.
- El frontend podrá validar extensión y tamaño para dar respuesta inmediata, pero el servidor volverá a validar tamaño, extensión y estructura real del contenido.
- Los nombres de archivo y los datos recibidos no se interpolarán como HTML.
- Los archivos no se escribirán en disco, registros ni almacenamiento externo, y su búfer se liberará al finalizar la petición.
- Los errores internos no expondrán rutas, trazas ni detalles del servidor al cliente.
- La aplicación no registrará el contenido del CSV ni los valores de cambio.

### RNF-03. Accesibilidad

- Los controles deberán tener nombre accesible, foco visible y ser utilizables mediante teclado.
- El estado de procesamiento, los errores y la observación activa del gráfico deberán anunciarse mediante regiones accesibles (`aria-live`).
- El gráfico incluirá una descripción textual que explique qué representa cada eje y cómo recorrer los datos con teclado.
- El color no será el único medio para distinguir las series; se usarán también nombres y estilos de línea diferenciados.
- El contraste deberá cumplir WCAG 2.1 nivel AA.

### RNF-04. Compatibilidad

La aplicación deberá funcionar en las dos versiones estables más recientes de Chrome, Edge, Firefox y Safari.

### RNF-05. Idioma y formato

- La interfaz estará en español.
- Las fechas visibles usarán un formato legible en español, manteniendo ISO internamente.
- Los valores del tooltip usarán separador decimal conforme a la configuración regional española.

## 8. Pruebas mínimas

### Pruebas unitarias

- análisis de un CSV válido, con BOM y con columnas adicionales;
- eliminación de valores ausentes y recorte de espacios;
- rechazo de fechas inexistentes y números no finitos, negativos o iguales a cero;
- deduplicación por fecha conservando la última fila;
- ordenación cronológica;
- cálculo correcto de la cotización inversa sin redondeo interno;
- consistencia de los contadores de resumen;
- cálculo inclusivo de cada intervalo desde la fecha máxima del archivo.

### Pruebas de integración

- carga correcta mediante `POST /api/exchange-rates`;
- respuestas y códigos de error para archivo ausente, tipo no admitido, columnas ausentes, archivo vacío y archivo superior a 10 MB;
- procesamiento mixto de filas válidas e inválidas;
- comprobación de que el archivo se mantiene en memoria y no se crea en disco.

### Pruebas de interfaz

- carga del CSV y renderizado de ambas series;
- cambio entre los cuatro intervalos sin una segunda petición de red;
- contenido del tooltip y funcionamiento de la cruz con puntero;
- recorrido de observaciones y cierre del tooltip mediante teclado;
- activación y desactivación de series desde la leyenda;
- presentación de estados de carga, éxito parcial y error;
- adaptación del gráfico a distintos tamaños de pantalla;
- auditoría automatizada de accesibilidad y comprobación manual de navegación por teclado.

## 9. Criterios de aceptación

1. Dado un CSV de hasta 10 MB con `observation_date` y `DEXUSEU`, cuando el usuario lo carga, la aplicación representa todas las filas válidas y omite las incompletas o inválidas.
2. Dado el archivo de muestra `DEXUSEU.csv`, la aplicación reconoce los valores vacíos sin impedir la generación del gráfico.
3. El gráfico muestra la fecha en el eje X y el tipo de cambio en el eje Y, con referencias anuales visibles en el eje temporal.
4. La leyenda identifica las series USD por EUR y EUR por USD y permite alternar su visibilidad.
5. El selector ofrece exactamente 1, 2, 5 y 10 años, filtra con límites inclusivos desde la fecha más reciente del archivo y no genera nuevas peticiones de red.
6. Al pasar el puntero por una observación, aparece una cruz completa y un tooltip con fecha y ambas cotizaciones.
7. Con el gráfico enfocado, las flechas arriba y abajo recorren las observaciones visibles, anuncian sus valores y `Escape` oculta el tooltip.
8. La aplicación informa cuántas filas se leyeron, aceptaron y descartaron, y los contadores cumplen `totalRows = validRows + discardedRows`.
9. Un archivo sin las columnas obligatorias, superior a 10 MB o sin datos válidos genera el código y mensaje correspondientes y no muestra un gráfico vacío o engañoso.
10. El archivo cargado no se escribe en disco ni se registra y su búfer se libera al finalizar la petición.
11. La interfaz cumple los requisitos de teclado, contraste y adaptación a dispositivos móviles, tabletas y equipos de escritorio.
12. Las pruebas unitarias, de integración y de interfaz definidas en esta especificación se ejecutan correctamente antes de considerar finalizada la versión.

## 10. Decisiones técnicas

Se recomienda **Apache ECharts** frente a Chart.js o Recharts porque ofrece de forma nativa e integrada ejes temporales, múltiples series, leyendas interactivas, `axisPointer` de tipo cruz, tooltips configurables y optimizaciones para conjuntos de datos amplios. React y Express separan claramente la presentación del procesamiento del archivo y permiten validar el CSV en el servidor sin almacenar su contenido.
