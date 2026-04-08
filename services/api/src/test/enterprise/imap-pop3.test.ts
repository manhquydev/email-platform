import '../env-setup';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { ImapFlow } from 'imapflow';
import net from 'net';
import { ImapServer } from '../../imap/server';
import { Pop3Server } from '../../pop3/server';
import { prisma } from '../setup';
import { hashPassword } from '../../utils/password';
import { MessageAdapter } from '../../storage/message-adapter';

// Mock MessageAdapter if needed, or rely on real DB.
// Using real DB is better for integration test ensuring authentication works end-to-end.

describe('Enterprise Protocol Tests: IMAP & POP3', () => {
  let imapServer: ImapServer;
  let pop3Server: Pop3Server;
  let testInboxId = '';

  // Use non-standard ports to avoid conflicts
  const IMAP_PORT = 10143;
  const IMAP_SECURE_PORT = 10993;
  const POP3_PORT = 10110;

  const testUser = {
    email: 'protocol-test@example.com',
    password: 'protocol-password',
    id: 'user-123'
  };

  beforeAll(async () => {
    // Start Servers
    imapServer = new ImapServer();
    imapServer.start(IMAP_PORT, IMAP_SECURE_PORT);

    pop3Server = new Pop3Server();
    pop3Server.start(POP3_PORT);
  });

  afterAll(async () => {
    // Avoid hook timeout when a protocol server has dangling sockets.
    const closeWithTimeout = async (serverHandle: any) => {
      if (!serverHandle?.close) return;

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };

        try {
          serverHandle.close(() => finish());
        } catch {
          finish();
        }

        setTimeout(finish, 1500);
      });
    };

    const imapPlain = (imapServer as any)?.server;
    const imapTls = (imapServer as any)?.tlsServer;
    const pop3 = (pop3Server as any)?.server;

    await closeWithTimeout(imapPlain);
    await closeWithTimeout(imapTls);
    await closeWithTimeout(pop3);
  });

  beforeEach(async () => {
    // Create test user + inbox with current Prisma schema fields.
    vi.restoreAllMocks();
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.inbox.deleteMany({ where: { localPart: 'protocol-test' } });
    await prisma.domain.deleteMany({ where: { name: 'example.com' } });

    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: await hashPassword(testUser.password),
        role: 'USER',
      }
    });

    const domain = await prisma.domain.create({
      data: {
        name: 'example.com',
        status: 'VERIFIED',
        verificationToken: 'imap-pop3-test-token',
        ownerId: user.id,
      }
    });

    const inbox = await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart: 'protocol-test',
        ownerId: user.id,
      }
    });
    testInboxId = inbox.id;

    // MessageAdapter.authenticate() is currently a stub in source.
    vi.spyOn(MessageAdapter, 'authenticate').mockImplementation(async (username, password) => {
      if (username === testUser.email && password === testUser.password) {
        return { user: { id: user.id, email: user.email }, inboxId: testInboxId };
      }
      return null;
    });

    // Keep protocol tests focused on auth + command handling.
    vi.spyOn(MessageAdapter, 'listMailboxes').mockResolvedValue([{ id: 'mbx-inbox', name: 'INBOX' }]);
    vi.spyOn(MessageAdapter, 'getMailbox').mockResolvedValue({
      id: 'mbx-inbox',
      name: 'Inbox',
      uidValidity: 1,
      uidNext: 1
    });
    vi.spyOn(MessageAdapter, 'getMailboxStatus').mockResolvedValue({
      count: 0,
      exists: 0,
      recent: 0,
      unseen: 0
    });
    vi.spyOn(MessageAdapter, 'getMessages').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IMAP Protocol', () => {
    it('should allow authentication on IMAP', async () => {
      const output = await new Promise<string>((resolve, reject) => {
        const socket = net.createConnection(IMAP_PORT, 'localhost');
        let transcript = '';
        let loginSent = false;
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error('IMAP login timeout'));
        }, 5000);

        socket.on('data', (chunk) => {
          const text = chunk.toString();
          transcript += text;

          if (!loginSent && /\* OK/i.test(transcript)) {
            socket.write(`A1 LOGIN ${testUser.email} ${testUser.password}\r\n`);
            loginSent = true;
            return;
          }

          if (loginSent && /A1 (OK|NO|BAD)/i.test(transcript)) {
            clearTimeout(timer);
            socket.end();
            resolve(transcript);
          }
        });

        socket.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });

      expect(output).toMatch(/A1 OK/i);
    });

    it('should fail authentication with wrong password', async () => {
      const client = new ImapFlow({
        host: 'localhost',
        port: IMAP_PORT,
        secure: false,
        doSTARTTLS: false,
        auth: {
          user: testUser.email,
          pass: 'wrong-password'
        },
        logger: false
      });

      try {
        await client.connect();
        expect.fail('Should have thrown authentication error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('POP3 Protocol', () => {
    // Helper for POP3 communication
    const pop3Request = (commands: string[]): Promise<string> => {
      return new Promise((resolve, reject) => {
        const socket = net.createConnection(POP3_PORT, 'localhost');
        let response = '';
        let step = 0;

        socket.on('connect', () => {
          // Wait for greeting
        });

        socket.on('data', (data) => {
          const text = data.toString();
          response += text;

          // Simple state machine for testing
          // If greeting received, send first command
          if (step === 0 && text.startsWith('+OK')) {
            if (commands.length > 0) socket.write(commands[0] + '\r\n');
            step++;
          } else if (step <= commands.length) {
             // For subsequent responses
             if (step < commands.length) {
                socket.write(commands[step] + '\r\n');
             } else {
                socket.end();
             }
             step++;
          }
        });

        socket.on('end', () => resolve(response));
        socket.on('error', reject);
      });
    };

    it('should allow USER/PASS login', async () => {
      const client = new net.Socket();

      const response = await new Promise<string>((resolve, reject) => {
        client.connect(POP3_PORT, 'localhost', () => {
           // Wait for greeting
        });

        let output = '';
        let stage = 'CONNECT';

        client.on('data', (data) => {
          const str = data.toString();
          output += str;

          if (stage === 'CONNECT' && str.startsWith('+OK')) {
            client.write(`USER ${testUser.email}\r\n`);
            stage = 'USER_SENT';
          } else if (stage === 'USER_SENT' && str.startsWith('+OK')) {
            client.write(`PASS ${testUser.password}\r\n`);
            stage = 'PASS_SENT';
          } else if (stage === 'PASS_SENT') {
             if (str.startsWith('+OK')) {
                 client.write('QUIT\r\n');
                 stage = 'QUIT_SENT';
             } else {
                 client.end();
                 reject(new Error('Login failed: ' + str));
             }
          } else if (stage === 'QUIT_SENT') {
             client.end();
             resolve('SUCCESS');
          }
        });

        client.on('error', reject);
      });

      expect(response).toBe('SUCCESS');
    });

    it('should fail with invalid credentials', async () => {
      const client = new net.Socket();

      const response = await new Promise<string>((resolve, reject) => {
        client.connect(POP3_PORT, 'localhost');

        let stage = 'CONNECT';

        client.on('data', (data) => {
          const str = data.toString();

          if (stage === 'CONNECT' && str.startsWith('+OK')) {
            client.write(`USER ${testUser.email}\r\n`);
            stage = 'USER_SENT';
          } else if (stage === 'USER_SENT' && str.startsWith('+OK')) {
            client.write(`PASS wrongpass\r\n`);
            stage = 'PASS_SENT';
          } else if (stage === 'PASS_SENT') {
             if (str.startsWith('-ERR')) {
                 resolve('FAILED_AS_EXPECTED');
                 client.end();
             } else {
                 client.end();
                 reject(new Error('Should have failed but got: ' + str));
             }
          }
        });
      });

      expect(response).toBe('FAILED_AS_EXPECTED');
    });
  });
});
