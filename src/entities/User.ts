import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) identifier!: string; // phone or email
  @Column() passwordHash!: string;
  @Column("simple-json", { nullable: true }) devices?: {
    deviceId: string;
    refreshToken: string;
    revoked?: boolean;
    issuedAt: number;
  }[];
  @CreateDateColumn() createdAt!: Date;
}
