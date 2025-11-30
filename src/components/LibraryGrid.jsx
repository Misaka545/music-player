// src/components/LibraryGrid.jsx
import React from 'react';
import { Play, Disc, FolderOpen } from 'lucide-react';

const LibraryGrid = ({ albums, onSelect, onUpload }) => {
  const albumList = Object.values(albums);

  if (albumList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-lg animate-in fade-in">
            <FolderOpen size={48} className="text-neutral-500 mb-4" />
            <p className="text-lg font-bold">Chưa có album nào</p>
            <label className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 cursor-pointer transition-transform">
                Quét thư mục nhạc
                <input type="file" webkitdirectory="true" directory="" multiple onChange={onUpload} className="hidden" />
            </label>
        </div>
      );
  }

  return (
    <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-white mb-6">Thư viện của bạn</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {albumList.map((album, idx) => (
                <div 
                    key={idx} 
                    onClick={() => onSelect(album)}
                    className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group flex flex-col"
                >
                    <div className="relative aspect-square mb-4 bg-[#333] shadow-lg rounded-md overflow-hidden">
                        {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover" /> : <Disc className="p-4 text-neutral-500 w-full h-full" />}
                        
                        {/* Hover Play Button (Visual only here, logic in Detail) */}
                        <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-20">
                            <button className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105">
                                <Play size={24} fill="currentColor" className="ml-1" />
                            </button>
                        </div>
                    </div>
                    <h3 className="font-bold text-white truncate mb-1">{album.name}</h3>
                    <p className="text-sm text-neutral-400 truncate line-clamp-2">{album.artist}</p>
                </div>
            ))}
        </div>
    </div>
  );
};

export default LibraryGrid;