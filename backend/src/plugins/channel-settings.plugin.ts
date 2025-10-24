import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { ChannelSettingsResolver, channelSettingsSchema } from './channel-settings.resolver';
import { ChannelSettingsService } from './channel-settings.service';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ChannelSettingsResolver, ChannelSettingsService],
    adminApiExtensions: {
        resolvers: [ChannelSettingsResolver],
        schema: channelSettingsSchema,
    },
})
export class ChannelSettingsPlugin { }

