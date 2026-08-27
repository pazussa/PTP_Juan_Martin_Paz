# Copilot Instructions

Pruebas automatizadas con **Playwright + TypeScript**. Estas reglas son obligatorias y tienen prioridad sobre cualquier patrón JS genérico. Antes de proponer/escribir código de prueba, sigue estas reglas siempre.

## Regla #0: Playwright primero

- Si una operación se puede expresar con un `Locator` o un matcher `expect(locator).toXxx()`, **úsalo**. No reimplementes con JS plano (`if/throw`, `for + waitForTimeout`, comparaciones manuales).
- Si una validación se puede expresar como `expect(...)`, **debe** ser un `expect`, no un `if/throw` ni un `log.info(... ? '✓' : '✗')`.
- Si una espera se puede expresar con auto-waiting de Playwright, **debe** ser auto-waiting, no `waitForTimeout`.
- Cualquier reintento manual con `for + waitForTimeout` se reescribe como `expect.toPass({ intervals, timeout })` o `expect.poll(...)`.
- Alinea con la guía oficial: docs.playwright.dev → Locators, Best Practices, Web-first assertions. Estas reglas de proyecto van primero, pero coinciden con esa guía.

## Estructura del test (debugabilidad obligatoria)

- Cada bloque lógico envuelto en `test.step('título descriptivo', async () => { ... })`. Produce pasos plegables y navegables con step-over en `--debug`/`--ui` y en el HTML report.
- El **título del step debe describir la operación con valores reales**, no abstractos.
  - Mal: `'Validar total'`
  - Bien: `'Paso 2: Calcular subtotal → 3 items × $10 = $30'`
- Para validaciones complejas, descomponer en steps "Paso 1: leer", "Paso 2: calcular", "Paso 3: comparar". Que se entienda el flujo sin leer el código.
- Una sola operación pendiente por línea — no encadenes 3 cosas en una sola sentencia.

## Locators

- Prioriza `getByRole(...)` y `getByText(...)` sobre `page.locator(CSS)`.
- Cuando uses `locator(...)`, ánclalo a un atributo estable (id, automation-id, data-testid). Nunca a clases visuales (`.btn-primary`, `.card-container`).
- Para apps legacy con IDs estables, `locator('[id^="prefijo_..."]')` es válido y preferible a CSS estructurales.
- Crea funciones `const loc = (param) => page.locator(...)` cuando reutilices el mismo patrón con distintos parámetros (filas, días, etc.).

## Aserciones (web-first)

- Usa `expect(locator).toBeVisible()`, `.toBeHidden()`, `.toBeEnabled()`, `.toBeDisabled()`, `.toContainText(...)`, `.toHaveText(...)`, `.toHaveValue(...)`, `.toHaveCount(...)` con auto-waiting.
- **Toda validación de negocio debe ser un `expect`**, no un `if/throw` ni un log condicional.
- Mensaje como segundo argumento: redactado como **afirmación positiva** (qué se verifica), no como descripción de error. Aparece como etiqueta del step en `--ui` aunque pase.
  - Bien: `expect(total, 'la orden suma $30').toBe(30)`
  - Mal: `expect(total, 'falló porque no sumó $30').toBe(30)`
- Pasa `RegExp` a `toContainText`/`toHaveText` cuando el formato importe (p. ej. `/^\d{2}:\d{2}$/`) y comenta el desglose del regex.
- Para condiciones que no son sobre un locator, usa `expect.poll(() => fn()).toBe(...)` o `expect(async () => { ... }).toPass({ timeout, intervals })`.

## Anti-patrones prohibidos

