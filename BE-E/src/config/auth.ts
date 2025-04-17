import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User } from "../models/User";

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'fast_bite_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7 days';

export const generateToken = (payload: any): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as `${number} days`
  };
  
  return jwt.sign(
    payload,
    JWT_SECRET,
    options
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}; 