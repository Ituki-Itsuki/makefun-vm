import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';import{join}from'node:path';
function run(p,i){
const n=p.length,S=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),B=new Uint8Array(65536);
let sp=0,q=0,L=0,ip=0,pc=0,T=0;
const E=(c)=>({o:B.slice(0,L),c});
for(;;){
if(T>=1000000)return E(10);
if(pc<0||pc>=n)return E(9);
const op=p[pc];T++;
switch(op){
case 0:return E(0);
case 1:if(pc+1>=n)return E(9);if(sp>=256)return E(3);S[sp++]=(p[pc+1]<<24)>>24;pc+=2;break;
case 2:if(pc+4>=n)return E(9);if(sp>=256)return E(3);S[sp++]=p[pc+1]|p[pc+2]<<8|p[pc+3]<<16|p[pc+4]<<24;pc+=5;break;
case 3:if(sp<1)return E(2);sp--;pc++;break;
case 4:if(sp<1)return E(2);if(sp>=256)return E(3);S[sp]=S[sp-1];sp++;pc++;break;
case 5:{if(sp<2)return E(2);const t=S[sp-1];S[sp-1]=S[sp-2];S[sp-2]=t;pc++;break;}
case 6:if(sp<2)return E(2);if(sp>=256)return E(3);S[sp]=S[sp-2];sp++;pc++;break;
case 7:{if(sp<3)return E(2);const a=S[sp-3];S[sp-3]=S[sp-2];S[sp-2]=S[sp-1];S[sp-1]=a;pc++;break;}
case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
if(sp<2)return E(2);
const b=S[sp-1],a=S[sp-2];let r;
switch(op){
case 16:r=a+b;break;
case 17:r=a-b;break;
case 18:r=Math.imul(a,b);break;
case 19:if(b===0)return E(4);r=a===-2147483648&&b===-1?a:(a/b)|0;break;
case 20:if(b===0)return E(4);r=b===-1?0:a%b;break;
case 21:if(b===0)return E(4);r=Math.floor((a>>>0)/(b>>>0))|0;break;
case 22:if(b===0)return E(4);r=(a>>>0)%(b>>>0)|0;break;
case 24:r=a&b;break;
case 25:r=a|b;break;
case 26:r=a^b;break;
case 28:r=a<<(b&31);break;
case 29:r=a>>(b&31);break;
case 30:r=(a>>>(b&31))|0;break;
case 32:r=a===b?1:0;break;
case 33:r=a<b?1:0;break;
default:r=(a>>>0)<(b>>>0)?1:0;
}
S[sp-2]=r;sp--;pc++;break;}
case 23:case 27:if(sp<1)return E(2);S[sp-1]=op===23?-S[sp-1]:~S[sp-1];pc++;break;
case 48:case 49:case 50:{
if(pc+2>=n)return E(9);
const rel=((p[pc+1]|p[pc+2]<<8)<<16)>>16;
let t=op===48;
if(!t){if(sp<1)return E(2);const v=S[--sp];t=op===49?v===0:v!==0;}
pc=t?pc+3+rel:pc+3;break;}
case 51:if(pc+2>=n)return E(9);if(q>=64)return E(7);C[q++]=pc+3;pc=p[pc+1]|p[pc+2]<<8;break;
case 52:if(q===0)return E(8);pc=C[--q];break;
case 64:case 65:{
if(sp<(op===64?1:2))return E(2);
const a=S[sp-1];
if(a<0||a>=256)return E(6);
if(op===64){S[sp-1]=M[a];pc++;}else{M[a]=S[sp-2];sp-=2;pc++;}
break;}
case 80:{
if(sp<1)return E(2);
const s=String(S[sp-1]);
if(L+s.length>65536)return E(11);
for(let j=0;j<s.length;j++)B[L++]=s.charCodeAt(j);
sp--;pc++;break;}
case 81:if(sp<1)return E(2);if(L>65535)return E(11);B[L++]=S[--sp]&255;pc++;break;
case 82:if(sp>=256)return E(3);S[sp++]=ip<i.length?i[ip++]:-1;pc++;break;
case 83:if(sp<1)return E(2);return E(S[sp-1]&255);
default:return E(5);
}}}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const d of readdirSync(I).sort()){
const r=run(readFileSync(join(I,d,'program.bin')),readFileSync(join(I,d,'input.bin')));
mkdirSync(join(O,d),{recursive:true});
writeFileSync(join(O,d,'stdout.bin'),r.o);
writeFileSync(join(O,d,'exit.txt'),r.c+'\n');
}
