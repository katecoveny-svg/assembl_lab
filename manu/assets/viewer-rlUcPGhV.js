const hs={ROTATE:0,DOLLY:1,PAN:2},cs={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},ru=0,tl=1,ou=2,Xs=1,cu=2,Hs=3,yi=0,rn=1,Lt=2,ds=0,Ks=1,nl=2,il=3,sl=4,lu=5,os=100,hu=101,du=102,uu=103,fu=104,pu=200,mu=201,gu=202,bu=203,qh=204,Xh=205,_u=206,xu=207,vu=208,yu=209,Mu=210,Su=211,wu=212,Eu=213,Tu=214,yo=0,Mo=1,So=2,$s=3,wo=4,Eo=5,To=6,Ao=7,Kh=0,Au=1,Ru=2,si=0,jh=1,Yh=2,Jh=3,Zh=4,$h=5,Qh=6,mc=7,al="attached",Pu="detached",ed=300,ms=301,Qs=302,Ar=303,Rr=304,Gi=1e3,zn=1001,rr=1002,zt=1003,td=1004,Vs=1005,Kt=1006,Qa=1007,Bn=1008,un=1009,nd=1010,id=1011,ea=1012,gc=1013,Vn=1014,xn=1015,Wn=1016,bc=1017,_c=1018,gs=1020,sd=35902,ad=35899,rd=1021,od=1022,En=1023,Mi=1026,_i=1027,xc=1028,vc=1029,Hi=1030,yc=1031,Mc=1033,er=33776,tr=33777,nr=33778,ir=33779,Ro=35840,Po=35841,Co=35842,Lo=35843,Do=36196,Io=37492,No=37496,Fo=37488,Uo=37489,or=37490,ko=37491,Oo=37808,zo=37809,Bo=37810,Go=37811,Ho=37812,Vo=37813,Wo=37814,qo=37815,Xo=37816,Ko=37817,jo=37818,Yo=37819,Jo=37820,Zo=37821,$o=36492,Qo=36494,ec=36495,tc=36283,nc=36284,cr=36285,ic=36286,ta=2300,na=2301,Pr=2302,rl=2303,ol=2400,cl=2401,ll=2402,Cu=2500,Lu=0,cd=1,sc=2,Du=3200,ac=0,Iu=1,bi="",Xt="srgb",pn="srgb-linear",lr="linear",xt="srgb",Cr=7680,Nu=519,Fu=512,Uu=513,ku=514,ld=515,Ou=516,zu=517,hd=518,dd=519,ud=35044,hl="300 es",Tn=2e3,ia=2001;function Bu(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function Gu(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function sa(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Hu(){const s=sa("canvas");return s.style.display="block",s}const dl={};function hr(...s){const e="THREE."+s.shift();console.log(e,...s)}function fd(s){const e=s[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=s[1];t&&t.isStackTrace?s[0]+=" "+t.getLocation():s[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return s}function He(...s){s=fd(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...s)}}function Ze(...s){s=fd(s);const e="THREE."+s.shift();{const t=s[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...s)}}function us(...s){const e=s.join(" ");e in dl||(dl[e]=!0,He(...s))}function Vu(s,e,t){return new Promise(function(n,i){function a(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(a,t);break;default:n()}}setTimeout(a,t)})}const Wu={[yo]:yo,[So]:To,[wo]:wo,[$s]:Eo,[Mo]:Mo,[To]:So,[Ao]:Ao,[Eo]:$s};class wi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const a=i.indexOf(t);a!==-1&&i.splice(a,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let a=0,r=i.length;a<r;a++)i[a].call(this,e);e.target=null}}}const Qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let ul=1234567;const js=Math.PI/180,bs=180/Math.PI;function Xn(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Qt[s&255]+Qt[s>>8&255]+Qt[s>>16&255]+Qt[s>>24&255]+"-"+Qt[e&255]+Qt[e>>8&255]+"-"+Qt[e>>16&15|64]+Qt[e>>24&255]+"-"+Qt[t&63|128]+Qt[t>>8&255]+"-"+Qt[t>>16&255]+Qt[t>>24&255]+Qt[n&255]+Qt[n>>8&255]+Qt[n>>16&255]+Qt[n>>24&255]).toLowerCase()}function it(s,e,t){return Math.max(e,Math.min(t,s))}function Sc(s,e){return(s%e+e)%e}function qu(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function Xu(s,e,t){return s!==e?(t-s)/(e-s):0}function Ys(s,e,t){return(1-t)*s+t*e}function Ku(s,e,t,n){return Ys(s,e,1-Math.exp(-t*n))}function ju(s,e=1){return e-Math.abs(Sc(s,e*2)-e)}function Yu(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function Ju(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function Zu(s,e){return s+Math.floor(Math.random()*(e-s+1))}function $u(s,e){return s+Math.random()*(e-s)}function Qu(s){return s*(.5-Math.random())}function ef(s){s!==void 0&&(ul=s);let e=ul+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function tf(s){return s*js}function nf(s){return s*bs}function sf(s){return s>0&&Number.isInteger(s)&&2**Math.round(Math.log2(s))===s}function af(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function pd(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function rf(s,e,t,n,i){const a=Math.cos,r=Math.sin,o=a(t/2),c=r(t/2),l=a((e+n)/2),h=r((e+n)/2),d=a((e-n)/2),u=r((e-n)/2),f=a((n-e)/2),p=r((n-e)/2);switch(i){case"XYX":s.set(o*h,c*d,c*u,o*l);break;case"YZY":s.set(c*u,o*h,c*d,o*l);break;case"ZXZ":s.set(c*d,c*u,o*h,o*l);break;case"XZX":s.set(o*h,c*p,c*f,o*l);break;case"YXY":s.set(c*f,o*h,c*p,o*l);break;case"ZYZ":s.set(c*p,c*f,o*h,o*l);break;default:He("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function br(s){switch(s.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function wc(s,e){if(e.constructor===Float32Array)return s;const t=br(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(s/t,-1)}function Ec(s,e){if(e.constructor===Float32Array)return s;const t=br(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(s*t)}const Js={DEG2RAD:js,RAD2DEG:bs,generateUUID:Xn,clamp:it,euclideanModulo:Sc,mapLinear:qu,inverseLerp:Xu,lerp:Ys,damp:Ku,pingpong:ju,smoothstep:Yu,smootherstep:Ju,randInt:Zu,randFloat:$u,randFloatSpread:Qu,seededRandom:ef,degToRad:tf,radToDeg:nf,isPowerOfTwo:sf,ceilPowerOfTwo:af,floorPowerOfTwo:pd,setQuaternionFromProperEuler:rf,normalize:Ec,denormalize:wc};class Ke{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(it(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),a=this.x-e.x,r=this.y-e.y;return this.x=a*n-r*i+e.x,this.y=a*i+r*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class mt{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,a,r,o){let c=n[i+0],l=n[i+1],h=n[i+2],d=n[i+3],u=a[r+0],f=a[r+1],p=a[r+2],b=a[r+3];if(d!==b||c!==u||l!==f||h!==p){let g=c*u+l*f+h*p+d*b;g<0&&(u=-u,f=-f,p=-p,b=-b,g=-g);let m=1-o;if(g<.9995){const _=Math.acos(g),S=Math.sin(_);m=Math.sin(m*_)/S,o=Math.sin(o*_)/S,c=c*m+u*o,l=l*m+f*o,h=h*m+p*o,d=d*m+b*o}else{c=c*m+u*o,l=l*m+f*o,h=h*m+p*o,d=d*m+b*o;const _=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=_,l*=_,h*=_,d*=_}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,i,a,r){const o=n[i],c=n[i+1],l=n[i+2],h=n[i+3],d=a[r],u=a[r+1],f=a[r+2],p=a[r+3];return e[t]=o*p+h*d+c*f-l*u,e[t+1]=c*p+h*u+l*d-o*f,e[t+2]=l*p+h*f+o*u-c*d,e[t+3]=h*p-o*d-c*u-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,a=e._z,r=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(i/2),d=o(a/2),u=c(n/2),f=c(i/2),p=c(a/2);switch(r){case"XYZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"YXZ":this._x=u*h*d+l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"ZXY":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d-u*f*p;break;case"ZYX":this._x=u*h*d-l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d+u*f*p;break;case"YZX":this._x=u*h*d+l*f*p,this._y=l*f*d+u*h*p,this._z=l*h*p-u*f*d,this._w=l*h*d-u*f*p;break;case"XZY":this._x=u*h*d-l*f*p,this._y=l*f*d-u*h*p,this._z=l*h*p+u*f*d,this._w=l*h*d+u*f*p;break;default:He("Quaternion: .setFromEuler() encountered an unknown order: "+r)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],a=t[8],r=t[1],o=t[5],c=t[9],l=t[2],h=t[6],d=t[10],u=n+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(a-l)*f,this._z=(r-i)*f}else if(n>o&&n>d){const f=2*Math.sqrt(1+n-o-d);this._w=(h-c)/f,this._x=.25*f,this._y=(i+r)/f,this._z=(a+l)/f}else if(o>d){const f=2*Math.sqrt(1+o-n-d);this._w=(a-l)/f,this._x=(i+r)/f,this._y=.25*f,this._z=(c+h)/f}else{const f=2*Math.sqrt(1+d-n-o);this._w=(r-i)/f,this._x=(a+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(it(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,a=e._z,r=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+r*o+i*l-a*c,this._y=i*h+r*c+a*o-n*l,this._z=a*h+r*l+n*c-i*o,this._w=r*h-n*o-i*c-a*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,i=e._y,a=e._z,r=e._w,o=this.dot(e);o<0&&(n=-n,i=-i,a=-a,r=-r,o=-o);let c=1-t;if(o<.9995){const l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+i*t,this._z=this._z*c+a*t,this._w=this._w*c+r*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+i*t,this._z=this._z*c+a*t,this._w=this._w*c+r*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),a=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),a*Math.sin(t),a*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class y{static{this.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(fl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(fl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,a=e.elements;return this.x=a[0]*t+a[3]*n+a[6]*i,this.y=a[1]*t+a[4]*n+a[7]*i,this.z=a[2]*t+a[5]*n+a[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,a=e.elements,r=1/(a[3]*t+a[7]*n+a[11]*i+a[15]);return this.x=(a[0]*t+a[4]*n+a[8]*i+a[12])*r,this.y=(a[1]*t+a[5]*n+a[9]*i+a[13])*r,this.z=(a[2]*t+a[6]*n+a[10]*i+a[14])*r,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,a=e.x,r=e.y,o=e.z,c=e.w,l=2*(r*i-o*n),h=2*(o*t-a*i),d=2*(a*n-r*t);return this.x=t+c*l+r*d-o*h,this.y=n+c*h+o*l-a*d,this.z=i+c*d+a*h-r*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i,this.y=a[1]*t+a[5]*n+a[9]*i,this.z=a[2]*t+a[6]*n+a[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this.z=it(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this.z=it(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,a=e.z,r=t.x,o=t.y,c=t.z;return this.x=i*c-a*o,this.y=a*r-n*c,this.z=n*o-i*r,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Lr.copy(this).projectOnVector(e),this.sub(Lr)}reflect(e){return this.sub(Lr.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(it(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Lr=new y,fl=new mt;class Je{static{this.prototype.isMatrix3=!0}constructor(e,t,n,i,a,r,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,a,r,o,c,l)}set(e,t,n,i,a,r,o,c,l){const h=this.elements;return h[0]=e,h[1]=i,h[2]=o,h[3]=t,h[4]=a,h[5]=c,h[6]=n,h[7]=r,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,a=this.elements,r=n[0],o=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],p=n[8],b=i[0],g=i[3],m=i[6],_=i[1],S=i[4],v=i[7],w=i[2],E=i[5],x=i[8];return a[0]=r*b+o*_+c*w,a[3]=r*g+o*S+c*E,a[6]=r*m+o*v+c*x,a[1]=l*b+h*_+d*w,a[4]=l*g+h*S+d*E,a[7]=l*m+h*v+d*x,a[2]=u*b+f*_+p*w,a[5]=u*g+f*S+p*E,a[8]=u*m+f*v+p*x,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*r*h-t*o*l-n*a*h+n*o*c+i*a*l-i*r*c}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=h*r-o*l,u=o*c-h*a,f=l*a-r*c,p=t*d+n*u+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);const b=1/p;return e[0]=d*b,e[1]=(i*l-h*n)*b,e[2]=(o*n-i*r)*b,e[3]=u*b,e[4]=(h*t-i*c)*b,e[5]=(i*a-o*t)*b,e[6]=f*b,e[7]=(n*c-l*t)*b,e[8]=(r*t-n*a)*b,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,a,r,o){const c=Math.cos(a),l=Math.sin(a);return this.set(n*c,n*l,-n*(c*r+l*o)+r+e,-i*l,i*c,-i*(-l*r+c*o)+o+t,0,0,1),this}scale(e,t){return us("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Dr.makeScale(e,t)),this}rotate(e){return us("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Dr.makeRotation(-e)),this}translate(e,t){return us("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Dr.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Dr=new Je,pl=new Je().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),ml=new Je().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function of(){const s={enabled:!0,workingColorSpace:pn,spaces:{},convert:function(i,a,r){return this.enabled===!1||a===r||!a||!r||(this.spaces[a].transfer===xt&&(i.r=ai(i.r),i.g=ai(i.g),i.b=ai(i.b)),this.spaces[a].primaries!==this.spaces[r].primaries&&(i.applyMatrix3(this.spaces[a].toXYZ),i.applyMatrix3(this.spaces[r].fromXYZ)),this.spaces[r].transfer===xt&&(i.r=fs(i.r),i.g=fs(i.g),i.b=fs(i.b))),i},workingToColorSpace:function(i,a){return this.convert(i,this.workingColorSpace,a)},colorSpaceToWorking:function(i,a){return this.convert(i,a,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===bi?lr:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,a=this.workingColorSpace){return i.fromArray(this.spaces[a].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,a,r){return i.copy(this.spaces[r].fromXYZ).multiply(this.spaces[a].toXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[pn]:{primaries:e,whitePoint:n,transfer:lr,toXYZ:pl,fromXYZ:ml,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Xt},outputColorSpaceConfig:{drawingBufferColorSpace:Xt}},[Xt]:{primaries:e,whitePoint:n,transfer:xt,toXYZ:pl,fromXYZ:ml,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Xt}}}),s}const lt=of();function ai(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function fs(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let qi;class cf{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{qi===void 0&&(qi=sa("canvas")),qi.width=e.width,qi.height=e.height;const i=qi.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=qi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=sa("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),a=i.data;for(let r=0;r<a.length;r++)a[r]=ai(a[r]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ai(t[n]/255)*255):t[n]=ai(t[n]);return{data:t,width:e.width,height:e.height}}else return He("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let lf=0;class Tc{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:lf++}),this.uuid=Xn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width||0,t.height||0,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let a;if(Array.isArray(i)){a=[];for(let r=0,o=i.length;r<o;r++)i[r].isDataTexture?a.push(Ir(i[r].image)):a.push(Ir(i[r]))}else a=Ir(i);n.url=a}return t||(e.images[this.uuid]=n),n}}function Ir(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?cf.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(He("Texture: Unable to serialize Texture."),{})}let hf=0;const Nr=new y;class jt extends wi{constructor(e=jt.DEFAULT_IMAGE,t=jt.DEFAULT_MAPPING,n=zn,i=zn,a=Kt,r=Bn,o=En,c=un,l=jt.DEFAULT_ANISOTROPY,h=bi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:hf++}),this.uuid=Xn(),this.name="",this.source=new Tc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=a,this.minFilter=r,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Ke(0,0),this.repeat=new Ke(1,1),this.center=new Ke(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Je,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Nr).x}get height(){return this.source.getSize(Nr).y}get depth(){return this.source.getSize(Nr).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){He(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){He(`Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ed)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Gi:e.x=e.x-Math.floor(e.x);break;case zn:e.x=e.x<0?0:1;break;case rr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Gi:e.y=e.y-Math.floor(e.y);break;case zn:e.y=e.y<0?0:1;break;case rr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}jt.DEFAULT_IMAGE=null;jt.DEFAULT_MAPPING=ed;jt.DEFAULT_ANISOTROPY=1;class St{static{this.prototype.isVector4=!0}constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,a=this.w,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i+r[12]*a,this.y=r[1]*t+r[5]*n+r[9]*i+r[13]*a,this.z=r[2]*t+r[6]*n+r[10]*i+r[14]*a,this.w=r[3]*t+r[7]*n+r[11]*i+r[15]*a,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,a;const c=e.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],p=c[9],b=c[2],g=c[6],m=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-b)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+b)<.1&&Math.abs(p+g)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const S=(l+1)/2,v=(f+1)/2,w=(m+1)/2,E=(h+u)/4,x=(d+b)/4,M=(p+g)/4;return S>v&&S>w?S<.01?(n=0,i=.707106781,a=.707106781):(n=Math.sqrt(S),i=E/n,a=x/n):v>w?v<.01?(n=.707106781,i=0,a=.707106781):(i=Math.sqrt(v),n=E/i,a=M/i):w<.01?(n=.707106781,i=.707106781,a=0):(a=Math.sqrt(w),n=x/a,i=M/a),this.set(n,i,a,t),this}let _=Math.sqrt((g-p)*(g-p)+(d-b)*(d-b)+(u-h)*(u-h));return Math.abs(_)<.001&&(_=1),this.x=(g-p)/_,this.y=(d-b)/_,this.z=(u-h)/_,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=it(this.x,e.x,t.x),this.y=it(this.y,e.y,t.y),this.z=it(this.z,e.z,t.z),this.w=it(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=it(this.x,e,t),this.y=it(this.y,e,t),this.z=it(this.z,e,t),this.w=it(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(it(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class df extends wi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Kt,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new St(0,0,e,t),this.scissorTest=!1,this.viewport=new St(0,0,e,t),this.textures=[];const i=n.count;for(let a=0;a<i;a++)this.textures[a]=new jt({width:e,height:t,depth:n.depth}),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Kt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,a=this.textures.length;i<a;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isData3DTexture!==!0&&(this.textures[i].isArrayTexture=this.textures[i].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new Tc(i)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){const t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Gn extends df{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class md extends jt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=zt,this.minFilter=zt,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class uf extends jt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=zt,this.minFilter=zt,this.wrapR=zn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}}class Ve{static{this.prototype.isMatrix4=!0}constructor(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g)}set(e,t,n,i,a,r,o,c,l,h,d,u,f,p,b,g){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=i,m[1]=a,m[5]=r,m[9]=o,m[13]=c,m[2]=l,m[6]=h,m[10]=d,m[14]=u,m[3]=f,m[7]=p,m[11]=b,m[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ve().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,n=e.elements,i=1/Xi.setFromMatrixColumn(e,0).length(),a=1/Xi.setFromMatrixColumn(e,1).length(),r=1/Xi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*a,t[5]=n[5]*a,t[6]=n[6]*a,t[7]=0,t[8]=n[8]*r,t[9]=n[9]*r,t[10]=n[10]*r,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,a=e.z,r=Math.cos(n),o=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(a),d=Math.sin(a);if(e.order==="XYZ"){const u=r*h,f=r*d,p=o*h,b=o*d;t[0]=c*h,t[4]=-c*d,t[8]=l,t[1]=f+p*l,t[5]=u-b*l,t[9]=-o*c,t[2]=b-u*l,t[6]=p+f*l,t[10]=r*c}else if(e.order==="YXZ"){const u=c*h,f=c*d,p=l*h,b=l*d;t[0]=u+b*o,t[4]=p*o-f,t[8]=r*l,t[1]=r*d,t[5]=r*h,t[9]=-o,t[2]=f*o-p,t[6]=b+u*o,t[10]=r*c}else if(e.order==="ZXY"){const u=c*h,f=c*d,p=l*h,b=l*d;t[0]=u-b*o,t[4]=-r*d,t[8]=p+f*o,t[1]=f+p*o,t[5]=r*h,t[9]=b-u*o,t[2]=-r*l,t[6]=o,t[10]=r*c}else if(e.order==="ZYX"){const u=r*h,f=r*d,p=o*h,b=o*d;t[0]=c*h,t[4]=p*l-f,t[8]=u*l+b,t[1]=c*d,t[5]=b*l+u,t[9]=f*l-p,t[2]=-l,t[6]=o*c,t[10]=r*c}else if(e.order==="YZX"){const u=r*c,f=r*l,p=o*c,b=o*l;t[0]=c*h,t[4]=b-u*d,t[8]=p*d+f,t[1]=d,t[5]=r*h,t[9]=-o*h,t[2]=-l*h,t[6]=f*d+p,t[10]=u-b*d}else if(e.order==="XZY"){const u=r*c,f=r*l,p=o*c,b=o*l;t[0]=c*h,t[4]=-d,t[8]=l*h,t[1]=u*d+b,t[5]=r*h,t[9]=f*d-p,t[2]=p*d-f,t[6]=o*h,t[10]=b*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(ff,e,pf)}lookAt(e,t,n){const i=this.elements;return hn.subVectors(e,t),hn.lengthSq()===0&&(hn.z=1),hn.normalize(),li.crossVectors(n,hn),li.lengthSq()===0&&(Math.abs(n.z)===1?hn.x+=1e-4:hn.z+=1e-4,hn.normalize(),li.crossVectors(n,hn)),li.normalize(),ma.crossVectors(hn,li),i[0]=li.x,i[4]=ma.x,i[8]=hn.x,i[1]=li.y,i[5]=ma.y,i[9]=hn.y,i[2]=li.z,i[6]=ma.z,i[10]=hn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,a=this.elements,r=n[0],o=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],p=n[2],b=n[6],g=n[10],m=n[14],_=n[3],S=n[7],v=n[11],w=n[15],E=i[0],x=i[4],M=i[8],N=i[12],P=i[1],I=i[5],D=i[9],L=i[13],R=i[2],k=i[6],U=i[10],F=i[14],V=i[3],O=i[7],W=i[11],Y=i[15];return a[0]=r*E+o*P+c*R+l*V,a[4]=r*x+o*I+c*k+l*O,a[8]=r*M+o*D+c*U+l*W,a[12]=r*N+o*L+c*F+l*Y,a[1]=h*E+d*P+u*R+f*V,a[5]=h*x+d*I+u*k+f*O,a[9]=h*M+d*D+u*U+f*W,a[13]=h*N+d*L+u*F+f*Y,a[2]=p*E+b*P+g*R+m*V,a[6]=p*x+b*I+g*k+m*O,a[10]=p*M+b*D+g*U+m*W,a[14]=p*N+b*L+g*F+m*Y,a[3]=_*E+S*P+v*R+w*V,a[7]=_*x+S*I+v*k+w*O,a[11]=_*M+S*D+v*U+w*W,a[15]=_*N+S*L+v*F+w*Y,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],a=e[12],r=e[1],o=e[5],c=e[9],l=e[13],h=e[2],d=e[6],u=e[10],f=e[14],p=e[3],b=e[7],g=e[11],m=e[15],_=c*f-l*u,S=o*f-l*d,v=o*u-c*d,w=r*f-l*h,E=r*u-c*h,x=r*d-o*h;return t*(b*_-g*S+m*v)-n*(p*_-g*w+m*E)+i*(p*S-b*w+m*x)-a*(p*v-b*E+g*x)}determinantAffine(){const e=this.elements,t=e[0],n=e[4],i=e[8],a=e[1],r=e[5],o=e[9],c=e[2],l=e[6],h=e[10];return t*(r*h-o*l)-n*(a*h-o*c)+i*(a*l-r*c)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],a=e[3],r=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=e[9],u=e[10],f=e[11],p=e[12],b=e[13],g=e[14],m=e[15],_=t*o-n*r,S=t*c-i*r,v=t*l-a*r,w=n*c-i*o,E=n*l-a*o,x=i*l-a*c,M=h*b-d*p,N=h*g-u*p,P=h*m-f*p,I=d*g-u*b,D=d*m-f*b,L=u*m-f*g,R=_*L-S*D+v*I+w*P-E*N+x*M;if(R===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const k=1/R;return e[0]=(o*L-c*D+l*I)*k,e[1]=(i*D-n*L-a*I)*k,e[2]=(b*x-g*E+m*w)*k,e[3]=(u*E-d*x-f*w)*k,e[4]=(c*P-r*L-l*N)*k,e[5]=(t*L-i*P+a*N)*k,e[6]=(g*v-p*x-m*S)*k,e[7]=(h*x-u*v+f*S)*k,e[8]=(r*D-o*P+l*M)*k,e[9]=(n*P-t*D-a*M)*k,e[10]=(p*E-b*v+m*_)*k,e[11]=(d*v-h*E-f*_)*k,e[12]=(o*N-r*I-c*M)*k,e[13]=(t*I-n*N+i*M)*k,e[14]=(b*S-p*w-g*_)*k,e[15]=(h*w-d*S+u*_)*k,this}scale(e){const t=this.elements,n=e.x,i=e.y,a=e.z;return t[0]*=n,t[4]*=i,t[8]*=a,t[1]*=n,t[5]*=i,t[9]*=a,t[2]*=n,t[6]*=i,t[10]*=a,t[3]*=n,t[7]*=i,t[11]*=a,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),a=1-n,r=e.x,o=e.y,c=e.z,l=a*r,h=a*o;return this.set(l*r+n,l*o-i*c,l*c+i*o,0,l*o+i*c,h*o+n,h*c-i*r,0,l*c-i*o,h*c+i*r,a*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,a,r){return this.set(1,n,a,0,e,1,r,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,a=t._x,r=t._y,o=t._z,c=t._w,l=a+a,h=r+r,d=o+o,u=a*l,f=a*h,p=a*d,b=r*h,g=r*d,m=o*d,_=c*l,S=c*h,v=c*d,w=n.x,E=n.y,x=n.z;return i[0]=(1-(b+m))*w,i[1]=(f+v)*w,i[2]=(p-S)*w,i[3]=0,i[4]=(f-v)*E,i[5]=(1-(u+m))*E,i[6]=(g+_)*E,i[7]=0,i[8]=(p+S)*x,i[9]=(g-_)*x,i[10]=(1-(u+b))*x,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;e.x=i[12],e.y=i[13],e.z=i[14];const a=this.determinantAffine();if(a===0)return n.set(1,1,1),t.identity(),this;let r=Xi.set(i[0],i[1],i[2]).length();const o=Xi.set(i[4],i[5],i[6]).length(),c=Xi.set(i[8],i[9],i[10]).length();a<0&&(r=-r),Mn.copy(this);const l=1/r,h=1/o,d=1/c;return Mn.elements[0]*=l,Mn.elements[1]*=l,Mn.elements[2]*=l,Mn.elements[4]*=h,Mn.elements[5]*=h,Mn.elements[6]*=h,Mn.elements[8]*=d,Mn.elements[9]*=d,Mn.elements[10]*=d,t.setFromRotationMatrix(Mn),n.x=r,n.y=o,n.z=c,this}makePerspective(e,t,n,i,a,r,o=Tn,c=!1){const l=this.elements,h=2*a/(t-e),d=2*a/(n-i),u=(t+e)/(t-e),f=(n+i)/(n-i);let p,b;if(c)p=a/(r-a),b=r*a/(r-a);else if(o===Tn)p=-(r+a)/(r-a),b=-2*r*a/(r-a);else if(o===ia)p=-r/(r-a),b=-r*a/(r-a);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,a,r,o=Tn,c=!1){const l=this.elements,h=2/(t-e),d=2/(n-i),u=-(t+e)/(t-e),f=-(n+i)/(n-i);let p,b;if(c)p=1/(r-a),b=r/(r-a);else if(o===Tn)p=-2/(r-a),b=-(r+a)/(r-a);else if(o===ia)p=-1/(r-a),b=-a/(r-a);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=d,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=p,l[14]=b,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Xi=new y,Mn=new Ve,ff=new y(0,0,0),pf=new y(1,1,1),li=new y,ma=new y,hn=new y,gl=new Ve,bl=new mt;class qn{constructor(e=0,t=0,n=0,i=qn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,a=i[0],r=i[4],o=i[8],c=i[1],l=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(t){case"XYZ":this._y=Math.asin(it(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-r,a)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-it(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,a),this._z=0);break;case"ZXY":this._x=Math.asin(it(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-r,l)):(this._y=0,this._z=Math.atan2(c,a));break;case"ZYX":this._y=Math.asin(-it(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,a)):(this._x=0,this._z=Math.atan2(-r,l));break;case"YZX":this._z=Math.asin(it(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,a)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-it(r,-1,1)),Math.abs(r)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,a)):(this._x=Math.atan2(-h,f),this._y=0);break;default:He("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return gl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(gl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return bl.setFromEuler(this),this.setFromQuaternion(bl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}qn.DEFAULT_ORDER="XYZ";class Ac{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let mf=0;const _l=new y,Ki=new mt,Yn=new Ve,ga=new y,Rs=new y,gf=new y,bf=new mt,xl=new y(1,0,0),vl=new y(0,1,0),yl=new y(0,0,1),Ml={type:"added"},_f={type:"removed"},ji={type:"childadded",child:null},Fr={type:"childremoved",child:null};class Rt extends wi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:mf++}),this.uuid=Xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Rt.DEFAULT_UP.clone();const e=new y,t=new qn,n=new mt,i=new y(1,1,1);function a(){n.setFromEuler(t,!1)}function r(){t.setFromQuaternion(n,void 0,!1)}t._onChange(a),n._onChange(r),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Ve},normalMatrix:{value:new Je}}),this.matrix=new Ve,this.matrixWorld=new Ve,this.matrixAutoUpdate=Rt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ac,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.multiply(Ki),this}rotateOnWorldAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.premultiply(Ki),this}rotateX(e){return this.rotateOnAxis(xl,e)}rotateY(e){return this.rotateOnAxis(vl,e)}rotateZ(e){return this.rotateOnAxis(yl,e)}translateOnAxis(e,t){return _l.copy(e).applyQuaternion(this.quaternion),this.position.add(_l.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(xl,e)}translateY(e){return this.translateOnAxis(vl,e)}translateZ(e){return this.translateOnAxis(yl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Yn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ga.copy(e):ga.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Rs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Yn.lookAt(Rs,ga,this.up):Yn.lookAt(ga,Rs,this.up),this.quaternion.setFromRotationMatrix(Yn),i&&(Yn.extractRotation(i.matrixWorld),Ki.setFromRotationMatrix(Yn),this.quaternion.premultiply(Ki.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ze("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ml),ji.child=e,this.dispatchEvent(ji),ji.child=null):Ze("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(_f),Fr.child=e,this.dispatchEvent(Fr),Fr.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Yn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Yn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Yn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ml),ji.child=e,this.dispatchEvent(ji),ji.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let a=0,r=i.length;a<r;a++)i[a].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rs,e,gf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rs,bf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,i=e.z,a=this.matrix.elements;a[12]+=t-a[0]*t-a[4]*n-a[8]*i,a[13]+=n-a[1]*t-a[5]*n-a[9]*i,a[14]+=i-a[2]*t-a[6]*n-a[10]*i}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){const a=this.children;for(let r=0,o=a.length;r<o;r++)a[r].updateWorldMatrix(!1,!0,n)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,i.name=this.name,i.castShadow=this.castShadow,i.receiveShadow=this.receiveShadow,i.visible=this.visible,i.frustumCulled=this.frustumCulled,i.renderOrder=this.renderOrder,i.static=this.static,i.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.pivot!==null&&(i.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(i.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(i.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(o=>({...o})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function a(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=a(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const d=c[l];a(e.shapes,d)}else a(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(a(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(a(e.materials,this.material[c]));i.material=o}else i.material=a(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];i.animations.push(a(e.animations,c))}}if(t){const o=r(e.geometries),c=r(e.materials),l=r(e.textures),h=r(e.images),d=r(e.shapes),u=r(e.skeletons),f=r(e.animations),p=r(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),p.length>0&&(n.nodes=p)}return n.object=i,n;function r(o){const c=[];for(const l in o){const h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}Rt.DEFAULT_UP=new y(0,1,0);Rt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Rt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class An extends Rt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const xf={type:"move"};class Ur{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new An,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new An,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new y,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new y),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new An,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new y,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new y,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,a=null,r=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){r=!0;for(const b of e.hand.values()){const g=t.getJointPose(b,n),m=this._getHandJoint(l,b);g!==null&&(m.matrix.fromArray(g.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=g.radius),m.visible=g!==null}const h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,p=.005;l.inputState.pinching&&u>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(a=t.getPose(e.gripSpace,n),a!==null&&(c.matrix.fromArray(a.transform.matrix),c.matrix.decompose(c.position,c.quaternion,c.scale),c.matrixWorldNeedsUpdate=!0,a.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(a.linearVelocity)):c.hasLinearVelocity=!1,a.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(a.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&a!==null&&(i=a),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(xf)))}return o!==null&&(o.visible=i!==null),c!==null&&(c.visible=a!==null),l!==null&&(l.visible=r!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new An;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const gd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},hi={h:0,s:0,l:0},ba={h:0,s:0,l:0};function kr(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class me{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Xt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,lt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=lt.workingColorSpace){return this.r=e,this.g=t,this.b=n,lt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=lt.workingColorSpace){if(e=Sc(e,1),t=it(t,0,1),n=it(n,0,1),t===0)this.r=this.g=this.b=n;else{const a=n<=.5?n*(1+t):n+t-n*t,r=2*n-a;this.r=kr(r,a,e+1/3),this.g=kr(r,a,e),this.b=kr(r,a,e-1/3)}return lt.colorSpaceToWorking(this,i),this}setStyle(e,t=Xt){function n(a){a!==void 0&&parseFloat(a)<1&&He("Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let a;const r=i[1],o=i[2];switch(r){case"rgb":case"rgba":if(a=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(255,parseInt(a[1],10))/255,Math.min(255,parseInt(a[2],10))/255,Math.min(255,parseInt(a[3],10))/255,t);if(a=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setRGB(Math.min(100,parseFloat(a[1]))/100,Math.min(100,parseFloat(a[2]))/100,Math.min(100,parseFloat(a[3]))/100,t);break;case"hsl":case"hsla":if(a=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(a[4]),this.setHSL(parseFloat(a[1])/360,parseFloat(a[2])/100,parseFloat(a[3])/100,t);break;default:He("Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const a=i[1],r=a.length;if(r===3)return this.setRGB(parseInt(a.charAt(0),16)/15,parseInt(a.charAt(1),16)/15,parseInt(a.charAt(2),16)/15,t);if(r===6)return this.setHex(parseInt(a,16),t);He("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Xt){const n=gd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):He("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ai(e.r),this.g=ai(e.g),this.b=ai(e.b),this}copyLinearToSRGB(e){return this.r=fs(e.r),this.g=fs(e.g),this.b=fs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Xt){return lt.workingToColorSpace(en.copy(this),e),Math.round(it(en.r*255,0,255))*65536+Math.round(it(en.g*255,0,255))*256+Math.round(it(en.b*255,0,255))}getHexString(e=Xt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=lt.workingColorSpace){lt.workingToColorSpace(en.copy(this),t);const n=en.r,i=en.g,a=en.b,r=Math.max(n,i,a),o=Math.min(n,i,a);let c,l;const h=(o+r)/2;if(o===r)c=0,l=0;else{const d=r-o;switch(l=h<=.5?d/(r+o):d/(2-r-o),r){case n:c=(i-a)/d+(i<a?6:0);break;case i:c=(a-n)/d+2;break;case a:c=(n-i)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=lt.workingColorSpace){return lt.workingToColorSpace(en.copy(this),t),e.r=en.r,e.g=en.g,e.b=en.b,e}getStyle(e=Xt){lt.workingToColorSpace(en.copy(this),e);const t=en.r,n=en.g,i=en.b;return e!==Xt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(hi),this.setHSL(hi.h+e,hi.s+t,hi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(hi),e.getHSL(ba);const n=Ys(hi.h,ba.h,t),i=Ys(hi.s,ba.s,t),a=Ys(hi.l,ba.l,t);return this.setHSL(n,i,a),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,a=e.elements;return this.r=a[0]*t+a[3]*n+a[6]*i,this.g=a[1]*t+a[4]*n+a[7]*i,this.b=a[2]*t+a[5]*n+a[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const en=new me;me.NAMES=gd;class Sl extends Rt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new qn,this.environmentIntensity=1,this.environmentRotation=new qn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background!==null?e.background.clone():null,this.environment=e.environment!==null?e.environment.clone():null,this.fog=e.fog!==null?e.fog.clone():null,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial!==null?e.overrideMaterial.clone():null,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Sn=new y,Jn=new y,Or=new y,Zn=new y,Yi=new y,Ji=new y,wl=new y,zr=new y,Br=new y,Gr=new y,Hr=new St,Vr=new St,Wr=new St;class _n{constructor(e=new y,t=new y,n=new y){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),Sn.subVectors(e,t),i.cross(Sn);const a=i.lengthSq();return a>0?i.multiplyScalar(1/Math.sqrt(a)):i.set(0,0,0)}static getBarycoord(e,t,n,i,a){Sn.subVectors(i,t),Jn.subVectors(n,t),Or.subVectors(e,t);const r=Sn.dot(Sn),o=Sn.dot(Jn),c=Sn.dot(Or),l=Jn.dot(Jn),h=Jn.dot(Or),d=r*l-o*o;if(d===0)return a.set(0,0,0),null;const u=1/d,f=(l*c-o*h)*u,p=(r*h-o*c)*u;return a.set(1-f-p,p,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Zn)===null?!1:Zn.x>=0&&Zn.y>=0&&Zn.x+Zn.y<=1}static getInterpolation(e,t,n,i,a,r,o,c){return this.getBarycoord(e,t,n,i,Zn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(a,Zn.x),c.addScaledVector(r,Zn.y),c.addScaledVector(o,Zn.z),c)}static getInterpolatedAttribute(e,t,n,i,a,r){return Hr.setScalar(0),Vr.setScalar(0),Wr.setScalar(0),Hr.fromBufferAttribute(e,t),Vr.fromBufferAttribute(e,n),Wr.fromBufferAttribute(e,i),r.setScalar(0),r.addScaledVector(Hr,a.x),r.addScaledVector(Vr,a.y),r.addScaledVector(Wr,a.z),r}static isFrontFacing(e,t,n,i){return Sn.subVectors(n,t),Jn.subVectors(e,t),Sn.cross(Jn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Sn.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),Sn.cross(Jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return _n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return _n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,a){return _n.getInterpolation(e,this.a,this.b,this.c,t,n,i,a)}containsPoint(e){return _n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return _n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,a=this.c;let r,o;Yi.subVectors(i,n),Ji.subVectors(a,n),zr.subVectors(e,n);const c=Yi.dot(zr),l=Ji.dot(zr);if(c<=0&&l<=0)return t.copy(n);Br.subVectors(e,i);const h=Yi.dot(Br),d=Ji.dot(Br);if(h>=0&&d<=h)return t.copy(i);const u=c*d-h*l;if(u<=0&&c>=0&&h<=0&&c-h>0)return r=c/(c-h),t.copy(n).addScaledVector(Yi,r);Gr.subVectors(e,a);const f=Yi.dot(Gr),p=Ji.dot(Gr);if(p>=0&&f<=p)return t.copy(a);const b=f*l-c*p;if(b<=0&&l>=0&&p<=0)return o=l/(l-p),t.copy(n).addScaledVector(Ji,o);const g=h*p-f*d;if(g<=0&&d-h>=0&&f-p>=0)return wl.subVectors(a,i),o=(d-h)/(d-h+(f-p)),t.copy(i).addScaledVector(wl,o);const m=1/(g+b+u);return r=b*m,o=u*m,t.copy(n).addScaledVector(Yi,r).addScaledVector(Ji,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Kn{constructor(e=new y(1/0,1/0,1/0),t=new y(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(wn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(wn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=wn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const a=n.getAttribute("position");if(t===!0&&a!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let r=0,o=a.count;r<o;r++)e.isMesh===!0?e.getVertexPosition(r,wn):wn.fromBufferAttribute(a,r),wn.applyMatrix4(e.matrixWorld),this.expandByPoint(wn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_a.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),_a.copy(n.boundingBox)),_a.applyMatrix4(e.matrixWorld),this.union(_a)}const i=e.children;for(let a=0,r=i.length;a<r;a++)this.expandByObject(i[a],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,wn),wn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ps),xa.subVectors(this.max,Ps),Zi.subVectors(e.a,Ps),$i.subVectors(e.b,Ps),Qi.subVectors(e.c,Ps),di.subVectors($i,Zi),ui.subVectors(Qi,$i),Li.subVectors(Zi,Qi);let t=[0,-di.z,di.y,0,-ui.z,ui.y,0,-Li.z,Li.y,di.z,0,-di.x,ui.z,0,-ui.x,Li.z,0,-Li.x,-di.y,di.x,0,-ui.y,ui.x,0,-Li.y,Li.x,0];return!qr(t,Zi,$i,Qi,xa)||(t=[1,0,0,0,1,0,0,0,1],!qr(t,Zi,$i,Qi,xa))?!1:(va.crossVectors(di,ui),t=[va.x,va.y,va.z],qr(t,Zi,$i,Qi,xa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,wn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(wn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:($n[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),$n[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),$n[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),$n[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),$n[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),$n[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),$n[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),$n[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints($n),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const $n=[new y,new y,new y,new y,new y,new y,new y,new y],wn=new y,_a=new Kn,Zi=new y,$i=new y,Qi=new y,di=new y,ui=new y,Li=new y,Ps=new y,xa=new y,va=new y,Di=new y;function qr(s,e,t,n,i){for(let a=0,r=s.length-3;a<=r;a+=3){Di.fromArray(s,a);const o=i.x*Math.abs(Di.x)+i.y*Math.abs(Di.y)+i.z*Math.abs(Di.z),c=e.dot(Di),l=t.dot(Di),h=n.dot(Di);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}const Ut=new y,ya=new Ke;let vf=0;class Dt extends wi{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:vf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=ud,this.updateRanges=[],this.gpuType=xn,this.version=0,this._normalizationScale=e!==void 0?br(e):void 0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,a=this.itemSize;i<a;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ya.fromBufferAttribute(this,t),ya.applyMatrix3(e),this.setXY(t,ya.x,ya.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyMatrix3(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyMatrix4(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyNormalMatrix(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.transformDirection(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,a){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),a=this._normalize(a)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=a,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):wc(e,this.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Ec(e,this.array)}}class _r extends Dt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class bd extends Dt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class et extends Dt{constructor(e,t,n){super(new Float32Array(e),t,n)}}const yf=new Kn,Cs=new y,Xr=new y;class vn{constructor(e=new y,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):yf.setFromPoints(e).getCenter(n);let i=0;for(let a=0,r=e.length;a<r;a++)i=Math.max(i,n.distanceToSquared(e[a]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Cs.subVectors(e,this.center);const t=Cs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Cs,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Xr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Cs.copy(e.center).add(Xr)),this.expandByPoint(Cs.copy(e.center).sub(Xr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Mf=0;const mn=new Ve,Kr=new Rt,es=new y,dn=new Kn,Ls=new Kn,qt=new y;class yt extends wi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Mf++}),this.uuid=Xn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Bu(e)?bd:_r)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const a=new Je().getNormalMatrix(e);n.applyNormalMatrix(a),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return mn.makeRotationFromQuaternion(e),this.applyMatrix4(mn),this}rotateX(e){return mn.makeRotationX(e),this.applyMatrix4(mn),this}rotateY(e){return mn.makeRotationY(e),this.applyMatrix4(mn),this}rotateZ(e){return mn.makeRotationZ(e),this.applyMatrix4(mn),this}translate(e,t,n){return mn.makeTranslation(e,t,n),this.applyMatrix4(mn),this}scale(e,t,n){return mn.makeScale(e,t,n),this.applyMatrix4(mn),this}lookAt(e){return Kr.lookAt(e),Kr.updateMatrix(),this.applyMatrix4(Kr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(es).negate(),this.translate(es.x,es.y,es.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,a=e.length;i<a;i++){const r=e[i];n.push(r.x,r.y,r.z||0)}this.setAttribute("position",new et(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const a=e[i];t.setXYZ(i,a.x,a.y,a.z||0)}e.length>t.count&&He("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Kn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ze("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new y(-1/0,-1/0,-1/0),new y(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const a=t[n];dn.setFromBufferAttribute(a),this.morphTargetsRelative?(qt.addVectors(this.boundingBox.min,dn.min),this.boundingBox.expandByPoint(qt),qt.addVectors(this.boundingBox.max,dn.max),this.boundingBox.expandByPoint(qt)):(this.boundingBox.expandByPoint(dn.min),this.boundingBox.expandByPoint(dn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ze('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new vn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ze("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new y,1/0);return}if(e){const n=this.boundingSphere.center;if(dn.setFromBufferAttribute(e),t)for(let a=0,r=t.length;a<r;a++){const o=t[a];Ls.setFromBufferAttribute(o),this.morphTargetsRelative?(qt.addVectors(dn.min,Ls.min),dn.expandByPoint(qt),qt.addVectors(dn.max,Ls.max),dn.expandByPoint(qt)):(dn.expandByPoint(Ls.min),dn.expandByPoint(Ls.max))}dn.getCenter(n);let i=0;for(let a=0,r=e.count;a<r;a++)qt.fromBufferAttribute(e,a),i=Math.max(i,n.distanceToSquared(qt));if(t)for(let a=0,r=t.length;a<r;a++){const o=t[a],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)qt.fromBufferAttribute(o,l),c&&(es.fromBufferAttribute(e,l),qt.add(es)),i=Math.max(i,n.distanceToSquared(qt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&Ze('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ze("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,a=t.uv;let r=this.getAttribute("tangent");(r===void 0||r.count!==n.count)&&(r=new Dt(new Float32Array(4*n.count),4),this.setAttribute("tangent",r));const o=[],c=[],l=new Uint8Array(n.count);for(let N=0;N<n.count;N++)o[N]=new y,c[N]=new y;const h=new y,d=new y,u=new y,f=new Ke,p=new Ke,b=new Ke,g=new y,m=new y;function _(N,P,I){l[N]=l[P]=l[I]=1,h.fromBufferAttribute(n,N),d.fromBufferAttribute(n,P),u.fromBufferAttribute(n,I),f.fromBufferAttribute(a,N),p.fromBufferAttribute(a,P),b.fromBufferAttribute(a,I),d.sub(h),u.sub(h),p.sub(f),b.sub(f);const D=1/(p.x*b.y-b.x*p.y);isFinite(D)&&(g.copy(d).multiplyScalar(b.y).addScaledVector(u,-p.y).multiplyScalar(D),m.copy(u).multiplyScalar(p.x).addScaledVector(d,-b.x).multiplyScalar(D),o[N].add(g),o[P].add(g),o[I].add(g),c[N].add(m),c[P].add(m),c[I].add(m))}let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let N=0,P=S.length;N<P;++N){const I=S[N],D=I.start,L=I.count;for(let R=D,k=D+L;R<k;R+=3)_(e.getX(R+0),e.getX(R+1),e.getX(R+2))}const v=new y,w=new y,E=new y,x=new y;function M(N){E.fromBufferAttribute(i,N),x.copy(E);const P=o[N];v.copy(P),v.sub(E.multiplyScalar(E.dot(P))).normalize(),w.crossVectors(x,P);const D=w.dot(c[N])<0?-1:1;r.setXYZW(N,v.x,v.y,v.z,D)}for(let N=0,P=n.count;N<P;++N)l[N]&&M(N);this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new Dt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new y,a=new y,r=new y,o=new y,c=new y,l=new y,h=new y,d=new y;if(e)for(let u=0,f=e.count;u<f;u+=3){const p=e.getX(u+0),b=e.getX(u+1),g=e.getX(u+2);i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,b),r.fromBufferAttribute(t,g),h.subVectors(r,a),d.subVectors(i,a),h.cross(d),o.fromBufferAttribute(n,p),c.fromBufferAttribute(n,b),l.fromBufferAttribute(n,g),o.add(h),c.add(h),l.add(h),n.setXYZ(p,o.x,o.y,o.z),n.setXYZ(b,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=t.count;u<f;u+=3)i.fromBufferAttribute(t,u+0),a.fromBufferAttribute(t,u+1),r.fromBufferAttribute(t,u+2),h.subVectors(r,a),d.subVectors(i,a),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)qt.fromBufferAttribute(e,t),qt.normalize(),e.setXYZ(t,qt.x,qt.y,qt.z)}toNonIndexed(){function e(o,c){const l=o.array,h=o.itemSize,d=o.normalized,u=new l.constructor(c.length*h);let f=0,p=0;for(let b=0,g=c.length;b<g;b++){o.isInterleavedBufferAttribute?f=c[b]*o.data.stride+o.offset:f=c[b]*h;for(let m=0;m<h;m++)u[p++]=l[f++]}return new Dt(u,h,d)}if(this.index===null)return He("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new yt,n=this.index.array,i=this.attributes;for(const o in i){const c=i[o],l=e(c,n);t.setAttribute(o,l)}const a=this.morphAttributes;for(const o in a){const c=[],l=a[o];for(let h=0,d=l.length;h<d;h++){const u=l[h],f=e(u,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const r=this.groups;for(let o=0,c=r.length;o<c;o++){const l=r[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const i={};let a=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){const f=l[d];h.push(f.toJSON(e.data))}h.length>0&&(i[c]=h,a=!0)}a&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const r=this.groups;r.length>0&&(e.data.groups=JSON.parse(JSON.stringify(r)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(t))}const a=e.morphAttributes;for(const l in a){const h=[],d=a[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const r=e.groups;for(let l=0,h=r.length;l<h;l++){const d=r[l];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Sf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=ud,this.updateRanges=[],this.version=0,this.uuid=Xn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,a=this.stride;i<a;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=El(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=this.array.slice(0).buffer);const n=new this.array.constructor(e.arrayBuffers[t]),i=new this.constructor(n,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=El(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=Array.from(new Uint32Array(this.array.slice(0).buffer)));const n={uuid:this.uuid,buffer:t,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}}function El(s){return s.buffer._uuid===void 0&&(s.buffer._uuid=Xn()),s.byteOffset===0&&s.byteLength===s.buffer.byteLength?s.buffer._uuid:s.buffer._uuid+":"+s.byteOffset+":"+s.byteLength}const sn=new y;class Rc{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i,this._normalizationScale=e!==void 0?br(e.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyMatrix4(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyNormalMatrix(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.transformDirection(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=this._denormalize(t)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=this._denormalize(t)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=this._denormalize(t)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=this._denormalize(t)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,a){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),i=this._normalize(i),a=this._normalize(a)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=a,this}clone(e){if(e===void 0){hr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[i+a])}return new Dt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Rc(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){hr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let a=0;a<this.itemSize;a++)t.push(this.data.array[i+a])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):wc(e,this.data.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Ec(e,this.data.array)}}const jr=new y,wf=new y,Ef=new Je;class ti{constructor(e=new y(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=jr.subVectors(n,t).cross(wf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const i=e.delta(jr),a=this.normal.dot(i);if(a===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/a;return n===!0&&(r<0||r>1)?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Ef.getNormalMatrix(e),i=this.coplanarPoint(jr).applyMatrix4(e),a=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(a),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}}let Tf=0;class Hn extends wi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Tf++}),this.uuid=Xn(),this.name="",this.type="Material",this.blending=Ks,this.side=yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=qh,this.blendDst=Xh,this.blendEquation=os,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new me(0,0,0),this.blendAlpha=0,this.depthFunc=$s,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Nu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Cr,this.stencilZFail=Cr,this.stencilZPass=Cr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){He(`Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){He(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector2&&n&&n.isVector2||i&&i.isEuler&&n&&n.isEuler||i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(a=>a.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(a){const r=[];for(const o in a){const c=a[o];delete c.metadata,r.push(c)}return r}if(t){const a=i(e.textures),r=i(e.images);a.length>0&&(n.textures=a),r.length>0&&(n.images=r)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new me().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new ti().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Ke().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Ke().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let a=0;a!==i;++a)n[a]=t[a].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Qn=new y,Yr=new y,Ma=new y,Sa=new y;class ys{constructor(e=new y,t=new y(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Qn.copy(this.origin).addScaledVector(this.direction,t),Qn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Yr.copy(e).add(t).multiplyScalar(.5),Ma.copy(t).sub(e).normalize(),Sa.copy(this.origin).sub(Yr);const a=e.distanceTo(t)*.5,r=-this.direction.dot(Ma),o=Sa.dot(this.direction),c=-Sa.dot(Ma),l=Sa.lengthSq(),h=Math.abs(1-r*r);let d,u,f,p;if(h>0)if(d=r*c-o,u=r*o-c,p=a*h,d>=0)if(u>=-p)if(u<=p){const b=1/h;d*=b,u*=b,f=d*(d+r*u+2*o)+u*(r*d+u+2*c)+l}else u=a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;else u=-a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;else u<=-p?(d=Math.max(0,-(-r*a+o)),u=d>0?-a:Math.min(Math.max(-a,-c),a),f=-d*d+u*(u+2*c)+l):u<=p?(d=0,u=Math.min(Math.max(-a,-c),a),f=u*(u+2*c)+l):(d=Math.max(0,-(r*a+o)),u=d>0?a:Math.min(Math.max(-a,-c),a),f=-d*d+u*(u+2*c)+l);else u=r>0?-a:a,d=Math.max(0,-(r*u+o)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(Yr).addScaledVector(Ma,u),f}intersectSphere(e,t){if(e.radius<0)return null;Qn.subVectors(e.center,this.origin);const n=Qn.dot(this.direction),i=Qn.dot(Qn)-n*n,a=e.radius*e.radius;if(i>a)return null;const r=Math.sqrt(a-i),o=n-r,c=n+r;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,a,r,o,c;const l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(e.min.x-u.x)*l,i=(e.max.x-u.x)*l):(n=(e.max.x-u.x)*l,i=(e.min.x-u.x)*l),h>=0?(a=(e.min.y-u.y)*h,r=(e.max.y-u.y)*h):(a=(e.max.y-u.y)*h,r=(e.min.y-u.y)*h),n>r||a>i||((a>n||isNaN(n))&&(n=a),(r<i||isNaN(i))&&(i=r),d>=0?(o=(e.min.z-u.z)*d,c=(e.max.z-u.z)*d):(o=(e.max.z-u.z)*d,c=(e.min.z-u.z)*d),n>c||o>i)||((o>n||n!==n)&&(n=o),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Qn)!==null}intersectTriangle(e,t,n,i,a){const r=this.origin,o=this.direction,c=o.x,l=o.y,h=o.z,d=e.x-r.x,u=e.y-r.y,f=e.z-r.z,p=t.x-r.x,b=t.y-r.y,g=t.z-r.z,m=n.x-r.x,_=n.y-r.y,S=n.z-r.z,v=Math.abs(c),w=Math.abs(l),E=Math.abs(h);let x,M,N,P,I,D,L,R,k,U,F,V;if(v>=w&&v>=E?(N=c,D=d,k=p,V=m,c>=0?(x=l,M=h,P=u,I=f,L=b,R=g,U=_,F=S):(x=h,M=l,P=f,I=u,L=g,R=b,U=S,F=_)):w>=E?(N=l,D=u,k=b,V=_,l>=0?(x=h,M=c,P=f,I=d,L=g,R=p,U=S,F=m):(x=c,M=h,P=d,I=f,L=p,R=g,U=m,F=S)):(N=h,D=f,k=g,V=S,h>=0?(x=c,M=l,P=d,I=u,L=p,R=b,U=m,F=_):(x=l,M=c,P=u,I=d,L=b,R=p,U=_,F=m)),N===0)return null;const O=x/N,W=M/N,Y=1/N,j=P-O*D,ue=I-W*D,H=L-O*k,Z=R-W*k,te=U-O*V,he=F-W*V,Q=te*Z-he*H,De=j*he-ue*te,Ye=H*ue-Z*j;if(i){if(Q<0||De<0||Ye<0)return null}else if((Q<0||De<0||Ye<0)&&(Q>0||De>0||Ye>0))return null;const be=Q+De+Ye;if(be===0)return null;const Fe=Y*(Q*D+De*k+Ye*V);return(be>0?Fe<0:Fe>0)?null:this.at(Fe/be,a)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Oi extends Hn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new me(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.combine=Kh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Tl=new Ve,Ii=new ys,wa=new vn,Al=new y,Ea=new y,Ta=new y,Aa=new y,Jr=new y,Ra=new y,Rl=new y,Pa=new y;class Nt extends Rt{constructor(e=new yt,t=new Oi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,a=n.morphAttributes.position,r=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const o=this.morphTargetInfluences;if(a&&o){Ra.set(0,0,0);for(let c=0,l=a.length;c<l;c++){const h=o[c],d=a[c];h!==0&&(Jr.fromBufferAttribute(d,e),r?Ra.addScaledVector(Jr,h):Ra.addScaledVector(Jr.sub(t),h))}t.add(Ra)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.material,a=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),wa.copy(n.boundingSphere),wa.applyMatrix4(a),Ii.copy(e.ray).recast(e.near),!(wa.containsPoint(Ii.origin)===!1&&(Ii.intersectSphere(wa,Al)===null||Ii.origin.distanceToSquared(Al)>(e.far-e.near)**2))&&(Tl.copy(a).invert(),Ii.copy(e.ray).applyMatrix4(Tl),!(n.boundingBox!==null&&Ii.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ii)))}_computeIntersections(e,t,n){let i;const a=this.geometry,r=this.material,o=a.index,c=a.attributes.position,l=a.attributes.uv,h=a.attributes.uv1,d=a.attributes.normal,u=a.groups,f=a.drawRange;if(o!==null)if(Array.isArray(r))for(let p=0,b=u.length;p<b;p++){const g=u[p],m=r[g.materialIndex],_=Math.max(g.start,f.start),S=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let v=_,w=S;v<w;v+=3){const E=o.getX(v),x=o.getX(v+1),M=o.getX(v+2);i=Ca(this,m,e,n,l,h,d,E,x,M),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),b=Math.min(o.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){const _=o.getX(g),S=o.getX(g+1),v=o.getX(g+2);i=Ca(this,r,e,n,l,h,d,_,S,v),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(c!==void 0)if(Array.isArray(r))for(let p=0,b=u.length;p<b;p++){const g=u[p],m=r[g.materialIndex],_=Math.max(g.start,f.start),S=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let v=_,w=S;v<w;v+=3){const E=v,x=v+1,M=v+2;i=Ca(this,m,e,n,l,h,d,E,x,M),i&&(i.faceIndex=Math.floor(v/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const p=Math.max(0,f.start),b=Math.min(c.count,f.start+f.count);for(let g=p,m=b;g<m;g+=3){const _=g,S=g+1,v=g+2;i=Ca(this,r,e,n,l,h,d,_,S,v),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function Af(s,e,t,n,i,a,r,o){let c;if(e.side===rn?c=n.intersectTriangle(r,a,i,!0,o):c=n.intersectTriangle(i,a,r,e.side===yi,o),c===null)return null;Pa.copy(o),Pa.applyMatrix4(s.matrixWorld);const l=t.ray.origin.distanceTo(Pa);return l<t.near||l>t.far?null:{distance:l,point:Pa.clone(),object:s}}function Ca(s,e,t,n,i,a,r,o,c,l){s.getVertexPosition(o,Ea),s.getVertexPosition(c,Ta),s.getVertexPosition(l,Aa);const h=Af(s,e,t,n,Ea,Ta,Aa,Rl);if(h){const d=new y;_n.getBarycoord(Rl,Ea,Ta,Aa,d),i&&(h.uv=_n.getInterpolatedAttribute(i,o,c,l,d,new Ke)),a&&(h.uv1=_n.getInterpolatedAttribute(a,o,c,l,d,new Ke)),r&&(h.normal=_n.getInterpolatedAttribute(r,o,c,l,d,new y),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const u={a:o,b:c,c:l,normal:new y,materialIndex:0};_n.getNormal(Ea,Ta,Aa,u.normal),h.face=u,h.barycoord=d}return h}const Ds=new St,Pl=new St,Cl=new St,Rf=new St,Ll=new Ve,La=new y,Zr=new vn,Dl=new Ve,$r=new ys;class kn extends Nt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=al,this.bindMatrix=new Ve,this.bindMatrixInverse=new Ve,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Kn),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,La),this.boundingBox.expandByPoint(La)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new vn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,La),this.boundingSphere.expandByPoint(La)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}raycast(e,t){const n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Zr.copy(this.boundingSphere),Zr.applyMatrix4(i),e.ray.intersectsSphere(Zr)!==!1&&(Dl.copy(i).invert(),$r.copy(e.ray).applyMatrix4(Dl),!(this.boundingBox!==null&&$r.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,$r)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new St,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);const a=1/e.manhattanLength();a!==1/0?e.multiplyScalar(a):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===al?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Pu?this.bindMatrixInverse.copy(this.bindMatrix).invert():He("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,i=this.geometry;Pl.fromBufferAttribute(i.attributes.skinIndex,e),Cl.fromBufferAttribute(i.attributes.skinWeight,e),t.isVector4?(Ds.copy(t),t.set(0,0,0,0)):(Ds.set(t.x,t.y,t.z,1),t.set(0,0,0)),Ds.applyMatrix4(this.bindMatrix);for(let a=0;a<4;a++){const r=Cl.getComponent(a);if(r!==0){const o=Pl.getComponent(a);Ll.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(Rf.copy(Ds).applyMatrix4(Ll),r)}}return t.isVector4&&(t.w=Ds.w),t.applyMatrix4(this.bindMatrixInverse)}}class Pc extends Rt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class xr extends jt{constructor(e=null,t=1,n=1,i,a,r,o,c,l=zt,h=zt,d,u){super(null,r,o,c,l,h,i,a,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Il=new Ve,Pf=new Ve;class vr{constructor(e=[],t=[]){this.uuid=Xn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.previousBoneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){He("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new Ve)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Ve;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let a=0,r=e.length;a<r;a++){const o=e[a]?e[a].matrixWorld:Pf;Il.multiplyMatrices(o,t[a]),Il.toArray(n,a*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new vr(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new xr(t,e,e,En,xn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null),this.previousBoneTexture!==null&&(this.previousBoneTexture.dispose(),this.previousBoneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){const a=e.bones[n];let r=t[a];r===void 0&&(He("Skeleton: No bone found with UUID:",a),r=new Pc),this.bones.push(r),this.boneInverses.push(new Ve().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let i=0,a=t.length;i<a;i++){const r=t[i];e.bones.push(r.uuid);const o=n[i];e.boneInverses.push(o.toArray())}return e}}class dr extends Dt{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const ts=new Ve,Nl=new Ve,Da=[],Fl=new Kn,Cf=new Ve,Is=new Nt,Ns=new vn;class Lf extends Nt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new dr(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Cf)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Kn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),Fl.copy(e.boundingBox).applyMatrix4(ts),this.boundingBox.union(Fl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new vn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),Ns.copy(e.boundingSphere).applyMatrix4(ts),this.boundingSphere.union(Ns)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture!==null?e.morphTexture.clone():null,this.instanceColor=e.instanceColor!==null?e.instanceColor.clone():null,this.count=e.count,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,a=n.length+1,r=e*a+1;for(let o=0;o<n.length;o++)n[o]=i[r+o]}raycast(e,t){const n=this.matrixWorld,i=this.count;if(Is.geometry=this.geometry,Is.material=this.material,Is.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ns.copy(this.boundingSphere),Ns.applyMatrix4(n),e.ray.intersectsSphere(Ns)!==!1))for(let a=0;a<i;a++){this.getMatrixAt(a,ts),Nl.multiplyMatrices(n,ts),Is.matrixWorld=Nl,Is.raycast(e,Da);for(let r=0,o=Da.length;r<o;r++){const c=Da[r];c.instanceId=a,c.object=this,t.push(c)}Da.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new dr(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new xr(new Float32Array(i*this.count),i,this.count,xc,xn));const a=this.morphTexture.source.data.data;let r=0;for(let l=0;l<n.length;l++)r+=n[l];const o=this.geometry.morphTargetsRelative?1:1-r,c=i*e;return a[c]=o,a.set(n,c+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Ni=new vn,Df=new Ke(.5,.5),Ia=new y;class aa{constructor(e=new ti,t=new ti,n=new ti,i=new ti,a=new ti,r=new ti){this.planes=[e,t,n,i,a,r]}set(e,t,n,i,a,r){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(a),o[5].copy(r),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Tn,n=!1){const i=this.planes,a=e.elements,r=a[0],o=a[1],c=a[2],l=a[3],h=a[4],d=a[5],u=a[6],f=a[7],p=a[8],b=a[9],g=a[10],m=a[11],_=a[12],S=a[13],v=a[14],w=a[15];if(i[0].setComponents(l-r,f-h,m-p,w-_).normalize(),i[1].setComponents(l+r,f+h,m+p,w+_).normalize(),i[2].setComponents(l+o,f+d,m+b,w+S).normalize(),i[3].setComponents(l-o,f-d,m-b,w-S).normalize(),n)i[4].setComponents(c,u,g,v).normalize(),i[5].setComponents(l-c,f-u,m-g,w-v).normalize();else if(i[4].setComponents(l-c,f-u,m-g,w-v).normalize(),t===Tn)i[5].setComponents(l+c,f+u,m+g,w+v).normalize();else if(t===ia)i[5].setComponents(c,u,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ni.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ni.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ni)}intersectsSprite(e){Ni.center.set(0,0,0);const t=Df.distanceTo(e.center);return Ni.radius=.7071067811865476+t,Ni.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ni)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let a=0;a<6;a++)if(t[a].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Ia.x=i.normal.x>0?e.max.x:e.min.x,Ia.y=i.normal.y>0?e.max.y:e.min.y,Ia.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Ia)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}const Ul=new Ve;class Cc{constructor(){this.coordinateSystem=Tn,this._frustums=[],this._count=0}setFromArrayCamera(e){const t=e.cameras,n=this._frustums;for(let i=0;i<t.length;i++){const a=t[i];Ul.multiplyMatrices(a.projectionMatrix,a.matrixWorldInverse),n[i]===void 0&&(n[i]=new aa),n[i].setFromProjectionMatrix(Ul,a.coordinateSystem,a.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;const t=this._frustums,n=e._frustums;for(let i=0;i<e._count;i++)t[i]===void 0&&(t[i]=new aa),t[i].copy(n[i]);return this._count=e._count,this}clone(){return new Cc().copy(this)}}class Lc extends Hn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new me(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ur=new y,fr=new y,kl=new Ve,Fs=new ys,Na=new vn,Qr=new y,Ol=new y;class Dc extends Rt{constructor(e=new yt,t=new Lc){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,a=t.count;i<a;i++)ur.fromBufferAttribute(t,i-1),fr.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=ur.distanceTo(fr);e.setAttribute("lineDistance",new et(n,1))}else He("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.matrixWorld,a=e.params.Line.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Na.copy(n.boundingSphere),Na.applyMatrix4(i),Na.radius+=a,e.ray.intersectsSphere(Na)===!1)return;kl.copy(i).invert(),Fs.copy(e.ray).applyMatrix4(kl);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){const f=Math.max(0,r.start),p=Math.min(h.count,r.start+r.count);for(let b=f,g=p-1;b<g;b+=l){const m=h.getX(b),_=h.getX(b+1),S=Fa(this,e,Fs,c,m,_,b);S&&t.push(S)}if(this.isLineLoop){const b=h.getX(p-1),g=h.getX(f),m=Fa(this,e,Fs,c,b,g,p-1);m&&t.push(m)}}else{const f=Math.max(0,r.start),p=Math.min(u.count,r.start+r.count);for(let b=f,g=p-1;b<g;b+=l){const m=Fa(this,e,Fs,c,b,b+1,b);m&&t.push(m)}if(this.isLineLoop){const b=Fa(this,e,Fs,c,p-1,f,p-1);b&&t.push(b)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Fa(s,e,t,n,i,a,r){const o=s.geometry.attributes.position;if(ur.fromBufferAttribute(o,i),fr.fromBufferAttribute(o,a),t.distanceSqToSegment(ur,fr,Qr,Ol)>n)return;Qr.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(Qr);if(!(l<e.near||l>e.far))return{distance:l,point:Ol.clone().applyMatrix4(s.matrixWorld),index:r,face:null,faceIndex:null,barycoord:null,object:s}}const zl=new y,Bl=new y;class _d extends Dc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,a=t.count;i<a;i+=2)zl.fromBufferAttribute(t,i),Bl.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+zl.distanceTo(Bl);e.setAttribute("lineDistance",new et(n,1))}else He("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class If extends Dc{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class xd extends Hn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new me(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Gl=new Ve,rc=new ys,Ua=new vn,ka=new y;class Nf extends Rt{constructor(e=new yt,t=new xd){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,i=this.matrixWorld,a=e.params.Points.threshold,r=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ua.copy(n.boundingSphere),Ua.applyMatrix4(i),Ua.radius+=a,e.ray.intersectsSphere(Ua)===!1)return;Gl.copy(i).invert(),rc.copy(e.ray).applyMatrix4(Gl);const o=a/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,d=n.attributes.position;if(l!==null){const u=Math.max(0,r.start),f=Math.min(l.count,r.start+r.count);for(let p=u,b=f;p<b;p++){const g=l.getX(p);ka.fromBufferAttribute(d,g),Hl(ka,g,c,i,e,t,this)}}else{const u=Math.max(0,r.start),f=Math.min(d.count,r.start+r.count);for(let p=u,b=f;p<b;p++)ka.fromBufferAttribute(d,p),Hl(ka,p,c,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let a=0,r=i.length;a<r;a++){const o=i[a].name||String(a);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=a}}}}}function Hl(s,e,t,n,i,a,r){const o=rc.distanceSqToPoint(s);if(o<t){const c=new y;rc.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;a.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:r})}}class vd extends jt{constructor(e=[],t=ms,n,i,a,r,o,c,l,h){super(e,t,n,i,a,r,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class _s extends jt{constructor(e,t,n=Vn,i,a,r,o=zt,c=zt,l,h=Mi,d=1){if(h!==Mi&&h!==_i)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const u={width:e,height:t,depth:d};super(u,i,a,r,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Tc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}}class yd extends _s{constructor(e,t=Vn,n=ms,i,a,r=zt,o=zt,c,l=Mi){const h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,i,a,r,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Md extends jt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ha extends yt{constructor(e=1,t=1,n=1,i=1,a=1,r=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:a,depthSegments:r};const o=this;i=Math.floor(i),a=Math.floor(a),r=Math.floor(r);const c=[],l=[],h=[],d=[];let u=0,f=0;p("z","y","x",-1,-1,n,t,e,r,a,0),p("z","y","x",1,-1,n,t,-e,r,a,1),p("x","z","y",1,1,e,n,t,i,r,2),p("x","z","y",1,-1,e,n,-t,i,r,3),p("x","y","z",1,-1,e,t,n,i,a,4),p("x","y","z",-1,-1,e,t,-n,i,a,5),this.setIndex(c),this.setAttribute("position",new et(l,3)),this.setAttribute("normal",new et(h,3)),this.setAttribute("uv",new et(d,2));function p(b,g,m,_,S,v,w,E,x,M,N){const P=v/x,I=w/M,D=v/2,L=w/2,R=E/2,k=x+1,U=M+1;let F=0,V=0;const O=new y;for(let W=0;W<U;W++){const Y=W*I-L;for(let j=0;j<k;j++){const ue=j*P-D;O[b]=ue*_,O[g]=Y*S,O[m]=R,l.push(O.x,O.y,O.z),O[b]=0,O[g]=0,O[m]=E>0?1:-1,h.push(O.x,O.y,O.z),d.push(j/x),d.push(1-W/M),F+=1}}for(let W=0;W<M;W++)for(let Y=0;Y<x;Y++){const j=u+Y+k*W,ue=u+Y+k*(W+1),H=u+(Y+1)+k*(W+1),Z=u+(Y+1)+k*W;c.push(j,ue,Z),c.push(ue,H,Z),V+=6}o.addGroup(f,V,N),f+=V,u+=F}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ha(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class da extends yt{constructor(e=1,t=1,n=1,i=32,a=1,r=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:a,openEnded:r,thetaStart:o,thetaLength:c};const l=this;i=Math.floor(i),a=Math.floor(a);const h=[],d=[],u=[],f=[];let p=0;const b=[],g=n/2;let m=0;_(),r===!1&&(e>0&&S(!0),t>0&&S(!1)),this.setIndex(h),this.setAttribute("position",new et(d,3)),this.setAttribute("normal",new et(u,3)),this.setAttribute("uv",new et(f,2));function _(){const v=new y,w=new y;let E=0;const x=(t-e)/n;for(let M=0;M<=a;M++){const N=[],P=M/a,I=P*(t-e)+e;for(let D=0;D<=i;D++){const L=D/i,R=L*c+o,k=Math.sin(R),U=Math.cos(R);w.x=I*k,w.y=-P*n+g,w.z=I*U,d.push(w.x,w.y,w.z),v.set(k,x,U).normalize(),u.push(v.x,v.y,v.z),f.push(L,1-P),N.push(p++)}b.push(N)}for(let M=0;M<i;M++)for(let N=0;N<a;N++){const P=b[N][M],I=b[N+1][M],D=b[N+1][M+1],L=b[N][M+1];(e>0||N!==0)&&(h.push(P,I,L),E+=3),(t>0||N!==a-1)&&(h.push(I,D,L),E+=3)}l.addGroup(m,E,0),m+=E}function S(v){const w=p,E=new Ke,x=new y;let M=0;const N=v===!0?e:t,P=v===!0?1:-1;for(let D=1;D<=i;D++)d.push(0,g*P,0),u.push(0,P,0),f.push(.5,.5),p++;const I=p;for(let D=0;D<=i;D++){const R=D/i*c+o,k=Math.cos(R),U=Math.sin(R);x.x=N*U,x.y=g*P,x.z=N*k,d.push(x.x,x.y,x.z),u.push(0,P,0),E.x=k*.5+.5,E.y=U*.5*P+.5,f.push(E.x,E.y),p++}for(let D=0;D<i;D++){const L=w+D,R=I+D;v===!0?h.push(R,R+1,L):h.push(R+1,R,L),M+=3}l.addGroup(m,M,v===!0?1:2),m+=M}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new da(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Ic{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){He("Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),a=0;t.push(0);for(let r=1;r<=e;r++)n=this.getPoint(r/e),a+=n.distanceTo(i),t.push(a),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let i=0;const a=n.length;let r;t?r=t:r=e*n[a-1];let o=0,c=a-1,l;for(;o<=c;)if(i=Math.floor(o+(c-o)/2),l=n[i]-r,l<0)o=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===r)return i/(a-1);const h=n[i],u=n[i+1]-h,f=(r-h)/u;return(i+f)/(a-1)}getTangent(e,t){let i=e-1e-4,a=e+1e-4;i<0&&(i=0),a>1&&(a=1);const r=this.getPoint(i),o=this.getPoint(a),c=t||(r.isVector2?new Ke:new y);return c.copy(o).sub(r).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new y,i=[],a=[],r=[],o=new y,c=new Ve;for(let f=0;f<=e;f++){const p=f/e;i[f]=this.getTangentAt(p,new y)}a[0]=new y,r[0]=new y;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),a[0].crossVectors(i[0],o),r[0].crossVectors(i[0],a[0]);for(let f=1;f<=e;f++){if(a[f]=a[f-1].clone(),r[f]=r[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();const p=Math.acos(it(i[f-1].dot(i[f]),-1,1));a[f].applyMatrix4(c.makeRotationAxis(o,p))}r[f].crossVectors(i[f],a[f])}if(t===!0){let f=Math.acos(it(a[0].dot(a[e]),-1,1));f/=e,i[0].dot(o.crossVectors(a[0],a[e]))>0&&(f=-f);for(let p=1;p<=e;p++)a[p].applyMatrix4(c.makeRotationAxis(i[p],f*p)),r[p].crossVectors(i[p],a[p])}return{tangents:i,normals:a,binormals:r}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this.cacheArcLengths=null,this}}function Nc(){let s=0,e=0,t=0,n=0;function i(a,r,o,c){s=a,e=o,t=-3*a+3*r-2*o-c,n=2*a-2*r+o+c}return{initCatmullRom:function(a,r,o,c,l){i(r,o,l*(o-a),l*(c-r))},initNonuniformCatmullRom:function(a,r,o,c,l,h,d){let u=(r-a)/l-(o-a)/(l+h)+(o-r)/h,f=(o-r)/h-(c-r)/(h+d)+(c-o)/d;u*=h,f*=h,i(r,o,u,f)},calc:function(a){const r=a*a,o=r*a;return s+e*a+t*r+n*o}}}const Vl=new y,Wl=new y,eo=new Nc,to=new Nc,no=new Nc;class pr extends Ic{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new y){const n=t,i=this.points,a=i.length,r=(a-(this.closed?0:1))*e;let o=Math.floor(r),c=r-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/a)+1)*a:c===0&&o===a-1&&(o=a-2,c=1);let l,h;this.closed||o>0?l=i[(o-1)%a]:(Wl.subVectors(i[0],i[1]).add(i[0]),l=Wl);const d=i[o%a],u=i[(o+1)%a];if(this.closed||o+2<a?h=i[(o+2)%a]:(Vl.subVectors(i[a-1],i[a-2]).add(i[a-1]),h=Vl),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let p=Math.pow(l.distanceToSquared(d),f),b=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);b<1e-4&&(b=1),p<1e-4&&(p=b),g<1e-4&&(g=b),eo.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,p,b,g),to.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,p,b,g),no.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,p,b,g)}else this.curveType==="catmullrom"&&(eo.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),to.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),no.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(eo.calc(c),to.calc(c),no.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new y().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Ff(s,e){const t=1-s;return t*t*e}function Uf(s,e){return 2*(1-s)*s*e}function kf(s,e){return s*s*e}function io(s,e,t,n){return Ff(s,e)+Uf(s,t)+kf(s,n)}class Of extends Ic{constructor(e=new y,t=new y){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new y){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new y){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class oc extends Ic{constructor(e=new y,t=new y,n=new y){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new y){const n=t,i=this.v0,a=this.v1,r=this.v2;return n.set(io(e,i.x,a.x,r.x),io(e,i.y,a.y,r.y),io(e,i.z,a.z,r.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class yr extends yt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const a=e/2,r=t/2,o=Math.floor(n),c=Math.floor(i),l=o+1,h=c+1,d=e/o,u=t/c,f=[],p=[],b=[],g=[];for(let m=0;m<h;m++){const _=m*u-r;for(let S=0;S<l;S++){const v=S*d-a;p.push(v,-_,0),b.push(0,0,1),g.push(S/o),g.push(1-m/c)}}for(let m=0;m<c;m++)for(let _=0;_<o;_++){const S=_+l*m,v=_+l*(m+1),w=_+1+l*(m+1),E=_+1+l*m;f.push(S,v,E),f.push(v,w,E)}this.setIndex(f),this.setAttribute("position",new et(p,3)),this.setAttribute("normal",new et(b,3)),this.setAttribute("uv",new et(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new yr(e.width,e.height,e.widthSegments,e.heightSegments)}}class Vi extends yt{constructor(e=1,t=32,n=16,i=0,a=Math.PI*2,r=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:a,thetaStart:r,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(r+o,Math.PI);let l=0;const h=[],d=new y,u=new y,f=[],p=[],b=[],g=[];for(let m=0;m<=n;m++){const _=[],S=m/n,v=r+S*o,w=e*Math.cos(v),E=Math.sqrt(e*e-w*w);let x=0;m===0&&r===0?x=.5/t:m===n&&c===Math.PI&&(x=-.5/t);for(let M=0;M<=t;M++){const N=M/t,P=i+N*a;d.x=-E*Math.cos(P),d.y=w,d.z=E*Math.sin(P),p.push(d.x,d.y,d.z),u.copy(d).normalize(),b.push(u.x,u.y,u.z),g.push(N+x,1-S),_.push(l++)}h.push(_)}for(let m=0;m<n;m++)for(let _=0;_<t;_++){const S=h[m][_+1],v=h[m][_],w=h[m+1][_],E=h[m+1][_+1];(m!==0||r>0)&&f.push(S,v,E),(m!==n-1||c<Math.PI)&&f.push(v,w,E)}this.setIndex(f),this.setAttribute("position",new et(p,3)),this.setAttribute("normal",new et(b,3)),this.setAttribute("uv",new et(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vi(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function xs(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];if(ql(i))i.isRenderTargetTexture?(He("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone();else if(Array.isArray(i))if(ql(i[0])){const a=[];for(let r=0,o=i.length;r<o;r++)a[r]=i[r].clone();e[t][n]=a}else e[t][n]=i.slice();else e[t][n]=i}}return e}function an(s){const e={};for(let t=0;t<s.length;t++){const n=xs(s[t]);for(const i in n)e[i]=n[i]}return e}function ql(s){return s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)}function zf(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function Sd(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:lt.workingColorSpace}const Bf={clone:xs,merge:an};var Gf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Hf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Si extends Hn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Gf,this.fragmentShader=Hf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=xs(e.uniforms),this.uniformsGroups=zf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const r=this.uniforms[i].value;r&&r.isTexture?t.uniforms[i]={type:"t",value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[i]={type:"c",value:r.getHex()}:r&&r.isVector2?t.uniforms[i]={type:"v2",value:r.toArray()}:r&&r.isVector3?t.uniforms[i]={type:"v3",value:r.toArray()}:r&&r.isVector4?t.uniforms[i]={type:"v4",value:r.toArray()}:r&&r.isMatrix3?t.uniforms[i]={type:"m3",value:r.toArray()}:r&&r.isMatrix4?t.uniforms[i]={type:"m4",value:r.toArray()}:t.uniforms[i]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const n in e.uniforms){const i=e.uniforms[n];switch(this.uniforms[n]={},i.type){case"t":this.uniforms[n].value=t[i.value]||null;break;case"c":this.uniforms[n].value=new me().setHex(i.value);break;case"v2":this.uniforms[n].value=new Ke().fromArray(i.value);break;case"v3":this.uniforms[n].value=new y().fromArray(i.value);break;case"v4":this.uniforms[n].value=new St().fromArray(i.value);break;case"m3":this.uniforms[n].value=new Je().fromArray(i.value);break;case"m4":this.uniforms[n].value=new Ve().fromArray(i.value);break;default:this.uniforms[n].value=i.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Vf extends Si{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class on extends Hn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new me(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new me(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ac,this.normalScale=new Ke(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Bt extends on{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ke(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return it(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new me(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new me(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new me(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(e){this._diffuseRoughness>0!=e>0&&this.version++,this._diffuseRoughness=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}get iridescenceThicknessRange(){return us('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(e){us('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),this.iridescenceThicknessMinimum=e[0],this.iridescenceThicknessMaximum=e[1]}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.diffuseRoughness=e.diffuseRoughness,this.diffuseRoughnessMap=e.diffuseRoughnessMap,this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum,this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class wd extends Hn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Du,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Wf extends Hn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function gi(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function Ws(s){return s!==void 0&&s.inTangents!==void 0&&s.outTangents!==void 0}function qf(s){function e(i,a){return s[i]-s[a]}const t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function Xl(s,e,t){const n=s.length,i=new s.constructor(n);for(let a=0,r=0;r!==n;++a){const o=t[a]*e;for(let c=0;c!==e;++c)i[r++]=s[o+c]}return i}function Xf(s,e,t,n){let i=1,a=s[0];for(;a!==void 0&&a[n]===void 0;)a=s[i++];if(a===void 0)return;let r=a[n];if(r!==void 0)if(Array.isArray(r))do r=a[n],r!==void 0&&(e.push(a.time),t.push(...r)),a=s[i++];while(a!==void 0);else if(r.toArray!==void 0)do r=a[n],r!==void 0&&(e.push(a.time),r.toArray(t,t.length)),a=s[i++];while(a!==void 0);else do r=a[n],r!==void 0&&(e.push(a.time),t.push(r)),a=s[i++];while(a!==void 0)}class Ms{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],a=t[n-1];n:{e:{let r;t:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<a)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(a=i,i=t[++n],e<i)break e}r=t.length;break t}if(!(e>=a)){const o=t[1];e<o&&(n=2,a=o);for(let c=n-2;;){if(a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=a,a=t[--n-1],e>=a)break e}r=n,n=0;break t}break n}for(;n<r;){const o=n+r>>>1;e<t[o]?r=o:n=o+1}if(i=t[n],a=t[n-1],a===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,a,i)}return this.interpolate_(n,a,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,a=e*i;for(let r=0;r!==i;++r)t[r]=n[a+r];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class Kf extends Ms{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ol,endingEnd:ol}}intervalChanged_(e,t,n){const i=this.parameterPositions;let a=e-2,r=e+1,o=i[a],c=i[r];if(o===void 0)switch(this.getSettings_().endingStart){case cl:a=e,o=2*t-n;break;case ll:a=i.length-2,o=t+i[a]-i[a+1];break;default:a=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case cl:r=e,c=2*n-t;break;case ll:r=1,c=n+i[1]-i[0];break;default:r=e-1,c=t}const l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=a*h,this._offsetNext=r*h}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,p=(n-t)/(i-t),b=p*p,g=b*p,m=-u*g+2*u*b-u*p,_=(1+u)*g+(-1.5-2*u)*b+(-.5+u)*p+1,S=(-1-f)*g+(1.5+f)*b+.5*p,v=f*g-f*b;for(let w=0;w!==o;++w)a[w]=m*r[h+w]+_*r[l+w]+S*r[c+w]+v*r[d+w];return a}}class jf extends Ms{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(i-t),d=1-h;for(let u=0;u!==o;++u)a[u]=r[l+u]*d+r[c+u]*h;return a}}class Yf extends Ms{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class Jf extends Ms{interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this.inTangents,d=this.outTangents;if(!h||!d){const p=(n-t)/(i-t),b=1-p;for(let g=0;g!==o;++g)a[g]=r[l+g]*b+r[c+g]*p;return a}const u=o*2,f=e-1;for(let p=0;p!==o;++p){const b=r[l+p],g=r[c+p],m=f*u+p*2,_=d[m],S=d[m+1],v=e*u+p*2,w=h[v],E=h[v+1],x=$f(n,t,_,w,i);a[p]=Ed(x,b,S,E,g)}return a}}function Ed(s,e,t,n,i){const a=1-s;return a*a*a*e+3*a*a*s*t+3*a*s*s*n+s*s*s*i}function Zf(s,e,t,n,i){const a=1-s;return 3*a*a*(t-e)+6*a*s*(n-t)+3*s*s*(i-n)}function $f(s,e,t,n,i){let a=(s-e)/(i-e);for(let r=0;r<8;r++){const o=Ed(a,e,t,n,i)-s;if(Math.abs(o)<1e-10)break;const c=Zf(a,e,t,n,i);if(Math.abs(c)<1e-10)break;a=Math.max(0,Math.min(1,a-o/c))}return a}class Cn{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=gi(t,this.TimeBufferType),this.values=gi(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:gi(e.times,Array),values:gi(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i),Ws(e.settings)&&(n.settings={inTangents:gi(e.settings.inTangents,Array),outTangents:gi(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Yf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new jf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Kf(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new Jf(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case ta:t=this.InterpolantFactoryMethodDiscrete;break;case na:t=this.InterpolantFactoryMethodLinear;break;case Pr:t=this.InterpolantFactoryMethodSmooth;break;case rl:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return He("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ta;case this.InterpolantFactoryMethodLinear:return na;case this.InterpolantFactoryMethodSmooth:return Pr;case this.InterpolantFactoryMethodBezier:return rl}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e;Ws(this.settings)&&(Kl(this.settings.inTangents,e),Kl(this.settings.outTangents,e))}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e;Ws(this.settings)&&(jl(this.settings.inTangents,e),jl(this.settings.outTangents,e))}return this}trim(e,t){const n=this.times,i=n.length;let a=0,r=i-1;for(;a!==i&&n[a]<e;)++a;for(;r!==-1&&n[r]>t;)--r;if(++r,a!==0||r!==i){a>=r&&(r=Math.max(r,1),a=r-1);const o=this.getValueSize();this.times=n.slice(a,r),this.values=this.values.slice(a*o,r*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(Ze("KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,a=n.length;a===0&&(Ze("KeyframeTrack: Track is empty.",this),e=!1);let r=null;for(let o=0;o!==a;o++){const c=n[o];if(typeof c=="number"&&isNaN(c)){Ze("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(r!==null&&r>c){Ze("KeyframeTrack: Out of order keys.",this,o,c,r),e=!1;break}r=c}if(i!==void 0&&Gu(i))for(let o=0,c=i.length;o!==c;++o){const l=i[o];if(isNaN(l)){Ze("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===Pr,a=e.length-1;let r=1;for(let o=1;o<a;++o){let c=!1;const l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(i)c=!0;else{const d=o*n,u=d-n,f=d+n;for(let p=0;p!==n;++p){const b=t[d+p];if(b!==t[u+p]||b!==t[f+p]){c=!0;break}}}if(c){if(o!==r){e[r]=e[o];const d=o*n,u=r*n;for(let f=0;f!==n;++f)t[u+f]=t[d+f]}++r}}if(a>0){e[r]=e[a];for(let o=a*n,c=r*n,l=0;l!==n;++l)t[c+l]=t[o+l];++r}return r!==e.length?(this.times=e.slice(0,r),this.values=t.slice(0,r*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,Ws(this.settings)&&(i.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),i}}function Kl(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]+=e}function jl(s,e){for(let t=0,n=s.length;t!==n;t+=2)s[t]*=e}Cn.prototype.ValueTypeName="";Cn.prototype.TimeBufferType=Float32Array;Cn.prototype.ValueBufferType=Float32Array;Cn.prototype.DefaultInterpolation=na;class Ss extends Cn{constructor(e,t,n){super(e,t,n)}}Ss.prototype.ValueTypeName="bool";Ss.prototype.ValueBufferType=Array;Ss.prototype.DefaultInterpolation=ta;Ss.prototype.InterpolantFactoryMethodLinear=void 0;Ss.prototype.InterpolantFactoryMethodSmooth=void 0;class Td extends Cn{constructor(e,t,n,i){super(e,t,n,i)}}Td.prototype.ValueTypeName="color";class ra extends Cn{constructor(e,t,n,i){super(e,t,n,i)}}ra.prototype.ValueTypeName="number";class Qf extends Ms{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=(n-t)/(i-t);let l=e*o;for(let h=l+o;l!==h;l+=4)mt.slerpFlat(a,0,r,l-o,r,l,c);return a}}class oa extends Cn{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new Qf(this.times,this.values,this.getValueSize(),e)}}oa.prototype.ValueTypeName="quaternion";oa.prototype.InterpolantFactoryMethodSmooth=void 0;class ws extends Cn{constructor(e,t,n){super(e,t,n)}}ws.prototype.ValueTypeName="string";ws.prototype.ValueBufferType=Array;ws.prototype.DefaultInterpolation=ta;ws.prototype.InterpolantFactoryMethodLinear=void 0;ws.prototype.InterpolantFactoryMethodSmooth=void 0;class mr extends Cn{constructor(e,t,n,i){super(e,t,n,i)}}mr.prototype.ValueTypeName="vector";class ep{constructor(e="",t=-1,n=[],i=Cu){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=Xn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let r=0,o=n.length;r!==o;++r)t.push(np(n[r]).scale(i));const a=new this(e.name,e.duration,t,e.blendMode);return a.uuid=e.uuid,a.userData=JSON.parse(e.userData||"{}"),a}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let a=0,r=n.length;a!==r;++a)t.push(Cn.toJSON(n[a]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const a=t.length,r=[];for(let o=0;o<a;o++){let c=[],l=[];c.push((o+a-1)%a,o,(o+1)%a),l.push(0,1,0);const h=qf(c);c=Xl(c,1,h),l=Xl(l,1,h),!i&&c[0]===0&&(c.push(a),l.push(l[0])),r.push(new ra(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,r)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},a=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){const l=e[o],h=l.name.match(a);if(h&&h.length>1){const d=h[1];let u=i[d];u||(i[d]=u=[]),u.push(l)}}const r=[];for(const o in i)r.push(this.CreateFromMorphTargetSequence(o,i[o],t,n));return r}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const a=this.tracks[n];t=Math.max(t,a.times[a.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function tp(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return ra;case"vector":case"vector2":case"vector3":case"vector4":return mr;case"color":return Td;case"quaternion":return oa;case"bool":case"boolean":return Ss;case"string":return ws}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function np(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=tp(s.type);if(s.times===void 0){const n=[],i=[];Xf(s.keys,n,i,"value"),s.times=n,s.values=i}let t;return e.parse!==void 0?t=e.parse(s):t=new e(s.name,s.times,s.values,s.interpolation),Ws(s.settings)&&(t.settings={inTangents:gi(s.settings.inTangents,Float32Array),outTangents:gi(s.settings.outTangents,Float32Array)}),t}const ii={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(Yl(s)||(this.files[s]=e))},get:function(s){if(this.enabled!==!1&&!Yl(s))return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};function Yl(s){try{const e=s.slice(s.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class ip{constructor(e,t,n){const i=this;let a=!1,r=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,a===!1&&i.onStart!==void 0&&i.onStart(h,r,o),a=!0},this.itemEnd=function(h){r++,i.onProgress!==void 0&&i.onProgress(h,r,o),r===o&&(a=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,d){return l.push(h,d),this},this.removeHandler=function(h){const d=l.indexOf(h);return d!==-1&&l.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=l.length;d<u;d+=2){const f=l[d],p=l[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const sp=new ip;class Es{constructor(e){this.manager=e!==void 0?e:sp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,a){n.load(e,i,t,a)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}setPriority(e){return this.priority=e,this}setCache(e){return this.cache=e,this}abort(){return this}}Es.DEFAULT_MATERIAL_NAME="__DEFAULT";const ei={};class ap extends Error{constructor(e,t){super(e),this.response=t}}class Ad extends Es{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=ii.get(`file:${e}`);if(a!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(a),this.manager.itemEnd(e)},0);return}if(ei[e]!==void 0){ei[e].push({onLoad:t,onProgress:n,onError:i});return}ei[e]=[],ei[e].push({onLoad:t,onProgress:n,onError:i});const r=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",priority:this.priority,cache:this.cache,signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,c=this.responseType;fetch(r).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&He("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const h=ei[e],d=l.body.getReader(),u=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),f=u?parseInt(u):0,p=f!==0;let b=0;const g=new ReadableStream({start(m){_();function _(){d.read().then(({done:S,value:v})=>{if(S)m.close();else{b+=v.byteLength;const w=new ProgressEvent("progress",{lengthComputable:p,loaded:b,total:f});for(let E=0,x=h.length;E<x;E++){const M=h[E];M.onProgress&&M.onProgress(w)}m.enqueue(v),_()}},S=>{m.error(S)})}}});return new Response(g)}else throw new ap(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return l.json();default:if(o==="")return l.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return l.arrayBuffer().then(p=>f.decode(p))}}}).then(l=>{ii.add(`file:${e}`,l);const h=ei[e];delete ei[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onLoad&&f.onLoad(l)}}).catch(l=>{const h=ei[e];if(h===void 0)throw this.manager.itemError(e),l;delete ei[e];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onError&&f.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const ns=new WeakMap;class rp extends Es{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=ii.get(`image:${e}`);if(r!==void 0){if(r.complete===!0)a.manager.itemStart(e),setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);else{let d=ns.get(r);d===void 0&&(d=[],ns.set(r,d)),d.push({onLoad:t,onError:i})}return r}const o=sa("img");function c(){h(),t&&t(this);const d=ns.get(this)||[];for(let u=0;u<d.length;u++){const f=d[u];f.onLoad&&f.onLoad(this)}ns.delete(this),a.manager.itemEnd(e)}function l(d){h(),i&&i(d),ii.remove(`image:${e}`);const u=ns.get(this)||[];for(let f=0;f<u.length;f++){const p=u[f];p.onError&&p.onError(d)}ns.delete(this),a.manager.itemError(e),a.manager.itemEnd(e)}function h(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),ii.add(`image:${e}`,o),a.manager.itemStart(e),o.fetchPriority=this.priority,o.src=e,o}}class op extends Es{constructor(e){super(e)}load(e,t,n,i){const a=new jt,r=new rp(this.manager);return r.setPriority(this.priority),r.setCache(this.cache),r.setCrossOrigin(this.crossOrigin),r.setPath(this.path),r.load(e,function(o){a.image=o,a.needsUpdate=!0,t!==void 0&&t(a)},n,i),a}}class Mr extends Rt{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new me(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class cp extends Mr{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new me(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const so=new Ve,Jl=new y,Zl=new y;class Fc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ke(512,512),this.mapType=un,this.map=null,this.mapPass=null,this.matrix=new Ve,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new aa,this._frameExtents=new Ke(1,1),this._viewportCount=1,this._viewports=[new St(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera;Jl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Jl),Zl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Zl),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,i){so.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(so,e.coordinateSystem,e.reversedDepth);const a=this._frameExtents,r=i?i.z/a.x:1,o=i?i.w/a.y:1,c=i?i.x/a.x:0,l=i?i.y/a.y:0;e.coordinateSystem===ia||e.reversedDepth?t.set(.5*r,0,0,.5*r+c,0,.5*o,0,.5*o+l,0,0,1,0,0,0,0,1):t.set(.5*r,0,0,.5*r+c,0,.5*o,0,.5*o+l,0,0,.5,.5,0,0,0,1),t.multiply(so)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Oa=new y,za=new mt,Dn=new y;class Rd extends Rt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ve,this.projectionMatrix=new Ve,this.projectionMatrixInverse=new Ve,this.coordinateSystem=Tn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Oa,za,Dn),Dn.x===1&&Dn.y===1&&Dn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Oa,za,Dn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Oa,za,Dn),Dn.x===1&&Dn.y===1&&Dn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Oa,za,Dn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const fi=new y,$l=new Ke,Ql=new Ke;class ln extends Rd{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=bs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(js*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return bs*2*Math.atan(Math.tan(js*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){fi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(fi.x,fi.y).multiplyScalar(-e/fi.z),fi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(fi.x,fi.y).multiplyScalar(-e/fi.z)}getViewSize(e,t){return this.getViewBounds(e,$l,Ql),t.subVectors(Ql,$l)}setViewOffset(e,t,n,i,a,r){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(js*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,a=-.5*i;const r=this.view;if(this.view!==null&&this.view.enabled){const c=r.fullWidth,l=r.fullHeight;a+=r.offsetX*i/c,t-=r.offsetY*n/l,i*=r.width/c,n*=r.height/l}const o=this.filmOffset;o!==0&&(a+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(a,a+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class lp extends Fc{constructor(){super(new ln(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=bs*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,a=e.distance||t.far;(n!==t.fov||i!==t.aspect||a!==t.far)&&(t.fov=n,t.aspect=i,t.far=a,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){const e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}}class hp extends Mr{constructor(e,t,n=0,i=Math.PI/3,a=0,r=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.target=new Rt,this.distance=n,this.angle=i,this.penumbra=a,this.decay=r,this.map=null,this.shadow=new lp}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class dp extends Fc{constructor(){super(new ln(90,1,.5,500)),this.isPointLightShadow=!0}}class up extends Mr{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new dp}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class Uc extends Rd{constructor(e=-1,t=1,n=1,i=-1,a=.1,r=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=a,this.far=r,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,a,r){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=a,this.view.height=r,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let a=n-e,r=n+e,o=i+t,c=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;a+=l*this.view.offsetX,r=a+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(a,r,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class fp extends Fc{constructor(){super(new Uc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class cc extends Mr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Rt.DEFAULT_UP),this.updateMatrix(),this.target=new Rt,this.shadow=new fp}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class Zs{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const ao=new WeakMap;class pp extends Es{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&He("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&He("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const a=this,r=ii.get(`image-bitmap:${e}`);if(r!==void 0){if(a.manager.itemStart(e),r.then){r.then(l=>{ao.has(r)===!0?(i&&i(ao.get(r)),a.manager.itemError(e),a.manager.itemEnd(e)):(t&&t(l),a.manager.itemEnd(e))});return}setTimeout(function(){t&&t(r),a.manager.itemEnd(e)},0);return}const o={};o.credentials=this.withCredentials||this.crossOrigin!=="anonymous"?"include":"same-origin",o.headers=this.requestHeader,o.priority=this.priority,o.cache=this.cache,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign({},a.options,{colorSpaceConversion:"none"}))}).then(function(l){return ii.add(`image-bitmap:${e}`,l),t&&t(l),a.manager.itemEnd(e),l}).catch(function(l){i&&i(l),ao.set(c,l),ii.remove(`image-bitmap:${e}`),a.manager.itemError(e),a.manager.itemEnd(e)});ii.add(`image-bitmap:${e}`,c),a.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const is=-90,ss=1;class lc extends Rt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new ln(is,ss,e,t);i.layers=this.layers,this.add(i);const a=new ln(is,ss,e,t);a.layers=this.layers,this.add(a);const r=new ln(is,ss,e,t);r.layers=this.layers,this.add(r);const o=new ln(is,ss,e,t);o.layers=this.layers,this.add(o);const c=new ln(is,ss,e,t);c.layers=this.layers,this.add(c);const l=new ln(is,ss,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,a,r,o,c]=t;for(const l of t)this.remove(l);if(e===Tn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),a.up.set(0,0,-1),a.lookAt(0,1,0),r.up.set(0,0,1),r.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===ia)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),a.up.set(0,0,1),a.lookAt(0,1,0),r.up.set(0,0,-1),r.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[a,r,o,c,l,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;const b=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,1,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,2,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.mipmapsAutoUpdate=b,e.setRenderTarget(n,5,i),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}}class mp extends ln{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}}class gp{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=bp.bind(this),e.addEventListener("visibilitychange",this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e!==void 0?e:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}}function bp(){this._document.hidden===!1&&this.reset()}const kc="\\[\\]\\.:\\/",_p=new RegExp("["+kc+"]","g"),Oc="[^"+kc+"]",xp="[^"+kc.replace("\\.","")+"]",vp=/((?:WC+[\/:])*)/.source.replace("WC",Oc),yp=/(WCOD+)?/.source.replace("WCOD",xp),Mp=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Oc),Sp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Oc),wp=new RegExp("^"+vp+yp+Mp+Sp+"$"),Ep=["material","materials","bones","map"];class Tp{constructor(e,t,n){const i=n||vt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,a=n.length;i!==a;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class vt{constructor(e,t,n){this.path=t,this.parsedPath=n||vt.parseTrackName(t),this.node=vt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new vt.Composite(e,t,n):new vt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(_p,"")}static parseTrackName(e){const t=wp.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const a=n.nodeName.substring(i+1);Ep.indexOf(a)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=a)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(a){for(let r=0;r<a.length;r++){const o=a[r];if(o.name===t||o.uuid===t)return o;const c=n(o.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,a=n.length;i!==a;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let a=t.propertyIndex;if(e||(e=vt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){He("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){Ze("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ze("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ze("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ze("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ze("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Ze("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){Ze("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const r=e[i];if(r===void 0){const l=t.nodeName;Ze("PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){Ze("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ze("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[a]!==void 0&&(a=e.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=r,this.propertyIndex=a}else r.fromArray!==void 0&&r.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=r):Array.isArray(r)?(c=this.BindingType.EntireArray,this.resolvedProperty=r):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}vt.Composite=Tp;vt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};vt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};vt.prototype.GetterByBindingType=[vt.prototype._getValue_direct,vt.prototype._getValue_array,vt.prototype._getValue_arrayElement,vt.prototype._getValue_toArray];vt.prototype.SetterByBindingTypeAndVersioning=[[vt.prototype._setValue_direct,vt.prototype._setValue_direct_setNeedsUpdate,vt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[vt.prototype._setValue_array,vt.prototype._setValue_array_setNeedsUpdate,vt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[vt.prototype._setValue_arrayElement,vt.prototype._setValue_arrayElement_setNeedsUpdate,vt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[vt.prototype._setValue_fromArray,vt.prototype._setValue_fromArray_setNeedsUpdate,vt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const eh=new Ve;class Ap{constructor(e,t,n=0,i=1/0){this.ray=new ys(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Ac,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):Ze("Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return eh.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(eh),this}intersectObject(e,t=!0,n=[]){return hc(e,this,n,t),n.sort(th),n}intersectObjects(e,t=!0,n=[]){for(let i=0,a=e.length;i<a;i++)hc(e[i],this,n,t);return n.sort(th),n}}function th(s,e){return s.distance-e.distance}function hc(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const a=s.children;for(let r=0,o=a.length;r<o;r++)hc(a[r],e,t,!0)}}class ls{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=it(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(it(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const pi=new y,Ba=new Ve,ro=new Ve;class Rp extends _d{constructor(e){const t=Pd(e),n=new yt,i=[],a=[];for(let l=0;l<t.length;l++){const h=t[l];h.parent&&h.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),a.push(0,0,0),a.push(0,0,0))}n.setAttribute("position",new et(i,3)),n.setAttribute("color",new et(a,3));const r=new Lc({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,r),this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=e,this.bones=t,this.matrix=e.matrixWorld,this.matrixAutoUpdate=!1;const o=new me(255),c=new me(65280);this.setColors(o,c)}updateMatrixWorld(e){const t=this.bones,n=this.geometry,i=n.getAttribute("position");ro.copy(this.root.matrixWorld).invert();for(let a=0,r=0;a<t.length;a++){const o=t[a];o.parent&&o.parent.isBone&&(Ba.multiplyMatrices(ro,o.matrixWorld),pi.setFromMatrixPosition(Ba),i.setXYZ(r,pi.x,pi.y,pi.z),Ba.multiplyMatrices(ro,o.parent.matrixWorld),pi.setFromMatrixPosition(Ba),i.setXYZ(r+1,pi.x,pi.y,pi.z),r+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(e)}setColors(e,t){const i=this.geometry.getAttribute("color");for(let a=0;a<i.count;a+=2)i.setXYZ(a,e.r,e.g,e.b),i.setXYZ(a+1,t.r,t.g,t.b);return i.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}function Pd(s){const e=[];s.isBone===!0&&e.push(s);for(let t=0;t<s.children.length;t++)e.push(...Pd(s.children[t]));return e}class Pp extends wi{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function nh(s,e,t,n){const i=Cp(n);switch(t){case rd:return s*e;case xc:return s*e/i.components*i.byteLength;case vc:return s*e/i.components*i.byteLength;case Hi:return s*e*2/i.components*i.byteLength;case yc:return s*e*2/i.components*i.byteLength;case od:return s*e*3/i.components*i.byteLength;case En:return s*e*4/i.components*i.byteLength;case Mc:return s*e*4/i.components*i.byteLength;case er:case tr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case nr:case ir:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Po:case Lo:return Math.max(s,16)*Math.max(e,8)/4;case Ro:case Co:return Math.max(s,8)*Math.max(e,8)/2;case Do:case Io:case Fo:case Uo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case No:case or:case ko:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Oo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case zo:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Bo:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Go:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Ho:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Vo:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Wo:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case qo:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Xo:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Ko:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case jo:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Yo:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Jo:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Zo:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case $o:case Qo:case ec:return Math.ceil(s/4)*Math.ceil(e/4)*16;case tc:case nc:return Math.ceil(s/4)*Math.ceil(e/4)*8;case cr:case ic:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Cp(s){switch(s){case un:case nd:return{byteLength:1,components:1};case ea:case id:case Wn:return{byteLength:2,components:1};case bc:case _c:return{byteLength:2,components:4};case Vn:case gc:case xn:return{byteLength:4,components:1};case sd:case ad:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"187"}}));typeof window<"u"&&(window.__THREE__?He("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="187");function Cd(){let s=null,e=!1,t=null,n=null;function i(a,r){n=s.requestAnimationFrame(i),t(a,r)}return{start:function(){e!==!0&&t!==null&&s!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s!==null&&s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(a){t=a},setContext:function(a){s=a}}}function Lp(s){const e=new WeakMap;function t(o,c){const l=o.array,h=o.usage,d=l.byteLength,u=s.createBuffer();s.bindBuffer(c,u),s.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=s.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=s.HALF_FLOAT:f=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=s.SHORT;else if(l instanceof Uint32Array)f=s.UNSIGNED_INT;else if(l instanceof Int32Array)f=s.INT;else if(l instanceof Int8Array)f=s.BYTE;else if(l instanceof Uint8Array)f=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,c,l){const h=c.array,d=c.updateRanges;if(s.bindBuffer(l,o),d.length===0)s.bufferSubData(l,0,h);else{d.sort((f,p)=>f.start-p.start);let u=0;for(let f=1;f<d.length;f++){const p=d[u],b=d[f];b.start<=p.start+p.count+1?p.count=Math.max(p.count,b.start+b.count-p.start):(++u,d[u]=b)}d.length=u+1;for(let f=0,p=d.length;f<p;f++){const b=d[f];s.bufferSubData(l,b.start*h.BYTES_PER_ELEMENT,h,b.start,b.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function a(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(s.deleteBuffer(c.buffer),e.delete(o))}function r(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:i,remove:a,update:r}}var Dp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ip=`#ifdef USE_ALPHAHASH
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
#endif`,Np=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Fp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Up=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,kp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Op=`#ifdef USE_AOMAP
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
#endif`,zp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Bp=`#ifdef USE_BATCHING
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
#endif`,Gp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Hp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Vp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Wp=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,qp=`#ifdef USE_IRIDESCENCE
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
#endif`,Xp=`#ifdef USE_BUMPMAP
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
#endif`,Kp=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,jp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Yp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Jp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Zp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,$p=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Qp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,e0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,t0=`#define PI 3.141592653589793
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
} // validated`,n0=`vec3 transformedNormal = objectNormal;
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
#endif`,i0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,s0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,a0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,r0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,o0="gl_FragColor = linearToOutputTexel( gl_FragColor );",c0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,l0=`#ifdef USE_ENVMAP
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
#endif`,h0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,d0=`#ifdef USE_ENVMAP
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
#endif`,u0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,f0=`#ifdef USE_ENVMAP
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
#endif`,p0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,m0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,g0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,b0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,_0=`#ifdef USE_GRADIENTMAP
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
}`,x0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,v0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,y0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,M0=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,S0=`#ifdef USE_ENVMAP
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
#endif`,w0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,E0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,T0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,A0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,R0=`PhysicalMaterial material;
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
#endif`,P0=`uniform sampler2D dfgLUT;
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
}`,C0=`
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
#endif`,L0=`#if defined( RE_IndirectDiffuse )
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
#endif`,D0=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,I0=`#if NUM_LIGHT_PROBE_GRIDS > 0
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
#endif`,N0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,F0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,U0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,k0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,O0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,z0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,B0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,G0=`#if defined( USE_POINTS_UV )
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
#endif`,H0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,V0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,W0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,q0=`#if defined( USE_MORPHCOLORS )
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
#endif`,X0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,K0=`#ifdef USE_MORPHTARGETS
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
#endif`,j0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Y0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,J0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Z0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,$0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Q0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,em=`#ifdef USE_NORMALMAP
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
#endif`,tm=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,nm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,im=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,sm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,am=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,rm=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,om=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,cm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,lm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,hm=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,dm=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,um=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,pm=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,mm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,gm=`float getShadowMask() {
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
}`,bm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,_m=`#ifdef USE_SKINNING
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
#endif`,xm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,vm=`#ifdef USE_SKINNING
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
#endif`,ym=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Mm=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Sm=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wm=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Em=`#ifdef USE_TRANSMISSION
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
#endif`,Tm=`#ifdef USE_TRANSMISSION
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
#endif`,Am=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Pm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Cm=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Lm=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Dm=`uniform sampler2D t2D;
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
}`,Im=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Nm=`uniform float backgroundBlurriness;
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
}`,Fm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Um=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,km=`#include <common>
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
}`,Om=`#if DEPTH_PACKING == 3200
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
}`,zm=`#define DISTANCE
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
}`,Bm=`#define DISTANCE
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
}`,Gm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Hm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Vm=`uniform float scale;
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
}`,Wm=`uniform vec3 diffuse;
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
}`,qm=`#include <common>
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
}`,Xm=`uniform vec3 diffuse;
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
}`,Km=`#define LAMBERT
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
}`,jm=`#define LAMBERT
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
}`,Ym=`#define MATCAP
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
}`,Jm=`#define MATCAP
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
}`,Zm=`#define NORMAL
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
}`,$m=`#define NORMAL
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
}`,Qm=`#define PHONG
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
}`,eg=`#define PHONG
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
}`,tg=`#define STANDARD
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
}`,ng=`#define STANDARD
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
}`,ig=`#define TOON
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
}`,sg=`#define TOON
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
}`,ag=`uniform float size;
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
}`,rg=`uniform vec3 diffuse;
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
}`,og=`#include <common>
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
}`,cg=`uniform vec3 color;
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
}`,lg=`uniform float rotation;
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
}`,hg=`uniform vec3 diffuse;
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
}`,rt={alphahash_fragment:Dp,alphahash_pars_fragment:Ip,alphamap_fragment:Np,alphamap_pars_fragment:Fp,alphatest_fragment:Up,alphatest_pars_fragment:kp,aomap_fragment:Op,aomap_pars_fragment:zp,batching_pars_vertex:Bp,batching_vertex:Gp,begin_vertex:Hp,beginnormal_vertex:Vp,bsdfs:Wp,iridescence_fragment:qp,bumpmap_pars_fragment:Xp,clipping_planes_fragment:Kp,clipping_planes_pars_fragment:jp,clipping_planes_pars_vertex:Yp,clipping_planes_vertex:Jp,color_fragment:Zp,color_pars_fragment:$p,color_pars_vertex:Qp,color_vertex:e0,common:t0,defaultnormal_vertex:n0,displacementmap_pars_vertex:i0,displacementmap_vertex:s0,emissivemap_fragment:a0,emissivemap_pars_fragment:r0,colorspace_fragment:o0,colorspace_pars_fragment:c0,envmap_fragment:l0,envmap_common_pars_fragment:h0,envmap_pars_fragment:d0,envmap_pars_vertex:u0,envmap_physical_pars_fragment:S0,envmap_vertex:f0,fog_vertex:p0,fog_pars_vertex:m0,fog_fragment:g0,fog_pars_fragment:b0,gradientmap_pars_fragment:_0,lightmap_pars_fragment:x0,lights_lambert_fragment:v0,lights_lambert_pars_fragment:y0,lights_pars_begin:M0,lights_toon_fragment:w0,lights_toon_pars_fragment:E0,lights_phong_fragment:T0,lights_phong_pars_fragment:A0,lights_physical_fragment:R0,lights_physical_pars_fragment:P0,lights_fragment_begin:C0,lights_fragment_maps:L0,lights_fragment_end:D0,lightprobes_pars_fragment:I0,logdepthbuf_fragment:N0,logdepthbuf_pars_fragment:F0,logdepthbuf_pars_vertex:U0,logdepthbuf_vertex:k0,map_fragment:O0,map_pars_fragment:z0,map_particle_fragment:B0,map_particle_pars_fragment:G0,metalnessmap_fragment:H0,metalnessmap_pars_fragment:V0,morphinstance_vertex:W0,morphcolor_vertex:q0,morphnormal_vertex:X0,morphtarget_pars_vertex:K0,morphtarget_vertex:j0,normal_fragment_begin:Y0,normal_fragment_maps:J0,normal_pars_fragment:Z0,normal_pars_vertex:$0,normal_vertex:Q0,normalmap_pars_fragment:em,clearcoat_normal_fragment_begin:tm,clearcoat_normal_fragment_maps:nm,clearcoat_pars_fragment:im,iridescence_pars_fragment:sm,opaque_fragment:am,packing:rm,premultiplied_alpha_fragment:om,project_vertex:cm,dithering_fragment:lm,dithering_pars_fragment:hm,roughnessmap_fragment:dm,roughnessmap_pars_fragment:um,shadowmap_pars_fragment:fm,shadowmap_pars_vertex:pm,shadowmap_vertex:mm,shadowmask_pars_fragment:gm,skinbase_vertex:bm,skinning_pars_vertex:_m,skinning_vertex:xm,skinnormal_vertex:vm,specularmap_fragment:ym,specularmap_pars_fragment:Mm,tonemapping_fragment:Sm,tonemapping_pars_fragment:wm,transmission_fragment:Em,transmission_pars_fragment:Tm,uv_pars_fragment:Am,uv_pars_vertex:Rm,uv_vertex:Pm,worldpos_vertex:Cm,background_vert:Lm,background_frag:Dm,backgroundCube_vert:Im,backgroundCube_frag:Nm,cube_vert:Fm,cube_frag:Um,depth_vert:km,depth_frag:Om,distance_vert:zm,distance_frag:Bm,equirect_vert:Gm,equirect_frag:Hm,linedashed_vert:Vm,linedashed_frag:Wm,meshbasic_vert:qm,meshbasic_frag:Xm,meshlambert_vert:Km,meshlambert_frag:jm,meshmatcap_vert:Ym,meshmatcap_frag:Jm,meshnormal_vert:Zm,meshnormal_frag:$m,meshphong_vert:Qm,meshphong_frag:eg,meshphysical_vert:tg,meshphysical_frag:ng,meshtoon_vert:ig,meshtoon_frag:sg,points_vert:ag,points_frag:rg,shadow_vert:og,shadow_frag:cg,sprite_vert:lg,sprite_frag:hg},Ce={common:{diffuse:{value:new me(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Je},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Je}},envmap:{envMap:{value:null},envMapRotation:{value:new Je},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Je}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Je}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Je},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Je},normalScale:{value:new Ke(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Je},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Je}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Je}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Je}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new me(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new me(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0},uvTransform:{value:new Je}},sprite:{diffuse:{value:new me(16777215)},opacity:{value:1},center:{value:new Ke(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Je},alphaMap:{value:null},alphaMapTransform:{value:new Je},alphaTest:{value:0}}},On={basic:{uniforms:an([Ce.common,Ce.specularmap,Ce.envmap,Ce.aomap,Ce.lightmap,Ce.fog]),vertexShader:rt.meshbasic_vert,fragmentShader:rt.meshbasic_frag},lambert:{uniforms:an([Ce.common,Ce.specularmap,Ce.envmap,Ce.aomap,Ce.lightmap,Ce.emissivemap,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,Ce.fog,Ce.lights,{emissive:{value:new me(0)},envMapIntensity:{value:1}}]),vertexShader:rt.meshlambert_vert,fragmentShader:rt.meshlambert_frag},phong:{uniforms:an([Ce.common,Ce.specularmap,Ce.envmap,Ce.aomap,Ce.lightmap,Ce.emissivemap,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,Ce.fog,Ce.lights,{emissive:{value:new me(0)},specular:{value:new me(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:rt.meshphong_vert,fragmentShader:rt.meshphong_frag},standard:{uniforms:an([Ce.common,Ce.envmap,Ce.aomap,Ce.lightmap,Ce.emissivemap,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,Ce.roughnessmap,Ce.metalnessmap,Ce.fog,Ce.lights,{emissive:{value:new me(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag},toon:{uniforms:an([Ce.common,Ce.aomap,Ce.lightmap,Ce.emissivemap,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,Ce.gradientmap,Ce.fog,Ce.lights,{emissive:{value:new me(0)}}]),vertexShader:rt.meshtoon_vert,fragmentShader:rt.meshtoon_frag},matcap:{uniforms:an([Ce.common,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,Ce.fog,{matcap:{value:null}}]),vertexShader:rt.meshmatcap_vert,fragmentShader:rt.meshmatcap_frag},points:{uniforms:an([Ce.points,Ce.fog]),vertexShader:rt.points_vert,fragmentShader:rt.points_frag},dashed:{uniforms:an([Ce.common,Ce.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:rt.linedashed_vert,fragmentShader:rt.linedashed_frag},depth:{uniforms:an([Ce.common,Ce.displacementmap]),vertexShader:rt.depth_vert,fragmentShader:rt.depth_frag},normal:{uniforms:an([Ce.common,Ce.bumpmap,Ce.normalmap,Ce.displacementmap,{opacity:{value:1}}]),vertexShader:rt.meshnormal_vert,fragmentShader:rt.meshnormal_frag},sprite:{uniforms:an([Ce.sprite,Ce.fog]),vertexShader:rt.sprite_vert,fragmentShader:rt.sprite_frag},background:{uniforms:{uvTransform:{value:new Je},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:rt.background_vert,fragmentShader:rt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Je}},vertexShader:rt.backgroundCube_vert,fragmentShader:rt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:rt.cube_vert,fragmentShader:rt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:rt.equirect_vert,fragmentShader:rt.equirect_frag},distance:{uniforms:an([Ce.common,Ce.displacementmap,{referencePosition:{value:new y},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:rt.distance_vert,fragmentShader:rt.distance_frag},shadow:{uniforms:an([Ce.lights,Ce.fog,{color:{value:new me(0)},opacity:{value:1}}]),vertexShader:rt.shadow_vert,fragmentShader:rt.shadow_frag}};On.physical={uniforms:an([On.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Je},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Je},clearcoatNormalScale:{value:new Ke(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Je},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Je},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Je},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Je},sheen:{value:0},sheenColor:{value:new me(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Je},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Je},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Je},transmissionSamplerSize:{value:new Ke},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Je},attenuationDistance:{value:0},attenuationColor:{value:new me(0)},specularColor:{value:new me(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Je},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Je},anisotropyVector:{value:new Ke},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Je}}]),vertexShader:rt.meshphysical_vert,fragmentShader:rt.meshphysical_frag};const Ga={r:0,b:0,g:0},dg=new Ve,Ld=new Je;Ld.set(-1,0,0,0,1,0,0,0,1);function ug(s,e,t,n,i,a){const r=new me(0);let o=i===!0?0:1,c,l,h=null,d=0,u=null;function f(_){let S=_.isScene===!0?_.background:null;if(S&&S.isTexture){const v=_.backgroundBlurriness>0;S=e.get(S,v)}return S}function p(_){let S=!1;const v=f(_);v===null?g(r,o):v&&v.isColor&&(g(v,1),S=!0);const w=s.xr.getEnvironmentBlendMode();w==="additive"?t.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,a),(s.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function b(_,S){const v=f(S);v&&v.isCubeTexture?(l===void 0&&(l=new Nt(new ha(1,1,1),new Si({name:"BackgroundCubeMaterial",uniforms:xs(On.backgroundCube.uniforms),vertexShader:On.backgroundCube.vertexShader,fragmentShader:On.backgroundCube.fragmentShader,side:rn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(w,E,x){this.matrixWorld.copyPosition(x.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=v,l.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(dg.makeRotationFromEuler(S.backgroundRotation)).transpose(),v.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(Ld),l.material.toneMapped=lt.getTransfer(v.colorSpace)!==xt,(h!==v||d!==v.version||u!==s.toneMapping)&&(l.material.needsUpdate=!0,h=v,d=v.version,u=s.toneMapping),l.layers.enableAll(),_.unshift(l,l.geometry,l.material,0,0,null)):v&&v.isTexture&&(c===void 0&&(c=new Nt(new yr(2,2),new Si({name:"BackgroundMaterial",uniforms:xs(On.background.uniforms),vertexShader:On.background.vertexShader,fragmentShader:On.background.fragmentShader,side:yi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=v,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.toneMapped=lt.getTransfer(v.colorSpace)!==xt,v.matrixAutoUpdate===!0&&v.updateMatrix(),c.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||d!==v.version||u!==s.toneMapping)&&(c.material.needsUpdate=!0,h=v,d=v.version,u=s.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function g(_,S){_.getRGB(Ga,Sd(s)),t.buffers.color.setClear(Ga.r,Ga.g,Ga.b,S,a)}function m(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return r},setClearColor:function(_,S=1){r.set(_),o=S,g(r,o)},getClearAlpha:function(){return o},setClearAlpha:function(_){o=_,g(r,o)},render:p,addToRenderList:b,dispose:m}}function fg(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=u(null);let a=i,r=!1;function o(I,D,L,R,k){let U=!1;const F=d(I,R,L,D);a!==F&&(a=F,l(a.object)),U=f(I,R,L,k),U&&p(I,R,L,k),k!==null&&e.update(k,s.ELEMENT_ARRAY_BUFFER),(U||r)&&(r=!1,v(I,D,L,R),k!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(k).buffer))}function c(){return s.createVertexArray()}function l(I){return s.bindVertexArray(I)}function h(I){return s.deleteVertexArray(I)}function d(I,D,L,R){const k=R.wireframe===!0;let U=n[D.id];U===void 0&&(U={},n[D.id]=U);const F=I.isInstancedMesh===!0?I.id:0;let V=U[F];V===void 0&&(V={},U[F]=V);let O=V[L.id];O===void 0&&(O={},V[L.id]=O);let W=O[k];return W===void 0&&(W=u(c()),O[k]=W),W}function u(I){const D=[],L=[],R=[];for(let k=0;k<t;k++)D[k]=0,L[k]=0,R[k]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:L,attributeDivisors:R,object:I,attributes:{},index:null}}function f(I,D,L,R){const k=a.attributes,U=D.attributes;let F=0;const V=L.getAttributes();for(const O in V)if(V[O].location>=0){const Y=k[O];let j=U[O];if(j===void 0&&(O==="instanceMatrix"&&I.instanceMatrix&&(j=I.instanceMatrix),O==="instanceColor"&&I.instanceColor&&(j=I.instanceColor)),Y===void 0||Y.attribute!==j||j&&Y.data!==j.data)return!0;F++}return a.attributesNum!==F||a.index!==R}function p(I,D,L,R){const k={},U=D.attributes;let F=0;const V=L.getAttributes();for(const O in V)if(V[O].location>=0){let Y=U[O];Y===void 0&&(O==="instanceMatrix"&&I.instanceMatrix&&(Y=I.instanceMatrix),O==="instanceColor"&&I.instanceColor&&(Y=I.instanceColor));const j={};j.attribute=Y,Y&&Y.data&&(j.data=Y.data),k[O]=j,F++}a.attributes=k,a.attributesNum=F,a.index=R}function b(){const I=a.newAttributes;for(let D=0,L=I.length;D<L;D++)I[D]=0}function g(I){m(I,0)}function m(I,D){const L=a.newAttributes,R=a.enabledAttributes,k=a.attributeDivisors;L[I]=1,R[I]===0&&(s.enableVertexAttribArray(I),R[I]=1),k[I]!==D&&(s.vertexAttribDivisor(I,D),k[I]=D)}function _(){const I=a.newAttributes,D=a.enabledAttributes;for(let L=0,R=D.length;L<R;L++)D[L]!==I[L]&&(s.disableVertexAttribArray(L),D[L]=0)}function S(I,D,L,R,k,U,F){F===!0?s.vertexAttribIPointer(I,D,L,k,U):s.vertexAttribPointer(I,D,L,R,k,U)}function v(I,D,L,R){b();const k=R.attributes,U=L.getAttributes(),F=D.defaultAttributeValues;for(const V in U){const O=U[V];if(O.location>=0){let W=k[V];if(W===void 0&&(V==="instanceMatrix"&&I.instanceMatrix&&(W=I.instanceMatrix),V==="instanceColor"&&I.instanceColor&&(W=I.instanceColor)),W!==void 0){const Y=W.normalized,j=W.itemSize,ue=e.get(W);if(ue===void 0)continue;const H=ue.buffer,Z=ue.type,te=ue.bytesPerElement,he=Z===s.INT||Z===s.UNSIGNED_INT||W.gpuType===gc;if(W.isInterleavedBufferAttribute){const Q=W.data,De=Q.isInterleavedBuffer===!0?Q.stride:Q.itemSize,Ye=W.offset;if(Q.isInstancedInterleavedBuffer||Q.isInstancedBufferAttribute){for(let be=0;be<O.locationSize;be++)m(O.location+be,Q.meshPerAttribute);I.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let be=0;be<O.locationSize;be++)g(O.location+be);s.bindBuffer(s.ARRAY_BUFFER,H);for(let be=0;be<O.locationSize;be++)S(O.location+be,j/O.locationSize,Z,Y,De*te,(Ye+j/O.locationSize*be)*te,he)}else{if(W.isInstancedBufferAttribute){for(let Q=0;Q<O.locationSize;Q++)m(O.location+Q,W.meshPerAttribute);I.isInstancedMesh!==!0&&R._maxInstanceCount===void 0&&(R._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let Q=0;Q<O.locationSize;Q++)g(O.location+Q);s.bindBuffer(s.ARRAY_BUFFER,H);for(let Q=0;Q<O.locationSize;Q++)S(O.location+Q,j/O.locationSize,Z,Y,j*te,j/O.locationSize*Q*te,he)}}else if(F!==void 0){const Y=F[V];if(Y!==void 0)switch(Y.length){case 2:s.vertexAttrib2fv(O.location,Y);break;case 3:s.vertexAttrib3fv(O.location,Y);break;case 4:s.vertexAttrib4fv(O.location,Y);break;default:s.vertexAttrib1fv(O.location,Y)}}}}_()}function w(){N();for(const I in n){const D=n[I];for(const L in D){const R=D[L];for(const k in R){const U=R[k];for(const F in U)h(U[F].object),delete U[F];delete R[k]}}delete n[I]}}function E(I){if(n[I.id]===void 0)return;const D=n[I.id];for(const L in D){const R=D[L];for(const k in R){const U=R[k];for(const F in U)h(U[F].object),delete U[F];delete R[k]}}delete n[I.id]}function x(I){for(const D in n){const L=n[D];for(const R in L){const k=L[R];if(k[I.id]===void 0)continue;const U=k[I.id];for(const F in U)h(U[F].object),delete U[F];delete k[I.id]}}}function M(I){for(const D in n){const L=n[D],R=I.isInstancedMesh===!0?I.id:0,k=L[R];if(k!==void 0){for(const U in k){const F=k[U];for(const V in F)h(F[V].object),delete F[V];delete k[U]}delete L[R],Object.keys(L).length===0&&delete n[D]}}}function N(){P(),r=!0,a!==i&&(a=i,l(a.object))}function P(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:o,reset:N,resetDefaultState:P,dispose:w,releaseStatesOfGeometry:E,releaseStatesOfObject:M,releaseStatesOfProgram:x,initAttributes:b,enableAttribute:g,disableUnusedAttributes:_}}function pg(s,e,t){let n;function i(c){n=c}function a(c,l){s.drawArrays(n,c,l),t.update(l,n,1)}function r(c,l,h){h!==0&&(s.drawArraysInstanced(n,c,l,h),t.update(l,n,h))}function o(c,l,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let u=0;for(let f=0;f<h;f++)u+=l[f];t.update(u,n,1)}this.setMode=i,this.render=a,this.renderInstances=r,this.renderMultiDraw=o}function mg(s,e,t,n){let i;function a(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const x=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(x.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(x){return!(x!==En&&n.convert(x)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(x){const M=x===Wn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(x!==un&&x!==xn&&!M&&n.convert(x)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE))}function c(x){if(x==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";x="mediump"}return x==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(He("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),u=t.logarithmicDepthBuffer===!0&&d===!1;t.reversedDepthBuffer===!0&&d===!1&&He("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),t.logarithmicDepthBuffer===!0&&d===!0&&He("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");const f=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),m=s.getParameter(s.MAX_VERTEX_ATTRIBS),_=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),S=s.getParameter(s.MAX_VARYING_VECTORS),v=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),w=s.getParameter(s.MAX_SAMPLES),E=s.getParameter(s.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:r,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:p,maxTextureSize:b,maxCubemapSize:g,maxAttributes:m,maxVertexUniforms:_,maxVaryings:S,maxFragmentUniforms:v,maxSamples:w,samples:E}}function gg(s){const e=this;let t=null,n=0,i=!1,a=!1;const r=new ti,o=new Je,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){a=!0,h(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){const p=d.clippingPlanes,b=d.clipIntersection,g=d.clipShadows,m=s.get(d);if(!i||p===null||p.length===0||a&&!g)a?h(null):l();else{const _=a?0:n,S=_*4;let v=m.clippingState||null;c.value=v,v=h(p,u,S,f);for(let w=0;w!==S;++w)v[w]=t[w];m.clippingState=v,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=_}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,p){const b=d!==null?d.length:0;let g=null;if(b!==0){if(g=c.value,p!==!0||g===null){const m=f+b*4,_=u.matrixWorldInverse;o.getNormalMatrix(_),(g===null||g.length<m)&&(g=new Float32Array(m));for(let S=0,v=f;S!==b;++S,v+=4)r.copy(d[S]).applyMatrix4(_,o),r.normal.toArray(g,v),g[v+3]=r.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=b,e.numIntersection=0,g}}class zc extends Gn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new vd(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new ha(5,5,5),a=new Si({name:"CubemapFromEquirect",uniforms:xs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:rn,blending:ds});a.uniforms.tEquirect.value=t;const r=new Nt(i,a),o=t.minFilter;return t.minFilter===Bn&&(t.minFilter=Kt),new lc(1,10,this).update(e,r),t.minFilter=o,r.geometry.dispose(),r.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const a=e.getRenderTarget();for(let r=0;r<6;r++)e.setRenderTarget(this,r),e.clear(t,n,i);e.setRenderTarget(a)}}const ih=256,bg=3,_g=20,Dd=256,Id=16,xg=3,vg=new y,yg=new me;class ca{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new lc(1,10,null),this._boxMesh=new Nt(new ha(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,i=100,a={}){const{size:r=256,position:o=vg}=a,c=this._renderer;this._setSize(r);const l=this._allocateTarget(),h=this._getSourceTarget(!0);t>0&&(h.texture.mipmapsAutoUpdate=!1);const d=c.autoClear,u=c.autoClearColor,f=c.autoClearDepth,p=c.autoClearStencil,b=e.background;c.autoClear=!0,c.autoClearColor=!0,c.autoClearDepth=!0,c.autoClearStencil=!0,b===null&&(e.background=c.getClearColor(yg));const g=new lc(n,i,h);return g.position.copy(o),g.update(c,e),c.autoClear=d,c.autoClearColor=u,c.autoClearDepth=f,c.autoClearStencil=p,e.background=b,t>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(l,t)),this._applyPMREM(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=rh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ah(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(ih,pd(e))}_fromTexture(e,t){e.mapping===ms||e.mapping===Qs?this._setSize(e.image.length===0?ih:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);const n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){const e=this._cubeSize,t=sh(e,!1,!1),n=Math.log2(e)-bg;for(let i=0;i<=n;i++)t.texture.mipmaps.push({width:e>>i,height:e>>i});return t.texture.name="PMREM",t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){const t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=sh(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){const i=this._boxMesh,a=this._cubeCamera;i.material=n,a.renderTarget=e,a.activeMipmapLevel=t;const r=e.width>>t;e.viewport.set(0,0,r,r),a.update(this._renderer,i),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===ms||e.mapping===Qs?(this._cubemapMaterial===null&&(this._cubemapMaterial=rh()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=ah()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=Mg(),this._integrationMaterial=Sg());const t=this._cubeSize,n=e.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;const a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(t/Id);for(let r=0;r<=n;r++){const o=ca.lodToRoughness(r,n);if(r>n-xg)a.roughness.value=o,this._renderCube(e,r,this._integrationMaterial);else{const c=o>0?Math.log2(t)+.5*Math.log2(6/(Dd*Math.pow(o,4)))+.5:0;i.roughness.value=o,i.lodBias.value=c,this._renderCube(e,r,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=wg());const n=this._blurMaterial,i=n.uniforms,a=this._sourceTarget;i.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,i.envMap.value=a.texture,this._renderCube(e,0,n),i.envMap.value=e.texture,this._renderCube(a,0,n)}}function sh(s,e,t){return new zc(s,{minFilter:Bn,generateMipmaps:e,type:Wn,colorSpace:pn,depthBuffer:t})}function ua(s,e,t){return new Si({name:s,uniforms:e,vertexShader:rt.cube_vert,fragmentShader:t,side:rn,blending:ds,depthTest:!1,depthWrite:!1})}function Mg(){return ua("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Dd}u

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
	`)}function Sg(){return ua("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Id}},`

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
	`)}function wg(){return ua("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${_g}
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
	`)}function ah(){return ua("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

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
	`)}function rh(){return ua("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Eg(s){let e=new WeakMap,t=new WeakMap,n=null;function i(u,f=!1){return u==null?null:f?r(u):a(u)}function a(u){if(u&&u.isTexture){const f=u.mapping;if(f===Ar||f===Rr)if(e.has(u)){const p=e.get(u).texture;return o(p,u.mapping)}else{const p=u.image;if(p&&p.height>0){const b=new zc(p.height);return b.fromEquirectangularTexture(s,u),e.set(u,b),u.addEventListener("dispose",l),o(b.texture,u.mapping)}else return null}}return u}function r(u){if(u&&u.isTexture&&u.isPMREMTexture!==!0){const f=u.mapping,p=f===Ar||f===Rr,b=f===ms||f===Qs;if(p||b){let g=t.get(u);const m=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==m)return n===null&&(n=new ca(s)),g=p?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{const _=u.image;return p&&_&&_.height>0||b&&_&&c(_)?(n===null&&(n=new ca(s)),g=p?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===Ar?u.mapping=ms:f===Rr&&(u.mapping=Qs),u}function c(u){let f=0;const p=6;for(let b=0;b<p;b++)u[b]!==void 0&&f++;return f===p}function l(u){const f=u.target;f.removeEventListener("dispose",l);const p=e.get(f);p!==void 0&&(e.delete(f),p.dispose())}function h(u){const f=u.target;f.removeEventListener("dispose",h);const p=t.get(f);p!==void 0&&(t.delete(f),p.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:i,dispose:d}}function Tg(s){const e={};function t(n){if(e[n]!==void 0)return e[n];const i=s.getExtension(n);return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&us("WebGLRenderer: "+n+" extension not supported."),i}}}function Ag(s,e,t,n){const i={},a=new WeakMap,r=new FinalizationRegistry(p=>delete i[p]);function o(p){c(p.target)}function c(p){p.index!==null&&e.remove(p.index);for(const g in p.attributes)e.remove(p.attributes[g]);p.removeEventListener("dispose",o),delete i[p.id],r.unregister(p);const b=a.get(p);b&&(e.remove(b),a.delete(p)),n.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function l(p,b){return i[b.id]!==void 0||(b.addEventListener("dispose",o),i[b.id]=new WeakRef(b),r.register(b,b.id,b),t.memory.geometries++),b}function h(p){const b=p.attributes;for(const g in b)e.update(b[g],s.ARRAY_BUFFER)}function d(p){const b=p.index,g=p.attributes.position;let m=0;if(g===void 0)return;const _=b!==null?b.array.length:g.array.length/3-1,S=g.count>=65535?bd:_r,v=new S(Math.ceil(_/3)*6,1),w=v.array;if(b!==null){const x=b.array;m=b.version;for(let M=0,N=0;M<_;M+=3){const P=x[M+0],I=x[M+1],D=x[M+2];w[N++]=P,w[N++]=I,w[N++]=I,w[N++]=D,w[N++]=D,w[N++]=P}}else{m=g.version;for(let x=0,M=0;x<_;x+=3){const N=x+0,P=x+1,I=x+2;w[M++]=N,w[M++]=P,w[M++]=P,w[M++]=I,w[M++]=I,w[M++]=N}}v.version=m;const E=a.get(p);E&&e.remove(E),a.set(p,v)}function u(p){const b=a.get(p);if(b){const g=p.index;g!==null&&b.version<g.version&&d(p)}else d(p);return a.get(p)}function f(){for(const p in i){const b=i[p].deref();b!==void 0&&c(b)}}return{get:l,update:h,getWireframeAttribute:u,dispose:f}}function Rg(s,e,t){let n;function i(d){n=d}let a,r;function o(d){a=d.type,r=d.bytesPerElement}function c(d,u){s.drawElements(n,u,a,d*r),t.update(u,n,1)}function l(d,u,f){f!==0&&(s.drawElementsInstanced(n,u,a,d*r,f),t.update(u,n,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,a,d,0,f);let b=0;for(let g=0;g<f;g++)b+=u[g];t.update(b,n,1)}this.setMode=i,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function Pg(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(a,r,o){switch(t.calls++,r){case s.TRIANGLES:t.triangles+=o*(a/3);break;case s.LINES:t.lines+=o*(a/2);break;case s.LINE_STRIP:t.lines+=o*(a-1);break;case s.LINE_LOOP:t.lines+=o*a;break;case s.POINTS:t.points+=o*a;break;default:Ze("WebGLInfo: Unknown draw mode:",r);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Cg(s,e,t){const n=new WeakMap,i=new St;function a(r,o,c){const l=r.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0;let u=n.get(o);if(u===void 0||u.count!==d){let N=function(){x.dispose(),n.delete(o),o.removeEventListener("dispose",N)};u!==void 0&&u.texture.dispose();const f=o.morphAttributes.position!==void 0,p=o.morphAttributes.normal!==void 0,b=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],_=o.morphAttributes.color||[];let S=0;f===!0&&(S=1),p===!0&&(S=2),b===!0&&(S=3);let v=o.attributes.position.count*S,w=1;v>e.maxTextureSize&&(w=Math.ceil(v/e.maxTextureSize),v=e.maxTextureSize);const E=new Float32Array(v*w*4*d),x=new md(E,v,w,d);x.type=xn,x.needsUpdate=!0;const M=S*4;for(let P=0;P<d;P++){const I=g[P],D=m[P],L=_[P],R=v*w*4*P;for(let k=0;k<I.count;k++){const U=k*M;f===!0&&(i.fromBufferAttribute(I,k),E[R+U+0]=i.x,E[R+U+1]=i.y,E[R+U+2]=i.z,E[R+U+3]=0),p===!0&&(i.fromBufferAttribute(D,k),E[R+U+4]=i.x,E[R+U+5]=i.y,E[R+U+6]=i.z,E[R+U+7]=0),b===!0&&(i.fromBufferAttribute(L,k),E[R+U+8]=i.x,E[R+U+9]=i.y,E[R+U+10]=i.z,E[R+U+11]=L.itemSize===4?i.w:1)}}u={count:d,texture:x,size:new Ke(v,w)},n.set(o,u),o.addEventListener("dispose",N)}if(r.isInstancedMesh===!0&&r.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",r.morphTexture,t);else{let f=0;for(let b=0;b<l.length;b++)f+=l[b];const p=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(s,"morphTargetBaseInfluence",p),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",u.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:a}}function Lg(s,e,t,n,i){let a=new WeakMap;function r(l){const h=i.render.frame,d=l.geometry,u=e.get(l,d);if(a.get(u)!==h&&(e.update(u),a.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),a.get(l)!==h&&(t.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,s.ARRAY_BUFFER),a.set(l,h))),l.isSkinnedMesh){const f=l.skeleton;a.get(f)!==h&&(f.update(),a.set(f,h))}return u}function o(){a=new WeakMap}function c(l){const h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:r,dispose:o}}const Dg={[jh]:"LINEAR_TONE_MAPPING",[Yh]:"REINHARD_TONE_MAPPING",[Jh]:"CINEON_TONE_MAPPING",[Zh]:"ACES_FILMIC_TONE_MAPPING",[Qh]:"AGX_TONE_MAPPING",[mc]:"NEUTRAL_TONE_MAPPING",[$h]:"CUSTOM_TONE_MAPPING"};function Ig(s,e,t,n,i,a){const r=new Gn(e,t,{type:s,depthBuffer:i,stencilBuffer:a,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let o=null,c=null,l=null;const h=new yt;h.setAttribute("position",new et([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new et([0,2,0,0,2,0],2));const d=new Vf({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new Nt(h,d),f=new Uc(-1,1,1,-1,0,1);let p=null,b=null,g=!1,m,_=null,S=[],v=!1;this.setSize=function(w,E){r.setSize(w,E),o!==null&&o.setSize(w,E),c!==null&&c.setSize(w,E);for(let x=0;x<S.length;x++){const M=S[x];M.setSize&&M.setSize(w,E)}},this.setEffects=function(w){S=w,v=S.length>0&&S[0].isRenderPass===!0;const E=r.width,x=r.height;S.length>0&&o===null&&(o=new Gn(E,x,{type:Wn,depthBuffer:!1,stencilBuffer:!1}),c=new Gn(E,x,{type:Wn,depthBuffer:!1,stencilBuffer:!1}));const M=i===!0&&S.some(N=>N.needsDepthTexture===!0);M!==(r.depthTexture!==null)&&(M===!0&&l===null&&(l=new _s(E,x),a===!0&&(l.format=_i,l.type=gs)),r.dispose(),r.depthTexture=M?l:null,r.resolveDepthBuffer=M,r.storeMultisampledDepthBuffer=M);for(let N=0;N<S.length;N++){const P=S[N];P.setSize&&P.setSize(E,x),M&&P.needsDepthTexture===!0&&P.setDepthTexture&&P.setDepthTexture(l)}},this.begin=function(w,E){if(g||w.toneMapping===si&&S.length===0)return!1;if(_=E,E!==null){const x=E.width,M=E.height;(r.width!==x||r.height!==M)&&this.setSize(x,M)}return v===!1&&w.setRenderTarget(r),m=w.toneMapping,w.toneMapping=si,!0},this.hasRenderPass=function(){return v},this.end=function(w,E){w.toneMapping=m,g=!0;let x=r,M=o;for(let N=0;N<S.length;N++){const P=S[N];P.enabled!==!1&&(P.render(w,M,x,E),P.needsSwap!==!1&&(x=M,M=M===o?c:o))}if(p!==w.outputColorSpace||b!==w.toneMapping){p=w.outputColorSpace,b=w.toneMapping,d.defines={},lt.getTransfer(p)===xt&&(d.defines.SRGB_TRANSFER="");const N=Dg[b];N&&(d.defines[N]=""),d.needsUpdate=!0}d.uniforms.tDiffuse.value=x.texture,w.setRenderTarget(_),w.render(u,f),_=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){r.dispose(),o!==null&&o.dispose(),c!==null&&c.dispose(),h.dispose(),d.dispose()}}const Nd=new jt,Fd=new _s(1,1),Ud=new yd(1),kd=new md,Od=new uf,zd=new vd,oh=[],ch=[],lh=new Float32Array(16),hh=new Float32Array(9),dh=new Float32Array(4);function Ts(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let a=oh[i];if(a===void 0&&(a=new Float32Array(i),oh[i]=a),e!==0){n.toArray(a,0);for(let r=1,o=0;r!==e;++r)o+=t,s[r].toArray(a,o)}return a}function Gt(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function Ht(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function Sr(s,e){let t=ch[e];t===void 0&&(t=new Int32Array(e),ch[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function Ng(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function Fg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gt(t,e))return;s.uniform2fv(this.addr,e),Ht(t,e)}}function Ug(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Gt(t,e))return;s.uniform3fv(this.addr,e),Ht(t,e)}}function kg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gt(t,e))return;s.uniform4fv(this.addr,e),Ht(t,e)}}function Og(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Gt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Ht(t,e)}else{if(Gt(t,n))return;dh.set(n),s.uniformMatrix2fv(this.addr,!1,dh),Ht(t,n)}}function zg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Gt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Ht(t,e)}else{if(Gt(t,n))return;hh.set(n),s.uniformMatrix3fv(this.addr,!1,hh),Ht(t,n)}}function Bg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Gt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Ht(t,e)}else{if(Gt(t,n))return;lh.set(n),s.uniformMatrix4fv(this.addr,!1,lh),Ht(t,n)}}function Gg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function Hg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gt(t,e))return;s.uniform2iv(this.addr,e),Ht(t,e)}}function Vg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Gt(t,e))return;s.uniform3iv(this.addr,e),Ht(t,e)}}function Wg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gt(t,e))return;s.uniform4iv(this.addr,e),Ht(t,e)}}function qg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function Xg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gt(t,e))return;s.uniform2uiv(this.addr,e),Ht(t,e)}}function Kg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Gt(t,e))return;s.uniform3uiv(this.addr,e),Ht(t,e)}}function jg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gt(t,e))return;s.uniform4uiv(this.addr,e),Ht(t,e)}}function wr(s){return s.version===0&&(s.compareFunction=dd,s.needsUpdate=!0),s}function Yg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let a;this.type===s.SAMPLER_2D_SHADOW?a=wr(Fd):a=Nd,t.setTexture2D(e||a,i)}function Jg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Od,i)}function Zg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let a;this.type===s.SAMPLER_CUBE_SHADOW?a=wr(Ud):a=zd,t.setTextureCube(e||a,i)}function $g(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||kd,i)}function Qg(s){switch(s){case 5126:return Ng;case 35664:return Fg;case 35665:return Ug;case 35666:return kg;case 35674:return Og;case 35675:return zg;case 35676:return Bg;case 5124:case 35670:return Gg;case 35667:case 35671:return Hg;case 35668:case 35672:return Vg;case 35669:case 35673:return Wg;case 5125:return qg;case 36294:return Xg;case 36295:return Kg;case 36296:return jg;case 35678:case 36198:case 36298:case 36306:case 35682:return Yg;case 35679:case 36299:case 36307:return Jg;case 35680:case 36300:case 36308:case 36293:return Zg;case 36289:case 36303:case 36311:case 36292:return $g}}function eb(s,e){s.uniform1fv(this.addr,e)}function tb(s,e){const t=Ts(e,this.size,2);s.uniform2fv(this.addr,t)}function nb(s,e){const t=Ts(e,this.size,3);s.uniform3fv(this.addr,t)}function ib(s,e){const t=Ts(e,this.size,4);s.uniform4fv(this.addr,t)}function sb(s,e){const t=Ts(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function ab(s,e){const t=Ts(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function rb(s,e){const t=Ts(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function ob(s,e){s.uniform1iv(this.addr,e)}function cb(s,e){s.uniform2iv(this.addr,e)}function lb(s,e){s.uniform3iv(this.addr,e)}function hb(s,e){s.uniform4iv(this.addr,e)}function db(s,e){s.uniform1uiv(this.addr,e)}function ub(s,e){s.uniform2uiv(this.addr,e)}function fb(s,e){s.uniform3uiv(this.addr,e)}function pb(s,e){s.uniform4uiv(this.addr,e)}function mb(s,e,t){const n=this.cache,i=e.length,a=Sr(t,i);Gt(n,a)||(s.uniform1iv(this.addr,a),Ht(n,a));let r;this.type===s.SAMPLER_2D_SHADOW?r=wr(Fd):r=Nd;for(let o=0;o!==i;++o)t.setTexture2D(e[o]||r,a[o])}function gb(s,e,t){const n=this.cache,i=e.length,a=Sr(t,i);Gt(n,a)||(s.uniform1iv(this.addr,a),Ht(n,a));for(let r=0;r!==i;++r)t.setTexture3D(e[r]||Od,a[r])}function bb(s,e,t){const n=this.cache,i=e.length,a=Sr(t,i);Gt(n,a)||(s.uniform1iv(this.addr,a),Ht(n,a));let r;this.type===s.SAMPLER_CUBE_SHADOW?r=wr(Ud):r=zd;for(let o=0;o!==i;++o)t.setTextureCube(e[o]||r,a[o])}function _b(s,e,t){const n=this.cache,i=e.length,a=Sr(t,i);Gt(n,a)||(s.uniform1iv(this.addr,a),Ht(n,a));for(let r=0;r!==i;++r)t.setTexture2DArray(e[r]||kd,a[r])}function xb(s){switch(s){case 5126:return eb;case 35664:return tb;case 35665:return nb;case 35666:return ib;case 35674:return sb;case 35675:return ab;case 35676:return rb;case 5124:case 35670:return ob;case 35667:case 35671:return cb;case 35668:case 35672:return lb;case 35669:case 35673:return hb;case 5125:return db;case 36294:return ub;case 36295:return fb;case 36296:return pb;case 35678:case 36198:case 36298:case 36306:case 35682:return mb;case 35679:case 36299:case 36307:return gb;case 35680:case 36300:case 36308:case 36293:return bb;case 36289:case 36303:case 36311:case 36292:return _b}}class vb{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Qg(t.type)}}class yb{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=xb(t.type)}}class Mb{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let a=0,r=i.length;a!==r;++a){const o=i[a];o.setValue(e,t[o.id],n)}}}const oo=/(\w+)(\])?(\[|\.)?/g;function uh(s,e){s.seq.push(e),s.map[e.id]=e}function Sb(s,e,t){const n=s.name,i=n.length;for(oo.lastIndex=0;;){const a=oo.exec(n),r=oo.lastIndex;let o=a[1];const c=a[2]==="]",l=a[3];if(c&&(o=o|0),l===void 0||l==="["&&r+2===i){uh(t,l===void 0?new vb(o,s,e):new yb(o,s,e));break}else{let d=t.map[o];d===void 0&&(d=new Mb(o),uh(t,d)),t=d}}}class sr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const o=e.getActiveUniform(t,r),c=e.getUniformLocation(t,o.name);Sb(o,c,this)}const i=[],a=[];for(const r of this.seq)r.type===e.SAMPLER_2D_SHADOW||r.type===e.SAMPLER_CUBE_SHADOW||r.type===e.SAMPLER_2D_ARRAY_SHADOW?i.push(r):a.push(r);i.length>0&&(this.seq=i.concat(a))}setValue(e,t,n,i){const a=this.map[t];a!==void 0&&a.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let a=0,r=t.length;a!==r;++a){const o=t[a],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,a=e.length;i!==a;++i){const r=e[i];r.id in t&&n.push(r)}return n}}function fh(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const wb=37297;let Eb=0;function Tb(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),a=Math.min(e+6,t.length);for(let r=i;r<a;r++){const o=r+1;n.push(`${o===e?">":" "} ${o}: ${t[r]}`)}return n.join(`
`)}const ph=new Je;function Ab(s){lt._getMatrix(ph,lt.workingColorSpace,s);const e=`mat3( ${ph.elements.map(t=>t.toFixed(4))} )`;switch(lt.getTransfer(s)){case lr:return[e,"LinearTransferOETF"];case xt:return[e,"sRGBTransferOETF"];default:return He("WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function mh(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),a=(s.getShaderInfoLog(e)||"").trim();if(n&&a==="")return"";const r=/ERROR: 0:(\d+)/.exec(a);if(r){const o=parseInt(r[1]);return t.toUpperCase()+`

`+a+`

`+Tb(s.getShaderSource(e),o)}else return a}function Rb(s,e){const t=Ab(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( ${t[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}const Pb={[jh]:"Linear",[Yh]:"Reinhard",[Jh]:"Cineon",[Zh]:"ACESFilmic",[Qh]:"AgX",[mc]:"Neutral",[$h]:"Custom"};function Cb(s,e){const t=Pb[e];return t===void 0?(He("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+s+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ha=new y;function Lb(){lt.getLuminanceCoefficients(Ha);const s=Ha.x.toFixed(4),e=Ha.y.toFixed(4),t=Ha.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Db(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qs).join(`
`)}function Ib(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Nb(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const a=s.getActiveAttrib(e,i),r=a.name;let o=1;a.type===s.FLOAT_MAT2&&(o=2),a.type===s.FLOAT_MAT3&&(o=3),a.type===s.FLOAT_MAT4&&(o=4),t[r]={type:a.type,location:s.getAttribLocation(e,r),locationSize:o}}return t}function qs(s){return s!==""}function gh(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,e.numLightProbeGrids)}function bh(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Fb=/^[ \t]*#include +<([\w\d./]+)>/gm;function dc(s){return s.replace(Fb,Ub)}function Ub(s,e){const t=rt[e];if(t===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");return dc(t)}const kb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function _h(s){return s.replace(kb,Ob)}function Ob(s,e,t,n){let i="";for(let a=parseInt(e);a<parseInt(t);a++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+a+" ]").replace(/UNROLLED_LOOP_INDEX/g,a);return i}function xh(s){let e=`precision ${s.precision} float;
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
#define LOW_PRECISION`),e}const zb={[Xs]:"SHADOWMAP_TYPE_PCF",[Hs]:"SHADOWMAP_TYPE_VSM"};function Bb(s){return zb[s.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const Gb={[Qs]:"ENVMAP_MODE_REFRACTION"};function Hb(s){return s.envMap===!1?"ENVMAP_MODE_REFLECTION":Gb[s.envMapMode]||"ENVMAP_MODE_REFLECTION"}const Vb={[Kh]:"ENVMAP_BLENDING_MULTIPLY",[Au]:"ENVMAP_BLENDING_MIX",[Ru]:"ENVMAP_BLENDING_ADD"};function Wb(s){return s.envMap===!1?"ENVMAP_BLENDING_NONE":Vb[s.combine]||"ENVMAP_BLENDING_NONE"}function qb(s,e,t,n){const i=s.getContext(),a=t.defines;let r=t.vertexShader,o=t.fragmentShader;const c=Bb(t),l=t.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=Hb(t),d=Wb(t),u=Db(t),f=Ib(a),p=i.createProgram();let b,g,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(b=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(qs).join(`
`),b.length>0&&(b+=`
`),g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(qs).join(`
`),g.length>0&&(g+=`
`)):(b=[xh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+t.diffuseRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qs).join(`
`),g=[xh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",t.envMapPMREM?"#define ENVMAP_MAX_LOD "+t.envMapMaxLod+".0":"",t.envMapPMREM?"#define ENVMAP_SIZE "+t.envMapSize+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==si?"#define TONE_MAPPING":"",t.toneMapping!==si?rt.tonemapping_pars_fragment:"",t.toneMapping!==si?Cb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",rt.colorspace_pars_fragment,Rb("linearToOutputTexel",t.outputColorSpace),Lb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(qs).join(`
`)),r=dc(r),r=gh(r,t),r=bh(r,t),o=dc(o),o=gh(o,t),o=bh(o,t),r=_h(r),o=_h(o),t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,b=[u,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+b,g=["#define varying in",t.glslVersion===hl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===hl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+g);const _=m+b+r,S=m+g+o,v=fh(i,i.VERTEX_SHADER,_),w=fh(i,i.FRAGMENT_SHADER,S);i.attachShader(p,v),i.attachShader(p,w),t.index0AttributeName!==void 0?i.bindAttribLocation(p,0,t.index0AttributeName):t.hasPositionAttribute===!0&&i.bindAttribLocation(p,0,"position"),i.linkProgram(p);function E(P){if(s.debug.checkShaderErrors){const I=i.getProgramInfoLog(p)||"",D=i.getShaderInfoLog(v)||"",L=i.getShaderInfoLog(w)||"",R=I.trim(),k=D.trim(),U=L.trim();let F=!0,V=!0;if(i.getProgramParameter(p,i.LINK_STATUS)===!1)if(F=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,p,v,w);else{const O=mh(i,v,"vertex"),W=mh(i,w,"fragment");Ze("WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(p,i.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+R+`
`+O+`
`+W)}else R!==""?He("WebGLProgram: Program Info Log:",R):(k===""||U==="")&&(V=!1);V&&(P.diagnostics={runnable:F,programLog:R,vertexShader:{log:k,prefix:b},fragmentShader:{log:U,prefix:g}})}i.deleteShader(v),i.deleteShader(w),x=new sr(i,p),M=Nb(i,p)}let x;this.getUniforms=function(){return x===void 0&&E(this),x};let M;this.getAttributes=function(){return M===void 0&&E(this),M};let N=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return N===!1&&(N=i.getProgramParameter(p,wb)),N},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(p),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Eb++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=v,this.fragmentShader=w,this}let Xb=0;class Kb{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){const i=this._getShaderCacheForMaterial(e);return i.has(t)===!1&&(i.add(t),t.usedTimes++),i.has(n)===!1&&(i.add(n),n.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new jb(e),t.set(e,n)),n}}class jb{constructor(e){this.id=Xb++,this.code=e,this.usedTimes=0}}function Yb(s){return s===Hi||s===or||s===cr}function Jb(s,e,t,n,i,a){const r=new Ac,o=new Kb,c=new Set,l=[],h=new Map,d=n.logarithmicDepthBuffer,u={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(x){return c.add(x),x===0?"uv":`uv${x}`}function p(x,M,N,P,I,D){const L=P.fog,R=I.geometry,k=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?P.environment:null,U=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,F=e.get(x.envMap||k,U),V=u[x.type];let O=n.precision;x.precision!==null&&(O=n.getMaxPrecision(x.precision),O!==x.precision&&He("WebGLProgram.getParameters:",x.precision,"not supported, using",O,"instead."));const W=R.morphAttributes.position||R.morphAttributes.normal||R.morphAttributes.color,Y=W!==void 0?W.length:0;let j=0;R.morphAttributes.position!==void 0&&(j=1),R.morphAttributes.normal!==void 0&&(j=2),R.morphAttributes.color!==void 0&&(j=3);let ue,H,Z,te;if(V){const Pe=On[V];ue=Pe.vertexShader,H=Pe.fragmentShader}else{ue=x.vertexShader,H=x.fragmentShader;const Pe=o.getVertexShaderStage(x),_t=o.getFragmentShaderStage(x);o.update(x,Pe,_t),Z=Pe.id,te=_t.id}const he=s.getRenderTarget(),Q=s.state.buffers.depth.getReversed(),De=I.isInstancedMesh===!0,Ye=I.isBatchedMesh===!0,be=!!x.map,Fe=!!x.matcap,le=!!F,fe=le&&F.isPMREMTexture===!0,Re=!!x.aoMap,ye=!!x.lightMap,Ue=!!x.bumpMap&&x.wireframe===!1,se=!!x.normalMap,tt=!!x.displacementMap,je=!!x.emissiveMap,ct=!!x.metalnessMap,st=!!x.roughnessMap,At=x.anisotropy>0,G=x.clearcoat>0,Et=x.diffuseRoughness>0,ft=x.dispersion>0,bt=x.retroreflectivity>0,oe=x.iridescence>0,$e=x.sheen>0,Ie=x.transmission>0,We=At&&!!x.anisotropyMap,C=G&&!!x.clearcoatMap,T=G&&!!x.clearcoatNormalMap,q=G&&!!x.clearcoatRoughnessMap,pe=Et&&!!x.diffuseRoughnessMap,ae=oe&&!!x.iridescenceMap,xe=oe&&!!x.iridescenceThicknessMap,Te=$e&&!!x.sheenColorMap,ee=$e&&!!x.sheenRoughnessMap,ne=!!x.specularMap,Me=!!x.specularColorMap,z=!!x.specularIntensityMap,ie=Ie&&!!x.transmissionMap,$=Ie&&!!x.thicknessMap,Se=!!x.gradientMap,_e=!!x.alphaMap,ve=x.alphaTest>0,qe=!!x.alphaHash,at=!!x.extensions;let ge=si;x.toneMapped&&(he===null||he.isXRRenderTarget===!0)&&(ge=s.toneMapping);const Xe=fe?F.isCompressedCubeTexture?F.image[0].mipmaps:F.mipmaps:null,nt={shaderID:V,shaderType:x.type,shaderName:x.name,vertexShader:ue,fragmentShader:H,defines:x.defines,customVertexShaderID:Z,customFragmentShaderID:te,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:O,batching:Ye,batchingColor:Ye&&I._colorsTexture!==null,instancing:De,instancingColor:De&&I.instanceColor!==null,instancingMorph:De&&I.morphTexture!==null,outputColorSpace:he===null?s.outputColorSpace:he.isXRRenderTarget===!0?he.texture.colorSpace:lt.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:be,matcap:Fe,envMap:le,envMapMode:le&&F.mapping,envMapPMREM:fe,envMapMaxLod:fe?Xe.length-1:null,envMapSize:fe?Xe[0].width:null,aoMap:Re,lightMap:ye,bumpMap:Ue,normalMap:se,displacementMap:tt,emissiveMap:je,normalMapObjectSpace:se&&x.normalMapType===Iu,normalMapTangentSpace:se&&x.normalMapType===ac,packedNormalMap:se&&x.normalMapType===ac&&Yb(x.normalMap.format),metalnessMap:ct,roughnessMap:st,anisotropy:At,anisotropyMap:We,clearcoat:G,clearcoatMap:C,clearcoatNormalMap:T,clearcoatRoughnessMap:q,diffuseRoughness:Et,diffuseRoughnessMap:pe,dispersion:ft,retroreflection:bt,iridescence:oe,iridescenceMap:ae,iridescenceThicknessMap:xe,sheen:$e,sheenColorMap:Te,sheenRoughnessMap:ee,specularMap:ne,specularColorMap:Me,specularIntensityMap:z,transmission:Ie,transmissionMap:ie,thicknessMap:$,gradientMap:Se,opaque:x.transparent===!1&&x.blending===Ks&&x.alphaToCoverage===!1,alphaMap:_e,alphaTest:ve,alphaHash:qe,combine:x.combine,mapUv:be&&f(x.map.channel),aoMapUv:Re&&f(x.aoMap.channel),lightMapUv:ye&&f(x.lightMap.channel),bumpMapUv:Ue&&f(x.bumpMap.channel),normalMapUv:se&&f(x.normalMap.channel),displacementMapUv:tt&&f(x.displacementMap.channel),emissiveMapUv:je&&f(x.emissiveMap.channel),metalnessMapUv:ct&&f(x.metalnessMap.channel),roughnessMapUv:st&&f(x.roughnessMap.channel),anisotropyMapUv:We&&f(x.anisotropyMap.channel),clearcoatMapUv:C&&f(x.clearcoatMap.channel),clearcoatNormalMapUv:T&&f(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:q&&f(x.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:pe&&f(x.diffuseRoughnessMap.channel),iridescenceMapUv:ae&&f(x.iridescenceMap.channel),iridescenceThicknessMapUv:xe&&f(x.iridescenceThicknessMap.channel),sheenColorMapUv:Te&&f(x.sheenColorMap.channel),sheenRoughnessMapUv:ee&&f(x.sheenRoughnessMap.channel),specularMapUv:ne&&f(x.specularMap.channel),specularColorMapUv:Me&&f(x.specularColorMap.channel),specularIntensityMapUv:z&&f(x.specularIntensityMap.channel),transmissionMapUv:ie&&f(x.transmissionMap.channel),thicknessMapUv:$&&f(x.thicknessMap.channel),alphaMapUv:_e&&f(x.alphaMap.channel),vertexTangents:!!R.attributes.tangent&&(se||At),vertexNormals:!!R.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!R.attributes.color&&R.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!R.attributes.uv&&(be||_e),fog:!!L,useFog:x.fog===!0,fogExp2:!!L&&L.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||R.attributes.normal===void 0&&se===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Q,skinning:I.isSkinnedMesh===!0,hasPositionAttribute:R.attributes.position!==void 0,morphTargets:R.morphAttributes.position!==void 0,morphNormals:R.morphAttributes.normal!==void 0,morphColors:R.morphAttributes.color!==void 0,morphTargetsCount:Y,morphTextureStride:j,numSunLights:M.sun.length,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numSunLightShadows:M.sunShadowMap.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numLightProbeGrids:D.filter(Pe=>Pe.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:x.dithering,shadowMapEnabled:s.shadowMap.enabled&&N.length>0,shadowMapType:s.shadowMap.type,toneMapping:ge,decodeVideoTexture:be&&x.map.isVideoTexture===!0&&lt.getTransfer(x.map.colorSpace)===xt,decodeVideoTextureEmissive:je&&x.emissiveMap.isVideoTexture===!0&&lt.getTransfer(x.emissiveMap.colorSpace)===xt,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===Lt,flipSided:x.side===rn,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:at&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(at&&x.extensions.multiDraw===!0||Ye)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return nt.vertexUv1s=c.has(1),nt.vertexUv2s=c.has(2),nt.vertexUv3s=c.has(3),c.clear(),nt}function b(x){const M=[];if(x.shaderID?M.push(x.shaderID):(M.push(x.customVertexShaderID),M.push(x.customFragmentShaderID)),x.defines!==void 0)for(const N in x.defines)M.push(N),M.push(x.defines[N]);return x.isRawShaderMaterial===!1&&(g(M,x),m(M,x),M.push(s.outputColorSpace)),M.push(x.customProgramCacheKey),M.join()}function g(x,M){x.push(M.precision),x.push(M.outputColorSpace),x.push(M.envMapMode),x.push(M.envMapPMREM),x.push(M.envMapMaxLod),x.push(M.envMapSize),x.push(M.mapUv),x.push(M.alphaMapUv),x.push(M.lightMapUv),x.push(M.aoMapUv),x.push(M.bumpMapUv),x.push(M.normalMapUv),x.push(M.displacementMapUv),x.push(M.emissiveMapUv),x.push(M.metalnessMapUv),x.push(M.roughnessMapUv),x.push(M.anisotropyMapUv),x.push(M.clearcoatMapUv),x.push(M.clearcoatNormalMapUv),x.push(M.clearcoatRoughnessMapUv),x.push(M.diffuseRoughnessMapUv),x.push(M.iridescenceMapUv),x.push(M.iridescenceThicknessMapUv),x.push(M.sheenColorMapUv),x.push(M.sheenRoughnessMapUv),x.push(M.specularMapUv),x.push(M.specularColorMapUv),x.push(M.specularIntensityMapUv),x.push(M.transmissionMapUv),x.push(M.thicknessMapUv),x.push(M.combine),x.push(M.fogExp2),x.push(M.sizeAttenuation),x.push(M.morphTargetsCount),x.push(M.numSunLights),x.push(M.numDirLights),x.push(M.numPointLights),x.push(M.numSpotLights),x.push(M.numSpotLightMaps),x.push(M.numHemiLights),x.push(M.numRectAreaLights),x.push(M.numSunLightShadows),x.push(M.numDirLightShadows),x.push(M.numPointLightShadows),x.push(M.numSpotLightShadows),x.push(M.numSpotLightShadowsWithMaps),x.push(M.numLightProbes),x.push(M.numLightProbeGrids),x.push(M.shadowMapType),x.push(M.toneMapping),x.push(M.numClippingPlanes),x.push(M.numClipIntersection),x.push(M.depthPacking)}function m(x,M){r.disableAll(),M.instancing&&r.enable(0),M.instancingColor&&r.enable(1),M.instancingMorph&&r.enable(2),M.matcap&&r.enable(3),M.envMap&&r.enable(4),M.normalMapObjectSpace&&r.enable(5),M.normalMapTangentSpace&&r.enable(6),M.clearcoat&&r.enable(7),M.iridescence&&r.enable(8),M.alphaTest&&r.enable(9),M.vertexColors&&r.enable(10),M.vertexAlphas&&r.enable(11),M.vertexUv1s&&r.enable(12),M.vertexUv2s&&r.enable(13),M.vertexUv3s&&r.enable(14),M.vertexTangents&&r.enable(15),M.anisotropy&&r.enable(16),M.alphaHash&&r.enable(17),M.batching&&r.enable(18),M.dispersion&&r.enable(19),M.retroreflection&&r.enable(24),M.diffuseRoughness&&r.enable(25),M.batchingColor&&r.enable(20),M.gradientMap&&r.enable(21),M.packedNormalMap&&r.enable(22),M.vertexNormals&&r.enable(23),x.push(r.mask),r.disableAll(),M.fog&&r.enable(0),M.useFog&&r.enable(1),M.flatShading&&r.enable(2),M.logarithmicDepthBuffer&&r.enable(3),M.reversedDepthBuffer&&r.enable(4),M.skinning&&r.enable(5),M.morphTargets&&r.enable(6),M.morphNormals&&r.enable(7),M.morphColors&&r.enable(8),M.premultipliedAlpha&&r.enable(9),M.shadowMapEnabled&&r.enable(10),M.doubleSided&&r.enable(11),M.flipSided&&r.enable(12),M.useDepthPacking&&r.enable(13),M.dithering&&r.enable(14),M.transmission&&r.enable(15),M.sheen&&r.enable(16),M.opaque&&r.enable(17),M.pointsUvs&&r.enable(18),M.decodeVideoTexture&&r.enable(19),M.decodeVideoTextureEmissive&&r.enable(20),M.alphaToCoverage&&r.enable(21),M.numLightProbeGrids>0&&r.enable(22),M.hasPositionAttribute&&r.enable(23),x.push(r.mask)}function _(x){const M=u[x.type];let N;if(M){const P=On[M];N=Bf.clone(P.uniforms)}else N=x.uniforms;return N}function S(x,M){let N=h.get(M);return N!==void 0?++N.usedTimes:(N=new qb(s,M,x,i),l.push(N),h.set(M,N)),N}function v(x){if(--x.usedTimes===0){const M=l.indexOf(x);l[M]=l[l.length-1],l.pop(),h.delete(x.cacheKey),x.destroy()}}function w(x){o.remove(x)}function E(){o.dispose()}return{getParameters:p,getProgramCacheKey:b,getUniforms:_,acquireProgram:S,releaseProgram:v,releaseShaderCache:w,programs:l,dispose:E}}function Zb(){let s=new WeakMap;function e(r){return s.has(r)}function t(r){let o=s.get(r);return o===void 0&&(o={},s.set(r,o)),o}function n(r){s.delete(r)}function i(r,o,c){s.get(r)[o]=c}function a(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:a}}function $b(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.materialVariant!==e.materialVariant?s.materialVariant-e.materialVariant:s.z!==e.z?s.z-e.z:s.id-e.id}function vh(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function yh(){const s=[];let e=0;const t=[],n=[],i=[];function a(){e=0,t.length=0,n.length=0,i.length=0}function r(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,p,b,g,m){let _=s[e];return _===void 0?(_={id:u.id,object:u,geometry:f,material:p,materialVariant:r(u),groupOrder:b,renderOrder:u.renderOrder,z:g,group:m},s[e]=_):(_.id=u.id,_.object=u,_.geometry=f,_.material=p,_.materialVariant=r(u),_.groupOrder=b,_.renderOrder=u.renderOrder,_.z=g,_.group=m),e++,_}function c(u,f,p,b,g,m,_){_.reversedDepth===!0&&(g=-g);const S=o(u,f,p,b,g,m);p.transmission>0?n.push(S):p.transparent===!0?i.push(S):t.push(S)}function l(u,f,p,b,g,m){const _=o(u,f,p,b,g,m);p.transmission>0?n.unshift(_):p.transparent===!0?i.unshift(_):t.unshift(_)}function h(u,f){t.length>1&&t.sort(u||$b),n.length>1&&n.sort(f||vh),i.length>1&&i.sort(f||vh)}function d(){for(let u=e,f=s.length;u<f;u++){const p=s[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:i,init:a,push:c,unshift:l,finish:d,sort:h}}function Qb(){let s=new WeakMap;function e(n,i){const a=s.get(n);let r;return a===void 0?(r=new yh,s.set(n,[r])):i>=a.length?(r=new yh,a.push(r)):r=a[i],r}function t(){s=new WeakMap}return{get:e,dispose:t}}function e_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new y,color:new me};break;case"SpotLight":t={position:new y,direction:new y,color:new me,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new y,color:new me,distance:0,decay:0};break;case"HemisphereLight":t={direction:new y,skyColor:new me,groundColor:new me};break;case"RectAreaLight":t={color:new me,position:new y,halfWidth:new y,halfHeight:new y};break}return s[e.id]=t,t}}}function t_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ke};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ke};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ke,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let n_=0;function i_(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function s_(s){const e=new e_,t=t_(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new y);const i=new y,a=new Ve,r=new Ve;function o(l){let h=0,d=0,u=0;for(let D=0;D<9;D++)n.probe[D].set(0,0,0);let f=0,p=0,b=0,g=0,m=0,_=0,S=0,v=0,w=0,E=0,x=0,M=0,N=0,P=0;l.sort(i_);for(let D=0,L=l.length;D<L;D++){const R=l[D],k=R.color,U=R.intensity,F=R.distance;let V=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===Hi?V=R.shadow.map.texture:V=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)h+=k.r*U,d+=k.g*U,u+=k.b*U;else if(R.isLightProbe){for(let O=0;O<9;O++)n.probe[O].addScaledVector(R.sh.coefficients[O],U);P++}else if(R.isSunLight){const O=e.get(R);if(O.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const W=R.shadow,Y=t.get(R);Y.shadowIntensity=W.intensity,Y.shadowBias=W.bias,Y.shadowNormalBias=W.normalBias,Y.shadowRadius=W.radius,Y.shadowMapSize.copy(W.mapSize).multiply(W.getFrameExtents()),n.sunShadow[p]=Y,n.sunShadowMap[p]=V;const j=W.getViewportCount();for(let ue=0;ue<j;ue++)n.sunShadowMatrix[b+ue]=W.getMatrix(ue),n.sunShadowCascade[b+ue]=W._cascadeData[ue];b+=j,p++}n.sun[f]=O,f++}else if(R.isDirectionalLight){const O=e.get(R);if(O.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const W=R.shadow,Y=t.get(R);Y.shadowIntensity=W.intensity,Y.shadowBias=W.bias,Y.shadowNormalBias=W.normalBias,Y.shadowRadius=W.radius,Y.shadowMapSize=W.mapSize,n.directionalShadow[g]=Y,n.directionalShadowMap[g]=V,n.directionalShadowMatrix[g]=R.shadow.matrix,w++}n.directional[g]=O,g++}else if(R.isSpotLight){const O=e.get(R);O.position.setFromMatrixPosition(R.matrixWorld),O.color.copy(k).multiplyScalar(U),O.distance=F,O.coneCos=Math.cos(R.angle),O.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),O.decay=R.decay,n.spot[_]=O;const W=R.shadow;if(R.map&&(n.spotLightMap[M]=R.map,M++,W.updateMatrices(R),R.castShadow&&N++),n.spotLightMatrix[_]=W.matrix,R.castShadow){const Y=t.get(R);Y.shadowIntensity=W.intensity,Y.shadowBias=W.bias,Y.shadowNormalBias=W.normalBias,Y.shadowRadius=W.radius,Y.shadowMapSize=W.mapSize,n.spotShadow[_]=Y,n.spotShadowMap[_]=V,x++}_++}else if(R.isRectAreaLight){const O=e.get(R);O.color.copy(k).multiplyScalar(U),O.halfWidth.set(R.width*.5,0,0),O.halfHeight.set(0,R.height*.5,0),n.rectArea[S]=O,S++}else if(R.isPointLight){const O=e.get(R);if(O.color.copy(R.color).multiplyScalar(R.intensity),O.distance=R.distance,O.decay=R.decay,R.castShadow){const W=R.shadow,Y=t.get(R);Y.shadowIntensity=W.intensity,Y.shadowBias=W.bias,Y.shadowNormalBias=W.normalBias,Y.shadowRadius=W.radius,Y.shadowMapSize=W.mapSize,Y.shadowCameraNear=W.camera.near,Y.shadowCameraFar=W.camera.far,n.pointShadow[m]=Y,n.pointShadowMap[m]=V,n.pointShadowMatrix[m]=R.shadow.matrix,E++}n.point[m]=O,m++}else if(R.isHemisphereLight){const O=e.get(R);O.skyColor.copy(R.color).multiplyScalar(U),O.groundColor.copy(R.groundColor).multiplyScalar(U),n.hemi[v]=O,v++}}S>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=Ce.LTC_FLOAT_1,n.rectAreaLTC2=Ce.LTC_FLOAT_2):(n.rectAreaLTC1=Ce.LTC_HALF_1,n.rectAreaLTC2=Ce.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;const I=n.hash;(I.sunLength!==f||I.directionalLength!==g||I.pointLength!==m||I.spotLength!==_||I.rectAreaLength!==S||I.hemiLength!==v||I.numSunShadows!==p||I.numDirectionalShadows!==w||I.numPointShadows!==E||I.numSpotShadows!==x||I.numSpotMaps!==M||I.numLightProbes!==P)&&(n.sun.length=f,n.directional.length=g,n.spot.length=_,n.rectArea.length=S,n.point.length=m,n.hemi.length=v,n.sunShadow.length=p,n.sunShadowMap.length=p,n.sunShadowMatrix.length=b,n.sunShadowCascade.length=b,n.directionalShadow.length=w,n.directionalShadowMap.length=w,n.directionalShadowMatrix.length=w,n.pointShadow.length=E,n.pointShadowMap.length=E,n.pointShadowMatrix.length=E,n.spotShadow.length=x,n.spotShadowMap.length=x,n.spotLightMatrix.length=x+M-N,n.spotLightMap.length=M,n.numSpotLightShadowsWithMaps=N,n.numLightProbes=P,I.sunLength=f,I.directionalLength=g,I.pointLength=m,I.spotLength=_,I.rectAreaLength=S,I.hemiLength=v,I.numSunShadows=p,I.numDirectionalShadows=w,I.numPointShadows=E,I.numSpotShadows=x,I.numSpotMaps=M,I.numLightProbes=P,n.version=n_++)}function c(l,h){let d=0,u=0,f=0,p=0,b=0,g=0;const m=h.matrixWorldInverse;for(let _=0,S=l.length;_<S;_++){const v=l[_];if(v.isSunLight){const w=n.sun[d];w.direction.setFromMatrixPosition(v.matrixWorld),w.direction.transformDirection(m),d++}else if(v.isDirectionalLight){const w=n.directional[u];w.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),w.direction.sub(i),w.direction.transformDirection(m),u++}else if(v.isSpotLight){const w=n.spot[p];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),w.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),w.direction.sub(i),w.direction.transformDirection(m),p++}else if(v.isRectAreaLight){const w=n.rectArea[b];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),r.identity(),a.copy(v.matrixWorld),a.premultiply(m),r.extractRotation(a),w.halfWidth.set(v.width*.5,0,0),w.halfHeight.set(0,v.height*.5,0),w.halfWidth.applyMatrix4(r),w.halfHeight.applyMatrix4(r),b++}else if(v.isPointLight){const w=n.point[f];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),f++}else if(v.isHemisphereLight){const w=n.hemi[g];w.direction.setFromMatrixPosition(v.matrixWorld),w.direction.transformDirection(m),g++}}}return{setup:o,setupView:c,state:n}}function Mh(s){const e=new s_(s),t=[],n=[],i=[];function a(d){h.camera=d,t.length=0,n.length=0,i.length=0}function r(d){d.isLightProbeGrid?i.push(d):t.push(d)}function o(d){n.push(d)}function c(){e.setup(t),i.sort((d,u)=>d.priority-u.priority||d.id-u.id)}function l(d){e.setupView(t,d)}const h={lightsArray:t,shadowsArray:n,lightProbeGridArray:i,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:h,setupLights:c,setupLightsView:l,pushLight:r,pushShadow:o}}function a_(s){let e=new WeakMap;function t(i,a=0){const r=e.get(i);let o;return r===void 0?(o=new Mh(s),e.set(i,[o])):a>=r.length?(o=new Mh(s),r.push(o)):o=r[a],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const r_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,o_=`uniform sampler2D shadow_pass;
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
}`,c_=[new y(1,0,0),new y(-1,0,0),new y(0,1,0),new y(0,-1,0),new y(0,0,1),new y(0,0,-1)],l_=[new y(0,-1,0),new y(0,-1,0),new y(0,0,1),new y(0,0,-1),new y(0,-1,0),new y(0,-1,0)],Sh=new Ve,Us=new y,co=new y;function h_(s,e,t){let n=new aa;const i=new Ke,a=new Ke,r=new St,o=new wd,c=new Wf,l={},h=t.maxTextureSize,d={[yi]:rn,[rn]:yi,[Lt]:Lt},u=new Si({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ke},radius:{value:4}},vertexShader:r_,fragmentShader:o_}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const p=new yt;p.setAttribute("position",new Dt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const b=new Nt(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Xs;let m=this.type;this.render=function(E,x,M){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||E.length===0)return;this.type===cu&&(He("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=Xs);const N=s.getRenderTarget(),P=s.getActiveCubeFace(),I=s.getActiveMipmapLevel(),D=s.state;D.setBlending(ds),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const L=m!==this.type;L&&x.traverse(function(R){R.material&&(Array.isArray(R.material)?R.material.forEach(k=>k.needsUpdate=!0):R.material.needsUpdate=!0)});for(let R=0,k=E.length;R<k;R++){const U=E[R],F=U.shadow;if(F===void 0){He("WebGLShadowMap:",U,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;i.copy(F.mapSize);const V=F.getFrameExtents();i.multiply(V),a.copy(F.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(a.x=Math.floor(h/V.x),i.x=a.x*V.x,F.mapSize.x=a.x),i.y>h&&(a.y=Math.floor(h/V.y),i.y=a.y*V.y,F.mapSize.y=a.y));const O=s.state.buffers.depth.getReversed();if(F.camera._reversedDepth=O,F.map===null||L===!0){if(F.map!==null&&(F.map.depthTexture!==null&&(F.map.depthTexture.dispose(),F.map.depthTexture=null),F.map.dispose()),this.type===Hs){if(U.isPointLight){He("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}F.map=new Gn(i.x,i.y,{format:Hi,type:Wn,minFilter:Kt,magFilter:Kt,generateMipmaps:!1}),F.map.texture.name=U.name+".shadowMap",F.map.depthTexture=new _s(i.x,i.y,xn),F.map.depthTexture.name=U.name+".shadowMapDepth",F.map.depthTexture.format=Mi,F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=zt,F.map.depthTexture.magFilter=zt}else U.isPointLight?(F.map=new zc(i.x),F.map.depthTexture=new yd(i.x,Vn)):(F.map=new Gn(i.x,i.y),F.map.depthTexture=new _s(i.x,i.y,Vn)),F.map.depthTexture.name=U.name+".shadowMap",F.map.depthTexture.format=Mi,this.type===Xs?(F.map.depthTexture.compareFunction=O?hd:ld,F.map.depthTexture.minFilter=Kt,F.map.depthTexture.magFilter=Kt):(F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=zt,F.map.depthTexture.magFilter=zt);F.camera.updateProjectionMatrix()}F.map.isWebGLCubeRenderTarget!==!0&&(F.map.width!==i.x||F.map.height!==i.y)&&F.map.setSize(i.x,i.y);const W=F.map.isWebGLCubeRenderTarget?6:F.getViewportCount();U.isPointLight!==!0&&F.updateMatrices(U,M);const Y=(F.camera.layers.mask&4294967294)!==0?F.camera.layers:M.layers;for(let j=0;j<W;j++){const ue=F.getCamera(j);if(U.isPointLight){const H=F.camera,Z=F.matrix,te=U.distance||H.far;te!==H.far&&(H.far=te,H.updateProjectionMatrix()),Us.setFromMatrixPosition(U.matrixWorld),H.position.copy(Us),co.copy(H.position),co.add(c_[j]),H.up.copy(l_[j]),H.lookAt(co),H.updateMatrixWorld(),Z.makeTranslation(-Us.x,-Us.y,-Us.z),Sh.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),F._frustum.setFromProjectionMatrix(Sh,H.coordinateSystem,H.reversedDepth)}if(F.map.isWebGLCubeRenderTarget)s.setRenderTarget(F.map,j),s.clear();else{j===0&&(s.setRenderTarget(F.map),s.clear());const H=F.getViewport(j);r.set(a.x*H.x,a.y*H.y,a.x*H.z,a.y*H.w),D.viewport(r)}n=F.getFrustum(j),v(x,M,ue,U,Y,this.type)}F.isPointLightShadow!==!0&&this.type===Hs&&_(F,M),F.needsUpdate=!1}m=this.type,g.needsUpdate=!1,s.setRenderTarget(N,P,I)};function _(E,x){const M=e.update(b);u.defines.VSM_SAMPLES!==E.blurSamples&&(u.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null?E.mapPass=new Gn(i.x,i.y,{format:Hi,type:Wn}):(E.mapPass.width!==E.map.width||E.mapPass.height!==E.map.height)&&E.mapPass.setSize(E.map.width,E.map.height),u.uniforms.shadow_pass.value=E.map.depthTexture,u.uniforms.resolution.value.set(E.map.width,E.map.height),u.uniforms.radius.value=E.radius,s.setRenderTarget(E.mapPass),s.clear(),s.renderBufferDirect(x,null,M,u,b,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value.set(E.map.width,E.map.height),f.uniforms.radius.value=E.radius,s.setRenderTarget(E.map),s.clear(),s.renderBufferDirect(x,null,M,f,b,null)}function S(E,x,M,N){let P=null;const I=M.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(I!==void 0)P=I;else if(P=M.isPointLight===!0?c:o,s.localClippingEnabled&&x.clipShadows===!0&&Array.isArray(x.clippingPlanes)&&x.clippingPlanes.length!==0||x.displacementMap&&x.displacementScale!==0||x.alphaMap&&x.alphaTest>0||x.map&&x.alphaTest>0||x.alphaToCoverage===!0){const D=P.uuid,L=x.uuid;let R=l[D];R===void 0&&(R={},l[D]=R);let k=R[L];k===void 0&&(k=P.clone(),R[L]=k,x.addEventListener("dispose",w)),P=k}if(P.visible=x.visible,P.wireframe=x.wireframe,N===Hs?P.side=x.shadowSide!==null?x.shadowSide:x.side:P.side=x.shadowSide!==null?x.shadowSide:d[x.side],P.alphaMap=x.alphaMap,P.alphaTest=x.alphaToCoverage===!0?.5:x.alphaTest,P.map=x.map,P.clipShadows=x.clipShadows,P.clippingPlanes=x.clippingPlanes,P.clipIntersection=x.clipIntersection,P.displacementMap=x.displacementMap,P.displacementScale=x.displacementScale,P.displacementBias=x.displacementBias,P.wireframeLinewidth=x.wireframeLinewidth,P.linewidth=x.linewidth,M.isPointLight===!0&&P.isMeshDistanceMaterial===!0){const D=s.properties.get(P);D.light=M}return P}function v(E,x,M,N,P,I){if(E.visible===!1)return;if(E.layers.test(P)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&I===Hs)&&(!E.frustumCulled||E.intersectsFrustum(n))){E.modelViewMatrix.multiplyMatrices(M.matrixWorldInverse,E.matrixWorld);const R=e.update(E),k=E.material;if(Array.isArray(k)){const U=R.groups;for(let F=0,V=U.length;F<V;F++){const O=U[F],W=k[O.materialIndex];if(W&&W.visible){const Y=S(E,W,N,I);E.onBeforeShadow(s,E,x,M,R,Y,O),s.renderBufferDirect(M,null,R,Y,E,O),E.onAfterShadow(s,E,x,M,R,Y,O)}}}else if(k.visible){const U=S(E,k,N,I);E.onBeforeShadow(s,E,x,M,R,U,null),s.renderBufferDirect(M,null,R,U,E,null),E.onAfterShadow(s,E,x,M,R,U,null)}}const L=E.children;for(let R=0,k=L.length;R<k;R++)v(L[R],x,M,N,P,I)}function w(E){E.target.removeEventListener("dispose",w);for(const M in l){const N=l[M],P=E.target.uuid;P in N&&(N[P].dispose(),delete N[P])}}}function d_(s,e){function t(){let z=!1;const ie=new St;let $=null;const Se=new St(0,0,0,0);return{setMask:function(_e){$!==_e&&!z&&(s.colorMask(_e,_e,_e,_e),$=_e)},setLocked:function(_e){z=_e},setClear:function(_e,ve,qe,at,ge){ge===!0&&(_e*=at,ve*=at,qe*=at),ie.set(_e,ve,qe,at),Se.equals(ie)===!1&&(s.clearColor(_e,ve,qe,at),Se.copy(ie))},reset:function(){z=!1,$=null,Se.set(-1,0,0,0)}}}function n(){let z=!1,ie=!1,$=null,Se=null,_e=null;return{setReversed:function(ve){if(ie!==ve){const qe=e.get("EXT_clip_control");ve?qe.clipControlEXT(qe.LOWER_LEFT_EXT,qe.ZERO_TO_ONE_EXT):qe.clipControlEXT(qe.LOWER_LEFT_EXT,qe.NEGATIVE_ONE_TO_ONE_EXT),ie=ve;const at=_e;_e=null,this.setClear(at)}},getReversed:function(){return ie},setTest:function(ve){ve?Q(s.DEPTH_TEST):De(s.DEPTH_TEST)},setMask:function(ve){$!==ve&&!z&&(s.depthMask(ve),$=ve)},setFunc:function(ve){if(ie&&(ve=Wu[ve]),Se!==ve){switch(ve){case yo:s.depthFunc(s.NEVER);break;case Mo:s.depthFunc(s.ALWAYS);break;case So:s.depthFunc(s.LESS);break;case $s:s.depthFunc(s.LEQUAL);break;case wo:s.depthFunc(s.EQUAL);break;case Eo:s.depthFunc(s.GEQUAL);break;case To:s.depthFunc(s.GREATER);break;case Ao:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}Se=ve}},setLocked:function(ve){z=ve},setClear:function(ve){_e!==ve&&(_e=ve,ie&&(ve=1-ve),s.clearDepth(ve))},reset:function(){z=!1,$=null,Se=null,_e=null,ie=!1}}}function i(){let z=!1,ie=null,$=null,Se=null,_e=null,ve=null,qe=null,at=null,ge=null;return{setTest:function(Xe){z||(Xe?Q(s.STENCIL_TEST):De(s.STENCIL_TEST))},setMask:function(Xe){ie!==Xe&&!z&&(s.stencilMask(Xe),ie=Xe)},setFunc:function(Xe,nt,Pe){($!==Xe||Se!==nt||_e!==Pe)&&(s.stencilFunc(Xe,nt,Pe),$=Xe,Se=nt,_e=Pe)},setOp:function(Xe,nt,Pe){(ve!==Xe||qe!==nt||at!==Pe)&&(s.stencilOp(Xe,nt,Pe),ve=Xe,qe=nt,at=Pe)},setLocked:function(Xe){z=Xe},setClear:function(Xe){ge!==Xe&&(s.clearStencil(Xe),ge=Xe)},reset:function(){z=!1,ie=null,$=null,Se=null,_e=null,ve=null,qe=null,at=null,ge=null}}}const a=new t,r=new n,o=new i;let c={};const l=new WeakMap;let h={},d={},u={},f=new WeakMap,p=[],b=null,g=!1,m=null,_=null,S=null,v=null,w=null,E=null,x=null,M=new me(0,0,0),N=0,P=!1,I=null,D=null,L=null,R=null,k=null;const U=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let F=!1,V=0;const O=s.getParameter(s.VERSION);O.indexOf("WebGL")!==-1?(V=parseFloat(/^WebGL (\d)/.exec(O)[1]),F=V>=1):O.indexOf("OpenGL ES")!==-1&&(V=parseFloat(/^OpenGL ES (\d)/.exec(O)[1]),F=V>=2);let W=null,Y={};const j=s.getParameter(s.SCISSOR_BOX),ue=s.getParameter(s.VIEWPORT),H=new St().fromArray(j),Z=new St().fromArray(ue);function te(z,ie,$,Se){const _e=new Uint8Array(4),ve=s.createTexture();s.bindTexture(z,ve),s.texParameteri(z,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(z,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let qe=0;qe<$;qe++)z===s.TEXTURE_3D||z===s.TEXTURE_2D_ARRAY?s.texImage3D(ie,0,s.RGBA,1,1,Se,0,s.RGBA,s.UNSIGNED_BYTE,_e):s.texImage2D(ie+qe,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,_e);return ve}const he={};he[s.TEXTURE_2D]=te(s.TEXTURE_2D,s.TEXTURE_2D,1),he[s.TEXTURE_CUBE_MAP]=te(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),he[s.TEXTURE_2D_ARRAY]=te(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),he[s.TEXTURE_3D]=te(s.TEXTURE_3D,s.TEXTURE_3D,1,1),a.setClear(0,0,0,1),r.setClear(1),o.setClear(0),Q(s.DEPTH_TEST),r.setFunc($s),Ue(!1),se(tl),Q(s.CULL_FACE),Re(ds);function Q(z){h[z]!==!0&&(s.enable(z),h[z]=!0)}function De(z){h[z]!==!1&&(s.disable(z),h[z]=!1)}function Ye(z,ie){return u[z]!==ie?(s.bindFramebuffer(z,ie),u[z]=ie,z===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=ie),z===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=ie),!0):!1}function be(z,ie){let $=p,Se=!1;if(z){$=f.get(ie),$===void 0&&($=[],f.set(ie,$));const _e=z.textures;if($.length!==_e.length||$[0]!==s.COLOR_ATTACHMENT0){for(let ve=0,qe=_e.length;ve<qe;ve++)$[ve]=s.COLOR_ATTACHMENT0+ve;$.length=_e.length,Se=!0}}else $[0]!==s.BACK&&($[0]=s.BACK,Se=!0);Se&&s.drawBuffers($)}function Fe(z){return b!==z?(s.useProgram(z),b=z,!0):!1}const le={[os]:s.FUNC_ADD,[hu]:s.FUNC_SUBTRACT,[du]:s.FUNC_REVERSE_SUBTRACT};le[uu]=s.MIN,le[fu]=s.MAX;const fe={[pu]:s.ZERO,[mu]:s.ONE,[gu]:s.SRC_COLOR,[qh]:s.SRC_ALPHA,[Mu]:s.SRC_ALPHA_SATURATE,[vu]:s.DST_COLOR,[_u]:s.DST_ALPHA,[bu]:s.ONE_MINUS_SRC_COLOR,[Xh]:s.ONE_MINUS_SRC_ALPHA,[yu]:s.ONE_MINUS_DST_COLOR,[xu]:s.ONE_MINUS_DST_ALPHA,[Su]:s.CONSTANT_COLOR,[wu]:s.ONE_MINUS_CONSTANT_COLOR,[Eu]:s.CONSTANT_ALPHA,[Tu]:s.ONE_MINUS_CONSTANT_ALPHA};function Re(z,ie,$,Se,_e,ve,qe,at,ge,Xe){if(z===ds){g===!0&&(De(s.BLEND),g=!1);return}if(g===!1&&(Q(s.BLEND),g=!0),z!==lu){if(z!==m||Xe!==P){if((_!==os||w!==os)&&(s.blendEquation(s.FUNC_ADD),_=os,w=os),Xe)switch(z){case Ks:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case nl:s.blendFunc(s.ONE,s.ONE);break;case il:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case sl:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:Ze("WebGLState: Invalid blending: ",z);break}else switch(z){case Ks:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case nl:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case il:Ze("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case sl:Ze("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ze("WebGLState: Invalid blending: ",z);break}S=null,v=null,E=null,x=null,M.set(0,0,0),N=0,m=z,P=Xe}return}_e=_e||ie,ve=ve||$,qe=qe||Se,(ie!==_||_e!==w)&&(s.blendEquationSeparate(le[ie],le[_e]),_=ie,w=_e),($!==S||Se!==v||ve!==E||qe!==x)&&(s.blendFuncSeparate(fe[$],fe[Se],fe[ve],fe[qe]),S=$,v=Se,E=ve,x=qe),(at.equals(M)===!1||ge!==N)&&(s.blendColor(at.r,at.g,at.b,ge),M.copy(at),N=ge),m=z,P=!1}function ye(z,ie){z.side===Lt?De(s.CULL_FACE):Q(s.CULL_FACE);let $=z.side===rn;ie&&($=!$),Ue($),z.blending===Ks&&z.transparent===!1?Re(ds):Re(z.blending,z.blendEquation,z.blendSrc,z.blendDst,z.blendEquationAlpha,z.blendSrcAlpha,z.blendDstAlpha,z.blendColor,z.blendAlpha,z.premultipliedAlpha),r.setFunc(z.depthFunc),r.setTest(z.depthTest),r.setMask(z.depthWrite),a.setMask(z.colorWrite);const Se=z.stencilWrite;o.setTest(Se),Se&&(o.setMask(z.stencilWriteMask),o.setFunc(z.stencilFunc,z.stencilRef,z.stencilFuncMask),o.setOp(z.stencilFail,z.stencilZFail,z.stencilZPass)),je(z.polygonOffset,z.polygonOffsetFactor,z.polygonOffsetUnits),z.alphaToCoverage===!0?Q(s.SAMPLE_ALPHA_TO_COVERAGE):De(s.SAMPLE_ALPHA_TO_COVERAGE)}function Ue(z){I!==z&&(z?s.frontFace(s.CW):s.frontFace(s.CCW),I=z)}function se(z){z!==ru?(Q(s.CULL_FACE),z!==D&&(z===tl?s.cullFace(s.BACK):z===ou?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):De(s.CULL_FACE),D=z}function tt(z){z!==L&&(F&&s.lineWidth(z),L=z)}function je(z,ie,$){z?(Q(s.POLYGON_OFFSET_FILL),(R!==ie||k!==$)&&(R=ie,k=$,r.getReversed()&&(ie=-ie,$=-$),s.polygonOffset(ie,$))):De(s.POLYGON_OFFSET_FILL)}function ct(z){z?Q(s.SCISSOR_TEST):De(s.SCISSOR_TEST)}function st(z){z===void 0&&(z=s.TEXTURE0+U-1),W!==z&&(s.activeTexture(z),W=z)}function At(z,ie,$){$===void 0&&(W===null?$=s.TEXTURE0+U-1:$=W);let Se=Y[$];Se===void 0&&(Se={type:void 0,texture:void 0},Y[$]=Se),(Se.type!==z||Se.texture!==ie)&&(W!==$&&(s.activeTexture($),W=$),s.bindTexture(z,ie||he[z]),Se.type=z,Se.texture=ie)}function G(){const z=Y[W];z!==void 0&&z.type!==void 0&&(s.bindTexture(z.type,null),z.type=void 0,z.texture=void 0)}function Et(){try{s.compressedTexImage2D(...arguments)}catch(z){Ze("WebGLState:",z)}}function ft(){try{s.compressedTexImage3D(...arguments)}catch(z){Ze("WebGLState:",z)}}function bt(){try{s.texSubImage2D(...arguments)}catch(z){Ze("WebGLState:",z)}}function oe(){try{s.texSubImage3D(...arguments)}catch(z){Ze("WebGLState:",z)}}function $e(){try{s.compressedTexSubImage2D(...arguments)}catch(z){Ze("WebGLState:",z)}}function Ie(){try{s.compressedTexSubImage3D(...arguments)}catch(z){Ze("WebGLState:",z)}}function We(){try{s.texStorage2D(...arguments)}catch(z){Ze("WebGLState:",z)}}function C(){try{s.texStorage3D(...arguments)}catch(z){Ze("WebGLState:",z)}}function T(){try{s.texImage2D(...arguments)}catch(z){Ze("WebGLState:",z)}}function q(){try{s.texImage3D(...arguments)}catch(z){Ze("WebGLState:",z)}}function pe(z){return d[z]!==void 0?d[z]:s.getParameter(z)}function ae(z,ie){d[z]!==ie&&(s.pixelStorei(z,ie),d[z]=ie)}function xe(z){H.equals(z)===!1&&(s.scissor(z.x,z.y,z.z,z.w),H.copy(z))}function Te(z){Z.equals(z)===!1&&(s.viewport(z.x,z.y,z.z,z.w),Z.copy(z))}function ee(z,ie){let $=l.get(ie);$===void 0&&($=new WeakMap,l.set(ie,$));let Se=$.get(z);Se===void 0&&(Se=s.getUniformBlockIndex(ie,z.name),s.uniformBlockBinding(ie,Se,Se),$.set(z,Se))}function ne(z,ie,$){const _e=l.get(ie).get(z);c[_e]!==$&&(s.bindBufferBase(s.UNIFORM_BUFFER,_e,$),c[_e]=$)}function Me(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),r.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),s.pixelStorei(s.PACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_ALIGNMENT,4),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,s.BROWSER_DEFAULT_WEBGL),s.pixelStorei(s.PACK_ROW_LENGTH,0),s.pixelStorei(s.PACK_SKIP_PIXELS,0),s.pixelStorei(s.PACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_ROW_LENGTH,0),s.pixelStorei(s.UNPACK_IMAGE_HEIGHT,0),s.pixelStorei(s.UNPACK_SKIP_PIXELS,0),s.pixelStorei(s.UNPACK_SKIP_ROWS,0),s.pixelStorei(s.UNPACK_SKIP_IMAGES,0),h={},d={},W=null,Y={},u={},c={},f=new WeakMap,p=[],b=null,g=!1,m=null,_=null,S=null,v=null,w=null,E=null,x=null,M=new me(0,0,0),N=0,P=!1,I=null,D=null,L=null,R=null,k=null,H.set(0,0,s.canvas.width,s.canvas.height),Z.set(0,0,s.canvas.width,s.canvas.height),a.reset(),r.reset(),o.reset()}return{buffers:{color:a,depth:r,stencil:o},enable:Q,disable:De,bindFramebuffer:Ye,drawBuffers:be,useProgram:Fe,setBlending:Re,setMaterial:ye,setFlipSided:Ue,setCullFace:se,setLineWidth:tt,setPolygonOffset:je,setScissorTest:ct,activeTexture:st,bindTexture:At,unbindTexture:G,compressedTexImage2D:Et,compressedTexImage3D:ft,texImage2D:T,texImage3D:q,pixelStorei:ae,getParameter:pe,updateUBOMapping:ee,uniformBlockBinding:ne,texStorage2D:We,texStorage3D:C,texSubImage2D:bt,texSubImage3D:oe,compressedTexSubImage2D:$e,compressedTexSubImage3D:Ie,scissor:xe,viewport:Te,reset:Me}}function u_(s,e,t,n,i,a,r){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Ke,h=new WeakMap,d=new Set;let u;const f=new WeakMap,p=new Set,b=new FinalizationRegistry(C=>p.delete(C));let g=!1;try{g=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(C,T){return g?new OffscreenCanvas(C,T):sa("canvas")}function _(C,T,q){let pe=1;const ae=We(C);if((ae.width>q||ae.height>q)&&(pe=q/Math.max(ae.width,ae.height)),pe<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const xe=Math.floor(pe*ae.width),Te=Math.floor(pe*ae.height);u===void 0&&(u=m(xe,Te));const ee=T?m(xe,Te):u;return ee.width=xe,ee.height=Te,ee.getContext("2d").drawImage(C,0,0,xe,Te),He("WebGLRenderer: Texture has been resized from ("+ae.width+"x"+ae.height+") to ("+xe+"x"+Te+")."),ee}else return"data"in C&&He("WebGLRenderer: Image in DataTexture is too big ("+ae.width+"x"+ae.height+")."),C;return C}function S(C){return C.generateMipmaps}function v(C){s.generateMipmap(C)}function w(C){return C.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:C.isWebGL3DRenderTarget?s.TEXTURE_3D:C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function E(C,T,q,pe,ae,xe=!1){if(C!==null){if(s[C]!==void 0)return s[C];He("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let Te;pe&&(Te=e.get("EXT_texture_norm16"),Te||He("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ee=T;if(T===s.RED&&(q===s.FLOAT&&(ee=s.R32F),q===s.HALF_FLOAT&&(ee=s.R16F),q===s.UNSIGNED_BYTE&&(ee=s.R8),q===s.UNSIGNED_SHORT&&Te&&(ee=Te.R16_EXT),q===s.SHORT&&Te&&(ee=Te.R16_SNORM_EXT)),T===s.RED_INTEGER&&(q===s.UNSIGNED_BYTE&&(ee=s.R8UI),q===s.UNSIGNED_SHORT&&(ee=s.R16UI),q===s.UNSIGNED_INT&&(ee=s.R32UI),q===s.BYTE&&(ee=s.R8I),q===s.SHORT&&(ee=s.R16I),q===s.INT&&(ee=s.R32I)),T===s.RG&&(q===s.FLOAT&&(ee=s.RG32F),q===s.HALF_FLOAT&&(ee=s.RG16F),q===s.UNSIGNED_BYTE&&(ee=s.RG8),q===s.UNSIGNED_SHORT&&Te&&(ee=Te.RG16_EXT),q===s.SHORT&&Te&&(ee=Te.RG16_SNORM_EXT)),T===s.RG_INTEGER&&(q===s.UNSIGNED_BYTE&&(ee=s.RG8UI),q===s.UNSIGNED_SHORT&&(ee=s.RG16UI),q===s.UNSIGNED_INT&&(ee=s.RG32UI),q===s.BYTE&&(ee=s.RG8I),q===s.SHORT&&(ee=s.RG16I),q===s.INT&&(ee=s.RG32I)),T===s.RGB_INTEGER&&(q===s.UNSIGNED_BYTE&&(ee=s.RGB8UI),q===s.UNSIGNED_SHORT&&(ee=s.RGB16UI),q===s.UNSIGNED_INT&&(ee=s.RGB32UI),q===s.BYTE&&(ee=s.RGB8I),q===s.SHORT&&(ee=s.RGB16I),q===s.INT&&(ee=s.RGB32I)),T===s.RGBA_INTEGER&&(q===s.UNSIGNED_BYTE&&(ee=s.RGBA8UI),q===s.UNSIGNED_SHORT&&(ee=s.RGBA16UI),q===s.UNSIGNED_INT&&(ee=s.RGBA32UI),q===s.BYTE&&(ee=s.RGBA8I),q===s.SHORT&&(ee=s.RGBA16I),q===s.INT&&(ee=s.RGBA32I)),T===s.RGB&&(q===s.UNSIGNED_SHORT&&Te&&(ee=Te.RGB16_EXT),q===s.SHORT&&Te&&(ee=Te.RGB16_SNORM_EXT),q===s.UNSIGNED_INT_5_9_9_9_REV&&(ee=s.RGB9_E5),q===s.UNSIGNED_INT_10F_11F_11F_REV&&(ee=s.R11F_G11F_B10F)),T===s.RGBA){const ne=xe?lr:lt.getTransfer(ae);q===s.FLOAT&&(ee=s.RGBA32F),q===s.HALF_FLOAT&&(ee=s.RGBA16F),q===s.UNSIGNED_BYTE&&(ee=ne===xt?s.SRGB8_ALPHA8:s.RGBA8),q===s.UNSIGNED_SHORT&&Te&&(ee=Te.RGBA16_EXT),q===s.SHORT&&Te&&(ee=Te.RGBA16_SNORM_EXT),q===s.UNSIGNED_SHORT_4_4_4_4&&(ee=s.RGBA4),q===s.UNSIGNED_SHORT_5_5_5_1&&(ee=s.RGB5_A1)}return(ee===s.R16F||ee===s.R32F||ee===s.RG16F||ee===s.RG32F||ee===s.RGBA16F||ee===s.RGBA32F)&&e.get("EXT_color_buffer_float"),ee}function x(C,T){let q;return C?T===null||T===Vn||T===gs?q=s.DEPTH24_STENCIL8:T===xn?q=s.DEPTH32F_STENCIL8:T===ea&&(q=s.DEPTH24_STENCIL8,He("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===Vn||T===gs?q=s.DEPTH_COMPONENT24:T===xn?q=s.DEPTH_COMPONENT32F:T===ea&&(q=s.DEPTH_COMPONENT16),q}function M(C,T){return S(C)===!0||C.isFramebufferTexture&&C.minFilter!==zt&&C.minFilter!==Kt?Math.log2(Math.max(T.width,T.height))+1:C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?T.mipmaps.length:1}function N(C){const T=new WeakRef(C);n.get(C).__ref=T,p.add(T),b.register(C,T,T)}function P(C){const T=n.get(C).__ref;T!==void 0&&(p.delete(T),b.unregister(T))}function I(C){L(C.target)}function D(C){R(C.target)}function L(C){C.removeEventListener("dispose",I),P(C),U(C),C.isVideoTexture&&h.delete(C),C.isHTMLTexture&&d.delete(C)}function R(C){C.removeEventListener("dispose",D),P(C),V(C)}function k(){for(const C of p){const T=C.deref();T!==void 0&&(T.isRenderTarget===!0?R(T):L(T))}p.clear(),d.clear()}function U(C){const T=n.get(C);if(T.__webglInit===void 0)return;const q=C.source,pe=f.get(q);if(pe){const ae=pe[T.__cacheKey];ae.usedTimes--,ae.usedTimes===0&&F(C),Object.keys(pe).length===0&&f.delete(q)}n.remove(C)}function F(C){const T=n.get(C);s.deleteTexture(T.__webglTexture);const q=C.source,pe=f.get(q);delete pe[T.__cacheKey],r.memory.textures--}function V(C){const T=n.get(C);T.__depthDisposeCallback&&T.__depthDisposeCallback();const q=C.depthTexture;if(q&&q.renderTarget===C&&L(q),C.isWebGLCubeRenderTarget)for(let ae=0;ae<6;ae++){if(Array.isArray(T.__webglFramebuffer[ae]))for(let xe=0;xe<T.__webglFramebuffer[ae].length;xe++)s.deleteFramebuffer(T.__webglFramebuffer[ae][xe]);else s.deleteFramebuffer(T.__webglFramebuffer[ae]);T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer[ae])}else{if(Array.isArray(T.__webglFramebuffer))for(let ae=0;ae<T.__webglFramebuffer.length;ae++)s.deleteFramebuffer(T.__webglFramebuffer[ae]);else s.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&s.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let ae=0;ae<T.__webglColorRenderbuffer.length;ae++)T.__webglColorRenderbuffer[ae]&&s.deleteRenderbuffer(T.__webglColorRenderbuffer[ae]);T.__webglDepthRenderbuffer&&s.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const pe=C.textures;for(let ae=0,xe=pe.length;ae<xe;ae++){const Te=n.get(pe[ae]);Te.__webglTexture&&(s.deleteTexture(Te.__webglTexture),r.memory.textures--),n.remove(pe[ae])}n.remove(C)}let O=0;function W(){O=0}function Y(){return O}function j(C){O=C}function ue(){const C=O;return C>=i.maxTextures&&He("WebGLTextures: Trying to use "+(C+1)+" texture units while this GPU supports only "+i.maxTextures),O+=1,C}function H(C){const T=[];return T.push(C.wrapS),T.push(C.wrapT),T.push(C.wrapR||0),T.push(C.magFilter),T.push(C.minFilter),T.push(C.anisotropy),T.push(C.internalFormat),T.push(C.format),T.push(C.type),T.push(C.generateMipmaps),T.push(C.mipmapsAutoUpdate),T.push(C.premultiplyAlpha),T.push(C.flipY),T.push(C.unpackAlignment),T.push(C.colorSpace),T.join()}function Z(C,T){const q=n.get(C);if(C.isVideoTexture&&$e(C),C.isRenderTargetTexture===!1&&C.isExternalTexture!==!0&&C.version>0&&q.__version!==C.version){const pe=C.image;if(pe===null)He("WebGLRenderer: Texture marked for update but no image data found.");else if(pe.complete===!1)He("WebGLRenderer: Texture marked for update but image is incomplete");else{ye(q,C,T);return}}else C.isExternalTexture&&(q.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,q.__webglTexture,s.TEXTURE0+T)}function te(C,T){const q=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&q.__version!==C.version){ye(q,C,T);return}else C.isExternalTexture&&(q.__webglTexture=C.sourceTexture?C.sourceTexture:null);t.bindTexture(s.TEXTURE_2D_ARRAY,q.__webglTexture,s.TEXTURE0+T)}function he(C,T){const q=n.get(C);if(C.isRenderTargetTexture===!1&&C.version>0&&q.__version!==C.version){ye(q,C,T);return}t.bindTexture(s.TEXTURE_3D,q.__webglTexture,s.TEXTURE0+T)}function Q(C,T){const q=n.get(C);if(C.version>0&&q.__version!==C.version){Ue(q,C,T);return}t.bindTexture(s.TEXTURE_CUBE_MAP,q.__webglTexture,s.TEXTURE0+T)}const De={[Gi]:s.REPEAT,[zn]:s.CLAMP_TO_EDGE,[rr]:s.MIRRORED_REPEAT},Ye={[zt]:s.NEAREST,[td]:s.NEAREST_MIPMAP_NEAREST,[Vs]:s.NEAREST_MIPMAP_LINEAR,[Kt]:s.LINEAR,[Qa]:s.LINEAR_MIPMAP_NEAREST,[Bn]:s.LINEAR_MIPMAP_LINEAR},be={[Fu]:s.NEVER,[dd]:s.ALWAYS,[Uu]:s.LESS,[ld]:s.LEQUAL,[ku]:s.EQUAL,[hd]:s.GEQUAL,[Ou]:s.GREATER,[zu]:s.NOTEQUAL};function Fe(C,T){if(T.type===xn&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===Kt||T.magFilter===Qa||T.magFilter===Vs||T.magFilter===Bn||T.minFilter===Kt||T.minFilter===Qa||T.minFilter===Vs||T.minFilter===Bn)&&He("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(C,s.TEXTURE_WRAP_S,De[T.wrapS]),s.texParameteri(C,s.TEXTURE_WRAP_T,De[T.wrapT]),(C===s.TEXTURE_3D||C===s.TEXTURE_2D_ARRAY)&&s.texParameteri(C,s.TEXTURE_WRAP_R,De[T.wrapR]),s.texParameteri(C,s.TEXTURE_MAG_FILTER,Ye[T.magFilter]),s.texParameteri(C,s.TEXTURE_MIN_FILTER,Ye[T.minFilter]),T.compareFunction&&(s.texParameteri(C,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(C,s.TEXTURE_COMPARE_FUNC,be[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===zt||T.minFilter!==Vs&&T.minFilter!==Bn||T.type===xn&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){const q=e.get("EXT_texture_filter_anisotropic");s.texParameterf(C,q.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,i.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function le(C,T){let q=!1;C.__webglInit===void 0&&(C.__webglInit=!0,T.addEventListener("dispose",I),N(T));const pe=T.source;let ae=f.get(pe);ae===void 0&&(ae={},f.set(pe,ae));const xe=H(T);if(xe!==C.__cacheKey){ae[xe]===void 0&&(ae[xe]={texture:s.createTexture(),usedTimes:0},r.memory.textures++,q=!0),ae[xe].usedTimes++;const Te=ae[C.__cacheKey];Te!==void 0&&(ae[C.__cacheKey].usedTimes--,Te.usedTimes===0&&F(T)),C.__cacheKey=xe,C.__webglTexture=ae[xe].texture}return q}function fe(C,T,q){return Math.floor(Math.floor(C/q)/T)}function Re(C,T,q,pe){const xe=C.updateRanges;if(xe.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,T.width,T.height,q,pe,T.data);else{xe.sort((z,ie)=>z.start-ie.start);let Te=0;for(let z=1;z<xe.length;z++){const ie=xe[Te],$=xe[z],Se=ie.start+ie.count,_e=fe($.start,T.width,4),ve=fe(ie.start,T.width,4);$.start<=Se+1&&_e===ve&&fe($.start+$.count-1,T.width,4)===_e?ie.count=Math.max(ie.count,$.start+$.count-ie.start):(++Te,xe[Te]=$)}xe.length=Te+1;const ee=t.getParameter(s.UNPACK_ROW_LENGTH),ne=t.getParameter(s.UNPACK_SKIP_PIXELS),Me=t.getParameter(s.UNPACK_SKIP_ROWS);t.pixelStorei(s.UNPACK_ROW_LENGTH,T.width);for(let z=0,ie=xe.length;z<ie;z++){const $=xe[z],Se=Math.floor($.start/4),_e=Math.ceil($.count/4),ve=Se%T.width,qe=Math.floor(Se/T.width),at=_e,ge=1;t.pixelStorei(s.UNPACK_SKIP_PIXELS,ve),t.pixelStorei(s.UNPACK_SKIP_ROWS,qe),t.texSubImage2D(s.TEXTURE_2D,0,ve,qe,at,ge,q,pe,T.data)}C.clearUpdateRanges(),t.pixelStorei(s.UNPACK_ROW_LENGTH,ee),t.pixelStorei(s.UNPACK_SKIP_PIXELS,ne),t.pixelStorei(s.UNPACK_SKIP_ROWS,Me)}}function ye(C,T,q){let pe=s.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(pe=s.TEXTURE_2D_ARRAY),T.isData3DTexture&&(pe=s.TEXTURE_3D);const ae=le(C,T),xe=T.source;t.bindTexture(pe,C.__webglTexture,s.TEXTURE0+q);const Te=n.get(xe);if(xe.version!==Te.__version||ae===!0){if(t.activeTexture(s.TEXTURE0+q),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const ge=lt.getPrimaries(lt.workingColorSpace),Xe=T.colorSpace===bi?null:lt.getPrimaries(T.colorSpace),nt=T.colorSpace===bi||ge===Xe?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,nt)}t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment);let ne=_(T.image,!1,i.maxTextureSize);ne=Ie(T,ne);const Me=a.convert(T.format,T.colorSpace),z=a.convert(T.type);let ie=E(T.internalFormat,Me,z,T.normalized,T.colorSpace,T.isVideoTexture);Fe(pe,T);let $;const Se=T.mipmaps,_e=T.isVideoTexture!==!0,ve=Te.__version===void 0||ae===!0,qe=xe.dataReady,at=M(T,ne);if(T.isDepthTexture)ie=x(T.format===_i,T.type),ve&&(_e?t.texStorage2D(s.TEXTURE_2D,1,ie,ne.width,ne.height):t.texImage2D(s.TEXTURE_2D,0,ie,ne.width,ne.height,0,Me,z,null));else if(T.isDataTexture)if(Se.length>0){_e&&ve&&t.texStorage2D(s.TEXTURE_2D,at,ie,Se[0].width,Se[0].height);for(let ge=0,Xe=Se.length;ge<Xe;ge++)$=Se[ge],_e?qe&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,$.width,$.height,Me,z,$.data):t.texImage2D(s.TEXTURE_2D,ge,ie,$.width,$.height,0,Me,z,$.data);T.generateMipmaps=!1}else _e?(ve&&t.texStorage2D(s.TEXTURE_2D,at,ie,ne.width,ne.height),qe&&Re(T,ne,Me,z)):t.texImage2D(s.TEXTURE_2D,0,ie,ne.width,ne.height,0,Me,z,ne.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){_e&&ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,at,ie,Se[0].width,Se[0].height,ne.depth);for(let ge=0,Xe=Se.length;ge<Xe;ge++)if($=Se[ge],T.format!==En)if(Me!==null)if(_e){if(qe)if(T.layerUpdates.size>0){const nt=nh($.width,$.height,T.format,T.type);for(const Pe of T.layerUpdates){const _t=$.data.subarray(Pe*nt/$.data.BYTES_PER_ELEMENT,(Pe+1)*nt/$.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,Pe,$.width,$.height,1,Me,_t)}}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,0,$.width,$.height,ne.depth,Me,$.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,ge,ie,$.width,$.height,ne.depth,0,$.data,0,0);else He("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else _e?qe&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,ge,0,0,0,$.width,$.height,ne.depth,Me,z,$.data):t.texImage3D(s.TEXTURE_2D_ARRAY,ge,ie,$.width,$.height,ne.depth,0,Me,z,$.data);T.layerUpdates.size>0&&T.clearLayerUpdates()}else{_e&&ve&&t.texStorage2D(s.TEXTURE_2D,at,ie,Se[0].width,Se[0].height);for(let ge=0,Xe=Se.length;ge<Xe;ge++)$=Se[ge],T.format!==En?Me!==null?_e?qe&&t.compressedTexSubImage2D(s.TEXTURE_2D,ge,0,0,$.width,$.height,Me,$.data):t.compressedTexImage2D(s.TEXTURE_2D,ge,ie,$.width,$.height,0,$.data):He("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):_e?qe&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,$.width,$.height,Me,z,$.data):t.texImage2D(s.TEXTURE_2D,ge,ie,$.width,$.height,0,Me,z,$.data)}else if(T.isDataArrayTexture)if(_e){if(ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,at,ie,ne.width,ne.height,ne.depth),qe)if(T.layerUpdates.size>0){const ge=nh(ne.width,ne.height,T.format,T.type);for(const Xe of T.layerUpdates){const nt=ne.data.subarray(Xe*ge/ne.data.BYTES_PER_ELEMENT,(Xe+1)*ge/ne.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Xe,ne.width,ne.height,1,Me,z,nt)}T.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ne.width,ne.height,ne.depth,Me,z,ne.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,ie,ne.width,ne.height,ne.depth,0,Me,z,ne.data);else if(T.isData3DTexture)_e?(ve&&t.texStorage3D(s.TEXTURE_3D,at,ie,ne.width,ne.height,ne.depth),qe&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ne.width,ne.height,ne.depth,Me,z,ne.data)):t.texImage3D(s.TEXTURE_3D,0,ie,ne.width,ne.height,ne.depth,0,Me,z,ne.data);else if(T.isFramebufferTexture){if(ve)if(_e)t.texStorage2D(s.TEXTURE_2D,at,ie,ne.width,ne.height);else{let ge=ne.width,Xe=ne.height;for(let nt=0;nt<at;nt++)t.texImage2D(s.TEXTURE_2D,nt,ie,ge,Xe,0,Me,z,null),ge>>=1,Xe>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in s){const ge=s.canvas;if(ge.hasAttribute("layoutsubtree")||ge.setAttribute("layoutsubtree","true"),ne.parentNode!==ge){ge.appendChild(ne),d.add(T),ge.onpaint=Xe=>{const nt=Xe.changedElements;for(const Pe of d)nt.includes(Pe.image)&&(Pe.needsUpdate=!0)},ge.requestPaint();return}if(s.texElementImage2D.length===3)s.texElementImage2D(s.TEXTURE_2D,s.RGBA8,ne);else{const nt=s.RGBA,Pe=s.RGBA,_t=s.UNSIGNED_BYTE;s.texElementImage2D(s.TEXTURE_2D,0,nt,Pe,_t,ne)}s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)}}else if(Se.length>0){if(_e&&ve){const ge=We(Se[0]);t.texStorage2D(s.TEXTURE_2D,at,ie,ge.width,ge.height)}for(let ge=0,Xe=Se.length;ge<Xe;ge++)$=Se[ge],_e?qe&&t.texSubImage2D(s.TEXTURE_2D,ge,0,0,Me,z,$):t.texImage2D(s.TEXTURE_2D,ge,ie,Me,z,$);T.generateMipmaps=!1}else if(_e){if(ve){const ge=We(ne);t.texStorage2D(s.TEXTURE_2D,at,ie,ge.width,ge.height)}qe&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,Me,z,ne)}else t.texImage2D(s.TEXTURE_2D,0,ie,Me,z,ne);S(T)&&T.mipmapsAutoUpdate===!0&&v(pe),Te.__version=xe.version,T.onUpdate&&T.onUpdate(T)}C.__version=T.version}function Ue(C,T,q){if(T.image.length!==6)return;const pe=le(C,T),ae=T.source;t.bindTexture(s.TEXTURE_CUBE_MAP,C.__webglTexture,s.TEXTURE0+q);const xe=n.get(ae);if(ae.version!==xe.__version||pe===!0){t.activeTexture(s.TEXTURE0+q);const Te=lt.getPrimaries(lt.workingColorSpace),ee=T.colorSpace===bi?null:lt.getPrimaries(T.colorSpace),ne=T.colorSpace===bi||Te===ee?s.NONE:s.BROWSER_DEFAULT_WEBGL;t.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,ne);const Me=T.isCompressedTexture||T.image[0].isCompressedTexture,z=T.image[0]&&T.image[0].isDataTexture,ie=[];for(let Pe=0;Pe<6;Pe++)!Me&&!z?ie[Pe]=_(T.image[Pe],!0,i.maxCubemapSize):ie[Pe]=z?T.image[Pe].image:T.image[Pe],ie[Pe]=Ie(T,ie[Pe]);const $=ie[0],Se=a.convert(T.format,T.colorSpace),_e=a.convert(T.type);let ve=E(T.internalFormat,Se,_e,T.normalized,T.colorSpace);const qe=T.isVideoTexture!==!0,at=xe.__version===void 0||pe===!0,ge=ae.dataReady;let Xe=M(T,$);Fe(s.TEXTURE_CUBE_MAP,T);let nt;if(T.isDepthTexture){if(ve=x(T.format===_i,T.type),at)if(qe)t.texStorage2D(s.TEXTURE_CUBE_MAP,1,ve,$.width,$.height);else for(let Pe=0;Pe<6;Pe++)t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,ve,$.width,$.height,0,Se,_e,null)}else if(Me){qe&&at&&t.texStorage2D(s.TEXTURE_CUBE_MAP,Xe,ve,$.width,$.height);for(let Pe=0;Pe<6;Pe++){nt=ie[Pe].mipmaps;for(let _t=0;_t<nt.length;_t++){const Vt=nt[_t];T.format!==En?Se!==null?qe?ge&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t,0,0,Vt.width,Vt.height,Se,Vt.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t,ve,Vt.width,Vt.height,0,Vt.data):He("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):qe?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t,0,0,Vt.width,Vt.height,Se,_e,Vt.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t,ve,Vt.width,Vt.height,0,Se,_e,Vt.data)}}}else{if(nt=T.mipmaps,qe&&at){nt.length>0&&Xe++;const Pe=We(ie[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,Xe,ve,Pe.width,Pe.height)}for(let Pe=0;Pe<6;Pe++)if(z){qe?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,0,0,ie[Pe].width,ie[Pe].height,Se,_e,ie[Pe].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,ve,ie[Pe].width,ie[Pe].height,0,Se,_e,ie[Pe].data);for(let _t=0;_t<nt.length;_t++){const oi=nt[_t].image[Pe].image;qe?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t+1,0,0,oi.width,oi.height,Se,_e,oi.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t+1,ve,oi.width,oi.height,0,Se,_e,oi.data)}}else{qe?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,0,0,Se,_e,ie[Pe]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,0,ve,Se,_e,ie[Pe]);for(let _t=0;_t<nt.length;_t++){const Vt=nt[_t];qe?ge&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t+1,0,0,Se,_e,Vt.image[Pe]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Pe,_t+1,ve,Se,_e,Vt.image[Pe])}}}S(T)&&T.mipmapsAutoUpdate===!0&&v(s.TEXTURE_CUBE_MAP),xe.__version=ae.version,T.onUpdate&&T.onUpdate(T)}C.__version=T.version}function se(C,T,q,pe,ae,xe){const Te=a.convert(q.format,q.colorSpace),ee=a.convert(q.type),ne=E(q.internalFormat,Te,ee,q.normalized,q.colorSpace),Me=n.get(T),z=n.get(q);if(z.__renderTarget=T,!Me.__hasExternalTextures){const ie=Math.max(1,T.width>>xe),$=Math.max(1,T.height>>xe);ae===s.TEXTURE_3D||ae===s.TEXTURE_2D_ARRAY?t.texImage3D(ae,xe,ne,ie,$,T.depth,0,Te,ee,null):t.texImage2D(ae,xe,ne,ie,$,0,Te,ee,null)}t.bindFramebuffer(s.FRAMEBUFFER,C),oe(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,pe,ae,z.__webglTexture,0,bt(T)):(ae===s.TEXTURE_2D||ae>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&ae<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,pe,ae,z.__webglTexture,xe),t.bindFramebuffer(s.FRAMEBUFFER,null)}function tt(C,T,q){if(s.bindRenderbuffer(s.RENDERBUFFER,C),T.depthBuffer){const pe=T.depthTexture,ae=pe&&pe.isDepthTexture?pe.type:null,xe=x(T.stencilBuffer,ae),Te=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;oe(T)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,bt(T),xe,T.width,T.height):q?s.renderbufferStorageMultisample(s.RENDERBUFFER,bt(T),xe,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,xe,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Te,s.RENDERBUFFER,C)}else{const pe=T.textures;for(let ae=0;ae<pe.length;ae++){const xe=pe[ae],Te=a.convert(xe.format,xe.colorSpace),ee=a.convert(xe.type),ne=E(xe.internalFormat,Te,ee,xe.normalized,xe.colorSpace);oe(T)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,bt(T),ne,T.width,T.height):q?s.renderbufferStorageMultisample(s.RENDERBUFFER,bt(T),ne,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,ne,T.width,T.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function je(C,T,q){const pe=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(s.FRAMEBUFFER,C),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ae=n.get(T.depthTexture);ae.__renderTarget=T;const xe=pe?T.depthTexture.image[0]:T.depthTexture.image;(!ae.__webglTexture||xe.width!==T.width||xe.height!==T.height)&&(xe.width=T.width,xe.height=T.height,T.depthTexture.needsUpdate=!0),pe?Q(T.depthTexture,0):Z(T.depthTexture,0);const Te=ae.__webglTexture,ee=bt(T),ne=pe?s.TEXTURE_CUBE_MAP_POSITIVE_X+q:s.TEXTURE_2D,Me=T.depthTexture.format===_i?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;if(T.depthTexture.format===Mi)oe(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Me,ne,Te,0,ee):s.framebufferTexture2D(s.FRAMEBUFFER,Me,ne,Te,0);else if(T.depthTexture.format===_i)oe(T)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Me,ne,Te,0,ee):s.framebufferTexture2D(s.FRAMEBUFFER,Me,ne,Te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ct(C){const T=n.get(C),q=C.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==C.depthTexture){const pe=C.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),pe){const ae=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,pe.removeEventListener("dispose",ae)};pe.addEventListener("dispose",ae),T.__depthDisposeCallback=ae}T.__boundDepthTexture=pe}if(C.depthTexture&&!T.__autoAllocateDepthBuffer)if(q)for(let pe=0;pe<6;pe++)je(T.__webglFramebuffer[pe],C,pe);else C.texture.mipmaps.length>0?je(T.__webglFramebuffer[0],C,0):je(T.__webglFramebuffer,C,0);else if(q){T.__webglDepthbuffer=[];for(let pe=0;pe<6;pe++)if(t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[pe]),T.__webglDepthbuffer[pe]===void 0)T.__webglDepthbuffer[pe]=s.createRenderbuffer(),tt(T.__webglDepthbuffer[pe],C,!1);else{const ae=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,xe=T.__webglDepthbuffer[pe];s.bindRenderbuffer(s.RENDERBUFFER,xe),s.framebufferRenderbuffer(s.FRAMEBUFFER,ae,s.RENDERBUFFER,xe)}}else if(C.texture.mipmaps.length>0?t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=s.createRenderbuffer(),tt(T.__webglDepthbuffer,C,!1);else{const ae=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,xe=T.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,xe),s.framebufferRenderbuffer(s.FRAMEBUFFER,ae,s.RENDERBUFFER,xe)}t.bindFramebuffer(s.FRAMEBUFFER,null)}function st(C,T,q){const pe=n.get(C);T!==void 0&&se(pe.__webglFramebuffer,C,C.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),q!==void 0&&ct(C)}function At(C){const T=C.texture,q=n.get(C),pe=n.get(T);C.addEventListener("dispose",D),N(C);const ae=C.textures,xe=C.isWebGLCubeRenderTarget===!0,Te=ae.length>1;if(Te||(pe.__webglTexture===void 0&&(pe.__webglTexture=s.createTexture()),pe.__version=T.version,r.memory.textures++),xe){q.__webglFramebuffer=[];for(let ee=0;ee<6;ee++)if(T.mipmaps.length>0){q.__webglFramebuffer[ee]=[];for(let ne=0;ne<T.mipmaps.length;ne++)q.__webglFramebuffer[ee][ne]=s.createFramebuffer()}else q.__webglFramebuffer[ee]=s.createFramebuffer()}else{if(T.mipmaps.length>0){q.__webglFramebuffer=[];for(let ee=0;ee<T.mipmaps.length;ee++)q.__webglFramebuffer[ee]=s.createFramebuffer()}else q.__webglFramebuffer=s.createFramebuffer();if(Te)for(let ee=0,ne=ae.length;ee<ne;ee++){const Me=n.get(ae[ee]);Me.__webglTexture===void 0&&(Me.__webglTexture=s.createTexture(),r.memory.textures++)}if(C.samples>0&&oe(C)===!1){q.__webglMultisampledFramebuffer=s.createFramebuffer(),q.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,q.__webglMultisampledFramebuffer);for(let ee=0;ee<ae.length;ee++){const ne=ae[ee];q.__webglColorRenderbuffer[ee]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,q.__webglColorRenderbuffer[ee]);const Me=a.convert(ne.format,ne.colorSpace),z=a.convert(ne.type),ie=E(ne.internalFormat,Me,z,ne.normalized,ne.colorSpace,C.isXRRenderTarget===!0),$=bt(C);s.renderbufferStorageMultisample(s.RENDERBUFFER,$,ie,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ee,s.RENDERBUFFER,q.__webglColorRenderbuffer[ee])}s.bindRenderbuffer(s.RENDERBUFFER,null),C.depthBuffer&&(q.__webglDepthRenderbuffer=s.createRenderbuffer(),tt(q.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(xe){t.bindTexture(s.TEXTURE_CUBE_MAP,pe.__webglTexture),Fe(s.TEXTURE_CUBE_MAP,T);for(let ee=0;ee<6;ee++)if(T.mipmaps.length>0)for(let ne=0;ne<T.mipmaps.length;ne++)se(q.__webglFramebuffer[ee][ne],C,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ne);else se(q.__webglFramebuffer[ee],C,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0);S(T)?v(s.TEXTURE_CUBE_MAP):T.mipmaps.length>0&&s.texParameteri(s.TEXTURE_CUBE_MAP,s.TEXTURE_MAX_LEVEL,T.mipmaps.length-1),t.unbindTexture()}else if(Te){for(let ee=0,ne=ae.length;ee<ne;ee++){const Me=ae[ee],z=n.get(Me);let ie=s.TEXTURE_2D;(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ie=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ie,z.__webglTexture),Fe(ie,Me),se(q.__webglFramebuffer,C,Me,s.COLOR_ATTACHMENT0+ee,ie,0),S(Me)&&v(ie)}t.unbindTexture()}else{let ee=s.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(ee=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ee,pe.__webglTexture),Fe(ee,T),T.mipmaps.length>0)for(let ne=0;ne<T.mipmaps.length;ne++)se(q.__webglFramebuffer[ne],C,T,s.COLOR_ATTACHMENT0,ee,ne);else se(q.__webglFramebuffer,C,T,s.COLOR_ATTACHMENT0,ee,0);S(T)?v(ee):T.mipmaps.length>0&&s.texParameteri(ee,s.TEXTURE_MAX_LEVEL,T.mipmaps.length-1),t.unbindTexture()}C.depthBuffer&&ct(C)}function G(C){const T=C.textures;for(let q=0,pe=T.length;q<pe;q++){const ae=T[q];if(S(ae)&&ae.mipmapsAutoUpdate===!0){const xe=w(C),Te=n.get(ae).__webglTexture;t.bindTexture(xe,Te),v(xe),t.unbindTexture()}}}const Et=[];function ft(C){if(C.samples>0){if(oe(C)===!1){const T=C.textures,q=C.width,pe=C.height;let ae=s.COLOR_BUFFER_BIT;const xe=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Te=n.get(C),ee=T.length>1;if(ee)for(let Me=0;Me<T.length;Me++)t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Me,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Me,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer),C.texture.mipmaps.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let Me=0;Me<T.length;Me++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(ae|=s.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(ae|=s.STENCIL_BUFFER_BIT)),ee){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Te.__webglColorRenderbuffer[Me]);const z=n.get(T[Me]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,z,0)}s.blitFramebuffer(0,0,q,pe,0,0,q,pe,ae,s.NEAREST),c===!0&&(Et.length=0,Et.push(s.COLOR_ATTACHMENT0+Me),C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&Et.push(xe),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,Et))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),ee)for(let Me=0;Me<T.length;Me++){t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Me,s.RENDERBUFFER,Te.__webglColorRenderbuffer[Me]);const z=n.get(T[Me]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Me,s.TEXTURE_2D,z,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.storeMultisampledDepthBuffer===!1&&c){const T=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[T])}}}function bt(C){return Math.min(i.maxSamples,C.samples)}function oe(C){const T=n.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function $e(C){const T=r.render.frame;h.get(C)!==T&&(h.set(C,T),C.update())}function Ie(C,T){const q=C.colorSpace,pe=C.format,ae=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||q!==pn&&q!==bi&&(lt.getTransfer(q)===xt?(pe!==En||ae!==un)&&He("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ze("WebGLTextures: Unsupported texture color space:",q)),T}function We(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(l.width=C.naturalWidth||C.width,l.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(l.width=C.displayWidth,l.height=C.displayHeight):(l.width=C.width,l.height=C.height),l}this.allocateTextureUnit=ue,this.resetTextureUnits=W,this.getTextureUnits=Y,this.setTextureUnits=j,this.setTexture2D=Z,this.setTexture2DArray=te,this.setTexture3D=he,this.setTextureCube=Q,this.rebindTextures=st,this.setupRenderTarget=At,this.updateRenderTargetMipmap=G,this.updateMultisampleRenderTarget=ft,this.setupDepthRenderbuffer=ct,this.setupFrameBufferTexture=se,this.useMultisampledRTT=oe,this.dispose=k}function f_(s,e){function t(n,i=bi){let a;const r=lt.getTransfer(i);if(n===un)return s.UNSIGNED_BYTE;if(n===bc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===_c)return s.UNSIGNED_SHORT_5_5_5_1;if(n===sd)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===ad)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===nd)return s.BYTE;if(n===id)return s.SHORT;if(n===ea)return s.UNSIGNED_SHORT;if(n===gc)return s.INT;if(n===Vn)return s.UNSIGNED_INT;if(n===xn)return s.FLOAT;if(n===Wn)return s.HALF_FLOAT;if(n===rd)return s.ALPHA;if(n===od)return s.RGB;if(n===En)return s.RGBA;if(n===Mi)return s.DEPTH_COMPONENT;if(n===_i)return s.DEPTH_STENCIL;if(n===xc)return s.RED;if(n===vc)return s.RED_INTEGER;if(n===Hi)return s.RG;if(n===yc)return s.RG_INTEGER;if(n===Mc)return s.RGBA_INTEGER;if(n===er||n===tr||n===nr||n===ir)if(r===xt)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(n===er)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===tr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===nr)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ir)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(n===er)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===tr)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===nr)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ir)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ro||n===Po||n===Co||n===Lo)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(n===Ro)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Po)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Co)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Lo)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Do||n===Io||n===No||n===Fo||n===Uo||n===or||n===ko)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(n===Do||n===Io)return r===xt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(n===No)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC;if(n===Fo)return a.COMPRESSED_R11_EAC;if(n===Uo)return a.COMPRESSED_SIGNED_R11_EAC;if(n===or)return a.COMPRESSED_RG11_EAC;if(n===ko)return a.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Oo||n===zo||n===Bo||n===Go||n===Ho||n===Vo||n===Wo||n===qo||n===Xo||n===Ko||n===jo||n===Yo||n===Jo||n===Zo)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(n===Oo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===zo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Bo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Go)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Ho)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Vo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Wo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===qo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Xo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ko)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===jo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Yo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Jo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Zo)return r===xt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===$o||n===Qo||n===ec)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(n===$o)return r===xt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Qo)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ec)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===tc||n===nc||n===cr||n===ic)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(n===tc)return a.COMPRESSED_RED_RGTC1_EXT;if(n===nc)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===cr)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ic)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===gs?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const p_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,m_=`
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

}`;class g_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Md(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Si({vertexShader:p_,fragmentShader:m_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Nt(new yr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class b_ extends wi{constructor(e,t){super();const n=this;let i=null,a=1,r=null,o="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,p=null;const b=typeof XRWebGLBinding<"u",g=new g_,m={},_=t.getContextAttributes();let S=null,v=null;const w=[],E=[],x=new Ke;let M=null,N=null;const P=new ln;P.viewport=new St;const I=new ln;I.viewport=new St;const D=[P,I],L=new mp;let R=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(H){let Z=w[H];return Z===void 0&&(Z=new Ur,w[H]=Z),Z.getTargetRaySpace()},this.getControllerGrip=function(H){let Z=w[H];return Z===void 0&&(Z=new Ur,w[H]=Z),Z.getGripSpace()},this.getHand=function(H){let Z=w[H];return Z===void 0&&(Z=new Ur,w[H]=Z),Z.getHandSpace()};function U(H){const Z=E.indexOf(H.inputSource);if(Z===-1)return;const te=w[Z];te!==void 0&&(te.update(H.inputSource,H.frame,l||r),te.dispatchEvent({type:H.type,data:H.inputSource}))}function F(){i.removeEventListener("select",U),i.removeEventListener("selectstart",U),i.removeEventListener("selectend",U),i.removeEventListener("squeeze",U),i.removeEventListener("squeezestart",U),i.removeEventListener("squeezeend",U),i.removeEventListener("end",F),i.removeEventListener("inputsourceschange",V);for(let H=0;H<w.length;H++){const Z=E[H];Z!==null&&(E[H]=null,w[H].disconnect(Z))}R=null,k=null,g.reset();for(const H in m)delete m[H];if(e.setRenderTarget(S),f=null,u=null,d=null,i=null,v=null,ue.stop(),n.isPresenting=!1,e.setPixelRatio(M),e.setSize(x.width,x.height,!1),N!==null){const H=N.camera;H.fov=N.fov,H.zoom=N.zoom,H.updateProjectionMatrix(),N=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(H){a=H,n.isPresenting===!0&&He("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(H){o=H,n.isPresenting===!0&&He("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||r},this.setReferenceSpace=function(H){l=H},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&b&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return p},this.getSession=function(){return i},this.setSession=async function(H){if(i=H,i!==null){if(S=e.getRenderTarget(),i.addEventListener("select",U),i.addEventListener("selectstart",U),i.addEventListener("selectend",U),i.addEventListener("squeeze",U),i.addEventListener("squeezestart",U),i.addEventListener("squeezeend",U),i.addEventListener("end",F),i.addEventListener("inputsourceschange",V),_.xrCompatible!==!0&&await t.makeXRCompatible(),M=e.getPixelRatio(),e.getSize(x),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let te=null,he=null,Q=null;_.depth&&(Q=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,te=_.stencil?_i:Mi,he=_.stencil?gs:Vn);const De={colorFormat:t.RGBA8,depthFormat:Q,scaleFactor:a};d=this.getBinding(),u=d.createProjectionLayer(De),i.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),v=new Gn(u.textureWidth,u.textureHeight,{format:En,type:un,depthTexture:new _s(u.textureWidth,u.textureHeight,he,void 0,void 0,void 0,void 0,void 0,void 0,te),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1,storeMultisampledDepthBuffer:u.ignoreDepthValues===!1,storeMultisampledStencilBuffer:u.ignoreDepthValues===!1})}else{const te={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:a};f=new XRWebGLLayer(i,t,te),i.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new Gn(f.framebufferWidth,f.framebufferHeight,{format:En,type:un,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(c),l=null,r=await i.requestReferenceSpace(o),ue.setContext(i),ue.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function V(H){for(let Z=0;Z<H.removed.length;Z++){const te=H.removed[Z],he=E.indexOf(te);he>=0&&(E[he]=null,w[he].disconnect(te))}for(let Z=0;Z<H.added.length;Z++){const te=H.added[Z];let he=E.indexOf(te);if(he===-1){for(let De=0;De<w.length;De++)if(De>=E.length){E.push(te),he=De;break}else if(E[De]===null){E[De]=te,he=De;break}if(he===-1)break}const Q=w[he];Q&&Q.connect(te)}}function O(H,Z){Z===null?H.matrixWorld.copy(H.matrix):H.matrixWorld.multiplyMatrices(Z.matrixWorld,H.matrix),H.matrixWorldInverse.copy(H.matrixWorld).invert()}this.updateCamera=function(H){if(i===null)return;let Z=H.near,te=H.far;g.texture!==null&&(g.depthNear>0&&(Z=g.depthNear),g.depthFar>0&&(te=g.depthFar)),L.near=I.near=P.near=Z,L.far=I.far=P.far=te,(R!==L.near||k!==L.far)&&(i.updateRenderState({depthNear:L.near,depthFar:L.far}),R=L.near,k=L.far),L.layers.mask=H.layers.mask|6,P.layers.mask=L.layers.mask&-5,I.layers.mask=L.layers.mask&-3;const he=H.parent,Q=L.cameras;O(L,he);for(let De=0;De<Q.length;De++)O(Q[De],he);L.projectionMatrix.copy(P.projectionMatrix),L.projectionMatrixInverse.copy(P.projectionMatrixInverse),N===null&&H.isPerspectiveCamera&&(N={camera:H,fov:H.fov,zoom:H.zoom}),W(H,L,he)};function W(H,Z,te){te===null?H.matrix.copy(Z.matrixWorld):(H.matrix.copy(te.matrixWorld),H.matrix.invert(),H.matrix.multiply(Z.matrixWorld)),H.matrix.decompose(H.position,H.quaternion,H.scale),H.updateMatrixWorld(!0),H.projectionMatrix.copy(Z.projectionMatrix),H.projectionMatrixInverse.copy(Z.projectionMatrixInverse),H.isPerspectiveCamera&&(H.fov=bs*2*Math.atan(1/H.projectionMatrix.elements[5]),H.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(H){c=H,u!==null&&(u.fixedFoveation=H),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=H)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(L)},this.getCameraTexture=function(H){return m[H]};let Y=null;function j(H,Z){if(h=Z.getViewerPose(l||r),p=Z,h!==null){const te=h.views;f!==null&&(e.setRenderTargetFramebuffer(v,f.framebuffer),e.setRenderTarget(v));let he=!1;te.length!==L.cameras.length&&(L.cameras.length=0,he=!0);for(let be=0;be<te.length;be++){const Fe=te[be];let le=null;if(f!==null)le=f.getViewport(Fe);else{const Re=d.getViewSubImage(u,Fe);le=Re.viewport,be===0&&(e.setRenderTargetTextures(v,Re.colorTexture,Re.depthStencilTexture),e.setRenderTarget(v))}let fe=D[be];fe===void 0&&(fe=new ln,fe.layers.enable(be),fe.viewport=new St,D[be]=fe),fe.matrix.fromArray(Fe.transform.matrix),fe.matrix.decompose(fe.position,fe.quaternion,fe.scale),fe.projectionMatrix.fromArray(Fe.projectionMatrix),fe.projectionMatrixInverse.copy(fe.projectionMatrix).invert(),fe.viewport.set(le.x,le.y,le.width,le.height),be===0&&(L.matrix.copy(fe.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),he===!0&&L.cameras.push(fe)}const Q=i.enabledFeatures;if(Q&&Q.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&b){d=n.getBinding();const be=d.getDepthInformation(te[0]);be&&be.isValid&&be.texture&&g.init(be,i.renderState)}if(Q&&Q.includes("camera-access")&&b){e.state.unbindTexture(),d=n.getBinding();for(let be=0;be<te.length;be++){const Fe=te[be].camera;if(Fe){let le=m[Fe];le||(le=new Md,m[Fe]=le);const fe=d.getCameraImage(Fe);le.sourceTexture=fe}}}}for(let te=0;te<w.length;te++){const he=E[te],Q=w[te];he!==null&&Q!==void 0&&Q.update(he,Z,l||r)}Y&&Y(H,Z),Z.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Z}),p=null}const ue=new Cd;ue.setAnimationLoop(j),this.setAnimationLoop=function(H){Y=H},this.dispose=function(){}}}const __=new Ve,Bd=new Je;Bd.set(-1,0,0,0,1,0,0,0,1);function x_(s,e){function t(g,m){g.matrixAutoUpdate===!0&&g.updateMatrix(),m.value.copy(g.matrix)}function n(g,m){m.color.getRGB(g.fogColor.value,Sd(s)),m.isFog?(g.fogNear.value=m.near,g.fogFar.value=m.far):m.isFogExp2&&(g.fogDensity.value=m.density)}function i(g,m,_,S,v){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?a(g,m):m.isMeshLambertMaterial?(a(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(a(g,m),d(g,m)):m.isMeshPhongMaterial?(a(g,m),h(g,m),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(a(g,m),u(g,m),m.isMeshPhysicalMaterial&&f(g,m,v)):m.isMeshMatcapMaterial?(a(g,m),p(g,m)):m.isMeshDepthMaterial?a(g,m):m.isMeshDistanceMaterial?(a(g,m),b(g,m)):m.isMeshNormalMaterial?a(g,m):m.isLineBasicMaterial?(r(g,m),m.isLineDashedMaterial&&o(g,m)):m.isPointsMaterial?c(g,m,_,S):m.isSpriteMaterial?l(g,m):m.isShadowMaterial?(g.color.value.copy(m.color),g.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function a(g,m){g.opacity.value=m.opacity,m.color&&g.diffuse.value.copy(m.color),m.emissive&&g.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.bumpMap&&(g.bumpMap.value=m.bumpMap,t(m.bumpMap,g.bumpMapTransform),g.bumpScale.value=m.bumpScale,m.side===rn&&(g.bumpScale.value*=-1)),m.normalMap&&(g.normalMap.value=m.normalMap,t(m.normalMap,g.normalMapTransform),g.normalScale.value.copy(m.normalScale),m.side===rn&&g.normalScale.value.negate()),m.displacementMap&&(g.displacementMap.value=m.displacementMap,t(m.displacementMap,g.displacementMapTransform),g.displacementScale.value=m.displacementScale,g.displacementBias.value=m.displacementBias),m.emissiveMap&&(g.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,g.emissiveMapTransform)),m.specularMap&&(g.specularMap.value=m.specularMap,t(m.specularMap,g.specularMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest);const _=e.get(m),S=_.envMap,v=_.envMapRotation;S&&(g.envMap.value=S,g.envMapRotation.value.setFromMatrix4(__.makeRotationFromEuler(v)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Bd),g.reflectivity.value=m.reflectivity,g.ior.value=m.ior,g.refractionRatio.value=m.refractionRatio),m.lightMap&&(g.lightMap.value=m.lightMap,g.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,g.lightMapTransform)),m.aoMap&&(g.aoMap.value=m.aoMap,g.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,g.aoMapTransform))}function r(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform))}function o(g,m){g.dashSize.value=m.dashSize,g.totalSize.value=m.dashSize+m.gapSize,g.scale.value=m.scale}function c(g,m,_,S){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.size.value=m.size*_,g.scale.value=S*.5,m.map&&(g.map.value=m.map,t(m.map,g.uvTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function l(g,m){g.diffuse.value.copy(m.color),g.opacity.value=m.opacity,g.rotation.value=m.rotation,m.map&&(g.map.value=m.map,t(m.map,g.mapTransform)),m.alphaMap&&(g.alphaMap.value=m.alphaMap,t(m.alphaMap,g.alphaMapTransform)),m.alphaTest>0&&(g.alphaTest.value=m.alphaTest)}function h(g,m){g.specular.value.copy(m.specular),g.shininess.value=Math.max(m.shininess,1e-4)}function d(g,m){m.gradientMap&&(g.gradientMap.value=m.gradientMap)}function u(g,m){g.metalness.value=m.metalness,m.metalnessMap&&(g.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,g.metalnessMapTransform)),g.roughness.value=m.roughness,m.roughnessMap&&(g.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,g.roughnessMapTransform)),m.envMap&&(g.envMapIntensity.value=m.envMapIntensity)}function f(g,m,_){g.ior.value=m.ior,m.diffuseRoughness>0&&(g.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(g.diffuseRoughnessMap.value=m.diffuseRoughnessMap,t(m.diffuseRoughnessMap,g.diffuseRoughnessMapTransform))),m.sheen>0&&(g.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),g.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(g.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,g.sheenColorMapTransform)),m.sheenRoughnessMap&&(g.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,g.sheenRoughnessMapTransform))),m.clearcoat>0&&(g.clearcoat.value=m.clearcoat,g.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(g.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,g.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(g.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===rn&&g.clearcoatNormalScale.value.negate())),m.dispersion>0&&(g.dispersion.value=m.dispersion),m.retroreflectivity>0&&(g.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(g.iridescence.value=m.iridescence,g.iridescenceIOR.value=m.iridescenceIOR,g.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,g.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(g.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,g.iridescenceMapTransform)),m.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),m.transmission>0&&(g.transmission.value=m.transmission,g.transmissionSamplerMap.value=_.texture,g.transmissionSamplerSize.value.set(_.width,_.height),m.transmissionMap&&(g.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,g.transmissionMapTransform)),g.thickness.value=m.thickness,m.thicknessMap&&(g.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=m.attenuationDistance,g.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(g.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(g.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=m.specularIntensity,g.specularColor.value.copy(m.specularColor),m.specularColorMap&&(g.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,g.specularColorMapTransform)),m.specularIntensityMap&&(g.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,m){m.matcap&&(g.matcap.value=m.matcap)}function b(g,m){const _=e.get(m).light;g.referencePosition.value.setFromMatrixPosition(_.matrixWorld),g.nearDistance.value=_.shadow.camera.near,g.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function v_(s,e,t,n){let i={},a={};function r(_,S){const v=S.program;n.uniformBlockBinding(_,v,i[_.id])}function o(_,S){let v=i[_.id];v===void 0&&(p(_),v=c(_),i[_.id]=v,_.addEventListener("dispose",g));const w=S.program;n.updateUBOMapping(_,w);const E=e.render.frame;a[_.id]!==E&&(l(_),a[_.id]=E)}function c(_){const S=s.createBuffer(),v=_.__size,w=_.usage;return s.bindBuffer(s.UNIFORM_BUFFER,S),s.bufferData(s.UNIFORM_BUFFER,v,w),s.bindBuffer(s.UNIFORM_BUFFER,null),S}function l(_){const S=i[_.id],v=_.uniforms,w=_.__cache;s.bindBuffer(s.UNIFORM_BUFFER,S);for(let E=0,x=v.length;E<x;E++){const M=v[E];if(Array.isArray(M))for(let N=0,P=M.length;N<P;N++)h(M[N],E,N,w);else h(M,E,0,w)}s.bindBuffer(s.UNIFORM_BUFFER,null)}function h(_,S,v,w){if(u(_,S,v,w)===!0){const E=_.__offset,x=_.value;if(Array.isArray(x)){let M=0;for(let N=0;N<x.length;N++){const P=x[N],I=b(P,!0);d(P,_.__data,M),M+=I.storage/Float32Array.BYTES_PER_ELEMENT}}else d(x,_.__data,0);s.bufferSubData(s.UNIFORM_BUFFER,E,_.__data)}}function d(_,S,v){typeof _=="number"||typeof _=="boolean"?S[v]=_:_.isMatrix3?(S[v]=_.elements[0],S[v+1]=_.elements[1],S[v+2]=_.elements[2],S[v+3]=0,S[v+4]=_.elements[3],S[v+5]=_.elements[4],S[v+6]=_.elements[5],S[v+7]=0,S[v+8]=_.elements[6],S[v+9]=_.elements[7],S[v+10]=_.elements[8],S[v+11]=0):ArrayBuffer.isView(_)?S.set(_.subarray(0,S.length-v),v):_.toArray(S,v)}function u(_,S,v,w){const E=_.value,x=S+"_"+v;if(Array.isArray(E)){w[x]===void 0&&(w[x]=[]);const M=w[x];let N=!1;for(let P=0;P<E.length;P++)f(E[P],M,P)===!0&&(N=!0);return N}return f(E,w,x)}function f(_,S,v){if(S[v]===void 0)return typeof _=="number"||typeof _=="boolean"?S[v]=_:ArrayBuffer.isView(_)?S[v]=_.slice():S[v]=_.clone(),!0;{const w=S[v];if(typeof _=="number"||typeof _=="boolean"){if(w!==_)return S[v]=_,!0}else{if(ArrayBuffer.isView(_))return!0;if(w.equals(_)===!1)return w.copy(_),!0}}return!1}function p(_){const S=_.uniforms;let v=0;const w=16;for(let x=0,M=S.length;x<M;x++){const N=Array.isArray(S[x])?S[x]:[S[x]];for(let P=0,I=N.length;P<I;P++){const D=N[P],L=Array.isArray(D.value)?D.value:[D.value],R=Array.isArray(S[x])||Array.isArray(D.value);let k=v;for(let F=0,V=L.length;F<V;F++){const O=L[F],W=b(O,R),Y=v%w,j=Y%W.boundary,ue=Y+j;v+=j,ue!==0&&w-ue<W.storage&&(v+=w-ue),F===0&&(k=v),v+=W.storage}const U=D.type==="int"?Int32Array:D.type==="uint"?Uint32Array:Float32Array;D.__data=new U((v-k)/Float32Array.BYTES_PER_ELEMENT),D.__offset=k}}const E=v%w;return E>0&&(v+=w-E),_.__size=v,_.__cache={},this}function b(_,S){const v={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(v.boundary=4,v.storage=4):_.isVector2?(v.boundary=8,v.storage=8):_.isVector3||_.isColor?(v.boundary=16,v.storage=12):_.isVector4?(v.boundary=16,v.storage=16):_.isMatrix3?(v.boundary=16,v.storage=48):_.isMatrix4?(v.boundary=16,v.storage=64):_.isTexture?He("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(v.boundary=16,v.storage=_.byteLength):He("WebGLRenderer: Unsupported uniform value type.",_),S===!0&&(v.boundary=16,v.storage=Math.ceil(v.storage/16)*16),v}function g(_){const S=_.target;S.removeEventListener("dispose",g),s.deleteBuffer(i[S.id]),delete i[S.id],delete a[S.id]}function m(){for(const _ in i)s.deleteBuffer(i[_]);i={},a={}}return{bind:r,update:o,dispose:m}}const y_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let In=null;function M_(){return In===null&&(In=new xr(y_,16,16,Hi,Wn),In.name="DFG_LUT",In.minFilter=Kt,In.magFilter=Kt,In.wrapS=zn,In.wrapT=zn,In.generateMipmaps=!1,In.needsUpdate=!0),In}class S_{constructor(e={}){const{canvas:t=Hu(),context:n=null,depth:i=!0,stencil:a=!1,alpha:r=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=un}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=r;const b=f,g=new Set([Mc,yc,vc]),m=new Set([un,Vn,ea,gs,bc,_c]),_=new Uint32Array(4),S=new Int32Array(4),v={textures:[],min:[],max:[],resolution:[]};let w=null,E=null;const x=[],M=[];let N=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=si,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const P=this;let I=!1,D=null,L=null,R=null,k=null;this._outputColorSpace=Xt;let U=0,F=0,V=null,O=-1,W=null;const Y=new St,j=new St;let ue=null;const H=new me(0);let Z=0,te=t.width,he=t.height,Q=1,De=null,Ye=null;const be=new St(0,0,te,he),Fe=new St(0,0,te,he);let le=!1;const fe=new aa,Re=new Cc;let ye=!1,Ue=!1;const se=new Ve,tt=new y,je=new St,ct={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let st=!1;function At(){return V===null?Q:1}let G=n;function Et(A,B){return t.getContext(A,B)}let ft,bt,oe,$e,Ie,We,C,T,q,pe,ae,xe,Te,ee,ne,Me,z,ie,$,Se,_e,ve,qe;try{const A={alpha:!0,depth:i,stencil:a,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r187"),t.addEventListener("webglcontextlost",Xe,!1),t.addEventListener("webglcontextrestored",nt,!1),t.addEventListener("webglcontextcreationerror",Pe,!1),G===null){const B="webgl2";if(G=Et(B,A),G===null)throw Et(B)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}at()}catch(A){throw t.removeEventListener("webglcontextlost",Xe,!1),t.removeEventListener("webglcontextrestored",nt,!1),t.removeEventListener("webglcontextcreationerror",Pe,!1),Ze("WebGLRenderer: "+A.message),A}function at(){ft=new Tg(G),ft.init(),_e=new f_(G,ft),bt=new mg(G,ft,e,_e),oe=new d_(G,ft),bt.reversedDepthBuffer&&u&&oe.buffers.depth.setReversed(!0),L=G.createFramebuffer(),R=G.createFramebuffer(),k=G.createFramebuffer(),$e=new Pg(G),Ie=new Zb,We=new u_(G,ft,oe,Ie,bt,_e,$e),C=new Eg(P),T=new Lp(G),ve=new fg(G,T),q=new Ag(G,T,$e,ve),pe=new Lg(G,q,T,ve,$e),ie=new Cg(G,bt,We),ne=new gg(Ie),ae=new Jb(P,C,ft,bt,ve,ne),xe=new x_(P,Ie),Te=new Qb,ee=new a_(ft),z=new ug(P,C,oe,pe,p,c),Me=new h_(P,pe,bt),qe=new v_(G,$e,bt,oe),$=new pg(G,ft,$e),Se=new Rg(G,ft,$e),$e.programs=ae.programs,P.capabilities=bt,P.extensions=ft,P.properties=Ie,P.renderLists=Te,P.shadowMap=Me,P.state=oe,P.info=$e}b!==un&&(N=new Ig(b,t.width,t.height,o,i,a));const ge=new b_(P,G);this.xr=ge,this.getContext=function(){return G},this.getContextAttributes=function(){return G.getContextAttributes()},this.forceContextLoss=function(){const A=ft.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=ft.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return Q},this.setPixelRatio=function(A){A!==void 0&&(Q=A,this.setSize(te,he,!1))},this.getSize=function(A){return A.set(te,he)},this.setSize=function(A,B,J=!0){if(ge.isPresenting){He("WebGLRenderer: Can't change size while VR device is presenting.");return}te=A,he=B,t.width=Math.floor(A*Q),t.height=Math.floor(B*Q),J===!0&&(t.style.width=A+"px",t.style.height=B+"px"),N!==null&&N.setSize(t.width,t.height),this.setViewport(0,0,A,B)},this.getDrawingBufferSize=function(A){return A.set(te*Q,he*Q).floor()},this.setDrawingBufferSize=function(A,B,J){te=A,he=B,Q=J,t.width=Math.floor(A*J),t.height=Math.floor(B*J),this.setViewport(0,0,A,B)},this.setEffects=function(A){if(b===un){Ze("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let B=0;B<A.length;B++)if(A[B].isOutputPass===!0){He("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}N.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(Y)},this.getViewport=function(A){return A.copy(be)},this.setViewport=function(A,B,J,X){A.isVector4?be.set(A.x,A.y,A.z,A.w):be.set(A,B,J,X),oe.viewport(Y.copy(be).multiplyScalar(At()).round())},this.getScissor=function(A){return A.copy(Fe)},this.setScissor=function(A,B,J,X){A.isVector4?Fe.set(A.x,A.y,A.z,A.w):Fe.set(A,B,J,X),oe.scissor(j.copy(Fe).multiplyScalar(At()).round())},this.getScissorTest=function(){return le},this.setScissorTest=function(A){oe.setScissorTest(le=A)},this.setOpaqueSort=function(A){De=A},this.setTransparentSort=function(A){Ye=A},this.getClearColor=function(A){return A.copy(z.getClearColor())},this.setClearColor=function(){z.setClearColor(...arguments)},this.getClearAlpha=function(){return z.getClearAlpha()},this.setClearAlpha=function(){z.setClearAlpha(...arguments)},this.clear=function(A=!0,B=!0,J=!0){let X=0;if(A){let K=!1;if(V!==null){const Ae=V.texture.format;K=g.has(Ae)}if(K){const Ae=V.texture.type,Oe=m.has(Ae),we=z.getClearColor(),Ne=z.getClearAlpha(),Ge=we.r,Qe=we.g,ht=we.b;Oe?(_[0]=Ge,_[1]=Qe,_[2]=ht,_[3]=Ne,G.clearBufferuiv(G.COLOR,0,_)):(S[0]=Ge,S[1]=Qe,S[2]=ht,S[3]=Ne,G.clearBufferiv(G.COLOR,0,S))}else X|=G.COLOR_BUFFER_BIT}B&&(X|=G.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),J&&(X|=G.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),X!==0&&G.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),D=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Xe,!1),t.removeEventListener("webglcontextrestored",nt,!1),t.removeEventListener("webglcontextcreationerror",Pe,!1),z.dispose(),Te.dispose(),ee.dispose(),We.dispose(),Ie.dispose(),C.dispose(),pe.dispose(),q.dispose(),ve.dispose(),qe.dispose(),ae.dispose(),ge.dispose(),ge.removeEventListener("sessionstart",qc),ge.removeEventListener("sessionend",Xc),Ri.stop()};function Xe(A){A.preventDefault(),hr("WebGLRenderer: Context Lost."),I=!0}function nt(){hr("WebGLRenderer: Context Restored."),I=!1;const A=$e.autoReset,B=Me.enabled,J=Me.autoUpdate,X=Me.needsUpdate,K=Me.type;at(),$e.autoReset=A,Me.enabled=B,Me.autoUpdate=J,Me.needsUpdate=X,Me.type=K}function Pe(A){Ze("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function _t(A){const B=A.target;B.removeEventListener("dispose",_t),Vt(B)}function Vt(A){oi(A),Ie.remove(A)}function oi(A){const B=Ie.get(A).programs;B!==void 0&&(B.forEach(function(J){ae.releaseProgram(J)}),A.isShaderMaterial&&ae.releaseShaderCache(A))}this.renderBufferDirect=function(A,B,J,X,K,Ae){B===null&&(B=ct);const Oe=K.isMesh&&K.matrixWorld.determinantAffine()<0,we=iu(A,B,J,X,K);oe.setMaterial(X,Oe);let Ne=J.index,Ge=1;if(X.wireframe===!0){if(Ne=q.getWireframeAttribute(J),Ne===void 0)return;Ge=2}const Qe=J.drawRange,ht=J.attributes.position;let ze=Qe.start*Ge,dt=(Qe.start+Qe.count)*Ge;Ae!==null&&(ze=Math.max(ze,Ae.start*Ge),dt=Math.min(dt,(Ae.start+Ae.count)*Ge)),Ne!==null?(ze=Math.max(ze,0),dt=Math.min(dt,Ne.count)):ht!=null&&(ze=Math.max(ze,0),dt=Math.min(dt,ht.count));const Ft=dt-ze;if(Ft<0||Ft===1/0)return;ve.setup(K,X,we,J,Ne);let wt,Mt=$;if(Ne!==null&&(wt=T.get(Ne),Mt=Se,Mt.setIndex(wt)),K.isMesh)X.wireframe===!0?(oe.setLineWidth(X.wireframeLinewidth*At()),Mt.setMode(G.LINES)):Mt.setMode(G.TRIANGLES);else if(K.isLine){let Zt=X.linewidth;Zt===void 0&&(Zt=1),oe.setLineWidth(Zt*At()),K.isLineSegments?Mt.setMode(G.LINES):K.isLineLoop?Mt.setMode(G.LINE_LOOP):Mt.setMode(G.LINE_STRIP)}else K.isPoints?Mt.setMode(G.POINTS):K.isSprite&&Mt.setMode(G.TRIANGLES);if(K.isBatchedMesh)if(ft.get("WEBGL_multi_draw"))Mt.renderMultiDraw(K._multiDrawStarts,K._multiDrawCounts,K._multiDrawCount);else{const Zt=K._multiDrawStarts,Be=K._multiDrawCounts,nn=K._multiDrawCount,pt=Ne?T.get(Ne).bytesPerElement:1,Pi=Ie.get(X).currentProgram.getUniforms();for(let $t=0;$t<nn;$t++)Pi.setValue(G,"_gl_DrawID",$t),Mt.render(Zt[$t]/pt,Be[$t])}else if(K.isInstancedMesh)Mt.renderInstances(ze,Ft,K.count);else if(J.isInstancedBufferGeometry){const Zt=J._maxInstanceCount!==void 0?J._maxInstanceCount:1/0,Be=Math.min(J.instanceCount,Zt);Mt.renderInstances(ze,Ft,Be)}else Mt.render(ze,Ft)};function Wc(A,B,J,X){D!==null&&A.isNodeMaterial&&D.setObject(X,A),ye===!0&&ne.setState(A,J,!1),A.transparent===!0&&A.side===Lt&&A.forceSinglePass===!1?(A.side=rn,A.needsUpdate=!0,As(A,B,X),A.side=yi,A.needsUpdate=!0,As(A,B,X),A.side=Lt):As(A,B,X)}this.compile=function(A,B,J=null){J===null&&(J=A),D!==null&&D.renderStart(A,B,J),E=ee.get(J),E.init(B),M.push(E),J.traverseVisible(function(K){K.isLight&&K.layers.test(B.layers)&&(E.pushLight(K),K.castShadow&&E.pushShadow(K))}),A!==J&&A.traverseVisible(function(K){K.isLight&&K.layers.test(B.layers)&&(E.pushLight(K),K.castShadow&&E.pushShadow(K))}),E.setupLights(),D!==null&&D.updateLights(E.state.lightsArray),Ue=this.localClippingEnabled,ye=ne.init(this.clippingPlanes,Ue),ye===!0&&ne.setGlobalState(this.clippingPlanes,B),D!==null&&Me.render(E.state.shadowsArray,J,B);const X=new Set;return A.traverse(function(K){if(!(K.isMesh||K.isPoints||K.isLine||K.isSprite))return;const Ae=K.material;if(Ae)if(Array.isArray(Ae))for(let Oe=0;Oe<Ae.length;Oe++){const we=Ae[Oe];Wc(we,J,B,K),X.add(we)}else Wc(Ae,J,B,K),X.add(Ae)}),E=M.pop(),D!==null&&D.renderEnd(),X},this.compileAsync=function(A,B,J=null){const X=this.compile(A,B,J);return new Promise(K=>{function Ae(){if(X.forEach(function(Oe){const Ne=Ie.get(Oe).currentProgram;(Ne===void 0||Ne.isReady())&&X.delete(Oe)}),X.size===0){K(A);return}setTimeout(Ae,10)}ft.get("KHR_parallel_shader_compile")!==null?Ae():setTimeout(Ae,10)})};let Er=null;function tu(A){Er&&Er(A)}function qc(){Ri.stop()}function Xc(){Ri.start()}const Ri=new Cd;Ri.setAnimationLoop(tu),typeof self<"u"&&Ri.setContext(self),this.setAnimationLoop=function(A){Er=A,ge.setAnimationLoop(A),A===null?Ri.stop():Ri.start()},ge.addEventListener("sessionstart",qc),ge.addEventListener("sessionend",Xc),this.render=function(A,B){if(B!==void 0&&B.isCamera!==!0){Ze("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;D!==null&&D.renderStart(A,B);const J=ge.enabled===!0&&ge.isPresenting===!0,X=N!==null&&(V===null||J)&&N.begin(P,V);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),ge.enabled===!0&&ge.isPresenting===!0&&(N===null||N.isCompositing()===!1)&&(ge.cameraAutoUpdate===!0&&ge.updateCamera(B),B=ge.getCamera()),A.isScene===!0&&A.onBeforeRender(P,A,B,V),E=ee.get(A,M.length),E.init(B),E.state.textureUnits=We.getTextureUnits(),M.push(E),se.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),B.isArrayCamera?Re.setFromArrayCamera(B):fe.setFromProjectionMatrix(se,Tn,B.reversedDepth),Ue=this.localClippingEnabled,ye=ne.init(this.clippingPlanes,Ue),w=Te.get(A,x.length),w.init(),x.push(w),this.info.render.frame++,ge.enabled===!0&&ge.isPresenting===!0){const Oe=P.xr.getDepthSensingMesh();Oe!==null&&Tr(Oe,B,-1/0,P.sortObjects)}Tr(A,B,0,P.sortObjects),w.finish(),D!==null&&D.updateLights(E.state.lightsArray),P.sortObjects===!0&&w.sort(De,Ye),st=ge.enabled===!1||ge.isPresenting===!1||ge.hasDepthSensing()===!1,st&&z.addToRenderList(w,A),this.info.autoReset===!0&&this.info.reset(),ye===!0&&ne.beginShadows();const K=E.state.shadowsArray;if(Me.render(K,A,B),ye===!0&&ne.endShadows(),(X&&N.hasRenderPass())===!1){const Oe=w.opaque,we=w.transmissive;if(E.setupLights(),B.isArrayCamera){const Ne=B.cameras;if(we.length>0)for(let Ge=0,Qe=Ne.length;Ge<Qe;Ge++){const ht=Ne[Ge];jc(Oe,we,A,ht)}st&&z.render(A);for(let Ge=0,Qe=Ne.length;Ge<Qe;Ge++){const ht=Ne[Ge];Kc(w,A,ht,ht.viewport)}}else we.length>0&&jc(Oe,we,A,B),st&&z.render(A),Kc(w,A,B)}V!==null&&F===0&&(We.updateMultisampleRenderTarget(V),We.updateRenderTargetMipmap(V)),X&&N.end(P),A.isScene===!0&&A.onAfterRender(P,A,B),ve.resetDefaultState(),O=-1,W=null,M.pop(),M.length>0?(E=M[M.length-1],We.setTextureUnits(E.state.textureUnits),ye===!0&&ne.setGlobalState(P.clippingPlanes,E.state.camera)):E=null,x.pop(),x.length>0?w=x[x.length-1]:w=null,D!==null&&D.renderEnd()};function Tr(A,B,J,X){if(A.visible===!1)return;if(A.layers.test(B.layers)){if(A.isGroup)J=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(B);else if(A.isLight)E.pushLight(A),A.castShadow&&E.pushShadow(A);else if(A.isSprite){const Oe=B.isArrayCamera?Re:fe;if(!A.frustumCulled||A.intersectsFrustum(Oe)){X&&je.setFromMatrixPosition(A.matrixWorld).applyMatrix4(se);const we=pe.update(A),Ne=A.material;Ne.visible&&w.push(A,we,Ne,J,je.z,null,B)}}else if(A.isMesh||A.isLine||A.isPoints){const Oe=B.isArrayCamera?Re:fe;if(!A.frustumCulled||A.intersectsFrustum(Oe)){const we=pe.update(A),Ne=A.material;if(X&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),je.copy(A.boundingSphere.center)):(we.boundingSphere===null&&we.computeBoundingSphere(),je.copy(we.boundingSphere.center)),je.applyMatrix4(A.matrixWorld).applyMatrix4(se)),Array.isArray(Ne)){const Ge=we.groups;for(let Qe=0,ht=Ge.length;Qe<ht;Qe++){const ze=Ge[Qe],dt=Ne[ze.materialIndex];dt&&dt.visible&&w.push(A,we,dt,J,je.z,ze,B)}}else Ne.visible&&w.push(A,we,Ne,J,je.z,null,B)}}}const Ae=A.children;for(let Oe=0,we=Ae.length;Oe<we;Oe++)Tr(Ae[Oe],B,J,X)}function Kc(A,B,J,X){const{opaque:K,transmissive:Ae,transparent:Oe}=A;E.setupLightsView(J),ye===!0&&ne.setGlobalState(P.clippingPlanes,J),X&&oe.viewport(Y.copy(X)),K.length>0&&fa(K,B,J),Ae.length>0&&fa(Ae,B,J),Oe.length>0&&fa(Oe,B,J),oe.buffers.depth.setTest(!0),oe.buffers.depth.setMask(!0),oe.buffers.color.setMask(!0),oe.setPolygonOffset(!1)}function jc(A,B,J,X){if((J.isScene===!0?J.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[X.id]===void 0){const ze=ft.has("EXT_color_buffer_half_float")||ft.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[X.id]=new Gn(1,1,{generateMipmaps:!0,type:ze?Wn:un,minFilter:Bn,samples:Math.max(4,bt.samples),stencilBuffer:a,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:lt.workingColorSpace})}const Ae=E.state.transmissionRenderTarget[X.id],Oe=X.viewport||Y;Ae.setSize(Oe.z*P.transmissionResolutionScale,Oe.w*P.transmissionResolutionScale);const we=P.getRenderTarget(),Ne=P.getActiveCubeFace(),Ge=P.getActiveMipmapLevel();P.setRenderTarget(Ae),P.getClearColor(H),Z=P.getClearAlpha(),Z<1&&P.setClearColor(16777215,.5),P.clear(),st&&z.render(J);const Qe=P.toneMapping;P.toneMapping=si;const ht=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),E.setupLightsView(X),ye===!0&&ne.setGlobalState(P.clippingPlanes,X),fa(A,J,X),We.updateMultisampleRenderTarget(Ae),We.updateRenderTargetMipmap(Ae),ft.has("WEBGL_multisampled_render_to_texture")===!1){let ze=!1;for(let dt=0,Ft=B.length;dt<Ft;dt++){const wt=B[dt],{object:Mt,geometry:Zt,material:Be,group:nn}=wt;if(Be.side===Lt&&Mt.layers.test(X.layers)){const pt=Be.side;Be.side=rn,Be.needsUpdate=!0,Yc(Mt,J,X,Zt,Be,nn),Be.side=pt,Be.needsUpdate=!0,ze=!0}}ze===!0&&(We.updateMultisampleRenderTarget(Ae),We.updateRenderTargetMipmap(Ae))}P.setRenderTarget(we,Ne,Ge),P.setClearColor(H,Z),ht!==void 0&&(X.viewport=ht),P.toneMapping=Qe}function fa(A,B,J){const X=B.isScene===!0?B.overrideMaterial:null;for(let K=0,Ae=A.length;K<Ae;K++){const Oe=A[K],{object:we,geometry:Ne,group:Ge}=Oe;let Qe=Oe.material;Qe.allowOverride===!0&&X!==null&&(Qe=X),we.layers.test(J.layers)&&Yc(we,B,J,Ne,Qe,Ge)}}function Yc(A,B,J,X,K,Ae){D!==null&&K.isNodeMaterial&&D.setObject(A,K),A.onBeforeRender(P,B,J,X,K,Ae),A.modelViewMatrix.multiplyMatrices(J.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),K.onBeforeRender(P,B,J,X,A,Ae),K.transparent===!0&&K.side===Lt&&K.forceSinglePass===!1?(K.side=rn,K.needsUpdate=!0,P.renderBufferDirect(J,B,X,K,A,Ae),K.side=yi,K.needsUpdate=!0,P.renderBufferDirect(J,B,X,K,A,Ae),K.side=Lt):P.renderBufferDirect(J,B,X,K,A,Ae),A.onAfterRender(P,B,J,X,K,Ae)}function Jc(A){let B=0;for(const J of A)J.texture!==null&&B++;return B}function As(A,B,J){B.isScene!==!0&&(B=ct);const X=Ie.get(A),K=E.state.lights,Ae=E.state.shadowsArray,Oe=K.state.version,we=ae.getParameters(A,K.state,Ae,B,J,E.state.lightProbeGridArray),Ne=ae.getProgramCacheKey(we);let Ge=X.programs;X.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?B.environment:null,X.fog=B.fog;const Qe=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;X.envMap=C.get(A.envMap||X.environment,Qe),X.envMapRotation=X.environment!==null&&A.envMap===null?B.environmentRotation:A.envMapRotation,Ge===void 0&&(A.addEventListener("dispose",_t),Ge=new Map,X.programs=Ge,X.programVariants=new Map);let ht=Ge.get(Ne);if(ht!==void 0){if(X.currentProgram===ht&&X.lightsStateVersion===Oe)return $c(A,we),ht}else we.uniforms=ae.getUniforms(A),D!==null&&A.isNodeMaterial&&D.build(A,J,we),A.onBeforeCompile(we,P),ht=ae.acquireProgram(we,Ne),Ge.set(Ne,ht),X.uniforms=we.uniforms;const ze=X.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(ze.clippingPlanes=ne.uniform),$c(A,we),X.needsLights=au(A),X.lightsStateVersion=Oe,X.needsLights&&(ze.ambientLightColor.value=K.state.ambient,ze.lightProbe.value=K.state.probe,ze.sunLights.value=K.state.sun,ze.sunLightShadows.value=K.state.sunShadow,ze.directionalLights.value=K.state.directional,ze.directionalLightShadows.value=K.state.directionalShadow,ze.spotLights.value=K.state.spot,ze.spotLightShadows.value=K.state.spotShadow,ze.rectAreaLights.value=K.state.rectArea,ze.ltc_1.value=K.state.rectAreaLTC1,ze.ltc_2.value=K.state.rectAreaLTC2,ze.pointLights.value=K.state.point,ze.pointLightShadows.value=K.state.pointShadow,ze.hemisphereLights.value=K.state.hemi,ze.sunShadowMatrix.value=K.state.sunShadowMatrix,ze.sunShadowCascade.value=K.state.sunShadowCascade,ze.directionalShadowMatrix.value=K.state.directionalShadowMatrix,ze.spotLightMatrix.value=K.state.spotLightMatrix,ze.spotLightMap.value=K.state.spotLightMap,ze.pointShadowMatrix.value=K.state.pointShadowMatrix),X.numLightProbeGrids=Jc(E.state.lightProbeGridArray),X.currentProgram=ht,X.uniformsList=null,ht}function nu(A,B,J,X,K){const Ae=Ie.get(A),Oe=Ae.currentProgram.id+","+X+","+K;let we=Ae.programVariants.get(Oe);return we===void 0?(we=As(A,B,J),Ae.programVariants.set(Oe,we)):(Ae.currentProgram=we,Ae.uniformsList=null,Ae.outputColorSpace=X,Ae.toneMapping=K),we}function Zc(A){if(A.uniformsList===null){const B=A.currentProgram.getUniforms();A.uniformsList=sr.seqWithValue(B.seq,A.uniforms)}return A.uniformsList}function $c(A,B){const J=Ie.get(A);J.outputColorSpace=B.outputColorSpace,J.batching=B.batching,J.batchingColor=B.batchingColor,J.instancing=B.instancing,J.instancingColor=B.instancingColor,J.instancingMorph=B.instancingMorph,J.skinning=B.skinning,J.morphTargets=B.morphTargets,J.morphNormals=B.morphNormals,J.morphColors=B.morphColors,J.morphTargetsCount=B.morphTargetsCount,J.numClippingPlanes=B.numClippingPlanes,J.numIntersection=B.numClipIntersection,J.vertexAlphas=B.vertexAlphas,J.vertexTangents=B.vertexTangents,J.toneMapping=B.toneMapping}function iu(A,B,J,X,K){B.isScene!==!0&&(B=ct),We.resetTextureUnits();const Ae=B.fog,Oe=X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial?B.environment:null,we=V===null?P.outputColorSpace:V.isXRRenderTarget===!0?V.texture.colorSpace:lt.workingColorSpace,Ne=X.isMeshStandardMaterial||X.isMeshLambertMaterial&&!X.envMap||X.isMeshPhongMaterial&&!X.envMap,Ge=C.get(X.envMap||Oe,Ne),Qe=X.vertexColors===!0&&!!J.attributes.color&&J.attributes.color.itemSize===4,ht=!!J.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),ze=!!J.morphAttributes.position,dt=!!J.morphAttributes.normal,Ft=!!J.morphAttributes.color;let wt=si;X.toneMapped&&(V===null||V.isXRRenderTarget===!0)&&(wt=P.toneMapping);const Mt=J.morphAttributes.position||J.morphAttributes.normal||J.morphAttributes.color,Zt=Mt!==void 0?Mt.length:0,Be=Ie.get(X),nn=E.state.lights;if(ye===!0&&(Ue===!0||A!==W)){const Pt=A===W&&X.id===O;ne.setState(X,A,Pt)}let pt=!1,Pi=!1;X.version===Be.__version?Be.needsLights&&Be.lightsStateVersion!==nn.state.version||K.isBatchedMesh&&Be.batching===!1||!K.isBatchedMesh&&Be.batching===!0||K.isBatchedMesh&&Be.batchingColor===!0&&K._colorsTexture===null||K.isBatchedMesh&&Be.batchingColor===!1&&K._colorsTexture!==null||K.isInstancedMesh&&Be.instancing===!1||!K.isInstancedMesh&&Be.instancing===!0||K.isSkinnedMesh&&Be.skinning===!1||!K.isSkinnedMesh&&Be.skinning===!0||K.isInstancedMesh&&Be.instancingColor===!0&&K.instanceColor===null||K.isInstancedMesh&&Be.instancingColor===!1&&K.instanceColor!==null||K.isInstancedMesh&&Be.instancingMorph===!0&&K.morphTexture===null||K.isInstancedMesh&&Be.instancingMorph===!1&&K.morphTexture!==null||Be.envMap!==Ge||X.fog===!0&&Be.fog!==Ae||Be.numClippingPlanes!==void 0&&(Be.numClippingPlanes!==ne.numPlanes||Be.numIntersection!==ne.numIntersection)||Be.vertexAlphas!==Qe||Be.vertexTangents!==ht||Be.morphTargets!==ze||Be.morphNormals!==dt||Be.morphColors!==Ft||Be.morphTargetsCount!==Zt||Be.numLightProbeGrids!==Jc(E.state.lightProbeGridArray)?pt=!0:(Be.outputColorSpace!==we||Be.toneMapping!==wt)&&(Pi=!0):(pt=!0,Be.__version=X.version);let $t=Be.currentProgram;(pt===!0||Pi===!0)&&($t=Pi===!0?nu(X,B,K,we,wt):As(X,B,K),D&&X.isNodeMaterial&&D.onUpdateProgram(X,$t,Be));let pa=!1,ci=!1,Ci=!1;const ut=$t.getUniforms(),Yt=Be.uniforms;if(oe.useProgram($t.program)&&(pa=!0,ci=!0,Ci=!0),X.id!==O&&(O=X.id,ci=!0),pa||W!==A){oe.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),ut.setValue(G,"projectionMatrix",A.projectionMatrix),ut.setValue(G,"viewMatrix",A.matrixWorldInverse);const Wt=ut.map.cameraPosition;Wt!==void 0&&Wt.setValue(G,tt.setFromMatrixPosition(A.matrixWorld)),bt.logarithmicDepthBuffer&&ut.setValue(G,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&ut.setValue(G,"isOrthographic",A.isOrthographicCamera===!0),W!==A&&(W=A,ci=!0,Ci=!0)}if(Be.needsLights&&(nn.state.sunShadowMap.length>0&&ut.setValue(G,"sunShadowMap",nn.state.sunShadowMap,We),nn.state.directionalShadowMap.length>0&&ut.setValue(G,"directionalShadowMap",nn.state.directionalShadowMap,We),nn.state.spotShadowMap.length>0&&ut.setValue(G,"spotShadowMap",nn.state.spotShadowMap,We),nn.state.pointShadowMap.length>0&&ut.setValue(G,"pointShadowMap",nn.state.pointShadowMap,We)),K.isSkinnedMesh){ut.setOptional(G,K,"bindMatrix"),ut.setOptional(G,K,"bindMatrixInverse");const Pt=K.skeleton;Pt&&(Pt.boneTexture===null&&Pt.computeBoneTexture(),ut.setValue(G,"boneTexture",Pt.boneTexture,We))}K.isBatchedMesh&&(ut.setOptional(G,K,"batchingTexture"),ut.setValue(G,"batchingTexture",K._matricesTexture,We),ut.setOptional(G,K,"batchingIdTexture"),ut.setValue(G,"batchingIdTexture",K._indirectTexture,We),ut.setOptional(G,K,"batchingColorTexture"),K._colorsTexture!==null&&ut.setValue(G,"batchingColorTexture",K._colorsTexture,We));const yn=J.morphAttributes;if((yn.position!==void 0||yn.normal!==void 0||yn.color!==void 0)&&ie.update(K,J,$t),(ci||Be.receiveShadow!==K.receiveShadow)&&(Be.receiveShadow=K.receiveShadow,ut.setValue(G,"receiveShadow",K.receiveShadow)),(X.isMeshStandardMaterial||X.isMeshLambertMaterial||X.isMeshPhongMaterial)&&X.envMap===null&&B.environment!==null&&(Yt.envMapIntensity.value=B.environmentIntensity),Yt.dfgLUT!==void 0&&(Yt.dfgLUT.value=M_()),ci){if(ut.setValue(G,"toneMappingExposure",P.toneMappingExposure),Be.needsLights&&su(Yt,Ci),Ae&&X.fog===!0&&xe.refreshFogUniforms(Yt,Ae),xe.refreshMaterialUniforms(Yt,X,Q,he,E.state.transmissionRenderTarget[A.id]),Be.needsLights&&Be.numLightProbeGrids>0){const Pt=v;let Wt=0;for(const jn of E.state.lightProbeGridArray)jn.texture!==null&&(Pt.textures[Wt]=jn.texture,Pt.min[Wt]=jn.boundingBox.min,Pt.max[Wt]=jn.boundingBox.max,Pt.resolution[Wt]=jn.resolution,Wt++);for(const jn in Pt)Pt[jn].length=Wt;Yt.probesSH.value=Pt.textures,Yt.probesMin.value=Pt.min,Yt.probesMax.value=Pt.max,Yt.probesResolution.value=Pt.resolution}sr.upload(G,Zc(Be),Yt,We)}if(X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(sr.upload(G,Zc(Be),Yt,We),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&ut.setValue(G,"center",K.center),ut.setValue(G,"modelViewMatrix",K.modelViewMatrix),ut.setValue(G,"normalMatrix",K.normalMatrix),ut.setValue(G,"modelMatrix",K.matrixWorld),X.uniformsGroups!==void 0){const Pt=X.uniformsGroups;for(let Wt=0,jn=Pt.length;Wt<jn;Wt++){const el=Pt[Wt];qe.update(el,$t),qe.bind(el,$t)}}return $t}function su(A,B){A.ambientLightColor.needsUpdate=B,A.lightProbe.needsUpdate=B,A.sunLights.needsUpdate=B,A.sunLightShadows.needsUpdate=B,A.directionalLights.needsUpdate=B,A.directionalLightShadows.needsUpdate=B,A.pointLights.needsUpdate=B,A.pointLightShadows.needsUpdate=B,A.spotLights.needsUpdate=B,A.spotLightShadows.needsUpdate=B,A.rectAreaLights.needsUpdate=B,A.hemisphereLights.needsUpdate=B}function au(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return U},this.getActiveMipmapLevel=function(){return F},this.getRenderTarget=function(){return V},this.setRenderTargetTextures=function(A,B,J){const X=Ie.get(A);X.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),Ie.get(A.texture).__webglTexture=B,Ie.get(A.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:J,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,B){const J=Ie.get(A);J.__webglFramebuffer=B,J.__useDefaultFramebuffer=B===void 0},this.setRenderTarget=function(A,B=0,J=0){V=A,U=B,F=J;let X=null,K=!1,Ae=!1;if(A){const we=Ie.get(A);if(we.__useDefaultFramebuffer!==void 0){oe.bindFramebuffer(G.FRAMEBUFFER,we.__webglFramebuffer),Y.copy(A.viewport),j.copy(A.scissor),ue=A.scissorTest,oe.viewport(Y),oe.scissor(j),oe.setScissorTest(ue),O=-1;return}else if(we.__webglFramebuffer===void 0)We.setupRenderTarget(A);else if(we.__hasExternalTextures)We.rebindTextures(A,Ie.get(A.texture).__webglTexture,Ie.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const Qe=A.depthTexture;if(we.__boundDepthTexture!==Qe){if(Qe!==null&&Ie.has(Qe)&&(A.width!==Qe.image.width||A.height!==Qe.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");We.setupDepthRenderbuffer(A)}}const Ne=A.texture;(Ne.isData3DTexture||Ne.isDataArrayTexture||Ne.isCompressedArrayTexture)&&(Ae=!0);const Ge=Ie.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(Ge[B])?X=Ge[B][J]:X=Ge[B],K=!0):A.samples>0&&We.useMultisampledRTT(A)===!1?X=Ie.get(A).__webglMultisampledFramebuffer:Array.isArray(Ge)?X=Ge[J]:X=Ge,Y.copy(A.viewport),j.copy(A.scissor),ue=A.scissorTest}else Y.copy(be).multiplyScalar(Q).floor(),j.copy(Fe).multiplyScalar(Q).floor(),ue=le;if(J!==0&&(X=L),oe.bindFramebuffer(G.FRAMEBUFFER,X)&&oe.drawBuffers(A,X),oe.viewport(Y),oe.scissor(j),oe.setScissorTest(ue),K){const we=Ie.get(A.texture);G.framebufferTexture2D(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_CUBE_MAP_POSITIVE_X+B,we.__webglTexture,J)}else if(Ae){const we=B;for(let Ne=0;Ne<A.textures.length;Ne++){const Ge=Ie.get(A.textures[Ne]);G.framebufferTextureLayer(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0+Ne,Ge.__webglTexture,J,we)}}else if(A!==null&&J!==0){const we=Ie.get(A.texture);G.framebufferTexture2D(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,we.__webglTexture,J)}O=-1};function Qc(A){const B=Ie.get(A);return(B.__readFormat!==A.format||B.__readType!==A.type)&&(B.__readFormat=A.format,B.__readType=A.type,B.__formatReadable=bt.textureFormatReadable(A.format),B.__typeReadable=bt.textureTypeReadable(A.type)),B}this.readRenderTargetPixels=function(A,B,J,X,K,Ae,Oe,we=0){if(!(A&&A.isWebGLRenderTarget)){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ne=Ie.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Oe!==void 0&&(Ne=Ne[Oe],Array.isArray(Ne)&&(Ne=Ne[0])),Ne){oe.bindFramebuffer(G.FRAMEBUFFER,Ne);try{const Ge=A.textures[we],Qe=Ge.format,ht=Ge.type;A.textures.length>1&&G.readBuffer(G.COLOR_ATTACHMENT0+we);const ze=Qc(Ge);if(ze.__formatReadable===!1){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(ze.__typeReadable===!1){Ze("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=A.width-X&&J>=0&&J<=A.height-K&&G.readPixels(B,J,X,K,_e.convert(Qe),_e.convert(ht),Ae)}finally{const Ge=V!==null?Ie.get(V).__webglFramebuffer:null;oe.bindFramebuffer(G.FRAMEBUFFER,Ge)}}},this.readRenderTargetPixelsAsync=async function(A,B,J,X,K,Ae,Oe,we=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ne=Ie.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Oe!==void 0&&(Ne=Ne[Oe],Array.isArray(Ne)&&(Ne=Ne[0])),Ne)if(B>=0&&B<=A.width-X&&J>=0&&J<=A.height-K){oe.bindFramebuffer(G.FRAMEBUFFER,Ne);const Ge=A.textures[we],Qe=Ge.format,ht=Ge.type;A.textures.length>1&&G.readBuffer(G.COLOR_ATTACHMENT0+we);const ze=Qc(Ge);if(ze.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(ze.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const dt=G.createBuffer();G.bindBuffer(G.PIXEL_PACK_BUFFER,dt),G.bufferData(G.PIXEL_PACK_BUFFER,Ae.byteLength,G.STREAM_READ),G.readPixels(B,J,X,K,_e.convert(Qe),_e.convert(ht),0),G.bindBuffer(G.PIXEL_PACK_BUFFER,null);const Ft=V!==null?Ie.get(V).__webglFramebuffer:null;oe.bindFramebuffer(G.FRAMEBUFFER,Ft);const wt=G.fenceSync(G.SYNC_GPU_COMMANDS_COMPLETE,0);return G.flush(),await Vu(G,wt,4),G.bindBuffer(G.PIXEL_PACK_BUFFER,dt),G.getBufferSubData(G.PIXEL_PACK_BUFFER,0,Ae),G.bindBuffer(G.PIXEL_PACK_BUFFER,null),G.deleteBuffer(dt),G.deleteSync(wt),Ae}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,B=null,J=0){const X=Math.pow(2,-J),K=Math.floor(A.image.width*X),Ae=Math.floor(A.image.height*X),Oe=B!==null?B.x:0,we=B!==null?B.y:0;We.setTexture2D(A,0),G.copyTexSubImage2D(G.TEXTURE_2D,J,0,0,Oe,we,K,Ae),oe.unbindTexture()},this.copyTextureToTexture=function(A,B,J=null,X=null,K=0,Ae=0){let Oe,we,Ne,Ge,Qe,ht,ze,dt,Ft;const wt=A.isCompressedTexture?A.mipmaps[Ae]:A.image;if(J!==null)Oe=J.max.x-J.min.x,we=J.max.y-J.min.y,Ne=J.isBox3?J.max.z-J.min.z:1,Ge=J.min.x,Qe=J.min.y,ht=J.isBox3?J.min.z:0;else{const ut=Math.pow(2,-K);Oe=Math.floor(wt.width*ut),we=Math.floor(wt.height*ut),A.isDataArrayTexture?Ne=wt.depth:A.isData3DTexture?Ne=Math.floor(wt.depth*ut):Ne=1,Ge=0,Qe=0,ht=0}X!==null?(ze=X.x,dt=X.y,Ft=X.z):(ze=0,dt=0,Ft=0);const Mt=_e.convert(B.format),Zt=_e.convert(B.type);let Be;B.isData3DTexture?(We.setTexture3D(B,0),Be=G.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(We.setTexture2DArray(B,0),Be=G.TEXTURE_2D_ARRAY):(We.setTexture2D(B,0),Be=G.TEXTURE_2D),oe.activeTexture(G.TEXTURE0),oe.pixelStorei(G.UNPACK_FLIP_Y_WEBGL,B.flipY),oe.pixelStorei(G.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),oe.pixelStorei(G.UNPACK_ALIGNMENT,B.unpackAlignment);const nn=oe.getParameter(G.UNPACK_ROW_LENGTH),pt=oe.getParameter(G.UNPACK_IMAGE_HEIGHT),Pi=oe.getParameter(G.UNPACK_SKIP_PIXELS),$t=oe.getParameter(G.UNPACK_SKIP_ROWS),pa=oe.getParameter(G.UNPACK_SKIP_IMAGES);oe.pixelStorei(G.UNPACK_ROW_LENGTH,wt.width),oe.pixelStorei(G.UNPACK_IMAGE_HEIGHT,wt.height),oe.pixelStorei(G.UNPACK_SKIP_PIXELS,Ge),oe.pixelStorei(G.UNPACK_SKIP_ROWS,Qe),oe.pixelStorei(G.UNPACK_SKIP_IMAGES,ht);const ci=A.isDataArrayTexture||A.isData3DTexture,Ci=B.isDataArrayTexture||B.isData3DTexture;if(A.isDepthTexture){const ut=Ie.get(A),Yt=Ie.get(B),yn=Ie.get(ut.__renderTarget),Pt=Ie.get(Yt.__renderTarget);oe.bindFramebuffer(G.READ_FRAMEBUFFER,yn.__webglFramebuffer),oe.bindFramebuffer(G.DRAW_FRAMEBUFFER,Pt.__webglFramebuffer);for(let Wt=0;Wt<Ne;Wt++)ci&&(G.framebufferTextureLayer(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,Ie.get(A).__webglTexture,K,ht+Wt),G.framebufferTextureLayer(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,Ie.get(B).__webglTexture,Ae,Ft+Wt)),G.blitFramebuffer(Ge,Qe,Ge+Oe,Qe+we,ze,dt,ze+Oe,dt+we,G.DEPTH_BUFFER_BIT,G.NEAREST);oe.bindFramebuffer(G.READ_FRAMEBUFFER,null),oe.bindFramebuffer(G.DRAW_FRAMEBUFFER,null)}else if(K!==0||A.isRenderTargetTexture||Ie.has(A)){const ut=Ie.get(A),Yt=Ie.get(B);oe.bindFramebuffer(G.READ_FRAMEBUFFER,R),oe.bindFramebuffer(G.DRAW_FRAMEBUFFER,k);for(let yn=0;yn<Ne;yn++)ci?G.framebufferTextureLayer(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,ut.__webglTexture,K,ht+yn):G.framebufferTexture2D(G.READ_FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,ut.__webglTexture,K),Ci?G.framebufferTextureLayer(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,Yt.__webglTexture,Ae,Ft+yn):G.framebufferTexture2D(G.DRAW_FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,Yt.__webglTexture,Ae),K!==0?G.blitFramebuffer(Ge,Qe,Ge+Oe,Qe+we,ze,dt,ze+Oe,dt+we,G.COLOR_BUFFER_BIT,G.NEAREST):Ci?G.copyTexSubImage3D(Be,Ae,ze,dt,Ft+yn,Ge,Qe,Oe,we):G.copyTexSubImage2D(Be,Ae,ze,dt,Ge,Qe,Oe,we);oe.bindFramebuffer(G.READ_FRAMEBUFFER,null),oe.bindFramebuffer(G.DRAW_FRAMEBUFFER,null)}else Ci?A.isDataTexture||A.isData3DTexture?G.texSubImage3D(Be,Ae,ze,dt,Ft,Oe,we,Ne,Mt,Zt,wt.data):B.isCompressedArrayTexture?G.compressedTexSubImage3D(Be,Ae,ze,dt,Ft,Oe,we,Ne,Mt,wt.data):G.texSubImage3D(Be,Ae,ze,dt,Ft,Oe,we,Ne,Mt,Zt,wt):A.isDataTexture?G.texSubImage2D(G.TEXTURE_2D,Ae,ze,dt,Oe,we,Mt,Zt,wt.data):A.isCompressedTexture?G.compressedTexSubImage2D(G.TEXTURE_2D,Ae,ze,dt,wt.width,wt.height,Mt,wt.data):G.texSubImage2D(G.TEXTURE_2D,Ae,ze,dt,Oe,we,Mt,Zt,wt);oe.pixelStorei(G.UNPACK_ROW_LENGTH,nn),oe.pixelStorei(G.UNPACK_IMAGE_HEIGHT,pt),oe.pixelStorei(G.UNPACK_SKIP_PIXELS,Pi),oe.pixelStorei(G.UNPACK_SKIP_ROWS,$t),oe.pixelStorei(G.UNPACK_SKIP_IMAGES,pa),Ae===0&&B.generateMipmaps===!0&&B.mipmapsAutoUpdate===!0&&G.generateMipmap(Be),oe.unbindTexture()},this.initRenderTarget=function(A){Ie.get(A).__webglFramebuffer===void 0&&We.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?We.setTextureCube(A,0):A.isData3DTexture?We.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?We.setTexture2DArray(A,0):We.setTexture2D(A,0),oe.unbindTexture()},this.resetState=function(){U=0,F=0,V=null,oe.reset(),ve.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Tn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=lt._getDrawingBufferColorSpace(e),t.unpackColorSpace=lt._getUnpackColorSpace()}}const wh={type:"change"},Bc={type:"start"},Gd={type:"end"},Va=new ys,Eh=new ti,w_=Math.cos(70*Js.DEG2RAD),Ot=new y,cn=2*Math.PI,gt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},lo=1e-6;class E_ extends Pp{constructor(e,t=null){super(e,t),this.state=gt.NONE,this.target=new y,this.cursor=new y,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:hs.ROTATE,MIDDLE:hs.DOLLY,RIGHT:hs.PAN},this.touches={ONE:cs.ROTATE,TWO:cs.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new y,this._lastQuaternion=new mt,this._lastTargetPosition=new y,this._quat=new mt().setFromUnitVectors(e.up,new y(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ls,this._sphericalDelta=new ls,this._scale=1,this._panOffset=new y,this._rotateStart=new Ke,this._rotateEnd=new Ke,this._rotateDelta=new Ke,this._panStart=new Ke,this._panEnd=new Ke,this._panDelta=new Ke,this._dollyStart=new Ke,this._dollyEnd=new Ke,this._dollyDelta=new Ke,this._dollyDirection=new y,this._mouse=new Ke,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=A_.bind(this),this._onPointerDown=T_.bind(this),this._onPointerUp=R_.bind(this),this._onContextMenu=F_.bind(this),this._onMouseWheel=L_.bind(this),this._onKeyDown=D_.bind(this),this._onTouchStart=I_.bind(this),this._onTouchMove=N_.bind(this),this._onMouseDown=P_.bind(this),this._onMouseMove=C_.bind(this),this._interceptControlDown=U_.bind(this),this._interceptControlUp=k_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=gt.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(wh),this.update(),this.state=gt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Ot.copy(t).sub(this.target),Ot.applyQuaternion(this._quat),this._spherical.setFromVector3(Ot),this.autoRotate&&this.state===gt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,i=this.maxAzimuthAngle;isFinite(n)&&isFinite(i)&&(n<-Math.PI?n+=cn:n>Math.PI&&(n-=cn),i<-Math.PI?i+=cn:i>Math.PI&&(i-=cn),n<=i?this._spherical.theta=Math.max(n,Math.min(i,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+i)/2?Math.max(n,this._spherical.theta):Math.min(i,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let a=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const r=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),a=r!=this._spherical.radius}if(Ot.setFromSpherical(this._spherical),Ot.applyQuaternion(this._quatInverse),t.copy(this.target).add(Ot),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let r=null;if(this.object.isPerspectiveCamera){const o=Ot.length();r=this._clampDistance(o*this._scale);const c=o-r;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),a=!!c}else if(this.object.isOrthographicCamera){const o=new y(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),a=c!==this.object.zoom;const l=new y(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),r=Ot.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;r!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(r).add(this.object.position):(Va.origin.copy(this.object.position),Va.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Va.direction))<w_?this.object.lookAt(this.target):(Eh.setFromNormalAndCoplanarPoint(this.object.up,this.target),Va.intersectPlane(Eh,this.target))))}else if(this.object.isOrthographicCamera){const r=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),r!==this.object.zoom&&(this.object.updateProjectionMatrix(),a=!0)}return this._scale=1,this._performCursorZoom=!1,a||this._lastPosition.distanceToSquared(this.object.position)>lo||8*(1-this._lastQuaternion.dot(this.object.quaternion))>lo||this._lastTargetPosition.distanceToSquared(this.target)>lo?(this.dispatchEvent(wh),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?cn/60*this.autoRotateSpeed*e:cn/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Ot.setFromMatrixColumn(t,0),Ot.multiplyScalar(-e),this._panOffset.add(Ot)}_panUp(e,t){this.screenSpacePanning===!0?Ot.setFromMatrixColumn(t,1):(Ot.setFromMatrixColumn(t,0),Ot.crossVectors(this.object.up,Ot)),Ot.multiplyScalar(e),this._panOffset.add(Ot)}_pan(e,t){const n=this.domElement;if(this.object.isPerspectiveCamera){const i=this.object.position;Ot.copy(i).sub(this.target);let a=Ot.length();a*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*a/n.clientHeight,this.object.matrix),this._panUp(2*t*a/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),i=e-n.left,a=t-n.top,r=n.width,o=n.height;this._mouse.x=i/r*2-1,this._mouse.y=-(a/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientY),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(cn*this._rotateDelta.x/t.clientHeight),this._rotateUp(cn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(cn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-cn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(cn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-cn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._rotateStart.set(n,i)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panStart.set(n,i)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,a=Math.sqrt(n*n+i*i);this._dollyStart.set(0,a)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const n=this._getSecondPointerPosition(e),i=.5*(e.pageX+n.x),a=.5*(e.pageY+n.y);this._rotateEnd.set(i,a)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(cn*this._rotateDelta.x/t.clientHeight),this._rotateUp(cn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),i=.5*(e.pageY+t.y);this._panEnd.set(n,i)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),n=e.pageX-t.x,i=e.pageY-t.y,a=Math.sqrt(n*n+i*i);this._dollyEnd.set(0,a),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const r=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(r,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new Ke,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function T_(s){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(s.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(s)&&(this._addPointer(s),s.pointerType==="touch"?this._onTouchStart(s):this._onMouseDown(s),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function A_(s){this.enabled!==!1&&(s.pointerType==="touch"?this._onTouchMove(s):this._onMouseMove(s))}function R_(s){switch(this._removePointer(s),this._pointers.length){case 0:this.domElement.releasePointerCapture(s.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Gd),this.state=gt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function P_(s){let e;switch(s.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case hs.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(s),this.state=gt.DOLLY;break;case hs.ROTATE:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}break;case hs.PAN:if(s.ctrlKey||s.metaKey||s.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(s),this.state=gt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(s),this.state=gt.PAN}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Bc)}function C_(s){switch(this.state){case gt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(s);break;case gt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(s);break;case gt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(s);break}}function L_(s){this.enabled===!1||this.enableZoom===!1||this.state!==gt.NONE||(s.preventDefault(),this.dispatchEvent(Bc),this._handleMouseWheel(this._customWheelEvent(s)),this.dispatchEvent(Gd))}function D_(s){this.enabled!==!1&&this._handleKeyDown(s)}function I_(s){switch(this._trackPointer(s),this._pointers.length){case 1:switch(this.touches.ONE){case cs.ROTATE:if(this.enableRotate===!1){this.state=gt.NONE;break}this._handleTouchStartRotate(s),this.state=gt.TOUCH_ROTATE;break;case cs.PAN:if(this.enablePan===!1){this.state=gt.NONE;break}this._handleTouchStartPan(s),this.state=gt.TOUCH_PAN;break;default:this.state=gt.NONE}break;case 2:switch(this.touches.TWO){case cs.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(s),this.state=gt.TOUCH_DOLLY_PAN;break;case cs.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(s),this.state=gt.TOUCH_DOLLY_ROTATE;break;default:this.state=gt.NONE}break;default:this.state=gt.NONE}this.state!==gt.NONE&&this.dispatchEvent(Bc)}function N_(s){switch(this._trackPointer(s),this.state){case gt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(s),this.update();break;case gt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(s),this.update();break;case gt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(s),this.update();break;case gt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(s),this.update();break;default:this.state=gt.NONE}}function F_(s){this.enabled!==!1&&s.preventDefault()}function U_(s){s.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function k_(s){s.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Ln(s){let e=s>>>0;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}const ke=(s,e,t)=>s<e?e:s>t?t:s,O_=s=>ke(s,0,1),de=(s,e,t)=>s+(e-s)*t,Le=Math.PI/180;function re(s,e,t){const n=O_((t-s)/(e-s));return n*n*(3-2*n)}function gn(s,e){const t=s.length,n=ke(e,0,t-1),i=Math.min(Math.floor(n),t-2),a=n-i,r=s[Math.max(i-1,0)],o=s[i],c=s[i+1],l=s[Math.min(i+2,t-1)];return .5*(2*o+(-r+c)*a+(2*r-5*o+4*c-l)*a*a+(-r+3*o-3*c+l)*a*a*a)}function Pn(s,e,t,n){return de(s,e,1-Math.exp(-t*n))}function Th(s,e){let t=s*374761393+e*668265263|0;return t=Math.imul(t^t>>>13,1274126177),((t^t>>>16)>>>0)/4294967296}function kt(s,e=0){const t=Math.floor(s),n=s-t,i=n*n*(3-2*n);return de(Th(t,e),Th(t+1,e),i)*2-1}const Ee=(s,e,t)=>e+(t-e)*s();function z_(s,e,t,n=2){return e+(t-e)*Math.pow(s(),n)}class zi{constructor(e=6,t=.5){this.freq=e,this.zeta=t}freq;zeta;x=0;v=0;step(e,t){const n=this.freq*Math.PI*2,i=Math.max(1,Math.ceil(t*this.freq*8)),a=t/i;for(let r=0;r<i;r++)this.v+=(-n*n*(this.x-e)-2*this.zeta*n*this.v)*a,this.x+=this.v*a;return this.x}kick(e){this.v+=e}}const B_=`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`,G_=`
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform float uEnv;      // 1 when baking the env map: brighter top, no grain
uniform vec3 uBlobs[48];  // xyz dir
uniform vec2 uBlobR[48];  // radius, brightness
uniform float uBlobCos[48]; // cos(radius): outside it a disc adds nothing
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLite;
uniform vec3 uBokeh;

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  return n;
}

void main() {
  vec3 d = normalize(vDir);
  // Large soft value structure: leaves and gaps, way out of focus.
  float n = noise(d * 2.2 + vec3(0.0, 0.0, uTime * 0.01)) * 0.6 + noise(d * 4.7 - 3.1) * 0.4;
  vec3 deep = uDeep;
  vec3 mid  = uMid;
  vec3 lite = uLite;
  vec3 col = mix(deep, mid, smoothstep(0.25, 0.7, n));
  col = mix(col, lite, smoothstep(0.62, 0.9, n) * 0.6);
  // brighter canopy above, dark understory below
  float up = d.y;
  col *= mix(0.55, 1.15, smoothstep(-0.6, 0.7, up));
  // Bokeh discs
  for (int i = 0; i < 48; i++) {
    vec3 b = uBlobs[i];
    float cd = dot(d, b);
    if (cd < uBlobCos[i]) continue;
    float r = uBlobR[i].x;
    float a = acos(clamp(cd, -1.0, 1.0));
    float disc = 1.0 - smoothstep(r * 0.82, r, a);
    float rim = smoothstep(r * 0.6, r * 0.95, a) * disc;
    col += (lite * 0.5 + uBokeh) * uBlobR[i].y * (disc * 0.35 + rim * 0.25);
  }
  if (uEnv > 0.5) {
    col *= 1.0 + 1.6 * smoothstep(0.2, 1.0, up);       // sky through the canopy
    col += vec3(0.5, 0.55, 0.45) * pow(max(up, 0.0), 6.0);
    // the light a bird actually gets is greyer than the bokeh it sits in:
    // half the saturation, so the plumage keeps its own plum and bronze
    col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 0.45);
  } else {
    // a hair of grain so the gradients don't band
    col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`,H_={deep:[.05,.12,.055],mid:[.13,.32,.125],lite:[.26,.48,.23],bokeh:[.06,.08,0]};function V_(s=H_){const e=Ln(7),t=[],n=[];for(let r=0;r<48;r++){const o=(e()-.5)*Math.PI*2,c=(e()-.35)*1.2;t.push(new y(Math.sin(o)*Math.cos(c),Math.sin(c),-Math.cos(o)*Math.cos(c)).normalize()),n.push(new Ke(.06+e()*.14,.15+e()*.6))}const i=new Si({vertexShader:B_,fragmentShader:G_,uniforms:{uTime:{value:0},uEnv:{value:0},uBlobs:{value:t},uBlobR:{value:n},uBlobCos:{value:n.map(r=>Math.cos(r.x))},uDeep:{value:new y(...s.deep)},uMid:{value:new y(...s.mid)},uLite:{value:new y(...s.lite)},uBokeh:{value:new y(...s.bokeh)}},side:rn,depthWrite:!1}),a=new Nt(new Vi(50,64,32),i);return a.frustumCulled=!1,a.renderOrder=1e3,{mesh:a,material:i}}const Ct=new _n,Wa=new y,Ah=new Ke,Rh=new Ke,Ph=new Ke;class W_{constructor(e){this.geometry=e.geometry,this.randomFunction=Math.random,this.indexAttribute=this.geometry.index,this.positionAttribute=this.geometry.getAttribute("position"),this.normalAttribute=this.geometry.getAttribute("normal"),this.colorAttribute=this.geometry.getAttribute("color"),this.uvAttribute=this.geometry.getAttribute("uv"),this.weightAttribute=null,this.distribution=null}setWeightAttribute(e){return this.weightAttribute=e?this.geometry.getAttribute(e):null,this}build(){const e=this.indexAttribute,t=this.positionAttribute,n=this.weightAttribute,i=e?e.count/3:t.count/3,a=new Float32Array(i);for(let c=0;c<i;c++){let l=1,h=3*c,d=3*c+1,u=3*c+2;e&&(h=e.getX(h),d=e.getX(d),u=e.getX(u)),n&&(l=n.getX(h)+n.getX(d)+n.getX(u)),Ct.a.fromBufferAttribute(t,h),Ct.b.fromBufferAttribute(t,d),Ct.c.fromBufferAttribute(t,u),l*=Ct.getArea(),a[c]=l}const r=new Float32Array(i);let o=0;for(let c=0;c<i;c++)o+=a[c],r[c]=o;return this.distribution=r,this}setRandomGenerator(e){return this.randomFunction=e,this}sample(e,t,n,i){const a=this._sampleFaceIndex();return this._sampleFace(a,e,t,n,i)}_sampleFaceIndex(){const e=this.distribution[this.distribution.length-1];return this._binarySearch(this.randomFunction()*e)}_binarySearch(e){const t=this.distribution;let n=0,i=t.length-1,a=-1;for(;n<=i;){const r=Math.ceil((n+i)/2);if(r===0||t[r-1]<=e&&t[r]>e){a=r;break}else e<t[r]?i=r-1:n=r+1}return a}_sampleFace(e,t,n,i,a){let r=this.randomFunction(),o=this.randomFunction();r+o>1&&(r=1-r,o=1-o);const c=this.indexAttribute;let l=e*3,h=e*3+1,d=e*3+2;return c&&(l=c.getX(l),h=c.getX(h),d=c.getX(d)),Ct.a.fromBufferAttribute(this.positionAttribute,l),Ct.b.fromBufferAttribute(this.positionAttribute,h),Ct.c.fromBufferAttribute(this.positionAttribute,d),t.set(0,0,0).addScaledVector(Ct.a,r).addScaledVector(Ct.b,o).addScaledVector(Ct.c,1-(r+o)),n!==void 0&&(this.normalAttribute!==void 0?(Ct.a.fromBufferAttribute(this.normalAttribute,l),Ct.b.fromBufferAttribute(this.normalAttribute,h),Ct.c.fromBufferAttribute(this.normalAttribute,d),n.set(0,0,0).addScaledVector(Ct.a,r).addScaledVector(Ct.b,o).addScaledVector(Ct.c,1-(r+o)).normalize()):Ct.getNormal(n)),i!==void 0&&this.colorAttribute!==void 0&&(Ct.a.fromBufferAttribute(this.colorAttribute,l),Ct.b.fromBufferAttribute(this.colorAttribute,h),Ct.c.fromBufferAttribute(this.colorAttribute,d),Wa.set(0,0,0).addScaledVector(Ct.a,r).addScaledVector(Ct.b,o).addScaledVector(Ct.c,1-(r+o)),i.r=Wa.x,i.g=Wa.y,i.b=Wa.z),a!==void 0&&this.uvAttribute!==void 0&&(Ah.fromBufferAttribute(this.uvAttribute,l),Rh.fromBufferAttribute(this.uvAttribute,h),Ph.fromBufferAttribute(this.uvAttribute,d),a.set(0,0).addScaledVector(Ah,r).addScaledVector(Rh,o).addScaledVector(Ph,1-(r+o))),this}}function q_(s,e=!1){const t=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),a={},r={},o=s[0].morphTargetsRelative,c=new yt;c.morphTargetsRelative=o;let l=0;for(let h=0;h<s.length;++h){const d=s[h];let u=0,f=0;if(t!==(d.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const p in d.attributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;a[p]===void 0&&(a[p]=[]),a[p].push(d.attributes[p]),u++}if(u!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(o!==d.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const p in d.morphAttributes){if(!i.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;if(d.morphAttributes[p].length!==s[0].morphAttributes[p].length)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have the same number of morph targets for the "'+p+'" morph attribute.'),null;r[p]===void 0&&(r[p]=[]),r[p].push(d.morphAttributes[p]),f++}if(f!==i.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of morph attributes."),null;if(e){let p;if(t)p=d.index.count;else if(d.attributes.position!==void 0)p=d.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,p,h),l+=p}}if(t){let h=0;const d=[];for(let u=0;u<s.length;++u){const f=s[u].index;for(let p=0;p<f.count;++p)d.push(f.getX(p)+h);h+=s[u].attributes.position.count}c.setIndex(d)}for(const h in a){const d=Ch(a[h]);if(!d)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,d)}for(const h in r){const d=r[h][0].length;if(d!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let u=0;u<d;++u){const f=[];for(let b=0;b<r[h].length;++b)f.push(r[h][b][u]);const p=Ch(f);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(p)}}}return c}function Ch(s){let e,t,n,i=-1,a=0;for(let l=0;l<s.length;++l){const h=s[l];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;a+=h.count*t}const r=new e(a),o=new Dt(r,t,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const d=c/t;for(let u=0,f=h.count;u<f;u++)for(let p=0;p<t;p++){const b=h.getComponent(u,p);o.setComponent(u+d,p,b)}}else r.set(h.array,c);c+=h.count*t}return i!==void 0&&(o.gpuType=i),o}function Lh(s,e){if(e===Lu)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===sc||e===cd){let t=s.getIndex();if(t===null){const a=[],r=s.getAttribute("position");if(r!==void 0){for(let o=0;o<r.count;o++)a.push(o);s.setIndex(a),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}const n=t.count-2,i=[];if(e===sc)for(let a=1;a<=n;a++)i.push(t.getX(0)),i.push(t.getX(a)),i.push(t.getX(a+1));else for(let a=0;a<n;a++)a%2===0?(i.push(t.getX(a)),i.push(t.getX(a+1)),i.push(t.getX(a+2))):(i.push(t.getX(a+2)),i.push(t.getX(a+1)),i.push(t.getX(a)));return i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),s.setIndex(i),s.clearGroups(),s}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}function X_(s){const e=new Map,t=new Map,n=s.clone();return Hd(s,n,function(i,a){e.set(a,i),t.set(i,a)}),n.traverse(function(i){if(!i.isSkinnedMesh)return;const a=i,r=e.get(i),o=r.skeleton.bones;a.skeleton=r.skeleton.clone(),a.bindMatrix.copy(r.bindMatrix),a.skeleton.bones=o.map(function(c){return t.get(c)}),a.bind(a.skeleton,a.bindMatrix)}),n}function Hd(s,e,t){t(s,e);for(let n=0;n<s.children.length;n++)Hd(s.children[n],e.children[n],t)}class K_ extends Es{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new $_(t)}),this.register(function(t){return new Q_(t)}),this.register(function(t){return new ex(t)}),this.register(function(t){return new lx(t)}),this.register(function(t){return new hx(t)}),this.register(function(t){return new dx(t)}),this.register(function(t){return new nx(t)}),this.register(function(t){return new ix(t)}),this.register(function(t){return new sx(t)}),this.register(function(t){return new ax(t)}),this.register(function(t){return new Z_(t)}),this.register(function(t){return new rx(t)}),this.register(function(t){return new tx(t)}),this.register(function(t){return new cx(t)}),this.register(function(t){return new ox(t)}),this.register(function(t){return new Y_(t)}),this.register(function(t){return new Dh(t,ot.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new Dh(t,ot.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new ux(t)})}load(e,t,n,i){const a=this;let r;if(this.resourcePath!=="")r=this.resourcePath;else if(this.path!==""){const l=Zs.extractUrlBase(e);r=Zs.resolveURL(l,this.path)}else r=Zs.extractUrlBase(e);this.manager.itemStart(e);const o=function(l){i?i(l):console.error(l),a.manager.itemError(e),a.manager.itemEnd(e)},c=new Ad(this.manager);c.setPriority(this.priority),c.setCache(this.cache),c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{a.parse(l,r,function(h){t(h),a.manager.itemEnd(e)},o)}catch(h){o(h)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let a;const r={},o={},c=new TextDecoder;if(typeof e=="string")a=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Vd){try{r[ot.KHR_BINARY_GLTF]=new fx(e)}catch(d){i&&i(d);return}a=JSON.parse(r[ot.KHR_BINARY_GLTF].content)}else a=JSON.parse(c.decode(e));else a=e;if(a.asset===void 0||a.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new Tx(a,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,priority:this.priority,cache:this.cache,withCredentials:this.withCredentials,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const d=this.pluginCallbacks[h](l);d.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[d.name]=d,r[d.name]=!0}if(a.extensionsUsed)for(let h=0;h<a.extensionsUsed.length;++h){const d=a.extensionsUsed[h],u=a.extensionsRequired||[];switch(d){case ot.KHR_MATERIALS_UNLIT:r[d]=new J_;break;case ot.KHR_DRACO_MESH_COMPRESSION:r[d]=new px(a,this.dracoLoader);break;case ot.KHR_TEXTURE_TRANSFORM:r[d]=new mx;break;case ot.KHR_MESH_QUANTIZATION:r[d]=new gx;break;default:u.indexOf(d)>=0&&o[d]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+d+'".')}}l.setExtensions(r),l.setPlugins(o),l.parse(n,i)}parseAsync(e,t){const n=this;return new Promise(function(i,a){n.parse(e,t,i,a)})}}function j_(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}function It(s,e,t){const n=s.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}const ot={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DIFFUSE_ROUGHNESS:"KHR_materials_diffuse_roughness",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class Y_{constructor(e){this.parser=e,this.name=ot.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){const a=t[n];a.extensions&&a.extensions[this.name]&&a.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,a.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let i=t.cache.get(n);if(i)return i;const a=t.json,c=((a.extensions&&a.extensions[this.name]||{}).lights||[])[e];let l;const h=new me(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],pn);const d=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new cc(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new up(h),l.distance=d;break;case"spot":l=new hp(h),l.distance=d,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),Fn(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),i=Promise.resolve(l),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,a=n.json.nodes[e],o=(a.extensions&&a.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}}class J_{constructor(){this.name=ot.KHR_MATERIALS_UNLIT}getMaterialType(){return Oi}extendParams(e,t,n){const i=[];e.color=new me(1,1,1),e.opacity=1;const a=t.pbrMetallicRoughness;if(a){if(Array.isArray(a.baseColorFactor)){const r=a.baseColorFactor;e.color.setRGB(r[0],r[1],r[2],pn),e.opacity=r[3]}a.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",a.baseColorTexture,Xt))}return Promise.all(i)}}class Z_{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}}class $_{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(i.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){const a=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Ke(a,a)}return Promise.all(i)}}class Q_{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_DIFFUSE_ROUGHNESS}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return t.diffuseRoughness=n.diffuseRoughnessFactor!==void 0?n.diffuseRoughnessFactor:0,n.diffuseRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"diffuseRoughnessMap",n.diffuseRoughnessTexture)),Promise.all(i)}}class ex{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_DISPERSION}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}}class tx{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessMinimum=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessMaximum=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(i)}}class nx{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_SHEEN}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];if(t.sheenColor=new me(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){const a=n.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],pn)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,Xt)),n.sheenRoughnessTexture!==void 0&&i.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(i)}}class ix{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&i.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(i)}}class sx{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_VOLUME}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&i.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;const a=n.attenuationColor||[1,1,1];return t.attenuationColor=new me().setRGB(a[0],a[1],a[2],pn),Promise.all(i)}}class ax{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_IOR}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}}class rx{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_SPECULAR}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));const a=n.specularColorFactor||[1,1,1];return t.specularColor=new me().setRGB(a[0],a[1],a[2],pn),n.specularColorTexture!==void 0&&i.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,Xt)),Promise.all(i)}}class ox{constructor(e){this.parser=e,this.name=ot.EXT_MATERIALS_BUMP}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&i.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(i)}}class cx{constructor(e){this.parser=e,this.name=ot.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return It(this.parser,e,this.name)!==null?Bt:null}extendMaterialParams(e,t){const n=It(this.parser,e,this.name);if(n===null)return Promise.resolve();const i=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&i.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(i)}}class lx{constructor(e){this.parser=e,this.name=ot.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;const a=i.extensions[this.name],r=t.options.ktx2Loader;if(!r){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,a.source,r)}}class hx{constructor(e){this.parser=e,this.name=ot.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,i=n.json,a=i.textures[e];if(!a.extensions||!a.extensions[t])return null;const r=a.extensions[t],o=i.images[r.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,r.source,c)}}class dx{constructor(e){this.parser=e,this.name=ot.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,i=n.json,a=i.textures[e];if(!a.extensions||!a.extensions[t])return null;const r=a.extensions[t],o=i.images[r.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,r.source,c)}}class Dh{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const i=n.extensions[this.name],a=this.parser.getDependency("buffer",i.buffer),r=this.parser.options.meshoptDecoder;if(!r||!r.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return a.then(function(o){const c=i.byteOffset||0,l=i.byteLength||0,h=i.count,d=i.byteStride,u=new Uint8Array(o,c,l);return r.decodeGltfBufferAsync?r.decodeGltfBufferAsync(h,d,u,i.mode,i.filter).then(function(f){return f.buffer}):r.ready.then(function(){const f=new ArrayBuffer(h*d);return r.decodeGltfBuffer(new Uint8Array(f),h,d,u,i.mode,i.filter),f})})}else return null}}class ux{constructor(e){this.name=ot.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const i=t.meshes[n.mesh];for(const l of i.primitives)if(l.mode!==bn.TRIANGLES&&l.mode!==bn.TRIANGLE_STRIP&&l.mode!==bn.TRIANGLE_FAN&&l.mode!==void 0)return null;const r=n.extensions[this.name].attributes,o=[],c={};for(const l in r)o.push(this.parser.getDependency("accessor",r[l]).then(h=>(c[l]=h,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{const h=l.pop(),d=h.isGroup?h.children:[h],u=l[0].count,f=[];for(const p of d){const b=new Ve,g=new y,m=new mt,_=new y(1,1,1),S=new Lf(p.geometry,p.material,u);for(let w=0;w<u;w++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,w),c.ROTATION&&m.fromBufferAttribute(c.ROTATION,w),c.SCALE&&_.fromBufferAttribute(c.SCALE,w),S.setMatrixAt(w,b.compose(g,m,_));let v=null;for(const w in c)if(w==="_COLOR_0"){const E=c[w];S.instanceColor=new dr(E.array,E.itemSize,E.normalized)}else if(w!=="TRANSLATION"&&w!=="ROTATION"&&w!=="SCALE"){if(v===null){const x=S.geometry;v=new yt,v.name=x.name;for(const M in x.attributes)v.setAttribute(M,x.attributes[M]);for(const M in x.morphAttributes)v.morphAttributes[M]=x.morphAttributes[M];x.index!==null&&v.setIndex(x.index),v.morphTargetsRelative=x.morphTargetsRelative;for(const M of x.groups)v.addGroup(M.start,M.count,M.materialIndex);x.boundingBox!==null&&(v.boundingBox=x.boundingBox.clone()),x.boundingSphere!==null&&(v.boundingSphere=x.boundingSphere.clone()),v.drawRange.start=x.drawRange.start,v.drawRange.count=x.drawRange.count,v.userData=Object.assign({},x.userData),S.geometry=v}const E=c[w];v.setAttribute(w,new dr(E.array,E.itemSize,E.normalized))}Rt.prototype.copy.call(S,p),this.parser.assignFinalMaterial(S),f.push(S)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}}const Vd="glTF",ks=12,Ih={JSON:1313821514,BIN:5130562};class fx{constructor(e){this.name=ot.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,ks),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Vd)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const i=this.header.length-ks,a=new DataView(e,ks);let r=0;for(;r<i;){const o=a.getUint32(r,!0);r+=4;const c=a.getUint32(r,!0);if(r+=4,c===Ih.JSON){const l=new Uint8Array(e,ks+r,o);this.content=n.decode(l)}else if(c===Ih.BIN){const l=ks+r;this.body=e.slice(l,l+o)}r+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class px{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=ot.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,i=this.dracoLoader,a=e.extensions[this.name].bufferView,r=e.extensions[this.name].attributes,o={},c={},l={};for(const h in r){const d=uc[h]||h.toLowerCase();o[d]=r[h]}for(const h in e.attributes){const d=uc[h]||h.toLowerCase();if(r[h]!==void 0){const u=n.accessors[e.attributes[h]],f=ps[u.componentType];l[d]=f.name,c[d]=u.normalized===!0}}return t.getDependency("bufferView",a).then(function(h){return new Promise(function(d,u){i.decodeDracoFile(h,function(f){for(const p in f.attributes){const b=f.attributes[p],g=c[p];g!==void 0&&(b.normalized=g)}d(f)},o,l,pn,u)})})}}class mx{constructor(){this.name=ot.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){const n=Math.cos(e.rotation),i=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*i,e.offset.x,-e.repeat.x*i,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}}class gx{constructor(){this.name=ot.KHR_MESH_QUANTIZATION}}class Wd extends Ms{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,a=e*i*3+i;for(let r=0;r!==i;r++)t[r]=n[a+r];return t}interpolate_(e,t,n,i){const a=this.resultBuffer,r=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,h=i-t,d=(n-t)/h,u=d*d,f=u*d,p=e*l,b=p-l,g=-2*f+3*u,m=f-u,_=1-g,S=m-u+d;for(let v=0;v!==o;v++){const w=r[b+v+o],E=r[b+v+c]*h,x=r[p+v+o],M=r[p+v]*h;a[v]=_*w+S*E+g*x+m*M}return a}}const bx=new mt;class _x extends Wd{interpolate_(e,t,n,i){const a=super.interpolate_(e,t,n,i);return bx.fromArray(a).normalize().toArray(a),a}}const bn={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},ps={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Nh={9728:zt,9729:Kt,9984:td,9985:Qa,9986:Vs,9987:Bn},Fh={33071:zn,33648:rr,10497:Gi},ho={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},uc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},mi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},xx={CUBICSPLINE:void 0,LINEAR:na,STEP:ta},uo={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function vx(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new on({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:yi})),s.DefaultMaterial}function Fi(s,e,t){for(const n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Fn(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function yx(s,e,t){let n=!1,i=!1,a=!1;for(let l=0,h=e.length;l<h;l++){const d=e[l];if(d.POSITION!==void 0&&(n=!0),d.NORMAL!==void 0&&(i=!0),d.COLOR_0!==void 0&&(a=!0),n&&i&&a)break}if(!n&&!i&&!a)return Promise.resolve(s);const r=[],o=[],c=[];for(let l=0,h=e.length;l<h;l++){const d=e[l];if(n){const u=d.POSITION!==void 0?t.getDependency("accessor",d.POSITION):s.attributes.position;r.push(u)}if(i){const u=d.NORMAL!==void 0?t.getDependency("accessor",d.NORMAL):s.attributes.normal;o.push(u)}if(a){const u=d.COLOR_0!==void 0?t.getDependency("accessor",d.COLOR_0):s.attributes.color;c.push(u)}}return Promise.all([Promise.all(r),Promise.all(o),Promise.all(c)]).then(function(l){const h=l[0],d=l[1],u=l[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=d),a&&(s.morphAttributes.color=u),s.morphTargetsRelative=!0,s})}function Mx(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Sx(s){let e;const t=s.extensions&&s.extensions[ot.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+fo(t.attributes):e=s.indices+":"+fo(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+fo(s.targets[n]);return e}function fo(s){let e="";const t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function fc(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function wx(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Ex=new Ve;class Tx{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new j_,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,a=!1,r=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){const o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;const c=o.match(/Version\/(\d+)/);i=n&&c?parseInt(c[1],10):-1,a=o.indexOf("Firefox")>-1,r=a?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||a&&r<98?(this.textureLoader=new op(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)):(this.textureLoader=new pp(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setWithCredentials(this.options.withCredentials),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Ad(this.options.manager),this.fileLoader.setPriority(this.options.priority),this.fileLoader.setCache(this.options.cache),this.fileLoader.setResponseType("arraybuffer"),(this.options.withCredentials||this.options.crossOrigin==="use-credentials")&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,i=this.json,a=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(r){return r._markDefs&&r._markDefs()}),Promise.all(this._invokeAll(function(r){return r.beforeRoot&&r.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(r){const o={scene:r[0][i.scene||0],scenes:r[0],animations:r[1],cameras:r[2],asset:i.asset,parser:n,userData:{}};return Fi(a,o,i),Fn(o,i),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(const c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,a=t.length;i<a;i++){const r=t[i].joints;for(let o=0,c=r.length;o<c;o++)e[r[o]].isBone=!0}for(let i=0,a=e.length;i<a;i++){const r=e[i];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const i=n.clone(),a=(r,o)=>{const c=this.associations.get(r);c!=null&&this.associations.set(o,c);for(const[l,h]of r.children.entries())a(h,o.children[l])};return a(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const i=e(t[n]);if(i)return i}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let i=0;i<t.length;i++){const a=e(t[i]);a&&n.push(a)}return n}getDependency(e,t){const n=e+":"+t;let i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(a){return a.loadNode&&a.loadNode(t)});break;case"mesh":i=this._invokeOne(function(a){return a.loadMesh&&a.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(a){return a.loadBufferView&&a.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(a){return a.loadMaterial&&a.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(a){return a.loadTexture&&a.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(a){return a.loadAnimation&&a.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(a){return a!=this&&a.getDependency&&a.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(a,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[ot.KHR_BINARY_GLTF].body);const i=this.options;return new Promise(function(a,r){n.load(Zs.resolveURL(t.uri,i.path),a,void 0,function(){r(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const i=t.byteLength||0,a=t.byteOffset||0;return n.slice(a,a+i)})}loadAccessor(e){const t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){const r=ho[i.type],o=ps[i.componentType],c=i.normalized===!0,l=new o(i.count*r);return Promise.resolve(new Dt(l,r,c))}const a=[];return i.bufferView!==void 0?a.push(this.getDependency("bufferView",i.bufferView)):a.push(null),i.sparse!==void 0&&(a.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),a.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(a).then(function(r){const o=r[0],c=ho[i.type],l=ps[i.componentType],h=l.BYTES_PER_ELEMENT,d=h*c,u=i.byteOffset||0,f=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,p=i.normalized===!0;let b,g;if(f&&f!==d){const m=Math.floor(u/f),_="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+m+":"+i.count;let S=t.cache.get(_);S||(b=new l(o,m*f,i.count*f/h),S=new Sf(b,f/h),t.cache.add(_,S)),g=new Rc(S,c,u%f/h,p)}else o===null?b=new l(i.count*c):b=new l(o,u,i.count*c),g=new Dt(b,c,p);if(i.sparse!==void 0){const m=ho.SCALAR,_=ps[i.sparse.indices.componentType],S=i.sparse.indices.byteOffset||0,v=i.sparse.values.byteOffset||0,w=new _(r[1],S,i.sparse.count*m),E=new l(r[2],v,i.sparse.count*c);o!==null&&(g=new Dt(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let x=0,M=w.length;x<M;x++){const N=w[x];if(g.setX(N,E[x*c]),c>=2&&g.setY(N,E[x*c+1]),c>=3&&g.setZ(N,E[x*c+2]),c>=4&&g.setW(N,E[x*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=p}return g})}loadTexture(e){const t=this.json,n=this.options,a=t.textures[e].source,r=t.images[a];let o=this.textureLoader;if(r.uri){const c=n.manager.getHandler(r.uri);c!==null&&(o=c)}return this.loadTextureImage(e,a,o)}loadTextureImage(e,t,n){const i=this,a=this.json,r=a.textures[e],o=a.images[t],c=(o.uri||o.bufferView)+":"+r.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=r.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);const u=(a.samplers||{})[r.sampler]||{};return h.magFilter=Nh[u.magFilter]||Kt,h.minFilter=Nh[u.minFilter]||Bn,h.wrapS=Fh[u.wrapS]||Gi,h.wrapT=Fh[u.wrapT]||Gi,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==zt&&h.minFilter!==Kt,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,i=this.json,a=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const r=i.images[e],o=self.URL||self.webkitURL;let c=r.uri||"",l=!1,h;if(t.isKTX2Loader===!0&&r.bufferView!==void 0)h=n.getDependency("bufferView",r.bufferView).then(function(u){return new Promise(function(f,p){t.parse(u,f,p)})});else{if(r.bufferView!==void 0)c=n.getDependency("bufferView",r.bufferView).then(function(u){l=!0;const f=new Blob([u],{type:r.mimeType});return c=o.createObjectURL(f),c});else if(r.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");h=Promise.resolve(c).then(function(u){return new Promise(function(f,p){let b=f;t.isImageBitmapLoader===!0&&(b=function(g){const m=new jt(g);m.needsUpdate=!0,f(m)}),t.load(Zs.resolveURL(u,a.path),b,void 0,p)})})}const d=h.then(function(u){return l===!0&&o.revokeObjectURL(c),Fn(u,r),u.userData.mimeType=r.mimeType||wx(r.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=d,d}assignTexture(e,t,n,i){const a=this;return this.getDependency("texture",n.index).then(function(r){if(!r)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(r=r.clone(),r.channel=n.texCoord),a.extensions[ot.KHR_TEXTURE_TRANSFORM]){const o=n.extensions!==void 0?n.extensions[ot.KHR_TEXTURE_TRANSFORM]:void 0;if(o){const c=a.associations.get(r);r=a.extensions[ot.KHR_TEXTURE_TRANSFORM].extendTexture(r,o),a.associations.set(r,c)}}return i!==void 0&&(r.colorSpace=i),e[t]=r,r})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const i=t.attributes.tangent===void 0,a=t.attributes.color!==void 0,r=t.attributes.normal===void 0;if(e.isPoints){const o="PointsMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new xd,Hn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){const o="LineBasicMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new Lc,Hn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(i||a||r){let o="ClonedMaterial:"+n.uuid+":";i&&(o+="derivative-tangents:"),a&&(o+="vertex-colors:"),r&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),a&&(c.vertexColors=!0),r&&(c.flatShading=!0),i&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return on}loadMaterial(e){const t=this,n=this.json,i=this.extensions,a=n.materials[e];let r;const o={},c=a.extensions||{},l=[];if(c[ot.KHR_MATERIALS_UNLIT]){const d=i[ot.KHR_MATERIALS_UNLIT];r=d.getMaterialType(),l.push(d.extendParams(o,a,t))}else{const d=a.pbrMetallicRoughness||{};if(o.color=new me(1,1,1),o.opacity=1,Array.isArray(d.baseColorFactor)){const u=d.baseColorFactor;o.color.setRGB(u[0],u[1],u[2],pn),o.opacity=u[3]}d.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",d.baseColorTexture,Xt)),o.metalness=d.metallicFactor!==void 0?d.metallicFactor:1,o.roughness=d.roughnessFactor!==void 0?d.roughnessFactor:1,d.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",d.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",d.metallicRoughnessTexture))),r=this._invokeOne(function(u){return u.getMaterialType&&u.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(u){return u.extendMaterialParams&&u.extendMaterialParams(e,o)})))}a.doubleSided===!0&&(o.side=Lt);const h=a.alphaMode||uo.OPAQUE;if(h===uo.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===uo.MASK&&(o.alphaTest=a.alphaCutoff!==void 0?a.alphaCutoff:.5)),a.normalTexture!==void 0&&r!==Oi&&(l.push(t.assignTexture(o,"normalMap",a.normalTexture)),o.normalScale=new Ke(1,1),a.normalTexture.scale!==void 0)){const d=a.normalTexture.scale;o.normalScale.set(d,d)}if(a.occlusionTexture!==void 0&&r!==Oi&&(l.push(t.assignTexture(o,"aoMap",a.occlusionTexture)),a.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=a.occlusionTexture.strength)),a.emissiveFactor!==void 0&&r!==Oi){const d=a.emissiveFactor;o.emissive=new me().setRGB(d[0],d[1],d[2],pn)}return a.emissiveTexture!==void 0&&r!==Oi&&l.push(t.assignTexture(o,"emissiveMap",a.emissiveTexture,Xt)),Promise.all(l).then(function(){const d=new r(o);return a.name&&(d.name=a.name),Fn(d,a),t.associations.set(d,{materials:e}),a.extensions&&Fi(i,d,a),d})}createUniqueName(e){const t=vt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,i=this.primitiveCache;function a(o){return n[ot.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return Uh(c,o,t)})}const r=[];for(let o=0,c=e.length;o<c;o++){const l=e[o],h=Sx(l),d=i[h];if(d)r.push(d.promise);else{let u;l.extensions&&l.extensions[ot.KHR_DRACO_MESH_COMPRESSION]?u=a(l):u=Uh(new yt,l,t),l.mode===bn.TRIANGLE_STRIP?u=u.then(f=>Lh(f,cd)):l.mode===bn.TRIANGLE_FAN&&(u=u.then(f=>Lh(f,sc))),i[h]={primitive:l,promise:u},r.push(u)}}return Promise.all(r)}loadMesh(e){const t=this,n=this.json,i=this.extensions,a=n.meshes[e],r=a.primitives,o=[];for(let c=0,l=r.length;c<l;c++){const h=r[c].material===void 0?vx(this.cache):this.getDependency("material",r[c].material);o.push(h)}return o.push(t.loadGeometries(r)),Promise.all(o).then(async function(c){const l=c.slice(0,c.length-1),h=c[c.length-1],d=[];for(let f=0,p=h.length;f<p;f++){const b=h[f],g=r[f];let m;const _=l[f];if(g.mode===bn.TRIANGLES||g.mode===bn.TRIANGLE_STRIP||g.mode===bn.TRIANGLE_FAN||g.mode===void 0){const S=a.isSkinnedMesh===!0,v=b.hasAttribute("skinIndex")&&b.hasAttribute("skinWeight");S&&v===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),m=S&&v?new kn(b,_):new Nt(b,_),m.isSkinnedMesh===!0&&m.normalizeSkinWeights()}else if(g.mode===bn.LINES)m=new _d(b,_);else if(g.mode===bn.LINE_STRIP)m=new Dc(b,_);else if(g.mode===bn.LINE_LOOP)m=new If(b,_);else if(g.mode===bn.POINTS)m=new Nf(b,_);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(m.geometry.morphAttributes).length>0&&Mx(m,a),m.name=t.createUniqueName(a.name||"mesh_"+e),Fn(m,a),g.extensions&&Fi(i,m,g),t.assignFinalMaterial(m),d.push(m)}for(let f=0,p=d.length;f<p;f++)t.associations.set(d[f],{meshes:e,primitives:f});if(d.length===1)return a.extensions&&Fi(i,d[0],a),d[0];const u=new An;a.extensions&&Fi(i,u,a),t.associations.set(u,{meshes:e});for(let f=0,p=d.length;f<p;f++)u.add(d[f]);return u})}loadCamera(e){let t;const n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new ln(Js.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new Uc(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Fn(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let i=0,a=t.joints.length;i<a;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){const a=i.pop(),r=i,o=[],c=[];for(let l=0,h=r.length;l<h;l++){const d=r[l];if(d){o.push(d);const u=new Ve;a!==null&&u.fromArray(a.array,l*16),c.push(u)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new vr(o,c)})}loadAnimation(e){const t=this.json,n=this,i=t.animations[e],a=i.name?i.name:"animation_"+e,r=[],o=[],c=[],l=[],h=[];for(let d=0,u=i.channels.length;d<u;d++){const f=i.channels[d],p=i.samplers[f.sampler],b=f.target,g=b.node,m=i.parameters!==void 0?i.parameters[p.input]:p.input,_=i.parameters!==void 0?i.parameters[p.output]:p.output;b.node!==void 0&&(r.push(this.getDependency("node",g)),o.push(this.getDependency("accessor",m)),c.push(this.getDependency("accessor",_)),l.push(p),h.push(b))}return Promise.all([Promise.all(r),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(d){const u=d[0],f=d[1],p=d[2],b=d[3],g=d[4],m=[];for(let S=0,v=u.length;S<v;S++){const w=u[S],E=f[S],x=p[S],M=b[S],N=g[S];if(w===void 0)continue;w.updateMatrix&&w.updateMatrix();const P=n._createAnimationTracks(w,E,x,M,N);if(P)for(let I=0;I<P.length;I++)m.push(P[I])}const _=new ep(a,void 0,m);return Fn(_,i),_})}createNodeMesh(e){const t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(a){const r=n._getNodeRef(n.meshCache,i.mesh,a);return i.weights!==void 0&&r.traverse(function(o){if(o.isMesh)for(let c=0,l=i.weights.length;c<l;c++)o.morphTargetInfluences[c]=i.weights[c]}),r})}loadNode(e){const t=this.json,n=this,i=t.nodes[e],a=n._loadNodeShallow(e),r=[],o=i.children||[];for(let l=0,h=o.length;l<h;l++)r.push(n.getDependency("node",o[l]));const c=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([a,Promise.all(r),c]).then(function(l){const h=l[0],d=l[1],u=l[2];u!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(u,Ex)});for(let f=0,p=d.length;f<p;f++)h.add(d[f]);if(h.userData.pivot!==void 0&&d.length>0){const f=h.userData.pivot,p=d[0];h.pivot=new y().fromArray(f),h.position.x-=f[0],h.position.y-=f[1],h.position.z-=f[2],p.position.set(0,0,0),delete h.userData.pivot}return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const a=t.nodes[e],r=a.name?i.createUniqueName(a.name):"",o=[],c=i._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),a.camera!==void 0&&o.push(i.getDependency("camera",a.camera).then(function(l){return i._getNodeRef(i.cameraCache,a.camera,l)})),i._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let h;if(a.isBone===!0?h=new Pc:l.length>1?h=new An:l.length===1?h=l[0]:h=new Rt,h!==l[0])for(let d=0,u=l.length;d<u;d++)h.add(l[d]);if(a.name&&(h.userData.name=a.name,h.name=r),Fn(h,a),a.extensions&&Fi(n,h,a),a.matrix!==void 0){const d=new Ve;d.fromArray(a.matrix),h.applyMatrix4(d)}else a.translation!==void 0&&h.position.fromArray(a.translation),a.rotation!==void 0&&h.quaternion.fromArray(a.rotation),a.scale!==void 0&&h.scale.fromArray(a.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(a.mesh!==void 0&&i.meshCache.refs[a.mesh]>1){const d=i.associations.get(h);i.associations.set(h,{...d})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],i=this,a=new An;n.name&&(a.name=i.createUniqueName(n.name)),Fn(a,n),n.extensions&&Fi(t,a,n);const r=n.nodes||[],o=[];for(let c=0,l=r.length;c<l;c++)o.push(i.getDependency("node",r[c]));return Promise.all(o).then(function(c){for(let h=0,d=c.length;h<d;h++){const u=c[h];u.parent!==null?a.add(X_(u)):a.add(u)}const l=h=>{const d=new Map;for(const[u,f]of i.associations)(u instanceof Hn||u instanceof jt)&&d.set(u,f);return h.traverse(u=>{const f=i.associations.get(u);f!=null&&d.set(u,f)}),d};return i.associations=l(a),a})}_createAnimationTracks(e,t,n,i,a){const r=[],o=e.name?e.name:e.uuid,c=[];function l(f){f.morphTargetInfluences&&c.push(f.name?f.name:f.uuid)}mi[a.path]===mi.weights?(l(e),e.isGroup&&e.children.forEach(l)):c.push(o);let h;switch(mi[a.path]){case mi.weights:h=ra;break;case mi.rotation:h=oa;break;case mi.translation:case mi.scale:h=mr;break;default:n.itemSize===1?h=ra:h=mr;break}const d=i.interpolation!==void 0?xx[i.interpolation]:na,u=this._getArrayFromAccessor(n);for(let f=0,p=c.length;f<p;f++){const b=new h(c[f]+"."+mi[a.path],t.array,u,d);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(b),r.push(b)}return r}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=fc(t.constructor),i=new Float32Array(t.length);for(let a=0,r=t.length;a<r;a++)i[a]=t[a]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const i=this instanceof oa?_x:Wd;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Ax(s,e,t){const n=e.attributes,i=new Kn;if(n.POSITION!==void 0){const o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(i.set(new y(c[0],c[1],c[2]),new y(l[0],l[1],l[2])),o.normalized){const h=fc(ps[o.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const a=e.targets;if(a!==void 0){const o=new y,c=new y;for(let l=0,h=a.length;l<h;l++){const d=a[l];if(d.POSITION!==void 0){const u=t.json.accessors[d.POSITION],f=u.min,p=u.max;if(f!==void 0&&p!==void 0){if(c.setX(Math.max(Math.abs(f[0]),Math.abs(p[0]))),c.setY(Math.max(Math.abs(f[1]),Math.abs(p[1]))),c.setZ(Math.max(Math.abs(f[2]),Math.abs(p[2]))),u.normalized){const b=fc(ps[u.componentType]);c.multiplyScalar(b)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(o)}s.boundingBox=i;const r=new vn;i.getCenter(r.center),r.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=r}function Uh(s,e,t){const n=e.attributes,i=[];function a(r,o){return t.getDependency("accessor",r).then(function(c){s.setAttribute(o,c)})}for(const r in n){const o=uc[r]||r.toLowerCase();o in s.attributes||i.push(a(n[r],o))}if(e.indices!==void 0&&!s.index){const r=t.getDependency("accessor",e.indices).then(function(o){s.setIndex(o)});i.push(r)}return lt.workingColorSpace!==pn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${lt.workingColorSpace}" not supported.`),Fn(s,e),Ax(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?yx(s,e.targets,t):s})}var Rx=(function(){var s="b9H79Tebbbe8Fv9Gbb9Gvuuuuueu9Giuuub9Geueu9Giuuueuixkbeeeddddillviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbeY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVbdE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbiL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtblK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WboY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbrl79IV9Rbwq:VZkdbk:XYi5ud9:du8Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaicefhxcj;abad9Uc;WFbGcjdadca0EhmaialfgPar9Rgoadfhsavaoadz:jjjjbgzceVhHcbhOdndninaeaO9nmeaPax9RaD6mdamaeaO9RaOamfgoae6EgAcsfglc9WGhCabaOad2fhXaAcethQaxaDfhiaOaeaoaeao6E9RhLalcl4cifcd4hKazcj;cbfaAfhYcbh8AazcjdfhEaHh3incbh5dnawTmbaxa8Acd4fRbbh5kcbh8Eazcj;cbfhqinaih8Fdndndndna5a8Ecet4ciGgoc9:fPdebdkaPa8F9RaA6mrazcj;cbfa8EaA2fa8FaAz:jjjjb8Aa8FaAfhixdkazcj;cbfa8EaA2fcbaAz:kjjjb8Aa8FhixekaPa8F9RaK6mva8FaKfhidnaCTmbaPai9RcK6mbaocdtc:q:G:cjbfcj:G:cjbawEhaczhrcbhlinargoc9Wfghaqfhrdndndndndndnaaa8Fahco4fRbbalcoG4ciGcdtfydbPDbedvivvvlvkar9cb83bwar9cb83bbxlkarcbaiRbdai8Xbb9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbaqaofgrcGfcbaicdfa8J9c8N1:NfghRbbag9cjjjjjw:dg8J9qE86bbarcVfcbaha8J9c8M1:NfghRbbag9cjjjjjl:dg8J9qE86bbarc7fcbaha8J9c8L1:NfghRbbag9cjjjjjd:dg8J9qE86bbarctfcbaha8J9c8K1:NfghRbbag9cjjjjje:dg8J9qE86bbarc91fcbaha8J9c8J1:NfghRbbag9cjjjj;ab:dg8J9qE86bbarc4fcbaha8J9cg1:NfghRbbag9cjjjja:dg8J9qE86bbarc93fcbaha8J9ch1:NfghRbbag9cjjjjz:dgg9qE86bbarc94fcbahag9ca1:NfghRbbai8Xbe9c:c:qj:bw9:9c:q;c1:I1e:d9c:b:c:e1z9:gg9cjjjjjz:dg8J9qE86bbarc95fcbaha8J9c8N1:NfgiRbbag9cjjjjjw:dg8J9qE86bbarc96fcbaia8J9c8M1:NfgiRbbag9cjjjjjl:dg8J9qE86bbarc97fcbaia8J9c8L1:NfgiRbbag9cjjjjjd:dg8J9qE86bbarc98fcbaia8J9c8K1:NfgiRbbag9cjjjjje:dg8J9qE86bbarc99fcbaia8J9c8J1:NfgiRbbag9cjjjj;ab:dg8J9qE86bbarc9:fcbaia8J9cg1:NfgiRbbag9cjjjja:dg8J9qE86bbarcufcbaia8J9ch1:NfgiRbbag9cjjjjz:dgg9qE86bbaiag9ca1:NfhixikaraiRblaiRbbghco4g8Ka8KciSg8KE86bbaqaofgrcGfaiclfa8Kfg8KRbbahcl4ciGg8La8LciSg8LE86bbarcVfa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc7fa8Ka8Lfg8KRbbahciGghahciSghE86bbarctfa8Kahfg8KRbbaiRbeghco4g8La8LciSg8LE86bbarc91fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc4fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc93fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc94fa8Kahfg8KRbbaiRbdghco4g8La8LciSg8LE86bbarc95fa8Ka8Lfg8KRbbahcl4ciGg8La8LciSg8LE86bbarc96fa8Ka8Lfg8KRbbahcd4ciGg8La8LciSg8LE86bbarc97fa8Ka8Lfg8KRbbahciGghahciSghE86bbarc98fa8KahfghRbbaiRbigico4g8Ka8KciSg8KE86bbarc99faha8KfghRbbaicl4ciGg8Ka8KciSg8KE86bbarc9:faha8KfghRbbaicd4ciGg8Ka8KciSg8KE86bbarcufaha8KfgrRbbaiciGgiaiciSgiE86bbaraifhixdkaraiRbwaiRbbghcl4g8Ka8KcsSg8KE86bbaqaofgrcGfaicwfa8Kfg8KRbbahcsGghahcsSghE86bbarcVfa8KahfghRbbaiRbeg8Kcl4g8La8LcsSg8LE86bbarc7faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarctfaha8KfghRbbaiRbdg8Kcl4g8La8LcsSg8LE86bbarc91faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc4faha8KfghRbbaiRbig8Kcl4g8La8LcsSg8LE86bbarc93faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc94faha8KfghRbbaiRblg8Kcl4g8La8LcsSg8LE86bbarc95faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc96faha8KfghRbbaiRbvg8Kcl4g8La8LcsSg8LE86bbarc97faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc98faha8KfghRbbaiRbog8Kcl4g8La8LcsSg8LE86bbarc99faha8LfghRbba8KcsGg8Ka8KcsSg8KE86bbarc9:faha8KfghRbbaiRbrgicl4g8Ka8KcsSg8KE86bbarcufaha8KfgrRbbaicsGgiaicsSgiE86bbaraifhixekarai8Pbw83bwarai8Pbb83bbaiczfhikdnaoaC9pmbalcdfhlaoczfhraPai9RcL0mekkaoaC6moaimexokaCmva8FTmvkaqaAfhqa8Ecefg8Ecl9hmbkdndndndnawTmbasa8Acd4fRbbgociGPlbedrbkaATmdaza8Afh8Fazcj;cbfhhcbh8EaEhaina8FRbbhraahocbhlinaoahalfRbbgqce4cbaqceG9R7arfgr86bbaoadfhoaAalcefgl9hmbkaacefhaa8Fcefh8FahaAfhha8Ecefg8Ecl9hmbxikkaATmeaza8Afhaazcj;cbfhhcbhoceh8EaYh8FinaEaofhlaa8Vbbhrcbhoinala8FaofRbbcwtahaofRbbgqVc;:FiGce4cbaqceG9R7arfgr87bbaladfhlaLaocefgofmbka8FaQfh8FcdhoaacdfhaahaQfhha8EceGhlcbh8EalmbxdkkaATmbaocl4h8Eaza8AfRbbhqcwhoa3hlinalRbbaotaqVhqalcefhlaocwfgoca9hmbkcbhhaEh8FaYhainazcj;cbfahfRbbhrcwhoaahlinalRbbaotarVhralaAfhlaocwfgoca9hmbkara8E94aq7hqcbhoa8Fhlinalaqao486bbalcefhlaocwfgoca9hmbka8Fadfh8FaacefhaahcefghaA9hmbkkaEclfhEa3clfh3a8Aclfg8Aad6mbkaXazcjdfaAad2z:jjjjb8AazazcjdfaAcufad2fadz:jjjjb8AaAaOfhOaihxaimbkc9:hoxdkcbc99aPax9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaok:ysezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecjez:kjjjb8Aav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk:Lvoeue99dud99eud99dndnadcl9hmbaeTmeindndnabcdfgd8Sbb:Yab8Sbbgi:Ygl:l:tabcefgv8Sbbgo:Ygr:l:tgwJbb;:9cawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai86bbdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad86bbdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad86bbabclfhbaecufgembxdkkaeTmbindndnabclfgd8Ueb:Yab8Uebgi:Ygl:l:tabcdfgv8Uebgo:Ygr:l:tgwJb;:FSawawNJbbbbawawJbbbb9GgDEgq:mgkaqaicb9iEalMgwawNakaqaocb9iEarMgqaqNMM:r:vglNJbbbZJbbb:;aDEMgr:lJbbb9p9DTmbar:Ohixekcjjjj94hikadai87ebdndnaqalNJbbbZJbbb:;aqJbbbb9GEMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkavad87ebdndnawalNJbbbZJbbb:;awJbbbb9GEMgw:lJbbb9p9DTmbaw:Ohdxekcjjjj94hdkabad87ebabcwfhbaecufgembkkk:4ioiue99dud99dud99dnaeTmbcbhiabhlindndnal8Uebgv:YgoJ:ji:1Salcof8UebgrciVgw:Y:vgDNJbbbZJbbb:;avcu9kEMgq:lJbbb9p9DTmbaq:Ohkxekcjjjj94hkkalclf8Uebhvalcdf8UebhxalarcefciGcetfak87ebdndnax:YgqaDNJbbbZJbbb:;axcu9kEMgm:lJbbb9p9DTmbam:Ohxxekcjjjj94hxkabaiarciGgkfcd7cetfax87ebdndnav:YgmaDNJbbbZJbbb:;avcu9kEMgP:lJbbb9p9DTmbaP:Ohvxekcjjjj94hvkalarcufciGcetfav87ebdndnawaw2:ZgPaPMaoaoN:taqaqN:tamamN:tgoJbbbbaoJbbbb9GE:raDNJbbbZMgD:lJbbb9p9DTmbaD:Ohrxekcjjjj94hrkalakcetfar87ebalcwfhlaiclfhiaecufgembkkk9mbdnadcd4ae2gdTmbinababydbgecwtcw91:Yaece91cjjj98Gcjjj;8if::NUdbabclfhbadcufgdmbkkk:Tvirud99eudndnadcl9hmbaeTmeindndnabRbbgiabcefgl8Sbbgvabcdfgo8Sbbgrf9R:YJbbuJabcifgwRbbgdce4adVgDcd4aDVgDcl4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax86bbdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao86bbdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai86bbdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad86bbabclfhbaecufgembxdkkaeTmbindndnab8Vebgiabcdfgl8Uebgvabclfgo8Uebgrf9R:YJbFu9habcofgw8Vebgdce4adVgDcd4aDVgDcl4aDVgDcw4aDVgD:Z:vgqNJbbbZMgk:lJbbb9p9DTmbak:Ohxxekcjjjj94hxkaoax87ebdndnaraif:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohoxekcjjjj94hokalao87ebdndnavaifar9R:YaqNJbbbZMgk:lJbbb9p9DTmbak:Ohixekcjjjj94hikabai87ebdndnaDadcetGadceGV:ZaqNJbbbZMgq:lJbbb9p9DTmbaq:Ohdxekcjjjj94hdkawad87ebabcwfhbaecufgembkkk9teiucbcbyd:K:G:cjbgeabcifc98GfgbBd:K:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaik;LeeeudndnaeabVciGTmbabhixekdndnadcz9pmbabhixekabhiinaiaeydbBdbaiclfaeclfydbBdbaicwfaecwfydbBdbaicxfaecxfydbBdbaeczfheaiczfhiadc9Wfgdcs0mbkkadcl6mbinaiaeydbBdbaeclfheaiclfhiadc98fgdci0mbkkdnadTmbinaiaeRbb86bbaicefhiaecefheadcufgdmbkkabk;aeedudndnabciGTmbabhixekaecFeGc:b:c:ew2hldndnadcz9pmbabhixekabhiinaialBdbaicxfalBdbaicwfalBdbaiclfalBdbaiczfhiadc9Wfgdcs0mbkkadcl6mbinaialBdbaiclfhiadc98fgdci0mbkkdnadTmbinaiae86bbaicefhiadcufgdmbkkabkk83dbcj:Gdk8Kbbbbdbbblbbbwbbbbbbbebbbdbbblbbbwbbbbc:K:Gdkl8W:qbb",e="b9H79TebbbeKl9Gbb9Gvuuuuueu9Giuuub9Geueuixkbbebeeddddilve9Weeeviebeoweuecj:Gdkr;Neqo9TW9T9VV95dbH9F9F939H79T9F9J9H229F9Jt9VV7bb8A9TW79O9V9Wt9F9KW9J9V9KW9wWVtW949c919M9MWVbdY9TW79O9V9Wt9F9KW9J9V9KW69U9KW949c919M9MWVblE9TW79O9V9Wt9F9KW9J9V9KW69U9KW949tWG91W9U9JWbvL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9p9JtboK9TW79O9V9Wt9F9KW9J9V9KWS9P2tWV9r919HtbrL9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVT949WbwY9TW79O9V9Wt9F9KW9J9V9KWS9P2tWVJ9V29VVbDl79IV9Rbqq:W9Dklbzik94evu8Jjjjjbcz9Rhbcbheincbhdcbhiinabcwfadfaicjuaead4ceGglE86bbaialfhiadcefgdcw9hmbkaeai86b:q:W:cjbaecitab8Piw83i:q:G:cjbaecefgecjd9hmbkk:JBl8Aud97dur978Jjjjjbcj;kb9Rgv8Kjjjjbc9:hodnalTmbcuhoaiRbbgrc;WeGc:Ge9hmbarcsGgwce0mbc9:hoalcufadcd4cbawEgDadfgrcKcaawEgqaraq0Egk6mbaialfgxar9RhodnadTgmmbavaoad;8qbbkaicefhPcj;abad9Uc;WFbGcjdadca0EhsdndndnadTmbaoadfhzcbhHinaeaH9nmdaxaP9RaD6miabaHad2fhOaPaDfhAasaeaH9RaHasfae6EgCcsfgocl4cifcd4hXavcj;cbfaoc9WGgQcetfhLavcj;cbfaQci2fhKavcj;cbfaQfhYcbh8Aaoc;ab6hEincbh3dnawTmbaPa8Acd4fRbbh3kcbh5avcj;cbfh8Eindndndndna3a5cet4ciGgoc9:fPdebdkaxaA9RaQ6mwdnaQTmbavcj;cbfa5aQ2faAaQ;8qbbkaAaCfhAxdkaQTmeavcj;cbfa5aQ2fcbaQ;8kbxekaxaA9RaX6moaoclVcbawEhraAaXfhocbhidnaEmbaxao9Rc;Gb6mbcbhlina8EalfhidndndndndndnaAalco4fRbbgqciGarfPDbedibledibkaipxbbbbbbbbbbbbbbbbpklbxlkaiaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiaopbbbpklbaoczfhoxekaiaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcd4ciGarfPDbedibledibkaiczfpxbbbbbbbbbbbbbbbbpklbxlkaiczfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaiczfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaiczfaopbbbpklbaoczfhoxekaiczfaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqcl4ciGarfPDbedibledibkaicafpxbbbbbbbbbbbbbbbbpklbxlkaicafaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaoclffagRb:q:W:cjbfhoxikaicafaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbahaocwffagRb:q:W:cjbfhoxdkaicafaopbbbpklbaoczfhoxekaicafaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbahaocdffagRb:q:W:cjbfhokdndndndndndnaqco4arfPDbedibledibkaic8Wfpxbbbbbbbbbbbbbbbbpklbxlkaic8Wfaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaoclffaqRb:q:W:cjbfhoxikaic8Wfaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Ngicitpbi:q:G:cjbaiRb:q:W:cjbgipsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Ngqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spklbaiaocwffaqRb:q:W:cjbfhoxdkaic8Wfaopbbbpklbaoczfhoxekaic8WfaopbbdaoRbbgicitpbi:q:G:cjbaiRb:q:W:cjbgipsaoRbegqcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpklbaiaocdffaqRb:q:W:cjbfhokalc;abfhialcjefaQ0meaihlaxao9Rc;Fb0mbkkdnaiaQ9pmbaici4hlinaxao9RcK6mwa8EaifhqdndndndndndnaAaico4fRbbalcoG4ciGarfPDbedibledibkaqpxbbbbbbbbbbbbbbbbpkbbxlkaqaopbblaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLg8Fcdp:mea8FpmbzeHdOiAlCvXoQrLpxiiiiiiiiiiiiiiiip9ogapxiiiiiiiiiiiiiiiip8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaoclffagRb:q:W:cjbfhoxikaqaopbbwaopbbbg8Fclp:mea8FpmbzeHdOiAlCvXoQrLpxssssssssssssssssp9ogapxssssssssssssssssp8Jg8Fp5b9cjF;8;4;W;G;ab9:9cU1:Nghcitpbi:q:G:cjbahRb:q:W:cjbghpsa8Fp5e9cjF;8;4;W;G;ab9:9cU1:Nggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPaaa8Fp9spkbbahaocwffagRb:q:W:cjbfhoxdkaqaopbbbpkbbaoczfhoxekaqaopbbdaoRbbghcitpbi:q:G:cjbahRb:q:W:cjbghpsaoRbeggcitpbi:q:G:cjbp9UpmbedilvorzHOACXQLpPpkbbahaocdffagRb:q:W:cjbfhokalcdfhlaiczfgiaQ6mbkkaohAaoTmoka8EaQfh8Ea5cefg5cl9hmbkdndndndnawTmbaza8Acd4fRbbglciGPlbedwbkaQTmdavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep9Ta8Fpxeeeeeeeeeeeeeeeegap9op9Hp9rg8Fa8Jp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ug8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp9Ug8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep9Ta8Faap9op9Hp9rg8Fp9Ugap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp9Ugap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp9Ugap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp9Ug8Jp9AbbbaladfhlaoczfgoaQ6mbxikkaQTmeavcjdfa8Afhlava8Afpbdbh8Jcbhoinalavcj;cbfaofpblbg8KaYaofpblbg8LpmbzeHdOiAlCvXoQrLg8MaLaofpblbg8NaKaofpblbgypmbzeHdOiAlCvXoQrLg8PpmbezHdiOAlvCXorQLg8Fcep:nea8Fpxebebebebebebebebgap9op:bep9rg8Fa8Jp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ma8PpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwKDYq8AkEx3m5P8Es8Fg8Ka8NaypmwKDYq8AkEx3m5P8Es8Fg8LpmbezHdiOAlvCXorQLg8Fcep:nea8Faap9op:bep9rg8Fp:oeg8Jp9Abbbaladfgla8Ja8Fa8Fpmlvorlvorlvorlvorp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmwDqkwDqkwDqkwDqkp:oeg8Jp9Abbbaladfgla8Ja8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9Abbbaladfgla8Ja8Ka8LpmwDKYqk8AExm35Ps8E8Fg8Fcep:nea8Faap9op:bep9rg8Fp:oegap9Abbbaladfglaaa8Fa8Fpmlvorlvorlvorlvorp:oegap9Abbbaladfglaaa8Fa8FpmwDqkwDqkwDqkwDqkp:oegap9Abbbaladfglaaa8Fa8FpmxmPsxmPsxmPsxmPsp:oeg8Jp9AbbbaladfhlaoczfgoaQ6mbxdkkaQTmbcbhocbalcl4gl9Rc8FGhiavcjdfa8Afhrava8Afpbdbhainaravcj;cbfaofpblbg8JaYaofpblbg8KpmbzeHdOiAlCvXoQrLg8LaLaofpblbg8MaKaofpblbg8NpmbzeHdOiAlCvXoQrLgypmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Faap9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8LaypmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwKDYq8AkEx3m5P8Es8Fg8Ja8Ma8NpmwKDYq8AkEx3m5P8Es8Fg8KpmbezHdiOAlvCXorQLg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9Abbbaradfgraaa8Ja8KpmwDKYqk8AExm35Ps8E8Fg8Faip:Rea8Falp:Tep9qg8Fp9rgap9Abbbaradfgraaa8Fa8Fpmlvorlvorlvorlvorp9rgap9Abbbaradfgraaa8Fa8FpmwDqkwDqkwDqkwDqkp9rgap9Abbbaradfgraaa8Fa8FpmxmPsxmPsxmPsxmPsp9rgap9AbbbaradfhraoczfgoaQ6mbkka8Aclfg8Aad6mbkdnaCad2goTmbaOavcjdfao;8qbbkdnammbavavcjdfaCcufad2fad;8qbbkaCaHfhHc9:hoaAhPaAmbxlkkaeTmbaDalfhrcbhocuhlinaralaD9RglfaD6mdasaeao9Raoasfae6Eaofgoae6mbkaial9RhPkcbc99axaP9RakSEhoxekc9:hokavcj;kbf8Kjjjjbaokwbz:bjjjbkNsezu8Jjjjjbc;ae9Rgv8Kjjjjbc9:hodnalaeci9UgrcHf6mbcuhoaiRbbgwc;WeGc;Ge9hmbawcsGgDce0mbavc;abfcFecje;8kbav9cu83iUav9cu83i8Wav9cu83iyav9cu83iaav9cu83iKav9cu83izav9cu83iwav9cu83ibaialfc9WfhqaicefgwarfhldnaeTmbcmcsaDceSEhkcbhxcbhmcbhrcbhicbhoindnalaq9nmbc9:hoxikdndnawRbbgDc;Ve0mbavc;abfaoaDcu7gPcl4fcsGcitfgsydlhzasydbhHdndnaDcsGgsak9pmbavaiaPfcsGcdtfydbaxasEhDaxasTgOfhxxekdndnascsSmbcehOasc987asamffcefhDxekalcefhDal8SbbgscFeGhPdndnascu9mmbaDhlxekalcvfhlaPcFbGhPcrhsdninaD8SbbgOcFbGastaPVhPaOcu9kmeaDcefhDascrfgsc8J9hmbxdkkaDcefhlkcehOaPce4cbaPceG9R7amfhDkaDhmkavc;abfaocitfgsaDBdbasazBdlavaicdtfaDBdbavc;abfaocefcsGcitfgsaHBdbasaDBdlaocdfhoaOaifhidnadcd9hmbabarcetfgsaH87ebasclfaD87ebascdfaz87ebxdkabarcdtfgsaHBdbascwfaDBdbasclfazBdbxekdnaDcpe0mbavaiaqaDcsGfRbbgscl4gP9RcsGcdtfydbaxcefgOaPEhDavaias9RcsGcdtfydbaOaPTgzfgOascsGgPEhsaPThPdndnadcd9hmbabarcetfgHax87ebaHclfas87ebaHcdfaD87ebxekabarcdtfgHaxBdbaHcwfasBdbaHclfaDBdbkavaicdtfaxBdbavc;abfaocitfgHaDBdbaHaxBdlavaicefgicsGcdtfaDBdbavc;abfaocefcsGcitfgHasBdbaHaDBdlavaiazfgicsGcdtfasBdbavc;abfaocdfcsGcitfgDaxBdbaDasBdlaocifhoaiaPfhiaOaPfhxxekaxcbalRbbgsEgHaDc;:eSgDfhOascsGhAdndnascl4gCmbaOcefhzxekaOhzavaiaC9RcsGcdtfydbhOkdndnaAmbazcefhxxekazhxavaias9RcsGcdtfydbhzkdndnaDTmbalcefhDxekalcdfhDal8SbegPcFeGhsdnaPcu9kmbalcofhHascFbGhscrhldninaD8SbbgPcFbGaltasVhsaPcu9kmeaDcefhDalcrfglc8J9hmbkaHhDxekaDcefhDkasce4cbasceG9R7amfgmhHkdndnaCcsSmbaDhsxekaDcefhsaD8SbbglcFeGhPdnalcu9kmbaDcvfhOaPcFbGhPcrhldninas8SbbgDcFbGaltaPVhPaDcu9kmeascefhsalcrfglc8J9hmbkaOhsxekascefhskaPce4cbaPceG9R7amfgmhOkdndnaAcsSmbashlxekascefhlas8SbbgDcFeGhPdnaDcu9kmbascvfhzaPcFbGhPcrhDdninal8SbbgscFbGaDtaPVhPascu9kmealcefhlaDcrfgDc8J9hmbkazhlxekalcefhlkaPce4cbaPceG9R7amfgmhzkdndnadcd9hmbabarcetfgDaH87ebaDclfaz87ebaDcdfaO87ebxekabarcdtfgDaHBdbaDcwfazBdbaDclfaOBdbkavc;abfaocitfgDaOBdbaDaHBdlavaicdtfaHBdbavc;abfaocefcsGcitfgDazBdbaDaOBdlavaicefgicsGcdtfaOBdbavc;abfaocdfcsGcitfgDaHBdbaDazBdlavaiaCTaCcsSVfgicsGcdtfazBdbaiaATaAcsSVfhiaocifhokawcefhwaocsGhoaicsGhiarcifgrae6mbkkcbc99alaqSEhokavc;aef8Kjjjjbaok:clevu8Jjjjjbcz9Rhvdnalaecvf9pmbc9:skdnaiRbbc;:eGc;qeSmbcuskav9cb83iwaicefhoaialfc98fhrdnaeTmbdnadcdSmbcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcdtfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgiBdbalaiBdbawcefgwae9hmbxdkkcbhwindnaoar6mbc9:skaocefhlao8SbbgicFeGhddndnaicu9mmbalhoxekaocvfhoadcFbGhdcrhidninal8SbbgDcFbGaitadVhdaDcu9kmealcefhlaicrfgic8J9hmbxdkkalcefhokabawcetfadc8Etc8F91adcd47avcwfadceGcdtVglydbfgi87ebalaiBdbawcefgwae9hmbkkcbc99aoarSEk;Toio97eue97aec98Ghedndnadcl9hmbaeTmecbhdinababpbbbgicKp:RecKp:Sep;6eglaicwp:RecKp:Sep;6ealp;Geaiczp:RecKp:Sep;6egvp;Gep;Kep;Legopxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgwp9op9rp;Keglpxbb;:9cbb;:9cbb;:9cbb;:9calalp;Meaoaop;Meavaravawp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFbbbFbbbFbbbFbbbp9oaipxbbbFbbbFbbbFbbbFp9op9qalavp;Mearp;Kecwp:RepxbFbbbFbbbFbbbFbbp9op9qaoavp;Mearp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgDaDpbbbgipxbbbbbbFFbbbbbbFFgwp9oabpbbbgoaipmbediwDqkzHOAKY8AEgvczp:Reczp:Sep;6eglaoaipmlvorxmPsCXQL358E8FpxFubbFubbFubbFubbp9op;6eavczp:Sep;6egvp;Gealp;Gep;Kep;Legipxbbbbbbbbbbbbbbbbp:2egralpxbbbjbbbjbbbjbbbjgqp9op9rp;Keglpxb;:FSb;:FSb;:FSb;:FSalalp;Meaiaip;Meavaravaqp9op9rp;Keglalp;Mep;Kep;Kep;Jep;Negvp;Mepxbbn0bbn0bbn0bbn0grp;KepxFFbbFFbbFFbbFFbbp9oaiavp;Mearp;Keczp:Rep9qgialavp;Mearp;KepxFFbbFFbbFFbbFFbbp9oglpmwDKYqk8AExm35Ps8E8Fp9qpkbbabaoawp9oaialpmbezHdiOAlvCXorQLp9qpkbbabcafhbadclfgdae6mbkkk;2ileue97euo97dnaec98GgiTmbcbheinabcKfpx:ji:1S:ji:1S:ji:1S:ji:1SabpbbbglabczfgvpbbbgopmlvorxmPsCXQL358E8Fgrczp:Segwpxibbbibbbibbbibbbp9qp;6egDp;NegqaDaDp;MegDaDp;KealaopmbediwDqkzHOAKY8AEgDczp:Reczp:Sep;6eglalp;MeaDczp:Sep;6egoaop;Mearczp:Reczp:Sep;6egrarp;Mep;Kep;Kep;Lepxbbbbbbbbbbbbbbbbp:4ep;Jep;Mepxbbn0bbn0bbn0bbn0gDp;KepxFFbbFFbbFFbbFFbbgkp9oaqaop;MeaDp;Keczp:Rep9qgoaqalp;MeaDp;Keakp9oaqarp;MeaDp;Keczp:Rep9qgDpmwDKYqk8AExm35Ps8E8Fglp5eawclp:RegqpEi:T:j83ibavalp5baqpEd:T:j83ibabcwfaoaDpmbezHdiOAlvCXorQLgDp5eaqpEe:T:j83ibabaDp5baqpEb:T:j83ibabcafhbaeclfgeai6mbkkkuee97dnadcd4ae2c98GgeTmbcbhdinababpbbbgicwp:Recwp:Sep;6eaicep:SepxbbjFbbjFbbjFbbjFp9opxbbjZbbjZbbjZbbjZp:Uep;Mepkbbabczfhbadclfgdae6mbkkk:Sodw97euaec98Ghedndnadcl9hmbaeTmecbhdinabpxbbuJbbuJbbuJbbuJabpbbbgicKp:TeglaicYp:Tep9qgvcdp:Teavp9qgvclp:Teavp9qgop;6ep;Negvaicwp:RecKp:SegraipxFbbbFbbbFbbbFbbbgwp9ogDp:Uep;6ep;Mepxbbn0bbn0bbn0bbn0gqp;Kecwp:RepxbFbbbFbbbFbbbFbbp9oavaDarp:Xeaiczp:RecKp:Segip:Uep;6ep;Meaqp;Keawp9op9qavaDaraip:Uep:Xep;6ep;Meaqp;Keczp:RepxbbFbbbFbbbFbbbFbp9op9qavaoalcep:Rep9oalpxebbbebbbebbbebbbp9op9qp;6ep;Meaqp;KecKp:Rep9qpkbbabczfhbadclfgdae6mbxdkkaeTmbcbhdinabczfgkpxbFu9hbFu9hbFu9hbFu9habpbbbglakpbbbgrpmlvorxmPsCXQL358E8Fgvczp:TegqavcHp:Tep9qgicdp:Teaip9qgiclp:Teaip9qgicwp:Teaip9qgop;6ep;NegialarpmbediwDqkzHOAKY8AEgDpxFFbbFFbbFFbbFFbbglp9ograDczp:Segwp:Ueavczp:Reczp:SegDp:Xep;6ep;Mepxbbn0bbn0bbn0bbn0gvp;Kealp9oaiarawaDp:Uep:Xep;6ep;Meavp;Keczp:Rep9qgwaiaoaqcep:Rep9oaqpxebbbebbbebbbebbbp9op9qp;6ep;Meavp;Keczp:ReaiaDarp:Uep;6ep;Meavp;Kealp9op9qgipmwDKYqk8AExm35Ps8E8FpkbbabawaipmbezHdiOAlvCXorQLpkbbabcafhbadclfgdae6mbkkk9teiucbcbydj:G:cjbgeabcifc98GfgbBdj:G:cjbdndnabZbcztgd9nmbcuhiabad9RcFFifcz4nbcuSmekaehikaikkxebcj:Gdklz:zbb",t=new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,3,2,0,0,5,3,1,0,1,12,1,0,10,22,2,12,0,65,0,65,0,65,0,252,10,0,0,11,7,0,65,0,253,15,26,11]),n=new Uint8Array([32,0,65,2,1,106,34,33,3,128,11,4,13,64,6,253,10,7,15,116,127,5,8,12,40,16,19,54,20,9,27,255,113,17,42,67,24,23,146,148,18,14,22,45,70,69,56,114,101,21,25,63,75,136,108,28,118,29,73,115]);if(typeof WebAssembly!="object")return{supported:!1};var i=WebAssembly.validate(t)?o(e):o(s),a,r=WebAssembly.instantiate(i,{}).then(function(m){a=m.instance,a.exports.__wasm_call_ctors()});function o(m){for(var _=new Uint8Array(m.length),S=0;S<m.length;++S){var v=m.charCodeAt(S);_[S]=v>96?v-97:v>64?v-39:v+4}for(var w=0,S=0;S<m.length;++S)_[w++]=_[S]<60?n[_[S]]:(_[S]-60)*64+_[++S];return _.buffer.slice(0,w)}function c(m,_,S,v,w,E,x){var M=m.exports.sbrk,N=v+3&-4,P=M(N*w),I=M(E.length),D=new Uint8Array(m.exports.memory.buffer);D.set(E,I);var L=_(P,v,w,I,E.length);if(L==0&&x&&x(P,N,w),S.set(D.subarray(P,P+v*w)),M(P-M(0)),L!=0)throw new Error("Malformed buffer data: "+L)}var l={NONE:"",OCTAHEDRAL:"meshopt_decodeFilterOct",QUATERNION:"meshopt_decodeFilterQuat",EXPONENTIAL:"meshopt_decodeFilterExp",COLOR:"meshopt_decodeFilterColor"},h={ATTRIBUTES:"meshopt_decodeVertexBuffer",TRIANGLES:"meshopt_decodeIndexBuffer",INDICES:"meshopt_decodeIndexSequence"},d=[],u=0;function f(m){var _={object:new Worker(m),pending:0,requests:{}};return _.object.onmessage=function(S){var v=S.data;_.pending-=v.count,_.requests[v.id][v.action](v.value),delete _.requests[v.id]},_}function p(m){for(var _="self.ready = WebAssembly.instantiate(new Uint8Array(["+new Uint8Array(i)+"]), {}).then(function(result) { result.instance.exports.__wasm_call_ctors(); return result.instance; });self.onmessage = "+g.name+";"+c.toString()+g.toString(),S=new Blob([_],{type:"text/javascript"}),v=URL.createObjectURL(S),w=d.length;w<m;++w)d[w]=f(v);for(var w=m;w<d.length;++w)d[w].object.postMessage({});d.length=m,URL.revokeObjectURL(v)}function b(m,_,S,v,w){for(var E=d[0],x=1;x<d.length;++x)d[x].pending<E.pending&&(E=d[x]);return new Promise(function(M,N){var P=new Uint8Array(S),I=++u;E.pending+=m,E.requests[I]={resolve:M,reject:N},E.object.postMessage({id:I,count:m,size:_,source:P,mode:v,filter:w},[P.buffer])})}function g(m){var _=m.data;self.ready.then(function(S){if(!_.id)return self.close();try{var v=new Uint8Array(_.count*_.size);c(S,S.exports[_.mode],v,_.count,_.size,_.source,S.exports[_.filter]),self.postMessage({id:_.id,count:_.count,action:"resolve",value:v},[v.buffer])}catch(w){self.postMessage({id:_.id,count:_.count,action:"reject",value:w})}})}return{ready:r,supported:!0,useWorkers:function(m){p(m)},decodeVertexBuffer:function(m,_,S,v,w){c(a,a.exports.meshopt_decodeVertexBuffer,m,_,S,v,a.exports[l[w]])},decodeIndexBuffer:function(m,_,S,v){c(a,a.exports.meshopt_decodeIndexBuffer,m,_,S,v)},decodeIndexSequence:function(m,_,S,v){c(a,a.exports.meshopt_decodeIndexSequence,m,_,S,v)},decodeGltfBuffer:function(m,_,S,v,w,E){c(a,a.exports[h[w]],m,_,S,v,a.exports[l[E]])},decodeGltfBufferAsync:function(m,_,S,v,w){return d.length>0?b(m,_,S,h[v],l[w]):r.then(function(){var E=new Uint8Array(m*_);return c(a,a.exports[h[v]],E,m,_,S,a.exports[l[w]]),E})}}})();const kh={round:1,cup:.5,fine:!0,spacing:.8,fuzz:0},Un={name:"Lampornis calolaemus",seed:1207,sections:[{y:-.07,z:-.32,a:60,w:.035,rd:.03,rv:.035},{y:.04,z:-.245,a:60,w:.15,rd:.105,rv:.13},{y:.17,z:-.165,a:63,w:.225,rd:.16,rv:.2},{y:.34,z:-.09,a:68,w:.262,rd:.185,rv:.25},{y:.52,z:-.035,a:76,w:.258,rd:.185,rv:.245},{y:.67,z:-.005,a:84,w:.236,rd:.185,rv:.212},{y:.775,z:.008,a:80,w:.205,rd:.182,rv:.19},{y:.887,z:.052,a:62,w:.15,rd:.17,rv:.17},{y:.926,z:.116,a:38,w:.117,rd:.14,rv:.14},{y:.925,z:.195,a:18,w:.066,rd:.09,rv:.07},{y:.905,z:.245,a:8,w:.03,rd:.032,rv:.028}],throat:[4.5,7.3],spine:{tail:.3,hips:1.9,spine:3,chest:4.1,neck1:5.3,neck2:5.95,head:6.55},eye:{s:7.8,phi:.535,radius:.037,inset:.84},bill:{length:.44,radius:.02,droop:.022,color:460551},skin:1840662,shading:{flank:.6,under:.6,patch:.3,gold:5921324,goldAmount:.22},looks:{body:{width:.03,aspect:2.1,rowStep:.3,tilt:13,lift:1,cup:.3,round:.7,loose:.55,fuzz:.3,base:2104356,tip:5195350,iri:4885036,iriGraze:9071132,iriStrength:.12,iriPower:6,iriAlign:0,jitter:.5,sparkle:.6},belly:{width:.033,aspect:2.5,rowStep:.24,tilt:11,lift:1.2,cup:.25,round:.65,loose:.75,base:2630191,tip:6970485,iri:6982186,iriGraze:9071146,iriStrength:.1,iriPower:5,iriAlign:0,jitter:.5,sparkle:.6},flank:{width:.036,aspect:2.8,rowStep:.24,tilt:12,lift:1.3,cup:.2,round:.55,loose:.9,base:2301226,tip:6313066,iri:5925434,iriGraze:6965802,iriStrength:.06,iriPower:4,iriAlign:0,jitter:.5,sparkle:.7},down:{width:.04,aspect:2.6,rowStep:.24,tilt:26,lift:1.4,cup:.15,round:.5,loose:1,base:1840664,tip:4207930,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.3},back:{width:.03,aspect:2,rowStep:.31,tilt:11,lift:.9,cup:.35,round:.75,loose:.45,fuzz:.3,base:2039078,tip:4867669,iri:3840570,iriGraze:9071128,iriStrength:.24,iriPower:7,iriAlign:0,jitter:.5,sparkle:.45},scapular:{width:.042,aspect:3.3,rowStep:.24,tilt:21,lift:.8,cup:.3,round:.6,loose:.6,fuzz:.4,base:2170408,tip:5327964,iri:3836474,iriGraze:9071128,iriStrength:.2,iriPower:6,iriAlign:0,jitter:.5,sparkle:.5},collar:{width:.027,aspect:1.45,rowStep:.36,tilt:12,lift:.8,cup:.35,round:1,loose:.3,spacing:.7,fuzz:.12,base:1184536,tip:2369580,iri:2072672,iriGraze:678490,iriStrength:.32,iriPower:12,iriAlign:.3,iriAim:[0,.1,1],jitter:.55,sparkle:.6},head:{width:.017,aspect:1.8,rowStep:.34,tilt:12,lift:.45,cup:.35,round:.9,loose:.4,fuzz:.22,base:1184279,tip:2763315,iri:1866320,iriGraze:5263386,iriStrength:.28,iriPower:7,iriAlign:0,jitter:.45,sparkle:.4},mask:{width:.012,aspect:1.7,rowStep:.36,tilt:10,lift:.2,cup:.3,round:.9,loose:.35,fuzz:.25,base:263173,tip:789517,iri:1054752,iriGraze:0,iriStrength:.04,iriPower:4,iriAlign:0,jitter:.2},velvet:{width:.015,aspect:1.6,rowStep:.28,tilt:6,lift:.15,cup:.2,round:.7,loose:.8,fuzz:.7,base:262915,tip:985865,iri:0,iriGraze:0,iriStrength:0,iriPower:2,iriAlign:0,jitter:.2},stripe:{width:.012,aspect:2.6,rowStep:.24,tilt:6,lift:.2,cup:.15,round:.5,loose:.95,fuzz:1,base:11841962,tip:15526885,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.2},covert:{width:.046,aspect:2.6,rowStep:.33,tilt:9,lift:.7,cup:.3,round:.7,loose:.4,base:2170151,tip:5129816,iri:3832400,iriGraze:5917226,iriStrength:.18,iriPower:6,iriAlign:0,jitter:.4,sparkle:.5},undertail:{width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,cup:.2,round:.6,loose:.8,base:7827564,tip:13617342,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:2,iriAlign:0,jitter:.3},wingCovert:{width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,cup:.3,round:.8,loose:.22,fuzz:0,base:1512732,tip:4012104,iri:4872824,iriGraze:5917242,iriStrength:.06,iriPower:6,iriAlign:0,jitter:.4,sparkle:.6},gorget:{...kh,width:.052,aspect:1,rowStep:.3,tilt:8,lift:.5,spacing:.6,base:1706510,tip:4527900,iri:8007935,iriGraze:12595338,iriStrength:2,iriPower:4.2,iriAlign:.74,iriAim:[0,-.5,.87],jitter:.34,channel:"gorget"},crown:{...kh,width:.019,aspect:1.3,rowStep:.34,tilt:10,lift:.4,fuzz:.45,sparkle:.5,loose:.12,base:330507,tip:662554,iri:1368772,iriGraze:1726680,iriStrength:2.3,iriPower:5,iriAlign:.8,iriAim:[0,-.24,1],jitter:.55,channel:"crown"}},tracts:[{name:"belly",look:"belly",region:{kind:"band",s:[0,3.7],phi:[0,.45],soft:.6}},{name:"flank",look:"flank",region:{kind:"band",s:[1.2,4.2],phi:[.3,.52],soft:.5}},{name:"back",look:"back",region:{kind:"band",s:[.9,6.2],phi:[.55,1]}},{name:"scapular",look:"scapular",region:{kind:"band",s:[3.7,5.6],phi:[.56,.84],soft:.3}},{name:"wingPit",look:"down",region:{kind:"blob",at:[3.8,.44],r:[.3,.035],soft:.5}},{name:"tailCoverts",look:"covert",region:{kind:"band",s:[0,1.15],phi:[0,1]}},{name:"undertail",look:"undertail",region:{kind:"band",s:[0,1.35],phi:[0,.4],soft:.3}},{name:"collar",look:"collar",region:{kind:"blob",at:[4.5,0],r:[.72,.44],soft:.6}},{name:"head",look:"head",region:{kind:"band",s:[6,11],phi:[0,1]}},{name:"velvet",look:"velvet",region:{kind:"blob",at:[8,0],r:[2.25,.63],pow:3,soft:.2}},{name:"mask",look:"mask",region:{kind:"blob",at:[8.3,.5],r:[1,.11]}},{name:"gorget",look:"gorget",region:{kind:"blob",at:[6.35,0],r:[1.4,.27],pow:3}},{name:"chin",look:"gorget",region:{kind:"blob",at:[7.7,0],r:[1.05,.17]}},{name:"crown",look:"crown",region:{kind:"blob",at:[8.5,1],r:[1.3,.4]}},{name:"postocular",look:"stripe",region:{kind:"streak",from:[7.5,.57],to:[6.3,.6],r:[.12,.025]}}],wing:{shoulder:[.185,.64,-.06],upper:.1,fore:.13,hand:.17,primaries:10,secondaries:6,primaryLen:[.34,.9],secondaryLen:[.27,.2],primaryWidth:.062,secondaryWidth:.064,rest:{from:[5.1,93],to:[.6,147],width:[.05,.105,.04],height:.034,cross:[.8,-.02]},color:3878193,sheen:8021618},tail:{rectrices:5,length:[.61,.66],width:.13,droop:62,restFan:.35,maxFan:11,color:1909292},legs:{spread:.075,hip:[.085,.11,-.05],toe:.085,perchRadius:.0405,color:1446159},behaviour:{breathHz:[3.4,5.2],holdCalm:[.4,1.8],holdAlert:[.22,.9],saccade:[.038,42e-5],neckShare:[.22,.3],blinkEvery:[1.8,5.5],ruffleEvery:[60,110],tailEvery:[3,9],wingEvery:[9,22],billUp:14}},qd=matchMedia("(pointer: coarse)").matches,Px=Un.legs.perchRadius,vi=.2;function Xd(s){return Px*Math.min(1-.18*s,2.2)}const Kd=[vi-.45,vi+.45];function Cx(s,e=Kd){s.updateMatrixWorld(!0);const t=s.getObjectByName("perch"),n=t?Lx(t,e[0]-.1,e[1]+.1):null,i=n?n.geometry.getAttribute("position").clone().applyMatrix4(n.matrixWorld).array:new Float32Array,a=new Ap;a.ray.direction.set(0,-1,0);const r=[],o=new Map,c=new y,l=new y;function h(u){let f=1/0,p=-1/0;for(let b=0;b<i.length;b+=3)Math.abs(i[b]-u)>.006||(f=Math.min(f,i[b+2]),p=Math.max(p,i[b+2]));return f<=p?(f+p)/2:0}function d(u,f){if(!n)return null;a.ray.origin.set(u,2,h(u)),r.length=0,a.intersectObject(n,!1,r);const p=r[0];return p?f.copy(p.point):null}return(u,f)=>{const p=Math.round(u*1e3);let b=o.get(p);return b===void 0&&(b={point:new y,up:new y,tangent:new y,radius:Xd(u)},d(u,b.point)&&d(u-.03,c)&&d(u+.03,l)?(b.tangent.copy(l).sub(c).normalize(),b.up.set(0,1,0).addScaledVector(b.tangent,-b.tangent.y).normalize()):b=null,o.set(p,b)),b?(f.point.copy(b.point),f.up.copy(b.up),f.tangent.copy(b.tangent),f.radius=b.radius,f):null}}function Lx(s,e,t){const n=s.geometry,i=n.getAttribute("position"),a=n.index?n.index.count:i.count,r=h=>n.index?n.index.getX(h):h,o=[];for(let h=0;h<a;h+=3){const d=r(h),u=r(h+1),f=r(h+2),p=Math.min(i.getX(d),i.getX(u),i.getX(f));if(!(Math.max(i.getX(d),i.getX(u),i.getX(f))<e||p>t))for(const g of[d,u,f])o.push(i.getX(g),i.getY(g),i.getZ(g))}const c=new yt;c.setAttribute("position",new et(o,3));const l=new Nt(c,s.material);return l.matrixAutoUpdate=!1,l.matrixWorld.copy(s.matrixWorld),l}function Oh(s,e,t,n,i){const a=s.computeFrenetFrames(t,!1),r=[],o=[],c=[],l=Ln(i),h=Array.from({length:6},()=>({u:l(),a:l()*Math.PI*2,s:.25+l()*.35})),d=new y,u=new y;for(let p=0;p<=t;p++){const b=p/t;s.getPointAt(b,d);const g=a.normals[p],m=a.binormals[p];for(let _=0;_<=n;_++){const S=_/n*Math.PI*2;u.copy(g).multiplyScalar(Math.cos(S)).addScaledVector(m,Math.sin(S));let v=e(b);v*=1+.035*Math.sin(S*7+b*40)+.02*Math.sin(S*13-b*90);for(const w of h){const E=(b-w.u)*18,x=Math.cos(S-w.a);v*=1+w.s*Math.exp(-E*E)*Math.max(x,0)**3}r.push(d.x+u.x*v,d.y+u.y*v,d.z+u.z*v),o.push(b,_/n)}}for(let p=0;p<t;p++)for(let b=0;b<n;b++){const g=p*(n+1)+b,m=g+n+1;c.push(g,g+1,m,m,g+1,m+1)}const f=new yt;return f.setAttribute("position",new et(r,3)),f.setAttribute("uv",new et(o,2)),f.setIndex(c),f.computeVertexNormals(),f}function Dx(s){const e=new on({color:16777215,roughness:.92,metalness:0});return e.onBeforeCompile=t=>{t.uniforms.uLen={value:s},t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
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
}`)},e}function Ix(){const s=new An,e=new pr([new y(-6,-1.414,-.927),new y(-3.2,-.709,-.364),new y(-1.4,-.312,-.11),new y(-.7,-.199,-.039),new y(0,-.041,0),new y(.5,.059,.072),new y(.9,.142,.113),new y(1.3,.193,.077),new y(1.8,.24,.04)]),t=e.getLength(),n=Dx(t),i=new y,a=Oh(e,g=>Xd(e.getPointAt(g,i).x)*(g>.97?1-(g-.97)*20:1),320,28,3),r=new Nt(a,n);r.name="perch",r.receiveShadow=!0,s.add(r);const o=new pr([new y(1.07,.11,.26),new y(1.18,.3,.28),new y(1.28,.5,.2),new y(1.41,.7,.09)]),c=new on({color:5208600,roughness:.65}),l=new Nt(Oh(o,g=>.022*(1-g*.6),60,10,9),c);l.castShadow=!0,s.add(l);const h=new Bt({color:8372762,roughness:.5,sheen:.5,sheenColor:new me(13168720),emissive:2243072}),d=new Vi(1,16,12),u=new da(.006,.008,1,6);u.translate(0,.5,0);const f=Ln(21),p=new y,b=new y;for(let g=0;g<9;g++){const m=.2+g/8*.78;o.getPointAt(m,p),o.getTangentAt(m,b);const _=new y(f()-.5,f()*.6,f()-.5).normalize(),S=.06+f()*.08,v=new Nt(u,c);v.position.copy(p),v.quaternion.setFromUnitVectors(new y(0,1,0),_.clone().add(b.clone().multiplyScalar(.4)).normalize()),v.scale.set(1,S,1),s.add(v);const w=p.clone().addScaledVector(_.clone().add(b.clone().multiplyScalar(.4)).normalize(),S);for(let E=0;E<2+Math.floor(f()*3);E++){const x=new Nt(d,h),M=.018+f()*.018;x.scale.set(M,M*1.25,M),x.position.copy(w).add(new y(f()-.5,f()-.5,f()-.5).multiplyScalar(.05)),x.castShadow=!0,s.add(x)}}return{group:s}}async function Nx(s,e){const t=new K_().setMeshoptDecoder(Rx),i=(s.endsWith(".txt")?await t.parseAsync(await Bx(s),""):await t.loadAsync(s,e)).scene;i.traverse(o=>{const c=o;if(c.isMesh){c.receiveShadow=!0,c.castShadow=!/perch|hairs/i.test(c.name);for(const l of Array.isArray(c.material)?c.material:[c.material]){const h=l;h.envMapIntensity=.8}}});const a=i.getObjectByName("perch");let r=null;if(a){r=zx(a),i.add(r);const o=i.getObjectByName("hairs");o&&i.add(Fx(a,o.material))}return{group:i,fuzz:r}}function qa(s,e,t,n,i){s[e]=t,s[e+1]=n,s[e+2]=i}function Fx(s,e){const t=qd?7e3:16e3,n=new W_(s).build(),i=Ln(31),a=new y,r=new y,o=new y,c=new y,l=new y,h=new Float32Array(t*9),d=new Float32Array(t*9),u=new Float32Array(t*6);let f=0;for(let g=0;f<t&&g<t*4;g++){if(n.sample(a,r),Math.abs(a.x-vi)<.17||a.x<-2.8||r.y<-.3&&i()<.7)continue;o.set(i()-.5,i()-.5,i()-.5).cross(r).normalize(),c.crossVectors(r,o);const m=.45+i()*.5,_=.005+i()*i()*.014;l.copy(r).multiplyScalar(1-m).addScaledVector(o,m).normalize();const S=45e-5+i()*3e-4,v=a.addScaledVector(r,-.001),w=f*9;qa(h,w,v.x-c.x*S,v.y-c.y*S,v.z-c.z*S),qa(h,w+3,v.x+c.x*S,v.y+c.y*S,v.z+c.z*S),qa(h,w+6,v.x+l.x*_,v.y+l.y*_,v.z+l.z*_);for(let E=0;E<9;E+=3)qa(d,w+E,r.x,r.y,r.z);u[f*6+2]=1,u[f*6+4]=.5,u[f*6+5]=1,f++}const p=new yt;p.setAttribute("position",new Dt(h.slice(0,f*9),3)),p.setAttribute("normal",new Dt(d.slice(0,f*9),3)),p.setAttribute("uv",new Dt(u.slice(0,f*6),2));const b=new Nt(p,e);return b.name="twig.hairs",b.position.copy(s.position),b.quaternion.copy(s.quaternion),b.scale.copy(s.scale),b.receiveShadow=!0,b}const zh=qd?7:14,Ux=.03,kx=-3.25;function Ox(s){const e=s.getAttribute("position"),t=s.index?s.index.count:e.count,n=o=>s.index?s.index.getX(o):o,i=new Uint32Array(t);let a=0;for(let o=0;o<t;o+=3){const c=n(o),l=n(o+1),h=n(o+2);Math.max(e.getX(c),e.getX(l),e.getX(h))<=kx||(i[a++]=c,i[a++]=l,i[a++]=h)}const r=new yt;for(const o in s.attributes)r.setAttribute(o,s.attributes[o]);return r.setIndex(new Dt(e.count>65535?i.slice(0,a):Uint16Array.from(i.subarray(0,a)),1)),r}function zx(s){const e=s.material,t=Ox(s.geometry),n=new An;n.name="fuzz";for(let i=1;i<=zh;i++){const a=i/zh,r=new on({map:e.map,normalMap:e.normalMap,color:new me(1,1,1),roughness:1,metalness:0,alphaTest:.5,alphaToCoverage:!0,envMapIntensity:.6});r.onBeforeCompile=c=>{c.uniforms.uH={value:a},c.uniforms.uLen={value:Ux},c.uniforms.uGrip={value:vi},c.vertexShader=c.vertexShader.replace("#include <common>",`#include <common>
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
           #include <alphatest_fragment>`)};const o=new Nt(t,r);o.name=`fuzz.${i}`,o.position.copy(s.position),o.quaternion.copy(s.quaternion),o.scale.copy(s.scale),o.receiveShadow=!0,o.renderOrder=i,n.add(o)}return n}async function Bx(s){const e=await fetch(s);if(!e.ok)throw new Error(`${s}: HTTP ${e.status}`);const t=atob((await e.text()).trim()),n=new Uint8Array(t.length);for(let i=0;i<t.length;i++)n[i]=t.charCodeAt(i);return n.buffer}const Xa=["tail","hips","spine","chest","neck1","neck2","head"];class Gx{constructor(e){this.species=e;const t=e.sections;this.count=t.length,this.ys=t.map(n=>n.y),this.zs=t.map(n=>n.z),this.as=t.map(n=>n.a*Le),this.ws=t.map(n=>n.w),this.rds=t.map(n=>n.rd),this.rvs=t.map(n=>n.rv)}species;count;ys;zs;as;ws;rds;rvs;a=new y;b=new y;c=new y;get sMax(){return this.count-1}center(e,t){return t.set(0,gn(this.ys,e),gn(this.zs,e))}axis(e,t){const n=gn(this.as,e);return t.set(0,Math.sin(n),Math.cos(n))}point(e,t,n){const i=gn(this.as,e),a=Math.max(gn(this.ws,e),.004),r=Math.max(gn(this.rds,e),.004),o=Math.max(gn(this.rvs,e),.004),c=Math.cos(t),l=Math.sin(t),h=1+.06*Math.sin(t*2)**2,d=-c*(c>0?o:r)*h,u=gn(this.ys,e),f=gn(this.zs,e);n.set(l*a*h,u+Math.cos(i)*d,f-Math.sin(i)*d);const p=this.wingBulge(e,t);if(p>0){const b=Math.hypot(n.x,n.y-u,n.z-f)||1,g=1+p/b;n.set(n.x*g,u+(n.y-u)*g,f+(n.z-f)*g)}return n}surface(e,t,n){const a=ke(e,0,this.sMax);this.point(a,t,n.p);const r=Math.max(a-.01,0),o=Math.min(a+.01,this.sMax);return this.point(o,t,this.a).sub(this.point(r,t,this.b)),this.point(a,t+.01,this.b).sub(this.point(a,t-.01,this.c)),n.n.crossVectors(this.b,this.a).normalize(),n.t.copy(this.a).multiplyScalar(-1),n.t.addScaledVector(n.n,-n.t.dot(n.n)).normalize(),n}wingHalfWidth(e){const[t,n,i]=this.species.wing.rest.width;return e<.35?de(t,n,re(0,.35,e)):de(n,i,re(.35,1,e))}wingHalfAngle(e,t){const n=(gn(this.ws,e)+(gn(this.rds,e)+gn(this.rvs,e))/2)/2;return this.wingHalfWidth(t)/Math.max(n,.03)}wingUV(e,t){const n=this.species.wing.rest,i=Math.PI*2;let a=(t%i+i)%i;a>Math.PI&&(a=i-a);const r=(n.from[0]-e)/(n.from[0]-n.to[0]),o=ke(r,0,1),c=de(n.from[1],n.to[1],o)*Le;return{u:r,v:(a-c)/this.wingHalfAngle(e,o)}}wingAt(e,t,n){const i=this.species.wing.rest,a=de(i.from[0],i.to[0],e),r=de(i.from[1],i.to[1],ke(e,0,1))*Le+t*this.wingHalfAngle(ke(a,0,this.sMax),ke(e,0,1));return{s:a,ang:n>0?r:Math.PI*2-r}}wingBulge(e,t){const{u:n,v:i}=this.wingUV(e,t);if(n<=0||n>=1||Math.abs(i)>=1)return 0;const a=1-i*i;return this.species.wing.rest.height*re(0,.1,n)*(1-re(.8,1,n))*a*a}front=null;frontLength(e){if(!this.front){this.front=[0];for(let a=1;a<=this.sMax*20;a++)this.front.push(this.front[a-1]+this.point(a/20,0,this.a).distanceTo(this.point((a-1)/20,0,this.b)))}const n=ke(e,0,this.sMax)*20,i=Math.min(Math.floor(n),this.front.length-2);return de(this.front[i],this.front[i+1],n-i)}frontAt(e){this.frontLength(0);const t=this.front;let n=0,i=t.length-1;if(e<=0)return 0;if(e>=t[i])return this.sMax;for(;i-n>1;){const a=n+i>>1;t[a]<=e?n=a:i=a}return(n+(e-t[n])/Math.max(t[i]-t[n],1e-9))/20}weights(e){const t=this.species.spine;for(let n=0;n<Xa.length-1;n++){const i=Xa[n],a=Xa[n+1];if(e<=t[a]||n===Xa.length-2){const r=re(t[i],t[a],e);return[i,1-r,a,r]}}return["head",1,"head",0]}skin(e,t){const n=this.species.spine,i=.5+.5*Math.cos(t),a=this.weights(e),o=.6*(re(n.hips-.4,n.spine,e)*(1-re(n.chest+.2,n.neck1+.3,e)))*(.35+.65*i),[c,l]=this.species.throat,h=re(.25,.85,i)*re(c-.9,c,e),d=ke((this.frontLength(e)-this.frontLength(c))/(this.frontLength(l)-this.frontLength(c)),0,1),u=new Map,f=(g,m)=>u.set(g,(u.get(g)??0)+m);f(a[0],a[1]*(1-o)*(1-h)),f(a[2],a[3]*(1-o)*(1-h)),f("sternum",o*(1-h*d*(2-d))),f("throat",(1-o)*h*(1-d)*(1-d)),f("gular",h*2*d*(1-d)),f("head",h*d*d);const p=[...u].sort((g,m)=>m[1]-g[1]).slice(0,4);for(;p.length<4;)p.push(["root",0]);const b=p.reduce((g,m)=>g+m[1],0);return{bones:p.map(g=>g[0]),weights:p.map(g=>g[1]/b)}}bodyCoord(e){return 1-ke(e/this.sMax,0,1)}}const Jt=["L","R"],fn=s=>s==="L"?1:-1,Hx=s=>new y(s[0],s[1],s[2]),po=new y,Bh=new y,Ka=new y,Vx=new Ve;function ki(s,e,t=new mt){return Ka.copy(s).normalize(),po.crossVectors(e,Ka).normalize(),Bh.crossVectors(Ka,po),t.setFromRotationMatrix(Vx.makeBasis(po,Bh,Ka))}const Os=(s,e)=>new y(s.x*e,s.y,s.z);function Wx(s){const e=new Gx(s),t={},n=[],i={};function a(D,L,R,k=new mt){const U=new Pc;U.name=D;const F={pos:new y,quat:new mt,worldPos:R.clone(),worldQuat:k.clone()};if(L){const V=i[L],O=V.worldQuat.clone().invert();F.pos.copy(R).sub(V.worldPos).applyQuaternion(O),F.quat.copy(O).multiply(k),t[L].add(U)}else F.pos.copy(R),F.quat.copy(k);return U.position.copy(F.pos),U.quaternion.copy(F.quat),t[D]=U,i[D]=F,n.push(U),U}const r=D=>e.center(D,new y),o=s.spine,c=a("root",null,new y);a("hips","root",r(o.hips)),a("spine","hips",r(o.spine)),a("chest","spine",r(o.chest)),a("neck1","chest",r(o.neck1)),a("neck2","neck1",r(o.neck2)),a("head","neck2",r(o.head)),a("throat","chest",r(o.head)),a("gular","chest",e.point((s.throat[0]+s.throat[1])/2,0,new y)),a("sternum","chest",e.point(o.spine+.4,0,new y));const l=r(e.sMax),h=e.axis(e.sMax,new y),d=ki(h,new y(0,1,0));a("bill","head",l,d),a("jaw","head",l.clone().add(new y(0,-.012,-.04)),d);const u=new y(0,0,1).applyQuaternion(d),f=new y(0,1,0).applyQuaternion(d),p=s.bill.length,b=D=>l.clone().addScaledVector(u,D*p).addScaledVector(f,-.004-s.bill.droop*D*D);a("tongue.1","jaw",b(.06),d),a("tongue.2","tongue.1",b(.5),d),a("tongue.3","tongue.2",b(.7),d);const g={},m={p:new y,n:new y,t:new y};for(const D of Jt){const L=fn(D);e.surface(s.eye.s,s.eye.phi*Math.PI,m);const R=m.n.clone().multiplyScalar(.7).add(new y(.3,.02,.04)).normalize(),k=m.p.clone().addScaledVector(R,-s.eye.radius*s.eye.inset);R.x*=L,k.x*=L;const U=ki(R,new y(0,1,0));g[D]={side:D,center:k,out:R,eye:a(`eye.${D}`,"head",k,U),lidUpper:a(`lidUpper.${D}`,"head",k,U),lidLower:a(`lidLower.${D}`,"head",k,U),nict:a(`nict.${D}`,"head",k,U)}}const _=s.wing,S={};{const D=Hx(_.shoulder),L={p:new y,n:new y,t:new y},R=(be,Fe,le)=>{const fe=e.wingAt(be,Fe,1);return e.surface(fe.s,fe.ang,L),L.p.clone().addScaledVector(L.n,-le)},k=s.tail.droop*Le,U=new y(0,-Math.sin(k),-Math.cos(k)),F=new y(0,Math.cos(k),-Math.sin(k)),V=r(o.tail).addScaledVector(U,s.tail.length[1]*_.rest.cross[0]).addScaledVector(F,.03);V.x=_.rest.cross[1];const O=R(.03,.4,.02),W=R(.2,-.35,.014),Y=L.n.clone(),j=V.clone().sub(W).normalize();Y.addScaledVector(j,-Y.dot(j)).normalize();const ue=new y().crossVectors(Y,j),H=e.axis(o.spine,new y).multiplyScalar(-1),Z=new y(0,-H.z,H.y);Z.z>0&&Z.multiplyScalar(-1);const te=new y(1,0,0),he=(be,Fe,le)=>be.clone().applyAxisAngle(Fe,le),Q=[];Q.push({name:"shoulder",parent:"chest",pos:D,dir:O.clone().sub(D),n:Y,sDir:te.clone().multiplyScalar(.85).addScaledVector(H,.5)}),Q.push({name:"forearm",parent:"shoulder",pos:O,dir:W.clone().sub(O),n:Y,sDir:te.clone().multiplyScalar(.9).addScaledVector(H,-.35)}),Q.push({name:"hand",parent:"forearm",pos:W,dir:j,n:Y,sDir:te.clone()});const De=_.primaries;for(let be=0;be<De;be++){const Fe=be/(De-1),le=W.clone().addScaledVector(j,_.hand*(be+.4)/De).addScaledVector(ue,(1-Fe)*.04).addScaledVector(Y,(1-Fe)*.004),fe=V.clone().addScaledVector(ue,(1-Fe)*.05).sub(le).normalize();Q.push({name:`primary#${be+1}`,parent:"hand",pos:le,dir:fe,n:Y,sDir:he(te,Z,de(58,-4,Math.pow(Fe,.62))*Le)})}const Ye=_.secondaries;for(let be=0;be<Ye;be++){const Fe=be/(Ye-1),le=W.clone().lerp(O,(be+.7)/(Ye+.4)).addScaledVector(ue,.03+Fe*.015);Q.push({name:`secondary#${be+1}`,parent:"forearm",pos:le,dir:he(j,Y,de(7,16,Fe)*Le),n:Y,sDir:he(te,Z,de(82,97,Fe)*Le)})}for(const be of Jt){const Fe=fn(be),le=ye=>ye.includes("#")?ye.replace("#",`.${be}.`):`${ye}.${be}`,fe={side:be,bones:[],folded:[],spread:[],primaries:[],secondaries:[]},Re={chest:new mt};for(const ye of Q){const Ue=le(ye.name),se=ye.parent==="chest"?"chest":le(ye.parent),tt=ki(Os(ye.dir,Fe),Os(ye.n,Fe)),je=a(Ue,se,Os(ye.pos,Fe),tt),ct=ki(Os(ye.sDir,Fe),Os(Z,Fe));Re[Ue]=ct,fe.bones.push(je),fe.folded.push(i[Ue].quat.clone()),fe.spread.push(Re[se].clone().invert().multiply(ct)),ye.name.startsWith("primary")&&fe.primaries.push(je),ye.name.startsWith("secondary")&&fe.secondaries.push(je)}S[be]=fe}}const v=s.tail,w=[];{const D=v.droop*Le,L=new y(0,-Math.sin(D),-Math.cos(D)),R=new y(0,Math.cos(D),-Math.sin(D)),k=ki(L,R),U=r(o.tail);a("tail","hips",U,k);const F=new y(1,0,0).applyQuaternion(k);for(const V of Jt)for(let O=0;O<v.rectrices;O++){const W=(O+.5)*(V==="L"?-1:1),Y=U.clone().addScaledVector(F,W*.006).addScaledVector(R,-O*.004-(V==="L"?.002:0)).addScaledVector(L,.02),j=k.clone().multiply(new mt().setFromAxisAngle(new y(0,1,0),W*v.restFan*Le));w.push({bone:a(`rectrix.${V}.${O+1}`,"tail",Y,j),k:W})}}const E=s.legs,x={},M={};let N=.1;for(const D of Jt){const L=fn(D),R=new y(E.spread*L,0,0);a(`foot.${D}`,"root",R);const k=R.clone().add(new y(0,.014,-.012)),U=new y(E.hip[0]*L,E.hip[1],E.hip[2]);M[D]=k,x[D]=U.clone().sub(i.hips.worldPos),N=U.distanceTo(k),a(`tarsus.${D}`,`foot.${D}`,k,ki(U.clone().sub(k),new y(1,0,0)));for(let F=0;F<4;F++)a(`toe.${D}.${F+1}`,`foot.${D}`,R)}c.updateMatrixWorld(!0);const P=new vr(n),I=new Map(n.map((D,L)=>[D.name,L]));return{species:s,loft:e,rootBone:c,bones:t,list:n,rest:i,skeleton:P,index:D=>{const L=I.get(D);if(L===void 0)throw new Error(`no bone ${D}`);return L},wings:S,rectrices:w,eyes:g,hipSocket:x,ankle:M,tarsusLength:N}}const qx=0,Xx=1,Kx=2,Gc=3,jx=4,Yx=2,Jx=3,Gh=4,Hh=5;class pc{pos=[];nor=[];uv=[];root=[];hinge=[];data=[];iriN=[];cBase=[];cTip=[];cIri=[];cIri2=[];si=[];sw=[];idx=[];S=new y;H=new y;P=new y;Nv=new y;In=new y;add(e){const{cols:t,rows:n}=e,i=this.S.crossVectors(e.normal,e.dir).normalize(),a=this.H.crossVectors(e.dir,e.normal).normalize(),r=this.pos.length/3,o=e.width/2;for(let c=0;c<n;c++){const l=c===n-1,h=e.scallop?c/(n-1):n===4?[0,.5,.82,.965][c]:Math.pow(c/(n-1),.9),d=de(1.25,2.1,e.round),u=ke((h-.5)/.5,0,1),f=Math.pow(Math.max(1-Math.pow(u,d),0),1/d),p=e.scallop?1:n===4?de(.5,1,re(0,.5,h))*f:de(.4,1,re(0,e.widen??.12,h))*(l?.42:Math.pow(Math.max(1-Math.pow(ke((h-.8)/.2,0,1),2.2),0),.45));for(let b=0;b<t;b++){const g=t===1?0:b/(t-1)*2-1,m=g<0?1-e.asym:1+e.asym;let _=g*o*p*m;const S=l&&!e.scallop?h+(1-h)*(1-g*g):h;let v=S*e.length;if(e.scallop){const x=ke((h-.5)/.5,0,1),M=g*Math.PI/2;_=de(g*o*de(.72,1,Math.min(h/.5,1)),Math.sin(M)*o,x),v=de(Math.min(h,.5)*e.length,.5*e.length+Math.cos(M)*.5*e.length,x)}const w=e.cup*o*(g*p)*(g*p)+e.curl*e.length*S*S;this.P.copy(e.root).addScaledVector(i,_).addScaledVector(e.dir,v).addScaledVector(e.normal,-w),this.Nv.copy(e.normal).addScaledVector(i,2*e.cup*g*p).addScaledVector(e.dir,2*e.curl*S),this.In.copy(e.iriNormal).addScaledVector(i,.3*e.cup*g*p).addScaledVector(e.dir,.1*(S-.6)).normalize(),e.skinNormal&&this.Nv.normalize().lerp(e.skinNormal,de(.45,.8,Math.min(e.loose*2,1))),this.Nv.normalize(),this.pos.push(this.P.x,this.P.y,this.P.z),this.nor.push(this.Nv.x,this.Nv.y,this.Nv.z),e.scallop?this.uv.push(_/o,v/e.length):this.uv.push(g,S),this.root.push(e.root.x,e.root.y,e.root.z),this.hinge.push(a.x,a.y,a.z),this.data.push(e.rand,e.coord,e.gain,e.channel),this.iriN.push(this.In.x,this.In.y,this.In.z),this.cBase.push(e.base.r,e.base.g,e.base.b,e.iriStrength/4),this.cTip.push(e.tip.r,e.tip.g,e.tip.b,e.loose),this.cIri.push(e.iri.r,e.iri.g,e.iri.b,e.iriPower/32),this.cIri2.push(e.iri2.r,e.iri2.g,e.iri2.b,e.cover);const E=e.skinAt?e.skinAt(this.P):e;this.si.push(...E.bones),this.sw.push(...E.weights)}}for(let c=0;c<n-1;c++)for(let l=0;l<t-1;l++){const h=r+c*t+l,d=h+t;this.idx.push(h,d,h+1,d,d+1,h+1)}}build(){const e=new yt,t=(a,r)=>new Dt(new Float32Array(a),r),n=(a,r)=>{const o=new Uint16Array(a.length);for(let c=0;c<a.length;c++)o[c]=Math.round(ke(a[c],0,1)*65535);return new Dt(o,r,!0)},i=(a,r)=>{const o=new Int16Array(a.length);for(let c=0;c<a.length;c++)o[c]=Math.round(ke(a[c],-1,1)*32767);return new Dt(o,r,!0)};return e.setAttribute("position",t(this.pos,3)),e.setAttribute("normal",i(this.nor,3)),e.setAttribute("uv",t(this.uv,2)),e.setAttribute("aRoot",t(this.root,3)),e.setAttribute("aHinge",i(this.hinge,3)),e.setAttribute("aData",t(this.data,4)),e.setAttribute("aIriN",i(this.iriN,3)),e.setAttribute("aBase",n(this.cBase,4)),e.setAttribute("aTip",n(this.cTip,4)),e.setAttribute("aIri",n(this.cIri,4)),e.setAttribute("aIri2",n(this.cIri2,4)),e.setAttribute("skinIndex",new Dt(new Uint16Array(this.si),4)),e.setAttribute("skinWeight",n(this.sw,4)),e.setIndex(new Dt(new Uint32Array(this.idx),1)),e.boundingSphere=new vn(new y(0,.4,-.1),2.5),e.boundingBox=new Kn(new y(-2,-2,-2),new y(2,3,2)),e}}function Zx(s,e,t,n){if(s.kind==="band"){const f=e+(s.soft??0)*(n*2-1);return f>=s.s[0]&&f<=s.s[1]&&t>=s.phi[0]&&t<=s.phi[1]}if(s.kind==="blob"){const f=(e-s.at[0])/s.r[0],p=(t-s.at[1])/s.r[1],b=s.pow??2;return Math.pow(Math.abs(f),b)+Math.pow(Math.abs(p),b)<=1+(s.soft??0)*(n*2-1)}const i=s.from[0]/s.r[0],a=s.from[1]/s.r[1],r=s.to[0]/s.r[0],o=s.to[1]/s.r[1],c=e/s.r[0],l=t/s.r[1],h=r-i,d=o-a,u=ke(((c-i)*h+(l-a)*d)/(h*h+d*d),0,1);return Math.hypot(c-i-h*u,l-a-d*u)<=1}function ni(s,e,t,n=.5){let i="body";for(const a of s.tracts)Zx(a.region,e,t,n)&&(i=a.look);return s.looks[i]}const tn=s=>new me(s),Wi=(s,e)=>e.map(t=>s.index(t)),$x=new y;function Hc(s,e,t,n){return s.copy(e),t.iriAim&&s.lerp($x.set(t.iriAim[0],t.iriAim[1],t.iriAim[2]).normalize(),t.iriAlign).normalize(),n?(s.x+=(n()-.5)*t.jitter,s.y+=(n()-.5)*t.jitter,s.z+=(n()-.5)*t.jitter,s.normalize()):s}function jd(s,e,t){const{u:n,v:i}=s.wingUV(e,t);if(n<.08||n>1.05)return 1;const a=re(.08,.3,n)*(1-re(.9,1.05,n)),r=re(-2,-1.05,i)*(1-re(-.75,-.55,i)),o=re(1.6,1,i)*(1-re(.7,.9,-i+1.6));return 1-a*Math.max(.62*r,i>.8?.25*o:0)}function Yd(s,e,t,n){const i=s.shading;let a=1+i.patch*(.6*kt(t*2.7,5)+.6*kt(n*8+t*1.3,6)),r=0;const o=e.fine?1:de(.12,1.7,re(-.25,.45,.7*kt(t*6.1+n*9,41)+.6*kt(n*21-t*3.3,42)));if(!e.fine){r=e.iriStrength>0&&t<6?re(.05,.6,.7*kt(t*3.4+n*5,31)+.5*kt(n*13-t*2,32))*i.goldAmount:0;const c=1-re(4.6,5.6,t);a*=de(1,i.flank,c*re(.2,.55,n)*(1-re(.72,.95,n))),a*=de(1,i.under,re(2.6,.5,t)*(1-re(.4,.7,n)))}return{shade:a,gold:r,glit:o}}function vs(s,e,t=1,n=0,i=6972448,a=1){const r=(.8+e()*.4)*t,o=tn(s.iri).lerp(tn(s.iriGraze),e()*e()*.45);return{base:tn(s.base).multiplyScalar(r),tip:tn(s.tip).lerp(tn(i),n*e()).multiplyScalar(r),iri:o,iri2:tn(s.iriGraze),iriStrength:s.iriStrength*de(.75+e()*.5,2.6*Math.pow(e(),2.5),s.sparkle??0)*(1+n*1.5)*a,iriPower:s.iriPower*(.8+e()*.5),loose:s.loose??0,round:s.round,cup:s.cup,channel:s.channel==="gorget"?Xx:s.channel==="crown"?Kx:qx}}const ja=new y,mo=new y,as=new y;function Jd(s,e,t,n){const{loft:i}=s;if(e<i.species.throat[0]-1.1||Math.cos(t)<-.5)return;const a=Math.min(e+.02,i.sMax);i.point(a,t,ja).sub(i.point(e-.02,t,as)).multiplyScalar(1/(a-e+.02)),i.point(e,t+.02,mo).sub(i.point(e,t-.02,as)).multiplyScalar(1/.04);const r=ja.clone().multiplyScalar(1/ja.lengthSq()),o=mo.clone().multiplyScalar(1/mo.lengthSq()),c=n.clone(),l=ja.clone().normalize(),h=i.frontLength(e);return d=>{as.copy(d).sub(c);const u=as.dot(r),f=i.frontAt(h+as.dot(l))-e,p=i.skin(ke(e+(Math.abs(f)<Math.abs(u)?f:u),0,i.sMax),t+as.dot(o));return{bones:Wi(s,p.bones),weights:p.weights}}}function Qx(s,e,t){const{loft:n,species:i}=e,a={p:new y,n:new y,t:new y},r={p:new y,n:new y,t:new y},o=new y,c=new y,l=new y,h=new y,d=new y,u=new y,f=new y,p=i.eye.radius,b=Math.PI*2,g=L=>{const R=(L%b+b)%b;return R<=Math.PI?R/Math.PI:(b-R)/Math.PI},m=(L,R,k=.5)=>{const U=ni(i,L,R,k);let F=U.width;if(!U.fine){const V=ni(i,L-.45,R),O=ni(i,L+.45,R);F=(F*2+(V.fine?F:V.width)+(O.fine?F:O.width))/4}return{look:U,width:F}},_=240,S=40,v=new Float32Array(_).fill(1),w=new Uint16Array(_),E=[],x=new Float32Array(S+1),M=.001;let N=n.sMax-.015;for(;N>.03;){let L=0;for(let k=0;k<=S;k++){const U=k/S*b;x[k]=n.point(Math.min(N+.01,n.sMax),U,c).distanceTo(n.point(N-.01,U,l))/.02,L=Math.max(L,x[k])}const R=M/L;for(let k=0;k<_;k++){const U=k/_*S,F=Math.min(Math.floor(U),S-1),{look:V,width:O}=m(N,g(k/_*b)),W=O*V.aspect*V.rowStep;if(v[k]+=de(x[F],x[F+1],U-F)*R,v[k]>=W){v[k]=Math.min(v[k]-W,W*.5);const Y=w[k]++;(E[Y]??=new Float32Array(_).fill(NaN))[k]=N}}N-=R}const P=new y,I=new y,D=(L,R)=>{n.surface(L,R,a);for(const oe of Jt)if(a.p.distanceTo(e.eyes[oe].center)<p*1.02)return;const k=n.wingUV(L,R),U=k.u>.04&&k.u<.97&&Math.abs(k.v)<.9,F=U&&k.v<-.3&&k.u<.5&&.5+.5*kt(L*53+R*91,77)<.75*re(-.3,-.75,k.v)*(1-re(.32,.5,k.u));if(U&&!F)return;const V=g(R),O=m(L+(t()-.5)*.06,ke(V+(t()-.5)*.012,0,1),t()),W=O.width,Y=Math.pow(1-re(7.1,9,L),1.4),j=re(.56,.86,V)*Y*re(6.25,7,L),ue=re(.5,.8,V)*re(8.5,9.2,L),H=F?i.looks.flank:O.look===i.looks.crown&&L<8.5&&t()<.5*re(.7,.9,V)?i.looks.head:O.look,Z=H.fine?0:j,te=H.fine||H===i.looks.stripe?0:re(6,6.7,L)*re(.35,.6,V)*(.35+.65*Y),he=kt(L*11+V*37,51);if(te>0&&he>.45&&t()<.4*te||H===i.looks.gorget)return;const Q=i.looks.gorget,De=L>4.6&&L<8.2&&V<.5?ni(i,L,Math.max(V-.035,0))===Q?2:ni(i,L,Math.max(V-.08,0))===Q?1:0:0;if(De===2)return;const Ye=De===0&&L>4.2&&L<5.6&&V<.4&&ni(i,L+.5,V)===Q,be=i.shading,Fe=Yd(i,H,L,V),{gold:le,glit:fe}=Fe,Re=Fe.shade*jd(n,L,R),ye=H.loose??0,Ue=kt(L*4.3+V*17,21),se=kt(L*3.1-V*23,22),tt=1+(t()-.5)*de(.26,.65,ye),je=W*H.aspect*tt*(1+Z*(.3+1.3*t()*t())+te*(t()-.5)*.5),ct=t()<.035*ye+.14*Z?1:0;let st=(H.tilt+(t()-.5)*de(6,17,ye)+se*7*ye+ct*(8+t()*10))*Le;const At=(t()-.5)*de(.17,.72,ye)+Ue*.4*ye+ct*(t()-.5)*.9+((t()-.5)*.9+he*.45)*te,G=((t()-.5)*.7+se*.3)*ye+((t()-.5)*1.1+he*.5)*te;if((De||Ye)&&(st*=.35),F)st+=9*Le;else if(k.u>0&&k.u<1&&Math.abs(k.v)<1.7&&!ct){const oe=1-re(.9,1.7,Math.abs(k.v));st*=1-.6*oe}let Et=H.lift+Z*.9;st=st*(1-.55*ue)+Z*(14+30*t()*t()+9*he)*Le;const ft=n.point(Math.min(L+.01,n.sMax),R,c).distanceTo(n.point(Math.max(L-.01,0),R,l))/.02;f.copy(a.p),o.copy(a.n),n.surface(Math.max(L-je*.85/Math.max(ft,.02),0),R,r),h.copy(r.p).addScaledVector(r.n,je*Math.sin(st)).sub(f),h.lengthSq()<1e-8&&h.copy(a.t),h.normalize(),d.copy(o).add(r.n).addScaledVector(h,-o.dot(h)-r.n.dot(h)).normalize(),h.applyAxisAngle(d,At),d.applyAxisAngle(h,G),Hc(u,d,H,t);const bt=n.skin(L,R);s.add({...vs(H,t,Re,le,be.gold,fe),root:f,dir:h,normal:d,skinNormal:o,iriNormal:u,width:W*tt,length:je,cols:H.fine?5:3,rows:4,curl:de(.1,.02+t()*.22,ye),asym:0,bones:Wi(e,bt.bones),weights:bt.weights,skinAt:Jd(e,L,R,f),rand:t(),coord:n.bodyCoord(L)*.8,gain:Et,cover:ke(1-H.rowStep,.1,.9)})};for(let L=0;L<E.length;L++){const R=E[L];for(const k of[1,-1]){let U=L&1?.5:k>0?1:0,F=!1;for(let V=0;V<_/2;V++){const O=(k*V%_+_)%_,W=(k*(V+1)%_+_)%_,Y=R[O],j=R[W];if(Number.isNaN(Y)||Number.isNaN(j)){F=!0;continue}F&&(U=t(),F=!1);const ue=k*V*b/_,H=k*(V+1)*b/_;n.point(Y,ue,P),n.point(j,H,I);const{look:Z,width:te}=m((Y+j)/2,g((ue+H)/2)),he=P.distanceTo(I)/(te*(Z.spacing??.6));for(;U+he>=1;){const Q=(1-U)/he,De=(t()-.5)*.25*te*Z.aspect*Z.rowStep/.11,Ye=de(.12,.5,Z.loose??0)*(Z.fine?1:1+1.8*re(6,6.7,(Y+j)/2));D(ke(de(Y,j,Q)+De*(1+2*(Z.loose??0)),.02,n.sMax),de(ue,H,Q)+(t()-.5)*Ye*te/.15),U-=1}U+=he}}}}function ev(s,e,t){const{loft:n,species:i}=e,a=i.looks.gorget;if(!a)return;const r={p:new y,n:new y,t:new y},o=[],c=new y,l=new y;let h=n.sMax;for(;h>4.3&&ni(i,h,0)!==a;)h-=.02;const d=Math.min(h+.5,n.sMax-.3);let u=0,f=1/0;const p=.02,b=.02,g=new Map;{let D=0;for(let L=0;;L++){const R=d-L*p;if(R<4.3)break;L>0&&(D+=n.point(R,0,c).distanceTo(n.point(R+p,0,l))),g.set(L,D)}D=0;for(let L=-1;;L--){const R=d-L*p;if(R>n.sMax-.05)break;D-=n.point(R,0,c).distanceTo(n.point(R-p,0,l)),g.set(L,D)}}for(const[D,L]of g){const R=d-D*p;let k=0;for(let U=0;U*b<=1.3;U++){const F=U*b;if(U>0&&(k+=n.point(R,F,c).distanceTo(n.point(R,F-b,l))),ni(i,R,F/Math.PI)===a){for(const V of U===0?[1]:[1,-1])o.push({s:R,a:F*V,x:k*V,y:L});u=Math.max(u,Math.hypot(k,L)),f=Math.min(f,Math.hypot(k,L))}}}if(!o.length)return;const m=(D,L)=>{let R=o[0],k=1/0;for(const U of o){const F=(U.x-D)*(U.x-D)+(U.y-L)*(U.y-L);F<k&&(k=F,R=U)}return{q:R,miss:Math.sqrt(k)}},_=new y,S=new y,v=new y,w=new y,E=new y,x=new me(3814655),M=new me(14036168),N=a.spacing??.8;let P=Math.max(f,a.width*.3),I=0;for(;P<=u+a.width*.3;){const D=ke((P-f)/(u-f),0,1),L=a.width*de(.6,1.3,D),R=L*a.aspect,k=Math.max(1,Math.round(Math.PI*2*P/(L*N)));for(let U=0;U<k;U++){const F=(U+(I%2?.5:0))/k*Math.PI*2-Math.PI+(t()-.5)*.12*(L/Math.max(P,L)),{q:V,miss:O}=m(P*Math.sin(F),P*Math.cos(F));if(O>.03)continue;const W=m(P*Math.sin(F),P*Math.cos(F)-R*.7).miss>.02;n.surface(V.s,V.a,r);const Y=Math.sign(F)*Math.min(Math.abs(F)*.5,.6)+(t()-.5)*.14,j=(a.tilt+(t()-.5)*3)*Le;S.copy(r.p),_.crossVectors(r.n,r.t),_.x<0&&_.multiplyScalar(-1),v.copy(r.t).multiplyScalar(Math.cos(Y)).addScaledVector(_,Math.sin(Y)).normalize(),w.copy(r.n).multiplyScalar(Math.cos(j)).addScaledVector(v,-Math.sin(j)),v.multiplyScalar(Math.cos(j)).addScaledVector(r.n,Math.sin(j)),Hc(E,w,a,t);const ue=vs(a,t),H=ke(D+(t()-.5)*.16,0,1);H<.45?ue.iri.lerp(x,(1-H/.45)*.85):ue.iri.lerp(M,(H-.45)/.55*.8);const Z=Jd(e,V.s,V.a,S),te=n.skin(V.s,V.a),he=.94+t()*.12;s.add({...ue,root:S,dir:v,normal:w,skinNormal:r.n,iriNormal:E,width:L*he,length:R*he,cols:9,rows:6,scallop:!0,cup:.16,curl:.05,asym:0,bones:Wi(e,te.bones),weights:te.weights,skinAt:Z,rand:t(),coord:n.bodyCoord(V.s)*.8,gain:a.lift,cover:W?.25:ke(1-a.rowStep,.1,.9)})}P+=L*a.aspect*a.rowStep,I++}}function tv(s,e,t,n){const i=e.species.wing,a=e.wings[t],r=fn(t),o=tn(i.color),c=tn(i.sheen),l=new y,h=new y,d=new y,u=(M,N,P,I)=>{const D=e.rest[M.name];new Ve().makeRotationFromQuaternion(D.worldQuat).extractBasis(l,h,d),d.applyAxisAngle(h,(n()-.5)*.02),h.applyAxisAngle(d,(n()-.5)*.12);const L=e.index(M.name),R=.7+n()*.6;s.add({root:D.worldPos,dir:d,normal:h,skinNormal:null,iriNormal:h,width:P,length:N,cols:3,rows:9,round:.75,cup:.12,curl:.012,asym:I*r,base:o.clone().multiplyScalar(R),tip:o.clone().multiplyScalar(R*.8),iri:c,iri2:c,iriStrength:.22,iriPower:2.5,loose:0,widen:.3,bones:[L,0,0,0],weights:[1,0,0,0],rand:n(),coord:r>0?Gh:Hh,gain:0,cover:r>0?.2:.8,channel:Gc})};a.primaries.forEach((M,N)=>{const P=N/(a.primaries.length-1);u(M,de(i.primaryLen[0],i.primaryLen[1],Math.pow(P,.75)),i.primaryWidth*de(1.15,.8,P),de(.2,.5,P))}),a.secondaries.forEach((M,N)=>{const P=N/(a.secondaries.length-1);u(M,de(i.secondaryLen[0],i.secondaryLen[1],P),i.secondaryWidth,.15)});const f=e.species.looks.covert,p=e.rest[`hand.${t}`],b=e.rest[`forearm.${t}`];new Ve().makeRotationFromQuaternion(p.worldQuat).extractBasis(l,h,d);const g=l.clone().multiplyScalar(r),m=h.clone(),_=d.clone(),S=p.worldPos.clone().addScaledVector(_,i.hand),v=[{off:-.02,len:.075,w:.034,lift:.006,n:15},{off:0,len:.1,w:.04,lift:.008,n:14},{off:.024,len:.13,w:.046,lift:.01,n:14},{off:.05,len:.17,w:.05,lift:.012,n:13}],w=new y,E=new y,x=new y;for(const M of v)for(let N=0;N<M.n;N++){const P=de(-.55,.9,(N+n()*.7)/M.n);P<0?w.copy(p.worldPos).lerp(b.worldPos,-P/.5):w.copy(p.worldPos).lerp(S,P),w.addScaledVector(g,M.off+(n()-.5)*.016).addScaledVector(m,M.lift);const I=.06+n()*.08;E.copy(_).applyAxisAngle(m,r*(.1+n()*.3+(P<0?.25:0))),x.copy(m).multiplyScalar(Math.cos(I)).addScaledVector(E,-Math.sin(I)),E.multiplyScalar(Math.cos(I)).addScaledVector(m,Math.sin(I));const D=e.index(P<0?`forearm.${t}`:`hand.${t}`),L=.8+n()*.4;s.add({...vs(f,n,.8+.3*n()),root:w,dir:E,normal:x,skinNormal:m,iriNormal:x,width:M.w*L,length:M.len*L,cols:3,rows:4,curl:.04+n()*.1,asym:0,bones:[D,0,0,0],weights:[1,0,0,0],rand:n(),coord:r>0?Gh:Hh,gain:0,cover:.55})}}function nv(s,e,t,n){const{loft:i,species:a}=e,r=a.wing,o=fn(t),c=o>0?Yx:Jx,l={p:new y,n:new y,t:new y},h={p:new y,n:new y,t:new y},d=(U,F,V)=>{const O=i.wingAt(U,F,o);return i.surface(ke(O.s,.02,i.sMax),O.ang,V),O};d(0,0,l),d(1,0,h);const u=l.p.distanceTo(h.p),f=new y,p=new y,b=new y,g=tn(r.color),m=tn(r.sheen),_=a.looks.wingCovert,S=(U,F,V,O,W,Y)=>{const j=d(U,F,l);d(U+V/u,F+O,h),f.copy(l.p).addScaledVector(l.n,W),p.copy(h.p).addScaledVector(h.n,W+V*Math.sin(Y*Le)).sub(f).normalize(),b.copy(l.n).add(h.n).addScaledVector(p,-l.n.dot(p)-h.n.dot(p)).normalize();const ue=i.skin(ke(j.s,.02,i.sMax),j.ang);return{bones:Wi(e,ue.bones),weights:ue.weights}},v=7;for(let U=0;U<v;U++){const F=U/(v-1),V=de(.03,.3,F*F*.4+F*.6),O=de(.024,.05,F),W=O*de(2.2,3.4,F),Y=de(r.rest.width[0],r.rest.width[1],re(0,.35,V)),j=Math.max(3,Math.round(2*Y/(O*.62)));for(let ue=0;ue<j;ue++){const H=ke(-.98+2*(ue+(U%2?.5:0)+(n()-.5)*.3)/j,-1.02,1.02),Z=.85+n()*.3,te=S(V+(n()-.5)*.012,H,W*Z,-H*.12+(n()-.5)*.1,.004+F*.004,7+n()*5),he=vs(_,n,.8+.4*n()),Q=r.bar;Q&&F>=Q.rows[0]&&F<=Q.rows[1]&&H>=Q.v[0]&&H<=Q.v[1]&&(he.base=tn(Q.base),he.tip=tn(Q.tip),he.iriStrength=0),s.add({...he,root:f,dir:p,normal:b,skinNormal:l.n,iriNormal:b,width:O*Z,length:W*Z,cols:3,rows:4,curl:.05+n()*.08,asym:0,...te,rand:n(),coord:c,gain:0,cover:ke(1-_.rowStep,.1,.9)})}}for(let U=.42;U<.98;U+=.04)for(const F of[-.82,-.3,.3,.82]){const V=.85+n()*.3,O=S(U+(n()-.5)*.02,F+(n()-.5)*.2,.085*V,-F*.1,.002,4);s.add({...vs(_,n,.7+.3*n()),root:f,dir:p,normal:b,skinNormal:l.n,iriNormal:b,width:.05*V,length:.085*V,cols:3,rows:4,curl:.04,asym:0,...O,rand:n(),coord:c,gain:0,cover:.5})}const w=[];for(let U=0;U<=26;U++)for(let F=0;F<=14;F++)d(U/20,de(-2.2,2.2,F/14),l),w.push({p:l.p.clone(),n:l.n.clone()});const E=new y,x=U=>{let F=w[0],V=1/0;for(const O of w){const W=O.p.distanceToSquared(U);W<V&&(V=W,F=O)}return E.copy(U).sub(F.p).dot(F.n)},M=a.tail,N=M.droop*Le,P=new y(0,-Math.sin(N),-Math.cos(N)),I=new y(0,Math.cos(N),-Math.sin(N)),D=i.center(a.spine.tail,new y).addScaledVector(P,M.length[1]*r.rest.cross[0]).addScaledVector(I,.035);D.x=r.rest.cross[1]*o,o>0&&D.addScaledVector(I,.014);const L=new y,R=new y,k=[];for(let U=0;U<r.secondaries;U++){const F=U/(r.secondaries-1);k.push({u:de(.2,.3,F),v:de(.82,.3,F),w:.066,reach:1,to:null,len:de(.19,.27,F),dv:-.3,asym:.15})}for(let U=0;U<r.primaries;U++){const F=U/(r.primaries-1);k.push({u:de(.3,.42,F),v:de(.25,-.8,F),w:de(.068,.05,F),reach:de(.52,1,Math.pow(F,.8)),to:D.clone().addScaledVector(I,(1-F)*.05).addScaledVector(P,-(1-F)*.02),len:0,dv:0,asym:de(.2,.45,F)})}k.forEach((U,F)=>{const V=d(U.u,U.v,l),O=.016-F*7e-4;f.copy(l.p).addScaledVector(l.n,O),R.copy(l.n);let W=U.len;U.to?(L.copy(U.to),W=L.distanceTo(f)*U.reach):(d(U.u+W/u,U.v+U.dv,h),L.copy(h.p).addScaledVector(h.n,O),R.add(h.n).normalize());const Y=.035;for(let H=0;H<60;H++){p.copy(L).sub(f).normalize(),b.copy(R).addScaledVector(p,-R.dot(p)).normalize();let Z=!0;for(const te of[.25,.45,.65,.85,1])if(E.copy(f).addScaledVector(p,te*W).addScaledVector(b,-Y*W*te*te),x(E.clone())<.005+.012*te-F*3e-4){Z=!1;break}if(Z)break;L.addScaledVector(R,.005)}const j=i.skin(ke(V.s,.02,i.sMax),V.ang),ue=.75+n()*.5;s.add({root:f,dir:p,normal:b,skinNormal:null,iriNormal:b,width:U.w,length:W,cols:3,rows:9,round:.75,cup:.1,curl:Y,asym:U.asym*o,base:g.clone().multiplyScalar(ue),tip:g.clone().multiplyScalar(ue*.8),iri:m,iri2:m,iriStrength:.22,iriPower:2.5,loose:0,widen:.2,bones:Wi(e,j.bones),weights:j.weights,rand:n(),coord:c,gain:0,cover:o>0?.2:.8,channel:Gc})})}function iv(s,e,t){const n=e.species.tail,i=tn(n.color),a=tn(4609132),r=new y,o=new y,c=new y;for(const l of e.rectrices){const h=e.rest[l.bone.name];new Ve().makeRotationFromQuaternion(h.worldQuat).extractBasis(r,o,c);const d=(Math.abs(l.k)-.5)/Math.max(n.rectrices-1,1),u=.85+t()*.3,f=n.outer&&d>=n.outer.from?tn(n.outer.color):i;s.add({root:h.worldPos,dir:c,normal:o,skinNormal:null,iriNormal:o,width:n.width,length:de(n.length[0],n.length[1],Math.pow(d,1.4)),cols:5,rows:14,round:1,cup:.06,curl:.01,asym:.12*Math.sign(l.k),base:f.clone().multiplyScalar(u),tip:f.clone().multiplyScalar(u*.8),iri:d<.1?tn(2058840):a,iri2:a,iriStrength:d<.1?.13:.2,iriPower:3,loose:0,widen:.45,bones:[e.index(l.bone.name),0,0,0],weights:[1,0,0,0],rand:t(),coord:1,gain:0,cover:l.k>0?.8:.2,channel:Gc})}}function sv(s,e=3,t=120,n=80){const{loft:i,species:a}=s,r=new pc,o={p:new y,n:new y,t:new y},c=new y,l=new Float32Array(n+1),h=Array.from({length:n+1},()=>new y),d=new y,u=Ln(a.seed+99),f=560,p=i.sMax-.12,b=[];for(let g=0;g<=t;g++){const m=p-g/t*(p-.05);for(let _=0;_<=n;_++){const S=_/n*Math.PI*2;i.surface(m,S,o),g>0&&(l[_]+=h[_].distanceTo(o.p)),h[_].copy(o.p),b.push({p:o.p.clone(),n:o.n.clone(),d:l[_],s:m,a:S})}}for(let g=0;g<e;g++){const m=e>1?g/(e-1):0,_=de(.008,.03,m),S=r.pos.length/3;for(let v=0;v<b.length;v++){const w=b[v],E=v%(n+1),x=w.a<=Math.PI?w.a/Math.PI:(2*Math.PI-w.a)/Math.PI,M=ni(a,w.s,x),N=Yd(a,M,w.s,x),{gold:P,glit:I}=N,D=N.shade*jd(i,w.s,w.a);let L=M.fuzz??Math.min(.55+(M.loose??0)*.6,1);for(const U of Jt)L*=re(a.eye.radius*1.25,a.eye.radius*2.1,w.p.distanceTo(s.eyes[U].center));L*=1-re(i.sMax-.7,i.sMax-.2,w.s);{const U=i.wingUV(w.s,w.a);U.u>.02&&U.u<.99&&(L*=re(.85,1.15,Math.abs(U.v)))}const R=vs(M,u,D,P,a.shading.gold,I);Hc(d,w.n,M),c.copy(w.p).addScaledVector(w.n,_*(.5+.5*Math.min(L*2,1))*ke(M.width/.03,.4,1));const k=i.skin(w.s,w.a);r.pos.push(c.x,c.y,c.z),r.nor.push(w.n.x,w.n.y,w.n.z),r.uv.push(E/n*f,w.d),r.root.push(c.x,c.y,c.z),r.hinge.push(1,0,0),r.data.push(m,i.bodyCoord(w.s)*.8,M.lift,jx),r.iriN.push(d.x,d.y,d.z),r.cBase.push(R.base.r,R.base.g,R.base.b,M.fine?0:M.iriStrength*I*(1+P)/4),r.cTip.push(R.tip.r,R.tip.g,R.tip.b,L),r.cIri.push(R.iri.r,R.iri.g,R.iri.b,M.iriPower/32),r.cIri2.push(R.iri2.r,R.iri2.g,R.iri2.b,m),r.si.push(...Wi(s,k.bones)),r.sw.push(...k.weights)}for(let v=0;v<t;v++)for(let w=0;w<n;w++){const E=S+v*(n+1)+w,x=E+n+1;r.idx.push(E,x,E+1,x,x+1,E+1)}}return r}function av(s){const e=Ln(s.species.seed),t=new pc;Qx(t,s,e),ev(t,s,e);const n=new pc;for(const a of Jt)tv(n,s,a,e),nv(n,s,a,e);iv(n,s,e);const i=sv(s);return{contour:t.build(),flight:n.build(),fuzz:i.build()}}function rv(s,e=64,t=36,n=.007){const i={p:new y,n:new y,t:new y},{loft:a}=s,r=[],o=[],c=[],l=[],h=new y;for(let u=0;u<=e;u++){const f=u/e*a.sMax;for(let p=0;p<=t;p++){const b=p/t*Math.PI*2,g=a.skin(f,b);a.surface(f,b,i),h.copy(i.p).addScaledVector(i.n,-n),r.push(h.x,h.y,h.z),o.push(...Wi(s,g.bones)),c.push(...g.weights)}}for(let u=0;u<e;u++)for(let f=0;f<t;f++){const p=(u+.5)/e*a.sMax;if(p>4.3&&p<9&&Math.cos((f+.5)/t*Math.PI*2)>-.25)continue;const b=u*(t+1)+f,g=b+t+1;l.push(b,b+1,g,g,b+1,g+1)}const d=new yt;return d.setAttribute("position",new et(r,3)),d.setAttribute("skinIndex",new _r(o,4)),d.setAttribute("skinWeight",new et(c,4)),d.setIndex(l),d.computeVertexNormals(),d}const Zd=`
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
}`,$d=`
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
float fC = cos(fAng), fS = sin(fAng);`,Qd=`
vec3 transformed = aData.w > 3.5 ? position + normal * max(fAng, -0.1) * 0.05 : aRoot + rotAxis(position - aRoot, aHinge, fC, fS);
// as the wing spreads the resting wing sinks into the body and the real blades grow out of it
if (fRest) {
  vec3 fPivot = vec3(fRight ? -uWingPivot.x : uWingPivot.x, uWingPivot.yz);
  transformed = fPivot + wingSwing(transformed - fPivot, fRight);
  transformed = mix(transformed, aRoot - normal * 0.03, fUnfold);
}
if (fReal) transformed = mix(aRoot, transformed, fUnfold * fBeat);
`;function ov(){const s={uFluff:{value:0},uLift:{value:new Float32Array(8)},uGorget:{value:0},uCrest:{value:0},uWingSpread:{value:new Ke},uWingLift:{value:new Ke},uWingOut:{value:new St},uWingPivot:{value:new y},uWingSpan:{value:new y(0,0,-1)},uWingChord:{value:new y(0,1,0)},uFlash:{value:1},uGlint:{value:1},uPal:{value:[new Je,new Je,new Je,new Je]}},e=new on({color:16777215,roughness:.6,metalness:0,side:Lt,alphaToCoverage:!0});return e.onBeforeCompile=t=>{Object.assign(t.uniforms,s),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>
${Zd}
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
varying vec3 vIriN;`).replace("#include <beginnormal_vertex>",`${$d}
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
vIriN = normalize(normalMatrix * fIriN);`).replace("#include <begin_vertex>",Qd),t.fragmentShader=t.fragmentShader.replace("#include <common>",`#include <common>
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
  float occ = flight ? mix(0.5, 1.0, smoothstep(0.0, 0.25, v)) : mix(scale ? 0.42 : mix(0.74, 0.96, plush), 1.0, bare);
  float edge = scallop ? (v > 0.5 ? length(vec2(u, (v - 0.5) * 2.0)) : au * 0.85) : max(au, (v - 0.55) / 0.45);
  // scales carry a paler fringe on the free edge; soft feathers just vary barb by barb
  float rim = scale ? -smoothstep(0.8, 1.0, edge) * 0.45 : 0.0;
  pig *= occ * (1.0 + (flight ? 0.26 : scale ? 0.35 : 0.0) * fBarb) * (1.0 + rim);
  // soft feathers: the strands carry the colour, between them it is nearly dark
  // (plush feathers: hardly darker between the strands, so no row of them casts a line)
  if (!flight && !scale) pig *= mix(mix(mix(0.3, 0.74, plush), mix(1.3, 1.08, plush), strand), 0.86, lod) * (0.88 + 0.24 * mix(h, 0.5, lod));
  fBarbHue = flight || scale ? 0.5 : mix(0.55 * fract(rnd * 5.31) + 0.45 * fract(h2 * 3.7 + h), 0.5, lod * 0.6);
  if (!flight && !scale) {
    // per feather, subtle: a touch warmer or cooler, lighter or darker,
    // and now and then a worn pale tip
    float r1 = fract(rnd * 17.13);
    float r2 = fract(rnd * 41.71);
    pig *= mix(vec3(1.05, 0.98, 0.93), vec3(0.95, 0.98, 1.06), r1);
    pig *= mix(0.87 + 0.26 * r2, 0.76 + 0.08 * r2, plush);
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
}`)},e.customProgramCacheKey=()=>"plumage-v47",{material:e,uniforms:s}}function cv(s){const e=new wd({side:Lt});return e.onBeforeCompile=t=>{Object.assign(t.uniforms,s),t.vertexShader=t.vertexShader.replace("#include <common>",`#include <common>${Zd}`).replace("#include <begin_vertex>",$d+Qd)},e.customProgramCacheKey=()=>"plumage-depth-v5",e}class zs{constructor(e){this.rig=e}rig;pos=[];nor=[];col=[];uv=[];si=[];sw=[];idx=[];add(e,t,n,i,a){const r=this.rig.rest[t],o=new Ve().compose(r.worldPos,r.worldQuat,new y(1,1,1)),c=e.index?e.toNonIndexed():e.clone(),l=c.getAttribute("position").clone();c.applyMatrix4(o);const h=c.getAttribute("position"),d=c.getAttribute("normal"),u=c.getAttribute("uv"),f=this.pos.length/3,p=this.rig.index(t),b=new y;for(let g=0;g<h.count;g++){b.fromBufferAttribute(l,g);const m=a?.(b)??n;this.pos.push(h.getX(g),h.getY(g),h.getZ(g)),this.nor.push(d.getX(g),d.getY(g),d.getZ(g)),this.col.push(m.r,m.g,m.b),this.uv.push(u?u.getX(g):0,u?u.getY(g):0),this.si.push(i?this.rig.index(i(b)):p,0,0,0),this.sw.push(1,0,0,0),this.idx.push(f+g)}c.dispose(),e.dispose()}build(){const e=new yt;return e.setAttribute("position",new et(this.pos,3)),e.setAttribute("normal",new et(this.nor,3)),e.setAttribute("color",new et(this.col,3)),e.setAttribute("uv",new et(this.uv,2)),e.setAttribute("skinIndex",new _r(this.si,4)),e.setAttribute("skinWeight",new et(this.sw,4)),e.setIndex(this.idx),e.boundingSphere=new vn(new y(0,.4,0),2.5),e}}function Bs(s,e,t,n=10){const i=[],a=[],r=s.length,o=new y,c=new y,l=new y;for(let d=0;d<r;d++){o.copy(s[Math.min(d+1,r-1)]).sub(s[Math.max(d-1,0)]).normalize(),c.crossVectors(t,o).normalize(),l.crossVectors(o,c);const[u,f]=e(d/(r-1));for(let p=0;p<=n;p++){const b=p/n*Math.PI*2;i.push(s[d].x+c.x*Math.cos(b)*u+l.x*Math.sin(b)*f,s[d].y+c.y*Math.cos(b)*u+l.y*Math.sin(b)*f,s[d].z+c.z*Math.cos(b)*u+l.z*Math.sin(b)*f)}}for(let d=0;d<r-1;d++)for(let u=0;u<n;u++){const f=d*(n+1)+u,p=f+n+1;a.push(f,f+1,p,p,f+1,p+1)}const h=new yt;return h.setAttribute("position",new et(i,3)),h.setIndex(a),h.computeVertexNormals(),h}function go(s,e,t,n,i=!1){const o=[],c=[],l=[];for(let d=0;d<=12;d++){const u=de(e,t,d/12);for(let f=0;f<=12;f++){const p=de(-n,n,f/12);let b=Math.sin(p),g=Math.cos(p)*Math.sin(u);const m=Math.cos(p)*Math.cos(u);if(i){const _=b;b=g,g=_}o.push(b*s,g*s,m*s),c.push(b,g,m)}}for(let d=0;d<12;d++)for(let u=0;u<12;u++){const f=d*13+u,p=f+12+1;i?l.push(f,p,f+1,p,p+1,f+1):l.push(f,f+1,p,p,f+1,p+1)}const h=new yt;return h.setAttribute("position",new et(o,3)),h.setAttribute("normal",new et(c,3)),h.setIndex(l),h}const bo={upperOpen:62*Le,lowerOpen:-72*Le,nictOpen:150*Le};function lv(s){const e=s.species,t=e.eye.radius,n=new me(e.skin),i=new y(0,1,0),a=new zs(s),r=new me(2369067),o=new me(7829372),c=new me(526346);for(const j of Jt){const ue=j==="L"?-1:1,H=96,Z=7,te=[],he=[],Q=[],De=new me;for(let fe=0;fe<=H;fe++){const Re=fe/H*Math.PI*2,ye=Math.cos(Re),Ue=Math.sin(Re),se=ye*ue>0?1.3:1.6,tt=1/Math.pow(Math.pow(Math.abs(ye)/(43*Le),se)+Math.pow(Math.abs(Ue)/(29*Le),se),1/se),je=56*Le;for(let ct=0;ct<=Z;ct++){const st=ct/Z,At=de(tt,je,st),G=Math.pow(Math.sin(Math.PI*Math.min(st/.5,1)),.6),Et=Math.max(0,Math.sin(Re*38))*re(.12,.2,st)*(1-re(.22,.32,st)),ft=t*(1.05+.02*G+.004*Et-.035*re(.5,1,st));te.push(Math.sin(At)*ye*ft,Math.sin(At)*Ue*ft,Math.cos(At)*ft),De.copy(o).multiplyScalar(.55+.5*G).lerp(c,Math.max(Et*.35,re(.4,.6,st))),he.push(De.r,De.g,De.b)}}for(let fe=0;fe<H;fe++)for(let Re=0;Re<Z;Re++){const ye=fe*(Z+1)+Re,Ue=ye+Z+1;Q.push(ye,Ue,ye+1,Ue,Ue+1,ye+1)}const Ye=new yt;Ye.setAttribute("position",new et(te,3)),Ye.setAttribute("color",new et(he,3)),Ye.setIndex(Q),Ye.computeVertexNormals();const be=Ye.toNonIndexed(),Fe=be.getAttribute("color");let le=0;a.add(be,`eye.${j}`,o,null,()=>De.fromBufferAttribute(Fe,le++).clone()),a.add(go(t*1.04,12*Le,112*Le,78*Le),`lidUpper.${j}`,r),a.add(go(t*1.036,-106*Le,16*Le,78*Le),`lidLower.${j}`,r)}const l=new me(e.legs.color),h=e.legs.perchRadius;for(const j of Jt){const ue=fn(j),H=s.tarsusLength;a.add(Bs([0,.25,.5,.75,1,1.15].map(Q=>new y(0,0,Q*H)),Q=>[de(.011,.017,Q),de(.011,.017,Q)],i,8),`tarsus.${j}`,l);const Z=.0085,te=(Q,De,Ye,be,Fe)=>{const le=[];for(let Re=0;Re<=14;Re++){const ye=Re/14,Ue=de(De,Ye,ye),se=re(.78,1,ye)*.012,tt=(1-re(0,.2,ye))*.012,je=h+Z*.9-se+tt;le.push(new y(de(be,Fe,ye),-h+je*Math.cos(Ue),je*Math.sin(Ue)))}a.add(Bs(le,Re=>{const ye=Re>.78?de(.75,.08,(Re-.78)/.22):1+.12*Math.sin(Re*22);return[Z*ye,Z*ye*.9]},new y(1,0,0),7),`toe.${j}.${Q}`,l.clone().multiplyScalar(1-Q%2*.12))},he=e.legs.toe/(h+Z);te(1,-.12,he*.95,0,-.03*ue),te(2,-.12,he*1.1,0,.002*ue),te(3,-.12,he*.98,0,.034*ue),te(4,.05,-he*.8,0,-.006*ue)}const d=rv(s),u=new on({color:16777215,vertexColors:!0,roughness:.9,envMapIntensity:.4,side:Lt}),f=new on({color:n.clone().multiplyScalar(.5),roughness:1,envMapIntensity:.15,side:Lt}),p=new kn(d,f);p.name="bird.skin";const b=new kn(a.build(),u);b.name="bird.bare";const g=new zs(s),m=e.bill,_=new me(m.color),S=new me(2493968),v=j=>de(1,.17,Math.pow(j,.8))*(j>.95?de(1,.05,(j-.95)/.05):1),w=(j,ue,H,Z)=>{const te=[];for(let Q=0;Q<=26;Q++){const De=de(-.07,m.length*Z,Q/26),Ye=Math.max(De/m.length,0);te.push(new y(0,j*m.radius*v(Ye)-m.droop*Ye*Ye,De))}return Bs(te,Q=>{const De=Math.max((Q*(m.length*Z+.07)-.07)/m.length,0);return[m.radius*H*v(De),m.radius*ue*v(De)]},i,12)},E=j=>{const ue=Math.max(j/m.length,0);return-m.droop*ue*ue};g.add(w(.4,.58,1,1),"bill",_,null,j=>j.y<E(j.z)+.1*m.radius*v(Math.max(j.z/m.length,0))?S:null),g.add(w(-.36,.5,.9,.985),"bill",_,()=>"jaw",j=>j.y>E(j.z)-.1*m.radius*v(Math.max(j.z/m.length,0))?S:null);for(const j of[1,-1]){const ue=new yt,H=j*m.radius*.8,Z=j*m.radius*.72;ue.setAttribute("position",new et([H,2e-4,-.05,Z,2e-4,.09,H,-2e-4,-.05,Z,2e-4,.09,Z,-2e-4,.09,H,-2e-4,-.05],3)),ue.setAttribute("normal",new et([j,0,0,j,0,0,j,0,0,j,0,0,j,0,0,j,0,0],3)),g.add(ue,"bill",new me(393731),te=>te.y>0?"bill":"jaw")}const x=new zs(s);{const j=new me(15979474),ue=.04,H=m.length*.8,Z=he=>he.z<m.length*.5?"tongue.1":he.z<m.length*.7?"tongue.2":"tongue.3",te=(he,Q,De,Ye)=>{const be=[];for(let Fe=0;Fe<=14;Fe++){const le=de(De,Ye,Fe/14),fe=le/m.length,Re=Math.max((fe-.55)/.25,0);be.push(new y(de(he,Q,Fe/14),-8e-4*(1-fe*.7)-m.droop*fe*fe-.0028*Re*Re,le))}return be};x.add(Bs(te(0,0,ue,H-.012),he=>[de(.0036,.0027,he),de(.0024,.002,he)],i,8),"bill",j,Z);for(const he of[1,-1])x.add(Bs(te(he*.0011,he*.0015,H-.02,H),Q=>[.0015*Math.sqrt(1-Q*Q*.92),.0014*Math.sqrt(1-Q*Q*.92)],i,6),"bill",j,Z)}const M=new Bt({color:16777215,vertexColors:!0,roughness:.22,clearcoat:1,clearcoatRoughness:.12,sheen:.4,sheenColor:16770272,emissive:4863540,envMapIntensity:1.1,side:Lt}),N=new kn(x.build(),M);N.name="bird.tongue";const P=new on({color:16777215,vertexColors:!0,roughness:.68,envMapIntensity:.35,side:Lt}),I=new kn(g.build(),P);I.name="bird.bill";const D=new zs(s);for(const j of Jt){const ue=new Vi(t,40,28);ue.rotateX(Math.PI/2);const H=ue.getAttribute("position");for(let te=0;te<H.count;te++){const he=H.getZ(te)/t,Q=1+.028*re(.55,1,he);H.setXYZ(te,H.getX(te)*Q,H.getY(te)*Q,H.getZ(te)*Q)}ue.computeVertexNormals();const Z=ue.getAttribute("uv");for(let te=0;te<H.count;te++)Z.setXY(te,H.getZ(te)/t,0);D.add(ue,`eye.${j}`,new me(1,1,1))}const L=new Bt({color:0,roughness:.35,metalness:0,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.1,specularIntensity:.12,ior:1.4}),R=s.species.eye.iris,k=R===void 0?new me(.003,.0035,.006):new me(R).multiplyScalar(.55),U=`vec3(${k.r.toFixed(5)}, ${k.g.toFixed(5)}, ${k.b.toFixed(5)})`;L.onBeforeCompile=j=>{j.fragmentShader=j.fragmentShader.replace("#include <common>",`#include <common>
#define IRIS_COLOR ${U}`),j.vertexShader=j.vertexShader.replace("#include <common>",`#include <common>
varying float vEyeCos;`).replace("#include <uv_vertex>",`#include <uv_vertex>
vEyeCos = uv.x;`),j.fragmentShader=j.fragmentShader.replace("#include <common>",`#include <common>
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
}`)};const F=new kn(D.build(),L);F.name="bird.eyes";const V=new zs(s);for(const j of Jt)V.add(go(t*1.045,-100*Le,100*Le,80*Le,!0),`nict.${j}`,new me(9348296));const O=new Bt({color:16777215,vertexColors:!0,roughness:.45,transparent:!0,opacity:.3,clearcoat:.2,side:Lt,depthWrite:!1}),W=new kn(V.build(),O);W.name="bird.nict",W.renderOrder=2;const Y=[p,b,I,N,F,W];for(const j of Y)j.frustumCulled=!1,j.bind(s.skeleton,new Ve);return p.castShadow=!0,I.castShadow=!0,b.castShadow=!0,b.receiveShadow=!0,I.receiveShadow=!0,{meshes:Y,dispose(){for(const j of Y)j.geometry.dispose(),j.material.dispose()}}}const _o={spread:0,lift:0,droop:0,sweep:0,raise:0,out:0,twist:0};class eu{headYaw=0;headPitch=0;headRoll=0;headShift=new y;headStabil=.85;reachTarget=new y;reachWeight=0;reachDir=new y(0,0,1);reachPin=0;reachRoll=0;bodyYaw=0;bodyPitch=0;bodyRoll=0;bodyShift=new y;chestPitch=0;breath=0;fluff=0;lift=new Float32Array(8);gorget=0;crest=0;lidUpper=0;lidLower=0;nict=0;feetSlope=0;feetScale=1;grip=1;jaw=0;tongueOut=0;tongueCurl=0;carryAt=1;tailPitch=0;tailYaw=0;tailRoll=0;tailFan=0;wing={L:{..._o},R:{..._o}};reset(){Object.assign(this,hv),this.headShift.set(0,0,0),this.bodyShift.set(0,0,0),this.lift.fill(0);for(const e of Jt)Object.assign(this.wing[e],_o)}addLift(e,t,n){for(let i=0;i<8;i++){const a=(i/7-e)/t;this.lift[i]+=n*Math.exp(-a*a)}}}const hv=Object.fromEntries(Object.entries(new eu).filter(([,s])=>typeof s=="number")),Nn=new y(1,0,0),Gs=new y(0,1,0),xo=new y(0,0,1),Ya=new mt;function dv(s,e){const{bones:t,rest:n,species:i}=s,a=new qn,r=new mt,o=new mt,c=new mt,l=new mt,h=new mt,d=new mt,u=new mt,f=new mt,p=new y,b=new y,g=new y,m=new y,[_,S]=i.behaviour.neckShare,v={};for(const Ue of Jt){const se=n[`hand.${Ue}`].quat;v[Ue]={out:Nn.clone().applyQuaternion(se),fan:Gs.clone().applyQuaternion(se)}}{const Ue={p:new y,n:new y,t:new y},se=(st,At)=>{const G=s.loft.wingAt(st,At,1);return s.loft.surface(G.s,G.ang,Ue)},tt=se(.03,.3).p.clone(),je=se(.95,0).p.clone().sub(tt).normalize(),ct=se(.4,0).n.clone();ct.addScaledVector(je,-ct.dot(je)).normalize(),e.uWingPivot.value.copy(tt),e.uWingSpan.value.copy(je),e.uWingChord.value.crossVectors(ct,je)}const w=n.bill,E=new y(0,-i.bill.droop,i.bill.length).applyQuaternion(w.worldQuat).add(w.worldPos).sub(n.head.worldPos),x=E.length(),M=Math.atan2(E.y,E.z),N=.34,P=new y,I=new y,D=i.bill.length*.65,L=["tongue.1","tongue.2","tongue.3"],R=[.06,.5,.7].map(Ue=>Ue*i.bill.length),k=[0,.3,.7],U=(Ue,se)=>{const tt=i.bill.length,je=Math.min(Ue,tt),ct=-2*i.bill.droop*je/(tt*tt);return se.set(0,-i.bill.droop*(je/tt)*(je/tt)+ct*(Ue-je),Ue),-Math.atan(ct)},F=R.map(()=>new y),V=R.map(()=>new y),O=R.map((Ue,se)=>U(Ue,F[se])),W=new y,Y=new mt,j=new Ve,ue=new y,H=new y,Z=(()=>{const[Ue,se]=i.throat,tt={p:new y,n:new y,t:new y},je=n.head.worldPos,ct=s.loft.point(se,0,new y).sub(je),st=s.loft.point(Ue,0,new y).sub(je),At=s.loft.surface((Ue+se)/2,0,tt).p.clone().sub(je),G=tt.n.clone(),Et=s.loft.surface(Ue,0,tt).t.clone();return{chin:ct,rim:st,mid:At,out:G,down:Et,span:ct.distanceTo(st),pivot:je.clone().sub(n.chest.worldPos)}})(),te=.12,he=new mt,Q=new y,De=new y,Ye=new y,be=new y,Fe=n.sternum.worldPos.clone().sub(n.chest.worldPos).setX(0).normalize(),le=Jt.map(Ue=>({s:Ue,foot:t[`foot.${Ue}`],footRest:n[`foot.${Ue}`],toes:[1,2,3,4].map(se=>t[`toe.${Ue}.${se}`]),tarsus:t[`tarsus.${Ue}`]})),fe=()=>{h.copy(c).invert().multiply(l),d.copy(Ya).slerp(h,_),u.copy(Ya).slerp(h,S)};function Re(Ue,se,tt,je,ct,st){return st.copy(n.head.pos).applyQuaternion(ct).add(n.neck2.pos),st.applyQuaternion(je).add(n.neck1.pos),st.applyQuaternion(tt).add(n.chest.pos),st.add(n.spine.pos),st.applyQuaternion(se).add(Ue),st}const ye=function(se){a.set(se.bodyPitch,se.bodyYaw,se.bodyRoll,"YXZ"),r.setFromEuler(a),t.hips.quaternion.copy(r),t.hips.position.copy(n.hips.pos).add(se.bodyShift),o.setFromAxisAngle(Nn,se.chestPitch),t.chest.quaternion.copy(o),c.copy(r).multiply(o),t.sternum.position.copy(n.sternum.pos).addScaledVector(Fe,se.breath*.011),t.sternum.scale.set(1+se.breath*.028,1,1+se.breath*.012),a.set(-se.headPitch,se.headYaw,se.headRoll,"YXZ"),l.setFromEuler(a),fe(),Re(t.hips.position,r,o,d,u,g),Re(n.hips.pos,Ya,Ya,d,u,m),p.copy(m).sub(g).multiplyScalar(ke(se.headStabil,0,1)).add(se.headShift);const tt=ke(se.reachWeight,0,1);if(tt>0){W.copy(g).add(p),b.copy(se.reachTarget).sub(W);const oe=b.length()||1e-6,$e=ke(oe-x,-.24,N);W.addScaledVector(b,$e/oe);const Ie=ke(se.reachPin,0,1);Ie>0&&W.lerp(b.copy(se.reachDir).multiplyScalar(-x).add(se.reachTarget),Ie),b.copy(se.reachTarget).sub(W).normalize();const We=ke(Math.atan2(b.x,b.z),-2.2,2.2),C=ke(Math.asin(ke(b.y,-1,1))-M,-1.1,1.25);a.set(-C,We,se.headRoll*(1-tt),"YXZ"),Y.setFromEuler(a),Ie>0&&(ue.crossVectors(Gs,b).normalize(),H.crossVectors(b,ue),u.setFromRotationMatrix(j.makeBasis(ue,H,b)),u.multiply(d.setFromAxisAngle(xo,se.reachRoll)).multiply(d.setFromAxisAngle(Nn,M)),Y.slerp(u,Ie)),l.slerp(Y,tt),fe(),Re(t.hips.position,r,o,d,u,g),p.lerp(W.sub(g),tt)}t.neck1.quaternion.copy(d),t.neck2.quaternion.copy(u),f.copy(d).multiply(u).invert().multiply(h),t.head.quaternion.copy(f),P.copy(g).add(p),f.copy(c).invert(),t.neck1.position.copy(n.neck1.pos).add(b.copy(p).multiplyScalar(.22).applyQuaternion(f)),f.copy(c).multiply(d).invert(),t.neck2.position.copy(n.neck2.pos).add(b.copy(p).multiplyScalar(.3).applyQuaternion(f)),f.copy(c).multiply(d).multiply(u).invert(),t.head.position.copy(n.head.pos).add(b.copy(p).multiplyScalar(.48).applyQuaternion(f)),he.set(0,h.y,0,h.w),he.lengthSq()<1e-6&&he.set(0,0,0,1),he.normalize(),t.throat.quaternion.copy(he),p.copy(t.head.position).applyQuaternion(t.neck2.quaternion).add(t.neck2.position).applyQuaternion(t.neck1.quaternion).add(t.neck1.position),Q.copy(Z.chin).applyQuaternion(h).add(p).sub(De.copy(Z.rim).applyQuaternion(he).add(Z.pivot));const je=Z.span*.5-Q.length(),ct=.5*(je+Math.sqrt(je*je+1e-4));be.copy(Z.down).applyQuaternion(he).multiplyScalar(ct),t.throat.position.copy(n.throat.pos).add(be),f.copy(he).slerp(h,.5),t.gular.quaternion.copy(f),b.copy(Z.mid).applyQuaternion(f);const st=ke(te*(Z.span-Q.length()),-.006,.03);Ye.copy(Z.out).applyQuaternion(f),t.gular.position.copy(p).add(Z.pivot).add(be).multiplyScalar(.5).add(b).addScaledVector(Ye,st),P.add(b.copy(E).applyQuaternion(l)),t.jaw.quaternion.copy(n.jaw.quat).multiply(d.setFromAxisAngle(Nn,ke(se.jaw,0,1.1)*.31));const At=ke(se.tongueOut,0,1)*D;let G=0;for(let oe=0;oe<3;oe++){const $e=U(R[oe]+At,V[oe])-O[oe],Ie=t[L[oe]];Ie.quaternion.setFromAxisAngle(Nn,$e-G+se.tongueCurl*k[oe]),oe===0?Ie.position.copy(n[L[0]].pos).add(V[0]).sub(F[0]):Ie.position.copy(V[oe]).sub(V[oe-1]).sub(F[oe]).add(F[oe-1]).add(n[L[oe]].pos).applyQuaternion(d.setFromAxisAngle(Nn,-G)),G=$e}const Et=Math.max(se.carryAt,0);I.set(0,-i.bill.droop*Math.min(Et,1)*Math.min(Et,1)-(Et<1?.003*(1-Et):0),Et*i.bill.length).applyQuaternion(w.worldQuat).add(w.worldPos).sub(n.head.worldPos),I.applyQuaternion(l).add(P).sub(b.copy(E).applyQuaternion(l));for(const oe of Jt){const $e=s.eyes[oe],Ie=de(bo.upperOpen,0,re(0,1,se.lidUpper)),We=de(bo.lowerOpen,0,re(0,1,se.lidLower));$e.lidUpper.quaternion.copy(n[$e.lidUpper.name].quat).multiply(d.setFromAxisAngle(Nn,-Ie)),$e.lidLower.quaternion.copy(n[$e.lidLower.name].quat).multiply(d.setFromAxisAngle(Nn,-We));const C=-fn(oe)*bo.nictOpen*(1-ke(se.nict,0,1));$e.nict.quaternion.copy(n[$e.nict.name].quat).multiply(d.setFromAxisAngle(Gs,C)),$e.nict.scale.setScalar(se.nict>.002?1:.001),$e.lidUpper.scale.setScalar(de(.93,1,re(0,.5,se.lidUpper))),$e.lidLower.scale.setScalar(de(.93,1,re(0,.5,se.lidLower)))}a.set(-se.tailPitch,se.tailYaw,se.tailRoll,"YXZ"),t.tail.quaternion.copy(n.tail.quat).multiply(d.setFromEuler(a));const ft=de(i.tail.restFan,i.tail.maxFan,ke(se.tailFan,-.5,1))*Le;for(const oe of s.rectrices)oe.bone.quaternion.setFromAxisAngle(Gs,oe.k*ft);for(const oe of Jt){const $e=s.wings[oe],Ie=se.wing[oe],We=re(0,1,Ie.spread);for(let T=0;T<$e.bones.length;T++)$e.bones[T].quaternion.copy($e.folded[T]).slerp($e.spread[T],We);We>0&&(Ie.sweep!==0||Ie.raise!==0)&&(d.setFromAxisAngle(Gs,-fn(oe)*Ie.sweep*We),u.setFromAxisAngle(xo,fn(oe)*Ie.raise*We),$e.bones[0].quaternion.premultiply(u).premultiply(d));const C=1-We;if(C>0){const T=v[oe],q=$e.bones[1];q.quaternion.multiply(d.setFromAxisAngle(T.out,-Ie.lift*.3*C)),q.quaternion.multiply(d.setFromAxisAngle(T.fan,-fn(oe)*Ie.droop*C))}}d.setFromAxisAngle(xo,se.feetSlope);const bt=(1-ke(se.grip,0,1))*.6;for(const{s:oe,foot:$e,footRest:Ie,toes:We,tarsus:C}of le){$e.position.copy(Ie.pos).applyQuaternion(d),$e.quaternion.copy(d),$e.scale.setScalar(se.feetScale);for(let q=0;q<4;q++)We[q].quaternion.setFromAxisAngle(Nn,q===3?bt:-bt);b.copy(s.ankle[oe]).sub(Ie.worldPos).multiplyScalar(se.feetScale).applyQuaternion(d).add($e.position),p.copy(s.hipSocket[oe]).applyQuaternion(r).add(t.hips.position).sub(b);const T=p.length();p.applyQuaternion(u.copy(d).invert()),ki(p,Nn,C.quaternion),C.scale.set(1,1,T/s.tarsusLength/se.feetScale)}e.uFluff.value=se.fluff,e.uLift.value.set(se.lift),e.uLift.value[0]+=se.crest*.9,e.uLift.value[1]+=se.crest*.7,e.uGorget.value=se.gorget,e.uCrest.value=se.crest,e.uWingSpread.value.set(se.wing.L.spread,se.wing.R.spread),e.uWingOut.value.set(se.wing.L.out,se.wing.L.twist,se.wing.R.out,se.wing.R.twist),e.uWingLift.value.set(se.wing.L.lift,se.wing.R.lift)};return ye.tip=P,ye.carry=I,ye.billReach=x,ye}class uv{constructor(e,t=7){this.species=e,this.rng=Ln(t)}species;t=0;dt=0;rng;arousal=.3;baseline=.32;attention=null;attentionSpeed=0;freeze=0;saccading=!1;food=[];focus=null;focusId=0;eating=!1;gazeLock=!1;pinGaze=null;quiet=!1;handlers={};lastDir=new y;dir=new y;hasLast=!1;on(e,t){(this.handlers[e]??=[]).push(t)}emit(e,t){for(const n of this.handlers[e]??[])n(t)}excite(e){this.arousal=ke(this.arousal+e,0,1)}step(e,t){if(this.dt=e,this.t+=e,this.freeze=Math.max(0,this.freeze-e),this.attention&&e>0){if(this.dir.copy(this.attention).sub(t).normalize(),this.hasLast){const n=this.dir.angleTo(this.lastDir)/e;this.attentionSpeed=Pn(this.attentionSpeed,Math.min(n,6),6,e)}this.lastDir.copy(this.dir),this.hasLast=!0}else this.hasLast=!1,this.attentionSpeed=Pn(this.attentionSpeed,0,4,e);this.excite(Math.max(this.attentionSpeed-.25,0)*.5*e),this.arousal=Pn(this.arousal,this.baseline,.14,e)}}class fv{name="posture";a=.3;yaw=new zi(3.2,.5);follow=0;pitch=new zi(5,.45);headYaw=0;constructor(e){e.on("saccade",t=>{this.yaw.kick(-t.dyaw*.5),this.pitch.kick(-t.dpitch*.4)}),e.on("fixate",t=>this.headYaw=t.yaw)}update(e,t){this.a=Pn(this.a,e.arousal,2.5,e.dt);const n=this.a;t.fluff+=de(.2,-.06,n),t.headShift.y+=de(-.032,.03,n),t.headShift.z+=de(-.014,.012,n),t.bodyPitch+=de(-.04,.05,n),t.bodyShift.y+=de(-.012,.008,n),t.crest+=de(0,.22,n),t.wing.L.droop+=de(.05,0,n),t.wing.R.droop+=de(.05,0,n);const i=e.t;t.bodyRoll+=kt(i*.17,1)*.022,t.bodyShift.x+=kt(i*.13,2)*.006,t.bodyPitch+=kt(i*.21,3)*.012,this.follow=Pn(this.follow,this.headYaw*.14,.9,e.dt),t.bodyYaw+=this.follow+this.yaw.step(0,e.dt)+kt(i*.11,4)*.025,t.chestPitch+=this.pitch.step(0,e.dt)}}class pv{name="breath";phase=0;update(e,t){const[n,i]=e.species.behaviour.breathHz;this.phase+=e.dt*de(n,i,e.arousal)*Math.PI*2;const a=Math.sin(this.phase+.45*Math.sin(this.phase))*de(.75,1.1,e.arousal);t.breath+=a,t.addLift(.42,.2,a*.014),t.tailPitch+=a*.011,t.bodyShift.y+=a*.0012,t.wing.L.lift+=a*.005,t.wing.R.lift+=a*.005}}const mv=s=>s*s*s*(10+s*(-15+6*s));class gv{name="gaze";maxYaw=70*Le;interest=.5;billOn=.46;pursuit=0;minPitch=-45*Le;minPitchFood=-50*Le;cur;from;to;moving=!1;t0=0;dur=.06;amp=0;nextAt=.8;settle=10;burst=0;attYaw=0;attPitch=0;seenYaw=0;seenPitch=0;lastStart=-10;focusSeen=-1;focusAt=0;head=new y(0,.9,.05);d=new y;constructor(e){const t=e.species.behaviour.billUp*Le;this.cur={yaw:.9,pitch:t,roll:0},this.from={...this.cur},this.to={...this.cur},e.on("startle",()=>{this.nextAt=e.t+.04+e.rng()*.04,this.burst=-1})}moveOn(e){this.burst=0,this.nextAt=Math.min(this.nextAt,e.t+Ee(e.rng,.12,.4))}lookAtAttention(e){const t=e.focus??e.attention;return t?(this.d.copy(t).sub(this.head),this.attYaw=Math.atan2(this.d.x,this.d.z),this.attPitch=Math.atan2(this.d.y,Math.hypot(this.d.x,this.d.z)),!0):!1}pick(e,t=!1){const n=e.rng,i=e.species.behaviour.billUp*Le,a=this.lookAtAttention(e),r=this.cur;let o;if(!t&&this.burst>0)this.burst--,o={yaw:r.yaw+Ee(n,-1,1)*13*Le,pitch:r.pitch+Ee(n,-1,1)*8*Le,roll:r.roll*.5+Ee(n,-1,1)*9*Le};else if(a&&(t||n()<this.interest+.4*e.arousal)){if(this.seenYaw=this.attYaw,this.seenPitch=this.attPitch,(t?0:n())<this.billOn)o={yaw:this.attYaw+Ee(n,-5,5)*Le,pitch:this.attPitch*.8+i+Ee(n,-4,14)*Le,roll:n()<.25?Ee(n,-18,18)*Le:Ee(n,-5,5)*Le};else{const l=Ee(n,60,84)*Le,h=Math.abs(r.yaw-(this.attYaw+l))<Math.abs(r.yaw-(this.attYaw-l))?1:-1;let d=n()<.6?h:-h;Math.abs(this.attYaw+d*l)>this.maxYaw&&(d=-d),o={yaw:this.attYaw+d*l,pitch:i*.6+Ee(n,-8,12)*Le,roll:d*(this.attPitch*.5+Ee(n,-4,10)*Le)}}n()<.35&&(this.burst=1+Math.floor(n()*2))}else{let c=ke(Ee(n,-1,1)*105*Le,r.yaw-140*Le,r.yaw+140*Le);Math.abs(c-r.yaw)<22*Le&&(c+=Math.sign(c-r.yaw||1)*30*Le),o={yaw:c,pitch:i*.5+Ee(n,-14,24)*Le,roll:Ee(n,-9,9)*Le},n()<.3&&(this.burst=1+Math.floor(n()*2))}return o.yaw=ke(o.yaw,-this.maxYaw,this.maxYaw),o.pitch=ke(o.pitch,this.minPitch,52*Le),o.roll=ke(o.roll,-26*Le,26*Le),o}begin(e,t){const[n,i]=e.species.behaviour.saccade;this.from={...this.cur},this.to=t;const a=t.yaw-this.from.yaw,r=t.pitch-this.from.pitch,o=t.roll-this.from.roll;this.amp=Math.hypot(a*Math.cos((t.pitch+this.from.pitch)/2),r,o*.5),this.dur=Math.min(n+i*this.amp/Le,.095),this.t0=e.t,this.moving=!0,this.lastStart=e.t,e.saccading=!0,e.emit("saccade",{amp:this.amp,dur:this.dur,dyaw:a,dpitch:r})}update(e,t){const n=e.species.behaviour;if(e.pinGaze){t.headYaw+=e.pinGaze[0]*Le,t.headPitch+=e.pinGaze[1]*Le,t.headRoll+=e.pinGaze[2]*Le;return}if(e.focus&&!this.moving&&!e.gazeLock&&this.lookAtAttention(e)){const o=Math.hypot((this.attYaw-this.cur.yaw)*Math.cos(this.attPitch),this.attPitch-this.cur.pitch),c=this.focusSeen!==e.focusId;c&&!this.focusAt&&(this.focusAt=e.t+Ee(e.rng,.09,.24)),(c&&e.t>=this.focusAt||!c&&o>6*Le&&e.t-this.lastStart>.16&&e.rng()<e.dt*9)&&(this.focusSeen=e.focusId,this.focusAt=0,this.burst=0,this.begin(e,{yaw:ke(this.attYaw,-this.maxYaw,this.maxYaw),pitch:ke(this.attPitch+(c?Ee(e.rng,-3,3)*Le:0),this.minPitchFood,65*Le),roll:c?Ee(e.rng,-8,8)*Le:this.cur.roll*.6}))}else if(!this.moving&&!e.quiet&&!e.focus&&!e.gazeLock)if(e.t>=this.nextAt&&(e.freeze<=0||this.burst<0)){const o=this.burst<0;o&&(this.burst=0),this.begin(e,this.pick(e,o))}else e.freeze<=0&&e.t-this.lastStart>.22&&this.lookAtAttention(e)&&Math.hypot((this.attYaw-this.seenYaw)*Math.cos(this.attPitch),this.attPitch-this.seenPitch)>13*Le&&e.rng()<e.dt*de(3,9,e.arousal)&&(this.burst=0,this.begin(e,this.pick(e,e.rng()<.5)),this.seenYaw=this.attYaw,this.seenPitch=this.attPitch);if(!this.moving&&this.pursuit>0&&!e.focus&&!e.gazeLock&&e.freeze<=0&&this.lookAtAttention(e)){const o=n.billUp*Le,c=ke(this.attYaw,-this.maxYaw,this.maxYaw),l=ke(this.attPitch*.8+o*.6,this.minPitch,52*Le),h=Math.hypot((c-this.cur.yaw)*Math.cos(l),l-this.cur.pitch),d=h>14*Le&&e.t-this.lastStart>.3&&e.rng()<e.dt*5;if(h<28*Le&&!d){const u=1-Math.exp(-e.dt*3.2*this.pursuit*(.75+.35*kt(e.t*3.1,31)));this.cur={yaw:this.cur.yaw+(c-this.cur.yaw)*u,pitch:this.cur.pitch+(l-this.cur.pitch)*u,roll:this.cur.roll*(1-u*.5)},this.from={...this.cur},this.to={...this.cur},this.seenYaw=this.attYaw,this.seenPitch=this.attPitch,h>3*Le&&(this.nextAt=Math.max(this.nextAt,e.t+.25))}else(d||e.t-this.lastStart>.16&&e.rng()<e.dt*10)&&(this.burst=0,this.begin(e,this.pick(e,!0)))}let i,a,r;if(this.moving){const o=(e.t-this.t0)/this.dur;if(o>=1){this.moving=!1,e.saccading=!1,this.cur={...this.to},this.settle=0;const h=Math.abs(this.cur.yaw-this.attYaw)<15*Le,[d,u]=[de(n.holdCalm[0],n.holdAlert[0],e.arousal),de(n.holdCalm[1],n.holdAlert[1],e.arousal)];this.nextAt=e.t+(this.burst<0?.05:this.burst>0?Ee(e.rng,.14,.42):z_(e.rng,d,u,1.8)*(h?1.15:1)),e.emit("fixate",{yaw:this.cur.yaw,pitch:this.cur.pitch})}const c=mv(ke(o,0,1)),l=Math.sin(Math.PI*ke(o,0,1));i=de(this.from.yaw,this.to.yaw,c),a=de(this.from.pitch,this.to.pitch,c)-l*this.amp*.09,r=de(this.from.roll,this.to.roll,c),t.headShift.y-=l*Math.min(this.amp,1.6)*.012}else{this.settle+=e.dt;const o=Math.exp(-this.settle/.032)*Math.cos(this.settle*24*Math.PI*2)*.04;i=this.cur.yaw+(this.to.yaw-this.from.yaw)*o,a=this.cur.pitch+(this.to.pitch-this.from.pitch)*o,r=this.cur.roll+(this.to.roll-this.from.roll)*o}i+=kt(e.t*11,11)*.0028+kt(e.t*.6,12)*.008,a+=kt(e.t*12,13)*.0028+kt(e.t*.5,14)*.007,r+=kt(e.t*.7,15)*.008,t.headYaw+=i,t.headPitch+=a,t.headRoll+=r,t.headShift.x+=Math.sin(i)*.014,t.headShift.z+=(Math.cos(i)-1)*.01-Math.max(a,0)*.018}}class bv{name="blink";t0=-10;full=!1;nextAt=1.5;constructor(e){e.on("saccade",t=>{t.amp>.6&&e.rng()<.45&&e.t-this.t0>.5&&this.start(e,!1)}),e.on("startle",()=>{this.nextAt=e.t+1.2+e.rng()})}start(e,t){this.t0=e.t,this.full=t;const[n,i]=e.species.behaviour.blinkEvery;this.nextAt=e.t+Ee(e.rng,n,i)*de(1.3,.8,e.arousal)}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&this.start(e,e.rng()<de(.3,.08,e.arousal));const n=this.full?1.7:1,i=(e.t-this.t0)/n,a=i<0?0:i<.045?re(0,.045,i):i<.07?1:1-re(.07,.165,i);t.nict+=a,t.lidLower+=a*(this.full?1:.3),t.lidUpper+=a*(this.full?.75:.08);const r=re(.3,.05,e.arousal);t.lidUpper+=r*.22,t.lidLower+=r*.18}}class _v{name="ruffle";kind="puff";t0=-100;nextAt;amp=.6;last=-1e9;constructor(e){const[t,n]=e.species.behaviour.ruffleEvery;this.nextAt=Ee(e.rng,t*.5,n*.6),e.on("startle",()=>{this.t0=-100,this.nextAt=Math.max(e.t+Ee(e.rng,2.8,5),this.last+e.species.behaviour.ruffleEvery[0])})}trigger(e,t,n){const i=e.rng();this.kind=t??(i<.45?"puff":i<.7?"shake":"throat"),this.t0=e.t,this.last=e.t,this.amp=n??Ee(e.rng,.45,.75);const[a,r]=e.species.behaviour.ruffleEvery;this.nextAt=e.t+Ee(e.rng,a,r),e.emit("ruffle",{kind:this.kind})}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&!e.saccading&&(e.arousal<.7?this.trigger(e):this.nextAt=e.t+1);const n=e.t-this.t0;if(n<0||n>3)return;const i=this.amp;if(this.kind==="throat"){const c=re(0,.12,n)*(1-re(.7,1.25,n));t.gorget+=c*.42*i,t.crest+=c*.38*i,t.addLift(.12,.14,c*.25*i),t.headShift.y+=c*.01;return}for(let c=0;c<8;c++){const l=n-c/7*.2;if(l<=0)continue;const h=re(0,.13,l),d=1-re(.62,1.5,l),u=l>.62?.14*Math.sin((l-.62)*13)*Math.exp(-(l-.62)*3.5):0;t.lift[c]+=i*(h*d+u)*de(.75,1,c/7)}t.crest+=i*.25*re(0,.1,n)*(1-re(.5,1.1,n));const a=re(.14,.24,n)*(1-re(.55,.85,n)),r=(n-.14)*14*Math.PI*2,o=Math.sin(r)*a;t.bodyRoll+=o*.05*i,t.bodyYaw+=Math.cos(r)*a*.035*i,t.tailYaw+=Math.sin(r-1.2)*a*.16*i,t.tailFan+=a*.55*i+re(0,.2,n)*(1-re(.6,1.4,n))*.25*i;for(const c of["L","R"])t.wing[c].lift+=(a*.11+Math.abs(o)*.05)*i+re(0,.2,n)*(1-re(.7,1.5,n))*.06*i,t.wing[c].droop+=a*.07*i;if(t.bodyShift.y+=a*.008,this.kind==="shake"){const c=re(.1,.2,n)*(1-re(.5,.75,n));t.headRoll+=Math.sin(r*1.15+.8)*c*.3*i,t.headYaw+=Math.cos(r*1.15)*c*.16*i,t.nict+=c,t.lidLower+=c*.6,t.headStabil-=c*.5}}}class xv{name="tail";pitch=new zi(6.5,.28);fan=new zi(4.5,.5);yaw=new zi(5,.4);nextAt;pumps=0;pumpAt=0;constructor(e){const[t,n]=e.species.behaviour.tailEvery;this.nextAt=Ee(e.rng,t*.4,n*.5),e.on("startle",i=>{this.pitch.kick(-5*i.strength),this.fan.kick(14*i.strength)}),e.on("saccade",i=>{i.amp>.9&&this.yaw.kick(-i.dyaw*.5)})}flick(e,t=1){this.pitch.kick(-Ee(e.rng,3,5.5)*t),this.fan.kick(Ee(e.rng,5,11)*t),this.yaw.kick(Ee(e.rng,-1.5,1.5)*t)}update(e,t){if(!e.quiet&&e.t>=this.nextAt&&e.freeze<=0){const[n,i]=e.species.behaviour.tailEvery;this.nextAt=e.t+Ee(e.rng,n,i),this.pumps=e.rng()<.4?1+Math.floor(e.rng()*2):0,this.pumpAt=e.t+.16,this.flick(e)}this.pumps>0&&e.t>=this.pumpAt&&(this.pumps--,this.pumpAt=e.t+Ee(e.rng,.13,.2),this.flick(e,.7)),t.tailPitch+=this.pitch.step(0,e.dt),t.tailFan+=Math.max(this.fan.step(0,e.dt),-.3),t.tailYaw+=this.yaw.step(0,e.dt)}}class vv{name="wings";t0=-100;nextAt;lead=1;amp=1;constructor(e){const[t,n]=e.species.behaviour.wingEvery;this.nextAt=Ee(e.rng,t*.5,n*.6)}shuffle(e){this.t0=e.t,this.lead=e.rng()<.5?1:-1,this.amp=Ee(e.rng,.7,1.2);const[t,n]=e.species.behaviour.wingEvery;this.nextAt=e.t+Ee(e.rng,t,n)}update(e,t){!e.quiet&&e.t>=this.nextAt&&e.freeze<=0&&this.shuffle(e);const n=e.t-this.t0;if(n<0||n>1.2)return;for(const a of["L","R"]){const r=n-((a==="L"?1:-1)*this.lead>0?0:.07);if(r<=0)continue;const o=re(0,.07,r)*(1-re(.22,.6,r)),c=Math.sin(r*12*Math.PI*2)*re(.05,.1,r)*(1-re(.2,.42,r));t.wing[a].lift+=(o*.2+c*.06)*this.amp,t.wing[a].droop+=o*.1*this.amp}const i=re(0,.08,n)*(1-re(.15,.5,n));t.bodyShift.y+=i*.006,t.addLift(.5,.25,i*.12)}}class yv{constructor(e){this.mind=e}mind;name="startle";crouch=new zi(4.2,.42);t0=-100;strength=0;fire(e){const t=this.mind;this.strength=e,this.t0=t.t,t.arousal=Math.max(t.arousal,.6+.4*e),t.freeze=.45+t.rng()*.55,this.crouch.kick(-.9*e),t.emit("startle",{strength:e})}update(e,t){const n=this.crouch.step(0,e.dt);t.bodyShift.y+=n,t.bodyPitch+=-n*2.2,t.headShift.y+=n*.6;const i=e.t-this.t0;if(i<0||i>8)return;const a=this.strength,r=Math.exp(-i/1.6)*Math.min(i/.05,1);t.fluff-=.13*r*a,t.headShift.y+=.02*r*a;const o=Math.exp(-i/.09)*Math.min(i/.03,1);t.wing.L.lift+=o*.42*a,t.wing.R.lift+=o*.42*a,t.lidUpper-=.2*r,t.lidLower-=.2*r}}const Vh=s=>s*s*s*(10+s*(-15+6*s)),Ja=.06;class Mv{constructor(e,t,n,i,a,r=null){this.mind=e,this.solver=t,this.headRest=n,this.pick=i,this.swallowed=a,this.hop=r,e.on("startle",()=>{this.carried>=0&&this.swallowed(this.carried),this.carried=-1,this.release(this.mind,"idle"),this.readyAt=this.mind.t+1.5})}mind;solver;headRest;pick;swallowed;hop;name="forage";reachOut=.3;reachIn=.2;catchRadius=.05;state="idle";id=-1;t0=0;dur=.15;decideAt=0;watchUntil=0;readyAt=0;retried=!1;ignore=new Map;target=new y;w=0;wFrom=0;lean=0;yaw=0;rel=new y;focus=new y;licks=3;carried=-1;hopAt=0;moved=new y;seed(e){return e.food.find(t=>t.id===this.id)}slideFor(e){const t=this.rel.copy(e).sub(this.headRest),n=t.length(),i=Math.atan2(t.x,t.z),a=Math.asin(ke(t.y/Math.max(n,1e-6),-1,1));if(Math.abs(i)>2||a<-.95||a>1.3||e.y<-.12)return null;const r=n-this.solver.billReach;return r>this.reachOut||r<-this.reachIn?null:r}inView(e){const t=this.rel.copy(e).sub(this.headRest);return Math.abs(Math.atan2(t.x,t.z))<2.2&&t.length()<2.2&&e.y>-.9}release(e,t){this.state=t,this.t0=e.t,this.wFrom=this.w,t==="idle"&&(e.focus=null,e.gazeLock=!1,this.id=-1)}begin(e,t,n){this.state=t,this.t0=e.t,this.dur=n,this.wFrom=this.w}update(e,t){const n=e.t,i=ke((n-this.t0)/this.dur,0,1);let a=this.seed(e);switch(e.eating=this.state!=="idle"&&this.state!=="watch",this.state){case"idle":{if(this.w=Pn(this.w,0,22,e.dt),n<this.readyAt)break;let r=null,o=1/0;for(const c of e.food){if(!this.inView(c.pos)||(this.ignore.get(c.id)??0)>n&&this.slideFor(c.pos)===null||c.vel.lengthSq()<Ja*Ja&&this.slideFor(c.pos)===null)continue;const l=c.pos.distanceTo(this.headRest)-(this.slideFor(c.pos)!==null?1:0);l<o&&(o=l,r=c)}r&&(this.id=r.id,this.state="watch",this.decideAt=0,this.watchUntil=n+Ee(e.rng,.7,1.5),e.focus=this.focus.copy(r.pos),e.focusId++,e.excite(.25));break}case"watch":{if(this.w=Pn(this.w,0,22,e.dt),!a||!this.inView(a.pos)){this.release(e,"idle");break}if(e.focus=this.focus.copy(a.pos),this.hop?.busy)break;if(this.slideFor(a.pos)===null){if(this.decideAt=0,this.hop&&e.freeze<=0&&(this.hopAt||(this.hopAt=n+Ee(e.rng,.45,1.1)),n>=this.hopAt)){const r=a.pos,o=this.hop.spotFor(c=>this.slideFor(this.moved.copy(r).sub(c))!==null);if(this.hopAt=n+Ee(e.rng,.5,.9),o!==null&&this.hop.go(e,o)){this.watchUntil=Math.max(this.watchUntil,n+3);break}}a.vel.lengthSq()<Ja*Ja&&(this.watchUntil=Math.min(this.watchUntil,n+.25)),n>this.watchUntil&&(this.ignore.set(a.id,n+Ee(e.rng,25,45)),this.release(e,"idle"),this.readyAt=n+Ee(e.rng,.3,1));break}this.hopAt=0,this.decideAt||(this.decideAt=n+Ee(e.rng,.35,1.1)),n>=this.decideAt&&!e.saccading&&e.freeze<=0&&(e.gazeLock=!0,this.retried=!1,this.begin(e,"windup",Ee(e.rng,.09,.13)),e.emit("strike",{id:a.id}));break}case"windup":{if(!a){this.release(e,"idle");break}const r=Math.sin(i*Math.PI*.5);if(this.rel.copy(a.pos).sub(this.headRest).normalize(),t.headShift.addScaledVector(this.rel,-.03*r),t.bodyShift.y-=.006*r,i>=1){const o=this.slideFor(a.pos)??0;this.lean=o,this.yaw=Math.atan2(a.pos.x-this.headRest.x,a.pos.z-this.headRest.z),this.begin(e,"strike",ke(.13+Math.abs(o)*.2,.12,.2))}break}case"strike":{if(!a){this.begin(e,"retract",.2);break}this.target.copy(a.pos).addScaledVector(a.vel,(1-i)*this.dur),this.w=this.wFrom+(1-this.wFrom)*(1-Math.pow(1-i,3)),t.jaw+=re(.2,.7,i)*(1-re(.92,1,i)*.88)*.95,i>=1&&(this.solver.tip.distanceTo(a.pos)<this.catchRadius?(this.pick(a.id),this.carried=a.id,e.excite(.1),this.begin(e,"hold",Ee(e.rng,.06,.1))):!this.retried&&this.slideFor(a.pos)!==null?(this.retried=!0,this.begin(e,"strike",.1)):(this.ignore.set(a.id,n+Ee(e.rng,3,5)),this.begin(e,"retract",.22)));break}case"hold":this.w=1,t.jaw+=.1,i>=1&&(e.focus=null,this.licks=2,this.begin(e,"eat",this.licks*.13+.04));break;case"retract":this.w=this.wFrom*(1-Vh(i)),i>=1&&(this.release(e,"idle"),this.readyAt=n+Ee(e.rng,.3,.9));break;case"eat":{this.w=this.wFrom*(1-Vh(ke((n-this.t0)/.2,0,1)));const r=ke((n-this.t0)/(this.dur-.04)*this.licks,0,this.licks),o=Math.min(Math.floor(r),this.licks-1),c=r>=this.licks?1:r-o,l=1-o/this.licks,h=1-(o+1)/this.licks,d=Math.sin(Math.PI*re(0,.55,c));t.tongueOut+=ke((l-.72)/.65*d+.04*d,0,1),t.carryAt=de(l,h+.04,re(.35,1,c)),t.jaw+=.12+.3*Math.sin(Math.PI*re(0,.7,c))-.08*re(.75,1,c),t.headPitch+=.03*Math.sin(Math.PI*c),i>=1&&this.begin(e,"swallow",Ee(e.rng,.36,.44));break}case"swallow":{this.w=0,t.carryAt=.04;const r=Math.sin(Math.PI*re(0,.55,i))*.26;t.headPitch+=r,t.headShift.y+=r*.03,t.jaw+=Math.sin(Math.PI*re(.1,.5,i))*.45;const o=Math.sin(Math.PI*re(.35,.95,i));t.gorget+=o*.16,t.addLift(.2,.12,o*.12),i>.18&&this.carried>=0&&(this.swallowed(this.carried),e.emit("ate",{id:this.carried}),this.carried=-1),i>=1&&(this.release(e,"idle"),this.readyAt=n+Ee(e.rng,.4,1.3));break}}this.w>.001&&(t.reachTarget.copy(this.target),t.reachWeight=this.w,t.bodyPitch+=this.w*ke(this.lean*.75,-.16,.24),t.bodyYaw+=this.w*this.yaw*.14,t.bodyShift.y-=this.w*.008,t.headStabil*=1-this.w)}}class Sv{name="mouth";lickEvery=[14,36];singEvery=[30,80];blocked=()=>!1;flicks=[];nextLick;singFrom=-10;singFor=0;bursts=[];nextSing;pump=0;constructor(e){this.nextLick=Ee(e.rng,5,14),this.nextSing=Ee(e.rng,14,34),e.on("ate",()=>{e.rng()<.7&&(this.nextLick=e.t+Ee(e.rng,.25,.6))}),e.on("startle",()=>{this.singFor=0,this.flicks.length=0,this.nextLick=e.t+Ee(e.rng,8,16),this.nextSing=Math.max(this.nextSing,e.t+Ee(e.rng,12,30))})}lick(e,t=Ee(e.rng,.56,.68),n=e.rng()<.45?1:e.rng()<.6?2:3){this.flicks.length=0;let i=e.t;for(let a=0;a<n;a++)this.flicks.push({at:i,amp:a===0?t:t*Ee(e.rng,.8,1.05)}),i+=Ee(e.rng,.21,.3);this.nextLick=e.t+Ee(e.rng,this.lickEvery[0],this.lickEvery[1])}sing(e,t=1.6){this.singFrom=e.t,this.bursts.length=0;let n=.06;for(;n<t-.2||this.bursts.length===0;){const a=3+Math.floor(e.rng()*3),r=Ee(e.rng,13,16.5);this.bursts.push({at:n,notes:a,hz:r,amp:Ee(e.rng,.26,.4)}),n+=a/r+(e.rng()<.25?Ee(e.rng,.32,.5):Ee(e.rng,.1,.22))}const i=this.bursts[this.bursts.length-1];this.singFor=i.at+i.notes/i.hz+.25,this.nextSing=e.t+this.singFor+Ee(e.rng,this.singEvery[0],this.singEvery[1]),this.flicks.length=0,this.nextLick=Math.max(this.nextLick,e.t+this.singFor+Ee(e.rng,1.5,5))}get singing(){return this.singFor>0}update(e,t){const n=!e.quiet&&!e.gazeLock&&!e.focus&&!e.eating&&e.freeze<=0&&!this.blocked();n&&e.t>=this.nextLick&&e.arousal<.6&&!this.singing&&this.lick(e),n&&e.t>=this.nextSing&&!this.singing&&(e.arousal<.42&&this.flicks.length===0?this.sing(e,Ee(e.rng,1.1,2.4)):this.nextSing=e.t+Ee(e.rng,4,9));let i=0;for(const h of this.flicks){const d=(e.t-h.at)/.19;d>=0&&d<=1&&(i=Math.max(i,h.amp*Math.sin(Math.PI*Math.pow(re(0,1,d),.8))))}this.flicks.length&&e.t>this.flicks[this.flicks.length-1].at+.2&&(this.flicks.length=0),i>0&&(t.tongueOut+=Math.min(i,.7),t.tongueCurl+=.16*re(.3,.6,i),t.jaw+=.02*re(0,.3,i));let a=0,r=0,o=0;const c=e.t-this.singFrom;if(this.singFor>0)if(c>this.singFor||this.blocked())this.singFor=0;else for(const h of this.bursts){const d=c-h.at,u=h.notes/h.hz;d<0||d>u||(a=re(0,.03,d)*(1-re(u-.03,u,d)),r=.5-.5*Math.cos(d*h.hz*Math.PI*2),o=h.amp)}this.pump=Pn(this.pump,a,a>this.pump?30:11,e.dt);const l=this.pump;l<.002&&a===0||(t.jaw+=a*o*(.1+.9*r),t.gorget+=l*.2+a*r*.05,t.addLift(.2,.07,l*.16),t.crest-=l*.14,t.addLift(0,.07,-l*.14),t.addLift(.4,.09,-l*.3),t.breath-=l*.7,t.headPitch+=l*.035+a*r*.012,t.headShift.y-=l*.004,t.headShift.z-=l*.003,t.tailPitch-=l*.03)}}const Za=()=>({point:new y,up:new y(0,1,0),tangent:new y(1,0,0),radius:.0405});class wv{constructor(e,t){this.mind=e,this.ground=t,e.on("startle",n=>{if(this.hold||this.phase!=="stand"||e.eating||e.rng()>.55*n.strength)return;const i=Ee(e.rng,.1,.2)*(e.rng()<.5?-1:1),a=this.clampX(this.x+i);Math.abs(a-this.x)>.06&&this.go(e,a,.05)})}mind;ground;name="hop";maxHop=.35;homeAfter=[14,30];home=0;hold=!1;x=0;phase="stand";t0=0;dur=.1;x0=0;x1=0;apex=.05;from=Za();to=Za();here=Za();tmp=Za();legs=new zi(5.5,.4);lag=new y;anchor=new y;off=new y;slope=0;scale=1;placed=!1;homeAt=20;lastFood=0;get busy(){return this.phase!=="stand"}clampX(e){return ke(e,this.ground.range[0],this.ground.range[1])}frame(e,t){return(this.ground.at?.(e,t)??null)||(t.point.set(e,this.ground.root.position.y,this.ground.root.position.z),t.up.set(0,1,0),t.tangent.set(1,0,0),t.radius=this.ground.restRadius),t}reseat(){this.placed=!1}spotFor(e){if(!this.ground.at)return null;const t=this.ground.range[1]-this.ground.range[0];for(let n=.1;n<=t+1e-6;n+=.05)for(const i of[1,-1]){const a=this.x+i*n;if(a<this.ground.range[0]||a>this.ground.range[1])continue;const r=this.ground.at(a,this.tmp);if(r&&e(this.off.copy(r.point).sub(this.here.point)))return this.x+i*Math.min(n,this.maxHop)}return null}place(e,t){return this.x=this.clampX(e),this.frame(this.x,this.here),this.slope=Math.atan2(this.here.tangent.y,this.here.tangent.x),this.scale=this.here.radius/this.ground.restRadius,t.copy(this.here.point),this.x}landed(){this.legs.kick(-1.1),this.follow()}follow(){this.anchor.copy(this.ground.root.position)}go(e,t,n=Ee(e.rng,.07,.11)){if(this.hold||this.phase!=="stand"||(t=this.clampX(ke(t,this.x-this.maxHop,this.x+this.maxHop)),Math.abs(t-this.x)<.03))return!1;this.x0=this.x,this.x1=t,this.frame(this.x0,this.from),this.frame(this.x1,this.to);const i=this.from.point.distanceTo(this.to.point);return this.apex=ke(.035+i*.13,.04,.08),this.phase="crouch",this.t0=e.t,this.dur=n,e.excite(.15),!0}update(e,t){const n=this.ground.root;this.placed||(this.placed=!0,this.x=this.clampX(n.position.x),this.frame(this.x,this.here),n.position.copy(this.here.point),this.anchor.copy(n.position),this.slope=Math.atan2(this.here.tangent.y,this.here.tangent.x),this.scale=this.here.radius/this.ground.restRadius);const i=e.t,a=ke((i-this.t0)/this.dur,0,1);let r=1;switch(e.food.length&&(this.lastFood=i),this.phase==="stand"&&!this.hold&&this.homeAfter[1]>0&&!e.quiet&&!e.eating&&e.freeze<=0&&Math.abs(this.x-this.home)>.12&&i-this.lastFood>4&&i>this.homeAt&&(this.go(e,this.home+(this.x-this.home)*.3),this.homeAt=i+Ee(e.rng,this.homeAfter[0],this.homeAfter[1])),this.phase){case"crouch":{const c=Math.sin(a*Math.PI*.5);t.bodyShift.y-=.022*c,t.bodyPitch+=.07*c,t.wing.L.lift+=.1*c,t.wing.R.lift+=.1*c,a>=1&&(e.emit("perch",{x:this.x0,push:.45,on:!1,side:0}),this.phase="air",this.t0=i,this.dur=ke(.12+this.from.point.distanceTo(this.to.point)*.38,.12,.25));break}case"air":{n.position.copy(this.from.point).lerp(this.to.point,a),n.position.y+=4*this.apex*a*(1-a),this.slope=de(Math.atan2(this.from.tangent.y,this.from.tangent.x),Math.atan2(this.to.tangent.y,this.to.tangent.x),a),this.scale=de(this.from.radius,this.to.radius,a)/this.ground.restRadius;const c=Math.sin(Math.PI*a);r=1-re(0,.2,a)*(1-re(.75,1,a)),t.bodyShift.y+=.014*(1-a)-.012*c+.008*re(.7,1,a),t.bodyPitch+=.07*(1-a)-.04*c;const l=Math.sign(this.x1-this.x0);t.bodyRoll+=-l*.07*c,t.wing.L.lift+=.1+.3*c,t.wing.R.lift+=.1+.3*c,t.wing.L.droop+=.12*c,t.wing.R.droop+=.12*c,t.tailFan+=.5*c,t.tailPitch+=.12*c,t.fluff-=.05*c,a>=1&&(this.x=this.x1,this.frame(this.x,this.here),n.position.copy(this.here.point),this.phase="land",this.t0=i,this.dur=.28,this.legs.kick(-.75),e.emit("perch",{x:this.x1,push:.55,on:!0,side:0}));break}case"land":{const c=1-re(0,1,a);t.wing.L.lift+=.1*c,t.wing.R.lift+=.1*c,t.tailFan+=.3*c,t.tailPitch-=.1*Math.sin(Math.PI*a)*.8,t.addLift(.55,.3,.14*Math.sin(Math.PI*re(0,.8,a))),a>=1&&(this.phase="stand");break}}const o=this.legs.step(0,e.dt);t.bodyShift.y+=o,t.bodyPitch+=-o*1.6,this.anchor.x=Pn(this.anchor.x,n.position.x,this.phase==="air"?9:16,e.dt),this.anchor.y=Pn(this.anchor.y,n.position.y,this.phase==="air"?9:16,e.dt),this.anchor.z=Pn(this.anchor.z,n.position.z,16,e.dt),this.lag.copy(this.anchor).sub(n.position).clampLength(0,.16),t.headShift.add(this.lag),t.feetSlope=this.slope,t.feetScale=this.scale,t.grip=r,t.bodyRoll+=this.slope*.12}}function Ev(s){const e=s.species.wing,t=e.hand+e.primaryLen[1]*.92,n=Ln(s.species.seed+501),i=64,a=4,r=new Uint8Array(i*a*4);for(let d=0;d<i;d++){const u=.45+.55*Math.pow(n(),2.2)+(n()<.12?.6:0);for(let f=0;f<a;f++)r.set([255,Math.min(255,u*200),255,255],(f*i+d)*4)}const o=new xr(r,i,a);o.wrapS=Gi,o.magFilter=o.minFilter=Kt,o.needsUpdate=!0;const c=new Oi({color:new me(e.color).multiplyScalar(1.6),alphaMap:o,vertexColors:!0,transparent:!0,depthWrite:!1,side:Lt,opacity:0}),l=[],h=s.rest.chest.worldPos;for(const d of Jt){const u=fn(d),f=[],p=[],b=[],g=[],m=28,_=6;for(const w of[-24,-8,8,24]){const E=f.length/3;for(let x=0;x<=m;x++){const M=x/m,N=(-98+172*M)*Le;for(let P=0;P<=_;P++){const I=P/_,D=Math.tan(w*Le)*I*t*(.6+.4*Math.cos((M-.5)*Math.PI*2));f.push(u*Math.cos(N)*I*t,D+.04*I,Math.sin(N)*I*t);const L=re(.05,.4,I)*(1-re(.8,1,I))*(.5+.9*Math.pow(Math.abs(M*2-1),2.5))*re(0,.06,M)*(1-re(.94,1,M));p.push(1,1,1,L*(Math.abs(w)<10?.5:.36)),b.push(M*2.2,I)}}for(let x=0;x<m;x++)for(let M=0;M<_;M++){const N=E+x*(_+1)+M,P=N+_+1;g.push(N,P,N+1,P,P+1,N+1)}}const S=new yt;S.setAttribute("position",new et(f,3)),S.setAttribute("color",new et(p,4)),S.setAttribute("uv",new et(b,2)),S.setIndex(g);const v=new Nt(S,c);v.name=`bird.wingBlur.${d}`,v.frustumCulled=!1,v.visible=!1,v.renderOrder=2,v.position.copy(s.rest[`shoulder.${d}`].worldPos).sub(h),s.bones.chest.add(v),l.push(v)}return{set(d,u=.6){const f=d>.004;for(const p of l)p.visible=f,p.rotation.set(u+(Math.random()-.5)*.16,(Math.random()-.5)*.2,(Math.random()-.5)*.12);f&&(c.opacity=d*(.8+.45*Math.random()),o.offset.x=Math.random())},dispose(){for(const d of l)d.removeFromParent(),d.geometry.dispose();c.dispose(),o.dispose()}}}const rs=2;class Tv{constructor(e,t,n,i,a,r){this.mind=e,this.rig=t,this.root=n,this.hop=i,this.ruffle=a,this.tail=r,this.nextAt=Ee(e.rng,this.every[0],this.every[1]),this.blur=Ev(t)}mind;rig;root;hop;ruffle;tail;name="flee";awayFor=[2,5];every=[70,200];phase="idle";t0=0;dur=.4;side=1;from=new y;out=new y;hover=new y;landAt=new y;far=new y;landX=0;nextAt;blur;shakeAt=-1;get active(){return this.phase!=="idle"}get perched(){return this.phase==="idle"||this.phase==="ready"||this.phase==="land"}get gone(){return this.phase==="away"}start(){const e=this.mind;return this.active||this.hop.busy?!1:(this.hop.hold=!0,e.emit("startle",{strength:1}),e.arousal=1,e.freeze=0,this.phase="ready",this.t0=e.t,this.dur=Ee(e.rng,.3,.48),this.side=e.rng()<.5?1:-1,this.nextAt=e.t+Ee(e.rng,this.every[0],this.every[1]),!0)}go(e,t){this.phase=e,this.t0=this.mind.t,this.dur=t}update(e,t){if(this.phase==="idle"&&(!e.quiet&&e.t>=this.nextAt&&!e.eating&&e.freeze<=0&&this.start(),this.shakeAt>0&&e.t>=this.shakeAt&&(this.shakeAt=-1,this.ruffle.trigger(e,"shake",.7)),this.phase==="idle"))return;const n=this.root,i=ke((e.t-this.t0)/this.dur,0,1);let a=0,r=0,o=.6;switch(e.gazeLock=this.phase!=="land",this.phase){case"ready":{const c=Math.sin(i*Math.PI*.5);t.bodyShift.y-=.04*c,t.bodyShift.z+=.02*c,t.bodyPitch+=.34*c,t.headShift.y-=.012*c,t.fluff-=.12*c,t.tailFan+=.35*c,t.tailPitch-=.12*c,a=.42*re(0,.8,i);const l=Math.sin(e.t*46*Math.PI)*.05*c;for(const h of["L","R"])t.wing[h].lift+=.25*c+l,t.wing[h].droop+=.08*c;i>=1&&(this.from.copy(n.position),this.out.set(this.side*.55,1,.12).normalize(),e.emit("perch",{x:this.from.x,push:1,on:!1,side:.4}),this.go("takeoff",.27));break}case"takeoff":{n.position.copy(this.from).addScaledVector(this.out,.35*i+7.5*i*i*i),a=rs,r=re(0,.12,i),t.grip=1-re(0,.15,i),t.bodyShift.y+=.03*re(0,.3,i),t.bodyPitch+=de(.34,.1,re(0,.6,i)),o=.95,t.bodyRoll+=-this.side*.25*i,t.tailFan+=.8,t.tailPitch-=.25,t.fluff-=.14,i>=1&&(n.visible=!1,this.go("away",Ee(e.rng,this.awayFor[0],this.awayFor[1])));break}case"away":{a=rs,i>=1&&(this.landX=this.hop.home+Ee(e.rng,-.12,.12),this.landX=this.hop.place(this.landX,this.landAt),this.hover.copy(this.landAt),this.hover.y+=.2,this.far.copy(this.hover).add(new y(-this.side*Ee(e.rng,3.2,4.4),Ee(e.rng,1.8,3),Ee(e.rng,-1.2,-.3))),n.position.copy(this.far),n.visible=!0,this.go("approach",Ee(e.rng,.42,.55)));break}case"approach":{const c=1-Math.pow(1-i,3);n.position.copy(this.far).lerp(this.hover,c),a=rs,r=1,t.grip=0,t.bodyPitch+=de(.5,-.32,re(.35,1,i)),o=de(.9,.35,re(.35,1,i)),t.bodyRoll+=this.side*.3*(1-c),t.tailFan+=de(.3,1,re(.4,1,i)),t.tailPitch-=.3*re(.4,1,i),t.fluff-=.1,i>=1&&this.go("brake",Ee(e.rng,.45,.62));break}case"brake":{const c=re(.6,1,i);o=.35,n.position.copy(this.hover).lerp(this.landAt,c),n.position.y+=.015*Math.sin(e.t*31)*(1-c),n.position.x+=.008*Math.sin(e.t*23)*(1-c),a=rs,r=1,t.grip=re(.8,1,i)*.5,t.bodyPitch-=de(.32,.05,c),t.bodyShift.y+=.02*(1-c),t.tailFan+=1,t.tailPitch-=de(.3,.1,c),i>=1&&(n.position.copy(this.landAt),this.hop.landed(),e.emit("perch",{x:this.landAt.x,push:.85,on:!0,side:Ee(e.rng,-1,1)}),this.tail.flick(e,1.2),this.go("land",.5));break}case"land":{n.position.copy(this.landAt),a=i<.12?rs:1-re(.12,.75,i),r=1-re(0,.14,i),t.grip=.5+.5*re(0,.25,i),t.tailFan+=.8*(1-re(0,.8,i));for(const c of["L","R"])t.wing[c].lift+=.3*Math.sin(Math.PI*re(.5,1,i));i>=1&&(this.phase="idle",this.hop.hold=!1,e.gazeLock=!1,this.shakeAt=e.t+Ee(e.rng,.25,.6),e.freeze=.3);break}}if(a===rs&&r>.9&&Math.random()<.3){a=1,r*=.55;const c=Math.random()<.5;for(const l of["L","R"])t.wing[l].sweep=c?Ee(Math.random,.7,1):-Ee(Math.random,.9,1.25),t.wing[l].raise=(c?-.1:.45)+o*.4}t.wing.L.spread=t.wing.R.spread=a,this.blur.set(r,o),this.hop.follow()}dispose(){this.blur.dispose()}}const Av=[[.44,-.5],[.52,-.25],[.38,-.65]];class Rv{constructor(e,t,n){this.billReach=n,this.nextAt=Ee(e.rng,this.every[0]*.6,this.every[1]*.7);const i={p:new y,n:new y,t:new y};for(const a of["L","R"])for(const[r,o]of Av){const c=t.loft.wingAt(r,o,fn(a));t.loft.surface(c.s,c.ang,i),this.spots[a].push(i.p.clone().addScaledVector(i.n,this.tipOff))}this.coord=t.loft.bodyCoord(3.4),this.hips=t.rest.hips.worldPos.clone(),this.headRest=t.rest.head.worldPos.clone(),e.on("startle",()=>{this.active&&(e.gazeLock=!1),this.active=!1})}billReach;name="preen";auto=!1;every=[22,55];blocked=()=>!1;onDone=null;active=!1;wingOut=.44;wingTwist=.42;billDir=new y(.12,-.86,-.5).normalize();billOut=new y(.3,-.92,.05).normalize();tipOff=.03;bodyYaw=.22;bodyRoll=.1;bodyPitch=.06;headRoll=1.2;t0=0;dur=4;side="L";nextAt;coord;hips;headRest;spots={L:[],R:[]};spot=new y;seed=0;tBreak=0;order=[0,1,2];q=new mt;e=new qn;d=new y;a=new y;b=new y;start(e,t){return this.active||this.blocked()||e.eating?!1:(this.active=!0,this.t0=e.t,this.dur=Ee(e.rng,4,5),this.side=t??(e.rng()<.5?"L":"R"),this.seed=e.rng()*100,this.tBreak=Ee(e.rng,.42,.58),this.order=e.rng()<.5?[0,1,2]:[2,0,1],this.spot.copy(this.spots[this.side][this.order[0]]),this.nextAt=e.t+this.dur+Ee(e.rng,this.every[0],this.every[1]),!0)}update(e,t){if(!this.active&&(this.auto&&!e.quiet&&e.t>=this.nextAt&&(e.arousal<.5&&e.freeze<=0&&!e.focus&&!e.saccading?this.start(e):this.nextAt=e.t+2),!this.active))return;const n=e.t-this.t0,i=this.dur;if(n>=i||this.blocked()){this.active=!1,e.gazeLock=!1,n>=i&&this.onDone?.(e);return}e.gazeLock=!0;const a=fn(this.side),r=(R,k)=>re(R,k,n),o=i-1.3,c=r(0,.42)*(1-r(i-.6,i-.1)),l=r(.12,.7)*(1-r(i-.95,i-.25)),h=r(.22,.8)*(1-r(o+.2,o+.9)),d=r(.5,.95)*(1-r(o+.18,o+.65)),u=.95,f=de(u+.3,o,this.tBreak);let p=r(u-.1,u+.22)*(1-r(o,o+.24));p*=1-.75*r(f-.16,f)*(1-r(f+.08,f+.3));const b=de(f,o,.55),g=this.order[n<f?0:n<b?1:2];this.spot.lerp(this.spots[this.side][g],1-Math.exp(-e.dt*(n<f+.3?14:7)));const m=re(.8,1,p),_=n*9.5*Math.PI*2+this.seed,S=re(-.15,.35,Math.sin(n*5.1+this.seed)+.6*Math.sin(n*2.3+this.seed*1.7)),v=Math.sin(_)*m*S,w=Math.sin(_*.5+1.3)*m*S,E=a*this.bodyYaw*l,x=a*this.bodyRoll*l,M=this.bodyPitch*l;t.bodyYaw+=E,t.bodyRoll+=x,t.bodyPitch+=M,t.bodyShift.x+=a*.012*l,t.tailYaw+=-a*.14*l,t.tailFan+=.12*l,this.e.set(t.bodyPitch,t.bodyYaw,t.bodyRoll,"YXZ"),this.q.setFromEuler(this.e);const N=R=>R.sub(this.hips).applyQuaternion(this.q).add(this.hips).add(t.bodyShift),P=t.wing[this.side];P.out+=c*this.wingOut+v*.012+.03*m*Math.sin(n*3.1+this.seed),P.twist+=c*this.wingTwist+w*.015,P.lift+=c*.05,t.wing[this.side==="L"?"R":"L"].lift+=.05*l;const I=this.d.copy(this.billDir);I.x*=a;const D=this.a.copy(this.spot).addScaledVector(I,-this.billReach);this.b.copy(this.billOut),this.b.x*=a,I.lerp(this.b,1-p).normalize(),D.addScaledVector(I,this.billReach+v*.014),D.z+=w*.006,D.y+=w*.005,N(D),I.applyQuaternion(this.q),t.reachTarget.copy(D),t.reachDir.copy(I),t.reachPin=1,t.reachRoll=a*(this.headRoll+.05*w),t.reachWeight=d,t.headYaw=de(t.headYaw,a*100*Le+t.bodyYaw,h),t.headPitch=de(t.headPitch,-52*Le,h),t.headRoll=de(t.headRoll,a*.15,h);const L=this.b.copy(this.spot).addScaledVector(this.d.copy(this.billDir).setX(this.billDir.x*a),-this.billReach);N(L).sub(this.headRest),t.headShift.addScaledVector(L,h*.8),t.headStabil=de(t.headStabil,.3,h),t.jaw+=(.1+.16*(.5+.5*Math.sin(_+.6)))*m*S,t.nict+=.45*m,t.lidLower+=.3*m,t.lidUpper+=.15*m,t.addLift(this.coord,.09,m*(.08+.04*Math.abs(v))),t.fluff+=.04*l}}function Pv(s={}){const e=s.species??Un,t=new An;t.name="bird";const n=Wx(e);t.add(n.rootBone);const i=av(n),{material:a,uniforms:r}=ov(),o=new kn(i.contour,a);o.name="bird.contour";const c=new kn(i.flight,a);c.name="bird.flight";const l=new kn(i.fuzz,a);l.name="bird.fuzz",l.frustumCulled=!1,l.bind(n.skeleton,new Ve),l.receiveShadow=!0;const h=cv(r);for(const O of[o,c])O.customDepthMaterial=h,O.castShadow=!0,O.frustumCulled=!1,O.bind(n.skeleton,new Ve),O.receiveShadow=!0;const d=lv(n);t.add(o,c,l,...d.meshes);const u=new eu,f=dv(n,r),p=new uv(e,s.seed??e.seed),b=new yv(p),g={root:t,at:null,range:[0,0],restRadius:e.legs.perchRadius},m=new wv(p,g),_=new Mv(p,f,n.rest.head.worldPos.clone(),O=>F.onPick?.(O),O=>F.onSwallow?.(O),m),S=new Sv(p),v=new _v(p),w=new xv(p),E=new Tv(p,n,t,m,v,w),x=new vv(p),M=new Rv(p,n,f.billReach);S.blocked=()=>E.active||m.busy||M.active;const N=()=>S.blocked()||_.state!=="idle";M.blocked=()=>E.active||m.busy||p.eating||_.state!=="idle",M.onDone=O=>{x.shuffle(O),O.rng()<.5&&v.trigger(O,"puff",.35)};const P=[new fv(p),new pv,new gv(p),new bv(p),v,w,x,_,S,M,m,b,E];let I=[];const D=[],L=n.rest.head.worldPos.clone(),R=new y,k=new Ve;let U=null;const F={root:t,species:e,rig:n,pose:u,mind:p,layers:P,layer:O=>{const W=P.find(Y=>Y.name===O);if(!W)throw new Error(`no layer ${O}`);return W},plumage:r,feathers:{contour:o,flight:c,fuzz:l},headPosition:O=>n.bones.head.getWorldPosition(O),onPose:null,flee:()=>E.start(),preen:O=>M.start(p,O),get preening(){return M.active},get fleeing(){return E.active},get away(){return E.gone},get perched(){return E.perched},sing:O=>!N()&&(S.sing(p,O),!0),get singing(){return S.singing},lick:(O,W)=>!N()&&(S.lick(p,O,W),!0),hopTo:O=>!N()&&m.go(p,O),hopBy:O=>F.hopTo(m.x+O),get busy(){return N()},ruffle:(O,W)=>v.trigger(p,O,W),update(O){t.updateWorldMatrix(!0,!1),k.copy(t.matrixWorld).invert(),p.attention=U?R.copy(U).applyMatrix4(k):null,p.food.length=0;for(let W=0;W<(E.active||M.active?0:I.length);W++){const Y=D[W]??={id:0,pos:new y,vel:new y};Y.id=I[W].id,Y.pos.copy(I[W].position).applyMatrix4(k),Y.vel.copy(I[W].velocity).transformDirection(k).multiplyScalar(I[W].velocity.length()),p.food.push(Y)}p.step(O,L),u.reset();for(const W of P)W.update(p,u);F.onPose?.(u,p),f(u)},setAttention(O){U=O},setFood(O){I=O},setPerch(O,W){g.at=O,g.range=W,m.reseat()},onPick:null,onSwallow:null,billTip(O){return O.copy(f.carry).applyMatrix4(t.matrixWorld)},startle(O=1){E.active||(b.fire(Math.min(Math.max(O,0),1)),O>=.9&&!p.quiet&&p.rng()<.22&&E.start())},dispose(){i.contour.dispose(),i.flight.dispose(),i.fuzz.dispose(),a.dispose(),h.dispose(),E.dispose(),d.dispose(),n.skeleton.dispose(),V?.()}},V=Cv(F);return F.update(0),F}function Cv(s){if(typeof window>"u")return null;const e=new URLSearchParams(window.location.search);window.__bird=s;const t=p=>e.has(p)?Number(e.get(p)):null,n={front:[0,22,0],profile:[88,16,0],up:[10,40,8],back:[-110,10,0],three:[38,20,-4]},i=e.get("pose");i&&n[i]&&(s.mind.pinGaze=n[i]);const a=e.get("gaze");if(a){const[p=0,b=0,g=0]=a.split(",").map(Number);s.mind.pinGaze=[p,b,g]}if(e.has("quiet")&&(s.mind.quiet=!0),e.has("sing")){const p=s.onPose;let b=1;s.onPose=(g,m)=>{p?.(g,m),m.t>b&&!s.singing&&s.sing(1.8)&&(b=m.t+4)}}const r=t("jaw"),o=t("tongue"),c=t("arousal"),l=t("fluff"),h=t("spread"),d=t("fan"),u=t("blink");if(c!==null||l!==null||h!==null||d!==null||u!==null||r!==null||o!==null){const p=s.onPose;s.onPose=(b,g)=>{p?.(b,g),r!==null&&(b.jaw=r),o!==null&&(b.tongueOut=o),c!==null&&(g.arousal=g.baseline=c),l!==null&&(b.fluff=l),h!==null&&(b.wing.L.spread=b.wing.R.spread=h),d!==null&&(b.tailFan=d),u!==null&&(b.nict=b.lidLower=b.lidUpper=u)}}e.has("nofuzz")&&s.root.traverse(p=>p.name==="bird.fuzz"&&(p.visible=!1)),e.has("noflash")&&(s.plumage.uFlash.value=s.plumage.uGlint.value=0),e.has("skin")&&s.root.traverse(p=>p.name.match(/contour|flight|fuzz/)&&(p.visible=!1)),e.has("wire")&&s.root.traverse(p=>{const b=p.material;p.name==="bird.skin"&&b&&(b.wireframe=!0,b.color.set(16777215),b.emissive.set(8947848))});let f=null;return e.has("bones")&&(f=new Rp(s.rig.rootBone),f.material.depthTest=!1,f.renderOrder=10,s.root.add(f)),()=>{f?.dispose()}}function ce(s){return{width:.03,aspect:2.2,rowStep:.29,tilt:12,lift:1,cup:.3,round:.7,loose:.4,fuzz:.3,iri:16777215,iriGraze:16777215,iriStrength:0,iriPower:4,iriAlign:0,jitter:.45,...s}}function Lv(s){const e=Un.sections.map(_=>({..._})),t=s.length??1,n=s.girth??1,i=s.width??1,a=s.neck??1,r=s.head??1,o=s.face??1,c=(s.tilt??0)*Math.PI/180,l=(s.headLevel??(s.tilt??0)*.75)*Math.PI/180,h={y:e[2].y,z:e[2].z},d=e.map(_=>({..._}));for(let _=0;_<=5;_++)d[_].y=h.y+(e[_].y-h.y)*t,d[_].z=h.z+(e[_].z-h.z)*t,d[_].rd=e[_].rd*n,d[_].rv=e[_].rv*n,d[_].w=e[_].w*i;d[5].y-e[5].y,d[5].z-e[5].z,d[6].y=d[5].y+(e[6].y-e[5].y)*a,d[6].z=d[5].z+(e[6].z-e[5].z)*a,d[6].w=e[6].w*vo(i,r,.5),d[6].rd=e[6].rd*vo(n,r,.5),d[6].rv=e[6].rv*vo(n,r,.5);for(let _=7;_<=10;_++){const S=_>=9?o:1,v=_>=9?e[8]:e[6],w=_>=9?d[8]:d[6];d[_].y=w.y+(e[_].y-v.y)*r*S,d[_].z=w.z+(e[_].z-v.z)*r*S,d[_].w=e[_].w*r,d[_].rd=e[_].rd*r,d[_].rv=e[_].rv*r}const u=(_,S,v)=>{const w=_.y-S.y,E=_.z-S.z;_.z=S.z+E*Math.cos(v)+w*Math.sin(v),_.y=S.y-E*Math.sin(v)+w*Math.cos(v)},f={y:Un.wing.shoulder[1],z:Un.wing.shoulder[2]};f.y=h.y+(f.y-h.y)*t,f.z=h.z+(f.z-h.z)*t;for(const _ of d)u(_,h,c),_.a-=c*180/Math.PI;u(f,h,c);const p={y:d[6].y,z:d[6].z};for(let _=7;_<=10;_++)u(d[_],p,-l),d[_].a+=l*180/Math.PI;d[6].a+=l*90/Math.PI;const b=_=>d[_].y-d[_].rv*Math.cos(d[_].a*Math.PI/180),m=Math.min(e[1].y-e[1].rv*Math.cos(e[1].a*Math.PI/180),e[2].y-e[2].rv*Math.cos(e[2].a*Math.PI/180))-Math.min(b(1),b(2))+(s.lift??0);for(const _ of d)_.y+=m;return f.y+=m,{sections:d,shoulder:[Un.wing.shoulder[0]*i,f.y,f.z],hip:[Un.legs.hip[0]*i,Un.legs.hip[1]+(s.lift??0),Un.legs.hip[2]],length:t}}function vo(s,e,t){return s+(e-s)*t}const Tt=Un;function Ei(s){const e=structuredClone(Tt),{body:t,...n}=s,i=Lv(t),a={...e.wing,...s.wing??{}};return a.shoulder=i.shoulder,a.upper*=i.length,a.fore*=i.length,a.hand*=i.length,{...e,...n,sections:i.sections,wing:a,tail:{...e.tail,...s.tail??{}},legs:{...e.legs,...s.legs??{},hip:s.legs?.hip??i.hip,perchRadius:e.legs.perchRadius},behaviour:{...e.behaviour,...s.behaviour??{}}}}function Ti(s){return[{name:"belly",look:"belly",region:{kind:"band",s:[0,4.6],phi:[0,.45],soft:.6}},{name:"flank",look:"flank",region:{kind:"band",s:[1.2,4.4],phi:[.3,.52],soft:.5}},{name:"back",look:"back",region:{kind:"band",s:[.9,6.3],phi:[.55,1]}},{name:"scapular",look:"scapular",region:{kind:"band",s:[3.7,5.6],phi:[.56,.84],soft:.3}},{name:"wingPit",look:"down",region:{kind:"blob",at:[3.8,.44],r:[.3,.035],soft:.5}},{name:"tailCoverts",look:"covert",region:{kind:"band",s:[0,1.15],phi:[0,1]}},{name:"undertail",look:"undertail",region:{kind:"band",s:[0,1.35],phi:[0,.4],soft:.3}},{name:"breast",look:"breast",region:{kind:"band",s:[4.3,6.4],phi:[0,.42],soft:.5}},{name:"throat",look:"throat",region:{kind:"band",s:[6.2,8.4],phi:[0,.38],soft:.4}},{name:"head",look:"head",region:{kind:"band",s:[6.3,11],phi:[.36,1],soft:.3}},{name:"face",look:"face",region:{kind:"blob",at:[8.6,.35],r:[1.4,.3],soft:.3}},...s]}const Ai={breathHz:[1.9,3.2],holdCalm:[.7,2.6],holdAlert:[.3,1.1],saccade:[.05,5e-4],neckShare:[.28,.32],blinkEvery:[2.2,6.5],ruffleEvery:[40,90],tailEvery:[3,8],wingEvery:[8,18],billUp:6},Dv=Ei({name:"Prosthemadera novaeseelandiae",seed:2201,body:{tilt:20,length:1.1,girth:.86,width:.86,neck:1.3,head:1.1,face:1.1},eye:{s:7.85,phi:.56,radius:.034,inset:.84},bill:{length:.21,radius:.029,droop:.04,color:657931},skin:1315088,shading:{flank:.75,under:.7,patch:.25,gold:5913620,goldAmount:.3},looks:{body:ce({width:.0252,base:723984,tip:1579809,iri:2775702,iriGraze:5909126,iriStrength:.2,iriPower:6,sparkle:.5}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.5,base:1183243,tip:2498071,iri:2771546,iriGraze:3811914,iriStrength:.07,sparkle:.6}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:1445641,tip:3088918,iri:3820090,iriGraze:4864554,iriStrength:.04}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:1446416,tip:3156004}),back:ce({width:.0252,base:1314570,tip:3154966,iri:3832378,iriGraze:9067034,iriStrength:.19,iriPower:7,loose:.32,sparkle:.45}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:1249035,tip:2892568,iri:3836490,iriGraze:8018458,iriStrength:.18,iriPower:6}),breast:ce({width:.0252,aspect:2,rowStep:.3,loose:.29,base:658190,tip:1382173,iri:2778278,iriGraze:6961840,iriStrength:.21,iriPower:6,iriAlign:.2,iriAim:[0,-.2,1],sparkle:.5}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.35,base:526604,tip:1250587,iri:2781366,iriGraze:8010448,iriStrength:.28,iriPower:7,iriAlign:.3,iriAim:[0,-.3,1],sparkle:.45}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.27,fuzz:.2,base:526605,tip:1250844,iri:2787994,iriGraze:6961824,iriStrength:.25,iriPower:7,sparkle:.4}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.43,fuzz:.5,base:394759,tip:921362,iri:2775690,iriGraze:3811946,iriStrength:.1}),lace:ce({width:.007,aspect:7,rowStep:.2,tilt:26,lift:1.5,cup:.05,round:.15,loose:1,fuzz:.6,base:723983,tip:9079946,jitter:1}),poi:ce({width:.013,aspect:2.4,rowStep:.1,tilt:72,lift:2,cup:1,round:.4,loose:1,fuzz:1,base:13158336,tip:16645367,jitter:1.1}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1249035,tip:2760724,iri:3832394,iriGraze:6969898,iriStrength:.14,iriPower:6}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.5,base:1052173,tip:2235930}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1052690,tip:2105382,iri:3824266,iriGraze:4864618,iriStrength:.16,iriPower:6,sparkle:.5})},tracts:Ti([{name:"lace",look:"lace",region:{kind:"band",s:[5.5,6.4],phi:[.66,.97],soft:.9}},{name:"poi",look:"poi",region:{kind:"blob",at:[6.85,.07],r:[.36,.042],soft:.25}}]),wing:{...Tt.wing,color:1381394,sheen:3816530,bar:{rows:[.66,1],v:[-.1,.7],base:13158594,tip:16053486}},tail:{...Tt.tail,rectrices:6,length:[.84,.9],width:.12,droop:44,color:1184792},legs:{...Tt.legs,color:1315088},behaviour:{...Ai,billUp:8}}),Iv=Ei({name:"Anthornis melanura",seed:2202,body:{tilt:18,length:1.04,girth:.88,width:.88,neck:1.2,head:1.08,face:1.05},eye:{s:7.85,phi:.56,radius:.033,inset:.84,iris:11739676},bill:{length:.16,radius:.024,droop:.03,color:1118224},skin:2762272,shading:{flank:.8,under:.85,patch:.22,gold:6972448,goldAmount:.25},looks:{body:ce({width:.0252,base:1975308,tip:3818522,iri:6982186,iriGraze:9075242,iriStrength:.06}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.54,base:3422234,tip:7105594}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:3159578,tip:6185520}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:2763290,tip:4868656}),back:ce({width:.0252,base:2633746,tip:5003810,iri:5929514,iriGraze:6973978,iriStrength:.08,loose:.32}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2501650,tip:4740128}),breast:ce({width:.0252,aspect:2.1,loose:.43,base:2896150,tip:5660208}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.36,base:2895893,tip:5923376}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.29,fuzz:.2,base:1712142,tip:3424026,iri:5913256,iriGraze:2775720,iriStrength:.22,iriPower:5,sparkle:0}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:1580048,tip:3028e3,iri:6961856,iriGraze:2771632,iriStrength:.18,iriPower:5,sparkle:0}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2765332,tip:5661226}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.54,base:4868650,tip:9079386}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1711122,tip:3422752})},tracts:Ti([]),wing:{...Tt.wing,color:1710612,sheen:3820074,bar:{rows:[0,.3],v:[.2,1.02],base:12103776,tip:15261856}},tail:{...Tt.tail,rectrices:6,length:[.72,.78],width:.11,droop:46,color:1711124},legs:{...Tt.legs,color:3814440},behaviour:{...Ai,billUp:7}}),Nv=Ei({name:"Rhipidura fuliginosa",seed:2203,body:{tilt:16,length:.92,girth:.92,width:.92,neck:1.05,head:1.18,face:.75},eye:{s:7.85,phi:.56,radius:.036,inset:.84},bill:{length:.075,radius:.03,droop:.008,color:855052},skin:2761760,shading:{flank:.82,under:.9,patch:.2,gold:6967328,goldAmount:.1},looks:{body:ce({width:.0252,base:2761756,tip:5523512}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:6965800,tip:13146718}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:5914146,tip:11435592}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:4864554,tip:9071178}),back:ce({width:.0252,base:2761752,tip:5524020,loose:.36}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2630166,tip:5129264}),breast:ce({width:.0252,aspect:2.1,loose:.47,base:6965802,tip:12752480}),band:ce({width:.0218,aspect:2,loose:.32,base:723466,tip:1710102}),throat:ce({width:.02,aspect:1.9,rowStep:.32,loose:.5,fuzz:.6,base:12235944,tip:15920868}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.5,loose:.32,fuzz:.25,base:2499102,tip:4867132}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.43,fuzz:.4,base:1446927,tip:2762272}),stripe:ce({width:.012,aspect:2.6,rowStep:.24,tilt:6,lift:.2,cup:.15,round:.5,loose:.95,fuzz:1,base:11841962,tip:15921386}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2235412,tip:4076582}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:9071168,tip:14200954}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1841172,tip:3419170})},tracts:Ti([{name:"band",look:"band",region:{kind:"band",s:[5.55,6.2],phi:[0,.4],soft:.25}},{name:"throat",look:"throat",region:{kind:"band",s:[6.2,8.3],phi:[0,.3],soft:.3}},{name:"brow",look:"stripe",region:{kind:"streak",from:[9.2,.66],to:[7.7,.64],r:[.16,.028]}},{name:"earSpot",look:"stripe",region:{kind:"blob",at:[7.2,.56],r:[.22,.03]}}]),wing:{...Tt.wing,color:1709586,sheen:3814440,bar:{rows:[.55,.8],v:[-1.02,1.02],base:10127978,tip:14208176}},tail:{...Tt.tail,rectrices:6,length:[1.02,1.06],width:.12,droop:30,restFan:1.6,maxFan:15,color:1184016,outer:{from:.75,color:14210252}},legs:{...Tt.legs,color:1709586},behaviour:{...Ai,breathHz:[3,4.6],holdCalm:[.25,1.1],holdAlert:[.15,.6],saccade:[.035,4e-4],tailEvery:[.6,2.2],wingEvery:[3,8],billUp:4}}),Fv=Ei({name:"Zosterops lateralis",seed:2204,body:{tilt:22,length:.98,girth:.9,width:.9,neck:1.1,head:1.12,face:.95},eye:{s:7.85,phi:.56,radius:.033,inset:.84,iris:5913124},bill:{length:.1,radius:.019,droop:.012,color:2762276},skin:3814448,shading:{flank:.85,under:.9,patch:.2,gold:6972448,goldAmount:.1},looks:{body:ce({width:.0252,base:3818520,tip:7240754}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:.95,loose:.58,base:9341564,tip:14867920}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:8014378,tip:13011544}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:6974042,tip:11184280}),back:ce({width:.0252,base:4080672,tip:7108664,loose:.36}),saddle:ce({width:.0269,aspect:2.3,loose:.4,base:4737098,tip:8947850}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:4868680,tip:8684670}),breast:ce({width:.0252,aspect:2.1,loose:.5,base:8026218,tip:13157554}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.43,base:6973994,tip:12894810}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.32,fuzz:.25,base:3818520,tip:7109168}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:3027988,tip:5660714}),ring:ce({width:.011,aspect:1.8,rowStep:.22,tilt:5,lift:.15,cup:.3,round:.9,loose:.3,fuzz:.3,base:14605526,tip:16777215}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:4080160,tip:6976568}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:10132106,tip:15262934}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:2764312,tip:5660718})},tracts:Ti([{name:"saddle",look:"saddle",region:{kind:"band",s:[3.6,6],phi:[.62,1],soft:.4}},{name:"ring",look:"ring",region:{kind:"blob",at:[7.85,.56],r:[.42,.055],pow:2,soft:.1}}]),wing:{...Tt.wing,color:2500634,sheen:5925418},tail:{...Tt.tail,rectrices:6,length:[.62,.66],width:.11,droop:46,color:2763804},legs:{...Tt.legs,color:5918792},behaviour:{...Ai,breathHz:[2.6,4],holdCalm:[.35,1.4],holdAlert:[.2,.7],billUp:5}}),Uv=Ei({name:"Petroica macrocephala macrocephala",seed:2205,body:{tilt:8,length:.9,girth:.98,width:1,neck:.85,head:1.3,face:.78},eye:{s:7.8,phi:.56,radius:.037,inset:.84},bill:{length:.07,radius:.022,droop:.006,color:723723},skin:1710102,shading:{flank:.85,under:.92,patch:.15,gold:6969888,goldAmount:.05},looks:{body:ce({width:.0252,base:723724,tip:1644827}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:12104356,tip:15920868}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:10123840,tip:14726752}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:2763306,tip:4868682}),back:ce({width:.0252,base:657931,tip:1579034,loose:.32}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:657931,tip:1710620}),breast:ce({width:.0252,aspect:2.1,loose:.47,base:12089884,tip:15905338}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.32,base:592138,tip:1447448}),head:ce({width:.019,aspect:1.8,rowStep:.34,lift:.5,loose:.32,fuzz:.25,base:592138,tip:1447448}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:460552,tip:1118483}),spot:ce({width:.012,aspect:1.8,rowStep:.26,tilt:8,lift:.3,loose:.6,fuzz:.6,base:14210768,tip:16777215}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:657931,tip:1579034}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:12631216,tip:16052970}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:723724,tip:1644827})},tracts:Ti([{name:"breast",look:"breast",region:{kind:"band",s:[3.4,6],phi:[0,.44],soft:.6}},{name:"throat",look:"throat",region:{kind:"band",s:[5.9,8.6],phi:[0,.4],soft:.25}},{name:"spot",look:"spot",region:{kind:"blob",at:[9.6,.9],r:[.4,.12]}}]),wing:{...Tt.wing,color:855310,sheen:2763310,bar:{rows:[.45,.85],v:[-1.02,1.02],base:14079182,tip:16777215}},tail:{...Tt.tail,rectrices:6,length:[.48,.52],width:.12,droop:56,color:789517,outer:{from:.8,color:13618372}},legs:{...Tt.legs,color:1118481},behaviour:{...Ai,holdCalm:[.5,1.8],tailEvery:[1.8,5],billUp:4}}),kv=Ei({name:"Petroica longipes",seed:2206,body:{tilt:4,length:1,girth:.9,width:.9,neck:1.15,head:1.12,face:.9,lift:.06},eye:{s:7.85,phi:.56,radius:.037,inset:.84},bill:{length:.09,radius:.02,droop:.008,color:921102},skin:2368031,shading:{flank:.82,under:.88,patch:.2,gold:4868666,goldAmount:.04},looks:{body:ce({width:.0252,base:2105636,tip:4277320}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:3816254,tip:6974576}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:2763565,tip:5263958}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:3815994,tip:6974058}),back:ce({width:.0252,base:1579291,tip:3290167,loose:.36}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:1513498,tip:3158581}),breast:ce({width:.0252,aspect:2.1,loose:.54,base:8026228,tip:13026494}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.36,base:1974049,tip:3816512}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.3,fuzz:.22,base:1513498,tip:3290168}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.4,fuzz:.4,base:1184532,tip:2500650}),spot:ce({width:.011,aspect:1.8,rowStep:.26,tilt:8,lift:.3,loose:.6,fuzz:.6,base:11842220,tip:15263456}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1579291,tip:3290167}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:6974056,tip:12105392}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1316118,tip:2763822})},tracts:Ti([{name:"slate",look:"flank",region:{kind:"band",s:[0,2.4],phi:[0,.45],soft:.5}},{name:"breast",look:"breast",region:{kind:"blob",at:[3.9,0],r:[1.25,.27],soft:.6}},{name:"throat",look:"throat",region:{kind:"band",s:[5.2,8.6],phi:[0,.4],soft:.4}},{name:"spot",look:"spot",region:{kind:"blob",at:[9.7,.85],r:[.32,.1]}}]),wing:{...Tt.wing,color:1447706,sheen:3816512},tail:{...Tt.tail,rectrices:6,length:[.64,.68],width:.12,droop:60,color:1447705},legs:{...Tt.legs,color:2762790,hip:[.085,.13,-.05]},behaviour:{...Ai,holdCalm:[.6,2.2],tailEvery:[2,6],billUp:5}}),Ov=Ei({name:"Notiomystis cincta",seed:2207,body:{tilt:16,length:1.04,girth:.88,width:.88,neck:1.15,head:1.08,face:1},eye:{s:7.85,phi:.56,radius:.034,inset:.84},bill:{length:.13,radius:.019,droop:.022,color:855052},skin:2762272,shading:{flank:.85,under:.9,patch:.2,gold:6969888,goldAmount:.1},looks:{body:ce({width:.0252,base:2762264,tip:5919290}),belly:ce({width:.0277,aspect:2.5,rowStep:.24,lift:1,loose:.58,base:6972496,tip:12235418}),flank:ce({width:.0302,aspect:2.8,rowStep:.24,lift:1,loose:.61,base:4867120,tip:8682074}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:3815978,tip:6974026}),back:ce({width:.0252,base:2762776,tip:5393458,loose:.36}),scapular:ce({width:.0353,aspect:3.3,rowStep:.24,tilt:18,lift:.8,base:2762262,tip:5130288}),breast:ce({width:.0252,aspect:2.1,loose:.47,base:5919808,tip:10787452}),gold:ce({width:.0252,aspect:2.2,loose:.36,base:10517008,tip:16041008}),throat:ce({width:.02,aspect:1.8,rowStep:.32,loose:.4,fuzz:.5,base:394758,tip:1118481}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.43,fuzz:.6,base:328965,tip:986896}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.54,fuzz:.7,base:263172,tip:789516}),tuft:ce({width:.012,aspect:3.6,rowStep:.16,tilt:48,lift:1.6,cup:.2,round:.4,loose:.8,fuzz:.8,base:13289666,tip:16777215,jitter:.6}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:2762262,tip:5392944}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:9077868,tip:13814448}),wingCovert:ce({width:.03,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1710096,tip:3814948})},tracts:Ti([{name:"gold",look:"gold",region:{kind:"band",s:[5.1,6],phi:[.06,.62],soft:.3}},{name:"hood",look:"head",region:{kind:"band",s:[6,11],phi:[.35,1]}},{name:"throat",look:"throat",region:{kind:"band",s:[5.9,8.6],phi:[0,.4],soft:.2}},{name:"tuft",look:"tuft",region:{kind:"blob",at:[7.15,.66],r:[.34,.06]}}]),wing:{...Tt.wing,color:1841684,sheen:3815464,bar:{rows:[.6,.9],v:[-1.02,1.02],base:13684422,tip:16447728}},tail:{...Tt.tail,rectrices:6,length:[.66,.7],width:.11,droop:24,color:1973270},legs:{...Tt.legs,color:2762272},behaviour:{...Ai,holdCalm:[.4,1.6],tailEvery:[1.5,4.5],billUp:9}}),zv=Ei({name:"Hemiphaga novaeseelandiae",seed:2208,body:{tilt:30,length:1.2,girth:1.1,width:1.08,neck:1,head:.8,face:.85},eye:{s:7.85,phi:.56,radius:.031,inset:.84,iris:12593182},bill:{length:.1,radius:.026,droop:.016,color:11545120},skin:10500138,shading:{flank:.85,under:.92,patch:.2,gold:8018464,goldAmount:.35},looks:{body:ce({width:.0252,base:1450511,tip:2899992,iri:3840570,iriGraze:10119706,iriStrength:.55,iriPower:6,sparkle:.4}),belly:ce({width:.0302,aspect:2.4,rowStep:.24,lift:.95,loose:.61,fuzz:.5,base:13158080,tip:16513782}),flank:ce({width:.0319,aspect:2.7,rowStep:.24,lift:.95,loose:.61,base:11842220,tip:15658472}),down:ce({width:.04,aspect:2.6,tilt:26,lift:1.4,loose:1,base:10132118,tip:14605528}),back:ce({width:.0252,base:2758688,tip:4861494,iri:9058954,iriGraze:3836506,iriStrength:.5,iriPower:6,loose:.32,sparkle:.4}),scapular:ce({width:.037,aspect:3.1,rowStep:.24,tilt:16,lift:.8,base:2497052,tip:4600366,iri:8014442,iriGraze:4885050,iriStrength:.45,iriPower:6}),breast:ce({width:.0269,aspect:2,rowStep:.3,loose:.29,base:1187854,tip:2506778,iri:4893242,iriGraze:11565594,iriStrength:.85,iriPower:6,iriAlign:.2,iriAim:[0,-.2,1],sparkle:.35}),throat:ce({width:.022,aspect:1.9,rowStep:.32,loose:.35,base:1056782,tip:2243608,iri:5945930,iriGraze:10115744,iriStrength:.8,iriPower:7,sparkle:.35}),head:ce({width:.018,aspect:1.8,rowStep:.34,lift:.45,loose:.27,fuzz:.2,base:1253391,tip:2440218,iri:4893258,iriGraze:9063072,iriStrength:.7,iriPower:7,sparkle:.35}),face:ce({width:.014,aspect:1.6,rowStep:.3,tilt:7,lift:.2,loose:.36,fuzz:.4,base:989196,tip:1978390,iri:3836474,iriGraze:6961802,iriStrength:.35}),covert:ce({width:.0386,aspect:2.6,rowStep:.33,tilt:9,lift:.7,loose:.29,base:1845780,tip:3689506,iri:4889146,iriGraze:9071146,iriStrength:.4,iriPower:6}),undertail:ce({width:.04,aspect:2.9,rowStep:.26,tilt:10,lift:.8,loose:.58,base:12236978,tip:15921386}),wingCovert:ce({width:.032,aspect:2.3,rowStep:.4,tilt:7,lift:0,round:.8,loose:.22,fuzz:0,base:1713684,tip:3426334,iri:5937722,iriGraze:10119722,iriStrength:.45,iriPower:6,sparkle:.4})},tracts:Ti([{name:"breast",look:"breast",region:{kind:"band",s:[4.75,6.4],phi:[0,.5],soft:.05}},{name:"belly",look:"belly",region:{kind:"band",s:[0,4.75],phi:[0,.5],soft:.05}}]),wing:{...Tt.wing,color:1976854,sheen:4880954},tail:{...Tt.tail,rectrices:6,length:[.74,.78],width:.15,droop:30,color:2760728},legs:{...Tt.legs,color:11548200},behaviour:{...Ai,breathHz:[1.4,2.4],holdCalm:[1.2,3.6],holdAlert:[.5,1.6],saccade:[.07,6e-4],blinkEvery:[2.5,7],tailEvery:[6,14],wingEvery:[12,26],billUp:2}}),Bv={tui:Dv,korimako:Iv,piwakawaka:Nv,tauhou:Fv,miromiro:Uv,toutouwai:kv,hihi:Ov,kereru:zv},Rn=new y(0,1,0);function xi(s,e,t,n=24,i=8){const a=s.computeFrenetFrames(n,!1),r=[],o=[],c=[],l=[],h=new y,d=new y;for(let f=0;f<=n;f++){const p=f/n;s.getPointAt(p,h);const b=e(p);for(let g=0;g<=i;g++){const m=g/i*Math.PI*2;d.copy(a.normals[f]).multiplyScalar(Math.cos(m)).addScaledVector(a.binormals[f],Math.sin(m)),r.push(h.x+d.x*b,h.y+d.y*b,h.z+d.z*b),o.push(d.x,d.y,d.z);const _=t(p,m);c.push(_.r,_.g,_.b)}}for(let f=0;f<n;f++)for(let p=0;p<i;p++){const b=f*(i+1)+p,g=b+i+1;l.push(b,b+1,g,g,b+1,g+1)}const u=new yt;return u.setAttribute("position",new et(r,3)),u.setAttribute("normal",new et(o,3)),u.setAttribute("color",new et(c,3)),u.setIndex(l),u}function la(s,e,t,n,i={}){const a=i.segs??10,r=i.across??4,o=i.arch??.15,c=i.cup??.25,l=i.vein??.12,h=[],d=[],u=[],f=s*.006;for(const b of[1,-1]){const g=h.length/3,m=b>0?t:n;for(let S=0;S<=a;S++){const v=S/a,w=e(v);for(let E=0;E<=r*2;E++){const x=E/r-1,M=x*w,N=v*s,P=o*s*Math.sin(v*Math.PI)*.5-o*s*v*v*.6+c*Math.abs(x)*w+b*f;h.push(M,P,N);const I=1+l*Math.exp(-(x*x)*60);d.push(m.r*I,m.g*I,m.b*I)}}const _=r*2+1;for(let S=0;S<a;S++)for(let v=0;v<_-1;v++){const w=g+S*_+v,E=w+_;b>0?u.push(w,E,w+1,E,E+1,w+1):u.push(w,w+1,E,E,w+1,E+1)}}const p=new yt;return p.setAttribute("position",new et(h,3)),p.setAttribute("color",new et(d,3)),p.setIndex(u),p.computeVertexNormals(),p}function Bi(s,e,t,n=Rn,i=0){const a=t.clone().normalize(),r=new y().crossVectors(n,a);r.lengthSq()<1e-6&&r.set(1,0,0),r.normalize();const o=new y().crossVectors(a,r),c=new Ve().makeBasis(r,o,a);return i&&c.multiply(new Ve().makeRotationZ(i)),c.setPosition(e),s.applyMatrix4(c)}function gr(s){const e=s instanceof me?s:new me(s);return()=>e}function ri(s,e,t){for(const i of e){i.getAttribute("normal")||i.computeVertexNormals();for(const a of Object.keys(i.attributes))["position","normal","color"].includes(a)||i.deleteAttribute(a);i.index||i.setIndex([...Array(i.getAttribute("position").count).keys()])}const n=new Nt(q_(e,!1),t);return n.name=s,n.castShadow=!0,n.receiveShadow=!0,n}function Vc(s,e,t){const n=e.clone().sub(s),i=new y(-n.z,0,n.x).normalize().multiplyScalar(n.length()*.06);return new pr([s.clone(),s.clone().addScaledVector(n,.33).add(i.clone().multiplyScalar(t()-.3)),s.clone().addScaledVector(n,.66).add(i.clone().multiplyScalar(-(t()-.3))),e.clone()])}function Gv(s,e){const t=Ln(81),n=Vc(s,e,t),i=new me(5917226),a=[xi(n,_=>.02*(1-_*.55),_=>i.clone().lerp(new me(6978098),_*.7),40,8)],r=[],o=[],c=new me(15904768),l=new me(14191104),h=new me(10132010),d=new y,u=new y,f=6;for(let _=0;_<f;_++){const S=.25+_/(f-1)*.72;n.getPointAt(S,d),n.getTangentAt(S,u);const v=new y(Math.cos(_*2.4+.5),.15,Math.sin(_*2.4+.5)).normalize(),w=d.clone().addScaledVector(v,.035+t()*.03),E=new pr([d.clone(),w,w.clone().add(new y(v.x*.03,-.08,v.z*.03))]);a.push(xi(E,M=>.006*(1-M*.5),gr(6973994),10,5));const x=4+Math.floor(t()*4);for(let M=0;M<x;M++){const N=.35+M/x*.65,P=E.getPointAt(N),I=new y(Math.cos(M*2.1+_),0,Math.sin(M*2.1+_)).multiplyScalar(.5),D=new y(I.x,-1,I.z).normalize(),L=.1+t()*.035,R=new y().crossVectors(D,Rn).normalize(),k=new y().crossVectors(R,D).normalize(),U=new oc(P.clone(),P.clone().addScaledVector(D,L*.55).addScaledVector(k,L*.18),P.clone().addScaledVector(D,L).addScaledVector(k,L*.05));r.push(xi(U,V=>V<.12?.006+V*.05:.012*Math.sin(Math.min(1,(1-V)/.12)*Math.PI*.5)*(1-.25*V)+.004*(V<.97?1:0),(V,O)=>V<.12?h:c.clone().lerp(l,.25+.25*Math.sin(O*2)*V),18,10));const F=la(L*.42,V=>.02*Math.sin(Math.PI*Math.min(1,V*1.1)),c,l,{arch:-.4,cup:.6,segs:6,across:3,vein:.2});r.push(Bi(F,U.getPointAt(.1),D.clone().multiplyScalar(-.3).addScaledVector(k,-1),D))}}const p=_=>la(.03*_,S=>.011*_*Math.sin(Math.PI*Math.min(1,S*1.05)),new me(6982186),new me(9083482),{segs:5,across:2,arch:.1});for(let _=0;_<4;_++){const S=.55+_*.13;n.getPointAt(Math.min(S,.98),d);const v=new y(Math.cos(_*2.6+1),.6,Math.sin(_*2.6+1)).normalize(),w=.22,E=new oc(d.clone(),d.clone().addScaledVector(v,w*.6),d.clone().addScaledVector(v,w).add(new y(0,-.05,0)));a.push(xi(E,()=>.0028,gr(6978098),10,4));for(let x=1;x<14;x++){const M=x/14,N=E.getPointAt(M),P=E.getTangentAt(M),I=new y().crossVectors(P,Rn).normalize();for(const D of[1,-1])o.push(Bi(p(1-M*.35),N,I.clone().multiplyScalar(D).addScaledVector(P,.4),Rn))}}const b=new on({vertexColors:!0,roughness:.85}),g=new Bt({vertexColors:!0,roughness:.42,sheen:.6,sheenColor:new me(16769152),side:Lt,emissive:2758144}),m=new on({vertexColors:!0,roughness:.6,side:Lt});return[ri("shoot",a,b),ri("buds",r,g),ri("buds",o,m)]}function Hv(s,e){const t=Ln(82),n=Vc(s,e,t),i=[xi(n,E=>.024*(1-E*.4),E=>new me(4865588).lerp(new me(12104354),Wv(.5,1,E)),40,8)],a=[],r=[],o=new me(12784156),c=new me(7997968),l=new me(14196768),h=new me(13157044),d=new da(.0016,.0022,1,3,1);d.translate(0,.5,0);const u=new Vi(.0055,5,4),f=new Vi(.018,8,6,0,Math.PI*2,Math.PI*.45,Math.PI*.55),p=[{u:1,spread:.11},{u:.72,spread:.09}],b=new y,g=new y;for(const E of p){n.getPointAt(E.u,b),n.getTangentAt(E.u,g);const x=b.clone().addScaledVector(g,.03),M=11;for(let N=0;N<M;N++){const P=N*2.39996,I=Math.sqrt((N+.5)/M),D=new y(Math.cos(P)*I,.9-I*.6,Math.sin(P)*I).normalize(),L=x.clone().addScaledVector(D,E.spread*.6),R=new Of(x.clone(),L);i.push(xi(R,()=>.004,()=>h,4,4));const k=f.clone();ar(k,h),a.push(Bi(k,L,D,Rn));for(let U=0;U<34;U++){const F=U*2.39996+N,O=.25+(.35+.65*Math.sqrt((U+.5)/34))*.75,W=new y(Math.cos(F)*O,1,Math.sin(F)*O).normalize(),Y=new mt().setFromUnitVectors(Rn,D),j=W.applyQuaternion(Y),ue=.07+t()*.035,H=d.clone();H.scale(1,ue,1);const Z=o.clone().lerp(c,t()*.35);ar(H,Z);const te=new Ve().makeRotationFromQuaternion(new mt().setFromUnitVectors(Rn,j)).setPosition(L);a.push(H.applyMatrix4(te));const he=u.clone();ar(he,l.clone().multiplyScalar(.8+t()*.3)),a.push(he.translate(L.x+j.x*ue,L.y+j.y*ue,L.z+j.z*ue))}}}const m=new me(2375708),_=new me(13816004);for(let E=0;E<7;E++){const x=.42+E/6*.5;n.getPointAt(x,b);const M=E*1.9+.4,N=new y(Math.cos(M),.35,Math.sin(M)).normalize(),P=.3+t()*.08,I=la(P,D=>.065*Math.pow(Math.sin(Math.PI*Math.min(1,D)),.8)*(1-.15*D),m,_,{arch:.12,cup:.18,segs:12,across:4,vein:.18});r.push(Bi(I,b,N,Rn,(t()-.5)*.4))}const S=new on({vertexColors:!0,roughness:.9}),v=new Bt({vertexColors:!0,roughness:.45,sheen:.5,sheenColor:new me(16736352),emissive:2097152}),w=new Bt({vertexColors:!0,roughness:.38,clearcoat:.4,clearcoatRoughness:.35,side:Lt});return[ri("shoot",i,S),ri("buds",a,v),ri("buds",r,w)]}function Vv(s,e){const t=Ln(83),n=Vc(s,e,t),i=new me(4863016),a=[xi(n,m=>.014*(1-m*.5),gr(i),40,6)],r=[],o=[],c=new y,l=[n];for(let m=0;m<5;m++){const _=.25+m*.15;n.getPointAt(_,c);const S=m*2.3+.7,v=new y(Math.cos(S),.7,Math.sin(S)).normalize(),w=new oc(c.clone(),c.clone().addScaledVector(v,.1),c.clone().addScaledVector(v,.2).add(new y(0,.03,0)));a.push(xi(w,E=>.006*(1-E*.5),gr(5913130),10,5)),l.push(w)}const h=new me(3820070),d=new me(5925438),u=new me(16184044),f=new me(5904916);for(const m of l){for(let _=0;_<26;_++){const S=.08+_/26*.9;m.getPointAt(S,c);const v=m.getTangentAt(S),w=_*2.39996,E=new y(Math.cos(w),0,Math.sin(w)).addScaledVector(v,-v.dot(new y(Math.cos(w),0,Math.sin(w)))).normalize(),x=la(.045,M=>.008*Math.sin(Math.PI*Math.min(1,M*1.05))*(1-.5*M),h,d,{segs:4,across:1,arch:.05,cup:.3,vein:.1});o.push(Bi(x,c,E.clone().addScaledVector(v,1.2),Rn))}for(let _=0;_<6;_++){const S=.2+t()*.75;m.getPointAt(S,c);const v=t()*Math.PI*2,w=new y(Math.cos(v),.9,Math.sin(v)).normalize(),E=c.clone().addScaledVector(w,.012);for(let M=0;M<5;M++){const N=la(.032,D=>.017*Math.sqrt(Math.max(0,Math.sin(Math.PI*Math.min(1,D)))),u,u.clone().multiplyScalar(.9),{segs:5,across:3,arch:-.1,cup:.25,vein:0}),P=new mt().setFromUnitVectors(Rn,w),I=new y(Math.cos(M/5*Math.PI*2),.18,Math.sin(M/5*Math.PI*2)).applyQuaternion(P);r.push(Bi(N,E,I,w))}const x=new da(.009,.011,.006,10);ar(x,f),r.push(Bi(x.rotateX(Math.PI/2),E.clone().addScaledVector(w,.002),w,Rn))}}const p=new on({vertexColors:!0,roughness:.9}),b=new Bt({vertexColors:!0,roughness:.5,sheen:.4,sheenColor:new me(16777215),side:Lt}),g=new on({vertexColors:!0,roughness:.55,side:Lt});return[ri("shoot",a,p),ri("buds",r,b),ri("buds",o,g)]}function ar(s,e){const t=s.getAttribute("position").count,n=new Float32Array(t*3);for(let i=0;i<t;i++)n[i*3]=e.r,n[i*3+1]=e.g,n[i*3+2]=e.b;return s.setAttribute("color",new Dt(n,3)),s}function Wv(s,e,t){const n=Math.min(1,Math.max(0,(t-s)/(e-s)));return n*n*(3-2*n)}function qv(s,e,t){const n=new An;n.name=`flora.${s}`;const i=s==="pohutukawa"?Hv(e,t):s==="manuka"?Vv(e,t):Gv(e,t);return n.add(...i),n}function Wh(s,e){s.updateMatrixWorld(!0);const t=s.getObjectByName("shoot"),n=new y(1.07,.11,.26),i=new y(1.41,.7,.09);if(t){const r=t.geometry.getAttribute("position");t.geometry.computeBoundingBox();const o=t.geometry.boundingBox,c=new y,l=new y;let h=0,d=0;const u=new y;for(let f=0;f<r.count;f++)u.fromBufferAttribute(r,f),u.y<o.min.y+.03&&(c.add(u),h++),u.y>o.max.y-.03&&(l.add(u),d++);h&&d&&(n.copy(c.divideScalar(h)).applyMatrix4(t.matrixWorld),i.copy(l.divideScalar(d)).applyMatrix4(t.matrixWorld))}for(const r of["shoot","buds","hairs"]){const o=s.getObjectByName(r);o&&o.removeFromParent()}i.add(new y(.04,.08,-.02));const a=qv(e,n,i);return s.add(a),a}const Xv={deep:[.62,.5,.56],mid:[.82,.72,.74],lite:[.95,.92,.89],bokeh:[.08,.06,.07]},Ui=new y(vi+.1,.55,0),$a={three:{theta:.47,phi:1.43,r:3.6},front:{theta:.02,phi:1.45,r:3.3},side:{theta:-1.4,phi:1.43,r:4.45},back:{theta:Math.PI-.5,phi:1.4,r:3.4}};function Kv(){try{const s=document.createElement("canvas");return!!(s.getContext("webgl2")||s.getContext("webgl"))}catch{return!1}}async function jv(s,e){const t=matchMedia("(pointer: coarse)").matches,n=new S_({canvas:s,antialias:!0,alpha:!0,powerPreference:"high-performance",preserveDrawingBuffer:!!e.still});n.setClearColor(0,0),n.setPixelRatio(Math.min(window.devicePixelRatio||1,t?1.5:2)),n.outputColorSpace=Xt,n.toneMapping=mc,n.toneMappingExposure=1.12,n.shadowMap.enabled=!0,n.shadowMap.type=Xs;const i=new Sl,a=new ln(30,1,.02,120);{const le=new Sl,fe=V_(Xv);fe.material.uniforms.uEnv.value=1,le.add(fe.mesh);const Re=new ca(n);i.environment=Re.fromScene(le,.02).texture,i.environmentIntensity=1.15,Re.dispose(),fe.material.dispose(),fe.mesh.geometry.dispose()}const r=new cp(16774896,5915728,.75),o=new cc(16774378,2.3);o.position.set(-1.3,3.6,1.6),o.castShadow=!0,o.shadow.mapSize.set(t?1024:2048,t?1024:2048),Object.assign(o.shadow.camera,{left:-1.1,right:1.4,bottom:-1,top:1.2,near:.5,far:8}),o.shadow.bias=-.0015,o.shadow.normalBias=.025,o.shadow.radius=4,o.target.position.set(0,.5,0);const c=new cc(16510962,1.25);c.position.set(1.5,1.8,-2.5),c.target.position.set(0,.5,0),i.add(r,o,o.target,c,c.target);let l;try{const le=await Nx(e.perchUrl);Wh(le.group,e.flora),l=le.group}catch{const le=Ix();Wh(le.group,e.flora),l=le.group}i.add(l);const h=Bv[e.bird];if(!h)throw new Error(`no species ${e.bird}`);const d=Pv({species:h});d.root.position.x=vi,d.layer("hop").home=vi,d.setPerch(Cx(l),Kd),t&&(d.feathers.contour.castShadow=!1),e.still&&(d.mind.quiet=!0,d.mind.pinGaze=[-52,8,0]),i.add(d.root);const u=new E_(a,s);u.target.copy(Ui),u.enableDamping=!e.still,u.dampingFactor=.08,u.enablePan=!1,u.minDistance=1.7,u.maxDistance=4.8,u.minPolarAngle=1.05,u.maxPolarAngle=1.85,u.rotateSpeed=.55,u.zoomToCursor=!1,s.style.touchAction="pan-y";const f=new ls;function p(le){const fe=typeof le=="string"?$a[le]:le;f.set(fe.r,fe.phi,fe.theta),a.position.copy(Ui).add(new y().setFromSpherical(f)),a.lookAt(Ui),u.update()}p("three");let b=null;function g(le,fe=!1){const Re=new ls($a[le].r,$a[le].phi,$a[le].theta),ye=new ls().setFromVector3(a.position.clone().sub(Ui)),Ue=Js.euclideanModulo(Re.theta-ye.theta+Math.PI,Math.PI*2)-Math.PI;Re.theta=ye.theta+Ue,fe||V?(p({theta:Re.theta,phi:Re.phi,r:Re.radius}),b=null):b={from:ye,to:Re,t:0},Fe()}function m(le,fe=0){const Re=new ls().setFromVector3(a.position.clone().sub(Ui));Re.theta+=le,Re.radius=Js.clamp(Re.radius*(1+fe),u.minDistance,u.maxDistance),p({theta:Re.theta,phi:Re.phi,r:Re.radius}),b=null,Fe()}const _=d.rig,S=le=>_.rest[le];function v(le,fe){const Re=S(le),ye=fe.clone().sub(Re.worldPos).applyQuaternion(Re.worldQuat.clone().invert());return{bone:le,local:ye}}const w=h,E=new y(0,-Math.sin(w.tail.droop*Math.PI/180),-Math.cos(w.tail.droop*Math.PI/180)),x=le=>({L:le("L"),R:le("R")}),M=S("eye.L").worldPos.clone().add(S("eye.R").worldPos).multiplyScalar(.5),N={eye:x(le=>v(`eye.${le}`,S(`eye.${le}`).worldPos.clone())),forehead:x(()=>v("head",S("bill").worldPos.clone().add(new y(0,.045,-.02)))),crown:x(()=>v("head",M.clone().add(new y(0,.07,-.015)))),ear:x(le=>v("head",S(`eye.${le}`).worldPos.clone().add(new y(le==="L"?.012:-.012,-.004,-.06)))),throat:x(()=>v("gular",S("gular").worldPos.clone().add(new y(0,.01,.045)))),breast:x(()=>v("sternum",S("gular").worldPos.clone().lerp(S("sternum").worldPos,.55).add(new y(0,0,.1)))),shoulder:x(le=>v(`forearm.${le}`,S(`forearm.${le}`).worldPos.clone().lerp(S(`shoulder.${le}`).worldPos,.7).add(new y(le==="L"?.03:-.03,.02,.02)))),wing:x(le=>v(`hand.${le}`,S(`hand.${le}`).worldPos.clone().add(new y(le==="L"?.04:-.04,0,0)))),tail:x(()=>v("tail",S("tail").worldPos.clone().addScaledVector(E,w.tail.length[1]*.75))),feet:x(le=>v(`foot.${le}`,S(`foot.${le}`).worldPos.clone().add(new y(0,.03,.02))))},P=new y,I=new y,D=new y,L=new y,R=new y,k=new y,U=["bill","throat","breast"];function F(le){d.root.updateMatrixWorld(!0),_.bones["eye.L"].getWorldPosition(I),_.bones["eye.R"].getWorldPosition(D);const fe=I.distanceToSquared(a.position)<D.distanceToSquared(a.position)?"L":"R";_.bones.chest.getWorldPosition(k),L.set(0,0,1).transformDirection(d.root.matrixWorld).setY(0).normalize(),R.copy(a.position).sub(k).setY(0).normalize();const Re=L.dot(R)<-.3,ye=s.clientWidth,Ue=s.clientHeight;return le.map(se=>{if(se==="bill")d.billTip(P);else{const tt=N[se][fe];P.copy(tt.local),_.bones[tt.bone].localToWorld(P)}return P.project(a),{id:se,x:(P.x*.5+.5)*ye,y:(-P.y*.5+.5)*Ue,front:!(Re&&U.includes(se))}})}const V=matchMedia("(prefers-reduced-motion: reduce)").matches;let O=!!e.paused||V,W=!0,Y=!0,j=!1;const ue=[],H=new gp;H.connect(document),u.addEventListener("change",()=>Fe());function Z(){const le=s.clientWidth||1,fe=s.clientHeight||1;n.setSize(le,fe,!1),a.aspect=le/fe,a.fov=le/fe<1?30/Math.max(le/fe,.6):30,a.updateProjectionMatrix(),Fe()}new ResizeObserver(Z).observe(s),Z();const te=new y,he=new y(vi,1,0);function Q(){const le=Ui.x-a.position.x;let Re=Ui.z-a.position.z,ye=-le;(ye<0||Math.abs(ye)<.05&&Re>0)&&(Re=-Re,ye=-ye);const Ue=Math.hypot(Re,ye)||1;return te.set(he.x+Re/Ue*2.2,he.y+.1,he.z+ye/Ue*2.2)}function De(le){H.update(le);const fe=H.getDelta(),Re=Math.min(fe,1/20);let ye=!O;if(b){b.t=Math.min(1,b.t+Math.min(fe,.25)/1.1);const se=Js.smootherstep(b.t,0,1);p({theta:b.from.theta+(b.to.theta-b.from.theta)*se,phi:b.from.phi+(b.to.phi-b.from.phi)*se,r:b.from.radius+(b.to.radius-b.from.radius)*se}),b.t>=1&&(b=null),ye=!0}const Ue=u.update();if(O||(d.setAttention(Q()),d.update(Re)),ye||Y||Ue){n.render(i,a),Y=!1;for(const se of ue)se()}!ye&&!b&&!Ue&&be()}function Ye(){j||!W||(j=!0,H.reset(),n.setAnimationLoop(De))}function be(){j&&(j=!1,n.setAnimationLoop(null))}function Fe(){Y=!0,Ye()}new IntersectionObserver(le=>{W=le.some(fe=>fe.isIntersecting),W?Fe():be()}).observe(s);try{await n.compileAsync(i,a)}catch{}return d.update(0),n.render(i,a),Fe(),{renderer:n,scene:i,camera:a,bird:d,reduced:V,anchors:F,goView:g,orbitBy:m,onFrame(le){ue.push(le)},get paused(){return O},setPaused(le){O=le,Fe()},render(){n.render(i,a)},wake:Fe}}export{jv as createViewer,Kv as webglAvailable};
