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

