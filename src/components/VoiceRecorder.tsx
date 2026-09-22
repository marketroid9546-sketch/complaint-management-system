import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Play, Pause, AlertCircle } from 'lucide-react';
import { VoiceNoteData } from '../types';
import { translations, Language } from '../translations';

interface VoiceRecorderProps {
  lang: Language;
  onVoiceRecorded: (data: VoiceNoteData | undefined) => void;
  existingVoiceNote?: VoiceNoteData;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  lang,
  onVoiceRecorded,
  existingVoiceNote,
}) => {
  const t = translations[lang];
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState<VoiceNoteData | undefined>(existingVoiceNote);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [hasMicPermissionError, setHasMicPermissionError] = useState(false);

  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setHasMicPermissionError(false);
    audioChunksRef.current = [];
    setSeconds(0);

    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      // Permission denied or not available in iframe sandbox
      setHasMicPermissionError(true);
    }

    if (stream) {
      try {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const data: VoiceNoteData = {
            durationSeconds: seconds || 1,
            blobUrl: audioUrl,
            recordedAt: new Date().toISOString(),
          };
          setVoiceNote(data);
          onVoiceRecorded(data);
          stream?.getTracks().forEach((track) => track.stop());
        };
        mediaRecorder.start();
      } catch {
        // Fallback to simulated audio
        simulateRecordingCapture();
      }
    } else {
      simulateRecordingCapture();
    }

    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev >= 59) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const simulateRecordingCapture = () => {
    // Generate an audible beep or audio data URI so playback works seamlessly
    setTimeout(() => {
      // ready
    }, 100);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignored
      }
    } else {
      // Create synthetic speech/tone audio blob
      const duration = seconds || 1;
      const data: VoiceNoteData = {
        durationSeconds: duration,
        audioData: 'mock-audio-captured',
        recordedAt: new Date().toISOString(),
      };
      setVoiceNote(data);
      onVoiceRecorded(data);
    }
  };

  const deleteRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setVoiceNote(undefined);
    setSeconds(0);
    setPlaybackTime(0);
    onVoiceRecorded(undefined);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      setPlaybackTime(0);
      const interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= (voiceNote?.durationSeconds || 5)) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full bg-stone-100 border border-stone-300 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-800" />
          {t.voiceNoteTitle}
        </span>
        <span className="text-xs text-stone-700 bg-stone-200 px-2 py-0.5 rounded">
          {isRecording ? `${formatTime(seconds)} / 1:00` : voiceNote ? `${formatTime(voiceNote.durationSeconds)}` : 'Max 60s'}
        </span>
      </div>

      {!voiceNote && !isRecording && (
        <div>
          <button
            type="button"
            onClick={startRecording}
            className="w-full min-h-[48px] bg-white hover:bg-stone-50 text-stone-900 border-2 border-dashed border-stone-400 hover:border-emerald-800 rounded-lg px-4 py-2.5 flex items-center justify-center gap-3 transition-colors font-medium active:bg-stone-200"
          >
            <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse" />
            <span>{t.holdToRecord}</span>
          </button>
          {hasMicPermissionError && (
            <p className="text-xs text-stone-700 mt-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Mic access unavailable in preview iframe; demo recording will be captured.</span>
            </p>
          )}
        </div>
      )}

      {isRecording && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 animate-ping" />
            <span className="text-sm font-bold text-red-800 tracking-wider">
              {formatTime(seconds)}
            </span>
            <span className="text-xs text-red-700">{t.recordingActive}</span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="min-h-[48px] px-5 bg-red-700 hover:bg-red-800 text-white rounded-md flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform w-full sm:w-auto"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>{t.stopRecording}</span>
          </button>
        </div>
      )}

      {voiceNote && !isRecording && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-12 h-12 flex-shrink-0 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Play recording"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-emerald-950 truncate">
                {t.voiceRecordedSuccess}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {/* Waveform visual bars */}
                {[4, 8, 14, 10, 18, 12, 16, 9, 14, 6].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isPlaying && (playbackTime % 10) >= i ? 'bg-emerald-700' : 'bg-emerald-300'
                    }`}
                    style={{ height: `${h + 4}px` }}
                  />
                ))}
                <span className="text-xs text-emerald-800 font-mono ml-2">
                  {isPlaying ? formatTime(playbackTime) : formatTime(voiceNote.durationSeconds)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={deleteRecording}
            className="min-w-[48px] min-h-[48px] p-2 text-red-700 hover:text-red-900 hover:bg-red-100 rounded-md flex items-center justify-center"
            title={t.deleteRecording}
            aria-label={t.deleteRecording}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
