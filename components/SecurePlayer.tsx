"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function SecurePlayer({ trackId }: { trackId: string }) {
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const [isPlaying, setIsPlaying] = useState(false);
 const [currentTime, setCurrentTime] = useState(0);
 const [duration, setDuration] = useState(0);
 const [buffered, setBuffered] = useState(0); // New state for buffer amount
 const [volume, setVolume] = useState(1);
 const [error, setError] = useState<string | null>(null);

 const streamUrl = `/api/stream/${trackId}/playlist.m3u8`;

 // Calculate percentages for the triple-color gradient
 const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
 const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

 const formatTime = (time: number) => {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
 };

 useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  let hls: Hls;
  if (Hls.isSupported()) {
   hls = new Hls({ maxBufferLength: 30 });
   hls.loadSource(streamUrl);
   hls.attachMedia(audio);
   hls.on(Hls.Events.ERROR, (_, data) => {
    if (data.fatal) setError("Failed to load secure stream.");
   });
  } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
   audio.src = streamUrl;
  }

  const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
  const handleLoadedMetadata = () => setDuration(audio.duration);
  const handleEnded = () => setIsPlaying(false);

  // Track buffering progress
  const handleProgress = () => {
   if (audio.buffered.length > 0) {
    setBuffered(audio.buffered.end(audio.buffered.length - 1));
   }
  };

  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  audio.addEventListener("progress", handleProgress);
  audio.addEventListener("ended", handleEnded);

  return () => {
   if (hls) hls.destroy();
   audio.removeEventListener("timeupdate", handleTimeUpdate);
   audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
   audio.removeEventListener("progress", handleProgress);
   audio.removeEventListener("ended", handleEnded);
  };
 }, [streamUrl]);

 const togglePlay = () => {
  if (audioRef.current) {
   isPlaying ? audioRef.current.pause() : audioRef.current.play();
   setIsPlaying(!isPlaying);
  }
 };

 const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (audioRef.current) {
   const seekTime = Number(e.target.value);
   audioRef.current.currentTime = seekTime;
   setCurrentTime(seekTime);
  }
 };

 return (
  <div className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md border border-zinc-800 shadow-2xl">
   <div className="mb-6 text-center">
    <h3 className="text-xl font-bold text-white tracking-wider">
     SECURE PLAYER
    </h3>
    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
     {trackId}
    </p>
   </div>

   {error ? (
    <div className="text-red-500 font-medium p-4 bg-red-900/20 rounded-xl">
     {error}
    </div>
   ) : (
    <div className="space-y-6">
     <div className="space-y-2">
      <input
       type="range"
       min="0"
       max={duration || 0}
       value={currentTime}
       onChange={handleSeek}
       className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-white"
       style={{
        // Triple Gradient:
        // 1. Blue (played)
        // 2. Dark Grey (buffered)
        // 3. Light Grey (remaining)
        background: `linear-gradient(to right, 
                  #3b82f6 0%, 
                  #3b82f6 ${playedPercent}%, 
                  #52525b ${playedPercent}%, 
                  #52525b ${bufferedPercent}%, 
                  #27272a ${bufferedPercent}%, 
                  #27272a 100%)`,
       }}
      />
      <div className="flex justify-between text-xs font-mono text-zinc-500">
       <span>{formatTime(currentTime)}</span>
       <span>{formatTime(duration)}</span>
      </div>
     </div>

     <div className="flex items-center justify-center gap-8">
      <button
       onClick={togglePlay}
       className="w-20 h-20 bg-white text-black rounded-full text-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
      >
       {isPlaying ? "⏸" : "▶"}
      </button>
     </div>

     <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/50 rounded-full">
      <span className="text-sm">🔈</span>
      <input
       type="range"
       min="0"
       max="1"
       step="0.01"
       value={volume}
       onChange={(e) => {
        const v = Number(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
       }}
       className="w-full h-1 bg-zinc-700 rounded-lg appearance-none accent-zinc-400"
       style={{
        background: `linear-gradient(to right, #ffffff ${volume * 100}%, #3f3f46 ${volume * 100}%)`,
       }}
      />
      <span className="text-sm">🔊</span>
     </div>
    </div>
   )}

   <audio ref={audioRef} className="hidden" />
  </div>
 );
}
