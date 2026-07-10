import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Image, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { formatRelative } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Chat() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const { joinMatch, leaveMatch, emitTyping, emitStopTyping, on, off } = useSocket();

  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  // Load match list
  useEffect(() => {
    api.get('/matches').then(({ data }) => {
      const accepted = (data.matches ?? []).filter((m) => m.status === 'accepted');
      setMatches(accepted);
      if (matchId) {
        const found = accepted.find((m) => m._id === matchId);
        if (found) selectMatch(found);
      } else if (accepted.length > 0) {
        selectMatch(accepted[0]);
      }
    });
  }, []);

  const selectMatch = (match) => {
    if (activeMatch?._id === match._id) return;
    if (activeMatch) leaveMatch(activeMatch._id);
    setActiveMatch(match);
    joinMatch(match._id);
    loadMessages(match._id);
  };

  const loadMessages = async (mId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/messages/${mId}`);
      setMessages(data.messages ?? []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  // Socket events
  useEffect(() => {
    const handleNewMsg = (msg) => {
      if (msg.matchId === activeMatch?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    const handleTyping = () => setOtherTyping(true);
    const handleStopTyping = () => setOtherTyping(false);

    on('new_message', handleNewMsg);
    on('user_typing', handleTyping);
    on('user_stopped_typing', handleStopTyping);

    return () => {
      off('new_message', handleNewMsg);
      off('user_typing', handleTyping);
      off('user_stopped_typing', handleStopTyping);
    };
  }, [activeMatch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (activeMatch) {
      emitTyping(activeMatch._id);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitStopTyping(activeMatch._id), 1500);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeMatch) return;
    setSending(true);
    try {
      const { data } = await api.post(`/messages/${activeMatch._id}`, { content: text.trim() });
      setMessages((prev) => [...prev, data.message]);
      setText('');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handlePhotoSend = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeMatch) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const { data } = await api.post(`/messages/${activeMatch._id}`, fd);
      setMessages((prev) => [...prev, data.message]);
    } catch (_) {
      toast.error('Erreur lors de l\'envoi de la photo');
    }
  };

  const getOtherUser = (match) => {
    if (!user) return null;
    return match.userLost?._id === user._id ? match.userFound : match.userLost;
  };

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-6xl mx-auto w-full flex h-[calc(100svh-4rem-5rem)] md:h-[calc(100svh-4rem)]">
      {/* Sidebar: Match list */}
      <div className={`${activeMatch ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-slate-800`}>
        <div className="px-4 py-4 border-b border-slate-800">
          <h1 className="font-bold text-slate-100">Conversations</h1>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-10 text-slate-500">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm">Aucune conversation active</p>
              <p className="text-xs mt-1">Acceptez un match pour démarrer</p>
              <Link to="/matches" className="btn-primary text-sm mt-4 py-2">Voir mes matches</Link>
            </div>
          ) : (
            matches.map((match) => {
              const other = getOtherUser(match);
              return (
                <button key={match._id} onClick={() => selectMatch(match)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors text-left ${
                    activeMatch?._id === match._id ? 'bg-slate-800 border-r-2 border-primary-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {other?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-200 truncate">{other?.name ?? 'Utilisateur'}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {match.itemLost?.title ?? ''}
                    </div>
                  </div>
                  <div className="text-xs text-primary-400 font-semibold shrink-0">{match.score}%</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeMatch ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
            <button onClick={() => setActiveMatch(null)} className="md:hidden text-slate-500 hover:text-slate-300">
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
              {getOtherUser(activeMatch)?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-200">{getOtherUser(activeMatch)?.name ?? 'Utilisateur'}</div>
              <div className="text-xs text-slate-500">Score : {activeMatch.score}%</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-primary-500" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center">
                <div className="text-4xl mb-3">👋</div>
                <p className="text-sm">Dites bonjour !</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?._id || msg.senderId?._id === user?._id;
                return (
                  <motion.div key={msg._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe ? 'bg-primary-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-200 rounded-bl-md'
                    }`}>
                      {msg.photo && <img src={`/${msg.photo}`} alt="photo" className="rounded-xl mb-2 max-w-full" />}
                      {msg.content && <p className="break-words">{msg.content}</p>}
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-primary-200' : 'text-slate-500'}`}>
                        {formatRelative(msg.createdAt)}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* Typing indicator */}
            <AnimatePresence>
              {otherTyping && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex gap-1.5 items-center px-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/50">
            <label className="text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
              <Image size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSend} />
            </label>
            <input
              id="chat-input"
              type="text"
              className="flex-1 input-field py-2.5 text-sm"
              placeholder="Écrivez un message…"
              value={text}
              onChange={handleTextChange}
            />
            <button type="submit" disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-slate-500 flex-col gap-3">
          <div className="text-5xl">💬</div>
          <p>Sélectionnez une conversation</p>
        </div>
      )}
    </div>
  );
}
