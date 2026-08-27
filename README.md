# Automatización E2E de Bon-Bonite

Suite de pruebas de interfaz para `https://www.bon-bonite.com/`, construida con **Playwright Test y TypeScript**. Contiene tres escenarios descritos a continuación:

**Después de instalar librerías, ejecutar con :**

```bash
npm run test:client      # Ejecuta los tres escenarios
```

## Los tres escenarios entregados

| ID | Escenario | Módulos del requerimiento | Efecto en producción |
| --- | --- | --- | --- |
| **E01** | Un cliente nuevo se registra, cierra la sesión automática, inicia sesión explícitamente, modifica cinco datos y comprueba que persisten. | Mi cuenta · Account · registro y modificación de usuario | Crea una cuenta técnica. |
| **E02** | Recorre las cinco categorías y abre una ficha real en cada una; después valida PQRS y consulta un radicado inexistente de 15 dígitos. | Zapatos · Bolsos · Cinturones · Accesorios · Outlet · PQRS | Ninguno: solo lectura. |
| **E03** | El cliente autenticado compra un bono de $50.000: carrito, checkout con Wompi, registro de la orden y comprobación en `Mi cuenta > Pedidos`. | Bonos de regalo · compra de un producto | Crea una orden pendiente; **sin pago**. |


Los defectos encontrados en el sitio  se documentan aparte en [docs/HALLAZGOS.md](docs/HALLAZGOS.md).

## Ejecutar la suite

Funciona igual en **Windows, Linux y macOS**. El único requisito previo es Node.js 20 o superior.

**Paso 1 — instalar** (una sola vez). Elige la forma que prefieras; todas hacen lo mismo:

| Sistema | Comando |
| --- | --- |
| Cualquiera, desde la terminal | `npm run setup` |
| Windows | doble clic en `setup-windows.cmd` |
| Linux o macOS | `./setup-linux-mac.sh` |

El instalador comprueba la versión de Node, crea `.env` si no existe, instala las dependencias y Chromium, y verifica que los tres tests se descubren.

**Paso 2 — ejecutar:**

```bash
npm run test:client      # Ejecuta los tres escenarios
```

| Comando | Qué ejecuta |
| --- | --- |
| `npm test` | E02 únicamente. **Opción segura por defecto.** |
| `npm run test:headed` | E02 con navegador visible. |
| `npm run test:client` | Los tres escenarios. Crea una cuenta y una orden reales. |
| `npm run test:account` | Solo E01. |
| `npm run test:purchase` | E01 y luego E03. |
| `npm run test:purchase:reconcile` | Solo E03 reutilizando la sesión, tras una compra ambigua. |
| `npm run test:ci` | E02 headless con política estricta de CI. |
| `npm run check` | TypeScript estricto y descubrimiento de tests. |
| `npm run report` | Abre el último reporte HTML. |
| `npm run setup` | Instalación completa; sirve en cualquier sistema operativo. |

`npm run test:client` habilita los tres escenarios directamente: no hace falta editar `.env` ni ingresar una autorización adicional. La corrida crea datos reales; al terminar, hay que pedir al administrador que cancele la orden sin despacharla.

Instalación por plataforma, variables de entorno, mantenimiento y solución de problemas están en [docs/OPERACION.md](docs/OPERACION.md).

## Arquitectura

```text
tests/scenarios/          pasos y resultados de negocio
       │
       ▼
fixtures/                 Page Objects, cookies y ciclo de vida de la compra
       │
       ▼
pages/                    localizadores, acciones y aserciones por pantalla
       │
       ▼
test-data/                datos únicos y contratos tipados

account-setup (E01) ── storageState ──► purchase-chromium (E03)
public-chromium (E02) ─────────────────► independiente y seguro
```

Page Objects, fixtures tipadas y datos separados son apropiados aquí porque hay varias pantallas, un estado autenticado compartido entre proyectos y operaciones reutilizables. 

| Carpeta | Responsabilidad |
| --- | --- |
| `tests/scenarios/` | Expresa el caso de prueba: pasos de negocio y resultados esperados. |
| `pages/` | Encapsula los localizadores y las aserciones de cada pantalla. |
| `fixtures/` | Construye los Page Objects, acepta el aviso de cookies y gestiona el ciclo de vida de la orden técnica. |
| `test-data/` | Genera datos únicos y define los contratos tipados. |
| `playwright.config.ts` | Proyectos, dependencias, navegador, evidencias y barreras de seguridad. |

La suite corre con **un solo worker**: el destino es producción, aplica limitación por IP y serializar reduce la carga y evita colisiones entre cuentas.

