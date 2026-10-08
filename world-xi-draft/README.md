# World XI Draft

Gerçek oyuncu fotoğrafları dosyaya gömülü, tek HTML futbol kadrosu kurma oyunu.
27 kura, her kuradan tek seçim, mevki kuralları ve hafta hafta Şampiyonlar Ligi simülasyonu.
Boş mevkiler boş kalır. Kayıtlar oyuncunun tarayıcısındadır.

## Server.pro + deSEC: tek komut

Mevcut Ubuntu/Nginx sunucusunun **Shell** bölümünde çalıştırın:

```bash
curl -fsSL https://raw.githubusercontent.com/pisanadam/Minisaha/main/world-xi-draft/deploy/update.sh -o /tmp/world-xi-draft-update.sh && bash /tmp/world-xi-draft-update.sh draft.pisankus.dedyn.io --desec --https
```

İlk çalıştırma kurar; sonraki çalıştırmalar yeni GitHub sürümünü yayınlar.
Nginx mevcut olmalı. `git` yoksa `sudo apt install -y git` çalıştırın.

- deSEC A kaydı: `pisankus.dedyn.io` alanında **draft → 43.226.0.124**, TTL 3600.
- DNS zaten doğruysa token sorulmaz. Yoksa deSEC API token yalnızca sunucunun Shell ekranında gizli istenir ve kaydedilmez. Tokenı sohbet veya GitHub'a yazmayın.
- Başka hedefe ait mevcut `draft` A/AAAA/CNAME kayıtları otomatik değiştirilmez.
- DNS yayılması gecikirse oyun dosyaları kurulabilir; HTTPS için aynı komutu daha sonra tekrar çalıştırın.
- HTTPS ilk kurulumunda Certbot gerekli hesap/e-posta ve sözleşme sorularını Shell içinde gösterir.
- Sonraki güncellemeler HTTPS ayarlarını korur, yalnızca yeni HTML sürümüne geçer.

Token kullanmak istemezseniz A kaydını deSEC panelinden elle ekleyip aynı komuttan `--desec` seçeneğini kaldırın.

## Ayrı yayın hedefleri

- Site: `draft.pisankus.dedyn.io`
- Nginx: `/etc/nginx/sites-available/world-xi-draft.conf`
- Oyun: `/var/www/world-xi-draft/current/index.html`
- Sürümler: `/var/www/world-xi-draft/releases/`

Kurulum `Minisaha` ve diğer oyunların servislerini veya yapılandırmalarını güncellemez.
Hedef dosya/yapılandırma başka kurulumdan geliyorsa durur. Dosya hash'i ve Nginx yapılandırması kontrol edilir.
Yeni sürüm sembolik bağlantıyla etkinleştirilir; Nginx test/yükleme hatasında önceki bağlantı geri gelir.
Eski sürümler geri dönüş için saklanır.

## Yerelde çalıştırma ve kontrol

`index.html` dosyasını tarayıcıda açın; oyun için başka servis gerekmez.

```bash
node check-rules.cjs
python3 deploy/test-install.py
```
