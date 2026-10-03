# Mini Saha

Telefon ve bilgisayarda çalışan HTML futbol oyunu. 5'e 5 / 11'e 11, yapay zekâ, otomatik kaleci, klavye tuş atamaları ve gömülü Türkçe erkek spiker içerir. Tek oyunculu maçlara ek olarak sunucu servisi kurulduğunda iki kişi çevrimiçi karşılaşabilir.

## Çevrimiçi eşleştirme

Ana menüde takımını seç, **Arkadaşlarla / çevrimiçi oyna** düğmesine bas ve oyuncu adını gir. **Host ol** ile en fazla 20 karakter başlık ve 50 karakter açıklamayla oda aç; arkadaşın **Hosta katıl** listesinden seni seçsin. **Rastgele eşleşme** diğer rastgele bekleyen oyuncuyu bulur; arkadaş odaları kuyruğa karışmaz. Rastgele sırada 5 ve 11 tercihi farklı oyuncular da eşleşebilir: sıraya önce girenin oyuncu sayısı teklif ekranında gösterilir. Boş arkadaş odaları maç kapasitesini tüketmez.

**Oyun bulundu!** ekranı kendi takımını, rakip takımını, rakibin oyuncu adını ve gerçek ilk 5 / ilk 11’i ad, mevki ve puanla gösterir. **Kabul et / İptal et** vardır. İki taraf kabul edene kadar maçın süresi ve fiziği başlamaz. Teklif 30 saniye geçerlidir; iptal veya zaman aşımında bekleyen diğer rastgele oyuncu tekrar sıraya alınır.

Oyuncu adı hesap değildir ve kalıcı kaydedilmez; her sayfa yenilemede boşalır. Aynı normalleştirilmiş ad sunucuda eşzamanlı kullanılamaz. Ayrılınca ad serbest kalır; beklenmedik kopuşta en geç 8 saniye içinde temizlenir. Host ayrılınca oda kapanır. Bağlantı isteği 10 saniyede zaman aşımına uğrar; beklerken **Ayrıl / iptal et** ile çıkılabilir.

Maçlar üç dakikadır; beraberlikte uzatma ve otomatik penaltılar vardır. İki ekran da kendi takımını soldan sağa hücum ederken gösterir. Sunucu 60 Hz fizik hesaplar ve 30 Hz durum yayınlar. Tarayıcılar durum üretmez; hareket ve tuş geçişlerini sürekli WebSocket üzerinden gönderir. Kısa dokunuşun basma/bırakma geçişi ve gerçek tutma gücü korunur; önceki HTTP yanıtı beklenmez. WebSocket açılamazsa SSE/HTTP yedeği kullanılır; bu yol daha fazla gecikme yapabilir. İnternet gecikmesi tamamen ortadan kalkmaz.

### Duraklatma ve oyuncu değişiklikleri

**Duraklat → Oyuncu değiştir** ile sahadan çıkacak oyuncuyu ve gerçek kadrodaki yedeği seç. Kadro kaynağı önceki sürümle aynıdır: 2026–27 kadroları; FC26 veya tahmini puanlar. FC27 / eFootball’dan yeni resmî veri çekildiği iddia edilmez.

- 11’e 11’de her takım 5 oyuncu değiştirebilir; çıkan oyuncu geri giremez. 5’e 5’te dönüşümlü değişiklik yapılabilir.
- Kaleci yerine kaleci, saha oyuncusu yerine saha oyuncusu seçilir. Giren oyuncu kendi adı ve puanıyla, tam enerjiyle gelir; skor ve zaman korunur. Değişiklikler gol sonrası santrada da korunur.
- Çevrimiçi duraklatma iki oyuncunun maçını birlikte durdurur. Yalnızca duraklatan kişi kendi takımını değiştirebilir veya maçı devam ettirebilir. 45 saniye sonunda oyun otomatik devam eder. Çevrimiçi simülasyon yoktur.
- Spiker çıkan ve giren oyuncuyu isimleriyle söyler; iki tarayıcı da aynı değişikliği görür.

### Saha görünümünde oyuncu değişiklikleri

Duraklatma ekranında ilk 5 / ilk 11, seçilen dizilişte saha üzerinde kartlarla görünür. Kartlarda isim, mevki, puan ve enerji gösterilir; çıkacak oyuncuyu kartına dokunarak seç. Aşağıdaki yedek kartlarında doğal/alternatif mevkiler ve puanlar yer alır. O mevkinin doğal veya yakın alternatiflerinde oynayan uygun yedekler önce sıralanır; en uygun seçenek **Önerilen** olarak işaretlenir. Mevki dışı oyuncular ayrıca belirtilir. Kaleci/saha uyumsuzluğu, 11’e 11 yeniden giriş ve değişiklik sınırı, çevrimiçi duraklatma sahibi kuralları korunur.

