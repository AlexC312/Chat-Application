import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const createGroup = async (req, res) => {
  const { name, userIds } = req.body;
  const adminId = req.user._id;

  if (!name || !userIds || userIds.length < 1)
    return res.status(400).json({ message: "Group name and users required" });

  try {
    const uniqueUserIds = [...new Set([...userIds, adminId.toString()])];

    const group = await Group.create({
      name,
      users: uniqueUserIds,
      adminId,
    });

    const populated = await group.populate("users", "-password");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      users: req.user._id,
    }).populate("users", "-password");

    res.json(groups);
  } catch (err) {
    console.error("Error getting groups:", err);
    res.status(500).json({ message: "Failed to get groups" });
  }
};

export const sendGroupMessage = async (req, res) => {
  const { groupId } = req.params;
  const { text, image, audio, file, fileName } = req.body;
  const senderId = req.user._id;
  console.log("📨 Grup → POST /groups/:groupId/messages");
  console.log("params:", req.params);
  console.log("body:", req.body);
  console.log("user:", req.user);

  try {
    console.log("incoming group message");
    const message = await Message.create({
      senderId,
      groupId,
      text,
      image,
      audio,
      file,
      fileName,
    });

    const populated = await message.populate("senderId", "-password");

    const io = req.app.get("io");
    io.to(groupId).emit("groupMessage", populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error sending group message:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;

  try {
    const messages = await Message.find({ groupId })
      .populate("senderId", "-password")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error getting group messages:", err);
    res.status(500).json({ message: "Failed to get messages" });
  }
};

export const leaveGroup = async (req, res) => {
  const userId = req.user._id;
  const groupId = req.params.groupId;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.adminId.toString() === userId.toString();

    group.users = group.users.filter(
      (id) => id.toString() !== userId.toString()
    );

    if (isAdmin && group.users.length === 0) {
      await Message.deleteMany({ groupId });
      await Group.findByIdAndDelete(groupId);

      return res.status(200).json({ message: "Group deleted successfully" });
    }

    if (isAdmin && group.users.length > 0) {
      return res.status(400).json({
        message:
          "Transfer admin role to another member before leaving the group",
      });
    }

    await group.save();

    const userName = req.user.fullName || req.user.name;
    const systemMessage = await Message.create({
      groupId,
      text: `${userName} has left the group.`,
      senderId: userId,
    });

    const io = req.app.get("io");
    const populated = await systemMessage.populate("senderId", "-password");
    io.to(groupId).emit("groupMessage", populated);

    res.status(200).json({ message: "Left group" });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ message: "Failed to leave group" });
  }
};

export const addUserToGroup = async (req, res) => {
  const { groupId, userIdToAdd } = req.body;
  const adminId = req.user._id;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.adminId.toString() !== adminId.toString()) {
      return res.status(403).json({ message: "Only the admin can add users" });
    }

    if (group.users.includes(userIdToAdd)) {
      return res.status(400).json({ message: "User already in group" });
    }

    group.users.push(userIdToAdd);
    await group.save();

    const addedUser = await User.findById(userIdToAdd).select("-password");

    const message = await Message.create({
      groupId,
      senderId: adminId,
      text: `${addedUser.fullName || addedUser.name} was added to the group.`,
    });

    const io = req.app.get("io");
    const populatedMsg = await message.populate("senderId", "-password");
    io.to(groupId).emit("groupMessage", populatedMsg);

    res.status(200).json({ message: "User added to group", user: addedUser });
  } catch (err) {
    console.error("Error adding user to group:", err);
    res.status(500).json({ message: "Failed to add user" });
  }
};

export const removeUserFromGroup = async (req, res) => {
  const adminId = req.user._id;
  const { groupId, userIdToRemove } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.adminId.toString() !== adminId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can remove users" });
    }

    if (!group.users.includes(userIdToRemove)) {
      return res.status(400).json({ message: "User not in group" });
    }

    group.users = group.users.filter(
      (id) => id.toString() !== userIdToRemove.toString()
    );
    await group.save();

    const removedUser = await User.findById(userIdToRemove);
    const systemMessage = await Message.create({
      groupId,
      text: `${
        removedUser.fullName || removedUser.name
      } was removed from the group.`,
      senderId: adminId,
    });

    const io = req.app.get("io");
    const populated = await systemMessage.populate("senderId", "-password");
    io.to(groupId).emit("groupMessage", populated);

    res.status(200).json({ message: "User removed from group" });
  } catch (err) {
    console.error("Error removing user:", err);
    res.status(500).json({ message: "Failed to remove user" });
  }
};

export const deleteGroup = async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.adminId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the admin can delete the group" });
    }

    await Message.deleteMany({ groupId });

    await Group.findByIdAndDelete(groupId);

    const io = req.app.get("io");
    io.to(groupId).emit("groupDeleted", { groupId });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ message: "Failed to delete group" });
  }
};