### Estructura

```text
.
├── docs/
│   ├── HALLAZGOS.md                    defectos encontrados en el sitio
│   └── OPERACION.md                    instalación, variables y mantenimiento
├── fixtures/
│   ├── fixtures.ts                     Page Objects tipados y cookies
│   ├── purchase-session.ts             ciclo de vida de la orden técnica
│   └── global-setup.ts                 lock de ejecuciones mutantes
├── pages/
│   ├── base.page.ts                    navegación GET y shell común
│   ├── account.page.ts                 registro, login, logout y perfil
│   ├── orders.page.ts                  historial de pedidos y detalle
│   ├── catalog.page.ts                 cinco categorías y primera ficha
│   ├── pqrs.page.ts                    formulario y consulta de radicado
│   ├── gift-card.page.ts               categoría, producto y alta al carrito
│   ├── cart.page.ts                    contenido, checkout y limpieza segura
│   └── checkout.page.ts                facturación, Wompi y submit único
├── test-data/
│   ├── account.ts                      cuenta y perfil únicos
│   ├── catalogs.ts                     rutas y títulos de categorías
│   ├── checkout.ts                     datos técnicos de facturación
│   ├── pqrs.ts                         radicado inexistente de 15 dígitos
│   ├── products.ts                     bono de regalo: nombre, valor y rutas
│   └── runtime.ts                      estado autenticado e intento de compra
├── tests/scenarios/
│   ├── 01-account-lifecycle.spec.ts    E01
│   ├── 02-public-modules.spec.ts       E02
│   └── 03-gift-card-purchase.spec.ts   E03
├── artifacts/                          evidencia e inventarios locales (fuera de Git)
├── scripts/
│   ├── setup.js                        instalación multiplataforma en Node
│   ├── codegen.js                      Chromium con CDP para Playwright CLI
│   └── diag-page.js                    diagnóstico de una página
├── setup-windows.cmd                   lanzador de instalación en Windows
├── setup-linux-mac.sh                  lanzador de instalación en Linux/macOS
└── playwright.config.ts
```

### Componentes destacados

| Componente | Responsabilidad |
| --- | --- |
| `BasePage` | Navega con `domcontentloaded`, exige respuesta HTTP menor que 400 y concede a los GET idempotentes hasta dos reintentos con pausa, solo ante fallos de transporte. |
| `AccountPage` | Acceso público, requisitos y reglas de contraseña, registro, logout, login y edición del perfil. El envío del login está aislado en un método que informa si quedó sesión, para que un reenvío ocurra solo cuando el servidor confirma que no la hay. |
| `OrdersPage` | Historial privado y detalle de una orden. Es la única fuente de verdad sobre si una compra quedó registrada. |
| `CatalogPage` | URL, título, filtros, total, tarjetas y relación entre `title-<id>` e `image-<id>` antes de abrir la primera ficha. |
| `PqrsPage` | Controles, fecha de Bogotá, adjuntos, tipos y causales; consulta un radicado inexistente y valida la respuesta. |
| `GiftCardPage` | Seis denominaciones, selección de $50.000 y alta al carrito. Delega en `CartPage` la lectura del estado del carrito. |
| `CartPage` | Una fila, cantidad, precio y enlace al checkout. Retira el bono solo cuando no se comprobó una orden. |
| `CheckoutPage` | Facturación autorizada, límite de total, validación de Wompi y un único POST de checkout. |
| `purchase-session.ts` | Constancia del submit, evidencia de la orden, limpieza del carrito y borrado de la sesión, en el teardown de la fixture. |
| `global-setup.ts` | Adquiere `mutating-run.lock` de forma atómica y rechaza dos ejecuciones mutantes simultáneas. |

## Diseño de los tres escenarios

### E01 — Registro, login y modificación

`tests/scenarios/01-account-lifecycle.spec.ts`

1. Abre `/mi-cuenta/` y valida el formulario público.
2. Abre el registro y comprueba campos requeridos, tipo de correo, política de privacidad y feedback de contraseña.
3. Genera y registra una cuenta técnica única, con documento y contraseña de entropía criptográfica.
4. Si el sitio inicia sesión automáticamente, la cierra.
5. Inicia sesión explícitamente. El envío no se repite a ciegas: si el transporte lo interrumpe, se recarga `/mi-cuenta/` y solo cuando el servidor confirma que **no** quedó sesión se autoriza un único reenvío.
6. Abre Datos y modifica nombre, apellido, fecha de nacimiento, género y teléfono.
7. Recarga la ruta y comprueba que el servidor conserva los cinco valores.
8. Guarda el estado autenticado para E03, **sin** guardar la contraseña.

