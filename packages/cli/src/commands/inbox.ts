/**
 * Inbox management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getApiKey, getBaseUrl, isAuthenticated } from '../config';

interface Inbox {
  id: string;
  localPart: string;
  domain: { name: string };
  createdAt: string;
  expiresAt: string | null;
  _count?: { messages: number };
}

async function apiRequest<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function registerInboxCommands(program: Command): void {
  const inbox = program.command('inbox').description('Manage email inboxes');

  inbox
    .command('create')
    .description('Create a new temporary inbox')
    .option('-l, --local <localPart>', 'Local part of email (before @)')
    .option('-d, --domain <domainId>', 'Domain ID to use')
    .option('-e, --expires <minutes>', 'Expire after N minutes', '60')
    .action(async (options) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      const spinner = ora('Creating inbox...').start();

      try {
        const body: Record<string, unknown> = {};
        if (options.local) body.localPart = options.local;
        if (options.domain) body.domainId = options.domain;
        if (options.expires) {
          const expiresAt = new Date(Date.now() + parseInt(options.expires) * 60 * 1000);
          body.expiresAt = expiresAt.toISOString();
        }

        const result = await apiRequest<{ inbox: { id: string; localPart: string; domain?: { name: string }; expiresAt?: string } }>('POST', '/inboxes', body);
        const inbox = result.inbox;

        spinner.succeed('Inbox created!');
        console.log('');
        console.log(chalk.cyan('  Email:'), `${inbox.localPart}@${inbox.domain?.name || 'unknown'}`);
        console.log(chalk.cyan('  ID:'), inbox.id);
        if (inbox.expiresAt) {
          console.log(chalk.cyan('  Expires:'), new Date(inbox.expiresAt).toLocaleString());
        }
      } catch (error) {
        spinner.fail('Failed to create inbox');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  inbox
    .command('list')
    .description('List your inboxes')
    .option('-l, --limit <number>', 'Number of inboxes to show', '20')
    .action(async (options) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      const spinner = ora('Fetching inboxes...').start();

      try {
        const result = await apiRequest<{ data: Inbox[]; meta?: { total: number } }>('GET', `/inboxes?personal=true&limit=${options.limit}`);
        const inboxes: Inbox[] = result.data || [];

        spinner.stop();

        if (inboxes.length === 0) {
          console.log(chalk.yellow('No inboxes found. Create one with: ephemera inbox create'));
          return;
        }

        const table = new Table({
          head: [
            chalk.cyan('Email'),
            chalk.cyan('ID'),
            chalk.cyan('Messages'),
            chalk.cyan('Expires'),
          ],
          style: { head: [], border: [] },
        });

        for (const inbox of inboxes) {
          const email = `${inbox.localPart}@${inbox.domain?.name || 'unknown'}`;
          const expires = inbox.expiresAt
            ? new Date(inbox.expiresAt).toLocaleDateString()
            : 'Never';
          const msgCount = inbox._count?.messages ?? 0;

          table.push([email, inbox.id.slice(0, 8) + '...', msgCount.toString(), expires]);
        }

        console.log(table.toString());
        console.log(chalk.gray(`\nShowing ${inboxes.length} of ${result.meta?.total || inboxes.length} inboxes`));
      } catch (error) {
        spinner.fail('Failed to fetch inboxes');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  inbox
    .command('delete <id>')
    .description('Delete an inbox')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id: string, options) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Delete inbox ${id}?`,
            default: false,
          },
        ]);
        if (!confirm) {
          console.log(chalk.yellow('Cancelled'));
          return;
        }
      }

      const spinner = ora('Deleting inbox...').start();

      try {
        await apiRequest('DELETE', `/inboxes/${id}`);
        spinner.succeed('Inbox deleted');
      } catch (error) {
        spinner.fail('Failed to delete inbox');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