### Lig sezonu · 2026–27

Ana menüde **Lig sezonu** bölümünden ligini ve kulübünü seç. FC kariyer ekranı düzenini izleyen ayrı kulüp merkezi **Genel Bakış, Puan Tablosu, Fikstür, Kadro** sekmeleri içerir. Sonraki maç, sıra, puan ve hafta ana ekrandadır; puan tablosunda ülkenin iki ligi arasında geçiş yapılır.

Altı ülkenin üst ve ikinci ligleri: Süper Lig / Trendyol 1. Lig, Premier League / Championship, La Liga / Hypermotion, Serie A / Serie B, Bundesliga / 2. Bundesliga, Ligue 1 / Ligue 2. 2026–27 kadro anlık görüntülerinden çift devreli oyun fikstürü üretilir; gerçek resmî maç takvimi değildir. 18/20/22/24 takımlı ligler 34/38/42/46 haftadır.

**Maça çık** ile takımını 11’e 11 yönet veya duraklatıp simüle et. Normal lig maçında beraberlik korunur. Diğer maçlar gerçek kadroların bitiricilik, pas, savunma ve kaleci puanlarıyla simüle edilir. Sıralama puan, averaj ve atılan goldür; bu sade oyun kuralıdır.

Sezon sonunda yükselme/düşme ve ülkeye göre play-off/baraj sonuçları hesaplanıp kaydedilir. Türkiye, İngiltere, İspanya ve İtalya’da üç; Almanya/Fransa’da iki doğrudan değişim, baraj sonucuna göre üçüncü değişim vardır. Türkiye 3–7 ve İngiltere 2026–27’de 3–8 play-off modelidir. Play-off maçları otomatik simüle edilir, sonuçları merkezde gösterilir. İspanyol rezerv takımlar yükselmez. **Sonraki sezona geç** seçilen kulübü ve kadrosunu korur, yeni lig üyeleriyle yeni fikstür kurar. Alt lige düşsen de kariyer devam eder. İki kademeli kariyer üçüncü lige düşmeyi modellemez; resmî başa baş eşitlik, rezerv takım ana kulüp sınırlamaları ve alt kademelerin tamamı kapsam dışıdır.

Sezon bu tarayıcıda otomatik kaydedilir. Bitmemiş maçı bırakmak veya sayfayı yenilemek puan yazmaz; bitmiş maç tekrar puan yazmaz. Normal maç/çevrimiçi mod ayrıdır. Kontroller: `tests/league.cjs`, `tests/league-promotion.cjs`.

### Kalecinin elindeki top

Kaleci erişebildiği, tutmaya uygun topu yakalar; çok sert veya yetişilemeyen vuruşları otomatik garantiyle tutmaz. Top elindeyken klavye/joystick ile kendi ceza sahası içinde hareket edebilir; sınırların dışına çıkamaz, top elinde kalır ve rakip müdahale edemez. Kendi takımında pas alıcısını korner ve taçtaki gibi **sahadaki oyuncuya dokunarak** seç: ardından **Pas**. Seçilen oyuncunun çevresinde sarı halka görünür. Kaleci topu eliyle yüksekten seçilen hedefe atar; şut atmaz veya topu sürmez. Aynı davranış yerel ve çevrimiçi maçta kullanılır.

### 3.000 replik ve duygulu spiker

Olaylara göre seçilen **3.000 benzersiz replik** vardır. Gol, kurtarış, kaçan fırsat, baskı, son dakikalar ve oyuncu değişikliği ayrı havuzlardan seçilir. Golde daha canlı tempo ve ton, kaçan fırsatta daha düşük ton, yakın skorlu son anlarda daha fazla heyecan; isim ve değişiklik anonsunda açık ve sakin telaffuz kullanılır. Sıradan paslarda gol coşkusu uygulanmaz. Replik torbası ve bekleme aralıkları tekrar/üst üste konuşmayı azaltır.

**Spikerin tuttuğu taraf** menüsünde Tarafsız / Bizim takım / Rakip takım seçilebilir. Tek oyunculuda desteklediği takımın golüne sevinir, kaçan fırsatına üzülür; rakip golünde tonu düşer. Çok oyunculuda seçim devre dışıdır ve her zaman tarafsız anlatır. Çevrimiçi maçtan çıkınca kaydedilen tek oyunculu tercihi geri gelir.

