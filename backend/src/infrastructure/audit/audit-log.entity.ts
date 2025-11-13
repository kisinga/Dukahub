import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/**
 * Audit Log Entity
 * 
 * Stores all audited events with channel scoping and user attribution.
 * Time-series optimized for efficient querying with TimescaleDB.
 * 
 * Note: Uses composite primary key (id, timestamp) for TimescaleDB hypertable.
 * The timestamp is the partitioning dimension for the hypertable.
 */
@Entity('audit_log')
@Index(['channelId', 'timestamp'])
@Index(['channelId', 'entityType', 'entityId'])
@Index(['channelId', 'userId'])
export class AuditLog {
    @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
    id: string;

    @PrimaryColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;

    @Column('uuid')
    channelId: string; // Required, indexed

    @Column()
    eventType: string; // e.g., 'order.created', 'user.created'

    @Column({ nullable: true })
    entityType: string | null; // e.g., 'Order', 'User'

    @Column({ nullable: true })
    entityId: string | null;

    @Column('uuid', { nullable: true })
    userId: string | null; // Who performed the action

    @Column('jsonb')
    data: Record<string, any>; // Flexible event data

    @Column({ type: 'varchar' })
    source: 'user_action' | 'system_event';
}

