import { randomBytes } from "crypto";

export const generateToken = (size = 16) => randomBytes(size).toString("hex");
