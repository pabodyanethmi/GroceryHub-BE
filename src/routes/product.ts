import { Router } from "express";
import { upload } from "../middleware/upload";
import {
  addProduct,
  changeStock,
  deleteProduct,
  getAllProduct,
  getProductById,
  searchProduct,
  updateProduct,
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { Role } from "../models/auth.model";

const router = Router();

router.post(
  "/add",
  authenticate,
  requireRole([Role.ADMIN, Role.SELLER]),
  upload.array("image", 4),
  addProduct,
);

router.post(
  "/stock",
  authenticate,
  requireRole([Role.ADMIN, Role.SELLER]),
  changeStock,
);

router.get("/all", getAllProduct);
router.get("/:id", getProductById);

router.put(
  "/update/:id",
  authenticate,
  requireRole([Role.ADMIN, Role.SELLER]),
  upload.single("image"),
  updateProduct,
);

router.delete(
  "/delete/:id",
  authenticate,
  requireRole([Role.ADMIN, Role.SELLER]),
  deleteProduct,
);

router.get("/", searchProduct);

export default router;
