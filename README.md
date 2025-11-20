# GATE Prep Tracker — Multi-file Project

This project is a free, self-hosted dashboard for tracking your GATE (and other) preparation using **Google Sheets** as the backend and **GitHub Pages** for hosting the frontend.

Features:
- Google Sheets backend via Google Apps Script (read + status updates)
- CSV fallback (publish sheet as CSV)
- Visual progress charts (Chart.js)
- GitHub & LeetCode streak cards
- Daily motivational quote
- Dark / Light theme (pastel colors) with toggle
- Today's Tasks widget (simple list view)
- Multi-file structure (index.html, style.css, script.js, apps_script.gs)

## Quick deploy steps

### 1) Prepare Google Sheet
- Create a Google Sheet and add columns (header row):  
  `Subject,Topic,Status,PlannedDate,EstimatedHours,Notes`
- Fill some rows as sample data.

### 2) Apps Script (backend)
- In the sheet: **Extensions → Apps Script**
- Create a new project and replace `Code.gs` content with `apps_script.gs` file from this repo.
- Save and **Deploy → New deployment → Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Copy the **Web app URL** (exec URL).

### 3) Host frontend on GitHub Pages
- Create a public GitHub repo (e.g. `gate-tracker`).
- Upload all files from this project to repo root (index.html, style.css, script.js, apps_script.gs, README.md).
- In repo → Settings → Pages → Source → Deploy from branch `main` (root) → Save.
- After a minute your site will be available at: `https://<your-username>.github.io/<repo>/`

### 4) Configure the site
- Open your site.
- Paste the Apps Script exec URL into the AppsScript endpoint field and click **Save endpoint**.
- Click **Test endpoint** to fetch live data.
- Optionally, publish sheet to CSV and use the CSV fallback URL.

## Notes & Privacy
- Apps Script web app will run as you (the deployer) and has access to the sheet. Do not deploy with private data if you intend to make the site public.
- If you share the GitHub Pages URL, visitors will not be able to edit the sheet unless they have the Apps Script endpoint with write access.

