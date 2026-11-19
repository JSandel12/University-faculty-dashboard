"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import {
  ArrowUpRight,
  Calendar,
  Check,
  Compass,
  MapPin,
  Newspaper,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Lang } from "@/lib/i18n";

export type EventCategory = "hackathon" | "event" | "news";

export interface CampusEventItem {
  id: string;
  category: EventCategory;
  lat: number;
  lon: number;
  dateRu: string;
  dateEn: string;
  titleRu: string;
  titleEn: string;
  partnerRu: string;
  partnerEn: string;
  descRu: string;
  descEn: string;
  locationRu: string;
  locationEn: string;
  badgeRu: string;
  badgeEn: string;
  color: string;
}

const CAMPUS_EVENTS: CampusEventItem[] = [
  {
    id: "hack-decanat",
    category: "hackathon",
    lat: 55.75,
    lon: 37.61,
    dateRu: "08–28 ноя · Финал",
    dateEn: "Nov 08–28 · Finals",
    titleRu: "Хакатон «Цифровой деканат будущего»",
    titleEn: "Hackathon: Digital Dean's Office of the Future",
    partnerRu: "Партнёры: Цифровой кампус × AI Lab",
    partnerEn: "Partners: Digital Campus × AI Lab",
    descRu:
      "Создайте рабочий прототип студенческого сервиса нового поколения с помощью ИИ-ассистентов. Защита проектов и фаст-трек на стажировку.",
    descEn:
      "Build a next-gen student portal prototype powered by AI assistants. Live jury pitch and internship fast-track.",
    locationRu: "Онлайн + Главный корпус",
    locationEn: "Online + Main Campus",
    badgeRu: "Хакатон",
    badgeEn: "Hackathon",
    color: "#DFB863",
  },
  {
    id: "forum-career",
    category: "event",
    lat: 48.85,
    lon: 18.4,
    dateRu: "25 ноя · 14:00",
    dateEn: "Nov 25 · 14:00",
    titleRu: "День карьеры и стажировок 2026",
    titleEn: "International Career & Internship Forum",
    partnerRu: "Партнёры: 35+ технологических и дип. компаний",
    partnerEn: "Partners: 35+ Tech & Diplomatic Employers",
    descRu:
      "Экспресс-собеседования, разбор резюме с HR-экспертами и закрытые вакансии для 2–4 курсов.",
    descEn:
      "Speed interviews, CV clinics with HR leads, and exclusive internships for 2nd–4th year students.",
    locationRu: "Атриум нового корпуса",
    locationEn: "New Building Atrium",
    badgeRu: "Событие",
    badgeEn: "Event",
    color: "#60A5FA",
  },
  {
    id: "case-osint",
    category: "hackathon",
    lat: 39.9,
    lon: 108.4,
    dateRu: "03 дек · 16:00",
    dateEn: "Dec 03 · 16:00",
    titleRu: "Кейс-чемпионат по цифровой дипломатии и AI",
    titleEn: "Digital Diplomacy & AI Case Championship",
    partnerRu: "Партнёры: Аналитический центр × Клуб дебатов",
    partnerEn: "Partners: Policy Analytics Center × Debate Club",
    descRu:
      "Командное соревнование (2–4 чел.) по OSINT-аналитике и моделированию международных переговоров.",
    descEn:
      "Team competition (2–4 students) on OSINT analytics and multilateral policy simulations.",
    locationRu: "Конференц-зал № 2",
    locationEn: "Conference Hall #2",
    badgeRu: "Кейс-турнир",
    badgeEn: "Case Cup",
    color: "#34D399",
  },
  {
    id: "news-grant",
    category: "news",
    lat: 46.2,
    lon: -12.2,
    dateRu: "Открыто до 01 дек",
    dateEn: "Open until Dec 01",
    titleRu: "Грантовая программа на научные и ИИ-инициативы",
    titleEn: "Student R&D and AI Venture Micro-Grants",
    partnerRu: "Партнёры: Эндаумент-фонд кампуса",
    partnerEn: "Partners: Campus Endowment Fund",
    descRu:
      "Студенческие команды могут получить финансирование и облачные квоты на запуск образовательных и правовых проектов.",
    descEn:
      "Student teams can apply for micro-grants and compute credits to launch civic, legal, and EdTech tools.",
    locationRu: "Подача онлайн",
    locationEn: "Online Submission",
    badgeRu: "Новость",
    badgeEn: "News",
    color: "#F472B6",
  },
];

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

