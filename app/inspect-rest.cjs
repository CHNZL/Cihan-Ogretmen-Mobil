const https = require('https');

const url = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0847504321/databases/ai-studio-50d2114a-6844-4ea4-a54d-c3de2ef685ab/documents/users?key=AIzaSyDvNd9PeQuhUFSzXymKYF1RqvebTi_cNmI';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("--- FIRESTORE REST SCRAPE ---");
      if (json.documents) {
        json.documents.forEach((doc) => {
          const parts = doc.name.split('/');
          const docId = parts[parts.length - 1];
          const fields = doc.fields || {};
          const email = fields.email ? fields.email.stringValue : 'N/A';
          const profileType = fields.profileType ? fields.profileType.stringValue : 'N/A';
          console.log(`Document ID: ${docId}, Email: ${email}, Profile: ${profileType}`);
        });
      } else {
        console.log("No documents found or error:", json);
      }
      console.log("----------------------------");
    } catch (e) {
      console.error("Parse error:", e);
      console.log("Raw data:", data);
    }
  });
}).on('error', (err) => {
  console.error("HTTP GET Error:", err);
});
