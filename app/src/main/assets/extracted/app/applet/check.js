const fs = require('fs');
const content = fs.readFileSync('src/components/activity-management/HayatBilgisiActivity.tsx', 'utf-8');
const lines = content.split('\n');

const stack = [];
const extract = lines.slice(477, 850);
for (let i = 0; i < extract.length; i++) {
  const line = extract[i];
  let m;
  const regex = /<([a-zA-Z0-9_\.]+)((?:\s+[^>]+)?)>|<\/([a-zA-Z0-9_\.]+)>/g;
  while ((m = regex.exec(line)) !== null) {
      if (line.substring(m.index - 2, m.index) === '//') continue;
      
      const isSelfClosing = m[0].endsWith('/>');
      if (isSelfClosing) continue;
      
      if (m[1]) {
          console.log((i + 478) + ' OPEN ' + m[1]);
          stack.push({tag: m[1], line: i + 478});
      } else if (m[3]) {
          const expected = stack.pop();
          console.log((i + 478) + ' CLOSE ' + m[3] + (expected && expected.tag !== m[3] ? ` *** MISMATCH (expected ${expected.tag} from ${expected.line}) ***` : ''));
      }
  }
}
