require("dotenv").config();
console.log("APP_ENV:", process.env.APP_ENV);
console.log("DB_REGION:", process.env.DB_REGION);

const MEMBERSTACK_API_KEY = process.env.MEMBERSTACK_API_KEY;

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

const axios = require("axios");


/**
 * GET /directory
 * Filters mentees/mentors/volunteers by various fields
 */
app.get("/directory", async (req, res) => {
  try {
    console.log(
        "Incoming /directory request with filters:",
        JSON.stringify(req.query),
    );

    const collectionName = req.query.collection || "mentees";
    const snapshot = await db.collection(collectionName).get();
    console.log("Firestore returned documents count:", snapshot.size);

    let users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));


    // Fill missing fields with "Not specified"
    users = users.map((user) => {
      const requiredFields = [
        "pronouns", "location", "linkedinUrl", "resumeUrl", "profilePicture",
        "jobTitle", "years_experience", "skills", "goals",
        "jobSearchStatus", "currentCompany",
      ];
      requiredFields.forEach((field) => {
        if (user[field] === undefined || user[field] === null) {
          user[field] = "Not specified";
        }
      });
      if (user.isPublic === undefined || user.isPublic === null) {
        user.isPublic = false; // Default to false if not set
      }
      return user;
    });


    // ----------------------------
    // 🔹 Public/Private Profile Filter
    // ----------------------------
    if (!req.query.admin) {
      users = users.filter((u) => u.isPublic !== false);
    }


    // ----------------------------
    // 🔹 Skills filter
    // ----------------------------
    if (req.query.skills) {
      const skillFilters = Array.isArray(req.query.skills) ?
        req.query.skills.map((s) => s.toLowerCase()) :
        [req.query.skills.toLowerCase()];

      users = users.filter(
          (u) =>
            u.skills &&
          Array.isArray(u.skills) &&
          u.skills.some((skill) => skillFilters.includes(skill.toLowerCase())),
      );
    }

    // ----------------------------
    // 🔹 Availability filter
    // ----------------------------
    if (req.query.availability) {
      const availFilters = Array.isArray(req.query.availability) ?
        req.query.availability.map((a) => a.toLowerCase()) :
        [req.query.availability.toLowerCase()];

      users = users.filter(
          (u) =>
            u.availability &&
          Array.isArray(u.availability) &&
          u.availability.some((a) => availFilters.includes(a.toLowerCase())),
      );
    }

    // ----------------------------
    // 🔹 Education filter
    // ----------------------------
    if (req.query.education) {
      const eduFilters = Array.isArray(req.query.education) ?
        req.query.education.map((e) => e.toLowerCase()) :
        [req.query.education.toLowerCase()];

      users = users.filter(
          (u) => u.education && eduFilters.includes(u.education.toLowerCase()),
      );
    }

    // ----------------------------
    // 🔹 Industry filter
    // ----------------------------
    if (req.query.industry) {
      const industryFilters = Array.isArray(req.query.industry) ?
        req.query.industry.map((i) => i.toLowerCase()) :
        [req.query.industry.toLowerCase()];

      users = users.filter(
          (u) =>
            u.industry && industryFilters.includes(u.industry.toLowerCase()),
      );
    }

    // ----------------------------
    // 🔹 Role filter
    // ----------------------------
    if (req.query.role) {
      const roleFilters = Array.isArray(req.query.role) ?
        req.query.role.map((r) => r.toLowerCase()) :
        [req.query.role.toLowerCase()];

      users = users.filter(
          (u) => u.role && roleFilters.includes(u.role.toLowerCase()),
      );
    }

    // ----------------------------
    // 🔹 Timezone filter
    // ----------------------------
    if (req.query.timezone) {
      const tzFilters = Array.isArray(req.query.timezone) ?
        req.query.timezone.map((t) => t.toLowerCase()) :
        [req.query.timezone.toLowerCase()];

      users = users.filter(
          (u) => u.timezone && tzFilters.includes(u.timezone.toLowerCase()),
      );
    }

    // ----------------------------
    // 🔹 Team filter
    // ----------------------------
    if (req.query.team) {
      const teamFilters = Array.isArray(req.query.team) ?
        req.query.team.map((t) => t.toLowerCase()) :
        [req.query.team.toLowerCase()];

      users = users.filter(
          (u) => u.team && teamFilters.includes(u.team.toLowerCase()),
      );
    }

    // ----------------------------
    // 🔹 Experience (range filter)
    // ----------------------------
    if (req.query.experience) {
      const expFilters = Array.isArray(req.query.experience) ?
    req.query.experience :
    [req.query.experience];

      users = users.filter((u) => {
        if (typeof u.years_experience !== "number") return false;

        return expFilters.some((range) => {
          if (range === "0-1") {
            return u.years_experience >= 0 && u.years_experience <= 1;
          }
          if (range === "2-3") {
            return u.years_experience >= 2 && u.years_experience <= 3;
          }
          if (range === "4+") {
            return u.years_experience >= 4;
          }
          return false;
        });
      });
    }


    // ----------------------------
    // 🔹 Search by name, industry, or skills
    // ----------------------------
    if (req.query.search) {
      const term = req.query.search.toLowerCase();

      users = users.filter(
          (u) =>
            (u.first_name && u.first_name.toLowerCase().includes(term)) ||
          (u.last_name && u.last_name.toLowerCase().includes(term)) ||
          (u.industry && u.industry.toLowerCase().includes(term)) ||
          (u.skills &&
            Array.isArray(u.skills) &&
            u.skills.some((skill) => skill.toLowerCase().includes(term))),
      );
    }

    console.log("Filtered users count:", users.length);
    res.json(users);
  } catch (err) {
    console.error("Error in /directory:", err);
    res.status(500).json({error: "Internal server error"});
  }
});