interface DiplomaticGlobe3DProps {
  lang: Lang;
  onRegisterOrRequest: (eventTitle: string) => void;
}

/**
 * Interactive Three.js 3D Nexus powering the University News, Events & Partner Hackathons hub.
 * Combines `cursor-material-spotlight` PBR shader with geodesic wireframe, orbital rings, and GSAP spin-to-event.
 */
export function DiplomaticGlobe3D({
  lang,
  onRegisterOrRequest,
}: DiplomaticGlobe3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const pauseSpinUntilRef = useRef(0);
  const beaconByIdRef = useRef<Record<string, THREE.Mesh>>({});
  const activeRingRef = useRef<THREE.Mesh | null>(null);
  const activeEventIdRef = useRef<string>(CAMPUS_EVENTS[0].id);
  const targetSpotColorRef = useRef<THREE.Color>(
    new THREE.Color(CAMPUS_EVENTS[0].color)
  );
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);

  const [filter, setFilter] = useState<"all" | EventCategory>("all");
  const [selectedEvent, setSelectedEvent] = useState<CampusEventItem>(
    CAMPUS_EVENTS[0]
  );
  const [rsvpedIds, setRsvpedIds] = useState<string[]>([]);
  const [webglError, setWebglError] = useState(false);

  const filteredEvents = useMemo(
    () =>
      filter === "all"
        ? CAMPUS_EVENTS
        : CAMPUS_EVENTS.filter((e) => e.category === filter),
    [filter]
  );

  const focusEvent = (ev: CampusEventItem) => {
    setSelectedEvent(ev);
    activeEventIdRef.current = ev.id;
    targetSpotColorRef.current.set(ev.color);
    pauseSpinUntilRef.current = performance.now() + 3400;

    // Move 3D pulse halo ring to the selected beacon's surface position & normal
    const ring = activeRingRef.current;
    const beacon = beaconByIdRef.current[ev.id];
    if (ring && beacon) {
      ring.position.copy(beacon.position).multiplyScalar(1.01);
      ring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        beacon.position.clone().normalize()
      );
      (ring.material as THREE.MeshBasicMaterial).color.set(ev.color);
    }

    const group = globeGroupRef.current;
    if (!group) return;

    // Compute exact quaternion that rotates the event's local vector to face the camera (+Z)
    const localDir = latLonToVec3(ev.lat, ev.lon, 1).normalize();
    const frontDir = new THREE.Vector3(0, 0.08, 1).normalize();
    const qTarget = new THREE.Quaternion().setFromUnitVectors(localDir, frontDir);
    const qStart = group.quaternion.clone();

    focusTweenRef.current?.kill();
    const animState = { t: 0 };
    focusTweenRef.current = gsap.to(animState, {
      t: 1,
      duration: 0.9,
      ease: "power3.out",
      onUpdate: () => {
        group.quaternion.slerpQuaternions(qStart, qTarget, animState.t);
      },
    });
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let isVisible = true;

    try {
      const width = mount.clientWidth || 340;
      const height = mount.clientHeight || 280;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 0.2, 4.25);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      mount.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment()).texture;
      scene.environment = envTex;
      pmrem.dispose();

      const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.5);
      keyLight.position.set(4, 3, 5);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x4d8df6, 3.2, 12);
      rimLight.position.set(-3.5, -1.5, 2.5);
      scene.add(rimLight);

      const globeGroup = new THREE.Group();
      globeGroupRef.current = globeGroup;
      // Start oriented smoothly toward the initial featured event
      const initLocal = latLonToVec3(
        CAMPUS_EVENTS[0].lat,
        CAMPUS_EVENTS[0].lon,
        1
      ).normalize();
      const initFront = new THREE.Vector3(0, 0.08, 1).normalize();
      globeGroup.quaternion.setFromUnitVectors(initLocal, initFront);
      scene.add(globeGroup);

      // Core PBR Sphere with `cursor-material-spotlight` shader
      const R = 1.2;
      const uHit = new THREE.Vector3(0, 0, 1.2);
      const targetHit = new THREE.Vector3(0, 0, 1.2);
      const uSpotColor = new THREE.Vector3(
        targetSpotColorRef.current.r,
        targetSpotColorRef.current.g,
        targetSpotColorRef.current.b
      );
      let uActive = 0.92;
      let isHovering = false;
      const shaderUniforms: Array<{
        uHitPoint: { value: THREE.Vector3 };
        uActive: { value: number };
        uSpotColor: { value: THREE.Vector3 };
      }> = [];

      const coreMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0D1E36"),
        roughness: 0.9,
        metalness: 0.22,
      });

      coreMat.onBeforeCompile = (shader) => {
        shader.uniforms.uHitPoint = { value: uHit };
        shader.uniforms.uActive = { value: 0.92 };
        shader.uniforms.uRadius = { value: 0.44 };
        shader.uniforms.uSoftness = { value: 0.36 };
        shader.uniforms.uSpotColor = { value: uSpotColor };
        shaderUniforms.push({
          uHitPoint: shader.uniforms.uHitPoint,
          uActive: shader.uniforms.uActive,
          uSpotColor: shader.uniforms.uSpotColor,
        });

        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform vec3 uHitPoint;\nuniform vec3 uSpotColor;\nuniform float uActive, uRadius, uSoftness;\nvarying vec3 vWPos;"
          )
          .replace(
            "#include <roughnessmap_fragment>",
            `#include <roughnessmap_fragment>
             float dSpot = distance(vWPos, uHitPoint);
             float revealSpot = 1.0 - smoothstep(uRadius, uRadius + uSoftness, dSpot);
             float maskSpot = revealSpot * uActive;
             roughnessFactor = mix(0.92, 0.12, maskSpot);
             diffuseColor.rgb = mix(diffuseColor.rgb, uSpotColor, maskSpot * 0.52);`
          );
      };

      const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 44, 44), coreMat);
      globeGroup.add(coreMesh);

      const wireGeo = new THREE.IcosahedronGeometry(R + 0.018, 2);
      const wireMat = new THREE.MeshBasicMaterial({
        color: "#2B5FA8",
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      });
      globeGroup.add(new THREE.Mesh(wireGeo, wireMat));

      const ptsCount = 520;
      const positions = new Float32Array(ptsCount * 3);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < ptsCount; i++) {
        const y = 1 - (i / (ptsCount - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        const pr = R + 0.025;
        positions[i * 3] = Math.cos(theta) * radiusAtY * pr;
        positions[i * 3 + 1] = y * pr;
        positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * pr;
      }
      const ptsGeo = new THREE.BufferGeometry();
      ptsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const ptsMat = new THREE.PointsMaterial({
        color: "#DFB863",
        size: 0.024,
        transparent: true,
        opacity: 0.55,
      });
      globeGroup.add(new THREE.Points(ptsGeo, ptsMat));

      const ringGeo1 = new THREE.TorusGeometry(R + 0.28, 0.007, 12, 96);
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: "#C49A45",
        transparent: true,
        opacity: 0.5,
      });
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ring1.rotation.x = Math.PI / 2.4;
      ring1.rotation.y = 0.25;
      scene.add(ring1);

      const ringGeo2 = new THREE.TorusGeometry(R + 0.42, 0.005, 10, 96);
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: "#4D8DF6",
        transparent: true,
        opacity: 0.35,
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = -Math.PI / 3.1;
      ring2.rotation.y = -0.4;
      scene.add(ring2);

      // Event Beacons & Connecting Arcs
      const originPos = latLonToVec3(CAMPUS_EVENTS[0].lat, CAMPUS_EVENTS[0].lon, R + 0.03);
      const beaconMeshes: THREE.Mesh[] = [];
      beaconByIdRef.current = {};
      const beaconGeo = new THREE.SphereGeometry(0.056, 16, 16);

      CAMPUS_EVENTS.forEach((ev, idx) => {
        const pos = latLonToVec3(ev.lat, ev.lon, R + 0.035);
        const mat = new THREE.MeshBasicMaterial({ color: ev.color });
        const beacon = new THREE.Mesh(beaconGeo, mat);
        beacon.position.copy(pos);
        beacon.userData = { ev };
        globeGroup.add(beacon);
        beaconMeshes.push(beacon);
        beaconByIdRef.current[ev.id] = beacon;

        if (idx > 0) {
          const mid = originPos
            .clone()
            .add(pos)
            .multiplyScalar(0.5)
            .normalize()
            .multiplyScalar(R + 0.32);
          const curve = new THREE.QuadraticBezierCurve3(originPos, mid, pos);
          const arcGeo = new THREE.TubeGeometry(curve, 24, 0.006, 6, false);
          const arcMat = new THREE.MeshBasicMaterial({
            color: ev.color,
            transparent: true,
            opacity: 0.6,
          });
          globeGroup.add(new THREE.Mesh(arcGeo, arcMat));
        }
      });

      // Active Beacon Pulse Ring
      const activeRingGeo = new THREE.TorusGeometry(0.1, 0.012, 10, 36);
      const activeRingMat = new THREE.MeshBasicMaterial({
        color: CAMPUS_EVENTS[0].color,
        transparent: true,
        opacity: 0.9,
      });
      const activeRing = new THREE.Mesh(activeRingGeo, activeRingMat);
      const firstBeacon = beaconByIdRef.current[CAMPUS_EVENTS[0].id];
      if (firstBeacon) {
        activeRing.position.copy(firstBeacon.position).multiplyScalar(1.01);
        activeRing.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          firstBeacon.position.clone().normalize()
        );
      }
      globeGroup.add(activeRing);
      activeRingRef.current = activeRing;

      const raycaster = new THREE.Raycaster();
      const mouseNdc = new THREE.Vector2(-99, -99);
      let prevPointerX = 0;
      let prevPointerY = 0;

      const updateMouseNdc = (clientX: number, clientY: number) => {
        const rect = renderer!.domElement.getBoundingClientRect();
        mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      };

      const onPointerDown = (e: PointerEvent) => {
        isDraggingRef.current = true;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
        updateMouseNdc(e.clientX, e.clientY);

        raycaster.setFromCamera(mouseNdc, camera);
        const hitBeacons = raycaster.intersectObjects(beaconMeshes);
        if (hitBeacons.length > 0) {
          const ev = hitBeacons[0].object.userData.ev as CampusEventItem | undefined;
          if (ev) {
            isDraggingRef.current = false;
            focusEvent(ev);
          }
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        isHovering = true;
        updateMouseNdc(e.clientX, e.clientY);

        if (isDraggingRef.current) {
          focusTweenRef.current?.kill();
          const dx = e.clientX - prevPointerX;
          const dy = e.clientY - prevPointerY;
          prevPointerX = e.clientX;
          prevPointerY = e.clientY;
          const qY = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            dx * 0.008
          );
          const qX = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            dy * 0.008
          );
          globeGroup.quaternion.premultiply(qY).premultiply(qX).normalize();
        }
      };

      const onPointerUp = () => {
        isDraggingRef.current = false;
      };

      const onPointerLeave = () => {
        isHovering = false;
        isDraggingRef.current = false;
      };

      const domEl = renderer.domElement;
      domEl.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp);
      domEl.addEventListener("pointerleave", onPointerLeave);

      const ro = new ResizeObserver(() => {
        if (!renderer || !mount) return;
        const w = mount.clientWidth || 340;
        const h = mount.clientHeight || 280;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      });
      ro.observe(mount);

      const io = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.05 }
      );
      io.observe(mount);

      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const clock = new THREE.Clock();
      const spinAxis = new THREE.Vector3(0, 1, 0);
      const spinDeltaQ = new THREE.Quaternion();
      const beaconWorldPos = new THREE.Vector3();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (
          !isVisible ||
          document.documentElement.classList.contains("theme-transitioning") ||
          document.documentElement.classList.contains("lang-transitioning")
        ) {
          return;
        }

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        if (!isDraggingRef.current && !prefersReduced) {
          if (performance.now() > pauseSpinUntilRef.current) {
            spinDeltaQ.setFromAxisAngle(spinAxis, dt * 0.12);
            globeGroup.quaternion.premultiply(spinDeltaQ).normalize();
          }
          ring1.rotation.z += dt * 0.18;
          ring2.rotation.z -= dt * 0.12;
        }

        beaconMeshes.forEach((m, idx) => {
          const isSelected =
            (m.userData.ev as CampusEventItem | undefined)?.id ===
            activeEventIdRef.current;
          const baseScale = isSelected ? 1.45 : 0.95;
          const s = baseScale + Math.sin(t * 3.2 + idx) * 0.16;
          m.scale.setScalar(s);
        });

        if (activeRingRef.current) {
          const ringScale = 1 + (Math.sin(t * 3.5) * 0.5 + 0.5) * 0.55;
          activeRingRef.current.scale.setScalar(ringScale);
          (activeRingRef.current.material as THREE.MeshBasicMaterial).opacity =
            0.95 - (ringScale - 1) * 0.8;
        }

        // Spotlight tracks cursor when hovering the sphere; otherwise locks onto the active event beacon!
        let spotTracked = false;
        if (isHovering) {
          raycaster.setFromCamera(mouseNdc, camera);
          const hits = raycaster.intersectObject(coreMesh);
          if (hits.length > 0) {
            targetHit.copy(hits[0].point);
            spotTracked = true;
          }
        }
        if (!spotTracked) {
          const activeBeacon = beaconByIdRef.current[activeEventIdRef.current];
          if (activeBeacon) {
            activeBeacon.getWorldPosition(beaconWorldPos);
            targetHit.copy(beaconWorldPos);
          }
        }

        uHit.lerp(targetHit, 0.18);
        uActive = THREE.MathUtils.lerp(uActive, 0.94, 0.12);
        uSpotColor.lerp(
          new THREE.Vector3(
            targetSpotColorRef.current.r,
            targetSpotColorRef.current.g,
            targetSpotColorRef.current.b
          ),
          0.12
        );

        shaderUniforms.forEach((su) => {
          su.uHitPoint.value.copy(uHit);
          su.uActive.value = uActive;
          su.uSpotColor.value.copy(uSpotColor);
        });

        renderer!.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        io.disconnect();
        domEl.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        domEl.removeEventListener("pointerleave", onPointerLeave);
        envTex.dispose();
        coreMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        ptsGeo.dispose();
        ptsMat.dispose();
        ringGeo1.dispose();
        ringMat1.dispose();
        ringGeo2.dispose();
        ringMat2.dispose();
        beaconGeo.dispose();
        activeRingGeo.dispose();
        activeRingMat.dispose();
        if (domEl.parentNode) domEl.parentNode.removeChild(domEl);
        renderer?.dispose();
      };
    } catch {
      setWebglError(true);
    }
  }, []);

  const isRegistered = rsvpedIds.includes(selectedEvent.id);

  return (
    <div className="stagger-item isolate w-full min-w-0 rounded-3xl bg-gradient-to-br from-[#0B1726] via-[#10233D] to-[#132B4D] text-white border border-[#C49A45]/30 p-4 sm:p-6 shadow-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#DFB863] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {lang === "ru"
                ? "НОВОСТИ, СОБЫТИЯ И ХАКАТОНЫ ВУЗА"
                : "UNIVERSITY NEWS, EVENTS & PARTNER HACKATHONS"}
            </span>
          </p>
          <h3 className="font-serif text-lg sm:text-2xl font-semibold mt-0.5 leading-snug">
            {lang === "ru"
              ? "Афиша кампуса и партнёрских конкурсов"
              : "Campus Events, News & Hackathons Hub"}
          </h3>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", ru: "Все", en: "All" },
              { id: "hackathon", ru: "Хакатоны", en: "Hackathons" },
              { id: "event", ru: "События", en: "Events" },
              { id: "news", ru: "Новости", en: "News" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilter(tab.id);
                const nextList =
                  tab.id === "all"
                    ? CAMPUS_EVENTS
                    : CAMPUS_EVENTS.filter((e) => e.category === tab.id);
                if (
                  nextList.length > 0 &&
                  !nextList.some((e) => e.id === selectedEvent.id)
                ) {
                  focusEvent(nextList[0]);
                }
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                filter === tab.id
                  ? "bg-[#DFB863] text-[#081324] border-transparent font-semibold"
                  : "bg-white/10 text-white/80 border-white/15 hover:bg-white/20"
              }`}
            >
              {lang === "ru" ? tab.ru : tab.en}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 sm:gap-5 items-stretch min-w-0">
        {/* 3D Interactive Event Nexus Globe */}
        <div className="lg:col-span-5 relative min-w-0 w-full">
          {webglError ? (
            <div className="h-[220px] lg:h-[394px] rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-xs text-white/70">
              <Compass className="w-8 h-8 text-[#DFB863] mb-2" />
              <span>3D Campus Events Radar</span>
            </div>
          ) : (
            <div className="relative w-full h-[220px] lg:h-[394px] overflow-hidden rounded-2xl">
              <div
                ref={mountRef}
                className="w-full h-full rounded-2xl bg-[#07111F]/70 border border-white/10 cursor-grab active:cursor-grabbing touch-pan-y overflow-hidden"
              />
              <span className="pointer-events-none absolute bottom-2.5 left-3 text-[10px] font-mono text-white/60 bg-black/35 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {lang === "ru" ? "Вращайте сферу · Нажмите на маячок" : "Drag sphere · Tap beacon"}
              </span>
            </div>
          )}
        </div>

        {/* Event Selector List + Featured Card (Fixed Dimensions — Zero Layout Shift) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3.5 min-w-0 w-full">
          {/* Fixed-height Selectable Event Pills */}
          <div className="h-[144px] overflow-y-auto pr-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
              {filteredEvents.map((ev) => {
                const active = selectedEvent.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => focusEvent(ev)}
                    className={`min-w-0 w-full h-[66px] text-left rounded-2xl p-3 border transition-all overflow-hidden flex flex-col justify-between ${
                      active
                        ? "bg-white/15 border-[#DFB863] shadow-sm"
                        : "bg-white/[0.05] border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-[#DFB863] truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span className="truncate">
                          {lang === "ru" ? ev.badgeRu : ev.badgeEn}
                        </span>
                      </span>
                      <span className="text-white/60 shrink-0">
                        {lang === "ru" ? ev.dateRu : ev.dateEn}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white truncate">
                      {lang === "ru" ? ev.titleRu : ev.titleEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fixed-height Active Selected Event / Hackathon Details */}
          <div className="h-[292px] sm:h-[236px] rounded-2xl bg-white/[0.08] border border-white/15 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 min-w-0">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#DFB863] min-w-0 truncate">
                  <Newspaper className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {lang === "ru" ? selectedEvent.partnerRu : selectedEvent.partnerEn}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-white/75 shrink-0">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {lang === "ru" ? selectedEvent.dateRu : selectedEvent.dateEn}
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-2">
                  {lang === "ru" ? selectedEvent.titleRu : selectedEvent.titleEn}
                </h4>
                <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed line-clamp-3">
                  {lang === "ru" ? selectedEvent.descRu : selectedEvent.descEn}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="inline-flex items-center gap-1.5 text-xs text-white/70 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#DFB863] shrink-0" />
                <span className="truncate">
                  {lang === "ru" ? selectedEvent.locationRu : selectedEvent.locationEn}
                </span>
              </span>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!isRegistered) {
                      setRsvpedIds((prev) => [...prev, selectedEvent.id]);
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                    isRegistered
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/35"
                      : "bg-[#DFB863] text-[#081324] hover:opacity-90"
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {lang === "ru" ? "Записаны" : "Joined"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {lang === "ru" ? "Участвовать" : "1-Click Join"}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onRegisterOrRequest(
                      lang === "ru" ? selectedEvent.titleRu : selectedEvent.titleEn
                    )
                  }
                  className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-medium border border-white/15 whitespace-nowrap"
                >
                  <span className="truncate">
                    {lang === "ru" ? "Справка" : "Excusal"}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
