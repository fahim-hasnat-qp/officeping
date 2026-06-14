import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('lunch')
@Unique(['userId', 'date'])
export class Lunch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column()
  attending!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
