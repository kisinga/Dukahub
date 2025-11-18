import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReconciliationScope = 'cash-session' | 'method' | 'bank' | 'inventory';
export type ReconciliationStatus = 'draft' | 'verified';

@Entity('reconciliation')
@Index(['channelId', 'rangeStart', 'rangeEnd'])
export class Reconciliation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  channelId!: number;

  @Column({ type: 'varchar', length: 32 })
  scope!: ReconciliationScope;

  @Column({ type: 'varchar', length: 64 })
  scopeRefId!: string; // e.g., sessionId, methodCode, payoutId

  @Column({ type: 'date' })
  rangeStart!: string;

  @Column({ type: 'date' })
  rangeEnd!: string;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: ReconciliationStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  externalRef?: string | null; // bank/payout id

  @Column({ type: 'bigint', default: 0 })
  varianceAmount!: string; // smallest unit

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'int' })
  createdBy!: number;

  @Column({ type: 'int', nullable: true })
  reviewedBy?: number | null;
}





