import * as path from "path";

/**
 * Error thrown when a user-supplied path would escape its allowed base directory.
 */
export class PathTraversalError extends Error {
    constructor() {
        super("Path traversal detected");
        this.name = "PathTraversalError";
    }
}

/**
 * Resolve `userPath` against `basePath` and guarantee the result stays inside the base.
 *
 * Uses path.resolve so that `..`, absolute paths and symlink-style escapes are
 * collapsed before the containment check — a substring/`includes("..")` check is not
 * sufficient on its own. Returns the absolute, normalized path or throws.
 */
export function validatePathWithin(
    basePath: string,
    userPath: string,
    allowedExtension?: string,
): string {
    const normalizedBase = path.resolve(basePath);
    const resolved = path.resolve(normalizedBase, userPath);

    if (resolved !== normalizedBase && !resolved.startsWith(normalizedBase + path.sep)) {
        throw new PathTraversalError();
    }

    if (allowedExtension && !resolved.endsWith(allowedExtension)) {
        throw new Error(`File must have ${allowedExtension} extension`);
    }

    return resolved;
}

/**
 * Email-address path components (domain, localPart) are only ever alphanumerics plus
 * dot/hyphen/underscore. Reject anything else (including `..` and separators) so a
 * crafted value can never widen a derived filesystem path.
 */
export function isSafePathComponent(component: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(component) && !component.includes("..");
}
