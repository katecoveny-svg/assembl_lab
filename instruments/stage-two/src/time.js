export function timeSculpture({
  T,
  $,
  scene,
  renderer,
  range,
  button,
  snapshot,
}) {
  renderer.setClearColor("#202747");
  renderer.setPixelRatio(Math.min(devicePixelRatio, 0.65));
  $("intro").textContent =
    "A little movement, held in space. Turn time over in your hands.";
  $("note").textContent =
    "64 moments. One sculpture. Made here, on your device.";
  $("medium").textContent = "TEMPORAL VOLUME / 128 × 128 × 64";
  $("hint").textContent = "Drag to orbit · pinch or scroll to zoom";
  $("explanation").textContent =
    "An original moving orb and ribbon are generated locally into 64 frames. Each frame occupies a different depth of a Data3DTexture. An original raymarching shader samples through that 3D volume and composites coloured density. Orbit reveals temporal depth, Time chooses the centre of a slice, Slice depth changes its thickness, and Background threshold removes dim voxels. The RGBA stack occupies exactly 4 MiB in JavaScript plus approximately 4 MiB on the GPU; driver, framebuffer and browser overhead are additional. No personal files are loaded.";
  let state = { time: 0.5, depth: 1, threshold: 0.12, shape: 0 },
    texture,
    phase = 0;
  const uniforms = {
    volume: { value: null },
    cut: { value: 0.5 },
    depth: { value: 1 },
    threshold: { value: 0.12 },
  };
  function generate() {
    const n = 128,
      d = 64,
      data = new Uint8Array(n * n * d * 4);
    for (let z = 0; z < d; z++) {
      const t = (z / (d - 1)) * Math.PI * 2,
        cx = 0.5 + 0.24 * Math.sin(t),
        cy = 0.5 + 0.22 * Math.cos(t * (state.shape ? 2 : 1));
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const u = x / (n - 1),
            v = y / (n - 1),
            orb = Math.exp(-((u - cx) ** 2 + (v - cy) ** 2) / 0.004),
            curve = 0.5 + 0.22 * Math.sin(u * 7 + t * (state.shape ? 2 : 1)),
            ribbon =
              Math.exp(-(((v - curve) / 0.028) ** 2)) *
              Math.sin(u * Math.PI) ** 2,
            density = Math.max(orb, ribbon * 0.7),
            i = ((z * n + y) * n + x) * 4;
          data[i] = Math.round(90 + 150 * (0.5 + 0.5 * Math.sin(t + u * 2)));
          data[i + 1] = Math.round(110 + 90 * (0.5 + 0.5 * Math.cos(t + 1)));
          data[i + 2] = Math.round(155 + 70 * (0.5 + 0.5 * Math.sin(t + 3)));
          data[i + 3] = Math.round(density * 255);
        }
    }
    const next = new T.Data3DTexture(data, n, n, d);
    next.format = T.RGBAFormat;
    next.type = T.UnsignedByteType;
    next.minFilter = next.magFilter = T.LinearFilter;
    next.unpackAlignment = 1;
    next.needsUpdate = true;
    texture?.dispose();
    texture = next;
    uniforms.volume.value = next;
    $("metrics").textContent =
      `${(data.byteLength / 1048576).toFixed(1)} MiB RAW · 64 FRAMES`;
  }
  generate();
  const mat = new T.ShaderMaterial({
    glslVersion: T.GLSL3,
    side: T.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `out vec3 localPosition; out vec3 eye; void main(){eye=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;localPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float;
 precision highp sampler3D;
 uniform sampler3D volume;uniform float cut;uniform float depth;uniform float threshold;
 in vec3 localPosition; in vec3 eye;
 out vec4 fragColor;
 #define gl_FragColor fragColor
 void main(){
 vec3 ray=normalize(localPosition-eye);
 vec3 inv=1./ray;vec3 a=(-.5-eye)*inv;vec3 b=(.5-eye)*inv;
 vec3 lo=min(a,b),hi=max(a,b);float nearT=max(max(lo.x,lo.y),lo.z);float farT=min(min(hi.x,hi.y),hi.z);
 if(nearT>farT)discard;nearT=max(nearT,0.);
 vec4 sum=vec4(0.);float delta=(farT-nearT)/96.;
 for(int i=0;i<96;i++){vec3 p=eye+ray*(nearT+(float(i)+.5)*delta)+.5;
 if(abs(p.z-cut)>depth*.5)continue;
 vec4 v=texture(volume,p);float density=max(v.a-threshold,0.);float opacity=1.-exp(-density*delta*65.);
 vec3 colour=v.rgb*(.78+.3*p.y);sum.rgb+=(1.-sum.a)*colour*opacity;sum.a+=(1.-sum.a)*opacity;if(sum.a>.985)break;}
 if(sum.a<.005)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
  });
  const volume = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat);
  volume.scale.set(3.1, 3.1, 3.7);
  scene.add(volume);
  const edges = new T.LineSegments(
    new T.EdgesGeometry(new T.BoxGeometry(3.12, 3.12, 3.72)),
    new T.LineBasicMaterial({
      color: 0xb9b5c8,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(edges);
  const sync = () => {
    uniforms.cut.value = state.time;
    uniforms.depth.value = state.depth;
    uniforms.threshold.value = state.threshold;
  };
  const timeUI = range("Time", 0, 1, 0.01, state.time, (v) => {
      state.time = v;
      sync();
    }),
    depthUI = range("Slice depth", 0.02, 1, 0.01, state.depth, (v) => {
      state.depth = v;
      sync();
    }),
    thresholdUI = range(
      "Background threshold",
      0,
      0.85,
      0.01,
      state.threshold,
      (v) => {
        state.threshold = v;
        sync();
      },
    );
  button("Another motion", () => {
    snapshot();
    state.shape = 1 - state.shape;
    generate();
  });
  let sweeping = false;
  const sweep = button("▶ Sweep through time", () => {
    sweeping = !sweeping;
    if (sweeping) {
      snapshot();
      state.depth = 0.18;
      depthUI(0.18);
    }
    sweep.textContent = sweeping ? "Ⅱ Stop sweep" : "▶ Sweep through time";
  });
  function setState(s) {
    sweeping = false;
    sweep.textContent = "▶ Sweep through time";
    const regenerate = state.shape !== s.shape;
    state = { ...s };
    timeUI(state.time);
    depthUI(state.depth);
    thresholdUI(state.threshold);
    sync();
    if (regenerate) generate();
  }
  return {
    isAnimating: () => sweeping,
    getState: () => ({ ...state }),
    setState,
    reset() {
      sweeping = false;
      sweep.textContent = "▶ Sweep through time";
      phase = 0;
      setState({ time: 0.5, depth: 1, threshold: 0.12, shape: 0 });
    },
    update(dt) {
      if (sweeping) {
        phase += dt * 0.5;
        state.time = 0.5 + 0.48 * Math.sin(phase);
        timeUI(state.time);
        sync();
      }
    },
    dispose() {
      texture.dispose();
    },
  };
}
