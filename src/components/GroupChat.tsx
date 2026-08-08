import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Video, VideoOff, Mic, MicOff, MessageSquare, Send, XCircle, Users } from 'lucide-react';

interface GroupChatProps {
  socket: Socket | null;
  roomId: string;
  onLeave: () => void;
}

interface GroupMessage {
  userId: string;
  text: string;
  isSelf: boolean;
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function GroupChat({ socket, roomId, onLeave }: GroupChatProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [usersInRoom, setUsersInRoom] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_group', roomId);

    socket.on('group_joined', ({ users }) => {
      setUsersInRoom(users);
      setMessages(prev => [...prev, { userId: 'System', text: 'You joined the room.', isSelf: false }]);
    });

    socket.on('user_joined_group', ({ userId }) => {
      setUsersInRoom(prev => [...prev, userId]);
      setMessages(prev => [...prev, { userId: 'System', text: `User joined the room.`, isSelf: false }]);
    });

    socket.on('user_left_group', ({ userId }) => {
      setUsersInRoom(prev => prev.filter(id => id !== userId));
      setMessages(prev => [...prev, { userId: 'System', text: `User left the room.`, isSelf: false }]);
      
      // Cleanup peer connection
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on('group_text_message', ({ userId, message }) => {
      setMessages(prev => [...prev, { userId, text: message, isSelf: false }]);
    });

    // Handle incoming WebRTC offers
    socket.on('group_webrtc_offer', async ({ sender, sdp }) => {
      try {
        let pc = peersRef.current[sender];
        if (!pc) {
          pc = createPeerConnection(sender);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('group_webrtc_answer', { target: sender, sdp: pc.localDescription });
      } catch (err) {
        console.error('Error handling group offer:', err);
      }
    });

    socket.on('group_webrtc_answer', async ({ sender, sdp }) => {
      try {
        const pc = peersRef.current[sender];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } catch (err) {
        console.error('Error handling group answer:', err);
      }
    });

    socket.on('group_webrtc_ice_candidate', async ({ sender, candidate }) => {
      try {
        const pc = peersRef.current[sender];
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding group ICE candidate:', err);
      }
    });

    return () => {
      socket.off('group_joined');
      socket.off('user_joined_group');
      socket.off('user_left_group');
      socket.off('group_text_message');
      socket.off('group_webrtc_offer');
      socket.off('group_webrtc_answer');
      socket.off('group_webrtc_ice_candidate');
      
      socket.emit('leave_group', roomId);
      Object.keys(peersRef.current).forEach(key => {
        peersRef.current[key].close();
      });
      peersRef.current = {};
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, roomId]);

  const createPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection(configuration);
    peersRef.current[targetUserId] = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('group_webrtc_ice_candidate', { target: targetUserId, candidate: event.candidate });
      }
    };

    return pc;
  };

