import { Request, Response } from "express";
import { AUthRequest } from "../middleware/auth";
import Address from "../models/Address";

export const addAddress = async (req: AUthRequest, res: Response) => {
  try {
    const { address } = req.body;
    const userId =
      req.body.userId ||
      req.user?.userId ||
      req.user?.sub ||
      req.user?._id ||
      req.user?.id;

    const newAddress = await Address.create({ ...address, userId });

    res.status(200).json({
      success: true,
      message: "Address added successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to add address",
    });
  }
};

export const getAddress = async (req: AUthRequest, res: Response) => {
  try {
    const userId =
      req.user?.userId || req.user?.sub || req.user?._id || req.user?.id;

    const addresses = await Address.find({ userId });

    res.status(200).json({
      success: true,
      message: "Address fetched successfully",
      addresses,
      data: addresses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Address fetch failed",
    });
  }
};
