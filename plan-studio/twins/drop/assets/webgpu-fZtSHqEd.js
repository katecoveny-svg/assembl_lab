import{w as ve,p as W,e as ut,d as A,cg as We,ch as pa,V as G,ci as Te,bH as ys,D as ma,b0 as mi,R as ga,c7 as ai,cj as O,ck as wr,cl as M,cm as vs,cn as bs,co as pt,cp as Qo,cq as jo,u as vt,Z as Le,cr as Go,M as lr,G as Ko,s as E,h as N,b_ as Xo,B as xa,F as Xs,cs as Sr,ct as Re,cu as qe,cv as Tr,cw as Gt,r as B,cx as Yo,cy as dr,v as ya,b4 as Ce,cz as fe,cA as Zo,cB as va,cC as ba,cD as bt,c6 as Jo,cE as el,cF as ge,b9 as xr,cG as tl,cH as is,cI as gi,cJ as de,cK as ae,cL as Be,bc as se,af as tt,aX as oi,b2 as rl,q as wa,cM as Ve,cN as Sa,cO as Ta,a9 as il,cP as xi,ab as Ia,Q as sl,cQ as li,cR as nl,cS as _a,cT as al,cU as ol,cV as Ra,cW as ll,cX as Ys,bW as cl,be as ul,cY as dl,cZ as fl,b3 as ss,c_ as hl,c$ as Ca,d0 as pl,b8 as ml,bZ as Da,d1 as ws,d2 as gl,N as xl,i as yl,a4 as Zs,y as vl,a3 as Js,d3 as bl,d4 as wl,d5 as Sl,d6 as Tl}from"./twin-CMTkDlCU.js";const $a=0,Il=1,Ot=2,fr=0,en=1,tn=2,Ma=3,Pi=1.25,rn=1,ne=32,H=ne/4,Ss=65535,si=Math.pow(2,-24),yr=Symbol("SKIP_GENERATION"),Pa={strategy:$a,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[yr]:!1};function j(a,e,t){return t.min.x=e[a],t.min.y=e[a+1],t.min.z=e[a+2],t.max.x=e[a+3],t.max.y=e[a+4],t.max.z=e[a+5],t}function ns(a){let e=-1,t=-1/0;for(let r=0;r<3;r++){const i=a[r+3]-a[r];i>t&&(t=i,e=r)}return e}function sn(a,e,t){for(let r=0;r<3;r++){const i=e[a+2*r],n=e[a+2*r+1],s=i-n,o=i+n;s<t[r]&&(t[r]=s),o>t[r+3]&&(t[r+3]=o)}}function Bi(a){const e=a[3]-a[0],t=a[4]-a[1],r=a[5]-a[2];return 2*(e*t+t*r+r*e)}function Q(a,e){return e[a+15]===Ss}function J(a,e){return e[a+6]}function ie(a,e){return e[a+14]}function X(a){return a+H}function Y(a,e){const t=e[a+6];return a+t*H}function Ts(a,e){return e[a+7]}function Ai(a,e,t,r,i){let n=1/0,s=1/0,o=1/0,l=-1/0,d=-1/0,c=-1/0,u=1/0,f=1/0,p=1/0,h=-1/0,y=-1/0,x=-1/0;const b=a.offset||0;for(let m=(e-b)*6,v=(e+t-b)*6;m<v;m+=6){const g=a[m+0],w=a[m+1],R=g-w,S=g+w;R<n&&(n=R),S>l&&(l=S),g<u&&(u=g),g>h&&(h=g);const C=a[m+2],D=a[m+3],T=C-D,$=C+D;T<s&&(s=T),$>d&&(d=$),C<f&&(f=C),C>y&&(y=C);const _=a[m+4],P=a[m+5],F=_-P,L=_+P;F<o&&(o=F),L>c&&(c=L),_<p&&(p=_),_>x&&(x=_)}r[0]=n,r[1]=s,r[2]=o,r[3]=l,r[4]=d,r[5]=c,i[0]=u,i[1]=f,i[2]=p,i[3]=h,i[4]=y,i[5]=x}const Pe=8,Is=8,Fi=new Int32Array(Pe),De=new Float32Array(Pe*6),Ct=new Float32Array(Pe*6),be=new Float32Array(6),Cr=new Float32Array(6),Ge=new Int32Array(Is),nn=new Float32Array(Is*6);function _l(a,e,t,r){for(let i=0;i<3;i++){const n=e[a+2*i],s=e[a+2*i+1],o=n-s,l=n+s;o<t[r+i]&&(t[r+i]=o),l>t[r+i+3]&&(t[r+i+3]=l)}}function an(a,e){const t=a[e+3]-a[e],r=a[e+4]-a[e+1],i=a[e+5]-a[e+2];return 2*(t*r+r*i+i*t)}function Rl(a,e,t,r,i,n){let s=-1,o=0;if(n===$a)s=ns(e),s!==-1&&(o=(e[s]+e[s+3])/2);else if(n===Il)s=ns(a),s!==-1&&(o=Cl(t,r,i,s));else if(n===Ot){const l=Bi(a);let d=Pi*i;const c=t.offset||0,u=(r-c)*6,f=(r+i-c)*6;for(let p=0;p<3;p++){const h=e[p],b=(e[p+3]-h)/Pe;if(i<Is){for(let m=0;m<i;m++){const v=u+m*6,g=t[v+2*p];let w=m;for(;w>0&&t[Ge[w-1]+2*p]>g;)Ge[w]=Ge[w-1],w--;Ge[w]=v}for(let m=0;m<3;m++)be[m]=1/0,be[m+3]=-1/0,Cr[m]=1/0,Cr[m+3]=-1/0;for(let m=i-1;m>=0;m--)sn(Ge[m],t,Cr),nn.set(Cr,m*6);for(let m=0;m<i-1;m++){sn(Ge[m],t,be);const v=t[Ge[m+1]+2*p];if(t[Ge[m]+2*p]===v)continue;const g=m+1,w=i-g,R=Bi(be)/l,S=an(nn,g*6)/l,C=rn+Pi*(R*g+S*w);C<d&&(s=p,d=C,o=v)}}else{for(let g=0;g<Pe;g++){Fi[g]=0;for(let w=0;w<3;w++)De[g*6+w]=1/0,De[g*6+w+3]=-1/0}for(let g=u;g<f;g+=6){let S=~~((t[g+2*p]-h)/b);S>=Pe&&(S=Pe-1),Fi[S]++,_l(g,t,De,S*6)}const m=(Pe-1)*6;for(let g=0;g<6;g++)Ct[m+g]=De[m+g];for(let g=Pe-2;g>=0;g--){const w=g*6,R=w+6;for(let S=0;S<3;S++)Ct[w+S]=Math.min(De[w+S],Ct[R+S]),Ct[w+S+3]=Math.max(De[w+S+3],Ct[R+S+3])}let v=0;for(let g=0;g<Pe-1;g++){const w=g*6,R=Fi[g];if(R!==0)for(let $=0;$<3;$++)v===0?(be[$]=De[w+$],be[$+3]=De[w+$+3]):(be[$]=Math.min(be[$],De[w+$]),be[$+3]=Math.max(be[$+3],De[w+$+3]));v+=R;let S=0,C=0;v!==0&&(S=Bi(be)/l);const D=i-v;D!==0&&(C=an(Ct,w+6)/l);const T=rn+Pi*(S*v+C*D);T<d&&(s=p,d=T,o=h+b+g*b)}}}}else console.warn(`BVH: Invalid build strategy value ${n} used.`);return{axis:s,pos:o}}function Cl(a,e,t,r){let i=0;const n=a.offset;for(let s=e,o=e+t;s<o;s++)i+=a[(s-n)*6+r*2];return i/t}function Dl(a,e,t,r,i,n){let s=r,o=r+i-1;const l=n.pos,d=n.axis*2,c=t.offset||0;for(;;){for(;s<=o&&t[(s-c)*6+d]<l;)s++;for(;s<=o&&t[(o-c)*6+d]>=l;)o--;if(s<o){for(let u=0;u<e;u++){let f=a[s*e+u];a[s*e+u]=a[o*e+u],a[o*e+u]=f}for(let u=0;u<6;u++){const f=s-c,p=o-c,h=t[f*6+u];t[f*6+u]=t[p*6+u],t[p*6+u]=h}s++,o--}else return s}}const $l=Math.pow(2,32),Dt=new Float32Array(6),Dr=new Float32Array(6);function Ml(a,e,t,r,i,n){const{maxDepth:s,verbose:o,targetLeafSize:l,_strictLeafSize:d=1/0,strategy:c,onProgress:u,useSharedArrayBuffer:f=!1}=i,p=a.primitiveBuffer,h=a.primitiveBufferStride,y=f?SharedArrayBuffer:ArrayBuffer,x=new y(ne*Math.max(1,2*Math.ceil(r)-1)),b=new Float32Array(x),m=new Uint32Array(x),v=new Uint16Array(x);let g=0,w=!1;return Ai(e,t,r,Dt,Dr),C(t,r,0),x.slice(0,g*ne);function R(D){u&&u((D-n.offset)/n.count)}function S(D,T,$){const _=D*2;m[D+6]=T,v[_+14]=$,v[_+15]=Ss,R(T+$)}function C(D,T,$){const _=g++,P=_*H;b.set(Dt,P),!w&&$>=s&&(w=!0,o&&console.warn(`BVH: Max depth of ${s} reached when generating BVH. Consider increasing maxDepth.`));const F=T>d;if(T<=l&&!F||$>=s){S(P,D,T);return}const L=Rl(Dt,Dr,e,D,T,c);let U=L.axis===-1?-1:Dl(p,h,e,D,T,L);if(L.axis===-1||U===D||U===D+T){if(!F){S(P,D,T);return}L.axis=Math.max(0,ns(Dt)),U=D+Math.max(1,Math.floor(T/2))}m[P+7]=L.axis;const z=U-D;Ai(e,D,z,Dt,Dr),C(D,z,$+1);const Ee=g-_;if(Ee>$l)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");m[P+6]=Ee;const ke=T-z;Ai(e,U,ke,Dt,Dr),C(U,ke,$+1)}}function Pl(a,e){const t=a.getRootRanges(e.range),r=t[0],i=t[t.length-1],n={offset:r.offset,count:i.offset+i.count-r.offset},s=new Float32Array(6*n.count);s.offset=n.offset,a.computePrimitiveBounds(n.offset,n.count,s),a._roots=t.map(o=>Ml(a,s,o.offset,o.count,e,n))}class _s{constructor(e){this._getNewPrimitive=e,this._primitives=[]}getPrimitive(){const e=this._primitives;return e.length===0?this._getNewPrimitive():e.pop()}releasePrimitive(e){this._primitives.push(e)}}class Bl{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;const e=[];let t=null;this.setBuffer=r=>{t&&e.push(t),t=r,this.float32Array=new Float32Array(r),this.uint16Array=new Uint16Array(r),this.uint32Array=new Uint32Array(r)},this.clearBuffer=()=>{t=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,e.length!==0&&this.setBuffer(e.pop())}}}const V=new Bl;let Je,Ht;const $t=[],$r=new _s(()=>new ve);function Al(a,e,t,r,i,n){Je=$r.getPrimitive(),Ht=$r.getPrimitive(),$t.push(Je,Ht),V.setBuffer(a._roots[e]);const s=as(0,a.geometry,t,r,i,n);V.clearBuffer(),$r.releasePrimitive(Je),$r.releasePrimitive(Ht),$t.pop(),$t.pop();const o=$t.length;return o>0&&(Ht=$t[o-1],Je=$t[o-2]),s}function as(a,e,t,r,i=null,n=0,s=0){const{float32Array:o,uint16Array:l,uint32Array:d}=V;let c=a*2;if(Q(c,l)){const f=J(a,d),p=ie(c,l);return j(a,o,Je),r(f,p,!1,s,n+a/H,Je)}else{let T=function(_){const{uint16Array:P,uint32Array:F}=V;let L=_*2;for(;!Q(L,P);)_=X(_),L=_*2;return J(_,F)},$=function(_){const{uint16Array:P,uint32Array:F}=V;let L=_*2;for(;!Q(L,P);)_=Y(_,F),L=_*2;return J(_,F)+ie(L,P)};const f=X(a),p=Y(a,d);let h=f,y=p,x,b,m,v;if(i&&(m=Je,v=Ht,j(h,o,m),j(y,o,v),x=i(m),b=i(v),b<x)){h=p,y=f;const _=x;x=b,b=_,m=v}m||(m=Je,j(h,o,m));const g=Q(h*2,l),w=t(m,g,x,s+1,n+h/H);let R;if(w===tn){const _=T(h),F=$(h)-_;R=r(_,F,!0,s+1,n+h/H,m)}else R=w&&as(h,e,t,r,i,n,s+1);if(R)return!0;v=Ht,j(y,o,v);const S=Q(y*2,l),C=t(v,S,b,s+1,n+y/H);let D;if(C===tn){const _=T(y),F=$(y)-_;D=r(_,F,!0,s+1,n+y/H,v)}else D=C&&as(y,e,t,r,i,n,s+1);return!!D}}const hr=new V.constructor,ci=new V.constructor,Ye=new _s(()=>new ve),Mt=new ve,Pt=new ve,Ni=new ve,Li=new ve;let zi=!1;function Fl(a,e,t,r){if(zi)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");zi=!0;const i=a._roots,n=e._roots;let s,o=0,l=0;const d=new W().copy(t).invert();for(let c=0,u=i.length;c<u;c++){hr.setBuffer(i[c]),l=0;const f=Ye.getPrimitive();j(0,hr.float32Array,f),f.applyMatrix4(d);for(let p=0,h=n.length;p<h&&(ci.setBuffer(n[p]),s=Se(0,0,t,d,r,o,l,0,0,f),ci.clearBuffer(),l+=n[p].byteLength/ne,!s);p++);if(Ye.releasePrimitive(f),hr.clearBuffer(),o+=i[c].byteLength/ne,s)break}return zi=!1,s}function Se(a,e,t,r,i,n=0,s=0,o=0,l=0,d=null,c=!1){let u,f;c?(u=ci,f=hr):(u=hr,f=ci);const p=u.float32Array,h=u.uint32Array,y=u.uint16Array,x=f.float32Array,b=f.uint32Array,m=f.uint16Array,v=a*2,g=e*2,w=Q(v,y),R=Q(g,m);let S=!1;if(R&&w)c?S=i(J(e,b),ie(e*2,m),J(a,h),ie(a*2,y),l,s+e/H,o,n+a/H):S=i(J(a,h),ie(a*2,y),J(e,b),ie(e*2,m),o,n+a/H,l,s+e/H);else if(R){const C=Ye.getPrimitive();j(e,x,C),C.applyMatrix4(t);const D=X(a),T=Y(a,h);j(D,p,Mt),j(T,p,Pt);const $=C.intersectsBox(Mt),_=C.intersectsBox(Pt);S=$&&Se(e,D,r,t,i,s,n,l,o+1,C,!c)||_&&Se(e,T,r,t,i,s,n,l,o+1,C,!c),Ye.releasePrimitive(C)}else{const C=X(e),D=Y(e,b);j(C,x,Ni),j(D,x,Li);const T=d.intersectsBox(Ni),$=d.intersectsBox(Li);if(T&&$)S=Se(a,C,t,r,i,n,s,o,l+1,d,c)||Se(a,D,t,r,i,n,s,o,l+1,d,c);else if(T)if(w)S=Se(a,C,t,r,i,n,s,o,l+1,d,c);else{const _=Ye.getPrimitive();_.copy(Ni).applyMatrix4(t);const P=X(a),F=Y(a,h);j(P,p,Mt),j(F,p,Pt);const L=_.intersectsBox(Mt),U=_.intersectsBox(Pt);S=L&&Se(C,P,r,t,i,s,n,l,o+1,_,!c)||U&&Se(C,F,r,t,i,s,n,l,o+1,_,!c),Ye.releasePrimitive(_)}else if($)if(w)S=Se(a,D,t,r,i,n,s,o,l+1,d,c);else{const _=Ye.getPrimitive();_.copy(Li).applyMatrix4(t);const P=X(a),F=Y(a,h);j(P,p,Mt),j(F,p,Pt);const L=_.intersectsBox(Mt),U=_.intersectsBox(Pt);S=L&&Se(D,P,r,t,i,s,n,l,o+1,_,!c)||U&&Se(D,F,r,t,i,s,n,l,o+1,_,!c),Ye.releasePrimitive(_)}}return S}const Ze=new class{constructor(){let a=null,e=null,t=null,r=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(n,s)=>{if(r)throw new Error("BVHTraversalHelper: cannot call setBVH during an active traversal.");this.root=s,this.buffer=a=n._roots[s],this.uint16Array=t=new Uint16Array(a),this.uint32Array=e=new Uint32Array(a)},this.reset=()=>{this.root=null,this.buffer=a=null,this.uint16Array=t=null,this.uint32Array=e=null},this.getRangeStart=n=>{let s=n*2;for(;!Q(s,t);)n=X(n),s=n*2;return J(n,e)},this.getRangeEnd=n=>{let s=n*2;for(;!Q(s,t);)n=Y(n,e),s=n*2;return J(n,e)+ie(s,t)};const i=(n,s,o)=>{const l=s*2,d=Q(l,t);if(!n(o,d,s)&&!d){const u=X(s),f=Y(s,e);i(n,u,o+1),i(n,f,o+1)}};this.traverseBuffer=n=>{if(r)throw new Error("BVHTraversalHelper: cannot start a traversal during an active traversal.");r=!0;try{i(n,0,0)}finally{r=!1}},this.traverse=n=>{this.traverseBuffer((s,o,l)=>{if(o){const d=l*2,c=e[l+6],u=t[d+14];return n(s,o,new Float32Array(a,l*4,6),c,u)}else{const d=Ts(l,e);return n(s,o,new Float32Array(a,l*4,6),d)}})}}},on=new ve,Bt=new Float32Array(6);class Ba{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(e){e={...Pa,...e},"maxLeafSize"in e&&(console.warn('BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.'),e={...e,targetLeafSize:e.maxLeafSize}),Pl(this,e)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(e,t,r,i){let n=1/0,s=1/0,o=1/0,l=-1/0,d=-1/0,c=-1/0;for(let u=e,f=e+t;u<f;u++){this.writePrimitiveBounds(u,Bt,0);const[p,h,y,x,b,m]=Bt;p<n&&(n=p),x>l&&(l=x),h<s&&(s=h),b>d&&(d=b),y<o&&(o=y),m>c&&(c=m)}return r[i+0]=n,r[i+1]=s,r[i+2]=o,r[i+3]=l,r[i+4]=d,r[i+5]=c,r}computePrimitiveBounds(e,t,r){const i=r.offset||0;for(let n=e,s=e+t;n<s;n++){this.writePrimitiveBounds(n,Bt,0);const[o,l,d,c,u,f]=Bt,p=(o+c)/2,h=(l+u)/2,y=(d+f)/2,x=(c-o)/2,b=(u-l)/2,m=(f-d)/2,v=(n-i)*6;r[v+0]=p,r[v+1]=x+(Math.abs(p)+x)*si,r[v+2]=h,r[v+3]=b+(Math.abs(h)+b)*si,r[v+4]=y,r[v+5]=m+(Math.abs(y)+m)*si}return r}shiftPrimitiveOffsets(e){const t=this._indirectBuffer;if(t)for(let r=0,i=t.length;r<i;r++)t[r]+=e;else{const r=this._roots;for(let i=0;i<r.length;i++){const n=r[i],s=new Uint32Array(n),o=new Uint16Array(n),l=n.byteLength/ne;for(let d=0;d<l;d++){const c=H*d,u=2*c;Q(u,o)&&(s[c+6]+=e)}}}}traverse(e,t=0){Ze.setBVH(this,t),Ze.traverse(e),Ze.reset()}refit(){const e=this._roots;for(let t=0,r=e.length;t<r;t++){const i=e[t],n=new Uint32Array(i),s=new Uint16Array(i),o=new Float32Array(i),l=i.byteLength/ne;for(let d=l-1;d>=0;d--){const c=d*H,u=c*2;if(Q(u,s)){const p=J(c,n),h=ie(u,s);this.writePrimitiveRangeBounds(p,h,Bt,0),o.set(Bt,c)}else{const p=X(c),h=Y(c,n);for(let y=0;y<3;y++){const x=o[p+y],b=o[p+y+3],m=o[h+y],v=o[h+y+3];o[c+y]=x<m?x:m,o[c+y+3]=b>v?b:v}}}}}getBoundingBox(e){return e.makeEmpty(),this._roots.forEach(r=>{j(0,new Float32Array(r),on),e.union(on)}),e}shapecast(e){let{boundsTraverseOrder:t,intersectsBounds:r,intersectsRange:i,intersectsPrimitive:n,scratchPrimitive:s,iterate:o}=e;if(i&&n){const u=i;i=(f,p,h,y,x)=>u(f,p,h,y,x)?!0:o(f,p,this,n,h,y,s)}else i||(n?i=(u,f,p,h)=>o(u,f,this,n,p,h,s):i=(u,f,p)=>p);let l=!1,d=0;const c=this._roots;for(let u=0,f=c.length;u<f;u++){const p=c[u];if(l=Al(this,u,r,i,t,d),l)break;d+=p.byteLength/ne}return l}bvhcast(e,t,r){let{intersectsRanges:i}=r;return Fl(this,e,t,i)}}function Nl(){return typeof SharedArrayBuffer<"u"}function Rs(a){return a.index?a.index.count:a.attributes.position.count}function yi(a){return Rs(a)/3}function Ll(a,e=ArrayBuffer){return a>65535?new Uint32Array(new e(4*a)):new Uint16Array(new e(2*a))}function zl(a,e){if(!a.index){const t=a.attributes.position.count,r=e.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,i=Ll(t,r);a.setIndex(new ut(i,1));for(let n=0;n<t;n++)i[n]=n}}function El(a,e,t){const r=Rs(a)/t,i=e||a.drawRange,n=i.start/t,s=(i.start+i.count)/t,o=Math.max(0,n),l=Math.min(r,s)-o;return{offset:Math.floor(o),count:Math.floor(l)}}function kl(a,e){return a.groups.map(t=>({offset:t.start/e,count:t.count/e}))}function ln(a,e,t){const r=El(a,e,t),i=kl(a,t);if(!i.length)return[r];const n=[],s=r.offset,o=r.offset+r.count,l=Rs(a)/t,d=[];for(const f of i){const{offset:p,count:h}=f,y=p,x=isFinite(h)?h:l-p,b=p+x;y<o&&b>s&&(d.push({pos:Math.max(s,y),isStart:!0}),d.push({pos:Math.min(o,b),isStart:!1}))}d.sort((f,p)=>f.pos!==p.pos?f.pos-p.pos:f.type==="end"?-1:1);let c=0,u=null;for(const f of d){const p=f.pos;c!==0&&p!==u&&n.push({offset:u,count:p-u}),c+=f.isStart?1:-1,u=p}return n}function Hl(a,e){const t=a[a.length-1],r=t.offset+t.count>2**16,i=a.reduce((d,c)=>d+c.count,0),n=r?4:2,s=e?new SharedArrayBuffer(i*n):new ArrayBuffer(i*n),o=r?new Uint32Array(s):new Uint16Array(s);let l=0;for(let d=0;d<a.length;d++){const{offset:c,count:u}=a[d];for(let f=0;f<u;f++)o[l+f]=c+f;l+=u}return o}class ui extends Ba{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(e){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(e){}constructor(e,t={}){if(e.isBufferGeometry){if(e.index&&e.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(t.useSharedArrayBuffer&&!Nl())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=e,this.resolvePrimitiveIndex=t.indirect?r=>this._indirectBuffer[r]:r=>r,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,t={...Pa,...t},t[yr]||this.init(t)}init(e){const{geometry:t,primitiveStride:r}=this;if(e.indirect){const i=ln(t,e.range,r),n=Hl(i,e.useSharedArrayBuffer);this._indirectBuffer=n}else zl(t,e);super.init(e),!t.boundingBox&&e.setBoundingBox&&(t.boundingBox=this.getBoundingBox(new ve))}getRootRanges(e){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:ln(this.geometry,e,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}}class Qe{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(e,t){let r=1/0,i=-1/0;for(let n=0,s=e.length;n<s;n++){const l=e[n][t];r=l<r?l:r,i=l>i?l:i}this.min=r,this.max=i}setFromPoints(e,t){let r=1/0,i=-1/0;for(let n=0,s=t.length;n<s;n++){const o=t[n],l=e.dot(o);r=l<r?l:r,i=l>i?l:i}this.min=r,this.max=i}isSeparated(e){return this.min>e.max||e.min>this.max}}Qe.prototype.setFromBox=(function(){const a=new A;return function(t,r){const i=r.min,n=r.max;let s=1/0,o=-1/0;for(let l=0;l<=1;l++)for(let d=0;d<=1;d++)for(let c=0;c<=1;c++){a.x=i.x*l+n.x*(1-l),a.y=i.y*d+n.y*(1-d),a.z=i.z*c+n.z*(1-c);const u=t.dot(a);s=Math.min(u,s),o=Math.max(u,o)}this.min=s,this.max=o}})();const Ul=(function(){const a=new A,e=new A,t=new A;return function(i,n,s){const o=i.start,l=a,d=n.start,c=e;t.subVectors(o,d),a.subVectors(i.end,i.start),e.subVectors(n.end,n.start);const u=t.dot(c),f=c.dot(l),p=c.dot(c),h=t.dot(l),x=l.dot(l)*p-f*f;let b,m;x!==0?b=(u*f-h*p)/x:b=0,m=(u+b*f)/p,s.x=b,s.y=m}})(),Cs=(function(){const a=new G,e=new A,t=new A;return function(i,n,s,o){Ul(i,n,a);let l=a.x,d=a.y;if(l>=0&&l<=1&&d>=0&&d<=1){i.at(l,s),n.at(d,o);return}else if(l>=0&&l<=1){d<0?n.at(0,o):n.at(1,o),i.closestPointToPoint(o,!0,s);return}else if(d>=0&&d<=1){l<0?i.at(0,s):i.at(1,s),n.closestPointToPoint(s,!0,o);return}else{let c;l<0?c=i.start:c=i.end;let u;d<0?u=n.start:u=n.end;const f=e,p=t;if(i.closestPointToPoint(u,!0,e),n.closestPointToPoint(c,!0,t),f.distanceToSquared(u)<=p.distanceToSquared(c)){s.copy(f),o.copy(u);return}else{s.copy(c),o.copy(p);return}}}})(),Vl=(function(){const a=new A,e=new A,t=new pa,r=new We;return function(n,s){const{radius:o,center:l}=n,{a:d,b:c,c:u}=s;if(r.start=d,r.end=c,r.closestPointToPoint(l,!0,a).distanceTo(l)<=o||(r.start=d,r.end=u,r.closestPointToPoint(l,!0,a).distanceTo(l)<=o)||(r.start=c,r.end=u,r.closestPointToPoint(l,!0,a).distanceTo(l)<=o))return!0;const y=s.getPlane(t);if(Math.abs(y.distanceToPoint(l))<=o){const b=y.projectPoint(l,e);if(s.containsPoint(b))return!0}return!1}})(),Ol=["x","y","z"],Ue=1e-15,cn=Ue*Ue;function pe(a){return Math.abs(a)<Ue}class xe extends Te{constructor(...e){super(...e),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new A),this.satBounds=new Array(4).fill().map(()=>new Qe),this.points=[this.a,this.b,this.c],this.plane=new pa,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new We,this.needsUpdate=!0}intersectsSphere(e){return Vl(e,this)}update(){const e=this.a,t=this.b,r=this.c,i=this.points,n=this.satAxes,s=this.satBounds,o=n[0],l=s[0];this.getNormal(o),l.setFromPoints(o,i);const d=n[1],c=s[1];d.subVectors(e,t),c.setFromPoints(d,i);const u=n[2],f=s[2];u.subVectors(t,r),f.setFromPoints(u,i);const p=n[3],h=s[3];p.subVectors(r,e),h.setFromPoints(p,i);const y=d.length(),x=u.length(),b=p.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,y<Ue?x<Ue||b<Ue?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(r)):x<Ue?b<Ue?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(e)):b<Ue&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(r),this.degenerateSegment.end.copy(t)),this.plane.setFromNormalAndCoplanarPoint(o,e),this.needsUpdate=!1}}xe.prototype.closestPointToSegment=(function(){const a=new A,e=new A,t=new We;return function(i,n=null,s=null){this.needsUpdate&&this.update();const{start:o,end:l}=i,d=this.points;let c,u=1/0;const f=this.plane.distanceToPoint(o),p=this.plane.distanceToPoint(l);if(f*p<0&&this.plane.intersectLine(i,a)!==null&&this.containsPoint(a))return n&&n.copy(a),s&&s.copy(a),0;for(let h=0;h<3;h++){const y=(h+1)%3;t.start.copy(d[h]),t.end.copy(d[y]),Cs(t,i,a,e),c=a.distanceToSquared(e),c<u&&(u=c,n&&n.copy(a),s&&s.copy(e))}return this.closestPointToPoint(o,a),c=o.distanceToSquared(a),c<u&&(u=c,n&&n.copy(a),s&&s.copy(o)),this.closestPointToPoint(l,a),c=l.distanceToSquared(a),c<u&&(u=c,n&&n.copy(a),s&&s.copy(l)),Math.sqrt(u)}})();xe.prototype.intersectsTriangle=(function(){const a=new xe,e=new Qe,t=new Qe,r=new A,i=new A,n=new A,s=new A,o=new We,l=new We,d=new A,c=new G,u=new G;function f(v,g,w,R){const S=r;!v.isDegenerateIntoPoint&&!v.isDegenerateIntoSegment?S.copy(v.plane.normal):S.copy(g.plane.normal);const C=v.satBounds,D=v.satAxes;for(let _=1;_<4;_++){const P=C[_],F=D[_];if(e.setFromPoints(F,g.points),P.isSeparated(e)||(s.copy(S).cross(F),e.setFromPoints(s,v.points),t.setFromPoints(s,g.points),e.isSeparated(t)))return!1}const T=g.satBounds,$=g.satAxes;for(let _=1;_<4;_++){const P=T[_],F=$[_];if(e.setFromPoints(F,v.points),P.isSeparated(e)||(s.crossVectors(S,F),e.setFromPoints(s,v.points),t.setFromPoints(s,g.points),e.isSeparated(t)))return!1}return w&&(R||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),w.start.set(0,0,0),w.end.set(0,0,0)),!0}function p(v,g,w,R,S,C,D,T,$,_,P){let F=D/(D-T);_.x=R+(S-R)*F,P.start.subVectors(g,v).multiplyScalar(F).add(v),F=D/(D-$),_.y=R+(C-R)*F,P.end.subVectors(w,v).multiplyScalar(F).add(v)}function h(v,g,w,R,S,C,D,T,$,_,P){if(S>0)p(v.c,v.a,v.b,R,g,w,$,D,T,_,P);else if(C>0)p(v.b,v.a,v.c,w,g,R,T,D,$,_,P);else if(T*$>0||D!=0)p(v.a,v.b,v.c,g,w,R,D,T,$,_,P);else if(T!=0)p(v.b,v.a,v.c,w,g,R,T,D,$,_,P);else if($!=0)p(v.c,v.a,v.b,R,g,w,$,D,T,_,P);else return!0;return!1}function y(v,g,w,R){const S=g.degenerateSegment,C=v.plane.distanceToPoint(S.start),D=v.plane.distanceToPoint(S.end);return pe(C)?pe(D)?f(v,g,w,R):(w&&(w.start.copy(S.start),w.end.copy(S.start)),v.containsPoint(S.start)):pe(D)?(w&&(w.start.copy(S.end),w.end.copy(S.end)),v.containsPoint(S.end)):v.plane.intersectLine(S,r)!=null?(w&&(w.start.copy(r),w.end.copy(r)),v.containsPoint(r)):!1}function x(v,g,w){const R=g.a;return pe(v.plane.distanceToPoint(R))&&v.containsPoint(R)?(w&&(w.start.copy(R),w.end.copy(R)),!0):!1}function b(v,g,w){const R=v.degenerateSegment,S=g.a;return R.closestPointToPoint(S,!0,r),S.distanceToSquared(r)<cn?(w&&(w.start.copy(S),w.end.copy(S)),!0):!1}function m(v,g,w,R){if(v.isDegenerateIntoSegment)if(g.isDegenerateIntoSegment){const S=v.degenerateSegment,C=g.degenerateSegment,D=i,T=n;S.delta(D),C.delta(T);const $=r.subVectors(C.start,S.start),_=D.x*T.y-D.y*T.x;if(pe(_))return!1;const P=($.x*T.y-$.y*T.x)/_,F=-(D.x*$.y-D.y*$.x)/_;if(P<0||P>1||F<0||F>1)return!1;const L=S.start.z+D.z*P,U=C.start.z+T.z*F;return pe(L-U)?(w&&(w.start.copy(S.start).addScaledVector(D,P),w.end.copy(S.start).addScaledVector(D,P)),!0):!1}else return g.isDegenerateIntoPoint?b(v,g,w):y(g,v,w,R);else{if(v.isDegenerateIntoPoint)return g.isDegenerateIntoPoint?g.a.distanceToSquared(v.a)<cn?(w&&(w.start.copy(v.a),w.end.copy(v.a)),!0):!1:g.isDegenerateIntoSegment?b(g,v,w):x(g,v,w);if(g.isDegenerateIntoPoint)return x(v,g,w);if(g.isDegenerateIntoSegment)return y(v,g,w,R)}}return function(g,w=null,R=!1){this.needsUpdate&&this.update(),g.isExtendedTriangle?g.needsUpdate&&g.update():(a.copy(g),a.update(),g=a);const S=m(this,g,w,R);if(S!==void 0)return S;const C=this.plane,D=g.plane;let T=D.distanceToPoint(this.a),$=D.distanceToPoint(this.b),_=D.distanceToPoint(this.c);pe(T)&&(T=0),pe($)&&($=0),pe(_)&&(_=0);const P=T*$,F=T*_;if(P>0&&F>0)return!1;let L=C.distanceToPoint(g.a),U=C.distanceToPoint(g.b),z=C.distanceToPoint(g.c);pe(L)&&(L=0),pe(U)&&(U=0),pe(z)&&(z=0);const Ee=L*U,ke=L*z;if(Ee>0&&ke>0)return!1;i.copy(C.normal),n.copy(D.normal);const Tt=i.cross(n);let Kt=0,Xt=Math.abs(Tt.x);const Yt=Math.abs(Tt.y);Yt>Xt&&(Xt=Yt,Kt=1),Math.abs(Tt.z)>Xt&&(Kt=2);const le=Ol[Kt],it=this.a[le],_t=this.b[le],Rr=this.c[le],st=g.a[le],Rt=g.b[le],qo=g.c[le];if(h(this,it,_t,Rr,P,F,T,$,_,c,o))return f(this,g,w,R);if(h(g,st,Rt,qo,Ee,ke,L,U,z,u,l))return f(this,g,w,R);if(c.y<c.x){const Mi=c.y;c.y=c.x,c.x=Mi,d.copy(o.start),o.start.copy(o.end),o.end.copy(d)}if(u.y<u.x){const Mi=u.y;u.y=u.x,u.x=Mi,d.copy(l.start),l.start.copy(l.end),l.end.copy(d)}return c.y<u.x||u.y<c.x?!1:(w&&(u.x>c.x?w.start.copy(l.start):w.start.copy(o.start),u.y<c.y?w.end.copy(l.end):w.end.copy(o.end)),!0)}})();xe.prototype.distanceToPoint=(function(){const a=new A;return function(t){return this.closestPointToPoint(t,a),t.distanceTo(a)}})();xe.prototype.distanceToTriangle=(function(){const a=new A,e=new A,t=["a","b","c"],r=new We,i=new We;return function(s,o=null,l=null){const d=o||l?r:null;if(this.intersectsTriangle(s,d,!0))return(o||l)&&(o&&d.getCenter(o),l&&d.getCenter(l)),0;let c=1/0;for(let u=0;u<3;u++){let f;const p=t[u],h=s[p];this.closestPointToPoint(h,a),f=h.distanceToSquared(a),f<c&&(c=f,o&&o.copy(a),l&&l.copy(h));const y=this[p];s.closestPointToPoint(y,a),f=y.distanceToSquared(a),f<c&&(c=f,o&&o.copy(y),l&&l.copy(a))}for(let u=0;u<3;u++){const f=t[u],p=t[(u+1)%3];r.set(this[f],this[p]);for(let h=0;h<3;h++){const y=t[h],x=t[(h+1)%3];i.set(s[y],s[x]),Cs(r,i,a,e);const b=a.distanceToSquared(e);b<c&&(c=b,o&&o.copy(a),l&&l.copy(e))}}return Math.sqrt(c)}})();class oe{constructor(e,t,r){this.isOrientedBox=!0,this.min=new A,this.max=new A,this.matrix=new W,this.invMatrix=new W,this.points=new Array(8).fill().map(()=>new A),this.satAxes=new Array(3).fill().map(()=>new A),this.satBounds=new Array(3).fill().map(()=>new Qe),this.alignedSatBounds=new Array(3).fill().map(()=>new Qe),this.needsUpdate=!1,e&&this.min.copy(e),t&&this.max.copy(t),r&&this.matrix.copy(r)}set(e,t,r){this.min.copy(e),this.max.copy(t),this.matrix.copy(r),this.needsUpdate=!0}copy(e){this.min.copy(e.min),this.max.copy(e.max),this.matrix.copy(e.matrix),this.needsUpdate=!0}}oe.prototype.update=(function(){return function(){const e=this.matrix,t=this.min,r=this.max,i=this.points;for(let d=0;d<=1;d++)for(let c=0;c<=1;c++)for(let u=0;u<=1;u++){const f=1*d|2*c|4*u,p=i[f];p.x=d?r.x:t.x,p.y=c?r.y:t.y,p.z=u?r.z:t.z,p.applyMatrix4(e)}const n=this.satBounds,s=this.satAxes,o=i[0];for(let d=0;d<3;d++){const c=s[d],u=n[d],f=1<<d,p=i[f];c.subVectors(o,p),u.setFromPoints(c,i)}const l=this.alignedSatBounds;l[0].setFromPointsField(i,"x"),l[1].setFromPointsField(i,"y"),l[2].setFromPointsField(i,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();oe.prototype.intersectsBox=(function(){const a=new Qe;return function(t){this.needsUpdate&&this.update();const r=t.min,i=t.max,n=this.satBounds,s=this.satAxes,o=this.alignedSatBounds;if(a.min=r.x,a.max=i.x,o[0].isSeparated(a)||(a.min=r.y,a.max=i.y,o[1].isSeparated(a))||(a.min=r.z,a.max=i.z,o[2].isSeparated(a)))return!1;for(let l=0;l<3;l++){const d=s[l],c=n[l];if(a.setFromBox(d,t),c.isSeparated(a))return!1}return!0}})();oe.prototype.intersectsTriangle=(function(){const a=new xe,e=new Array(3),t=new Qe,r=new Qe,i=new A;return function(s){this.needsUpdate&&this.update(),s.isExtendedTriangle?s.needsUpdate&&s.update():(a.copy(s),a.update(),s=a);const o=this.satBounds,l=this.satAxes;e[0]=s.a,e[1]=s.b,e[2]=s.c;for(let f=0;f<3;f++){const p=o[f],h=l[f];if(t.setFromPoints(h,e),p.isSeparated(t))return!1}const d=s.satBounds,c=s.satAxes,u=this.points;for(let f=0;f<3;f++){const p=d[f],h=c[f];if(t.setFromPoints(h,u),p.isSeparated(t))return!1}for(let f=0;f<3;f++){const p=l[f];for(let h=0;h<4;h++){const y=c[h];if(i.crossVectors(p,y),t.setFromPoints(i,e),r.setFromPoints(i,u),t.isSeparated(r))return!1}}return!0}})();oe.prototype.closestPointToPoint=(function(){return function(e,t){return this.needsUpdate&&this.update(),t.copy(e).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),t}})();oe.prototype.distanceToPoint=(function(){const a=new A;return function(t){return this.closestPointToPoint(t,a),t.distanceTo(a)}})();oe.prototype.distanceToBox=(function(){const a=["x","y","z"],e=new Array(12).fill().map(()=>new We),t=new Array(12).fill().map(()=>new We),r=new A,i=new A;return function(s,o=0,l=null,d=null){if(this.needsUpdate&&this.update(),this.intersectsBox(s))return(l||d)&&(s.getCenter(i),this.closestPointToPoint(i,r),s.closestPointToPoint(r,i),l&&l.copy(r),d&&d.copy(i)),0;const c=o*o,u=s.min,f=s.max,p=this.points;let h=1/0;for(let x=0;x<8;x++){const b=p[x];i.copy(b).clamp(u,f);const m=b.distanceToSquared(i);if(m<h&&(h=m,l&&l.copy(b),d&&d.copy(i),m<c))return Math.sqrt(m)}let y=0;for(let x=0;x<3;x++)for(let b=0;b<=1;b++)for(let m=0;m<=1;m++){const v=(x+1)%3,g=(x+2)%3,w=b<<v|m<<g,R=1<<x|b<<v|m<<g,S=p[w],C=p[R];e[y].set(S,C);const T=a[x],$=a[v],_=a[g],P=t[y],F=P.start,L=P.end;F[T]=u[T],F[$]=b?u[$]:f[$],F[_]=m?u[_]:f[_],L[T]=f[T],L[$]=b?u[$]:f[$],L[_]=m?u[_]:f[_],y++}for(let x=0;x<=1;x++)for(let b=0;b<=1;b++)for(let m=0;m<=1;m++){i.x=x?f.x:u.x,i.y=b?f.y:u.y,i.z=m?f.z:u.z,this.closestPointToPoint(i,r);const v=i.distanceToSquared(r);if(v<h&&(h=v,l&&l.copy(r),d&&d.copy(i),v<c))return Math.sqrt(v)}for(let x=0;x<12;x++){const b=e[x];for(let m=0;m<12;m++){const v=t[m];Cs(b,v,r,i);const g=r.distanceToSquared(i);if(g<h&&(h=g,l&&l.copy(r),d&&d.copy(i),g<c))return Math.sqrt(g)}}return Math.sqrt(h)}})();class Wl extends _s{constructor(){super(()=>new xe)}}const me=new Wl,Zt=new A,Ei=new A;function ql(a,e,t={},r=0,i=1/0){const n=r*r,s=i*i;let o=1/0,l=null;if(a.shapecast({boundsTraverseOrder:c=>(Zt.copy(e).clamp(c.min,c.max),Zt.distanceToSquared(e)),intersectsBounds:(c,u,f)=>f<o&&f<s,intersectsTriangle:(c,u)=>{c.closestPointToPoint(e,Zt);const f=e.distanceToSquared(Zt);return f<o&&(Ei.copy(Zt),o=f,l=u),f<n}}),o===1/0)return null;const d=Math.sqrt(o);return t.point?t.point.copy(Ei):t.point=Ei.clone(),t.distance=d,t.faceIndex=l,t}const Mr=parseInt(mi)>=169,Ql=parseInt(mi)<=161,nt=new A,at=new A,ot=new A,Pr=new G,Br=new G,Ar=new G,un=new A,dn=new A,fn=new A,Jt=new A;function jl(a,e,t,r,i,n,s,o){let l;if(n===ys?l=a.intersectTriangle(r,t,e,!0,i):l=a.intersectTriangle(e,t,r,n!==ma,i),l===null)return null;const d=a.origin.distanceTo(i);return d<s||d>o?null:{distance:d,point:i.clone()}}function hn(a,e,t,r,i,n,s,o,l,d,c){nt.fromBufferAttribute(e,n),at.fromBufferAttribute(e,s),ot.fromBufferAttribute(e,o);const u=jl(a,nt,at,ot,Jt,l,d,c);if(u){if(r){Pr.fromBufferAttribute(r,n),Br.fromBufferAttribute(r,s),Ar.fromBufferAttribute(r,o),u.uv=new G;const p=Te.getInterpolation(Jt,nt,at,ot,Pr,Br,Ar,u.uv);Mr||(u.uv=p)}if(i){Pr.fromBufferAttribute(i,n),Br.fromBufferAttribute(i,s),Ar.fromBufferAttribute(i,o),u.uv1=new G;const p=Te.getInterpolation(Jt,nt,at,ot,Pr,Br,Ar,u.uv1);Mr||(u.uv1=p),Ql&&(u.uv2=u.uv1)}if(t){un.fromBufferAttribute(t,n),dn.fromBufferAttribute(t,s),fn.fromBufferAttribute(t,o),u.normal=new A;const p=Te.getInterpolation(Jt,nt,at,ot,un,dn,fn,u.normal);u.normal.dot(a.direction)>0&&u.normal.multiplyScalar(-1),Mr||(u.normal=p)}const f={a:n,b:s,c:o,normal:new A,materialIndex:0};if(Te.getNormal(nt,at,ot,f.normal),u.face=f,u.faceIndex=n,Mr){const p=new A;Te.getBarycoord(Jt,nt,at,ot,p),u.barycoord=p}}return u}function pn(a){return a&&a.isMaterial?a.side:a}function vi(a,e,t,r,i,n,s){const o=r*3;let l=o+0,d=o+1,c=o+2;const{index:u,groups:f}=a;a.index&&(l=u.getX(l),d=u.getX(d),c=u.getX(c));const{position:p,normal:h,uv:y,uv1:x}=a.attributes;if(Array.isArray(e)){const b=r*3;for(let m=0,v=f.length;m<v;m++){const{start:g,count:w,materialIndex:R}=f[m];if(b>=g&&b<g+w){const S=pn(e[R]),C=hn(t,p,h,y,x,l,d,c,S,n,s);if(C)if(C.faceIndex=r,C.face.materialIndex=R,i)i.push(C);else return C}}}else{const b=pn(e),m=hn(t,p,h,y,x,l,d,c,b,n,s);if(m)if(m.faceIndex=r,m.face.materialIndex=0,i)i.push(m);else return m}return null}function Z(a,e,t,r){const i=a.a,n=a.b,s=a.c;let o=e,l=e+1,d=e+2;t&&(o=t.getX(o),l=t.getX(l),d=t.getX(d)),i.x=r.getX(o),i.y=r.getY(o),i.z=r.getZ(o),n.x=r.getX(l),n.y=r.getY(l),n.z=r.getZ(l),s.x=r.getX(d),s.y=r.getY(d),s.z=r.getZ(d)}function Gl(a,e,t,r,i,n,s,o){const{geometry:l,_indirectBuffer:d}=a;for(let c=r,u=r+i;c<u;c++)vi(l,e,t,c,n,s,o)}function Kl(a,e,t,r,i,n,s){const{geometry:o,_indirectBuffer:l}=a;let d=1/0,c=null;for(let u=r,f=r+i;u<f;u++){let p;p=vi(o,e,t,u,null,n,s),p&&p.distance<d&&(c=p,d=p.distance)}return c}function Xl(a,e,t,r,i,n,s){const{geometry:o}=t,{index:l}=o,d=o.attributes.position;for(let c=a,u=e+a;c<u;c++){let f;if(f=c,Z(s,f*3,l,d),s.needsUpdate=!0,r(s,f,i,n))return!0}return!1}function Yl(a,e=null){e&&Array.isArray(e)&&(e=new Set(e));const t=a.geometry,r=t.index?t.index.array:null,i=t.attributes.position;let n,s,o,l,d=0;const c=a._roots;for(let f=0,p=c.length;f<p;f++)n=c[f],s=new Uint32Array(n),o=new Uint16Array(n),l=new Float32Array(n),u(0,d),d+=n.byteLength;function u(f,p,h=!1){const y=f*2;if(Q(y,o)){const x=J(f,s),b=ie(y,o);let m=1/0,v=1/0,g=1/0,w=-1/0,R=-1/0,S=-1/0;for(let C=3*x,D=3*(x+b);C<D;C++){let T=r[C];const $=i.getX(T),_=i.getY(T),P=i.getZ(T);$<m&&(m=$),$>w&&(w=$),_<v&&(v=_),_>R&&(R=_),P<g&&(g=P),P>S&&(S=P)}return l[f+0]!==m||l[f+1]!==v||l[f+2]!==g||l[f+3]!==w||l[f+4]!==R||l[f+5]!==S?(l[f+0]=m,l[f+1]=v,l[f+2]=g,l[f+3]=w,l[f+4]=R,l[f+5]=S,!0):!1}else{const x=X(f),b=Y(f,s);let m=h,v=!1,g=!1;if(e){if(!m){const T=x/H+p/ne,$=b/H+p/ne;v=e.has(T),g=e.has($),m=!v&&!g}}else v=!0,g=!0;const w=m||v,R=m||g;let S=!1;w&&(S=u(x,p,m));let C=!1;R&&(C=u(b,p,m));const D=S||C;if(D)for(let T=0;T<3;T++){const $=x+T,_=b+T,P=l[$],F=l[$+3],L=l[_],U=l[_+3];l[f+T]=P<L?P:L,l[f+T+3]=F>U?F:U}return D}}}function ye(a,e,t,r,i){let n,s,o,l,d,c;const u=1/t.direction.x,f=1/t.direction.y,p=1/t.direction.z,h=t.origin.x,y=t.origin.y,x=t.origin.z;let b=e[a],m=e[a+3],v=e[a+1],g=e[a+3+1],w=e[a+2],R=e[a+3+2];return u>=0?(n=(b-h)*u,s=(m-h)*u):(n=(m-h)*u,s=(b-h)*u),f>=0?(o=(v-y)*f,l=(g-y)*f):(o=(g-y)*f,l=(v-y)*f),n>l||o>s||((o>n||isNaN(n))&&(n=o),(l<s||isNaN(s))&&(s=l),p>=0?(d=(w-x)*p,c=(R-x)*p):(d=(R-x)*p,c=(w-x)*p),n>c||d>s)?!1:((d>n||n!==n)&&(n=d),(c<s||s!==s)&&(s=c),n<=i&&s>=r)}function Zl(a,e,t,r,i,n,s,o){const{geometry:l,_indirectBuffer:d}=a;for(let c=r,u=r+i;c<u;c++){let f=d?d[c]:c;vi(l,e,t,f,n,s,o)}}function Jl(a,e,t,r,i,n,s){const{geometry:o,_indirectBuffer:l}=a;let d=1/0,c=null;for(let u=r,f=r+i;u<f;u++){let p;p=vi(o,e,t,l?l[u]:u,null,n,s),p&&p.distance<d&&(c=p,d=p.distance)}return c}function ec(a,e,t,r,i,n,s){const{geometry:o}=t,{index:l}=o,d=o.attributes.position;for(let c=a,u=e+a;c<u;c++){let f;if(f=t.resolveTriangleIndex(c),Z(s,f*3,l,d),s.needsUpdate=!0,r(s,f,i,n))return!0}return!1}function tc(a,e,t,r,i,n,s){V.setBuffer(a._roots[e]),ye(0,V.float32Array,r,n,s)&&os(0,a,t,r,i,n,s),V.clearBuffer()}function os(a,e,t,r,i,n,s){const{float32Array:o,uint16Array:l,uint32Array:d}=V,c=a*2;if(Q(c,l)){const f=J(a,d),p=ie(c,l);Gl(e,t,r,f,p,i,n,s)}else{const f=X(a);ye(f,o,r,n,s)&&os(f,e,t,r,i,n,s);const p=Y(a,d);ye(p,o,r,n,s)&&os(p,e,t,r,i,n,s)}}const rc=["x","y","z"];function ic(a,e,t,r,i,n){V.setBuffer(a._roots[e]);let s=null;return ye(0,V.float32Array,r,i,n)&&(s=ls(0,a,t,r,i,n)),V.clearBuffer(),s}function ls(a,e,t,r,i,n){const{float32Array:s,uint16Array:o,uint32Array:l}=V;let d=a*2;if(Q(d,o)){const u=J(a,l),f=ie(d,o);return Kl(e,t,r,u,f,i,n)}else{const u=Ts(a,l),f=rc[u],h=r.direction[f]>=0;let y,x;h?(y=X(a),x=Y(a,l)):(y=Y(a,l),x=X(a));const m=ye(y,s,r,i,n)?ls(y,e,t,r,i,n):null;if(m){const w=m.point[f];if(h?w<=s[x+u]:w>=s[x+u+3])return m}const g=ye(x,s,r,i,n)?ls(x,e,t,r,i,n):null;return m&&g?m.distance<=g.distance?m:g:m||g||null}}const Fr=new ve,At=new xe,Ft=new xe,er=new W,mn=new oe,Nr=new oe;function sc(a,e,t,r){V.setBuffer(a._roots[e]);const i=cs(0,a,t,r);return V.clearBuffer(),i}function cs(a,e,t,r,i=null){const{float32Array:n,uint16Array:s,uint32Array:o}=V;let l=a*2;if(i===null&&(t.boundingBox||t.computeBoundingBox(),mn.set(t.boundingBox.min,t.boundingBox.max,r),i=mn),Q(l,s)){const c=e.geometry,u=c.index,f=c.attributes.position,p=t.index,h=t.attributes.position,y=J(a,o),x=ie(l,s);if(er.copy(r).invert(),t.boundsTree)return j(a,n,Nr),Nr.matrix.copy(er),Nr.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:m=>Nr.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(r),m.b.applyMatrix4(r),m.c.applyMatrix4(r),m.needsUpdate=!0;for(let v=y*3,g=(x+y)*3;v<g;v+=3)if(Z(Ft,v,u,f),Ft.needsUpdate=!0,m.intersectsTriangle(Ft))return!0;return!1}});{const b=yi(t);for(let m=y*3,v=(x+y)*3;m<v;m+=3){Z(At,m,u,f),At.a.applyMatrix4(er),At.b.applyMatrix4(er),At.c.applyMatrix4(er),At.needsUpdate=!0;for(let g=0,w=b*3;g<w;g+=3)if(Z(Ft,g,p,h),Ft.needsUpdate=!0,At.intersectsTriangle(Ft))return!0}}}else{const c=X(a),u=Y(a,o);return j(c,n,Fr),!!(i.intersectsBox(Fr)&&cs(c,e,t,r,i)||(j(u,n,Fr),i.intersectsBox(Fr)&&cs(u,e,t,r,i)))}}const Lr=new W,ki=new oe,tr=new oe,nc=new A,ac=new A,oc=new A,lc=new A;function cc(a,e,t,r={},i={},n=0,s=1/0){e.boundingBox||e.computeBoundingBox(),ki.set(e.boundingBox.min,e.boundingBox.max,t),ki.needsUpdate=!0;const o=a.geometry,l=o.attributes.position,d=o.index,c=e.attributes.position,u=e.index,f=me.getPrimitive(),p=me.getPrimitive();let h=nc,y=ac,x=null,b=null;i&&(x=oc,b=lc);let m=1/0,v=null,g=null;return Lr.copy(t).invert(),tr.matrix.copy(Lr),a.shapecast({boundsTraverseOrder:w=>ki.distanceToBox(w),intersectsBounds:(w,R,S)=>S<m&&S<s?(R&&(tr.min.copy(w.min),tr.max.copy(w.max),tr.needsUpdate=!0),!0):!1,intersectsRange:(w,R)=>{if(e.boundsTree)return e.boundsTree.shapecast({boundsTraverseOrder:C=>tr.distanceToBox(C),intersectsBounds:(C,D,T)=>T<m&&T<s,intersectsRange:(C,D)=>{for(let T=C,$=C+D;T<$;T++){Z(p,3*T,u,c),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let _=w,P=w+R;_<P;_++){Z(f,3*_,d,l),f.needsUpdate=!0;const F=f.distanceToTriangle(p,h,x);if(F<m&&(y.copy(h),b&&b.copy(x),m=F,v=_,g=T),F<n)return!0}}}});{const S=yi(e);for(let C=0,D=S;C<D;C++){Z(p,3*C,u,c),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let T=w,$=w+R;T<$;T++){Z(f,3*T,d,l),f.needsUpdate=!0;const _=f.distanceToTriangle(p,h,x);if(_<m&&(y.copy(h),b&&b.copy(x),m=_,v=T,g=C),_<n)return!0}}}}}),me.releasePrimitive(f),me.releasePrimitive(p),m===1/0?null:(r.point?r.point.copy(y):r.point=y.clone(),r.distance=m,r.faceIndex=v,i&&(i.point?i.point.copy(b):i.point=b.clone(),i.point.applyMatrix4(Lr),y.applyMatrix4(Lr),i.distance=y.sub(i.point).length(),i.faceIndex=g),r)}function uc(a,e=null){e&&Array.isArray(e)&&(e=new Set(e));const t=a.geometry,r=t.index?t.index.array:null,i=t.attributes.position;let n,s,o,l,d=0;const c=a._roots;for(let f=0,p=c.length;f<p;f++)n=c[f],s=new Uint32Array(n),o=new Uint16Array(n),l=new Float32Array(n),u(0,d),d+=n.byteLength;function u(f,p,h=!1){const y=f*2;if(Q(y,o)){const x=J(f,s),b=ie(y,o);let m=1/0,v=1/0,g=1/0,w=-1/0,R=-1/0,S=-1/0;for(let C=x,D=x+b;C<D;C++){const T=3*a.resolveTriangleIndex(C);for(let $=0;$<3;$++){let _=T+$;_=r?r[_]:_;const P=i.getX(_),F=i.getY(_),L=i.getZ(_);P<m&&(m=P),P>w&&(w=P),F<v&&(v=F),F>R&&(R=F),L<g&&(g=L),L>S&&(S=L)}}return l[f+0]!==m||l[f+1]!==v||l[f+2]!==g||l[f+3]!==w||l[f+4]!==R||l[f+5]!==S?(l[f+0]=m,l[f+1]=v,l[f+2]=g,l[f+3]=w,l[f+4]=R,l[f+5]=S,!0):!1}else{const x=X(f),b=Y(f,s);let m=h,v=!1,g=!1;if(e){if(!m){const T=x/H+p/ne,$=b/H+p/ne;v=e.has(T),g=e.has($),m=!v&&!g}}else v=!0,g=!0;const w=m||v,R=m||g;let S=!1;w&&(S=u(x,p,m));let C=!1;R&&(C=u(b,p,m));const D=S||C;if(D)for(let T=0;T<3;T++){const $=x+T,_=b+T,P=l[$],F=l[$+3],L=l[_],U=l[_+3];l[f+T]=P<L?P:L,l[f+T+3]=F>U?F:U}return D}}}function dc(a,e,t,r,i,n,s){V.setBuffer(a._roots[e]),ye(0,V.float32Array,r,n,s)&&us(0,a,t,r,i,n,s),V.clearBuffer()}function us(a,e,t,r,i,n,s){const{float32Array:o,uint16Array:l,uint32Array:d}=V,c=a*2;if(Q(c,l)){const f=J(a,d),p=ie(c,l);Zl(e,t,r,f,p,i,n,s)}else{const f=X(a);ye(f,o,r,n,s)&&us(f,e,t,r,i,n,s);const p=Y(a,d);ye(p,o,r,n,s)&&us(p,e,t,r,i,n,s)}}const fc=["x","y","z"];function hc(a,e,t,r,i,n){V.setBuffer(a._roots[e]);let s=null;return ye(0,V.float32Array,r,i,n)&&(s=ds(0,a,t,r,i,n)),V.clearBuffer(),s}function ds(a,e,t,r,i,n){const{float32Array:s,uint16Array:o,uint32Array:l}=V;let d=a*2;if(Q(d,o)){const u=J(a,l),f=ie(d,o);return Jl(e,t,r,u,f,i,n)}else{const u=Ts(a,l),f=fc[u],h=r.direction[f]>=0;let y,x;h?(y=X(a),x=Y(a,l)):(y=Y(a,l),x=X(a));const m=ye(y,s,r,i,n)?ds(y,e,t,r,i,n):null;if(m){const w=m.point[f];if(h?w<=s[x+u]:w>=s[x+u+3])return m}const g=ye(x,s,r,i,n)?ds(x,e,t,r,i,n):null;return m&&g?m.distance<=g.distance?m:g:m||g||null}}const zr=new ve,Nt=new xe,Lt=new xe,rr=new W,gn=new oe,Er=new oe;function pc(a,e,t,r){V.setBuffer(a._roots[e]);const i=fs(0,a,t,r);return V.clearBuffer(),i}function fs(a,e,t,r,i=null){const{float32Array:n,uint16Array:s,uint32Array:o}=V;let l=a*2;if(i===null&&(t.boundingBox||t.computeBoundingBox(),gn.set(t.boundingBox.min,t.boundingBox.max,r),i=gn),Q(l,s)){const c=e.geometry,u=c.index,f=c.attributes.position,p=t.index,h=t.attributes.position,y=J(a,o),x=ie(l,s);if(rr.copy(r).invert(),t.boundsTree)return j(a,n,Er),Er.matrix.copy(rr),Er.needsUpdate=!0,t.boundsTree.shapecast({intersectsBounds:m=>Er.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(r),m.b.applyMatrix4(r),m.c.applyMatrix4(r),m.needsUpdate=!0;for(let v=y,g=x+y;v<g;v++)if(Z(Lt,3*e.resolveTriangleIndex(v),u,f),Lt.needsUpdate=!0,m.intersectsTriangle(Lt))return!0;return!1}});{const b=yi(t);for(let m=y,v=x+y;m<v;m++){const g=e.resolveTriangleIndex(m);Z(Nt,3*g,u,f),Nt.a.applyMatrix4(rr),Nt.b.applyMatrix4(rr),Nt.c.applyMatrix4(rr),Nt.needsUpdate=!0;for(let w=0,R=b*3;w<R;w+=3)if(Z(Lt,w,p,h),Lt.needsUpdate=!0,Nt.intersectsTriangle(Lt))return!0}}}else{const c=X(a),u=Y(a,o);return j(c,n,zr),!!(i.intersectsBox(zr)&&fs(c,e,t,r,i)||(j(u,n,zr),i.intersectsBox(zr)&&fs(u,e,t,r,i)))}}const kr=new W,Hi=new oe,ir=new oe,mc=new A,gc=new A,xc=new A,yc=new A;function vc(a,e,t,r={},i={},n=0,s=1/0){e.boundingBox||e.computeBoundingBox(),Hi.set(e.boundingBox.min,e.boundingBox.max,t),Hi.needsUpdate=!0;const o=a.geometry,l=o.attributes.position,d=o.index,c=e.attributes.position,u=e.index,f=me.getPrimitive(),p=me.getPrimitive();let h=mc,y=gc,x=null,b=null;i&&(x=xc,b=yc);let m=1/0,v=null,g=null;return kr.copy(t).invert(),ir.matrix.copy(kr),a.shapecast({boundsTraverseOrder:w=>Hi.distanceToBox(w),intersectsBounds:(w,R,S)=>S<m&&S<s?(R&&(ir.min.copy(w.min),ir.max.copy(w.max),ir.needsUpdate=!0),!0):!1,intersectsRange:(w,R)=>{if(e.boundsTree){const S=e.boundsTree;return S.shapecast({boundsTraverseOrder:C=>ir.distanceToBox(C),intersectsBounds:(C,D,T)=>T<m&&T<s,intersectsRange:(C,D)=>{for(let T=C,$=C+D;T<$;T++){const _=S.resolveTriangleIndex(T);Z(p,3*_,u,c),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let P=w,F=w+R;P<F;P++){const L=a.resolveTriangleIndex(P);Z(f,3*L,d,l),f.needsUpdate=!0;const U=f.distanceToTriangle(p,h,x);if(U<m&&(y.copy(h),b&&b.copy(x),m=U,v=P,g=T),U<n)return!0}}}})}else{const S=yi(e);for(let C=0,D=S;C<D;C++){Z(p,3*C,u,c),p.a.applyMatrix4(t),p.b.applyMatrix4(t),p.c.applyMatrix4(t),p.needsUpdate=!0;for(let T=w,$=w+R;T<$;T++){const _=a.resolveTriangleIndex(T);Z(f,3*_,d,l),f.needsUpdate=!0;const P=f.distanceToTriangle(p,h,x);if(P<m&&(y.copy(h),b&&b.copy(x),m=P,v=T,g=C),P<n)return!0}}}}}),me.releasePrimitive(f),me.releasePrimitive(p),m===1/0?null:(r.point?r.point.copy(y):r.point=y.clone(),r.distance=m,r.faceIndex=v,i&&(i.point?i.point.copy(b):i.point=b.clone(),i.point.applyMatrix4(kr),y.applyMatrix4(kr),i.distance=y.sub(i.point).length(),i.faceIndex=g),r)}function xn(a,e,t){return a===null?null:(a.point.applyMatrix4(e.matrixWorld),a.distance=a.point.distanceTo(t.ray.origin),a.object=e,a)}const Hr=new oe,Ur=new ga,yn=new A,vn=new W,bn=new A,Ui=["getX","getY","getZ"];class gt extends ui{static serialize(e,t={}){t={cloneBuffers:!0,...t};const r=e.geometry,i=e._roots,n=e._indirectBuffer,s=r.getIndex(),o={version:1,roots:null,index:null,indirectBuffer:null};return t.cloneBuffers?(o.roots=i.map(l=>l.slice()),o.index=s?s.array.slice():null,o.indirectBuffer=n?n.slice():null):(o.roots=i,o.index=s?s.array:null,o.indirectBuffer=n),o}static deserialize(e,t,r={}){r={setIndex:!0,indirect:!!e.indirectBuffer,...r};const{index:i,roots:n,indirectBuffer:s}=e;e.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),l(n));const o=new gt(t,{...r,[yr]:!0});if(o._roots=n,o._indirectBuffer=s||null,r.setIndex){const d=t.getIndex();if(d===null){const c=new ut(e.index,1,!1);t.setIndex(c)}else d.array!==i&&(d.array.set(i),d.needsUpdate=!0)}return o;function l(d){for(let c=0;c<d.length;c++){const u=d[c],f=new Uint32Array(u),p=new Uint16Array(u);for(let h=0,y=u.byteLength/ne;h<y;h++){const x=H*h,b=2*x;Q(b,p)||(f[x+6]=f[x+6]/H-h)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(e,t={}){t.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.'),t={...t,targetLeafSize:t.maxLeafTris}),super(e,t)}shiftTriangleOffsets(e){return super.shiftPrimitiveOffsets(e)}writePrimitiveBounds(e,t,r){const i=this.geometry,n=this._indirectBuffer,s=i.attributes.position,o=i.index?i.index.array:null,d=(n?n[e]:e)*3;let c=d+0,u=d+1,f=d+2;o&&(c=o[c],u=o[u],f=o[f]);for(let p=0;p<3;p++){const h=s[Ui[p]](c),y=s[Ui[p]](u),x=s[Ui[p]](f);let b=h;y<b&&(b=y),x<b&&(b=x);let m=h;y>m&&(m=y),x>m&&(m=x),t[r+p]=b,t[r+p+3]=m}return t}computePrimitiveBounds(e,t,r){const i=this.geometry,n=this._indirectBuffer,s=i.attributes.position,o=i.index?i.index.array:null,l=s.normalized;if(e<0||t+e-r.offset>r.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");const d=s.array,c=s.offset||0;let u=3;s.isInterleavedBufferAttribute&&(u=s.data.stride);const f=["getX","getY","getZ"],p=r.offset;for(let h=e,y=e+t;h<y;h++){const b=(n?n[h]:h)*3,m=(h-p)*6;let v=b+0,g=b+1,w=b+2;o&&(v=o[v],g=o[g],w=o[w]),l||(v=v*u+c,g=g*u+c,w=w*u+c);for(let R=0;R<3;R++){let S,C,D;l?(S=s[f[R]](v),C=s[f[R]](g),D=s[f[R]](w)):(S=d[v+R],C=d[g+R],D=d[w+R]);let T=S;C<T&&(T=C),D<T&&(T=D);let $=S;C>$&&($=C),D>$&&($=D);const _=($-T)/2,P=R*2;r[m+P+0]=T+_,r[m+P+1]=_+(Math.abs(T)+_)*si}}return r}raycastObject3D(e,t,r=[]){const{material:i}=e;if(i===void 0)return;vn.copy(e.matrixWorld).invert(),Ur.copy(t.ray).applyMatrix4(vn),bn.setFromMatrixScale(e.matrixWorld),yn.copy(Ur.direction).multiply(bn);const n=yn.length(),s=t.near/n,o=t.far/n;if(t.firstHitOnly===!0){let l=this.raycastFirst(Ur,i,s,o);l=xn(l,e,t),l&&r.push(l)}else{const l=this.raycast(Ur,i,s,o);for(let d=0,c=l.length;d<c;d++){const u=xn(l[d],e,t);u&&r.push(u)}}return r}refit(e=null){return(this.indirect?uc:Yl)(this,e)}raycast(e,t=ai,r=0,i=1/0){const n=this._roots,s=[],o=this.indirect?dc:tc;for(let l=0,d=n.length;l<d;l++)o(this,l,t,e,s,r,i);return s}raycastFirst(e,t=ai,r=0,i=1/0){const n=this._roots;let s=null;const o=this.indirect?hc:ic;for(let l=0,d=n.length;l<d;l++){const c=o(this,l,t,e,r,i);c!=null&&(s==null||c.distance<s.distance)&&(s=c)}return s}intersectsGeometry(e,t){let r=!1;const i=this._roots,n=this.indirect?pc:sc;for(let s=0,o=i.length;s<o&&(r=n(this,s,e,t),!r);s++);return r}shapecast(e){const t=me.getPrimitive(),r=super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:this.indirect?ec:Xl});return me.releasePrimitive(t),r}bvhcast(e,t,r){let{intersectsRanges:i,intersectsTriangles:n}=r;const s=me.getPrimitive(),o=this.geometry.index,l=this.geometry.attributes.position,d=this.indirect?h=>{const y=this.resolveTriangleIndex(h);Z(s,y*3,o,l)}:h=>{Z(s,h*3,o,l)},c=me.getPrimitive(),u=e.geometry.index,f=e.geometry.attributes.position,p=e.indirect?h=>{const y=e.resolveTriangleIndex(h);Z(c,y*3,u,f)}:h=>{Z(c,h*3,u,f)};if(n){if(!(e instanceof gt))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');const h=(y,x,b,m,v,g,w,R)=>{for(let S=b,C=b+m;S<C;S++){p(S),c.a.applyMatrix4(t),c.b.applyMatrix4(t),c.c.applyMatrix4(t),c.needsUpdate=!0;for(let D=y,T=y+x;D<T;D++)if(d(D),s.needsUpdate=!0,n(s,c,D,S,v,g,w,R))return!0}return!1};if(i){const y=i;i=function(x,b,m,v,g,w,R,S){return y(x,b,m,v,g,w,R,S)?!0:h(x,b,m,v,g,w,R,S)}}else i=h}return super.bvhcast(e,t,{intersectsRanges:i})}intersectsBox(e,t){return Hr.set(e.min,e.max,t),Hr.needsUpdate=!0,this.shapecast({intersectsBounds:r=>Hr.intersectsBox(r),intersectsTriangle:r=>Hr.intersectsTriangle(r)})}intersectsSphere(e){return this.shapecast({intersectsBounds:t=>e.intersectsBox(t),intersectsTriangle:t=>t.intersectsSphere(e)})}closestPointToGeometry(e,t,r={},i={},n=0,s=1/0){return(this.indirect?vc:cc)(this,e,t,r,i,n,s)}closestPointToPoint(e,t={},r=0,i=1/0){return ql(this,e,t,r,i)}}const wn=new A,Sn=new A,Tn=new A,He=new ga,In=new W,lt=new A,Vi=new A,bc=["x","y","z"],Vr=parseInt(mi)>=169,wc=parseInt(mi)<=161,Or=new G,Wr=new G,qr=new G,_n=new A,Rn=new A,Cn=new A;class pr extends ui{get primitiveStride(){return 3}constructor(e,t={}){if(!e.isMesh)throw new Error("SkinnedMeshBVH: First argument must be a Mesh.");super(e.geometry,{...t,[yr]:!0}),this.mesh=e,t[yr]||this.init(t)}writePrimitiveBounds(e,t,r){const{mesh:i,geometry:n}=this,s=this._indirectBuffer,o=n.index?n.index.array:null,d=(s?s[e]:e)*3;let c=d+0,u=d+1,f=d+2;o&&(c=o[c],u=o[u],f=o[f]),i.getVertexPosition(c,wn),i.getVertexPosition(u,Sn),i.getVertexPosition(f,Tn);for(let p=0;p<3;p++){const h=bc[p],y=wn[h],x=Sn[h],b=Tn[h];let m=y;x<m&&(m=x),b<m&&(m=b);let v=y;x>v&&(v=x),b>v&&(v=b),t[r+p]=m,t[r+p+3]=v}return t}shapecast(e){const t=new xe;return super.shapecast({...e,intersectsPrimitive:e.intersectsTriangle,scratchPrimitive:t,iterate:Sc})}raycastObject3D(e,t,r=[]){const{material:i}=e;if(i===void 0)return;const{matrixWorld:n}=e,{firstHitOnly:s}=t;In.copy(n).invert(),He.copy(t.ray).applyMatrix4(In);let o=null,l=1/0;return this.shapecast({boundsTraverseOrder:d=>d.distanceToPoint(He.origin),intersectsBounds:d=>{if(s){if(!He.intersectBox(d,Vi))return fr;let c;return d.containsPoint(He.origin)?c=0:(Vi.applyMatrix4(n),c=t.ray.origin.distanceTo(Vi)),c<l?en:fr}else return He.intersectsBox(d)?en:fr},intersectsTriangle:(d,c)=>{let u=null;if(i.side===ai?u=He.intersectTriangle(d.a,d.b,d.c,!0,lt):i.side===ys?u=He.intersectTriangle(d.c,d.b,d.a,!0,lt):u=He.intersectTriangle(d.a,d.b,d.c,!1,lt),!u)return;u=u.clone().applyMatrix4(n);const f=t.ray.origin.distanceTo(u);if(f>=t.near&&f<=t.far){if(s&&f>=l)return;const{geometry:p}=this,{index:h}=p,y=this.resolvePrimitiveIndex(c),x=y*3;let b=x+0,m=x+1,v=x+2;h&&(b=h.array[b],m=h.array[m],v=h.array[v]);const g={distance:f,point:u.clone(),object:e,uv:null,uv1:null,normal:null,face:{a:b,b:m,c:v,normal:Te.getNormal(d.a,d.b,d.c,new A),materialIndex:0},faceIndex:y};if(Vr){const C=new A;Te.getBarycoord(lt,d.a,d.b,d.c,C),g.barycoord=C}const w=p.attributes.uv,R=p.attributes.uv1,S=p.attributes.normal;if(w){Or.fromBufferAttribute(w,b),Wr.fromBufferAttribute(w,m),qr.fromBufferAttribute(w,v),g.uv=new G;const C=Te.getInterpolation(lt,d.a,d.b,d.c,Or,Wr,qr,g.uv);Vr||(g.uv=C)}if(R){Or.fromBufferAttribute(R,b),Wr.fromBufferAttribute(R,m),qr.fromBufferAttribute(R,v),g.uv1=new G;const C=Te.getInterpolation(lt,d.a,d.b,d.c,Or,Wr,qr,g.uv1);Vr||(g.uv1=C),wc&&(g.uv2=g.uv1)}if(S){_n.fromBufferAttribute(S,b),Rn.fromBufferAttribute(S,m),Cn.fromBufferAttribute(S,v),g.normal=new A;const C=Te.getInterpolation(lt,d.a,d.b,d.c,_n,Rn,Cn,g.normal);g.normal.dot(He.direction)>0&&g.normal.multiplyScalar(-1),Vr||(g.normal=C)}l=g.distance,o=g,s||r.push(g)}}}),s&&o&&r.push(o),r}}function Sc(a,e,t,r,i,n,s){const{mesh:o,geometry:l}=t,d=l.index?l.index.array:null;for(let c=a,u=e+a;c<u;c++){const f=t.resolvePrimitiveIndex(c);let p=3*f+0,h=3*f+1,y=3*f+2;if(d&&(p=d[p],h=d[h],y=d[y]),o.getVertexPosition(p,s.a),o.getVertexPosition(h,s.b),o.getVertexPosition(y,s.c),s.needsUpdate=!0,r(s,c,i,n))return!0}return!1}const je=new O({min:"array<f32, 3>",max:"array<f32, 3>"},"BVHBoundingBox");je.getLength=()=>6;const wt=new O({leftBounds:"BVHBoundingBox",rightBounds:"BVHBoundingBox",rightChildOrTriangleOffset:"uint",splitAxisOrTriangleCount:"uint",_alignment0:"uint",_alignment1:"uint"},"BVHNode");wt.getLength=()=>2*je.getLength()+4;const Tc=new O({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",_alignment0:"uint",_alignment1:"uint",_alignment2:"uint"},"TransformStruct"),k=new O({origin:"vec3f",direction:"vec3f",maxDist:"float"},"Ray"),Ut=new O({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float"},"IntersectionResult"),Qr=new O({faceIndices:"vec4u",closestPoint:"vec3f",found:"bool",barycoord:"vec3f",objectIndex:"uint",faceNormal:"vec3f",side:"float",distanceSq:"float"},"PointQueryResult"),Ds=wr(`

	const BVH_STACK_DEPTH = 60u;
	const INFINITY = 1e20;
	const TRI_INTERSECT_EPSILON = 1e-5;

`),$s=wr(`
	struct IntersectionResult {
		indices: vec4u,
		normal: vec3f,
		didHit: bool,
		barycoord: vec3f,
		side: f32,
		dist: f32,
	};
`);M(`

	fn getVertexAttribute(
		barycoord: vec3f,
		indices: vec3u,
		attributeBuffer: ptr<storage, array<vec3f>, read>
	) -> vec3f {

		let n0 = attributeBuffer[ indices.x ];
		let n1 = attributeBuffer[ indices.y ];
		let n2 = attributeBuffer[ indices.z ];
		return barycoord.x * n0 + barycoord.y * n1 + barycoord.z * n2;

	}

`);const Ic=M(`

	fn intersectsBounds(
		ray: Ray,
		bounds: BVHBoundingBox,
		dist: ptr<function, f32>
	) -> bool {

		let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
		let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

		let invDir = 1.0 / ray.direction;
		let tMinPlane = ( boundsMin - ray.origin ) * invDir;
		let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

		let tMinHit = vec3f(
			min( tMinPlane.x, tMaxPlane.x ),
			min( tMinPlane.y, tMaxPlane.y ),
			min( tMinPlane.z, tMaxPlane.z )
		);

		let tMaxHit = vec3f(
			max( tMinPlane.x, tMaxPlane.x ),
			max( tMinPlane.y, tMaxPlane.y ),
			max( tMinPlane.z, tMaxPlane.z )
		);

		let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
		let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

		( *dist ) = max( t0, 0.0 );

		return t1 >= ( *dist );

	}

`,[k,je]),Aa=M(`

	fn intersectsTriangle( ray: Ray, a: vec3f, b: vec3f, c: vec3f ) -> IntersectionResult {

		var result: IntersectionResult;
		result.didHit = false;

		let edge1 = b - a;
		let edge2 = c - a;
		let n = cross( edge1, edge2 );

		let det = - dot( ray.direction, n );

		if ( abs( det ) < TRI_INTERSECT_EPSILON ) {

			return result;

		}

		let invdet = 1.0 / det;

		let AO = ray.origin - a;
		let DAO = cross( AO, ray.direction );

		let u = dot( edge2, DAO ) * invdet;
		let v = -dot( edge1, DAO ) * invdet;
		let t = dot( AO, n ) * invdet;

		let w = 1.0 - u - v;

		if ( u < - TRI_INTERSECT_EPSILON || v < - TRI_INTERSECT_EPSILON || w < - TRI_INTERSECT_EPSILON || t < TRI_INTERSECT_EPSILON ) {

			return result;

		}

		result.didHit = true;
		result.barycoord = vec3f( w, u, v );
		result.dist = t;
		result.side = sign( det );
		result.normal = result.side * normalize( n );

		return result;

	}

`,[k,$s,Ds]),_c=M(`

	fn intersectTriangles(
		bvh_position: ptr<storage, array<vec3f>, read>,
		bvh_index: ptr<storage, array<vec3u>, read>,
		offset: u32,
		count: u32,
		ray: Ray
	) -> IntersectionResult {

		var closestResult: IntersectionResult;

		closestResult.didHit = false;
		closestResult.dist = INFINITY;

		for ( var i = offset; i < offset + count; i = i + 1u ) {

			let indices = bvh_index[ i ];
			let a = bvh_position[ indices.x ];
			let b = bvh_position[ indices.y ];
			let c = bvh_position[ indices.z ];

			var triResult = intersectsTriangle( ray, a, b, c );

			if ( triResult.didHit && triResult.dist < closestResult.dist ) {

				closestResult = triResult;
				closestResult.indices = vec4u( indices.xyz, i );

			}

		}

		return closestResult;

	}

`,[Aa,k,$s,Ds]);M(`

	fn bvhIntersectFirstHit(
		bvh_index: ptr<storage, array<vec3u>, read>,
		bvh_position: ptr<storage, array<vec3f>, read>,
		bvh: ptr<storage, array<BVHNode>,read>,
		ray: Ray,
	) -> IntersectionResult {

		var pointer = 0;
		var stack: array<u32, BVH_STACK_DEPTH>;
		stack[ 0 ] = 0u;

		var bestHit: IntersectionResult;

		bestHit.didHit = false;
		bestHit.dist = INFINITY;

		loop {

			if ( pointer < 0 || pointer >= i32( BVH_STACK_DEPTH ) ) {

				break;

			}

			let currNodeIndex = stack[ pointer ];
			let node = bvh[ currNodeIndex ];

			pointer = pointer - 1;

			var boundsHitDistance: f32 = 0.0;

			if ( ! intersectsBounds( ray, node.bounds, &boundsHitDistance ) || boundsHitDistance > bestHit.dist ) {

				continue;

			}

			let boundsInfox = node.splitAxisOrTriangleCount;
			let boundsInfoy = node.rightChildOrTriangleOffset;

			let isLeaf = ( boundsInfox & 0xffff0000u ) != 0u;

			if ( isLeaf ) {

				let count = boundsInfox & 0x0000ffffu;
				let offset = boundsInfoy;

				let localHit = intersectTriangles(
					bvh_position, bvh_index, offset,
					count, ray
				);

				if ( localHit.didHit && localHit.dist < bestHit.dist ) {

					bestHit = localHit;

				}

			} else {

				let leftIndex = currNodeIndex + 1u;
				let splitAxis = boundsInfox & 0x0000ffffu;
				let rightIndex = currNodeIndex + boundsInfoy;

				let leftToRight = ray.direction[splitAxis] >= 0.0;
				let c1 = select( rightIndex, leftIndex, leftToRight );
				let c2 = select( leftIndex, rightIndex, leftToRight );

				pointer = pointer + 1;
				stack[ pointer ] = c2;

				pointer = pointer + 1;
				stack[ pointer ] = c1;

			}

		}

		return bestHit;

	}

`,[_c,Ic,k,wt,$s,Ds]);class Fa extends bs{static get type(){return"ProxyCallNode"}constructor(e,t){super(),this.proxyNode=e,this.params=t}setup(){return this.proxyNode.proxyNode.call(...this.params)}}class Ms{get isNode(){return!0}get proxyNode(){const{proxyObject:e,proxyProperty:t}=this,r=t.split(".");let i=e;for(let n=0,s=r.length;n<s;n++)i=i?.[r[n]];return i&&"functionNode"in i?i.functionNode:i??null}constructor(e,t=null){return this.proxyObject=t,this.proxyProperty=e,new Proxy(this,{get(r,i){if(i in r)return Reflect.get(r,i);{const n=r.proxyNode;if(!n)return;const s=Reflect.get(n,i);return typeof s=="function"?s.bind(n):s}},set(r,i,n){if(i in r)return Reflect.set(r,i,n);throw new Error("NodeProxy: Cannot set members of proxied nodes.")}})}}const ee=(...a)=>new Ms(...a),K=(...a)=>{const e=new Ms(...a),t=(...r)=>new Fa(e,r);return vs.nodeProxyConstructor(t,e)};class Na extends Ms{get proxyNode(){return super.proxyNode||this.fallbackNode}constructor(e,t){super(e,null),Object.defineProperty(this,"fallbackNode",{value:t})}setup(e){return this.proxyObject=e.getContext(),this.proxyNode.setup(e)}}const _e=(...a)=>new Na(...a),ue=(...a)=>{const e=new Na(...a),t=(...r)=>new Fa(e,r);return vs.nodeProxyConstructor(t,e)},hs=64,La=hs/4,Ke=new pt,$e=new pt;function Dn(a,e,t,r){const i=e*H;for(let n=0;n<3;n++){const s=a[i+n],o=a[i+n+3];s>o?(t[r+n]=1,t[r+n+3]=-1):(t[r+n]=s,t[r+n+3]=o)}}function za(a,e,t,r,i){const n=t*H;Dn(a,t+1,r,i),Dn(a,t+e[n+6],r,i+6)}function Rc(a,e){const t=a?a.array:null,r=new Uint32Array(e.length*3);for(let i=0,n=e.length;i<n;i++){const s=3*i,o=3*e[i];for(let l=0;l<3;l++)r[s+l]=t?t[o+l]:o+l}return r}function $n(a,e,t,r){const i=new Uint32Array(r),n=new Float32Array(r);a._roots.forEach(s=>{const o=new Uint16Array(s),l=new Uint32Array(s),d=new Float32Array(s);for(let c=0,u=s.byteLength/ne;c<u;c++){const f=c*H,p=f*2,h=t*La,y=Q(p,o);if(y||za(d,l,c,n,h),e===null){t++;continue}if(y){const x=l[f+6],b=o[p+14],{transformSlot:m,nodeOffset:v}=b===0?{transformSlot:0,nodeOffset:0}:e[x];if(m>16777215)throw new Error(`packBVHBufferUtils: transform slot ${m} exceeds the 24-bit TLAS leaf limit.`);i[h+12]=v,i[h+13]=4278190080|m&16777215}else i[h+12]=l[f+6],i[h+13]=l[f+7];t++}})}function Cc(a,e){return Ea(new Uint16Array(a),new Uint32Array(a),e)}function Ea(a,e,t){if(Q(t*H*2,a))return 1;const i=e[t*H+6];return i+Ea(a,e,t+i)}function Mn(a,e=0){const t=new Uint16Array(a),r=new Uint32Array(a);let i=0;return n(e*H,1),i;function n(s,o){const l=s,d=s*2;if(Q(d,t))i=Math.max(o,i);else{const u=Y(l,r),f=X(l);n(f,o+1),n(u,o+1)}}}function Dc(a,e,t,r,i,n){const s=new Uint16Array(n),o=new Uint32Array(n),l=new Float32Array(n),d=new Uint16Array(a),c=new Uint32Array(a),u=new Float32Array(a);for(let f=0;f<t;f++){const p=e+f,h=p*H,y=h*2,x=i*La,b=x*2;Q(y,d)?(o[x+12]=c[h+6]+r,s[b+26]=d[y+14],s[b+27]=Ss):(za(u,c,p,l,x),o[x+12]=c[h+6],o[x+13]=c[h+7]),i++}}function $c(a,e,t,r,i){const{geometry:n}=a,{start:s,count:o,vertexStart:l}=e;if(a.indirect){const d=Rc(n.index,a._indirectBuffer);for(let c=0;c<d.length;c++)i[c+r]=d[c]-l+t}else if(n.index)for(let d=0;d<o;d++)i[d+r]=n.index.getX(d+s)-l+t;else for(let d=0;d<o;d++)i[d+r]=d+s+t}function Mc(a,e,t,r,i,n){const{geometry:s,mesh:o=null}=a,{vertexStart:l,vertexCount:d}=e,c=new Float32Array(r),u=i.getLength();i.membersLayout.forEach(({name:f},p)=>{const h=s.attributes[f];n.getDefaultAttributeValue(f,Ke);for(let y=0;y<d;y++){if(h){switch($e.fromBufferAttribute(h,y+l),h.itemSize){case 1:$e.y=Ke.y,$e.z=Ke.z,$e.w=Ke.w;break;case 2:$e.z=Ke.z,$e.w=Ke.w;break;case 3:$e.w=Ke.w;break}o&&(f==="position"||f==="normal"||f==="tangent")&&o.applyBoneTransform(y+l,$e)}else $e.copy(Ke);$e.toArray(c,(t+y)*u+p*4)}})}class Pc extends bs{constructor(e){super(),this.literal=e}build(){return this.literal}}class ps extends bs{constructor(e,t="property"){super(),this.node=e,this.output=t}build(e){return this.node.build(e,this.output)}}function Bc(a){return a.isNode?new ps(a):null}function ka(a){const e=[];for(const t of a)if(Array.isArray(t))for(const r of t){const i=Bc(r);i&&e.push(i)}return e}function Ha(a,e){return a.map(t=>(t&&!t.isNode&&t instanceof Function&&(t=t(e)),t&&t.isNode?(t.setup(e),t.isWGSLTagCodeNode?new ps(t,"inline"):new ps(t)):t))}function ms(a,e,t){let r="";for(let i=0,n=a.length;i<n;i++)if(r+=a[i],i<e.length){const s=e[i];Array.isArray(s)||(typeof s=="string"||typeof s=="number"?r+=String(s):r+=s.build(t))}return r}class Ac extends Qo{static get type(){return"WGSLTagFnNode"}constructor(e,t,r="wgsl"){super("",ka(t),r),this.isWGSLTagFnNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=Ha(this.args,e)}getNodeFunction(e){const{tokens:t,_normalizedArgs:r}=this,i=e.getDataFromNode(this);let n=i.nodeFunction;if(n===void 0){let s="";for(let o=0,l=t.length;o<l;o++)if(s+=t[o],o<r.length){const d=r[o];Array.isArray(d)||(typeof d=="string"||typeof d=="number"?s+=String(d):d.isStructLayoutNode?s+=d.getNodeType(e):d.isStruct?s+=d.layout.getNodeType(e):s+="_arg"+o)}s=s.replace(/\/\/.*[\n\r]/g,""),n=e.parser.parseFunction(s),i.nodeFunction=n}return n}generate(e,t){const r=super.generate(e,t),{_normalizedArgs:i}=this,n=ms(this.tokens,i,e),{type:s}=this.getNodeFunction(e),o=e.getCodeFromNode(this,s);return o.code=n.replace(/\/\/.+[\n\r]/g,"").replace(/->\s*void/,"").trim(),r}}class Fc extends jo{static get type(){return"WGSLTagCodeNode"}constructor(e,t,r="wgsl"){super("",ka(t),r),this.isWGSLTagCodeNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=Ha(this.args,e)}build(e,t){return t==="inline"?ms(this.tokens,this._normalizedArgs,e):super.build(e,t)}generate(e){super.generate(e);const t=e.getCodeFromNode(this,this.getNodeType(e));return t.code=ms(this.tokens,this._normalizedArgs,e),t.code}}const Nc=a=>{const e=(...t)=>{if(t.length===1&&t[0]&&typeof t[0]=="object"&&!t[0].isNode){const r=t[0];for(const i in r)typeof r[i]=="string"&&(r[i]=new Pc(r[i]))}return a.call(...t)};return vs.nodeProxyConstructor(e,a)},I=(a,...e)=>Nc(new Ac(a,e)),zt=(a,...e)=>new Fc(a,e),gs=vt(60);function Lc(a,e){const{name:t=`bvh_shapecast_fn_${Math.random().toString(36).substring(2,7)}`,shapeStruct:r,resultStruct:i=null,prefixFn:n=null,boundsOrderFn:s=null,intersectsBoundsFn:o,intersectRangeFn:l,transformShapeFn:d=null,transformResultFn:c=null,resetShapeFn:u=null}=e,{nodes:f,transforms:p}=a.storage;let h="";n&&(h=zt`${n}();`);let y="";c&&(y=zt`${c}( result, objectIndex );`);let x="";d&&(x=zt`${d}( &localShape, objectIndex );`);let b="";u&&(b=zt`${u}( objectIndex );`);let m="";s&&(m=zt`
			let leftToRight = ${s}( localShape, splitAxis, node );
			c1 = select( rightIndex, leftIndex, leftToRight );
			c2 = select( leftIndex, rightIndex, leftToRight );
			hit1 = select( hitRight, hitLeft, leftToRight );
			hit2 = select( hitLeft, hitRight, leftToRight );
		`);const v=i?zt`result: ptr<function, ${i}>`:"",g=i?"result":"",w=I`
		// fn
		fn ${t}( shape: ${r}, ${v} ) -> bool {

			${h}

			var didHit = false;

			var isTLAS = true;
			var pointer: i32 = 0;
			var stack: array<u32, ${gs}>;
			stack[ 0 ] = 0u;

			var blasDidHit: bool = false;
			var objectIndex: u32 = 0;
			var localShape: ${r} = shape;

			// the stack depth the current cluster's BLAS drains back down to once it is complete
			var tlasReset: i32 = 0;

			loop {

				// The cluster's BLAS has drained back to its TLAS leaf. Finalize the cluster that
				// was just traversed and resume the TLAS.
				if ( ! isTLAS && tlasReset == pointer ) {

					if ( blasDidHit ) {

						blasDidHit = false;
						didHit = true;
						${y}

					}

					${b}

					objectIndex = 0;
					isTLAS = true;
					localShape = shape;

				}

				// check if we've finished all nodes on the stack (or overrun the stack)
				if ( pointer < 0 || pointer >= i32( ${gs} ) ) {

					break;

				}

				// a node's bounds were tested by its parent, so the popped node is always entered
				let nodeIndex = stack[ pointer ];
				let node = ${f}[ nodeIndex ];
				pointer = pointer - 1;

				let infoX = node.splitAxisOrTriangleCount;
				let infoY = node.rightChildOrTriangleOffset;
				let isLeaf = ( infoX & 0xffff0000u ) != 0u;

				if ( isLeaf ) {

					if ( isTLAS ) {

						// the leaf encodes the placement / transform slot in the low 24 bits of infoX
						// and the cluster subtree's absolute node offset in infoY, which is pushed
						// directly as the BLAS entry node. Each TLAS leaf references one cluster.
						objectIndex = infoX & 0x00ffffffu;

						let transform = ${p}[ objectIndex ];
						if ( transform.visible != 0u ) {

							tlasReset = pointer;
							isTLAS = false;
							blasDidHit = false;

							// Transform shape into object local space
							localShape = shape;
							${x}

							pointer = pointer + 1;
							stack[ pointer ] = infoY;

						}

					} else {

						let count = infoX & 0x0000ffffu;
						let offset = infoY;
						// Cast bool callbacks to u32 to preserve their existing hit / miss behavior.
						let rangeResult = u32( ${l}( localShape, offset, count, ${g} ) );
						blasDidHit = rangeResult != ${fr}u || blasDidHit;
						if ( rangeResult == ${Ma}u ) {

							${y}
							${b}
							return true;

						}

					}

				} else {

					// test both children here, pushing the farther one first so the nearer is popped next
					let leftIndex = nodeIndex + 1u;
					let splitAxis = infoX & 0x0000ffffu;
					let rightIndex = nodeIndex + infoY;
					let hitLeft = ${o}( localShape, node.leftBounds, ${g} ) != 0u;
					let hitRight = ${o}( localShape, node.rightBounds, ${g} ) != 0u;

					var c1 = rightIndex;
					var c2 = leftIndex;
					var hit1 = hitRight;
					var hit2 = hitLeft;
					${m}

					if ( hit2 ) {

						pointer = pointer + 1;
						stack[ pointer ] = c2;

					}

					if ( hit1 ) {

						pointer = pointer + 1;
						stack[ pointer ] = c1;

					}

				}

			}

			return didHit;

		}
	`;return w.outputType=i,w.functionName=t,w}const zc=I`
	// fn
	fn closestPointToTriangle(
		p: vec3f,
		v0: vec3f,
		v1: vec3f,
		v2: vec3f
	) -> vec3f {

		let v10 = v1 - v0;
		let v21 = v2 - v1;
		let v02 = v0 - v2;
		let p0 = p - v0;
		let p1 = p - v1;
		let p2 = p - v2;

		let nor = cross( v10, v02 );
		let q = cross( nor, p0 );
		let d = 1.0 / dot( nor, nor );
		var u = d * dot( q, v02 );
		var v = d * dot( q, v10 );
		var w = 1.0 - u - v;

		if ( u < 0.0 ) {

			w = clamp( dot( p2, v02 ) / dot( v02, v02 ), 0.0, 1.0 );
			u = 0.0;
			v = 1.0 - w;

		} else if ( v < 0.0 ) {

			u = clamp( dot( p0, v10 ) / dot( v10, v10 ), 0.0, 1.0 );
			v = 0.0;
			w = 1.0 - u;

		} else if ( w < 0.0 ) {

			v = clamp( dot( p1, v21 ) / dot( v21, v21 ), 0.0, 1.0 );
			w = 0.0;
			u = 1.0 - v;

		}

		return vec3f( w, u, v );

	}
`,Ps=I`
	// fn
	fn intersectRayTriangle( ray: ${k}, a: vec3f, b: vec3f, c: vec3f, threshold: f32 ) -> ${Ut} {

		const DET_EPSILON = 1e-15;

		var result: ${Ut};
		result.didHit = false;

		let edge1 = b - a;
		let edge2 = c - a;
		let n = cross( edge1, edge2 );

		let det = - dot( ray.direction, n );
		if ( abs( det ) < DET_EPSILON ) {

			return result;

		}

		let invdet = 1.0 / det;

		let AO = ray.origin - a;
		let DAO = cross( AO, ray.direction );

		let u = dot( edge2, DAO ) * invdet;
		if ( u < 0.0 || u > 1.0 ) {

			return result;

		}

		let v = - dot( edge1, DAO ) * invdet;
		if ( v < 0.0 || u + v > 1.0 ) {

			return result;

		}

		let t = dot( AO, n ) * invdet;
		let w = 1.0 - u - v;
		if ( t < threshold ) {

			return result;

		}

		result.didHit = true;
		result.barycoord = vec3f( w, u, v );
		result.dist = t;
		result.side = sign( det );
		result.normal = result.side * normalize( n );

		return result;

	}
`,bi=I`
	// fn
	fn ndcToCameraRay( ndc: vec2f, inverseModelViewProjection: mat4x4f ) -> ${k} {

		var homogeneous = vec4f();
		var ray: ${k};

		homogeneous = inverseModelViewProjection * vec4f( ndc, 0.0, 1.0 );
		ray.origin = homogeneous.xyz / homogeneous.w;

		homogeneous = inverseModelViewProjection * vec4f( ndc, 1.0, 1.0 );
		let toFarPlane = ( homogeneous.xyz / homogeneous.w ) - ray.origin;
		ray.maxDist = length( toFarPlane );
		ray.direction = toFarPlane / ray.maxDist;

		return ray;

	}
`,Ua=I`
	fn bvh_rayBoundsDistance( ray: ${k}, bounds: ${je} ) -> f32 {

		let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
		let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

		// Avoid 0 * infinity for rays parallel to a slab and on its boundary.
		let parallel = ray.direction == vec3f( 0.0 );
		if ( any( parallel & ( ( ray.origin < boundsMin ) | ( ray.origin > boundsMax ) ) ) ) {

			return - 1.0;

		}

		let invDir = 1.0 / select( ray.direction, vec3f( 1.0 ), parallel );
		let tMinPlane = ( boundsMin - ray.origin ) * invDir;
		let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

		// parallel axes never limit the slab interval
		const FLT_MAX = 3.402823e38;
		let tMinHit = select( min( tMinPlane, tMaxPlane ), vec3f( - FLT_MAX ), parallel );
		let tMaxHit = select( max( tMinPlane, tMaxPlane ), vec3f( FLT_MAX ), parallel );

		let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
		let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

		let dist = max( t0, 0.0 );
		return select( dist, - 1.0, t1 < dist );

	}
`;function Ec(a){const{index:e,attributes:t,transforms:r}=a.storage,i=Le(1).toVar("bvh_rayScalarAnyHit");return a.getShapecastFn({name:"bvh_RaycastAnyHit",shapeStruct:k,intersectsBoundsFn:I`
			fn rayIntersectsBoundsAnyHit( ray: ${k}, bounds: ${je} ) -> u32 {

				let dist = ${Ua}( ray, bounds ) * ${i};
				return u32( dist >= 0.0 && ( ray.maxDist <= 0.0 || dist < ray.maxDist ) );

			}
		`,intersectRangeFn:I`
			fn intersectRangeAnyHit( ray: ${k}, offset: u32, count: u32 ) -> u32 {

				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let a = ${t}[ ${e}[ ti * 3u ] ].position.xyz;
					let b = ${t}[ ${e}[ ti * 3u + 1u ] ].position.xyz;
					let c = ${t}[ ${e}[ ti * 3u + 2u ] ].position.xyz;

					let triResult = ${Ps}( ray, a, b, c, 0.0 );
					if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist * ${i} < ray.maxDist ) ) {

						return ${Ma}u;

					}

				}

				return ${fr}u;

			}
		`,transformShapeFn:I`
			fn transformRayAnyHit( ray: ptr<function, ${k}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
				ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

				let len = length( ray.direction );
				ray.direction /= len;
				${i} = 1.0 / len;

			}
		`,resetShapeFn:I`
			fn resetRayScalarAnyHit( objectIndex: u32 ) -> void {

				${i} = 1.0;

			}
		`})}function kc(a){const{index:e,attributes:t,transforms:r}=a.storage,i=Le(1).toVar("bvh_rayScalar");return a.getShapecastFn({name:"bvh_RaycastFirstHit",shapeStruct:k,resultStruct:Ut,boundsOrderFn:I`
			fn getBoundsOrder( ray: ${k}, splitAxis: u32, node: ${wt} ) -> bool {

				return ray.direction[ splitAxis ] >= 0.0;

			}
		`,intersectsBoundsFn:I`
			fn rayIntersectsBounds( ray: ${k}, bounds: ${je}, result: ptr<function, ${Ut}> ) -> u32 {

				let dist = ${Ua}( ray, bounds ) * ${i};
				if ( dist < 0.0 ) {

					return 0u;

				} else if ( ray.maxDist > 0.0 && dist >= ray.maxDist ) {

					return 0u;

				} else if ( result.didHit && dist >= result.dist ) {

					return 0u;

				} else {

					return 1u;

				}

			}

		`,intersectRangeFn:I`
			fn intersectRange( ray: ${k}, offset: u32, count: u32, result: ptr<function, ${Ut}> ) -> bool {

				var didHit = false;
				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${e}[ ti * 3u ];
					let i1 = ${e}[ ti * 3u + 1u ];
					let i2 = ${e}[ ti * 3u + 2u ];

					let a = ${t}[ i0 ].position.xyz;
					let b = ${t}[ i1 ].position.xyz;
					let c = ${t}[ i2 ].position.xyz;

					var triResult = ${Ps}( ray, a, b, c, 0.0 );
					triResult.dist *= ${i};
					if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist < ray.maxDist ) && ( ! result.didHit || triResult.dist < result.dist ) ) {

						result.didHit = true;
						result.dist = triResult.dist;
						result.normal = triResult.normal;
						result.side = triResult.side;
						result.barycoord = triResult.barycoord;
						result.indices = vec4u( i0, i1, i2, ti );

						didHit = true;

					}

				}

				return didHit;

			}
		`,transformShapeFn:I`
			fn transformRay( ray: ptr<function, ${k}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
				ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

				let len = length( ray.direction );
				ray.direction /= len;
				${i} = 1.0 / len;

			}
		`,transformResultFn:I`
			fn transformResult( hit: ptr<function, ${Ut}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
				hit.objectIndex = objectIndex;

			}
		`,resetShapeFn:I`
			fn resetRayScalar( objectIndex: u32 ) -> void {

				${i} = 1.0;

			}
		`})}function Hc(a){const{storage:e,structs:t}=a,r=t.attributes.membersLayout.map(({name:i})=>`result.${i} = a0.${i} * barycoord.x + a1.${i} * barycoord.y + a2.${i} * barycoord.z;`).join(`
`);return I`
		// fn
		fn bvh_sampleTrianglePoint( barycoord: vec3f, indices: vec3u ) -> ${t.attributes} {

			var result: ${t.attributes};
			var a0 = ${e.attributes}[ indices.x ];
			var a1 = ${e.attributes}[ indices.y ];
			var a2 = ${e.attributes}[ indices.z ];
			${r}
			return result;

		}
	`}function Uc(a){const{index:e,attributes:t,transforms:r}=a.storage,i=Go().toVar("bvh_toWorldMat");return a.getShapecastFn({name:"bvh_ClosestPointToPoint",shapeStruct:"vec3f",resultStruct:Qr,boundsOrderFn:I`
			fn cppBoundsOrder( shape: vec3f, splitAxis: u32, node: ${wt} ) -> bool {

				let toWorld = ${i};
				let absX = abs( toWorld[ 0 ].xyz );
				let absY = abs( toWorld[ 1 ].xyz );
				let absZ = abs( toWorld[ 2 ].xyz );

				// squared distance from the point to each child's bounds in world space
				let lMin = vec3f( node.leftBounds.min[ 0 ], node.leftBounds.min[ 1 ], node.leftBounds.min[ 2 ] );
				let lMax = vec3f( node.leftBounds.max[ 0 ], node.leftBounds.max[ 1 ], node.leftBounds.max[ 2 ] );
				let lHalf = ( lMax - lMin ) * 0.5;
				let lCenter = ( toWorld * vec4f( ( lMin + lMax ) * 0.5, 1.0 ) ).xyz;
				let lExtent = absX * lHalf.x + absY * lHalf.y + absZ * lHalf.z;
				let lDelta = shape - clamp( shape, lCenter - lExtent, lCenter + lExtent );

				let rMin = vec3f( node.rightBounds.min[ 0 ], node.rightBounds.min[ 1 ], node.rightBounds.min[ 2 ] );
				let rMax = vec3f( node.rightBounds.max[ 0 ], node.rightBounds.max[ 1 ], node.rightBounds.max[ 2 ] );
				let rHalf = ( rMax - rMin ) * 0.5;
				let rCenter = ( toWorld * vec4f( ( rMin + rMax ) * 0.5, 1.0 ) ).xyz;
				let rExtent = absX * rHalf.x + absY * rHalf.y + absZ * rHalf.z;
				let rDelta = shape - clamp( shape, rCenter - rExtent, rCenter + rExtent );

				// the nearer child is traversed first
				return dot( lDelta, lDelta ) <= dot( rDelta, rDelta );

			}
		`,intersectsBoundsFn:I`
			fn cppIntersectsBounds( shape: vec3f, bounds: ${je}, result: ptr<function, ${Qr}> ) -> u32 {

				// return 1u;
				// we need to check this no matter what if the result has not been found yet
				if ( ! result.found ) {

					return 1u;

				}

				let toWorld = ${i};

				// transform to world space
				let bMin = vec3f( bounds.min[ 0 ], bounds.min[ 1 ], bounds.min[ 2 ] );
				let bMax = vec3f( bounds.max[ 0 ], bounds.max[ 1 ], bounds.max[ 2 ] );
				let center = ( bMin + bMax ) * 0.5;
				let halfExtent = ( bMax - bMin ) * 0.5;
				let worldCenter = ( toWorld * vec4f( center, 1.0 ) ).xyz;
				let worldHalfExtent =
					abs( toWorld[ 0 ].xyz ) * halfExtent.x +
				    abs( toWorld[ 1 ].xyz ) * halfExtent.y +
				    abs( toWorld[ 2 ].xyz ) * halfExtent.z;
				let worldMin = worldCenter - worldHalfExtent;
				let worldMax = worldCenter + worldHalfExtent;

				// intersect if the distance to the bounds is not bigger than the already found
				let d = shape - clamp( shape, worldMin, worldMax );
				return select( 0u, 1u, dot( d, d ) < result.distanceSq );

			}
		`,intersectRangeFn:I`
			fn cppIntersectsRange( shape: vec3f, offset: u32, count: u32, result: ptr<function, ${Qr}> ) -> bool {

				var didHit = false;
				let toWorld = ${i};

				for ( var i = offset; i < offset + count; i ++ ) {

					// transform the triangle to world space
					let i0 = ${e}[ i * 3u + 0u ];
					let i1 = ${e}[ i * 3u + 1u ];
					let i2 = ${e}[ i * 3u + 2u ];
					let a = ( toWorld * vec4f( ${t}[ i0 ].position.xyz, 1.0 ) ).xyz;
					let b = ( toWorld * vec4f( ${t}[ i1 ].position.xyz, 1.0 ) ).xyz;
					let c = ( toWorld * vec4f( ${t}[ i2 ].position.xyz, 1.0 ) ).xyz;

					let barycoord = ${zc}( shape, a, b, c );
					let closestPoint = barycoord.x * a + barycoord.y * b + barycoord.z * c;
					let delta = shape - closestPoint;
					let distSq = dot( delta, delta );

					// copy the content over
					if ( ! result.found || distSq < result.distanceSq ) {

						let normal = normalize( cross( a - b, b - c ) );

						result.closestPoint = closestPoint;
						result.barycoord = barycoord;
						result.distanceSq = distSq;
						result.faceNormal = normal;
						result.side = sign( dot( normal, delta ) );
						result.faceIndices = vec4u( i0, i1, i2, i );
						result.found = true;
						didHit = true;

					}

				}

				return didHit;

			}
		`,resetShapeFn:I`
				fn cppResetShape( objectIndex: u32 ) -> void {

					// node bounds are transformed by "toWorld" during the bounds tests. Only the
					// object-local BLAS bounds need the object's world matrix - the top-level bounds
					// are already in world space - so restore identity before top-level traversal resumes.
					${i} = mat4x4f(
						1.0, 0.0, 0.0, 0.0,
						0.0, 1.0, 0.0, 0.0,
						0.0, 0.0, 1.0, 0.0,
						0.0, 0.0, 0.0, 1.0
					);

				}
			`,transformShapeFn:I`
			fn cppTransformShape( shape: ptr<function, vec3f>, objectIndex: u32 ) -> void {

				${i} = ${r}[ objectIndex ].matrixWorld;

			}
		`,transformResultFn:I`
			fn cppTransformResult( result: ptr<function, ${Qr}>, objectIndex: u32 ) -> void {

				result.objectIndex = objectIndex;

			}
		`})}const mr=24,Oi=(1<<mr)-1,Va=31-mr,Vc=(1<<Va)-1,Wi=new W,qi=new ve,sr=new W;class Oc extends Ba{constructor(e,t){super(),t={getBVH:(s,o)=>{throw new Error("ClusteredBVH: getBVH callback must be provided ")},shouldCluster:s=>s.isSkinnedMesh||s.isInstancedMesh||s.isBatchedMesh,primitiveLimit:64,matrixWorld:Array.isArray(e)?new W:e.matrixWorld,includeInstances:!0,_strictLeafSize:1,...t};const r=Array.from(Oa(e)),i=Math.ceil(Math.log2(r.length)),n=(1<<i)-1;this.objects=r,this.getBVH=t.getBVH,this.shouldCluster=t.shouldCluster,this.includeInstances=t.includeInstances,this.primitiveLimit=t.primitiveLimit,this.matrixWorld=t.matrixWorld,this.bvhMap=new WeakMap,this.idBits=i,this.idMask=n,this.primitiveBufferStride=2,this.init(t)}init(e){let t=0;const{objects:r,bvhMap:i,matrixWorld:n}=this;Wi.copy(n).invert(),r.forEach(s=>{const o=[];for(let l=0,d=this._getInstanceCount(s);l<d;l++){const c=this.getBVH(s,l);o.push(c),c&&(t+=this.shouldCluster(s)?c._roots.length:this._countRelevantLeafNodes(c))}i.set(s,o)}),this.primitiveBuffer=new Uint32Array(t*2),this._fillPrimitiveBuffer(this.primitiveBuffer),super.init(e)}getRootRanges(){return[{offset:0,count:this.primitiveBuffer.length/this.primitiveBufferStride}]}refit(...e){Wi.copy(this.matrixWorld).invert(),super.refit(...e)}writePrimitiveBounds(e,t,r){const{primitiveBuffer:i,bvhMap:n,objects:s}=this,o=i[2*e+0],l=i[2*e+1],d=s[this.getObjectId(o)],c=this.getInstanceId(o),u=n.get(d)[c],f=this.getBVHRootIndex(l),p=this.getBVHNodeIndex(l);d.isInstancedMesh||d.isBatchedMesh?(d.getMatrixAt(c,sr),sr.premultiply(d.matrixWorld)):sr.copy(d.matrixWorld),sr.premultiply(Wi),j(p,new Float32Array(u._roots[f]),qi),qi.applyMatrix4(sr);const{min:h,max:y}=qi;t[r+0]=h.x,t[r+1]=h.y,t[r+2]=h.z,t[r+3]=y.x,t[r+4]=y.y,t[r+5]=y.z}getInstanceId(e){const{idMask:t,idBits:r}=this;return(e&~t)>>>r}getObjectId(e){const{idMask:t}=this;return e&t}getBVHRootIndex(e){return e>>>mr}getBVHNodeIndex(e){return(e&Oi)*H}_getInstanceCount(e){const{includeInstances:t}=this;return e.isInstancedMesh&&t?e.count:e.isBatchedMesh&&t?e.instanceCount:1}_fillPrimitiveBuffer(e){const{objects:t,bvhMap:r,idBits:i,primitiveLimit:n}=this;let s=0;const o=(l,d,c,u)=>{if(u>Oi)throw new Error(`ClusteredBVH: cluster node index ${u} exceeds the ${mr}-bit packing limit and cannot be represented.`);if(c>Vc)throw new Error(`ClusteredBVH: bvh root index ${c} exceeds the ${Va}-bit packing limit and cannot be represented.`);e[2*s+0]=l<<i|d,e[2*s+1]=c<<mr|u&Oi,s++};t.forEach((l,d)=>{r.get(l).forEach((c,u)=>{if(c)if(this.shouldCluster(l))for(let f=0,p=c._roots.length;f<p;f++)o(u,d,f,0);else Pn(c,n,(f,p)=>{o(u,d,f,p/H)})})})}_countRelevantLeafNodes(e){const{primitiveLimit:t}=this;let r=0;return Pn(e,t,(i,n,s,o)=>{r++,o&&s>=t&&console.warn(`ClusteredBVH: a leaf node with ${s} primitives exceeds the cluster primitive limit of ${t} and cannot be subdivided further.`)}),r}}function Pn(a,e,t){const r=a._roots.length;for(let i=0;i<r;i++)Ze.setBVH(a,i),Ze.traverseBuffer((n,s,o)=>{const l=Ze.getRangeStart(o),c=Ze.getRangeEnd(o)-l;return c<e||s?(t(i,o,c,s),!0):!1});Ze.reset()}function Oa(a,e=new Set){return Array.isArray(a)?a.forEach(t=>Oa(t,e)):a.traverse(t=>{t.isMesh&&e.add(t)}),e}const ct=new W,jr=new W,Bn={start:0,count:0,vertexStart:0,vertexCount:0};function Wc(a){let e=a;for(;e;){if(e.visible===!1)return!1;e=e.parent}return!0}function An(a){return a._roots.reduce((e,t)=>e+t.byteLength/ne,0)}function Fn(a,e){return`${a}_${e}`}class qc{constructor(e,t={}){const{attributes:r={position:"vec4f"},autogenerateBvh:i=!0}=t;Array.isArray(e)||(e=[e]),e=e.map(n=>{if(n.isObject3D)return n;if(n.isBufferGeometry)return new lr(n);if(n instanceof ui){const s=new lr;return s.geometry.boundsTree=n,s}}),this._bvhCache=new Map,this.autogenerateBvh=i,this.attributes=r,this.objects=e,this.bvh=null,this.storage=new Qi,this.structs=new Qi({transform:Tc}),this.fns=new Qi({raycastFirstHit:kc(this),raycastAnyHit:Ec(this),closestPointToPoint:Uc(this),sampleTrianglePoint:null},K)}getRootObject(){let{objects:e}=this;if(e.isObject3D)return e;Array.isArray(e)||(e=[e]),e=e.map(r=>{if(r.isObject3D)return r;if(r.isBufferGeometry)return new lr(r);if(r instanceof ui){const i=new lr;return i.geometry.boundsTree=r,i}});const t=new Ko;return t.children=e,t}getShapecastFn(e){return Lc(this,e)}update(){const e=this.getRootObject();let t=0;e.traverse(z=>{z.isMesh&&t++}),this.bvh=new Oc(e,{strategy:Ot,getBVH:(z,Ee)=>this._getBVHSync(z,Ee,Bn),primitiveLimit:t<3?1/0:64}),this.dispose();const{attributes:r,structs:i,bvh:n}=this,s=[],o=[],l=new Map;let d=An(n)*hs,c=0,u=0;const f=[];let p=0;const h=this._getTransformMap(n),{primitiveBuffer:y,primitiveBufferStride:x}=n;for(let z=0,Ee=y.length;z<Ee;z+=x){const ke=y[z],Tt=y[z+1],Kt=n.objects[n.getObjectId(ke)],Xt=n.getInstanceId(ke),Yt={start:0,count:0,vertexStart:0,vertexCount:0},It=this._getBVHSync(Kt,Xt,Yt);if(!It)throw new Error("BVHComputeData: BVH not found.");let le=s.find(Rt=>Rt.bvh===It);le||(le={index:s.length,bvh:It,range:Yt,geometryOffset:0},c+=le.range.count,u+=le.range.vertexCount,s.push(le));const it=n.getBVHRootIndex(Tt),_t=n.getBVHNodeIndex(Tt)/H,Rr=`${le.index}_${it}_${_t}`;let st=l.get(Rr);if(st===void 0){const Rt=Cc(It._roots[it],_t);st={data:le,root:it,node:_t,size:Rt,base:0},l.set(Rr,st),o.push(st),d+=Rt*hs,p=Math.max(p,Mn(It._roots[it],_t))}f.push({transformSlot:h.get(Fn(ke,it)).slot,subtree:st})}if(Mn(n._roots[0])+p-1>gs.value)throw new Error("BVHComputeData: BVH depth overruns the compute stack depth.");const v=Math.max(h.size,2);c=Math.max(c,2),u=Math.max(u,2);const g=new O(r,"bvh_GeometryStruct");let w=0,R=0;const S=new Uint32Array(c),C=new ArrayBuffer(u*g.getLength()*4),D=new ArrayBuffer(d);s.forEach(z=>{z.geometryOffset=R/3,z.bvh.indirect||(z.geometryOffset-=z.range.start/3),$c(z.bvh,z.range,w,R,S),Mc(z.bvh,z.range,w,C,g,this),R+=z.range.count,w+=z.range.vertexCount});let T=An(n);o.forEach(z=>{z.base=T,Dc(z.data.bvh._roots[z.root],z.node,z.size,z.data.geometryOffset,T,D),T+=z.size}),f.forEach(z=>z.nodeOffset=z.subtree.base),$n(n,f,0,D);const $=new ArrayBuffer(i.transform.getLength()*v*4),_=E(new N(new Uint32Array(D),1),wt).toReadOnly().setName("bvh_nodes"),P=new N(new Uint32Array($),1),F=E(P,i.transform).toReadOnly().setName("bvh_transforms"),L=E(new N(S,1),"uint").toReadOnly().setName("bvh_index"),U=E(new N(new Uint32Array(C),g.getLength()),g).toReadOnly().setName("bvh_attributes");this.storage.transforms=F,this.storage.nodes=_,this.storage.index=L,this.storage.attributes=U,this.structs.attributes=g,jr.copy(n.matrixWorld).invert(),h.forEach(z=>{this.writeTransformData(z,jr,z.slot,$)}),this.fns.sampleTrianglePoint=Hc(this),this._bvhCache.clear()}async updateAsync(){const e=[];this.getRootObject().traverse(t=>{if(!t.isMesh)return;let r=1;t.isInstancedMesh?r=t.count:t.isBatchedMesh&&(r=t.instanceCount);for(let i=0;i<r;i++)e.push(this.getBVH(t,i,Bn))}),await Promise.all(e),this.update()}updateTransforms(){const{bvh:e,storage:t}=this;e.refit();const r=t.nodes.proxyNode.value;$n(e,null,0,r.array.buffer),r.needsUpdate=!0;const i=t.transforms.proxyNode.value,n=i.array.buffer;jr.copy(e.matrixWorld).invert(),this._getTransformMap(e).forEach(s=>{this.writeTransformData(s,jr,s.slot,n)}),i.needsUpdate=!0}writeTransformData(e,t,r,i){const{structs:n}=this,s=new Float32Array(i),o=new Uint32Array(i),{object:l,instanceId:d}=e;l.isInstancedMesh||l.isBatchedMesh?(l.getMatrixAt(d,ct),ct.premultiply(l.matrixWorld)):ct.copy(l.matrixWorld),ct.premultiply(t),ct.toArray(s,r*n.transform.getLength()),ct.invert(),ct.toArray(s,r*n.transform.getLength()+16);let c=Wc(l);l.isBatchedMesh&&(c=c&&l.getVisibleAt(d)),o[r*n.transform.getLength()+32]=c?1:0}getBVH(e,t,r){const{autogenerateBvh:i,_bvhCache:n}=this;let s=null;if(e.boundsTree||e.isSkinnedMesh){const o=e.geometry;if(r.count=o.index?o.index.count:o.attributes.position.count,r.vertexCount=o.attributes.position.count,s=e.boundsTree||null,s===null&&i){const l=e.uuid;s=n.get(l)||new pr(e),n.set(l,s)}}else if(e.isBatchedMesh){const o=e.getGeometryIdAt(t),l=e.getGeometryRangeAt(o);if(Object.assign(r,l),s=e.boundsTrees[o]||null,s===null&&i){const d=`batched_${e.geometry.uuid}_${l.start}_${l.count}`;s=n.get(d)||new gt(e.geometry,{range:{...r}}),n.set(d,s)}}else{const o=e.geometry;if(r.count=o.index?o.index.count:o.attributes.position.count,r.vertexCount=o.attributes.position.count,s=e.geometry.boundsTree||null,s===null&&i){const l=o.uuid;s=n.get(l)||new gt(o),n.set(l,s)}}return s}getDefaultAttributeValue(e,t){switch(e){case"position":case"color":t.set(1,1,1,1);break;default:t.set(0,0,0,0)}return t}dispose(){const{storage:e}=this;for(const t in e)e[t].value?.dispose()}_getBVHSync(e,t,r){const i=this.getBVH(e,t,r);if(i instanceof Promise)throw new Error('BVHComputeData: "getBVH" returned a promise. Use "updateAsync" instead.');return i}_getTransformMap(e){const{primitiveBuffer:t,primitiveBufferStride:r}=e,i=new Map;for(let n=0,s=t.length;n<s;n+=r){const o=t[n],l=e.getBVHRootIndex(t[n+1]),d=Fn(o,l);if(i.has(d))continue;const c=i.size,u=e.objects[e.getObjectId(o)],f=e.getInstanceId(o);i.set(d,{object:u,instanceId:f,compositeId:o,root:l,slot:c})}return i}}class Qi{constructor(e={},t=ee){const r={};return new Proxy({...e},{get(i,n){return r[n]||(r[n]=t(n,i)),r[n]},set(i,n,s){return i[n]=s,!0}})}}const Qc=new Xo(-1,1,1,-1,0,1);class jc extends xa{constructor(){super(),this.setAttribute("position",new Xs([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Xs([0,2,0,0,2,0],2))}}const Gc=new jc;class kt{constructor(e){this._mesh=new lr(Gc,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Qc)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}const Gr=M(`
	fn sampleTexel( tex: texture_2d<f32>, coord: vec2f ) -> vec4f {

		// Manual bilinear filtering using textureLoad to support filterable float32 textures
		// on all devices
		let size = vec2f( textureDimensions( tex, 0 ) );

		// the path tracer stores its color rows top down
		let pxCoord = vec2f( coord.x, 1.0 - coord.y ) * size - 0.5;
		let px = vec2i( floor( pxCoord ) );
		let fr = fract( pxCoord );

		// get the four sibling samples
		let s00 = textureLoad( tex, clamp( px,                 vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s10 = textureLoad( tex, clamp( px + vec2i( 1, 0 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s01 = textureLoad( tex, clamp( px + vec2i( 0, 1 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s11 = textureLoad( tex, clamp( px + vec2i( 1, 1 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );

		// interpolate on the x axis
		let y0 = mix( s00, s10, fr.x );
		let y1 = mix( s01, s11, fr.x );

		// then y
		return mix( y0, y1, fr.y );

	}
`);class Kc extends Sr{get texture(){return this._texNode.value}set texture(e){this._texNode.value=e}get fromTexture(){return this._fromTexNode.value}set fromTexture(e){this._fromTexNode.value=e}get toneMapping(){return this._toneMapping.toneMapping}set toneMapping(e){this._toneMapping.setToneMapping(e)}get transition(){return this._transitionUniform.value}set transition(e){this._transitionUniform.value=e}get exposure(){return this._toneMapping.exposureNode.value}set exposure(e){this._toneMapping.exposureNode.value=e}constructor(e){super();const t=Re(new qe);this._texNode=t;const r=Re(new qe);this._fromTexNode=r;const i=Tr(Gt()),n=B(1);this._transitionUniform=n;const s=I`
			fn fade( uv: vec2f ) -> vec4f {

				if ( ${n} <= 0.0 ) {

					return ${Gr}( ${r}, uv );

				} else if ( ${n} >= 1.0 ) {

					return ${Gr}( ${t}, uv );

				} else {

					let col0 = ${Gr}( ${r}, uv );
					let col1 = ${Gr}( ${t}, uv );
					return mix( col0, col1, ${n} );

				}

			}
		`,o=Yo(dr,1,s(i));this._toneMapping=o,this.transparent=!0,this.colorNode=ya(o.rgb,o.a),this.setValues(e)}}const Wa=I`
	fn debugHeatColor( t: f32 ) -> vec3f {

		let r = clamp( 1.5 - abs( 4.0 * t - 3.0 ), 0.0, 1.0 );
		let g = clamp( 1.5 - abs( 4.0 * t - 2.0 ), 0.0, 1.0 );
		let b = clamp( 1.5 - abs( 4.0 * t - 1.0 ), 0.0, 1.0 );
		return vec3f( r, g, b );

	}
`,Kr=new O({tlasCount:"uint",blasCount:"uint",didHit:"bool",dist:"float"},"DebugBoundsResult");function Xc(a){const{transforms:e,index:t,attributes:r,materials:i}=a.storage,n=B(new W),s=B(new W),o=B(1),l=B(1),d=B(0),c=B(64),u=vt(0).toVar("bvh_debugBoundsLevel"),f=Le(1).toVar("bvh_debugRayScalar"),p=Le(0).toVar("bvh_debugMaterialSide"),h=I`
		fn debugGetBoundsOrder( ray: ${k}, splitAxis: u32, node: ${wt} ) -> bool {

			return ray.direction[ splitAxis ] >= 0.0;

		}
	`,y=I`
		fn debugIntersectsBounds( ray: ${k}, bounds: ${je}, result: ptr<function, ${Kr}> ) -> u32 {

			let boundsMin = vec3( bounds.min[ 0 ], bounds.min[ 1 ], bounds.min[ 2 ] );
			let boundsMax = vec3( bounds.max[ 0 ], bounds.max[ 1 ], bounds.max[ 2 ] );

			let invDir = 1.0 / ray.direction;
			let tMinPlane = ( boundsMin - ray.origin ) * invDir;
			let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

			let tMinHit = min( tMinPlane, tMaxPlane );
			let tMaxHit = max( tMinPlane, tMaxPlane );

			let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
			let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

			let dist = max( t0, 0.0 );
			if ( t1 < dist ) {

				return 0u;

			} else if ( result.didHit && dist * ${f} >= result.dist ) {

				return 0u;

			}

			if ( ${u} == 1u ) {

				result.blasCount = result.blasCount + 1u;

			} else {

				result.tlasCount = result.tlasCount + 1u;

			}

			return 1u;

		}
	`,x=I`
		fn debugIntersectRange( ray: ${k}, offset: u32, count: u32, result: ptr<function, ${Kr}> ) -> bool {

			var didHit = false;
			if ( ${d} > 0.5 ) {

				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${t}[ ti * 3u ];
					let i1 = ${t}[ ti * 3u + 1u ];
					let i2 = ${t}[ ti * 3u + 2u ];

					let a = ${r}[ i0 ].position.xyz;
					let b = ${r}[ i1 ].position.xyz;
					let c = ${r}[ i2 ].position.xyz;

					var triResult = ${Aa}( ray, a, b, c );
					triResult.dist *= ${f};
					if ( triResult.didHit && ( ! result.didHit || triResult.dist < result.dist ) ) {

						// cull faces that don't match the material side
						if ( ${p} != 0.0 && triResult.side != ${p} ) {

							continue;

						}

						result.didHit = true;
						result.dist = triResult.dist;
						didHit = true;

					}

				}

			}

			return didHit;

		}
	`,b=I`
		fn debugTransformRay( ray: ptr<function, ${k}>, objectIndex: u32 ) -> void {

			let object = ${e}[ objectIndex ];
			let toLocal = object.inverseMatrixWorld;
			ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
			ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

			let len = length( ray.direction );
			ray.direction = ray.direction / len;
			${f} = 1.0 / len;

			${p} = ${i}[ object.materialIndex ].side;
			${u} = 1u;

		}
	`,m=I`
		fn debugResetLevel( objectIndex: u32 ) -> void {

			${f} = 1.0;
			${u} = 0u;

		}
	`,v=a.getShapecastFn({name:"debugBoundsCount",shapeStruct:k,resultStruct:Kr,boundsOrderFn:h,intersectsBoundsFn:y,intersectRangeFn:x,transformShapeFn:b,resetShapeFn:m}),g=I`
		fn debugBounds( vUv: vec2f ) -> vec4f {

			let ndc = vUv * 2.0 - vec2f( 1.0 );
			var ray = ${bi}( ndc, ${n} * ${s} );
			ray.direction = normalize( ray.direction );

			// count the boxes the ray crosses, pruning those behind the nearest hit surface
			var result: ${Kr};
			${v}( ray, &result );

			let tlas = select( 0u, result.tlasCount, ${o} > 0.5 );
			let blas = select( 0u, result.blasCount, ${l} > 0.5 );
			let count = tlas + blas;

			let t = clamp( f32( count ) / max( ${c}, 1.0 ), 0.0, 1.0 );

			return vec4f( ${Wa}( t ), 1.0 );

		}
	`;return g.uniforms={cameraToModelMatrix:n,inverseProjectionMatrix:s,displayTLAS:o,displayBLAS:l,stopAtSurface:d,saturationCount:c},g}class te{get computeNode(){return this.kernel.computeNode}get workgroupSize(){return this.kernel.workgroupSize}set needsUpdate(e){this.setWorkgroupSize(...this.workgroupSize)}constructor(e,t={}){const{workgroupSize:r=[64],context:i={}}=t;this._fn=e,this.kernel=null,this.context=i,this.setWorkgroupSize(...r)}defineUniformAccessors(e){for(const t in e){if(t in this)throw new Error(`ComputeNode: Uniform name ${t} is already defined.`);const r=e[t];r.isStorageBufferNode&&!r.name&&r.setName(`kernel_${t}`),"value"in r&&Object.defineProperty(this,t,{get(){return e[t].value},set(i){e[t].value=i}})}}setWorkgroupSize(e=64,t=1,r=1){const i=this._fn.context(this.context);return i.parameters=this._fn.parameters,this.kernel?.dispose(),this.kernel=i.computeKernel([e,t,r]),this}dispose(){this.kernel?.dispose(),this.kernel=null}getDispatchSize(e=1,t=1,r=1,i=[]){const[n,s,o]=this.workgroupSize;return i.length=3,i[0]=Math.ceil(e/n),i[1]=Math.ceil(t/s),i[2]=Math.ceil(r/o),i}}const q=wr(`

	const PI: f32 = 3.141592653589793;
	const EPSILON: f32 = 1e-5;
	const MIN_ROUGHNESS: f32 = 1e-3;
	const MIN_INCIDENT_COS: f32 = 1e-3;

`),dt=new O({color:"vec3f",isTransmissive:"bool",direction:"vec3f",pdf:"float"},"ScatterRecord"),Nn=new O({reflectance:"vec3f",transmittance:"vec3f",reflectProbability:"float"},"TransmissionFresnel"),qa=new O({color:"vec3",map:"int",metalness:"float",metalnessMap:"int",roughness:"float",roughnessMap:"int",ior:"float",transmission:"float",transmissionMap:"int",emissiveIntensity:"float",emissive:"vec3",emissiveMap:"int",normalMap:"int",normalScale:"vec2",clearcoat:"float",clearcoatMap:"int",clearcoatNormalMap:"int",clearcoatNormalScale:"vec2",clearcoatRoughness:"float",clearcoatRoughnessMap:"int",iridescenceMap:"int",iridescenceThicknessMap:"int",iridescence:"float",iridescenceIor:"float",iridescenceThicknessMinimum:"float",iridescenceThicknessMaximum:"float",diffuseRoughness:"float",dispersion:"float",specularColor:"vec3",specularColorMap:"int",specularIntensity:"float",specularIntensityMap:"int",thinWall:"int",attenuationColor:"vec3",attenuationDistance:"float",alphaMap:"int",castShadow:"int",opacity:"float",alphaTest:"float",side:"float",matte:"int",sheen:"float",sheenColor:"vec3",sheenColorMap:"int",sheenRoughness:"float",sheenRoughnessMap:"int",vertexColors:"int",flatShading:"int",transparent:"int",fogVolume:"int",anisotropy:"float",anisotropyRotation:"float",anisotropyMap:"int",mapTransform:"mat3",metalnessMapTransform:"mat3",roughnessMapTransform:"mat3",transmissionMapTransform:"mat3",emissiveMapTransform:"mat3",normalMapTransform:"mat3",clearcoatMapTransform:"mat3",clearcoatNormalMapTransform:"mat3",clearcoatRoughnessMapTransform:"mat3",sheenColorMapTransform:"mat3",sheenRoughnessMapTransform:"mat3",iridescenceMapTransform:"mat3",iridescenceThicknessMapTransform:"mat3",specularColorMapTransform:"mat3",specularIntensityMapTransform:"mat3",alphaMapTransform:"mat3",anisotropyMapTransform:"mat3",multiscatterColor:"vec3",scatterStrength:"float",scatterAnisotropy:"float"},"Material"),he=new O({volumeParticle:"bool",faceNormal:"vec3f",frontFace:"bool",normal:"vec3f",normalBasis:"mat3x3f",normalInvBasis:"mat3x3f",eta:"f32",f0:"f32",roughness:"f32",diffuseRoughness:"f32",metalness:"f32",anisotropy:"f32",color:"vec3f",emission:"vec3f",opacity:"f32",ior:"f32",transmission:"f32",thinWall:"bool",attenuationColor:"vec3f",attenuationDistance:" f32",clearcoatNormal:"vec3f",clearcoatBasis:"mat3x3f",clearcoatInvBasis:"mat3x3f",clearcoat:"f32",clearcoatRoughness:"f32",sheen:"f32",sheenColor:"vec3f",sheenRoughness:"f32",iridescence:"f32",iridescenceIor:"f32",iridescenceThickness:"f32",specularColor:"vec3f",specularIntensity:"f32"},"SurfaceRecord");new O({rotation:"mat3x3f",intensity:"float",blur:"float",totalSum:"float"},"EnvironmentInfo");const Ln=new O({color:"vec3f",direction:"vec3f",pdf:"float"},"EnvironmentSample"),ft=new O({position:"vec3f",lightType:"int",color:"vec3f",intensity:"float",u:"vec3f",visibleToCameraRays:"int",v:"vec3f",area:"float",radius:"float",decay:"float",distance:"float",coneCos:"float",penumbraCos:"float",iesProfile:"int"},"Light"),Oe=new O({dist:"float",direction:"vec3f",pdf:"float",emission:"vec3f",lightType:"int"},"LightRecord"),Yc=new O({diffuse:"float",specular:"float",transmission:"float",clearcoat:"float"},"LobeWeights"),zn=new O({V:"vec3f",L:"vec3f",H:"vec3f",VdotH:"float"},"BxDFContext"),Fe=3,Zc=.02,Jc=.98,Qa=I`

	fn isAuxSurface( surface: ${he}, scatterRec: ${dt} ) -> bool {

		let isMirror = surface.roughness <= ${Zc} && surface.metalness >= ${Jc};
		return ! scatterRec.isTransmissive && ! isMirror;

	}

`,Bs=I`

	fn unpackAuxAlbedo( packed: vec3u ) -> vec3f {

		return vec3f( unpack2x16float( packed.x ), unpack2x16float( packed.y ).x );

	}

`,As=I`

	fn unpackAuxNormal( packed: vec3u ) -> vec3f {

		return vec3f( unpack2x16float( packed.z ), unpack2x16float( packed.y ).y );

	}

`,ja=I`

	fn blendAux( packed: vec3u, albedo: vec3f, normal: vec3f, weight: f32 ) -> vec3u {

		let meanAlbedo = mix( ${Bs}( packed ), albedo, weight );
		let meanNormal = mix( ${As}( packed ), normal * 0.5 + 0.5, weight );
		return vec3u(
			pack2x16float( meanAlbedo.rg ),
			pack2x16float( vec2f( meanAlbedo.b, meanNormal.z ) ),
			pack2x16float( meanNormal.xy ),
		);

	}

`;function Wt(a=""){const e=new qe(1,1);return e.format=Ce,e.type=bt,e.colorSpace=Jo.workingColorSpace,e.name=a,e.generateMipmaps=!1,e}function wi(a=""){const e=new qe(1,1);return e.format=va,e.type=ba,e.name=a,e.generateMipmaps=!1,e}function qt(a=""){const e=new Zo(1,1,Fe);return e.format=va,e.type=ba,e.name=a,e.generateMipmaps=!1,e}function di(a=""){const e=new qe(1,1);return e.format=Ce,e.type=fe,e.name=a,e.generateMipmaps=!1,e}const En=vt(256*256),Ga=Le(1/16777216),eu=wr(`

	const SOBOL_DIRECTIONS_1 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0xa0000000u, 0xf0000000u,
		0x88000000u, 0xcc000000u, 0xaa000000u, 0xff000000u,
		0x80800000u, 0xc0c00000u, 0xa0a00000u, 0xf0f00000u,
		0x88880000u, 0xcccc0000u, 0xaaaa0000u, 0xffff0000u,
		0x80008000u, 0xc000c000u, 0xa000a000u, 0xf000f000u,
		0x88008800u, 0xcc00cc00u, 0xaa00aa00u, 0xff00ff00u,
		0x80808080u, 0xc0c0c0c0u, 0xa0a0a0a0u, 0xf0f0f0f0u,
		0x88888888u, 0xccccccccu, 0xaaaaaaaau, 0xffffffffu
	);

	const SOBOL_DIRECTIONS_2 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0x60000000u, 0x90000000u,
		0xe8000000u, 0x5c000000u, 0x8e000000u, 0xc5000000u,
		0x68800000u, 0x9cc00000u, 0xee600000u, 0x55900000u,
		0x80680000u, 0xc09c0000u, 0x60ee0000u, 0x90550000u,
		0xe8808000u, 0x5cc0c000u, 0x8e606000u, 0xc5909000u,
		0x6868e800u, 0x9c9c5c00u, 0xeeee8e00u, 0x5555c500u,
		0x8000e880u, 0xc0005cc0u, 0x60008e60u, 0x9000c590u,
		0xe8006868u, 0x5c009c9cu, 0x8e00eeeeu, 0xc5005555u
	);

	const SOBOL_DIRECTIONS_3 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0x20000000u, 0x50000000u,
		0xf8000000u, 0x74000000u, 0xa2000000u, 0x93000000u,
		0xd8800000u, 0x25400000u, 0x59e00000u, 0xe6d00000u,
		0x78080000u, 0xb40c0000u, 0x82020000u, 0xc3050000u,
		0x208f8000u, 0x51474000u, 0xfbea2000u, 0x75d93000u,
		0xa0858800u, 0x914e5400u, 0xdbe79e00u, 0x25db6d00u,
		0x58800080u, 0xe54000c0u, 0x79e00020u, 0xb6d00050u,
		0x800800f8u, 0xc00c0074u, 0x200200a2u, 0x50050093u
	);

	const SOBOL_DIRECTIONS_4 = array<u32, 32>(
		0x80000000u, 0x40000000u, 0x20000000u, 0xb0000000u,
		0xf8000000u, 0xdc000000u, 0x7a000000u, 0x9d000000u,
		0x5a800000u, 0x2fc00000u, 0xa1600000u, 0xf0b00000u,
		0xda880000u, 0x6fc40000u, 0x81620000u, 0x40bb0000u,
		0x22878000u, 0xb3c9c000u, 0xfb65a000u, 0xddb2d000u,
		0x78022800u, 0x9c0b3c00u, 0x5a0fb600u, 0x2d0ddb00u,
		0xa2878080u, 0xf3c9c040u, 0xdb65a020u, 0x6db2d0b0u,
		0x800228f8u, 0x400b3cdcu, 0x200fb67au, 0xb00ddb9du
	);

`),Ka=vt(0).toVar("sobolPixelIndex"),Xa=vt(0).toVar("sobolPathIndex"),Fs=vt(0).toVar("sobolBounceIndex"),Xr=M(`
	fn getMaskedSobol( index: u32, directions: array<u32, 32> ) -> u32 {

		var X = 0u;
		for ( var bit = 0u; bit < 32u; bit ++ ) {

			let mask = ( index >> bit ) & 1u;
			X ^= mask * directions[ bit ];

		}
		return X;

	}
`),tu=(a=1)=>{if(a<=0)return;const e=a>1?`vec${a}u`:"u32",t=M(`
		fn sobolReverseBits_${e}( in: ${e} ) -> ${e} {

			var x = in;
			x = ( ( ( x & ${e}( 0xaaaaaaaau ) ) >> ${e}( 1 ) ) | ( ( x & ${e}( 0x55555555u ) ) << ${e}( 1 ) ) );
			x = ( ( ( x & ${e}( 0xccccccccu ) ) >> ${e}( 2 ) ) | ( ( x & ${e}( 0x33333333u ) ) << ${e}( 2 ) ) );
			x = ( ( ( x & ${e}( 0xf0f0f0f0u ) ) >> ${e}( 4 ) ) | ( ( x & ${e}( 0x0f0f0f0fu ) ) << ${e}( 4 ) ) );
			x = ( ( ( x & ${e}( 0xff00ff00u ) ) >> ${e}( 8 ) ) | ( ( x & ${e}( 0x00ff00ffu ) ) << ${e}( 8 ) ) );
			return ( ( x >> ${e}( 16 ) ) | ( x << ${e}( 16 ) ) );

		}
	`),r=M(`
		fn sobolHashCombine_${e}( seed: u32, v: ${e} ) -> ${e} {

			return ${e}( seed ) ^ ( v + ${e}( ( seed << 6 ) + ( seed >> 2 ) ) );

		}
	`),i=M(`
		fn sobolLaineKarrasPermutation_${e}( in: ${e}, seed: ${e} ) -> ${e} {

			var x = in;
			x += seed;
			x ^= x * 0x6c50b47cu;
			x ^= x * 0xb82f1e52u;
			x ^= x * 0xc7afe638u;
			x ^= x * 0x8d22f6e6u;
			return x;

		}
	`),n=I`
		fn nestedUniformScrambleBase2_${e}( x: ${e}, seed: ${e} ) -> ${e} {

			var res = ${i}( x, seed );
			res = ${t}( res );
			return res;

		}
	`;return{reverseBits:t,hashCombine:r,lkPermutation:i,scramble:n}},Ie=Array.from({length:5},(a,e)=>tu(e)),ru=I`
  	${[eu]}
	fn generateSobolPoint( id: u32 ) -> vec4f {

		var index = id;
		if ( index >= ${En} ) {

			index = index % ${En};
			// return vec4( 0.0 );

		}

		// NOTE: this sobol "direction" is also available but we can't write out 5 components
		// uint x = index & 0x00ffffffu;
		let x = ${Ie[1].reverseBits}( ${Xr}( index, SOBOL_DIRECTIONS_1 ) ) & 0x00ffffffu;
		let y = ${Ie[1].reverseBits}( ${Xr}( index, SOBOL_DIRECTIONS_2 ) ) & 0x00ffffffu;
		let z = ${Ie[1].reverseBits}( ${Xr}( index, SOBOL_DIRECTIONS_3 ) ) & 0x00ffffffu;
		let w = ${Ie[1].reverseBits}( ${Xr}( index, SOBOL_DIRECTIONS_4 ) ) & 0x00ffffffu;

		return vec4( f32( x ), f32( y ), f32( z ), f32( w ) ) * ${Ga};

	}
`,kn=M(`
	fn sobolHash( in: u32 ) -> u32 {

		var x = in;
		// finalizer from murmurhash3
		x ^= x >> 16;
		x *= 0x85ebca6bu;
		x ^= x >> 13;
		x *= 0xc2b2ae35u;
		x ^= x >> 16;
		return x;

	}
`),iu=I`
	fn sobolGetSeed( effect: u32 ) -> u32 {

		return ${kn}(
			${Ie[1].hashCombine}(
				${Ie[1].hashCombine}(
					${kn}( ${Fs} ),
					${Ka}
				),
				effect
			)
		);

	}
`,Si=(a=1,e=ru)=>{if(a<=0)return;const t=a>1?`vec${a}u`:"u32",r=a>1?`vec${a}f`:"f32";let i=".r",n="1u";return a===2?(i=".rg",n="vec2( 1u, 2u )"):a===3?(i=".rgb",n="vec3( 1u, 2u, 3u )"):a===4&&(i="",n="vec4( 1u, 2u, 3u, 4u )"),I`
		fn sobol${a}( effect: u32 ) -> ${r} {

			let seed = ${iu}( effect );
			let index = ${Xa};

			let shuffle_seed = ${Ie[1].hashCombine}( seed, 0u );
			let shuffled_index = ${Ie[1].scramble}( ${Ie[1].reverseBits}( index ), shuffle_seed );
			let sobol_pt = ${e}( shuffled_index )${i};
			var result = ${t}( sobol_pt * 16777216.0 );

			let seed2 = ${Ie[a].hashCombine}( seed, ${n} );
			result = ${Ie[a].scramble}( result, seed2 );

			return ${Ga} * ${r}( result >> ${t}( 8 ) );

		}
	`},Ya=Si(1),Za=Si(2),Ja=Si(3),Ns=Si(4),Ls=I`
	fn sobolInit( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		${Ka} = ( pixel.x << 16 ) | pixel.y;
		${Xa} = pathIndex;
		${Fs} = bounceIndex;

	}
`,zs=I`
	fn sobolNextBounce() -> void {

		${Fs}++;

	}
`,su=Object.freeze(Object.defineProperty({__proto__:null,rand1:Ya,rand2:Za,rand3:Ja,rand4:Ns,rngInit:Ls,rngNextBounce:zs},Symbol.toStringTag,{value:"Module"})),eo=0,to=1,nu=2,ro=3,au=4,io=5,so=6,no=7,ao=8,oo=9,lo=50,xt=ue("random.rngInit",Ls),ni=ue("random.rngNextBounce",zs),mt=ue("random.rand1",Ya),Ae=ue("random.rand2",Za),Es=ue("random.rand3",Ja);ue("random.rand4",Ns);const ou=M(`

	fn inverse(m: mat3x3f) -> mat3x3f {
		var adj: mat3x3f;
		adj[0][0] =   (m[1][1] * m[2][2] - m[2][1] * m[1][2]);
		adj[1][0] = - (m[1][0] * m[2][2] - m[2][0] * m[1][2]);
		adj[2][0] =   (m[1][0] * m[2][1] - m[2][0] * m[1][1]);
		adj[0][1] = - (m[0][1] * m[2][2] - m[2][1] * m[0][2]);
		adj[1][1] =   (m[0][0] * m[2][2] - m[2][0] * m[0][2]);
		adj[2][1] = - (m[0][0] * m[2][1] - m[2][0] * m[0][1]);
		adj[0][2] =   (m[0][1] * m[1][2] - m[1][1] * m[0][2]);
		adj[1][2] = - (m[0][0] * m[1][2] - m[1][0] * m[0][2]);
		adj[2][2] =   (m[0][0] * m[1][1] - m[1][0] * m[0][1]);

		let det = ( m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
			- m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
			+ m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]));

		return adj * ( 1.0 / det );
	}

`),lu=M(`

	fn getBasisFromNormal( normal: vec3f ) -> mat3x3f {

		var other: vec3f;
		if ( abs( normal.x ) > 0.5 ) {

			other = vec3f( 0.0, 1.0, 0.0 );

		} else {

			other = vec3f( 1.0, 0.0, 0.0 );

		}

		let ortho = normalize( cross( normal, other ) );
		let ortho2 = normalize( cross( normal, ortho ) );
		return mat3x3f( ortho2, ortho, normal );

	}

`),Ne=M(`

	fn iorToF0( ior: f32 ) -> f32 {
		return pow( ( 1 - ior ) / ( 1 + ior ), 2 );
	}

`),cu=M(`

	fn iorToF0General( transmittedIor: f32, incidentIor: f32 ) -> f32 {

		return pow( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ), 2 );

	}

`),uu=M(`

	fn iorToF0GeneralVec( transmittedIor: vec3f, incidentIor: vec3f ) -> vec3f {

		let v = ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor );
		return v * v;

	}

`),du=M(`

	fn fresnel0ToIor( f0: vec3f ) -> vec3f {

		let sqrtF0 = sqrt( f0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );

	}

`),St=M(`

	fn schlickFresnel( cosine: f32, f0: f32 ) -> f32 {

		return f0 + ( 1.0 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),Ti=M(`

	fn schlickFresnelVec( cosine: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),ks=M(`

	fn totalInternalReflection( cosTheta: f32, eta: f32 ) -> bool {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > 1.0;

	}

`),fu=M(`

	fn totalInternalReflectionVec( cosTheta: f32, eta: vec3f ) -> vec3<bool> {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > vec3f( 1.0 );

	}

`);M(`

	fn evaluateFresnel( cosine: f32, eta: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		if ( totalInternalReflection( cosine, eta ) ) {

			return f90;

		}

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );
	}

`,[ks]);const Ir=M(`

	fn dielectricFresnel( cosThetaI: f32, eta: f32 ) -> f32 {

		// https://schuttejoe.github.io/post/disneybsdf/
		let ni = eta;
		let nt = 1.0;

		// Check for total internal reflection
		let sinThetaISq = 1.0 - cosThetaI * cosThetaI;
		let sinThetaTSq = eta * eta * sinThetaISq;
		if ( sinThetaTSq >= 1.0 ) {

			return 1.0;

		}

		let sinThetaT = sqrt( sinThetaTSq );
		let cosThetaT = sqrt( max( 0.0, 1.0 - sinThetaT * sinThetaT ) );
		let rParallel = ( ( nt * cosThetaI ) - ( ni * cosThetaT ) ) / ( ( nt * cosThetaI ) + ( ni * cosThetaT ) );
		let rPerpendicular = ( ( ni * cosThetaI ) - ( nt * cosThetaT ) ) / ( ( ni * cosThetaI ) + ( nt * cosThetaT ) );
		return ( rParallel * rParallel + rPerpendicular * rPerpendicular ) / 2.0;

	}

`),hu=M(`

	fn disneyFresnel( wo: vec3f, wi: vec3f, wh: vec3f, f0: f32, eta: f32, metalness: f32 ) -> f32 {

		let dotHV = dot( wo, wh );
		if ( totalInternalReflection( dotHV, eta ) ) {

			return 1.0;

		}

		let dotHL = dot( wi, wh );
		let dielectricF = dielectricFresnel( abs( dotHV ), eta );
		let metallicF = schlickFresnel( dotHL, f0 );

		return mix( dielectricF, metallicF, metalness );

	}

`,[ks,Ir,St]),Hs=M(`

	fn isTerminatingScatter( scatterRec: ScatterRecord ) -> bool {

		return scatterRec.pdf <= 0;

	}

`,[dt]),re=M(`

	fn clampPathContribution( contribution: vec3f, pathDepth: u32, clampDirect: f32, clampIndirect: f32 ) -> vec3f {

		let limit = select( clampIndirect, clampDirect, pathDepth <= 1u ) * 3.0;
		if ( limit <= 0.0 ) {

			return contribution;

		}

		let strength = dot( abs( contribution ), vec3f( 1.0 ) );
		if ( strength > limit ) {

			return contribution * ( limit / strength );

		}

		return contribution;

	}

`),Hn=M(`

	fn applyWrap( v: f32, wrapMode: i32 ) -> f32 {

		var res = v;
		if ( wrapMode == 1 ) {

			// ClampToEdge
			res = clamp( res, 0.0, 1.0 );

		} else if ( wrapMode == 2 ) {

			// MirroredRepeat
			res = 1.0 - abs( 2.0 * fract( res * 0.5 ) - 1.0 );

		} else {

			// Repeat
			res = fract( res );

		}

		return res;

	}

`),ht=M(`

	fn offsetRayOrigin( point: vec3f, direction: vec3f, geometricNormal: vec3f ) -> vec3f {

		let normal = normalize( select( -geometricNormal, geometricNormal, dot( direction, geometricNormal ) >= 0.0 ) );
		let intScale = 256.0;
		let integerOffset = vec3i( intScale * normal );
		let pointBits = bitcast<vec3i>( point );
		let signedOffset = select( integerOffset, -integerOffset, point < vec3f( 0.0 ) );
		let offsetPoint = bitcast<vec3f>( pointBits + signedOffset );
		let origin = 1.0 / 32.0;
		let floatScale = 1.0 / 65536.0;
		return select( offsetPoint, point + floatScale * normal, abs( point ) < vec3f( origin ) );

	}

`),Yr=M(`

	fn wrapTexelIndex( i: i32, size: i32, wrapMode: i32 ) -> i32 {

		if ( wrapMode == 0 ) {

			// Repeat wraps to the opposite edge
			return ( ( i % size ) + size ) % size;

		}

		// ClampToEdge and MirroredRepeat both fold back onto the edge texel
		return clamp( i, 0, size - 1 );

	}

`),co=(a,e,t="sampleTexel")=>I`

	fn ${t}( uv: vec2f, packed: i32, lod: f32 ) -> vec4f {

		let texIndex = packed & 0x7FFFFF;
		let wrapS    = ( packed >> 26 ) & 0x3;
		let wrapT    = ( packed >> 28 ) & 0x3;
		let nearest  = ( packed >> 30 ) & 0x1;

		// look up the texture's rect and page within the atlas. three wraps a
		// uniformArray in a struct ( textureInfoStruct ) with a "value" array member.
		let info   = ${a}[ u32( texIndex ) ];
		let offset = vec2f( vec2u( info.x & 0xFFFFu, info.x >> 16u ) );
		let size   = vec2f( vec2u( info.y & 0xFFFFu, info.y >> 16u ) );
		let page   = i32( info.z & 0xFFFFu );

		// wrap is applied on the logical uv first, then remapped into the tile
		let wrappedUv = vec2f(
			${Hn}( uv.x, wrapS ),
			${Hn}( uv.y, wrapT ),
		);

		if ( nearest == 1 ) {

			let tileTexel = clamp( vec2i( wrappedUv * size ), vec2i( 0 ), vec2i( size ) - vec2i( 1 ) );
			return textureLoad( ${e}, vec2i( offset ) + tileTexel, page, 0 );

		} else {

			// The tile's neighbors in the atlas are unrelated textures, so hardware
			// filtering cannot supply the taps that fall outside it. Filter here instead
			// and resolve each tap through the wrap mode.
			let texelPos = wrappedUv * size - vec2f( 0.5 );
			let basePos = floor( texelPos );
			let base = vec2i( basePos );
			let f = texelPos - basePos;

			let intSize = vec2i( size );
			let x0 = ${Yr}( base.x,     intSize.x, wrapS );
			let x1 = ${Yr}( base.x + 1, intSize.x, wrapS );
			let y0 = ${Yr}( base.y,     intSize.y, wrapT );
			let y1 = ${Yr}( base.y + 1, intSize.y, wrapT );

			let tile = vec2i( offset );
			let c00 = textureLoad( ${e}, tile + vec2i( x0, y0 ), page, 0 );
			let c10 = textureLoad( ${e}, tile + vec2i( x1, y0 ), page, 0 );
			let c01 = textureLoad( ${e}, tile + vec2i( x0, y1 ), page, 0 );
			let c11 = textureLoad( ${e}, tile + vec2i( x1, y1 ), page, 0 );

			return mix(
				mix( c00, c10, f.x ),
				mix( c01, c11, f.x ),
				f.y,
			);

		}

	}
`,pu=M(`

	fn sampleSphere( uv: vec2f ) -> vec3f {

		let u = ( uv.x - 0.5 ) * 2.0;
		let t = uv.y * PI * 2.0;
		let f = sqrt( 1.0 - u * u );

		return vec3f( f * cos( t ), f * sin( t ), u );

	}

`,[q]),mu=M(`

	fn diffuseDirection( wo: vec3f, uv: vec2f ) -> vec3f {

		var lightDirection = sampleSphere( uv );
		lightDirection.z += 1.0;
		lightDirection = normalize( lightDirection );

		return lightDirection;

	}

`,[pu]),Un=M(`

	fn getLobeWeights( wo: vec3f, wi: vec3f, woClearcoat: vec3f, wh: vec3f, clearcoatIor: f32, surf: SurfaceRecord ) -> LobeWeights {

		var weights: LobeWeights;
		var remaining = 1.0;

		let clearcoatF0 = iorToF0( clearcoatIor );
		let clearcoatFresnel = schlickFresnel( saturate( woClearcoat.z ), clearcoatF0 );
		weights.clearcoat = surf.clearcoat * clearcoatFresnel;
		remaining -= weights.clearcoat;

		// this specular lobe only handles the opaque portion of the specular
		let fEstimate = disneyFresnel( wo, wi, wh, surf.f0, surf.eta, surf.metalness );
		weights.specular = remaining * ( surf.metalness + ( 1.0 - surf.metalness ) * ( 1.0 - surf.transmission ) * fEstimate );
		remaining -= weights.specular;

		// the transmission lobe covers both the reflected and refracted halves of the transmissive portion
		weights.transmission = remaining * surf.transmission;
		remaining -= weights.transmission;

		weights.diffuse = remaining;

		return weights;

	}

`,[hu,St,Ne,Yc,q]),fi=M(`

	fn equirectDirectionToUv(direction: vec3f) -> vec2f {

		// from Spherical.setFromCartesianCoords
		var uv = vec2f( atan2( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2f( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

`),gu=M(`

	fn sampleHemisphere( n: vec3f, uv: vec2f ) -> vec3f {

		// https://www.rorydriscoll.com/2009/01/07/better-sampling/
		// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
		let sign = select( sign( n.z ), 1.0, n.z == 0.0 );
		let a = - 1.0 / ( sign + n.z );
		let b = n.x * n.y * a;
		let b1 = vec3( 1.0 + sign * n.x * n.x * a, sign * b, - sign * n.x );
		let b2 = vec3( b, sign + n.y * n.y * a, - n.y );

		let r = sqrt( uv.x );
		let theta = 2.0 * PI * uv.y;
		let x = r * cos( theta );
		let y = r * sin( theta );
		return x * b1 + y * b2 + sqrt( 1.0 - uv.x ) * n;

	}

`,[q]),xu=.001,uo=M(`

	fn sampleHenyeyGreenstein( d: vec3f, g: f32, uv: vec2f ) -> vec3f {

		var cosTheta = 1.0 - 2.0 * uv.x;
		if ( abs( g ) > ${xu} ) {

			let sqrTerm = ( 1.0 - g * g ) / ( 1.0 - g + 2.0 * g * uv.x );
			cosTheta = clamp( ( 1.0 + g * g - sqrTerm * sqrTerm ) / ( 2.0 * g ), - 1.0, 1.0 );

		}

		// orthonormal basis around "d", from https://graphics.pixar.com/library/OrthonormalB/paper.pdf
		let sign = select( sign( d.z ), 1.0, d.z == 0.0 );
		let a = - 1.0 / ( sign + d.z );
		let b = d.x * d.y * a;
		let b1 = vec3( 1.0 + sign * d.x * d.x * a, sign * b, - sign * d.x );
		let b2 = vec3( b, sign + d.y * d.y * a, - d.y );

		let sinTheta = sqrt( max( 0.0, 1.0 - cosTheta * cosTheta ) );
		let phi = 2.0 * PI * uv.y;
		return normalize( sinTheta * cos( phi ) * b1 + sinTheta * sin( phi ) * b2 + cosTheta * d );

	}

`,[q]),et=M(`

	fn misHeuristic( a: f32, b: f32 ) -> f32 {

		// computed as a ratio so squaring large pdfs can't overflow to Inf / Inf
		if ( a >= b ) {

			let r = b / a;
			return 1.0 / ( 1.0 + r * r );

		}

		let r = a / b;
		return r * r / ( 1.0 + r * r );

	}

`),yu=M(`

	fn luminance( color: vec3f ) -> f32 {

		return dot( color, vec3f( 0.2126, 0.7152, 0.0722 ) );

	}

`),vu=M(`

	fn equirectUvToDirection( uvIn: vec2f ) -> vec3f {

		// undo the adjustments applied in equirectDirectionToUv
		var uv = uvIn;
		uv.x -= 0.5;
		uv.y = 1.0 - uv.y;

		let theta = uv.x * 2.0 * PI;
		let phi = uv.y * PI;
		let sinPhi = sin( phi );

		return vec3f( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

	}

`,[q]);M(`

	fn equirectDirectionPdf( direction: vec3f ) -> f32 {

		let uv = equirectDirectionToUv( direction );
		let theta = uv.y * PI;
		let sinTheta = sin( theta );
		if ( sinTheta == 0.0 ) {

			return 0.0;

		}

		return 1.0 / ( 2.0 * PI * PI * sinTheta );

	}

`,[q,fi]);const fo=M(`

	fn weightedAlphaBlend( prevColor: vec4f, newColor: vec4f, weight: f32 ) -> vec4f {

		let invWeight = 1.0 - weight;
		let totalAlpha = prevColor.a * invWeight + newColor.a * weight;
		var blendedColor = vec4f( 0 );
		if ( totalAlpha != 0.0 ) {

			let prevContrib = prevColor.rgb * invWeight * prevColor.a / totalAlpha;
			let resContrib = newColor.rgb * weight * newColor.a / totalAlpha;
			blendedColor = vec4f( prevContrib + resContrib, totalAlpha );

		}

		return blendedColor;

	}

`),Us=0,Vs=1,Vn=2,On=3,Wn=4,Os=5,yt=1e30,ho=1e-5,po=M(`

	fn isMISWeightLight( lightType: i32 ) -> bool {

		return lightType == ${Os} || lightType == ${Vs} || lightType == ${Us};

	}

`),qn=M(`

	fn getSpotAttenuation( coneCosine: f32, penumbraCosine: f32, angleCosine: f32 ) -> f32 {

		return smoothstep( coneCosine, penumbraCosine, angleCosine );

	}

`),xs=M(`

	fn getDistanceAttenuation( lightDistance: f32, cutoffDistance: f32, decayExponent: f32 ) -> f32 {

		// based upon Frostbite 3 Moving to Physically-based Rendering
		// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
		var distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), EPSILON );
		if ( cutoffDistance > 0.0 ) {

			let window = clamp( 1.0 - pow( lightDistance / cutoffDistance, 4.0 ), 0.0, 1.0 );
			distanceFalloff *= window * window;

		}

		return distanceFalloff;

	}

`,[q]),bu=M(`

	fn intersectsRectangle( center: vec3f, normal: vec3f, u: vec3f, v: vec3f, rayOrigin: vec3f, rayDirection: vec3f ) -> f32 {

		let t = dot( center - rayOrigin, normal ) / dot( rayDirection, normal );
		if ( t > EPSILON ) {

			let p = rayOrigin + rayDirection * t;
			let vi = p - center;

			let a1 = dot( u, vi );
			if ( abs( a1 ) <= 0.5 ) {

				let a2 = dot( v, vi );
				if ( abs( a2 ) <= 0.5 ) {

					return t;

				}

			}

		}

		return - 1.0;

	}

`,[q]),wu=M(`

	fn intersectsCircle( position: vec3f, normal: vec3f, u: vec3f, v: vec3f, rayOrigin: vec3f, rayDirection: vec3f ) -> f32 {

		let t = dot( position - rayOrigin, normal ) / dot( rayDirection, normal );
		if ( t > EPSILON ) {

			let hit = rayOrigin + rayDirection * t;
			let vi = hit - position;

			let a1 = dot( u, vi );
			let a2 = dot( v, vi );
			if ( length( vec2f( a1, a2 ) ) <= 0.5 ) {

				return t;

			}

		}

		return - 1.0;

	}

`,[q]),Su=M(`

	fn randomAreaLightSample( light: Light, rayOrigin: vec3f, ruv: vec2f ) -> LightRecord {

		var randomPos = vec3f( 0.0 );
		if ( light.lightType == ${Us} ) {

			randomPos = light.position + light.u * ( ruv.x - 0.5 ) + light.v * ( ruv.y - 0.5 );

		} else if ( light.lightType == ${Vs} ) {

			let r = 0.5 * sqrt( ruv.x );
			let theta = ruv.y * 2.0 * PI;
			randomPos = light.position + light.u * ( r * cos( theta ) ) + light.v * ( r * sin( theta ) );

		}

		let toLight = randomPos - rayOrigin;
		let lightDistSq = dot( toLight, toLight );
		let dist = sqrt( lightDistSq );
		let direction = toLight / dist;
		let lightNormal = normalize( cross( light.u, light.v ) );

		var lightRec: LightRecord;
		lightRec.lightType = light.lightType;
		lightRec.emission = light.color * light.intensity;
		lightRec.dist = dist;
		lightRec.direction = direction;

		// points behind or edge-on to the light receive no contribution
		let cosTheta = dot( direction, lightNormal );
		if ( cosTheta <= 0.0 ) {

			lightRec.pdf = 0.0;

		} else {

			lightRec.pdf = lightDistSq / ( light.area * cosTheta );

		}

		return lightRec;

	}

`,[ft,Oe,q]),Tu=M(`

	fn randomSpotLightSample( light: Light, rayOrigin: vec3f, ruv: vec2f ) -> LightRecord {

		let radius = light.radius * sqrt( ruv.x );
		let theta = ruv.y * 2.0 * PI;
		let x = radius * cos( theta );
		let y = radius * sin( theta );

		let u = light.u;
		let v = light.v;
		let normal = normalize( cross( u, v ) );

		let angle = acos( light.coneCos );
		let angleTan = tan( angle );
		let startDistance = light.radius / max( angleTan, EPSILON );

		let randomPos = light.position - normal * startDistance + u * x + v * y;
		let toLight = randomPos - rayOrigin;
		let lightDistSq = dot( toLight, toLight );
		let dist = sqrt( lightDistSq );

		let direction = toLight / max( dist, EPSILON );
		let distanceAttenuation = getDistanceAttenuation( dist, light.distance, light.decay );

		var lightRec: LightRecord;
		lightRec.lightType = light.lightType;
		lightRec.dist = dist;
		lightRec.direction = direction;
		lightRec.emission = light.color * light.intensity * distanceAttenuation;
		lightRec.pdf = 1.0;

		return lightRec;

	}

`,[ft,Oe,q,xs]),Iu=M(`

	fn getSpotLightNearest( light: Light, position: vec3f ) -> vec2f {

		let normal = normalize( cross( light.u, light.v ) );
		let startDistance = light.radius / max( tan( acos( light.coneCos ) ), EPSILON );
		let discCenter = light.position - normal * startDistance;

		let toPosition = position - discCenter;
		let along = dot( toPosition, - normal );
		let across = max( length( toPosition + normal * along ) - light.radius, 0.0 );
		let dist = length( vec2f( along, across ) );
		return vec2f( along / max( dist, EPSILON ), dist );

	}

`,[ft,q]),_u=1e-6,mo=1e-6,Qn=.999,rt=new O({inside:"bool",object:"uint",extinction:"vec3f",albedo:"vec3f",anisotropy:"float"},"Medium"),Qt=new O({extinction:"vec3f",object:"uint",albedo:"vec3f",anisotropy:"float",inside:"uint"},"MediumState"),Ru=I`

	fn storeMedium( medium: ${rt} ) -> ${Qt} {

		var state: ${Qt};
		state.extinction = medium.extinction;
		state.object = medium.object;
		state.albedo = medium.albedo;
		state.anisotropy = medium.anisotropy;
		state.inside = select( 0u, 1u, medium.inside );
		return state;

	}

`,go=I`

	fn loadMedium( state: ${Qt} ) -> ${rt} {

		var medium: ${rt};
		medium.inside = state.inside != 0u;
		medium.object = state.object;
		medium.extinction = state.extinction;
		medium.albedo = state.albedo;
		medium.anisotropy = state.anisotropy;
		return medium;

	}

`,Cu=I`

	fn singleScatterAlbedo( multiscatterAlbedo: vec3f, anisotropy: f32 ) -> vec3f {

		let a = multiscatterAlbedo;
		let s = clamp( 4.09712 + 4.20863 * a - sqrt( 9.59217 + 41.6808 * a + 17.7126 * a * a ), vec3f( 0.0 ), vec3f( 1.0 ) );
		let s2 = select( s * s, vec3f( 1.0 ), a <= vec3f( 0.0 ) );
		return ( 1.0 - s2 ) / ( 1.0 - anisotropy * s2 );

	}

`,xo=I`

	fn enterMedium( material: ${qa}, object: u32 ) -> ${rt} {

		let anisotropy = clamp( material.scatterAnisotropy, - ${Qn}, ${Qn} );

		var medium: ${rt};
		medium.extinction = - log( max( material.attenuationColor, vec3f( ${_u} ) ) ) / material.attenuationDistance;
		medium.albedo = ${Cu}( material.multiscatterColor * material.scatterStrength, anisotropy );
		medium.inside = any( medium.albedo > vec3f( 0.0 ) ) && any( medium.extinction > vec3f( 0.0 ) );
		medium.object = object;
		medium.anisotropy = anisotropy;
		return medium;

	}

`,yo=I`

	fn mediumChannelPdf( throughput: vec3f, albedo: vec3f ) -> vec3f {

		let weights = abs( throughput * albedo );
		let weightSum = weights.r + weights.g + weights.b;
		if ( weightSum > 0.0 ) {

			return weights / weightSum;

		}

		return vec3f( 1.0 / 3.0 );

	}

`,vo=I`

	fn sampleMediumDistance( medium: ${rt}, channelPdf: vec3f, u: vec2f ) -> f32 {

		var channel = 2u;
		if ( u.x < channelPdf.r ) {

			channel = 0u;

		} else if ( u.x < channelPdf.r + channelPdf.g ) {

			channel = 1u;

		}

		// a channel with no extinction never scatters, and WGSL doesn't guarantee an infinite quotient
		let extinction = medium.extinction[ channel ];
		if ( extinction <= 0.0 ) {

			return ${yt};

		}

		return - log( 1.0 - u.y ) / extinction;

	}

`,bo=I`

	fn mediumDistancePdf( medium: ${rt}, dist: f32, scattered: bool ) -> vec3f {

		let transmittance = exp( - medium.extinction * dist );
		return select( transmittance, medium.extinction * transmittance, scattered );

	}

`,cr=M(`

	fn ggxDirection( incidentDir: vec3f, alpha: vec2f, uv: vec2f ) -> vec3f {

		// Implementation from reference [1]
		// stretch view
		let V = normalize( vec3f( alpha * incidentDir.xy, incidentDir.z ) );

		// orthonormal basis
		var T1: vec3f;
		if ( V.z < 0.9999 ) {

			T1 = normalize( cross( V, vec3( 0.0, 0.0, 1.0 ) ) );

		} else {

			T1 = vec3( 1.0, 0.0, 0.0 );

		}

		let T2 = cross( T1, V );

		// sample point with polar coordinates (r, phi)
		let a = 1.0 / ( 1.0 + V.z );
		let r = sqrt( uv.x );
		var phi: f32;
		if ( uv.y < a ) {

			phi = uv.y / a * PI;

		} else {

			phi = PI + ( uv.y - a ) / ( 1.0 - a ) * PI;

		}

		let P1 = r * cos( phi );
		var P2 = r * sin( phi );
		if ( uv.y >= a ) {

			P2 *= V.z;

		}

		// compute normal
		var N = P1 * T1 + P2 * T2 + V * sqrt( max( 0.0, 1.0 - P1 * P1 - P2 * P2 ) );

		// unstretch
		N = normalize( vec3( alpha * N.xy, max( 0.0, N.z ) ) );

		return N;

	}

`,[q]),Du=M(`

	fn ggxLambda( V: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		// abs v.z to support transmitted rays
		let NdotV = max( abs( V.z ), MIN_INCIDENT_COS );
		let cos2 = NdotV * NdotV;
		let t = ( alphaT * alphaT * V.x * V.x + alphaB * alphaB * V.y * V.y ) / cos2;
		let numerator = - 1.0 + sqrt( 1.0 + t );
		return numerator / 2.0;

	}

`,[q]),Ws=M(`

	fn ggxShadowMaskG1( V: vec3f, alpha: vec2f ) -> f32 {

		// TODO: this could be collapsed to a simpler form as an optimization
		return 1.0 / ( 1.0 + ggxLambda( V, alpha ) );

	}

`,[Du]),$u=M(`

	fn ggxSmithVisibility( V: vec3f, L: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let NdotL = max( L.z, MIN_INCIDENT_COS );

		let TdotV = V.x;
		let TdotL = L.x;

		let BdotV = V.y;
		let BdotL = L.y;

		let GGXV = NdotL * length( vec3f( alphaT * TdotV, alphaB * BdotV, NdotV ) );
		let GGXL = NdotV * length( vec3f( alphaT * TdotL, alphaB * BdotL, NdotL ) );

		return 0.5 / ( GGXV + GGXL );

	}

`,[q]),Ii=M(`

	fn ggxDistribution( H: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let NdotH = H.z;
		let TdotH = H.x;
		let BdotH = H.y;

		let a2 = alphaT * alphaB;
		let v = vec3f( alphaB * TdotH, alphaT * BdotH, a2 * NdotH );
		let v2 = dot( v, v );
		let w2 = a2 / v2;

		return a2 * w2 * w2 / PI;

	}

`,[q]),ur=M(`

	fn ggxReflectionAdjustedPDF( V: vec3f, H: vec3f, alpha: vec2f ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		return D * G1 / ( 4 * NdotV );

	}
`,[Ii,Ws]),wo=M(`

	fn ggxRefractionAdjustedPDF( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f, eta: f32 ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let HdotV = dot( V, H );
		let HdotL = dot( L, H );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		let denom = eta * HdotV + HdotL;
		return D * G1 * abs( HdotV ) * abs( HdotL ) / ( NdotV * denom * denom );

	}
`,[Ii,Ws]),Mu=I`

	fn ensureValidReflectionNormal( n: vec3f, ng: vec3f, i: vec3f ) -> vec3f {

		// reflected ray
		let R = 2.0 * dot( n, i ) * n - i;

		let Iz = dot( i, ng );

		// reflection rays may always be at least as shallow as the incoming ray
		let threshold = min( 0.9 * Iz, 0.01 );
		if ( dot( ng, R ) >= threshold ) {

			return n;

		}

		// Form coordinate system with Ng as the Z axis and N inside the X-Z-plane.
   		// The X axis is found by normalizing the component of N that's orthogonal to Ng.
   		// The Y axis isn't actually needed.
		let orthoN = n - dot( n, ng ) * ng;
		let orthoLen = length( orthoN );
		let X = select( n, orthoN / orthoLen, orthoLen != 0.0 );

		// Calculate N.z and N.x in the local coordinate system.
		//
		// The goal of this computation is to find a N' that is rotated towards Ng just enough
   		// to lift R' above the threshold (here called t), therefore dot(R', Ng) = t.
		//
		// See the Blender implementation for a full description of the solution.
		let Ix = dot( i, X );

		let a = Ix * Ix + Iz * Iz;
		let b = 2.0 * ( a + Iz * threshold );
		let c = ( threshold + Iz ) * ( threshold + Iz );

		// only one root is valid; the sign of Ix selects it
		var Nz2: f32;
		if ( Ix < 0.0 ) {

			Nz2 = 0.25 * ( b + sqrt( max( b * b - 4.0 * a * c, 0.0 ) ) ) / a;

		} else {

			Nz2 = 0.25 * ( b - sqrt( max( b * b - 4.0 * a * c, 0.0 ) ) ) / a;

		}

		let Nx = sqrt( max( 1.0 - Nz2, 0.0 ) );
		let Nz = sqrt( max( Nz2, 0.0 ) );

		return Nx * X + Nz * ng;

	}

`,Pu=I`

	fn ensureValidViewNormal( n: vec3f, ng: vec3f, view: vec3f ) -> vec3f {

		// ensure the view is at least slightly above the surface normal hemisphere
		const MIN_VIEW_COS = 1e-6;

		// if we're positive already then early out
		let c = dot( n, view );
		if ( c > MIN_VIEW_COS ) {

			return n;

		}

		// perpendicular vector to normal and view
		var perp = n - c * view;
		let perpLen = length( perp );

		// if we reach here that means that he view is nearly the opposite direction and
		// we can't derive plan to rotate on towards the view, so just use the geometry
		// normal. This could likely only really happen with a severe normal map application.
		if ( perpLen <= 1e-6 ) {

			return ng;

		}

		perp = perp / perpLen;

		// rotate the normal to be at larger than the above threshold - pythagorean
		// theorem for generating normal with threshold*view component
		return MIN_VIEW_COS * view + sqrt( 1.0 - MIN_VIEW_COS * MIN_VIEW_COS ) * perp;

	}

`,So=3402823466e29,Bu=(a,e,t)=>M(`

	fn getSurfaceRecord(
		material: Material,
		vertexData: bvh_GeometryStruct,
		side: f32,
		faceNormal: vec3f,
		view: vec3f,
		blurRoughness: f32,
	) -> SurfaceRecord {

		// "faceNormal" is provided on the hit side so flip it back to the geometric side
		var normal = faceNormal * side;
		if ( material.flatShading == 0 ) {

			normal = normalize( vertexData.normal.xyz );

		}

		var baseNormal = normal;
		if ( material.normalMap != -1 ) {

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

				// TODO: consider re-orthonormalizing against the normal here since attribute
				// interpolation could result in drift.
				let tangent = normalize( vertexData.tangent.xyz );
				let bitangent = normalize( cross( baseNormal, tangent ) * vertexData.tangent.w );
				let vTBN = mat3x3f( tangent, bitangent, baseNormal );

				let uvPrime = material.normalMapTransform * vec3( getUvFromChannel( vertexData, material.normalMap ), 1.0 );
				var texNormal = sampleTexel( uvPrime.xy, material.normalMap, 0 ).xyz;
				texNormal = texNormal * 2.0 - 1.0;
				texNormal = texNormal * vec3f( material.normalScale, 1.0 );
				normal = normalize( vTBN * texNormal );

			}

		}

		normal *= side;

		normal = ensureValidViewNormal( normal, faceNormal, view );

		normal = ensureValidReflectionNormal( normal, faceNormal, view );

		var albedo = vec4( material.color, material.opacity );
		if ( material.vertexColors == 1 ) {

			albedo *= getColor( vertexData );

		}

		if ( material.map != -1 ) {

			let uvPrime = material.mapTransform * vec3f( getUvFromChannel( vertexData, material.map ), 1 );
			albedo *= sampleTexel( uvPrime.xy, material.map, 0 );

		}

		if ( material.alphaMap != -1 ) {

			let uvPrime = material.alphaMapTransform * vec3f( getUvFromChannel( vertexData, material.alphaMap ), 1 );
			albedo.a *= sampleTexel( uvPrime.xy, material.alphaMap, 0 ).g;

		}

		var roughness = material.roughness;
		if ( material.roughnessMap != -1 ) {

			let uvPrime = material.roughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.roughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.roughnessMap, 0 );
			roughness *= texColor.g;

		}

		var metalness = material.metalness;
		if ( material.metalnessMap != -1 ) {

			let uvPrime = material.metalnessMapTransform * vec3f( getUvFromChannel( vertexData, material.metalnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.metalnessMap, 0 );
			metalness *= texColor.b;

		}

		var emission = material.emissiveIntensity * material.emissive;
		if ( material.emissiveMap != -1 ) {

			let uvPrime = material.emissiveMapTransform * vec3f( getUvFromChannel( vertexData, material.emissiveMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.emissiveMap, 0 );
			emission *= texColor.rgb;

		}

		var transmission = material.transmission;
		if ( material.transmissionMap != -1 ) {

			let uvPrime = material.transmissionMapTransform * vec3f( getUvFromChannel( vertexData, material.transmissionMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.transmissionMap, 0 );
			transmission *= texColor.r;

		}

		var clearcoat = material.clearcoat;
		if ( material.clearcoatMap != -1 ) {

			let uvPrime = material.clearcoatMapTransform * vec3f( getUvFromChannel( vertexData, material.clearcoatMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.clearcoatMap, 0 );
			clearcoat *= texColor.r;

		}

		var clearcoatRoughness = material.clearcoatRoughness;
		if ( material.clearcoatRoughnessMap != -1 ) {

			let uvPrime = material.clearcoatRoughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.clearcoatRoughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.clearcoatRoughnessMap, 0 );
			clearcoatRoughness *= texColor.g;

		}

		var clearcoatNormal = baseNormal;
		if ( material.clearcoatNormalMap != -1 ) {

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

				// TODO: consider re-orthonormalizing against the normal here since attribute
				// interpolation could result in drift.
				let tangent = normalize( vertexData.tangent.xyz );
				let bitangent = normalize( cross( baseNormal, tangent ) * vertexData.tangent.w );
				let vTBN = mat3x3f( tangent, bitangent, baseNormal );

				let uvPrime = material.clearcoatNormalMapTransform * vec3( getUvFromChannel( vertexData, material.clearcoatNormalMap ), 1.0 );
				var texNormal = sampleTexel( uvPrime.xy, material.clearcoatNormalMap, 0 ).xyz;
				texNormal = texNormal * 2.0 - 1.0;
				texNormal = texNormal * vec3f( material.clearcoatNormalScale, 1.0 );
				clearcoatNormal = normalize( vTBN * texNormal );

			}

		}

		clearcoatNormal *= side;

		clearcoatNormal = ensureValidViewNormal( clearcoatNormal, faceNormal, view );

		clearcoatNormal = ensureValidReflectionNormal( clearcoatNormal, faceNormal, view );

		var sheenColor = material.sheenColor;
		if ( material.sheenColorMap != -1 ) {

			let uvPrime = material.sheenColorMapTransform * vec3f( getUvFromChannel( vertexData, material.sheenColorMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.sheenColorMap, 0 );
			sheenColor *= texColor.rgb;

		}

		var sheenRoughness = material.sheenRoughness;
		if ( material.sheenRoughnessMap != -1 ) {

			let uvPrime = material.sheenRoughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.sheenRoughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.sheenRoughnessMap, 0 );
			sheenRoughness *= texColor.r;

		}

		var iridescence = material.iridescence;
		if ( material.iridescenceMap != -1 ) {

			let uvPrime = material.iridescenceMapTransform * vec3f( getUvFromChannel( vertexData, material.iridescenceMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.iridescenceMap, 0 );
			iridescence *= texColor.r;

		}

		var iridescenceThickness = material.iridescenceThicknessMaximum;
		if ( material.iridescenceThicknessMap != -1 ) {

			let uvPrime = material.iridescenceThicknessMapTransform * vec3f( getUvFromChannel( vertexData, material.iridescenceThicknessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.iridescenceThicknessMap, 0 );

			iridescenceThickness = mix(
				material.iridescenceThicknessMinimum,
				material.iridescenceThicknessMaximum,
				texColor.g,
			);

		}

		var specularColor = material.specularColor;
		if ( material.specularColorMap != -1 ) {

			let uvPrime = material.specularColorMapTransform * vec3f( getUvFromChannel( vertexData, material.specularColorMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.specularColorMap, 0 );
			specularColor *= texColor.rgb;

		}

		var specularIntensity = material.specularIntensity;
		if ( material.specularIntensityMap != -1 ) {

			let uvPrime = material.specularIntensityMapTransform * vec3f( getUvFromChannel( vertexData, material.specularIntensityMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.specularIntensityMap, 0 );
			specularIntensity *= texColor.a;

		}

		// extract the anisotropy magnitude vector in tangent space
		var anisotropyDirVec = material.anisotropy * vec2f( cos( material.anisotropyRotation ), sin( material.anisotropyRotation ) );
		if ( material.anisotropyMap != -1 ) {

			let uvPrime = material.anisotropyMapTransform * vec3f( getUvFromChannel( vertexData, material.anisotropyMap ), 1.0 );
			let aniTex = sampleTexel( uvPrime.xy, material.anisotropyMap, 0 );

			// map rg encode the direction ([-1,1]), b the strength; rotate + scale by the material anisotropy.
			let mapDir = aniTex.rg * 2.0 - vec2f( 1.0 );
			let mapStr = aniTex.b;
			let mapLen = length( mapDir );
			if ( mapLen > EPSILON ) {

				anisotropyDirVec = mat2x2f(
					anisotropyDirVec.x, anisotropyDirVec.y,
					- anisotropyDirVec.y, anisotropyDirVec.x
				) * mapStr * mapDir / mapLen;

			}

		}

		// adjust the surface basis to be oriented along the anisotropic vector
		let anisotropyStrength = length( anisotropyDirVec );
		var surfaceBasis = getBasisFromNormal( normal );
		if ( anisotropyStrength > 0.0 && length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

			let anisotropyDir = anisotropyDirVec / anisotropyStrength;

			// re-orthonormalize the tangent against the shading normal so the frame stays orthonormal -
			// normal map adjustments will cause the normal and tangent to become non-orthonormal.
			let tangent = normalize( vertexData.tangent.xyz - normal * dot( normal, vertexData.tangent.xyz ) );
			let bitangent = cross( normal, tangent ) * vertexData.tangent.w;

			surfaceBasis = mat3x3f(
				tangent * anisotropyDir.x + bitangent * anisotropyDir.y,
				bitangent * anisotropyDir.x - tangent * anisotropyDir.y,
				normal
			);

		}

		var surf: SurfaceRecord;

		surf.volumeParticle = false;
		surf.faceNormal = faceNormal;
		surf.normal = normal;

		surf.metalness = metalness;
		surf.diffuseRoughness = material.diffuseRoughness;
		surf.color = albedo.rgb;
		surf.emission = emission;

		surf.opacity = select( 1.0, albedo.a, material.transparent != 0 );

		surf.ior = material.ior;
		surf.transmission = transmission;
		surf.thinWall = material.thinWall == 1;
		surf.attenuationColor = material.attenuationColor;
		surf.attenuationDistance = material.attenuationDistance;

		surf.clearcoatNormal = clearcoatNormal;
		surf.clearcoat = clearcoat;

		surf.iridescence = iridescence;
		surf.iridescenceIor = material.iridescenceIor;
		surf.iridescenceThickness = iridescenceThickness;

		surf.specularColor = specularColor;
		surf.specularIntensity = specularIntensity;

		surf.sheen = material.sheen;
		surf.sheenColor = sheenColor;

		let minRoughness = max( MIN_ROUGHNESS, blurRoughness );
		surf.roughness = clamp( roughness, minRoughness, 1.0 );
		surf.clearcoatRoughness = clamp( clearcoatRoughness, minRoughness, 1.0 );
		surf.sheenRoughness = clamp( sheenRoughness, minRoughness, 1.0 );
		surf.anisotropy = anisotropyStrength;

		// frontFace is used to determine transmissive properties and PDF. If no transmission is used
		// then we can just always assume this is a front face.
		surf.frontFace = side == 1.0 || transmission == 0.0;
		if ( material.thinWall == 1 || surf.frontFace ) {

			surf.eta = 1.0 / material.ior;

		} else {

			surf.eta = material.ior;

		}
		surf.f0 = iorToF0( surf.eta );

		// get the normal frames
		surf.normalBasis = surfaceBasis;
		surf.normalInvBasis = inverse( surf.normalBasis );

		surf.clearcoatBasis = getBasisFromNormal( surf.clearcoatNormal );
		surf.clearcoatInvBasis = inverse( surf.clearcoatBasis );

		return surf;
	}

`,[ou,Ne,lu,a,e,t,he,q,Mu,Pu]);M(`

	fn diffuseBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		// https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf
		// See equation (4)

		let fl = schlickFresnel( NdotL, 0.0 );
		let fv = schlickFresnel( NdotV, 0.0 );

		let alpha = surf.roughness * surf.roughness;
		let bias = mix( 0.0, 0.5, alpha ) - 1;
		let energyFactor = mix( 1.0, 1.0 / 1.51, alpha );

		let rr = 2.0 * alpha * VdotH * VdotH;
		let retro = rr * ( fl + fv + fl * fv * ( rr + 2.0 * bias ) );
		let fresnel = ( 1.0 + bias * fl ) * ( 1.0f + bias * fv );

		// TODO: subsurface approx?

		return energyFactor * ( surf.color / PI ) * ( retro + fresnel );

	}

`,[q,St,he]);M(`

	fn lambertBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		return surf.color / PI;

	}

`,[q,he]);const To=M(`

	fn specularBrdf( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f ) -> vec3f {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let Vis = ggxSmithVisibility( V, L, alpha );
		let D = ggxDistribution( H, alpha );

		return vec3f( D * Vis );

	}

`,[$u,Ii]),gr=M(`

	fn isMatchedIor( eta: f32 ) -> bool {

		return abs( eta - 1.0 ) < EPSILON;

	}

`,[q]),Io=M(`

	fn specularBtdf( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f, eta: f32 ) -> vec3f {

		let NdotV = V.z;
		let NdotL = L.z;
		let HdotV = dot( V, H );
		let HdotL = dot( L, H );

		// Heaviside function for G term
		if ( NdotV * HdotV < 0.0 || NdotL * HdotL < 0.0 || HdotV * HdotL > 0.0 ) {

			return vec3f( 0.0 );

		}

		let G1_i = ggxShadowMaskG1( V, alpha );
		let G1_o = ggxShadowMaskG1( L, alpha );

		// separable G2 product, no height correlation
		let denom = eta * HdotV + HdotL;
		let Vis = G1_i * G1_o * abs( HdotV ) * abs( HdotL ) /
			( abs( NdotV ) * abs( NdotL ) * denom * denom );

		let F = dielectricFresnel( abs( HdotV ), eta );

		let D = ggxDistribution( H, alpha );

		return vec3f( ( 1 - F ) * D * Vis );

	}

`,[Ws,Ii,Ir]),ji=M(`

	fn thinWallTransmissionRoughness( alpha: f32, eta: f32 ) -> f32 {

		let t = 3.4 * ( eta - 1.0 ) * ( eta - 0.5 ) * ( eta - 0.5 ) / ( eta * eta * eta );
		return saturate( alpha * sqrt( max( t, 0.0 ) ) );

	}

`),_o=M(`

	fn transmissionAttenuation( dist: f32, attColor: vec3f, attDist: f32 ) -> vec3f {

		return pow( attColor, vec3f( dist / attDist ) );

	}

`),_i=360,Ri=830,Au=M(`

	fn dispersionIor( ior: f32, dispersion: f32, wavelength: f32 ) -> f32 {

		let nd = max( ior, 1.0 );
		let scale = ( nd - 1.0 ) * max( dispersion, 0.0 ) / 20.0;
		let lambda = clamp( wavelength, ${_i}.0, ${Ri}.0 );
		return max( nd + scale * ( 523655.0 / ( lambda * lambda ) - 1.5168 ), 1.0 );

	}

`),Ro=I`

	fn applyDispersion( surf: ptr<function, ${he}>, dispersion: f32, wavelength: f32 ) -> void {

		surf.ior = ${Au}( surf.ior, dispersion, wavelength );
		surf.eta = select( surf.ior, 1.0 / surf.ior, surf.thinWall || surf.frontFace );
		surf.f0 = ${Ne}( surf.eta );

	}

`,Co=M(`

	fn dispersionColorWeight( wavelength: f32 ) -> vec3f {

		let lambda = clamp( wavelength, ${_i}.0, ${Ri}.0 );

		let x1 = ( lambda - 442.0 ) * select( 0.0374, 0.0624, lambda < 442.0 );
		let x2 = ( lambda - 599.8 ) * select( 0.0323, 0.0264, lambda < 599.8 );
		let x3 = ( lambda - 501.1 ) * select( 0.0382, 0.0490, lambda < 501.1 );
		let x = 0.362 * exp( - 0.5 * x1 * x1 ) + 1.056 * exp( - 0.5 * x2 * x2 ) - 0.065 * exp( - 0.5 * x3 * x3 );

		let y1 = ( lambda - 568.8 ) * select( 0.0247, 0.0213, lambda < 568.8 );
		let y2 = ( lambda - 530.9 ) * select( 0.0322, 0.0613, lambda < 530.9 );
		let y = 0.821 * exp( - 0.5 * y1 * y1 ) + 0.286 * exp( - 0.5 * y2 * y2 );

		let z1 = ( lambda - 437.0 ) * select( 0.0278, 0.0845, lambda < 437.0 );
		let z2 = ( lambda - 459.0 ) * select( 0.0725, 0.0385, lambda < 459.0 );
		let z = 1.217 * exp( - 0.5 * z1 * z1 ) + 0.681 * exp( - 0.5 * z2 * z2 );

		let linearRgb = max( vec3f(
			3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
			- 0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
			0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
		), vec3f( 0.0 ) );

		return linearRgb * vec3f( 2.6699448, 4.0708066, 4.2980494 );

	}

`),Fu=M(`

	fn fresnelMix( VdotH: f32, f0Color: vec3f, ior: f32, eta: f32, weight: f32, base: vec3f, layer: vec3f ) -> vec3f {

		var f0 = iorToF0( ior ) * f0Color;
		f0 = min( f0, vec3f( 1.0 ) );

		// reflect all light on total internal reflection, matching the WebGL evaluateFresnel function
		var fr = vec3f( 1.0 );
		if ( ! totalInternalReflection( abs( VdotH ), eta ) ) {

			fr = schlickFresnelVec( abs( VdotH ), f0, vec3f( 1.0 ) );

		}

		let maxFr = max( max( fr.r, fr.g ), fr.b );

		return ( 1.0 - weight * maxFr ) * base + weight * fr * layer;

	}

`,[Ti,Ne,ks]),Nu=el(3.2404542,-.969266,.0556434,-1.5371385,1.8760108,-.2040259,-.4985314,.041556,1.0572252),Lu=I`

	fn evalSensitivity( OPD: f32, shift: vec3f ) -> vec3f {

		let phase = 2.0 * ${Math.PI} * OPD * 1.0e-9;
		const val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
		const pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);
		const _var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);

		var xyz = val * sqrt(2.0 * ${Math.PI} * _var) * cos(pos * phase + shift) * exp(-phase * phase * _var);
		xyz.x += 9.7470e-14 * sqrt(2.0 * ${Math.PI} * 4.5282e+09) * cos(2.2399e+06 * phase + shift.x) * exp(-4.5282e+09 * phase * phase);
		xyz /= 1.0685e-7;

		let rgb = ${Nu} * xyz;
		return rgb;

	}

`,Do=M(`

	fn iridescentFresnel(
		cosTheta1: f32, baseF0: vec3f, iridescenceIor: f32,
		outsideIor: f32, iridescenceThickness: f32,
	) -> vec3f {

		let sinTheta2Sq = pow( outsideIor / iridescenceIor, 2.0 ) * ( 1.0 - pow( cosTheta1, 2.0 ) );
		let cosTheta2Sq = 1.0 - sinTheta2Sq;

		// Handle total internal reflection
		if ( cosTheta2Sq < 0.0 ) {

			return vec3( 1.0 );

		}

		let cosTheta2 = sqrt( cosTheta2Sq );

		// First interface: air -> iridescent thin film
		let R0 = iorToF0General( iridescenceIor, outsideIor );
		let R12 = schlickFresnel( cosTheta1, R0 );
		let R21 = R12;
		let T121 = 1.0 - R12;
		let phi12 = select( 0.0, PI, iridescenceIor < outsideIor );
		let phi21 = PI - phi12;

		// Second interface: iridescent thin film -> base material
		let baseIor = fresnel0ToIor( clamp( baseF0, vec3( 0.0 ), vec3( 0.9999 ) ) ); // guard against 1.0
		let R1 = iorToF0GeneralVec( baseIor, vec3( iridescenceIor ) );
		var R23 = schlickFresnelVec( cosTheta2, R1, vec3( 1.0 ) );

		// Handle total internal reflection at the film -> base interface
		// NOTE: Added separately from the original implementation. Is this correct?
		R23 = select( R23, vec3( 1.0 ), totalInternalReflectionVec( cosTheta2, vec3( iridescenceIor ) / baseIor ) );
		let phi23 = select( vec3( 0.0 ), vec3( PI ), baseIor < vec3( iridescenceIor ) );

		// Phase shift
		let OPD = 2.0 * iridescenceIor * iridescenceThickness * cosTheta2;
		let phi = vec3( phi21 ) + phi23;

		// Analytical integration
		// Compound terms
		let R123 = clamp( R12 * R23, vec3( 1e-5 ), vec3( 0.9999 ) );
		let r123 = sqrt( R123 );
		let Rs = T121 * T121 * R23 / ( vec3( 1.0 ) - R123 );

		// Reflectance term for m = 0 (DC term amplitude)
		let C0 = R12 + Rs;
		var I = C0;

		// Reflectance term for m > 0 (pairs of diracs)
		var Cm = Rs - T121;
		for (var m = 1; m <= 2; m += 1) {

			Cm *= r123;
			let Sm = 2.0 * evalSensitivity( f32( m ) * OPD, f32( m ) * phi );
			I += Cm * Sm;

		}

		return max( I, vec3(0.0) );

	}

`,[cu,uu,St,du,Lu,fu]),zu=(a=Do)=>I`

	fn transmissionFresnel( cosTheta: f32, surf: ${he} ) -> ${Nn} {

		var result: ${Nn};
		let cosine = saturate( abs( cosTheta ) );
		let matchedIor = ${gr}( surf.eta );
		let airIncident = surf.thinWall || surf.frontFace;
		let dielectricFresnel = ${Ir}( cosine, surf.eta );

		// Keep matched media transparent unless a real thin-film layer is present. This avoids
		// introducing the non-physical Schlick F90 reflection produced by KHR_materials_specular
		// when the substrate itself has no IOR boundary.
		var reflectance = vec3f( 0.0 );
		if ( ! matchedIor ) {

			let specularF0 = min( surf.f0 * surf.specularColor, vec3f( 1.0 ) );
			let dielectricReflectance = select(
				vec3f( dielectricFresnel ),
				${Ti}( cosine, specularF0, vec3f( 1.0 ) ),
				airIncident,
			);
			reflectance = surf.specularIntensity * dielectricReflectance;

		}

		reflectance = clamp( reflectance, vec3f( 0.0 ), vec3f( 1.0 ) );
		var transmittance = vec3f( 1.0 ) - reflectance;

		if ( surf.iridescence > 0.0 ) {

			// The media on either side of the film are air outside and the volume interior as
			// the base. Swap them on interior hits so film-interface TIR remains possible.
			let outsideIor = select( surf.ior, 1.0, airIncident );
			let filmBaseIor = select( 1.0, surf.ior, airIncident );
			let filmReflectance = clamp( ${a}(
				cosine,
				vec3f( ${Ne}( filmBaseIor ) ),
				surf.iridescenceIor,
				outsideIor,
				surf.iridescenceThickness,
			), vec3f( 0.0 ), vec3f( 1.0 ) );

			reflectance = mix( reflectance, filmReflectance, surf.iridescence );
			transmittance = mix( transmittance, vec3f( 1.0 ) - filmReflectance, surf.iridescence );

		}

		result.reflectance = reflectance;
		result.transmittance = transmittance;

		// Include the base-color tint in the transmission energy, as Cycles does when it
		// computes the glass reflection probability from its two tinted coefficients.
		let reflectEnergy = dot( reflectance, vec3f( 1.0 / 3.0 ) );
		let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
		let transmitEnergy = dot( transmittance * transmissionTint, vec3f( 1.0 / 3.0 ) );
		let totalEnergy = reflectEnergy + transmitEnergy;
		result.reflectProbability = select( 0.0, reflectEnergy / max( totalEnergy, EPSILON ), totalEnergy > EPSILON );

		return result;

	}

`,Eu=M(`

	fn conductorFresnel( VdotH: f32, f0: vec3f, specular: vec3f ) -> vec3f {

		return specular * schlickFresnelVec( abs( VdotH ), f0, vec3f( 1 ) );

	}

`,[Ti]),ku=M(`

	fn fresnelCoat( VdotNc: f32, ior: f32, base: vec3f, layer: vec3f, weight: f32 ) -> vec3f {

		let f0 = iorToF0( ior );
		let F = schlickFresnel( abs( VdotNc ), f0 );

		return mix( base, layer, weight * F );

	}

`,[Ne,St]),Hu=a=>I`

	fn albedo(
		eta: f32,
		includeFresnel: bool,
		includeRefraction: bool,
		globalId: vec3u,
		layer: u32,
	) -> void {

		// The matched-IOR limit is a unit-energy delta transmission event, so it cannot
		// be integrated with the rough BTDF below.
		if ( includeRefraction && ${gr}( eta ) ) {

			textureStore( ${a}, vec3( globalId.xy, layer ), vec4( 1.0 ) );
			return;

		}

		// sample the brdf directions in a grid pattern
		const GRID_SIZE = 64u;

		// TODO: this sampling means that energy at 0.0 & 1.0 roughness (and 0 and 90deg cos) are never
		// written to the texture due to the half texel inset, resulting in small, though possibly noticeable,
		// error in common cases.
		let dimensions = textureDimensions( ${a} ).xy;
		let uv = ( vec2f( globalId.xy ) + vec2f( 0.5 ) ) / vec2f( dimensions );

		let cosThetaO = uv.x;
		let roughness = uv.y;
		let alpha = roughness * roughness;

		let wo = vec3( sqrt( 1 - cosThetaO * cosThetaO ), 0 , cosThetaO );

		let f0 = ${Ne}( eta );

		var result = 0.0;
		for ( var x = 0u; x < GRID_SIZE; x++ ) {

			for ( var y = 0u; y < GRID_SIZE; y++ ) {

				// calculate the half vector to sample
				let gridPoint = vec2f( vec2u( x, y ) ) + vec2f( 0.5 );
				let sampleUv = gridPoint / f32( GRID_SIZE );
				let wh = ${cr}( wo, vec2( alpha ), sampleUv );

				var f = 1.0;
				if ( includeFresnel ) {

					// use the exact dielectric fresnel so the table agrees with the fresnel used
					// for lobe sampling
					f = ${Ir}( dot( wo, wh ), eta );

				}

				// air-incident reflection is evaluated with schlick in bsdfEval - only the
				// volume-incident ( TIR ) glass reflection uses the exact fresnel
				var reflectionF = f;
				if ( eta < 1.0 ) {

					reflectionF = ${St}( dot( wo, wh ), f0 );

				}

				// reflection lobe - samples landing below the surface are lost
				let wi = - reflect( wo, wh );
				let reflectionPdf = ${ur}( wo, wh, vec2f( alpha ) );
				if ( wi.z > 0.0 && reflectionPdf != 0.0 ) {

					let specular = ${To}( wo, wi, wh, vec2f( alpha ) );
					result += reflectionF * specular.x * wi.z / reflectionPdf;

				}

				// refraction lobe - the btdf carries its own ( 1 - F ) fresnel weight, and
				// samples landing back above the surface are lost
				if ( includeRefraction ) {

					let wiRefract = refract( - wo, wh, eta );
					if ( wiRefract.z < 0.0 ) {

						let transmission = ${Io}( wo, wiRefract, wh, vec2f( alpha ), eta );
						let pdf = ${wo}( wo, wiRefract, wh, vec2f( alpha ), eta );
						if ( pdf != 0.0 ) {

							result += transmission.x * abs( wiRefract.z ) / pdf;

						}

					}

				}

			}

		}

		result /= f32( GRID_SIZE * GRID_SIZE );

		textureStore( ${a}, vec3( globalId.xy, layer ), vec4( result ) );

	}

`,_r=wr(`

	struct PcgState {
		s0: vec4u,
		s1: vec4u,
	};

	var<private> g_state: PcgState;
`),Uu=M(`
	fn pcgInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		// white noise seed
		g_state.s0 = vec4u( pixel | vec2( bounceIndex << 16 ), pathIndex, pixel.x + pixel.y);

		// blue noise seed
		g_state.s1 = vec4u( pathIndex, pathIndex * 15843, pathIndex * 31 + 4566, pathIndex * 2345 + 58585 );

	}
`,[_r]),Ci=M(`
	fn pcg4d( v: ptr<private, vec4u> ) -> void {

		*v = *v * 1664525u + 1013904223u;
		*v = *v + v.yzxy * v.wxyz;
		*v = *v ^ ( *v >> vec4u( 16u ) );
		*v = *v + v.yzxy * v.wxyz;
	}
`),Vu=M(`
	fn pcgRand( _id: u32 ) -> f32 {

		pcg4d( &g_state.s0 );
		return abs( f32( g_state.s0.x ) / f32( 0xffffffffu ) );

	}
`,[Ci,_r]),Ou=M(`
	fn pcgRand2( _id: u32 ) -> vec2f {

		pcg4d( &g_state.s0 );
		return abs( vec2f( g_state.s0.xy ) / f32( 0xffffffffu ) );

	}
`,[Ci,_r]),Wu=M(`
	fn pcgRand3( _id: u32 ) -> vec3f {

		pcg4d( &g_state.s0 );
		return abs( vec3f( g_state.s0.xyz ) / f32( 0xffffffffu ) );

	}
`,[Ci,_r]),qu=M(`
	fn pcgRand4( _id: u32 ) -> vec4f {

		pcg4d( &g_state.s0 );
		return abs( vec4f( g_state.s0 ) / f32( 0xffffffffu ) );

	}
`,[Ci,_r]),Qu=M("fn noop() -> void {}"),ju=Object.freeze(Object.defineProperty({__proto__:null,rand1:Vu,rand2:Ou,rand3:Wu,rand4:qu,rngInit:Uu,rngNextBounce:Qu},Symbol.toStringTag,{value:"Module"}));function Gu(a,e=Math.random){for(let t=a.length-1;t>0;t--){const r=~~((e()-1e-6)*t),i=a[t];a[t]=a[r],a[r]=i}}function Ku(a,e){a.fill(0);for(let t=0;t<e;t++)a[t]=1}class jn{constructor(e){this.count=0,this.size=-1,this.sigma=-1,this.radius=-1,this.lookupTable=null,this.score=null,this.binaryPattern=null,this.resize(e),this.setSigma(1.5)}findVoid(){const{score:e,binaryPattern:t}=this;let r=1/0,i=-1;for(let n=0,s=t.length;n<s;n++){if(t[n]!==0)continue;const o=e[n];o<r&&(r=o,i=n)}return i}findCluster(){const{score:e,binaryPattern:t}=this;let r=-1/0,i=-1;for(let n=0,s=t.length;n<s;n++){if(t[n]!==1)continue;const o=e[n];o>r&&(r=o,i=n)}return i}setSigma(e){if(e===this.sigma)return;const t=~~(Math.sqrt(20*e**2)+1),r=2*t+1,i=new Float32Array(r*r),n=e*e;for(let s=-t;s<=t;s++)for(let o=-t;o<=t;o++){const l=(t+o)*r+s+t,d=s*s+o*o;i[l]=Math.E**(-d/(2*n))}this.lookupTable=i,this.sigma=e,this.radius=t}resize(e){this.size!==e&&(this.size=e,this.score=new Float32Array(e*e),this.binaryPattern=new Uint8Array(e*e))}invert(){const{binaryPattern:e,score:t,size:r}=this;t.fill(0);for(let i=0,n=e.length;i<n;i++)if(e[i]===0){const s=~~(i/r),o=i-s*r;this.updateScore(o,s,1),e[i]=1}else e[i]=0}updateScore(e,t,r){const{size:i,score:n,lookupTable:s}=this,o=this.radius,l=2*o+1;for(let d=-o;d<=o;d++)for(let c=-o;c<=o;c++){const u=(o+c)*l+d+o,f=s[u];let p=e+d;p=p<0?i+p:p%i;let h=t+c;h=h<0?i+h:h%i;const y=h*i+p;n[y]+=r*f}}addPointIndex(e){this.binaryPattern[e]=1;const t=this.size,r=~~(e/t),i=e-r*t;this.updateScore(i,r,1),this.count++}removePointIndex(e){this.binaryPattern[e]=0;const t=this.size,r=~~(e/t),i=e-r*t;this.updateScore(i,r,-1),this.count--}copy(e){this.resize(e.size),this.score.set(e.score),this.binaryPattern.set(e.binaryPattern),this.setSigma(e.sigma),this.count=e.count}}class Xu{constructor(){this.random=Math.random,this.sigma=1.5,this.size=64,this.majorityPointsRatio=.1,this.samples=new jn(1),this.savedSamples=new jn(1)}generate(){const{samples:e,savedSamples:t,sigma:r,majorityPointsRatio:i,size:n}=this;e.resize(n),e.setSigma(r);const s=Math.floor(n*n*i),o=e.binaryPattern;Ku(o,s),Gu(o,this.random);for(let u=0,f=o.length;u<f;u++)o[u]===1&&e.addPointIndex(u);for(;;){const u=e.findCluster();e.removePointIndex(u);const f=e.findVoid();if(u===f){e.addPointIndex(u);break}e.addPointIndex(f)}const l=new Uint32Array(n*n);t.copy(e);let d;for(d=e.count-1;d>=0;){const u=e.findCluster();e.removePointIndex(u),l[u]=d,d--}const c=n*n;for(d=t.count;d<c/2;){const u=t.findVoid();t.addPointIndex(u),l[u]=d,d++}for(t.invert();d<c;){const u=t.findCluster();t.removePointIndex(u),l[u]=d,d++}return{data:l,maxValue:c}}}function Yu(a){return a>=3?4:a}function Zu(a){switch(a){case 1:return is;case 2:return tl;default:return Ce}}class Ju extends ge{constructor(e=64,t=1){super(new Float32Array(4),1,1,Ce,bt),this.minFilter=xr,this.magFilter=xr,this.size=e,this.channels=t,this.update()}update(){const e=this.channels,t=this.size,r=new Xu;r.channels=e,r.size=t;const i=Yu(e),n=Zu(i);(this.image.width!==t||n!==this.format)&&(this.image.width=t,this.image.height=t,this.image.data=new Float32Array(t**2*i),this.format=n,this.dispose());const s=this.image.data;for(let o=0,l=e;o<l;o++){const d=r.generate(),c=d.data,u=d.maxValue;for(let f=0,p=c.length;f<p;f++){const h=c[f]/u;s[f*i+o]=h}}this.needsUpdate=!0}}const $o=64,ed=new Ju($o,1),td=Re(ed),Mo=ya(0).toVar("blueDitherSeed"),rd=I`
	fn blueDitherInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		let coord = vec2i( pixel % vec2u( ${$o}u ) );
		${Mo} = textureLoad( ${td}, coord, 0 );
		${Ls}( vec2u( 0 ), pathIndex, bounceIndex );

	}
`,id=I`
	fn blueDitherNextBounce() -> void {

		${zs}();

	}
`,Di=I`
	fn blueDitherRand4( effect: u32 ) -> vec4f {

		// Get the scrambled sobol stratified sample
		let stratifiedSample = ${Ns}( effect );

		// offset it by the blue noise seed and dimension rotation
		return fract( stratifiedSample + ${Mo}.r );

	}
`,sd=I`
	fn blueDitherRand3( effect: u32 ) -> vec3f {

		return ${Di}( effect ).xyz;

	}
`,nd=I`
	fn blueDitherRand2( effect: u32 ) -> vec2f {

		return ${Di}( effect ).xy;

	}
`,ad=I`
	fn blueDitherRand1( effect: u32 ) -> f32 {

		return ${Di}( effect ).x;

	}
`,od=Object.freeze(Object.defineProperty({__proto__:null,rand1:ad,rand2:nd,rand3:sd,rand4:Di,rngInit:rd,rngNextBounce:id},Symbol.toStringTag,{value:"Module"})),Lf=ju,ld=su,zf=od,Po=0,qs=1,Bo=2,cd=2147483648,Qs=1073741824,vr=1073741823;class ud extends te{constructor(){const e={material:{value:null},envInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:de(Wt()).toReadOnly(),outputTarget:de(Wt()).toWriteOnly(),sampleCountTarget:de(wi()).toReadWrite(),offset:B(new G),tileSize:B(new G),seed:B(0),maxBounces:B(5),maxTransparentBounces:B(5,"uint"),maxSubsurfaceBounces:B(256,"uint"),misEnabled:B(1,"uint"),maxSamples:B(0,"uint"),filterGlossy:B(1),clampDirect:B(0),clampIndirect:B(10),backgroundInfo:{value:null},transmissiveBackground:B(qs),accumulateAux:B(0,"uint"),auxTarget:de(qt()).toReadWrite(),textures:Re(new ge),textureSampler:gi(new ge),globalId:ae},t=_e("bvhData.fns.raycastFirstHit.outputType"),r=ue("bvhData.fns.raycastFirstHit"),i=ue("bvhData.fns.raycastShadow"),n=ue("bvhData.fns.sampleTrianglePoint"),s=ue("bvhData.fns.getSurfaceRecord"),o=ue("bvhData.fns.getCameraRay"),l=K("material.value.bsdfSample",e),d=K("material.value.bsdfEvalPdf",e),c=_e("bvhData.storage.materials"),u=_e("bvhData.storage.transforms"),f=ee("envInfo.value.totalSumNode",e),p=ee("envInfo.value.intensityNode",e),h=ee("envInfo.value.sampleColor",e),y=ee("envInfo.value.sampleDir",e),x=ee("envInfo.value.getDirPdf",e),b=ee("envInfo.value.getWeight",e),m=ee("backgroundInfo.value.sampleColor",e),v=ee("lightsInfo.value.countNode",e),g=K("lightsInfo.value.randomLightSample",e),w=K("lightsInfo.value.intersectLightAtIndex",e),R=K("lightsInfo.value.getLightWeight",e),S=K("lightsInfo.value.getLightsWeight",e),C=K("lightsInfo.value.selectLight",e),D=K("lightsInfo.value.isLightVisibleToCamera",e),T=I`

			fn compute(

				// indices and target
				globalId: vec3u,

				// tiles
				offset: vec2u,
				tileSize: vec2u,

				// settings
				seed: u32,
				maxBounces: u32,
				maxTransparentBounces: u32,
				maxSubsurfaceBounces: u32,
				misEnabled: u32,
				maxSamples: u32,
				filterGlossy: f32,
				clampDirect: f32,
				clampIndirect: f32,

				transmissiveBackground: u32,
				accumulateAux: u32,

			) -> void {

				// make sure we don't bleed over the edge of our tile
				if ( globalId.x >= tileSize.x || globalId.y >= tileSize.y ) {

					return;

				}

				// to screen coordinates
				let indexUV = offset + globalId.xy;
				let targetDimensions = textureDimensions( ${e.outputTarget} );
				if ( indexUV.x >= targetDimensions.x || indexUV.y >= targetDimensions.y ) {

					return;

				}

				// skip the pixel once it has hit the sample limit
				let sampleCount = textureLoad( ${e.sampleCountTarget}, indexUV ).r;
				if ( maxSamples != 0u && sampleCount >= maxSamples ) {

					return;

				}

				let uv = vec2f( indexUV ) / vec2f( targetDimensions );
				${xt}( indexUV.xy, seed, 0 );

				// scene ray
				let jitteredUv = uv + ${Ae}( ${eo} ) / vec2f( targetDimensions );
				var ray: ${k};
				if ( ! ${o}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

					// a declined pixel never takes a sample, so with a cap it counts as finished
					if ( maxSamples != 0u ) {

						textureStore( ${e.sampleCountTarget}, indexUV, vec4( maxSamples ) );

					}

					return;

				}

				ray.direction = normalize( ray.direction );

				var resultColor = vec4f( 0, 0, 0, 1 );
				var throughputColor = vec3f( 1.0 );
				var bsdfPdf = 0.0;

				// Alpha pass throughs only move where the BVH traversal starts, "rayStart" along the ray, so the
				// ray keeps the origin it scattered from, which its MIS weights are measured from
				var rayStart = 0.0;
				var traceOrigin = ray.origin;
				var isFullyTransmissive = true;
				var minPdf = 1.0;
				var transparentBounce = 0u;

				// the scattering volume the path is in. Media don't nest
				var medium: ${rt};
				var subsurfaceBounces = 0u;

				// no light is sampled at a scatter event, so whatever the next segment reaches takes full weight
				var mediumScattered = false;

				// A negative value marks a sampled wavelength whose RGB reconstruction weight has not been applied yet.
				var dispersionWavelength = - mix( ${_i}.0, ${Ri}.0, ${mt}( ${no} ) );

				// one-sample NEE chooses between the analytic lights and the environment
				let envActive = ${f} > 0.0 && ${p} > 0.0;
				let lightsCount = ${v};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${b}();

				}

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				// The first surface the path scatters off fills the denoiser's auxiliary images. Until one is found
				// the last mirror or transmission hit stands in, for paths that reach the environment. The albedo
				// is tinted by the throughput of the surfaces looked past to reach it
				var auxFound = false;
				var auxAlbedo = vec3f( 0.0 );
				var auxNormal = vec3f( 0.0 );

				for ( var bounce = 0u; bounce < maxBounces; bounce ++ ) {

					// Inside a medium, sample a scatter event before the next surface and only trace up to it
					var channelPdf = vec3f( 0.0 );
					var scatterDist = 0.0;
					var traceRay = ray;
					traceRay.origin = traceOrigin;
					if ( medium.inside ) {

						channelPdf = ${yo}( throughputColor, medium.albedo );
						scatterDist = ${vo}( medium, channelPdf, ${Ae}( ${ao} ) );
						traceRay.maxDist = select( scatterDist, min( ray.maxDist, scatterDist ), ray.maxDist > 0.0 );

					}

					var hitResult: ${t};
					let didHit = ${r}( traceRay, &hitResult );
					let surfaceDist = select( ${yt}, hitResult.dist, didHit );

					let segmentInMedium = medium.inside;
					if ( medium.inside ) {

						let scattered = scatterDist < surfaceDist;
						let segmentDist = select( surfaceDist, scatterDist, scattered );
						let transmittance = exp( - medium.extinction * segmentDist );
						let distancePdf = dot( channelPdf, ${bo}( medium, segmentDist, scattered ) );
						if ( distancePdf <= 0.0 ) {

							break;

						}

						if ( ! scattered ) {

							// reaching the surface, weighted by the probability of no scatter event before it
							throughputColor *= transmittance / distancePdf;

						} else {

							throughputColor *= medium.albedo * medium.extinction * transmittance / distancePdf;
							ray.origin = traceOrigin + ray.direction * scatterDist;
							traceOrigin = ray.origin;
							rayStart = 0.0;
							ray.direction = ${uo}( ray.direction, medium.anisotropy, ${Ae}( ${oo} ) );
							ray.maxDist = 0.0;
							mediumScattered = true;
							isFullyTransmissive = false;

							// subsurface bounces are capped separately from bounces
							subsurfaceBounces ++;
							let maxThroughput = max( max( throughputColor.r, throughputColor.g ), throughputColor.b );
							if ( subsurfaceBounces >= maxSubsurfaceBounces || maxThroughput < ${mo} ) {

								break;

							}

							${ni}();
							bounce --;
							continue;

						}

					}

					// NEE's total weight at the vertex this ray left, for MIS. Camera rays have none, and
					// neither do scatter events in a medium
					let isMISWeighted = misEnabled != 0u && bounce > 0u && ! mediumScattered;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${S}( ray.origin ) + envWeight;

					}

					// forward hits on area lights along the traced segment. Camera rays only see visibleToCameraRays
					// lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( bounce == 0u && ! ${D}( li ) ) {

							continue;

						}

						var lightRec: ${Oe};
						if ( ${w}( ray.origin, ray.direction, li, &lightRec ) && lightRec.dist > rayStart && lightRec.dist < rayStart + surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${R}( li, ray.origin ) / lightTotalWeight;
								misWeight = ${et}( bsdfPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${re}( lightRec.emission * throughputColor * misWeight, bounce, clampDirect, clampIndirect );
							cameraHitLight = cameraHitLight || bounce == 0u;

						}

					}

					if ( didHit ) {

						// whole structs are read from the buffer, not a pointer alias, which Safari fails to compile
						let objectInfo = ${u}[ hitResult.objectIndex ];
						var materialInfo = ${c}[ objectInfo.materialIndex ];

						// a matte surface hit by the camera ray renders as a fully transparent
						if ( materialInfo.matte != 0 && bounce == 0u ) {

							resultColor = vec4f( 0.0 );
							break;

						}

						// apply per-object colors
						materialInfo.color *= objectInfo.color.rgb;
						materialInfo.opacity *= objectInfo.color.a;

						let view = - ray.direction;
						var vertexData = ${n}( hitResult.barycoord, hitResult.indices.xyz );
						vertexData.normal = normalize( transpose( objectInfo.inverseMatrixWorld ) * vertexData.normal );
						vertexData.tangent = vec4f( ( objectInfo.matrixWorld * vec4f( vertexData.tangent.xyz, 0.0 ) ).xyz, vertexData.tangent.w );
						vertexData.position = objectInfo.matrixWorld * vertexData.position;

						// blur glossy surfaces after low-probability bounces to suppress fireflies,
						// from the Cycles "filter glossy" approach in integrator/surface_shader.h
						// The smallest pdf seen along the path for the glossy filter is tracked below
						let blurRoughness = sqrt( clamp( 1.0 - filterGlossy * minPdf, 0.0, 1.0 ) ) * 0.5;

						var surface = ${s}( materialInfo, vertexData, hitResult.side, hitResult.normal, view, blurRoughness );

						// Stochastically pass through partially transparent surfaces by restarting
						// the traversal at the hit point, advancing the rng but not the bounce count.
						if ( ${mt}( ${lo} ) > surface.opacity ) {

							// stop once the transparent bounces run out
							if ( transparentBounce >= maxTransparentBounces ) {

								break;

							}

							traceOrigin = ${ht}( vertexData.position.xyz, ray.direction, hitResult.normal );
							rayStart += hitResult.dist;
							${ni}();
							transparentBounce ++;
							bounce --;
							continue;

						}

						let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
						if ( isDispersive ) {

							let wavelength = abs( dispersionWavelength );
							${Ro}( &surface, materialInfo.dispersion, wavelength );
							if ( dispersionWavelength < 0.0 ) {

								dispersionWavelength = wavelength;
								throughputColor *= ${Co}( wavelength );

							}

						}

						// attenuate the light transmitted through the volume when exiting a backface. A scattering
						// medium has already applied its transmittance above
						if ( hitResult.side < 0.0 && materialInfo.transmission > 0.0 && ! segmentInMedium ) {

							throughputColor *= ${_o}( hitResult.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );

						}

						// emission, clamped at the depth of the segment that found it, as in Cycles
						let emission = ${re}( throughputColor * surface.emission, bounce, clampDirect, clampIndirect );
						resultColor += vec4f( emission, 0.0 );

						// next event estimation: choose one light or the environment by its estimated
						// contribution
						if ( misEnabled != 0u ) {

							let ruv = ${Es}( ${io} );
							var selectionPdf = 0.0;
							let lightIndex = ${C}( vertexData.position.xyz, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${Oe};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${y}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${yt};
									lightRec.lightType = ${Os};

								} else {

									lightRec = ${g}( lightIndex, vertexData.position.xyz, ruv.yz );

								}

								if ( lightRec.pdf > 0.0 ) {

									let evalRec = ${d}( view, lightRec.direction, surface );
									if ( evalRec.pdf > 0.0 ) {

										var shadowRay: ${k};
										shadowRay.origin = ${ht}( vertexData.position.xyz, lightRec.direction, hitResult.normal );
										shadowRay.direction = lightRec.direction;
										shadowRay.maxDist = lightRec.dist * ( 1.0 - ${ho} );

										// opaque occlusion up to the light distance, attenuated by the partially
										// transparent surfaces passed
										var shadowHit: ${t};
										let occluded = ${i}( shadowRay, &shadowHit );
										if ( ! occluded ) {

											let lightPdf = lightRec.pdf * selectionPdf;

											// env + area lights are also found by bsdf rays, so MIS-weight them. Punctual lights, and lights
											// past the bounce limit, take full weight. Bsdf rays stopped by faces the shadow ray skipped can't
											// find the light, so their share of the weight moves to the light sample
											let isMISWeighted = ${po}( lightRec.lightType ) && bounce + 1u < maxBounces;
											let misWeight = select( 1.0, mix( ${et}( lightPdf, evalRec.pdf ), 1.0, shadowHit.skippedOcclusion ), isMISWeighted );
											let directLight = throughputColor * lightRec.emission * evalRec.color * misWeight * ( 1.0 - shadowHit.occlusion ) / lightPdf;
											let contribution = ${re}( directLight, bounce + 1u, clampDirect, clampIndirect );
											resultColor += vec4f( contribution, 0.0 );

										}

									}

								}

							}

						}

						let scatterRec = ${l}( view, surface );

						if ( ! auxFound ) {

							auxFound = ${Qa}( surface, scatterRec );
							auxAlbedo = saturate( throughputColor * surface.color );
							auxNormal = surface.normal;

						}

						if ( ${Hs}( scatterRec ) ) {

							break;

						}

						isFullyTransmissive = isFullyTransmissive && scatterRec.isTransmissive;

						// track the smallest pdf seen along the path for the glossy filter
						minPdf = min( minPdf, scatterRec.pdf );

						// russian roulette early out:
						// Matches Cycles path_state_continuation_probability in integrator/path_state.h
						if ( bounce >= 3u ) {

							let rrThroughput = throughputColor * scatterRec.color / scatterRec.pdf;
							let rrProb = saturate( sqrt( max( max( rrThroughput.r, rrThroughput.g ), rrThroughput.b ) ) );
							if ( rrProb <= 0.0 || ${mt}( ${so} ) > rrProb ) {

								break;

							}

							throughputColor /= rrProb;

						}

						throughputColor *= scatterRec.color;
						throughputColor /= scatterRec.pdf;
						bsdfPdf = scatterRec.pdf;
						mediumScattered = false;

						// As in "KHR_materials_scatter", the medium's surface bsdf is its boundary: the walk ends when
						// light refracts out through it, and continues inside when it reflects back
						if ( segmentInMedium && hitResult.objectIndex == medium.object && hitResult.side < 0.0 && scatterRec.isTransmissive ) {

							medium.inside = false;

						}

						// refracting into a front face of a scattering material starts a random walk inside it
						if ( scatterRec.isTransmissive && ! surface.thinWall && hitResult.side > 0.0 ) {

							let entered = ${xo}( materialInfo, hitResult.objectIndex );

							if ( entered.inside ) {

								medium = entered;

							}

						}

						// exit if our throughput is 0.0
						if ( all( throughputColor == vec3f( 0.0 ) ) ) {

							break;

						}

						ray.origin = ${ht}( vertexData.position.xyz, scatterRec.direction, hitResult.normal );
						ray.direction = scatterRec.direction;
						ray.maxDist = 0.0;
						traceOrigin = ray.origin;
						rayStart = 0.0;

					} else {

						if ( bounce > 0u && ! isFullyTransmissive ) {

							var misWeight = 1.0;
							if ( isMISWeighted && envActive ) {

								// match the env pdf scaling used by the NEE selection so the two estimators balance
								let envPdf = ${x}( ray.direction ) * envWeight / lightTotalWeight;
								misWeight = ${et}( bsdfPdf, envPdf );

							}

							let environment = ${h}( ray.direction ).rgb * throughputColor * misWeight;
							let contribution = ${re}( environment, bounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${Ae}( ${to} );
							let bg = ${m}( ray.direction, rng );
							if ( bounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${re}( bg.a * bg.rgb, bounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${h}( ray.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;
								var envMisWeight = 1.0;
								if ( misEnabled != 0u && ${f} > 0.0 ) {

									let envPdf = ${x}( ray.direction );
									envMisWeight = ${et}( bsdfPdf, envPdf );

								}

								if ( transmissiveBackground == ${Po}u ) {

									// display the env map through transmissive surfaces
									let background = ${re}( env.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${Bo}u ) {

									// fade the background by the throughput color average
									let background = ${re}( bg.a * bg.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * envMisWeight;
									let background = ${re}( light * throughputColor, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								}

							}

						}

						break;

					}

					${ni}();

				}

				// visible lights are opaque against a transparent background
				resultColor += vec4f( lightHits, 0.0 );
				if ( cameraHitLight ) {

					resultColor.a = 1.0;

				}

				let nextSampleCount = sampleCount + 1;
				// store the color rows top down to match a rasterized render target
				let colorIndex = vec2u( indexUV.x, targetDimensions.y - 1u - indexUV.y );

				let prevColor = textureLoad( ${e.prevOutputTarget}, colorIndex );
				let blendedColor = ${fo}( prevColor, resultColor, 1.0 / f32( nextSampleCount ) );
				textureStore( ${e.sampleCountTarget}, indexUV, vec4( nextSampleCount ) );
				textureStore( ${e.outputTarget}, colorIndex, blendedColor );

				// the auxiliary images are blended the same way, in the same row order
				if ( accumulateAux != 0u ) {

					var auxPacked: vec3u;
					for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

						auxPacked[ layer ] = textureLoad( ${e.auxTarget}, colorIndex, layer ).r;

					}

					auxPacked = ${ja}( auxPacked, auxAlbedo, auxNormal, 1.0 / f32( nextSampleCount ) );
					for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

						textureStore( ${e.auxTarget}, colorIndex, layer, vec4u( auxPacked[ layer ] ) );

					}

				}

			}`;super(T(e)),this.defineUniformAccessors(e)}}function Gi(a){const e=new Uint16Array(a.length);for(let t=0,r=a.length;t<r;++t)e[t]=Be.toHalfFloat(a[t]);return e}function Gn(a,e,t=0,r=a.length){let i=t,n=t+r-1;for(;i<n;){const s=i+n>>1;a[s]<e?i=s+1:n=s}return i-t}function dd(a,e,t){return .2126*a+.7152*e+.0722*t}function fd(a,e=fe){const t=a.clone();t.source=new rl({...t.image});const{width:r,height:i,data:n}=t.image;let s=n;if(t.type!==e){e===fe?s=new Uint16Array(n.length):s=new Float32Array(n.length);let o;n instanceof Int8Array||n instanceof Int16Array||n instanceof Int32Array?o=2**(8*n.BYTES_PER_ELEMENT-1)-1:o=2**(8*n.BYTES_PER_ELEMENT)-1;for(let l=0,d=n.length;l<d;l++){let c=n[l];t.type===fe&&(c=Be.fromHalfFloat(n[l])),t.type!==bt&&t.type!==fe&&(c/=o),e===fe&&(s[l]=Be.toHalfFloat(c))}t.image.data=s,t.type=e}if(t.flipY){const o=s;s=s.slice();for(let l=0;l<i;l++)for(let d=0;d<r;d++){const c=i-l-1,u=4*(l*r+d),f=4*(c*r+d);s[f+0]=o[u+0],s[f+1]=o[u+1],s[f+2]=o[u+2],s[f+3]=o[u+3]}t.flipY=!1,t.image.data=s}return t}class hd{constructor(){const e=new ge(Gi(new Float32Array([0,0,0,0])),1,1);e.type=fe,e.format=Ce,e.minFilter=se,e.magFilter=se,e.wrapS=tt,e.wrapT=tt,e.generateMipmaps=!1,e.needsUpdate=!0;const t=new ge(Gi(new Float32Array([0,1])),1,2);t.type=fe,t.format=is,t.minFilter=se,t.magFilter=se,t.generateMipmaps=!1,t.needsUpdate=!0;const r=new ge(Gi(new Float32Array([0,0,1,1])),2,2);r.type=fe,r.format=is,r.minFilter=se,r.magFilter=se,r.generateMipmaps=!1,r.needsUpdate=!0,this.map=e,this.marginalWeights=t,this.conditionalWeights=r,this.totalSum=0}getPixelWeight(e,t,r){return dd(e,t,r)}dispose(){this.marginalWeights.dispose(),this.conditionalWeights.dispose(),this.map.dispose()}updateFrom(e){const t=fd(e);t.wrapS=tt,t.wrapT=oi;const{width:r,height:i,data:n}=t.image,s=new Float32Array(r*i),o=new Float32Array(r*i),l=new Float32Array(i),d=new Float32Array(i);let c=0,u=0;for(let x=0;x<i;x++){let b=0;for(let m=0;m<r;m++){const v=x*r+m,g=Be.fromHalfFloat(n[4*v+0]),w=Be.fromHalfFloat(n[4*v+1]),R=Be.fromHalfFloat(n[4*v+2]),S=this.getPixelWeight(g,w,R,x,i);b+=S,c+=S,s[v]=S,o[v]=b}if(b!==0)for(let m=x*r,v=x*r+r;m<v;m++)s[m]/=b,o[m]/=b;u+=b,l[x]=b,d[x]=u}if(u!==0)for(let x=0,b=l.length;x<b;x++)l[x]/=u,d[x]/=u;const f=new Uint16Array(i),p=new Uint16Array(r*i);for(let x=0;x<i;x++){const b=(x+1)/i,m=Gn(d,b);f[x]=Be.toHalfFloat((m+.5)/i)}for(let x=0;x<i;x++)for(let b=0;b<r;b++){const m=x*r+b,v=(b+1)/r,g=Gn(o,v,x*r,r);p[m]=Be.toHalfFloat((g+.5)/r)}this.dispose();const{marginalWeights:h,conditionalWeights:y}=this;h.image={width:i,height:1,data:f},h.needsUpdate=!0,y.image={width:r,height:i,data:p},y.needsUpdate=!0,this.totalSum=c,this.map=t,this.cdfMarginal=d,this.cdfConditional=o}}class Ao extends hd{constructor(){super(),this.mapNode=Re(this.map),this.mapSampler=gi(this.mapNode),this.cdfNode=E(new N(new Float32Array([0,1,0,1]),1),"float").toReadOnly(),this.rotationNode=B(new wa),this.intensityNode=B(1),this.totalSumNode=B(this.totalSum),this._initFns()}getPixelWeight(e,t,r,i,n){const s=Math.PI*(i+.5)/n;return super.getPixelWeight(e,t,r)*Math.sin(s)}updateFrom(e){super.updateFrom(e);const{mapNode:t,cdfNode:r,totalSumNode:i}=this;t.value=this.map,i.value=this.totalSum;const{width:n,height:s}=this.map.image,{cdfMarginal:o,cdfConditional:l}=this,d=new Float32Array(s+1+s*(n+1));d.set(o,1);for(let c=0;c<s;c++)d.set(l.subarray(c*n,c*n+n),s+1+c*(n+1)+1);r.value=new N(d,1)}dispose(){super.dispose(),this.cdfNode.value.dispose()}_initFns(){const{mapNode:e,mapSampler:t,cdfNode:r,totalSumNode:i,rotationNode:n,intensityNode:s}=this,o=I`
			fn searchEnvCdf( r: f32, offset: u32, count: u32, fraction: ptr<function, f32> ) -> u32 {

				var lower = 0u;
				var upper = count - 1u;
				while ( lower < upper ) {

					let mid = ( lower + upper ) >> 1u;
					if ( ${r}[ offset + mid + 1u ] <= r ) {

						lower = mid + 1u;

					} else {

						upper = mid;

					}

				}

				let start = ${r}[ offset + lower ];
				let end = ${r}[ offset + lower + 1u ];
				*fraction = select( 0.5, saturate( ( r - start ) / ( end - start ) ), end > start );
				return lower;

			}
		`,l=I`
			fn getEnvTexelPdf( texel: vec2u, v: f32 ) -> f32 {

				let resolution = textureDimensions( ${e} );
				let rowOffset = resolution.y + 1u + texel.y * ( resolution.x + 1u );
				let rowPdf = ${r}[ texel.y + 1u ] - ${r}[ texel.y ];
				let pixelPdf = ${r}[ rowOffset + texel.x + 1u ] - ${r}[ rowOffset + texel.x ];

				// the equirect projection stretches each pixel by 1 / sin( theta ) over the sphere
				let sinTheta = sin( ${Ve} * v );
				return select( 0.0, rowPdf * pixelPdf * f32( resolution.x * resolution.y ) / ( 2.0 * ${Ve} * ${Ve} * sinTheta ), sinTheta > 0.0 );

			}
		`;this.sampleColor=I`
			fn sampleEnv( direction: vec3f ) -> vec4f {

				let sampleDir = ${n} * direction;
				let mapUv = ${fi}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${s} * col.rgb, col.a );

			}
		`,this.sampleDir=I`
			fn sampleEnvDir( r: vec2f ) -> ${Ln} {

				var result: ${Ln};

				// search the CDFs: marginal picks the row (v), conditional picks the column (u), and the
				// fractions place the sample within the pixel
				let resolution = textureDimensions( ${e} );
				var rowFraction = 0.0;
				var columnFraction = 0.0;
				let row = ${o}( r.x, 0u, resolution.y, &rowFraction );
				let column = ${o}( r.y, resolution.y + 1u + row * ( resolution.x + 1u ), resolution.x, &columnFraction );
				let texel = vec2u( column, row );
				let uv = ( vec2f( texel ) + vec2f( columnFraction, rowFraction ) ) / vec2f( resolution );

				let direction = ${vu}( uv );
				let color = textureSampleLevel( ${e}, ${t}, uv, 0 ).rgb;

				result.direction = transpose( ${n} ) * direction;
				result.color = color * ${s};
				result.pdf = ${l}( texel, uv.y );

				return result;

			}
		`,this.getWeight=I`
			fn getEnvWeight() -> f32 {

				let resolution = textureDimensions( ${e} );
				return ${s} * ${Ve} * ${Ve} * ${i} / ( 2.0 * f32( resolution.x * resolution.y ) );

			}
		`,this.getDirPdf=I`
			fn getEnvDirPdf( direction: vec3f ) -> f32 {

				if ( ${i} == 0.0 ) {

					return 0.0;

				}

				let rotatedDir = ${n} * direction;
				let mapUv = ${fi}( rotatedDir );
				let resolution = textureDimensions( ${e} );
				let texel = min( vec2u( mapUv * vec2f( resolution ) ), resolution - 1u );

				return ${l}( texel, mapUv.y );

			}
		`}}class Fo{get map(){return this.mapNode.value}set map(e){this.mapNode.value=e}get blur(){return this.blurNode.value}set blur(e){this.blurNode.value=e}get rotation(){return this.rotationNode.value}get intensity(){return this.intensityNode.value}set intensity(e){this.intensityNode.value=e}constructor(){const e=new ge(new Uint8Array([0,0,0,255]),1,1,Ce);e.minFilter=se,e.magFilter=se,e.wrapS=tt,e.wrapT=tt,e.generateMipmaps=!1,e.needsUpdate=!0,this.mapNode=Re(e),this.mapSampler=gi(this.mapNode),this.blurNode=B(0),this.rotationNode=B(new W),this.intensityNode=B(1),this._initFns()}dispose(){this.map.dispose()}_initFns(){const{mapNode:e,mapSampler:t,blurNode:r,rotationNode:i,intensityNode:n}=this;this.sampleColor=I`
			fn sampleBackground( direction: vec3f, uv: vec2f ) -> vec4f {

				let rotatedDir = ( ${i} * vec4f( direction, 0.0 ) ).xyz;
				let offsetDir = ${gu}( rotatedDir, uv ) * 0.5 * ${r};
				let sampleDir = normalize( rotatedDir + offsetDir );

				let mapUv = ${fi}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${n} * col.rgb, col.a );

			}
		`}}const Kn=new Ia,Xn=new wa;function Yn(a){return`${a.source.uuid}:${a.source.version}`}function pd(a,e,t,r){if(a[e].x+t>r)return-1;let n=t,s=0,o=e;for(;n>0;){if(o>=a.length)return-1;s=Math.max(s,a[o].y),n-=a[o].width,o++}return s}function md(a,e,t,r){const i=e+r,n=[];let s=!1;for(let o=0;o<a.length;o++){const l=a[o],d=l.x+l.width;d<=e?n.push(l):l.x>=i?(s||(n.push({x:e,y:t,width:r}),s=!0),n.push(l)):(s||(n.push({x:e,y:t,width:r}),s=!0),d>i&&n.push({x:i,y:l.y,width:d-i}))}s||n.push({x:e,y:t,width:r}),a.length=0;for(let o=0;o<n.length;o++){const l=n[o],d=a[a.length-1];d&&d.y===l.y&&d.x+d.width===l.x?d.width+=l.width:a.push(l)}}function Zn(a,e,t,r,i){let n=1/0,s=0,o=-1;for(let l=0;l<a.length;l++){const d=pd(a,l,e,r);d>=0&&d+t<=i&&d<n&&(n=d,s=a[l].x,o=l)}return o===-1?null:(md(a,s,n+t,e),{x:s,y:n})}class No{get width(){return this.renderTarget.width}get height(){return this.renderTarget.height}get pageCount(){return this.renderTarget.depth}get texture(){return this.renderTarget.texture}constructor(e={}){this.renderTarget=new Sa(1,1,{depthBuffer:!1,depth:1,...e}),this.texture.isArrayTexture=!0,this.textureInfo=[new pt],this.hashes=[],this.placements=[],this.quadMesh=new Ta(new il),this.quadMesh.material.blending=xi}setTextures(e,t){const r=t.map((u,f)=>f);if(r.sort((u,f)=>t[u].source.uuid<t[f].source.uuid?-1:1),t=r.map(u=>t[u]),this._hashesMatch(t)){this._buildCallerTextureInfo(r);return}let i=t.reduce((u,f)=>Math.max(u,f.width,f.height),1);i=Math.min(e.backend.device.limits.maxTextureDimension2D,i);const n=i,s=i,{renderTarget:o}=this,{placements:l,pageCount:d}=this._packTextures(t,n,s);o.setSize(n,s,d),this.texture.isArrayTexture=!0,this._renderTextures(e,t,l),this.placements=l;const c=new Array(t.length);for(let u=0,f=t.length;u<f;u++){const p=Yn(t[u]);c[u]=p}this.hashes=c,this._buildCallerTextureInfo(r)}_buildCallerTextureInfo(e){const t=new Array(e.length);for(let r=0,i=e.length;r<i;r++)t[e[r]]=this.placements[r];this._buildTextureInfo(t)}dispose(){this.renderTarget.dispose(),this.quadMesh.material.dispose()}_hashesMatch(e){const t=this.hashes;if(t.length!==e.length)return!1;for(let r=0,i=e.length;r<i;r++)if(t[r]!==Yn(e[r]))return!1;return!0}_packTextures(e,t,r){const i=[];for(let l=0,d=e.length;l<d;l++){const c=e[l];i.push({index:l,w:Math.min(c.width,t),h:Math.min(c.height,r)})}const n=i.sort((l,d)=>d.h-l.h),s=new Array(e.length),o=[];for(let l=0,d=n.length;l<d;l++){const c=n[l];let u=null,f=-1;for(let p=0;p<o.length;p++)if(u=Zn(o[p],c.w,c.h,t,r),u){f=p;break}if(!u){const p=[{x:0,y:0,width:t}];u=Zn(p,c.w,c.h,t,r),o.push(p),f=o.length-1}s[c.index]={x:u.x,y:u.y,w:c.w,h:c.h,page:f}}return{placements:s,pageCount:Math.max(o.length,1)}}_buildTextureInfo(e){const t=this.textureInfo;t.length=0;for(let r=0,i=e.length;r<i;r++){const{x:n,y:s,w:o,h:l,page:d}=e[r],c=new pt;c.x=n&65535|(s&65535)<<16,c.y=o&65535|(l&65535)<<16,c.z=d&65535,c.w=0,t.push(c)}t.length===0&&t.push(new pt(0,0,0,0))}_renderTextures(e,t,r){const{quadMesh:i,renderTarget:n,width:s,height:o}=this,l=e.getRenderTarget(),d=e.toneMapping,c=e.autoClear,u=e.getScissorTest(),f=e.getClearAlpha();e.getClearColor(Kn),e.toneMapping=dr,e.autoClear=!1,e.setScissorTest(!0),e.setClearColor(0,0);for(let p=0,h=n.depth;p<h;p++)n.viewport.set(0,0,s,o),n.scissor.set(0,0,s,o),e.setRenderTarget(n,p),e.clear();for(let p=0,h=t.length;p<h;p++){const{x:y,y:x,w:b,h:m,page:v}=r[p],g=t[p];if(n.viewport.set(y,x,b,m),n.scissor.set(y,x,b,m),e.setRenderTarget(n,v),g.isRenderTargetTexture){const w=g.matrixAutoUpdate;Xn.copy(g.matrix),g.matrix.identity(),g.matrixAutoUpdate=!1,i.material.map=g,i.render(e),g.matrixAutoUpdate=w,g.matrix.copy(Xn)}else{const w=g.clone();w.matrixAutoUpdate=!1,w.matrix.identity(),i.material.map=w,i.render(e),w.dispose()}}n.viewport.set(0,0,s,o),n.scissor.set(0,0,s,o),i.material.map=null,e.setClearColor(Kn,f),e.setScissorTest(u),e.autoClear=c,e.setRenderTarget(l),e.toneMapping=d}}function gd(a){let e=0;if(a.byteLength!==0){const t=new Uint8Array(a);for(let r=0;r<a.byteLength;r++){const i=t[r];e=(e<<5)-e+i,e|=0}}return e}const Ki=6,xd=11,yd=0,vd=1,bd=2,wd=3,Sd=4,we=new A,ce=new A,Jn=new W,Et=new sl,ea=new A,Me=new A,Td=new A(0,1,0);class Id{constructor(){const e=new ge(new Float32Array(4),1,1);e.format=Ce,e.type=bt,e.wrapS=oi,e.wrapT=oi,e.generateMipmaps=!1,e.minFilter=xr,e.magFilter=xr,this.tex=e,this.count=0}updateFrom(e,t=[]){const r=this.tex,i=Math.max(e.length*Ki,1),n=Math.ceil(Math.sqrt(i));r.image.width!==n&&(r.dispose(),r.image.data=new Float32Array(n*n*4),r.image.width=n,r.image.height=n);const s=r.image.data;for(let l=0,d=e.length;l<d;l++){const c=e[l],u=l*Ki*4;let f=0;for(let h=0;h<Ki*4;h++)s[u+h]=0;c.getWorldPosition(ce),s[u+f++]=ce.x,s[u+f++]=ce.y,s[u+f++]=ce.z;let p=yd;if(c.isRectAreaLight&&c.isCircular?p=vd:c.isSpotLight?p=bd:c.isDirectionalLight||c.isSunLight?p=wd:c.isPointLight&&(p=Sd),s[u+f++]=p,s[u+f++]=c.color.r,s[u+f++]=c.color.g,s[u+f++]=c.color.b,s[u+f++]=c.intensity,c.getWorldQuaternion(Et),c.isRectAreaLight)we.set(c.width,0,0).applyQuaternion(Et),s[u+f++]=we.x,s[u+f++]=we.y,s[u+f++]=we.z,f++,ce.set(0,c.height,0).applyQuaternion(Et),s[u+f++]=ce.x,s[u+f++]=ce.y,s[u+f++]=ce.z,s[u+f++]=we.cross(ce).length()*(c.isCircular?Math.PI/4:1);else if(c.isSpotLight){const h=c.radius||0;ea.setFromMatrixPosition(c.matrixWorld),Me.setFromMatrixPosition(c.target.matrixWorld),Jn.lookAt(ea,Me,Td),Et.setFromRotationMatrix(Jn),we.set(1,0,0).applyQuaternion(Et),s[u+f++]=we.x,s[u+f++]=we.y,s[u+f++]=we.z,f++,ce.set(0,1,0).applyQuaternion(Et),s[u+f++]=ce.x,s[u+f++]=ce.y,s[u+f++]=ce.z,s[u+f++]=Math.PI*h*h,s[u+f++]=h,s[u+f++]=c.decay,s[u+f++]=c.distance,s[u+f++]=Math.cos(c.angle),s[u+f++]=Math.cos(c.angle*(1-c.penumbra)),s[u+f++]=c.iesMap?t.indexOf(c.iesMap):-1}else if(c.isPointLight){const h=we.setFromMatrixPosition(c.matrixWorld);s[u+f++]=h.x,s[u+f++]=h.y,s[u+f++]=h.z,f++,f+=4,f+=1,s[u+f++]=c.decay,s[u+f++]=c.distance}else if(c.isDirectionalLight){const h=we.setFromMatrixPosition(c.matrixWorld),y=ce.setFromMatrixPosition(c.target.matrixWorld);Me.subVectors(h,y).normalize(),s[u+f++]=Me.x,s[u+f++]=Me.y,s[u+f++]=Me.z}else c.isSunLight&&(Me.setFromMatrixPosition(c.matrixWorld).normalize(),s[u+f++]=Me.x,s[u+f++]=Me.y,s[u+f++]=Me.z);s[u+xd]=c.visibleToCameraRays?1:0}this.count=e.length;const o=gd(s.buffer);return this.hash!==o?(this.hash=o,r.needsUpdate=!0,!0):!1}}class Lo extends Id{constructor(){super(),this.countNode=B(this.count,"uint"),this.buffer=new N(new Float32Array(2*ft.getLength()),ft.getLength()),this.bufferNode=E(this.buffer,ft).toReadOnly().setName("lights"),this.iesAtlas=new No({type:fe}),this.iesProfilesNode=Re(this.iesAtlas.texture),this.iesInfoNode=li(this.iesAtlas.textureInfo,"uvec4").setName("iesInfo"),this._initFns()}updateFrom(e,t){const r=Array.from(new Set(t.map(c=>c.iesMap).filter(c=>c))),i=super.updateFrom(t,r);this.iesAtlas.setTextures(e,r),this.iesProfilesNode.value=this.iesAtlas.texture;const n=ft.getLength(),s=this.count,o=Math.max(s,2);this.buffer.array.length!==o*n&&(this.buffer.dispose(),this.buffer=new N(new Float32Array(o*n),n),this.bufferNode.value=this.buffer);const l=this.tex.image.data;this.buffer.array.set(l.subarray(0,s*n));const d=new Int32Array(this.buffer.array.buffer);for(let c=0;c<s;c++){const u=c*n;d[u+3]=Math.round(l[u+3]),d[u+11]=Math.round(l[u+11]),d[u+21]=Math.round(l[u+21])}return this.buffer.needsUpdate=!0,this.countNode.value=this.count,i}_initFns(){const{bufferNode:e,countNode:t,iesProfilesNode:r,iesInfoNode:i}=this,n=co(i,r,"sampleIesTexel");this.isLightVisibleToCamera=I`
			fn isLightVisibleToCamera( index: u32 ) -> bool {

				return ${e}[ index ].visibleToCameraRays != 0;

			}
		`,this.getLightWeight=I`
			fn getLightWeight( index: u32, position: vec3f ) -> f32 {

				let light = ${e}[ index ];
				let power = ${yu}( light.color * light.intensity );
				if ( light.lightType == ${Vn} ) {

					// the most any point on the spot's disc lights the position. Ies profiles are not
					// evaluated here
					let nearest = ${Iu}( light, position );
					var attenuation = 1.0;
					if ( light.iesProfile < 0 ) {

						attenuation = ${qn}( light.coneCos, light.penumbraCos, nearest.x );

					}

					return power * attenuation * ${xs}( nearest.y, light.distance, light.decay );

				} else if ( light.lightType == ${Wn} ) {

					// the point light's world position is packed into the u slot
					let dist = length( light.u - position );
					return power * ${xs}( dist, light.distance, light.decay );

				} else if ( light.lightType == ${On} ) {

					return power;

				} else {

					let toLight = light.position - position;
					let distSq = dot( toLight, toLight );
					if ( distSq == 0.0 ) {

						return 0.0;

					}

					// area lights only emit from their front face, and the distance is held above the size
					// of the light so positions on or near it do not dominate
					let normal = normalize( cross( light.u, light.v ) );
					let cosTheta = dot( toLight, normal ) * inverseSqrt( distSq );
					return power * light.area * max( cosTheta, 0.0 ) / max( distSq, light.area );

				}

			}
		`,this.getLightsWeight=I`
			fn getLightsWeight( position: vec3f ) -> f32 {

				var total = 0.0;
				for ( var i = 0u; i < ${t}; i ++ ) {

					total += ${this.getLightWeight}( i, position );

				}

				return total;

			}
		`,this.selectLight=I`
			fn selectLight( position: vec3f, envWeight: f32, r: f32, selectionPdf: ptr<function, f32> ) -> u32 {

				let count = ${t};
				let totalWeight = ${this.getLightsWeight}( position ) + envWeight;
				if ( totalWeight <= 0.0 ) {

					*selectionPdf = 0.0;
					return 0u;

				}

				let targetWeight = r * totalWeight;
				var accumulated = 0.0;
				var lastWeighted = 0u;
				var index = count;
				for ( var i = 0u; i < count; i ++ ) {

					let lightWeight = ${this.getLightWeight}( i, position );
					accumulated += lightWeight;
					if ( lightWeight > 0.0 ) {

						lastWeighted = i;

					}

					if ( targetWeight < accumulated ) {

						index = i;
						break;

					}

				}

				// rounding can carry the target past the last light when there is no environment
				if ( index == count && envWeight <= 0.0 ) {

					index = lastWeighted;

				}

				var weight = envWeight;
				if ( index < count ) {

					weight = ${this.getLightWeight}( index, position );

				}

				*selectionPdf = weight / totalWeight;
				return index;

			}
		`,this.randomLightSample=I`
			fn randomLightSample( lightIndex: u32, rayOrigin: vec3f, ruv: vec2f ) -> ${Oe} {

				let light = ${e}[ lightIndex ];

				var result: ${Oe};
				if ( light.lightType == ${Vn} ) {

					result = ${Tu}( light, rayOrigin, ruv );

					let spotNormal = normalize( cross( light.u, light.v ) );
					let cosTheta = dot( result.direction, spotNormal );
					var spotAttenuation: f32;
					if ( light.iesProfile >= 0 ) {

						// half a texel of the profile's tile in the atlas
						let profileInfo = ${i}[ u32( light.iesProfile ) ];
						let texelInset = 0.5 / vec2f( vec2u( profileInfo.y & 0xFFFFu, profileInfo.y >> 16u ) );

						// tilt spans [ 0, 180 ]deg inset to the texel centers, twist covers [ 0, 359 ]deg and wraps
						let tiltAngle = mix( texelInset.x, 1.0 - texelInset.x, acos( cosTheta ) / PI );
						let twistAngle = ( atan2( dot( result.direction, light.v ), dot( result.direction, light.u ) ) + PI ) / ( 2.0 * PI ) + texelInset.y;
						let packedProfile = ( 1 << 26 ) | light.iesProfile;
						spotAttenuation = ${n}( vec2f( tiltAngle, twistAngle ), packedProfile, 0.0 ).r;

					} else {

						spotAttenuation = ${qn}( light.coneCos, light.penumbraCos, cosTheta );

					}

					result.emission *= spotAttenuation;

				} else if ( light.lightType == ${Wn} ) {

					// the point light's world position is packed into the u slot
					let lightRay = light.u - rayOrigin;
					let lightDist = length( lightRay );
					let cutoffDistance = light.distance;
					var distanceFalloff = 1.0 / max( pow( lightDist, light.decay ), 0.01 );
					if ( cutoffDistance > 0.0 ) {

						let window = clamp( 1.0 - pow( lightDist / cutoffDistance, 4.0 ), 0.0, 1.0 );
						distanceFalloff *= window * window;

					}

					result.direction = normalize( lightRay );
					result.dist = lightDist;
					result.pdf = 1.0;
					result.emission = light.color * light.intensity * distanceFalloff;
					result.lightType = light.lightType;

				} else if ( light.lightType == ${On} ) {

					// the directional light's direction is packed into the u slot
					result.dist = ${yt};
					result.direction = light.u;
					result.pdf = 1.0;
					result.emission = light.color * light.intensity;
					result.lightType = light.lightType;

				} else {

					result = ${Su}( light, rayOrigin, ruv );

				}

				return result;

			}
		`,this.intersectLightAtIndex=I`
			fn intersectLightAtIndex( rayOrigin: vec3f, rayDirection: vec3f, index: u32, lightRec: ptr<function, ${Oe}> ) -> bool {

				let light = ${e}[ index ];

				var u = light.u;
				var v = light.v;
				let normal = normalize( cross( u, v ) );

				// only front-facing area lights can be hit
				if ( dot( normal, rayDirection ) > 0.0 ) {

					u *= 1.0 / dot( u, u );
					v *= 1.0 / dot( v, v );

					var dist = - 1.0;
					if ( light.lightType == ${Us} ) {

						dist = ${bu}( light.position, normal, u, v, rayOrigin, rayDirection );

					} else if ( light.lightType == ${Vs} ) {

						dist = ${wu}( light.position, normal, u, v, rayOrigin, rayDirection );

					}

					if ( dist > 0.0 ) {

						let cosTheta = dot( rayDirection, normal );
						lightRec.dist = dist;
						lightRec.pdf = ( dist * dist ) / ( light.area * cosTheta );
						lightRec.emission = light.color * light.intensity;
						lightRec.direction = rayDirection;
						lightRec.lightType = light.lightType;
						return true;

					}

				}

				return false;

			}
		`}dispose(){this.tex.dispose(),this.buffer.dispose(),this.iesAtlas.dispose()}}class Xi extends te{constructor(){const e={globalId:ae,outputTarget:de(new qe(1,1)).toWriteOnly()},t=()=>e.outputTarget.value.isArrayTexture?"globalId.xy, globalId.z":"globalId.xy",r=I`
			fn compute( globalId: vec3u ) -> void {

				textureStore( ${e.outputTarget}, ${t}, vec4( 0, 0, 0, 1 ) );

			}
		`;super(r(e)),this.defineUniformAccessors({target:e.outputTarget})}}const _d=0,ta=1;class zo{constructor(e){this.renderer=e,this.maxBounces=15,this.frameBudget=25e4,this.maxTransparentBounces=15,this.maxSubsurfaceBounces=256,this.lowResMode=!1,this.maxSamples=0,this.asyncCompile=!1,this.compiling=!1,this.timing={count:0,frameTime:0,frameBudget:0},this._renderTask=null,this._compileState=new WeakMap,this._timestampUIDs=null,this._timingFrame=!1,this.outputTarget=Wt("Output #0"),this.prevOutputTarget=Wt("Output #1"),this.sampleCountTarget=wi("Sample Count"),this.sampleCountClearKernel=new Xi().setWorkgroupSize(8,8,1),this.outputTargetClearKernel=new Xi().setWorkgroupSize(8,8,1),this.auxTargetClearKernel=new Xi().setWorkgroupSize(8,8,1),this.auxTarget=null,this._auxPlaceholder=qt()}setAccumulateAux(e){if(!!this.auxTarget!==e){if(this.auxTarget?.dispose(),this.auxTarget=null,e){const{width:t,height:r}=this.outputTarget;this.auxTarget=qt("Auxiliary Images"),this.auxTarget.setSize(t,r,Fe)}this.reset()}}setRandom(e){}setBVHData(e){}setTextures(e){}setMaterial(e){}setFilterGlossy(e){}setClamping(e,t){}setEnvironment(e,t,r){}setLights(e){}setBackground(e,t,r,i){}*compileKernels(e){const{renderer:t,_compileState:r}=this;if(!this.asyncCompile||!t.compileComputeAsync)return;const i=e.map(s=>s.kernel),n=i.filter(s=>!r.has(s));for(n.length>0&&(this.compiling=!0,yield,n.forEach(s=>r.set(s,_d)),t.compileComputeAsync(n).catch(()=>{}).finally(()=>{n.forEach(s=>r.set(s,ta))}));i.some(s=>r.get(s)!==ta);)this.compiling=!0,yield;this.compiling=!1}rebuild(){this._renderTask=null}setSize(e,t){e=Math.ceil(e),t=Math.ceil(t);const{width:r,height:i}=this.outputTarget;return r===e&&i===t?!1:(this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.outputTarget=this.outputTarget.clone(),this.prevOutputTarget=this.outputTarget.clone(),this.sampleCountTarget=this.sampleCountTarget.clone(),this.outputTarget.setSize(e,t),this.prevOutputTarget.setSize(e,t),this.sampleCountTarget.setSize(e,t),this.auxTarget?.setSize(e,t,Fe),this.reset(),!0)}getSize(e){const{width:t,height:r}=this.outputTarget;return e.x=t,e.y=r,e}getPreviewPixelBudget(){return this.frameBudget}update(){const{renderer:e}=this;if(!e.initialized)return;this._renderTask||(this._renderTask=this.createRenderTask());const t=e.backend.trackTimestamp&&!this._timingFrame;this._timestampUIDs=t?[]:null,this._renderTask.next(),t&&this._timestampUIDs.length>0&&this._measureFrameTime(this._timestampUIDs),this._timestampUIDs=null}dispatch(e,t){const{renderer:r}=this;r.compute(e.kernel,t),this._timestampUIDs?.push(r.backend.getTimestampUID(e.kernel))}async _measureFrameTime(e){const{renderer:t,timing:r,frameBudget:i}=this,{backend:n}=t;this._timingFrame=!0,await t.resolveTimestampsAsync(nl.COMPUTE),this._timingFrame=!1,e.every(s=>n.hasTimestampQuery(s))&&(r.frameTime=e.reduce((s,o)=>s+n.getTimestamp(o),0),r.frameBudget=i,r.count++)}*createRenderTask(){}async getSampleCountsAsync(){return{min:0,max:0,avg:0}}resetSeed(){}reset(){const{renderer:e,outputTargetClearKernel:t,sampleCountClearKernel:r,outputTarget:i,prevOutputTarget:n,sampleCountTarget:s}=this;if(!e.initialized)return;const{width:o,height:l}=i,d=t.getDispatchSize(o,l);if(t.target=i,e.compute(t.kernel,d),t.target=n,e.compute(t.kernel,d),r.target=s,e.compute(r.kernel,d),this.auxTarget){const{auxTargetClearKernel:c}=this;c.target=this.auxTarget,e.compute(c.kernel,c.getDispatchSize(o,l,Fe))}this._renderTask=null}dispose(){this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.sampleCountClearKernel.dispose(),this.outputTargetClearKernel.dispose(),this.auxTargetClearKernel.dispose(),this.auxTarget?.dispose(),this._auxPlaceholder.dispose(),this._renderTask=null}}const Yi=new G;class Rd extends zo{constructor(e){super(e),this.envInfo=new Ao,this._completedSamples=0,this._tileProgress=0,this.kernel=new ud().setWorkgroupSize(8,8,1),this.kernel.envInfo=this.envInfo,this.backgroundInfo=new Fo,this.kernel.backgroundInfo=this.backgroundInfo,this.lightsInfo=new Lo,this.kernel.lightsInfo=this.lightsInfo}resetSeed(){this.kernel.seed=0}reset(){super.reset(),this._completedSamples=0,this._tileProgress=0}async getSampleCountsAsync(){if(this.lowResMode)return{min:0,max:0,avg:0};const e=this._completedSamples,t=this._tileProgress;return{min:t===1?e+1:e,max:e+1,avg:e+t}}setBVHData(e){this.kernel.context.bvhData=e,this.rebuild()}rebuild(){super.rebuild(),this.kernel.needsUpdate=!0,this.reset()}setRandom(e){this.kernel.context.random=e,this.kernel.needsUpdate=!0,this.reset()}setMaterial(e){this.kernel.material=e.getData(),this.kernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.kernel.filterGlossy=e===0?So:1/e,this.reset()}setClamping(e,t){this.kernel.clampDirect=e,this.kernel.clampIndirect=t,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setMultipleImportanceSampling(e){this.kernel.misEnabled=e?1:0,this.reset()}setEnvironmentParams(e,t){const{envInfo:r}=this,i=new W().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(i),r.intensityNode.value=e}setBackground(e){const{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){const{backgroundInfo:i}=this,n=new W().makeRotationFromEuler(t).invert();i.rotationNode.value.copy(n),i.intensity=e,i.blur=r}setTransmissiveBackground(e){this.kernel.transmissiveBackground=e,this.reset()}*createRenderTask(){const{renderer:e,kernel:t,maxBounces:r,maxTransparentBounces:i,maxSubsurfaceBounces:n,outputTarget:s,sampleCountTarget:o,lowResMode:l}=this,d=new G;t.outputTarget=s,t.sampleCountTarget=o,t.maxBounces=r,t.maxTransparentBounces=i,t.maxSubsurfaceBounces=n,yield*this.compileKernels([t]);let c=0;for(;;){if(t.maxSamples=this.maxSamples,t.auxTarget=this.auxTarget??this._auxPlaceholder,t.accumulateAux=this.auxTarget?1:0,this.maxSamples!==0&&c>=this.maxSamples){yield;continue}this.getSize(Yi);const u=l?1:Math.max(1,Math.ceil(Yi.x*Yi.y/this.frameBudget));d.x=Math.ceil(Math.sqrt(u)),d.y=Math.ceil(u/d.x);const f=this.lowResMode?1:d.x*d.y;let p=0;const h=t.tileSize;l?this.getSize(h):this.getSize(h).divide(d).ceil();const y=t.getDispatchSize(h.x,h.y);t.seed+=1,e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],t.prevOutputTarget=this.prevOutputTarget,t.outputTarget=this.outputTarget;for(let x=0;x<d.x;x++)for(let b=0;b<d.y;b++)t.offset.set(x,b).multiply(h),this.dispatch(t,y),p=Math.min(p+1,f),this._completedSamples=c,this._tileProgress=p/f,yield;c++}}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.kernel.dispose()}}class Cd extends O{constructor(e,t,r=[]){super(e,t),this.dependencies=r}setup(e){for(const t of this.dependencies)t.build(e);super.setup(e)}}const Eo={throughputColor:"vec3f",currentBounce:"uint",resultColor:"vec4f",emission:"vec3f",scatterPdf:"float",scatterColor:"vec3f",minPdf:"float",origin:"vec3f",isFullyTransmissive:"uint",direction:"vec3f",side:"float",normal:"vec3f",objectIndex:"int",barycoord:"vec3f",pixelIndex:"uint",indices:"vec3u",seed:"uint",lightDirection:"vec3f",lightPdf:"float",lightEmission:"vec3f",lightDist:"float",lightBsdf:"vec3f",lightBsdfPdf:"float",rayIntersectionIndex:"int",shadowRayIntersectionIndex:"int",lightType:"int",dist:"float",alphaDepth:"uint",rayStart:"float",maxDist:"float",dispersionWavelength:"float",auxAlbedo:"uint",auxNormal:"uint",subsurfaceBounces:"uint",walkPending:"uint",mediumScattered:"uint"},ze=new Cd({...Eo,medium:Qt.name},"RayData",[Qt]),Dd=new O(Eo).getLength();ze.getLength=()=>Dd+Qt.getLength();const jt=new O({origin:"vec3f",pixelIndex:"uint",direction:"vec3f",rngIndex:"uint",seed:"uint",maxDist:"float",_alignment0:"uint",_alignment1:"uint"},"TraceQueuedRay"),$i=new O({barycoord:"vec3f",objectIndex:"int",position:"vec3f",dist:"float",normal:"vec3f",side:"float",indices:"vec3u"},"TraceResult"),js=new O({objectIndex:"int",skippedOcclusion:"float",occlusion:"float"},"ShadowTraceResult"),Vt=0,Gs=1,Zi=2,Ks=0,hi=1,ko=0,pi=1,br=2;class $d extends te{constructor(){const e={rayDataStorage:E(new N(1,1),ze),pixelQueue:E(new N(1,1),"uint"),targetDimensions:B(new G),frameBudget:B(0,"uint"),globalId:ae},t=I`
			fn compute( targetDimensions: vec2u, frameBudget: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				let rayCount = min( frameBudget, arrayLength( rayDataStorage ) );
				let pixelCount = targetDimensions.x * targetDimensions.y;
				if ( globalId.x == 0u && globalId.y == 0u ) {

					pixelQueue[ ${ko}u ] = 0u;
					pixelQueue[ ${pi}u ] = select( 0u, pixelCount - rayCount, pixelCount >= rayCount );

				}

				let pixelHash = ( globalId.x << 16 ) | globalId.y;
				let pixelIndex = globalId.x + globalId.y * targetDimensions.x;
				if ( pixelIndex < rayCount ) {

					rayDataStorage[ pixelIndex ].pixelIndex = pixelHash;
					rayDataStorage[ pixelIndex ].resultColor = vec4f( 0.0 );
					rayDataStorage[ pixelIndex ].throughputColor = vec3f( 0.0 );
					rayDataStorage[ pixelIndex ].objectIndex = - 1;
					rayDataStorage[ pixelIndex ].alphaDepth = 0u;
					rayDataStorage[ pixelIndex ].rayIntersectionIndex = - 1;
					rayDataStorage[ pixelIndex ].shadowRayIntersectionIndex = - 1;

				} else {

					pixelQueue[ ${br}u + pixelIndex - rayCount ] = pixelHash;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}class Md extends te{constructor(){const e={envInfo:{value:null},backgroundInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:de(Wt()).toReadOnly(),outputTarget:de(Wt()).toWriteOnly(),sampleCountTarget:de(wi()).toReadWrite(),auxTarget:de(qt()).toReadWrite(),misEnabled:B(1,"uint"),rayCount:B(0,"uint"),maxBounces:B(5,"uint"),clampDirect:B(0),clampIndirect:B(10),transmissiveBackground:B(qs),accumulateAux:B(0,"uint"),rayDataStorage:E(new N(1,1),ze),rayIntersectionsStorage:E(new N(1,1),$i),shadowRayIntersectionsStorage:E(new N(1,1),js),globalId:ae},t=ee("envInfo.value.totalSumNode",e),r=ee("envInfo.value.intensityNode",e),i=ee("envInfo.value.sampleColor",e),n=ee("envInfo.value.sampleDir",e),s=ee("envInfo.value.getDirPdf",e),o=ee("envInfo.value.getWeight",e),l=ee("backgroundInfo.value.sampleColor",e),d=ee("lightsInfo.value.countNode",e),c=K("lightsInfo.value.randomLightSample",e),u=K("lightsInfo.value.intersectLightAtIndex",e),f=K("lightsInfo.value.getLightWeight",e),p=K("lightsInfo.value.getLightsWeight",e),h=K("lightsInfo.value.selectLight",e),y=K("lightsInfo.value.isLightVisibleToCamera",e),x=I`

			fn compute(
				// settings
				misEnabled: u32,
				rayCount: u32,
				maxBounces: u32,
				clampDirect: f32,
				clampIndirect: f32,
				transmissiveBackground: u32,
				accumulateAux: u32,

				globalId: vec3u
			) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};
				let shadowRayIntersectionsStorage = &${e.shadowRayIntersectionsStorage};

				// bound by "rayCount" rather than the pool length. See MaterialKernel
				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				// skip slots that have never spawned a ray
				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				if ( input.rayIntersectionIndex < 0 ) {

					return;

				}

				let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
				${xt}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

				// one-sample NEE chooses between the analytic lights and the environment, matched with
				// the megakernel
				let envActive = ${t} > 0.0 && ${r} > 0.0;
				let lightsCount = ${d};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${o}();

				}

				var resultColor = input.resultColor;
				var throughputColor = input.throughputColor;

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				// resolve the previous surface's NEE shadow ray (pre-scatter throughput). The index
				// is negative when no shadow ray was enqueued last frame
				if ( input.shadowRayIntersectionIndex >= 0 && input.lightPdf > 0.0 ) {

					let shadowHit = ${e.shadowRayIntersectionsStorage}[ u32( input.shadowRayIntersectionIndex ) ];
					let occluded = shadowHit.objectIndex >= 0;
					if ( ! occluded ) {

						// env + area lights are also found by bsdf rays, so MIS-weight them. Punctual lights, and lights
						// past the bounce limit, take full weight. Bsdf rays stopped by faces the shadow ray skipped can't
						// find the light, so their share of the weight moves to the light sample
						let isMISWeighted = ${po}( input.lightType ) && input.currentBounce < maxBounces;
						let misWeight = select( 1.0, mix( ${et}( input.lightPdf, input.lightBsdfPdf ), 1.0, shadowHit.skippedOcclusion ), isMISWeighted );
						let directLight = throughputColor * input.lightEmission * input.lightBsdf * misWeight * ( 1.0 - shadowHit.occlusion ) / input.lightPdf;
						let contribution = ${re}( directLight, input.currentBounce, clampDirect, clampIndirect );
						resultColor += vec4f( contribution, 0.0 );

					}

				}

				// emission gathered at the previous surface (pre-scatter throughput). Found light clamps
				// at the depth of the segment that found it, as in Cycles, so one less than the current
				let emission = ${re}( throughputColor * input.emission, max( input.currentBounce, 1u ) - 1u, clampDirect, clampIndirect );
				resultColor += vec4f( emission, 0.0 );

				// reconstruct the scatter record staged by MaterialKernel
				var scatterRec: ${dt};
				scatterRec.color = input.scatterColor;
				scatterRec.pdf = input.scatterPdf;

				// the bounce limit, russian roulette, and terminating scatter checks all ran in
				// MaterialKernel, which stages a zeroed pdf and skips the bounce trace when they fire
				var isTerminated = all( throughputColor == vec3f( 0.0 ) ) || input.currentBounce >= maxBounces || ${Hs}( scatterRec );

				// apply the scatter across the traced segment, including the weight of a medium walk
				if ( ! isTerminated ) {

					throughputColor *= scatterRec.color / scatterRec.pdf;

				}

				let isWalking = ! isTerminated && input.walkPending != 0u;
				if ( isWalking ) {

					// the walk hasn't reached a surface yet, so there's no hit to stage. Clear what was
					// resolved and let MediumKernel accumulate the walk's weight
					rayDataStorage[ index ].emission = vec3f( 0.0 );
					rayDataStorage[ index ].lightPdf = 0.0;
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
					rayDataStorage[ index ].scatterColor = vec3f( 1.0 );
					rayDataStorage[ index ].scatterPdf = 1.0;

				} else if ( ! isTerminated ) {

					let hitResult = ${e.rayIntersectionsStorage}[ u32( input.rayIntersectionIndex ) ];
					let didHit = hitResult.objectIndex >= 0;
					let surfaceDist = select( ${yt}, hitResult.dist, didHit );

					// NEE's total weight at the vertex this segment left, for MIS. Camera segments have none,
					// and neither do scatter events in a medium
					let isMISWeighted = misEnabled != 0u && input.currentBounce > 0u && input.mediumScattered == 0u;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${p}( input.origin ) + envWeight;

					}

					// forward hits on area lights along the traced segment, which starts "rayStart" along the ray.
					// Camera rays only see visibleToCameraRays lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( input.currentBounce == 0u && ! ${y}( li ) ) {

							continue;

						}

						var lightRec: ${Oe};
						if ( ${u}( input.origin, input.direction, li, &lightRec ) && lightRec.dist > input.rayStart && lightRec.dist < input.rayStart + surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${f}( li, input.origin ) / lightTotalWeight;
								misWeight = ${et}( input.scatterPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${re}( lightRec.emission * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
							cameraHitLight = cameraHitLight || input.currentBounce == 0u;

						}

					}

					if ( didHit ) {

						// stage the hit for MaterialKernel
						rayDataStorage[ index ].barycoord = hitResult.barycoord;
						rayDataStorage[ index ].normal = hitResult.normal;
						rayDataStorage[ index ].side = hitResult.side;
						rayDataStorage[ index ].indices = hitResult.indices;
						rayDataStorage[ index ].objectIndex = hitResult.objectIndex;
						rayDataStorage[ index ].dist = hitResult.dist;

						// next event estimation: choose one light or the environment by its estimated
						// contribution. MaterialKernel evaluates the bsdf and enqueues the shadow ray.
						var lightPdf = 0.0;
						if ( misEnabled != 0u ) {

							let ruv = ${Es}( ${io} );
							var selectionPdf = 0.0;
							let lightIndex = ${h}( hitResult.position, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${Oe};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${n}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${yt};
									lightRec.lightType = ${Os};

								} else {

									lightRec = ${c}( lightIndex, hitResult.position, ruv.yz );

								}

								lightPdf = lightRec.pdf * selectionPdf;
								rayDataStorage[ index ].lightDirection = lightRec.direction;
								rayDataStorage[ index ].lightEmission = lightRec.emission;
								rayDataStorage[ index ].lightDist = lightRec.dist;
								rayDataStorage[ index ].lightType = lightRec.lightType;

							}

						}

						rayDataStorage[ index ].lightPdf = lightPdf;

					} else {

						// the segment escaped the scene: gather the environment for opaque paths, or
						// the background for camera segments and fully transmissive paths
						if ( input.currentBounce > 0u && input.isFullyTransmissive == 0u ) {

							var misWeight = 1.0;
							if ( isMISWeighted && envActive ) {

								// match the env pdf scaling used by the NEE selection so the two estimators balance
								let envPdf = ${s}( input.direction ) * envWeight / lightTotalWeight;
								misWeight = ${et}( input.scatterPdf, envPdf );

							}

							let environment = ${i}( input.direction ).rgb * throughputColor * misWeight;
							let contribution = ${re}( environment, input.currentBounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${Ae}( ${to} );
							let bg = ${l}( input.direction, rng );
							if ( input.currentBounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${re}( bg.a * bg.rgb, input.currentBounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${i}( input.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;

								var misWeight = 1.0;
								if ( misEnabled != 0u && envActive ) {

									let envPdf = ${s}( input.direction );
									misWeight = ${et}( input.scatterPdf, envPdf );

								}

								if ( transmissiveBackground == ${Po}u ) {

									// display the env map through transmissive surfaces
									let background = ${re}( env.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${Bo}u ) {

									// fade the background by the throughput color average
									let background = ${re}( bg.a * bg.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * misWeight;
									let background = ${re}( light * throughputColor, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								}

							}

						}

						isTerminated = true;

					}

				}

				// visible lights are opaque against a transparent background
				resultColor += vec4f( lightHits, 0.0 );
				if ( cameraHitLight ) {

					resultColor.a = 1.0;

				}

				// the color rows are stored top down to match a rasterized render target
				let colorIndex = vec2u( indexUV.x, textureDimensions( ${e.outputTarget} ).y - 1u - indexUV.y );
				let storedSamples = textureLoad( ${e.sampleCountTarget}, indexUV ).r & ${vr}u;

				if ( isTerminated ) {

					// blend the finished sample into the output and free the slot for a new camera ray
					let sampleCount = storedSamples + 1;
					let prevColor = textureLoad( ${e.prevOutputTarget}, colorIndex );
					let blendedColor = ${fo}( prevColor, resultColor, 1.0 / f32( sampleCount ) );
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${Qs}u | sampleCount ) );
					textureStore( ${e.outputTarget}, colorIndex, blendedColor );

					// the auxiliary images are blended the same way, in the same row order
					if ( accumulateAux != 0u ) {

						var auxPacked: vec3u;
						for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

							auxPacked[ layer ] = textureLoad( ${e.auxTarget}, colorIndex, layer ).r;

						}

						let albedo = unpack4x8unorm( input.auxAlbedo ).rgb;
						let normal = unpack4x8snorm( input.auxNormal ).xyz;
						auxPacked = ${ja}( auxPacked, albedo, normal, 1.0 / f32( sampleCount ) );
						for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

							textureStore( ${e.auxTarget}, colorIndex, layer, vec4u( auxPacked[ layer ] ) );

						}

					}

					rayDataStorage[ index ].objectIndex = - 1;

				} else {

					// show the path so far, which the first sample overwrites
					if ( storedSamples == 0u ) {

						textureStore( ${e.outputTarget}, colorIndex, resultColor );

					}

					rayDataStorage[ index ].resultColor = resultColor;
					rayDataStorage[ index ].throughputColor = throughputColor;

				}

			}
		`;super(x(e)),this.defineUniformAccessors(e)}}class Pd extends te{constructor(){const e={material:{value:null},seed:B(0,"uint"),targetDimensions:B(new G),maxSamples:B(0,"uint"),rayCount:B(0,"uint"),filterGlossy:B(1),maxTransparentBounces:B(5,"uint"),maxBounces:B(5,"uint"),sampleCountTarget:de(wi()).toReadWrite(),rayDataStorage:E(new N(1,1),ze),rayQueue:E(new N(1,1),jt),shadowRayQueue:E(new N(1,1),jt),queueCounters:E(new N(1,1),"uint").toAtomic(),pixelQueue:E(new N(1,1),"uint").toAtomic(),globalId:ae},t=ue("bvhData.fns.getCameraRay"),r=ue("bvhData.fns.sampleTrianglePoint"),i=ue("bvhData.fns.getSurfaceRecord"),n=K("material.value.bsdfSample",e),s=K("material.value.bsdfEvalPdf",e),o=_e("bvhData.storage.materials"),l=_e("bvhData.storage.transforms"),d=I`

			fn compute(
				seed: u32,
				targetDimensions: vec2u,
				maxSamples: u32,
				rayCount: u32,
				filterGlossy: f32,
				maxTransparentBounces: u32,
				maxBounces: u32,

				globalId: vec3u
			) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let rayQueue = &${e.rayQueue};
				let shadowRayQueue = &${e.shadowRayQueue};
				let queueCounters = &${e.queueCounters};
				let pixelQueue = &${e.pixelQueue};

				// bound by "rayCount" rather than the pool length. The dispatch rounds up to the
				// workgroup size and those extra slots hold a zeroed pixel index
				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				if ( input.objectIndex < 0 ) {

					// the slot's path has terminated: recycle the pixel through the overflow queue and
					// generate a fresh camera ray
					var pixelIndex = input.pixelIndex;
					let elementCount = atomicLoad( &pixelQueue[ ${pi}u ] );
					if ( elementCount > 0u ) {

						// TODO: If we've pulled off a pixel that's already finished we currently just
						// write a no-op ray, wasting a frame. It may be better to iterate over a few
						// points in the queue to see if we can find one we can use.
						let queueIndex = atomicAdd( &pixelQueue[ ${ko}u ], 1u ) % elementCount;
						pixelIndex = atomicExchange( &pixelQueue[ ${br}u + queueIndex ], pixelIndex );

					}

					let indexUV = vec2u( pixelIndex >> 16, pixelIndex & 0xFFFF );

					// skip the pixel if it has hit the sample limit
					let combinedField = textureLoad( ${e.sampleCountTarget}, indexUV ).r;
					let samples = ( ${vr}u & combinedField );
					let isComplete = maxSamples != 0u && samples >= maxSamples;

					if ( isComplete ) {

						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					${xt}( indexUV, seed + samples, 0 );

					let uv = vec2f( indexUV ) / vec2f( targetDimensions );
					let jitteredUv = uv + ${Ae}( ${eo} ) / vec2f( targetDimensions );
					var ray: ${k};
					if ( ! ${t}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

						// the camera declined the pixel, so leave the slot dormant for this round. With a
						// sample cap the pixel counts as finished, since it will never take a sample
						// TODO: same as above - this work is a bit wasteful and leaves slots empty for
						// a frame. Is it possible to quickly skip rays outside the mask or are finished?
						if ( maxSamples != 0u ) {

							textureStore( ${e.sampleCountTarget}, indexUV, vec4( ( combinedField & ~${vr}u ) | maxSamples ) );

						}

						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					ray.direction = normalize( ray.direction );

					let rayIndex = atomicAdd( &queueCounters[ ${Vt}u ], 1u );
					rayQueue[ rayIndex ].origin = ray.origin;
					rayQueue[ rayIndex ].direction = ray.direction;
					rayQueue[ rayIndex ].pixelIndex = pixelIndex;
					rayQueue[ rayIndex ].rngIndex = 0u;
					rayQueue[ rayIndex ].seed = seed + samples;
					rayQueue[ rayIndex ].maxDist = ray.maxDist;

					rayDataStorage[ index ].origin = ray.origin;
					rayDataStorage[ index ].direction = ray.direction;
					rayDataStorage[ index ].pixelIndex = pixelIndex;
					rayDataStorage[ index ].seed = seed + samples;
					rayDataStorage[ index ].currentBounce = 0u;
					rayDataStorage[ index ].throughputColor = vec3f( 1.0 );
					rayDataStorage[ index ].resultColor = vec4f( 0.0, 0.0, 0.0, 1.0 );
					rayDataStorage[ index ].scatterColor = vec3f( 1.0 );
					rayDataStorage[ index ].scatterPdf = 1.0;
					rayDataStorage[ index ].minPdf = 1.0;
					rayDataStorage[ index ].isFullyTransmissive = 1u;
					rayDataStorage[ index ].emission = vec3f( 0.0 );
					rayDataStorage[ index ].lightPdf = 0.0;
					rayDataStorage[ index ].alphaDepth = 0u;
					rayDataStorage[ index ].rayStart = 0.0;
					rayDataStorage[ index ].maxDist = ray.maxDist;
					rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
					rayDataStorage[ index ].dispersionWavelength = - mix( ${_i}.0, ${Ri}.0, ${mt}( ${no} ) );
					rayDataStorage[ index ].auxAlbedo = 0u;
					rayDataStorage[ index ].auxNormal = 0u;
					rayDataStorage[ index ].subsurfaceBounces = 0u;
					rayDataStorage[ index ].walkPending = 0u;
					rayDataStorage[ index ].mediumScattered = 0u;
					rayDataStorage[ index ].medium.inside = 0u;

					// write the active params & dispatched flag
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${cd}u | ${Qs}u | samples ) );

				} else if ( input.walkPending == 0u ) {

					// evaluate the surface staged by LogicKernel. Paths still walking a medium have none
					let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
					${xt}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

					// the medium the path is in, which the bsdf sample may enter or exit
					var medium = ${go}( input.medium );
					let segmentInMedium = medium.inside;

					let objectInfo = ${l}[ u32( input.objectIndex ) ];
					var materialInfo = ${o}[ objectInfo.materialIndex ];

					// a matte surface hit by the camera ray renders as a fully transparent
					let isMatte = materialInfo.matte != 0 && input.currentBounce == 0u;
					if ( isMatte ) {

						rayDataStorage[ index ].resultColor = vec4f( 0.0 );
						rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
						rayDataStorage[ index ].emission = vec3f( 0.0 );
						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					// apply per-object colors
					materialInfo.color *= objectInfo.color.rgb;
					materialInfo.opacity *= objectInfo.color.a;

					var vertexData = ${r}( input.barycoord, input.indices );
					vertexData.normal = normalize( transpose( objectInfo.inverseMatrixWorld ) * vertexData.normal );
					vertexData.tangent = vec4f( ( objectInfo.matrixWorld * vec4f( vertexData.tangent.xyz, 0.0 ) ).xyz, vertexData.tangent.w );
					vertexData.position = objectInfo.matrixWorld * vertexData.position;

					let view = - input.direction;

					// blur glossy surfaces after low-probability bounces to suppress fireflies,
					// from the Cycles "filter glossy" approach in integrator/surface_shader.h
					let blurRoughness = sqrt( clamp( 1.0 - filterGlossy * input.minPdf, 0.0, 1.0 ) ) * 0.5;

					var surface = ${i}( materialInfo, vertexData, input.side, input.normal, view, blurRoughness );

					// Stochastically pass through partially transparent surfaces by re-enqueueing
					// the ray at the hit point, advancing the alpha depth but not the bounce count.
					let passesThrough = ${mt}( ${lo} ) > surface.opacity;
					if ( passesThrough ) {

						// out of transparent bounces, so stop rather than shading a surface that
						// should be invisible. A zeroed throughput terminates in LogicKernel.
						if ( input.alphaDepth >= maxTransparentBounces ) {

							rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
							rayDataStorage[ index ].emission = vec3f( 0.0 );
							rayDataStorage[ index ].lightPdf = 0.0;
							rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
							return;

						}

						let alphaOrigin = ${ht}( vertexData.position.xyz, input.direction, input.normal );
						if ( segmentInMedium ) {

							// inside a medium, MediumKernel walks on past the surface, from the surface
							rayDataStorage[ index ].walkPending = 1u;
							rayDataStorage[ index ].origin = alphaOrigin;
							rayDataStorage[ index ].rayStart = 0.0;

						} else {

							let alphaIndex = atomicAdd( &queueCounters[ ${Vt}u ], 1u );
							rayQueue[ alphaIndex ].origin = alphaOrigin;
							rayQueue[ alphaIndex ].direction = input.direction;
							rayQueue[ alphaIndex ].pixelIndex = input.pixelIndex;
							rayQueue[ alphaIndex ].rngIndex = input.currentBounce + input.alphaDepth + 1u + input.subsurfaceBounces;
							rayQueue[ alphaIndex ].seed = input.seed;
							// the origin advanced to the hit point, so the remaining budget shrinks by the
							// distance already traced
							rayQueue[ alphaIndex ].maxDist = max( input.maxDist - input.dist, 0.0 );
							rayDataStorage[ index ].rayIntersectionIndex = i32( alphaIndex );

							// the ray keeps its origin, and only the queued traversal starts past the surface
							rayDataStorage[ index ].rayStart = input.rayStart + input.dist;

						}

						// the surface is skipped, so no scatter or emission is staged for LogicKernel.
						// "pdf" is left alone so the previous scatter still weights the forward MIS,
						// and "bsdf" matches it so applying the scatter leaves the throughput as is.
						rayDataStorage[ index ].alphaDepth = input.alphaDepth + 1u;
						rayDataStorage[ index ].emission = vec3f( 0.0 );
						rayDataStorage[ index ].scatterColor = vec3f( input.scatterPdf );
						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					// apply the hero wavelength to dispersive surfaces, folding the spectral weight
					// into the throughput at the path's first dispersive interaction
					var throughputColor = input.throughputColor;
					let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
					if ( isDispersive ) {

						let wavelength = abs( input.dispersionWavelength );
						${Ro}( &surface, materialInfo.dispersion, wavelength );
						if ( input.dispersionWavelength < 0.0 ) {

							rayDataStorage[ index ].dispersionWavelength = wavelength;
							throughputColor *= ${Co}( wavelength );
							rayDataStorage[ index ].throughputColor = throughputColor;

						}

					}

					// attenuate the light transmitted through the volume when exiting a backface so
					// the surface's emission and NEE resolve against the attenuated throughput. MediumKernel
					// already applied a scattering medium's transmittance
					if ( input.side < 0.0 && materialInfo.transmission > 0.0 && ! segmentInMedium ) {

						throughputColor *= ${_o}( input.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );
						rayDataStorage[ index ].throughputColor = throughputColor;

					}

					// sample the next bounce direction and stage the scatter state for LogicKernel
					var scatterRec = ${n}( view, surface );
					let newBounce = input.currentBounce + 1u;

					// The first surface the path scatters off fills the denoiser's auxiliary images. Until one is
					// found the last mirror or transmission hit stands in, for paths that reach the environment.
					// The albedo is tinted by the throughput of the surfaces looked past to reach it. The packed
					// albedo's alpha marks the surface found
					let auxFound = unpack4x8unorm( input.auxAlbedo ).a != 0.0;
					if ( ! auxFound ) {

						let isAuxSurface = ${Qa}( surface, scatterRec );
						let auxAlbedo = saturate( throughputColor * surface.color );
						rayDataStorage[ index ].auxAlbedo = pack4x8unorm( vec4f( auxAlbedo, select( 0.0, 1.0, isAuxSurface ) ) );
						rayDataStorage[ index ].auxNormal = pack4x8snorm( vec4f( surface.normal, 0.0 ) );

					}

					// decide termination now so finished paths skip the bounce trace entirely - a
					// zeroed pdf reads as a terminating scatter in LogicKernel, which still resolves
					// the surface's emission and NEE before freeing the slot
					var isTerminated = newBounce >= maxBounces || all( scatterRec.color == vec3f( 0.0 ) ) || ${Hs}( scatterRec );

					// russian roulette early out:
					// Matches Cycles path_state_continuation_probability in integrator/path_state.h
					if ( ! isTerminated && newBounce >= 3u ) {

						let rrThroughput = throughputColor * scatterRec.color / scatterRec.pdf;
						let rrProb = saturate( sqrt( max( max( rrThroughput.r, rrThroughput.g ), rrThroughput.b ) ) );
						isTerminated = rrProb <= 0.0 || ${mt}( ${so} ) > rrProb;
						if ( ! isTerminated ) {

							// fold the survival boost into the scatter color so LogicKernel's
							// throughput update applies it without a separate division
							scatterRec.color /= rrProb;

						}

					}

					// Write the ray storage content here since things like the emissive value is read
					// in the logic kernel on the subsequent frame.
					rayDataStorage[ index ].scatterColor = scatterRec.color;
					rayDataStorage[ index ].scatterPdf = select( scatterRec.pdf, 0.0, isTerminated );
					rayDataStorage[ index ].minPdf = min( input.minPdf, scatterRec.pdf );
					rayDataStorage[ index ].isFullyTransmissive = input.isFullyTransmissive & select( 0u, 1u, scatterRec.isTransmissive );
					rayDataStorage[ index ].emission = surface.emission;
					rayDataStorage[ index ].currentBounce = newBounce;
					rayDataStorage[ index ].mediumScattered = 0u;

					// As in "KHR_materials_scatter", the surface bsdf is the medium's boundary: refracting out
					// ends the walk, reflecting continues it
					if ( segmentInMedium && u32( input.objectIndex ) == medium.object && input.side < 0.0 && scatterRec.isTransmissive ) {

						medium.inside = false;

					}

					// refracting into a front face of a scattering material starts a random walk inside it
					if ( scatterRec.isTransmissive && ! surface.thinWall && input.side > 0.0 ) {

						let entered = ${xo}( materialInfo, u32( input.objectIndex ) );
						if ( entered.inside ) {

							medium = entered;

						}

					}

					// keep the medium the path left or entered
					if ( segmentInMedium || medium.inside ) {

						// a whole struct is written to the buffer, not through the pointer alias, which Safari fails to compile
						${e.rayDataStorage}[ index ].medium = ${Ru}( medium );

					}

					// the NEE shadow ray below still resolves the surface's direct light, so only
					// the bounce segment is skipped for finished paths. Inside a medium, MediumKernel walks it
					if ( ! isTerminated && medium.inside ) {

						rayDataStorage[ index ].walkPending = 1u;
						rayDataStorage[ index ].origin = ${ht}( vertexData.position.xyz, scatterRec.direction, input.normal );
						rayDataStorage[ index ].direction = scatterRec.direction;
						rayDataStorage[ index ].rayStart = 0.0;

					} else if ( ! isTerminated ) {

						let rayIndex = atomicAdd( &queueCounters[ ${Vt}u ], 1u );
						rayQueue[ rayIndex ].origin = ${ht}( vertexData.position.xyz, scatterRec.direction, input.normal );
						rayQueue[ rayIndex ].direction = scatterRec.direction;
						rayQueue[ rayIndex ].pixelIndex = input.pixelIndex;
						rayQueue[ rayIndex ].rngIndex = newBounce + input.alphaDepth + input.subsurfaceBounces;
						rayQueue[ rayIndex ].seed = input.seed;
						rayQueue[ rayIndex ].maxDist = 0.0;
						rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );

						rayDataStorage[ index ].origin = rayQueue[ rayIndex ].origin;
						rayDataStorage[ index ].direction = scatterRec.direction;
						rayDataStorage[ index ].rayStart = 0.0;

					}

					// evaluate the bsdf toward the light LogicKernel selected and enqueue the shadow ray.
					// the light pdf will be 0 if NEE is disabled.
					var lightPdf = input.lightPdf;
					if ( lightPdf > 0.0 ) {

						let evalRec = ${s}( view, input.lightDirection, surface );
						if ( evalRec.pdf > 0.0 ) {

							rayDataStorage[ index ].lightBsdf = evalRec.color;
							rayDataStorage[ index ].lightBsdfPdf = evalRec.pdf;

							let shadowIndex = atomicAdd( &queueCounters[ ${Gs}u ], 1u );
							shadowRayQueue[ shadowIndex ].origin = ${ht}( vertexData.position.xyz, input.lightDirection, input.normal );
							shadowRayQueue[ shadowIndex ].direction = input.lightDirection;
							shadowRayQueue[ shadowIndex ].pixelIndex = input.pixelIndex;
							shadowRayQueue[ shadowIndex ].rngIndex = input.currentBounce + input.alphaDepth + input.subsurfaceBounces;
							shadowRayQueue[ shadowIndex ].seed = input.seed;
							shadowRayQueue[ shadowIndex ].maxDist = input.lightDist * ( 1.0 - ${ho} );
							rayDataStorage[ index ].shadowRayIntersectionIndex = i32( shadowIndex );

						} else {

							lightPdf = 0.0;

						}

					}

					if ( lightPdf <= 0.0 ) {

						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;

					}

				}

			}
		`;super(d(e)),this.defineUniformAccessors(e)}}class Bd extends te{constructor(){const e={rayQueue:E(new N(1,1),jt),queueCounters:E(new N(1,1),"uint"),rayIntersectionsStorage:E(new N(1,1),$i),globalId:ae},t=_e("bvhData.fns.raycastFirstHit.outputType"),r=_e("bvhData.fns.raycastFirstHit"),i=I`

			fn compute( globalId: vec3u ) -> void {

				let rayQueue = &${e.rayQueue};
				let queueCounters = &${e.queueCounters};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= queueCounters[ ${Vt}u ] ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let queuedRay = ${e.rayQueue}[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${xt}( indexUV, queuedRay.seed, queuedRay.rngIndex );

				let ray = Ray( queuedRay.origin, queuedRay.direction, queuedRay.maxDist );
				var hitResult: ${t};
				if ( ${r}( ray, &hitResult ) ) {

					rayIntersectionsStorage[ index ].barycoord = hitResult.barycoord;
					rayIntersectionsStorage[ index ].objectIndex = i32( hitResult.objectIndex );
					rayIntersectionsStorage[ index ].position = ray.origin + ray.direction * hitResult.dist;
					rayIntersectionsStorage[ index ].dist = hitResult.dist;
					rayIntersectionsStorage[ index ].normal = hitResult.normal.xyz;
					rayIntersectionsStorage[ index ].side = hitResult.side;
					rayIntersectionsStorage[ index ].indices = hitResult.indices.xyz;

				} else {

					rayIntersectionsStorage[ index ].objectIndex = - 1;

				}

			}
		`;super(i(e)),this.defineUniformAccessors(e)}}class Ad extends te{constructor(){const e={shadowRayQueue:E(new N(1,1),jt),queueCounters:E(new N(1,1),"uint"),shadowRayIntersectionsStorage:E(new N(1,1),js),globalId:ae},t=_e("bvhData.fns.raycastFirstHit.outputType"),r=_e("bvhData.fns.raycastShadow"),i=I`

			fn compute( globalId: vec3u ) -> void {

				let shadowRayQueue = &${e.shadowRayQueue};
				let queueCounters = &${e.queueCounters};
				let shadowRayIntersectionsStorage = &${e.shadowRayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= queueCounters[ ${Gs}u ] ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let queuedRay = ${e.shadowRayQueue}[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${xt}( indexUV, queuedRay.seed, queuedRay.rngIndex );

				let ray = Ray( queuedRay.origin, queuedRay.direction, queuedRay.maxDist );
				var hitResult: ${t};
				let occluded = ${r}( ray, &hitResult );
				shadowRayIntersectionsStorage[ index ].objectIndex = select( - 1, i32( hitResult.objectIndex ), occluded );
				shadowRayIntersectionsStorage[ index ].skippedOcclusion = hitResult.skippedOcclusion;
				shadowRayIntersectionsStorage[ index ].occlusion = hitResult.occlusion;

			}
		`;super(i(e)),this.defineUniformAccessors(e)}}class Fd extends te{constructor(){const e={maxSubsurfaceBounces:B(256,"uint"),stepsPerPass:B(16,"uint"),rayCount:B(0,"uint"),rayDataStorage:E(new N(1,1),ze),mediumQueue:E(new N(1,1),"uint"),rayIntersectionsStorage:E(new N(1,1),$i),globalId:ae},t=_e("bvhData.fns.raycastFirstHit.outputType"),r=_e("bvhData.fns.raycastFirstHit"),i=I`

			fn compute( maxSubsurfaceBounces: u32, stepsPerPass: u32, rayCount: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let mediumQueue = &${e.mediumQueue};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};

				if ( globalId.x >= mediumQueue[ ${Ks}u ] ) {

					return;

				}

				let index = mediumQueue[ ${hi}u + globalId.x ];
				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				let medium = ${go}( input.medium );

				let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
				${xt}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

				var ray = Ray( input.origin, input.direction, 0.0 );
				var weight = input.scatterColor;
				var subsurfaceBounces = input.subsurfaceBounces;
				var hasScattered = false;
				var isFinished = false;
				var isTerminated = false;

				for ( var i = 0u; i < stepsPerPass; i ++ ) {

					// only trace up to the sampled scatter event
					let channelPdf = ${yo}( input.throughputColor * weight, medium.albedo );
					let scatterDist = ${vo}( medium, channelPdf, ${Ae}( ${ao} ) );
					ray.maxDist = scatterDist;

					var hitResult: ${t};
					let didHit = ${r}( ray, &hitResult );
					let surfaceDist = select( ${yt}, hitResult.dist, didHit );

					let scattered = scatterDist < surfaceDist;
					let segmentDist = select( surfaceDist, scatterDist, scattered );
					let transmittance = exp( - medium.extinction * segmentDist );
					let distancePdf = dot( channelPdf, ${bo}( medium, segmentDist, scattered ) );
					if ( distancePdf <= 0.0 ) {

						isTerminated = true;
						break;

					}

					if ( ! scattered ) {

						// reaching the surface, weighted by the chance of not scattering before it
						weight *= transmittance / distancePdf;

						// The hit fills the ray results from the back, by the walk's medium queue position, while the
						// traced rays fill them from the front. A path slot walking a medium queued no ray this round,
						// so the two ranges never exceed the slot count or overlap
						let resultIndex = rayCount - 1u - globalId.x;
						rayIntersectionsStorage[ resultIndex ].barycoord = hitResult.barycoord;
						// a walk that leaves without hitting anything is a miss, as in the trace kernel
						rayIntersectionsStorage[ resultIndex ].objectIndex = select( - 1, i32( hitResult.objectIndex ), didHit );
						rayIntersectionsStorage[ resultIndex ].position = ray.origin + ray.direction * hitResult.dist;
						rayIntersectionsStorage[ resultIndex ].dist = hitResult.dist;
						rayIntersectionsStorage[ resultIndex ].normal = hitResult.normal.xyz;
						rayIntersectionsStorage[ resultIndex ].side = hitResult.side;
						rayIntersectionsStorage[ resultIndex ].indices = hitResult.indices.xyz;
						rayDataStorage[ index ].rayIntersectionIndex = i32( resultIndex );

						isFinished = true;
						break;

					}

					weight *= medium.albedo * medium.extinction * transmittance / distancePdf;
					ray.origin += ray.direction * scatterDist;
					ray.direction = ${uo}( ray.direction, medium.anisotropy, ${Ae}( ${oo} ) );
					hasScattered = true;

					// capped separately from bounces, and ends once the throughput is negligible
					subsurfaceBounces ++;
					let throughput = input.throughputColor * weight / input.scatterPdf;
					if ( subsurfaceBounces >= maxSubsurfaceBounces || max( max( throughput.r, throughput.g ), throughput.b ) < ${mo} ) {

						isTerminated = true;
						break;

					}

					${ni}();

				}

				// a zeroed pdf terminates the path in LogicKernel
				rayDataStorage[ index ].scatterColor = weight;
				rayDataStorage[ index ].scatterPdf = select( input.scatterPdf, 0.0, isTerminated );
				rayDataStorage[ index ].origin = ray.origin;
				rayDataStorage[ index ].direction = ray.direction;
				rayDataStorage[ index ].subsurfaceBounces = subsurfaceBounces;
				rayDataStorage[ index ].walkPending = select( 1u, 0u, isFinished || isTerminated );
				if ( hasScattered ) {

					rayDataStorage[ index ].mediumScattered = 1u;
					rayDataStorage[ index ].isFullyTransmissive = 0u;

				}

			}
		`;super(i(e)),this.defineUniformAccessors(e)}}class Nd extends te{constructor(){const e={rayCount:B(0,"uint"),rayDataStorage:E(new N(1,1),ze).toReadOnly(),mediumQueue:E(new N(1,1),"uint").toAtomic(),globalId:ae},t=I`

			fn compute( rayCount: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let mediumQueue = &${e.mediumQueue};

				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				if ( rayDataStorage[ index ].walkPending != 0u && rayDataStorage[ index ].objectIndex >= 0 ) {

					let queueIndex = atomicAdd( &mediumQueue[ ${Ks}u ], 1u );
					atomicStore( &mediumQueue[ ${hi}u + queueIndex ], index );

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}class Ji extends te{constructor(e=Vt,t=64){const r={queueCounters:E(new N(1,1),"uint").toAtomic(),outputDispatch:E(new _a(3,1),"u32").setName("outputDispatch")},i=I`
			fn compute() -> void {

				let queueCounters = &${r.queueCounters};
				let outputDispatch = &${r.outputDispatch};

				let queueLength = atomicLoad( &queueCounters[ ${e}u ] );
				outputDispatch[ 0 ] = ( queueLength + ${t-1}u ) / ${t}u;
				outputDispatch[ 1 ] = 1u;
				outputDispatch[ 2 ] = 1u;

			}
		`;super(i(r)),this.defineUniformAccessors(r)}}class Ld extends te{constructor(){const e={rayDataStorage:E(new N(1,1),ze),pixelQueue:E(new N(1,1),"uint").toAtomic(),start:B(0,"uint"),end:B(0,"uint"),addingSlots:B(0,"uint"),globalId:ae},t=I`
			fn compute( start: u32, end: u32, addingSlots: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				let index = start + globalId.x;
				if ( index >= end ) {

					return;

				}

				if ( addingSlots == 0u ) {

					// slots being removed hand their pixel back before the pool is discarded
					let queueIndex = atomicAdd( &pixelQueue[ ${pi}u ], 1u );
					atomicStore( &pixelQueue[ ${br}u + queueIndex ], rayDataStorage[ index ].pixelIndex );

				} else {

					// the pool never exceeds the pixel count, so the queue holds enough for every new slot
					let previousCount = atomicSub( &pixelQueue[ ${pi}u ], 1u );
					rayDataStorage[ index ].pixelIndex = atomicLoad( &pixelQueue[ ${br}u + previousCount - 1u ] );
					rayDataStorage[ index ].resultColor = vec4f( 0.0 );
					rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
					rayDataStorage[ index ].objectIndex = - 1;
					rayDataStorage[ index ].alphaDepth = 0u;
					rayDataStorage[ index ].rayIntersectionIndex = - 1;
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}class zd extends te{constructor(e={}){const{type:t="u32"}=e,r={globalId:ae,outputTarget:E(new _a(1,1),t)},i=I`
			fn compute( globalId: vec3u ) -> void {

				${r.outputTarget}[ globalId.x ] = 0;

			}
		`;super(i(r)),this.defineUniformAccessors({target:r.outputTarget})}}class Ed extends te{constructor(e){const t={source:E(new N(1,1),e).toReadOnly(),target:E(new N(1,1),e),count:B(0,"uint"),globalId:ae},r=I`
			fn compute( count: u32, globalId: vec3u ) -> void {

				let index = globalId.x;
				if ( index >= count ) {

					return;

				}

				${t.target}[ index ] = ${t.source}[ index ];

			}
		`;super(r(t)),this.defineUniformAccessors(t)}}const kd=0,Hd=1,Ud=2,Vd=3,Od=4,ra=5,Wd=4294967296,Ho=new O({minSamples:{type:"uint",atomic:!0},maxSamples:{type:"uint",atomic:!0},totalLo:{type:"uint",atomic:!0},totalHi:{type:"uint",atomic:!0},pixelCount:{type:"uint",atomic:!0}},"SampleCounters");class qd extends te{constructor(){const e={counters:E(new N(1,1),Ho)},t=I`
			fn compute() -> void {

				atomicStore( &${e.counters}[ 0 ].minSamples, 0xFFFFFFFFu );
				atomicStore( &${e.counters}[ 0 ].maxSamples, 0u );
				atomicStore( &${e.counters}[ 0 ].totalLo, 0u );
				atomicStore( &${e.counters}[ 0 ].totalHi, 0u );
				atomicStore( &${e.counters}[ 0 ].pixelCount, 0u );

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}class Qd extends te{constructor(){const e={globalId:ae,counters:E(new N(1,1),Ho),sampleCountTarget:de(new qe(1,1)).toReadOnly()},t=I`
			fn compute( globalId: vec3u ) -> void {

				let targetDimensions = textureDimensions( ${e.sampleCountTarget} );
				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				// pixels without a camera ray aren't part of the image, so skip rather than count zero
				let combinedField = textureLoad( ${e.sampleCountTarget}, globalId.xy ).r;
				if ( ( combinedField & ${Qs}u ) == 0u ) {

					return;

				}

				let samples = combinedField & ${vr}u;

				atomicMin( &${e.counters}[ 0 ].minSamples, samples );
				atomicMax( &${e.counters}[ 0 ].maxSamples, samples );
				atomicAdd( &${e.counters}[ 0 ].pixelCount, 1u );

				// the sum overflowed if it came out smaller than the value already there, so carry
				// the wrap into "totalHi"
				let previousTotal = atomicAdd( &${e.counters}[ 0 ].totalLo, samples );
				if ( previousTotal + samples < previousTotal ) {

					atomicAdd( &${e.counters}[ 0 ].totalHi, 1u );

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}const jd=134217728,ia=Math.floor(jd/(ze.getLength()*4)),Gd=5;class sa extends zo{constructor(e){super(e),this.seed=0,this.mediumStepsPerPass=16,this.envInfo=new Ao,this.backgroundInfo=new Fo,this.lightsInfo=new Lo,this.rayCount=0,this.rayDataStorage=null,this.rayQueue=null,this.shadowRayQueue=null,this.queueCounters=new N(new Uint32Array(Zi),1),this.queueCounters.name="Queue Counters",this.rayIntersectionsStorage=null,this.shadowRayIntersectionsStorage=null,this.mediumQueue=null,this.pixelQueue=null,this.sampleCountersStorage=new N(new Uint32Array(ra),ra),this.sampleCountersStorage.name="Sample Counters",this._samplesPromise=null,this.populatePixelIndicesKernel=new $d().setWorkgroupSize(8,8,1),this.logicKernel=new Md().setWorkgroupSize(64,1,1),this.materialKernel=new Pd().setWorkgroupSize(64,1,1),this.traceRayKernel=new Bd().setWorkgroupSize(64,1,1),this.traceShadowRayKernel=new Ad().setWorkgroupSize(64,1,1),this.mediumKernel=new Fd().setWorkgroupSize(64,1,1),this.queueMediumWalksKernel=new Nd().setWorkgroupSize(64,1,1),this.rayDispatchConverter=new Ji(Vt).setWorkgroupSize(1,1,1),this.shadowDispatchConverter=new Ji(Gs).setWorkgroupSize(1,1,1),this.mediumDispatchConverter=new Ji(Ks).setWorkgroupSize(1,1,1),this.primeSampleCountersKernel=new qd().setWorkgroupSize(1,1,1),this.tallySampleCountsKernel=new Qd().setWorkgroupSize(8,8,1),this.resetSlotsKernel=new Ld().setWorkgroupSize(64,1,1),this.copyRayDataKernel=new Ed(ze).setWorkgroupSize(64,1,1),this.logicKernel.envInfo=this.envInfo,this.logicKernel.backgroundInfo=this.backgroundInfo,this.logicKernel.lightsInfo=this.lightsInfo,this.zeroDispatchKernel=new zd().setWorkgroupSize(1,1,1)}resetSeed(){this.seed=0}reset(){super.reset(),this._samplesPromise=null}setBVHData(e){this.materialKernel.context.bvhData=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.context.bvhData=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.context.bvhData=e,this.traceShadowRayKernel.needsUpdate=!0,this.mediumKernel.context.bvhData=e,this.mediumKernel.needsUpdate=!0,this.reset()}rebuild(){super.rebuild(),this.materialKernel.needsUpdate=!0,this.reset()}setRandom(e){this.logicKernel.context.random=e,this.logicKernel.needsUpdate=!0,this.materialKernel.context.random=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.context.random=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.context.random=e,this.traceShadowRayKernel.needsUpdate=!0,this.mediumKernel.context.random=e,this.mediumKernel.needsUpdate=!0,this.reset()}setMaterial(e){this.materialKernel.material=e.getData(),this.materialKernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.materialKernel.filterGlossy=e===0?So:1/e,this.reset()}setClamping(e,t){this.logicKernel.clampDirect=e,this.logicKernel.clampIndirect=t,this.reset()}setTransmissiveBackground(e){this.logicKernel.transmissiveBackground=e,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setEnvironmentParams(e,t){const{envInfo:r}=this,i=new W().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(i),r.intensityNode.value=e}setMultipleImportanceSampling(e){this.logicKernel.misEnabled=e?1:0,this.reset()}setBackground(e){const{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){const{backgroundInfo:i}=this,n=new W().makeRotationFromEuler(t).invert();i.rotationNode.value.copy(n),i.intensity=e,i.blur=r}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.queueCounters.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.mediumQueue?.dispose(),this.sampleCountersStorage.dispose(),this.pixelQueue?.dispose(),this.rayDispatchConverter.outputDispatch.dispose(),this.shadowDispatchConverter.outputDispatch.dispose(),this.mediumDispatchConverter.outputDispatch.dispose(),this.populatePixelIndicesKernel.dispose(),this.logicKernel.dispose(),this.materialKernel.dispose(),this.traceRayKernel.dispose(),this.traceShadowRayKernel.dispose(),this.mediumKernel.dispose(),this.queueMediumWalksKernel.dispose(),this.rayDispatchConverter.dispose(),this.shadowDispatchConverter.dispose(),this.mediumDispatchConverter.dispose(),this.primeSampleCountersKernel.dispose(),this.tallySampleCountsKernel.dispose(),this.resetSlotsKernel.dispose(),this.copyRayDataKernel.dispose(),this.zeroDispatchKernel.dispose()}_updatePixelQueue(e,t){const r=br+Math.max(e*t,1);(!this.pixelQueue||this.pixelQueue.array.length<r)&&(this.pixelQueue?.dispose(),this.pixelQueue=new N(new Float32Array(r),r),this.pixelQueue.name="Pixel Queue",this.materialKernel.pixelQueue=this.pixelQueue,this.populatePixelIndicesKernel.pixelQueue=this.pixelQueue,this.resetSlotsKernel.pixelQueue=this.pixelQueue)}_resizePool(e,t){const{resetSlotsKernel:r,copyRayDataKernel:i}=this,n=this.rayCount,s=Math.min(n,t),o=Math.min(e,t);r.pixelQueue=this.pixelQueue,o<s&&(r.rayDataStorage=this.rayDataStorage,r.start=o,r.end=s,r.addingSlots=!1,this.dispatch(r,r.getDispatchSize(s-o,1,1)));const l=new N(e,ze.getLength());l.name="Ray Data";const d=new N(e,jt.getLength());d.name="Ray Queue";const c=new N(e,jt.getLength());c.name="Shadow Ray Queue";const u=new N(e,$i.getLength());u.name="Ray Intersections";const f=new N(e,js.getLength());f.name="Shadow Ray Intersections";const p=hi+e,h=new N(new Uint32Array(p),p);h.name="Medium Queue";const y=Math.min(e,n);y>0&&(i.source=this.rayDataStorage,i.target=l,i.count=y,this.dispatch(i,i.getDispatchSize(y,1,1))),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.mediumQueue?.dispose(),this.rayDataStorage=l,this.rayQueue=d,this.shadowRayQueue=c,this.rayIntersectionsStorage=u,this.shadowRayIntersectionsStorage=f,this.mediumQueue=h,this.rayCount=e,o>s&&(r.rayDataStorage=l,r.start=s,r.end=o,r.addingSlots=!0,this.dispatch(r,r.getDispatchSize(o-s,1,1)))}_getRequestedSlotCount(){return Math.min(ia,Math.max(1,Math.floor(this.frameBudget)))}_getPreviewIterations(){return Math.max(1,Math.min(this.maxBounces,Gd))}getPreviewPixelBudget(){return Math.min(this.frameBudget/this._getPreviewIterations(),ia)}_applyBudget(e){const t=this._getRequestedSlotCount();t!==this.rayCount&&this._resizePool(t,e)}*createRenderTask(){const{renderer:e,maxTransparentBounces:t,logicKernel:r,materialKernel:i,traceRayKernel:n,traceShadowRayKernel:s,mediumKernel:o,queueMediumWalksKernel:l,rayDispatchConverter:d,shadowDispatchConverter:c,mediumDispatchConverter:u,zeroDispatchKernel:f,populatePixelIndicesKernel:p}=this,h=new G;this.getSize(h),this._updatePixelQueue(h.x,h.y);const y=h.x*h.y;for(this._applyBudget(y),yield*this.compileKernels([r,i,n,s,o,l,d,c,u,f,p]),f.target=this.queueCounters,this.dispatch(f,[Zi]),p.rayDataStorage=this.rayDataStorage,p.pixelQueue=this.pixelQueue,p.frameBudget=Math.min(this.rayCount,y),p.targetDimensions.copy(h),this.dispatch(p,p.getDispatchSize(h.x,h.y,1)),this.seed++;;){const x=Math.min(this._getRequestedSlotCount(),y),b=this.lowResMode?this._getPreviewIterations():1,m=Math.max(b,Math.round(this.frameBudget/x));for(let v=0;v<m;v++){e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],r.prevOutputTarget=this.prevOutputTarget,r.outputTarget=this.outputTarget,r.sampleCountTarget=this.sampleCountTarget,r.auxTarget=this.auxTarget??this._auxPlaceholder,r.accumulateAux=this.auxTarget?1:0,r.rayDataStorage=this.rayDataStorage,r.rayIntersectionsStorage=this.rayIntersectionsStorage,r.shadowRayIntersectionsStorage=this.shadowRayIntersectionsStorage,r.maxBounces=this.maxBounces,r.rayCount=Math.min(this.rayCount,y),this.dispatch(r,r.getDispatchSize(r.rayCount,1,1)),this._applyBudget(y);const{rayDataStorage:g,rayQueue:w,shadowRayQueue:R,queueCounters:S,rayIntersectionsStorage:C,shadowRayIntersectionsStorage:D,mediumQueue:T}=this,$=Math.min(this.rayCount,y);f.target=S,this.dispatch(f,[Zi]),f.target=T,this.dispatch(f,[hi]),i.rayDataStorage=g,i.rayQueue=w,i.shadowRayQueue=R,i.queueCounters=S,i.pixelQueue=this.pixelQueue,i.sampleCountTarget=this.sampleCountTarget,i.seed=this.seed,i.maxSamples=this.maxSamples,i.rayCount=$,i.maxTransparentBounces=t,i.maxBounces=this.maxBounces,i.targetDimensions.copy(h),this.dispatch(i,i.getDispatchSize($,1,1)),d.queueCounters=S,this.dispatch(d,[1,1,1]),n.rayQueue=w,n.queueCounters=S,n.rayIntersectionsStorage=C,this.dispatch(n,d.outputDispatch),c.queueCounters=S,this.dispatch(c,[1,1,1]),s.shadowRayQueue=R,s.queueCounters=S,s.shadowRayIntersectionsStorage=D,this.dispatch(s,c.outputDispatch),l.rayDataStorage=g,l.mediumQueue=T,l.rayCount=$,this.dispatch(l,l.getDispatchSize($,1,1)),u.queueCounters=T,this.dispatch(u,[1,1,1]),o.rayDataStorage=g,o.mediumQueue=T,o.rayIntersectionsStorage=C,o.rayCount=$,o.maxSubsurfaceBounces=this.maxSubsurfaceBounces,o.stepsPerPass=this.mediumStepsPerPass,this.dispatch(o,u.outputDispatch)}yield}}getSampleCountsAsync(){if(this._samplesPromise===null){const e=this._measureSampleCounts().finally(()=>{this._samplesPromise===e&&(this._samplesPromise=null)});this._samplesPromise=e}return this._samplesPromise}async _measureSampleCounts(){const{renderer:e,sampleCountTarget:t,sampleCountersStorage:r,primeSampleCountersKernel:i,tallySampleCountsKernel:n}=this;if(!e.initialized||this.lowResMode)return{min:0,max:0,avg:0};i.counters=r,e.compute(i.kernel,[1,1,1]),n.counters=r,n.sampleCountTarget=t,e.compute(n.kernel,n.getDispatchSize(t.width,t.height));const s=await e.getArrayBufferAsync(r),o=new Uint32Array(s),l=o[Od];if(l===0)return{min:0,max:0,avg:0};const d=o[Vd]*Wd+o[Ud];return{min:o[kd],max:o[Hd],avg:d/l}}}const Kd=`

	// TODO: possibly this should be renamed something related to material or path tracing logic

	#ifndef RAY_OFFSET
	#define RAY_OFFSET 1e-4
	#endif

	// adjust the hit point by the surface normal by a factor of some offset and the
	// maximum component-wise value of the current point to accommodate floating point
	// error as values increase.
	vec3 stepRayOrigin( vec3 rayOrigin, vec3 rayDirection, vec3 offset, float dist ) {

		vec3 point = rayOrigin + rayDirection * dist;
		vec3 absPoint = abs( point );
		float maxPoint = max( absPoint.x, max( absPoint.y, absPoint.z ) );
		return point + offset * ( maxPoint + 1.0 ) * RAY_OFFSET;

	}

	// https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md#attenuation
	vec3 transmissionAttenuation( float dist, vec3 attColor, float attDist ) {

		vec3 ot = - log( attColor ) / attDist;
		return exp( - ot * dist );

	}

	vec3 getHalfVector( vec3 wi, vec3 wo, float eta ) {

		// get the half vector - assuming if the light incident vector is on the other side
		// of the that it's transmissive.
		vec3 h;
		if ( wi.z > 0.0 ) {

			h = normalize( wi + wo );

		} else {

			// Scale by the ior ratio to retrieve the appropriate half vector
			// From Section 2.2 on computing the transmission half vector:
			// https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf
			h = normalize( wi + wo * eta );

		}

		h *= sign( h.z );
		return h;

	}

	vec3 getHalfVector( vec3 a, vec3 b ) {

		return normalize( a + b );

	}

	// The discrepancy between interpolated surface normal and geometry normal can cause issues when a ray
	// is cast that is on the top side of the geometry normal plane but below the surface normal plane. If
	// we find a ray like that we ignore it to avoid artifacts.
	// This function returns if the direction is on the same side of both planes.
	bool isDirectionValid( vec3 direction, vec3 surfaceNormal, vec3 geometryNormal ) {

		bool aboveSurfaceNormal = dot( direction, surfaceNormal ) > 0.0;
		bool aboveGeometryNormal = dot( direction, geometryNormal ) > 0.0;
		return aboveSurfaceNormal == aboveGeometryNormal;

	}

	// ray sampling x and z are swapped to align with expected background view
	vec2 equirectDirectionToUv( vec3 direction ) {

		// from Spherical.setFromCartesianCoords
		vec2 uv = vec2( atan( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

	vec3 equirectUvToDirection( vec2 uv ) {

		// undo above adjustments
		uv.x -= 0.5;
		uv.y = 1.0 - uv.y;

		// from Vector3.setFromSphericalCoords
		float theta = uv.x * 2.0 * PI;
		float phi = uv.y * PI;

		float sinPhi = sin( phi );

		return vec3( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

	}

	// power heuristic for multiple importance sampling
	float misHeuristic( float a, float b ) {

		float aa = a * a;
		float bb = b * b;
		return aa / ( aa + bb );

	}

	// tentFilter from Peter Shirley's 'Realistic Ray Tracing (2nd Edition)' book, pg. 60
	// erichlof/THREE.js-PathTracing-Renderer/
	float tentFilter( float x ) {

		return x < 0.5 ? sqrt( 2.0 * x ) - 1.0 : 1.0 - sqrt( 2.0 - ( 2.0 * x ) );

	}
`;class Xd extends ll{constructor(){super({uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:`
				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`
				#define ENVMAP_TYPE_CUBE_UV

				uniform samplerCube envMap;
				uniform float flipEnvMap;
				varying vec2 vUv;

				#include <common>
				#include <cube_uv_reflection_fragment>

				${Kd}

				void main() {

					vec3 rayDirection = equirectUvToDirection( vUv );
					rayDirection.x *= flipEnvMap;
					gl_FragColor = textureCube( envMap, rayDirection );

				}`}),this.depthWrite=!1,this.depthTest=!1}}class Yd{constructor(e){this._renderer=e,this._quad=new kt(new Xd)}generate(e,t=null,r=null){if(!e.isCubeTexture)throw new Error("CubeToEquirectMaterial: Source can only be cube textures.");const i=e.images[0],n=this._renderer,s=this._quad;t===null&&(t=4*i.height),r===null&&(r=2*i.height);const o=new al(t,r,{type:bt,colorSpace:i.colorSpace}),l=i.height,d=Math.log2(l)-2,c=1/l,u=1/(3*Math.max(Math.pow(2,d),112));s.material.defines.CUBEUV_MAX_MIP=`${d}.0`,s.material.defines.CUBEUV_TEXEL_WIDTH=u,s.material.defines.CUBEUV_TEXEL_HEIGHT=c,s.material.uniforms.envMap.value=e,s.material.uniforms.flipEnvMap.value=e.isRenderTargetTexture?1:-1,s.material.needsUpdate=!0;const f=n.getRenderTarget(),p=n.autoClear;n.autoClear=!0,n.setRenderTarget(o),s.render(n),n.setRenderTarget(f),n.autoClear=p;const h=new Uint16Array(t*r*4),y=new Float32Array(t*r*4);n.readRenderTargetPixels(o,0,0,t,r,y),o.dispose();for(let b=0,m=y.length;b<m;b++)h[b]=Be.toHalfFloat(y[b]);const x=new ge(h,t,r,Ce,fe);return x.minFilter=ol,x.magFilter=se,x.wrapS=tt,x.wrapT=tt,x.mapping=Ra,x.needsUpdate=!0,x}dispose(){this._quad.dispose()}}function Zd(a,e){return a.uuid<e.uuid?1:a.uuid>e.uuid?-1:0}function Jd(a){return`${a.source.uuid}:${a.colorSpace}`}function ef(a){const e=[];return a.traverseVisible(t=>{(t.isRectAreaLight||t.isSpotLight||t.isPointLight||t.isDirectionalLight||t.isSunLight)&&e.push(t)}),e.sort(Zd)}const nr=new pt,Zr=new O({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",materialIndex:"uint",visibleToShadowRays:"uint",_alignment0:"uint",color:"vec4f"},"TransformStruct"),Jr=new O({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float",skippedOcclusion:"float",occlusion:"float"},"PathTracerIntersectionResult");class tf extends qc{constructor(e,t={}){super(e,{attributes:{position:"vec4f",normal:"vec4f",tangent:"vec4f",color:"vec4f",uv:"vec4f"},...t}),this.structs.transform=Zr,this.structs.material=qa,this.storage.materials=null,this.materialsMap=new Map,this.materials=[],this.bvhMap=new Map,this.textureAtlas=new No}updateUvAttributesFromScene(){const{attributes:e}=this,t=new Set(["color"]);for(let r=0;r<8;r++){const i=r===0?"uv":"uv"+r;delete e[i],t.add(i)}this.getRootObject().traverse(r=>{if(r.geometry)for(const i in r.geometry.attributes)t.has(i)&&(e[i]="vec4f")})}updateUvSampleFunction(){const{structs:e,fns:t}=this,r=[];let i=null;e.attributes.membersLayout.forEach(({name:n})=>{if(/^uv/.test(n)){const s=n==="uv"?0:Number(n.replace(/^uv/,""));r.push(`
					case ${s}u: {

						return vertexData.${n}.xy;

					}
				`),i===null&&(i=`vertexData.${n}.xy`)}}),t.getUvFromChannel=I`
			fn getUvFromChannel( vertexData: ${e.attributes}, packed: i32 ) -> vec2f {

				// the uv channel is packed into bits 23-25 of the "*Map" descriptor
				let channel = u32( ( packed >> 23 ) & 0x7 );
				switch ( channel ) {

					${r.join(`
`)}
					default: {

						return ${i??"vec2f( 0.0 )"};

					}

				}

			}
		`}updateColorSampleFn(){const{structs:e,fns:t}=this;!!e.attributes.membersLayout.find(({name:i})=>i==="color")?t.getColor=I`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vertexData.color;

				}
			`:t.getColor=I`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vec4f( 1.0 );

				}
			`}useTransparencyRaycastFn(){const{textureAtlas:e,storage:t,fns:r}=this,i=e.texture,n=li(e.textureInfo,"uvec4").setName("bvh_textureInfo"),s=co(n,Re(i));r.getSurfaceRecord=Bu(s,r.getUvFromChannel,r.getColor);const o=vt().toVar("bvh_materialIndex"),l=Le(1).toVar("bvh_rayScalar"),d=Le(1).toVar("bvh_baseOpacity"),c=Ys(!1).toVar("bvh_isShadowRay"),u=Ys(!1).toVar("bvh_skipShadowObject"),f={shapeStruct:k,resultStruct:Jr,boundsOrderFn:I`
				fn getBoundsOrder( ray: ${k}, splitAxis: u32, node: ${wt} ) -> bool {

					return ray.direction[ splitAxis ] >= 0.0;

				}
			`,intersectsBoundsFn:I`
				fn rayIntersectsBounds( ray: ${k}, bounds: ${je}, result: ptr<function, ${Jr}> ) -> u32 {

					// early-out if our object is completely transparent, or a shadow ray is already occluded
					if ( ${d} == 0.0 || ( ${c} && result.didHit ) ) {

						return 0u;

					}

					let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
					let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

					let invDir = 1.0 / ray.direction;
					let tMinPlane = ( boundsMin - ray.origin ) * invDir;
					let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

					let tMinHit = min( tMinPlane, tMaxPlane );
					let tMaxHit = max( tMinPlane, tMaxPlane );

					let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
					let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

					let dist = max( t0, 0.0 );
					if ( t1 < dist ) {

						return 0u;

					} else if ( ray.maxDist > 0.0 && dist * ${l} >= ray.maxDist ) {

						return 0u;

					} else if ( result.didHit && dist * ${l} >= result.dist ) {

						return 0u;

					} else {

						return 1u;

					}

				}

			`,intersectRangeFn:I`
				fn intersectRange( ray: ${k}, offset: u32, count: u32, result: ptr<function, ${Jr}> ) -> bool {

					var didHit = false;
					for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

						let i0 = ${t.index}[ ti * 3u ];
						let i1 = ${t.index}[ ti * 3u + 1u ];
						let i2 = ${t.index}[ ti * 3u + 2u ];

						let a = ${t.attributes}[ i0 ].position.xyz;
						let b = ${t.attributes}[ i1 ].position.xyz;
						let c = ${t.attributes}[ i2 ].position.xyz;

						var triResult = ${Ps}( ray, a, b, c, 0.0 );
						triResult.dist *= ${l};
						if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist < ray.maxDist ) && ( ! result.didHit || triResult.dist < result.dist ) ) {

							let material = ${t.materials}[ ${o} ];

							// TODO: if material is a transmissive volume we may need to assume double-sidedness
							// shadow rays hit both sides
							if ( ! ${c} && material.side != 0 && triResult.side != material.side ) {

								continue;

							}

							var opacity = ${d};
							if ( material.transparent != 0 || material.alphaTest > 0.0 ) {

								// add support for vertex color opacity
								if ( material.vertexColors == 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getColor}( ${t.attributes}[ i0 ] );
									let b = ${r.getColor}( ${t.attributes}[ i1 ] );
									let c = ${r.getColor}( ${t.attributes}[ i2 ] );
									let col = barycoord.x * a + barycoord.y * b + barycoord.z * c;

									opacity *= col.a;

								}

								// account for alpha component of albedo map
								if ( material.map != - 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getUvFromChannel}( ${t.attributes}[ i0 ], material.map );
									let b = ${r.getUvFromChannel}( ${t.attributes}[ i1 ], material.map );
									let c = ${r.getUvFromChannel}( ${t.attributes}[ i2 ], material.map );
									let uv = barycoord.x * a + barycoord.y * b + barycoord.z * c;
									let uvPrime = material.mapTransform * vec3f( uv, 1 );

									opacity *= ${s}( uvPrime.xy, material.map, 0 ).a;

								}

								// account for green component of alpha map
								if ( material.alphaMap != - 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getUvFromChannel}( ${t.attributes}[ i0 ], material.alphaMap );
									let b = ${r.getUvFromChannel}( ${t.attributes}[ i1 ], material.alphaMap );
									let c = ${r.getUvFromChannel}( ${t.attributes}[ i2 ], material.alphaMap );
									let uv = barycoord.x * a + barycoord.y * b + barycoord.z * c;
									let uvPrime = material.alphaMapTransform * vec3f( uv, 1 );

									opacity *= ${s}( uvPrime.xy, material.alphaMap, 0 ).g;

								}

								// Opacity is resolved at surface processing but skip full transparent hits here.
								if ( material.transparent != 0 && opacity <= 0.0 ) {

									continue;

								}

								if ( opacity < material.alphaTest ) {

									continue;

								}

							}

							// shadow rays skip the objects not visible to them. Record the share of bsdf rays this face
							// would stop: all of them if it's opaque, its opacity if it's partially transparent
							if ( ${u} ) {

								if ( material.side == 0 || triResult.side == material.side ) {

									result.skippedOcclusion += ( 1.0 - result.skippedOcclusion ) * select( 1.0, opacity, material.transparent != 0 );

								}

								continue;

							}

							// shadow rays pass partially transparent surfaces, each blocking its opacity's share of the
							// light still getting through, just as bsdf rays pass them by chance
							if ( ${c} && material.transparent != 0 && opacity < 1.0 ) {

								result.occlusion += ( 1.0 - result.occlusion ) * opacity;
								continue;

							}

							result.didHit = true;
							result.dist = triResult.dist;
							result.normal = triResult.normal;
							result.side = triResult.side;
							result.barycoord = triResult.barycoord;
							result.indices = vec4u( i0, i1, i2, ti );

							didHit = true;

						}

					}

					return didHit;

				}
			`,transformShapeFn:I`
				fn transformRay( ray: ptr<function, ${k}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
					ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

					let len = length( ray.direction );
					ray.direction /= len;
					${l} = 1.0 / len;

					let object = ${t.transforms}[ objectIndex ];
					${o} = object.materialIndex;

					let material = ${t.materials}[ object.materialIndex ];
					if ( material.transparent == 1 ) {

						${d} = material.opacity * object.color.a;

					} else {

						${d} = 1.0;

					}

					${u} = ${c} && object.visibleToShadowRays == 0u;

				}
			`,transformResultFn:I`
				fn transformResult( hit: ptr<function, ${Jr}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
					hit.objectIndex = objectIndex;

				}
			`,resetShapeFn:I`
				fn resetRayScalar( objectIndex: u32 ) -> void {

					${l} = 1.0;
					${d} = 1.0;

				}
			`};r.raycastFirstHit=this.getShapecastFn({...f,name:"raycastFirstHit",prefixFn:I`
				fn initFirstHitCull() -> void {

					${c} = false;

				}
			`}),r.raycastShadow=this.getShapecastFn({...f,name:"raycastShadow",prefixFn:I`
				fn initShadowCull() -> void {

					${c} = true;

				}
			`})}update(){const{structs:e}=this,t=new N(new Uint8Array,e.material.getLength());this.storage.materials=E(t,e.material).toReadOnly().setName("bvh_materials"),this.updateUvAttributesFromScene(),this.updateMaterialsMap(),super.update(),this.updateUvSampleFunction(),this.updateColorSampleFn(),this.updateMaterials(),this.bvhMap.clear(),this.useTransparencyRaycastFn()}updateMaterialsMap(){const{materials:e,materialsMap:t}=this;t.clear(),e.length=0,this.getRootObject().traverse(i=>{i.material&&(Array.isArray(i.material)?i.material.forEach(n=>n&&r(n)):r(i.material))}),e.sort((i,n)=>i.uuid<n.uuid?1:-1).forEach((i,n)=>{t.set(i,n)});function r(i){t.has(i)||(e.push(i),t.set(i,-1))}}updateMaterials(){this.updateMaterialsMap();const{materials:e,storage:t,structs:r,bvh:i}=this,{materialData:n,textures:s}=this.writeMaterialsBuffer(e),o=t.materials.proxyNode,l=t.transforms.proxyNode,d=n.length/r.material.getLength();o.value.count<d&&(o.value.dispose(),o.value=new N(n,r.material.getLength())),o.value.array.set(n),o.value.needsUpdate=!0,this._getTransformMap(i).forEach(c=>{this.writeMaterialData(c,c.slot,l.value.array.buffer)}),l.value.needsUpdate=!0,this.textures=s}writeMaterialsBuffer(e){function t(f){switch(f){case tt:return 0;case oi:return 1;case ul:return 2;default:return 0}}function r(f,p){if(p in f&&f[p]){const h=f[p],y=Jd(h);o.has(y)||(o.set(y,o.size),l.push(h));const x=o.get(y),b=h.channel&7,m=t(h.wrapS),v=t(h.wrapT);return(h.magFilter===xr?1:0)<<30|v<<28|m<<26|b<<23|x&8388607}else return-1}function i(f,p,h){return p in f?f[p]:h}function n(f,p,h,y){const x=f[p]&&f[p].isTexture?f[p]:null;if(x){x.matrixAutoUpdate&&x.updateMatrix();const b=x.matrix.elements;for(let m=0;m<3;m++)h[y+4*m+0]=b[3*m+0],h[y+4*m+1]=b[3*m+1],h[y+4*m+2]=b[3*m+2],h[y+4*m+3]=0}return 12}let s=0;const o=new Map,l=[],d=Math.max(e.length,2),c=new Float32Array(d*this.structs.material.getLength()),u=new Int32Array(c.buffer);for(let f=0,p=e.length;f<p;f++){const h=e[f];c[s++]=h.color.r,c[s++]=h.color.g,c[s++]=h.color.b,u[s++]=r(h,"map"),c[s++]=i(h,"metalness",0),u[s++]=r(h,"metalnessMap"),c[s++]=i(h,"roughness",0),u[s++]=r(h,"roughnessMap"),c[s++]=i(h,"ior",1.5),c[s++]=i(h,"transmission",0),u[s++]=r(h,"transmissionMap"),c[s++]=i(h,"emissiveIntensity",0),"emissive"in h?(c[s++]=h.emissive.r,c[s++]=h.emissive.g,c[s++]=h.emissive.b):(c[s++]=0,c[s++]=0,c[s++]=0),u[s++]=r(h,"emissiveMap"),u[s++]=r(h,"normalMap"),s++,"normalScale"in h?(c[s++]=h.normalScale.x,c[s++]=h.normalScale.y):(c[s++]=1,c[s++]=1),c[s++]=i(h,"clearcoat",0),u[s++]=r(h,"clearcoatMap"),u[s++]=r(h,"clearcoatNormalMap"),s++,"clearcoatNormalScale"in h?(c[s++]=h.clearcoatNormalScale.x,c[s++]=h.clearcoatNormalScale.y):(c[s++]=1,c[s++]=1),c[s++]=i(h,"clearcoatRoughness",0),u[s++]=r(h,"clearcoatRoughnessMap"),u[s++]=r(h,"iridescenceMap"),u[s++]=r(h,"iridescenceThicknessMap"),c[s++]=i(h,"iridescence",0),c[s++]=i(h,"iridescenceIOR",1.3),c[s++]=i(h,"iridescenceThicknessMinimum",100),c[s++]=i(h,"iridescenceThicknessMaximum",400),c[s++]=i(h,"diffuseRoughness",0),c[s++]=i(h,"dispersion",0),"specularColor"in h?(c[s++]=h.specularColor.r,c[s++]=h.specularColor.g,c[s++]=h.specularColor.b):(c[s++]=1,c[s++]=1,c[s++]=1),u[s++]=r(h,"specularColorMap"),c[s++]=i(h,"specularIntensity",1),u[s++]=r(h,"specularIntensityMap");const y=i(h,"thickness",0)===0&&i(h,"attenuationDistance",1/0)===1/0;if(u[s++]=Number(y),s++,"attenuationColor"in h?(c[s++]=h.attenuationColor.r,c[s++]=h.attenuationColor.g,c[s++]=h.attenuationColor.b):(c[s++]=1,c[s++]=1,c[s++]=1),c[s++]=i(h,"attenuationDistance",1/0),u[s++]=r(h,"alphaMap"),u[s++]=Number(i(h,"castShadow",!0)),c[s++]=h.opacity,c[s++]=h.alphaTest,!y&&h.transmission>0)c[s++]=0;else switch(h.side){case ai:c[s++]=1;break;case ys:c[s++]=-1;break;case ma:c[s++]=0;break}u[s++]=Number(i(h,"matte",!1)),c[s++]=i(h,"sheen",0),s++,"sheenColor"in h?(c[s++]=h.sheenColor.r,c[s++]=h.sheenColor.g,c[s++]=h.sheenColor.b):(c[s++]=0,c[s++]=0,c[s++]=0),u[s++]=r(h,"sheenColorMap"),c[s++]=i(h,"sheenRoughness",0),u[s++]=r(h,"sheenRoughnessMap"),u[s++]=Number(h.vertexColors),u[s++]=Number(h.flatShading),u[s++]=Number(h.transparent),u[s++]=0,c[s++]=i(h,"anisotropy",0),c[s++]=i(h,"anisotropyRotation",0),u[s++]=r(h,"anisotropyMap"),s++,s++,s++,s+=n(h,"map",c,s),s+=n(h,"metalnessMap",c,s),s+=n(h,"roughnessMap",c,s),s+=n(h,"transmissionMap",c,s),s+=n(h,"emissiveMap",c,s),s+=n(h,"normalMap",c,s),s+=n(h,"clearcoatMap",c,s),s+=n(h,"clearcoatNormalMap",c,s),s+=n(h,"clearcoatRoughnessMap",c,s),s+=n(h,"sheenColorMap",c,s),s+=n(h,"sheenRoughnessMap",c,s),s+=n(h,"iridescenceMap",c,s),s+=n(h,"iridescenceThicknessMap",c,s),s+=n(h,"specularColorMap",c,s),s+=n(h,"specularIntensityMap",c,s),s+=n(h,"alphaMap",c,s),s+=n(h,"anisotropyMap",c,s);const x=i(h,"multiscatterColor",null);c[s++]=x?x.r:1,c[s++]=x?x.g:1,c[s++]=x?x.b:1,c[s++]=i(h,"scatterStrength",0),c[s++]=i(h,"scatterAnisotropy",0),s+=3}return{materialData:u,textures:l}}writeMaterialData(e,t,r){const{materialsMap:i}=this,{object:n,instanceId:s,root:o}=e;let l=n.material;if(Array.isArray(l)){const{materialIndex:f}=n.geometry.groups[o];l=l[f]}const d=new Uint32Array(r),c=i.has(l)?i.get(l):-1;c===-1&&(d[t*Zr.getLength()+32]=0),d[t*Zr.getLength()+33]=c,n.isInstancedMesh&&n.instanceColor?(n.getColorAt(s,nr),nr.w=1):n.isBatchedMesh&&n._colorsTexture?n.getColorAt(s,nr):nr.setScalar(1);const u=new Float32Array(r);nr.toArray(u,t*Zr.getLength()+36)}writeTransformData(e,t,r,i){super.writeTransformData(e,t,r,i),this.writeMaterialData(e,r,i);const n=new Uint32Array(i);n[r*this.structs.transform.getLength()+34]=e.object.visibleToShadowRays===!1?0:1}getBVH(e,t,r){const{bvhMap:i}=this,n=super.getBVH(e,t,r);if(i.has(n)){const s=i.get(n);if(Object.assign(r,s.range),n!==s.bvh&&n instanceof pr){const o=n.mesh,l=s.bvh.mesh;l.matrixWorld.copy(o.matrixWorld).decompose(l.position,l.quaternion,l.scale),n.refit(),n.getBoundingBox(l.boundingBox),n.geometry.computeBoundingBox()}return s.bvh}else if(n.indirect){const s=new xa;s.attributes=n.geometry.attributes;let o;if(n.geometry.index)o=n.geometry.index.array.slice(r.start,r.count+r.start);else{const{start:d,count:c}=r;o=new Uint32Array(c);for(let u=0,f=r.count;u<f;u++)o[u]=d+u}s.index=new ut(o,1),r.start=0;let l;if(n instanceof pr){const d=n.mesh,c=new cl(s);c.copy(d),c.matrixWorld.copy(d.matrixWorld).decompose(c.position,c.quaternion,c.scale),l=new pr(c,{strategy:Ot,targetLeafSize:5})}else l=new gt(s,{strategy:Ot,targetLeafSize:5});return i.set(n,{bvh:l,range:{...r}}),l}else return n}dispose(){const{storage:e}=this;for(const t in e)e[t].value?.dispose()}}class rf extends Sr{set texture(e){this._texNode.value=e}set layer(e){this._layerUniform.value=e}constructor(){super(),this.blending=xi,this._texNode=Re(new ge),this._layerUniform=B(0),this.colorNode=M(`
			fn atlasDebug( tex: texture_2d_array<f32>, coord: vec2f, layer: f32 ) -> vec4f {

				// flip y so texel origin shows at the top-left
				let dims = vec2f( textureDimensions( tex, 0 ).xy );
				let texel = vec2i( vec2f( coord.x, 1.0 - coord.y ) * dims );
				return textureLoad( tex, texel, i32( layer ), 0 );

			}
		`)(this._texNode,Tr(Gt()),this._layerUniform)}}class sf extends Sr{set texture(e){this._texNode.value=e}set minCount(e){this._minUniform.value=e}set maxCount(e){this._maxUniform.value=e}constructor(){super(),this.blending=xi,this._texNode=Re(new qe(1,1)),this._minUniform=B(0),this._maxUniform=B(1);const e=I`
			fn sampleDensity( tex: texture_2d<u32>, coord: vec2f, minCount: f32, maxCount: f32 ) -> vec4f {

				let dims = vec2f( textureDimensions( tex, 0 ) );
				let texel = vec2i( coord * dims );

				// the high bits hold the ray state flags rather than part of the count
				let samples = textureLoad( tex, texel, 0 ).r & ${vr}u;

				// stretched across the recorded range rather than from zero, otherwise a converged
				// image with counts bunched near the max reads as uniformly hot
				let range = max( maxCount - minCount, 1.0 );
				let t = clamp( ( f32( samples ) - minCount ) / range, 0.0, 1.0 );

				return vec4f( ${Wa}( t ), 1.0 );

			}
		`;this.colorNode=e(this._texNode,Tr(Gt()),this._minUniform,this._maxUniform)}}class nf extends Sr{set texture(e){this._texNode.value=e}set showNormal(e){this._showNormalUniform.value=e?1:0}constructor(){super(),this.blending=xi,this._texNode=Re(qt()),this._showNormalUniform=B(0,"uint");const e=I`
			fn auxDebug( tex: texture_2d_array<u32>, coord: vec2f, showNormal: u32 ) -> vec4f {

				// the rows are stored top down, so the quad's bottom up uv is flipped
				let texel = vec2u( vec2f( coord.x, 1.0 - coord.y ) * vec2f( textureDimensions( tex, 0 ) ) );
				var packed: vec3u;
				for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

					packed[ layer ] = textureLoad( tex, texel, layer, 0 ).r;

				}

				let albedo = ${Bs}( packed );
				let normal = ${As}( packed );
				return vec4f( select( albedo, normal, showNormal == 1u ), 1.0 );

			}
		`;this.colorNode=e(this._texNode,Tr(Gt()),this._showNormalUniform)}}function af(a,e){if(!a.index){const t=a.attributes.position.count,r=new Array(t);for(let i=0;i<t;i++)r[i]=i;a.setIndex(r)}if(!a.attributes.normal&&e&&e.includes("normal")&&a.computeVertexNormals(),!a.attributes.uv&&e&&e.includes("uv")){const t=a.attributes.position.count;a.setAttribute("uv",new ut(new Float32Array(t*2),2,!1))}if(!a.attributes.uv2&&e&&e.includes("uv2")){const t=a.attributes.position.count;a.setAttribute("uv2",new ut(new Float32Array(t*2),2,!1))}if(!a.attributes.tangent&&e&&e.includes("tangent"))if(a.attributes.uv&&a.attributes.normal)a.computeTangents();else{const t=a.attributes.position.count;a.setAttribute("tangent",new ut(new Float32Array(t*4),4,!1))}if(!a.attributes.color&&e&&e.includes("color")){const t=a.attributes.position.count,r=new Float32Array(t*4);r.fill(1),a.setAttribute("color",new ut(r,4))}}class of{init(){}getBsdfNode(){return I`

			fn bsdfSample( worldWo: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = ${mu}( wo, ${Ae}( ${ro} ) );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;
				record.direction = normalize( surf.normalBasis * wi );

				return record;

			}

		`}getBsdfEvalPdfNode(){return I`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;
				record.direction = worldWi;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;

				return record;

			}

		`}getData(){return{bsdfSample:this.getBsdfNode(),bsdfEvalPdf:this.getBsdfEvalPdfNode()}}}const lf=M(`

	fn eonDirectionalAlbedo( mu: f32, roughness: f32, A: f32 ) -> f32 {

		let muComp = 1.0 - mu;
		let gOverPi = muComp * (
			0.0571085289 + muComp * (
				0.491881867 + muComp * (
					- 0.332181442 + muComp * 0.0714429953
				)
			)
		);
		return A * ( 1.0 + roughness * gOverPi );

	}

`),Uo=M(`

	fn fonSingleScatter( NdotV: f32, NdotL: f32, VdotH: f32, roughness: f32, A: f32, rho: vec3f ) -> vec3f {

		let VdotL = 2.0 * VdotH * VdotH - 1.0;
		let s = VdotL - NdotV * NdotL;
		let sOverT = select( s, s / max( NdotV, NdotL ), s > 0.0 );

		return ( rho / PI ) * A * ( 1.0 + roughness * sOverT );

	}

`,[q]);M(`

	fn fonBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		let roughness = surf.diffuseRoughness;
		if ( roughness < 1e-5 ) {

			return surf.color / PI;

		}

		let rho = saturate( surf.color );
		let A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );

		return fonSingleScatter( NdotV, NdotL, VdotH, roughness, A, rho );

	}

`,[q,he,Uo]);const cf=M(`

	fn eonBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		let roughness = surf.diffuseRoughness;
		if ( roughness < 1e-5 ) {

			return surf.color / PI;

		}

		let rho = saturate( surf.color );
		let A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		let singleScatter = fonSingleScatter( NdotV, NdotL, VdotH, roughness, A, rho );

		let averageDirectionalAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		let directionalAlbedoV = eonDirectionalAlbedo( NdotV, roughness, A );
		let directionalAlbedoL = eonDirectionalAlbedo( NdotL, roughness, A );

		let rhoMultiScatter = rho * rho * averageDirectionalAlbedo /
			max( vec3f( 1e-7 ), vec3f( 1.0 ) - rho * ( 1.0 - averageDirectionalAlbedo ) );
		let multiScatter = ( rhoMultiScatter / PI ) *
			max( 1e-7, 1.0 - directionalAlbedoV ) *
			max( 1e-7, 1.0 - directionalAlbedoL ) /
			max( 1e-7, 1.0 - averageDirectionalAlbedo );

		return singleScatter + multiScatter;

	}

`,[q,he,lf,Uo]),Vo=M(`

	fn eonLtcCoeffs( mu: f32, roughness: f32 ) -> vec4f {

		let a = 1.0 + roughness * (
			0.303392 + ( - 0.518982 + 0.111709 * mu ) * mu +
			( - 0.276266 + 0.335918 * mu ) * roughness
		);
		let b = roughness * (
			- 1.16407 + 1.15859 * mu + ( 0.150815 - 0.150105 * mu ) * roughness
		) / ( mu * mu * mu - 1.43545 );
		let c = 1.0 + roughness * ( 0.20013 + ( - 0.506373 + 0.261777 * mu ) * mu );
		let d = roughness * (
			0.540852 + ( - 1.01625 + 0.475392 * mu ) * mu
		) / ( - 1.0743 + ( 0.0725628 + mu ) * mu );

		return vec4f( a, b, c, d );

	}

`),Oo=M(`

	fn eonLtcBasis( wo: vec3f ) -> mat3x3f {

		let lenSqr = dot( wo.xy, wo.xy );
		let invLen = inverseSqrt( lenSqr );
		let x = select(
			vec3f( 1.0, 0.0, 0.0 ),
			vec3f( wo.x, wo.y, 0.0 ) * invLen,
			lenSqr > 0.0,
		);
		let y = vec3f( - x.y, x.x, 0.0 );

		return mat3x3f( x, y, vec3f( 0.0, 0.0, 1.0 ) );

	}

`),uf=M(`

	fn eonCltcPdf( wo: vec3f, wi: vec3f, roughness: f32 ) -> f32 {

		let toLtc = transpose( eonLtcBasis( wo ) );
		let wiLtc = toLtc * wi;
		let coeffs = eonLtcCoeffs( saturate( wo.z ), roughness );
		let a = coeffs.x;
		let b = coeffs.y;
		let c = coeffs.z;
		let d = coeffs.w;
		let detM = c * ( a - b * d );
		let wh = vec3f(
			c * ( wiLtc.x - b * wiLtc.z ),
			( a - b * d ) * wiLtc.y,
			- c * ( d * wiLtc.x - a * wiLtc.z ),
		);
		let lenSqr = max( dot( wh, wh ), 1e-7 );
		let vz = inverseSqrt( d * d + 1.0 );
		let s = 0.5 * ( 1.0 + vz );
		let jacobian = detM * detM / ( lenSqr * lenSqr );

		return jacobian * max( wh.z, 0.0 ) / ( PI * s );

	}

`,[q,Vo,Oo]),df=M(`

	fn eonCltcDirection( wo: vec3f, roughness: f32, uv: vec2f ) -> vec3f {

		let coeffs = eonLtcCoeffs( saturate( wo.z ), roughness );
		let a = coeffs.x;
		let b = coeffs.y;
		let c = coeffs.z;
		let d = coeffs.w;
		let radius = sqrt( uv.x );
		let phi = 2.0 * PI * uv.y;
		let y = radius * sin( phi );
		let vz = inverseSqrt( d * d + 1.0 );
		let s = 0.5 * ( 1.0 + vz );
		let x = - mix( sqrt( max( 1.0 - y * y, 0.0 ) ), radius * cos( phi ), s );
		let wh = vec3f( x, y, sqrt( max( 1.0 - x * x - y * y, 0.0 ) ) );
		let wiUnnormalized = vec3f(
			a * wh.x + b * wh.z,
			c * wh.y,
			d * wh.x + wh.z,
		);
		let wi = normalize( eonLtcBasis( wo ) * wiUnnormalized );

		return wi;

	}

`,[q,Vo,Oo]),ff=M(`

	fn eonUniformHemisphereSample( uv: vec2f ) -> vec3f {

		let sinTheta = sqrt( max( 1.0 - uv.x * uv.x, 0.0 ) );
		let phi = 2.0 * PI * uv.y;
		return vec3f( sinTheta * cos( phi ), sinTheta * sin( phi ), uv.x );

	}

`,[q]),Wo=M(`

	fn eonUniformProbability( wo: vec3f, roughness: f32 ) -> f32 {

		let mu = saturate( wo.z );
		return clamp( pow( roughness, 0.1 ), 0.0, 1.0 ) * (
			0.162925 + ( - 0.372058 + ( 0.538233 - 0.290822 * mu ) * mu ) * mu
		);

	}

`),hf=M(`

	fn eonDirection( wo: vec3f, roughness: f32, uv: vec2f ) -> vec3f {

		let uniformProbability = eonUniformProbability( wo, roughness );
		if ( uv.x <= uniformProbability && uniformProbability > 0.0 ) {

			return eonUniformHemisphereSample( vec2f( uv.x / uniformProbability, uv.y ) );

		}

		let cltcProbability = 1.0 - uniformProbability;
		let cltcUv = vec2f(
			( uv.x - uniformProbability ) / max( cltcProbability, 1e-7 ),
			uv.y,
		);
		return eonCltcDirection( wo, roughness, cltcUv );

	}

`,[df,ff,Wo]),pf=M(`

	fn eonPdf( wo: vec3f, wi: vec3f, roughness: f32 ) -> f32 {

		// The EON proposal is defined over the positive hemisphere.
		if ( wo.z <= 0.0 || wi.z <= 0.0 ) {

			return 0.0;

		}

		let uniformProbability = eonUniformProbability( wo, roughness );
		let cltcProbability = 1.0 - uniformProbability;
		let uniformPdf = 1.0 / ( 2.0 * PI );

		return uniformProbability * uniformPdf +
			cltcProbability * eonCltcPdf( wo, wi, roughness );

	}

`,[q,uf,Wo]),mf=I`

	fn velvetD( cosThetaH: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		let invAlpha = 1.0 / alpha;
		let sqrCosThetaH = cosThetaH * cosThetaH;
		let sinThetaH = max( 1.0 - sqrCosThetaH, 0.001 );

		return ( 2.0 + invAlpha ) * pow( sinThetaH, 0.5 * invAlpha ) / ( 2.0 * PI );

	}

`,ar=I`

	fn velvetParamsInterpolate( i: i32, oneMinusAlphaSquared: f32 ) -> f32 {

		let p0 = array<f32, 5>( 25.3245, 3.32435, 0.16801, - 1.27393, - 4.85967 );
		let p1 = array<f32, 5>( 21.5473, 3.82987, 0.19823, - 1.97760, - 4.32054 );

		return mix( p1[ i ], p0[ i ], oneMinusAlphaSquared );

	}

`,es=I`

	fn velvetL( x: f32, alpha: f32 ) -> f32 {

		let oneMinusAlpha = 1.0 - alpha;
		let oneMinusAlphaSquared = oneMinusAlpha * oneMinusAlpha;

		let a = ${ar}( 0, oneMinusAlphaSquared );
		let b = ${ar}( 1, oneMinusAlphaSquared );
		let c = ${ar}( 2, oneMinusAlphaSquared );
		let d = ${ar}( 3, oneMinusAlphaSquared );
		let e = ${ar}( 4, oneMinusAlphaSquared );

		return a / ( 1.0 + b * pow( abs( x ), c ) ) + d * x + e;

	}

`,na=I`

	fn velvetLambda( cosTheta: f32, alpha: f32 ) -> f32 {

		if ( abs( cosTheta ) < 0.5 ) {

			return exp( ${es}( cosTheta, alpha ) );

		} else {

			return exp( 2.0 * ${es}( 0.5, alpha ) - ${es}( 1.0 - cosTheta, alpha ) );

		}

	}

`,gf=I`

	fn velvetG( cosThetaO: f32, cosThetaI: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		return 1.0 / ( 1.0 + ${na}( cosThetaO, alpha ) + ${na}( cosThetaI, alpha ) );

	}

`,aa=I`

	fn directionalAlbedoSheen( cosThetaIn: f32, alpha: f32 ) -> f32 {

		let cosTheta = saturate( cosThetaIn );
		let c = 1.0 - cosTheta;
		let c3 = c * c * c;

		return 0.65584461 * c3 + 1.0 / ( 4.16526551 + exp( -7.97291361 * sqrt( alpha ) + 6.33516894 ) );

	}

`,xf=I`

	fn sheenAlbedoScaling( wo: vec3f, wi: vec3f, surf: ${he} ) -> f32 {

		var alpha = max( surf.sheenRoughness, 0.07 );
		alpha = alpha * alpha;

		let maxSheenColor = max( max( surf.sheenColor.r, surf.sheenColor.g ), surf.sheenColor.b );

		let eWo = ${aa}( clamp( wo.z, 0.001, 1.0 ), alpha );
		let eWi = ${aa}( clamp( wi.z, 0.001, 1.0 ), alpha );

		return min( 1.0 - maxSheenColor * eWo, 1.0 - maxSheenColor * eWi );

	}

`,yf=I`

	fn sheenColor( wo: vec3f, wi: vec3f, wh: vec3f, surf: ${he} ) -> vec3f {

		let cosThetaO = clamp( wo.z, 0.001, 1.0 );
		let cosThetaI = clamp( wi.z, 0.001, 1.0 );
		let cosThetaH = wh.z;

		let D = ${mf}( cosThetaH, surf.sheenRoughness );
		let G = ${gf}( cosThetaO, cosThetaI, surf.sheenRoughness );

		// See equation (1) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
		var color = surf.sheenColor;
		color *= D * G / ( 4.0 * abs( cosThetaO * cosThetaI ) );

		return color;

	}

`,ei=32,ti=16;class vf extends dl{constructor(){super(ei,ei,31),this.type=fe,this.format=Ce,this.minFilter=se,this.magFilter=se,this.dielectricLayerCount=10,this.transmissiveLayerCount=10,this.minIoR=1,this.maxIoR=2.5,this.sampleConductorFn=K("_sampleConductorFn",this),this.sampleDielectricFn=K("_sampleDielectricFn",this),this.sampleTransmissiveFn=K("_sampleTransmissiveFn",this)}generate(e){const{dielectricLayerCount:t,transmissiveLayerCount:r,minIoR:i,maxIoR:n}=this,s={outputTarget:fl(this).toWriteOnly(),globalId:ae,eta:B(1),layer:B(0,"uint"),includeFresnel:B(0),includeRefraction:B(0)},o=[ei/ti,ei/ti,1],l=new te(Hu(s.outputTarget)(s),{workgroupSize:[ti,ti,1]});s.layer.value=0,s.eta.value=1,s.includeFresnel.value=0,s.includeRefraction.value=0,e.compute(l.kernel,o);for(let y=0;y<t;y++)s.layer.value++,s.eta.value=1/ss.mapLinear(y,0,t-1,i,n),s.includeFresnel.value=1,e.compute(l.kernel,o);s.includeFresnel.value=1,s.includeRefraction.value=1;for(let y=0;y<r;y++){const x=ss.mapLinear(y,0,r-1,i,n);s.layer.value=1+t+y,s.eta.value=1/x,e.compute(l.kernel,o),s.layer.value=1+t+r+y,s.eta.value=x,e.compute(l.kernel,o)}l.dispose();const d=I`
			fn mapLinearClamped( v: f32, a0: f32, a1: f32, b0: f32, b1: f32 ) -> f32 {

				let mapped = saturate( ( v - a0 ) / ( a1 - a0 ) );
				return mix( b0, b1, mapped );

			}
		`,c=hl(this).setName("turquinTexture"),u=gi(this).setName("turquinSampler"),f=1/(1+t+2*r);this._sampleConductorFn=I`
			fn sampleConductor( cosTheta0: f32, roughness: f32 ) -> f32 {

				let layer = 0.5;
				let uvw = vec3f( cosTheta0, roughness, layer * ${f} );
				return textureSampleLevel( ${c}, ${u}, uvw, 0 ).r;

			}
		`,this._sampleDielectricFn=I`
			fn sampleDielectric( cosTheta0: f32, roughness: f32, ior: f32 ) -> f32 {

				let blockStart = 1.0;
				let layer = ${d}(
					ior,
					f32( ${i} ), f32( ${n} ),
					0.5, f32( ${t} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${f} );
				return textureSampleLevel( ${c}, ${u}, uvw, 0 ).r;

			}
		`;const p=1+t,h=1+t+r;this._sampleTransmissiveFn=I`
			fn sampleTransmissive( cosTheta0: f32, roughness: f32, ior: f32, entering: bool ) -> f32 {

				let blockStart = select(
					f32( ${h} ),
					f32( ${p} ),
					entering
				);
				let layer = ${d}(
					ior,
					f32( ${i} ), f32( ${n} ),
					0.5, f32( ${r} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${f} );
				return textureSampleLevel( ${c}, ${u}, uvw, 0 ).r;

			}
		`}}const oa=Le(1.5),la=Le(1e6);class bf extends of{constructor(e={}){super();const{specularBrdf:t=To,specularBtdf:r=Io,diffuseBrdf:i=cf,fresnelMix:n=Fu,conductorFresnel:s=Eu,fresnelCoat:o=ku,iridescentFresnel:l=Do}=e;this.turquinTexture=new vf,this.specularBrdf=t,this.specularBtdf=r,this.diffuseBrdf=i,this.fresnelMix=n,this.conductorFresnel=s,this.fresnelCoat=o,this.iridescentFresnel=l,this.transmissionFresnel=zu(l)}init(e){this.turquinTexture.generate(e)}getBsdfNode(){this._bsdfEvalFunc=I`

			// The material is organized as one scoped block per lobe in cascade order - clearcoat,
			// sheen, transmission, specular, diffuse - each accumulating into a shared result and
			// guarding its own hemisphere.
			// TODO: energy only cascades downward through front faces, so the layers are always traversed
			// outside-in and cannot reflect energy back into the glass from below.
			fn bsdfEval( ctx: ${zn}, surf: ${he} ) -> vec3f {

				let NdotV = ctx.V.z;
				let NdotL = ctx.L.z;

				// Each lobe contributes into "result" within its own scope, evaluated in cascade.
				// "attenuation" carries the fraction of energy each layer passes through to
				// the layers beneath it. Every lobe guards its own hemisphere.
				var result = vec3f( 0.0 );
				var attenuation = vec3f( 1.0 );

				// clearcoat
				if ( NdotL > 0.0 && surf.clearcoat > 0.0 ) {

					// the clearcoat evaluates in its own frame
					let toClearcoatMat = surf.clearcoatInvBasis * surf.normalBasis;
					let Vc = normalize( toClearcoatMat * ctx.V );
					let Lc = normalize( toClearcoatMat * ctx.L );
					let Hc = normalize( toClearcoatMat * ctx.H );
					let NdotVc = Vc.z;

					let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;

					// reuse the same pattern for energy conservation used in the dielectric layer
					let clearcoatEnergySS = max( ${this.turquinTexture.sampleConductorFn}( NdotVc, surf.clearcoatRoughness ), 1e-5 );
					let clearcoatBoost = 1.0 + ${Ne}( 1.5 ) * ( 1.0 - clearcoatEnergySS ) / clearcoatEnergySS;

					let clearcoatSpecular = ${this.specularBrdf}( Vc, Lc, Hc, vec2( clearcoatAlpha ) ) * clearcoatBoost;
					let clearcoatFresnel = ${St}( abs( dot( Vc, Hc ) ), ${Ne}( 1.5 ) );

					// retrieve specular energy reflected by this layer
					let clearcoatFresnelEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotVc, surf.clearcoatRoughness, 1.5 ) * clearcoatBoost;

					result += surf.clearcoat * clearcoatFresnel * clearcoatSpecular;
					attenuation *= 1.0 - surf.clearcoat * clearcoatFresnelEnergySS;

				}

				// sheen
				if ( NdotL > 0.0 && surf.sheen > 0.0 ) {

					result += attenuation * surf.sheen * ${yf}( ctx.V, ctx.L, ctx.H, surf );
					attenuation *= mix( 1.0, ${xf}( ctx.V, ctx.L, surf ), surf.sheen );

				}

				// transmission
				// handles specular reflection and transmission
				if ( surf.transmission > 0.0 ) {

					let matchedIor = ${gr}( surf.eta );

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// multiscatter compensation
					var glassBoost = 0.0;
					if ( matchedIor ) {

						glassBoost = 1.0;

					} else if ( surf.thinWall ) {

						// thin wall halves are reflection-shaped so each is compensated with the conductor albedo at its own roughness.
						glassBoost = 1.0 / max( ${this.turquinTexture.sampleConductorFn}( NdotV, surf.roughness ), 1e-5 );

					} else {

						// volumetric bsdf is scaled by its total reflected + refracted energy
						glassBoost = 1.0 / max( ${this.turquinTexture.sampleTransmissiveFn}( NdotV, surf.roughness, surf.ior, surf.frontFace ), 1e-5 );

					}

					let fresnelCosine = select( ctx.VdotH, NdotV, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					if ( NdotL < 0.0 ) {

						var refraction = vec3f( 0.0 );
						if ( surf.thinWall && ! matchedIor ) {

							// evaluate the flipped reflection, compensated at the remapped roughness
							let wiMirror = vec3f( ctx.L.xy, - ctx.L.z );
							let thinWallAlpha = vec2f( ${ji}( alphaB, surf.ior ) );
							let thinWallEnergySS = max( ${this.turquinTexture.sampleConductorFn}( NdotV, sqrt( thinWallAlpha.x ) ), 1e-5 );
							refraction = fresnel.transmittance * ${this.specularBrdf}( ctx.V, wiMirror, ctx.H, thinWallAlpha ) / thinWallEnergySS;

						} else if ( ! matchedIor ) {

							// The default BTDF contains the plain dielectric Fresnel complement. Replace it
							// with the colored thin-film-aware coefficient shared by sampling and the PDF.
							let dielectricTransmittance = 1.0 - ${Ir}( abs( ctx.VdotH ), surf.eta );
							if ( dielectricTransmittance > EPSILON ) {

								refraction = ${this.specularBtdf}( ctx.V, ctx.L, ctx.H, alpha, surf.eta ) *
									fresnel.transmittance / dielectricTransmittance * glassBoost;

							}

						}

						// the refracted half is not attenuated by the layers above. A volume is entered and exited,
						// so each crossing takes the square root of the color, as in Cycles
						let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
						result += ( 1.0 - surf.metalness ) * surf.transmission * refraction * transmissionTint;

					} else {

						// the raw single scatter lobe scaled by the glass compensation boost rather
						// than the opaque dielectric boost
						let specular = ${this.specularBrdf}( ctx.V, ctx.L, ctx.H, alpha );
						let dielectricSpecular = specular * glassBoost;

						let reflection = dielectricSpecular * fresnel.reflectance;

						result += attenuation * ( 1.0 - surf.metalness ) * surf.transmission * reflection;

					}

				}

				// specular
				// metallic + dielectric + iridescence
				if ( NdotL > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// Sample the single scatter energy for specular at the given roughness
					let energySS = max( ${this.turquinTexture.sampleConductorFn}( NdotV, surf.roughness ), 1e-5 );
					let specular = ${this.specularBrdf}( ctx.V, ctx.L, ctx.H, alpha );

					// metallic with the multiscatter comp
					let metallicBoost = 1.0 + surf.color * ( 1.0 - energySS ) / energySS;
					let metallicSpecular = specular * metallicBoost;
					var metallicReflectance = ${this.conductorFresnel}( ctx.VdotH, surf.color, vec3f( 1.0 ) );

					// dielectric with the multiscatter comp
					let dielectricBoost = 1.0 + surf.f0 * ( 1.0 - energySS ) / energySS;
					let dielectricSpecular = specular * dielectricBoost;

					// KHR_materials_specular: fold the specular color and intensity into the dielectric f0.
					// Schlick is used on both hit sides, matching Cycles - the opaque specular carries no
					// TIR so the energy removed from the base always matches the energy paid back
					let dielectricF0 = min( surf.f0 * surf.specularColor, vec3f( 1.0 ) );
					let dielectricFr = ${Ti}( ctx.VdotH, dielectricF0, vec3f( 1.0 ) );
					var dielectricReflectance = surf.specularIntensity * dielectricFr;

					// iridescence
					var filmFresnelMax = 0.0;
					if ( surf.iridescence > 0.0 ) {

						// the media on either side of the film - air outside and the volume interior
						// as the base on front faces, swapped on back faces so TIR can take effect
						let outsideIor = select( surf.ior, 1.0, surf.frontFace );
						let filmBaseIor = select( 1.0, surf.ior, surf.frontFace );

						let metallicFilmFresnel = ${this.iridescentFresnel}( ctx.VdotH, surf.color, surf.iridescenceIor, outsideIor, surf.iridescenceThickness );
						metallicReflectance = mix( metallicReflectance, metallicFilmFresnel, surf.iridescence );

						let dielectricFilmFresnel = ${this.iridescentFresnel}( ctx.VdotH, vec3f( ${Ne}( filmBaseIor ) ), surf.iridescenceIor, outsideIor, surf.iridescenceThickness );
						dielectricReflectance = mix( dielectricReflectance, dielectricFilmFresnel, surf.iridescence );
						filmFresnelMax = max( max( dielectricFilmFresnel.r, dielectricFilmFresnel.g ), dielectricFilmFresnel.b );

					}

					let metallic = metallicSpecular * metallicReflectance;
					let dielectric = dielectricSpecular * dielectricReflectance;

					// The energy the specular interface takes from the layers below, at the lobe's specular color
					// and intensity. The table holds the albedo at the ior's f0, and the Schlick albedo is linear
					// in f0, so the tinted albedo slides from it toward the conductor albedo at f0 = 1
					let iorEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotV, surf.roughness, surf.ior );
					let tintedEnergySS = iorEnergySS + ( dielectricF0 - surf.f0 ) * ( energySS - iorEnergySS ) / ( 1.0 - surf.f0 );
					let fresnelEnergySS = surf.specularIntensity * tintedEnergySS * dielectricBoost;

					result += attenuation * mix( ( 1.0 - surf.transmission ) * dielectric, metallic, surf.metalness );
					attenuation *= ( 1.0 - surf.metalness ) * mix( 1.0 - fresnelEnergySS, vec3f( 1.0 - filmFresnelMax ), surf.iridescence );

				}

				// diffuse
				if ( NdotL > 0.0 ) {

					// the dielectric base mixes diffuse with transmission - the transmissive half
					// is carried by the glass lobe above
					let diffuseVdotH = sqrt( saturate( 0.5 * ( 1.0 + dot( ctx.V, ctx.L ) ) ) );
					let reflection = ${this.diffuseBrdf}( NdotV, NdotL, diffuseVdotH, surf );
					let diffuse = ( 1.0 - surf.transmission ) * reflection;

					result += attenuation * diffuse;

				}

				return result;

			}

		`;const e=this.getBsdfEvalPdfNode();return I`

			fn bsdfSample( worldWo: vec3f, surf: ${he} ) -> ${dt} {

				var result: ${dt};
				result.color = vec3f( 0.0 );
				result.isTransmissive = false;
				result.direction = vec3f( 0.0 );
				result.pdf = 0.0;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let woClearcoat = normalize( surf.clearcoatInvBasis * worldWo );

				// TODO: mirror bsdfEval's layer structure - the glass layer should own both its
				// reflection and refraction halves
				// lobe selection weights and cumulative bounds in cascade order:
				// clearcoat, specular, transmission, diffuse
				let weights = ${Un}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${oa}, surf );
				let cdfClearcoat = weights.clearcoat;
				let cdfSpecular = cdfClearcoat + weights.specular;
				let cdfTransmission = cdfSpecular + weights.transmission;
				let cdfTotal = cdfTransmission + weights.diffuse;

				// random samples for lobes
				let lobeSample = ${mt}( ${nu} ) * cdfTotal;
				let directionUV = ${Ae}( ${ro} );

				// output
				var wi: vec3f;
				var wh: vec3f;

				// TODO: see if we can clean up these flags so they're not necessary
				var isTransmissionLobe = false;
				var isDeltaTransmission = false;
				var deltaTransmittance = vec3f( 1.0 );
				var deltaProbability = 1.0;
				var isDead = false;

				if ( lobeSample <= cdfClearcoat ) {

					// clearcoat
					let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;
					let whCoat = ${cr}( woClearcoat, vec2( clearcoatAlpha ), directionUV );
					let wiCoat = - normalize( reflect( woClearcoat, whCoat ) );

					wi = normalize( surf.normalInvBasis * surf.clearcoatBasis * wiCoat );
					wh = normalize( surf.normalInvBasis * surf.clearcoatBasis * whCoat );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				} else if ( lobeSample <= cdfSpecular ) {

					// specular
					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					wh = ${cr}( wo, alpha, directionUV );
					wi = - normalize( reflect( wo, wh ) );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				} else if ( lobeSample <= cdfTransmission ) {

					// transmission
					isTransmissionLobe = true;

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// sample the half vector first and select reflection or refraction by the
					// facet fresnel, matching Cycles - total internal reflection drives the
					// fresnel to 1 so TIR facets always reflect with a matching pdf
					wh = ${cr}( wo, alpha, directionUV );

					let fresnelCosine = select( dot( wo, wh ), wo.z, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					let fresnelSample = ( lobeSample - cdfSpecular ) / ( cdfTransmission - cdfSpecular );
					let doReflect = fresnelSample < fresnel.reflectProbability;
					if ( doReflect ) {

						wi = - normalize( reflect( wo, wh ) );

					} else if ( ${gr}( surf.eta ) ) {

						// With no IOR boundary, rough transmission collapses to straight-through
						// delta transmission independent of the sampled microfacet.
						wi = - wo;
						wh = vec3f( 0.0, 0.0, 1.0 );
						isDeltaTransmission = true;
						deltaTransmittance = fresnel.transmittance;
						deltaProbability = 1.0 - fresnel.reflectProbability;

					} else if ( surf.thinWall ) {

						// model the double refraction as a single reflection flipped through the
						// surface at the remapped thin wall roughness
						let thinWallAlpha = vec2f( ${ji}( alphaB, surf.ior ) );
						wh = ${cr}( wo, thinWallAlpha, directionUV );
						wi = - normalize( reflect( wo, wh ) );
						wi = vec3f( wi.xy, - wi.z );

					} else {

						wi = refract( - wo, wh, surf.eta );

						// "refract" returns zero on total internal reflection, so reflect instead and let "isDead" drop it
						if ( dot( wi, wi ) == 0.0 ) {

							wi = - normalize( reflect( wo, wh ) );

						}

					}

					// the facet choice must agree with the resulting hemisphere - reflection above,
					// transmission below. Mismatched samples are dropped since their loss is
					// refunded by the energy compensation tables
					isDead = doReflect != ( wi.z > 0.0 );

				} else if ( lobeSample <= cdfTotal ) {

					// diffuse
					// all diffuse BRDF variants share the EON sampling proposal
					wi = ${hf}( wo, surf.diffuseRoughness, directionUV );
					wh = normalize( wi + wo );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				}

				let worldWi = normalize( surf.normalBasis * wi );
				if ( isDeltaTransmission ) {

					// Cycles represents a singular event with a large matching BSDF and PDF. Their
					// ratio preserves throughput while forward MIS correctly gives the event full weight.
					let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
					result.color = ( 1.0 - surf.metalness ) * surf.transmission * transmissionTint *
						deltaTransmittance * ${la};
					result.direction = worldWi;
					result.pdf = weights.transmission * deltaProbability * ${la};
					result.isTransmissive = dot( worldWi, surf.faceNormal ) < 0.0;

				} else {

					// evaluate the shared eval / pdf function for the sampled direction so the sample
					// and light-sampling paths can never disagree on color or pdf
					result = ${e}( worldWo, worldWi, surf );

				}

				// mismatched glass facets and reflection lobe samples that land below the
				// hemisphere carry no energy - their loss is refunded by the compensation tables
				let invalid = isDead || ( ! isTransmissionLobe && wi.z <= 0.0 );
				result.color *= select( 1.0, 0.0, invalid );

				return result;

			}

		`}getBsdfEvalPdfNode(){if(this._bsdfEvalPdfNode)return this._bsdfEvalPdfNode;this._bsdfEvalFunc||this.getBsdfNode();const e=this._bsdfEvalFunc;return this._bsdfEvalPdfNode=I`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: ${he} ) -> ${dt} {

				var result: ${dt};
				result.color = vec3f( 0.0 );
				result.isTransmissive = false;
				result.direction = worldWi;
				result.pdf = 0.0;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				let woClearcoat = normalize( surf.clearcoatInvBasis * worldWo );

				let isTransmission = wi.z < 0.0;
				if ( isTransmission && ${gr}( surf.eta ) ) {

					// Delta transmission has no finite solid-angle BSDF or PDF. It is handled
					// explicitly by bsdfSample, matching PBRT-v4's eta == 1 path.
					return result;

				}

				// reconstruct the half vector bsdfSample would have used for this direction -
				// reflections use the standard half vector while refractions use the generalized
				// form scaled by the ior ratio, oriented into the upper hemisphere
				var wh: vec3f;
				if ( ! isTransmission ) {

					wh = normalize( wo + wi );

				} else if ( surf.thinWall ) {

					// thin wall transmission is modeled as a reflection flipped through the surface
					wh = normalize( wo + vec3f( wi.xy, - wi.z ) );

				} else {

					wh = normalize( wi + wo * surf.eta );
					wh *= sign( wh.z );

				}

				let weights = ${Un}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${oa}, surf );

				// TODO: mirror bsdfEval's layer structure - the glass layer should own both its
				// reflection and refraction halves
				// pdf mixture - every lobe that can produce the direction contributes its share,
				// in the same cascade order and with the same terms as bsdfSample

				// clearcoat
				if ( weights.clearcoat > 0.0 ) {

					// the clearcoat lobe evaluates in its own frame
					let toClearcoatMat = surf.clearcoatInvBasis * surf.normalBasis;
					let wiClearcoat = normalize( toClearcoatMat * wi );
					if ( wiClearcoat.z > 0.0 ) {

						let whClearcoat = normalize( toClearcoatMat * wh );
						let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;
						result.pdf += weights.clearcoat * ${ur}( woClearcoat, whClearcoat, vec2( clearcoatAlpha ) );

					}

				}

				// specular
				if ( weights.specular > 0.0 && wi.z > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					result.pdf += weights.specular * ${ur}( wo, wh, alpha );

				}

				// transmission
				if ( weights.transmission > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// the glass lobe selects reflection or refraction by the facet fresnel so
					// each side carries the corresponding share of the transmission pdf
					let fresnelCosine = select( dot( wo, wh ), wo.z, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					if ( wi.z > 0.0 ) {

						result.pdf += weights.transmission * fresnel.reflectProbability * ${ur}( wo, wh, alpha );

					} else if ( surf.thinWall ) {

						// the flipped reflection shares the reflection pdf at the remapped roughness
						let thinWallAlpha = vec2f( ${ji}( alphaB, surf.ior ) );
						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${ur}( wo, wh, thinWallAlpha );

					} else {

						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${wo}( wo, wi, wh, alpha, surf.eta );

					}

				}

				// diffuse
				if ( weights.diffuse > 0.0 ) {

					result.pdf += weights.diffuse * ${pf}( wo, wi, surf.diffuseRoughness );

				}

				//

				// construct the scatter context
				var ctx: ${zn};
				ctx.V = wo;
				ctx.L = wi;
				ctx.H = wh;
				ctx.VdotH = saturate( dot( wo, wh ) );

				// evaluate the bsdf for the direction
				result.color = ${e}( ctx, surf ) * abs( wi.z );

				// a direction crossing below the surface enters or leaves the volume
				result.isTransmissive = isTransmission && dot( worldWi, surf.faceNormal ) < 0.0;

				return result;

			}

		`,this._bsdfEvalPdfNode}}const Xe=new G,ri=new Ia,wf=250,Sf=16,ca=1.15,ua=2,Tf=4096,da={strategy:Ot,targetLeafSize:5},If=4,ts=0,rs=1,ii=2;async function _f(a,e,t){const r=d=>typeof SharedArrayBuffer<"u"&&d.buffer instanceof SharedArrayBuffer?d:d.slice(),{position:i}=e.attributes,{index:n}=e,s=i.array,o=n?n.array:null;i.array=r(s),n&&(n.array=r(o));const l=await a.generate(e,t);return i.array=s,n&&(o.set(n.array),n.array=o,n.needsUpdate=!0),l}class fa{constructor(e,t){this.key=t,this.renderer=e,this.texture=null,this.hash=null;const r=new ge(new Uint8Array([255,255,255,255]),1,1);r.minFilter=se,r.magFilter=se,this.colorTex=r}dispose(){this.colorTex.dispose(),this.texture?.dispose()}setFromScene(e){const{renderer:t,key:r,colorTex:i}=this;let n=e[r],s="";if(n)n.isColor?(i.image.data[0]=n.r*255,i.image.data[1]=n.g*255,i.image.data[2]=n.b*255,i.image.data[3]=255,n=i,s=i.image.data.join(),i.needsUpdate=s!==this.hash):n.isCubeTexture?(s=null,n=new Yd(t).generate(n)):(s=n.uuid+"_"+n.version,s!==this.hash&&(n=n.clone(),n.minFilter=se,n.magFilter=se));else{const o=t.getClearAlpha();t.getClearColor(ri),i.image.data[0]=ri.r*255,i.image.data[1]=ri.g*255,i.image.data[2]=ri.b*255,i.image.data[3]=o*255,n=i,s=i.image.data.join(),i.needsUpdate=s!==this.hash}if(s===null)return this.texture?.dispose(),this.texture=n,this.hash=null,!0;{const o=s!==this.hash;return o&&(this.texture?.dispose(),this.texture=n,this.hash=s),o}}}class Ef extends Ca{get maxBounces(){return this._pathTracer.maxBounces}set maxBounces(e){this._pathTracer.maxBounces=e,this.reset()}get frameBudget(){return this._pathTracer.frameBudget}set frameBudget(e){this._pathTracer.frameBudget=e}get frameTime(){return this._pathTracer.timing.frameTime}get maxTransparentBounces(){return this._pathTracer.maxTransparentBounces}set maxTransparentBounces(e){this._pathTracer.maxTransparentBounces=e,this.reset()}get maxSubsurfaceBounces(){return this._pathTracer.maxSubsurfaceBounces}set maxSubsurfaceBounces(e){this._pathTracer.maxSubsurfaceBounces=e,this.reset()}get maxSamples(){return this._pathTracer.maxSamples}set maxSamples(e){this._pathTracer.maxSamples=e,this._denoiser?.reset()}get complete(){const e=this.maxSamples,t=this._denoiser;return e>0&&this._lastSampleCounts.min>=e&&(!t||t.complete)}async getSampleCountsAsync(){const e=this._pathTracer,t=this._lastSampleCounts,r=await e.getSampleCountsAsync();t.min=r.min,t.max=r.max,t.avg=r.avg;const i=this.getRenderTime()/1e3;return t.samplesPerSecond=i>0?t.avg/i:0,{...t}}get transmissiveBackground(){return this._transmissiveBackground}set transmissiveBackground(e){this._transmissiveBackground!==e&&(this._transmissiveBackground=e,this._pathTracer.setTransmissiveBackground(e))}get filterGlossyFactor(){return this._filterGlossyFactor}set filterGlossyFactor(e){this._filterGlossyFactor!==e&&(this._filterGlossyFactor=e,this._pathTracer.setFilterGlossy(e))}get multipleImportanceSampling(){return this._multipleImportanceSampling}set multipleImportanceSampling(e){this._multipleImportanceSampling!==e&&this.setMultipleImportanceSampling(e)}get clampDirect(){return this._clampDirect}set clampDirect(e){e=Math.max(0,e),this._clampDirect!==e&&(this._clampDirect=e,this._pathTracer.setClamping(e,this._clampIndirect))}get clampIndirect(){return this._clampIndirect}set clampIndirect(e){e=Math.max(0,e),this._clampIndirect!==e&&(this._clampIndirect=e,this._pathTracer.setClamping(this._clampDirect,e))}get target(){return this._pathTracer.outputTarget??null}get fadeState(){return this._fadeState}get lowResTarget(){return this._lowResTarget}get lowResMode(){return this._pathTracer.lowResMode}get compiling(){return this._pathTracer.compiling}get textureAtlas(){return this._bvhData.textureAtlas}useMegakernel(e){const t=this._pathTracer.maxSamples;this._pathTracer.dispose(),this._pathTracer=e?new Rd(this._renderer):new sa(this._renderer),this._pathTracer.maxSamples=t,this._timingCount=0,this._pathTracer.setBVHData(this._bvhData),this._pathTracer.setMaterial(this.material),this._pathTracer.setRandom(this.random),this._pathTracer.setMultipleImportanceSampling(this.multipleImportanceSampling),this._pathTracer.setTransmissiveBackground(this._transmissiveBackground),this._pathTracer.setFilterGlossy(this._filterGlossyFactor),this._pathTracer.setClamping(this._clampDirect,this._clampIndirect),this._pathTracer.setAccumulateAux(!!(this._denoiser&&this._denoiser.useAuxiliaryBuffers)),this.setCamera(this.camera),this._pathTracer.setEnvironment(this._environmentCache.texture),this._pathTracer.setBackground(this._backgroundCache.texture),this.updateEnvironment(),this.updateLights()}constructor(e){super(),this._renderer=e,this._timer=new pl,this._environmentCache=new fa(e,"environment"),this._backgroundCache=new fa(e,"background"),this._resetTime=-1,this._fadeState=0,this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this._size=new G,this._blitQuad=new kt(new Kc),this._timingCount=0,this._frameTimeTotal=0,this._frameTimeCount=0,this._warnedTimestamps=!1,this._fullFrameBudget=null,this._lowResTarget=new qe(1,1),this._lowResTarget.type=bt,this._lowResTarget.generateMipmaps=!1,this._pathTracer=new sa(e),this._denoiser=null,this._upscaler=null,this._onDenoiserProgress=t=>this.dispatchEvent({type:"progress",stage:"denoising",progress:t.progress}),this._stage=ii,this._sceneRequest=0,this._pendingBVHs=new WeakMap,this.minSamples=1,this.renderDelay=16,this.fadeDuration=250,this.dynamicLowRes=!0,this.lowResScale=.1,this.adaptiveDynamicRes=!0,this.adaptiveFrameBudget=!0,this.targetFrameTime=16,this.renderScale=1,this.synchronizeRenderSize=!0,this.renderToCanvas=!0,this.asyncCompile=!1,this.generateMissingAttributes=!0,this.commonAttributes=["normal","tangent"],this.stableNoise=!0,this.pause=!1,this.filterGlossyFactor=1,this._clampDirect=0,this._clampIndirect=10,this.multipleImportanceSampling=!0,this.transmissiveBackground=qs,this.random=ld,this.material=new bf,this._invViewProjectionMatrix=B(new W),this._cameraRayFnHandle=null,this._BVHWorker=null,this._lastCompleteCheck=0,this._wasComplete=!1,this.setMaterial(this.material),this.setRandom(this.random),this.setScene(new ml,new Da)}setMultipleImportanceSampling(e){this._multipleImportanceSampling=e,this._pathTracer.setMultipleImportanceSampling(e),this.reset()}setDenoiser(e){this._denoiser?.reset(),this._denoiser?.removeEventListener("progress",this._onDenoiserProgress),this._denoiser=e,e&&(e.init(this._renderer),e.addEventListener("progress",this._onDenoiserProgress)),this._pathTracer.setAccumulateAux(!!(e&&e.useAuxiliaryBuffers)),this.reset()}setUpscaler(e){this._upscaler=e,e&&e.init(this._renderer)}setScene(e,t){e.updateMatrixWorld(!0),t.updateMatrixWorld(),e.traverse(i=>{this.generateMissingAttributes&&i.geometry?.isBufferGeometry&&af(i.geometry,this.commonAttributes),i.isSkinnedMesh?(i.boundsTree?i.boundsTree.refit():i.boundsTree=new pr(i,{strategy:Ot,targetLeafSize:5,indirect:!0}),i.boundingBox===null&&(i.boundingBox=new ve),i.boundsTree.getBoundingBox(i.boundingBox)):i.isMesh&&(i.geometry.boundsTree||(i.geometry.boundsTree=new gt(i.geometry,da)))});const r=new tf(e);r.update(),r.textureAtlas.setTextures(this._renderer,r.textures),this._bvhData&&(this._bvhData.dispose(),this._bvhData.textureAtlas.dispose()),this.scene=e,this._bvhData=r,this._pathTracer.setBVHData(r),this.setCamera(t),this.updateEnvironment(),this.updateLights()}setBVHWorker(e){this._BVHWorker=e}async setSceneAsync(e,t){const r=this._BVHWorker;if(!r)throw new Error('WebGPUPathTracer: "setBVHWorker" must be called before "setSceneAsync" can be called.');this._sceneRequest++;const i=this._sceneRequest,n=this._pendingBVHs,s=new Set,o=new Set;e.traverse(p=>{if(p.isMesh&&!p.isSkinnedMesh&&!p.geometry.boundsTree){const{geometry:h}=p;if(h.attributes.position.isInterleavedBufferAttribute||h.index&&h.index.isInterleavedBufferAttribute)return;n.has(h)?o.add(n.get(h)):s.add(h)}});const l=Array.from(s),d=p=>(p.index?p.index.count:p.attributes.position.count)/3,c=l.reduce((p,h)=>p+d(h),0);let u=0;const f=[];for(let p=0,h=Math.min(If,l.length);p<h;p++)f.push(new r);this._setStage(ts),this._denoiser?.reset();try{await Promise.all([...o,...f.map(async p=>{for(;l.length>0;){const h=l.shift(),y=d(h);let x=0;const b=v=>{u+=(v-x)*y,x=v,i===this._sceneRequest&&this.dispatchEvent({type:"progress",stage:"building",progress:u/c})},m=_f(p,h,{...da,onProgress:b});n.set(h,m);try{h.boundsTree=await m,b(1)}finally{n.delete(h)}}})])}finally{f.forEach(p=>p.dispose()),i===this._sceneRequest&&this._setStage(rs)}i===this._sceneRequest&&this.setScene(e,t)}getMaterial(){return this.material}setMaterial(e){this.material=e,this._pathTracer.setMaterial(e),this.reset()}setRandom(e){this.random=e,this._pathTracer.setRandom(e),this.reset()}setCamera(e){if(this.camera=e,e.getCameraRayFn)this._cameraRayFnHandle=e.getCameraRayFn();else{const t=this._invViewProjectionMatrix;this._cameraRayFnHandle={update:()=>(e.coordinateSystem=ws,e.updateMatrixWorld(),(e.isOrthographicCamera||e.isPerspectiveCamera)&&e.updateProjectionMatrix(),t.value.multiplyMatrices(e.matrixWorld,e.projectionMatrixInverse),!1),fn:I`
					fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${k}> ) -> bool {

						let ndc = uv * 2.0 - vec2f( 1.0 );
						*ray = ${bi}( ndc, ${t} );
						return true;

					}
				`}}this._bvhData.fns.getCameraRay=this._cameraRayFnHandle.fn,this._cameraRayFnHandle.update(),this._pathTracer.rebuild(),this.reset()}updateMaterials(){const{_bvhData:e,_renderer:t}=this;e.updateMaterials(),e.textureAtlas.setTextures(t,e.textures),this.reset()}updateTransforms(){this.scene.updateMatrixWorld(!0),this._bvhData.updateTransforms(),this.reset()}updateCamera(){const{_cameraRayFnHandle:e,_pathTracer:t}=this;e.update()&&t.rebuild(),this.reset()}updateEnvironment(){const{_pathTracer:e,scene:t,_environmentCache:r,_backgroundCache:i}=this;r.setFromScene(t)&&e.setEnvironment(r.texture),i.setFromScene(t)&&e.setBackground(i.texture),e.setEnvironmentParams(t.environmentIntensity,t.environmentRotation),e.setBackgroundParams(t.backgroundIntensity,t.backgroundRotation,t.backgroundBlurriness),this.reset()}updateLights(){const{_pathTracer:e,scene:t}=this,r=ef(t);e.setLights(r),this.reset()}setSize(e,t){(this._size.x!==e||this._size.y!==t)&&(this._size.set(e,t),this.reset())}reset(){this._pathTracer.reset(),this._denoiser?.reset(),this._resetTime=-1,this._fadeState=0,this._timer.update(),this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this._lastCompleteCheck=0,this._wasComplete=!1,this.stableNoise&&this._pathTracer.resetSeed(),this._fullFrameBudget!==null&&(this.frameBudget=this._fullFrameBudget,this._fullFrameBudget=null)}_setStage(e){this._stage!==e&&(this._stage=e,e===ts?this.dispatchEvent({type:"progress",stage:"building",progress:0}):e===rs?this.dispatchEvent({type:"progress",stage:"compiling",progress:null}):this._dispatchRenderProgress({min:0,max:0,avg:0,samplesPerSecond:0}))}_measureSamples(){const e=this._lastSampleCounts;this.getSampleCountsAsync().then(t=>{if(e===this._lastSampleCounts&&this._stage===ii){const{maxSamples:r}=this;this._fullFrameBudget===null&&r>0&&t.max>=r&&(this._fullFrameBudget=this.frameBudget),this._dispatchRenderProgress(t)}})}_dispatchRenderProgress(e){const{maxSamples:t}=this,r=t>0?Math.min(e.avg/t,1):null;this.dispatchEvent({type:"progress",stage:"rendering",progress:r,samples:e})}_readTiming(){const{timing:e}=this._pathTracer,{trackTimestamp:t}=this._renderer.backend;if(this.adaptiveFrameBudget&&!t&&!this._warnedTimestamps&&(console.warn('WebGPUPathTracer: "adaptiveFrameBudget" needs timestamp queries. Create the renderer with "trackTimestamp: true" on a device that supports them.'),this._warnedTimestamps=!0),e.count===this._timingCount)return;this._timingCount=e.count;const{frameBudget:r}=e;if(!this.adaptiveFrameBudget||r!==this.frameBudget){this._frameTimeTotal=0,this._frameTimeCount=0;return}if(this._frameTimeTotal+=e.frameTime,this._frameTimeCount++,this._frameTimeCount<Sf)return;const{targetFrameTime:i}=this,n=this._frameTimeTotal/this._frameTimeCount;this._frameTimeTotal=0,this._frameTimeCount=0;const s=n/i;if(s<ca&&s>1/ca)return;const o=r*i/n,l=ss.clamp(o,r/ua,r*ua);this.frameBudget=Math.max(Math.round(l),Tf)}renderSample(){const e=this._renderer,t=this._size,r=this._blitQuad,i=this._pathTracer,n=this._lowResTarget,s=this._timer,{renderDelay:o,dynamicLowRes:l,synchronizeRenderSize:d,renderScale:c,adaptiveDynamicRes:u,minSamples:f,maxSamples:p}=this;if(s.update(),!this._renderer._initialized)return;this.material.initialized||(this.material.init(e),this.material.initialized=!0);let h=1e3*s.getDelta();const y=this._resetTime===-1;y&&(this._resetTime=0,h=0),this._resetTime+=h;const x=e.getRenderTarget(),b=e.autoClear;if(d){e.getDrawingBufferSize(Xe);const _=Math.floor(c*Xe.x),P=Math.floor(c*Xe.y);this.setSize(_,P)}let{width:m,height:v}=t;const g=this._resetTime<o||y&&l&&f!==0;if(g){const _=Math.min(Math.sqrt(i.getPreviewPixelBudget()/(m*v)),1);u&&(this.lowResScale=_);const P=Math.min(this.lowResScale,_);m=Math.max(1,Math.floor(P*m)),v=Math.max(1,Math.floor(P*v))}i.getSize(Xe),!g&&i.lowResMode&&l&&(n.setSize(Xe.x,Xe.y),e.copyTextureToTexture(i.outputTarget,n)),(Xe.x!==m||Xe.y!==v)&&i.setSize(m,v);const w=p>0&&this._lastSampleCounts.min>=p;if(!this.pause&&!w&&this._stage>ts&&(!g||g&&l)&&(i.lowResMode=g,i.asyncCompile=this.asyncCompile,i.update(),this._readTiming(),this._setStage(i.compiling?rs:ii)),this._stage<ii){this._resetTime=-1;return}const R=this._denoiser,S=this._upscaler,C=!!R&&!R.complete&&!R.running&&p>0;g||(!w&&this._fadeState<1&&f>0?this._measureSamples():!w&&this._resetTime-this._lastCompleteCheck>=wf&&(this._lastCompleteCheck=this._resetTime,this._measureSamples()),this._lastSampleCounts.avg>=f&&(this._fadeState+=h/this.fadeDuration,this._fadeState=Math.min(1,this._fadeState)||1));const D=g&&l?1:this._fadeState;let T=i.outputTarget;R&&!g&&(C&&this._lastSampleCounts.min>=p&&R.update(i.outputTarget,i.auxTarget),T=R.texture??T),this.renderToCanvas&&(S&&!g&&(T=S.upscale(T,this.camera),e.setRenderTarget(x)),e.autoClear=l?!0:D===1,r.material.transition=l?D:1,r.material.opacity=l?1:D,r.material.fromTexture=n,r.material.texture=T,r.render(e)),e.autoClear=b,e.setRenderTarget(x);const $=this.complete;$&&!this._wasComplete&&this.dispatchEvent({type:"complete"}),this._wasComplete=$}renderDebugBounds(e={}){const{displayTLAS:t=!0,displayBLAS:r=!0,stopAtSurface:i=!1,saturationCount:n=64}=e,s=this._renderer,o=this.camera;if(!s._initialized)return;o.updateMatrixWorld(),(this._debugBoundsQuad===void 0||this._debugBoundsData!==this._bvhData)&&this._buildDebugBoundsQuad();const l=this._debugBoundsUniforms;l.cameraToModelMatrix.value.copy(o.matrixWorld),l.inverseProjectionMatrix.value.copy(o.projectionMatrixInverse),l.displayTLAS.value=t?1:0,l.displayBLAS.value=r?1:0,l.stopAtSurface.value=i?1:0,l.saturationCount.value=n;const d=s.getRenderTarget(),c=s.autoClear,u=s.toneMapping;s.setRenderTarget(null),s.autoClear=!0,s.toneMapping=dr,this._debugBoundsQuad.render(s),s.setRenderTarget(d),s.autoClear=c,s.toneMapping=u}_buildDebugBoundsQuad(){const e=this._bvhData,t=Xc(e),r=new Sr;r.colorNode=t(Tr(Gt())),this._debugBoundsQuad===void 0?this._debugBoundsQuad=new kt(r):(this._debugBoundsQuad.material.dispose(),this._debugBoundsQuad.material=r),this._debugBoundsUniforms=t.uniforms,this._debugBoundsData=e}renderTextureAtlas(e=0){const t=this._renderer;this._atlasDebugQuad||(this._atlasDebugQuad=new kt(new rf));const r=this._atlasDebugQuad;r.material.texture=this.textureAtlas.texture,r.material.layer=e,t.setRenderTarget(null),r.render(t)}renderSampleDensity(){const e=this._renderer;if(!e._initialized)return;this.getSampleCountsAsync(),this._sampleDensityQuad||(this._sampleDensityQuad=new kt(new sf));const t=e.toneMapping;e.toneMapping=dr;const r=this._sampleDensityQuad;r.material.texture=this._pathTracer.sampleCountTarget,r.material.minCount=this._lastSampleCounts.min,r.material.maxCount=this._lastSampleCounts.max,e.setRenderTarget(null),r.render(e),e.toneMapping=t}renderAuxBuffer(e="albedo"){const t=this._renderer,r=this._pathTracer;if(!t._initialized||!r.auxTarget)return;this._auxDebugQuad||(this._auxDebugQuad=new kt(new nf));const i=t.toneMapping;t.toneMapping=dr;const n=this._auxDebugQuad;n.material.texture=r.auxTarget,n.material.showNormal=e==="normal",t.setRenderTarget(null),n.render(t),t.toneMapping=i}dispose(){this._pathTracer.dispose(),this._denoiser?.dispose(),this._upscaler?.dispose(),this._bvhData.dispose(),this._bvhData.textureAtlas.dispose(),this._environmentCache.dispose(),this._backgroundCache.dispose(),this._lowResTarget.dispose(),this._blitQuad.dispose(),this._blitQuad.material.dispose(),this._atlasDebugQuad?.dispose(),this._atlasDebugQuad?.material.dispose(),this._sampleDensityQuad?.dispose(),this._sampleDensityQuad?.material.dispose(),this._auxDebugQuad?.dispose(),this._auxDebugQuad?.material.dispose(),this._debugBoundsQuad!==void 0&&(this._debugBoundsQuad.dispose(),this._debugBoundsQuad.material.dispose())}getRenderTime(){return this._resetTime}}const ha=Math.PI,Rf=yl(([a])=>{const e=a.x.sub(.5),t=Le(1).sub(a.y),r=e.mul(2*ha),i=t.mul(ha),n=Zs(i);return vl(n.mul(Js(r)),Js(i),n.mul(Zs(r)))});class kf{constructor(e){this.renderer=e,this._blur=B(0),this._pmremNode=gl(null,Rf(Gt()),this._blur);const t=new xl;t.colorNode=this._pmremNode,t.toneMapped=!1,this.quad=new Ta(t),this.renderTarget=new Sa(1,1,{type:bt,format:Ce,depthBuffer:!1})}dispose(){this._pmremNode.value=null,this._pmremNode.dispose(),this.quad.material.dispose(),this.renderTarget.dispose()}async generate(e,t=0,r=null,i=null){const{renderTarget:n,quad:s,renderer:o}=this,l=e.clone();r=r??l.image.width,i=i??l.image.height,n.setSize(r,i),n.texture.colorSpace=l.colorSpace,this._pmremNode.value=l,this._blur.value=t;const d=o.getRenderTarget();o.setRenderTarget(n),s.render(o),o.setRenderTarget(d);const c=await o.readRenderTargetPixelsAsync(n,0,0,r,i),u=new Uint16Array(r*i*4);for(let p=0,h=u.length;p<h;p++)u[p]=Be.toHalfFloat(c[p]);const f=new ge(u,r,i,Ce,fe);return f.minFilter=l.minFilter,f.magFilter=l.magFilter,f.wrapS=l.wrapS,f.wrapT=l.wrapT,f.mapping=Ra,f.colorSpace=l.colorSpace,f.needsUpdate=!0,this._pmremNode.value=null,l.dispose(),f}}class Cf extends te{constructor(){const e={auxTarget:de(qt()).toReadOnly(),albedoTarget:de(di()).toWriteOnly(),normalTarget:de(di()).toWriteOnly(),globalId:ae},t=I`
			fn compute( globalId: vec3u ) -> void {

				let dims = textureDimensions( ${e.auxTarget} );
				if ( globalId.x >= dims.x || globalId.y >= dims.y ) {

					return;

				}

				var packed: vec3u;
				for ( var layer = 0u; layer < ${Fe}u; layer ++ ) {

					packed[ layer ] = textureLoad( ${e.auxTarget}, globalId.xy, layer ).r;

				}

				textureStore( ${e.albedoTarget}, globalId.xy, vec4f( ${Bs}( packed ), 1.0 ) );
				textureStore( ${e.normalTarget}, globalId.xy, vec4f( ${As}( packed ), 1.0 ) );

			}
		`;super(t(e)),this.defineUniformAccessors(e)}}class Hf extends Ca{get texture(){return this._texture}get complete(){return this._complete}get running(){return this._running}constructor(e={}){super();const{initUNetFromURL:t,auxWeightsUrl:r,colorWeightsUrl:i,useAuxiliaryBuffers:n=!0,maxTileSize:s=null,dynamicTile:o=null}=e;if(!t)throw new Error('OIDNDenoiser: "initUNetFromURL" from "oidn-webgpu" must be provided.');this.initUNetFromURL=t,this.auxWeightsUrl=r,this.colorWeightsUrl=i,this.useAuxiliaryBuffers=n,this.maxTileSize=s,this.dynamicTile=o,this.renderer=null,this._texture=null,this._running=!1,this._complete=!1,this._abort=null,this._requestId=0,this._failed=!1,this._unets={aux:null,color:null},this._resultPipeline=null,this._rawTexture=null,this._unpackAuxKernel=new Cf().setWorkgroupSize(8,8,1),this._albedoTarget=di("Denoiser Albedo"),this._normalTarget=di("Denoiser Normal")}init(e){this.renderer=e}update(e,t=null){if(this._complete||this._running||this._failed)return this._texture;let r=null,i=null;return this.useAuxiliaryBuffers&&t&&(this._unpackAux(t),r=this._albedoTarget,i=this._normalTarget),this.denoise(e,r,i).catch(n=>{this._failed=!0,this.dispatchEvent({type:"error",error:n})}),this._texture}async denoise(e,t=null,r=null){if(this._complete||this._running)return;this._running=!0;const i=!!(t&&r),n=++this._requestId;let s;try{s=await this._initUNet(i)}catch(f){throw this._running=!1,f}if(n!==this._requestId||!this._running)return;const{renderer:o}=this,l=o.backend;o.initTexture(e);const{width:d,height:c}=e,u={color:{data:l.get(e).texture,width:d,height:c},scheduling:"animation-frame",progress:(f,p,h,y,x)=>{this._copyOutputToTexture(f,d,c),this.dispatchEvent({type:"progress",progress:(y+1)/x})},done:f=>{this._running=!1,this._complete=!0,this._abort=null,this._disposeAuxImages()}};i&&(o.initTexture(t),o.initTexture(r),u.albedo={data:l.get(t).texture,width:d,height:c},u.normal={data:l.get(r).texture,width:d,height:c}),this._abort=s.tileExecute(u)}reset(){this._abort?.(),this._abort=null,this._texture?.dispose(),this._texture=null,this._rawTexture?.destroy(),this._rawTexture=null,this._disposeAuxImages(),this._running=!1,this._complete=!1,this._failed=!1}dispose(){this.reset(),this._unpackAuxKernel.dispose();for(const e in this._unets)this._unets[e]?.then(t=>t.dispose()),this._unets[e]=null}_unpackAux(e){const{renderer:t,_unpackAuxKernel:r,_albedoTarget:i,_normalTarget:n}=this,{width:s,height:o}=e.image;i.setSize(s,o),n.setSize(s,o),r.auxTarget=e,r.albedoTarget=i,r.normalTarget=n,t.compute(r.kernel,r.getDispatchSize(s,o))}_disposeAuxImages(){this._albedoTarget.dispose(),this._normalTarget.dispose()}_initUNet(e){const t=e?"aux":"color";return this._unets[t]||(this._unets[t]=(async()=>{const r=this.renderer.backend.device,i=e?this.auxWeightsUrl:this.colorWeightsUrl;if(!i)throw new Error(`OIDNDenoiser: no ${e?"auxWeightsUrl":"colorWeightsUrl"} was provided.`);const n={aux:e,hdr:!0};return this.maxTileSize!==null&&(n.maxTileSize=this.maxTileSize),this.dynamicTile!==null&&(n.dynamicTile=this.dynamicTile),this.initUNetFromURL(i,{device:r},n)})()),this._unets[t]}_copyOutputToTexture(e,t,r){const i=this.renderer.backend.device;if(!this._resultPipeline){const l=i.createShaderModule({code:`
					@group( 0 ) @binding( 0 ) var<storage, read> src : array<vec4f>;
					@group( 0 ) @binding( 1 ) var dst : texture_storage_2d<rgba16float, write>;

					@compute @workgroup_size( 8, 8 )
					fn main( @builtin( global_invocation_id ) gid : vec3u ) {

						let dims = textureDimensions( dst );
						if ( gid.x >= dims.x || gid.y >= dims.y ) {

							return;

						}

						textureStore( dst, gid.xy, src[ gid.y * dims.x + gid.x ] );

					}
				`});this._resultPipeline=i.createComputePipeline({layout:"auto",compute:{module:l,entryPoint:"main"}})}(!this._rawTexture||this._rawTexture.width!==t||this._rawTexture.height!==r)&&(this._rawTexture?.destroy(),this._rawTexture=i.createTexture({size:[t,r],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this._texture?.dispose(),this._texture=new bl(this._rawTexture),this._texture.image={width:t,height:r});const n=i.createBindGroup({layout:this._resultPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:e.data}},{binding:1,resource:this._rawTexture.createView()}]}),s=i.createCommandEncoder(),o=s.beginComputePass();o.setPipeline(this._resultPipeline),o.setBindGroup(0,n),o.dispatchWorkgroups(Math.ceil(t/8),Math.ceil(r/8)),o.end(),i.queue.submit([s.finish()])}}const or=new G;class Uf{constructor(e={}){const{Upscaler:t,sharpness:r=1}=e;if(!t)throw new Error('FSRUpscaler: the "Upscaler" class from "@pmndrs/upscaler" must be provided.');this.Upscaler=t,this.sharpness=r,this.renderer=null,this._upscaler=null}init(e){this.renderer=e,this._upscaler?.dispose(),this._upscaler=new this.Upscaler({renderer:e}),this._upscaler.init()}upscale(e,t){const{renderer:r,_upscaler:i}=this;return r.initTexture(e),r.getDrawingBufferSize(or),(i.displayWidth!==or.x||i.displayHeight!==or.y||i.renderWidth!==e.width||i.renderHeight!==e.height)&&i.configure({displayWidth:or.x,displayHeight:or.y,renderWidth:e.width,renderHeight:e.height,path:"spatial"}),i.settings.sharpness=this.sharpness,i.dispatch({color:e},t),i.outputTexture}dispose(){this._upscaler?.dispose(),this._upscaler=null}}class Df extends wl{constructor(){super(),this.isEquirectCamera=!0}}Df.prototype.getCameraRayFn=function(){const e=B(new W);return{fn:I`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${k}> ) -> bool {

			// screen uv to spherical direction, matching three.js' equirect orientation
			let theta = ( uv.x - 0.5 ) * 2.0 * ${Ve};
			let phi = ( 1.0 - uv.y ) * ${Ve};
			let sinPhi = sin( phi );
			let direction = vec3f( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

			// equirect ignores the projection - orient by the camera world matrix and place the origin.
			// there is no projection far plane, so the trace distance is unbounded
			ray.origin = ( ${e} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
			ray.direction = ( ${e} * vec4f( direction, 0.0 ) ).xyz;
			ray.maxDist = 0.0;
			return true;

		}
	`,update:()=>(e.value.copy(this.matrixWorld),!1)}};class $f extends Da{set bokehSize(e){this.fStop=this.getFocalLength()/e}get bokehSize(){return this.getFocalLength()/this.fStop}constructor(...e){super(...e),this.fStop=1.4,this.apertureBlades=0,this.apertureRotation=0,this.focusDistance=25,this.anamorphicRatio=1}copy(e,t){return super.copy(e,t),this.fStop=e.fStop,this.apertureBlades=e.apertureBlades,this.apertureRotation=e.apertureRotation,this.focusDistance=e.focusDistance,this.anamorphicRatio=e.anamorphicRatio,this}}const Mf=I`
	fn sampleCircle( uv: vec2f ) -> vec2f {

		let angle = 2.0 * ${Ve} * uv.x;
		let radius = sqrt( uv.y );
		return vec2f( cos( angle ), sin( angle ) ) * radius;

	}
`,Pf=I`
	fn sampleTriangle( a: vec2f, b: vec2f, c: vec2f, rIn: vec2f ) -> vec2f {

		let e1 = a - b;
		let e2 = c - b;

		var r = rIn;
		if ( r.x + r.y > 1.0 ) {

			r = vec2f( 1.0 ) - r;

		}

		return e1 * r.x + e2 * r.y;

	}
`,Bf=I`
	fn sampleRegularPolygon( sidesIn: i32, uvw: vec3f ) -> vec2f {

		let sides = max( sidesIn, 3 );
		let anglePerSegment = 2.0 * ${Ve} / f32( sides );
		let segment = floor( f32( sides ) * uvw.x );

		let angle1 = anglePerSegment * segment;
		let angle2 = angle1 + anglePerSegment;
		let a = vec2f( sin( angle1 ), cos( angle1 ) );
		let b = vec2f( 0.0, 0.0 );
		let c = vec2f( sin( angle2 ), cos( angle2 ) );

		return ${Pf}( a, b, c, uvw.yz );

	}
`,Af=I`
	fn sampleAperture( blades: i32, uvw: vec3f ) -> vec2f {

		if ( blades == 0 ) {

			return ${Mf}( uvw.xy );

		} else {

			return ${Bf}( blades, uvw );

		}

	}
`,Ff=I`
	fn rotateVector( v: vec2f, t: f32 ) -> vec2f {

		let vc = cos( t );
		let vs = sin( t );
		return vec2f( v.x * vc - v.y * vs, v.x * vs + v.y * vc );

	}
`;$f.prototype.getCameraRayFn=function(){const e=B(new W),t=B(new W),r=B(0),i=B(0),n=B(0,"int"),s=B(0),o=B(1);return{fn:I`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${k}> ) -> bool {

			// base ray
			let ndc = uv * 2.0 - vec2f( 1.0 );
			*ray = ${bi}( ndc, ${e} );

			// camera state
			let forward = normalize( ( ${t} * vec4f( 0.0, 0.0, - 1.0, 0.0 ) ).xyz );
			let cameraOrigin = ( ${t} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;

			// depth of field
			// measure focus distance from the camera origin along the optical axis so the focal
			// surface is a flat plane perpendicular to the camera forward vector rather than a sphere
			let focalPoint = cameraOrigin + ray.direction * ( ${r} / dot( ray.direction, forward ) );
			let nearDistance = dot( ray.origin - cameraOrigin, forward );

			// sample the aperture shape
			let shapeUVW = ${Es}( ${au} );
			var apertureSample = ${Af}( ${n}, shapeUVW );
			apertureSample *= ${i} * 0.5 * 1e-3;

			// rotate + squash the sample for anamorphic apertures
			apertureSample =
				${Ff}( apertureSample, ${s} )
				* vec2f( ${o}, 1.0 / ${o} );

			// aim from the aperture through the focal point, starting on the near plane like the base ray
			ray.origin = cameraOrigin + ( ${t} * vec4f( apertureSample, 0.0, 0.0 ) ).xyz;
			ray.direction = normalize( focalPoint - ray.origin );
			ray.origin += ray.direction * ( nearDistance / dot( ray.direction, forward ) );

			return true;

		}
	`,update:()=>(this.coordinateSystem=ws,this.updateMatrixWorld(),this.updateProjectionMatrix(),e.value.multiplyMatrices(this.matrixWorld,this.projectionMatrixInverse),t.value.copy(this.matrixWorld),r.value=this.focusDistance,i.value=this.bokehSize,n.value=this.apertureBlades,s.value=this.apertureRotation,o.value=this.anamorphicRatio,!1)}};Sl.prototype.getCameraRayFn=function(){const e={fn:null,update:null},t=Tl(0),r=li([],"mat4"),i=li([],"vec4");return e.fn=I`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${k}> ) -> bool {

			let pixel = uv * resolution;

			for ( var i = 0u; i < ${t}u; i ++ ) {

				let viewport = ${i}[ i ];
				let viewportMax = viewport.xy + viewport.zw;
				if ( all( pixel >= viewport.xy ) && all( pixel < viewportMax ) ) {

					let cameraUv = ( pixel - viewport.xy ) / viewport.zw;
					let ndc = cameraUv * 2.0 - vec2f( 1.0 );
					*ray = ${bi}( ndc, ${r}[ i ] );
					return true;

				}

			}

			return false;

		}
	`,e.update=()=>{const{cameras:n}=this,s=t.node.value!==n.length;for(t.node.value=n.length;i.array.length<n.length;)i.array.push(new pt),r.array.push(new W);r.array.length=n.length,i.array.length=n.length;for(let o=0;o<n.length;o++){const l=n[o],d=l.viewport;l.coordinateSystem=ws,l.updateMatrixWorld(),l.updateProjectionMatrix(),r.array[o].multiplyMatrices(l.matrixWorld,l.projectionMatrixInverse),i.array[o].copy(d)}return s},e};export{kf as BlurredEnvMapGenerator,Uf as FSRUpscaler,Hf as OIDNDenoiser,zf as RANDOM_BLUE_DITHER,Lf as RANDOM_PCG,ld as RANDOM_SOBOL,Kc as RenderToScreenNodeMaterial,cd as SAMPLE_ACTIVE_FLAG,vr as SAMPLE_COUNT_MASK,Qs as SAMPLE_DISPATCHED_FLAG,Po as TRANSMISSIVE_BACKGROUND_ENVIRONMENT,qs as TRANSMISSIVE_BACKGROUND_OVERLAY,Bo as TRANSMISSIVE_BACKGROUND_TRANSPARENT,Ef as WebGPUPathTracer};
