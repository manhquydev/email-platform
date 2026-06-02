#!/usr/bin/env node
/**
 * Ephemera CLI - Main entry point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { registerInboxCommands } from './commands/inbox';
import { registerMessageCommands } from './commands/message';
import { registerWebhookCommands } from './commands/webhook';
import {
  getApiKey,
  setApiKey,
  getBaseUrl,
  setBaseUrl,
  clearConfig,
  isAuthenticated,
} from './config';

/**
 * Validate a user-supplied base URL.
 * Rejects anything that is not a well-formed https:// URL to prevent
 * accidental credential leakage over plain HTTP or malformed fetch targets.
 */
function validateBaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.error(chalk.red(`Invalid base URL: "${url}" is not a valid URL`));
    process.exit(1);
  }
  if (parsed.protocol !== 'https:') {
    console.error(chalk.red(`Insecure base URL: "${url}" — only https:// URLs are allowed`));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('ephemera')
  .description('Cloud-native temporary email CLI')
  .version('1.0.0');

// Auth commands
const auth = program.command('auth').description('Authentication management');

auth
  .command('login')
  .description('Login with your API key')
  .option('-k, --key <apiKey>', 'API key (or enter interactively)')
  .option('-b, --base-url <url>', 'Custom API base URL')
  .action(async (options) => {
    let apiKey = options.key;

    if (!apiKey) {
      const inquirer = await import('inquirer');
      const answers = await inquirer.default.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter your API key:',
          mask: '*',
        },
      ]);
      apiKey = answers.apiKey;
    }

    if (!apiKey) {
      console.error(chalk.red('API key is required'));
      process.exit(1);
    }

    // Validate the user-supplied URL before using it in fetch or persisting it.
    if (options.baseUrl) {
      validateBaseUrl(options.baseUrl);
    }

    const spinner = ora('Verifying API key...').start();

    try {
      const baseUrl = options.baseUrl || 'https://api.manhquy.click';
      const response = await fetch(`${baseUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      setApiKey(apiKey);
      if (options.baseUrl) {
        setBaseUrl(options.baseUrl);
      }

      spinner.succeed('Logged in successfully!');
    } catch (error) {
      spinner.fail('Login failed');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

auth
  .command('status')
  .description('Check authentication status')
  .action(() => {
    if (isAuthenticated()) {
      console.log(chalk.green('✓ Authenticated'));
      console.log(chalk.cyan('API URL:'), getBaseUrl());
    } else {
      console.log(chalk.yellow('● Not authenticated'));
      console.log('Run: ephemera auth login');
    }
  });

auth
  .command('logout')
  .description('Logout and clear credentials')
  .action(() => {
    clearConfig();
    console.log(chalk.green('Logged out successfully'));
  });

// Quick generate command
program
  .command('generate')
  .alias('gen')
  .description('Quickly generate a temporary email')
  .option('-e, --expires <minutes>', 'Expire after N minutes', '60')
  .action(async (options) => {
    if (!isAuthenticated()) {
      console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
      process.exit(1);
    }

    try {
      const expiresAt = new Date(Date.now() + parseInt(options.expires) * 60 * 1000);
      const response = await fetch(`${getBaseUrl()}/inboxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresAt: expiresAt.toISOString() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create inbox');
      }

      const result = await response.json() as { inbox: { localPart: string; domain?: { name: string } } };
      const inbox = result.inbox;
      const email = `${inbox.localPart}@${inbox.domain?.name || 'inbox.ephemera.email'}`;

      // Output just the email for easy scripting
      console.log(email);
    } catch (error) {
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch <inboxId>')
  .description('Watch an inbox for new messages')
  .option('-i, --interval <seconds>', 'Polling interval', '5')
  .action(async (inboxId: string, options) => {
    if (!isAuthenticated()) {
      console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
      process.exit(1);
    }

    const interval = parseInt(options.interval) * 1000;
    let lastMessageId: string | null = null;

    console.log(chalk.cyan(`Watching inbox ${inboxId}...`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    const poll = async () => {
      try {
        const response = await fetch(
          `${getBaseUrl()}/messages?inboxId=${inboxId}&limit=1`,
          {
            headers: { 'Authorization': `Bearer ${getApiKey()}` },
          }
        );

        if (response.ok) {
          const result = await response.json() as { data?: Array<{ id: string; fromAddress?: string; subject?: string; receivedAt: string }> };
          const messages = result.data || [];

          if (messages.length > 0 && messages[0].id !== lastMessageId) {
            const msg = messages[0];
            lastMessageId = msg.id;

            console.log(chalk.green('✉ New message!'));
            console.log(chalk.cyan('  From:'), msg.fromAddress || 'unknown');
            console.log(chalk.cyan('  Subject:'), msg.subject || '(no subject)');
            console.log(chalk.cyan('  ID:'), msg.id);
            console.log('');
          }
        }
      } catch (error) {
        console.error(chalk.red('Polling error:'), (error as Error).message);
      }
    };

    // Initial poll
    await poll();

    // Continuous polling
    setInterval(poll, interval);
  });

// Register subcommands
registerInboxCommands(program);
registerMessageCommands(program);
registerWebhookCommands(program);

program.parse();
