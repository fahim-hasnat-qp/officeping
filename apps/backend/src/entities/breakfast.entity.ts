import { MealStatus } from '@officeping/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('breakfast')
@Unique(['userId', 'date'])
export class Breakfast {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column()
  order!: string;

  @Column({
    type: 'enum',
    enum: MealStatus,
    enumName: 'meal_status_enum',
    default: MealStatus.PENDING,
  })
  status!: MealStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
