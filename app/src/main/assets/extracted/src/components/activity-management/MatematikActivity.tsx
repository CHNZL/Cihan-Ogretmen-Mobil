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
  Calculator,
  Divide,
  Percent,
  Shapes,
  Ruler,
  BadgeCent,
  Target,
  Gamepad2,
  PieChart,
  Hash,
  Binary,
  Variable,
  Sigma,
  Swords,
  Settings
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
import { GrupYarismasiGame } from './games/GrupYarismasiGame';
import { SinifMucadelesiGame } from './games/SinifMucadelesiGame';

interface Question {
  id: string;
  text: string;
  options: string[];
  answer: string;
  hint?: string;
}

const UNIT_QUESTIONS: Record<string, Question[]> = {
  'dogal-sayilar': [
    { id: 'ds1', text: '345 sayısının onlar basamağındaki rakam kaçtır?', options: ['3', '4', '5', 'Hiçbiri'], answer: '4' },
    { id: 'ds2', text: '"Sekiz yüz beş" sayısının rakamla yazılışı hangisidir?', options: ['850', '805', '85', 'Hiçbiri'], answer: '805' },
    { id: 'ds3', text: '4 onluk ve 7 birlikten oluşan sayı kaçtır?', options: ['47', '74', '40', 'Hiçbiri'], answer: '47' },
    { id: 'ds4', text: '78 sayısının en yakın onluğa yuvarlanmış hali kaçtır?', options: ['70', '80', '90', 'Hiçbiri'], answer: '80' },
    { id: 'ds5', text: 'Üç basamaklı en küçük doğal sayı kaçtır?', options: ['100', '101', '111', 'Hiçbiri'], answer: '100' },
    { id: 'ds6', text: '900 + 50 + 6 şeklinde çözümlenen sayı hangisidir?', options: ['906', '956', '965', 'Hiçbiri'], answer: '956' },
    { id: 'ds7', text: '423 sayısında 2 rakamının basamak değeri kaçtır?', options: ['2', '20', '200', 'Hiçbiri'], answer: '20' },
    { id: 'ds8', text: '7, 0, 4 rakamlarını birer kez kullanarak yazılabilecek en büyük sayı kaçtır?', options: ['704', '740', '470', 'Hiçbiri'], answer: '740' },
    { id: 'ds9', text: 'Hangi sayı tektir?', options: ['24', '37', '48', 'Hiçbiri'], answer: '37' },
    { id: 'ds10', text: '500\'den başlayıp yüzer ritmik sayarken 4. sayışımızda hangi sayıyı söyleriz?', options: ['700', '800', '900', 'Hiçbiri'], answer: '800' },
    { id: 'ds11', text: 'Basamak değerleri 400, 30 ve 7 olan sayı kaçtır?', options: ['437', '734', '347', 'Hiçbiri'], answer: '437' },
    { id: 'ds12', text: '256 sayısından küçük olan en büyük sayı kaçtır?', options: ['255', '257', '250', 'Hiçbiri'], answer: '255' },
    { id: 'ds13', text: '689 sayısının yüzler basamağındaki rakamın basamak değeri kaçtır?', options: ['6', '60', '600', 'Hiçbiri'], answer: '600' },
    { id: 'ds14', text: 'Rakamları birbirinden farklı en küçük üç basamaklı sayı kaçtır?', options: ['100', '102', '123', 'Hiçbiri'], answer: '102' },
    { id: 'ds15', text: '48 sayısından bir önce gelen çift sayı kaçtır?', options: ['46', '47', '49', 'Hiçbiri'], answer: '46' },
    { id: 'ds16', text: '7 onluk, 0 birlik ve 3 yüzlükten oluşan sayı kaçtır?', options: ['703', '370', '307', 'Hiçbiri'], answer: '370' },
    { id: 'ds17', text: '"Beş yüz elli beş" sayısında kaç tane 5 rakamı vardır?', options: ['1', '2', '3', 'Hiçbiri'], answer: '3' },
    { id: 'ds18', text: '86 sayısını en yakın onluğa yuvarlarsak sonuç ne olur?', options: ['80', '90', '100', 'Hiçbiri'], answer: '90' },
    { id: 'ds19', text: 'Hangi sayı 400 ile 500 arasındadır?', options: ['399', '450', '501', 'Hiçbiri'], answer: '450' },
    { id: 'ds20', text: '102 sayısının birler basamağındaki rakam kaçtır?', options: ['1', '0', '2', 'Hiçbiri'], answer: '2' }
  ],
  'toplama-cikarma': [
    { id: 'tc1', text: '25 + 18 işleminin sonucu kaçtır?', options: ['43', '33', '53', 'Hiçbiri'], answer: '43' },
    { id: 'tc2', text: '50 - 24 işleminin sonucu kaçtır?', options: ['26', '36', '16', 'Hiçbiri'], answer: '26' },
    { id: 'tc3', text: 'Hangi toplama işleminin sonucu 100 eder?', options: ['45+55', '30+60', '75+15', 'Hiçbiri'], answer: '45+55' },
    { id: 'tc4', text: '120 + 300 işleminin sonucu kaçtır?', options: ['420', '320', '520', 'Hiçbiri'], answer: '420' },
    { id: 'tc5', text: 'Eksilen 85, çıkan 27 ise fark kaçtır?', options: ['58', '62', '68', 'Hiçbiri'], answer: '58' },
    { id: 'tc6', text: 'Bir toplama işleminde toplananlardan biri 45, toplam 80 ise diğer toplanan kaçtır?', options: ['35', '45', '55', 'Hiçbiri'], answer: '35' },
    { id: 'tc7', text: '90 - 45 - 10 işleminin sonucu kaçtır?', options: ['35', '45', '55', 'Hiçbiri'], answer: '35' },
    { id: 'tc8', text: '342 + 100 işlemini zihinden yaparsak sonuç ne olur?', options: ['342', '442', '542', 'Hiçbiri'], answer: '442' },
    { id: 'tc9', text: 'Hangi çıkarma işleminin sonucu daha küçüktür?', options: ['50-10', '40-5', '60-30', 'Hiçbiri'], answer: '60-30' },
    { id: 'tc10', text: 'Bakkaldan 15 TL\'lik süt ve 28 TL\'lik peynir aldım. Kaç TL öderim?', options: ['33', '43', '53', 'Hiçbiri'], answer: '43' },
    { id: 'tc11', text: '75 sayısından kaç çıkarırsak 50 kalır?', options: ['15', '25', '35', 'Hiçbiri'], answer: '25' },
    { id: 'tc12', text: '400 + 200 + 50 toplamı kaçtır?', options: ['650', '605', '560', 'Hiçbiri'], answer: '650' },
    { id: 'tc13', text: '99 - 19 işleminin sonucu kaçtır?', options: ['70', '80', '90', 'Hiçbiri'], answer: '80' },
    { id: 'tc14', text: 'En büyük iki basamaklı sayıdan en küçük iki basamaklı sayıyı çıkarırsak kaç kalır?', options: ['89', '90', '99', 'Hiçbiri'], answer: '89' },
    { id: 'tc15', text: '150 sayısına kaç eklersek 200 olur?', options: ['40', '50', '60', 'Hiçbiri'], answer: '50' },
    { id: 'tc16', text: '68 + 12 işleminin sonucu kaçtır?', options: ['70', '80', '90', 'Hiçbiri'], answer: '80' },
    { id: 'tc17', text: 'Çıkanın 15, farkın 20 olduğu bir işlemde eksilen kaçtır?', options: ['5', '35', '45', 'Hiçbiri'], answer: '35' },
    { id: 'tc18', text: '250 - 100 - 50 işleminin sonucu kaçtır?', options: ['100', '150', '50', 'Hiçbiri'], answer: '100' },
    { id: 'tc19', text: 'Hangi sayıya 10 eklersek 100 olur?', options: ['80', '90', '110', 'Hiçbiri'], answer: '90' },
    { id: 'tc20', text: '48 + 23 işleminin tahmini sonucu (onluğa yuvarlayarak) kaçtır?', options: ['70', '80', '60', 'Hiçbiri'], answer: '70' }
  ],
  'carpma-bolme': [
    { id: 'cb1', text: '6 x 7 işleminin sonucu kaçtır?', options: ['42', '48', '36', 'Hiçbiri'], answer: '42' },
    { id: 'cb2', text: '20 fındığı 4 arkadaşa eşit paylaştırırsak her birine kaç fındık düşer?', options: ['4', '5', '6', 'Hiçbiri'], answer: '5' },
    { id: 'cb3', text: '9 x 5 işleminin sonucu kaçtır?', options: ['40', '45', '50', 'Hiçbiri'], answer: '45' },
    { id: 'cb4', text: '8 x 4 işleminin sonucu kaçtır?', options: ['24', '32', '36', 'Hiçbiri'], answer: '32' },
    { id: 'cb5', text: '15 / 3 işleminin sonucu kaçtır?', options: ['3', '5', '10', 'Hiçbiri'], answer: '5' },
    { id: 'cb6', text: '7 x 0 işleminin sonucu kaçtır?', options: ['0', '7', '70', 'Hiçbiri'], answer: '0' },
    { id: 'cb7', text: '10 x 5 işleminin sonucu kaçtır?', options: ['50', '100', '15', 'Hiçbiri'], answer: '50' },
    { id: 'cb8', text: '18 / 2 işleminin sonucu kaçtır?', options: ['8', '9', '10', 'Hiçbiri'], answer: '9' },
    { id: 'cb9', text: '4 tane 5 kaç eder?', options: ['15', '20', '25', 'Hiçbiri'], answer: '20' },
    { id: 'cb10', text: 'Her birinde 3 elma olan 6 tabakta toplam kaç elma vardır?', options: ['12', '18', '21', 'Hiçbiri'], answer: '18' },
    { id: 'cb11', text: '24 / 4 işleminin sonucu kaçtır?', options: ['4', '6', '8', 'Hiçbiri'], answer: '6' },
    { id: 'cb12', text: 'Bir sayıyı 1 ile çarparsak sonuç ne olur?', options: ['0', '1', 'Sayının kendisi', 'Hiçbiri'], answer: 'Sayının kendisi' },
    { id: 'cb13', text: '9 x 3 işleminin sonucu kaçtır?', options: ['12', '27', '36', 'Hiçbiri'], answer: '27' },
    { id: 'cb14', text: '30 / 5 işleminin sonucu kaçtır?', options: ['5', '6', '7', 'Hiçbiri'], answer: '6' },
    { id: 'cb15', text: '8 x 8 kaça eşittir?', options: ['56', '64', '72', 'Hiçbiri'], answer: '64' },
    { id: 'cb16', text: '0 / 5 işleminin sonucu kaçtır?', options: ['0', '5', 'Tanımsız', 'Hiçbiri'], answer: '0' },
    { id: 'cb17', text: '2 x 2 x 2 işleminin sonucu kaçtır?', options: ['4', '6', '8', 'Hiçbiri'], answer: '8' },
    { id: 'cb18', text: 'Hangi sayının 10 katı 80 eder?', options: ['8', '18', '800', 'Hiçbiri'], answer: '8' },
    { id: 'cb19', text: '5 x 9 işleminin sonucu kaçtır?', options: ['40', '45', '50', 'Hiçbiri'], answer: '45' },
    { id: 'cb20', text: '12 fındığı 2 gruba ayırırsak her grupta kaç fındık olur?', options: ['4', '6', '10', 'Hiçbiri'], answer: '6' }
  ],
  'geometri': [
    { id: 'geo1', text: 'Hangisinin 4 köşesi ve 4 birbirine eşit kenarı vardır?', options: ['Dikdörtgen', 'Kare', 'Üçgen', 'Hiçbiri'], answer: 'Kare' },
    { id: 'geo2', text: 'Silindir şekline benzeyen nesne hangisidir?', options: ['Top', 'Kutu', 'Pil', 'Hiçbiri'], answer: 'Pil' },
    { id: 'geo3', text: 'Kenarı ve köşesi olmayan şekil hangisidir?', options: ['Kare', 'Üçgen', 'Çember', 'Hiçbiri'], answer: 'Çember' },
    { id: 'geo4', text: 'Üçgenin kaç köşesi vardır?', options: ['2', '3', '4', 'Hiçbiri'], answer: '3' },
    { id: 'geo5', text: 'Dikdörtgenin kaç kenarı vardır?', options: ['3', '4', '5', 'Hiçbiri'], answer: '4' },
    { id: 'geo6', text: 'Küpün tüm yüzeyleri hangi şekildedir?', options: ['Kare', 'Üçgen', 'Daire', 'Hiçbiri'], answer: 'Kare' },
    { id: 'geo7', text: 'Kürenin kaç köşesi vardır?', options: ['0', '1', 'Sonsuz', 'Hiçbiri'], answer: '0' },
    { id: 'geo8', text: 'Dikdörtgenler prizmasının kaç yüzü vardır?', options: ['4', '6', '8', 'Hiçbiri'], answer: '6' },
    { id: 'geo9', text: 'Hangisi bir geometrik cisimdir?', options: ['Kare', 'Küp', 'Üçgen', 'Hiçbiri'], answer: 'Küp' },
    { id: 'geo10', text: 'Top hangi geometrik cisme benzer?', options: ['Silindir', 'Küre', 'Koni', 'Hiçbiri'], answer: 'Küre' },
    { id: 'geo11', text: 'Dondurma külahı hangi cisme benzer?', options: ['Koni', 'Silindir', 'Küp', 'Hiçbiri'], answer: 'Koni' },
    { id: 'geo12', text: 'Kibrit kutusu hangi cisme örnektir?', options: ['Küp', 'Dikdörtgen Prizma', 'Küre', 'Hiçbiri'], answer: 'Dikdörtgen Prizma' },
    { id: 'geo13', text: 'Kare ile dikdörtgenin ortak özelliği hangisidir?', options: ['Tüm kenarları eşittir', '4 köşeleri vardır', '3 kenarları vardır', 'Hiçbiri'], answer: '4 köşeleri vardır' },
    { id: 'geo14', text: 'Dar açılı üçgenin tüm açıları kaç dereceden küçüktür?', options: ['45', '90', '180', 'Hiçbiri'], answer: '90' },
    { id: 'geo15', text: 'Yarım daire neye benzer?', options: ['Karpuz dilimi', 'Top', 'Kutu', 'Hiçbiri'], answer: 'Karpuz dilimi' },
    { id: 'geo16', text: 'Silindirin kaç tane düz yüzü vardır?', options: ['1', '2', '3', 'Hiçbiri'], answer: '2' },
    { id: 'geo17', text: 'Bir üçgenin iç açıları toplamı kaç derecedir?', options: ['90', '180', '360', 'Hiçbiri'], answer: '180' },
    { id: 'geo18', text: 'Küpü açtığımızda kaç tane kare elde ederiz?', options: ['4', '6', '8', 'Hiçbiri'], answer: '6' },
    { id: 'geo19', text: 'Hangi şeklin köşegeni yoktur?', options: ['Kare', 'Dikdörtgen', 'Üçgen', 'Hiçbiri'], answer: 'Üçgen' },
    { id: 'geo20', text: 'Karenin bir iç açısı kaç derecedir?', options: ['45', '90', '180', 'Hiçbiri'], answer: '90' }
  ],
  'olcme': [
    { id: 'ol1', text: '1 metre kaç santimetredir?', options: ['10', '100', '1000', 'Hiçbiri'], answer: '100' },
    { id: 'ol2', text: 'Saat 14:00 ise saat öğleden sonra kaçtır?', options: ['2', '4', '1', 'Hiçbiri'], answer: '2' },
    { id: 'ol3', text: 'En küçük kağıt paramız hangisidir?', options: ['5 TL', '10 TL', '20 TL', 'Hiçbiri'], answer: '5 TL' },
    { id: 'ol4', text: 'Yarım saat kaç dakikadır?', options: ['15', '30', '45', 'Hiçbiri'], answer: '30' },
    { id: 'ol5', text: '1 kilogram kaç gramdır?', options: ['100', '500', '1000', 'Hiçbiri'], answer: '1000' },
    { id: 'ol6', text: '1 lira kaç tane 25 kuruştan oluşur?', options: ['2', '4', '5', 'Hiçbiri'], answer: '4' },
    { id: 'ol7', text: 'Hangi ay 30 gündür?', options: ['Ocak', 'Nisan', 'Aralık', 'Hiçbiri'], answer: 'Nisan' },
    { id: 'ol8', text: 'Bir yılda kaç hafta vardır?', options: ['12', '52', '365', 'Hiçbiri'], answer: '52' },
    { id: 'ol9', text: 'Sıvıları ölçmek için hangi birimi kullanırız?', options: ['Metre', 'Litre', 'Kilogram', 'Hiçbiri'], answer: 'Litre' },
    { id: 'ol10', text: '2 metre + 50 santimetre kaç cm eder?', options: ['70', '250', '205', 'Hiçbiri'], answer: '250' },
    { id: 'ol11', text: 'Bir günde kaç saat vardır?', options: ['12', '24', '48', 'Hiçbiri'], answer: '24' },
    { id: 'ol12', text: 'Saat 09:15 ise yelkovan hangi rakam üzerindedir?', options: ['3', '6', '9', 'Hiçbiri'], answer: '3' },
    { id: 'ol13', text: '500 gram kaç yarım kilogram eder?', options: ['1', '2', '4', 'Hiçbiri'], answer: '1' },
    { id: 'ol14', text: '4 tane yarım litre kaç litre eder?', options: ['1', '2', '4', 'Hiçbiri'], answer: '2' },
    { id: 'ol15', text: 'En büyük kağıt paramız hangisidir?', options: ['50 TL', '100 TL', '200 TL', 'Hiçbiri'], answer: '200 TL' },
    { id: 'ol16', text: 'Eylül ayından sonra hangi ay gelir?', options: ['Ağustos', 'Kasım', 'Ekim', 'Hiçbiri'], answer: 'Ekim' },
    { id: 'ol17', text: 'Boyumuzu ölçmek için ne kullanırız?', options: ['Terazi', 'Metre', 'Litre kabı', 'Hiçbiri'], answer: 'Metre' },
    { id: 'ol18', text: 'Haftanın son günü hangisidir?', options: ['Cuma', 'Cumartesi', 'Pazar', 'Hiçbiri'], answer: 'Pazar' },
    { id: 'ol19', text: '2 tane 50 TL kaç TL eder?', options: ['50', '100', '150', 'Hiçbiri'], answer: '100' },
    { id: 'ol20', text: 'Gömleğin boyunu ölçmek için hangi birim uygundur?', options: ['Kilometre', 'Santimetre', 'Gram', 'Hiçbiri'], answer: 'Santimetre' }
  ],
  'veri': [
    { id: 've1', text: 'Verileri sunmak için kullandığımız çizimlere ne denir?', options: ['Hikaye', 'Grafik', 'Resim', 'Hiçbiri'], answer: 'Grafik' },
    { id: 've2', text: 'Bir sınıftaki öğrencilerin en sevdiği meyvelerin listesi ne tür bir veridir?', options: ['Nesne Grafiği', 'Çetele Tablosu', 'Hepsi', 'Hiçbiri'], answer: 'Hepsi' },
    { id: 've3', text: 'Çetele tablosunda 5 sayısı nasıl gösterilir?', options: ['4 dik 1 yan çizgi', '5 dik çizgi', 'Bir kare', 'Hiçbiri'], answer: '4 dik 1 yan çizgi' },
    { id: 've4', text: 'Sıklık tablosunda veriler ne ile gösterilir?', options: ['Çizgiler', 'Sayılar', 'Resimler', 'Hiçbiri'], answer: 'Sayılar' },
    { id: 've5', text: 'Bir grafikte her sembol 2 kişiyi gösteriyorsa, 4 sembol kaç kişiyi gösterir?', options: ['4', '6', '8', 'Hiçbiri'], answer: '8' },
    { id: 've6', text: 'En çok sevilen dersi bulmak için hangi tabloya bakmak en kolaydır?', options: ['Sıklık Tablosu', 'İsim Listesi', 'Boş kağıt', 'Hiçbiri'], answer: 'Sıklık Tablosu' },
    { id: 've7', text: 'Veri toplama araçlarından biri hangisidir?', options: ['Anket', 'Oyun', 'Uyku', 'Hiçbiri'], answer: 'Anket' },
    { id: 've8', text: 'Nesne grafiğinde veriler ne ile temsil edilir?', options: ['Rakamlarla', 'Nesnelerin kendisi veya resmiyle', 'Çizgilerle', 'Hiçbiri'], answer: 'Nesnelerin kendisi veya resmiyle' },
    { id: 've9', text: 'Bir sınıfta 12 erkek, 10 kız varsa toplam öğrenci sayısı verisi kaçtır?', options: ['10', '12', '22', 'Hiçbiri'], answer: '22' },
    { id: 've10', text: 'Tabloya başlık yazmak neden önemlidir?', options: ['Güzel görünsün diye', 'Tablonun neyi anlattığını anlamak için', 'Zorunlu olduğu için', 'Hiçbiri'], answer: 'Tablonun neyi anlattığını anlamak için' },
    { id: 've11', text: 'Hangi grafik türü daha çok yer kaplar?', options: ['Sütun Grafiği', 'Çetele Tablosu', 'Sıklık Tablosu', 'Hiçbiri'], answer: 'Sütun Grafiği' },
    { id: 've12', text: 'Bir araştırma sorusu hangisi olabilir?', options: ['En sevdiğiniz renk nedir?', 'Bugün hava güzel.', 'Ders çalışmalıyız.', 'Hiçbiri'], answer: 'En sevdiğiniz renk nedir?' },
    { id: 've13', text: 'Grafikteki "Ölçek" neyi ifade eder?', options: ['Grafiğin rengini', 'Her birimin kaç adet olduğunu', 'Grafiğin adını', 'Hiçbiri'], answer: 'Her birimin kaç adet olduğunu' },
    { id: 've14', text: '4 arkadaşın boylarını karşılaştırmak için hangisi uygundur?', options: ['Sütun Grafiği', 'Toplama işlemi', 'Tartı', 'Hiçbiri'], answer: 'Sütun Grafiği' },
    { id: 've15', text: 'Bir çetele tablosunda 7 sayısı kaç çizgi grubuyla gösterilir?', options: ['1 tam grup ve 2 çizgi', '2 tam grup', '7 tek çizgi', 'Hiçbiri'], answer: '1 tam grup ve 2 çizgi' },
    { id: 've16', text: 'Sıklık tablosunda "Elma" karşısında 15 yazıyorsa bu ne anlama gelir?', options: ['15 çeşit elma var', '15 kişi elma seviyor', 'Elma 15 TL', 'Hiçbiri'], answer: '15 kişi elma seviyor' },
    { id: 've17', text: 'Veri düzenlemenin amacı nedir?', options: ['Kağıdı doldurmak', 'Sonuçları daha iyi yorumlamak', 'Resim yapmak', 'Hiçbiri'], answer: 'Sonuçları daha iyi yorumlamak' },
    { id: 've18', text: 'Bir nesne grafiğinde 3 tavşan resmi varsa ve her resim 3 tavşanı temsil ediyorsa toplam kaç tavşan vardır?', options: ['3', '6', '9', 'Hiçbiri'], answer: '9' },
    { id: 've19', text: 'Dikey eksen grafikte genelde neyi gösterir?', options: ['Zamanı', 'Sayıları/Miktarları', 'İsimleri', 'Hiçbiri'], answer: 'Sayıları/Miktarları' },
    { id: 've20', text: 'Veri analizi sonucunda ne yapılır?', options: ['Karar verilir/Yorum yapılır', 'Veriler silinir', 'Grafik boyanır', 'Hiçbiri'], answer: 'Karar verilir/Yorum yapılır' }
  ]
};

