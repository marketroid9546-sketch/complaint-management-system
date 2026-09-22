# File Upload & Attachment Security Architecture

**Version:** 3.1.0  
**Scope:** Public Submission Portal, Handler Investigation Consoles, and Secure S3-Compatible Object Storage for MTJ Group (AAS Lab, MTJ Foundation, Alhasanain Schools, Alhasanain College).

---

## 1. Executive Summary & Core Directives

The MTJ Complaint Management System accepts digital evidence (photos, documents, and audio recordings) from the public and staff to substantiate grievances. Because evidence may contain sensitive whistleblower material, personal identifiable information (PII), or potentially hostile payloads, attachment processing enforces a strict **zero-trust, multi-barrier security lifecycle**.

### Non-Negotiable Security Mandates

1. **Server-Side Magic Byte Validation**: Validate all uploads by file header magic bytes (`file-type` / `libmagic`), never trusting client-provided MIME types or file extensions.
2. **Deterministic Image Re-Encoding**: All incoming raster images (`JPEG`, `PNG`, `WebP`, `HEIC`) are decoded into raw pixel buffers and re-encoded server-side via `Sharp` / `libvips` to strip malicious EXIF metadata, GPS coordinates, and embedded steganographic payloads.
3. **Whistleblower Privacy & Anonymization**: When `is_anonymous = true`, **never store or log the original filename**. The system replaces the filename with an untraceable sequence (`evidence_01.jpg`, `evidence_02.pdf`).
4. **Opaque Storage Keys & Private Buckets**: Storage keys use cryptographically random UUIDv4 identifiers within date-partitioned paths (`uploads/YYYY/MM/<uuid>.<ext>`). The storage bucket has zero public read permissions.
5. **Short-Lived Presigned URLs**: Access to files is granted solely through signed URLs expiring within **15 minutes** (`ExpiresIn: 900`).
6. **Forced Download Header**: All downloads and inline deliveries are accompanied by strict HTTP headers:
   `Content-Disposition: attachment; filename="..."` and `X-Content-Type-Options: nosniff`.
7. **Asynchronous Virus & Malware Quarantine**: Every upload passes through an isolated ClamAV scanning daemon prior to being made visible to handlers.
8. **Client-Side Field-Level Encryption (CSFLE) / Envelope Encryption**: Attachments associated with `CONFIDENTIAL` or `SAFEGUARDING` tracks are encrypted at rest using AES-256-GCM before write operations, with keys managed by AWS KMS / Cloud KMS.

---

## 2. Supported Formats and Size Quotas

### Client & Server Thresholds
* **Max files per complaint**: 5 files
* **Max size per file**: 10 MB (10,485,760 bytes)
* **Max cumulative upload per complaint**: 25 MB (26,214,400 bytes)

### Format Allowlist & Magic Bytes

| Category | Extension | Expected MIME Type | Magic Byte Signature (Hex) |
|---|---|---|---|
| **Images** | `.jpg`, `.jpeg` | `image/jpeg` | `FF D8 FF` |
| | `.png` | `image/png` | `89 50 4E 47 0D 0A 1A 0A` |
| | `.webp` | `image/webp` | `52 49 46 46 ... 57 45 42 50` |
| | `.heic` | `image/heic`, `image/heif` | `.... 66 74 79 70 68 65 69 63` (`ftypheic`) |
| **Documents** | `.pdf` | `application/pdf` | `25 50 44 46` (`%PDF`) |
| | `.doc` | `application/msword` | `D0 CF 11 E0 A1 B1 1A E1` (OLE CFB) |
| | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `50 4B 03 04` (`PK..` ZIP archive with `[Content_Types].xml`) |
| **Audio** | `.mp3` | `audio/mpeg` | `49 44 33` (`ID3`) or `FF FB` / `FF F3` |
| | `.m4a` | `audio/mp4`, `audio/x-m4a` | `.... 66 74 79 70 4D 34 41 20` (`ftypM4A `) |
| | `.ogg` | `audio/ogg` | `4F 67 67 53` (`OggS`) |
| | `.wav` | `audio/wav`, `audio/x-wav` | `52 49 46 46 ... 57 41 56 45` (`RIFF....WAVE`) |

*Executable formats (`.exe`, `.sh`, `.bat`, `.vbs`, `.js`, `.py`, `.apk`, `.jar`) and macro-enabled files (`.docm`, `.xlsm`) are rejected immediately.*

---

## 3. Upload & Ingestion Lifecycle

