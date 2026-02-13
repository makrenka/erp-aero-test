import { DataSourceOptions } from "typeorm";
import { User } from "../entities/User";
import { File } from "../entities/File";

export const ormOptions: DataSourceOptions = {
  type: "mysql",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [User, File],
  synchronize: true,
  logging: false,
};
