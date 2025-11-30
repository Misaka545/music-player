// src/App.jsx
import React, { useState, useMemo } from 'react'; // Import thêm useMemo
import * as mm from 'music-metadata-browser';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import LibraryGrid from './components/LibraryGrid';
import AlbumDetail from './components/AlbumDetail';
import { Search, Play, Disc, ListMusic } from 'lucide-react'; // Import icon cho Search View

const AppContent = () => {
  const [activeView, setActiveView] = useState('library'); 
  const [libraryAlbums, setLibraryAlbums] = useState({});
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // State cho ô tìm kiếm
  
  // Lấy dữ liệu từ Context
  const { playQueue, playTrack, likedSongs, isLiked, playlists, startAlbumPlayback } = usePlayer();

  // ... (Hàm handleFolderUpload giữ nguyên) ...
  const handleFolderUpload = async (e) => {
    setIsLoading(true);
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac'));
    const newLibrary = {};

    for (const file of files) {
      try {
        const objectUrl = URL.createObjectURL(file);
        const metadata = await mm.parseBlob(file);
        const albumName = metadata.common.album || "Unknown Album";
        const artist = metadata.common.artist || "Unknown Artist";
        
        let coverUrl = null;
        if (metadata.common.picture && metadata.common.picture.length > 0) {
           const picture = metadata.common.picture[0];
           const blob = new Blob([picture.data], { type: picture.format });
           coverUrl = URL.createObjectURL(blob);
        }

        if (!newLibrary[albumName]) {
            newLibrary[albumName] = {
                name: albumName,
                artist: artist,
                coverArt: coverUrl, 
                tracks: []
            };
        }
        if (coverUrl && !newLibrary[albumName].coverArt) newLibrary[albumName].coverArt = coverUrl;

        newLibrary[albumName].tracks.push({
            id: file.name + Date.now(),
            title: metadata.common.title || file.name,
            artist,
            album: albumName,
            duration: metadata.format.duration || 0,
            src: objectUrl,
            coverArt: coverUrl
        });
      } catch (err) { console.error(err); }
    }
    setLibraryAlbums(prev => ({ ...prev, ...newLibrary }));
    setIsLoading(false);
  };

  const navigateToAlbum = (album) => {
      setSelectedAlbum(album);
      setActiveView('album-detail');
  };

  const likedSongsAlbum = {
      name: "Bài hát đã thích",
      artist: "Của bạn",
      coverArt: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png", 
      tracks: likedSongs
  };

  // --- LOGIC TÌM KIẾM ---
  const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return { tracks: [], albums: [], playlists: [] };
      
      const query = searchQuery.toLowerCase();
      
      // 1. Tìm trong bài hát (gộp tất cả nguồn)
      let allTracks = [];
      Object.values(libraryAlbums).forEach(alb => allTracks.push(...alb.tracks));
      playlists.forEach(pl => allTracks.push(...pl.tracks));
      likedSongs.forEach(s => allTracks.push(s));
      
      // Loại bỏ trùng lặp (nếu cần, dựa trên title + artist)
      const uniqueTracks = Array.from(new Set(allTracks.map(t => t.id))).map(id => {
          return allTracks.find(t => t.id === id);
      });

      const matchedTracks = uniqueTracks.filter(t => 
          t.title.toLowerCase().includes(query) || 
          t.artist.toLowerCase().includes(query)
      );

      // 2. Tìm trong Albums
      const matchedAlbums = Object.values(libraryAlbums).filter(a => 
          a.name.toLowerCase().includes(query) || 
          a.artist.toLowerCase().includes(query)
      );

      // 3. Tìm trong Playlists
      const matchedPlaylists = playlists.filter(p => 
          p.name.toLowerCase().includes(query)
      );

      return { tracks: matchedTracks, albums: matchedAlbums, playlists: matchedPlaylists };
  }, [searchQuery, libraryAlbums, playlists, likedSongs]);

  return (
      <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden selection:bg-green-500 selection:text-black">
        
        <div className="flex-1 flex min-h-0">
          <Sidebar 
            libraryAlbums={libraryAlbums}
            onUpload={handleFolderUpload}
            onViewChange={setActiveView}
            onAlbumSelect={navigateToAlbum}
          />

           <div className="flex-1 bg-gradient-to-b from-[#1e1e1e] to-[#121212] my-2 mr-2 ml-2 md:ml-2 rounded-lg overflow-hidden flex flex-col relative">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {isLoading && <div className="text-center text-green-500 font-bold mb-4">Đang quét nhạc...</div>}
                
                {activeView === 'album-detail' && selectedAlbum ? (
                    <AlbumDetail 
                        album={selectedAlbum} 
                        onBack={() => {
                            setSelectedAlbum(null);
                            setActiveView('library');
                        }}
                    />
                ) : activeView === 'liked-songs' ? (
                    likedSongs.length > 0 ? (
                        <AlbumDetail 
                            album={likedSongsAlbum} 
                            onBack={() => setActiveView('library')} 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                            <h2 className="text-2xl font-bold text-white mb-2">Bài hát bạn yêu thích sẽ xuất hiện ở đây</h2>
                            <p>Hãy lưu các bài hát bằng cách nhấn vào biểu tượng trái tim.</p>
                        </div>
                    )
                ) : activeView === 'search' ? (
                    /* --- GIAO DIỆN TÌM KIẾM --- */
                    <div className="animate-in fade-in duration-300">
                        <div className="mb-6 sticky top-0 z-20 py-4 -mt-6 px-4 -mx-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Bạn muốn nghe gì?" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-[#242424] text-white rounded-full py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-400 font-medium"
                                />
                            </div>
                        </div>

                        {!searchQuery.trim() ? (
                            <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p>Nhập tên bài hát, nghệ sĩ hoặc album để tìm kiếm.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {/* Kết quả Bài hát */}
                                {searchResults.tracks.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Bài hát</h2>
                                        <div className="space-y-1">
                                            {searchResults.tracks.map((track, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => startAlbumPlayback([track], 0)}
                                                    className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-md cursor-pointer group"
                                                >
                                                    <div className="relative w-10 h-10 flex-shrink-0">
                                                        <img src={track.coverArt || "https://via.placeholder.com/40"} className="w-full h-full object-cover rounded" />
                                                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded">
                                                            <Play size={16} fill="white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-white truncate">{track.title}</div>
                                                        <div className="text-xs text-neutral-400 truncate">{track.artist}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Kết quả Albums */}
                                {searchResults.albums.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Albums</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {searchResults.albums.map((album, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => navigateToAlbum(album)}
                                                    className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] cursor-pointer transition-colors"
                                                >
                                                    <div className="aspect-square mb-3 bg-[#333] rounded overflow-hidden">
                                                        {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover" /> : <Disc className="p-4 w-full h-full text-neutral-500" />}
                                                    </div>
                                                    <h3 className="font-bold truncate">{album.name}</h3>
                                                    <p className="text-sm text-neutral-400 truncate">{album.artist}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Kết quả Playlists */}
                                {searchResults.playlists.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Playlists</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {searchResults.playlists.map((pl, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => navigateToAlbum(pl)}
                                                    className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] cursor-pointer transition-colors"
                                                >
                                                    <div className="aspect-square mb-3 bg-[#333] rounded overflow-hidden flex items-center justify-center">
                                                        {pl.coverArt ? <img src={pl.coverArt} className="w-full h-full object-cover" /> : <ListMusic size={32} className="text-neutral-500" />}
                                                    </div>
                                                    <h3 className="font-bold truncate">{pl.name}</h3>
                                                    <p className="text-sm text-neutral-400 truncate">Playlist</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Không tìm thấy gì */}
                                {searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.playlists.length === 0 && (
                                    <div className="text-center text-neutral-400 mt-10">
                                        <p>Không tìm thấy kết quả nào cho "{searchQuery}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <LibraryGrid 
                        albums={libraryAlbums} 
                        onSelect={navigateToAlbum}
                        onUpload={handleFolderUpload}
                    />
                )}
              </div>
          </div>
        </div>
        <PlayerBar onExpand={() => activeView === 'library' && selectedAlbum && setActiveView('album-detail')} />
      </div>
  );
};

const App = () => {
    return (
        <PlayerProvider>
            <AppContent />
        </PlayerProvider>
    )
}

export default App;