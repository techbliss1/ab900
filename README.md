# LeaveFlow – Employee Leave Management (ab900)

A modern, interactive **Employee Leave Management** web application built with plain **HTML, CSS and JavaScript**.
No frameworks, no build step and no backend – all demo data is stored in the browser's **localStorage**, and sample
employees and leave requests are pre-loaded so the app can be demonstrated immediately.

## ✨ Features

### 👤 Employee view
- Switch between 6 sample employees using the **"Signed in as"** selector.
- **Leave balance cards** for each leave type (allowance, used, pending, remaining with progress bar).
- **Request leave** form: leave type, start/end dates, optional half day, and reason.
  - Live working-day calculation (weekends excluded) and available balance.
  - Validation: required fields, no past dates, end ≥ start, half day = single date, no overlap with
    pending/approved requests, and sufficient balance.
- **Leave history** with status badges (Pending / Approved / Rejected / Cancelled), manager comments,
  a status filter, and the ability to **cancel** pending requests.

### 🧑‍💼 Manager dashboard
- **Statistics**: total, pending, approved and rejected requests, approval rate, and total approved days.
- **Request table** with **Approve / Reject** actions (with optional manager comment and balance preview).
- **Filters**: by status (chips with counts), by department, and free-text search.
- **Approved days by leave type** bar chart.
- **On leave today** and **upcoming approved leave** lists.

### 🎨 General
- Responsive layout (desktop, tablet, mobile) and **dark mode** toggle.
- Toast notifications and a confirmation modal.
- **Reset demo data** button to restore the original sample data at any time.
- Multiple browser tabs stay in sync through the `storage` event.

## 🗂️ Leave types (yearly allowance in working days)

| Leave type     | Allowance |
|----------------|-----------|
| Annual Leave   | 20 |
| Sick Leave     | 10 |
| Casual Leave   | 7  |
| Parental Leave | 15 |
| Unpaid Leave   | 30 |

## 👥 Sample employees

| ID   | Name           | Role                 | Department      |
|------|----------------|----------------------|-----------------|
| E001 | Aarav Sharma   | Software Engineer    | Engineering     |
| E002 | Priya Nair     | UX Designer          | Design          |
| E003 | Daniel Brooks  | QA Analyst           | Engineering     |
| E004 | Mei Chen       | Marketing Specialist | Marketing       |
| E005 | Fatima Khan    | HR Generalist        | Human Resources |
| E006 | Lucas Oliveira | Sales Executive      | Sales           |

14 sample leave requests (LR-1001 … LR-1014) are included across all statuses. Their dates are generated
**relative to today**, so the demo always has past, current and upcoming leave.

## 📁 Project structure

```
ab900/
├── index.html        # App layout: employee view, manager dashboard, modal, toasts
├── css/
│   └── styles.css    # Modern responsive styling + dark theme
├── js/
│   ├── data.js       # Leave types, sample employees and sample leave requests
│   ├── storage.js    # localStorage wrapper (seed, read, update, reset)
│   └── app.js        # UI rendering, validation, approvals, filters, statistics
└── README.md
```

## 🚀 Run locally

### Prerequisites
- Any modern browser (Edge, Chrome, Firefox, Safari).
- Git (optional, for cloning).

### Option 1 – Open the file directly
```bash
git clone https://github.com/techbliss1/ab900.git
cd ab900
```
Then double-click **`index.html`** (or drag it into your browser).

### Option 2 – Use a local web server (recommended)
```bash
# Python 3
python -m http.server 8080

# or Node.js
npx serve .
```
Open <http://localhost:8080> (or the URL printed by `serve`).

### Option 3 – VS Code Live Server
Open the folder in VS Code, install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

## 🧪 Demo walkthrough
1. In the **Employee** view, choose an employee (e.g. *Aarav Sharma*) and review the leave balances.
2. Submit a new leave request – it appears in **My Leave History** as *Pending*.
3. Switch to **Manager** view, filter by **Pending**, and **Approve** or **Reject** the request with a comment.
4. Switch back to **Employee** view to see the updated status, comment and balance.
5. Click **↺ Reset demo data** to restore the original sample data.

## 💾 Data storage
Data is stored in `localStorage` under these keys:

| Key | Contents |
|-----|----------|
| `leaveflow.v1.employees` | Employee list |
| `leaveflow.v1.requests`  | Leave requests |
| `leaveflow.v1.prefs`     | UI preferences (theme, view, selected employee) |

Clearing your browser site data (or using **Reset demo data**) restores the sample dataset.

> ⚠️ This is a front-end demo. It has no authentication and data is local to each browser – not intended for production use.

## 📄 License
MIT – free to use for learning and demonstrations.
