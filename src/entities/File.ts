import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("files")
export class File {
  @PrimaryGeneratedColumn() id!: number;
  @Column() ownerId!: number;
  @Column() filename!: string;
  @Column() originalName!: string;
  @Column() mimeType!: string;
  @Column() extension!: string;
  @Column("bigint") size!: number;
  @CreateDateColumn() uploadedAt!: Date;
}
