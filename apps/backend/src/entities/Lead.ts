import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { LeadIntent, LeadPriority } from '../ports/leadTriage';

@Entity({ name: 'lead' })
@Index('idx_lead_created_at', ['createdAt'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Unique so a repeat submission updates nothing and cannot flood the table. */
  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  utmSource!: string | null;

  /** Filled in by the triage provider at write time. */
  @Column({ type: 'varchar', length: 32, default: 'general' })
  intent!: LeadIntent;

  @Column({ type: 'varchar', length: 16, default: 'normal' })
  priority!: LeadPriority;

  /** Which triage adapter produced `intent`/`priority`. */
  @Column({ type: 'varchar', length: 32, default: 'rules' })
  triageSource!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
