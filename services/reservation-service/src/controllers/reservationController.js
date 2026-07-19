import { Reservation } from "../models/reservation.js";
import { Branch } from "../models/branch.js";
import { ErrorHandler } from "../error/error.js";
import { publishEvent } from "../utils/publisher.js";

// Creating a reservation stays public/anonymous -- the current app has no
// customer accounts, and this phase doesn't add any, so this matches the
// existing UX rather than inventing a login requirement that didn't exist.
export const createReservation = async (req, res, next) => {
  try {
    const { branchId, ...rest } = req.body;

    const branch = await Branch.findById(branchId).catch(() => null);
    if (!branch) return next(new ErrorHandler("Branch not found", 400));

    const reservation = await Reservation.create({ ...rest, branch: branch._id });

    publishEvent("reservation.created", {
      reservationId: reservation._id.toString(),
      branch: branch.name,
      date: reservation.date,
      time: reservation.time,
      email: reservation.email,
    });

    res.status(201).json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
};

// Staff are scoped to their own branch; admins see everything. A staff
// JWT carries branchId as the branch NAME (see authenticate.js/Auth
// Service), which we resolve against this service's own Branch
// collection -- deliberately not a shared ObjectId across services.
export const listReservations = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === "staff") {
      if (!req.user.branchId) {
        return next(new ErrorHandler("Staff account has no branch assigned", 403));
      }
      const staffBranch = await Branch.findOne({ name: req.user.branchId });
      if (!staffBranch) return next(new ErrorHandler("Assigned branch not found", 403));
      filter.branch = staffBranch._id;
    }

    const reservations = await Reservation.find(filter)
      .populate("branch", "name address")
      .sort("-createdAt");

    res.status(200).json({ success: true, count: reservations.length, reservations });
  } catch (error) {
    next(error);
  }
};

export const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return next(new ErrorHandler("Reservation not found", 404));

    if (req.user.role === "staff") {
      if (!req.user.branchId) {
        return next(new ErrorHandler("Staff account has no branch assigned", 403));
      }
      const staffBranch = await Branch.findOne({ name: req.user.branchId });
      if (!staffBranch || String(reservation.branch) !== String(staffBranch._id)) {
        return next(new ErrorHandler("Not authorized to delete reservations for another branch", 403));
      }
    }

    await reservation.deleteOne();
    res.status(200).json({ success: true, message: "Reservation deleted" });
  } catch (error) {
    next(error);
  }
};
