const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.kt')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('collection(') || content.includes('collectionGroup(')) {
                content = content.replace(/collection\("users"\)/g, 'collection("kullanicilar")');
                content = content.replace(/collectionGroup\("users"\)/g, 'collectionGroup("kullanicilar")');
                
                content = content.replace(/collection\("students"\)/g, 'collection("ogrenciler")');
                content = content.replace(/collectionGroup\("students"\)/g, 'collectionGroup("ogrenciler")');
                
                content = content.replace(/collection\("books"\)/g, 'collection("kitaplar")');
                content = content.replace(/collectionGroup\("books"\)/g, 'collectionGroup("kitaplar")');
                
                content = content.replace(/collection\("readingRecords"\)/g, 'collection("okumaKayitlari")');
                content = content.replace(/collection\("readingEvaluations"\)/g, 'collection("okumaDegerlendirmeleri")');
                
                content = content.replace(/collection\("announcements"\)/g, 'collection("duyurular")');
                content = content.replace(/collection\("subjects"\)/g, 'collection("dersler")');
                
                content = content.replace(/collection\("config"\)/g, 'collection("ayarlar")');
                content = content.replace(/collection\("settings"\)/g, 'collection("ayarlar")');
                
                content = content.replace(/collection\("tournaments"\)/g, 'collection("turnuvalar")');
                content = content.replace(/collection\("notifications"\)/g, 'collection("bildirimler")');
                content = content.replace(/collection\("chats"\)/g, 'collection("sohbetler")');
                content = content.replace(/collection\("schools"\)/g, 'collection("okullar")');
                
                // Fields that might have been changed in Student
                // Wait, I will not replace fields yet, only collections.
                
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

replaceInDir('app/src/main/java');
