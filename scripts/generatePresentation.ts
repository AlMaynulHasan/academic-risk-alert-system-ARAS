import PptxGenJS from 'pptxgenjs';
import path from 'path';
import fs from 'fs';

const THEME = {
  forestDark: '053321',
  forestMid: '08452C',
  emerald: '00A651',
  emeraldDark: '008744',
  emeraldSoft: 'ECFDF5',
  emeraldBorder: 'A7F3D0',
  slate900: '0F172A',
  slate700: '334155',
  slate600: '475569',
  slate500: '64748B',
  slate200: 'E2E8F0',
  slate100: 'F1F5F9',
  slate50: 'F8FAFC',
  white: 'FFFFFF',
  amberBg: 'FFFBEB',
  amberText: 'B45309',
  blueBg: 'EFF6FF',
  blueText: '1D4ED8',
  redBg: 'FEF2F2',
  redText: 'B91C1C',
};

const FONT = 'Calibri';

function addSlideHeader(
  slide: PptxGenJS.Slide,
  sectionTag: string,
  title: string,
  slideNum: number,
  totalSlides: number
) {
  // Top subtle accent bar
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.08,
    fill: { color: THEME.emerald },
    line: { color: THEME.emerald },
  });

  // Left section tag pill
  slide.addShape('roundRect', {
    x: 0.6,
    y: 0.3,
    w: 2.5,
    h: 0.28,
    fill: { color: THEME.emeraldSoft },
    line: { color: THEME.emeraldBorder, width: 1 },
    rectRadius: 0.06,
  });
  slide.addText(sectionTag.toUpperCase(), {
    x: 0.6,
    y: 0.3,
    w: 2.5,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: THEME.emeraldDark,
    align: 'center',
    valign: 'middle',
  });

  // Title
  slide.addText(title, {
    x: 0.6,
    y: 0.65,
    w: 11.5,
    h: 0.5,
    fontFace: FONT,
    fontSize: 24,
    bold: true,
    color: THEME.slate900,
    margin: 0,
  });

  // Divider line
  slide.addShape('line', {
    x: 0.6,
    y: 1.22,
    w: 12.133,
    h: 0,
    line: { color: THEME.slate200, width: 1.2 },
  });

  // Footer
  slide.addText(
    'CSE 3102 • Academic Risk Alert System (ARAS) | BAUST Saidpur',
    {
      x: 0.6,
      y: 7.08,
      w: 8.5,
      h: 0.28,
      fontFace: FONT,
      fontSize: 9.5,
      color: THEME.slate500,
    }
  );
  slide.addText(`Slide ${slideNum} of ${totalSlides}`, {
    x: 10.8,
    y: 7.08,
    w: 1.933,
    h: 0.28,
    fontFace: FONT,
    fontSize: 9.5,
    bold: true,
    color: THEME.slate600,
    align: 'right',
  });
}

function addCard(
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor = THEME.white,
  borderColor = THEME.slate200
) {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    fill: { color: fillColor },
    line: { color: borderColor, width: 1 },
    rectRadius: 0.08,
  });
}

