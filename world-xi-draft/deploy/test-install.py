#!/usr/bin/env python3
"""Exercise install/update/rollback in a temporary fake Nginx environment."""
from pathlib import Path
import hashlib
import os
import subprocess
import tempfile

source = Path(__file__).with_name('install.py').read_text()
with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    project = root / 'project'
    (project / 'deploy').mkdir(parents=True)
    (project / 'index.html').write_text('<html>first</html>')
    def digest():
        (project / 'SHA256SUMS').write_text(hashlib.sha256((project / 'index.html').read_bytes()).hexdigest() + '  index.html\n')
    digest()
    etc = root / 'etc/nginx'
    (etc / 'sites-available').mkdir(parents=True)
    (etc / 'sites-enabled').mkdir()
    (etc / 'sites-available/other.conf').write_text('other existing site')
    bins = root / 'bin'
    bins.mkdir()
    nginx = bins / 'nginx'
    nginx.write_text('#!/usr/bin/env python3\nimport os,sys\nif "-T" in sys.argv: print("include /etc/nginx/sites-enabled/*; server_name other.example.com;")\nif "-t" in sys.argv and os.environ.get("FAIL_TEST"): sys.exit(1)\n')
    nginx.chmod(0o755)
    adjusted = source.replace('/run/world-xi-draft-install.lock', str(root / 'install.lock')).replace('/etc/nginx/', str(etc) + '/').replace('/var/www/world-xi-draft', str(root / 'www'))
    # The fake -T includes the corresponding test directory.
    nginx.write_text(nginx.read_text().replace('/etc/nginx/', str(etc) + '/'))
    (project / 'deploy/install.py').write_text(adjusted)
    env = dict(os.environ, PATH=str(bins) + ':' + os.environ['PATH'])
    def run(*flags, fail=False):
        result = subprocess.run(['python3', str(project / 'deploy/install.py'), 'draft.pisankus.dedyn.io', *flags], env=env, capture_output=True, text=True)
        assert bool(result.returncode) == fail, result.stdout + result.stderr
    run('--check')
    assert not (root / 'www').exists()
    run()
    current = root / 'www/current'
    first = current.resolve()
    config = etc / 'sites-available/world-xi-draft.conf'
    config.write_text(config.read_text() + '\n# TLS custom settings retained\n')
    saved_config = config.read_text()
    (project / 'index.html').write_text('<html>second</html>')
    digest()
    run()
    second = current.resolve()
    assert second != first and (current / 'index.html').read_text() == '<html>second</html>'
    assert config.read_text() == saved_config
    env['FAIL_TEST'] = '1'
    run(fail=True)
    assert current.resolve() == second
    del env['FAIL_TEST']
    config.write_text('another installer owns this file')
    run(fail=True)
    assert current.resolve() == second
    assert (etc / 'sites-available/other.conf').read_text() == 'other existing site'
    print('PASS: dry run, initial install, atomic update, preserved TLS settings, rollback, conflicting ownership, untouched other site.')
