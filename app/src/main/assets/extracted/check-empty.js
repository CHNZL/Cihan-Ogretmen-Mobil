import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(configData);
const db = getFirestore(app, configData.firestoreDatabaseId);

async function checkEmpty() {
  const snaps = await getDocs(collection(db, 'cities'));
  for (const docSnap of snaps.docs) {
    const data = docSnap.data();
    if (!data.name) {
      console.log('Found empty city doc:', docSnap.id);
      await deleteDoc(doc(db, 'cities', docSnap.id));
    }
  }

  const dsnaps = await getDocs(collection(db, 'districts'));
  for (const docSnap of dsnaps.docs) {
    const data = docSnap.data();
    if (!data.name) {
      console.log('Found empty district doc:', docSnap.id);
      await deleteDoc(doc(db, 'districts', docSnap.id));
    }
  }

  const ssnaps = await getDocs(collection(db, 'schools'));
  for (const docSnap of ssnaps.docs) {
    const data = docSnap.data();
    if (!data.name) {
      console.log('Found empty school doc:', docSnap.id);
      await deleteDoc(doc(db, 'schools', docSnap.id));
    }
  }
  console.log("Done checking empty");
  process.exit(0);
}

checkEmpty().catch(console.error);
