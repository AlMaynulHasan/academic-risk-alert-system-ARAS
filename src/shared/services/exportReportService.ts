import { jsPDF } from 'jspdf';

export interface AcademicReportData {
  student: {
    id: string;
    officialStudentId: string;
    displayName: string;
    email: string;
    department: string;
    batch?: string;
    section?: string;
    level?: string;
    phone?: string;
    advisorName?: string;
  };
  semester: string;
  generatedAt: string;
  kpis: {
    attendancePercentage: number;
    totalClasses: number;
    attendedClasses: number;
    absentClasses: number;
    lateClasses: number;
    excusedClasses: number;
    marksAverage: number | null;
    missingAssessmentsCount: number;
    enrolledCoursesCount: number;
    totalCredits: number;
  };
  riskStatus: {
    level: string;
    score: number | null;
    reasons: string[];
    isSufficientData: boolean;
  } | null;
  courses: Array<{
    courseCode: string;
    courseTitle: string;
    credits: number;
    percentage: number | null;
    gradedCount: number;
    totalAssessments: number;
    status?: string;
  }>;
  assessments: Array<{
    courseCode?: string;
    title: string;
    type: string;
    dueDate: string;
    maxMarks: number;
    obtainedMarks: number | null;
    percentage: number | null;
  }>;
  attendanceRecords?: Array<{
    date: string;
    courseCode?: string;
    status: string;
  }>;
}

export interface ExportOptions {
  includeAssessments?: boolean;
  includeAttendance?: boolean;
  includeRiskAudit?: boolean;
}

