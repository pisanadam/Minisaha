#!/usr/bin/env python3
"""Mevcut Debian/Ubuntu Nginx sunucusuna bağımsız World XI Draft sitesi kurar."""
import argparse
import getpass
import fcntl
import json
import socket
import urllib.request
import urllib.error
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

def fail(message):
    sys.exit(message)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('domain', help='Tam alan adı, örnek: world-xi-draft.ornek.dedyn.io')
parser.add_argument('--check', action='store_true', help='Değişiklik yapmadan hazırlığı kontrol et')
parser.add_argument('--desec', action='store_true', help='Gerekirse deSEC A kaydını oluştur; token Shell içinde gizli istenir')
parser.add_argument('--https', action='store_true', help='Certbot ile HTTPS kur; ilk kurulumda Shell içinde sorular sorar')
args = parser.parse_args()
domain = args.domain.lower().rstrip('.')
if len(domain) > 253 or not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', domain):
    fail('Geçerli tam alan adı gerekli; http:// veya / eklemeyin.')
repo = Path(__file__).resolve().parents[1]
source = repo
if not (source / 'index.html').is_file():
    fail('index.html bulunamadı.')
for line in (repo / 'SHA256SUMS').read_text().splitlines():
    digest, name = line.split('  ', 1)
    if hashlib.sha256((repo / name).read_bytes()).hexdigest() != digest:
        fail('Dosya doğrulaması başarısız: ' + name)
if os.geteuid() != 0:
    fail('Nginx kontrolü için sudo python3 deploy/install.py TAM_ALAN_ADI kullanın.')
