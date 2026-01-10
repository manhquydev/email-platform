/**
 * Message management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getApiKey, getBaseUrl, isAuthenticated } from '../config';

interface Message {
  id: string;
  subject: string;
  fromAddress: string | null;
  receivedAt: string;
  isRead: boolean;
  textBody: string | null;
  htmlBody: string | null;
}

async function apiRequest<T = unknown>(method: string, path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function registerMessageCommands(program: Command): void {
  const messages = program.command('messages').description('Manage email messages');

  messages
    .command('list <inboxId>')
    .description('List messages in an inbox')
    .option('-l, --limit <number>', 'Number of messages to show', '20')
    .option('-u, --unread', 'Show only unread messages')
    .action(async (inboxId: string, options) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      const spinner = ora('Fetching messages...').start();

      try {
        let url = `/messages?inboxId=${inboxId}&limit=${options.limit}`;
        if (options.unread) url += '&unreadOnly=true';

        const result = await apiRequest<{ data: Message[] }>('GET', url);
        const msgs: Message[] = result.data || [];

        spinner.stop();

        if (msgs.length === 0) {
          console.log(chalk.yellow('No messages found in this inbox'));
          return;
        }

        const table = new Table({
          head: [
            chalk.cyan(''),
            chalk.cyan('From'),
            chalk.cyan('Subject'),
            chalk.cyan('Received'),
            chalk.cyan('ID'),
          ],
          style: { head: [], border: [] },
          colWidths: [3, 25, 35, 20, 12],
        });

        for (const msg of msgs) {
          const unreadMarker = msg.isRead ? ' ' : chalk.green('◍');
          const from = (msg.fromAddress || 'unknown').slice(0, 23);
          const subject = (msg.subject || '(no subject)').slice(0, 33);
          const received = new Date(msg.receivedAt).toLocaleString();

          table.push([unreadMarker, from, subject, received, msg.id.slice(0, 8) + '...']);
        }

        console.log(table.toString());
        console.log(chalk.gray(`\nShowing ${msgs.length} messages`));
      } catch (error) {
        spinner.fail('Failed to fetch messages');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  messages
    .command('read <messageId>')
    .description('Read a message')
    .option('--html', 'Show HTML body instead of text')
    .action(async (messageId: string, options) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      const spinner = ora('Fetching message...').start();

      try {
        const msg: Message = await apiRequest('GET', `/messages/${messageId}`);

        spinner.stop();

        console.log('');
        console.log(chalk.cyan('From:'), msg.fromAddress || 'unknown');
        console.log(chalk.cyan('Subject:'), msg.subject || '(no subject)');
        console.log(chalk.cyan('Received:'), new Date(msg.receivedAt).toLocaleString());
        console.log(chalk.gray('─'.repeat(60)));
        console.log('');

        const body = options.html ? msg.htmlBody : msg.textBody;
        if (body) {
          console.log(body);
        } else {
          console.log(chalk.yellow('(no body content)'));
        }
      } catch (error) {
        spinner.fail('Failed to fetch message');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });

  messages
    .command('delete <messageId>')
    .description('Delete a message')
    .action(async (messageId: string) => {
      if (!isAuthenticated()) {
        console.error(chalk.red('Not authenticated. Run: ephemera auth login'));
        process.exit(1);
      }

      const spinner = ora('Deleting message...').start();

      try {
        await apiRequest('DELETE', `/messages/${messageId}`);
        spinner.succeed('Message deleted');
      } catch (error) {
        spinner.fail('Failed to delete message');
        console.error(chalk.red((error as Error).message));
        process.exit(1);
      }
    });
}
