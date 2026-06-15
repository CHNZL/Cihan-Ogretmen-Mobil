import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read firebase config
const configPath = path.resolve('firebase-applet-config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(configData);
const db = getFirestore(app, configData.firestoreDatabaseId);

function turkishToUpper(text) {
    if (!text) return text;
    text = text.replace(/i/g, "İ");
    text = text.replace(/ı/g, "I");
    return text.toUpperCase();
}

async function runCleanup() {
  console.log("Starting cleanup...");
  
  // Clean Cities
  const citiesSnap = await getDocs(collection(db, 'cities'));
  const citiesMap = new Map();
  let deletedCitiesCount = 0;
  
  for (const docSnap of citiesSnap.docs) {
    const data = docSnap.data();
    const name = data.name ? data.name.trim().toLocaleUpperCase('tr-TR') : "";
    if (citiesMap.has(name)) {
      await deleteDoc(doc(db, 'cities', docSnap.id));
      deletedCitiesCount++;
      console.log(`Deleted duplicate city: ${name}`);
    } else {
      citiesMap.set(name, true);
    }
  }

  // Clean Districts
  const distSnap = await getDocs(collection(db, 'districts'));
  const distMap = new Map();
  let deletedDistCount = 0;
  
  for (const docSnap of distSnap.docs) {
    const data = docSnap.data();
    const name = data.name ? data.name.trim().toLocaleUpperCase('tr-TR') : "";
    const cityName = data.cityName ? data.cityName.trim().toLocaleUpperCase('tr-TR') : "";
    const key = `${cityName}_${name}`;
    
    if (distMap.has(key)) {
      await deleteDoc(doc(db, 'districts', docSnap.id));
      deletedDistCount++;
      console.log(`Deleted duplicate district: ${key}`);
    } else {
      distMap.set(key, true);
    }
  }

  // Clean Schools
  const schoolSnap = await getDocs(collection(db, 'schools'));
  const schoolMap = new Map();
  let deletedSchoolCount = 0;
  
  for (const docSnap of schoolSnap.docs) {
    const data = docSnap.data();
    const name = data.name ? data.name.trim().toLocaleUpperCase('tr-TR') : "";
    const cityName = data.cityName ? data.cityName.trim().toLocaleUpperCase('tr-TR') : "";
    const districtName = data.districtName ? data.districtName.trim().toLocaleUpperCase('tr-TR') : "";
    const key = `${cityName}_${districtName}_${name}`;
    
    if (schoolMap.has(key)) {
      await deleteDoc(doc(db, 'schools', docSnap.id));
      deletedSchoolCount++;
      console.log(`Deleted duplicate school: ${key}`);
    } else {
      schoolMap.set(key, true);
    }
  }

  console.log(`Cleanup finished: deleted ${deletedCitiesCount} cities, ${deletedDistCount} districts, ${deletedSchoolCount} schools.`);
  process.exit(0);
}

runCleanup().catch(console.error);
