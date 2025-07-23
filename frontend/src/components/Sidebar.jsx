import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, PlusCircle, UsersRound } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal"; // vom crea acest component imediat

const Sidebar = () => {
  const {
    getUsers,
    getGroups,
    users,
    groups,
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    isUsersLoading,
    isGroupsLoading,
    getMessages,
    subscribeToMessages,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
  }, []);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Toggle online only */}
        <div className="hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>

        {/* Create Group */}
        <button
          className="btn btn-sm w-full justify-start gap-2 text-sm"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle className="size-4" />
          Create Group
        </button>
      </div>

      {/* USERS */}
      <div className="overflow-y-auto flex-1">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            disabled={user._id === authUser._id}
            className={`w-full p-3 flex items-center gap-3 hover:bg-base-200 transition-colors
              ${
                selectedUser?._id === user._id
                  ? "bg-base-300 ring-1 ring-base-300"
                  : ""
              }`}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full ring-1 ring-base-300"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-white" />
              )}
            </div>

            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {/* GROUPS */}
        {groups.length > 0 && (
          <div className="px-5 py-3">
            <div className="text-sm font-semibold text-zinc-500 mb-2">
              Groups
            </div>
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => {
                    setSelectedGroup(group);
                    getMessages(group._id, true);
                    subscribeToMessages(group._id, true);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors
                    ${
                      selectedGroup?._id === group._id
                        ? "bg-base-300 ring-1 ring-base-300"
                        : "hover:bg-base-200"
                    }`}
                >
                  <UsersRound className="size-5" />
                  <span className="text-sm truncate">{group.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && <CreateGroupModal onClose={() => setShowModal(false)} />}
    </aside>
  );
};

export default Sidebar;
