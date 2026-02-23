/**
 * Maps database/API errors to user-friendly messages
 * to prevent leaking internal schema details.
 */
export const mapDbError = (error: { code?: string; message?: string }): string => {
  if (!error) return "An unexpected error occurred.";

  switch (error.code) {
    case "23505":
      return "This record already exists.";
    case "23503":
      return "Invalid reference. The related record may have been removed.";
    case "23514":
      return "The provided data is out of allowed range.";
    case "42501":
      return "You don't have permission to perform this action.";
    case "PGRST301":
      return "You don't have permission to access this resource.";
    default:
      // Check for common patterns without exposing details
      if (error.message?.includes("insufficient stock") || error.message?.includes("Insufficient stock")) {
        return "Not enough stock available for this item.";
      }
      console.error("Database error:", error);
      return "Operation failed. Please try again.";
  }
};
