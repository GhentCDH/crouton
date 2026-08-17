import { Command } from 'commander';

import { registerCreateDatasourceCommand } from './commands/create-datasource';
import { registerCreateResourceCommand } from './commands/create-resource';
import { registerUpdateCommand } from './commands/update';

const program = new Command('crouton')
  .description('Crouton project CLI')
  .version('0.0.1');

registerUpdateCommand(program);
registerCreateDatasourceCommand(program);
registerCreateResourceCommand(program);

program.parse();
