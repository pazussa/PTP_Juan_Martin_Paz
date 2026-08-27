# Manual de operación

Instalación, configuración, mantenimiento y solución de problemas. El [README](../README.md) describe qué se automatizó y por qué; este documento describe cómo operarlo.

## Requisitos

- Node.js 20 o superior; se recomienda Node.js 22 LTS.
- npm.
- Conexión al ambiente configurado.
- Permiso para instalar y ejecutar Chromium.

Dependencias:

| Paquete | Uso |
| --- | --- |
| `@playwright/test` | Runner, navegador, locators y aserciones. |
| `typescript` | Comprobación estricta sin emitir JavaScript. |
| `dotenv` | Carga de `.env`. |
| `cross-env` | Variables iguales en Windows, Linux y macOS. |
| `@types/node` | Tipos de configuración y archivos. |

## Instalación

El proceso es **el mismo en Windows, Linux y macOS**: un único script en Node, `scripts/setup.js`, que comprueba la versión de Node, crea `.env` desde `.env.example` si no existe, ejecuta `npm ci`, instala Chromium y verifica TypeScript y el descubrimiento de tests.

| Sistema | Cómo lanzarlo |
| --- | --- |
| Cualquiera, desde la terminal | `npm run setup` |
| Windows | doble clic en `setup-windows.cmd`, o ejecutarlo en `cmd.exe` |
| Linux o macOS | `./setup-linux-mac.sh` |

