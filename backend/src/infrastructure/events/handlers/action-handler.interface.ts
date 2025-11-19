import { RequestContext } from '@vendure/core';
import { ActionCategory } from '../types/action-category.enum';
import { ChannelActionType } from '../types/action-type.enum';
import { ActionConfig, ActionResult, ChannelEvent } from '../types/channel-event.interface';

/**
 * Channel Action Handler Interface
 *
 * All action handlers must implement this interface to ensure consistent behavior.
 */
export interface IChannelActionHandler {
  /**
   * The action type this handler handles
   */
  type: ChannelActionType;

  /**
   * The category this handler belongs to
   */
  category: ActionCategory;

  /**
   * Execute the action
   */
  execute(ctx: RequestContext, event: ChannelEvent, config: ActionConfig): Promise<ActionResult>;

  /**
   * Check if this handler can handle the given event
   */
  canHandle(event: ChannelEvent): boolean;
}
