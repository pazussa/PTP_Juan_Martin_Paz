# Hallazgos confirmados en Bon-Bonite

Observaciones obtenidas durante la exploración de la interfaz real con Playwright CLI. Se documentan por separado de los resultados automatizados: un hallazgo describe el comportamiento observado y su riesgo; el reporte o evidencia conservada describe cada corrida.

## Resumen

| ID | Hallazgo | Área | Prioridad sugerida | Estado |
| --- | --- | --- | --- | --- |
| BB-001 | `/account/` responde 404 | Navegación / alcance funcional | Alta | Abierto; documentado fuera de los 3 escenarios |
| BB-002 | `Nombres` y `Apellidos` no están asociados con sus campos | Registro / accesibilidad | Media | Abierto |
| BB-003 | Error JavaScript al inicializar listeners en varias plantillas | Front-end / consola | Media | Abierto |
| BB-004 | Contraseña validada solo por longitud y coincidencia, sin medidor visible | Registro / seguridad UX | Media | Abierto; reglas actuales automatizadas |
| BB-005 | El minicart muestra productos ajenos a la sesión actual | Carrito / caché | Alta | Abierto; requiere atención prioritaria |
| BB-006 | Validaciones de PQRS no coinciden con lo comunicado en el formulario | PQRS / integridad de datos | Media | Abierto; fuera del resultado comercial |
| BB-007 | Recursos visuales de PQRS responden 404 | PQRS / front-end | Baja | Abierto |
| BB-008 | Meta Pixel se inicializa con un identificador duplicado | Mercadeo / analítica | Media | Abierto; revisar medición |
| BB-009 | El checkout permite continuar sin registro/login | Compra / requisito de acceso | Alta | Abierto; requiere definición de producto |
| BB-010 | El aviso de cookies se inyecta tarde y puede absorber el primer clic | Consentimiento / UX | Media | Abierto; mitigado en la suite |

Las prioridades son una recomendación de QA y deben acordarse con producto, desarrollo y seguridad.

## BB-001 — La ruta `/account/` responde 404

**Contexto:** el alcance entregado enumera `Mi cuenta` y `Account` como módulos. En la versión revisada, el módulo de usuario funcional se encuentra en `/mi-cuenta/`; la ruta independiente `/account/` no existe.

**Pasos de reproducción:** 

1. Abrir `https://www.bon-bonite.com/account/`.
2. Revisar el estado de la navegación y el título de la página.

**Resultado actual:** la respuesta es HTTP 404 y se presenta una página no encontrada.

**Resultado esperado:** si `Account` es realmente un módulo independiente del alcance, la ruta debe responder con estado menor que 400 y presentar contenido funcional. Si el nombre se refería a `Mi cuenta`, el requerimiento y la navegación deben unificarse en `/mi-cuenta/`.

**Riesgo:** incumplimiento directo del alcance o enlace potencialmente roto para consumidores que usen la ruta indicada.

**Cobertura actual:** no se incluye como un cuarto test ni como fallo esperado dentro del reporte comercial de tres escenarios. E01 prueba el módulo funcional `/mi-cuenta/`; este 404 permanece como hallazgo abierto. Si `Account` era solamente otro nombre para `Mi cuenta`, el cliente debe confirmar esa interpretación y unificar el requerimiento. Si era una ruta independiente, debe corregirse antes de añadir una regresión positiva.

## BB-002 — Etiquetas `Nombres` y `Apellidos` mal asociadas

**Contexto:** formulario `Crea tu cuenta` dentro de `/mi-cuenta/`.

**Pasos de reproducción:**

1. Abrir `/mi-cuenta/` y seleccionar la opción para crear una cuenta.
2. Obtener el árbol accesible con `playwright-cli snapshot`.
3. Comparar los nombres accesibles de Número de cédula, Nombres y Apellidos.

**Resultado actual:** los textos `Nombres` y `Apellidos` terminan asociados al control de Número de cédula. Ese control recibe un nombre accesible concatenado, mientras los campos visuales de nombre y apellido aparecen sin nombre accesible propio.

**Resultado esperado:** cada elemento `label` debe apuntar al `id` único del campo que describe: cédula, nombres y apellidos, respectivamente.

