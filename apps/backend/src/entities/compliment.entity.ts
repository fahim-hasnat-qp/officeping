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

@Entity('compliments')
export class Compliment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  fromUser!: User;

  @Column({ type: 'uuid' })
  fromUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  toStaff!: User;

  @Index()
  @Column({ type: 'uuid' })
  toStaffId!: string;

  @ManyToOne(() => Request, { onDelete: 'CASCADE' })
  request!: Request;

  @Column({ type: 'uuid', unique: true })
  requestId!: string;

  @Column()
  message!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
