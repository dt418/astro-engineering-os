#!/usr/bin/env node
import { createOrchestrator } from './index.js';

const HELP = `Usage: astro-orch <command> [args]

Commands:
  run <task>     Run a task
  list           List routing rules
  status <id>    Show task status
  help           Show this help
`;

export async function runCli(args: string[]): Promise<void> {
  const [cmd, ...rest] = args;
  const orch = createOrchestrator();

  switch (cmd) {
    case 'run': {
      const task = rest[0];
      if (!task) {
        console.error('Error: run requires a task name');
        process.exit(1);
      }
      try {
        const node = await orch.run(task);
        console.log(JSON.stringify(node, null, 2));
      } catch (err) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      }
      break;
    }
    case 'list': {
      const rules = orch.listRules();
      if (rules.length === 0) {
        console.log('No rules found.');
      } else {
        for (const r of rules) {
          console.log(`${r.pattern} -> ${r.agent} (priority: ${r.priority})`);
        }
      }
      break;
    }
    case 'status': {
      const id = rest[0];
      if (!id) {
        console.error('Error: status requires a task id');
        process.exit(1);
      }
      console.log(`Status for ${id}: pending (stub)`);
      break;
    }
    case 'help':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      console.log(HELP);
      process.exit(1);
  }
}

runCli(process.argv.slice(2));
