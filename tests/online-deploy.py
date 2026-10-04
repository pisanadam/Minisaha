import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('installer',Path(__file__).resolve().parents[1]/'deploy/install-online.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
config='''# Managed by Mini Saha installer: minisaha.pisankus.dedyn.io
server {
 root /var/www/minisaha/current;
 listen 443 ssl;
 ssl_certificate /etc/letsencrypt/live/minisaha/fullchain.pem;
 location / { try_files $uri =404; }
}
server { listen 80; return 301 https://$host$request_uri; }
'''
out=m.nginx_online(config)
assert 'ssl_certificate /etc/letsencrypt/live/minisaha/fullchain.pem;' in out
assert 'server { listen 80; return 301 https://$host$request_uri; }' in out
assert out.count('location /online/')==1
assert m.nginx_online(out)==out
assert 'proxy_buffering off;' in out
for bad in ['server {}',config+'\nlocation /online/ {}']:
 try:m.nginx_online(bad)
 except RuntimeError:pass
 else:raise AssertionError('unmanaged configuration must be rejected')
print('PASS online install preserves TLS/redirects, is idempotent, rejects conflicting location')
