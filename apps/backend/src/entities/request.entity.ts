import { RequestStatus } from '@officeping/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { RequestNote } from './request-note.entity';
import { User } from './user.entity';

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester!: User;

  @Index()
  @Column({ type: 'uuid' })
  requesterId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  staff!: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  staffId!: string | null;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  category!: Category;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @Column()
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;

  @Column()
  location!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: RequestStatus,
    enumName: 'request_status_enum',
    default: RequestStatus.PENDING,
  })
  status!: RequestStatus;

  @Column({ type: 'varchar', nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'varchar', nullable: true })
  delayReason!: string | null;

  @Column({ default: false })
  isSavedRequest!: boolean;

  @Column({ type: 'varchar', nullable: true, default: null })
  quickSendLabel!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @OneToMany(() => RequestNote, (n) => n.request, { eager: false })
  notes!: RequestNote[];
}
