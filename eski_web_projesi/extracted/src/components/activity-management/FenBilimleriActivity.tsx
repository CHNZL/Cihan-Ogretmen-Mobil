import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Star, 
  Zap, 
  Clock, 
  Info,
  ChevronRight,
  HeartPulse,
  Target,
  Leaf,
  Sun,
  Bug,
  Battery,
  Gamepad2,
  Settings,
  Swords,
  Rocket,
  Atom,
  FlaskConical,
  Brain,
  Compass,
  Sprout
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { 
  doc, 
  updateDoc, 
  increment,
  arrayUnion,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';

import { PersistentLeaderboardModal } from './PersistentLeaderboardModal';

import { BilenKazanirGame } from './games/BilenKazanirGame';
import { IkiliMucadeleGame } from './games/IkiliMucadeleGame';
import { SinifMucadelesiGame } from './games/SinifMucadelesiGame';
import { GrupYarismasiGame } from './games/GrupYarismasiGame';

interface Question {
  id: string;
  text: string;
  options: string[];
  answer: string;
  hint?: string;
}

const UNIT_QUESTIONS: Record<string, Question[]> = {
  'gezegenimiz': [
    { id: 'ge1', text: 'Dünyamızın şekli neye benzer?', options: ['Kareye', 'Küreye (Topa)', 'Silindire', 'Hiçbiri'], answer: 'Küreye (Topa)' },
    { id: 'ge2', text: 'Dünyamızın dörtte üçünü ne oluşturur?', options: ['Karalar', 'Sular', 'Bulutlar', 'Hiçbiri'], answer: 'Sular' },
    { id: 'ge3', text: 'Soluduğumuz havaya ne ad verilir?', options: ['Atmosfer', 'Su küre', 'Taş küre', 'Hiçbiri'], answer: 'Atmosfer' },
    { id: 'ge4', text: 'Dünyanın en dış tabakasına ne ad verilir?', options: ['Yer kabuğu', 'Çekirdek', 'Manto', 'Hiçbiri'], answer: 'Yer kabuğu' },
    { id: 'ge5', text: 'Gece ve gündüzün oluşma sebebi nedir?', options: ['Güneşin dönmesi', 'Dünyanın kendi etrafında dönmesi', 'Ayın dönmesi', 'Hiçbiri'], answer: 'Dünyanın kendi etrafında dönmesi' },
    { id: 'ge6', text: 'Dünyanın Güneş etrafında dolanması ne kadar sürer?', options: ['1 gün', '1 ay', '1 yıl', 'Hiçbiri'], answer: '1 yıl' },
    { id: 'ge7', text: 'Fosiller nerede bulunur?', options: ['Ağaç dallarında', 'Kayaç tabakalarında', 'Deniz yüzeyinde', 'Hiçbiri'], answer: 'Kayaç tabakalarında' },
    { id: 'ge8', text: 'Madenlerin ortak özelliği nedir?', options: ['Çok renkli olmaları', 'Ekonomik değerlerinin olması', 'Her yerde bulunmaları', 'Hiçbiri'], answer: 'Ekonomik değerlerinin olması' },
    { id: 'ge9', text: 'Hangisi bir maden değildir?', options: ['Altın', 'Boran', 'Toprak', 'Hiçbiri'], answer: 'Toprak' },
    { id: 'ge10', text: 'Dünyanın merkezinde bulunan en sıcak katman hangisidir?', options: ['Çekirdek', 'Manto', 'Yer kabuğu', 'Hiçbiri'], answer: 'Çekirdek' },
    { id: 'ge11', text: 'Hava kürede en çok hangi gaz bulunur?', options: ['Oksijen', 'Azot', 'Karbondioksit', 'Hiçbiri'], answer: 'Azot' },
    { id: 'ge12', text: 'Okyanuslar hangi kürenin parçasıdır?', options: ['Su küre', 'Taş küre', 'Hava küre', 'Hiçbiri'], answer: 'Su küre' },
    { id: 'ge13', text: 'Dağlar ve ovalar hangi kürede yer alır?', options: ['Taş küre', 'Su küre', 'Hava küre', 'Hiçbiri'], answer: 'Taş küre' },
    { id: 'ge14', text: 'Toprak nasıl oluşur?', options: ['Yağmurla', 'Kayaçların parçalanmasıyla', 'Ağaçlardan dökülerek', 'Hiçbiri'], answer: 'Kayaçların parçalanmasıyla' },
    { id: 'ge15', text: 'Dünya kendi etrafında hangi yönde döner?', options: ['Doğudan batıya', 'Batıdan doğuya', 'Kuzeyden güneye', 'Hiçbiri'], answer: 'Batıdan doğuya' },
    { id: 'ge16', text: 'Mevsimlerin oluşma sebebi nedir?', options: ['Dünyanın kendi etrafında dönmesi', 'Dünyanın Güneş etrafında dolanması ve eksen eğikliği', 'Ayın dünya etrafında dönmesi', 'Hiçbiri'], answer: 'Dünyanın Güneş etrafında dolanması ve eksen eğikliği' },
    { id: 'ge17', text: 'Kayaçların yapısında ne bulunur?', options: ['Plastik', 'Mineral', 'Kağıt', 'Hiçbiri'], answer: 'Mineral' },
    { id: 'ge18', text: 'Altın neden değerlidir?', options: ['Hafif olduğu için', 'Doğada az bulunduğu ve işlendiği için', 'Sarı olduğu için', 'Hiçbiri'], answer: 'Doğada az bulunduğu ve işlendiği için' },
    { id: 'ge19', text: 'Dünyanın katmanlarından hangisi gözlemlenebilir?', options: ['Ağır küre', 'Ateş küre', 'Taş küre', 'Hiçbiri'], answer: 'Taş küre' },
    { id: 'ge20', text: 'Fosilleşme için canlı kalıntısının ne ile temasının kesilmesi gerekir?', options: ['Su', 'Hava', 'Toprak', 'Hiçbiri'], answer: 'Hava' }
  ],
  'bes-duyumuz': [
    { id: 'du1', text: 'Çevremizdeki sesleri hangi duyu organımızla algılarız?', options: ['Göz', 'Burun', 'Kulak', 'Hiçbiri'], answer: 'Kulak' },
    { id: 'du2', text: 'Dokunma duyu organımız aşağıdakilerden hangisidir?', options: ['Deri', 'Dil', 'Göz', 'Hiçbiri'], answer: 'Deri' },
    { id: 'du3', text: 'Burnumuzla hangi işlemi yaparız?', options: ['Görme', 'Koklama', 'İşitme', 'Hiçbiri'], answer: 'Koklama' },
    { id: 'du4', text: 'Görmemizi sağlayan organ hangisidir?', options: ['Kulak', 'Burun', 'Göz', 'Hiçbiri'], answer: 'Göz' },
    { id: 'du5', text: 'Tat alma duyumuz hangisidir?', options: ['Dil', 'Deri', 'Burun', 'Hiçbiri'], answer: 'Dil' },
    { id: 'du6', text: 'Çok sıcak bir şeye dokunduğumuzda hangi duyumuz uyarılır?', options: ['Görme', 'Dokunma', 'İşitme', 'Hiçbiri'], answer: 'Dokunma' },
    { id: 'du7', text: 'Göz sağlığımız için hangisini yapmalıyız?', options: ['Kirli ellerle dokunmak', 'Televizyonu yakından izlemek', 'Kitap okurken mesafe bırakmak', 'Hiçbiri'], answer: 'Kitap okurken mesafe bırakmak' },
    { id: 'du8', text: 'Kulağımıza yabancı cisim sokarsak ne olur?', options: ['Daha iyi duyarız', 'İşitme kaybı yaşayabiliriz', 'Hiçbir şey olmaz', 'Hiçbiri'], answer: 'İşitme kaybı yaşayabiliriz' },
    { id: 'du9', text: 'Burnumuza kaçan tozları ne engeller?', options: ['Burun kılları ve sıvı', 'Dilimiz', 'Gözyaşımız', 'Hiçbiri'], answer: 'Burun kılları ve sıvı' },
    { id: 'du10', text: 'Vücudumuzun en büyük organı hangisidir?', options: ['Karaciğer', 'Deri', 'Akciğer', 'Hiçbiri'], answer: 'Deri' },
    { id: 'du11', text: 'Duyu organlarının hepsi nereye bağlıdır?', options: ['Kalbe', 'Mideye', 'Beyne', 'Hiçbiri'], answer: 'Beyne' },
    { id: 'du12', text: 'Limonun tadını hangi organımızla anlarız?', options: ['Burun', 'Dil', 'Göz', 'Hiçbiri'], answer: 'Dil' },
    { id: 'du13', text: 'Keskin bir kokuyu algılamayı ne sağlar?', options: ['Burun', 'Deri', 'Kulak', 'Hiçbiri'], answer: 'Burun' },
    { id: 'du14', text: 'Gözümüzün içine yabancı madde kaçarsa ne yapmalıyız?', options: ['Ovalamalıyız', 'Bol su ile yıkamalıyız', 'Kapatıp uyumalıyız', 'Hiçbiri'], answer: 'Bol su ile yıkamalıyız' },
    { id: 'du15', text: 'Hangi duyu organımız sesleri toplar?', options: ['Kulak kepçesi', 'Göz kapağı', 'Burun ucu', 'Hiçbiri'], answer: 'Kulak kepçesi' },
    { id: 'du16', text: 'Deri sağlığı için hangisi önemlidir?', options: ['Güneşte saatlerce kalmak', 'Düzenli banyo yapmak', 'Cildimizi boyamak', 'Hiçbiri'], answer: 'Düzenli banyo yapmak' },
    { id: 'du17', text: 'Karanlıkta hangi duyumuz işlevini yitirir?', options: ['Dokunma', 'Görme', 'İşitme', 'Hiçbiri'], answer: 'Görme' },
    { id: 'du18', text: 'Gürültülü ortamda uzun süre kalmak hangi organa zarar verir?', options: ['Göz', 'Kulak', 'Burun', 'Hiçbiri'], answer: 'Kulak' },
    { id: 'du19', text: 'Tat alma ve konuşmaya yardımcı organ hangisidir?', options: ['Dil', 'Diş', 'Dudak', 'Hiçbiri'], answer: 'Dil' },
    { id: 'du20', text: 'Hangisi beş duyumuzdan biri değildir?', options: ['Görme', 'Yürüme', 'İşitme', 'Hiçbiri'], answer: 'Yürüme' }
  ],
  'maddeyi-taniyalim': [
    { id: 'ma1', text: 'Suyu buzluğa koyduğumuzda hangi hale geçer?', options: ['Katı', 'Sıvı', 'Gaz', 'Hiçbiri'], answer: 'Katı' },
    { id: 'ma2', text: 'Aşağıdakilerden hangisi saydam(ışığı geçiren) maddedir?', options: ['Tahta', 'Cam', 'Demir', 'Hiçbiri'], answer: 'Cam' },
    { id: 'ma3', text: 'Suyun buharlaşmış haline ne ad verilir?', options: ['Buz', 'Çiy', 'Su Buharı', 'Hiçbiri'], answer: 'Su Buharı' },
    { id: 'ma4', text: 'Hangisi pürüzlü bir maddedir?', options: ['Zımpara kağıdı', 'Cam', 'Mermer', 'Hiçbiri'], answer: 'Zımpara kağıdı' },
    { id: 'ma5', text: 'Mıknatıs hangisini çekmez?', options: ['Demir', 'Plastik kaşık', 'Nikel', 'Hiçbiri'], answer: 'Plastik kaşık' },
    { id: 'ma6', text: 'Suda batan madde hangisidir?', options: ['Tahta parçası', 'Taş', 'Plastik top', 'Hiçbiri'], answer: 'Taş' },
    { id: 'ma7', text: 'Esnek madde hangisidir?', options: ['Paket lastiği', 'Demir çubuk', 'Cam bardak', 'Hiçbiri'], answer: 'Paket lastiği' },
    { id: 'ma8', text: 'Maddeyi niteleyen özelliklerden hangisi ölçülebilir?', options: ['Renk', 'Koku', 'Kütle', 'Hiçbiri'], answer: 'Kütle' },
    { id: 'ma9', text: 'Sıvı maddelerin ortak özelliği nedir?', options: ['Akışkan olmaları', 'Belirli bir şekillerinin olması', 'Sıkıştırılabilmeleri', 'Hiçbiri'], answer: 'Akışkan olmaları' },
    { id: 'ma10', text: 'Hangi madde suda yüzer?', options: ['Anahtar', 'Mantar tıpa', 'Madeni para', 'Hiçbiri'], answer: 'Mantar tıpa' },
    { id: 'ma11', text: 'Kırılgan madde hangisidir?', options: ['Sünger', 'Porselen tabak', 'Yün kazak', 'Hiçbiri'], answer: 'Porselen tabak' },
    { id: 'ma12', text: 'Maddenin kütlesini ne ile ölçeriz?', options: ['Metre', 'Terazi', 'Dereceli silindir', 'Hiçbiri'], answer: 'Terazi' },
    { id: 'ma13', text: 'Hangi madde gaz halindedir?', options: ['Süt', 'Hava', 'Tebeşir', 'Hiçbiri'], answer: 'Hava' },
    { id: 'ma14', text: 'Tadı olan ama kokusu olmayan madde hangisidir?', options: ['Parfüm', 'Şeker', 'Çiçek', 'Hiçbiri'], answer: 'Şeker' },
    { id: 'ma15', text: 'Yumuşak madde hangisidir?', options: ['Pamuk', 'Taş', 'Cam', 'Hiçbiri'], answer: 'Pamuk' },
    { id: 'ma16', text: 'Maddenin hacmini ne ile ölçeriz?', options: ['Dereceli silindir', 'Terazi', 'Termometre', 'Hiçbiri'], answer: 'Dereceli silindir' },
    { id: 'ma17', text: 'Sıvıların kütlesini ölçerken kullanılan boş kaba ne denir?', options: ['Brüt kütle', 'Dara', 'Net kütle', 'Hiçbiri'], answer: 'Dara' },
    { id: 'ma18', text: 'Mıknatısın kaç kutbu vardır?', options: ['1', '2', '3', 'Hiçbiri'], answer: '2' },
    { id: 'ma19', text: 'Opak madde ne demektir?', options: ['Işığı geçirmeyen', 'Işığı geçiren', 'Parlak olan', 'Hiçbiri'], answer: 'Işığı geçirmeyen' },
    { id: 'ma20', text: 'Sıvı maddeler konuldukları kabın neresinin şeklini alır?', options: ['Sadece tabanının', 'Doldurdukları kadarının', 'Tamamının', 'Hiçbiri'], answer: 'Doldurdukları kadarının' }
  ],
  'kuvvet': [
    { id: 'ku1', text: 'Mıknatıs aşağıdaki maddelerden hangisini çeker?', options: ['Plastik', 'Demir çivi', 'Tahta', 'Hiçbiri'], answer: 'Demir çivi' },
    { id: 'ku2', text: 'Oyuncak arabayı ittiğimizde ona ne uygulamış oluruz?', options: ['Çekme Kuvveti', 'İtme Kuvveti', 'Yerçekimi', 'Hiçbiri'], answer: 'İtme Kuvveti' },
    { id: 'ku3', text: 'Hızla giden bir cisme hareketinin tersi yönünde kuvvet uygularsak ne olur?', options: ['Hızlanır', 'Yavaşlar veya Durur', 'Yön değiştirmez', 'Hiçbiri'], answer: 'Yavaşlar veya Durur' },
    { id: 'ku4', text: 'Varlıktan uzaklaşan kuvvet hangisidir?', options: ['İtme', 'Çekme', 'Döndürme', 'Hiçbiri'], answer: 'İtme' },
    { id: 'ku5', text: 'Mıknatısın aynı kutupları birbirini ne yapar?', options: ['Çeker', 'İter', 'Etkilemez', 'Hiçbiri'], answer: 'İter' },
    { id: 'ku6', text: 'Duran bir topu harekete geçirmek için ne yapmalıyız?', options: ['Bakmalıyız', 'Kuvvet uygulamalıyız', 'Beklemeliyiz', 'Hiçbiri'], answer: 'Kuvvet uygulamalıyız' },
    { id: 'ku7', text: 'Bisiklet sürerken pedala basmak hangi hareketi sağlar?', options: ['Dönme', 'Sallanma', 'Zıplama', 'Hiçbiri'], answer: 'Dönme' },
    { id: 'ku8', text: 'Mıknatıs nerede kullanılmaz?', options: ['Pusula', 'Radyo hoparlörü', 'Tahta cetvel', 'Hiçbiri'], answer: 'Tahta cetvel' },
    { id: 'ku9', text: 'Sallanacak koltukta hangi hareket türü vardır?', options: ['Hızlanma', 'Sallanma', 'Dönme', 'Hiçbiri'], answer: 'Sallanma' },
    { id: 'ku10', text: 'Kuvvetin şekil değiştirici etkisine örnek hangisidir?', options: ['Topa vurmak', 'Oyun hamurunu sıkmak', 'Kapıyı açmak', 'Hiçbiri'], answer: 'Oyun hamurunu sıkmak' },
    { id: 'ku11', text: 'Mıknatıs hangi metali çekmez?', options: ['Demir', 'Gümüş', 'Nikel', 'Hiçbiri'], answer: 'Gümüş' },
    { id: 'ku12', text: 'Varlığa yaklaşıyorsa hangi kuvvet uygulanıyordur?', options: ['İtme', 'Çekme', 'Durdurma', 'Hiçbiri'], answer: 'Çekme' },
    { id: 'ku13', text: 'Hareket halindeki bir cismin yönünü değiştirmek için ne gerekir?', options: ['Işık', 'Ses', 'Kuvvet', 'Hiçbiri'], answer: 'Kuvvet' },
    { id: 'ku14', text: 'Fren yapan arabanın hareketi hangisidir?', options: ['Hızlanma', 'Yavaşlama', 'Sallanma', 'Hiçbiri'], answer: 'Yavaşlama' },
    { id: 'ku15', text: 'Sünger sıkıldıktan sonra eski haline dönüyorsa bu neyi gösterir?', options: ['Esnek olduğunu', 'Sert olduğunu', 'Kırılgan olduğunu', 'Hiçbiri'], answer: 'Esnek olduğunu' },
    { id: 'ku16', text: 'Hangi kuvvet türü temas gerektirmez?', options: ['İtme', 'Çekme', 'Mıknatıs kuvveti', 'Hiçbiri'], answer: 'Mıknatıs kuvveti' },
    { id: 'ku17', text: 'Mıknatıs aşağıdakilerden hangisinden etkilenir?', options: ['Televizyon ekranı', 'Tahta sıra', 'Kağıt', 'Hiçbiri'], answer: 'Televizyon ekranı' },
    { id: 'ku18', text: 'Uçağın pisten kalkarken yaptığı hareket hangisidir?', options: ['Yavaşlama', 'Hızlanma', 'Dönme', 'Hiçbiri'], answer: 'Hızlanma' },
    { id: 'ku19', text: 'Kapı kolunu kendimize doğru çektiğimizde hangi kuvveti uygularız?', options: ['İtme', 'Çekme', 'Döndürme', 'Hiçbiri'], answer: 'Çekme' },
    { id: 'ku20', text: 'Kuvvetin etkisi kalkınca eski haline dönmeyen madde hangisidir?', options: ['Lastik', 'Cam macunu', 'Yay', 'Hiçbiri'], answer: 'Cam macunu' }
  ],
  'isik-ve-sesler': [
    { id: 'is1', text: 'Aşağıdakilerden hangisi doğal bir ışık kaynağıdır?', options: ['Mum', 'El Feneri', 'Güneş', 'Hiçbiri'], answer: 'Güneş' },
    { id: 'is2', text: 'Hangisi yapay bir ses kaynağıdır?', options: ['Kuş Sesi', 'Radyo Sesi', 'Rüzgar Sesi', 'Hiçbiri'], answer: 'Radyo Sesi' },
    { id: 'is3', text: 'Sesin şiddetini artırmak için hangi aracı kullanabiliriz?', options: ['Teleskop', 'Mikroskop', 'Megafon', 'Hiçbiri'], answer: 'Megafon' },
    { id: 'is4', text: 'Karanlık bir ortamda görmemizi sağlayan nedir?', options: ['Hava', 'Işık', 'Ses', 'Hiçbiri'], answer: 'Işık' },
    { id: 'is5', text: 'Hangisi bir aydınlatma teknolojisi değildir?', options: ['Ampul', 'Mum', 'Mikroskop', 'Hiçbiri'], answer: 'Mikroskop' },
    { id: 'is6', text: 'Dünyamızın en büyük ısı ve ışık kaynağı nedir?', options: ['Ay', 'Güneş', 'Yıldızlar', 'Hiçbiri'], answer: 'Güneş' },
    { id: 'is7', text: 'Ses her yöne nasıl yayılır?', options: ['Düz çizgilerle', 'Dalgalar halinde', 'Işık gibi', 'Hiçbiri'], answer: 'Dalgalar halinde' },
    { id: 'is8', text: 'Hangi ışık kaynağı insanlar tarafından yapılmıştır?', options: ['Yıldız', 'Şimşek', 'Lamba', 'Hiçbiri'], answer: 'Lamba' },
    { id: 'is9', text: 'Işığın gereğinden fazla kullanımı neye sebep olur?', options: ['Gürültü kirliliği', 'Işık kirliliği', 'Hava kirliliği', 'Hiçbiri'], answer: 'Işık kirliliği' },
    { id: 'is10', text: 'Sesi duymamızı sağlayan temel özellik nedir?', options: ['Sesin rengi', 'Sesin şiddeti', 'Sesin hızı', 'Hiçbiri'], answer: 'Sesin şiddeti' },
    { id: 'is11', text: 'Hangi ses doğal bir ses kaynağıdır?', options: ['Araba kornası', 'Gök gürültüsü', 'Müzik sesi', 'Hiçbiri'], answer: 'Gök gürültüsü' },
    { id: 'is12', text: 'Yarasalar karanlıkta yollarını neyle bulur?', options: ['Gözleriyle', 'Sese duyarlı radarlarıyla', 'Elleriyle', 'Hiçbiri'], answer: 'Sese duyarlı radarlarıyla' },
    { id: 'is13', text: 'Trafik lambaları ne amaçla kullanılır?', options: ['Aydınlatma', 'Uyarı ve işaret', 'Isınma', 'Hiçbiri'], answer: 'Uyarı ve işaret' },
    { id: 'is14', text: 'İşitme organımız hangisidir?', options: ['Burun', 'Kulak', 'Göz', 'Hiçbiri'], answer: 'Kulak' },
    { id: 'is15', text: 'Hangi madde sesi daha iyi iletir?', options: ['Hava', 'Su', 'Katı demir', 'Hiçbiri'], answer: 'Katı demir' },
    { id: 'is16', text: 'Işık kirliliği en çok nerede görülür?', options: ['Köylerde', 'Büyük şehirlerde', 'Ormanlarda', 'Hiçbiri'], answer: 'Büyük şehirlerde' },
    { id: 'is17', text: 'Gece araçların yolu görmesini sağlayan nedir?', options: ['Farlar', 'Sinyaller', 'Tavan lambası', 'Hiçbiri'], answer: 'Farlar' },
    { id: 'is18', text: 'Yüksek sesli müzik dinlemek neye zarar verir?', options: ['Görme yetisine', 'İşitme sağlığına', 'Dokunma duyusuna', 'Hiçbiri'], answer: 'İşitme sağlığına' },
    { id: 'is19', text: 'Ateş böceği hangi kaynaktır?', options: ['Yapay ışık kaynağı', 'Doğal ışık kaynağı', 'Yapay ses kaynağı', 'Hiçbiri'], answer: 'Doğal ışık kaynağı' },
    { id: 'is20', text: 'Uygun aydınlatma nasıl olmalıdır?', options: ['Çok parlak', 'Doğrudan göze gelen', 'İhtiyaç duyulan yere doğru', 'Hiçbiri'], answer: 'İhtiyaç duyulan yere doğru' }
  ],
  'canlilar-dunyasi': [
    { id: 'ca1', text: 'Aşağıdakilerden hangisi canlı bir varlıktır?', options: ['Ağaç', 'Taş', 'Toprak', 'Hiçbiri'], answer: 'Ağaç' },
    { id: 'ca2', text: 'Bitkilerin kendi besinlerini üretebilmek için öncelikle neye ihtiyacı vardır?', options: ['Plastik', 'Güneş Işığı', 'Karanlık', 'Hiçbiri'], answer: 'Güneş Işığı' },
    { id: 'ca3', text: 'Canlıların sağlıklı yaşayabilmesi için çevrelerinin nasıl olması gerekir?', options: ['Kirli', 'Karanlık', 'Temiz', 'Hiçbiri'], answer: 'Temiz' },
    { id: 'ca4', text: 'Hangi varlık cansızdır?', options: ['Kuş', 'Araba', 'Çiçek', 'Hiçbiri'], answer: 'Araba' },
    { id: 'ca5', text: 'Canlıların ortak özelliği hangisidir?', options: ['Hareket etme', 'Konuşma', 'Okuma yazma', 'Hiçbiri'], answer: 'Hareket etme' },
    { id: 'ca6', text: 'Bitkiler boşaltımı nasıl yapar?', options: ['Terleme ve yaprak dökümüyle', 'Koşarak', 'Bağırarak', 'Hiçbiri'], answer: 'Terleme ve yaprak dökümüyle' },
    { id: 'ca7', text: 'Hangisi çevre kirliliğine sebep olur?', options: ['Fidan dikmek', 'Yere çöp atmak', 'Geri dönüşüm yapmak', 'Hiçbiri'], answer: 'Yere çöp atmak' },
    { id: 'ca8', text: 'Doğal çevre neresidir?', options: ['Şehir merkezleri', 'Milli parklar ve ormanlar', 'Alışveriş merkezleri', 'Hiçbiri'], answer: 'Milli parklar ve ormanlar' },
    { id: 'ca9', text: 'Canlıların nesillerini devam ettirmesine ne denir?', options: ['Beslenme', 'Üreme', 'Solunum', 'Hiçbiri'], answer: 'Üreme' },
    { id: 'ca10', text: 'Hangisi yapay bir çevredir?', options: ['Deniz', 'Akvaryum', 'Mağara', 'Hiçbiri'], answer: 'Akvaryum' },
    { id: 'ca11', text: 'Bitkiler toprağa neyle tutunur?', options: ['Yaprakla', 'Gövdeyle', 'Köklerle', 'Hiçbiri'], answer: 'Köklerle' },
    { id: 'ca12', text: 'Canlıların enerji ihtiyacını karşılaması için ne yapması gerekir?', options: ['Uyuması', 'Beslenmesi', 'Gezmesi', 'Hiçbiri'], answer: 'Beslenmesi' },
    { id: 'ca13', text: 'Hangi organımız solunum yapar?', options: ['Mide', 'Akciğer', 'Böbrek', 'Hiçbiri'], answer: 'Akciğer' },
    { id: 'ca14', text: 'Çevreyi korumak için hangisini yapmamalıyız?', options: ['Ağaç dikmek', 'Atık pilleri toprağa atmak', 'Su tasarrufu yapmak', 'Hiçbiri'], answer: 'Atık pilleri toprağa atmak' },
    { id: 'ca15', text: 'Mikroskopla görülebilen canlılara ne denir?', options: ['Büyük canlılar', 'Mikroskobik canlılar', 'Görünmezler', 'Hiçbiri'], answer: 'Mikroskobik canlılar' },
    { id: 'ca16', text: 'Bitkiler hangi organıyla güneş ışığını toplar?', options: ['Kök', 'Yaprak', 'Tohum', 'Hiçbiri'], answer: 'Yaprak' },
    { id: 'ca17', text: 'Kedi hangi gruptadır?', options: ['Bitkiler', 'Hayvanlar', 'Mantarlar', 'Hiçbiri'], answer: 'Hayvanlar' },
    { id: 'ca18', text: 'Canlıların dışarıdan gelen uyarılara tepki vermesine ne denir?', options: ['Duyarlılık', 'Büyüme', 'Beslenme', 'Hiçbiri'], answer: 'Duyarlılık' },
    { id: 'ca19', text: 'Toprağı korumak için ne yapılmalıdır?', options: ['Çimentoyla kaplanmalı', 'Erozyonu önlemek için ağaçlandırılmalı', 'Daha çok kazılmalı', 'Hiçbiri'], answer: 'Erozyonu önlemek için ağaçlandırılmalı' },
    { id: 'ca20', text: 'Hangisi bir çevre dostudur?', options: ['Plastik torba', 'Bez çanta', 'Egzoz dumanı', 'Hiçbiri'], answer: 'Bez çanta' }
  ],
  'elektrikli-araclar': [
    { id: 'el1', text: 'Aşağıdakilerden hangisi doğrudan şehir elektriği(priz) ile çalışır?', options: ['Buzdolabı', 'Kumanda', 'Kol Saati', 'Hiçbiri'], answer: 'Buzdolabı' },
    { id: 'el2', text: 'Televizyon kumandası ve el feneri genellikle ne ile çalışır?', options: ['Pil', 'Akü', 'Şehir Elektriği', 'Hiçbiri'], answer: 'Pil' },
    { id: 'el3', text: 'Otomobil gibi taşıtlarda elektriği depolayarak çalışan güç kaynağına ne ad verilir?', options: ['Kablo', 'Akü', 'Priz', 'Hiçbiri'], answer: 'Akü' },
    { id: 'el4', text: 'Elektriği tasarruflu kullanmak için hangisi yapılmalıdır?', options: ['Gereksiz lambaları kapatmak', 'Hepsini açık bırakmak', 'Gündüz ışıkları açmak', 'Hiçbiri'], answer: 'Gereksiz lambaları kapatmak' },
    { id: 'el5', text: 'Hangi araç ısınma amaçlı elektrik kullanır?', options: ['Televizyon', 'Elektrikli soba', 'Vantilatör', 'Hiçbiri'], answer: 'Elektrikli soba' },
    { id: 'el6', text: 'Piller bittiğinde ne yapılmalıdır?', options: ['Çöpe atılmalı', 'Atık pil kutusuna atılmalı', 'Toprağa gömülmeli', 'Hiçbiri'], answer: 'Atık pil kutusuna atılmalı' },
    { id: 'el7', text: 'Şehir elektriği nerede üretilir?', options: ['Evlerde', 'Elektrik santrallerinde', 'Okullarda', 'Hiçbiri'], answer: 'Elektrik santrallerinde' },
    { id: 'el8', text: 'Elektrikli araçları kullanırken hangisi tehlikelidir?', options: ['Islak elle dokunmak', 'Kablodan çekmek', 'Her ikisi de', 'Hiçbiri'], answer: 'Her ikisi de' },
    { id: 'el9', text: 'Vantilatör elektriği neye dönüştürür?', options: ['Isıya', 'Harekete', 'Işığa', 'Hiçbiri'], answer: 'Harekete' },
    { id: 'el10', text: 'Hangi araç aydınlatma amaçlı kullanılır?', options: ['Ütü', 'Abajur', 'Fırın', 'Hiçbiri'], answer: 'Abajur' },
    { id: 'el11', text: 'Elektrik çarpmasından korunmak için hangisi kullanılmalıdır?', options: ['Açık kablolar', 'Priz koruyucular', 'Metal çubuklar', 'Hiçbiri'], answer: 'Priz koruyucular' },
    { id: 'el12', text: 'Çamaşır makinesi hangi amaçla kullanılır?', options: ['Eğlence', 'Temizlik', 'Aydınlatma', 'Hiçbiri'], answer: 'Temizlik' },
    { id: 'el13', text: 'Bilgisayar hangi enerjiyle çalışır?', options: ['Rüzgar', 'Elektrik', 'Su', 'Hiçbiri'], answer: 'Elektrik' },
    { id: 'el14', text: 'Elektrik enerjisi kablolar üzerinden nasıl iletilir?', options: ['Uçarak', 'İletken tellerle', 'Rüzgarla', 'Hiçbiri'], answer: 'İletken tellerle' },
    { id: 'el15', text: 'Kullanımı biten elektrikli araçların fişi ne yapılmalıdır?', options: ['Prizde bırakılmalı', 'Prizden çekilmeli', 'Hep açık kalmalı', 'Hiçbiri'], answer: 'Prizden çekilmeli' },
    { id: 'el16', text: 'Tasarruflu ampul kullanmak ne sağlar?', options: ['Daha çok fatura', 'Enerji tasarrufu', 'Daha az ışık', 'Hiçbiri'], answer: 'Enerji tasarrufu' },
    { id: 'el17', text: 'Hangi araç mutfakta kullanılır?', options: ['Ütü', 'Mikser', 'Bilgisayar', 'Hiçbiri'], answer: 'Mikser' },
    { id: 'el18', text: 'Elektrik devresini açıp kapatmaya ne yarar?', options: ['Kablo', 'Lamba', 'Anahtar', 'Hiçbiri'], answer: 'Anahtar' },
    { id: 'el19', text: 'Statik elektrik nerede görülebilir?', options: ['Prizde', 'Plastik tarak saçlarımıza sürüldüğünde', 'Pilde', 'Hiçbiri'], answer: 'Plastik tarak saçlarımıza sürüldüğünde' },
    { id: 'el20', text: 'Hangisi bir enerji tasarrufu sembolüdür?', options: ['A+++', 'Z--', 'B', 'Hiçbiri'], answer: 'A+++' }
  ]
};

const UNITS = [
  { id: 'gezegenimiz', title: 'Dünya\'mızın Şekli', icon: Leaf, color: 'bg-emerald-500' },
  { id: 'bes-duyumuz', title: 'Beş Duyumuz', icon: HeartPulse, color: 'bg-rose-500' },
  { id: 'maddeyi-taniyalim', title: 'Maddeyi Tanıyalım', icon: Target, color: 'bg-indigo-500' },
  { id: 'kuvvet', title: 'Kuvvet', icon: Zap, color: 'bg-amber-500' },
  { id: 'isik-ve-sesler', title: 'Işık ve Sesler', icon: Sun, color: 'bg-orange-500' },
  { id: 'canlilar-dunyasi', title: 'Canlılar Dünyası', icon: Bug, color: 'bg-lime-500' },
  { id: 'elektrikli-araclar', title: 'Elektrikli Araçlar', icon: Battery, color: 'bg-cyan-500' },
];

const REWARD_CATEGORIES = [
  'Hayat Bilgisi Yıldızı',
  'Fen Bilimleri Yıldızı',
  'Türkçe Yıldızı',
  'Matematik Yıldızı',
  'Öğretmen Özel Ödülü Yıldızı'
];

export interface FenBilimleriActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo?: () => void;
  units?: any[];
  questions?: any[];
  onManageQuestions?: () => void;
}

