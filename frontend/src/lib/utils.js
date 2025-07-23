export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const today = new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const day = isSameDay
    ? "Today"
    : date.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  return `${day} at ${time}`;
};