Los tres hacen exactamente lo mismo: los lanzadores solo resuelven la carpeta del proyecto y avisan si falta Node.js. Si Node no está instalado, instala Node.js 22 LTS desde [nodejs.org](https://nodejs.org/), abre una terminal nueva y repite el comando.

El script usa únicamente módulos nativos de Node, así que puede ejecutarse antes de instalar las dependencias.

### Instalación manual

Si prefieres hacerlo paso a paso:

```bash
cp .env.example .env      # en Windows: copy .env.example .env
npm ci
npm run install:browsers
npm run check
```

En Linux mínimo o CI, donde faltan las librerías del sistema para Chromium:

```bash
npx playwright install --with-deps chromium
```

### Portabilidad

- Un solo script de instalación para los tres sistemas: no hay un `.ps1` y un `.sh` que puedan divergir.
- Los comandos públicos viven en `package.json` y no dependen de Bash ni de PowerShell.
- `cross-env` da la misma sintaxis de variables de entorno en todos los sistemas.
- Los lanzadores calculan rutas desde su ubicación, incluso si la ruta tiene espacios.
- No se usan symlinks, `/tmp` ni nombres incompatibles con NTFS.
- `.gitattributes` conserva los finales de línea apropiados.
- Un lock exclusivo evita que dos procesos sobrescriban la misma sesión o crucen cuentas.
- GitHub Actions ejecuta E02 en `windows-latest` y `ubuntu-latest`.

La instalación se ejecutó y verificó en Linux. La validación en Windows la realiza el job `windows-latest` cuando el código se publica en GitHub; no se afirma una ejecución local en un host Windows que no ocurrió.

## Variables de entorno

`.env.example` es la plantilla. `.env` y `playwright/.auth/` están ignorados por Git.

| Variable | Inicial | Propósito |
| --- | --- | --- |
| `BASE_URL` | producción | Ambiente objetivo. |
| `HEADLESS` | `0` | `1` oculta Chromium. |
| `SLOWMO` | `0` | Demora no negativa entre acciones. |
| `VIDEO` | `on` | `off`, `on`, `retain-on-failure` u `on-first-retry`. |
| `RUN_MUTATING_TESTS` | `0` | Habilita E01. |
| `RUN_PURCHASE_TESTS` | `0` | Habilita E03. También implica ejecución mutante. |
| `TEST_EMAIL_DOMAIN` | `example.com` | Dominio autorizado para cuentas técnicas. |
| `PQRS_UNKNOWN_TRACKING_NUMBER` | `999999999999999` | Radicado reservado de 15 dígitos, confirmado como inexistente. |
| `LOGIN_DOCUMENT` | vacío | Login opcional de `scripts/codegen.js`. |
| `LOGIN_PASSWORD` | vacío | Contraseña opcional del inspector; nunca versionarla. |

Los comandos `npm run test:client` y `npm run test:purchase` habilitan las variables necesarias; no hace falta editar `.env` ni confirmar la creación de la orden por separado.

## Ejecución dirigida

```text
npx playwright test --project=public-chromium
npx playwright test tests/scenarios/02-public-modules.spec.ts --project=public-chromium
npm run test:debug -- --grep @pqrs
```

E01 y E03 permanecen deshabilitados al ejecutar sus archivos directamente sin las variables correspondientes. Los comandos específicos de npm las establecen automáticamente.

## Datos, seguridad y limpieza

El generador crea:

- documento técnico de 10 dígitos con entropía criptográfica;
- correo único por timestamp y worker;
- contraseña aleatoria de 128 bits, no derivable ni guardada en el contexto seguro;
- nombre y datos técnicos reconocibles;
- dirección y nota explícitas de QA/no despacho.

Las corridas mutantes pueden mostrar datos técnicos en consola o video. Nunca deben publicarse `.env`, `playwright/.auth/`, cookies, contraseñas, enlaces privados de pago ni datos de tarjeta.

`purchase-intent.json` se crea con escritura exclusiva justo antes del submit. Mientras exista, E01 se niega a crear otra cuenta y E03 se limita a reconciliar. `artifacts/CUENTAS_TECNICAS.md` y `artifacts/ORDENES_TECNICAS.md` contienen inventarios mínimos para limpieza administrativa, sin credenciales.

## Reportes y evidencias

E02 produce reporte HTML en `playwright-report/`, video según `VIDEO`, screenshot al fallar y trace en el primer retry de CI.

E01 y E03 producen salida de consola, video y screenshot al fallar, pero **no** HTML ni trace: un reporte o trace puede conservar los valores enviados con `fill()`, incluida la contraseña del registro. E03 adjunta solo:

```json
{
  "orderId": "identificador",
  "product": "Bono de regalo - $50.000",
  "purpose": "orden automatizada de QA"
}
```

La evidencia final local se conserva bajo `artifacts/final/`. Estas carpetas están ignoradas por Git y deben compartirse por un canal controlado.

## Playwright CLI, sin MCP

Playwright CLI se utiliza para explorar y mantener; el runner de entrega sigue siendo `playwright test`.

Sesión propia:

```text
playwright-cli -s=auditoria open https://www.bon-bonite.com/pqrs/ --headed
playwright-cli -s=auditoria snapshot
playwright-cli -s=auditoria eval "() => ({ title: document.title, url: location.href })"
playwright-cli -s=auditoria close
```

Navegador CDP del proyecto:

```text
# terminal 1
npm run codegen -- https://www.bon-bonite.com/pqrs/

# terminal 2
playwright-cli attach --cdp=http://127.0.0.1:9222
playwright-cli snapshot
playwright-cli run-code --filename=scripts/diag-page.js --raw
playwright-cli detach
```

Se usa `detach`, no `close`, cuando el navegador fue abierto por `codegen.js`. El flujo de mantenimiento es: snapshot, locator semántico, ejecución de la misma acción con la CLI y, solo después, actualización del POM.

## Mantenimiento

Para añadir o cambiar una pantalla:

1. explórala con Playwright CLI headed;
2. acepta cookies y toma un snapshot;
3. valida unicidad y actionability del locator con la operación real;
4. modifica el POM, no el spec, cuando cambia el DOM;
5. agrega datos tipados si son necesarios;
6. expón un POM nuevo desde la fixture;
7. añade steps y aserciones web-first;
8. protege cualquier persistencia con una variable y sin retries;
9. ejecuta `npm run check` y el escenario dirigido; y
10. actualiza el README y `HALLAZGOS.md`.

Auditoría rápida de anti-patrones:

```text
rg -n "waitForTimeout|networkidle|\.evaluate\(|force:\s*true|\.nth\(" pages fixtures tests
```

## Solución de problemas

### HTTP 403 o 429

El sitio aplica limitación por IP: **varias corridas seguidas desde la misma máquina acaban recibiendo 403** en cualquier ruta, incluso pública. Se observó de forma reproducible durante la validación tras ejecutar la suite muchas veces en una misma hora.

No es un defecto de la automatización ni del sitio: es una protección funcionando. La suite lo trata como fallo real y lo muestra en el acto en lugar de reintentar a ciegas, porque un 403 también puede venir de una regla nueva del WAF.

Qué hacer: espacia las ejecuciones (unos minutos entre corridas completas), cierra otras corridas en paralelo y confirma en el navegador que el sitio abre con normalidad. Si E03 quedó a medias, **no** relances la suite completa: conserva `playwright/.auth/` y retoma con `npm run test:purchase:reconcile`.

### `ERR_NETWORK_CHANGED`

La suite concede hasta dos reintentos con pausa breve a los GET idempotentes. Si vuelve a ocurrir, revisa el adaptador de red, VPN, proxy y estabilidad del enlace. No aumentes retries ni workers y no repitas una compra: usa `test:purchase:reconcile`.

### Falló E03 después del submit

No ejecutes otra suite completa. Conserva `playwright/.auth/` y usa `npm run test:purchase:reconcile`. Si esos archivos no existen, revisa primero el inventario y el backend con el administrador.

### Falta Chromium

```text
npm run install:browsers
```

En Linux mínimo:

```text
npx playwright install --with-deps chromium
```

### En Windows, `setup-windows.cmd` no arranca

La instalación no depende de PowerShell ni de su política de ejecución de scripts. Si el doble clic no funciona, abre `cmd.exe` en la carpeta del proyecto y ejecuta `npm run setup`, que hace exactamente lo mismo. Si el mensaje es que `node` no se reconoce, instala Node.js 22 LTS y abre una terminal nueva para que tome el `PATH`.

### `playwright-cli` no está en PATH

Abre una terminal nueva y ejecuta `playwright-cli --version`. La CLI es una herramienta de mantenimiento separada; los specs se ejecutan con `npm`.

### Proxy o certificado corporativo

Configura proxy y CA según la política de la empresa. No uses `NODE_TLS_REJECT_UNAUTHORIZED=0`: desactiva la verificación TLS e invalida la evidencia del transporte.
