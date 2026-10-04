#!/usr/bin/env python3
"""Enable the authoritative match service without replacing TLS or other vhosts."""
import argparse,hashlib,json,os,re,shutil,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path

def nginx_online(text):
    block='''    # Mini Saha online begin
    location /online/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 60s;
        client_max_body_size 8k;
        access_log off;
    }
    # Mini Saha online end'''
    pattern=r'    # Mini Saha online begin[\s\S]*?    # Mini Saha online end'
    if re.search(pattern,text):return re.sub(pattern,lambda m:block,text)
    if re.search(r'location\s+[^\n{]*/online',text):raise RuntimeError('Mevcut /online/ ayarı bu kuruluma ait değil.')
    root='root /var/www/minisaha/current;'
    if text.count(root)!=1:raise RuntimeError('Mini Saha site kökü tekil olarak bulunamadı; yapılandırma değiştirilmedi.')
    return text.replace(root,root+'\n'+block,1)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('domain');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    domain=args.domain.lower().rstrip('.')
    if not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}',domain):sys.exit('Geçerli tam alan adı gerekli.')
    if os.geteuid()!=0:sys.exit('sudo ile çalıştırın.')
    repo=Path(__file__).resolve().parents[1]
    for line in (repo/'SHA256SUMS').read_text().splitlines():
        digest,name=line.split('  ',1)
        if hashlib.sha256((repo/name).read_bytes()).hexdigest()!=digest:sys.exit('Dosya doğrulaması başarısız: '+name)
    node=shutil.which('node')
    if not node or int(subprocess.check_output([node,'-p','process.versions.node.split(".")[0]'],text=True))<18:sys.exit('Node.js 18+ gerekli: sudo apt update && sudo apt install -y nodejs')
    config=Path('/etc/nginx/sites-available/minisaha.conf');unit=Path('/etc/systemd/system/minisaha-online.service')
    old_config=config.read_text()
    if '# Managed by Mini Saha installer: '+domain not in old_config:sys.exit('Bu alan adına ait Mini Saha kurulumu bulunamadı.')
    new_config=nginx_online(old_config)
    old_unit=unit.read_text() if unit.exists() else None
    if old_unit and '# Managed by Mini Saha online' not in old_unit:sys.exit('Servis adı başka bir kuruluma ait.')
    subprocess.run(['nginx','-t'],check=True)
    if args.check:print('Çevrimiçi servis kurulumu uygun.');return
    base=Path('/var/lib/minisaha-online');base.mkdir(exist_ok=True)
    current=base/'current'
    if current.exists() and not current.is_symlink():sys.exit('current başka bir kuruluma ait.')
    previous=os.readlink(current) if current.is_symlink() else None
    release=Path(tempfile.mkdtemp(prefix='release-',dir=base));shutil.copytree(repo/'server',release/'server')
    (release/'public/assets').mkdir(parents=True);shutil.copy2(repo/'public/index.html',release/'public/index.html')
    for p in (repo/'public/assets').glob('rosters-*.js'):shutil.copy2(p,release/'public/assets'/p.name)
    for p in [release,*release.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
    tmp=base/'pending';tmp.unlink(missing_ok=True);tmp.symlink_to(release);tmp.replace(current)
    origin=('https://' if 'ssl_certificate' in old_config else 'http://')+domain
    try:
        unit.write_text(f'''# Managed by Mini Saha online
[Unit]
Description=Mini Saha online matches
After=network.target
[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/lib/minisaha-online/current
ExecStart={node} /var/lib/minisaha-online/current/server/server.cjs
Environment=PUBLIC_ORIGIN={origin}
Environment=PORT=8787
Environment=MINISAHA_VOICE_PYTHON=/var/lib/minisaha-voice/venv/bin/python
Environment=MINISAHA_VOICE_MODEL=/var/lib/minisaha-voice/tr_TR-dfki-medium.onnx
Environment=MINISAHA_VOICE_CACHE=/var/cache/minisaha-voice
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/cache/minisaha-voice
[Install]
WantedBy=multi-user.target
''')
        config.write_text(new_config);subprocess.run(['nginx','-t'],check=True)
        subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','enable','--now','minisaha-online'],check=True);subprocess.run(['systemctl','restart','minisaha-online'],check=True)
        healthy=False
        for _ in range(100):
            try:
                health=json.load(urllib.request.urlopen('http://127.0.0.1:8787/online/health',timeout=1))
                if health.get('version')==3 and health.get('voiceReady'):healthy=True;break
            except Exception:pass
            time.sleep(.2)
        if not healthy:raise RuntimeError('Çevrimiçi servis başlatılamadı.')
        subprocess.run(['nginx','-s','reload'],check=True)
    except Exception:
        config.write_text(old_config)
        if old_unit:unit.write_text(old_unit)
        else:subprocess.run(['systemctl','disable','--now','minisaha-online'],check=False);unit.unlink(missing_ok=True)
        if previous:tmp.symlink_to(previous);tmp.replace(current)
        else:current.unlink(missing_ok=True)
        subprocess.run(['systemctl','daemon-reload'],check=False)
        if old_unit:subprocess.run(['systemctl','restart','minisaha-online'],check=False)
        raise
    print('Eşleştirme servisi hazır: '+origin+'/online/health')
    print('İki oyuncu Rastgele eşleşme veya Host ol / Hosta katıl ile bağlanıp teklifi kabul etsin.')
if __name__=='__main__':main()
