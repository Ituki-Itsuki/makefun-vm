import{mkdirSync as mkd,readdirSync as lsd,readFileSync as rdf,writeFileSync as wrf}from'node:fs';import{join as jn}from'node:path';
function vm(pr,ib){
const pn=pr.length,ds=new Int32Array(256),cs=new Int32Array(64),mm=new Int32Array(256),ob=new Uint8Array(65536);
let dp=0,cp=0,ol=0,iq=0,ix=0,sc=0;
const fin=(ec)=>({bytes:ob.slice(0,ol),code:ec});
for(;;){
if(sc>=1000000)return fin(10);
if(ix<0||ix>=pn)return fin(9);
const oc=pr[ix];sc++;
switch(oc){
case 0:return fin(0);
case 1:if(ix+1>=pn)return fin(9);if(dp>=256)return fin(3);ds[dp++]=(pr[ix+1]<<24)>>24;ix+=2;break;
case 2:if(ix+4>=pn)return fin(9);if(dp>=256)return fin(3);ds[dp++]=pr[ix+1]|pr[ix+2]<<8|pr[ix+3]<<16|pr[ix+4]<<24;ix+=5;break;
case 3:if(dp<1)return fin(2);dp--;ix++;break;
case 4:if(dp<1)return fin(2);if(dp>=256)return fin(3);ds[dp]=ds[dp-1];dp++;ix++;break;
case 5:{if(dp<2)return fin(2);const tw=ds[dp-1];ds[dp-1]=ds[dp-2];ds[dp-2]=tw;ix++;break;}
case 6:if(dp<2)return fin(2);if(dp>=256)return fin(3);ds[dp]=ds[dp-2];dp++;ix++;break;
case 7:{if(dp<3)return fin(2);const rw=ds[dp-3];ds[dp-3]=ds[dp-2];ds[dp-2]=ds[dp-1];ds[dp-1]=rw;ix++;break;}
case 16:case 17:case 18:case 19:case 20:case 21:case 22:case 24:case 25:case 26:case 28:case 29:case 30:case 32:case 33:case 34:{
if(dp<2)return fin(2);
const y=ds[dp-1],x=ds[dp-2];let z;
switch(oc){
case 16:z=x+y;break;
case 17:z=x-y;break;
case 18:z=Math.imul(x,y);break;
case 19:if(y===0)return fin(4);z=x===-2147483648&&y===-1?x:(x/y)|0;break;
case 20:if(y===0)return fin(4);z=y===-1?0:x%y;break;
case 21:if(y===0)return fin(4);z=Math.floor((x>>>0)/(y>>>0))|0;break;
case 22:if(y===0)return fin(4);z=(x>>>0)%(y>>>0)|0;break;
case 24:z=x&y;break;
case 25:z=x|y;break;
case 26:z=x^y;break;
case 28:z=x<<(y&31);break;
case 29:z=x>>(y&31);break;
case 30:z=(x>>>(y&31))|0;break;
case 32:z=x===y?1:0;break;
case 33:z=x<y?1:0;break;
default:z=(x>>>0)<(y>>>0)?1:0;
}
ds[dp-2]=z;dp--;ix++;break;}
case 23:case 27:if(dp<1)return fin(2);ds[dp-1]=oc===23?-ds[dp-1]:~ds[dp-1];ix++;break;
case 48:case 49:case 50:{
if(ix+2>=pn)return fin(9);
const df=((pr[ix+1]|pr[ix+2]<<8)<<16)>>16;
let tk=oc===48;
if(!tk){if(dp<1)return fin(2);const cv=ds[--dp];tk=oc===49?cv===0:cv!==0;}
ix=tk?ix+3+df:ix+3;break;}
case 51:if(ix+2>=pn)return fin(9);if(cp>=64)return fin(7);cs[cp++]=ix+3;ix=pr[ix+1]|pr[ix+2]<<8;break;
case 52:if(cp===0)return fin(8);ix=cs[--cp];break;
case 64:case 65:{
if(dp<(oc===64?1:2))return fin(2);
const ad=ds[dp-1];
if(ad<0||ad>=256)return fin(6);
if(oc===64){ds[dp-1]=mm[ad];ix++;}else{mm[ad]=ds[dp-2];dp-=2;ix++;}
break;}
case 80:{
if(dp<1)return fin(2);
const tx=String(ds[dp-1]);
if(ol+tx.length>65536)return fin(11);
for(let u=0;u<tx.length;u++)ob[ol++]=tx.charCodeAt(u);
dp--;ix++;break;}
case 81:if(dp<1)return fin(2);if(ol>65535)return fin(11);ob[ol++]=ds[--dp]&255;ix++;break;
case 82:if(dp>=256)return fin(3);ds[dp++]=iq<ib.length?ib[iq++]:-1;ix++;break;
case 83:if(dp<1)return fin(2);return fin(ds[dp-1]&255);
default:return fin(5);
}}}
const ID=process.env.MAKEFUN_INPUT_DIR??'/input',OD=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const nm of lsd(ID).sort()){
const rr=vm(rdf(jn(ID,nm,'program.bin')),rdf(jn(ID,nm,'input.bin')));
mkd(jn(OD,nm),{recursive:true});
wrf(jn(OD,nm,'stdout.bin'),rr.bytes);
wrf(jn(OD,nm,'exit.txt'),rr.code+'\n');
}
