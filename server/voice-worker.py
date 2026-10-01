#!/usr/bin/env python3
"""One CPU thread; speech runs outside the match physics process."""
import base64,io,json,os,subprocess,sys,wave
import onnxruntime as ort
from piper import PiperVoice
from piper.config import PiperConfig
opts=ort.SessionOptions();opts.intra_op_num_threads=1;opts.inter_op_num_threads=1
model=os.environ['MINISAHA_VOICE_MODEL']
with open(model+'.json',encoding='utf8') as f:config=PiperConfig.from_dict(json.load(f))
voice=PiperVoice(session=ort.InferenceSession(model,sess_options=opts,providers=['CPUExecutionProvider']),config=config)
print(json.dumps({'ready':True}),flush=True)
for line in sys.stdin:
 try:
  data=json.loads(line);audio=io.BytesIO()
  with wave.open(audio,'wb') as wav:voice.synthesize_wav(data['text'],wav)
  encoded=subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i','pipe:0','-codec:a','libmp3lame','-b:a','48k','-f','mp3','pipe:1'],input=audio.getvalue(),capture_output=True,check=True,timeout=15).stdout
  print(json.dumps({'id':data['id'],'audio':base64.b64encode(encoded).decode()}),flush=True)
 except Exception as e:print(json.dumps({'id':data.get('id'),'error':str(e)}),flush=True)
