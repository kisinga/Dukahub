/**
 * Channel approval status enum
 *
 * UNAPPROVED: Read-only access
 * APPROVED: Full access
 * DISABLED: No access (temporary)
 * BANNED: No access (permanent)
 */
export enum ChannelStatus {
  UNAPPROVED = 'UNAPPROVED',
  APPROVED = 'APPROVED',
  DISABLED = 'DISABLED',
  BANNED = 'BANNED',
}

/**
 * TypeScript interface for Channel customFields
 *
 * This provides type safety when accessing Channel.customFields in the codebase.
 * The status field is the single source of truth for channel approval status.
 */
export interface ChannelCustomFields {
  /**
   * Channel approval status - single source of truth
   * UNAPPROVED: Read-only access
   * APPROVED: Full access
   * DISABLED: No access (temporary)
   * BANNED: No access (permanent)
   */
  status: ChannelStatus;

  // Other custom fields can be added here as needed
  // For now, we only type the status field since it's critical for access control
}

/**
 * Helper function to safely extract channel status from customFields
 * Returns UNAPPROVED as default if status is missing
 */
export function getChannelStatus(customFields: any): ChannelStatus {
  return (customFields?.status as ChannelStatus) || ChannelStatus.UNAPPROVED;
}