/**
 * Updates a user profile in Firestore
 * @param {string} userId - User document ID
 * @param {object} updates - Fields to update
 * @param {string} collectionName - Firestore collection
 * @return {Promise<object>} Updated user object
 */
async function updateUserProfile(userId, updates, collectionName = "mentees") {
  // Validation
  if (updates.linkedinUrl && !/^https?:\/\//i.test(updates.linkedinUrl)) {
  // prepend https:// if missing
    updates.linkedinUrl = "https://" + updates.linkedinUrl.replace(/^https?:\/\//i, "");
  }
  if (updates.years_experience) {
    updates.years_experience = Number(updates.years_experience) || null;
  }
  if (!Array.isArray(updates.skills)) updates.skills = [];


  // Convert null → Firestore delete
  for (const key in updates) {
    if (updates[key] === null) updates[key] = FieldValue.delete();
  }

  const userRef = db.collection(collectionName).doc(userId);
  const doc = await userRef.get();
  const existing = doc.exists ? doc.data() : {};

  const merged = {...existing, ...updates};


  // Completeness
  const requiredFields = [
    "pronouns", "location", "linkedinUrl", "resumeUrl",
    "profilePicture", "jobTitle", "years_experience",
    "skills", "goals", "jobSearchStatus", "currentCompany",
  ];
  const filled = requiredFields.filter((f) => {
    const value = merged[f];
    if (value === null || value === undefined) {
      return false;
    } // Null/undefined
    if (typeof value === "string" && value.trim() === "") {
      return false;
    } // Empty string
    if (Array.isArray(value) && value.length === 0) {
      return false;
    } // Empty array
    if (typeof value === "object" && value !== null &&
      Object.keys(value).length === 0) {
      return false;
    } // Empty object
    return true;
  });

  merged.completeness = Math.round((
    filled.length / requiredFields.length) * 100);

  await userRef.set(merged, {merge: true});
  return merged;
}


app.put("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const data = req.body;

  // Choose collection (default mentees)
  const collectionName = ["mentees", "mentors"].includes(data.collection) ?
    data.collection :
    "mentees";

  // Ensure user can only update own profile
  if (data.userId && data.userId !== userId) {
    return res.status(403).json({
      error: "Forbidden: You can only update your own profile",
    });
  }

  // Prepare updates with "Not specified" handling
  const updates = {
    pronouns: data.pronouns && data.pronouns !== "Not specified" ?
      data.pronouns.trim() :
      null,
    location: data.location && data.location !== "Not specified" ?
      data.location.trim() :
      null,
    linkedinUrl: data.linkedinUrl && data.linkedinUrl !== "Not specified" ?
      data.linkedinUrl.trim() :
      null,
    resumeUrl: data.resumeUrl && data.resumeUrl !== "Not specified" ?
      data.resumeUrl.trim() :
      null,
    profilePicture: data.profilePicture &&
      data.profilePicture !== "Not specified" ?
      data.profilePicture.trim() :
      null,
    jobTitle: data.jobTitle && data.jobTitle !== "Not specified" ?
      data.jobTitle.trim() :
      null,
    years_experience: data.years_experience &&
      data.years_experience !== "Not specified" ?
      Number(data.years_experience) :
      null,
    skills: Array.isArray(data.skills) ?
      data.skills.filter((s) => s !== "Not specified").map((s) => s.trim()) :
      data.skills && data.skills !== "Not specified" ?
        data.skills.split(",").map((s) => s.trim()) :
        [],
    goals: data.goals && data.goals !== "Not specified" ?
      data.goals.trim() :
      null,
    jobSearchStatus: data.jobSearchStatus &&
      data.jobSearchStatus !== "Not specified" ?
      data.jobSearchStatus.trim() :
      null,
    currentCompany: data.currentCompany &&
      data.currentCompany !== "Not specified" ?
      data.currentCompany.trim() :
      null,

  };
  // Handle isPublic separately
  if (typeof data.isPublic !== "undefined") {
    updates.isPublic =
    data.isPublic === true ||
    (typeof data.isPublic === "string" &&
      data.isPublic.toLowerCase() === "true");
  }

  // Sanitize updates
  Object.entries(updates).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === "" ||
      value === "Not specified" ||
      (typeof value === "object" && value !== null &&
        Object.keys(value).length === 0)
    ) {
      updates[key] = null;
    }
    if (typeof value === "string") updates[key] = value.trim();
  });

  try {
    const profile = await updateUserProfile(userId, updates, collectionName);
    res.status(200).json({
      message: `✅ User ${userId} updated successfully in ${collectionName}`,
      profile,
    });
  } catch (err) {
    console.error("❌ PUT /users error:", err);
    res.status(400).json({error: err.message});
  }
});