const UNITS = [
  { id: 'dogal-sayilar', title: 'Doğal Sayılar', icon: Calculator, color: 'bg-blue-500' },
  { id: 'toplama-cikarma', title: 'Toplama & Çıkarma', icon: Divide, color: 'bg-red-500' },
  { id: 'carpma-bolme', title: 'Çarpma & Bölme', icon: Percent, color: 'bg-green-500' },
  { id: 'geometri', title: 'Geometrik Cisimler', icon: Shapes, color: 'bg-purple-500' },
  { id: 'olcme', title: 'Ölçme Birimleri', icon: Ruler, color: 'bg-orange-500' },
  { id: 'veri', title: 'Veri Analizi', icon: BadgeCent, color: 'bg-amber-500' },
];

const REWARD_CATEGORIES = [
  'Matematik Yıldızı',
  'Fen Bilimleri Yıldızı',
  'Hayat Bilgisi Yıldızı',
  'Türkçe Yıldızı',
  'Öğretmen Özel Ödülü Yıldızı'
];

export interface MatematikActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo?: () => void;
  units?: any[];
  questions?: any[];
  onManageQuestions?: () => void;
}

export const MatematikActivity: React.FC<MatematikActivityProps> = ({ onBack, students, user, onShowInfo, units, questions, onManageQuestions }) => {
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
  const [rewardCategory, setRewardCategory] = useState<string>('Matematik Yıldızı');

  const [customQuestions, setCustomQuestions] = useState<Record<string, Question[]>>({});
  const [deletedDefaultQuestions, setDeletedDefaultQuestions] = useState<string[]>([]);
  const [leaderboardModalUnit, setLeaderboardModalUnit] = useState<any | null>(null);
  const [manageQuestionsModal, setManageQuestionsModal] = useState<{
    isOpen: boolean;
    unitId: string;
    view: 'list' | 'add' | 'edit';
    editingId: string | null;
  }>({ isOpen: false, unitId: 'dogal-sayilar', view: 'list', editingId: null });

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const path = `users/${user.uid}/activitySettings/matematik`;
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
      const path = `users/${user.uid}/matematikQuestions`;
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
    unitId: 'dogal-sayilar',
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
         await updateDoc(doc(db, `users/${user.uid}/matematikQuestions/${manageQuestionsModal.editingId}`), { ...qd, updatedAt: Date.now() });
         setCustomQuestions(prev => {
           const uqs = prev[qd.unitId] || [];
           const updated = uqs.map(uq => uq.id === manageQuestionsModal.editingId ? { id: manageQuestionsModal.editingId!, text: qd.question, options: qd.options, answer: qd.answer } : uq);
           return { ...prev, [qd.unitId]: updated };
         });
      } else {
         const docRef = await addDoc(collection(db, `users/${user.uid}/matematikQuestions`), { ...qd, createdAt: Date.now() });
         setCustomQuestions(prev => {
           const uqs = prev[qd.unitId] || [];
           return {
             ...prev,
             [qd.unitId]: [...uqs, { id: docRef.id, text: qd.question, options: qd.options, answer: qd.answer }]
           };
         });
         if (manageQuestionsModal.editingId) {
           const newDeleted = [...deletedDefaultQuestions, manageQuestionsModal.editingId];
           setDeletedDefaultQuestions(newDeleted);
           await setDoc(doc(db, `users/${user.uid}/activitySettings/matematik`), { deletedQuestions: newDeleted }, { merge: true });
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
        await deleteDoc(doc(db, `users/${user.uid}/matematikQuestions/${q.id}`));
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
        await setDoc(doc(db, `users/${user.uid}/activitySettings/matematik`), { deletedQuestions: newDeleted }, { merge: true });
      }
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-blue-50/30 dark:bg-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-sky-400/20 dark:bg-sky-500/10 rounded-full blur-[80px]" />
        
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
             <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 px-6 py-4 rounded-[2rem] border-2 border-blue-100 dark:border-blue-900 shadow-xl shadow-blue-500/10">
                <div className="p-3 bg-blue-500 dark:bg-blue-600 text-white rounded-2xl shadow-md">
                   <Calculator size={28} strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                  Matematik <span className="text-blue-600 dark:text-blue-400 font-extrabold">Arenası</span>
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-3">
            {onShowInfo && (
              <button 
                onClick={onShowInfo} 
                className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 shadow-sm hover:scale-105 active:scale-95 transition-all text-neutral-500 hover:text-blue-500"
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
              {/* Ünite Seçimi */}
              <div className="dashboard-card p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 rounded-2xl">
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
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
                    <Settings name="settings" size={14} />
                    <span className="text-xs font-medium">Soruları Yönet</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(units && units.length > 0 ? units : UNITS).map((unit, idx) => {
                    const FALLBACK_ICONS = [Calculator, Divide, Percent, Shapes, Ruler, BadgeCent, PieChart, Hash, Binary, Target, Sigma, Variable];
                    const FALLBACK_COLORS = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500', 'bg-cyan-500'];
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
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/40 shadow-lg shadow-blue-500/10 scale-[1.02]' 
                        : 'border-slate-100 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-neutral-900 shadow-sm'
                      }`}
                    >
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
                          <div className={`w-2 h-2 rounded-full ${selectedUnit === unit.id ? 'bg-blue-500 animate-pulse' : 'bg-slate-300 dark:bg-neutral-700'}`} />
                          <span className={`text-[10px] uppercase font-black tracking-widest ${selectedUnit === unit.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
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
                          ? 'bg-white text-blue-600 shadow-sm hover:bg-blue-50'
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
                    <div className="flex flex-row md:flex-col gap-3 w-full md:w-48 xl:w-56 shrink-0 overflow-x-auto pb-2 md:pb-0">
                      {[
                        { id: 'bilen-kazanir', label: 'Bilen Kazanır', icon: Trophy },
                        { id: 'ikili-mucadele', label: 'İkili Mücadele', icon: Users },
                        { id: 'sinif-mucadelesi', label: 'Sınıf Mücadelesi', icon: Swords },
                        { id: 'grup-yarismasi', label: 'Grup Yarışması', icon: Zap }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setGameMode(mode.id as any)}
                          className={`flex-1 md:flex-none flex items-center gap-3 p-3.5 rounded-xl border transition-all relative overflow-hidden text-left min-w-[140px] md:min-w-0 ${
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
                                      <span className="text-xs font-medium">Hedef Skor</span>
                                    </button>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">
                                       {ikiliType === 'sureli' ? 'Oyun Süresi (Saniye)' : 'Hedef Skor'}
                                    </label>
                                    <div className="flex items-center gap-4">
                                       <button onClick={() => ikiliType === 'sureli' ? setIkiliTime(prev => Math.max(10, prev - 10)) : setIkiliTarget(prev => Math.max(1, prev - 1))} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">-</button>
                                       <span className="flex-1 text-center text-3xl font-light text-slate-900 dark:text-white">
                                          {ikiliType === 'sureli' ? ikiliTime : ikiliTarget}
                                       </span>
                                       <button onClick={() => ikiliType === 'sureli' ? setIkiliTime(prev => prev + 10) : setIkiliTarget(prev => prev + 1)} className="w-10 h-10 bg-white dark:bg-neutral-700 border border-slate-200 dark:border-neutral-600 hover:bg-slate-50 hover:dark:bg-neutral-600 rounded-lg flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 transition-colors">+</button>
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
                                      <span className="text-xs font-medium">Hedef Skor</span>
                                    </button>
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-200 dark:border-neutral-700">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 block">
                                       {sinifType === 'sureli' ? 'Oyun Süresi (Saniye)' : 'Hedef Skor'}
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
                                          <button key={v} onClick={() => setSinifRewardAmount(v)} className={`flex-1 h-10 rounded-lg font-medium text-sm transition-all border ${sinifRewardAmount === v ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' : 'bg-white dark:bg-neutral-800 border-slate-200 dark:border-neutral-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
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
                                           <Users size={20} className="absolute -top-2 -right-4 text-indigo-400 opacity-60" />
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

                  <JokerConfigPanel settings={jokerSettings} onChange={setJokerSettings} />
                   <div className="pt-6 shrink-0 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!selectedUnit || !gameMode || selectedStudents.length === 0 || (gameMode === 'ikili-mucadele' && selectedStudents.length < 2)}
                      onClick={startActivity}
                      className="group relative w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-3 relative z-10">
                        <span>BAŞLAT</span>
                        <Zap size={20} className="group-hover:animate-bounce" />
                      </div>
                    </motion.button>
                  </div>
                </div>
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
                subject="Matematik"
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
                  subject={UNITS.find(u => u.id === selectedUnit)?.title || 'Matematik'}
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
                subject="Matematik"
                unitId={selectedUnit!}
                questions={getSubQuestions()}
                teacherUid={user?.uid || ''}
                settings={{
                    ...jokerSettings,
                    type: ikiliType,
                  timeLimit: ikiliTime,
                  targetScore: ikiliTarget,
                  rewardAmount,
                  rewardCategory
                
                  }}
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
                subject="Matematik"
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
                         className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold uppercase text-sm hover:bg-blue-600"
                      >
                         + Yeni Soru Ekle
                      </button>
                   </div>
                   
                   <div className="mb-6">
                      <select 
                         value={manageQuestionsModal.unitId}
                         onChange={e => setManageQuestionsModal(prev => ({ ...prev, unitId: e.target.value }))}
                         className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white font-bold outline-none ring-blue-500 focus:ring-2"
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
                              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">Cevap: {q.answer}</div>
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
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-blue-500 transition-colors"
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
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-blue-500 transition-colors resize-none"
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
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">B Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optB}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optB: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">C Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optC}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optC: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-blue-500 transition-colors"
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
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
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
                          className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors"
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