**Riesgo:** usuarios de lectores de pantalla reciben instrucciones incorrectas; hacer clic en una etiqueta puede llevar el foco al control equivocado; y los localizadores semánticos como `getByLabel` dejan de ser confiables.

**Recomendación:** corregir los atributos `for`/`id`, garantizar identificadores únicos y añadir una verificación de accesibilidad del formulario. Los Page Objects actuales usan identificadores estables como contingencia, no como justificación para conservar el defecto.

## BB-003 — Excepciones JavaScript al inicializar listeners

**Contexto:** al cargar `/mi-cuenta/`, las categorías de producto y algunas fichas, la consola registra excepciones durante la inicialización de listeners.

**Evidencia observada:**

```text
TypeError: Cannot read properties of null (reading 'addEventListener')
at HTMLDocument.<anonymous> (https://www.bon-bonite.com/mi-cuenta/:1140:9)
```

El mismo tipo de error se confirmó en `/categoria-producto/zapatos-mujer/`, `/categoria-producto/bonos-de-regalo/` y `/producto/bono-de-regalo/`; en esta última también aparece dentro de `assets/js/main.js?ver=3.0.1`.

**Resultado actual:** el script intenta invocar `addEventListener` sobre un elemento inexistente. La excepción también se observó en más de una carga, por lo que no corresponde a un único clic de la prueba.

**Resultado esperado:** el elemento requerido debe existir antes de enlazar eventos o el script debe comprobar el resultado del selector y omitir de forma segura la inicialización cuando el menú no esté presente.

**Riesgo:** la excepción puede detener el resto del bloque de inicialización y dejar interacciones del encabezado, menús o variaciones de producto sin enlazar. No se afirma que todos esos controles estén rotos; se requiere una prueba dirigida después de corregir la excepción.

**Recomendación:** localizar el selector que devuelve `null`, ajustar el momento de inicialización y proteger el acceso. Añadir una comprobación de errores de página/consola al flujo de cuenta una vez que el sitio quede limpio, para no convertir ruido conocido de terceros en falsos positivos.

## BB-004 — Política y feedback de contraseña insuficientes

**Contexto:** validación del formulario `Crea tu cuenta`, antes de enviarlo.

**Pasos de reproducción:**

1. Escribir dos valores iguales de 7 caracteres: la interfaz informa que se requieren al menos 8.
2. Escribir dos valores distintos de 8 caracteres: la interfaz informa que no coinciden.
3. Escribir `12345678` en ambos campos.

**Resultado actual:** al cumplir ocho caracteres y coincidencia desaparece la advertencia. No se muestra un medidor de fortaleza ni feedback de complejidad que diferencie una clave trivial de una robusta.

**Resultado esperado:** producto y seguridad deben definir la política aplicable. La interfaz debería comunicarla antes del envío y ofrecer feedback coherente, sin depender únicamente de longitud y coincidencia.

**Riesgo:** el usuario puede interpretar una contraseña débil como suficientemente segura. Esto afecta la experiencia y puede elevar el riesgo de toma de cuentas si el servidor tampoco aplica controles adicionales.

**Alcance de la evidencia:** E01 verifica el comportamiento de cliente descrito —mínimo de 8 y coincidencia— antes de registrar la cuenta con una contraseña criptográfica distinta. Esta observación **no demuestra** que el backend acepte, almacene o autentique `12345678`; la clave débil nunca se envía al servidor.

**Recomendación:** acordar la política con seguridad, validarla también en backend, informar los requisitos de forma accesible y considerar comprobaciones contra contraseñas comunes o comprometidas. Evitar reglas arbitrarias que solo incentiven patrones predecibles.

## BB-005 — Posible contaminación de caché en el minicart

**Contexto:** ficha de `/producto/bono-de-regalo/` abierta en un contexto de navegador sin cookies ni artículos creados por la exploración actual.

**Pasos de reproducción:**

1. Abrir la ficha del bono con cookies y carrito de la sesión actual vacíos.
2. Recargar la ficha y revisar el minicart del encabezado.
3. Abrir `/carrito` y comparar ambos estados.
4. Añadir un bono, comprobar el minicart, retirarlo y volver a recargar la ficha.

**Resultado actual:** tras la recarga, el minicart presenta tres productos que no fueron añadidos en el contexto actual y un subtotal de `$897.230`, mientras la página `/carrito` confirma que el carrito está vacío. Al añadir el bono, los fragments de WooCommerce corrigen temporalmente el minicart; al retirarlo y recargar la ficha, reaparece el contenido ajeno.

