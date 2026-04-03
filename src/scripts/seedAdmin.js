/**
 * ---------------------------------------------------------
 * ONE-TIME SETUP SCRIPT — RUN LOCALLY ONLY
 * ---------------------------------------------------------
 * Instructions:
 * 1. Install Firebase Admin SDK:
 *      npm install firebase-admin
 *
 * 2. Download your Firebase service account key (JSON file)
 *    from Firebase Console:
 *    Settings > Service Accounts > Generate new private key
 *
 * 3. Save the key as:
 *      src/scripts/serviceAccountKey.json
 *
 * 4. Run this script:
 *      node src/scripts/seedAdmin.js
 *
 * 5. This script should be run ONLY ONCE.
 * ---------------------------------------------------------
 */

const admin = require("firebase-admin");
const path = require("path");

// Load service account
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function seedAdmin() {
  try {
    console.log("Creating admin user...");

    // 1. Create Firebase Auth user
    const user = await auth.createUser({
      email: "bahaman43@gmail.com",
      password: "MananI6359@", // <-- CHANGE THIS BEFORE RUNNING
      displayName: "Club Admin",
    });

    console.log("Admin user created:", user.uid);

    // 2. Create Firestore member document
    await db.collection("members").doc(user.uid).set({
      name: "Club Admin",
      email: "bahaman43@gmail.com",
      role: "admin",
      baseFee: 0,
      discount: 0,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Admin member profile created.");

    // 3. Create clubSettings/general
    await db.collection("clubSettings").doc("general").set({
      clubName: "Santai Badminton Club",
      established: "2024",
      contactEmail: "bahaman43@gmail.com",
      logoUrl: "",
      defaultFee: 50,
      shuttleCost: 0,
      courtFee: 0,
      sessionDays: ["Tuesday", "Thursday"],
      sessionTime: "8:00 PM – 10:00 PM",
      venue: "Main Court",
    });

    console.log("General settings created.");

    // 4. Create clubSettings/payment
    await db.collection("clubSettings").doc("payment").set({
      bankName: "Maybank",
      accountNumber: "0000000000",
      duitNow: "0123456789",
      qrValue: "YOUR_QR_CODE_TEXT_HERE",
      clubName: "Santai Badminton Club",
    });

    console.log("Payment settings created.");

    console.log("\n----------------------------------");
    console.log("🎉 Setup complete!");
    console.log("----------------------------------\n");

    process.exit(0);
  } catch (err) {
    console.error("Error during setup:", err);
    process.exit(1);
  }
}

seedAdmin();