146 yabancı oyuncu adı için Türkçe okunuş düzeltmeleri vardır; görünen gerçek isimler değişmez. Yeni replikler ve isimler, gömülü sesle aynı **Piper tr_TR-dfki-medium** modeliyle VPS’de üretilir ve MP3 önbelleğine alınır. 3.000 repliğin tümü önceden kaydedilmiş dosyalar değildir; eksik parçalar ilk kullanımda oluşturulur. Ses modeli ayrı işlemde ve tek CPU iş parçacığında çalışır. Telefona Türkçe ses kurulması gerekmez. GitHub Pages veya sunucusuz HTML’de yalnızca önceden gömülü kayıtlar tam çalışır; yeni sesler için çevrimiçi servis gerekir.

### Server.pro güncelleme

Shell’e tek seferde yapıştır:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/pisanadam/Minisaha/main/deploy/update.sh) minisaha.pisankus.dedyn.io
```

Güncelleme temiz geçici checkout kullanır; kurulum düzenini ve bağlantı testlerini kontrol eder, Python sanal ortamına Piper 1.8.0 ve Türkçe ses modelini, gerekiyorsa Node.js 18+ ve FFmpeg’i kurar. Ardından ses hazır durumunu doğrulayıp çevrimiçi servisi ve oyunu günceller. İlk ses kurulumu model indirdiği için daha uzun sürebilir. Aktif maçlar servis yeniden başlatıldığında sonlanır.

- Servis: `sudo systemctl status minisaha-online`
- Hata kaydı: `sudo journalctl -u minisaha-online -n 50 --no-pager`
- Sağlık: `https://minisaha.pisankus.dedyn.io/online/health` → `version: 3`, `voiceReady: true`.
- WebSocket: aynı alan adındaki `/online/socket`; Nginx yükseltme başlıklarını aktarır. Backend yalnızca `127.0.0.1:8787` dinler.
- Kurulum mevcut Mini Saha TLS ayarlarını ve diğer siteleri korur. Maçlar/odalar RAM’de tutulur; yeniden başlatmada sonlanır.

Doğrulama: `tests/online.cjs`, `tests/lobbies.cjs`, `tests/online-socket.cjs`, `tests/online-client.cjs`, `tests/keeper-hands.cjs`, `tests/substitutions.cjs`, `tests/online-deploy.py`. İki gerçek bağlantı; teklif/kabul, karışık oyuncu sayısı, iptal/zaman aşımı, hareket ve tuş geçişleri, ortak duraklatma ve yetkili değişiklikleri sınar.

