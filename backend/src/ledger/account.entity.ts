import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

@Entity('ledger_account')
@Index(['channelId', 'code'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  channelId!: number;

  @Column({ type: 'varchar', length: 64 })
  code!: string; // e.g., CASH_ON_HAND, BANK_MAIN, SALES, TAX_PAYABLE

  @Column({ type: 'varchar', length: 256 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: AccountType;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}


