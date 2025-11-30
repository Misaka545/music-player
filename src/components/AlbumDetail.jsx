// src/components/AlbumDetail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, MoreHorizontal, Disc, Plus, Check, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/timeUtils';
import CustomModal from './CustomModal'; // <--- 1. Import Modal

const AlbumDetail = ({ album, onBack }) => { 
  const { startAlbumPlayback, currentTrack, playlists, addTrackToPlaylist, toggleLike, checkIsLiked, deletePlaylist, updatePlaylistCover } = usePlayer();
  
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, track: null });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // 2. State quản lý Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const menuRef = useRef(null);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);

  const isUserPlaylist = playlists.some(pl => pl.id === album.id);

  // ... (Giữ nguyên các useEffect lock scroll và click outside) ...
  useEffect(() => {
    if (contextMenu.visible) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; }
  }, [contextMenu.visible]);

  useEffect(() => {
      const handleClickOutside = (e) => {
          if (settingsRef.current && !settingsRef.current.contains(e.target)) {
              setShowSettingsMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, track: track });
  };
  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });

  const handleToggleLike = () => {
      if (contextMenu.track) toggleLike(contextMenu.track);
      closeContextMenu();
  }
  const handleAddToPlaylist = (playlistId) => {
      if (contextMenu.track) addTrackToPlaylist(playlistId, contextMenu.track);
      closeContextMenu();
  };

  // --- 3. SỬA LOGIC XÓA PLAYLIST ---
  
  // Hàm 1: Khi bấm nút xóa trong menu -> Chỉ mở Modal
  const handleDeleteClick = () => {
      setShowSettingsMenu(false); // Đóng menu 3 chấm trước
      setIsDeleteModalOpen(true); // Mở Modal xác nhận
  };

  // Hàm 2: Khi bấm "Xóa" trong Modal -> Thực hiện xóa thật
  const confirmDeletePlaylist = () => {
      deletePlaylist(album.id);
      setIsDeleteModalOpen(false); // Đóng Modal
      
      // Chuyển về trang chủ
      if (onBack) {
          setTimeout(() => {
              onBack(); 
          }, 100);
      }
  };

  const handleCoverUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const objectUrl = URL.createObjectURL(file);
          updatePlaylistCover(album.id, objectUrl);
          setShowSettingsMenu(false);
      }
  };

  const isContextMenuTrackLiked = contextMenu.track ? checkIsLiked(contextMenu.track) : false;

  return (
    <div className="animate-in fade-in duration-300 pb-8 relative">
        {/* ... (Phần Header Album giữ nguyên) ... */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-6 px-6 pt-6">
            <div className="w-52 h-52 shadow-2xl shadow-black/50 flex-shrink-0 mx-auto md:mx-0 group relative">
                {album.coverArt ? (
                    <img src={album.coverArt} className="w-full h-full object-cover shadow-lg" alt="Cover" />
                ) : (
                    <div className="w-full h-full bg-[#282828] flex items-center justify-center shadow-lg">
                        <Disc size={64} className="text-neutral-500" />
                    </div>
                )}
                {isUserPlaylist && (
                    <div 
                        onClick={() => fileInputRef.current.click()}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-white"
                    >
                        <ImageIcon size={32} className="mb-2"/>
                        <span className="text-xs font-bold">Đổi ảnh</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 text-center md:text-left">
                <span className="text-sm font-bold uppercase text-white hidden md:block">
                    {isUserPlaylist ? 'Playlist' : 'Album'}
                </span>
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white tracking-tight mb-2 line-clamp-2">{album.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-1 text-sm font-bold text-white">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-[10px]">
                        {isUserPlaylist ? 'U' : 'A'}
                    </div>
                    <span className="hover:underline cursor-pointer">{album.artist || "User"}</span>
                    <span className="text-white/70">• {album.tracks.length} bài hát</span>
                </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="pb-2 border-b border-white/10 px-6">
            <div className="flex items-center justify-center md:justify-start gap-8 py-4 relative">
                <button onClick={() => handlePlay(0)} className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg text-black">
                    <Play size={28} fill="currentColor" className="ml-1" />
                </button>
                <Heart size={32} className="text-neutral-400 hover:text-white cursor-pointer" />
                
                {/* Menu 3 chấm */}
                <div className="relative" ref={settingsRef}>
                    <MoreHorizontal 
                        size={32} 
                        className={`text-neutral-400 hover:text-white cursor-pointer ${showSettingsMenu ? 'text-white' : ''}`} 
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    />
                    
                    {showSettingsMenu && (
                        <div className="absolute top-10 left-0 bg-[#282828] border border-[#3e3e3e] rounded shadow-xl p-1 z-30 w-48 animate-in fade-in zoom-in-95 duration-100">
                             {isUserPlaylist ? (
                                 <>
                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        className="w-full text-left px-3 py-2.5 hover:bg-[#3e3e3e] rounded-sm text-sm text-white transition-colors flex items-center gap-2"
                                    >
                                        <Upload size={16} />
                                        <span>Thay đổi ảnh bìa</span>
                                    </button>
                                    
                                    {/* SỬA: Gọi hàm mở modal thay vì xóa ngay */}
                                    <button 
                                        onClick={handleDeleteClick}
                                        className="w-full text-left px-3 py-2.5 hover:bg-[#3e3e3e] rounded-sm text-sm text-white transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        <span>Xóa Playlist</span>
                                    </button>
                                 </>
                             ) : (
                                 <div className="px-3 py-2 text-sm text-neutral-400 italic">Không có tùy chọn</div>
                             )}
                        </div>
                    )}
                </div>
            </div>
            
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleCoverUpload} className="hidden" />

            <div className="grid grid-cols-[50px_1fr_auto] gap-4 py-2 uppercase font-normal text-xs text-neutral-400">
                <span className="text-center">#</span>
                <span>Tiêu đề</span>
                <span className="flex items-center gap-2">Thời lượng</span>
            </div>
        </div>

        {/* ... (Phần Tracklist giữ nguyên) ... */}
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
        
        {/* ... (Phần Custom Context Menu giữ nguyên) ... */}
        {contextMenu.visible && (
            <>
                <div 
                    className="fixed inset-0 z-[99]" 
                    onClick={closeContextMenu} 
                    onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} 
                ></div>
                <div 
                    className="fixed bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl z-[100] w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }} 
                >
                    <div className="p-1 flex flex-col gap-1">
                        <button onClick={handleToggleLike} className="w-full text-left px-3 py-2.5 hover:bg-[#3e3e3e] rounded-sm text-sm text-white transition-colors flex items-center gap-3">
                            <Heart size={16} className={isContextMenuTrackLiked ? "text-green-500 fill-green-500" : "text-neutral-400"} />
                            <span className="font-medium">{isContextMenuTrackLiked ? "Xóa khỏi Yêu thích" : "Thêm vào Yêu thích"}</span>
                        </button>
                        <div className="h-[1px] bg-white/10 my-1 mx-2"></div>
                        <div className="px-3 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Thêm vào playlist</div>
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

        {/* --- 4. THÊM MODAL XÓA VÀO CUỐI CÙNG --- */}
        <CustomModal
            isOpen={isDeleteModalOpen}
            title="Xóa Playlist"
            onConfirm={confirmDeletePlaylist}
            onCancel={() => setIsDeleteModalOpen(false)}
            confirmText="Xóa"
            cancelText="Hủy"
        >
            <div className="text-neutral-300">
                Bạn có chắc muốn xóa playlist <span className="font-bold text-white">"{album.name}"</span> không?
                <p className="text-xs text-neutral-500 mt-2">Thao tác này không thể hoàn tác.</p>
            </div>
        </CustomModal>
    </div>
  );
};

export default AlbumDetail;