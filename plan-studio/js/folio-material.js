// A presentation-only drawing board, lazy-loaded with the inspect camera.
// World-space ruled paper: one metre per small interval, five per major interval.
// Derivative filtering keeps fine lines from shimmering on small screens.
import * as T from "three";

export function folioBoard() {
  return new T.ShaderMaterial({
    toneMapped: false,
    uniforms: {
      paper: {value: new T.Color("#f5eced")},
      rose: {value: new T.Color("#e3d0d2")},
      ink: {value: new T.Color("#654a4e")}
    },
    vertexShader: `
      varying vec2 point;
      void main() {
        vec4 world = modelMatrix * vec4(position,1.);
        point = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 paper, rose, ink;
      varying vec2 point;
      float ruled(vec2 p,vec2 width) {
        vec2 f = abs(fract(p+.5)-.5) / max(fwidth(p),vec2(.0001));
        vec2 a = 1.-smoothstep(vec2(.14),width,f);
        return max(a.x,a.y);
      }
      void main() {
        float wash = smoothstep(-65.,50.,point.x-point.y);
        vec3 base = mix(paper,rose,wash*.34);
        float single = ruled(point,vec2(.74));
        float major = ruled(point*.2,vec2(.84));
        float coarse = 1.-smoothstep(.18,.6,max(fwidth(point.x),fwidth(point.y)));
        gl_FragColor = vec4(mix(base,ink,max(.075*single*coarse,.19*major)),1.);
        #include <colorspace_fragment>
      }
    `
  });
}
