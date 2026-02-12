import "reflect-metadata";
import { DataSource } from "typeorm";
import app from "./app";
import { ormOptions } from "../src/db/config";

export const AppDataSource = new DataSource(ormOptions);

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
  });
