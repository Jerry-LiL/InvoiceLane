import 'dotenv/config';
import { closeDb } from '../db';
import { runReminderSweep } from './run-reminders';

async function main() {
  const result = await runReminderSweep();
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
