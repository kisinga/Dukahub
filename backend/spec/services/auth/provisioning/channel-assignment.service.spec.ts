import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    Channel,
    RequestContext,
    StockLocation
} from '@vendure/core';
import { ChannelAssignmentService } from '../../../../src/services/auth/provisioning/channel-assignment.service';

const buildService = () => {
    let channelRepo: any;
    let stockLocationRepo: any;

    const buildRepo = (entityName: string) => {
        const entities = new Map<any, any>();
        const relations = new Map<string, any[]>();

        return {
            findOne: jest.fn(async (options: any) => {
                const entityId = options.where.id;
                const entity = entities.get(entityId);
                if (!entity) return null;

                // Load relations if requested
                const entityWithRelations = { ...entity };
                if (options.relations) {
                    for (const relation of options.relations) {
                        const relationKey = `${entityId}-${relation}`;
                        // If relation exists in map, use it; otherwise use entity's own relation property
                        const savedRelation = relations.get(relationKey);
                        // Always prefer savedRelation from map if it exists (even if empty array)
                        // This ensures relations saved via save() are properly returned
                        if (savedRelation !== undefined) {
                            entityWithRelations[relation] = savedRelation;
                        } else if (entity[relation] !== undefined) {
                            entityWithRelations[relation] = entity[relation];
                        } else {
                            entityWithRelations[relation] = [];
                        }
                    }
                }

                return entityWithRelations;
            }),
            save: jest.fn(async (entity: any) => {
                const saved = { ...entity, id: entity.id || Date.now() };
                entities.set(saved.id, saved);

                // Save relations when entity is saved - always store even if empty array
                const stockLocationsKey = `${saved.id}-stockLocations`;
                if (saved.stockLocations !== undefined) {
                    relations.set(stockLocationsKey, saved.stockLocations);
                }
                const channelsKey = `${saved.id}-channels`;
                if (saved.channels !== undefined) {
                    relations.set(channelsKey, saved.channels);
                }
                const paymentMethodsKey = `${saved.id}-paymentMethods`;
                if (saved.paymentMethods !== undefined) {
                    relations.set(paymentMethodsKey, saved.paymentMethods);
                }

                return saved;
            }),
            update: jest.fn(async () => ({ affected: 1 })),
            _setEntity: (id: any, entity: any) => {
                entities.set(id, entity);
            },
            _setRelation: (entityId: any, relationName: string, relatedEntities: any[]) => {
                const key = `${entityId}-${relationName}`;
                relations.set(key, relatedEntities);
            },
            _getEntities: () => entities,
            _getRelations: () => relations,
        };
    };

    channelRepo = buildRepo('Channel');
    stockLocationRepo = buildRepo('StockLocation');

    const connection = {
        getRepository: jest.fn((ctx: RequestContext, entity: any) => {
            if (entity.name === 'Channel') {
                return channelRepo;
            }
            if (entity.name === 'StockLocation') {
                return stockLocationRepo;
            }
            return buildRepo(entity.name);
        }),
    };

    const service = new ChannelAssignmentService(connection as any);

    return {
        service,
        connection,
        channelRepo,
        stockLocationRepo,
    };
};

