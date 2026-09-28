#!/usr/bin/env python3
"""Mevcut Debian/Ubuntu Nginx sunucusuna bağımsız Mini Saha sitesi kurar."""
import argparse
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
parser.add_argument('domain', help='Tam alan adı, örnek: minisaha.ornek.dedyn.io')
parser.add_argument('--check', action='store_true', help='Değişiklik yapmadan hazırlığı kontrol et')
args = parser.parse_args()
domain = args.domain.lower().rstrip('.')
if len(domain) > 253 or not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}', domain):
    fail('Geçerli tam alan adı gerekli; http:// veya / eklemeyin.')
repo = Path(__file__).resolve().parents[1]
source = repo / 'public'
if not (source / 'index.html').is_file():
    fail('public/index.html bulunamadı.')
for line in (repo / 'SHA256SUMS').read_text().splitlines():
    digest, name = line.split('  ', 1)
    if hashlib.sha256((repo / name).read_bytes()).hexdigest() != digest:
        fail('Dosya doğrulaması başarısız: ' + name)
if os.geteuid() != 0:
    fail('Nginx kontrolü için sudo python3 deploy/install.py TAM_ALAN_ADI kullanın.')
if not shutil.which('nginx'):
    fail('Nginx kurulu değil. Önce mevcut web sunucusu/panel türünü belirleyin; otomatik paket kurulmadı.')
check = subprocess.run(['nginx', '-T'], capture_output=True, text=True)
if check.returncode:
    fail('Mevcut Nginx yapılandırması hatalı; değişiklik yapılmadı. sudo nginx -t ile inceleyin.')
if not Path('/etc/nginx/sites-enabled').is_dir() or not re.search(r'include\s+/etc/nginx/sites-enabled/\*\s*;', check.stdout):
    fail('Desteklenen sites-enabled düzeni bulunamadı. Panelinize ait alan adı yapılandırmasını kullanın.')
config = Path('/etc/nginx/sites-available/minisaha.conf')
enabled = Path('/etc/nginx/sites-enabled/minisaha.conf')
base = Path('/var/www/minisaha')
marker = '# Managed by Mini Saha installer: ' + domain
updating = config.exists()
if updating:
    if marker not in config.read_text():
        fail('minisaha.conf başka bir kurulum/alan adına ait; üzerine yazılmadı.')
    if not enabled.is_symlink() or enabled.resolve() != config.resolve():
        fail('Mevcut Mini Saha etkinleştirme bağlantısı beklenenden farklı.')
else:
    if enabled.exists() or enabled.is_symlink() or base.exists():
        fail('Mini Saha hedeflerinden biri zaten var; üzerine yazılmadı.')
    for names in re.findall(r'\bserver_name\s+([^;]+);', check.stdout):
        if domain in names.split():
            fail('Bu alan adı zaten Nginx içinde tanımlı; mevcut site değiştirilmedi.')
if args.check:
    print('Dosyalar ve Nginx düzeni uygun. Hedef: http://' + domain)
    sys.exit(0)
base.mkdir(parents=True, exist_ok=True)
releases = base / 'releases'
releases.mkdir(exist_ok=True)
release = Path(tempfile.mkdtemp(prefix=time.strftime('%Y%m%d-%H%M%S-'), dir=releases))
shutil.copytree(source, release, dirs_exist_ok=True)
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
    root /var/www/minisaha/current;
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
print('Diğer sitelerin yapılandırması değiştirilmedi. HTTPS için README adımlarını uygulayın.')
