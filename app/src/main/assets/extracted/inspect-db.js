import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(configData);
const db = getFirestore(app, configData.firestoreDatabaseId);

async function inspectDB() {
  console.log("--- FIRESTORE USERS SCRAPE ---");
  const users = await getDocs(collection(db, 'users'));
  for (const userDoc of users.docs) {
    const data = userDoc.data();
    console.log(`User Document ID: ${userDoc.id} Email: ${data.email} Profile: ${data.profileType}`);
    
    // Check if there are schedule configs under this user
    try {
      const scheduleSnap = await getDoc(doc(db, `users/${userDoc.id}/config/schedule`));
      if (scheduleSnap.exists()) {
        console.log(`  -> FOUND SCHEDULE CONFIG FOR ${userDoc.id}:`, scheduleSnap.data());
      }
      
      const dataSnap = await getDoc(doc(db, `users/${userDoc.id}/config/scheduleData`));
      if (dataSnap.exists()) {
        console.log(`  -> FOUND SCHEDULE DATA FOR ${userDoc.id}:`, Object.keys(dataSnap.data()?.slots || {}).length, "slots");
      }
    } catch (e) {
      console.log(`  Error checking schedule for ${userDoc.id}:`, e.message);
    }
  }
  process.exit(0);
}

inspectDB().catch(console.error);
