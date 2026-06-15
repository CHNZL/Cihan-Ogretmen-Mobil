const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'activity-management');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Activity.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Insert state if missing
  if (!content.includes('const [jokerSettings, setJokerSettings]')) {
    content = content.replace(/(const \[stage, setStage\] = useState)/, "const [jokerSettings, setJokerSettings] = useState<JokerSettings>(defaultJokerSettings);\n  $1");
  }

  fs.writeFileSync(filePath, content);
  console.log('Fixed state in', file);
}
