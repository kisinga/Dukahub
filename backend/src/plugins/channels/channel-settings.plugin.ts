import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { ChannelSettingsResolver, channelSettingsSchema } from './channel-settings.resolver';
import { ChannelSettingsService } from '../../services/channels/channel-settings.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ChannelSettingsResolver, ChannelSettingsService],
    adminApiExtensions: {
        resolvers: [ChannelSettingsResolver],
        schema: channelSettingsSchema,
    },
})
export class ChannelSettingsPlugin { }

