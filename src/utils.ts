/**
 * Checks if a string is a valid ISO 8601 date format
 * 
 * @param dateString - The string to check
 * @returns True if the string is a valid ISO 8601 date, false otherwise
 */
export function isValidISODate(dateString: string): boolean {
  try {
    // Try to create a date from the string
    const date = new Date(dateString);
    
    // Check if the date is valid and if the ISO string matches the input
    // This helps filter out strings that are valid dates but not in ISO format
    return !isNaN(date.getTime()) && date.toISOString().includes(dateString);
  } catch (error) {
    return false;
  }
}