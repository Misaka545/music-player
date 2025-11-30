// src/context/PlayerContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  // ... (Giữ nguyên các state khác: isPlaying, volume, playlists...)
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [playQueue, setPlayQueue] = useState([]); 
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); 
  const [currentTrack, setCurrentTrack] = useState({
    id: "default",
    title: "",
    artist: "",
    album: "",
    duration: 0,
    coverArt: null,
    src: null
  });

  const [playlists, setPlaylists] = useState(() => {
      const saved = localStorage.getItem('my_playlists');
      return saved ? JSON.parse(saved) : [];
  });

  const [likedSongs, setLikedSongs] = useState(() => {
      const saved = localStorage.getItem('liked_songs');
      return saved ? JSON.parse(saved) : [];
  });

  const audioRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('my_playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
      localStorage.setItem('liked_songs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const playTrack = (track) => {
    if (audioRef.current && track.src) {
        audioRef.current.src = track.src;
        audioRef.current.play().catch(e => console.error(e));
        setIsPlaying(true);
    }
    setCurrentTrack(track);
  };
  
  const togglePlay = () => {
    if (audioRef.current && currentTrack.src) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play().catch(e => console.error(e));
        setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (playQueue.length <= 0) return;
    let nextIndex = currentTrackIndex + 1;
    if (isShuffle) nextIndex = Math.floor(Math.random() * playQueue.length);
    else if (nextIndex >= playQueue.length) nextIndex = 0;
    setCurrentTrackIndex(nextIndex);
    playTrack(playQueue[nextIndex]);
  };

  const handlePrev = () => {
    if (playQueue.length <= 0) return;
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = playQueue.length - 1;
    setCurrentTrackIndex(prevIndex);
    playTrack(playQueue[prevIndex]);
  };

  const handleTrackEnded = () => {
    if (repeatMode === 2) { 
          audioRef.current.currentTime = 0;
          audioRef.current.play();
      } else if (playQueue.length > 0) {
          handleNext();
      } else {
          setIsPlaying(false);
      }
  };

  const startAlbumPlayback = (tracks, startIndex = 0) => {
    setPlayQueue(tracks);
    setCurrentTrackIndex(startIndex);
    playTrack(tracks[startIndex]);
  };
  
  const createPlaylist = (name) => {
      const newPlaylist = {
          id: Date.now(),
          name: name,
          tracks: [],
          coverArt: null
      };
      setPlaylists(prev => [...prev, newPlaylist]);
  };

  const addTrackToPlaylist = (playlistId, track) => {
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
              const exists = pl.tracks.some(t => t.title === track.title);
              if (exists) return pl;
              const newTracks = [...pl.tracks, track];
              const newCover = pl.coverArt || track.coverArt;
              return { ...pl, tracks: newTracks, coverArt: newCover };
          }
          return pl;
      }));
  };

  const updatePlaylistCover = (playlistId, newCoverUrl) => {
      setPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) {
              return { ...pl, coverArt: newCoverUrl };
          }
          return pl;
      }));
  };

  const deletePlaylist = (playlistId) => {
      setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
  };


  // --- CẬP NHẬT LOGIC LIKE ---
  const checkIsLiked = (track) => {
    if (!track || !track.title) return false;
    return likedSongs.some(song => song.title === track.title);
  };

  const toggleLike = (track = null) => {
    const targetTrack = track || currentTrack;
    if (!targetTrack || !targetTrack.title) return;

    if (checkIsLiked(targetTrack)) {
      setLikedSongs(prev => prev.filter(song => song.title !== targetTrack.title));
    } else {
      setLikedSongs(prev => [...prev, targetTrack]);
    }
  };

  const isLiked = checkIsLiked(currentTrack);

  return (
    <PlayerContext.Provider value={{
      isPlaying, volume, setVolume, currentTime, setCurrentTime,
      currentTrack, playQueue, isShuffle, setIsShuffle, repeatMode, setRepeatMode,
      togglePlay, handleNext, handlePrev, startAlbumPlayback,
      playlists, createPlaylist, addTrackToPlaylist, deletePlaylist, audioRef,
      
      likedSongs, 
      toggleLike, 
      isLiked,
      checkIsLiked,
      updatePlaylistCover
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setCurrentTrack(prev => ({...prev, duration: audioRef.current.duration}))}
        onEnded={handleTrackEnded} 
      />
    </PlayerContext.Provider>
  );
};