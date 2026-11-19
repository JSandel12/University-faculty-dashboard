"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLUID_SHADER = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec4 iMouse;
  uniform sampler2D sPreviousFrame;
  uniform float uBrushSize;
  uniform float uBrushStrength;
  uniform float uFluidDecay;
  uniform float uTrailLength;
  uniform float uStopDecay;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 mouse = iMouse.xy / iResolution.xy;
    vec2 prevMouse = iMouse.zw / iResolution.xy;
    float aspect = iResolution.x / max(iResolution.y, 1.0);
    vec2 aspectUv = uv * vec2(aspect, 1.0);
    vec2 aspectMouse = mouse * vec2(aspect, 1.0);
    float dist = length(aspectUv - aspectMouse);
    vec2 mouseDir = mouse - prevMouse;
    float mouseSpeed = length(mouseDir);
    float brush = smoothstep(uBrushSize / 100.0, 0.0, dist);
    vec2 velocity = mouseDir * uBrushStrength * brush * 100.0;
    vec4 prevFluid = texture2D(sPreviousFrame, uv);
    vec2 advectedUv = uv - prevFluid.xy * uTrailLength * 0.01;
    vec4 advected = texture2D(sPreviousFrame, advectedUv);
    float decay = (mouseSpeed > 0.0001) ? uFluidDecay : uStopDecay;
    vec2 newVelocity = advected.xy * decay + velocity;
    gl_FragColor = vec4(newVelocity, 0.0, 1.0);
  }
`;

const DISPLAY_SHADER = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform sampler2D sFluid;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uDistortionAmount;
  uniform float uColorIntensity;
  uniform float uSoftness;
  varying vec2 vUv;

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vec2 uv = vUv;
    vec2 fluid = texture2D(sFluid, uv).xy;
    vec2 distortedUv = uv + fluid * uDistortionAmount * 0.1;
    vec2 p = (distortedUv - 0.5) * 2.6;
    float t = iTime * 0.28;

    for (int i = 0; i < 4; i++) {
      p *= rot(t * 0.1);
      p.x += sin(p.y * 1.4 + t) * uSoftness;
      p.y += cos(p.x * 1.4 + t) * uSoftness;
    }

    float val = length(p) * 0.48;
    vec3 col = mix(uColor1, uColor2, sin(val + t) * 0.5 + 0.5);
    col = mix(col, uColor3, cos(val + t * 0.8) * 0.5 + 0.5);
    col = mix(col, uColor4, sin(val * 1.15 - t * 0.45) * 0.5 + 0.5);
    col *= uColorIntensity;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new THREE.Vector3(r, g, b);
}

/**
 * Interactive WebGL ping-pong fluid gradient adapted from `webgl-fluid-gradient`.
 * Automatically falls back to a sleek CSS gradient if WebGL or reduced-motion requires it.
 */
export function FluidGradientCanvas({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setFallback(true);
      return;
    }

    let animationFrameId = 0;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new THREE.PlaneGeometry(2, 2);

      const renderTargetOptions: THREE.RenderTargetOptions = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      };

      let currentFluidTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(width / 2)),
        Math.max(1, Math.floor(height / 2)),
        renderTargetOptions
      );
      let previousFluidTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(width / 2)),
        Math.max(1, Math.floor(height / 2)),
        renderTargetOptions
      );

      const fluidScene = new THREE.Scene();
      const displayScene = new THREE.Scene();

      const fluidMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FLUID_SHADER,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(width, height) },
          iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
          sPreviousFrame: { value: null },
          uBrushSize: { value: 24.0 },
          uBrushStrength: { value: 0.45 },
          uFluidDecay: { value: 0.98 },
          uTrailLength: { value: 0.78 },
          uStopDecay: { value: 0.85 },
        },
      });
      fluidScene.add(new THREE.Mesh(geometry, fluidMaterial));

      // Diplomatic Modernism palette: Deep Navy, Sapphire, Slate Indigo, Warm Brass
      const displayMaterial = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: DISPLAY_SHADER,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new THREE.Vector2(width, height) },
          sFluid: { value: null },
          uDistortionAmount: { value: 2.2 },
          uColorIntensity: { value: 1.08 },
          uSoftness: { value: 1.0 },
          uColor1: { value: hexToRgb("#091526") },
          uColor2: { value: hexToRgb("#1E55A0") },
          uColor3: { value: hexToRgb("#192B47") },
          uColor4: { value: hexToRgb("#C49A45") },
        },
      });
      displayScene.add(new THREE.Mesh(geometry, displayMaterial));

      let mouseX = 0;
      let mouseY = 0;
      let prevMouseX = 0;
      let prevMouseY = 0;
      let lastMoveTime = 0;

      const handlePointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        mouseX = e.clientX - rect.left;
        mouseY = rect.height - (e.clientY - rect.top);
        lastMoveTime = performance.now();
      };

      const handleResize = () => {
        if (!renderer || !container) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        currentFluidTarget.setSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
        previousFluidTarget.setSize(Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
        fluidMaterial.uniforms.iResolution.value.set(w, h);
        displayMaterial.uniforms.iResolution.value.set(w, h);
      };

      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("resize", handleResize);

      const clock = new THREE.Clock();
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        fluidMaterial.uniforms.iTime.value = elapsed;
        displayMaterial.uniforms.iTime.value = elapsed;

        if (performance.now() - lastMoveTime > 120) {
          prevMouseX = mouseX;
          prevMouseY = mouseY;
        }
        fluidMaterial.uniforms.iMouse.value.set(mouseX, mouseY, prevMouseX, prevMouseY);

        fluidMaterial.uniforms.sPreviousFrame.value = previousFluidTarget.texture;
        renderer!.setRenderTarget(currentFluidTarget);
        renderer!.render(fluidScene, camera);

        displayMaterial.uniforms.sFluid.value = currentFluidTarget.texture;
        renderer!.setRenderTarget(null);
        renderer!.render(displayScene, camera);

        const tmp = previousFluidTarget;
        previousFluidTarget = currentFluidTarget;
        currentFluidTarget = tmp;
      };
      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("resize", handleResize);
        geometry.dispose();
        fluidMaterial.dispose();
        displayMaterial.dispose();
        currentFluidTarget.dispose();
        previousFluidTarget.dispose();
        if (renderer?.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer?.dispose();
      };
    } catch {
      setFallback(true);
    }
  }, []);

  if (fallback) {
    return (
      <div
        className={`bg-gradient-to-br from-[#081324] via-[#1B4B8A] to-[#7A5B22] ${className}`}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
