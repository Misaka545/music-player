// src/App.jsx
import React, { useState, useMemo, useEffect } from 'react';
import * as mm from 'music-metadata-browser';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import LibraryGrid from './components/LibraryGrid';
import AlbumDetail from './components/AlbumDetail';
import CustomModal from './components/CustomModal';
import FullScreenPlayer from './components/FullScreenPlayer';
import QueuePopup from './components/QueuePopup';
import { Search, Play, Disc, ListMusic } from 'lucide-react';
import { saveAlbumToDB, getAllAlbumsFromDB, deleteAlbumFromDB } from './utils/db';

const AppContent = () => {
  const [activeView, setActiveView] = useState('library'); 
  const [libraryAlbums, setLibraryAlbums] = useState({});
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModal, setUploadModal] = useState({ open: false, files: [] });
  const [searchTab, setSearchTab] = useState('all'); // 'all', 'tracks', 'albums', 'playlists'
  const { likedSongs, playlists, startAlbumPlayback, currentTrack } = usePlayer();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
      const loadLibrary = async () => {
          setIsLoading(true);
          try {
              const storedAlbums = await getAllAlbumsFromDB();
              const loadedLibrary = {};
              for (const album of storedAlbums) {
                  let coverUrl = album.coverBlob ? URL.createObjectURL(album.coverBlob) : null;
                  const tracksWithUrls = album.tracks.map(track => ({
                      ...track,
                      src: URL.createObjectURL(track.fileBlob),
                      coverArt: coverUrl
                  }));
                  loadedLibrary[album.name] = { ...album, coverArt: coverUrl, tracks: tracksWithUrls };
              }
              setLibraryAlbums(loadedLibrary);
          } catch (error) { console.error("DB Load Error:", error); }
          setIsLoading(false);
      };
      loadLibrary();
  }, []);

  const handleImportMusic = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac'));
    if (files.length > 0) setUploadModal({ open: true, files: files });
    e.target.value = null; 
  };

  const confirmUpload = async () => {
      setUploadModal({ ...uploadModal, open: false });
      setIsLoading(true);
      const files = uploadModal.files;
      const tempLibrary = { ...libraryAlbums };

      for (const file of files) {
          try {
            const metadata = await mm.parseBlob(file);
            const albumName = metadata.common.album || "Unknown Album";
            const artist = metadata.common.artist || "Unknown Artist";
            let coverBlob = null;
            if (metadata.common.picture && metadata.common.picture.length > 0) {
               const picture = metadata.common.picture[0];
               coverBlob = new Blob([picture.data], { type: picture.format });
            }

            if (!tempLibrary[albumName]) {
                tempLibrary[albumName] = {
                    name: albumName, artist: artist, coverBlob: coverBlob,
                    coverArt: coverBlob ? URL.createObjectURL(coverBlob) : null, tracks: []
                };
            }
            if (coverBlob && !tempLibrary[albumName].coverBlob) {
                tempLibrary[albumName].coverBlob = coverBlob;
                tempLibrary[albumName].coverArt = URL.createObjectURL(coverBlob);
            }

            tempLibrary[albumName].tracks.push({
                id: file.name + Date.now(), title: metadata.common.title || file.name,
                artist, album: albumName, duration: metadata.format.duration || 0,
                fileBlob: file, src: URL.createObjectURL(file), coverArt: tempLibrary[albumName].coverArt
            });
          } catch (err) { console.error(err); }
      }

      for (const albumName in tempLibrary) {
          const albumToSave = {
              name: tempLibrary[albumName].name, artist: tempLibrary[albumName].artist,
              coverBlob: tempLibrary[albumName].coverBlob,
              tracks: tempLibrary[albumName].tracks.map(t => ({
                  id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration, fileBlob: t.fileBlob
              }))
          };
          await saveAlbumToDB(albumToSave);
      }
      setLibraryAlbums(tempLibrary);
      setIsLoading(false);
  };

  const handleDeleteAlbum = async (albumName) => {
      if(window.confirm(`Xóa album "${albumName}"?`)) {
        await deleteAlbumFromDB(albumName);
        setLibraryAlbums(prev => {
            const newLib = { ...prev };
            delete newLib[albumName];
            return newLib;
        });
        setSelectedAlbum(null);
        setActiveView('library');
      }
  };

  const navigateToAlbum = (album) => {
      setSelectedAlbum(album);
      setActiveView('album-detail');
  };

  const handleOpenCurrentAlbum = () => {
      // 1. Kiểm tra nếu không có bài hát
      if (!currentTrack || !currentTrack.id) {
          console.log("No track playing or track has no ID");
          return;
      }

      console.log("Finding album for track:", currentTrack.title, currentTrack.id);

      // 2. Tìm trong Library (Album Upload) dựa trên ID bài hát
      // Duyệt qua từng album, xem album nào chứa track có ID trùng với track đang phát
      const foundLibraryAlbumKey = Object.keys(libraryAlbums).find(key => 
          libraryAlbums[key].tracks.some(t => t.id === currentTrack.id)
      );

      if (foundLibraryAlbumKey) {
          console.log("Found in Library:", foundLibraryAlbumKey);
          setSelectedAlbum(libraryAlbums[foundLibraryAlbumKey]);
          setActiveView('album-detail');
          setIsFullScreen(false);
          return;
      }

      // 3. Tìm trong Playlists (User tạo) dựa trên ID bài hát
      const foundPlaylist = playlists.find(pl => 
          pl.tracks.some(t => t.id === currentTrack.id)
      );
      
      if (foundPlaylist) {
          console.log("Found in Playlist:", foundPlaylist.name);
          setSelectedAlbum(foundPlaylist);
          setActiveView('album-detail');
          setIsFullScreen(false);
          return;
      }

      // 4. Tìm trong Liked Songs
      const isLiked = likedSongs.some(t => t.id === currentTrack.id);
      if (isLiked) {
          console.log("Found in Liked Songs");
          setActiveView('liked-songs');
          setIsFullScreen(false);
          return;
      }
      
      // 5. Fallback: Nếu không tìm thấy bằng ID, thử tìm bằng Tên Album trong metadata
      if (currentTrack.album && libraryAlbums[currentTrack.album]) {
           console.log("Found by Album Name Fallback");
           setSelectedAlbum(libraryAlbums[currentTrack.album]);
           setActiveView('album-detail');
           setIsFullScreen(false);
           return;
      }

      console.warn("Không tìm thấy album gốc của bài hát này.");
  };

  const likedSongsAlbum = { name: "Bài hát đã thích", artist: "User Data", coverArt: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png", tracks: likedSongs };

  // --- SEARCH LOGIC (GIỮ NGUYÊN) ---
  const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return { tracks: [], albums: [], playlists: [] };
      const query = searchQuery.toLowerCase();
      let allTracks = [];
      Object.values(libraryAlbums).forEach(alb => allTracks.push(...alb.tracks));
      playlists.forEach(pl => allTracks.push(...pl.tracks));
      likedSongs.forEach(s => allTracks.push(s));
      
      const uniqueTracks = Array.from(new Set(allTracks.map(t => t.id))).map(id => allTracks.find(t => t.id === id));

      return {
          tracks: uniqueTracks.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)),
          albums: Object.values(libraryAlbums).filter(a => a.name.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query)),
          playlists: playlists.filter(p => p.name.toLowerCase().includes(query))
      };
  }, [searchQuery, libraryAlbums, playlists, likedSongs]);

  return (
      <div className="h-screen font-sans selection:bg-[#FF6B35] selection:text-black overflow-hidden relative" style={{ backgroundColor: '#09090b', color: '#EAEAEA' }}>
        
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: '32px 32px' }}>
        </div>
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-80"></div>

        <div className="flex-1 flex z-10 p-3 gap-3 h-full min-h-0 pb-28">
          
          <Sidebar 
            libraryAlbums={libraryAlbums}
            onUpload={handleImportMusic}
            onViewChange={(view) => { setActiveView(view); if(view !== 'search') setSearchQuery(""); }} 
            onAlbumSelect={navigateToAlbum}
          />

          <div className="flex-1 bg-[#111] border border-[#333] relative flex flex-col overflow-hidden">
              <div className="h-[2px] w-full flex flex-shrink-0">
                  <div className="w-1/3 bg-[#FF6B35]"></div>
                  <div className="w-1/3 bg-[#E8C060]"></div>
                  <div className="w-1/3 bg-[#4FD6BE]"></div>
              </div>

              {/* --- SỬA ĐỔI QUAN TRỌNG Ở ĐÂY --- */}
              {/* 1. Xóa class 'p-6' ở thẻ cha này để nội dung tràn viền */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                
                {isLoading && <div className="text-center text-[#4FD6BE] font-mono tracking-widest mt-4 animate-pulse">SYSTEM_SCANNING...</div>}
                
                {activeView === 'album-detail' && selectedAlbum ? (
                    /* Các view khác cần thêm p-6 hoặc p-8 vào bên trong để không bị dính lề */
                    <AlbumDetail 
                        album={selectedAlbum} 
                        onBack={() => { setSelectedAlbum(null); setActiveView('library'); }}
                        onDeleteAlbum={() => handleDeleteAlbum(selectedAlbum.name)}
                    />
                ) : activeView === 'liked-songs' ? (
                    <div className="h-full">
                        {likedSongs.length > 0 ? ( 
                            <AlbumDetail album={likedSongsAlbum} onBack={() => setActiveView('library')} /> 
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-[#555]">
                                <h2 className="text-2xl font-bold text-white mb-2 font-futura tracking-widest uppercase">No Data Found</h2>
                                <p className="font-mono text-xs">MARK TRACKS AS 'FAVORITE' TO POPULATE</p>
                            </div>
                        )}
                    </div>
                ) : activeView === 'search' ? (
                    <div className="animate-in fade-in duration-300 min-h-full bg-[#111]">
                        
                        {/* 2. THANH TÌM KIẾM (HEADER ĐẶC) */}
                        {/* sticky top-0 giờ sẽ dính sát mép trên cùng vì không còn padding cha cản đường */}
                        <div className="sticky top-0 z-30 bg-[#0e0e10] border-b border-[#333] px-6 py-4 shadow-xl">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={20} />
                                <input 
                                    type="text" placeholder="SEARCH_DATABASE..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                                    className="w-full bg-[#1a1a1a] text-white rounded-none border border-[#444] py-3 pl-10 pr-4 outline-none focus:border-[#4FD6BE] placeholder:text-[#555] font-mono text-sm shadow-inner transition-colors"
                                />
                            </div>
                            
                            {searchQuery.trim() && (
                                <div className="flex gap-6 mt-4 text-xs font-bold tracking-widest text-[#555]">
                                    {['all', 'tracks', 'albums', 'playlists'].map(tab => (
                                        <button 
                                            key={tab}
                                            onClick={() => setSearchTab(tab)}
                                            className={`uppercase hover:text-white transition-all pb-1 border-b-2 ${searchTab === tab ? 'text-[#FF6B35] border-[#FF6B35]' : 'border-transparent hover:border-[#333]'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. NỘI DUNG TÌM KIẾM */}
                        {/* Thêm padding p-6 ở đây để nội dung không dính lề */}
                        <div className="p-6 pb-10">
                            {!searchQuery.trim() ? (
                                <div className="flex flex-col items-center justify-center h-64 text-neutral-500"><Search size={48} className="mb-4 opacity-50" /><p className="font-mono text-xs tracking-widest">AWAITING INPUT...</p></div>
                            ) : (
                                <div className="flex flex-col gap-8">
                                    {/* Tracks Result */}
                                    {(searchTab === 'all' || searchTab === 'tracks') && searchResults.tracks.length > 0 && (
                                        <div>
                                            <h2 className="text-sm font-bold text-[#E8C060] mb-3 font-mono tracking-widest border-l-2 border-[#E8C060] pl-3 uppercase">
                                                Audio Files <span className="text-[#555] ml-2">({searchResults.tracks.length})</span>
                                            </h2>
                                            <div className="space-y-1">
                                                {searchResults.tracks.map((track, i) => (
                                                    <div key={i} onClick={() => startAlbumPlayback([track], 0)} className="flex items-center gap-4 p-2 hover:bg-white/5 border border-transparent hover:border-[#333] cursor-pointer group transition-all rounded-sm">
                                                        <div className="relative w-10 h-10 flex-shrink-0 bg-[#222]">
                                                            <img src={track.coverArt || "https://via.placeholder.com/40"} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center"><Play size={16} fill="white" /></div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-[#e0e0e0] truncate group-hover:text-[#4FD6BE] transition-colors font-sans">{track.title}</div>
                                                            <div className="text-[10px] text-[#555] font-mono truncate tracking-wider">{track.artist}</div>
                                                        </div>
                                                        <div className="text-[10px] text-[#444] font-mono group-hover:text-[#ccc]">FLAC</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Albums & Playlists Results (Copy y nguyên logic cũ) */}
                                    {(searchTab === 'all' || searchTab === 'albums') && searchResults.albums.length > 0 && (
                                        <div>
                                            <h2 className="text-sm font-bold text-[#4FD6BE] mb-4 font-mono tracking-widest border-l-2 border-[#4FD6BE] pl-3 uppercase">
                                                Albums <span className="text-[#555] ml-2">({searchResults.albums.length})</span>
                                            </h2>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {searchResults.albums.map((album, i) => (
                                                    <div key={i} onClick={() => navigateToAlbum(album)} className="bg-[#161616] p-4 border border-[#333] hover:border-[#4FD6BE] cursor-pointer transition-all group hover:bg-[#1a1a1a]">
                                                        <div className="aspect-square mb-3 bg-[#222] overflow-hidden relative">
                                                            {album.coverArt ? <img src={album.coverArt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <Disc className="p-4 w-full h-full text-[#333]" />}
                                                        </div>
                                                        <h3 className="font-bold truncate text-xs text-[#ccc] group-hover:text-white tracking-wide">{album.name}</h3>
                                                        <p className="text-[9px] text-[#555] font-mono truncate uppercase mt-1">{album.artist}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(searchTab === 'all' || searchTab === 'playlists') && searchResults.playlists.length > 0 && (
                                        <div>
                                            <h2 className="text-sm font-bold text-[#FF6B35] mb-4 font-mono tracking-widest border-l-2 border-[#FF6B35] pl-3 uppercase">
                                                Playlists <span className="text-[#555] ml-2">({searchResults.playlists.length})</span>
                                            </h2>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {searchResults.playlists.map((pl, i) => (
                                                    <div key={i} onClick={() => navigateToAlbum(pl)} className="bg-[#161616] p-4 border border-[#333] hover:border-[#FF6B35] cursor-pointer transition-all group hover:bg-[#1a1a1a]">
                                                        <div className="aspect-square mb-3 bg-[#222] overflow-hidden flex items-center justify-center relative">
                                                            <div className="absolute inset-0 border border-[#333] m-1 pointer-events-none"></div>
                                                            {pl.coverArt ? <img src={pl.coverArt} className="w-full h-full object-cover" /> : <ListMusic size={32} className="text-[#333] group-hover:text-[#FF6B35]" />}
                                                        </div>
                                                        <h3 className="font-bold truncate text-xs text-[#ccc] group-hover:text-white tracking-wide">{pl.name}</h3>
                                                        <p className="text-[9px] text-[#555] font-mono truncate uppercase mt-1">USER_DATA</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {((searchTab === 'tracks' && searchResults.tracks.length === 0) ||
                                      (searchTab === 'albums' && searchResults.albums.length === 0) ||
                                      (searchTab === 'playlists' && searchResults.playlists.length === 0) ||
                                      (searchTab === 'all' && searchResults.tracks.length === 0 && searchResults.albums.length === 0 && searchResults.playlists.length === 0)) && (
                                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[#333] rounded-lg">
                                            <p className="text-[#555] font-mono text-xs mb-1">ERR_404: DATA NOT FOUND</p>
                                            <p className="text-[#333] text-[10px]">NO MATCHING RECORDS FOR "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Default Library View: Cần thêm p-6 ở đây
                    <div className="p-6">
                        <LibraryGrid albums={libraryAlbums} onSelect={navigateToAlbum} onUpload={handleImportMusic}/>
                    </div>
                )}
              </div>
          </div>
        </div>
    
        <PlayerBar 
            onOpenAlbum={handleOpenCurrentAlbum} 
            onToggleFullScreen={() => setIsFullScreen(true)} 
            onToggleQueue={() => setShowQueue(!showQueue)}
        />
        {isFullScreen && (
            <FullScreenPlayer onClose={() => setIsFullScreen(false)} />
        )}
        {showQueue && (
            <QueuePopup onClose={() => setShowQueue(false)} />
        )}
        <CustomModal isOpen={uploadModal.open} title="CONFIRM_UPLOAD" onConfirm={confirmUpload} onCancel={() => setUploadModal({ ...uploadModal, open: false })} confirmText="EXECUTE">
             <div className="font-mono text-sm text-[#ccc]">
                 DETECTED <span className="text-[#4FD6BE] font-bold">{uploadModal.files.length}</span> FILES.<br/>
                 INITIALIZE IMPORT SEQUENCE?
             </div>
         </CustomModal>
      </div>
  );
};

const App = () => { return (<PlayerProvider><AppContent /></PlayerProvider>) };
export default App;