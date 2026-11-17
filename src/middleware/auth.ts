import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AUthRequest extends Request {
  user?: any;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  const token = cookieToken || (authHeader && authHeader.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as AUthRequest).user = payload;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      message: "Invalid or expire token",
    });
  }
};