Protegido por `RUN_MUTATING_TESTS=1`, sin retries. Deja una cuenta permanente porque el sitio no ofrece eliminación desde la interfaz.

### E02 — Catálogos y PQRS

`tests/scenarios/02-public-modules.spec.ts`

Recorre Zapatos, Bolsos, Cinturones, Accesorios y Outlet. En cada categoría valida respuesta HTTP, URL, título, encabezado y pie, filtros, total de resultados, tarjetas publicadas y abre la primera ficha comprobando que el nombre coincide. Después abre PQRS, valida sus controles, la fecha de Bogotá, los adjuntos y las opciones de documento, solicitud y causal; escribe el radicado reservado `999999999999999`, consulta y comprueba el mensaje de radicado inexistente.

No registra usuarios, no crea solicitudes PQRS ni modifica el carrito. Es el único escenario que se ejecuta en CI.

### E03 — Compra controlada de un bono

`tests/scenarios/03-gift-card-purchase.spec.ts`

1. Carga la sesión creada por E01 y confirma que el cliente sigue autenticado.
2. Consulta primero `Mi cuenta > Pedidos`. Si esa cuenta **ya** tiene una orden técnica, la valida y termina sin volver a comprar.
3. Si no existe, abre Bonos de regalo y selecciona una unidad de $50.000.
4. Valida producto, cantidad y precio en `/carrito/`; no usa el minicart, afectado por [BB-005](docs/HALLAZGOS.md).
5. Completa la facturación técnica en Medellín con una nota explícita de no despacho.
6. Exige un solo bono, cantidad uno, subtotal $50.000, total entre $50.000 y $60.000, consentimiento y Wompi como único medio de pago.
7. Escribe `purchase-intent.json` antes del submit, sin credenciales ni datos de pago.
8. Pulsa `#place_order` **exactamente una vez** y cuenta los POST `wc-ajax=checkout` observados.
9. Captura la respuesta por anticipado: el origen se fija antes de cualquier redirección y el destino solo puede ser `wompi.co` por HTTPS.
10. Si la respuesta, el redirect o la carga del gateway fallan, conserva el error pero **primero** comprueba Pedidos; nunca repite el POST.
11. Comprueba una sola orden con estado `Pendiente de pago` y el bono en el detalle privado.
12. Solo entonces elimina sesión, contexto e intento.

El bono se eligió por ser el producto estable de menor valor que no depende de talla, color ni inventario. El sitio le aplica envío: el total observado fue $58.319 y el límite preventivo quedó en $60.000.

## Seguridad de una compra en producción

Una compra no es idempotente: reenviarla crea una segunda orden real. El escenario se diseñó alrededor de esa restricción.

| Barrera | Qué impide |
| --- | --- |
| `RUN_PURCHASE_TESTS=1` | Que E03 corra por accidente. |
| `mutating-run.lock` | Que dos ejecuciones simultáneas crucen cuentas o sesiones. |
| Consulta previa de Pedidos | Que una cuenta con orden previa compre otra vez. |
| `purchase-intent.json` (escritura exclusiva) | Que un submit ambiguo se reenvíe: mientras exista, E01 no crea cuentas y E03 solo reconcilia. |
| Conteo de POST `wc-ajax=checkout` | Que la interfaz emita más de un registro de orden. |
| Límite de total en $60.000 | Que un cambio de precio o de carrito dispare un cargo mayor al previsto. |
| Allowlist `wompi.co` por HTTPS | Que el flujo salga hacia un dominio no autorizado. |
| Sin retries en E01/E03 | Que Playwright repita una operación con efectos. |

El estado autenticado temporal **solo** se borra después de comprobar la orden: mientras no esté comprobada, esos archivos permiten reconciliar sin volver a comprar.

## Localizadores y estabilidad

Prioridad de localizadores:

1. `getByRole` con nombre accesible y coincidencia exacta cuando aplica;
2. texto de negocio exacto o regex anclado;
3. ID, `name`, `href` o prefijo funcional estable;
4. relación entre elementos con `filter({ has })` y `filter({ hasNot })`.

No se usan XPath estructurales, clases visuales, refs `eNN`, `waitForTimeout`, `networkidle`, clics con `evaluate`, `force: true` ni índices arbitrarios. Todas las aserciones de interfaz son web-first y llevan un mensaje de negocio.

Excepciones justificadas, cada una comentada en el código:

