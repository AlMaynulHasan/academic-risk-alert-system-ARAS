# Design System Specification

## 1. Philosophical Grounding
The Academic Risk Alert System provides mission-critical advising tools for faculty and students. The interface is engineered with a strict **LIGHT THEME ONLY** design system, avoiding dark mode, artificial glows, decorative animations, or generic AI styling.

## 2. Design Tokens
### Palette
- **Canvas / Background**: `#F8FAFC` (`slate-50`)
- **Surface / Card**: `#FFFFFF` (`white`)
- **Hairline Border**: `#E2E8F0` (`slate-200`)
- **Text Primary**: `#0F172A` (`slate-900`)
- **Text Muted**: `#64748B` (`slate-500`)
- **Brand Primary**: `#2563EB` (`blue-600`)
- **Brand Primary Hover**: `#1D4ED8` (`blue-700`)
- **Focus Ring**: `ring-2 ring-blue-600/40 ring-offset-1`

### Risk Severity Tokens (Always Color + Label + Icon)
- **Low Risk**: Text `#15803D`, Background `#DCFCE7`, Border `#BBF7D0` (Green check icon)
- **Medium Risk**: Text `#B45309`, Background `#FEF3C7`, Border `#FDE68A` (Amber alert triangle icon)
- **High Risk**: Text `#B91C1C`, Background `#FEE2E2`, Border `#FECACA` (Red flame / warning shield icon)

*Rule*: Risk level must never be signaled by color alone. Every badge or data cell must render text (e.g. "Low Risk", "Medium Risk", "High Risk") accompanied by an explicit accessible icon.

### Geometry & Spatial Math
- **Base Grid**: 8px (`p-2`, `p-4`, `p-6`, `gap-4`, `gap-6`)
- **Border Radius**: 8px (`rounded-lg`) on cards and primary containers; 6px (`rounded-md`) on input elements and buttons.
- **Card Borders**: 1px solid `#E2E8F0`. No heavy drop shadows. Clean flat architecture.
- **Padding Math**: Outer container padding $\ge$ inner padding ($24\text{px}$ outer, $16\text{px}$ inner child cards).
- **Button Padding**: Horizontal $\approx 2\times$ vertical (`py-2 px-4`).

### Typography
- Primary Face: Inter, system-ui fallback.
- Tabular figures (`tabular-nums`) for all grades, metrics, attendance percentages, dates, and tables.
- All text achieves WCAG AA contrast ratio ($\ge 4.5:1$ against surface background).

## 3. UI Component Catalog (`src/shared/ui/`)
1. **AppShell**: Responsive layout containing desktop sidebar, mobile drawer, top navigation bar, and breadcrumb header.
2. **Button**: Primary, secondary, outline, destructive, and subtle variants.
3. **Input & Select**: Accessible form inputs with focus rings, helper hints, and aria-describedby errors.
4. **FormField**: Input wrapper standardizing label, required asterisk, description, and inline error.
5. **Card**: Flat surface with 1px border and optional header/content/footer partitions.
6. **StatCard**: Metric presentation card featuring label, tabular numeric value, status indicator, and context note.
7. **DataTable**: Searchable, sortable data table with sticky header, compact rows (38px), tabular figures, and empty state.
8. **RiskBadge**: Standardized badge rendering Low, Medium, or High risk with text label and Lucide icon.
9. **StatusBadge**: Semantic status tags for enrollment, intervention, or attendance states.
10. **Modal**: Accessible dialog box with backdrop, keyboard escape handler, and focus management.
11. **Toast**: Transient toast notification for operation confirmations.
12. **PageHeader**: Consistent page title, breadcrumb trail, and right-aligned action buttons.
13. **Skeleton Loader**: Pulse placeholder matching table and card layout geometry.
14. **EmptyState**: Clear explanation of unpopulated states or under-construction developer modules.
15. **ErrorState**: Human-readable error recovery box with retry action.
16. **ProtectedRoute**: Role-aware route guard redirecting unauthorized access to respective home dashboard or login.
17. **ChartCard**: Clean container for bar/line progress visualization without cluttered decorations.
