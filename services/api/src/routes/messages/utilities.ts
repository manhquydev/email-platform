export function sanitizeHeaderFilename(filename: string): string {
  return filename.replace(/["\\]/g, "_");
}

export function buildMessageTextSearchFilters(q: string) {
  return [
    { subject: { contains: q, mode: "insensitive" as const } },
    { fromAddress: { contains: q, mode: "insensitive" as const } },
    { toAddress: { contains: q, mode: "insensitive" as const } },
    { textBody: { contains: q, mode: "insensitive" as const } },
  ];
}

export function buildTempOutboundMessageId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).substring(2)}`;
}