describe('ChannelAssignmentService', () => {
    const ctx = {} as RequestContext;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('assignStockLocationToChannel', () => {
        it('should persist stock location assignment to channel in transaction', async () => {
            const harness = buildService();

            // Setup initial entities
            const channel = { id: 2, token: 'channel-token' } as Channel;
            const stockLocation = { id: 3, name: 'Main Store' } as StockLocation;

            harness.channelRepo._setEntity(2, channel);
            harness.stockLocationRepo._setEntity(3, stockLocation);

            // Mock findOne to return entities with empty relations
            harness.channelRepo.findOne.mockResolvedValueOnce({
                ...channel,
                stockLocations: [],
            });
            harness.stockLocationRepo.findOne.mockResolvedValueOnce({
                ...stockLocation,
                channels: [],
            });

            await harness.service.assignStockLocationToChannel(ctx, 3, 2);

            // Verify channel.save was called with stock location
            expect(harness.channelRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 2,
                    stockLocations: expect.arrayContaining([
                        expect.objectContaining({ id: 3 }),
                    ]),
                })
            );

            // Verify stock location.save was called with channel (bidirectional)
            expect(harness.stockLocationRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 3,
                    channels: expect.arrayContaining([
                        expect.objectContaining({ id: 2 }),
                    ]),
                })
            );
        });

        it('should verify assignment persists after save', async () => {
            const harness = buildService();

            const channel = { id: 2, token: 'channel-token' } as Channel;
            const stockLocation = { id: 3, name: 'Main Store' } as StockLocation;

            harness.channelRepo._setEntity(2, channel);
            harness.stockLocationRepo._setEntity(3, stockLocation);

            // The buildRepo mock automatically handles relations via the relations Map
            // When save is called with stockLocations, it stores them in the relations map
            // When findOne is called with relations, it reads from the relations map
            // So we just need to ensure the save includes the relation

            await harness.service.assignStockLocationToChannel(ctx, 3, 2);

            // Verify verification step was called (second findOne call for verification)
            expect(harness.channelRepo.findOne).toHaveBeenCalledTimes(2);
            const verificationCall = harness.channelRepo.findOne.mock.calls[1];
            expect(verificationCall[0]).toMatchObject({
                where: { id: 2 },
                relations: ['stockLocations'],
            });
            
            // Verify the save was called with the stock location
            expect(harness.channelRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 2,
                    stockLocations: expect.arrayContaining([
                        expect.objectContaining({ id: 3 })
                    ])
                })
            );
        });

        it('should not assign if already assigned (idempotent)', async () => {
            const harness = buildService();

            const channel = { id: 2 } as Channel;
            const stockLocation = { id: 3 } as StockLocation;

            // Entities already have the relationship - mock all findOne calls
            harness.channelRepo.findOne
                .mockResolvedValueOnce({
                    ...channel,
                    stockLocations: [stockLocation],
                })
                // Verification call should also return channel with stock location
                .mockResolvedValueOnce({
                    ...channel,
                    stockLocations: [stockLocation],
                });
            harness.stockLocationRepo.findOne.mockResolvedValueOnce({
                ...stockLocation,
                channels: [channel],
            });

            await harness.service.assignStockLocationToChannel(ctx, 3, 2);

            // Should not call save if already assigned
            expect(harness.channelRepo.save).not.toHaveBeenCalled();
            expect(harness.stockLocationRepo.save).not.toHaveBeenCalled();
        });

        it('should initialize empty arrays for relations if undefined', async () => {
            const harness = buildService();

            const channel = { id: 2 } as Channel;
            const stockLocation = { id: 3 } as StockLocation;

            // Entities without relations property
            harness.channelRepo.findOne.mockResolvedValueOnce({
                ...channel,
                stockLocations: undefined,
            });
            harness.stockLocationRepo.findOne.mockResolvedValueOnce({
                ...stockLocation,
                channels: undefined,
            });

            await harness.service.assignStockLocationToChannel(ctx, 3, 2);

            // Should initialize arrays before saving
            expect(harness.channelRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    stockLocations: expect.any(Array),
                })
            );
            expect(harness.stockLocationRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    channels: expect.any(Array),
                })
            );
        });

        it('should throw error if channel not found', async () => {
            const harness = buildService();

            harness.channelRepo.findOne.mockResolvedValueOnce(null);
            harness.stockLocationRepo.findOne.mockResolvedValueOnce({
                id: 3,
                channels: [],
            });

            await expect(
                harness.service.assignStockLocationToChannel(ctx, 3, 2)
            ).rejects.toThrow('Channel 2 or stock location 3 not found');
        });

        it('should throw error if stock location not found', async () => {
            const harness = buildService();

            harness.channelRepo.findOne.mockResolvedValueOnce({
                id: 2,
                stockLocations: [],
            });
            harness.stockLocationRepo.findOne.mockResolvedValueOnce(null);

            await expect(
                harness.service.assignStockLocationToChannel(ctx, 3, 2)
            ).rejects.toThrow('Channel 2 or stock location 3 not found');
        });

        it('should maintain bidirectional relationship consistency', async () => {
            const harness = buildService();

            const channel = { id: 2 } as Channel;
            const stockLocation = { id: 3 } as StockLocation;

            harness.channelRepo.findOne.mockResolvedValueOnce({
                ...channel,
                stockLocations: [],
            });
            harness.stockLocationRepo.findOne.mockResolvedValueOnce({
                ...stockLocation,
                channels: [],
            });

            await harness.service.assignStockLocationToChannel(ctx, 3, 2);

            // Verify both sides of the relationship are saved
            const channelSaveCall = harness.channelRepo.save.mock.calls[0][0];
            const locationSaveCall = harness.stockLocationRepo.save.mock.calls[0][0];

            expect(channelSaveCall.stockLocations).toContainEqual(
                expect.objectContaining({ id: 3 })
            );
            expect(locationSaveCall.channels).toContainEqual(
                expect.objectContaining({ id: 2 })
            );
        });
    });
});

