const ms={ROTATE:0,DOLLY:1,PAN:2},fs={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},_u=0,dl=1,xu=2,$s=1,vu=2,js=3,Ti=0,on=1,Rt=2,gs=0,Qs=1,ul=2,fl=3,pl=4,yu=5,us=100,Mu=101,Su=102,wu=103,Eu=104,Tu=200,Au=201,Ru=202,Pu=203,nd=204,id=205,Cu=206,Lu=207,Du=208,Iu=209,Nu=210,Fu=211,Uu=212,ku=213,Ou=214,Co=0,Lo=1,Do=2,sa=3,Io=4,No=5,Fo=6,Uo=7,sd=0,zu=1,Bu=2,ri=0,ad=1,rd=2,od=3,cd=4,ld=5,hd=6,wc=7,ml="attached",Gu="detached",dd=300,vs=301,aa=302,Nr=303,Fr=304,qi=1e3,zn=1001,fr=1002,Bt=1003,ud=1004,Ys=1005,jt=1006,rr=1007,Bn=1008,fn=1009,fd=1010,pd=1011,ra=1012,Ec=1013,Vn=1014,vn=1015,Wn=1016,Tc=1017,Ac=1018,ys=1020,md=35902,gd=35899,bd=1021,_d=1022,An=1023,Ai=1026,Mi=1027,Rc=1028,Pc=1029,Xi=1030,Cc=1031,Lc=1033,or=33776,cr=33777,lr=33778,hr=33779,ko=35840,Oo=35841,zo=35842,Bo=35843,Go=36196,Ho=37492,Vo=37496,Wo=37488,qo=37489,pr=37490,Xo=37491,Ko=37808,jo=37809,Yo=37810,Jo=37811,Zo=37812,$o=37813,Qo=37814,ec=37815,tc=37816,nc=37817,ic=37818,sc=37819,ac=37820,rc=37821,oc=36492,cc=36494,lc=36495,hc=36283,dc=36284,mr=36285,uc=36286,oa=2300,ca=2301,Ur=2302,gl=2303,bl=2400,_l=2401,xl=2402,Hu=2500,Vu=0,xd=1,fc=2,Wu=3200,pc=0,qu=1,yi="",Kt="srgb",mn="srgb-linear",gr="linear",yt="srgb",kr=7680,Xu=519,Ku=512,ju=513,Yu=514,vd=515,Ju=516,Zu=517,yd=518,Md=519,Sd=35044,vl="300 es",Rn=2e3,la=2001;function $u(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Qu(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function ha(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function ef(){const s=ha("canvas");return s.style.display="block",s}const yl={};function br(...s){const e="THREE."+s.shift();console.log(e,...s)}function wd(s){const e=s[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=s[1];t&&t.isStackTrace?s[0]+=" "+t.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function qe(...s){s=wd(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...s)}}function Qe(...s){s=wd(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...s)}}function bs(...s){const e=s.join(" ");e in yl||(yl[e]=!0,qe(...s))}function tf(s,e,t){return new Promise(function(n,i){function a(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:n()}}setTimeout(a,t)})}const nf={[Co]:Co,[Do]:Fo,[Io]:Io,[sa]:No,[Lo]:Lo,[Fo]:Do,[Uo]:Uo,[No]:sa};class Ri{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const a=i.indexOf(t);a!==-1&&i.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let a=0,r=i.length;a<r;a++)i[a].call(this,e);e.target=null}}}const en=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ml=1234567;const ea=Math.PI/180,Ms=180/Math.PI;function Xn(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(en[s&255]+en[s>>8&255]+en[s>>16&255]+en[s>>24&255]+"-"+en[e&255]+en[e>>8&255]+"-"+en[e>>16&15|64]+en[e>>24&255]+"-"+en[t&63|128]+en[t>>8&255]+"-"+en[t>>16&255]+en[t>>24&255]+en[n&255]+en[n>>8&255]+en[n>>16&255]+en[n>>24&255]).toLowerCase()}function st(s,e,t){return Math.max(e,Math.min(t,s))}function Dc(s,e){return(s%e+e)%e}function sf(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function af(s,e,t){return s!==e?(t-s)/(e-s):0}function ta(s,e,t){return(1-t)*s+t*e}function rf(s,e,t,n){return ta(s,e,1-Math.exp(-t*n))}function of(s,e=1){return e-Math.abs(Dc(s,e*2)-e)}function cf(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function lf(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function hf(s,e){return s+Math.floor(Math.random()*(e-s+1))}function df(s,e){return s+Math.random()*(e-s)}function uf(s){return s*(.5-Math.random())}function ff(s){s!==void 0&&(Ml=s);let e=Ml+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function pf(s){return s*ea}function mf(s){return s*Ms}function gf(s){return s>0&&Number.isInteger(s)&&2**Math.round(Math.log2(s))===s}function bf(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Ed(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function _f(s,e,t,n,i){const a=Math.cos,r=Math.sin,o=a(t/2),c=r(t/2),l=a((e+n)/2),h=r((e+n)/2),d=a((e-n)/2),u=r((e-n)/2),f=a((n-e)/2),p=r((n-e)/2);switch(i){case"XYX":s.set(o*h,c*d,c*u,o*l);break;case"YZY":s.set(c*u,o*h,c*d,o*l);break;case"ZXZ":s.set(c*d,c*u,o*h,o*l);break;case"XZX":s.set(o*h,c*p,c*f,o*l);break;case"YXY":s.set(c*f,o*h,c*p,o*l);break;case"ZYZ":s.set(c*p,c*f,o*h,o*l);break;default:qe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Er(s){switch(s.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function Ic(s,e){if(e.constructor===Float32Array)return s;const t=Er(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(s/t,-1)}function Nc(s,e){if(e.constructor===Float32Array)return s;const t=Er(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(s*t)}const na={DEG2RAD:ea,RAD2DEG:Ms,generateUUID:Xn,clamp:st,euclideanModulo:Dc,mapLinear:sf,inverseLerp:af,lerp:ta,damp:rf,pingpong:of,smoothstep:cf,smootherstep:lf,randInt:hf,randFloat:df,randFloatSpread:uf,seededRandom:ff,degToRad:pf,radToDeg:mf,isPowerOfTwo:gf,ceilPowerOfTwo:bf,floorPowerOfTwo:Ed,setQuaternionFromProperEuler:_f,normalize:Nc,denormalize:Ic};class Je{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),a=this.x-e.x,r=this.y-e.y;return this.x=a*n-r*i+e.x,this.y=a*i+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class pt{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,a,r,o){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3],u=a[r+0],f=a[r+1],p=a[r+2],b=a[r+3];if(d!==b||c!==u||l!==f||h!==p){let g=c*u+l*f+h*p+d*b;g<0&&(u=-u,f=-f,p=-p,b=-b,g=-g);let m=1-o;if(g<.9995){const x=Math.acos(g),E=Math.sin(x);m=Math.sin(m*x)/E,o=Math.sin(o*x)/E,c=c*m+u*o,l=l*m+f*o,h=h*m+p*o,d=d*m+b*o}else{c=c*m+u*o,l=l*m+f*o,h=h*m+p*o,d=d*m+b*o;const x=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=x,l*=x,h*=x,d*=x}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,i,a,r){const o=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=a[r],u=a[r+1],f=a[r+2],p=a[r+3];return e[t]=o*p+h*d+c*f-l*u,e[t+1]=c*p+h*u+l*d-o*f,e[t+2]=l*p+h*f+o*u-c*d,e[t+3]=h*p-o*d-c*u-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,a=e._z,r=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(i/2),d=o(a/2),u=c(n/2),f=c(i/2),p=c(a/2);switch(r){case"XYZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"YZX":this._x=u*h*d+l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d-u*f*p;break;case"XZY":this._x=u*h*d-l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d+u*f*p;break;default:qe("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],a=t[8],r=t[1],o=t[5],c=t[9],l=t[2],h=t[6],d=t[10],u=n+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(a-l)*f,this._z=(r-i)*f}else if(n>o&&n>d){const f=2*Math.sqrt(1+n-o-d);this._w=(h-c)/f,this._x=.25*f,this._y=(i+r)/f,this._z=(a+l)/f}else if(o>d){const f=2*Math.sqrt(1+o-n-d);this._w=(a-l)/f,this._x=(i+r)/f,this._y=.25*f,this._z=(c+h)/f}else{const f=2*Math.sqrt(1+d-n-o);this._w=(r-i)/f,this._x=(a+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(st(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,a=e._z,r=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+r*o+i*l-a*c,this._y=i*h+r*c+a*o-n*l,this._z=a*h+r*l+n*c-i*o,this._w=r*h-n*o-i*c-a*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,a=e._z,r=e._w,o=this.dot(e);o<0&&(n=-n,i=-i,a=-a,r=-r,o=-o);let c=1-t;if(o<.9995){const l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+i*t,this._z=this._z*c+a*t,this._w=this._w*c+r*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+i*t,this._z=this._z*c+a*t,this._w=this._w*c+r*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),a=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class v{static{this.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Sl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Sl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,a=e.elements;return this.x=a[0]*t+a[3]*n+a[6]*i,this.y=a[1]*t+a[4]*n+a[7]*i,this.z=a[2]*t+a[5]*n+a[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,a=e.elements,r=1/(a[3]*t+a[7]*n+a[11]*i+a[15]);return this.x=(a[0]*t+a[4]*n+a[8]*i+a[12])*r,this.y=(a[1]*t+a[5]*n+a[9]*i+a[13])*r,this.z=(a[2]*t+a[6]*n+a[10]*i+a[14])*r,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,a=e.x,r=e.y,o=e.z,c=e.w,l=2*(r*i-o*n),h=2*(o*t-a*i),d=2*(a*n-r*t);return this.x=t+c*l+r*d-o*h,this.y=n+c*h+o*l-a*d,this.z=i+c*d+a*h-r*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i,this.y=a[1]*t+a[5]*n+a[9]*i,this.z=a[2]*t+a[6]*n+a[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,a=e.z,r=t.x,o=t.y,c=t.z;return this.x=i*c-a*o,this.y=a*r-n*c,this.z=n*o-i*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Or.copy(this).projectOnVector(e),this.sub(Or)}reflect(e){return this.sub(Or.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Or=new v,Sl=new pt;class $e{static{this.prototype.isMatrix3=!0}constructor(e,t,n,i,a,r,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,a,r,o,c,l)}set(e,t,n,i,a,r,o,c,l){const h=this.elements;return h[0]=e,h[1]=i,h[2]=o,h[3]=t,h[4]=a,h[5]=c,h[6]=n,h[7]=r,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,a=this.elements,r=n[0],o=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],b=i[0],g=i[3],m=i[6],x=i[1],E=i[4],y=i[7],S=i[2],w=i[5],_=i[8];return a[0]=r*b+o*x+c*S,a[3]=r*g+o*E+c*w,a[6]=r*m+o*y+c*_,a[1]=l*b+h*x+d*S,a[4]=l*g+h*E+d*w,a[7]=l*m+h*y+d*_,a[2]=u*b+f*x+p*S,a[5]=u*g+f*E+p*w,a[8]=u*m+f*y+p*_,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*r*h-t*o*l-n*a*h+n*o*c+i*a*l-i*r*c}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=h*r-o*l,u=o*c-h*a,f=l*a-r*c,p=t*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const b=1/p;return e[0]=d*b,e[1]=(i*l-h*n)*b,e[2]=(o*n-i*r)*b,e[3]=u*b,e[4]=(h*t-i*c)*b,e[5]=(i*a-o*t)*b,e[6]=f*b,e[7]=(n*c-l*t)*b,e[8]=(r*t-n*a)*b,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,a,r,o){const c=Math.cos(a),l=Math.sin(a);return this.set(n*c,n*l,-n*(c*r+l*o)+r+e,-i*l,i*c,-i*(-l*r+c*o)+o+t,0,0,1),this}scale(e,t){return bs("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(zr.makeScale(e,t)),this}rotate(e){return bs("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(zr.makeRotation(-e)),this}translate(e,t){return bs("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(zr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const zr=new $e,wl=new $e().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),El=new $e().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function xf(){const s={enabled:!0,workingColorSpace:mn,spaces:{},convert:function(i,a,r){return this.enabled===!1||a===r||!a||!r||(this.spaces[a].transfer===yt&&(i.r=oi(i.r),i.g=oi(i.g),i.b=oi(i.b)),this.spaces[a].primaries!==this.spaces[r].primaries&&(i.applyMatrix3(this.spaces[a].toXYZ),i.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===yt&&(i.r=_s(i.r),i.g=_s(i.g),i.b=_s(i.b))),i},workingToColorSpace:function(i,a){return this.convert(i,this.workingColorSpace,a)},colorSpaceToWorking:function(i,a){return this.convert(i,a,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===yi?gr:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,a=this.workingColorSpace){return i.fromArray(this.spaces[a].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,a,r){return i.copy(this.spaces[r].fromXYZ).multiply(this.spaces[a].toXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[mn]:{primaries:e,whitePoint:n,transfer:gr,toXYZ:wl,fromXYZ:El,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Kt},outputColorSpaceConfig:{drawingBufferColorSpace:Kt}},[Kt]:{primaries:e,whitePoint:n,transfer:yt,toXYZ:wl,fromXYZ:El,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Kt}}}),s}const lt=xf();function oi(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function _s(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let Ji;class vf{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ji===void 0&&(Ji=ha("canvas")),Ji.width=e.width,Ji.height=e.height;const i=Ji.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=Ji}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ha("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),a=i.data;for(let r=0;r<a.length;r++)a[r]=oi(a[r]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(oi(t[n]/255)*255):t[n]=oi(t[n]);return{data:t,width:e.width,height:e.height}}else return qe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let yf=0;class Fc{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:yf++}),this.uuid=Xn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width||0,t.height||0,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let a;if(Array.isArray(i)){a=[];for(let r=0,o=i.length;r<o;r++)i[r].isDataTexture?a.push(Br(i[r].image)):a.push(Br(i[r]))}else a=Br(i);n.url=a}return t||(e.images[this.uuid]=n),n}}function Br(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?vf.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(qe("Texture: Unable to serialize Texture."),{})}let Mf=0;const Gr=new v;class Yt extends Ri{constructor(e=Yt.DEFAULT_IMAGE,t=Yt.DEFAULT_MAPPING,n=zn,i=zn,a=jt,r=Bn,o=An,c=fn,l=Yt.DEFAULT_ANISOTROPY,h=yi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Mf++}),this.uuid=Xn(),this.name="",this.source=new Fc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=a,this.minFilter=r,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Je(0,0),this.repeat=new Je(1,1),this.center=new Je(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new $e,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Gr).x}get height(){return this.source.getSize(Gr).y}get depth(){return this.source.getSize(Gr).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){qe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){qe(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==dd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case qi:e.x=e.x-Math.floor(e.x);break;case zn:e.x=e.x<0?0:1;break;case fr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case qi:e.y=e.y-Math.floor(e.y);break;case zn:e.y=e.y<0?0:1;break;case fr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Yt.DEFAULT_IMAGE=null;Yt.DEFAULT_MAPPING=dd;Yt.DEFAULT_ANISOTROPY=1;class Et{static{this.prototype.isVector4=!0}constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,a=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i+r[12]*a,this.y=r[1]*t+r[5]*n+r[9]*i+r[13]*a,this.z=r[2]*t+r[6]*n+r[10]*i+r[14]*a,this.w=r[3]*t+r[7]*n+r[11]*i+r[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,a;const c=e.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],p=c[9],b=c[2],g=c[6],m=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-b)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+b)<.1&&Math.abs(p+g)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const E=(l+1)/2,y=(f+1)/2,S=(m+1)/2,w=(h+u)/4,_=(d+b)/4,M=(p+g)/4;return E>y&&E>S?E<.01?(n=0,i=.707106781,a=.707106781):(n=Math.sqrt(E),i=w/n,a=_/n):y>S?y<.01?(n=.707106781,i=0,a=.707106781):(i=Math.sqrt(y),n=w/i,a=M/i):S<.01?(n=.707106781,i=.707106781,a=0):(a=Math.sqrt(S),n=_/a,i=M/a),this.set(n,i,a,t),this}let x=Math.sqrt((g-p)*(g-p)+(d-b)*(d-b)+(u-h)*(u-h));return Math.abs(x)<.001&&(x=1),this.x=(g-p)/x,this.y=(d-b)/x,this.z=(u-h)/x,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this.w=st(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this.w=st(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Sf extends Ri{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:jt,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Et(0,0,e,t),this.scissorTest=!1,this.viewport=new Et(0,0,e,t),this.textures=[];const i=n.count;for(let a=0;a<i;a++)this.textures[a]=new Yt({width:e,height:t,depth:n.depth}),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:jt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,a=this.textures.length;i<a;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new Fc(i)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){const t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Gn extends Sf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Td extends Yt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Bt,this.minFilter=Bt,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class wf extends Yt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Bt,this.minFilter=Bt,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}}class Xe{static{this.prototype.isMatrix4=!0}constructor(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g)}set(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=i,m[1]=a,m[5]=r,m[9]=o,m[13]=c,m[2]=l,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=p,m[11]=b,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Xe().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,n=e.elements,i=1/Zi.setFromMatrixColumn(e,0).length(),a=1/Zi.setFromMatrixColumn(e,1).length(),r=1/Zi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*a,t[5]=n[5]*a,t[6]=n[6]*a,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,a=e.z,r=Math.cos(n),o=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(a),d=Math.sin(a);if(e.order==="XYZ"){const u=r*h,f=r*d,p=o*h,b=o*d;t[0]=c*h,t[4]=-c*d,t[8]=l,t[1]=f+p*l,t[5]=u-b*l,t[9]=-o*c,t[2]=b-u*l,t[6]=p+f*l,t[10]=r*c}else if(e.order==="YXZ"){const u=c*h,f=c*d,p=l*h,b=l*d;t[0]=u+b*o,t[4]=p*o-f,t[8]=r*l,t[1]=r*d,t[5]=r*h,t[9]=-o,t[2]=f*o-p,t[6]=b+u*o,t[10]=r*c}else if(e.order==="ZXY"){const u=c*h,f=c*d,p=l*h,b=l*d;t[0]=u-b*o,t[4]=-r*d,t[8]=p+f*o,t[1]=f+p*o,t[5]=r*h,t[9]=b-u*o,t[2]=-r*l,t[6]=o,t[10]=r*c}else if(e.order==="ZYX"){const u=r*h,f=r*d,p=o*h,b=o*d;t[0]=c*h,t[4]=p*l-f,t[8]=u*l+b,t[1]=c*d,t[5]=b*l+u,t[9]=f*l-p,t[2]=-l,t[6]=o*c,t[10]=r*c}else if(e.order==="YZX"){const u=r*c,f=r*l,p=o*c,b=o*l;t[0]=c*h,t[4]=b-u*d,t[8]=p*d+f,t[1]=d,t[5]=r*h,t[9]=-o*h,t[2]=-l*h,t[6]=f*d+p,t[10]=u-b*d}else if(e.order==="XZY"){const u=r*c,f=r*l,p=o*c,b=o*l;t[0]=c*h,t[4]=-d,t[8]=l*h,t[1]=u*d+b,t[5]=r*h,t[9]=f*d-p,t[2]=p*d-f,t[6]=o*h,t[10]=b*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ef,e,Tf)}lookAt(e,t,n){const i=this.elements;return dn.subVectors(e,t),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),di.crossVectors(n,dn),di.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),di.crossVectors(n,dn)),di.normalize(),Ma.crossVectors(dn,di),i[0]=di.x,i[4]=Ma.x,i[8]=dn.x,i[1]=di.y,i[5]=Ma.y,i[9]=dn.y,i[2]=di.z,i[6]=Ma.z,i[10]=dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,a=this.elements,r=n[0],o=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],b=n[6],g=n[10],m=n[14],x=n[3],E=n[7],y=n[11],S=n[15],w=i[0],_=i[4],M=i[8],F=i[12],P=i[1],I=i[5],D=i[9],L=i[13],R=i[2],U=i[6],z=i[10],N=i[14],B=i[3],k=i[7],V=i[11],X=i[15];return a[0]=r*w+o*P+c*R+l*B,a[4]=r*_+o*I+c*U+l*k,a[8]=r*M+o*D+c*z+l*V,a[12]=r*F+o*L+c*N+l*X,a[1]=h*w+d*P+u*R+f*B,a[5]=h*_+d*I+u*U+f*k,a[9]=h*M+d*D+u*z+f*V,a[13]=h*F+d*L+u*N+f*X,a[2]=p*w+b*P+g*R+m*B,a[6]=p*_+b*I+g*U+m*k,a[10]=p*M+b*D+g*z+m*V,a[14]=p*F+b*L+g*N+m*X,a[3]=x*w+E*P+y*R+S*B,a[7]=x*_+E*I+y*U+S*k,a[11]=x*M+E*D+y*z+S*V,a[15]=x*F+E*L+y*N+S*X,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],a=e[12],r=e[1],o=e[5],c=e[9],l=e[13],h=e[2],d=e[6],u=e[10],f=e[14],p=e[3],b=e[7],g=e[11],m=e[15],x=c*f-l*u,E=o*f-l*d,y=o*u-c*d,S=r*f-l*h,w=r*u-c*h,_=r*d-o*h;return t*(b*x-g*E+m*y)-n*(p*x-g*S+m*w)+i*(p*E-b*S+m*_)-a*(p*y-b*w+g*_)}determinantAffine(){const e=this.elements,t=e[0],n=e[4],i=e[8],a=e[1],r=e[5],o=e[9],c=e[2],l=e[6],h=e[10];return t*(r*h-o*l)-n*(a*h-o*c)+i*(a*l-r*c)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=e[9],u=e[10],f=e[11],p=e[12],b=e[13],g=e[14],m=e[15],x=t*o-n*r,E=t*c-i*r,y=t*l-a*r,S=n*c-i*o,w=n*l-a*o,_=i*l-a*c,M=h*b-d*p,F=h*g-u*p,P=h*m-f*p,I=d*g-u*b,D=d*m-f*b,L=u*m-f*g,R=x*L-E*D+y*I+S*P-w*F+_*M;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const U=1/R;return e[0]=(o*L-c*D+l*I)*U,e[1]=(i*D-n*L-a*I)*U,e[2]=(b*_-g*w+m*S)*U,e[3]=(u*w-d*_-f*S)*U,e[4]=(c*P-r*L-l*F)*U,e[5]=(t*L-i*P+a*F)*U,e[6]=(g*y-p*_-m*E)*U,e[7]=(h*_-u*y+f*E)*U,e[8]=(r*D-o*P+l*M)*U,e[9]=(n*P-t*D-a*M)*U,e[10]=(p*w-b*y+m*x)*U,e[11]=(d*y-h*w-f*x)*U,e[12]=(o*F-r*I-c*M)*U,e[13]=(t*I-n*F+i*M)*U,e[14]=(b*E-p*S-g*x)*U,e[15]=(h*S-d*E+u*x)*U,this}scale(e){const t=this.elements,n=e.x,i=e.y,a=e.z;return t[0]*=n,t[4]*=i,t[8]*=a,t[1]*=n,t[5]*=i,t[9]*=a,t[2]*=n,t[6]*=i,t[10]*=a,t[3]*=n,t[7]*=i,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),a=1-n,r=e.x,o=e.y,c=e.z,l=a*r,h=a*o;return this.set(l*r+n,l*o-i*c,l*c+i*o,0,l*o+i*c,h*o+n,h*c-i*r,0,l*c-i*o,h*c+i*r,a*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,a,r){return this.set(1,n,a,0,e,1,r,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,a=t._x,r=t._y,o=t._z,c=t._w,l=a+a,h=r+r,d=o+o,u=a*l,f=a*h,p=a*d,b=r*h,g=r*d,m=o*d,x=c*l,E=c*h,y=c*d,S=n.x,w=n.y,_=n.z;return i[0]=(1-(b+m))*S,i[1]=(f+y)*S,i[2]=(p-E)*S,i[3]=0,i[4]=(f-y)*w,i[5]=(1-(u+m))*w,i[6]=(g+x)*w,i[7]=0,i[8]=(p+E)*_,i[9]=(g-x)*_,i[10]=(1-(u+b))*_,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];const a=this.determinantAffine();if(a===0)return n.set(1,1,1),t.identity(),this;let r=Zi.set(i[0],i[1],i[2]).length();const o=Zi.set(i[4],i[5],i[6]).length(),c=Zi.set(i[8],i[9],i[10]).length();a<0&&(r=-r),Sn.copy(this);const l=1/r,h=1/o,d=1/c;return Sn.elements[0]*=l,Sn.elements[1]*=l,Sn.elements[2]*=l,Sn.elements[4]*=h,Sn.elements[5]*=h,Sn.elements[6]*=h,Sn.elements[8]*=d,Sn.elements[9]*=d,Sn.elements[10]*=d,t.setFromRotationMatrix(Sn),n.x=r,n.y=o,n.z=c,this}makePerspective(e,t,n,i,a,r,o=Rn,c=!1){const l=this.elements,h=2*a/(t-e),d=2*a/(n-i),u=(t+e)/(t-e),f=(n+i)/(n-i);let p,b;if(c)p=a/(r-a),b=r*a/(r-a);else if(o===Rn)p=-(r+a)/(r-a),b=-2*r*a/(r-a);else if(o===la)p=-r/(r-a),b=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,a,r,o=Rn,c=!1){const l=this.elements,h=2/(t-e),d=2/(n-i),u=-(t+e)/(t-e),f=-(n+i)/(n-i);let p,b;if(c)p=1/(r-a),b=r/(r-a);else if(o===Rn)p=-2/(r-a),b=-(r+a)/(r-a);else if(o===la)p=-1/(r-a),b=-a/(r-a);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=d,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Zi=new v,Sn=new Xe,Ef=new v(0,0,0),Tf=new v(1,1,1),di=new v,Ma=new v,dn=new v,Tl=new Xe,Al=new pt;class qn{constructor(e=0,t=0,n=0,i=qn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,a=i[0],r=i[4],o=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(st(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-st(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(st(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,l)):(this._y=0,this._z=Math.atan2(c,a));break;case"ZYX":this._y=Math.asin(-st(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,a)):(this._x=0,this._z=Math.atan2(-r,l));break;case"YZX":this._z=Math.asin(st(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-st(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-h,f),this._y=0);break;default:qe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Tl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Tl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Al.setFromEuler(this),this.setFromQuaternion(Al,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}qn.DEFAULT_ORDER="XYZ";class Uc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Af=0;const Rl=new v,$i=new pt,Jn=new Xe,Sa=new v,Ns=new v,Rf=new v,Pf=new pt,Pl=new v(1,0,0),Cl=new v(0,1,0),Ll=new v(0,0,1),Dl={type:"added"},Cf={type:"removed"},Qi={type:"childadded",child:null},Hr={type:"childremoved",child:null};class Pt extends Ri{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Af++}),this.uuid=Xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Pt.DEFAULT_UP.clone();const e=new v,t=new qn,n=new pt,i=new v(1,1,1);function a(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(a),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Xe},normalMatrix:{value:new $e}}),this.matrix=new Xe,this.matrixWorld=new Xe,this.matrixAutoUpdate=Pt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Uc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return $i.setFromAxisAngle(e,t),this.quaternion.multiply($i),this}rotateOnWorldAxis(e,t){return $i.setFromAxisAngle(e,t),this.quaternion.premultiply($i),this}rotateX(e){return this.rotateOnAxis(Pl,e)}rotateY(e){return this.rotateOnAxis(Cl,e)}rotateZ(e){return this.rotateOnAxis(Ll,e)}translateOnAxis(e,t){return Rl.copy(e).applyQuaternion(this.quaternion),this.position.add(Rl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Pl,e)}translateY(e){return this.translateOnAxis(Cl,e)}translateZ(e){return this.translateOnAxis(Ll,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Jn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Sa.copy(e):Sa.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ns.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Jn.lookAt(Ns,Sa,this.up):Jn.lookAt(Sa,Ns,this.up),this.quaternion.setFromRotationMatrix(Jn),i&&(Jn.extractRotation(i.matrixWorld),$i.setFromRotationMatrix(Jn),this.quaternion.premultiply($i.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Qe("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Dl),Qi.child=e,this.dispatchEvent(Qi),Qi.child=null):Qe("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Cf),Hr.child=e,this.dispatchEvent(Hr),Hr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Jn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Jn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Jn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Dl),Qi.child=e,this.dispatchEvent(Qi),Qi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let a=0,r=i.length;a<r;a++)i[a].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ns,e,Rf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ns,Pf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,i=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*n-a[8]*i,a[13]+=n-a[1]*t-a[5]*n-a[9]*i,a[14]+=i-a[2]*t-a[6]*n-a[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){const a=this.children;for(let r=0,o=a.length;r<o;r++)a[r].updateWorldMatrix(!1,!0,n)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function a(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=a(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];a(e.shapes,d)}else a(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(a(e.materials,this.material[c]));i.material=o}else i.material=a(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];i.animations.push(a(e.animations,c))}}if(t){const o=r(e.geometries),c=r(e.materials),l=r(e.textures),h=r(e.images),d=r(e.shapes),u=r(e.skeletons),f=r(e.animations),p=r(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}Pt.DEFAULT_UP=new v(0,1,0);Pt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Pt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Pn extends Pt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Lf={type:"move"};class Vr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Pn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Pn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new v,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new v),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Pn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new v,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new v,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,a=null,r=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){r=!0;for(const b of e.hand.values()){const g=t.getJointPose(b,n),m=this._getHandJoint(l,b);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;l.inputState.pinching&&u>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,n),a!==null&&(c.matrix.fromArray(a.transform.matrix),c.matrix.decompose(c.position,c.quaternion,c.scale),c.matrixWorldNeedsUpdate=!0,a.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(a.linearVelocity)):c.hasLinearVelocity=!1,a.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(a.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&a!==null&&(i=a),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Lf)))}return o!==null&&(o.visible=i!==null),c!==null&&(c.visible=a!==null),l!==null&&(l.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Pn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const Ad={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ui={h:0,s:0,l:0},wa={h:0,s:0,l:0};function Wr(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class pe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Kt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,lt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=lt.workingColorSpace){return this.r=e,this.g=t,this.b=n,lt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=lt.workingColorSpace){if(e=Dc(e,1),t=st(t,0,1),n=st(n,0,1),t===0)this.r=this.g=this.b=n;else{const a=n<=.5?n*(1+t):n+t-n*t,r=2*n-a;this.r=Wr(r,a,e+1/3),this.g=Wr(r,a,e),this.b=Wr(r,a,e-1/3)}return lt.colorSpaceToWorking(this,i),this}setStyle(e,t=Kt){function n(a){a!==void 0&&parseFloat(a)<1&&qe("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const r=i[1],o=i[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(100,parseFloat(a[1]))/100,Math.min(100,parseFloat(a[2]))/100,Math.min(100,parseFloat(a[3]))/100,t);break;case"hsl":case"hsla":if(a=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:qe("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=i[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(a,16),t);qe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Kt){const n=Ad[e.toLowerCase()];return n!==void 0?this.setHex(n,t):qe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=oi(e.r),this.g=oi(e.g),this.b=oi(e.b),this}copyLinearToSRGB(e){return this.r=_s(e.r),this.g=_s(e.g),this.b=_s(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Kt){return lt.workingToColorSpace(tn.copy(this),e),Math.round(st(tn.r*255,0,255))*65536+Math.round(st(tn.g*255,0,255))*256+Math.round(st(tn.b*255,0,255))}getHexString(e=Kt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=lt.workingColorSpace){lt.workingToColorSpace(tn.copy(this),t);const n=tn.r,i=tn.g,a=tn.b,r=Math.max(n,i,a),o=Math.min(n,i,a);let c,l;const h=(o+r)/2;if(o===r)c=0,l=0;else{const d=r-o;switch(l=h<=.5?d/(r+o):d/(2-r-o),r){case n:c=(i-a)/d+(i<a?6:0);break;case i:c=(a-n)/d+2;break;case a:c=(n-i)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=lt.workingColorSpace){return lt.workingToColorSpace(tn.copy(this),t),e.r=tn.r,e.g=tn.g,e.b=tn.b,e}getStyle(e=Kt){lt.workingToColorSpace(tn.copy(this),e);const t=tn.r,n=tn.g,i=tn.b;return e!==Kt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(ui),this.setHSL(ui.h+e,ui.s+t,ui.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ui),e.getHSL(wa);const n=ta(ui.h,wa.h,t),i=ta(ui.s,wa.s,t),a=ta(ui.l,wa.l,t);return this.setHSL(n,i,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,a=e.elements;return this.r=a[0]*t+a[3]*n+a[6]*i,this.g=a[1]*t+a[4]*n+a[7]*i,this.b=a[2]*t+a[5]*n+a[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const tn=new pe;pe.NAMES=Ad;class Il extends Pt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new qn,this.environmentIntensity=1,this.environmentRotation=new qn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background!==null?e.background.clone():null,this.environment=e.environment!==null?e.environment.clone():null,this.fog=e.fog!==null?e.fog.clone():null,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial!==null?e.overrideMaterial.clone():null,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}}const wn=new v,Zn=new v,qr=new v,$n=new v,es=new v,ts=new v,Nl=new v,Xr=new v,Kr=new v,jr=new v,Yr=new Et,Jr=new Et,Zr=new Et;class xn{constructor(e=new v,t=new v,n=new v){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),wn.subVectors(e,t),i.cross(wn);const a=i.lengthSq();return a>0?i.multiplyScalar(1/Math.sqrt(a)):i.set(0,0,0)}static getBarycoord(e,t,n,i,a){wn.subVectors(i,t),Zn.subVectors(n,t),qr.subVectors(e,t);const r=wn.dot(wn),o=wn.dot(Zn),c=wn.dot(qr),l=Zn.dot(Zn),h=Zn.dot(qr),d=r*l-o*o;if(d===0)return a.set(0,0,0),null;const u=1/d,f=(l*c-o*h)*u,p=(r*h-o*c)*u;return a.set(1-f-p,p,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,$n)===null?!1:$n.x>=0&&$n.y>=0&&$n.x+$n.y<=1}static getInterpolation(e,t,n,i,a,r,o,c){return this.getBarycoord(e,t,n,i,$n)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(a,$n.x),c.addScaledVector(r,$n.y),c.addScaledVector(o,$n.z),c)}static getInterpolatedAttribute(e,t,n,i,a,r){return Yr.setScalar(0),Jr.setScalar(0),Zr.setScalar(0),Yr.fromBufferAttribute(e,t),Jr.fromBufferAttribute(e,n),Zr.fromBufferAttribute(e,i),r.setScalar(0),r.addScaledVector(Yr,a.x),r.addScaledVector(Jr,a.y),r.addScaledVector(Zr,a.z),r}static isFrontFacing(e,t,n,i){return wn.subVectors(n,t),Zn.subVectors(e,t),wn.cross(Zn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return wn.subVectors(this.c,this.b),Zn.subVectors(this.a,this.b),wn.cross(Zn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return xn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return xn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,a){return xn.getInterpolation(e,this.a,this.b,this.c,t,n,i,a)}containsPoint(e){return xn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return xn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,a=this.c;let r,o;es.subVectors(i,n),ts.subVectors(a,n),Xr.subVectors(e,n);const c=es.dot(Xr),l=ts.dot(Xr);if(c<=0&&l<=0)return t.copy(n);Kr.subVectors(e,i);const h=es.dot(Kr),d=ts.dot(Kr);if(h>=0&&d<=h)return t.copy(i);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0&&c-h>0)return r=c/(c-h),t.copy(n).addScaledVector(es,r);jr.subVectors(e,a);const f=es.dot(jr),p=ts.dot(jr);if(p>=0&&f<=p)return t.copy(a);const b=f*l-c*p;if(b<=0&&l>=0&&p<=0)return o=l/(l-p),t.copy(n).addScaledVector(ts,o);const g=h*p-f*d;if(g<=0&&d-h>=0&&f-p>=0)return Nl.subVectors(a,i),o=(d-h)/(d-h+(f-p)),t.copy(i).addScaledVector(Nl,o);const m=1/(g+b+u);return r=b*m,o=u*m,t.copy(n).addScaledVector(es,r).addScaledVector(ts,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Kn{constructor(e=new v(1/0,1/0,1/0),t=new v(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(En.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(En.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=En.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const a=n.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let r=0,o=a.count;r<o;r++)e.isMesh===!0?e.getVertexPosition(r,En):En.fromBufferAttribute(a,r),En.applyMatrix4(e.matrixWorld),this.expandByPoint(En);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ea.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ea.copy(n.boundingBox)),Ea.applyMatrix4(e.matrixWorld),this.union(Ea)}const i=e.children;for(let a=0,r=i.length;a<r;a++)this.expandByObject(i[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,En),En.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Fs),Ta.subVectors(this.max,Fs),ns.subVectors(e.a,Fs),is.subVectors(e.b,Fs),ss.subVectors(e.c,Fs),fi.subVectors(is,ns),pi.subVectors(ss,is),Ui.subVectors(ns,ss);let t=[0,-fi.z,fi.y,0,-pi.z,pi.y,0,-Ui.z,Ui.y,fi.z,0,-fi.x,pi.z,0,-pi.x,Ui.z,0,-Ui.x,-fi.y,fi.x,0,-pi.y,pi.x,0,-Ui.y,Ui.x,0];return!$r(t,ns,is,ss,Ta)||(t=[1,0,0,0,1,0,0,0,1],!$r(t,ns,is,ss,Ta))?!1:(Aa.crossVectors(fi,pi),t=[Aa.x,Aa.y,Aa.z],$r(t,ns,is,ss,Ta))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,En).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(En).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Qn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Qn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Qn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Qn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Qn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Qn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Qn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Qn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Qn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Qn=[new v,new v,new v,new v,new v,new v,new v,new v],En=new v,Ea=new Kn,ns=new v,is=new v,ss=new v,fi=new v,pi=new v,Ui=new v,Fs=new v,Ta=new v,Aa=new v,ki=new v;function $r(s,e,t,n,i){for(let a=0,r=s.length-3;a<=r;a+=3){ki.fromArray(s,a);const o=i.x*Math.abs(ki.x)+i.y*Math.abs(ki.y)+i.z*Math.abs(ki.z),c=e.dot(ki),l=t.dot(ki),h=n.dot(ki);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const kt=new v,Ra=new Je;let Df=0;class It extends Ri{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Df++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Sd,this.updateRanges=[],this.gpuType=vn,this.version=0,this._normalizationScale=e!==void 0?Er(e):void 0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,a=this.itemSize;i<a;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ra.fromBufferAttribute(this,t),Ra.applyMatrix3(e),this.setXY(t,Ra.x,Ra.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)kt.fromBufferAttribute(this,t),kt.applyMatrix3(e),this.setXYZ(t,kt.x,kt.y,kt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)kt.fromBufferAttribute(this,t),kt.applyMatrix4(e),this.setXYZ(t,kt.x,kt.y,kt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)kt.fromBufferAttribute(this,t),kt.applyNormalMatrix(e),this.setXYZ(t,kt.x,kt.y,kt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)kt.fromBufferAttribute(this,t),kt.transformDirection(e),this.setXYZ(t,kt.x,kt.y,kt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,a){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),a=this._normalize(a)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):Ic(e,this.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Nc(e,this.array)}}class Tr extends It{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Rd extends It{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class tt extends It{constructor(e,t,n){super(new Float32Array(e),t,n)}}const If=new Kn,Us=new v,Qr=new v;class yn{constructor(e=new v,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):If.setFromPoints(e).getCenter(n);let i=0;for(let a=0,r=e.length;a<r;a++)i=Math.max(i,n.distanceToSquared(e[a]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Us.subVectors(e,this.center);const t=Us.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Us,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Qr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Us.copy(e.center).add(Qr)),this.expandByPoint(Us.copy(e.center).sub(Qr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Nf=0;const gn=new Xe,eo=new Pt,as=new v,un=new Kn,ks=new Kn,Xt=new v;class St extends Ri{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Nf++}),this.uuid=Xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new($u(e)?Rd:Tr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const a=new $e().getNormalMatrix(e);n.applyNormalMatrix(a),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return gn.makeRotationFromQuaternion(e),this.applyMatrix4(gn),this}rotateX(e){return gn.makeRotationX(e),this.applyMatrix4(gn),this}rotateY(e){return gn.makeRotationY(e),this.applyMatrix4(gn),this}rotateZ(e){return gn.makeRotationZ(e),this.applyMatrix4(gn),this}translate(e,t,n){return gn.makeTranslation(e,t,n),this.applyMatrix4(gn),this}scale(e,t,n){return gn.makeScale(e,t,n),this.applyMatrix4(gn),this}lookAt(e){return eo.lookAt(e),eo.updateMatrix(),this.applyMatrix4(eo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(as).negate(),this.translate(as.x,as.y,as.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,a=e.length;i<a;i++){const r=e[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new tt(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const a=e[i];t.setXYZ(i,a.x,a.y,a.z||0)}e.length>t.count&&qe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Kn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Qe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new v(-1/0,-1/0,-1/0),new v(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const a=t[n];un.setFromBufferAttribute(a),this.morphTargetsRelative?(Xt.addVectors(this.boundingBox.min,un.min),this.boundingBox.expandByPoint(Xt),Xt.addVectors(this.boundingBox.max,un.max),this.boundingBox.expandByPoint(Xt)):(this.boundingBox.expandByPoint(un.min),this.boundingBox.expandByPoint(un.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Qe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new yn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Qe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new v,1/0);return}if(e){const n=this.boundingSphere.center;if(un.setFromBufferAttribute(e),t)for(let a=0,r=t.length;a<r;a++){const o=t[a];ks.setFromBufferAttribute(o),this.morphTargetsRelative?(Xt.addVectors(un.min,ks.min),un.expandByPoint(Xt),Xt.addVectors(un.max,ks.max),un.expandByPoint(Xt)):(un.expandByPoint(ks.min),un.expandByPoint(ks.max))}un.getCenter(n);let i=0;for(let a=0,r=e.count;a<r;a++)Xt.fromBufferAttribute(e,a),i=Math.max(i,n.distanceToSquared(Xt));if(t)for(let a=0,r=t.length;a<r;a++){const o=t[a],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)Xt.fromBufferAttribute(o,l),c&&(as.fromBufferAttribute(e,l),Xt.add(as)),i=Math.max(i,n.distanceToSquared(Xt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&Qe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Qe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,a=t.uv;let r=this.getAttribute("tangent");(r===void 0||r.count!==n.count)&&(r=new It(new Float32Array(4*n.count),4),this.setAttribute("tangent",r));const o=[],c=[],l=new Uint8Array(n.count);for(let F=0;F<n.count;F++)o[F]=new v,c[F]=new v;const h=new v,d=new v,u=new v,f=new Je,p=new Je,b=new Je,g=new v,m=new v;function x(F,P,I){l[F]=l[P]=l[I]=1,h.fromBufferAttribute(n,F),d.fromBufferAttribute(n,P),u.fromBufferAttribute(n,I),f.fromBufferAttribute(a,F),p.fromBufferAttribute(a,P),b.fromBufferAttribute(a,I),d.sub(h),u.sub(h),p.sub(f),b.sub(f);const D=1/(p.x*b.y-b.x*p.y);isFinite(D)&&(g.copy(d).multiplyScalar(b.y).addScaledVector(u,-p.y).multiplyScalar(D),m.copy(u).multiplyScalar(p.x).addScaledVector(d,-b.x).multiplyScalar(D),o[F].add(g),o[P].add(g),o[I].add(g),c[F].add(m),c[P].add(m),c[I].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let F=0,P=E.length;F<P;++F){const I=E[F],D=I.start,L=I.count;for(let R=D,U=D+L;R<U;R+=3)x(e.getX(R+0),e.getX(R+1),e.getX(R+2))}const y=new v,S=new v,w=new v,_=new v;function M(F){w.fromBufferAttribute(i,F),_.copy(w);const P=o[F];y.copy(P),y.sub(w.multiplyScalar(w.dot(P))).normalize(),S.crossVectors(_,P);const D=S.dot(c[F])<0?-1:1;r.setXYZW(F,y.x,y.y,y.z,D)}for(let F=0,P=n.count;F<P;++F)l[F]&&M(F);this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new It(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new v,a=new v,r=new v,o=new v,c=new v,l=new v,h=new v,d=new v;if(e)for(let u=0,f=e.count;u<f;u+=3){const p=e.getX(u+0),b=e.getX(u+1),g=e.getX(u+2);i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,b),r.fromBufferAttribute(t,g),h.subVectors(r,a),d.subVectors(i,a),h.cross(d),o.fromBufferAttribute(n,p),c.fromBufferAttribute(n,b),l.fromBufferAttribute(n,g),o.add(h),c.add(h),l.add(h),n.setXYZ(p,o.x,o.y,o.z),n.setXYZ(b,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=t.count;u<f;u+=3)i.fromBufferAttribute(t,u+0),a.fromBufferAttribute(t,u+1),r.fromBufferAttribute(t,u+2),h.subVectors(r,a),d.subVectors(i,a),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Xt.fromBufferAttribute(e,t),Xt.normalize(),e.setXYZ(t,Xt.x,Xt.y,Xt.z)}toNonIndexed(){function e(o,c){const l=o.array,h=o.itemSize,d=o.normalized,u=new l.constructor(c.length*h);let f=0,p=0;for(let b=0,g=c.length;b<g;b++){o.isInterleavedBufferAttribute?f=c[b]*o.data.stride+o.offset:f=c[b]*h;for(let m=0;m<h;m++)u[p++]=l[f++]}return new It(u,h,d)}if(this.index===null)return qe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new St,n=this.index.array,i=this.attributes;for(const o in i){const c=i[o],l=e(c,n);t.setAttribute(o,l)}const a=this.morphAttributes;for(const o in a){const c=[],l=a[o];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=e(u,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let o=0,c=r.length;o<c;o++){const l=r[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const i={};let a=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(e.data))}h.length>0&&(i[c]=h,a=!0)}a&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(t))}const a=e.morphAttributes;for(const l in a){const h=[],d=a[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let l=0,h=r.length;l<h;l++){const d=r[l];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ff{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Sd,this.updateRanges=[],this.version=0,this.uuid=Xn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,a=this.stride;i<a;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=Fl(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=this.array.slice(0).buffer);const n=new this.array.constructor(e.arrayBuffers[t]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=Fl(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=Array.from(new Uint32Array(this.array.slice(0).buffer)));const n={uuid:this.uuid,buffer:t,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}}function Fl(s){return s.buffer._uuid===void 0&&(s.buffer._uuid=Xn()),s.byteOffset===0&&s.byteLength===s.buffer.byteLength?s.buffer._uuid:s.buffer._uuid+":"+s.byteOffset+":"+s.byteLength}const an=new v;class kc{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i,this._normalizationScale=e!==void 0?Er(e.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)an.fromBufferAttribute(this,t),an.applyMatrix4(e),this.setXYZ(t,an.x,an.y,an.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)an.fromBufferAttribute(this,t),an.applyNormalMatrix(e),this.setXYZ(t,an.x,an.y,an.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)an.fromBufferAttribute(this,t),an.transformDirection(e),this.setXYZ(t,an.x,an.y,an.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=this._denormalize(t)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=this._denormalize(t)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=this._denormalize(t)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=this._denormalize(t)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,a){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),a=this._normalize(a)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=a,this}clone(e){if(e===void 0){br("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[i+a])}return new It(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new kc(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){br("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[i+a])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):Ic(e,this.data.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Nc(e,this.data.array)}}const to=new v,Uf=new v,kf=new $e;class ni{constructor(e=new v(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=to.subVectors(n,t).cross(Uf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const i=e.delta(to),a=this.normal.dot(i);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/a;return n===!0&&(r<0||r>1)?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||kf.getNormalMatrix(e),i=this.coplanarPoint(to).applyMatrix4(e),a=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}}let Of=0;class Hn extends Ri{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Of++}),this.uuid=Xn(),this.name="",this.type="Material",this.blending=Qs,this.side=Ti,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=nd,this.blendDst=id,this.blendEquation=us,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new pe(0,0,0),this.blendAlpha=0,this.depthFunc=sa,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Xu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=kr,this.stencilZFail=kr,this.stencilZPass=kr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){qe(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){qe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector2&&n&&n.isVector2||i&&i.isEuler&&n&&n.isEuler||i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(a=>a.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(a){const r=[];for(const o in a){const c=a[o];delete c.metadata,r.push(c)}return r}if(t){const a=i(e.textures),r=i(e.images);a.length>0&&(n.textures=a),r.length>0&&(n.images=r)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new pe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new ni().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Je().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Je().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let a=0;a!==i;++a)n[a]=t[a].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const ei=new v,no=new v,Pa=new v,Ca=new v;class As{constructor(e=new v,t=new v(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ei)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=ei.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(ei.copy(this.origin).addScaledVector(this.direction,t),ei.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){no.copy(e).add(t).multiplyScalar(.5),Pa.copy(t).sub(e).normalize(),Ca.copy(this.origin).sub(no);const a=e.distanceTo(t)*.5,r=-this.direction.dot(Pa),o=Ca.dot(this.direction),c=-Ca.dot(Pa),l=Ca.lengthSq(),h=Math.abs(1-r*r);let d,u,f,p;if(h>0)if(d=r*c-o,u=r*o-c,p=a*h,d>=0)if(u>=-p)if(u<=p){const b=1/h;d*=b,u*=b,f=d*(d+r*u+2*o)+u*(r*d+u+2*c)+l}else u=a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;else u=-a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;else u<=-p?(d=Math.max(0,-(-r*a+o)),u=d>0?-a:Math.min(Math.max(-a,-c),a),f=-d*d+u*(u+2*c)+l):u<=p?(d=0,u=Math.min(Math.max(-a,-c),a),f=u*(u+2*c)+l):(d=Math.max(0,-(r*a+o)),u=d>0?a:Math.min(Math.max(-a,-c),a),f=-d*d+u*(u+2*c)+l);else u=r>0?-a:a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(no).addScaledVector(Pa,u),f}intersectSphere(e,t){if(e.radius<0)return null;ei.subVectors(e.center,this.origin);const n=ei.dot(this.direction),i=ei.dot(ei)-n*n,a=e.radius*e.radius;if(i>a)return null;const r=Math.sqrt(a-i),o=n-r,c=n+r;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,a,r,o,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(e.min.x-u.x)*l,i=(e.max.x-u.x)*l):(n=(e.max.x-u.x)*l,i=(e.min.x-u.x)*l),h>=0?(a=(e.min.y-u.y)*h,r=(e.max.y-u.y)*h):(a=(e.max.y-u.y)*h,r=(e.min.y-u.y)*h),n>r||a>i||((a>n||isNaN(n))&&(n=a),(r<i||isNaN(i))&&(i=r),d>=0?(o=(e.min.z-u.z)*d,c=(e.max.z-u.z)*d):(o=(e.max.z-u.z)*d,c=(e.min.z-u.z)*d),n>c||o>i)||((o>n||n!==n)&&(n=o),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,ei)!==null}intersectTriangle(e,t,n,i,a){const r=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,d=e.x-r.x,u=e.y-r.y,f=e.z-r.z,p=t.x-r.x,b=t.y-r.y,g=t.z-r.z,m=n.x-r.x,x=n.y-r.y,E=n.z-r.z,y=Math.abs(c),S=Math.abs(l),w=Math.abs(h);let _,M,F,P,I,D,L,R,U,z,N,B;if(y>=S&&y>=w?(F=c,D=d,U=p,B=m,c>=0?(_=l,M=h,P=u,I=f,L=b,R=g,z=x,N=E):(_=h,M=l,P=f,I=u,L=g,R=b,z=E,N=x)):S>=w?(F=l,D=u,U=b,B=x,l>=0?(_=h,M=c,P=f,I=d,L=g,R=p,z=E,N=m):(_=c,M=h,P=d,I=f,L=p,R=g,z=m,N=E)):(F=h,D=f,U=g,B=E,h>=0?(_=c,M=l,P=d,I=u,L=p,R=b,z=m,N=x):(_=l,M=c,P=u,I=d,L=b,R=p,z=x,N=m)),F===0)return null;const k=_/F,V=M/F,X=1/F,Y=P-k*D,de=I-V*D,W=L-k*U,J=R-V*U,te=z-k*B,ce=N-V*B,ee=te*J-ce*W,ye=Y*ce-de*te,_e=W*de-J*Y;if(i){if(ee<0||ye<0||_e<0)return null}else if((ee<0||ye<0||_e<0)&&(ee>0||ye>0||_e>0))return null;const fe=ee+ye+_e;if(fe===0)return null;const Ne=X*(ee*D+ye*U+_e*B);return(fe>0?Ne<0:Ne>0)?null:this.at(Ne/fe,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class si extends Hn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new pe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.combine=sd,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Ul=new Xe,Oi=new As,La=new yn,kl=new v,Da=new v,Ia=new v,Na=new v,io=new v,Fa=new v,Ol=new v,Ua=new v;class Ft extends Pt{constructor(e=new St,t=new si){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,a=n.morphAttributes.position,r=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const o=this.morphTargetInfluences;if(a&&o){Fa.set(0,0,0);for(let c=0,l=a.length;c<l;c++){const h=o[c],d=a[c];h!==0&&(io.fromBufferAttribute(d,e),r?Fa.addScaledVector(io,h):Fa.addScaledVector(io.sub(t),h))}t.add(Fa)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.material,a=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),La.copy(n.boundingSphere),La.applyMatrix4(a),Oi.copy(e.ray).recast(e.near),!(La.containsPoint(Oi.origin)===!1&&(Oi.intersectSphere(La,kl)===null||Oi.origin.distanceToSquared(kl)>(e.far-e.near)**2))&&(Ul.copy(a).invert(),Oi.copy(e.ray).applyMatrix4(Ul),!(n.boundingBox!==null&&Oi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Oi)))}_computeIntersections(e,t,n){let i;const a=this.geometry,r=this.material,o=a.index,c=a.attributes.position,l=a.attributes.uv,h=a.attributes.uv1,d=a.attributes.normal,u=a.groups,f=a.drawRange;if(o!==null)if(Array.isArray(r))for(let p=0,b=u.length;p<b;p++){const g=u[p],m=r[g.materialIndex],x=Math.max(g.start,f.start),E=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let y=x,S=E;y<S;y+=3){const w=o.getX(y),_=o.getX(y+1),M=o.getX(y+2);i=ka(this,m,e,n,l,h,d,w,_,M),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),b=Math.min(o.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){const x=o.getX(g),E=o.getX(g+1),y=o.getX(g+2);i=ka(this,r,e,n,l,h,d,x,E,y),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(c!==void 0)if(Array.isArray(r))for(let p=0,b=u.length;p<b;p++){const g=u[p],m=r[g.materialIndex],x=Math.max(g.start,f.start),E=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let y=x,S=E;y<S;y+=3){const w=y,_=y+1,M=y+2;i=ka(this,m,e,n,l,h,d,w,_,M),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),b=Math.min(c.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){const x=g,E=g+1,y=g+2;i=ka(this,r,e,n,l,h,d,x,E,y),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function zf(s,e,t,n,i,a,r,o){let c;if(e.side===on?c=n.intersectTriangle(r,a,i,!0,o):c=n.intersectTriangle(i,a,r,e.side===Ti,o),c===null)return null;Ua.copy(o),Ua.applyMatrix4(s.matrixWorld);const l=t.ray.origin.distanceTo(Ua);return l<t.near||l>t.far?null:{distance:l,point:Ua.clone(),object:s}}function ka(s,e,t,n,i,a,r,o,c,l){s.getVertexPosition(o,Da),s.getVertexPosition(c,Ia),s.getVertexPosition(l,Na);const h=zf(s,e,t,n,Da,Ia,Na,Ol);if(h){const d=new v;xn.getBarycoord(Ol,Da,Ia,Na,d),i&&(h.uv=xn.getInterpolatedAttribute(i,o,c,l,d,new Je)),a&&(h.uv1=xn.getInterpolatedAttribute(a,o,c,l,d,new Je)),r&&(h.normal=xn.getInterpolatedAttribute(r,o,c,l,d,new v),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:c,c:l,normal:new v,materialIndex:0};xn.getNormal(Da,Ia,Na,u.normal),h.face=u,h.barycoord=d}return h}const Os=new Et,zl=new Et,Bl=new Et,Bf=new Et,Gl=new Xe,Oa=new v,so=new yn,Hl=new Xe,ao=new As;class kn extends Ft{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=ml,this.bindMatrix=new Xe,this.bindMatrixInverse=new Xe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Kn),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Oa),this.boundingBox.expandByPoint(Oa)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new yn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Oa),this.boundingSphere.expandByPoint(Oa)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}raycast(e,t){const n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),so.copy(this.boundingSphere),so.applyMatrix4(i),e.ray.intersectsSphere(so)!==!1&&(Hl.copy(i).invert(),ao.copy(e.ray).applyMatrix4(Hl),!(this.boundingBox!==null&&ao.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,ao)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new Et,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);const a=1/e.manhattanLength();a!==1/0?e.multiplyScalar(a):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===ml?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Gu?this.bindMatrixInverse.copy(this.bindMatrix).invert():qe("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,i=this.geometry;zl.fromBufferAttribute(i.attributes.skinIndex,e),Bl.fromBufferAttribute(i.attributes.skinWeight,e),t.isVector4?(Os.copy(t),t.set(0,0,0,0)):(Os.set(t.x,t.y,t.z,1),t.set(0,0,0)),Os.applyMatrix4(this.bindMatrix);for(let a=0;a<4;a++){const r=Bl.getComponent(a);if(r!==0){const o=zl.getComponent(a);Gl.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(Bf.copy(Os).applyMatrix4(Gl),r)}}return t.isVector4&&(t.w=Os.w),t.applyMatrix4(this.bindMatrixInverse)}}class Oc extends Pt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Ar extends Yt{constructor(e=null,t=1,n=1,i,a,r,o,c,l=Bt,h=Bt,d,u){super(null,r,o,c,l,h,i,a,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Vl=new Xe,Gf=new Xe;class Rr{constructor(e=[],t=[]){this.uuid=Xn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.previousBoneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){qe("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new Xe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Xe;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let a=0,r=e.length;a<r;a++){const o=e[a]?e[a].matrixWorld:Gf;Vl.multiplyMatrices(o,t[a]),Vl.toArray(n,a*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new Rr(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Ar(t,e,e,An,vn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null),this.previousBoneTexture!==null&&(this.previousBoneTexture.dispose(),this.previousBoneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){const a=e.bones[n];let r=t[a];r===void 0&&(qe("Skeleton: No bone found with UUID:",a),r=new Oc),this.bones.push(r),this.boneInverses.push(new Xe().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let i=0,a=t.length;i<a;i++){const r=t[i];e.bones.push(r.uuid);const o=n[i];e.boneInverses.push(o.toArray())}return e}}class _r extends It{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const rs=new Xe,Wl=new Xe,za=[],ql=new Kn,Hf=new Xe,zs=new Ft,Bs=new yn;class Vf extends Ft{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new _r(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Hf)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Kn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,rs),ql.copy(e.boundingBox).applyMatrix4(rs),this.boundingBox.union(ql)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new yn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,rs),Bs.copy(e.boundingSphere).applyMatrix4(rs),this.boundingSphere.union(Bs)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture!==null?e.morphTexture.clone():null,this.instanceColor=e.instanceColor!==null?e.instanceColor.clone():null,this.count=e.count,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,a=n.length+1,r=e*a+1;for(let o=0;o<n.length;o++)n[o]=i[r+o]}raycast(e,t){const n=this.matrixWorld,i=this.count;if(zs.geometry=this.geometry,zs.material=this.material,zs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Bs.copy(this.boundingSphere),Bs.applyMatrix4(n),e.ray.intersectsSphere(Bs)!==!1))for(let a=0;a<i;a++){this.getMatrixAt(a,rs),Wl.multiplyMatrices(n,rs),zs.matrixWorld=Wl,zs.raycast(e,za);for(let r=0,o=za.length;r<o;r++){const c=za[r];c.instanceId=a,c.object=this,t.push(c)}za.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new _r(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ar(new Float32Array(i*this.count),i,this.count,Rc,vn));const a=this.morphTexture.source.data.data;let r=0;for(let l=0;l<n.length;l++)r+=n[l];const o=this.geometry.morphTargetsRelative?1:1-r,c=i*e;return a[c]=o,a.set(n,c+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const zi=new yn,Wf=new Je(.5,.5),Ba=new v;class da{constructor(e=new ni,t=new ni,n=new ni,i=new ni,a=new ni,r=new ni){this.planes=[e,t,n,i,a,r]}set(e,t,n,i,a,r){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(a),o[5].copy(r),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Rn,n=!1){const i=this.planes,a=e.elements,r=a[0],o=a[1],c=a[2],l=a[3],h=a[4],d=a[5],u=a[6],f=a[7],p=a[8],b=a[9],g=a[10],m=a[11],x=a[12],E=a[13],y=a[14],S=a[15];if(i[0].setComponents(l-r,f-h,m-p,S-x).normalize(),i[1].setComponents(l+r,f+h,m+p,S+x).normalize(),i[2].setComponents(l+o,f+d,m+b,S+E).normalize(),i[3].setComponents(l-o,f-d,m-b,S-E).normalize(),n)i[4].setComponents(c,u,g,y).normalize(),i[5].setComponents(l-c,f-u,m-g,S-y).normalize();else if(i[4].setComponents(l-c,f-u,m-g,S-y).normalize(),t===Rn)i[5].setComponents(l+c,f+u,m+g,S+y).normalize();else if(t===la)i[5].setComponents(c,u,g,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),zi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),zi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(zi)}intersectsSprite(e){zi.center.set(0,0,0);const t=Wf.distanceTo(e.center);return zi.radius=.7071067811865476+t,zi.applyMatrix4(e.matrixWorld),this.intersectsSphere(zi)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Ba.x=i.normal.x>0?e.max.x:e.min.x,Ba.y=i.normal.y>0?e.max.y:e.min.y,Ba.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Ba)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}const Xl=new Xe;class zc{constructor(){this.coordinateSystem=Rn,this._frustums=[],this._count=0}setFromArrayCamera(e){const t=e.cameras,n=this._frustums;for(let i=0;i<t.length;i++){const a=t[i];Xl.multiplyMatrices(a.projectionMatrix,a.matrixWorldInverse),n[i]===void 0&&(n[i]=new da),n[i].setFromProjectionMatrix(Xl,a.coordinateSystem,a.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;const t=this._frustums,n=e._frustums;for(let i=0;i<e._count;i++)t[i]===void 0&&(t[i]=new da),t[i].copy(n[i]);return this._count=e._count,this}clone(){return new zc().copy(this)}}class Bc extends Hn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new pe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const xr=new v,vr=new v,Kl=new Xe,Gs=new As,Ga=new yn,ro=new v,jl=new v;class Gc extends Pt{constructor(e=new St,t=new Bc){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,a=t.count;i<a;i++)xr.fromBufferAttribute(t,i-1),vr.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=xr.distanceTo(vr);e.setAttribute("lineDistance",new tt(n,1))}else qe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.matrixWorld,a=e.params.Line.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ga.copy(n.boundingSphere),Ga.applyMatrix4(i),Ga.radius+=a,e.ray.intersectsSphere(Ga)===!1)return;Kl.copy(i).invert(),Gs.copy(e.ray).applyMatrix4(Kl);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){const f=Math.max(0,r.start),p=Math.min(h.count,r.start+r.count);for(let b=f,g=p-1;b<g;b+=l){const m=h.getX(b),x=h.getX(b+1),E=Ha(this,e,Gs,c,m,x,b);E&&t.push(E)}if(this.isLineLoop){const b=h.getX(p-1),g=h.getX(f),m=Ha(this,e,Gs,c,b,g,p-1);m&&t.push(m)}}else{const f=Math.max(0,r.start),p=Math.min(u.count,r.start+r.count);for(let b=f,g=p-1;b<g;b+=l){const m=Ha(this,e,Gs,c,b,b+1,b);m&&t.push(m)}if(this.isLineLoop){const b=Ha(this,e,Gs,c,p-1,f,p-1);b&&t.push(b)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Ha(s,e,t,n,i,a,r){const o=s.geometry.attributes.position;if(xr.fromBufferAttribute(o,i),vr.fromBufferAttribute(o,a),t.distanceSqToSegment(xr,vr,ro,jl)>n)return;ro.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(ro);if(!(l<e.near||l>e.far))return{distance:l,point:jl.clone().applyMatrix4(s.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:s}}const Yl=new v,Jl=new v;class Pd extends Gc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,a=t.count;i<a;i+=2)Yl.fromBufferAttribute(t,i),Jl.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Yl.distanceTo(Jl);e.setAttribute("lineDistance",new tt(n,1))}else qe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class qf extends Gc{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Cd extends Hn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new pe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Zl=new Xe,mc=new As,Va=new yn,Wa=new v;class Xf extends Pt{constructor(e=new St,t=new Cd){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.matrixWorld,a=e.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Va.copy(n.boundingSphere),Va.applyMatrix4(i),Va.radius+=a,e.ray.intersectsSphere(Va)===!1)return;Zl.copy(i).invert(),mc.copy(e.ray).applyMatrix4(Zl);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,d=n.attributes.position;if(l!==null){const u=Math.max(0,r.start),f=Math.min(l.count,r.start+r.count);for(let p=u,b=f;p<b;p++){const g=l.getX(p);Wa.fromBufferAttribute(d,g),$l(Wa,g,c,i,e,t,this)}}else{const u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let p=u,b=f;p<b;p++)Wa.fromBufferAttribute(d,p),$l(Wa,p,c,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function $l(s,e,t,n,i,a,r){const o=mc.distanceSqToPoint(s);if(o<t){const c=new v;mc.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;a.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:r})}}class Ld extends Yt{constructor(e=[],t=vs,n,i,a,r,o,c,l,h){super(e,t,n,i,a,r,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Ss extends Yt{constructor(e,t,n=Vn,i,a,r,o=Bt,c=Bt,l,h=Ai,d=1){if(h!==Ai&&h!==Mi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,i,a,r,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Fc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}}class Dd extends Ss{constructor(e,t=Vn,n=vs,i,a,r=Bt,o=Bt,c,l=Ai){const h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,i,a,r,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Id extends Yt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ga extends St{constructor(e=1,t=1,n=1,i=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:a,depthSegments:r};const o=this;i=Math.floor(i),a=Math.floor(a),r=Math.floor(r);const c=[],l=[],h=[],d=[];let u=0,f=0;p("z","y","x",-1,-1,n,t,e,r,a,0),p("z","y","x",1,-1,n,t,-e,r,a,1),p("x","z","y",1,1,e,n,t,i,r,2),p("x","z","y",1,-1,e,n,-t,i,r,3),p("x","y","z",1,-1,e,t,n,i,a,4),p("x","y","z",-1,-1,e,t,-n,i,a,5),this.setIndex(c),this.setAttribute("position",new tt(l,3)),this.setAttribute("normal",new tt(h,3)),this.setAttribute("uv",new tt(d,2));function p(b,g,m,x,E,y,S,w,_,M,F){const P=y/_,I=S/M,D=y/2,L=S/2,R=w/2,U=_+1,z=M+1;let N=0,B=0;const k=new v;for(let V=0;V<z;V++){const X=V*I-L;for(let Y=0;Y<U;Y++){const de=Y*P-D;k[b]=de*x,k[g]=X*E,k[m]=R,l.push(k.x,k.y,k.z),k[b]=0,k[g]=0,k[m]=w>0?1:-1,h.push(k.x,k.y,k.z),d.push(Y/_),d.push(1-V/M),N+=1}}for(let V=0;V<M;V++)for(let X=0;X<_;X++){const Y=u+X+U*V,de=u+X+U*(V+1),W=u+(X+1)+U*(V+1),J=u+(X+1)+U*V;c.push(Y,de,J),c.push(de,W,J),B+=6}o.addGroup(f,B,F),f+=B,u+=N}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ga(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class ba extends St{constructor(e=1,t=1,n=1,i=32,a=1,r=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:a,openEnded:r,thetaStart:o,thetaLength:c};const l=this;i=Math.floor(i),a=Math.floor(a);const h=[],d=[],u=[],f=[];let p=0;const b=[],g=n/2;let m=0;x(),r===!1&&(e>0&&E(!0),t>0&&E(!1)),this.setIndex(h),this.setAttribute("position",new tt(d,3)),this.setAttribute("normal",new tt(u,3)),this.setAttribute("uv",new tt(f,2));function x(){const y=new v,S=new v;let w=0;const _=(t-e)/n;for(let M=0;M<=a;M++){const F=[],P=M/a,I=P*(t-e)+e;for(let D=0;D<=i;D++){const L=D/i,R=L*c+o,U=Math.sin(R),z=Math.cos(R);S.x=I*U,S.y=-P*n+g,S.z=I*z,d.push(S.x,S.y,S.z),y.set(U,_,z).normalize(),u.push(y.x,y.y,y.z),f.push(L,1-P),F.push(p++)}b.push(F)}for(let M=0;M<i;M++)for(let F=0;F<a;F++){const P=b[F][M],I=b[F+1][M],D=b[F+1][M+1],L=b[F][M+1];(e>0||F!==0)&&(h.push(P,I,L),w+=3),(t>0||F!==a-1)&&(h.push(I,D,L),w+=3)}l.addGroup(m,w,0),m+=w}function E(y){const S=p,w=new Je,_=new v;let M=0;const F=y===!0?e:t,P=y===!0?1:-1;for(let D=1;D<=i;D++)d.push(0,g*P,0),u.push(0,P,0),f.push(.5,.5),p++;const I=p;for(let D=0;D<=i;D++){const R=D/i*c+o,U=Math.cos(R),z=Math.sin(R);_.x=F*z,_.y=g*P,_.z=F*U,d.push(_.x,_.y,_.z),u.push(0,P,0),w.x=U*.5+.5,w.y=z*.5*P+.5,f.push(w.x,w.y),p++}for(let D=0;D<i;D++){const L=S+D,R=I+D;y===!0?h.push(R,R+1,L):h.push(R+1,R,L),M+=3}l.addGroup(m,M,y===!0?1:2),m+=M}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ba(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Hc{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){qe("Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),a=0;t.push(0);for(let r=1;r<=e;r++)n=this.getPoint(r/e),a+=n.distanceTo(i),t.push(a),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let i=0;const a=n.length;let r;t?r=t:r=e*n[a-1];let o=0,c=a-1,l;for(;o<=c;)if(i=Math.floor(o+(c-o)/2),l=n[i]-r,l<0)o=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===r)return i/(a-1);const h=n[i],u=n[i+1]-h,f=(r-h)/u;return(i+f)/(a-1)}getTangent(e,t){let i=e-1e-4,a=e+1e-4;i<0&&(i=0),a>1&&(a=1);const r=this.getPoint(i),o=this.getPoint(a),c=t||(r.isVector2?new Je:new v);return c.copy(o).sub(r).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new v,i=[],a=[],r=[],o=new v,c=new Xe;for(let f=0;f<=e;f++){const p=f/e;i[f]=this.getTangentAt(p,new v)}a[0]=new v,r[0]=new v;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),a[0].crossVectors(i[0],o),r[0].crossVectors(i[0],a[0]);for(let f=1;f<=e;f++){if(a[f]=a[f-1].clone(),r[f]=r[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();const p=Math.acos(st(i[f-1].dot(i[f]),-1,1));a[f].applyMatrix4(c.makeRotationAxis(o,p))}r[f].crossVectors(i[f],a[f])}if(t===!0){let f=Math.acos(st(a[0].dot(a[e]),-1,1));f/=e,i[0].dot(o.crossVectors(a[0],a[e]))>0&&(f=-f);for(let p=1;p<=e;p++)a[p].applyMatrix4(c.makeRotationAxis(i[p],f*p)),r[p].crossVectors(i[p],a[p])}return{tangents:i,normals:a,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}}function Vc(){let s=0,e=0,t=0,n=0;function i(a,r,o,c){s=a,e=o,t=-3*a+3*r-2*o-c,n=2*a-2*r+o+c}return{initCatmullRom:function(a,r,o,c,l){i(r,o,l*(o-a),l*(c-r))},initNonuniformCatmullRom:function(a,r,o,c,l,h,d){let u=(r-a)/l-(o-a)/(l+h)+(o-r)/h,f=(o-r)/h-(c-r)/(h+d)+(c-o)/d;u*=h,f*=h,i(r,o,u,f)},calc:function(a){const r=a*a,o=r*a;return s+e*a+t*r+n*o}}}const Ql=new v,eh=new v,oo=new Vc,co=new Vc,lo=new Vc;class yr extends Hc{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new v){const n=t,i=this.points,a=i.length,r=(a-(this.closed?0:1))*e;let o=Math.floor(r),c=r-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/a)+1)*a:c===0&&o===a-1&&(o=a-2,c=1);let l,h;this.closed||o>0?l=i[(o-1)%a]:(eh.subVectors(i[0],i[1]).add(i[0]),l=eh);const d=i[o%a],u=i[(o+1)%a];if(this.closed||o+2<a?h=i[(o+2)%a]:(Ql.subVectors(i[a-1],i[a-2]).add(i[a-1]),h=Ql),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let p=Math.pow(l.distanceToSquared(d),f),b=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);b<1e-4&&(b=1),p<1e-4&&(p=b),g<1e-4&&(g=b),oo.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,p,b,g),co.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,p,b,g),lo.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,p,b,g)}else this.curveType==="catmullrom"&&(oo.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),co.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),lo.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(oo.calc(c),co.calc(c),lo.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new v().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Kf(s,e){const t=1-s;return t*t*e}function jf(s,e){return 2*(1-s)*s*e}function Yf(s,e){return s*s*e}function ho(s,e,t,n){return Kf(s,e)+jf(s,t)+Yf(s,n)}class Jf extends Hc{constructor(e=new v,t=new v){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new v){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new v){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class gc extends Hc{constructor(e=new v,t=new v,n=new v){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new v){const n=t,i=this.v0,a=this.v1,r=this.v2;return n.set(ho(e,i.x,a.x,r.x),ho(e,i.y,a.y,r.y),ho(e,i.z,a.z,r.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class _a extends St{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const a=e/2,r=t/2,o=Math.floor(n),c=Math.floor(i),l=o+1,h=c+1,d=e/o,u=t/c,f=[],p=[],b=[],g=[];for(let m=0;m<h;m++){const x=m*u-r;for(let E=0;E<l;E++){const y=E*d-a;p.push(y,-x,0),b.push(0,0,1),g.push(E/o),g.push(1-m/c)}}for(let m=0;m<c;m++)for(let x=0;x<o;x++){const E=x+l*m,y=x+l*(m+1),S=x+1+l*(m+1),w=x+1+l*m;f.push(E,y,w),f.push(y,S,w)}this.setIndex(f),this.setAttribute("position",new tt(p,3)),this.setAttribute("normal",new tt(b,3)),this.setAttribute("uv",new tt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new _a(e.width,e.height,e.widthSegments,e.heightSegments)}}class Ki extends St{constructor(e=1,t=32,n=16,i=0,a=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:a,thetaStart:r,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(r+o,Math.PI);let l=0;const h=[],d=new v,u=new v,f=[],p=[],b=[],g=[];for(let m=0;m<=n;m++){const x=[],E=m/n,y=r+E*o,S=e*Math.cos(y),w=Math.sqrt(e*e-S*S);let _=0;m===0&&r===0?_=.5/t:m===n&&c===Math.PI&&(_=-.5/t);for(let M=0;M<=t;M++){const F=M/t,P=i+F*a;d.x=-w*Math.cos(P),d.y=S,d.z=w*Math.sin(P),p.push(d.x,d.y,d.z),u.copy(d).normalize(),b.push(u.x,u.y,u.z),g.push(F+_,1-E),x.push(l++)}h.push(x)}for(let m=0;m<n;m++)for(let x=0;x<t;x++){const E=h[m][x+1],y=h[m][x],S=h[m+1][x],w=h[m+1][x+1];(m!==0||r>0)&&f.push(E,y,w),(m!==n-1||c<Math.PI)&&f.push(y,S,w)}this.setIndex(f),this.setAttribute("position",new tt(p,3)),this.setAttribute("normal",new tt(b,3)),this.setAttribute("uv",new tt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ki(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function ws(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];if(th(i))i.isRenderTargetTexture?(qe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone();else if(Array.isArray(i))if(th(i[0])){const a=[];for(let r=0,o=i.length;r<o;r++)a[r]=i[r].clone();e[t][n]=a}else e[t][n]=i.slice();else e[t][n]=i}}return e}function rn(s){const e={};for(let t=0;t<s.length;t++){const n=ws(s[t]);for(const i in n)e[i]=n[i]}return e}function th(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function Zf(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function Nd(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:lt.workingColorSpace}const $f={clone:ws,merge:rn};var Qf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ep=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ji extends Hn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Qf,this.fragmentShader=ep,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ws(e.uniforms),this.uniformsGroups=Zf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?t.uniforms[i]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[i]={type:"m4",value:r.toArray()}:t.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const n in e.uniforms){const i=e.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=t[i.value]||null;break;case"c":this.uniforms[n].value=new pe().setHex(i.value);break;case"v2":this.uniforms[n].value=new Je().fromArray(i.value);break;case"v3":this.uniforms[n].value=new v().fromArray(i.value);break;case"v4":this.uniforms[n].value=new Et().fromArray(i.value);break;case"m3":this.uniforms[n].value=new $e().fromArray(i.value);break;case"m4":this.uniforms[n].value=new Xe().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class tp extends ji{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class cn extends Hn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new pe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new pe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=pc,this.normalScale=new Je(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Gt extends cn{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Je(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return st(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new pe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new pe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new pe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(e){this._diffuseRoughness>0!=e>0&&this.version++,this._diffuseRoughness=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}get iridescenceThicknessRange(){return bs('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(e){bs('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),this.iridescenceThicknessMinimum=e[0],this.iridescenceThicknessMaximum=e[1]}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.diffuseRoughness=e.diffuseRoughness,this.diffuseRoughnessMap=e.diffuseRoughnessMap,this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum,this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class Fd extends Hn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Wu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class np extends Hn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function vi(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function Js(s){return s!==void 0&&s.inTangents!==void 0&&s.outTangents!==void 0}function ip(s){function e(i,a){return s[i]-s[a]}const t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function nh(s,e,t){const n=s.length,i=new s.constructor(n);for(let a=0,r=0;r!==n;++a){const o=t[a]*e;for(let c=0;c!==e;++c)i[r++]=s[o+c]}return i}function sp(s,e,t,n){let i=1,a=s[0];for(;a!==void 0&&a[n]===void 0;)a=s[i++];if(a===void 0)return;let r=a[n];if(r!==void 0)if(Array.isArray(r))do r=a[n],r!==void 0&&(e.push(a.time),t.push(...r)),a=s[i++];while(a!==void 0);else if(r.toArray!==void 0)do r=a[n],r!==void 0&&(e.push(a.time),r.toArray(t,t.length)),a=s[i++];while(a!==void 0);else do r=a[n],r!==void 0&&(e.push(a.time),t.push(r)),a=s[i++];while(a!==void 0)}class Rs{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],a=t[n-1];n:{e:{let r;t:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<a)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(a=i,i=t[++n],e<i)break e}r=t.length;break t}if(!(e>=a)){const o=t[1];e<o&&(n=2,a=o);for(let c=n-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=a,a=t[--n-1],e>=a)break e}r=n,n=0;break t}break n}for(;n<r;){const o=n+r>>>1;e<t[o]?r=o:n=o+1}if(i=t[n],a=t[n-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,a,i)}return this.interpolate_(n,a,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,a=e*i;for(let r=0;r!==i;++r)t[r]=n[a+r];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class ap extends Rs{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:bl,endingEnd:bl}}intervalChanged_(e,t,n){const i=this.parameterPositions;let a=e-2,r=e+1,o=i[a],c=i[r];if(o===void 0)switch(this.getSettings_().endingStart){case _l:a=e,o=2*t-n;break;case xl:a=i.length-2,o=t+i[a]-i[a+1];break;default:a=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case _l:r=e,c=2*n-t;break;case xl:r=1,c=n+i[1]-i[0];break;default:r=e-1,c=t}const l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=a*h,this._offsetNext=r*h}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,p=(n-t)/(i-t),b=p*p,g=b*p,m=-u*g+2*u*b-u*p,x=(1+u)*g+(-1.5-2*u)*b+(-.5+u)*p+1,E=(-1-f)*g+(1.5+f)*b+.5*p,y=f*g-f*b;for(let S=0;S!==o;++S)a[S]=m*r[h+S]+x*r[l+S]+E*r[c+S]+y*r[d+S];return a}}class rp extends Rs{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(i-t),d=1-h;for(let u=0;u!==o;++u)a[u]=r[l+u]*d+r[c+u]*h;return a}}class op extends Rs{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class cp extends Rs{interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this.inTangents,d=this.outTangents;if(!h||!d){const p=(n-t)/(i-t),b=1-p;for(let g=0;g!==o;++g)a[g]=r[l+g]*b+r[c+g]*p;return a}const u=o*2,f=e-1;for(let p=0;p!==o;++p){const b=r[l+p],g=r[c+p],m=f*u+p*2,x=d[m],E=d[m+1],y=e*u+p*2,S=h[y],w=h[y+1],_=hp(n,t,x,S,i);a[p]=Ud(_,b,E,w,g)}return a}}function Ud(s,e,t,n,i){const a=1-s;return a*a*a*e+3*a*a*s*t+3*a*s*s*n+s*s*s*i}function lp(s,e,t,n,i){const a=1-s;return 3*a*a*(t-e)+6*a*s*(n-t)+3*s*s*(i-n)}function hp(s,e,t,n,i){let a=(s-e)/(i-e);for(let r=0;r<8;r++){const o=Ud(a,e,t,n,i)-s;if(Math.abs(o)<1e-10)break;const c=lp(a,e,t,n,i);if(Math.abs(c)<1e-10)break;a=Math.max(0,Math.min(1,a-o/c))}return a}class Dn{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=vi(t,this.TimeBufferType),this.values=vi(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:vi(e.times,Array),values:vi(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i),Js(e.settings)&&(n.settings={inTangents:vi(e.settings.inTangents,Array),outTangents:vi(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new op(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new rp(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ap(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new cp(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case oa:t=this.InterpolantFactoryMethodDiscrete;break;case ca:t=this.InterpolantFactoryMethodLinear;break;case Ur:t=this.InterpolantFactoryMethodSmooth;break;case gl:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return qe("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return oa;case this.InterpolantFactoryMethodLinear:return ca;case this.InterpolantFactoryMethodSmooth:return Ur;case this.InterpolantFactoryMethodBezier:return gl}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e;Js(this.settings)&&(ih(this.settings.inTangents,e),ih(this.settings.outTangents,e))}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e;Js(this.settings)&&(sh(this.settings.inTangents,e),sh(this.settings.outTangents,e))}return this}trim(e,t){const n=this.times,i=n.length;let a=0,r=i-1;for(;a!==i&&n[a]<e;)++a;for(;r!==-1&&n[r]>t;)--r;if(++r,a!==0||r!==i){a>=r&&(r=Math.max(r,1),a=r-1);const o=this.getValueSize();this.times=n.slice(a,r),this.values=this.values.slice(a*o,r*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(Qe("KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,a=n.length;a===0&&(Qe("KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let o=0;o!==a;o++){const c=n[o];if(typeof c=="number"&&isNaN(c)){Qe("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(r!==null&&r>c){Qe("KeyframeTrack: Out of order keys.",this,o,c,r),e=!1;break}r=c}if(i!==void 0&&Qu(i))for(let o=0,c=i.length;o!==c;++o){const l=i[o];if(isNaN(l)){Qe("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===Ur,a=e.length-1;let r=1;for(let o=1;o<a;++o){let c=!1;const l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(i)c=!0;else{const d=o*n,u=d-n,f=d+n;for(let p=0;p!==n;++p){const b=t[d+p];if(b!==t[u+p]||b!==t[f+p]){c=!0;break}}}if(c){if(o!==r){e[r]=e[o];const d=o*n,u=r*n;for(let f=0;f!==n;++f)t[u+f]=t[d+f]}++r}}if(a>0){e[r]=e[a];for(let o=a*n,c=r*n,l=0;l!==n;++l)t[c+l]=t[o+l];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,Js(this.settings)&&(i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),i}}function ih(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]+=e}function sh(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]*=e}Dn.prototype.ValueTypeName="";Dn.prototype.TimeBufferType=Float32Array;Dn.prototype.ValueBufferType=Float32Array;Dn.prototype.DefaultInterpolation=ca;class Ps extends Dn{constructor(e,t,n){super(e,t,n)}}Ps.prototype.ValueTypeName="bool";Ps.prototype.ValueBufferType=Array;Ps.prototype.DefaultInterpolation=oa;Ps.prototype.InterpolantFactoryMethodLinear=void 0;Ps.prototype.InterpolantFactoryMethodSmooth=void 0;class kd extends Dn{constructor(e,t,n,i){super(e,t,n,i)}}kd.prototype.ValueTypeName="color";class ua extends Dn{constructor(e,t,n,i){super(e,t,n,i)}}ua.prototype.ValueTypeName="number";class dp extends Rs{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=(n-t)/(i-t);let l=e*o;for(let h=l+o;l!==h;l+=4)pt.slerpFlat(a,0,r,l-o,r,l,c);return a}}class fa extends Dn{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new dp(this.times,this.values,this.getValueSize(),e)}}fa.prototype.ValueTypeName="quaternion";fa.prototype.InterpolantFactoryMethodSmooth=void 0;class Cs extends Dn{constructor(e,t,n){super(e,t,n)}}Cs.prototype.ValueTypeName="string";Cs.prototype.ValueBufferType=Array;Cs.prototype.DefaultInterpolation=oa;Cs.prototype.InterpolantFactoryMethodLinear=void 0;Cs.prototype.InterpolantFactoryMethodSmooth=void 0;class Mr extends Dn{constructor(e,t,n,i){super(e,t,n,i)}}Mr.prototype.ValueTypeName="vector";class up{constructor(e="",t=-1,n=[],i=Hu){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=Xn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let r=0,o=n.length;r!==o;++r)t.push(pp(n[r]).scale(i));const a=new this(e.name,e.duration,t,e.blendMode);return a.uuid=e.uuid,a.userData=JSON.parse(e.userData||"{}"),a}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let a=0,r=n.length;a!==r;++a)t.push(Dn.toJSON(n[a]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const a=t.length,r=[];for(let o=0;o<a;o++){let c=[],l=[];c.push((o+a-1)%a,o,(o+1)%a),l.push(0,1,0);const h=ip(c);c=nh(c,1,h),l=nh(l,1,h),!i&&c[0]===0&&(c.push(a),l.push(l[0])),r.push(new ua(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,r)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},a=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){const l=e[o],h=l.name.match(a);if(h&&h.length>1){const d=h[1];let u=i[d];u||(i[d]=u=[]),u.push(l)}}const r=[];for(const o in i)r.push(this.CreateFromMorphTargetSequence(o,i[o],t,n));return r}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const a=this.tracks[n];t=Math.max(t,a.times[a.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function fp(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return ua;case"vector":case"vector2":case"vector3":case"vector4":return Mr;case"color":return kd;case"quaternion":return fa;case"bool":case"boolean":return Ps;case"string":return Cs}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function pp(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=fp(s.type);if(s.times===void 0){const n=[],i=[];sp(s.keys,n,i,"value"),s.times=n,s.values=i}let t;return e.parse!==void 0?t=e.parse(s):t=new e(s.name,s.times,s.values,s.interpolation),Js(s.settings)&&(t.settings={inTangents:vi(s.settings.inTangents,Float32Array),outTangents:vi(s.settings.outTangents,Float32Array)}),t}const ai={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(ah(s)||(this.files[s]=e))},get:function(s){if(this.enabled!==!1&&!ah(s))return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};function ah(s){try{const e=s.slice(s.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class mp{constructor(e,t,n){const i=this;let a=!1,r=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,a===!1&&i.onStart!==void 0&&i.onStart(h,r,o),a=!0},this.itemEnd=function(h){r++,i.onProgress!==void 0&&i.onProgress(h,r,o),r===o&&(a=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,d){return l.push(h,d),this},this.removeHandler=function(h){const d=l.indexOf(h);return d!==-1&&l.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=l.length;d<u;d+=2){const f=l[d],p=l[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const gp=new mp;class Ls{constructor(e){this.manager=e!==void 0?e:gp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,a){n.load(e,i,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}setPriority(e){return this.priority=e,this}setCache(e){return this.cache=e,this}abort(){return this}}Ls.DEFAULT_MATERIAL_NAME="__DEFAULT";const ti={};class bp extends Error{constructor(e,t){super(e),this.response=t}}class Od extends Ls{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=ai.get(`file:${e}`);if(a!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(a),this.manager.itemEnd(e)},0);return}if(ti[e]!==void 0){ti[e].push({onLoad:t,onProgress:n,onError:i});return}ti[e]=[],ti[e].push({onLoad:t,onProgress:n,onError:i});const r=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",priority:this.priority,cache:this.cache,signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,c=this.responseType;fetch(r).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&qe("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const h=ti[e],d=l.body.getReader(),u=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),f=u?parseInt(u):0,p=f!==0;let b=0;const g=new ReadableStream({start(m){x();function x(){d.read().then(({done:E,value:y})=>{if(E)m.close();else{b+=y.byteLength;const S=new ProgressEvent("progress",{lengthComputable:p,loaded:b,total:f});for(let w=0,_=h.length;w<_;w++){const M=h[w];M.onProgress&&M.onProgress(S)}m.enqueue(y),x()}},E=>{m.error(E)})}}});return new Response(g)}else throw new bp(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return l.json();default:if(o==="")return l.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return l.arrayBuffer().then(p=>f.decode(p))}}}).then(l=>{ai.add(`file:${e}`,l);const h=ti[e];delete ti[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onLoad&&f.onLoad(l)}}).catch(l=>{const h=ti[e];if(h===void 0)throw this.manager.itemError(e),l;delete ti[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onError&&f.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const os=new WeakMap;class _p extends Ls{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=ai.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)a.manager.itemStart(e),setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);else{let d=os.get(r);d===void 0&&(d=[],os.set(r,d)),d.push({onLoad:t,onError:i})}return r}const o=ha("img");function c(){h(),t&&t(this);const d=os.get(this)||[];for(let u=0;u<d.length;u++){const f=d[u];f.onLoad&&f.onLoad(this)}os.delete(this),a.manager.itemEnd(e)}function l(d){h(),i&&i(d),ai.remove(`image:${e}`);const u=os.get(this)||[];for(let f=0;f<u.length;f++){const p=u[f];p.onError&&p.onError(d)}os.delete(this),a.manager.itemError(e),a.manager.itemEnd(e)}function h(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),ai.add(`image:${e}`,o),a.manager.itemStart(e),o.fetchPriority=this.priority,o.src=e,o}}class xp extends Ls{constructor(e){super(e)}load(e,t,n,i){const a=new Yt,r=new _p(this.manager);return r.setPriority(this.priority),r.setCache(this.cache),r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(o){a.image=o,a.needsUpdate=!0,t!==void 0&&t(a)},n,i),a}}class Pr extends Pt{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new pe(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class vp extends Pr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Pt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new pe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const uo=new Xe,rh=new v,oh=new v;class Wc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Je(512,512),this.mapType=fn,this.map=null,this.mapPass=null,this.matrix=new Xe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new da,this._frameExtents=new Je(1,1),this._viewportCount=1,this._viewports=[new Et(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera;rh.setFromMatrixPosition(e.matrixWorld),t.position.copy(rh),oh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(oh),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,i){uo.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(uo,e.coordinateSystem,e.reversedDepth);const a=this._frameExtents,r=i?i.z/a.x:1,o=i?i.w/a.y:1,c=i?i.x/a.x:0,l=i?i.y/a.y:0;e.coordinateSystem===la||e.reversedDepth?t.set(.5*r,0,0,.5*r+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):t.set(.5*r,0,0,.5*r+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),t.multiply(uo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const qa=new v,Xa=new pt,In=new v;class zd extends Pt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Xe,this.projectionMatrix=new Xe,this.projectionMatrixInverse=new Xe,this.coordinateSystem=Rn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(qa,Xa,In),In.x===1&&In.y===1&&In.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(qa,Xa,In.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(qa,Xa,In),In.x===1&&In.y===1&&In.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(qa,Xa,In.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const mi=new v,ch=new Je,lh=new Je;class hn extends zd{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Ms*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ea*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ms*2*Math.atan(Math.tan(ea*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){mi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(mi.x,mi.y).multiplyScalar(-e/mi.z),mi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(mi.x,mi.y).multiplyScalar(-e/mi.z)}getViewSize(e,t){return this.getViewBounds(e,ch,lh),t.subVectors(lh,ch)}setViewOffset(e,t,n,i,a,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ea*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,a=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const c=r.fullWidth,l=r.fullHeight;a+=r.offsetX*i/c,t-=r.offsetY*n/l,i*=r.width/c,n*=r.height/l}const o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class yp extends Wc{constructor(){super(new hn(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=Ms*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,a=e.distance||t.far;(n!==t.fov||i!==t.aspect||a!==t.far)&&(t.fov=n,t.aspect=i,t.far=a,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){const e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}}class Mp extends Pr{constructor(e,t,n=0,i=Math.PI/3,a=0,r=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Pt.DEFAULT_UP),this.updateMatrix(),this.target=new Pt,this.distance=n,this.angle=i,this.penumbra=a,this.decay=r,this.map=null,this.shadow=new yp}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class Sp extends Wc{constructor(){super(new hn(90,1,.5,500)),this.isPointLightShadow=!0}}class wp extends Pr{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Sp}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class qc extends zd{constructor(e=-1,t=1,n=1,i=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let a=n-e,r=n+e,o=i+t,c=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=l*this.view.offsetX,r=a+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,r,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Ep extends Wc{constructor(){super(new qc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class bc extends Pr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Pt.DEFAULT_UP),this.updateMatrix(),this.target=new Pt,this.shadow=new Ep}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class ia{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const fo=new WeakMap;class Tp extends Ls{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&qe("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&qe("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=ai.get(`image-bitmap:${e}`);if(r!==void 0){if(a.manager.itemStart(e),r.then){r.then(l=>{fo.has(r)===!0?(i&&i(fo.get(r)),a.manager.itemError(e),a.manager.itemEnd(e)):(t&&t(l),a.manager.itemEnd(e))});return}setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);return}const o={};o.credentials=this.withCredentials||this.crossOrigin!=="anonymous"?"include":"same-origin",o.headers=this.requestHeader,o.priority=this.priority,o.cache=this.cache,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign({},a.options,{colorSpaceConversion:"none"}))}).then(function(l){return ai.add(`image-bitmap:${e}`,l),t&&t(l),a.manager.itemEnd(e),l}).catch(function(l){i&&i(l),fo.set(c,l),ai.remove(`image-bitmap:${e}`),a.manager.itemError(e),a.manager.itemEnd(e)});ai.add(`image-bitmap:${e}`,c),a.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const cs=-90,ls=1;class _c extends Pt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new hn(cs,ls,e,t);i.layers=this.layers,this.add(i);const a=new hn(cs,ls,e,t);a.layers=this.layers,this.add(a);const r=new hn(cs,ls,e,t);r.layers=this.layers,this.add(r);const o=new hn(cs,ls,e,t);o.layers=this.layers,this.add(o);const c=new hn(cs,ls,e,t);c.layers=this.layers,this.add(c);const l=new hn(cs,ls,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,a,r,o,c]=t;for(const l of t)this.remove(l);if(e===Rn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===la)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,r,o,c,l,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;const b=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,1,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,2,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.mipmapsAutoUpdate=b,e.setRenderTarget(n,5,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class Ap extends hn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}}class Rp{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Pp.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function Pp(){this._document.hidden===!1&&this.reset()}const Xc="\\[\\]\\.:\\/",Cp=new RegExp("["+Xc+"]","g"),Kc="[^"+Xc+"]",Lp="[^"+Xc.replace("\\.","")+"]",Dp=/((?:WC+[\/:])*)/.source.replace("WC",Kc),Ip=/(WCOD+)?/.source.replace("WCOD",Lp),Np=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Kc),Fp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Kc),Up=new RegExp("^"+Dp+Ip+Np+Fp+"$"),kp=["material","materials","bones","map"];class Op{constructor(e,t,n){const i=n||Mt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,a=n.length;i!==a;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class Mt{constructor(e,t,n){this.path=t,this.parsedPath=n||Mt.parseTrackName(t),this.node=Mt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new Mt.Composite(e,t,n):new Mt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Cp,"")}static parseTrackName(e){const t=Up.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const a=n.nodeName.substring(i+1);kp.indexOf(a)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=a)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(a){for(let r=0;r<a.length;r++){const o=a[r];if(o.name===t||o.uuid===t)return o;const c=n(o.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let a=t.propertyIndex;if(e||(e=Mt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){qe("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){Qe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Qe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Qe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Qe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Qe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Qe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){Qe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const r=e[i];if(r===void 0){const l=t.nodeName;Qe("PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){Qe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Qe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[a]!==void 0&&(a=e.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=a}else r.fromArray!==void 0&&r.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(c=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}Mt.Composite=Op;Mt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Mt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Mt.prototype.GetterByBindingType=[Mt.prototype._getValue_direct,Mt.prototype._getValue_array,Mt.prototype._getValue_arrayElement,Mt.prototype._getValue_toArray];Mt.prototype.SetterByBindingTypeAndVersioning=[[Mt.prototype._setValue_direct,Mt.prototype._setValue_direct_setNeedsUpdate,Mt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Mt.prototype._setValue_array,Mt.prototype._setValue_array_setNeedsUpdate,Mt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Mt.prototype._setValue_arrayElement,Mt.prototype._setValue_arrayElement_setNeedsUpdate,Mt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Mt.prototype._setValue_fromArray,Mt.prototype._setValue_fromArray_setNeedsUpdate,Mt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const hh=new Xe;class zp{constructor(e,t,n=0,i=1/0){this.ray=new As(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Uc,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Qe("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return hh.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(hh),this}intersectObject(e,t=!0,n=[]){return xc(e,this,n,t),n.sort(dh),n}intersectObjects(e,t=!0,n=[]){for(let i=0,a=e.length;i<a;i++)xc(e[i],this,n,t);return n.sort(dh),n}}function dh(s,e){return s.distance-e.distance}function xc(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const a=s.children;for(let r=0,o=a.length;r<o;r++)xc(a[r],e,t,!0)}}class ps{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=st(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(st(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const gi=new v,Ka=new Xe,po=new Xe;class Bp extends Pd{constructor(e){const t=Bd(e),n=new St,i=[],a=[];for(let l=0;l<t.length;l++){const h=t[l];h.parent&&h.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),a.push(0,0,0),a.push(0,0,0))}n.setAttribute("position",new tt(i,3)),n.setAttribute("color",new tt(a,3));const r=new Bc({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,r),this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=e,this.bones=t,this.matrix=e.matrixWorld,this.matrixAutoUpdate=!1;const o=new pe(255),c=new pe(65280);this.setColors(o,c)}updateMatrixWorld(e){const t=this.bones,n=this.geometry,i=n.getAttribute("position");po.copy(this.root.matrixWorld).invert();for(let a=0,r=0;a<t.length;a++){const o=t[a];o.parent&&o.parent.isBone&&(Ka.multiplyMatrices(po,o.matrixWorld),gi.setFromMatrixPosition(Ka),i.setXYZ(r,gi.x,gi.y,gi.z),Ka.multiplyMatrices(po,o.parent.matrixWorld),gi.setFromMatrixPosition(Ka),i.setXYZ(r+1,gi.x,gi.y,gi.z),r+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(e)}setColors(e,t){const i=this.geometry.getAttribute("color");for(let a=0;a<i.count;a+=2)i.setXYZ(a,e.r,e.g,e.b),i.setXYZ(a+1,t.r,t.g,t.b);return i.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}function Bd(s){const e=[];s.isBone===!0&&e.push(s);for(let t=0;t<s.children.length;t++)e.push(...Bd(s.children[t]));return e}class Gp extends Ri{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function uh(s,e,t,n){const i=Hp(n);switch(t){case bd:return s*e;case Rc:return s*e/i.components*i.byteLength;case Pc:return s*e/i.components*i.byteLength;case Xi:return s*e*2/i.components*i.byteLength;case Cc:return s*e*2/i.components*i.byteLength;case _d:return s*e*3/i.components*i.byteLength;case An:return s*e*4/i.components*i.byteLength;case Lc:return s*e*4/i.components*i.byteLength;case or:case cr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case lr:case hr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Oo:case Bo:return Math.max(s,16)*Math.max(e,8)/4;case ko:case zo:return Math.max(s,8)*Math.max(e,8)/2;case Go:case Ho:case Wo:case qo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Vo:case pr:case Xo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ko:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case jo:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Yo:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Jo:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Zo:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case $o:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Qo:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case ec:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case tc:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case nc:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case ic:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case sc:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case ac:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case rc:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case oc:case cc:case lc:return Math.ceil(s/4)*Math.ceil(e/4)*16;case hc:case dc:return Math.ceil(s/4)*Math.ceil(e/4)*8;case mr:case uc:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Hp(s){switch(s){case fn:case fd:return{byteLength:1,components:1};case ra:case pd:case Wn:return{byteLength:2,components:1};case Tc:case Ac:return{byteLength:2,components:4};case Vn:case Ec:case vn:return{byteLength:4,components:1};case md:case gd:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?qe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function Gd(){let s=null,e=!1,t=null,n=null;function i(a,r){n=s.requestAnimationFrame(i),t(a,r)}return{start:function(){e!==!0&&t!==null&&s!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){s=a}}}function Vp(s){const e=new WeakMap;function t(o,c){const l=o.array,h=o.usage,d=l.byteLength,u=s.createBuffer();s.bindBuffer(c,u),s.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=s.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=s.SHORT;else if(l instanceof Uint32Array)f=s.UNSIGNED_INT;else if(l instanceof Int32Array)f=s.INT;else if(l instanceof Int8Array)f=s.BYTE;else if(l instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,c,l){const h=c.array,d=c.updateRanges;if(s.bindBuffer(l,o),d.length===0)s.bufferSubData(l,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){const p=d[u],b=d[f];b.start<=p.start+p.count+1?p.count=Math.max(p.count,b.start+b.count-p.start):(++u,d[u]=b)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){const b=d[f];s.bufferSubData(l,b.start*h.BYTES_PER_ELEMENT,h,b.start,b.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(s.deleteBuffer(c.buffer),e.delete(o))}function r(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:i,remove:a,update:r}}var Wp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,qp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Xp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Kp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Yp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Jp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Zp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,$p=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Qp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,e0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,t0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,n0=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,i0=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,s0=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,a0=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,r0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,o0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,c0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,l0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,h0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,d0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,u0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,f0=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,p0=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,m0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,g0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,b0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,_0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,x0="gl_FragColor = linearToOutputTexel( gl_FragColor );",v0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,y0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,M0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,S0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,w0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,E0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,T0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,A0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,R0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,P0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,C0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,L0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,D0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,I0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,N0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,F0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,U0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,k0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,O0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,z0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,B0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,G0=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,H0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,V0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,W0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,q0=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,X0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,K0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,j0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Y0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,J0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Z0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,$0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Q0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,em=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,tm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,nm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,im=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,sm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,am=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,rm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,om=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,cm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,lm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,hm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dm=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,um=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,fm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,pm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,mm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,gm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,bm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,_m=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,xm=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,vm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ym=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Mm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Sm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,wm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Em=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Tm=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Am=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Rm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Pm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Cm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Lm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Dm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Im=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Nm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Fm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Um=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,km=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Om=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,zm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Bm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Gm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Hm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Vm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Wm=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Xm=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Km=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,jm=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ym=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Jm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Zm=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,$m=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,Qm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,eg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,ng=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ig=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,sg=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ag=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,rg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,og=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,cg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,lg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,hg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,dg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ug=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,fg=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,pg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,_g=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,xg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,vg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,yg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Mg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,rt={alphahash_fragment:Wp,alphahash_pars_fragment:qp,alphamap_fragment:Xp,alphamap_pars_fragment:Kp,alphatest_fragment:jp,alphatest_pars_fragment:Yp,aomap_fragment:Jp,aomap_pars_fragment:Zp,batching_pars_vertex:$p,batching_vertex:Qp,begin_vertex:e0,beginnormal_vertex:t0,bsdfs:n0,iridescence_fragment:i0,bumpmap_pars_fragment:s0,clipping_planes_fragment:a0,clipping_planes_pars_fragment:r0,clipping_planes_pars_vertex:o0,clipping_planes_vertex:c0,color_fragment:l0,color_pars_fragment:h0,color_pars_vertex:d0,color_vertex:u0,common:f0,defaultnormal_vertex:p0,displacementmap_pars_vertex:m0,displacementmap_vertex:g0,emissivemap_fragment:b0,emissivemap_pars_fragment:_0,colorspace_fragment:x0,colorspace_pars_fragment:v0,envmap_fragment:y0,envmap_common_pars_fragment:M0,envmap_pars_fragment:S0,envmap_pars_vertex:w0,envmap_physical_pars_fragment:F0,envmap_vertex:E0,fog_vertex:T0,fog_pars_vertex:A0,fog_fragment:R0,fog_pars_fragment:P0,gradientmap_pars_fragment:C0,lightmap_pars_fragment:L0,lights_lambert_fragment:D0,lights_lambert_pars_fragment:I0,lights_pars_begin:N0,lights_toon_fragment:U0,lights_toon_pars_fragment:k0,lights_phong_fragment:O0,lights_phong_pars_fragment:z0,lights_physical_fragment:B0,lights_physical_pars_fragment:G0,lights_fragment_begin:H0,lights_fragment_maps:V0,lights_fragment_end:W0,lightprobes_pars_fragment:q0,logdepthbuf_fragment:X0,logdepthbuf_pars_fragment:K0,logdepthbuf_pars_vertex:j0,logdepthbuf_vertex:Y0,map_fragment:J0,map_pars_fragment:Z0,map_particle_fragment:$0,map_particle_pars_fragment:Q0,metalnessmap_fragment:em,metalnessmap_pars_fragment:tm,morphinstance_vertex:nm,morphcolor_vertex:im,morphnormal_vertex:sm,morphtarget_pars_vertex:am,morphtarget_vertex:rm,normal_fragment_begin:om,normal_fragment_maps:cm,normal_pars_fragment:lm,normal_pars_vertex:hm,normal_vertex:dm,normalmap_pars_fragment:um,clearcoat_normal_fragment_begin:fm,clearcoat_normal_fragment_maps:pm,clearcoat_pars_fragment:mm,iridescence_pars_fragment:gm,opaque_fragment:bm,packing:_m,premultiplied_alpha_fragment:xm,project_vertex:vm,dithering_fragment:ym,dithering_pars_fragment:Mm,roughnessmap_fragment:Sm,roughnessmap_pars_fragment:wm,shadowmap_pars_fragment:Em,shadowmap_pars_vertex:Tm,shadowmap_vertex:Am,shadowmask_pars_fragment:Rm,skinbase_vertex:Pm,skinning_pars_vertex:Cm,skinning_vertex:Lm,skinnormal_vertex:Dm,specularmap_fragment:Im,specularmap_pars_fragment:Nm,tonemapping_fragment:Fm,tonemapping_pars_fragment:Um,transmission_fragment:km,transmission_pars_fragment:Om,uv_pars_fragment:zm,uv_pars_vertex:Bm,uv_vertex:Gm,worldpos_vertex:Hm,background_vert:Vm,background_frag:Wm,backgroundCube_vert:qm,backgroundCube_frag:Xm,cube_vert:Km,cube_frag:jm,depth_vert:Ym,depth_frag:Jm,distance_vert:Zm,distance_frag:$m,equirect_vert:Qm,equirect_frag:eg,linedashed_vert:tg,linedashed_frag:ng,meshbasic_vert:ig,meshbasic_frag:sg,meshlambert_vert:ag,meshlambert_frag:rg,meshmatcap_vert:og,meshmatcap_frag:cg,meshnormal_vert:lg,meshnormal_frag:hg,meshphong_vert:dg,meshphong_frag:ug,meshphysical_vert:fg,meshphysical_frag:pg,meshtoon_vert:mg,meshtoon_frag:gg,points_vert:bg,points_frag:_g,shadow_vert:xg,shadow_frag:vg,sprite_vert:yg,sprite_frag:Mg},Ie={common:{diffuse:{value:new pe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new $e}},envmap:{envMap:{value:null},envMapRotation:{value:new $e},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new $e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new $e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new $e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new $e},normalScale:{value:new Je(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new $e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new $e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new $e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new $e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new pe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new pe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0},uvTransform:{value:new $e}},sprite:{diffuse:{value:new pe(16777215)},opacity:{value:1},center:{value:new Je(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}}},On={basic:{uniforms:rn([Ie.common,Ie.specularmap,Ie.envmap,Ie.aomap,Ie.lightmap,Ie.fog]),vertexShader:rt.meshbasic_vert,fragmentShader:rt.meshbasic_frag},lambert:{uniforms:rn([Ie.common,Ie.specularmap,Ie.envmap,Ie.aomap,Ie.lightmap,Ie.emissivemap,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,Ie.fog,Ie.lights,{emissive:{value:new pe(0)},envMapIntensity:{value:1}}]),vertexShader:rt.meshlambert_vert,fragmentShader:rt.meshlambert_frag},phong:{uniforms:rn([Ie.common,Ie.specularmap,Ie.envmap,Ie.aomap,Ie.lightmap,Ie.emissivemap,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,Ie.fog,Ie.lights,{emissive:{value:new pe(0)},specular:{value:new pe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:rt.meshphong_vert,fragmentShader:rt.meshphong_frag},standard:{uniforms:rn([Ie.common,Ie.envmap,Ie.aomap,Ie.lightmap,Ie.emissivemap,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,Ie.roughnessmap,Ie.metalnessmap,Ie.fog,Ie.lights,{emissive:{value:new pe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag},toon:{uniforms:rn([Ie.common,Ie.aomap,Ie.lightmap,Ie.emissivemap,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,Ie.gradientmap,Ie.fog,Ie.lights,{emissive:{value:new pe(0)}}]),vertexShader:rt.meshtoon_vert,fragmentShader:rt.meshtoon_frag},matcap:{uniforms:rn([Ie.common,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,Ie.fog,{matcap:{value:null}}]),vertexShader:rt.meshmatcap_vert,fragmentShader:rt.meshmatcap_frag},points:{uniforms:rn([Ie.points,Ie.fog]),vertexShader:rt.points_vert,fragmentShader:rt.points_frag},dashed:{uniforms:rn([Ie.common,Ie.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:rt.linedashed_vert,fragmentShader:rt.linedashed_frag},depth:{uniforms:rn([Ie.common,Ie.displacementmap]),vertexShader:rt.depth_vert,fragmentShader:rt.depth_frag},normal:{uniforms:rn([Ie.common,Ie.bumpmap,Ie.normalmap,Ie.displacementmap,{opacity:{value:1}}]),vertexShader:rt.meshnormal_vert,fragmentShader:rt.meshnormal_frag},sprite:{uniforms:rn([Ie.sprite,Ie.fog]),vertexShader:rt.sprite_vert,fragmentShader:rt.sprite_frag},background:{uniforms:{uvTransform:{value:new $e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:rt.background_vert,fragmentShader:rt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new $e}},vertexShader:rt.backgroundCube_vert,fragmentShader:rt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:rt.cube_vert,fragmentShader:rt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:rt.equirect_vert,fragmentShader:rt.equirect_frag},distance:{uniforms:rn([Ie.common,Ie.displacementmap,{referencePosition:{value:new v},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:rt.distance_vert,fragmentShader:rt.distance_frag},shadow:{uniforms:rn([Ie.lights,Ie.fog,{color:{value:new pe(0)},opacity:{value:1}}]),vertexShader:rt.shadow_vert,fragmentShader:rt.shadow_frag}};On.physical={uniforms:rn([On.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new $e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new $e},clearcoatNormalScale:{value:new Je(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new $e},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new $e},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new $e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new $e},sheen:{value:0},sheenColor:{value:new pe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new $e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new $e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new $e},transmissionSamplerSize:{value:new Je},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new $e},attenuationDistance:{value:0},attenuationColor:{value:new pe(0)},specularColor:{value:new pe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new $e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new $e},anisotropyVector:{value:new Je},anisotropyMap:{value:null},anisotropyMapTransform:{value:new $e}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag};const ja={r:0,b:0,g:0},Sg=new Xe,Hd=new $e;Hd.set(-1,0,0,0,1,0,0,0,1);function wg(s,e,t,n,i,a){const r=new pe(0);let o=i===!0?0:1,c,l,h=null,d=0,u=null;function f(x){let E=x.isScene===!0?x.background:null;if(E&&E.isTexture){const y=x.backgroundBlurriness>0;E=e.get(E,y)}return E}function p(x){let E=!1;const y=f(x);y===null?g(r,o):y&&y.isColor&&(g(y,1),E=!0);const S=s.xr.getEnvironmentBlendMode();S==="additive"?t.buffers.color.setClear(0,0,0,1,a):S==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(s.autoClear||E)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function b(x,E){const y=f(E);y&&y.isCubeTexture?(l===void 0&&(l=new Ft(new ga(1,1,1),new ji({name:"BackgroundCubeMaterial",uniforms:ws(On.backgroundCube.uniforms),vertexShader:On.backgroundCube.vertexShader,fragmentShader:On.backgroundCube.fragmentShader,side:on,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(S,w,_){this.matrixWorld.copyPosition(_.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=y,l.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Sg.makeRotationFromEuler(E.backgroundRotation)).transpose(),y.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Hd),l.material.toneMapped=lt.getTransfer(y.colorSpace)!==yt,(h!==y||d!==y.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=y,d=y.version,u=s.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null)):y&&y.isTexture&&(c===void 0&&(c=new Ft(new _a(2,2),new ji({name:"BackgroundMaterial",uniforms:ws(On.background.uniforms),vertexShader:On.background.vertexShader,fragmentShader:On.background.fragmentShader,side:Ti,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=y,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.toneMapped=lt.getTransfer(y.colorSpace)!==yt,y.matrixAutoUpdate===!0&&y.updateMatrix(),c.material.uniforms.uvTransform.value.copy(y.matrix),(h!==y||d!==y.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=y,d=y.version,u=s.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null))}function g(x,E){x.getRGB(ja,Nd(s)),t.buffers.color.setClear(ja.r,ja.g,ja.b,E,a)}function m(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return r},setClearColor:function(x,E=1){r.set(x),o=E,g(r,o)},getClearAlpha:function(){return o},setClearAlpha:function(x){o=x,g(r,o)},render:p,addToRenderList:b,dispose:m}}function Eg(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let a=i,r=!1;function o(I,D,L,R,U){let z=!1;const N=d(I,R,L,D);a!==N&&(a=N,l(a.object)),z=f(I,R,L,U),z&&p(I,R,L,U),U!==null&&e.update(U,s.ELEMENT_ARRAY_BUFFER),(z||r)&&(r=!1,y(I,D,L,R),U!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(U).buffer))}function c(){return s.createVertexArray()}function l(I){return s.bindVertexArray(I)}function h(I){return s.deleteVertexArray(I)}function d(I,D,L,R){const U=R.wireframe===!0;let z=n[D.id];z===void 0&&(z={},n[D.id]=z);const N=I.isInstancedMesh===!0?I.id:0;let B=z[N];B===void 0&&(B={},z[N]=B);let k=B[L.id];k===void 0&&(k={},B[L.id]=k);let V=k[U];return V===void 0&&(V=u(c()),k[U]=V),V}function u(I){const D=[],L=[],R=[];for(let U=0;U<t;U++)D[U]=0,L[U]=0,R[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:L,attributeDivisors:R,object:I,attributes:{},index:null}}function f(I,D,L,R){const U=a.attributes,z=D.attributes;let N=0;const B=L.getAttributes();for(const k in B)if(B[k].location>=0){const X=U[k];let Y=z[k];if(Y===void 0&&(k==="instanceMatrix"&&I.instanceMatrix&&(Y=I.instanceMatrix),k==="instanceColor"&&I.instanceColor&&(Y=I.instanceColor)),X===void 0||X.attribute!==Y||Y&&X.data!==Y.data)return!0;N++}return a.attributesNum!==N||a.index!==R}function p(I,D,L,R){const U={},z=D.attributes;let N=0;const B=L.getAttributes();for(const k in B)if(B[k].location>=0){let X=z[k];X===void 0&&(k==="instanceMatrix"&&I.instanceMatrix&&(X=I.instanceMatrix),k==="instanceColor"&&I.instanceColor&&(X=I.instanceColor));const Y={};Y.attribute=X,X&&X.data&&(Y.data=X.data),U[k]=Y,N++}a.attributes=U,a.attributesNum=N,a.index=R}function b(){const I=a.newAttributes;for(let D=0,L=I.length;D<L;D++)I[D]=0}function g(I){m(I,0)}function m(I,D){const L=a.newAttributes,R=a.enabledAttributes,U=a.attributeDivisors;L[I]=1,R[I]===0&&(s.enableVertexAttribArray(I),R[I]=1),U[I]!==D&&(s.vertexAttribDivisor(I,D),U[I]=D)}function x(){const I=a.newAttributes,D=a.enabledAttributes;for(let L=0,R=D.length;L<R;L++)D[L]!==I[L]&&(s.disableVertexAttribArray(L),D[L]=0)}function E(I,D,L,R,U,z,N){N===!0?s.vertexAttribIPointer(I,D,L,U,z):s.vertexAttribPointer(I,D,L,R,U,z)}function y(I,D,L,R){b();const U=R.attributes,z=L.getAttributes(),N=D.defaultAttributeValues;for(const B in z){const k=z[B];if(k.location>=0){let V=U[B];if(V===void 0&&(B==="instanceMatrix"&&I.instanceMatrix&&(V=I.instanceMatrix),B==="instanceColor"&&I.instanceColor&&(V=I.instanceColor)),V!==void 0){const X=V.normalized,Y=V.itemSize,de=e.get(V);if(de===void 0)continue;const W=de.buffer,J=de.type,te=de.bytesPerElement,ce=J===s.INT||J===s.UNSIGNED_INT||V.gpuType===Ec;if(V.isInterleavedBufferAttribute){const ee=V.data,ye=ee.isInterleavedBuffer===!0?ee.stride:ee.itemSize,_e=V.offset;if(ee.isInstancedInterleavedBuffer||ee.isInstancedBufferAttribute){for(let fe=0;fe<k.locationSize;fe++)m(k.location+fe,ee.meshPerAttribute);I.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let fe=0;fe<k.locationSize;fe++)g(k.location+fe);s.bindBuffer(s.ARRAY_BUFFER,W);for(let fe=0;fe<k.locationSize;fe++)E(k.location+fe,Y/k.locationSize,J,X,ye*te,(_e+Y/k.locationSize*fe)*te,ce)}else{if(V.isInstancedBufferAttribute){for(let ee=0;ee<k.locationSize;ee++)m(k.location+ee,V.meshPerAttribute);I.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=V.meshPerAttribute*V.count)}else for(let ee=0;ee<k.locationSize;ee++)g(k.location+ee);s.bindBuffer(s.ARRAY_BUFFER,W);for(let ee=0;ee<k.locationSize;ee++)E(k.location+ee,Y/k.locationSize,J,X,Y*te,Y/k.locationSize*ee*te,ce)}}else if(N!==void 0){const X=N[B];if(X!==void 0)switch(X.length){case 2:s.vertexAttrib2fv(k.location,X);break;case 3:s.vertexAttrib3fv(k.location,X);break;case 4:s.vertexAttrib4fv(k.location,X);break;default:s.vertexAttrib1fv(k.location,X)}}}}x()}function S(){F();for(const I in n){const D=n[I];for(const L in D){const R=D[L];for(const U in R){const z=R[U];for(const N in z)h(z[N].object),delete z[N];delete R[U]}}delete n[I]}}function w(I){if(n[I.id]===void 0)return;const D=n[I.id];for(const L in D){const R=D[L];for(const U in R){const z=R[U];for(const N in z)h(z[N].object),delete z[N];delete R[U]}}delete n[I.id]}function _(I){for(const D in n){const L=n[D];for(const R in L){const U=L[R];if(U[I.id]===void 0)continue;const z=U[I.id];for(const N in z)h(z[N].object),delete z[N];delete U[I.id]}}}function M(I){for(const D in n){const L=n[D],R=I.isInstancedMesh===!0?I.id:0,U=L[R];if(U!==void 0){for(const z in U){const N=U[z];for(const B in N)h(N[B].object),delete N[B];delete U[z]}delete L[R],Object.keys(L).length===0&&delete n[D]}}}function F(){P(),r=!0,a!==i&&(a=i,l(a.object))}function P(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:F,resetDefaultState:P,dispose:S,releaseStatesOfGeometry:w,releaseStatesOfObject:M,releaseStatesOfProgram:_,initAttributes:b,enableAttribute:g,disableUnusedAttributes:x}}function Tg(s,e,t){let n;function i(c){n=c}function a(c,l){s.drawArrays(n,c,l),t.update(l,n,1)}function r(c,l,h){h!==0&&(s.drawArraysInstanced(n,c,l,h),t.update(l,n,h))}function o(c,l,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let u=0;for(let f=0;f<h;f++)u+=l[f];t.update(u,n,1)}this.setMode=i,this.render=a,this.renderInstances=r,this.renderMultiDraw=o}function Ag(s,e,t,n){let i;function a(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const _=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(_){return!(_!==An&&n.convert(_)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(_){const M=_===Wn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(_!==fn&&_!==vn&&!M&&n.convert(_)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function c(_){if(_==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";_="mediump"}return _==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(qe("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),u=t.logarithmicDepthBuffer===!0&&d===!1;t.reversedDepthBuffer===!0&&d===!1&&qe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),t.logarithmicDepthBuffer===!0&&d===!0&&qe("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");const f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),x=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),E=s.getParameter(s.MAX_VARYING_VECTORS),y=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),S=s.getParameter(s.MAX_SAMPLES),w=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:p,maxTextureSize:b,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:x,maxVaryings:E,maxFragmentUniforms:y,maxSamples:S,samples:w}}function Rg(s){const e=this;let t=null,n=0,i=!1,a=!1;const r=new ni,o=new $e,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){a=!0,h(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const p=d.clippingPlanes,b=d.clipIntersection,g=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||a&&!g)a?h(null):l();else{const x=a?0:n,E=x*4;let y=m.clippingState||null;c.value=y,y=h(p,u,E,f);for(let S=0;S!==E;++S)y[S]=t[S];m.clippingState=y,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=x}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,p){const b=d!==null?d.length:0;let g=null;if(b!==0){if(g=c.value,p!==!0||g===null){const m=f+b*4,x=u.matrixWorldInverse;o.getNormalMatrix(x),(g===null||g.length<m)&&(g=new Float32Array(m));for(let E=0,y=f;E!==b;++E,y+=4)r.copy(d[E]).applyMatrix4(x,o),r.normal.toArray(g,y),g[y+3]=r.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=b,e.numIntersection=0,g}}class jc extends Gn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Ld(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new ga(5,5,5),a=new ji({name:"CubemapFromEquirect",uniforms:ws(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:on,blending:gs});a.uniforms.tEquirect.value=t;const r=new Ft(i,a),o=t.minFilter;return t.minFilter===Bn&&(t.minFilter=jt),new _c(1,10,this).update(e,r),t.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const a=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,n,i);e.setRenderTarget(a)}}const fh=256,Pg=3,Cg=20,Vd=256,Wd=16,Lg=3,Dg=new v,Ig=new pe;class pa{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new _c(1,10,null),this._boxMesh=new Ft(new ga(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,i=100,a={}){const{size:r=256,position:o=Dg}=a,c=this._renderer;this._setSize(r);const l=this._allocateTarget(),h=this._getSourceTarget(!0);t>0&&(h.texture.mipmapsAutoUpdate=!1);const d=c.autoClear,u=c.autoClearColor,f=c.autoClearDepth,p=c.autoClearStencil,b=e.background;c.autoClear=!0,c.autoClearColor=!0,c.autoClearDepth=!0,c.autoClearStencil=!0,b===null&&(e.background=c.getClearColor(Ig));const g=new _c(n,i,h);return g.position.copy(o),g.update(c,e),c.autoClear=d,c.autoClearColor=u,c.autoClearDepth=f,c.autoClearStencil=p,e.background=b,t>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(l,t)),this._applyPMREM(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=gh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=mh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(fh,Ed(e))}_fromTexture(e,t){e.mapping===vs||e.mapping===aa?this._setSize(e.image.length===0?fh:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);const n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){const e=this._cubeSize,t=ph(e,!1,!1),n=Math.log2(e)-Pg;for(let i=0;i<=n;i++)t.texture.mipmaps.push({width:e>>i,height:e>>i});return t.texture.name="PMREM",t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){const t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=ph(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){const i=this._boxMesh,a=this._cubeCamera;i.material=n,a.renderTarget=e,a.activeMipmapLevel=t;const r=e.width>>t;e.viewport.set(0,0,r,r),a.update(this._renderer,i),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===vs||e.mapping===aa?(this._cubemapMaterial===null&&(this._cubemapMaterial=gh()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=mh()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=Ng(),this._integrationMaterial=Fg());const t=this._cubeSize,n=e.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;const a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(t/Wd);for(let r=0;r<=n;r++){const o=pa.lodToRoughness(r,n);if(r>n-Lg)a.roughness.value=o,this._renderCube(e,r,this._integrationMaterial);else{const c=o>0?Math.log2(t)+.5*Math.log2(6/(Vd*Math.pow(o,4)))+.5:0;i.roughness.value=o,i.lodBias.value=c,this._renderCube(e,r,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=Ug());const n=this._blurMaterial,i=n.uniforms,a=this._sourceTarget;i.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,i.envMap.value=a.texture,this._renderCube(e,0,n),i.envMap.value=e.texture,this._renderCube(a,0,n)}}function ph(s,e,t){return new jc(s,{minFilter:Bn,generateMipmaps:e,type:Wn,colorSpace:mn,depthBuffer:t})}function xa(s,e,t){return new ji({name:s,uniforms:e,vertexShader:rt.cube_vert,fragmentShader:t,side:on,blending:gs,depthTest:!1,depthWrite:!1})}function Ng(){return xa("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Vd}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Fg(){return xa("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Wd}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Ug(){return xa("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Cg}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function mh(){return xa("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function gh(){return xa("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function kg(s){let e=new WeakMap,t=new WeakMap,n=null;function i(u,f=!1){return u==null?null:f?r(u):a(u)}function a(u){if(u&&u.isTexture){const f=u.mapping;if(f===Nr||f===Fr)if(e.has(u)){const p=e.get(u).texture;return o(p,u.mapping)}else{const p=u.image;if(p&&p.height>0){const b=new jc(p.height);return b.fromEquirectangularTexture(s,u),e.set(u,b),u.addEventListener("dispose",l),o(b.texture,u.mapping)}else return null}}return u}function r(u){if(u&&u.isTexture&&u.isPMREMTexture!==!0){const f=u.mapping,p=f===Nr||f===Fr,b=f===vs||f===aa;if(p||b){let g=t.get(u);const m=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new pa(s)),g=p?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{const x=u.image;return p&&x&&x.height>0||b&&x&&c(x)?(n===null&&(n=new pa(s)),g=p?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===Nr?u.mapping=vs:f===Fr&&(u.mapping=aa),u}function c(u){let f=0;const p=6;for(let b=0;b<p;b++)u[b]!==void 0&&f++;return f===p}function l(u){const f=u.target;f.removeEventListener("dispose",l);const p=e.get(f);p!==void 0&&(e.delete(f),p.dispose())}function h(u){const f=u.target;f.removeEventListener("dispose",h);const p=t.get(f);p!==void 0&&(t.delete(f),p.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:d}}function Og(s){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=s.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&bs("WebGLRenderer: "+n+" extension not supported."),i}}}function zg(s,e,t,n){const i={},a=new WeakMap,r=new FinalizationRegistry(p=>delete i[p]);function o(p){c(p.target)}function c(p){p.index!==null&&e.remove(p.index);for(const g in p.attributes)e.remove(p.attributes[g]);p.removeEventListener("dispose",o),delete i[p.id],r.unregister(p);const b=a.get(p);b&&(e.remove(b),a.delete(p)),n.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function l(p,b){return i[b.id]!==void 0||(b.addEventListener("dispose",o),i[b.id]=new WeakRef(b),r.register(b,b.id,b),t.memory.geometries++),b}function h(p){const b=p.attributes;for(const g in b)e.update(b[g],s.ARRAY_BUFFER)}function d(p){const b=p.index,g=p.attributes.position;let m=0;if(g===void 0)return;const x=b!==null?b.array.length:g.array.length/3-1,E=g.count>=65535?Rd:Tr,y=new E(Math.ceil(x/3)*6,1),S=y.array;if(b!==null){const _=b.array;m=b.version;for(let M=0,F=0;M<x;M+=3){const P=_[M+0],I=_[M+1],D=_[M+2];S[F++]=P,S[F++]=I,S[F++]=I,S[F++]=D,S[F++]=D,S[F++]=P}}else{m=g.version;for(let _=0,M=0;_<x;_+=3){const F=_+0,P=_+1,I=_+2;S[M++]=F,S[M++]=P,S[M++]=P,S[M++]=I,S[M++]=I,S[M++]=F}}y.version=m;const w=a.get(p);w&&e.remove(w),a.set(p,y)}function u(p){const b=a.get(p);if(b){const g=p.index;g!==null&&b.version<g.version&&d(p)}else d(p);return a.get(p)}function f(){for(const p in i){const b=i[p].deref();b!==void 0&&c(b)}}return{get:l,update:h,getWireframeAttribute:u,dispose:f}}function Bg(s,e,t){let n;function i(d){n=d}let a,r;function o(d){a=d.type,r=d.bytesPerElement}function c(d,u){s.drawElements(n,u,a,d*r),t.update(u,n,1)}function l(d,u,f){f!==0&&(s.drawElementsInstanced(n,u,a,d*r,f),t.update(u,n,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,a,d,0,f);let b=0;for(let g=0;g<f;g++)b+=u[g];t.update(b,n,1)}this.setMode=i,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function Gg(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(a,r,o){switch(t.calls++,r){case s.TRIANGLES:t.triangles+=o*(a/3);break;case s.LINES:t.lines+=o*(a/2);break;case s.LINE_STRIP:t.lines+=o*(a-1);break;case s.LINE_LOOP:t.lines+=o*a;break;case s.POINTS:t.points+=o*a;break;default:Qe("WebGLInfo: Unknown draw mode:",r);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Hg(s,e,t){const n=new WeakMap,i=new Et;function a(r,o,c){const l=r.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(o);if(u===void 0||u.count!==d){let F=function(){_.dispose(),n.delete(o),o.removeEventListener("dispose",F)};u!==void 0&&u.texture.dispose();const f=o.morphAttributes.position!==void 0,p=o.morphAttributes.normal!==void 0,b=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],x=o.morphAttributes.color||[];let E=0;f===!0&&(E=1),p===!0&&(E=2),b===!0&&(E=3);let y=o.attributes.position.count*E,S=1;y>e.maxTextureSize&&(S=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);const w=new Float32Array(y*S*4*d),_=new Td(w,y,S,d);_.type=vn,_.needsUpdate=!0;const M=E*4;for(let P=0;P<d;P++){const I=g[P],D=m[P],L=x[P],R=y*S*4*P;for(let U=0;U<I.count;U++){const z=U*M;f===!0&&(i.fromBufferAttribute(I,U),w[R+z+0]=i.x,w[R+z+1]=i.y,w[R+z+2]=i.z,w[R+z+3]=0),p===!0&&(i.fromBufferAttribute(D,U),w[R+z+4]=i.x,w[R+z+5]=i.y,w[R+z+6]=i.z,w[R+z+7]=0),b===!0&&(i.fromBufferAttribute(L,U),w[R+z+8]=i.x,w[R+z+9]=i.y,w[R+z+10]=i.z,w[R+z+11]=L.itemSize===4?i.w:1)}}u={count:d,texture:_,size:new Je(y,S)},n.set(o,u),o.addEventListener("dispose",F)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",r.morphTexture,t);else{let f=0;for(let b=0;b<l.length;b++)f+=l[b];const p=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(s,"morphTargetBaseInfluence",p),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",u.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:a}}function Vg(s,e,t,n,i){let a=new WeakMap;function r(l){const h=i.render.frame,d=l.geometry,u=e.get(l,d);if(a.get(u)!==h&&(e.update(u),a.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),a.get(l)!==h&&(t.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,s.ARRAY_BUFFER),a.set(l,h))),l.isSkinnedMesh){const f=l.skeleton;a.get(f)!==h&&(f.update(),a.set(f,h))}return u}function o(){a=new WeakMap}function c(l){const h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:r,dispose:o}}const Wg={[ad]:"LINEAR_TONE_MAPPING",[rd]:"REINHARD_TONE_MAPPING",[od]:"CINEON_TONE_MAPPING",[cd]:"ACES_FILMIC_TONE_MAPPING",[hd]:"AGX_TONE_MAPPING",[wc]:"NEUTRAL_TONE_MAPPING",[ld]:"CUSTOM_TONE_MAPPING"};function qg(s,e,t,n,i,a){const r=new Gn(e,t,{type:s,depthBuffer:i,stencilBuffer:a,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let o=null,c=null,l=null;const h=new St;h.setAttribute("position",new tt([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new tt([0,2,0,0,2,0],2));const d=new tp({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new Ft(h,d),f=new qc(-1,1,1,-1,0,1);let p=null,b=null,g=!1,m,x=null,E=[],y=!1;this.setSize=function(S,w){r.setSize(S,w),o!==null&&o.setSize(S,w),c!==null&&c.setSize(S,w);for(let _=0;_<E.length;_++){const M=E[_];M.setSize&&M.setSize(S,w)}},this.setEffects=function(S){E=S,y=E.length>0&&E[0].isRenderPass===!0;const w=r.width,_=r.height;E.length>0&&o===null&&(o=new Gn(w,_,{type:Wn,depthBuffer:!1,stencilBuffer:!1}),c=new Gn(w,_,{type:Wn,depthBuffer:!1,stencilBuffer:!1}));const M=i===!0&&E.some(F=>F.needsDepthTexture===!0);M!==(r.depthTexture!==null)&&(M===!0&&l===null&&(l=new Ss(w,_),a===!0&&(l.format=Mi,l.type=ys)),r.dispose(),r.depthTexture=M?l:null,r.resolveDepthBuffer=M,r.storeMultisampledDepthBuffer=M);for(let F=0;F<E.length;F++){const P=E[F];P.setSize&&P.setSize(w,_),M&&P.needsDepthTexture===!0&&P.setDepthTexture&&P.setDepthTexture(l)}},this.begin=function(S,w){if(g||S.toneMapping===ri&&E.length===0)return!1;if(x=w,w!==null){const _=w.width,M=w.height;(r.width!==_||r.height!==M)&&this.setSize(_,M)}return y===!1&&S.setRenderTarget(r),m=S.toneMapping,S.toneMapping=ri,!0},this.hasRenderPass=function(){return y},this.end=function(S,w){S.toneMapping=m,g=!0;let _=r,M=o;for(let F=0;F<E.length;F++){const P=E[F];P.enabled!==!1&&(P.render(S,M,_,w),P.needsSwap!==!1&&(_=M,M=M===o?c:o))}if(p!==S.outputColorSpace||b!==S.toneMapping){p=S.outputColorSpace,b=S.toneMapping,d.defines={},lt.getTransfer(p)===yt&&(d.defines.SRGB_TRANSFER="");const F=Wg[b];F&&(d.defines[F]=""),d.needsUpdate=!0}d.uniforms.tDiffuse.value=_.texture,S.setRenderTarget(x),S.render(u,f),x=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){r.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),h.dispose(),d.dispose()}}const qd=new Yt,Xd=new Ss(1,1),Kd=new Dd(1),jd=new Td,Yd=new wf,Jd=new Ld,bh=[],_h=[],xh=new Float32Array(16),vh=new Float32Array(9),yh=new Float32Array(4);function Ds(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let a=bh[i];if(a===void 0&&(a=new Float32Array(i),bh[i]=a),e!==0){n.toArray(a,0);for(let r=1,o=0;r!==e;++r)o+=t,s[r].toArray(a,o)}return a}function Ht(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function Vt(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function Cr(s,e){let t=_h[e];t===void 0&&(t=new Int32Array(e),_h[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function Xg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function Kg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;s.uniform2fv(this.addr,e),Vt(t,e)}}function jg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ht(t,e))return;s.uniform3fv(this.addr,e),Vt(t,e)}}function Yg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;s.uniform4fv(this.addr,e),Vt(t,e)}}function Jg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Vt(t,e)}else{if(Ht(t,n))return;yh.set(n),s.uniformMatrix2fv(this.addr,!1,yh),Vt(t,n)}}function Zg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Vt(t,e)}else{if(Ht(t,n))return;vh.set(n),s.uniformMatrix3fv(this.addr,!1,vh),Vt(t,n)}}function $g(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ht(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Vt(t,e)}else{if(Ht(t,n))return;xh.set(n),s.uniformMatrix4fv(this.addr,!1,xh),Vt(t,n)}}function Qg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function eb(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;s.uniform2iv(this.addr,e),Vt(t,e)}}function tb(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ht(t,e))return;s.uniform3iv(this.addr,e),Vt(t,e)}}function nb(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;s.uniform4iv(this.addr,e),Vt(t,e)}}function ib(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function sb(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ht(t,e))return;s.uniform2uiv(this.addr,e),Vt(t,e)}}function ab(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ht(t,e))return;s.uniform3uiv(this.addr,e),Vt(t,e)}}function rb(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ht(t,e))return;s.uniform4uiv(this.addr,e),Vt(t,e)}}function Lr(s){return s.version===0&&(s.compareFunction=Md,s.needsUpdate=!0),s}function ob(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let a;this.type===s.SAMPLER_2D_SHADOW?a=Lr(Xd):a=qd,t.setTexture2D(e||a,i)}function cb(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Yd,i)}function lb(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let a;this.type===s.SAMPLER_CUBE_SHADOW?a=Lr(Kd):a=Jd,t.setTextureCube(e||a,i)}function hb(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||jd,i)}function db(s){switch(s){case 5126:return Xg;case 35664:return Kg;case 35665:return jg;case 35666:return Yg;case 35674:return Jg;case 35675:return Zg;case 35676:return $g;case 5124:case 35670:return Qg;case 35667:case 35671:return eb;case 35668:case 35672:return tb;case 35669:case 35673:return nb;case 5125:return ib;case 36294:return sb;case 36295:return ab;case 36296:return rb;case 35678:case 36198:case 36298:case 36306:case 35682:return ob;case 35679:case 36299:case 36307:return cb;case 35680:case 36300:case 36308:case 36293:return lb;case 36289:case 36303:case 36311:case 36292:return hb}}function ub(s,e){s.uniform1fv(this.addr,e)}function fb(s,e){const t=Ds(e,this.size,2);s.uniform2fv(this.addr,t)}function pb(s,e){const t=Ds(e,this.size,3);s.uniform3fv(this.addr,t)}function mb(s,e){const t=Ds(e,this.size,4);s.uniform4fv(this.addr,t)}function gb(s,e){const t=Ds(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function bb(s,e){const t=Ds(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function _b(s,e){const t=Ds(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function xb(s,e){s.uniform1iv(this.addr,e)}function vb(s,e){s.uniform2iv(this.addr,e)}function yb(s,e){s.uniform3iv(this.addr,e)}function Mb(s,e){s.uniform4iv(this.addr,e)}function Sb(s,e){s.uniform1uiv(this.addr,e)}function wb(s,e){s.uniform2uiv(this.addr,e)}function Eb(s,e){s.uniform3uiv(this.addr,e)}function Tb(s,e){s.uniform4uiv(this.addr,e)}function Ab(s,e,t){const n=this.cache,i=e.length,a=Cr(t,i);Ht(n,a)||(s.uniform1iv(this.addr,a),Vt(n,a));let r;this.type===s.SAMPLER_2D_SHADOW?r=Lr(Xd):r=qd;for(let o=0;o!==i;++o)t.setTexture2D(e[o]||r,a[o])}function Rb(s,e,t){const n=this.cache,i=e.length,a=Cr(t,i);Ht(n,a)||(s.uniform1iv(this.addr,a),Vt(n,a));for(let r=0;r!==i;++r)t.setTexture3D(e[r]||Yd,a[r])}function Pb(s,e,t){const n=this.cache,i=e.length,a=Cr(t,i);Ht(n,a)||(s.uniform1iv(this.addr,a),Vt(n,a));let r;this.type===s.SAMPLER_CUBE_SHADOW?r=Lr(Kd):r=Jd;for(let o=0;o!==i;++o)t.setTextureCube(e[o]||r,a[o])}function Cb(s,e,t){const n=this.cache,i=e.length,a=Cr(t,i);Ht(n,a)||(s.uniform1iv(this.addr,a),Vt(n,a));for(let r=0;r!==i;++r)t.setTexture2DArray(e[r]||jd,a[r])}function Lb(s){switch(s){case 5126:return ub;case 35664:return fb;case 35665:return pb;case 35666:return mb;case 35674:return gb;case 35675:return bb;case 35676:return _b;case 5124:case 35670:return xb;case 35667:case 35671:return vb;case 35668:case 35672:return yb;case 35669:case 35673:return Mb;case 5125:return Sb;case 36294:return wb;case 36295:return Eb;case 36296:return Tb;case 35678:case 36198:case 36298:case 36306:case 35682:return Ab;case 35679:case 36299:case 36307:return Rb;case 35680:case 36300:case 36308:case 36293:return Pb;case 36289:case 36303:case 36311:case 36292:return Cb}}class Db{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=db(t.type)}}class Ib{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Lb(t.type)}}class Nb{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let a=0,r=i.length;a!==r;++a){const o=i[a];o.setValue(e,t[o.id],n)}}}const mo=/(\w+)(\])?(\[|\.)?/g;function Mh(s,e){s.seq.push(e),s.map[e.id]=e}function Fb(s,e,t){const n=s.name,i=n.length;for(mo.lastIndex=0;;){const a=mo.exec(n),r=mo.lastIndex;let o=a[1];const c=a[2]==="]",l=a[3];if(c&&(o=o|0),l===void 0||l==="["&&r+2===i){Mh(t,l===void 0?new Db(o,s,e):new Ib(o,s,e));break}else{let d=t.map[o];d===void 0&&(d=new Nb(o),Mh(t,d)),t=d}}}class dr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const o=e.getActiveUniform(t,r),c=e.getUniformLocation(t,o.name);Fb(o,c,this)}const i=[],a=[];for(const r of this.seq)r.type===e.SAMPLER_2D_SHADOW||r.type===e.SAMPLER_CUBE_SHADOW||r.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(r):a.push(r);i.length>0&&(this.seq=i.concat(a))}setValue(e,t,n,i){const a=this.map[t];a!==void 0&&a.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let a=0,r=t.length;a!==r;++a){const o=t[a],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,a=e.length;i!==a;++i){const r=e[i];r.id in t&&n.push(r)}return n}}function Sh(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const Ub=37297;let kb=0;function Ob(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let r=i;r<a;r++){const o=r+1;n.push(`${o===e?">":" "} ${o}: ${t[r]}`)}return n.join(`
`)}const wh=new $e;function zb(s){lt._getMatrix(wh,lt.workingColorSpace,s);const e=`mat3( ${wh.elements.map(t=>t.toFixed(4))} )`;switch(lt.getTransfer(s)){case gr:return[e,"LinearTransferOETF"];case yt:return[e,"sRGBTransferOETF"];default:return qe("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function Eh(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),a=(s.getShaderInfoLog(e)||"").trim();if(n&&a==="")return"";const r=/ERROR: 0:(\d+)/.exec(a);if(r){const o=parseInt(r[1]);return t.toUpperCase()+`

`+a+`

`+Ob(s.getShaderSource(e),o)}else return a}function Bb(s,e){const t=zb(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( ${t[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}const Gb={[ad]:"Linear",[rd]:"Reinhard",[od]:"Cineon",[cd]:"ACESFilmic",[hd]:"AgX",[wc]:"Neutral",[ld]:"Custom"};function Hb(s,e){const t=Gb[e];return t===void 0?(qe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ya=new v;function Vb(){lt.getLuminanceCoefficients(Ya);const s=Ya.x.toFixed(4),e=Ya.y.toFixed(4),t=Ya.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Wb(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Zs).join(`
`)}function qb(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Xb(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const a=s.getActiveAttrib(e,i),r=a.name;let o=1;a.type===s.FLOAT_MAT2&&(o=2),a.type===s.FLOAT_MAT3&&(o=3),a.type===s.FLOAT_MAT4&&(o=4),t[r]={type:a.type,location:s.getAttribLocation(e,r),locationSize:o}}return t}function Zs(s){return s!==""}function Th(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,e.numLightProbeGrids)}function Ah(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Kb=/^[ \t]*#include +<([\w\d./]+)>/gm;function vc(s){return s.replace(Kb,jb)}function jb(s,e){const t=rt[e];if(t===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");return vc(t)}const Yb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Rh(s){return s.replace(Yb,Jb)}function Jb(s,e,t,n){let i="";for(let a=parseInt(e);a<parseInt(t);a++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return i}function Ph(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const Zb={[$s]:"SHADOWMAP_TYPE_PCF",[js]:"SHADOWMAP_TYPE_VSM"};function $b(s){return Zb[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Qb={[aa]:"ENVMAP_MODE_REFRACTION"};function e_(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":Qb[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}const t_={[sd]:"ENVMAP_BLENDING_MULTIPLY",[zu]:"ENVMAP_BLENDING_MIX",[Bu]:"ENVMAP_BLENDING_ADD"};function n_(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":t_[s.combine]||"ENVMAP_BLENDING_NONE"}function i_(s,e,t,n){const i=s.getContext(),a=t.defines;let r=t.vertexShader,o=t.fragmentShader;const c=$b(t),l=t.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=e_(t),d=n_(t),u=Wb(t),f=qb(a),p=i.createProgram();let b,g,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(b=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Zs).join(`
`),b.length>0&&(b+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Zs).join(`
`),g.length>0&&(g+=`
`)):(b=[Ph(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+t.diffuseRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Zs).join(`
`),g=[Ph(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",t.envMapPMREM?"#define ENVMAP_MAX_LOD "+t.envMapMaxLod+".0":"",t.envMapPMREM?"#define ENVMAP_SIZE "+t.envMapSize+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ri?"#define TONE_MAPPING":"",t.toneMapping!==ri?rt.tonemapping_pars_fragment:"",t.toneMapping!==ri?Hb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",rt.colorspace_pars_fragment,Bb("linearToOutputTexel",t.outputColorSpace),Vb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Zs).join(`
`)),r=vc(r),r=Th(r,t),r=Ah(r,t),o=vc(o),o=Th(o,t),o=Ah(o,t),r=Rh(r),o=Rh(o),t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,b=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+b,g=["#define varying in",t.glslVersion===vl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===vl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const x=m+b+r,E=m+g+o,y=Sh(i,i.VERTEX_SHADER,x),S=Sh(i,i.FRAGMENT_SHADER,E);i.attachShader(p,y),i.attachShader(p,S),t.index0AttributeName!==void 0?i.bindAttribLocation(p,0,t.index0AttributeName):t.hasPositionAttribute===!0&&i.bindAttribLocation(p,0,"position"),i.linkProgram(p);function w(P){if(s.debug.checkShaderErrors){const I=i.getProgramInfoLog(p)||"",D=i.getShaderInfoLog(y)||"",L=i.getShaderInfoLog(S)||"",R=I.trim(),U=D.trim(),z=L.trim();let N=!0,B=!0;if(i.getProgramParameter(p,i.LINK_STATUS)===!1)if(N=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,p,y,S);else{const k=Eh(i,y,"vertex"),V=Eh(i,S,"fragment");Qe("WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(p,i.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+R+`
`+k+`
`+V)}else R!==""?qe("WebGLProgram: Program Info Log:",R):(U===""||z==="")&&(B=!1);B&&(P.diagnostics={runnable:N,programLog:R,vertexShader:{log:U,prefix:b},fragmentShader:{log:z,prefix:g}})}i.deleteShader(y),i.deleteShader(S),_=new dr(i,p),M=Xb(i,p)}let _;this.getUniforms=function(){return _===void 0&&w(this),_};let M;this.getAttributes=function(){return M===void 0&&w(this),M};let F=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return F===!1&&(F=i.getProgramParameter(p,Ub)),F},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(p),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=kb++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=y,this.fragmentShader=S,this}let s_=0;class a_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){const i=this._getShaderCacheForMaterial(e);return i.has(t)===!1&&(i.add(t),t.usedTimes++),i.has(n)===!1&&(i.add(n),n.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new r_(e),t.set(e,n)),n}}class r_{constructor(e){this.id=s_++,this.code=e,this.usedTimes=0}}function o_(s){return s===Xi||s===pr||s===mr}function c_(s,e,t,n,i,a){const r=new Uc,o=new a_,c=new Set,l=[],h=new Map,d=n.logarithmicDepthBuffer,u={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(_){return c.add(_),_===0?"uv":`uv${_}`}function p(_,M,F,P,I,D){const L=P.fog,R=I.geometry,U=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?P.environment:null,z=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,N=e.get(_.envMap||U,z),B=u[_.type];let k=n.precision;_.precision!==null&&(k=n.getMaxPrecision(_.precision),k!==_.precision&&qe("WebGLProgram.getParameters:",_.precision,"not supported, using",k,"instead."));const V=R.morphAttributes.position||R.morphAttributes.normal||R.morphAttributes.color,X=V!==void 0?V.length:0;let Y=0;R.morphAttributes.position!==void 0&&(Y=1),R.morphAttributes.normal!==void 0&&(Y=2),R.morphAttributes.color!==void 0&&(Y=3);let de,W,J,te;if(B){const De=On[B];de=De.vertexShader,W=De.fragmentShader}else{de=_.vertexShader,W=_.fragmentShader;const De=o.getVertexShaderStage(_),vt=o.getFragmentShaderStage(_);o.update(_,De,vt),J=De.id,te=vt.id}const ce=s.getRenderTarget(),ee=s.state.buffers.depth.getReversed(),ye=I.isInstancedMesh===!0,_e=I.isBatchedMesh===!0,fe=!!_.map,Ne=!!_.matcap,ke=!!N,$=ke&&N.isPMREMTexture===!0,Le=!!_.aoMap,be=!!_.lightMap,xe=!!_.bumpMap&&_.wireframe===!1,ie=!!_.normalMap,He=!!_.displacementMap,We=!!_.emissiveMap,ot=!!_.metalnessMap,nt=!!_.roughnessMap,_t=_.anisotropy>0,H=_.clearcoat>0,At=_.diffuseRoughness>0,ft=_.dispersion>0,xt=_.retroreflectivity>0,le=_.iridescence>0,Ze=_.sheen>0,Fe=_.transmission>0,Ke=_t&&!!_.anisotropyMap,C=H&&!!_.clearcoatMap,T=H&&!!_.clearcoatNormalMap,q=H&&!!_.clearcoatRoughnessMap,me=At&&!!_.diffuseRoughnessMap,oe=le&&!!_.iridescenceMap,Me=le&&!!_.iridescenceThicknessMap,Re=Ze&&!!_.sheenColorMap,ne=Ze&&!!_.sheenRoughnessMap,se=!!_.specularMap,we=!!_.specularColorMap,O=!!_.specularIntensityMap,ae=Fe&&!!_.transmissionMap,Q=Fe&&!!_.thicknessMap,Ee=!!_.gradientMap,ve=!!_.alphaMap,Se=_.alphaTest>0,je=!!_.alphaHash,at=!!_.extensions;let ge=ri;_.toneMapped&&(ce===null||ce.isXRRenderTarget===!0)&&(ge=s.toneMapping);const Ye=$?N.isCompressedCubeTexture?N.image[0].mipmaps:N.mipmaps:null,it={shaderID:B,shaderType:_.type,shaderName:_.name,vertexShader:de,fragmentShader:W,defines:_.defines,customVertexShaderID:J,customFragmentShaderID:te,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:k,batching:_e,batchingColor:_e&&I._colorsTexture!==null,instancing:ye,instancingColor:ye&&I.instanceColor!==null,instancingMorph:ye&&I.morphTexture!==null,outputColorSpace:ce===null?s.outputColorSpace:ce.isXRRenderTarget===!0?ce.texture.colorSpace:lt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:fe,matcap:Ne,envMap:ke,envMapMode:ke&&N.mapping,envMapPMREM:$,envMapMaxLod:$?Ye.length-1:null,envMapSize:$?Ye[0].width:null,aoMap:Le,lightMap:be,bumpMap:xe,normalMap:ie,displacementMap:He,emissiveMap:We,normalMapObjectSpace:ie&&_.normalMapType===qu,normalMapTangentSpace:ie&&_.normalMapType===pc,packedNormalMap:ie&&_.normalMapType===pc&&o_(_.normalMap.format),metalnessMap:ot,roughnessMap:nt,anisotropy:_t,anisotropyMap:Ke,clearcoat:H,clearcoatMap:C,clearcoatNormalMap:T,clearcoatRoughnessMap:q,diffuseRoughness:At,diffuseRoughnessMap:me,dispersion:ft,retroreflection:xt,iridescence:le,iridescenceMap:oe,iridescenceThicknessMap:Me,sheen:Ze,sheenColorMap:Re,sheenRoughnessMap:ne,specularMap:se,specularColorMap:we,specularIntensityMap:O,transmission:Fe,transmissionMap:ae,thicknessMap:Q,gradientMap:Ee,opaque:_.transparent===!1&&_.blending===Qs&&_.alphaToCoverage===!1,alphaMap:ve,alphaTest:Se,alphaHash:je,combine:_.combine,mapUv:fe&&f(_.map.channel),aoMapUv:Le&&f(_.aoMap.channel),lightMapUv:be&&f(_.lightMap.channel),bumpMapUv:xe&&f(_.bumpMap.channel),normalMapUv:ie&&f(_.normalMap.channel),displacementMapUv:He&&f(_.displacementMap.channel),emissiveMapUv:We&&f(_.emissiveMap.channel),metalnessMapUv:ot&&f(_.metalnessMap.channel),roughnessMapUv:nt&&f(_.roughnessMap.channel),anisotropyMapUv:Ke&&f(_.anisotropyMap.channel),clearcoatMapUv:C&&f(_.clearcoatMap.channel),clearcoatNormalMapUv:T&&f(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:q&&f(_.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:me&&f(_.diffuseRoughnessMap.channel),iridescenceMapUv:oe&&f(_.iridescenceMap.channel),iridescenceThicknessMapUv:Me&&f(_.iridescenceThicknessMap.channel),sheenColorMapUv:Re&&f(_.sheenColorMap.channel),sheenRoughnessMapUv:ne&&f(_.sheenRoughnessMap.channel),specularMapUv:se&&f(_.specularMap.channel),specularColorMapUv:we&&f(_.specularColorMap.channel),specularIntensityMapUv:O&&f(_.specularIntensityMap.channel),transmissionMapUv:ae&&f(_.transmissionMap.channel),thicknessMapUv:Q&&f(_.thicknessMap.channel),alphaMapUv:ve&&f(_.alphaMap.channel),vertexTangents:!!R.attributes.tangent&&(ie||_t),vertexNormals:!!R.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!R.attributes.color&&R.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!R.attributes.uv&&(fe||ve),fog:!!L,useFog:_.fog===!0,fogExp2:!!L&&L.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||R.attributes.normal===void 0&&ie===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ee,skinning:I.isSkinnedMesh===!0,hasPositionAttribute:R.attributes.position!==void 0,morphTargets:R.morphAttributes.position!==void 0,morphNormals:R.morphAttributes.normal!==void 0,morphColors:R.morphAttributes.color!==void 0,morphTargetsCount:X,morphTextureStride:Y,numSunLights:M.sun.length,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numSunLightShadows:M.sunShadowMap.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numLightProbeGrids:D.filter(De=>De.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:_.dithering,shadowMapEnabled:s.shadowMap.enabled&&F.length>0,shadowMapType:s.shadowMap.type,toneMapping:ge,decodeVideoTexture:fe&&_.map.isVideoTexture===!0&&lt.getTransfer(_.map.colorSpace)===yt,decodeVideoTextureEmissive:We&&_.emissiveMap.isVideoTexture===!0&&lt.getTransfer(_.emissiveMap.colorSpace)===yt,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Rt,flipSided:_.side===on,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:at&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(at&&_.extensions.multiDraw===!0||_e)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return it.vertexUv1s=c.has(1),it.vertexUv2s=c.has(2),it.vertexUv3s=c.has(3),c.clear(),it}function b(_){const M=[];if(_.shaderID?M.push(_.shaderID):(M.push(_.customVertexShaderID),M.push(_.customFragmentShaderID)),_.defines!==void 0)for(const F in _.defines)M.push(F),M.push(_.defines[F]);return _.isRawShaderMaterial===!1&&(g(M,_),m(M,_),M.push(s.outputColorSpace)),M.push(_.customProgramCacheKey),M.join()}function g(_,M){_.push(M.precision),_.push(M.outputColorSpace),_.push(M.envMapMode),_.push(M.envMapPMREM),_.push(M.envMapMaxLod),_.push(M.envMapSize),_.push(M.mapUv),_.push(M.alphaMapUv),_.push(M.lightMapUv),_.push(M.aoMapUv),_.push(M.bumpMapUv),_.push(M.normalMapUv),_.push(M.displacementMapUv),_.push(M.emissiveMapUv),_.push(M.metalnessMapUv),_.push(M.roughnessMapUv),_.push(M.anisotropyMapUv),_.push(M.clearcoatMapUv),_.push(M.clearcoatNormalMapUv),_.push(M.clearcoatRoughnessMapUv),_.push(M.diffuseRoughnessMapUv),_.push(M.iridescenceMapUv),_.push(M.iridescenceThicknessMapUv),_.push(M.sheenColorMapUv),_.push(M.sheenRoughnessMapUv),_.push(M.specularMapUv),_.push(M.specularColorMapUv),_.push(M.specularIntensityMapUv),_.push(M.transmissionMapUv),_.push(M.thicknessMapUv),_.push(M.combine),_.push(M.fogExp2),_.push(M.sizeAttenuation),_.push(M.morphTargetsCount),_.push(M.numSunLights),_.push(M.numDirLights),_.push(M.numPointLights),_.push(M.numSpotLights),_.push(M.numSpotLightMaps),_.push(M.numHemiLights),_.push(M.numRectAreaLights),_.push(M.numSunLightShadows),_.push(M.numDirLightShadows),_.push(M.numPointLightShadows),_.push(M.numSpotLightShadows),_.push(M.numSpotLightShadowsWithMaps),_.push(M.numLightProbes),_.push(M.numLightProbeGrids),_.push(M.shadowMapType),_.push(M.toneMapping),_.push(M.numClippingPlanes),_.push(M.numClipIntersection),_.push(M.depthPacking)}function m(_,M){r.disableAll(),M.instancing&&r.enable(0),M.instancingColor&&r.enable(1),M.instancingMorph&&r.enable(2),M.matcap&&r.enable(3),M.envMap&&r.enable(4),M.normalMapObjectSpace&&r.enable(5),M.normalMapTangentSpace&&r.enable(6),M.clearcoat&&r.enable(7),M.iridescence&&r.enable(8),M.alphaTest&&r.enable(9),M.vertexColors&&r.enable(10),M.vertexAlphas&&r.enable(11),M.vertexUv1s&&r.enable(12),M.vertexUv2s&&r.enable(13),M.vertexUv3s&&r.enable(14),M.vertexTangents&&r.enable(15),M.anisotropy&&r.enable(16),M.alphaHash&&r.enable(17),M.batching&&r.enable(18),M.dispersion&&r.enable(19),M.retroreflection&&r.enable(24),M.diffuseRoughness&&r.enable(25),M.batchingColor&&r.enable(20),M.gradientMap&&r.enable(21),M.packedNormalMap&&r.enable(22),M.vertexNormals&&r.enable(23),_.push(r.mask),r.disableAll(),M.fog&&r.enable(0),M.useFog&&r.enable(1),M.flatShading&&r.enable(2),M.logarithmicDepthBuffer&&r.enable(3),M.reversedDepthBuffer&&r.enable(4),M.skinning&&r.enable(5),M.morphTargets&&r.enable(6),M.morphNormals&&r.enable(7),M.morphColors&&r.enable(8),M.premultipliedAlpha&&r.enable(9),M.shadowMapEnabled&&r.enable(10),M.doubleSided&&r.enable(11),M.flipSided&&r.enable(12),M.useDepthPacking&&r.enable(13),M.dithering&&r.enable(14),M.transmission&&r.enable(15),M.sheen&&r.enable(16),M.opaque&&r.enable(17),M.pointsUvs&&r.enable(18),M.decodeVideoTexture&&r.enable(19),M.decodeVideoTextureEmissive&&r.enable(20),M.alphaToCoverage&&r.enable(21),M.numLightProbeGrids>0&&r.enable(22),M.hasPositionAttribute&&r.enable(23),_.push(r.mask)}function x(_){const M=u[_.type];let F;if(M){const P=On[M];F=$f.clone(P.uniforms)}else F=_.uniforms;return F}function E(_,M){let F=h.get(M);return F!==void 0?++F.usedTimes:(F=new i_(s,M,_,i),l.push(F),h.set(M,F)),F}function y(_){if(--_.usedTimes===0){const M=l.indexOf(_);l[M]=l[l.length-1],l.pop(),h.delete(_.cacheKey),_.destroy()}}function S(_){o.remove(_)}function w(){o.dispose()}return{getParameters:p,getProgramCacheKey:b,getUniforms:x,acquireProgram:E,releaseProgram:y,releaseShaderCache:S,programs:l,dispose:w}}function l_(){let s=new WeakMap;function e(r){return s.has(r)}function t(r){let o=s.get(r);return o===void 0&&(o={},s.set(r,o)),o}function n(r){s.delete(r)}function i(r,o,c){s.get(r)[o]=c}function a(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:a}}function h_(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.materialVariant!==e.materialVariant?s.materialVariant-e.materialVariant:s.z!==e.z?s.z-e.z:s.id-e.id}function Ch(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Lh(){const s=[];let e=0;const t=[],n=[],i=[];function a(){e=0,t.length=0,n.length=0,i.length=0}function r(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,p,b,g,m){let x=s[e];return x===void 0?(x={id:u.id,object:u,geometry:f,material:p,materialVariant:r(u),groupOrder:b,renderOrder:u.renderOrder,z:g,group:m},s[e]=x):(x.id=u.id,x.object=u,x.geometry=f,x.material=p,x.materialVariant=r(u),x.groupOrder=b,x.renderOrder=u.renderOrder,x.z=g,x.group=m),e++,x}function c(u,f,p,b,g,m,x){x.reversedDepth===!0&&(g=-g);const E=o(u,f,p,b,g,m);p.transmission>0?n.push(E):p.transparent===!0?i.push(E):t.push(E)}function l(u,f,p,b,g,m){const x=o(u,f,p,b,g,m);p.transmission>0?n.unshift(x):p.transparent===!0?i.unshift(x):t.unshift(x)}function h(u,f){t.length>1&&t.sort(u||h_),n.length>1&&n.sort(f||Ch),i.length>1&&i.sort(f||Ch)}function d(){for(let u=e,f=s.length;u<f;u++){const p=s[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:i,init:a,push:c,unshift:l,finish:d,sort:h}}function d_(){let s=new WeakMap;function e(n,i){const a=s.get(n);let r;return a===void 0?(r=new Lh,s.set(n,[r])):i>=a.length?(r=new Lh,a.push(r)):r=a[i],r}function t(){s=new WeakMap}return{get:e,dispose:t}}function u_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new v,color:new pe};break;case"SpotLight":t={position:new v,direction:new v,color:new pe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new v,color:new pe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new v,skyColor:new pe,groundColor:new pe};break;case"RectAreaLight":t={color:new pe,position:new v,halfWidth:new v,halfHeight:new v};break}return s[e.id]=t,t}}}function f_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Je};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Je};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Je,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let p_=0;function m_(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function g_(s){const e=new u_,t=f_(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new v);const i=new v,a=new Xe,r=new Xe;function o(l){let h=0,d=0,u=0;for(let D=0;D<9;D++)n.probe[D].set(0,0,0);let f=0,p=0,b=0,g=0,m=0,x=0,E=0,y=0,S=0,w=0,_=0,M=0,F=0,P=0;l.sort(m_);for(let D=0,L=l.length;D<L;D++){const R=l[D],U=R.color,z=R.intensity,N=R.distance;let B=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===Xi?B=R.shadow.map.texture:B=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)h+=U.r*z,d+=U.g*z,u+=U.b*z;else if(R.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(R.sh.coefficients[k],z);P++}else if(R.isSunLight){const k=e.get(R);if(k.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const V=R.shadow,X=t.get(R);X.shadowIntensity=V.intensity,X.shadowBias=V.bias,X.shadowNormalBias=V.normalBias,X.shadowRadius=V.radius,X.shadowMapSize.copy(V.mapSize).multiply(V.getFrameExtents()),n.sunShadow[p]=X,n.sunShadowMap[p]=B;const Y=V.getViewportCount();for(let de=0;de<Y;de++)n.sunShadowMatrix[b+de]=V.getMatrix(de),n.sunShadowCascade[b+de]=V._cascadeData[de];b+=Y,p++}n.sun[f]=k,f++}else if(R.isDirectionalLight){const k=e.get(R);if(k.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const V=R.shadow,X=t.get(R);X.shadowIntensity=V.intensity,X.shadowBias=V.bias,X.shadowNormalBias=V.normalBias,X.shadowRadius=V.radius,X.shadowMapSize=V.mapSize,n.directionalShadow[g]=X,n.directionalShadowMap[g]=B,n.directionalShadowMatrix[g]=R.shadow.matrix,S++}n.directional[g]=k,g++}else if(R.isSpotLight){const k=e.get(R);k.position.setFromMatrixPosition(R.matrixWorld),k.color.copy(U).multiplyScalar(z),k.distance=N,k.coneCos=Math.cos(R.angle),k.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),k.decay=R.decay,n.spot[x]=k;const V=R.shadow;if(R.map&&(n.spotLightMap[M]=R.map,M++,V.updateMatrices(R),R.castShadow&&F++),n.spotLightMatrix[x]=V.matrix,R.castShadow){const X=t.get(R);X.shadowIntensity=V.intensity,X.shadowBias=V.bias,X.shadowNormalBias=V.normalBias,X.shadowRadius=V.radius,X.shadowMapSize=V.mapSize,n.spotShadow[x]=X,n.spotShadowMap[x]=B,_++}x++}else if(R.isRectAreaLight){const k=e.get(R);k.color.copy(U).multiplyScalar(z),k.halfWidth.set(R.width*.5,0,0),k.halfHeight.set(0,R.height*.5,0),n.rectArea[E]=k,E++}else if(R.isPointLight){const k=e.get(R);if(k.color.copy(R.color).multiplyScalar(R.intensity),k.distance=R.distance,k.decay=R.decay,R.castShadow){const V=R.shadow,X=t.get(R);X.shadowIntensity=V.intensity,X.shadowBias=V.bias,X.shadowNormalBias=V.normalBias,X.shadowRadius=V.radius,X.shadowMapSize=V.mapSize,X.shadowCameraNear=V.camera.near,X.shadowCameraFar=V.camera.far,n.pointShadow[m]=X,n.pointShadowMap[m]=B,n.pointShadowMatrix[m]=R.shadow.matrix,w++}n.point[m]=k,m++}else if(R.isHemisphereLight){const k=e.get(R);k.skyColor.copy(R.color).multiplyScalar(z),k.groundColor.copy(R.groundColor).multiplyScalar(z),n.hemi[y]=k,y++}}E>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ie.LTC_FLOAT_1,n.rectAreaLTC2=Ie.LTC_FLOAT_2):(n.rectAreaLTC1=Ie.LTC_HALF_1,n.rectAreaLTC2=Ie.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const I=n.hash;(I.sunLength!==f||I.directionalLength!==g||I.pointLength!==m||I.spotLength!==x||I.rectAreaLength!==E||I.hemiLength!==y||I.numSunShadows!==p||I.numDirectionalShadows!==S||I.numPointShadows!==w||I.numSpotShadows!==_||I.numSpotMaps!==M||I.numLightProbes!==P)&&(n.sun.length=f,n.directional.length=g,n.spot.length=x,n.rectArea.length=E,n.point.length=m,n.hemi.length=y,n.sunShadow.length=p,n.sunShadowMap.length=p,n.sunShadowMatrix.length=b,n.sunShadowCascade.length=b,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.directionalShadowMatrix.length=S,n.pointShadow.length=w,n.pointShadowMap.length=w,n.pointShadowMatrix.length=w,n.spotShadow.length=_,n.spotShadowMap.length=_,n.spotLightMatrix.length=_+M-F,n.spotLightMap.length=M,n.numSpotLightShadowsWithMaps=F,n.numLightProbes=P,I.sunLength=f,I.directionalLength=g,I.pointLength=m,I.spotLength=x,I.rectAreaLength=E,I.hemiLength=y,I.numSunShadows=p,I.numDirectionalShadows=S,I.numPointShadows=w,I.numSpotShadows=_,I.numSpotMaps=M,I.numLightProbes=P,n.version=p_++)}function c(l,h){let d=0,u=0,f=0,p=0,b=0,g=0;const m=h.matrixWorldInverse;for(let x=0,E=l.length;x<E;x++){const y=l[x];if(y.isSunLight){const S=n.sun[d];S.direction.setFromMatrixPosition(y.matrixWorld),S.direction.transformDirection(m),d++}else if(y.isDirectionalLight){const S=n.directional[u];S.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(i),S.direction.transformDirection(m),u++}else if(y.isSpotLight){const S=n.spot[p];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),S.direction.setFromMatrixPosition(y.matrixWorld),i.setFromMatrixPosition(y.target.matrixWorld),S.direction.sub(i),S.direction.transformDirection(m),p++}else if(y.isRectAreaLight){const S=n.rectArea[b];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),r.identity(),a.copy(y.matrixWorld),a.premultiply(m),r.extractRotation(a),S.halfWidth.set(y.width*.5,0,0),S.halfHeight.set(0,y.height*.5,0),S.halfWidth.applyMatrix4(r),S.halfHeight.applyMatrix4(r),b++}else if(y.isPointLight){const S=n.point[f];S.position.setFromMatrixPosition(y.matrixWorld),S.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){const S=n.hemi[g];S.direction.setFromMatrixPosition(y.matrixWorld),S.direction.transformDirection(m),g++}}}return{setup:o,setupView:c,state:n}}function Dh(s){const e=new g_(s),t=[],n=[],i=[];function a(d){h.camera=d,t.length=0,n.length=0,i.length=0}function r(d){d.isLightProbeGrid?i.push(d):t.push(d)}function o(d){n.push(d)}function c(){e.setup(t),i.sort((d,u)=>d.priority-u.priority||d.id-u.id)}function l(d){e.setupView(t,d)}const h={lightsArray:t,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:h,setupLights:c,setupLightsView:l,pushLight:r,pushShadow:o}}function b_(s){let e=new WeakMap;function t(i,a=0){const r=e.get(i);let o;return r===void 0?(o=new Dh(s),e.set(i,[o])):a>=r.length?(o=new Dh(s),r.push(o)):o=r[a],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const __=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,x_=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,v_=[new v(1,0,0),new v(-1,0,0),new v(0,1,0),new v(0,-1,0),new v(0,0,1),new v(0,0,-1)],y_=[new v(0,-1,0),new v(0,-1,0),new v(0,0,1),new v(0,0,-1),new v(0,-1,0),new v(0,-1,0)],Ih=new Xe,Hs=new v,go=new v;function M_(s,e,t){let n=new da;const i=new Je,a=new Je,r=new Et,o=new Fd,c=new np,l={},h=t.maxTextureSize,d={[Ti]:on,[on]:Ti,[Rt]:Rt},u=new ji({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Je},radius:{value:4}},vertexShader:__,fragmentShader:x_}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const p=new St;p.setAttribute("position",new It(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const b=new Ft(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=$s;let m=this.type;this.render=function(w,_,M){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;this.type===vu&&(qe("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=$s);const F=s.getRenderTarget(),P=s.getActiveCubeFace(),I=s.getActiveMipmapLevel(),D=s.state;D.setBlending(gs),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const L=m!==this.type;L&&_.traverse(function(R){R.material&&(Array.isArray(R.material)?R.material.forEach(U=>U.needsUpdate=!0):R.material.needsUpdate=!0)});for(let R=0,U=w.length;R<U;R++){const z=w[R],N=z.shadow;if(N===void 0){qe("WebGLShadowMap:",z,"has no shadow.");continue}if(N.autoUpdate===!1&&N.needsUpdate===!1)continue;i.copy(N.mapSize);const B=N.getFrameExtents();i.multiply(B),a.copy(N.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(a.x=Math.floor(h/B.x),i.x=a.x*B.x,N.mapSize.x=a.x),i.y>h&&(a.y=Math.floor(h/B.y),i.y=a.y*B.y,N.mapSize.y=a.y));const k=s.state.buffers.depth.getReversed();if(N.camera._reversedDepth=k,N.map===null||L===!0){if(N.map!==null&&(N.map.depthTexture!==null&&(N.map.depthTexture.dispose(),N.map.depthTexture=null),N.map.dispose()),this.type===js){if(z.isPointLight){qe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}N.map=new Gn(i.x,i.y,{format:Xi,type:Wn,minFilter:jt,magFilter:jt,generateMipmaps:!1}),N.map.texture.name=z.name+".shadowMap",N.map.depthTexture=new Ss(i.x,i.y,vn),N.map.depthTexture.name=z.name+".shadowMapDepth",N.map.depthTexture.format=Ai,N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Bt,N.map.depthTexture.magFilter=Bt}else z.isPointLight?(N.map=new jc(i.x),N.map.depthTexture=new Dd(i.x,Vn)):(N.map=new Gn(i.x,i.y),N.map.depthTexture=new Ss(i.x,i.y,Vn)),N.map.depthTexture.name=z.name+".shadowMap",N.map.depthTexture.format=Ai,this.type===$s?(N.map.depthTexture.compareFunction=k?yd:vd,N.map.depthTexture.minFilter=jt,N.map.depthTexture.magFilter=jt):(N.map.depthTexture.compareFunction=null,N.map.depthTexture.minFilter=Bt,N.map.depthTexture.magFilter=Bt);N.camera.updateProjectionMatrix()}N.map.isWebGLCubeRenderTarget!==!0&&(N.map.width!==i.x||N.map.height!==i.y)&&N.map.setSize(i.x,i.y);const V=N.map.isWebGLCubeRenderTarget?6:N.getViewportCount();z.isPointLight!==!0&&N.updateMatrices(z,M);const X=(N.camera.layers.mask&4294967294)!==0?N.camera.layers:M.layers;for(let Y=0;Y<V;Y++){const de=N.getCamera(Y);if(z.isPointLight){const W=N.camera,J=N.matrix,te=z.distance||W.far;te!==W.far&&(W.far=te,W.updateProjectionMatrix()),Hs.setFromMatrixPosition(z.matrixWorld),W.position.copy(Hs),go.copy(W.position),go.add(v_[Y]),W.up.copy(y_[Y]),W.lookAt(go),W.updateMatrixWorld(),J.makeTranslation(-Hs.x,-Hs.y,-Hs.z),Ih.multiplyMatrices(W.projectionMatrix,W.matrixWorldInverse),N._frustum.setFromProjectionMatrix(Ih,W.coordinateSystem,W.reversedDepth)}if(N.map.isWebGLCubeRenderTarget)s.setRenderTarget(N.map,Y),s.clear();else{Y===0&&(s.setRenderTarget(N.map),s.clear());const W=N.getViewport(Y);r.set(a.x*W.x,a.y*W.y,a.x*W.z,a.y*W.w),D.viewport(r)}n=N.getFrustum(Y),y(_,M,de,z,X,this.type)}N.isPointLightShadow!==!0&&this.type===js&&x(N,M),N.needsUpdate=!1}m=this.type,g.needsUpdate=!1,s.setRenderTarget(F,P,I)};function x(w,_){const M=e.update(b);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null?w.mapPass=new Gn(i.x,i.y,{format:Xi,type:Wn}):(w.mapPass.width!==w.map.width||w.mapPass.height!==w.map.height)&&w.mapPass.setSize(w.map.width,w.map.height),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value.set(w.map.width,w.map.height),u.uniforms.radius.value=w.radius,s.setRenderTarget(w.mapPass),s.clear(),s.renderBufferDirect(_,null,M,u,b,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value.set(w.map.width,w.map.height),f.uniforms.radius.value=w.radius,s.setRenderTarget(w.map),s.clear(),s.renderBufferDirect(_,null,M,f,b,null)}function E(w,_,M,F){let P=null;const I=M.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(I!==void 0)P=I;else if(P=M.isPointLight===!0?c:o,s.localClippingEnabled&&_.clipShadows===!0&&Array.isArray(_.clippingPlanes)&&_.clippingPlanes.length!==0||_.displacementMap&&_.displacementScale!==0||_.alphaMap&&_.alphaTest>0||_.map&&_.alphaTest>0||_.alphaToCoverage===!0){const D=P.uuid,L=_.uuid;let R=l[D];R===void 0&&(R={},l[D]=R);let U=R[L];U===void 0&&(U=P.clone(),R[L]=U,_.addEventListener("dispose",S)),P=U}if(P.visible=_.visible,P.wireframe=_.wireframe,F===js?P.side=_.shadowSide!==null?_.shadowSide:_.side:P.side=_.shadowSide!==null?_.shadowSide:d[_.side],P.alphaMap=_.alphaMap,P.alphaTest=_.alphaToCoverage===!0?.5:_.alphaTest,P.map=_.map,P.clipShadows=_.clipShadows,P.clippingPlanes=_.clippingPlanes,P.clipIntersection=_.clipIntersection,P.displacementMap=_.displacementMap,P.displacementScale=_.displacementScale,P.displacementBias=_.displacementBias,P.wireframeLinewidth=_.wireframeLinewidth,P.linewidth=_.linewidth,M.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const D=s.properties.get(P);D.light=M}return P}function y(w,_,M,F,P,I){if(w.visible===!1)return;if(w.layers.test(P)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&I===js)&&(!w.frustumCulled||w.intersectsFrustum(n))){w.modelViewMatrix.multiplyMatrices(M.matrixWorldInverse,w.matrixWorld);const R=e.update(w),U=w.material;if(Array.isArray(U)){const z=R.groups;for(let N=0,B=z.length;N<B;N++){const k=z[N],V=U[k.materialIndex];if(V&&V.visible){const X=E(w,V,F,I);w.onBeforeShadow(s,w,_,M,R,X,k),s.renderBufferDirect(M,null,R,X,w,k),w.onAfterShadow(s,w,_,M,R,X,k)}}}else if(U.visible){const z=E(w,U,F,I);w.onBeforeShadow(s,w,_,M,R,z,null),s.renderBufferDirect(M,null,R,z,w,null),w.onAfterShadow(s,w,_,M,R,z,null)}}const L=w.children;for(let R=0,U=L.length;R<U;R++)y(L[R],_,M,F,P,I)}function S(w){w.target.removeEventListener("dispose",S);for(const M in l){const F=l[M],P=w.target.uuid;P in F&&(F[P].dispose(),delete F[P])}}}function S_(s,e){function t(){let O=!1;const ae=new Et;let Q=null;const Ee=new Et(0,0,0,0);return{setMask:function(ve){Q!==ve&&!O&&(s.colorMask(ve,ve,ve,ve),Q=ve)},setLocked:function(ve){O=ve},setClear:function(ve,Se,je,at,ge){ge===!0&&(ve*=at,Se*=at,je*=at),ae.set(ve,Se,je,at),Ee.equals(ae)===!1&&(s.clearColor(ve,Se,je,at),Ee.copy(ae))},reset:function(){O=!1,Q=null,Ee.set(-1,0,0,0)}}}function n(){let O=!1,ae=!1,Q=null,Ee=null,ve=null;return{setReversed:function(Se){if(ae!==Se){const je=e.get("EXT_clip_control");Se?je.clipControlEXT(je.LOWER_LEFT_EXT,je.ZERO_TO_ONE_EXT):je.clipControlEXT(je.LOWER_LEFT_EXT,je.NEGATIVE_ONE_TO_ONE_EXT),ae=Se;const at=ve;ve=null,this.setClear(at)}},getReversed:function(){return ae},setTest:function(Se){Se?ee(s.DEPTH_TEST):ye(s.DEPTH_TEST)},setMask:function(Se){Q!==Se&&!O&&(s.depthMask(Se),Q=Se)},setFunc:function(Se){if(ae&&(Se=nf[Se]),Ee!==Se){switch(Se){case Co:s.depthFunc(s.NEVER);break;case Lo:s.depthFunc(s.ALWAYS);break;case Do:s.depthFunc(s.LESS);break;case sa:s.depthFunc(s.LEQUAL);break;case Io:s.depthFunc(s.EQUAL);break;case No:s.depthFunc(s.GEQUAL);break;case Fo:s.depthFunc(s.GREATER);break;case Uo:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}Ee=Se}},setLocked:function(Se){O=Se},setClear:function(Se){ve!==Se&&(ve=Se,ae&&(Se=1-Se),s.clearDepth(Se))},reset:function(){O=!1,Q=null,Ee=null,ve=null,ae=!1}}}function i(){let O=!1,ae=null,Q=null,Ee=null,ve=null,Se=null,je=null,at=null,ge=null;return{setTest:function(Ye){O||(Ye?ee(s.STENCIL_TEST):ye(s.STENCIL_TEST))},setMask:function(Ye){ae!==Ye&&!O&&(s.stencilMask(Ye),ae=Ye)},setFunc:function(Ye,it,De){(Q!==Ye||Ee!==it||ve!==De)&&(s.stencilFunc(Ye,it,De),Q=Ye,Ee=it,ve=De)},setOp:function(Ye,it,De){(Se!==Ye||je!==it||at!==De)&&(s.stencilOp(Ye,it,De),Se=Ye,je=it,at=De)},setLocked:function(Ye){O=Ye},setClear:function(Ye){ge!==Ye&&(s.clearStencil(Ye),ge=Ye)},reset:function(){O=!1,ae=null,Q=null,Ee=null,ve=null,Se=null,je=null,at=null,ge=null}}}const a=new t,r=new n,o=new i;let c={};const l=new WeakMap;let h={},d={},u={},f=new WeakMap,p=[],b=null,g=!1,m=null,x=null,E=null,y=null,S=null,w=null,_=null,M=new pe(0,0,0),F=0,P=!1,I=null,D=null,L=null,R=null,U=null;const z=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,B=0;const k=s.getParameter(s.VERSION);k.indexOf("WebGL")!==-1?(B=parseFloat(/^WebGL (\d)/.exec(k)[1]),N=B>=1):k.indexOf("OpenGL ES")!==-1&&(B=parseFloat(/^OpenGL ES (\d)/.exec(k)[1]),N=B>=2);let V=null,X={};const Y=s.getParameter(s.SCISSOR_BOX),de=s.getParameter(s.VIEWPORT),W=new Et().fromArray(Y),J=new Et().fromArray(de);function te(O,ae,Q,Ee){const ve=new Uint8Array(4),Se=s.createTexture();s.bindTexture(O,Se),s.texParameteri(O,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(O,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let je=0;je<Q;je++)O===s.TEXTURE_3D||O===s.TEXTURE_2D_ARRAY?s.texImage3D(ae,0,s.RGBA,1,1,Ee,0,s.RGBA,s.UNSIGNED_BYTE,ve):s.texImage2D(ae+je,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ve);return Se}const ce={};ce[s.TEXTURE_2D]=te(s.TEXTURE_2D,s.TEXTURE_2D,1),ce[s.TEXTURE_CUBE_MAP]=te(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),ce[s.TEXTURE_2D_ARRAY]=te(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),ce[s.TEXTURE_3D]=te(s.TEXTURE_3D,s.TEXTURE_3D,1,1),a.setClear(0,0,0,1),r.setClear(1),o.setClear(0),ee(s.DEPTH_TEST),r.setFunc(sa),xe(!1),ie(dl),ee(s.CULL_FACE),Le(gs);function ee(O){h[O]!==!0&&(s.enable(O),h[O]=!0)}function ye(O){h[O]!==!1&&(s.disable(O),h[O]=!1)}function _e(O,ae){return u[O]!==ae?(s.bindFramebuffer(O,ae),u[O]=ae,O===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=ae),O===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=ae),!0):!1}function fe(O,ae){let Q=p,Ee=!1;if(O){Q=f.get(ae),Q===void 0&&(Q=[],f.set(ae,Q));const ve=O.textures;if(Q.length!==ve.length||Q[0]!==s.COLOR_ATTACHMENT0){for(let Se=0,je=ve.length;Se<je;Se++)Q[Se]=s.COLOR_ATTACHMENT0+Se;Q.length=ve.length,Ee=!0}}else Q[0]!==s.BACK&&(Q[0]=s.BACK,Ee=!0);Ee&&s.drawBuffers(Q)}function Ne(O){return b!==O?(s.useProgram(O),b=O,!0):!1}const ke={[us]:s.FUNC_ADD,[Mu]:s.FUNC_SUBTRACT,[Su]:s.FUNC_REVERSE_SUBTRACT};ke[wu]=s.MIN,ke[Eu]=s.MAX;const $={[Tu]:s.ZERO,[Au]:s.ONE,[Ru]:s.SRC_COLOR,[nd]:s.SRC_ALPHA,[Nu]:s.SRC_ALPHA_SATURATE,[Du]:s.DST_COLOR,[Cu]:s.DST_ALPHA,[Pu]:s.ONE_MINUS_SRC_COLOR,[id]:s.ONE_MINUS_SRC_ALPHA,[Iu]:s.ONE_MINUS_DST_COLOR,[Lu]:s.ONE_MINUS_DST_ALPHA,[Fu]:s.CONSTANT_COLOR,[Uu]:s.ONE_MINUS_CONSTANT_COLOR,[ku]:s.CONSTANT_ALPHA,[Ou]:s.ONE_MINUS_CONSTANT_ALPHA};function Le(O,ae,Q,Ee,ve,Se,je,at,ge,Ye){if(O===gs){g===!0&&(ye(s.BLEND),g=!1);return}if(g===!1&&(ee(s.BLEND),g=!0),O!==yu){if(O!==m||Ye!==P){if((x!==us||S!==us)&&(s.blendEquation(s.FUNC_ADD),x=us,S=us),Ye)switch(O){case Qs:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ul:s.blendFunc(s.ONE,s.ONE);break;case fl:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case pl:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Qe("WebGLState: Invalid blending: ",O);break}else switch(O){case Qs:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ul:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case fl:Qe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case pl:Qe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Qe("WebGLState: Invalid blending: ",O);break}E=null,y=null,w=null,_=null,M.set(0,0,0),F=0,m=O,P=Ye}return}ve=ve||ae,Se=Se||Q,je=je||Ee,(ae!==x||ve!==S)&&(s.blendEquationSeparate(ke[ae],ke[ve]),x=ae,S=ve),(Q!==E||Ee!==y||Se!==w||je!==_)&&(s.blendFuncSeparate($[Q],$[Ee],$[Se],$[je]),E=Q,y=Ee,w=Se,_=je),(at.equals(M)===!1||ge!==F)&&(s.blendColor(at.r,at.g,at.b,ge),M.copy(at),F=ge),m=O,P=!1}function be(O,ae){O.side===Rt?ye(s.CULL_FACE):ee(s.CULL_FACE);let Q=O.side===on;ae&&(Q=!Q),xe(Q),O.blending===Qs&&O.transparent===!1?Le(gs):Le(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),r.setFunc(O.depthFunc),r.setTest(O.depthTest),r.setMask(O.depthWrite),a.setMask(O.colorWrite);const Ee=O.stencilWrite;o.setTest(Ee),Ee&&(o.setMask(O.stencilWriteMask),o.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),o.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),We(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?ee(s.SAMPLE_ALPHA_TO_COVERAGE):ye(s.SAMPLE_ALPHA_TO_COVERAGE)}function xe(O){I!==O&&(O?s.frontFace(s.CW):s.frontFace(s.CCW),I=O)}function ie(O){O!==_u?(ee(s.CULL_FACE),O!==D&&(O===dl?s.cullFace(s.BACK):O===xu?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):ye(s.CULL_FACE),D=O}function He(O){O!==L&&(N&&s.lineWidth(O),L=O)}function We(O,ae,Q){O?(ee(s.POLYGON_OFFSET_FILL),(R!==ae||U!==Q)&&(R=ae,U=Q,r.getReversed()&&(ae=-ae,Q=-Q),s.polygonOffset(ae,Q))):ye(s.POLYGON_OFFSET_FILL)}function ot(O){O?ee(s.SCISSOR_TEST):ye(s.SCISSOR_TEST)}function nt(O){O===void 0&&(O=s.TEXTURE0+z-1),V!==O&&(s.activeTexture(O),V=O)}function _t(O,ae,Q){Q===void 0&&(V===null?Q=s.TEXTURE0+z-1:Q=V);let Ee=X[Q];Ee===void 0&&(Ee={type:void 0,texture:void 0},X[Q]=Ee),(Ee.type!==O||Ee.texture!==ae)&&(V!==Q&&(s.activeTexture(Q),V=Q),s.bindTexture(O,ae||ce[O]),Ee.type=O,Ee.texture=ae)}function H(){const O=X[V];O!==void 0&&O.type!==void 0&&(s.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function At(){try{s.compressedTexImage2D(...arguments)}catch(O){Qe("WebGLState:",O)}}function ft(){try{s.compressedTexImage3D(...arguments)}catch(O){Qe("WebGLState:",O)}}function xt(){try{s.texSubImage2D(...arguments)}catch(O){Qe("WebGLState:",O)}}function le(){try{s.texSubImage3D(...arguments)}catch(O){Qe("WebGLState:",O)}}function Ze(){try{s.compressedTexSubImage2D(...arguments)}catch(O){Qe("WebGLState:",O)}}function Fe(){try{s.compressedTexSubImage3D(...arguments)}catch(O){Qe("WebGLState:",O)}}function Ke(){try{s.texStorage2D(...arguments)}catch(O){Qe("WebGLState:",O)}}function C(){try{s.texStorage3D(...arguments)}catch(O){Qe("WebGLState:",O)}}function T(){try{s.texImage2D(...arguments)}catch(O){Qe("WebGLState:",O)}}function q(){try{s.texImage3D(...arguments)}catch(O){Qe("WebGLState:",O)}}function me(O){return d[O]!==void 0?d[O]:s.getParameter(O)}function oe(O,ae){d[O]!==ae&&(s.pixelStorei(O,ae),d[O]=ae)}function Me(O){W.equals(O)===!1&&(s.scissor(O.x,O.y,O.z,O.w),W.copy(O))}function Re(O){J.equals(O)===!1&&(s.viewport(O.x,O.y,O.z,O.w),J.copy(O))}function ne(O,ae){let Q=l.get(ae);Q===void 0&&(Q=new WeakMap,l.set(ae,Q));let Ee=Q.get(O);Ee===void 0&&(Ee=s.getUniformBlockIndex(ae,O.name),s.uniformBlockBinding(ae,Ee,Ee),Q.set(O,Ee))}function se(O,ae,Q){const ve=l.get(ae).get(O);c[ve]!==Q&&(s.bindBufferBase(s.UNIFORM_BUFFER,ve,Q),c[ve]=Q)}function we(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},d={},V=null,X={},u={},c={},f=new WeakMap,p=[],b=null,g=!1,m=null,x=null,E=null,y=null,S=null,w=null,_=null,M=new pe(0,0,0),F=0,P=!1,I=null,D=null,L=null,R=null,U=null,W.set(0,0,s.canvas.width,s.canvas.height),J.set(0,0,s.canvas.width,s.canvas.height),a.reset(),r.reset(),o.reset()}return{buffers:{color:a,depth:r,stencil:o},enable:ee,disable:ye,bindFramebuffer:_e,drawBuffers:fe,useProgram:Ne,setBlending:Le,setMaterial:be,setFlipSided:xe,setCullFace:ie,setLineWidth:He,setPolygonOffset:We,setScissorTest:ot,activeTexture:nt,bindTexture:_t,unbindTexture:H,compressedTexImage2D:At,compressedTexImage3D:ft,texImage2D:T,texImage3D:q,pixelStorei:oe,getParameter:me,updateUBOMapping:ne,uniformBlockBinding:se,texStorage2D:Ke,texStorage3D:C,texSubImage2D:xt,texSubImage3D:le,compressedTexSubImage2D:Ze,compressedTexSubImage3D:Fe,scissor:Me,viewport:Re,reset:we}}function w_(s,e,t,n,i,a,r){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Je,h=new WeakMap,d=new Set;let u;const f=new WeakMap,p=new Set,b=new FinalizationRegistry(C=>p.delete(C));let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(C,T){return g?new OffscreenCanvas(C,T):ha("canvas")}function x(C,T,q){let me=1;const oe=Ke(C);if((oe.width>q||oe.height>q)&&(me=q/Math.max(oe.width,oe.height)),me<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const Me=Math.floor(me*oe.width),Re=Math.floor(me*oe.height);u===void 0&&(u=m(Me,Re));const ne=T?m(Me,Re):u;return ne.width=Me,ne.height=Re,ne.getContext("2d").drawImage(C,0,0,Me,Re),qe("WebGLRenderer: Texture has been resized from ("+oe.width+"x"+oe.height+") to ("+Me+"x"+Re+")."),ne}else return"data"in C&&qe("WebGLRenderer: Image in DataTexture is too big ("+oe.width+"x"+oe.height+")."),C;return C}function E(C){return C.generateMipmaps}function y(C){s.generateMipmap(C)}function S(C){return C.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?s.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function w(C,T,q,me,oe,Me=!1){if(C!==null){if(s[C]!==void 0)return s[C];qe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let Re;me&&(Re=e.get("EXT_texture_norm16"),Re||qe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ne=T;if(T===s.RED&&(q===s.FLOAT&&(ne=s.R32F),q===s.HALF_FLOAT&&(ne=s.R16F),q===s.UNSIGNED_BYTE&&(ne=s.R8),q===s.UNSIGNED_SHORT&&Re&&(ne=Re.R16_EXT),q===s.SHORT&&Re&&(ne=Re.R16_SNORM_EXT)),T===s.RED_INTEGER&&(q===s.UNSIGNED_BYTE&&(ne=s.R8UI),q===s.UNSIGNED_SHORT&&(ne=s.R16UI),q===s.UNSIGNED_INT&&(ne=s.R32UI),q===s.BYTE&&(ne=s.R8I),q===s.SHORT&&(ne=s.R16I),q===s.INT&&(ne=s.R32I)),T===s.RG&&(q===s.FLOAT&&(ne=s.RG32F),q===s.HALF_FLOAT&&(ne=s.RG16F),q===s.UNSIGNED_BYTE&&(ne=s.RG8),q===s.UNSIGNED_SHORT&&Re&&(ne=Re.RG16_EXT),q===s.SHORT&&Re&&(ne=Re.RG16_SNORM_EXT)),T===s.RG_INTEGER&&(q===s.UNSIGNED_BYTE&&(ne=s.RG8UI),q===s.UNSIGNED_SHORT&&(ne=s.RG16UI),q===s.UNSIGNED_INT&&(ne=s.RG32UI),q===s.BYTE&&(ne=s.RG8I),q===s.SHORT&&(ne=s.RG16I),q===s.INT&&(ne=s.RG32I)),T===s.RGB_INTEGER&&(q===s.UNSIGNED_BYTE&&(ne=s.RGB8UI),q===s.UNSIGNED_SHORT&&(ne=s.RGB16UI),q===s.UNSIGNED_INT&&(ne=s.RGB32UI),q===s.BYTE&&(ne=s.RGB8I),q===s.SHORT&&(ne=s.RGB16I),q===s.INT&&(ne=s.RGB32I)),T===s.RGBA_INTEGER&&(q===s.UNSIGNED_BYTE&&(ne=s.RGBA8UI),q===s.UNSIGNED_SHORT&&(ne=s.RGBA16UI),q===s.UNSIGNED_INT&&(ne=s.RGBA32UI),q===s.BYTE&&(ne=s.RGBA8I),q===s.SHORT&&(ne=s.RGBA16I),q===s.INT&&(ne=s.RGBA32I)),T===s.RGB&&(q===s.UNSIGNED_SHORT&&Re&&(ne=Re.RGB16_EXT),q===s.SHORT&&Re&&(ne=Re.RGB16_SNORM_EXT),q===s.UNSIGNED_INT_5_9_9_9_REV&&(ne=s.RGB9_E5),q===s.UNSIGNED_INT_10F_11F_11F_REV&&(ne=s.R11F_G11F_B10F)),T===s.RGBA){const se=Me?gr:lt.getTransfer(oe);q===s.FLOAT&&(ne=s.RGBA32F),q===s.HALF_FLOAT&&(ne=s.RGBA16F),q===s.UNSIGNED_BYTE&&(ne=se===yt?s.SRGB8_ALPHA8:s.RGBA8),q===s.UNSIGNED_SHORT&&Re&&(ne=Re.RGBA16_EXT),q===s.SHORT&&Re&&(ne=Re.RGBA16_SNORM_EXT),q===s.UNSIGNED_SHORT_4_4_4_4&&(ne=s.RGBA4),q===s.UNSIGNED_SHORT_5_5_5_1&&(ne=s.RGB5_A1)}return(ne===s.R16F||ne===s.R32F||ne===s.RG16F||ne===s.RG32F||ne===s.RGBA16F||ne===s.RGBA32F)&&e.get("EXT_color_buffer_float"),ne}function _(C,T){let q;return C?T===null||T===Vn||T===ys?q=s.DEPTH24_STENCIL8:T===vn?q=s.DEPTH32F_STENCIL8:T===ra&&(q=s.DEPTH24_STENCIL8,qe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===Vn||T===ys?q=s.DEPTH_COMPONENT24:T===vn?q=s.DEPTH_COMPONENT32F:T===ra&&(q=s.DEPTH_COMPONENT16),q}function M(C,T){return E(C)===!0||C.isFramebufferTexture&&C.minFilter!==Bt&&C.minFilter!==jt?Math.log2(Math.max(T.width,T.height))+1:C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?T.mipmaps.length:1}function F(C){const T=new WeakRef(C);n.get(C).__ref=T,p.add(T),b.register(C,T,T)}function P(C){const T=n.get(C).__ref;T!==void 0&&(p.delete(T),b.unregister(T))}function I(C){L(C.target)}function D(C){R(C.target)}function L(C){C.removeEventListener("dispose",I),P(C),z(C),C.isVideoTexture&&h.delete(C),C.isHTMLTexture&&d.delete(C)}function R(C){C.removeEventListener("dispose",D),P(C),B(C)}function U(){for(const C of p){const T=C.deref();T!==void 0&&(T.isRenderTarget===!0?R(T):L(T))}p.clear(),d.clear()}function z(C){const T=n.get(C);if(T.__webglInit===void 0)return;const q=C.source,me=f.get(q);if(me){const oe=me[T.__cacheKey];oe.usedTimes--,oe.usedTimes===0&&N(C),Object.keys(me).length===0&&f.delete(q)}n.remove(C)}function N(C){const T=n.get(C);s.deleteTexture(T.__webglTexture);const q=C.source,me=f.get(q);delete me[T.__cacheKey],r.memory.textures--}function B(C){const T=n.get(C);T.__depthDisposeCallback&&T.__depthDisposeCallback();const q=C.depthTexture;if(q&&q.renderTarget===C&&L(q),C.isWebGLCubeRenderTarget)for(let oe=0;oe<6;oe++){if(Array.isArray(T.__webglFramebuffer[oe]))for(let Me=0;Me<T.__webglFramebuffer[oe].length;Me++)s.deleteFramebuffer(T.__webglFramebuffer[oe][Me]);else s.deleteFramebuffer(T.__webglFramebuffer[oe]);T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer[oe])}else{if(Array.isArray(T.__webglFramebuffer))for(let oe=0;oe<T.__webglFramebuffer.length;oe++)s.deleteFramebuffer(T.__webglFramebuffer[oe]);else s.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&s.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let oe=0;oe<T.__webglColorRenderbuffer.length;oe++)T.__webglColorRenderbuffer[oe]&&s.deleteRenderbuffer(T.__webglColorRenderbuffer[oe]);T.__webglDepthRenderbuffer&&s.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const me=C.textures;for(let oe=0,Me=me.length;oe<Me;oe++){const Re=n.get(me[oe]);Re.__webglTexture&&(s.deleteTexture(Re.__webglTexture),r.memory.textures--),n.remove(me[oe])}n.remove(C)}let k=0;function V(){k=0}function X(){return k}function Y(C){k=C}function de(){const C=k;return C>=i.maxTextures&&qe("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+i.maxTextures),k+=1,C}function W(C){const T=[];return T.push(C.wrapS),T.push(C.wrapT),T.push(C.wrapR||0),T.push(C.magFilter),T.push(C.minFilter),T.push(C.anisotropy),T.push(C.internalFormat),T.push(C.format),T.push(C.type),T.push(C.generateMipmaps),T.push(C.mipmapsAutoUpdate),T.push(C.premultiplyAlpha),T.push(C.flipY),T.push(C.unpackAlignment),T.push(C.colorSpace),T.join()}function J(C,T){const q=n.get(C);if(C.isVideoTexture&&Ze(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&q.__version!==C.version){const me=C.image;if(me===null)qe("WebGLRenderer: Texture marked for update but no image data found.");else if(me.complete===!1)qe("WebGLRenderer: Texture marked for update but image is incomplete");else{be(q,C,T);return}}else C.isExternalTexture&&(q.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,q.__webglTexture,s.TEXTURE0+T)}function te(C,T){const q=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&q.__version!==C.version){be(q,C,T);return}else C.isExternalTexture&&(q.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,q.__webglTexture,s.TEXTURE0+T)}function ce(C,T){const q=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&q.__version!==C.version){be(q,C,T);return}t.bindTexture(s.TEXTURE_3D,q.__webglTexture,s.TEXTURE0+T)}function ee(C,T){const q=n.get(C);if(C.version>0&&q.__version!==C.version){xe(q,C,T);return}t.bindTexture(s.TEXTURE_CUBE_MAP,q.__webglTexture,s.TEXTURE0+T)}const ye={[qi]:s.REPEAT,[zn]:s.CLAMP_TO_EDGE,[fr]:s.MIRRORED_REPEAT},_e={[Bt]:s.NEAREST,[ud]:s.NEAREST_MIPMAP_NEAREST,[Ys]:s.NEAREST_MIPMAP_LINEAR,[jt]:s.LINEAR,[rr]:s.LINEAR_MIPMAP_NEAREST,[Bn]:s.LINEAR_MIPMAP_LINEAR},fe={[Ku]:s.NEVER,[Md]:s.ALWAYS,[ju]:s.LESS,[vd]:s.LEQUAL,[Yu]:s.EQUAL,[yd]:s.GEQUAL,[Ju]:s.GREATER,[Zu]:s.NOTEQUAL};function Ne(C,T){if(T.type===vn&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===jt||T.magFilter===rr||T.magFilter===Ys||T.magFilter===Bn||T.minFilter===jt||T.minFilter===rr||T.minFilter===Ys||T.minFilter===Bn)&&qe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(C,s.TEXTURE_WRAP_S,ye[T.wrapS]),s.texParameteri(C,s.TEXTURE_WRAP_T,ye[T.wrapT]),(C===s.TEXTURE_3D||C===s.TEXTURE_2D_ARRAY)&&s.texParameteri(C,s.TEXTURE_WRAP_R,ye[T.wrapR]),s.texParameteri(C,s.TEXTURE_MAG_FILTER,_e[T.magFilter]),s.texParameteri(C,s.TEXTURE_MIN_FILTER,_e[T.minFilter]),T.compareFunction&&(s.texParameteri(C,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(C,s.TEXTURE_COMPARE_FUNC,fe[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Bt||T.minFilter!==Ys&&T.minFilter!==Bn||T.type===vn&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){const q=e.get("EXT_texture_filter_anisotropic");s.texParameterf(C,q.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,i.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function ke(C,T){let q=!1;C.__webglInit===void 0&&(C.__webglInit=!0,T.addEventListener("dispose",I),F(T));const me=T.source;let oe=f.get(me);oe===void 0&&(oe={},f.set(me,oe));const Me=W(T);if(Me!==C.__cacheKey){oe[Me]===void 0&&(oe[Me]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,q=!0),oe[Me].usedTimes++;const Re=oe[C.__cacheKey];Re!==void 0&&(oe[C.__cacheKey].usedTimes--,Re.usedTimes===0&&N(T)),C.__cacheKey=Me,C.__webglTexture=oe[Me].texture}return q}function $(C,T,q){return Math.floor(Math.floor(C/q)/T)}function Le(C,T,q,me){const Me=C.updateRanges;if(Me.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,T.width,T.height,q,me,T.data);else{Me.sort((O,ae)=>O.start-ae.start);let Re=0;for(let O=1;O<Me.length;O++){const ae=Me[Re],Q=Me[O],Ee=ae.start+ae.count,ve=$(Q.start,T.width,4),Se=$(ae.start,T.width,4);Q.start<=Ee+1&&ve===Se&&$(Q.start+Q.count-1,T.width,4)===ve?ae.count=Math.max(ae.count,Q.start+Q.count-ae.start):(++Re,Me[Re]=Q)}Me.length=Re+1;const ne=t.getParameter(s.UNPACK_ROW_LENGTH),se=t.getParameter(s.UNPACK_SKIP_PIXELS),we=t.getParameter(s.UNPACK_SKIP_ROWS);t.pixelStorei(s.UNPACK_ROW_LENGTH,T.width);for(let O=0,ae=Me.length;O<ae;O++){const Q=Me[O],Ee=Math.floor(Q.start/4),ve=Math.ceil(Q.count/4),Se=Ee%T.width,je=Math.floor(Ee/T.width),at=ve,ge=1;t.pixelStorei(s.UNPACK_SKIP_PIXELS,Se),t.pixelStorei(s.UNPACK_SKIP_ROWS,je),t.texSubImage2D(s.TEXTURE_2D,0,Se,je,at,ge,q,me,T.data)}C.clearUpdateRanges(),t.pixelStorei(s.UNPACK_ROW_LENGTH,ne),t.pixelStorei(s.UNPACK_SKIP_PIXELS,se),t.pixelStorei(s.UNPACK_SKIP_ROWS,we)}}function be(C,T,q){let me=s.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(me=s.TEXTURE_2D_ARRAY),T.isData3DTexture&&(me=s.TEXTURE_3D);const oe=ke(C,T),Me=T.source;t.bindTexture(me,C.__webglTexture,s.TEXTURE0+q);const Re=n.get(Me);if(Me.version!==Re.__version||oe===!0){if(t.activeTexture(s.TEXTURE0+q),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const ge=lt.getPrimaries(lt.workingColorSpace),Ye=T.colorSpace===yi?null:lt.getPrimaries(T.colorSpace),it=T.colorSpace===yi||ge===Ye?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,it)}t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment);let se=x(T.image,!1,i.maxTextureSize);se=Fe(T,se);const we=a.convert(T.format,T.colorSpace),O=a.convert(T.type);let ae=w(T.internalFormat,we,O,T.normalized,T.colorSpace,T.isVideoTexture);Ne(me,T);let Q;const Ee=T.mipmaps,ve=T.isVideoTexture!==!0,Se=Re.__version===void 0||oe===!0,je=Me.dataReady,at=M(T,se);if(T.isDepthTexture)ae=_(T.format===Mi,T.type),Se&&(ve?t.texStorage2D(s.TEXTURE_2D,1,ae,se.width,se.height):t.texImage2D(s.TEXTURE_2D,0,ae,se.width,se.height,0,we,O,null));else if(T.isDataTexture)if(Ee.length>0){ve&&Se&&t.texStorage2D(s.TEXTURE_2D,at,ae,Ee[0].width,Ee[0].height);for(let ge=0,Ye=Ee.length;ge<Ye;ge++)Q=Ee[ge],ve?je&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,Q.width,Q.height,we,O,Q.data):t.texImage2D(s.TEXTURE_2D,ge,ae,Q.width,Q.height,0,we,O,Q.data);T.generateMipmaps=!1}else ve?(Se&&t.texStorage2D(s.TEXTURE_2D,at,ae,se.width,se.height),je&&Le(T,se,we,O)):t.texImage2D(s.TEXTURE_2D,0,ae,se.width,se.height,0,we,O,se.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){ve&&Se&&t.texStorage3D(s.TEXTURE_2D_ARRAY,at,ae,Ee[0].width,Ee[0].height,se.depth);for(let ge=0,Ye=Ee.length;ge<Ye;ge++)if(Q=Ee[ge],T.format!==An)if(we!==null)if(ve){if(je)if(T.layerUpdates.size>0){const it=uh(Q.width,Q.height,T.format,T.type);for(const De of T.layerUpdates){const vt=Q.data.subarray(De*it/Q.data.BYTES_PER_ELEMENT,(De+1)*it/Q.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,De,Q.width,Q.height,1,we,vt)}}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,0,Q.width,Q.height,se.depth,we,Q.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,ge,ae,Q.width,Q.height,se.depth,0,Q.data,0,0);else qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ve?je&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,0,Q.width,Q.height,se.depth,we,O,Q.data):t.texImage3D(s.TEXTURE_2D_ARRAY,ge,ae,Q.width,Q.height,se.depth,0,we,O,Q.data);T.layerUpdates.size>0&&T.clearLayerUpdates()}else{ve&&Se&&t.texStorage2D(s.TEXTURE_2D,at,ae,Ee[0].width,Ee[0].height);for(let ge=0,Ye=Ee.length;ge<Ye;ge++)Q=Ee[ge],T.format!==An?we!==null?ve?je&&t.compressedTexSubImage2D(s.TEXTURE_2D,ge,0,0,Q.width,Q.height,we,Q.data):t.compressedTexImage2D(s.TEXTURE_2D,ge,ae,Q.width,Q.height,0,Q.data):qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ve?je&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,Q.width,Q.height,we,O,Q.data):t.texImage2D(s.TEXTURE_2D,ge,ae,Q.width,Q.height,0,we,O,Q.data)}else if(T.isDataArrayTexture)if(ve){if(Se&&t.texStorage3D(s.TEXTURE_2D_ARRAY,at,ae,se.width,se.height,se.depth),je)if(T.layerUpdates.size>0){const ge=uh(se.width,se.height,T.format,T.type);for(const Ye of T.layerUpdates){const it=se.data.subarray(Ye*ge/se.data.BYTES_PER_ELEMENT,(Ye+1)*ge/se.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Ye,se.width,se.height,1,we,O,it)}T.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,se.width,se.height,se.depth,we,O,se.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,ae,se.width,se.height,se.depth,0,we,O,se.data);else if(T.isData3DTexture)ve?(Se&&t.texStorage3D(s.TEXTURE_3D,at,ae,se.width,se.height,se.depth),je&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,se.width,se.height,se.depth,we,O,se.data)):t.texImage3D(s.TEXTURE_3D,0,ae,se.width,se.height,se.depth,0,we,O,se.data);else if(T.isFramebufferTexture){if(Se)if(ve)t.texStorage2D(s.TEXTURE_2D,at,ae,se.width,se.height);else{let ge=se.width,Ye=se.height;for(let it=0;it<at;it++)t.texImage2D(s.TEXTURE_2D,it,ae,ge,Ye,0,we,O,null),ge>>=1,Ye>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in s){const ge=s.canvas;if(ge.hasAttribute("layoutsubtree")||ge.setAttribute("layoutsubtree","true"),se.parentNode!==ge){ge.appendChild(se),d.add(T),ge.onpaint=Ye=>{const it=Ye.changedElements;for(const De of d)it.includes(De.image)&&(De.needsUpdate=!0)},ge.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,se);else{const it=s.RGBA,De=s.RGBA,vt=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,it,De,vt,se)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(Ee.length>0){if(ve&&Se){const ge=Ke(Ee[0]);t.texStorage2D(s.TEXTURE_2D,at,ae,ge.width,ge.height)}for(let ge=0,Ye=Ee.length;ge<Ye;ge++)Q=Ee[ge],ve?je&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,we,O,Q):t.texImage2D(s.TEXTURE_2D,ge,ae,we,O,Q);T.generateMipmaps=!1}else if(ve){if(Se){const ge=Ke(se);t.texStorage2D(s.TEXTURE_2D,at,ae,ge.width,ge.height)}je&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,we,O,se)}else t.texImage2D(s.TEXTURE_2D,0,ae,we,O,se);E(T)&&T.mipmapsAutoUpdate===!0&&y(me),Re.__version=Me.version,T.onUpdate&&T.onUpdate(T)}C.__version=T.version}function xe(C,T,q){if(T.image.length!==6)return;const me=ke(C,T),oe=T.source;t.bindTexture(s.TEXTURE_CUBE_MAP,C.__webglTexture,s.TEXTURE0+q);const Me=n.get(oe);if(oe.version!==Me.__version||me===!0){t.activeTexture(s.TEXTURE0+q);const Re=lt.getPrimaries(lt.workingColorSpace),ne=T.colorSpace===yi?null:lt.getPrimaries(T.colorSpace),se=T.colorSpace===yi||Re===ne?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,se);const we=T.isCompressedTexture||T.image[0].isCompressedTexture,O=T.image[0]&&T.image[0].isDataTexture,ae=[];for(let De=0;De<6;De++)!we&&!O?ae[De]=x(T.image[De],!0,i.maxCubemapSize):ae[De]=O?T.image[De].image:T.image[De],ae[De]=Fe(T,ae[De]);const Q=ae[0],Ee=a.convert(T.format,T.colorSpace),ve=a.convert(T.type);let Se=w(T.internalFormat,Ee,ve,T.normalized,T.colorSpace);const je=T.isVideoTexture!==!0,at=Me.__version===void 0||me===!0,ge=oe.dataReady;let Ye=M(T,Q);Ne(s.TEXTURE_CUBE_MAP,T);let it;if(T.isDepthTexture){if(Se=_(T.format===Mi,T.type),at)if(je)t.texStorage2D(s.TEXTURE_CUBE_MAP,1,Se,Q.width,Q.height);else for(let De=0;De<6;De++)t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,Se,Q.width,Q.height,0,Ee,ve,null)}else if(we){je&&at&&t.texStorage2D(s.TEXTURE_CUBE_MAP,Ye,Se,Q.width,Q.height);for(let De=0;De<6;De++){it=ae[De].mipmaps;for(let vt=0;vt<it.length;vt++){const Wt=it[vt];T.format!==An?Ee!==null?je?ge&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt,0,0,Wt.width,Wt.height,Ee,Wt.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt,Se,Wt.width,Wt.height,0,Wt.data):qe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):je?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt,0,0,Wt.width,Wt.height,Ee,ve,Wt.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt,Se,Wt.width,Wt.height,0,Ee,ve,Wt.data)}}}else{if(it=T.mipmaps,je&&at){it.length>0&&Ye++;const De=Ke(ae[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,Ye,Se,De.width,De.height)}for(let De=0;De<6;De++)if(O){je?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,0,0,ae[De].width,ae[De].height,Ee,ve,ae[De].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,Se,ae[De].width,ae[De].height,0,Ee,ve,ae[De].data);for(let vt=0;vt<it.length;vt++){const li=it[vt].image[De].image;je?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt+1,0,0,li.width,li.height,Ee,ve,li.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt+1,Se,li.width,li.height,0,Ee,ve,li.data)}}else{je?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,0,0,Ee,ve,ae[De]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,0,Se,Ee,ve,ae[De]);for(let vt=0;vt<it.length;vt++){const Wt=it[vt];je?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt+1,0,0,Ee,ve,Wt.image[De]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+De,vt+1,Se,Ee,ve,Wt.image[De])}}}E(T)&&T.mipmapsAutoUpdate===!0&&y(s.TEXTURE_CUBE_MAP),Me.__version=oe.version,T.onUpdate&&T.onUpdate(T)}C.__version=T.version}function ie(C,T,q,me,oe,Me){const Re=a.convert(q.format,q.colorSpace),ne=a.convert(q.type),se=w(q.internalFormat,Re,ne,q.normalized,q.colorSpace),we=n.get(T),O=n.get(q);if(O.__renderTarget=T,!we.__hasExternalTextures){const ae=Math.max(1,T.width>>Me),Q=Math.max(1,T.height>>Me);oe===s.TEXTURE_3D||oe===s.TEXTURE_2D_ARRAY?t.texImage3D(oe,Me,se,ae,Q,T.depth,0,Re,ne,null):t.texImage2D(oe,Me,se,ae,Q,0,Re,ne,null)}t.bindFramebuffer(s.FRAMEBUFFER,C),le(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,me,oe,O.__webglTexture,0,xt(T)):(oe===s.TEXTURE_2D||oe>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&oe<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,me,oe,O.__webglTexture,Me),t.bindFramebuffer(s.FRAMEBUFFER,null)}function He(C,T,q){if(s.bindRenderbuffer(s.RENDERBUFFER,C),T.depthBuffer){const me=T.depthTexture,oe=me&&me.isDepthTexture?me.type:null,Me=_(T.stencilBuffer,oe),Re=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;le(T)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,xt(T),Me,T.width,T.height):q?s.renderbufferStorageMultisample(s.RENDERBUFFER,xt(T),Me,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,Me,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Re,s.RENDERBUFFER,C)}else{const me=T.textures;for(let oe=0;oe<me.length;oe++){const Me=me[oe],Re=a.convert(Me.format,Me.colorSpace),ne=a.convert(Me.type),se=w(Me.internalFormat,Re,ne,Me.normalized,Me.colorSpace);le(T)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,xt(T),se,T.width,T.height):q?s.renderbufferStorageMultisample(s.RENDERBUFFER,xt(T),se,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,se,T.width,T.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function We(C,T,q){const me=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(s.FRAMEBUFFER,C),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const oe=n.get(T.depthTexture);oe.__renderTarget=T;const Me=me?T.depthTexture.image[0]:T.depthTexture.image;(!oe.__webglTexture||Me.width!==T.width||Me.height!==T.height)&&(Me.width=T.width,Me.height=T.height,T.depthTexture.needsUpdate=!0),me?ee(T.depthTexture,0):J(T.depthTexture,0);const Re=oe.__webglTexture,ne=xt(T),se=me?s.TEXTURE_CUBE_MAP_POSITIVE_X+q:s.TEXTURE_2D,we=T.depthTexture.format===Mi?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(T.depthTexture.format===Ai)le(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,we,se,Re,0,ne):s.framebufferTexture2D(s.FRAMEBUFFER,we,se,Re,0);else if(T.depthTexture.format===Mi)le(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,we,se,Re,0,ne):s.framebufferTexture2D(s.FRAMEBUFFER,we,se,Re,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ot(C){const T=n.get(C),q=C.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==C.depthTexture){const me=C.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),me){const oe=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,me.removeEventListener("dispose",oe)};me.addEventListener("dispose",oe),T.__depthDisposeCallback=oe}T.__boundDepthTexture=me}if(C.depthTexture&&!T.__autoAllocateDepthBuffer)if(q)for(let me=0;me<6;me++)We(T.__webglFramebuffer[me],C,me);else C.texture.mipmaps.length>0?We(T.__webglFramebuffer[0],C,0):We(T.__webglFramebuffer,C,0);else if(q){T.__webglDepthbuffer=[];for(let me=0;me<6;me++)if(t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[me]),T.__webglDepthbuffer[me]===void 0)T.__webglDepthbuffer[me]=s.createRenderbuffer(),He(T.__webglDepthbuffer[me],C,!1);else{const oe=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Me=T.__webglDepthbuffer[me];s.bindRenderbuffer(s.RENDERBUFFER,Me),s.framebufferRenderbuffer(s.FRAMEBUFFER,oe,s.RENDERBUFFER,Me)}}else if(C.texture.mipmaps.length>0?t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=s.createRenderbuffer(),He(T.__webglDepthbuffer,C,!1);else{const oe=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Me=T.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,Me),s.framebufferRenderbuffer(s.FRAMEBUFFER,oe,s.RENDERBUFFER,Me)}t.bindFramebuffer(s.FRAMEBUFFER,null)}function nt(C,T,q){const me=n.get(C);T!==void 0&&ie(me.__webglFramebuffer,C,C.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),q!==void 0&&ot(C)}function _t(C){const T=C.texture,q=n.get(C),me=n.get(T);C.addEventListener("dispose",D),F(C);const oe=C.textures,Me=C.isWebGLCubeRenderTarget===!0,Re=oe.length>1;if(Re||(me.__webglTexture===void 0&&(me.__webglTexture=s.createTexture()),me.__version=T.version,r.memory.textures++),Me){q.__webglFramebuffer=[];for(let ne=0;ne<6;ne++)if(T.mipmaps.length>0){q.__webglFramebuffer[ne]=[];for(let se=0;se<T.mipmaps.length;se++)q.__webglFramebuffer[ne][se]=s.createFramebuffer()}else q.__webglFramebuffer[ne]=s.createFramebuffer()}else{if(T.mipmaps.length>0){q.__webglFramebuffer=[];for(let ne=0;ne<T.mipmaps.length;ne++)q.__webglFramebuffer[ne]=s.createFramebuffer()}else q.__webglFramebuffer=s.createFramebuffer();if(Re)for(let ne=0,se=oe.length;ne<se;ne++){const we=n.get(oe[ne]);we.__webglTexture===void 0&&(we.__webglTexture=s.createTexture(),r.memory.textures++)}if(C.samples>0&&le(C)===!1){q.__webglMultisampledFramebuffer=s.createFramebuffer(),q.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,q.__webglMultisampledFramebuffer);for(let ne=0;ne<oe.length;ne++){const se=oe[ne];q.__webglColorRenderbuffer[ne]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,q.__webglColorRenderbuffer[ne]);const we=a.convert(se.format,se.colorSpace),O=a.convert(se.type),ae=w(se.internalFormat,we,O,se.normalized,se.colorSpace,C.isXRRenderTarget===!0),Q=xt(C);s.renderbufferStorageMultisample(s.RENDERBUFFER,Q,ae,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ne,s.RENDERBUFFER,q.__webglColorRenderbuffer[ne])}s.bindRenderbuffer(s.RENDERBUFFER,null),C.depthBuffer&&(q.__webglDepthRenderbuffer=s.createRenderbuffer(),He(q.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(Me){t.bindTexture(s.TEXTURE_CUBE_MAP,me.__webglTexture),Ne(s.TEXTURE_CUBE_MAP,T);for(let ne=0;ne<6;ne++)if(T.mipmaps.length>0)for(let se=0;se<T.mipmaps.length;se++)ie(q.__webglFramebuffer[ne][se],C,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ne,se);else ie(q.__webglFramebuffer[ne],C,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ne,0);E(T)?y(s.TEXTURE_CUBE_MAP):T.mipmaps.length>0&&s.texParameteri(s.TEXTURE_CUBE_MAP,s.TEXTURE_MAX_LEVEL,T.mipmaps.length-1),t.unbindTexture()}else if(Re){for(let ne=0,se=oe.length;ne<se;ne++){const we=oe[ne],O=n.get(we);let ae=s.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ae=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ae,O.__webglTexture),Ne(ae,we),ie(q.__webglFramebuffer,C,we,s.COLOR_ATTACHMENT0+ne,ae,0),E(we)&&y(ae)}t.unbindTexture()}else{let ne=s.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ne=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ne,me.__webglTexture),Ne(ne,T),T.mipmaps.length>0)for(let se=0;se<T.mipmaps.length;se++)ie(q.__webglFramebuffer[se],C,T,s.COLOR_ATTACHMENT0,ne,se);else ie(q.__webglFramebuffer,C,T,s.COLOR_ATTACHMENT0,ne,0);E(T)?y(ne):T.mipmaps.length>0&&s.texParameteri(ne,s.TEXTURE_MAX_LEVEL,T.mipmaps.length-1),t.unbindTexture()}C.depthBuffer&&ot(C)}function H(C){const T=C.textures;for(let q=0,me=T.length;q<me;q++){const oe=T[q];if(E(oe)&&oe.mipmapsAutoUpdate===!0){const Me=S(C),Re=n.get(oe).__webglTexture;t.bindTexture(Me,Re),y(Me),t.unbindTexture()}}}const At=[];function ft(C){if(C.samples>0){if(le(C)===!1){const T=C.textures,q=C.width,me=C.height;let oe=s.COLOR_BUFFER_BIT;const Me=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Re=n.get(C),ne=T.length>1;if(ne)for(let we=0;we<T.length;we++)t.bindFramebuffer(s.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Re.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Re.__webglMultisampledFramebuffer),C.texture.mipmaps.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Re.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Re.__webglFramebuffer);for(let we=0;we<T.length;we++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(oe|=s.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(oe|=s.STENCIL_BUFFER_BIT)),ne){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Re.__webglColorRenderbuffer[we]);const O=n.get(T[we]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,O,0)}s.blitFramebuffer(0,0,q,me,0,0,q,me,oe,s.NEAREST),c===!0&&(At.length=0,At.push(s.COLOR_ATTACHMENT0+we),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&At.push(Me),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,At))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ne)for(let we=0;we<T.length;we++){t.bindFramebuffer(s.FRAMEBUFFER,Re.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.RENDERBUFFER,Re.__webglColorRenderbuffer[we]);const O=n.get(T[we]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Re.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.TEXTURE_2D,O,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Re.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&c){const T=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[T])}}}function xt(C){return Math.min(i.maxSamples,C.samples)}function le(C){const T=n.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Ze(C){const T=r.render.frame;h.get(C)!==T&&(h.set(C,T),C.update())}function Fe(C,T){const q=C.colorSpace,me=C.format,oe=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||q!==mn&&q!==yi&&(lt.getTransfer(q)===yt?(me!==An||oe!==fn)&&qe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Qe("WebGLTextures: Unsupported texture color space:",q)),T}function Ke(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(l.width=C.naturalWidth||C.width,l.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(l.width=C.displayWidth,l.height=C.displayHeight):(l.width=C.width,l.height=C.height),l}this.allocateTextureUnit=de,this.resetTextureUnits=V,this.getTextureUnits=X,this.setTextureUnits=Y,this.setTexture2D=J,this.setTexture2DArray=te,this.setTexture3D=ce,this.setTextureCube=ee,this.rebindTextures=nt,this.setupRenderTarget=_t,this.updateRenderTargetMipmap=H,this.updateMultisampleRenderTarget=ft,this.setupDepthRenderbuffer=ot,this.setupFrameBufferTexture=ie,this.useMultisampledRTT=le,this.dispose=U}function E_(s,e){function t(n,i=yi){let a;const r=lt.getTransfer(i);if(n===fn)return s.UNSIGNED_BYTE;if(n===Tc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===Ac)return s.UNSIGNED_SHORT_5_5_5_1;if(n===md)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===gd)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===fd)return s.BYTE;if(n===pd)return s.SHORT;if(n===ra)return s.UNSIGNED_SHORT;if(n===Ec)return s.INT;if(n===Vn)return s.UNSIGNED_INT;if(n===vn)return s.FLOAT;if(n===Wn)return s.HALF_FLOAT;if(n===bd)return s.ALPHA;if(n===_d)return s.RGB;if(n===An)return s.RGBA;if(n===Ai)return s.DEPTH_COMPONENT;if(n===Mi)return s.DEPTH_STENCIL;if(n===Rc)return s.RED;if(n===Pc)return s.RED_INTEGER;if(n===Xi)return s.RG;if(n===Cc)return s.RG_INTEGER;if(n===Lc)return s.RGBA_INTEGER;if(n===or||n===cr||n===lr||n===hr)if(r===yt)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(n===or)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===cr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===lr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===hr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(n===or)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===cr)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===lr)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===hr)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===ko||n===Oo||n===zo||n===Bo)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(n===ko)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Oo)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===zo)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Bo)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Go||n===Ho||n===Vo||n===Wo||n===qo||n===pr||n===Xo)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(n===Go||n===Ho)return r===yt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(n===Vo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC;if(n===Wo)return a.COMPRESSED_R11_EAC;if(n===qo)return a.COMPRESSED_SIGNED_R11_EAC;if(n===pr)return a.COMPRESSED_RG11_EAC;if(n===Xo)return a.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ko||n===jo||n===Yo||n===Jo||n===Zo||n===$o||n===Qo||n===ec||n===tc||n===nc||n===ic||n===sc||n===ac||n===rc)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(n===Ko)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===jo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Yo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Jo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Zo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===$o)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Qo)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ec)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===tc)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===nc)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ic)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===sc)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ac)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===rc)return r===yt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===oc||n===cc||n===lc)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(n===oc)return r===yt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===cc)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===lc)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===hc||n===dc||n===mr||n===uc)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(n===hc)return a.COMPRESSED_RED_RGTC1_EXT;if(n===dc)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===mr)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===uc)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ys?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const T_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,A_=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class R_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Id(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ji({vertexShader:T_,fragmentShader:A_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ft(new _a(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class P_ extends Ri{constructor(e,t){super();const n=this;let i=null,a=1,r=null,o="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,p=null;const b=typeof XRWebGLBinding<"u",g=new R_,m={},x=t.getContextAttributes();let E=null,y=null;const S=[],w=[],_=new Je;let M=null,F=null;const P=new hn;P.viewport=new Et;const I=new hn;I.viewport=new Et;const D=[P,I],L=new Ap;let R=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let J=S[W];return J===void 0&&(J=new Vr,S[W]=J),J.getTargetRaySpace()},this.getControllerGrip=function(W){let J=S[W];return J===void 0&&(J=new Vr,S[W]=J),J.getGripSpace()},this.getHand=function(W){let J=S[W];return J===void 0&&(J=new Vr,S[W]=J),J.getHandSpace()};function z(W){const J=w.indexOf(W.inputSource);if(J===-1)return;const te=S[J];te!==void 0&&(te.update(W.inputSource,W.frame,l||r),te.dispatchEvent({type:W.type,data:W.inputSource}))}function N(){i.removeEventListener("select",z),i.removeEventListener("selectstart",z),i.removeEventListener("selectend",z),i.removeEventListener("squeeze",z),i.removeEventListener("squeezestart",z),i.removeEventListener("squeezeend",z),i.removeEventListener("end",N),i.removeEventListener("inputsourceschange",B);for(let W=0;W<S.length;W++){const J=w[W];J!==null&&(w[W]=null,S[W].disconnect(J))}R=null,U=null,g.reset();for(const W in m)delete m[W];if(e.setRenderTarget(E),f=null,u=null,d=null,i=null,y=null,de.stop(),n.isPresenting=!1,e.setPixelRatio(M),e.setSize(_.width,_.height,!1),F!==null){const W=F.camera;W.fov=F.fov,W.zoom=F.zoom,W.updateProjectionMatrix(),F=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){a=W,n.isPresenting===!0&&qe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){o=W,n.isPresenting===!0&&qe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||r},this.setReferenceSpace=function(W){l=W},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&b&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(W){if(i=W,i!==null){if(E=e.getRenderTarget(),i.addEventListener("select",z),i.addEventListener("selectstart",z),i.addEventListener("selectend",z),i.addEventListener("squeeze",z),i.addEventListener("squeezestart",z),i.addEventListener("squeezeend",z),i.addEventListener("end",N),i.addEventListener("inputsourceschange",B),x.xrCompatible!==!0&&await t.makeXRCompatible(),M=e.getPixelRatio(),e.getSize(_),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let te=null,ce=null,ee=null;x.depth&&(ee=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,te=x.stencil?Mi:Ai,ce=x.stencil?ys:Vn);const ye={colorFormat:t.RGBA8,depthFormat:ee,scaleFactor:a};d=this.getBinding(),u=d.createProjectionLayer(ye),i.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),y=new Gn(u.textureWidth,u.textureHeight,{format:An,type:fn,depthTexture:new Ss(u.textureWidth,u.textureHeight,ce,void 0,void 0,void 0,void 0,void 0,void 0,te),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{const te={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:a};f=new XRWebGLLayer(i,t,te),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Gn(f.framebufferWidth,f.framebufferHeight,{format:An,type:fn,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,r=await i.requestReferenceSpace(o),de.setContext(i),de.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function B(W){for(let J=0;J<W.removed.length;J++){const te=W.removed[J],ce=w.indexOf(te);ce>=0&&(w[ce]=null,S[ce].disconnect(te))}for(let J=0;J<W.added.length;J++){const te=W.added[J];let ce=w.indexOf(te);if(ce===-1){for(let ye=0;ye<S.length;ye++)if(ye>=w.length){w.push(te),ce=ye;break}else if(w[ye]===null){w[ye]=te,ce=ye;break}if(ce===-1)break}const ee=S[ce];ee&&ee.connect(te)}}function k(W,J){J===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(J.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(i===null)return;let J=W.near,te=W.far;g.texture!==null&&(g.depthNear>0&&(J=g.depthNear),g.depthFar>0&&(te=g.depthFar)),L.near=I.near=P.near=J,L.far=I.far=P.far=te,(R!==L.near||U!==L.far)&&(i.updateRenderState({depthNear:L.near,depthFar:L.far}),R=L.near,U=L.far),L.layers.mask=W.layers.mask|6,P.layers.mask=L.layers.mask&-5,I.layers.mask=L.layers.mask&-3;const ce=W.parent,ee=L.cameras;k(L,ce);for(let ye=0;ye<ee.length;ye++)k(ee[ye],ce);L.projectionMatrix.copy(P.projectionMatrix),L.projectionMatrixInverse.copy(P.projectionMatrixInverse),F===null&&W.isPerspectiveCamera&&(F={camera:W,fov:W.fov,zoom:W.zoom}),V(W,L,ce)};function V(W,J,te){te===null?W.matrix.copy(J.matrixWorld):(W.matrix.copy(te.matrixWorld),W.matrix.invert(),W.matrix.multiply(J.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(J.projectionMatrix),W.projectionMatrixInverse.copy(J.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=Ms*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(W){c=W,u!==null&&(u.fixedFoveation=W),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=W)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(L)},this.getCameraTexture=function(W){return m[W]};let X=null;function Y(W,J){if(h=J.getViewerPose(l||r),p=J,h!==null){const te=h.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let ce=!1;te.length!==L.cameras.length&&(L.cameras.length=0,ce=!0);for(let fe=0;fe<te.length;fe++){const Ne=te[fe];let ke=null;if(f!==null)ke=f.getViewport(Ne);else{const Le=d.getViewSubImage(u,Ne);ke=Le.viewport,fe===0&&(e.setRenderTargetTextures(y,Le.colorTexture,Le.depthStencilTexture),e.setRenderTarget(y))}let $=D[fe];$===void 0&&($=new hn,$.layers.enable(fe),$.viewport=new Et,D[fe]=$),$.matrix.fromArray(Ne.transform.matrix),$.matrix.decompose($.position,$.quaternion,$.scale),$.projectionMatrix.fromArray(Ne.projectionMatrix),$.projectionMatrixInverse.copy($.projectionMatrix).invert(),$.viewport.set(ke.x,ke.y,ke.width,ke.height),fe===0&&(L.matrix.copy($.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),ce===!0&&L.cameras.push($)}const ee=i.enabledFeatures;if(ee&&ee.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&b){d=n.getBinding();const fe=d.getDepthInformation(te[0]);fe&&fe.isValid&&fe.texture&&g.init(fe,i.renderState)}if(ee&&ee.includes("camera-access")&&b){e.state.unbindTexture(),d=n.getBinding();for(let fe=0;fe<te.length;fe++){const Ne=te[fe].camera;if(Ne){let ke=m[Ne];ke||(ke=new Id,m[Ne]=ke);const $=d.getCameraImage(Ne);ke.sourceTexture=$}}}}for(let te=0;te<S.length;te++){const ce=w[te],ee=S[te];ce!==null&&ee!==void 0&&ee.update(ce,J,l||r)}X&&X(W,J),J.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:J}),p=null}const de=new Gd;de.setAnimationLoop(Y),this.setAnimationLoop=function(W){X=W},this.dispose=function(){}}}const C_=new Xe,Zd=new $e;Zd.set(-1,0,0,0,1,0,0,0,1);function L_(s,e){function t(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,Nd(s)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function i(g,m,x,E,y){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?a(g,m):m.isMeshLambertMaterial?(a(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(a(g,m),d(g,m)):m.isMeshPhongMaterial?(a(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(a(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,y)):m.isMeshMatcapMaterial?(a(g,m),p(g,m)):m.isMeshDepthMaterial?a(g,m):m.isMeshDistanceMaterial?(a(g,m),b(g,m)):m.isMeshNormalMaterial?a(g,m):m.isLineBasicMaterial?(r(g,m),m.isLineDashedMaterial&&o(g,m)):m.isPointsMaterial?c(g,m,x,E):m.isSpriteMaterial?l(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function a(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,t(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===on&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,t(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===on&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,t(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,t(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);const x=e.get(m),E=x.envMap,y=x.envMapRotation;E&&(g.envMap.value=E,g.envMapRotation.value.setFromMatrix4(C_.makeRotationFromEuler(y)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Zd),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,g.aoMapTransform))}function r(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform))}function o(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function c(g,m,x,E){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*x,g.scale.value=E*.5,m.map&&(g.map.value=m.map,t(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function l(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function d(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,x){g.ior.value=m.ior,m.diffuseRoughness>0&&(g.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(g.diffuseRoughnessMap.value=m.diffuseRoughnessMap,t(m.diffuseRoughnessMap,g.diffuseRoughnessMapTransform))),m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===on&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,g.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=x.texture,g.transmissionSamplerSize.value.set(x.width,x.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function b(g,m){const x=e.get(m).light;g.referencePosition.value.setFromMatrixPosition(x.matrixWorld),g.nearDistance.value=x.shadow.camera.near,g.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function D_(s,e,t,n){let i={},a={};function r(x,E){const y=E.program;n.uniformBlockBinding(x,y,i[x.id])}function o(x,E){let y=i[x.id];y===void 0&&(p(x),y=c(x),i[x.id]=y,x.addEventListener("dispose",g));const S=E.program;n.updateUBOMapping(x,S);const w=e.render.frame;a[x.id]!==w&&(l(x),a[x.id]=w)}function c(x){const E=s.createBuffer(),y=x.__size,S=x.usage;return s.bindBuffer(s.UNIFORM_BUFFER,E),s.bufferData(s.UNIFORM_BUFFER,y,S),s.bindBuffer(s.UNIFORM_BUFFER,null),E}function l(x){const E=i[x.id],y=x.uniforms,S=x.__cache;s.bindBuffer(s.UNIFORM_BUFFER,E);for(let w=0,_=y.length;w<_;w++){const M=y[w];if(Array.isArray(M))for(let F=0,P=M.length;F<P;F++)h(M[F],w,F,S);else h(M,w,0,S)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function h(x,E,y,S){if(u(x,E,y,S)===!0){const w=x.__offset,_=x.value;if(Array.isArray(_)){let M=0;for(let F=0;F<_.length;F++){const P=_[F],I=b(P,!0);d(P,x.__data,M),M+=I.storage/Float32Array.BYTES_PER_ELEMENT}}else d(_,x.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,w,x.__data)}}function d(x,E,y){typeof x=="number"||typeof x=="boolean"?E[y]=x:x.isMatrix3?(E[y]=x.elements[0],E[y+1]=x.elements[1],E[y+2]=x.elements[2],E[y+3]=0,E[y+4]=x.elements[3],E[y+5]=x.elements[4],E[y+6]=x.elements[5],E[y+7]=0,E[y+8]=x.elements[6],E[y+9]=x.elements[7],E[y+10]=x.elements[8],E[y+11]=0):ArrayBuffer.isView(x)?E.set(x.subarray(0,E.length-y),y):x.toArray(E,y)}function u(x,E,y,S){const w=x.value,_=E+"_"+y;if(Array.isArray(w)){S[_]===void 0&&(S[_]=[]);const M=S[_];let F=!1;for(let P=0;P<w.length;P++)f(w[P],M,P)===!0&&(F=!0);return F}return f(w,S,_)}function f(x,E,y){if(E[y]===void 0)return typeof x=="number"||typeof x=="boolean"?E[y]=x:ArrayBuffer.isView(x)?E[y]=x.slice():E[y]=x.clone(),!0;{const S=E[y];if(typeof x=="number"||typeof x=="boolean"){if(S!==x)return E[y]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(S.equals(x)===!1)return S.copy(x),!0}}return!1}function p(x){const E=x.uniforms;let y=0;const S=16;for(let _=0,M=E.length;_<M;_++){const F=Array.isArray(E[_])?E[_]:[E[_]];for(let P=0,I=F.length;P<I;P++){const D=F[P],L=Array.isArray(D.value)?D.value:[D.value],R=Array.isArray(E[_])||Array.isArray(D.value);let U=y;for(let N=0,B=L.length;N<B;N++){const k=L[N],V=b(k,R),X=y%S,Y=X%V.boundary,de=X+Y;y+=Y,de!==0&&S-de<V.storage&&(y+=S-de),N===0&&(U=y),y+=V.storage}const z=D.type==="int"?Int32Array:D.type==="uint"?Uint32Array:Float32Array;D.__data=new z((y-U)/Float32Array.BYTES_PER_ELEMENT),D.__offset=U}}const w=y%S;return w>0&&(y+=S-w),x.__size=y,x.__cache={},this}function b(x,E){const y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=16,y.storage=48):x.isMatrix4?(y.boundary=16,y.storage=64):x.isTexture?qe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(y.boundary=16,y.storage=x.byteLength):qe("WebGLRenderer: Unsupported uniform value type.",x),E===!0&&(y.boundary=16,y.storage=Math.ceil(y.storage/16)*16),y}function g(x){const E=x.target;E.removeEventListener("dispose",g),s.deleteBuffer(i[E.id]),delete i[E.id],delete a[E.id]}function m(){for(const x in i)s.deleteBuffer(i[x]);i={},a={}}return{bind:r,update:o,dispose:m}}const I_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Nn=null;function N_(){return Nn===null&&(Nn=new Ar(I_,16,16,Xi,Wn),Nn.name="DFG_LUT",Nn.minFilter=jt,Nn.magFilter=jt,Nn.wrapS=zn,Nn.wrapT=zn,Nn.generateMipmaps=!1,Nn.needsUpdate=!0),Nn}class F_{constructor(e={}){const{canvas:t=ef(),context:n=null,depth:i=!0,stencil:a=!1,alpha:r=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=fn}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=r;const b=f,g=new Set([Lc,Cc,Pc]),m=new Set([fn,Vn,ra,ys,Tc,Ac]),x=new Uint32Array(4),E=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]};let S=null,w=null;const _=[],M=[];let F=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=ri,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let I=!1,D=null,L=null,R=null,U=null;this._outputColorSpace=Kt;let z=0,N=0,B=null,k=-1,V=null;const X=new Et,Y=new Et;let de=null;const W=new pe(0);let J=0,te=t.width,ce=t.height,ee=1,ye=null,_e=null;const fe=new Et(0,0,te,ce),Ne=new Et(0,0,te,ce);let ke=!1;const $=new da,Le=new zc;let be=!1,xe=!1;const ie=new Xe,He=new v,We=new Et,ot={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let nt=!1;function _t(){return B===null?ee:1}let H=n;function At(A,G){return t.getContext(A,G)}let ft,xt,le,Ze,Fe,Ke,C,T,q,me,oe,Me,Re,ne,se,we,O,ae,Q,Ee,ve,Se,je;try{const A={alpha:!0,depth:i,stencil:a,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r187"),t.addEventListener("webglcontextlost",Ye,!1),t.addEventListener("webglcontextrestored",it,!1),t.addEventListener("webglcontextcreationerror",De,!1),H===null){const G="webgl2";if(H=At(G,A),H===null)throw At(G)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}at()}catch(A){throw t.removeEventListener("webglcontextlost",Ye,!1),t.removeEventListener("webglcontextrestored",it,!1),t.removeEventListener("webglcontextcreationerror",De,!1),Qe("WebGLRenderer: "+A.message),A}function at(){ft=new Og(H),ft.init(),ve=new E_(H,ft),xt=new Ag(H,ft,e,ve),le=new S_(H,ft),xt.reversedDepthBuffer&&u&&le.buffers.depth.setReversed(!0),L=H.createFramebuffer(),R=H.createFramebuffer(),U=H.createFramebuffer(),Ze=new Gg(H),Fe=new l_,Ke=new w_(H,ft,le,Fe,xt,ve,Ze),C=new kg(P),T=new Vp(H),Se=new Eg(H,T),q=new zg(H,T,Ze,Se),me=new Vg(H,q,T,Se,Ze),ae=new Hg(H,xt,Ke),se=new Rg(Fe),oe=new c_(P,C,ft,xt,Se,se),Me=new L_(P,Fe),Re=new d_,ne=new b_(ft),O=new wg(P,C,le,me,p,c),we=new M_(P,me,xt),je=new D_(H,Ze,xt,le),Q=new Tg(H,ft,Ze),Ee=new Bg(H,ft,Ze),Ze.programs=oe.programs,P.capabilities=xt,P.extensions=ft,P.properties=Fe,P.renderLists=Re,P.shadowMap=we,P.state=le,P.info=Ze}b!==fn&&(F=new qg(b,t.width,t.height,o,i,a));const ge=new P_(P,H);this.xr=ge,this.getContext=function(){return H},this.getContextAttributes=function(){return H.getContextAttributes()},this.forceContextLoss=function(){const A=ft.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=ft.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return ee},this.setPixelRatio=function(A){A!==void 0&&(ee=A,this.setSize(te,ce,!1))},this.getSize=function(A){return A.set(te,ce)},this.setSize=function(A,G,Z=!0){if(ge.isPresenting){qe("WebGLRenderer: Can't change size while VR device is presenting.");return}te=A,ce=G,t.width=Math.floor(A*ee),t.height=Math.floor(G*ee),Z===!0&&(t.style.width=A+"px",t.style.height=G+"px"),F!==null&&F.setSize(t.width,t.height),this.setViewport(0,0,A,G)},this.getDrawingBufferSize=function(A){return A.set(te*ee,ce*ee).floor()},this.setDrawingBufferSize=function(A,G,Z){te=A,ce=G,ee=Z,t.width=Math.floor(A*Z),t.height=Math.floor(G*Z),this.setViewport(0,0,A,G)},this.setEffects=function(A){if(b===fn){Qe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let G=0;G<A.length;G++)if(A[G].isOutputPass===!0){qe("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}F.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(X)},this.getViewport=function(A){return A.copy(fe)},this.setViewport=function(A,G,Z,K){A.isVector4?fe.set(A.x,A.y,A.z,A.w):fe.set(A,G,Z,K),le.viewport(X.copy(fe).multiplyScalar(_t()).round())},this.getScissor=function(A){return A.copy(Ne)},this.setScissor=function(A,G,Z,K){A.isVector4?Ne.set(A.x,A.y,A.z,A.w):Ne.set(A,G,Z,K),le.scissor(Y.copy(Ne).multiplyScalar(_t()).round())},this.getScissorTest=function(){return ke},this.setScissorTest=function(A){le.setScissorTest(ke=A)},this.setOpaqueSort=function(A){ye=A},this.setTransparentSort=function(A){_e=A},this.getClearColor=function(A){return A.copy(O.getClearColor())},this.setClearColor=function(){O.setClearColor(...arguments)},this.getClearAlpha=function(){return O.getClearAlpha()},this.setClearAlpha=function(){O.setClearAlpha(...arguments)},this.clear=function(A=!0,G=!0,Z=!0){let K=0;if(A){let j=!1;if(B!==null){const Pe=B.texture.format;j=g.has(Pe)}if(j){const Pe=B.texture.type,ze=m.has(Pe),Te=O.getClearColor(),Ue=O.getClearAlpha(),Ve=Te.r,et=Te.g,ht=Te.b;ze?(x[0]=Ve,x[1]=et,x[2]=ht,x[3]=Ue,H.clearBufferuiv(H.COLOR,0,x)):(E[0]=Ve,E[1]=et,E[2]=ht,E[3]=Ue,H.clearBufferiv(H.COLOR,0,E))}else K|=H.COLOR_BUFFER_BIT}G&&(K|=H.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Z&&(K|=H.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),K!==0&&H.clear(K)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),D=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Ye,!1),t.removeEventListener("webglcontextrestored",it,!1),t.removeEventListener("webglcontextcreationerror",De,!1),O.dispose(),Re.dispose(),ne.dispose(),Ke.dispose(),Fe.dispose(),C.dispose(),me.dispose(),q.dispose(),Se.dispose(),je.dispose(),oe.dispose(),ge.dispose(),ge.removeEventListener("sessionstart",tl),ge.removeEventListener("sessionend",nl),Ii.stop()};function Ye(A){A.preventDefault(),br("WebGLRenderer: Context Lost."),I=!0}function it(){br("WebGLRenderer: Context Restored."),I=!1;const A=Ze.autoReset,G=we.enabled,Z=we.autoUpdate,K=we.needsUpdate,j=we.type;at(),Ze.autoReset=A,we.enabled=G,we.autoUpdate=Z,we.needsUpdate=K,we.type=j}function De(A){Qe("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function vt(A){const G=A.target;G.removeEventListener("dispose",vt),Wt(G)}function Wt(A){li(A),Fe.remove(A)}function li(A){const G=Fe.get(A).programs;G!==void 0&&(G.forEach(function(Z){oe.releaseProgram(Z)}),A.isShaderMaterial&&oe.releaseShaderCache(A))}this.renderBufferDirect=function(A,G,Z,K,j,Pe){G===null&&(G=ot);const ze=j.isMesh&&j.matrixWorld.determinantAffine()<0,Te=mu(A,G,Z,K,j);le.setMaterial(K,ze);let Ue=Z.index,Ve=1;if(K.wireframe===!0){if(Ue=q.getWireframeAttribute(Z),Ue===void 0)return;Ve=2}const et=Z.drawRange,ht=Z.attributes.position;let Be=et.start*Ve,dt=(et.start+et.count)*Ve;Pe!==null&&(Be=Math.max(Be,Pe.start*Ve),dt=Math.min(dt,(Pe.start+Pe.count)*Ve)),Ue!==null?(Be=Math.max(Be,0),dt=Math.min(dt,Ue.count)):ht!=null&&(Be=Math.max(Be,0),dt=Math.min(dt,ht.count));const Ut=dt-Be;if(Ut<0||Ut===1/0)return;Se.setup(j,K,Te,Z,Ue);let Tt,wt=Q;if(Ue!==null&&(Tt=T.get(Ue),wt=Ee,wt.setIndex(Tt)),j.isMesh)K.wireframe===!0?(le.setLineWidth(K.wireframeLinewidth*_t()),wt.setMode(H.LINES)):wt.setMode(H.TRIANGLES);else if(j.isLine){let $t=K.linewidth;$t===void 0&&($t=1),le.setLineWidth($t*_t()),j.isLineSegments?wt.setMode(H.LINES):j.isLineLoop?wt.setMode(H.LINE_LOOP):wt.setMode(H.LINE_STRIP)}else j.isPoints?wt.setMode(H.POINTS):j.isSprite&&wt.setMode(H.TRIANGLES);if(j.isBatchedMesh)if(ft.get("WEBGL_multi_draw"))wt.renderMultiDraw(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount);else{const $t=j._multiDrawStarts,Ge=j._multiDrawCounts,sn=j._multiDrawCount,mt=Ue?T.get(Ue).bytesPerElement:1,Ni=Fe.get(K).currentProgram.getUniforms();for(let Qt=0;Qt<sn;Qt++)Ni.setValue(H,"_gl_DrawID",Qt),wt.render($t[Qt]/mt,Ge[Qt])}else if(j.isInstancedMesh)wt.renderInstances(Be,Ut,j.count);else if(Z.isInstancedBufferGeometry){const $t=Z._maxInstanceCount!==void 0?Z._maxInstanceCount:1/0,Ge=Math.min(Z.instanceCount,$t);wt.renderInstances(Be,Ut,Ge)}else wt.render(Be,Ut)};function el(A,G,Z,K){D!==null&&A.isNodeMaterial&&D.setObject(K,A),be===!0&&se.setState(A,Z,!1),A.transparent===!0&&A.side===Rt&&A.forceSinglePass===!1?(A.side=on,A.needsUpdate=!0,Is(A,G,K),A.side=Ti,A.needsUpdate=!0,Is(A,G,K),A.side=Rt):Is(A,G,K)}this.compile=function(A,G,Z=null){Z===null&&(Z=A),D!==null&&D.renderStart(A,G,Z),w=ne.get(Z),w.init(G),M.push(w),Z.traverseVisible(function(j){j.isLight&&j.layers.test(G.layers)&&(w.pushLight(j),j.castShadow&&w.pushShadow(j))}),A!==Z&&A.traverseVisible(function(j){j.isLight&&j.layers.test(G.layers)&&(w.pushLight(j),j.castShadow&&w.pushShadow(j))}),w.setupLights(),D!==null&&D.updateLights(w.state.lightsArray),xe=this.localClippingEnabled,be=se.init(this.clippingPlanes,xe),be===!0&&se.setGlobalState(this.clippingPlanes,G),D!==null&&we.render(w.state.shadowsArray,Z,G);const K=new Set;return A.traverse(function(j){if(!(j.isMesh||j.isPoints||j.isLine||j.isSprite))return;const Pe=j.material;if(Pe)if(Array.isArray(Pe))for(let ze=0;ze<Pe.length;ze++){const Te=Pe[ze];el(Te,Z,G,j),K.add(Te)}else el(Pe,Z,G,j),K.add(Pe)}),w=M.pop(),D!==null&&D.renderEnd(),K},this.compileAsync=function(A,G,Z=null){const K=this.compile(A,G,Z);return new Promise(j=>{function Pe(){if(K.forEach(function(ze){const Ue=Fe.get(ze).currentProgram;(Ue===void 0||Ue.isReady())&&K.delete(ze)}),K.size===0){j(A);return}setTimeout(Pe,10)}ft.get("KHR_parallel_shader_compile")!==null?Pe():setTimeout(Pe,10)})};let Dr=null;function fu(A){Dr&&Dr(A)}function tl(){Ii.stop()}function nl(){Ii.start()}const Ii=new Gd;Ii.setAnimationLoop(fu),typeof self<"u"&&Ii.setContext(self),this.setAnimationLoop=function(A){Dr=A,ge.setAnimationLoop(A),A===null?Ii.stop():Ii.start()},ge.addEventListener("sessionstart",tl),ge.addEventListener("sessionend",nl),this.render=function(A,G){if(G!==void 0&&G.isCamera!==!0){Qe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;D!==null&&D.renderStart(A,G);const Z=ge.enabled===!0&&ge.isPresenting===!0,K=F!==null&&(B===null||Z)&&F.begin(P,B);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),G.parent===null&&G.matrixWorldAutoUpdate===!0&&G.updateMatrixWorld(),ge.enabled===!0&&ge.isPresenting===!0&&(F===null||F.isCompositing()===!1)&&(ge.cameraAutoUpdate===!0&&ge.updateCamera(G),G=ge.getCamera()),A.isScene===!0&&A.onBeforeRender(P,A,G,B),w=ne.get(A,M.length),w.init(G),w.state.textureUnits=Ke.getTextureUnits(),M.push(w),ie.multiplyMatrices(G.projectionMatrix,G.matrixWorldInverse),G.isArrayCamera?Le.setFromArrayCamera(G):$.setFromProjectionMatrix(ie,Rn,G.reversedDepth),xe=this.localClippingEnabled,be=se.init(this.clippingPlanes,xe),S=Re.get(A,_.length),S.init(),_.push(S),this.info.render.frame++,ge.enabled===!0&&ge.isPresenting===!0){const ze=P.xr.getDepthSensingMesh();ze!==null&&Ir(ze,G,-1/0,P.sortObjects)}Ir(A,G,0,P.sortObjects),S.finish(),D!==null&&D.updateLights(w.state.lightsArray),P.sortObjects===!0&&S.sort(ye,_e),nt=ge.enabled===!1||ge.isPresenting===!1||ge.hasDepthSensing()===!1,nt&&O.addToRenderList(S,A),this.info.autoReset===!0&&this.info.reset(),be===!0&&se.beginShadows();const j=w.state.shadowsArray;if(we.render(j,A,G),be===!0&&se.endShadows(),(K&&F.hasRenderPass())===!1){const ze=S.opaque,Te=S.transmissive;if(w.setupLights(),G.isArrayCamera){const Ue=G.cameras;if(Te.length>0)for(let Ve=0,et=Ue.length;Ve<et;Ve++){const ht=Ue[Ve];sl(ze,Te,A,ht)}nt&&O.render(A);for(let Ve=0,et=Ue.length;Ve<et;Ve++){const ht=Ue[Ve];il(S,A,ht,ht.viewport)}}else Te.length>0&&sl(ze,Te,A,G),nt&&O.render(A),il(S,A,G)}B!==null&&N===0&&(Ke.updateMultisampleRenderTarget(B),Ke.updateRenderTargetMipmap(B)),K&&F.end(P),A.isScene===!0&&A.onAfterRender(P,A,G),Se.resetDefaultState(),k=-1,V=null,M.pop(),M.length>0?(w=M[M.length-1],Ke.setTextureUnits(w.state.textureUnits),be===!0&&se.setGlobalState(P.clippingPlanes,w.state.camera)):w=null,_.pop(),_.length>0?S=_[_.length-1]:S=null,D!==null&&D.renderEnd()};function Ir(A,G,Z,K){if(A.visible===!1)return;if(A.layers.test(G.layers)){if(A.isGroup)Z=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(G);else if(A.isLight)w.pushLight(A),A.castShadow&&w.pushShadow(A);else if(A.isSprite){const ze=G.isArrayCamera?Le:$;if(!A.frustumCulled||A.intersectsFrustum(ze)){K&&We.setFromMatrixPosition(A.matrixWorld).applyMatrix4(ie);const Te=me.update(A),Ue=A.material;Ue.visible&&S.push(A,Te,Ue,Z,We.z,null,G)}}else if(A.isMesh||A.isLine||A.isPoints){const ze=G.isArrayCamera?Le:$;if(!A.frustumCulled||A.intersectsFrustum(ze)){const Te=me.update(A),Ue=A.material;if(K&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),We.copy(A.boundingSphere.center)):(Te.boundingSphere===null&&Te.computeBoundingSphere(),We.copy(Te.boundingSphere.center)),We.applyMatrix4(A.matrixWorld).applyMatrix4(ie)),Array.isArray(Ue)){const Ve=Te.groups;for(let et=0,ht=Ve.length;et<ht;et++){const Be=Ve[et],dt=Ue[Be.materialIndex];dt&&dt.visible&&S.push(A,Te,dt,Z,We.z,Be,G)}}else Ue.visible&&S.push(A,Te,Ue,Z,We.z,null,G)}}}const Pe=A.children;for(let ze=0,Te=Pe.length;ze<Te;ze++)Ir(Pe[ze],G,Z,K)}function il(A,G,Z,K){const{opaque:j,transmissive:Pe,transparent:ze}=A;w.setupLightsView(Z),be===!0&&se.setGlobalState(P.clippingPlanes,Z),K&&le.viewport(X.copy(K)),j.length>0&&va(j,G,Z),Pe.length>0&&va(Pe,G,Z),ze.length>0&&va(ze,G,Z),le.buffers.depth.setTest(!0),le.buffers.depth.setMask(!0),le.buffers.color.setMask(!0),le.setPolygonOffset(!1)}function sl(A,G,Z,K){if((Z.isScene===!0?Z.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[K.id]===void 0){const Be=ft.has("EXT_color_buffer_half_float")||ft.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[K.id]=new Gn(1,1,{generateMipmaps:!0,type:Be?Wn:fn,minFilter:Bn,samples:Math.max(4,xt.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:lt.workingColorSpace})}const Pe=w.state.transmissionRenderTarget[K.id],ze=K.viewport||X;Pe.setSize(ze.z*P.transmissionResolutionScale,ze.w*P.transmissionResolutionScale);const Te=P.getRenderTarget(),Ue=P.getActiveCubeFace(),Ve=P.getActiveMipmapLevel();P.setRenderTarget(Pe),P.getClearColor(W),J=P.getClearAlpha(),J<1&&P.setClearColor(16777215,.5),P.clear(),nt&&O.render(Z);const et=P.toneMapping;P.toneMapping=ri;const ht=K.viewport;if(K.viewport!==void 0&&(K.viewport=void 0),w.setupLightsView(K),be===!0&&se.setGlobalState(P.clippingPlanes,K),va(A,Z,K),Ke.updateMultisampleRenderTarget(Pe),Ke.updateRenderTargetMipmap(Pe),ft.has("WEBGL_multisampled_render_to_texture")===!1){let Be=!1;for(let dt=0,Ut=G.length;dt<Ut;dt++){const Tt=G[dt],{object:wt,geometry:$t,material:Ge,group:sn}=Tt;if(Ge.side===Rt&&wt.layers.test(K.layers)){const mt=Ge.side;Ge.side=on,Ge.needsUpdate=!0,al(wt,Z,K,$t,Ge,sn),Ge.side=mt,Ge.needsUpdate=!0,Be=!0}}Be===!0&&(Ke.updateMultisampleRenderTarget(Pe),Ke.updateRenderTargetMipmap(Pe))}P.setRenderTarget(Te,Ue,Ve),P.setClearColor(W,J),ht!==void 0&&(K.viewport=ht),P.toneMapping=et}function va(A,G,Z){const K=G.isScene===!0?G.overrideMaterial:null;for(let j=0,Pe=A.length;j<Pe;j++){const ze=A[j],{object:Te,geometry:Ue,group:Ve}=ze;let et=ze.material;et.allowOverride===!0&&K!==null&&(et=K),Te.layers.test(Z.layers)&&al(Te,G,Z,Ue,et,Ve)}}function al(A,G,Z,K,j,Pe){D!==null&&j.isNodeMaterial&&D.setObject(A,j),A.onBeforeRender(P,G,Z,K,j,Pe),A.modelViewMatrix.multiplyMatrices(Z.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),j.onBeforeRender(P,G,Z,K,A,Pe),j.transparent===!0&&j.side===Rt&&j.forceSinglePass===!1?(j.side=on,j.needsUpdate=!0,P.renderBufferDirect(Z,G,K,j,A,Pe),j.side=Ti,j.needsUpdate=!0,P.renderBufferDirect(Z,G,K,j,A,Pe),j.side=Rt):P.renderBufferDirect(Z,G,K,j,A,Pe),A.onAfterRender(P,G,Z,K,j,Pe)}function rl(A){let G=0;for(const Z of A)Z.texture!==null&&G++;return G}function Is(A,G,Z){G.isScene!==!0&&(G=ot);const K=Fe.get(A),j=w.state.lights,Pe=w.state.shadowsArray,ze=j.state.version,Te=oe.getParameters(A,j.state,Pe,G,Z,w.state.lightProbeGridArray),Ue=oe.getProgramCacheKey(Te);let Ve=K.programs;K.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?G.environment:null,K.fog=G.fog;const et=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;K.envMap=C.get(A.envMap||K.environment,et),K.envMapRotation=K.environment!==null&&A.envMap===null?G.environmentRotation:A.envMapRotation,Ve===void 0&&(A.addEventListener("dispose",vt),Ve=new Map,K.programs=Ve,K.programVariants=new Map);let ht=Ve.get(Ue);if(ht!==void 0){if(K.currentProgram===ht&&K.lightsStateVersion===ze)return cl(A,Te),ht}else Te.uniforms=oe.getUniforms(A),D!==null&&A.isNodeMaterial&&D.build(A,Z,Te),A.onBeforeCompile(Te,P),ht=oe.acquireProgram(Te,Ue),Ve.set(Ue,ht),K.uniforms=Te.uniforms;const Be=K.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Be.clippingPlanes=se.uniform),cl(A,Te),K.needsLights=bu(A),K.lightsStateVersion=ze,K.needsLights&&(Be.ambientLightColor.value=j.state.ambient,Be.lightProbe.value=j.state.probe,Be.sunLights.value=j.state.sun,Be.sunLightShadows.value=j.state.sunShadow,Be.directionalLights.value=j.state.directional,Be.directionalLightShadows.value=j.state.directionalShadow,Be.spotLights.value=j.state.spot,Be.spotLightShadows.value=j.state.spotShadow,Be.rectAreaLights.value=j.state.rectArea,Be.ltc_1.value=j.state.rectAreaLTC1,Be.ltc_2.value=j.state.rectAreaLTC2,Be.pointLights.value=j.state.point,Be.pointLightShadows.value=j.state.pointShadow,Be.hemisphereLights.value=j.state.hemi,Be.sunShadowMatrix.value=j.state.sunShadowMatrix,Be.sunShadowCascade.value=j.state.sunShadowCascade,Be.directionalShadowMatrix.value=j.state.directionalShadowMatrix,Be.spotLightMatrix.value=j.state.spotLightMatrix,Be.spotLightMap.value=j.state.spotLightMap,Be.pointShadowMatrix.value=j.state.pointShadowMatrix),K.numLightProbeGrids=rl(w.state.lightProbeGridArray),K.currentProgram=ht,K.uniformsList=null,ht}function pu(A,G,Z,K,j){const Pe=Fe.get(A),ze=Pe.currentProgram.id+","+K+","+j;let Te=Pe.programVariants.get(ze);return Te===void 0?(Te=Is(A,G,Z),Pe.programVariants.set(ze,Te)):(Pe.currentProgram=Te,Pe.uniformsList=null,Pe.outputColorSpace=K,Pe.toneMapping=j),Te}function ol(A){if(A.uniformsList===null){const G=A.currentProgram.getUniforms();A.uniformsList=dr.seqWithValue(G.seq,A.uniforms)}return A.uniformsList}function cl(A,G){const Z=Fe.get(A);Z.outputColorSpace=G.outputColorSpace,Z.batching=G.batching,Z.batchingColor=G.batchingColor,Z.instancing=G.instancing,Z.instancingColor=G.instancingColor,Z.instancingMorph=G.instancingMorph,Z.skinning=G.skinning,Z.morphTargets=G.morphTargets,Z.morphNormals=G.morphNormals,Z.morphColors=G.morphColors,Z.morphTargetsCount=G.morphTargetsCount,Z.numClippingPlanes=G.numClippingPlanes,Z.numIntersection=G.numClipIntersection,Z.vertexAlphas=G.vertexAlphas,Z.vertexTangents=G.vertexTangents,Z.toneMapping=G.toneMapping}function mu(A,G,Z,K,j){G.isScene!==!0&&(G=ot),Ke.resetTextureUnits();const Pe=G.fog,ze=K.isMeshStandardMaterial||K.isMeshLambertMaterial||K.isMeshPhongMaterial?G.environment:null,Te=B===null?P.outputColorSpace:B.isXRRenderTarget===!0?B.texture.colorSpace:lt.workingColorSpace,Ue=K.isMeshStandardMaterial||K.isMeshLambertMaterial&&!K.envMap||K.isMeshPhongMaterial&&!K.envMap,Ve=C.get(K.envMap||ze,Ue),et=K.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,ht=!!Z.attributes.tangent&&(!!K.normalMap||K.anisotropy>0),Be=!!Z.morphAttributes.position,dt=!!Z.morphAttributes.normal,Ut=!!Z.morphAttributes.color;let Tt=ri;K.toneMapped&&(B===null||B.isXRRenderTarget===!0)&&(Tt=P.toneMapping);const wt=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,$t=wt!==void 0?wt.length:0,Ge=Fe.get(K),sn=w.state.lights;if(be===!0&&(xe===!0||A!==V)){const Ct=A===V&&K.id===k;se.setState(K,A,Ct)}let mt=!1,Ni=!1;K.version===Ge.__version?Ge.needsLights&&Ge.lightsStateVersion!==sn.state.version||j.isBatchedMesh&&Ge.batching===!1||!j.isBatchedMesh&&Ge.batching===!0||j.isBatchedMesh&&Ge.batchingColor===!0&&j._colorsTexture===null||j.isBatchedMesh&&Ge.batchingColor===!1&&j._colorsTexture!==null||j.isInstancedMesh&&Ge.instancing===!1||!j.isInstancedMesh&&Ge.instancing===!0||j.isSkinnedMesh&&Ge.skinning===!1||!j.isSkinnedMesh&&Ge.skinning===!0||j.isInstancedMesh&&Ge.instancingColor===!0&&j.instanceColor===null||j.isInstancedMesh&&Ge.instancingColor===!1&&j.instanceColor!==null||j.isInstancedMesh&&Ge.instancingMorph===!0&&j.morphTexture===null||j.isInstancedMesh&&Ge.instancingMorph===!1&&j.morphTexture!==null||Ge.envMap!==Ve||K.fog===!0&&Ge.fog!==Pe||Ge.numClippingPlanes!==void 0&&(Ge.numClippingPlanes!==se.numPlanes||Ge.numIntersection!==se.numIntersection)||Ge.vertexAlphas!==et||Ge.vertexTangents!==ht||Ge.morphTargets!==Be||Ge.morphNormals!==dt||Ge.morphColors!==Ut||Ge.morphTargetsCount!==$t||Ge.numLightProbeGrids!==rl(w.state.lightProbeGridArray)?mt=!0:(Ge.outputColorSpace!==Te||Ge.toneMapping!==Tt)&&(Ni=!0):(mt=!0,Ge.__version=K.version);let Qt=Ge.currentProgram;(mt===!0||Ni===!0)&&(Qt=Ni===!0?pu(K,G,j,Te,Tt):Is(K,G,j),D&&K.isNodeMaterial&&D.onUpdateProgram(K,Qt,Ge));let ya=!1,hi=!1,Fi=!1;const ut=Qt.getUniforms(),Jt=Ge.uniforms;if(le.useProgram(Qt.program)&&(ya=!0,hi=!0,Fi=!0),K.id!==k&&(k=K.id,hi=!0),ya||V!==A){le.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),ut.setValue(H,"projectionMatrix",A.projectionMatrix),ut.setValue(H,"viewMatrix",A.matrixWorldInverse);const qt=ut.map.cameraPosition;qt!==void 0&&qt.setValue(H,He.setFromMatrixPosition(A.matrixWorld)),xt.logarithmicDepthBuffer&&ut.setValue(H,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(K.isMeshPhongMaterial||K.isMeshToonMaterial||K.isMeshLambertMaterial||K.isMeshBasicMaterial||K.isMeshStandardMaterial||K.isShaderMaterial)&&ut.setValue(H,"isOrthographic",A.isOrthographicCamera===!0),V!==A&&(V=A,hi=!0,Fi=!0)}if(Ge.needsLights&&(sn.state.sunShadowMap.length>0&&ut.setValue(H,"sunShadowMap",sn.state.sunShadowMap,Ke),sn.state.directionalShadowMap.length>0&&ut.setValue(H,"directionalShadowMap",sn.state.directionalShadowMap,Ke),sn.state.spotShadowMap.length>0&&ut.setValue(H,"spotShadowMap",sn.state.spotShadowMap,Ke),sn.state.pointShadowMap.length>0&&ut.setValue(H,"pointShadowMap",sn.state.pointShadowMap,Ke)),j.isSkinnedMesh){ut.setOptional(H,j,"bindMatrix"),ut.setOptional(H,j,"bindMatrixInverse");const Ct=j.skeleton;Ct&&(Ct.boneTexture===null&&Ct.computeBoneTexture(),ut.setValue(H,"boneTexture",Ct.boneTexture,Ke))}j.isBatchedMesh&&(ut.setOptional(H,j,"batchingTexture"),ut.setValue(H,"batchingTexture",j._matricesTexture,Ke),ut.setOptional(H,j,"batchingIdTexture"),ut.setValue(H,"batchingIdTexture",j._indirectTexture,Ke),ut.setOptional(H,j,"batchingColorTexture"),j._colorsTexture!==null&&ut.setValue(H,"batchingColorTexture",j._colorsTexture,Ke));const Mn=Z.morphAttributes;if((Mn.position!==void 0||Mn.normal!==void 0||Mn.color!==void 0)&&ae.update(j,Z,Qt),(hi||Ge.receiveShadow!==j.receiveShadow)&&(Ge.receiveShadow=j.receiveShadow,ut.setValue(H,"receiveShadow",j.receiveShadow)),(K.isMeshStandardMaterial||K.isMeshLambertMaterial||K.isMeshPhongMaterial)&&K.envMap===null&&G.environment!==null&&(Jt.envMapIntensity.value=G.environmentIntensity),Jt.dfgLUT!==void 0&&(Jt.dfgLUT.value=N_()),hi){if(ut.setValue(H,"toneMappingExposure",P.toneMappingExposure),Ge.needsLights&&gu(Jt,Fi),Pe&&K.fog===!0&&Me.refreshFogUniforms(Jt,Pe),Me.refreshMaterialUniforms(Jt,K,ee,ce,w.state.transmissionRenderTarget[A.id]),Ge.needsLights&&Ge.numLightProbeGrids>0){const Ct=y;let qt=0;for(const Yn of w.state.lightProbeGridArray)Yn.texture!==null&&(Ct.textures[qt]=Yn.texture,Ct.min[qt]=Yn.boundingBox.min,Ct.max[qt]=Yn.boundingBox.max,Ct.resolution[qt]=Yn.resolution,qt++);for(const Yn in Ct)Ct[Yn].length=qt;Jt.probesSH.value=Ct.textures,Jt.probesMin.value=Ct.min,Jt.probesMax.value=Ct.max,Jt.probesResolution.value=Ct.resolution}dr.upload(H,ol(Ge),Jt,Ke)}if(K.isShaderMaterial&&K.uniformsNeedUpdate===!0&&(dr.upload(H,ol(Ge),Jt,Ke),K.uniformsNeedUpdate=!1),K.isSpriteMaterial&&ut.setValue(H,"center",j.center),ut.setValue(H,"modelViewMatrix",j.modelViewMatrix),ut.setValue(H,"normalMatrix",j.normalMatrix),ut.setValue(H,"modelMatrix",j.matrixWorld),K.uniformsGroups!==void 0){const Ct=K.uniformsGroups;for(let qt=0,Yn=Ct.length;qt<Yn;qt++){const hl=Ct[qt];je.update(hl,Qt),je.bind(hl,Qt)}}return Qt}function gu(A,G){A.ambientLightColor.needsUpdate=G,A.lightProbe.needsUpdate=G,A.sunLights.needsUpdate=G,A.sunLightShadows.needsUpdate=G,A.directionalLights.needsUpdate=G,A.directionalLightShadows.needsUpdate=G,A.pointLights.needsUpdate=G,A.pointLightShadows.needsUpdate=G,A.spotLights.needsUpdate=G,A.spotLightShadows.needsUpdate=G,A.rectAreaLights.needsUpdate=G,A.hemisphereLights.needsUpdate=G}function bu(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return z},this.getActiveMipmapLevel=function(){return N},this.getRenderTarget=function(){return B},this.setRenderTargetTextures=function(A,G,Z){const K=Fe.get(A);K.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,K.__autoAllocateDepthBuffer===!1&&(K.__useRenderToTexture=!1),Fe.get(A.texture).__webglTexture=G,Fe.get(A.depthTexture).__webglTexture=K.__autoAllocateDepthBuffer?void 0:Z,K.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,G){const Z=Fe.get(A);Z.__webglFramebuffer=G,Z.__useDefaultFramebuffer=G===void 0},this.setRenderTarget=function(A,G=0,Z=0){B=A,z=G,N=Z;let K=null,j=!1,Pe=!1;if(A){const Te=Fe.get(A);if(Te.__useDefaultFramebuffer!==void 0){le.bindFramebuffer(H.FRAMEBUFFER,Te.__webglFramebuffer),X.copy(A.viewport),Y.copy(A.scissor),de=A.scissorTest,le.viewport(X),le.scissor(Y),le.setScissorTest(de),k=-1;return}else if(Te.__webglFramebuffer===void 0)Ke.setupRenderTarget(A);else if(Te.__hasExternalTextures)Ke.rebindTextures(A,Fe.get(A.texture).__webglTexture,Fe.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const et=A.depthTexture;if(Te.__boundDepthTexture!==et){if(et!==null&&Fe.has(et)&&(A.width!==et.image.width||A.height!==et.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Ke.setupDepthRenderbuffer(A)}}const Ue=A.texture;(Ue.isData3DTexture||Ue.isDataArrayTexture||Ue.isCompressedArrayTexture)&&(Pe=!0);const Ve=Fe.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(Ve[G])?K=Ve[G][Z]:K=Ve[G],j=!0):A.samples>0&&Ke.useMultisampledRTT(A)===!1?K=Fe.get(A).__webglMultisampledFramebuffer:Array.isArray(Ve)?K=Ve[Z]:K=Ve,X.copy(A.viewport),Y.copy(A.scissor),de=A.scissorTest}else X.copy(fe).multiplyScalar(ee).floor(),Y.copy(Ne).multiplyScalar(ee).floor(),de=ke;if(Z!==0&&(K=L),le.bindFramebuffer(H.FRAMEBUFFER,K)&&le.drawBuffers(A,K),le.viewport(X),le.scissor(Y),le.setScissorTest(de),j){const Te=Fe.get(A.texture);H.framebufferTexture2D(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_CUBE_MAP_POSITIVE_X+G,Te.__webglTexture,Z)}else if(Pe){const Te=G;for(let Ue=0;Ue<A.textures.length;Ue++){const Ve=Fe.get(A.textures[Ue]);H.framebufferTextureLayer(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0+Ue,Ve.__webglTexture,Z,Te)}}else if(A!==null&&Z!==0){const Te=Fe.get(A.texture);H.framebufferTexture2D(H.FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_2D,Te.__webglTexture,Z)}k=-1};function ll(A){const G=Fe.get(A);return(G.__readFormat!==A.format||G.__readType!==A.type)&&(G.__readFormat=A.format,G.__readType=A.type,G.__formatReadable=xt.textureFormatReadable(A.format),G.__typeReadable=xt.textureTypeReadable(A.type)),G}this.readRenderTargetPixels=function(A,G,Z,K,j,Pe,ze,Te=0){if(!(A&&A.isWebGLRenderTarget)){Qe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ue=Fe.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&ze!==void 0&&(Ue=Ue[ze],Array.isArray(Ue)&&(Ue=Ue[0])),Ue){le.bindFramebuffer(H.FRAMEBUFFER,Ue);try{const Ve=A.textures[Te],et=Ve.format,ht=Ve.type;A.textures.length>1&&H.readBuffer(H.COLOR_ATTACHMENT0+Te);const Be=ll(Ve);if(Be.__formatReadable===!1){Qe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Be.__typeReadable===!1){Qe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}G>=0&&G<=A.width-K&&Z>=0&&Z<=A.height-j&&H.readPixels(G,Z,K,j,ve.convert(et),ve.convert(ht),Pe)}finally{const Ve=B!==null?Fe.get(B).__webglFramebuffer:null;le.bindFramebuffer(H.FRAMEBUFFER,Ve)}}},this.readRenderTargetPixelsAsync=async function(A,G,Z,K,j,Pe,ze,Te=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ue=Fe.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&ze!==void 0&&(Ue=Ue[ze],Array.isArray(Ue)&&(Ue=Ue[0])),Ue)if(G>=0&&G<=A.width-K&&Z>=0&&Z<=A.height-j){le.bindFramebuffer(H.FRAMEBUFFER,Ue);const Ve=A.textures[Te],et=Ve.format,ht=Ve.type;A.textures.length>1&&H.readBuffer(H.COLOR_ATTACHMENT0+Te);const Be=ll(Ve);if(Be.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Be.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const dt=H.createBuffer();H.bindBuffer(H.PIXEL_PACK_BUFFER,dt),H.bufferData(H.PIXEL_PACK_BUFFER,Pe.byteLength,H.STREAM_READ),H.readPixels(G,Z,K,j,ve.convert(et),ve.convert(ht),0),H.bindBuffer(H.PIXEL_PACK_BUFFER,null);const Ut=B!==null?Fe.get(B).__webglFramebuffer:null;le.bindFramebuffer(H.FRAMEBUFFER,Ut);const Tt=H.fenceSync(H.SYNC_GPU_COMMANDS_COMPLETE,0);return H.flush(),await tf(H,Tt,4),H.bindBuffer(H.PIXEL_PACK_BUFFER,dt),H.getBufferSubData(H.PIXEL_PACK_BUFFER,0,Pe),H.bindBuffer(H.PIXEL_PACK_BUFFER,null),H.deleteBuffer(dt),H.deleteSync(Tt),Pe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,G=null,Z=0){const K=Math.pow(2,-Z),j=Math.floor(A.image.width*K),Pe=Math.floor(A.image.height*K),ze=G!==null?G.x:0,Te=G!==null?G.y:0;Ke.setTexture2D(A,0),H.copyTexSubImage2D(H.TEXTURE_2D,Z,0,0,ze,Te,j,Pe),le.unbindTexture()},this.copyTextureToTexture=function(A,G,Z=null,K=null,j=0,Pe=0){let ze,Te,Ue,Ve,et,ht,Be,dt,Ut;const Tt=A.isCompressedTexture?A.mipmaps[Pe]:A.image;if(Z!==null)ze=Z.max.x-Z.min.x,Te=Z.max.y-Z.min.y,Ue=Z.isBox3?Z.max.z-Z.min.z:1,Ve=Z.min.x,et=Z.min.y,ht=Z.isBox3?Z.min.z:0;else{const ut=Math.pow(2,-j);ze=Math.floor(Tt.width*ut),Te=Math.floor(Tt.height*ut),A.isDataArrayTexture?Ue=Tt.depth:A.isData3DTexture?Ue=Math.floor(Tt.depth*ut):Ue=1,Ve=0,et=0,ht=0}K!==null?(Be=K.x,dt=K.y,Ut=K.z):(Be=0,dt=0,Ut=0);const wt=ve.convert(G.format),$t=ve.convert(G.type);let Ge;G.isData3DTexture?(Ke.setTexture3D(G,0),Ge=H.TEXTURE_3D):G.isDataArrayTexture||G.isCompressedArrayTexture?(Ke.setTexture2DArray(G,0),Ge=H.TEXTURE_2D_ARRAY):(Ke.setTexture2D(G,0),Ge=H.TEXTURE_2D),le.activeTexture(H.TEXTURE0),le.pixelStorei(H.UNPACK_FLIP_Y_WEBGL,G.flipY),le.pixelStorei(H.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),le.pixelStorei(H.UNPACK_ALIGNMENT,G.unpackAlignment);const sn=le.getParameter(H.UNPACK_ROW_LENGTH),mt=le.getParameter(H.UNPACK_IMAGE_HEIGHT),Ni=le.getParameter(H.UNPACK_SKIP_PIXELS),Qt=le.getParameter(H.UNPACK_SKIP_ROWS),ya=le.getParameter(H.UNPACK_SKIP_IMAGES);le.pixelStorei(H.UNPACK_ROW_LENGTH,Tt.width),le.pixelStorei(H.UNPACK_IMAGE_HEIGHT,Tt.height),le.pixelStorei(H.UNPACK_SKIP_PIXELS,Ve),le.pixelStorei(H.UNPACK_SKIP_ROWS,et),le.pixelStorei(H.UNPACK_SKIP_IMAGES,ht);const hi=A.isDataArrayTexture||A.isData3DTexture,Fi=G.isDataArrayTexture||G.isData3DTexture;if(A.isDepthTexture){const ut=Fe.get(A),Jt=Fe.get(G),Mn=Fe.get(ut.__renderTarget),Ct=Fe.get(Jt.__renderTarget);le.bindFramebuffer(H.READ_FRAMEBUFFER,Mn.__webglFramebuffer),le.bindFramebuffer(H.DRAW_FRAMEBUFFER,Ct.__webglFramebuffer);for(let qt=0;qt<Ue;qt++)hi&&(H.framebufferTextureLayer(H.READ_FRAMEBUFFER,H.COLOR_ATTACHMENT0,Fe.get(A).__webglTexture,j,ht+qt),H.framebufferTextureLayer(H.DRAW_FRAMEBUFFER,H.COLOR_ATTACHMENT0,Fe.get(G).__webglTexture,Pe,Ut+qt)),H.blitFramebuffer(Ve,et,Ve+ze,et+Te,Be,dt,Be+ze,dt+Te,H.DEPTH_BUFFER_BIT,H.NEAREST);le.bindFramebuffer(H.READ_FRAMEBUFFER,null),le.bindFramebuffer(H.DRAW_FRAMEBUFFER,null)}else if(j!==0||A.isRenderTargetTexture||Fe.has(A)){const ut=Fe.get(A),Jt=Fe.get(G);le.bindFramebuffer(H.READ_FRAMEBUFFER,R),le.bindFramebuffer(H.DRAW_FRAMEBUFFER,U);for(let Mn=0;Mn<Ue;Mn++)hi?H.framebufferTextureLayer(H.READ_FRAMEBUFFER,H.COLOR_ATTACHMENT0,ut.__webglTexture,j,ht+Mn):H.framebufferTexture2D(H.READ_FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_2D,ut.__webglTexture,j),Fi?H.framebufferTextureLayer(H.DRAW_FRAMEBUFFER,H.COLOR_ATTACHMENT0,Jt.__webglTexture,Pe,Ut+Mn):H.framebufferTexture2D(H.DRAW_FRAMEBUFFER,H.COLOR_ATTACHMENT0,H.TEXTURE_2D,Jt.__webglTexture,Pe),j!==0?H.blitFramebuffer(Ve,et,Ve+ze,et+Te,Be,dt,Be+ze,dt+Te,H.COLOR_BUFFER_BIT,H.NEAREST):Fi?H.copyTexSubImage3D(Ge,Pe,Be,dt,Ut+Mn,Ve,et,ze,Te):H.copyTexSubImage2D(Ge,Pe,Be,dt,Ve,et,ze,Te);le.bindFramebuffer(H.READ_FRAMEBUFFER,null),le.bindFramebuffer(H.DRAW_FRAMEBUFFER,null)}else Fi?A.isDataTexture||A.isData3DTexture?H.texSubImage3D(Ge,Pe,Be,dt,Ut,ze,Te,Ue,wt,$t,Tt.data):G.isCompressedArrayTexture?H.compressedTexSubImage3D(Ge,Pe,Be,dt,Ut,ze,Te,Ue,wt,Tt.data):H.texSubImage3D(Ge,Pe,Be,dt,Ut,ze,Te,Ue,wt,$t,Tt):A.isDataTexture?H.texSubImage2D(H.TEXTURE_2D,Pe,Be,dt,ze,Te,wt,$t,Tt.data):A.isCompressedTexture?H.compressedTexSubImage2D(H.TEXTURE_2D,Pe,Be,dt,Tt.width,Tt.height,wt,Tt.data):H.texSubImage2D(H.TEXTURE_2D,Pe,Be,dt,ze,Te,wt,$t,Tt);le.pixelStorei(H.UNPACK_ROW_LENGTH,sn),le.pixelStorei(H.UNPACK_IMAGE_HEIGHT,mt),le.pixelStorei(H.UNPACK_SKIP_PIXELS,Ni),le.pixelStorei(H.UNPACK_SKIP_ROWS,Qt),le.pixelStorei(H.UNPACK_SKIP_IMAGES,ya),Pe===0&&G.generateMipmaps===!0&&G.mipmapsAutoUpdate===!0&&H.generateMipmap(Ge),le.unbindTexture()},this.initRenderTarget=function(A){Fe.get(A).__webglFramebuffer===void 0&&Ke.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?Ke.setTextureCube(A,0):A.isData3DTexture?Ke.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?Ke.setTexture2DArray(A,0):Ke.setTexture2D(A,0),le.unbindTexture()},this.resetState=function(){z=0,N=0,B=null,le.reset(),Se.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=lt._getDrawingBufferColorSpace(e),t.unpackColorSpace=lt._getUnpackColorSpace()}}const Nh={type:"change"},Yc={type:"start"},$d={type:"end"},Ja=new As,Fh=new ni,U_=Math.cos(70*na.DEG2RAD),zt=new v,ln=2*Math.PI,gt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},bo=1e-6;class k_ extends Gp{constructor(e,t=null){super(e,t),this.state=gt.NONE,this.target=new v,this.cursor=new v,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ms.ROTATE,MIDDLE:ms.DOLLY,RIGHT:ms.PAN},this.touches={ONE:fs.ROTATE,TWO:fs.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new v,this._lastQuaternion=new pt,this._lastTargetPosition=new v,this._quat=new pt().setFromUnitVectors(e.up,new v(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ps,this._sphericalDelta=new ps,this._scale=1,this._panOffset=new v,this._rotateStart=new Je,this._rotateEnd=new Je,this._rotateDelta=new Je,this._panStart=new Je,this._panEnd=new Je,this._panDelta=new Je,this._dollyStart=new Je,this._dollyEnd=new Je,this._dollyDelta=new Je,this._dollyDirection=new v,this._mouse=new Je,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=z_.bind(this),this._onPointerDown=O_.bind(this),this._onPointerUp=B_.bind(this),this._onContextMenu=K_.bind(this),this._onMouseWheel=V_.bind(this),this._onKeyDown=W_.bind(this),this._onTouchStart=q_.bind(this),this._onTouchMove=X_.bind(this),this._onMouseDown=G_.bind(this),this._onMouseMove=H_.bind(this),this._interceptControlDown=j_.bind(this),this._interceptControlUp=Y_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=gt.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Nh),this.update(),this.state=gt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;zt.copy(t).sub(this.target),zt.applyQuaternion(this._quat),this._spherical.setFromVector3(zt),this.autoRotate&&this.state===gt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,i=this.maxAzimuthAngle;isFinite(n)&&isFinite(i)&&(n<-Math.PI?n+=ln:n>Math.PI&&(n-=ln),i<-Math.PI?i+=ln:i>Math.PI&&(i-=ln),n<=i?this._spherical.theta=Math.max(n,Math.min(i,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+i)/2?Math.max(n,this._spherical.theta):Math.min(i,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let a=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const r=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),a=r!=this._spherical.radius}if(zt.setFromSpherical(this._spherical),zt.applyQuaternion(this._quatInverse),t.copy(this.target).add(zt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let r=null;if(this.object.isPerspectiveCamera){const o=zt.length();r=this._clampDistance(o*this._scale);const c=o-r;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),a=!!c}else if(this.object.isOrthographicCamera){const o=new v(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),a=c!==this.object.zoom;const l=new v(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),r=zt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;r!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(r).add(this.object.position):(Ja.origin.copy(this.object.position),Ja.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Ja.direction))<U_?this.object.lookAt(this.target):(Fh.setFromNormalAndCoplanarPoint(this.object.up,this.target),Ja.intersectPlane(Fh,this.target))))}else if(this.object.isOrthographicCamera){const r=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),r!==this.object.zoom&&(this.object.updateProjectionMatrix(),a=!0)}return this._scale=1,this._performCursorZoom=!1,a||this._lastPosition.distanceToSquared(this.object.position)>bo||8*(1-this._lastQuaternion.dot(this.object.quaternion))>bo||this._lastTargetPosition.distanceToSquared(this.target)>bo?(this.dispatchEvent(Nh),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ln/60*this.autoRotateSpeed*e:ln/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){zt.setFromMatrixColumn(t,0),zt.multiplyScalar(-e),this._panOffset.add(zt)}_panUp(e,t){this.screenSpacePanning===!0?zt.setFromMatrixColumn(t,1):(zt.setFromMatrixColumn(t,0),zt.crossVectors(this.object.up,zt)),zt.multiplyScalar(e),this._panOffset.add(zt)}_pan(e,t){const n=this.domElement;if(this.object.isPerspectiveCamera){const i=this.object.position;zt.copy(i).sub(this.target);let a=zt.length();a*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*a/n.clientHeight,this.object.matrix),this._panUp(2*t*a/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),i=e-n.left,a=t-n.top,r=n.width,o=n.height;this._mouse.x=i/r*2-1,this._mouse.y=-(a/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ln*this._rotateDelta.x/t.clientHeight),this._rotateUp(ln*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ln*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._rotateStart.set(n,i)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panStart.set(n,i)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,a=Math.sqrt(n*n+i*i);this._dollyStart.set(0,a)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),a=.5*(e.pageY+n.y);this._rotateEnd.set(i,a)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ln*this._rotateDelta.x/t.clientHeight),this._rotateUp(ln*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panEnd.set(n,i)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,a=Math.sqrt(n*n+i*i);this._dollyEnd.set(0,a),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const r=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(r,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new Je,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function O_(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function z_(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function B_(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent($d),this.state=gt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function G_(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case ms.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=gt.DOLLY;break;case ms.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}break;case ms.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Yc)}function H_(s){switch(this.state){case gt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case gt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case gt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function V_(s){this.enabled===!1||this.enableZoom===!1||this.state!==gt.NONE||(s.preventDefault(),this.dispatchEvent(Yc),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent($d))}function W_(s){this.enabled!==!1&&this._handleKeyDown(s)}function q_(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case fs.ROTATE:if(this.enableRotate===!1){this.state=gt.NONE;break}this._handleTouchStartRotate(s),this.state=gt.TOUCH_ROTATE;break;case fs.PAN:if(this.enablePan===!1){this.state=gt.NONE;break}this._handleTouchStartPan(s),this.state=gt.TOUCH_PAN;break;default:this.state=gt.NONE}break;case 2:switch(this.touches.TWO){case fs.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=gt.TOUCH_DOLLY_PAN;break;case fs.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=gt.TOUCH_DOLLY_ROTATE;break;default:this.state=gt.NONE}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Yc)}function X_(s){switch(this._trackPointer(s),this.state){case gt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case gt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case gt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case gt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=gt.NONE}}function K_(s){this.enabled!==!1&&s.preventDefault()}function j_(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Y_(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Lt=new xn,Za=new v,Uh=new Je,kh=new Je,Oh=new Je;class J_{constructor(e){this.geometry=e.geometry,this.randomFunction=Math.random,this.indexAttribute=this.geometry.index,this.positionAttribute=this.geometry.getAttribute("position"),this.normalAttribute=this.geometry.getAttribute("normal"),this.colorAttribute=this.geometry.getAttribute("color"),this.uvAttribute=this.geometry.getAttribute("uv"),this.weightAttribute=null,this.distribution=null}setWeightAttribute(e){return this.weightAttribute=e?this.geometry.getAttribute(e):null,this}build(){const e=this.indexAttribute,t=this.positionAttribute,n=this.weightAttribute,i=e?e.count/3:t.count/3,a=new Float32Array(i);for(let c=0;c<i;c++){let l=1,h=3*c,d=3*c+1,u=3*c+2;e&&(h=e.getX(h),d=e.getX(d),u=e.getX(u)),n&&(l=n.getX(h)+n.getX(d)+n.getX(u)),Lt.a.fromBufferAttribute(t,h),Lt.b.fromBufferAttribute(t,d),Lt.c.fromBufferAttribute(t,u),l*=Lt.getArea(),a[c]=l}const r=new Float32Array(i);let o=0;for(let c=0;c<i;c++)o+=a[c],r[c]=o;return this.distribution=r,this}setRandomGenerator(e){return this.randomFunction=e,this}sample(e,t,n,i){const a=this._sampleFaceIndex();return this._sampleFace(a,e,t,n,i)}_sampleFaceIndex(){const e=this.distribution[this.distribution.length-1];return this._binarySearch(this.randomFunction()*e)}_binarySearch(e){const t=this.distribution;let n=0,i=t.length-1,a=-1;for(;n<=i;){const r=Math.ceil((n+i)/2);if(r===0||t[r-1]<=e&&t[r]>e){a=r;break}else e<t[r]?i=r-1:n=r+1}return a}_sampleFace(e,t,n,i,a){let r=this.randomFunction(),o=this.randomFunction();r+o>1&&(r=1-r,o=1-o);const c=this.indexAttribute;let l=e*3,h=e*3+1,d=e*3+2;return c&&(l=c.getX(l),h=c.getX(h),d=c.getX(d)),Lt.a.fromBufferAttribute(this.positionAttribute,l),Lt.b.fromBufferAttribute(this.positionAttribute,h),Lt.c.fromBufferAttribute(this.positionAttribute,d),t.set(0,0,0).addScaledVector(Lt.a,r).addScaledVector(Lt.b,o).addScaledVector(Lt.c,1-(r+o)),n!==void 0&&(this.normalAttribute!==void 0?(Lt.a.fromBufferAttribute(this.normalAttribute,l),Lt.b.fromBufferAttribute(this.normalAttribute,h),Lt.c.fromBufferAttribute(this.normalAttribute,d),n.set(0,0,0).addScaledVector(Lt.a,r).addScaledVector(Lt.b,o).addScaledVector(Lt.c,1-(r+o)).normalize()):Lt.getNormal(n)),i!==void 0&&this.colorAttribute!==void 0&&(Lt.a.fromBufferAttribute(this.colorAttribute,l),Lt.b.fromBufferAttribute(this.colorAttribute,h),Lt.c.fromBufferAttribute(this.colorAttribute,d),Za.set(0,0,0).addScaledVector(Lt.a,r).addScaledVector(Lt.b,o).addScaledVector(Lt.c,1-(r+o)),i.r=Za.x,i.g=Za.y,i.b=Za.z),a!==void 0&&this.uvAttribute!==void 0&&(Uh.fromBufferAttribute(this.uvAttribute,l),kh.fromBufferAttribute(this.uvAttribute,h),Oh.fromBufferAttribute(this.uvAttribute,d),a.set(0,0).addScaledVector(Uh,r).addScaledVector(kh,o).addScaledVector(Oh,1-(r+o))),this}}function Z_(s,e=!1){const t=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),a={},r={},o=s[0].morphTargetsRelative,c=new St;c.morphTargetsRelative=o;let l=0;for(let h=0;h<s.length;++h){const d=s[h];let u=0,f=0;if(t!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const p in d.attributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;a[p]===void 0&&(a[p]=[]),a[p].push(d.attributes[p]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(o!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const p in d.morphAttributes){if(!i.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;if(d.morphAttributes[p].length!==s[0].morphAttributes[p].length)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have the same number of morph targets for the "'+p+'" morph attribute.'),null;r[p]===void 0&&(r[p]=[]),r[p].push(d.morphAttributes[p]),f++}if(f!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of morph attributes."),null;if(e){let p;if(t)p=d.index.count;else if(d.attributes.position!==void 0)p=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,p,h),l+=p}}if(t){let h=0;const d=[];for(let u=0;u<s.length;++u){const f=s[u].index;for(let p=0;p<f.count;++p)d.push(f.getX(p)+h);h+=s[u].attributes.position.count}c.setIndex(d)}for(const h in a){const d=zh(a[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,d)}for(const h in r){const d=r[h][0].length;if(d!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let u=0;u<d;++u){const f=[];for(let b=0;b<r[h].length;++b)f.push(r[h][b][u]);const p=zh(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(p)}}}return c}function zh(s){let e,t,n,i=-1,a=0;for(let l=0;l<s.length;++l){const h=s[l];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;a+=h.count*t}const r=new e(a),o=new It(r,t,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const d=c/t;for(let u=0,f=h.count;u<f;u++)for(let p=0;p<t;p++){const b=h.getComponent(u,p);o.setComponent(u+d,p,b)}}else r.set(h.array,c);c+=h.count*t}return i!==void 0&&(o.gpuType=i),o}function Bh(s,e){if(e===Vu)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===fc||e===xd){let t=s.getIndex();if(t===null){const a=[],r=s.getAttribute("position");if(r!==void 0){for(let o=0;o<r.count;o++)a.push(o);s.setIndex(a),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}const n=t.count-2,i=[];if(e===fc)for(let a=1;a<=n;a++)i.push(t.getX(0)),i.push(t.getX(a)),i.push(t.getX(a+1));else for(let a=0;a<n;a++)a%2===0?(i.push(t.getX(a)),i.push(t.getX(a+1)),i.push(t.getX(a+2))):(i.push(t.getX(a+2)),i.push(t.getX(a+1)),i.push(t.getX(a)));return i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),s.setIndex(i),s.clearGroups(),s}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}function $_(s){const e=new Map,t=new Map,n=s.clone();return Qd(s,n,function(i,a){e.set(a,i),t.set(i,a)}),n.traverse(function(i){if(!i.isSkinnedMesh)return;const a=i,r=e.get(i),o=r.skeleton.bones;a.skeleton=r.skeleton.clone(),a.bindMatrix.copy(r.bindMatrix),a.skeleton.bones=o.map(function(c){return t.get(c)}),a.bind(a.skeleton,a.bindMatrix)}),n}function Qd(s,e,t){t(s,e);for(let n=0;n<s.children.length;n++)Qd(s.children[n],e.children[n],t)}class Q_ extends Ls{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new sx(t)}),this.register(function(t){return new ax(t)}),this.register(function(t){return new rx(t)}),this.register(function(t){return new mx(t)}),this.register(function(t){return new gx(t)}),this.register(function(t){return new bx(t)}),this.register(function(t){return new cx(t)}),this.register(function(t){return new lx(t)}),this.register(function(t){return new hx(t)}),this.register(function(t){return new dx(t)}),this.register(function(t){return new ix(t)}),this.register(function(t){return new ux(t)}),this.register(function(t){return new ox(t)}),this.register(function(t){return new px(t)}),this.register(function(t){return new fx(t)}),this.register(function(t){return new tx(t)}),this.register(function(t){return new Gh(t,ct.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Gh(t,ct.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new _x(t)})}load(e,t,n,i){const a=this;let r;if(this.resourcePath!=="")r=this.resourcePath;else if(this.path!==""){const l=ia.extractUrlBase(e);r=ia.resolveURL(l,this.path)}else r=ia.extractUrlBase(e);this.manager.itemStart(e);const o=function(l){i?i(l):console.error(l),a.manager.itemError(e),a.manager.itemEnd(e)},c=new Od(this.manager);c.setPriority(this.priority),c.setCache(this.cache),c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{a.parse(l,r,function(h){t(h),a.manager.itemEnd(e)},o)}catch(h){o(h)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let a;const r={},o={},c=new TextDecoder;if(typeof e=="string")a=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===eu){try{r[ct.KHR_BINARY_GLTF]=new xx(e)}catch(d){i&&i(d);return}a=JSON.parse(r[ct.KHR_BINARY_GLTF].content)}else a=JSON.parse(c.decode(e));else a=e;if(a.asset===void 0||a.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new Dx(a,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,priority:this.priority,cache:this.cache,withCredentials:this.withCredentials,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const d=this.pluginCallbacks[h](l);d.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[d.name]=d,r[d.name]=!0}if(a.extensionsUsed)for(let h=0;h<a.extensionsUsed.length;++h){const d=a.extensionsUsed[h],u=a.extensionsRequired||[];switch(d){case ct.KHR_MATERIALS_UNLIT:r[d]=new nx;break;case ct.KHR_DRACO_MESH_COMPRESSION:r[d]=new vx(a,this.dracoLoader);break;case ct.KHR_TEXTURE_TRANSFORM:r[d]=new yx;break;case ct.KHR_MESH_QUANTIZATION:r[d]=new Mx;break;default:u.indexOf(d)>=0&&o[d]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+d+'".')}}l.setExtensions(r),l.setPlugins(o),l.parse(n,i)}parseAsync(e,t){const n=this;return new Promise(function(i,a){n.parse(e,t,i,a)})}}function ex(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}function Nt(s,e,t){const n=s.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}const ct={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DIFFUSE_ROUGHNESS:"KHR_materials_diffuse_roughness",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class tx{constructor(e){this.parser=e,this.name=ct.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){const a=t[n];a.extensions&&a.extensions[this.name]&&a.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,a.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let i=t.cache.get(n);if(i)return i;const a=t.json,c=((a.extensions&&a.extensions[this.name]||{}).lights||[])[e];let l;const h=new pe(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],mn);const d=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new bc(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new wp(h),l.distance=d;break;case"spot":l=new Mp(h),l.distance=d,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),Un(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),i=Promise.resolve(l),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,a=n.json.nodes[e],o=(a.extensions&&a.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}}class nx{constructor(){this.name=ct.KHR_MATERIALS_UNLIT}getMaterialType(){return si}extendParams(e,t,n){const i=[];e.color=new pe(1,1,1),e.opacity=1;const a=t.pbrMetallicRoughness;if(a){if(Array.isArray(a.baseColorFactor)){const r=a.baseColorFactor;e.color.setRGB(r[0],r[1],r[2],mn),e.opacity=r[3]}a.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",a.baseColorTexture,Kt))}return Promise.all(i)}}class ix{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}}class sx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(i.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){const a=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Je(a,a)}return Promise.all(i)}}class ax{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_DIFFUSE_ROUGHNESS}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return t.diffuseRoughness=n.diffuseRoughnessFactor!==void 0?n.diffuseRoughnessFactor:0,n.diffuseRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"diffuseRoughnessMap",n.diffuseRoughnessTexture)),Promise.all(i)}}class rx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}}class ox{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessMinimum=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessMaximum=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(i)}}class cx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_SHEEN}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];if(t.sheenColor=new pe(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){const a=n.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],mn)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,Kt)),n.sheenRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(i)}}class lx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&i.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(i)}}class hx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_VOLUME}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;const a=n.attenuationColor||[1,1,1];return t.attenuationColor=new pe().setRGB(a[0],a[1],a[2],mn),Promise.all(i)}}class dx{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_IOR}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}}class ux{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));const a=n.specularColorFactor||[1,1,1];return t.specularColor=new pe().setRGB(a[0],a[1],a[2],mn),n.specularColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,Kt)),Promise.all(i)}}class fx{constructor(e){this.parser=e,this.name=ct.EXT_MATERIALS_BUMP}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&i.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(i)}}class px{constructor(e){this.parser=e,this.name=ct.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Nt(this.parser,e,this.name)!==null?Gt:null}extendMaterialParams(e,t){const n=Nt(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&i.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(i)}}class mx{constructor(e){this.parser=e,this.name=ct.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;const a=i.extensions[this.name],r=t.options.ktx2Loader;if(!r){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,a.source,r)}}class gx{constructor(e){this.parser=e,this.name=ct.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,i=n.json,a=i.textures[e];if(!a.extensions||!a.extensions[t])return null;const r=a.extensions[t],o=i.images[r.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,r.source,c)}}class bx{constructor(e){this.parser=e,this.name=ct.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,i=n.json,a=i.textures[e];if(!a.extensions||!a.extensions[t])return null;const r=a.extensions[t],o=i.images[r.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,r.source,c)}}class Gh{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const i=n.extensions[this.name],a=this.parser.getDependency("buffer",i.buffer),r=this.parser.options.meshoptDecoder;if(!r||!r.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return a.then(function(o){const c=i.byteOffset||0,l=i.byteLength||0,h=i.count,d=i.byteStride,u=new Uint8Array(o,c,l);return r.decodeGltfBufferAsync?r.decodeGltfBufferAsync(h,d,u,i.mode,i.filter).then(function(f){return f.buffer}):r.ready.then(function(){const f=new ArrayBuffer(h*d);return r.decodeGltfBuffer(new Uint8Array(f),h,d,u,i.mode,i.filter),f})})}else return null}}class _x{constructor(e){this.name=ct.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const i=t.meshes[n.mesh];for(const l of i.primitives)if(l.mode!==_n.TRIANGLES&&l.mode!==_n.TRIANGLE_STRIP&&l.mode!==_n.TRIANGLE_FAN&&l.mode!==void 0)return null;const r=n.extensions[this.name].attributes,o=[],c={};for(const l in r)o.push(this.parser.getDependency("accessor",r[l]).then(h=>(c[l]=h,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{const h=l.pop(),d=h.isGroup?h.children:[h],u=l[0].count,f=[];for(const p of d){const b=new Xe,g=new v,m=new pt,x=new v(1,1,1),E=new Vf(p.geometry,p.material,u);for(let S=0;S<u;S++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,S),c.ROTATION&&m.fromBufferAttribute(c.ROTATION,S),c.SCALE&&x.fromBufferAttribute(c.SCALE,S),E.setMatrixAt(S,b.compose(g,m,x));let y=null;for(const S in c)if(S==="_COLOR_0"){const w=c[S];E.instanceColor=new _r(w.array,w.itemSize,w.normalized)}else if(S!=="TRANSLATION"&&S!=="ROTATION"&&S!=="SCALE"){if(y===null){const _=E.geometry;y=new St,y.name=_.name;for(const M in _.attributes)y.setAttribute(M,_.attributes[M]);for(const M in _.morphAttributes)y.morphAttributes[M]=_.morphAttributes[M];_.index!==null&&y.setIndex(_.index),y.morphTargetsRelative=_.morphTargetsRelative;for(const M of _.groups)y.addGroup(M.start,M.count,M.materialIndex);_.boundingBox!==null&&(y.boundingBox=_.boundingBox.clone()),_.boundingSphere!==null&&(y.boundingSphere=_.boundingSphere.clone()),y.drawRange.start=_.drawRange.start,y.drawRange.count=_.drawRange.count,y.userData=Object.assign({},_.userData),E.geometry=y}const w=c[S];y.setAttribute(S,new _r(w.array,w.itemSize,w.normalized))}Pt.prototype.copy.call(E,p),this.parser.assignFinalMaterial(E),f.push(E)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}}const eu="glTF",Vs=12,Hh={JSON:1313821514,BIN:5130562};class xx{constructor(e){this.name=ct.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Vs),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==eu)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const i=this.header.length-Vs,a=new DataView(e,Vs);let r=0;for(;r<i;){const o=a.getUint32(r,!0);r+=4;const c=a.getUint32(r,!0);if(r+=4,c===Hh.JSON){const l=new Uint8Array(e,Vs+r,o);this.content=n.decode(l)}else if(c===Hh.BIN){const l=Vs+r;this.body=e.slice(l,l+o)}r+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class vx{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=ct.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,i=this.dracoLoader,a=e.extensions[this.name].bufferView,r=e.extensions[this.name].attributes,o={},c={},l={};for(const h in r){const d=yc[h]||h.toLowerCase();o[d]=r[h]}for(const h in e.attributes){const d=yc[h]||h.toLowerCase();if(r[h]!==void 0){const u=n.accessors[e.attributes[h]],f=xs[u.componentType];l[d]=f.name,c[d]=u.normalized===!0}}return t.getDependency("bufferView",a).then(function(h){return new Promise(function(d,u){i.decodeDracoFile(h,function(f){for(const p in f.attributes){const b=f.attributes[p],g=c[p];g!==void 0&&(b.normalized=g)}d(f)},o,l,mn,u)})})}}class yx{constructor(){this.name=ct.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){const n=Math.cos(e.rotation),i=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*i,e.offset.x,-e.repeat.x*i,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}}class Mx{constructor(){this.name=ct.KHR_MESH_QUANTIZATION}}class tu extends Rs{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,a=e*i*3+i;for(let r=0;r!==i;r++)t[r]=n[a+r];return t}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,h=i-t,d=(n-t)/h,u=d*d,f=u*d,p=e*l,b=p-l,g=-2*f+3*u,m=f-u,x=1-g,E=m-u+d;for(let y=0;y!==o;y++){const S=r[b+y+o],w=r[b+y+c]*h,_=r[p+y+o],M=r[p+y]*h;a[y]=x*S+E*w+g*_+m*M}return a}}const Sx=new pt;class wx extends tu{interpolate_(e,t,n,i){const a=super.interpolate_(e,t,n,i);return Sx.fromArray(a).normalize().toArray(a),a}}const _n={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},xs={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Vh={9728:Bt,9729:jt,9984:ud,9985:rr,9986:Ys,9987:Bn},Wh={33071:zn,33648:fr,10497:qi},_o={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},yc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},bi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Ex={CUBICSPLINE:void 0,LINEAR:ca,STEP:oa},xo={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Tx(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new cn({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Ti})),s.DefaultMaterial}function Bi(s,e,t){for(const n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Un(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Ax(s,e,t){let n=!1,i=!1,a=!1;for(let l=0,h=e.length;l<h;l++){const d=e[l];if(d.POSITION!==void 0&&(n=!0),d.NORMAL!==void 0&&(i=!0),d.COLOR_0!==void 0&&(a=!0),n&&i&&a)break}if(!n&&!i&&!a)return Promise.resolve(s);const r=[],o=[],c=[];for(let l=0,h=e.length;l<h;l++){const d=e[l];if(n){const u=d.POSITION!==void 0?t.getDependency("accessor",d.POSITION):s.attributes.position;r.push(u)}if(i){const u=d.NORMAL!==void 0?t.getDependency("accessor",d.NORMAL):s.attributes.normal;o.push(u)}if(a){const u=d.COLOR_0!==void 0?t.getDependency("accessor",d.COLOR_0):s.attributes.color;c.push(u)}}return Promise.all([Promise.all(r),Promise.all(o),Promise.all(c)]).then(function(l){const h=l[0],d=l[1],u=l[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=d),a&&(s.morphAttributes.color=u),s.morphTargetsRelative=!0,s})}function Rx(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Px(s){let e;const t=s.extensions&&s.extensions[ct.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+vo(t.attributes):e=s.indices+":"+vo(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+vo(s.targets[n]);return e}function vo(s){let e="";const t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function Mc(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Cx(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Lx=new Xe;class Dx{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new ex,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,a=!1,r=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){const o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;const c=o.match(/Version\/(\d+)/);i=n&&c?parseInt(c[1],10):-1,a=o.indexOf("Firefox")>-1,r=a?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||a&&r<98?(this.textureLoader=new xp(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)):(this.textureLoader=new Tp(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setWithCredentials(this.options.withCredentials),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Od(this.options.manager),this.fileLoader.setPriority(this.options.priority),this.fileLoader.setCache(this.options.cache),this.fileLoader.setResponseType("arraybuffer"),(this.options.withCredentials||this.options.crossOrigin==="use-credentials")&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,i=this.json,a=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(r){return r._markDefs&&r._markDefs()}),Promise.all(this._invokeAll(function(r){return r.beforeRoot&&r.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(r){const o={scene:r[0][i.scene||0],scenes:r[0],animations:r[1],cameras:r[2],asset:i.asset,parser:n,userData:{}};return Bi(a,o,i),Un(o,i),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(const c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,a=t.length;i<a;i++){const r=t[i].joints;for(let o=0,c=r.length;o<c;o++)e[r[o]].isBone=!0}for(let i=0,a=e.length;i<a;i++){const r=e[i];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const i=n.clone(),a=(r,o)=>{const c=this.associations.get(r);c!=null&&this.associations.set(o,c);for(const[l,h]of r.children.entries())a(h,o.children[l])};return a(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const i=e(t[n]);if(i)return i}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let i=0;i<t.length;i++){const a=e(t[i]);a&&n.push(a)}return n}getDependency(e,t){const n=e+":"+t;let i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(a){return a.loadNode&&a.loadNode(t)});break;case"mesh":i=this._invokeOne(function(a){return a.loadMesh&&a.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(a){return a.loadBufferView&&a.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(a){return a.loadMaterial&&a.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(a){return a.loadTexture&&a.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(a){return a.loadAnimation&&a.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(a){return a!=this&&a.getDependency&&a.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(a,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[ct.KHR_BINARY_GLTF].body);const i=this.options;return new Promise(function(a,r){n.load(ia.resolveURL(t.uri,i.path),a,void 0,function(){r(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const i=t.byteLength||0,a=t.byteOffset||0;return n.slice(a,a+i)})}loadAccessor(e){const t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){const r=_o[i.type],o=xs[i.componentType],c=i.normalized===!0,l=new o(i.count*r);return Promise.resolve(new It(l,r,c))}const a=[];return i.bufferView!==void 0?a.push(this.getDependency("bufferView",i.bufferView)):a.push(null),i.sparse!==void 0&&(a.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),a.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(a).then(function(r){const o=r[0],c=_o[i.type],l=xs[i.componentType],h=l.BYTES_PER_ELEMENT,d=h*c,u=i.byteOffset||0,f=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,p=i.normalized===!0;let b,g;if(f&&f!==d){const m=Math.floor(u/f),x="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+m+":"+i.count;let E=t.cache.get(x);E||(b=new l(o,m*f,i.count*f/h),E=new Ff(b,f/h),t.cache.add(x,E)),g=new kc(E,c,u%f/h,p)}else o===null?b=new l(i.count*c):b=new l(o,u,i.count*c),g=new It(b,c,p);if(i.sparse!==void 0){const m=_o.SCALAR,x=xs[i.sparse.indices.componentType],E=i.sparse.indices.byteOffset||0,y=i.sparse.values.byteOffset||0,S=new x(r[1],E,i.sparse.count*m),w=new l(r[2],y,i.sparse.count*c);o!==null&&(g=new It(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let _=0,M=S.length;_<M;_++){const F=S[_];if(g.setX(F,w[_*c]),c>=2&&g.setY(F,w[_*c+1]),c>=3&&g.setZ(F,w[_*c+2]),c>=4&&g.setW(F,w[_*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=p}return g})}loadTexture(e){const t=this.json,n=this.options,a=t.textures[e].source,r=t.images[a];let o=this.textureLoader;if(r.uri){const c=n.manager.getHandler(r.uri);c!==null&&(o=c)}return this.loadTextureImage(e,a,o)}loadTextureImage(e,t,n){const i=this,a=this.json,r=a.textures[e],o=a.images[t],c=(o.uri||o.bufferView)+":"+r.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=r.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);const u=(a.samplers||{})[r.sampler]||{};return h.magFilter=Vh[u.magFilter]||jt,h.minFilter=Vh[u.minFilter]||Bn,h.wrapS=Wh[u.wrapS]||qi,h.wrapT=Wh[u.wrapT]||qi,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Bt&&h.minFilter!==jt,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,i=this.json,a=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const r=i.images[e],o=self.URL||self.webkitURL;let c=r.uri||"",l=!1,h;if(t.isKTX2Loader===!0&&r.bufferView!==void 0)h=n.getDependency("bufferView",r.bufferView).then(function(u){return new Promise(function(f,p){t.parse(u,f,p)})});else{if(r.bufferView!==void 0)c=n.getDependency("bufferView",r.bufferView).then(function(u){l=!0;const f=new Blob([u],{type:r.mimeType});return c=o.createObjectURL(f),c});else if(r.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");h=Promise.resolve(c).then(function(u){return new Promise(function(f,p){let b=f;t.isImageBitmapLoader===!0&&(b=function(g){const m=new Yt(g);m.needsUpdate=!0,f(m)}),t.load(ia.resolveURL(u,a.path),b,void 0,p)})})}const d=h.then(function(u){return l===!0&&o.revokeObjectURL(c),Un(u,r),u.userData.mimeType=r.mimeType||Cx(r.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=d,d}assignTexture(e,t,n,i){const a=this;return this.getDependency("texture",n.index).then(function(r){if(!r)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(r=r.clone(),r.channel=n.texCoord),a.extensions[ct.KHR_TEXTURE_TRANSFORM]){const o=n.extensions!==void 0?n.extensions[ct.KHR_TEXTURE_TRANSFORM]:void 0;if(o){const c=a.associations.get(r);r=a.extensions[ct.KHR_TEXTURE_TRANSFORM].extendTexture(r,o),a.associations.set(r,c)}}return i!==void 0&&(r.colorSpace=i),e[t]=r,r})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const i=t.attributes.tangent===void 0,a=t.attributes.color!==void 0,r=t.attributes.normal===void 0;if(e.isPoints){const o="PointsMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new Cd,Hn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){const o="LineBasicMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new Bc,Hn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(i||a||r){let o="ClonedMaterial:"+n.uuid+":";i&&(o+="derivative-tangents:"),a&&(o+="vertex-colors:"),r&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),a&&(c.vertexColors=!0),r&&(c.flatShading=!0),i&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return cn}loadMaterial(e){const t=this,n=this.json,i=this.extensions,a=n.materials[e];let r;const o={},c=a.extensions||{},l=[];if(c[ct.KHR_MATERIALS_UNLIT]){const d=i[ct.KHR_MATERIALS_UNLIT];r=d.getMaterialType(),l.push(d.extendParams(o,a,t))}else{const d=a.pbrMetallicRoughness||{};if(o.color=new pe(1,1,1),o.opacity=1,Array.isArray(d.baseColorFactor)){const u=d.baseColorFactor;o.color.setRGB(u[0],u[1],u[2],mn),o.opacity=u[3]}d.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",d.baseColorTexture,Kt)),o.metalness=d.metallicFactor!==void 0?d.metallicFactor:1,o.roughness=d.roughnessFactor!==void 0?d.roughnessFactor:1,d.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",d.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",d.metallicRoughnessTexture))),r=this._invokeOne(function(u){return u.getMaterialType&&u.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(u){return u.extendMaterialParams&&u.extendMaterialParams(e,o)})))}a.doubleSided===!0&&(o.side=Rt);const h=a.alphaMode||xo.OPAQUE;if(h===xo.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===xo.MASK&&(o.alphaTest=a.alphaCutoff!==void 0?a.alphaCutoff:.5)),a.normalTexture!==void 0&&r!==si&&(l.push(t.assignTexture(o,"normalMap",a.normalTexture)),o.normalScale=new Je(1,1),a.normalTexture.scale!==void 0)){const d=a.normalTexture.scale;o.normalScale.set(d,d)}if(a.occlusionTexture!==void 0&&r!==si&&(l.push(t.assignTexture(o,"aoMap",a.occlusionTexture)),a.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=a.occlusionTexture.strength)),a.emissiveFactor!==void 0&&r!==si){const d=a.emissiveFactor;o.emissive=new pe().setRGB(d[0],d[1],d[2],mn)}return a.emissiveTexture!==void 0&&r!==si&&l.push(t.assignTexture(o,"emissiveMap",a.emissiveTexture,Kt)),Promise.all(l).then(function(){const d=new r(o);return a.name&&(d.name=a.name),Un(d,a),t.associations.set(d,{materials:e}),a.extensions&&Bi(i,d,a),d})}createUniqueName(e){const t=Mt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,i=this.primitiveCache;function a(o){return n[ct.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return qh(c,o,t)})}const r=[];for(let o=0,c=e.length;o<c;o++){const l=e[o],h=Px(l),d=i[h];if(d)r.push(d.promise);else{let u;l.extensions&&l.extensions[ct.KHR_DRACO_MESH_COMPRESSION]?u=a(l):u=qh(new St,l,t),l.mode===_n.TRIANGLE_STRIP?u=u.then(f=>Bh(f,xd)):l.mode===_n.TRIANGLE_FAN&&(u=u.then(f=>Bh(f,fc))),i[h]={primitive:l,promise:u},r.push(u)}}return Promise.all(r)}loadMesh(e){const t=this,n=this.json,i=this.extensions,a=n.meshes[e],r=a.primitives,o=[];for(let c=0,l=r.length;c<l;c++){const h=r[c].material===void 0?Tx(this.cache):this.getDependency("material",r[c].material);o.push(h)}return o.push(t.loadGeometries(r)),Promise.all(o).then(async function(c){const l=c.slice(0,c.length-1),h=c[c.length-1],d=[];for(let f=0,p=h.length;f<p;f++){const b=h[f],g=r[f];let m;const x=l[f];if(g.mode===_n.TRIANGLES||g.mode===_n.TRIANGLE_STRIP||g.mode===_n.TRIANGLE_FAN||g.mode===void 0){const E=a.isSkinnedMesh===!0,y=b.hasAttribute("skinIndex")&&b.hasAttribute("skinWeight");E&&y===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),m=E&&y?new kn(b,x):new Ft(b,x),m.isSkinnedMesh===!0&&m.normalizeSkinWeights()}else if(g.mode===_n.LINES)m=new Pd(b,x);else if(g.mode===_n.LINE_STRIP)m=new Gc(b,x);else if(g.mode===_n.LINE_LOOP)m=new qf(b,x);else if(g.mode===_n.POINTS)m=new Xf(b,x);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(m.geometry.morphAttributes).length>0&&Rx(m,a),m.name=t.createUniqueName(a.name||"mesh_"+e),Un(m,a),g.extensions&&Bi(i,m,g),t.assignFinalMaterial(m),d.push(m)}for(let f=0,p=d.length;f<p;f++)t.associations.set(d[f],{meshes:e,primitives:f});if(d.length===1)return a.extensions&&Bi(i,d[0],a),d[0];const u=new Pn;a.extensions&&Bi(i,u,a),t.associations.set(u,{meshes:e});for(let f=0,p=d.length;f<p;f++)u.add(d[f]);return u})}loadCamera(e){let t;const n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new hn(na.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new qc(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Un(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let i=0,a=t.joints.length;i<a;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){const a=i.pop(),r=i,o=[],c=[];for(let l=0,h=r.length;l<h;l++){const d=r[l];if(d){o.push(d);const u=new Xe;a!==null&&u.fromArray(a.array,l*16),c.push(u)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Rr(o,c)})}loadAnimation(e){const t=this.json,n=this,i=t.animations[e],a=i.name?i.name:"animation_"+e,r=[],o=[],c=[],l=[],h=[];for(let d=0,u=i.channels.length;d<u;d++){const f=i.channels[d],p=i.samplers[f.sampler],b=f.target,g=b.node,m=i.parameters!==void 0?i.parameters[p.input]:p.input,x=i.parameters!==void 0?i.parameters[p.output]:p.output;b.node!==void 0&&(r.push(this.getDependency("node",g)),o.push(this.getDependency("accessor",m)),c.push(this.getDependency("accessor",x)),l.push(p),h.push(b))}return Promise.all([Promise.all(r),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(d){const u=d[0],f=d[1],p=d[2],b=d[3],g=d[4],m=[];for(let E=0,y=u.length;E<y;E++){const S=u[E],w=f[E],_=p[E],M=b[E],F=g[E];if(S===void 0)continue;S.updateMatrix&&S.updateMatrix();const P=n._createAnimationTracks(S,w,_,M,F);if(P)for(let I=0;I<P.length;I++)m.push(P[I])}const x=new up(a,void 0,m);return Un(x,i),x})}createNodeMesh(e){const t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(a){const r=n._getNodeRef(n.meshCache,i.mesh,a);return i.weights!==void 0&&r.traverse(function(o){if(o.isMesh)for(let c=0,l=i.weights.length;c<l;c++)o.morphTargetInfluences[c]=i.weights[c]}),r})}loadNode(e){const t=this.json,n=this,i=t.nodes[e],a=n._loadNodeShallow(e),r=[],o=i.children||[];for(let l=0,h=o.length;l<h;l++)r.push(n.getDependency("node",o[l]));const c=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([a,Promise.all(r),c]).then(function(l){const h=l[0],d=l[1],u=l[2];u!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(u,Lx)});for(let f=0,p=d.length;f<p;f++)h.add(d[f]);if(h.userData.pivot!==void 0&&d.length>0){const f=h.userData.pivot,p=d[0];h.pivot=new v().fromArray(f),h.position.x-=f[0],h.position.y-=f[1],h.position.z-=f[2],p.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const a=t.nodes[e],r=a.name?i.createUniqueName(a.name):"",o=[],c=i._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),a.camera!==void 0&&o.push(i.getDependency("camera",a.camera).then(function(l){return i._getNodeRef(i.cameraCache,a.camera,l)})),i._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let h;if(a.isBone===!0?h=new Oc:l.length>1?h=new Pn:l.length===1?h=l[0]:h=new Pt,h!==l[0])for(let d=0,u=l.length;d<u;d++)h.add(l[d]);if(a.name&&(h.userData.name=a.name,h.name=r),Un(h,a),a.extensions&&Bi(n,h,a),a.matrix!==void 0){const d=new Xe;d.fromArray(a.matrix),h.applyMatrix4(d)}else a.translation!==void 0&&h.position.fromArray(a.translation),a.rotation!==void 0&&h.quaternion.fromArray(a.rotation),a.scale!==void 0&&h.scale.fromArray(a.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(a.mesh!==void 0&&i.meshCache.refs[a.mesh]>1){const d=i.associations.get(h);i.associations.set(h,{...d})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],i=this,a=new Pn;n.name&&(a.name=i.createUniqueName(n.name)),Un(a,n),n.extensions&&Bi(t,a,n);const r=n.nodes||[],o=[];for(let c=0,l=r.length;c<l;c++)o.push(i.getDependency("node",r[c]));return Promise.all(o).then(function(c){for(let h=0,d=c.length;h<d;h++){const u=c[h];u.parent!==null?a.add($_(u)):a.add(u)}const l=h=>{const d=new Map;for(const[u,f]of i.associations)(u instanceof Hn||u instanceof Yt)&&d.set(u,f);return h.traverse(u=>{const f=i.associations.get(u);f!=null&&d.set(u,f)}),d};return i.associations=l(a),a})}_createAnimationTracks(e,t,n,i,a){const r=[],o=e.name?e.name:e.uuid,c=[];function l(f){f.morphTargetInfluences&&c.push(f.name?f.name:f.uuid)}bi[a.path]===bi.weights?(l(e),e.isGroup&&e.children.forEach(l)):c.push(o);let h;switch(bi[a.path]){case bi.weights:h=ua;break;case bi.rotation:h=fa;break;case bi.translation:case bi.scale:h=Mr;break;default:n.itemSize===1?h=ua:h=Mr;break}const d=i.interpolation!==void 0?Ex[i.interpolation]:ca,u=this._getArrayFromAccessor(n);for(let f=0,p=c.length;f<p;f++){const b=new h(c[f]+"."+bi[a.path],t.array,u,d);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(b),r.push(b)}return r}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=Mc(t.constructor),i=new Float32Array(t.length);for(let a=0,r=t.length;a<r;a++)i[a]=t[a]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const i=this instanceof fa?wx:tu;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Ix(s,e,t){const n=e.attributes,i=new Kn;if(n.POSITION!==void 0){const o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(i.set(new v(c[0],c[1],c[2]),new v(l[0],l[1],l[2])),o.normalized){const h=Mc(xs[o.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const a=e.targets;if(a!==void 0){const o=new v,c=new v;for(let l=0,h=a.length;l<h;l++){const d=a[l];if(d.POSITION!==void 0){const u=t.json.accessors[d.POSITION],f=u.min,p=u.max;if(f!==void 0&&p!==void 0){if(c.setX(Math.max(Math.abs(f[0]),Math.abs(p[0]))),c.setY(Math.max(Math.abs(f[1]),Math.abs(p[1]))),c.setZ(Math.max(Math.abs(f[2]),Math.abs(p[2]))),u.normalized){const b=Mc(xs[u.componentType]);c.multiplyScalar(b)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(o)}s.boundingBox=i;const r=new yn;i.getCenter(r.center),r.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=r}function qh(s,e,t){const n=e.attributes,i=[];function a(r,o){return t.getDependency("accessor",r).then(function(c){s.setAttribute(o,c)})}for(const r in n){const o=yc[r]||r.toLowerCase();o in s.attributes||i.push(a(n[r],o))}if(e.indices!==void 0&&!s.index){const r=t.getDependency("accessor",e.indices).then(function(o){s.setIndex(o)});i.push(r)}return lt.workingColorSpace!==mn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${lt.workingColorSpace}" not supported.`),Un(s,e),Ix(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?Ax(s,e.targets,t):s})}var Nx=(function(){var s="b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuixkbeeeddddillviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WboY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbrl79IV9Rbwq:VZkdbk:XYi5ud9:du8Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxcj;abad9Uc;WFbGcjdadca0EhmaialfgPar9Rgoadfhsavaoadz:jjjjbgzceVhHcbhOdndninaeaO9nmeaPax9RaD6mdamaeaO9RaOamfgoae6EgAcsfglc9WGhCabaOad2fhXaAcethQaxaDfhiaOaeaoaeao6E9RhLalcl4cifcd4hKazcj;cbfaAfhYcbh8AazcjdfhEaHh3incbh5dnawTmbaxa8Acd4fRbbh5kcbh8Eazcj;cbfhqinaih8Fdndndndna5a8Ecet4ciGgoc9:fPdebdkaPa8F9RaA6mrazcj;cbfa8EaA2fa8FaAz:jjjjb8Aa8FaAfhixdkazcj;cbfa8EaA2fcbaAz:kjjjb8Aa8FhixekaPa8F9RaK6mva8FaKfhidnaCTmbaPai9RcK6mbaocdtc:q:G:cjbfcj:G:cjbawEhaczhrcbhlinargoc9Wfghaqfhrdndndndndndnaaa8Fahco4fRbbalcoG4ciGcdtfydbPDbedvivvvlvkar9cb83bwar9cb83bbxlkarcbaiRbdai8Xbb9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbaqaofgrcGfcbaicdfa8J9c8N1:NfghRbbag9cjjjjjw:dg8J9qE86bbarcVfcbaha8J9c8M1:NfghRbbag9cjjjjjl:dg8J9qE86bbarc7fcbaha8J9c8L1:NfghRbbag9cjjjjjd:dg8J9qE86bbarctfcbaha8J9c8K1:NfghRbbag9cjjjjje:dg8J9qE86bbarc91fcbaha8J9c8J1:NfghRbbag9cjjjj;ab:dg8J9qE86bbarc4fcbaha8J9cg1:NfghRbbag9cjjjja:dg8J9qE86bbarc93fcbaha8J9ch1:NfghRbbag9cjjjjz:dgg9qE86bbarc94fcbahag9ca1:NfghRbbai8Xbe9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbarc95fcbaha8J9c8N1:NfgiRbbag9cjjjjjw:dg8J9qE86bbarc96fcbaia8J9c8M1:NfgiRbbag9cjjjjjl:dg8J9qE86bbarc97fcbaia8J9c8L1:NfgiRbbag9cjjjjjd:dg8J9qE86bbarc98fcbaia8J9c8K1:NfgiRbbag9cjjjjje:dg8J9qE86bbarc99fcbaia8J9c8J1:NfgiRbbag9cjjjj;ab:dg8J9qE86bbarc9:fcbaia8J9cg1:NfgiRbbag9cjjjja:dg8J9qE86bbarcufcbaia8J9ch1:NfgiRbbag9cjjjjz:dgg9qE86bbaiag9ca1:NfhixikaraiRblaiRbbghco4g8Ka8KciSg8KE86bbaqaofgrcGfaiclfa8Kfg8KRbbahcl4ciGg8La8LciSg8LE86bbarcVfa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc7fa8Ka8Lfg8KRbbahciGghahciSghE86bbarctfa8Kahfg8KRbbaiRbeghco4g8La8LciSg8LE86bbarc91fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc4fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc93fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc94fa8Kahfg8KRbbaiRbdghco4g8La8LciSg8LE86bbarc95fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc96fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc97fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc98fa8KahfghRbbaiRbigico4g8Ka8KciSg8KE86bbarc99faha8KfghRbbaicl4ciGg8Ka8KciSg8KE86bbarc9:faha8KfghRbbaicd4ciGg8Ka8KciSg8KE86bbarcufaha8KfgrRbbaiciGgiaiciSgiE86bbaraifhixdkaraiRbwaiRbbghcl4g8Ka8KcsSg8KE86bbaqaofgrcGfaicwfa8Kfg8KRbbahcsGghahcsSghE86bbarcVfa8KahfghRbbaiRbeg8Kcl4g8La8LcsSg8LE86bbarc7faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarctfaha8KfghRbbaiRbdg8Kcl4g8La8LcsSg8LE86bbarc91faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc4faha8KfghRbbaiRbig8Kcl4g8La8LcsSg8LE86bbarc93faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc94faha8KfghRbbaiRblg8Kcl4g8La8LcsSg8LE86bbarc95faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc96faha8KfghRbbaiRbvg8Kcl4g8La8LcsSg8LE86bbarc97faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc98faha8KfghRbbaiRbog8Kcl4g8La8LcsSg8LE86bbarc99faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc9:faha8KfghRbbaiRbrgicl4g8Ka8KcsSg8KE86bbarcufaha8KfgrRbbaicsGgiaicsSgiE86bbaraifhixekarai8Pbw83bwarai8Pbb83bbaiczfhikdnaoaC9pmbalcdfhlaoczfhraPai9RcL0mekkaoaC6moaimexokaCmva8FTmvkaqaAfhqa8Ecefg8Ecl9hmbkdndndndnawTmbasa8Acd4fRbbgociGPlbedrbkaATmdaza8Afh8Fazcj;cbfhhcbh8EaEhaina8FRbbhraahocbhlinaoahalfRbbgqce4cbaqceG9R7arfgr86bbaoadfhoaAalcefgl9hmbkaacefhaa8Fcefh8FahaAfhha8Ecefg8Ecl9hmbxikkaATmeaza8Afhaazcj;cbfhhcbhoceh8EaYh8FinaEaofhlaa8Vbbhrcbhoinala8FaofRbbcwtahaofRbbgqVc;:FiGce4cbaqceG9R7arfgr87bbaladfhlaLaocefgofmbka8FaQfh8FcdhoaacdfhaahaQfhha8EceGhlcbh8EalmbxdkkaATmbaocl4h8Eaza8AfRbbhqcwhoa3hlinalRbbaotaqVhqalcefhlaocwfgoca9hmbkcbhhaEh8FaYhainazcj;cbfahfRbbhrcwhoaahlinalRbbaotarVhralaAfhlaocwfgoca9hmbkara8E94aq7hqcbhoa8Fhlinalaqao486bbalcefhlaocwfgoca9hmbka8Fadfh8FaacefhaahcefghaA9hmbkkaEclfhEa3clfh3a8Aclfg8Aad6mbkaXazcjdfaAad2z:jjjjb8AazazcjdfaAcufad2fadz:jjjjb8AaAaOfhOaihxaimbkc9:hoxdkcbc99aPax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaok:ysezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecjez:kjjjb8Aav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk:4ioiue99dud99dud99dnaeTmbcbhiabhlindndnal8Uebgv:YgoJ:ji:1Salcof8UebgrciVgw:Y:vgDNJbbbZJbbb:;avcu9kEMgq:lJbbb9p9DTmbaq:Ohkxekcjjjj94hkkalclf8Uebhvalcdf8UebhxalarcefciGcetfak87ebdndnax:YgqaDNJbbbZJbbb:;axcu9kEMgm:lJbbb9p9DTmbam:Ohxxekcjjjj94hxkabaiarciGgkfcd7cetfax87ebdndnav:YgmaDNJbbbZJbbb:;avcu9kEMgP:lJbbb9p9DTmbaP:Ohvxekcjjjj94hvkalarcufciGcetfav87ebdndnawaw2:ZgPaPMaoaoN:taqaqN:tamamN:tgoJbbbbaoJbbbb9GE:raDNJbbbZMgD:lJbbb9p9DTmbaD:Ohrxekcjjjj94hrkalakcetfar87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2gdTmbinababydbgecwtcw91:Yaece91cjjj98Gcjjj;8if::NUdbabclfhbadcufgdmbkkk:Tvirud99eudndnadcl9hmbaeTmeindndnabRbbgiabcefgl8Sbbgvabcdfgo8Sbbgrf9R:YJbbuJabcifgwRbbgdce4adVgDcd4aDVgDcl4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax86bbdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao86bbdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai86bbdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad86bbabclfhbaecufgembxdkkaeTmbindndnab8Vebgiabcdfgl8Uebgvabclfgo8Uebgrf9R:YJbFu9habcofgw8Vebgdce4adVgDcd4aDVgDcl4aDVgDcw4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax87ebdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao87ebdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai87ebdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad87ebabcwfhbaecufgembkkk9teiucbcbyd:K:G:cjbgeabcifc98GfgbBd:K:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;LeeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiclfaeclfydbBdbaicwfaecwfydbBdbaicxfaecxfydbBdbaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk;aeedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdbaicxfalBdbaicwfalBdbaiclfalBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkk83dbcj:Gdk8Kbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbc:K:Gdkl8W:qbb",e="b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuixkbbebeeddddilve9Weeeviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WbwY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbDl79IV9Rbqq:W9Dklbzik94evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaeai86b:q:W:cjbaecitab8Piw83i:q:G:cjbaecefgecjd9hmbkk:JBl8Aud97dur978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaialfgxar9RhodnadTgmmbavaoad;8qbbkaicefhPcj;abad9Uc;WFbGcjdadca0EhsdndndnadTmbaoadfhzcbhHinaeaH9nmdaxaP9RaD6miabaHad2fhOaPaDfhAasaeaH9RaHasfae6EgCcsfgocl4cifcd4hXavcj;cbfaoc9WGgQcetfhLavcj;cbfaQci2fhKavcj;cbfaQfhYcbh8Aaoc;ab6hEincbh3dnawTmbaPa8Acd4fRbbh3kcbh5avcj;cbfh8Eindndndndna3a5cet4ciGgoc9:fPdebdkaxaA9RaQ6mwdnaQTmbavcj;cbfa5aQ2faAaQ;8qbbkaAaCfhAxdkaQTmeavcj;cbfa5aQ2fcbaQ;8kbxekaxaA9RaX6moaoclVcbawEhraAaXfhocbhidnaEmbaxao9Rc;Gb6mbcbhlina8EalfhidndndndndndnaAalco4fRbbgqciGarfPDbedibledibkaipxbbbbbbbbbbbbbbbbpklbxlkaiaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiaopbbbpklbaoczfhoxekaiaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcd4ciGarfPDbedibledibkaiczfpxbbbbbbbbbbbbbbbbpklbxlkaiczfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiczfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiczfaopbbbpklbaoczfhoxekaiczfaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcl4ciGarfPDbedibledibkaicafpxbbbbbbbbbbbbbbbbpklbxlkaicafaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaicafaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaicafaopbbbpklbaoczfhoxekaicafaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqco4arfPDbedibledibkaic8Wfpxbbbbbbbbbbbbbbbbpklbxlkaic8Wfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaoclffaqRb:q:W:cjbfhoxikaic8Wfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaocwffaqRb:q:W:cjbfhoxdkaic8Wfaopbbbpklbaoczfhoxekaic8WfaopbbdaoRbbgicitpbi:q:G:cjbaiRb:q:W:cjbgipsaoRbegqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbaiaocdffaqRb:q:W:cjbfhokalc;abfhialcjefaQ0meaihlaxao9Rc;Fb0mbkkdnaiaQ9pmbaici4hlinaxao9RcK6mwa8EaifhqdndndndndndnaAaico4fRbbalcoG4ciGarfPDbedibledibkaqpxbbbbbbbbbbbbbbbbpkbbxlkaqaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaoclffagRb:q:W:cjbfhoxikaqaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaocwffagRb:q:W:cjbfhoxdkaqaopbbbpkbbaoczfhoxekaqaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpkbbahaocdffagRb:q:W:cjbfhokalcdfhlaiczfgiaQ6mbkkaohAaoTmoka8EaQfh8Ea5cefg5cl9hmbkdndndndnawTmbaza8Acd4fRbbglciGPlbedwbkaQTmdavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep9Ta8Fpxeeeeeeeeeeeeeeeegap9op9Hp9rg8Fa8Jp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ugap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp9Ugap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp9Ugap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9AbbbaladfhlaoczfgoaQ6mbxikkaQTmeavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep:nea8Fpxebebebebebebebebgap9op:bep9rg8Fa8Jp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oegap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp:oegap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp:oegap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9AbbbaladfhlaoczfgoaQ6mbxdkkaQTmbcbhocbalcl4gl9Rc8FGhiavcjdfa8Afhrava8Afpbdbhainaravcj;cbfaofpblbg8JaYaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaLaofpblbg8MaKaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Faap9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8LaypmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9AbbbaradfhraoczfgoaQ6mbkka8Aclfg8Aad6mbkdnaCad2goTmbaOavcjdfao;8qbbkdnammbavavcjdfaCcufad2fad;8qbbkaCaHfhHc9:hoaAhPaAmbxlkkaeTmbaDalfhrcbhocuhlinaralaD9RglfaD6mdasaeao9Raoasfae6Eaofgoae6mbkaial9RhPkcbc99axaP9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaokwbz:bjjjbkNsezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecje;8kbav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk;Toio97eue97aec98Ghedndnadcl9hmbaeTmecbhdinababpbbbgicKp:RecKp:Sep;6eglaicwp:RecKp:Sep;6ealp;Geaiczp:RecKp:Sep;6egvp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgwp9op9rp;Keglpxbb;:9cbb;:9cbb;:9cbb;:9calalp;Meaoaop;Meavaravawp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFbbbFbbbFbbbFbbbp9oaipxbbbFbbbFbbbFbbbFp9op9qalavp;Mearp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaoavp;Mearp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgDaDpbbbgipxbbbbbbFFbbbbbbFFgwp9oabpbbbgoaipmbediwDqkzHOAKY8AEgvczp:Reczp:Sep;6eglaoaipmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eavczp:Sep;6egvp;Gealp;Gep;Kep;Legipxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgqp9op9rp;Keglpxb;:FSb;:FSb;:FSb;:FSalalp;Meaiaip;Meavaravaqp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbp9oaiavp;Mearp;Keczp:Rep9qgialavp;Mearp;KepxFFbbFFbbFFbbFFbbp9oglpmwDKYqk8AExm35Ps8E8Fp9qpkbbabaoawp9oaialpmbezHdiOAlvCXorQLp9qpkbbabcafhbadclfgdae6mbkkk;2ileue97euo97dnaec98GgiTmbcbheinabcKfpx:ji:1S:ji:1S:ji:1S:ji:1SabpbbbglabczfgvpbbbgopmlvorxmPsCXQL358E8Fgrczp:Segwpxibbbibbbibbbibbbp9qp;6egDp;NegqaDaDp;MegDaDp;KealaopmbediwDqkzHOAKY8AEgDczp:Reczp:Sep;6eglalp;MeaDczp:Sep;6egoaop;Mearczp:Reczp:Sep;6egrarp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jep;Mepxbbn0bbn0bbn0bbn0gDp;KepxFFbbFFbbFFbbFFbbgkp9oaqaop;MeaDp;Keczp:Rep9qgoaqalp;MeaDp;Keakp9oaqarp;MeaDp;Keczp:Rep9qgDpmwDKYqk8AExm35Ps8E8Fglp5eawclp:RegqpEi:T:j83ibavalp5baqpEd:T:j83ibabcwfaoaDpmbezHdiOAlvCXorQLgDp5eaqpEe:T:j83ibabaDp5baqpEb:T:j83ibabcafhbaeclfgeai6mbkkkuee97dnadcd4ae2c98GgeTmbcbhdinababpbbbgicwp:Recwp:Sep;6eaicep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepkbbabczfhbadclfgdae6mbkkk:Sodw97euaec98Ghedndnadcl9hmbaeTmecbhdinabpxbbuJbbuJbbuJbbuJabpbbbgicKp:TeglaicYp:Tep9qgvcdp:Teavp9qgvclp:Teavp9qgop;6ep;Negvaicwp:RecKp:SegraipxFbbbFbbbFbbbFbbbgwp9ogDp:Uep;6ep;Mepxbbn0bbn0bbn0bbn0gqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9oavaDarp:Xeaiczp:RecKp:Segip:Uep;6ep;Meaqp;Keawp9op9qavaDaraip:Uep:Xep;6ep;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qavaoalcep:Rep9oalpxebbbebbbebbbebbbp9op9qp;6ep;Meaqp;KecKp:Rep9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgkpxbFu9hbFu9hbFu9hbFu9habpbbbglakpbbbgrpmlvorxmPsCXQL358E8Fgvczp:TegqavcHp:Tep9qgicdp:Teaip9qgiclp:Teaip9qgicwp:Teaip9qgop;6ep;NegialarpmbediwDqkzHOAKY8AEgDpxFFbbFFbbFFbbFFbbglp9ograDczp:Segwp:Ueavczp:Reczp:SegDp:Xep;6ep;Mepxbbn0bbn0bbn0bbn0gvp;Kealp9oaiarawaDp:Uep:Xep;6ep;Meavp;Keczp:Rep9qgwaiaoaqcep:Rep9oaqpxebbbebbbebbbebbbp9op9qp;6ep;Meavp;Keczp:ReaiaDarp:Uep;6ep;Meavp;Kealp9op9qgipmwDKYqk8AExm35Ps8E8FpkbbabawaipmbezHdiOAlvCXorQLpkbbabcafhbadclfgdae6mbkkk9teiucbcbydj:G:cjbgeabcifc98GfgbBdj:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkxebcj:Gdklz:zbb",t=new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,3,2,0,0,5,3,1,0,1,12,1,0,10,22,2,12,0,65,0,65,0,65,0,252,10,0,0,11,7,0,65,0,253,15,26,11]),n=new Uint8Array([32,0,65,2,1,106,34,33,3,128,11,4,13,64,6,253,10,7,15,116,127,5,8,12,40,16,19,54,20,9,27,255,113,17,42,67,24,23,146,148,18,14,22,45,70,69,56,114,101,21,25,63,75,136,108,28,118,29,73,115]);if(typeof WebAssembly!="object")return{supported:!1};var i=WebAssembly.validate(t)?o(e):o(s),a,r=WebAssembly.instantiate(i,{}).then(function(m){a=m.instance,a.exports.__wasm_call_ctors()});function o(m){for(var x=new Uint8Array(m.length),E=0;E<m.length;++E){var y=m.charCodeAt(E);x[E]=y>96?y-97:y>64?y-39:y+4}for(var S=0,E=0;E<m.length;++E)x[S++]=x[E]<60?n[x[E]]:(x[E]-60)*64+x[++E];return x.buffer.slice(0,S)}function c(m,x,E,y,S,w,_){var M=m.exports.sbrk,F=y+3&-4,P=M(F*S),I=M(w.length),D=new Uint8Array(m.exports.memory.buffer);D.set(w,I);var L=x(P,y,S,I,w.length);if(L==0&&_&&_(P,F,S),E.set(D.subarray(P,P+y*S)),M(P-M(0)),L!=0)throw new Error("Malformed buffer data: "+L)}var l={NONE:"",OCTAHEDRAL:"meshopt_decodeFilterOct",QUATERNION:"meshopt_decodeFilterQuat",EXPONENTIAL:"meshopt_decodeFilterExp",COLOR:"meshopt_decodeFilterColor"},h={ATTRIBUTES:"meshopt_decodeVertexBuffer",TRIANGLES:"meshopt_decodeIndexBuffer",INDICES:"meshopt_decodeIndexSequence"},d=[],u=0;function f(m){var x={object:new Worker(m),pending:0,requests:{}};return x.object.onmessage=function(E){var y=E.data;x.pending-=y.count,x.requests[y.id][y.action](y.value),delete x.requests[y.id]},x}function p(m){for(var x="self.ready = WebAssembly.instantiate(new Uint8Array(["+new Uint8Array(i)+"]), {}).then(function(result) { result.instance.exports.__wasm_call_ctors(); return result.instance; });self.onmessage = "+g.name+";"+c.toString()+g.toString(),E=new Blob([x],{type:"text/javascript"}),y=URL.createObjectURL(E),S=d.length;S<m;++S)d[S]=f(y);for(var S=m;S<d.length;++S)d[S].object.postMessage({});d.length=m,URL.revokeObjectURL(y)}function b(m,x,E,y,S){for(var w=d[0],_=1;_<d.length;++_)d[_].pending<w.pending&&(w=d[_]);return new Promise(function(M,F){var P=new Uint8Array(E),I=++u;w.pending+=m,w.requests[I]={resolve:M,reject:F},w.object.postMessage({id:I,count:m,size:x,source:P,mode:y,filter:S},[P.buffer])})}function g(m){var x=m.data;self.ready.then(function(E){if(!x.id)return self.close();try{var y=new Uint8Array(x.count*x.size);c(E,E.exports[x.mode],y,x.count,x.size,x.source,E.exports[x.filter]),self.postMessage({id:x.id,count:x.count,action:"resolve",value:y},[y.buffer])}catch(S){self.postMessage({id:x.id,count:x.count,action:"reject",value:S})}})}return{ready:r,supported:!0,useWorkers:function(m){p(m)},decodeVertexBuffer:function(m,x,E,y,S){c(a,a.exports.meshopt_decodeVertexBuffer,m,x,E,y,a.exports[l[S]])},decodeIndexBuffer:function(m,x,E,y){c(a,a.exports.meshopt_decodeIndexBuffer,m,x,E,y)},decodeIndexSequence:function(m,x,E,y){c(a,a.exports.meshopt_decodeIndexSequence,m,x,E,y)},decodeGltfBuffer:function(m,x,E,y,S,w){c(a,a.exports[h[S]],m,x,E,y,a.exports[l[w]])},decodeGltfBufferAsync:function(m,x,E,y,S){return d.length>0?b(m,x,E,h[y],l[S]):r.then(function(){var w=new Uint8Array(m*x);return c(a,a.exports[h[y]],w,m,x,E,a.exports[l[S]]),w})}}})();function jn(s){let e=s>>>0;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}const Oe=(s,e,t)=>s<e?e:s>t?t:s,Fx=s=>Oe(s,0,1),ue=(s,e,t)=>s+(e-s)*t,Ce=Math.PI/180;function re(s,e,t){const n=Fx((t-s)/(e-s));return n*n*(3-2*n)}function bn(s,e){const t=s.length,n=Oe(e,0,t-1),i=Math.min(Math.floor(n),t-2),a=n-i,r=s[Math.max(i-1,0)],o=s[i],c=s[i+1],l=s[Math.min(i+2,t-1)];return .5*(2*o+(-r+c)*a+(2*r-5*o+4*c-l)*a*a+(-r+3*o-3*c+l)*a*a*a)}function Ln(s,e,t,n){return ue(s,e,1-Math.exp(-t*n))}function Xh(s,e){let t=s*374761393+e*668265263|0;return t=Math.imul(t^t>>>13,1274126177),((t^t>>>16)>>>0)/4294967296}function Ot(s,e=0){const t=Math.floor(s),n=s-t,i=n*n*(3-2*n);return ue(Xh(t,e),Xh(t+1,e),i)*2-1}const Ae=(s,e,t)=>e+(t-e)*s();function Ux(s,e,t,n=2){return e+(t-e)*Math.pow(s(),n)}class Vi{constructor(e=6,t=.5){this.freq=e,this.zeta=t}freq;zeta;x=0;v=0;step(e,t){const n=this.freq*Math.PI*2,i=Math.max(1,Math.ceil(t*this.freq*8)),a=t/i;for(let r=0;r<i;r++)this.v+=(-n*n*(this.x-e)-2*this.zeta*n*this.v)*a,this.x+=this.v*a;return this.x}kick(e){this.v+=e}}const Kh={round:1,cup:.5,fine:!0,spacing:.8,fuzz:0},Tn={name:"Lampornis calolaemus",seed:1207,sections:[{y:-.07,z:-.32,a:60,w:.035,rd:.03,rv:.035},{y:.04,z:-.245,a:60,w:.15,rd:.105,rv:.13},{y:.17,z:-.165,a:63,w:.225,rd:.16,rv:.2},{y:.34,z:-.09,a:68,w:.262,rd:.185,rv:.25},{y:.52,z:-.035,a:76,w:.258,rd:.185,rv:.245},{y:.67,z:-.005,a:84,w:.236,rd:.185,rv:.212},{y:.775,z:.008,a:80,w:.205,rd:.182,rv:.19},{y:.887,z:.052,a:62,w:.15,rd:.17,rv:.17},{y:.926,z:.116,a:38,w:.117,rd:.14,rv:.14},{y:.925,z:.195,a:18,w:.066,rd:.09,rv:.07},{y:.905,z:.245,a:8,w:.03,rd:.032,rv:.028}],throat:[4.5,7.3],spine:{tail:.3,hips:1.9,spine:3,chest:4.1,neck1:5.3,neck2:5.95,head:6.55},eye:{s:7.8,phi:.535,radius:.037,inset:.84},bill:{length:.44,radius:.02,droop:.022,color:460551},skin:1840662,shading:{flank:.6,under:.6,patch:.3,gold:5921324,goldAmount:.22},looks:{body:{width:.03,aspect:2.1,rowStep:.3,tilt:13,lift:1,cup:.3,round:.7,loose:.55,fuzz:.3,base:2104356,tip:5195350,iri:4885036,iriGraze:9071132,iriStrength:.12,iriPower:6,iriAlign:0,jitter:.5,sparkle:.6},belly:{width:.033,aspect:2.5,rowStep:.24,tilt:11,lift:1.2,cup:.25,round:.65,loose:.75,base:2630191,tip:6970485,iri:6982186,iriGraze:9071146,iriStrength:.1,iriPower:5,iriAlign:0,jitter:.5,sparkle:.6},flank:{width:.036,aspect:2.8,rowStep:.24,tilt:12,lift:1.3,cup:.2,round:.55,loose:.9,base:2301226,tip:6313066,iri:5925434,iriGraze:6965802,iriStrength:.06,iriPower:4,iriAlign:0,jitter:.5,sparkle:.7},down:{width:.04,aspect:2.6,rowStep:.24,tilt:26,lift:1.4,cup:.15,round:.5,loose:1,base:1840664,tip:4207930,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.3},back:{width:.03,aspect:2,rowStep:.31,tilt:11,lift:.9,cup:.35,round:.75,loose:.45,fuzz:.3,base:2039078,tip:4867669,iri:3840570,iriGraze:9071128,iriStrength:.24,iriPower:7,iriAlign:0,jitter:.5,sparkle:.45},scapular:{width:.042,aspect:3.3,rowStep:.24,tilt:21,lift:.8,cup:.3,round:.6,loose:.6,fuzz:.4,base:2170408,tip:5327964,iri:3836474,iriGraze:9071128,iriStrength:.2,iriPower:6,iriAlign:0,jitter:.5,sparkle:.5},collar:{width:.027,aspect:1.45,rowStep:.36,tilt:12,lift:.8,cup:.35,round:1,loose:.3,spacing:.7,fuzz:.12,base:1184536,tip:2369580,iri:2072672,iriGraze:678490,iriStrength:.32,iriPower:12,iriAlign:.3,iriAim:[0,.1,1],jitter:.55,sparkle:.6},head:{width:.017,aspect:1.8,rowStep:.34,tilt:12,lift:.45,cup:.35,round:.9,loose:.4,fuzz:.22,base:1184279,tip:2763315,iri:1866320,iriGraze:5263386,iriStrength:.28,iriPower:7,iriAlign:0,jitter:.45,sparkle:.4},mask:{width:.012,aspect:1.7,rowStep:.36,tilt:10,lift:.2,cup:.3,round:.9,loose:.35,fuzz:.25,base:263173,tip:789517,iri:1054752,iriGraze:0,iriStrength:.04,iriPower:4,iriAlign:0,jitter:.2},velvet:{width:.015,aspect:1.6,rowStep:.28,tilt:6,lift:.15,cup:.2,round:.7,loose:.8,fuzz:.7,base:262915,tip:985865,iri:0,iriGraze:0,iriStrength:0,iriPower:2,iriAlign:0,jitter:.2},stripe:{width:.012,aspect:2.6,rowStep:.24,tilt:6,lift:.2,cup:.15,round:.5,loose:.95,fuzz:1,base:11841962,tip:15526885,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.2},covert:{width:.046,aspect:2.6,rowStep:.33,tilt:9,lift:.7,cup:.3,round:.7,loose:.4,base:2170151,tip:5129816,iri:3832400,iriGraze:5917226,iriStrength:.18,iriPower:6,iriAlign:0,jitter:.4,sparkle:.5},undertail:{width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,cup:.2,round:.6,loose:.8,base:7827564,tip:13617342,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.3},wingCovert:{width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,cup:.3,round:.8,loose:.22,fuzz:0,base:1512732,tip:4012104,iri:4872824,iriGraze:5917242,iriStrength:.06,iriPower:6,iriAlign:0,jitter:.4,sparkle:.6},gorget:{...Kh,width:.052,aspect:1,rowStep:.3,tilt:8,lift:.5,spacing:.6,base:1706510,tip:4527900,iri:8007935,iriGraze:12595338,iriStrength:2,iriPower:4.2,iriAlign:.74,iriAim:[0,-.5,.87],jitter:.34,channel:"gorget"},crown:{...Kh,width:.019,aspect:1.3,rowStep:.34,tilt:10,lift:.4,fuzz:.45,sparkle:.5,loose:.12,base:330507,tip:662554,iri:1368772,iriGraze:1726680,iriStrength:2.3,iriPower:5,iriAlign:.8,iriAim:[0,-.24,1],jitter:.55,channel:"crown"}},tracts:[{name:"belly",look:"belly",region:{kind:"band",s:[0,3.7],phi:[0,.45],soft:.6}},{name:"flank",look:"flank",region:{kind:"band",s:[1.2,4.2],phi:[.3,.52],soft:.5}},{name:"back",look:"back",region:{kind:"band",s:[.9,6.2],phi:[.55,1]}},{name:"scapular",look:"scapular",region:{kind:"band",s:[3.7,5.6],phi:[.56,.84],soft:.3}},{name:"wingPit",look:"down",region:{kind:"blob",at:[3.8,.44],r:[.3,.035],soft:.5}},{name:"tailCoverts",look:"covert",region:{kind:"band",s:[0,1.15],phi:[0,1]}},{name:"undertail",look:"undertail",region:{kind:"band",s:[0,1.35],phi:[0,.4],soft:.3}},{name:"collar",look:"collar",region:{kind:"blob",at:[4.5,0],r:[.72,.44],soft:.6}},{name:"head",look:"head",region:{kind:"band",s:[6,11],phi:[0,1]}},{name:"velvet",look:"velvet",region:{kind:"blob",at:[8,0],r:[2.25,.63],pow:3,soft:.2}},{name:"mask",look:"mask",region:{kind:"blob",at:[8.3,.5],r:[1,.11]}},{name:"gorget",look:"gorget",region:{kind:"blob",at:[6.35,0],r:[1.4,.27],pow:3}},{name:"chin",look:"gorget",region:{kind:"blob",at:[7.7,0],r:[1.05,.17]}},{name:"crown",look:"crown",region:{kind:"blob",at:[8.5,1],r:[1.3,.4]}},{name:"postocular",look:"stripe",region:{kind:"streak",from:[7.5,.57],to:[6.3,.6],r:[.12,.025]}}],wing:{shoulder:[.185,.64,-.06],upper:.1,fore:.13,hand:.17,primaries:10,secondaries:6,primaryLen:[.34,.9],secondaryLen:[.27,.2],primaryWidth:.062,secondaryWidth:.064,rest:{from:[5.1,93],to:[.6,147],width:[.05,.105,.04],height:.034,cross:[.8,-.02]},color:3878193,sheen:8021618},tail:{rectrices:5,length:[.61,.66],width:.13,droop:62,restFan:.35,maxFan:11,color:1909292},legs:{spread:.075,hip:[.085,.11,-.05],toe:.085,perchRadius:.0405,color:1446159},behaviour:{breathHz:[3.4,5.2],holdCalm:[.4,1.8],holdAlert:[.22,.9],saccade:[.038,42e-5],neckShare:[.22,.3],blinkEvery:[1.8,5.5],ruffleEvery:[60,110],tailEvery:[3,9],wingEvery:[9,22],billUp:14}},nu=matchMedia("(pointer: coarse)").matches,kx=Tn.legs.perchRadius,Ei=.2;function iu(s){return kx*Math.min(1-.18*s,2.2)}const su=[Ei-.45,Ei+.45];function Ox(s,e=su){s.updateMatrixWorld(!0);const t=s.getObjectByName("perch"),n=t?zx(t,e[0]-.1,e[1]+.1):null,i=n?n.geometry.getAttribute("position").clone().applyMatrix4(n.matrixWorld).array:new Float32Array,a=new zp;a.ray.direction.set(0,-1,0);const r=[],o=new Map,c=new v,l=new v;function h(u){let f=1/0,p=-1/0;for(let b=0;b<i.length;b+=3)Math.abs(i[b]-u)>.006||(f=Math.min(f,i[b+2]),p=Math.max(p,i[b+2]));return f<=p?(f+p)/2:0}function d(u,f){if(!n)return null;a.ray.origin.set(u,2,h(u)),r.length=0,a.intersectObject(n,!1,r);const p=r[0];return p?f.copy(p.point):null}return(u,f)=>{const p=Math.round(u*1e3);let b=o.get(p);return b===void 0&&(b={point:new v,up:new v,tangent:new v,radius:iu(u)},d(u,b.point)&&d(u-.03,c)&&d(u+.03,l)?(b.tangent.copy(l).sub(c).normalize(),b.up.set(0,1,0).addScaledVector(b.tangent,-b.tangent.y).normalize()):b=null,o.set(p,b)),b?(f.point.copy(b.point),f.up.copy(b.up),f.tangent.copy(b.tangent),f.radius=b.radius,f):null}}function zx(s,e,t){const n=s.geometry,i=n.getAttribute("position"),a=n.index?n.index.count:i.count,r=h=>n.index?n.index.getX(h):h,o=[];for(let h=0;h<a;h+=3){const d=r(h),u=r(h+1),f=r(h+2),p=Math.min(i.getX(d),i.getX(u),i.getX(f));if(!(Math.max(i.getX(d),i.getX(u),i.getX(f))<e||p>t))for(const g of[d,u,f])o.push(i.getX(g),i.getY(g),i.getZ(g))}const c=new St;c.setAttribute("position",new tt(o,3));const l=new Ft(c,s.material);return l.matrixAutoUpdate=!1,l.matrixWorld.copy(s.matrixWorld),l}function jh(s,e,t,n,i){const a=s.computeFrenetFrames(t,!1),r=[],o=[],c=[],l=jn(i),h=Array.from({length:6},()=>({u:l(),a:l()*Math.PI*2,s:.25+l()*.35})),d=new v,u=new v;for(let p=0;p<=t;p++){const b=p/t;s.getPointAt(b,d);const g=a.normals[p],m=a.binormals[p];for(let x=0;x<=n;x++){const E=x/n*Math.PI*2;u.copy(g).multiplyScalar(Math.cos(E)).addScaledVector(m,Math.sin(E));let y=e(b);y*=1+.035*Math.sin(E*7+b*40)+.02*Math.sin(E*13-b*90);for(const S of h){const w=(b-S.u)*18,_=Math.cos(E-S.a);y*=1+S.s*Math.exp(-w*w)*Math.max(_,0)**3}r.push(d.x+u.x*y,d.y+u.y*y,d.z+u.z*y),o.push(b,x/n)}}for(let p=0;p<t;p++)for(let b=0;b<n;b++){const g=p*(n+1)+b,m=g+n+1;c.push(g,g+1,m,m,g+1,m+1)}const f=new St;return f.setAttribute("position",new tt(r,3)),f.setAttribute("uv",new tt(o,2)),f.setIndex(c),f.computeVertexNormals(),f}function Bx(s){const e=new cn({color:16777215,roughness:.92,metalness:0});return e.onBeforeCompile=t=>{t.uniforms.uLen={value:s},t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
varying vec3 vWPos; varying vec3 vWNor; varying vec2 vUv2;`).replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNor = normalize(mat3(modelMatrix) * objectNormal); vUv2 = uv;`),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
varying vec3 vWPos; varying vec3 vWNor; varying vec2 vUv2; uniform float uLen;
float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }`).replace("#include <color_fragment>",`#include <color_fragment>
{
  float along = vUv2.x * uLen;
  float streak = fbm(vec3(along * 6.0, vUv2.y * 3.0, 0.0) + vWPos * 2.0);
  vec3 bark = mix(vec3(0.16, 0.085, 0.05), vec3(0.36, 0.2, 0.11), streak);
  bark *= 0.75 + 0.5 * fbm(vWPos * 38.0);
  // moss on the up-facing side, patchy
  float up = clamp(vWNor.y, 0.0, 1.0);
  float moss = smoothstep(0.45, 0.75, fbm(vWPos * 9.0) + up * 0.35 - 0.1) * smoothstep(0.0, 0.5, up + 0.2);
  vec3 mossC = mix(vec3(0.10, 0.17, 0.02), vec3(0.30, 0.42, 0.05), fbm(vWPos * 60.0));
  diffuseColor.rgb = mix(bark, mossC, moss * 0.75);
  // lichen speckle
  float lic = smoothstep(0.78, 0.82, fbm(vWPos * 25.0 + 7.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.58, 0.45), lic * 0.5);
}`)},e}function Gx(){const s=new Pn,e=new yr([new v(-6,-1.414,-.927),new v(-3.2,-.709,-.364),new v(-1.4,-.312,-.11),new v(-.7,-.199,-.039),new v(0,-.041,0),new v(.5,.059,.072),new v(.9,.142,.113),new v(1.3,.193,.077),new v(1.8,.24,.04)]),t=e.getLength(),n=Bx(t),i=new v,a=jh(e,g=>iu(e.getPointAt(g,i).x)*(g>.97?1-(g-.97)*20:1),320,28,3),r=new Ft(a,n);r.name="perch",r.receiveShadow=!0,s.add(r);const o=new yr([new v(1.07,.11,.26),new v(1.18,.3,.28),new v(1.28,.5,.2),new v(1.41,.7,.09)]),c=new cn({color:5208600,roughness:.65}),l=new Ft(jh(o,g=>.022*(1-g*.6),60,10,9),c);l.castShadow=!0,s.add(l);const h=new Gt({color:8372762,roughness:.5,sheen:.5,sheenColor:new pe(13168720),emissive:2243072}),d=new Ki(1,16,12),u=new ba(.006,.008,1,6);u.translate(0,.5,0);const f=jn(21),p=new v,b=new v;for(let g=0;g<9;g++){const m=.2+g/8*.78;o.getPointAt(m,p),o.getTangentAt(m,b);const x=new v(f()-.5,f()*.6,f()-.5).normalize(),E=.06+f()*.08,y=new Ft(u,c);y.position.copy(p),y.quaternion.setFromUnitVectors(new v(0,1,0),x.clone().add(b.clone().multiplyScalar(.4)).normalize()),y.scale.set(1,E,1),s.add(y);const S=p.clone().addScaledVector(x.clone().add(b.clone().multiplyScalar(.4)).normalize(),E);for(let w=0;w<2+Math.floor(f()*3);w++){const _=new Ft(d,h),M=.018+f()*.018;_.scale.set(M,M*1.25,M),_.position.copy(S).add(new v(f()-.5,f()-.5,f()-.5).multiplyScalar(.05)),_.castShadow=!0,s.add(_)}}return{group:s}}async function Hx(s,e){const t=new Q_().setMeshoptDecoder(Nx),i=(s.endsWith(".txt")?await t.parseAsync(await jx(s),""):await t.loadAsync(s,e)).scene;i.traverse(o=>{const c=o;if(c.isMesh){c.receiveShadow=!0,c.castShadow=!/perch|hairs/i.test(c.name);for(const l of Array.isArray(c.material)?c.material:[c.material]){const h=l;h.envMapIntensity=.8}}});const a=i.getObjectByName("perch");let r=null;if(a){r=Kx(a),i.add(r);const o=i.getObjectByName("hairs");o&&i.add(Vx(a,o.material))}return{group:i,fuzz:r}}function $a(s,e,t,n,i){s[e]=t,s[e+1]=n,s[e+2]=i}function Vx(s,e){const t=nu?7e3:16e3,n=new J_(s).build(),i=jn(31),a=new v,r=new v,o=new v,c=new v,l=new v,h=new Float32Array(t*9),d=new Float32Array(t*9),u=new Float32Array(t*6);let f=0;for(let g=0;f<t&&g<t*4;g++){if(n.sample(a,r),Math.abs(a.x-Ei)<.17||a.x<-2.8||r.y<-.3&&i()<.7)continue;o.set(i()-.5,i()-.5,i()-.5).cross(r).normalize(),c.crossVectors(r,o);const m=.45+i()*.5,x=.005+i()*i()*.014;l.copy(r).multiplyScalar(1-m).addScaledVector(o,m).normalize();const E=45e-5+i()*3e-4,y=a.addScaledVector(r,-.001),S=f*9;$a(h,S,y.x-c.x*E,y.y-c.y*E,y.z-c.z*E),$a(h,S+3,y.x+c.x*E,y.y+c.y*E,y.z+c.z*E),$a(h,S+6,y.x+l.x*x,y.y+l.y*x,y.z+l.z*x);for(let w=0;w<9;w+=3)$a(d,S+w,r.x,r.y,r.z);u[f*6+2]=1,u[f*6+4]=.5,u[f*6+5]=1,f++}const p=new St;p.setAttribute("position",new It(h.slice(0,f*9),3)),p.setAttribute("normal",new It(d.slice(0,f*9),3)),p.setAttribute("uv",new It(u.slice(0,f*6),2));const b=new Ft(p,e);return b.name="twig.hairs",b.position.copy(s.position),b.quaternion.copy(s.quaternion),b.scale.copy(s.scale),b.receiveShadow=!0,b}const Yh=nu?7:14,Wx=.03,qx=-3.25;function Xx(s){const e=s.getAttribute("position"),t=s.index?s.index.count:e.count,n=o=>s.index?s.index.getX(o):o,i=new Uint32Array(t);let a=0;for(let o=0;o<t;o+=3){const c=n(o),l=n(o+1),h=n(o+2);Math.max(e.getX(c),e.getX(l),e.getX(h))<=qx||(i[a++]=c,i[a++]=l,i[a++]=h)}const r=new St;for(const o in s.attributes)r.setAttribute(o,s.attributes[o]);return r.setIndex(new It(e.count>65535?i.slice(0,a):Uint16Array.from(i.subarray(0,a)),1)),r}function Kx(s){const e=s.material,t=Xx(s.geometry),n=new Pn;n.name="fuzz";for(let i=1;i<=Yh;i++){const a=i/Yh,r=new cn({map:e.map,normalMap:e.normalMap,color:new pe(1,1,1),roughness:1,metalness:0,alphaTest:.5,alphaToCoverage:!0,envMapIntensity:.6});r.onBeforeCompile=c=>{c.uniforms.uH={value:a},c.uniforms.uLen={value:Wx},c.uniforms.uGrip={value:Ei},c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
uniform float uH; uniform float uLen; uniform float uGrip; varying vec3 vFP; varying float vGrip;`).replace("#include <begin_vertex>",`#include <begin_vertex>
           // no felt where the toes grip, and it thins out toward the old woody left end
           float gx = abs(position.x - uGrip);
           vGrip = mix(0.22, 1.0, smoothstep(0.14, 0.24, gx)) * (1.0 - smoothstep(-2.6, -3.2, position.x));
           transformed += objectNormal * uH * uLen * vGrip;
           vFP = position;`),c.fragmentShader=c.fragmentShader.replace("#include <common>",`#include <common>
           uniform float uH; varying vec3 vFP; varying float vGrip;
           float fh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
           float fn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
             return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                        mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`).replace("#include <alphatest_fragment>",`{
             // strands wander as they rise, so each one curls
             vec3 q = vFP * 520.0;
             q += vec3(fn(vFP * 90.0), fn(vFP * 90.0 + 7.3), fn(vFP * 90.0 + 3.1)) * 3.0 * uH;
             vec3 c = floor(q);
             vec3 f = fract(q) - 0.5;
             // moss where the baked bark is green: cushions, taller, denser
             float green = smoothstep(0.004, 0.03, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.9);
             float r = mix(0.42, 0.12, uH) * mix(1.0, 0.8, green);
             float strand = 1.0 - smoothstep(r * 0.6, r, length(f.xz + f.y * 0.3));
             float a = 0.0;
             // (the height noise only matters inside a strand, the cushions only on moss)
             if (strand > 0.0) {
               // per cell: a strand of random height, thick at the root, tapering
               // clumps and partings: strand height follows a slow noise
               float clump = fn(vFP * 14.0) * 0.7 + fn(vFP * 41.0) * 0.5;
               float tall = fh(c) * (0.25 + 0.9 * clump) * 0.3;
               if (green > 0.0) {
                 float cushion = smoothstep(0.2, 0.75, fn(vFP * 22.0) * 0.8 + fn(vFP * 61.0) * 0.4);
                 tall = mix(tall, (0.35 + 0.7 * fh(c + 1.7)) * cushion, green);
               }
               a = strand * step(uH, tall) * vGrip;
             }
             // a dense low underlayer so it reads as felt, not as stubble
             if (uH < 0.22) a = max(a, (1.0 - smoothstep(0.08, 0.22, uH)) * step(0.55, fn(q * 0.5)) * vGrip);
             diffuseColor.a = a;
             // (no colour for what the alpha test throws away)
             if (a > 0.0) {
               // root dark, tips paler, warmer and greyed where they catch the light
               vec3 tip = mix(diffuseColor.rgb * vec3(1.35, 1.15, 0.95), vec3(dot(diffuseColor.rgb, vec3(0.33)) * 1.6), 0.25);
               tip = mix(tip, diffuseColor.rgb * vec3(1.5, 1.6, 0.9), green); // moss tips go yellow-green
               diffuseColor.rgb = mix(diffuseColor.rgb * 0.45, tip, smoothstep(0.0, 1.0, uH)) * (0.8 + 0.4 * fh(c + 3.0));
             }
           }
           #include <alphatest_fragment>`)};const o=new Ft(t,r);o.name=`fuzz.${i}`,o.position.copy(s.position),o.quaternion.copy(s.quaternion),o.scale.copy(s.scale),o.receiveShadow=!0,o.renderOrder=i,n.add(o)}return n}async function jx(s){const e=await fetch(s);if(!e.ok)throw new Error(`${s}: HTTP ${e.status}`);const t=atob((await e.text()).trim()),n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n.buffer}const Qa=["tail","hips","spine","chest","neck1","neck2","head"];class Jc{constructor(e){this.species=e;const t=e.sections;this.count=t.length,this.ys=t.map(n=>n.y),this.zs=t.map(n=>n.z),this.as=t.map(n=>n.a*Ce),this.ws=t.map(n=>n.w),this.rds=t.map(n=>n.rd),this.rvs=t.map(n=>n.rv)}species;count;ys;zs;as;ws;rds;rvs;a=new v;b=new v;c=new v;get sMax(){return this.count-1}center(e,t){return t.set(0,bn(this.ys,e),bn(this.zs,e))}axis(e,t){const n=bn(this.as,e);return t.set(0,Math.sin(n),Math.cos(n))}point(e,t,n){const i=bn(this.as,e),a=Math.max(bn(this.ws,e),.004),r=Math.max(bn(this.rds,e),.004),o=Math.max(bn(this.rvs,e),.004),c=Math.cos(t),l=Math.sin(t),h=1+.06*Math.sin(t*2)**2,d=-c*(c>0?o:r)*h,u=bn(this.ys,e),f=bn(this.zs,e);n.set(l*a*h,u+Math.cos(i)*d,f-Math.sin(i)*d);const p=this.wingBulge(e,t);if(p>0){const b=Math.hypot(n.x,n.y-u,n.z-f)||1,g=1+p/b;n.set(n.x*g,u+(n.y-u)*g,f+(n.z-f)*g)}return n}surface(e,t,n){const a=Oe(e,0,this.sMax);this.point(a,t,n.p);const r=Math.max(a-.01,0),o=Math.min(a+.01,this.sMax);return this.point(o,t,this.a).sub(this.point(r,t,this.b)),this.point(a,t+.01,this.b).sub(this.point(a,t-.01,this.c)),n.n.crossVectors(this.b,this.a).normalize(),n.t.copy(this.a).multiplyScalar(-1),n.t.addScaledVector(n.n,-n.t.dot(n.n)).normalize(),n}wingHalfWidth(e){const[t,n,i]=this.species.wing.rest.width;return e<.35?ue(t,n,re(0,.35,e)):ue(n,i,re(.35,1,e))}wingHalfAngle(e,t){const n=(bn(this.ws,e)+(bn(this.rds,e)+bn(this.rvs,e))/2)/2;return this.wingHalfWidth(t)/Math.max(n,.03)}wingUV(e,t){const n=this.species.wing.rest,i=Math.PI*2;let a=(t%i+i)%i;a>Math.PI&&(a=i-a);const r=(n.from[0]-e)/(n.from[0]-n.to[0]),o=Oe(r,0,1),c=ue(n.from[1],n.to[1],o)*Ce;return{u:r,v:(a-c)/this.wingHalfAngle(e,o)}}wingAt(e,t,n){const i=this.species.wing.rest,a=ue(i.from[0],i.to[0],e),r=ue(i.from[1],i.to[1],Oe(e,0,1))*Ce+t*this.wingHalfAngle(Oe(a,0,this.sMax),Oe(e,0,1));return{s:a,ang:n>0?r:Math.PI*2-r}}wingBulge(e,t){const{u:n,v:i}=this.wingUV(e,t);if(n<=0||n>=1||Math.abs(i)>=1)return 0;const a=1-i*i;return this.species.wing.rest.height*re(0,.1,n)*(1-re(.8,1,n))*a*a}front=null;frontLength(e){if(!this.front){this.front=[0];for(let a=1;a<=this.sMax*20;a++)this.front.push(this.front[a-1]+this.point(a/20,0,this.a).distanceTo(this.point((a-1)/20,0,this.b)))}const n=Oe(e,0,this.sMax)*20,i=Math.min(Math.floor(n),this.front.length-2);return ue(this.front[i],this.front[i+1],n-i)}frontAt(e){this.frontLength(0);const t=this.front;let n=0,i=t.length-1;if(e<=0)return 0;if(e>=t[i])return this.sMax;for(;i-n>1;){const a=n+i>>1;t[a]<=e?n=a:i=a}return(n+(e-t[n])/Math.max(t[i]-t[n],1e-9))/20}weights(e){const t=this.species.spine;for(let n=0;n<Qa.length-1;n++){const i=Qa[n],a=Qa[n+1];if(e<=t[a]||n===Qa.length-2){const r=re(t[i],t[a],e);return[i,1-r,a,r]}}return["head",1,"head",0]}skin(e,t){const n=this.species.spine,i=.5+.5*Math.cos(t),a=this.weights(e),o=.6*(re(n.hips-.4,n.spine,e)*(1-re(n.chest+.2,n.neck1+.3,e)))*(.35+.65*i),[c,l]=this.species.throat,h=re(.25,.85,i)*re(c-.9,c,e),d=Oe((this.frontLength(e)-this.frontLength(c))/(this.frontLength(l)-this.frontLength(c)),0,1),u=new Map,f=(g,m)=>u.set(g,(u.get(g)??0)+m);f(a[0],a[1]*(1-o)*(1-h)),f(a[2],a[3]*(1-o)*(1-h)),f("sternum",o*(1-h*d*(2-d))),f("throat",(1-o)*h*(1-d)*(1-d)),f("gular",h*2*d*(1-d)),f("head",h*d*d);const p=[...u].sort((g,m)=>m[1]-g[1]).slice(0,4);for(;p.length<4;)p.push(["root",0]);const b=p.reduce((g,m)=>g+m[1],0);return{bones:p.map(g=>g[0]),weights:p.map(g=>g[1]/b)}}bodyCoord(e){return 1-Oe(e/this.sMax,0,1)}}const Zt=["L","R"],pn=s=>s==="L"?1:-1,Yx=s=>new v(s[0],s[1],s[2]),yo=new v,Jh=new v,er=new v,Jx=new Xe;function Hi(s,e,t=new pt){return er.copy(s).normalize(),yo.crossVectors(e,er).normalize(),Jh.crossVectors(er,yo),t.setFromRotationMatrix(Jx.makeBasis(yo,Jh,er))}const Ws=(s,e)=>new v(s.x*e,s.y,s.z);function au(s,e){const t=e.wing;if(!t.chord)return t.rest.cross[0];const n={p:new v,n:new v,t:new v},i=s.wingAt(.2,-.35,1);s.surface(i.s,i.ang,n);const a=n.p,r=e.tail.droop*Ce,o=new v(0,-Math.sin(r),-Math.cos(r)),c=new v(0,Math.cos(r),-Math.sin(r)),l=s.center(e.spine.tail,new v).addScaledVector(c,.03),h=e.tail.length[1],d=new v;let u=0,f=1.2;for(let p=0;p<40;p++){const b=(u+f)/2;d.copy(l).addScaledVector(o,h*b),d.x=t.rest.cross[1],d.distanceTo(a)<t.chord?u=b:f=b}return Math.max(.04,(u+f)/2)}function Zx(s){const e=new Jc(s),t={},n=[],i={};function a(D,L,R,U=new pt){const z=new Oc;z.name=D;const N={pos:new v,quat:new pt,worldPos:R.clone(),worldQuat:U.clone()};if(L){const B=i[L],k=B.worldQuat.clone().invert();N.pos.copy(R).sub(B.worldPos).applyQuaternion(k),N.quat.copy(k).multiply(U),t[L].add(z)}else N.pos.copy(R),N.quat.copy(U);return z.position.copy(N.pos),z.quaternion.copy(N.quat),t[D]=z,i[D]=N,n.push(z),z}const r=D=>e.center(D,new v),o=s.spine,c=a("root",null,new v);a("hips","root",r(o.hips)),a("spine","hips",r(o.spine)),a("chest","spine",r(o.chest)),a("neck1","chest",r(o.neck1)),a("neck2","neck1",r(o.neck2)),a("head","neck2",r(o.head)),a("throat","chest",r(o.head)),a("gular","chest",e.point((s.throat[0]+s.throat[1])/2,0,new v)),a("sternum","chest",e.point(o.spine+.4,0,new v));const l=r(e.sMax),h=e.axis(e.sMax,new v),d=Hi(h,new v(0,1,0));a("bill","head",l,d),a("jaw","head",l.clone().add(new v(0,-.012,-.04)),d);const u=new v(0,0,1).applyQuaternion(d),f=new v(0,1,0).applyQuaternion(d),p=s.bill.length,b=D=>l.clone().addScaledVector(u,D*p).addScaledVector(f,-.004-s.bill.droop*D*D);a("tongue.1","jaw",b(.06),d),a("tongue.2","tongue.1",b(.5),d),a("tongue.3","tongue.2",b(.7),d);const g={},m={p:new v,n:new v,t:new v};for(const D of Zt){const L=pn(D);e.surface(s.eye.s,s.eye.phi*Math.PI,m);const R=m.n.clone().multiplyScalar(.7).add(new v(.3,.02,.04)).normalize(),U=m.p.clone().addScaledVector(R,-s.eye.radius*s.eye.inset);R.x*=L,U.x*=L;const z=Hi(R,new v(0,1,0));g[D]={side:D,center:U,out:R,eye:a(`eye.${D}`,"head",U,z),lidUpper:a(`lidUpper.${D}`,"head",U,z),lidLower:a(`lidLower.${D}`,"head",U,z),nict:a(`nict.${D}`,"head",U,z)}}const x=s.wing,E={};{const D=Yx(x.shoulder),L={p:new v,n:new v,t:new v},R=(fe,Ne,ke)=>{const $=e.wingAt(fe,Ne,1);return e.surface($.s,$.ang,L),L.p.clone().addScaledVector(L.n,-ke)},U=s.tail.droop*Ce,z=new v(0,-Math.sin(U),-Math.cos(U)),N=new v(0,Math.cos(U),-Math.sin(U)),B=r(o.tail).addScaledVector(z,s.tail.length[1]*au(e,s)).addScaledVector(N,.03);B.x=x.rest.cross[1];const k=R(.03,.4,.02),V=R(.2,-.35,.014),X=L.n.clone(),Y=B.clone().sub(V).normalize();X.addScaledVector(Y,-X.dot(Y)).normalize();const de=new v().crossVectors(X,Y),W=e.axis(o.spine,new v).multiplyScalar(-1),J=new v(0,-W.z,W.y);J.z>0&&J.multiplyScalar(-1);const te=new v(1,0,0),ce=(fe,Ne,ke)=>fe.clone().applyAxisAngle(Ne,ke),ee=[];ee.push({name:"shoulder",parent:"chest",pos:D,dir:k.clone().sub(D),n:X,sDir:te.clone().multiplyScalar(.85).addScaledVector(W,.5)}),ee.push({name:"forearm",parent:"shoulder",pos:k,dir:V.clone().sub(k),n:X,sDir:te.clone().multiplyScalar(.9).addScaledVector(W,-.35)}),ee.push({name:"hand",parent:"forearm",pos:V,dir:Y,n:X,sDir:te.clone()});const ye=x.primaries;for(let fe=0;fe<ye;fe++){const Ne=fe/(ye-1),ke=V.clone().addScaledVector(Y,x.hand*(fe+.4)/ye).addScaledVector(de,(1-Ne)*.04).addScaledVector(X,(1-Ne)*.004),$=B.clone().addScaledVector(de,(1-Ne)*.05).sub(ke).normalize();ee.push({name:`primary#${fe+1}`,parent:"hand",pos:ke,dir:$,n:X,sDir:ce(te,J,ue(58,-4,Math.pow(Ne,.62))*Ce)})}const _e=x.secondaries;for(let fe=0;fe<_e;fe++){const Ne=fe/(_e-1),ke=V.clone().lerp(k,(fe+.7)/(_e+.4)).addScaledVector(de,.03+Ne*.015);ee.push({name:`secondary#${fe+1}`,parent:"forearm",pos:ke,dir:ce(Y,X,ue(7,16,Ne)*Ce),n:X,sDir:ce(te,J,ue(82,97,Ne)*Ce)})}for(const fe of Zt){const Ne=pn(fe),ke=be=>be.includes("#")?be.replace("#",`.${fe}.`):`${be}.${fe}`,$={side:fe,bones:[],folded:[],spread:[],primaries:[],secondaries:[]},Le={chest:new pt};for(const be of ee){const xe=ke(be.name),ie=be.parent==="chest"?"chest":ke(be.parent),He=Hi(Ws(be.dir,Ne),Ws(be.n,Ne)),We=a(xe,ie,Ws(be.pos,Ne),He),ot=Hi(Ws(be.sDir,Ne),Ws(J,Ne));Le[xe]=ot,$.bones.push(We),$.folded.push(i[xe].quat.clone()),$.spread.push(Le[ie].clone().invert().multiply(ot)),be.name.startsWith("primary")&&$.primaries.push(We),be.name.startsWith("secondary")&&$.secondaries.push(We)}E[fe]=$}}const y=s.tail,S=[];{const D=y.droop*Ce,L=new v(0,-Math.sin(D),-Math.cos(D)),R=new v(0,Math.cos(D),-Math.sin(D)),U=Hi(L,R),z=r(o.tail);a("tail","hips",z,U);const N=new v(1,0,0).applyQuaternion(U);for(const B of Zt)for(let k=0;k<y.rectrices;k++){const V=(k+.5)*(B==="L"?-1:1),X=Math.max(.004,.035*y.width),Y=z.clone().addScaledVector(N,V*.006).addScaledVector(R,-k*X-(B==="L"?.002:0)).addScaledVector(L,.02),de=U.clone().multiply(new pt().setFromAxisAngle(new v(0,1,0),V*y.restFan*Ce)).multiply(new pt().setFromAxisAngle(new v(0,0,1),-Math.sign(V)*Math.min(k,3)*7*Ce));S.push({bone:a(`rectrix.${B}.${k+1}`,"tail",Y,de),k:V})}}const w=s.legs,_={},M={};let F=.1;for(const D of Zt){const L=pn(D),R=new v(w.spread*L,0,0);a(`foot.${D}`,"root",R);const U=R.clone().add(new v(0,.014,-.012)),z=new v(w.hip[0]*L,w.hip[1],w.hip[2]);M[D]=U,_[D]=z.clone().sub(i.hips.worldPos),F=z.distanceTo(U),a(`tarsus.${D}`,`foot.${D}`,U,Hi(z.clone().sub(U),new v(1,0,0)));for(let N=0;N<4;N++)a(`toe.${D}.${N+1}`,`foot.${D}`,R)}c.updateMatrixWorld(!0);const P=new Rr(n),I=new Map(n.map((D,L)=>[D.name,L]));return{species:s,loft:e,rootBone:c,bones:t,list:n,rest:i,skeleton:P,index:D=>{const L=I.get(D);if(L===void 0)throw new Error(`no bone ${D}`);return L},wings:E,rectrices:S,eyes:g,hipSocket:_,ankle:M,tarsusLength:F}}const $x=0,Qx=1,ev=2,Zc=3,tv=4,nv=2,iv=3,Zh=4,$h=5;class Sc{pos=[];nor=[];uv=[];root=[];hinge=[];data=[];iriN=[];cBase=[];cTip=[];cIri=[];cIri2=[];si=[];sw=[];idx=[];S=new v;H=new v;P=new v;Nv=new v;In=new v;add(e){const{cols:t,rows:n}=e,i=this.S.crossVectors(e.normal,e.dir).normalize(),a=this.H.crossVectors(e.dir,e.normal).normalize(),r=this.pos.length/3,o=e.width/2;for(let c=0;c<n;c++){const l=c===n-1,h=e.scallop?c/(n-1):n===4?[0,.5,.82,.965][c]:Math.pow(c/(n-1),.9),d=ue(1.25,2.1,e.round),u=Oe((h-.5)/.5,0,1),f=Math.pow(Math.max(1-Math.pow(u,d),0),1/d),p=e.scallop?1:n===4?ue(.5,1,re(0,.5,h))*f:ue(.4,1,re(0,e.widen??.12,h))*(l?.42:Math.pow(Math.max(1-Math.pow(Oe((h-.8)/.2,0,1),2.2),0),.45));for(let b=0;b<t;b++){const g=t===1?0:b/(t-1)*2-1,m=g<0?1-e.asym:1+e.asym;let x=g*o*p*m;const E=l&&!e.scallop?h+(1-h)*(1-g*g):h;let y=E*e.length;if(e.scallop){const _=Oe((h-.5)/.5,0,1),M=g*Math.PI/2;x=ue(g*o*ue(.72,1,Math.min(h/.5,1)),Math.sin(M)*o,_),y=ue(Math.min(h,.5)*e.length,.5*e.length+Math.cos(M)*.5*e.length,_)}const S=e.cup*o*(g*p)*(g*p)+e.curl*e.length*E*E;this.P.copy(e.root).addScaledVector(i,x).addScaledVector(e.dir,y).addScaledVector(e.normal,-S),this.Nv.copy(e.normal).addScaledVector(i,2*e.cup*g*p).addScaledVector(e.dir,2*e.curl*E),this.In.copy(e.iriNormal).addScaledVector(i,.3*e.cup*g*p).addScaledVector(e.dir,.1*(E-.6)).normalize(),e.skinNormal&&this.Nv.normalize().lerp(e.skinNormal,ue(.45,.8,Math.min(e.loose*2,1))),this.Nv.normalize(),this.pos.push(this.P.x,this.P.y,this.P.z),this.nor.push(this.Nv.x,this.Nv.y,this.Nv.z),e.scallop?this.uv.push(x/o,y/e.length):this.uv.push(g,E),this.root.push(e.root.x,e.root.y,e.root.z),this.hinge.push(a.x,a.y,a.z),this.data.push(e.rand,e.coord,e.gain,e.channel),this.iriN.push(this.In.x,this.In.y,this.In.z),this.cBase.push(e.base.r,e.base.g,e.base.b,e.iriStrength/4),this.cTip.push(e.tip.r,e.tip.g,e.tip.b,e.loose),this.cIri.push(e.iri.r,e.iri.g,e.iri.b,e.iriPower/32),this.cIri2.push(e.iri2.r,e.iri2.g,e.iri2.b,e.cover);const w=e.skinAt?e.skinAt(this.P):e;this.si.push(...w.bones),this.sw.push(...w.weights)}}for(let c=0;c<n-1;c++)for(let l=0;l<t-1;l++){const h=r+c*t+l,d=h+t;this.idx.push(h,d,h+1,d,d+1,h+1)}}build(){const e=new St,t=(a,r)=>new It(new Float32Array(a),r),n=(a,r)=>{const o=new Uint16Array(a.length);for(let c=0;c<a.length;c++)o[c]=Math.round(Oe(a[c],0,1)*65535);return new It(o,r,!0)},i=(a,r)=>{const o=new Int16Array(a.length);for(let c=0;c<a.length;c++)o[c]=Math.round(Oe(a[c],-1,1)*32767);return new It(o,r,!0)};return e.setAttribute("position",t(this.pos,3)),e.setAttribute("normal",i(this.nor,3)),e.setAttribute("uv",t(this.uv,2)),e.setAttribute("aRoot",t(this.root,3)),e.setAttribute("aHinge",i(this.hinge,3)),e.setAttribute("aData",t(this.data,4)),e.setAttribute("aIriN",i(this.iriN,3)),e.setAttribute("aBase",n(this.cBase,4)),e.setAttribute("aTip",n(this.cTip,4)),e.setAttribute("aIri",n(this.cIri,4)),e.setAttribute("aIri2",n(this.cIri2,4)),e.setAttribute("skinIndex",new It(new Uint16Array(this.si),4)),e.setAttribute("skinWeight",n(this.sw,4)),e.setIndex(new It(new Uint32Array(this.idx),1)),e.boundingSphere=new yn(new v(0,.4,-.1),2.5),e.boundingBox=new Kn(new v(-2,-2,-2),new v(2,3,2)),e}}function sv(s,e,t,n){if(s.kind==="band"){const f=e+(s.soft??0)*(n*2-1);return f>=s.s[0]&&f<=s.s[1]&&t>=s.phi[0]&&t<=s.phi[1]}if(s.kind==="blob"){const f=(e-s.at[0])/s.r[0],p=(t-s.at[1])/s.r[1],b=s.pow??2;return Math.pow(Math.abs(f),b)+Math.pow(Math.abs(p),b)<=1+(s.soft??0)*(n*2-1)}const i=s.from[0]/s.r[0],a=s.from[1]/s.r[1],r=s.to[0]/s.r[0],o=s.to[1]/s.r[1],c=e/s.r[0],l=t/s.r[1],h=r-i,d=o-a,u=Oe(((c-i)*h+(l-a)*d)/(h*h+d*d),0,1);return Math.hypot(c-i-h*u,l-a-d*u)<=1}function ii(s,e,t,n=.5){let i="body";for(const a of s.tracts)sv(a.region,e,t,n)&&(i=a.look);return s.looks[i]}const nn=s=>new pe(s),Yi=(s,e)=>e.map(t=>s.index(t)),av=new v;function $c(s,e,t,n){return s.copy(e),t.iriAim&&s.lerp(av.set(t.iriAim[0],t.iriAim[1],t.iriAim[2]).normalize(),t.iriAlign).normalize(),n?(s.x+=(n()-.5)*t.jitter,s.y+=(n()-.5)*t.jitter,s.z+=(n()-.5)*t.jitter,s.normalize()):s}function ru(s,e,t){const{u:n,v:i}=s.wingUV(e,t);if(n<.08||n>1.05)return 1;const a=re(.08,.3,n)*(1-re(.9,1.05,n)),r=re(-2,-1.05,i)*(1-re(-.75,-.55,i)),o=re(1.6,1,i)*(1-re(.7,.9,-i+1.6));return 1-a*Math.max(.62*r,i>.8?.25*o:0)}function ou(s,e,t,n){const i=s.shading;let a=1+i.patch*(.6*Ot(t*2.7,5)+.6*Ot(n*8+t*1.3,6)),r=0;const o=e.fine?1:ue(.12,1.7,re(-.25,.45,.7*Ot(t*6.1+n*9,41)+.6*Ot(n*21-t*3.3,42)));if(!e.fine){r=e.iriStrength>0&&t<6?re(.05,.6,.7*Ot(t*3.4+n*5,31)+.5*Ot(n*13-t*2,32))*i.goldAmount:0;const c=1-re(4.6,5.6,t);a*=ue(1,i.flank,c*re(.2,.55,n)*(1-re(.72,.95,n))),a*=ue(1,i.under,re(2.6,.5,t)*(1-re(.4,.7,n)))}return{shade:a,gold:r,glit:o}}function Es(s,e,t=1,n=0,i=6972448,a=1){const r=(.8+e()*.4)*t,o=nn(s.iri).lerp(nn(s.iriGraze),e()*e()*.45);return{base:nn(s.base).multiplyScalar(r),tip:nn(s.tip).lerp(nn(i),n*e()).multiplyScalar(r),iri:o,iri2:nn(s.iriGraze),iriStrength:s.iriStrength*ue(.75+e()*.5,2.6*Math.pow(e(),2.5),s.sparkle??0)*(1+n*1.5)*a,iriPower:s.iriPower*(.8+e()*.5),loose:s.loose??0,round:s.round,cup:s.cup,channel:s.channel==="gorget"?Qx:s.channel==="crown"?ev:$x}}const tr=new v,Mo=new v,hs=new v;function cu(s,e,t,n){const{loft:i}=s;if(e<i.species.throat[0]-1.1||Math.cos(t)<-.5)return;const a=Math.min(e+.02,i.sMax);i.point(a,t,tr).sub(i.point(e-.02,t,hs)).multiplyScalar(1/(a-e+.02)),i.point(e,t+.02,Mo).sub(i.point(e,t-.02,hs)).multiplyScalar(1/.04);const r=tr.clone().multiplyScalar(1/tr.lengthSq()),o=Mo.clone().multiplyScalar(1/Mo.lengthSq()),c=n.clone(),l=tr.clone().normalize(),h=i.frontLength(e);return d=>{hs.copy(d).sub(c);const u=hs.dot(r),f=i.frontAt(h+hs.dot(l))-e,p=i.skin(Oe(e+(Math.abs(f)<Math.abs(u)?f:u),0,i.sMax),t+hs.dot(o));return{bones:Yi(s,p.bones),weights:p.weights}}}function rv(s,e,t){const{loft:n,species:i}=e,a={p:new v,n:new v,t:new v},r={p:new v,n:new v,t:new v},o=new v,c=new v,l=new v,h=new v,d=new v,u=new v,f=new v,p=i.eye.radius,b=Math.PI*2,g=L=>{const R=(L%b+b)%b;return R<=Math.PI?R/Math.PI:(b-R)/Math.PI},m=(L,R,U=.5)=>{const z=ii(i,L,R,U);let N=z.width;if(!z.fine){const B=ii(i,L-.45,R),k=ii(i,L+.45,R);N=(N*2+(B.fine?N:B.width)+(k.fine?N:k.width))/4}return N*=ue(1,i.faceTaper??1,re(n.sMax-1.8,n.sMax-.15,L)),N*=i.plumage?.density??1,{look:z,width:N}},x=240,E=40,y=new Float32Array(x).fill(1),S=new Uint16Array(x),w=[],_=new Float32Array(E+1),M=.001;let F=n.sMax-.015;for(;F>.03;){let L=0;for(let U=0;U<=E;U++){const z=U/E*b;_[U]=n.point(Math.min(F+.01,n.sMax),z,c).distanceTo(n.point(F-.01,z,l))/.02,L=Math.max(L,_[U])}const R=M/L;for(let U=0;U<x;U++){const z=U/x*E,N=Math.min(Math.floor(z),E-1),{look:B,width:k}=m(F,g(U/x*b)),V=k*B.aspect*B.rowStep;if(y[U]+=ue(_[N],_[N+1],z-N)*R,y[U]>=V){y[U]=Math.min(y[U]-V,V*.5);const X=S[U]++;(w[X]??=new Float32Array(x).fill(NaN))[U]=F}}F-=R}const P=new v,I=new v,D=(L,R)=>{n.surface(L,R,a);for(const Ze of Zt)if(a.p.distanceTo(e.eyes[Ze].center)<p*1.02)return;const U=n.wingUV(L,R),z=U.u>.04&&U.u<.97&&Math.abs(U.v)<.9,N=z&&U.v<-.3&&U.u<.5&&.5+.5*Ot(L*53+R*91,77)<.75*re(-.3,-.75,U.v)*(1-re(.32,.5,U.u));if(z&&!N)return;const B=g(R),k=m(L+(t()-.5)*.06,Oe(B+(t()-.5)*.012,0,1),t()),V=k.width,X=Math.pow(1-re(7.1,9,L),1.4),Y=i.scruff??1,de=re(.56,.86,B)*X*re(6.25,7,L)*Y,W=re(.5,.8,B)*re(8.5,9.2,L),J=N?i.looks.flank:k.look===i.looks.crown&&L<8.5&&t()<.5*re(.7,.9,B)?i.looks.head:k.look,te=J.fine?0:de,ce=J.fine||J===i.looks.stripe?0:re(6,6.7,L)*re(.35,.6,B)*(.35+.65*X)*Y,ee=Ot(L*11+B*37,51);if(ce>0&&ee>.45&&t()<.4*ce||J===i.looks.gorget)return;const ye=i.looks.gorget,_e=L>4.6&&L<8.2&&B<.5?ii(i,L,Math.max(B-.035,0))===ye?2:ii(i,L,Math.max(B-.08,0))===ye?1:0:0;if(_e===2)return;const fe=_e===0&&L>4.2&&L<5.6&&B<.4&&ii(i,L+.5,B)===ye,Ne=i.shading,ke=ou(i,J,L,B),{gold:$,glit:Le}=ke,be=ke.shade*ru(n,L,R),xe=J.loose??0,ie=Ot(L*4.3+B*17,21),He=Ot(L*3.1-B*23,22),We=1+(t()-.5)*ue(.26,.65,xe),ot=V*J.aspect*We*(1+te*(.3+1.3*t()*t())+ce*(t()-.5)*.5),nt=t()<.035*xe+.14*te?1:0;let _t=(J.tilt+(t()-.5)*ue(6,17,xe)+He*7*xe+nt*(8+t()*10))*Ce;const H=(t()-.5)*ue(.17,.72,xe)+ie*.4*xe+nt*(t()-.5)*.9+((t()-.5)*.9+ee*.45)*ce,At=((t()-.5)*.7+He*.3)*xe+((t()-.5)*1.1+ee*.5)*ce;if((_e||fe)&&(_t*=.35),N)_t+=9*Ce;else if(U.u>0&&U.u<1&&Math.abs(U.v)<1.7&&!nt){const Ze=1-re(.9,1.7,Math.abs(U.v));_t*=1-.6*Ze}let ft=J.lift+te*.9;_t=_t*(1-.55*W)+te*(14+30*t()*t()+9*ee)*Ce;const xt=n.point(Math.min(L+.01,n.sMax),R,c).distanceTo(n.point(Math.max(L-.01,0),R,l))/.02;f.copy(a.p),o.copy(a.n),n.surface(Math.max(L-ot*.85/Math.max(xt,.02),0),R,r),h.copy(r.p).addScaledVector(r.n,ot*Math.sin(_t)).sub(f),h.lengthSq()<1e-8&&h.copy(a.t),h.normalize(),d.copy(o).add(r.n).addScaledVector(h,-o.dot(h)-r.n.dot(h)).normalize(),h.applyAxisAngle(d,H),d.applyAxisAngle(h,At),$c(u,d,J,t);const le=n.skin(L,R);s.add({...Es(J,t,be,$,Ne.gold,Le),root:f,dir:h,normal:d,skinNormal:o,iriNormal:u,width:V*We,length:ot,cols:J.fine?5:3,rows:J.fine?4:3,curl:ue(.1,.02+t()*.22,xe),asym:0,bones:Yi(e,le.bones),weights:le.weights,skinAt:cu(e,L,R,f),rand:t(),coord:n.bodyCoord(L)*.8,gain:ft,cover:Oe(1-J.rowStep,.1,.9)})};for(let L=0;L<w.length;L++){const R=w[L];for(const U of[1,-1]){let z=L&1?.5:U>0?1:0,N=!1;for(let B=0;B<x/2;B++){const k=(U*B%x+x)%x,V=(U*(B+1)%x+x)%x,X=R[k],Y=R[V];if(Number.isNaN(X)||Number.isNaN(Y)){N=!0;continue}N&&(z=t(),N=!1);const de=U*B*b/x,W=U*(B+1)*b/x;n.point(X,de,P),n.point(Y,W,I);const{look:J,width:te}=m((X+Y)/2,g((de+W)/2)),ce=P.distanceTo(I)/(te*(J.spacing??.6));for(;z+ce>=1;){const ee=(1-z)/ce,ye=(t()-.5)*.25*te*J.aspect*J.rowStep/.11,_e=ue(.12,.5,J.loose??0)*(J.fine?1:1+1.8*re(6,6.7,(X+Y)/2));D(Oe(ue(X,Y,ee)+ye*(1+2*(J.loose??0)),.02,n.sMax),ue(de,W,ee)+(t()-.5)*_e*te/.15),z-=1}z+=ce}}}}function ov(s,e,t){const{loft:n,species:i}=e,a=i.looks.gorget;if(!a)return;const r={p:new v,n:new v,t:new v},o=[],c=new v,l=new v;let h=n.sMax;for(;h>4.3&&ii(i,h,0)!==a;)h-=.02;const d=Math.min(h+.5,n.sMax-.3);let u=0,f=1/0;const p=.02,b=.02,g=new Map;{let D=0;for(let L=0;;L++){const R=d-L*p;if(R<4.3)break;L>0&&(D+=n.point(R,0,c).distanceTo(n.point(R+p,0,l))),g.set(L,D)}D=0;for(let L=-1;;L--){const R=d-L*p;if(R>n.sMax-.05)break;D-=n.point(R,0,c).distanceTo(n.point(R-p,0,l)),g.set(L,D)}}for(const[D,L]of g){const R=d-D*p;let U=0;for(let z=0;z*b<=1.3;z++){const N=z*b;if(z>0&&(U+=n.point(R,N,c).distanceTo(n.point(R,N-b,l))),ii(i,R,N/Math.PI)===a){for(const B of z===0?[1]:[1,-1])o.push({s:R,a:N*B,x:U*B,y:L});u=Math.max(u,Math.hypot(U,L)),f=Math.min(f,Math.hypot(U,L))}}}if(!o.length)return;const m=(D,L)=>{let R=o[0],U=1/0;for(const z of o){const N=(z.x-D)*(z.x-D)+(z.y-L)*(z.y-L);N<U&&(U=N,R=z)}return{q:R,miss:Math.sqrt(U)}},x=new v,E=new v,y=new v,S=new v,w=new v,_=new pe(3814655),M=new pe(14036168),F=a.spacing??.8;let P=Math.max(f,a.width*.3),I=0;for(;P<=u+a.width*.3;){const D=Oe((P-f)/(u-f),0,1),L=a.width*ue(.6,1.3,D),R=L*a.aspect,U=Math.max(1,Math.round(Math.PI*2*P/(L*F)));for(let z=0;z<U;z++){const N=(z+(I%2?.5:0))/U*Math.PI*2-Math.PI+(t()-.5)*.12*(L/Math.max(P,L)),{q:B,miss:k}=m(P*Math.sin(N),P*Math.cos(N));if(k>.03)continue;const V=m(P*Math.sin(N),P*Math.cos(N)-R*.7).miss>.02;n.surface(B.s,B.a,r);const X=Math.sign(N)*Math.min(Math.abs(N)*.5,.6)+(t()-.5)*.14,Y=(a.tilt+(t()-.5)*3)*Ce;E.copy(r.p),x.crossVectors(r.n,r.t),x.x<0&&x.multiplyScalar(-1),y.copy(r.t).multiplyScalar(Math.cos(X)).addScaledVector(x,Math.sin(X)).normalize(),S.copy(r.n).multiplyScalar(Math.cos(Y)).addScaledVector(y,-Math.sin(Y)),y.multiplyScalar(Math.cos(Y)).addScaledVector(r.n,Math.sin(Y)),$c(w,S,a,t);const de=Es(a,t),W=Oe(D+(t()-.5)*.16,0,1);W<.45?de.iri.lerp(_,(1-W/.45)*.85):de.iri.lerp(M,(W-.45)/.55*.8);const J=cu(e,B.s,B.a,E),te=n.skin(B.s,B.a),ce=.94+t()*.12;s.add({...de,root:E,dir:y,normal:S,skinNormal:r.n,iriNormal:w,width:L*ce,length:R*ce,cols:9,rows:6,scallop:!0,cup:.16,curl:.05,asym:0,bones:Yi(e,te.bones),weights:te.weights,skinAt:J,rand:t(),coord:n.bodyCoord(B.s)*.8,gain:a.lift,cover:V?.25:Oe(1-a.rowStep,.1,.9)})}P+=L*a.aspect*a.rowStep,I++}}function cv(s,e,t,n){const i=e.species.wing,a=e.wings[t],r=pn(t),o=nn(i.color),c=nn(i.sheen),l=new v,h=new v,d=new v,u=(M,F,P,I)=>{const D=e.rest[M.name];new Xe().makeRotationFromQuaternion(D.worldQuat).extractBasis(l,h,d),d.applyAxisAngle(h,(n()-.5)*.02),h.applyAxisAngle(d,(n()-.5)*.12);const L=e.index(M.name),R=.7+n()*.6;s.add({root:D.worldPos,dir:d,normal:h,skinNormal:null,iriNormal:h,width:P,length:F,cols:3,rows:9,round:.75,cup:.12,curl:.012,asym:I*r,base:o.clone().multiplyScalar(R),tip:o.clone().multiplyScalar(R*.8),iri:c,iri2:c,iriStrength:.22,iriPower:2.5,loose:0,widen:.3,bones:[L,0,0,0],weights:[1,0,0,0],rand:n(),coord:r>0?Zh:$h,gain:0,cover:r>0?.2:.8,channel:Zc})};a.primaries.forEach((M,F)=>{const P=F/(a.primaries.length-1);u(M,ue(i.primaryLen[0],i.primaryLen[1],Math.pow(P,.75)),i.primaryWidth*ue(1.15,.8,P),ue(.2,.5,P))}),a.secondaries.forEach((M,F)=>{const P=F/(a.secondaries.length-1);u(M,ue(i.secondaryLen[0],i.secondaryLen[1],P),i.secondaryWidth,.15)});const f=e.species.looks.covert,p=e.rest[`hand.${t}`],b=e.rest[`forearm.${t}`];new Xe().makeRotationFromQuaternion(p.worldQuat).extractBasis(l,h,d);const g=l.clone().multiplyScalar(r),m=h.clone(),x=d.clone(),E=p.worldPos.clone().addScaledVector(x,i.hand),y=[{off:-.02,len:.075,w:.034,lift:.006,n:15},{off:0,len:.1,w:.04,lift:.008,n:14},{off:.024,len:.13,w:.046,lift:.01,n:14},{off:.05,len:.17,w:.05,lift:.012,n:13}],S=new v,w=new v,_=new v;for(const M of y)for(let F=0;F<M.n;F++){const P=ue(-.55,.9,(F+n()*.7)/M.n);P<0?S.copy(p.worldPos).lerp(b.worldPos,-P/.5):S.copy(p.worldPos).lerp(E,P),S.addScaledVector(g,M.off+(n()-.5)*.016).addScaledVector(m,M.lift);const I=.06+n()*.08;w.copy(x).applyAxisAngle(m,r*(.1+n()*.3+(P<0?.25:0))),_.copy(m).multiplyScalar(Math.cos(I)).addScaledVector(w,-Math.sin(I)),w.multiplyScalar(Math.cos(I)).addScaledVector(m,Math.sin(I));const D=e.index(P<0?`forearm.${t}`:`hand.${t}`),L=.8+n()*.4;s.add({...Es(f,n,.8+.3*n()),root:S,dir:w,normal:_,skinNormal:m,iriNormal:_,width:M.w*L,length:M.len*L,cols:3,rows:4,curl:.04+n()*.1,asym:0,bones:[D,0,0,0],weights:[1,0,0,0],rand:n(),coord:r>0?Zh:$h,gain:0,cover:.55})}}function lv(s,e,t,n){const{loft:i,species:a}=e,r=a.wing,o=pn(t),c=o>0?nv:iv,l={p:new v,n:new v,t:new v},h={p:new v,n:new v,t:new v},d=(N,B,k)=>{const V=i.wingAt(N,B,o);return i.surface(Oe(V.s,.02,i.sMax),V.ang,k),V};d(0,0,l),d(1,0,h);const u=l.p.distanceTo(h.p),f=new v,p=new v,b=new v,g=nn(r.color),m=nn(r.sheen),x=a.looks.wingCovert,E=(N,B,k,V,X,Y)=>{const de=d(N,B,l);d(N+k/u,B+V,h),f.copy(l.p).addScaledVector(l.n,X),p.copy(h.p).addScaledVector(h.n,X+k*Math.sin(Y*Ce)).sub(f).normalize(),b.copy(l.n).add(h.n).addScaledVector(p,-l.n.dot(p)-h.n.dot(p)).normalize();const W=i.skin(Oe(de.s,.02,i.sMax),de.ang);return{bones:Yi(e,W.bones),weights:W.weights}},y=Math.pow(a.plumage?.density??1,.9),S=Math.round(7/y);for(let N=0;N<S;N++){const B=N/(S-1),k=ue(.03,.3,B*B*.4+B*.6),V=ue(.024,.05,B)*y,X=V*ue(2.2,3.4,B),Y=ue(r.rest.width[0],r.rest.width[1],re(0,.35,k)),de=Math.max(3,Math.round(2*Y/(V*.62)));for(let W=0;W<de;W++){const J=Oe(-.98+2*(W+(N%2?.5:0)+(n()-.5)*.3)/de,-1.02,1.02),te=.85+n()*.3,ce=E(k+(n()-.5)*.012,J,X*te,-J*.12+(n()-.5)*.1,.004+B*.004,7+n()*5),ee=Es(x,n,.8+.4*n()),ye=r.bar;ye&&B>=ye.rows[0]&&B<=ye.rows[1]&&J>=ye.v[0]&&J<=ye.v[1]&&(ee.base=nn(ye.base),ee.tip=nn(ye.tip),ee.iriStrength=0),s.add({...ee,root:f,dir:p,normal:b,skinNormal:l.n,iriNormal:b,width:V*te,length:X*te,cols:3,rows:4,curl:.05+n()*.08,asym:0,...ce,rand:n(),coord:c,gain:0,cover:Oe(1-x.rowStep,.1,.9)})}}for(let N=.42;N<.98;N+=.04*y)for(const B of[-.82,-.3,.3,.82]){const k=(.85+n()*.3)*y,V=E(N+(n()-.5)*.02,B+(n()-.5)*.2,.085*k,-B*.1,.002,4);s.add({...Es(x,n,.7+.3*n()),root:f,dir:p,normal:b,skinNormal:l.n,iriNormal:b,width:.05*k,length:.085*k,cols:3,rows:4,curl:.04,asym:0,...V,rand:n(),coord:c,gain:0,cover:.5})}const w=[];for(let N=0;N<=26;N++)for(let B=0;B<=14;B++)d(N/20,ue(-2.2,2.2,B/14),l),w.push({p:l.p.clone(),n:l.n.clone()});const _=new v,M=N=>{let B=w[0],k=1/0;for(const V of w){const X=V.p.distanceToSquared(N);X<k&&(k=X,B=V)}return _.copy(N).sub(B.p).dot(B.n)},F=a.tail,P=F.droop*Ce,I=new v(0,-Math.sin(P),-Math.cos(P)),D=new v(0,Math.cos(P),-Math.sin(P)),L=i.center(a.spine.tail,new v).addScaledVector(I,F.length[1]*au(i,a)).addScaledVector(D,.035);L.x=r.rest.cross[1]*o,o>0&&L.addScaledVector(D,.014);const R=new v,U=new v,z=[];for(let N=0;N<r.secondaries;N++){const B=N/(r.secondaries-1);z.push({u:ue(.2,.3,B),v:ue(.82,.3,B),w:.066,reach:1,to:null,len:ue(.19,.27,B),dv:-.3,asym:.15})}for(let N=0;N<r.primaries;N++){const B=N/(r.primaries-1);z.push({u:ue(.3,.42,B),v:ue(.25,-.8,B),w:ue(.068,.05,B),reach:ue(.52,1,Math.pow(B,.8)),to:L.clone().addScaledVector(D,(1-B)*.05).addScaledVector(I,-(1-B)*.02),len:0,dv:0,asym:ue(.2,.45,B)})}z.forEach((N,B)=>{const k=d(N.u,N.v,l),V=.016-B*7e-4;f.copy(l.p).addScaledVector(l.n,V),U.copy(l.n);let X=N.len;N.to?(R.copy(N.to),X=R.distanceTo(f)*N.reach):(d(N.u+X/u,N.v+N.dv,h),R.copy(h.p).addScaledVector(h.n,V),U.add(h.n).normalize());const Y=.035;for(let J=0;J<60;J++){p.copy(R).sub(f).normalize(),b.copy(U).addScaledVector(p,-U.dot(p)).normalize();let te=!0;for(const ce of[.25,.45,.65,.85,1])if(_.copy(f).addScaledVector(p,ce*X).addScaledVector(b,-Y*X*ce*ce),M(_.clone())<.005+.012*ce-B*3e-4){te=!1;break}if(te)break;R.addScaledVector(U,.005)}const de=i.skin(Oe(k.s,.02,i.sMax),k.ang),W=.75+n()*.5;s.add({root:f,dir:p,normal:b,skinNormal:null,iriNormal:b,width:N.w,length:X,cols:3,rows:9,round:.75,cup:.1,curl:Y,asym:N.asym*o,base:g.clone().multiplyScalar(W),tip:g.clone().multiplyScalar(W*.8),iri:m,iri2:m,iriStrength:.22,iriPower:2.5,loose:0,widen:.2,bones:Yi(e,de.bones),weights:de.weights,rand:n(),coord:c,gain:0,cover:o>0?.2:.8,channel:Zc})})}function hv(s,e,t){const n=e.species.tail,i=nn(n.color),a=nn(4609132),r=new v,o=new v,c=new v;for(const l of e.rectrices){const h=e.rest[l.bone.name];new Xe().makeRotationFromQuaternion(h.worldQuat).extractBasis(r,o,c);const d=(Math.abs(l.k)-.5)/Math.max(n.rectrices-1,1),u=.85+t()*.3,f=n.outer&&d>=n.outer.from?nn(n.outer.color):i;s.add({root:h.worldPos,dir:c,normal:o,skinNormal:null,iriNormal:o,width:n.width,length:ue(n.length[0],n.length[1],Math.pow(d,1.4)),cols:5,rows:14,round:1,cup:.06,curl:.01,asym:.12*Math.sign(l.k),base:f.clone().multiplyScalar(u),tip:f.clone().multiplyScalar(u*.8),iri:d<.1?nn(2058840):a,iri2:a,iriStrength:d<.1?.13:.2,iriPower:3,loose:0,widen:.45,bones:[e.index(l.bone.name),0,0,0],weights:[1,0,0,0],rand:t(),coord:1,gain:0,cover:l.k>0?.8:.2,channel:Zc})}}function dv(s,e=3,t=120,n=80){const{loft:i,species:a}=s,r=new Sc,o={p:new v,n:new v,t:new v},c=new v,l=new Float32Array(n+1),h=Array.from({length:n+1},()=>new v),d=new v,u=jn(a.seed+99),f=560,p=i.sMax-.12,b=[];for(let g=0;g<=t;g++){const m=p-g/t*(p-.05);for(let x=0;x<=n;x++){const E=x/n*Math.PI*2;i.surface(m,E,o),g>0&&(l[x]+=h[x].distanceTo(o.p)),h[x].copy(o.p),b.push({p:o.p.clone(),n:o.n.clone(),d:l[x],s:m,a:E})}}for(let g=0;g<e;g++){const m=e>1?g/(e-1):0,x=ue(.008,.03,m),E=r.pos.length/3;for(let y=0;y<b.length;y++){const S=b[y],w=y%(n+1),_=S.a<=Math.PI?S.a/Math.PI:(2*Math.PI-S.a)/Math.PI,M=ii(a,S.s,_),F=ou(a,M,S.s,_),{gold:P,glit:I}=F,D=F.shade*ru(i,S.s,S.a);let L=M.fuzz??Math.min(.55+(M.loose??0)*.6,1);for(const z of Zt)L*=re(a.eye.radius*1.25,a.eye.radius*2.1,S.p.distanceTo(s.eyes[z].center));L*=1-re(i.sMax-.7,i.sMax-.2,S.s);{const z=i.wingUV(S.s,S.a);z.u>.02&&z.u<.99&&(L*=re(.85,1.15,Math.abs(z.v)))}const R=Es(M,u,D,P,a.shading.gold,I);$c(d,S.n,M),c.copy(S.p).addScaledVector(S.n,x*(.5+.5*Math.min(L*2,1))*Oe(M.width/.03,.4,1));const U=i.skin(S.s,S.a);r.pos.push(c.x,c.y,c.z),r.nor.push(S.n.x,S.n.y,S.n.z),r.uv.push(w/n*f,S.d),r.root.push(c.x,c.y,c.z),r.hinge.push(1,0,0),r.data.push(m,i.bodyCoord(S.s)*.8,M.lift,tv),r.iriN.push(d.x,d.y,d.z),r.cBase.push(R.base.r,R.base.g,R.base.b,M.fine?0:M.iriStrength*I*(1+P)/4),r.cTip.push(R.tip.r,R.tip.g,R.tip.b,L),r.cIri.push(R.iri.r,R.iri.g,R.iri.b,M.iriPower/32),r.cIri2.push(R.iri2.r,R.iri2.g,R.iri2.b,m),r.si.push(...Yi(s,U.bones)),r.sw.push(...U.weights)}for(let y=0;y<t;y++)for(let S=0;S<n;S++){const w=E+y*(n+1)+S,_=w+n+1;r.idx.push(w,_,w+1,_,_+1,w+1)}}return r}function uv(s){const e=jn(s.species.seed),t=new Sc;rv(t,s,e),ov(t,s,e);const n=new Sc;for(const a of Zt)cv(n,s,a,e),lv(n,s,a,e);hv(n,s,e);const i=dv(s,s.species.plumage?.fuzzLayers??3);return{contour:t.build(),flight:n.build(),fuzz:i.build()}}function fv(s,e=64,t=36,n=.007){const i={p:new v,n:new v,t:new v},{loft:a}=s,r=[],o=[],c=[],l=[],h=new v;for(let u=0;u<=e;u++){const f=u/e*a.sMax;for(let p=0;p<=t;p++){const b=p/t*Math.PI*2,g=a.skin(f,b);a.surface(f,b,i),h.copy(i.p).addScaledVector(i.n,-n),r.push(h.x,h.y,h.z),o.push(...Yi(s,g.bones)),c.push(...g.weights)}}for(let u=0;u<e;u++)for(let f=0;f<t;f++){const p=(u+.5)/e*a.sMax;if(p>4.3&&p<9&&Math.cos((f+.5)/t*Math.PI*2)>-.25)continue;const b=u*(t+1)+f,g=b+t+1;l.push(b,b+1,g,g,b+1,g+1)}const d=new St;return d.setAttribute("position",new tt(r,3)),d.setAttribute("skinIndex",new Tr(o,4)),d.setAttribute("skinWeight",new tt(c,4)),d.setIndex(l),d.computeVertexNormals(),d}const lu=`
attribute vec3 aRoot;
attribute vec3 aHinge;
attribute vec4 aData; // rand, body coord, lift gain, channel
uniform float uFluff;
uniform float uLift[8];
uniform float uGorget;
uniform float uCrest;
uniform vec2 uWingSpread;
uniform vec2 uWingLift;
uniform vec4 uWingOut;
uniform vec3 uWingPivot;
uniform vec3 uWingSpan;
uniform vec3 uWingChord;
vec3 rotAxis(vec3 v, vec3 k, float c, float s) { return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
// the resting wing swung off the flank: twist about its length, then out about its chord
vec3 wingSwing(vec3 v, bool right) {
  vec2 a = right ? vec2(uWingOut.z, -uWingOut.w) : vec2(-uWingOut.x, uWingOut.y);
  vec3 m = vec3(right ? -1.0 : 1.0, 1.0, 1.0);
  v = rotAxis(v, uWingSpan * m, cos(a.y), sin(a.y));
  return rotAxis(v, uWingChord * m, cos(a.x), sin(a.x));
}`,hu=`
float fCoord = clamp(aData.y, 0.0, 1.0) * 7.0;
float fI = floor(min(fCoord, 6.0));
float fWave = mix(uLift[int(fI)], uLift[int(fI) + 1], fCoord - fI);
float fAng = aData.z * (uFluff + fWave) * (0.6 + 0.8 * aData.x);
fAng += (aData.w > 0.5 && aData.w < 1.5 ? uGorget : 0.0) + (aData.w > 1.5 && aData.w < 2.5 ? uCrest : 0.0);
// wings: ids 2/3 = the resting wing on the body (left/right), 4/5 = the real blades
bool fRest = aData.y > 1.5 && aData.y < 3.5;
bool fReal = aData.y > 3.5;
bool fRight = aData.y > 2.5 && aData.y < 3.5 || aData.y > 4.5;
float fSpread = fRight ? uWingSpread.y : uWingSpread.x;
float fUnfold = smoothstep(0.03, 0.35, fSpread);
// past fully spread the wing is beating too fast to see: the blades go, a blur fan stands in
float fBeat = 1.0 - smoothstep(1.2, 1.6, fSpread);
if (fRest) fAng += (fRight ? uWingLift.y : uWingLift.x) * (0.5 + aData.x);
float fC = cos(fAng), fS = sin(fAng);`,du=`
vec3 transformed = aData.w > 3.5 ? position + normal * max(fAng, -0.1) * 0.05 : aRoot + rotAxis(position - aRoot, aHinge, fC, fS);
// as the wing spreads the resting wing sinks into the body and the real blades grow out of it
if (fRest) {
  vec3 fPivot = vec3(fRight ? -uWingPivot.x : uWingPivot.x, uWingPivot.yz);
  transformed = fPivot + wingSwing(transformed - fPivot, fRight);
  transformed = mix(transformed, aRoot - normal * 0.03, fUnfold);
}
if (fReal) transformed = mix(aRoot, transformed, fUnfold * fBeat);
`;function pv(){const s={uFluff:{value:0},uLift:{value:new Float32Array(8)},uGorget:{value:0},uCrest:{value:0},uWingSpread:{value:new Je},uWingLift:{value:new Je},uWingOut:{value:new Et},uWingPivot:{value:new v},uWingSpan:{value:new v(0,0,-1)},uWingChord:{value:new v(0,1,0)},uFlash:{value:1},uGlint:{value:1},uPal:{value:[new $e,new $e,new $e,new $e]}},e=new cn({color:16777215,roughness:.6,metalness:0,side:Rt,alphaToCoverage:!0});return e.onBeforeCompile=t=>{Object.assign(t.uniforms,s),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
${lu}
attribute vec3 aIriN;
attribute vec4 aBase;
attribute vec4 aTip;
attribute vec4 aIri;
attribute vec4 aIri2;
uniform mat3 uPal[4];
varying vec2 vFUv;
varying vec3 vFData;
varying vec4 vBase;
varying vec4 vTip;
varying vec4 vIri;
varying vec4 vIri2;
varying vec3 vIriN;`).replace("#include <beginnormal_vertex>",`${hu}
vec3 objectNormal = rotAxis(normal, aHinge, fC, fS);
vec3 fIriN = rotAxis(aIriN, aHinge, fC, fS);
if (fRest) { objectNormal = wingSwing(objectNormal, fRight); fIriN = wingSwing(fIriN, fRight); }
vFUv = uv; vFData = vec3(aData.x, aData.w, fAng);
vBase = aBase; vTip = aTip; vIri = aIri; vIri2 = aIri2;
// the palette: per vertex, so it costs nothing in the fragment shader
if (aData.w > 0.5 && aData.w < 2.5) {
  mat3 m = aData.w < 1.5 ? uPal[0] : uPal[1];
  vIri.rgb = max(m * vIri.rgb, 0.0); vIri2.rgb = max(m * vIri2.rgb, 0.0);
  vBase.rgb = max(m * vBase.rgb, 0.0); vTip.rgb = max(m * vTip.rgb, 0.0);
}
else {
  vBase.rgb = max(uPal[2] * vBase.rgb, 0.0); vTip.rgb = max(uPal[2] * vTip.rgb, 0.0);
  vIri.rgb = max(uPal[3] * vIri.rgb, 0.0); vIri2.rgb = max(uPal[3] * vIri2.rgb, 0.0);
}`).replace("#include <skinnormal_vertex>",`#include <skinnormal_vertex>
#ifdef USE_SKINNING
  fIriN = (skinMatrix * vec4(fIriN, 0.0)).xyz;
#endif
vIriN = normalize(normalMatrix * fIriN);`).replace("#include <begin_vertex>",du),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
uniform float uFlash;
uniform float uGlint;
varying vec2 vFUv;
varying vec3 vFData;
varying vec4 vBase;
varying vec4 vTip;
varying vec4 vIri;
varying vec4 vIri2;
varying vec3 vIriN;
float fIriMask;
float fBarb;
float fEdge;
float fBarbRand;
float fBarbHue;
float fSoft;
float fTilt;
float fFuzz;`).replace("#include <color_fragment>",`#include <color_fragment>
{
  fFuzz = vFData.y > 3.5 ? 1.0 : 0.0;
  if (fFuzz > 0.5) {
    // hairs: thin tapered dashes in columns that run the way the feathers lie, two
    // sets of columns over each other so no grid shows
    float layer = vIri2.a;
    float density = vTip.a * mix(1.0, 0.55, layer);
    // hairs wander together in slow waves, so the coat has locks, not a comb pattern
    float sway = sin(vFUv.y * 11.0 + floor(vFUv.x * 0.07) * 2.1) * 1.3 + sin(vFUv.y * 4.3 + vFUv.x * 0.021) * 2.2;
    float alpha = 0.0, tone = 0.5, dash = 0.0, pick = 0.5;
    // the plushest tracts (belly, flanks, the velvet face): hairs nearly of one tone
    float plush = smoothstep(0.82, 1.0, vTip.a);
    for (int o = 0; o < 2; o++) {
      float fo = float(o);
      float cx = (vFUv.x + sway) * (1.0 + 0.63 * fo) + fo * 17.3 + layer * 5.7;
      float colId = floor(cx);
      float hc = fract(sin(colId * 12.9898 + fo * 4.1 + layer * 9.7) * 43758.5453);
      float len = mix(0.018, 0.045, hc);
      float sy = vFUv.y / len + hc * 13.0;
      float seg = floor(sy), fy = fract(sy);
      float hs = fract(sin((colId + seg * 57.0) * 78.233 + fo * 1.7) * 24634.6345);
      float fx = fract(cx) - 0.5 + (hs - 0.5) * 0.5 * fy + sin(vFUv.y * 70.0 + hc * 40.0) * 0.12;
      float w = 1.0 - smoothstep(0.14, 0.36, abs(fx));
      float taper = smoothstep(0.0, 0.12, fy) * (1.0 - smoothstep(0.5, 1.0, fy));
      float a = step(1.0 - density, hs) * w * taper;
      if (a > alpha) { alpha = a; tone = fract(hs * 7.31); dash = smoothstep(0.25, 0.5, fy) * (1.0 - smoothstep(0.5, 0.8, fy)) * w; pick = fract(hs * 3.17 + hc); }
    }
    // too far to resolve single hairs: their average
    float lodF = clamp(fwidth(vFUv.x) * 1.3, 0.0, 1.0);
    alpha = mix(alpha, density * 0.45, lodF);
    // seen edge-on a shell is a film, not hairs: let it go, the frayed feathers make the outline
    alpha *= smoothstep(0.34, 0.74, abs(dot(normalize(vNormal), normalize(vViewPosition))));
    diffuseColor.rgb = mix(vBase.rgb, vTip.rgb, 0.75) * mix(mix(0.55, 0.75, plush) + mix(0.9, 0.4, plush) * tone, mix(1.0, 0.95, plush), lodF);
    // break up the coverage steps with a little screen noise, or they show as dotted bands
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    diffuseColor.a = clamp(alpha + (ign - 0.5) * 0.3 * min(alpha * 3.0, 1.0), 0.0, 1.0);
    fBarb = 0.0; fEdge = 0.0; fSoft = 1.0; fTilt = 0.35;
    fBarbRand = mix(pick, 0.5, lodF);
    fBarbHue = mix(tone, 0.5, lodF);
    // glints are short dashes on some hairs, not tiles
    fIriMask = mix(step(0.62, pick) * dash * 2.6, 0.4, lodF);
  } else {
  float u = vFUv.x, v = vFUv.y, au = abs(vFUv.x);
  float rnd = vFData.x;
  bool flight = vFData.y > 2.5;
  bool scale = vFData.y > 0.5 && !flight; // gorget, crown: crisp closed vanes
  // gorget scales are scallops whose uv is their true shape: u across, v along, the free
  // edge a semicircle of radius 1 about (0, 0.5)
  bool scallop = scale && vFData.y < 1.5;
  float loose = flight ? 0.0 : vTip.a;
  // the plush underparts (belly, flanks, down): one soft surface, the feathers only just told apart
  float plush = scale ? 0.0 : smoothstep(0.62, 0.85, loose);
  fEdge = 0.0;
  fBarbRand = 0.5;
  // barbs, one per 2 PI of arg. On a blade they run diagonally off the shaft. On contour
  // feathers and scales they are a fan: fine parallel strands that splay from behind the
  // root, like the teeth of a comb or the ribs of a scallop, the outer ones running off
  // the side of the vane before the tip.
  float outline = mix(0.5, 1.0, smoothstep(0.0, 0.5, v)) * pow(max(1.0 - pow(clamp((v - 0.5) / 0.5, 0.0, 1.0), 1.9), 0.0), 0.53);
  float fanX = u * outline / (v + 0.4) * 1.4;
  // a scallop's ridges are its barbs: they fan out a little from the root, the whole comb
  // bends to one side, the spacing is uneven and every scale has its own count
  float sFan = u / (0.5 + 0.6 * v);
  sFan += (fract(rnd * 23.7) - 0.5) * 0.5 * v * v;
  sFan += 0.035 * sin(sFan * 9.0 + rnd * 40.0 + v * 2.5) + 0.018 * sin(sFan * 23.0 + rnd * 91.0 - v * 4.0);
  float arg = scallop ? sFan * mix(8.0, 12.5, fract(rnd * 57.3)) * 6.2832 + rnd * 6.28 : flight ? v * 520.0 - au * 38.0 + rnd * 6.28 : fanX * (scale ? 7.0 : mix(8.5, 6.5, loose)) * 6.2832 + rnd * 6.28;
  float fw = fwidth(arg);
  float lod = smoothstep(1.2, 3.0, fw); // 0 = barbs resolved, 1 = sub-pixel
  float id = floor(arg / 6.2832 + 0.5);
  // a thin bright strand with a dark gap either side
  float h = fract(sin(id * 12.9898 + rnd * 78.233) * 43758.5453);
  float h2 = fract(sin(id * 39.3468 + rnd * 11.135) * 24634.6345);
  // on a scallop the barbs are broad with a thin groove between, each a little wider or narrower
  float strand = scallop ? smoothstep(0.03 + 0.14 * h, 0.3 + 0.3 * h, 0.5 + 0.5 * cos(arg)) : smoothstep(0.3, 0.78, 0.5 + 0.5 * cos(arg));
  float ridge = 0.5 + 0.5 * cos(arg); // 1 on the barb, 0 in the gap between two
  fBarb = (ridge * 2.0 - 1.0) * (1.0 - lod);
  fBarbRand = mix(h2, 0.5, lod);
  float shaft = 1.0 - smoothstep(0.0, flight ? 0.07 : 0.09, au);
  vec3 pig = mix(vBase.rgb, vTip.rgb, flight ? 0.5 : mix(smoothstep(0.3, 1.0, v), 0.62 + 0.3 * v, plush));
  // overlap shadow at the root, where the next feather up covers this one
  // (a lifted feather shows more of itself)
  float cover = vIri2.a * (1.0 - clamp(vFData.z * 1.6, 0.0, 0.8));
  float bare = smoothstep(cover - 0.3, cover + 0.12, v + 0.1 * (1.0 - au));
  float occ = flight ? mix(0.5, 1.0, smoothstep(0.0, 0.25, v)) : mix(scale ? 0.42 : mix(0.86, 0.97, plush), 1.0, bare);
  float edge = scallop ? (v > 0.5 ? length(vec2(u, (v - 0.5) * 2.0)) : au * 0.85) : max(au, (v - 0.55) / 0.45);
  // scales carry a paler fringe on the free edge; soft feathers just vary barb by barb
  float rim = scale ? -smoothstep(0.8, 1.0, edge) * 0.45 : 0.0;
  pig *= occ * (1.0 + (flight ? 0.26 : scale ? 0.35 : 0.0) * fBarb) * (1.0 + rim);
  // soft feathers: the strands carry the colour, between them it is nearly dark
  // (plush feathers: hardly darker between the strands, so no row of them casts a line)
  if (!flight && !scale) pig *= mix(mix(mix(0.5, 0.8, plush), mix(1.2, 1.06, plush), strand), 0.9, lod) * (0.92 + 0.16 * mix(h, 0.5, lod));
  fBarbHue = flight || scale ? 0.5 : mix(0.55 * fract(rnd * 5.31) + 0.45 * fract(h2 * 3.7 + h), 0.5, lod * 0.6);
  if (!flight && !scale) {
    // per feather, subtle: a touch warmer or cooler, lighter or darker,
    // and now and then a worn pale tip
    float r1 = fract(rnd * 17.13);
    float r2 = fract(rnd * 41.71);
    pig *= mix(vec3(1.05, 0.98, 0.93), vec3(0.95, 0.98, 1.06), r1);
    pig *= mix(0.94 + 0.12 * r2, 0.86 + 0.06 * r2, plush);
    pig *= 1.0 + 0.2 * step(0.95, fract(rnd * 7.73)) * smoothstep(0.6, 1.0, v);
  }
  if (flight) {
    // blades lie in a stack: each shows a strip along one edge. Shade across that strip
    // (dark where the neighbour sits on it, a paler line on the free edge) so the stack
    // reads as separate feathers. Seen from underneath the other edge is the free one.
    float lead = u * sign(vIri2.a - 0.5) * (gl_FrontFacing ? 1.0 : -1.0);
    float strip = smoothstep(-0.5, 1.0, lead);
    // each feather its own tone, a touch warmer or cooler than the next
    pig *= mix(vec3(1.12, 0.96, 0.9), vec3(0.9, 0.96, 1.12), rnd);
    pig *= mix(0.42, 1.25, strip * strip);
    // rachis: a pale quill line, fading out toward the tip, with a dark groove beside it
    float quill = 1.0 - smoothstep(0.012, 0.05, au);
    float groove = smoothstep(0.03, 0.07, au) * (1.0 - smoothstep(0.07, 0.16, au));
    pig *= 1.0 - 0.3 * groove;
    pig = mix(pig, vBase.rgb * 2.6 + 0.004, quill * (1.0 - smoothstep(0.55, 0.95, v)) * 0.85);
    // paler worn edge
    pig += vBase.rgb * 1.2 * smoothstep(0.8, 0.98, lead) + vBase.rgb * 0.5 * smoothstep(0.88, 1.0, au);
    // the underside of a blade is paler and catches the light from below
    if (!gl_FrontFacing) pig = pig * 2.0 + vec3(0.006, 0.006, 0.008) * (0.4 + strip);
    fEdge = (smoothstep(0.8, 0.97, lead) + 0.35 * smoothstep(0.9, 1.0, au)) * (gl_FrontFacing ? 0.3 : 1.0);
  } else {
    pig *= mix(1.0, 0.72, shaft * (scallop ? 0.0 : 0.7 - 0.5 * plush));
    if (!scale) {
      // dust: on a few feathers a white speck, a short thread of lint lying any which way,
      // or a wisp of pale down; commoner on the dark upper parts. Each fades out before it
      // gets thinner than a pixel, so it never sparkles.
      float dark = 1.0 - smoothstep(0.004, 0.02, dot(vBase.rgb, vec3(0.3, 0.5, 0.2)));
      float pick = fract(rnd * 91.7);
      float px = fwidth(v) + 1e-5;
      vec2 sc = vec2(fract(rnd * 13.3) * 1.1 - 0.55, 0.45 + 0.4 * fract(rnd * 29.1));
      vec2 d = vec2((u - sc.x) * 0.55, v - sc.y);
      float speck = step(1.0 - mix(0.006, 0.02, dark), pick) * (1.0 - smoothstep(0.035, 0.085, length(d))) * clamp(0.06 / px - 0.4, 0.0, 1.0);
      float la = fract(rnd * 47.3) * 3.1416;
      vec2 ld = vec2(cos(la), sin(la));
      float along = dot(d, ld), across = dot(d, vec2(-ld.y, ld.x)) + 0.05 * sin(along * 9.0 + rnd * 20.0);
      float lint = step(pick, mix(0.004, 0.016, dark)) * (1.0 - smoothstep(0.012, 0.03, abs(across))) * (1.0 - smoothstep(0.2, 0.3, abs(along))) * clamp(0.022 / px - 0.4, 0.0, 1.0);
      float tuft = step(0.5, pick) * step(pick, 0.5 + mix(0.001, 0.004, dark)) * (1.0 - smoothstep(0.1, 0.3, length(d))) * (0.4 + 0.6 * strand) * clamp(0.15 / px - 0.4, 0.0, 1.0);
      pig = mix(pig, vec3(0.5, 0.5, 0.48), max(speck, lint) * 0.9);
      pig = mix(pig, vec3(0.3, 0.27, 0.27), tuft * 0.8);
    }
  }
  diffuseColor.rgb = pig;
  #ifdef ALPHA_TO_COVERAGE
  if (!flight) {
    float aa = max(fwidth(edge), 1e-4);
    // every barb ends at its own length, and now and then the vane splits
    float cut = mix(scale ? 0.7 : mix(0.62, 0.45, loose), 1.03, h * h) - (h2 < 0.05 + 0.1 * loose ? 0.45 : 0.0);
    // a scallop's rim is a comb: each barb stops at its own length, the grooves open between them
    if (scallop) cut = 1.0 - 0.13 * h2 * h2 - (h < 0.07 ? 0.12 : 0.0);
    float alive = 1.0 - smoothstep(cut - aa, cut + aa, edge);
    if (scallop) alive *= 1.0 - (1.0 - strand) * smoothstep(0.78, 0.93, edge);
    // toward the edge of a soft feather the barbs stand apart: you see between them
    float open = scale ? 0.0 : smoothstep(mix(0.55, 0.1, loose), mix(0.95, 0.7, loose), max(edge, v * 0.9)) * mix(0.75, 1.0, loose);
    float gap = (1.0 - strand) * open;
    float fine = alive * (1.0 - gap);
    // too far to resolve barbs: the same thing on average, a soft feathered outline
    float far = 1.0 - smoothstep(mix(0.82, 0.5, loose), 1.06, edge) * mix(0.35, 0.8, loose);
    diffuseColor.a = mix(fine, far, lod);
  } else {
    // a few barbs have come unzipped near the edge of the vane
    float notch = step(h2, 0.035) * smoothstep(0.55, 0.75, au) * (1.0 - lod);
    diffuseColor.a = 1.0 - notch * smoothstep(0.2, 0.5, 1.0 - ridge);
  }
  #endif
  // structural colour: on scales the whole exposed disc; on soft feathers it sits on the
  // barbs, so it glitters in streaks rather than tiling
  // every strand shines, some much more than others; too far to tell them apart, their
  // average, with the odd single-feather sparkle so velvet still glints
  float streak = mix(strand * (0.25 + 2.3 * h * h), 0.55 * (1.0 + 1.6 * step(0.9, fract(rnd * 3.77))), lod);
  // scales: the flash runs in fine ridges with dark lines between, still a hint of them when tiny,
  // and a dark line where the scale's free edge lies over the next
  float scaleEdge = 1.0 - 0.6 * smoothstep(0.8, 1.0, edge);
  // (a scallop's covered root still glows a little, so a gap in the row above is not a black hole)
  fIriMask = flight ? 1.0 : scale ? (scallop ? mix(0.3, 1.0, bare) : bare) * mix((0.3 + 0.95 * strand) * (scallop ? 0.62 + 0.85 * h * h : 1.0), 0.62 + 0.18 * ridge, lod) * (1.0 - (scallop ? 0.0 : 0.3) * shaft) * scaleEdge : bare * streak;
  fSoft = (flight || scale) ? 0.0 : 1.0;
  // every barb of a scallop is its own little mirror too, if a steadier one
  fTilt = scallop ? 0.16 : fSoft * 0.35;
  }
}`).replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor = clamp((vFData.y > 3.5 ? 0.95 : vFData.y > 2.5 ? 0.8 : vFData.y > 0.5 ? 0.55 : 0.92) + 0.06 * fBarb, 0.08, 1.0);`).replace("#include <aomap_fragment>",`#include <aomap_fragment>
{
  vec3 nI = normalize(vIriN + vec3(0.0, 0.0, 1e-5));
  vec3 V = geometryViewDir;
  // on soft feathers every barb is its own little mirror, tilted a bit differently
  float c = clamp(dot(nI, V) + (fBarbRand - 0.5) * fTilt, 0.0, 1.0);
  float power = vIri.a * 32.0;
  float strength = vBase.a * 4.0;
  // hue slides with the angle of incidence
  vec3 colV = mix(vIri2.rgb, vIri.rgb, smoothstep(0.3, 0.8, c));
  // strand by strand the green leans gold or teal
  float fGold = fSoft * clamp((0.4 - fBarbHue) / 0.4, 0.0, 1.0) * 0.85;
  float fTeal = fSoft * clamp((fBarbHue - 0.68) / 0.32, 0.0, 1.0) * 0.6;
  colV = mix(colV, vec3(colV.g * 1.15, colV.g * 1.05, colV.b * 0.25), fGold);
  colV = mix(colV, vec3(colV.r * 0.5, colV.g * 0.95, colV.g * 0.95), fTeal);
  float lobeV = pow(c, power);
  vec3 ambient = (irradiance + iblIrradiance) * RECIPROCAL_PI;
  vec3 flash = colV * lobeV * (ambient * 2.2 + 0.05) * uFlash;
  #if NUM_DIR_LIGHTS > 0
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    vec3 H = normalize(directionalLights[i].direction + V);
    float nh = max(dot(nI, H), 0.0);
    float cl = max(dot(nI, directionalLights[i].direction), 0.0);
    vec3 colL = mix(vIri2.rgb, vIri.rgb, smoothstep(0.3, 0.8, nh));
    colL = mix(colL, vec3(colL.g * 1.15, colL.g * 1.05, colL.b * 0.25), fGold);
    colL = mix(colL, vec3(colL.r * 0.5, colL.g * 0.95, colL.g * 0.95), fTeal);
    flash += colL * pow(nh, power * 8.0) * cl * directionalLights[i].color * 0.35 * uGlint;
  }
  #endif
  // structural colour saturates, it never goes white: a soft ceiling on the
  // brightest channel, all three scaled alike so the hue holds
  // (the ceiling on the flash itself, the ridge and edge mask after it, so the ridges keep their contrast)
  vec3 fl = max(flash * strength, vec3(0.0));
  float fm = max(max(fl.r, fl.g), fl.b);
  fl *= 1.0 / (1.0 + fm / 0.55);
  totalEmissiveRadiance += fl * fIriMask;
  // the free edge of a blade is thin and a little translucent: it picks up the sky
  totalEmissiveRadiance += vec3(0.55, 0.6, 0.75) * fEdge * (ambient * 0.22 + 0.003);
  // downy edge light: thin barbs scatter at grazing angles
  // (clamped: a dot product a hair over 1 would feed pow a negative base, and one NaN
  // pixel becomes a dotted disc once a depth-of-field pass smears it)
  float fres = pow(clamp(1.0 - dot(normal, V), 0.0, 1.0), 3.0);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * ambient * fres * mix(2.5, 1.6, fSoft);
  // matte coat: soft feathers keep almost no mirror highlight
  bool blade = vFData.y > 2.5 && vFData.y < 3.5;
  // even the show scales only flash through their structural colour, not as mirrors
  reflectedLight.directSpecular *= blade ? 0.18 : fSoft > 0.5 ? 0.06 : 0.22;
  reflectedLight.indirectSpecular *= blade ? 0.12 : fSoft > 0.5 ? 0.06 : 0.3;
  // anisotropic sheen (Kajiya-Kay): barbs and barbules are fine parallel fibres, so a light
  // draws a soft streak across the feather, along its length, instead of a round spot. On the
  // iridescent tracts the streak takes the structural colour (tūī, kererū); elsewhere it is a
  // faint warm-white silk. Not on the fuzz shells.
  #if NUM_DIR_LIGHTS > 0
  if (fFuzz < 0.5) {
    vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
    vec2 dux = vec2(dFdx(vFUv.x), dFdy(vFUv.x));
    vec3 T = dpy * dux.x - dpx * dux.y;
    float tl = length(T);
    if (tl > 1e-9) {
      T /= tl;
      float irid = clamp(vBase.a * 4.0, 0.0, 1.5);
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        vec3 L = directionalLights[i].direction;
        vec3 H = normalize(L + V);
        float th = dot(T, H);
        float sinTH = sqrt(max(1.0 - th * th, 0.0));
        float nl = max(dot(normal, L), 0.0);
        float streak = pow(sinTH, mix(48.0, 120.0, fSoft)) * nl;
        vec3 sc = mix(mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.94), 0.5) * 0.05, mix(vIri2.rgb, vIri.rgb, 0.6) * 0.35, min(irid, 1.0));
        reflectedLight.directSpecular += sc * streak * directionalLights[i].color * (0.6 + 0.4 * fIriMask);
      }
    }
  }
  #endif
}`)},e.customProgramCacheKey=()=>"plumage-v48",{material:e,uniforms:s}}function mv(s){const e=new Fd({side:Rt});return e.onBeforeCompile=t=>{Object.assign(t.uniforms,s),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>${lu}`).replace("#include <begin_vertex>",hu+du)},e.customProgramCacheKey=()=>"plumage-depth-v5",e}class qs{constructor(e){this.rig=e}rig;pos=[];nor=[];col=[];uv=[];si=[];sw=[];idx=[];add(e,t,n,i,a){const r=this.rig.rest[t],o=new Xe().compose(r.worldPos,r.worldQuat,new v(1,1,1)),c=e.index?e.toNonIndexed():e.clone(),l=c.getAttribute("position").clone();c.applyMatrix4(o);const h=c.getAttribute("position"),d=c.getAttribute("normal"),u=c.getAttribute("uv"),f=this.pos.length/3,p=this.rig.index(t),b=new v;for(let g=0;g<h.count;g++){b.fromBufferAttribute(l,g);const m=a?.(b)??n;this.pos.push(h.getX(g),h.getY(g),h.getZ(g)),this.nor.push(d.getX(g),d.getY(g),d.getZ(g)),this.col.push(m.r,m.g,m.b),this.uv.push(u?u.getX(g):0,u?u.getY(g):0),this.si.push(i?this.rig.index(i(b)):p,0,0,0),this.sw.push(1,0,0,0),this.idx.push(f+g)}c.dispose(),e.dispose()}build(){const e=new St;return e.setAttribute("position",new tt(this.pos,3)),e.setAttribute("normal",new tt(this.nor,3)),e.setAttribute("color",new tt(this.col,3)),e.setAttribute("uv",new tt(this.uv,2)),e.setAttribute("skinIndex",new Tr(this.si,4)),e.setAttribute("skinWeight",new tt(this.sw,4)),e.setIndex(this.idx),e.boundingSphere=new yn(new v(0,.4,0),2.5),e}}function Xs(s,e,t,n=10){const i=[],a=[],r=s.length,o=new v,c=new v,l=new v;for(let d=0;d<r;d++){o.copy(s[Math.min(d+1,r-1)]).sub(s[Math.max(d-1,0)]).normalize(),c.crossVectors(t,o).normalize(),l.crossVectors(o,c);const[u,f]=e(d/(r-1));for(let p=0;p<=n;p++){const b=p/n*Math.PI*2;i.push(s[d].x+c.x*Math.cos(b)*u+l.x*Math.sin(b)*f,s[d].y+c.y*Math.cos(b)*u+l.y*Math.sin(b)*f,s[d].z+c.z*Math.cos(b)*u+l.z*Math.sin(b)*f)}}for(let d=0;d<r-1;d++)for(let u=0;u<n;u++){const f=d*(n+1)+u,p=f+n+1;a.push(f,f+1,p,p,f+1,p+1)}const h=new St;return h.setAttribute("position",new tt(i,3)),h.setIndex(a),h.computeVertexNormals(),h}function So(s,e,t,n,i=!1){const o=[],c=[],l=[];for(let d=0;d<=12;d++){const u=ue(e,t,d/12);for(let f=0;f<=12;f++){const p=ue(-n,n,f/12);let b=Math.sin(p),g=Math.cos(p)*Math.sin(u);const m=Math.cos(p)*Math.cos(u);if(i){const x=b;b=g,g=x}o.push(b*s,g*s,m*s),c.push(b,g,m)}}for(let d=0;d<12;d++)for(let u=0;u<12;u++){const f=d*13+u,p=f+12+1;i?l.push(f,p,f+1,p,p+1,f+1):l.push(f,f+1,p,p,f+1,p+1)}const h=new St;return h.setAttribute("position",new tt(o,3)),h.setAttribute("normal",new tt(c,3)),h.setIndex(l),h}const wo={upperOpen:62*Ce,lowerOpen:-72*Ce,nictOpen:150*Ce};function gv(s){const e=s.species,t=e.eye.radius,n=new pe(e.skin),i=new v(0,1,0),a=new qs(s),r=new pe(2369067),o=new pe(7829372),c=new pe(526346);for(const Y of Zt){const de=Y==="L"?-1:1,W=96,J=7,te=[],ce=[],ee=[],ye=new pe;for(let $=0;$<=W;$++){const Le=$/W*Math.PI*2,be=Math.cos(Le),xe=Math.sin(Le),ie=be*de>0?1.3:1.6,He=1/Math.pow(Math.pow(Math.abs(be)/(43*Ce),ie)+Math.pow(Math.abs(xe)/(29*Ce),ie),1/ie),We=56*Ce;for(let ot=0;ot<=J;ot++){const nt=ot/J,_t=ue(He,We,nt),H=Math.pow(Math.sin(Math.PI*Math.min(nt/.5,1)),.6),At=Math.max(0,Math.sin(Le*38))*re(.12,.2,nt)*(1-re(.22,.32,nt)),ft=t*(1.05+.02*H+.004*At-.035*re(.5,1,nt));te.push(Math.sin(_t)*be*ft,Math.sin(_t)*xe*ft,Math.cos(_t)*ft),ye.copy(o).multiplyScalar(.55+.5*H).lerp(c,Math.max(At*.35,re(.4,.6,nt))),ce.push(ye.r,ye.g,ye.b)}}for(let $=0;$<W;$++)for(let Le=0;Le<J;Le++){const be=$*(J+1)+Le,xe=be+J+1;ee.push(be,xe,be+1,xe,xe+1,be+1)}const _e=new St;_e.setAttribute("position",new tt(te,3)),_e.setAttribute("color",new tt(ce,3)),_e.setIndex(ee),_e.computeVertexNormals();const fe=_e.toNonIndexed(),Ne=fe.getAttribute("color");let ke=0;a.add(fe,`eye.${Y}`,o,null,()=>ye.fromBufferAttribute(Ne,ke++).clone()),a.add(So(t*1.04,12*Ce,112*Ce,78*Ce),`lidUpper.${Y}`,r),a.add(So(t*1.036,-106*Ce,16*Ce,78*Ce),`lidLower.${Y}`,r)}const l=new pe(e.legs.color),h=e.legs.perchRadius;for(const Y of Zt){const de=pn(Y),W=s.tarsusLength;a.add(Xs([0,.25,.5,.75,1,1.15].map(ee=>new v(0,0,ee*W)),ee=>{const ye=e.legs.thick??.011,_e=ue(ye,ye*1.55,ee);return[_e,_e]},i,8),`tarsus.${Y}`,l);const J=.0085,te=(ee,ye,_e,fe,Ne)=>{const ke=[];for(let Le=0;Le<=14;Le++){const be=Le/14,xe=ue(ye,_e,be),ie=re(.78,1,be)*.012,He=(1-re(0,.2,be))*.012,We=h+J*.9-ie+He;ke.push(new v(ue(fe,Ne,be),-h+We*Math.cos(xe),We*Math.sin(xe)))}a.add(Xs(ke,Le=>{const be=Le>.78?ue(.75,.08,(Le-.78)/.22):1+.12*Math.sin(Le*22);return[J*be,J*be*.9]},new v(1,0,0),7),`toe.${Y}.${ee}`,l.clone().multiplyScalar(1-ee%2*.12))},ce=e.legs.toe/(h+J);te(1,-.12,ce*.95,0,-.03*de),te(2,-.12,ce*1.1,0,.002*de),te(3,-.12,ce*.98,0,.034*de),te(4,.05,-ce*.8,0,-.006*de)}const d=fv(s),u=new cn({color:16777215,vertexColors:!0,roughness:.9,envMapIntensity:.4,side:Rt}),f=new cn({color:n.clone().multiplyScalar(.5),roughness:1,envMapIntensity:.15,side:Rt}),p=new kn(d,f);p.name="bird.skin";const b=new kn(a.build(),u);b.name="bird.bare";const g=new qs(s),m=e.bill,x=new pe(m.color),E=new pe(2493968),y=Y=>ue(1,.17,Math.pow(Y,.8))*(Y>.95?ue(1,.05,(Y-.95)/.05):1),S=(Y,de,W,J)=>{const te=[];for(let ee=0;ee<=26;ee++){const ye=ue(-.07,m.length*J,ee/26),_e=Math.max(ye/m.length,0);te.push(new v(0,Y*m.radius*y(_e)-m.droop*_e*_e,ye))}return Xs(te,ee=>{const ye=Math.max((ee*(m.length*J+.07)-.07)/m.length,0);return[m.radius*W*y(ye),m.radius*de*y(ye)]},i,12)},w=Y=>{const de=Math.max(Y/m.length,0);return-m.droop*de*de};g.add(S(.4,.58,1,1),"bill",x,null,Y=>Y.y<w(Y.z)+.1*m.radius*y(Math.max(Y.z/m.length,0))?E:null),g.add(S(-.36,.5,.9,.985),"bill",x,()=>"jaw",Y=>Y.y>w(Y.z)-.1*m.radius*y(Math.max(Y.z/m.length,0))?E:null);for(const Y of[1,-1]){const de=new St,W=Y*m.radius*.8,J=Y*m.radius*.72;de.setAttribute("position",new tt([W,2e-4,-.05,J,2e-4,.09,W,-2e-4,-.05,J,2e-4,.09,J,-2e-4,.09,W,-2e-4,-.05],3)),de.setAttribute("normal",new tt([Y,0,0,Y,0,0,Y,0,0,Y,0,0,Y,0,0,Y,0,0],3)),g.add(de,"bill",new pe(393731),te=>te.y>0?"bill":"jaw")}const _=new qs(s);{const Y=new pe(15979474),de=.04,W=m.length*.8,J=ce=>ce.z<m.length*.5?"tongue.1":ce.z<m.length*.7?"tongue.2":"tongue.3",te=(ce,ee,ye,_e)=>{const fe=[];for(let Ne=0;Ne<=14;Ne++){const ke=ue(ye,_e,Ne/14),$=ke/m.length,Le=Math.max(($-.55)/.25,0);fe.push(new v(ue(ce,ee,Ne/14),-8e-4*(1-$*.7)-m.droop*$*$-.0028*Le*Le,ke))}return fe};_.add(Xs(te(0,0,de,W-.012),ce=>[ue(.0036,.0027,ce),ue(.0024,.002,ce)],i,8),"bill",Y,J);for(const ce of[1,-1])_.add(Xs(te(ce*.0011,ce*.0015,W-.02,W),ee=>[.0015*Math.sqrt(1-ee*ee*.92),.0014*Math.sqrt(1-ee*ee*.92)],i,6),"bill",Y,J)}const M=new Gt({color:16777215,vertexColors:!0,roughness:.22,clearcoat:1,clearcoatRoughness:.12,sheen:.4,sheenColor:16770272,emissive:4863540,envMapIntensity:1.1,side:Rt}),F=new kn(_.build(),M);F.name="bird.tongue";const P=new cn({color:16777215,vertexColors:!0,roughness:.68,envMapIntensity:.35,side:Rt}),I=new kn(g.build(),P);I.name="bird.bill";const D=new qs(s);for(const Y of Zt){const de=new Ki(t,40,28);de.rotateX(Math.PI/2);const W=de.getAttribute("position");for(let te=0;te<W.count;te++){const ce=W.getZ(te)/t,ee=1+.028*re(.55,1,ce);W.setXYZ(te,W.getX(te)*ee,W.getY(te)*ee,W.getZ(te)*ee)}de.computeVertexNormals();const J=de.getAttribute("uv");for(let te=0;te<W.count;te++)J.setXY(te,W.getZ(te)/t,0);D.add(de,`eye.${Y}`,new pe(1,1,1))}const L=new Gt({color:0,roughness:.35,metalness:0,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.1,specularIntensity:.12,ior:1.4}),R=s.species.eye.iris,U=R===void 0?new pe(.003,.0035,.006):new pe(R).multiplyScalar(.55),z=`vec3(${U.r.toFixed(5)}, ${U.g.toFixed(5)}, ${U.b.toFixed(5)})`;L.onBeforeCompile=Y=>{Y.fragmentShader=Y.fragmentShader.replace("#include <common>",`#include <common>
#define IRIS_COLOR ${z}`),Y.vertexShader=Y.vertexShader.replace("#include <common>",`#include <common>
varying float vEyeCos;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vEyeCos = uv.x;`),Y.fragmentShader=Y.fragmentShader.replace("#include <common>",`#include <common>
varying float vEyeCos;`).replace("#include <color_fragment>",`#include <color_fragment>
{
  // a near-black eye: pupil, a very dark umber iris you only catch in strong light, dark limbus
  float iris = smoothstep(0.93, 0.86, vEyeCos) * smoothstep(0.55, 0.7, vEyeCos);
  diffuseColor.rgb = mix(vec3(0.0006, 0.0007, 0.0012), IRIS_COLOR, iris);
}`).replace("#include <aomap_fragment>",`#include <aomap_fragment>
{
  // What a wet black eye shows is the world: mostly the environment map, plus the canopy
  // overhead as a few pale irregular gaps of sky between leaves (the env map is too soft to
  // carry those), bent by the cornea. No painted catchlight.
  vec3 R = reflect(-geometryViewDir, normal);
  vec3 Rw = normalize((vec4(R, 0.0) * viewMatrix).xyz);
  vec2 q = Rw.xz / (Rw.y + 0.45) * 2.6 + vec2(1.7, 0.4);
  vec2 qi = floor(q), qf = fract(q);
  float gaps = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 h = fract(sin(vec2(dot(qi + g, vec2(127.1, 311.7)), dot(qi + g, vec2(269.5, 183.3)))) * 43758.5453);
    vec2 d = (g + h - qf) * vec2(1.0, 0.6 + 0.8 * h.y);
    gaps = max(gaps, (1.0 - smoothstep(0.08, 0.3 * h.x + 0.12, length(d))) * step(0.45, h.x));
  }
  float up = smoothstep(0.15, 0.6, Rw.y);
  totalEmissiveRadiance += vec3(0.8, 0.95, 0.85) * gaps * up * 0.55;
  // a mirror-sharp highlight of the sun is thousands of nits on one pixel; a depth-of-field
  // pass turns that into a dotted disc. Keep the glints bright but finite.
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(1.6));
  #ifdef USE_CLEARCOAT
  clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(2.2));
  clearcoatSpecularIndirect = min(clearcoatSpecularIndirect, vec3(2.2));
  #endif
}`)};const N=new kn(D.build(),L);N.name="bird.eyes";const B=new qs(s);for(const Y of Zt)B.add(So(t*1.045,-100*Ce,100*Ce,80*Ce,!0),`nict.${Y}`,new pe(9348296));const k=new Gt({color:16777215,vertexColors:!0,roughness:.45,transparent:!0,opacity:.3,clearcoat:.2,side:Rt,depthWrite:!1}),V=new kn(B.build(),k);V.name="bird.nict",V.renderOrder=2;const X=[p,b,I,F,N,V];for(const Y of X)Y.frustumCulled=!1,Y.bind(s.skeleton,new Xe);return p.castShadow=!0,I.castShadow=!0,b.castShadow=!0,b.receiveShadow=!0,I.receiveShadow=!0,{meshes:X,dispose(){for(const Y of X)Y.geometry.dispose(),Y.material.dispose()}}}const Eo={spread:0,lift:0,droop:0,sweep:0,raise:0,out:0,twist:0};class uu{headYaw=0;headPitch=0;headRoll=0;headShift=new v;headStabil=.85;reachTarget=new v;reachWeight=0;reachDir=new v(0,0,1);reachPin=0;reachRoll=0;bodyYaw=0;bodyPitch=0;bodyRoll=0;bodyShift=new v;chestPitch=0;breath=0;fluff=0;lift=new Float32Array(8);gorget=0;crest=0;lidUpper=0;lidLower=0;nict=0;feetSlope=0;feetScale=1;grip=1;jaw=0;tongueOut=0;tongueCurl=0;carryAt=1;tailPitch=0;tailYaw=0;tailRoll=0;tailFan=0;wing={L:{...Eo},R:{...Eo}};reset(){Object.assign(this,bv),this.headShift.set(0,0,0),this.bodyShift.set(0,0,0),this.lift.fill(0);for(const e of Zt)Object.assign(this.wing[e],Eo)}addLift(e,t,n){for(let i=0;i<8;i++){const a=(i/7-e)/t;this.lift[i]+=n*Math.exp(-a*a)}}}const bv=Object.fromEntries(Object.entries(new uu).filter(([,s])=>typeof s=="number")),Fn=new v(1,0,0),Ks=new v(0,1,0),To=new v(0,0,1),nr=new pt;function _v(s,e){const{bones:t,rest:n,species:i}=s,a=new qn,r=new pt,o=new pt,c=new pt,l=new pt,h=new pt,d=new pt,u=new pt,f=new pt,p=new v,b=new v,g=new v,m=new v,[x,E]=i.behaviour.neckShare,y={};for(const xe of Zt){const ie=n[`hand.${xe}`].quat;y[xe]={out:Fn.clone().applyQuaternion(ie),fan:Ks.clone().applyQuaternion(ie)}}{const xe={p:new v,n:new v,t:new v},ie=(nt,_t)=>{const H=s.loft.wingAt(nt,_t,1);return s.loft.surface(H.s,H.ang,xe)},He=ie(.03,.3).p.clone(),We=ie(.95,0).p.clone().sub(He).normalize(),ot=ie(.4,0).n.clone();ot.addScaledVector(We,-ot.dot(We)).normalize(),e.uWingPivot.value.copy(He),e.uWingSpan.value.copy(We),e.uWingChord.value.crossVectors(ot,We)}const S=n.bill,w=new v(0,-i.bill.droop,i.bill.length).applyQuaternion(S.worldQuat).add(S.worldPos).sub(n.head.worldPos),_=w.length(),M=Math.atan2(w.y,w.z),F=.34,P=new v,I=new v,D=i.bill.length*.65,L=["tongue.1","tongue.2","tongue.3"],R=[.06,.5,.7].map(xe=>xe*i.bill.length),U=[0,.3,.7],z=(xe,ie)=>{const He=i.bill.length,We=Math.min(xe,He),ot=-2*i.bill.droop*We/(He*He);return ie.set(0,-i.bill.droop*(We/He)*(We/He)+ot*(xe-We),xe),-Math.atan(ot)},N=R.map(()=>new v),B=R.map(()=>new v),k=R.map((xe,ie)=>z(xe,N[ie])),V=new v,X=new pt,Y=new Xe,de=new v,W=new v,J=(()=>{const[xe,ie]=i.throat,He={p:new v,n:new v,t:new v},We=n.head.worldPos,ot=s.loft.point(ie,0,new v).sub(We),nt=s.loft.point(xe,0,new v).sub(We),_t=s.loft.surface((xe+ie)/2,0,He).p.clone().sub(We),H=He.n.clone(),At=s.loft.surface(xe,0,He).t.clone();return{chin:ot,rim:nt,mid:_t,out:H,down:At,span:ot.distanceTo(nt),pivot:We.clone().sub(n.chest.worldPos)}})(),te=.12,ce=new pt,ee=new v,ye=new v,_e=new v,fe=new v,Ne=n.sternum.worldPos.clone().sub(n.chest.worldPos).setX(0).normalize(),ke=Zt.map(xe=>({s:xe,foot:t[`foot.${xe}`],footRest:n[`foot.${xe}`],toes:[1,2,3,4].map(ie=>t[`toe.${xe}.${ie}`]),tarsus:t[`tarsus.${xe}`]})),$=()=>{h.copy(c).invert().multiply(l),d.copy(nr).slerp(h,x),u.copy(nr).slerp(h,E)};function Le(xe,ie,He,We,ot,nt){return nt.copy(n.head.pos).applyQuaternion(ot).add(n.neck2.pos),nt.applyQuaternion(We).add(n.neck1.pos),nt.applyQuaternion(He).add(n.chest.pos),nt.add(n.spine.pos),nt.applyQuaternion(ie).add(xe),nt}const be=function(ie){a.set(ie.bodyPitch,ie.bodyYaw,ie.bodyRoll,"YXZ"),r.setFromEuler(a),t.hips.quaternion.copy(r),t.hips.position.copy(n.hips.pos).add(ie.bodyShift),o.setFromAxisAngle(Fn,ie.chestPitch),t.chest.quaternion.copy(o),c.copy(r).multiply(o),t.sternum.position.copy(n.sternum.pos).addScaledVector(Ne,ie.breath*.011),t.sternum.scale.set(1+ie.breath*.028,1,1+ie.breath*.012),a.set(-ie.headPitch,ie.headYaw,ie.headRoll,"YXZ"),l.setFromEuler(a),$(),Le(t.hips.position,r,o,d,u,g),Le(n.hips.pos,nr,nr,d,u,m),p.copy(m).sub(g).multiplyScalar(Oe(ie.headStabil,0,1)).add(ie.headShift);const He=Oe(ie.reachWeight,0,1);if(He>0){V.copy(g).add(p),b.copy(ie.reachTarget).sub(V);const le=b.length()||1e-6,Ze=Oe(le-_,-.24,F);V.addScaledVector(b,Ze/le);const Fe=Oe(ie.reachPin,0,1);Fe>0&&V.lerp(b.copy(ie.reachDir).multiplyScalar(-_).add(ie.reachTarget),Fe),b.copy(ie.reachTarget).sub(V).normalize();const Ke=Oe(Math.atan2(b.x,b.z),-2.2,2.2),C=Oe(Math.asin(Oe(b.y,-1,1))-M,-1.1,1.25);a.set(-C,Ke,ie.headRoll*(1-He),"YXZ"),X.setFromEuler(a),Fe>0&&(de.crossVectors(Ks,b).normalize(),W.crossVectors(b,de),u.setFromRotationMatrix(Y.makeBasis(de,W,b)),u.multiply(d.setFromAxisAngle(To,ie.reachRoll)).multiply(d.setFromAxisAngle(Fn,M)),X.slerp(u,Fe)),l.slerp(X,He),$(),Le(t.hips.position,r,o,d,u,g),p.lerp(V.sub(g),He)}t.neck1.quaternion.copy(d),t.neck2.quaternion.copy(u),f.copy(d).multiply(u).invert().multiply(h),t.head.quaternion.copy(f),P.copy(g).add(p),f.copy(c).invert(),t.neck1.position.copy(n.neck1.pos).add(b.copy(p).multiplyScalar(.22).applyQuaternion(f)),f.copy(c).multiply(d).invert(),t.neck2.position.copy(n.neck2.pos).add(b.copy(p).multiplyScalar(.3).applyQuaternion(f)),f.copy(c).multiply(d).multiply(u).invert(),t.head.position.copy(n.head.pos).add(b.copy(p).multiplyScalar(.48).applyQuaternion(f)),ce.set(0,h.y,0,h.w),ce.lengthSq()<1e-6&&ce.set(0,0,0,1),ce.normalize(),t.throat.quaternion.copy(ce),p.copy(t.head.position).applyQuaternion(t.neck2.quaternion).add(t.neck2.position).applyQuaternion(t.neck1.quaternion).add(t.neck1.position),ee.copy(J.chin).applyQuaternion(h).add(p).sub(ye.copy(J.rim).applyQuaternion(ce).add(J.pivot));const We=J.span*.5-ee.length(),ot=.5*(We+Math.sqrt(We*We+1e-4));fe.copy(J.down).applyQuaternion(ce).multiplyScalar(ot),t.throat.position.copy(n.throat.pos).add(fe),f.copy(ce).slerp(h,.5),t.gular.quaternion.copy(f),b.copy(J.mid).applyQuaternion(f);const nt=Oe(te*(J.span-ee.length()),-.006,.03);_e.copy(J.out).applyQuaternion(f),t.gular.position.copy(p).add(J.pivot).add(fe).multiplyScalar(.5).add(b).addScaledVector(_e,nt),P.add(b.copy(w).applyQuaternion(l)),t.jaw.quaternion.copy(n.jaw.quat).multiply(d.setFromAxisAngle(Fn,Oe(ie.jaw,0,1.1)*.31));const _t=Oe(ie.tongueOut,0,1)*D;let H=0;for(let le=0;le<3;le++){const Ze=z(R[le]+_t,B[le])-k[le],Fe=t[L[le]];Fe.quaternion.setFromAxisAngle(Fn,Ze-H+ie.tongueCurl*U[le]),le===0?Fe.position.copy(n[L[0]].pos).add(B[0]).sub(N[0]):Fe.position.copy(B[le]).sub(B[le-1]).sub(N[le]).add(N[le-1]).add(n[L[le]].pos).applyQuaternion(d.setFromAxisAngle(Fn,-H)),H=Ze}const At=Math.max(ie.carryAt,0);I.set(0,-i.bill.droop*Math.min(At,1)*Math.min(At,1)-(At<1?.003*(1-At):0),At*i.bill.length).applyQuaternion(S.worldQuat).add(S.worldPos).sub(n.head.worldPos),I.applyQuaternion(l).add(P).sub(b.copy(w).applyQuaternion(l));for(const le of Zt){const Ze=s.eyes[le],Fe=ue(wo.upperOpen,0,re(0,1,ie.lidUpper)),Ke=ue(wo.lowerOpen,0,re(0,1,ie.lidLower));Ze.lidUpper.quaternion.copy(n[Ze.lidUpper.name].quat).multiply(d.setFromAxisAngle(Fn,-Fe)),Ze.lidLower.quaternion.copy(n[Ze.lidLower.name].quat).multiply(d.setFromAxisAngle(Fn,-Ke));const C=-pn(le)*wo.nictOpen*(1-Oe(ie.nict,0,1));Ze.nict.quaternion.copy(n[Ze.nict.name].quat).multiply(d.setFromAxisAngle(Ks,C)),Ze.nict.scale.setScalar(ie.nict>.002?1:.001),Ze.lidUpper.scale.setScalar(ue(.93,1,re(0,.5,ie.lidUpper))),Ze.lidLower.scale.setScalar(ue(.93,1,re(0,.5,ie.lidLower)))}a.set(-ie.tailPitch,ie.tailYaw,ie.tailRoll,"YXZ"),t.tail.quaternion.copy(n.tail.quat).multiply(d.setFromEuler(a));const ft=ue(i.tail.restFan,i.tail.maxFan,Oe(ie.tailFan,-.5,1))*Ce;for(const le of s.rectrices)le.bone.quaternion.setFromAxisAngle(Ks,le.k*ft);for(const le of Zt){const Ze=s.wings[le],Fe=ie.wing[le],Ke=re(0,1,Fe.spread);for(let T=0;T<Ze.bones.length;T++)Ze.bones[T].quaternion.copy(Ze.folded[T]).slerp(Ze.spread[T],Ke);Ke>0&&(Fe.sweep!==0||Fe.raise!==0)&&(d.setFromAxisAngle(Ks,-pn(le)*Fe.sweep*Ke),u.setFromAxisAngle(To,pn(le)*Fe.raise*Ke),Ze.bones[0].quaternion.premultiply(u).premultiply(d));const C=1-Ke;if(C>0){const T=y[le],q=Ze.bones[1];q.quaternion.multiply(d.setFromAxisAngle(T.out,-Fe.lift*.3*C)),q.quaternion.multiply(d.setFromAxisAngle(T.fan,-pn(le)*Fe.droop*C))}}d.setFromAxisAngle(To,ie.feetSlope);const xt=(1-Oe(ie.grip,0,1))*.6;for(const{s:le,foot:Ze,footRest:Fe,toes:Ke,tarsus:C}of ke){Ze.position.copy(Fe.pos).applyQuaternion(d),Ze.quaternion.copy(d),Ze.scale.setScalar(ie.feetScale);for(let q=0;q<4;q++)Ke[q].quaternion.setFromAxisAngle(Fn,q===3?xt:-xt);b.copy(s.ankle[le]).sub(Fe.worldPos).multiplyScalar(ie.feetScale).applyQuaternion(d).add(Ze.position),p.copy(s.hipSocket[le]).applyQuaternion(r).add(t.hips.position).sub(b);const T=p.length();p.applyQuaternion(u.copy(d).invert()),Hi(p,Fn,C.quaternion),C.scale.set(1,1,T/s.tarsusLength/ie.feetScale)}e.uFluff.value=ie.fluff,e.uLift.value.set(ie.lift),e.uLift.value[0]+=ie.crest*.9,e.uLift.value[1]+=ie.crest*.7,e.uGorget.value=ie.gorget,e.uCrest.value=ie.crest,e.uWingSpread.value.set(ie.wing.L.spread,ie.wing.R.spread),e.uWingOut.value.set(ie.wing.L.out,ie.wing.L.twist,ie.wing.R.out,ie.wing.R.twist),e.uWingLift.value.set(ie.wing.L.lift,ie.wing.R.lift)};return be.tip=P,be.carry=I,be.billReach=_,be}class xv{constructor(e,t=7){this.species=e,this.rng=jn(t)}species;t=0;dt=0;rng;arousal=.3;baseline=.32;attention=null;attentionSpeed=0;freeze=0;saccading=!1;food=[];focus=null;focusId=0;eating=!1;gazeLock=!1;pinGaze=null;quiet=!1;handlers={};lastDir=new v;dir=new v;hasLast=!1;on(e,t){(this.handlers[e]??=[]).push(t)}emit(e,t){for(const n of this.handlers[e]??[])n(t)}excite(e){this.arousal=Oe(this.arousal+e,0,1)}step(e,t){if(this.dt=e,this.t+=e,this.freeze=Math.max(0,this.freeze-e),this.attention&&e>0){if(this.dir.copy(this.attention).sub(t).normalize(),this.hasLast){const n=this.dir.angleTo(this.lastDir)/e;this.attentionSpeed=Ln(this.attentionSpeed,Math.min(n,6),6,e)}this.lastDir.copy(this.dir),this.hasLast=!0}else this.hasLast=!1,this.attentionSpeed=Ln(this.attentionSpeed,0,4,e);this.excite(Math.max(this.attentionSpeed-.25,0)*.5*e),this.arousal=Ln(this.arousal,this.baseline,.14,e)}}class vv{name="posture";a=.3;yaw=new Vi(3.2,.5);follow=0;pitch=new Vi(5,.45);headYaw=0;constructor(e){e.on("saccade",t=>{this.yaw.kick(-t.dyaw*.5),this.pitch.kick(-t.dpitch*.4)}),e.on("fixate",t=>this.headYaw=t.yaw)}update(e,t){this.a=Ln(this.a,e.arousal,2.5,e.dt);const n=this.a;t.fluff+=ue(.2,-.06,n),t.headShift.y+=ue(-.032,.03,n),t.headShift.z+=ue(-.014,.012,n),t.bodyPitch+=ue(-.04,.05,n),t.bodyShift.y+=ue(-.012,.008,n),t.crest+=ue(0,.22,n),t.wing.L.droop+=ue(.05,0,n),t.wing.R.droop+=ue(.05,0,n);const i=e.t;t.bodyRoll+=Ot(i*.17,1)*.022,t.bodyShift.x+=Ot(i*.13,2)*.006,t.bodyPitch+=Ot(i*.21,3)*.012,this.follow=Ln(this.follow,this.headYaw*.14,.9,e.dt),t.bodyYaw+=this.follow+this.yaw.step(0,e.dt)+Ot(i*.11,4)*.025,t.chestPitch+=this.pitch.step(0,e.dt)}}class yv{name="breath";phase=0;update(e,t){const[n,i]=e.species.behaviour.breathHz;this.phase+=e.dt*ue(n,i,e.arousal)*Math.PI*2;const a=Math.sin(this.phase+.45*Math.sin(this.phase))*ue(.75,1.1,e.arousal);t.breath+=a,t.addLift(.42,.2,a*.014),t.tailPitch+=a*.011,t.bodyShift.y+=a*.0012,t.wing.L.lift+=a*.005,t.wing.R.lift+=a*.005}}const Mv=s=>s*s*s*(10+s*(-15+6*s));class Sv{name="gaze";maxYaw=70*Ce;interest=.5;billOn=.46;pursuit=0;minPitch=-45*Ce;minPitchFood=-50*Ce;cur;from;to;moving=!1;t0=0;dur=.06;amp=0;nextAt=.8;settle=10;burst=0;attYaw=0;attPitch=0;seenYaw=0;seenPitch=0;lastStart=-10;focusSeen=-1;focusAt=0;head=new v(0,.9,.05);d=new v;constructor(e){const t=e.species.behaviour.billUp*Ce;this.cur={yaw:.9,pitch:t,roll:0},this.from={...this.cur},this.to={...this.cur},e.on("startle",()=>{this.nextAt=e.t+.04+e.rng()*.04,this.burst=-1})}moveOn(e){this.burst=0,this.nextAt=Math.min(this.nextAt,e.t+Ae(e.rng,.12,.4))}lookAtAttention(e){const t=e.focus??e.attention;return t?(this.d.copy(t).sub(this.head),this.attYaw=Math.atan2(this.d.x,this.d.z),this.attPitch=Math.atan2(this.d.y,Math.hypot(this.d.x,this.d.z)),!0):!1}pick(e,t=!1){const n=e.rng,i=e.species.behaviour.billUp*Ce,a=this.lookAtAttention(e),r=this.cur;let o;if(!t&&this.burst>0)this.burst--,o={yaw:r.yaw+Ae(n,-1,1)*13*Ce,pitch:r.pitch+Ae(n,-1,1)*8*Ce,roll:r.roll*.5+Ae(n,-1,1)*9*Ce};else if(a&&(t||n()<this.interest+.4*e.arousal)){if(this.seenYaw=this.attYaw,this.seenPitch=this.attPitch,(t?0:n())<this.billOn)o={yaw:this.attYaw+Ae(n,-5,5)*Ce,pitch:this.attPitch*.8+i+Ae(n,-4,14)*Ce,roll:n()<.25?Ae(n,-18,18)*Ce:Ae(n,-5,5)*Ce};else{const l=Ae(n,60,84)*Ce,h=Math.abs(r.yaw-(this.attYaw+l))<Math.abs(r.yaw-(this.attYaw-l))?1:-1;let d=n()<.6?h:-h;Math.abs(this.attYaw+d*l)>this.maxYaw&&(d=-d),o={yaw:this.attYaw+d*l,pitch:i*.6+Ae(n,-8,12)*Ce,roll:d*(this.attPitch*.5+Ae(n,-4,10)*Ce)}}n()<.35&&(this.burst=1+Math.floor(n()*2))}else{let c=Oe(Ae(n,-1,1)*105*Ce,r.yaw-140*Ce,r.yaw+140*Ce);Math.abs(c-r.yaw)<22*Ce&&(c+=Math.sign(c-r.yaw||1)*30*Ce),o={yaw:c,pitch:i*.5+Ae(n,-14,24)*Ce,roll:Ae(n,-9,9)*Ce},n()<.3&&(this.burst=1+Math.floor(n()*2))}return o.yaw=Oe(o.yaw,-this.maxYaw,this.maxYaw),o.pitch=Oe(o.pitch,this.minPitch,52*Ce),o.roll=Oe(o.roll,-26*Ce,26*Ce),o}begin(e,t){const[n,i]=e.species.behaviour.saccade;this.from={...this.cur},this.to=t;const a=t.yaw-this.from.yaw,r=t.pitch-this.from.pitch,o=t.roll-this.from.roll;this.amp=Math.hypot(a*Math.cos((t.pitch+this.from.pitch)/2),r,o*.5),this.dur=Math.min(n+i*this.amp/Ce,.095),this.t0=e.t,this.moving=!0,this.lastStart=e.t,e.saccading=!0,e.emit("saccade",{amp:this.amp,dur:this.dur,dyaw:a,dpitch:r})}update(e,t){const n=e.species.behaviour;if(e.pinGaze){t.headYaw+=e.pinGaze[0]*Ce,t.headPitch+=e.pinGaze[1]*Ce,t.headRoll+=e.pinGaze[2]*Ce;return}if(e.focus&&!this.moving&&!e.gazeLock&&this.lookAtAttention(e)){const o=Math.hypot((this.attYaw-this.cur.yaw)*Math.cos(this.attPitch),this.attPitch-this.cur.pitch),c=this.focusSeen!==e.focusId;c&&!this.focusAt&&(this.focusAt=e.t+Ae(e.rng,.09,.24)),(c&&e.t>=this.focusAt||!c&&o>6*Ce&&e.t-this.lastStart>.16&&e.rng()<e.dt*9)&&(this.focusSeen=e.focusId,this.focusAt=0,this.burst=0,this.begin(e,{yaw:Oe(this.attYaw,-this.maxYaw,this.maxYaw),pitch:Oe(this.attPitch+(c?Ae(e.rng,-3,3)*Ce:0),this.minPitchFood,65*Ce),roll:c?Ae(e.rng,-8,8)*Ce:this.cur.roll*.6}))}else if(!this.moving&&!e.quiet&&!e.focus&&!e.gazeLock)if(e.t>=this.nextAt&&(e.freeze<=0||this.burst<0)){const o=this.burst<0;o&&(this.burst=0),this.begin(e,this.pick(e,o))}else e.freeze<=0&&e.t-this.lastStart>.22&&this.lookAtAttention(e)&&Math.hypot((this.attYaw-this.seenYaw)*Math.cos(this.attPitch),this.attPitch-this.seenPitch)>13*Ce&&e.rng()<e.dt*ue(3,9,e.arousal)&&(this.burst=0,this.begin(e,this.pick(e,e.rng()<.5)),this.seenYaw=this.attYaw,this.seenPitch=this.attPitch);if(!this.moving&&this.pursuit>0&&!e.focus&&!e.gazeLock&&e.freeze<=0&&this.lookAtAttention(e)){const o=n.billUp*Ce,c=Oe(this.attYaw,-this.maxYaw,this.maxYaw),l=Oe(this.attPitch*.8+o*.6,this.minPitch,52*Ce),h=Math.hypot((c-this.cur.yaw)*Math.cos(l),l-this.cur.pitch),d=h>14*Ce&&e.t-this.lastStart>.3&&e.rng()<e.dt*5;if(h<28*Ce&&!d){const u=1-Math.exp(-e.dt*3.2*this.pursuit*(.75+.35*Ot(e.t*3.1,31)));this.cur={yaw:this.cur.yaw+(c-this.cur.yaw)*u,pitch:this.cur.pitch+(l-this.cur.pitch)*u,roll:this.cur.roll*(1-u*.5)},this.from={...this.cur},this.to={...this.cur},this.seenYaw=this.attYaw,this.seenPitch=this.attPitch,h>3*Ce&&(this.nextAt=Math.max(this.nextAt,e.t+.25))}else(d||e.t-this.lastStart>.16&&e.rng()<e.dt*10)&&(this.burst=0,this.begin(e,this.pick(e,!0)))}let i,a,r;if(this.moving){const o=(e.t-this.t0)/this.dur;if(o>=1){this.moving=!1,e.saccading=!1,this.cur={...this.to},this.settle=0;const h=Math.abs(this.cur.yaw-this.attYaw)<15*Ce,[d,u]=[ue(n.holdCalm[0],n.holdAlert[0],e.arousal),ue(n.holdCalm[1],n.holdAlert[1],e.arousal)];this.nextAt=e.t+(this.burst<0?.05:this.burst>0?Ae(e.rng,.14,.42):Ux(e.rng,d,u,1.8)*(h?1.15:1)),e.emit("fixate",{yaw:this.cur.yaw,pitch:this.cur.pitch})}const c=Mv(Oe(o,0,1)),l=Math.sin(Math.PI*Oe(o,0,1));i=ue(this.from.yaw,this.to.yaw,c),a=ue(this.from.pitch,this.to.pitch,c)-l*this.amp*.09,r=ue(this.from.roll,this.to.roll,c),t.headShift.y-=l*Math.min(this.amp,1.6)*.012}else{this.settle+=e.dt;const o=Math.exp(-this.settle/.032)*Math.cos(this.settle*24*Math.PI*2)*.04;i=this.cur.yaw+(this.to.yaw-this.from.yaw)*o,a=this.cur.pitch+(this.to.pitch-this.from.pitch)*o,r=this.cur.roll+(this.to.roll-this.from.roll)*o}i+=Ot(e.t*11,11)*.0028+Ot(e.t*.6,12)*.008,a+=Ot(e.t*12,13)*.0028+Ot(e.t*.5,14)*.007,r+=Ot(e.t*.7,15)*.008,t.headYaw+=i,t.headPitch+=a,t.headRoll+=r,t.headShift.x+=Math.sin(i)*.014,t.headShift.z+=(Math.cos(i)-1)*.01-Math.max(a,0)*.018}}class wv{name="blink";t0=-10;full=!1;nextAt=1.5;constructor(e){e.on("saccade",t=>{t.amp>.6&&e.rng()<.45&&e.t-this.t0>.5&&this.start(e,!1)}),e.on("startle",()=>{this.nextAt=e.t+1.2+e.rng()})}start(e,t){this.t0=e.t,this.full=t;const[n,i]=e.species.behaviour.blinkEvery;this.nextAt=e.t+Ae(e.rng,n,i)*ue(1.3,.8,e.arousal)}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&this.start(e,e.rng()<ue(.3,.08,e.arousal));const n=this.full?1.7:1,i=(e.t-this.t0)/n,a=i<0?0:i<.045?re(0,.045,i):i<.07?1:1-re(.07,.165,i);t.nict+=a,t.lidLower+=a*(this.full?1:.3),t.lidUpper+=a*(this.full?.75:.08);const r=re(.3,.05,e.arousal);t.lidUpper+=r*.22,t.lidLower+=r*.18}}class Ev{name="ruffle";kind="puff";t0=-100;nextAt;amp=.6;last=-1e9;constructor(e){const[t,n]=e.species.behaviour.ruffleEvery;this.nextAt=Ae(e.rng,t*.5,n*.6),e.on("startle",()=>{this.t0=-100,this.nextAt=Math.max(e.t+Ae(e.rng,2.8,5),this.last+e.species.behaviour.ruffleEvery[0])})}trigger(e,t,n){const i=e.rng();this.kind=t??(i<.45?"puff":i<.7?"shake":"throat"),this.t0=e.t,this.last=e.t,this.amp=n??Ae(e.rng,.45,.75);const[a,r]=e.species.behaviour.ruffleEvery;this.nextAt=e.t+Ae(e.rng,a,r),e.emit("ruffle",{kind:this.kind})}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&!e.saccading&&(e.arousal<.7?this.trigger(e):this.nextAt=e.t+1);const n=e.t-this.t0;if(n<0||n>3)return;const i=this.amp;if(this.kind==="throat"){const c=re(0,.12,n)*(1-re(.7,1.25,n));t.gorget+=c*.42*i,t.crest+=c*.38*i,t.addLift(.12,.14,c*.25*i),t.headShift.y+=c*.01;return}for(let c=0;c<8;c++){const l=n-c/7*.2;if(l<=0)continue;const h=re(0,.13,l),d=1-re(.62,1.5,l),u=l>.62?.14*Math.sin((l-.62)*13)*Math.exp(-(l-.62)*3.5):0;t.lift[c]+=i*(h*d+u)*ue(.75,1,c/7)}t.crest+=i*.25*re(0,.1,n)*(1-re(.5,1.1,n));const a=re(.14,.24,n)*(1-re(.55,.85,n)),r=(n-.14)*14*Math.PI*2,o=Math.sin(r)*a;t.bodyRoll+=o*.05*i,t.bodyYaw+=Math.cos(r)*a*.035*i,t.tailYaw+=Math.sin(r-1.2)*a*.16*i,t.tailFan+=a*.55*i+re(0,.2,n)*(1-re(.6,1.4,n))*.25*i;for(const c of["L","R"])t.wing[c].lift+=(a*.11+Math.abs(o)*.05)*i+re(0,.2,n)*(1-re(.7,1.5,n))*.06*i,t.wing[c].droop+=a*.07*i;if(t.bodyShift.y+=a*.008,this.kind==="shake"){const c=re(.1,.2,n)*(1-re(.5,.75,n));t.headRoll+=Math.sin(r*1.15+.8)*c*.3*i,t.headYaw+=Math.cos(r*1.15)*c*.16*i,t.nict+=c,t.lidLower+=c*.6,t.headStabil-=c*.5}}}class Tv{name="tail";pitch=new Vi(6.5,.28);fan=new Vi(4.5,.5);yaw=new Vi(5,.4);nextAt;pumps=0;pumpAt=0;constructor(e){const[t,n]=e.species.behaviour.tailEvery;this.nextAt=Ae(e.rng,t*.4,n*.5),e.on("startle",i=>{this.pitch.kick(-5*i.strength),this.fan.kick(14*i.strength)}),e.on("saccade",i=>{i.amp>.9&&this.yaw.kick(-i.dyaw*.5)})}flick(e,t=1){this.pitch.kick(-Ae(e.rng,3,5.5)*t),this.fan.kick(Ae(e.rng,5,11)*t),this.yaw.kick(Ae(e.rng,-1.5,1.5)*t)}update(e,t){if(!e.quiet&&e.t>=this.nextAt&&e.freeze<=0){const[n,i]=e.species.behaviour.tailEvery;this.nextAt=e.t+Ae(e.rng,n,i),this.pumps=e.rng()<.4?1+Math.floor(e.rng()*2):0,this.pumpAt=e.t+.16,this.flick(e)}this.pumps>0&&e.t>=this.pumpAt&&(this.pumps--,this.pumpAt=e.t+Ae(e.rng,.13,.2),this.flick(e,.7)),t.tailPitch+=this.pitch.step(0,e.dt),t.tailFan+=Math.max(this.fan.step(0,e.dt),-.3),t.tailYaw+=this.yaw.step(0,e.dt)}}class Av{name="wings";t0=-100;nextAt;lead=1;amp=1;constructor(e){const[t,n]=e.species.behaviour.wingEvery;this.nextAt=Ae(e.rng,t*.5,n*.6)}shuffle(e){this.t0=e.t,this.lead=e.rng()<.5?1:-1,this.amp=Ae(e.rng,.7,1.2);const[t,n]=e.species.behaviour.wingEvery;this.nextAt=e.t+Ae(e.rng,t,n)}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&this.shuffle(e);const n=e.t-this.t0;if(n<0||n>1.2)return;for(const a of["L","R"]){const r=n-((a==="L"?1:-1)*this.lead>0?0:.07);if(r<=0)continue;const o=re(0,.07,r)*(1-re(.22,.6,r)),c=Math.sin(r*12*Math.PI*2)*re(.05,.1,r)*(1-re(.2,.42,r));t.wing[a].lift+=(o*.2+c*.06)*this.amp,t.wing[a].droop+=o*.1*this.amp}const i=re(0,.08,n)*(1-re(.15,.5,n));t.bodyShift.y+=i*.006,t.addLift(.5,.25,i*.12)}}class Rv{constructor(e){this.mind=e}mind;name="startle";crouch=new Vi(4.2,.42);t0=-100;strength=0;fire(e){const t=this.mind;this.strength=e,this.t0=t.t,t.arousal=Math.max(t.arousal,.6+.4*e),t.freeze=.45+t.rng()*.55,this.crouch.kick(-.9*e),t.emit("startle",{strength:e})}update(e,t){const n=this.crouch.step(0,e.dt);t.bodyShift.y+=n,t.bodyPitch+=-n*2.2,t.headShift.y+=n*.6;const i=e.t-this.t0;if(i<0||i>8)return;const a=this.strength,r=Math.exp(-i/1.6)*Math.min(i/.05,1);t.fluff-=.13*r*a,t.headShift.y+=.02*r*a;const o=Math.exp(-i/.09)*Math.min(i/.03,1);t.wing.L.lift+=o*.42*a,t.wing.R.lift+=o*.42*a,t.lidUpper-=.2*r,t.lidLower-=.2*r}}const Qh=s=>s*s*s*(10+s*(-15+6*s)),ir=.06;class Pv{constructor(e,t,n,i,a,r=null){this.mind=e,this.solver=t,this.headRest=n,this.pick=i,this.swallowed=a,this.hop=r,e.on("startle",()=>{this.carried>=0&&this.swallowed(this.carried),this.carried=-1,this.release(this.mind,"idle"),this.readyAt=this.mind.t+1.5})}mind;solver;headRest;pick;swallowed;hop;name="forage";reachOut=.3;reachIn=.2;catchRadius=.05;state="idle";id=-1;t0=0;dur=.15;decideAt=0;watchUntil=0;readyAt=0;retried=!1;ignore=new Map;target=new v;w=0;wFrom=0;lean=0;yaw=0;rel=new v;focus=new v;licks=3;carried=-1;hopAt=0;moved=new v;seed(e){return e.food.find(t=>t.id===this.id)}slideFor(e){const t=this.rel.copy(e).sub(this.headRest),n=t.length(),i=Math.atan2(t.x,t.z),a=Math.asin(Oe(t.y/Math.max(n,1e-6),-1,1));if(Math.abs(i)>2||a<-.95||a>1.3||e.y<-.12)return null;const r=n-this.solver.billReach;return r>this.reachOut||r<-this.reachIn?null:r}inView(e){const t=this.rel.copy(e).sub(this.headRest);return Math.abs(Math.atan2(t.x,t.z))<2.2&&t.length()<2.2&&e.y>-.9}release(e,t){this.state=t,this.t0=e.t,this.wFrom=this.w,t==="idle"&&(e.focus=null,e.gazeLock=!1,this.id=-1)}begin(e,t,n){this.state=t,this.t0=e.t,this.dur=n,this.wFrom=this.w}update(e,t){const n=e.t,i=Oe((n-this.t0)/this.dur,0,1);let a=this.seed(e);switch(e.eating=this.state!=="idle"&&this.state!=="watch",this.state){case"idle":{if(this.w=Ln(this.w,0,22,e.dt),n<this.readyAt)break;let r=null,o=1/0;for(const c of e.food){if(!this.inView(c.pos)||(this.ignore.get(c.id)??0)>n&&this.slideFor(c.pos)===null||c.vel.lengthSq()<ir*ir&&this.slideFor(c.pos)===null)continue;const l=c.pos.distanceTo(this.headRest)-(this.slideFor(c.pos)!==null?1:0);l<o&&(o=l,r=c)}r&&(this.id=r.id,this.state="watch",this.decideAt=0,this.watchUntil=n+Ae(e.rng,.7,1.5),e.focus=this.focus.copy(r.pos),e.focusId++,e.excite(.25));break}case"watch":{if(this.w=Ln(this.w,0,22,e.dt),!a||!this.inView(a.pos)){this.release(e,"idle");break}if(e.focus=this.focus.copy(a.pos),this.hop?.busy)break;if(this.slideFor(a.pos)===null){if(this.decideAt=0,this.hop&&e.freeze<=0&&(this.hopAt||(this.hopAt=n+Ae(e.rng,.45,1.1)),n>=this.hopAt)){const r=a.pos,o=this.hop.spotFor(c=>this.slideFor(this.moved.copy(r).sub(c))!==null);if(this.hopAt=n+Ae(e.rng,.5,.9),o!==null&&this.hop.go(e,o)){this.watchUntil=Math.max(this.watchUntil,n+3);break}}a.vel.lengthSq()<ir*ir&&(this.watchUntil=Math.min(this.watchUntil,n+.25)),n>this.watchUntil&&(this.ignore.set(a.id,n+Ae(e.rng,25,45)),this.release(e,"idle"),this.readyAt=n+Ae(e.rng,.3,1));break}this.hopAt=0,this.decideAt||(this.decideAt=n+Ae(e.rng,.35,1.1)),n>=this.decideAt&&!e.saccading&&e.freeze<=0&&(e.gazeLock=!0,this.retried=!1,this.begin(e,"windup",Ae(e.rng,.09,.13)),e.emit("strike",{id:a.id}));break}case"windup":{if(!a){this.release(e,"idle");break}const r=Math.sin(i*Math.PI*.5);if(this.rel.copy(a.pos).sub(this.headRest).normalize(),t.headShift.addScaledVector(this.rel,-.03*r),t.bodyShift.y-=.006*r,i>=1){const o=this.slideFor(a.pos)??0;this.lean=o,this.yaw=Math.atan2(a.pos.x-this.headRest.x,a.pos.z-this.headRest.z),this.begin(e,"strike",Oe(.13+Math.abs(o)*.2,.12,.2))}break}case"strike":{if(!a){this.begin(e,"retract",.2);break}this.target.copy(a.pos).addScaledVector(a.vel,(1-i)*this.dur),this.w=this.wFrom+(1-this.wFrom)*(1-Math.pow(1-i,3)),t.jaw+=re(.2,.7,i)*(1-re(.92,1,i)*.88)*.95,i>=1&&(this.solver.tip.distanceTo(a.pos)<this.catchRadius?(this.pick(a.id),this.carried=a.id,e.excite(.1),this.begin(e,"hold",Ae(e.rng,.06,.1))):!this.retried&&this.slideFor(a.pos)!==null?(this.retried=!0,this.begin(e,"strike",.1)):(this.ignore.set(a.id,n+Ae(e.rng,3,5)),this.begin(e,"retract",.22)));break}case"hold":this.w=1,t.jaw+=.1,i>=1&&(e.focus=null,this.licks=2,this.begin(e,"eat",this.licks*.13+.04));break;case"retract":this.w=this.wFrom*(1-Qh(i)),i>=1&&(this.release(e,"idle"),this.readyAt=n+Ae(e.rng,.3,.9));break;case"eat":{this.w=this.wFrom*(1-Qh(Oe((n-this.t0)/.2,0,1)));const r=Oe((n-this.t0)/(this.dur-.04)*this.licks,0,this.licks),o=Math.min(Math.floor(r),this.licks-1),c=r>=this.licks?1:r-o,l=1-o/this.licks,h=1-(o+1)/this.licks,d=Math.sin(Math.PI*re(0,.55,c));t.tongueOut+=Oe((l-.72)/.65*d+.04*d,0,1),t.carryAt=ue(l,h+.04,re(.35,1,c)),t.jaw+=.12+.3*Math.sin(Math.PI*re(0,.7,c))-.08*re(.75,1,c),t.headPitch+=.03*Math.sin(Math.PI*c),i>=1&&this.begin(e,"swallow",Ae(e.rng,.36,.44));break}case"swallow":{this.w=0,t.carryAt=.04;const r=Math.sin(Math.PI*re(0,.55,i))*.26;t.headPitch+=r,t.headShift.y+=r*.03,t.jaw+=Math.sin(Math.PI*re(.1,.5,i))*.45;const o=Math.sin(Math.PI*re(.35,.95,i));t.gorget+=o*.16,t.addLift(.2,.12,o*.12),i>.18&&this.carried>=0&&(this.swallowed(this.carried),e.emit("ate",{id:this.carried}),this.carried=-1),i>=1&&(this.release(e,"idle"),this.readyAt=n+Ae(e.rng,.4,1.3));break}}this.w>.001&&(t.reachTarget.copy(this.target),t.reachWeight=this.w,t.bodyPitch+=this.w*Oe(this.lean*.75,-.16,.24),t.bodyYaw+=this.w*this.yaw*.14,t.bodyShift.y-=this.w*.008,t.headStabil*=1-this.w)}}class Cv{name="mouth";lickEvery=[14,36];singEvery=[30,80];blocked=()=>!1;flicks=[];nextLick;singFrom=-10;singFor=0;bursts=[];nextSing;pump=0;constructor(e){this.nextLick=Ae(e.rng,5,14),this.nextSing=Ae(e.rng,14,34),e.on("ate",()=>{e.rng()<.7&&(this.nextLick=e.t+Ae(e.rng,.25,.6))}),e.on("startle",()=>{this.singFor=0,this.flicks.length=0,this.nextLick=e.t+Ae(e.rng,8,16),this.nextSing=Math.max(this.nextSing,e.t+Ae(e.rng,12,30))})}lick(e,t=Ae(e.rng,.56,.68),n=e.rng()<.45?1:e.rng()<.6?2:3){this.flicks.length=0;let i=e.t;for(let a=0;a<n;a++)this.flicks.push({at:i,amp:a===0?t:t*Ae(e.rng,.8,1.05)}),i+=Ae(e.rng,.21,.3);this.nextLick=e.t+Ae(e.rng,this.lickEvery[0],this.lickEvery[1])}sing(e,t=1.6){this.singFrom=e.t,this.bursts.length=0;let n=.06;for(;n<t-.2||this.bursts.length===0;){const a=3+Math.floor(e.rng()*3),r=Ae(e.rng,13,16.5);this.bursts.push({at:n,notes:a,hz:r,amp:Ae(e.rng,.26,.4)}),n+=a/r+(e.rng()<.25?Ae(e.rng,.32,.5):Ae(e.rng,.1,.22))}const i=this.bursts[this.bursts.length-1];this.singFor=i.at+i.notes/i.hz+.25,this.nextSing=e.t+this.singFor+Ae(e.rng,this.singEvery[0],this.singEvery[1]),this.flicks.length=0,this.nextLick=Math.max(this.nextLick,e.t+this.singFor+Ae(e.rng,1.5,5))}get singing(){return this.singFor>0}update(e,t){const n=!e.quiet&&!e.gazeLock&&!e.focus&&!e.eating&&e.freeze<=0&&!this.blocked();n&&e.t>=this.nextLick&&e.arousal<.6&&!this.singing&&this.lick(e),n&&e.t>=this.nextSing&&!this.singing&&(e.arousal<.42&&this.flicks.length===0?this.sing(e,Ae(e.rng,1.1,2.4)):this.nextSing=e.t+Ae(e.rng,4,9));let i=0;for(const h of this.flicks){const d=(e.t-h.at)/.19;d>=0&&d<=1&&(i=Math.max(i,h.amp*Math.sin(Math.PI*Math.pow(re(0,1,d),.8))))}this.flicks.length&&e.t>this.flicks[this.flicks.length-1].at+.2&&(this.flicks.length=0),i>0&&(t.tongueOut+=Math.min(i,.7),t.tongueCurl+=.16*re(.3,.6,i),t.jaw+=.02*re(0,.3,i));let a=0,r=0,o=0;const c=e.t-this.singFrom;if(this.singFor>0)if(c>this.singFor||this.blocked())this.singFor=0;else for(const h of this.bursts){const d=c-h.at,u=h.notes/h.hz;d<0||d>u||(a=re(0,.03,d)*(1-re(u-.03,u,d)),r=.5-.5*Math.cos(d*h.hz*Math.PI*2),o=h.amp)}this.pump=Ln(this.pump,a,a>this.pump?30:11,e.dt);const l=this.pump;l<.002&&a===0||(t.jaw+=a*o*(.1+.9*r),t.gorget+=l*.2+a*r*.05,t.addLift(.2,.07,l*.16),t.crest-=l*.14,t.addLift(0,.07,-l*.14),t.addLift(.4,.09,-l*.3),t.breath-=l*.7,t.headPitch+=l*.035+a*r*.012,t.headShift.y-=l*.004,t.headShift.z-=l*.003,t.tailPitch-=l*.03)}}const sr=()=>({point:new v,up:new v(0,1,0),tangent:new v(1,0,0),radius:.0405});class Lv{constructor(e,t){this.mind=e,this.ground=t,e.on("startle",n=>{if(this.hold||this.phase!=="stand"||e.eating||e.rng()>.55*n.strength)return;const i=Ae(e.rng,.1,.2)*(e.rng()<.5?-1:1),a=this.clampX(this.x+i);Math.abs(a-this.x)>.06&&this.go(e,a,.05)})}mind;ground;name="hop";maxHop=.35;homeAfter=[14,30];home=0;hold=!1;x=0;phase="stand";t0=0;dur=.1;x0=0;x1=0;apex=.05;from=sr();to=sr();here=sr();tmp=sr();legs=new Vi(5.5,.4);lag=new v;anchor=new v;off=new v;slope=0;scale=1;placed=!1;homeAt=20;lastFood=0;get busy(){return this.phase!=="stand"}clampX(e){return Oe(e,this.ground.range[0],this.ground.range[1])}frame(e,t){return(this.ground.at?.(e,t)??null)||(t.point.set(e,this.ground.root.position.y,this.ground.root.position.z),t.up.set(0,1,0),t.tangent.set(1,0,0),t.radius=this.ground.restRadius),t}reseat(){this.placed=!1}spotFor(e){if(!this.ground.at)return null;const t=this.ground.range[1]-this.ground.range[0];for(let n=.1;n<=t+1e-6;n+=.05)for(const i of[1,-1]){const a=this.x+i*n;if(a<this.ground.range[0]||a>this.ground.range[1])continue;const r=this.ground.at(a,this.tmp);if(r&&e(this.off.copy(r.point).sub(this.here.point)))return this.x+i*Math.min(n,this.maxHop)}return null}place(e,t){return this.x=this.clampX(e),this.frame(this.x,this.here),this.slope=Math.atan2(this.here.tangent.y,this.here.tangent.x),this.scale=this.here.radius/this.ground.restRadius,t.copy(this.here.point),this.x}landed(){this.legs.kick(-1.1),this.follow()}follow(){this.anchor.copy(this.ground.root.position)}go(e,t,n=Ae(e.rng,.07,.11)){if(this.hold||this.phase!=="stand"||(t=this.clampX(Oe(t,this.x-this.maxHop,this.x+this.maxHop)),Math.abs(t-this.x)<.03))return!1;this.x0=this.x,this.x1=t,this.frame(this.x0,this.from),this.frame(this.x1,this.to);const i=this.from.point.distanceTo(this.to.point);return this.apex=Oe(.035+i*.13,.04,.08),this.phase="crouch",this.t0=e.t,this.dur=n,e.excite(.15),!0}update(e,t){const n=this.ground.root;this.placed||(this.placed=!0,this.x=this.clampX(n.position.x),this.frame(this.x,this.here),n.position.copy(this.here.point),this.anchor.copy(n.position),this.slope=Math.atan2(this.here.tangent.y,this.here.tangent.x),this.scale=this.here.radius/this.ground.restRadius);const i=e.t,a=Oe((i-this.t0)/this.dur,0,1);let r=1;switch(e.food.length&&(this.lastFood=i),this.phase==="stand"&&!this.hold&&this.homeAfter[1]>0&&!e.quiet&&!e.eating&&e.freeze<=0&&Math.abs(this.x-this.home)>.12&&i-this.lastFood>4&&i>this.homeAt&&(this.go(e,this.home+(this.x-this.home)*.3),this.homeAt=i+Ae(e.rng,this.homeAfter[0],this.homeAfter[1])),this.phase){case"crouch":{const c=Math.sin(a*Math.PI*.5);t.bodyShift.y-=.022*c,t.bodyPitch+=.07*c,t.wing.L.lift+=.1*c,t.wing.R.lift+=.1*c,a>=1&&(e.emit("perch",{x:this.x0,push:.45,on:!1,side:0}),this.phase="air",this.t0=i,this.dur=Oe(.12+this.from.point.distanceTo(this.to.point)*.38,.12,.25));break}case"air":{n.position.copy(this.from.point).lerp(this.to.point,a),n.position.y+=4*this.apex*a*(1-a),this.slope=ue(Math.atan2(this.from.tangent.y,this.from.tangent.x),Math.atan2(this.to.tangent.y,this.to.tangent.x),a),this.scale=ue(this.from.radius,this.to.radius,a)/this.ground.restRadius;const c=Math.sin(Math.PI*a);r=1-re(0,.2,a)*(1-re(.75,1,a)),t.bodyShift.y+=.014*(1-a)-.012*c+.008*re(.7,1,a),t.bodyPitch+=.07*(1-a)-.04*c;const l=Math.sign(this.x1-this.x0);t.bodyRoll+=-l*.07*c,t.wing.L.lift+=.1+.3*c,t.wing.R.lift+=.1+.3*c,t.wing.L.droop+=.12*c,t.wing.R.droop+=.12*c,t.tailFan+=.5*c,t.tailPitch+=.12*c,t.fluff-=.05*c,a>=1&&(this.x=this.x1,this.frame(this.x,this.here),n.position.copy(this.here.point),this.phase="land",this.t0=i,this.dur=.28,this.legs.kick(-.75),e.emit("perch",{x:this.x1,push:.55,on:!0,side:0}));break}case"land":{const c=1-re(0,1,a);t.wing.L.lift+=.1*c,t.wing.R.lift+=.1*c,t.tailFan+=.3*c,t.tailPitch-=.1*Math.sin(Math.PI*a)*.8,t.addLift(.55,.3,.14*Math.sin(Math.PI*re(0,.8,a))),a>=1&&(this.phase="stand");break}}const o=this.legs.step(0,e.dt);t.bodyShift.y+=o,t.bodyPitch+=-o*1.6,this.anchor.x=Ln(this.anchor.x,n.position.x,this.phase==="air"?9:16,e.dt),this.anchor.y=Ln(this.anchor.y,n.position.y,this.phase==="air"?9:16,e.dt),this.anchor.z=Ln(this.anchor.z,n.position.z,16,e.dt),this.lag.copy(this.anchor).sub(n.position).clampLength(0,.16),t.headShift.add(this.lag),t.feetSlope=this.slope,t.feetScale=this.scale,t.grip=r,t.bodyRoll+=this.slope*.12}}function Dv(s){const e=s.species.wing,t=e.hand+e.primaryLen[1]*.92,n=jn(s.species.seed+501),i=64,a=4,r=new Uint8Array(i*a*4);for(let d=0;d<i;d++){const u=.45+.55*Math.pow(n(),2.2)+(n()<.12?.6:0);for(let f=0;f<a;f++)r.set([255,Math.min(255,u*200),255,255],(f*i+d)*4)}const o=new Ar(r,i,a);o.wrapS=qi,o.magFilter=o.minFilter=jt,o.needsUpdate=!0;const c=new si({color:new pe(e.color).multiplyScalar(1.6),alphaMap:o,vertexColors:!0,transparent:!0,depthWrite:!1,side:Rt,opacity:0}),l=[],h=s.rest.chest.worldPos;for(const d of Zt){const u=pn(d),f=[],p=[],b=[],g=[],m=28,x=6;for(const S of[-24,-8,8,24]){const w=f.length/3;for(let _=0;_<=m;_++){const M=_/m,F=(-98+172*M)*Ce;for(let P=0;P<=x;P++){const I=P/x,D=Math.tan(S*Ce)*I*t*(.6+.4*Math.cos((M-.5)*Math.PI*2));f.push(u*Math.cos(F)*I*t,D+.04*I,Math.sin(F)*I*t);const L=re(.05,.4,I)*(1-re(.8,1,I))*(.5+.9*Math.pow(Math.abs(M*2-1),2.5))*re(0,.06,M)*(1-re(.94,1,M));p.push(1,1,1,L*(Math.abs(S)<10?.5:.36)),b.push(M*2.2,I)}}for(let _=0;_<m;_++)for(let M=0;M<x;M++){const F=w+_*(x+1)+M,P=F+x+1;g.push(F,P,F+1,P,P+1,F+1)}}const E=new St;E.setAttribute("position",new tt(f,3)),E.setAttribute("color",new tt(p,4)),E.setAttribute("uv",new tt(b,2)),E.setIndex(g);const y=new Ft(E,c);y.name=`bird.wingBlur.${d}`,y.frustumCulled=!1,y.visible=!1,y.renderOrder=2,y.position.copy(s.rest[`shoulder.${d}`].worldPos).sub(h),s.bones.chest.add(y),l.push(y)}return{set(d,u=.6){const f=d>.004;for(const p of l)p.visible=f,p.rotation.set(u+(Math.random()-.5)*.16,(Math.random()-.5)*.2,(Math.random()-.5)*.12);f&&(c.opacity=d*(.8+.45*Math.random()),o.offset.x=Math.random())},dispose(){for(const d of l)d.removeFromParent(),d.geometry.dispose();c.dispose(),o.dispose()}}}const ds=2;class Iv{constructor(e,t,n,i,a,r){this.mind=e,this.rig=t,this.root=n,this.hop=i,this.ruffle=a,this.tail=r,this.nextAt=Ae(e.rng,this.every[0],this.every[1]),this.blur=Dv(t)}mind;rig;root;hop;ruffle;tail;name="flee";awayFor=[2,5];every=[70,200];phase="idle";t0=0;dur=.4;side=1;from=new v;out=new v;hover=new v;landAt=new v;far=new v;landX=0;nextAt;blur;shakeAt=-1;get active(){return this.phase!=="idle"}get perched(){return this.phase==="idle"||this.phase==="ready"||this.phase==="land"}get gone(){return this.phase==="away"}start(){const e=this.mind;return this.active||this.hop.busy?!1:(this.hop.hold=!0,e.emit("startle",{strength:1}),e.arousal=1,e.freeze=0,this.phase="ready",this.t0=e.t,this.dur=Ae(e.rng,.3,.48),this.side=e.rng()<.5?1:-1,this.nextAt=e.t+Ae(e.rng,this.every[0],this.every[1]),!0)}go(e,t){this.phase=e,this.t0=this.mind.t,this.dur=t}update(e,t){if(this.phase==="idle"&&(!e.quiet&&e.t>=this.nextAt&&!e.eating&&e.freeze<=0&&this.start(),this.shakeAt>0&&e.t>=this.shakeAt&&(this.shakeAt=-1,this.ruffle.trigger(e,"shake",.7)),this.phase==="idle"))return;const n=this.root,i=Oe((e.t-this.t0)/this.dur,0,1);let a=0,r=0,o=.6;switch(e.gazeLock=this.phase!=="land",this.phase){case"ready":{const c=Math.sin(i*Math.PI*.5);t.bodyShift.y-=.04*c,t.bodyShift.z+=.02*c,t.bodyPitch+=.34*c,t.headShift.y-=.012*c,t.fluff-=.12*c,t.tailFan+=.35*c,t.tailPitch-=.12*c,a=.42*re(0,.8,i);const l=Math.sin(e.t*46*Math.PI)*.05*c;for(const h of["L","R"])t.wing[h].lift+=.25*c+l,t.wing[h].droop+=.08*c;i>=1&&(this.from.copy(n.position),this.out.set(this.side*.55,1,.12).normalize(),e.emit("perch",{x:this.from.x,push:1,on:!1,side:.4}),this.go("takeoff",.27));break}case"takeoff":{n.position.copy(this.from).addScaledVector(this.out,.35*i+7.5*i*i*i),a=ds,r=re(0,.12,i),t.grip=1-re(0,.15,i),t.bodyShift.y+=.03*re(0,.3,i),t.bodyPitch+=ue(.34,.1,re(0,.6,i)),o=.95,t.bodyRoll+=-this.side*.25*i,t.tailFan+=.8,t.tailPitch-=.25,t.fluff-=.14,i>=1&&(n.visible=!1,this.go("away",Ae(e.rng,this.awayFor[0],this.awayFor[1])));break}case"away":{a=ds,i>=1&&(this.landX=this.hop.home+Ae(e.rng,-.12,.12),this.landX=this.hop.place(this.landX,this.landAt),this.hover.copy(this.landAt),this.hover.y+=.2,this.far.copy(this.hover).add(new v(-this.side*Ae(e.rng,3.2,4.4),Ae(e.rng,1.8,3),Ae(e.rng,-1.2,-.3))),n.position.copy(this.far),n.visible=!0,this.go("approach",Ae(e.rng,.42,.55)));break}case"approach":{const c=1-Math.pow(1-i,3);n.position.copy(this.far).lerp(this.hover,c),a=ds,r=1,t.grip=0,t.bodyPitch+=ue(.5,-.32,re(.35,1,i)),o=ue(.9,.35,re(.35,1,i)),t.bodyRoll+=this.side*.3*(1-c),t.tailFan+=ue(.3,1,re(.4,1,i)),t.tailPitch-=.3*re(.4,1,i),t.fluff-=.1,i>=1&&this.go("brake",Ae(e.rng,.45,.62));break}case"brake":{const c=re(.6,1,i);o=.35,n.position.copy(this.hover).lerp(this.landAt,c),n.position.y+=.015*Math.sin(e.t*31)*(1-c),n.position.x+=.008*Math.sin(e.t*23)*(1-c),a=ds,r=1,t.grip=re(.8,1,i)*.5,t.bodyPitch-=ue(.32,.05,c),t.bodyShift.y+=.02*(1-c),t.tailFan+=1,t.tailPitch-=ue(.3,.1,c),i>=1&&(n.position.copy(this.landAt),this.hop.landed(),e.emit("perch",{x:this.landAt.x,push:.85,on:!0,side:Ae(e.rng,-1,1)}),this.tail.flick(e,1.2),this.go("land",.5));break}case"land":{n.position.copy(this.landAt),a=i<.12?ds:1-re(.12,.75,i),r=1-re(0,.14,i),t.grip=.5+.5*re(0,.25,i),t.tailFan+=.8*(1-re(0,.8,i));for(const c of["L","R"])t.wing[c].lift+=.3*Math.sin(Math.PI*re(.5,1,i));i>=1&&(this.phase="idle",this.hop.hold=!1,e.gazeLock=!1,this.shakeAt=e.t+Ae(e.rng,.25,.6),e.freeze=.3);break}}if(a===ds&&r>.9&&Math.random()<.3){a=1,r*=.55;const c=Math.random()<.5;for(const l of["L","R"])t.wing[l].sweep=c?Ae(Math.random,.7,1):-Ae(Math.random,.9,1.25),t.wing[l].raise=(c?-.1:.45)+o*.4}t.wing.L.spread=t.wing.R.spread=a,this.blur.set(r,o),this.hop.follow()}dispose(){this.blur.dispose()}}const Nv=[[.44,-.5],[.52,-.25],[.38,-.65]];class Fv{constructor(e,t,n){this.billReach=n,this.nextAt=Ae(e.rng,this.every[0]*.6,this.every[1]*.7);const i={p:new v,n:new v,t:new v};for(const a of["L","R"])for(const[r,o]of Nv){const c=t.loft.wingAt(r,o,pn(a));t.loft.surface(c.s,c.ang,i),this.spots[a].push(i.p.clone().addScaledVector(i.n,this.tipOff))}this.coord=t.loft.bodyCoord(3.4),this.hips=t.rest.hips.worldPos.clone(),this.headRest=t.rest.head.worldPos.clone(),e.on("startle",()=>{this.active&&(e.gazeLock=!1),this.active=!1})}billReach;name="preen";auto=!1;every=[22,55];blocked=()=>!1;onDone=null;active=!1;wingOut=.44;wingTwist=.42;billDir=new v(.12,-.86,-.5).normalize();billOut=new v(.3,-.92,.05).normalize();tipOff=.03;bodyYaw=.22;bodyRoll=.1;bodyPitch=.06;headRoll=1.2;t0=0;dur=4;side="L";nextAt;coord;hips;headRest;spots={L:[],R:[]};spot=new v;seed=0;tBreak=0;order=[0,1,2];q=new pt;e=new qn;d=new v;a=new v;b=new v;start(e,t){return this.active||this.blocked()||e.eating?!1:(this.active=!0,this.t0=e.t,this.dur=Ae(e.rng,4,5),this.side=t??(e.rng()<.5?"L":"R"),this.seed=e.rng()*100,this.tBreak=Ae(e.rng,.42,.58),this.order=e.rng()<.5?[0,1,2]:[2,0,1],this.spot.copy(this.spots[this.side][this.order[0]]),this.nextAt=e.t+this.dur+Ae(e.rng,this.every[0],this.every[1]),!0)}update(e,t){if(!this.active&&(this.auto&&!e.quiet&&e.t>=this.nextAt&&(e.arousal<.5&&e.freeze<=0&&!e.focus&&!e.saccading?this.start(e):this.nextAt=e.t+2),!this.active))return;const n=e.t-this.t0,i=this.dur;if(n>=i||this.blocked()){this.active=!1,e.gazeLock=!1,n>=i&&this.onDone?.(e);return}e.gazeLock=!0;const a=pn(this.side),r=(R,U)=>re(R,U,n),o=i-1.3,c=r(0,.42)*(1-r(i-.6,i-.1)),l=r(.12,.7)*(1-r(i-.95,i-.25)),h=r(.22,.8)*(1-r(o+.2,o+.9)),d=r(.5,.95)*(1-r(o+.18,o+.65)),u=.95,f=ue(u+.3,o,this.tBreak);let p=r(u-.1,u+.22)*(1-r(o,o+.24));p*=1-.75*r(f-.16,f)*(1-r(f+.08,f+.3));const b=ue(f,o,.55),g=this.order[n<f?0:n<b?1:2];this.spot.lerp(this.spots[this.side][g],1-Math.exp(-e.dt*(n<f+.3?14:7)));const m=re(.8,1,p),x=n*9.5*Math.PI*2+this.seed,E=re(-.15,.35,Math.sin(n*5.1+this.seed)+.6*Math.sin(n*2.3+this.seed*1.7)),y=Math.sin(x)*m*E,S=Math.sin(x*.5+1.3)*m*E,w=a*this.bodyYaw*l,_=a*this.bodyRoll*l,M=this.bodyPitch*l;t.bodyYaw+=w,t.bodyRoll+=_,t.bodyPitch+=M,t.bodyShift.x+=a*.012*l,t.tailYaw+=-a*.14*l,t.tailFan+=.12*l,this.e.set(t.bodyPitch,t.bodyYaw,t.bodyRoll,"YXZ"),this.q.setFromEuler(this.e);const F=R=>R.sub(this.hips).applyQuaternion(this.q).add(this.hips).add(t.bodyShift),P=t.wing[this.side];P.out+=c*this.wingOut+y*.012+.03*m*Math.sin(n*3.1+this.seed),P.twist+=c*this.wingTwist+S*.015,P.lift+=c*.05,t.wing[this.side==="L"?"R":"L"].lift+=.05*l;const I=this.d.copy(this.billDir);I.x*=a;const D=this.a.copy(this.spot).addScaledVector(I,-this.billReach);this.b.copy(this.billOut),this.b.x*=a,I.lerp(this.b,1-p).normalize(),D.addScaledVector(I,this.billReach+y*.014),D.z+=S*.006,D.y+=S*.005,F(D),I.applyQuaternion(this.q),t.reachTarget.copy(D),t.reachDir.copy(I),t.reachPin=1,t.reachRoll=a*(this.headRoll+.05*S),t.reachWeight=d,t.headYaw=ue(t.headYaw,a*100*Ce+t.bodyYaw,h),t.headPitch=ue(t.headPitch,-52*Ce,h),t.headRoll=ue(t.headRoll,a*.15,h);const L=this.b.copy(this.spot).addScaledVector(this.d.copy(this.billDir).setX(this.billDir.x*a),-this.billReach);F(L).sub(this.headRest),t.headShift.addScaledVector(L,h*.8),t.headStabil=ue(t.headStabil,.3,h),t.jaw+=(.1+.16*(.5+.5*Math.sin(x+.6)))*m*E,t.nict+=.45*m,t.lidLower+=.3*m,t.lidUpper+=.15*m,t.addLift(this.coord,.09,m*(.08+.04*Math.abs(y))),t.fluff+=.04*l}}function Uv(s={}){const e=s.species??Tn,t=new Pn;t.name="bird";const n=Zx(e);t.add(n.rootBone);const i=uv(n),{material:a,uniforms:r}=pv(),o=new kn(i.contour,a);o.name="bird.contour";const c=new kn(i.flight,a);c.name="bird.flight";const l=new kn(i.fuzz,a);l.name="bird.fuzz",l.frustumCulled=!1,l.bind(n.skeleton,new Xe),l.receiveShadow=!0;const h=mv(r);for(const k of[o,c])k.customDepthMaterial=h,k.castShadow=!0,k.frustumCulled=!1,k.bind(n.skeleton,new Xe),k.receiveShadow=!0;const d=gv(n);t.add(o,c,l,...d.meshes);const u=new uu,f=_v(n,r),p=new xv(e,s.seed??e.seed),b=new Rv(p),g={root:t,at:null,range:[0,0],restRadius:e.legs.perchRadius},m=new Lv(p,g),x=new Pv(p,f,n.rest.head.worldPos.clone(),k=>N.onPick?.(k),k=>N.onSwallow?.(k),m),E=new Cv(p),y=new Ev(p),S=new Tv(p),w=new Iv(p,n,t,m,y,S),_=new Av(p),M=new Fv(p,n,f.billReach);E.blocked=()=>w.active||m.busy||M.active;const F=()=>E.blocked()||x.state!=="idle";M.blocked=()=>w.active||m.busy||p.eating||x.state!=="idle",M.onDone=k=>{_.shuffle(k),k.rng()<.5&&y.trigger(k,"puff",.35)};const P=[new vv(p),new yv,new Sv(p),new wv(p),y,S,_,x,E,M,m,b,w];let I=[];const D=[],L=n.rest.head.worldPos.clone(),R=new v,U=new Xe;let z=null;const N={root:t,species:e,rig:n,pose:u,mind:p,layers:P,layer:k=>{const V=P.find(X=>X.name===k);if(!V)throw new Error(`no layer ${k}`);return V},plumage:r,feathers:{contour:o,flight:c,fuzz:l},headPosition:k=>n.bones.head.getWorldPosition(k),onPose:null,flee:()=>w.start(),preen:k=>M.start(p,k),get preening(){return M.active},get fleeing(){return w.active},get away(){return w.gone},get perched(){return w.perched},sing:k=>!F()&&(E.sing(p,k),!0),get singing(){return E.singing},lick:(k,V)=>!F()&&(E.lick(p,k,V),!0),hopTo:k=>!F()&&m.go(p,k),hopBy:k=>N.hopTo(m.x+k),get busy(){return F()},ruffle:(k,V)=>y.trigger(p,k,V),update(k){t.updateWorldMatrix(!0,!1),U.copy(t.matrixWorld).invert(),p.attention=z?R.copy(z).applyMatrix4(U):null,p.food.length=0;for(let V=0;V<(w.active||M.active?0:I.length);V++){const X=D[V]??={id:0,pos:new v,vel:new v};X.id=I[V].id,X.pos.copy(I[V].position).applyMatrix4(U),X.vel.copy(I[V].velocity).transformDirection(U).multiplyScalar(I[V].velocity.length()),p.food.push(X)}p.step(k,L),u.reset();for(const V of P)V.update(p,u);N.onPose?.(u,p),f(u)},setAttention(k){z=k},setFood(k){I=k},setPerch(k,V){g.at=k,g.range=V,m.reseat()},onPick:null,onSwallow:null,billTip(k){return k.copy(f.carry).applyMatrix4(t.matrixWorld)},startle(k=1){w.active||(b.fire(Math.min(Math.max(k,0),1)),k>=.9&&!p.quiet&&p.rng()<.22&&w.start())},dispose(){i.contour.dispose(),i.flight.dispose(),i.fuzz.dispose(),a.dispose(),h.dispose(),w.dispose(),d.dispose(),n.skeleton.dispose(),B?.()}},B=kv(N);return N.update(0),N}function kv(s){if(typeof window>"u")return null;const e=new URLSearchParams(window.location.search);window.__bird=s;const t=p=>e.has(p)?Number(e.get(p)):null,n={front:[0,22,0],profile:[88,16,0],up:[10,40,8],back:[-110,10,0],three:[38,20,-4]},i=e.get("pose");i&&n[i]&&(s.mind.pinGaze=n[i]);const a=e.get("gaze");if(a){const[p=0,b=0,g=0]=a.split(",").map(Number);s.mind.pinGaze=[p,b,g]}if(e.has("quiet")&&(s.mind.quiet=!0),e.has("sing")){const p=s.onPose;let b=1;s.onPose=(g,m)=>{p?.(g,m),m.t>b&&!s.singing&&s.sing(1.8)&&(b=m.t+4)}}const r=t("jaw"),o=t("tongue"),c=t("arousal"),l=t("fluff"),h=t("spread"),d=t("fan"),u=t("blink");if(c!==null||l!==null||h!==null||d!==null||u!==null||r!==null||o!==null){const p=s.onPose;s.onPose=(b,g)=>{p?.(b,g),r!==null&&(b.jaw=r),o!==null&&(b.tongueOut=o),c!==null&&(g.arousal=g.baseline=c),l!==null&&(b.fluff=l),h!==null&&(b.wing.L.spread=b.wing.R.spread=h),d!==null&&(b.tailFan=d),u!==null&&(b.nict=b.lidLower=b.lidUpper=u)}}e.has("nofuzz")&&s.root.traverse(p=>p.name==="bird.fuzz"&&(p.visible=!1)),e.has("noflash")&&(s.plumage.uFlash.value=s.plumage.uGlint.value=0),e.has("skin")&&s.root.traverse(p=>p.name.match(/contour|flight|fuzz/)&&(p.visible=!1)),e.has("wire")&&s.root.traverse(p=>{const b=p.material;p.name==="bird.skin"&&b&&(b.wireframe=!0,b.color.set(16777215),b.emissive.set(8947848))});let f=null;return e.has("bones")&&(f=new Bp(s.rig.rootBone),f.material.depthTest=!1,f.renderOrder=10,s.root.add(f)),()=>{f?.dispose()}}const Ov={tui:{length:300,mass:125,wing:154.5,tail:119.9,billF:24.5,billS:33.5,thl:63.3,tarsus:38.3},korimako:{length:200,mass:34,wing:90.5,tail:86.2,billF:14.2,billS:20.8,thl:41.1,tarsus:26.4},piwakawaka:{length:160,mass:8,wing:74.9,tail:95.5,billF:7.6,billS:11.4,thl:24.5,tarsus:19.2,est:"THL from Tasmanian birds (no NZ figure); bill F from NI live birds"},tauhou:{length:120,mass:13,wing:61.4,tail:46.2,billF:9.9,billS:13,thl:28,tarsus:17.5},miromiro:{length:130,mass:11,wing:73.1,tail:52.3,billF:10.2,billS:13.7,thl:31.4,tarsus:22.5},toutouwai:{length:180,mass:35,wing:93.3,tail:66.2,billF:13.8,billS:19.8,thl:41.9,tarsus:35.4,est:"bill F from South Island robin (no longipes figure)"},hihi:{length:180,mass:36.5,wing:103,tail:73.9,billF:14.8,billS:21.5,thl:43.6,tarsus:28.2,est:"bill F = bill S x 0.69 (no figure)"},kereru:{length:500,mass:630,wing:262.8,tail:193.6,billF:17,billS:20.5,thl:62,tarsus:34.8,est:"bill S and THL scaled from photographs (no figure)"}},xi=Math.PI/180,zv=1.75,Bv=(s,e,t)=>{const n=s.z-e.z,i=s.y-e.y;return{z:e.z+n*Math.cos(t)-i*Math.sin(t),y:e.y+n*Math.sin(t)+i*Math.cos(t)}},Dt=Tn.sections,Ts={y:Dt[0].y,z:Dt[0].z},Sr={y:Dt[5].y,z:Dt[5].z},Gv=Math.hypot(Sr.y-Ts.y,Sr.z-Ts.z),Ao=Math.atan2(Sr.y-Ts.y,Sr.z-Ts.z),Hv=Math.max(...Dt.slice(0,6).map(s=>s.rd+s.rv)),Vv=Math.max(...Dt.slice(0,6).map(s=>s.w)),Si=Dt[10].a*xi,Ro=(()=>{const s=new Jc(Tn),e={y:Dt[10].y,z:Dt[10].z};let t=0,n=-1/0,i=1/0,a=0;const r=new v;for(let o=6.6;o<=10;o+=.05)for(let c=0;c<Math.PI*2;c+=.05){s.point(o,c,r);const l=r.z-e.z,h=r.y-e.y,d=l*Math.cos(Si)+h*Math.sin(Si),u=-l*Math.sin(Si)+h*Math.cos(Si);t=Math.min(t,d),o>=7.4&&(n=Math.max(n,u),i=Math.min(i,u)),a=Math.max(a,Math.abs(r.x))}return{len:-t,h:n-i,w:2*a}})();function Wv(s,e){const t=zv/s.length,n=(s.thl-s.billF)*t,a=((s.length-s.billF-s.tail)*t-n)*(e.torso??1),r=e.depth*a,o=e.width*r,c=e.headH*n,l=e.headW*c,h=a/Gv,d=r/Hv,u=o/2/Vv,f=e.posture*xi-Ao,p=Dt.map(_e=>({..._e})),b={z:Math.cos(Ao),y:Math.sin(Ao)},g={z:-b.y,y:b.z},m=_e=>{const fe=_e.z-Ts.z,Ne=_e.y-Ts.y,ke=fe*b.z+Ne*b.y,$=fe*g.z+Ne*g.y,Le={z:ke*h*b.z+$*d*g.z,y:ke*h*b.y+$*d*g.y};return Bv(Le,{y:0,z:0},f)};for(let _e=0;_e<=5;_e++){const fe=m(Dt[_e]);p[_e]={y:fe.y,z:fe.z,a:Dt[_e].a+f/xi,w:Dt[_e].w*u,rd:Dt[_e].rd*d,rv:Dt[_e].rv*d}}const x=m({y:Tn.wing.shoulder[1],z:Tn.wing.shoulder[2]}),E=n/Ro.len,y=c/Ro.h,S=l/Ro.w,w=-e.headPitch*xi,_={y:Dt[10].y,z:Dt[10].z},M=Math.cos(Si),F=Math.sin(Si),P=_e=>{const fe=_e.z-_.z,Ne=_e.y-_.y,ke=(fe*M+Ne*F)*E,$=(-fe*F+Ne*M)*y;return{z:ke*Math.cos(w)-$*Math.sin(w),y:ke*Math.sin(w)+$*Math.cos(w)}},I=[];for(let _e=7;_e<=10;_e++){const fe=P(Dt[_e]),Ne=Math.abs(Dt[_e].a*xi-Si),ke=y*Math.cos(Ne)**2+E*Math.sin(Ne)**2;I.push({y:fe.y,z:fe.z,a:Dt[_e].a+(w-Si)/xi,w:Dt[_e].w*S,rd:Dt[_e].rd*ke,rv:Dt[_e].rv*ke})}const D={z:-n*Math.cos(w),y:-n*Math.sin(w)},L=p[5],R={z:L.z+e.neck[0]*n,y:L.y+e.neck[1]*n},U={z:R.z-D.z,y:R.y-D.y};for(let _e=0;_e<4;_e++){const fe=I[_e];p[7+_e]={...fe,y:fe.y+U.y,z:fe.z+U.z}}const z=p[7],N=e.shoulder??.2,B=p[5];p[5]={...B,rd:_i(B.rd,z.rd*1.15,N),rv:_i(B.rv,z.rv*1.15,N),w:_i(B.w,z.w*1.1,N)},p[6]={y:_i(L.y,z.y,.5)+.04*r,z:_i(L.z,z.z,.5)-.02*r,a:(L.a+z.a)/2,w:_i(L.w,z.w,.55),rd:_i(L.rd,z.rd,.55)*.97,rv:_i(L.rv,z.rv,.55)*.97};const k=s.tarsus*t,V=k*Math.cos(e.heel*xi),X=-k*Math.sin(e.heel*xi),Y={...Tn,sections:p},de=new Jc(Y),W=new v;let J={y:1/0,z:0};for(let _e=1.2;_e<=4.4;_e+=.05)de.point(_e,0,W),W.y<J.y&&(J={y:W.y,z:W.z});const te=V*(1-e.cover)-J.y,ce=X+.25*k-J.z;for(const _e of p)_e.y+=te,_e.z+=ce;const ee=[Tn.wing.shoulder[0]*u,x.y+te,x.z+ce],ye=p[10].rd*.15;return{k:t,sections:p,shoulder:ee,heelPoint:[Tn.legs.hip[0]*u,V,X],wingScale:h,bodyScale:d,bill:{length:s.billF*t+ye,radius:e.billDepth*s.billF*t/2,droop:e.billDroop*s.billF*t},tail:{length:[e.tailShape[0]*s.tail*t,e.tailShape[1]*s.tail*t],width:e.tailWidth*s.tail*t,droop:e.tailDroop},legs:{spread:Tn.legs.spread*u,toe:Math.min(e.toe*k,.11),thick:.045*k},eyeRadius:e.eye*n/2,chord:s.wing*t,target:{torso:a,head:n,headH:c,depth:r,tarsus:k,wing:s.wing*t,tail:s.tail*t,bill:s.billF*t}}}function _i(s,e,t){return s+(e-s)*t}function he(s){return{width:.03,aspect:2.2,rowStep:.29,tilt:12,lift:1,cup:.3,round:.7,loose:.4,fuzz:.3,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:4,iriAlign:0,jitter:.45,...s}}function ed(s,e,t){const n=(a,r)=>a>>r&255,i=a=>Math.round(n(s,a)+(n(e,a)-n(s,a))*t)<<a;return i(16)|i(8)|i(0)}const bt=Tn;function Pi(s,e,t){const n=structuredClone(bt),i=Wv(Ov[s],e),a={...n.wing,...t.wing??{}};a.shoulder=i.shoulder,a.upper=bt.wing.upper*i.wingScale,a.fore=bt.wing.fore*i.wingScale,a.hand=bt.wing.hand*i.wingScale;const r=Math.max((i.chord-a.hand)/.92,.2);a.primaryLen=[r*.62,r],a.secondaryLen=[r*.6,r*.55],a.primaryWidth=bt.wing.primaryWidth*i.wingScale,a.secondaryWidth=bt.wing.secondaryWidth*i.wingScale,a.rest={...a.rest,width:a.rest.width.map(h=>h*i.bodyScale),height:a.rest.height*i.bodyScale},a.chord=i.chord;const o={...t.looks},c=i.tail.length[0],l=(h,d,u)=>{const f=o[h];f&&f.width*f.aspect<d*c&&(o[h]={...f,aspect:u,width:d*c/u,loose:Math.min(f.loose??.4,.3),tilt:Math.min(f.tilt,6)})};l("undertail",.28,3.2),l("covert",.2,3);for(const h of["body","belly","flank","back","scapular","breast","throat","head","face","band","saddle","gold"]){const d=o[h];d&&(o[h]={...d,width:d.width*.85,base:ed(d.base,d.tip,.25),tip:ed(d.tip,d.base,.25)})}return{...n,...t,looks:o,sections:i.sections,eye:{...t.eye,radius:i.eyeRadius},bill:{...t.bill,...i.bill},wing:a,tail:{...n.tail,...t.tail??{},length:i.tail.length,width:i.tail.width,droop:i.tail.droop},legs:{...n.legs,...t.legs??{},hip:i.heelPoint,spread:i.legs.spread,toe:i.legs.toe,thick:i.legs.thick,perchRadius:n.legs.perchRadius},behaviour:{...n.behaviour,...t.behaviour??{}},scruff:t.scruff??.15,faceTaper:t.faceTaper??.45}}function Ci(s){return[{name:"belly",look:"belly",region:{kind:"band",s:[0,4.6],phi:[0,.45],soft:.6}},{name:"flank",look:"flank",region:{kind:"band",s:[1.2,4.4],phi:[.3,.52],soft:.5}},{name:"back",look:"back",region:{kind:"band",s:[.9,6.3],phi:[.55,1]}},{name:"scapular",look:"scapular",region:{kind:"band",s:[3.7,5.6],phi:[.56,.84],soft:.3}},{name:"wingPit",look:"down",region:{kind:"blob",at:[3.8,.44],r:[.3,.035],soft:.5}},{name:"tailCoverts",look:"covert",region:{kind:"band",s:[0,1.15],phi:[0,1]}},{name:"undertail",look:"undertail",region:{kind:"band",s:[0,1.35],phi:[0,.4],soft:.3}},{name:"breast",look:"breast",region:{kind:"band",s:[4.3,6.4],phi:[0,.42],soft:.5}},{name:"throat",look:"throat",region:{kind:"band",s:[6.2,8.4],phi:[0,.38],soft:.4}},{name:"head",look:"head",region:{kind:"band",s:[6.3,11],phi:[.36,1],soft:.3}},{name:"face",look:"face",region:{kind:"blob",at:[8.6,.35],r:[1.4,.3],soft:.3}},...s]}const Li={breathHz:[1.9,3.2],holdCalm:[.7,2.6],holdAlert:[.3,1.1],saccade:[.05,5e-4],neckShare:[.28,.32],blinkEvery:[2.2,6.5],ruffleEvery:[40,90],tailEvery:[3,8],wingEvery:[8,18],billUp:6},Di={tui:{posture:58,depth:.7,width:.8,headH:.72,headW:.85,headPitch:8,neck:[.1,.2],billDepth:.3,billDroop:.14,eye:.17,tailDroop:70,tailShape:[1,.94],tailWidth:.19,heel:25,cover:.45,toe:.7},korimako:{posture:30,depth:.7,width:.82,headH:.8,headW:.85,headPitch:4,neck:[.15,.25],billDepth:.31,billDroop:.1,eye:.2,tailDroop:15,tailShape:[.96,1],tailWidth:.2,heel:30,cover:.5,toe:.7},piwakawaka:{posture:34,depth:.95,width:.85,headH:1.05,headW:.9,headPitch:0,neck:[.05,.2],billDepth:.45,billDroop:.03,eye:.25,tailDroop:48,tailShape:[1,.85],tailWidth:.17,heel:20,cover:.55,toe:.7,torso:1.3},tauhou:{posture:35,depth:.78,width:.85,headH:.9,headW:.9,headPitch:2,neck:[.1,.25],billDepth:.35,billDroop:.08,eye:.23,tailDroop:35,tailShape:[1,1],tailWidth:.2,heel:25,cover:.5,toe:.7},miromiro:{posture:25,depth:.8,width:.9,headH:1.1,headW:.95,headPitch:0,neck:[.05,.3],billDepth:.4,billDroop:.04,eye:.22,tailDroop:15,tailShape:[1,1],tailWidth:.2,heel:25,cover:.5,toe:.75},toutouwai:{posture:60,depth:.7,width:.82,headH:.92,headW:.88,headPitch:0,neck:[.1,.4],billDepth:.33,billDroop:.04,eye:.22,tailDroop:62,tailShape:[1,.97],tailWidth:.2,heel:15,cover:.25,toe:.7},hihi:{posture:22,depth:.82,width:.82,headH:.8,headW:.85,headPitch:4,neck:[.12,.25],billDepth:.3,billDroop:.12,eye:.18,tailDroop:-8,tailShape:[1,.95],tailWidth:.19,heel:30,cover:.5,toe:.7},kereru:{posture:50,depth:.6,width:.85,headH:.86,headW:.8,headPitch:8,neck:[.1,1.1],billDepth:.42,billDroop:.1,eye:.14,tailDroop:55,tailShape:[.92,1],tailWidth:.2,heel:20,cover:.7,toe:1,shoulder:.5}},qv=Pi("tui",Di.tui,{name:"Prosthemadera novaeseelandiae",seed:2201,eye:{s:7.85,phi:.56,inset:.84},bill:{color:657931},skin:1315088,shading:{flank:.75,under:.7,patch:.25,gold:5913620,goldAmount:.3},looks:{body:he({width:.0252,base:723984,tip:1579809,iri:2775702,iriGraze:5909126,iriStrength:.2,iriPower:6,sparkle:.5}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.5,base:1183243,tip:2498071,iri:2771546,iriGraze:3811914,iriStrength:.07,sparkle:.6}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:1445641,tip:3088918,iri:3820090,iriGraze:4864554,iriStrength:.04}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:1446416,tip:3156004}),back:he({width:.0252,base:1314570,tip:3154966,iri:3832378,iriGraze:9067034,iriStrength:.19,iriPower:7,loose:.32,sparkle:.45}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:1249035,tip:2892568,iri:3836490,iriGraze:8018458,iriStrength:.18,iriPower:6}),breast:he({width:.0252,aspect:2,rowStep:.3,loose:.29,base:658190,tip:1382173,iri:2778278,iriGraze:6961840,iriStrength:.21,iriPower:6,iriAlign:.2,iriAim:[0,-.2,1],sparkle:.5}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.35,base:526604,tip:1250587,iri:2781366,iriGraze:8010448,iriStrength:.28,iriPower:7,iriAlign:.3,iriAim:[0,-.3,1],sparkle:.45}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.27,fuzz:.2,base:526605,tip:1250844,iri:2787994,iriGraze:6961824,iriStrength:.25,iriPower:7,sparkle:.4}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.43,fuzz:.5,base:394759,tip:921362,iri:2775690,iriGraze:3811946,iriStrength:.1}),lace:he({width:.0045,aspect:8,rowStep:.2,tilt:10,lift:.7,cup:.05,round:.15,loose:1,fuzz:.6,base:723983,tip:7237742,jitter:1}),poi:he({width:.02,aspect:2.6,rowStep:.1,tilt:72,lift:2,cup:1,round:.4,loose:1,fuzz:1,base:13158336,tip:16645367,jitter:1.1}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1249035,tip:2760724,iri:3832394,iriGraze:6969898,iriStrength:.14,iriPower:6}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.5,base:1052173,tip:2235930}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1052690,tip:2105382,iri:3824266,iriGraze:4864618,iriStrength:.16,iriPower:6,sparkle:.5})},tracts:Ci([{name:"lace",look:"lace",region:{kind:"band",s:[5.5,6.4],phi:[.66,.97],soft:.9}},{name:"poi",look:"poi",region:{kind:"blob",at:[6.85,.07],r:[.36,.042],soft:.25}}]),wing:{...bt.wing,color:1381394,sheen:3816530,bar:{rows:[.66,1],v:[-.1,.7],base:13158594,tip:16053486}},tail:{...bt.tail,rectrices:6,color:1184792},legs:{...bt.legs,color:1315088},behaviour:{...Li,billUp:8}}),Xv=Pi("korimako",Di.korimako,{name:"Anthornis melanura",seed:2202,eye:{s:7.85,phi:.56,inset:.84,iris:11739676},bill:{color:1118224},skin:2762272,shading:{flank:.8,under:.85,patch:.22,gold:6972448,goldAmount:.25},looks:{body:he({width:.0252,base:1975308,tip:3818522,iri:6982186,iriGraze:9075242,iriStrength:.06}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.54,base:3422234,tip:7105594}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:3159578,tip:6185520}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:2763290,tip:4868656}),back:he({width:.0252,base:2633746,tip:5003810,iri:5929514,iriGraze:6973978,iriStrength:.08,loose:.32}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2501650,tip:4740128}),breast:he({width:.0252,aspect:2.1,loose:.43,base:2896150,tip:5660208}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.36,base:2895893,tip:5923376}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.29,fuzz:.2,base:1712142,tip:3424026,iri:5913256,iriGraze:2775720,iriStrength:.22,iriPower:5,sparkle:0}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:1580048,tip:3028e3,iri:6961856,iriGraze:2771632,iriStrength:.18,iriPower:5,sparkle:0}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2765332,tip:5661226}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.54,base:4868650,tip:9079386}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1711122,tip:3422752})},tracts:Ci([]),wing:{...bt.wing,color:1710612,sheen:3820074,bar:{rows:[0,.3],v:[.2,1.02],base:12103776,tip:15261856}},tail:{...bt.tail,rectrices:6,color:1711124},legs:{...bt.legs,color:3814440},behaviour:{...Li,billUp:7}}),Kv=Pi("piwakawaka",Di.piwakawaka,{name:"Rhipidura fuliginosa",seed:2203,eye:{s:7.85,phi:.56,inset:.84},bill:{color:855052},skin:2761760,shading:{flank:.82,under:.9,patch:.2,gold:6967328,goldAmount:.1},looks:{body:he({width:.0252,base:2761756,tip:5523512}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:6965800,tip:13146718}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:5914146,tip:11435592}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:4864554,tip:9071178}),back:he({width:.0252,base:2761752,tip:5524020,loose:.36}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2630166,tip:5129264}),breast:he({width:.0252,aspect:2.1,loose:.47,base:6965802,tip:12752480}),band:he({width:.0218,aspect:2,loose:.32,base:723466,tip:1710102}),throat:he({width:.02,aspect:1.9,rowStep:.32,loose:.5,fuzz:.6,base:12235944,tip:15920868}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.5,loose:.32,fuzz:.25,base:2499102,tip:4867132}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.43,fuzz:.4,base:1446927,tip:2762272}),stripe:he({width:.012,aspect:2.6,rowStep:.24,tilt:6,lift:.2,cup:.15,round:.5,loose:.95,fuzz:1,base:11841962,tip:15921386}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2235412,tip:4076582}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:9071168,tip:14200954}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1841172,tip:3419170})},tracts:Ci([{name:"band",look:"band",region:{kind:"band",s:[5.55,6.2],phi:[0,.4],soft:.25}},{name:"throat",look:"throat",region:{kind:"band",s:[6.2,8.3],phi:[0,.3],soft:.3}},{name:"brow",look:"stripe",region:{kind:"streak",from:[9.2,.66],to:[7.7,.64],r:[.16,.028]}},{name:"earSpot",look:"stripe",region:{kind:"blob",at:[7.2,.56],r:[.22,.03]}}]),wing:{...bt.wing,color:1709586,sheen:3814440,bar:{rows:[.55,.8],v:[-1.02,1.02],base:10127978,tip:14208176}},tail:{...bt.tail,rectrices:6,restFan:1.6,maxFan:15,color:1184016,outer:{from:.75,color:14210252}},legs:{...bt.legs,color:1709586},behaviour:{...Li,breathHz:[3,4.6],holdCalm:[.25,1.1],holdAlert:[.15,.6],saccade:[.035,4e-4],tailEvery:[.6,2.2],wingEvery:[3,8],billUp:4}}),jv=Pi("tauhou",Di.tauhou,{name:"Zosterops lateralis",seed:2204,eye:{s:7.85,phi:.56,inset:.84,iris:5913124},bill:{color:2762276},skin:3814448,shading:{flank:.85,under:.9,patch:.2,gold:6972448,goldAmount:.1},looks:{body:he({width:.0252,base:3818520,tip:7240754}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.58,base:9341564,tip:14867920}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:8014378,tip:13011544}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:6974042,tip:11184280}),back:he({width:.0252,base:4080672,tip:7108664,loose:.36}),saddle:he({width:.0269,aspect:2.3,loose:.4,base:4737098,tip:8947850}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:4868680,tip:8684670}),breast:he({width:.0252,aspect:2.1,loose:.5,base:8026218,tip:13157554}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.43,base:6973994,tip:12894810}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.32,fuzz:.25,base:3818520,tip:7109168}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:3027988,tip:5660714}),ring:he({width:.011,aspect:1.8,rowStep:.22,tilt:5,lift:.15,cup:.3,round:.9,loose:.3,fuzz:.3,base:14605526,tip:16777215}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:4080160,tip:6976568}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:10132106,tip:15262934}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:2764312,tip:5660718})},tracts:Ci([{name:"saddle",look:"saddle",region:{kind:"band",s:[3.6,6],phi:[.62,1],soft:.4}},{name:"ring",look:"ring",region:{kind:"blob",at:[7.85,.56],r:[.42,.055],pow:2,soft:.1}}]),wing:{...bt.wing,color:2500634,sheen:5925418},tail:{...bt.tail,rectrices:6,color:2763804},legs:{...bt.legs,color:5918792},behaviour:{...Li,breathHz:[2.6,4],holdCalm:[.35,1.4],holdAlert:[.2,.7],billUp:5}}),Yv=Pi("miromiro",Di.miromiro,{name:"Petroica macrocephala macrocephala",seed:2205,eye:{s:7.8,phi:.56,inset:.84},bill:{color:723723},skin:1710102,shading:{flank:.85,under:.92,patch:.15,gold:6969888,goldAmount:.05},looks:{body:he({width:.0252,base:723724,tip:1644827}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:12104356,tip:15920868}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:10123840,tip:14726752}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:2763306,tip:4868682}),back:he({width:.0252,base:657931,tip:1579034,loose:.32}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:657931,tip:1710620}),breast:he({width:.0252,aspect:2.1,loose:.47,base:12089884,tip:15905338}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.32,base:592138,tip:1447448}),head:he({width:.019,aspect:1.8,rowStep:.34,lift:.5,loose:.32,fuzz:.25,base:592138,tip:1447448}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:460552,tip:1118483}),spot:he({width:.012,aspect:1.8,rowStep:.26,tilt:8,lift:.3,loose:.6,fuzz:.6,base:14210768,tip:16777215}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:657931,tip:1579034}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:12631216,tip:16052970}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:723724,tip:1644827})},tracts:Ci([{name:"breast",look:"breast",region:{kind:"band",s:[3.4,6],phi:[0,.44],soft:.6}},{name:"throat",look:"throat",region:{kind:"band",s:[5.9,8.6],phi:[0,.4],soft:.25}},{name:"spot",look:"spot",region:{kind:"blob",at:[9.6,.9],r:[.4,.12]}}]),wing:{...bt.wing,color:855310,sheen:2763310,bar:{rows:[.45,.85],v:[-1.02,1.02],base:14079182,tip:16777215}},tail:{...bt.tail,rectrices:6,color:789517,outer:{from:.8,color:13618372}},legs:{...bt.legs,color:1118481},behaviour:{...Li,holdCalm:[.5,1.8],tailEvery:[1.8,5],billUp:4}}),Jv=Pi("toutouwai",Di.toutouwai,{name:"Petroica longipes",seed:2206,eye:{s:7.85,phi:.56,inset:.84},bill:{color:921102},skin:2368031,shading:{flank:.82,under:.88,patch:.2,gold:4868666,goldAmount:.04},looks:{body:he({width:.0252,base:2105636,tip:4277320}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:3816254,tip:6974576}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:2763565,tip:5263958}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:3815994,tip:6974058}),back:he({width:.0252,base:1579291,tip:3290167,loose:.36}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:1513498,tip:3158581}),breast:he({width:.0252,aspect:2.1,loose:.54,base:8026228,tip:13026494}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.36,base:1974049,tip:3816512}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.3,fuzz:.22,base:1513498,tip:3290168}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:1184532,tip:2500650}),spot:he({width:.011,aspect:1.8,rowStep:.26,tilt:8,lift:.3,loose:.6,fuzz:.6,base:11842220,tip:15263456}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1579291,tip:3290167}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:6974056,tip:12105392}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1316118,tip:2763822})},tracts:Ci([{name:"slate",look:"flank",region:{kind:"band",s:[0,2.4],phi:[0,.45],soft:.5}},{name:"breast",look:"breast",region:{kind:"blob",at:[3.9,0],r:[1.25,.27],soft:.6}},{name:"throat",look:"throat",region:{kind:"band",s:[5.2,8.6],phi:[0,.4],soft:.4}},{name:"spot",look:"spot",region:{kind:"blob",at:[9.7,.85],r:[.32,.1]}}]),wing:{...bt.wing,color:1447706,sheen:3816512},tail:{...bt.tail,rectrices:6,color:1447705},legs:{...bt.legs,color:2762790},behaviour:{...Li,holdCalm:[.6,2.2],tailEvery:[2,6],billUp:5}}),Zv=Pi("hihi",Di.hihi,{name:"Notiomystis cincta",seed:2207,eye:{s:7.85,phi:.56,inset:.84},bill:{color:855052},skin:2762272,shading:{flank:.85,under:.9,patch:.2,gold:6969888,goldAmount:.1},looks:{body:he({width:.0252,base:2762264,tip:5919290}),belly:he({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:6972496,tip:12235418}),flank:he({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:4867120,tip:8682074}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:3815978,tip:6974026}),back:he({width:.0252,base:2762776,tip:5393458,loose:.36}),scapular:he({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2762262,tip:5130288}),breast:he({width:.0252,aspect:2.1,loose:.47,base:5919808,tip:10787452}),gold:he({width:.0252,aspect:2.2,loose:.36,base:10517008,tip:16041008}),throat:he({width:.02,aspect:1.8,rowStep:.32,loose:.4,fuzz:.5,base:394758,tip:1118481}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.43,fuzz:.6,base:328965,tip:986896}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.54,fuzz:.7,base:263172,tip:789516}),tuft:he({width:.012,aspect:3.6,rowStep:.16,tilt:48,lift:1.6,cup:.2,round:.4,loose:.8,fuzz:.8,base:13289666,tip:16777215,jitter:.6}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2762262,tip:5392944}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:9077868,tip:13814448}),wingCovert:he({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1710096,tip:3814948})},tracts:Ci([{name:"gold",look:"gold",region:{kind:"band",s:[5.1,6],phi:[.06,.62],soft:.3}},{name:"hood",look:"head",region:{kind:"band",s:[6,11],phi:[.35,1]}},{name:"throat",look:"throat",region:{kind:"band",s:[5.9,8.6],phi:[0,.4],soft:.2}},{name:"tuft",look:"tuft",region:{kind:"blob",at:[7.15,.66],r:[.34,.06]}}]),wing:{...bt.wing,color:1841684,sheen:3815464,bar:{rows:[.6,.9],v:[-1.02,1.02],base:13684422,tip:16447728}},tail:{...bt.tail,rectrices:6,color:1973270},legs:{...bt.legs,color:2762272},behaviour:{...Li,holdCalm:[.4,1.6],tailEvery:[1.5,4.5],billUp:9}}),$v=Pi("kereru",Di.kereru,{name:"Hemiphaga novaeseelandiae",seed:2208,eye:{s:7.85,phi:.56,inset:.84,iris:12593182},bill:{color:11545120},skin:2760222,shading:{flank:.85,under:.92,patch:.2,gold:8018464,goldAmount:.35},looks:{body:he({width:.0252,base:1450511,tip:2899992,iri:3840570,iriGraze:10119706,iriStrength:.55,iriPower:6,sparkle:.4}),belly:he({width:.0302,aspect:2.4,rowStep:.24,lift:.95,loose:.61,fuzz:.5,base:13158080,tip:16513782}),flank:he({width:.0319,aspect:2.7,rowStep:.24,lift:.95,loose:.61,base:11842220,tip:15658472}),down:he({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:10132118,tip:14605528}),back:he({width:.0252,base:2758688,tip:4861494,iri:9058954,iriGraze:3836506,iriStrength:.5,iriPower:6,loose:.32,sparkle:.4}),scapular:he({width:.037,aspect:3.1,rowStep:.24,tilt:16,lift:.8,base:2497052,tip:4600366,iri:8014442,iriGraze:4885050,iriStrength:.45,iriPower:6}),breast:he({width:.0269,aspect:2,rowStep:.3,loose:.29,base:1187854,tip:2506778,iri:4893242,iriGraze:11565594,iriStrength:.85,iriPower:6,iriAlign:.2,iriAim:[0,-.2,1],sparkle:.35}),throat:he({width:.022,aspect:1.9,rowStep:.32,loose:.35,base:1056782,tip:2243608,iri:5945930,iriGraze:10115744,iriStrength:.8,iriPower:7,sparkle:.35}),head:he({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.27,fuzz:.2,base:1253391,tip:2440218,iri:4893258,iriGraze:9063072,iriStrength:.7,iriPower:7,sparkle:.35}),face:he({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.36,fuzz:.4,base:989196,tip:1978390,iri:3836474,iriGraze:6961802,iriStrength:.35}),covert:he({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1845780,tip:3689506,iri:4889146,iriGraze:9071146,iriStrength:.4,iriPower:6}),undertail:he({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:12236978,tip:15921386}),wingCovert:he({width:.032,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1713684,tip:3426334,iri:5937722,iriGraze:10119722,iriStrength:.45,iriPower:6,sparkle:.4})},tracts:Ci([{name:"breast",look:"breast",region:{kind:"band",s:[4.75,6.4],phi:[0,.5],soft:.05}},{name:"belly",look:"belly",region:{kind:"band",s:[0,4.75],phi:[0,.5],soft:.05}}]),wing:{...bt.wing,color:1976854,sheen:4880954},tail:{...bt.tail,rectrices:6,color:2760728},legs:{...bt.legs,color:11548200},behaviour:{...Li,breathHz:[1.4,2.4],holdCalm:[1.2,3.6],holdAlert:[.5,1.6],saccade:[.07,6e-4],blinkEvery:[2.5,7],tailEvery:[6,14],wingEvery:[12,26],billUp:2}}),Qv={tui:qv,korimako:Xv,piwakawaka:Kv,tauhou:jv,miromiro:Yv,toutouwai:Jv,hihi:Zv,kereru:$v},Cn=new v(0,1,0);function wi(s,e,t,n=24,i=8){const a=s.computeFrenetFrames(n,!1),r=[],o=[],c=[],l=[],h=new v,d=new v;for(let f=0;f<=n;f++){const p=f/n;s.getPointAt(p,h);const b=e(p);for(let g=0;g<=i;g++){const m=g/i*Math.PI*2;d.copy(a.normals[f]).multiplyScalar(Math.cos(m)).addScaledVector(a.binormals[f],Math.sin(m)),r.push(h.x+d.x*b,h.y+d.y*b,h.z+d.z*b),o.push(d.x,d.y,d.z);const x=t(p,m);c.push(x.r,x.g,x.b)}}for(let f=0;f<n;f++)for(let p=0;p<i;p++){const b=f*(i+1)+p,g=b+i+1;l.push(b,b+1,g,g,b+1,g+1)}const u=new St;return u.setAttribute("position",new tt(r,3)),u.setAttribute("normal",new tt(o,3)),u.setAttribute("color",new tt(c,3)),u.setIndex(l),u}function ma(s,e,t,n,i={}){const a=i.segs??10,r=i.across??4,o=i.arch??.15,c=i.cup??.25,l=i.vein??.12,h=[],d=[],u=[],f=s*.006;for(const b of[1,-1]){const g=h.length/3,m=b>0?t:n;for(let E=0;E<=a;E++){const y=E/a,S=e(y);for(let w=0;w<=r*2;w++){const _=w/r-1,M=_*S,F=y*s,P=o*s*Math.sin(y*Math.PI)*.5-o*s*y*y*.6+c*Math.abs(_)*S+b*f;h.push(M,P,F);const I=1+l*Math.exp(-(_*_)*60);d.push(m.r*I,m.g*I,m.b*I)}}const x=r*2+1;for(let E=0;E<a;E++)for(let y=0;y<x-1;y++){const S=g+E*x+y,w=S+x;b>0?u.push(S,w,S+1,w,w+1,S+1):u.push(S,S+1,w,w,S+1,w+1)}}const p=new St;return p.setAttribute("position",new tt(h,3)),p.setAttribute("color",new tt(d,3)),p.setIndex(u),p.computeVertexNormals(),p}function Wi(s,e,t,n=Cn,i=0){const a=t.clone().normalize(),r=new v().crossVectors(n,a);r.lengthSq()<1e-6&&r.set(1,0,0),r.normalize();const o=new v().crossVectors(a,r),c=new Xe().makeBasis(r,o,a);return i&&c.multiply(new Xe().makeRotationZ(i)),c.setPosition(e),s.applyMatrix4(c)}function wr(s){const e=s instanceof pe?s:new pe(s);return()=>e}function ci(s,e,t){for(const i of e){i.getAttribute("normal")||i.computeVertexNormals();for(const a of Object.keys(i.attributes))["position","normal","color"].includes(a)||i.deleteAttribute(a);i.index||i.setIndex([...Array(i.getAttribute("position").count).keys()])}const n=new Ft(Z_(e,!1),t);return n.name=s,n.castShadow=!0,n.receiveShadow=!0,n}function Qc(s,e,t){const n=e.clone().sub(s),i=new v(-n.z,0,n.x).normalize().multiplyScalar(n.length()*.06);return new yr([s.clone(),s.clone().addScaledVector(n,.33).add(i.clone().multiplyScalar(t()-.3)),s.clone().addScaledVector(n,.66).add(i.clone().multiplyScalar(-(t()-.3))),e.clone()])}function ey(s,e){const t=jn(81),n=Qc(s,e,t),i=new pe(5917226),a=[wi(n,x=>.02*(1-x*.55),x=>i.clone().lerp(new pe(6978098),x*.7),40,8)],r=[],o=[],c=new pe(15904768),l=new pe(14191104),h=new pe(10132010),d=new v,u=new v,f=6;for(let x=0;x<f;x++){const E=.25+x/(f-1)*.72;n.getPointAt(E,d),n.getTangentAt(E,u);const y=new v(Math.cos(x*2.4+.5),.15,Math.sin(x*2.4+.5)).normalize(),S=d.clone().addScaledVector(y,.035+t()*.03),w=new yr([d.clone(),S,S.clone().add(new v(y.x*.03,-.08,y.z*.03))]);a.push(wi(w,M=>.006*(1-M*.5),wr(6973994),10,5));const _=4+Math.floor(t()*4);for(let M=0;M<_;M++){const F=.35+M/_*.65,P=w.getPointAt(F),I=new v(Math.cos(M*2.1+x),0,Math.sin(M*2.1+x)).multiplyScalar(.5),D=new v(I.x,-1,I.z).normalize(),L=.1+t()*.035,R=new v().crossVectors(D,Cn).normalize(),U=new v().crossVectors(R,D).normalize(),z=new gc(P.clone(),P.clone().addScaledVector(D,L*.55).addScaledVector(U,L*.18),P.clone().addScaledVector(D,L).addScaledVector(U,L*.05));r.push(wi(z,B=>B<.12?.006+B*.05:.012*Math.sin(Math.min(1,(1-B)/.12)*Math.PI*.5)*(1-.25*B)+.004*(B<.97?1:0),(B,k)=>B<.12?h:c.clone().lerp(l,.25+.25*Math.sin(k*2)*B),18,10));const N=ma(L*.42,B=>.02*Math.sin(Math.PI*Math.min(1,B*1.1)),c,l,{arch:-.4,cup:.6,segs:6,across:3,vein:.2});r.push(Wi(N,z.getPointAt(.1),D.clone().multiplyScalar(-.3).addScaledVector(U,-1),D))}}const p=x=>ma(.03*x,E=>.011*x*Math.sin(Math.PI*Math.min(1,E*1.05)),new pe(6982186),new pe(9083482),{segs:5,across:2,arch:.1});for(let x=0;x<4;x++){const E=.55+x*.13;n.getPointAt(Math.min(E,.98),d);const y=new v(Math.cos(x*2.6+1),.6,Math.sin(x*2.6+1)).normalize(),S=.22,w=new gc(d.clone(),d.clone().addScaledVector(y,S*.6),d.clone().addScaledVector(y,S).add(new v(0,-.05,0)));a.push(wi(w,()=>.0028,wr(6978098),10,4));for(let _=1;_<14;_++){const M=_/14,F=w.getPointAt(M),P=w.getTangentAt(M),I=new v().crossVectors(P,Cn).normalize();for(const D of[1,-1])o.push(Wi(p(1-M*.35),F,I.clone().multiplyScalar(D).addScaledVector(P,.4),Cn))}}const b=new cn({vertexColors:!0,roughness:.85}),g=new Gt({vertexColors:!0,roughness:.42,sheen:.6,sheenColor:new pe(16769152),side:Rt,emissive:2758144}),m=new cn({vertexColors:!0,roughness:.6,side:Rt});return[ci("shoot",a,b),ci("buds",r,g),ci("buds",o,m)]}function ty(s,e){const t=jn(82),n=Qc(s,e,t),i=[wi(n,w=>.024*(1-w*.4),w=>new pe(4865588).lerp(new pe(12104354),iy(.5,1,w)),40,8)],a=[],r=[],o=new pe(12784156),c=new pe(7997968),l=new pe(14196768),h=new pe(13157044),d=new ba(.0016,.0022,1,3,1);d.translate(0,.5,0);const u=new Ki(.0055,5,4),f=new Ki(.018,8,6,0,Math.PI*2,Math.PI*.45,Math.PI*.55),p=[{u:1,spread:.11},{u:.72,spread:.09}],b=new v,g=new v;for(const w of p){n.getPointAt(w.u,b),n.getTangentAt(w.u,g);const _=b.clone().addScaledVector(g,.03),M=11;for(let F=0;F<M;F++){const P=F*2.39996,I=Math.sqrt((F+.5)/M),D=new v(Math.cos(P)*I,.9-I*.6,Math.sin(P)*I).normalize(),L=_.clone().addScaledVector(D,w.spread*.6),R=new Jf(_.clone(),L);i.push(wi(R,()=>.004,()=>h,4,4));const U=f.clone();ur(U,h),a.push(Wi(U,L,D,Cn));for(let z=0;z<34;z++){const N=z*2.39996+F,k=.25+(.35+.65*Math.sqrt((z+.5)/34))*.75,V=new v(Math.cos(N)*k,1,Math.sin(N)*k).normalize(),X=new pt().setFromUnitVectors(Cn,D),Y=V.applyQuaternion(X),de=.07+t()*.035,W=d.clone();W.scale(1,de,1);const J=o.clone().lerp(c,t()*.35);ur(W,J);const te=new Xe().makeRotationFromQuaternion(new pt().setFromUnitVectors(Cn,Y)).setPosition(L);a.push(W.applyMatrix4(te));const ce=u.clone();ur(ce,l.clone().multiplyScalar(.8+t()*.3)),a.push(ce.translate(L.x+Y.x*de,L.y+Y.y*de,L.z+Y.z*de))}}}const m=new pe(2375708),x=new pe(13816004);for(let w=0;w<7;w++){const _=.42+w/6*.5;n.getPointAt(_,b);const M=w*1.9+.4,F=new v(Math.cos(M),.35,Math.sin(M)).normalize(),P=.3+t()*.08,I=ma(P,D=>.065*Math.pow(Math.sin(Math.PI*Math.min(1,D)),.8)*(1-.15*D),m,x,{arch:.12,cup:.18,segs:12,across:4,vein:.18});r.push(Wi(I,b,F,Cn,(t()-.5)*.4))}const E=new cn({vertexColors:!0,roughness:.9}),y=new Gt({vertexColors:!0,roughness:.45,sheen:.5,sheenColor:new pe(16736352),emissive:2097152}),S=new Gt({vertexColors:!0,roughness:.38,clearcoat:.4,clearcoatRoughness:.35,side:Rt});return[ci("shoot",i,E),ci("buds",a,y),ci("buds",r,S)]}function ny(s,e){const t=jn(83),n=Qc(s,e,t),i=new pe(4863016),a=[wi(n,m=>.014*(1-m*.5),wr(i),40,6)],r=[],o=[],c=new v,l=[n];for(let m=0;m<5;m++){const x=.25+m*.15;n.getPointAt(x,c);const E=m*2.3+.7,y=new v(Math.cos(E),.7,Math.sin(E)).normalize(),S=new gc(c.clone(),c.clone().addScaledVector(y,.1),c.clone().addScaledVector(y,.2).add(new v(0,.03,0)));a.push(wi(S,w=>.006*(1-w*.5),wr(5913130),10,5)),l.push(S)}const h=new pe(3820070),d=new pe(5925438),u=new pe(16184044),f=new pe(5904916);for(const m of l){for(let x=0;x<26;x++){const E=.08+x/26*.9;m.getPointAt(E,c);const y=m.getTangentAt(E),S=x*2.39996,w=new v(Math.cos(S),0,Math.sin(S)).addScaledVector(y,-y.dot(new v(Math.cos(S),0,Math.sin(S)))).normalize(),_=ma(.045,M=>.008*Math.sin(Math.PI*Math.min(1,M*1.05))*(1-.5*M),h,d,{segs:4,across:1,arch:.05,cup:.3,vein:.1});o.push(Wi(_,c,w.clone().addScaledVector(y,1.2),Cn))}for(let x=0;x<6;x++){const E=.2+t()*.75;m.getPointAt(E,c);const y=t()*Math.PI*2,S=new v(Math.cos(y),.9,Math.sin(y)).normalize(),w=c.clone().addScaledVector(S,.012);for(let M=0;M<5;M++){const F=ma(.032,D=>.017*Math.sqrt(Math.max(0,Math.sin(Math.PI*Math.min(1,D)))),u,u.clone().multiplyScalar(.9),{segs:5,across:3,arch:-.1,cup:.25,vein:0}),P=new pt().setFromUnitVectors(Cn,S),I=new v(Math.cos(M/5*Math.PI*2),.18,Math.sin(M/5*Math.PI*2)).applyQuaternion(P);r.push(Wi(F,w,I,S))}const _=new ba(.009,.011,.006,10);ur(_,f),r.push(Wi(_.rotateX(Math.PI/2),w.clone().addScaledVector(S,.002),S,Cn))}}const p=new cn({vertexColors:!0,roughness:.9}),b=new Gt({vertexColors:!0,roughness:.5,sheen:.4,sheenColor:new pe(16777215),side:Rt}),g=new cn({vertexColors:!0,roughness:.55,side:Rt});return[ci("shoot",a,p),ci("buds",r,b),ci("buds",o,g)]}function ur(s,e){const t=s.getAttribute("position").count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;return s.setAttribute("color",new It(n,3)),s}function iy(s,e,t){const n=Math.min(1,Math.max(0,(t-s)/(e-s)));return n*n*(3-2*n)}function sy(s,e,t){const n=new Pn;n.name=`flora.${s}`;const i=s==="pohutukawa"?ty(e,t):s==="manuka"?ny(e,t):ey(e,t);return n.add(...i),n}function td(s,e){s.updateMatrixWorld(!0);const t=s.getObjectByName("shoot"),n=new v(1.07,.11,.26),i=new v(1.41,.7,.09);if(t){const r=t.geometry.getAttribute("position");t.geometry.computeBoundingBox();const o=t.geometry.boundingBox,c=new v,l=new v;let h=0,d=0;const u=new v;for(let f=0;f<r.count;f++)u.fromBufferAttribute(r,f),u.y<o.min.y+.03&&(c.add(u),h++),u.y>o.max.y-.03&&(l.add(u),d++);h&&d&&(n.copy(c.divideScalar(h)).applyMatrix4(t.matrixWorld),i.copy(l.divideScalar(d)).applyMatrix4(t.matrixWorld))}for(const r of["shoot","buds","hairs"]){const o=s.getObjectByName(r);o&&o.removeFromParent()}i.add(new v(.04,.08,-.02));const a=sy(e,n,i);return s.add(a),a}const Po={mid:[.82,.72,.74]},Gi=new v(Ei+.1,.55,0),ar={three:{theta:-.95,phi:1.43,r:3.6},front:{theta:.02,phi:1.45,r:3.3},side:{theta:-1.4,phi:1.43,r:4.45},back:{theta:Math.PI-.5,phi:1.4,r:3.4}};function ay(){try{const s=document.createElement("canvas");return!!(s.getContext("webgl2")||s.getContext("webgl"))}catch{return!1}}async function ry(s,e){const t=matchMedia("(pointer: coarse)").matches,n=new F_({canvas:s,antialias:!0,alpha:!0,powerPreference:"high-performance",preserveDrawingBuffer:!!e.still});n.setClearColor(0,0),n.setPixelRatio(Math.min(window.devicePixelRatio||1,t?1.5:2)),n.outputColorSpace=Kt,n.toneMapping=wc,n.toneMappingExposure=1.12,n.shadowMap.enabled=!0,n.shadowMap.type=$s;const i=new Il,a=new hn(30,1,.02,120);{const $=new Il,Le=new Ft(new Ki(20,32,16),new si({color:new pe(Po.mid[0],Po.mid[1],Po.mid[2]).multiplyScalar(.42),side:on}));$.add(Le);const be=(ie,He,We,ot)=>{const nt=new Ft(new _a(ie,He),new si({color:We,side:Rt}));return nt.position.copy(ot),nt.lookAt(0,.5,0),$.add(nt),nt};be(9,9,new pe(1,.97,.94).multiplyScalar(3.2),new v(0,9,.5));for(let ie=0;ie<3;ie++){const He=.6+ie*Math.PI*2/3;be(2.2,10,new pe(1,.96,.93).multiplyScalar(2.2),new v(Math.sin(He)*8,1.5,Math.cos(He)*8))}be(16,16,new pe(14269131).multiplyScalar(.25),new v(0,-6,0));const xe=new pa(n);i.environment=xe.fromScene($,.02).texture,i.environmentIntensity=1,xe.dispose(),$.traverse(ie=>{const He=ie;He.isMesh&&(He.geometry.dispose(),He.material.dispose())})}const r=new vp(16774896,5915728,.75),o=new bc(16774378,2.3);o.position.set(-1.3,3.6,1.6),o.castShadow=!0,o.shadow.mapSize.set(t?1024:2048,t?1024:2048),Object.assign(o.shadow.camera,{left:-1.1,right:1.4,bottom:-1,top:1.2,near:.5,far:8}),o.shadow.bias=-.0015,o.shadow.normalBias=.025,o.shadow.radius=4,o.target.position.set(0,.5,0);const c=new bc(16510962,1.25);c.position.set(1.5,1.8,-2.5),c.target.position.set(0,.5,0),i.add(r,o,o.target,c,c.target);let l;try{const $=await Hx(e.perchUrl);td($.group,e.flora),l=$.group}catch{const $=Gx();td($.group,e.flora),l=$.group}i.add(l);const h=Qv[e.bird];if(!h)throw new Error(`no species ${e.bird}`);const d={...h,plumage:t?{density:.85,fuzzLayers:2}:{density:.62,fuzzLayers:4}},u=Uv({species:d});u.root.position.x=Ei,u.layer("hop").home=Ei,u.setPerch(Ox(l),su),t&&(u.feathers.contour.castShadow=!1),e.still&&(u.mind.quiet=!0,u.mind.pinGaze=[22,8,0]),i.add(u.root);const f=new k_(a,s);f.target.copy(Gi),f.enableDamping=!e.still,f.dampingFactor=.08,f.enablePan=!1,f.minDistance=1.7,f.maxDistance=4.8,f.minPolarAngle=1.05,f.maxPolarAngle=1.85,f.rotateSpeed=.55,f.zoomToCursor=!1,s.style.touchAction="pan-y";const p=new ps;function b($){const Le=typeof $=="string"?ar[$]:$;p.set(Le.r,Le.phi,Le.theta),a.position.copy(Gi).add(new v().setFromSpherical(p)),a.lookAt(Gi),f.update()}b("three");let g=null;function m($,Le=!1){const be=new ps(ar[$].r,ar[$].phi,ar[$].theta),xe=new ps().setFromVector3(a.position.clone().sub(Gi)),ie=na.euclideanModulo(be.theta-xe.theta+Math.PI,Math.PI*2)-Math.PI;be.theta=xe.theta+ie,Le||k?(b({theta:be.theta,phi:be.phi,r:be.radius}),g=null):g={from:xe,to:be,t:0},ke()}function x($,Le=0){const be=new ps().setFromVector3(a.position.clone().sub(Gi));be.theta+=$,be.radius=na.clamp(be.radius*(1+Le),f.minDistance,f.maxDistance),b({theta:be.theta,phi:be.phi,r:be.radius}),g=null,ke()}const E=u.rig,y=$=>E.rest[$];function S($,Le){const be=y($),xe=Le.clone().sub(be.worldPos).applyQuaternion(be.worldQuat.clone().invert());return{bone:$,local:xe}}const w=d,_=new v(0,-Math.sin(w.tail.droop*Math.PI/180),-Math.cos(w.tail.droop*Math.PI/180)),M=$=>({L:$("L"),R:$("R")}),F=y("eye.L").worldPos.clone().add(y("eye.R").worldPos).multiplyScalar(.5),P={eye:M($=>S(`eye.${$}`,y(`eye.${$}`).worldPos.clone())),forehead:M(()=>S("head",y("bill").worldPos.clone().add(new v(0,.045,-.02)))),crown:M(()=>S("head",F.clone().add(new v(0,.07,-.015)))),ear:M($=>S("head",y(`eye.${$}`).worldPos.clone().add(new v($==="L"?.012:-.012,-.004,-.06)))),throat:M(()=>S("gular",y("gular").worldPos.clone().add(new v(0,.01,.045)))),breast:M(()=>S("sternum",y("gular").worldPos.clone().lerp(y("sternum").worldPos,.55).add(new v(0,0,.1)))),shoulder:M($=>S(`forearm.${$}`,y(`forearm.${$}`).worldPos.clone().lerp(y(`shoulder.${$}`).worldPos,.7).add(new v($==="L"?.03:-.03,.02,.02)))),wing:M($=>S(`hand.${$}`,y(`hand.${$}`).worldPos.clone().add(new v($==="L"?.04:-.04,0,0)))),tail:M(()=>S("tail",y("tail").worldPos.clone().addScaledVector(_,w.tail.length[1]*.75))),feet:M($=>S(`foot.${$}`,y(`foot.${$}`).worldPos.clone().add(new v(0,.03,.02))))},I=new v,D=new v,L=new v,R=new v,U=new v,z=new v,N=["bill","throat","breast"];function B($){u.root.updateMatrixWorld(!0),E.bones["eye.L"].getWorldPosition(D),E.bones["eye.R"].getWorldPosition(L);const Le=D.distanceToSquared(a.position)<L.distanceToSquared(a.position)?"L":"R";E.bones.chest.getWorldPosition(z),R.set(0,0,1).transformDirection(u.root.matrixWorld).setY(0).normalize(),U.copy(a.position).sub(z).setY(0).normalize();const be=R.dot(U)<-.3,xe=s.clientWidth,ie=s.clientHeight;return $.map(He=>{if(He==="bill")u.billTip(I);else{const We=P[He][Le];I.copy(We.local),E.bones[We.bone].localToWorld(I)}return I.project(a),{id:He,x:(I.x*.5+.5)*xe,y:(-I.y*.5+.5)*ie,front:!(be&&N.includes(He))}})}const k=matchMedia("(prefers-reduced-motion: reduce)").matches;let V=!!e.paused||k,X=!0,Y=!0,de=!1;const W=[],J=new Rp;J.connect(document),f.addEventListener("change",()=>ke());function te(){const $=s.clientWidth||1,Le=s.clientHeight||1;n.setSize($,Le,!1),a.aspect=$/Le,a.fov=$/Le<1?30/Math.max($/Le,.6):30,a.updateProjectionMatrix(),ke()}new ResizeObserver(te).observe(s),te();const ce=new v,ee=new v(Ei,1,0);function ye(){const $=Gi.x-a.position.x,Le=Gi.z-a.position.z;let be=Le,xe=-$;(xe<0||Math.abs(xe)<.05&&be>0)&&(be=-be,xe=-xe);const ie=Math.hypot(be,xe)||1,He=Math.hypot($,Le)||1;be=be/ie-$/He*.35,xe=xe/ie-Le/He*.35;const We=Math.hypot(be,xe)||1;return ce.set(ee.x+be/We*2.2,ee.y+.1,ee.z+xe/We*2.2)}function _e($){J.update($);const Le=J.getDelta(),be=Math.min(Le,1/20);let xe=!V;if(g){g.t=Math.min(1,g.t+Math.min(Le,.25)/1.1);const He=na.smootherstep(g.t,0,1);b({theta:g.from.theta+(g.to.theta-g.from.theta)*He,phi:g.from.phi+(g.to.phi-g.from.phi)*He,r:g.from.radius+(g.to.radius-g.from.radius)*He}),g.t>=1&&(g=null),xe=!0}const ie=f.update();if(V||(u.setAttention(ye()),u.update(be)),xe||Y||ie){n.render(i,a),Y=!1;for(const He of W)He()}!xe&&!g&&!ie&&Ne()}function fe(){de||!X||(de=!0,J.reset(),n.setAnimationLoop(_e))}function Ne(){de&&(de=!1,n.setAnimationLoop(null))}function ke(){Y=!0,fe()}new IntersectionObserver($=>{X=$.some(Le=>Le.isIntersecting),X?ke():Ne()}).observe(s);try{await n.compileAsync(i,a)}catch{}return u.update(0),n.render(i,a),ke(),{renderer:n,scene:i,camera:a,bird:u,reduced:k,anchors:B,goView:m,orbitBy:x,onFrame($){W.push($)},get paused(){return V},setPaused($){V=$,ke()},render(){n.render(i,a)},wake:ke}}export{ry as createViewer,ay as webglAvailable};
