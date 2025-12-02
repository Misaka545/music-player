// src/components/LibraryGrid.jsx
import React from 'react';
import { Play, Disc, FolderPlus, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext'; 

const LibraryGrid = ({ albums, onSelect, onUpload, isSearchMode, searchResults }) => {
  const { startAlbumPlayback } = usePlayer();

  let displayAlbums = isSearchMode ? searchResults.albums : Object.values(albums);
  
  const handlePlayClick = (e, album) => {
      e.stopPropagation(); 
      if (album.tracks && album.tracks.length > 0) {
          startAlbumPlayback(album.tracks, 0); 
      }
  };

  if (!isSearchMode && displayAlbums.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-[#333] bg-[#111]/50 rounded-lg">
            <FolderPlus size={48} className="text-[#333] mb-4" />
            <p className="text-lg font-bold text-[#555] tracking-widest">DATABASE_EMPTY</p>
            <label className="mt-4 px-6 py-2 bg-[#222] border border-[#444] text-[#ccc] font-mono text-xs hover:bg-[#333] hover:text-white cursor-pointer transition-all">
                INITIATE_SCAN <input type="file" webkitdirectory="true" directory="" multiple onChange={onUpload} className="hidden" />
            </label>
        </div>
      );
  }

  return (
    <div className="animate-in fade-in duration-300">
        {!isSearchMode && <h2 className="text-xl font-bold text-white mb-6 font-futura tracking-widest uppercase border-l-4 border-[#FF6B35] pl-3">Library_Data</h2>}
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayAlbums.map((album, idx) => (
                <div 
                    key={idx} 
                    onClick={() => onSelect(album)} 
                    className="bg-[#161616] p-4 border border-[#333] hover:border-[#E8C060] transition-colors cursor-pointer group flex flex-col relative overflow-hidden"
                >
                    {/* Tech Corner */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#333] group-hover:border-[#E8C060] transition-colors"></div>
                    
                    <div className="relative aspect-square mb-4 bg-[#222] overflow-hidden border border-[#2a2a2a]">
                        {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <Disc className="p-8 text-[#333] w-full h-full" />}
                        
                        {/* --- NÚT PLAY --- */}
                        <div className="absolute bottom-2 right-2 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
                            <button 
                                onClick={(e) => handlePlayClick(e, album)} 
                                className="w-10 h-10 bg-[#EAEAEA] text-black flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-transform" 
                                style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)' }}
                                title="Phát ngay"
                            >
                                <Play size={20} fill="currentColor" className="ml-1" />
                            </button>
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-white truncate mb-1 text-sm tracking-wide">{album.name}</h3>
                    <p className="text-[10px] text-[#666] font-mono truncate uppercase">{album.artist}</p>
                </div>
            ))}
        </div>
    </div>
  );
};

export default LibraryGrid;