- **`page.waitForTimeout(...)`** para esperar que algo aparezca/cambie: usa `expect(...).toBeVisible({ timeout })` o `expect.poll`.
- **`page.evaluate(() => document.querySelectorAll(...))`** que escanee el DOM: usa locators con auto-waiting + `allInnerTexts()`/`allTextContents()`.
- **`locator.evaluate(el => el.click())`** y **`locator.evaluate(el => el.focus())`**: el `Locator` ya tiene `.click()`, `.focus()`, `.fill()`. El `evaluate` salta auto-waiting y actionability, y en frameworks tipo Angular NO dispara los handlers → cambios fantasma.
- **`if (await loc.isVisible())`** como sincronización: no espera. Usa `expect(loc).toBeVisible()` o `loc.waitFor({ state: 'visible' })`. `isVisible()` solo para una rama opcional sobre estado **instantáneo**.
- **`(await loc.count()) > 0`** como sustituto de visibilidad: usa `expect(loc).toHaveCount(>=1)` o `expect(loc).toBeVisible()`.
- **Bucles `for (let i = 0; i < N; i++) { ... waitForTimeout(...) }`** para reintento manual: usa `expect.toPass({ intervals, timeout })`.
- **`if (a !== b) throw new Error(...)`** para validaciones de negocio: usa `expect(a, 'mensaje').toBe(b)`. El `if/throw` solo aplica para guards de datos de entrada (validar JSON, configuración) ANTES del test, no dentro de steps.
- **`log.info('${ok ? "✓" : "✗"} ...')`**: si una condición merece marcarse con ✓/✗, debe ser un `expect`.
- **`force: true`** en `click()`/`check()` salvo justificación documentada (overlay conocido).

## Comentarios

- Por defecto **sin comentarios**. El código debe leerse solo.
- Solo comenta cuando el **WHY** sea no obvio: una restricción oculta, un workaround, un invariante sutil.
- Una línea, no docstrings multilínea ni explicar lo que el código ya dice.
- En regex no triviales sí explicar: pega el desglose `^...$` parte por parte.

## Datos de prueba

- Datos aleatorios cortos y compactos. Nunca textos largos.
- Lee el contexto real del DOM antes de inventar selectores.

## Fixtures

- Importa `test` y `expect` desde `fixtures/fixtures.ts` (fixtures del proyecto), **no** desde `@playwright/test` directamente.
- Pon ahí el setup reutilizable (p. ej. `homePage` que ya navegó a `baseURL`, o una página autenticada) en vez de repetirlo en cada test.

## Workflow recomendado al añadir/modificar tests

1. **Lee la página real** (`playwright-cli snapshot` o un snapshot del DOM provisto) antes de inventar locators.
2. **Identifica los asserts de negocio** (lo que un tester manual marcaría como ✓/✗) — van como `expect(...)` con título descriptivo.
3. **Envuelve cada bloque lógico en `test.step`** con el cálculo/operación visible en el título.
4. **Usa locators robustos** (`getByRole` > `getByText` > `[id^="..."]` estable > último recurso CSS).
5. **Sustituye toda espera fija por auto-waiting** o `expect.toPass`.
6. **Verifica con `--ui`**: cada paso debe leerse como una bitácora del tester manual.

## Validación de fixes con `playwright-cli` (recomendado)

- Para fixes de selector, lectura DOM o lógica que depende del estado de la página, valida el cambio contra la pantalla real con **`playwright-cli`** antes de declarar el fix terminado. La skill vive en `.claude/skills/playwright-cli/SKILL.md`.
- Flujo típico:
  1. `playwright-cli list` para ver sesiones activas.
  2. `npm run codegen` (abre Chromium headed con CDP en :9222; login opcional) o `playwright-cli open --persistent`.
  3. En otra terminal: `playwright-cli attach --cdp=http://localhost:9222`. Al terminar `playwright-cli detach` (NUNCA `close` si es el navegador del usuario).
  4. `playwright-cli snapshot` para obtener el árbol con `refs` (`eXX`) y verificar locators sin inventar.
  5. `playwright-cli eval "<expr>"` (o `--raw eval`) para correr la **misma operación** que ejecutará el test.
  6. Confirma caso "feliz" + caso "negativo".
- **NO** lances `npx playwright test ...` largos en background para validar pequeños fixes. Solo corre el spec completo cuando el cambio toca flujo end-to-end (login, navegación entre páginas).

## Depurar un test en ejecución (debug-cli)

- `npx playwright test <spec> --project=public-chromium --workers=1 --debug=cli` arranca PAUSADO e imprime `Session: tw-XXXXXX`.
- `playwright-cli attach tw-XXXXXX` para inspeccionar la página pausada; luego `playwright-cli resume` (PLAY — recuérdalo siempre, el debug-cli no avanza solo).
- Comandos clave attached: `snapshot`, `eval "<expr>"`, `step-over`, `pause-at <archivo:línea>`, `resume`.
- `--debug=cli` es para UN test. Para lotes multi-test, corre NORMAL con `--max-failures=N` alto (el 2º test falla con "Server is already started").

