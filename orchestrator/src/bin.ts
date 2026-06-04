#!/usr/bin/env node
import { runCli } from './cli.js';

runCli(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`Fatal: ${(err as Error).message}\n`);
    process.exit(1);
  },
);
