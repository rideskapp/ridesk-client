/**
 * Safely retrieves a field from a profile object that may have either camelCase or snake_case keys
 * @param profile - The profile object
 * @param camelKey - The camelCase key name
 * @param snakeKey - The snake_case key name
 * @param defaultValue - Default value if neither key exists (required)
 * @returns The field value or default
 */
export function getProfileField<T>(
    profile: any,
    camelKey: string,
    snakeKey: string,
    defaultValue: T
): T {
    if (!profile) return defaultValue;

    // Try camelCase first
    if (profile[camelKey] !== undefined && profile[camelKey] !== null) {
        return profile[camelKey] as T;
    }

    // Try snake_case
    if (profile[snakeKey] !== undefined && profile[snakeKey] !== null) {
        return profile[snakeKey] as T;
    }

    return defaultValue;
}
