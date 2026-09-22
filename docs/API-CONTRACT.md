# REST API Contract Specification

This document specifies the complete REST API interface for the MTJ Complaint Management System, designed for implementation by the backend MERN engineering team.

---

## 1. Global Conventions

- **Base URL**: `/api/v1`
- **Response Format**: Strict JSON wrapping:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "timestamp": "2026-09-13T10:00:00Z"
  }
  ```
- **Error Format**:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "FORBIDDEN_CONFLICT_OF_INTEREST",
      "message": "You are excluded from this case due to a recorded conflict."
    }
  }
  ```
- **Authentication**: `Authorization: Bearer <jwt_access_token>` in HTTP headers.

---

## 2. Public Endpoints (Unauthenticated)

### 2.1 Get Location Details by Code
- **Method**: `GET`
- **Path**: `/public/locations/:code`
- **Auth**: None (Public)
- **Response**:
  ```json
  {
    "code": "AAS-KHN-01",
    "name": {
      "en": "AAS Lab Collection Centre, Khanewal Road",
      "ur": "اے اے ایس کلیکشن سینٹر، خانیوال روڈ ملتان"
    },
    "entity": "AAS_LAB",
    "type": "Collection Centre",
    "city": "Multan",
    "active": true
  }
  ```

---

### 2.2 Submit a New Complaint
- **Method**: `POST`
- **Path**: `/public/complaints`
- **Auth**: None (Public)
- **Rate Limit**: 3 submissions per IP per 10 minutes.
- **Request Body**:
  ```json
  {
    "locationCode": "AAS-KHN-01",
    "category": "Report delay",
    "track": "SERVICE",
    "submitterType": "Patient",
    "isAboutPersonInCharge": false,
    "safeguardingPersonName": null,
    "text": "Report delay for blood test conducted yesterday morning.",
    "voiceNoteDurationSeconds": 24,
    "voiceNoteBase64": "data:audio/webm;base64,...",
    "photos": ["data:image/jpeg;base64,..."],
    "isAnonymous": false,
    "contactName": "Tariq Mehmood",
    "contactPhone": "+923001234567",
    "notifyWhatsApp": true
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "ticketCode": "MTJ-8X9P2K",
    "ackDeadlineAt": "2026-09-14T08:00:00Z",
    "resolveDeadlineAt": "2026-09-16T18:00:00Z",
    "trackingUrl": "https://complaints.mtjfoundation.org/t/MTJ-8X9P2K"
  }
  ```

---

### 2.3 Public Ticket Tracking
- **Method**: `GET`
- **Path**: `/public/track/:ticketCode`
- **Auth**: None (Public)
- **Privacy Enforcement**: Internal notes, staff identities, and safeguarding specifics are completely scrubbed.
- **Response**:
  ```json
  {
    "ticketCode": "MTJ-8X9P2K",
    "status": "IN_PROGRESS",
    "category": "Report delay",
    "locationName": {
      "en": "AAS Lab Collection Centre, Khanewal Road",
      "ur": "اے اے ایس کلیکشن سینٹر، خانیوال روڈ ملتان"
    },
    "createdAt": "2026-09-13T08:15:00Z",
    "ackDeadlineAt": "2026-09-14T08:00:00Z",
    "resolveDeadlineAt": "2026-09-16T18:00:00Z",
    "timeline": [
      {
        "status": "SUBMITTED",
        "timestamp": "2026-09-13T08:15:00Z"
      },
      {
        "status": "ACKNOWLEDGED",
        "timestamp": "2026-09-13T09:30:00Z"
      }
    ],
    "publicUpdates": [
      {
        "textEn": "Specimen is currently undergoing re-analysis under Lab QA supervision.",
        "textUr": "سیمپل کا لیب کوالٹی کنٹرول کی زیر نگرانی دوبارہ معائنہ کیا جا رہا ہے۔",
        "timestamp": "2026-09-13T10:00:00Z"
      }
    ]
  }
  ```

---

## 3. Authenticated Staff Endpoints

