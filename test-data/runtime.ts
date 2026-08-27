import { access, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SafeCustomerContext } from './account';

const projectRoot = path.resolve(__dirname, '..');
export const authDirectoryPath = path.join(projectRoot, 'playwright', '.auth');

export const authStatePath = path.join(authDirectoryPath, 'customer.json');
export const customerContextPath = path.join(authDirectoryPath, 'customer-context.json');
export const purchaseIntentPath = path.join(authDirectoryPath, 'purchase-intent.json');
export const mutatingLockPath = path.join(authDirectoryPath, 'mutating-run.lock');

export async function purchaseIntentExists(): Promise<boolean> {
  try {
    await access(purchaseIntentPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function assertNoUnresolvedPurchaseIntent(): Promise<void> {
  if (await purchaseIntentExists()) {
    throw new Error(
      'Existe un intento de compra sin resolver. No se creará otra cuenta: ejecuta npm run test:purchase:reconcile y revisa Pedidos.',
    );
  }
}

export async function assertPurchaseCanProceed(): Promise<void> {
  if (await purchaseIntentExists()) {
    throw new Error(
      'Existe un submit anterior sin una orden visible. Por seguridad no se enviará un segundo pedido; se requiere revisión administrativa.',
    );
  }
}

export async function readCustomerContext(): Promise<SafeCustomerContext> {
  return JSON.parse(await readFile(customerContextPath, 'utf8')) as SafeCustomerContext;
}

/** El flag `wx` falla si ya hay un intento sin resolver, y así impide reenviar. */
export async function recordPurchaseIntent(document: string, product: string): Promise<void> {
  await writeFile(
    purchaseIntentPath,
    JSON.stringify(
      { document, product, status: 'submission-attempted', createdAt: new Date().toISOString() },
      null,
      2,
    ),
    { encoding: 'utf8', flag: 'wx' },
  );
}

/** Solo tras comprobar la orden: hasta entonces estos archivos permiten reconciliar. */
export async function releaseAuthenticatedSession(): Promise<void> {
  await Promise.all([
    unlink(authStatePath),
    unlink(customerContextPath),
    rm(purchaseIntentPath, { force: true }),
  ]);
}
