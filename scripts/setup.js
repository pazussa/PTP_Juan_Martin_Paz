#!/usr/bin/env node
/**
 * Instalación reproducible en Windows, Linux y macOS.
 *
 * Se escribió en Node —que ya es requisito del proyecto— en lugar de un .ps1 y
 * un .sh equivalentes, para que exista una sola fuente de verdad del proceso.
 * Solo usa módulos nativos, así que funciona antes de instalar dependencias.
 */
const { spawnSync } = require('node:child_process');
const { copyFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const minimumNodeMajor = 20;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function run(description, command, args) {
  console.log(`\n▶ ${description}`);
  // `shell: true` permite invocar npm/npx en Windows, donde son npm.cmd/npx.cmd.
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    fail(`No se pudo ejecutar ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${description} falló con código ${result.status}.`);
  }
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (!Number.isFinite(nodeMajor) || nodeMajor < minimumNodeMajor) {
  fail(
    `Se requiere Node.js ${minimumNodeMajor} o superior; esta terminal usa ${process.version}. ` +
      'Instala Node.js 22 LTS desde https://nodejs.org/ y abre una terminal nueva.',
  );
}
console.log(`✔ Node.js ${process.version}`);

const envPath = path.join(projectRoot, '.env');
if (existsSync(envPath)) {
  console.log('✔ .env ya existe; se conserva sin cambios');
} else {
  copyFileSync(path.join(projectRoot, '.env.example'), envPath);
  console.log('✔ .env creado desde .env.example');
}

run('Instalando dependencias (npm ci)', 'npm', ['ci']);
run('Instalando Chromium', 'npx', ['playwright', 'install', 'chromium']);
run('Comprobando TypeScript y descubriendo los tests', 'npm', ['run', 'check']);

console.log(`
✔ Proyecto listo.

  npm test              Escenario público E02 (seguro: no crea datos)
  npm run test:headed   El mismo, con el navegador visible

Los tres escenarios crean una cuenta y una orden reales: lee la sección
"Ejecutar la suite" del README antes de usar npm run test:client.
`);
