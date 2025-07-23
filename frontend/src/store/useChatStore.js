import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false,

  // USERS
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // GROUPS
  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async ({ name, users }) => {
    const payload = {
      name,
      userIds: users,
    };
    console.log("Payload corect:", payload);

    try {
      const res = await axiosInstance.post("/groups", payload);
      set((state) => ({
        groups: [...state.groups, res.data],
      }));
      toast.success("Group created");
    } catch (error) {
      console.error("createGroup error:", error);
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.patch(`/groups/${groupId}/leave`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: null,
        messages: [],
      }));
      toast.success("You left the group");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not leave group");
    }
  },

  removeGroup: (groupId) =>
    set((state) => ({
      groups: state.groups.filter((g) => g._id !== groupId),
      selectedGroup:
        state.selectedGroup && state.selectedGroup._id === groupId
          ? null
          : state.selectedGroup,
    })),

  getMessages: async (chatId, isGroupChat = false) => {
    set({ isMessagesLoading: true });
    try {
      const url = isGroupChat
        ? `/groups/${chatId}/messages`
        : `/messages/${chatId}`;
      const res = await axiosInstance.get(url);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages } = get();

    try {
      let res;
      if (selectedUser) {
        res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`,
          messageData
        );
      } else if (selectedGroup) {
        res = await axiosInstance.post(
          `/groups/${selectedGroup._id}/messages`,
          messageData
        );
      } else {
        throw new Error("No recipient selected");
      }

      set({ messages: [...messages, res.data] });
    } catch (error) {
      console.error("SendMessage Error:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: (chatId, isGroupChat = false) => {
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      if (!isGroupChat && newMessage.senderId !== chatId) return;
      if (isGroupChat && newMessage.groupId !== chatId) return;

      set({ messages: [...get().messages, newMessage] });
    });

    socket.on("groupMessage", (newMessage) => {
      if (isGroupChat && newMessage.groupId === chatId) {
        set({ messages: [...get().messages, newMessage] });
      }
    });
    socket.on("groupDeleted", ({ groupId }) => {
      get().removeGroup(groupId);
      toast("A group has been deleted.");
    });

    socket.on("groupMessageDeleted", ({ messageId, groupId }) => {
      if (!isGroupChat || groupId !== chatId) return;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeleted: true, text: "" } : msg
        ),
      }));
    });

    socket.on("privateMessageDeleted", ({ messageId }) => {
      if (isGroupChat) return;
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, isDeleted: true, text: "" } : msg
        ),
      }));
    });

    socket.emit("join-room", { roomId: chatId });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (user) =>
    set({ selectedUser: user, selectedGroup: null, messages: [] }),
  setSelectedGroup: (group) =>
    set({ selectedGroup: group, selectedUser: null, messages: [] }),
}));
