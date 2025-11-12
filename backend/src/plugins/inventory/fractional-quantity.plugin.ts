import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { FractionalQuantityResolver } from './fractional-quantity.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [],
    adminApiExtensions: {
        schema: gql`
            extend type Mutation {
                updateOrderLineQuantity(orderLineId: ID!, quantity: Float!): UpdateOrderItemsResult!
            }
        `,
        resolvers: [FractionalQuantityResolver],
    },
})
export class FractionalQuantityPlugin { }
