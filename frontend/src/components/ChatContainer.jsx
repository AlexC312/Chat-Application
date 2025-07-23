import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import Linkify from "linkify-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const chatTarget = selectedUser || selectedGroup;
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const socket = useAuthStore((s) => s.socket);

  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!chatTarget) return;

    getMessages(chatTarget._id, chatTarget.isGroupChat);

    socket.on("typing:start", ({ from }) => {
      if (from === chatTarget._id) setIsTyping(true);
    });
    socket.on("typing:stop", ({ from }) => {
      if (from === chatTarget._id) setIsTyping(false);
    });
    subscribeToMessages(chatTarget._id, chatTarget.isGroupChat);

    return () => {
      unsubscribeFromMessages();
      socket.off("typing:start");
      socket.off("typing:stop");
    };
  }, [
    chatTarget?._id,
    chatTarget?.isGroupChat,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this message?"
    );
    if (!confirmed) return;

    try {
      await axiosInstance.patch(`/messages/delete/${messageId}`);
      await getMessages(chatTarget._id, chatTarget.isGroupChat);
    } catch (error) {
      toast.error("Failed to delete message.");
    }
  };

  if (isMessagesLoading || !chatTarget) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const { data } = await axiosInstance.get(
        `/messages/search/${chatTarget._id}?q=${encodeURIComponent(query)}`
      );
      setResults(data);
    } catch {
      toast.error("Search failed");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader onToggleSearch={() => setShowSearch((p) => !p)} />

      {showSearch && (
        <form onSubmit={handleSearch} className="p-2 flex gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            className="input input-sm flex-1"
          />
          <button className="btn btn-sm btn-primary">Go</button>
        </form>
      )}

      {results.length > 0 && (
        <div className="px-4 space-y-2 max-h-48 overflow-y-auto">
          {results.map((m) => (
            <div
              key={m._id}
              onClick={() => {
                const idx = messages.findIndex((x) => x._id === m._id);
                if (idx !== -1) {
                  document
                    .getElementById(m._id)
                    ?.scrollIntoView({ behavior: "smooth" });
                  setResults([]);
                  setShowSearch(false);
                }
              }}
              className="p-2 rounded hover:bg-base-300 cursor-pointer text-sm"
            >
              <span className="font-medium">
                {formatMessageTime(m.createdAt)}:
              </span>{" "}
              {m.text?.slice(0, 60)}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const senderId =
            typeof message.senderId === "object"
              ? message.senderId._id
              : message.senderId;

          const senderName =
            typeof message.senderId === "object"
              ? message.senderId.fullName
              : message.senderName;

          const senderPic =
            typeof message.senderId === "object"
              ? message.senderId.profilePic
              : message.senderProfilePic;

          const isOwnMessage = senderId === authUser._id;

          return (
            <div
              id={message._id}
              key={message._id}
              className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img src={senderPic || "/avatar.png"} alt="profile pic" />
                </div>
              </div>

              <div className="chat-header mb-1">
                {!isOwnMessage && (
                  <span className="font-semibold text-sm">{senderName}</span>
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div
                className={`chat-bubble flex flex-col rounded-2xl shadow-md text-left ${
                  isOwnMessage
                    ? "bg-primary text-primary-content"
                    : "bg-sky-100 text-black"
                }`}
              >
                {message.isDeleted ? (
                  <div className="italic text-sm text-zinc-400">
                    This message was deleted
                  </div>
                ) : (
                  <>
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="sm:max-w-[200px] rounded-md mb-2"
                      />
                    )}
                    {message.audio && (
                      <audio
                        controls
                        src={message.audio}
                        className="w-full mb-2"
                      />
                    )}
                    {message.text && (
                      <Linkify
                        options={{
                          target: "_blank",
                          className: "underline text-blue-500",
                          rel: "noopener noreferrer",
                        }}
                      >
                        {message.text}
                      </Linkify>
                    )}
                    {message.file && (
                      <>
                        {message.file.startsWith("data:video") ? (
                          <video
                            src={message.file}
                            controls
                            className="rounded-md sm:max-w-[200px] mb-2"
                          />
                        ) : (
                          <a
                            href={message.file}
                            download={message.fileName}
                            className="underline text-blue-600 text-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📄 {message.fileName}
                          </a>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {isOwnMessage && !message.isDeleted && (
                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="text-xs text-red-500 hover:underline self-end mt-1"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isTyping && (
        <div className="px-4 pb-2 text-sm text-zinc-500 flex items-center gap-2">
          <span className="animate-bounce">⋯</span>{" "}
          {(chatTarget?.fullName || chatTarget?.name) + " is typing…"}
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
