import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Star, 
  Zap, 
  Clock, 
  Sun,
  CheckCircle2, 
  XCircle, 
  Info,
  ChevronRight,
  School,
  Home,
  HeartPulse,
  ShieldCheck,
  Flag,
  Leaf,
  Target,
  Sparkles,
  Gamepad2,
  Swords,
  Settings
} from 'lucide-react';
import { Student } from '../../App';
import { JokerConfigPanel, JokerSettings, defaultJokerSettings } from './games/JokerConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  arrayUnion,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
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
  'okulumuzda-hayat': [
    { id: 'o1', text: 'Okulda bir arkadaşımızdan ödünç kalem isterken hangi ifadeyi kullanmalıyız?', options: ['Ver çabuk silgini', 'Kalemini alabilir miyim?', 'Bunu bana ver', 'Hiçbiri'], answer: 'Kalemini alabilir miyim?' },
    { id: 'o2', text: 'Okul koridorlarında nasıl hareket etmeliyiz?', options: ['Koşarak', 'Bağırarak', 'Sakin ve sağdan yürüyerek', 'Hiçbiri'], answer: 'Sakin ve sağdan yürüyerek' },
    { id: 'o3', text: 'Öğretmenimiz ders anlatırken ne yapmalıyız?', options: ['Arkadaşımızla konuşmalıyız', 'Sessizce dinlemeliyiz', 'Resim yapmalıyız', 'Hiçbiri'], answer: 'Sessizce dinlemeliyiz' },
    { id: 'o4', text: 'Okul eşyalarımızı korumak neden önemlidir?', options: ['Okula zarar vermemek için', 'Paramız boşa gitmesin diye', 'Hepsi', 'Hiçbiri'], answer: 'Hepsi' },
    { id: 'o5', text: 'Okulda bir sorun yaşadığımızda ilk kime söylemeliyiz?', options: ['Okul bekçisine', 'Öğretmenimize', 'Kimseye', 'Hiçbiri'], answer: 'Öğretmenimize' },
    { id: 'o6', text: 'Teneffüs saatlerinde ne yapmalıyız?', options: ['Ders çalışmalıyız', 'Dinlenmeli ve oyun oynamalıyız', 'Sınıfta bağırmalıyız', 'Hiçbiri'], answer: 'Dinlenmeli ve oyun oynamalıyız' },
    { id: 'o7', text: 'Sınıf kurallarını kimlerle birlikte belirleriz?', options: ['Sadece öğretmenle', 'Öğretmen ve arkadaşlarımızla', 'Okul müdürüyle', 'Hiçbiri'], answer: 'Öğretmen ve arkadaşlarımızla' },
    { id: 'o8', text: 'Okula gelirken hangisini yapmamız gerekir?', options: ['Okul kıyafetlerimizi giymek', 'Geç kalmak', 'Çantamızı evde unutmak', 'Hiçbiri'], answer: 'Okul kıyafetlerimizi giymek' },
    { id: 'o9', text: 'Bayrak töreninde nasıl durmalıyız?', options: ['Arkadaşımızla fısıldaşarak', 'Hazırolda ve sessizce', 'Oturarak', 'Hiçbiri'], answer: 'Hazırolda ve sessizce' },
    { id: 'o10', text: 'Okul kütüphanesinde nasıl davranmalıyız?', options: ['Yüksek sesle konuşmalıyız', 'Sessiz olmalı ve kitapları korumalıyız', 'Yemek yemeliyiz', 'Hiçbiri'], answer: 'Sessiz olmalı ve kitapları korumalıyız' },
    { id: 'o11', text: 'Okulda kantinde sıraya girmek neden gereklidir?', options: ['Zaman kaybetmek için', 'Düzeni sağlamak ve başkalarının hakkına saygı için', 'Sıkıcı olduğu için', 'Hiçbiri'], answer: 'Düzeni sağlamak ve başkalarının hakkına saygı için' },
    { id: 'o12', text: 'Hangi davranış arkadaşlık bağlarını güçlendirir?', options: ['Yalan söylemek', 'Yardımlaşmak ve paylaşmak', 'Küsmek', 'Hiçbiri'], answer: 'Yardımlaşmak ve paylaşmak' },
    { id: 'o13', text: 'Grup çalışmalarında nasıl hareket etmeliyiz?', options: ['Sadece kendi istediğimizi yapmalıyız', 'İş birliği ve görev paylaşımı yapmalıyız', 'Hiç çalışmamalıyız', 'Hiçbiri'], answer: 'İş birliği ve görev paylaşımı yapmalıyız' },
    { id: 'o14', text: 'Okul bahçesini nasıl temiz tutarız?', options: ['Çöpleri yere atarak', 'Çöpleri çöp kutusuna atarak', 'Ağaçları kırarak', 'Hiçbiri'], answer: 'Çöpleri çöp kutusuna atarak' },
    { id: 'o15', text: 'Okulda kullanılan elektrik ve suyu nasıl harcamalıyız?', options: ['Bol bol kullanarak', 'Tasarruflu ve ihtiyacımız kadar', 'Hiç kullanmayarak', 'Hiçbiri'], answer: 'Tasarruflu ve ihtiyacımız kadar' },
    { id: 'o16', text: 'Öğretmenler Günü ne zaman kutlanır?', options: ['29 Ekim', '24 Kasım', '23 Nisan', 'Hiçbiri'], answer: '24 Kasım' },
    { id: 'o17', text: 'Sınıf başkanını nasıl seçeriz?', options: ['Öğretmen seçer', 'Demokratik bir şekilde oylama yaparak', 'En uzun boyluyu seçeriz', 'Hiçbiri'], answer: 'Demokratik bir şekilde oylama yaparak' },
    { id: 'o18', text: 'Okulda kendimizi ifade ederken hangisini kullanmalıyız?', options: ['Kaba sözler', 'Nezaket ifadeleri', 'Bağırarak konuşmak', 'Hiçbiri'], answer: 'Nezaket ifadeleri' },
    { id: 'o19', text: 'Ders araç ve gereçlerimizi hazırlarken neye bakmalıyız?', options: ['Hava durumuna', 'Ders programına', 'Çizgi filmlere', 'Hiçbiri'], answer: 'Ders programına' },
    { id: 'o20', text: 'Okulumuzun adresini bilmek neden önemlidir?', options: ['Sınavlarda çıkacağı için', 'Güvenliğimiz ve ihtiyaç anında kullanmak için', 'Önemli değildir', 'Hiçbiri'], answer: 'Güvenliğimiz ve ihtiyaç anında kullanmak için' }
  ],
  'evimizde-hayat': [
    { id: 'e1', text: 'Aşağıdakilerden hangisi evdeki sorumluluklarımızdan biridir?', options: ['Yemeği pişirmek', 'Odamızı toplamak', 'Tamir işlerini yapmak', 'Hiçbiri'], answer: 'Odamızı toplamak' },
    { id: 'e2', text: 'Babanızın erkek kardeşine ne ad verilir?', options: ['Dayı', 'Amca', 'Teyze', 'Hiçbiri'], answer: 'Amca' },
    { id: 'e3', text: 'Kaynakları verimli kullanmak için ne yapmalıyız?', options: ['Boş yere yanan lambaları kapatmalıyız', 'Suyu sonuna kadar açmalıyız', 'Ekmeği çöpe atmalıyız', 'Hiçbiri'], answer: 'Boş yere yanan lambaları kapatmalıyız' },
    { id: 'e4', text: 'Annemizin kız kardeşine ne denir?', options: ['Hala', 'Teyze', 'Yenge', 'Hiçbiri'], answer: 'Teyze' },
    { id: 'e5', text: 'Aşağıdakilerden hangisi aile içi iş bölümüne örnektir?', options: ['Herkesin kendi odasını toplaması', 'Sadece annenin çalışması', 'Babamın tek başına alışveriş yapması', 'Hiçbiri'], answer: 'Herkesin kendi odasını toplaması' },
    { id: 'e6', text: 'Eve gelen misafirlere nasıl davranmalıyız?', options: ['Görmezden gelmeliyiz', 'Güler yüzlü ve nazik davranmalıyız', 'Odamıza kapanmalıyız', 'Hiçbiri'], answer: 'Güler yüzlü ve nazik davranmalıyız' },
    { id: 'e7', text: 'Hangisi bir "İstek"tir?', options: ['Su içmek', 'Tablet bilgisayar almak', 'Beslenmek', 'Hiçbiri'], answer: 'Tablet bilgisayar almak' },
    { id: 'e8', text: 'Hangisi bir "İhtiyaç"tır?', options: ['Dondurma', 'Kışlık mont', 'Oyuncak bebek', 'Hiçbiri'], answer: 'Kışlık mont' },
    { id: 'e9', text: 'Akşam yatma vaktimizi kiminle belirleriz?', options: ['Arkadaşlarımızla', 'Ailemizle birlikte', 'Okul müdürüyle', 'Hiçbiri'], answer: 'Ailemizle birlikte' },
    { id: 'e10', text: 'Sofra kurulurken hangisi bize uygun bir görevdir?', options: ['Çatalları ve peçeteleri koymak', 'Ocakta yemek pişirmek', 'Bıçakla meyve soymak', 'Hiçbiri'], answer: 'Çatalları ve peçeteleri koymak' },
    { id: 'e11', text: 'Alışveriş yaparken öncelikle hangisini almalıyız?', options: ['Çikolata', 'Ekmek ve süt (İhtiyaçlar)', 'Boyama kitabı', 'Hiçbiri'], answer: 'Ekmek ve süt (İhtiyaçlar)' },
    { id: 'e12', text: 'Planlı yaşamak bize ne kazandırır?', options: ['Yorulmamızı sağlar', 'Zamanı verimli kullanmamızı sağlar', 'Dersleri zorlaştırır', 'Hiçbiri'], answer: 'Zamanı verimli kullanmamızı sağlar' },
    { id: 'e13', text: 'Evimizin yerini tarif ederken hangisini kullanmayız?', options: ['Bulvar ve cadde adı', 'Komşunun kedisinin adını', 'Okul veya cami gibi bilinen yerleri', 'Hiçbiri'], answer: 'Komşunun kedisinin adını' },
    { id: 'e14', text: 'Babanızın annesine ne ad verilir?', options: ['Anneanne', 'Babaanne', 'Teyze', 'Hiçbiri'], answer: 'Babaanne' },
    { id: 'e15', text: 'Tasarruf ne demektir?', options: ['Çok para harcamak', 'Kaynakları dikkatli ve idareli kullanmak', 'Hepsini biriktirmek', 'Hiçbiri'], answer: 'Kaynakları dikkatli ve idareli kullanmak' },
    { id: 'e16', text: 'Oyuncaklarımızı oynadıktan sonra ne yapmalıyız?', options: ['Yerde bırakmalıyız', 'Kutusuna kaldırıp düzenlemeliyiz', 'Kırmalıyız', 'Hiçbiri'], answer: 'Kutusuna kaldırıp düzenlemeliyiz' },
    { id: 'e17', text: 'Annemizin babasına ne deriz?', options: ['Dede', 'Amca', 'Dayı', 'Hiçbiri'], answer: 'Dede' },
    { id: 'e18', text: 'Evde kararlar alınırken hangisi yapılmalıdır?', options: ['Babanın her dediği olmalı', 'Herkesin fikri alınmalı ve ortak karar verilmeli', 'Küçüklerin sözü dinlenmemeli', 'Hiçbiri'], answer: 'Herkesin fikri alınmalı ve ortak karar verilmeli' },
    { id: 'e19', text: 'Kardeşimizle oyuncaklarımızı paylaşmak nasıl bir davranıştır?', options: ['Kaba', 'Paylaşımcı ve sevgi dolu', 'Gereksiz', 'Hiçbiri'], answer: 'Paylaşımcı ve sevgi dolu' },
    { id: 'e20', text: 'Ekmek israfını önlemek için ne yapmalıyız?', options: ['Çöpe atmalıyız', 'İhtiyacımız kadar almalıyız', 'Kuruyanları kuşlara vermeliyiz', 'Hiçbiri'], answer: 'İhtiyacımız kadar almalıyız' }
  ],
  'saglikli-hayat': [
    { id: 's1', text: 'Sağlıklı büyümek için hangisini daha çok tüketmeliyiz?', options: ['Cips ve kola', 'Meyve ve sebze', 'Şekerli sakızlar', 'Hiçbiri'], answer: 'Meyve ve sebze' },
    { id: 's2', text: 'Günde en az kaç kez dişlerimizi fırçalamalıyız?', options: ['1 kez', '2 kez', 'Haftada bir', 'Hiçbiri'], answer: '2 kez' },
    { id: 's3', text: 'Yemek yemeden önce ne yapmalıyız?', options: ['Ödev yapmalıyız', 'Ellerimizi yıkamalıyız', 'Su içmeliyiz', 'Hiçbiri'], answer: 'Ellerimizi yıkamalıyız' },
    { id: 's4', text: 'Sağlıklı bir uyku için hangisi doğrudur?', options: ['Geç saatlere kadar oturmak', 'Erken yatıp erken kalkmak', 'Televizyon karşısında uyumak', 'Hiçbiri'], answer: 'Erken yatıp erken kalkmak' },
    { id: 's5', text: 'Kişisel bakımımız için hangisini yapmalıyız?', options: ['Düzenli banyo yapmak', 'Tırnaklarımızı uzatmak', 'Eski kıyafetleri giymek', 'Hiçbiri'], answer: 'Düzenli banyo yapmak' },
    { id: 's6', text: 'Aşağıdakilerden hangisi bir kahvaltı yiyeceğidir?', options: ['Domates, peynir, yumurta', 'Hamburger', 'Pizza', 'Hiçbiri'], answer: 'Domates, peynir, yumurta' },
    { id: 's7', text: 'Yemek yerken hangisini yapmamalıyız?', options: ['Ağzımızda lokma varken konuşmak', 'Çatal kaşık kullanmak', 'Peçete kullanmak', 'Hiçbiri'], answer: 'Ağzımızda lokma varken konuşmak' },
    { id: 's8', text: 'Spor yapmanın yararı nedir?', options: ['Halsiz bırakır', 'Vücudumuzu dinç ve sağlıklı tutar', 'Boyumuzu kısaltır', 'Hiçbiri'], answer: 'Vücudumuzu dinç ve sağlıklı tutar' },
    { id: 's9', text: 'Kışın dışarı çıkarken nasıl giyinmeliyiz?', options: ['Kısa kollu', 'Yünlü ve kalın kıyafetler', 'Terlik giyerek', 'Hiçbiri'], answer: 'Yünlü ve kalın kıyafetler' },
    { id: 's10', text: 'Mevsimine uygun beslenmek ne demektir?', options: ['En pahalı meyveyi almak', 'Meyve ve sebzeleri doğal zamanında tüketmek', 'Sadece yazın meyve yemek', 'Hiçbiri'], answer: 'Meyve ve sebzeleri doğal zamanında tüketmek' },
    { id: 's11', text: 'Hangisi süt ürünlerinden biri değildir?', options: ['Yoğurt', 'Peynir', 'Patates', 'Hiçbiri'], answer: 'Patates' },
    { id: 's12', text: 'Mikroplardan korunmak için ne kullanmalıyız?', options: ['Su ve sabun', 'Sadece su', 'Havlu', 'Hiçbiri'], answer: 'Su ve sabun' },
    { id: 's13', text: 'Hasta olduğumuzda nereye gitmeliyiz?', options: ['Manava', 'Doktora', 'Okula', 'Hiçbiri'], answer: 'Doktora' },
    { id: 's14', text: 'Vücudumuzun su ihtiyacını karşılamak için ne yapmalıyız?', options: ['Meyve suyu içmek', 'Bol bol su içmek', 'Çay içmek', 'Hiçbiri'], answer: 'Bol bol su içmek' },
    { id: 's15', text: 'Açıkta satılan yiyecekleri neden almamalıyız?', options: ['Pahalı olduğu için', 'Mikrop barındırabileceği ve bayat olabileceği için', 'Tadı kötü olduğu için', 'Hiçbiri'], answer: 'Mikrop barındırabileceği ve bayat olabileceği için' },
    { id: 's16', text: 'Okul kantininden alırken hangisini tercih etmeliyiz?', options: ['Kuruyemiş ve taze meyve', 'Asitli içecekler', 'Çikolatalı gofretler', 'Hiçbiri'], answer: 'Kuruyemiş ve taze meyve' },
    { id: 's17', text: 'Tuvaletten çıktıktan sonra ne yapmalıyız?', options: ['Hemen oyuna dönmeliyiz', 'Ellerimizi sabunla yıkamalıyız', 'Hiçbir şey yapmamalıyız', 'Hiçbiri'], answer: 'Ellerimizi sabunla yıkamalıyız' },
    { id: 's18', text: 'Hapşırırken veya öksürürken ne yapmalıyız?', options: ['Başkalarının yüzüne yapmalıyız', 'Ağzımızı dirseğimizle veya mendille kapatmalıyız', 'Bağırmalıyız', 'Hiçbiri'], answer: 'Ağzımızı dirseğimizle veya mendille kapatmalıyız' },
    { id: 's19', text: 'Göz sağlığımız için hangisi yararlıdır?', options: ['A vitamini içeren havuç gibi besinler', 'Çok cips yemek', 'Televizyonu yakından izlemek', 'Hiçbiri'], answer: 'A vitamini içeren havuç gibi besinler' },
    { id: 's20', text: 'Tırnaklarımızı neden kısa tutmalıyız?', options: ['Güzel görünsün diye', 'Arasına mikroplar dolmaması için', 'Kesmek çok eğlenceli olduğu için', 'Hiçbiri'], answer: 'Arasına mikroplar dolmaması için' }
  ],
  'guvenli-hayat': [
    { id: 'g1', text: 'Acil durumlarda hangi numarayı aramalıyız?', options: ['112', '155', '110', 'Hiçbiri'], answer: '112' },
    { id: 'g2', text: 'Karşıdan karşıya geçerken nereden geçmeliyiz?', options: ['Yolun ortasından', 'Yaya geçidinden', 'Arabaların arasından', 'Hiçbiri'], answer: 'Yaya geçidinden' },
    { id: 'g3', text: 'Tanımadığımız biri bize hediye verirse ne yapmalıyız?', options: ['Hemen kabul etmeliyiz', 'Nazikçe reddedip uzaklaşmalıyız', 'Teşekkür edip almalıyız', 'Hiçbiri'], answer: 'Nazikçe reddedip uzaklaşmalıyız' },
    { id: 'g4', text: 'Araba hareket halindeyken ne takmalıyız?', options: ['Kemer', 'Emniyet kemeri', 'Güneş gözlüğü', 'Hiçbiri'], answer: 'Emniyet kemeri' },
    { id: 'g5', text: 'Hangisi bir trafik işaretidir?', options: ['Dur levhası', 'Reklam afişi', 'Dükkan tabelası', 'Hiçbiri'], answer: 'Dur levhası' },
    { id: 'g6', text: 'Evde prizlerle oynamak neden tehlikelidir?', options: ['Elektrik çarpabileceği için', 'Priz kırılabileceği için', 'Kirleneceği için', 'Hiçbiri'], answer: 'Elektrik çarpabileceği için' },
    { id: 'g7', text: 'Okul servisinde nasıl oturmalıyız?', options: ['Ayakta durarak', 'Koltuğumuza oturup emniyet kemerini bağlayarak', 'Camdan dışarı sarkarak', 'Hiçbiri'], answer: 'Koltuğumuza oturup emniyet kemerini bağlayarak' },
    { id: 'g8', text: 'Hangisi bisiklet sürerken takılması gereken bir koruyucu ekipmandır?', options: ['Kask', 'Şapka', 'Gözlük', 'Hiçbiri'], answer: 'Kask' },
    { id: 'g9', text: 'Yaya kaldırımı olmayan yollarda nereden yürümeliyiz?', options: ['Yolun ortasından', 'Gelen araçları görecek şekilde sol taraftan', 'Sağ taraftan', 'Hiçbiri'], answer: 'Gelen araçları görecek şekilde sol taraftan' },
    { id: 'g10', text: 'Oyun oynamak için nereleri tercih etmeliyiz?', options: ['İnşaat alanları', 'Parklar ve okul bahçeleri', 'Ana yollar', 'Hiçbiri'], answer: 'Parklar ve okul bahçeleri' },
    { id: 'g11', text: 'Kesici ve delici aletlerle (bıçak, makas) nasıl davranmalıyız?', options: ['Yanlışlıkla kendimize veya başkasına zarar vermemek için dikkatli olmalı ve tek başımıza kullanmamalıyız', 'Onlarla oyun oynamalıyız', 'Cebimizde taşımalıyız', 'Hiçbiri'], answer: 'Yanlışlıkla kendimize veya başkasına zarar vermemek için dikkatli olmalı ve tek başımıza kullanmamalıyız' },
    { id: 'g12', text: 'Yangın çıktığında hangi numarayı aramalıyız?', options: ['112', '110 (artık 112)', '911', 'Hiçbiri'], answer: '112' },
    { id: 'g13', text: 'Deprem anında ne yapmalıyız?', options: ['Hızla dışarı koşmalıyız', 'Çök-kapan-tutun hareketini yapmalıyız', 'Asansöre binmeliyiz', 'Hiçbiri'], answer: 'Çök-kapan-tutun hareketini yapmalıyız' },
    { id: 'g14', text: 'Yolculuk sırasında şoförle ne yapmamalıyız?', options: ['Konuşup dikkatini dağıtmamalıyız', 'Soru sormalıyız', 'Şarkı söylemeliyiz', 'Hiçbiri'], answer: 'Konuşup dikkatini dağıtmamalıyız' },
    { id: 'g15', text: 'Islak zeminlerde neden koşmamalıyız?', options: ['Ayaklarımız ıslanır', 'Kayabilir ve düşebiliriz', 'Zemin kirlenir', 'Hiçbiri'], answer: 'Kayabilir ve düşebiliriz' },
    { id: 'g16', text: 'Teknolojiyi (internet, tablet) kullanırken kime danışmalıyız?', options: ['Arkadaşlarımıza', 'Ailemize ve büyüklerimize', 'Kimseye', 'Hiçbiri'], answer: 'Ailemize ve büyüklerimize' },
    { id: 'g17', text: 'Okulda merdivenlerden nasıl inip çıkmalıyız?', options: ['Koşarak', 'Sakin ve sağ taraftan', 'Korkulukların üzerinden kayarak', 'Hiçbiri'], answer: 'Sakin ve sağ taraftan' },
    { id: 'g18', text: 'Evde tanımadığımız biri kapıyı çalarsa ne yapmalıyız?', options: ['Hemen açmalıyız', 'Ailemize haber vermeliyiz ve tanımıyorsak açmamalıyız', 'Saklanmalıyız', 'Hiçbiri'], answer: 'Ailemize haber vermeliyiz ve tanımıyorsak açmamalıyız' },
    { id: 'g19', text: 'Asansöre kiminle binmeliyiz?', options: ['Yalnız', 'Yanımızda bir büyük varken', 'Tanımadığımız biriyle', 'Hiçbiri'], answer: 'Yanımızda bir büyük varken' },
    { id: 'g20', text: 'Kırmızı ışık yayalar için ne anlama gelir?', options: ['Geç', 'Bekle / Dur', 'Hazırlan', 'Hiçbiri'], answer: 'Bekle / Dur' }
  ],
  'ulkemizde-hayat': [
    { id: 'u1', text: 'İstiklal Marşı\'mızın şairi kimdir?', options: ['Mustafa Kemal Atatürk', 'Mehmet Akif Ersoy', 'Ziya Gökalp', 'Hiçbiri'], answer: 'Mehmet Akif Ersoy' },
    { id: 'u2', text: 'Bayrağımızın renkleri hangileridir?', options: ['Mavi - Beyaz', 'Kırmızı - Beyaz', 'Sarı - Kırmızı', 'Hiçbiri'], answer: 'Kırmızı - Beyaz' },
    { id: 'u3', text: 'Başkentimiz neresidir?', options: ['İstanbul', 'Ankara', 'İzmir', 'Hiçbiri'], answer: 'Ankara' },
    { id: 'u4', text: 'Cumhuriyet ne zaman ilan edildi?', options: ['23 Nisan 1920', '29 Ekim 1923', '30 Ağustos 1922', 'Hiçbiri'], answer: '29 Ekim 1923' },
    { id: 'u5', text: 'Milli Mücadele\'nin lideri kimdir?', options: ['Kazım Karabekir', 'Mustafa Kemal Atatürk', 'İsmet İnönü', 'Hiçbiri'], answer: 'Mustafa Kemal Atatürk' },
    { id: 'u6', text: 'Dini bayramlarımızdan biri hangisidir?', options: ['Kurban Bayramı', '23 Nisan', 'Yılbaşı', 'Hiçbiri'], answer: 'Kurban Bayramı' },
    { id: 'u7', text: 'Milli bayramlarımızdan biri hangisidir?', options: ['Ramazan Bayramı', '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', 'Anneler Günü', 'Hiçbiri'], answer: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı' },
    { id: 'u8', text: 'Atatürk nerede doğmuştur?', options: ['Selanik', 'İstanbul', 'Ankara', 'Hiçbiri'], answer: 'Selanik' },
    { id: 'u9', text: 'Atatürk\'ün mezarı (Anıtkabir) nerededir?', options: ['İstanbul', 'Ankara', 'Samsun', 'Hiçbiri'], answer: 'Ankara' },
    { id: 'u10', text: 'Ülkemizin adı nedir?', options: ['Azerbaycan', 'Türkiye Cumhuriyeti', 'Almanya', 'Hiçbiri'], answer: 'Türkiye Cumhuriyeti' },
    { id: 'u11', text: 'Atatürk\'ün annesinin adı nedir?', options: ['Makbule Hanım', 'Zübeyde Hanım', 'Latife Hanım', 'Hiçbiri'], answer: 'Zübeyde Hanım' },
    { id: 'u12', text: 'Dini bayramlarda hangisini yaparız?', options: ['Bayrak asarız', 'Akrabalarımızı ziyaret ederiz', 'Okulda tören yaparız', 'Hiçbiri'], answer: 'Akrabalarımızı ziyaret ederiz' },
    { id: 'u13', text: 'Kültürel değerlerimizden biri hangisidir?', options: ['Pizza', 'Türk Kahvesi ve Lokum', 'Hamburger', 'Hiçbiri'], answer: 'Türk Kahvesi ve Lokum' },
    { id: 'u14', text: 'Ülkemizde yaşayan farklı kültürdeki insanlara nasıl davranmalıyız?', options: ['Hoşgörülü ve saygılı', 'Kötü', 'Görmezden gelerek', 'Hiçbiri'], answer: 'Hoşgörülü ve saygılı' },
    { id: 'u15', text: 'Bayrağımızın üzerindeki şekiller nelerdir?', options: ['Yıldız ve güneş', 'Ay ve yıldız', 'Sadece ay', 'Hiçbiri'], answer: 'Ay ve yıldız' },
    { id: 'u16', text: 'Milli marşımızın adı nedir?', options: ['Gençlik Marşı', 'İstiklal Marşı', 'Okul Marşı', 'Hiçbiri'], answer: 'İstiklal Marşı' },
    { id: 'u17', text: 'Hangisi bir el sanatımızdır?', options: ['Ebru sanatı', 'Basketbol', ' Piyano çalmak', 'Hiçbiri'], answer: 'Ebru sanatı' },
    { id: 'u18', text: 'Atatürk çocuklara hangi bayramı armağan etmiştir?', options: ['19 Mayıs', '23 Nisan', '29 Ekim', 'Hiçbiri'], answer: '23 Nisan' },
    { id: 'u19', text: '30 Ağustos hangi bayram olarak kutlanır?', options: ['Zafer Bayramı', 'Çocuk Bayramı', 'Gençlik Bayramı', 'Hiçbiri'], answer: 'Zafer Bayramı' },
    { id: 'u20', text: 'Halk oyunlarımızdan biri hangisidir?', options: ['Bale', 'Horon ve Halay', 'Modern dans', 'Hiçbiri'], answer: 'Horon ve Halay' }
  ],
  'dogada-hayat': [
    { id: 'd1', text: 'Hangi mevsimde kar yağar?', options: ['Yaz', 'Kış', 'İlkbahar', 'Hiçbiri'], answer: 'Kış' },
    { id: 'd2', text: 'Atık kağıtları hangi kutuya atmalıyız?', options: ['Geri dönüşüm kutusuna', 'Yiyecek kutusuna', 'Sokak çöpüne', 'Hiçbiri'], answer: 'Geri dönüşüm kutusuna' },
    { id: 'd3', text: 'Bitkilerin büyümesi için hangisine ihtiyaç yoktur?', options: ['Su', 'Güneş', 'Kola', 'Hiçbiri'], answer: 'Kola' },
    { id: 'd4', text: 'Hangisi evcil bir hayvandır?', options: ['Aslan', 'Kedi', 'Kurt', 'Hiçbiri'], answer: 'Kedi' },
    { id: 'd5', text: 'Yaz mevsiminden sonra hangi mevsim gelir?', options: ['İlkbahar', 'Sonbahar', 'Kış', 'Hiçbiri'], answer: 'Sonbahar' },
    { id: 'd6', text: 'Ağaç dikmenin çevreye katkısı nedir?', options: ['Hava temizliğini sağlar', 'Görüntüyü bozar', 'Zaman kaybıdır', 'Hiçbiri'], answer: 'Hava temizliğini sağlar' },
    { id: 'd7', text: 'Yabani hayvanlar nerede yaşar?', options: ['Evlerde', 'Doğada (Orman, Dağ)', 'Bahçelerde', 'Hiçbiri'], answer: 'Doğada (Orman, Dağ)' },
    { id: 'd8', text: 'Güneş hangi yönden doğar?', options: ['Batı', 'Doğu', 'Kuzey', 'Hiçbiri'], answer: 'Doğu' },
    { id: 'd9', text: 'Hangi meyve kışın yetişir?', options: ['Karpuz', 'Portakal', 'Kiraz', 'Hiçbiri'], answer: 'Portakal' },
    { id: 'd10', text: 'Doğayı korumak için ne yapmalıyız?', options: ['Ormanlara zarar vermeliyiz', 'Çöplerimizi doğaya bırakmamalıyız', 'Çiçekleri koparmalıyız', 'Hiçbiri'], answer: 'Çöplerimizi doğaya bırakmamalıyız' },
    { id: 'd11', text: 'Bitkiler kendi besinlerini üretmek için neyi kullanırlar?', options: ['Güneş enerjisini', 'Süt', 'Toprak', 'Hiçbiri'], answer: 'Güneş enerjisini' },
    { id: 'd12', text: 'Hangi hayvan havada uçar?', options: ['Tavşan', 'Serçe', 'Koyun', 'Hiçbiri'], answer: 'Serçe' },
    { id: 'd13', text: 'Geri dönüşümün faydası nedir?', options: ['Daha çok çöp oluşur', 'Doğal kaynaklar korunur', 'Etraf kirlenir', 'Hiçbiri'], answer: 'Doğal kaynaklar korunur' },
    { id: 'd14', text: 'Çevremizdeki bitkilere nasıl davranmalıyız?', options: ['Dallarını kırmalıyız', 'Onları korumalı ve sularız', 'Görmezden gelmeliyiz', 'Hiçbiri'], answer: 'Onları korumalı ve sularız' },
    { id: 'd15', text: 'Hangi atık plastik kutusuna atılmalıdır?', options: ['Yemek artığı', 'Pet şişe', 'Eski gazete', 'Hiçbiri'], answer: 'Pet şişe' },
    { id: 'd16', text: 'Su tasarrufu için ne yapılmalıdır?', options: ['Muslukları açık bırakmalı', 'Bozuk muslukları tamir ettirmeli', 'Çok sık suyla oynamalı', 'Hiçbiri'], answer: 'Bozuk muslukları tamir ettirmeli' },
    { id: 'd17', text: 'Kuzey, güney, doğu ve batı neyi ifade eder?', options: ['Renkleri', 'Yönleri', 'Mevsimleri', 'Hiçbiri'], answer: 'Yönleri' },
    { id: 'd18', text: 'İlkbaharda doğada ne gibi değişiklikler olur?', options: ['Kar yağar', 'Çiçekler açar ve her yer yeşillenir', 'Yapraklar dökülür', 'Hiçbiri'], answer: 'Çiçekler açar ve her yer yeşillenir' },
    { id: 'd19', text: 'Havayı en çok ne kirletir?', options: ['Fabrika dumanları ve egzoz gazları', 'Yağmur', 'Rüzgar', 'Hiçbiri'], answer: 'Fabrika dumanları ve egzoz gazları' },
    { id: 'd20', text: 'Mevsimlerin oluşmasıyla ne değişir?', options: ['Sadece günlerin adı', 'Hava sıcaklığı ve doğa olayları', 'Hiçbir şey değişmez', 'Hiçbiri'], answer: 'Hava sıcaklığı ve doğa olayları' }
  ]
};

