/**
 * Generate random string for email local part
 * @param length - Length of the random string (default: 8)
 * @returns Random alphanumeric string
 */
export const generateRandomName = (length: number = 8): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
