// src/components/PlayerBar.jsx
import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, Heart, Shuffle, Repeat } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/timeUtils';

const PlayerBar = ({ onExpand }) => {
  const { 
    isPlaying, currentTrack, volume, setVolume, currentTime, setCurrentTime,
    togglePlay, handleNext, handlePrev, isShuffle, setIsShuffle, repeatMode, setRepeatMode,
    toggleLike, isLiked, audioRef
  } = usePlayer();

  const progressBarRef = useRef(null);

  const handleSeek = (e) => {
    if (progressBarRef.current && audioRef.current && currentTrack.duration) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      audioRef.current.currentTime = (Math.min(Math.max(0, clickX / width), 1)) * currentTrack.duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <div className="h-24 bg-[#181818] border-t border-[#282828] px-4 grid grid-cols-[1fr_2fr_1fr] items-center z-50">
        
        {/* Left: Track Info */}
        <div className="flex items-center gap-4 min-w-0">
             {currentTrack.coverArt ? (
                 <div className="w-14 h-14 relative group cursor-pointer flex-shrink-0" onClick={onExpand}>
                     <img 
                        src={currentTrack.coverArt} 
                        className="w-full h-full object-cover rounded-md shadow-lg" 
                        alt="cover" 
                     />
                     <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-md transition-all">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                     </div>
                 </div>
             ) : (
                <div className="w-14 h-14 bg-[#282828] rounded-md flex-shrink-0 flex items-center justify-center">
                    <Music size={24} className="text-neutral-500" />
                </div>
             )}

             <div className="flex flex-col justify-center min-w-0">
                 <div className="font-sm font-medium text-white hover:underline cursor-pointer truncate">{currentTrack.title || "Chưa chọn bài hát"}</div>
                 <div className="text-xs text-neutral-400 hover:text-white hover:underline cursor-pointer truncate">{currentTrack.artist || "---"}</div>
             </div>
             
             {/* --- SỬA LỖI NÚT LIKE TẠI ĐÂY --- */}
             <button 
                onClick={() => toggleLike()} // Sửa thành arrow function để không truyền Event object vào
                className={`ml-2 ${isLiked ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
                title={isLiked ? "Xóa khỏi Yêu thích" : "Lưu vào Yêu thích"}
             >
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
             </button>
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center max-w-2xl w-full mx-auto">
             <div className="flex items-center gap-6 mb-2">
                 <button onClick={() => setIsShuffle(!isShuffle)} className={`${isShuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'} transition-colors`}><Shuffle size={16} /></button>
                 <button onClick={handlePrev} className="text-neutral-400 hover:text-white transition-colors"><SkipBack size={20} fill="currentColor" /></button>
                 <button 
                    onClick={togglePlay}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform"
                 >
                     {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                 </button>
                 <button onClick={handleNext} className="text-neutral-400 hover:text-white transition-colors"><SkipForward size={20} fill="currentColor" /></button>
                 <button onClick={() => setRepeatMode((prev) => (prev + 1) % 3)} className={`relative ${repeatMode > 0 ? 'text-green-500' : 'text-neutral-400 hover:text-white'} transition-colors`}>
                     <Repeat size={16} />
                     {repeatMode === 2 && <span className="absolute -top-1.5 -right-1 text-[8px] font-bold">1</span>}
                 </button>
             </div>
             
             <div className="w-full flex items-center gap-2 text-xs font-mono text-neutral-400">
                 <span>{formatTime(currentTime)}</span>
                 <div ref={progressBarRef} onClick={handleSeek} className="flex-1 h-1 bg-[#4d4d4d] rounded-full cursor-pointer group relative">
                     <div className="h-full bg-white group-hover:bg-green-500 rounded-full relative" style={{ width: `${(currentTime / (currentTrack.duration || 1)) * 100}%` }}>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow hidden group-hover:block"></div>
                     </div>
                 </div>
                 <span>{formatTime(currentTrack.duration)}</span>
             </div>
        </div>

        {/* Right: Volume Only */}
        <div className="flex items-center justify-end gap-3 text-neutral-400">
             <div className="flex items-center gap-2 w-24 md:w-32 group">
                 <Volume2 size={18} className="hover:text-white" />
                 <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 group-hover:[&::-webkit-slider-thumb]:w-3 group-hover:[&::-webkit-slider-thumb]:h-3 group-hover:[&::-webkit-slider-thumb]:bg-white group-hover:[&::-webkit-slider-thumb]:rounded-full"
                 />
             </div>
        </div>
      </div>
  );
};

export default PlayerBar;