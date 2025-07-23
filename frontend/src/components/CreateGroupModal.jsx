import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useChatStore();
  const { authUser } = useAuthStore();
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUsers((prev) => [...prev, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (selectedUsers.length < 1) {
      toast.error("Select at least one other member");
      return;
    }

    await createGroup({
      name: groupName,
      users: [...selectedUsers, authUser._id],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-base-content/70 hover:text-base-content"
        >
          <X />
        </button>

        <h2 className="text-xl font-semibold mb-4">Create Group</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Group name"
            className="input input-bordered w-full"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users
              .filter((u) => u._id !== authUser._id)
              .map((user) => (
                <label key={user._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => toggleUser(user._id)}
                  />
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt=""
                    className="size-6 rounded-full ring"
                  />
                  <span>{user.fullName}</span>
                </label>
              ))}
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
