# Mini Saha

Telefon ve bilgisayarda çalışan HTML futbol oyunu. 5'e 5 / 11'e 11, yapay zekâ, otomatik kaleci, klavye tuş atamaları ve gömülü Türkçe erkek spiker içerir. Bu sürüm tek oyunculudur; internetten yayımlamak çok oyunculu maç özelliği eklemez.

## Dosyalar

- `public/index.html`: oyun.
- `public/assets/voice-*.js`: 1.776 gömülü ses kaydı. Tamamı oyunla birlikte yayımlanmalıdır.
- `deploy/install.py`: mevcut Debian/Ubuntu Nginx sunucusuna ayrı site kurulumu ve güncelleme.
- `SHA256SUMS`: yayımlanan dosyaların bütünlük kontrolü.

Sesler bu repodan yüklenir; ziyaretçinin cihazında erkek ses kurulması gerekmez. Oyun ayarları tarayıcıda tutulur; farklı alan adına geçince eski alanın kayıtları otomatik taşınmaz.

## Server.pro VPS / Nginx kurulumu

Hedef IPv4: **43.226.0.124**. deSEC ekranında `minisaha` A kaydı bu IP'ye yönlendirilmiştir. Tam alan adı henüz bildirilmedi; aşağıdaki `TAM_ALAN_ADI` yerine deSEC'teki ana alanın başına `minisaha.` eklenmiş adresi yazın.

Bu kurulum Linux terminali ve sudo yetkisi olan, Nginx'in hâlihazırda çalıştığı VPS içindir. Sadece oyun sunucusu paneli, Apache, Caddy veya panelin yönettiği farklı bir web düzeni varsa önce o düzene uygun sanal sunucu ayarı gerekir. Script farklı web sunucularını kaldırmaz ve paket kurmaz.

```bash
git clone https://github.com/pisanadam/Minisaha.git
cd Minisaha
sudo python3 deploy/install.py TAM_ALAN_ADI --check
sudo python3 deploy/install.py TAM_ALAN_ADI
```

Script yalnızca `/var/www/minisaha/` ve `/etc/nginx/sites-available/minisaha.conf` ile buna ait etkinleştirme bağlantısını kullanır. Varsayılan siteye ve diğer alan adlarına dokunmaz. Alan adı zaten kullanılıyorsa veya hedef başka bir kuruluma aitse durur. Yeni sürüm ayrı dizine kopyalanır, bağlantı atomik değiştirilir. Nginx yapılandırma testi başarısız olursa önceki bağlantı geri yüklenir. Eski sürümler korunur.

Nginx aynı IP'deki siteleri `server_name` ile ayırır. deSEC'teki diğer A kayıtları ve NS kayıtları korunmalıdır. Ağ güvenlik duvarında HTTP için 80, HTTPS için 443 erişilebilir olmalıdır. Başka bir hizmetin port ayarını değiştirmeyin.

## HTTPS

DNS yayıldıktan ve HTTP üzerinden oyun açıldıktan sonra, sunucuda Certbot'un Nginx eklentisi kuruluysa:

```bash
sudo certbot --nginx -d TAM_ALAN_ADI
```

Sunucuda başka sertifika yöneticisi/panel varsa onun alan adına özel HTTPS seçeneğini kullanın. Güncelleme scripti mevcut Mini Saha Nginx dosyasını yeniden yazmaz; sertifika ayarları korunur.

## Sonraki güncellemeler

GitHub'a yüklemek sunucudaki dosyaları kendiliğinden güncellemez. Sunucudaki repo klasöründe:

```bash
git pull --ff-only
sudo python3 deploy/install.py TAM_ALAN_ADI
```

Sunucuda açılışı doğrulayın:

```bash
curl -I -H 'Host: TAM_ALAN_ADI' http://127.0.0.1/
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