## Otros

- **Ejecuta SIEMPRE en modo headed** (navegador visible) — tests, exploración y validaciones — salvo que el usuario pida explícitamente headless. No actives `HEADLESS=1` por tu cuenta para acelerar; headless queda para CI o cuando el usuario lo pida.
- Lee y analiza el contexto del DOM provisto antes de proponer locators.
- Crea una sola prueba a la vez, salvo que se pida lo contrario.
- No toques `playwright.config.ts` ni fixtures compartidas salvo que el cambio se pida explícitamente.

---

## Workflows y experiencia (conocimiento no instalable)

Workflows, criterios y gotchas destilados de un proyecto real (pruebas Playwright contra una app web legacy). No se instalan: ahorran horas en cualquier proyecto nuevo. **Aplica cada punto solo si tu proyecto lo amerita**: 1-3 son universales; 4 (SPA/legacy), 5-6 (Windows/PowerShell), 7 (login federado) y 8 (simulación humana) son condicionales según tu app y tu SO.

### 1. Filosofía Playwright-first

El detalle completo está en la sección **«Reglas del proyecto»** de esta cápsula (lo que escribes en `.github/copilot-instructions.md`). Resumen:

- Si algo se puede expresar con un `Locator` o `expect(locator).toXxx()`, **úsalo**. Nada de JS plano.
- Toda validación de negocio es un `expect(...)` con **mensaje en positivo** (qué se verifica), nunca `if/throw` ni `log('✓/✗')`.
- Toda espera es **auto-waiting** o `expect.toPass`/`expect.poll`. **Nunca `waitForTimeout`** para sincronizar.
- Cada bloque lógico en `test.step('título con valores reales', ...)` → el HTML report y `--ui` se leen como una bitácora del tester manual.

### 2. Explorar interfaces con Copilot usando `playwright-cli` (sin MCP)

El flujo estrella. En vez de adivinar selectores, Copilot **lee la pantalla real**:

1. `npm run codegen` abre Chromium **headed** con CDP en `:9222` (login opcional vía `.env`).
2. En otra terminal: `playwright-cli attach --cdp=http://localhost:9222`.
3. `playwright-cli snapshot` → árbol de accesibilidad con `refs` (`e12`, `e34`...). De ahí salen los locators, sin inventar.
4. `playwright-cli eval "<expr>"` corre **la misma operación** que hará el test (mismo selector, mismo `evaluateAll`) para confirmarla antes de escribirla.
5. `playwright-cli run-code --filename=scripts/diag.js --raw` para evals largos. **El archivo es una expresión "bare" `async (page) => { ... }`** — sin `require`/`fs`/`process`. Para leer Excel/JSON usa un script Node aparte (`node scripts/x.js`).
6. `playwright-cli detach` al terminar (**NUNCA `close`** si es un navegador que abriste para inspeccionar: `detach` lo deja vivo).

> **No borres los `scripts/diag*.js` de exploración: hazlos reutilizables.** Los scripts que construyes para explorar (leer el DOM, localizar un contenedor, confirmar un selector) son un activo, no basura de usar y tirar. Antes de dar por cerrado el flujo, **parametrízalos** (recibe la URL / el término / el selector como constante arriba o argumento) y **déjalos en `scripts/`** con un nombre claro (`diag-busqueda.js`, `diag-tabs.js`) para reusarlos al escribir más tests o depurar regresiones. No los elimines al terminar. (Si quieres versionarlos, quita `/scripts/` de `.gitignore`.)

**Validar un fix así es más rápido que correr el spec entero.** Solo corre el test completo cuando el cambio toca flujo end-to-end (login, navegación entre páginas).

Comandos útiles attached: `snapshot`, `eval`, `click eXX`, `fill eXX "texto"`, `generate-locator eXX --raw`, `console`, `requests`, `--raw snapshot > antes.yml`.

### 3. Depurar un test que falla con `--debug=cli`

