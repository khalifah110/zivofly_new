import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Volume2,
  FileAudio,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { CustomVoiceConfig } from '../types';

interface CustomAgentVoiceSectionProps {
  value?: CustomVoiceConfig;
  onChange: (config: CustomVoiceConfig | undefined) => void;
  compact?: boolean;
}

export const CustomAgentVoiceSection: React.FC<CustomAgentVoiceSectionProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => Boolean(value?.enabled || value?.audioUrl));
  const [authorized, setAuthorized] = useState<boolean>(() => Boolean(value?.authorized));
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [voiceName, setVoiceName] = useState<string>(value?.voiceName || 'My Custom Voice');

  // Audio Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(value?.audioUrl || null);
  const [recordedFileName, setRecordedFileName] = useState<string | null>(value?.fileName || null);
  const [recordedFileSize, setRecordedFileSize] = useState<string | null>(value?.fileSize || null);
  const [audioDuration, setAudioDuration] = useState<number>(value?.duration || 0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if external value changes
  useEffect(() => {
    if (value) {
      setAuthorized(Boolean(value.authorized));
      if (value.audioUrl) {
        setRecordedBlobUrl(value.audioUrl);
      }
      if (value.fileName) {
        setRecordedFileName(value.fileName);
      }
      if (value.fileSize) {
        setRecordedFileSize(value.fileSize);
      }
      if (value.duration) {
        setAudioDuration(value.duration);
      }
      if (value.voiceName) {
        setVoiceName(value.voiceName);
      }
    }
  }, [value]);

  // Clean up recording timer and streams on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (!nextState && !recordedBlobUrl) {
      // If closing without an audio configured, disable
      onChange(undefined);
    }
  };

  const handleAuthorizationChange = (checked: boolean) => {
    setAuthorized(checked);
    if (!checked) {
      toast.info('Voice authorization unchecked. The agent cannot use your voice without authorization.');
      if (value) {
        onChange({
          ...value,
          authorized: false,
          enabled: false,
        });
      }
    } else {
      toast.success('Voice authorization confirmed.');
      onChange({
        enabled: true,
        authorized: true,
        voiceName: voiceName || 'My Custom Voice',
        audioUrl: recordedBlobUrl || undefined,
        fileName: recordedFileName || undefined,
        fileSize: recordedFileSize || undefined,
        duration: audioDuration || undefined,
        sourceType: activeTab === 'record' ? 'recorded' : 'uploaded',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // --- Audio Recording Flow ---
  const startRecording = async () => {
    if (!authorized) {
      toast.error('Please check the authorization box first to give permission.');
      return;
    }

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const sizeInKb = (audioBlob.size / 1024).toFixed(1) + ' KB';
        const fallbackName = `voice-recording-${new Date().toISOString().slice(0, 10)}.webm`;

        // Convert blob to DataURL so it persists reliably in front-end state
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64DataUrl = reader.result as string;
          setRecordedBlobUrl(base64DataUrl);
          setRecordedFileName(fallbackName);
          setRecordedFileSize(sizeInKb);

          const finalConfig: CustomVoiceConfig = {
            enabled: true,
            authorized: true,
            voiceName: voiceName || 'My Custom Voice',
            audioUrl: base64DataUrl,
            fileName: fallbackName,
            fileSize: sizeInKb,
            duration: recordingSeconds,
            sourceType: 'recorded',
            updatedAt: new Date().toISOString(),
          };

          onChange(finalConfig);
          toast.success('Voice recording saved successfully!');
        };
        reader.readAsDataURL(audioBlob);

        // Turn off microphone hardware light
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      toast.error('Could not access microphone. Please allow microphone access or upload an audio file.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // --- Audio Upload Flow ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!authorized) {
      toast.error('Please check the authorization box first to give permission.');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit. Please upload a shorter audio sample.');
      return;
    }

    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRecordedBlobUrl(dataUrl);
      setRecordedFileName(file.name);
      setRecordedFileSize(fileSizeFormatted);

      // Measure audio duration
      const tempAudio = new Audio(dataUrl);
      tempAudio.onloadedmetadata = () => {
        const dur = Math.round(tempAudio.duration || 0);
        setAudioDuration(dur);

        const newConfig: CustomVoiceConfig = {
          enabled: true,
          authorized: true,
          voiceName: voiceName || file.name.replace(/\.[^/.]+$/, ''),
          audioUrl: dataUrl,
          fileName: file.name,
          fileSize: fileSizeFormatted,
          duration: dur,
          sourceType: 'uploaded',
          updatedAt: new Date().toISOString(),
        };

        onChange(newConfig);
        toast.success(`Voice file "${file.name}" uploaded successfully!`);
      };
    };

    reader.readAsDataURL(file);
  };

  // --- Audio Playback Controls ---
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !recordedBlobUrl) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Audio play error:', err);
          toast.error('Could not play audio preview');
        });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setPlaybackTime(Math.round(audioPlayerRef.current.currentTime));
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleRemoveVoice = () => {
    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setRecordedBlobUrl(null);
    setRecordedFileName(null);
    setRecordedFileSize(null);
    setAudioDuration(0);
    setIsPlaying(false);
    onChange(undefined);
    toast.info('Custom voice removed. Standard synthetic voices will be used.');
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2 pt-1">
      {/* Hidden audio element for previews */}
      {recordedBlobUrl && (
        <audio
          ref={audioPlayerRef}
          src={recordedBlobUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* Main Container / Trigger */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs transition-all">
        {/* Header Clickable Banner */}
        <div
          onClick={handleToggleOpen}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                recordedBlobUrl && authorized
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Mic className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Custom Agent Voice
                </span>
                {recordedBlobUrl && authorized ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Voice Ready
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                    Optional
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Record or upload your voice so the agent speaks with your exact voice on phone calls and voice notes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOpen && !recordedBlobUrl && (
              <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                + Add Voice
              </span>
            )}
            <button
              type="button"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={isOpen ? 'Collapse voice section' : 'Expand voice section'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {isOpen && (
          <div className="p-4 pt-1 border-t border-border/80 space-y-4 animate-in fade-in duration-200">
            {/* MANDATORY CONSENT CHECKBOX SECTION */}
            <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-foreground block">
                    Voice Cloning Authorization & Consent
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Under privacy and AI synthesis guidelines, we require explicit authorization before training or synthesizing any individual's voice.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => handleAuthorizationChange(e.target.checked)}
                  className="mt-0.5 size-4 accent-amber-600 rounded cursor-pointer shrink-0"
                />
                <span className="text-xs font-medium text-foreground leading-snug">
                  By clicking this box you giving authorisation that the agent should used your voice.
                </span>
              </label>
            </div>

            {/* If NOT authorized, show friendly lock message */}
            {!authorized ? (
              <div className="p-4 rounded-xl border border-border bg-muted/30 text-center space-y-1 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 mx-auto text-amber-500" />
                <p className="font-medium text-foreground">Authorization Required</p>
                <p className="text-[11px]">
                  Please check the authorization box above to record your voice or upload an audio sample.
                </p>
              </div>
            ) : (
              <>
                {/* Voice Name / Label */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground block">
                    Voice Profile Name
                  </label>
                  <input
                    type="text"
                    value={voiceName}
                    onChange={(e) => {
                      setVoiceName(e.target.value);
                      if (value) {
                        onChange({ ...value, voiceName: e.target.value });
                      }
                    }}
                    placeholder="e.g. My Voice - Founder Tone"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Switcher: Record vs Upload */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('record')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'record'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Record Your Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'upload'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Audio File</span>
                  </button>
                </div>

                {/* TAB 1: RECORD VOICE */}
                {activeTab === 'record' && (
                  <div className="p-4 rounded-xl border border-border bg-background space-y-4">
                    {/* Suggested Reading Script */}
                    <div className="space-y-1 bg-muted/40 p-3 rounded-lg border border-border/60">
                      <div className="text-[11px] font-semibold text-foreground">
                        <span>Recommended Script to Read (15–30 seconds):</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        “Hello! Thank you for calling today. I am your business concierge, and I am here to help you with bookings, questions, and our services. Feel free to ask me anything!”
                      </p>
                    </div>

                    {/* Recording Action / Live Visualizer */}
                    <div className="flex flex-col items-center justify-center py-2 space-y-3">
                      {isRecording ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                            <span className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
                              Recording: {formatSeconds(recordingSeconds)}
                            </span>
                          </div>

                          {/* Sound wave equalizer animation */}
                          <div className="flex items-center gap-1 h-8">
                            {[16, 28, 12, 32, 24, 18, 30, 14, 26, 20].map((h, i) => (
                              <div
                                key={i}
                                className="w-1 bg-amber-500 rounded-full animate-pulse"
                                style={{
                                  height: `${h}px`,
                                  animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                                }}
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-5 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop & Save Recording</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={startRecording}
                            className="px-6 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                            <span>Start Recording Voice</span>
                          </button>
                          <span className="text-[11px] text-muted-foreground">
                            Speak clearly into your device microphone for at least 10–20 seconds.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: UPLOAD AUDIO */}
                {activeTab === 'upload' && (
                  <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-all space-y-2 select-none"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          Click to upload or drag and drop voice audio
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supported formats: MP3, WAV, M4A, OGG, WEBM (Max 25MB).
                        </p>
                      </div>
                      <span className="inline-block text-[11px] font-medium text-primary hover:underline">
                        Select audio file from your computer
                      </span>
                    </div>
                  </div>
                )}

                {/* AUDIO PREVIEW & CONTROLS (When audio is ready) */}
                {recordedBlobUrl && (
                  <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileAudio className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-semibold text-foreground block truncate">
                            {recordedFileName || voiceName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {recordedFileSize ? `${recordedFileSize} • ` : ''}
                            Ready for AI Agent voice synthesis
                          </span>
                        </div>
                      </div>

                      {/* Remove Voice button */}
                      <button
                        type="button"
                        onClick={handleRemoveVoice}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Remove custom voice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sleek Mini Audio Player */}
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/60">
                      <button
                        type="button"
                        onClick={togglePlayAudio}
                        className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
                        title={isPlaying ? 'Pause audio' : 'Play audio preview'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                          <span>{formatSeconds(playbackTime)}</span>
                          <span>{audioDuration > 0 ? formatSeconds(audioDuration) : 'Preview'}</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{
                              width:
                                audioDuration > 0
                                  ? `${Math.min(100, (playbackTime / audioDuration) * 100)}%`
                                  : isPlaying
                                  ? '100%'
                                  : '0%',
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
