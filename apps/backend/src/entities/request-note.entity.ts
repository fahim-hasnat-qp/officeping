import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Request } from './request.entity';
import { User } from './user.entity';

@Entity('request_notes')
export class RequestNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Request, (r) => r.notes, { onDelete: 'CASCADE' })
  request!: Request;

  @Index()
  @Column({ type: 'uuid' })
  requestId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  author!: User;

  @Column({ type: 'uuid' })
  authorId!: string;

  @Column()
  message!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
