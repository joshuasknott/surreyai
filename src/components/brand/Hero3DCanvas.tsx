"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function Hero3DCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Main 3D Interactive Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Materials
    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181f,
      roughness: 0.2,
      metalness: 0.9,
    });

    const orangeGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.3,
    });

    const wireframeOrange = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });

    // 1. Create Monolithic 3D "A" Shape using Shape & ExtrudeGeometry
    const shapeA = new THREE.Shape();
    // Outer triangle
    shapeA.moveTo(0, 4.2);
    shapeA.lineTo(-2.6, -3.2);
    shapeA.lineTo(-1.3, -3.2);
    shapeA.lineTo(-0.7, -1.2);
    shapeA.lineTo(0.7, -1.2);
    shapeA.lineTo(1.3, -3.2);
    shapeA.lineTo(2.6, -3.2);
    shapeA.closePath();

    // Inner triangle hole
    const hole = new THREE.Path();
    hole.moveTo(0, 2.4);
    hole.lineTo(0.5, 0.2);
    hole.lineTo(-0.5, 0.2);
    hole.closePath();
    shapeA.holes.push(hole);

    const extrudeSettings = {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.15,
    };

    const geomA = new THREE.ExtrudeGeometry(shapeA, extrudeSettings);
    geomA.center();
    const meshA = new THREE.Mesh(geomA, darkMetalMaterial);
    meshA.position.x = -1.8;
    mainGroup.add(meshA);

    // 2. Create Monolithic 3D "I" Pillar (The Signature Surrey AI Orange Pillar)
    const geomI = new THREE.BoxGeometry(1.1, 7.6, 0.8);
    const meshI = new THREE.Mesh(geomI, orangeGlowMaterial);
    meshI.position.set(2.2, 0.3, 0);
    mainGroup.add(meshI);

    // 3. Glowing Orbital Rings around the Logo Monument
    const ringGeom1 = new THREE.TorusGeometry(6.5, 0.04, 16, 100);
    const ringMesh1 = new THREE.Mesh(ringGeom1, wireframeOrange);
    ringMesh1.rotation.x = Math.PI / 3;
    ringMesh1.rotation.y = Math.PI / 6;
    mainGroup.add(ringMesh1);

    const ringGeom2 = new THREE.TorusGeometry(8.2, 0.03, 16, 100);
    const ringMesh2 = new THREE.Mesh(ringGeom2, wireframeOrange);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.y = -Math.PI / 5;
    mainGroup.add(ringMesh2);

    // 4. 1,400 Particle Constellation Swirl
    const particleCount = 1400;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorOrange = new THREE.Color(0xff5500);
    const colorWhite = new THREE.Color(0xffffff);
    const colorPurple = new THREE.Color(0x8b5cf6);

    for (let i = 0; i < particleCount; i++) {
      const radius = 4 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const chosenColor = Math.random() > 0.6 ? colorOrange : Math.random() > 0.3 ? colorWhite : colorPurple;
      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    mainGroup.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
    topLight.position.set(5, 10, 8);
    scene.add(topLight);

    const orangeSpot = new THREE.PointLight(0xff5500, 5, 20);
    orangeSpot.position.set(-4, -2, 5);
    scene.add(orangeSpot);

    const purpleSpot = new THREE.PointLight(0x8b5cf6, 4, 25);
    purpleSpot.position.set(6, 4, -4);
    scene.add(purpleSpot);

    // Mouse Interaction Physics
    let targetRotX = 0;
    let targetRotY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        mainGroup.rotation.y += deltaX * 0.01;
        mainGroup.rotation.x += deltaY * 0.01;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        targetRotY = x * 0.4;
        targetRotX = -y * 0.3;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    mount.addEventListener("pointermove", handlePointerMove);
    mount.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    // Handle Resize
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Gentle continuous rotation
      if (!isDragging) {
        mainGroup.rotation.y += (targetRotY + Math.sin(elapsedTime * 0.5) * 0.15 - mainGroup.rotation.y) * 0.05;
        mainGroup.rotation.x += (targetRotX + Math.cos(elapsedTime * 0.4) * 0.1 - mainGroup.rotation.x) * 0.05;
      }

      // Orbital rings spinning
      ringMesh1.rotation.z = elapsedTime * 0.2;
      ringMesh2.rotation.z = -elapsedTime * 0.15;

      // Particle constellation rotation
      particles.rotation.y = elapsedTime * 0.06;
      particles.rotation.x = Math.sin(elapsedTime * 0.03) * 0.1;

      // Pulse the orange pillar emissive intensity
      orangeGlowMaterial.emissiveIntensity = 0.7 + Math.sin(elapsedTime * 2.5) * 0.3;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geomA.dispose();
      geomI.dispose();
      ringGeom1.dispose();
      ringGeom2.dispose();
      particleGeometry.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[620px] flex items-center justify-center cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
      {/* Interactive 3D drag hint badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-zinc-300 flex items-center gap-2 pointer-events-none shadow-xl">
        <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
        <span>Interactive 3D Monument • Drag to Rotate 360°</span>
      </div>
    </div>
  );
}