lock_fd = os.open('/run/world-xi-draft-install.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
try:
    fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    fail('Başka bir Draft kurulumu çalışıyor; bitince tekrar deneyin.')
if not shutil.which('nginx'):
    fail('Nginx kurulu değil. Önce mevcut web sunucusu/panel türünü belirleyin; otomatik paket kurulmadı.')
check = subprocess.run(['nginx', '-T'], capture_output=True, text=True)
if check.returncode:
    fail('Mevcut Nginx yapılandırması hatalı; değişiklik yapılmadı. sudo nginx -t ile inceleyin.')
if not Path('/etc/nginx/sites-enabled').is_dir() or not re.search(r'include\s+/etc/nginx/sites-enabled/\*\s*;', check.stdout):
    fail('Desteklenen sites-enabled düzeni bulunamadı. Panelinize ait alan adı yapılandırmasını kullanın.')
config = Path('/etc/nginx/sites-available/world-xi-draft.conf')
enabled = Path('/etc/nginx/sites-enabled/world-xi-draft.conf')
base = Path('/var/www/world-xi-draft')
marker = '# Managed by World XI Draft installer: ' + domain
updating = config.exists()
if updating:
    if marker not in config.read_text():
        fail('world-xi-draft.conf başka bir kurulum/alan adına ait; üzerine yazılmadı.')
    if not enabled.is_symlink() or enabled.resolve() != config.resolve():
        fail('Mevcut World XI Draft etkinleştirme bağlantısı beklenenden farklı.')
else:
    if enabled.exists() or enabled.is_symlink() or base.exists():
        fail('World XI Draft hedeflerinden biri zaten var; üzerine yazılmadı.')
    for names in re.findall(r'\bserver_name\s+([^;]+);', check.stdout):
        if domain in names.split():
            fail('Bu alan adı zaten Nginx içinde tanımlı; mevcut site değiştirilmedi.')
if args.check:
    print('Dosyalar ve Nginx düzeni uygun. Hedef: http://' + domain)
    sys.exit(0)
# Only the new game's DNS label is considered. Existing conflicting records are preserved.
expected_ip = '43.226.0.124'
zone = 'pisankus.dedyn.io'
if args.desec:
    if domain != 'draft.' + zone:
        fail('--desec yalnızca draft.pisankus.dedyn.io için desteklenir.')
    try:
        addresses = {i[4][0] for i in socket.getaddrinfo(domain, 80, type=socket.SOCK_STREAM)}
    except socket.gaierror:
        addresses = set()
    if addresses != {expected_ip}:
        token = getpass.getpass('deSEC API token (ekranda görünmez, kaydedilmez): ')
        if not token:
            fail('Token girilmedi; değişiklik yapılmadı.')
        headers = {'Authorization': 'Token ' + token, 'Content-Type': 'application/json'}
        endpoint = 'https://desec.io/api/v1/domains/' + zone + '/rrsets/'
        try:
            with urllib.request.urlopen(urllib.request.Request(endpoint, headers=headers), timeout=30) as response:
                records = json.load(response)
            existing = [r for r in records if r['subname'] == 'draft']
            if any(r['type'] in ('AAAA', 'CNAME') or (r['type'] == 'A' and r['records'] != [expected_ip]) for r in existing):
                fail('draft DNS kaydı başka bir hedefe ait; değiştirilmedi. deSEC panelinden inceleyin.')
            if not any(r['type'] == 'A' for r in existing):
                payload = json.dumps({'subname': 'draft', 'type': 'A', 'ttl': 3600, 'records': [expected_ip]}).encode()
                with urllib.request.urlopen(urllib.request.Request(endpoint, data=payload, headers=headers, method='POST'), timeout=30):
                    pass
            print('deSEC A kaydı hazır: ' + domain + ' → ' + expected_ip)
        except urllib.error.HTTPError as error:
            fail('deSEC işlemi başarısız (HTTP ' + str(error.code) + '); token yetkisini kontrol edin.')
        finally:
            token = None
            headers.clear()
base.mkdir(parents=True, exist_ok=True)
releases = base / 'releases'
releases.mkdir(exist_ok=True)
release = Path(tempfile.mkdtemp(prefix=time.strftime('%Y%m%d-%H%M%S-'), dir=releases))
shutil.copy2(source / 'index.html', release / 'index.html')
for path in [release, *release.rglob('*')]:
    path.chmod(0o755 if path.is_dir() else 0o644)
current = base / 'current'
if current.exists() and not current.is_symlink():
    fail('current bir sembolik bağlantı değil; üzerine yazılmadı.')
previous = os.readlink(current) if current.is_symlink() else None
pending = base / ('current-' + release.name)
pending.symlink_to(release)
pending.replace(current)
created = False
try:
    if not updating:
        content = f'''{marker}
server {{
    listen 80;
    server_name {domain};
    root /var/www/world-xi-draft/current;
    index index.html;
    charset utf-8;
    add_header X-Content-Type-Options nosniff always;
    location / {{
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache";
    }}
    location /assets/ {{
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
}}
'''
        with config.open('x') as f:
            f.write(content)
        created = True
        enabled.symlink_to(config)
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['nginx', '-s', 'reload'], check=True)
except Exception:
    if created:
        enabled.unlink(missing_ok=True)
        config.unlink(missing_ok=True)
    if previous:
        pending.symlink_to(previous)
        pending.replace(current)
    else:
        current.unlink(missing_ok=True)
    fail('Yayın etkinleştirilemedi; önceki dosya bağlantısı ve site ayarı geri alındı.')
print('Yayın dosyaları kuruldu: http://' + domain)
if args.https:
    try:
        addresses = {i[4][0] for i in socket.getaddrinfo(domain, 80, type=socket.SOCK_STREAM)}
    except socket.gaierror:
        addresses = set()
    if addresses != {expected_ip}:
        fail('Oyun dosyaları kuruldu. DNS henüz ' + expected_ip + ' adresine çözülmüyor. DNS yayıldığında aynı komutu tekrar çalıştırın.')
    if 'listen 443' not in config.read_text():
        if not shutil.which('certbot'):
            subprocess.run(['apt-get', 'update'], check=True)
            subprocess.run(['apt-get', 'install', '-y', 'certbot', 'python3-certbot-nginx'], check=True)
        # Certbot asks the user for any new account/terms; no automatic agreement.
        subprocess.run(['certbot', '--nginx', '-d', domain, '--redirect'], check=True)
    subprocess.run(['nginx', '-t'], check=True)
    # Verify the certificate using the real hostname and fetch the installed game.
    with urllib.request.urlopen('https://' + domain + '/', timeout=20) as response:
        if hashlib.sha256(response.read()).hexdigest() != hashlib.sha256((source / 'index.html').read_bytes()).hexdigest():
            fail('HTTPS yanıtı yeni oyun dosyasıyla eşleşmedi; alan adı/sunucu hedefini kontrol edin.')
    print('HTTPS doğrulandı: https://' + domain)
else:
    print('HTTPS kurmak için aynı komuta --https ekleyin.')
