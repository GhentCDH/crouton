import { Command } from 'commander';

import { registerUpdateCommand } from './commands/update';

const program = new Command('crouton')
  .description('Crouton project CLI')
  .version('0.0.1');

registerUpdateCommand(program);

program.parse();