app.post("/webflow-webhook", async (req, res) => {
  try {
    const data = req.body.data || req.body;

    // Validate User ID
    const userId = data["User ID"];
    if (!userId) return res.status(400).json({error: "Missing User ID"});

    // Choose correct collection (default mentees)
    const collectionName =
      ["mentees", "mentors"].includes(data["Collection"]) ?
        data["Collection"] :
        "mentees";

    // Prepare updates
    const updates = {
      pronouns: data["Preferred pronouns"] &&
          data["Preferred pronouns"] !== "Not specified" ?
        data["Preferred pronouns"].trim() :
        null,

      location: data["Location"] && data["Location"] !== "Not specified" ?
        data["Location"].trim() :
        null,

      linkedinUrl: data["LinkedIn URL"] &&
        data["LinkedIn URL"] !== "Not specified" ?
        data["LinkedIn URL"].trim() :
        null,

      resumeUrl: data["Resume upload"] &&
        data["Resume upload"] !== "Not specified" ?
        data["Resume upload"].trim() :
        null,

      profilePicture: data["Profile picture"] &&
          data["Profile picture"] !== "Not specified" ?
        data["Profile picture"].trim() :
        null,

      jobTitle: data["Job title"] && data["Job title"] !== "Not specified" ?
        data["Job title"].trim() :
        null,

      years_experience: data["Years of experience"] &&
          data["Years of experience"] !== "Not specified" ?
        Number(data["Years of experience"]) :
        null,

      skills: Array.isArray(data["Skills"]) ?
        data["Skills"].filter((s) =>
          s !== "Not specified").map((s) => s.trim()) :
        data["Skills"] && data["Skills"] !== "Not specified" ?
          data["Skills"].split(",").map((s) => s.trim()) :
          [],

      goals: data["Future goals"] && data["Future goals"] !== "Not specified" ?
        data["Future goals"].trim() :
        null,

      jobSearchStatus: data["Job search status"] &&
          data["Job search status"] !== "Not specified" ?
        data["Job search status"].trim() :
        null,

      currentCompany: data["Current company"] &&
          data["Current company"] !== "Not specified" ?
        data["Current company"].trim() :
        null,


    };

    // Handle isPublic separately
    if (typeof data["Public Profile"] !== "undefined") {
      updates.isPublic =
    data["Public Profile"] === true ||
    (typeof data["Public Profile"] === "string" &&
      data["Public Profile"].toLowerCase() === "true");
    }


    // Sanitize updates
    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === "" ||
        value === "Not specified" ||
        (typeof value === "object" && value !== null &&
            Object.keys(value).length === 0)
      ) {
        updates[key] = null;
      }
      if (typeof value === "string") updates[key] = value.trim();
    });

    // Update user in Firestore
    const profile = await updateUserProfile(userId, updates, collectionName);

    return res.json({
      message: `✅ User ${userId} updated from Webflow`,
      profile,
    });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
});

app.post("/memberstack/:id/update", async (req, res) => {
  const memberId = req.params.id;
  const updates = req.body; // { fieldId: "value" }

  try {
    // Update in Memberstack
    const response = await axios.patch(
        `https://api.memberstack.com/v2/members/${memberId}`,
        {customFields: updates},
        {headers: {Authorization: `Bearer ${MEMBERSTACK_API_KEY}`}},
    );

    const updatedMember = response.data && response.data.data;


    // Sync with Firestore
    await db.collection("members").doc(memberId).set(updatedMember,
        {merge: true});

    res.json({
      message: "✅ Updated Memberstack member and Firestore record",
      data: updatedMember,
    });
  } catch (err) {
    console.error("Error updating Memberstack member:", err.message);
    res.status(500).json({error: "Failed to update member"});
  }
});

exports.api = functions.https.onRequest(app);
