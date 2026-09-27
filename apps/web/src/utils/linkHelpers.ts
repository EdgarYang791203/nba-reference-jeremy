/** URL 是否帶 protocol（http/https/mailto 等），帶 protocol 視為外部連結（AppLink 用）。 */
export function hasProtocol(url?: string | null): boolean {
    if (!url) {
        return false;
    }
    const trimmed = String(url).trim();
    if (!trimmed) {
        return false;
    }
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
}