1. `npx playwright test <spec> --project=public-chromium --workers=1 --debug=cli` → arranca **pausado** e imprime `Session: tw-XXXXXX`.
2. `playwright-cli attach tw-XXXXXX`.
3. `playwright-cli resume` → **PLAY**. Recuérdalo siempre: el debug-cli **no avanza solo**.
4. Con la sesión pausada: `snapshot`, `eval "<expr>"` (mismas variables que el spec), `step-over` (avanza una llamada Playwright), `pause-at <archivo:línea>`.
5. Para tomar un locator a mano, deja `await page.pause()` en el punto y usa **"Pick locator"** del Inspector.

> **`--debug=cli` es para UN test.** Al 2º test falla con `browser.bind: Server is already started`. Para lotes multi-test, corre **normal** (sin `--debug=cli`) con `--max-failures=N` alto para que fallos aislados no detengan todo.

### 4. Gotchas de apps legacy / SPA (Angular, AngularJS y similares)

Transferibles a **cualquier** app con framework que maneja su propio ciclo de digest/render:

- **Un cambio en el DOM ≠ el framework lo procesó.** Sincroniza con señales reales: `expect(loc).toHaveValue(x)`, `toBeEnabled/Disabled()`, `waitFor({ state })`. Nunca `waitForTimeout`.
- **`locator.evaluate(el => el.click())` NO dispara los handlers del framework** (`ng-click` y equivalentes). Además salta actionability → deja "cambios fantasma". Usa el `.click()` real de Playwright.
- **Un botón "Guardar" no confirmó hasta que se DESHABILITA.** Tras el click: `expect(saveBtn).toBeDisabled({ timeout })`. Si sigue habilitado y no hay error, re-click en un bucle acotado.
- **Spinners globales**: localiza el overlay de carga y espera a que quede `hidden` **entre cada acción** que dispare re-render. En bucles (borrar filas, etc.) esperar el spinner por iteración es lo que hace converger un `expect.poll(count)`; sin él el conteo oscila.
- **Modales de "cambios sin guardar"** bloquean la navegación. Detéctalos por `[role="dialog"]` + texto y decídelos explícitamente (descartar vs guardar) — nunca los ignores.
- **Date-pickers**: `.fill()` suele ser un **no-op silencioso**. Posiciona fechas con clicks de calendario (navegación de meses), no escribiendo.
- **Regex de texto localizado**: usa charset explícito `[A-Za-zÁÉÍÓÚáéíóúñÑ]+`, **nunca `\w+`** (`\w` no matchea acentos/ñ → timeouts).

### 5. Terminal PowerShell en Windows

- **No pegar comandos multilínea.** El terminal los parte, deja continuaciones `>>` abiertas o cuelga prompts. Usa **una línea** encadenando con `;`. Si una secuencia es larga, ejecuta los comandos **uno por uno**.
- **Encadena con `;`, nunca `&&`** (PowerShell 5.1 no lo soporta como bash).
- **`Invoke-WebRequest` siempre con `-UseBasicParsing`** en PS 5.1; sin él dispara el prompt de seguridad del motor IE y cuelga.
- Si el terminal queda colgado tras un pegado roto: **mátalo y abre uno nuevo** (más fiable que recuperarlo).
- El terminal async a veces **inyecta `^U` (Ctrl+U) al primer token** y rompe el 1er comando. Workaround: comandos sync de una sola línea (reintentar), o antepón un token sacrificable (`$env:DUMMY='x'; ...`).

### 6. Lanzar Chrome con CDP para inspección en vivo

Cuando necesites un navegador con sesión iniciada para que Copilot inspeccione (alternativa a `npm run codegen`):

- Lanza Chrome/Chromium con `--remote-debugging-port=9222 --user-data-dir=<perfil-persistente>`. El **perfil persistente** mantiene la sesión (login) entre lanzamientos; solo la primera vez logueas a mano.
- **El probe de readiness DEBE usar `http://127.0.0.1:9222/json/version`, NO `localhost`.** En Windows `localhost` resuelve primero a IPv6 `::1`, pero el DevTools de Chrome solo bindea IPv4 → el probe da timeout **falso** aunque el puerto esté en LISTEN.
- Si el launch "timeoutea" pero quedan procesos huérfanos de Chromium (ventana cerrada, hijos vivos), un nuevo `chrome.exe` con el **mismo** `--user-data-dir` hace hand-off al muerto y no abre el puerto. Mata solo esos procesos y relanza. **Nunca** mates el Chrome real del usuario (`Program Files`).

