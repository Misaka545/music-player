// src/App.jsx
import React, { useState, useMemo, useEffect } from 'react';
import * as mm from 'music-metadata-browser';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import LibraryGrid from './components/LibraryGrid';
import AlbumDetail from './components/AlbumDetail';
import CustomModal from './components/CustomModal';
import { Search, Play, Disc, ListMusic } from 'lucide-react';
import { saveAlbumToDB, getAllAlbumsFromDB, deleteAlbumFromDB } from './utils/db'; 

const AppContent = () => {
  const [activeView, setActiveView] = useState('library'); 
  const [libraryAlbums, setLibraryAlbums] = useState({});
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModal, setUploadModal] = useState({ open: false, files: [] });
  
  const { likedSongs, playlists, startAlbumPlayback } = usePlayer();

  // --- 1. LOAD DỮ LIỆU TỪ DB KHI KHỞI ĐỘNG ---
  useEffect(() => {
      const loadLibrary = async () => {
          setIsLoading(true);
          try {
              const storedAlbums = await getAllAlbumsFromDB();
              const loadedLibrary = {};

              // Tái tạo lại Blob URL từ dữ liệu thô trong DB
              for (const album of storedAlbums) {
                  // Tạo URL cho ảnh bìa (nếu có blob)
                  let coverUrl = null;
                  if (album.coverBlob) {
                      coverUrl = URL.createObjectURL(album.coverBlob);
                  }

                  // Tạo URL cho từng bài hát (từ File object)
                  const tracksWithUrls = album.tracks.map(track => ({
                      ...track,
                      src: URL.createObjectURL(track.fileBlob), // fileBlob là file gốc lưu trong DB
                      coverArt: coverUrl
                  }));

                  loadedLibrary[album.name] = {
                      ...album,
                      coverArt: coverUrl,
                      tracks: tracksWithUrls
                  };
              }
              setLibraryAlbums(loadedLibrary);
          } catch (error) {
              console.error("Lỗi load DB:", error);
          }
          setIsLoading(false);
      };

      loadLibrary();
  }, []);

  const handleFolderUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac'));
    if (files.length > 0) {
        setUploadModal({ open: true, files: files });
    }
    e.target.value = null; 
  };

  // --- 2. CẬP NHẬT LOGIC LƯU VÀO DB ---
  const confirmUpload = async () => {
      setUploadModal({ ...uploadModal, open: false });
      setIsLoading(true);
      
      const files = uploadModal.files;
      const tempLibrary = { ...libraryAlbums }; // Copy library hiện tại để update state

      for (const file of files) {
          try {
            const metadata = await mm.parseBlob(file);
            const albumName = metadata.common.album || "Unknown Album";
            const artist = metadata.common.artist || "Unknown Artist";
            
            // Xử lý ảnh bìa (Lấy Blob để lưu DB)
            let coverBlob = null;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
               const picture = metadata.common.picture[0];
               coverBlob = new Blob([picture.data], { type: picture.format });
            }

            // Tạo cấu trúc Album nếu chưa có
            if (!tempLibrary[albumName]) {
                tempLibrary[albumName] = {
                    name: albumName,
                    artist: artist,
                    coverBlob: coverBlob, // Lưu Blob gốc
                    coverArt: coverBlob ? URL.createObjectURL(coverBlob) : null, // URL để hiển thị ngay
                    tracks: []
                };
            }
            // Cập nhật cover nếu bài sau có mà bài trước chưa có
            if (coverBlob && !tempLibrary[albumName].coverBlob) {
                tempLibrary[albumName].coverBlob = coverBlob;
                tempLibrary[albumName].coverArt = URL.createObjectURL(coverBlob);
            }

            // Thêm track
            tempLibrary[albumName].tracks.push({
                id: file.name + Date.now(),
                title: metadata.common.title || file.name,
                artist,
                album: albumName,
                duration: metadata.format.duration || 0,
                fileBlob: file, // QUAN TRỌNG: Lưu file gốc để persist
                src: URL.createObjectURL(file), // URL để play ngay
                coverArt: tempLibrary[albumName].coverArt
            });
          } catch (err) { console.error(err); }
      }

      // Lưu từng Album mới/đã update vào IndexedDB
      for (const albumName in tempLibrary) {
          // Chỉ lưu những album vừa được chạm vào (để tối ưu) hoặc lưu đè tất cả cũng được nếu ít
          // Ở đây ta lưu đối tượng "sạch" (không chứa URL blob tạm thời) vào DB
          const albumToSave = {
              name: tempLibrary[albumName].name,
              artist: tempLibrary[albumName].artist,
              coverBlob: tempLibrary[albumName].coverBlob,
              tracks: tempLibrary[albumName].tracks.map(t => ({
                  id: t.id,
                  title: t.title,
                  artist: t.artist,
                  album: t.album,
                  duration: t.duration,
                  fileBlob: t.fileBlob // Lưu File object
              }))
          };
          await saveAlbumToDB(albumToSave);
      }

      setLibraryAlbums(tempLibrary);
      setIsLoading(false);
  };

  const navigateToAlbum = (album) => {
      setSelectedAlbum(album);
      setActiveView('album-detail');
  };

  const handleDeleteAlbum = async (albumName) => {
      await deleteAlbumFromDB(albumName);
      
      setLibraryAlbums(prev => {
          const newLib = { ...prev };
          delete newLib[albumName];
          return newLib;
      });

      setSelectedAlbum(null);
      setActiveView('library');
  };

  const likedSongsAlbum = {
      name: "Bài hát đã thích",
      artist: "Của bạn",
      coverArt: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png", 
      tracks: likedSongs
  };

   const handleImportMusic = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac'));
    if (files.length > 0) {
        setUploadModal({ open: true, files: files });
    }
    e.target.value = null; 
  };

  const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return { tracks: [], albums: [], playlists: [] };
      const query = searchQuery.toLowerCase();
      
      let allTracks = [];
      Object.values(libraryAlbums).forEach(alb => allTracks.push(...alb.tracks));
      playlists.forEach(pl => allTracks.push(...pl.tracks));
      likedSongs.forEach(s => allTracks.push(s));
      
      const uniqueTracks = Array.from(new Set(allTracks.map(t => t.id))).map(id => allTracks.find(t => t.id === id));

      const matchedTracks = uniqueTracks.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
      const matchedAlbums = Object.values(libraryAlbums).filter(a => a.name.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query));
      const matchedPlaylists = playlists.filter(p => p.name.toLowerCase().includes(query));

      return { tracks: matchedTracks, albums: matchedAlbums, playlists: matchedPlaylists };
  }, [searchQuery, libraryAlbums, playlists, likedSongs]);

  return (
      <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden selection:bg-green-500 selection:text-black">
        
        <div className="flex-1 flex min-h-0">
          <Sidebar 
            libraryAlbums={libraryAlbums}
            onUpload={handleImportMusic}
            onViewChange={setActiveView}
            onAlbumSelect={navigateToAlbum}
          />

          <div className="flex-1 bg-gradient-to-b from-[#1e1e1e] to-[#121212] my-2 mr-2 ml-2 md:ml-1 rounded-lg overflow-hidden flex flex-col relative">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {isLoading && <div className="text-center text-green-500 font-bold mb-4">Đang quét nhạc...</div>}
                
                {activeView === 'album-detail' && selectedAlbum ? (
                    <AlbumDetail 
                        album={selectedAlbum} 
                        onBack={() => { setSelectedAlbum(null); setActiveView('library'); }}
                        onDeleteAlbum={() => handleDeleteAlbum(selectedAlbum.name)}
                    />
                ) : activeView === 'liked-songs' ? (
                    likedSongs.length > 0 ? ( <AlbumDetail album={likedSongsAlbum} onBack={() => setActiveView('library')} /> ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                            <h2 className="text-2xl font-bold text-white mb-2">Bài hát bạn yêu thích sẽ xuất hiện ở đây</h2>
                            <p>Hãy lưu các bài hát bằng cách nhấn vào biểu tượng trái tim.</p>
                        </div>
                    )
                ) : activeView === 'search' ? (
                    <div className="animate-in fade-in duration-300">
                        <div className="mb-6 sticky top-0 z-20 py-4 -mt-6 px-4 -mx-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                                <input 
                                    type="text" placeholder="Bạn muốn nghe gì?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                                    className="w-full bg-[#242424] text-white rounded-full py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-400 font-medium shadow-lg"
                                />
                            </div>
                        </div>
                        {!searchQuery.trim() ? (
                            <div className="flex flex-col items-center justify-center h-64 text-neutral-500"><Search size={48} className="mb-4 opacity-50" /><p>Nhập tên bài hát, nghệ sĩ hoặc album để tìm kiếm.</p></div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {searchResults.tracks.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Bài hát</h2>
                                        <div className="space-y-1">
                                            {searchResults.tracks.map((track, i) => (
                                                <div key={i} onClick={() => startAlbumPlayback([track], 0)} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-md cursor-pointer group">
                                                    <div className="relative w-10 h-10 flex-shrink-0">
                                                        <img src={track.coverArt || "https://via.placeholder.com/40"} className="w-full h-full object-cover rounded" />
                                                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center rounded"><Play size={16} fill="white" /></div>
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
                                {searchResults.albums.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Albums</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {searchResults.albums.map((album, i) => (
                                                <div key={i} onClick={() => navigateToAlbum(album)} className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] cursor-pointer transition-colors">
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
                                {searchResults.playlists.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold mb-4">Playlists</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {searchResults.playlists.map((pl, i) => (
                                                <div key={i} onClick={() => navigateToAlbum(pl)} className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] cursor-pointer transition-colors">
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
                                {searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.playlists.length === 0 && (
                                    <div className="text-center text-neutral-400 mt-10"><p>Không tìm thấy kết quả nào cho "{searchQuery}"</p></div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <LibraryGrid albums={libraryAlbums} onSelect={navigateToAlbum} onUpload={handleFolderUpload}/>
                )}
              </div>
          </div>
        </div>
        <PlayerBar onExpand={() => activeView === 'library' && selectedAlbum && setActiveView('album-detail')} />
        <CustomModal isOpen={uploadModal.open} title="Xác nhận tải lên" onConfirm={confirmUpload} onCancel={() => setUploadModal({ ...uploadModal, open: false })} confirmText="Thêm vào Thư viện">
             <p>Tìm thấy <span className="text-green-500 font-bold">{uploadModal.files.length}</span> bài hát.</p>
             <p className="text-sm mt-2 text-neutral-400">Bạn có muốn thêm chúng vào thư viện không?</p>
         </CustomModal>
      </div>
  );
};

const App = () => { return (<PlayerProvider><AppContent /></PlayerProvider>) };
export default App;