import React, { useState } from 'react';
import {
  FileText,
  FileImage,
  FileAudio,
  File,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Download,
  Eye,
  X,
  Play,
  Pause,
  AlertTriangle,
  Lock,
  Volume2,
  Maximize2,
} from 'lucide-react';
import { Attachment, Track } from '../../types';

interface AttachmentGalleryProps {
  attachments?: Attachment[];
  photos?: string[];
  track?: Track;
  isAnonymous?: boolean;
  title?: string;
  readOnly?: boolean;
}

export function AttachmentGallery({
  attachments = [],
  photos = [],
  track,
  isAnonymous = false,
  title = 'Attachments & Evidence',
  readOnly = false,
}: AttachmentGalleryProps) {
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const [selectedPdfDoc, setSelectedPdfDoc] = useState<{
    url?: string;
    filename: string;
    sizeBytes: number;
    scanStatus: string;
  } | null>(null);

  const [activePlayingAudioId, setActivePlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});

  // Synthesize legacy photos into attachment records if attachments array is empty
  const allAttachments: Attachment[] = React.useMemo(() => {
    if (attachments && attachments.length > 0) {
      return attachments;
    }
    if (photos && photos.length > 0) {
      return photos.map((p, idx) => ({
        id: `att-legacy-${idx}`,
        complaint_id: 'legacy',
        storage_key: `photos/legacy-${idx}.jpg`,
        original_filename: `photo_evidence_0${idx + 1}.jpg`,
        mime_type: 'image/jpeg',
        size_bytes: 1450000 + idx * 250000,
        scan_status: 'CLEAN' as const,
        scan_timestamp: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        is_voice_note: false,
        url: p,
        thumbnailUrl: p,
        fileType: 'image' as const,
      }));
    }
    return [];
  }, [attachments, photos]);

  if (allAttachments.length === 0) {
    return null;
  }

  // Format file sizes into human readable units
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Truncate filename to 28 chars with ellipsis
  const truncateFilename = (name: string, maxLen = 28) => {
    if (!name) return 'file';
    if (name.length <= maxLen) return name;
    const extIdx = name.lastIndexOf('.');
    if (extIdx > 0 && name.length - extIdx <= 5) {
      const ext = name.substring(extIdx);
      const start = name.substring(0, maxLen - ext.length - 3);
      return `${start}...${ext}`;
    }
    return name.substring(0, maxLen - 3) + '...';
  };

  // Icon selector
  const renderTypeIcon = (att: Attachment) => {
    if (att.fileType === 'image' || att.mime_type.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-sky-600 shrink-0" />;
    }
    if (att.fileType === 'pdf' || att.mime_type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600 shrink-0" />;
    }
    if (
      att.fileType === 'doc' ||
      att.mime_type.includes('word') ||
      att.mime_type.includes('document')
    ) {
      return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
    }
    if (att.fileType === 'audio' || att.mime_type.startsWith('audio/')) {
      return <FileAudio className="w-5 h-5 text-amber-600 shrink-0" />;
    }
    return <File className="w-5 h-5 text-slate-500 shrink-0" />;
  };

  // Audio Playback Simulation
  const toggleAudioPlay = (attId: string) => {
    if (activePlayingAudioId === attId) {
      setActivePlayingAudioId(null);
    } else {
      setActivePlayingAudioId(attId);
      // Simulate playback progress
      let p = 0;
      const interval = setInterval(() => {
        p += 5;
        if (p > 100) {
          clearInterval(interval);
          setActivePlayingAudioId(null);
          setAudioProgress((prev) => ({ ...prev, [attId]: 0 }));
        } else {
          setAudioProgress((prev) => ({ ...prev, [attId]: p }));
        }
      }, 300);
    }
  };

  const handleDownload = (e: React.MouseEvent, att: Attachment) => {
    e.stopPropagation();
    if (att.scan_status === 'INFECTED') {
      alert('Security violation: Infected files cannot be downloaded.');
      return;
    }

    // In a real environment, Content-Disposition: attachment header is sent by S3.
    // For this prototype, we simulate browser download.
    const element = document.createElement('a');
    element.setAttribute('href', att.url || '#');
    element.setAttribute('download', att.original_filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    if (att.url && att.url.startsWith('data:')) {
      element.click();
    } else {
      // Simulate download feedback
      alert(`Downloading "${att.original_filename}" (Content-Disposition: attachment; size: ${formatSize(att.size_bytes)})`);
    }
    document.body.removeChild(element);
  };

  const handleCardClick = (att: Attachment) => {
    if (att.scan_status === 'INFECTED') {
      return;
    }
    if (att.fileType === 'image' || att.mime_type.startsWith('image/')) {
      setSelectedLightboxImage({
        url: att.url || att.thumbnailUrl || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop',
        filename: att.original_filename,
      });
    } else if (att.fileType === 'pdf' || att.mime_type.includes('pdf')) {
      setSelectedPdfDoc({
        url: att.url,
        filename: att.original_filename,
        sizeBytes: att.size_bytes,
        scanStatus: att.scan_status,
      });
    } else if (att.fileType === 'audio' || att.mime_type.startsWith('audio/')) {
      toggleAudioPlay(att.id);
    } else {
      // Document or generic file
      setSelectedPdfDoc({
        url: att.url,
        filename: att.original_filename,
        sizeBytes: att.size_bytes,
        scanStatus: att.scan_status,
      });
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          {title} ({allAttachments.length})
        </h4>

        {/* Security badge for confidential / safeguarding track */}
        {(track === 'CONFIDENTIAL' || track === 'SAFEGUARDING') && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
            <Lock className="w-3 h-3 text-purple-700" />
            CSFLE Encrypted at Rest (AES-256)
          </span>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allAttachments.map((att) => {
          const isInfected = att.scan_status === 'INFECTED';
          const isPending = att.scan_status === 'PENDING';
          const isClean = att.scan_status === 'CLEAN';
          const isAudio = att.fileType === 'audio' || att.mime_type.startsWith('audio/');
          const isPlaying = activePlayingAudioId === att.id;
          const progress = audioProgress[att.id] || 0;

          return (
            <div
              key={att.id}
              id={`attachment-card-${att.id}`}
              onClick={() => handleCardClick(att)}
              className={`relative rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                isInfected
                  ? 'bg-red-50/70 border-red-300 ring-1 ring-red-400/30 cursor-not-allowed opacity-95'
                  : isPending
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:shadow-xs cursor-pointer'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer'
              }`}
            >
              {/* Header: Icon, filename, size */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isInfected
                        ? 'bg-red-100 text-red-700'
                        : isPending
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100'
                    }`}
                  >
                    {isInfected ? (
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    ) : (
                      renderTypeIcon(att)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate leading-snug ${
                        isInfected ? 'text-red-950 line-through' : 'text-slate-900'
                      }`}
                      title={att.original_filename}
                    >
                      {truncateFilename(att.original_filename)}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{formatSize(att.size_bytes)}</span>
                      {att.is_voice_note && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 font-semibold">Voice Note</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thumbnail Preview for Images */}
                {(att.fileType === 'image' || att.mime_type.startsWith('image/')) &&
                  !isInfected && (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
                      <img
                        src={
                          att.thumbnailUrl ||
                          att.url ||
                          'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop'
                        }
                        alt={att.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                {/* Audio Inline Player */}
                {isAudio && !isInfected && (
                  <div
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAudioPlay(att.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors ${
                          isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <div className="flex-1">
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-600 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {isPlaying ? `${Math.round((progress / 100) * 45)}s` : '0:45'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Security / Infected Warning Alert Box */}
                {isInfected && (
                  <div className="p-2 rounded-lg bg-red-100/90 border border-red-300 text-[11px] text-red-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      <span>Security Threat Quarantined</span>
                    </div>
                    <p className="text-[10px] leading-tight text-red-800">
                      ClamAV signature: <code>Win.Trojan.CVE-2024-Exploit</code>. File downloads and execution permanently blocked.
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer: Scan Status Badge and Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Scan Status Badge */}
                {isClean && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    CLEAN
                  </span>
                )}

                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                    <Clock className="w-3 h-3 text-amber-600" />
                    SCANNING
                  </span>
                )}

                {isInfected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-xs">
                    <ShieldAlert className="w-3 h-3" />
                    INFECTED / BLOCKED
                  </span>
                )}

                {/* Action Buttons: View & Download */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {!isInfected && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(att);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1"
                        title="View Evidence"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, att)}
                        className="px-2 py-1 rounded text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:bg-sky-50 transition-colors flex items-center gap-1"
                        title="Download (Presigned S3 Attachment)"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </>
                  )}

                  {isInfected && (
                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">
                      Disabled
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal for Images */}
      {selectedLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-mono font-semibold">{selectedLightboxImage.filename}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLightboxImage(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-2 flex items-center justify-center bg-black/50 overflow-auto">
              <img
                src={selectedLightboxImage.url}
                alt={selectedLightboxImage.filename}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF / Document Viewer Modal */}
      {selectedPdfDoc && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPdfDoc(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-bold truncate max-w-md">{selectedPdfDoc.filename}</h3>
                  <p className="text-[11px] text-slate-400">
                    Document Viewer · {formatSize(selectedPdfDoc.sizeBytes)} · ClamAV Clean
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    alert(`Downloading verified copy of "${selectedPdfDoc.filename}"`);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPdfDoc(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Simulation Canvas */}
            <div className="p-8 bg-slate-100 flex flex-col items-center justify-center min-h-[360px] space-y-4">
              <div className="w-full max-w-xl bg-white rounded-lg shadow-sm border border-slate-300 p-8 space-y-6 text-slate-800">
                <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                  <div className="font-bold text-slate-900 font-mono text-sm">
                    AAS LAB / MTJ FOUNDATION
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">CONFIDENTIAL RECORD</span>
                </div>

                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-full animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-5/6 animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-2/3 animate-pulse" />
                </div>

                <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Document Security Signature:</p>
                  <p className="font-mono text-[10px] break-all text-slate-500">
                    SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Verified Clean by ClamAV Antivirus Daemon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
