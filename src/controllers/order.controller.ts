import { Request, Response } from "express";
import { AUthRequest } from "../middleware/auth";
import { Product } from "../models/product.model";
import Order from "../models/order";

export const placeOrderCOD = async (req: AUthRequest, res: Response) => {
  try {
    const { items, address } = req.body;
    const userId =
      req.body.userId ||
      req.user?.userId ||
      req.user?.sub ||
      req.user?._id ||
      req.user?.id;

    if (!address || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Data",
      });
    }

    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }
      if ((product.stockQuantity ?? 20) < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`,
        });
      }
      amount += product.offerPrice * Number(item.quantity);
    }

    amount += Math.floor(amount * 0.02);

    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
    });

    // Auto-deduct stock quantity
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        const newStock = Math.max(
          0,
          (product.stockQuantity ?? 20) - Number(item.quantity)
        );
        product.stockQuantity = newStock;
        if (newStock === 0) {
          product.inStock = false;
        }
        await product.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order Placed Successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Order Place Failed",
    });
  }
};

export const getUserOrders = async (req: AUthRequest, res: Response) => {
  try {
    const userId =
      req.user?.userId || req.user?.sub || req.user?._id || req.user?.id;

    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Orders Fetched Successfully",
      orders,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Orders Fetch Failed",
    });
  }
};

export const getAllOrders = async (req: AUthRequest, res: Response) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Orders Fetched Successfully",
      orders,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Orders Fetch Failed",
    });
  }
};

// Customer: Update Order Item Quantities (Only if "Order Placed")
export const updateUserOrder = async (req: AUthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { items } = req.body;
    const userId =
      req.user?.userId || req.user?.sub || req.user?._id || req.user?.id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "Order Placed") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be edited",
      });
    }

    // Restore previous quantities first, then verify & deduct new quantities
    for (const oldItem of order.items) {
      const product = await Product.findById(oldItem.product);
      if (product) {
        product.stockQuantity =
          (product.stockQuantity ?? 0) + Number(oldItem.quantity);
        await product.save();
      }
    }

    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        if ((product.stockQuantity ?? 0) < Number(item.quantity)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          });
        }
        amount += product.offerPrice * Number(item.quantity);
      }
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        const newStock = Math.max(
          0,
          (product.stockQuantity ?? 0) - Number(item.quantity)
        );
        product.stockQuantity = newStock;
        product.inStock = newStock > 0;
        await product.save();
      }
    }

    amount += Math.floor(amount * 0.02);

    order.items = items;
    order.amount = amount;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update order",
    });
  }
};

// Customer: Cancel / Delete Order (Only if "Order Placed")
export const cancelUserOrder = async (req: AUthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId =
      req.user?.userId || req.user?.sub || req.user?._id || req.user?.id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "Order Placed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel order after processing has started",
      });
    }

    // Restore stock quantity on cancel
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stockQuantity =
          (product.stockQuantity ?? 0) + Number(item.quantity);
        product.inStock = true;
        await product.save();
      }
    }

    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
};

// Seller: Update Order Status
export const updateOrderStatus = async (req: AUthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = [
      "Order Placed",
      "Order Confirmed",
      "Packing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const updateData: any = { status };
    if (status === "Delivered") {
      updateData.isPaid = true;
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

// Seller: Dashboard Analytics Stats
export const getSellerDashboardStats = async (
  req: AUthRequest,
  res: Response
) => {
  try {
    const orders = await Order.find()
      .populate("items.product address")
      .sort({ createdAt: -1 });
    const products = await Product.find();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status !== "Delivered").length;
    const deliveredOrders = orders.filter(
      (o) => o.status === "Delivered"
    ).length;
    const totalProducts = products.length;
    const lowStockProducts = products.filter(
      (p) => (p.stockQuantity ?? 0) <= 5
    );
    const recentOrders = orders.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        totalProducts,
        lowStockProducts,
        recentOrders,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};