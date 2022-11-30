/**
 * @fileOverview contains all the custom middleware used in the application
 * @author Brian Omondi
 * @version 0.0.1
 */

import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const TokenMiddleware = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization").split(" ").pop();
  if (!token) return res.status(401).send("ACCESS DENIED");

  try {
    const verifiedToken: any = jwt.verify(
      token,
      process.env.SECREATE_TOKEN as string
    );
    req.UserId = verifiedToken._id as string;
    next();
  } catch (error) {
    res.status(400).send("Invalid Token");
  }
};

export const extractToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.header("Authorization").split(" ").pop();
  req.token = token;
  next();
};


