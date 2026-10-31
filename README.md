# Office Attendance System

Attendance for a small office (6 employees). Employees check in and out from their phone browser while connected to the office Wi-Fi, and the owner gets a WhatsApp alert when someone appears to leave during work hours and when they return. GPS checking is available as an alternative setting.

- **Website:** React (works on Android and iPhone browsers)
- **API:** Node.js + Express
- **Database:** MongoDB
- **Alerts:** WhatsApp Business Platform (Cloud API)

## Current settings

| Setting | Value |
| --- | --- |
| Work hours | 10:00 to 18:00, India time (Asia/Kolkata) |
| How presence is checked | Office Wi-Fi (the request must come from the office internet connection) |
| Office radius (GPS mode only) | 150 m |
| Late | Checked in more than 15 minutes after 10:00 |
| Departure alert | 3 checks in a row from outside the office (about 9 minutes) |
| Return alert | 2 checks back in the office, after a departure |
| Presence check | Every 3 minutes while the page is open |
| Data kept | Check history and alerts: 1 month. Attendance records are kept. |

All of these can be changed by the owner in the Settings tab.

## How it works

1. **Setup:** the owner connects to the office Wi-Fi, opens **Settings**, and taps "Add the network I'm on now". This saves the office's public internet address.
2. **Check-in:** an employee taps Check in while on the office Wi-Fi. The server checks that the request comes from a saved office address; from mobile data or another Wi-Fi it is refused. The time comes from the server's clock.
3. **During work hours:** while the page is open, the phone checks in every 3 minutes. After 3 checks in a row from outside the office network, the server records a departure and sends one WhatsApp message to the owner.
4. **Return:** after 2 checks from the office network again, it records the return and sends a return alert.
5. **Check-out:** checks stop. Check-out works from anywhere, so a forgotten check-out can still be done from home (the real time is recorded).

A missing check is shown as "No recent update", never as leaving.

**Limits:**
- A website can only check while it is open. A closed page or locked phone shows "No recent update".
- An employee on mobile data inside the office counts as outside. Ask staff to stay on the office Wi-Fi.
- Many Indian broadband plans change the public address when the router restarts. If check-in suddenly fails for everyone, the owner adds the network again in Settings. A static IP from the internet provider avoids this.
- Deploy behind a single proxy (most hosts) and keep `TRUST_PROXY=1`, so the server reads the real address.

To use GPS instead, choose "Phone GPS inside the office area" in Settings and set the office location; the GPS rules (150 m radius, accuracy check, 20 m boundary buffer) then apply.

## Run it locally

Requirements: Node.js 20+, and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
npm install
cp server/.env.example server/.env   # then fill in the values
npm run seed                         # creates the owner account and office
npm run dev:server                   # API on http://localhost:4000
npm run dev:client                   # website on http://localhost:5173
```

Sign in with the owner email and password from `.env`, open **Employees** to add each employee, and, while connected to the office Wi-Fi, open **Settings** → "Add the network I'm on now as office Wi-Fi". (The Wi-Fi check needs the site to be deployed on the internet; on `localhost` every device looks local.)

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

Tell employees what is collected (whether their phone is on the office network during work hours; no GPS in Wi-Fi mode), why, who receives alerts (the owner), and that check history is deleted after 1 month. An alert means "please check", not proof that someone left: GPS can be inaccurate. Check local employment and data-protection rules before going live.

## API

| Method and path | Purpose |
| --- | --- |
| `POST /api/v1/auth/login` | Sign in |
| `GET /api/v1/auth/me` | Current user |
| `POST /api/v1/attendance/check-in` | Check in (from the office Wi-Fi, or with a GPS reading in GPS mode) |
| `POST /api/v1/attendance/check-out` | Check out and stop monitoring |
| `GET /api/v1/attendance/today` | Today's record and status |
| `GET /api/v1/attendance/history` | Own history (last 31 days) |
| `POST /api/v1/location-events` | Periodic presence check (Wi-Fi, or a GPS reading in GPS mode) |
| `GET /api/v1/owner/dashboard` | Today's status for everyone and recent alerts |
| `GET /api/v1/owner/alerts` | Alert history |
| `GET /api/v1/owner/attendance` | All attendance records |
| `PATCH /api/v1/owner/attendance/:id` | Correct a record (reason required, audit logged) |
| `GET /api/v1/owner/offices`, `PATCH /api/v1/owner/offices/:id` | Office settings, including office Wi-Fi networks |
| `GET /api/v1/owner/network` | The owner's current internet address, to add as office Wi-Fi |
| `GET/POST /api/v1/owner/employees`, `PATCH /api/v1/owner/employees/:id` | Manage employees |
| `GET /api/health` | Health check |
