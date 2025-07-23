import express from "express";
import {
  createGroup,
  getMyGroups,
  sendGroupMessage,
  getGroupMessages,
  leaveGroup,
  removeUserFromGroup,
  deleteGroup,
  addUserToGroup,
} from "../controllers/group.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);

router.get("/", protectRoute, getMyGroups);

router.post("/:groupId/messages", protectRoute, sendGroupMessage);
router.get("/:groupId/messages", protectRoute, getGroupMessages);

router.patch("/:groupId/leave", protectRoute, leaveGroup);

router.patch("/add-user", protectRoute, addUserToGroup);
router.patch("/remove-user", protectRoute, removeUserFromGroup);

router.delete("/:groupId", protectRoute, deleteGroup);

export default router;
