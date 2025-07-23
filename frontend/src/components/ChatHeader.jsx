import { X, Phone, Search, Users2, LogOut } from "lucide-react";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";

import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import { axiosInstance } from "../lib/axios";
import GroupMembersModal from "./GroupMembersModal";

const ChatHeader = ({ onToggleSearch = () => {} }) => {
  const {
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    getGroups,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [isSendingCall, setIsSendingCall] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const sendMessage = useChatStore((s) => s.sendMessage);

  const chatTarget = selectedUser || selectedGroup;

  const isGroup = Boolean(selectedGroup);

  const handleStartCall = async () => {
    if (!selectedUser) return;

    setIsSendingCall(true);
    const roomId = uuid();

    await sendMessage({
      text: `🔗 Join video call: ${window.location.origin}/call/${roomId}`,
    });

    window.open(`/call/${roomId}`, "_blank");
    setIsSendingCall(false);
  };

  const handleLeaveGroup = async () => {
    try {
      await axiosInstance.patch("/groups/leave", {
        groupId: selectedGroup._id,
      });
      toast.success("You left the group");
      setSelectedGroup(null);
      await getGroups();
    } catch {
      toast.error("Failed to leave group");
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={
                  isGroup
                    ? "/group-avatar.png"
                    : chatTarget?.profilePic || "/avatar.png"
                }
                alt={isGroup ? chatTarget.name : chatTarget.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">
              {isGroup ? chatTarget.name : chatTarget.fullName}
            </h3>
            {!isGroup && (
              <p className="text-sm text-base-content/70">
                {onlineUsers.includes(chatTarget._id) ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Start Call (only for private chats) */}
          {!isGroup && (
            <button
              onClick={handleStartCall}
              disabled={!onlineUsers.includes(chatTarget._id) || isSendingCall}
              className="btn btn-ghost btn-sm"
              title="Start video call"
            >
              <Phone className="w-5 h-5" />
            </button>
          )}

          {/* Search Button */}
          <button
            onClick={onToggleSearch}
            className="btn btn-ghost btn-sm"
            title="Search in chat"
          >
            <Search size={18} />
          </button>

          {/* View Members + Leave (only for groups) */}
          {isGroup && (
            <>
              <button
                onClick={() => setShowMembersModal(true)}
                className="btn btn-xs btn-ghost"
                title="View members"
              >
                <Users2 size={16} />
              </button>

              <button
                onClick={handleLeaveGroup}
                className="btn btn-xs btn-error"
                title="Leave group"
              >
                <LogOut size={16} />
              </button>
            </>
          )}

          {selectedGroup && authUser._id === selectedGroup.adminId && (
            <button
              className="btn btn-sm btn-error ml-2"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Are you sure you want to delete this group?"
                );
                if (!confirmed) return;

                try {
                  await axiosInstance.delete(`/groups/${selectedGroup._id}`);
                  toast.success("Group deleted");
                  setSelectedGroup(null);
                  await getGroups();
                } catch (err) {
                  toast.error(
                    err.response?.data?.message || "Failed to delete group"
                  );
                }
              }}
            >
              Delete Group
            </button>
          )}

          {/* Close Chat */}
          <button
            onClick={() => {
              setSelectedUser(null);
              setSelectedGroup(null);
            }}
            title="Close chat"
            className="btn btn-sm btn-ghost"
          >
            <X />
          </button>
        </div>
      </div>

      {/* Group Members Modal */}
      {showMembersModal && (
        <GroupMembersModal onClose={() => setShowMembersModal(false)} />
      )}
    </div>
  );
};

export default ChatHeader;
