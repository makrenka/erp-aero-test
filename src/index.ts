import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const expressApp = express();
const PORT = Number(process.env.PORT) || 3000;

expressApp.use(cors());
expressApp.use(express.json());

expressApp.listen(PORT, () => {
  console.info(`Running on Port ${PORT}`);
});
