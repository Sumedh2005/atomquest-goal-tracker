PART 1 — COLLAPSIBLE SIDEBAR
The sidebar must work as a collapsible expand/collapse panel. Default state on load is collapsed. Expanding happens when the user clicks the toggle icon at the top of the sidebar. The main content area must push right when the sidebar expands — never overlay.
Transition: width 200ms ease smooth animation on both expand and collapse.
Collapsed state — 56px wide:

Background: #FFFFFF
Right border: 1px solid #E8E8E4
Top element: hamburger menu icon ti-menu-2, 20px, color #9CA3AF, centered horizontally, 16px from top, clickable to expand
Nav items: icon only, 20px, centered horizontally, 48px row height, no labels visible
Active nav item: 3px solid left border #F5A800, background #FEF9EC, icon color #F5A800
Inactive nav item: icon color #9CA3AF
Inactive nav item hover: icon color #1A1A1A, background #F7F7F5
Section labels: completely hidden in collapsed state
Cycle info card: completely hidden in collapsed state
Bottom user block: avatar circle only, 36px diameter, #FEF9EC background, #B37800 initials, 13px/600, centered horizontally, pinned to bottom with 16px padding, no name or role visible

Expanded state — 240px wide:

Background: #FFFFFF
Right border: 1px solid #E8E8E4
Top element: a left-pointing chevron icon ti-chevron-left, 20px, #9CA3AF, right-aligned with 12px right padding, 16px from top, clickable to collapse
Section labels: visible, 10px/500 uppercase letter-spacing 0.08em, color #9CA3AF, 16px left padding, 8px top margin, 4px bottom margin
Nav items: 48px row height, 16px horizontal padding, icon 20px left + label 13px/500 right with 10px gap
Below each label: a descriptor line 11px/400 #9CA3AF, same row, directly below label

Dashboard → "Your goals at a glance"
My Goals → "View and manage goals"
Check-in → "Log quarterly progress"
Team Dashboard → "Overview of your team"
Approvals → "Review submitted goals"
Check-in Review → "Log team check-in comments"
Organization → "Org-wide completion view"
Cycle Config → "Manage goal setting windows"
Shared Goals → "Push KPIs to employees"
Reports → "Export achievement data"
Audit Trail → "Post-lock change history"


Active nav item: 3px solid left border #F5A800, background #FEF9EC, label #1A1A1A 13px/500, descriptor #B37800 11px/400, icon color #F5A800
Inactive nav item: label #6B7280 13px/400, descriptor #9CA3AF 11px/400, icon #9CA3AF
Inactive nav item hover: background #F7F7F5, label #1A1A1A, icon #1A1A1A

Cycle info card — expanded state only:
Placed below the last nav item, above the user profile block. 12px margin on left and right sides.

Background: #FAFAF8
Border: 1px solid #E8E8E4
Border radius: 8px
Left border accent: 3px solid #F5A800
Padding: 12px
Line 1: "Current Cycle" — 10px/500 uppercase #9CA3AF
Line 2: "FY 2025–26" — 13px/500 #1A1A1A
Line 3: "Q1 Check-in Open" — 12px/400 #B37800
Line 4: "Closes 31 July" — 11px/400 #9CA3AF

User profile block — expanded state only, pinned to sidebar bottom:

Top border: 1px solid #E8E8E4
Padding: 16px
Layout: avatar left + name and role center + logout icon right
Avatar: 36px circle, #FEF9EC background, #B37800 initials text 13px/600
Name: 13px/500 #1A1A1A
Role badge below name: 10px/500 uppercase #B37800
Logout icon: ti-logout 16px #9CA3AF right-aligned, clickable


PART 2 — DARK MODE
Add a dark mode toggle button in the top navigation bar, placed to the left of the user avatar on the right side. The toggle is a single icon button — moon icon ti-moon 18px when in light mode (click to switch to dark), sun icon ti-sun 18px when in dark mode (click to switch to light). Color #9CA3AF in both modes. No label. No border on the toggle button itself.
Light mode is the default on load. Clicking the toggle switches every color on the page simultaneously using the mappings below.
Dark mode color mappings:
Page:

Page background: #0F0F0F
Card background: #1A1A1A
Card border: 1px solid #2A2A2A

Top navigation bar:

Background: #141414
Bottom border: 1px solid #2A2A2A
Center cycle text: #666666
User name: #F5F5F5
Role badge: #F5A800

Sidebar collapsed dark:

Background: #141414
Right border: 1px solid #2A2A2A
Hamburger icon: #666666
Active nav icon: #F5A800
Active nav background: #2A2200
Active nav left border: #F5A800
Inactive nav icon: #666666
Inactive nav hover background: #1F1F1F
Avatar background: #2A2200
Avatar initials: #F5A800

Sidebar expanded dark:

Background: #141414
Right border: 1px solid #2A2A2A
Section labels: #444444
Active item: left border #F5A800, background #2A2200, label #F5F5F5, descriptor #F5A800, icon #F5A800
Inactive item: label #888888, descriptor #555555, icon #666666
Inactive hover: background #1F1F1F, label #F5F5F5, icon #F5F5F5
Cycle card background: #1F1A00, border #2A2200, left border #F5A800, line 2 text #F5F5F5, line 3 text #F5A800, line 4 text #555555
Profile block top border: #2A2A2A, avatar bg #2A2200, initials #F5A800, name #F5F5F5, role #F5A800, logout icon #555555

Typography dark:

Primary text: #F5F5F5
Secondary text: #A0A0A0
Muted text: #555555

Metric tiles dark:

Background: #242424
Border: 1px solid #2A2A2A
Label: #555555
Number: #F5F5F5

Tables dark:

Header text: #555555 uppercase
Row separator: 1px solid #242424
Row hover: #1F1F1F
Body text: #E0E0E0
Secondary cell text: #888888

Status badges dark:

Approved / Completed / Submitted → background #0D2818, text #4ADE80
Pending / On Track → background #2A1800, text #F5A800
Not Started → background #242424, text #666666
Locked → background #2A2200, text #F5A800

Progress bars dark:

Track: #2A2A2A
Fill: #F5A800
Percentage text: #F5F5F5

Score colors dark:

High score ≥90%: #4ADE80
Mid score 60–89%: #F5A800
Low score <60%: #F87171

Bar chart dark:

Chart card background: #1A1A1A
Bars: #F5A800
Bar hover: #D4900A
Gridlines: #242424
Axis labels: #555555

Input fields dark:

Background: #242424
Border at rest: none
Border on focus: 1px solid #F5A800
Text: #F5F5F5
Placeholder: #555555

Buttons dark:

Primary filled: #F5A800 background, #1A1A1A text — unchanged from light
Outlined button: #2A2A2A background, #F5F5F5 text, 1px solid #3A3A3A border
Outlined hover: #333333 background

Notification / info banner dark:

Background: #1F1A00
Text: #F5A800
Link: #F5A800 with underline on hover

Do not change any layout, spacing, component positions, screen structure, or content. Only apply the sidebar redesign and dark mode color system exactly as described. The result must feel like a premium product in both light and dark modes — warm amber accents on deep blacks in dark mode, clean amber on neutral whites in light mode.