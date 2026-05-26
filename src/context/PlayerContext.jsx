// src/context/PlayerContext.jsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
    // --- STATE ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [prevVolume, setPrevVolume] = useState(0.5);
    const [currentTime, setCurrentTime] = useState(0);
    const [playQueue, setPlayQueue] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState(0); // 0: None, 1: All, 2: One

    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('default');

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
        try {
            const saved = localStorage.getItem('my_playlists');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [likedSongs, setLikedSongs] = useState(() => {
        try {
            const saved = localStorage.getItem('liked_songs');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const audioRef = useRef(null);

    // --- PERSISTENCE ---
    useEffect(() => {
        localStorage.setItem('my_playlists', JSON.stringify(playlists));
    }, [playlists]);

    useEffect(() => {
        localStorage.setItem('liked_songs', JSON.stringify(likedSongs));
    }, [likedSongs]);

    const [isExclusiveMode, setIsExclusiveMode] = useState(() => {
        return localStorage.getItem('exclusive_mode') === 'true';
    });

    const stateRef = useRef({ currentTrack, currentTime, isPlaying, volume });
    useEffect(() => {
        stateRef.current = { currentTrack, currentTime, isPlaying, volume };
    });

    useEffect(() => {
        localStorage.setItem('exclusive_mode', isExclusiveMode);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const state = stateRef.current;

            if (isExclusiveMode) {
                // Switch TO MPV
                if (audioRef.current) audioRef.current.pause();

                ipcRenderer.invoke('mpv-start').then(res => {
                    if (res && res.error) console.error("MPV Start Error:", res.error);

                    ipcRenderer.invoke('mpv-set-volume', state.volume);

                    if (state.currentTrack && state.currentTrack.src) {
                        ipcRenderer.invoke('mpv-play', state.currentTrack.src, state.currentTime).then(() => {
                            if (!state.isPlaying) {
                                ipcRenderer.invoke('mpv-pause');
                            }
                        });
                    }
                });
            } else {
                // Switch TO HTML5
                ipcRenderer.invoke('mpv-stop').then(() => {
                    if (state.currentTrack && state.currentTrack.src && audioRef.current) {
                        audioRef.current.src = state.currentTrack.src;
                        audioRef.current.currentTime = state.currentTime;
                        audioRef.current.volume = state.volume;
                        if (state.isPlaying) {
                            audioRef.current.play().catch(console.error);
                        }
                    }
                });
            }
        }
    }, [isExclusiveMode]);

    // --- AUDIO CONTROL ---
    useEffect(() => {
        // Always keep HTML5 audio volume in sync as baseline
        if (audioRef.current) audioRef.current.volume = volume;
        // Additionally sync to MPV if exclusive mode is active
        if (isExclusiveMode && window.require) {
            window.require('electron').ipcRenderer.invoke('mpv-set-volume', volume).catch(() => {});
        }
        setIsMuted(volume === 0);
    }, [volume, isExclusiveMode]);

    const toggleMute = () => {
        if (isMuted) {
            setVolume(prevVolume === 0 ? 0.5 : prevVolume);
        } else {
            setPrevVolume(volume);
            setVolume(0);
        }
    };

    const handleSetVolume = (val) => {
        setVolume(val);
    }

    // --- DEVICE MANAGEMENT (NEW) ---
    const getAudioDevices = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn("Browser does not support enumerateDevices");
                return;
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
            setAudioDevices(audioOutputs);
        } catch (err) {
            console.error("Error fetching device list:", err);
        }
    };

    const setAudioOutputDevice = async (deviceId) => {
        if (audioRef.current && typeof audioRef.current.setSinkId === 'function') {
            try {
                await audioRef.current.setSinkId(deviceId);
                setSelectedDeviceId(deviceId);
            } catch (error) {
                console.error('Error in setSinkId:', error);
            }
        }
    };

    useEffect(() => {
        getAudioDevices();
        if (navigator.mediaDevices) {
            navigator.mediaDevices.ondevicechange = () => getAudioDevices();
        }
    }, []);

    // --- PLAYBACK LOGIC ---
    const playTrack = useCallback((track) => {
        setCurrentTrack(track);
        if (isExclusiveMode) {
            if (window.require) {
                window.require('electron').ipcRenderer.invoke('mpv-play', track.src)
                    .then(() => setIsPlaying(true))
                    .catch(e => console.error("MPV Playback error:", e));
            }
        } else {
            if (audioRef.current && track.src) {
                audioRef.current.src = track.src;
                if (selectedDeviceId !== 'default' && typeof audioRef.current.setSinkId === 'function') {
                    audioRef.current.setSinkId(selectedDeviceId).catch(err => console.log(err));
                }
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.error("Playback error:", e));
            }
        }
    }, [selectedDeviceId, isExclusiveMode]);

    const togglePlay = useCallback(() => {
        if (!currentTrack || !currentTrack.src) return;
        if (isExclusiveMode) {
            if (window.require) {
                window.require('electron').ipcRenderer.invoke('mpv-toggle-pause');
                setIsPlaying(!isPlaying);
            }
        } else {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    audioRef.current.play()
                        .then(() => setIsPlaying(true))
                        .catch(e => console.error(e));
                }
            }
        }
    }, [isPlaying, currentTrack, isExclusiveMode]);

    const seekTrack = useCallback((time) => {
        setCurrentTime(time);
        if (isExclusiveMode) {
            if (window.require) window.require('electron').ipcRenderer.invoke('mpv-seek', time);
        } else {
            if (audioRef.current) audioRef.current.currentTime = time;
        }
    }, [isExclusiveMode]);

    const handleNext = useCallback(() => {
        if (playQueue.length <= 0) return;
        let nextIndex = currentTrackIndex + 1;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * playQueue.length);
        } else if (nextIndex >= playQueue.length) {
            if (repeatMode === 1) nextIndex = 0;
            else { setIsPlaying(false); return; }
        }
        setCurrentTrackIndex(nextIndex);
        playTrack(playQueue[nextIndex]);
    }, [playQueue, currentTrackIndex, isShuffle, repeatMode, playTrack]);

    const handlePrev = useCallback(() => {
        if (playQueue.length <= 0) return;
        if (audioRef.current && audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            return;
        }
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = playQueue.length - 1;
        setCurrentTrackIndex(prevIndex);
        playTrack(playQueue[prevIndex]);
    }, [playQueue, currentTrackIndex, playTrack]);

    const handleTrackEnded = useCallback(() => {
        if (repeatMode === 2) {
            if (isExclusiveMode) {
                if (window.require) window.require('electron').ipcRenderer.invoke('mpv-seek', 0);
            } else {
                if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play();
                }
            }
        } else if (playQueue.length > 0) {
            handleNext();
        } else {
            setIsPlaying(false);
        }
    }, [repeatMode, playQueue, handleNext, isExclusiveMode]);

    // Sync MPV IPC events
    const handleTrackEndedRef = useRef();
    handleTrackEndedRef.current = handleTrackEnded;

    useEffect(() => {
        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');

        const handleTimePos = (e, time) => {
            if (isExclusiveMode) setCurrentTime(time);
        };

        const handlePause = (e, paused) => {
            if (isExclusiveMode) setIsPlaying(!paused);
        };

        const handleEof = () => {
            if (isExclusiveMode && handleTrackEndedRef.current) {
                handleTrackEndedRef.current();
            }
        };

        ipcRenderer.on('mpv-time-pos', handleTimePos);
        ipcRenderer.on('mpv-pause', handlePause);
        ipcRenderer.on('mpv-eof', handleEof);

        return () => {
            ipcRenderer.removeListener('mpv-time-pos', handleTimePos);
            ipcRenderer.removeListener('mpv-pause', handlePause);
            ipcRenderer.removeListener('mpv-eof', handleEof);
        };
    }, [isExclusiveMode]);

    const startAlbumPlayback = (tracks, startIndex = 0) => {
        setPlayQueue(tracks);
        setCurrentTrackIndex(startIndex);
        playTrack(tracks[startIndex]);
    };

    const addToQueue = (track) => {
        if (playQueue.length === 0) {
            playTrack(track);
            setPlayQueue([track]);
            setCurrentTrackIndex(0);
        } else {
            setPlayQueue(prev => [...prev, track]);
        }
    };

    const removeFromQueue = (indexToRemove) => {
        setPlayQueue(prev => {
            const newQueue = prev.filter((_, index) => index !== indexToRemove);
            if (indexToRemove < currentTrackIndex) setCurrentTrackIndex(old => old - 1);
            return newQueue;
        });
    };

    // --- PLAYLIST & LIKE LOGIC ---
    const createPlaylist = (name) => {
        const newPlaylist = { id: Date.now(), name: name, tracks: [], coverArt: null };
        setPlaylists(prev => [...prev, newPlaylist]);
    };

    const addTrackToPlaylist = (playlistId, track) => {
        setPlaylists(prev => prev.map(pl => {
            if (pl.id === playlistId) {
                const exists = pl.tracks.some(t => t.title === track.title);
                if (exists) return pl;
                const newTracks = [...pl.tracks, track];
                return { ...pl, tracks: newTracks, coverArt: pl.coverArt || track.coverArt };
            }
            return pl;
        }));
    };

    const updatePlaylistCover = (playlistId, newCoverUrl) => {
        setPlaylists(prev => prev.map(pl => pl.id === playlistId ? { ...pl, coverArt: newCoverUrl } : pl));
    };

    const deletePlaylist = (playlistId) => {
        setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    };

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

    const toggleLikeMultiple = (tracks) => {
        if (!tracks || tracks.length === 0) return;
        const allLiked = tracks.every(t => likedSongs.some(ls => ls.title === t.title));
        if (allLiked) {
            const trackTitlesToRemove = tracks.map(t => t.title);
            setLikedSongs(prev => prev.filter(s => !trackTitlesToRemove.includes(s.title)));
        } else {
            const newSongs = tracks.filter(t => !likedSongs.some(ls => ls.title === t.title));
            setLikedSongs(prev => [...prev, ...newSongs]);
        }
    };

    // --- MEDIA SESSION API ---
    useEffect(() => {
        if ('mediaSession' in navigator && currentTrack.title) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: currentTrack.title,
                    artist: currentTrack.artist || 'Unknown Artist',
                    album: currentTrack.album || 'Unknown Album',
                    artwork: currentTrack.coverArt ? [{ src: currentTrack.coverArt, sizes: '512x512', type: 'image/png' }] : []
                });
            } catch (e) { console.warn("MediaSession Metadata error", e); }
        }
    }, [currentTrack]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.setActionHandler('play', () => togglePlay());
                navigator.mediaSession.setActionHandler('pause', () => togglePlay());
                navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
                navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (details.seekTime && audioRef.current) {
                        audioRef.current.currentTime = details.seekTime;
                        setCurrentTime(details.seekTime);
                    }
                });
            } catch (e) { console.warn("MediaSession Handler error", e); }
        }
    }, [togglePlay, handlePrev, handleNext]);

    return (
        <PlayerContext.Provider value={{
            isPlaying, setIsPlaying, volume, setVolume, currentTime, setCurrentTime,
            currentTrack, setCurrentTrack, playQueue, setPlayQueue, isShuffle, setIsShuffle, repeatMode, setRepeatMode,
            togglePlay, handleNext, handlePrev, startAlbumPlayback,
            playlists, createPlaylist, addTrackToPlaylist, deletePlaylist, audioRef,
            toggleLikeMultiple, likedSongs, toggleLike,
            isLiked: checkIsLiked(currentTrack),
            checkIsLiked, updatePlaylistCover, toggleMute, isMuted,
            playTrack, handleSetVolume, addToQueue, removeFromQueue, currentTrackIndex,
            audioDevices, selectedDeviceId, setAudioOutputDevice, getAudioDevices,
            isExclusiveMode, setIsExclusiveMode, seekTrack
        }}>
            {children}
            <audio
                ref={audioRef}
                onTimeUpdate={() => { if (!isExclusiveMode && audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
                onLoadedMetadata={() => { if (!isExclusiveMode && audioRef.current) setCurrentTrack(prev => ({ ...prev, duration: audioRef.current.duration })); }}
                onEnded={handleTrackEnded}
                onPause={() => { if (!isExclusiveMode) setIsPlaying(false); }}
                onPlay={() => { if (!isExclusiveMode) setIsPlaying(true); }}
            />
        </PlayerContext.Provider>
    );
};