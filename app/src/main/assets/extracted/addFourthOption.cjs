const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'activity-management');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Activity.tsx'));

const dummyWrongAnswers = [
  "Hiçbiri",
  "Fark etmez",
  "Belki",
  "Gereksiz",
  "Hepsi",
  "Bilemeyiz"
];

let globalTotalFixed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  let fixed = 0;
  // match options: ['A', 'B', 'C']
  let newContent = content.replace(/options:\s*\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g, (match, o1, o2, o3) => {
    // If one of them is already "Hepsi", don't add "Hepsi"
    let d = "Hiçbiri";
    if (o1 === "Hiçbiri" || o2 === "Hiçbiri" || o3 === "Hiçbiri") {
       d = "Hepsi";
    }
    fixed++;
    return `options: ['${o1}', '${o2}', '${o3}', '${d}']`;
  });

  if (fixed > 0) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed ${fixed} questions in ${file}`);
    globalTotalFixed += fixed;
  }
}

console.log(`Total fixed: ${globalTotalFixed}`);
