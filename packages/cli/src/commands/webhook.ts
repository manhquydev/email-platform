/**
 * Webhook verification commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createHmac, timingSafeEqual } from 'crypto';
import * as fs from 'fs';

/**
 * Verify a webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds = 300
): { valid: boolean; error?: string } {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    return { valid: false, error: `Timestamp too old: ${age}s > ${toleranceSeconds}s` };
  }

  const signaturePayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  const providedHash = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature;

  try {
    const isValid = timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(expected)
    );
    return isValid ? { valid: true } : { valid: false, error: 'Invalid signature' };
  } catch {
    return { valid: false, error: 'Invalid signature format' };
  }
}

export function registerWebhookCommands(program: Command): void {
  const webhook = program.command('webhook').description('Webhook utilities');

  webhook
    .command('verify')
    .description('Verify a webhook payload signature')
    .requiredOption('-s, --secret <secret>', 'Webhook secret')
    .requiredOption('-S, --signature <signature>', 'X-Ephemera-Signature header value')
    .requiredOption('-t, --timestamp <timestamp>', 'X-Ephemera-Timestamp header value')
    .option('-f, --file <path>', 'Read payload from file')
    .option('-p, --payload <json>', 'Payload JSON string')
    .option('--tolerance <seconds>', 'Timestamp tolerance in seconds', '300')
    .action((options) => {
      let payload: string;

      if (options.file) {
        try {
          payload = fs.readFileSync(options.file, 'utf-8');
        } catch (error) {
          console.error(chalk.red(`Failed to read file: ${(error as Error).message}`));
          process.exit(1);
        }
      } else if (options.payload) {
        payload = options.payload;
      } else {
        console.error(chalk.red('Either --file or --payload is required'));
        process.exit(1);
      }

      const timestamp = parseInt(options.timestamp, 10);
      if (isNaN(timestamp)) {
        console.error(chalk.red('Invalid timestamp'));
        process.exit(1);
      }

      const result = verifySignature(
        payload,
        options.signature,
        options.secret,
        timestamp,
        parseInt(options.tolerance, 10)
      );

      if (result.valid) {
        console.log(chalk.green('✓ Signature is valid'));
        process.exit(0);
      } else {
        console.log(chalk.red('✗ Signature is invalid'));
        console.log(chalk.yellow(`  Reason: ${result.error}`));
        process.exit(1);
      }
    });

  webhook
    .command('sign')
    .description('Sign a payload (for testing)')
    .requiredOption('-s, --secret <secret>', 'Webhook secret')
    .option('-f, --file <path>', 'Read payload from file')
    .option('-p, --payload <json>', 'Payload JSON string')
    .action((options) => {
      let payload: string;

      if (options.file) {
        try {
          payload = fs.readFileSync(options.file, 'utf-8');
        } catch (error) {
          console.error(chalk.red(`Failed to read file: ${(error as Error).message}`));
          process.exit(1);
        }
      } else if (options.payload) {
        payload = options.payload;
      } else {
        console.error(chalk.red('Either --file or --payload is required'));
        process.exit(1);
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signaturePayload = `${timestamp}.${payload}`;
      const signature = createHmac('sha256', options.secret)
        .update(signaturePayload)
        .digest('hex');

      console.log(chalk.cyan('Timestamp:'), timestamp);
      console.log(chalk.cyan('Signature:'), `sha256=${signature}`);
      console.log('');
      console.log(chalk.gray('Use these headers:'));
      console.log(`  X-Ephemera-Timestamp: ${timestamp}`);
      console.log(`  X-Ephemera-Signature: sha256=${signature}`);
    });
}
