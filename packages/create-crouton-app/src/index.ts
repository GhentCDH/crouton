import { Command } from 'commander';

new Command('create-crouton-app')
  .description('Scaffold a new crouton app')
  .version('0.0.1')
  .argument('[name]', 'project name', 'my-crouton-app')
  .action((name: string) => {
    console.warn(`IMPLEMENT create crouton app command executed (${name})`);
  })
  .parse();
