import { Reservation } from "../models/reservation.js";
import { Branch } from "../models/branch.js";
import { ErrorHandler } from "../error/error.js";
import { publishEvent } from "../utils/publisher.js";

// Reservations now require a signed-in account (previously public/
// anonymous) -- matches the same "must be logged in" gate as placing an
// order, and is what makes "see my upcoming reservation" possible at all.
export const createReservation = async (req, res, next) => {
  try {
    const { branchId, ...rest } = req.body;

    const branch = await Branch.findById(branchId).catch(() => null);
    if (!branch) return next(new ErrorHandler("Branch not found", 400));

    // Branches seeded before availableSeats existed fall back to capacity
    // rather than treating a missing field as "0 seats left".
    const seatsLeft = branch.availableSeats ?? branch.capacity;
    if (seatsLeft < rest.guests) {
      return next(
        new ErrorHandler(`Only ${seatsLeft} seat(s) left at ${branch.name} for now -- try a different time or branch`, 400)
      );
    }

    const reservation = await Reservation.create({ ...rest, branch: branch._id, customerId: req.user.sub });
    branch.availableSeats = seatsLeft - rest.guests;
    await branch.save();

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

// Powers the homepage's floating reservation reminder -- any signed-in
// customer can see their own bookings, no role restriction (unlike
// listReservations, which is the staff/admin management view).
export const listMyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ customerId: req.user.sub })
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

    // Restore the seats this reservation was holding. Best-effort: if the
    // branch was somehow removed, the reservation is still deleted -- there's
    // nothing left to restore seats on.
    const branch = await Branch.findById(reservation.branch);
    if (branch) {
      branch.availableSeats = Math.min(branch.capacity, (branch.availableSeats ?? branch.capacity) + reservation.guests);
      await branch.save();
    }

    res.status(200).json({ success: true, message: "Reservation deleted" });
  } catch (error) {
    next(error);
  }
};
