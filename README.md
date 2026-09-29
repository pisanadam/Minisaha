# Mini Saha

Telefon ve bilgisayarda çalışan HTML futbol oyunu. 5'e 5 / 11'e 11, yapay zekâ, otomatik kaleci, klavye tuş atamaları ve gömülü Türkçe erkek spiker içerir. Tek oyunculu maçlara ek olarak sunucu servisi kurulduğunda iki kişi çevrimiçi karşılaşabilir.

## Çevrimiçi eşleştirme

Ana menüde takımını ve **5’e 5 / 11’e 11** modunu seç, **Eşleştirmeye gir** düğmesine bas. Aynı oyuncu sayısını seçen iki kişi sırayla eşleşir; tek kişi varsa rakip beklenir. Her oyuncu kendi takımını ve seçili futbolcusunu yönetir. Takım arkadaşları pozisyon alır; rakibin top taşıyan oyuncusunun yerine yapay zekâ oynamaz. Her iki ekran da kendi takımını soldan sağa hücum ederken gösterir.

Maçlar üç dakikadır. Beraberlikte uzatma, ardından iki taraf için kadro gücüne bağlı otomatik penaltılar vardır. Çevrimiçi maç duraklatılamaz veya maç sonuna simüle edilemez. Sıradan çıkılabilir; maçtan ayrılan/kopan rakip diğer oyuncuya bildirilir. Bağlantı kısa süreli koparsa akış yeniden bağlanabilir; 8 saniye boyunca bağlantısı gelmeyen oyuncunun odası kapanır. Maçlar kalıcı sunucu veritabanına kaydedilmez; servis yeniden başlatılırsa aktif maçlar sona erer.

Kurulum (mevcut Server.pro / Nginx / HTTPS kurulumu üstüne):

```bash
cd ~/Minisaha
git pull --ff-only
sudo apt update && sudo apt install -y nodejs
sudo python3 deploy/install.py minisaha.pisankus.dedyn.io
sudo python3 deploy/install-online.py minisaha.pisankus.dedyn.io
```

Sonraki güncellemelerde iki Python kurulum komutunu da çalıştırın. Node.js 18+ gerekir; npm paketi gerekmez. Kurulum mevcut Mini Saha TLS/Certbot ayarlarını ve diğer siteleri korur, yalnızca Mini Saha vhost’una `/online/` yolu ekler. Servis `www-data` ile `127.0.0.1:8787` adresinde çalışır; bu portu internete açmayın. `systemd` servisi sunucu açılışında başlar ve hata durumunda yeniden başlatılır. Sağlık adresi: `https://minisaha.pisankus.dedyn.io/online/health`.

- Servis durumu: `sudo systemctl status minisaha-online`
- Hata kaydı: `sudo journalctl -u minisaha-online -n 50 --no-pager`
- Değişiklik yapmadan kontrol: `sudo python3 deploy/install-online.py minisaha.pisankus.dedyn.io --check`

Tek bir yetkili sunucu 60 Hz fizik hesabı yapar ve yaklaşık 20 Hz durum yayınlar; istemciler yalnızca yön ve tuş komutları gönderir. İstemci skor/konum belirleyemez. Oturum belirteçleri rastgele üretilir, eski sıra numaraları ve geçersiz girdiler reddedilir. Kuyruklar oyuncu sayısına göre ayrıdır. Varsayılan sınır sekiz eşzamanlı maçtır. SSE ile durum akışı ve aynı kökenden HTTP komutları kullanılır; Nginx akış tamponlaması kapalıdır. Bu sürüm oda kodu, arkadaş daveti, hesap veya dereceli sıralama içermez.

Yerel doğrulama: `node tests/online.cjs` iki gerçek HTTP istemcisini eşleştirir; hareket, pas, ortak durum, iki farklı kuyruk, ayrılma, zaman aşımı, iki tarafın şutu ve maç sonunu doğrular. `python3 tests/online-deploy.py` TLS korumasını ve tekrar kurulumu sınar. Sunucuda kurulum yapılmadan GitHub Pages tek başına eşleştirme servisini çalıştıramaz.

## Kadrolar ve maç simülasyonu (28.09.2026)

- Seçilebilir **162 takımın tamamı**, toplam **4.641 takım-oyuncu kaydı**: kulüpler için 2026–27, millî takımlar için 2026 kadroları. Bu sayı benzersiz futbolcu sayısı değildir; bir futbolcu kulübünde ve millî takımında bulunabilir.
- Kaynak anlık görüntüleri ve takım kimlikleri `roster-source/` içinde. ESPN takım kadroları esas alındı; Gençlerbirliği 28 kişilik tescil listesi ve kulüp sayfasıyla ayrıca düzeltildi. Millî takım listeleri 2026 oyuncu havuzudur; her maçın birebir çağrı listesi olduğu iddia edilmez.
- Eski rastgele isim havuzu, başka kulüpten isim aktaran eşleştirme ve tarayıcıdaki FC26 kadro önbelleği kaldırıldı. Kadrolar ağ bağlantısı gerekmeden yüklenir.
- İlk 11 ve ilk 5, bütün kadro içinden mevkiler ve puanlar birlikte değerlendirilerek seçilir. Kadro ekranı gerçek sahadaki oyuncuları ve kalan bütün yedekleri gösterir; takım değişimi önceki oyuncuları taşımaz.
- **3.453 kaydın puanları FC26 verisidir**, kalan **1.188 kayıt oyun içi tahminidir** ve ekranda belirtilir. Resmî FC27 reytingi iddiası yoktur. Güncel kulüp üyeliği eski FC26 CSV'sinden alınmaz. Kaynağın yalnızca genel D/M/F mevkisi verdiği oyuncuda ayrıntılı doğal mevki uydurulmaz; uygun mevki ailesi içinde dizilişe atanır.
- Duraklatma menüsünde **Maçı simüle et**: iki takımı aynı yapay zekâ yönetir; **Kontrolü geri al** ile oyuna dönülür.
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