const UNITS = [
  { id: 'okulumuzda-hayat', title: 'Okulumuzda Hayat', icon: School, color: 'bg-indigo-500' },
  { id: 'evimizde-hayat', title: 'Evimizde Hayat', icon: Home, color: 'bg-rose-500' },
  { id: 'saglikli-hayat', title: 'Sağlıklı Hayat', icon: HeartPulse, color: 'bg-emerald-500' },
  { id: 'guvenli-hayat', title: 'Güvenli Hayat', icon: ShieldCheck, color: 'bg-amber-500' },
  { id: 'ulkemizde-hayat', title: 'Ülkemizde Hayat', icon: Flag, color: 'bg-red-500' },
  { id: 'dogada-hayat', title: 'Doğada Hayat', icon: Leaf, color: 'bg-green-500' },
];

const REWARD_CATEGORIES = [
  'Hayat Bilgisi Yıldızı',
  'Fen Bilimleri Yıldızı',
  'Türkçe Yıldızı',
  'Matematik Yıldızı',
  'Öğretmen Özel Ödülü Yıldızı'
];

export interface HayatBilgisiActivityProps {
  onBack: () => void;
  students: Student[];
  user: any;
  onShowInfo?: () => void;
  units?: any[];
  questions?: any[];
  onManageQuestions?: () => void;
}

