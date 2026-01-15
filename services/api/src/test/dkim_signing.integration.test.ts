import { describe, it, expect, beforeEach, vi } from 'vitest';
import { app, prisma } from './setup';
import { outboundService } from '../services/outbound';
import { DkimService } from '../services/dkim.service';
import { encrypt } from '../utils/encryption';

describe('DKIM Signing Integration', () => {
  beforeEach(async () => {
    // Cleanup is handled by setup.ts beforeEach
  });

  it('should apply DKIM options when sending email from a domain with DKIM enabled', async () => {
    // 1. Setup Test Data
    const domainName = 'test-dkim.com';
    const domain = await prisma.domain.create({
      data: {
        name: domainName,
        status: 'VERIFIED',
        verificationToken: 'test-token',
      },
    });

    const selector = 'test-selector';
    const privateKey = '-----BEGIN PRIVATE KEY-----\nTEST_KEY\n-----END PRIVATE KEY-----';
    const publicKey = 'TEST_PUBLIC_KEY';

    await prisma.domainDkim.create({
      data: {
        domainId: domain.id,
        selector,
        privateKey: encrypt(privateKey),
        publicKey,
      },
    });

    // 2. Mock Transporter.sendMail
    // Accessing private transporter for testing purposes
    const sendMailSpy = vi.spyOn((outboundService as any).transporter, 'sendMail');
    sendMailSpy.mockResolvedValue({ messageId: 'test-msg-id' });

    // 3. Trigger Send
    await outboundService.sendEmail(
      'sender@' + domainName,
      'recipient@example.com',
      'Test DKIM',
      'Body text'
    );

    // 4. Verify DKIM Options
    expect(sendMailSpy).toHaveBeenCalled();
    const callArgs = sendMailSpy.mock.calls[0][0] as any;

    expect(callArgs.dkim).toBeDefined();
    expect(callArgs.dkim.domainName).toBe(domainName);
    expect(callArgs.dkim.keySelector).toBe(selector);
    expect(callArgs.dkim.privateKey).toBe(privateKey);

    sendMailSpy.mockRestore();
  });

  it('should NOT apply DKIM options for domains without DKIM config', async () => {
    const domainName = 'no-dkim.com';
    await prisma.domain.create({
      data: {
        name: domainName,
        status: 'VERIFIED',
        verificationToken: 'token',
      },
    });

    const sendMailSpy = vi.spyOn((outboundService as any).transporter, 'sendMail');
    sendMailSpy.mockResolvedValue({ messageId: 'test-msg-id' });

    await outboundService.sendEmail(
      'sender@' + domainName,
      'recipient@example.com',
      'No DKIM',
      'Body text'
    );

    const callArgs = sendMailSpy.mock.calls[0][0] as any;
    expect(callArgs.dkim).toBeUndefined();

    sendMailSpy.mockRestore();
  });
});