async function generate() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
  pptx.author = 'Md. Al-Maynul Hasan, Al Arafath Abir Ahmed, Abu Sayed';
  pptx.company = 'Bangladesh Army University of Science and Technology, Saidpur';
  pptx.subject = 'CSE 3102 Software Engineering Sessional Project Presentation';
  pptx.title = 'Academic Risk Alert System (ARAS)';

  const TOTAL_SLIDES = 9;

  // =========================================================================
  // SLIDE 1: TITLE SLIDE (BAUST Cover Information)
  // =========================================================================
  const s1 = pptx.addSlide();
  s1.background = { color: THEME.forestDark };

  // Decorative emerald top strip & subtle right glow bar
  s1.addShape('rect', {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.12,
    fill: { color: THEME.emerald },
    line: { color: THEME.emerald },
  });
  s1.addShape('rect', {
    x: 0,
    y: 7.38,
    w: 13.333,
    h: 0.12,
    fill: { color: THEME.emerald },
    line: { color: THEME.emerald },
  });

  // University Header
  s1.addText(
    'BANGLADESH ARMY UNIVERSITY OF SCIENCE AND TECHNOLOGY, SAIDPUR',
    {
      x: 0.6,
      y: 0.38,
      w: 12.133,
      h: 0.36,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: 'A7F3D0',
      align: 'center',
    }
  );
  s1.addText('DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING', {
    x: 0.6,
    y: 0.74,
    w: 12.133,
    h: 0.3,
    fontFace: FONT,
    fontSize: 12,
    bold: true,
    color: THEME.white,
    align: 'center',
  });

  // Subtle green divider
  s1.addShape('line', {
    x: 2.2,
    y: 1.15,
    w: 8.933,
    h: 0,
    line: { color: THEME.emerald, width: 1.5 },
  });

  // Course Pill
  s1.addShape('roundRect', {
    x: 4.166,
    y: 1.38,
    w: 5.0,
    h: 0.38,
    fill: { color: THEME.forestMid },
    line: { color: THEME.emerald, width: 1.2 },
    rectRadius: 0.19,
  });
  s1.addText('CSE 3102  •  SOFTWARE ENGINEERING SESSIONAL', {
    x: 4.166,
    y: 1.38,
    w: 5.0,
    h: 0.38,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: '6EE7B7',
    align: 'center',
    valign: 'middle',
  });

  // Main Project Title
  s1.addText('ACADEMIC RISK ALERT SYSTEM (ARAS)', {
    x: 0.6,
    y: 2.0,
    w: 12.133,
    h: 0.75,
    fontFace: FONT,
    fontSize: 34,
    bold: true,
    color: THEME.white,
    align: 'center',
  });
  s1.addText(
    'Proactive Student Early-Warning, Weighted Attendance Analytics & Advisor Intervention Portal',
    {
      x: 1.2,
      y: 2.75,
      w: 10.933,
      h: 0.4,
      fontFace: FONT,
      fontSize: 14,
      color: 'D1FAE5',
      align: 'center',
    }
  );

  // Bottom Card Left: Submitted By (Team Members)
  addCard(s1, 0.7, 3.55, 6.2, 3.2, '032517', THEME.forestMid);
  s1.addText('SUBMITTED BY (GROUP MEMBERS)', {
    x: 0.9,
    y: 3.72,
    w: 5.8,
    h: 0.32,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: '6EE7B7',
  });
  s1.addTable(
    [
      [
        {
          text: 'Student Name',
          options: { bold: true, fill: { color: THEME.forestMid }, color: THEME.white, fontSize: 11 },
        },
        {
          text: 'Student ID',
          options: { bold: true, fill: { color: THEME.forestMid }, color: THEME.white, fontSize: 11, align: 'right' },
        },
      ],
      [
        { text: 'Md. Al-Maynul Hasan', options: { color: THEME.white, fontSize: 11.5 } },
        { text: '0802420205101025', options: { color: 'D1FAE5', fontSize: 11.5, align: 'right', bold: true } },
      ],
      [
        { text: 'Al Arafath Abir Ahmed', options: { color: THEME.white, fontSize: 11.5 } },
        { text: '0802420205101026', options: { color: 'D1FAE5', fontSize: 11.5, align: 'right', bold: true } },
      ],
      [
        { text: 'Abu Sayed', options: { color: THEME.white, fontSize: 11.5 } },
        { text: '0802420405101027', options: { color: 'D1FAE5', fontSize: 11.5, align: 'right', bold: true } },
      ],
    ],
    {
      x: 0.9,
      y: 4.15,
      w: 5.8,
      colW: [3.4, 2.4],
      rowH: 0.52,
      fontFace: FONT,
      fill: { color: '053321' },
      border: { type: 'solid', pt: 0.75, color: THEME.forestMid },
      valign: 'middle',
    }
  );

  // Bottom Card Right: Submitted To (Supervisors)
  addCard(s1, 7.2, 3.55, 5.433, 3.2, '032517', THEME.forestMid);
  s1.addText('SUBMITTED TO (COURSE SUPERVISORS)', {
    x: 7.4,
    y: 3.72,
    w: 5.033,
    h: 0.32,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: '6EE7B7',
  });
  s1.addTable(
    [
      [
        {
          text: 'Teacher Name',
          options: { bold: true, fill: { color: THEME.forestMid }, color: THEME.white, fontSize: 11 },
        },
        {
          text: 'Designation',
          options: { bold: true, fill: { color: THEME.forestMid }, color: THEME.white, fontSize: 11, align: 'right' },
        },
      ],
      [
        { text: 'Md. Rakib Trofder', options: { color: THEME.white, fontSize: 12, bold: true } },
        { text: 'Lecturer, CSE', options: { color: 'D1FAE5', fontSize: 11.5, align: 'right' } },
      ],
      [
        { text: 'Md. Sirajul Islam', options: { color: THEME.white, fontSize: 12, bold: true } },
        { text: 'Lecturer, CSE', options: { color: 'D1FAE5', fontSize: 11.5, align: 'right' } },
      ],
    ],
    {
      x: 7.4,
      y: 4.15,
      w: 5.033,
      colW: [3.0, 2.033],
      rowH: 0.65,
      fontFace: FONT,
      fill: { color: '053321' },
      border: { type: 'solid', pt: 0.75, color: THEME.forestMid },
      valign: 'middle',
    }
  );

  // =========================================================================
  // SLIDE 2: PROBLEM STATEMENT & OBJECTIVES
  // =========================================================================
  const s2 = pptx.addSlide();
  s2.background = { color: THEME.slate50 };
  addSlideHeader(s2, 'Introduction', 'Problem Statement & Core Objectives', 2, TOTAL_SLIDES);

  // Left: Problem Cards
  s2.addText('Key Academic Challenges', {
    x: 0.6,
    y: 1.4,
    w: 5.8,
    h: 0.35,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });

  const problems = [
    {
      title: 'Delayed Risk Identification',
      desc: 'Struggling students are often noticed only after midterm or final results are published, leaving little time for academic recovery.',
    },
    {
      title: 'Fragmented Attendance & Marks',
      desc: 'Attendance sheets, continuous quiz marks, and advising notes reside in disconnected spreadsheets without unified risk visibility.',
    },
    {
      title: 'Alert Fatigue & Unstructured Advising',
      desc: 'Unbounded notifications overwhelm students, while advisors lack measurable before-and-after intervention outcome tracking.',
    },
  ];
  problems.forEach((p, idx) => {
    const cy = 1.88 + idx * 1.62;
    addCard(s2, 0.6, cy, 5.8, 1.44, THEME.white, THEME.slate200);
    s2.addShape('rect', {
      x: 0.6,
      y: cy,
      w: 0.1,
      h: 1.44,
      fill: { color: THEME.amberText },
      line: { color: THEME.amberText },
    });
    s2.addText(p.title, {
      x: 0.85,
      y: cy + 0.16,
      w: 5.35,
      h: 0.32,
      fontFace: FONT,
      fontSize: 13,
      bold: true,
      color: THEME.slate900,
    });
    s2.addText(p.desc, {
      x: 0.85,
      y: cy + 0.52,
      w: 5.35,
      h: 0.78,
      fontFace: FONT,
      fontSize: 11,
      color: THEME.slate600,
      valign: 'top',
    });
  });

  // Right: Objectives Grid (2x2)
  s2.addText('Project Objectives (ARAS)', {
    x: 6.75,
    y: 1.4,
    w: 5.95,
    h: 0.35,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });

  const objectives = [
    {
      num: '01',
      title: 'Deterministic Risk Engine',
      desc: 'Automatically score Low / Medium / High academic risk from attendance, marks, missing tasks, & grade trend.',
    },
    {
      num: '02',
      title: 'Fair Policy Enforcement',
      desc: 'Keep ungraded marks as null ("Not recorded") and apply weighted attendance (Present 100%, Late 50%).',
    },
    {
      num: '03',
      title: 'Quota-Capped Alerts',
      desc: 'Enforce max 2 risk alerts per month in Asia/Dhaka via atomic Firestore transactions to prevent alert fatigue.',
    },
    {
      num: '04',
      title: 'Closed-Loop Advising',
      desc: 'Enable faculty advisors to open interventions, record follow-ups, & measure attendance/marks improvement.',
    },
  ];
  objectives.forEach((o, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cx = 6.75 + col * 3.05;
    const cy = 1.88 + row * 2.48;
    addCard(s2, cx, cy, 2.9, 2.3, THEME.white, THEME.emeraldBorder);
    s2.addShape('roundRect', {
      x: cx + 0.2,
      y: cy + 0.2,
      w: 0.5,
      h: 0.34,
      fill: { color: THEME.emerald },
      line: { color: THEME.emerald },
      rectRadius: 0.06,
    });
    s2.addText(o.num, {
      x: cx + 0.2,
      y: cy + 0.2,
      w: 0.5,
      h: 0.34,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: THEME.white,
      align: 'center',
      valign: 'middle',
    });
    s2.addText(o.title, {
      x: cx + 0.2,
      y: cy + 0.68,
      w: 2.5,
      h: 0.4,
      fontFace: FONT,
      fontSize: 12.5,
      bold: true,
      color: THEME.slate900,
    });
    s2.addText(o.desc, {
      x: cx + 0.2,
      y: cy + 1.12,
      w: 2.5,
      h: 1.05,
      fontFace: FONT,
      fontSize: 10.5,
      color: THEME.slate600,
      valign: 'top',
    });
  });

  // =========================================================================
  // SLIDE 3: SYSTEM ARCHITECTURE & TECH STACK
  // =========================================================================
  const s3 = pptx.addSlide();
  s3.background = { color: THEME.slate50 };
  addSlideHeader(s3, 'Architecture', '3-Tier System Architecture & Technology Stack', 3, TOTAL_SLIDES);

  // Top Architectural Flow Diagram
  const tiers = [
    {
      label: 'CLIENT PRESENTATION LAYER',
      title: 'React 19 + TypeScript SPA',
      items: 'Tailwind CSS • HashRouter • Role-Guarded Portals • Academic Charts & jsPDF',
      bg: THEME.emeraldSoft,
      border: THEME.emerald,
      titleColor: THEME.forestDark,
    },
    {
      label: 'APPLICATION & ENGINE LAYER',
      title: 'Express.js + Deterministic Engine',
      items: 'Risk Calculator • Alert Quota API • Tokenized Activation • Real-Time Sync Hooks',
      bg: THEME.blueBg,
      border: '93C5FD',
      titleColor: THEME.blueText,
    },
    {
      label: 'DATA & AUTHENTICATION LAYER',
      title: 'Firebase Auth + Cloud Firestore',
      items: 'Atomic Transactions • 15 Collections • Append-Only Risk & Audit Logs',
      bg: THEME.white,
      border: THEME.slate200,
      titleColor: THEME.slate900,
    },
  ];
  tiers.forEach((t, idx) => {
    const tx = 0.6 + idx * 4.22;
    addCard(s3, tx, 1.55, 3.7, 1.85, t.bg, t.border);
    s3.addText(t.label, {
      x: tx + 0.2,
      y: 1.72,
      w: 3.3,
      h: 0.25,
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: THEME.slate500,
    });
    s3.addText(t.title, {
      x: tx + 0.2,
      y: 2.02,
      w: 3.3,
      h: 0.4,
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: t.titleColor,
    });
    s3.addText(t.items, {
      x: tx + 0.2,
      y: 2.5,
      w: 3.3,
      h: 0.75,
      fontFace: FONT,
      fontSize: 10.5,
      color: THEME.slate700,
    });
    if (idx < 2) {
      s3.addText('➔', {
        x: tx + 3.74,
        y: 2.25,
        w: 0.44,
        h: 0.45,
        fontFace: FONT,
        fontSize: 20,
        bold: true,
        color: THEME.emerald,
        align: 'center',
      });
    }
  });

  // Bottom Tech Stack Table / Cards
  s3.addText('Technology Stack Breakdown', {
    x: 0.6,
    y: 3.72,
    w: 12.133,
    h: 0.35,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });

  const stackCols = [
    {
      head: 'Frontend & UI',
      bullets: [
        'React 19 & TypeScript (Strict)',
        'Vite 8 Build Pipeline',
        'Tailwind CSS v4 (BAUST Green)',
        'React Router v7 (HashRouter)',
      ],
    },
    {
      head: 'Backend & Services',
      bullets: [
        'Node.js + Express.js Server',
        'Rule-Based Risk Calculator',
        'Debounced Event Bus Hooks',
        'jsPDF + CSV Export Service',
      ],
    },
    {
      head: 'Database & Timezone',
      bullets: [
        'Google Cloud Firestore',
        'Firebase Auth (Email & Google)',
        'Asia/Dhaka (UTC+6) Anchoring',
        'Offline Local Cache Fallback',
      ],
    },
    {
      head: 'Quality Assurance',
      bullets: [
        'TypeScript Lint (tsc --noEmit)',
        '47-Step Integration E2E Suite',
        '29-Case Multi-Role & Token Suite',
        'GitHub Issue Triage & Audit',
      ],
    },
  ];
  stackCols.forEach((sc, idx) => {
    const sx = 0.6 + idx * 3.08;
    addCard(s3, sx, 4.18, 2.9, 2.55, THEME.white, THEME.slate200);
    s3.addShape('rect', {
      x: sx,
      y: 4.18,
      w: 2.9,
      h: 0.45,
      fill: { color: THEME.forestDark },
      line: { color: THEME.forestDark },
    });
    s3.addText(sc.head, {
      x: sx + 0.15,
      y: 4.18,
      w: 2.6,
      h: 0.45,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: THEME.white,
      valign: 'middle',
    });
    s3.addText(
      sc.bullets.map((b) => ({ text: `•  ${b}`, options: { breakLine: true } })),
      {
        x: sx + 0.16,
        y: 4.78,
        w: 2.58,
        h: 1.8,
        fontFace: FONT,
        fontSize: 10.5,
        color: THEME.slate700,
        paraSpaceAfter: 6,
      }
    );
  });

  // =========================================================================
  // SLIDE 4: ROLE-BASED ACCESS CONTROL & ACADEMIC WORKFLOW
  // =========================================================================
  const s4 = pptx.addSlide();
  s4.background = { color: THEME.slate50 };
  addSlideHeader(s4, 'Access Control', 'Multi-Role Portal & Institutional Workflow', 4, TOTAL_SLIDES);

  const roles = [
    {
      badge: 'ADMIN TIER',
      title: 'University / Dept Admin',
      color: THEME.forestDark,
      points: [
        'Create & manage Academic Departments & Terms',
        'Configure Course Catalog & Course Offerings',
        'Assign Course Teachers (role-filtered strictly)',
        'Issue 7-day tokenized Student Activation invites',
      ],
    },
    {
      badge: 'TEACHER TIER',
      title: 'Course Teacher',
      color: THEME.blueText,
      points: [
        'Record session attendance (Draft / Published)',
        'Create Quizzes, Midterms & Assignments (>0 pts)',
        'Enter bounded marks (0..maxMarks) or Unrecorded',
        'Track course weightage allocation up to 100%',
      ],
    },
    {
      badge: 'ADVISOR TIER',
      title: 'Faculty / Academic Advisor',
      color: THEME.amberText,
      points: [
        'Monitor assigned students sorted by Risk Score',
        'Inspect granular attendance & marks triggers',
        'Create Open / In-Progress / Resolved interventions',
        'Evaluate before-vs-after improvement verdicts',
      ],
    },
    {
      badge: 'STUDENT TIER',
      title: 'Student Advisee',
      color: THEME.emeraldDark,
      points: [
        'Activate official record via unique invitation token',
        'Track weighted attendance & course performance',
        'Receive quota-capped risk alerts & action plans',
        'Export official PDF & CSV academic reports',
      ],
    },
  ];

  roles.forEach((r, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const rx = 0.6 + col * 6.2;
    const ry = 1.52 + row * 2.68;
    addCard(s4, rx, ry, 5.93, 2.45, THEME.white, THEME.slate200);
    s4.addShape('rect', {
      x: rx,
      y: ry,
      w: 0.12,
      h: 2.45,
      fill: { color: r.color },
      line: { color: r.color },
    });
    s4.addText(r.badge, {
      x: rx + 0.3,
      y: ry + 0.16,
      w: 2.5,
      h: 0.24,
      fontFace: FONT,
      fontSize: 9,
      bold: true,
      color: r.color,
    });
    s4.addText(r.title, {
      x: rx + 0.3,
      y: ry + 0.4,
      w: 5.3,
      h: 0.35,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: THEME.slate900,
    });
    s4.addText(
      r.points.map((pt) => ({ text: `✓  ${pt}`, options: { breakLine: true } })),
      {
        x: rx + 0.3,
        y: ry + 0.85,
        w: 5.4,
        h: 1.45,
        fontFace: FONT,
        fontSize: 11,
        color: THEME.slate700,
        paraSpaceAfter: 5,
      }
    );
  });

  // =========================================================================
  // SLIDE 5: DETERMINISTIC RISK ENGINE & ALERT QUOTA DESIGN
  // =========================================================================
  const s5 = pptx.addSlide();
  s5.background = { color: THEME.slate50 };
  addSlideHeader(s5, 'Core Engine', 'Deterministic Risk Engine & Alert Quota Policy', 5, TOTAL_SLIDES);

  // Left Card: Risk Factor Weights & Thresholds
  addCard(s5, 0.6, 1.52, 6.2, 5.2, THEME.white, THEME.slate200);
  s5.addText('Multi-Factor Risk Evaluation Model', {
    x: 0.85,
    y: 1.72,
    w: 5.7,
    h: 0.38,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });
  s5.addTable(
    [
      [
        { text: 'Indicator', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
        { text: 'Institutional Rule', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
        { text: 'Impact', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
      ],
      [
        { text: 'Attendance Rate', options: { bold: true } },
        { text: '(Present + 0.5×Late + Excused) / Total; Req ≥ 75%' },
        { text: 'High warning if < 75%' },
      ],
      [
        { text: 'Continuous Marks', options: { bold: true } },
        { text: 'Clamped 0–100%; Pass benchmark ≥ 50%' },
        { text: 'Escalates if < 50%' },
      ],
      [
        { text: 'Missing Tasks', options: { bold: true } },
        { text: 'Null marks kept as "Not recorded" (never 0)' },
        { text: 'Counts unsubmitted tasks' },
      ],
      [
        { text: 'Grade Trajectory', options: { bold: true } },
        { text: 'Compares sequential quiz/exam percentages' },
        { text: 'Flags sharp drops' },
      ],
    ],
    {
      x: 0.85,
      y: 2.22,
      w: 5.7,
      colW: [1.55, 2.75, 1.4],
      rowH: 0.56,
      fontFace: FONT,
      fontSize: 10,
      color: THEME.slate700,
      border: { type: 'solid', pt: 0.75, color: THEME.slate200 },
      valign: 'middle',
    }
  );

  // Risk Badges legend inside left card
  const riskLevels = [
    { label: 'Low Risk (0–34)', bg: THEME.emeraldSoft, fg: THEME.emeraldDark },
    { label: 'Medium Risk (35–64)', bg: THEME.amberBg, fg: THEME.amberText },
    { label: 'High Risk (65–100)', bg: THEME.redBg, fg: THEME.redText },
  ];
  riskLevels.forEach((rl, i) => {
    addCard(s5, 0.85 + i * 1.92, 5.75, 1.82, 0.68, rl.bg, rl.fg);
    s5.addText(rl.label, {
      x: 0.85 + i * 1.92,
      y: 5.75,
      w: 1.82,
      h: 0.68,
      fontFace: FONT,
      fontSize: 10,
      bold: true,
      color: rl.fg,
      align: 'center',
      valign: 'middle',
    });
  });

  // Right Card: Alert Rate Limiter & Dhaka Anchoring
  addCard(s5, 7.05, 1.52, 5.68, 5.2, THEME.white, THEME.emeraldBorder);
  s5.addText('Anti-Fatigue Alert Delivery Pipeline', {
    x: 7.3,
    y: 1.72,
    w: 5.2,
    h: 0.38,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });

  const guardrails = [
    {
      title: 'Asia/Dhaka (UTC+6) Period Anchoring',
      desc: 'All monthly alert counters (YYYY-MM), deadlines, and delivery timestamps evaluate strictly in Dhaka time.',
    },
    {
      title: 'Strict Monthly Quota (Max 2 Alerts / Month)',
      desc: 'Atomic Cloud Firestore runTransaction ensures concurrent academic updates can never exceed 2 risk alerts/month.',
    },
    {
      title: 'Duplicate Suppression & Deadline Exemption',
      desc: 'Identical risk levels are suppressed unless escalated; urgent 72-hour deadline reminders remain exempt from risk quota.',
    },
    {
      title: 'Immutable Audit & Reassessment Trail',
      desc: 'Every manual or automated reassessment appends a timestamped snapshot with transparent structured reasons.',
    },
  ];
  guardrails.forEach((g, idx) => {
    const gy = 2.25 + idx * 1.06;
    addCard(s5, 7.3, gy, 5.18, 0.92, THEME.slate50, THEME.slate200);
    s5.addText(`•  ${g.title}`, {
      x: 7.45,
      y: gy + 0.1,
      w: 4.88,
      h: 0.28,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: THEME.forestDark,
    });
    s5.addText(g.desc, {
      x: 7.62,
      y: gy + 0.38,
      w: 4.7,
      h: 0.46,
      fontFace: FONT,
      fontSize: 10,
      color: THEME.slate600,
    });
  });

  // =========================================================================
  // SLIDE 6: CORE APPLICATION MODULES (6-CARD GRID)
  // =========================================================================
  const s6 = pptx.addSlide();
  s6.background = { color: THEME.slate50 };
  addSlideHeader(s6, 'Implementation', 'Implemented Portal Modules & User Capabilities', 6, TOTAL_SLIDES);

  const modules = [
    {
      title: '1. Student Academic Dashboard',
      desc: 'Real-time KPI strip, Academic Health Radar, Registered Courses synced to active semester, & PDF/CSV Academic Report export.',
    },
    {
      title: '2. Attendance Tracking & Charts',
      desc: 'Interactive SVG Donut Chart showing Weighted Rate vs. slice proportions, course-level cards, & searchable session logs.',
    },
    {
      title: '3. Continuous Marks & Weightage',
      desc: 'Assessment breakdown with "Not recorded" null safety, per-course weightage progress (X% / 100%), & instructor feedback.',
    },
    {
      title: '4. Focus-Course Performance',
      desc: 'Marks evaluation trend bars, chronological cumulative attendance trajectory, & deadlines scoped dynamically to selected course.',
    },
    {
      title: '5. Notifications & Action Plan',
      desc: 'Quota meter, risk acknowledgment workflow, category-linked guidance plans, & integrated active-term Deadlines tab.',
    },
    {
      title: '6. Teacher & Advisor Consoles',
      desc: 'Date-persistent attendance sheets, bounded grading entry, student risk deep-dives, & logged advising intervention outcomes.',
    },
  ];
  modules.forEach((m, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const mx = 0.6 + col * 4.12;
    const my = 1.55 + row * 2.65;
    addCard(s6, mx, my, 3.88, 2.38, THEME.white, THEME.slate200);
    s6.addShape('rect', {
      x: mx,
      y: my,
      w: 3.88,
      h: 0.08,
      fill: { color: THEME.emerald },
      line: { color: THEME.emerald },
    });
    s6.addText(m.title, {
      x: mx + 0.22,
      y: my + 0.26,
      w: 3.44,
      h: 0.42,
      fontFace: FONT,
      fontSize: 13.5,
      bold: true,
      color: THEME.forestDark,
    });
    s6.addText(m.desc, {
      x: mx + 0.22,
      y: my + 0.78,
      w: 3.44,
      h: 1.4,
      fontFace: FONT,
      fontSize: 11,
      color: THEME.slate600,
      valign: 'top',
    });
  });

  // =========================================================================
  // SLIDE 7: QA ISSUE TRIAGE & BUG RESOLUTION (ALL 3 SOURCES)
  // =========================================================================
  const s7 = pptx.addSlide();
  s7.background = { color: THEME.slate50 };
  addSlideHeader(s7, 'Quality Assurance', 'QA Testing Triage & Defect Resolution Summary', 7, TOTAL_SLIDES);

  s7.addTable(
    [
      [
        { text: 'QA Source', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
        { text: 'Tickets', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white, align: 'center' } },
        { text: 'Triage Breakdown', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
        { text: 'Key Fixes & Status', options: { bold: true, fill: { color: THEME.forestDark }, color: THEME.white } },
      ],
      [
        { text: '1. QA Bug Board\n(Screenshot)', options: { bold: true } },
        { text: '4', options: { align: 'center', bold: true } },
        { text: '4 Confirmed ARAS Defects\n(3 Major, 1 Minor)' },
        { text: 'Fixed HashRouter 404 refresh, date-persisted attendance, role-strict faculty menu, & 0–100% marks bounds. (100% Fixed)' },
      ],
      [
        { text: '2. Akterun/farmlink\n(Team 5 GitHub)', options: { bold: true } },
        { text: '28', options: { align: 'center', bold: true } },
        { text: '• 9 Exact Duplicates (#64–#71, #73)\n• 2 Overlapping (#46, #47)\n• 9 Unique Bugs\n• 5 False Positives | 3 UX Items' },
        { text: 'Filtered out orphaned CSE-101 leaks, synced active semesters, aligned riskService, fixed Asia/Dhaka dates, HashRouter <Link>s, Deadlines count, & Focus Course scoping. (100% Resolved)' },
      ],
      [
        { text: '3. Nashid12/projects/4\n(PowerLens Group 5)', options: { bold: true } },
        { text: '4', options: { align: 'center', bold: true } },
        { text: '• 3 Out-of-Scope (#2–#4: Campus Tuto)\n• 1 Cross-Applicable Rule (#1)' },
        { text: 'ARAS already filters notifications by userId; #1 (open dev Firestore rules) documented for production hardening.' },
      ],
    ],
    {
      x: 0.6,
      y: 1.5,
      w: 12.133,
      colW: [2.25, 0.95, 3.6, 5.333],
      rowH: [0.48, 1.15, 1.85, 1.15],
      fontFace: FONT,
      fontSize: 10.5,
      color: THEME.slate700,
      fill: { color: THEME.white },
      border: { type: 'solid', pt: 0.75, color: THEME.slate200 },
      valign: 'middle',
    }
  );

  addCard(s7, 0.6, 6.25, 12.133, 0.58, THEME.emeraldSoft, THEME.emeraldBorder);
  s7.addText(
    'Result: All 36 audited QA items across all 3 testing boards were triaged, verified, and resolved with zero open ARAS defects.',
    {
      x: 0.8,
      y: 6.25,
      w: 11.733,
      h: 0.58,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: THEME.forestDark,
      valign: 'middle',
    }
  );

  // =========================================================================
  // SLIDE 8: AUTOMATED TESTING & VERIFICATION RESULTS
  // =========================================================================
  const s8 = pptx.addSlide();
  s8.background = { color: THEME.slate50 };
  addSlideHeader(s8, 'Verification', 'Automated E2E Test Suite & Build Verification', 8, TOTAL_SLIDES);

  const kpis = [
    { val: '76 / 76', label: 'E2E Assertions Passed', color: THEME.emeraldDark },
    { val: '0 Errors', label: 'TypeScript (tsc --noEmit)', color: THEME.blueText },
    { val: 'Passed', label: 'Vite Production Bundle', color: THEME.forestDark },
    { val: '100%', label: 'Role & Quota Invariants', color: THEME.emeraldDark },
  ];
  kpis.forEach((k, idx) => {
    const kx = 0.6 + idx * 3.08;
    addCard(s8, kx, 1.52, 2.9, 1.25, THEME.white, THEME.slate200);
    s8.addText(k.val, {
      x: kx,
      y: 1.68,
      w: 2.9,
      h: 0.55,
      fontFace: FONT,
      fontSize: 24,
      bold: true,
      color: k.color,
      align: 'center',
    });
    s8.addText(k.label, {
      x: kx,
      y: 2.28,
      w: 2.9,
      h: 0.35,
      fontFace: FONT,
      fontSize: 10.5,
      bold: true,
      color: THEME.slate600,
      align: 'center',
    });
  });

  // Left Test Suite Card
  addCard(s8, 0.6, 3.05, 5.9, 3.7, THEME.white, THEME.slate200);
  s8.addText('13-Step Integration E2E Suite (47 / 47 PASSED)', {
    x: 0.85,
    y: 3.25,
    w: 5.4,
    h: 0.35,
    fontFace: FONT,
    fontSize: 13.5,
    bold: true,
    color: THEME.forestDark,
  });
  const suite1 = [
    'Duplicate active enrollment guard & semester date validation',
    'Assessment maxMarks > 0 & strict null mark semantics (never 0)',
    'Course-scoped deadlines (enrolled vs. non-enrolled boundary)',
    'Deterministic High/Medium risk calculation & append-only logs',
    'Asia/Dhaka monthly alert cap (2/month) & duplicate suppression',
    'Advisor feedback, intervention history & "Improved" verdict',
  ];
  s8.addText(
    suite1.map((s) => ({ text: `✅  ${s}`, options: { breakLine: true } })),
    {
      x: 0.85,
      y: 3.72,
      w: 5.4,
      h: 2.85,
      fontFace: FONT,
      fontSize: 10.5,
      color: THEME.slate700,
      paraSpaceAfter: 7,
    }
  );

  // Right Test Suite Card
  addCard(s8, 6.83, 3.05, 5.9, 3.7, THEME.white, THEME.slate200);
  s8.addText('Multi-Role & Token Activation Suite (29 / 29 PASSED)', {
    x: 7.08,
    y: 3.25,
    w: 5.4,
    h: 0.35,
    fontFace: FONT,
    fontSize: 13.5,
    bold: true,
    color: THEME.blueText,
  });
  const suite2 = [
    '5-tier institutional role provisioning & scoping verification',
    '7-day tokenized student pre-registration & profile linking',
    'Strict rejection of expired, revoked, & already-claimed tokens',
    'Course offering instructor assignment & authorization guard',
    'Attendance draft-to-publish lifecycle & audit correction logs',
    'Privilege escalation block (students/teachers cannot alter roles)',
  ];
  s8.addText(
    suite2.map((s) => ({ text: `✅  ${s}`, options: { breakLine: true } })),
    {
      x: 7.08,
      y: 3.72,
      w: 5.4,
      h: 2.85,
      fontFace: FONT,
      fontSize: 10.5,
      color: THEME.slate700,
      paraSpaceAfter: 7,
    }
  );

  // =========================================================================
  // SLIDE 9: LIMITATIONS, FUTURE WORK & CONCLUSION
  // =========================================================================
  const s9 = pptx.addSlide();
  s9.background = { color: THEME.slate50 };
  addSlideHeader(s9, 'Conclusion', 'Limitations, Future Scope & Conclusion', 9, TOTAL_SLIDES);

  // Left: Future Work & Hardening
  addCard(s9, 0.6, 1.55, 6.2, 5.15, THEME.white, THEME.slate200);
  s9.addText('Known Limitations & Future Enhancements', {
    x: 0.85,
    y: 1.75,
    w: 5.7,
    h: 0.38,
    fontFace: FONT,
    fontSize: 15,
    bold: true,
    color: THEME.slate900,
  });

  const futureItems = [
    {
      head: 'Production Firestore Security Rules',
      body: 'Replace development rules with strict Firebase Auth + custom-claim role-based Firestore rules prior to live rollout.',
    },
    {
      head: 'Live SMTP / SMS Dispatch Gateway',
      body: 'Connect the existing email notification stub to SendGrid / institutional SMTP & SMS gateways for off-portal alerts.',
    },
    {
      head: 'Automated University ERP / LMS Sync',
      body: 'Schedule Cloud Tasks imports from central university registration and biometric/RFID classroom attendance logs.',
    },
    {
      head: 'Predictive ML Trend Modeling',
      body: 'Augment deterministic thresholds with cohort-level machine learning models to forecast semester GPA trajectories.',
    },
  ];
  futureItems.forEach((f, idx) => {
    const fy = 2.28 + idx * 1.08;
    addCard(s9, 0.85, fy, 5.7, 0.94, THEME.slate50, THEME.slate200);
    s9.addText(`➔  ${f.head}`, {
      x: 1.02,
      y: fy + 0.1,
      w: 5.35,
      h: 0.28,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: THEME.forestDark,
    });
    s9.addText(f.body, {
      x: 1.2,
      y: fy + 0.4,
      w: 5.15,
      h: 0.46,
      fontFace: FONT,
      fontSize: 10,
      color: THEME.slate600,
    });
  });

  // Right: Conclusion & Thank You Card (Forest Green)
  addCard(s9, 7.05, 1.55, 5.68, 5.15, THEME.forestDark, THEME.emerald);
  s9.addText('CONCLUSION', {
    x: 7.4,
    y: 1.85,
    w: 5.0,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    bold: true,
    color: '6EE7B7',
  });
  s9.addText(
    'ARAS bridges the gap between raw academic records and timely student support.',
    {
      x: 7.4,
      y: 2.22,
      w: 5.0,
      h: 0.85,
      fontFace: FONT,
      fontSize: 17,
      bold: true,
      color: THEME.white,
    }
  );
  s9.addText(
    'By combining deterministic multi-factor risk scoring, quota-governed alerts in Asia/Dhaka, strict role separation, and verified advisor interventions, the system empowers BAUST faculty and students to act early and improve academic outcomes.',
    {
      x: 7.4,
      y: 3.18,
      w: 5.0,
      h: 1.35,
      fontFace: FONT,
      fontSize: 11.5,
      color: 'D1FAE5',
    }
  );

  s9.addShape('line', {
    x: 7.4,
    y: 4.78,
    w: 5.0,
    h: 0,
    line: { color: THEME.emerald, width: 1.2 },
  });

  s9.addText('Thank You!', {
    x: 7.4,
    y: 5.02,
    w: 5.0,
    h: 0.5,
    fontFace: FONT,
    fontSize: 26,
    bold: true,
    color: THEME.white,
  });
  s9.addText('Questions & Live System Demonstration', {
    x: 7.4,
    y: 5.56,
    w: 5.0,
    h: 0.35,
    fontFace: FONT,
    fontSize: 12,
    color: '6EE7B7',
  });
  s9.addText('Team: Maynul (1025) • Arafath (1026) • Abu Sayed (1027)', {
    x: 7.4,
    y: 6.08,
    w: 5.0,
    h: 0.3,
    fontFace: FONT,
    fontSize: 10,
    color: 'A7F3D0',
  });

  const outDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'ARAS_Presentation.pptx');
  await pptx.writeFile({ fileName: outPath });
  console.log(`✅ Generated 9-slide PowerPoint presentation at: ${outPath}`);
}

generate().catch((err) => {
  console.error('❌ Presentation generation failed:', err);
  process.exit(1);
});
