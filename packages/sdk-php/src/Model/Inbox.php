<?php

declare(strict_types=1);

namespace Ephemera\Model;

class Inbox
{
    public function __construct(
        public readonly string $id,
        public readonly string $localPart,
        public readonly string $domainId,
        public readonly string $address,
        public readonly ?string $ownerId = null,
        public readonly ?string $expiresAt = null,
        public readonly ?string $createdAt = null,
        public readonly ?Domain $domain = null
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            localPart: $data['localPart'],
            domainId: $data['domainId'],
            address: $data['address'] ?? '',
            ownerId: $data['ownerId'] ?? null,
            expiresAt: $data['expiresAt'] ?? null,
            createdAt: $data['createdAt'] ?? null,
            domain: isset($data['domain']) ? Domain::fromArray($data['domain']) : null
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'localPart' => $this->localPart,
            'domainId' => $this->domainId,
            'address' => $this->address,
            'ownerId' => $this->ownerId,
            'expiresAt' => $this->expiresAt,
            'createdAt' => $this->createdAt,
            'domain' => $this->domain?->toArray(),
        ];
    }
}
