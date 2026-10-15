# Academic Risk Engine Specification
**Author & Owner**: Developer 2: Md. Al Arafat abir  
**Status**: Provisional Specification (Config Version `1.0.0`)  
**Design Philosophy**: Rule-based, transparent, deterministic. No AI or machine learning algorithms are utilized.

---

## 1. Input Data & Validation
The risk evaluation engine consumes academic records via `AcademicRecordService`:
1. **Attendance Records (`attendanceRecords`)**:
   - Filtered per enrollment for the current semester.
   - Statuses evaluated: `present` (weight 1.0), `late` (weight 0.5), `excused` (weight 1.0), `absent` (weight 0.0).
   - Validated against non-future dates in `Asia/Dhaka` local calendar.
2. **Assessment Marks (`marks` & `assessments`)**:
   - Obtained marks normalized against assessment `maxMarks`.
   - **Missing Data Policy**: Unrecorded marks (`obtainedMarks === null`) are NEVER coerced to 0. They are treated as missing submissions in the completion component, but excluded from continuous grade averages.
   - Evaluated marks of `0` are genuine zero scores and included in continuous averages.
3. **Deadlines (`deadlines`)**:
   - Course deliverables and submission due dates.

---

## 2. Risk Scoring Formula (Provisional v1.0.0)

Risk is evaluated across four distinct sub-components, each normalized to a $[0, 100]$ risk scale ($0 = \text{no risk}$, $100 = \text{maximum critical risk}$):

### Component 1: Attendance Risk ($R_{att} \in [0, 100]$)
Let $A$ be the overall attendance rate ($0 - 100\%$):
- If $A \ge 85\%$: $R_{att} = 0$
- If $75\% \le A < 85\%$: $R_{att} = 35 \times \frac{85 - A}{10}$ (Mild risk)
- If $60\% \le A < 75\%$: $R_{att} = 35 + 30 \times \frac{75 - A}{15}$ (Medium risk)
- If $A < 60\%$: $R_{att} = 65 + 35 \times \min\left(1, \frac{60 - A}{60}\right)$ (High risk)

### Component 2: Marks Risk ($R_{marks} \in [0, 100]$)
Let $M$ be the weighted continuous marks average ($0 - 100\%$) across all graded assessments:
- If $M \ge 70\%$: $R_{marks} = 0$
- If $50\% \le M < 70\%$: $R_{marks} = 35 \times \frac{70 - M}{20}$ (Mild risk)
- If $40\% \le M < 50\%$: $R_{marks} = 35 + 30 \times \frac{50 - M}{10}$ (Medium risk)
- If $M < 40\%$: $R_{marks} = 65 + 35 \times \min\left(1, \frac{40 - M}{40}\right)$ (High risk)
- *If no assessments have been graded yet, $R_{marks}$ has no data.*

### Component 3: Assignment Completion Risk ($R_{comp} \in [0, 100]$)
Let $U$ be the number of past-due unsubmitted or unrecorded assessments ($U \ge 0$):
- If $U == 0$: $R_{comp} = 0$
- If $U == 1$: $R_{comp} = 30$
- If $U == 2$: $R_{comp} = 55$
- If $U \ge 3$: $R_{comp} = \min(100, 65 + 15 \times (U - 2))$ (High risk)

### Component 4: Grade Trend Risk ($R_{trend} \in [0, 100]$)
Compares assessment scores in the first half of the semester ($M_{early}$) with the second half ($M_{recent}$):
Let $\Delta = M_{early} - M_{recent}$ (score drop):
- If $\Delta \le 0$ (performance improving or stable): $R_{trend} = 0$
- If $0 < \Delta \le 15$: $R_{trend} = 35 \times \frac{\Delta}{15}$
- If $15 < \Delta \le 30$: $R_{trend} = 35 + 30 \times \frac{\Delta - 15}{15}$
- If $\Delta > 30$: $R_{trend} = \min(100, 65 + 35 \times \frac{\Delta - 30}{30})$
- *If fewer than 2 graded assessments exist, $R_{trend}$ has no data.*

---

## 3. Dynamic Weight Renormalization & Insufficient Data Policy

Nominal weights:
- $W_{att} = 0.35$ (35%)
- $W_{marks} = 0.35$ (35%)
- $W_{comp} = 0.15$ (15%)
- $W_{trend} = 0.15$ (15%)
- Total = $1.00$

### Insufficient Data Threshold
To avoid guessing or generating false alarms during the early days of a semester:
- At least **2 components** must possess valid data.
- If fewer than 2 components have data, the system classifies the student as:
  - `isSufficientData = false`
  - `riskLevel = 'Low'` (or displayed as `"Insufficient data"`)
  - Score is `null`.

### Dynamic Renormalization
When $\ge 2$ components have data:
Let $\mathcal{A}$ be the set of available components.
The sum of available weights is $S_W = \sum_{k \in \mathcal{A}} W_k$.
The normalized weight for each component is:
$$w'_k = \frac{W_k}{S_W}$$
The composite risk score is:
$$\text{Score} = \sum_{k \in \mathcal{A}} w'_k \times R_k \quad (\text{rounded to 1 decimal place})$$

---

## 4. Risk Level Thresholds
- **Low Risk**: $\text{Score} < 35.0$
- **Medium Risk**: $35.0 \le \text{Score} < 65.0$
- **High Risk**: $\text{Score} \ge 65.0$

Boundary cases:
- 34.9 -> `Low`
- 35.0 -> `Medium`
- 64.9 -> `Medium`
- 65.0 -> `High`

---

## 5. Structured Reason Generation
Every rule trigger produces an explicit, plain-English reason object:
```typescript
export interface RiskReason {
  component: 'attendance' | 'marks' | 'completion' | 'trend';
  courseId?: string;
  courseCode?: string;
  observed: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
}
```
Example messages:
- Attendance: `"Attendance in CSE-311 is 58.0%, which is below the 75% required policy threshold."`
- Marks: `"Continuous assessment average is 38.5%, falling into the high risk bracket (<40%)."`
- Completion: `"Student has 3 unsubmitted or missing assessments."`
- Trend: `"Performance has dropped by 18.0% between earlier and recent assessments."`

---

## 6. Monthly Alert Rate Limit & Concurrency Policy
**Top Engineering Invariant**:
No student may receive more than **2 risk alerts** in any single calendar month in the `Asia/Dhaka` timezone.

1. **Transaction Isolation**:
   - `tryDeliverRiskAlert(studentId, assessmentId)` executes inside a single Cloud Firestore atomic transaction (`runTransaction`).
2. **Quota Counter**:
   - Keyed per student per month: `alertCounters/${studentId}_${YYYY-MM}` where `${YYYY-MM}` is calculated strictly in `Asia/Dhaka`.
   - If `inAppCount >= 2`, the transaction immediately aborts delivery with `{ delivered: false, reason: 'MONTHLY_QUOTA_EXCEEDED' }`.
3. **Duplicate Unchanged Suppression**:
   - If the student's risk level and primary reasons are identical to the last delivered alert, delivery is suppressed unless the risk level has escalated (e.g. Medium -> High).
4. **Delivery vs Failure Counting**:
   - An alert counts towards the quota **only** when the delivery succeeds and the in-app notification document is created (`status: 'delivered'`).
   - Failed attempts (`status: 'failed'`) do **not** increment the counter.
5. **Idempotency**:
   - Each attempt checks `idempotencyKey` (`${studentId}_${assessmentId}`). Repeated calls with the same key do not double-increment.
6. **Deadline Reminders**:
   - Deadline notifications use `category: 'assignment'` and never touch `alertCounters`.
