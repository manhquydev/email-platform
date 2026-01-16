import { describe, it, expect } from 'vitest';
import { normalizeInbox, normalizeInboxes } from './utils';

describe('normalizeInbox', () => {
  it('should normalize inbox with string domain', () => {
    const input = {
      id: 'inbox-1',
      localPart: 'test',
      domain: 'example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-02T00:00:00Z',
      unreadCount: 5,
    };

    const result = normalizeInbox(input);

    expect(result).toEqual({
      id: 'inbox-1',
      localPart: 'test',
      domain: 'example.com',
      address: 'test@example.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-02T00:00:00Z',
      unreadCount: 5,
      _count: { messages: 5 },
    });
  });

  it('should normalize inbox with object domain', () => {
    const input = {
      id: 'inbox-2',
      localPart: 'user',
      domain: { id: 'dom-1', name: 'mail.com', isPublic: true },
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: null,
      _count: { messages: 3 },
    };

    const result = normalizeInbox(input);

    expect(result.domain).toBe('mail.com');
    expect(result.address).toBe('user@mail.com');
    expect(result.unreadCount).toBe(3);
  });

  it('should use existing address if provided', () => {
    const input = {
      id: 'inbox-3',
      localPart: 'custom',
      domain: 'test.com',
      address: 'custom+alias@test.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: null,
    };

    const result = normalizeInbox(input);

    expect(result.address).toBe('custom+alias@test.com');
  });

  it('should default unreadCount to 0 when not provided', () => {
    const input = {
      id: 'inbox-4',
      localPart: 'empty',
      domain: 'test.com',
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: null,
    };

    const result = normalizeInbox(input);

    expect(result.unreadCount).toBe(0);
    expect(result._count?.messages).toBe(0);
  });

  it('should fallback to "domain" when domain info missing', () => {
    const input = {
      id: 'inbox-5',
      localPart: 'fallback',
      domain: {},
      createdAt: '2024-01-01T00:00:00Z',
      expiresAt: null,
    };

    const result = normalizeInbox(input);

    expect(result.domain).toBe('domain');
  });
});

describe('normalizeInboxes', () => {
  it('should normalize array of inboxes', () => {
    const input = [
      { id: '1', localPart: 'a', domain: 'x.com', createdAt: '', expiresAt: null },
      { id: '2', localPart: 'b', domain: 'y.com', createdAt: '', expiresAt: null },
    ];

    const result = normalizeInboxes(input);

    expect(result).toHaveLength(2);
    expect(result[0].address).toBe('a@x.com');
    expect(result[1].address).toBe('b@y.com');
  });

  it('should return empty array for non-array input', () => {
    expect(normalizeInboxes(null as any)).toEqual([]);
    expect(normalizeInboxes(undefined as any)).toEqual([]);
    expect(normalizeInboxes('invalid' as any)).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(normalizeInboxes([])).toEqual([]);
  });
});
