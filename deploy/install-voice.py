#!/usr/bin/env python3
"""Install the local Turkish Piper voice used for new lines and player names."""
import os,subprocess,sys,urllib.request
from pathlib import Path
if os.geteuid()!=0:sys.exit('sudo ile çalıştırın.')
base=Path('/var/lib/minisaha-voice');base.mkdir(exist_ok=True);venv=base/'venv';python=venv/'bin/python'
subprocess.run(['apt-get','install','-y','python3-venv','ffmpeg'],check=True)
if not python.exists():subprocess.run([sys.executable,'-m','venv',str(venv)],check=True)
subprocess.run([str(python),'-m','pip','install','piper-tts==1.8.0'],check=True)
model=base/'tr_TR-dfki-medium.onnx'
for name in [model.name,model.name+'.json']:
 target=base/name
 if not target.exists():
  temp=base/(name+'.download');urllib.request.urlretrieve('https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/tr/tr_TR/dfki/medium/'+name,temp);temp.replace(target)
 target.chmod(0o644)
subprocess.run([str(python),'-c','from piper import PiperVoice; import sys; PiperVoice.load(sys.argv[1]); print("Spiker modeli hazır.")',str(model)],check=True)
cache=Path('/var/cache/minisaha-voice');cache.mkdir(exist_ok=True);subprocess.run(['chown','www-data:www-data',str(cache)],check=True)
