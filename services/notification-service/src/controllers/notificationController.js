import { NotificationLog } from "../models/notificationLog.js";

// Read-only, staff/admin-only. This service otherwise "never being called
// synchronously" (per the Notion design doc) is about not being a
// dependency in anyone's request path -- this endpoint is purely an
// observability/demo aid for verifying what fired without grepping
// container logs, not something any other service calls.
export const listNotifications = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};

    const notifications = await NotificationLog.find(filter).sort("-createdAt").limit(100);
    res.status(200).json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};
