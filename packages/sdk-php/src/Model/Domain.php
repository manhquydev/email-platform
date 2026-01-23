<?php

declare(strict_types=1);

namespace Ephemera\Model;

class Domain
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly bool $verified = false,
        public readonly bool $isPublic = false,
        public readonly ?string $ownerId = null,
        public readonly ?string $createdAt = null
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            verified: $data['verified'] ?? false,
            isPublic: $data['isPublic'] ?? false,
            ownerId: $data['ownerId'] ?? null,
            createdAt: $data['createdAt'] ?? null
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'verified' => $this->verified,
            'isPublic' => $this->isPublic,
            'ownerId' => $this->ownerId,
            'createdAt' => $this->createdAt,
        ];
    }
}
