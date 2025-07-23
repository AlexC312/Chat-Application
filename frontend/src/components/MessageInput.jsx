import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Mic, StopCircle, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import debounce from "lodash.debounce";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sharingLoc, setSharingLoc] = useState(false);
  const mediaRecorderRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputRef2 = useRef(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const { sendMessage, selectedUser, selectedGroup } = useChatStore();

  const socket = useAuthStore((s) => s.socket);
  const typing = useRef(false);

  useEffect(() => {
    if (!isRecording) return;
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        const audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          setAudioBlob(audioBlob);
        };

        mediaRecorder.start();
      } catch (err) {
        toast.error("Microphone access denied");
        setIsRecording(false);
      }
    };

    startRecording();
  }, [isRecording]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stopTyping = debounce(() => {
    typing.current = false;
    socket.emit("typing:stop", {
      to: selectedUser?._id || selectedGroup?._id,
    });
  }, 1200);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !audioBlob && !file) return;

    try {
      let audioBase64 = null;
      if (audioBlob) {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        await new Promise((resolve) => {
          reader.onloadend = () => {
            audioBase64 = reader.result;
            resolve();
          };
        });
      }

      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        audio: audioBase64,
        file,
        fileName,
      });

      setText("");
      setImagePreview(null);
      setAudioBlob(null);
      setFile(null);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setSharingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await sendMessage({
            text: `📍 My location: https://www.google.com/maps?q=${latitude},${longitude}`,
          });
        } catch {
          toast.error("Failed to share location");
        } finally {
          setSharingLoc(false);
        }
      },
      () => {
        toast.error("Permission denied");
        setSharingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFile(reader.result);
      setFileName(selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="p-4 w-full bg-base-100/90 shadow-inner border-t border-base-300">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center shadow-md"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {audioBlob && (
        <div className="mb-3">
          <audio
            controls
            src={URL.createObjectURL(audioBlob)}
            className="w-full"
          />
        </div>
      )}

      {file && (
        <div className="mb-3 flex items-center gap-2 bg-base-200 p-2 rounded-lg">
          <span className="text-sm text-zinc-200 truncate max-w-xs">
            {fileName}
          </span>
          <button
            onClick={() => {
              setFile(null);
              setFileName("");
              if (fileInputRef2.current) fileInputRef2.current.value = "";
            }}
            className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center shadow-md"
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-full input-sm sm:input-md focus:ring-2 focus:ring-primary/50"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!typing.current) {
                typing.current = true;
                socket.emit("typing:start", {
                  to: selectedUser?._id || selectedGroup?._id,
                });
              }
              stopTyping();
            }}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle hover:scale-105 transition-transform shadow ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>

        <input
          type="file"
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef2}
        />

        <button
          type="button"
          className="btn btn-sm btn-circle text-zinc-400"
          title="Attach file"
          onClick={() => fileInputRef2.current?.click()}
        >
          📎
        </button>

        <button
          type="button"
          className={`btn btn-sm btn-circle mr-1 ${
            isRecording ? "btn-error" : "btn-ghost"
          }`}
          onClick={() => {
            if (isRecording) {
              mediaRecorderRef.current?.stop();
              setIsRecording(false);
            } else {
              setAudioBlob(null);
              setIsRecording(true);
            }
          }}
        >
          {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          className="btn btn-sm btn-circle"
          onClick={handleShareLocation}
          disabled={sharingLoc}
          title="Share location"
        >
          <MapPin size={18} />
        </button>

        <button
          type="submit"
          className="btn btn-primary btn-sm rounded-full px-5 hover:scale-105 transition-transform shadow"
          disabled={!text.trim() && !imagePreview && !audioBlob && !file}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
