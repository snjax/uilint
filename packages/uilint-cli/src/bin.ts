#!/usr/bin/env node
import { runUilintCli } from './cli';

runUilintCli(process.argv.slice(2))
  .then(code => {
    process.exit(code);
  })
  .catch(error => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
