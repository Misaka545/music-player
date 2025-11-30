// src/App.jsx
import React, { useState } from 'react';
import * as mm from 'music-metadata-browser';
import { PlayerProvider, usePlayer } from './context/PlayerContext'; // Import usePlayer để lấy likedSongs nếu cần, nhưng tốt nhất là lấy từ Context bên trong
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import LibraryGrid from './components/LibraryGrid';
import AlbumDetail from './components/AlbumDetail';

// Wrapper để dùng Context bên trong App Content
const AppContent = () => {
  const [activeView, setActiveView] = useState('library'); // 'library' | 'album-detail' | 'liked-songs'
  const [libraryAlbums, setLibraryAlbums] = useState({});
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Lấy dữ liệu bài hát yêu thích từ Context
  const { playQueue, playTrack, likedSongs, isLiked } = usePlayer();

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

  // Tạo đối tượng Album giả lập cho "Mục yêu thích"
  const likedSongsAlbum = {
      name: "Bài hát đã thích",
      artist: "Của bạn",
      coverArt: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png", // Ảnh placeholder trái tim của Spotify hoặc URL bất kỳ
      tracks: likedSongs
  };

  return (
      <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden selection:bg-green-500 selection:text-black">
        
        <div className="flex-1 flex min-h-0">
          {/* LEFT SIDEBAR */}
          <Sidebar 
            libraryAlbums={libraryAlbums}
            onUpload={handleFolderUpload}
            onViewChange={setActiveView}
            onAlbumSelect={navigateToAlbum}
            likedSongsCount={likedSongs.length}
          />

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 bg-gradient-to-b from-[#1e1e1e] to-[#121212] m-2 rounded-lg overflow-hidden flex flex-col relative ml-0 md:ml-2">
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {isLoading && <div className="text-center text-green-500 font-bold mb-4">Đang quét nhạc...</div>}
                
                {/* LOGIC HIỂN THỊ VIEW */}
                {activeView === 'album-detail' && selectedAlbum ? (
                    <AlbumDetail album={selectedAlbum} />
                ) : activeView === 'liked-songs' ? (
                    // Hiển thị Playlist yêu thích bằng cách tái sử dụng AlbumDetail với dữ liệu giả lập
                    likedSongs.length > 0 ? (
                        <AlbumDetail album={likedSongsAlbum} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                            <h2 className="text-2xl font-bold text-white mb-2">Bài hát bạn yêu thích sẽ xuất hiện ở đây</h2>
                            <p>Hãy lưu các bài hát bằng cách nhấn vào biểu tượng trái tim.</p>
                        </div>
                    )
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

        {/* BOTTOM PLAYER BAR */}
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