### 7. Login estable y credenciales

- **Race de hidratación**: `goto` + `fill` inmediato puede meter la contraseña en el campo de usuario (el foco salta durante el render) → "Password is required". Fix: `goto` con `domcontentloaded` → `waitFor` de ambos campos → **`expect(passField).toHaveValue(password)` antes de enviar**. El `scripts/codegen.js` del Paso 2 ya trae esta verificación.
- **Login bilingüe**: aunque fuerces `locale: 'en-US'`, el login federado (Auth0 y similares) puede salir en el idioma del SO. Usa selectores con alternativas: `/Username or email|Nombre de usuario/i`, `/^Password$|^Contraseña$/i`, `/Sign in|Iniciar sesión/i`.
- **No martillar logins**: cada fallo cuenta hacia el bloqueo de la cuenta. Si un login hace timeout por credencial mala, **no reintentes** (duplicas intentos → bloqueo). Agrupa por usuario: un login por cuenta, valida todo lo suyo en esa sesión.
- **Nunca** metas credenciales en el repo: van en `.env` (gitignored). El kit ya ignora `.env`.

### 8. Simulación de interacción humana (opcional, para apps sensibles)

Algunas apps legacy pierden eventos con clicks instantáneos o detectan automatización. En este proyecto se usó un helper `humanClick/humanCheck` que emula movimiento real (trayectoria Bézier, velocidad variable, jitter, hover previo, delay mousedown→mouseup).

- Útil cuando ves eventos perdidos o modelos que no se actualizan a tiempo con el `.click()` normal.
- Hazlo **bypasseable** por env var (`HUMAN_FAST=1` o bajo `PWDEBUG`): en modo debug quieres un solo `click()` legible en el trace, no docenas de `mouse.move`.
- No es necesario para la mayoría de apps modernas. Empieza con el `.click()` normal de Playwright y solo añade simulación humana si hay evidencia de que hace falta.

### 9. Datos de prueba y estructura

- **Fixtures/helpers que sirven a más de un spec → carpeta raíz `fixtures/`.** Los específicos de un flujo, junto a su spec.
- **`assets/` por dominio**, espejando `tests/`. Convención útil: `usuarios*.json` = catálogos; `plan*.json` = escenarios; sufijo `.ok` = subconjunto verificado.
- **Artefactos de runtime** (registros que el test reescribe) van **gitignored** y se recrean con `mkdirSync(..., { recursive: true })`.
- **EOL**: `.gitattributes` con `* text=auto eol=lf` + `git config core.autocrlf false` evita que VS Code marque "miles de cambios" que en realidad son CRLF/LF cosméticos.
- Datos aleatorios **cortos**. Lee el DOM real antes de inventar selectores.

### 10. Checklist anti-patrones (pega esto en tu revisión)

- [ ] ¿Hay `waitForTimeout` para sincronizar? → `expect(...).toBeVisible({timeout})` / `expect.poll`.
- [ ] ¿Hay `if (a !== b) throw`? → `expect(a, 'mensaje').toBe(b)` (el `if/throw` solo para validar datos de entrada ANTES del test).
- [ ] ¿Hay `log('✓/✗ ...')`? → conviértelo en `expect`.
- [ ] ¿Hay `locator.evaluate(el => el.click())`? → `.click()` real.
- [ ] ¿Hay `if (await loc.isVisible())` como espera? → `expect(loc).toBeVisible()`.
- [ ] ¿Hay `(await loc.count()) > 0`? → `expect(loc).toHaveCount(...)`.
- [ ] ¿Hay `for + waitForTimeout` para reintentar? → `expect.toPass({ intervals, timeout })`.
- [ ] ¿Cada bloque está en un `test.step` con título de valores reales?
- [ ] ¿Los locators usan `getByRole`/`getByText`/id estable en vez de clases visuales?
- [ ] ¿`force: true` está justificado con un comentario?
