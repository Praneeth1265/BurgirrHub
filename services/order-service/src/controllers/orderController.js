import { Order } from "../models/order.js";
import { MenuItem } from "../models/menuItem.js";
import { ErrorHandler } from "../error/error.js";
import { publishEvent } from "../utils/publisher.js";
import { canTransition } from "../utils/orderTransitions.js";

// Any logged-in role can place an order (matches real-world food-ordering
// UX -- unlike the guest-friendly Reservation flow, order history needs an
// account to attach to).
export const createOrder = async (req, res, next) => {
  try {
    const { branch, items } = req.body;

    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    if (menuItems.length !== new Set(menuItemIds).size) {
      return next(new ErrorHandler("One or more menu items not found", 400));
    }

    const menuItemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));
    let totalAmount = 0;

    // Price and name are always read from the database here -- the client
    // only ever sends a menuItemId + quantity, never a price. If a client
    // did send a price/totalAmount, the zod schema already stripped it
    // before this controller runs (unrecognized keys are dropped by
    // default). This is the one thing in this service worth getting right
    // above all else: never let the caller decide what something costs.
    const orderItems = items.map(({ menuItemId, quantity }) => {
      const menuItem = menuItemMap.get(menuItemId);
      if (!menuItem.isAvailable) {
        throw new ErrorHandler(`${menuItem.name} is currently unavailable`, 400);
      }
      if (menuItem.branches.length && !menuItem.branches.includes(branch)) {
        throw new ErrorHandler(`${menuItem.name} is not available at ${branch}`, 400);
      }
      // stock === null means unlimited/untracked -- only items with a real
      // stock count are checked and decremented.
      if (menuItem.stock !== null && menuItem.stock < quantity) {
        throw new ErrorHandler(`${menuItem.name} only has ${menuItem.stock} left in stock`, 400);
      }
      const lineTotal = menuItem.price * quantity;
      totalAmount += lineTotal;
      return { menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, quantity };
    });

    // Decrement stock after every line has passed validation above (so a
    // failure partway through the cart doesn't leave stock decremented for
    // only some items). Auto-flips isAvailable off once stock hits 0.
    for (const { menuItemId, quantity } of items) {
      const menuItem = menuItemMap.get(menuItemId);
      if (menuItem.stock === null) continue;
      const remaining = menuItem.stock - quantity;
      await MenuItem.updateOne(
        { _id: menuItem._id },
        { stock: remaining, isAvailable: remaining > 0 }
      );
    }

    const order = await Order.create({
      customerId: req.user.sub,
      customerEmail: req.user.email,
      branch,
      items: orderItems,
      totalAmount,
      status: "pending",
    });

    publishEvent("order.created", {
      orderId: order._id.toString(),
      // customerId is included so the Payment Service can enforce
      // "only the order's own customer can pay for it" locally, without
      // an extra synchronous call back to this service for every intent
      // creation request.
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      branch: order.branch,
      totalAmount: order.totalAmount,
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Customers see only their own orders; staff are scoped to their branch;
// admins see everything -- the same three-tier pattern as the Reservation
// Service's listReservations, kept consistent across services on purpose.
export const listOrders = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "customer") {
      filter.customerId = req.user.sub;
    } else if (req.user.role === "staff") {
      if (!req.user.branchId) {
        return next(new ErrorHandler("Staff account has no branch assigned", 403));
      }
      filter.branch = req.user.branchId;
    }

    const orders = await Order.find(filter).sort("-createdAt");
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (req.user.role === "customer" && order.customerId !== req.user.sub) {
      return next(new ErrorHandler("Not authorized to view this order", 403));
    }
    if (req.user.role === "staff" && order.branch !== req.user.branchId) {
      return next(new ErrorHandler("Not authorized to view this order", 403));
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status: nextStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (req.user.role === "staff" && order.branch !== req.user.branchId) {
      return next(new ErrorHandler("Not authorized to manage this order", 403));
    }

    if (!canTransition(order.status, nextStatus)) {
      return next(
        new ErrorHandler(`Cannot move order from "${order.status}" to "${nextStatus}"`, 400)
      );
    }

    order.status = nextStatus;
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};
