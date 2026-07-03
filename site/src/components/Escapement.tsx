"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The signature: a working escapement + gear train drawn in thin copper line,
 * rendered by a single fragment shader. The escape wheel advances one tooth
 * per second; the pallet fork rocks; the balance wheel breathes; a second
 * hand on the chapter ring is geared to the same tick. Chaos in, calm out.
 *
 * Perf: one full-screen quad, ~20 cheap SDFs, DPR capped at 2, pauses when
 * off-screen or hidden. Fallbacks: static SVG for reduced-motion / no-WebGL.
 */

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uAlpha;

const float PI = 3.141592653589793;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// GLSL ES 1.00 has no tanh
float th(float x){ float e = exp(2.0 * clamp(x, -8.0, 8.0)); return (e - 1.0) / (e + 1.0); }

float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float stroke(float d, float w, float aa){
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

void over(inout vec4 acc, vec3 col, float a){
  acc.rgb = mix(acc.rgb, col, a);
  acc.a = a + acc.a * (1.0 - a);
}

void main(){
  float mn = min(uRes.x, uRes.y);
  vec2 p = (2.0 * gl_FragCoord.xy - uRes) / mn;
  p *= 1.18;            // zoom out so the full chapter ring reads as a dial
  p.y -= 0.03;
  float aa = 3.55 / mn; // keep stroke AA consistent with the zoom

  // ---- shared timing: one eased tooth-advance per second, tiny overshoot ----
  float f = fract(uTime);
  float e = clamp(f / 0.24, 0.0, 1.0);
  float c1 = 1.34; float c3 = c1 + 1.0;
  float em1 = e - 1.0;
  float eb = 1.0 + c3 * em1 * em1 * em1 + c1 * em1 * em1;
  float adv = floor(uTime) + eb;

  vec3 COPPER = vec3(0.831, 0.345, 0.165);
  vec3 INK    = vec3(0.102, 0.098, 0.086);
  vec3 PATINA = vec3(0.235, 0.353, 0.290);

  vec4 acc = vec4(0.0);

  // ---- chapter ring: 60 ticks + second hand geared to the escapement ----
  {
    float r = length(p);
    float ang = atan(p.y, p.x);
    float sector = PI / 30.0;
    float am = mod(ang, sector) - sector * 0.5;
    vec2 rs = vec2(r, am * r);
    float idx = floor(ang / sector);
    bool major = mod(idx + 60.0, 5.0) < 0.5;
    float len = major ? 0.045 : 0.022;
    float w   = major ? 0.0022 : 0.0014;
    float dt = sdSeg(rs, vec2(0.93, 0.0), vec2(0.93 + len, 0.0));
    over(acc, INK, stroke(dt, w, aa) * (major ? 0.5 : 0.3));

    // second hand: thin copper needle + counterweight, ticking 6 deg/s
    vec2 hq = rot(-PI * 0.5 + adv * PI / 30.0) * p;   // 12 o'clock start, clockwise
    float hd = sdSeg(hq, vec2(0.0, -0.13), vec2(0.0, 0.88));
    over(acc, COPPER, stroke(hd, 0.0022, aa) * 0.85);
    over(acc, COPPER, stroke(length(hq + vec2(0.0, 0.13)) - 0.016, 0.0035, aa) * 0.85);
  }

  // ---- escape wheel: 15 ratchet teeth, hub, four spokes ----
  {
    float wheelAng = -adv * (2.0 * PI / 15.0);
    vec2 q = rot(-wheelAng) * p;
    float r = length(q);
    float ang = atan(q.y, q.x);

    over(acc, COPPER, stroke(r - 0.262, 0.0026, aa) * 0.95);
    over(acc, COPPER, stroke(r - 0.052, 0.0020, aa) * 0.9);
    over(acc, COPPER, stroke(r - 0.012, 0.0028, aa) * 0.9);

    float sector = 2.0 * PI / 15.0;
    float am = mod(ang, sector) - sector * 0.5;
    vec2 rs = vec2(r, am * r);
    float t1 = sdSeg(rs, vec2(0.318, 0.0), vec2(0.264, 0.034));
    float t2 = sdSeg(rs, vec2(0.318, 0.0), vec2(0.264, -0.007));
    over(acc, COPPER, stroke(min(t1, t2), 0.0024, aa) * 0.95);

    float spokeSector = PI / 2.0;
    float sm = mod(ang + PI / 4.0, spokeSector) - spokeSector * 0.5;
    vec2 ss = vec2(r, sm * r);
    float sd = sdSeg(ss, vec2(0.055, 0.0), vec2(0.255, 0.0));
    over(acc, COPPER, stroke(sd, 0.0022, aa) * 0.8);
  }

  // ---- pallet fork: rocks between the escape wheel and the balance ----
  {
    vec2 pf = vec2(-0.16, 0.365);
    float rock = 0.10 * th(3.5 * sin(2.0 * PI * uTime));
    vec2 q = rot(rock) * (p - pf);
    float arms = min(
      sdSeg(q, vec2(0.0, 0.0), vec2(0.135, -0.115)),
      sdSeg(q, vec2(0.0, 0.0), vec2(-0.03, -0.145))
    );
    float lever = sdSeg(q, vec2(0.0, 0.0), vec2(-0.27, 0.02));
    float pads = min(
      sdSeg(q, vec2(0.135, -0.115), vec2(0.155, -0.145)),
      sdSeg(q, vec2(-0.03, -0.145), vec2(-0.005, -0.175))
    );
    over(acc, INK, stroke(min(arms, lever), 0.0028, aa) * 0.75);
    over(acc, PATINA, stroke(pads, 0.0048, aa) * 0.85);
    over(acc, INK, stroke(length(q) - 0.011, 0.0026, aa) * 0.8);
  }

  // ---- balance wheel + hairspring, breathing at 1 Hz ----
  {
    vec2 bc = vec2(-0.60, 0.43);
    float bal = 0.62 * sin(2.0 * PI * uTime);
    vec2 q = rot(bal) * (p - bc);
    float r = length(q);

    over(acc, COPPER, stroke(r - 0.205, 0.0030, aa) * 0.95);
    over(acc, COPPER, stroke(r - 0.180, 0.0014, aa) * 0.55);
    float arm = min(
      sdSeg(q, vec2(-0.195, 0.0), vec2(0.195, 0.0)),
      sdSeg(q, vec2(0.0, -0.195), vec2(0.0, 0.0))
    );
    over(acc, COPPER, stroke(arm, 0.0022, aa) * 0.8);
    over(acc, INK, stroke(r - 0.010, 0.0024, aa) * 0.85);

    // hairspring: tight archimedean suggestion that winds with the swing
    float ang = atan(q.y, q.x);
    float b = 0.0125;
    float sp = abs(mod(r - b * (ang + bal * 0.6) / (2.0 * PI), b) - b * 0.5);
    float mask = smoothstep(0.095, 0.085, r) * smoothstep(0.018, 0.028, r);
    over(acc, INK, stroke(sp, 0.0012, aa) * 0.6 * mask);
  }

  // ---- gear train: two wheels stepping with the escapement's gearing ----
  {
    vec2 gc = vec2(0.545, -0.315);
    vec2 q = rot(adv * (2.0 * PI / 12.0)) * (p - gc);
    float r = length(q);
    float ang = atan(q.y, q.x);
    over(acc, INK, stroke(r - 0.148, 0.0020, aa) * 0.5);
    over(acc, INK, stroke(r - 0.030, 0.0016, aa) * 0.45);
    float sector = 2.0 * PI / 12.0;
    float am = mod(ang, sector) - sector * 0.5;
    vec2 rs = vec2(r, am * r);
    float tick = sdSeg(rs, vec2(0.136, 0.0), vec2(0.164, 0.0));
    over(acc, INK, stroke(tick, 0.0018, aa) * 0.5);
    float sm = mod(ang + sector * 0.5, PI / 1.5) - PI / 3.0;
    vec2 ss = vec2(r, sm * r);
    over(acc, INK, stroke(sdSeg(ss, vec2(0.034, 0.0), vec2(0.142, 0.0)), 0.0015, aa) * 0.4);
  }
  {
    vec2 gc = vec2(0.78, -0.02);
    vec2 q = rot(-adv * (2.0 * PI / 8.0)) * (p - gc);
    float r = length(q);
    float ang = atan(q.y, q.x);
    over(acc, INK, stroke(r - 0.082, 0.0018, aa) * 0.45);
    float sector = 2.0 * PI / 8.0;
    float am = mod(ang, sector) - sector * 0.5;
    vec2 rs = vec2(r, am * r);
    over(acc, INK, stroke(sdSeg(rs, vec2(0.073, 0.0), vec2(0.096, 0.0)), 0.0016, aa) * 0.45);
    over(acc, INK, stroke(r - 0.016, 0.0014, aa) * 0.4);
  }

  gl_FragColor = vec4(acc.rgb, acc.a * uAlpha);
}
`;

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

function StaticMechanism({ className = "" }: { className?: string }) {
  // Reduced-motion / no-WebGL fallback: the same composition, drawn once.
  return (
    <svg
      viewBox="-1.1 -1.1 2.2 2.2"
      className={className}
      aria-hidden
      style={{ transform: "scaleY(-1)" }}
    >
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const major = i % 5 === 0;
          const r0 = 0.93;
          const r1 = 0.93 + (major ? 0.045 : 0.022);
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={Math.sin(a) * r0}
              x2={Math.cos(a) * r1}
              y2={Math.sin(a) * r1}
              stroke="#1a1916"
              strokeOpacity={major ? 0.42 : 0.26}
              strokeWidth={major ? 0.0044 : 0.0028}
            />
          );
        })}
        <circle r="0.262" stroke="#d4582a" strokeWidth="0.0052" strokeOpacity="0.95" />
        <circle r="0.052" stroke="#d4582a" strokeWidth="0.004" strokeOpacity="0.9" />
        {Array.from({ length: 15 }, (_, i) => {
          const a = (i / 15) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 0.318}
              y1={Math.sin(a) * 0.318}
              x2={Math.cos(a + 0.13) * 0.264}
              y2={Math.sin(a + 0.13) * 0.264}
              stroke="#d4582a"
              strokeWidth="0.0048"
              strokeOpacity="0.95"
            />
          );
        })}
        <circle cx="-0.6" cy="0.43" r="0.205" stroke="#d4582a" strokeWidth="0.006" strokeOpacity="0.95" />
        <circle cx="-0.6" cy="0.43" r="0.06" stroke="#1a1916" strokeWidth="0.0024" strokeOpacity="0.6" />
        <line x1="-0.795" y1="0.43" x2="-0.405" y2="0.43" stroke="#d4582a" strokeWidth="0.0044" strokeOpacity="0.8" />
        <circle cx="0.545" cy="-0.315" r="0.148" stroke="#1a1916" strokeWidth="0.004" strokeOpacity="0.5" />
        <circle cx="0.78" cy="-0.02" r="0.082" stroke="#1a1916" strokeWidth="0.0036" strokeOpacity="0.45" />
        <line x1="0" y1="-0.13" x2="0" y2="0.88" stroke="#d4582a" strokeWidth="0.0044" strokeOpacity="0.85" transform="rotate(-32)" />
      </g>
    </svg>
  );
}

export default function Escapement({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFallback(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uAlpha = gl.getUniformLocation(prog, "uAlpha");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let w = 0,
      h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const t0 = performance.now();

    const frame = (now: number) => {
      raf = 0;
      const t = (now - t0) / 1000;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t + 0.35);
      gl.uniform1f(uAlpha, Math.min(t / 1.4, 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (reduced) return; // one static, correct frame
      if (visible && pageVisible) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible && pageVisible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });
    io.observe(canvas);
    const onVis = () => {
      pageVisible = !document.hidden;
      kick();
    };
    document.addEventListener("visibilitychange", onVis);
    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (fallback) return <StaticMechanism className={className} />;
  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
