#!/usr/bin/env bun

import { Command } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const program = new Command();
const execAsync = promisify(exec);

program
  .name('tiger')
  .description('Tiger CLI - A modern web framework')
  .version('1.0.0');

program
  .command('dev')
  .description('Start the development server')
  .action(async () => {
    try {
      console.log(chalk.cyan('Starting development server...'));
      await execAsync('bun run dev');
      console.log(chalk.green('Development server started.'));
    } catch (error) {
      console.error(chalk.red('Failed to start development server:', error));
    }
  });

program
  .command('build')
  .description('Build the project for production')
  .action(async () => {
    try {
      console.log(chalk.cyan('Building project for production...'));
      await execAsync('bun run build');
      console.log(chalk.green('Project built successfully.'));
    } catch (error) {
      console.error(chalk.red('Build failed:', error));
    }
  });

program
  .command('serve')
  .description('Serve the production build')
  .action(async () => {
    try {
      console.log(chalk.cyan('Serving production build...'));
      await execAsync('bun run serve');
      console.log(chalk.green('Production build is being served.'));
    } catch (error) {
      console.error(chalk.red('Failed to serve production build:', error));
    }
  });

program.parse(process.argv); 