class ExportReportService {
  /**
   * Helper to safely format a CSV cell (escaping quotes, commas, newlines)
   */
  private escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return `"${stringValue}"`;
  }

  /**
   * Generates and downloads a complete Academic Performance Report as a CSV file.
   */
  exportToCsv(data: AcademicReportData, options: ExportOptions = {}): void {
    const {
      includeAssessments = true,
      includeAttendance = true,
      includeRiskAudit = true,
    } = options;

    const rows: string[] = [];

    // 1. Institution & Metadata Header
    rows.push('================================================================================');
    rows.push('ACADEMIC RISK ALERT SYSTEM (ARAS) - STUDENT PERFORMANCE REPORT');
    rows.push('================================================================================');
    rows.push('');
    rows.push('--- STUDENT INFORMATION ---');
    rows.push(`Student Name,${this.escapeCsv(data.student.displayName)}`);
    rows.push(`Official Student ID,${this.escapeCsv(data.student.officialStudentId)}`);
    rows.push(`Institutional Email,${this.escapeCsv(data.student.email)}`);
    rows.push(`Department,${this.escapeCsv(data.student.department)}`);
    rows.push(`Academic Level / Term,${this.escapeCsv(data.student.level || 'Undergraduate')}`);
    rows.push(`Admission Batch,${this.escapeCsv(data.student.batch || 'N/A')}`);
    rows.push(`Assigned Section,${this.escapeCsv(data.student.section || 'A')}`);
    rows.push(`Faculty Advisor,${this.escapeCsv(data.student.advisorName || 'Assigned Department Advisor')}`);
    rows.push(`Academic Semester,${this.escapeCsv(data.semester)}`);
    rows.push(`Report Generated At,${this.escapeCsv(data.generatedAt)}`);
    rows.push('');

    // 2. Executive Academic Summary KPIs
    rows.push('--- EXECUTIVE ACADEMIC SUMMARY ---');
    rows.push('Metric,Value,Benchmark / Institutional Policy');
    rows.push(
      `Early Warning Risk Level,${this.escapeCsv(data.riskStatus?.level || 'Pending Evaluation')},${this.escapeCsv(
        'Low: Satisfactory | Medium: Warning (<75% att / <50% marks) | High: Critical'
      )}`
    );
    rows.push(
      `Composite Risk Score,${this.escapeCsv(
        data.riskStatus?.score !== null && data.riskStatus?.score !== undefined
          ? `${data.riskStatus.score} / 100`
          : 'Pending'
      )},${this.escapeCsv('0-34: Safe | 35-64: Moderate Risk | 65-100: High Risk')}`
    );
    rows.push(
      `Cumulative Attendance Rate,${this.escapeCsv(`${data.kpis.attendancePercentage}%`)},${this.escapeCsv(
        'Threshold: ≥75% Required for Exam Eligibility'
      )}`
    );
    rows.push(
      `Total Class Sessions,${this.escapeCsv(data.kpis.totalClasses)},${this.escapeCsv(
        `Present: ${data.kpis.attendedClasses} | Late: ${data.kpis.lateClasses} | Absent: ${data.kpis.absentClasses} | Excused: ${data.kpis.excusedClasses}`
      )}`
    );
    rows.push(
      `Continuous Marks Average,${this.escapeCsv(
        data.kpis.marksAverage !== null ? `${data.kpis.marksAverage}%` : 'Unrecorded'
      )},${this.escapeCsv('Passing Benchmark: ≥50%')}`
    );
    rows.push(
      `Missing / Unrecorded Submissions,${this.escapeCsv(data.kpis.missingAssessmentsCount)},${this.escapeCsv(
        'Target: 0 (≥2 triggers academic risk escalation)'
      )}`
    );
    rows.push(
      `Registered Courses,${this.escapeCsv(data.kpis.enrolledCoursesCount)},${this.escapeCsv(
        `Total Term Credits: ${data.kpis.totalCredits}`
      )}`
    );
    rows.push('');

    // 3. Course-by-Course Performance Breakdown
    rows.push('--- COURSE-BY-COURSE PERFORMANCE BREAKDOWN ---');
    rows.push('Course Code,Course Title,Credits,Graded Assessments,Total Assessments,Continuous Score %,Academic Standing');
    if (data.courses.length === 0) {
      rows.push('No registered courses found for this term,,,,,,');
    } else {
      data.courses.forEach((c) => {
        let standing = 'Unrecorded';
        if (c.percentage !== null) {
          if (c.percentage >= 70) standing = 'Good Standing (Honors)';
          else if (c.percentage >= 50) standing = 'Passing';
          else standing = 'At Risk / Below Passing';
        }
        rows.push(
          `${this.escapeCsv(c.courseCode)},${this.escapeCsv(c.courseTitle)},${this.escapeCsv(c.credits)},${this.escapeCsv(
            c.gradedCount
          )},${this.escapeCsv(c.totalAssessments)},${this.escapeCsv(
            c.percentage !== null ? `${c.percentage}%` : 'Pending'
          )},${this.escapeCsv(standing)}`
        );
      });
    }
    rows.push('');

    // 4. Continuous Assessments Table (Optional)
    if (includeAssessments) {
      rows.push('--- DETAILED CONTINUOUS ASSESSMENTS LOG ---');
      rows.push('Course Code,Assessment Title,Evaluation Type,Due Date,Maximum Marks,Obtained Marks,Score %,Evaluation Status');
      if (data.assessments.length === 0) {
        rows.push('No continuous assessments recorded,,,,,,,');
      } else {
        data.assessments.forEach((a) => {
          const isGraded = a.obtainedMarks !== null && a.obtainedMarks !== undefined;
          rows.push(
            `${this.escapeCsv(a.courseCode || 'N/A')},${this.escapeCsv(a.title)},${this.escapeCsv(a.type)},${this.escapeCsv(
              a.dueDate
            )},${this.escapeCsv(a.maxMarks)},${this.escapeCsv(isGraded ? a.obtainedMarks : 'N/A')},${this.escapeCsv(
              a.percentage !== null ? `${a.percentage}%` : 'Pending'
            )},${this.escapeCsv(isGraded ? 'Graded' : 'Unrecorded / Missing')}`
          );
        });
      }
      rows.push('');
    }

    // 5. Attendance Session Logs (Optional)
    if (includeAttendance && data.attendanceRecords && data.attendanceRecords.length > 0) {
      rows.push('--- ATTENDANCE SESSIONS LOG ---');
      rows.push('Date,Course Code,Attendance Status');
      data.attendanceRecords.forEach((att) => {
        rows.push(`${this.escapeCsv(att.date)},${this.escapeCsv(att.courseCode || 'General')},${this.escapeCsv(att.status.toUpperCase())}`);
      });
      rows.push('');
    }

    // 6. Early Risk Warning Triggers & Advising Notes (Optional)
    if (includeRiskAudit && data.riskStatus?.reasons && data.riskStatus.reasons.length > 0) {
      rows.push('--- ACTIVE ADVISORY SIGNALS & AUDIT TRIGGERS ---');
      rows.push('Trigger Item,Signal Description');
      data.riskStatus.reasons.forEach((reason, idx) => {
        rows.push(`${idx + 1},${this.escapeCsv(reason)}`);
      });
      rows.push('');
    }

    rows.push('================================================================================');
    rows.push('END OF REPORT - CONFIDENTIAL ACADEMIC DOCUMENTATION');
    rows.push('================================================================================');

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const cleanId = data.student.officialStudentId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Academic_Performance_Report_${cleanId}_${dateStr}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates and downloads a clean, multi-page vector PDF Academic Performance Report using jsPDF.
   */
  exportToPdf(data: AcademicReportData, options: ExportOptions = {}): void {
    const {
      includeAssessments = true,
      includeRiskAudit = true,
    } = options;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    // Helper: check page space, add page if needed
    const ensureSpace = (requiredMm: number) => {
      if (y + requiredMm > pageHeight - 18) {
        doc.addPage();
        y = 16;
        renderHeaderBanner(false);
      }
    };

    // Helper: Header Banner
    const renderHeaderBanner = (isFirstPage: boolean) => {
      // Top Navy Bar
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, y, contentWidth, isFirstPage ? 18 : 10, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isFirstPage ? 13 : 9);
      doc.text(
        'ACADEMIC RISK ALERT SYSTEM (ARAS) - PERFORMANCE REPORT',
        margin + 4,
        y + (isFirstPage ? 11 : 7)
      );

      if (isFirstPage) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('OFFICIAL INSTITUTIONAL ACADEMIC RECORD', pageWidth - margin - 4, y + 11, {
          align: 'right',
        });
      }

      y += isFirstPage ? 22 : 14;
    };

    // Render Initial Header
    renderHeaderBanner(true);

    // 1. Student Identity Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(margin, y, contentWidth, 30, 'FD');

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(data.student.displayName || 'Student Academic Profile', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600

    // Left Column
    doc.text(`Official Student ID: `, margin + 4, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(data.student.officialStudentId, margin + 34, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Institutional Email: `, margin + 4, y + 19);
    doc.text(data.student.email, margin + 34, y + 19);

    doc.text(`Department: `, margin + 4, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.text(data.student.department, margin + 34, y + 25);

    // Right Column
    const col2X = margin + 95;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Academic Term: `, col2X, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(data.semester, col2X + 28, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Batch / Section: `, col2X, y + 19);
    doc.text(`${data.student.batch || 'N/A'} (Section ${data.student.section || 'A'})`, col2X + 28, y + 19);

    doc.text(`Report Date: `, col2X, y + 25);
    doc.text(new Date(data.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), col2X + 28, y + 25);

    y += 34;

    // 2. Executive Academic Summary Cards (4 KPIs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EXECUTIVE PERFORMANCE & RISK STANDING', margin, y);
    y += 4;

    const cardWidth = (contentWidth - 6) / 4;
    const cardHeight = 20;

    // Risk Status Card
    const riskLevel = data.riskStatus?.level || 'Low';
    let riskFill = [240, 253, 244]; // emerald-50
    let riskBorder = [187, 247, 208]; // emerald-200
    let riskText = [21, 128, 61]; // emerald-700
    if (riskLevel === 'High') {
      riskFill = [254, 242, 242]; // red-50
      riskBorder = [254, 202, 202]; // red-200
      riskText = [185, 28, 28]; // red-700
    } else if (riskLevel === 'Medium') {
      riskFill = [254, 243, 199]; // amber-50
      riskBorder = [253, 230, 138]; // amber-200
      riskText = [180, 83, 9]; // amber-700
    }

    // Card 1: Risk Level
    doc.setFillColor(riskFill[0], riskFill[1], riskFill[2]);
    doc.setDrawColor(riskBorder[0], riskBorder[1], riskBorder[2]);
    doc.rect(margin, y, cardWidth, cardHeight, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('RISK STATUS', margin + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(riskText[0], riskText[1], riskText[2]);
    doc.text(`${riskLevel} Risk`, margin + 3, y + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Index: ${data.riskStatus?.score ?? 0}/100`, margin + 3, y + 17);

    // Card 2: Attendance Rate
    const c2X = margin + cardWidth + 2;
    const isAttLow = data.kpis.attendancePercentage < 75;
    doc.setFillColor(isAttLow ? 254 : 240, isAttLow ? 243 : 253, isAttLow ? 199 : 244);
    doc.setDrawColor(isAttLow ? 253 : 187, isAttLow ? 230 : 247, isAttLow ? 138 : 208);
    doc.rect(c2X, y, cardWidth, cardHeight, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('ATTENDANCE RATE', c2X + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(isAttLow ? 180 : 21, isAttLow ? 83 : 128, isAttLow ? 9 : 61);
    doc.text(`${data.kpis.attendancePercentage}%`, c2X + 3, y + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Req: ≥75% (${data.kpis.totalClasses} classes)`, c2X + 3, y + 17);

    // Card 3: Marks Average
    const c3X = c2X + cardWidth + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(c3X, y, cardWidth, cardHeight, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('CONTINUOUS MARKS', c3X + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(data.kpis.marksAverage !== null ? `${data.kpis.marksAverage}%` : 'Unrecorded', c3X + 3, y + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Passing Benchmark: ≥50%', c3X + 3, y + 17);

    // Card 4: Registered Courses & Submissions
    const c4X = c3X + cardWidth + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(c4X, y, cardWidth, cardHeight, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('CREDITS / MISSING', c4X + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(data.kpis.missingAssessmentsCount > 0 ? 185 : 15, data.kpis.missingAssessmentsCount > 0 ? 28 : 23, data.kpis.missingAssessmentsCount > 0 ? 28 : 42);
    doc.text(`${data.kpis.totalCredits} Cr`, c4X + 3, y + 12);
    doc.setFontSize(6.5);
    doc.setTextColor(data.kpis.missingAssessmentsCount > 0 ? 185 : 100, data.kpis.missingAssessmentsCount > 0 ? 28 : 116, data.kpis.missingAssessmentsCount > 0 ? 28 : 139);
    doc.text(`${data.kpis.missingAssessmentsCount} missed tasks`, c4X + 3, y + 17);

    y += cardHeight + 6;

    // 3. Course Performance Table
    ensureSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('COURSE-BY-COURSE PERFORMANCE', margin, y);
    y += 3;

    // Table Header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(margin, y, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Code', margin + 3, y + 4.8);
    doc.text('Course Title', margin + 25, y + 4.8);
    doc.text('Credits', margin + 95, y + 4.8);
    doc.text('Graded / Total', margin + 115, y + 4.8);
    doc.text('Score %', margin + 145, y + 4.8);
    doc.text('Standing', margin + 165, y + 4.8);
    y += 7;

    // Rows
    data.courses.forEach((c, idx) => {
      ensureSpace(8);
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138); // blue-900
      doc.text(c.courseCode, margin + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(c.courseTitle.length > 38 ? `${c.courseTitle.substring(0, 35)}...` : c.courseTitle, margin + 25, y + 4.5);

      doc.text(`${c.credits}`, margin + 97, y + 4.5);
      doc.text(`${c.gradedCount}/${c.totalAssessments}`, margin + 120, y + 4.5);

      if (c.percentage !== null) {
        doc.setFont('helvetica', 'bold');
        if (c.percentage >= 70) doc.setTextColor(21, 128, 61);
        else if (c.percentage >= 50) doc.setTextColor(180, 83, 9);
        else doc.setTextColor(185, 28, 28);
        doc.text(`${c.percentage}%`, margin + 147, y + 4.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('Pending', margin + 147, y + 4.5);
      }

      let standingLabel = 'Pending';
      if (c.percentage !== null) {
        if (c.percentage >= 70) standingLabel = 'Honors';
        else if (c.percentage >= 50) standingLabel = 'Pass';
        else standingLabel = 'At Risk';
      }
      doc.setFont('helvetica', 'normal');
      doc.text(standingLabel, margin + 165, y + 4.5);

      y += 6.5;
    });

    y += 5;

    // 4. Detailed Assessments Table (if requested)
    if (includeAssessments && data.assessments.length > 0) {
      ensureSpace(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('CONTINUOUS ASSESSMENTS BREAKDOWN', margin, y);
      y += 3;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, contentWidth, 7, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Course', margin + 3, y + 4.8);
      doc.text('Assessment Title', margin + 25, y + 4.8);
      doc.text('Type', margin + 95, y + 4.8);
      doc.text('Due Date', margin + 120, y + 4.8);
      doc.text('Max', margin + 145, y + 4.8);
      doc.text('Score (%)', margin + 162, y + 4.8);
      y += 7;

      data.assessments.forEach((asmt, idx) => {
        ensureSpace(7);
        const isAlt = idx % 2 === 1;
        if (isAlt) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, 6, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(asmt.courseCode || 'N/A', margin + 3, y + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(asmt.title.length > 38 ? `${asmt.title.substring(0, 36)}...` : asmt.title, margin + 25, y + 4.2);

        doc.setTextColor(100, 116, 139);
        doc.text(asmt.type.toUpperCase(), margin + 95, y + 4.2);
        doc.text(asmt.dueDate.substring(0, 10), margin + 120, y + 4.2);
        doc.text(`${asmt.maxMarks}`, margin + 147, y + 4.2);

        if (asmt.obtainedMarks !== null && asmt.obtainedMarks !== undefined) {
          doc.setFont('helvetica', 'bold');
          if ((asmt.percentage ?? 0) >= 70) doc.setTextColor(21, 128, 61);
          else if ((asmt.percentage ?? 0) >= 50) doc.setTextColor(180, 83, 9);
          else doc.setTextColor(185, 28, 28);
          doc.text(`${asmt.obtainedMarks} (${asmt.percentage}%)`, margin + 162, y + 4.2);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(239, 68, 68);
          doc.text('Unrecorded', margin + 162, y + 4.2);
        }

        y += 6;
      });

      y += 5;
    }

    // 5. Active Advisory Signals / Risk Triggers
    if (includeRiskAudit && data.riskStatus?.reasons && data.riskStatus.reasons.length > 0) {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('ACTIVE ADVISORY SIGNALS & RISK REASONS', margin, y);
      y += 3;

      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      const boxHeight = Math.max(16, data.riskStatus.reasons.length * 5.5 + 4);
      doc.rect(margin, y, contentWidth, boxHeight, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);

      let reasonY = y + 4.5;
      data.riskStatus.reasons.forEach((r) => {
        doc.text(`• ${r}`, margin + 3, reasonY);
        reasonY += 5;
      });

      y += boxHeight + 6;
    }

    // 6. Verification and Signature Block
    ensureSpace(25);
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Generated via University Academic Risk Alert System (ARAS) · Computer-generated verification document.', margin, y);
    doc.text(`Doc ID: REF-${data.student.officialStudentId}-${Date.now().toString().slice(-6)}`, pageWidth - margin, y, {
      align: 'right',
    });

    y += 8;
    // Signatures
    doc.text('Advisor Signature: _______________________', margin, y);
    doc.text('Academic Dean / Registrar: _______________________', pageWidth - margin - 80, y);

    // Save PDF
    const cleanId = data.student.officialStudentId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Academic_Performance_Report_${cleanId}_${dateStr}.pdf`;
    doc.save(filename);
  }
}

export const exportReportService = new ExportReportService();
