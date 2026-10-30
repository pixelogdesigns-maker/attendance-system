# Office Attendance System

Attendance for a small office (6 employees). Employees check in and out from their phone browser, the server confirms they are inside the office area by GPS, and the owner gets a WhatsApp alert when someone appears to leave during work hours and when they return.

- **Website:** React (works on Android and iPhone browsers)
- **API:** Node.js + Express
- **Database:** MongoDB
- **Alerts:** WhatsApp Business Platform (Cloud API)

## Current settings

| Setting | Value |
| --- | --- |
| Work hours | 10:00 to 18:00, India time (Asia/Kolkata) |
| Office radius | 150 m (change in Owner → Settings after testing at the building) |
| Late | Checked in more than 15 minutes after 10:00 |
| Departure alert | 3 reliable readings outside the radius in a row |
| Return alert | 2 reliable readings inside, after a departure |
| Location check | Every 3 minutes while the page is open |
| Data kept | Location readings and alerts: 1 month. Attendance records are kept. |

All of these can be changed by the owner in the Settings tab.

## How it works

1. **Check-in:** the phone sends its GPS position. The server allows check-in only within the radius and with accuracy of 50 m or better, and saves the time using its own clock.
2. **During work hours:** while the page is open, the phone sends its position every few minutes. The server ignores stale or inaccurate readings and readings near the boundary (a 20 m buffer), so standing at the door does not cause alerts.
3. **Departure:** after 3 reliable outside readings in a row, the server records a departure and sends one WhatsApp message to the owner. It never sends more than one per trip.
4. **Return:** after 2 reliable inside readings, it records the return and (if enabled) sends a return alert.
5. **Check-out:** location checks stop.

A missing reading is shown as "No recent update", never as leaving.

**Limitation:** a website can only read location while it is open. If an employee closes the page or locks the phone, the owner sees "No recent update". Fully automatic background tracking needs a native Android/iPhone app, which can be added later using the same API.

## Run it locally

Requirements: Node.js 20+, and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
npm install
cp server/.env.example server/.env   # then fill in the values
npm run seed                         # creates the owner account and office
npm run dev:server                   # API on http://localhost:4000
npm run dev:client                   # website on http://localhost:5173
```

Sign in with the owner email and password from `.env`, open **Employees** to add each employee, and open **Settings** → "Use my current location as the office" while standing in the office.

Run the tests with `npm test`.

## Deploy

1. Create a MongoDB Atlas cluster and copy its connection string.
2. Deploy to any Node.js host with HTTPS (location only works on HTTPS). Build command `npm install && npm run build`, start command `npm start`. The server also serves the built website.
3. Set the environment variables from `server/.env.example` on the host. Never commit `.env`.
4. Run `npm run seed` once against the production database.

## WhatsApp setup

1. In [Meta for Developers](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started), create a business app and add the WhatsApp product.
2. Register the business phone number and note its **Phone number ID**. Create a permanent access token for a system user.
3. Create a message template (category: Utility), for example `attendance_alert` with body:
   `Attendance alert. Employee: {{1}}. Event: {{2}}. Time: {{3}}. Please verify with the employee.`
4. When approved, set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `OWNER_PHONE` (e.g. `919876543210`) and `WHATSAPP_TEMPLATE_NAME=attendance_alert`.

Until WhatsApp is configured, alerts are still recorded and shown in the dashboard as "Not set up".

## Privacy

Tell employees what is collected (GPS position during work hours only), why, who receives alerts (the owner), and that readings are deleted after 1 month. An alert means "please check", not proof that someone left: GPS can be inaccurate. Check local employment and data-protection rules before going live.

## API

| Method and path | Purpose |
| --- | --- |
| `POST /api/v1/auth/login` | Sign in |
| `GET /api/v1/auth/me` | Current user |
| `POST /api/v1/attendance/check-in` | Check in with a location reading |
| `POST /api/v1/attendance/check-out` | Check out and stop monitoring |
| `GET /api/v1/attendance/today` | Today's record and status |
| `GET /api/v1/attendance/history` | Own history (last 31 days) |
| `POST /api/v1/location-events` | Send a location reading |
| `GET /api/v1/owner/dashboard` | Today's status for everyone and recent alerts |
| `GET /api/v1/owner/alerts` | Alert history |
| `GET /api/v1/owner/attendance` | All attendance records |
| `PATCH /api/v1/owner/attendance/:id` | Correct a record (reason required, audit logged) |
| `GET /api/v1/owner/offices`, `PATCH /api/v1/owner/offices/:id` | Office settings |
| `GET/POST /api/v1/owner/employees`, `PATCH /api/v1/owner/employees/:id` | Manage employees |
| `GET /api/health` | Health check |
