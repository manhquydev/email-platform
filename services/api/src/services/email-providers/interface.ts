
export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
  path?: string;
  cid?: string;
  [key: string]: any;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  headers?: Record<string, string>;
  senderName?: string;
  // Provider specific options
  dkim?: {
    domainName: string;
    keySelector: string;
    privateKey: string;
  };
}

export interface SendEmailResult {
  messageId: string;
  provider: string; // 'smtp' | 'ses' | 'mailgun'
  originalResponse?: any;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  verifyConnection(): Promise<boolean>;
}
