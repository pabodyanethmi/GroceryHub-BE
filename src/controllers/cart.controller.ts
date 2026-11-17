import { Request, Response } from "express";
import { AUthRequest } from "../middlewares/auth"
import { User } from "../models/auth.model"

export const updateCart = async (req: AUthRequest, res: Response) => {
  try {
    const { userId, cartItems } = req.body
    await User.findOneAndUpdate(userId, { cartItems })
    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Cart update failed",
    })
  }
}