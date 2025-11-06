🔥 Firebase + Webflow + Memberstack API Integration

This project is an Express-based Firebase Cloud Function API built to manage and sync user profiles across Firestore, Webflow CMS, and Memberstack.

It provides routes for querying and filtering users (/directory), updating user profiles (/users/:id), handling Webflow webhooks (/webflow-webhook), and syncing updates to Memberstack (/memberstack/:id/update).

💡 This project was developed during my internship, and I was permitted to keep a copy for my personal learning and portfolio. All sensitive credentials and organization-specific data have been removed.

🚀 Features
🔹 1. Directory Search API

Endpoint: GET /directory

Filters mentees, mentors, or volunteers by:

Skills

Availability

Education

Industry

Role

Timezone

Team

Years of experience (range-based)

Public/private profiles

Free-text search (name, industry, or skills)

Fills missing fields with "Not specified" for consistent client-side rendering.

🔹 2. User Profile Update API

Endpoint: PUT /users/:id

Allows users to update their own profiles.

Validates and sanitizes inputs (trims strings, converts URLs, ensures arrays for skills).

Automatically calculates a profile completeness score based on required fields.

Updates the user record in Firestore under the correct collection (mentees or mentors).

🔹 3. Webflow Webhook Sync

Endpoint: POST /webflow-webhook

Receives updates from Webflow CMS (e.g., form submissions).

Maps Webflow fields (like “Preferred pronouns”, “Job title”, etc.) to Firestore schema.

Handles “Not specified” and missing values gracefully.

Updates the corresponding user document in Firestore.

🔹 4. Memberstack Update Sync

Endpoint: POST /memberstack/:id/update

Updates Memberstack members via their REST API (PATCH /v2/members/:id).

Syncs returned data with Firestore under the members collection.

Uses MEMBERSTACK_API_KEY for authenticated updates.

🧠 Architecture Overview
Client (Webflow / Dashboard)
      ↓
[ Express.js API ]
      ↓
Firestore  ←→  Memberstack API


Hosting: Firebase Cloud Functions

Database: Firestore (via Firebase Admin SDK)

External Services: Memberstack API, Webflow CMS (via Webhooks)

Middleware: cors, express.json()

HTTP Client: axios

🧩 Environment Variables

Create a .env file in your project root with the following:

APP_ENV=development
DB_REGION=us-central1
MEMBERSTACK_API_KEY=your_memberstack_api_key_here


⚠️ Never commit your .env file to GitHub. Use .gitignore to exclude it.

🛠️ Local Development
1️⃣ Install dependencies
npm install

2️⃣ Run locally
firebase emulators:start


This will start the local Firebase emulator with your Express app accessible at:

http://localhost:5001/<your-project-id>/<region>/api

3️⃣ Test endpoints

Use a REST client like Postman or curl, for example:

curl http://localhost:5001/<your-project-id>/<region>/api/directory?collection=mentees

📂 Project Structure
.
├── functions/
│   ├── index.js          # Main Express + Firebase Cloud Functions entry
│   ├── package.json
│   ├── .env.example
│   └── ...
├── README.md
└── firebase.json

📈 Profile Completeness Logic

Each user profile is assigned a completeness percentage based on required fields:

const requiredFields = [
  "pronouns", "location", "linkedinUrl", "resumeUrl",
  "profilePicture", "jobTitle", "years_experience",
  "skills", "goals", "jobSearchStatus", "currentCompany",
];


Completeness is calculated as:

(filled_fields / total_fields) * 100

🧾 Example API Response
GET /directory
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

PUT /users/:id
{
  "message": "✅ User abc123 updated successfully in mentees",
  "profile": {
    "first_name": "Jane",
    "linkedinUrl": "https://linkedin.com/in/janedoe",
    "completeness": 95
  }
}

💡 Notes

All updates are idempotent — repeated updates with the same data won’t duplicate or corrupt records.

Missing or "Not specified" values are automatically converted to null for clean Firestore records.

The project is safe to deploy in either staging or production Firebase environments.

🧑‍💻 Author

Tenzin Chokdup
Built during my internship as a backend integration project combining Firebase, Webflow, and Memberstack.
Now maintained independently for educational and portfolio purposes.

🪪 License

This project is provided for educational and non-commercial use only.
All proprietary or organization-specific content has been removed.
