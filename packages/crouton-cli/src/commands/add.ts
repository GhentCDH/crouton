import type { Command } from 'commander';

export const registerAddCommand = (program: Command) => {
  const add = program
    .command('add')
    .description('Add a resource to the project');

  add
    .command('datasource')
    .description('Add a new datasource')
    .action(() => {
      //console.log('add datasource command executed');
    });
};
