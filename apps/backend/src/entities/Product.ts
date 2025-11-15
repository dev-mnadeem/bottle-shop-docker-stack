import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Index notes:
 * - `slug` is unique via the column definition, which already creates a unique
 *   index. Declaring a second `@Index(..., { unique: true })` on the same column
 *   would build two identical B-trees and pay for both on every write.
 * - The catalogue is ordered by `createdAt DESC, id DESC` (id is the tiebreak so
 *   paging is stable when two rows share a timestamp), so the composite index
 *   matches the ORDER BY exactly.
 * - `priceCents` has its own index because the price filter is a range scan.
 */
@Entity({ name: 'product' })
@Index('idx_product_created_id', ['createdAt', 'id'])
@Index('idx_product_price', ['priceCents'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** Money is stored as integer minor units. No float ever touches a price. */
  @Column({ type: 'integer' })
  priceCents!: number;

  /** A path served by the frontend's public/ directory, or an absolute https URL. */
  @Column({ type: 'text' })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 400 })
  shortDescription!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
