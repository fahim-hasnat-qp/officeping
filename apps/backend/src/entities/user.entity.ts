import { UserRole } from '@officeping/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  googleId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role_enum', default: UserRole.MEMBER })
  role!: UserRole;

  @Column({ default: false })
  isOnline!: boolean;

  @Column({ type: 'varchar', nullable: true, default: null })
  deskLocation!: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  defaultBreakfast!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
