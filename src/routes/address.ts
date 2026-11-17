import { Router } from "express";
import { addAddress, getAddress } from "../controllers/address.controller";
import { authenticate } from "../middleware/auth";

const addressRouter = Router();

addressRouter.post("/add", authenticate, addAddress);

addressRouter.get("/get", authenticate, getAddress);

export default addressRouter;
