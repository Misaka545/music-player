// src/components/Sidebar.jsx
import React, { useState, useRef } from 'react';
import { Home, Search, FolderPlus, Heart, Plus, ListMusic, Disc } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import CustomModal from './CustomModal'; // <--- Import Modal

const Sidebar = ({ libraryAlbums, onUpload, onViewChange, onAlbumSelect }) => {
  const [filterMode, setFilterMode] = useState('albums');
  const { playlists, createPlaylist, likedSongs } = usePlayer();

  // State cho Modal tạo playlist
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Hàm mở modal
  const handleCreateClick = () => {
      setNewPlaylistName(""); // Reset tên
      setIsModalOpen(true);
  };

  // Hàm xác nhận tạo
  const confirmCreatePlaylist = () => {
      if (newPlaylistName && newPlaylistName.trim() !== "") {
          createPlaylist(newPlaylistName);
          setFilterMode('playlists');
          setIsModalOpen(false);
      }
  };

  return (
    <>
        <div className="w-64 flex flex-col py-2 pl-2 pr-0 h-full hidden md:flex">
            {/* ... (Giữ nguyên toàn bộ nội dung hiển thị Sidebar cũ của bạn) ... */}
            <div className="flex-1 bg-[#121212] rounded-lg flex flex-col overflow-hidden">
                <div className="p-4 flex flex-col gap-4">
                    <div className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors" onClick={() => onViewChange('library')}>
                        <Home size={24} />
                        <span className="font-bold">Trang chủ</span>
                    </div>
                    <div className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors" onClick={() => onViewChange('search')}>
                        <Search size={24} />
                        <span className="font-bold">Tìm kiếm</span>
                    </div>
                    <label className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors group">
                        <div className="relative">
                            <FolderPlus size={24} className="group-hover:text-green-500 transition-colors" />
                        </div>
                        <span className="font-bold flex-1">Thêm nhạc</span>
                        <input type="file" webkitdirectory="true" directory="" multiple onChange={onUpload} className="hidden" />
                    </label>
                    <div onClick={() => onViewChange('liked-songs')} className="flex items-center gap-4 text-white/70 hover:text-white cursor-pointer transition-colors">
                        <Heart size={24} />
                        <span className="font-bold">Yêu thích</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden px-2 pb-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            <span onClick={() => setFilterMode('playlists')} className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${filterMode === 'playlists' ? 'bg-white text-black' : 'bg-[#232323] hover:bg-[#2a2a2a] text-white'}`}>Playlists</span>
                            <span onClick={() => setFilterMode('albums')} className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${filterMode === 'albums' ? 'bg-white text-black' : 'bg-[#232323] hover:bg-[#2a2a2a] text-white'}`}>Albums</span>
                        </div>
                        <button onClick={handleCreateClick} className="p-1 hover:bg-[#2a2a2a] rounded-full text-neutral-400 hover:text-white transition-colors" title="Tạo playlist">
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                        {filterMode === 'playlists' && (
                            <>
                                <div onClick={() => onViewChange('liked-songs')} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                                    <div className="w-12 h-12 rounded bg-gradient-to-br from-indigo-600 to-blue-800 flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <Heart size={20} fill="white" className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-white truncate group-hover:text-green-500 transition-colors">Bài hát đã thích</h4>
                                        <p className="text-xs text-neutral-400 truncate">Playlist • {likedSongs.length} bài hát</p>
                                    </div>
                                </div>
                                {playlists.map((pl) => (
                                    <div key={pl.id} onClick={() => onAlbumSelect(pl)} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                                        <div className="w-12 h-12 rounded bg-[#333] flex-shrink-0 overflow-hidden flex items-center justify-center">
                                        {pl.coverArt ? <img src={pl.coverArt} className="w-full h-full object-cover" alt="cover" /> : <ListMusic size={24} className="text-neutral-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-white truncate group-hover:text-green-500 transition-colors">{pl.name}</h4>
                                            <p className="text-xs text-neutral-400 truncate">Playlist • {pl.tracks.length} bài hát</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {filterMode === 'albums' && Object.values(libraryAlbums).map((album, idx) => (
                            <div key={idx} onClick={() => onAlbumSelect(album)} className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded-md cursor-pointer group">
                                    <div className="w-12 h-12 rounded bg-[#333] flex-shrink-0 overflow-hidden">
                                    {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover" alt="cover" /> : <Disc className="p-2 text-neutral-500 w-full h-full" />}
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
        </div>

        {/* --- CUSTOM MODAL TẠO PLAYLIST --- */}
        <CustomModal
            isOpen={isModalOpen}
            title="Tạo Playlist mới"
            onConfirm={confirmCreatePlaylist}
            onCancel={() => setIsModalOpen(false)}
            confirmText="Tạo mới"
        >
            <input 
                type="text" 
                placeholder="Nhập tên playlist..." 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                className="w-full bg-[#3e3e3e] text-white p-3 rounded-md outline-none focus:ring-2 focus:ring-green-500 placeholder:text-neutral-400"
                onKeyDown={(e) => e.key === 'Enter' && confirmCreatePlaylist()}
            />
        </CustomModal>
    </>
  );
};

export default Sidebar;