Ses altyapısı: [Piper Python API](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md), [Türkçe DFKI model ve lisans bilgileri](https://huggingface.co/rhasspy/piper-voices/tree/v1.0.0/tr/tr_TR/dfki/medium). Piper GPL-3.0; DFKI ses verisinin CC BY-NC-SA 4.0 atfı oyun içinde korunmuştur.

## Kadrolar ve maç simülasyonu (28.09.2026)

- Seçilebilir **284 takımın tamamı**, toplam **8.145 takım-oyuncu kaydı**: kulüpler için 2026–27, millî takımlar için 2026 kadroları. Bu sayı benzersiz futbolcu sayısı değildir; bir futbolcu kulübünde ve millî takımında bulunabilir.
- Kaynak anlık görüntüleri ve takım kimlikleri `roster-source/` içinde. ESPN takım kadroları esas alındı; Gençlerbirliği 28 kişilik tescil listesi ve kulüp sayfasıyla ayrıca düzeltildi. Millî takım listeleri 2026 oyuncu havuzudur; her maçın birebir çağrı listesi olduğu iddia edilmez.
- Eski rastgele isim havuzu, başka kulüpten isim aktaran eşleştirme ve tarayıcıdaki FC26 kadro önbelleği kaldırıldı. Kadrolar ağ bağlantısı gerekmeden yüklenir.
- **5’e 5 için 6 diziliş:** 1–2–1, 2–2, 2–1–1, 1–1–2, 1–3, 3–1. **11’e 11 için 11 diziliş:** 4–3–3, 4–2–3–1, 4–4–2, 4–1–4–1, 4–1–2–1–2, 3–5–2, 3–4–3, 5–3–2, 5–4–1, 4–3–2–1, 4–2–2–2. Her maç türünün menü seçimi ayrı kaydedilir.
- **Duraklat → Diziliş ve oyuncu değiştir → Dizilişi uygula** ile maç içinde de değiştirilir. Mevcut oyuncular en uygun yeni mevkilere atanır; oyuncuların anlık konumu, enerjisi, skor, süre ve değişiklik hakları korunur. Rakibin dizilişi değişmez; sonraki santrada yeni düzen korunur. Çok oyunculuda sunucu yalnızca maçı duraklatan oyuncunun kendi takımına izin verir; iki istemci aynı düzeni görür.
- İlk 11 ve ilk 5, bütün kadro içinden mevkiler ve puanlar birlikte değerlendirilerek seçilir. Kadro ekranı gerçek sahadaki oyuncuları ve kalan bütün yedekleri gösterir; takım değişimi önceki oyuncuları taşımaz.
- **3.608 kaydın puanları FC26 verisidir**, kalan **4.537 kayıt oyun içi tahminidir** ve ekranda belirtilir. Resmî FC27 reytingi iddiası yoktur. Güncel kulüp üyeliği eski FC26 CSV'sinden alınmaz. Kaynağın yalnızca genel D/M/F mevkisi verdiği oyuncuda ayrıntılı doğal mevki uydurulmaz; uygun mevki ailesi içinde dizilişe atanır.
- Duraklatma menüsünde **Maçı simüle et**: iki takımı aynı seviyede yapay zekâ yönetir; aktif oyuncuların bitiricilik, şut, pas, hız, top sürme, savunma puanları ve mevki uyumu davranışı belirler. Haaland’ın bitiriciliği gol fırsatlarında, Barış Alper’in hızı koşularda avantaj sağlar. Yedekler sahaya girince takım gücü yeniden hesaplanır; skor farkına göre gerideki takıma bonus verilmez. Güçlü takım daha fazla fırsat ve farklı galibiyet üretebilir; sonuç önceden atanmaz. **Kontrolü geri al** ile oyuna dönülür.
- **Maç sonuna simüle et**: mevcut skor, geçen süre ve goller korunur; aynı fizik motoru sabit adımlarla kalan maçı tamamlar. Uzatma, kadro gücüne bağlı otomatik penaltılar, golcü/zaman kayıtları, istatistik ve maç geçmişi dahil.

Kontroller: `node tests/rosters-simulation.cjs`, `node tests/defense.cjs`, `node tests/pronunciation.cjs`.

Kadroları yeniden üretmek için manifestteki SHA256 ile doğrulanan FC26 CSV'sini indirin; `python3 tools/build_rosters.py /path/to/players.csv` çalıştırın. Kaynak JSON'ları bilinçli olarak takım kimliğiyle eşleştirilir; otomatik bulanık kulüp eşleştirmesi yoktur. Üretilen dosyalarda içerik özeti kullanıldığı için eski tarayıcı önbelleği kadroyu geri getirmez. Sonra `SHA256SUMS` dosyasını güncelleyin.

## Savunma güncellemesi

- Otomatik seçim pas alıcısını, topun tahmini gidişini ve kaleye yakın savunmacıyı dikkate alır. Manuel değişim kısa süre korunur.
- Top rakipte veya boşta: **Pas → basılı tutarak pres**, **Şut → ayakta müdahale**, **Orta → kayarak müdahale**, **Ara pas → ikinci pres**.
- Ayakta müdahale erişilebilen topa yapılır. Kayma yönü hamle başlayınca sabitlenir; kaçırınca toparlanma süresi vardır. İkinci pres 2,5 saniye ile sınırlıdır.
- Top kazanılınca hücum tuşları geri gelir; basılı savunma tuşu istemeden şut/pas üretmez.
- Manuel kaleci kurtarış tuşu kaldırıldı. İki kaleci de aynı otomatik modelle çalışır; reaksiyon, uzanma ve top tutma gücü azaltıldı, kadro puanına bağlı farklar korunur.

Kontroller: `node tests/defense.cjs` (Node.js; ek paket gerekmez).

## Spiker telaffuzu

Liverpool dahil 54 takım adı için Türkçe telaffuz sözlüğü eklendi. 0–100 sayıları ve bin sözcüğü rakam yerine Türkçe yazıyla yeniden seslendirildi: toplam 156 düzeltilmiş gömülü MP3 kaydı. Skor sayıları ve düzeltilen takım adları daha yavaş, aralarında belirgin duraklamayla okunur. 100 üzerindeki skorlar mevcut sayı kayıtlarından birleştirilir. Aynı telaffuz ve sayı dönüşümü isteğe bağlı cihaz seslerine de uygulanır; ekrandaki gerçek takım adları değişmez.

Kontrol: `node tests/pronunciation.cjs`. Kayıt metinleri: `audio-source/pronunciations.json`.

## Dosyalar

- `public/index.html`: oyun.
- `public/assets/voice-*.js`: 1.776 gömülü ses kaydı. Tamamı oyunla birlikte yayımlanmalıdır.
- `deploy/install.py`: mevcut Debian/Ubuntu Nginx sunucusuna ayrı site kurulumu ve güncelleme.
- `SHA256SUMS`: yayımlanan dosyaların bütünlük kontrolü.

Sesler bu repodan yüklenir; ziyaretçinin cihazında erkek ses kurulması gerekmez. Oyun ayarları tarayıcıda tutulur; farklı alan adına geçince eski alanın kayıtları otomatik taşınmaz.

## Server.pro VPS / Nginx kurulumu

Hedef IPv4: **43.226.0.124**. deSEC ekranında `minisaha` A kaydı bu IP'ye yönlendirilmiştir. Tam adres: **minisaha.pisankus.dedyn.io**. Genel DNS sorgusu bu adresin `43.226.0.124` IP'sine yönlendiğini doğrulamıştır.

Bu kurulum Linux terminali ve sudo yetkisi olan, Nginx'in hâlihazırda çalıştığı VPS içindir. Sadece oyun sunucusu paneli, Apache, Caddy veya panelin yönettiği farklı bir web düzeni varsa önce o düzene uygun sanal sunucu ayarı gerekir. Script farklı web sunucularını kaldırmaz ve paket kurmaz.

```bash
git clone https://github.com/pisanadam/Minisaha.git
cd Minisaha
sudo python3 deploy/install.py minisaha.pisankus.dedyn.io --check
sudo python3 deploy/install.py minisaha.pisankus.dedyn.io
```

Script yalnızca `/var/www/minisaha/` ve `/etc/nginx/sites-available/minisaha.conf` ile buna ait etkinleştirme bağlantısını kullanır. Varsayılan siteye ve diğer alan adlarına dokunmaz. Alan adı zaten kullanılıyorsa veya hedef başka bir kuruluma aitse durur. Yeni sürüm ayrı dizine kopyalanır, bağlantı atomik değiştirilir. Nginx yapılandırma testi başarısız olursa önceki bağlantı geri yüklenir. Eski sürümler korunur.

Nginx aynı IP'deki siteleri `server_name` ile ayırır. deSEC'teki diğer A kayıtları ve NS kayıtları korunmalıdır. Ağ güvenlik duvarında HTTP için 80, HTTPS için 443 erişilebilir olmalıdır. Başka bir hizmetin port ayarını değiştirmeyin.

## HTTPS

DNS yayıldıktan ve HTTP üzerinden oyun açıldıktan sonra, sunucuda Certbot'un Nginx eklentisi kuruluysa:

```bash
sudo certbot --nginx -d minisaha.pisankus.dedyn.io
```

Sunucuda başka sertifika yöneticisi/panel varsa onun alan adına özel HTTPS seçeneğini kullanın. Güncelleme scripti mevcut Mini Saha Nginx dosyasını yeniden yazmaz; sertifika ayarları korunur.

## Sonraki güncellemeler

GitHub'a yüklemek sunucudaki dosyaları kendiliğinden güncellemez. Sunucudaki repo klasöründe:

```bash
git pull --ff-only
sudo python3 deploy/install.py minisaha.pisankus.dedyn.io
```

Sunucuda açılışı doğrulayın:

```bash
curl -I -H 'Host: minisaha.pisankus.dedyn.io' http://127.0.0.1/
```

## GitHub Pages alternatifi

VPS yerine GitHub Pages kullanılacaksa deponun **Settings → Pages → Source → GitHub Actions** ayarını seçin. Sonra **Actions → Publish Mini Saha → Run workflow** çalıştırın. İşlem başarılı olunca yayın adresi Actions çıktısında görünür. `public/` klasörü yayımlanır; kurulum scriptleri yayımlanmaz.

Özel alan adını Pages'e taşımak ayrıca DNS değişikliği gerektirir. Mevcut `43.226.0.124` A kaydını Pages için kullanmayın. Server.pro kurulumu tercih ediliyorsa DNS'i değiştirmeyin.

## Yerel kontrol

```bash
python3 -m http.server 8080 --directory public
```

Tarayıcıda `http://localhost:8080` adresini açın. Ses tarayıcı kuralları nedeniyle oyunu başlatma/önizleme tıklamasından sonra çalışır.

## Ses kaynağı

Piper `tr_TR-dfki-medium` ile üretilmiş, kırpılmış ve MP3'e dönüştürülmüş sentetik erkek ses kayıtlarıdır. Kaynak veri: © 2009 DFKI GmbH, [DFKI Turkish audio data](https://github.com/marytts/dfki-ot-data/). Ses verileri ve dönüştürülmüş kayıtlar **CC BY-NC-SA 4.0** koşullarındadır. Bu bildirim ve oyun içindeki kaynak açıklaması korunmalıdır.

## Resmî belgeler

- [Nginx sunucu adları](https://nginx.org/en/docs/http/server_names.html)
- [Nginx yapılandırma testi ve reload](https://nginx.org/en/docs/switches.html)
- [GitHub Pages yayın kaynağı](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [deSEC DNS kayıtları](https://desec.readthedocs.io/en/latest/dns/rrsets.html)

### Maç sonu sürprizi

Yerel takım (çevrimiçi maçta da kendi takımın) maç sonunda en az 10 gol farkla kazanırsa üç yerleşik fotoğraftan biri rastgele tam ekran gösterilir. Maç başına bir kez çalışır; 2,5 saniyede veya dokunma/Escape ile kapanır. Kısa ses, Efekt ayarına uyar. Görsel yüklenemezse sonuç ekranı kullanılmaya devam eder. `node tests/jumpscare.cjs` sınır skorlarını, tekrar tetiklemeyi, sıfırlamayı ve sunucu ayrımını doğrular.

Alt lig verileri: `roster-source/lower.json`. Türkiye 1. Lig kadroları TFF’nin 7–8. hafta resmî maç kağıtlarının birleşimidir; tam tescil listesi olarak sunulmaz. Eşleştirilemeyen saha oyuncularında ayrıntılı mevki yerine geniş M sınıfı, bilinmeyen puanlarda etiketli oyun tahmini kullanılır. Diğer beş alt ligin kadroları ESPN anlık görüntüleridir. İncelenmiş alt lig asset’i ana kadro yeniden derlemesinde korunur.

Ana menü: Hızlı Maç, Lig Kariyeri, Çok Oyunculu, Ayarlar sekmeleri. Takım/saha düzeni hızlı maç ve çok oyunculuda ortaktır; çevrimiçi maçta yerel süre/zorluk ayarları gizlenir. Spiker, klavye ayarları ve yardım Ayarlar’da; lig kurulumu ve kayıtlı kariyere devam Lig Kariyeri’ndedir. Mobilde tek sütun, yatay ekranda iki takım sütunu, kaydırma sırasında sabit sekme çubuğu ve klavyede odak işareti kullanılır.

Dokunmatik kaydırma: varsayılan `touch-action:auto`; yalnızca saha, joystick ve maç aksiyon tuşlarında `none`. Menü/pause/kariyer/teklif/sonuç/penaltı kartları ve alt öğeleri doğal kaydırmaya izin verir. Puan tablosu yatay ve dikey, üst maç düğmeleri yatay kaydırılır; yedek listesi kendi sınırından sonra dış karta kaydırmayı aktarır.

Kaleci çapraz şut düzeltmesi: şut öncesi yerleşim topun Y konumunun sabit yüzdesiyle değil kale-top açısıyla hesaplanır. Serbest top kale ağzına yöneliyorsa 1,1 saniyelik varış penceresinde okunur; top sürtünmesinden kaynaklanan yavaşlama zamanlamaya dahil edilir. Reytinge bağlı tepki, dalış mesafesi ve fiziksel el/gövde teması korunur. `tests/keeper-angles.cjs`: iki taraf ve 5/11 için 72 yakın/uzak köşe şutu, yakından erişilemeyen goller ve kale dışı şut kontrolü.

Oyuncu değişikliği GUI: lig ve normal maçın ortak duraklatma ekranında kulüp başlığı, diziliş araç çubuğu, saha yerleşimi, çıkan/giren oyuncu karşılaştırması ve yatay kaydırılabilir yedek kulübesi. Altı özellik, puan, doğal mevkiler, enerji ve hedef mevki uyumu birlikte gösterilir. Seçim onay düğmesine kadar uygulanmaz; küçük ekranda karşılaştırma sahanın altına geçer.

Lig kariyeri kayıtları: aynı tarayıcıda 30 bağımsız otomatik kayıt yuvası. Menüde kulüp, sezon, hafta ve son kayıt zamanı görünür; kayıt yüklenebilir veya onayla silinebilir. Yeni kariyer dolu bir yuva seçiliyken boş yuva varsa onu kullanır; tümü doluysa seçilen yuvanın üzerine yazmadan önce onay ister. Eski tek kariyer 1. yuvaya aktarılır. Fikstür eşleşmeleri yeniden üretilir, yalnızca oynanan skorlar saklanarak 30 kariyerin depolama yükü azaltılır. Depolama hatası önceki kayıtları değiştirmez. Kayıtlar cihaza/tarayıcıya özeldir. Test: `tests/league-slots.cjs`.

### Teknik direktör kariyeri

Kariyer menüsünden **Teknik direktör kariyeri** seç, adını ve kulübünü gir. 30 kayıt yuvası, iki kademeli ligler ve yükselme/düşmeyle devam eder. Kulüp merkezinde **Transferler, Yönetim, Gelişim** sekmeleri açılır. Bu özgün, FC tarzından esinlenen oyun modudur; FC27'nin bütün sistemlerinin birebir kopyası değildir.

Transfer bütçesi, haftalık maaş sınırı, oyuncu satın alma/satma, sözleşme yenileme ve imza ücretleri vardır. Ücretler/reel kontratlar resmî veri olarak sunulmaz; oyun için genel puandan hesaplanır. İlk üç hafta ve sezon ortasındaki üç haftalık pencere transfer dönemidir. İşlemler maç dışında yapılır. Satıcı ve alıcı kadroları kariyer içinde güncellenir; normal/çevrimiçi maçların kadroları etkilenmez. Kadro en az 11, en çok 60 oyuncu ve en az bir kaleci olarak korunur.

Her lig haftası 550.000 € oyun geliri eklenir, haftalık maaşlar düşülür. Bütçe sıfırın altına inmez. Yönetimin hedefi kulübün başlangıç gücüne göre lig sırasıdır; maçlar ve sezon sonucu yönetim güvenini etkiler. Dört antrenman odağı oyunculara her tamamlanan haftada 10 gelişim puanı verir. 100 puanda genel puan (95'e kadar) ve çalışılan özellikler yükselir. Transfer/gelişim oyuncuları gerçek maç, santra, yeniden başlatma ve değişiklik ekranında kullanılır.

Yeni yılda sözleşmeler bir yıl azalır, bitebilen kontratlar kadrodan ayrılır; minimum kadroyu bozacak bitişler bir yıl uzatılır. Kulübe 15 M € yeni sezon bütçesi gelir. Menajer, kadro, sözleşmeler, gelişim, finans, transfer geçmişi ve haberler aynı kayıt yuvasında korunur. Maçlarını kontrol edebilir, yapay zekâyı izleyebilir veya maç sonuna simüle edebilirsin.

Transfer görüşmesi iki aşamalıdır: önce kulüple bedel, ardından oyuncuyla haftalık ücret ve 1–5 yıllık sözleşme konuşulur. Düşük teklifler karşı teklif alır; üç reddedilen kulüp teklifi görüşmeyi bitirir. Para ve kadro ancak iki taraf kabul edince değişir. Özgün toplantı görseli ve diyalog ekranı kullanılır. Bir sezonluk kiralanan oyuncu sezon sonunda kaynak kulübüne geri döner; kiralık oyuncu satılamaz veya sözleşmesi uzatılamaz.

Hücum, savunma ve pas antrenörleri ile izleme uzmanı üç seviyeye kadar geliştirilebilir. İşe alım bedeli bütçeden, haftalık personel ücreti maaş giderinden düşülür. Antrenörler ilgili çalışma gelişimini hızlandırır; izleme uzmanı kulübün pazarlık talebini düşürür. Oyuncu araması isim, mevki uyumu, genel puan ve bedel filtrelerini kullanır. En fazla 30 oyunculuk izleme listesi, personel ve kiralamalar kariyer kaydında saklanır.

Bu sürüm Avrupa/ülke kupaları, sakatlık/moral sistemi veya kulüp değiştirerek iş arama/kovulma sistemi içermez. Kontrol: `tests/manager-career.cjs`, `tests/manager-negotiation.cjs`.

### Transfer fiyat danışmanı

Görüşme odasında tahmini piyasa değeri, önerilen ilk teklif, makul bedel aralığı, haftalık maaş, imza ücreti ve toplam başlangıç gideri gösterilir. Öneri mevcut bütçe ve maaş sınırına göre kontrol edilir; kaynak yetmiyorsa uygulama düğmesi kapanır. Öneriyi kullanmak sadece alanı doldurur; işlem teklif sunulmadan gerçekleşmez. Yazılan bedel/maaş için düşük teklif, fazla ödeme ve bütçe geri bildirimi anlık güncellenir. Kiralama ve yenileme hesapları ayrı uygulanır. Satış ekranı mevcut alıcı teklifini, piyasa tahminini ve maaş tasarrufunu gösterir. Bunlar resmî FC27 fiyatları değildir; oyunun ekonomik modelinden hesaplanır. Kontrol: `tests/manager-price-advice.cjs`.

### Genel hata incelemesi ve taktik kayıtları

Kadro sekmesinde 11 diziliş ve dengeli/hücum/savunma yaklaşımı seçilir. Her kariyerin seçimi kendi kayıt yuvasında tutulur; maç, yeniden başlatma, maç içi değişiklik ve sonraki sezon boyunca korunur. Eski kayıtlarda 4-3-3/dengeli varsayılanı kullanılır. Lig ve play-off simülasyonları menüdeyken de transfer/gelişim kadrolarını ve seçili kulübün kariyer dizilişini hesaba katar; normal maç kadroları değişmez.

Çevrimiçi korner/taç hedefi artık sahadan seçilip sunucuya gönderilir; gelen kareler seçimi yeni duran top başlayana kadar korur. Pencere odağı kaybolduğunda ortak maç duraklatılmaz, yüklenen aksiyon güvenli iptal edilir. Tek oyunculuda otomatik duraklatma devam eder. Sunucunun gelen komut tamponu dolduğunda son bırakma komutu kaybolmaz. WebSocket kontrol kuyruğu HTTP yedeği gibi sınırlandırılır; uzun süre biriken eski aksiyonlar oynatılmaz. Duraklatılmış maça yeniden bağlanma ilk karede duraklatan oyuncuyu ve kalan süreyi gösterir.

Kadro atama önbelleği 256 girdiye sınırlandırıldı. Transfer sonrası eski arama sonucu farklı oyuncu seçemez; satın alınan oyuncu izleme listesinden çıkarılır. Dengeli antrenmanda izleme uzmanı oyuncu gelişimini artırmaz; yalnızca antrenör seviyeleri sayılır. Sözleşmesi biten oyuncunun eski gelişim kaydı temizlenir.

Tüm testler: `python3 tools/check_game.py`. Tek komutlu güncelleme bütün testleri kurulumdan önce çalıştırır. GitHub push/PR kontrolü Node 18 ve 22 üzerinde aynı paketi çalıştırır; Pages yayını ayrıca testleri geçmek zorundadır. `tests/audit-regressions.cjs`, `tests/league-tactics.cjs` ve `tests/engine-stress.cjs` yeni regresyonları kapsar. Stres kontrolü altı senaryoda 14.400 sunucu adımı, iki maç boyutu, eşzamanlı aksiyonlar, sonlu fizik, kadro sahipliği ve enerji sınırlarını denetler. Bunlar otomatik kontrollerdir; gerçek cihaz ve internet gecikmesi altında kullanıcı deneyimi ayrıca denenmelidir.

### En güçlü ilk 11 · milli takımlar ve kulüpler

Hızlı maçtaki **En güçlü ilk 11** düğmesi, iki takıma ayrı ayrı 11 dizilişi karşılaştırır. Her dizilişte benzersiz oyuncuları genel puan eksi mevki uyumsuzluğu toplamını en yüksek yapacak şekilde atar; ardından en iyi toplamı seçer. Kaleci kalede kalır. Sonuç ilk 11, diziliş ve ortalama puanla gösterilir; gerçek maç ve santralara uygulanır. 5'e 5'te altı düzenle aynı seçim yapılır. Manuel diziliş seçimi kullanılmaya devam eder. Çevrimiçi teklif kadroları sunucunun sabit maç düzenine göre en güçlü oyuncuları seçer; bu düğme çevrimiçi maçta devre dışıdır.

Kariyerin Kadro sekmesindeki öneri, transfer/gelişim dahil kendi kariyer havuzundan hesaplanır; seçilen diziliş o kayıt yuvasına kaydedilir. Kulüp oyuncuları başka kulüplere taşınmaz. 48 milli takımın oyun havuzu ise incelenmiş kulüp kaynaklarındaki ülke bilgisi ve mevcut milli takım oyuncu kimlikleriyle genişletildi: 415 ek oyuncu kaydı, toplam 8.560 takım-oyuncu kaydı. Hakan Çalhanoğlu, Mbappé, Musiala ve Alisson gibi mevcut kulüp verisindeki eksik milli takım oyuncuları kullanılabilir. Havuz resmî çağrı veya gerçek maç kadrosu değildir; sakatlık ve güncel milli takım seçimini modellemez. Puanlar mevcut FC26/tahmini oyun verileridir.

Havuz üretimi: `python3 tools/build_national_pool.py`; temel kadroları yeniden ürettikten sonra bu komutu da çalıştır. Kaynak ve ek kayıt sayısı `roster-source/manifest.json` içindeki `nationalGamePool` alanında tutulur. Kontrol: `tests/best-lineups.cjs`.

Türkiye ek kadro: TFF 2026 geniş kadrosunda doğrulanan Ersin Destanoğlu (73), Ahmetcan Kaplan (75) ve Yusuf Akçiçek (73), kaynak veride eksik oldukları için tahmini oyun puanlarıyla eklendi. Mustafa Eskihellaç ve Semih Kılıçsoy mevcut puanlarıyla havuza dahil edildi. Tahmini puanlar resmî FC27 puanı değildir. Kaynak: `roster-source/national-additions.json`. Toplam oyun kadro kaydı 8.565 oldu.
