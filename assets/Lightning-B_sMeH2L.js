import{a as e,i as t,o as n}from"./index-NUQzCT7m.js";var r=n(e(),1),i=t(),a=4,o=4,s=.11,c=1.3,l=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,u=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPhase;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uSize;
uniform float uThickness;
uniform float uGlow;
uniform float uFlicker;
uniform float uBranches;
uniform float uXOffset;
uniform float uAngle;
uniform float uSpread;
uniform int uBolts;
uniform vec4 uPointer;
uniform vec4 uStrikes[${o}];
uniform vec4 uStrikeInfo[${o}];
uniform float uFlash;
uniform float uIntro;
uniform float uLight;
uniform float uFade;
uniform float uOpacity;

out vec4 outColor;

const float TAU = 6.28318530718;
const float PERIOD = 8.0;
const float WARP = 2.1;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float gnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(mod(i, period)), f);
  float b = dot(hash22(mod(i + vec2(1.0, 0.0), period)), f - vec2(1.0, 0.0));
  float c = dot(hash22(mod(i + vec2(0.0, 1.0), period)), f - vec2(0.0, 1.0));
  float d = dot(hash22(mod(i + vec2(1.0, 1.0), period)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * gnoise(p, period);
    p = p * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float warpField(vec2 q, float base, float reach, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float weight = 1.0;
    if (i >= 3) {
      float estimate = abs(base + value * WARP);
      weight = 1.0 - smoothstep(reach * 0.6, reach, estimate);
      if (weight <= 0.0) break;
      reach *= 0.62;
    }
    value += amplitude * gnoise(q, period) * weight;
    q = q * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value * WARP;
}

float flicker(float seed) {
  float steady = 0.82 + 0.18 * sin(TAU * (uPhase * 13.0 + seed)) * sin(TAU * (uPhase * 7.0 + seed * 1.7));
  float burst = 0.0;
  for (int j = 0; j < 3; j++) {
    float at = hash11(seed * 17.0 + float(j) * 5.3);
    float since = fract(uPhase - at) * 10.0;
    burst += exp(-since * 7.0) * (0.75 + 0.45 * sin(since * 70.0));
  }
  return mix(1.0, steady + burst * 0.9, uFlicker);
}

float glow(float d, float width) {
  float reach = d / (width * 3.5);
  return width / (d + width * 0.08) / (1.0 + reach * reach);
}

vec2 gDrift;
float gWidth;
float gCore;
float gPixel;

vec3 bolt(
  vec2 p,
  vec2 offset,
  float seed,
  float pinned,
  float front,
  float strength,
  float branches,
  float blink,
  float branchGain,
  vec2 range,
  float heat,
  int octaves
) {
  vec2 q = p * uSize + gDrift + offset;
  float pin = pinned > 0.5 ? fbm(gDrift + offset, octaves) * WARP : 0.0;
  float warp = warpField(q, p.x - pin, 1.3 * max(1.0, uGlow), octaves) - pin;
  float crackle = heat > 0.001 ? heat * 0.012 * gnoise(q * 9.0 + vec2(41.0, 7.0), PERIOD * 9.0) : 0.0;
  float x = p.x + warp + crackle;
  float d = length(vec2(x, max(front - p.y, 0.0)));
  float energy = glow(d, gWidth * (1.0 + heat * 0.6)) * strength;
  float core = (1.0 - smoothstep(gCore - gPixel, gCore + gPixel, d)) * min(strength, 1.6);
  float line = glow(d, gWidth * 0.55) * strength;

  for (int k = 0; k < 6; k++) {
    float order = float(k) + 0.5;
    if (order > branches + heat * 2.0) break;
    float h = seed * 31.0 + float(k) * 13.7;
    float start = mix(range.x, range.y, hash11(h));
    float span = mix(0.22, 0.7, hash11(h + 3.0));
    if (pinned > 0.5) span = min(span, max(start - 0.04, 0.06));
    float along = (start - p.y) / span;
    if (along <= 0.0 || along >= 1.0) continue;
    float side = hash11(h + 1.0) > 0.5 ? 1.0 : -1.0;
    float slope = mix(0.35, 1.15, hash11(h + 2.0));
    float offset = x - side * slope * (start - p.y);
    if (abs(offset) - 0.12 * along > gWidth * 13.0) continue;
    float gain = branchGain;
    if (blink > 0.5) {
      float window = fract(uPhase * 3.0 + hash11(h + 4.0));
      float shown = smoothstep(0.0, 0.03, window) * (1.0 - smoothstep(0.3, 0.42, window));
      gain *= max(shown, heat * 0.8);
      if (gain <= 0.001) continue;
      gain *= flicker(seed + order);
    }
    if (gain <= 0.001) continue;
    vec2 jq = q * 3.0 + vec2(order * 11.0, order * 5.0);
    float jag = (gnoise(jq, PERIOD * 3.0) * 0.12 + gnoise(jq * 3.0 + vec2(5.0, 9.0), PERIOD * 9.0) * 0.035) * along;
    float bd = abs(offset - jag);
    float taper = pow(1.0 - along, 1.6) * smoothstep(0.0, 0.2, along) * smoothstep(front, front + 0.08, p.y);
    energy += glow(bd, gWidth * 0.4) * taper * gain;
    line += glow(bd, gWidth * 0.2) * taper * gain;
    core += (1.0 - smoothstep(gCore * 0.6 - gPixel, gCore * 0.6 + gPixel, bd)) * taper * min(gain, 1.0) * 0.8;
  }
  return vec3(energy, core, line);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  gPixel = 2.0 / uResolution.y;
  gDrift = vec2(PERIOD) * uPhase;
  gWidth = 0.07 * uGlow;
  gCore = 0.0032 * uThickness;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  mat2 turn = mat2(ca, -sa, sa, ca);
  vec2 local = turn * uv;
  vec2 pointer = turn * uPointer.xy;
  vec2 toPointer = uv - uPointer.xy;
  float heat = uPointer.z * exp(-dot(toPointer, toPointer) / 0.09);
  int octaves = uResolution.y > 1400.0 ? 8 : 7;

  float energy = 0.0;
  float core = 0.0;
  float line = 0.0;

  for (int b = 0; b < ${a}; b++) {
    if (b >= uBolts) break;
    float seed = float(b) * 7.13 + 0.37;
    float lane = uXOffset + (float(b) - 0.5 * float(uBolts - 1)) * uSpread;
    vec2 p = local - vec2(lane, 0.0);
    float near = exp(-pow(pointer.x - lane, 2.0) / 0.5);
    float lean = uPointer.z * uPointer.w * near * exp(-pow(p.y - pointer.y, 2.0) / 0.14);
    p.x -= lean * clamp(pointer.x - lane, -0.45, 0.45) * 0.55;
    float reveal = uIntro >= 1.0 ? 1.0 : smoothstep(0.0, 0.08, uv.y - (1.1 - 2.4 * uIntro));
    float strength = flicker(seed) * reveal * (1.0 + heat * 1.4) * (1.0 + uFlash);
    vec3 hit = bolt(
      p,
      vec2(float(b) * 3.0, float(b) * 5.0),
      seed,
      0.0,
      -1000.0,
      strength,
      uBranches * 6.0,
      1.0,
      reveal,
      vec2(-0.75, 0.9),
      heat,
      octaves
    );
    energy += hit.x;
    core += hit.y;
    line += hit.z;
  }

  for (int j = 0; j < ${o}; j++) {
    vec4 strike = uStrikes[j];
    if (strike.w <= 0.001) continue;
    vec4 info = uStrikeInfo[j];
    vec2 p = local - turn * strike.xy;
    if (p.y < strike.z - 1.6) continue;
    vec3 hit = bolt(
      p,
      vec2(info.x * 0.731, info.x * 1.377),
      info.x,
      1.0,
      strike.z,
      strike.w,
      uBranches * 6.0,
      0.0,
      strike.w,
      vec2(0.12, info.y),
      heat,
      octaves
    );
    energy += hit.x + info.z * strike.w * glow(length(p), gWidth * 0.5) * 0.12;
    core += hit.y;
    line += hit.z;
  }

  float e = energy * uIntensity * 0.6;
  float hot = clamp(core + smoothstep(6.0, 20.0, e) * 0.55, 0.0, 1.0);
  vec2 edge = min(gl_FragCoord.xy, uResolution - gl_FragCoord.xy) / (uResolution.y * max(uFade, 0.0001) * 0.5);
  float fade = uFade > 0.0 ? smoothstep(0.0, 1.0, edge.x) * smoothstep(0.0, 1.0, edge.y) : 1.0;

  vec3 rgb;
  float alpha;
  if (uLight > 0.5) {
    float stroke = smoothstep(1.0, 3.6, line * uIntensity);
    float halo = 1.0 - exp(-e * 0.35);
    vec3 ink = uColor * 0.82;
    alpha = clamp(stroke + halo * 0.15, 0.0, 1.0);
    rgb = mix(ink, vec3(1.0), hot * 0.85) * alpha;
  } else {
    vec3 lit = 1.0 - exp(-uColor * e * 0.9);
    rgb = mix(lit, vec3(1.0), hot);
    alpha = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);
  }
  float keep = fade * uOpacity;
  outColor = vec4(rgb * keep, alpha * keep);
}
`,d=e=>{let t=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(e).trim());if(!t)return[.5,.6,1];let n=t[1].length===3?t[1].replace(/./g,e=>e+e):t[1];return[0,2,4].map(e=>parseInt(n.slice(e,e+2),16)/255)},f=e=>{let t=Math.min(1,Math.max(0,e));return t*t*t*(t*(t*6-15)+10)},p=(e,t,n)=>{let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r},m=[`uResolution`,`uPhase`,`uColor`,`uIntensity`,`uSize`,`uThickness`,`uGlow`,`uFlicker`,`uBranches`,`uXOffset`,`uAngle`,`uSpread`,`uBolts`,`uPointer`,`uStrikes`,`uStrikeInfo`,`uFlash`,`uIntro`,`uLight`,`uFade`,`uOpacity`],h=({color:e=`#4d6bff`,bolts:t=1,spread:n=.6,branches:h=.5,xOffset:g=0,angle:_=0,size:v=1,thickness:y=1,glow:b=1,intensity:x=1,speed:S=1,flicker:C=.6,mouseInteraction:w=!0,mouseStrength:T=1,clickStrike:E=!0,intro:D=!0,fade:O=0,opacity:k=1,lightMode:A=!1,paused:j=!1,dpr:M,className:N=``,style:P})=>{let F=(0,r.useRef)(null),I=(0,r.useRef)(null),L={color:e,bolts:t,spread:n,branches:h,xOffset:g,angle:_,size:v,thickness:y,glow:b,intensity:x,speed:S,flicker:C,mouseInteraction:w,mouseStrength:T,clickStrike:E,intro:D,fade:O,opacity:k,lightMode:A,paused:j,dpr:M},R=(0,r.useRef)(L);return R.current=L,(0,r.useEffect)(()=>{let e=F.current;if(!e)return;let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!t)return;let n=t.createProgram();if(t.attachShader(n,p(t,t.VERTEX_SHADER,l)),t.attachShader(n,p(t,t.FRAGMENT_SHADER,u)),t.linkProgram(n),!t.getProgramParameter(n,t.LINK_STATUS))return;let r=Object.fromEntries(m.map(e=>[e,t.getUniformLocation(n,e)])),i=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,i),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);let h=t.getAttribLocation(n,`aPosition`),g=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,_={width:1,height:1,left:0,top:0},v={x:0,y:0,vx:0,vy:0,tx:0,ty:0,presence:0,inside:!1},y=Array.from({length:o},()=>({x:0,y:0,born:-1,seed:0,reach:2})),b=new Float32Array(16),x=new Float32Array(16),S=0,C=.21,w=R.current.intro&&!g?-1:null,T=!0,E=0,D=0,O=!1,k=()=>{let t=e.getBoundingClientRect(),n=Math.min(R.current.dpr??window.devicePixelRatio??1,2);_.width=Math.max(1,t.width),_.height=Math.max(1,t.height),_.left=t.left,_.top=t.top;let r=Math.max(1,Math.round(_.width*n)),i=Math.max(1,Math.round(_.height*n));(e.width!==r||e.height!==i)&&(e.width=r,e.height=i)},A=(e,t)=>[(2*e-_.width)/_.height,(_.height-2*t)/_.height],j=l=>{let u=R.current,p=d(u.color),m=0;for(let e=0;e<o;e++){let t=y[e],n=t.born<0?-1:(l-t.born)/1e3,r=e*4;if(n<0||n>c){b.fill(0,r,r+4),x.fill(0,r,r+4);continue}let i=Math.min(1,n/s),a=n-s,o=.45+.35*i;a>=0&&(o=1.8*Math.exp(-a*5.5)*(.85+.2*Math.sin(a*70)),a>.17&&(o+=Math.exp(-(a-.17)*9)),a>.33&&(o+=.7*Math.exp(-(a-.33)*10)),m+=.5*Math.exp(-a*9),a>.17&&(m+=.25*Math.exp(-(a-.17)*12))),o*=1-f((n-.9)/.4),b[r]=t.x,b[r+1]=t.y,b[r+2]=t.reach*(1-i**1.6),b[r+3]=o,x[r]=t.seed,x[r+1]=t.reach,x[r+2]=+(a>=0),x[r+3]=0}let _=w===null?1:w<0?0:Math.min(1,(l-w)/420),[S,T]=A(v.x,v.y);t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(n),t.bindBuffer(t.ARRAY_BUFFER,i),t.enableVertexAttribArray(h),t.vertexAttribPointer(h,2,t.FLOAT,!1,0,0),t.uniform2f(r.uResolution,e.width,e.height),t.uniform1f(r.uPhase,C),t.uniform3f(r.uColor,p[0],p[1],p[2]),t.uniform1f(r.uIntensity,Math.max(0,u.intensity)),t.uniform1f(r.uSize,Math.max(.05,u.size)),t.uniform1f(r.uThickness,Math.max(0,u.thickness)),t.uniform1f(r.uGlow,Math.max(.01,u.glow)),t.uniform1f(r.uFlicker,g?0:Math.min(1,Math.max(0,u.flicker))),t.uniform1f(r.uBranches,Math.min(1,Math.max(0,u.branches))),t.uniform1f(r.uXOffset,u.xOffset),t.uniform1f(r.uAngle,u.angle*Math.PI/180),t.uniform1f(r.uSpread,u.spread),t.uniform1i(r.uBolts,Math.min(a,Math.max(1,Math.round(u.bolts)))),t.uniform4f(r.uPointer,S,T,v.presence,Math.max(0,u.mouseStrength)),t.uniform4fv(r.uStrikes,b),t.uniform4fv(r.uStrikeInfo,x),t.uniform1f(r.uFlash,Math.min(1,m)),t.uniform1f(r.uIntro,_),t.uniform1f(r.uLight,+!!u.lightMode),t.uniform1f(r.uFade,Math.min(1,Math.max(0,u.fade))),t.uniform1f(r.uOpacity,Math.min(1,Math.max(0,u.opacity))),t.drawArrays(t.TRIANGLE_STRIP,0,4)},M=e=>{if(E=0,O||!T||document.hidden)return;let t=R.current,n=Math.min(.05,(e-D)/1e3||0);D=e,w!==null&&w<0&&(w=e),!t.paused&&!g&&(C=(C+n*Math.max(0,t.speed)/10)%1);let r=Math.max(1,Math.ceil(n/(1/120))),i=n/r;for(let e=0;e<r;e++)v.vx+=(120*(v.tx-v.x)-19*v.vx)*i,v.vy+=(120*(v.ty-v.y)-19*v.vy)*i,v.x+=v.vx*i,v.y+=v.vy*i;let a=t.mouseInteraction&&v.inside&&!g?1:0;v.presence+=(a-v.presence)*(1-Math.exp(-n/(a>v.presence?.3:.55))),j(e);let o=y.some(t=>t.born>=0&&e-t.born<1350),s=w!==null&&e-w<450,c=!t.paused&&!g&&t.speed>0,l=Math.abs(a-v.presence)>.002||Math.abs(v.vx)+Math.abs(v.vy)>.5;(c||o||s||l)&&(E=requestAnimationFrame(M))},N=()=>{E||O||!T||document.hidden||(D=performance.now(),E=requestAnimationFrame(M))},P=t=>{let n=e.getBoundingClientRect(),r=t.clientX-n.left,i=t.clientY-n.top;return[r,i,r>=0&&i>=0&&r<=n.width&&i<=n.height]},L=e=>{let[t,n,r]=P(e);r&&!v.inside&&v.presence<.02&&(v.x=t,v.y=n,v.vx=v.vy=0),v.tx=t,v.ty=n,v.inside=r,R.current.mouseInteraction&&N()},z=e=>{e.relatedTarget||(v.inside=!1,N())},B=e=>{if(!R.current.clickStrike||g)return;let[t,n,r]=P(e);if(!r)return;let[i,a]=A(t,n),s=R.current.angle*Math.PI/180,c=Math.sin(s),l=Math.cos(s),u=_.width/_.height*Math.abs(c)+Math.abs(l),d=y[S];S=(S+1)%o,d.x=i,d.y=a,d.reach=u-(-c*i+l*a)+.2,d.born=performance.now(),d.seed=Math.random()*100,N()};window.addEventListener(`pointermove`,L,{passive:!0}),window.addEventListener(`pointerdown`,B,{passive:!0}),window.addEventListener(`pointerout`,z);let V=new ResizeObserver(()=>{k(),j(performance.now()),N()});V.observe(e);let H=new IntersectionObserver(([e])=>{T=e.isIntersecting,T&&N()});H.observe(e);let U=()=>{document.hidden||N()};return document.addEventListener(`visibilitychange`,U),k(),j(performance.now()),N(),I.current={refresh:()=>{k(),j(performance.now()),N()}},()=>{O=!0,cancelAnimationFrame(E),V.disconnect(),H.disconnect(),window.removeEventListener(`pointermove`,L),window.removeEventListener(`pointerdown`,B),window.removeEventListener(`pointerout`,z),document.removeEventListener(`visibilitychange`,U),t.deleteBuffer(i),t.deleteProgram(n),I.current=null}},[]),(0,r.useEffect)(()=>{I.current?.refresh()},[e,t,n,h,g,_,v,y,b,x,S,C,O,k,A,j,M]),(0,i.jsx)(`canvas`,{ref:F,className:`lightning-container ${N}`.trim(),style:P})};export{h as default};