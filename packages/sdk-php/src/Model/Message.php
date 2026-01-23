<?php

declare(strict_types=1);

namespace Ephemera\Model;

class Message
{
    public function __construct(
        public readonly string $id,
        public readonly string $inboxId,
        public readonly string $messageId,
        public readonly string $toAddress,
        public readonly string $subject,
        public readonly ?string $fromAddress = null,
        public readonly ?string $textBody = null,
        public readonly ?string $htmlBody = null,
        public readonly ?string $receivedAt = null,
        public readonly bool $isRead = false,
        public readonly bool $isPinned = false,
        public readonly ?float $spamScore = null,
        public readonly int $size = 0,
        public readonly array $attachments = []
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            inboxId: $data['inboxId'],
            messageId: $data['messageId'],
            toAddress: $data['toAddress'],
            subject: $data['subject'] ?? '',
            fromAddress: $data['fromAddress'] ?? null,
            textBody: $data['textBody'] ?? null,
            htmlBody: $data['htmlBody'] ?? null,
            receivedAt: $data['receivedAt'] ?? null,
            isRead: $data['isRead'] ?? false,
            isPinned: $data['isPinned'] ?? false,
            spamScore: $data['spamScore'] ?? null,
            size: $data['size'] ?? 0,
            attachments: $data['attachments'] ?? []
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'inboxId' => $this->inboxId,
            'messageId' => $this->messageId,
            'toAddress' => $this->toAddress,
            'subject' => $this->subject,
            'fromAddress' => $this->fromAddress,
            'textBody' => $this->textBody,
            'htmlBody' => $this->htmlBody,
            'receivedAt' => $this->receivedAt,
            'isRead' => $this->isRead,
            'isPinned' => $this->isPinned,
            'spamScore' => $this->spamScore,
            'size' => $this->size,
            'attachments' => $this->attachments,
        ];
    }
}
