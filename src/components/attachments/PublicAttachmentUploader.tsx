import React, { useState, useRef } from 'react';
import {
  Camera,
  Paperclip,
  FileImage,
  FileText,
  FileAudio,
  File,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Language, translations } from '../../translations';
import { Attachment } from '../../types';

interface PublicAttachmentUploaderProps {
  lang: Language;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  onPhotosSync?: (photoUrls: string[]) => void;
}

interface UploadProgressItem {
  id: string;
  progress: number;
  completed: boolean;
}

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB

export function PublicAttachmentUploader({
  lang,
  attachments,
  setAttachments,
  onPhotosSync,
}: PublicAttachmentUploaderProps) {
  const t = translations[lang];
  const isRtl = lang === 'ur';

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingMap, setUploadingMap] = useState<Record<string, number>>({});

  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Truncate filename to 28 characters
  const truncateFilename = (name: string, max = 28) => {
    if (!name) return 'file';
    if (name.length <= max) return name;
    const extIdx = name.lastIndexOf('.');
    if (extIdx > 0 && name.length - extIdx <= 5) {
      const ext = name.substring(extIdx);
      const start = name.substring(0, max - ext.length - 3);
      return `${start}...${ext}`;
    }
    return name.substring(0, max - 3) + '...';
  };

  // Detect file category from name / mime
  const getFileType = (file: File): 'image' | 'pdf' | 'doc' | 'audio' | 'other' => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || file.type.startsWith('image/')) {
      return 'image';
    }
    if (ext === 'pdf' || file.type.includes('pdf')) {
      return 'pdf';
    }
    if (['doc', 'docx'].includes(ext) || file.type.includes('word') || file.type.includes('document')) {
      return 'doc';
    }
    if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext) || file.type.startsWith('audio/')) {
      return 'audio';
    }
    return 'other';
  };

  const isAcceptedType = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validExtensions = [
      'jpg', 'jpeg', 'png', 'webp', 'heic',
      'pdf', 'doc', 'docx',
      'mp3', 'm4a', 'ogg', 'wav',
    ];
    return validExtensions.includes(ext) ||
      file.type.startsWith('image/') ||
      file.type.startsWith('audio/') ||
      file.type === 'application/pdf' ||
      file.type.includes('word');
  };

  const processFiles = (rawFiles: FileList | File[]) => {
    setErrorMessage(null);
    const incoming = Array.from(rawFiles);
    if (incoming.length === 0) return;

    // Check count limit
    if (attachments.length + incoming.length > MAX_FILES) {
      setErrorMessage(t.errMaxFilesReached);
      return;
    }

    // Current total size
    const currentTotalSize = attachments.reduce((sum, item) => sum + item.size_bytes, 0);
    let cumulativeSize = currentTotalSize;

    const validNewAttachments: Attachment[] = [];

    for (const file of incoming) {
      // Check file type
      if (!isAcceptedType(file)) {
        setErrorMessage(
          lang === 'ur'
            ? `فائل "${truncateFilename(file.name, 18)}" کی قسم نامنظور ہے۔ صرف تصاویر، دستاویزات اور آڈیو کی اجازت ہے۔`
            : `File "${truncateFilename(file.name, 18)}" has an unsupported format.`
        );
        return;
      }

      // Check single file size limit
      if (file.size > MAX_FILE_BYTES) {
        setErrorMessage(
          lang === 'ur'
            ? `فائل "${truncateFilename(file.name, 18)}" کا سائز 10 MB سے زیادہ ہے (${formatSize(file.size)})`
            : `File "${truncateFilename(file.name, 18)}" exceeds 10 MB limit (${formatSize(file.size)})`
        );
        return;
      }

      cumulativeSize += file.size;
      if (cumulativeSize > MAX_TOTAL_BYTES) {
        setErrorMessage(t.errTotalTooLarge);
        return;
      }

      const fileType = getFileType(file);
      const uuid = 'att-' + Math.random().toString(36).substring(2, 11);

      // Create Attachment object
      const newAtt: Attachment = {
        id: uuid,
        complaint_id: 'pending-submit',
        storage_key: `uploads/${new Date().getFullYear()}/${uuid}`,
        original_filename: file.name,
        mime_type: file.type || `application/x-${file.name.split('.').pop()}`,
        size_bytes: file.size,
        scan_status: 'CLEAN',
        scan_timestamp: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        is_voice_note: false,
        fileType,
      };

      validNewAttachments.push(newAtt);
    }

    // Add and start simulated upload progress for each file
    validNewAttachments.forEach((att, index) => {
      const file = incoming[index];
      // Read data URL for images so thumbnail works immediately
      if (att.fileType === 'image') {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            att.url = reader.result as string;
            att.thumbnailUrl = reader.result as string;
            setAttachments((prev) => {
              const updated = [...prev, att];
              if (onPhotosSync) {
                const imgUrls = updated
                  .filter((a) => a.fileType === 'image' && a.thumbnailUrl)
                  .map((a) => a.thumbnailUrl as string);
                onPhotosSync(imgUrls);
              }
              return updated;
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Mock blob url for docs / audio
        att.url = URL.createObjectURL(file);
        setAttachments((prev) => [...prev, att]);
      }

      // Simulate progressive upload animation
      setUploadingMap((prev) => ({ ...prev, [att.id]: 15 }));
      let p = 20;
      const progressTimer = setInterval(() => {
        p += Math.floor(Math.random() * 25) + 15;
        if (p >= 100) {
          clearInterval(progressTimer);
          setUploadingMap((prev) => {
            const next = { ...prev };
            delete next[att.id];
            return next;
          });
        } else {
          setUploadingMap((prev) => ({ ...prev, [att.id]: p }));
        }
      }, 100);
    });
  };

  const handleRemove = (id: string) => {
    setAttachments((prev) => {
      const nextList = prev.filter((a) => a.id !== id);
      if (onPhotosSync) {
        const imgUrls = nextList
          .filter((a) => a.fileType === 'image' && a.thumbnailUrl)
          .map((a) => a.thumbnailUrl as string);
        onPhotosSync(imgUrls);
      }
      return nextList;
    });
    setUploadingMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setErrorMessage(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-5 h-5 text-sky-600 shrink-0" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600 shrink-0" />;
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <File className="w-5 h-5 text-stone-500 shrink-0" />;
    }
  };

  const currentTotalBytes = attachments.reduce((acc, a) => acc + a.size_bytes, 0);

  return (
    <div className="space-y-3 pt-2">
      {/* Hidden native inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        capture="environment"
        multiple
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.mp3,.m4a,.ogg,.wav,image/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onChange={(e) => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Label & Limits Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-stone-600" />
          <span>{t.attachmentSectionTitle}</span>
        </label>
        <span className="text-xs font-semibold text-stone-600">
          {attachments.length} / {MAX_FILES} ({formatSize(currentTotalBytes)})
        </span>
      </div>

      {/* Side-by-side action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Button 1: Take or choose photo */}
        <button
          type="button"
          onClick={() => {
            if (attachments.length >= MAX_FILES) {
              setErrorMessage(t.errMaxFilesReached);
              return;
            }
            photoInputRef.current?.click();
          }}
          disabled={attachments.length >= MAX_FILES}
          className="min-h-[48px] px-3.5 py-2.5 rounded-lg border-2 border-stone-300 hover:border-emerald-700 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        >
          <Camera className="w-4 h-4 text-emerald-800 shrink-0" />
          <span>{t.takeOrChoosePhoto}</span>
        </button>

        {/* Button 2: Attach a file */}
        <button
          type="button"
          onClick={() => {
            if (attachments.length >= MAX_FILES) {
              setErrorMessage(t.errMaxFilesReached);
              return;
            }
            fileInputRef.current?.click();
          }}
          disabled={attachments.length >= MAX_FILES}
          className="min-h-[48px] px-3.5 py-2.5 rounded-lg border-2 border-stone-300 hover:border-sky-700 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        >
          <Paperclip className="w-4 h-4 text-sky-800 shrink-0" />
          <span>{t.attachFile}</span>
        </button>
      </div>

      {/* Desktop Drag-and-Drop Zone & Format Disclaimers */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-3 text-center transition-colors ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
            : 'border-stone-300 bg-stone-50 text-stone-600'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <UploadCloud
            className={`w-5 h-5 ${isDragging ? 'text-emerald-700 animate-bounce' : 'text-stone-400'}`}
          />
          <p className="text-xs font-medium">
            {isDragging ? t.dragDropActive : t.dragDropPrompt}
          </p>
          <div className="text-[11px] text-stone-700 space-y-0.5 mt-0.5">
            <p>{t.acceptedFormatsNote}</p>
            <p className="font-semibold text-stone-700">{t.attachmentLimitsNote}</p>
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment List UI */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-stone-700">
            {t.attachmentsCountLabel} ({attachments.length})
          </div>

          <div className="space-y-1.5">
            {attachments.map((att) => {
              const isUploading = uploadingMap[att.id] !== undefined;
              const progress = uploadingMap[att.id] || 100;

              return (
                <div
                  key={att.id}
                  className="rounded-lg border border-stone-200 bg-white p-2.5 transition-all flex flex-col gap-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Thumbnail preview for images or icon for others */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {att.fileType === 'image' && att.thumbnailUrl ? (
                        <div className="w-10 h-10 rounded border border-stone-200 overflow-hidden shrink-0 bg-stone-100">
                          <img
                            src={att.thumbnailUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center shrink-0">
                          {renderIcon(att.fileType)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold text-stone-900 truncate"
                          title={att.original_filename}
                        >
                          {truncateFilename(att.original_filename, 28)}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          <span>{formatSize(att.size_bytes)}</span>
                          <span>·</span>
                          {isUploading ? (
                            <span className="text-sky-700 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" />
                              {progress}%
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              {lang === 'ur' ? 'محفوظ (Clean)' : 'Clean'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemove(att.id)}
                      className="w-7 h-7 rounded-md hover:bg-red-50 text-stone-400 hover:text-red-700 flex items-center justify-center transition-colors shrink-0"
                      title={t.removeFile}
                      aria-label={t.removeFile}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Animated Upload Progress Bar */}
                  {isUploading && (
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-200 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