**Resultado esperado:** minicart, carrito y sesión deben mostrar siempre el mismo contenido. Un contexto nuevo o vacío no debe recibir productos ni importes almacenados por otra respuesta cacheada.

**Riesgo:** inconsistencia crítica para la compra y posible exposición de la composición de un carrito que no pertenece al contexto actual. La evidencia apunta a contaminación de caché o fragments, pero por sí sola no identifica al propietario de esos datos ni demuestra acceso al checkout de otra persona; el origen debe investigarse del lado del servidor y CDN.

**Recomendación:** revisar reglas de caché de página completa, variación por cookies de WooCommerce, exclusiones de carrito/checkout/cuenta y actualización de cart fragments. Purgar la respuesta afectada y añadir una regresión con dos contextos aislados que compruebe que producto, minicart y `/carrito` nunca comparten estado.

**Mitigación en E03:** la automatización no usa el minicart como fuente de verdad. Abre `/carrito/`, exige exactamente una fila de producto y valida bono, cantidad y precio antes del checkout. BB-005 continúa abierto porque esa mitigación no corrige el comportamiento de producción.

## BB-006 — Validaciones incompletas o contradictorias en PQRS

**Contexto:** formulario `Solicitud de PQRS` en `/pqrs/`. La comprobación se hizo sin crear una solicitud: el formulario permaneció bloqueado por otros datos obligatorios ausentes.

**Resultado actual:**

- el número de documento acepta `ABC`, aunque la ayuda indica que solo admite números;
- `Causal *` aparece al seleccionar `Solicitud de reversión total`, pero el control no presenta validación obligatoria; y
- `Adjuntar archivos *` tampoco presenta validación obligatoria aunque el asterisco comunica que el dato es requerido.

**Resultado esperado:** el comportamiento, los mensajes y la obligatoriedad visual deben coincidir. El documento debe aplicar el formato anunciado; si causal o adjunto son obligatorios —global o condicionalmente— deben impedir el envío y explicar el error. Si son opcionales, se debe retirar el asterisco.

**Riesgo:** radicados incompletos o con identificadores inválidos, reprocesos manuales y expectativas incorrectas para el cliente que diligencia el formulario.

**Cobertura actual:** E02 comprueba controles, opciones, fecha, adjuntos y una consulta con un radicado numérico inexistente de 15 dígitos. No usa `test.fail`, no consulta un campo vacío y no mezcla estos defectos con el resultado comercial. Las discrepancias de documento, causal y adjunto permanecen documentadas y pueden convertirse en regresiones negativas separadas cuando el cliente autorice ampliar los tres escenarios.

**Recomendación:** definir las reglas de negocio por tipo de PQRS, aplicar las mismas reglas en cliente y servidor, y automatizar casos de frontera. No confiar únicamente en validación HTML o JavaScript para proteger la integridad del dato.

## BB-007 — Recursos de PQRS no encontrados

**Contexto:** carga pública de `/pqrs/`.

**Resultado actual:** las solicitudes de `uploadicon.png` y `arrowdown.png` responden HTTP 404.

**Resultado esperado:** los recursos referenciados por el formulario deben responder correctamente o eliminarse del marcado y los estilos si ya no se usan.

**Riesgo:** controles con indicadores visuales ausentes o degradados, ruido de consola/red y mayor dificultad para distinguir fallos funcionales reales.

**Recomendación:** corregir las rutas o desplegar los archivos, limpiar cachés y confirmar la carga con el panel de red y una revisión visual del selector de archivos y desplegables.

## BB-008 — Inicialización duplicada de Meta Pixel

**Contexto:** durante la carga de categorías, cuenta, PQRS y fichas de producto, la consola de Chromium emite la advertencia `[Meta Pixel] - Duplicate Pixel ID: 629096188369848`.

**Resultado actual:** el mismo identificador de Pixel se registra más de una vez en una página. La advertencia se repite entre plantillas, por lo que no corresponde a una navegación aislada de la prueba.

**Resultado esperado:** cada página debe inicializar una sola vez el Pixel configurado y enviar cada evento de negocio únicamente según el plan de medición aprobado.