export const FenBilimleriActivity: React.FC<FenBilimleriActivityProps> = ({ onBack, students, user, onShowInfo, units, questions, onManageQuestions }) => {
  const [jokerSettings, setJokerSettings] = useState<JokerSettings>(defaultJokerSettings);
  const [stage, setStage] = useState<'setup' | 'playing'>('setup');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Game Mode & Settings
  const [gameMode, setGameMode] = useState<'bilen-kazanir' | 'ikili-mucadele' | 'sinif-mucadelesi' | 'grup-yarismasi' | ''>('');
  
  const [ikiliType, setIkiliType] = useState<'sureli' | 'sorulu'>('sureli');
  const [ikiliTime, setIkiliTime] = useState(30);
  const [ikiliTarget, setIkiliTarget] = useState(5);
  
  const [sinifType, setSinifType] = useState<'sureli' | 'sorulu'>('sureli');
  const [sinifTime, setSinifTime] = useState(30);
  const [sinifTarget, setSinifTarget] = useState(5);
  const [sinifRewardAmount, setSinifRewardAmount] = useState(100);
  
  const [grupSize, setGrupSize] = useState(3);
  
  const [rewardAmount, setRewardAmount] = useState(1);
  const [ikiliRewardAmount, setIkiliRewardAmount] = useState(1);
  const [rewardCategory, setRewardCategory] = useState<string>('Fen Bilimleri Yıldızı');

  
  const [customQuestions, setCustomQuestions] = useState<Record<string, Question[]>>({});
  const [deletedDefaultQuestions, setDeletedDefaultQuestions] = useState<string[]>([]);
  const [leaderboardModalUnit, setLeaderboardModalUnit] = useState<any | null>(null);
  const [manageQuestionsModal, setManageQuestionsModal] = useState<{
    isOpen: boolean;
    unitId: string;
    view: 'list' | 'add' | 'edit';
    editingId: string | null;
  }>({ isOpen: false, unitId: 'gezegenimiz', view: 'list', editingId: null });

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const path = `users/${user.uid}/activitySettings/fenBilimleri`;
      try {
        const docRef = doc(db, path);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setDeletedDefaultQuestions(snap.data().deletedQuestions || []);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCustomQuestions = async () => {
      const path = `users/${user.uid}/fenBilimleriQuestions`;
      try {
        const customQRef = collection(db, path);
        const snapshot = await getDocs(customQRef);
        const fetched: Record<string, Question[]> = {};
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.unitId) {
            if (!fetched[data.unitId]) fetched[data.unitId] = [];
            fetched[data.unitId].push({
              id: docSnap.id,
              text: data.question,
              options: data.options,
              answer: data.answer
            });
          }
        });
        setCustomQuestions(fetched);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    };
    fetchCustomQuestions();
  }, [user]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getSubQuestions = () => {
    let pool = UNIT_QUESTIONS[selectedUnit!] || [];
    pool = pool.filter(q => !deletedDefaultQuestions.includes(q.id));
    if (customQuestions[selectedUnit!]) {
      pool = [...pool, ...customQuestions[selectedUnit!]];
    }
    
    // Also add global questions mapped to this unit
    if (questions && questions.length > 0) {
      const globalQs = questions.filter(q => q.unitId === selectedUnit);
      if (globalQs.length > 0) {
        pool = [...pool, ...globalQs.map(q => ({
          id: q.id,
          text: q.content || q.text,
          options: q.options || [],
          answer: q.correctAnswer || q.answer
        }))];
      }
    }

    if (pool.length === 0) {
      const unitName = units?.find(u => u.id === selectedUnit)?.name || 'Bu Ünite';
      pool = Array.from({ length: 20 }).map((_, i) => ({
        id: `generic_${selectedUnit}_${i}`,
        text: `${unitName} ile ilgili konuyu ne kadar iyi öğrendiğinizi düşünüyorsunuz?`,
        options: ['Çok İyi', 'İdare Eder', 'Daha Çok Çalışmalıyım', 'Hiçbiri'],
        answer: 'Çok İyi'
      }));
    }
    
    return pool;
  };

  const startActivity = () => {
    if (!selectedUnit || selectedStudents.length === 0) return;
    setStage('playing');
  };

  const [newQuestionForm, setNewQuestionForm] = useState({
    unitId: 'gezegenimiz',
    question: '',
    optA: '',
    optB: '',
    optC: '',
    answer: 'A'
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsAddingQuestion(true);
    try {
      const options = [newQuestionForm.optA, newQuestionForm.optB, newQuestionForm.optC];
      const answerIndex = newQuestionForm.answer === 'A' ? 0 : newQuestionForm.answer === 'B' ? 1 : 2;
      
      const qd = {
        unitId: newQuestionForm.unitId,
        question: newQuestionForm.question,
        options,
        answer: options[answerIndex]
      };
      
      if (manageQuestionsModal.editingId && (manageQuestionsModal.editingId.length > 10 || manageQuestionsModal.editingId.startsWith('custom_'))) {
         // Update custom question
         await updateDoc(doc(db, `users/${user.uid}/fenBilimleriQuestions/${manageQuestionsModal.editingId}`), { ...qd, updatedAt: Date.now() });
         setCustomQuestions(prev => {
           const uqs = prev[qd.unitId] || [];
           const updated = uqs.map(uq => uq.id === manageQuestionsModal.editingId ? { id: manageQuestionsModal.editingId!, text: qd.question, options: qd.options, answer: qd.answer } : uq);
           return { ...prev, [qd.unitId]: updated };
         });
      } else {
         // Add as new custom question
         const docRef = await addDoc(collection(db, `users/${user.uid}/fenBilimleriQuestions`), { ...qd, createdAt: Date.now() });
         setCustomQuestions(prev => {
           const uqs = prev[qd.unitId] || [];
           return {
             ...prev,
             [qd.unitId]: [...uqs, { id: docRef.id, text: qd.question, options: qd.options, answer: qd.answer }]
           };
         });
         // If editing a default question, hide the old one
         if (manageQuestionsModal.editingId) {
           const newDeleted = [...deletedDefaultQuestions, manageQuestionsModal.editingId];
           setDeletedDefaultQuestions(newDeleted);
           await setDoc(doc(db, `users/${user.uid}/activitySettings/fenBilimleri`), { deletedQuestions: newDeleted }, { merge: true });
         }
      }
      
      setManageQuestionsModal(prev => ({ ...prev, view: 'list', editingId: null }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!user || !window.confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    try {
      if (q.id.length > 10 || q.id.startsWith('custom_')) {
        await deleteDoc(doc(db, `users/${user.uid}/fenBilimleriQuestions/${q.id}`));
        setCustomQuestions(prev => {
          const uqs = prev[manageQuestionsModal.unitId] || [];
          return {
            ...prev,
            [manageQuestionsModal.unitId]: uqs.filter(uq => uq.id !== q.id)
          };
        });
      } else {
        const newDeleted = [...deletedDefaultQuestions, q.id];
        setDeletedDefaultQuestions(newDeleted);
        await setDoc(doc(db, `users/${user.uid}/activitySettings/fenBilimleri`), { deletedQuestions: newDeleted }, { merge: true });
      }
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-teal-50/30 dark:bg-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-[80px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-[80px]" />
        
        {/* Animated pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', 
            backgroundSize: '24px 24px' 
          }} 
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="group flex items-center gap-2 px-5 py-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all active:scale-95"
            >
              <ArrowLeft className="text-neutral-500 font-bold group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold text-sm text-neutral-600 dark:text-neutral-300">Geri Dön</span>
            </button>
          </div>

          <div className="flex flex-col items-center">
             <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 px-6 py-4 rounded-[2rem] border-2 border-teal-100 dark:border-teal-900 shadow-xl shadow-teal-500/10">
                <div className="p-3 bg-teal-500 dark:bg-teal-600 text-white rounded-2xl shadow-md">
                   <Leaf size={28} strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                  Fen Bilimleri <span className="text-teal-600 dark:text-teal-400 font-extrabold">Arenası</span>
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-3">
            {onShowInfo && (
              <button 
                onClick={onShowInfo} 
                className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 shadow-sm hover:scale-105 active:scale-95 transition-all text-neutral-500 hover:text-teal-500"
              >
                <Info size={24} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {stage === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6"
            >
              {/* Ünite Seçimi - Yatay / 2 Satır */}
              <div className="dashboard-card p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 rounded-2xl">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Target size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                        İçerik Havuzu
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Ünite Seçimi</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (onManageQuestions) {
                        onManageQuestions();
                      } else {
                        setManageQuestionsModal(prev => ({ ...prev, isOpen: true }));
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-neutral-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-700 dark:text-slate-300 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700"
                  >
                    <Settings size={14} />
                    <span className="text-xs font-medium">Soruları Yönet</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(units && units.length > 0 ? units : UNITS).map((unit, idx) => {
                    const FALLBACK_ICONS = [Compass, FlaskConical, Rocket, Brain, Atom, Sprout, Target, Sun];
                    const FALLBACK_COLORS = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-cyan-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                    const Icon = unit.icon || FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
                    const colorClasses = unit.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                    
                    return (
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit.id)}
                      className={`relative w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group cursor-pointer overflow-hidden ${
                        selectedUnit === unit.id 
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-900/40 shadow-lg shadow-teal-500/10 scale-[1.02]' 
                        : 'border-slate-100 dark:border-neutral-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-neutral-900 shadow-sm'
                      }`}
                    >
                      {/* Colorful background glow */}
                      {selectedUnit === unit.id && (
                        <div className={`absolute top-0 right-0 w-24 h-24 ${colorClasses} opacity-10 rounded-full -mr-12 -mt-12 blur-2xl`} />
                      )}

                      <div className={`w-12 h-12 rounded-xl ${colorClasses} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-6 transition-transform`}>
                        <Icon size={20} strokeWidth={2.5} />
                      </div>
                      
                      <div className="flex-1 min-w-0 font-bold">
                        <span className="block text-[13px] text-slate-800 dark:text-neutral-100 truncate leading-tight uppercase tracking-tight">
                          {unit.name || unit.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className={`w-2 h-2 rounded-full ${selectedUnit === unit.id ? 'bg-teal-500 animate-pulse' : 'bg-slate-300 dark:bg-neutral-700'}`} />
                          <span className={`text-[10px] uppercase font-black tracking-widest ${selectedUnit === unit.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {selectedUnit === unit.id ? 'Aktif Ünite' : 'Üniteyi Seç'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setLeaderboardModalUnit(unit);
                        }}
                        className={`p-2.5 rounded-xl transition-all ${
                          selectedUnit === unit.id
                          ? 'bg-white text-teal-600 shadow-sm hover:bg-teal-50'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-500'
                        }`}
                        title="Sıralama"
                      >
                        <Trophy size={16} />
                      </button>
                    </motion.div>
                  )})}
                </div>
              </div>

              {/* Alt Kısım: Oyun Modu ve Öğrenciler */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
                {/* Oyun Modu Kartı */}
                <div className="dashboard-card p-6 flex flex-col xl:col-span-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl min-h-[450px] shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Gamepad2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">Oyun Modu</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Mod Seçimi ve Ayarlar</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                    {/* Mod Listesi */}
                    <div className="flex flex-row md:flex-col gap-3 w-full md:w-48 xl:w-56 shrink-0">
                      {[
                        { id: 'bilen-kazanir', label: 'Bilen Kazanır', icon: Trophy },
                        { id: 'ikili-mucadele', label: 'İkili Mücadele', icon: Users },
                        { id: 'sinif-mucadelesi', label: 'Sınıf Mücadelesi', icon: Swords },
                        { id: 'grup-yarismasi', label: 'Grup Yarışması', icon: Zap }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setGameMode(mode.id as any)}
                          className={`flex-1 md:flex-none flex items-center gap-3 p-3.5 rounded-xl border transition-all relative overflow-hidden text-left ${
                            gameMode === mode.id
                            ? `border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20`
                            : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-200 dark:hover:border-indigo-800'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gameMode === mode.id ? 'bg-indigo-500 text-white shadow-sm' : `bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400`}`}>
                            <mode.icon size={16} />
                          </div>
                          <span className={`text-xs font-semibold ${gameMode === mode.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-neutral-300'}`}>
                            {mode.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Ayarlar Alanı */}
                    <div className="flex-1 rounded-xl overflow-y-auto custom-scrollbar">
                      <AnimatePresence mode="wait">
                        {!gameMode ? (
                          <motion.div 
                            key="no" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl"
                          >
                            <div className="w-12 h-12 bg-slate-50 dark:bg-neutral-800/50 rounded-full flex items-center justify-center text-slate-300 dark:text-neutral-600">
                               <Settings size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-400">Konfigürasyon için bir mod seçin</p>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key={gameMode} 
                            initial={{ opacity: 0, x: 10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="space-y-6"
                          >
                            {gameMode === 'bilen-kazanir' && (
                               <div className="space-y-4">
                                  <div>
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">Ödül Kategorisi</label>
                                    <select 
                                      value={rewardCategory}
                                      onChange={(e) => setRewardCategory(e.target.value)}
                                      className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white"
                                    >
                                      {REWARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">Yıldız Miktarı</label>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setRewardAmount(prev => Math.max(1, prev - 1))} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">-</button>
                                        <div className="flex-1 text-center">
                                           <span className="text-3xl font-light text-slate-900 dark:text-white">{rewardAmount}</span>
                                        </div>
                                        <button onClick={() => setRewardAmount(prev => prev + 1)} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">+</button>
                                    </div>
                                  </div>
                               </div>
                            )}

                            {gameMode === 'ikili-mucadele' && (
                               <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setIkiliType('sureli')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${ikiliType === 'sureli' ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-500'}`}>
                                      <Clock size={16} />
                                      <span className="text-xs font-medium">Süreli</span>
                                    </button>
                                    <button onClick={() => setIkiliType('sorulu')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${ikiliType === 'sorulu' ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-500'}`}>
                                      <Target size={16} />
                                      <span className="text-xs font-medium">Hedef Doğru</span>
                                    </button>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">
                                       {ikiliType === 'sureli' ? 'Oyun Süresi (Saniye)' : 'Hedef Doğru'}
                                    </label>
                                    <div className="flex items-center gap-4">
                                       <button onClick={() => ikiliType === 'sureli' ? setIkiliTime(prev => Math.max(10, prev - 10)) : setIkiliTarget(prev => Math.max(1, prev - 1))} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">-</button>
                                       <span className="flex-1 text-center text-3xl font-light text-slate-900 dark:text-white">
                                          {ikiliType === 'sureli' ? ikiliTime : ikiliTarget}
                                       </span>
                                       <button onClick={() => ikiliType === 'sureli' ? setIkiliTime(prev => prev + 10) : setIkiliTarget(prev => prev + 1)} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">+</button>
                                    </div>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">Kazanana Verilecek Puan</label>
                                     <div className="flex items-center justify-between gap-2">
                                        {[1,2,3,4,5].map(v => (
                                          <button key={v} onClick={() => setIkiliRewardAmount(v)} className={`flex-1 h-10 rounded-lg font-medium text-sm transition-all border ${ikiliRewardAmount === v ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-neutral-700 border-slate-200 dark:border-neutral-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                                             {v}
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            )}

                            {gameMode === 'sinif-mucadelesi' && (
                               <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setSinifType('sureli')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${sinifType === 'sureli' ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-500'}`}>
                                      <Clock size={16} />
                                      <span className="text-xs font-medium">Süreli</span>
                                    </button>
                                    <button onClick={() => setSinifType('sorulu')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${sinifType === 'sorulu' ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-500'}`}>
                                      <Target size={16} />
                                      <span className="text-xs font-medium">Hedef Doğru</span>
                                    </button>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">
                                       {sinifType === 'sureli' ? 'Oyun Süresi (Saniye)' : 'Hedef Doğru'}
                                    </label>
                                    <div className="flex items-center gap-4">
                                       <button onClick={() => sinifType === 'sureli' ? setSinifTime(prev => Math.max(10, prev - 10)) : setSinifTarget(prev => Math.max(1, prev - 1))} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">-</button>
                                       <span className="flex-1 text-center text-3xl font-light text-slate-900 dark:text-white">
                                          {sinifType === 'sureli' ? sinifTime : sinifTarget}
                                       </span>
                                       <button onClick={() => sinifType === 'sureli' ? setSinifTime(prev => prev + 10) : setSinifTarget(prev => prev + 1)} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">+</button>
                                    </div>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">Büyük Ödül Miktarı</label>
                                     <div className="flex items-center justify-between gap-2">
                                        {[20, 40, 60, 80, 100].map(v => (
                                          <button key={v} onClick={() => setSinifRewardAmount(v)} className={`flex-1 h-10 rounded-lg font-medium text-sm transition-all border ${sinifRewardAmount === v ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-neutral-700 border-slate-200 dark:border-neutral-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                                             {v}
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            )}

                            {gameMode === 'grup-yarismasi' && (
                               <div className="space-y-4 text-center">
                                  <div className="p-6 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-6 block">Gruptaki Kişi Sayısı</label>
                                     <div className="flex items-center justify-center gap-8">
                                        <button onClick={() => setGrupSize(prev => Math.max(3, prev - 1))} className="w-12 h-12 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-2xl text-slate-600 dark:text-slate-300 transition-colors shadow-sm active:scale-95">-</button>
                                        <div className="relative">
                                           <span className="text-5xl font-light text-indigo-600 dark:text-indigo-400">{grupSize}</span>
                                           <Users className="absolute -top-2 -right-4 text-indigo-400 w-5 h-5 opacity-60" />
                                        </div>
                                        <button onClick={() => setGrupSize(prev => Math.min(10, prev + 1))} className="w-12 h-12 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-2xl text-slate-600 dark:text-slate-300 transition-colors shadow-sm active:scale-95">+</button>
                                     </div>
                                  </div>
                                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50 text-left">
                                     <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed">Katılımcılar sistem tarafından rastgele gruplandırılır ve adil bir yarışma sağlanır.</p>
                                  </div>
                               </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Öğrenci Listesi */}
                <div className="dashboard-card p-6 xl:col-span-3 flex flex-col h-[450px] border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">Katılımcılar</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStudents.length} / {students.length} Seçili</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setSelectedStudents(students.map(s => s.id))} className="px-3 py-1.5 bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-neutral-700 rounded-lg text-[10px] font-semibold uppercase tracking-wide hover:bg-slate-100 transition-colors">Tümü</button>
                       <button onClick={() => setSelectedStudents([])} className="px-3 py-1.5 bg-slate-50 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-neutral-700 rounded-lg text-[10px] font-semibold uppercase tracking-wide hover:bg-slate-100 transition-colors">Temizle</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                     <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {students.map(student => {
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              onClick={() => setSelectedStudents(prev => isSelected ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-800 shadow-sm' : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 hover:border-slate-300'}`}
                            >
                               <div className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[10px] font-medium ${isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-neutral-700 text-slate-500 dark:text-slate-400'}`}>
                                  {student.name.charAt(0)}
                               </div>
                               <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-sky-900 dark:text-sky-100' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {student.name}
                               </span>
                            </button>
                          );
                        })}
                     </div>
                  </div>
                </div>
              </div>

              <JokerConfigPanel settings={jokerSettings} onChange={setJokerSettings} />
              
              {/* Başlat Butonu */}
              <div className="flex justify-center mt-8">
                 <motion.button
                    whileHover={selectedUnit && gameMode && selectedStudents.length > 0 ? { scale: 1.05 } : {}}
                    whileTap={selectedUnit && gameMode && selectedStudents.length > 0 ? { scale: 0.95 } : {}}
                    disabled={!selectedUnit || !gameMode || selectedStudents.length === 0}
                    onClick={startActivity}
                    className={`group relative flex items-center gap-4 px-12 py-5 rounded-[2rem] font-bold text-lg transition-all shadow-xl ${
                      selectedUnit && gameMode && selectedStudents.length > 0
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span>Oturumu Başlat</span>
                    <ChevronRight size={24} className={selectedUnit && gameMode && selectedStudents.length > 0 ? 'group-hover:translate-x-2 transition-transform' : ''} />
                  </motion.button>
              </div>
            </motion.div>
          )}

          {stage === 'playing' && gameMode === 'bilen-kazanir' && (
            <motion.div
              key="bilen-kazanir-game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <BilenKazanirGame
                onBack={() => setStage('setup')}
                onFinish={() => setStage('setup')}
                students={students}
                selectedStudents={selectedStudents}
                subject="Fen Bilimleri"
                unitId={selectedUnit!}
                questions={getSubQuestions()}
                teacherUid={user?.uid || ''}
                settings={{
                    ...jokerSettings,
                    rewardAmount,
                  rewardCategory
                
                  }}
              />
            </motion.div>
          )}

          {stage === 'playing' && gameMode === 'ikili-mucadele' && (
            <motion.div
              key="ikili-mucadele-game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
               <IkiliMucadeleGame
                onBack={() => setStage('setup')}
                onFinish={() => setStage('setup')}
                students={students}
                selectedStudents={selectedStudents}
                subject="Fen Bilimleri"
                unitId={selectedUnit!}
                questions={getSubQuestions()}
                teacherUid={user?.uid || ''}
                settings={{
                    ...jokerSettings,
                    type: ikiliType,
                  timeLimit: ikiliTime,
                  targetScore: ikiliTarget,
                  rewardAmount: ikiliRewardAmount,
                  rewardCategory
                
                  }}
              />
            </motion.div>
          )}

          {stage === 'playing' && gameMode === 'sinif-mucadelesi' && (
            <motion.div
              key="sinif-mucadelesi-game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col"
            >
               <SinifMucadelesiGame
                  students={students}
                  selectedStudents={selectedStudents}
                  questions={getSubQuestions()}
                  subject={UNITS.find(u => u.id === selectedUnit)?.title || 'Fen Bilimleri'}
                  teacherUid={user.uid}
                  settings={{
                    ...jokerSettings,
                    type: sinifType,
                    timeLimit: sinifType === 'sureli' ? sinifTime : undefined,
                    targetScore: sinifType === 'sorulu' ? sinifTarget : undefined,
                    rewardCategory,
                    rewardAmount: sinifRewardAmount
                  
                  }}
                  onFinish={() => setStage('setup')}
                  onBack={() => setStage('setup')}
               />
            </motion.div>
          )}

          {stage === 'playing' && gameMode === 'grup-yarismasi' && (
            <motion.div
              key="grup-yarismasi-game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
               <GrupYarismasiGame
                onBack={() => setStage('setup')}
                onFinish={() => setStage('setup')}
                students={students}
                selectedStudents={selectedStudents}
                subject="Fen Bilimleri"
                unitId={selectedUnit!}
                questions={getSubQuestions()}
                teacherUid={user?.uid || ''}
                settings={{
                    ...jokerSettings,
                    groupSize: grupSize,
                  rewardAmount,
                  rewardCategory
                
                  }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {manageQuestionsModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-900 rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar relative"
            >
              <button 
                onClick={() => setManageQuestionsModal(prev => ({...prev, isOpen: false, view: 'list'}))}
                className="absolute top-6 right-6 text-neutral-400 hover:text-black dark:hover:text-white"
              >
                Kapat
              </button>

              {manageQuestionsModal.view === 'list' && (
                 <>
                   <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black dark:text-white">Soruları Yönet</h2>
                      <button 
                         onClick={() => {
                           setNewQuestionForm({
                             unitId: manageQuestionsModal.unitId,
                             question: '',
                             optA: '',
                             optB: '',
                             optC: '',
                             answer: 'A'
                           });
                           setManageQuestionsModal(prev => ({...prev, view: 'add', editingId: null}));
                         }}
                         className="px-4 py-2 bg-teal-500 text-white rounded-xl font-bold uppercase text-sm hover:bg-teal-600"
                      >
                         + Yeni Soru Ekle
                      </button>
                   </div>
                   
                   <div className="mb-6">
                      <select 
                         value={manageQuestionsModal.unitId}
                         onChange={e => setManageQuestionsModal(prev => ({ ...prev, unitId: e.target.value }))}
                         className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white font-bold outline-none"
                      >
                         {UNITS.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                      </select>
                   </div>

                   <div className="space-y-3">
                      {(() => {
                         let qList = UNIT_QUESTIONS[manageQuestionsModal.unitId] || [];
                         qList = qList.filter(q => !deletedDefaultQuestions.includes(q.id));
                         const cList = customQuestions[manageQuestionsModal.unitId] || [];
                         const allQ = [...qList, ...cList];

                         if (allQ.length === 0) {
                           return <div className="text-center text-neutral-500 py-8 font-medium">Bu ünitede soru bulunmuyor.</div>;
                         }

                         return allQ.map(q => (
                           <div key={q.id} className="p-4 border-2 border-neutral-100 dark:border-neutral-800 rounded-2xl">
                              <div className="font-bold dark:text-white mb-2">{q.text}</div>
                              <div className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-3">Cevap: {q.answer}</div>
                              <div className="flex gap-2">
                                 <button 
                                   onClick={() => {
                                     const ansIdx = q.options.indexOf(q.answer);
                                     const ansLetter = ansIdx === 0 ? 'A' : ansIdx === 1 ? 'B' : 'C';
                                     setNewQuestionForm({
                                       unitId: manageQuestionsModal.unitId,
                                       question: q.text,
                                       optA: q.options[0] || '',
                                       optB: q.options[1] || '',
                                       optC: q.options[2] || '',
                                       answer: ansLetter
                                     });
                                     setManageQuestionsModal(prev => ({...prev, view: 'edit', editingId: q.id}));
                                   }}
                                   className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-bold uppercase transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700 dark:text-white"
                                 >
                                   Düzenle
                                 </button>
                                 <button 
                                    onClick={() => handleDeleteQuestion(q)}
                                    className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg text-sm font-bold uppercase transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/40"
                                 >
                                   Sil
                                 </button>
                              </div>
                           </div>
                         ));
                      })()}
                   </div>
                 </>
              )}

              {(manageQuestionsModal.view === 'add' || manageQuestionsModal.view === 'edit') && (
                 <>
                   <div className="flex items-center gap-4 mb-6">
                     <button 
                       onClick={() => setManageQuestionsModal(prev => ({...prev, view: 'list'}))}
                       className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-white transition-colors"
                     >
                       <ArrowLeft size={20} />
                     </button>
                     <h2 className="text-2xl font-black dark:text-white">
                       {manageQuestionsModal.view === 'add' ? 'Yeni Soru Ekle' : 'Soruyu Düzenle'}
                     </h2>
                   </div>
                   
                   <form onSubmit={handleSaveEdit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-neutral-500 mb-2">Ünite</label>
                        <select 
                          value={newQuestionForm.unitId}
                          onChange={e => setNewQuestionForm(prev => ({...prev, unitId: e.target.value}))}
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-teal-500 transition-colors"
                        >
                          {UNITS.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-500 mb-2">Soru</label>
                        <textarea 
                          required
                          rows={3}
                          value={newQuestionForm.question}
                          onChange={e => setNewQuestionForm(prev => ({...prev, question: e.target.value}))}
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-teal-500 transition-colors resize-none"
                          placeholder="Soru metnini girin..."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">A Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optA}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optA: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">B Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optB}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optB: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">C Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optC}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optC: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-teal-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-500 mb-2">Doğru Cevap</label>
                        <div className="flex gap-4">
                          {['A', 'B', 'C'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer flex-1 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-xl border-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors">
                              <input 
                                type="radio" 
                                name="correctAnswer" 
                                value={opt} 
                                checked={newQuestionForm.answer === opt}
                                onChange={e => setNewQuestionForm(prev => ({...prev, answer: e.target.value}))}
                                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="font-bold dark:text-white">{opt} Şıkkı</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="pt-6">
                        <button 
                          type="submit"
                          disabled={isAddingQuestion}
                          className="w-full py-4 bg-teal-500 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-teal-600 transition-colors"
                        >
                          {isAddingQuestion ? 'Kaydediliyor...' : 'Soruyu Kaydet'}
                        </button>
                      </div>
                   </form>
                 </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PersistentLeaderboardModal 
        isOpen={!!leaderboardModalUnit}
        onClose={() => setLeaderboardModalUnit(null)}
        user={user}
        unit={leaderboardModalUnit}
      />
    </div>
  );
};