### 3.1 Authentication & Session Refresh
- **Method**: `POST`
- **Path**: `/auth/login`
- **Request Body**: `{ "email": "sajid.bashir@aaslab.pk", "password": "SecurePassword123!" }`
- **Response**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": "usr_99812",
      "name": "Dr. Sajid Bashir",
      "email": "sajid.bashir@aaslab.pk",
      "persona": "TEAM_LEAD",
      "roleTitle": "Branch Manager",
      "scopeType": "LOCATION",
      "scopeValue": "AAS-KHN-01",
      "confidential_clearance": false,
      "safeguarding_acl": false
    }
  }
  ```

---

### 3.2 List Complaints (Filtered by Persona Scope & Track)
- **Method**: `GET`
- **Path**: `/complaints`
- **Auth**: Required
- **Permission Required**: `complaint.view`
- **Query Params**: `?status=IN_PROGRESS&page=1&limit=20&search=MTJ-`
- **Enforcement**: Rows outside user's scope or track clearance are excluded at the MongoDB query layer.
- **Response**:
  ```json
  {
    "total": 14,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "id": "MTJ-4K7P2X",
        "ticketCode": "MTJ-4K7P2X",
        "entity": "AAS_LAB",
        "locationCode": "AAS-KHN-01",
        "category": "Report delay",
        "track": "SERVICE",
        "status": "IN_PROGRESS",
        "severity": "HIGH",
        "ownerName": "Dr. Sajid Bashir",
        "isOverdue": false,
        "resolveDeadlineAt": "2026-09-15T18:00:00Z"
      }
    ]
  }
  ```

---

### 3.3 Triage Complaint (Severity & Assignment)
- **Method**: `PATCH`
- **Path**: `/complaints/:id/triage`
- **Auth**: Required
- **Permission Required**: `complaint.triage`
- **Request Body**:
  ```json
  {
    "severity": "HIGH",
    "assigneeUserId": "usr_44321",
    "assigneeName": "Hamza Tariq",
    "note": "Assigned to shift supervisor for urgent re-extraction."
  }
  ```
- **Validation**:
  - If `complaint.track === 'CONFIDENTIAL'`, target assignee MUST have `confidential_clearance === true`.
  - User cannot triage a complaint where they are the named subject.
- **Response**: `200 OK`

---

### 3.4 Progress Case to PENDING_CLOSURE (Handler Action)
- **Method**: `POST`
- **Path**: `/complaints/:id/submit-closure`
- **Auth**: Required
- **Permission Required**: `complaint.resolve`
- **Request Body**:
  ```json
  {
    "rootCause": "Process gap",
    "resolutionNote": "The barcode printer was misaligned, causing barcode re-scan failures. We re-printed the label and verified all assays are uploaded."
  }
  ```
- **Validation**:
  - `resolutionNote` must be at least 30 characters long.
  - Case moves strictly to `PENDING_CLOSURE`, NOT `CLOSED`.
- **Response**: `200 OK`

---

### 3.5 Approve and Close Case (Team Lead Action)
- **Method**: `POST`
- **Path**: `/complaints/:id/approve-closure`
- **Auth**: Required
- **Permission Required**: `complaint.close`
- **Request Body**:
  ```json
  {
    "approvalNote": "Reviewed sample audit logs and confirmed client received result via SMS link."
  }
  ```
- **Validation**:
  - `complaint.handled_by !== req.user.name` (Separation of duties). If the Team Lead handled the ticket, request is rejected with `403 FORBIDDEN_CANNOT_CLOSE_SELF_HANDLED`.
- **Response**: `200 OK`

---

### 3.6 Reject Complaint
- **Method**: `POST`
- **Path**: `/complaints/:id/reject`
- **Auth**: Required
- **Permission Required**: `complaint.reject`
- **Request Body**:
  ```json
  {
    "rejectionReason": "Duplicate ticket filed within 5 minutes for the same lab order number."
  }
  ```
- **Response**: `200 OK`

---

### 3.7 Add Internal Confidential Note
- **Method**: `POST`
- **Path**: `/complaints/:id/notes/internal`
- **Auth**: Required
- **Permission Required**: `complaint.note.internal`
- **Request Body**:
  ```json
  {
    "text": "Discussed with phlebotomist Tariq; sample was coagulated upon arrival."
  }
  ```
- **Response**: `201 Created`

---

### 3.8 Publish Public Bulletin Update
- **Method**: `POST`
- **Path**: `/complaints/:id/notes/public`
- **Auth**: Required
- **Permission Required**: `complaint.note.public`
- **Request Body**:
  ```json
  {
    "textEn": "Investigation initiated with lab quality officer.",
    "textUr": "لیب کوالٹی آفیسر کے ساتھ باقاعدہ تحقیقات کا آغاز کر دیا گیا ہے۔"
  }
  ```
- **Response**: `201 Created`

---

### 3.9 Executive Strategic Analytics
- **Method**: `GET`
- **Path**: `/analytics/executive`
- **Auth**: Required
- **Permission Required**: `analytics.view.strategic`
- **Query Params**: `?entity=ALL&period=90d`
- **Response**:
  ```json
  {
    "scorecard": {
      "totalThisMonth": 242,
      "changeMoM": -8.4,
      "slaCompliancePercent": 93.8,
      "avgResolutionDays": 2.1,
      "reopenRatePercent": 1.4,
      "anonymousPercent": 42.0
    },
    "weeklyTrends": [ ... ],
    "hotspots": [ ... ],
    "systemicIssues": [ ... ],
    "leadAccountability": [ ... ]
  }
  ```
