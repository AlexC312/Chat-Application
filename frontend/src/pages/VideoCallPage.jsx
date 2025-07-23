import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  Copy,
  Mic,
  MicOff,
  PhoneOff,
  Link as LinkIcon,
  Video,
  VideoOff,
  Monitor,
} from "lucide-react";

export default function VideoCallPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useAuthStore((s) => s.socket);

  const pcRef = useRef(null);
  const localV = useRef(null);
  const remoteV = useRef(null);
  const queuedICE = useRef([]);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [sharing, setSharing] = useState(false);

  const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  const createPC = () => {
    const pc = new RTCPeerConnection(cfg);

    pc.onicecandidate = (e) => {
      e.candidate &&
        socket.emit("webrtc:ice", { roomId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      remoteV.current.srcObject = e.streams[0];
      setInCall(true);
    };

    return pc;
  };

  const attachQueuedICE = async () => {
    for (const cand of queuedICE.current) {
      await pcRef.current.addIceCandidate(cand);
    }
    queuedICE.current = [];
  };

  /* lifecycle */
  useEffect(() => {
    if (!socket) return;

    const join = async () => {
      socket.emit("join-room", { roomId });

      socket.on("peer:joined", async () => {
        pcRef.current = createPC();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localV.current.srcObject = stream;
        stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));

        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit("webrtc:offer", { roomId, offer });
      });

      socket.on("webrtc:offer", async ({ offer }) => {
        pcRef.current = createPC();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localV.current.srcObject = stream;
        stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));

        await pcRef.current.setRemoteDescription(offer);
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit("webrtc:answer", { roomId, answer });
        await attachQueuedICE();
      });

      socket.on("webrtc:answer", async ({ answer }) => {
        if (pcRef.current.signalingState === "have-local-offer") {
          await pcRef.current.setRemoteDescription(answer);
          await attachQueuedICE();
        }
      });

      socket.on("webrtc:ice", async ({ candidate }) => {
        if (!pcRef.current || !pcRef.current.remoteDescription) {
          queuedICE.current.push(candidate);
        } else {
          await pcRef.current.addIceCandidate(candidate);
        }
      });

      socket.on("webrtc:end", () => {
        pcRef.current?.close();
        navigate("/");
      });
    };

    join();

    return () => {
      socket.off("peer:joined");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice");
      socket.off("webrtc:end");
      pcRef.current?.close();
    };
  }, [socket, roomId]);

  /* ui controls */
  const toggleMute = () => {
    const stream = localV.current.srcObject;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted(!muted);
  };

  const toggleCam = () => {
    const stream = localV.current.srcObject;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff(!camOff);
  };

  const toggleShareScreen = async () => {
    if (!sharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];

        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track.kind === "video");
        await sender.replaceTrack(screenTrack);

        localV.current.srcObject = displayStream;
        setSharing(true);

        screenTrack.onended = async () => {
          await sender.replaceTrack(
            await navigator.mediaDevices
              .getUserMedia({ video: true })
              .then((s) => s.getVideoTracks()[0])
          );
          localV.current.srcObject = null;
          setSharing(false);
        };
      } catch {}
    } else {
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track.kind === "video");
      const camTrack = await navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => s.getVideoTracks()[0]);
      await sender.replaceTrack(camTrack);
      localV.current.srcObject = null;
      setSharing(false);
    }
  };

  const endCall = () => {
    socket.emit("webrtc:end", { roomId });
    pcRef.current?.close();
    navigate("/"); // HomePage
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-base-200 gap-4">
      {!inCall && <p className="text-lg">Waiting for peer…</p>}

      <div className="flex gap-6 mb-6 justify-center items-center">
        <div className="flex flex-col items-center">
          <video
            ref={localV}
            autoPlay
            muted
            playsInline
            className="w-[480px] h-[360px] rounded-xl border shadow object-cover bg-black"
          />
          <span className="mt-2 text-sm text-center text-base-content/70">
            You
          </span>
        </div>

        <div className="flex flex-col items-center">
          <video
            ref={remoteV}
            autoPlay
            playsInline
            className="w-[480px] h-[360px] rounded-xl border shadow object-cover bg-black"
          />
          <span className="mt-2 text-sm text-center text-base-content/70">
            Peer
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={copyLink} className="btn btn-sm">
          <LinkIcon size={18} /> Copy link
        </button>

        <button onClick={toggleMute} className="btn btn-sm">
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button onClick={toggleCam} className="btn btn-sm">
          {camOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        <button onClick={toggleShareScreen} className="btn btn-sm">
          <Monitor size={18} /> {sharing ? "Stop share" : "Share"}
        </button>

        <button onClick={endCall} className="btn btn-sm btn-error">
          <PhoneOff size={18} /> End
        </button>
      </div>
    </div>
  );
}
