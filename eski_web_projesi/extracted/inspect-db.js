import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(configData);
const db = getFirestore(app, configData.firestoreDatabaseId);

async function inspectDB() {
  const cities = await getDocs(collection(db, 'cities'));
  console.log("Cities:");
  cities.forEach(d => console.log(d.id, d.data()));

  const districts = await getDocs(collection(db, 'districts'));
  console.log("Districts:");
  districts.forEach(d => console.log(d.id, d.data()));

  const schools = await getDocs(collection(db, 'schools'));
  console.log("Schools:");
  schools.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}

inspectDB().catch(console.error);
