import { createOrchestratorAsync, DEFAULT_CONFIG } from './index.js';

const HELP = `Usage: astro-orch <command> [args]

Commands:
  run <task>     Run a task
  list           List routing rules
  status <id>    Show task status (looks up most recent execution)
  help           Show this help

Environment:
  ASTRO_ORCH_RULES   Override path to routing rules markdown
  ASTRO_ORCH_DB      Override path to history sqlite database
`;

function configFromEnv(): Partial<{ rulesPath: string; dbPath: string }> {
  const out: Partial<{ rulesPath: string; dbPath: string }> = {};
  const rules = process.env.ASTRO_ORCH_RULES;
  if (rules) out.rulesPath = rules;
  const db = process.env.ASTRO_ORCH_DB;
  if (db) out.dbPath = db;
  return out;
}

export async function runCli(args: string[]): Promise<number> {
  const [cmd, ...rest] = args;
  const overrides = { ...DEFAULT_CONFIG, ...configFromEnv() };

  switch (cmd) {
    case 'run': {
      const task = rest[0];
      if (!task) {
        process.stderr.write('Error: run requires a task name\n');
        return 1;
      }
      const orch = await createOrchestratorAsync(overrides);
      try {
        const node = await orch.run(task);
        process.stdout.write(JSON.stringify(node, null, 2) + '\n');
        await orch.close();
        return 0;
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        await orch.close();
        return 1;
      }
    }
    case 'list': {
      const orch = await createOrchestratorAsync(overrides);
      const rules = orch.listRules();
      if (rules.length === 0) {
        process.stdout.write('No rules found.\n');
      } else {
        for (const r of rules) {
          process.stdout.write(`${r.pattern} -> ${r.agent} (priority: ${r.priority})\n`);
        }
      }
      await orch.close();
      return 0;
    }
    case 'status': {
      const id = rest[0];
      if (!id) {
        process.stderr.write('Error: status requires a task id\n');
        return 1;
      }
      const orch = await createOrchestratorAsync(overrides);
      const rows = await orch.getHistory().list({ limit: 1000 });
      const row = rows.find((r: { id: string }) => r.id === id);
      if (!row) {
        process.stdout.write(`Status for ${id}: unknown (not in history)\n`);
      } else {
        process.stdout.write(`Status for ${id}: ${row.state}\n`);
      }
      await orch.close();
      return 0;
    }
    case 'help':
    case undefined:
      process.stdout.write(HELP);
      return 0;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n`);
      process.stdout.write(HELP);
      return 1;
  }
}
