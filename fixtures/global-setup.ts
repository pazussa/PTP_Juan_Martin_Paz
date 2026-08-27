import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { authDirectoryPath, mutatingLockPath } from '../test-data/runtime';

type MutatingLock = {
  readonly pid: number;
  readonly startedAt: string;
};

const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const existingLockIsActive = async (): Promise<boolean> => {
  try {
    const lock = JSON.parse(await readFile(mutatingLockPath, 'utf8')) as MutatingLock;
    return Number.isInteger(lock.pid) && lock.pid > 0 && processIsAlive(lock.pid);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    return false;
  }
};

const acquireMutatingLock = async (): Promise<void> => {
  await mkdir(authDirectoryPath, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(mutatingLockPath, 'wx');
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
        'utf8',
      );
      await handle.close();
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (await existingLockIsActive()) {
        throw new Error(
          'Ya existe otra ejecución mutante activa. Espera a que termine antes de crear cuentas u órdenes.',
        );
      }
      await unlink(mutatingLockPath).catch((unlinkError: NodeJS.ErrnoException) => {
        if (unlinkError.code !== 'ENOENT') {
          throw unlinkError;
        }
      });
    }
  }

  throw new Error('No fue posible adquirir el lock de la ejecución mutante.');
};

export default async function globalSetup(): Promise<(() => Promise<void>) | undefined> {
  const isMutatingRun =
    process.env.RUN_MUTATING_TESTS === '1' || process.env.RUN_PURCHASE_TESTS === '1';
  if (!isMutatingRun) {
    return undefined;
  }

  await acquireMutatingLock();
  return async () => {
    await unlink(mutatingLockPath);
  };
}
