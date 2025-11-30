// src/components/AlbumDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, MoreHorizontal, Disc, Plus, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/timeUtils';

const AlbumDetail = ({ album }) => {
  const { startAlbumPlayback, currentTrack, playlists, addTrackToPlaylist, toggleLike, checkIsLiked } = usePlayer();
  
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, track: null });
  const menuRef = useRef(null);

  // Lock scroll khi mở menu
  useEffect(() => {
    if (contextMenu.visible) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [contextMenu.visible]);

  if (!album) return null;

  const albumTracks = album.tracks.map(t => ({
      ...t, 
      coverArt: t.coverArt || album.coverArt
  }));

  const handlePlay = (index) => {
    startAlbumPlayback(albumTracks, index);
  };

  const handleContextMenu = (e, track) => {
      e.preventDefault();
      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          track: track
      });
  };

  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const handleAddToPlaylist = (playlistId) => {
      if (contextMenu.track) {
          addTrackToPlaylist(playlistId, contextMenu.track);
      }
      closeContextMenu();
  };

  // --- HÀM XỬ LÝ LIKE TRONG MENU ---
  const handleToggleLike = () => {
      if (contextMenu.track) {
          toggleLike(contextMenu.track);
          // Không cần đóng menu ngay nếu muốn user thấy tim đổi màu, 
          // nhưng UX thường là đóng menu sau khi chọn.
          closeContextMenu(); 
      }
  }

  // Kiểm tra trạng thái Like của bài hát trong Menu
  const isContextMenuTrackLiked = contextMenu.track ? checkIsLiked(contextMenu.track) : false;

  return (
    <div className="animate-in fade-in duration-300 pb-8 relative">
        {/* Header & Action Bar giữ nguyên */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-6 px-6 pt-6">
            <div className="w-52 h-52 shadow-2xl shadow-black/50 flex-shrink-0 mx-auto md:mx-0">
                {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover" alt="Album Cover" /> : <div className="w-full h-full bg-[#282828] flex items-center justify-center"><Disc size={64} className="text-neutral-500" /></div>}
            </div>
            <div className="flex flex-col gap-2 text-center md:text-left">
                <span className="text-sm font-bold uppercase text-white hidden md:block">Album</span>
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white tracking-tight mb-2 line-clamp-2">{album.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-1 text-sm font-bold text-white">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-[10px]">A</div>
                    <span className="hover:underline cursor-pointer">{album.artist || "User"}</span>
                    <span className="text-white/70">• {album.tracks.length} bài hát</span>
                </div>
            </div>
        </div>

        <div className="pb-2 border-b border-white/10 px-6">
            <div className="flex items-center justify-center md:justify-start gap-8 py-4">
                <button onClick={() => handlePlay(0)} className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg text-black">
                    <Play size={28} fill="currentColor" className="ml-1" />
                </button>
                <Heart size={32} className="text-neutral-400 hover:text-white cursor-pointer" />
                <MoreHorizontal size={32} className="text-neutral-400 hover:text-white cursor-pointer" />
            </div>
            <div className="grid grid-cols-[50px_1fr_auto] gap-4 py-2 uppercase font-normal text-xs text-neutral-400">
                <span className="text-center">#</span>
                <span>Tiêu đề</span>
                <span className="flex items-center gap-2">Thời lượng</span>
            </div>
        </div>

        {/* Tracklist */}
        <div className="w-full text-left text-neutral-400 text-sm mt-2 px-2">
            {albumTracks.map((track, i) => {
                const isActive = currentTrack.title === track.title;
                const isContextMenuActive = contextMenu.visible && contextMenu.track?.title === track.title;

                return (
                    <div 
                        key={i} 
                        onClick={() => handlePlay(i)}
                        onContextMenu={(e) => handleContextMenu(e, track)}
                        className={`grid grid-cols-[50px_1fr_auto] gap-4 px-4 py-2 rounded-md cursor-pointer group items-center transition-colors ${
                            isContextMenuActive ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                    >
                        <div className="flex justify-center items-center">
                            {isActive ? (
                                <div className="relative w-10 h-10 shadow-lg">
                                    <img src={track.coverArt} className="w-full h-full object-cover rounded" alt="playing" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                                        <img src="https://open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2bf4.gif" className="w-4 h-4" alt="eq" />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-10 text-center flex items-center justify-center">
                                    <span className="group-hover:hidden font-mono text-base text-neutral-400">{i + 1}</span>
                                    <Play size={14} fill="white" className="hidden group-hover:block text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className={`text-base font-medium truncate ${isActive ? 'text-green-500' : 'text-white'}`}>{track.title}</span>
                            <span className="text-xs group-hover:text-white transition-colors">{track.artist}</span>
                        </div>
                        <span className="font-mono text-xs">{formatTime(track.duration)}</span>
                    </div>
                );
            })}
        </div>
        
        {/* CUSTOM CONTEXT MENU */}
        {contextMenu.visible && (
            <>
                {/* Overlay để lock scroll & click */}
                <div 
                    className="fixed inset-0 z-[99]" 
                    onClick={closeContextMenu} 
                    onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} 
                ></div>

                <div 
                    ref={menuRef}
                    className="fixed bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl z-[100] w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }} 
                >
                    <div className="p-1 flex flex-col gap-1">
                        
                        {/* --- NÚT THÊM VÀO YÊU THÍCH --- */}
                        <button 
                            onClick={handleToggleLike}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#3e3e3e] rounded-sm text-sm text-white transition-colors flex items-center gap-3"
                        >
                            {/* Icon trái tim: xanh nếu đã like, xám nếu chưa */}
                            <Heart size={16} className={isContextMenuTrackLiked ? "text-green-500 fill-green-500" : "text-neutral-400"} />
                            <span className="font-medium">
                                {isContextMenuTrackLiked ? "Xóa khỏi Yêu thích" : "Thêm vào Yêu thích"}
                            </span>
                        </button>

                        <div className="h-[1px] bg-white/10 my-1 mx-2"></div>

                        <div className="px-3 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            Thêm vào playlist
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {playlists.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-neutral-500 italic">Chưa có playlist</div>
                            ) : (
                                playlists.map(pl => {
                                    const isAlreadyInPlaylist = pl.tracks.some(t => t.title === contextMenu.track?.title);
                                    return (
                                        <button 
                                            key={pl.id}
                                            onClick={() => !isAlreadyInPlaylist && handleAddToPlaylist(pl.id)}
                                            className={`w-full text-left px-3 py-2 hover:bg-[#3e3e3e] rounded-sm text-sm text-white transition-colors flex items-center gap-3 group ${isAlreadyInPlaylist ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Plus size={16} className="text-neutral-400 group-hover:text-white" />
                                            <div className="flex-1 truncate font-medium">{pl.name}</div>
                                            {isAlreadyInPlaylist && <Check size={14} className="text-green-500" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default AlbumDetail;