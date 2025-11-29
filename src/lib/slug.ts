/**
 * Generate a base slug from a name string.
 * - Lowercase
 * - Remove non-alphanumeric (retain spaces & hyphens during processing)
 * - Collapse whitespace to single hyphen
 * - Collapse multiple hyphens
 * - Truncate to maxLength (default 48)
 */
export function generateBaseSlug(name: string, maxLength = 48): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, maxLength);
}

/**
 * Generate a unique slug given an async uniqueness check
 * Will attempt suffixes -2..-10 before throwing.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = base || "venue";
  let attempt = 1;
  while (await exists(slug)) {
    attempt += 1;
    slug = `${base}-${attempt}`;
    if (attempt > 10) {
      throw new Error("Unable to generate unique venue slug");
    }
  }
  return slug;
}
