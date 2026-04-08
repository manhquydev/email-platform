import '../env-setup';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { startSubmissionServer } from '../../smtp/submission-server';
import { prisma } from '../setup';
import { hashPassword } from '../../utils/password';
import { SMTPServer } from 'smtp-server';
import { SmtpAuthHandler } from '../../smtp/auth-handler';

describe('Enterprise Protocol Tests: SMTP Submission', () => {
  let server: SMTPServer;
  const SUBMISSION_PORT = 10587;

  const testUser = {
    email: 'sender@example.com',
    password: 'secure-password',
    id: 'sender-123'
  };

  // Mock Logger
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  beforeAll(async () => {
    // Start SMTP Submission Server
    server = startSubmissionServer(mockLogger, SUBMISSION_PORT);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Setup user + owned verified mailbox that matches sender@example.com
    await prisma.inbox.deleteMany({ where: { localPart: 'sender' } });
    await prisma.domain.deleteMany({ where: { name: 'example.com' } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
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
        verificationToken: 'smtp-submission-test-token',
        ownerId: user.id,
      },
    });

    await prisma.inbox.create({
      data: {
        domainId: domain.id,
        localPart: 'sender',
        ownerId: user.id,
      },
    });

    // Keep protocol suite focused on SMTP command-path behavior.
    vi.spyOn(SmtpAuthHandler, 'validateCredentials').mockResolvedValue({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    } as any);

    vi.spyOn(SmtpAuthHandler, 'canSendAs').mockImplementation(async (_userId, from) => {
      return from.toLowerCase() === testUser.email;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should authenticate and accept valid email', async () => {
    // Create Transporter
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: SUBMISSION_PORT,
      secure: false, // Use STARTTLS if supported, or clear text for local test
      auth: {
        user: testUser.email,
        pass: testUser.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection first
    await expect(transporter.verify()).resolves.toBe(true);

    // Send Mail
    const info = await transporter.sendMail({
      from: testUser.email,
      to: 'recipient@other.com',
      subject: 'Test Email',
      text: 'Hello world'
    });

    expect(info.accepted).toContain('recipient@other.com');
    expect(info.messageId).toBeDefined();
  });

  it('should reject unauthenticated attempt', async () => {
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: SUBMISSION_PORT,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
      // No auth provided
    });

    // Attempt to send
    try {
      await transporter.sendMail({
        from: testUser.email,
        to: 'recipient@other.com',
        subject: 'Unauthorized',
        text: 'Should fail'
      });
      expect.fail('Should have rejected unauthenticated email');
    } catch (err: any) {
      // SMTP response for auth required
      expect(err.message).toMatch(/Authentication required/i);
    }
  });

  it('should reject sender address mismatch', async () => {
    const transporter = nodemailer.createTransport({
      host: 'localhost',
      port: SUBMISSION_PORT,
      secure: false,
      auth: {
        user: testUser.email,
        pass: testUser.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      await transporter.sendMail({
        from: 'imposter@other.com', // Sending as someone else
        to: 'recipient@other.com',
        subject: 'Spoof Attempt',
        text: 'Should fail'
      });
      expect.fail('Should have rejected spoofed sender');
    } catch (err: any) {
      expect(err.message).toMatch(/Sender address .* not owned/i);
    }
  });
});
