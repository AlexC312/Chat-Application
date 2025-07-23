import { X, Trash2, UserPlus } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const GroupMembersModal = ({ onClose }) => {
  const { selectedGroup, getGroups, getMessages } = useChatStore();
  const { authUser } = useAuthStore();
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const { data } = await axiosInstance.get("/auth/users");
        const currentUserIds = selectedGroup.users.map((u) => u._id);
        const filtered = data.filter((u) => !currentUserIds.includes(u._id));
        setAvailableUsers(filtered);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    if (authUser._id === selectedGroup.adminId) {
      fetchAvailableUsers();
    }
  }, [selectedGroup, authUser]);

  const handleRemoveUser = async (userIdToRemove) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this user?"
    );
    if (!confirmed) return;

    try {
      await axiosInstance.patch("/groups/remove-user", {
        groupId: selectedGroup._id,
        userIdToRemove,
      });

      toast.success("User removed");
      await getGroups();
      await getMessages(selectedGroup._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove user");
    }
  };

  const handleAddUser = async (userIdToAdd) => {
    try {
      await axiosInstance.patch("/groups/add-user", {
        groupId: selectedGroup._id,
        userIdToAdd,
      });

      toast.success("User added");
      await getGroups();
      await getMessages(selectedGroup._id, true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add user");
    }
  };

  const uniqueMembers = Array.from(
    new Map(selectedGroup.users.map((u) => [u._id, u])).values()
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-base-content/70 hover:text-base-content"
        >
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-2">Group Members</h2>

        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {uniqueMembers.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between border-b py-2"
            >
              <div className="flex items-center gap-3">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt=""
                  className="size-8 rounded-full ring"
                />
                <span>{user.fullName}</span>
                {user._id === selectedGroup.adminId && (
                  <span className="text-xs text-primary font-medium ml-2">
                    (Admin)
                  </span>
                )}
              </div>

              {authUser._id === selectedGroup.adminId &&
                user._id !== authUser._id && (
                  <button
                    className="btn btn-xs btn-error"
                    onClick={() => handleRemoveUser(user._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
            </div>
          ))}
        </div>

        {authUser._id === selectedGroup.adminId &&
          availableUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Add Users</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between border-b py-2"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt=""
                        className="size-8 rounded-full ring"
                      />
                      <span>{user.fullName}</span>
                    </div>

                    <button
                      className="btn btn-xs btn-success"
                      onClick={() => handleAddUser(user._id)}
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default GroupMembersModal;