  const toggleVideo = async () => {
    if (!isVideoOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsVideoOn(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Send offers to all users currently in room
        usersInRoom.forEach(async (targetUserId) => {
          const pc = createPeerConnection(targetUserId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('group_webrtc_offer', { target: targetUserId, sdp: pc.localDescription });
        });
      } catch (err) {
        console.error('Error accessing media', err);
        alert('Could not access camera/microphone.');
      }
    } else {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setIsVideoOn(false);
        // We'd need to renegotiate or just stop tracks. Let's keep it simple by stopping.
        // Other peers will detect track ended.
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    socket?.emit('group_text_message', { room: roomId, message: chatInput });
    setMessages(prev => [...prev, { userId: 'Me', text: chatInput, isSelf: true }]);
    setChatInput('');
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-transparent">
      
      {/* Video Area (Left) */}
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 h-1/2 md:h-full relative overflow-y-auto">
        
        {/* Top Bar inside Group */}
        <div className="bg-white/65 backdrop-blur-[16px] px-6 py-4 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] flex items-center justify-between border border-white/40 flex-none">
          <div>
            <h2 className="text-xl font-bold text-[#141414] capitalize">#{roomId}</h2>
            <div className="flex items-center gap-1 text-[#687173] text-sm mt-1">
              <Users className="w-4 h-4" />
              <span>{usersInRoom.length + 1} online</span>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-gray-100 text-[#141414] rounded-full hover:bg-gray-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <XCircle className="w-4 h-4" />
            Leave Room
          </button>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          
          {/* Local User */}
          <div className="relative aspect-video bg-black rounded-[16px] overflow-hidden shadow-md flex items-center justify-center group">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <VideoOff className="w-8 h-8 mb-2" />
                <span className="text-sm">You (Lurking)</span>
              </div>
            )}
            
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10">
              You
            </div>
            
            {/* Controls overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
               <button
                  onClick={toggleVideo}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    !isVideoOn ? 'bg-[#0079C1] text-white hover:bg-[#005a91]' : 'bg-[#D9364F] text-white hover:bg-[#b02a3d]'
                  }`}
                  title={!isVideoOn ? "Turn On Camera" : "Turn Off Camera"}
                >
                  {!isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                {isVideoOn && (
                  <button
                    onClick={toggleMute}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isMuted ? 'bg-[#D9364F] text-white' : 'bg-white text-[#141414]'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
            </div>
          </div>

          {/* Remote Users */}
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            <div key={userId} className="relative aspect-video bg-black rounded-[16px] overflow-hidden shadow-md">
               <video
                  autoPlay
                  playsInline
                  ref={el => {
                    if (el) el.srcObject = stream;
                  }}
                  className="w-full h-full object-cover"
                />
               <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10">
                  User
               </div>
            </div>
          ))}

          {/* Placeholders for other lurkers */}
          {usersInRoom.filter(id => !remoteStreams[id]).map(userId => (
            <div key={userId} className="relative aspect-video bg-gray-200 rounded-[16px] overflow-hidden shadow-sm border border-gray-300 flex items-center justify-center">
                <div className="text-[#687173] flex flex-col items-center">
                  <VideoOff className="w-6 h-6 mb-2 opacity-50" />
                  <span className="text-xs">Lurking</span>
                </div>
            </div>
          ))}

        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="w-full md:w-[380px] bg-white/65 backdrop-blur-[20px] border-t md:border-t-0 md:border-l border-white/40 flex flex-col h-1/2 md:h-full z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
        <div className="p-4 border-b border-white/40 flex items-center gap-3">
           <div className="p-2 bg-[#F5F7FA] rounded-full">
              <MessageSquare className="w-5 h-5 text-[#003087]" />
            </div>
            <h3 className="font-bold text-[#141414]">Group Chat</h3>
        </div>

        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F7FA]/30">
           {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#687173] opacity-60">
                <MessageSquare className="w-12 h-12 mb-3 text-[#0079C1]/40" />
                <p className="text-sm font-medium">Say hi to everyone!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.isSelf ? 'items-end' : msg.userId === 'System' ? 'items-center' : 'items-start'}`}>
                  {msg.userId !== 'System' && !msg.isSelf && <span className="text-[10px] text-[#687173] mb-1 ml-1">{msg.userId.substring(0, 5)}</span>}
                  <div 
                    className={`max-w-[85%] rounded-[18px] px-4 py-2.5 text-sm ${
                      msg.userId === 'System' 
                        ? 'bg-transparent text-[#687173] text-xs font-medium border border-gray-200 !rounded-full py-1' 
                        : msg.isSelf 
                        ? 'bg-[#0079C1] text-white rounded-br-sm shadow-sm' 
                        : 'bg-white text-[#141414] rounded-bl-sm border border-gray-100 shadow-sm'
                    }`}
                    style={{ lineHeight: '1.4' }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
        </div>

        <div className="p-4 bg-white/40 backdrop-blur-md border-t border-white/40">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat in room..."
              className="flex-1 bg-white/50 border border-white/40 rounded-full px-5 py-3 text-sm text-[#141414] focus:outline-none focus:bg-white/90 focus:border-[#0079C1] focus:ring-4 focus:ring-[#0079C1]/15 transition-all placeholder:text-[#687173]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-3 rounded-full bg-[#0079C1] text-white hover:bg-[#005a91] disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-md active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
