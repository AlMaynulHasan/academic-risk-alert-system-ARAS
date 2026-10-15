# Backend Architecture: Cloud Functions, Triggers, & Quota Security

## 1. Architectural Boundaries

To resolve audit findings and provide a verifiable trust boundary, the Academic Risk Alert System distinguishes four execution tiers:

| Execution Tier | Component / File | Trust Level | Description |
| :--- | :--- | :--- | :--- |
| **Client UI Event Bus** | `src/shared/services/hooks.ts` | Client Memory | Fast in-browser pub/sub for immediate UI reactivity within the same tab. *Not a server trigger.* |
| **Cross-Client Sync** | `src/shared/services/realtimeSync.ts` | Client / Firestore Snapshot | Firestore `onSnapshot` listeners that react to remote mutations in `attendanceRecords` and `marks` across browser sessions. Idempotent and debounced. |
| **Trusted App Server** | `server.ts` | Trusted Full-Stack Server | Express server providing `/api/alerts/deliver` and `/api/scheduler/run-risk-job` endpoints. Handles atomic quota reservation and rate limits. |
| **Cloud Functions (Serverless)** | `functions/src/index.ts` | Authoritative Serverless | Firebase Cloud Functions with native Firestore document triggers (`onWrite`) and Pub/Sub cron scheduling (`onSchedule`). |

---

## 2. Cloud Functions Specifications

The serverless codebase is maintained in `/functions`:

### A. Automatic Cross-Client Database Triggers
1. **`onAttendanceWritten` (`functions.firestore.document('attendanceRecords/{recordId}').onWrite`)**:
   - Triggers automatically whenever an attendance record is created, edited, or removed by any user or batch script.
   - De-duplicates events via `systemTriggerEvents` to prevent recursive re-evaluation loops.
   - Schedules risk recalculation reading exclusively from persisted records.

2. **`onMarkWritten` (`functions.firestore.document('marks/{recordId}').onWrite`)**:
   - Triggers automatically upon assessment score entry or update.
   - Evaluates whether new marks affect continuous evaluation averages.

### B. Trusted Quota Decision Function
3. **`dispatchRiskAlertCallable` (`functions.https.onCall`)**:
   - Executes inside a Cloud Firestore transaction (`db.runTransaction`).
   - Resolves the calendar month in `Asia/Dhaka` (UTC+6).
   - Validates that `inAppCount < 2` before authorizing an alert delivery.
   - Suppresses duplicate identical risk levels and retries of the same assessment event.
   - Increments the quota counter only after both `alertDeliveries` and `notifications` succeed.
   - Completely exempts deadline reminders (`category: 'assignment'`), which never increment quota counters.

### C. Genuine Scheduled Nightly Risk Job
4. **`scheduledRiskJob` (`functions.pubsub.schedule('0 2 * * *').timeZone('Asia/Dhaka')`)**:
   - Executes nightly at 02:00 AM in `Asia/Dhaka`.
   - Sweeps all enrolled active students across courses.
   - Re-evaluates risk and executes idempotent alert dispatch subject to monthly quotas.

---

## 3. Quota Algorithm & Asia/Dhaka Calendar Period

* **Period Format**: `YYYY-MM` evaluated strictly in the `Asia/Dhaka` timezone (`Intl.DateTimeFormat` with `timeZone: 'Asia/Dhaka'`).
* **Document Key**: `alertCounters/${studentId}_${currentPeriod}` (e.g., `std_123_2026-10`).
* **Ceiling**: Maximum 2 academic risk alerts per student per period.
* **Failure Safety**: If notification delivery fails or throws a network error, the counter is rolled back and is never incremented.

---

## 4. Firestore Security Rules Hardening

The security rules in `firestore.rules` have been updated and deployed:
* **`alertCounters`**:
  ```
  match /alertCounters/{counterId} {
    allow read: if isSignedIn() && (isAdmin() || isTeacher() || resource.data.studentId == request.auth.uid);
    allow write: if isAdmin(); // Clients cannot forge or decrement counters
  }
  ```
* **`alertDeliveries`**:
  ```
  match /alertDeliveries/{deliveryId} {
    allow read: if isSignedIn() && (resource.data.studentId == request.auth.uid || isTeacher() || isAdmin());
    allow create: if isTeacher() || isAdmin(); // Ordinary students cannot forge alert records
    allow update: if isSignedIn() && (isAdmin() || (resource.data.studentId == request.auth.uid && incoming().status == 'acknowledged'));
    allow delete: if isAdmin();
  }
  ```

---

## 5. Deployment Prerequisites & Commands

Deploying Cloud Functions to Google Cloud requires:
1. **Google Cloud Project with Blaze (Pay-as-you-go) Plan** enabled (required by Google for Cloud Functions deployment).
2. **Firebase CLI**:
   ```bash
   firebase login
   firebase use ai-studio-academicriskaler-754be093-b6cf-4397-97a0-eab367465887
   ```
3. **Deploy Functions & Rules**:
   ```bash
   cd functions && npm install && npm run build
   firebase deploy --only functions,firestore:rules
   ```
4. **Local Emulator Testing**:
   ```bash
   firebase emulators:start --only firestore,functions
   ```

*Note: In environments where live Cloud Functions deployment credentials or billing are unavailable, the application runs its trusted backend API through `server.ts` (`/api/alerts/deliver` and `/api/scheduler/run-risk-job`), supported by `scripts/testHardenRiskAlerts.ts` and `scripts/runScheduledRiskJob.ts`.*
