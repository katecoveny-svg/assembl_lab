import {createLiquidCanvas} from './liquid-canvas.js';
// Seeded, domain-warped pigment field. A procedural marbling artwork, not a fluid solver.
const vertex=`attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 vUv; uniform vec2 resolution; uniform float time,seed,energy,tone; uniform vec4 touches[8];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+seed*.71)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(.8,.6,-.6,.8)*p*2.03+2.7;a*=.36;}return v;}
vec3 pigment(float k){
 vec3 navy=vec3(.10,.13,.31),lilac=vec3(.65,.52,.84),cream=vec3(1.,.90,.76),coral=vec3(.98,.46,.43),mint=vec3(.52,.77,.70);
 if(tone>2.5){navy=vec3(.12,.17,.35);coral=vec3(.43,.52,.78);}
 else if(tone>1.5){coral=mint; lilac=vec3(.45,.69,.68);}else if(tone>.5){coral=vec3(.80,.58,.86);mint=vec3(.66,.70,.88);}
 k=fract(k);vec3 c;
 if(k<.23)c=mix(navy,lilac,smoothstep(.10,.23,k));
 else if(k<.38)c=mix(lilac,cream,smoothstep(.23,.38,k));
 else if(k<.57)c=mix(cream,coral,smoothstep(.38,.47,k));
 else if(k<.69)c=mix(coral,cream,smoothstep(.57,.69,k));
 else if(k<.83)c=mix(cream,mint,smoothstep(.69,.78,k));
 else c=mix(mint,navy,smoothstep(.83,1.,k));return c;
}
void main(){
 vec2 uv=vUv;vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.)*1.95;
 p.x+=seed*.019; p.y+=seed*.007;
 for(int i=0;i<8;i++){vec2 d=uv-touches[i].xy;d.x*=resolution.x/resolution.y;float force=touches[i].z*exp(-dot(d,d)*12.);float a=force*4.;p+=vec2(-d.y,d.x)*a;}
 float tm=time*.026*(.3+energy);
 vec2 q=vec2(fbm(p+tm),fbm(p+vec2(5.2,1.3)-tm));
 vec2 r=vec2(fbm(p+3.8*q+vec2(1.7,9.2)+tm),fbm(p+3.6*q+vec2(8.3,2.8)-tm*.7));
 vec2 w=p+2.4*r+1.0*q;
 float flow=fbm(w*.55)+.22*w.y+.12*sin(w.x*1.7);
 float grain=fbm(w*24.);
 vec3 c=pigment(flow*1.2);
 // Fine folded pigment veins, not a blurred background.
 float thread=sin(flow*230.+fbm(w*7.)*4.);float fine=sin(flow*650.+grain*6.);
 c*=.88+.15*thread*.5+.11*grain;
 c=mix(c,vec3(1.,.93,.83),pow(max(0.,thread),22.)*.19);
 c+=pow(max(0.,fine),28.)*.10;
 float streak=sin(flow*95.+grain*.45);
 c=mix(c,vec3(1.,.86,.75),pow(max(0.,streak),45.)*.18);
 c+=(hash(gl_FragCoord.xy)-.5)*.025;
 gl_FragColor=vec4(c,1.);
}`;
export function createLiquid(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
 if(!gl)return createLiquidCanvas(canvas);
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const program=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const uniforms=Object.fromEntries(['resolution','time','seed','energy','tone','touches'].map(k=>[k,gl.getUniformLocation(program,k)]));let marks=new Float32Array(32),cursor=0;
 return {resize(w,h,dpr=1){canvas.width=Math.round(w*Math.min(dpr,1.6));canvas.height=Math.round(h*Math.min(dpr,1.6));gl.viewport(0,0,canvas.width,canvas.height);},render(time,s){gl.useProgram(program);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.seed,s.seed||42);gl.uniform1f(uniforms.energy,s.energy??.5);gl.uniform1f(uniforms.tone,s.tone||0);gl.uniform4fv(uniforms.touches,marks);gl.drawArrays(gl.TRIANGLES,0,6);},interact(x,y,dx=0,dy=0){const i=(cursor++%8)*4;marks[i]=x;marks[i+1]=1-y;marks[i+2]=.45+Math.min(1,Math.hypot(dx,dy)*12);},reset(){marks.fill(0);cursor=0;},dispose(){gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.deleteBuffer(buffer);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
