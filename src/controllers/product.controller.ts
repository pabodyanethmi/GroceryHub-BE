import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { AUthRequest } from "../middleware/auth";
import { Product } from "../models/product.model";

export const addProduct = async (req: AUthRequest, res: Response) => {
  try {
    const parsedData = req.body.productData
      ? JSON.parse(req.body.productData)
      : req.body;

    const {
      name,
      description,
      price,
      offerPrice,
      category,
      inStock,
      weight,
      stockQuantity,
    } = parsedData;

    const files = (req.files as Express.Multer.File[]) || [];
    const imageURLs: string[] = [];

    // Upload all selected images to Cloudinary
    for (const file of files) {
      const result: any = await new Promise((resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        upload_stream.end(file.buffer);
      });
      imageURLs.push(result.secure_url);
    }

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        message: "Product already exist",
      });
    }

    const sellerId =
      req.user.userId || req.user.sub || req.user._id || req.user.id;

    const qty = stockQuantity !== undefined ? Number(stockQuantity) : 20;

    const newProduct = new Product({
      name,
      description: Array.isArray(description)
        ? description.join("\n")
        : description,
      price: Number(price),
      offerPrice: Number(offerPrice),
      weight: weight || "1kg",
      stockQuantity: qty,
      category: Array.isArray(category) ? category : [category],
      inStock: qty > 0 ? (inStock !== undefined ? inStock : true) : false,
      image: imageURLs,
      seller: sellerId,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Add Product Error:", error);
    if ((error as any).code === 11000) {
      return res.status(400).json({
        message: "Product already exist",
      });
    }
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getAllProduct = async (req: AUthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments();

    res.status(200).json({
      success: true,
      message: "Product Fetched Successfully",
      data: products,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};

export const getProductById = async (req: AUthRequest, res: Response) => {
  try {
    const productId = req.params.id as string;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product Fetched Successfully",
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};

export const updateProduct = async (req: AUthRequest, res: Response) => {
  try {
    const productId = req.params.id as string;
    const {
      name,
      description,
      price,
      offerPrice,
      category,
      inStock,
      weight,
      stockQuantity,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (offerPrice !== undefined) updateData.offerPrice = Number(offerPrice);
    if (weight !== undefined) updateData.weight = weight;
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = Number(stockQuantity);
      updateData.inStock = Number(stockQuantity) > 0;
    }
    if (inStock !== undefined && stockQuantity === undefined) {
      updateData.inStock = inStock;
    }
    if (category !== undefined) {
      updateData.category = Array.isArray(category) ? category : [category];
    }

    if (req.file) {
      const result: any = await new Promise((resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        upload_stream.end(req.file?.buffer);
      });
      updateData.image = [result.secure_url];
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

export const changeStock = async (req: AUthRequest, res: Response) => {
  try {
    const { id, inStock } = req.body;
    await Product.findByIdAndUpdate(id, { inStock });
    res.status(200).json({
      success: true,
      message: "Stock Updated",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update stock",
    });
  }
};

export const deleteProduct = async (req: AUthRequest, res: Response) => {
  try {
    const productId = req.params.id as string;
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

export const searchProduct = async (req: AUthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const products = await Product.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    });
    res.status(200).json({
      success: true,
      message: "Product Fetched Successfully",
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
};