// src/components/Sidebar.jsx
import React, { useState } from 'react';
import { Home, Search, FolderOpen, Heart, Disc, Plus, ListMusic } from 'lucide-react'; // Import thêm Plus
import { usePlayer } from '../context/PlayerContext';

const Sidebar = ({ libraryAlbums, onUpload, onViewChange, onAlbumSelect }) => {
  const [filterMode, setFilterMode] = useState('albums'); // 'albums' | 'playlists'
  
  // Lấy playlists và hàm tạo từ Context
  const { playlists, createPlaylist, likedSongs } = usePlayer();

  const handleCreateClick = () => {
      const name = prompt("Nhập tên Playlist mới:");
      if (name && name.trim() !== "") {
          createPlaylist(name);
          setFilterMode('playlists'); // Chuyển tab sang playlist để user thấy ngay
      }
  };

  return (
    <div className="w-64 bg-[#121212] flex flex-col gap-2 p-2 resize-x hidden md:flex h-full">
        {/* Navigation giữ nguyên */}
        <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors" onClick={() => onViewChange('library')}>
                <Home size={24} />
                <span className="font-bold">Trang chủ</span>
            </div>
            <div className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors">
                <Search size={24} />
                <span className="font-bold">Tìm kiếm</span>
            </div>
            <label className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors group">
                <div className="relative">
                    <FolderOpen size={24} className="group-hover:text-green-500 transition-colors" />
                </div>
                <span className="font-bold flex-1">Thư viện</span>
                <input type="file" webkitdirectory="true" directory="" multiple onChange={onUpload} className="hidden" />
            </label>
            <div onClick={() => onViewChange('liked-songs')} className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-sm flex items-center justify-center opacity-80">
                    <Heart size={14} fill="white" className="text-white" />
                </div>
                <span className="font-bold">Mục yêu thích</span>
            </div>
        </div>

        {/* Library List */}
        <div className="flex-1 bg-[#121212] rounded-lg p-2 flex flex-col overflow-hidden">
            
            {/* Filter Chips & Create Button */}
            <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <span 
                        onClick={() => setFilterMode('playlists')}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${filterMode === 'playlists' ? 'bg-white text-black' : 'bg-[#232323] hover:bg-[#2a2a2a] text-white'}`}
                    >
                        Playlists
                    </span>
                    <span 
                        onClick={() => setFilterMode('albums')}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${filterMode === 'albums' ? 'bg-white text-black' : 'bg-[#232323] hover:bg-[#2a2a2a] text-white'}`}
                    >
                        Albums
                    </span>
                </div>
                
                {/* Nút Tạo Playlist */}
                <button onClick={handleCreateClick} className="p-1 hover:bg-[#2a2a2a] rounded-full text-neutral-400 hover:text-white transition-colors" title="Tạo playlist">
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                
                {/* 1. VIEW: PLAYLISTS */}
                {filterMode === 'playlists' && (
                    <>
                        {/* Liked Songs Item */}
                        <div onClick={() => onViewChange('liked-songs')} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                             <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Heart size={20} fill="white" className="text-white" />
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="text-sm font-medium text-white truncate group-hover:text-green-500 transition-colors">Bài hát đã thích</h4>
                                 <p className="text-xs text-neutral-400 truncate">Playlist • {likedSongs.length} bài hát</p>
                             </div>
                        </div>

                        {/* User Created Playlists */}
                        {playlists.map((pl) => (
                             <div key={pl.id} onClick={() => onAlbumSelect(pl)} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                                <div className="w-12 h-12 rounded bg-[#333] flex-shrink-0 overflow-hidden flex items-center justify-center">
                                   {pl.coverArt ? <img src={pl.coverArt} className="w-full h-full object-cover" /> : <ListMusic size={24} className="text-neutral-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-white truncate group-hover:text-green-500 transition-colors">{pl.name}</h4>
                                    <p className="text-xs text-neutral-400 truncate">Playlist • {pl.tracks.length} bài hát</p>
                                </div>
                             </div>
                        ))}
                    </>
                )}

                {/* 2. VIEW: ALBUMS (Logic cũ) */}
                {filterMode === 'albums' && Object.values(libraryAlbums).map((album, idx) => (
                    <div key={idx} onClick={() => onAlbumSelect(album)} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                            <div className="w-12 h-12 rounded bg-[#333] flex-shrink-0 overflow-hidden">
                            {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover" /> : <Disc className="p-2 text-neutral-500 w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-white truncate group-hover:text-green-500 transition-colors">{album.name}</h4>
                                <p className="text-xs text-neutral-400 truncate">Album • {album.artist}</p>
                            </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Sidebar;