**Riesgo:** si la doble inicialización también duplica eventos, puede inflar PageViews, conversiones o audiencias y afectar decisiones de mercadeo. La advertencia por sí sola no demuestra que todos los eventos estén duplicados; debe confirmarse en la pestaña de red y en Meta Events Manager.

**Recomendación:** revisar si el Pixel está instalado simultáneamente por el tema, un plugin y/o Google Tag Manager. Conservar una sola fuente, depurar los eventos de vista y conversión, y comparar sus identificadores antes y después del ajuste.

## BB-009 — El checkout permite continuar como invitado

**Contexto:** el requerimiento indica que un cliente debe registrarse y luego iniciar sesión para acceder al sitio y realizar una compra.

**Pasos de reproducción:**

1. Abrir un contexto sin sesión autenticada.
2. Añadir un producto al carrito.
3. Abrir `/finalizar-compra/`.
4. Avanzar desde el resumen inicial.

**Resultado actual:** el checkout presenta la invitación para ingresar a una cuenta, pero también permite continuar hacia facturación sin autenticarse.

**Resultado esperado según el requerimiento:** antes de facturar o registrar una orden, el sitio debería exigir registro e inicio de sesión. Si la compra como invitado es una decisión deliberada, el requerimiento debe actualizarse y definir qué datos o beneficios dependen de una cuenta.

**Riesgo:** desalineación entre la regla comunicada y el comportamiento desplegado, pedidos no asociados al historial esperado y flujos diferentes para servicio al cliente.

**Cobertura actual:** E03 usa deliberadamente la cuenta creada por E01 y confirma la sesión antes de comprar. El escenario demuestra el flujo requerido, pero no oculta que el sitio también admite invitados.

**Recomendación:** producto, mercadeo y tecnología deben decidir si el checkout de invitado se conserva. Después se debe bloquear técnicamente o formalizarlo y automatizar ambos contratos.

## BB-010 — El aviso de cookies puede absorber el primer clic

**Contexto:** el diálogo de consentimiento (`#cookiescript_injected`) se inyecta de forma tardía y puede aparecer en cualquier ruta, incluso cuando la página ya parece lista para interactuar.

**Pasos de reproducción:**

1. Abrir `/pqrs/` en un contexto nuevo, sin cookies aceptadas.
2. Escribir un radicado en `Número de radicado` y pulsar `Consultar` en el instante en que el aviso se está inyectando.

**Resultado actual:** el overlay del aviso captura el clic destinado a `Consultar`; la consulta nunca se envía y la interfaz no muestra respuesta ni error. Se reprodujo el 27 de agosto de 2026 durante una corrida automatizada: el manejador aceptó el aviso en cuanto apareció, pero el clic original ya se había perdido y la página quedó sin resultado.

**Resultado esperado:** el consentimiento debe bloquear la interacción de forma consistente desde el primer render, o su superposición no debe capturar clics dirigidos a controles funcionales ya visibles.

**Riesgo:** un usuario real puede pulsar un botón sin efecto y sin feedback, e interpretar el silencio como una falla del servicio.

**Mitigación en la suite:** la fixture acepta el consentimiento apenas aparece y la consulta del radicado —de solo lectura e idempotente— repite el par clic→resultado hasta observar la respuesta. Ninguna operación con efectos se repite por esta causa.

**Recomendación:** cargar el aviso de forma bloqueante antes de habilitar la página o garantizar que el overlay no intercepte eventos sobre controles ya interactivos. Verificar el ajuste repitiendo los pasos con red lenta simulada.

## Limitaciones verificadas del escenario de compra

- El ambiente productivo entrega el pago a Wompi y no se proporcionó una pasarela sandbox ni credenciales de prueba.
- La automatización registra una orden y valida su historial privado, pero no ingresa tarjeta ni efectúa cobro.
- Las órdenes técnicas `1030611`, `1030618` y `1030619` quedaron con estado observado `Pendiente de pago`; deben cancelarse administrativamente y no despacharse.
- El video final conservado muestra el recorrido de compra completo hasta la entrega a Wompi. No es evidencia de un pago ni de una transacción aprobada: el flujo se detiene antes de cualquier dato de tarjeta.
- La suite impide reenvíos ciegos, pero la idempotencia absoluta requeriría una clave implementada en el backend.


