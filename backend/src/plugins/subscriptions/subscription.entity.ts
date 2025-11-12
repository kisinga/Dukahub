import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface SubscriptionTierFeatures {
    features: string[];
}

@Entity()
export class SubscriptionTier {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('int')
    priceMonthly: number;

    @Column('int')
    priceYearly: number;

    @Column('jsonb', { nullable: true })
    features: SubscriptionTierFeatures;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}







