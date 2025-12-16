export const headersToObject = (headers: Map<string, string | string[] | undefined>) => {
  const entries: Record<string, string | string[]> = {};
  for (const [key, value] of headers.entries()) {
    if (value === undefined) continue;
    entries[key] = value;
  }
  return entries;
};
