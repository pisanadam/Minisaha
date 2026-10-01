'use strict';
// Small bounded RFC 6455 transport; browser clients send masked, final text frames.
const crypto=require('node:crypto');
function upgrade(req,socket,head,onMessage,onClose){
 const key=req.headers['sec-websocket-key'];
 if(req.method!=='GET'||req.headers.upgrade?.toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||!/^[A-Za-z0-9+/]{22}==$/.test(key)){socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');return null;}
 const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');socket.setNoDelay(true);
 let buffer=Buffer.alloc(0),closed=false;
 function frame(op,payload){if(closed||socket.destroyed)return;const n=payload.length,header=Buffer.alloc(n<126?2:4);header[0]=0x80|op;if(n<126)header[1]=n;else{header[1]=126;header.writeUInt16BE(n,2);}if(socket.writableLength>65536){socket.destroy();return;}socket.write(Buffer.concat([header,payload]));}
 const peer={get open(){return !closed&&!socket.destroyed;},send(data){frame(1,Buffer.from(JSON.stringify(data)));},close(){if(closed)return;frame(8,Buffer.alloc(0));socket.end();closed=true;}};
 socket.on('close',()=>{closed=true;onClose(peer);});socket.on('error',()=>socket.destroy());
 function parse(chunk){
  if(closed)return;buffer=Buffer.concat([buffer,chunk]);
  while(buffer.length>=2){
   const op=buffer[0]&15,masked=buffer[1]&128;let n=buffer[1]&127,offset=2;
   if((buffer[0]&0x70)||!(buffer[0]&0x80)||!masked||![1,8,9,10].includes(op)){socket.destroy();return;}
   if(n===127){socket.destroy();return;}if(n===126){if(buffer.length<4)return;n=buffer.readUInt16BE(2);offset=4;}
   if(n>8192||(op>=8&&n>125)){socket.destroy();return;}if(buffer.length<offset+4+n)return;
   const mask=buffer.subarray(offset,offset+4),data=Buffer.from(buffer.subarray(offset+4,offset+4+n));buffer=buffer.subarray(offset+4+n);for(let i=0;i<n;i++)data[i]^=mask[i%4];
   if(op===8){peer.close();return;}if(op===9){frame(10,data);continue;}if(op===10)continue;
   try{onMessage(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)),peer);}catch{peer.send({type:'error',error:'bad-request'});}
  }
  if(buffer.length>8210)socket.destroy();
 }
 socket.on('data',parse);if(head.length)queueMicrotask(()=>parse(head));return peer;
}
module.exports={upgrade};