- El registro usa IDs porque las etiquetas `Nombres` y `Apellidos` están mal asociadas en el sitio ([BB-002](docs/HALLAZGOS.md)).
- Los Select2 de PQRS y checkout usan el `name`/ID del control nativo porque no exponen un nombre accesible estable.
- El tema publica controles de escritorio y móvil a la vez; `filter({ visible: true })` selecciona la única variante accionable.
- El resumen del checkout se acota por ID a `#step1` y `#order_review`. Esos contenedores excluyen el minicart del encabezado, contaminado por caché según [BB-005](docs/HALLAZGOS.md), que por eso nunca se usa como fuente de verdad.
- El nombre del bono se localiza por contención y no con un regex anclado: el tema anida la cantidad dentro del mismo contenedor del nombre, así que el texto completo del elemento nunca es solo el nombre.
- El segundo botón Continuar del checkout recibe `press('Enter')` porque una capa visual intercepta el puntero, aunque el botón accesible funciona por teclado.

El producto del escenario de compra —nombre, denominación y rutas— vive en `test-data/products.ts`, de modo que un cambio de catálogo se ajusta en un solo lugar.

### Cookies y cambios de red

El aviso de consentimiento puede aparecer en cualquier ruta. Una fixture automática registra `addLocatorHandler` y lo acepta siempre que aparezca.

`BasePage` permite hasta tres intentos para una navegación GET: el primero, y hasta dos más con pausas de 1 s y 2 s, **únicamente** ante un fallo de transporte (`ERR_NETWORK_CHANGED` confirmado por el listener de `requestfailed`, o la interrupción hacia `chrome-error://`). Los estados 403, 429, 5xx, timeout y DNS **no** se reintentan: son fallos reales y se reportan como tales.

El aviso de cookies puede inyectarse en el mismo instante de un clic y absorberlo ([BB-010](docs/HALLAZGOS.md)). La única acción que se repite por esa causa es la consulta del radicado PQRS, por ser de solo lectura e idempotente.


**Los tres escenarios se validaron en una corrida consolidada `npm run test:client` con navegador visible: 3/3 aprobados**.

| Comprobación | Resultado |
| --- | --- |
| Descubrimiento | Exactamente 3 tests en 3 archivos. |
| Corrida consolidada headed | 3/3 aprobados en una sola ejecución. |
| E01 | Registro, logout, login explícito, edición de cinco campos y persistencia. |
| E02 | Cinco categorías con ficha navegable y consulta PQRS con respuesta controlada. |
| E03 | Orden creada con un único POST y comprobada en el detalle privado de Pedidos. |
| Pago | No se ingresó tarjeta ni se efectuó cobro; la orden quedó `Pendiente de pago`. |
| Seguridad | El estado autenticado temporal se eliminó solo tras comprobar la orden. |
| TypeScript | `npm run typecheck` sin errores, con `noUnusedLocals` y `noUnusedParameters`. |

La evidencia de la corrida —un video por escenario— y el detalle de comandos se conservan localmente bajo `artifacts/`. No se versionan: son registros de una ejecución concreta y se comparten por un canal controlado.


## Hallazgos en el sitio

Diez defectos confirmados durante la exploración, con pasos de reproducción, riesgo y criterio de cierre en [docs/HALLAZGOS.md](docs/HALLAZGOS.md):

| ID | Hallazgo | Prioridad |
| --- | --- | --- |
| BB-001 | `/account/` responde 404. | Alta |
| BB-005 | El minicart muestra productos ajenos a la sesión. | Alta |
| BB-009 | El checkout permite continuar sin registro/login. | Alta |
| BB-002 | Etiquetas de nombre y apellido mal asociadas. | Media |
| BB-003 | Excepciones JavaScript al inicializar listeners. | Media |
| BB-004 | Política y feedback de contraseña insuficientes. | Media |
| BB-006 | Validaciones de PQRS contradictorias. | Media |
| BB-008 | Meta Pixel duplicado. | Media |
| BB-010 | El aviso de cookies puede absorber el primer clic. | Media |
| BB-007 | Recursos visuales de PQRS responden 404. | Baja |


## Documentación

| Documento | Contenido |
| --- | --- |
| [PTP_Juan_Paz_27082026.xlsx](PTP_Juan_Paz_27082026.xlsx) | Resultados de los tres escenarios en Excel: una pestaña por escenario, con datos de prueba, pasos, resultado esperado frente a obtenido y estado. |
| [docs/HALLAZGOS.md](docs/HALLAZGOS.md) | Los diez defectos del sitio, con reproducción y riesgo. |
| [docs/OPERACION.md](docs/OPERACION.md) | Instalación, variables, mantenimiento y solución de problemas. |
