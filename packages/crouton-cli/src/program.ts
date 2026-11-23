import { Command } from 'commander';

import { registerCreateCommand } from './commands/create';
import { registerGenerateCommand } from './commands/generate.command';
import { registerInitCommand } from './commands/init';
import { registerMigrateCommand } from './commands/migrate.command';
import { registerUpdateCommand } from './commands/update';
import { registerValidateCommand } from './commands/validate.command';

export const createProgram = (): Command => {
  const program = new Command('crouton')
    .description('Crouton project CLI')
    .version('0.0.1')
    // Group options (`crouton update --cwd x`) must not swallow noun options (`crouton update resources --cwd x`).
    .enablePositionalOptions();

  registerUpdateCommand(program);
  registerCreateCommand(program);
  registerInitCommand(program);
  registerValidateCommand(program);
  registerMigrateCommand(program);
  registerGenerateCommand(program);
  return program;
};
