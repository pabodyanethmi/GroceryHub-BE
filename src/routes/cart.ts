import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { updateCart } from "../controllers/cart.controller";

const cartRouter = Router();

cartRouter.post("/update", authenticate, updateCart);

export default cartRouter;