```
[Public User / Mobile Client]
         |
         | 1. Client validation (Count ≤ 5, File ≤ 10MB, Total ≤ 25MB)
         v
[API Gateway: POST /api/v1/complaints/:id/attachments]
         |
         | 2. Anonymize filename if is_anonymous = true
         | 3. Inspect first 4096 bytes (Magic Byte Verification)
         | 4. Reject mismatching / polyglot files
         v
[Storage Staging Pipeline]
         |
         +---> If Image: Decode to pixel buffer -> Strip EXIF/GPS -> Re-encode (Sharp/WebP/JPEG)
         |
         +---> If Confidential / Safeguarding: AES-256-GCM Envelope Encryption (KMS)
         |
         v
[Private S3 Bucket (Quarantine Prefix: uploads/quarantine/<uuid>)]
         |
         v
[Background Worker: ClamAV Daemon Scanning]
         |
         +---> INFECTED: Tag as INFECTED, quarantine permanently, trigger security alert
         |
         +---> CLEAN: Move to uploads/<uuid>, mark scan_status = CLEAN, trigger Handler Notification
```

---

## 4. Detailed Security Implementations

### 4.1. Magic Byte Inspection (Node.js Example)

```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
]);

export async function validateMagicBytes(buffer: Buffer): Promise<{ mime: string; ext: string }> {
  const result = await fileTypeFromBuffer(buffer);
  if (!result || !ALLOWED_MIME_TYPES.has(result.mime)) {
    throw new Error('FILE_TYPE_REJECTED: File magic bytes do not match permitted whitelist.');
  }
  return { mime: result.mime, ext: result.ext };
}
```

### 4.2. Image Re-Encoding & EXIF Neutralization

Even benign-looking images may carry executable exploit payloads or geolocation coordinates revealing the identity of whistleblowers.

```typescript
import sharp from 'sharp';

export async function sanitizeAndReencodeImage(inputBuffer: Buffer, mime: string): Promise<Buffer> {
  const pipeline = sharp(inputBuffer, { failOnError: true })
    .rotate() // Auto-orient based on EXIF before stripping
    .withMetadata({ exif: {} }); // Strip all GPS, author, camera, and device serial tags

  if (mime === 'image/jpeg') {
    return pipeline.jpeg({ quality: 85, progressive: true, mozjpeg: true }).toBuffer();
  } else if (mime === 'image/png') {
    return pipeline.png({ compressionLevel: 9, palette: false }).toBuffer();
  } else if (mime === 'image/webp') {
    return pipeline.webp({ quality: 85 }).toBuffer();
  }
  return inputBuffer;
}
```

### 4.3. Whistleblower Anonymization

When a complaint is submitted anonymously:
```typescript
export function sanitizeAttachmentFilename(originalName: string, index: number, isAnonymous: boolean): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'dat';
  if (isAnonymous) {
    // Zero identifiable characteristics
    return `evidence_${String(index + 1).padStart(2, '0')}.${ext}`;
  }
  // Sanitize non-anonymous filename against directory traversal & special chars
  return originalName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}
```

### 4.4. ClamAV Antivirus Daemon Integration

All incoming files enter a quarantine stage. The antivirus daemon streams the payload via `INSTREAM`:
* If clean: `scan_status = 'CLEAN'`, record `scanned_at` timestamp.
* If infected: `scan_status = 'INFECTED'`, store detection signature (e.g. `Trojan.Script.Generic`), block file access from all viewers, and notify the Security Officer.
* Files in `INFECTED` status cannot be viewed, rendered, or downloaded via the UI.

### 4.5. Envelope Encryption at Rest (CSFLE)

For complaints with `track === 'CONFIDENTIAL'` or `track === 'SAFEGUARDING'`:
1. System requests a data encryption key (DEK) from AWS KMS / Cloud KMS for key ID `alias/mtj-safeguarding-vault`.
2. The payload is encrypted with AES-256-GCM using the plaintext DEK.
3. The plaintext DEK is securely wiped from memory; the ciphertext DEK is stored alongside the encrypted payload metadata.
4. Handlers must hold `track.clearance` to request on-the-fly decryption keys.

---

## 5. Client Attachment Component Matrix

| Component | Path | Responsibility |
|---|---|---|
| `PublicAttachmentUploader` | `src/components/attachments/PublicAttachmentUploader.tsx` | Dual buttons ("Take or choose photo" + "Attach a file"), client size & quota verification, multi-language error banners, upload progress bar, and removal controls. |
| `AttachmentGallery` | `src/components/attachments/AttachmentGallery.tsx` | Investigator evidence viewer, quarantined file alert banners, image lightbox, PDF document viewer simulation, audio player, and encryption badges. |
| `translations.ts` | `src/translations.ts` | Complete English and Urdu strings for file limits, file types, scanner alerts, and quarantine notices. |

---

## 6. Audit & Compliance Timeline

Every attachment event is appended to the immutable `Complaint.auditTimeline`:
* `ATTACHMENT_UPLOADED`: Records attachment ID, sanitized filename, file size, and upload timestamp.
* `ATTACHMENT_SCANNED`: Records antivirus scan pass/quarantine result.
* `ATTACHMENT_VIEWED`: Records the exact user ID, role, and timestamp when an investigator accessed or downloaded evidence (especially crucial for Safeguarding audit trails).