export const HayatBilgisiActivity: React.FC<HayatBilgisiActivityProps> = ({ onBack, students, user, onShowInfo, units, questions, onManageQuestions }) => {
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
  const [rewardCategory, setRewardCategory] = useState<string>('Hayat Bilgisi Yıldızı');

  const [customQuestions, setCustomQuestions] = useState<Record<string, Question[]>>({});
  const [deletedDefaultQuestions, setDeletedDefaultQuestions] = useState<string[]>([]);
  const [leaderboardModalUnit, setLeaderboardModalUnit] = useState<any | null>(null);
  const [manageQuestionsModal, setManageQuestionsModal] = useState<{
    isOpen: boolean;
    unitId: string;
    view: 'list' | 'add' | 'edit';
    editingId: string | null;
  }>({ isOpen: false, unitId: 'okulumuzda-hayat', view: 'list', editingId: null });

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const path = `users/${user.uid}/activitySettings/hayatBilgisi`;
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
      const path = `users/${user.uid}/hayatBilgisiQuestions`;
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
    unitId: 'okulumuzda-hayat',
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
         await updateDoc(doc(db, `users/${user.uid}/hayatBilgisiQuestions/${manageQuestionsModal.editingId}`), { ...qd, updatedAt: Date.now() });
         setCustomQuestions(prev => {
           const uqs = prev[qd.unitId] || [];
           const updated = uqs.map(uq => uq.id === manageQuestionsModal.editingId ? { id: manageQuestionsModal.editingId!, text: qd.question, options: qd.options, answer: qd.answer } : uq);
           return { ...prev, [qd.unitId]: updated };
         });
      } else {
         // Add as new custom question
         const docRef = await addDoc(collection(db, `users/${user.uid}/hayatBilgisiQuestions`), { ...qd, createdAt: Date.now() });
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
           await setDoc(doc(db, `users/${user.uid}/activitySettings/hayatBilgisi`), { deletedQuestions: newDeleted }, { merge: true });
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
        await deleteDoc(doc(db, `users/${user.uid}/hayatBilgisiQuestions/${q.id}`));
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
        await setDoc(doc(db, `users/${user.uid}/activitySettings/hayatBilgisi`), { deletedQuestions: newDeleted }, { merge: true });
      }
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-rose-50/30 dark:bg-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-rose-400/20 dark:bg-rose-500/10 rounded-full blur-[80px]" />
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] bg-rose-400/20 dark:bg-rose-500/10 rounded-full blur-[80px]" />
        
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
             <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 px-6 py-4 rounded-[2rem] border-2 border-rose-100 dark:border-rose-900 shadow-xl shadow-rose-500/10">
                <div className="p-3 bg-rose-500 dark:bg-rose-600 text-white rounded-2xl shadow-md">
                   <HeartPulse size={28} strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                  Hayat Bilgisi <span className="text-rose-600 dark:text-rose-400 font-extrabold">Arenası</span>
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-3">
            {onShowInfo && (
              <button 
                onClick={onShowInfo} 
                className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 shadow-sm hover:scale-105 active:scale-95 transition-all text-neutral-500 hover:text-rose-500"
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
                    <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
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
                    const FALLBACK_ICONS = [HeartPulse, Sun, Leaf, ShieldCheck, Target, Zap, Clock];
                    const FALLBACK_COLORS = ['bg-amber-500', 'bg-rose-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-orange-500'];
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
                        ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-900/40 shadow-lg shadow-rose-500/10 scale-[1.02]' 
                        : 'border-slate-100 dark:border-neutral-800 hover:border-rose-300 dark:hover:border-rose-700 bg-white dark:bg-neutral-900 shadow-sm'
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
                          <div className={`w-2 h-2 rounded-full ${selectedUnit === unit.id ? 'bg-rose-500 animate-pulse' : 'bg-slate-300 dark:bg-neutral-700'}`} />
                          <span className={`text-[10px] uppercase font-black tracking-widest ${selectedUnit === unit.id ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
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
                          ? 'bg-white text-rose-600 shadow-sm hover:bg-rose-50'
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

                {/* Öğrenci Seçim Kartı */}
                <div className="dashboard-card p-6 xl:col-span-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl flex flex-col min-h-[450px] shadow-sm">
                   <div className="flex items-center justify-between mb-6 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                          <Users size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">Yarışmacılar</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Öğrenci Seçimi ({selectedStudents.length}/{students.length})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedStudents([])}
                          className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          Temizle
                        </button>
                        <button 
                          onClick={() => setSelectedStudents(students.map(s => s.id))}
                          className="px-4 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                        >
                          Tümünü Seç
                        </button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {students.map(student => {
                          const isSelected = selectedStudents.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              onClick={() => {
                                if (isSelected) setSelectedStudents(prev => prev.filter(id => id !== student.id));
                                else setSelectedStudents(prev => [...prev, student.id]);
                              }}
                              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${
                                isSelected 
                                ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-900/40 ring-2 ring-rose-500/20' 
                                : 'border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-rose-200'
                              }`}
                            >
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300'}`}>
                                  {student.name.charAt(0)}
                               </div>
                               <span className={`text-[11px] font-bold truncate w-full text-center ${isSelected ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-neutral-400'}`}>
                                 {student.name}
                               </span>
                               {isSelected && (
                                 <div className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5">
                                   <CheckCircle2 size={10} />
                                 </div>
                               )}
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
                      className="group relative w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
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
        </AnimatePresence>

        <AnimatePresence mode="wait">
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
                subject="Hayat Bilgisi"
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
                  subject={UNITS.find(u => u.id === selectedUnit)?.title || 'Hayat Bilgisi'}
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
                subject="Hayat Bilgisi"
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
                subject="Hayat Bilgisi"
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
                         className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold uppercase text-sm hover:bg-indigo-600"
                      >
                         + Yeni Soru Ekle
                      </button>
                   </div>
                   
                   <div className="mb-6">
                      <select 
                         value={manageQuestionsModal.unitId}
                         onChange={e => setManageQuestionsModal(prev => ({ ...prev, unitId: e.target.value }))}
                         className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white font-bold outline-none border-indigo-200 focus:border-indigo-500"
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
                              <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-3">Cevap: {q.answer}</div>
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
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-indigo-500 transition-colors"
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
                          className="w-full p-4 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
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
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">B Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optB}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optB: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-neutral-500 mb-2">C Seçeneği</label>
                          <input 
                            required
                            value={newQuestionForm.optC}
                            onChange={e => setNewQuestionForm(prev => ({...prev, optC: e.target.value}))}
                            className="w-full p-3 rounded-xl border-2 border-neutral-100 dark:border-neutral-800 bg-transparent dark:text-white outline-none focus:border-indigo-500 transition-colors"
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
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
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
                          className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-indigo-600 transition-colors"
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
