# 🚀 Firebase + Webflow + Memberstack API Integration

This project is an **Express-based Firebase Cloud Function API** built to manage and sync user profiles across **Firestore**, **Webflow CMS**, and **Memberstack**.  

It includes endpoints for:
- Querying and filtering users (`/directory`)  
- Updating user profiles (`/users/:id`)  
- Handling Webflow webhooks (`/webflow-webhook`)  
- Syncing updates to Memberstack (`/memberstack/:id/update`)

> 💡 This project was developed during my internship, and I was permitted to keep a copy for learning and portfolio purposes. All sensitive credentials and organization-specific data have been removed.

---

## ✨ Features

### 🔹 1. Directory Search API
**Endpoint:** `GET /directory`

Filter mentees, mentors, or volunteers by:
- Skills  
- Availability  
- Education  
- Industry  
- Role  
- Timezone  
- Team  
- Years of experience (range-based)  
- Public/private profiles  
- Free-text search (name, industry, or skills)

Automatically fills missing fields with `"Not specified"` for consistent client-side rendering.

---

### 🔹 2. User Profile Update API
**Endpoint:** `PUT /users/:id`

- Allows users to update their own profiles.  
- Validates and sanitizes inputs (trims strings, ensures arrays for skills, normalizes URLs).  
- Calculates a **profile completeness score** based on required fields.  
- Updates user records in Firestore under the correct collection (`mentees` or `mentors`).

---

### 🔹 3. Webflow Webhook Sync
**Endpoint:** `POST /webflow-webhook`

- Receives form data from **Webflow CMS**.  
- Maps Webflow fields (e.g. “Preferred pronouns”, “Job title”) to Firestore schema.  
- Handles `"Not specified"` values gracefully.  
- Updates corresponding Firestore user documents.

---

### 🔹 4. Memberstack Update Sync
**Endpoint:** `POST /memberstack/:id/update`

- Updates **Memberstack** members via their REST API (`PATCH /v2/members/:id`).  
- Syncs returned data to Firestore (`members` collection).  
- Uses `MEMBERSTACK_API_KEY` for authentication.

---

## 🧠 Architecture Overview

Client (Webflow / Dashboard)
↓
[ Express.js API ]
↓
Firestore ←→ Memberstack API


- **Hosting:** Firebase Cloud Functions  
- **Database:** Firestore (via Firebase Admin SDK)  
- **External Services:** Memberstack API, Webflow CMS (via Webhooks)  
- **Middleware:** `cors`, `express.json()`  
- **HTTP Client:** `axios`

---

## ⚙️ Environment Variables

Create a `.env` file in your `functions/` directory:

```bash
APP_ENV=development
DB_REGION=us-central1
MEMBERSTACK_API_KEY=your_memberstack_api_key_here
```
🧩 Local Development
1️⃣ Install Dependencies
```npm install```

2️⃣ Run Locally (with Firebase Emulator)
```firebase emulators:start```


The API will be available at:

```http://localhost:5001/<your-project-id>/<region>/api```

3️⃣ Test Example
```curl http://localhost:5001/<your-project-id>/<region>/api/directory?collection=mentees```

.
├── functions/
│   ├── index.js          # Main Express + Firebase Cloud Functions entry
│   ├── package.json
│   ├── .env.example
│   └── ...
├── README.md

***📝 Note:***
This repository contains only the Firebase Cloud Functions source (functions/ directory).
The parent Firebase configuration files (firebase.json, .firebaserc) were part of the organization’s internal setup and are not included here.

- If you want to make the repo deployable yourself, you can add a minimal firebase.json:

```
{
  "functions": {
    "source": "functions"
  }
}
```
## 📈 Profile Completeness Logic

Each user profile includes a completeness percentage, based on the presence of key fields:
```
const requiredFields = [
  "pronouns", "location", "linkedinUrl", "resumeUrl",
  "profilePicture", "jobTitle", "years_experience",
  "skills", "goals", "jobSearchStatus", "currentCompany",
];
```

Calculation:

```(filled_fields / total_fields) * 100 ```

### 🧾 Example API Responses
```
✅ GET /directory
[
  {
    "id": "abc123",
    "first_name": "Jane",
    "last_name": "Doe",
    "skills": ["React", "Node.js"],
    "industry": "Software",
    "years_experience": 3,
    "isPublic": true,
    "completeness": 90
  }
]

✅ PUT /users/:id
{
  "message": "✅ User abc123 updated successfully in mentees",
  "profile": {
    "first_name": "Jane",
    "linkedinUrl": "https://linkedin.com/in/janedoe",
    "completeness": 95
  }
}
```

***💡 Notes***

All updates are idempotent — repeated updates with the same data don’t cause duplicates.

"Not specified" and empty values are automatically converted to null for clean Firestore records.

Safe for both staging and production Firebase environments.

## 👨‍💻 Author

Tenzin Chokdup
Built during my internship as a backend integration project combining Firebase, Webflow, and Memberstack.
Now maintained independently for educational and portfolio purposes.

## 🪪 License

This project is provided for educational and non-commercial use only.
All proprietary or organization-specific content has been removed.
