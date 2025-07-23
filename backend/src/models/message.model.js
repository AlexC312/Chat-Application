import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    text: { type: String },
    image: { type: String },
    file: String,
    fileName: String,
    isDeleted: { type: Boolean, default: false },
    audio: {
      type: String,
    },
  },

  { timestamps: true }
);

messageSchema.index({ text: "text" });

const Message = mongoose.model("Message", messageSchema);

export default Message;
