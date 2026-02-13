import { DataSourceOptions } from "typeorm";
import { User } from "../entities/User";
import { File } from "../entities/File";

export const ormOptions: DataSourceOptions = {
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "NewStrongPassword!23",
  database: process.env.DB_NAME || "erp_aero_test",
  entities: [User, File],
  synchronize: true,
  logging: false,
};
