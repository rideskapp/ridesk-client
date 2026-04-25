/**
 * Generates initials from a person's name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Initials (2 characters) or empty string if no name provided
 */
export function getInitialsFromName(firstName?: string, lastName?: string): string {
    const first = firstName?.trim();
    const last = lastName?.trim();

    if (!first && !last) {
        return '';
    }

    if (first && last) {
        return `${first[0]}${last[0]}`.toUpperCase();
    }

    if (first) {
        return first.substring(0, 2).toUpperCase();
    }

    if (last) {
        return last.substring(0, 2).toUpperCase();
    }

    return '';
}

/**
 * Generates initials from a school or organization name
 * @param name - School or organization name
 * @returns Initials (2 characters) or "SC" as fallback
 */
export function getInitialsFromSchoolName(name?: string): string {
    if (!name?.trim()) {
        return 'SC';
    }

    const words = name.trim().split(/\s+/);

    if (words.length >= 2) {
        // Take first letter of first word and first letter of last word
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
        // Take first two letters of single word
        return words[0].substring(0, 2).toUpperCase();
    }

    return 'SC';
}
