import bcrypt from "bcryptjs";
import { SECURITY } from "../config/constants";

export const hashPassword = async (plain: string) => bcrypt.hash(plain, SECURITY.BCRYPT_ROUNDS);

export const verifyPassword = async (plain: string, hash: string) => bcrypt.compare(plain, hash);
